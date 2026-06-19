import { type Page, expect } from '@playwright/test'
import fs from 'node:fs'

export type Action = Record<string, unknown>

/**
 * A thin driver over the running game: dispatches actions through the real store
 * (the same path the UI uses, incl. broadcast + undo history), screenshots after
 * every interaction into a per-spec artifacts folder, and asserts structural
 * invariants + a clean console after each step. Card-resolution + purity invariants
 * are covered exhaustively by the engine fuzz test; here we guard the live app.
 */
export class Driver {
  shots = 0
  prevSeq = -1
  consoleErrors: string[] = []

  constructor(
    public page: Page,
    public dir: string,
  ) {}

  async init() {
    fs.mkdirSync(this.dir, { recursive: true })
    this.page.on('pageerror', (e) => this.consoleErrors.push('PAGEERR: ' + e.message))
    this.page.on('console', (m) => {
      if (m.type() === 'error') this.consoleErrors.push(m.text())
    })
    await this.page.goto('/', { waitUntil: 'networkidle' })
    await this.page.waitForFunction(() => !!(window as unknown as { __game?: unknown }).__game)
  }

  async newGame(opts: Record<string, unknown> = {}) {
    await this.page.evaluate((o) => (window as unknown as { __game: any }).__game.getState().newHotseat(o), opts)
    this.prevSeq = -1
  }

  async dispatch(a: Action) {
    await this.page.evaluate((x) => (window as unknown as { __game: any }).__game.getState().dispatch(x), a)
  }

  /** Call a uiStore action by name (e.g. openStackBrowse) with args. */
  async ui(method: string, ...args: unknown[]) {
    await this.page.evaluate(([m, a]) => {
      const fn = (window as unknown as { __ui: any }).__ui.getState()[m as string]
      fn(...(a as unknown[]))
    }, [method, args] as const)
  }

  async state() {
    return this.page.evaluate(() => (window as unknown as { __game: any }).__game.getState().state)
  }

  async shot(name: string) {
    const n = String(++this.shots).padStart(3, '0')
    await this.page.screenshot({ path: `${this.dir}/${n}-${name}.png` })
  }

  /** Assert structural invariants + clean console; track seq monotonicity. */
  async check(label: string) {
    const res = await this.page.evaluate(() => {
      const s = (window as unknown as { __game: any }).__game.getState().state
      const e: string[] = []
      if (typeof s.seq !== 'number' || Number.isNaN(s.seq)) e.push('seq invalid')
      for (const id of ['p0', 'p1']) {
        const p = s.players[id]
        if (!Array.isArray(p.hand) || !Array.isArray(p.placed) || !Array.isArray(p.regions)) e.push(id + ' arrays')
        for (const r of p.regions) {
          if (!(r.stored >= 0 && r.stored <= 3)) e.push(`${id} stored ${r.stored}`)
        }
      }
      if (s.eligible && !['p0', 'p1'].includes(s.eligible)) e.push('eligible invalid')
      if (!Array.isArray(s.log)) e.push('log not array')
      return { errs: e, seq: s.seq }
    })
    expect(res.errs, `invariants after ${label}`).toEqual([])
    expect(this.consoleErrors, `console errors after ${label}`).toEqual([])
    // seq must be monotonic non-decreasing across steps (resets handled by newGame)
    if (this.prevSeq >= 0) expect(res.seq, `seq monotonic after ${label}`).toBeGreaterThanOrEqual(this.prevSeq)
    this.prevSeq = res.seq
  }

  /** Dispatch an action, settle, screenshot, then verify. The core "screenshot every interaction" loop. */
  async step(name: string, a: Action, settleMs = 60) {
    await this.dispatch(a)
    await this.page.waitForTimeout(settleMs)
    await this.shot(name)
    await this.check(name)
  }
}
