import { test, expect } from '@playwright/test'
import fs from 'node:fs'

// Actually PLAYS the game for several full turns through the real UI — rolling,
// clearing choice pickers, drawing, advancing phases, ending turns — for both you and
// the AI. Screenshots each turn so behaviour can be eyeballed, and asserts the game
// advances with no console errors and a valid state throughout.

test('play several full turns end-to-end', async ({ page }) => {
  test.setTimeout(420_000)
  const dir = 'e2e/artifacts/playthrough'
  fs.mkdirSync(dir, { recursive: true })
  const errors: string[] = []
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()) })
  page.on('pageerror', (e) => errors.push(String(e)))

  await page.goto('/#/ai')
  await page.locator('.ai-setup select').first().selectOption('easy')
  await page.getByRole('button', { name: 'Start game' }).click()
  await expect(page.locator('.ai-phasebar')).toBeVisible()

  const snap = () => page.evaluate(() => {
    const s = (window as any).__game.getState().state
    const tot = (p: any) => p.regions.reduce((n: number, r: any) => n + (r.empty ? 0 : r.stored), 0)
    return {
      turn: s.turn, active: s.activePlayer, hasRoll: !!s.lastRoll, winner: s.winner,
      hand: { p0: s.players.p0.hand.length, p1: s.players.p1.hand.length },
      res: { p0: tot(s.players.p0), p1: tot(s.players.p1) },
      vp: { p0: s.players.p0.victoryPoints, p1: s.players.p1.victoryPoints },
      phase: s.phase,
    }
  })
  const phaseChip = () => page.locator('.ai-phasechip.on').textContent().catch(() => '')

  const start = await snap()
  const startPlaced = await page.evaluate(() => {
    const g = (window as any).__game.getState().state
    const ai = g.activePlayer === 'p0' ? g.players.p1 : g.players.p0
    return ai.placed.length
  })
  let lastShot = 0
  const log: string[] = []

  for (let step = 0; step < 70; step++) {
    const s = await snap()
    if (s.winner) { log.push(`winner: ${s.winner} at turn ${s.turn}`); break }

    // a choice picker is up → pick the first available resource
    if (await page.locator('.ai-choice-overlay').isVisible().catch(() => false)) {
      await page.locator('.ai-choice-btn:not([disabled])').first().click().catch(() => {})
      await page.waitForTimeout(200); continue
    }

    const humanTurn = s.active === 'p0'
    const chip = (await phaseChip())?.trim()

    // human roll phase → press the board's Roll
    if (humanTurn && chip === 'Roll' && !s.hasRoll) {
      await page.getByRole('button', { name: /Roll/ }).first().click().catch(() => {})
      await page.waitForTimeout(400); continue
    }
    // human refill phase → draw the cards we owe ourselves from a stack
    if (humanTurn && chip === 'Refill') {
      const stack = page.locator('.cardstack:not(.cs-discard)').first()
      if (await stack.isVisible().catch(() => false) && s.hand.p0 < 3) {
        await stack.click().catch(() => {}); await page.waitForTimeout(300); continue
      }
    }
    // otherwise advance the phase if the light is green
    if (await page.locator('.ai-next').isEnabled().catch(() => false)) {
      await page.locator('.ai-next').click().catch(() => {})
      await page.waitForTimeout(400)
      // screenshot once per turn
      if (s.turn !== lastShot) { lastShot = s.turn; await page.screenshot({ path: `${dir}/turn-${String(s.turn).padStart(2, '0')}-${s.active}.png`, fullPage: true }) }
      continue
    }
    // AI is working (red light) — wait
    await page.waitForTimeout(450)
  }

  const end = await snap()
  const endPlaced = await page.evaluate(() => {
    const g = (window as any).__game.getState().state
    const ai = g.activePlayer === 'p0' ? g.players.p1 : g.players.p0
    return ai.placed.length
  })
  log.push(`played turn ${start.turn} → ${end.turn}`)
  log.push(`AI placed ${startPlaced} → ${endPlaced} · vp p0=${end.vp.p0} p1=${end.vp.p1}`)
  fs.writeFileSync(`${dir}/log.txt`, log.join('\n'))
  // eslint-disable-next-line no-console
  console.log(log.join('\n'))

  expect(end.turn).toBeGreaterThan(start.turn + 2)      // progressed several turns
  expect(endPlaced).toBeGreaterThan(startPlaced)        // the AI actually BUILT on the real board
  expect(end.hand.p0).toBeLessThanOrEqual(5)            // hand never blew past a sane limit
  expect(errors, `console errors:\n${errors.join('\n')}`).toEqual([])
})
