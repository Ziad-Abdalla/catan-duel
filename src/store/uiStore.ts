import { create } from 'zustand'
import { playSfx } from '../audio/sfx'
import type { PlayerId } from '../types'
import type { EventFace } from '../engine/dice'

/** A card animating across the table (deck → hand, etc.). Viewport coordinates. */
export interface Flight {
  id: number
  art: string
  fx: number
  fy: number
  tx: number
  ty: number
  w: number
}

export type BuildKind = 'settlement' | 'road' | 'city' | 'landscape'

/** A card opened to its large, readable detail view (with rules text). */
export interface Zoom {
  cardId: string
  from: 'hand' | 'play' | 'build'
  player: 'p0' | 'p1'
  placedIndex?: number
}

/** The universal resolution panel target: a card being played/activated, or an
 *  event-die face / event card being resolved. `player` is the resolving owner. */
export interface Resolve {
  player: PlayerId
  from: 'hand' | 'play' | 'event'
  cardId?: string
  event?: EventFace
  placedIndex?: number
}

/**
 * Ephemeral interaction state (drag / selection / in-flight cards / the zoomed
 * card). Deliberately SEPARATE from the game store so it never rides along in
 * the broadcast snapshot.
 */
interface UIState {
  dragCardId: string | null
  /** A piece being dragged from the build supply onto the board. */
  dragBuild: BuildKind | null
  /** A placed piece being dragged BACK off the board to remove it. */
  dragRemove: { placedIndex: number; player: 'p0' | 'p1' } | null
  selectedCardId: string | null
  flights: Flight[]
  zoom: Zoom | null
  resolve: Resolve | null
  /** The roll outcome currently shown in the wall — set only once the felt dice
   *  have settled, so the wall "writes" the result after the tumble (not during). */
  revealedRoll: { production: number; event: string; turn: number } | null
  /** A one-shot signal to play an event face's effect (sound + animation), fired both when
   *  the dice settle AND when a card forces that effect. `key` bumps so it always re-fires. */
  eventFx: { face: EventFace; key: number } | null
  fireEventFx: (face: EventFace) => void
  /** Two physical dice tumbling at a random spot on the felt (viewport %). */
  dice: { id: number; x: number; y: number; prod: number; event: string; phase: 'tumble' | 'settle' | 'fade' } | null
  /** The collapsible action-history ledger (audit log) sidebar. */
  auditOpen: boolean
  toggleAudit: () => void
  /** When true, building/playing a card spends its printed cost; off = free placement
   *  (the manual sandbox lets you opt out of auto-paying). */
  payCosts: boolean
  setPayCosts: (v: boolean) => void
  /** Visual felt theme, decoupled from which card sets are enabled. 'auto' follows the
   *  enabled eras; otherwise the player picks the atmosphere they want to see. */
  tableTheme: 'auto' | 'base' | 'gold' | 'turmoil' | 'progress' | 'duel'
  setTableTheme: (t: UIState['tableTheme']) => void
  /** Which draw stack is open in the peek/search browser modal (null = closed). */
  stackBrowse: number | null
  openStackBrowse: (i: number) => void
  closeStackBrowse: () => void
  /** A player briefly flashed with a negative cue (e.g. just lost an advantage). */
  negativeCue: PlayerId | null
  flashNegative: (player: PlayerId) => void
  rollDice: (production: number, event: string, turn: number) => void
  setDrag: (id: string | null) => void
  setDragBuild: (b: BuildKind | null) => void
  setDragRemove: (r: { placedIndex: number; player: 'p0' | 'p1' } | null) => void
  setSelected: (id: string | null) => void
  clear: () => void
  addFlight: (f: Omit<Flight, 'id'>) => void
  removeFlight: (id: number) => void
  openZoom: (z: Zoom) => void
  closeZoom: () => void
  openResolve: (r: Resolve) => void
  closeResolve: () => void
  revealRoll: (r: { production: number; event: string; turn: number }) => void
}

let flightId = 0
let diceId = 0
let diceKey: string | null = null // guards against StrictMode's double trigger
let eventFxKey = 0

export const useUI = create<UIState>((set) => ({
  dragCardId: null,
  dragBuild: null,
  dragRemove: null,
  selectedCardId: null,
  flights: [],
  zoom: null,
  resolve: null,
  revealedRoll: null,
  eventFx: null,
  fireEventFx: (face) => set({ eventFx: { face, key: ++eventFxKey } }),
  dice: null,
  auditOpen: false,
  toggleAudit: () => set((s) => ({ auditOpen: !s.auditOpen })),
  payCosts: true,
  setPayCosts: (payCosts) => set({ payCosts }),
  tableTheme: 'auto',
  setTableTheme: (tableTheme) => set({ tableTheme }),
  stackBrowse: null,
  openStackBrowse: (i) => set({ stackBrowse: i }),
  closeStackBrowse: () => set({ stackBrowse: null }),
  negativeCue: null,
  flashNegative: (player) => {
    set({ negativeCue: player })
    setTimeout(() => set((s) => (s.negativeCue === player ? { negativeCue: null } : {})), 900)
  },
  /**
   * Kick off the dice cinematic for one roll. The timers live here in the store
   * singleton (not a React effect), so React StrictMode's mount/unmount/mount in
   * dev can't cancel them mid-flight; a per-roll key makes the double call a no-op.
   */
  rollDice: (production, event, turn) => {
    const key = `${turn}:${production}:${event}`
    if (key === diceKey) return
    diceKey = key
    const reveal = () => set({ revealedRoll: { production, event, turn }, eventFx: { face: event as EventFace, key: ++eventFxKey } })
    const id = ++diceId
    // spawn near the centre of the viewport (small jitter) so the roll is always
    // seen, whichever half of the table you're looking at
    const x = 46 + Math.random() * 8
    const y = 44 + Math.random() * 10
    set({ dice: { id, x, y, prod: production, event, phase: 'tumble' } })
    playSfx('dice')
    const alive = (s: UIState) => s.dice && s.dice.id === id
    // a long ~3s spin that decelerates to a stop, then a settle, then the wall
    // writes the result and the dice fade. The roll animation always plays (it's
    // core game feedback) regardless of the reduced-motion preference.
    const tumble = 2800
    setTimeout(() => alive(useUI.getState()) && playSfx('dice'), 700) // rolling clatter
    setTimeout(() => alive(useUI.getState()) && playSfx('dice'), 1500)
    setTimeout(() => set((s) => (alive(s) ? { dice: { ...s.dice!, phase: 'settle' } } : {})), tumble)
    setTimeout(() => {
      reveal()
      playSfx('place')
      set((s) => (alive(s) ? { dice: { ...s.dice!, phase: 'fade' } } : {}))
    }, tumble + 480)
    setTimeout(() => set((s) => (alive(s) ? { dice: null } : {})), tumble + 980)
  },
  setDrag: (dragCardId) => set({ dragCardId }),
  setDragBuild: (dragBuild) => set({ dragBuild }),
  setDragRemove: (dragRemove) => set({ dragRemove }),
  setSelected: (selectedCardId) => set({ selectedCardId }),
  clear: () => set({ dragCardId: null, dragBuild: null, dragRemove: null, selectedCardId: null }),
  addFlight: (f) => set((s) => ({ flights: [...s.flights, { ...f, id: ++flightId }] })),
  removeFlight: (id) => set((s) => ({ flights: s.flights.filter((f) => f.id !== id) })),
  openZoom: (zoom) => set({ zoom }),
  closeZoom: () => set({ zoom: null }),
  openResolve: (resolve) => set({ resolve, zoom: null }),
  closeResolve: () => set({ resolve: null }),
  revealRoll: (revealedRoll) => set({ revealedRoll }),
}))

if (import.meta.env.DEV && typeof window !== 'undefined') {
  ;(window as unknown as { __ui: typeof useUI }).__ui = useUI
}
