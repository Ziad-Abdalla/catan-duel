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
