// Drives the AI's seat on the LIVE store. The AI plans its whole turn on the sim
// (the rules authority), then this replays that turn as real store actions so it
// animates on the actual board: roll → production → structural builds → resource
// reconciliation (by net total, geometry-proof) → end turn.
//
// Allowed to import the live engine/store types — it's the integration glue, not the
// pure AI engine (which stays isolated). It only READS live state and DISPATCHES
// existing public actions; it never modifies the live game's code.

import type { GameState as LiveState, PlayerId, ResourceType } from '../../types'
import type { Action } from '../../engine/actions'
import { liveToSim } from './liveToSim'
import { legalMoves, apply } from '../sim/moves'
import { isOver } from '../sim/win'
import { chooseMove } from '../agent/agent'
import { tallies } from '../sim/tokens'
import { cloneState, RESOURCES, type Resource, type Seat } from '../sim/state'
import type { Difficulty } from '../agent/difficulty'
import type { EventFace as LiveEventFace } from '../../engine/dice'

const EVENT_MAP: Record<string, LiveEventFace> = {
  event: 'event-card', plenty: 'plentiful-harvest', celebration: 'celebration', trade: 'trade', brigand: 'brigand',
}

interface Plan {
  production: number
  event: LiveEventFace
  settlements: number
  cities: number
  extraRoads: number
  buildings: string[]
  // sim end-of-turn resource totals per seat (pre-replenish)
  simTotals: Record<Seat, Record<Resource, number>>
  tokens: { hero: Seat | null; trade: Seat | null }
}

/** Play the AI's whole turn on the sim and extract a replayable plan. */
function planTurn(live: LiveState, aiSeat: Seat, difficulty: Difficulty, rng: { v: number }): Plan {
  let sim = liveToSim(live)
  let production = live.lastRoll?.production ?? 1
  let event: LiveEventFace = 'event-card'
  let gotDice = false
  let settlements = 0, cities = 0, roads = 0
  const buildings: string[] = []
  let beforeEnd = cloneState(sim)

  let guard = 0
  while (!isOver(sim) && sim.active === aiSeat && guard++ < 300) {
    const moves = legalMoves(sim)
    if (moves.length === 0) break
    const [m, nr] = chooseMove(sim, difficulty, rng.v)
    rng.v = nr
    if (m.t === 'endTurn') { beforeEnd = cloneState(sim); sim = apply(sim, m); break }
    if (!gotDice && (m.t === 'roll' || m.t === 'chooseProd')) {
      const after = apply(sim, m)
      if (after.lastRoll) { production = after.lastRoll.production; event = EVENT_MAP[after.lastRoll.event] ?? 'event-card'; gotDice = true }
      sim = after
      continue
    }
    if (m.t === 'buildSettlement') settlements++
    else if (m.t === 'upgradeCity') cities++
    else if (m.t === 'buildRoad') roads++
    else if (m.t === 'placeCard') buildings.push(m.cardId)
    sim = apply(sim, m)
    beforeEnd = sim
  }

  const totals = (seat: Seat): Record<Resource, number> => {
    const v = { lumber: 0, brick: 0, wool: 0, grain: 0, ore: 0, gold: 0 }
    for (const r of beforeEnd.players[seat].regions) v[r.resource] += r.stored
    return v
  }
  const t0 = tallies(beforeEnd.players.p0), t1 = tallies(beforeEnd.players.p1)
  const heroHolder: Seat | null = beforeEnd.players.p0.hasHeroToken ? 'p0' : beforeEnd.players.p1.hasHeroToken ? 'p1' : null
  const tradeHolder: Seat | null = beforeEnd.players.p0.hasTradeToken ? 'p0' : beforeEnd.players.p1.hasTradeToken ? 'p1' : null
  void t0; void t1

  return {
    production, event,
    settlements, cities,
    extraRoads: Math.max(0, roads - settlements),
    buildings,
    simTotals: { p0: totals('p0'), p1: totals('p1') },
    tokens: { hero: heroHolder, trade: tradeHolder },
  }
}

// ── live helpers ────────────────────────────────────────────────────────────────

function liveTotalsOf(live: LiveState, seat: PlayerId): Record<Resource, number> {
  const v = { lumber: 0, brick: 0, wool: 0, grain: 0, ore: 0, gold: 0 }
  for (const r of live.players[seat].regions) if (!r.empty) v[r.resource] += r.stored
  return v
}

function liveCenters(live: LiveState, seat: PlayerId) {
  const placed = live.players[seat].placed
  const seats: { seat: number; kind: 'settlement' | 'city' }[] = []
  placed.forEach((pc) => {
    const m = /^settle-(\d+)$/.exec(pc.slot ?? '')
    if (!m) return
    if (pc.cardId === 'base-settlement') seats.push({ seat: Number(m[1]), kind: 'settlement' })
    else if (pc.cardId === 'base-city') seats.push({ seat: Number(m[1]), kind: 'city' })
  })
  return seats.sort((a, b) => a.seat - b.seat)
}

/** First free building-site slot string across the player's settlements/cities. */
function freeBuildingSlot(live: LiveState, seat: PlayerId): string | null {
  const occupied = new Set(live.players[seat].placed.map((pc) => pc.slot))
  for (const c of liveCenters(live, seat)) {
    const cap = c.kind === 'city' ? 2 : 1
    for (let k = 0; k < cap; k++) {
      for (const where of ['up', 'down'] as const) {
        const slot = k === 0 ? `s${c.seat}-${where}` : `s${c.seat}-${where}${k + 1}`
        if (!occupied.has(slot)) return slot
      }
    }
  }
  return null
}

export interface AiTurnApi {
  getState: () => LiveState
  dispatch: (a: Action) => void
  aiSeat: PlayerId
  difficulty: Difficulty
  rng: { v: number }
  delayMs?: number
  cancelled?: () => boolean
}

/** Run the AI's full turn against the live store, animating each step. */
export async function playAiTurn(api: AiTurnApi): Promise<void> {
  const { getState, dispatch, aiSeat, difficulty, rng } = api
  const delay = api.delayMs ?? 650
  const human: PlayerId = aiSeat === 'p0' ? 'p1' : 'p0'
  const wait = () => new Promise<void>((res) => setTimeout(res, delay))
  const stopped = () => api.cancelled?.() ?? false

  const plan = planTurn(getState(), aiSeat as Seat, difficulty, rng)

  // 1) roll the sim's dice (shown on the real board)
  dispatch({ type: 'roll', production: plan.production, event: plan.event })
  await wait(); if (stopped()) return

  // 2) base production for both players
  dispatch({ type: 'applyProduction' })
  await wait(); if (stopped()) return

  // 3) brigand resolves before anything else economic
  if (plan.event === 'brigand') { dispatch({ type: 'resolveBrigand' }); await wait(); if (stopped()) return }

  // 4) structural builds (each adds a settlement+road+2 regions / a city / a card)
  for (let i = 0; i < plan.settlements; i++) {
    if (getState().regionStack.length < 2) break
    dispatch({ type: 'expandSpine', player: aiSeat })
    await wait(); if (stopped()) return
  }
  for (let i = 0; i < plan.extraRoads; i++) {
    dispatch({ type: 'buildPiece', player: aiSeat, piece: 'road', end: 'right', pay: false })
    await wait(); if (stopped()) return
  }
  for (let i = 0; i < plan.cities; i++) {
    const settlement = liveCenters(getState(), aiSeat).find((c) => c.kind === 'settlement')
    if (!settlement) break
    dispatch({ type: 'upgradeCity', player: aiSeat, seat: settlement.seat, pay: false })
    await wait(); if (stopped()) return
  }
  for (const cardId of plan.buildings) {
    if (!getState().players[aiSeat].hand.includes(cardId)) continue
    const slot = freeBuildingSlot(getState(), aiSeat) ?? undefined
    dispatch({ type: 'playCard', player: aiSeat, cardId, slot, pay: false })
    await wait(); if (stopped()) return
  }

  // 5) reconcile resources to the sim's end-of-turn totals (covers doubling, trades,
  //    events, and the costs we skipped with pay:false) — by NET TOTAL, so it's
  //    immune to the live/sim geometry mismatch.
  for (const seat of [aiSeat, human] as PlayerId[]) {
    const live = liveTotalsOf(getState(), seat)
    const target = plan.simTotals[seat as Seat]
    for (const r of RESOURCES) {
      const delta = (target[r] ?? 0) - (live[r] ?? 0)
      if (delta !== 0) dispatch({ type: 'addResource', player: seat, resource: r as ResourceType, count: delta })
    }
  }
  await wait(); if (stopped()) return

  // 6) advantage tokens
  dispatch({ type: 'setToken', player: plan.tokens.hero, token: 'hero' })
  dispatch({ type: 'setToken', player: plan.tokens.trade, token: 'trade' })
  await wait(); if (stopped()) return

  // 7) end the turn
  dispatch({ type: 'endTurn' })
}
