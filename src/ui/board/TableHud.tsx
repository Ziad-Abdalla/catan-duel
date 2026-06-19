import { useEffect, useState } from 'react'
import type { SetId } from '../../types'
import { useGame } from '../../store/gameStore'
import { useUI } from '../../store/uiStore'
import { isMuted, toggleMute, onMuteChange, playSfx } from '../../audio/sfx'

/** Official victory targets per mode + a common tournament value. */
const VP_TARGETS = [7, 12, 13, 15]

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
  const dispatch = useGame((s) => s.dispatch)
  const online = useGame((s) => s.online)
  const enabledSets = useGame((s) => s.state.enabledSets)
  const winThreshold = useGame((s) => s.state.winThreshold)
  const toggleAudit = useUI((s) => s.toggleAudit)
  const payCosts = useUI((s) => s.payCosts)
  const setPayCosts = useUI((s) => s.setPayCosts)
  const tableTheme = useUI((s) => s.tableTheme)
  const setTableTheme = useUI((s) => s.setTableTheme)
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
      <label className="hud-vp" title="Victory points needed to win — 7 intro · 12 single theme · 13 Duel of the Princes · 15 tournament">
        <span className="hud-vp-label">Win @</span>
        <select
          className="hud-vp-sel"
          value={winThreshold}
          onChange={(e) => {
            dispatch({ type: 'setWinThreshold', value: Number(e.target.value) })
            playSfx('ui')
          }}
        >
          {(VP_TARGETS.includes(winThreshold) ? VP_TARGETS : [winThreshold, ...VP_TARGETS]).map((v) => (
            <option key={v} value={v}>{v} VP</option>
          ))}
        </select>
      </label>
      <label className="hud-theme" title="Felt theme — change the table atmosphere any time (visual only)">
        <span className="hud-vp-label">Theme</span>
        <select className="hud-vp-sel" value={tableTheme} onChange={(e) => { setTableTheme(e.target.value as typeof tableTheme); playSfx('ui') }}>
          <option value="auto">Auto</option>
          <option value="base">Classic</option>
          <option value="gold">Gold</option>
          <option value="turmoil">Turmoil</option>
          <option value="progress">Innovation</option>
          <option value="duel">Duel</option>
        </select>
      </label>
      <button
        className={`hud-chip${payCosts ? ' on' : ''}`}
        title={payCosts ? 'Building spends its cost — click for free placement' : 'Free placement — click to spend costs when building'}
        onClick={() => { setPayCosts(!payCosts); playSfx('ui') }}
      >
        {payCosts ? '💰 Pay' : '🆓 Free'}
      </button>
      <button className="hud-btn" onClick={() => { toggleAudit(); playSfx('ui') }} title="Action history log">
        ☰ Log
      </button>
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
