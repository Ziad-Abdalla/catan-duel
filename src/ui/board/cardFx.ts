// Card → visual effect GROUP. The thematic SOUND for a card already lives in
// audio/cardSound.ts (cardSfx); this adds the matching ANIMATION class so each kind
// of card also gets a fitting flourish when it lands — buildings rise, ships ride a
// swell, heroes flash, attacks shudder, neutral actions shimmer. Era tints the flavor.
//
// Derived purely from card data (category / tag / requirement / era) — no per-id table.

import { getCard } from '../../data/cards'
import { cardSfx } from '../../audio/cardSound'
import type { Card } from '../../types'

export type FxGroup =
  | 'building' // settlement-level building (village)
  | 'city-building' // a building that requires a city (grander rise)
  | 'hero' // a hero unit
  | 'ship' // a trade/settler ship → water swell
  | 'unit' // any other unit
  | 'attack' // an aggressive action (steal/raid)
  | 'action' // a neutral action
  | 'event' // an event card/face
  | 'region' // a landscape / spine piece

const lc = (s?: string) => (s ?? '').toLowerCase()

function classify(card: Card): FxGroup {
  const tag = lc(card.tag)
  const name = lc(card.name)
  switch (card.category) {
    case 'region':
    case 'settlement':
    case 'city':
    case 'road':
      return 'region'
    case 'event':
      return 'event'
    case 'building':
      return lc(card.values?.requires).includes('city') ? 'city-building' : 'building'
    case 'action':
      return tag.includes('attack') ? 'attack' : 'action'
    case 'hero-or-unit':
      if (tag.includes('ship') || name.includes('ship')) return 'ship'
      if (tag.includes('hero') || (card.values?.strength != null && card.values?.skill != null)) return 'hero'
      return 'unit'
    default:
      return 'action'
  }
}

export interface CardFx {
  group: FxGroup
  /** CSS flourish class for the placed element (see cardfx.css). */
  anim: string
  /** era, so the flourish can be tinted per set via a data-era attribute. */
  era: string
}

export function cardFx(cardId: string): CardFx {
  const card = getCard(cardId)
  if (!card) return { group: 'action', anim: 'fx-action', era: 'base' }
  const group = classify(card)
  return { group, anim: `fx-${group}`, era: card.set }
}

// Re-exported so callers have one import for both the sound and the look of a card.
export { cardSfx }
