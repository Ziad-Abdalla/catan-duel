// Zustand store = the impure shell around the pure engine.
// It owns the RNG (dice), the current snapshot, AND the optional network
// transport. Every local mutation goes through the pure engine's applyAction,
// then (if online) broadcasts the full serializable snapshot; incoming
// snapshots are adopted by `seq` (last-write-wins) — see src/net/.

import { create } from 'zustand'
import type { GameState, PlayerId, SetId } from '../types'
import { newGame } from '../engine/newGame'
import { applyAction, mergeSnapshots, type Action } from '../engine/actions'
import { makeRng, type Rng } from '../engine/rng'
import { rollDice } from '../engine/dice'
import type { ConnStatus, NetMessage, Transport } from '../net/transport'

function freshSeed(): number {
  return Math.floor(Math.random() * 1_000_000_000)
}

let rollRng: Rng = makeRng(freshSeed())

// Network plumbing lives outside the serialized state (functions aren't part of
// the snapshot). Set on connect, torn down on disconnect.
let transport: Transport | null = null
let unsub: Array<() => void> = []

export interface NewHotseatOpts {
  seed?: number
  p0Name?: string
  p1Name?: string
  enabledSets?: SetId[]
}

export interface ConnectOpts {
  transport: Transport
  name: string
  seat: PlayerId
}

/** How many snapshots back the trust-based UNDO can reach (fat-finger recovery). */
const HISTORY_LIMIT = 50

interface GameStore {
  state: GameState
  seed: number
  /** past snapshots for trust-based undo (newest last); never broadcast. */
  history: GameState[]
  // net
  online: boolean
  status: ConnStatus
  room: string | null
  mySeat: PlayerId
  myName: string
  peers: Record<string, { name: string; seat: PlayerId }>
  // local actions
  dispatch: (a: Action) => void
  roll: () => void
  undo: () => void
  newHotseat: (opts?: NewHotseatOpts) => void
  // net actions
  connect: (opts: ConnectOpts) => void
  disconnect: () => void
}

function start(opts?: NewHotseatOpts) {
  const seed = opts?.seed ?? freshSeed()
  rollRng = makeRng(seed ^ 0x9e3779b9)
  return {
    seed,
    state: newGame({ seed, p0Name: opts?.p0Name, p1Name: opts?.p1Name, enabledSets: opts?.enabledSets }),
  }
}

export const useGame = create<GameStore>((set, get) => {
  /** Send our current snapshot to peers (no-op offline). */
  const broadcast = (state: GameState, force = false) => {
    if (transport && get().online) {
      transport.send({ t: 'snapshot', from: transport.id, seq: state.seq, state, force })
    }
  }

  /** Apply a locally-initiated action, recording the prior snapshot for undo, then broadcast. */
  const local = (mut: (s: GameState) => GameState) => {
    set((s) => {
      const state = mut(s.state)
      if (state === s.state) return {} // no-op action: nothing changed, nothing to record
      broadcast(state)
      const history = [...s.history, s.state].slice(-HISTORY_LIMIT)
      return { state, history }
    })
  }

  const handle = (m: NetMessage) => {
    const st = get()
    switch (m.t) {
      case 'snapshot':
        // Forced snapshots (new-game resets / sync replies) are adopted wholesale.
        if (m.force) {
          set({ state: m.state })
          break
        }
        // Otherwise seat-authority MERGE: keep each seat's own latest edits so a
        // peer's snapshot can never clobber our local resources (vanishing-token fix).
        set((s) => {
          const merged = mergeSnapshots(s.state, m.state)
          // Echo back only when our merge carries strictly-newer MONOTONIC state
          // (higher global seq or per-seat version) than the sender had. Log length
          // is deliberately excluded so equal-length/divergent logs can't cause an
          // infinite rebroadcast ping-pong; seq/seatSeq are a converging join.
          const contributed =
            merged.seq > m.state.seq ||
            merged.seatSeq.p0 > (m.state.seatSeq?.p0 ?? 0) ||
            merged.seatSeq.p1 > (m.state.seatSeq?.p1 ?? 0)
          if (contributed) broadcast(merged)
          return { state: merged }
        })
        break
      case 'hello': {
        set((s) => ({ peers: { ...s.peers, [m.from]: { name: m.name, seat: m.seat } } }))
        // Smart seat assignment: if the newcomer took the seat I'm on, the player with the
        // larger client id politely slides to the open seat. Deterministic (both sides run
        // it and agree), so two players who both picked "Player 1" auto-resolve to 1 & 2.
        const myId = transport?.id
        if (myId && m.seat === st.mySeat && myId > m.from) {
          const moved: PlayerId = st.mySeat === 'p0' ? 'p1' : 'p0'
          set({ mySeat: moved })
          transport?.send({ t: 'hello', from: myId, name: st.myName, seat: moved })
        }
        // someone joined → reply with our state so they sync to us
        broadcast(st.state, true)
        break
      }
      case 'sync-request':
        broadcast(st.state, true)
        break
    }
  }

  return {
    ...start(),
    history: [],
    online: false,
    status: 'idle',
    room: null,
    mySeat: 'p0',
    myName: 'Player 1',
    peers: {},

    dispatch: (a) => local((s) => applyAction(s, a)),

    roll: () => {
      const { production, event } = rollDice(rollRng)
      local((s) => applyAction(s, { type: 'roll', production, event }))
    },

    /** Trust-based undo: restore the previous snapshot (seq kept monotonic so peers
     *  still adopt it), then broadcast it as a forced reset. */
    undo: () => {
      set((s) => {
        if (s.history.length === 0) return {}
        const prev = s.history[s.history.length - 1]
        // Keep seq + both seat versions ahead of current so the restore wins everywhere.
        const restored = {
          ...prev,
          seq: s.state.seq + 1,
          seatSeq: { p0: s.state.seatSeq.p0 + 1, p1: s.state.seatSeq.p1 + 1 },
        }
        broadcast(restored, true)
        return { state: restored, history: s.history.slice(0, -1) }
      })
    },

    newHotseat: (opts) => {
      const fresh = start(opts)
      set({ ...fresh, history: [] })
      broadcast(fresh.state, true) // reset peers too (seq goes back to 0)
    },

    connect: ({ transport: tp, name, seat }) => {
      // tear down any previous connection
      get().disconnect()
      transport = tp
      unsub = [
        tp.onMessage(handle),
        tp.onStatus((status) => set({ status })),
      ]
      set({ online: true, room: tp.room, mySeat: seat, myName: name, status: 'connecting', peers: {} })
      tp.connect()
      // announce + pull current game from whoever's already in the room
      tp.send({ t: 'hello', from: tp.id, name, seat })
      tp.send({ t: 'sync-request', from: tp.id })
    },

    disconnect: () => {
      for (const u of unsub) u()
      unsub = []
      transport?.disconnect()
      transport = null
      set({ online: false, status: 'idle', room: null, peers: {} })
    },
  }
})

// Dev-only hook so the running app can be driven from the console / automated
// screenshots (never present in production builds).
if (import.meta.env.DEV && typeof window !== 'undefined') {
  ;(window as unknown as { __game: typeof useGame }).__game = useGame
}
