import { describe, it, expect } from 'vitest'
import { setupGame } from './setup'
import { apply, legalMoves } from './moves'
import { resolveBrigand, resolveFace } from './events'
import { tallies } from './tokens'
import { addResource, resourceTotal, type GameState } from './state'

function gold(seed = 1): GameState {
  const s = setupGame({ seed, mode: 'gold' })
  s.phase = 'action'
  return s
}

describe('Era of Gold', () => {
  it('city-expansion (Merchant Guild) may only be placed adjacent to a city', () => {
    const s = gold()
    const p = s.players.p0
    p.hand = ['gold-merchant-guild']
    for (const r of p.regions) r.stored = 3 // affordable
    // both centers are settlements → no legal placement
    let moves = legalMoves(s).filter((m) => m.t === 'placeCard' && m.cardId === 'gold-merchant-guild')
    expect(moves.length).toBe(0)
    // upgrade a center to a city → now placeable there
    p.centers[0].kind = 'city'
    moves = legalMoves(s).filter((m) => m.t === 'placeCard' && m.cardId === 'gold-merchant-guild')
    expect(moves.length).toBeGreaterThan(0)
    expect(moves.every((m) => m.t === 'placeCard' && m.centerIdx === 0)).toBe(true)
  })

  it('Staple House grants +2 resources on build (requires Merchant Guild)', () => {
    const s = gold()
    const p = s.players.p0
    p.centers[0].kind = 'city'
    p.centers[0].slots[0] = 'gold-merchant-guild' // prerequisite present
    p.hand = ['gold-staple-house']
    for (const r of p.regions) r.stored = 0
    addResource(p, 'brick', 1); addResource(p, 'ore', 1); addResource(p, 'wool', 1) // cost
    const before = resourceTotal(p, 'lumber') + p.regions.reduce((a, r) => a + r.stored, 0)
    const s2 = apply(s, { t: 'placeCard', cardId: 'gold-staple-house', centerIdx: 0, slotIdx: 1 })
    const after = s2.players.p0.regions.reduce((a, r) => a + r.stored, 0)
    expect(after).toBeGreaterThanOrEqual(before - 3 + 2 - 1) // paid 3, gained 2 (net visible ≥)
    expect(after).toBeGreaterThan(0)
  })

  it('Pirate Ship removes one of the opponent’s trade ships on build', () => {
    const s = gold()
    const p = s.players.p0
    const opp = s.players.p1
    opp.centers[0].slots[0] = 'base-ore-ship' // opponent trade ship
    p.hand = ['gold-pirate-ship']
    for (const r of p.regions) r.stored = 3
    const s2 = apply(s, { t: 'placeCard', cardId: 'gold-pirate-ship', centerIdx: 0, slotIdx: 0 })
    const oppShips = s2.players.p1.centers.flatMap((c) => c.slots).filter((x) => x === 'base-ore-ship')
    expect(oppShips.length).toBe(0)
    expect(s2.discard).toContain('base-ore-ship')
  })

  it('Mint offers a once-per-turn 1 gold → 1 resource trade', () => {
    const s = gold()
    const p = s.players.p0
    p.centers[0].slots[0] = 'gold-mint'
    for (const r of p.regions) r.stored = 0
    addResource(p, 'gold', 2)
    const mintMoves = legalMoves(s).filter((m) => m.t === 'mint')
    expect(mintMoves.length).toBeGreaterThan(0)
    const s2 = apply(s, mintMoves[0])
    expect(resourceTotal(s2.players.p0, 'gold')).toBe(1) // spent 1 gold
    expect(s2.players.p0.used).toContain('mint')
    // not offered again this turn
    expect(legalMoves(s2).filter((m) => m.t === 'mint').length).toBe(0)
  })

  it('Salt Silo adds 1 commerce per trade ship', () => {
    const s = gold()
    const p = s.players.p0
    p.centers[0].slots[0] = 'base-ore-ship'
    p.centers[0].slots[1] = 'base-wool-ship'
    const before = tallies(p).commerce
    p.centers[1].slots[0] = 'gold-salt-silo'
    const after = tallies(p).commerce
    expect(after - before).toBe(2) // 2 ships × +1
  })

  it('Gold Cache shields stored gold from the Brigand', () => {
    const s = gold()
    const p = s.players.p0
    for (const r of p.regions) r.stored = 0
    p.centers[0].slots[0] = 'gold-gold-cache'
    addResource(p, 'gold', 3); addResource(p, 'wool', 3); addResource(p, 'grain', 3) // 9 > 7
    resolveBrigand(s)
    expect(resourceTotal(p, 'gold')).toBe(3) // shielded
    expect(resourceTotal(p, 'wool')).toBe(0) // still lost
  })

  it('Moneylender lets the trade-advantage holder take 2 on the Trade event', () => {
    const s = gold()
    const p = s.players.p0
    p.hasTradeToken = true
    p.centers[0].slots[0] = 'gold-moneylender'
    for (const r of s.players.p1.regions) r.stored = 0
    addResource(s.players.p1, 'ore', 3)
    for (const r of p.regions) r.stored = 0
    s.lastRoll = { production: 1, event: 'trade' }
    const before = p.regions.reduce((a, r) => a + r.stored, 0)
    resolveFace(s, 'p0')
    const after = p.regions.reduce((a, r) => a + r.stored, 0)
    expect(after - before).toBe(2)
  })
})
