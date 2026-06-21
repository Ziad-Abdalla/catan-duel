// Theme-set active effects: action-card behaviour, on-build effects, and the
// Turmoil attack/defense interactions. Auto-choices reuse choice.ts. Mutates state.
// Covers Era of Gold, Era of Turmoil, and Era of Progress.
//
// Some exotic, purely-reactive cards are approximated (noted inline) — the spirit
// of the effect is preserved for a strong AI without a full interrupt system.

import {
  type GameState, type Player, type Seat, type Resource, RESOURCES,
  other, addResource, removeResource, resourceTotal, allPlaced,
} from './state'
import { bestResourceToGain, mostExpendableResource, handCardValue } from './choice'
import { tallies, tradeShipCount } from './tokens'
import { maybeDef, hasCity } from '../cards'
import { rngDie } from './rng'

const placedHas = (p: Player, id: string) => allPlaced(p).includes(id)
const countPlaced = (p: Player, id: string) => allPlaced(p).filter((x) => x === id).length
const heroCount = (p: Player) => allPlaced(p).filter((id) => (maybeDef(id)?.points.strength ?? 0) >= 1).length
const behindVp = (s: GameState, seat: Seat) => tallies(s.players[seat]).vp < tallies(s.players[other(seat)]).vp

/** Move up to n resources from victim to taker (taker's choice). Returns moved count. */
function steal(s: GameState, taker: Seat, victim: Seat, n: number): number {
  let moved = 0
  for (let i = 0; i < n; i++) {
    let r: Resource | null = null
    const want = bestResourceToGain(s, taker)
    if (resourceTotal(s.players[victim], want) > 0) r = want
    else for (const x of RESOURCES) if (resourceTotal(s.players[victim], x) > 0) { r = x; break }
    if (!r) break
    removeResource(s.players[victim], r, 1)
    addResource(s.players[taker], r, 1)
    moved++
  }
  return moved
}

function giveOne(s: GameState, from: Seat): void {
  const r = mostExpendableResource(s, from)
  if (r) { removeResource(s.players[from], r, 1); addResource(s.players[other(from)], r, 1) }
}

/** Take as many of one resource type from the opponent as a single region can hold. */
function brigandRaid(s: GameState, seat: Seat): void {
  const p = s.players[seat]
  const opp = other(seat)
  const r = bestResourceToGain(s, seat)
  const room = Math.max(0, ...p.regions.filter((x) => x.resource === r).map((x) => 3 - x.stored), 0)
  const take = Math.min(room, resourceTotal(s.players[opp], r))
  removeResource(s.players[opp], r, take)
  addResource(p, r, take)
}

// ── Turmoil: loss compensation + defenses ────────────────────────────────────────

/** Irmgard: when you lose a card to an event/action, gain any 1 resource. */
function compensateLoss(s: GameState, seat: Seat): void {
  if (placedHas(s.players[seat], 'turmoil-irmgard-keeper-of-the-light')) {
    addResource(s.players[seat], bestResourceToGain(s, seat), 1)
  }
}

/** Lookout Tower (1–2) / Heinrich (3–5) may negate an Archer/Arsonist/Traitor. */
function defenseNegates(s: GameState, defender: Seat): boolean {
  const p = s.players[defender]
  const hasLookout = placedHas(p, 'turmoil-lookout-tower')
  const hasHeinrich = placedHas(p, 'turmoil-heinrich-the-sentinel')
  if (!hasLookout && !hasHeinrich) return false
  let roll: number
  ;[roll, s.rng] = rngDie(s.rng)
  if (hasLookout && roll <= 2) return true
  if (hasHeinrich && roll >= 3 && roll <= 5) return true
  return false
}

/** Bury the defender's least valuable unit with ≥1 strength under a draw stack. */
function buryUnit(s: GameState, seat: Seat): void {
  const p = s.players[seat]
  let best: { ci: number; si: number; id: string; v: number } | null = null
  p.centers.forEach((c, ci) => c.slots.forEach((id, si) => {
    if (!id) return
    const d = maybeDef(id)
    if (!d || d.category !== 'hero-or-unit' || d.points.strength < 1) return
    const v = handCardValue(id)
    if (!best || v < best.v) best = { ci, si, id, v }
  }))
  if (best) {
    const b = best as { ci: number; si: number; id: string }
    p.centers[b.ci].slots[b.si] = null
    s.drawStacks[0]?.unshift(b.id)
    compensateLoss(s, seat)
  }
}

/** Bury the defender's least valuable building (Fire Brigade protects its city). */
function buryBuilding(s: GameState, seat: Seat): void {
  const p = s.players[seat]
  let best: { ci: number; si: number; id: string; v: number } | null = null
  p.centers.forEach((c, ci) => {
    const protectedByBrigade = c.kind === 'city' && c.slots.includes('turmoil-fire-brigade')
    if (protectedByBrigade) return
    c.slots.forEach((id, si) => {
      if (!id) return
      const d = maybeDef(id)
      if (!d || d.category !== 'building') return
      const v = handCardValue(id)
      if (!best || v < best.v) best = { ci, si, id, v }
    })
  })
  if (best) {
    const b = best as { ci: number; si: number; id: string }
    p.centers[b.ci].slots[b.si] = null
    s.drawStacks[0]?.unshift(b.id)
    compensateLoss(s, seat)
  }
}

/** Take the best card from the discard pile into hand (Guido/Gustav). */
function takeFromDiscard(s: GameState, seat: Seat): void {
  if (s.discard.length === 0) return
  let bi = 0
  s.discard.forEach((id, i) => { if (handCardValue(id) > handCardValue(s.discard[bi])) bi = i })
  const [id] = s.discard.splice(bi, 1)
  s.players[seat].hand.push(id)
}

// ── Action cards ────────────────────────────────────────────────────────────────

export function canPlayThemeAction(s: GameState, seat: Seat, id: string): boolean | null {
  const p = s.players[seat]
  switch (id) {
    // Gold
    case 'gold-goldsmith': return resourceTotal(p, 'gold') >= 3
    case 'gold-trade-master': return placedHas(p, 'gold-merchant-guild')
    case 'gold-merchant': return tallies(p).commerce >= 3 || hasCity(p)
    case 'gold-brigands': return p.hasHeroToken
    case 'gold-gudrun-terror-of-the-seas': return placedHas(p, 'gold-pirate-ship')
    case 'gold-reiner-the-herald': return false // pre-roll only
    // Turmoil
    case 'turmoil-archer':
    case 'turmoil-arsonist':
    case 'turmoil-traitor': return placedHas(p, 'turmoil-hedge-tavern-1x')
    case 'turmoil-voyage-of-plunder':
    case 'turmoil-brigands': return p.hasHeroToken
    case 'turmoil-sebastian-the-itinerant-preacher': return true
    // Progress
    case 'progress-three-field-system':
    case 'progress-mineral-mining': return placedHas(p, 'progress-university')
    case 'progress-benjamin-the-traveling-scholar': return s.lastRoll != null
    case 'progress-guido-the-ambassador':
      return s.discard.length > 0 && (placedHas(p, 'progress-town-hall') || behindVp(s, seat))
    case 'progress-gustav-the-librarian':
      return s.discard.length > 0 && (placedHas(p, 'progress-library') || behindVp(s, seat))
    case 'progress-doctor': return placedHas(p, 'progress-bath-house')
    case 'progress-relocation': return true
    case 'progress-brigitta-the-wise-woman': return false // pre-roll only
    default: return null
  }
}

export function applyThemeAction(s: GameState, seat: Seat, id: string): boolean {
  const p = s.players[seat]
  const opp = other(seat)
  switch (id) {
    // Gold
    case 'gold-goldsmith':
      removeResource(p, 'gold', 3)
      addResource(p, bestResourceToGain(s, seat, 'gold'), 1)
      addResource(p, bestResourceToGain(s, seat, 'gold'), 1)
      return true
    case 'gold-trade-master': steal(s, seat, opp, 2); return true
    case 'gold-merchant': steal(s, seat, opp, 2); giveOne(s, seat); return true
    case 'gold-brigands': brigandRaid(s, seat); return true
    case 'gold-gudrun-terror-of-the-seas': {
      const ships = countPlaced(p, 'gold-pirate-ship')
      const take = Math.min(ships * 2, resourceTotal(s.players[opp], 'gold'))
      removeResource(s.players[opp], 'gold', take)
      addResource(p, 'gold', take)
      return true
    }
    // Turmoil
    case 'turmoil-archer': if (!defenseNegates(s, opp)) buryUnit(s, opp); return true
    case 'turmoil-arsonist': if (!defenseNegates(s, opp)) buryBuilding(s, opp); return true
    case 'turmoil-traitor':
      if (!defenseNegates(s, opp) && s.players[opp].hand.length > 0) {
        const hand = s.players[opp].hand
        let bi = 0
        hand.forEach((c, i) => { if (handCardValue(c) > handCardValue(hand[bi])) bi = i })
        p.hand.push(hand.splice(bi, 1)[0])
      }
      return true
    case 'turmoil-voyage-of-plunder': steal(s, seat, opp, behindVp(s, opp) ? 1 : 2); return true
    case 'turmoil-brigands': brigandRaid(s, seat); return true
    case 'turmoil-sebastian-the-itinerant-preacher':
      // purely reactive in the physical game; here a small stand-in benefit
      addResource(p, bestResourceToGain(s, seat), 1)
      return true
    // Progress
    case 'progress-three-field-system': addResource(p, 'grain', 2); return true
    case 'progress-mineral-mining': addResource(p, 'ore', 2); return true
    case 'progress-benjamin-the-traveling-scholar': {
      const n = s.lastRoll?.production
      if (n != null) for (const reg of p.regions) if (reg.number === n) addResource(p, reg.resource, 1)
      return true
    }
    case 'progress-guido-the-ambassador':
    case 'progress-gustav-the-librarian': takeFromDiscard(s, seat); return true
    case 'progress-doctor': {
      const center = p.centers.find((c) => c.slots.includes('progress-bath-house'))
      if (center) for (const ri of center.regions) { const reg = p.regions[ri]; if (reg) addResource(p, reg.resource, 1) }
      return true
    }
    case 'progress-relocation': return true // structural; no economic change in this model
    default: return false
  }
}

// ── On-build effects ─────────────────────────────────────────────────────────────

export function onBuild(s: GameState, seat: Seat, id: string): void {
  const p = s.players[seat]
  switch (id) {
    // Gold
    case 'gold-staple-house':
      addResource(p, bestResourceToGain(s, seat), 1)
      addResource(p, bestResourceToGain(s, seat), 1)
      break
    case 'gold-pirate-ship': {
      const opp = s.players[other(seat)]
      let target: { ci: number; si: number; id: string } | null = null
      opp.centers.forEach((c, ci) => c.slots.forEach((cid, si) => {
        if (cid && maybeDef(cid)?.tradeShipFor && !target) target = { ci, si, id: cid }
      }))
      if (target) {
        const t = target as { ci: number; si: number; id: string }
        opp.centers[t.ci].slots[t.si] = null
        s.discard.push(t.id)
      }
      break
    }
    // Turmoil
    case 'turmoil-tithe-barn': {
      const r: Resource = resourceTotal(p, 'grain') <= resourceTotal(p, 'wool') ? 'grain' : 'wool'
      addResource(p, r, heroCount(p))
      break
    }
    case 'turmoil-fairgrounds':
      if (tallies(p).skill > tallies(s.players[other(seat)]).skill) {
        addResource(p, bestResourceToGain(s, seat), 1)
        addResource(p, bestResourceToGain(s, seat), 1)
      }
      break
    // Progress
    case 'progress-library': {
      // choose the best available card from a draw stack into hand
      let best: { st: number; idx: number; v: number } | null = null
      s.drawStacks.forEach((st, si) => st.forEach((cid, ci) => {
        const v = handCardValue(cid)
        if (!best || v > best.v) best = { st: si, idx: ci, v }
      }))
      if (best) {
        const b = best as { st: number; idx: number }
        const [card] = s.drawStacks[b.st].splice(b.idx, 1)
        p.hand.push(card)
      }
      break
    }
  }
}

export { tradeShipCount, compensateLoss }
