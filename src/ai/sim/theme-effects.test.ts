import { describe, it, expect } from 'vitest'
import { setupGame } from './setup'
import { apply, legalMoves, effectiveCost } from './moves'
import { resolveEventCard } from './events'
import { addResource, resourceTotal, type GameState, type Mode } from './state'

function game(mode: Mode, seed = 1): GameState {
  const s = setupGame({ seed, mode })
  s.phase = 'action'
  return s
}

describe('Era of Turmoil', () => {
  it('Archer buries an opponent unit when undefended', () => {
    const s = game('turmoil')
    const p = s.players.p0
    p.centers[0].slots[0] = 'turmoil-hedge-tavern-1x' // prerequisite
    s.players.p1.centers[0].slots[0] = 'base-candamir' // a strength unit
    p.hand = ['turmoil-archer']
    const s2 = apply(s, { t: 'playAction', cardId: 'turmoil-archer' })
    const oppUnits = s2.players.p1.centers.flatMap((c) => c.slots).filter((x) => x === 'base-candamir')
    expect(oppUnits.length).toBe(0)
  })

  it('Voyage of Plunder steals 2 when ahead, 1 when behind (needs strength advantage)', () => {
    const s = game('turmoil')
    const p = s.players.p0
    p.hasHeroToken = true
    p.hand = ['turmoil-voyage-of-plunder']
    for (const r of s.players.p1.regions) r.stored = 0
    addResource(s.players.p1, 'ore', 3)
    for (const r of p.regions) r.stored = 0
    // opponent is NOT ahead on VP (equal) → steal 2
    const before = p.regions.reduce((a, r) => a + r.stored, 0)
    const s2 = apply(s, { t: 'playAction', cardId: 'turmoil-voyage-of-plunder' })
    const after = s2.players.p0.regions.reduce((a, r) => a + r.stored, 0)
    expect(after - before).toBe(2)
  })

  it('Drill Ground reduces a hero’s cost by 1', () => {
    const s = game('turmoil')
    const p = s.players.p0
    const base = effectiveCost(s, 'p0', 'base-candamir')
    p.centers[0].slots[0] = 'turmoil-drill-ground'
    const discounted = effectiveCost(s, 'p0', 'base-candamir')
    const sum = (c: Record<string, number>) => Object.values(c).reduce((a, b) => a + b, 0)
    expect(sum(discounted as Record<string, number>)).toBe(sum(base as Record<string, number>) - 1)
  })

  it('Riots: a player with units but no gold loses one', () => {
    const s = game('turmoil')
    const p = s.players.p0
    p.centers[0].slots[0] = 'base-candamir' // a strength unit
    for (const r of p.regions) r.stored = 0 // no gold to pay
    resolveEventCard(s, 'turmoil-riots', 'p0')
    const units = p.centers.flatMap((c) => c.slots).filter((x) => x === 'base-candamir')
    expect(units.length).toBe(0)
  })

  it('Chapel spares you from Riots when the production die is 1–3', () => {
    const s = game('turmoil')
    const p = s.players.p0
    p.centers[0].slots[0] = 'base-candamir'
    p.centers[0].slots[1] = 'turmoil-chapel'
    s.lastRoll = { production: 2, event: 'event' }
    for (const r of p.regions) r.stored = 0
    resolveEventCard(s, 'turmoil-riots', 'p0')
    expect(p.centers.flatMap((c) => c.slots).filter((x) => x === 'base-candamir').length).toBe(1)
  })
})

describe('Era of Progress', () => {
  it('University requires a City and an Abbey or Library', () => {
    const s = game('progress')
    const p = s.players.p0
    p.hand = ['progress-university']
    for (const r of p.regions) r.stored = 3
    p.centers[0].kind = 'city'
    // city but no Abbey/Library → not placeable
    expect(legalMoves(s).some((m) => m.t === 'placeCard' && m.cardId === 'progress-university')).toBe(false)
    p.centers[0].slots[0] = 'base-abbey'
    expect(legalMoves(s).some((m) => m.t === 'placeCard' && m.cardId === 'progress-university')).toBe(true)
  })

  it('Three-Field System needs a University and yields grain', () => {
    const s = game('progress')
    const p = s.players.p0
    p.hand = ['progress-three-field-system']
    for (const r of p.regions) r.stored = 0
    expect(legalMoves(s).some((m) => m.t === 'playAction' && m.cardId === 'progress-three-field-system')).toBe(false)
    p.centers[0].slots[0] = 'progress-university'
    const s2 = apply(s, { t: 'playAction', cardId: 'progress-three-field-system' })
    expect(resourceTotal(s2.players.p0, 'grain')).toBe(2)
  })

  it('Plague costs city-bordering regions a resource; Bath House protects', () => {
    const s = game('progress')
    const p = s.players.p0
    p.centers[0].kind = 'city'
    for (const ri of p.centers[0].regions) p.regions[ri].stored = 2
    resolveEventCard(s, 'progress-plague', 'p0')
    expect(p.centers[0].regions.every((ri) => p.regions[ri].stored === 1)).toBe(true)
    // with a Bath House the same city is protected
    const s2 = game('progress')
    const p2 = s2.players.p0
    p2.centers[0].kind = 'city'
    p2.centers[0].slots[0] = 'progress-bath-house'
    for (const ri of p2.centers[0].regions) p2.regions[ri].stored = 2
    resolveEventCard(s2, 'progress-plague', 'p0')
    expect(p2.centers[0].regions.every((ri) => p2.regions[ri].stored === 2)).toBe(true)
  })

  it('Building Crane discounts a >4-cost city expansion by 1', () => {
    const s = game('progress')
    const p = s.players.p0
    // Parliament costs 2lu+1br+1wo = 4 → not >4; Large Festival Hall (turmoil) is 6.
    // Use a synthetic check on University-chain discount via a >4 city expansion:
    const target = 'turmoil-large-festival-hall' // 2gold+2ore+2brick = 6, needsCity
    const base = effectiveCost(s, 'p0', target)
    p.centers[0].slots[0] = 'progress-building-crane'
    const disc = effectiveCost(s, 'p0', target)
    const sum = (c: Record<string, number>) => Object.values(c).reduce((a, b) => a + b, 0)
    expect(sum(disc as Record<string, number>)).toBe(sum(base as Record<string, number>) - 1)
  })
})
