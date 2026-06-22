// Effect-as-data registry — the "coded shortcuts" layer on TOP of the universal
// manual toolkit. Each card id maps to an ordered list of EffectSteps; a step is
// plain guidance text plus optional QuickActions (ready-made one/two-click buttons).
//
// This is ASSIST ONLY. The ResolutionPanel always also shows the full manual
// toolkit, so a card with no registry entry is still fully resolvable — no dead
// ends. Trust-based: nothing here enforces legality, it just saves clicks.

import type { PlayerId, ResourceType, Stat } from '../types'
import type { Action, AdvantageToken } from './actions'
import type { EventFace } from './dice'

type Who = 'owner' | 'opponent'

/** A ready-made button inside a resolution step. */
export type QuickAction =
  | { kind: 'gainChoice'; who: Who; count: number; label: string } // pick a resource, gain N
  | { kind: 'gainFixed'; who: Who; resource: ResourceType; count: number; label: string }
  | { kind: 'steal'; count: number; label: string } // owner takes N of a chosen resource from opponent
  | { kind: 'give'; count: number; label: string } // owner gives N of a chosen resource to opponent
  | { kind: 'setDie'; event?: EventFace; label: string } // focus the dice-override widget
  | { kind: 'grant'; label: string } // focus the card-grant widget
  | { kind: 'vp'; who: Who; delta: number; label: string }
  | { kind: 'stat'; who: Who; stat: Stat; delta: number; label: string }
  | { kind: 'advantage'; token: AdvantageToken; label: string } // focus advantage assignment
  | { kind: 'used'; key: string; label: string } // mark a once-per-turn ability used

export interface EffectStep {
  text: string
  quick?: QuickAction[]
}

const opp = (p: PlayerId): PlayerId => (p === 'p0' ? 'p1' : 'p0')

/** Kinds that need the panel to focus a widget rather than dispatch immediately. */
export const FOCUS_KINDS = new Set(['setDie', 'grant', 'advantage'])

/**
 * Convert a QuickAction into concrete engine Actions. For resource-choice kinds a
 * `resource` must be supplied (the panel asks first). Focus kinds return [] — the
 * panel opens the matching toolkit widget instead.
 */
export function quickToActions(
  qa: QuickAction,
  owner: PlayerId,
  resource?: ResourceType,
): Action[] {
  const who = (w: Who): PlayerId => (w === 'owner' ? owner : opp(owner))
  switch (qa.kind) {
    case 'gainFixed':
      return [{ type: 'addResource', player: who(qa.who), resource: qa.resource, count: qa.count }]
    case 'gainChoice':
      return resource ? [{ type: 'addResource', player: who(qa.who), resource, count: qa.count }] : []
    case 'steal':
      return resource ? [{ type: 'transferResource', from: opp(owner), to: owner, resource, count: qa.count }] : []
    case 'give':
      return resource ? [{ type: 'transferResource', from: owner, to: opp(owner), resource, count: qa.count }] : []
    case 'vp':
      return [{ type: 'adjustVP', player: who(qa.who), delta: qa.delta }]
    case 'stat':
      return [{ type: 'adjustStat', player: who(qa.who), stat: qa.stat, delta: qa.delta }]
    case 'used':
      return [{ type: 'markUsed', player: owner, key: qa.key }]
    default:
      return []
  }
}

const gain = (count: number, label = `Gain ${count}`): QuickAction => ({ kind: 'gainChoice', who: 'owner', count, label })
const oppGain = (count: number, label: string): QuickAction => ({ kind: 'gainChoice', who: 'opponent', count, label })
const steal = (count: number, label = `Take ${count} from opponent`): QuickAction => ({ kind: 'steal', count, label })

// --- the registry: card id → ordered resolution steps -----------------------
export const EFFECTS: Record<string, EffectStep[]> = {
  // ===== die override =====
  'base-brigitta-the-wise-woman': [
    { text: 'Choose the result of the production die.', quick: [{ kind: 'setDie', label: 'Set the production die' }] },
  ],
  'progress-brigitta-the-wise-woman': [
    { text: 'Choose the result of the production die.', quick: [{ kind: 'setDie', label: 'Set the production die' }] },
  ],
  'gold-reiner-the-herald': [
    { text: 'Determine the event Celebration.', quick: [{ kind: 'setDie', event: 'celebration', label: 'Set event → Celebration' }] },
    { text: 'You receive 1 additional resource for the Celebration.', quick: [gain(1, 'Gain 1 (bonus)')] },
  ],

  // ===== immediate resource gain on build =====
  'gold-staple-house': [{ text: 'Immediately receive 2 resources of your choice. (Requires Merchant Guild.)', quick: [gain(1), gain(1, 'Gain another')] }],
  'turmoil-fairgrounds': [{ text: 'If you have more skill points than your opponent, receive 2 resources of your choice.', quick: [gain(1), gain(1, 'Gain another')] }],
  'turmoil-tithe-barn': [{ text: 'Receive grain OR wool — one of the chosen resource for each of your heroes.', quick: [{ kind: 'gainFixed', who: 'owner', resource: 'grain', count: 1, label: '+1 grain (per hero)' }, { kind: 'gainFixed', who: 'owner', resource: 'wool', count: 1, label: '+1 wool (per hero)' }] }],
  'progress-three-field-system': [{ text: 'Receive up to 2 grain. (Requires University.)', quick: [{ kind: 'gainFixed', who: 'owner', resource: 'grain', count: 2, label: '+2 grain' }, { kind: 'gainFixed', who: 'owner', resource: 'grain', count: 1, label: '+1 grain' }] }],
  'progress-mineral-mining': [{ text: 'Receive up to 2 ore. (Requires University.)', quick: [{ kind: 'gainFixed', who: 'owner', resource: 'ore', count: 2, label: '+2 ore' }, { kind: 'gainFixed', who: 'owner', resource: 'ore', count: 1, label: '+1 ore' }] }],
  'base-invention': [{ text: 'Gain 1 resource of choice per building with a progress point (max 2).', quick: [gain(1), gain(1, 'Gain another')] }],
  'progress-invention': [{ text: 'Gain 1 resource of choice per building with a progress point (max 2).', quick: [gain(1), gain(1, 'Gain another')] }],
  'base-merchant-caravan': [{ text: 'Discard exactly 2 of your resources…', quick: [{ kind: 'gainChoice', who: 'owner', count: -1, label: 'Spend 1 (discard)' }, { kind: 'gainChoice', who: 'owner', count: -1, label: 'Spend another' }] }, { text: '…then take any 2 resources in return.', quick: [gain(1), gain(1, 'Gain another')] }],
  'base-goldsmith': [{ text: 'Discard 3 gold…', quick: [{ kind: 'gainFixed', who: 'owner', resource: 'gold', count: -3, label: 'Spend 3 gold' }] }, { text: '…take any 2 resources in return.', quick: [gain(1), gain(1, 'Gain another')] }],
  'gold-goldsmith': [{ text: 'Discard 3 gold…', quick: [{ kind: 'gainFixed', who: 'owner', resource: 'gold', count: -3, label: 'Spend 3 gold' }] }, { text: '…take any 2 resources in return.', quick: [gain(1), gain(1, 'Gain another')] }],

  // ===== take from opponent =====
  'gold-trade-master': [{ text: 'Immediately receive 2 resources of your choice from your opponent. (Requires Merchant Guild.)', quick: [steal(1, 'Take 1'), steal(1, 'Take another')] }],
  'gold-merchant': [{ text: 'Take up to 2 resources of your choice from your opponent…', quick: [steal(1, 'Take 1'), steal(1, 'Take another')] }, { text: '…give him 1 resource of your choice in return. (Requires 3 commerce or a city.)', quick: [{ kind: 'give', count: 1, label: 'Give 1 back' }] }],
  'gold-brigands': [{ text: 'Take as many resources of the SAME type from your opponent as 1 region can hold (max 3). Requires strength advantage.', quick: [steal(1, 'Take 1'), steal(1, 'Take another'), steal(1, 'Take a third')] }],
  'turmoil-brigands': [{ text: 'Take as many resources of the SAME type from your opponent as 1 region can hold (max 3). Requires strength advantage.', quick: [steal(1, 'Take 1'), steal(1, 'Take another'), steal(1, 'Take a third')] }],
  'turmoil-voyage-of-plunder': [{ text: 'If your opponent leads on VP he gives you 2 resources of choice, otherwise 1. Requires strength advantage.', quick: [steal(1, 'Take 1'), steal(1, 'Take another')] }],
  'gold-gudrun-terror-of-the-seas': [{ text: 'For each of your Pirate Ships, your opponent gives you up to 2 gold.', quick: [{ kind: 'steal', count: 1, label: 'Take 1 gold' }, { kind: 'steal', count: 1, label: 'Take another' }] }],
  'gold-moneylender': [{ text: 'On the event Trade (with trade advantage), take 2 resources of choice from your opponent.', quick: [steal(1, 'Take 1'), steal(1, 'Take another')] }],
  'base-traveling-merchant': [{ text: 'Each player may take up to 2 resources of choice, paying 1 gold per resource.', quick: [gain(1, 'You gain 1'), oppGain(1, 'Opponent gains 1')] }],
  'gold-traveling-merchant': [{ text: 'Each player may take up to 2 resources of choice, paying 1 gold per resource.', quick: [gain(1, 'You gain 1'), oppGain(1, 'Opponent gains 1')] }],
  'gold-gift-for-the-prince': [{ text: 'Each player receives 1 gold per unit with at least 1 strength point.', quick: [{ kind: 'gainFixed', who: 'owner', resource: 'gold', count: 1, label: 'You +1 gold' }, { kind: 'gainFixed', who: 'opponent', resource: 'gold', count: 1, label: 'Opponent +1 gold' }] }],
  'base-trade-ships-race': [{ text: 'Most trade ships → that player gains 1 of choice; on a tie, each gains 1 (min 1 trade ship).', quick: [gain(1, 'Winner gains 1'), oppGain(1, 'Opponent gains 1 (tie)')] }],
  'gold-trade-ships-race': [{ text: 'Most trade ships → that player gains 1 of choice; on a tie, each gains 1 (min 1 trade ship).', quick: [gain(1, 'Winner gains 1'), oppGain(1, 'Opponent gains 1 (tie)')] }],

  // ===== conditional / event-triggered resource =====
  'base-toll-bridge': [{ text: 'Event Plentiful Harvest: you receive 2 gold.', quick: [{ kind: 'gainFixed', who: 'owner', resource: 'gold', count: 2, label: '+2 gold' }] }],
  'gold-toll-bridge': [{ text: 'Event Plentiful Harvest: you receive 2 gold.', quick: [{ kind: 'gainFixed', who: 'owner', resource: 'gold', count: 2, label: '+2 gold' }] }],
  'gold-pirate-ship': [{ text: 'Opponent removes 1 trade ship of his choice to the discard pile.', quick: [{ kind: 'grant', label: 'Move a card' }] }, { text: 'Event Plentiful Harvest: you receive 1 gold.', quick: [{ kind: 'gainFixed', who: 'owner', resource: 'gold', count: 1, label: '+1 gold' }] }],
  'progress-pharmacy': [{ text: 'On the event Plague, you receive 1 resource of choice (lost or not).', quick: [gain(1)] }],
  'turmoil-irmgard-keeper-of-the-light': [{ text: 'When you lose a card to an event/action, receive 1 resource of choice.', quick: [gain(1)] }],
  'base-year-of-plenty': [{ text: 'Each region gains 1 resource per adjacent Storehouse and Abbey (if storage allows). Use the toolkit to add to each region.' }],

  // ===== once-per-turn trade =====
  'gold-mint': [{ text: 'Once per turn: trade 1 gold for 1 other resource of choice.', quick: [{ kind: 'gainFixed', who: 'owner', resource: 'gold', count: -1, label: 'Spend 1 gold' }, gain(1, 'Gain 1 of choice'), { kind: 'used', key: 'gold-mint', label: 'Mark Mint used this turn' }] }],

  // ===== card manipulation =====
  'base-scout': [{ text: 'Take 2 cards from the region card stack, then reshuffle it. Use Draw Region in play, or the toolkit.' }],
  'base-relocation': [{ text: 'Exchange 2 of your own regions or 2 expansion cards (stored resources stay; placement rules apply). Resolve by hand on the board.' }],
  'progress-relocation': [{ text: 'Exchange 2 of your own regions or 2 expansion cards (stored resources stay; placement rules apply). Resolve by hand on the board.' }],
  'progress-library': [{ text: 'Immediately choose a card from a draw stack.', quick: [{ kind: 'grant', label: 'Choose a card' }] }],
  'progress-guido-the-ambassador': [{ text: 'Choose 1 card from the discard pile. (Requires Town Hall or fewer VP than opponent.)', quick: [{ kind: 'grant', label: 'Choose a card' }] }],
  'progress-gustav-the-librarian': [{ text: 'Choose 1 card from the discard pile. (Requires Library or fewer VP than opponent.)', quick: [{ kind: 'grant', label: 'Choose a card' }] }],
  'turmoil-traitor': [{ text: 'Opponent shows his hand; you may add 1 card to your hand. (Requires Hedge Tavern.)', quick: [{ kind: 'grant', label: 'Take a card' }] }],
  'turmoil-archer': [{ text: 'Opponent places 1 of his units (≥1 strength) under a matching draw stack. (Requires Hedge Tavern.)' }],
  'turmoil-arsonist': [{ text: "Choose 1 opponent building adjacent to a settlement/city; he places it under a draw stack. (Requires Hedge Tavern.)" }],
  'base-feud': [{ text: 'Strength-advantage holder picks 3 opponent buildings; opponent returns 1 to the bottom of a matching draw stack.' }],
  'turmoil-feud': [{ text: 'Strength-advantage holder picks 3 opponent buildings; opponent returns 1 to the bottom of a matching draw stack.' }],
  'base-fraternal-feuds': [{ text: 'Strength-advantage holder returns 2 cards from opponent\'s hand to the bottoms of matching draw stacks.' }],
  'turmoil-fraternal-feuds': [{ text: 'Strength-advantage holder returns 2 cards from opponent\'s hand to the bottoms of matching draw stacks.' }],
  'progress-benjamin-the-traveling-scholar': [{ text: 'Receive again the resource of each region whose number you rolled this turn. Use Produce or the toolkit.' }],
  'progress-doctor': [{ text: 'Each region bordering your Bath House gains 1 resource (only 1 Bath House if several). Add via the toolkit.', quick: [gain(1)] }],

  // ===== protection / negation (resolve by note + die where needed) =====
  'base-storehouse': [{ text: 'Brigand Attack: do NOT count resources on the 2 neighbouring regions.' }],
  'gold-storehouse': [{ text: 'Brigand Attack: do NOT count resources on the 2 neighbouring regions.' }],
  'gold-gold-cache': [{ text: 'Store received gold here; on Brigand Attack the gold in the cache is neither counted nor stolen. (Requires a hero with ≥1 strength.)' }],
  'turmoil-chapel': [{ text: 'If a 1, 2, or 3 is rolled on the production die, the event Riots does not apply to you.' }],
  'turmoil-fire-brigade': [{ text: "This city's buildings are safe from the Arsonist." }],
  'turmoil-sebastian-the-itinerant-preacher': [{ text: 'Play during Riots, Feud, or Fraternal Feud — that event does not apply to you.' }],
  'progress-bath-house': [{ text: 'Protects all 4 regions bordering this city from the event Plague.' }],
  'turmoil-lookout-tower': [{ text: 'When opponent plays Archer/Arsonist/Traitor, roll the die; on 1–2 the card has no effect.', quick: [{ kind: 'setDie', label: 'Roll the die' }] }],
  'turmoil-heinrich-the-sentinel': [{ text: 'When opponent plays Archer/Arsonist/Traitor, roll the die; on 3–5 the card has no effect.', quick: [{ kind: 'setDie', label: 'Roll the die' }] }],

  // ===== ongoing trade ratios (info; resolve trades via the toolkit) =====
  'base-large-trade-ship': [{ text: 'Trade 2 resources of the left/right neighbouring region for any 1 other resource (your turn).' }],
  'gold-large-trade-ship': [{ text: 'Trade 2 resources of the left/right neighbouring region for any 1 other resource (your turn).' }],

  // ===== Era of Intrigue =====
  'intrigue-church': [{ text: 'When built, receive up to 2 gold.', quick: [{ kind: 'gainFixed', who: 'owner', resource: 'gold', count: 1, label: '+1 gold' }, { kind: 'gainFixed', who: 'owner', resource: 'gold', count: 1, label: '+1 more gold' }] }],
  'intrigue-odins-temple': [{ text: 'When built, draw 1 card from any draw stack.', quick: [{ kind: 'grant', label: 'Draw a card' }] }],
  'intrigue-bran-defender-of-the-temple': [{ text: 'When built, draw 2 cards from the draw stacks. (Place on your Odin’s Temple; Bran + Temple = 2 VP.)', quick: [{ kind: 'grant', label: 'Draw a card' }, { kind: 'grant', label: 'Draw another' }] }],
  'intrigue-bishops-see': [{ text: 'When built, choose 3 of the opponent’s units; they remove 1 (resolve on the board). Requires: Church, Abbey or Chapel.' }],
  'intrigue-bishop': [{ text: 'Demand 1 gold from the opponent…', quick: [{ kind: 'steal', count: 1, label: 'Take 1 gold' }] }, { text: '…then receive gold equal to one gold field (up to 3). Requires: Church or Bishop’s See.', quick: [{ kind: 'gainFixed', who: 'owner', resource: 'gold', count: 1, label: '+1 gold' }, { kind: 'gainFixed', who: 'owner', resource: 'gold', count: 1, label: '+1' }, { kind: 'gainFixed', who: 'owner', resource: 'gold', count: 1, label: '+1' }] }],
  'intrigue-missionary': [{ text: 'The opponent removes 1 hero; place it in your principality or discard it. Requires: Church or Bishop’s See.', quick: [{ kind: 'grant', label: 'Take the hero' }] }],
  'intrigue-odins-priest': [{ text: 'The opponent reveals their hand and places all action cards and units under matching draw stacks. Requires: Odin’s Temple.' }],
  'intrigue-priestess-of-the-horns': [{ text: 'Choose a draw stack; take up to 2 cards from it. Requires: Odin’s Fountain or Temple.', quick: [{ kind: 'grant', label: 'Take a card' }, { kind: 'grant', label: 'Take another' }] }],
  'intrigue-michael-the-master-builder': [{ text: 'When building this turn, you may replace 1–3 of the required resources with 1 gold each (pay as you build).' }],
  'intrigue-good-neighbors': [{ text: 'A peaceful event — no attack occurs. Resolve any draw-stack effect printed on the card.' }],
  'intrigue-religious-dispute': [{ text: 'Each player with ≥1 city loses hand cards under matching draw stacks; a Church and an Odin’s Temple each reduce the loss. Resolve by hand.' }],

  'intrigue-judith-guardian-of-the-church': [
    { text: 'Placed on your Church (it becomes protected). 1x per turn: pay 1 non-gold resource…', quick: [{ kind: 'gainChoice', who: 'owner', count: -1, label: 'Pay 1 (not gold)' }] },
    { text: '…then receive up to 2 gold.', quick: [{ kind: 'gainFixed', who: 'owner', resource: 'gold', count: 1, label: '+1 gold' }, { kind: 'gainFixed', who: 'owner', resource: 'gold', count: 1, label: '+1 more' }, { kind: 'used', key: 'intrigue-judith', label: 'Mark used this turn' }] },
  ],
  'intrigue-godfrey-the-intriguer': [
    { text: 'Pay 1 gold to view your opponent’s hand, then take 1 unit or action card.', quick: [{ kind: 'gainFixed', who: 'owner', resource: 'gold', count: -1, label: 'Pay 1 gold' }, { kind: 'grant', label: 'Take a card' }] },
    { text: 'If you take a card, discard Godfrey.' },
  ],
  'intrigue-master-of-the-brotherhood': [
    { text: 'When your opponent plays an action that could cost you a card, they first pay 2 gold per VP they lead you by; you receive up to 1 gold.', quick: [{ kind: 'gainFixed', who: 'owner', resource: 'gold', count: 1, label: '+1 gold' }] },
  ],
  'intrigue-sacrificial-site': [{ text: 'Trade wool 2:1 for other resources (use the toolkit). Wool on adjacent pasture regions is safe from a Brigand Attack.' }],
  'intrigue-odins-fountain': [{ text: 'Extraordinary site. At end of turn you may exchange up to 2 cards instead of 1. On Good Neighbors, draw 1 card from a stack.', quick: [{ kind: 'grant', label: 'Draw a card (Good Neighbors)' }] }],
  'intrigue-pilgrimage-site': [{ text: 'Extraordinary site. When an opponent’s event/action makes you discard from hand, immediately replenish to your hand limit.', quick: [{ kind: 'grant', label: 'Draw to refill' }] }],
  'intrigue-reiner-the-miller': [{ text: 'Placed on a fields region. Trade its grain 2:1 for other resources; with an adjacent Grain Mill, once per turn at 1:1. Use the toolkit.' }],
  'intrigue-abbey-brewery': [{ text: 'Region expansion on a fields region: pay 2 grain from it to rotate (± on the tile); each side gives a different benefit.' }],
  'intrigue-great-thingstead': [{ text: 'Extraordinary site. While in play, neither player may play action-attack cards and the event Religious Dispute no longer affects anyone.' }],
  'intrigue-red-light-tavern': [{ text: 'Foreign road complement: units in the adjacent settlements/cities have their strength reduced to 1 — adjust via the toolkit. Remove when the opponent has 3 heroines.' }],

  // ===== Era of Merchant Princes =====
  'merchants-gero-the-master-merchant': [{ text: 'Take any 1–2 resources of your choice. Requires: 2+ trade ships.', quick: [gain(1, 'Gain 1'), gain(1, 'Gain another')] }],
  'merchants-guild-master': [{ text: 'Take up to 2 resources of your choice. Requires: Craft Guild.', quick: [gain(1, 'Gain 1'), gain(1, 'Gain another')] }],
  'merchants-herold-the-master-merchant': [{ text: 'This turn, freely trade one trade-ship resource type 1:1. Use the toolkit for each trade.' }],
  'merchants-maritime-trade-monopoly': [{ text: 'Demand 1 resource per trade-ship you have more than the opponent (max 2).', quick: [steal(1, 'Take 1'), steal(1, 'Take another')] }],
  'merchants-trade-monopoly': [{ text: 'Demand 1–3 resources of one type…', quick: [steal(1, 'Take 1'), steal(1, 'Take another'), steal(1, 'Take a third')] }, { text: '…then give 1 back. Requires: Commercial Harbor.', quick: [{ kind: 'give', count: 1, label: 'Give 1 back' }] }],
  'merchants-mendicants': [{ text: 'If the opponent has the trade advantage, demand 1 (2 if they also lead on VP).', quick: [steal(1, 'Take 1'), steal(1, 'Take another')] }],
  'merchants-tactical-retreat': [{ text: 'Remove one of your buildings in the opponent’s principality, then gain any 2 resources (1 taken from the opponent).', quick: [gain(1, 'Gain 1'), steal(1, 'Take 1 from opponent')] }],
  'merchants-craft-guild': [{ text: 'When built, rotate all your Residences up 1 level — or take 2 resources if you have none.', quick: [gain(1, 'Gain 1 (no Residences)'), gain(1, 'Gain another')] }],
  'merchants-commercial-harbor': [{ text: 'Once per turn, downgrade a Residence 1 level to take any 2 resources.', quick: [gain(1, 'Gain 1'), gain(1, 'Gain another'), { kind: 'used', key: 'merchants-commercial-harbor', label: 'Mark used this turn' }] }],
  'merchants-pirate-ship': [{ text: 'When built, the opponent removes 1 trade ship to the discard.', quick: [{ kind: 'grant', label: 'Move a ship' }] }, { text: 'Event Plentiful Harvest: receive 1 gold.', quick: [{ kind: 'gainFixed', who: 'owner', resource: 'gold', count: 1, label: '+1 gold' }] }],
  'merchants-hour-of-the-master-merchants': [{ text: 'Rotate each of your Residences up 1 level; for each already at the top level, receive 1 resource in its adjacent region.', quick: [gain(1, 'Gain 1 (max-level Residence)')] }],
  'merchants-fortunate-trade-voyage': [{ text: 'Each player receives resources according to their trade ships.', quick: [gain(1, 'You gain 1'), oppGain(1, 'Opponent gains 1')] }],
  'merchants-capricious-sea': [{ text: 'Trade is disrupted: resources you cannot store are lost. A Lighthouse is immune. Resolve by hand.' }],

  'merchants-wainwright': [{ text: '1x per turn (one only): move resources between two regions of the same type, OR trade 3 of your choice for 1 different. Use the toolkit.' }],
  'merchants-cloth-merchants-residence': [{ text: 'Region expansion on a pasture: pay 2 wool to rotate up a level (± on the tile). Higher levels give more commerce.' }],
  'merchants-paper-merchants-residence': [{ text: 'Region expansion on a forest: pay 2 lumber to rotate up a level (± on the tile). Higher levels give more commerce.' }],
  'merchants-trading-post': [{ text: 'Road complement: 1x per turn, trade 1 resource 1:1 between the two regions adjacent to this road. Use the toolkit.' }],
  'merchants-brigand-camp': [{ text: 'Foreign road complement: your opponent’s commerce −1 (adjust via the toolkit). Each time they store a resource via their Marketplace, you receive 1 gold.', quick: [{ kind: 'gainFixed', who: 'owner', resource: 'gold', count: 1, label: '+1 gold' }] }],
  'merchants-ship-builder': [{ text: 'Each ship you build costs 1 lumber OR 1 wool less. For 1 gold, retrieve 1 trade ship from the discard pile.', quick: [{ kind: 'gainFixed', who: 'owner', resource: 'gold', count: -1, label: 'Pay 1 gold' }, { kind: 'grant', label: 'Take a ship from discard' }] }],
  'merchants-olaf-the-merchant-ship-captain': [
    { text: 'Demand 1 or 2 resources from your opponent…', quick: [steal(1, 'Take 1'), steal(1, 'Take another')] },
    { text: '…give them any 1 resource back, then discard Olaf.', quick: [{ kind: 'give', count: 1, label: 'Give 1 back' }] },
  ],
  'merchants-trading-station': [{ text: 'Foreign card on an opponent city site. 1x per turn: pay 1 gold to buy any 1 resource from your opponent.', quick: [{ kind: 'gainFixed', who: 'owner', resource: 'gold', count: -1, label: 'Pay 1 gold' }, steal(1, 'Take 1 resource')] }],
  'merchants-commercial-metropolis': [{ text: 'Place on one of your cities (upgrades it to 4 VP total; counts as a city; cannot be removed).' }],
  'merchants-lighthouse': [{ text: '1x per turn: a trade ship next to the Lighthouse trades 1:1 (also extends the Large Trade Ship); your ships are safe from Capricious Sea. Use the toolkit.' }],
  'merchants-master-merchants-alliance': [{ text: 'When your opponent trades 2 or 3 of one type for 1 different, you receive 1 of the type they paid.', quick: [gain(1, 'Gain 1 (type they paid)')] }],

  // ===== Era of Barbarians ===== (Triumph rotates on the plate marker strip)
  'barbarians-siegfried-vanquisher-of-the-barbarians': [{ text: 'Take 1 or 2 resources of your choice — OR rotate your Triumph track up a level (use the plate). Requires: Castle and 2+ heroes.', quick: [gain(1, 'Gain 1'), gain(1, 'Gain another')] }],
  'barbarians-alliance-against-the-barbarians': [{ text: 'Each player with 1+ unit takes any 1 resource; the player with the most units takes 1 more. Requires: Triumph at 1 VP.', quick: [gain(1, 'You gain 1'), oppGain(1, 'Opponent gains 1'), gain(1, 'Most units: +1')] }],
  'barbarians-castellan': [{ text: 'Each of the 2 regions adjacent to your Castle gains 1 resource (if storage allows). Requires: Castle.', quick: [gain(1, 'Region +1'), gain(1, 'Region +1')] }],
  'barbarians-relocation': [{ text: 'Swap 2 of your own regions, or 2 of your own expansion cards — stored resources and legal placement unchanged. Resolve on the board.' }],
  'barbarians-contest-of-the-heroes': [{ text: 'Name 1 of your heroes and 1 opponent hero; each rolls the die and adds strength. Roll for each (tie: roll again).', quick: [{ kind: 'setDie', label: 'Roll the die' }] }, { text: 'The winner gains 1 resource and may take 1 from the loser.', quick: [gain(1, 'Winner gains 1'), steal(1, 'Take 1 from loser')] }],
  'barbarians-barbarian-attack': [{ text: 'Fewer units than your city/metropolis/expansion VP → discard 2 resources. More units and 1+ city → gain 2 resources. Then the card goes under the event stack.', quick: [gain(1, 'Defender gains 1'), gain(1, 'Defender +1')] }],
  'barbarians-retreat-of-the-barbarians': [{ text: 'Each player with 1+ unit chooses 1 card from a draw stack; with 1+ unit AND strength advantage, up to 2 cards.', quick: [{ kind: 'grant', label: 'Take a card' }, { kind: 'grant', label: 'Take another' }] }],

  'barbarians-white-raven-tavern': [
    { text: '1x per turn: pay 1 gold and roll the die.', quick: [{ kind: 'gainFixed', who: 'owner', resource: 'gold', count: -1, label: 'Pay 1 gold' }, { kind: 'setDie', label: 'Roll the die' }] },
    { text: '1–2: nothing · 3–5: take 1 resource · 6: take 2 (gold allowed).', quick: [gain(1, 'Take 1'), gain(1, 'Take another (on a 6)')] },
  ],
  'barbarians-border-fortress': [{ text: 'Region expansion on a hills region (pay 1 brick from it to place). Pay 1 ore + 1 wool to rotate up a level (± on the tile). Its strength counts as units via the Castle in a Barbarian Attack.' }],
  'barbarians-triumph-card': [{ text: 'Marker card. Track your Triumph level on your plate (the ± strip) — it counts directly as victory points. Place the card adjacent to any region.' }],
  'barbarians-barbarian-stronghold': [{ text: 'Foreign road complement next to an opponent city: the barbarians’ strength against your opponent +1. Remove when their Triumph shows 3 VP.' }],
  'barbarians-arad-the-strategist': [{ text: 'In a Barbarian Attack, each OTHER hero in the same settlement/city counts as 2 units (not Arnd).' }],
  'barbarians-baroc-the-barbarian': [{ text: 'After a Brigand Attack, receive 1 ore (2 if your opponent has a Barbarian Stronghold).', quick: [{ kind: 'gainFixed', who: 'owner', resource: 'ore', count: 1, label: '+1 ore' }, { kind: 'gainFixed', who: 'owner', resource: 'ore', count: 1, label: '+1 more (Stronghold)' }] }],
  'barbarians-siward-the-scout': [{ text: '1x per turn (action phase): view the top 3 of the event stack or any draw stack for free — or pay 1 gold to view your opponent’s hand.', quick: [{ kind: 'gainFixed', who: 'owner', resource: 'gold', count: -1, label: 'Pay 1 gold (view hand)' }] }],
  'barbarians-wolfgang-the-street-performer': [
    { text: 'On the event Celebration: add 1 resource to each region adjacent to Wolfgang.', quick: [gain(1, 'Region +1'), gain(1, 'Region +1')] },
    { text: 'If you take resources, your opponent may pay 2 gold to take Wolfgang into their principality.' },
  ],
  'barbarians-caravel': [{ text: 'In a Barbarian Attack, each OTHER ship in the same settlement/city counts as 2 units (not the Caravel).' }],
  'barbarians-marie-the-shieldmaiden': [{ text: 'Your opponent picks 2 of their heroes that could sit on Marie’s site; take 1 into your principality, then discard Marie.', quick: [{ kind: 'grant', label: 'Take a hero' }] }],
  'barbarians-secret-brotherhood': [{ text: '(1) If you lose a Barbarian Attack, pay only 1 resource. (2) 1x per turn: discard an unplayed unit/action card to receive any 1 resource.', quick: [gain(1, 'Gain 1 (discard a card)'), { kind: 'used', key: 'barbarians-secret-brotherhood', label: 'Mark used this turn' }] }],
  'barbarians-bailwick': [{ text: '1x per turn: draw the top card from a draw stack.', quick: [{ kind: 'grant', label: 'Draw a card' }, { kind: 'used', key: 'barbarians-bailwick', label: 'Mark used this turn' }] }],
  'barbarians-castle': [{ text: 'Your Border Fortress’s strength points count as additional units in a Barbarian Attack. Required by some cards.' }],
  'barbarians-arsenal': [{ text: 'Resources in the regions adjacent to the Arsenal are never counted or stolen in a Brigand Attack.' }],

  // ===== Era of Explorers ===== (sea cards / ships resolve on the sea board)
  'explorers-cartographer': [{ text: 'View up to 2 face-down sea cards and/or swap the positions of 2 sea cards in your principality. Requires: 1 sail point. Resolve on the sea board.' }],
  'explorers-broadside': [{ text: 'Your choice: the opponent rotates 1 island card down a level, or loses 1 explorer ship. Requires: 2 cannon points. Resolve on the sea board.' }],
  'explorers-friendship-between-peoples': [{ text: 'Ongoing: resources you receive but cannot store are lost (overflow gives no benefit).' }],
  'explorers-most-successful-explorer': [{ text: 'Discovery tie-break: the active player picks the first stack, the opponent the second; both may draw from the same stack.', quick: [{ kind: 'grant', label: 'Draw a card' }] }],

  // ===== Era of Sages ===== (owls are spent/tracked on the plate; pools are manual)
  'sages-great-foresight': [{ text: 'Pay 1 owl: view the event stack and remove 1 event card (not Yule) without changing the order. Resolve by hand.' }],
  'sages-dispute-of-the-sages': [{ text: "Pay 1 owl: you and the opponent roll the production die, each adding their sages' owls. Roll the die.", quick: [{ kind: 'setDie', label: 'Roll the die' }] }, { text: 'The winner takes any 2 resources (on a tie, both do).', quick: [gain(1, 'Gain 1'), gain(1, 'Gain another')] }],
  'sages-wise-compensation': [{ text: 'Pay 3 owls: build 1 city for free (no resources). Requires: fewer cities or fewer VP than the opponent. Build on the board.' }],
  'sages-power-of-the-groves': [{ text: 'Pay 1 owl: gain 1 owl per grove in your principality, distributed among your sages. Requires: 2+ sages. (Track owls on the plate.)' }],
  'sages-wise-protection': [{ text: 'Pay 1 owl: the opponent shows their hand; if it holds an action-attack card, they place their whole hand under their matching draw stacks. Resolve by hand.' }],
  'sages-famine': [{ text: 'Each player without a Granary discards 1 grain (or 2 resources of choice if they have no grain).', quick: [{ kind: 'gainFixed', who: 'owner', resource: 'grain', count: -1, label: 'Discard 1 grain' }] }],
  'sages-council-of-the-sages': [{ text: 'Distribute up to 2 owls among your sages (track on the plate), OR up to 2 resources among regions next to a sage.', quick: [gain(1, 'Region +1'), gain(1, 'Region +1')] }],

  // ===== Era of Prosperity ===== (stars are gained/spent; track on the plate)
  'prosperity-feeding-the-poor': [{ text: 'Pay 1 grain; receive up to 2 stars (track on the plate).', quick: [{ kind: 'gainFixed', who: 'owner', resource: 'grain', count: -1, label: 'Pay 1 grain' }] }],
  'prosperity-artwork-sculpture': [{ text: "Receive 1 star; +1 more if you have a Builders' Hut. Requires: Prince or Princess. (Track stars on the plate.)" }],
  'prosperity-artwork-epic': [{ text: 'Receive 1 star; +1 more if you have a Theater. Requires: Prince or Princess. (Track stars on the plate.)' }],
  'prosperity-artwork-fountain': [{ text: 'Receive 1 star; +1 more if you have an Aqueduct. Requires: Prince or Princess. (Track stars on the plate.)' }],
  'prosperity-artwork-relief': [{ text: 'Receive 1 star; +1 more if you have a City Palace. Requires: Prince or Princess. (Track stars on the plate.)' }],
  'prosperity-court-astrologer': [{ text: 'Pay 1 star: once more this turn, set an event-die result. Requires: Prince or Princess.', quick: [{ kind: 'setDie', label: 'Set the event die' }] }],
  'prosperity-bera-the-insurrectionist': [{ text: 'You choose: the opponent gives you up to 2 stars, OR 1 resource per VP they lead you by (max 3). Requires: Public Feeling.', quick: [steal(1, 'Take 1'), steal(1, 'Take 1'), steal(1, 'Take 1')] }],
  'prosperity-prosperity': [{ text: 'Ongoing: building a city costs you only 1 ore and 2 grain. Requires: Aqueduct.' }],
  'prosperity-insurrection': [{ text: 'Each player places 1 building costing 2+ resources under a matching draw stack, then tucks this card under the top 4 event cards. Resolve by hand.' }],
  'prosperity-taxation': [{ text: 'Each player who pays 1 star receives any 1 resource and 1 gold.', quick: [gain(1, 'You gain 1'), { kind: 'gainFixed', who: 'owner', resource: 'gold', count: 1, label: '+1 gold' }, oppGain(1, 'Opponent gains 1')] }],
}

// every "X-ship" base/gold 2:1 trader → info step
for (const id of ['base-gold-ship', 'base-ore-ship', 'base-grain-ship', 'base-lumber-ship', 'base-brick-ship', 'base-wool-ship']) {
  EFFECTS[id] = [{ text: 'During your turn, trade 2 of this resource for any 1 other resource, as often as you wish.' }]
}

export function effectFor(cardId: string): EffectStep[] | null {
  const e = EFFECTS[cardId]
  return e && e.length ? e : null
}

// --- event-die faces --------------------------------------------------------
export const EVENT_EFFECTS: Record<EventFace, EffectStep[]> = {
  brigand: [
    { text: 'Resolves BEFORE production. A player with MORE THAN 7 resources loses all their gold and wool (Storehouse-protected regions are not counted). Check each player\'s total below.', quick: [{ kind: 'gainFixed', who: 'owner', resource: 'gold', count: -3, label: 'You: clear gold' }, { kind: 'gainFixed', who: 'owner', resource: 'wool', count: -3, label: 'You: clear wool' }, { kind: 'gainFixed', who: 'opponent', resource: 'gold', count: -3, label: 'Opp: clear gold' }, { kind: 'gainFixed', who: 'opponent', resource: 'wool', count: -3, label: 'Opp: clear wool' }] },
  ],
  'plentiful-harvest': [{ text: 'Each player receives 1 resource of their choice.', quick: [gain(1, 'You gain 1'), oppGain(1, 'Opponent gains 1')] }],
  celebration: [{ text: 'If one player has the MOST skill points, they alone gain 1 of choice; otherwise each player gains 1 of choice.', quick: [gain(1, 'You gain 1'), oppGain(1, 'Opponent gains 1')] }],
  trade: [{ text: 'If you have the trade advantage, take 1 resource of your choice from your opponent.', quick: [steal(1, 'Take 1 from opponent')] }],
  'event-card': [{ text: 'The player who rolled draws the top event card and resolves it. Use “Draw event card”.' }],
}
