import type { Rng } from './rng'
import { rollDie } from './rng'

/**
 * The event die. 6 physical faces, 5 distinct symbols (the Event-Card "?" is on 2 faces).
 * Brigand resolves BEFORE production; the rest AFTER. Each affects none/one/both players.
 */
export type EventFace = 'event-card' | 'plentiful-harvest' | 'celebration' | 'trade' | 'brigand'

export const EVENT_DIE_FACES: EventFace[] = [
  'event-card',
  'event-card',
  'plentiful-harvest',
  'celebration',
  'trade',
  'brigand',
]

export const EVENT_TEXT: Record<EventFace, string> = {
  brigand:
    'Brigand Attack: A player who has more than 7 resources loses all their gold and wool supplies.',
  trade: 'Trade: If you have the trade advantage, you receive 1 resource of your choice from your opponent.',
  celebration:
    'Celebration: If one of the players has the most skill points, they alone receive 1 resource of their choice. Otherwise, each player receives 1 resource of their choice.',
  'plentiful-harvest': 'Plentiful Harvest: Each player receives 1 resource of their choice.',
  'event-card': 'Event Card: The player who rolled draws the topmost event card and resolves it.',
}

export interface DiceRoll {
  production: number // 1–6
  event: EventFace
}

export function rollDice(rng: Rng): DiceRoll {
  const production = rollDie(rng, 6)
  const event = EVENT_DIE_FACES[Math.floor(rng() * EVENT_DIE_FACES.length)]
  return { production, event }
}
