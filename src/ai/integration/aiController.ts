// AI ↔ live-store bridge, split into discrete, paced steps so the orchestrator
// (AiTableMode) can sequence them with deliberate timing and animation:
//   roll → (wait for dice) → production (both) → event (both) → action → end.
//
// These functions are PURE: each takes a live snapshot and returns what to dispatch.
// All timing, animation and store dispatch live in the React layer. Allowed to import
// the live engine types — it's integration glue, not the pure AI engine.

import type { GameState as LiveState, PlayerId, ResourceType } from '../../types'
import type { Action } from '../../engine/actions'
import { computeStats } from '../../engine/actions'
import type { EventFace as LiveEventFace } from '../../engine/dice'
import { liveToSim } from './liveToSim'
import { legalMoves, apply, applyProduction } from '../sim/moves'
import { resolveFace, resolveBrigand, resolveEventCard } from '../sim/events'
import { isOver } from '../sim/win'
import { chooseMove } from '../agent/agent'
import { handCardValue } from '../sim/choice'
import { tallies, tradeShipCount } from '../sim/tokens'
import { cloneState, RESOURCES, allPlaced, type Resource, type Seat, type EventFace, type GameState as SimState } from '../sim/state'
import { maybeDef } from '../cards'
import type { Difficulty } from '../agent/difficulty'

const SIM_TO_LIVE: Record<string, LiveEventFace> = {
  event: 'event-card', plenty: 'plentiful-harvest', celebration: 'celebration', trade: 'trade', brigand: 'brigand',
}
export const LIVE_TO_SIM: Record<string, string> = {
  'event-card': 'event', 'plentiful-harvest': 'plenty', celebration: 'celebration', trade: 'trade', brigand: 'brigand',
}

export type Totals = Record<Resource, number>
export type SeatTotals = Record<Seat, Totals>
export interface Tokens { hero: Seat | null; trade: Seat | null }

function seatTotals(s: SimState): SeatTotals {
  const of = (seat: Seat): Totals => {
    const v = { lumber: 0, brick: 0, wool: 0, grain: 0, ore: 0, gold: 0 }
    for (const r of s.players[seat].regions) v[r.resource] += r.stored
    return v
  }
  return { p0: of('p0'), p1: of('p1') }
}
function seatTokens(s: SimState): Tokens {
  return {
    hero: s.players.p0.hasHeroToken ? 'p0' : s.players.p1.hasHeroToken ? 'p1' : null,
    trade: s.players.p0.hasTradeToken ? 'p0' : s.players.p1.hasTradeToken ? 'p1' : null,
  }
}

/** Build a sim from live, run `fn`, return totals + tokens + the resulting sim state
 *  (the sim is needed to diff STRUCTURAL changes — buildings/units/hand cards an
 *  event removed). */
function simAfter(live: LiveState, fn: (s: SimState) => void): EventResult {
  const s = liveToSim(live)
  fn(s)
  return { totals: seatTotals(s), tokens: seatTokens(s), sim: s }
}

// ── live read helpers ────────────────────────────────────────────────────────────

export function liveTotalsOf(live: LiveState, seat: PlayerId): Totals {
  const v = { lumber: 0, brick: 0, wool: 0, grain: 0, ore: 0, gold: 0 }
  for (const r of live.players[seat].regions) if (!r.empty) v[r.resource] += r.stored
  return v
}
export function liveCenters(live: LiveState, seat: PlayerId) {
  const out: { seat: number; kind: 'settlement' | 'city' }[] = []
  live.players[seat].placed.forEach((pc) => {
    const m = /^settle-(\d+)$/.exec(pc.slot ?? '')
    if (!m) return
    if (pc.cardId === 'base-settlement') out.push({ seat: Number(m[1]), kind: 'settlement' })
    else if (pc.cardId === 'base-city') out.push({ seat: Number(m[1]), kind: 'city' })
  })
  return out.sort((a, b) => a.seat - b.seat)
}
export function freeBuildingSlot(live: LiveState, seat: PlayerId): string | null {
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

// ── step 1: the AI's dice ────────────────────────────────────────────────────────

export interface RollChoice { production: number; eventLive: LiveEventFace; eventSim: string }

/** The AI rolls (fairly, via the sim's RNG), possibly choosing the die with Brigitta. */
export function rollForAi(live: LiveState, difficulty: Difficulty, rng: { v: number }): RollChoice {
  let sim = liveToSim(live)
  let guard = 0
  while (!isOver(sim) && sim.phase === 'preroll' && guard++ < 8) {
    const [m, nr] = chooseMove(sim, difficulty, rng.v)
    rng.v = nr
    sim = apply(sim, m)
    if (sim.lastRoll) break
  }
  const prod = sim.lastRoll?.production ?? 1 + (rng.v % 6)
  const evSim = sim.lastRoll?.event ?? 'event'
  return { production: prod, eventLive: SIM_TO_LIVE[evSim] ?? 'event-card', eventSim: evSim }
}

// ── step 2: production (both players) ─────────────────────────────────────────────

/** Per-seat resource totals after applying production for `prod` (incl. doubling). */
export function productionTotals(live: LiveState, prod: number): SeatTotals {
  return simAfter(live, (s) => { s.lastRoll = { production: prod, event: 'event' }; applyProduction(s, prod) }).totals
}

// ── step 3: the die event (both players) ──────────────────────────────────────────

export interface EventResult { totals: SeatTotals; tokens: Tokens; sim: SimState }

/** Resolve a non-card die face (brigand/trade/celebration/plenty). */
export function eventTotals(live: LiveState, prod: number, eventSim: string, roller: Seat): EventResult {
  if (eventSim === 'brigand') return simAfter(live, (s) => resolveBrigand(s))
  return simAfter(live, (s) => { s.lastRoll = { production: prod, event: eventSim as EventFace }; resolveFace(s, roller) })
}

/** Resolve a specific drawn event card by id (Feud / Fraternal Feuds / Plague / …). */
export function cardEventTotals(live: LiveState, cardId: string, roller: Seat): EventResult {
  return simAfter(live, (s) => resolveEventCard(s, cardId, roller))
}

// ── the human's free RESOURCE CHOICE for an event ────────────────────────────────
// Events that say "take any resource of your choice" must be the human's pick, not
// auto-applied. This returns what (if anything) the human gets to choose for a given
// die face / event card. null = nothing to choose (forced effect or no gain).

export type Choice =
  | { kind: 'gain'; count: number }   // gain N of your choice
  | { kind: 'steal'; count: number }  // take N from the opponent (your choice)
  | { kind: 'buy'; count: number }    // optionally buy up to N, 1 gold each

export function humanEventChoice(
  live: LiveState, eventSim: string, cardId: string | undefined, humanSeat: PlayerId, aiSeat: PlayerId,
): Choice | null {
  const sim = liveToSim(live)
  const skill = (s: PlayerId) => tallies(sim.players[s]).skill
  const progressBuildings = (s: PlayerId) => allPlaced(sim.players[s]).filter((id) => (maybeDef(id)?.points.progress ?? 0) > 0).length

  if (eventSim === 'plenty') return { kind: 'gain', count: 1 }
  if (eventSim === 'celebration') return skill(humanSeat) >= skill(aiSeat) ? { kind: 'gain', count: 1 } : null
  if (eventSim === 'trade') return live.players[humanSeat].hasTradeToken ? { kind: 'steal', count: 1 } : null
  if (eventSim === 'event' && cardId) {
    if (cardId === 'base-invention' || cardId === 'progress-invention') {
      const n = Math.min(2, progressBuildings(humanSeat))
      return n > 0 ? { kind: 'gain', count: n } : null
    }
    if (cardId === 'base-trade-ships-race' || cardId === 'gold-trade-ships-race') {
      const h = tradeShipCount(sim.players[humanSeat]), a = tradeShipCount(sim.players[aiSeat])
      return h >= a && h > 0 ? { kind: 'gain', count: 1 } : null
    }
    if (cardId === 'base-traveling-merchant' || cardId === 'gold-traveling-merchant') {
      const gold = liveTotalsOf(live, humanSeat).gold
      return gold > 0 ? { kind: 'buy', count: Math.min(2, gold) } : null
    }
  }
  return null
}

/** Resources the opponent actually holds (for a steal pick). */
export function opponentHas(live: LiveState, aiSeat: PlayerId): Record<Resource, number> {
  return liveTotalsOf(live, aiSeat)
}

// ── structural reconciliation: make the live board match the sim after an event ───
// Events can remove a placed building/unit (Feud, Riots, Arsonist) or discard hand
// cards (Fraternal Feuds). We diff the sim result against the pre-event live state
// and emit the real store actions to reproduce those removals.

function placedMultiset(ids: string[]): Map<string, number> {
  const m = new Map<string, number>()
  for (const id of ids) m.set(id, (m.get(id) ?? 0) + 1)
  return m
}
function livePlacedUnitsBuildings(live: LiveState, seat: PlayerId): { cardId: string; index: number }[] {
  const out: { cardId: string; index: number }[] = []
  live.players[seat].placed.forEach((pc, index) => {
    const cat = maybeDef(pc.cardId)?.category
    if (cat === 'building' || cat === 'hero-or-unit') out.push({ cardId: pc.cardId, index })
  })
  return out
}

/** Actions to reconcile placed cards + hand of `seat` to the sim result (removals from events). */
export function structuralActions(liveBefore: LiveState, sim: SimState, seat: PlayerId): Action[] {
  const actions: Action[] = []
  // placed buildings/units
  const livePlaced = livePlacedUnitsBuildings(liveBefore, seat)
  const liveCount = placedMultiset(livePlaced.map((x) => x.cardId))
  const simCount = placedMultiset(allPlaced(sim.players[seat]).filter((id) => {
    const c = maybeDef(id)?.category
    return c === 'building' || c === 'hero-or-unit'
  }))
  const usedIndex = new Set<number>()
  for (const [cardId, lc] of liveCount) {
    const remove = lc - (simCount.get(cardId) ?? 0)
    for (let k = 0; k < remove; k++) {
      const hit = livePlaced.find((x) => x.cardId === cardId && !usedIndex.has(x.index))
      if (hit) { usedIndex.add(hit.index); actions.push({ type: 'removePlaced', player: seat, placedIndex: hit.index }) }
    }
  }
  // hand cards removed by an event (Fraternal Feuds)
  const liveHand = placedMultiset(liveBefore.players[seat].hand)
  const simHand = placedMultiset(sim.players[seat].hand)
  for (const [cardId, lc] of liveHand) {
    const remove = lc - (simHand.get(cardId) ?? 0)
    for (let k = 0; k < remove; k++) actions.push({ type: 'discardCard', player: seat, from: 'hand', cardId })
  }
  return actions
}

// ── refill (replenish) + exchange ────────────────────────────────────────────────

/** Hand limit = 3 + progress points (Era of Progress buildings raise it). */
export function handLimit(live: LiveState, seat: PlayerId): number {
  return 3 + computeStats(live.players[seat]).progress
}

/** The index of the fullest non-empty draw stack (for drawing), or -1. */
export function fullestStack(live: LiveState): number {
  let best = -1, bestLen = 0
  live.drawStacks.forEach((st, i) => { if (st.length > bestLen) { bestLen = st.length; best = i } })
  return best
}

/** drawToHand actions to bring `seat` up to its hand limit. */
export function refillActions(live: LiveState, seat: PlayerId): Action[] {
  const actions: Action[] = []
  const limit = handLimit(live, seat)
  let hand = live.players[seat].hand.length
  const lens = live.drawStacks.map((st) => st.length)
  while (hand < limit) {
    let bi = -1, bl = 0
    lens.forEach((l, i) => { if (l > bl) { bl = l; bi = i } })
    if (bi < 0) break
    actions.push({ type: 'drawToHand', player: seat, stackIndex: bi })
    lens[bi]--; hand++
  }
  return actions
}

/** Cost in resources to SEARCH a stack and pick a specific card: base 2, reduced by
 *  Parish Hall (1) or Town Hall (free), per the rules. */
export function searchCost(live: LiveState, seat: PlayerId): number {
  const placed = live.players[seat].placed.map((p) => p.cardId)
  if (placed.includes('progress-town-hall')) return 0
  if (placed.includes('base-parish-hall')) return 1
  return 2
}

/** The single best card available across all draw stacks (which to search FOR). */
export function bestStackCard(live: LiveState): { stackIndex: number; cardId: string; value: number } | null {
  let best: { stackIndex: number; cardId: string; value: number } | null = null
  live.drawStacks.forEach((st, i) => st.forEach((id) => {
    const value = handCardValue(id)
    if (!best || value > best.value) best = { stackIndex: i, cardId: id, value }
  }))
  return best
}

/** Pay `n` resources, drawn from whatever the seat holds most of (gold last). */
function payResources(live: LiveState, seat: PlayerId, n: number): Action[] | null {
  const have = liveTotalsOf(live, seat)
  const order = (RESOURCES as Resource[]).slice().sort((a, b) => {
    if (a === 'gold') return 1; if (b === 'gold') return -1 // spend gold last
    return (have[b] ?? 0) - (have[a] ?? 0)
  })
  const out: Action[] = []
  let left = n
  for (const r of order) {
    if (left <= 0) break
    const take = Math.min(have[r] ?? 0, left)
    if (take > 0) { out.push({ type: 'addResource', player: seat, resource: r as ResourceType, count: -take }); left -= take }
  }
  return left === 0 ? out : null
}

/**
 * Optional end-of-turn EXCHANGE, with judgment:
 *  1) If a clearly-valuable card sits in a stack and is worth more than your weakest
 *     hand card by a real margin, PAY to search that one stack and take exactly it
 *     (cost 2 / 1 with Parish Hall / free with Town Hall) — but only if affordable.
 *  2) Otherwise, if your weakest card is poor, take the FREE top-of-stack swap (a
 *     gamble, no cost).
 *  3) Otherwise keep your hand.
 */
export function exchangeActions(live: LiveState, seat: PlayerId): Action[] {
  const hand = live.players[seat].hand
  if (hand.length === 0) return []
  let worst = hand[0], worstV = handCardValue(hand[0])
  for (const id of hand) { const v = handCardValue(id); if (v < worstV) { worstV = v; worst = id } }

  // (1) pay to search ONE stack for a specific high-value card
  const best = bestStackCard(live)
  const cost = searchCost(live, seat)
  if (best && best.value >= 5 && best.value >= worstV + 3) {
    const pay = cost === 0 ? [] : payResources(live, seat, cost)
    if (pay) {
      return [
        { type: 'discardCard', player: seat, from: 'hand', cardId: worst },
        ...pay,
        { type: 'takeFromStack', player: seat, stackIndex: best.stackIndex, cardId: best.cardId },
      ]
    }
  }
  // (2) free top-of-stack swap if the weakest card is genuinely poor
  if (worstV < 4) {
    const stack = fullestStack(live)
    if (stack >= 0) return [
      { type: 'discardToStack', player: seat, cardId: worst, stackIndex: stack },
      { type: 'drawToHand', player: seat, stackIndex: stack },
    ]
  }
  return []
}

// ── step 4: the AI's action phase (builds/plays/trades) ───────────────────────────

export interface ActionPlan {
  settlements: number
  cities: number
  extraRoads: number
  buildings: string[]
  totals: SeatTotals
  tokens: Tokens
  sim: SimState // post-action sim — to reconcile BOTH seats' resources + structure
}

/** Plan the AI's action phase from a post-roll live state (no dice — that's done). */
export function planAiActions(live: LiveState, aiSeat: PlayerId, difficulty: Difficulty, rng: { v: number }): ActionPlan {
  let sim = liveToSim(live)
  sim.phase = 'action'
  let settlements = 0, cities = 0, roads = 0
  const buildings: string[] = []
  let beforeEnd = cloneState(sim)
  let guard = 0
  while (!isOver(sim) && sim.active === aiSeat && guard++ < 200) {
    const moves = legalMoves(sim)
    if (moves.length === 0) break
    const [m, nr] = chooseMove(sim, difficulty, rng.v)
    rng.v = nr
    if (m.t === 'endTurn') { beforeEnd = cloneState(sim); break }
    if (m.t === 'roll' || m.t === 'chooseProd' || m.t === 'playBrigitta' || m.t === 'playReiner') { sim = apply(sim, m); continue }
    if (m.t === 'buildSettlement') settlements++
    else if (m.t === 'upgradeCity') cities++
    else if (m.t === 'buildRoad') roads++
    else if (m.t === 'placeCard') buildings.push(m.cardId)
    sim = apply(sim, m)
    beforeEnd = sim
  }
  return {
    settlements, cities,
    extraRoads: Math.max(0, roads - settlements),
    buildings,
    totals: seatTotals(beforeEnd),
    tokens: seatTokens(beforeEnd),
    sim: beforeEnd,
  }
}

// ── reconciliation: dispatch addResource deltas to hit target totals ──────────────

export function reconcileDeltas(live: LiveState, seat: PlayerId, target: Totals): { resource: ResourceType; count: number }[] {
  const have = liveTotalsOf(live, seat)
  const out: { resource: ResourceType; count: number }[] = []
  for (const r of RESOURCES) {
    const delta = (target[r] ?? 0) - (have[r] ?? 0)
    if (delta !== 0) out.push({ resource: r as ResourceType, count: delta })
  }
  return out
}

export { RESOURCES }
export type { Resource, Seat, LiveState, PlayerId }
