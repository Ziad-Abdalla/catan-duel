import { describe, it, expect, beforeEach } from 'vitest'
import { useGame } from './gameStore'

describe('store undo / history (trust-based fat-finger recovery)', () => {
  beforeEach(() => {
    useGame.getState().disconnect()
    useGame.getState().newHotseat({ seed: 5 })
  })

  it('records history on each local change and undo restores the prior snapshot', () => {
    const g = useGame.getState
    expect(g().history).toHaveLength(0)
    const vp0 = g().state.players.p0.victoryPoints

    g().dispatch({ type: 'adjustVP', player: 'p0', delta: 1 })
    expect(g().state.players.p0.victoryPoints).toBe(vp0 + 1)
    expect(g().history).toHaveLength(1)

    g().undo()
    expect(g().state.players.p0.victoryPoints).toBe(vp0)
    expect(g().history).toHaveLength(0)
  })

  it('keeps seq monotonic across an undo (so online peers still adopt it)', () => {
    const g = useGame.getState
    g().dispatch({ type: 'adjustVP', player: 'p0', delta: 1 })
    const seqAfter = g().state.seq
    g().undo()
    expect(g().state.seq).toBeGreaterThan(seqAfter)
  })

  it('undo is a no-op with no history', () => {
    const g = useGame.getState
    const before = g().state
    g().undo()
    expect(g().state).toBe(before)
  })

  it('stacks multiple changes and undo steps back one at a time', () => {
    const g = useGame.getState
    g().dispatch({ type: 'adjustVP', player: 'p0', delta: 1 })
    g().dispatch({ type: 'adjustVP', player: 'p0', delta: 1 })
    g().dispatch({ type: 'adjustVP', player: 'p0', delta: 1 })
    expect(g().state.players.p0.victoryPoints).toBe(5) // 2 + 3
    expect(g().history).toHaveLength(3)
    g().undo()
    expect(g().state.players.p0.victoryPoints).toBe(4)
    g().undo()
    expect(g().state.players.p0.victoryPoints).toBe(3)
    expect(g().history).toHaveLength(1)
  })
})
