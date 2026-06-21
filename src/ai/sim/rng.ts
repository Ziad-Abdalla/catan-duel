// Pure, seeded RNG for the AI sim. State is a single 32-bit number carried in
// the game state, so apply() stays a pure function (state in → state out) and
// games are fully reproducible — required for self-play, tests, and ISMCTS
// determinization. mulberry32, expressed functionally (no closures over mutable
// state). NOTE: a private copy — the sim never imports src/engine.

/** Advance the stream once. Returns [value in [0,1), next state]. */
export function rngNext(state: number): [number, number] {
  let a = (state + 0x6d2b79f5) | 0
  let t = Math.imul(a ^ (a >>> 15), 1 | a)
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
  const value = ((t ^ (t >>> 14)) >>> 0) / 4294967296
  return [value, a >>> 0]
}

/** Integer in [0, n). Returns [int, next state]. */
export function rngInt(state: number, n: number): [number, number] {
  const [v, s] = rngNext(state)
  return [Math.floor(v * n), s]
}

/** Die in [1, sides]. Returns [face, next state]. */
export function rngDie(state: number, sides = 6): [number, number] {
  const [i, s] = rngInt(state, sides)
  return [i + 1, s]
}

/** Fisher–Yates shuffle. Returns [new array, next state]. */
export function rngShuffle<T>(arr: readonly T[], state: number): [T[], number] {
  const a = arr.slice()
  let s = state
  for (let i = a.length - 1; i > 0; i--) {
    let j: number
    ;[j, s] = rngInt(s, i + 1)
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return [a, s]
}

/** Derive a fresh, well-mixed seed from a base seed + a salt (for determinization). */
export function deriveSeed(seed: number, salt: number): number {
  let h = (seed ^ Math.imul(salt + 0x9e3779b9, 0x85ebca6b)) >>> 0
  h = Math.imul(h ^ (h >>> 13), 0xc2b2ae35) >>> 0
  return (h ^ (h >>> 16)) >>> 0
}
