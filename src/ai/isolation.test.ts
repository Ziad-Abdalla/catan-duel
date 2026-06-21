import { describe, it, expect } from 'vitest'

// Isolation guard for the PURE AI ENGINE. The engine (sim / agent / cards / selfplay)
// must never import the live game's engine, store, or board UI — it is a clean,
// independently-testable reimplementation.
//
// The INTEGRATION layer (src/ai/integration) and the mode UI deliberately DO import
// the live store/board: that's how "play vs AI" reuses the exact real board. Those
// dirs are intentionally out of scope here.
const engineFiles = import.meta.glob('./{sim,agent,cards,selfplay}/**/*.{ts,tsx}', {
  query: '?raw', import: 'default', eager: true,
}) as Record<string, string>

const FORBIDDEN = /from\s+['"][^'"]*\/(engine|store|ui\/board)(\/|['"])/

describe('AI engine isolation', () => {
  it('no sim/agent/cards/selfplay file imports the live engine, store, or board UI', () => {
    const offenders: string[] = []
    for (const [path, src] of Object.entries(engineFiles)) {
      src.split('\n').forEach((line, i) => {
        if (FORBIDDEN.test(line)) offenders.push(`${path}:${i + 1}  ${line.trim()}`)
      })
    }
    expect(offenders, `forbidden live-game imports in the pure engine:\n${offenders.join('\n')}`).toEqual([])
  })

  it('scanned a meaningful number of engine source files', () => {
    expect(Object.keys(engineFiles).length).toBeGreaterThan(10)
  })
})
