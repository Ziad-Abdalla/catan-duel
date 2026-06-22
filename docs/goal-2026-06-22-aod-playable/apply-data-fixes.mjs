// Age of Darkness data corrections — keyed, position-independent, re-runnable.
// Source of truth: rulebook card index in docs/goal-2026-06-21-expansion-themes/rules-work/*.md
// Applies: corrected rules_text (vision garble -> concise rulebook paraphrase), fixed
// requires/category/name/copies, removed spurious point values, added rulebook-stated hero
// strength. Unknown numbers (per-level stats, some costs) are NOT fabricated — flagged via `unclear`.
// Run: node docs/goal-2026-06-22-aod-playable/apply-data-fixes.mjs
import { readFileSync, writeFileSync } from 'node:fs'

const PATH = new URL('../../src/data/cards.json', import.meta.url)
const raw = readFileSync(PATH, 'utf8')
const eol = raw.includes('\r\n') ? '\r\n' : '\n'
const cards = JSON.parse(raw)
const byId = new Map(cards.map((c) => [c.id, c]))

// fix shape: { name?, category?, copies?, tag?, rules?, val?:{}, del?:[], unclear?:[] }
const FIXES = {
  // ===================== INTRIGUE =====================
  'intrigue-pilgrimage-site': {
    rules: 'Extraordinary site (not a building; unaffected by building-targeting effects). Max 1. When an event or your opponent’s card forces you to discard from your hand, immediately draw back up to your hand limit.',
    unclear: ['cost needs physical-card confirmation'],
  },
  'intrigue-great-thingstead': {
    rules: 'Extraordinary site (not a building). While in play, neither player may play action-attack cards and the event Religious Dispute no longer affects anyone. Requires: Church and Odin’s Temple.',
  },
  'intrigue-odins-fountain': {
    rules: 'Extraordinary site (not a building). Max 1. At the end of your turn you may exchange up to 2 cards instead of 1 (pay the cost of any card you choose). On the event Good Neighbors, its owner draws 1 card from a stack.',
    unclear: ['cost needs physical-card confirmation'],
  },
  'intrigue-reiner-the-miller': {
    rules: 'Unit — place adjacent to a fields region. Trade grain from that field for other resources at 2:1; with a Grain Mill adjacent to that field, once per turn trade at 1:1.',
  },
  'intrigue-abbey-brewery': {
    rules: 'Region expansion — place adjacent to a fields region. Pay 2 grain from that field to rotate the Abbey Brewery to a side of your choice (repeatable while you have grain). Requires: City.',
  },
  'intrigue-red-light-tavern': {
    del: ['strength'],
    rules: 'Foreign road complement — place on a free road in your opponent’s principality. Units in the adjacent settlements/cities have their strength reduced to 1. Remove when the opponent has 3 heroines.',
  },
  'intrigue-judith-guardian-of-the-church': {
    del: ['commerce', 'strength'],
    val: { skill: 1, requires: 'Church' },
    rules: 'Hero — place on your Church (the Church becomes protected from all card/event effects; Judith is not). 1x per turn: pay 1 non-gold resource to receive up to 2 gold. With the Church, worth 2 VP together. Requires: Church.',
    unclear: ['skill point count needs physical-card confirmation'],
  },
  'intrigue-bran-defender-of-the-temple': {
    del: ['commerce'],
    val: { requires: "Odin's Temple" },
    rules: 'Hero — place on your Odin’s Temple (the Temple becomes protected from all card/event effects; Bran is not). When built, draw 2 cards from the draw stacks. With the Temple, worth 2 VP together. Requires: Odin’s Temple.',
  },
  'intrigue-master-of-the-brotherhood': {
    del: ['strength'],
    rules: 'Unit (max 1). When your opponent plays an action card that could make you lose a hand or placed card, they must first pay 2 gold per VP they lead you by; you receive up to 1 gold. Requires: no Abbey.',
  },
  'intrigue-godfrey-the-intriguer': {
    rules: 'Hero. On your turns, pay 1 gold to view your opponent’s hand and take 1 unit or action card; if you take a card, discard Godfrey.',
    unclear: ['skill point unconfirmed (rulebook cites a strength point)'],
  },
  'intrigue-church': {
    val: { requires: 'City' },
    rules: 'City expansion (max 1; required by other cards). When built, immediately receive up to 2 gold. Requires: City.',
  },
  'intrigue-odins-temple': {
    val: { requires: 'City' },
    rules: 'City expansion (max 1; required by other cards). When built, immediately draw 1 card from any draw stack. Requires: City.',
  },
  'intrigue-sacrificial-site': {
    rules: 'City expansion. Trade wool 2:1 for other resources. Wool on adjacent pasture regions is neither counted nor stolen in a Brigand Attack. Requires: Odin’s Fountain or Odin’s Temple.',
  },
  'intrigue-bishops-see': {
    rules: 'City expansion. When built, choose 3 of your opponent’s units; they remove 1 to the discard pile. Requires: Church, Abbey or Chapel.',
  },
  'intrigue-missionary': {
    rules: 'Your opponent removes 1 of their placed heroes; place it in your principality or discard it. Requires: Church or Bishop’s See.',
  },
  'intrigue-bishop': {
    rules: 'Demand 1 gold from your opponent, then receive as much gold as fits in one of your gold fields or Gold Cache (up to 3). Requires: Church or Bishop’s See.',
  },
  'intrigue-odins-priest': {
    rules: 'Your opponent reveals their hand and places all action cards and units under matching draw stacks. Requires: Odin’s Temple.',
  },
  'intrigue-priestess-of-the-horns': {
    name: 'Priestess of the Norns',
    rules: 'Choose 1 draw stack and take up to 2 cards from it. Requires: Odin’s Fountain or Odin’s Temple.',
  },
  'intrigue-michael-the-master-builder': {
    rules: 'Play when you build a building: replace 1, 2, or 3 of the resources required with 1 gold each. Builds exactly 1 building.',
  },
  'intrigue-good-neighbors': {
    rules: 'Reveal the top card of every draw stack (no attack this turn). The Pilgrimage Site owner takes any 1 resource; the Odin’s Fountain owner draws 1 card from a stack.',
  },
  'intrigue-religious-dispute': {
    rules: 'Each player with at least 1 city places all hand cards under matching draw stacks. A Church and an Odin’s Temple each reduce the loss by 2 cards. A Sacrificial Site owner receives up to 3 wool; a Bishop’s See owner up to 3 gold.',
  },

  // ===================== MERCHANT PRINCES =====================
  'merchants-wainwright': {
    rules: '1x per turn (one function only): move resources between two regions of the same type, OR trade 3 resources of your choice for 1 different resource.',
  },
  'merchants-cloth-merchants-residence': {
    rules: 'Region expansion — place adjacent to a pasture region. Pay 2 wool from that pasture to rotate to the next higher level (repeatable while you have wool). Requires: City.',
    unclear: ['commerce/benefit scales per rotation level; per-level values need physical card'],
  },
  'merchants-paper-merchants-residence': {
    rules: 'Region expansion — place adjacent to a forest region. Pay 2 lumber from that forest to rotate to the next higher level (repeatable while you have lumber). Requires: City.',
    unclear: ['commerce/benefit scales per rotation level; per-level values need physical card'],
  },
  'merchants-trading-post': {
    rules: 'Road complement — place on one of your own free roads (you may place both copies, on different roads). 1x per turn: trade 1 resource 1:1 between the two regions adjacent to that road.',
  },
  'merchants-brigand-camp': {
    rules: 'Foreign road complement — place on a free road in your opponent’s principality. Your opponent’s commerce is reduced by 1. Each time your opponent stores a resource via their Marketplace, you receive 1 gold.',
  },
  'merchants-ship-builder': {
    rules: 'Unit (max 1). Each ship you build costs 1 lumber OR 1 wool less. For 1 gold, retrieve 1 trade ship from the discard pile to your hand (repeatable, 1 gold each).',
  },
  'merchants-olaf-the-merchant-ship-captain': {
    rules: 'Hero. On a later turn: demand 1 or 2 resources from your opponent (they choose which regions), then give them any 1 resource back; then discard Olaf. (No effect if the opponent has no resources.)',
  },
  'merchants-pirate-ship': {
    rules: 'When built, your opponent removes 1 trade ship to the discard pile. Event Plentiful Harvest: receive 1 gold.',
  },
  'merchants-commercial-metropolis': {
    val: { requires: 'top-level Residence or 6 commerce', victory_points: 2 },
    rules: 'Metropolis — place on one of your cities, upgrading it (unremovable; counts as a city; 4 VP total with the city). Requires: a top-level Residence or 6 commerce, and a city.',
  },
  'merchants-trading-station': {
    val: { requires: 'Commercial Harbor' },
    rules: 'Foreign card — place on a building site of one of your opponent’s cities. 1x per turn: pay 1 gold to buy any 1 resource from your opponent. Requires: Commercial Harbor.',
  },
  'merchants-commercial-harbor': {
    val: { requires: 'City' },
    rules: 'City expansion (max 1; required by other cards). 1x per turn: downgrade one of your Residences by 1 level to take any 2 resources of your choice.',
    unclear: ['commerce/strength point values need physical-card confirmation'],
  },
  'merchants-lighthouse': {
    val: { requires: 'Commercial Harbor or 2 trade ships' },
    rules: 'City expansion. 1x per turn: a trade ship placed directly next to the Lighthouse may trade 1:1 (also extends the Large Trade Ship). Your ships are not lost to Capricious Sea. Requires: Commercial Harbor or 2 trade ships.',
  },
  'merchants-craft-guild': {
    val: { requires: 'City' },
    rules: 'City expansion (max 1). When built, rotate each of your Residences up 1 level. If you have no Residence you can rotate up (or only level-3 Residences), take any 2 resources instead (pay for the Craft Guild in full first). Requires: City.',
  },
  'merchants-master-merchants-alliance': {
    del: ['victory_points'],
    val: { requires: 'City' },
    rules: 'City expansion. Each time your opponent trades 2 or 3 resources of one type for 1 different resource, you receive 1 resource of the type they paid. Requires: City.',
    unclear: ['commerce value unconfirmed'],
  },
  'merchants-guild-master': {
    rules: 'Take up to 2 resources of your choice. Requires: Craft Guild.',
  },
  'merchants-herold-the-master-merchant': {
    val: { requires: 'Commercial Harbor or 2 trade ships' },
    rules: 'During the turn you play this card, you may trade a resource type for which you have at least 1 trade ship at 1:1, as often as you like. Requires: Commercial Harbor or 2 trade ships.',
    unclear: ['name may be spelled "Hergild" on the physical card'],
  },
  'merchants-gero-the-master-merchant': {
    val: { requires: '2 trade ships' },
    rules: 'Take any 1 or 2 resources of your choice. Requires: 2 trade ships.',
  },
  'merchants-tactical-retreat': {
    rules: 'Remove one of your buildings from your opponent’s principality; then receive any 2 resources of your choice, 1 of which your opponent must give you.',
  },
  'merchants-mendicants': {
    rules: 'If your opponent has the trade advantage, demand 1 resource; if they also lead you on VP, demand up to 2 resources.',
  },
  'merchants-trade-monopoly': {
    rules: 'Demand 1, 2, or 3 resources of one type from your opponent; give them 1 resource of your choice back. Requires: Commercial Harbor.',
  },
  'merchants-maritime-trade-monopoly': {
    rules: 'For each trade ship you have more than your opponent, demand 1 resource from them (maximum 2).',
  },
  'merchants-fortunate-trade-voyage': {
    rules: 'Each player receives, for exactly 1 of their trade ships, up to 2 resources of the type that ship trades. Large Trade Ship: that player instead receives 2 resources of the left or right adjacent region. Resources you can’t store are lost.',
  },
  'merchants-capricious-sea': {
    rules: 'The production die result stands (not re-rolled). Calm Sea (1-4): each player receives any 1 resource per trade ship. Storm (5-6): each player slides 1 of their trade ships under a matching draw stack. Resources you can’t store are lost.',
  },
  'merchants-hour-of-the-master-merchants': {
    rules: 'Rotate each of your Residences up 1 level. For each Residence already at the top level, the region adjacent to it receives 1 resource instead.',
  },

  // ===================== BARBARIANS =====================
  'barbarians-white-raven-tavern': {
    del: ['skill'],
    val: { requires: 'City' },
    rules: '1x per turn: pay 1 gold and roll the die — 1-2: nothing; 3-5: receive 1 resource; 6: receive 2 resources (you may take gold).',
    unclear: ['point values need physical-card confirmation'],
  },
  'barbarians-border-fortress': {
    rules: 'Region expansion (max 1) — place adjacent to a hills region holding at least 1 brick; pay that brick. Pay 1 ore + 1 wool to rotate to the next higher level (repeatable). Higher levels give strength that counts as units (via the Castle) in a Barbarian Attack.',
    unclear: ['per-level strength values need physical card; build cost is 1 brick paid from the adjacent hills region'],
  },
  'barbarians-triumph-card': {
    copies: 2,
    rules: 'Marker card — enters play when you build your first city; place adjacent to any region. After winning a Barbarian Attack you may rotate it up a level instead of taking 2 resources; its level is your Triumph VP (tracked on your plate). Requires: City.',
    unclear: ['copy count and level→VP mapping need physical-card confirmation'],
  },
  'barbarians-barbarian-stronghold': {
    rules: 'Foreign road complement — place on a free road adjacent to one of your opponent’s cities. The barbarians’ strength against your opponent increases by 1. Remove when the opponent’s Triumph Card shows 3 VP.',
  },
  'barbarians-arad-the-strategist': {
    name: 'Arnd the Strategist',
    val: { strength: 1 },
    rules: 'Hero. When a Barbarian Attack occurs, each other hero in the same settlement/city counts as 2 units (not Arnd himself).',
  },
  'barbarians-baroc-the-barbarian': {
    val: { strength: 1 },
    rules: 'Hero. After a Brigand Attack, receive 1 ore (2 ore if your opponent has a Barbarian Stronghold). Ore you can’t store is lost.',
  },
  'barbarians-siward-the-scout': {
    del: ['skill'],
    val: { strength: 1 },
    rules: 'Hero. 1x per turn (action phase only): view the top 3 cards of the event stack or any draw stack for free, OR pay 1 gold to view your opponent’s hand. Don’t reorder viewed cards.',
    unclear: ['exact point set unconfirmed (rulebook cites a strength point)'],
  },
  'barbarians-wolfgang-the-street-performer': {
    rules: 'Hero. On the event Celebration: you may add 1 resource to each region adjacent to Wolfgang. If you take resources, your opponent may pay 2 gold to move Wolfgang into their principality.',
  },
  'barbarians-caravel': {
    category: 'hero-or-unit',
    rules: 'Ship — requires a city (may then also be placed in a settlement). In a Barbarian Attack, each other ship in the same settlement/city counts as 2 units (not the Caravel itself). Requires: City.',
  },
  'barbarians-marie-the-shieldmaiden': {
    rules: 'Hero. On a later turn: your opponent picks 2 of their heroes that could sit on Marie’s site; take 1 into your principality, then discard Marie. (No use if the opponent has only 1 hero or none placeable.)',
    unclear: ['point values unconfirmed'],
  },
  'barbarians-secret-brotherhood': {
    val: { requires: 'City' },
    rules: 'City expansion (max 1). (1) If you lose a Barbarian Attack, you pay only 1 resource. (2) 1x per turn: discard an unplayed unit or action card to receive any 1 resource of your choice. Requires: City.',
  },
  'barbarians-bailwick': {
    name: 'Bailiwick',
    val: { requires: 'City' },
    rules: 'City expansion (max 1). 1x per turn: draw the top card from a draw stack. Requires: City.',
  },
  'barbarians-castle': {
    copies: 2,
    val: { requires: 'City' },
    rules: 'City expansion (max 1; face-up supply; required by other cards). Your Border Fortress’s strength points count as additional units in a Barbarian Attack. Requires: City.',
  },
  'barbarians-arsenal': {
    val: { requires: 'City' },
    rules: 'City expansion. Resources in the regions adjacent to the Arsenal are never counted or stolen in a Brigand Attack (even if you hold more than 7). Requires: City.',
  },
  'barbarians-siegfried-vanquisher-of-the-barbarians': {
    val: { requires: 'Castle and at least 2 heroes' },
    rules: 'Take 1 or 2 resources of your choice, OR rotate your Triumph Card up a level. Requires: Castle and at least 2 heroes.',
  },
  'barbarians-alliance-against-the-barbarians': {
    val: { requires: 'Triumph Card indicating at least 1 victory point and at least 1 unit' },
    rules: 'Each player with at least 1 unit takes any 1 resource; the player with the most units takes 1 more. Requires: Triumph Card indicating at least 1 victory point, and at least 1 unit.',
  },
  'barbarians-castellan': {
    val: { requires: 'Castle' },
    rules: 'Each of the 2 regions adjacent to your Castle receives 1 resource (if storage allows). Requires: Castle.',
  },
  'barbarians-relocation': {
    rules: 'Swap 2 of your own regions, or 2 of your own expansion cards; stored resources and legal placement stay unchanged.',
  },
  'barbarians-contest-of-the-heroes': {
    rules: 'Name 1 of your heroes and 1 of your opponent’s; each rolls the die and adds their strength points (tie: reroll). The winner takes 1 resource and may demand 1 more from the loser.',
  },
  'barbarians-barbarian-attack': {
    rules: 'A player with fewer units than their VP from cities/Metropolises/city-expansions discards 2 resources. A player with more units and at least 1 city receives 2 resources (or may rotate their Triumph Card up). Then place this card under the top 4 event cards.',
  },
  'barbarians-retreat-of-the-barbarians': {
    rules: 'Each player with at least 1 unit chooses 1 card from a draw stack; a player with a unit AND the strength advantage chooses up to 2.',
  },
}

let applied = 0
const missing = []
for (const [id, fix] of Object.entries(FIXES)) {
  const c = byId.get(id)
  if (!c) { missing.push(id); continue }
  if (fix.name != null) c.name = fix.name
  if (fix.category != null) c.category = fix.category
  if (fix.copies != null) c.copies = fix.copies
  if (fix.tag != null) c.tag = fix.tag
  if (fix.rules != null) c.rules_text = fix.rules
  if (fix.del || fix.val) {
    c.values = c.values || {}
    for (const k of fix.del || []) delete c.values[k]
    for (const [k, v] of Object.entries(fix.val || {})) c.values[k] = v
  }
  if (fix.unclear != null) c.unclear = fix.unclear
  applied++
}

if (missing.length) {
  console.error('MISSING IDS (not found in cards.json):', missing.join(', '))
  process.exit(1)
}

writeFileSync(PATH, JSON.stringify(cards, null, 2).replace(/\n/g, eol) + eol)
console.log(`Applied ${applied} card fixes. eol=${eol === '\r\n' ? 'CRLF' : 'LF'}`)
