// Initial-state construction for the formal sim. Imports the operator-verified
// starting layout + region stack from src/data/setup (static data — allowed; the
// isolation rule only forbids importing engine/store/ui). Deck assembly is seeded.

import { STARTING_PRINCIPALITIES, REGION_DRAW_STACK, startingStored } from '../../data/setup'
import { cardsOfSet, type SetId } from '../cards/data'
import { rngShuffle } from './rng'
import {
  type GameState, type Player, type Region, type Seat, type Mode, type Center,
  SEATS, CENTER_SLOTS,
} from './state'
import { seatYule } from './events'

const WIN_THRESHOLD: Record<Mode, number> = {
  base: 7, gold: 12, turmoil: 12, progress: 12, duel: 13,
  intrigue: 12, merchants: 12, barbarians: 13, explorers: 12, sages: 12, prosperity: 12,
}

const CENTER_A = new Set(['lumber', 'brick', 'wool']) // classic wood/brick/sheep settlement
// CENTER_B = grain/ore/gold

/** Drawable expansion cards of a set (everything except spine: region/road/settlement/city). */
function drawableOf(set: SetId): string[] {
  const out: string[] = []
  for (const c of cardsOfSet(set)) {
    if (c.category === 'region' || c.category === 'road' || c.category === 'settlement' || c.category === 'city') continue
    if (c.category === 'event') continue
    for (let i = 0; i < c.copies; i++) out.push(c.id)
  }
  return out
}

function eventDeckOf(set: SetId): string[] {
  const out: string[] = []
  for (const c of cardsOfSet(set)) {
    if (c.category !== 'event') continue
    for (let i = 0; i < c.copies; i++) out.push(c.id)
  }
  return out
}

function makePlayer(seat: Seat, name: string): Player {
  const cards = STARTING_PRINCIPALITIES[seat]
  const regions: Region[] = cards.map((rc) => ({
    resource: rc.resource,
    number: rc.number ?? 0,
    stored: startingStored(rc.resource),
  }))
  const aIdx: number[] = []
  const bIdx: number[] = []
  regions.forEach((r, i) => (CENTER_A.has(r.resource) ? aIdx : bIdx).push(i))
  const centers: Center[] = [
    { kind: 'settlement', regions: aIdx, slots: Array(CENTER_SLOTS).fill(null) },
    { kind: 'settlement', regions: bIdx, slots: Array(CENTER_SLOTS).fill(null) },
  ]
  return {
    id: seat, name, regions, centers,
    pendingRoads: 0, hand: [], hasHeroToken: false, hasTradeToken: false, used: [],
  }
}

export interface SetupOpts {
  mode?: Mode
  seed?: number
  names?: Record<Seat, string>
}

export function setupGame(opts: SetupOpts = {}): GameState {
  const mode: Mode = opts.mode ?? 'base'
  const themeSet = mode === 'duel' ? 'duel' : mode
  let rng = (opts.seed ?? 1) >>> 0

  // expansion draw stacks: base always, plus the theme set's cards for themed modes
  let pool = drawableOf('base')
  let events = eventDeckOf('base')
  if (mode !== 'base' && mode !== 'duel') {
    pool = pool.concat(drawableOf(mode as SetId))
    events = events.concat(eventDeckOf(mode as SetId))
  } else if (mode === 'duel') {
    for (const s of ['gold', 'turmoil', 'progress'] as SetId[]) {
      pool = pool.concat(drawableOf(s))
      events = events.concat(eventDeckOf(s))
    }
  }

  let shuffled: string[]
  ;[shuffled, rng] = rngShuffle(pool, rng)
  // split into 3 roughly-equal face-down stacks (intro = 3×12; themed modes scale up)
  const nStacks = 3
  const drawStacks: string[][] = Array.from({ length: nStacks }, () => [])
  shuffled.forEach((id, i) => drawStacks[i % nStacks].push(id))

  let regionStack: { resource: import('./state').Resource; number: number }[]
  ;[regionStack, rng] = rngShuffle(
    REGION_DRAW_STACK.map((r) => ({ resource: r.resource, number: r.number ?? 0 })),
    rng,
  )

  let eventDeck: string[]
  ;[eventDeck, rng] = rngShuffle(events, rng)
  eventDeck = seatYule(eventDeck)

  const names = opts.names ?? { p0: 'Bot 0', p1: 'Bot 1' }
  const players: Record<Seat, Player> = {
    p0: makePlayer('p0', names.p0),
    p1: makePlayer('p1', names.p1),
  }

  // starting hands: 3 each, dealt round-robin from the stack tops
  for (let k = 0; k < 3; k++) {
    for (const seat of SEATS) {
      const st = drawStacks[k % nStacks]
      const id = st.pop()
      if (id) players[seat].hand.push(id)
    }
  }

  return {
    mode, themeSet, winThreshold: WIN_THRESHOLD[mode],
    turn: 1, active: 'p0', phase: 'preroll',
    players, drawStacks, regionStack, eventDeck, discard: [], supply: {},
    rng, winner: null,
  }
}
