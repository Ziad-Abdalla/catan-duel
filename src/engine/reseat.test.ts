import { describe, it, expect } from 'vitest'
import { newGame } from './newGame'
import { applyAction, YULE_ID } from './actions'

// Engine deck orientation: the END of `eventDeck` is the TOP (drawEvent pops the end);
// index 0 is the BOTTOM. "cards below X" counts from index 0 up to X.
const cardsBelow = (deck: string[], id: string) => deck.indexOf(id)
const cardsAbove = (deck: string[], id: string) => deck.length - 1 - deck.indexOf(id)

// Force `id` to the top of the deck so the next drawEvent reveals it.
const withTopEvent = (deck: string[], id: string) => {
  const rest = deck.filter((x) => x !== id)
  return [...rest, id]
}

describe('event reseat — Yule (festival) keeps 3 cards below it', () => {
  it('newGame seats Yule with exactly 3 cards below it', () => {
    const s = newGame({ seed: 9 })
    expect(cardsBelow(s.eventDeck, YULE_ID)).toBe(3)
  })

  it('drawing Yule reshuffles and re-seats it with 3 cards below it', () => {
    let s = newGame({ seed: 9 })
    s = { ...s, eventDeck: withTopEvent(s.eventDeck, YULE_ID) }
    s = applyAction(s, { type: 'drawEvent' })
    expect(s.revealedEvent).toBe(YULE_ID)
    expect(cardsBelow(s.eventDeck, YULE_ID)).toBe(3)
  })
})

describe('event reseat — "under the top 4" cards', () => {
  it('Barbarian Attack returns under the top 4 event cards (4 above it)', () => {
    let s = newGame({ seed: 2, enabledSets: ['barbarians'] })
    const id = 'barbarians-barbarian-attack'
    s = { ...s, eventDeck: withTopEvent(s.eventDeck, id) }
    s = applyAction(s, { type: 'drawEvent' })
    expect(s.revealedEvent).toBe(id)
    expect(cardsAbove(s.eventDeck, id)).toBe(4)
  })

  it('Insurrection returns under the top 4 event cards', () => {
    let s = newGame({ seed: 2, enabledSets: ['prosperity'] })
    const id = 'prosperity-insurrection'
    s = { ...s, eventDeck: withTopEvent(s.eventDeck, id) }
    s = applyAction(s, { type: 'drawEvent' })
    expect(s.revealedEvent).toBe(id)
    expect(cardsAbove(s.eventDeck, id)).toBe(4)
  })
})

describe('event reseat — ordinary events cycle to the bottom', () => {
  it('an ordinary event goes to the bottom of the deck (index 0)', () => {
    let s = newGame({ seed: 5 })
    const id = 'base-feud'
    s = { ...s, eventDeck: withTopEvent(s.eventDeck, id) }
    s = applyAction(s, { type: 'drawEvent' })
    expect(s.revealedEvent).toBe(id)
    expect(s.eventDeck[0]).toBe(id) // bottom
  })
})
