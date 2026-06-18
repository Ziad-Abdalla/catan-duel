// Zero-infrastructure transport for same-machine play and tests.
// In a browser it uses BroadcastChannel (real cross-tab realtime, no server).
// Without BroadcastChannel (Node/test) it falls back to an in-process bus, so
// two LoopbackTransports in the same process (or two tabs) exchange messages.

import {
  makeClientId,
  type ConnStatus,
  type NetMessage,
  type Transport,
} from './transport'

// ---- in-process bus (test / no-BroadcastChannel fallback) ----
type Listener = (m: NetMessage) => void
const buses = new Map<string, Set<Listener>>()

function busJoin(room: string, l: Listener): () => void {
  let set = buses.get(room)
  if (!set) buses.set(room, (set = new Set()))
  set.add(l)
  return () => set!.delete(l)
}
function busSend(room: string, m: NetMessage) {
  for (const l of buses.get(room) ?? []) l(m)
}

const hasBC = typeof BroadcastChannel !== 'undefined'

export interface LoopbackOpts {
  /** force the in-process bus instead of BroadcastChannel (deterministic tests) */
  broadcast?: boolean
}

export class LoopbackTransport implements Transport {
  readonly id = makeClientId()
  readonly room: string
  private useBC: boolean
  private bc: BroadcastChannel | null = null
  private msgCbs = new Set<(m: NetMessage) => void>()
  private statusCbs = new Set<(s: ConnStatus) => void>()
  private leaveBus: (() => void) | null = null

  constructor(room: string, opts: LoopbackOpts = {}) {
    this.room = room
    this.useBC = opts.broadcast ?? hasBC
  }

  private deliver = (m: NetMessage) => {
    if (m.from === this.id) return // ignore our own echo
    for (const cb of this.msgCbs) cb(m)
  }

  connect() {
    this.setStatus('connecting')
    if (this.useBC) {
      this.bc = new BroadcastChannel(`catan-duel:${this.room}`)
      this.bc.onmessage = (e: MessageEvent) => this.deliver(e.data as NetMessage)
    } else {
      this.leaveBus = busJoin(this.room, this.deliver)
    }
    this.setStatus('connected')
  }

  disconnect() {
    this.bc?.close()
    this.bc = null
    this.leaveBus?.()
    this.leaveBus = null
    this.setStatus('closed')
  }

  send(msg: NetMessage) {
    if (this.bc) this.bc.postMessage(msg)
    else busSend(this.room, msg)
  }

  onMessage(cb: (m: NetMessage) => void) {
    this.msgCbs.add(cb)
    return () => this.msgCbs.delete(cb)
  }
  onStatus(cb: (s: ConnStatus) => void) {
    this.statusCbs.add(cb)
    return () => this.statusCbs.delete(cb)
  }
  private setStatus(s: ConnStatus) {
    for (const cb of this.statusCbs) cb(s)
  }
}
