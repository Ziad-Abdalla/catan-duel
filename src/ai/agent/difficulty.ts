// Difficulty → search budget. Strength scales purely with ISMCTS iterations.
// Easy uses no search (the 1-ply greedy policy).

export type Difficulty = 'easy' | 'medium' | 'hard'

export interface Budget {
  /** ISMCTS iterations per decision (0 = no search, use greedy). */
  iterations: number
  /** soft wall-clock cap per decision in ms (UI responsiveness). */
  timeMs: number
  /** determinizations sampled per decision (hidden-info samples). */
  determinizations: number
}

export const BUDGETS: Record<Difficulty, Budget> = {
  easy: { iterations: 0, timeMs: 50, determinizations: 1 },
  medium: { iterations: 400, timeMs: 400, determinizations: 8 },
  hard: { iterations: 1600, timeMs: 1500, determinizations: 16 },
}
