// Core domain types for Catan Duel (The Rivals for Catan)
// Trust-based manual play: these model game STATE; the engine tracks/serializes
// state and renders verbatim card text — it does not enforce rule legality.

export type ResourceType = 'lumber' | 'brick' | 'wool' | 'grain' | 'ore' | 'gold'

export const RESOURCES: ResourceType[] = ['lumber', 'brick', 'wool', 'grain', 'ore', 'gold']

/** Region terrain → the resource it produces. */
export const TERRAIN_RESOURCE: Record<string, ResourceType> = {
  forest: 'lumber',
  hills: 'brick',
  pasture: 'wool',
  fields: 'grain',
  mountains: 'ore',
  'gold-field': 'gold',
}

export type SetId =
  | 'base' | 'gold' | 'turmoil' | 'progress'
  | 'intrigue' | 'merchants' | 'barbarians' | 'explorers' | 'sages' | 'prosperity'

export type CardCategory =
  | 'region'
  | 'road'
  | 'settlement'
  | 'city'
  | 'building'
  | 'action'
  | 'event'
  | 'hero-or-unit'

export interface Cost {
  resource: ResourceType
  count: number
}

/** Printed point values / markers on a card. Permissive: only present keys are meaningful. */
export interface CardValues {
  victory_points?: number
  strength?: number
  skill?: number
  commerce?: number
  progress?: number
  // Age of Enlightenment point types
  wisdom?: number // owls (Era of Sages)
  contentment?: number // stars (Era of Prosperity)
  sail?: number // ship range (Era of Explorers)
  cannon?: number // pirate combat (Era of Explorers)
  region_resource?: ResourceType
  region_number?: number
  requires?: string
  note?: string
  other?: string
}

/** A card definition from the corpus (src/data/cards.json). Read-only at runtime. */
export interface Card {
  id: string
  set: SetId
  category: CardCategory
  name: string
  tag?: string
  cost?: Cost[]
  values?: CardValues
  rules_text?: string
  flavor_text?: string
  image?: string
  /** number of physical copies in the set */
  copies: number
  // region-specific
  region_resource?: ResourceType
  region_number?: number | null
  note?: string
  /** Where this EVENT card returns to the event deck after it resolves. Absent = bottom (default).
   *  'underTopN' (with n) = tucked under the top n cards (Barbarian Attack, Insurrection).
   *  'yule' = reshuffle the deck and re-seat with 3 cards below it (the festival/Yule card). */
  reseat?: { mode: 'bottom' | 'underTopN' | 'yule'; n?: number }
  // provenance
  confidence?: 'high' | 'medium' | 'low'
  unclear?: string[]
}

// ---------- Runtime game state (serializable; this is the sync snapshot shape) ----------

export type Phase = 'roll' | 'action' | 'replenish' | 'exchange' | 'gameover'
export type PlayerId = 'p0' | 'p1'

/** A region card placed in a principality; `stored` is the 0–3 resources held (the rotation).
 *  `empty` marks an open landscape slot (created when you build a settlement) that the
 *  player has not yet filled with a landscape card. */
export interface RegionSlot {
  cardId: string
  resource: ResourceType
  /** printed production die number 1–6 */
  number: number | null
  stored: 0 | 1 | 2 | 3
  empty?: boolean
}

/** A card placed in play (building/unit/settlement/city/road) at a board position. */
export interface PlacedCard {
  cardId: string
  /** free-form position the player arranged it at (manual play). Region-expansion
   *  cards (Residences, Border Fortress, Abbey Brewery, Reiner, Triumph) use `rexp-<regionIndex>`;
   *  road complements use `road-<i>`; metropolis/attached cards carry `attachedTo`. */
  slot?: string
  /** rotation level (0–3) for rotating region-expansions (Residences, Border Fortress). */
  level?: number
  /** the placed-card slot this card is attached to / stacked on (Metropolis→city, Bran→Temple). */
  attachedTo?: string
  /** for FOREIGN cards (built in the opponent's principality): the player who owns/played
   *  it. The card sits in the host's `placed` but scores for nobody — `owner` just records
   *  who controls its effect and lets the host exclude it from their VP/stats. */
  owner?: PlayerId
}

/** The derived tallies that placed cards contribute to (besides VP). */
export type Stat = 'strength' | 'skill' | 'commerce' | 'progress'

/** Per-player rotating marker-card tracks (trust-based level counters — the marker card's
 *  printed art defines what each level grants; the engine just stores the level).
 *  Triumph = Era of Barbarians · Manifesto of Humane Conduct = Era of Sages ·
 *  Public Feeling = Era of Prosperity. */
export type MarkerId = 'triumph' | 'manifesto' | 'publicFeeling'

export interface PlayerState {
  id: PlayerId
  name: string
  /** a chosen crest emoji shown on the plate as a profile picture */
  avatar?: string
  hand: string[] // card ids
  regions: RegionSlot[]
  placed: PlacedCard[] // settlements, cities, roads, buildings, units in play
  /** total VP shown to players = derived (board) + vpAdjust (manual nudge) */
  victoryPoints: number
  /** manual VP correction for anything the auto-sum can't see (trust-based) */
  vpAdjust: number
  hasHeroToken: boolean // strength advantage marker
  hasTradeToken: boolean // trade advantage marker
  /** manual nudges to the derived stat tallies (anything the auto-sum can't see) */
  statAdjust?: Partial<Record<Stat, number>>
  /** ability keys already used this turn (once-per-turn markers; cleared on endTurn) */
  usedThisTurn?: string[]
  /** rotating marker-card levels (Barbarians Triumph, Sages Manifesto, Prosperity Public
   *  Feeling). Present only for markers the player is tracking; trust-based level counter. */
  markers?: Partial<Record<MarkerId, number>>
}

export interface GameState {
  gameId: string
  /** monotonic version for sync ordering (global last-write-wins on shared zones) */
  seq: number
  /** per-seat monotonic version → seat-authority merge keeps each player's own edits */
  seatSeq: Record<PlayerId, number>
  turn: number
  activePlayer: PlayerId
  phase: Phase
  players: Record<PlayerId, PlayerState>
  /** per-set draw stacks of card ids (face-down) + the region stack + event deck */
  drawStacks: string[][]
  regionStack: string[]
  eventDeck: string[]
  /** shared discard pile (top = last). Action cards + removed buildings/units land here. */
  discard: string[]
  /** Limited central supply for face-up expansion buildings (e.g. Merchant Guild,
   *  Hedge Tavern, University): id → copies still available to build. These live ONLY
   *  here, never in the draw stacks, so building one truly leaves the public supply. */
  supply: Record<string, number>
  lastRoll?: { production: number; event: string }
  /** The event card just revealed by `drawEvent` — pops up on BOTH screens. */
  revealedEvent?: string
  /** Increments on every reveal, so each client can dismiss its OWN popup independently
   *  (local `seenEventNonce`) without closing it for the other player. */
  eventNonce?: number
  /** A card a player chose to SHOW to both players (an action they played, or a manual
   *  "show opponent") — a big read-only popup, dismissed per-player like an event. */
  showcase?: string
  showcaseNonce?: number
  log: LogEntry[]
  enabledSets: SetId[]
  /** VP needed to win: 7 intro · 12 single theme · 13 Duel of the Princes · adjustable. */
  winThreshold: number
  /** Who currently meets the threshold (non-blocking signal — no forced freeze). */
  eligible?: PlayerId
  /** A pending "I claim victory" awaiting the opponent's agreement (vote-to-end). */
  victoryClaim?: PlayerId
  /** The agreed final winner — set only when the opponent agrees to the claim. */
  winner?: PlayerId
}

export interface LogEntry {
  turn: number
  player: PlayerId
  text: string
  manual?: boolean
}
