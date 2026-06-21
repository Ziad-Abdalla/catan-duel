// Canonical, serializable game state for the formal (rules-ENFORCING) sim.
// Distinct from the live game's trust-based GameState — this one is a clean
// reimplementation the AI can search over. Plain data only; all randomness flows
// through `rng` (see rng.ts) so apply() is pure and games are reproducible.

export type Resource = 'lumber' | 'brick' | 'wool' | 'grain' | 'ore' | 'gold'
export const RESOURCES: Resource[] = ['lumber', 'brick', 'wool', 'grain', 'ore', 'gold']

export type Seat = 'p0' | 'p1'
export const SEATS: Seat[] = ['p0', 'p1']
export function other(seat: Seat): Seat {
  return seat === 'p0' ? 'p1' : 'p0'
}

export type Mode = 'base' | 'gold' | 'turmoil' | 'progress' | 'duel'
/** preroll: may play pre-roll actions (Brigitta) then roll · action: build/play/trade · gameover. */
export type Phase = 'preroll' | 'action' | 'gameover'

/** The 5 event-die faces (4 black + 1 red Brigand). */
export type EventFace = 'brigand' | 'trade' | 'celebration' | 'plenty' | 'event'

export interface Region {
  resource: Resource
  number: number // printed production die number 1–6
  stored: number // 0..3 (hard cap; overflow lost)
}

export interface Center {
  kind: 'settlement' | 'city'
  /** indices into player.regions this center borders (for doubling / plague / year-of-plenty). */
  regions: number[]
  /** placed building/unit card ids; null = empty site. Length = capacity (2). */
  slots: (string | null)[]
}

export const CENTER_SLOTS = 2

export interface Player {
  id: Seat
  name: string
  regions: Region[]
  centers: Center[]
  /** roads built but not yet capped by a settlement = open ends available to expand. */
  pendingRoads: number
  hand: string[]
  hasHeroToken: boolean
  hasTradeToken: boolean
  /** once-per-turn ability markers (cleared at end of turn). */
  used: string[]
  /** Scout: the next settlement draws the best regions from the stack instead of the top. */
  scoutBest?: boolean
}

export interface GameState {
  mode: Mode
  /** which expansion theme set is live besides base ('base' for the intro game). */
  themeSet: 'base' | 'gold' | 'turmoil' | 'progress' | 'duel'
  winThreshold: number
  turn: number
  active: Seat
  phase: Phase
  players: Record<Seat, Player>
  /** face-down expansion draw stacks (card ids). */
  drawStacks: string[][]
  /** region card stack (drawn 2-at-a-time when a settlement is built). */
  regionStack: { resource: Resource; number: number }[]
  eventDeck: string[]
  discard: string[]
  /** limited central supply for build-direct open-stack cards (Merchant Guild / Hedge Tavern / University). */
  supply: Record<string, number>
  rng: number
  lastRoll?: { production: number; event: EventFace }
  /** Brigitta played this pre-roll → the active player chooses the production number. */
  chooseProduction?: boolean
  /** set when the game ends; the seat that won (or null = not over). */
  winner?: Seat | null
}

// ── Resource helpers ──────────────────────────────────────────────────────────

export function resourceTotal(p: Player, r: Resource): number {
  let n = 0
  for (const reg of p.regions) if (reg.resource === r) n += reg.stored
  return n
}

export function totalResources(p: Player): number {
  let n = 0
  for (const reg of p.regions) n += reg.stored
  return n
}

export function resourceVector(p: Player): Record<Resource, number> {
  const v = { lumber: 0, brick: 0, wool: 0, grain: 0, ore: 0, gold: 0 }
  for (const reg of p.regions) v[reg.resource] += reg.stored
  return v
}

export function canAfford(p: Player, cost: Partial<Record<Resource, number>>): boolean {
  for (const r of RESOURCES) {
    const need = cost[r] ?? 0
    if (need > 0 && resourceTotal(p, r) < need) return false
  }
  return true
}

/** Add n of a resource, filling that player's matching regions up to cap 3. Returns overflow lost. */
export function addResource(p: Player, r: Resource, n: number): number {
  let left = n
  for (const reg of p.regions) {
    if (left <= 0) break
    if (reg.resource !== r) continue
    const room = 3 - reg.stored
    const put = Math.min(room, left)
    reg.stored += put
    left -= put
  }
  return left // amount that couldn't be stored (lost)
}

/** Remove n of a resource from matching regions (assumes availability checked by caller). */
export function removeResource(p: Player, r: Resource, n: number): number {
  let left = n
  for (const reg of p.regions) {
    if (left <= 0) break
    if (reg.resource !== r) continue
    const take = Math.min(reg.stored, left)
    reg.stored -= take
    left -= take
  }
  return n - left // amount actually removed
}

export function spend(p: Player, cost: Partial<Record<Resource, number>>): void {
  for (const r of RESOURCES) {
    const need = cost[r] ?? 0
    if (need > 0) removeResource(p, r, need)
  }
}

// ── Structure helpers ─────────────────────────────────────────────────────────

export function allPlaced(p: Player): string[] {
  const out: string[] = []
  for (const c of p.centers) for (const s of c.slots) if (s) out.push(s)
  return out
}

export function hasCity(p: Player): boolean {
  return p.centers.some((c) => c.kind === 'city')
}

export function countCenters(p: Player, kind: 'settlement' | 'city'): number {
  return p.centers.filter((c) => c.kind === kind).length
}

/** Deep clone (structuredClone where available; plain-data fallback otherwise). */
export function cloneState(s: GameState): GameState {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sc = (globalThis as any).structuredClone as undefined | (<T>(x: T) => T)
  return sc ? sc(s) : (JSON.parse(JSON.stringify(s)) as GameState)
}
