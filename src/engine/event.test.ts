import { describe, it, expect } from 'vitest'
import { newGame } from './newGame'
import { applyAction } from './actions'
import { getCard } from '../data/cards'

describe('event reveal (simultaneous, both screens)', () => {
  it('drawEvent reveals the top event card into shared state', () => {
    const s = applyAction(newGame({ seed: 4 }), { type: 'drawEvent' })
    expect(s.revealedEvent).toBeTruthy()
    expect(getCard(s.revealedEvent!)).toBeTruthy() // a real event card
    expect(getCard(s.revealedEvent!)!.category).toBe('event')
  })

  it('dismissEvent clears the revealed event', () => {
    let s = applyAction(newGame({ seed: 4 }), { type: 'drawEvent' })
    expect(s.revealedEvent).toBeTruthy()
    s = applyAction(s, { type: 'dismissEvent' })
    expect(s.revealedEvent).toBeUndefined()
  })
})
