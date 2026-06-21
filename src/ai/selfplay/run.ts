// Headless self-play: pit two choosers against each other for N seeded games and
// collect structured per-game data. Pure (no fs); analyze.ts / report.ts consume
// the results.

import { setupGame } from '../sim/setup'
import { legalMoves, apply, type Move } from '../sim/moves'
import { isOver } from '../sim/win'
import { tallies } from '../sim/tokens'
import { type GameState, type Mode, type Seat, SEATS } from '../sim/state'
import { deriveSeed } from '../sim/rng'
import { maybeDef } from '../cards'

/** A chooser acts for s.active. Returns [chosen move, next chooser-rng]. */
export type Chooser = (s: GameState, rng: number) => [Move, number]

export interface VpBreakdown { settlements: number; cities: number; buildings: number; tokens: number }
export interface GameResult {
  winner: Seat | null
  turns: number
  plies: number
  illegal: number
  finalVp: Record<Seat, number>
  vpSource: Record<Seat, VpBreakdown>
  placements: Record<string, number>
  actions: Record<string, number>
  builds: { roads: number; settlements: number; cities: number }
  eventFaces: Record<string, number>
  tokenClaims: { hero: boolean; trade: boolean } // ever held during the game
}

function vpBreakdown(s: GameState, seat: Seat): VpBreakdown {
  const p = s.players[seat]
  let settlements = 0, cities = 0, buildings = 0
  for (const c of p.centers) {
    if (c.kind === 'settlement') settlements += 1
    else cities += 2
    for (const id of c.slots) if (id) buildings += maybeDef(id)?.points.vp ?? 0
  }
  const tokens = (p.hasHeroToken ? 1 : 0) + (p.hasTradeToken ? 1 : 0)
  return { settlements, cities, buildings, tokens }
}

export function playGame(
  seed: number,
  p0: Chooser,
  p1: Chooser,
  maxPlies = 6000,
): GameResult {
  let s = setupGame({ seed, mode: 'base' })
  return playFrom(s, seed, { p0, p1 }, maxPlies)
}

export function playFrom(
  start: GameState,
  seed: number,
  choosers: Record<Seat, Chooser>,
  maxPlies = 6000,
): GameResult {
  let s = start
  let crng = deriveSeed(seed, 0x5e1f)
  let plies = 0, illegal = 0
  const placements: Record<string, number> = {}
  const actions: Record<string, number> = {}
  const builds = { roads: 0, settlements: 0, cities: 0 }
  const eventFaces: Record<string, number> = {}
  const tokenClaims = { hero: false, trade: false }

  while (!isOver(s) && plies < maxPlies) {
    const moves = legalMoves(s)
    if (moves.length === 0) { illegal++; break }
    const [m, nr] = choosers[s.active](s, crng)
    crng = nr
    if (m.t === 'placeCard') placements[m.cardId] = (placements[m.cardId] ?? 0) + 1
    else if (m.t === 'playAction') actions[m.cardId] = (actions[m.cardId] ?? 0) + 1
    else if (m.t === 'playBrigitta' || m.t === 'playReiner') actions[m.cardId] = (actions[m.cardId] ?? 0) + 1
    else if (m.t === 'buildRoad') builds.roads++
    else if (m.t === 'buildSettlement') builds.settlements++
    else if (m.t === 'upgradeCity') builds.cities++
    s = apply(s, m)
    if (s.lastRoll) eventFaces[s.lastRoll.event] = (eventFaces[s.lastRoll.event] ?? 0) + 1
    if (s.players.p0.hasHeroToken || s.players.p1.hasHeroToken) tokenClaims.hero = true
    if (s.players.p0.hasTradeToken || s.players.p1.hasTradeToken) tokenClaims.trade = true
    plies++
  }

  return {
    winner: s.winner ?? null,
    turns: s.turn,
    plies,
    illegal,
    finalVp: { p0: tallies(s.players.p0).vp, p1: tallies(s.players.p1).vp },
    vpSource: { p0: vpBreakdown(s, 'p0'), p1: vpBreakdown(s, 'p1') },
    placements, actions, builds, eventFaces, tokenClaims,
  }
}

export interface SeriesResult { mode: Mode; games: GameResult[] }

export function playSeries(
  games: number,
  p0: Chooser,
  p1: Chooser,
  mode: Mode = 'base',
  baseSeed = 1,
): SeriesResult {
  const out: GameResult[] = []
  for (let i = 0; i < games; i++) {
    let s = setupGame({ seed: baseSeed + i, mode })
    out.push(playFrom(s, baseSeed + i, { p0, p1 }))
  }
  return { mode, games: out }
}

export { SEATS }
