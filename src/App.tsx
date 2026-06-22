import { useMemo, useState } from 'react'
import { CARDS } from './data/cards'
import type { SetId } from './types'
import { CardView } from './ui/CardView'
import { TableBoard } from './ui/board/TableBoard'
import { Lobby } from './ui/net/Lobby'
import { useGame } from './store/gameStore'
import type { AppMode } from './ui/board/TableHud'
import { AmbientMusic } from './ui/board/AmbientMusic'
import './app.css'

const SETS: { id: SetId | 'all'; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'base', label: 'Basic Set' },
  { id: 'gold', label: 'Era of Gold' },
  { id: 'turmoil', label: 'Era of Turmoil' },
  { id: 'progress', label: 'Era of Progress' },
]

export function App() {
  const [mode, setMode] = useState<AppMode>('local')
  const [set, setSet] = useState<SetId | 'all'>('all')
  const online = useGame((s) => s.online)

  const shown = useMemo(() => (set === 'all' ? CARDS : CARDS.filter((c) => c.set === set)), [set])
  const flagged = useMemo(() => CARDS.filter((c) => c.unclear && c.unclear.length).length, [])
  const copies = useMemo(() => shown.reduce((n, c) => n + (c.copies || 1), 0), [shown])

  // Game modes render the full-viewport table; gallery keeps the scrollable page.
  if (mode === 'local' || (mode === 'online' && online)) {
    return <TableBoard mode={mode} setMode={setMode} />
  }

  if (mode === 'online') {
    return (
      <div className="lobby-screen">
        <AmbientMusic />
        <nav className="mode-tabs floating">
          <button className="mode-tab" onClick={() => setMode('local')}>Hotseat</button>
          <button className="mode-tab active">Online</button>
          <button className="mode-tab" onClick={() => setMode('gallery')}>Card Gallery</button>
        </nav>
        <Lobby />
      </div>
    )
  }

  return (
    <div className="app">
      <AmbientMusic />
      <header className="app-header">
        <h1 className="app-title">Catan&nbsp;Duel</h1>
        <p className="app-sub">The Rivals for Catan</p>
        <nav className="mode-tabs">
          <button className="mode-tab" onClick={() => setMode('local')}>Hotseat</button>
          <button className="mode-tab" onClick={() => setMode('online')}>Online</button>
          <button className="mode-tab active">Card Gallery</button>
        </nav>
      </header>

      <nav className="app-tabs">
        {SETS.map((s) => (
          <button key={s.id} className={`app-tab ${set === s.id ? 'active' : ''}`} onClick={() => setSet(s.id)}>
            {s.label}
          </button>
        ))}
      </nav>

      <div className="app-status">
        {shown.length} unique cards · {copies} physical copies
        {flagged > 0 && <span className="app-flag"> · {flagged} flagged for verify</span>}
      </div>

      <main className="gallery">
        {shown.map((c) => (
          <CardView key={c.id} card={c} />
        ))}
      </main>

      <footer className="app-foot">
        <details className="app-credits">
          <summary>Credits &amp; licenses</summary>
          Card text &amp; art © Catan GmbH — transcribed from official sources for private play.
          <br />
          Music by Kevin MacLeod (incompetech.com), licensed under CC BY 4.0.
          Sound effects CC0 (OpenGameArt).
        </details>
      </footer>
    </div>
  )
}
