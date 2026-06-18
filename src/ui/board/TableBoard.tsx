import { useGame } from '../../store/gameStore'
import { Table } from './Table'
import { TableHud, type AppMode } from './TableHud'
import { PrincipalityBoard } from './PrincipalityBoard'
import { PlayerPlate } from './PlayerPlate'
import { CentralWall } from './CentralWall'
import { BuildSupply } from './BuildSupply'
import { Hand } from './Hand'
import { TurnBanner } from './TurnBanner'
import { FlightLayer } from './FlightLayer'
import { DiceLayer } from './DiceLayer'
import { CardZoom } from './CardZoom'
import { ResolutionPanel } from './ResolutionPanel'
import { AuditLog } from './AuditLog'
import { ConnectionBar } from '../net/ConnectionBar'
import { NetToasts } from '../net/NetToasts'
import './board.css'
import './anim.css'

/** The real-table board: two principalities facing across the central wall. */
export function TableBoard({ mode, setMode }: { mode: AppMode; setMode: (m: AppMode) => void }) {
  const state = useGame((s) => s.state)
  const online = useGame((s) => s.online)
  const mySeat = useGame((s) => s.mySeat)
  const bottom = online ? mySeat : state.activePlayer
  const top = bottom === 'p0' ? 'p1' : 'p0'

  return (
    <>
      <Table>
        <div className="tc-hud">
          <TableHud mode={mode} setMode={setMode} />
        </div>

        <section className="ppane ppane-opp" aria-label="Opponent's principality">
          <div className="pmat flip">
            <PlayerPlate player={top} />
            <div className="pboard-wrap">
              <PrincipalityBoard player={top} flipped />
            </div>
          </div>
        </section>

        <div className="wall-rail">
          <CentralWall />
        </div>

        <section className="ppane ppane-you" aria-label="Your principality">
          <div className="pmat">
            <div className="pboard-wrap">
              <PrincipalityBoard player={bottom} interactive />
            </div>
            <div className="you-bar">
              <PlayerPlate player={bottom} />
              <BuildSupply player={bottom} />
            </div>
            <Hand player={bottom} />
          </div>
        </section>
      </Table>

      {/* overlays — OUTSIDE the scaled table so position:fixed resolves to the viewport */}
      <FlightLayer />
      <DiceLayer />
      <CardZoom />
      <ResolutionPanel />
      <AuditLog />
      <TurnBanner />
      {online && <NetToasts />}
      {online && <ConnectionBar />}

      {state.winner && (
        <div className="gameover" role="alertdialog" aria-label="Game over">
          <div className="gameover-card">
            <h2>🏆 {state.players[state.winner].name} wins!</h2>
            <p>{state.players[state.winner].name} reached {state.players[state.winner].victoryPoints} victory points.</p>
            <button className="btn btn-primary" onClick={() => useGame.getState().newHotseat()}>Play again</button>
          </div>
        </div>
      )}
    </>
  )
}
