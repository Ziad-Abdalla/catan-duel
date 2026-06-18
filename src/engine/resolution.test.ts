import { describe, it, expect } from 'vitest'
import { newGame } from './newGame'
import {
  applyAction,
  computeStats,
  resourceTotal,
  resourceTotalOf,
  suggestAdvantage,
} from './actions'
import type { GameState } from '../types'

function fresh(): GameState {
  return newGame({ seed: 2026 })
}

/** Set every region of a resource to a known stored value for deterministic maths. */
function setAll(s: GameState, player: 'p0' | 'p1', stored: 0 | 1 | 2 | 3): GameState {
  const p = s.players[player]
  let out = s
  p.regions.forEach((_, i) => {
    out = applyAction(out, { type: 'setStored', player, regionIndex: i, stored })
  })
  return out
}

describe('addResource — distribute across matching regions (cap 0..3)', () => {
  it('adds to matching regions, filling toward 3 and never overflowing', () => {
    let s = fresh()
    // zero out all p0 regions first
    s = setAll(s, 'p0', 0)
    const oreRegions = s.players.p0.regions.filter((r) => r.resource === 'ore' && !r.empty).length
    s = applyAction(s, { type: 'addResource', player: 'p0', resource: 'ore', count: 2 })
    expect(resourceTotalOf(s.players.p0, 'ore')).toBe(Math.min(2, oreRegions * 3))
  })

  it('caps each region at 3 and silently drops the overflow it cannot store', () => {
    let s = fresh()
    s = setAll(s, 'p0', 0)
    const oreCount = s.players.p0.regions.filter((r) => r.resource === 'ore' && !r.empty).length
    const room = oreCount * 3
    s = applyAction(s, { type: 'addResource', player: 'p0', resource: 'ore', count: room + 5 })
    expect(resourceTotalOf(s.players.p0, 'ore')).toBe(room) // overflow dropped
    expect(s.players.p0.regions.every((r) => r.stored <= 3)).toBe(true)
  })

  it('a negative count removes resources, never below 0', () => {
    let s = fresh()
    s = setAll(s, 'p0', 1)
    const before = resourceTotalOf(s.players.p0, 'wool')
    s = applyAction(s, { type: 'addResource', player: 'p0', resource: 'wool', count: -(before + 5) })
    expect(resourceTotalOf(s.players.p0, 'wool')).toBe(0)
    expect(s.players.p0.regions.every((r) => r.stored >= 0)).toBe(true)
  })
})

describe('transferResource — between players / to the bank', () => {
  it('moves a resource from one player to the other', () => {
    let s = fresh()
    s = setAll(s, 'p0', 2)
    s = setAll(s, 'p1', 0)
    const fromBefore = resourceTotalOf(s.players.p0, 'grain')
    s = applyAction(s, { type: 'transferResource', from: 'p0', to: 'p1', resource: 'grain', count: 1 })
    expect(resourceTotalOf(s.players.p0, 'grain')).toBe(fromBefore - 1)
    expect(resourceTotalOf(s.players.p1, 'grain')).toBe(1)
  })

  it('to the bank removes from the giver and adds to nobody', () => {
    let s = fresh()
    s = setAll(s, 'p0', 2)
    const before = resourceTotalOf(s.players.p0, 'lumber')
    s = applyAction(s, { type: 'transferResource', from: 'p0', to: 'bank', resource: 'lumber', count: 1 })
    expect(resourceTotalOf(s.players.p0, 'lumber')).toBe(before - 1)
  })
})

describe('resource totals', () => {
  it('resourceTotal sums all stored resources (for "more than 7 resources")', () => {
    let s = fresh()
    s = setAll(s, 'p0', 2)
    const regions = s.players.p0.regions.filter((r) => !r.empty).length
    expect(resourceTotal(s.players.p0)).toBe(regions * 2)
  })
})

describe('derived stats', () => {
  it('computeStats sums strength / skill / commerce / progress from placed cards', () => {
    let s = fresh()
    // Candamir: strength 4, skill 1
    s = applyAction(s, { type: 'playCard', player: 'p0', cardId: 'base-candamir', slot: 's0-up' })
    const st = computeStats(s.players.p0)
    expect(st.strength).toBe(4)
    expect(st.skill).toBe(1)
  })

  it('adjustStat nudges a tally and computeStats reflects it', () => {
    let s = fresh()
    s = applyAction(s, { type: 'adjustStat', player: 'p0', stat: 'commerce', delta: 2 })
    expect(computeStats(s.players.p0).commerce).toBe(2)
    s = applyAction(s, { type: 'adjustStat', player: 'p0', stat: 'commerce', delta: -1 })
    expect(computeStats(s.players.p0).commerce).toBe(1)
  })

  it('suggestAdvantage points to the strength / commerce leader, null on a tie', () => {
    let s = fresh()
    expect(suggestAdvantage(s)).toEqual({ hero: null, trade: null }) // both 0
    s = applyAction(s, { type: 'playCard', player: 'p0', cardId: 'base-candamir', slot: 's0-up' }) // +4 str
    expect(suggestAdvantage(s).hero).toBe('p0')
    s = applyAction(s, { type: 'adjustStat', player: 'p1', stat: 'commerce', delta: 1 })
    expect(suggestAdvantage(s).trade).toBe('p1')
  })
})

describe('grantCard / setDice / markUsed / logNote', () => {
  it('grantCard adds a card id to the hand', () => {
    let s = fresh()
    const before = s.players.p0.hand.length
    s = applyAction(s, { type: 'grantCard', player: 'p0', cardId: 'base-abbey' })
    expect(s.players.p0.hand).toHaveLength(before + 1)
    expect(s.players.p0.hand[s.players.p0.hand.length - 1]).toBe('base-abbey')
  })

  it('grantCard from a draw stack also removes one copy from that stack', () => {
    let s = fresh()
    const idx = s.drawStacks.findIndex((st) => st.length > 0)
    const card = s.drawStacks[idx][s.drawStacks[idx].length - 1]
    const len = s.drawStacks[idx].length
    s = applyAction(s, { type: 'grantCard', player: 'p0', cardId: card, fromStack: idx })
    expect(s.drawStacks[idx]).toHaveLength(len - 1)
    expect(s.players.p0.hand).toContain(card)
  })

  it('setDice overrides the roll without changing the phase', () => {
    let s = applyAction(fresh(), { type: 'roll', production: 3, event: 'brigand' })
    expect(s.phase).toBe('action')
    s = applyAction(s, { type: 'setDice', production: 6, event: 'celebration' })
    expect(s.lastRoll).toEqual({ production: 6, event: 'celebration' })
    expect(s.phase).toBe('action') // unchanged
  })

  it('setDice can set just the production die', () => {
    let s = applyAction(fresh(), { type: 'roll', production: 3, event: 'brigand' })
    s = applyAction(s, { type: 'setDice', production: 1 })
    expect(s.lastRoll).toEqual({ production: 1, event: 'brigand' })
  })

  it('markUsed records an ability key for the turn; endTurn clears it', () => {
    let s = applyAction(fresh(), { type: 'markUsed', player: 'p0', key: 'gold-mint' })
    expect(s.players.p0.usedThisTurn).toContain('gold-mint')
    s = applyAction(s, { type: 'markUsed', player: 'p0', key: 'gold-mint' }) // idempotent
    expect(s.players.p0.usedThisTurn?.filter((k) => k === 'gold-mint')).toHaveLength(1)
    s = applyAction(s, { type: 'endTurn' })
    expect(s.players.p0.usedThisTurn ?? []).toHaveLength(0)
  })

  it('logNote appends a manual entry to the log', () => {
    const s = applyAction(fresh(), { type: 'logNote', player: 'p0', text: 'Brigand: P1 lost wool' })
    const last = s.log[s.log.length - 1]
    expect(last.text).toBe('Brigand: P1 lost wool')
    expect(last.manual).toBe(true)
  })
})
