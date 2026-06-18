// Deterministic seeded RNG so games are reproducible across both clients
// from a single shared seed (the lightweight trust mechanism — council seat 11).

export type Rng = () => number

/** mulberry32 — small, fast, deterministic PRNG. */
export function makeRng(seed: number): Rng {
  let a = seed >>> 0
  return function () {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/** Fisher–Yates shuffle using the provided RNG. Returns a new array. */
export function shuffle<T>(arr: readonly T[], rng: Rng): T[] {
  const a = arr.slice()
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

/** Integer in [1, sides]. */
export function rollDie(rng: Rng, sides = 6): number {
  return 1 + Math.floor(rng() * sides)
}
