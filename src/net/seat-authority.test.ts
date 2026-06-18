import { describe, it, expect, afterEach } from 'vitest'
import { newGame } from '../engine/newGame'
import { applyAction, mergeSnapshots, resourceTotalOf } from '../engine/actions'
import { LoopbackTransport } from './loopback'
import { useGame } from '../store/gameStore'
import type { GameState } from '../types'

const BUS = { broadcast: false } as const

afterEach(() => {
  useGame.getState().disconnect()
})

/** Index of the first non-empty region of a given resource for a player. */
function regionOf(s: GameState, player: 'p0' | 'p1', resource: string): number {
  return s.players[player].regions.findIndex((r) => !r.empty && r.resource === resource)
}

describe('seat-authority merge — concurrent edits never clobber a seat', () => {
  it('keeps BOTH players’ simultaneous resource edits (the vanishing-token fix)', () => {
    const base = newGame({ seed: 7 })
    // Both players edit their OWN seat, concurrently, from the same base snapshot.
    const aEdit = applyAction(base, { type: 'setStored', player: 'p0', regionIndex: regionOf(base, 'p0', 'ore'), stored: 3 })
    const bEdit = applyAction(base, { type: 'setStored', player: 'p1', regionIndex: regionOf(base, 'p1', 'wool'), stored: 3 })

    // Naive last-write-wins would drop one of these. The merge must keep both.
    const merged = mergeSnapshots(aEdit, bEdit)
    expect(resourceTotalOf(merged.players.p0, 'ore')).toBe(resourceTotalOf(aEdit.players.p0, 'ore'))
    expect(resourceTotalOf(merged.players.p1, 'wool')).toBe(resourceTotalOf(bEdit.players.p1, 'wool'))
  })

  it('is order-independent (merging A←B equals B←A on the touched seats)', () => {
    const base = newGame({ seed: 11 })
    const a = applyAction(base, { type: 'addResource', player: 'p0', resource: 'brick', count: 2 })
    const b = applyAction(base, { type: 'addResource', player: 'p1', resource: 'gold', count: 2 })
    const ab = mergeSnapshots(a, b)
    const ba = mergeSnapshots(b, a)
    expect(resourceTotalOf(ab.players.p0, 'brick')).toBe(resourceTotalOf(ba.players.p0, 'brick'))
    expect(resourceTotalOf(ab.players.p1, 'gold')).toBe(resourceTotalOf(ba.players.p1, 'gold'))
  })

  it('a newer edit to a seat wins over an older one for that seat', () => {
    const base = newGame({ seed: 3 })
    const older = applyAction(base, { type: 'addResource', player: 'p0', resource: 'ore', count: 1 })
    const newer = applyAction(older, { type: 'addResource', player: 'p0', resource: 'ore', count: 1 })
    // merge in either direction → the newer (higher seatSeq) p0 wins
    expect(resourceTotalOf(mergeSnapshots(newer, older).players.p0, 'ore')).toBe(
      resourceTotalOf(newer.players.p0, 'ore'),
    )
    expect(resourceTotalOf(mergeSnapshots(older, newer).players.p0, 'ore')).toBe(
      resourceTotalOf(newer.players.p0, 'ore'),
    )
  })

  it('store: a peer snapshot does not wipe my local seat edit applied just before it', () => {
    useGame.getState().newHotseat({ seed: 5 })
    useGame.getState().connect({
      transport: new LoopbackTransport('seat-a', BUS),
      name: 'Me',
      seat: 'p0',
    })
    const base = useGame.getState().state

    // I (p0) raise my own ore locally.
    const oreIdx = regionOf(base, 'p0', 'ore')
    useGame.getState().dispatch({ type: 'setStored', player: 'p0', regionIndex: oreIdx, stored: 3 })
    const myOre = resourceTotalOf(useGame.getState().state.players.p0, 'ore')

    // Meanwhile a peer, who never saw my edit, pushes a snapshot built from base
    // where THEY (p1) changed their own wool. It must not erase my ore.
    const peer = new LoopbackTransport('seat-a', BUS)
    peer.connect()
    const peerState = applyAction(base, { type: 'setStored', player: 'p1', regionIndex: regionOf(base, 'p1', 'wool'), stored: 3 })
    peer.send({ t: 'snapshot', from: peer.id, seq: peerState.seq, state: peerState })

    const after = useGame.getState().state
    expect(resourceTotalOf(after.players.p0, 'ore')).toBe(myOre) // my edit survived
    expect(after.players.p1.regions[regionOf(base, 'p1', 'wool')].stored).toBe(3) // peer edit applied
    peer.disconnect()
  })
})
