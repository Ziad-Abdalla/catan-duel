import { describe, it, expect } from 'vitest'
import { playSeries, type Chooser } from './run'
import { analyze } from './analyze'
import { chooseGreedy } from '../agent/policy'

const greedy: Chooser = (s, rng) => [chooseGreedy(s), rng]

describe('base self-play gate (greedy vs greedy)', () => {
  const res = playSeries(40, greedy, greedy, 'base', 1)
  const a = analyze(res)

  it('produces zero illegal moves', () => {
    expect(a.illegalTotal).toBe(0)
  })

  it('is roughly balanced and decisive', () => {
    expect(a.winRate.draws).toBeLessThan(0.05)
    expect(a.winRate.p0).toBeGreaterThan(0.2)
    expect(a.winRate.p1).toBeGreaterThan(0.2)
  })

  it('games finish in a sane number of turns', () => {
    expect(a.turns.avg).toBeGreaterThan(10)
    expect(a.turns.avg).toBeLessThan(80)
    expect(a.turns.max).toBeLessThan(200)
  })

  it('exercises the large majority of base cards', () => {
    const played = a.cardUsage.filter((c) => c.plays > 0).length
    const total = a.cardUsage.length
    // a couple of situational cards (Scout/Relocation) may not surface under a
    // 1-ply greedy; they're covered directly in effects.test.ts.
    expect(played).toBeGreaterThanOrEqual(total - 3)
  })

  it('wins come from settlements and cities', () => {
    expect(a.vpSourceAvg.settlements).toBeGreaterThan(1)
    expect(a.vpSourceAvg.cities).toBeGreaterThan(0.5)
  })
})
