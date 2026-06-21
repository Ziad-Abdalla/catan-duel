// Information-Set Monte Carlo Tree Search — open-loop determinized UCT.
//
// Why open-loop: Rivals has BOTH hidden information (opponent hand, deck order)
// and chance (two dice). Each iteration we (1) re-determinize the hidden info from
// the searcher's viewpoint and (2) let stochastic transitions (dice/events) resolve
// freshly via the state's RNG. Tree nodes are keyed by move sequences, not concrete
// states, so the same node is revisited across many sampled worlds — that's the IS
// in ISMCTS. Values are stored as the ROOT seat's win-probability; at opponent nodes
// we select to minimise it (zero-sum).

import { type GameState, type Seat, other, cloneState } from '../sim/state'
import { legalMoves, applyInPlace, type Move } from '../sim/moves'
import { isOver } from '../sim/win'
import { rngShuffle, rngInt, deriveSeed } from '../sim/rng'
import { seatYule } from '../sim/events'
import { chooseFast } from './policy'
import { winProb, type Weights, DEFAULT_WEIGHTS } from './evaluate'

export interface SearchBudget {
  iterations: number
  rolloutDepth: number
  /** UCB exploration constant. */
  c?: number
  weights?: Weights
  /** optional wall-clock cap (ms) — only honoured when `now` is also given. Omit in
   *  self-play for deterministic, iteration-bounded search. */
  timeMs?: number
  now?: () => number
}

interface Node {
  N: number
  W: number // sum of root-seat win-prob
  children: Map<string, Node>
}

function newNode(): Node {
  return { N: 0, W: 0, children: new Map() }
}

function sig(m: Move): string {
  switch (m.t) {
    case 'placeCard': return `p:${m.cardId}:${m.centerIdx}:${m.slotIdx}`
    case 'upgradeCity': return `u:${m.centerIdx}`
    case 'playAction': return `a:${m.cardId}`
    case 'playBrigitta': return `b:${m.cardId}`
    case 'trade': return `t:${m.give}>${m.get}`
    case 'chooseProd': return `n:${m.n}`
    default: return m.t
  }
}

/** Re-sample the hidden information from `rootSeat`'s viewpoint. Mutates s. */
function determinize(s: GameState, rootSeat: Seat, seed: number): number {
  let rng = seed
  const opp = other(rootSeat)
  // pool = opponent's hand + all face-down draw stacks (everything the searcher can't see)
  const pool = [...s.players[opp].hand]
  const sizes = s.drawStacks.map((st) => st.length)
  for (const st of s.drawStacks) pool.push(...st)
  let shuffled: string[]
  ;[shuffled, rng] = rngShuffle(pool, rng)
  // re-deal: opponent a new hand of equal size, the rest back into stacks (same sizes)
  let k = 0
  const newHand = shuffled.slice(k, (k += s.players[opp].hand.length))
  s.players[opp].hand = newHand
  s.drawStacks = sizes.map((n) => shuffled.slice(k, (k += n)))
  // unknown orderings: reshuffle event + region stacks
  let ev: string[]
  ;[ev, rng] = rngShuffle(s.eventDeck, rng)
  s.eventDeck = seatYule(ev)
  ;[s.regionStack, rng] = rngShuffle(s.regionStack, rng)
  // fresh dice stream for this sampled world
  s.rng = deriveSeed(rng, 0xd1ce)
  return rng
}

function rollout(s0: GameState, rootSeat: Seat, depth: number, w: Weights, rng: number): number {
  const s = s0 // caller's sampled world — we may mutate it (it's discarded after)
  let r = rng
  let d = 0
  while (!isOver(s) && d < depth) {
    const [m, nr] = chooseFast(s, r)
    r = nr
    applyInPlace(s, m)
    d++
  }
  return winProb(s, rootSeat, w)
}

export function ismctsSearch(root: GameState, budget: SearchBudget, rngSeed: number): [Move, number] {
  const rootSeat = root.active
  const rootMoves = legalMoves(root)
  if (rootMoves.length <= 1) return [rootMoves[0], rngSeed]

  const c = budget.c ?? 1.0
  const w = budget.weights ?? DEFAULT_WEIGHTS
  const tree = newNode()
  let rng = rngSeed
  const useClock = budget.timeMs != null && budget.now != null
  const start = useClock ? budget.now!() : 0

  for (let it = 0; it < budget.iterations; it++) {
    if (useClock && it % 16 === 0 && budget.now!() - start > budget.timeMs!) break
    let s = cloneState(root)
    rng = determinize(s, rootSeat, deriveSeed(rng, it + 1))
    const path: Node[] = [tree]
    let node = tree

    // selection + single expansion
    let expanded = false
    let guard = 0
    while (!isOver(s) && guard++ < 120) {
      const moves = legalMoves(s)
      if (moves.length === 0) break
      const untried = moves.filter((m) => !node.children.has(sig(m)))
      if (untried.length > 0) {
        let pick: number
        ;[pick, rng] = rngInt(rng, untried.length)
        const m = untried[pick]
        applyInPlace(s, m)
        const child = newNode()
        // Evaluation prior (first-play urgency): seed the new node with one virtual
        // visit at the heuristic value, so the search is anchored to — and never
        // worse than — the 1-ply evaluation, then refines it with deeper rollouts.
        child.N = 1
        child.W = winProb(s, rootSeat, w)
        node.children.set(sig(m), child)
        path.push(child)
        node = child
        expanded = true
        break
      }
      // all children tried → UCB descent
      const toMove = s.active
      const maximize = toMove === rootSeat
      let best: Move = moves[0]
      let bestScore = -Infinity
      const logN = Math.log(node.N + 1)
      for (const m of moves) {
        const ch = node.children.get(sig(m))!
        const q = ch.N > 0 ? ch.W / ch.N : 0.5
        const exploit = maximize ? q : 1 - q
        const explore = c * Math.sqrt(logN / (ch.N + 1))
        const score = exploit + explore
        if (score > bestScore) { bestScore = score; best = m }
      }
      applyInPlace(s, best)
      node = node.children.get(sig(best))!
      path.push(node)
    }
    void expanded

    const value = rollout(s, rootSeat, budget.rolloutDepth, w, rng)
    rng = deriveSeed(rng, 0xa11) // advance so rollouts don't correlate
    for (const n of path) { n.N++; n.W += value }
  }

  // pick the most-visited root child (robust choice)
  let best: Move = rootMoves[0]
  let bestN = -1
  for (const m of rootMoves) {
    const ch = tree.children.get(sig(m))
    const n = ch?.N ?? 0
    if (n > bestN) { bestN = n; best = m }
  }
  return [best, rng]
}
