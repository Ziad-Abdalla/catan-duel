// Derived point tallies (from placed cards' CardDef points) and advantage-token
// assignment. Hero token = strength advantage; Trade token = trade advantage.
// Rule: hold a token with ≥3 of that point AND strictly more than the opponent;
// it falls to no-one if the holder drops below 3.

import { type GameState, type Player, type Seat, allPlaced, hasCity } from './state'
import { def, maybeDef } from '../cards'

export interface Tallies {
  vp: number
  strength: number
  skill: number
  commerce: number
  progress: number
}

export function tallies(p: Player): Tallies {
  let vp = 0, strength = 0, skill = 0, commerce = 0, progress = 0
  const placedIds: string[] = []
  for (const c of p.centers) {
    if (c.kind === 'settlement') vp += 1
    else vp += 2
    for (const id of c.slots) {
      if (!id) continue
      placedIds.push(id)
      const pts = def(id).points
      vp += pts.vp
      strength += pts.strength
      skill += pts.skill
      commerce += pts.commerce
      progress += pts.progress
    }
  }
  // ── Era of Gold dynamic modifiers ──
  const ships = placedIds.filter((id) => maybeDef(id)?.tradeShipFor).length
  const count = (id: string) => placedIds.filter((x) => x === id).length
  // Salt Silo: each trade ship is worth +1 commerce (per silo)
  commerce += count('gold-salt-silo') * ships
  // Trading Base: Marketplace and Harbor each gain +1 commerce (per base)
  const tb = count('gold-trading-base')
  if (tb > 0) {
    const mh = placedIds.filter((id) => id === 'base-marketplace' || id === 'gold-harbor').length
    commerce += tb * mh
  }
  // Harbor: worth 1 VP while you have ≥3 trade ships (per harbor)
  if (ships >= 3) vp += count('gold-harbor')
  return { vp, strength, skill, commerce, progress }
}

/** Hand limit = 3 + total progress points from placed buildings. */
export function handLimit(p: Player): number {
  return 3 + tallies(p).progress
}

/** Count of trade-ship units a player has in play. */
export function tradeShipCount(p: Player): number {
  let n = 0
  for (const id of allPlaced(p)) if (maybeDef(id)?.tradeShipFor) n++
  return n
}

/** Reassign hero/trade tokens from current strength/commerce. Mutates state. */
export function recomputeTokens(s: GameState): void {
  const t0 = tallies(s.players.p0)
  const t1 = tallies(s.players.p1)
  assign(s, 'strength', t0.strength, t1.strength, 'hero')
  assign(s, 'commerce', t0.commerce, t1.commerce, 'trade')
}

function assign(
  s: GameState,
  _stat: 'strength' | 'commerce',
  v0: number,
  v1: number,
  token: 'hero' | 'trade',
): void {
  const key = token === 'hero' ? 'hasHeroToken' : 'hasTradeToken'
  let holder: Seat | null = null
  if (v0 >= 3 && v0 > v1) holder = 'p0'
  else if (v1 >= 3 && v1 > v0) holder = 'p1'
  // tie at/above 3, or both below 3 → no-one holds it (set aside)
  s.players.p0[key] = holder === 'p0'
  s.players.p1[key] = holder === 'p1'
}

export { hasCity }
