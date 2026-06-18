import { describe, it, expect } from 'vitest'
import { CARDS, displaySummary } from '../data/cards'

// The completeness bar: every card must present SOMETHING to read in the
// resolution panel, and (trust-based) every card is resolvable via the universal
// toolkit — so the only thing to guarantee here is that no card is blank.
describe('completeness — no inert / blank cards', () => {
  const playable = CARDS.filter((c) => c.category !== 'region')

  it('every playable card yields a non-empty resolution summary', () => {
    const blank = playable.filter((c) => !displaySummary(c).trim())
    expect(blank.map((c) => c.id)).toEqual([])
  })

  it('every card with a printed cost lists at least one resource', () => {
    for (const c of CARDS) {
      if (!c.cost) continue
      for (const entry of c.cost) {
        expect(entry.count).toBeGreaterThan(0)
        expect(entry.resource).toBeTruthy()
      }
    }
  })

  it('the build pieces (settlement/city/road) all carry a cost', () => {
    for (const id of ['base-settlement', 'base-city', 'base-road']) {
      const c = CARDS.find((x) => x.id === id)!
      expect(c.cost && c.cost.length).toBeGreaterThan(0)
    }
  })
})
