import { describe, it, expect } from 'vitest'
import { quickToActions, effectFor, EVENT_EFFECTS, type QuickAction } from './effects'
import { EVENT_DIE_FACES } from './dice'

describe('quickToActions — QuickAction → engine Actions', () => {
  it('gainFixed adds the resource to the owner', () => {
    const qa: QuickAction = { kind: 'gainFixed', who: 'owner', resource: 'gold', count: 2, label: '' }
    expect(quickToActions(qa, 'p0')).toEqual([{ type: 'addResource', player: 'p0', resource: 'gold', count: 2 }])
  })

  it('gainChoice needs a chosen resource; without one it yields nothing', () => {
    const qa: QuickAction = { kind: 'gainChoice', who: 'owner', count: 1, label: '' }
    expect(quickToActions(qa, 'p1')).toEqual([])
    expect(quickToActions(qa, 'p1', 'wool')).toEqual([{ type: 'addResource', player: 'p1', resource: 'wool', count: 1 }])
  })

  it('steal transfers from the opponent to the owner', () => {
    const qa: QuickAction = { kind: 'steal', count: 1, label: '' }
    expect(quickToActions(qa, 'p0', 'ore')).toEqual([{ type: 'transferResource', from: 'p1', to: 'p0', resource: 'ore', count: 1 }])
  })

  it('give transfers from the owner to the opponent', () => {
    const qa: QuickAction = { kind: 'give', count: 1, label: '' }
    expect(quickToActions(qa, 'p1', 'brick')).toEqual([{ type: 'transferResource', from: 'p1', to: 'p0', resource: 'brick', count: 1 }])
  })

  it('vp / stat / used map to their actions', () => {
    expect(quickToActions({ kind: 'vp', who: 'owner', delta: 1, label: '' }, 'p0')).toEqual([{ type: 'adjustVP', player: 'p0', delta: 1 }])
    expect(quickToActions({ kind: 'stat', who: 'opponent', stat: 'skill', delta: -1, label: '' }, 'p0')).toEqual([{ type: 'adjustStat', player: 'p1', stat: 'skill', delta: -1 }])
    expect(quickToActions({ kind: 'used', key: 'gold-mint', label: '' }, 'p0')).toEqual([{ type: 'markUsed', player: 'p0', key: 'gold-mint' }])
  })

  it('focus kinds (setDie/grant/advantage) produce no immediate actions', () => {
    expect(quickToActions({ kind: 'setDie', label: '' }, 'p0')).toEqual([])
    expect(quickToActions({ kind: 'grant', label: '' }, 'p0')).toEqual([])
    expect(quickToActions({ kind: 'advantage', token: 'hero', label: '' }, 'p0')).toEqual([])
  })
})

describe('registry coverage', () => {
  it('Brigitte maps to a die-override step', () => {
    const steps = effectFor('base-brigitta-the-wise-woman')
    expect(steps?.[0].quick?.[0].kind).toBe('setDie')
  })

  it('every event-die face has at least one resolution step', () => {
    for (const face of EVENT_DIE_FACES) {
      expect(EVENT_EFFECTS[face].length).toBeGreaterThan(0)
    }
  })

  it('every registered step has non-empty guidance text', () => {
    for (const steps of Object.values(EVENT_EFFECTS)) {
      for (const s of steps) expect(s.text.trim().length).toBeGreaterThan(0)
    }
  })
})
