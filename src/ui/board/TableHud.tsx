import { useEffect, useState } from 'react'
import type { SetId } from '../../types'
import { useGame } from '../../store/gameStore'
import { isMuted, toggleMute, onMuteChange, playSfx } from '../../audio/sfx'

export type AppMode = 'local' | 'online' | 'gallery'

const ERAS: { id: SetId; label: string }[] = [
  { id: 'gold', label: 'Gold' },
  { id: 'turmoil', label: 'Turmoil' },
  { id: 'progress', label: 'Innovation' },
]

/** Live-subscribed mute state for the toggle button. */
function useMuted() {
  const [m, setM] = useState(isMuted())
  useEffect(() => onMuteChange(setM), [])
  return m
}

/** Slim top strip on the felt: title, mode switch, names, new game. */
export function TableHud({ mode, setMode }: { mode: AppMode; setMode: (m: AppMode) => void }) {
  const names = {
    p0: useGame((s) => s.state.players.p0.name),
    p1: useGame((s) => s.state.players.p1.name),
  }
  const newHotseat = useGame((s) => s.newHotseat)
  const online = useGame((s) => s.online)
  const enabledSets = useGame((s) => s.state.enabledSets)
  const muted = useMuted()

  // Toggling an era starts a fresh game with that card set folded into the decks.
  const toggleEra = (id: SetId) => {
    const eras: SetId[] = enabledSets.filter((s) => s !== 'base')
    const next: SetId[] = eras.includes(id) ? eras.filter((s) => s !== id) : [...eras, id]
    newHotseat({ p0Name: names.p0, p1Name: names.p1, enabledSets: next })
    playSfx('ui')
  }

  return (
    <div className="table-hud">
      <span className="hud-title">Catan Duel</span>
      <div className="hud-sets" title="Card sets in play — toggling starts a new game">
        <span className="hud-sets-label">Sets</span>
        <span className="hud-chip on" aria-disabled>Basic</span>
        {ERAS.map((e) => (
          <button
            key={e.id}
            className={`hud-chip${enabledSets.includes(e.id) ? ' on' : ''}`}
            onClick={() => toggleEra(e.id)}
          >
            {e.label}
          </button>
        ))}
      </div>
      <div className="hud-spacer" />
      <button
        className="hud-btn hud-mute"
        aria-pressed={muted}
        title={muted ? 'Sound off — click to unmute' : 'Sound on — click to mute'}
        onClick={() => {
          const nowMuted = toggleMute()
          if (!nowMuted) playSfx('ui')
        }}
      >
        {muted ? '🔇' : '🔊'}
      </button>
      {!online && (
        <button className="hud-btn" onClick={() => newHotseat({ p0Name: names.p0, p1Name: names.p1 })}>
          ⟳ New game
        </button>
      )}
      <div className="hud-tabs">
        <button className={`hud-tab${mode === 'local' ? ' active' : ''}`} onClick={() => setMode('local')}>Hotseat</button>
        <button className={`hud-tab${mode === 'online' ? ' active' : ''}`} onClick={() => setMode('online')}>Online</button>
        <button className={`hud-tab${mode === 'gallery' ? ' active' : ''}`} onClick={() => setMode('gallery')}>Cards</button>
      </div>
    </div>
  )
}
