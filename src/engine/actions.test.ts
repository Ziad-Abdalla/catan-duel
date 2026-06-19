import { describe, it, expect } from 'vitest'
import { newGame } from './newGame'
import { applyAction, computeVP } from './actions'
import type { GameState } from '../types'

function fresh(): GameState {
  return newGame({ seed: 2026 })
}

describe('applyAction — purity & seq', () => {
  it('returns a new state and bumps seq, leaving the input untouched', () => {
    const s0 = fresh()
    const before = JSON.stringify(s0)
    const s1 = applyAction(s0, { type: 'rotateRegion', player: 'p0', regionIndex: 0 })
    expect(s1).not.toBe(s0)
    expect(s1.seq).toBe(s0.seq + 1)
    expect(JSON.stringify(s0)).toBe(before) // input not mutated
  })
})

describe('region rotation', () => {
  it('rotateRegion cycles stored 0→1→2→3→0', () => {
    let s = fresh()
    // gold field starts at 0
    const gi = s.players.p0.regions.findIndex((r) => r.resource === 'gold')
    const seq = [1, 2, 3, 0]
    for (const expected of seq) {
      s = applyAction(s, { type: 'rotateRegion', player: 'p0', regionIndex: gi })
      expect(s.players.p0.regions[gi].stored).toBe(expected)
    }
  })

  it('setStored sets an exact value', () => {
    const s = applyAction(fresh(), { type: 'setStored', player: 'p1', regionIndex: 0, stored: 3 })
    expect(s.players.p1.regions[0].stored).toBe(3)
  })
})

describe('applyProduction', () => {
  it('adds 1 to every matching region for BOTH players, capped at 3', () => {
    let s = fresh()
    // roll a 5 (ore for both players, number 5)
    s = applyAction(s, { type: 'roll', production: 5, event: 'plentiful-harvest' })
    // p0 ore starts at 1 → expect 2; bump p1 ore to 3 first to test the cap
    const p1ore = s.players.p1.regions.findIndex((r) => r.number === 5)
    s = applyAction(s, { type: 'setStored', player: 'p1', regionIndex: p1ore, stored: 3 })
    s = applyAction(s, { type: 'applyProduction' })
    const p0ore = s.players.p0.regions.find((r) => r.number === 5)!
    const p1oreR = s.players.p1.regions[p1ore]
    expect(p0ore.stored).toBe(2)
    expect(p1oreR.stored).toBe(3) // capped, not 4
  })
})

describe('drawing & playing cards', () => {
  it('drawToHand moves the top of a stack into the hand', () => {
    const s0 = fresh()
    const stack = 0
    const top = s0.drawStacks[stack][s0.drawStacks[stack].length - 1]
    const handLen = s0.players.p0.hand.length
    const s1 = applyAction(s0, { type: 'drawToHand', player: 'p0', stackIndex: stack })
    expect(s1.players.p0.hand).toHaveLength(handLen + 1)
    expect(s1.players.p0.hand[s1.players.p0.hand.length - 1]).toBe(top)
    expect(s1.drawStacks[stack]).toHaveLength(s0.drawStacks[stack].length - 1)
  })

  it('playCard moves a card from hand to placed', () => {
    const s0 = fresh()
    const card = s0.players.p0.hand[0]
    const s1 = applyAction(s0, { type: 'playCard', player: 'p0', cardId: card, slot: 'site-1' })
    expect(s1.players.p0.hand).not.toContain(card)
    expect(s1.players.p0.placed.some((p) => p.cardId === card && p.slot === 'site-1')).toBe(true)
  })

  it('returnToHand moves a placed card back to the hand', () => {
    let s = fresh()
    const card = s.players.p0.hand[0]
    s = applyAction(s, { type: 'playCard', player: 'p0', cardId: card, slot: 'x' })
    const idx = s.players.p0.placed.findIndex((p) => p.cardId === card)
    s = applyAction(s, { type: 'returnToHand', player: 'p0', placedIndex: idx })
    expect(s.players.p0.hand).toContain(card)
    expect(s.players.p0.placed.find((p) => p.cardId === card)).toBeUndefined()
  })

  it('discardToStack puts a hand card at the bottom of a stack', () => {
    const s0 = fresh()
    const card = s0.players.p0.hand[0]
    const s1 = applyAction(s0, { type: 'discardToStack', player: 'p0', cardId: card, stackIndex: 2 })
    expect(s1.players.p0.hand).not.toContain(card)
    expect(s1.drawStacks[2][0]).toBe(card) // bottom = index 0
  })

  it('drawRegion appends a region slot to the player from the region stack', () => {
    const s0 = fresh()
    const topId = s0.regionStack[s0.regionStack.length - 1]
    const s1 = applyAction(s0, { type: 'drawRegion', player: 'p0' })
    expect(s1.regionStack).toHaveLength(s0.regionStack.length - 1)
    expect(s1.players.p0.regions).toHaveLength(s0.players.p0.regions.length + 1)
    const added = s1.players.p0.regions[s1.players.p0.regions.length - 1]
    expect(topId).toContain(added.resource)
  })
})

describe('victory points & tokens', () => {
  it('computeVP sums settlements (1), cities (2) and building VPs plus vpAdjust', () => {
    const s = fresh()
    // two starting settlements = 2 VP
    expect(computeVP(s.players.p0)).toBe(2)
  })

  it('playing a city increases VP', () => {
    const s0 = fresh()
    const s1 = applyAction(s0, { type: 'playCard', player: 'p0', cardId: 'base-city', slot: 'c' })
    expect(s1.players.p0.victoryPoints).toBe(computeVP(s1.players.p0))
    expect(s1.players.p0.victoryPoints).toBe(4) // 2 settlements + 1 city(2)
  })

  it('adjustVP nudges the manual adjustment and recomputes', () => {
    const s = applyAction(fresh(), { type: 'adjustVP', player: 'p0', delta: 1 })
    expect(s.players.p0.victoryPoints).toBe(3)
  })

  it('reaching 7 VP marks eligibility (no forced freeze); a vote concludes the game', () => {
    let s = applyAction(fresh(), { type: 'adjustVP', player: 'p1', delta: 5 })
    expect(s.players.p1.victoryPoints).toBe(7)
    expect(s.eligible).toBe('p1')
    expect(s.winner).toBeUndefined() // not auto-won
    expect(s.phase).not.toBe('gameover') // not frozen
    // vote-to-end: p1 claims, p0 agrees → game concludes
    s = applyAction(s, { type: 'claimVictory', player: 'p1' })
    s = applyAction(s, { type: 'agreeVictory', player: 'p0' })
    expect(s.winner).toBe('p1')
    expect(s.phase).toBe('gameover')
  })

  it('setToken assigns an advantage to one player and clears the other', () => {
    let s = applyAction(fresh(), { type: 'setToken', player: 'p0', token: 'hero' })
    expect(s.players.p0.hasHeroToken).toBe(true)
    expect(s.players.p1.hasHeroToken).toBe(false)
    s = applyAction(s, { type: 'setToken', player: 'p1', token: 'hero' })
    expect(s.players.p0.hasHeroToken).toBe(false)
    expect(s.players.p1.hasHeroToken).toBe(true)
    s = applyAction(s, { type: 'setToken', player: null, token: 'hero' })
    expect(s.players.p0.hasHeroToken).toBe(false)
    expect(s.players.p1.hasHeroToken).toBe(false)
  })
})

describe('spine: city upgrade & expansion', () => {
  it('upgradeCity turns a settlement into a city in place, keeping its slot, and bumps VP', () => {
    const s0 = fresh()
    const seat0 = s0.players.p0.placed.filter((c) => c.cardId === 'base-settlement')[0]
    const s1 = applyAction(s0, { type: 'upgradeCity', player: 'p0', seat: 0 })
    const cities = s1.players.p0.placed.filter((c) => c.cardId === 'base-city')
    expect(cities).toHaveLength(1)
    expect(cities[0].slot).toBe(seat0.slot) // same board position
    expect(s1.players.p0.placed.filter((c) => c.cardId === 'base-settlement')).toHaveLength(1)
    expect(s1.players.p0.victoryPoints).toBe(3) // settlement(1) + city(2)
  })

  it('expandSpine adds a settlement + road and draws 2 regions (1 top, 1 bottom)', () => {
    const s0 = fresh()
    const beforeRegions = s0.players.p0.regions.length // 6
    const beforeStack = s0.regionStack.length // 12
    const topId = s0.regionStack[s0.regionStack.length - 1]
    const botId = s0.regionStack[s0.regionStack.length - 2]

    const s1 = applyAction(s0, { type: 'expandSpine', player: 'p0' })

    expect(s1.players.p0.placed.filter((c) => c.cardId === 'base-settlement')).toHaveLength(3)
    expect(s1.players.p0.placed.filter((c) => c.cardId === 'base-road')).toHaveLength(2)
    expect(s1.regionStack).toHaveLength(beforeStack - 2)
    expect(s1.players.p0.regions).toHaveLength(beforeRegions + 2)

    // existing top regions (0,1,2) unchanged; new top region inserted at index 3
    expect(s1.players.p0.regions.slice(0, 3)).toEqual(s0.players.p0.regions.slice(0, 3))
    expect(s1.players.p0.regions[3].cardId).toBe(topId)
    // old bottom regions shifted to 4,5,6; new bottom region appended last
    expect(s1.players.p0.regions.slice(4, 7)).toEqual(s0.players.p0.regions.slice(3, 6))
    expect(s1.players.p0.regions[7].cardId).toBe(botId)
  })

  it('expandSpine is a no-op when the region stack is short', () => {
    let s = fresh()
    s = { ...s, regionStack: [s.regionStack[0]] } // only 1 left
    const out = applyAction(s, { type: 'expandSpine', player: 'p0' })
    expect(out.players.p0.regions).toHaveLength(s.players.p0.regions.length)
    expect(out.players.p0.placed).toEqual(s.players.p0.placed)
  })

  it('buildPiece road appends one road and leaves regions untouched', () => {
    const s0 = fresh()
    const roadsBefore = s0.players.p0.placed.filter((c) => c.cardId === 'base-road').length
    const s1 = applyAction(s0, { type: 'buildPiece', player: 'p0', piece: 'road' })
    expect(s1.players.p0.placed.filter((c) => c.cardId === 'base-road')).toHaveLength(roadsBefore + 1)
    expect(s1.players.p0.regions).toHaveLength(s0.players.p0.regions.length)
  })

  it('buildPiece settlement adds a settlement and 2 OPEN landscape slots (no auto-draw)', () => {
    const s0 = fresh()
    const N = s0.players.p0.placed.filter((c) => c.cardId === 'base-settlement').length // 2
    const beforeRegions = s0.players.p0.regions.length // 6

    const s1 = applyAction(s0, { type: 'buildPiece', player: 'p0', piece: 'settlement' })

    expect(s1.players.p0.placed.filter((c) => c.cardId === 'base-settlement')).toHaveLength(N + 1)
    expect(s1.regionStack).toHaveLength(s0.regionStack.length) // landscapes NOT auto-drawn
    expect(s1.players.p0.regions).toHaveLength(beforeRegions + 2)
    expect(s1.players.p0.regions[N + 1].empty).toBe(true) // new top slot is open
    expect(s1.players.p0.regions[s1.players.p0.regions.length - 1].empty).toBe(true) // new bottom slot is open
  })

  it('placeLandscape fills an open slot from the region stack', () => {
    let s = applyAction(fresh(), { type: 'buildPiece', player: 'p0', piece: 'settlement' })
    const openIdx = s.players.p0.regions.findIndex((r) => r.empty)
    const topId = s.regionStack[s.regionStack.length - 1]
    s = applyAction(s, { type: 'placeLandscape', player: 'p0', regionIndex: openIdx })
    expect(s.players.p0.regions[openIdx].empty).toBeFalsy()
    expect(s.players.p0.regions[openIdx].cardId).toBe(topId)
    expect(s.regionStack).toHaveLength(11) // one drawn
  })

  it('removePlaced sends a building to the discard pile and clears a road', () => {
    const s0 = fresh()
    const card = s0.players.p0.hand[0]
    let s = applyAction(s0, { type: 'playCard', player: 'p0', cardId: card, slot: 's0-up', pay: false })
    const bIdx = s.players.p0.placed.findIndex((c) => c.cardId === card)
    s = applyAction(s, { type: 'removePlaced', player: 'p0', placedIndex: bIdx })
    expect(s.players.p0.hand).not.toContain(card) // no longer bounces to hand
    expect(s.discard).toContain(card) // removed building goes to the discard pile
    const roadIdx = s.players.p0.placed.findIndex((c) => c.cardId === 'base-road')
    const roadsBefore = s.players.p0.placed.filter((c) => c.cardId === 'base-road').length
    s = applyAction(s, { type: 'removePlaced', player: 'p0', placedIndex: roadIdx })
    expect(s.players.p0.placed.filter((c) => c.cardId === 'base-road')).toHaveLength(roadsBefore - 1)
  })

  it('buildPiece settlement to the LEFT prepends it and shifts existing building slots', () => {
    const s0 = fresh()
    const buildingId = s0.players.p0.hand[0]
    const s1 = applyAction(s0, { type: 'playCard', player: 'p0', cardId: buildingId, slot: 's0-up' })
    const settlesBefore = s1.players.p0.placed.filter((c) => c.cardId === 'base-settlement').length

    const s2 = applyAction(s1, { type: 'buildPiece', player: 'p0', piece: 'settlement', end: 'left' })

    // a new settlement was added
    expect(s2.players.p0.placed.filter((c) => c.cardId === 'base-settlement')).toHaveLength(settlesBefore + 1)
    // the building that was on seat 0 is now on seat 1 (slots shifted by the prepend)
    const b = s2.players.p0.placed.find((c) => c.cardId === buildingId)
    expect(b?.slot).toBe('s1-up')
    // a top region was prepended at index 0
    expect(s2.players.p0.regions.length).toBe(s1.players.p0.regions.length + 2)
  })

  it('buildPiece settlement adds open slots even when the region stack is empty', () => {
    const s0 = { ...fresh(), regionStack: [] as string[] }
    const N = s0.players.p0.placed.filter((c) => c.cardId === 'base-settlement').length
    const s1 = applyAction(s0, { type: 'buildPiece', player: 'p0', piece: 'settlement' })
    expect(s1.players.p0.placed.filter((c) => c.cardId === 'base-settlement')).toHaveLength(N + 1)
    expect(s1.players.p0.regions).toHaveLength(s0.players.p0.regions.length + 2) // 2 open slots
  })
})

describe('misc', () => {
  it('renamePlayer updates the name', () => {
    const s = applyAction(fresh(), { type: 'renamePlayer', player: 'p0', name: 'Ziad' })
    expect(s.players.p0.name).toBe('Ziad')
  })

  it('Yule starts 4th from the bottom of the event deck', () => {
    const s = fresh()
    expect(s.eventDeck[3]).toBe('base-yule')
  })

  it('drawing Yule reshuffles the event deck and re-seats Yule 4th from the bottom', () => {
    let s = fresh()
    // force Yule to the top so the next drawEvent pulls it
    const deck = s.eventDeck.filter((id) => id !== 'base-yule')
    s = { ...s, eventDeck: [...deck, 'base-yule'] }
    const before = s.eventDeck.length
    s = applyAction(s, { type: 'drawEvent' })
    expect(s.eventDeck).toHaveLength(before)
    expect(s.eventDeck[3]).toBe('base-yule') // re-seated 4th from the bottom
  })
})

describe('card sets', () => {
  it('base game uses only base cards across the draw stacks', () => {
    const s = newGame({ seed: 7 })
    expect(s.enabledSets).toEqual(['base'])
    const ids = s.drawStacks.flat().concat(s.players.p0.hand, s.players.p1.hand)
    expect(ids.every((id) => id.startsWith('base-'))).toBe(true)
  })

  it('enabling eras folds their cards into the decks', () => {
    const s = newGame({ seed: 7, enabledSets: ['gold', 'progress'] })
    expect(s.enabledSets).toEqual(['base', 'gold', 'progress'])
    const ids = s.drawStacks.flat()
    expect(ids.some((id) => id.startsWith('gold-'))).toBe(true)
    expect(ids.some((id) => id.startsWith('progress-'))).toBe(true)
    expect(ids.some((id) => id.startsWith('turmoil-'))).toBe(false) // not enabled
  })
})

describe('phase & turn flow', () => {
  it('roll records the dice and advances roll→action', () => {
    const s = applyAction(fresh(), { type: 'roll', production: 3, event: 'brigand' })
    expect(s.lastRoll).toEqual({ production: 3, event: 'brigand' })
    expect(s.phase).toBe('action')
  })

  it('nextPhase walks action→replenish→exchange', () => {
    let s = applyAction(fresh(), { type: 'roll', production: 1, event: 'trade' })
    expect(s.phase).toBe('action')
    s = applyAction(s, { type: 'nextPhase' })
    expect(s.phase).toBe('replenish')
    s = applyAction(s, { type: 'nextPhase' })
    expect(s.phase).toBe('exchange')
  })

  it('endTurn flips the active player, clears the roll and returns to the roll phase', () => {
    let s = applyAction(fresh(), { type: 'roll', production: 2, event: 'celebration' })
    expect(s.activePlayer).toBe('p0')
    s = applyAction(s, { type: 'endTurn' })
    expect(s.activePlayer).toBe('p1')
    expect(s.phase).toBe('roll')
    expect(s.lastRoll).toBeUndefined()
    expect(s.turn).toBe(2)
  })
})
