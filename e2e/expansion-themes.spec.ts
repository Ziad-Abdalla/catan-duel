import { test, expect } from '@playwright/test'
import { Driver } from './harness'

// Live coverage for the new expansion-theme UI: per-era felt tint and the
// rotating marker-card tracks (Triumph / Manifesto / Public Feeling).

test('Barbarians: felt re-tints + Triumph marker rotates via the plate', async ({ page }, info) => {
  const d = new Driver(page, `e2e/artifacts/${info.title.replace(/\W+/g, '-')}`)
  await d.init()
  await d.newGame({ enabledSets: ['barbarians'] })
  await page.waitForTimeout(120)

  // the felt atmosphere follows the enabled era
  await expect(page.locator('.felt-scroll')).toHaveClass(/felt-era-barbarians/)

  // each plate surfaces the Triumph track
  await expect(page.getByRole('button', { name: 'raise Triumph' }).first()).toBeVisible()

  // rotate the first plate's Triumph up twice through the real UI
  const raise = page.getByRole('button', { name: 'raise Triumph' }).first()
  await raise.click()
  await raise.click()
  await page.waitForTimeout(80)
  const s = await d.state()
  const total = (s.players.p0.markers?.triumph ?? 0) + (s.players.p1.markers?.triumph ?? 0)
  expect(total).toBe(2)
  expect(s.log.some((l: { text: string }) => /Triumph . level 2/.test(l.text))).toBe(true)
  await d.shot('barbarians-triumph')
  await d.check('triumph')
})

test('AoE markers: Manifesto (Sages) + Public Feeling (Prosperity) present + clamped', async ({ page }, info) => {
  const d = new Driver(page, `e2e/artifacts/${info.title.replace(/\W+/g, '-')}`)
  await d.init()
  await d.newGame({ enabledSets: ['sages', 'prosperity'] })
  await page.waitForTimeout(120)

  await expect(page.getByRole('button', { name: 'raise Manifesto' }).first()).toBeVisible()
  await expect(page.getByRole('button', { name: 'raise Public Feeling' }).first()).toBeVisible()
  // a barbarians-only marker must NOT show when barbarians isn't enabled
  await expect(page.getByRole('button', { name: 'raise Triumph' })).toHaveCount(0)

  // engine action sets + clamps ≥ 0
  await d.dispatch({ type: 'setMarker', player: 'p0', marker: 'manifesto', level: 3 })
  await d.dispatch({ type: 'setMarker', player: 'p1', marker: 'publicFeeling', level: 1 })
  await d.dispatch({ type: 'setMarker', player: 'p0', marker: 'manifesto', level: -5 })
  await page.waitForTimeout(80)
  const s = await d.state()
  expect(s.players.p0.markers?.manifesto).toBe(0) // clamped up from -5
  expect(s.players.p1.markers?.publicFeeling).toBe(1)
  await d.shot('aoe-markers')
  await d.check('aoe-markers')
})
