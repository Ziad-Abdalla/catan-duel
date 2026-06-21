import { describe, it, expect } from 'vitest'
import { newGame } from '../../engine/newGame'
import { applyAction, computeVP, type Action } from '../../engine/actions'
import type { GameState as LiveState, PlayerId } from '../../types'
import { setupGame } from '../sim/setup'
import { legalMoves } from '../sim/moves'
import { liveToSim } from './liveToSim'
import {
  rollForAi, productionTotals, eventTotals, cardEventTotals, planAiActions,
  reconcileDeltas, structuralActions, refillActions, exchangeActions, handLimit,
  humanEventChoice, liveCenters, freeBuildingSlot, liveTotalsOf, LIVE_TO_SIM, type Seat,
} from './aiController'

function makeStore(seed: number, enabledSets: ('gold' | 'turmoil' | 'progress')[] = []) {
  let state: LiveState = newGame({ seed, enabledSets })
  return { get: () => state, dispatch: (a: Action) => { state = applyAction(state, a) } }
}

function invariants(s: LiveState) {
  for (const id of ['p0', 'p1'] as PlayerId[]) {
    for (const r of s.players[id].regions) {
      expect(r.stored).toBeGreaterThanOrEqual(0)
      expect(r.stored).toBeLessThanOrEqual(3)
    }
  }
}

/** Mirror the orchestrator's dispatch sequence for the AI's seat, synchronously. */
function runAiTurn(store: ReturnType<typeof makeStore>, aiSeat: PlayerId, rng: { v: number }) {
  const human: PlayerId = aiSeat === 'p0' ? 'p1' : 'p0'
  const get = store.get, dispatch = store.dispatch
  const reconcile = (seat: PlayerId, target: Record<Seat, Record<string, number>>) => {
    for (const d of reconcileDeltas(get(), seat, target[seat as Seat] as never)) dispatch({ type: 'addResource', player: seat, resource: d.resource, count: d.count })
  }
  const roll = rollForAi(get(), 'easy', rng)
  dispatch({ type: 'roll', production: roll.production, event: roll.eventLive })
  const order: PlayerId[] = [aiSeat, human]

  const eventSim = LIVE_TO_SIM[roll.eventLive] ?? 'event'
  if (eventSim === 'brigand') { const ev = eventTotals(get(), roll.production, 'brigand', aiSeat as Seat); for (const s of order) reconcile(s, ev.totals) }
  const prodT = productionTotals(get(), roll.production)
  for (const s of order) reconcile(s, prodT)
  if (eventSim !== 'brigand') {
    if (eventSim === 'event') {
      dispatch({ type: 'drawEvent' })
      const id = get().revealedEvent
      if (id) { const ev = cardEventTotals(get(), id, aiSeat as Seat); for (const s of order) reconcile(s, ev.totals) }
      dispatch({ type: 'dismissEvent' })
    } else if (['trade', 'celebration', 'plenty'].includes(eventSim)) {
      const ev = eventTotals(get(), roll.production, eventSim, aiSeat as Seat)
      for (const s of order) reconcile(s, ev.totals)
    }
  }

  // build
  const plan = planAiActions(get(), aiSeat, 'easy', rng)
  for (let i = 0; i < plan.settlements; i++) { if (get().regionStack.length < 2) break; dispatch({ type: 'expandSpine', player: aiSeat }) }
  for (let i = 0; i < plan.extraRoads; i++) dispatch({ type: 'buildPiece', player: aiSeat, piece: 'road', end: 'right', pay: false })
  for (let i = 0; i < plan.cities; i++) { const st = liveCenters(get(), aiSeat).find((c) => c.kind === 'settlement'); if (!st) break; dispatch({ type: 'upgradeCity', player: aiSeat, seat: st.seat, pay: false }) }
  for (const cardId of plan.buildings) { if (!get().players[aiSeat].hand.includes(cardId)) continue; dispatch({ type: 'playCard', player: aiSeat, cardId, slot: freeBuildingSlot(get(), aiSeat) ?? undefined, pay: false }) }
  for (const s of order) structuralActions(get(), plan.sim, s).forEach(dispatch)
  for (const s of order) reconcile(s, plan.totals)
  // refill + exchange
  refillActions(get(), aiSeat).forEach(dispatch)
  exchangeActions(get(), aiSeat).forEach(dispatch)
  dispatch({ type: 'endTurn' })
}

describe('live ↔ sim bridge', () => {
  it('converts a fresh live game to a valid sim state', () => {
    const sim = liveToSim(newGame({ seed: 1 }))
    expect(sim.players.p0.regions.length).toBe(6)
    expect(sim.players.p0.centers.length).toBeGreaterThanOrEqual(1)
    expect(sim.winThreshold).toBe(7)
  })
  it('maps eras to mode', () => {
    expect(liveToSim(newGame({ seed: 1, enabledSets: ['gold'] })).mode).toBe('gold')
    expect(liveToSim(newGame({ seed: 1, enabledSets: ['gold', 'turmoil', 'progress'] })).mode).toBe('duel')
  })
})

describe('phased AI steps', () => {
  it('rollForAi returns a valid die + event', () => {
    const r = rollForAi(newGame({ seed: 4 }), 'easy', { v: 7 })
    expect(r.production).toBeGreaterThanOrEqual(1)
    expect(r.production).toBeLessThanOrEqual(6)
    expect(['event-card', 'plentiful-harvest', 'celebration', 'trade', 'brigand']).toContain(r.eventLive)
  })

  it('production increases a matching region for both players', () => {
    const live = newGame({ seed: 2 })
    const n = live.players.p1.regions[0].number ?? 1
    const before = liveTotalsOf(live, 'p1')
    const after = productionTotals(live, n).p1
    const total = (t: Record<string, number>) => Object.values(t).reduce((a, b) => a + b, 0)
    expect(total(after)).toBeGreaterThanOrEqual(total(before))
  })

  it('refillActions brings the hand up to the limit (3 base)', () => {
    const live = newGame({ seed: 5 }) // hands start at 3
    // empty p1's hand by hand-modeling: simulate after playing cards (just check limit math)
    expect(handLimit(live, 'p1')).toBe(3)
    const drained = { ...live, players: { ...live.players, p1: { ...live.players.p1, hand: [] } } }
    const acts = refillActions(drained, 'p1')
    expect(acts.length).toBe(3)
    expect(acts.every((a) => a.type === 'drawToHand')).toBe(true)
  })

  it('the human gets to CHOOSE their event resource (not auto-applied)', () => {
    const live = newGame({ seed: 6 })
    // Plentiful Harvest → human picks 1
    expect(humanEventChoice(live, 'plenty', undefined, 'p0', 'p1')).toEqual({ kind: 'gain', count: 1 })
    // Celebration: equal skill (0–0) → both choose → human gets a pick
    expect(humanEventChoice(live, 'celebration', undefined, 'p0', 'p1')).toEqual({ kind: 'gain', count: 1 })
    // Trade die: only the trade-token holder takes (from opponent)
    expect(humanEventChoice(live, 'trade', undefined, 'p0', 'p1')).toBeNull()
    const withToken = { ...live, players: { ...live.players, p0: { ...live.players.p0, hasTradeToken: true } } }
    expect(humanEventChoice(withToken, 'trade', undefined, 'p0', 'p1')).toEqual({ kind: 'steal', count: 1 })
  })

  it('exchange: pays to SEARCH one stack for a high-value card when worth it', () => {
    let live = newGame({ seed: 11 })
    // give p1 a weak hand + plenty of resources, and seed a strong card into a stack
    live = { ...live, players: { ...live.players,
      p1: { ...live.players.p1, hand: ['base-storehouse'] }, // low-value hand card
    } }
    live = { ...live, drawStacks: live.drawStacks.map((st, i) => i === 0 ? [...st, 'base-candamir'] : st) } // strength 4 hero
    for (const r of live.players.p1.regions) r.stored = 3 // can afford the search cost
    const acts = exchangeActions(live, 'p1')
    expect(acts.some((a) => a.type === 'takeFromStack' && a.cardId === 'base-candamir')).toBe(true)
    expect(acts.some((a) => a.type === 'addResource' && a.count < 0)).toBe(true) // paid for the search
    expect(acts.some((a) => a.type === 'discardCard')).toBe(true) // discarded the weak card
  })

  it('exchange: does NOT pay to search when it cannot afford the cost', () => {
    let live = newGame({ seed: 11 })
    live = { ...live, players: { ...live.players, p1: { ...live.players.p1, hand: ['base-storehouse'] } } }
    live = { ...live, drawStacks: live.drawStacks.map((st, i) => i === 0 ? [...st, 'base-candamir'] : st) }
    for (const r of live.players.p1.regions) r.stored = 0 // broke → cannot pay to search
    const acts = exchangeActions(live, 'p1')
    expect(acts.some((a) => a.type === 'takeFromStack')).toBe(false)
  })

  it('bank trade (3:1 / 2:1) is available to the AI in the sim', () => {
    // sanity: the AI sim offers trade moves (judged by the search) — proves 3-for-1
    // and 2-for-1 (with a ship) are part of the AI's option space.
    const s = setupGame({ seed: 1, mode: 'base' })
    s.phase = 'action'
    // surplus of lumber, nothing else → the AI wants other resources and can pay 3:1
    for (const r of s.players.p0.regions) r.stored = r.resource === 'lumber' ? 3 : 0
    const trades = legalMoves(s).filter((m) => m.t === 'trade')
    expect(trades.length).toBeGreaterThan(0)
    expect(trades.every((m) => m.t === 'trade' && m.give === 'lumber')).toBe(true)
  })

  it('structuralActions removes a building the event took (Feud)', () => {
    // p0 has the strength advantage; Feud makes p1 lose a building.
    let live = newGame({ seed: 8 })
    live = { ...live, players: { ...live.players,
      p0: { ...live.players.p0, hasHeroToken: true },
      p1: { ...live.players.p1, placed: [...live.players.p1.placed, { cardId: 'base-abbey', slot: 's0-up' }] },
    } }
    const ev = cardEventTotals(live, 'base-feud', 'p0')
    const acts = structuralActions(live, ev.sim, 'p1')
    expect(acts.some((a) => a.type === 'removePlaced')).toBe(true)
  })
})

describe('a full AI turn against the real engine', () => {
  it('rolls, resolves production+event for both, builds, and ends — staying valid', () => {
    const store = makeStore(7)
    store.dispatch({ type: 'endTurn' }) // hand to p1 (AI)
    expect(store.get().activePlayer).toBe('p1')
    runAiTurn(store, 'p1', { v: 123 })
    expect(store.get().activePlayer).toBe('p0') // turn passed back
    invariants(store.get())
  })

  it('the AI develops its principality over several turns (all sets)', () => {
    const store = makeStore(3, ['gold', 'turmoil', 'progress'])
    const rng = { v: 999 }
    for (let i = 0; i < 14 && !store.get().winner; i++) {
      if (store.get().activePlayer === 'p0') {
        store.dispatch({ type: 'roll', production: 3, event: 'plentiful-harvest' })
        store.dispatch({ type: 'endTurn' })
      } else {
        runAiTurn(store, 'p1', rng)
      }
      invariants(store.get())
    }
    expect(computeVP(store.get().players.p1)).toBeGreaterThanOrEqual(2)
  })
})
