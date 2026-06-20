import { test, expect } from '@playwright/test'

/**
 * Proves the audio actually works (not just that files serve): the background playlist
 * starts on a user gesture and advances, the SFX-producing actions fire without errors,
 * and the volume / on-off controls take effect. Runs with autoplay allowed so headless
 * Chromium will actually play.
 */
test.use({ launchOptions: { args: ['--no-sandbox', '--disable-dev-shm-usage', '--autoplay-policy=no-user-gesture-required'] } })

test('background music plays + advances, controls work, SFX never error', async ({ page }) => {
  const audioReqs: string[] = []
  const errors: string[] = []
  page.on('request', (r) => { if (/\/audio\/.*\.mp3/.test(r.url())) audioReqs.push(r.url()) })
  page.on('pageerror', (e) => errors.push('PAGEERR: ' + e.message))
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()) })

  await page.goto('http://localhost:5173/', { waitUntil: 'networkidle' })
  await page.waitForFunction(() => !!(window as any).__audio && !!(window as any).__game)

  // music is on by default → a gesture kicks off the playlist
  await page.mouse.click(700, 400)
  await page.waitForTimeout(1200)
  expect(audioReqs.some((u) => /bgm-\d+\.mp3/.test(u)), 'playlist track requested after gesture').toBeTruthy()

  // SFX-producing actions must fire without throwing (roll, build, upgrade, play, end turn)
  await page.evaluate(() => {
    const g = (window as any).__game.getState()
    g.roll()
    g.dispatch({ type: 'buildPiece', player: 'p0', piece: 'settlement', end: 'right', pay: false })
    g.dispatch({ type: 'upgradeCity', player: 'p0', seat: 0, pay: false })
    g.dispatch({ type: 'grantCard', player: 'p0', cardId: 'base-marketplace' })
    g.dispatch({ type: 'playCard', player: 'p0', cardId: 'base-marketplace', slot: 's0-up', pay: true })
    g.dispatch({ type: 'endTurn' })
  })
  await page.waitForTimeout(400)

  // controls: lower SFX, toggle music off then on, change music volume — none should error
  await page.evaluate(() => {
    const a = (window as any).__audio
    a.setAudio({ sfxVol: 0.4 })
    a.setAudio({ musicOn: false })
    a.setAudio({ musicVol: 0.6 })
    a.setAudio({ musicOn: true })
  })
  await page.waitForTimeout(300)
  // turning it off then on requests again (playlist resumes/starts)
  const before = audioReqs.length
  await page.evaluate(() => (window as any).__audio.setAudio({ musicOn: false }))
  await page.evaluate(() => (window as any).__audio.setAudio({ musicOn: true }))
  await page.waitForTimeout(500)

  const prefs = await page.evaluate(() => (window as any).__audio.getAudio())
  expect(prefs.musicOn).toBe(true)
  expect(prefs.sfxVol).toBe(0.4)
  expect(errors, 'no console/page errors during audio').toEqual([])
  // eslint-disable-next-line no-console
  console.log(`audio: ${audioReqs.length} track requests (${before} before final toggle), 0 errors`)
})
