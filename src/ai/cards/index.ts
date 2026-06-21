// CardDef registry: PASSIVE facts about every card (cost, point contributions,
// placement gates, doubling, trade ships, structural prerequisites). Active,
// one-shot behaviour (action cards, event cards, on-build effects) lives in the
// sim (actions.ts / events.ts) keyed by id. Built from cards.json static data and
// overlaid with hand-verified special properties.

import type { GameState, Resource, Seat } from '../sim/state'
import { hasCity, allPlaced } from '../sim/state'
import { cardsOfSet, type Category, type RawCard, type SetId } from './data'

export interface Points {
  vp: number
  strength: number
  skill: number
  commerce: number
  progress: number
}

export interface CardDef {
  id: string
  set: SetId
  category: Category
  name: string
  cost: Partial<Record<Resource, number>>
  points: Points
  /** goes into a center building site (building or hero/ship unit). */
  placeable: boolean
  isAction: boolean
  /** city-expansion: may ONLY be placed adjacent to a city (hard slot gate). */
  needsCity: boolean
  /** structural prerequisite beyond the city gate; undefined = none. */
  requires?: (s: GameState, seat: Seat) => boolean
  requiresText?: string
  /** doubling building: doubles this terrain's production among its center's regions. */
  doubles?: Resource
  /** storehouse-type: its center's regions are excluded from the Brigand resource count. */
  shieldsBrigand?: boolean
  /** trade ship: enables 2:1 trade for this resource ('neighbor' = adjacent region resources). */
  tradeShipFor?: Resource | 'neighbor'
  /** confidence flag carried through from the corpus (for self-play auditing). */
  lowConfidence?: boolean
}

function pointsFrom(c: RawCard, isShip: boolean): Points {
  const v = c.values ?? {}
  return {
    vp: v.victory_points ?? 0,
    strength: v.strength ?? 0,
    skill: v.skill ?? 0,
    commerce: v.commerce ?? (isShip ? 1 : 0),
    progress: v.progress ?? 0,
  }
}

function costFrom(c: RawCard): Partial<Record<Resource, number>> {
  const out: Partial<Record<Resource, number>> = {}
  for (const x of c.cost ?? []) out[x.resource] = (out[x.resource] ?? 0) + x.count
  return out
}

// Per-card special behaviour overlay. Anything not listed gets sensible defaults.
interface Special {
  doubles?: Resource
  shieldsBrigand?: boolean
  tradeShipFor?: Resource | 'neighbor'
  needsCity?: boolean
  requires?: (s: GameState, seat: Seat) => boolean
  requiresText?: string
}

const has = (s: GameState, seat: Seat, id: string) => allPlaced(s.players[seat]).includes(id)

// Local stat helpers for `requires` predicates. Computed from the registry itself
// (no import of sim/tokens — that would cycle). Static point sums only.
function placedPoints(s: GameState, seat: Seat): { strength: number; commerce: number; progress: number; bvp: number } {
  let strength = 0, commerce = 0, progress = 0, bvp = 0
  for (const id of allPlaced(s.players[seat])) {
    const d = REGISTRY.get(id)
    if (!d) continue
    strength += d.points.strength
    commerce += d.points.commerce
    progress += d.points.progress
    bvp += d.points.vp
  }
  return { strength, commerce, progress, bvp }
}
function fullVp(s: GameState, seat: Seat): number {
  const p = s.players[seat]
  let vp = placedPoints(s, seat).bvp
  for (const c of p.centers) vp += c.kind === 'city' ? 2 : 1
  return vp
}
const hasUnitStrength = (s: GameState, seat: Seat) =>
  allPlaced(s.players[seat]).some((id) => (REGISTRY.get(id)?.points.strength ?? 0) >= 1)
const behindOnVp = (s: GameState, seat: Seat) => fullVp(s, seat) < fullVp(s, seat === 'p0' ? 'p1' : 'p0')

const SPECIAL: Record<string, Special> = {
  // ── base doubling buildings ──
  'base-iron-foundry': { doubles: 'ore' },
  'base-grain-mill': { doubles: 'grain' },
  'base-lumber-camp': { doubles: 'lumber' },
  'base-brick-factory': { doubles: 'brick' },
  'base-weaver-s-shop': { doubles: 'wool' },
  'base-storehouse': { shieldsBrigand: true },
  // ── base trade ships ──
  'base-gold-ship': { tradeShipFor: 'gold' },
  'base-ore-ship': { tradeShipFor: 'ore' },
  'base-grain-ship': { tradeShipFor: 'grain' },
  'base-lumber-ship': { tradeShipFor: 'lumber' },
  'base-brick-ship': { tradeShipFor: 'brick' },
  'base-wool-ship': { tradeShipFor: 'wool' },
  'base-large-trade-ship': { tradeShipFor: 'neighbor' },

  // ── Era of Gold ──
  'gold-storehouse': { shieldsBrigand: true },
  'gold-large-trade-ship': { tradeShipFor: 'neighbor' },
  'gold-merchant-guild': { needsCity: true, requiresText: 'City' },
  'gold-harbor': { needsCity: true, requiresText: 'City' },
  'gold-trading-base': { needsCity: true, requiresText: 'City' },
  'gold-staple-house': { requires: (s, seat) => has(s, seat, 'gold-merchant-guild'), requiresText: 'Merchant Guild' },
  'gold-gold-cache': { requires: hasUnitStrength, requiresText: 'a hero with ≥1 strength' },

  // ── Era of Turmoil ──
  'turmoil-large-festival-hall': { needsCity: true, requiresText: 'City' },
  'turmoil-fire-brigade': { needsCity: true, requiresText: 'City' },

  // ── Era of Progress ──
  'progress-town-hall': { needsCity: true, requires: (s, seat) => has(s, seat, 'base-parish-hall'), requiresText: 'City + Parish Hall' },
  'progress-library': { needsCity: true, requiresText: 'City' },
  'progress-pharmacy': { needsCity: true, requiresText: 'City' },
  'progress-bath-house': { needsCity: true, requiresText: 'City' },
  'progress-university': {
    needsCity: true,
    requires: (s, seat) => has(s, seat, 'base-abbey') || has(s, seat, 'progress-library'),
    requiresText: 'City + (Abbey or Library)',
  },
  'progress-building-crane': {
    needsCity: true,
    requires: (s, seat) => has(s, seat, 'progress-university'),
    requiresText: 'City + University',
  },
  'progress-parliament': {
    needsCity: true,
    requires: (s, seat) => placedPoints(s, seat).progress >= 2,
    requiresText: 'City + 2 progress points',
  },
  'progress-chief-cannoneer': {
    requires: (s, seat) => has(s, seat, 'progress-university'),
    requiresText: 'University',
  },
}
void behindOnVp // used by action-card predicates in the sim (Guido/Gustav)

const SPINE: Category[] = ['region', 'road', 'settlement', 'city']

function buildDef(c: RawCard): CardDef {
  const sp = SPECIAL[c.id] ?? {}
  const isShip = !!sp.tradeShipFor
  const placeable = c.category === 'building' || c.category === 'hero-or-unit'
  return {
    id: c.id,
    set: c.set,
    category: c.category,
    name: c.name,
    cost: costFrom(c),
    points: pointsFrom(c, isShip),
    placeable,
    isAction: c.category === 'action',
    needsCity: sp.needsCity ?? false,
    requires: sp.requires,
    requiresText: sp.requiresText,
    doubles: sp.doubles,
    shieldsBrigand: sp.shieldsBrigand,
    tradeShipFor: sp.tradeShipFor,
    lowConfidence: c.confidence === 'low' || (c.unclear?.length ?? 0) > 0,
  }
}

const REGISTRY = new Map<string, CardDef>()
for (const set of ['base', 'gold', 'turmoil', 'progress'] as SetId[]) {
  for (const c of cardsOfSet(set)) {
    if (SPINE.includes(c.category)) continue // spine cards handled structurally, not via CardDef slots
    REGISTRY.set(c.id, buildDef(c))
  }
}

export function def(id: string): CardDef {
  const d = REGISTRY.get(id)
  if (!d) throw new Error(`no CardDef for ${id}`)
  return d
}

export function maybeDef(id: string): CardDef | undefined {
  return REGISTRY.get(id)
}

export function allDefs(): CardDef[] {
  return [...REGISTRY.values()]
}

/** A card is a "unit" (hero/ship) for token/strength purposes. */
export function isUnit(id: string): boolean {
  return maybeDef(id)?.category === 'hero-or-unit'
}

export { hasCity }
