// Aggregate self-play results into a sane/insane verdict + behavioural flags.

import { type SeriesResult } from './run'
import { allDefs } from '../cards'
import { cardName, type SetId } from '../cards/data'
import type { Mode } from '../sim/state'

export interface Analysis {
  mode: Mode
  games: number
  winRate: { p0: number; p1: number; draws: number }
  turns: { avg: number; min: number; max: number }
  illegalTotal: number
  vpSourceAvg: { settlements: number; cities: number; buildings: number; tokens: number }
  builds: { roads: number; settlements: number; cities: number } // per game
  eventFaceShare: Record<string, number>
  cardUsage: { id: string; name: string; plays: number }[]
  neverPlayed: { id: string; name: string }[]
  flags: string[]
}

const SET_OF_MODE: Record<Mode, SetId[]> = {
  base: ['base'],
  gold: ['base', 'gold'],
  turmoil: ['base', 'turmoil'],
  progress: ['base', 'progress'],
  duel: ['base', 'gold', 'turmoil', 'progress'],
}

export function analyze(res: SeriesResult): Analysis {
  const g = res.games
  const n = g.length || 1
  const wins = { p0: 0, p1: 0, draws: 0 }
  let turnSum = 0, turnMin = Infinity, turnMax = 0, illegalTotal = 0
  const vps = { settlements: 0, cities: 0, buildings: 0, tokens: 0 }
  const builds = { roads: 0, settlements: 0, cities: 0 }
  const faces: Record<string, number> = {}
  const usage: Record<string, number> = {}
  let heroEver = 0, tradeEver = 0

  for (const r of g) {
    if (r.winner === 'p0') wins.p0++
    else if (r.winner === 'p1') wins.p1++
    else wins.draws++
    turnSum += r.turns; turnMin = Math.min(turnMin, r.turns); turnMax = Math.max(turnMax, r.turns)
    illegalTotal += r.illegal
    for (const seat of ['p0', 'p1'] as const) {
      const b = r.vpSource[seat]
      vps.settlements += b.settlements; vps.cities += b.cities
      vps.buildings += b.buildings; vps.tokens += b.tokens
    }
    builds.roads += r.builds.roads; builds.settlements += r.builds.settlements; builds.cities += r.builds.cities
    for (const [f, c] of Object.entries(r.eventFaces)) faces[f] = (faces[f] ?? 0) + c
    for (const [id, c] of Object.entries(r.placements)) usage[id] = (usage[id] ?? 0) + c
    for (const [id, c] of Object.entries(r.actions)) usage[id] = (usage[id] ?? 0) + c
    if (r.tokenClaims.hero) heroEver++
    if (r.tokenClaims.trade) tradeEver++
  }

  const faceTotal = Object.values(faces).reduce((a, b) => a + b, 0) || 1
  const eventFaceShare: Record<string, number> = {}
  for (const [f, c] of Object.entries(faces)) eventFaceShare[f] = c / faceTotal

  // universe of playable (non-spine, non-event) cards for the active sets
  const sets = SET_OF_MODE[res.mode]
  const universe = allDefs().filter((d) => sets.includes(d.set as SetId) && (d.placeable || d.isAction))
  const cardUsage = universe
    .map((d) => ({ id: d.id, name: d.name, plays: usage[d.id] ?? 0 }))
    .sort((a, b) => b.plays - a.plays)
  const neverPlayed = cardUsage.filter((c) => c.plays === 0).map(({ id, name }) => ({ id, name }))

  const flags: string[] = []
  if (illegalTotal > 0) flags.push(`❌ ${illegalTotal} illegal-move attempts (MUST be 0)`)
  const seatBias = Math.abs(wins.p0 - wins.p1) / n
  if (seatBias > 0.2) flags.push(`⚠ large seat bias (${(seatBias * 100).toFixed(0)}%) — possible rules asymmetry`)
  if (builds.cities / n < 0.3) flags.push(`⚠ cities rarely built (${(builds.cities / n).toFixed(2)}/game)`)
  if (tradeEver / n < 0.2) flags.push(`⚠ trade token rarely contested (${(tradeEver / n * 100).toFixed(0)}% of games)`)
  if (heroEver / n < 0.2) flags.push(`⚠ hero token rarely contested (${(heroEver / n * 100).toFixed(0)}% of games)`)
  if (turnMax > 200) flags.push(`⚠ some games very long (max ${turnMax} turns) — possible stall`)
  for (const c of neverPlayed) flags.push(`⚠ never played: ${c.name} (${c.id})`)

  const denom = n * 2
  return {
    mode: res.mode,
    games: n,
    winRate: { p0: wins.p0 / n, p1: wins.p1 / n, draws: wins.draws / n },
    turns: { avg: turnSum / n, min: turnMin === Infinity ? 0 : turnMin, max: turnMax },
    illegalTotal,
    vpSourceAvg: {
      settlements: vps.settlements / denom, cities: vps.cities / denom,
      buildings: vps.buildings / denom, tokens: vps.tokens / denom,
    },
    builds: { roads: builds.roads / n, settlements: builds.settlements / n, cities: builds.cities / n },
    eventFaceShare,
    cardUsage,
    neverPlayed,
    flags,
  }
}

export { cardName }
