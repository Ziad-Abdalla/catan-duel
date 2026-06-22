import { describe, it, expect } from 'vitest'
import { newGame } from './newGame'
import { applyAction, computeStats, computeVP, resourceTotalOf } from './actions'

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

describe('attach-on-card (Bran/Judith/Metropolis)', () => {
  it('attachCard stacks a card on its host and both score together', () => {
    let s = newGame({ seed: 3, enabledSets: ['intrigue'] })
    s.players.p0.hand.push('intrigue-church', 'intrigue-bran-defender-of-the-temple')
    s = applyAction(s, { type: 'playCard', player: 'p0', cardId: 'intrigue-church', slot: 's0-up', pay: false })
    const vpBefore = computeVP(s.players.p0)
    s = applyAction(s, { type: 'attachCard', player: 'p0', cardId: 'intrigue-bran-defender-of-the-temple', hostSlot: 's0-up', pay: false })
    const bran = s.players.p0.placed.find((p) => p.cardId === 'intrigue-bran-defender-of-the-temple')
    expect(bran).toBeDefined()
    expect(bran!.attachedTo).toBe('s0-up')
    expect(s.players.p0.hand).not.toContain('intrigue-bran-defender-of-the-temple')
    // Bran carries the pair's 2 VP (Church is 0) → +2 over the pre-attach total
    expect(computeVP(s.players.p0)).toBe(vpBefore + 2)
  })
})

describe('Triumph marker contributes VP (Era of Barbarians)', () => {
  it('rotating the Triumph track raises victory points', () => {
    let s = newGame({ seed: 5, enabledSets: ['barbarians'] })
    const before = computeVP(s.players.p0)
    s = applyAction(s, { type: 'setMarker', player: 'p0', marker: 'triumph', level: 2 })
    expect(computeVP(s.players.p0)).toBe(before + 2)
    expect(s.players.p0.victoryPoints).toBe(before + 2) // finalize() synced the shown VP
  })
})

describe('per-level Residence scoring', () => {
  it('Cloth Residence commerce scales with rotation level', () => {
    let s = newGame({ seed: 9, enabledSets: ['merchants'] })
    s.players.p0.hand.push(CLOTH)
    s = applyAction(s, { type: 'playRegionExpansion', player: 'p0', cardId: CLOTH, regionIndex: 3, pay: false })
    const idx = s.players.p0.placed.findIndex((p) => p.cardId === CLOTH)
    const base = computeStats(s.players.p0).commerce
    for (let i = 0; i < 2; i++) s = applyAction(s, { type: 'rotatePlaced', player: 'p0', placedIndex: idx, delta: 1, pay: false })
    expect(computeStats(s.players.p0).commerce).toBe(base + 2) // level 2 => +2 commerce
  })

  it('Paper Residence at top level yields commerce + progress + VP', () => {
    const PAPER = 'merchants-paper-merchants-residence'
    let s = newGame({ seed: 11, enabledSets: ['merchants'] })
    s.players.p0.hand.push(PAPER)
    s = applyAction(s, { type: 'playRegionExpansion', player: 'p0', cardId: PAPER, regionIndex: 1, pay: false }) // index 1 = forest
    const idx = s.players.p0.placed.findIndex((p) => p.cardId === PAPER)
    const vp0 = computeVP(s.players.p0)
    for (let i = 0; i < 3; i++) s = applyAction(s, { type: 'rotatePlaced', player: 'p0', placedIndex: idx, delta: 1, pay: false })
    const st = computeStats(s.players.p0)
    expect(st.commerce).toBe(1)
    expect(st.progress).toBe(1)
    expect(computeVP(s.players.p0)).toBe(vp0 + 1) // +1 VP at level 3
  })
})
