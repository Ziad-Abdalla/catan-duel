// Best-effort, ASSIST-ONLY check of whether a card's printed prerequisite is met.
// Trust-based: this never blocks a play — it only lets the UI hint "met / not yet".
// Returns null when the requirement can't be determined from state.

import type { GameState, PlayerId, Card } from '../types'
import { getCard, requirementOf } from '../data/cards'
import { computeStats, type Stats } from './actions'

/** Does this player currently have a placed card whose name contains `name`? */
function hasBuilding(s: GameState, player: PlayerId, name: string): boolean {
  const want = name.toLowerCase().trim()
  if (!want) return false
  return s.players[player].placed.some((pc) => getCard(pc.cardId)?.name.toLowerCase().includes(want))
}

function hasCity(s: GameState, player: PlayerId): boolean {
  return s.players[player].placed.some((pc) => getCard(pc.cardId)?.category === 'city')
}

function hasHeroWithStrength(s: GameState, player: PlayerId): boolean {
  return s.players[player].placed.some((pc) => {
    const c = getCard(pc.cardId)
    return c?.category === 'hero-or-unit' && (c.values?.strength ?? 0) >= 1
  })
}

/** All placed units/heroes (category hero-or-unit). */
function countUnits(s: GameState, player: PlayerId): number {
  return s.players[player].placed.filter((pc) => getCard(pc.cardId)?.category === 'hero-or-unit').length
}

/** Heroes only — units that are not trade/pirate ships (tag mentions "ship"). */
function countHeroes(s: GameState, player: PlayerId): number {
  return s.players[player].placed.filter((pc) => {
    const c = getCard(pc.cardId)
    return c?.category === 'hero-or-unit' && !(c.tag ?? '').toLowerCase().includes('ship')
  }).length
}

/** Trade ships in play — tag contains "trade ship" (dash style varies). */
function countTradeShips(s: GameState, player: PlayerId): number {
  return s.players[player].placed.filter((pc) => (getCard(pc.cardId)?.tag ?? '').toLowerCase().includes('trade ship')).length
}

/**
 * @returns true (met) / false (not met) / null (can't tell — e.g. "top-level Residence").
 * Compound "X and Y" prerequisites require EVERY and-clause; each clause may itself be a list of
 * "X or Y, Z" alternatives (any one satisfies). Trust-based: drives the UI hint only.
 */
export function requirementMet(card: Card, s: GameState, player: PlayerId): boolean | null {
  const req = requirementOf(card)
  if (!req) return null
  const clauses = req
    .replace(/[()]/g, '')
    .split(/\band\b/i)
    .map((c) => c.trim().replace(/\.+$/, ''))
    .filter(Boolean)
  if (clauses.length > 1) {
    let anyNull = false
    for (const c of clauses) {
      const r = evalClause(c, s, player)
      if (r === false) return false
      if (r === null) anyNull = true
    }
    return anyNull ? null : true
  }
  return evalClause(req, s, player)
}

/** A clause is a set of OR-alternatives ("Church, Abbey or Chapel"); any satisfies. */
function evalClause(clause: string, s: GameState, player: PlayerId): boolean | null {
  const opp: PlayerId = player === 'p0' ? 'p1' : 'p0'
  const me = computeStats(s.players[player])
  const fewerVP = me.vp < computeStats(s.players[opp]).vp
  const parts = clause
    .split(/\bor\b|,/i)
    .map((p) => p.trim().replace(/\.+$/, ''))
    .filter(Boolean)
  let anyNull = false
  for (const part of parts) {
    const v = evalAtom(part, s, player, me, fewerVP)
    if (v === true) return true
    if (v === null) anyNull = true
  }
  return anyNull ? null : false
}

/** Evaluate ONE atomic predicate. null = can't determine. */
function evalAtom(atom: string, s: GameState, player: PlayerId, me: Stats, fewerVP: boolean): boolean | null {
  const r = atom.toLowerCase()
  if (/fewer victory points than your opponent/.test(r)) return fewerVP
  if (/strength advantage/.test(r)) return s.players[player].hasHeroToken
  if (/trade advantage/.test(r)) return s.players[player].hasTradeToken

  const no = r.match(/^no(?:t)?(?:\s+having)?\s+(?:building\s+)?(.+)$/)
  if (no) return !hasBuilding(s, player, no[1])

  const triumph = r.match(/triumph card indicating at least (\d+)/)
  if (triumph) return (s.players[player].markers?.triumph ?? 0) >= Number(triumph[1])

  const ships = r.match(/(\d+)\s*trade\s*ships?/)
  if (ships) return countTradeShips(s, player) >= Number(ships[1])

  const heroes = r.match(/(\d+)\s*heroes?/)
  if (heroes) return countHeroes(s, player) >= Number(heroes[1])

  const units = r.match(/(\d+)\s*units?/)
  if (units) return countUnits(s, player) >= Number(units[1])

  const commerce = r.match(/(\d+)\s*commerce/)
  if (commerce) return me.commerce >= Number(commerce[1])

  const progress = r.match(/(\d+)\s*progress/)
  if (progress) return me.progress >= Number(progress[1])

  if (/hero with at least 1 strength/.test(r)) return hasHeroWithStrength(s, player)

  // can't evaluate until placed-card rotation levels exist
  if (/top-level residence|highest level residence|residence of the highest level/.test(r)) return null

  if (/^(a |1 )?city$/.test(r)) return hasCity(s, player)

  // a bare building name → do we own a matching placed card?
  if (/^[a-z][a-z .'’-]+$/i.test(atom.trim())) return hasBuilding(s, player, atom)

  return null
}
