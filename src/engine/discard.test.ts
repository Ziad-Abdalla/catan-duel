import { describe, it, expect } from 'vitest'
import { newGame } from './newGame'
import { applyAction } from './actions'
import type { GameState } from '../types'

function fresh(): GameState {
  return newGame({ seed: 2026 })
}

describe('draw from the shared discard pile', () => {
  it('moves the top discarded card back into a hand', () => {
    let s = fresh()
    const card = s.players.p0.hand[0]
    s = applyAction(s, { type: 'discardCard', player: 'p0', from: 'hand', cardId: card })
    expect(s.discard).toContain(card)
    s = applyAction(s, { type: 'drawFromDiscard', player: 'p1' })
    expect(s.players.p1.hand).toContain(card) // any player may draw from the shared pile
    expect(s.discard).not.toContain(card)
  })

  it('can draw a specific card from anywhere in the pile', () => {
    let s = fresh()
    const [a, b] = s.players.p0.hand
    s = applyAction(s, { type: 'discardCard', player: 'p0', from: 'hand', cardId: a })
    s = applyAction(s, { type: 'discardCard', player: 'p0', from: 'hand', cardId: b })
    s = applyAction(s, { type: 'drawFromDiscard', player: 'p0', cardId: a }) // not the top
    expect(s.players.p0.hand).toContain(a)
    expect(s.discard).toContain(b)
    expect(s.discard).not.toContain(a)
  })

  it('is a no-op on an empty discard pile', () => {
    const s = fresh()
    const out = applyAction(s, { type: 'drawFromDiscard', player: 'p0' })
    expect(out.players.p0.hand).toEqual(s.players.p0.hand)
  })
})
