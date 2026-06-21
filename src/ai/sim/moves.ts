// Legal-move generation + apply(). This is the rules-ENFORCING core: legalMoves()
// is the single source of truth for what a seat may do, and apply() is the only way
// state changes. Pure: apply(state, move) returns a NEW state (input untouched).
//
// Turn shape: preroll (optional Brigitta, then roll) → action (build/play/trade,
// any number) → endTurn (replenish + win check + pass). Dice/production/event
// resolution and many "take any resource" sub-choices are handled inside apply via
// choice.ts so the search branching stays tractable.

import {
  type GameState, type Player, type Seat, type Resource, type Center,
  RESOURCES, SEATS, other, canAfford, spend, addResource, removeResource,
  resourceTotal, totalResources, allPlaced, cloneState, CENTER_SLOTS,
} from './state'
import { ROAD_COST, SETTLEMENT_COST, CITY_COST } from '../cards/spine'
import { def, maybeDef } from '../cards'
import { rollProduction, rollEvent } from './dice'
import { resolveBrigand, resolveFace } from './events'
import { recomputeTokens, handLimit, tallies } from './tokens'
import { winnerAtTurnEnd } from './win'
import { bestResourceToGain, mostExpendableResource, worstHandCard } from './choice'
import { canPlayThemeAction, applyThemeAction, onBuild } from './theme'

export type Move =
  | { t: 'playBrigitta'; cardId: string }
  | { t: 'playReiner'; cardId: string } // Era of Gold: pre-roll, forces a Celebration + bonus
  | { t: 'chooseProd'; n: number }
  | { t: 'roll' }
  | { t: 'buildRoad' }
  | { t: 'buildSettlement' }
  | { t: 'upgradeCity'; centerIdx: number }
  | { t: 'placeCard'; cardId: string; centerIdx: number; slotIdx: number }
  | { t: 'playAction'; cardId: string }
  | { t: 'trade'; give: Resource; get: Resource }
  | { t: 'mint'; get: Resource } // Era of Gold: once/turn, 1 gold → 1 resource
  | { t: 'endTurn' }

// ── trade rate ─────────────────────────────────────────────────────────────────

/** 2 (with a matching trade ship) or 3 (bank). */
export function tradeRate(p: Player, give: Resource): number {
  for (const id of allPlaced(p)) {
    const d = maybeDef(id)
    if (!d?.tradeShipFor) continue
    if (d.tradeShipFor === give) return 2
    if (d.tradeShipFor === 'neighbor') {
      // large trade ship: 2:1 for the resources of its own center's regions
      const ci = p.centers.findIndex((c) => c.slots.includes(id))
      if (ci >= 0 && p.centers[ci].regions.some((ri) => p.regions[ri]?.resource === give)) return 2
    }
  }
  return 3
}

// ── placement legality ───────────────────────────────────────────────────────

/** Build cost after Era discounts: Drill Ground (heroes −1) and Building Crane
 *  (city expansions costing >4 −1). */
export function effectiveCost(s: GameState, seat: Seat, cardId: string): Partial<Record<Resource, number>> {
  const d = def(cardId)
  const cost: Partial<Record<Resource, number>> = { ...d.cost }
  const placed = allPlaced(s.players[seat])
  const total = Object.values(cost).reduce((a, b) => a + (b ?? 0), 0)
  let discount = 0
  if (d.category === 'hero-or-unit' && placed.includes('turmoil-drill-ground')) discount += 1
  if (d.needsCity && total > 4 && placed.includes('progress-building-crane')) discount += 1
  for (let i = 0; i < discount; i++) {
    let key: Resource | null = null
    let max = 0
    for (const r of RESOURCES) if ((cost[r] ?? 0) > max) { max = cost[r] as number; key = r }
    if (key) cost[key] = (cost[key] ?? 0) - 1
  }
  return cost
}

function canPlace(s: GameState, seat: Seat, cardId: string, ci: number, si: number): boolean {
  const p = s.players[seat]
  const c = p.centers[ci]
  if (!c || c.slots[si] !== null) return false
  const d = maybeDef(cardId)
  if (!d || !d.placeable) return false
  if (d.needsCity && c.kind !== 'city') return false
  if (d.requires && !d.requires(s, seat)) return false
  if (!canAfford(p, effectiveCost(s, seat, cardId))) return false
  return true
}

function canPlayActionCard(s: GameState, seat: Seat, id: string): boolean {
  const theme = canPlayThemeAction(s, seat, id)
  if (theme !== null) return theme
  const p = s.players[seat]
  switch (id) {
    case 'base-merchant-caravan': return totalResources(p) >= 2
    case 'base-goldsmith': return resourceTotal(p, 'gold') >= 3
    case 'base-scout': return !p.scoutBest
    case 'base-relocation': return true
    case 'base-brigitta-the-wise-woman': return false // preroll only
    default: return false
  }
}

// ── legal moves ────────────────────────────────────────────────────────────────

export function legalMoves(s: GameState): Move[] {
  if (s.phase === 'gameover') return []
  const seat = s.active
  const p = s.players[seat]
  const moves: Move[] = []

  if (s.phase === 'preroll') {
    if (s.chooseProduction) {
      for (let n = 1; n <= 6; n++) moves.push({ t: 'chooseProd', n })
      return moves
    }
    for (const id of new Set(p.hand)) {
      if (id === 'base-brigitta-the-wise-woman' || id === 'progress-brigitta-the-wise-woman') moves.push({ t: 'playBrigitta', cardId: id })
      if (id === 'gold-reiner-the-herald') moves.push({ t: 'playReiner', cardId: id })
    }
    moves.push({ t: 'roll' })
    return moves
  }

  // action phase
  if (canAfford(p, ROAD_COST)) moves.push({ t: 'buildRoad' })
  if (p.pendingRoads >= 1 && canAfford(p, SETTLEMENT_COST)) moves.push({ t: 'buildSettlement' })
  p.centers.forEach((c, ci) => {
    if (c.kind === 'settlement' && canAfford(p, CITY_COST)) moves.push({ t: 'upgradeCity', centerIdx: ci })
  })
  // place buildings/units from hand
  for (const id of new Set(p.hand)) {
    const d = maybeDef(id)
    if (!d || !d.placeable) continue
    for (let ci = 0; ci < p.centers.length; ci++) {
      for (let si = 0; si < p.centers[ci].slots.length; si++) {
        if (canPlace(s, seat, id, ci, si)) { moves.push({ t: 'placeCard', cardId: id, centerIdx: ci, slotIdx: si }); break }
      }
    }
  }
  // action cards
  for (const id of new Set(p.hand)) {
    if (maybeDef(id)?.isAction && canPlayActionCard(s, seat, id)) moves.push({ t: 'playAction', cardId: id })
  }
  // trades — pruned to "give a surplus resource to get a wanted one" (legal subset)
  const wantSet = wantedResources(s, seat)
  for (const give of RESOURCES) {
    const rate = tradeRate(p, give)
    if (resourceTotal(p, give) < rate) continue
    for (const get of wantSet) {
      if (get === give) continue
      moves.push({ t: 'trade', give, get })
    }
  }
  // Era of Gold — Mint: once per turn, 1 gold → 1 resource of choice
  if (allPlaced(p).includes('gold-mint') && !p.used.includes('mint') && resourceTotal(p, 'gold') >= 1) {
    for (const get of wantSet) if (get !== 'gold') moves.push({ t: 'mint', get })
  }
  moves.push({ t: 'endTurn' })
  return moves
}

function wantedResources(s: GameState, seat: Seat): Resource[] {
  const p = s.players[seat]
  const have = { lumber: 0, brick: 0, wool: 0, grain: 0, ore: 0, gold: 0 }
  for (const reg of p.regions) have[reg.resource] += reg.stored
  const want = new Set<Resource>()
  const targets: Partial<Record<Resource, number>>[] = [SETTLEMENT_COST, ROAD_COST, CITY_COST]
  for (const id of p.hand) { const d = maybeDef(id); if (d && !d.isAction) targets.push(d.cost) }
  for (const t of targets) for (const r of RESOURCES) if ((t[r] ?? 0) > have[r]) want.add(r)
  // never want gold via trade by default (gold is precious / Brigand bait handled elsewhere)
  return [...want]
}

// ── apply ────────────────────────────────────────────────────────────────────

/** Pure apply: clone then mutate. Use for one-off moves / the live UI. */
export function apply(prev: GameState, move: Move): GameState {
  const s = cloneState(prev)
  applyInPlace(s, move)
  return s
}

/** In-place apply: MUTATES s. Used by the search, which clones once per iteration
 *  and then plays many moves on the same sampled world (huge speedup vs cloning
 *  on every move). Callers that must preserve the input use apply() instead. */
export function applyInPlace(s: GameState, move: Move): void {
  const seat = s.active
  const p = s.players[seat]

  switch (move.t) {
    case 'playBrigitta': {
      discardFromHand(s, seat, move.cardId)
      s.chooseProduction = true
      break
    }
    case 'playReiner': {
      // Reiner (approx): forces the Celebration benefit + a bonus resource now, then
      // you still roll. (Faithful spirit: determine Celebration and gain 1 extra.)
      discardFromHand(s, seat, move.cardId)
      addResource(p, bestResourceToGain(s, seat), 1)
      addResource(p, bestResourceToGain(s, seat), 1)
      break
    }
    case 'chooseProd': {
      resolveDice(s, move.n)
      break
    }
    case 'roll': {
      resolveDice(s)
      break
    }
    case 'buildRoad': {
      spend(p, ROAD_COST)
      p.pendingRoads += 1
      break
    }
    case 'buildSettlement': {
      spend(p, SETTLEMENT_COST)
      p.pendingRoads -= 1
      addSettlement(s, seat)
      recomputeTokens(s)
      break
    }
    case 'upgradeCity': {
      spend(p, CITY_COST)
      const c = p.centers[move.centerIdx]
      if (c) c.kind = 'city'
      recomputeTokens(s)
      break
    }
    case 'placeCard': {
      spend(p, effectiveCost(s, seat, move.cardId))
      removeFromHand(p, move.cardId)
      p.centers[move.centerIdx].slots[move.slotIdx] = move.cardId
      onBuild(s, seat, move.cardId)
      recomputeTokens(s)
      break
    }
    case 'playAction': {
      applyActionCard(s, seat, move.cardId)
      discardFromHand(s, seat, move.cardId)
      recomputeTokens(s)
      break
    }
    case 'trade': {
      const rate = tradeRate(p, move.give)
      if (resourceTotal(p, move.give) >= rate) {
        removeResource(p, move.give, rate)
        addResource(p, move.get, 1)
      }
      break
    }
    case 'mint': {
      if (resourceTotal(p, 'gold') >= 1 && !p.used.includes('mint')) {
        removeResource(p, 'gold', 1)
        addResource(p, move.get, 1)
        p.used.push('mint')
      }
      break
    }
    case 'endTurn': {
      endTurn(s)
      break
    }
  }
}

// ── helpers ────────────────────────────────────────────────────────────────────

function removeFromHand(p: Player, id: string): void {
  const i = p.hand.indexOf(id)
  if (i >= 0) p.hand.splice(i, 1)
}
function discardFromHand(s: GameState, seat: Seat, id: string): void {
  removeFromHand(s.players[seat], id)
  s.discard.push(id)
}

function resolveDice(s: GameState, chosenProd?: number): void {
  let prod: number
  if (chosenProd != null) prod = chosenProd
  else [prod, s.rng] = rollProduction(s.rng)
  let face: import('./state').EventFace
  ;[face, s.rng] = rollEvent(s.rng)
  s.lastRoll = { production: prod, event: face }
  if (face === 'brigand') {
    resolveBrigand(s)
    applyProduction(s, prod)
  } else {
    applyProduction(s, prod)
    resolveFace(s, s.active)
  }
  recomputeTokens(s)
  s.chooseProduction = false
  s.phase = 'action'
}

/** Is region `ri` of player `p` doubled by an adjacent doubling building? */
function isDoubled(p: Player, ri: number): boolean {
  const res = p.regions[ri]?.resource
  if (!res) return false
  for (const c of p.centers) {
    if (!c.regions.includes(ri)) continue
    for (const id of c.slots) if (id && maybeDef(id)?.doubles === res) return true
  }
  return false
}

export function applyProduction(s: GameState, prod: number): void {
  for (const seat of SEATS) {
    const p = s.players[seat]
    p.regions.forEach((reg, ri) => {
      if (reg.number === prod) addResource(p, reg.resource, isDoubled(p, ri) ? 2 : 1)
    })
  }
  // Marketplace: if the rolled number appears on MORE of the opponent's regions
  // than yours, you receive 1 resource of choice.
  for (const seat of SEATS) {
    const p = s.players[seat]
    if (!allPlaced(p).includes('base-marketplace')) continue
    const mine = p.regions.filter((r) => r.number === prod).length
    const theirs = s.players[other(seat)].regions.filter((r) => r.number === prod).length
    if (theirs > mine) addResource(p, bestResourceToGain(s, seat), 1)
  }
}

function addSettlement(s: GameState, seat: Seat): void {
  const p = s.players[seat]
  // draw 2 region cards (best 2 if Scout was played this turn, else the top 2)
  const drawn: { resource: Resource; number: number }[] = []
  for (let k = 0; k < 2; k++) {
    if (s.regionStack.length === 0) break
    let idx = s.regionStack.length - 1 // top
    if (p.scoutBest) {
      // pick the highest-number region remaining (rough "best" proxy)
      idx = s.regionStack.reduce((bi, r, i, arr) => (r.number > arr[bi].number ? i : bi), 0)
    }
    drawn.push(s.regionStack.splice(idx, 1)[0])
  }
  const startIdx = p.regions.length
  for (const r of drawn) p.regions.push({ resource: r.resource, number: r.number, stored: 0 })
  const newCenter: Center = {
    kind: 'settlement',
    regions: drawn.map((_, i) => startIdx + i),
    slots: Array(CENTER_SLOTS).fill(null),
  }
  p.centers.push(newCenter)
  p.scoutBest = false
}

function applyActionCard(s: GameState, seat: Seat, id: string): void {
  if (applyThemeAction(s, seat, id)) return
  const p = s.players[seat]
  switch (id) {
    case 'base-merchant-caravan': {
      for (let k = 0; k < 2; k++) {
        const r = mostExpendableResource(s, seat)
        if (r) removeResource(p, r, 1)
      }
      for (let k = 0; k < 2; k++) addResource(p, bestResourceToGain(s, seat), 1)
      break
    }
    case 'base-goldsmith': {
      removeResource(p, 'gold', 3)
      for (let k = 0; k < 2; k++) addResource(p, bestResourceToGain(s, seat, 'gold'), 1)
      break
    }
    case 'base-scout': {
      p.scoutBest = true
      break
    }
    case 'base-relocation': {
      relocateForDoubling(p)
      break
    }
  }
}

/** Relocation (approx): move a doubling building to a center that actually has its
 *  matching terrain + an empty slot, if it's currently mis-placed. Else no-op. */
function relocateForDoubling(p: Player): void {
  for (let ci = 0; ci < p.centers.length; ci++) {
    const c = p.centers[ci]
    for (let si = 0; si < c.slots.length; si++) {
      const id = c.slots[si]
      const d = id ? maybeDef(id) : undefined
      if (!d?.doubles) continue
      const matchesHere = c.regions.some((ri) => p.regions[ri]?.resource === d.doubles)
      if (matchesHere) continue
      // find a better center
      for (let cj = 0; cj < p.centers.length; cj++) {
        if (cj === ci) continue
        const t = p.centers[cj]
        const slot = t.slots.indexOf(null)
        const matchesThere = t.regions.some((ri) => p.regions[ri]?.resource === d.doubles)
        if (slot >= 0 && matchesThere) {
          t.slots[slot] = id
          c.slots[si] = null
          return
        }
      }
    }
  }
}

function endTurn(s: GameState): void {
  const seat = s.active
  const p = s.players[seat]
  // replenish hand to the limit (draw up, else discard down)
  const limit = handLimit(p)
  while (p.hand.length < limit) {
    const st = largestStack(s)
    if (!st || st.length === 0) break
    p.hand.push(st.pop() as string)
  }
  while (p.hand.length > limit) {
    const worst = worstHandCard(p)
    if (!worst) break
    discardFromHand(s, seat, worst)
  }
  p.used = []
  p.scoutBest = false
  recomputeTokens(s)

  const w = winnerAtTurnEnd(s)
  if (w) {
    s.winner = w
    s.phase = 'gameover'
    return
  }
  s.active = other(seat)
  s.turn += 1
  s.phase = 'preroll'
  s.chooseProduction = false
}

function largestStack(s: GameState): string[] | null {
  let best: string[] | null = null
  for (const st of s.drawStacks) if (st.length > 0 && (!best || st.length > best.length)) best = st
  return best
}

export { tallies }
