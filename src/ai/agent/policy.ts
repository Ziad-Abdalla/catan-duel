// Move policies. `chooseFast` is a cheap priority heuristic used for ISMCTS
// rollouts and as a baseline. `chooseGreedy` is a 1-ply look-ahead (apply each
// move, evaluate) used as the Easy difficulty. Both act for s.active.

import { type GameState, type Seat } from '../sim/state'
import { legalMoves, apply, type Move } from '../sim/moves'
import { rngInt, rngNext } from '../sim/rng'
import { evaluate, type Weights, DEFAULT_WEIGHTS } from './evaluate'
import { handCardValue } from '../sim/choice'
import { maybeDef } from '../cards'

/** Best production number for `seat`: most resources gained (doubled where applicable). */
export function bestProd(s: GameState, seat: Seat): number {
  const p = s.players[seat]
  let bestN = 1
  let bestGain = -1
  for (let n = 1; n <= 6; n++) {
    let gain = 0
    p.regions.forEach((reg, ri) => {
      if (reg.number !== n) return
      let mult = 1
      for (const c of p.centers) if (c.regions.includes(ri)) for (const id of c.slots) if (id && maybeDef(id)?.doubles === reg.resource) mult = 2
      gain += mult
    })
    if (gain > bestGain) { bestGain = gain; bestN = n }
  }
  return bestN
}

function priority(m: Move): number {
  switch (m.t) {
    case 'buildSettlement': return 100
    case 'upgradeCity': return 95
    case 'placeCard': return 55 + handCardValue(m.cardId)
    case 'buildRoad': return 45
    case 'playAction':
      return m.cardId === 'base-relocation' ? 8 : m.cardId === 'base-scout' ? 22 : 40
    case 'playBrigitta': return 30
    case 'playReiner': return 30
    case 'trade': return 15
    case 'mint': return 18
    case 'roll': return 50
    case 'chooseProd': return 50 // resolved specially in chooseFast
    case 'endTurn': return 12
  }
}

/** Cheap, fast move choice for rollouts. Returns [move, nextRng]. */
export function chooseFast(s: GameState, rng: number): [Move, number] {
  const moves = legalMoves(s)
  if (moves.length === 1) return [moves[0], rng]

  // preroll production choice → pick the best number directly
  if (moves[0]?.t === 'chooseProd') {
    const n = bestProd(s, s.active)
    const m = moves.find((x) => x.t === 'chooseProd' && x.n === n) ?? moves[0]
    return [m, rng]
  }

  // argmax priority with a little randomness so rollouts vary
  let best: Move[] = []
  let bestScore = -Infinity
  for (const m of moves) {
    let sc = priority(m)
    let noise: number
    ;[noise, rng] = rngNext(rng)
    sc += noise * 2
    if (sc > bestScore) { bestScore = sc; best = [m] }
    else if (sc === bestScore) best.push(m)
  }
  let i: number
  ;[i, rng] = rngInt(rng, best.length)
  return [best[i], rng]
}

/** 1-ply greedy: apply each move, keep the one with the best eval for `seat`.
 *  `roll`/`chooseProd` get a small averaging over chance via the seed. */
export function chooseGreedy(s: GameState, w: Weights = DEFAULT_WEIGHTS): Move {
  const seat: Seat = s.active
  const moves = legalMoves(s)
  if (moves.length === 1) return moves[0]
  if (moves[0]?.t === 'chooseProd') {
    const n = bestProd(s, seat)
    return moves.find((x) => x.t === 'chooseProd' && x.n === n) ?? moves[0]
  }
  let best: Move = moves[0]
  let bestVal = -Infinity
  for (const m of moves) {
    const val = evaluate(apply(s, m), seat, w)
    if (val > bestVal) { bestVal = val; best = m }
  }
  return best
}
