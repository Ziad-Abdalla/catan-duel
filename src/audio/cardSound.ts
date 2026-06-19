import type { EventFace } from '../engine/dice'
import { getCard } from '../data/cards'
import type { Sfx } from './sfx'

/**
 * Pick a thematic SFX for a card by its category / tag / printed text, so every card
 * that hits the table makes a fitting sound — ships splash, pirates & brigands menace,
 * heroes get a flourish, festivals jingle, inventions shimmer, harvests rustle. Purely
 * derived from the card data (no per-id table to maintain), with a sweep fallback.
 */
export function cardSfx(cardId: string): Sfx {
  const c = getCard(cardId)
  if (!c) return 'sweep'
  if (c.category === 'settlement' || c.category === 'city' || c.category === 'road') return 'build'
  const text = `${c.name} ${c.rules_text ?? ''} ${c.flavor_text ?? ''}`.toLowerCase()
  // order matters — a pirate ship is menacing, not soothing
  if (/pirate|brigand|raid|plunder|arson|archer|traitor|riot|feud|robber|plague|terror|sink/.test(text)) return 'menace'
  if (/ship|harbou?r|fleet|sail|voyage|\bsea\b|wharf|dock|\bboat|merchant caravan/.test(text)) return 'water'
  if (c.category === 'hero-or-unit' || /hero|knight|scout|herald|sentinel|cannoneer|warrior|ambassador|guard|preacher/.test(text)) return 'hero'
  if (/festival|celebrat|abbey|chapel|church|\bhall\b|monk|yule|\bfair|tavern|brew|tithe/.test(text)) return 'festival'
  if (/invent|universit|library|scholar|crane|alchem|pharmac|doctor|mineral|three.?field|parliament|town hall|innovation/.test(text)) return 'magic'
  if (/harvest|grain|wheat|\bmill\b|\bfield|granary|plenty|\bfarm|storehouse|weaver/.test(text)) return 'harvest'
  if (/gold|coin|mint|money|goldsmith|toll|trade|commerce|market/.test(text)) return 'coin'
  if (c.category === 'action') return 'action' // one-shot action cards get a short parchment chime
  if (c.category === 'building' || c.tag === 'Face-up Expansion') return 'build'
  return 'sweep'
}

const EVENT_SFX: Record<EventFace, Sfx> = {
  brigand: 'menace',
  trade: 'coin',
  celebration: 'festival',
  'plentiful-harvest': 'harvest',
  'event-card': 'flip',
}

/** The sound for an event-die face (used when the roll settles). */
export function eventSfx(face: EventFace): Sfx {
  return EVENT_SFX[face]
}
