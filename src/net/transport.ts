// Swappable network transport. Phase 2 syncs the whole serializable GameState
// snapshot and resolves order by `seq` (last-write-wins) — the engine + action
// payloads are already deterministic/serializable, so any relay works.
//
// Implementations: PartyKitTransport (real internet, Cloudflare) and
// LoopbackTransport (same-machine cross-tab via BroadcastChannel; also the
// in-process bus used by tests). The store talks ONLY to this interface.

import type { GameState, PlayerId } from '../types'

export type ConnStatus = 'idle' | 'connecting' | 'connected' | 'closed' | 'error'

/** Wire messages. `from` = sender client id so receivers drop their own echoes. */
export type NetMessage =
  // `force` adopts regardless of seq — used for new-game resets (seq→0) and
  // replies to a late joiner's sync-request.
  | { t: 'snapshot'; from: string; seq: number; state: GameState; force?: boolean }
  | { t: 'hello'; from: string; name: string; seat: PlayerId }
  | { t: 'sync-request'; from: string }

export interface Transport {
  /** this client's stable id within the room */
  readonly id: string
  readonly room: string
  connect(): void
  disconnect(): void
  send(msg: NetMessage): void
  onMessage(cb: (m: NetMessage) => void): () => void
  onStatus(cb: (s: ConnStatus) => void): () => void
}

/** Short, URL-safe client id (no Math.random in the engine, but fine here). */
export function makeClientId(): string {
  return Math.random().toString(36).slice(2, 10)
}

/** Normalize a human-typed room code into a stable channel name. */
export function normalizeRoom(code: string): string {
  return code.trim().toLowerCase().replace(/[^a-z0-9-]/g, '').slice(0, 32) || 'lobby'
}

/**
 * Derive a deterministic game seed from the room code so BOTH clients build a
 * byte-identical `newGame` from t=0 (same regions, deck order, event deck) instead
 * of each starting from an independent random seed. Same room → same seed; this is
 * the root fix for "our games look different / regions mismatched" online.
 * Plain FNV-1a 32-bit hash → an unsigned int.
 */
export function seedFromRoom(room: string): number {
  let h = 0x811c9dc5
  for (let i = 0; i < room.length; i++) {
    h ^= room.charCodeAt(i)
    h = Math.imul(h, 0x01000193)
  }
  return h >>> 0
}
