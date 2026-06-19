import { test } from '@playwright/test'
import { Driver } from './harness'

/**
 * "Test all interactables in many possible orders": several seeded sequences mix the
 * common actions in different orders, asserting invariants after every single step and
 * screenshotting periodically. A live-store complement to the pure-engine fuzz test.
 */

// tiny deterministic RNG so each seed reproduces the same order
function rng(seed: number) {
  let s = seed >>> 0
  return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 0xffffffff)
}

const RES = ['lumber', 'brick', 'wool', 'grain', 'ore', 'gold'] as const

test('random action orders keep the live app valid', async ({ page }) => {
  const d = new Driver(page, 'e2e/artifacts/random-orders')
  await d.init()

  for (let seed = 1; seed <= 3; seed++) {
    await d.newGame({ enabledSets: seed % 2 ? ['gold'] : [] })
    const r = rng(seed * 7919)
    const ri = (n: number) => Math.floor(r() * n)
    const pick = <T,>(a: readonly T[]): T => a[ri(a.length)]

    for (let step = 0; step < 40; step++) {
      const s = await d.state()
      const p = ri(2) ? 'p1' : 'p0'
      const stacks = s.drawStacks.length
      const factories: Array<() => Record<string, unknown>> = [
        () => ({ type: 'roll', production: 1 + ri(6), event: pick(['event-card', 'plentiful-harvest', 'celebration', 'trade', 'brigand']) }),
        () => ({ type: 'applyProduction' }),
        () => ({ type: 'rotateRegion', player: p, regionIndex: ri(Math.max(1, s.players[p].regions.length)) }),
        () => ({ type: 'setStored', player: p, regionIndex: ri(Math.max(1, s.players[p].regions.length)), stored: ri(4) }),
        () => ({ type: 'drawRegion', player: p }),
        () => ({ type: 'drawToHand', player: p, stackIndex: ri(stacks) }),
        () => ({ type: 'buildPiece', player: p, piece: ri(2) ? 'road' : 'settlement', end: ri(2) ? 'left' : 'right', pay: !!ri(2) }),
        () => ({ type: 'upgradeCity', player: p, seat: ri(4), pay: !!ri(2) }),
        () => ({ type: 'expandSpine', player: p }),
        () => ({ type: 'addResource', player: p, resource: pick(RES), count: ri(5) - 2 }),
        () => ({ type: 'transferResource', from: pick(['p0', 'p1', 'bank']), to: pick(['p0', 'p1', 'bank']), resource: pick(RES), count: ri(3) }),
        () => ({ type: 'resolveBrigand' }),
        () => ({ type: 'takeFromStack', player: p, stackIndex: ri(stacks) }),
        () => ({ type: 'shuffleStack', stackIndex: ri(stacks) }),
        () => ({ type: 'drawEvent' }),
        () => ({ type: 'setToken', player: ri(3) ? p : null, token: ri(2) ? 'hero' : 'trade' }),
        () => ({ type: 'adjustVP', player: p, delta: ri(3) - 1 }),
        () => ({ type: 'endTurn' }),
      ]
      const placed = s.players[p].placed.length
      if (placed) factories.push(() => ({ type: 'removePlaced', player: p, placedIndex: ri(placed) }))
      const hand = s.players[p].hand
      if (hand.length) factories.push(() => ({ type: 'playCard', player: p, cardId: hand[ri(hand.length)], slot: ['s0-up', 's0-down', 's1-up'][ri(3)], pay: !!ri(2) }))

      await d.dispatch(pick(factories)())
      await d.check(`seed${seed}-step${step}`)
      if (step % 8 === 0) await d.shot(`seed${seed}-step${String(step).padStart(2, '0')}`)
    }
    await d.shot(`seed${seed}-final`)
  }

  // eslint-disable-next-line no-console
  console.log(`random-orders: ${d.shots} screenshots, ${d.consoleErrors.length} console errors, ${d.prevSeq} final seq`)
})
