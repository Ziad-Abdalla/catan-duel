import { describe, it, expect } from 'vitest'
import { STARTING_PRINCIPALITIES } from './setup'
import type { PlayerId, ResourceType } from '../types'

const num = (p: PlayerId, r: ResourceType) =>
  STARTING_PRINCIPALITIES[p].find((c) => c.resource === r)!.number

describe('official match start', () => {
  it('each player carries the numbers 1–6 exactly once', () => {
    for (const p of ['p0', 'p1'] as PlayerId[]) {
      const nums = STARTING_PRINCIPALITIES[p].map((c) => c.number).sort()
      expect(nums).toEqual([1, 2, 3, 4, 5, 6])
    }
  })

  it('matches the owner-specified per-player mapping (Wheat=grain, Wood=lumber, Sheep=wool)', () => {
    // P1: Wheat=5, Wood=3, Sheep=1, Brick=2, Ore=6, Gold=4
    expect(num('p0', 'grain')).toBe(5)
    expect(num('p0', 'lumber')).toBe(3)
    expect(num('p0', 'wool')).toBe(1)
    expect(num('p0', 'brick')).toBe(2)
    expect(num('p0', 'ore')).toBe(6)
    expect(num('p0', 'gold')).toBe(4)
    // P2: Wheat=6, Gold=1, Brick=3, Sheep=4, Ore=5, Wood=2
    expect(num('p1', 'grain')).toBe(6)
    expect(num('p1', 'gold')).toBe(1)
    expect(num('p1', 'brick')).toBe(3)
    expect(num('p1', 'wool')).toBe(4)
    expect(num('p1', 'ore')).toBe(5)
    expect(num('p1', 'lumber')).toBe(2)
  })

  it('the two players never share a resource→number mapping (no identical duplicate numbers)', () => {
    const resources: ResourceType[] = ['lumber', 'brick', 'wool', 'grain', 'ore', 'gold']
    for (const r of resources) {
      expect(num('p0', r)).not.toBe(num('p1', r))
    }
  })
})
