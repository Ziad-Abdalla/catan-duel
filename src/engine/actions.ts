// Pure game-state reducer for Catan Duel. NO React / store imports here — the
// engine stays serializable so Phase 2 can broadcast snapshots verbatim.
//
// Trust-based manual play: these reducers MOVE and TRACK state (rotate regions,
// move cards, tally VP). They do NOT enforce rule legality — anything a player
// could do at the table is allowed here too.

import type { GameState, PlayerId, PlayerState, Phase, RegionSlot, ResourceType, Stat } from '../types'
import { getCard } from '../data/cards'
import { startingStored } from '../data/setup'
import { makeRng, shuffle } from './rng'
import type { EventFace } from './dice'

/** The festival/Yule event card and where it sits in the event deck (4th from the bottom). */
export const YULE_ID = 'base-yule'
export const YULE_FROM_BOTTOM = 3

/** Put Yule the right distance from the bottom (index 0 = bottom); deterministic. */
export function seatYule(deck: string[]): string[] {
  const out = deck.filter((id) => id !== YULE_ID)
  out.splice(Math.min(YULE_FROM_BOTTOM, out.length), 0, YULE_ID)
  return out
}

export type AdvantageToken = 'hero' | 'trade'

export type Action =
  // dice
  | { type: 'roll'; production: number; event: EventFace }
  | { type: 'applyProduction' } // convenience: bump every region matching lastRoll for both players
  // regions
  | { type: 'rotateRegion'; player: PlayerId; regionIndex: number } // cycle stored 0→1→2→3→0
  | { type: 'setStored'; player: PlayerId; regionIndex: number; stored: 0 | 1 | 2 | 3 }
  | { type: 'drawRegion'; player: PlayerId } // pop region stack → new region in the principality
  // cards
  | { type: 'drawToHand'; player: PlayerId; stackIndex: number }
  | { type: 'playCard'; player: PlayerId; cardId: string; slot?: string; pay?: boolean } // pay defaults true: spend the card's cost (best-effort)
  | { type: 'returnToHand'; player: PlayerId; placedIndex: number }
  | { type: 'discardToStack'; player: PlayerId; cardId: string; stackIndex: number } // end-of-turn exchange: tuck a card under a draw stack
  | { type: 'discardCard'; player: PlayerId; from: 'hand' | 'placed'; cardId?: string; placedIndex?: number } // route a card to the shared discard pile (or back to a face-up supply)
  | { type: 'drawEvent' } // reveal top event card (pops up on both screens); resolution is manual
  | { type: 'dismissEvent' } // clear the revealed event pop-up
  // spine
  | { type: 'upgradeCity'; player: PlayerId; seat: number; pay?: boolean } // settlement → city in place
  | { type: 'expandSpine'; player: PlayerId } // +settlement +road, draw 2 regions
  | { type: 'buildPiece'; player: PlayerId; piece: 'road' | 'settlement'; end?: 'left' | 'right'; slot?: number; pay?: boolean } // manual placement; road `slot` = road-slot index
  | { type: 'placeLandscape'; player: PlayerId; regionIndex: number } // fill an empty landscape slot from the region stack
  | { type: 'removePlaced'; player: PlayerId; placedIndex: number } // drag a placed road/building back off the board
  // misc
  | { type: 'renamePlayer'; player: PlayerId; name: string }
  // scoring
  | { type: 'adjustVP'; player: PlayerId; delta: number }
  | { type: 'setToken'; player: PlayerId | null; token: AdvantageToken }
  // ---- universal resolution toolkit (enacts ANY card effect, all serializable) ----
  // resources live as region `stored` 0–3; addResource distributes +/- across matching regions
  | { type: 'addResource'; player: PlayerId; resource: ResourceType; count: number }
  | { type: 'transferResource'; from: PlayerId | 'bank'; to: PlayerId | 'bank'; resource: ResourceType; count: number }
  | { type: 'adjustStat'; player: PlayerId; stat: Stat; delta: number }
  | { type: 'grantCard'; player: PlayerId; cardId: string; fromStack?: number } // materialise / pull a card into hand
  | { type: 'setDice'; production?: number; event?: EventFace } // override the roll WITHOUT changing phase
  | { type: 'markUsed'; player: PlayerId; key: string } // once-per-turn marker
  | { type: 'logNote'; player: PlayerId; text: string } // free-form table note
  | { type: 'setWinThreshold'; value: number } // configurable VP target (7/12/13/15 or custom)
  // vote-to-end (no forced freeze): a player claims, the opponent agrees
  | { type: 'claimVictory'; player: PlayerId }
  | { type: 'agreeVictory'; player: PlayerId } // the OTHER player agreeing concludes the game
  | { type: 'declineVictory' }
  // flow
  | { type: 'nextPhase' }
  | { type: 'endTurn' }

/** Derived victory points: settlements (1) + cities (2) + building/hero VP + manual adjust. */
export function computeVP(p: PlayerState): number {
  let vp = 0
  for (const pc of p.placed) {
    const c = getCard(pc.cardId)
    if (!c) continue
    if (c.category === 'settlement') vp += 1
    else if (c.category === 'city') vp += 2
    else vp += c.values?.victory_points ?? 0
  }
  return vp + p.vpAdjust
}

export interface Stats {
  vp: number
  strength: number
  skill: number
  commerce: number
  progress: number
}

/** Per-player tallies derived from placed cards' printed values + manual nudges. */
export function computeStats(p: PlayerState): Stats {
  let strength = 0,
    skill = 0,
    commerce = 0,
    progress = 0
  for (const pc of p.placed) {
    const v = getCard(pc.cardId)?.values
    if (!v) continue
    strength += v.strength ?? 0
    skill += v.skill ?? 0
    commerce += v.commerce ?? 0
    progress += v.progress ?? 0
  }
  const a = p.statAdjust ?? {}
  return {
    vp: computeVP(p),
    strength: strength + (a.strength ?? 0),
    skill: skill + (a.skill ?? 0),
    commerce: commerce + (a.commerce ?? 0),
    progress: progress + (a.progress ?? 0),
  }
}

/** Total resources a player is storing across all regions (e.g. Brigand's "more than 7"). */
export function resourceTotal(p: PlayerState): number {
  return p.regions.reduce((n, r) => n + (r.empty ? 0 : r.stored), 0)
}

/** Total of one resource type stored across a player's regions. */
export function resourceTotalOf(p: PlayerState, resource: ResourceType): number {
  return p.regions.reduce((n, r) => n + (!r.empty && r.resource === resource ? r.stored : 0), 0)
}

/** Trust-based SUGGESTION of who holds each advantage (strength → hero, commerce → trade).
 *  Returns the strict leader (with a positive tally) or null on a tie / nobody. */
export function suggestAdvantage(s: GameState): { hero: PlayerId | null; trade: PlayerId | null } {
  const a = computeStats(s.players.p0)
  const b = computeStats(s.players.p1)
  const lead = (x: number, y: number): PlayerId | null => (x > y && x > 0 ? 'p0' : y > x && y > 0 ? 'p1' : null)
  return { hero: lead(a.strength, b.strength), trade: lead(a.commerce, b.commerce) }
}

const WIN_VP = 7

// ---- small immutable helpers (shallow clone the slices we touch) ----

function clonePlayer(p: PlayerState): PlayerState {
  return {
    ...p,
    hand: [...p.hand],
    regions: p.regions.map((r) => ({ ...r })),
    placed: p.placed.map((c) => ({ ...c })),
    statAdjust: { ...(p.statAdjust ?? {}) },
    usedThisTurn: [...(p.usedThisTurn ?? [])],
  }
}

/** Add/remove `count` of a resource across a player's matching regions (cap 0..3 each).
 *  Trust-based: overflow that won't fit (all regions full) is silently dropped. */
function distributeResource(p: PlayerState, resource: ResourceType, count: number): void {
  let remaining = count
  if (remaining > 0) {
    for (const r of p.regions) {
      if (remaining <= 0) break
      if (r.empty || r.resource !== resource) continue
      const room = 3 - r.stored
      const take = Math.min(room, remaining)
      r.stored = (r.stored + take) as 0 | 1 | 2 | 3
      remaining -= take
    }
  } else if (remaining < 0) {
    let toRemove = -remaining
    for (const r of p.regions) {
      if (toRemove <= 0) break
      if (r.empty || r.resource !== resource) continue
      const take = Math.min(r.stored, toRemove)
      r.stored = (r.stored - take) as 0 | 1 | 2 | 3
      toRemove -= take
    }
  }
}

function withPlayer(s: GameState, id: PlayerId, mut: (p: PlayerState) => void): GameState {
  const players = { ...s.players, [id]: clonePlayer(s.players[id]) }
  mut(players[id])
  return { ...s, players }
}

function other(id: PlayerId): PlayerId {
  return id === 'p0' ? 'p1' : 'p0'
}

// ---- audit log + cost/lifecycle helpers ----

/** Display label for a resource in the log. `grain` reads as "wheat" (rebrand). */
function resLabel(r: ResourceType): string {
  return r === 'grain' ? 'wheat' : r
}

/** Format a cost list as a signed delta string, e.g. "-1 wood, -1 brick". */
function fmtCost(cost: { resource: ResourceType; count: number }[]): string {
  return cost.map((c) => `-${c.count} ${resLabel(c.resource)}`).join(', ')
}

/** Spend a card's cost best-effort across the player's regions (never goes negative). */
function spendCost(p: PlayerState, cost?: { resource: ResourceType; count: number }[]): void {
  for (const c of cost ?? []) distributeResource(p, c.resource, -c.count)
}

/** Where a card goes when it leaves play: face-up expansions + structural pieces return
 *  to the supply (no discard entry); everything else (actions/buildings/units) is discarded. */
function discardHome(cardId: string): 'discard' | 'supply' {
  const c = getCard(cardId)
  if (!c) return 'discard'
  if (c.tag === 'Face-up Expansion') return 'supply'
  if (['settlement', 'city', 'road', 'region'].includes(c.category)) return 'supply'
  return 'discard'
}

/** Append an audit-log entry attributed to a player. */
function logged(s: GameState, player: PlayerId, text: string): GameState {
  return { ...s, log: [...s.log, { turn: s.turn, player, text }] }
}

/**
 * Recompute both players' VP from the board and derive ELIGIBILITY fresh each time
 * (the leader at/above the threshold). Eligibility is a non-blocking signal — it
 * never freezes the game (that's the goal: no forced game-over). The actual winner
 * is set only through the vote-to-end flow (claimVictory → opponent agreeVictory).
 * Deriving fresh means a later correction (undo, removing a building, raising the
 * threshold) clears stale eligibility automatically.
 */
export function finalize(s: GameState): GameState {
  const players = { ...s.players }
  const threshold = s.winThreshold ?? WIN_VP
  let eligible: PlayerId | undefined
  let bestVp = -Infinity
  for (const id of ['p0', 'p1'] as PlayerId[]) {
    const vp = computeVP(players[id])
    if (vp !== players[id].victoryPoints) players[id] = { ...players[id], victoryPoints: vp }
    if (vp >= threshold && vp > bestVp) {
      eligible = id
      bestVp = vp
    }
  }
  return { ...s, players, eligible }
}

/** Parse a region card id like `region-gold-3` → { resource, number }. */
function parseRegionId(id: string): { resource: ResourceType; number: number | null } {
  const rest = id.replace(/^region-/, '')
  const dash = rest.lastIndexOf('-')
  const resource = rest.slice(0, dash) as ResourceType
  const n = Number(rest.slice(dash + 1))
  return { resource, number: Number.isFinite(n) ? n : null }
}

/** Build a region slot from a region card id (new regions start at setup storage). */
function makeRegionSlot(id: string): RegionSlot {
  const { resource, number } = parseRegionId(id)
  return { cardId: id, resource, number, stored: startingStored(resource) }
}

/** An open landscape slot — created when a settlement is built, filled later by the player. */
function emptyRegionSlot(): RegionSlot {
  return { cardId: '', resource: 'lumber', number: null, stored: 0, empty: true }
}

function countCategory(p: PlayerState, cats: string[]): number {
  let n = 0
  for (const pc of p.placed) {
    const c = getCard(pc.cardId)
    if (c && cats.includes(c.category)) n++
  }
  return n
}

const PHASE_ORDER: Phase[] = ['roll', 'action', 'replenish', 'exchange']

/**
 * Apply one action, returning a NEW state with an incremented `seq`.
 * Never mutates the input.
 */
export function applyAction(state: GameState, action: Action): GameState {
  const next = reduce(state, action)
  // Bump the per-seat version for whichever player sub-state actually changed
  // (immutable reducers create a new player object only for touched seats).
  const seatSeq = { ...state.seatSeq }
  for (const id of ['p0', 'p1'] as PlayerId[]) {
    if (next.players[id] !== state.players[id]) seatSeq[id] = (seatSeq[id] ?? 0) + 1
  }
  return { ...next, seq: state.seq + 1, seatSeq }
}

/**
 * Seat-authority merge of two snapshots (a peer's + ours). Each player's own
 * sub-state is kept from whichever snapshot has the higher per-seat version, so
 * simultaneous edits to DIFFERENT seats never clobber each other (the fix for
 * "resource tokens randomly vanish"). Shared zones take the higher global seq;
 * the log keeps the longer history; VP/winner are recomputed.
 *
 * Every choice is broken by a stable, order-independent comparator, so the merge
 * is COMMUTATIVE: merge(a,b) === merge(b,a). That makes it a true join — once two
 * clients have exchanged snapshots they converge to a byte-identical state, so the
 * "did I contribute?" rebroadcast reaches a fixed point and can't ping-pong.
 *
 * Residual (documented): shared decks/discard are taken whole from one lineage, so
 * two players drawing/discarding in the SAME network tick resolve to one lineage
 * (consistently on both screens). Turn-based play — only the active player touches
 * the shared decks — avoids it; cross-player effects touch the other seat's player
 * sub-state, which IS conflict-free. Full deck-level concurrency would need an
 * event-sourced relay (future work).
 */
function stableGt(a: unknown, b: unknown): boolean {
  // deterministic + symmetric: exactly one of stableGt(a,b)/stableGt(b,a) is true
  // unless the values serialize identically (then it doesn't matter which we keep).
  return JSON.stringify(a) > JSON.stringify(b)
}
export function mergeSnapshots(local: GameState, incoming: GameState): GameState {
  const seatVer = (s: GameState, id: PlayerId) => s.seatSeq?.[id] ?? 0
  const players = {} as GameState['players']
  for (const id of ['p0', 'p1'] as PlayerId[]) {
    const vl = seatVer(local, id)
    const vi = seatVer(incoming, id)
    players[id] =
      vl > vi ? local.players[id] : vi > vl ? incoming.players[id] : stableGt(local.players[id], incoming.players[id]) ? local.players[id] : incoming.players[id]
  }
  const base = local.seq > incoming.seq ? local : incoming.seq > local.seq ? incoming : stableGt(local, incoming) ? local : incoming
  const log =
    local.log.length > incoming.log.length ? local.log : incoming.log.length > local.log.length ? incoming.log : stableGt(local.log, incoming.log) ? local.log : incoming.log
  const seatSeq = {
    p0: Math.max(seatVer(local, 'p0'), seatVer(incoming, 'p0')),
    p1: Math.max(seatVer(local, 'p1'), seatVer(incoming, 'p1')),
  }
  const seq = Math.max(local.seq, incoming.seq)
  return finalize({ ...base, players, log, seatSeq, seq })
}

function reduce(s: GameState, a: Action): GameState {
  switch (a.type) {
    case 'roll':
      return { ...s, lastRoll: { production: a.production, event: a.event }, phase: 'action' }

    case 'applyProduction': {
      const n = s.lastRoll?.production
      if (n == null) return s
      const players = { ...s.players }
      for (const id of ['p0', 'p1'] as PlayerId[]) {
        const p = clonePlayer(players[id])
        p.regions = p.regions.map((r) =>
          r.number === n ? { ...r, stored: Math.min(3, r.stored + 1) as 0 | 1 | 2 | 3 } : r,
        )
        players[id] = p
      }
      return { ...s, players }
    }

    case 'rotateRegion':
      return withPlayer(s, a.player, (p) => {
        const r = p.regions[a.regionIndex]
        if (r) r.stored = (((r.stored + 1) % 4) as 0 | 1 | 2 | 3)
      })

    case 'setStored':
      return withPlayer(s, a.player, (p) => {
        const r = p.regions[a.regionIndex]
        if (r) r.stored = a.stored
      })

    case 'drawRegion': {
      if (s.regionStack.length === 0) return s
      const regionStack = [...s.regionStack]
      const id = regionStack.pop()!
      const out = withPlayer(s, a.player, (p) => {
        p.regions = [...p.regions, makeRegionSlot(id)]
      })
      return { ...out, regionStack }
    }

    case 'upgradeCity': {
      const pay = a.pay !== false
      const cityCost = getCard('base-city')?.cost ?? []
      return logged(
        finalize(
          withPlayer(s, a.player, (p) => {
            if (pay) spendCost(p, cityCost)
            let seen = -1
            p.placed = p.placed.map((pc) => {
              const c = getCard(pc.cardId)
              if (c && (c.category === 'settlement' || c.category === 'city')) {
                seen++
                if (seen === a.seat && c.category === 'settlement') {
                  return { ...pc, cardId: 'base-city' } // upgrade in place, keep slot
                }
              }
              return pc
            })
          }),
        ),
        a.player,
        `Upgraded to city${pay && cityCost.length ? ` (${fmtCost(cityCost)})` : ''}`,
      )
    }

    case 'expandSpine': {
      if (s.regionStack.length < 2) return s
      const regionStack = [...s.regionStack]
      const topId = regionStack.pop()!
      const botId = regionStack.pop()!
      const N = countCategory(s.players[a.player], ['settlement', 'city'])
      const roadCount = countCategory(s.players[a.player], ['road'])
      const out = withPlayer(s, a.player, (p) => {
        p.placed = [
          ...p.placed,
          { cardId: 'base-road', slot: `road-${roadCount}` },
          { cardId: 'base-settlement', slot: `settle-${N}` },
        ]
        const regions = p.regions.slice()
        regions.splice(N + 1, 0, makeRegionSlot(topId)) // new top region after existing tops
        regions.push(makeRegionSlot(botId)) // new bottom region last
        p.regions = regions
      })
      return finalize({ ...out, regionStack })
    }

    case 'buildPiece': {
      const end = a.end ?? 'right'
      const pay = a.pay !== false
      if (a.piece === 'road') {
        const N0 = countCategory(s.players[a.player], ['settlement', 'city'])
        const slot = a.slot ?? (end === 'left' ? 0 : N0) // default to the chosen end slot
        const roadCost = getCard('base-road')?.cost ?? []
        return logged(
          finalize(
            withPlayer(s, a.player, (p) => {
              if (pay) spendCost(p, roadCost)
              p.placed = [...p.placed, { cardId: 'base-road', slot: `road-${slot}` }]
            }),
          ),
          a.player,
          `Built road${pay && roadCost.length ? ` (${fmtCost(roadCost)})` : ''}`,
        )
      }
      // settlement: add it plus 2 OPEN landscape slots (1 top, 1 bottom) — the
      // player fills those with Landscape cards (manual). 'right' appends; 'left'
      // prepends (shifting building-site slots s{i}→s{i+1} AND road slots +1).
      const N = countCategory(s.players[a.player], ['settlement', 'city'])
      const settleCost = getCard('base-settlement')?.cost ?? []
      return logged(
        finalize(
          withPlayer(s, a.player, (p) => {
          if (pay) spendCost(p, settleCost)
          if (end === 'left') {
            p.placed = p.placed.map((pc) => {
              const sm = /^s(\d+)-(up|down)$/.exec(pc.slot ?? '')
              if (sm) return { ...pc, slot: `s${Number(sm[1]) + 1}-${sm[2]}` }
              const rm = /^road-(\d+)$/.exec(pc.slot ?? '')
              if (rm) return { ...pc, slot: `road-${Number(rm[1]) + 1}` }
              return pc
            })
            p.placed = [{ cardId: 'base-settlement', slot: 'settle-0' }, ...p.placed]
            p.regions = [emptyRegionSlot(), ...p.regions.slice(0, N + 1), emptyRegionSlot(), ...p.regions.slice(N + 1)]
          } else {
            p.placed = [...p.placed, { cardId: 'base-settlement', slot: `settle-${N}` }]
            const regions = p.regions.slice()
            regions.splice(N + 1, 0, emptyRegionSlot())
            regions.push(emptyRegionSlot())
            p.regions = regions
          }
          }),
        ),
        a.player,
        `Built settlement${pay && settleCost.length ? ` (${fmtCost(settleCost)})` : ''}`,
      )
    }

    case 'placeLandscape': {
      const slot = s.players[a.player].regions[a.regionIndex]
      if (!slot || !slot.empty || s.regionStack.length === 0) return s
      const regionStack = [...s.regionStack]
      const id = regionStack.pop()!
      const out = withPlayer(s, a.player, (p) => {
        p.regions = p.regions.map((r, i) => (i === a.regionIndex ? makeRegionSlot(id) : r))
      })
      return { ...out, regionStack }
    }

    case 'removePlaced': {
      const pc = s.players[a.player].placed[a.placedIndex]
      if (!pc) return s
      const cardId = pc.cardId
      const home = discardHome(cardId)
      const out = withPlayer(s, a.player, (p) => {
        p.placed.splice(a.placedIndex, 1)
      })
      const discard = home === 'discard' ? [...out.discard, cardId] : out.discard
      const name = getCard(cardId)?.name ?? cardId
      return logged(
        finalize({ ...out, discard }),
        a.player,
        home === 'discard' ? `Removed ${name} → discard` : `Removed ${name}`,
      )
    }

    case 'drawToHand': {
      const stack = s.drawStacks[a.stackIndex]
      if (!stack || stack.length === 0) return s
      const drawStacks = s.drawStacks.map((st, i) => (i === a.stackIndex ? st.slice(0, -1) : st))
      const card = stack[stack.length - 1]
      const out = withPlayer(s, a.player, (p) => {
        p.hand.push(card)
      })
      return logged({ ...out, drawStacks }, a.player, `Drew a card from stack ${a.stackIndex + 1}`)
    }

    case 'playCard': {
      const pay = a.pay !== false
      const card = getCard(a.cardId)
      const cost = card?.cost ?? []
      const name = card?.name ?? a.cardId
      return logged(
        finalize(
          withPlayer(s, a.player, (p) => {
            const i = p.hand.indexOf(a.cardId)
            if (i >= 0) p.hand.splice(i, 1)
            if (pay) spendCost(p, cost)
            p.placed.push({ cardId: a.cardId, slot: a.slot })
          }),
        ),
        a.player,
        `Played ${name}${pay && cost.length ? ` (${fmtCost(cost)})` : ''}`,
      )
    }

    case 'returnToHand':
      return finalize(
        withPlayer(s, a.player, (p) => {
          const [removed] = p.placed.splice(a.placedIndex, 1)
          if (removed) p.hand.push(removed.cardId)
        }),
      )

    case 'discardToStack': {
      const out = withPlayer(s, a.player, (p) => {
        const i = p.hand.indexOf(a.cardId)
        if (i >= 0) p.hand.splice(i, 1)
      })
      const drawStacks = out.drawStacks.map((st, i) =>
        i === a.stackIndex ? [a.cardId, ...st] : st,
      )
      return logged({ ...out, drawStacks }, a.player, `Tucked a card under stack ${a.stackIndex + 1}`)
    }

    case 'discardCard': {
      let cardId = a.cardId
      let out = s
      if (a.from === 'hand') {
        if (!cardId) return s
        const id = cardId
        out = withPlayer(s, a.player, (p) => {
          const i = p.hand.indexOf(id)
          if (i >= 0) p.hand.splice(i, 1)
        })
      } else {
        const pc = s.players[a.player].placed[a.placedIndex ?? -1]
        if (!pc) return s
        cardId = pc.cardId
        out = withPlayer(s, a.player, (p) => {
          p.placed.splice(a.placedIndex!, 1)
        })
      }
      if (!cardId) return s
      const home = discardHome(cardId)
      const discard = home === 'discard' ? [...out.discard, cardId] : out.discard
      const name = getCard(cardId)?.name ?? cardId
      return logged(
        finalize({ ...out, discard }),
        a.player,
        home === 'discard' ? `Discarded ${name}` : `Returned ${name} to supply`,
      )
    }

    case 'drawEvent': {
      if (s.eventDeck.length === 0) return s
      const eventDeck = [...s.eventDeck]
      const id = eventDeck.pop()! // top of the deck
      const name = getCard(id)?.name ?? id
      // `revealedEvent` is part of the synced snapshot, so the pop-up appears on
      // BOTH screens simultaneously.
      if (id === YULE_ID) {
        // Yule/festival: reshuffle the rest and re-seat Yule 4th from the bottom.
        // Deterministic (seeded by seq) so both online clients stay in sync.
        const reshuffled = shuffle(eventDeck, makeRng((s.seq + 1) ^ 0x59c1e))
        return logged({ ...s, eventDeck: seatYule(reshuffled), revealedEvent: id }, s.activePlayer, `Event: ${name}`)
      }
      eventDeck.unshift(id) // other events cycle to the bottom after resolving
      return logged({ ...s, eventDeck, revealedEvent: id }, s.activePlayer, `Event: ${name}`)
    }

    case 'dismissEvent':
      return s.revealedEvent ? { ...s, revealedEvent: undefined } : s

    case 'renamePlayer':
      return withPlayer(s, a.player, (p) => {
        p.name = a.name
      })

    case 'adjustVP':
      return finalize(
        withPlayer(s, a.player, (p) => {
          p.vpAdjust += a.delta
        }),
      )

    case 'setToken': {
      const key = a.token === 'hero' ? 'hasHeroToken' : 'hasTradeToken'
      const players = { ...s.players }
      for (const id of ['p0', 'p1'] as PlayerId[]) {
        players[id] = { ...clonePlayer(players[id]), [key]: a.player === id }
      }
      return finalize({ ...s, players })
    }

    case 'addResource':
      return logged(
        withPlayer(s, a.player, (p) => distributeResource(p, a.resource, a.count)),
        a.player,
        `${a.count >= 0 ? '+' : ''}${a.count} ${resLabel(a.resource)}`,
      )

    case 'transferResource': {
      const players = { ...s.players }
      if (a.from !== 'bank') {
        players[a.from] = clonePlayer(players[a.from])
        distributeResource(players[a.from], a.resource, -a.count)
      }
      if (a.to !== 'bank') {
        players[a.to] = clonePlayer(players[a.to])
        distributeResource(players[a.to], a.resource, a.count)
      }
      return { ...s, players }
    }

    case 'adjustStat':
      return finalize(
        withPlayer(s, a.player, (p) => {
          const adj = { ...(p.statAdjust ?? {}) }
          adj[a.stat] = (adj[a.stat] ?? 0) + a.delta
          p.statAdjust = adj
        }),
      )

    case 'grantCard': {
      let drawStacks = s.drawStacks
      if (a.fromStack != null && s.drawStacks[a.fromStack]?.includes(a.cardId)) {
        let removed = false
        drawStacks = s.drawStacks.map((st, i) => {
          if (i !== a.fromStack || removed) return st
          const j = st.lastIndexOf(a.cardId)
          if (j < 0) return st
          removed = true
          return [...st.slice(0, j), ...st.slice(j + 1)]
        })
      }
      const out = withPlayer(s, a.player, (p) => {
        p.hand.push(a.cardId)
      })
      return { ...out, drawStacks }
    }

    case 'setDice': {
      const prev = s.lastRoll ?? { production: 1, event: 'event-card' }
      return {
        ...s,
        lastRoll: {
          production: a.production ?? prev.production,
          event: a.event ?? prev.event,
        },
      }
    }

    case 'markUsed':
      return withPlayer(s, a.player, (p) => {
        const used = p.usedThisTurn ?? []
        if (!used.includes(a.key)) p.usedThisTurn = [...used, a.key]
      })

    case 'logNote':
      return {
        ...s,
        log: [...s.log, { turn: s.turn, player: a.player, text: a.text, manual: true }],
      }

    case 'setWinThreshold':
      return finalize({ ...s, winThreshold: a.value })

    case 'claimVictory':
      return logged({ ...s, victoryClaim: a.player }, a.player, 'Claims victory — awaiting agreement')

    case 'agreeVictory': {
      // Only the OPPONENT of the claimer can conclude the game.
      if (!s.victoryClaim || s.victoryClaim === a.player) return s
      const winner = s.victoryClaim
      return logged(
        { ...s, winner, phase: 'gameover', victoryClaim: undefined },
        a.player,
        `Agrees — ${s.players[winner].name} wins`,
      )
    }

    case 'declineVictory':
      if (!s.victoryClaim) return s
      return { ...s, victoryClaim: undefined }

    case 'nextPhase': {
      const i = PHASE_ORDER.indexOf(s.phase)
      if (i < 0 || i >= PHASE_ORDER.length - 1) return s
      return { ...s, phase: PHASE_ORDER[i + 1] }
    }

    case 'endTurn': {
      const activePlayer = other(s.activePlayer)
      // reset once-per-turn markers for both players at the turn boundary
      const players = { ...s.players }
      for (const id of ['p0', 'p1'] as PlayerId[]) {
        if (players[id].usedThisTurn?.length) players[id] = { ...players[id], usedThisTurn: [] }
      }
      return { ...s, players, activePlayer, phase: 'roll', turn: s.turn + 1, lastRoll: undefined }
    }

    default:
      return s
  }
}
