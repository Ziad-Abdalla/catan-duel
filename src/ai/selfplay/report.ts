// Render a self-play Analysis to markdown and (optionally) write it to disk.
// fs is imported lazily so this module never pulls node APIs into a browser bundle.

import type { Analysis } from './analyze'

export function reportMarkdown(a: Analysis, meta: { p0: string; p1: string; seed: number }): string {
  const pct = (x: number) => `${(x * 100).toFixed(1)}%`
  const f2 = (x: number) => x.toFixed(2)
  const lines: string[] = []
  lines.push(`# Self-play report — mode: ${a.mode}`)
  lines.push('')
  lines.push(`- Matchup: **p0=${meta.p0}** vs **p1=${meta.p1}** · games: **${a.games}** · base seed: ${meta.seed}`)
  lines.push(`- Win rate — p0: **${pct(a.winRate.p0)}** · p1: **${pct(a.winRate.p1)}** · draws: ${pct(a.winRate.draws)}`)
  lines.push(`- Game length (turns) — avg **${f2(a.turns.avg)}**, min ${a.turns.min}, max ${a.turns.max}`)
  lines.push(`- Illegal-move attempts: **${a.illegalTotal}** ${a.illegalTotal === 0 ? '✅' : '❌'}`)
  lines.push('')
  lines.push('## VP sources (avg per player per game)')
  lines.push(`| settlements | cities | building VP | tokens |`)
  lines.push(`|---|---|---|---|`)
  lines.push(`| ${f2(a.vpSourceAvg.settlements)} | ${f2(a.vpSourceAvg.cities)} | ${f2(a.vpSourceAvg.buildings)} | ${f2(a.vpSourceAvg.tokens)} |`)
  lines.push('')
  lines.push('## Builds (avg per game)')
  lines.push(`- roads ${f2(a.builds.roads)} · settlements ${f2(a.builds.settlements)} · city upgrades ${f2(a.builds.cities)}`)
  lines.push('')
  lines.push('## Event-die face share')
  lines.push(Object.entries(a.eventFaceShare).map(([k, v]) => `${k} ${pct(v)}`).join(' · ') || '(none)')
  lines.push('')
  lines.push('## Card usage (total plays across all games)')
  lines.push('| card | plays |')
  lines.push('|---|---|')
  for (const c of a.cardUsage) lines.push(`| ${c.name} | ${c.plays} |`)
  lines.push('')
  lines.push('## Flags')
  if (a.flags.length === 0) lines.push('✅ none — reads sane.')
  else for (const fl of a.flags) lines.push(`- ${fl}`)
  lines.push('')
  return lines.join('\n')
}

export async function writeReport(relPath: string, md: string): Promise<string> {
  const fs = await import('node:fs')
  const path = await import('node:path')
  const abs = path.resolve(process.cwd(), relPath)
  fs.mkdirSync(path.dirname(abs), { recursive: true })
  fs.writeFileSync(abs, md, 'utf8')
  return abs
}
