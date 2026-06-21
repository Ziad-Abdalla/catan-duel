// The two dice. Production die = 1–6 (uniform). Event die = 6 physical faces over
// 5 symbols: the event-card "?" face appears twice; brigand/trade/celebration/
// plenty once each (4 black + 1 red, matching the official die).

import { rngDie, rngInt } from './rng'
import type { EventFace } from './state'

const EVENT_FACES: EventFace[] = ['event', 'event', 'brigand', 'trade', 'celebration', 'plenty']

export function rollProduction(rng: number): [number, number] {
  return rngDie(rng, 6)
}

export function rollEvent(rng: number): [EventFace, number] {
  const [i, s] = rngInt(rng, EVENT_FACES.length)
  return [EVENT_FACES[i], s]
}

export type { EventFace }
