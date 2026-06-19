import { describe, it, expect } from 'vitest'
import { newGame } from './newGame'
import { applyAction } from './actions'
import type { GameState } from '../types'

function fresh(): GameState {
  return newGame({ seed: 2026 })
}

describe('vote-to-end (no forced game freeze)', () => {
  it('reaching the threshold marks eligibility but does NOT auto-win or freeze', () => {
    let s = fresh() // p0 starts at 2 VP
    s = applyAction(s, { type: 'setWinThreshold', value: 3 })
    s = applyAction(s, { type: 'adjustVP', player: 'p0', delta: 1 }) // → 3 VP, meets threshold
    expect(s.eligible).toBe('p0')
    expect(s.winner).toBeUndefined() // not auto-won
    expect(s.phase).not.toBe('gameover') // not frozen
  })

  it('claimVictory records a pending claim', () => {
    let s = fresh()
    s = applyAction(s, { type: 'claimVictory', player: 'p0' })
    expect(s.victoryClaim).toBe('p0')
    expect(s.winner).toBeUndefined()
  })

  it('the opponent agreeing concludes the game', () => {
    let s = fresh()
    s = applyAction(s, { type: 'claimVictory', player: 'p0' })
    s = applyAction(s, { type: 'agreeVictory', player: 'p1' }) // opponent agrees
    expect(s.winner).toBe('p0')
    expect(s.phase).toBe('gameover')
    expect(s.victoryClaim).toBeUndefined()
  })

  it('a player cannot agree to their own claim', () => {
    let s = fresh()
    s = applyAction(s, { type: 'claimVictory', player: 'p0' })
    s = applyAction(s, { type: 'agreeVictory', player: 'p0' }) // same player → no effect
    expect(s.winner).toBeUndefined()
    expect(s.victoryClaim).toBe('p0')
  })

  it('declineVictory clears a pending claim without ending the game', () => {
    let s = fresh()
    s = applyAction(s, { type: 'claimVictory', player: 'p1' })
    s = applyAction(s, { type: 'declineVictory' })
    expect(s.victoryClaim).toBeUndefined()
    expect(s.winner).toBeUndefined()
  })

  it('eligibility clears when VP falls back below the threshold', () => {
    let s = fresh()
    s = applyAction(s, { type: 'setWinThreshold', value: 3 })
    s = applyAction(s, { type: 'adjustVP', player: 'p0', delta: 1 }) // eligible
    expect(s.eligible).toBe('p0')
    s = applyAction(s, { type: 'adjustVP', player: 'p0', delta: -1 }) // back to 2
    expect(s.eligible).toBeUndefined()
  })
})
