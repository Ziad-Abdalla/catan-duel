import { describe, it, expect } from 'vitest'
import { renderToString } from 'react-dom/server'
import AiTableMode from './AiTableMode'

// SSR smoke: the AI-mode wrapper mounts its setup screen without throwing and
// exposes the expected controls. (The AI turn loop is a client effect, covered by
// integration.test.ts; the real board render is covered by board.smoke.test.tsx.)
describe('AiTableMode', () => {
  it('mounts the setup screen', () => {
    const html = renderToString(<AiTableMode />)
    expect(html).toContain('Rivals — vs AI')
    expect(html).toContain('Difficulty')
    expect(html).toContain('Start game')
    expect(html).toContain('Era of Gold')
  })
})
