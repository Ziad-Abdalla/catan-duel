import { useState } from 'react'
import { useGame } from '../../store/gameStore'
import { PlayerHeader } from './PlayerHeader'
import { Principality } from './Principality'
import { CenterColumn } from './CenterColumn'
import { HandView } from './HandView'
import { TurnBanner } from './TurnBanner'
import { ConnectionBar } from '../net/ConnectionBar'
import { NetToasts } from '../net/NetToasts'
import './board.css'
import './anim.css'

/**
 * The shared board. Offline (hotseat) the active player sits at the bottom and
 * swaps on End Turn; online, YOUR seat is always at the bottom.
 */
export function Board() {
  const state = useGame((s) => s.state)
  const newHotseat = useGame((s) => s.newHotseat)
  const online = useGame((s) => s.online)
  const mySeat = useGame((s) => s.mySeat)
  const bottom = online ? mySeat : state.activePlayer
  const opp = bottom === 'p0' ? 'p1' : 'p0'

  const [p0Name, setP0Name] = useState(state.players.p0.name)
  const [p1Name, setP1Name] = useState(state.players.p1.name)

  const startNew = () => newHotseat({ p0Name: p0Name || 'Player 1', p1Name: p1Name || 'Player 2' })

  return (
    <div className="board-wrap">
      <TurnBanner />
      {online && <NetToasts />}
      {online && <ConnectionBar />}
      <div className="board-toolbar">
        <span className="bt-title">The First Catanians</span>
        <label className="bt-name">
          P1 <input value={p0Name} onChange={(e) => setP0Name(e.target.value)} />
        </label>
        <label className="bt-name">
          P2 <input value={p1Name} onChange={(e) => setP1Name(e.target.value)} />
        </label>
        <button className="btn" onClick={startNew}>
          ⟳ New game
        </button>
      </div>

      <div className="board">
        <PlayerHeader player={opp} />
        <Principality player={opp} top />

        <CenterColumn />

        <PlayerHeader player={bottom} />
        <Principality player={bottom} />
        <HandView player={bottom} />
      </div>

      {state.winner && (
        <div className="gameover" role="alertdialog" aria-label="Game over">
          <div className="gameover-card">
            <h2>🏆 {state.players[state.winner].name} wins!</h2>
            <p>
              {state.players[state.winner].name} reached {state.players[state.winner].victoryPoints} victory points.
            </p>
            <button className="btn btn-primary" onClick={startNew}>
              Play again
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
