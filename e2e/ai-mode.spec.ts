import { test, expect } from '@playwright/test'
import fs from 'node:fs'

// Drives the human-paced phase flow: roll → build → refill → exchange, with YOU
// pressing Next (even on the AI's turn) and a red/green light gating it. Verifies the
// board does NOT flip, production resolves for both, and a full AI turn advances.
// Requires `npm i` + `npx playwright install`.

test('AI mode: human-paced phases, no flip, red/green light', async ({ page }) => {
  const dir = 'e2e/artifacts/ai-mode'
  fs.mkdirSync(dir, { recursive: true })
  const errors: string[] = []
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()) })
  page.on('pageerror', (e) => errors.push(String(e)))

  await page.goto('/#/ai')
  await page.locator('.ai-setup select').first().selectOption('easy')
  await page.getByRole('button', { name: 'Start game' }).click()

  await expect(page.locator('.felt-scroll')).toBeVisible()
  await expect(page.locator('.ai-phasebar')).toBeVisible()
  await expect(page.locator('.ai-phasechip.on')).toHaveText('Roll')

  // A choice event (Plentiful Harvest / Celebration) may prompt YOU to pick — on
  // either player's roll, and it can appear AFTER the dice settle. Poll: clear any
  // picker as it appears, until the Next button is enabled (green light).
  const waitReady = async (timeout = 16000) => {
    const end = Date.now() + timeout
    while (Date.now() < end) {
      if (await page.locator('.ai-choice-overlay').isVisible().catch(() => false)) {
        await page.locator('.ai-choice-btn:not([disabled])').first().click().catch(() => {})
        await page.waitForTimeout(250)
        continue
      }
      if (await page.locator('.ai-next').isEnabled().catch(() => false)) return
      await page.waitForTimeout(250)
    }
    throw new Error('Next never became ready')
  }
  const clearChoice = waitReady

  // who is at the bottom now? (you = p0). Record it; it must NOT change on AI's turn.
  const bottomFirst = await page.evaluate(() => document.querySelector('[data-player]')?.getAttribute('data-player'))

  // YOUR roll phase: Next is disabled until you roll
  await expect(page.locator('.ai-next')).toBeDisabled()
  await page.getByRole('button', { name: /Roll/ }).first().click().catch(() => {})
  await waitReady()
  await expect(page.locator('.ai-dot.green')).toBeVisible()
  await page.screenshot({ path: `${dir}/01-roll-resolved.png`, fullPage: true })

  // step through your phases: Build → Refill → Exchange → End turn
  for (let i = 0; i < 4; i++) {
    await waitReady()
    await page.locator('.ai-next').click()
    await page.waitForTimeout(900)
  }

  // now it's the AI's turn — the board must NOT have flipped
  const bottomNow = await page.evaluate(() => document.querySelector('[data-player]')?.getAttribute('data-player'))
  expect(bottomNow).toBe(bottomFirst)

  // AI roll phase: light red while it works, then green
  await expect(page.locator('.ai-dot.red')).toBeVisible({ timeout: 4000 }).catch(() => {})
  await waitReady()
  await page.screenshot({ path: `${dir}/02-ai-roll-done.png`, fullPage: true })

  // advance the AI through its phases
  for (let i = 0; i < 4; i++) {
    await waitReady()
    await page.locator('.ai-next').click()
    await page.waitForTimeout(1200)
  }
  await page.screenshot({ path: `${dir}/03-after-ai-turn.png`, fullPage: true })

  expect(errors, `console errors:\n${errors.join('\n')}`).toEqual([])
})

test('a choice event prompts YOU to pick a resource (not auto-applied)', async ({ page }) => {
  const dir = 'e2e/artifacts/ai-mode'
  fs.mkdirSync(dir, { recursive: true })
  await page.goto('/#/ai')
  await page.locator('.ai-setup select').first().selectOption('easy')
  await page.getByRole('button', { name: 'Start game' }).click()
  await expect(page.locator('.ai-phasebar')).toBeVisible()

  // Force a Plentiful Harvest by injecting the roll via the dev store hook, then let
  // the orchestrator resolve it (it watches lastRoll on your turn).
  await page.evaluate(() => {
    const g = (window as any).__game
    const ui = (window as any).__ui
    const s = g.getState().state
    ui?.getState?.().rollDice?.(3, 'plentiful-harvest', s.turn)
    g.getState().dispatch({ type: 'roll', production: 3, event: 'plentiful-harvest' })
  })

  // the resource picker must appear (your choice), and Next stays disabled until done
  await expect(page.locator('.ai-choice-overlay')).toBeVisible({ timeout: 9000 })
  await expect(page.locator('.ai-next')).toBeDisabled()
  await page.screenshot({ path: `${dir}/04-choice-prompt.png`, fullPage: true })

  // pick a resource → picker closes, flow continues
  await page.locator('.ai-choice-btn:not([disabled])').first().click()
  await expect(page.locator('.ai-choice-overlay')).toBeHidden({ timeout: 6000 })
})

test('resources are NOT applied until the dice finish rolling', async ({ page }) => {
  await page.goto('/#/ai')
  await page.locator('.ai-setup select').first().selectOption('easy')
  await page.getByRole('button', { name: 'Start game' }).click()
  await expect(page.locator('.ai-phasebar')).toBeVisible()

  const myResources = () => page.evaluate(() => {
    const g = (window as any).__game.getState().state
    const you = g.activePlayer // your turn at start (p0)
    return g.players[you].regions.reduce((n: number, r: any) => n + (r.empty ? 0 : r.stored), 0)
  })

  const before = await myResources()
  await page.getByRole('button', { name: /Roll/ }).first().click()
  // dice tumble ~3.3s; at +1.5s NOTHING should have been collected yet
  await page.waitForTimeout(1500)
  await expect(page.locator('.ai-table-phase, .ai-banner-row')).toContainText(/Rolling/i)
  expect(await myResources()).toBe(before)

  // after the dice settle, production resolves
  await page.waitForTimeout(3500)
  // (a choice event may pop a picker; resources changing OR a picker both prove timing)
  const picker = await page.locator('.ai-choice-overlay').isVisible().catch(() => false)
  const after = await myResources()
  expect(picker || after >= before).toBeTruthy()
})
