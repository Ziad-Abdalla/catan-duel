// Win detection. Checked at the end of the active player's turn (Rivals rule):
// first to the mode's VP threshold wins.

import { type GameState, type Seat } from './state'
import { tallies } from './tokens'

export function vpOf(s: GameState, seat: Seat): number {
  return tallies(s.players[seat]).vp
}

export function isOver(s: GameState): boolean {
  return s.phase === 'gameover' || s.winner != null
}

/** If the active player has reached the threshold, return them; else null. */
export function winnerAtTurnEnd(s: GameState): Seat | null {
  return vpOf(s, s.active) >= s.winThreshold ? s.active : null
}
