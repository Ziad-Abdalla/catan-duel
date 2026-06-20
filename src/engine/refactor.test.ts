import { describe, it, expect } from 'vitest'
import { newGame } from './newGame'
import { applyAction, resourceTotalOf } from './actions'
import { CARDS, getCard } from '../data/cards'
import type { GameState } from '../types'

function fresh(): GameState {
  return newGame({ seed: 2026 })
}

/** Top every (non-empty) region up to 3 so any cost is affordable in a test. */
function topUp(s: GameState, player: 'p0' | 'p1'): GameState {
  return {
    ...s,
    players: {
      ...s.players,
      [player]: {
        ...s.players[player],
        regions: s.players[player].regions.map((r) => (r.empty ? r : { ...r, stored: 3 })),
      },
    },
  }
}

describe('build cost spending (assist, trust-based)', () => {
  it('buildPiece road spends the road cost (1 lumber + 2 brick) from regions by default', () => {
    let s0 = fresh()
    // road costs 2 brick; ensure the brick region holds enough first
    const bi = s0.players.p0.regions.findIndex((r) => r.resource === 'brick')
    s0 = applyAction(s0, { type: 'setStored', player: 'p0', regionIndex: bi, stored: 3 })
    const lumber0 = resourceTotalOf(s0.players.p0, 'lumber')
    const brick0 = resourceTotalOf(s0.players.p0, 'brick')
    expect(lumber0).toBeGreaterThan(0)
    expect(brick0).toBeGreaterThan(1)
    const s1 = applyAction(s0, { type: 'buildPiece', player: 'p0', piece: 'road' })
    expect(resourceTotalOf(s1.players.p0, 'lumber')).toBe(lumber0 - 1)
    expect(resourceTotalOf(s1.players.p0, 'brick')).toBe(brick0 - 2)
  })

  it('buildPiece with pay:false does NOT spend resources (manual override)', () => {
    const s0 = fresh()
    const lumber0 = resourceTotalOf(s0.players.p0, 'lumber')
    const s1 = applyAction(s0, { type: 'buildPiece', player: 'p0', piece: 'road', pay: false })
    expect(resourceTotalOf(s1.players.p0, 'lumber')).toBe(lumber0)
  })

  it('upgradeCity spends the city cost (grain + ore)', () => {
    let s = topUp(fresh(), 'p0')
    const grain0 = resourceTotalOf(s.players.p0, 'grain')
    const ore0 = resourceTotalOf(s.players.p0, 'ore')
    s = applyAction(s, { type: 'upgradeCity', player: 'p0', seat: 0 })
    expect(resourceTotalOf(s.players.p0, 'grain')).toBe(grain0 - 2)
    expect(resourceTotalOf(s.players.p0, 'ore')).toBe(ore0 - 3)
  })

  it('playCard spends the played card cost when it has one', () => {
    let s = topUp(fresh(), 'p0')
    const cardId = s.players.p0.hand.find((id) => (getCard(id)?.cost?.length ?? 0) > 0)
    expect(cardId).toBeTruthy()
    const cost = getCard(cardId!)!.cost!
    const before = new Map(cost.map((c) => [c.resource, resourceTotalOf(s.players.p0, c.resource)]))
    s = applyAction(s, { type: 'playCard', player: 'p0', cardId: cardId! })
    for (const c of cost) {
      expect(resourceTotalOf(s.players.p0, c.resource)).toBe((before.get(c.resource) ?? 0) - c.count)
    }
  })
})

describe('discard pile + card lifecycle', () => {
  it('newGame starts with an empty discard pile', () => {
    expect(fresh().discard).toEqual([])
  })

  it('discardCard from hand moves the card to the discard pile', () => {
    const s0 = fresh()
    const card = s0.players.p0.hand[0]
    const s1 = applyAction(s0, { type: 'discardCard', player: 'p0', from: 'hand', cardId: card })
    expect(s1.players.p0.hand).not.toContain(card)
    expect(s1.discard[s1.discard.length - 1]).toBe(card)
  })

  it('discardCard from placed (action card) removes it from play to the discard pile', () => {
    const s0 = fresh()
    const card = s0.players.p0.hand.find((id) => getCard(id)?.category === 'action') ?? s0.players.p0.hand[0]
    let s = applyAction(s0, { type: 'playCard', player: 'p0', cardId: card, slot: 'x', pay: false })
    const idx = s.players.p0.placed.findIndex((c) => c.cardId === card)
    s = applyAction(s, { type: 'discardCard', player: 'p0', from: 'placed', placedIndex: idx })
    expect(s.players.p0.placed.find((c) => c.cardId === card)).toBeUndefined()
    expect(s.discard).toContain(card)
  })

  it('discarding a face-up expansion card returns it to supply, not the discard pile', () => {
    const faceUp = CARDS.find((c) => c.tag === 'Face-up Expansion' && c.set !== 'base')
    expect(faceUp).toBeTruthy()
    let s = newGame({ seed: 2026, enabledSets: [faceUp!.set] })
    s = applyAction(s, { type: 'playCard', player: 'p0', cardId: faceUp!.id, slot: 'x', pay: false })
    const idx = s.players.p0.placed.findIndex((c) => c.cardId === faceUp!.id)
    s = applyAction(s, { type: 'discardCard', player: 'p0', from: 'placed', placedIndex: idx })
    expect(s.discard).not.toContain(faceUp!.id)
    expect(s.players.p0.placed.find((c) => c.cardId === faceUp!.id)).toBeUndefined()
  })

  it('removePlaced sends a building to the discard pile (not the hand)', () => {
    const s0 = fresh()
    const card = s0.players.p0.hand.find((id) => getCard(id)?.category === 'building') ?? s0.players.p0.hand[0]
    let s = applyAction(s0, { type: 'playCard', player: 'p0', cardId: card, slot: 's0-up', pay: false })
    const bIdx = s.players.p0.placed.findIndex((c) => c.cardId === card)
    s = applyAction(s, { type: 'removePlaced', player: 'p0', placedIndex: bIdx })
    expect(s.players.p0.hand).not.toContain(card)
    expect(s.discard).toContain(card)
  })
})

describe('configurable win threshold', () => {
  it('base game defaults to 7 VP', () => {
    expect(fresh().winThreshold).toBe(7)
  })
  it('a single theme set defaults to 12 VP', () => {
    expect(newGame({ seed: 1, enabledSets: ['gold'] }).winThreshold).toBe(12)
  })
  it('all three themes default to 13 VP (Duel of the Princes)', () => {
    expect(newGame({ seed: 1, enabledSets: ['gold', 'turmoil', 'progress'] }).winThreshold).toBe(13)
  })
  it('setWinThreshold changes the target and finalize marks eligibility', () => {
    let s = fresh()
    s = applyAction(s, { type: 'setWinThreshold', value: 3 })
    expect(s.winThreshold).toBe(3)
    s = applyAction(s, { type: 'adjustVP', player: 'p0', delta: 1 }) // start 2 VP + 1 = 3
    expect(s.eligible).toBe('p0')
    expect(s.winner).toBeUndefined() // eligibility is non-blocking; the vote concludes the game
  })
})

describe('action logging for the audit log', () => {
  it('buildPiece appends a log entry', () => {
    const s0 = fresh()
    const before = s0.log.length
    const s1 = applyAction(s0, { type: 'buildPiece', player: 'p0', piece: 'road' })
    expect(s1.log.length).toBe(before + 1)
    expect(s1.log[s1.log.length - 1].player).toBe('p0')
  })
  it('addResource logs the resource and delta', () => {
    const s0 = fresh()
    const before = s0.log.length
    const s1 = applyAction(s0, { type: 'addResource', player: 'p1', resource: 'ore', count: 2 })
    expect(s1.log.length).toBe(before + 1)
    expect(s1.log[s1.log.length - 1].text).toMatch(/ore/i)
  })
})
