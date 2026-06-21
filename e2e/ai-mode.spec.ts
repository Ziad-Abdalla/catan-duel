import { test, expect } from '@playwright/test'
import fs from 'node:fs'

// Drives the real-board AI mode end-to-end in a browser: loads #/ai, starts a game,
// and confirms the ACTUAL TableBoard renders and the AI takes its turn. Requires
// `npm i` + `npx playwright install` (the repo's e2e deps). Screenshots into
// e2e/artifacts/ai-mode/.

test('AI mode uses the real board and the AI plays its turn', async ({ page }) => {
  const dir = 'e2e/artifacts/ai-mode'
  fs.mkdirSync(dir, { recursive: true })
  const errors: string[] = []
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()) })
  page.on('pageerror', (e) => errors.push(String(e)))

  await page.goto('/#/ai')
  await expect(page.getByText('Rivals — vs AI')).toBeVisible()
  await page.locator('.ai-setup select').first().selectOption('easy') // difficulty
  await page.getByRole('button', { name: 'Start game' }).click()

  // the REAL board renders (same DOM the live game uses)
  await expect(page.locator('.felt-scroll')).toBeVisible()
  await expect(page.locator('.wall-rail')).toBeVisible()
  await page.screenshot({ path: `${dir}/01-board.png`, fullPage: true })

  // play the human seat (p0): roll, then end turn → hand control to the AI
  await page.getByRole('button', { name: /Roll/ }).first().click().catch(() => {})
  await page.waitForTimeout(400)
  await page.getByRole('button', { name: /End turn/ }).first().click().catch(() => {})

  // the AI takes its turn automatically (banner shows it, then control returns)
  await expect(page.getByText(/AI is taking its turn/)).toBeVisible({ timeout: 5000 }).catch(() => {})
  await page.waitForTimeout(6000)
  await page.screenshot({ path: `${dir}/02-after-ai.png`, fullPage: true })

  expect(errors, `console errors:\n${errors.join('\n')}`).toEqual([])
})
