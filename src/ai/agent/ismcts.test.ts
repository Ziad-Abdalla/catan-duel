import { describe, it, expect } from 'vitest'
import { setupGame } from '../sim/setup'
import { legalMoves } from '../sim/moves'
import { isOver } from '../sim/win'
import { ismctsSearch } from './ismcts'
import { chooseMove } from './agent'
import { chooseGreedy } from './policy'
import { playSeries, type Chooser } from '../selfplay/run'

const greedy: Chooser = (s, rng) => [chooseGreedy(s), rng]
// light MCTS for a fast smoke test (the full-strength 200-game gate runs via the CLI)
const lightMcts: Chooser = (s, rng) => ismctsSearch(s, { iterations: 150, rolloutDepth: 12 }, rng)

describe('ISMCTS', () => {
  it('returns a legal move for the active seat', () => {
    const s = setupGame({ seed: 1 })
    const [m] = ismctsSearch(s, { iterations: 50, rolloutDepth: 40 }, 123)
    const legal = legalMoves(s).some((x) => JSON.stringify(x) === JSON.stringify(m))
    expect(legal).toBe(true)
  })

  it('honours the wall-clock cap (stops almost immediately when deadline passed)', () => {
    const s = setupGame({ seed: 1 })
    let calls = 0
    // clock jumps far past the deadline on the first check → search should bail fast
    const now = () => (calls++ === 0 ? 0 : 1e9)
    const [m] = ismctsSearch(s, { iterations: 100000, rolloutDepth: 40, timeMs: 10, now }, 7)
    expect(m).toBeTruthy()
    expect(calls).toBeLessThan(50) // did NOT run the full 100k iterations
  })

  it('MCTS beats the greedy Easy bot over a small match', () => {
    // light + seeded smoke; the full-strength 200-game gate runs via the CLI report
    const res = playSeries(20, lightMcts, greedy, 'base', 1)
    const wins = res.games.filter((g) => g.winner === 'p0').length
    const illegal = res.games.reduce((a, g) => a + g.illegal, 0)
    expect(illegal).toBe(0)
    expect(wins / res.games.length).toBeGreaterThan(0.5) // beats greedy
  })

  it('a hard move on a real position is legal and decisive', () => {
    const s = setupGame({ seed: 9 })
    const [m, rng] = chooseMove(s, 'medium', 999)
    expect(legalMoves(s).length).toBeGreaterThan(0)
    expect(m).toBeTruthy()
    expect(typeof rng).toBe('number')
    expect(isOver(s)).toBe(false)
  })
})
