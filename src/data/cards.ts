import type { Card, CardCategory, CardValues, Cost, ResourceType, SetId } from '../types'
import raw from './cards.json'

/** The full card corpus (base + Era of Gold/Turmoil/Progress), read-only. */
export const CARDS: Card[] = raw as Card[]

const byId = new Map(CARDS.map((c) => [c.id, c]))

export function getCard(id: string): Card | undefined {
  return byId.get(id)
}

/** FOREIGN cards are built in the OPPONENT's principality (road complements / city
 *  attachments) and affect them. They use the `playForeign` action, not `playCard`. */
export const FOREIGN_CARD_IDS = new Set<string>([
  'intrigue-red-light-tavern',
  'merchants-brigand-camp',
  'merchants-trading-station',
  'barbarians-barbarian-stronghold',
  'prosperity-thieves-hideout',
])
export const isForeignCard = (id: string): boolean => FOREIGN_CARD_IDS.has(id)

/**
 * REGION EXPANSIONS — cards placed ADJACENT TO A REGION (not in a settlement building site):
 * Residences, Border Fortress, Abbey Brewery, Reiner, the Triumph marker card. `resource` is the
 * terrain they attach to ('any' = any region); `rotates` ones cycle through levels 0–3, spending
 * `rotateCost` per step up (paid from your regions, trust-based). Per-level BENEFIT values (the
 * commerce a Residence yields at each level) are not in the corpus yet — flagged on the cards.
 */
export interface RegionExpansionDef {
  resource: ResourceType | 'any'
  rotates: boolean
  rotateCost?: Cost[]
}
export const REGION_EXPANSIONS: Record<string, RegionExpansionDef> = {
  'intrigue-reiner-the-miller': { resource: 'grain', rotates: false },
  'intrigue-abbey-brewery': { resource: 'grain', rotates: true, rotateCost: [{ resource: 'grain', count: 2 }] },
  'merchants-cloth-merchants-residence': { resource: 'wool', rotates: true, rotateCost: [{ resource: 'wool', count: 2 }] },
  'merchants-paper-merchants-residence': { resource: 'lumber', rotates: true, rotateCost: [{ resource: 'lumber', count: 2 }] },
  'barbarians-border-fortress': { resource: 'brick', rotates: true, rotateCost: [{ resource: 'ore', count: 1 }, { resource: 'wool', count: 1 }] },
  'barbarians-triumph-card': { resource: 'any', rotates: false },
}
export const isRegionExpansion = (id: string): boolean => id in REGION_EXPANSIONS
export const regionExpansionOf = (id: string): RegionExpansionDef | undefined => REGION_EXPANSIONS[id]

/**
 * Per-rotation-level point values for rotating region-expansions (index = level 0–3). When present,
 * these OVERRIDE the card's static `values` in computeStats/computeVP, so a rotated Residence scores
 * its current level. Read off the physical cards (owner-confirmed):
 *  · Cloth Merchant's Residence — commerce 0/1/2/3
 *  · Paper Merchant's Residence — 0 · 1 commerce · 1 commerce+1 progress · 1 commerce+1 progress+1 VP
 * Border Fortress's per-level strength is still pending physical confirmation (kept flagged).
 */
export const PLACED_LEVEL_VALUES: Record<string, Array<Partial<CardValues>>> = {
  'merchants-cloth-merchants-residence': [{}, { commerce: 1 }, { commerce: 2 }, { commerce: 3 }],
  'merchants-paper-merchants-residence': [{}, { commerce: 1 }, { commerce: 1, progress: 1 }, { commerce: 1, progress: 1, victory_points: 1 }],
  'barbarians-border-fortress': [{}, { strength: 1 }, { strength: 2 }, { strength: 4 }],
}
export const levelValuesOf = (id: string, level: number | undefined): Partial<CardValues> | undefined =>
  PLACED_LEVEL_VALUES[id]?.[Math.max(0, Math.min(3, level ?? 0))]

/**
 * ROAD COMPLEMENTS — cards placed ON a road slot. Trading Post is your OWN road; the rest are
 * FOREIGN (built on a free road of your opponent — they are also in FOREIGN_CARD_IDS). Placed
 * cards use slot `rc-<roadSlotIndex>` so the board renders them on that road.
 */
export const ROAD_COMPLEMENT_IDS = new Set<string>([
  'merchants-trading-post',
  'merchants-brigand-camp',
  'intrigue-red-light-tavern',
  'barbarians-barbarian-stronghold',
])
export const isRoadComplement = (id: string): boolean => ROAD_COMPLEMENT_IDS.has(id)

/**
 * ATTACH-ON-CARD — cards placed ON TOP OF another placed card: Bran on your Odin's Temple, Judith on
 * your Church, the Commercial Metropolis upgrading a city. VP already sums correctly (the pair's
 * total = both cards' victory_points), so this is the placement affordance + the visual stacking.
 */
export interface AttachDef {
  hostName?: string
  hostCategory?: CardCategory
  label: string
}
export const ATTACHABLE: Record<string, AttachDef> = {
  'intrigue-bran-defender-of-the-temple': { hostName: "Odin's Temple", label: "your Odin's Temple" },
  'intrigue-judith-guardian-of-the-church': { hostName: 'Church', label: 'your Church' },
  'merchants-commercial-metropolis': { hostCategory: 'city', label: 'a city' },
}
export const isAttachable = (id: string): boolean => id in ATTACHABLE
export const attachableOf = (id: string): AttachDef | undefined => ATTACHABLE[id]

/**
 * The base region Card for a produced resource (one per terrain) — used to render
 * the reusable <CenterArt> region tile for any region slot on the board.
 */
const regionByResource = new Map<ResourceType, Card>()
for (const c of CARDS) {
  if (c.category === 'region' && c.region_resource) regionByResource.set(c.region_resource, c)
}
export function regionCardFor(resource: ResourceType): Card | undefined {
  return regionByResource.get(resource)
}

export function cardsInSet(set: SetId): Card[] {
  return CARDS.filter((c) => c.set === set)
}

export function cardsByCategory(category: Card['category']): Card[] {
  return CARDS.filter((c) => c.category === category)
}

/** Card art (Vite resolves at build time via import.meta.glob), across all art folders. */
const artModules = import.meta.glob('../assets/cards/*.webp', { eager: true, import: 'default' }) as Record<string, string>
const regionArt = import.meta.glob('../assets/regions/*.webp', { eager: true, import: 'default' }) as Record<string, string>
const buildingArt = import.meta.glob('../assets/buildings/*.webp', { eager: true, import: 'default' }) as Record<string, string>

/** base-set foundation cards → their photo in assets/buildings. NOTE: `base-city` is
 *  intentionally omitted — its only scan is low-res, so the city falls back to the clean
 *  hand-drawn CenterArt SVG (which matches the painted settlement/road art). Drop an
 *  official city scan here as `city` to switch it back to a photo. */
const FOUNDATION_ART: Record<string, string> = {
  'base-settlement': 'settlement',
  'base-road': 'road',
}

/**
 * Resolve a card's photo. Order: an exact per-card photo (assets/cards/<id>.webp),
 * then the shared foundation art (settlement/city/road), then the per-resource
 * region terrain photo — covering region archetype cards AND in-play region slots
 * like `region-gold-3`. Returns undefined only when truly no art exists (the caller
 * then falls back to the hand-drawn CenterArt SVG).
 */
export function cardArt(id: string): string | undefined {
  const direct = artModules[`../assets/cards/${id}.webp`]
  if (direct) return direct

  const found = FOUNDATION_ART[id]
  if (found) return buildingArt[`../assets/buildings/${found}.webp`]

  // region archetype card → its produced resource's terrain photo
  const card = byId.get(id)
  if (card?.category === 'region' && card.region_resource) {
    const r = regionArt[`../assets/regions/${card.region_resource}.webp`]
    if (r) return r
  }
  // in-play region slot id: region-<resource>-<number>
  const m = /^region-([a-z]+)-/.exec(id)
  if (m) {
    const r = regionArt[`../assets/regions/${m[1]}.webp`]
    if (r) return r
  }
  return undefined
}

/**
 * The prerequisite a card states, if any. Prefer the structured `values.requires`;
 * otherwise read the "Requires: …" clause printed in the rules text (the transcribed
 * card is the source of truth — we never invent a requirement that isn't printed).
 */
export function requirementOf(card: Card): string | null {
  if (card.values?.requires) return card.values.requires
  const m = card.rules_text?.match(/Requires:\s*([^.]+)/i)
  return m ? m[1].trim() : null
}

/**
 * What to read out for a card's effect — the printed rules, or for passive cards a
 * synthesised line from its values, or an honest note when no effect text exists.
 * Never invents rules: a card with no transcribed effect says so.
 */
export function displaySummary(card: Card): string {
  if (card.rules_text && card.rules_text.trim()) return card.rules_text
  const v = card.values ?? {}
  const parts: string[] = []
  if (v.victory_points) parts.push(`${v.victory_points} victory point${v.victory_points > 1 ? 's' : ''}`)
  if (v.strength) parts.push(`${v.strength} strength`)
  if (v.skill) parts.push(`${v.skill} skill`)
  if (v.commerce) parts.push(`${v.commerce} commerce`)
  if (v.progress) parts.push(`${v.progress} progress`)
  if (parts.length) return `Passive — provides ${parts.join(', ')} while in play (counted automatically).`
  return 'No effect text was transcribed for this card. Resolve any effect manually with the toolkit below.'
}
