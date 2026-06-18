import { useEffect, useRef, useState } from 'react'
import { useGame } from '../../store/gameStore'

/** Sweeps a "<player>'s turn" banner across the board when the turn changes. */
export function TurnBanner() {
  const turn = useGame((s) => s.state.turn)
  const activeName = useGame((s) => s.state.players[s.state.activePlayer].name)
  const over = useGame((s) => s.state.phase === 'gameover')
  const [show, setShow] = useState(false)
  const prev = useRef(turn)

  useEffect(() => {
    if (prev.current === turn) return
    prev.current = turn
    if (over) return
    setShow(true)
    const t = setTimeout(() => setShow(false), 1250)
    return () => clearTimeout(t)
  }, [turn, over])

  if (!show) return null
  return (
    <div className="turn-banner" key={turn}>
      <span>{activeName}&rsquo;s turn</span>
    </div>
  )
}
