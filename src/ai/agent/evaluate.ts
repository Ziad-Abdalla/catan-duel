// Heuristic position evaluation from one seat's perspective. Higher = better for
// `seat`. Used directly as the Easy bot's 1-ply guide and as the leaf value for
// ISMCTS rollouts. Zero-sum framed: score(seat) - score(opponent).

import {
  type GameState, type Player, type Seat, other, totalResources, resourceVector,
} from '../sim/state'
import { tallies } from '../sim/tokens'
import { maybeDef } from '../cards'

export interface Weights {
  vp: number
  income: number
  doubling: number
  buildSite: number
  pendingRoad: number
  strengthNearToken: number
  commerceNearToken: number
  token: number
  hand: number
  liquidity: number
  brigandRisk: number
  progress: number
}

export const DEFAULT_WEIGHTS: Weights = {
  vp: 100,
  income: 9,
  doubling: 6,
  buildSite: 2,
  pendingRoad: 3,
  strengthNearToken: 2,
  commerceNearToken: 3.5,
  token: 16,
  hand: 1.5,
  liquidity: 0.4,
  brigandRisk: 3,
  progress: 4,
}

/** Expected resources per turn from a player's regions (1/6 each, doubled where applicable). */
function income(p: Player): number {
  let inc = 0
  p.regions.forEach((reg, ri) => {
    let mult = 1
    for (const c of p.centers) {
      if (!c.regions.includes(ri)) continue
      for (const id of c.slots) if (id && maybeDef(id)?.doubles === reg.resource) mult = 2
    }
    inc += mult / 6
  })
  return inc
}

function emptySites(p: Player): number {
  let n = 0
  for (const c of p.centers) for (const s of c.slots) if (!s) n++
  return n
}

function playerScore(s: GameState, seat: Seat, w: Weights): number {
  const p = s.players[seat]
  const t = tallies(p)
  let score = 0
  score += w.vp * t.vp
  score += w.income * income(p)
  score += w.buildSite * emptySites(p)
  score += w.pendingRoad * p.pendingRoads
  score += w.progress * t.progress

  // doubling buildings in play
  let doublers = 0
  for (const c of p.centers) for (const id of c.slots) if (id && maybeDef(id)?.doubles) doublers++
  score += w.doubling * doublers

  // advantage tokens: owning them, and progress toward the ≥3 threshold
  if (p.hasHeroToken) score += w.token
  if (p.hasTradeToken) score += w.token
  score += w.strengthNearToken * Math.min(t.strength, 3)
  score += w.commerceNearToken * Math.min(t.commerce, 3)

  // hand options + liquidity, but punish hoarding into a Brigand wipe
  score += w.hand * p.hand.length
  const total = totalResources(p)
  score += w.liquidity * total
  if (total > 7) {
    const v = resourceVector(p)
    score -= w.brigandRisk * (v.gold + v.wool) // exactly what Brigand would take
  }
  return score
}

export function evaluate(s: GameState, seat: Seat, w: Weights = DEFAULT_WEIGHTS): number {
  if (s.winner) return s.winner === seat ? 1e6 : -1e6
  return playerScore(s, seat, w) - playerScore(s, other(seat), w)
}

/** Squash an eval difference to (0,1) for MCTS value backup. */
export function winProb(s: GameState, seat: Seat, w: Weights = DEFAULT_WEIGHTS): number {
  if (s.winner) return s.winner === seat ? 1 : 0
  const x = evaluate(s, seat, w)
  return 1 / (1 + Math.exp(-x / 120))
}
