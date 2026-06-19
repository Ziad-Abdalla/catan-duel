import type { PlayerId, ResourceType } from '../types'

/** A region card: the resource it produces + its printed production die-number. */
export interface RegionCard {
  resource: ResourceType
  number: number | null // null = not yet confirmed from physical cards
}

/**
 * The two fixed starting principalities of the introductory game ("The First Catanians").
 * Read directly from the operator's physical German Das Duell cards (high confidence).
 * Each principality holds one region of every resource; both are a 1–6 permutation,
 * with ore=5 and grain=6 common to both (matches the real fixed setup).
 */
// Official match start (owner-specified). Each player carries every number 1–6
// exactly once, and the two players use DIFFERENT resource→number mappings (so
// the same number never means the same resource for both) — matching the
// rulebook's fixed-setup principle. Wheat=grain · Wood=lumber · Sheep=wool.
//   P1: Wheat=5, Wood=3, Sheep=1, Brick=2, Ore=6, Gold=4
//   P2: Wheat=6, Gold=1, Brick=3, Sheep=4, Ore=5, Wood=2
export const STARTING_PRINCIPALITIES: Record<PlayerId, RegionCard[]> = {
  p0: [
    { resource: 'gold', number: 4 },
    { resource: 'lumber', number: 3 },
    { resource: 'brick', number: 2 },
    { resource: 'wool', number: 1 },
    { resource: 'ore', number: 6 },
    { resource: 'grain', number: 5 },
  ],
  p1: [
    { resource: 'wool', number: 4 },
    { resource: 'brick', number: 3 },
    { resource: 'lumber', number: 2 },
    { resource: 'gold', number: 1 },
    { resource: 'ore', number: 5 },
    { resource: 'grain', number: 6 },
  ],
}

/**
 * The region draw stack = the remaining 2 cards of each resource (12 total).
 * Confirmed by the operator from the physical cards (typed directly).
 */
export const REGION_DRAW_STACK: RegionCard[] = [
  { resource: 'gold', number: 3 },
  { resource: 'gold', number: 2 },
  { resource: 'lumber', number: 4 },
  { resource: 'lumber', number: 6 },
  { resource: 'wool', number: 5 },
  { resource: 'wool', number: 6 },
  { resource: 'grain', number: 1 },
  { resource: 'grain', number: 3 },
  { resource: 'ore', number: 2 },
  { resource: 'ore', number: 4 },
  { resource: 'brick', number: 5 },
  { resource: 'brick', number: 1 },
]

/** At setup each region starts with 1 stored resource, EXCEPT the gold field (starts at 0). */
export function startingStored(resource: ResourceType): 0 | 1 {
  return resource === 'gold' ? 0 : 1
}
