import { test, expect } from '@playwright/test'
import { Driver } from './harness'

// LIVE probe for the new Age of Darkness placement surfaces: region-expansion rotation,
// road complements (own + foreign), and attach-on-card. Driver.step screenshots AND asserts a
// clean console + invariants after each state change, so a render crash in the new components fails.
test('AoD placements: residence rotation, road complements, attach render clean', async ({ page }, info) => {
  const d = new Driver(page, `e2e/artifacts/${info.title.replace(/\W+/g, '-')}`)
  await d.init()
  await d.newGame({ enabledSets: ['intrigue', 'merchants', 'barbarians'] })
  await page.waitForTimeout(120)
  await d.shot('start')

  // 1) region expansion (Cloth Residence) on a pasture region (p0 index 3 = wool), then rotate up
  await d.step('grant-cloth', { type: 'grantCard', player: 'p0', cardId: 'merchants-cloth-merchants-residence' })
  await d.step('place-cloth', { type: 'playRegionExpansion', player: 'p0', cardId: 'merchants-cloth-merchants-residence', regionIndex: 3, pay: false })
  let s = await d.state()
  const cloth = s.players.p0.placed.findIndex((p: { cardId: string }) => p.cardId === 'merchants-cloth-merchants-residence')
  expect(cloth).toBeGreaterThanOrEqual(0)
  await d.step('rotate-cloth', { type: 'rotatePlaced', player: 'p0', placedIndex: cloth, delta: 1, pay: false })

  // 2) own road complement (Trading Post) on a road slot
  await d.step('grant-tp', { type: 'grantCard', player: 'p0', cardId: 'merchants-trading-post' })
  await d.step('place-tp', { type: 'playCard', player: 'p0', cardId: 'merchants-trading-post', slot: 'rc-0', pay: false })

  // 3) foreign road complement built on the opponent (Brigand Camp)
  await d.step('grant-bc', { type: 'grantCard', player: 'p0', cardId: 'merchants-brigand-camp' })
  await d.step('place-bc', { type: 'playForeign', player: 'p0', cardId: 'merchants-brigand-camp', slot: 'rc-0', pay: false })

  // 4) attach-on-card: Church then Bran on top
  await d.step('grant-church', { type: 'grantCard', player: 'p0', cardId: 'intrigue-church' })
  await d.step('place-church', { type: 'playCard', player: 'p0', cardId: 'intrigue-church', slot: 's0-up', pay: false })
  await d.step('grant-bran', { type: 'grantCard', player: 'p0', cardId: 'intrigue-bran-defender-of-the-temple' })
  await d.step('attach-bran', { type: 'attachCard', player: 'p0', cardId: 'intrigue-bran-defender-of-the-temple', hostSlot: 's0-up', pay: false })

  s = await d.state()
  expect(s.players.p0.placed.some((p: { attachedTo?: string }) => p.attachedTo === 's0-up')).toBe(true)
  expect(s.players.p1.placed.some((p: { slot?: string; owner?: string }) => p.slot === 'rc-0' && p.owner === 'p0')).toBe(true)
  await d.shot('final')
  await d.check('final')
})
