import { describe, it, expect } from 'vitest'
import type { Card, GameState, PlacedCard } from '../types'
import { newGame } from './newGame'
import { requirementMet } from './requirements'

/** Synthetic card carrying only a `requires` clause — the parser reads values.requires. */
function reqCard(requires: string): Card {
  return { id: 'test', set: 'barbarians', category: 'action', name: 'Test', copies: 1, values: { requires } }
}

function withPlaced(extra: PlacedCard[]): GameState {
  const s = newGame({ seed: 1, enabledSets: ['barbarians', 'merchants', 'intrigue'] })
  s.players.p0 = { ...s.players.p0, placed: [...s.players.p0.placed, ...extra] }
  return s
}

describe('requirements parser — Age of Darkness patterns', () => {
  it('compound "Castle and at least 2 heroes" needs both', () => {
    const card = reqCard('Castle and at least 2 heroes')
    expect(requirementMet(card, withPlaced([]), 'p0')).toBe(false)
    expect(requirementMet(card, withPlaced([{ cardId: 'barbarians-castle' }]), 'p0')).toBe(false)
    const ok = withPlaced([
      { cardId: 'barbarians-castle' },
      { cardId: 'barbarians-arad-the-strategist' },
      { cardId: 'barbarians-baroc-the-barbarian' },
    ])
    expect(requirementMet(card, ok, 'p0')).toBe(true)
  })

  it('negation "no Abbey" — true without an Abbey, false with one', () => {
    const card = reqCard('no Abbey')
    expect(requirementMet(card, withPlaced([]), 'p0')).toBe(true)
    expect(requirementMet(card, withPlaced([{ cardId: 'base-abbey' }]), 'p0')).toBe(false)
  })

  it('"2 trade ships" counts placed trade ships (any dash style)', () => {
    const card = reqCard('2 trade ships')
    expect(requirementMet(card, withPlaced([{ cardId: 'base-gold-ship' }]), 'p0')).toBe(false)
    const two = withPlaced([{ cardId: 'base-gold-ship' }, { cardId: 'gold-large-trade-ship' }])
    expect(requirementMet(card, two, 'p0')).toBe(true)
  })

  it('"Commercial Harbor or 2 trade ships" — either alternative satisfies', () => {
    const card = reqCard('Commercial Harbor or 2 trade ships')
    expect(requirementMet(card, withPlaced([]), 'p0')).toBe(false)
    expect(requirementMet(card, withPlaced([{ cardId: 'merchants-commercial-harbor' }]), 'p0')).toBe(true)
    const ships = withPlaced([{ cardId: 'base-gold-ship' }, { cardId: 'base-ore-ship' }])
    expect(requirementMet(card, ships, 'p0')).toBe(true)
  })

  it('comma list "Church, Abbey or Chapel" — any one satisfies', () => {
    const card = reqCard('Church, Abbey or Chapel')
    expect(requirementMet(card, withPlaced([]), 'p0')).toBe(false)
    expect(requirementMet(card, withPlaced([{ cardId: 'intrigue-church' }]), 'p0')).toBe(true)
  })

  it('trailing period does not break a building-name match ("Castle.")', () => {
    expect(requirementMet(reqCard('Castle.'), withPlaced([{ cardId: 'barbarians-castle' }]), 'p0')).toBe(true)
  })

  it('"Triumph Card indicating at least 1 victory point and at least 1 unit"', () => {
    const card = reqCard('Triumph Card indicating at least 1 victory point and at least 1 unit')
    const base = withPlaced([{ cardId: 'barbarians-arad-the-strategist' }]) // 1 unit, triumph 0
    expect(requirementMet(card, base, 'p0')).toBe(false)
    const s = withPlaced([{ cardId: 'barbarians-arad-the-strategist' }])
    s.players.p0 = { ...s.players.p0, markers: { triumph: 1 } }
    expect(requirementMet(card, s, 'p0')).toBe(true)
  })

  it('"top-level Residence or 6 commerce" — unknown until residence levels exist, but 6 commerce works', () => {
    const card = reqCard('top-level Residence or 6 commerce')
    // no commerce, residence path unknowable -> null (unknown), never a hard false
    expect(requirementMet(card, withPlaced([]), 'p0')).toBeNull()
    const s = withPlaced([])
    s.players.p0 = { ...s.players.p0, statAdjust: { commerce: 6 } }
    expect(requirementMet(card, s, 'p0')).toBe(true)
  })
})
