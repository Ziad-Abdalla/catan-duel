// Spine (center) card costs — road / settlement / city upgrade. Sourced from
// cards.json so they stay in sync with the live game.
//
// ⚠ KNOWN DISCREPANCY (flagged for the user): cards.json lists the road as
// 1 lumber + 2 brick, while the official Rivals rulebook says 1 lumber + 1 brick.
// We default to the corpus value (single source of truth per the goal). If this is
// a transcription slip, fix it in cards.json and this updates automatically.

import { cardCost } from './data'
import type { Resource } from '../sim/state'

export const ROAD_COST: Partial<Record<Resource, number>> = cardCost('base-road')
export const SETTLEMENT_COST: Partial<Record<Resource, number>> = cardCost('base-settlement')
export const CITY_COST: Partial<Record<Resource, number>> = cardCost('base-city')
