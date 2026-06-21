// Agent entry point. chooseMove() picks a move for the active seat at a difficulty.
// Easy = 1-ply greedy (no search). Medium/Hard = ISMCTS with a per-difficulty budget.

import { type GameState } from '../sim/state'
import { type Move } from '../sim/moves'
import { chooseFast } from './policy'
import { ismctsSearch } from './ismcts'
import { type Difficulty, BUDGETS } from './difficulty'
import type { Chooser } from '../selfplay/run'

export function chooseMove(
  s: GameState,
  diff: Difficulty,
  rng: number,
  opts: { useClock?: boolean } = {},
): [Move, number] {
  const budget = BUDGETS[diff]
  // Easy = the fast priority heuristic (no search). Genuinely weak so the ladder
  // Easy << Medium << Hard is real. (chooseGreedy remains the strong 1-ply baseline
  // used in tests.)
  if (budget.iterations <= 0) return chooseFast(s, rng)
  return ismctsSearch(
    s,
    {
      // short rollouts: with a decent evaluator, leaning on it near the leaf beats
      // long, noisy fast-policy playouts (validated: low-budget MCTS then beats greedy).
      iterations: budget.iterations,
      rolloutDepth: 12,
      // live UI honours the wall-clock cap; self-play omits it for determinism
      ...(opts.useClock ? { timeMs: budget.timeMs, now: () => Date.now() } : {}),
    },
    rng,
  )
}

/** Self-play chooser — deterministic, iteration-bounded (no wall clock). */
export function mctsChooser(diff: Difficulty): Chooser {
  return (s, rng) => chooseMove(s, diff, rng)
}

/** Live chooser for the UI — honours the per-difficulty time cap. */
export function liveChooser(diff: Difficulty): Chooser {
  return (s, rng) => chooseMove(s, diff, rng, { useClock: true })
}

export { chooseFast }
