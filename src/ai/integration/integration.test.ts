import { describe, it, expect } from 'vitest'
import { newGame } from '../../engine/newGame'
import { applyAction, computeVP, type Action } from '../../engine/actions'
import type { GameState as LiveState, PlayerId } from '../../types'
import { liveToSim } from './liveToSim'
import { playAiTurn } from './aiController'

// A minimal stand-in for the live store: holds state, applies dispatched actions
// through the REAL engine reducer (same path the UI uses).
function makeStore(seed: number, enabledSets: ('gold' | 'turmoil' | 'progress')[] = []) {
  let state: LiveState = newGame({ seed, enabledSets })
  return {
    get: () => state,
    dispatch: (a: Action) => { state = applyAction(state, a) },
  }
}

function invariants(s: LiveState) {
  for (const id of ['p0', 'p1'] as PlayerId[]) {
    const p = s.players[id]
    for (const r of p.regions) {
      expect(r.stored).toBeGreaterThanOrEqual(0)
      expect(r.stored).toBeLessThanOrEqual(3)
    }
    expect(p.hand.every((c) => typeof c === 'string')).toBe(true)
  }
}

describe('live ↔ sim bridge', () => {
  it('converts a fresh live game to a valid sim state', () => {
    const live = newGame({ seed: 1 })
    const sim = liveToSim(live)
    expect(sim.players.p0.regions.length).toBe(6)
    expect(sim.players.p1.regions.length).toBe(6)
    expect(sim.players.p0.centers.length).toBeGreaterThanOrEqual(1)
    expect(sim.winThreshold).toBe(7)
    expect(sim.active).toBe('p0')
  })

  it('maps enabled eras to the right mode/threshold', () => {
    expect(liveToSim(newGame({ seed: 1, enabledSets: ['gold'] })).mode).toBe('gold')
    expect(liveToSim(newGame({ seed: 1, enabledSets: ['gold', 'turmoil', 'progress'] })).mode).toBe('duel')
  })
})

describe('playAiTurn against the real engine', () => {
  it('runs an AI turn that ends the turn and keeps live state valid', async () => {
    const store = makeStore(7)
    // make it the AI's turn: p1 is the AI; first end p0's turn quickly
    store.dispatch({ type: 'endTurn' })
    expect(store.get().activePlayer).toBe('p1')

    await playAiTurn({
      getState: store.get,
      dispatch: store.dispatch,
      aiSeat: 'p1',
      difficulty: 'easy',
      rng: { v: 123 },
      delayMs: 0, // no real waiting in tests
    })

    // the AI ended its turn → control passes back to p0
    expect(store.get().activePlayer).toBe('p0')
    invariants(store.get())
  })

  it('the AI builds / scores over several of its turns (all sets)', async () => {
    const store = makeStore(3, ['gold', 'turmoil', 'progress'])
    let aiTurns = 0
    const rng = { v: 999 }
    // alternate: p0 (human stand-in) just ends turn; p1 (AI) plays a real turn
    for (let i = 0; i < 12 && !store.get().winner; i++) {
      if (store.get().activePlayer === 'p0') {
        store.dispatch({ type: 'roll', production: 3, event: 'plentiful-harvest' })
        store.dispatch({ type: 'endTurn' })
      } else {
        await playAiTurn({ getState: store.get, dispatch: store.dispatch, aiSeat: 'p1', difficulty: 'easy', rng, delayMs: 0 })
        aiTurns++
      }
      invariants(store.get())
    }
    expect(aiTurns).toBeGreaterThan(0)
    // the AI should have developed its principality (more than the starting 2 VP)
    expect(computeVP(store.get().players.p1)).toBeGreaterThanOrEqual(2)
  })
})
