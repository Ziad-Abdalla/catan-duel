import { describe, it, expect } from 'vitest'
import { newGame } from '../../engine/newGame'
import { applyAction, computeVP, computeStats, type Action } from '../../engine/actions'
import type { GameState as LiveState, PlayerId } from '../../types'
import {
  rollForAi, productionTotals, eventTotals, cardEventTotals, planAiActions, reconcileDeltas,
  structuralActions, refillActions, exchangeActions, humanEventChoice, liveCenters,
  freeBuildingSlot, liveTotalsOf, handLimit, LIVE_TO_SIM, type Seat,
} from './aiController'

function store(seed: number) { let s = newGame({ seed }); return { get: () => s, dispatch: (a: Action) => { s = applyAction(s, a) } } }
const RES = ['lumber', 'brick', 'wool', 'grain', 'ore', 'gold'] as const
const vec = (live: LiveState, p: PlayerId) => liveTotalsOf(live, p)
const fmt = (v: Record<string, number>) => RES.map((r) => `${r[0]}${v[r]}`).join(' ')
const total = (v: Record<string, number>) => RES.reduce((n, r) => n + v[r], 0)

describe('full-game flow analysis', () => {
  it('plays a complete game; the whole flow stays correct', () => {
    const st = store(7); const rng = { v: 7 }; const get = st.get, dispatch = st.dispatch
    const log: string[] = []
    const issues: string[] = []
    const rec = (seat: PlayerId, t: Record<string, Record<string, number>>) => { for (const d of reconcileDeltas(get(), seat, t[seat] as never)) dispatch({ type: 'addResource', player: seat, resource: d.resource, count: d.count }) }
    const check = (cond: boolean, msg: string) => { if (!cond) issues.push(`T${get().turn}: ${msg}`) }
    const invariants = () => {
      for (const id of ['p0', 'p1'] as PlayerId[]) {
        const p = get().players[id]
        for (const r of p.regions) check(r.stored >= 0 && r.stored <= 3, `${id} ${r.resource} stored=${r.stored} out of [0,3]`)
        check(p.hand.length <= handLimit(get(), id) + 1, `${id} hand ${p.hand.length} > limit ${handLimit(get(), id)}`)
      }
      const a = computeStats(get().players.p0), b = computeStats(get().players.p1)
      if (get().players.p0.hasHeroToken) check(a.strength >= 3 && a.strength > b.strength, `p0 holds hero, str ${a.strength} vs ${b.strength}`)
      if (get().players.p1.hasHeroToken) check(b.strength >= 3 && b.strength > a.strength, `p1 holds hero, str ${b.strength} vs ${a.strength}`)
      if (get().players.p0.hasTradeToken) check(a.commerce >= 3 && a.commerce > b.commerce, `p0 holds trade, com ${a.commerce} vs ${b.commerce}`)
    }

    const aiTurn = (ai: PlayerId) => {
      const human: PlayerId = ai === 'p0' ? 'p1' : 'p0'
      const roll = rollForAi(get(), 'medium', rng)
      const before = { p0: vec(get(), 'p0'), p1: vec(get(), 'p1') }
      dispatch({ type: 'roll', production: roll.production, event: roll.eventLive })
      const order = [ai, human] as PlayerId[]; const es = LIVE_TO_SIM[roll.eventLive] ?? 'event'
      const pt = productionTotals(get(), roll.production); for (const s of order) rec(s, pt)
      const prodGain = { ai: total(vec(get(), ai)) - total(before[ai]), hu: total(vec(get(), human)) - total(before[human]) }
      let evNote = es
      if (es === 'brigand') {
        const beforeB = { p0: vec(get(), 'p0'), p1: vec(get(), 'p1') }
        const ev = eventTotals(get(), roll.production, 'brigand', ai as Seat); for (const s of order) rec(s, ev.totals)
        for (const id of ['p0', 'p1'] as PlayerId[]) { if (total(beforeB[id]) > 7) check(vec(get(), id).gold === 0 && vec(get(), id).wool === 0, `${id} >7 but kept gold/wool after Brigand`) }
      } else if (es === 'event') {
        dispatch({ type: 'drawEvent' }); const cid = get().revealedEvent; evNote = `event:${cid}`
        if (cid) { const ev = cardEventTotals(get(), cid, ai as Seat); for (const s of order) { structuralActions(get(), ev.sim, s).forEach(dispatch); rec(s, ev.totals) } }
        dispatch({ type: 'dismissEvent' })
      } else if (['trade', 'celebration', 'plenty'].includes(es)) { const ev = eventTotals(get(), roll.production, es, ai as Seat); for (const s of order) rec(s, ev.totals) }
      const plan = planAiActions(get(), ai, 'medium', rng)
      const vpBefore = computeVP(get().players[ai])
      const S = plan.settlements, R = plan.roads, pairs = Math.min(S, R)
      for (let i = 0; i < pairs; i++) { if (get().regionStack.length < 2) break; dispatch({ type: 'expandSpine', player: ai }) }
      for (let i = 0; i < R - pairs; i++) dispatch({ type: 'buildPiece', player: ai, piece: 'road', end: 'right', pay: false })
      for (let i = 0; i < S - pairs; i++) {
        dispatch({ type: 'buildPiece', player: ai, piece: 'settlement', end: 'right', pay: false })
        get().players[ai].regions.forEach((r, idx) => { if (r.empty && get().regionStack.length > 0) dispatch({ type: 'placeLandscape', player: ai, regionIndex: idx }) })
      }
      for (let i = 0; i < plan.cities; i++) { const c = liveCenters(get(), ai).find((c) => c.kind === 'settlement'); if (!c) break; dispatch({ type: 'upgradeCity', player: ai, seat: c.seat, pay: false }) }
      for (const cid of plan.buildings) { if (!get().players[ai].hand.includes(cid)) continue; dispatch({ type: 'playCard', player: ai, cardId: cid, slot: freeBuildingSlot(get(), ai) ?? undefined, pay: false }) }
      for (const s of order) structuralActions(get(), plan.sim, s).forEach(dispatch)
      for (const s of order) rec(s, plan.totals)
      refillActions(get(), ai).forEach(dispatch)
      const lim = handLimit(get(), ai)
      check(get().players[ai].hand.length <= lim, `${ai} over hand limit after refill (${get().players[ai].hand.length}/${lim})`)
      exchangeActions(get(), ai).forEach(dispatch)
      const bld = `s${plan.settlements} c${plan.cities} r${plan.roads}${plan.buildings.length ? ' +' + plan.buildings.map((b) => b.replace('base-', '')).join(',') : ''}`
      log.push(`T${String(get().turn).padStart(2)} ${ai} ${roll.production}/${evNote.replace('base-', '')} prod[ai+${prodGain.ai} hu+${prodGain.hu}] [${bld}] vp${vpBefore}->${computeVP(get().players[ai])} res[${fmt(vec(get(), ai))}] hand${get().players[ai].hand.length}/${lim}`)
      dispatch({ type: 'endTurn' })
    }

    let safety = 0
    while (safety++ < 140) {
      const s = get(); const thr = s.winThreshold
      if (computeVP(s.players.p0) >= thr) { log.push(`*** p0 (you) reaches ${thr} VP at T${s.turn}`); break }
      if (computeVP(s.players.p1) >= thr) { log.push(`*** p1 (AI) reaches ${thr} VP at T${s.turn}`); break }
      if (s.activePlayer === 'p0') {
        const prod = (safety % 6) + 1
        dispatch({ type: 'roll', production: prod, event: 'plentiful-harvest' })
        const pt = productionTotals(get(), prod); rec('p0', pt); rec('p1', pt)
        if (humanEventChoice(get(), 'plenty', undefined, 'p0', 'p1')) dispatch({ type: 'addResource', player: 'p0', resource: 'grain', count: 1 })
        refillActions(get(), 'p0').forEach(dispatch)
        dispatch({ type: 'endTurn' })
      } else aiTurn('p1')
      invariants()
    }
    // eslint-disable-next-line no-console
    console.log('\n=== FLOW ===\n' + log.join('\n') + '\n=== ISSUES (' + issues.length + ') ===\n' + (issues.slice(0, 40).join('\n') || 'NONE'))
    expect(issues).toEqual([])
    expect(computeVP(get().players.p1)).toBeGreaterThanOrEqual(5)
  })
})
