// Read-only static-data view of src/data/cards.json for the AI layer.
// We import the corpus for printed facts (cost / values / category / region info)
// and attach executable behaviour in the CardDef registry (./index.ts).
// cards.json is NEVER modified by the AI feature — it stays the single source of
// truth for the live game.

import cardsRaw from '../../data/cards.json'
import type { Resource } from '../sim/state'

export type Category =
  | 'region' | 'road' | 'settlement' | 'city'
  | 'building' | 'action' | 'event' | 'hero-or-unit'

export type SetId = 'base' | 'gold' | 'turmoil' | 'progress'

export interface RawValues {
  victory_points?: number
  strength?: number
  skill?: number
  commerce?: number
  progress?: number
  region_resource?: Resource
  region_number?: number
  requires?: string
  note?: string
  other?: string
}

export interface RawCard {
  id: string
  set: SetId
  category: Category
  name: string
  tag?: string
  cost?: { resource: Resource; count: number }[]
  values?: RawValues
  rules_text?: string
  copies: number
  region_resource?: Resource
  region_number?: number | null
  confidence?: 'high' | 'medium' | 'low'
  unclear?: string[]
}

const ALL = cardsRaw as unknown as RawCard[]
const BY_ID = new Map<string, RawCard>(ALL.map((c) => [c.id, c]))

export function rawCard(id: string): RawCard | undefined {
  return BY_ID.get(id)
}

/** Throwing accessor — used where a missing card id is a programming error. */
export function mustCard(id: string): RawCard {
  const c = BY_ID.get(id)
  if (!c) throw new Error(`unknown card id: ${id}`)
  return c
}

export function cardsOfSet(set: SetId): RawCard[] {
  return ALL.filter((c) => c.set === set)
}

export function cardName(id: string): string {
  return BY_ID.get(id)?.name ?? id
}

export function cardCategory(id: string): Category | undefined {
  return BY_ID.get(id)?.category
}

/** Printed resource cost as a partial resource→count map (empty if free). */
export function cardCost(id: string): Partial<Record<Resource, number>> {
  const out: Partial<Record<Resource, number>> = {}
  for (const c of BY_ID.get(id)?.cost ?? []) out[c.resource] = (out[c.resource] ?? 0) + c.count
  return out
}

export function cardValues(id: string): RawValues {
  return BY_ID.get(id)?.values ?? {}
}
