// AoD data corrections — round 2, from reading the card faces (4x/6x PDF page renders) +
// the owner's reads of the physical cards. Costs/names read by me; point values + per-level
// rotation tracks supplied by the owner. Run: node docs/goal-2026-06-22-aod-playable/apply-data-fixes-2.mjs
import { readFileSync, writeFileSync } from 'node:fs'
const PATH = new URL('../../src/data/cards.json', import.meta.url)
const raw = readFileSync(PATH, 'utf8')
const eol = raw.includes('\r\n') ? '\r\n' : '\n'
const cards = JSON.parse(raw)
const byId = new Map(cards.map((c) => [c.id, c]))
const cost = (...pairs) => pairs.map(([resource, count]) => ({ resource, count }))

const FIXES = {
  // costs read directly off the card faces (corrects the prior vision pass)
  'intrigue-pilgrimage-site': { cost: cost(['ore', 1], ['gold', 1]), clearUnclear: true },
  'intrigue-odins-fountain': { cost: cost(['brick', 1], ['ore', 1], ['gold', 1]), clearUnclear: true },
  'intrigue-great-thingstead': { cost: cost(['lumber', 2], ['grain', 2], ['wool', 2]) },
  'merchants-olaf-the-merchant-ship-captain': { cost: cost(['grain', 1], ['wool', 1]) },
  'barbarians-white-raven-tavern': { cost: cost(['lumber', 1], ['grain', 1]), clearUnclear: true }, // no point symbols (only the era emblem)
  // points from the owner's physical-card reads
  'intrigue-judith-guardian-of-the-church': { setVal: { skill: 2 }, clearUnclear: true }, // 2 skill + 2 VP
  'intrigue-godfrey-the-intriguer': { delVal: ['skill'], clearUnclear: true }, // 1 strength only
  // names / confirmations
  'merchants-herold-the-master-merchant': { name: 'Hergild the Master Merchant', clearUnclear: true },
  'merchants-commercial-harbor': { clearUnclear: true }, // commerce + strength confirmed on the face
  'barbarians-siward-the-scout': { clearUnclear: true }, // 1 strength (rulebook-stated), confirmed
  'barbarians-triumph-card': { clearUnclear: true }, // copies 2 + level=VP confirmed by the card text
}

let n = 0
for (const [id, f] of Object.entries(FIXES)) {
  const c = byId.get(id)
  if (!c) { console.error('MISSING', id); process.exit(1) }
  if (f.name) c.name = f.name
  if (f.cost) c.cost = f.cost
  if (f.setVal || f.delVal) {
    c.values = c.values || {}
    for (const k of f.delVal || []) delete c.values[k]
    for (const [k, v] of Object.entries(f.setVal || {})) c.values[k] = v
  }
  if (f.clearUnclear) delete c.unclear
  n++
}
writeFileSync(PATH, JSON.stringify(cards, null, 2).replace(/\n/g, eol) + eol)
console.log(`Applied ${n} round-2 fixes.`)
