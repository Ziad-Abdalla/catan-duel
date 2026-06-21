import { describe, it, expect } from 'vitest'
import { newGame } from '../../engine/newGame'
import { applyAction } from '../../engine/actions'
import { planAiActions } from './aiController'
import type { PlayerId } from '../../types'

// Regression for the "free road" bug: the orchestrator used to map every sim
// buildSettlement to expandSpine (settlement+road), so a settlement built on a
// PRE-EXISTING pending road added an unpaid road. The pairs mapping fixes it:
// live roads added must equal plan.roads, settlements added must equal plan.settlements.
const roads = (p: { placed: { cardId: string }[] }) => p.placed.filter((c) => c.cardId === 'base-road').length
const setts = (p: { placed: { cardId: string }[] }) =>
  p.placed.filter((c) => c.cardId === 'base-settlement' || c.cardId === 'base-city').length

describe('AI build mapping (free-road regression)', () => {
  it('adds exactly plan.roads roads + plan.settlements settlements (incl. settlement on a pending road)', () => {
    const ai: PlayerId = 'p1'
    let s = newGame({ seed: 3 })
    // give p1 a standalone pending road (frontier) + plenty of resources
    s = { ...s, players: { ...s.players, p1: { ...s.players.p1, placed: [...s.players.p1.placed, { cardId: 'base-road', slot: 'road-2' }] } } }
    for (const r of s.players.p1.regions) r.stored = 3
    s = applyAction(s, { type: 'roll', production: 2, event: 'event-card' })
    s = applyAction(s, { type: 'dismissEvent' })

    const r0 = roads(s.players[ai]), s0 = setts(s.players[ai])
    const plan = planAiActions(s, ai, 'medium', { v: 9 })

    const S = plan.settlements, R = plan.roads, pairs = Math.min(S, R)
    for (let i = 0; i < pairs; i++) { if (s.regionStack.length < 2) break; s = applyAction(s, { type: 'expandSpine', player: ai }) }
    for (let i = 0; i < R - pairs; i++) s = applyAction(s, { type: 'buildPiece', player: ai, piece: 'road', end: 'right', pay: false })
    for (let i = 0; i < S - pairs; i++) {
      s = applyAction(s, { type: 'buildPiece', player: ai, piece: 'settlement', end: 'right', pay: false })
      s.players[ai].regions.forEach((r, idx) => { if (r.empty && s.regionStack.length > 0) s = applyAction(s, { type: 'placeLandscape', player: ai, regionIndex: idx }) })
    }

    expect(roads(s.players[ai]) - r0).toBe(R) // never a free extra road
    expect(setts(s.players[ai]) - s0).toBe(S)
  })
})
