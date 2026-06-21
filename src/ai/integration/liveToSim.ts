// Bridge: build a sim GameState (the AI's "brain" model) from the LIVE trust-based
// GameState. The AI thinks on the sim; the live store stays the display authority.
// Geometry is best-effort (the live model has no structured center↔region adjacency)
// — that only affects AI decision *quality* slightly, never board correctness, since
// the controller reconciles resources by net total and builds via real actions.

import type { GameState as LiveState, PlayerState as LivePlayer, PlayerId } from '../../types'
import {
  type GameState as SimState, type Player as SimPlayer, type Region, type Center, type Mode,
  CENTER_SLOTS,
} from '../sim/state'
import { maybeDef } from '../cards'

const SETTLEMENT = new Set(['base-settlement'])
const CITY = new Set(['base-city'])

function liveMode(live: LiveState): { mode: Mode; theme: SimState['themeSet'] } {
  const eras = (live.enabledSets ?? []).filter((s) => s !== 'base')
  if (eras.length === 0) return { mode: 'base', theme: 'base' }
  if (eras.length >= 3) return { mode: 'duel', theme: 'duel' }
  return { mode: eras[0] as Mode, theme: eras[0] as SimState['themeSet'] }
}

/** seat index of a placed settlement/city, from its slot `settle-{j}`. */
function seatIndex(slot: string | undefined): number | null {
  const m = /^settle-(\d+)$/.exec(slot ?? '')
  return m ? Number(m[1]) : null
}
/** seat a building/unit sits at, from its slot `s{j}-...`. */
function buildingSeat(slot: string | undefined): number | null {
  const m = /^s(\d+)-/.exec(slot ?? '')
  return m ? Number(m[1]) : null
}

function toSimPlayer(lp: LivePlayer): SimPlayer {
  // regions (skip open/empty landscape slots)
  const regions: Region[] = lp.regions
    .filter((r) => !r.empty)
    .map((r) => ({ resource: r.resource, number: r.number ?? 0, stored: Math.max(0, Math.min(3, r.stored)) }))

  // centers from placed settlements/cities, ordered by seat index
  const seats = lp.placed
    .map((pc, i) => ({ pc, i, seat: seatIndex(pc.slot) }))
    .filter((x) => SETTLEMENT.has(x.pc.cardId) || CITY.has(x.pc.cardId))
    .sort((a, b) => (a.seat ?? a.i) - (b.seat ?? b.i))

  const numCenters = Math.max(1, seats.length)
  // round-robin region assignment (approximate adjacency)
  const centerRegions: number[][] = Array.from({ length: numCenters }, () => [])
  regions.forEach((_, ri) => centerRegions[ri % numCenters].push(ri))

  const centers: Center[] = seats.map((s, ci) => {
    const seatNo = s.seat ?? ci
    const cards = lp.placed
      .filter((pc) => buildingSeat(pc.slot) === seatNo && (maybeDef(pc.cardId)?.placeable))
      .map((pc) => pc.cardId)
      .slice(0, CENTER_SLOTS)
    const slots: (string | null)[] = Array(CENTER_SLOTS).fill(null)
    cards.forEach((id, k) => { slots[k] = id })
    return { kind: CITY.has(s.pc.cardId) ? 'city' : 'settlement', regions: centerRegions[ci] ?? [], slots }
  })
  // safety: if no centers parsed, make one holding all regions
  if (centers.length === 0) centers.push({ kind: 'settlement', regions: regions.map((_, i) => i), slots: Array(CENTER_SLOTS).fill(null) })

  const roads = lp.placed.filter((pc) => pc.cardId === 'base-road').length
  const pendingRoads = Math.max(0, roads - Math.max(0, seats.length - 1)) // roads beyond those linking settlements

  return {
    id: lp.id, name: lp.name,
    regions, centers, pendingRoads,
    hand: [...lp.hand],
    hasHeroToken: lp.hasHeroToken, hasTradeToken: lp.hasTradeToken,
    used: [...(lp.usedThisTurn ?? [])],
  }
}

const PHASE_MAP: Record<string, SimState['phase']> = {
  roll: 'preroll', action: 'action', replenish: 'action', exchange: 'action', gameover: 'gameover',
}

export function liveToSim(live: LiveState): SimState {
  const { mode, theme } = liveMode(live)
  const regionStack = live.regionStack.map((id) => {
    const m = /^region-([a-z-]+)-(\d+)$/.exec(id)
    return m
      ? { resource: m[1] as Region['resource'], number: Number(m[2]) }
      : { resource: 'lumber' as Region['resource'], number: 0 }
  })
  return {
    mode, themeSet: theme,
    winThreshold: live.winThreshold ?? (mode === 'base' ? 7 : mode === 'duel' ? 13 : 12),
    turn: live.turn,
    active: live.activePlayer,
    phase: live.phase === 'gameover' || live.winner ? 'gameover' : (PHASE_MAP[live.phase] ?? 'action'),
    players: { p0: toSimPlayer(live.players.p0), p1: toSimPlayer(live.players.p1) },
    drawStacks: live.drawStacks.map((st) => [...st]),
    regionStack,
    eventDeck: [...live.eventDeck],
    discard: [...live.discard],
    supply: { ...live.supply },
    rng: ((live.seq + 1) * 2654435761) >>> 0,
    winner: live.winner ?? null,
  }
}

export type { LiveState, PlayerId }
