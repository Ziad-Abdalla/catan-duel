// Best-effort, ASSIST-ONLY check of whether a card's printed prerequisite is met.
// Trust-based: this never blocks a play — it only lets the UI hint "met / not yet".
// Returns null when the requirement can't be determined from state.

import type { GameState, PlayerId, Card } from '../types'
import { getCard, requirementOf } from '../data/cards'
import { computeStats } from './actions'

/** Does this player currently have a placed card whose name contains `name`? */
function hasBuilding(s: GameState, player: PlayerId, name: string): boolean {
  const want = name.toLowerCase()
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

/**
 * @returns true (met) / false (not met) / null (can't tell — e.g. "card placement rules").
 */
export function requirementMet(card: Card, s: GameState, player: PlayerId): boolean | null {
  const req = requirementOf(card)
  if (!req) return null
  const r = req.toLowerCase()
  const opp: PlayerId = player === 'p0' ? 'p1' : 'p0'
  const me = computeStats(s.players[player])

  // "... or fewer victory points than your opponent" — an OR escape hatch
  const orFewerVP = /fewer victory points than your opponent/.test(r)
  const fewerVP = me.vp < computeStats(s.players[opp]).vp
  const orPart = orFewerVP && fewerVP

  // advantages
  if (/strength advantage/.test(r)) return s.players[player].hasHeroToken || orPart
  if (/trade advantage/.test(r)) return s.players[player].hasTradeToken || orPart

  // numeric thresholds
  const commerce = r.match(/(\d+)\s*commerce/)
  if (commerce) {
    const ok = me.commerce >= Number(commerce[1]) || (/or city/.test(r) && hasCity(s, player))
    return ok || orPart
  }
  const progress = r.match(/(\d+)\s*progress/)
  if (progress) return me.progress >= Number(progress[1]) || orPart

  // hero with a strength point
  if (/hero with at least 1 strength/.test(r)) return hasHeroWithStrength(s, player) || orPart

  // "Abbey or Library" / "Town Hall or ..." / single named building / "city"
  const names = req
    .split(/\bor\b/i)
    .map((x) => x.replace(/fewer victory points.*/i, '').trim())
    .filter(Boolean)
  let sawName = false
  for (const n of names) {
    if (/^city$/i.test(n)) {
      sawName = true
      if (hasCity(s, player)) return true
    } else if (/^[a-z][a-z .'-]+$/i.test(n)) {
      sawName = true
      if (hasBuilding(s, player, n)) return true
    }
  }
  if (sawName) return orPart // a building/city was named but none owned (unless the VP escape applies)
  return null
}
