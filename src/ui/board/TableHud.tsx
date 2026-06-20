import { useEffect, useState } from 'react'
import type { SetId } from '../../types'
import { useGame } from '../../store/gameStore'
import { useUI } from '../../store/uiStore'
import { isMuted, toggleMute, onMuteChange, playSfx } from '../../audio/sfx'
import { getAudio, setAudio, onAudioChange, type AudioPrefs } from '../../audio/prefs'

/** Official victory targets per mode + a common tournament value. */
const VP_TARGETS = [7, 12, 13, 15]

export type AppMode = 'local' | 'online' | 'gallery'

const ERAS: { id: SetId; label: string }[] = [
  { id: 'gold', label: 'Gold' },
  { id: 'turmoil', label: 'Turmoil' },
  { id: 'progress', label: 'Innovation' },
]

const THEMES: { id: string; label: string }[] = [
  { id: 'auto', label: 'Auto' },
  { id: 'base', label: 'Classic' },
  { id: 'gold', label: 'Gold' },
  { id: 'turmoil', label: 'Turmoil' },
  { id: 'progress', label: 'Innovation' },
  { id: 'duel', label: 'Duel' },
]

/** Live-subscribed mute state for the toggle button. */
function useMuted() {
  const [m, setM] = useState(isMuted())
  useEffect(() => onMuteChange(setM), [])
  return m
}

/** Live-subscribed audio prefs for the Sound settings. */
function useAudioPrefs(): AudioPrefs {
  const [p, setP] = useState(getAudio())
  useEffect(() => onAudioChange(setP), [])
  return p
}

/** Slim top strip on the felt: title, the setup popover (sets/win/theme), pay toggle,
 *  log, sound, new game, and the mode tabs. Frequently-used controls stay on the bar;
 *  the game-setup options (which can restart the game) are tucked into ⚙ Setup. */
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
  const audio = useAudioPrefs()
  const muted = useMuted()
  const [setupOpen, setSetupOpen] = useState(false)

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

      <div className="hud-setup-wrap">
        <button className={`hud-btn${setupOpen ? ' on' : ''}`} title="Game setup — sets, win target, table theme" onClick={() => { setSetupOpen((o) => !o); playSfx('ui') }}>
          ⚙ Setup
        </button>
        {setupOpen && (
          <>
            <div className="hud-pop-scrim" onClick={() => setSetupOpen(false)} />
            <div className="hud-pop" role="dialog" aria-label="Game setup">
              <div className="hud-pop-group">
                <span className="hud-pop-label">Card sets <em>· starts a new game</em></span>
                <div className="hud-chips">
                  <span className="hud-chip on" aria-disabled>Basic</span>
                  {ERAS.map((e) => (
                    <button key={e.id} className={`hud-chip${enabledSets.includes(e.id) ? ' on' : ''}`} onClick={() => toggleEra(e.id)}>{e.label}</button>
                  ))}
                </div>
              </div>
              <div className="hud-pop-group">
                <span className="hud-pop-label">Win at</span>
                <select className="hud-vp-sel" value={winThreshold} onChange={(e) => { dispatch({ type: 'setWinThreshold', value: Number(e.target.value) }); playSfx('ui') }}>
                  {(VP_TARGETS.includes(winThreshold) ? VP_TARGETS : [winThreshold, ...VP_TARGETS]).map((v) => (
                    <option key={v} value={v}>{v} VP</option>
                  ))}
                </select>
              </div>
              <div className="hud-pop-group">
                <span className="hud-pop-label">Table theme</span>
                <select className="hud-vp-sel" value={tableTheme} onChange={(e) => { setTableTheme(e.target.value as typeof tableTheme); playSfx('ui') }}>
                  {THEMES.map((t) => <option key={t.id} value={t.id}>{t.label}</option>)}
                </select>
              </div>
              <div className="hud-pop-group">
                <span className="hud-pop-label">Sound</span>
                <label className="hud-snd">
                  <span>Effects</span>
                  <input type="range" min="0" max="1" step="0.05" value={audio.sfxVol} aria-label="Effects volume"
                    onChange={(e) => setAudio({ sfxVol: Number(e.target.value) })} onMouseUp={() => playSfx('coin')} onTouchEnd={() => playSfx('coin')} />
                </label>
                <label className="hud-snd">
                  <span>Music</span>
                  <button className={`hud-mini${audio.musicOn ? ' on' : ''}`} aria-pressed={audio.musicOn}
                    onClick={() => { setAudio({ musicOn: !audio.musicOn }); playSfx('ui') }}>{audio.musicOn ? 'On' : 'Off'}</button>
                  <input type="range" min="0" max="1" step="0.05" value={audio.musicVol} aria-label="Music volume"
                    onChange={(e) => setAudio({ musicVol: Number(e.target.value) })} />
                </label>
              </div>
            </div>
          </>
        )}
      </div>

      <div className="hud-spacer" />

      <button
        className={`hud-chip hud-pay${payCosts ? ' on' : ''}`}
        title={payCosts ? 'Building spends its cost — click for free placement' : 'Free placement — click to spend costs when building'}
        aria-pressed={payCosts}
        onClick={() => { setPayCosts(!payCosts); playSfx('ui') }}
      >
        {payCosts ? '💰 Pay' : '🆓 Free'}
      </button>
      <button className="hud-btn" onClick={() => { toggleAudit(); playSfx('ui') }} title="Action history log">☰ Log</button>
      <button
        className="hud-btn hud-mute"
        aria-pressed={muted}
        title={muted ? 'Sound off — click to unmute' : 'Sound on — click to mute'}
        onClick={() => { const nowMuted = toggleMute(); if (!nowMuted) playSfx('ui') }}
      >
        {muted ? '🔇' : '🔊'}
      </button>
      <button
        className="hud-btn"
        title="Toggle fullscreen (optional — the table fits without it too)"
        onClick={() => {
          if (document.fullscreenElement) void document.exitFullscreen()
          else void document.documentElement.requestFullscreen?.()
          playSfx('ui')
        }}
      >
        ⛶
      </button>
      {!online && (
        <button className="hud-btn" title="Start a new game" onClick={() => newHotseat({ p0Name: names.p0, p1Name: names.p1 })}>⟳ New</button>
      )}
      <div className="hud-tabs">
        <button className={`hud-tab${mode === 'local' ? ' active' : ''}`} onClick={() => setMode('local')}>Hotseat</button>
        <button className={`hud-tab${mode === 'online' ? ' active' : ''}`} onClick={() => setMode('online')}>Online</button>
        <button className={`hud-tab${mode === 'gallery' ? ' active' : ''}`} onClick={() => setMode('gallery')}>Cards</button>
      </div>
    </div>
  )
}
