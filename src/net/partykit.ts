// Real-internet transport via PartyKit (Cloudflare). The server (party/server.ts)
// is a dumb relay that also remembers the latest snapshot for late joiners.
// Swappable sibling of LoopbackTransport — same Transport interface.

import PartySocket from 'partysocket'
import {
  makeClientId,
  type ConnStatus,
  type NetMessage,
  type Transport,
} from './transport'

/**
 * PartyKit host. Order of preference:
 *  1. VITE_PARTYKIT_HOST — explicit override (used by local VPN dev, see .env.development.local).
 *  2. The page's own origin — when the app is SERVED BY PartyKit (a deploy), the relay lives at the
 *     same host, so we just talk to wherever we were loaded from. Makes deploys zero-config.
 *  3. localhost:1999 — plain local fallback.
 */
export const PARTYKIT_HOST: string =
  (import.meta.env.VITE_PARTYKIT_HOST as string | undefined) ||
  (typeof window !== 'undefined' && window.location?.host) ||
  'localhost:1999'

/**
 * Choose ws:// vs wss:// for a given host.
 *
 * PartySocket only treats a fixed list of private prefixes (localhost, 127.*,
 * 192.168.*, 10.*, 172.16–31.*) as plain `ws`; ANY other host — including a
 * Radmin VPN address like 26.75.124.139 — defaults to secure `wss`. But our
 * LAN/VPN relay (`partykit dev`) speaks plain `ws` with no TLS, so a VPN IP
 * would fail the TLS handshake and never connect. So: force `ws` for a bare
 * IPv4[:port] host, and otherwise mirror the page (https → wss, http → ws),
 * which keeps real Cloudflare deploys on wss.
 */
export function partyProtocol(host: string): 'ws' | 'wss' {
  const bareIp = /^\d{1,3}(\.\d{1,3}){3}(:\d+)?$/.test(host)
  if (bareIp) return 'ws'
  if (typeof window !== 'undefined' && window.location?.protocol === 'http:') return 'ws'
  return 'wss'
}

export class PartyKitTransport implements Transport {
  readonly id = makeClientId()
  readonly room: string
  private socket: PartySocket | null = null
  private msgCbs = new Set<(m: NetMessage) => void>()
  private statusCbs = new Set<(s: ConnStatus) => void>()
  private host: string

  constructor(room: string, host: string = PARTYKIT_HOST) {
    this.room = room
    this.host = host
  }

  connect() {
    this.setStatus('connecting')
    const socket = new PartySocket({
      host: this.host,
      room: this.room,
      protocol: partyProtocol(this.host),
    })
    this.socket = socket
    socket.addEventListener('open', () => this.setStatus('connected'))
    socket.addEventListener('close', () => this.setStatus('closed'))
    socket.addEventListener('error', () => this.setStatus('error'))
    socket.addEventListener('message', (e: MessageEvent) => {
      let m: NetMessage
      try {
        m = JSON.parse(e.data as string)
      } catch {
        return
      }
      if (m.from === this.id) return // ignore our own echo
      for (const cb of this.msgCbs) cb(m)
    })
  }

  disconnect() {
    this.socket?.close()
    this.socket = null
    this.setStatus('closed')
  }

  send(msg: NetMessage) {
    this.socket?.send(JSON.stringify(msg))
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
