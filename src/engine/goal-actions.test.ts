import { describe, it, expect } from 'vitest'
import { newGame } from './newGame'
import {
  applyAction,
  resourceTotal,
  resourceTotalOf,
  costOf,
  canAfford,
} from './actions'
import type { GameState } from '../types'

function fresh(): GameState {
  return newGame({ seed: 2026 })
}

const last = <T,>(a: readonly T[]): T => a[a.length - 1]

describe('resolveBrigand — the Brigand event (auto-applies + logs)', () => {
  it('a player over 7 resources loses ALL gold and wool; others untouched; richly logged', () => {
    let s = fresh()
    s = applyAction(s, { type: 'addResource', player: 'p0', resource: 'gold', count: 3 })
    s = applyAction(s, { type: 'addResource', player: 'p0', resource: 'wool', count: 2 })
    expect(resourceTotal(s.players.p0)).toBeGreaterThan(7)
    const p1Before = resourceTotal(s.players.p1)

    s = applyAction(s, { type: 'resolveBrigand' })

    expect(resourceTotalOf(s.players.p0, 'gold')).toBe(0)
    expect(resourceTotalOf(s.players.p0, 'wool')).toBe(0)
    // a non-targeted resource is left alone
    expect(resourceTotalOf(s.players.p0, 'lumber')).toBeGreaterThan(0)
    // the under-7 player is untouched
    expect(resourceTotal(s.players.p1)).toBe(p1Before)
    // log line matches the owner's requested shape
    const line = last(s.log)
    expect(line.text).toMatch(/Brigand/i)
    expect(line.text).toMatch(/gold/i)
    expect(line.text).toMatch(/wool/i)
  })

  it('when nobody is over 7, nothing changes and it says so', () => {
    let s = fresh()
    const before = JSON.stringify(s.players)
    s = applyAction(s, { type: 'resolveBrigand' })
    expect(JSON.stringify(s.players)).toBe(before)
    expect(last(s.log).text).toMatch(/Brigand/i)
  })
})

describe('movePlaced — relocate a placed piece without removing it', () => {
  it('changes the slot of a placed card and logs it', () => {
    let s = fresh()
    s = applyAction(s, { type: 'buildPiece', player: 'p0', piece: 'settlement', pay: false })
    const idx = s.players.p0.placed.length - 1
    s = applyAction(s, { type: 'movePlaced', player: 'p0', placedIndex: idx, slot: 's2-up' })
    expect(s.players.p0.placed[idx].slot).toBe('s2-up')
    expect(last(s.log).text).toMatch(/[Mm]oved/)
  })
})

describe('movePlaced — one card per site (BUG-4 guard)', () => {
  it('refuses to move a piece onto an already-occupied site', () => {
    let s = fresh()
    s = applyAction(s, { type: 'grantCard', player: 'p0', cardId: 'base-marketplace' })
    s = applyAction(s, { type: 'grantCard', player: 'p0', cardId: 'base-abbey' })
    s = applyAction(s, { type: 'playCard', player: 'p0', cardId: 'base-marketplace', slot: 's0-up', pay: false })
    s = applyAction(s, { type: 'playCard', player: 'p0', cardId: 'base-abbey', slot: 's0-down', pay: false })
    const ai = s.players.p0.placed.findIndex((p) => p.cardId === 'base-abbey')
    s = applyAction(s, { type: 'movePlaced', player: 'p0', placedIndex: ai, slot: 's0-up' }) // occupied → no-op
    expect(s.players.p0.placed[ai].slot).toBe('s0-down')
    s = applyAction(s, { type: 'movePlaced', player: 'p0', placedIndex: ai, slot: 's1-up' }) // empty → moves
    expect(s.players.p0.placed[ai].slot).toBe('s1-up')
  })
})

describe('stack manipulation — peek/take/put/shuffle (Tabletop-style)', () => {
  it('takeFromStack pulls a specific card into hand, preserving the rest', () => {
    let s = fresh()
    const stack0 = s.drawStacks[0]
    const target = stack0[2]
    const handLen = s.players.p0.hand.length
    s = applyAction(s, { type: 'takeFromStack', player: 'p0', stackIndex: 0, cardId: target })
    expect(s.players.p0.hand).toContain(target)
    expect(s.players.p0.hand.length).toBe(handLen + 1)
    expect(s.drawStacks[0].length).toBe(stack0.length - 1)
    expect(last(s.log).text).toMatch(/[Tt]ook/)
  })

  it('takeFromStack with no cardId takes the top card', () => {
    let s = fresh()
    const top = last(s.drawStacks[1])
    s = applyAction(s, { type: 'takeFromStack', player: 'p1', stackIndex: 1 })
    expect(s.players.p1.hand).toContain(top)
  })

  it('putToStack places a hand card on top or bottom', () => {
    let s = fresh()
    const card = last(s.drawStacks[0])
    s = applyAction(s, { type: 'takeFromStack', player: 'p0', stackIndex: 0 }) // card now in hand
    s = applyAction(s, { type: 'putToStack', player: 'p0', cardId: card, stackIndex: 2, position: 'bottom' })
    expect(s.drawStacks[2][0]).toBe(card)
    expect(s.players.p0.hand).not.toContain(card)
  })

  it('shuffleStack keeps the same multiset of cards (deterministic + logged)', () => {
    let s = fresh()
    const before = [...s.drawStacks[0]].sort()
    s = applyAction(s, { type: 'shuffleStack', stackIndex: 0 })
    expect([...s.drawStacks[0]].sort()).toEqual(before)
    expect(last(s.log).text).toMatch(/[Ss]huffle/)
  })
})

describe('cost helpers for manual-but-real payment', () => {
  it('costOf returns the printed cost of foundation pieces', () => {
    expect(costOf('base-road').length).toBeGreaterThan(0)
    expect(costOf('base-settlement').length).toBeGreaterThan(0)
  })

  it('canAfford reflects what the player is actually storing', () => {
    const s = fresh()
    expect(canAfford(s.players.p0, [{ resource: 'gold', count: 5 }])).toBe(false)
    expect(canAfford(s.players.p0, [{ resource: 'lumber', count: 1 }])).toBe(true)
  })
})

describe('comprehensive auto-logging', () => {
  it('logs dice rolls, production, transfers, token changes and turn ends', () => {
    let s = fresh()
    s = applyAction(s, { type: 'roll', production: 4, event: 'brigand' })
    expect(s.log.some((e) => /[Rr]oll/.test(e.text))).toBe(true)
    s = applyAction(s, { type: 'applyProduction' })
    expect(s.log.some((e) => /[Pp]roduction/.test(e.text))).toBe(true)
    s = applyAction(s, { type: 'transferResource', from: 'p1', to: 'p0', resource: 'ore', count: 1 })
    expect(s.log.some((e) => /ore/.test(e.text))).toBe(true)
    s = applyAction(s, { type: 'setToken', player: 'p0', token: 'hero' })
    expect(s.log.some((e) => /advantage|hero/i.test(e.text))).toBe(true)
    s = applyAction(s, { type: 'endTurn' })
    expect(s.log.some((e) => /turn/i.test(e.text))).toBe(true)
  })
})
