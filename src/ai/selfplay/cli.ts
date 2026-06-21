// Self-play CLI. Run with vite-node (bundled with vitest):
//   npm run ai:selfplay -- --mode base --games 300 --seed 1 --p0 greedy --p1 greedy
//
// Choosers: fast | greedy | mcts:<easy|medium|hard>

import { playSeries, type Chooser } from './run'
import { analyze } from './analyze'
import { reportMarkdown, writeReport } from './report'
import { chooseFast, chooseGreedy } from '../agent/policy'
import { mctsChooser } from '../agent/agent'
import type { Mode } from '../sim/state'

function arg(name: string, def?: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`)
  return i >= 0 && i + 1 < process.argv.length ? process.argv[i + 1] : def
}

function makeChooser(spec: string): Chooser {
  if (spec === 'fast') return chooseFast
  if (spec === 'greedy') return (s, rng) => [chooseGreedy(s), rng]
  if (spec.startsWith('mcts:')) {
    const diff = spec.slice(5) as 'easy' | 'medium' | 'hard'
    return mctsChooser(diff)
  }
  throw new Error(`unknown chooser: ${spec}`)
}

async function main() {
  const mode = (arg('mode', 'base') as Mode)
  const games = parseInt(arg('games', '200')!, 10)
  const seed = parseInt(arg('seed', '1')!, 10)
  const p0spec = arg('p0', 'greedy')!
  const p1spec = arg('p1', 'greedy')!

  // eslint-disable-next-line no-console
  console.log(`self-play: mode=${mode} games=${games} seed=${seed} p0=${p0spec} p1=${p1spec}`)
  const res = playSeries(games, makeChooser(p0spec), makeChooser(p1spec), mode, seed)
  const a = analyze(res)

  // eslint-disable-next-line no-console
  console.log(`\nwin p0=${(a.winRate.p0 * 100).toFixed(1)}%  p1=${(a.winRate.p1 * 100).toFixed(1)}%  | avg turns ${a.turns.avg.toFixed(1)} | illegal ${a.illegalTotal}`)
  // eslint-disable-next-line no-console
  if (a.flags.length) console.log('flags:\n  ' + a.flags.join('\n  '))

  const safe = (x: string) => x.replace(/[:]/g, '-')
  const md = reportMarkdown(a, { p0: p0spec, p1: p1spec, seed })
  try {
    const out = await writeReport(`docs/goal-2026-06-21-ai-opponent/reports/${mode}-${safe(p0spec)}-vs-${safe(p1spec)}.md`, md)
    // eslint-disable-next-line no-console
    console.log(`report → ${out}`)
  } catch (e) {
    // eslint-disable-next-line no-console
    console.warn('report write failed (non-fatal):', (e as Error).message)
  }
}

main().catch((e) => { console.error(e); process.exit(1) })
