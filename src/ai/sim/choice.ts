// Deterministic auto-choices for the many "take any 1 resource" / "discard a card"
// sub-decisions that events and some cards trigger. Keeping these inside apply()
// (rather than as explicit moves) keeps the search branching tractable; the choices
// are smart enough for a strong Tier-B bot. Pure functions of state — no RNG.

import {
  type GameState, type Player, type Resource, type Seat, RESOURCES,
  resourceVector, resourceTotal,
} from './state'
import { ROAD_COST, SETTLEMENT_COST, CITY_COST } from '../cards/spine'
import { def, maybeDef } from '../cards'

/** Targets the player is plausibly saving toward, for valuing a resource gain. */
function wantVector(s: GameState, seat: Seat): Record<Resource, number> {
  const p = s.players[seat]
  const have = resourceVector(p)
  const want: Record<Resource, number> = { lumber: 0, brick: 0, wool: 0, grain: 0, ore: 0, gold: 0 }
  const targets: Partial<Record<Resource, number>>[] = [SETTLEMENT_COST, ROAD_COST, CITY_COST]
  // plus whatever's affordable-soon in hand
  for (const id of p.hand) {
    const d = maybeDef(id)
    if (d && !d.isAction) targets.push(d.cost)
  }
  for (const t of targets) {
    for (const r of RESOURCES) {
      const need = t[r] ?? 0
      if (need > 0) want[r] += Math.max(0, need - have[r])
    }
  }
  return want
}

/** True if every region of this resource is already full (a gain would be lost). */
function allFull(p: Player, r: Resource): boolean {
  const regs = p.regions.filter((x) => x.resource === r)
  return regs.length > 0 && regs.every((x) => x.stored >= 3)
}
/** True if the player owns no region of this resource at all. */
function noRegion(p: Player, r: Resource): boolean {
  return !p.regions.some((x) => x.resource === r)
}

/** Best resource for `seat` to gain right now (skips ones that can't be stored). */
export function bestResourceToGain(s: GameState, seat: Seat, avoid?: Resource): Resource {
  const p = s.players[seat]
  const want = wantVector(s, seat)
  const have = resourceVector(p)
  let best: Resource | null = null
  let bestScore = -Infinity
  for (const r of RESOURCES) {
    if (r === avoid) continue
    if (noRegion(p, r) || allFull(p, r)) continue // can't store it
    // value = demand toward targets, then scarcity (prefer topping up what's low)
    const score = want[r] * 10 - have[r]
    if (score > bestScore) {
      bestScore = score
      best = r
    }
  }
  // fallback: anything storable, else just lumber
  if (!best) {
    for (const r of RESOURCES) if (!noRegion(p, r) && !allFull(p, r)) return r
    return 'lumber'
  }
  return best
}

/** The resource a player can most spare (for forced discards / Brigand-style choices). */
export function mostExpendableResource(s: GameState, seat: Seat): Resource | null {
  const p = s.players[seat]
  const want = wantVector(s, seat)
  let pick: Resource | null = null
  let pickScore = -Infinity
  for (const r of RESOURCES) {
    const total = resourceTotal(p, r)
    if (total <= 0) continue
    const score = total - want[r] * 10 // lots of it + not wanted = expendable
    if (score > pickScore) {
      pickScore = score
      pick = r
    }
  }
  return pick
}

/** Rough static value of a hand card, for choosing what to discard / bury. */
export function handCardValue(id: string): number {
  const d = maybeDef(id)
  if (!d) return 0
  const pts = d.points
  let v = pts.vp * 5 + pts.strength * 2 + pts.commerce * 2 + pts.skill + pts.progress * 2
  if (d.doubles) v += 4
  if (d.tradeShipFor) v += 2
  if (d.shieldsBrigand) v += 2
  if (d.isAction) v += 1
  // cheaper cards are easier to deploy → slightly more useful in hand
  const costSum = Object.values(d.cost).reduce((a, b) => a + (b ?? 0), 0)
  v += Math.max(0, 3 - costSum) * 0.5
  return v
}

/** The least useful card in hand (to discard down to the hand limit). */
export function worstHandCard(p: Player): string | null {
  if (p.hand.length === 0) return null
  let worst = p.hand[0]
  let worstV = handCardValue(worst)
  for (const id of p.hand) {
    const v = handCardValue(id)
    if (v < worstV) {
      worstV = v
      worst = id
    }
  }
  return worst
}

export { def }
