import { describe, it, expect } from 'vitest'
import { newGame } from './newGame'
import { makeRng, shuffle } from './rng'
import { rollDice, EVENT_DIE_FACES } from './dice'
import { CARDS } from '../data/cards'

describe('corpus integrity', () => {
  it('base set has the official drawable + event counts', () => {
    const base = CARDS.filter((c) => c.set === 'base')
    const copies = (cat: string) =>
      base.filter((c) => c.category === cat).reduce((n, c) => n + c.copies, 0)
    // 36 basic draw cards (buildings + units + actions) + 9 event cards = 45
    expect(copies('building') + copies('hero-or-unit') + copies('action')).toBe(36)
    expect(copies('event')).toBe(9)
  })

  it('era copy counts match the official set sizes', () => {
    const sum = (set: string) =>
      CARDS.filter((c) => c.set === set && c.category !== 'region' && c.category !== 'settlement' && c.category !== 'city' && c.category !== 'road').reduce(
        (n, c) => n + c.copies,
        0,
      )
    expect(sum('gold')).toBe(27)
    expect(sum('turmoil')).toBe(28)
    expect(sum('progress')).toBe(31)
  })
})

describe('newGame', () => {
  const g = newGame({ seed: 12345 })

  it('gives each player 6 regions, one of each resource', () => {
    for (const pid of ['p0', 'p1'] as const) {
      const regs = g.players[pid].regions
      expect(regs).toHaveLength(6)
      expect(new Set(regs.map((r) => r.resource)).size).toBe(6)
    }
  })

  it('each region starts with 1 stored, except the gold field (0)', () => {
    for (const pid of ['p0', 'p1'] as const) {
      for (const r of g.players[pid].regions) {
        expect(r.stored).toBe(r.resource === 'gold' ? 0 : 1)
      }
    }
  })

  it('uses the confirmed starting numbers', () => {
    const p0 = Object.fromEntries(g.players.p0.regions.map((r) => [r.resource, r.number]))
    expect(p0).toMatchObject({ gold: 1, lumber: 2, brick: 3, wool: 4, ore: 5, grain: 6 })
    const p1 = Object.fromEntries(g.players.p1.regions.map((r) => [r.resource, r.number]))
    expect(p1).toMatchObject({ wool: 1, brick: 2, lumber: 3, gold: 4, ore: 5, grain: 6 })
  })

  it('deals 3-card starting hands and 4 draw stacks', () => {
    expect(g.players.p0.hand).toHaveLength(3)
    expect(g.players.p1.hand).toHaveLength(3)
    expect(g.drawStacks).toHaveLength(4)
    const remaining = g.drawStacks.reduce((n, s) => n + s.length, 0)
    expect(remaining).toBe(36 - 6) // 36 dealt, 6 drawn into hands
  })

  it('has a 12-card region stack and 9-card event deck', () => {
    expect(g.regionStack).toHaveLength(12)
    expect(g.eventDeck).toHaveLength(9)
  })

  it('starts each player at 2 VP (two settlements)', () => {
    expect(g.players.p0.victoryPoints).toBe(2)
    expect(g.players.p1.victoryPoints).toBe(2)
  })

  it('is deterministic for the same seed', () => {
    const a = newGame({ seed: 99 })
    const b = newGame({ seed: 99 })
    expect(JSON.stringify(a)).toBe(JSON.stringify(b))
    const c = newGame({ seed: 100 })
    expect(JSON.stringify(a)).not.toBe(JSON.stringify(c))
  })
})

describe('dice', () => {
  it('production die is always 1–6 and event face is valid', () => {
    const rng = makeRng(7)
    for (let i = 0; i < 200; i++) {
      const { production, event } = rollDice(rng)
      expect(production).toBeGreaterThanOrEqual(1)
      expect(production).toBeLessThanOrEqual(6)
      expect(EVENT_DIE_FACES).toContain(event)
    }
  })

  it('shuffle is a permutation (no lost/added items)', () => {
    const rng = makeRng(3)
    const src = Array.from({ length: 20 }, (_, i) => i)
    const out = shuffle(src, rng)
    expect(out.slice().sort((a, b) => a - b)).toEqual(src)
  })
})
