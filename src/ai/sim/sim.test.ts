import { describe, it, expect } from 'vitest'
import { setupGame } from './setup'
import { legalMoves, apply } from './moves'
import { isOver, vpOf } from './win'
import { totalResources, SEATS } from './state'
import { rngInt } from './rng'

/** Pick a legal move with a seeded RNG (random-but-deterministic agent). */
function randomLegalGame(seed: number, maxPlies = 4000) {
  let s = setupGame({ seed })
  let rng = (seed ^ 0x1234) >>> 0
  let plies = 0
  let illegal = 0
  while (!isOver(s) && plies < maxPlies) {
    const moves = legalMoves(s)
    if (moves.length === 0) { illegal++; break }
    let i: number
    ;[i, rng] = rngInt(rng, moves.length)
    s = apply(s, moves[i])
    plies++
  }
  return { s, plies, illegal }
}

describe('sim setup', () => {
  it('builds a valid base starting position', () => {
    const s = setupGame({ seed: 7 })
    expect(s.winThreshold).toBe(7)
    for (const seat of SEATS) {
      const p = s.players[seat]
      expect(p.regions).toHaveLength(6)
      expect(p.centers).toHaveLength(2)
      expect(p.hand).toHaveLength(3)
      // 5 non-gold regions start at 1, gold at 0 → total 5
      expect(totalResources(p)).toBe(5)
      // each starting region has a distinct 1–6 number
      const nums = p.regions.map((r) => r.number).sort()
      expect(nums).toEqual([1, 2, 3, 4, 5, 6])
    }
    // every center borders some regions; the two centers partition all 6 regions
    for (const seat of SEATS) {
      const idxs = s.players[seat].centers.flatMap((c) => c.regions).sort((a, b) => a - b)
      expect(idxs).toEqual([0, 1, 2, 3, 4, 5])
    }
  })

  it('deals disjoint hands and a non-empty region/event/draw setup', () => {
    const s = setupGame({ seed: 42 })
    expect(s.regionStack.length).toBeGreaterThan(0)
    expect(s.eventDeck.length).toBeGreaterThan(0)
    expect(s.drawStacks.flat().length).toBeGreaterThan(0)
  })
})

describe('sim playthrough', () => {
  it('random-legal games terminate with a single legal winner, zero illegal moves', () => {
    for (const seed of [1, 2, 3, 7, 13, 99, 1000]) {
      const { s, plies, illegal } = randomLegalGame(seed)
      expect(illegal).toBe(0)
      expect(isOver(s)).toBe(true)
      expect(s.winner === 'p0' || s.winner === 'p1').toBe(true)
      // winner actually met the threshold
      expect(vpOf(s, s.winner!)).toBeGreaterThanOrEqual(s.winThreshold)
      expect(plies).toBeGreaterThan(0)
    }
  })

  it('resource storage never exceeds the per-region cap of 3', () => {
    const { s } = randomLegalGame(5)
    for (const seat of SEATS) for (const r of s.players[seat].regions) {
      expect(r.stored).toBeLessThanOrEqual(3)
      expect(r.stored).toBeGreaterThanOrEqual(0)
    }
  })
})
