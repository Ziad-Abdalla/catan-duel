import { describe, it, expect } from 'vitest'
import { CARDS, getCard } from './cards'

// The authoritative face-up expansion stack per the official rulebooks (see
// docs/goal-2026-06-24-fixes/C-card-data.md). The "(1x)" suffix is NOT the marker;
// each era's setup sentence names these exact cards + copy counts.
const EXPECTED_FACE_UP: Record<string, number> = {
  'gold-merchant-guild': 2,
  'turmoil-hedge-tavern-1x': 2,
  'progress-university': 2,
  'intrigue-church': 2,
  'intrigue-odins-temple': 2,
  'merchants-commercial-harbor': 2,
  'barbarians-castle': 2,
  'barbarians-triumph-card': 2,
  'explorers-shipyard': 2,
  'sages-manifest-of-humane-conduct': 2,
  'prosperity-builders-hut': 2,
  'prosperity-prince': 1,
  'prosperity-princess': 1,
}

describe('corpus — face-up expansion stack matches the rulebooks', () => {
  it('exactly the 13 authoritative cards carry the Face-up Expansion tag', () => {
    const tagged = CARDS.filter((c) => c.tag === 'Face-up Expansion').map((c) => c.id).sort()
    expect(tagged).toEqual(Object.keys(EXPECTED_FACE_UP).sort())
  })

  it('each face-up card has the rulebook copy count', () => {
    for (const [id, copies] of Object.entries(EXPECTED_FACE_UP)) {
      expect(getCard(id)?.copies, id).toBe(copies)
    }
  })

  it('Church and Odin\'s Temple are face-up (the owner correction)', () => {
    expect(getCard('intrigue-church')?.tag).toBe('Face-up Expansion')
    expect(getCard('intrigue-odins-temple')?.tag).toBe('Face-up Expansion')
  })

  it('Odin\'s Priest (action) and Odin\'s Fountain (drawn 1x) are NOT face-up', () => {
    expect(getCard('intrigue-odins-priest')?.tag).not.toBe('Face-up Expansion')
    expect(getCard('intrigue-odins-fountain')?.tag).not.toBe('Face-up Expansion')
  })
})

describe('corpus — data hygiene', () => {
  it('contains no extraction-artifact junk cards', () => {
    expect(getCard('sages-unknown')).toBeUndefined()
    expect(getCard('prosperity-card-back')).toBeUndefined()
  })

  it('no buildable card has an empty/placeholder name', () => {
    const blanks = CARDS.filter(
      (c) => c.category === 'building' && (!c.name?.trim() || /^(unknown|card back)$/i.test(c.name)),
    )
    expect(blanks.map((c) => c.id)).toEqual([])
  })

  it('Explorer Metropolis requires is a clean predicate (no embedded sentence/prefix)', () => {
    const req = getCard('explorers-explorer-metropolis')?.values?.requires ?? ''
    expect(req).not.toMatch(/Requires:/i)
    expect(req).not.toMatch(/Place on/i)
    expect(req.endsWith('.')).toBe(false)
  })

  it('no card carries a <MISSING> placeholder token in unclear[]', () => {
    const dirty = CARDS.filter((c) => c.unclear?.some((u) => /<MISSING>/.test(u)))
    expect(dirty.map((c) => c.id)).toEqual([])
  })
})
