import { test } from '@playwright/test'
import { Driver } from './harness'

/**
 * Exhaustive coverage: drive EVERY action type in the reducer union through the live
 * store, screenshotting + checking invariants after each. Prerequisite-dependent
 * actions (play needs a card, agree needs a claim, …) are set up inline from live state.
 */
test('every reducer, through the live store, screenshotted', async ({ page }) => {
  const d = new Driver(page, 'e2e/artifacts/action-coverage')
  await d.init()
  await d.shot('00-initial')
  await d.check('initial')

  // ── dice + production ──
  await d.step('roll', { type: 'roll', production: 4, event: 'brigand' }, 200)
  await d.step('setDice', { type: 'setDice', production: 6, event: 'trade' })
  await d.step('applyProduction', { type: 'applyProduction' })

  // ── regions ──
  await d.step('rotateRegion', { type: 'rotateRegion', player: 'p0', regionIndex: 0 })
  await d.step('setStored', { type: 'setStored', player: 'p0', regionIndex: 0, stored: 3 })
  await d.step('drawRegion', { type: 'drawRegion', player: 'p0' })

  // ── spine builds ──
  await d.step('buildPiece-settlement', { type: 'buildPiece', player: 'p0', piece: 'settlement', end: 'right', pay: true })
  await d.step('buildPiece-road', { type: 'buildPiece', player: 'p0', piece: 'road', slot: 3, pay: true })
  await d.step('upgradeCity', { type: 'upgradeCity', player: 'p0', seat: 0, pay: true })
  await d.step('expandSpine', { type: 'expandSpine', player: 'p0' })

  // placeLandscape — fill the first empty landscape slot
  let s = await d.state()
  const emptyIdx = s.players.p0.regions.findIndex((r: any) => r.empty)
  if (emptyIdx >= 0) await d.step('placeLandscape', { type: 'placeLandscape', player: 'p0', regionIndex: emptyIdx })

  // ── cards lifecycle ──
  await d.step('grantCard', { type: 'grantCard', player: 'p0', cardId: 'base-marketplace' })
  await d.step('drawToHand', { type: 'drawToHand', player: 'p0', stackIndex: 0 })
  await d.step('playCard', { type: 'playCard', player: 'p0', cardId: 'base-marketplace', slot: 's0-up', pay: true })
  const findPlaced = async (cardId: string) => (await d.state()).players.p0.placed.findIndex((pc: any) => pc.cardId === cardId)
  let mi = await findPlaced('base-marketplace')
  if (mi >= 0) await d.step('movePlaced', { type: 'movePlaced', player: 'p0', placedIndex: mi, slot: 's0-up2' })
  mi = await findPlaced('base-marketplace')
  if (mi >= 0) await d.step('returnToHand', { type: 'returnToHand', player: 'p0', placedIndex: mi })
  await d.step('playCard-2', { type: 'playCard', player: 'p0', cardId: 'base-marketplace', slot: 's0-up', pay: false })
  mi = await findPlaced('base-marketplace')
  if (mi >= 0) await d.step('removePlaced', { type: 'removePlaced', player: 'p0', placedIndex: mi })
  await d.step('grantCard-2', { type: 'grantCard', player: 'p0', cardId: 'base-abbey' })
  await d.step('discardCard-hand', { type: 'discardCard', player: 'p0', from: 'hand', cardId: 'base-abbey' })
  await d.step('drawFromDiscard', { type: 'drawFromDiscard', player: 'p0' })

  // ── stack manipulation ──
  s = await d.state()
  const handCard = s.players.p0.hand[0]
  if (handCard) await d.step('discardToStack', { type: 'discardToStack', player: 'p0', cardId: handCard, stackIndex: 1 })
  await d.step('takeFromStack', { type: 'takeFromStack', player: 'p0', stackIndex: 0 })
  s = await d.state()
  const hc2 = s.players.p0.hand[0]
  if (hc2) await d.step('putToStack', { type: 'putToStack', player: 'p0', cardId: hc2, stackIndex: 2, position: 'bottom' })
  await d.step('shuffleStack', { type: 'shuffleStack', stackIndex: 0 })

  // ── events ──
  await d.step('drawEvent', { type: 'drawEvent' }, 150)
  await d.step('dismissEvent', { type: 'dismissEvent' })
  await d.step('addResource-gold', { type: 'addResource', player: 'p0', resource: 'gold', count: 3 })
  await d.step('addResource-wool', { type: 'addResource', player: 'p0', resource: 'wool', count: 2 })
  await d.step('resolveBrigand', { type: 'resolveBrigand' }, 150)

  // ── resources / stats / tokens / scoring ──
  await d.step('transferResource', { type: 'transferResource', from: 'p1', to: 'p0', resource: 'ore', count: 1 })
  await d.step('adjustStat', { type: 'adjustStat', player: 'p0', stat: 'strength', delta: 2 })
  await d.step('setToken-hero', { type: 'setToken', player: 'p0', token: 'hero' })
  await d.step('setToken-trade', { type: 'setToken', player: 'p1', token: 'trade' })
  await d.step('adjustVP', { type: 'adjustVP', player: 'p0', delta: 1 })

  // ── misc ──
  await d.step('renamePlayer', { type: 'renamePlayer', player: 'p0', name: 'Aelfric' })
  await d.step('markUsed', { type: 'markUsed', player: 'p0', key: 'ability-1' })
  await d.step('logNote', { type: 'logNote', player: 'p0', text: 'manual note test' })
  await d.step('setWinThreshold', { type: 'setWinThreshold', value: 12 })
  await d.step('nextPhase', { type: 'nextPhase' })

  // ── vote-to-end flow ──
  await d.step('claimVictory', { type: 'claimVictory', player: 'p0' })
  await d.step('declineVictory', { type: 'declineVictory' })
  await d.step('claimVictory-2', { type: 'claimVictory', player: 'p0' })
  await d.step('agreeVictory', { type: 'agreeVictory', player: 'p1' }, 250)

  // ── endTurn (fresh game to clear the agreed game-over) ──
  await d.newGame({})
  await d.check('newGame')
  await d.step('endTurn', { type: 'endTurn' })

  // eslint-disable-next-line no-console
  console.log(`action-coverage: ${d.shots} screenshots, ${d.consoleErrors.length} console errors`)
})
