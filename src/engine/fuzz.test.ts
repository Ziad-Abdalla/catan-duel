import { describe, it, expect } from 'vitest'
import { newGame } from './newGame'
import { applyAction, mergeSnapshots, computeVP, type Action } from './actions'
import { makeRng, type Rng } from './rng'
import { EVENT_DIE_FACES } from './dice'
import { CARDS, getCard } from '../data/cards'
import { RESOURCES, type GameState, type PlayerId, type ResourceType, type Stat } from '../types'

const SLOTS = ['s0-up', 's0-down', 's1-up', 's1-down', 'site-x', undefined]
const STATS: Stat[] = ['strength', 'skill', 'commerce', 'progress']
const CARD_IDS = CARDS.map((c) => c.id)

function gen(s: GameState, rng: Rng): Action {
  const ri = (n: number) => Math.floor(rng() * n)
  const pick = <T,>(a: readonly T[]): T => a[ri(a.length)]
  const player = (): PlayerId => (rng() < 0.5 ? 'p0' : 'p1')
  const res = (): ResourceType => pick(RESOURCES)
  const p = player()
  const hand = s.players[p].hand
  const placed = s.players[p].placed
  const regions = s.players[p].regions

  const factories: Array<() => Action> = [
    () => ({ type: 'roll', production: 1 + ri(6), event: pick(EVENT_DIE_FACES) }),
    () => ({ type: 'applyProduction' }),
    () => ({ type: 'rotateRegion', player: p, regionIndex: ri(Math.max(1, regions.length)) }),
    () => ({ type: 'setStored', player: p, regionIndex: ri(Math.max(1, regions.length)), stored: ri(4) as 0 | 1 | 2 | 3 }),
    () => ({ type: 'drawRegion', player: p }),
    () => ({ type: 'drawToHand', player: p, stackIndex: ri(Math.max(1, s.drawStacks.length)) }),
    () => ({ type: 'playCard', player: p, cardId: hand.length ? pick(hand) : pick(CARD_IDS), slot: pick(SLOTS), pay: rng() < 0.5 }),
    () => ({ type: 'returnToHand', player: p, placedIndex: ri(Math.max(1, placed.length)) }),
    () =>
      hand.length
        ? { type: 'discardCard', player: p, from: 'hand', cardId: pick(hand) }
        : { type: 'discardCard', player: p, from: 'placed', placedIndex: ri(Math.max(1, placed.length)) },
    () => ({ type: 'discardCard', player: p, from: 'placed', placedIndex: ri(Math.max(1, placed.length)) }),
    () => (hand.length ? { type: 'discardToStack', player: p, cardId: pick(hand), stackIndex: ri(Math.max(1, s.drawStacks.length)) } : { type: 'drawEvent' }),
    () => ({ type: 'drawEvent' }),
    () => ({ type: 'upgradeCity', player: p, seat: ri(4), pay: rng() < 0.5 }),
    () => ({ type: 'expandSpine', player: p }),
    () => ({ type: 'buildPiece', player: p, piece: rng() < 0.5 ? 'road' : 'settlement', end: rng() < 0.5 ? 'left' : 'right', pay: rng() < 0.5 }),
    () => ({ type: 'placeLandscape', player: p, regionIndex: ri(Math.max(1, regions.length)) }),
    () => ({ type: 'removePlaced', player: p, placedIndex: ri(Math.max(1, placed.length)) }),
    () => ({ type: 'renamePlayer', player: p, name: `N${ri(99)}` }),
    () => ({ type: 'adjustVP', player: p, delta: ri(5) - 2 }),
    () => ({ type: 'setToken', player: rng() < 0.3 ? null : player(), token: rng() < 0.5 ? 'hero' : 'trade' }),
    () => ({ type: 'addResource', player: p, resource: res(), count: ri(7) - 3 }),
    () => ({ type: 'transferResource', from: pick(['p0', 'p1', 'bank'] as const), to: pick(['p0', 'p1', 'bank'] as const), resource: res(), count: ri(4) }),
    () => ({ type: 'adjustStat', player: p, stat: pick(STATS), delta: ri(5) - 2 }),
    () => ({ type: 'grantCard', player: p, cardId: pick(CARD_IDS), fromStack: rng() < 0.5 ? ri(s.drawStacks.length) : undefined }),
    () => ({ type: 'setDice', production: 1 + ri(6), event: pick(EVENT_DIE_FACES) }),
    () => ({ type: 'markUsed', player: p, key: `k${ri(4)}` }),
    () => ({ type: 'logNote', player: p, text: 'note' }),
    () => ({ type: 'setWinThreshold', value: 1 + ri(20) }),
    () => ({ type: 'nextPhase' }),
    () => ({ type: 'endTurn' }),
  ]
  return pick(factories)()
}

/** Invariants that must hold after EVERY action, no matter the combination. */
function checkInvariants(prev: GameState, next: GameState) {
  // seq strictly +1, seat versions monotonic
  expect(next.seq).toBe(prev.seq + 1)
  expect(next.seatSeq.p0).toBeGreaterThanOrEqual(prev.seatSeq.p0)
  expect(next.seatSeq.p1).toBeGreaterThanOrEqual(prev.seatSeq.p1)
  for (const id of ['p0', 'p1'] as PlayerId[]) {
    for (const r of next.players[id].regions) {
      expect(Number.isInteger(r.stored)).toBe(true)
      expect(r.stored).toBeGreaterThanOrEqual(0)
      expect(r.stored).toBeLessThanOrEqual(3)
    }
    // every card id parked in a zone resolves to a real card (nothing fabricated/garbled)
    for (const cid of next.players[id].hand) expect(getCard(cid)).toBeTruthy()
    for (const pc of next.players[id].placed) expect(getCard(pc.cardId)).toBeTruthy()
  }
  for (const cid of next.discard) expect(getCard(cid)).toBeTruthy()
  // a declared winner must actually meet the (current) threshold
  if (next.winner) expect(computeVP(next.players[next.winner])).toBeGreaterThanOrEqual(next.winThreshold)
}

describe('engine fuzz — every action combination keeps the state valid', () => {
  it('survives thousands of random action sequences with all invariants intact', () => {
    for (let seed = 0; seed < 60; seed++) {
      const rng = makeRng(1000 + seed * 7919)
      let s = newGame({ seed: seed + 1, enabledSets: seed % 2 ? ['gold', 'turmoil', 'progress'] : [] })
      for (let step = 0; step < 250; step++) {
        const action = gen(s, rng)
        const frozen = JSON.stringify(s)
        const next = applyAction(s, action)
        // purity: applyAction must never mutate its input
        expect(JSON.stringify(s)).toBe(frozen)
        checkInvariants(s, next)
        s = next
      }
    }
  })
})

/** Build a state by applying actions that only ever touch ONE seat. */
function evolveOneSeat(base: GameState, seat: PlayerId, rng: Rng, steps: number): GameState {
  const ri = (n: number) => Math.floor(rng() * n)
  const pick = <T,>(a: readonly T[]): T => a[ri(a.length)]
  let s = base
  for (let i = 0; i < steps; i++) {
    const regions = s.players[seat].regions
    const hand = s.players[seat].hand
    const choices: Array<() => Action> = [
      () => ({ type: 'rotateRegion', player: seat, regionIndex: ri(Math.max(1, regions.length)) }),
      () => ({ type: 'setStored', player: seat, regionIndex: ri(Math.max(1, regions.length)), stored: ri(4) as 0 | 1 | 2 | 3 }),
      () => ({ type: 'addResource', player: seat, resource: pick(RESOURCES), count: ri(5) - 2 }),
      () => ({ type: 'adjustStat', player: seat, stat: pick(STATS), delta: ri(3) - 1 }),
      () => ({ type: 'playCard', player: seat, cardId: hand.length ? pick(hand) : pick(CARD_IDS), slot: pick(SLOTS), pay: false }),
      () => ({ type: 'buildPiece', player: seat, piece: rng() < 0.5 ? 'road' : 'settlement', pay: rng() < 0.5 }),
    ]
    s = applyAction(s, pick(choices)())
  }
  return s
}

describe('merge fuzz — seat-authority join is convergent and conflict-free', () => {
  it('keeps each seat’s edits, and merge is commutative + idempotent', () => {
    for (let seed = 0; seed < 40; seed++) {
      const base = newGame({ seed: seed + 1 })
      const a = evolveOneSeat(base, 'p0', makeRng(11 + seed), 8 + (seed % 5))
      const b = evolveOneSeat(base, 'p1', makeRng(99 - seed), 8 + (seed % 7))

      const ab = mergeSnapshots(a, b)
      const ba = mergeSnapshots(b, a)

      // commutative: same result regardless of order
      expect(JSON.stringify(ab)).toBe(JSON.stringify(ba))
      // each seat's own edits are preserved (a owns p0, b owns p1)
      expect(JSON.stringify(ab.players.p0)).toBe(JSON.stringify(a.players.p0))
      expect(JSON.stringify(ab.players.p1)).toBe(JSON.stringify(b.players.p1))
      // idempotent / fixed point: re-merging a component changes nothing
      expect(JSON.stringify(mergeSnapshots(ab, a))).toBe(JSON.stringify(ab))
      expect(JSON.stringify(mergeSnapshots(ab, b))).toBe(JSON.stringify(ab))
      expect(JSON.stringify(mergeSnapshots(ab, ab))).toBe(JSON.stringify(ab))
    }
  })
})
