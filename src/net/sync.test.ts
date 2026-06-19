import { describe, it, expect, afterEach } from 'vitest'
import { LoopbackTransport } from './loopback'
import type { NetMessage } from './transport'
import { useGame } from '../store/gameStore'
import { applyAction } from '../engine/actions'

const BUS = { broadcast: false } as const // in-process bus = synchronous, deterministic

afterEach(() => {
  useGame.getState().disconnect()
})

describe('LoopbackTransport (in-process bus)', () => {
  it('delivers messages to peers but not back to the sender', () => {
    const a = new LoopbackTransport('round-trip', BUS)
    const b = new LoopbackTransport('round-trip', BUS)
    const aGot: NetMessage[] = []
    const bGot: NetMessage[] = []
    a.onMessage((m) => aGot.push(m))
    b.onMessage((m) => bGot.push(m))
    a.connect()
    b.connect()

    a.send({ t: 'sync-request', from: a.id })
    expect(bGot).toHaveLength(1)
    expect(aGot).toHaveLength(0) // sender ignores its own echo

    a.disconnect()
    b.disconnect()
  })

  it('isolates different room codes', () => {
    const a = new LoopbackTransport('room-1', BUS)
    const b = new LoopbackTransport('room-2', BUS)
    const bGot: NetMessage[] = []
    b.onMessage((m) => bGot.push(m))
    a.connect()
    b.connect()
    a.send({ t: 'sync-request', from: a.id })
    expect(bGot).toHaveLength(0)
    a.disconnect()
    b.disconnect()
  })
})

describe('store snapshot sync', () => {
  it('adopts a newer snapshot, ignores an older one, and accepts a forced reset', () => {
    useGame.getState().newHotseat({ seed: 1 })
    useGame.getState().connect({
      transport: new LoopbackTransport('sync-a', BUS),
      name: 'A',
      seat: 'p0',
    })

    // a second peer in the same room pushes state changes
    const peer = new LoopbackTransport('sync-a', BUS)
    peer.connect()

    const base = useGame.getState().state
    // build a newer state (seq advances) where p0 reaches the threshold
    let advanced = base
    advanced = applyAction(advanced, { type: 'adjustVP', player: 'p0', delta: 5 })
    expect(advanced.seq).toBeGreaterThan(base.seq)

    peer.send({ t: 'snapshot', from: peer.id, seq: advanced.seq, state: advanced })
    expect(useGame.getState().state.players.p0.victoryPoints).toBe(7)
    expect(useGame.getState().state.eligible).toBe('p0')

    // an older snapshot (the base) must NOT clobber the newer merged one
    peer.send({ t: 'snapshot', from: peer.id, seq: base.seq, state: base })
    expect(useGame.getState().state.eligible).toBe('p0')

    // a forced snapshot (new-game reset, lower seq) IS adopted
    const reset = applyAction(base, { type: 'adjustVP', player: 'p1', delta: 0 }) // distinct object
    peer.send({ t: 'snapshot', from: peer.id, seq: 0, state: { ...reset, seq: 0 }, force: true })
    expect(useGame.getState().state.eligible).toBeUndefined()

    peer.disconnect()
  })

  it('broadcasts the snapshot to peers when the local player acts', () => {
    useGame.getState().newHotseat({ seed: 2 })

    const peer = new LoopbackTransport('sync-b', BUS)
    const got: NetMessage[] = []
    peer.onMessage((m) => got.push(m))
    peer.connect()

    useGame.getState().connect({
      transport: new LoopbackTransport('sync-b', BUS),
      name: 'A',
      seat: 'p0',
    })
    got.length = 0 // drop the hello/sync-request/forced-reply from connect

    useGame.getState().dispatch({ type: 'adjustVP', player: 'p0', delta: 1 })
    const snaps = got.filter((m) => m.t === 'snapshot')
    expect(snaps.length).toBeGreaterThanOrEqual(1)
    const last = snaps[snaps.length - 1]
    if (last.t === 'snapshot') {
      expect(last.state.players.p0.victoryPoints).toBe(3) // 2 + 1
    }

    peer.disconnect()
  })
})
