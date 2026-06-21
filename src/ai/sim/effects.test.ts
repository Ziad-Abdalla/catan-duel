import { describe, it, expect } from 'vitest'
import { setupGame } from './setup'
import { apply, applyProduction, tradeRate } from './moves'
import { resolveBrigand, brigandCount } from './events'
import { addResource, resourceTotal, type GameState } from './state'

// helper: index of p0's region with a given resource
function regIdx(s: GameState, res: string): number {
  return s.players.p0.regions.findIndex((r) => r.resource === res)
}

describe('base rules fidelity', () => {
  it('doubling building doubles its adjacent region production', () => {
    const s = setupGame({ seed: 3 })
    const li = regIdx(s, 'lumber')
    // place lumber camp in the center that borders the lumber region
    const ci = s.players.p0.centers.findIndex((c) => c.regions.includes(li))
    s.players.p0.centers[ci].slots[0] = 'base-lumber-camp'
    const num = s.players.p0.regions[li].number
    s.players.p0.regions[li].stored = 0
    applyProduction(s, num)
    expect(s.players.p0.regions[li].stored).toBe(2) // doubled (1 → would be, ×2 = 2)
  })

  it('non-doubled region produces exactly 1', () => {
    const s = setupGame({ seed: 3 })
    const bi = regIdx(s, 'brick')
    s.players.p0.regions[bi].stored = 0
    applyProduction(s, s.players.p0.regions[bi].number)
    expect(s.players.p0.regions[bi].stored).toBe(1)
  })

  it('storehouse excludes its center regions from the Brigand count', () => {
    const s = setupGame({ seed: 3 })
    const p = s.players.p0
    for (const r of p.regions) r.stored = 2 // 12 total > 7
    const before = brigandCount(p)
    p.centers[0].slots[0] = 'base-storehouse'
    const after = brigandCount(p)
    expect(after).toBeLessThan(before)
  })

  it('Brigand wipes all gold and wool when triggered (>7)', () => {
    const s = setupGame({ seed: 3 })
    const p = s.players.p0
    for (const r of p.regions) r.stored = 0
    addResource(p, 'gold', 3)
    addResource(p, 'wool', 3)
    addResource(p, 'grain', 3) // total 9 > 7
    resolveBrigand(s)
    expect(resourceTotal(p, 'gold')).toBe(0)
    expect(resourceTotal(p, 'wool')).toBe(0)
    expect(resourceTotal(p, 'grain')).toBe(3) // untouched
  })

  it('matching trade ship gives a 2:1 rate, else 3:1', () => {
    const s = setupGame({ seed: 3 })
    const p = s.players.p0
    expect(tradeRate(p, 'ore')).toBe(3)
    p.centers[0].slots[0] = 'base-ore-ship'
    expect(tradeRate(p, 'ore')).toBe(2)
    expect(tradeRate(p, 'grain')).toBe(3)
  })

  it('Scout sets the best-region flag and the next settlement draws the best regions', () => {
    const s = setupGame({ seed: 3 })
    const p = s.players.p0
    s.phase = 'action'
    p.hand = ['base-scout']
    const s2 = apply(s, { t: 'playAction', cardId: 'base-scout' })
    expect(s2.players.p0.scoutBest).toBe(true)
    // now build a settlement from a known region stack
    s2.regionStack = [
      { resource: 'ore', number: 2 },
      { resource: 'grain', number: 6 },
      { resource: 'lumber', number: 4 },
    ]
    s2.players.p0.pendingRoads = 1
    for (const r of s2.players.p0.regions) r.stored = 3 // plenty to afford
    const before = s2.players.p0.regions.length
    const s3 = apply(s2, { t: 'buildSettlement' })
    const drawn = s3.players.p0.regions.slice(before)
    expect(drawn.map((r) => r.number)).toContain(6) // best-number region taken
  })

  it('Relocation moves a mis-placed doubling building to a matching center', () => {
    const s = setupGame({ seed: 3 })
    const p = s.players.p0
    const li = regIdx(s, 'lumber')
    const lumberCenter = p.centers.findIndex((c) => c.regions.includes(li))
    const otherCenter = lumberCenter === 0 ? 1 : 0
    // put the lumber camp in the WRONG center (one that doesn't border lumber)
    p.centers[otherCenter].slots[0] = 'base-lumber-camp'
    s.phase = 'action'
    p.hand = ['base-relocation']
    const s2 = apply(s, { t: 'playAction', cardId: 'base-relocation' })
    const moved = s2.players.p0.centers[lumberCenter].slots.includes('base-lumber-camp')
    expect(moved).toBe(true)
  })
})
