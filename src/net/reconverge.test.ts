import { describe, it, expect, afterEach } from 'vitest'
import { LoopbackTransport } from './loopback'
import { seedFromRoom } from './transport'
import type { NetMessage } from './transport'
import { useGame } from '../store/gameStore'
import { newGame } from '../engine/newGame'
import { mergeSnapshots } from '../engine/actions'

const BUS = { broadcast: false } as const

afterEach(() => {
  useGame.getState().disconnect()
})

describe('seedFromRoom — both clients derive the same game seed from the room code', () => {
  it('is deterministic: the same room code always yields the same seed', () => {
    expect(seedFromRoom('oak-fjord-42')).toBe(seedFromRoom('oak-fjord-42'))
  })

  it('different room codes yield different seeds', () => {
    expect(seedFromRoom('oak-fjord-42')).not.toBe(seedFromRoom('oak-fjord-43'))
  })

  it('produces a finite non-negative 32-bit integer', () => {
    const s = seedFromRoom('any-room-99')
    expect(Number.isInteger(s)).toBe(true)
    expect(s).toBeGreaterThanOrEqual(0)
  })

  it('two clients on the same room build an identical game with DISTINCT p0/p1 regions', () => {
    const seed = seedFromRoom('shared-room-7')
    const A = newGame({ seed })
    const B = newGame({ seed })
    expect(JSON.stringify(A)).toBe(JSON.stringify(B)) // same lineage on both clients
    // the owner's bug: the two principalities must NOT have the same production layout
    expect(A.players.p0.regions).not.toEqual(A.players.p1.regions)
  })
})

describe('mergeSnapshots is a convergent join (guarantees reconvergence terminates)', () => {
  // two divergent states with EQUAL seq + seatSeq but different shared content
  const base = newGame({ seed: 1 })
  const a = { ...base, discard: ['zzz'] }
  const b = { ...base, discard: ['aaa'] }

  it('is commutative: merge(a,b) === merge(b,a)', () => {
    expect(JSON.stringify(mergeSnapshots(a, b))).toBe(JSON.stringify(mergeSnapshots(b, a)))
  })

  it('is idempotent: merging the result back is a fixed point', () => {
    const m = mergeSnapshots(a, b)
    expect(JSON.stringify(mergeSnapshots(m, b))).toBe(JSON.stringify(m))
    expect(JSON.stringify(mergeSnapshots(a, m))).toBe(JSON.stringify(m))
  })
})

describe('store reconvergence — rebroadcast on content difference (not just monotonic)', () => {
  it('rebroadcasts the merged state when an equal-version snapshot diverges', () => {
    useGame.getState().newHotseat({ seed: 1 })
    useGame.getState().connect({
      transport: new LoopbackTransport('reconv', BUS),
      name: 'A',
      seat: 'p0',
    })
    const peer = new LoopbackTransport('reconv', BUS)
    const got: NetMessage[] = []
    peer.onMessage((m) => got.push(m))
    peer.connect()

    // Inject a local state that diverges from an incoming snapshot at EQUAL seq + seatSeq.
    const base = useGame.getState().state
    const local = { ...base, discard: ['zzz'] } // lexicographically larger → wins stableGt
    const incoming = { ...base, discard: ['aaa'] }
    useGame.setState({ state: local })
    got.length = 0

    // Non-forced snapshot at the SAME seq/seatSeq but different content.
    peer.send({ t: 'snapshot', from: peer.id, seq: incoming.seq, state: incoming })

    // The merge keeps the larger lineage (discard 'zzz'); since that differs from the
    // incoming snapshot, the store must rebroadcast so the peer can converge.
    const snaps = got.filter((m): m is Extract<NetMessage, { t: 'snapshot' }> => m.t === 'snapshot')
    expect(snaps.length).toBeGreaterThanOrEqual(1)
    expect(snaps[snaps.length - 1].state.discard).toEqual(['zzz'])

    peer.disconnect()
  })
})
