import { describe, it, expect } from 'vitest'
import { renderToString } from 'react-dom/server'
import { App } from '../../App'

/**
 * Render smoke test: server-renders the whole game UI and asserts the key
 * surfaces are present. Catches runtime/hook crashes that tsc & the bundler miss.
 *
 * NOTE: zustand's useSyncExternalStore returns the store's INITIAL snapshot on
 * the renderToString (SSR) path, so this can only exercise the initial game
 * state — not post-dispatch mutations. The state transitions themselves (rolls,
 * playing cards, the 7-VP win) are covered by the pure-engine tests in
 * actions.test.ts; here we just prove the component tree mounts and renders.
 */
describe('Board renders', () => {
  const html = renderToString(<App />)

  it('mounts the table board without throwing', () => {
    expect(html).toContain('felt-scroll') // the scrollable felt table
    expect(html).toContain('wall-rail') // the sticky central wall
    expect(html).toContain('Catan Duel')
    expect(html).toContain('hud-setup-wrap') // the ⚙ setup popover (sets/win/theme)
    expect(html).toContain('Player 1')
    expect(html).toContain('Player 2')
  })

  it('shows the dice, turn controls and deck wall', () => {
    expect(html).toContain('Roll') // dice button
    expect(html).toContain('End turn') // turn control (phases removed — free manual play)
    expect(html).toContain('cardstack') // the deck wall
    expect(html).toContain('cs-peek') // peek/search a draw stack
    expect(html).toContain('Strength') // advantage token post
  })

  it('renders 6 rotatable region tiles per principality (12 total)', () => {
    const tiles = html.split('class="rtile').length - 1
    expect(tiles).toBe(12)
  })

  it('lays out two principality boards (spine + corner regions)', () => {
    const boards = html.split('data-player=').length - 1
    expect(boards).toBe(2)
  })

  it('fans the active hand of 3 cards along the bottom', () => {
    const handCards = html.split('class="hand-card').length - 1
    expect(handCards).toBe(3)
  })
})
