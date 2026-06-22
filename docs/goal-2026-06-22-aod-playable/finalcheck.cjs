// Final accounting check for the 3 Age of Darkness sets — every card vs data integrity,
// placement path, resolution, and a copy-count checksum against the rulebook.
const fs = require('fs')
const R = (p) => fs.readFileSync('C:/Users/ziada/catan-duel/' + p, 'utf8')
const cards = JSON.parse(R('src/data/cards.json'))
const eff = R('src/engine/effects.ts')
const cardsTs = R('src/data/cards.ts')

const setBlock = (name) => {
  const m = new RegExp(name + '[\\s\\S]*?\\[([\\s\\S]*?)\\]').exec(cardsTs)
  return m ? [...m[1].matchAll(/'([a-z0-9-]+)'/g)].map((x) => x[1]) : []
}
const objKeys = (name) => {
  const m = new RegExp('export const ' + name + '[^{]*\\{([\\s\\S]*?)\\n\\}').exec(cardsTs)
  return m ? [...m[1].matchAll(/'([a-z0-9-]+)'\s*:/g)].map((x) => x[1]) : []
}
const FOREIGN = new Set(setBlock('FOREIGN_CARD_IDS = new Set<string>'))
const ROADC = new Set(setBlock('ROAD_COMPLEMENT_IDS = new Set<string>'))
const REGEXP = new Set(objKeys('REGION_EXPANSIONS'))
const ATTACH = new Set(objKeys('ATTACHABLE'))
const LEVELS = new Set(objKeys('PLACED_LEVEL_VALUES'))
const effBlock = eff.slice(0, eff.indexOf('EVENT_EFFECTS'))
const EFFECTS = new Set([...effBlock.matchAll(/^  '([a-z0-9-]+)'\s*:/gm)].map((x) => x[1]))

const RES = new Set(['lumber', 'brick', 'wool', 'grain', 'ore', 'gold'])
const CATS = new Set(['region', 'road', 'settlement', 'city', 'building', 'action', 'event', 'hero-or-unit'])
const sets = ['intrigue', 'merchants', 'barbarians']
const RULEBOOK_COPIES = { intrigue: 28, merchants: 30, barbarians: 32 }

const problems = []
const rows = []
const copyTotals = { intrigue: 0, merchants: 0, barbarians: 0 }
const uniq = { intrigue: 0, merchants: 0, barbarians: 0 }

for (const c of cards) {
  if (!sets.includes(c.set)) continue
  uniq[c.set]++; copyTotals[c.set] += c.copies || 1
  const probs = []
  if (!CATS.has(c.category)) probs.push('bad category ' + c.category)
  if (!c.rules_text || c.rules_text.trim().length < 12) probs.push('thin/empty rules_text')
  if (c.unclear) probs.push('UNRESOLVED unclear flag')
  for (const co of c.cost || []) {
    if (!RES.has(co.resource)) probs.push('bad cost resource ' + co.resource)
    if (!(co.count > 0)) probs.push('bad cost count')
  }
  let place
  if (c.category === 'action' || c.category === 'event') place = 'hand->resolve'
  else if (REGEXP.has(c.id)) place = 'region-expansion'
  else if (ROADC.has(c.id)) place = FOREIGN.has(c.id) ? 'foreign-road' : 'own-road'
  else if (ATTACH.has(c.id)) place = 'attach-on-card'
  else if (FOREIGN.has(c.id)) place = 'foreign-strip'
  else if (['building', 'hero-or-unit'].includes(c.category)) place = 'building-site'
  else place = '??'
  if (place === '??') probs.push('NO placement path')
  const hasEff = EFFECTS.has(c.id)
  if ((c.category === 'action' || c.category === 'event') && !hasEff) probs.push('action/event without EFFECTS entry')
  rows.push({ id: c.id, cat: c.category, x: c.copies || 1, place, eff: hasEff ? 'E' : '.', probs })
  if (probs.length) problems.push(c.id + ': ' + probs.join(', '))
}

const allIds = new Set(cards.map((c) => c.id))
const deadEff = [...EFFECTS].filter((k) => !allIds.has(k))

console.log('REGISTRIES: foreign=' + FOREIGN.size + ' road=' + ROADC.size + ' regionExp=' + REGEXP.size + ' attach=' + ATTACH.size + ' levels=' + LEVELS.size + ' effects=' + EFFECTS.size)
console.log('\nUNIQUE / COPIES vs rulebook:')
for (const s of sets) console.log('  ' + s + ': ' + uniq[s] + ' unique, ' + copyTotals[s] + ' copies (rulebook ' + RULEBOOK_COPIES[s] + ') ' + (copyTotals[s] === RULEBOOK_COPIES[s] ? 'OK' : 'MISMATCH'))
console.log('\nPER-CARD (E=has guided effect):')
for (const r of rows) console.log('  ' + r.eff + ' ' + r.cat.padEnd(12) + r.place.padEnd(17) + 'x' + r.x + ' ' + r.id + (r.probs.length ? '   !! ' + r.probs.join(', ') : ''))
console.log('\nDEAD EFFECTS ids:', deadEff.length ? deadEff.join(', ') : 'NONE')
console.log('\n=== PROBLEMS: ' + problems.length + ' ===')
for (const p of problems) console.log('  X ' + p)
