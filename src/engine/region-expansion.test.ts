import { describe, it, expect } from 'vitest'
import { newGame } from './newGame'
import { applyAction, resourceTotalOf } from './actions'

const CLOTH = 'merchants-cloth-merchants-residence'

function game() {
  const s = newGame({ seed: 7, enabledSets: ['merchants'] })
  s.players.p0.hand.push(CLOTH)
  return s
}

describe('region-expansion placement + rotation', () => {
  it('playRegionExpansion attaches the card to a region with level 0 and removes it from hand', () => {
    const s0 = game()
    const handBefore = s0.players.p0.hand.length
    const s1 = applyAction(s0, { type: 'playRegionExpansion', player: 'p0', cardId: CLOTH, regionIndex: 3, pay: false })
    const placed = s1.players.p0.placed.find((p) => p.cardId === CLOTH)
    expect(placed).toBeDefined()
    expect(placed!.slot).toBe('rexp-3')
    expect(placed!.level).toBe(0)
    expect(s1.players.p0.hand).not.toContain(CLOTH)
    expect(s1.players.p0.hand.length).toBe(handBefore - 1)
  })

  it('rotatePlaced raises the level and clamps at 0..3', () => {
    let s = applyAction(game(), { type: 'playRegionExpansion', player: 'p0', cardId: CLOTH, regionIndex: 3, pay: false })
    const idx = s.players.p0.placed.findIndex((p) => p.cardId === CLOTH)
    s = applyAction(s, { type: 'rotatePlaced', player: 'p0', placedIndex: idx, delta: 1, pay: false })
    expect(s.players.p0.placed[idx].level).toBe(1)
    s = applyAction(s, { type: 'rotatePlaced', player: 'p0', placedIndex: idx, delta: 1, pay: false })
    s = applyAction(s, { type: 'rotatePlaced', player: 'p0', placedIndex: idx, delta: 1, pay: false })
    expect(s.players.p0.placed[idx].level).toBe(3)
    s = applyAction(s, { type: 'rotatePlaced', player: 'p0', placedIndex: idx, delta: 1, pay: false })
    expect(s.players.p0.placed[idx].level).toBe(3) // clamped at 3
    s = applyAction(s, { type: 'rotatePlaced', player: 'p0', placedIndex: idx, delta: -1, pay: false })
    expect(s.players.p0.placed[idx].level).toBe(2)
  })

  it('rotating UP with pay spends the rotateCost (2 wool for the Cloth Residence)', () => {
    let s = game()
    s = applyAction(s, { type: 'addResource', player: 'p0', resource: 'wool', count: 2 }) // start 1 -> 3
    const woolBefore = resourceTotalOf(s.players.p0, 'wool')
    expect(woolBefore).toBe(3)
    s = applyAction(s, { type: 'playRegionExpansion', player: 'p0', cardId: CLOTH, regionIndex: 3, pay: false })
    const idx = s.players.p0.placed.findIndex((p) => p.cardId === CLOTH)
    s = applyAction(s, { type: 'rotatePlaced', player: 'p0', placedIndex: idx, delta: 1, pay: true })
    expect(resourceTotalOf(s.players.p0, 'wool')).toBe(1) // spent 2 wool
    expect(s.players.p0.placed[idx].level).toBe(1)
  })
})
