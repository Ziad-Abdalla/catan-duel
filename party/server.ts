// PartyKit relay for Catan Duel. One room per game code. The server keeps no
// game logic (the engine is client-side + deterministic) — it just relays
// messages and remembers the latest snapshot so a refreshing/late-joining
// player instantly resyncs.
//
// Local dev:  npx partykit dev
// Deploy:     npx partykit deploy   (then set VITE_PARTYKIT_HOST to the URL)

import type * as Party from 'partykit/server'

export default class CatanDuelServer implements Party.Server {
  /** last 'snapshot' message seen, sent verbatim to anyone who connects */
  private lastSnapshot: string | null = null

  constructor(readonly room: Party.Room) {}

  onConnect(conn: Party.Connection) {
    if (this.lastSnapshot) conn.send(this.lastSnapshot)
  }

  onMessage(message: string, sender: Party.Connection) {
    try {
      const m = JSON.parse(message)
      if (m && m.t === 'snapshot') this.lastSnapshot = message
    } catch {
      // ignore non-JSON
    }
    // relay to everyone except the sender
    this.room.broadcast(message, [sender.id])
  }
}
