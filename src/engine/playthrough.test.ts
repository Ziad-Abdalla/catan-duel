import { describe, it, expect } from 'vitest'
import { newGame } from './newGame'
import { applyAction, resourceTotalOf, computeVP, type Action } from './actions'
import { getCard } from '../data/cards'
import type { GameState } from '../types'

/** Apply an action and assert the universal invariants hold after it. */
function step(s: GameState, a: Action): GameState {
  const before = s.seq
  const next = applyAction(s, a)
  expect(next.seq).toBe(before + 1)
  for (const id of ['p0', 'p1'] as const) {
    for (const r of next.players[id].regions) {
      expect(r.stored).toBeGreaterThanOrEqual(0)
      expect(r.stored).toBeLessThanOrEqual(3)
    }
    for (const cid of next.players[id].hand) expect(getCard(cid)).toBeTruthy()
  }
  return next
}

describe('full game flow — a realistic turn sequence stays coherent (ready to play)', () => {
  it('rolls, produces, builds, plays, discards, draws back, resolves an event, and ends via vote', () => {
    let s = newGame({ seed: 99 })

    // 1. Roll + produce — matching regions gain a resource
    s = step(s, { type: 'roll', production: 3, event: 'plentiful-harvest' })
    const before3 = resourceTotalOf(s.players.p0, s.players.p0.regions.find((r) => r.number === 3)!.resource)
    s = step(s, { type: 'applyProduction' })
    const after3 = resourceTotalOf(s.players.p0, s.players.p0.regions.find((r) => r.number === 3)!.resource)
    expect(after3).toBeGreaterThanOrEqual(before3) // produced (capped at 3)

    // 2. Build a road — pays its cost
    s = step(s, { type: 'setStored', player: 'p0', regionIndex: s.players.p0.regions.findIndex((r) => r.resource === 'lumber'), stored: 3 })
    s = step(s, { type: 'setStored', player: 'p0', regionIndex: s.players.p0.regions.findIndex((r) => r.resource === 'brick'), stored: 3 })
    const lumber0 = resourceTotalOf(s.players.p0, 'lumber')
    s = step(s, { type: 'buildPiece', player: 'p0', piece: 'road' })
    expect(resourceTotalOf(s.players.p0, 'lumber')).toBe(lumber0 - 1)

    // 3. Draw a card, play it, then send it to discard and pull it back
    s = step(s, { type: 'drawToHand', player: 'p0', stackIndex: 0 })
    const card = s.players.p0.hand[s.players.p0.hand.length - 1]
    s = step(s, { type: 'playCard', player: 'p0', cardId: card, slot: 's0-up', pay: false })
    expect(s.players.p0.placed.some((p) => p.cardId === card)).toBe(true)
    const pIdx = s.players.p0.placed.findIndex((p) => p.cardId === card)
    s = step(s, { type: 'discardCard', player: 'p0', from: 'placed', placedIndex: pIdx })
    if (s.discard.includes(card)) {
      s = step(s, { type: 'drawFromDiscard', player: 'p0', cardId: card })
      expect(s.players.p0.hand).toContain(card)
    }

    // 4. End turn → opponent acts a little
    s = step(s, { type: 'endTurn' })
    expect(s.activePlayer).toBe('p1')
    s = step(s, { type: 'roll', production: 5, event: 'event-card' })
    s = step(s, { type: 'drawEvent' })
    expect(s.revealedEvent).toBeTruthy()
    s = step(s, { type: 'dismissEvent' })
    expect(s.revealedEvent).toBeUndefined()
    s = step(s, { type: 'endTurn' })

    // 5. p0 climbs to the threshold → eligible, but not auto-won
    s = step(s, { type: 'setWinThreshold', value: 5 })
    while (computeVP(s.players.p0) < 5) s = step(s, { type: 'adjustVP', player: 'p0', delta: 1 })
    expect(s.eligible).toBe('p0')
    expect(s.winner).toBeUndefined()

    // 6. Vote to end — p0 claims, p1 agrees → game concludes
    s = step(s, { type: 'claimVictory', player: 'p0' })
    s = step(s, { type: 'agreeVictory', player: 'p1' })
    expect(s.winner).toBe('p0')
    expect(s.phase).toBe('gameover')
  })
})
