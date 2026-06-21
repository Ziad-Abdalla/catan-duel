// Event resolution: the event-die faces (brigand/trade/celebration/plenty/event)
// and the base event-card effects. Sub-choices ("take any resource", "bury a
// card") are auto-resolved via choice.ts. Mutates the passed state (callers clone).

import {
  type GameState, type Player, type Seat, type Resource,
  SEATS, other, addResource, removeResource, resourceTotal, allPlaced,
} from './state'
import { rngShuffle } from './rng'
import { bestResourceToGain, mostExpendableResource, handCardValue } from './choice'
import { tallies, tradeShipCount } from './tokens'
import { def, maybeDef } from '../cards'
import { compensateLoss } from './theme'

export const YULE_ID = 'base-yule'
export const YULE_FROM_BOTTOM = 3

/** Seat Yule the right distance from the bottom (index 0 = bottom). Deterministic. */
export function seatYule(deck: string[]): string[] {
  const out = deck.filter((id) => id !== YULE_ID)
  out.splice(Math.max(0, out.length - YULE_FROM_BOTTOM), 0, YULE_ID)
  return out
}

// ── Brigand ───────────────────────────────────────────────────────────────────

function centerShielded(p: Player, centerIdx: number): boolean {
  return p.centers[centerIdx].slots.some((id) => id && def(id).shieldsBrigand)
}

/** Resources counted for the Brigand trigger (storehouse-shielded regions excluded). */
export function brigandCount(p: Player): number {
  let n = 0
  p.centers.forEach((c, ci) => {
    if (centerShielded(p, ci)) return
    for (const ri of c.regions) n += p.regions[ri]?.stored ?? 0
  })
  // regions not attached to any center still count (shouldn't happen, but be safe)
  return n
}

/** Brigand Attack: any player with >7 counted resources loses all gold + all wool. */
export function resolveBrigand(s: GameState): void {
  for (const seat of SEATS) {
    const p = s.players[seat]
    if (brigandCount(p) > 7) {
      // Gold Cache (Era of Gold) shields stored gold from the Brigand
      if (!allPlaced(p).includes('gold-gold-cache')) removeResource(p, 'gold', resourceTotal(p, 'gold'))
      removeResource(p, 'wool', resourceTotal(p, 'wool'))
    }
  }
}

// ── Event-die faces (non-brigand) ──────────────────────────────────────────────

function gain(s: GameState, seat: Seat, avoid?: Resource): void {
  const r = bestResourceToGain(s, seat, avoid)
  addResource(s.players[seat], r, 1)
}

function hasTollBridge(p: Player): boolean {
  return allPlaced(p).includes('base-toll-bridge')
}

/** Resolve a black event-die face (brigand is handled separately, before production). */
export function resolveFace(s: GameState, roller: Seat): void {
  const face = s.lastRoll?.event
  switch (face) {
    case 'trade': {
      // trade-advantage holder takes 1 resource of choice from the opponent
      const holder = s.players.p0.hasTradeToken ? 'p0' : s.players.p1.hasTradeToken ? 'p1' : null
      if (holder) {
        const victim = other(holder)
        // Moneylender (Era of Gold): take 2 instead of 1 on the Trade event
        const n = allPlaced(s.players[holder]).includes('gold-moneylender') ? 2 : 1
        for (let i = 0; i < n; i++) {
          const r = bestResourceToGain(s, holder)
          if (resourceTotal(s.players[victim], r) > 0) {
            removeResource(s.players[victim], r, 1)
            addResource(s.players[holder], r, 1)
          } else {
            const v = mostExpendableResource(s, victim)
            if (v) { removeResource(s.players[victim], v, 1); addResource(s.players[holder], v, 1) }
          }
        }
      }
      break
    }
    case 'celebration': {
      const s0 = tallies(s.players.p0).skill
      const s1 = tallies(s.players.p1).skill
      if (s0 > s1) gain(s, 'p0')
      else if (s1 > s0) gain(s, 'p1')
      else { gain(s, 'p0'); gain(s, 'p1') } // tie (incl. 0–0) → both
      break
    }
    case 'plenty': {
      for (const seat of SEATS) {
        gain(s, seat)
        if (hasTollBridge(s.players[seat])) addResource(s.players[seat], 'gold', 2)
      }
      break
    }
    case 'event':
      drawAndResolveEvent(s, roller)
      break
  }
}

// ── Event cards ─────────────────────────────────────────────────────────────────

function drawAndResolveEvent(s: GameState, roller: Seat): void {
  if (s.eventDeck.length === 0) return
  const id = s.eventDeck.shift() as string
  if (id === YULE_ID) {
    // reshuffle the remaining deck, reseat Yule near the bottom, then draw again
    let deck: string[]
    ;[deck, s.rng] = rngShuffle(s.eventDeck, s.rng)
    s.eventDeck = seatYule(deck)
    drawAndResolveEvent(s, roller)
    return
  }
  resolveEventCard(s, id, roller)
  s.eventDeck.push(id) // resolved card goes to the bottom (we draw from the front)
}

function strengthHolder(s: GameState): Seat | null {
  return s.players.p0.hasHeroToken ? 'p0' : s.players.p1.hasHeroToken ? 'p1' : null
}

/** Remove a placed (non-spine) building from a player to the bottom of a draw stack. */
function buryWorstBuilding(s: GameState, seat: Seat): void {
  const p = s.players[seat]
  let target: { ci: number; si: number; id: string } | null = null
  let worst = Infinity
  p.centers.forEach((c, ci) =>
    c.slots.forEach((id, si) => {
      if (!id) return
      const d = maybeDef(id)
      if (!d || d.category === 'hero-or-unit') return // buildings only
      const val = d.points.vp * 5 + d.points.commerce * 2 + (d.doubles ? 4 : 0)
      if (val < worst) { worst = val; target = { ci, si, id } }
    }),
  )
  if (target) {
    const t = target as { ci: number; si: number; id: string }
    p.centers[t.ci].slots[t.si] = null
    s.drawStacks[0]?.unshift(t.id) // bottom of a stack
  }
}

export function resolveEventCard(s: GameState, id: string, _roller: Seat): void {
  switch (id) {
    case 'base-invention':
    case 'progress-invention': {
      for (const seat of SEATS) {
        const p = s.players[seat]
        let n = 0
        for (const pid of allPlaced(p)) if ((maybeDef(pid)?.points.progress ?? 0) > 0) n++
        n = Math.min(2, n)
        for (let i = 0; i < n; i++) gain(s, seat)
      }
      break
    }
    case 'gold-gift-for-the-prince': {
      for (const seat of SEATS) {
        const p = s.players[seat]
        let units = 0
        for (const pid of allPlaced(p)) if ((maybeDef(pid)?.points.strength ?? 0) >= 1) units++
        addResource(p, 'gold', units)
      }
      break
    }
    case 'base-year-of-plenty': {
      for (const seat of SEATS) {
        const p = s.players[seat]
        p.centers.forEach((c) => {
          const boosters = c.slots.filter(
            (cid) => cid === 'base-storehouse' || cid === 'base-abbey',
          ).length
          if (boosters === 0) return
          for (const ri of c.regions) {
            const reg = p.regions[ri]
            if (reg) addResource(p, reg.resource, boosters)
          }
        })
      }
      break
    }
    case 'base-fraternal-feuds':
    case 'turmoil-fraternal-feuds': {
      const h = strengthHolder(s)
      if (h) {
        const opp = s.players[other(h)]
        for (let k = 0; k < 2 && opp.hand.length > 0; k++) {
          const card = opp.hand.shift() as string
          s.drawStacks[0]?.unshift(card)
        }
      }
      break
    }
    case 'base-feud':
    case 'turmoil-feud': {
      const h = strengthHolder(s)
      if (h) buryWorstBuilding(s, other(h))
      break
    }
    case 'base-traveling-merchant':
    case 'gold-traveling-merchant': {
      for (const seat of SEATS) {
        const p = s.players[seat]
        let bought = 0
        while (bought < 2 && resourceTotal(p, 'gold') > 0) {
          const r = bestResourceToGain(s, seat, 'gold')
          // only worth it if it's actually wanted and storable
          removeResource(p, 'gold', 1)
          addResource(p, r, 1)
          bought++
        }
      }
      break
    }
    case 'base-trade-ships-race':
    case 'gold-trade-ships-race': {
      const n0 = tradeShipCount(s.players.p0)
      const n1 = tradeShipCount(s.players.p1)
      if (n0 > n1 && n0 > 0) gain(s, 'p0')
      else if (n1 > n0 && n1 > 0) gain(s, 'p1')
      else if (n0 === n1 && n0 > 0) { gain(s, 'p0'); gain(s, 'p1') }
      break
    }
    case 'turmoil-riots': {
      for (const seat of SEATS) {
        const p = s.players[seat]
        // Chapel: if the production die shows 1–3, Riots doesn't apply to you
        if (allPlaced(p).includes('turmoil-chapel') && (s.lastRoll?.production ?? 9) <= 3) continue
        const units = p.centers.flatMap((c) => c.slots).filter((id) => {
          const d = id ? maybeDef(id) : undefined
          return d && (d.points.strength >= 1 || d.points.commerce >= 1)
        }) as string[]
        if (units.length === 0) continue
        const pay = units.length <= 2 ? 1 : 2
        if (resourceTotal(p, 'gold') >= pay) {
          removeResource(p, 'gold', pay)
        } else {
          // can't pay → remove the least valuable such unit to the bottom of a stack
          let best: { ci: number; si: number; id: string; v: number } | null = null
          p.centers.forEach((c, ci) => c.slots.forEach((id, si) => {
            const d = id ? maybeDef(id) : undefined
            if (!d || (d.points.strength < 1 && d.points.commerce < 1)) return
            const v = handCardValue(id as string)
            if (!best || v < best.v) best = { ci, si, id: id as string, v }
          }))
          if (best) {
            const b = best as { ci: number; si: number; id: string }
            p.centers[b.ci].slots[b.si] = null
            s.drawStacks[0]?.unshift(b.id)
            compensateLoss(s, seat)
          }
        }
      }
      break
    }
    case 'progress-plague': {
      for (const seat of SEATS) {
        const p = s.players[seat]
        p.centers.forEach((c) => {
          if (c.kind !== 'city') return
          if (c.slots.includes('progress-bath-house')) return // protected
          for (const ri of c.regions) { const reg = p.regions[ri]; if (reg) reg.stored = Math.max(0, reg.stored - 1) }
        })
        if (allPlaced(p).includes('progress-pharmacy')) addResource(p, bestResourceToGain(s, seat), 1)
      }
      break
    }
    default:
      // unknown / theme event not yet wired — no-op (flagged by self-play "never fired")
      break
  }
}

export { drawAndResolveEvent }
