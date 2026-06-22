import { test, expect } from '@playwright/test'
import { Driver } from './harness'

/**
 * Real user interactions through the actual DOM (clicks, selects, modals), screenshot
 * + console-clean check after each. Complements action-coverage (which drives the store)
 * by proving the rendered controls are wired and don't throw.
 */
test('click through the real UI surfaces', async ({ page }) => {
  const d = new Driver(page, 'e2e/artifacts/ui-flows')
  await d.init()
  await d.shot('00-initial')

  // roll the dice (cinematic settles ~3.3s), then produce + open resolve
  await page.locator('.wbtn-roll').click()
  await page.waitForTimeout(3600)
  await d.shot('01-rolled')
  await d.check('rolled')

  // on the event-card face the wall offers "Draw event card" — drawing pops the event for
  // both players (a deliberate, click-to-close modal), so dismiss it before moving on.
  const drawEvt = page.locator('.wo-actions .wbtn-sm').first()
  if (await drawEvt.count()) {
    await drawEvt.click()
    await page.waitForTimeout(250)
    await d.shot('02-event-drawn')
    await d.check('event-drawn')
    const evClose = page.locator('.evpop-close')
    if (await evClose.count()) await evClose.click()
    await page.waitForTimeout(150)
  }

  // open the action log, screenshot, close
  await page.locator('.hud-btn[title="Action history log"]').click()
  await page.waitForTimeout(150)
  await d.shot('03-log-open')
  await expect(page.locator('.audit')).toBeVisible()
  await d.check('log-open')
  await page.locator('.audit-x').click()

  // change felt theme via the ⚙ Setup popover (sets/win/theme live there now)
  await page.locator('.hud-btn', { hasText: 'Setup' }).click()
  await expect(page.locator('.hud-pop')).toBeVisible()
  await page.locator('.hud-pop select').nth(1).selectOption('gold') // theme is the 2nd select (win, theme)
  await page.waitForTimeout(300)
  await d.shot('04-theme-gold')
  await d.check('theme-gold')
  await page.locator('.hud-pop-scrim').click() // close the popover

  // collapse the HUD bar to its corner handle, then restore it
  await page.locator('.hud-collapse').click()
  await page.waitForTimeout(100)
  await expect(page.locator('.hud-handle')).toBeVisible()
  await expect(page.locator('.table-hud')).toHaveCount(0)
  await d.shot('05-hud-collapsed')
  await d.check('hud-collapsed')
  await page.locator('.hud-handle').click() // bring it back for the rest of the flow
  await page.waitForTimeout(100)
  await expect(page.locator('.table-hud')).toBeVisible()

  // peek a draw stack → take the top card → shuffle → close
  await page.locator('.cardstack-wrap').first().hover()
  await page.locator('.cs-peek').first().click()
  await page.waitForTimeout(200)
  await expect(page.locator('.sb-panel')).toBeVisible()
  await d.shot('06-stackbrowser')
  await d.check('stackbrowser')
  await page.locator('.sb-card').first().click()
  await page.waitForTimeout(150)
  await d.shot('07-took-card')
  await d.check('took-card')
  await page.locator('.sb-btn', { hasText: 'Shuffle' }).click() // shuffling now auto-closes the browser
  await page.waitForTimeout(200)
  await d.shot('08-shuffled')
  await d.check('shuffled')

  // open a hand card → CardZoom → play it
  await page.locator('.hand-card').first().click()
  await page.waitForTimeout(150)
  await expect(page.locator('.cardzoom')).toBeVisible()
  await d.shot('09-cardzoom')
  await d.check('cardzoom')
  await page.locator('.cz-play').click()
  await page.waitForTimeout(200)
  await d.shot('10-played')
  await d.check('played')
  // playing a card now showcases it to both players (non-blocking) — close it before moving on
  const showc = page.locator('.sc-pop .evpop-close')
  if (await showc.count()) await showc.click()

  // open the resolution panel from another hand card and nudge a resource
  const hand = page.locator('.hand-card')
  if (await hand.count()) {
    await hand.first().click()
    await page.waitForTimeout(150)
    await page.locator('.cz-resolve').click()
    await page.waitForTimeout(200)
    await expect(page.locator('.rl-panel')).toBeVisible()
    await d.shot('11-resolution')
    await d.check('resolution')
    await page.locator('.rl-pm').first().click()
    await page.waitForTimeout(100)
    await d.shot('12-resource-nudged')
    await d.check('resource-nudged')
    await page.locator('.rl-done').click()
  }

  // end the turn
  await page.locator('.wbtn-end').click()
  await page.waitForTimeout(150)
  await d.shot('13-turn-ended')
  await d.check('turn-ended')

  // eslint-disable-next-line no-console
  console.log(`ui-flows: ${d.shots} screenshots, ${d.consoleErrors.length} console errors`)
})
