import { describe, it, expect } from 'vitest'
import CatanDuelServer from '../../party/server'

// Minimal stand-ins for the PartyKit runtime objects (type-only at compile time).
class MockConn {
  sent: string[] = []
  constructor(public id: string) {}
  send(m: string) {
    this.sent.push(m)
  }
}
class MockRoom {
  broadcasts: { msg: string; exclude?: string[] }[] = []
  broadcast(msg: string, exclude?: string[]) {
    this.broadcasts.push({ msg, exclude })
  }
}

function makeServer() {
  const room = new MockRoom()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const server = new CatanDuelServer(room as any)
  return { server, room }
}

describe('PartyKit relay server', () => {
  it('relays a message to everyone except the sender', () => {
    const { server, room } = makeServer()
    const sender = new MockConn('a')
    const msg = JSON.stringify({ t: 'sync-request', from: 'a' })
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    server.onMessage(msg, sender as any)
    expect(room.broadcasts).toHaveLength(1)
    expect(room.broadcasts[0].msg).toBe(msg)
    expect(room.broadcasts[0].exclude).toEqual(['a'])
  })

  it('remembers the latest snapshot and replays it to a late joiner', () => {
    const { server } = makeServer()
    const snap = JSON.stringify({ t: 'snapshot', from: 'a', seq: 9, state: { seq: 9 } })
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    server.onMessage(snap, new MockConn('a') as any)

    const late = new MockConn('z')
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    server.onConnect(late as any)
    expect(late.sent).toEqual([snap])
  })

  it('sends nothing to the first connection (no snapshot yet)', () => {
    const { server } = makeServer()
    const first = new MockConn('a')
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    server.onConnect(first as any)
    expect(first.sent).toHaveLength(0)
  })
})
