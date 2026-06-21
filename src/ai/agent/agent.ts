// Agent entry point. chooseMove() picks a move for the active seat at a difficulty.
// Easy = 1-ply greedy (no search). Medium/Hard = ISMCTS with a per-difficulty budget.

import { type GameState } from '../sim/state'
import { legalMoves, apply, type Move } from '../sim/moves'
import { chooseFast, chooseGreedy } from './policy'
import { evaluate } from './evaluate'
import { ismctsSearch } from './ismcts'
import { type Difficulty, BUDGETS } from './difficulty'
import type { Chooser } from '../selfplay/run'

/** Eval margin by which greedy must beat the search's pick before we override it. */
const SAFETY_MARGIN = 35

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
  const [mctsMove, nrng] = ismctsSearch(
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
  // Greedy safety net: ISMCTS rollouts can turn pessimistic (e.g. an opponent with a
  // big resource stockpile "wins" every playout), making the search undervalue its
  // own progress and idle (endTurn) instead of building a +VP settlement/city. The
  // 1-ply eval is reliable, so if greedy's best deterministic move beats the search's
  // pick by a clear margin, we trust greedy. Only applies to deterministic action
  // moves (no roll/chance), and only catches blunders — small disagreements keep the
  // search's lookahead.
  if (s.phase === 'action' && mctsMove.t !== 'roll' && mctsMove.t !== 'chooseProd') {
    const greedyMove = chooseGreedy(s)
    if (greedyMove.t !== mctsMove.t || JSON.stringify(greedyMove) !== JSON.stringify(mctsMove)) {
      const seat = s.active
      const gv = evaluate(apply(s, greedyMove), seat)
      const mv = evaluate(apply(s, mctsMove), seat)
      if (gv - mv > SAFETY_MARGIN) return [greedyMove, nrng]
    }
  }
  void legalMoves
  return [mctsMove, nrng]
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
