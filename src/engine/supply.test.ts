import { describe, it, expect } from 'vitest'
import { newGame } from './newGame'
import { applyAction, mergeSnapshots } from './actions'
import { getCard } from '../data/cards'

const FE = 'gold-merchant-guild' // a Face-up Expansion (2 copies)
const ALL_FE = ['gold-merchant-guild', 'turmoil-hedge-tavern-1x', 'progress-university']

const freshGold = () => newGame({ seed: 7, enabledSets: ['gold'] })

describe('Face-up Expansion supply — used buildings must leave the public pile (P0)', () => {
  it('Face-up Expansions are NEVER seeded into the public draw stacks', () => {
    const s = newGame({ seed: 3, enabledSets: ['gold', 'turmoil', 'progress'] })
    const inStacks = s.drawStacks.flat()
    for (const id of ALL_FE) expect(inStacks).not.toContain(id)
  })

  it('initialises a finite supply counter from the card copies', () => {
    const s = freshGold()
    expect(s.supply[FE]).toBe(getCard(FE)!.copies)
  })

  it('building one decrements the supply and never duplicates into a pile', () => {
    let s = freshGold()
    s = applyAction(s, { type: 'playCard', player: 'p0', cardId: FE, slot: 's0-up', pay: false })
    const placed = s.players.p0.placed.filter((p) => p.cardId === FE).length
    expect(placed).toBe(1)
    expect(s.supply[FE]).toBe(1)
    expect(s.drawStacks.flat()).not.toContain(FE)
    // invariant: placed copies + supply == total copies (none leak)
    expect(placed + s.supply[FE]).toBe(getCard(FE)!.copies)
  })

  it('removing a built Face-up Expansion returns it to the supply', () => {
    let s = freshGold()
    s = applyAction(s, { type: 'playCard', player: 'p0', cardId: FE, slot: 's0-up', pay: false })
    const idx = s.players.p0.placed.findIndex((p) => p.cardId === FE)
    s = applyAction(s, { type: 'removePlaced', player: 'p0', placedIndex: idx })
    expect(s.supply[FE]).toBe(2)
    expect(s.players.p0.placed.some((p) => p.cardId === FE)).toBe(false)
  })

  it('discarding a placed Face-up Expansion also returns it to the supply', () => {
    let s = freshGold()
    s = applyAction(s, { type: 'playCard', player: 'p0', cardId: FE, slot: 's0-up', pay: false })
    const idx = s.players.p0.placed.findIndex((p) => p.cardId === FE)
    s = applyAction(s, { type: 'discardCard', player: 'p0', from: 'placed', placedIndex: idx })
    expect(s.supply[FE]).toBe(2)
  })

  it('supply never goes negative even if over-built', () => {
    let s = freshGold()
    for (let i = 0; i < 5; i++) s = applyAction(s, { type: 'playCard', player: 'p0', cardId: FE, slot: `s0-up${i}`, pay: false })
    expect(s.supply[FE]).toBe(0)
  })

  it('normal (non-Face-up) cards are not tracked by the supply', () => {
    let s = freshGold()
    s = applyAction(s, { type: 'grantCard', player: 'p0', cardId: 'base-marketplace' })
    s = applyAction(s, { type: 'playCard', player: 'p0', cardId: 'base-marketplace', slot: 's0-down', pay: false })
    expect(s.supply['base-marketplace']).toBeUndefined()
  })

  it('a Face-up card whose era is OFF is untracked and never produces NaN', () => {
    let s = newGame({ seed: 1 }) // base only — no gold supply
    expect(s.supply[FE]).toBeUndefined()
    s = applyAction(s, { type: 'playCard', player: 'p0', cardId: FE, slot: 's0-up', pay: false })
    expect(Number.isNaN(s.supply[FE] as number)).toBe(false)
  })

  it('supply can NEVER exceed copies, even after over-build then remove all (BUG-1)', () => {
    let s = freshGold()
    for (let i = 0; i < 4; i++) s = applyAction(s, { type: 'playCard', player: 'p0', cardId: FE, slot: `s0-up${i}`, pay: false })
    expect(s.supply[FE]).toBe(0)
    while (s.players.p0.placed.some((p) => p.cardId === FE)) {
      const idx = s.players.p0.placed.findIndex((p) => p.cardId === FE)
      s = applyAction(s, { type: 'removePlaced', player: 'p0', placedIndex: idx })
    }
    expect(s.supply[FE]).toBe(2) // back to exactly copies, not 4
  })

  it('supply stays correct across the seat-authority MERGE — concurrent builds (BUG-3)', () => {
    const base = newGame({ seed: 5, enabledSets: ['gold', 'turmoil'] })
    // each seat builds a DIFFERENT face-up expansion in the same tick
    const a = applyAction(base, { type: 'playCard', player: 'p0', cardId: 'gold-merchant-guild', slot: 's0-up', pay: false })
    const b = applyAction(base, { type: 'playCard', player: 'p1', cardId: 'turmoil-hedge-tavern-1x', slot: 's0-up', pay: false })
    const merged = mergeSnapshots(a, b)
    expect(merged.players.p0.placed.some((p) => p.cardId === 'gold-merchant-guild')).toBe(true)
    expect(merged.players.p1.placed.some((p) => p.cardId === 'turmoil-hedge-tavern-1x')).toBe(true)
    // both decrements survive (derived from the merged board — no lost/double count)
    expect(merged.supply['gold-merchant-guild']).toBe(1)
    expect(merged.supply['turmoil-hedge-tavern-1x']).toBe(1)
  })
})
