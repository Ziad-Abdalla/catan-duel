import type { Card, ResourceType, SetId } from '../types'
import raw from './cards.json'

/** The full card corpus (base + Era of Gold/Turmoil/Progress), read-only. */
export const CARDS: Card[] = raw as Card[]

const byId = new Map(CARDS.map((c) => [c.id, c]))

export function getCard(id: string): Card | undefined {
  return byId.get(id)
}

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

/** Card art path (Vite resolves at build time via import.meta.glob). */
const artModules = import.meta.glob('../assets/cards/*.webp', {
  eager: true,
  import: 'default',
}) as Record<string, string>

export function cardArt(id: string): string | undefined {
  const key = `../assets/cards/${id}.webp`
  return artModules[key]
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
