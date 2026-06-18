import type { GameState, PlayerId, PlayerState, RegionSlot, SetId } from '../types'
import { CARDS } from '../data/cards'
import { STARTING_PRINCIPALITIES, REGION_DRAW_STACK, startingStored } from '../data/setup'
import { makeRng, shuffle, type Rng } from './rng'
import { seatYule } from './actions'

/** Expand the enabled sets' drawable cards (buildings, units/heroes, actions) into a flat id list by copy count. */
function buildDrawDeck(sets: SetId[]): string[] {
  const out: string[] = []
  for (const c of CARDS) {
    if (!sets.includes(c.set)) continue
    if (c.category === 'building' || c.category === 'hero-or-unit' || c.category === 'action') {
      for (let i = 0; i < c.copies; i++) out.push(c.id)
    }
  }
  return out
}

function buildEventDeck(sets: SetId[]): string[] {
  const out: string[] = []
  for (const c of CARDS) {
    if (sets.includes(c.set) && c.category === 'event') {
      for (let i = 0; i < c.copies; i++) out.push(c.id)
    }
  }
  return out
}

function makePlayer(id: PlayerId, name: string): PlayerState {
  const regions: RegionSlot[] = STARTING_PRINCIPALITIES[id].map((r) => ({
    cardId: `region-${r.resource}-${r.number}`,
    resource: r.resource,
    number: r.number,
    stored: startingStored(r.resource),
  }))
  return {
    id,
    name,
    hand: [],
    regions,
    // start: 2 settlements + 1 road already in play
    placed: [
      { cardId: 'base-settlement', slot: 'settle-0' },
      { cardId: 'base-settlement', slot: 'settle-1' },
      { cardId: 'base-road', slot: 'road-1' }, // road in the middle slot, between the two settlements
    ],
    victoryPoints: 2, // 2 settlements × 1 VP (= computeVP at start)
    vpAdjust: 0,
    hasHeroToken: false,
    hasTradeToken: false,
    statAdjust: {},
    usedThisTurn: [],
  }
}

export interface NewGameOptions {
  seed: number
  p0Name?: string
  p1Name?: string
  /** Card sets in play. 'base' is always included; the three eras are optional. */
  enabledSets?: SetId[]
}

/**
 * Build the initial game state. Base set ("The First Catanians") by default;
 * enabling Era of Gold / Turmoil / Progress folds those cards into the decks.
 * Deterministic from `seed` so both online clients derive identical decks.
 */
export function newGame({ seed, p0Name = 'Player 1', p1Name = 'Player 2', enabledSets }: NewGameOptions): GameState {
  const rng: Rng = makeRng(seed)
  const sets: SetId[] = Array.from(new Set<SetId>(['base', ...(enabledSets ?? [])]))

  const players: Record<PlayerId, PlayerState> = {
    p0: makePlayer('p0', p0Name),
    p1: makePlayer('p1', p1Name),
  }

  // Base cards spread round-robin into 4 stacks (red backs); each enabled era
  // gets its OWN stack (its themed back) so the deck wall reads by set.
  const baseDeck = shuffle(buildDrawDeck(['base']), rng)
  const drawStacks: string[][] = [[], [], [], []]
  baseDeck.forEach((id, i) => drawStacks[i % 4].push(id))
  // each enabled era is split into TWO themed draw stacks
  for (const era of sets.filter((s) => s !== 'base')) {
    const eraDeck = shuffle(buildDrawDeck([era]), rng)
    const half = Math.ceil(eraDeck.length / 2)
    drawStacks.push(eraDeck.slice(0, half), eraDeck.slice(half))
  }

  // each player draws a starting hand of 3 (from stack tops, round-robin)
  for (let n = 0; n < 3; n++) {
    for (const pid of ['p0', 'p1'] as PlayerId[]) {
      const stack = drawStacks[(n + (pid === 'p1' ? 2 : 0)) % 4]
      const card = stack.pop()
      if (card) players[pid].hand.push(card)
    }
  }

  const regionStack = shuffle(
    REGION_DRAW_STACK.map((r) => `region-${r.resource}-${r.number}`),
    rng,
  )
  const eventDeck = seatYule(shuffle(buildEventDeck(sets), rng)) // Yule starts 4th from the bottom

  const eras = sets.filter((s) => s !== 'base')
  return {
    gameId: `g${seed}`,
    seq: 0,
    turn: 1,
    activePlayer: 'p0',
    phase: 'roll',
    players,
    drawStacks,
    regionStack,
    eventDeck,
    log: [
      {
        turn: 1,
        player: 'p0',
        text: eras.length ? `Game begins — with ${eras.join(', ')}.` : 'The First Catanians — game begins.',
      },
    ],
    enabledSets: sets,
  }
}
