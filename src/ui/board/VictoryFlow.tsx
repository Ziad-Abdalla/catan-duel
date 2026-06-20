import { useEffect } from 'react'
import type { PlayerId } from '../../types'
import { useGame } from '../../store/gameStore'
import { playSfx } from '../../audio/sfx'
import { playVictoryMusic, stopVictoryMusic } from '../../audio/music'
import './victory.css'

const other = (id: PlayerId): PlayerId => (id === 'p0' ? 'p1' : 'p0')

/** The looping celebration screen shown once a victory has been agreed. */
function Celebration({ winner }: { winner: PlayerId }) {
  const name = useGame((s) => s.state.players[winner].name)
  const vp = useGame((s) => s.state.players[winner].victoryPoints)
  const newHotseat = useGame((s) => s.newHotseat)
  useEffect(() => {
    playSfx('token')
    playVictoryMusic()
    return () => stopVictoryMusic()
  }, [])
  return (
    <div className="celebrate" role="alertdialog" aria-label="Victory">
      <div className="celebrate-rays" aria-hidden />
      <div className="celebrate-confetti" aria-hidden>
        {Array.from({ length: 40 }, (_, i) => (
          <span
            key={i}
            className="cf-piece"
            style={{
              left: `${(i * 2.5) % 100}%`,
              ['--cf-d' as string]: `${(i % 10) * 0.18}s`,
              ['--cf-x' as string]: `${((i * 53) % 11) - 5}`,
              ['--cf-r' as string]: `${(i % 2 ? 1 : -1) * (360 + (i % 4) * 180)}deg`,
              ['--cf-dur' as string]: `${2.4 + ((i * 7) % 16) / 10}s`,
              background: ['#e0b341', '#c75c54', '#5a86c4', '#7fd99a', '#ffd9f0', '#f3d79a'][i % 6],
            }}
          />
        ))}
      </div>
      <div className="celebrate-card">
        <div className="celebrate-trophy" aria-hidden>🏆</div>
        <h2 className="celebrate-name">{name} wins!</h2>
        <p className="celebrate-sub">Victory agreed at {vp} victory points.</p>
        <button
          className="btn btn-primary"
          onClick={() => {
            stopVictoryMusic()
            newHotseat()
          }}
        >
          Play again
        </button>
      </div>
    </div>
  )
}

/**
 * Non-abrupt end-game flow (no forced freeze):
 *  1. A player at/over the threshold sees a small "Claim victory" banner — the game
 *     keeps running; nothing is locked.
 *  2. On claim, the opponent is asked to agree; the claimant waits (or cancels).
 *  3. Once agreed, the looping celebration screen takes over.
 */
export function VictoryFlow() {
  const state = useGame((s) => s.state)
  const online = useGame((s) => s.online)
  const mySeat = useGame((s) => s.mySeat)
  const dispatch = useGame((s) => s.dispatch)
  const name = (id: PlayerId) => state.players[id].name

  if (state.winner) return <Celebration winner={state.winner} />

  // A claim is pending agreement.
  if (state.victoryClaim) {
    const claimant = state.victoryClaim
    const iAmClaimant = online && mySeat === claimant
    if (iAmClaimant) {
      return (
        <div className="vbanner vbanner-wait" role="status">
          <span>Waiting for {name(other(claimant))} to agree…</span>
          <button className="vbtn vbtn-ghost" onClick={() => dispatch({ type: 'declineVictory' })}>Cancel</button>
        </div>
      )
    }
    // The opponent (online) — or either seat in hotseat — decides.
    const agreeAs: PlayerId = online ? mySeat : other(claimant)
    return (
      <div className="vclaim" role="alertdialog" aria-label="Victory claim">
        <div className="vclaim-card">
          <p className="vclaim-text"><strong>{name(claimant)}</strong> claims victory.</p>
          <div className="vclaim-actions">
            <button className="vbtn vbtn-primary" onClick={() => dispatch({ type: 'agreeVictory', player: agreeAs })}>Agree — end game</button>
            <button className="vbtn vbtn-ghost" onClick={() => dispatch({ type: 'declineVictory' })}>Not yet</button>
          </div>
        </div>
      </div>
    )
  }

  // Eligibility — a non-blocking nudge that a player may claim victory.
  if (state.eligible) {
    return (
      <div className="vbanner" role="status">
        <span>🏁 {name(state.eligible)} reached {state.winThreshold} VP</span>
        <button className="vbtn vbtn-primary" onClick={() => dispatch({ type: 'claimVictory', player: state.eligible! })}>
          Claim victory
        </button>
      </div>
    )
  }

  return null
}
