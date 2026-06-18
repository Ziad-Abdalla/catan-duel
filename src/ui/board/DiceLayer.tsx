import { useEffect, useState } from 'react'
import { EVENT_DIE_FACES, type EventFace } from '../../engine/dice'
import { useGame } from '../../store/gameStore'
import { useUI } from '../../store/uiStore'
import { PipDie, EventSymbol, EVENT_COLOR } from './diceart'
import './dice.css'

/**
 * Two physical dice that tumble onto a random spot of the felt when a roll
 * happens. WHILE tumbling they flip through random faces (so it reads as a real
 * roll, not a die that already shows the answer); once they settle they snap to
 * the actual outcome, then fade as the wall writes the result. Triggered off
 * `lastRoll` changes so it fires for local AND remote rolls; timing lives in the
 * store (StrictMode-safe).
 */
export function DiceLayer() {
  const lastRoll = useGame((s) => s.state.lastRoll)
  const turn = useGame((s) => s.state.turn)
  const rollDice = useUI((s) => s.rollDice)
  const dice = useUI((s) => s.dice)

  useEffect(() => {
    if (lastRoll) rollDice(lastRoll.production, lastRoll.event, turn)
  }, [lastRoll, turn, rollDice])

  // random faces shown during the tumble (settle to the real values)
  const [face, setFace] = useState(1)
  const [evt, setEvt] = useState<EventFace>('trade')
  const rolling = dice?.phase === 'tumble'
  useEffect(() => {
    if (!rolling) return
    const flip = () => {
      setFace(1 + Math.floor(Math.random() * 6))
      setEvt(EVENT_DIE_FACES[Math.floor(Math.random() * EVENT_DIE_FACES.length)])
    }
    flip()
    const iv = setInterval(flip, 90)
    return () => clearInterval(iv)
  }, [rolling, dice?.id])

  if (!dice) return null
  const showProd = rolling ? face : dice.prod
  const showEvt = (rolling ? evt : dice.event) as EventFace

  return (
    <div className="dice-felt" style={{ left: `${dice.x}vw`, top: `${dice.y}vh` }} aria-hidden>
      <div className={`pdie d-prod phase-${dice.phase}`}>
        <PipDie n={showProd} />
      </div>
      <div className={`pdie d-evt phase-${dice.phase}`} style={{ ['--evt-bg' as string]: EVENT_COLOR[showEvt] }}>
        <EventSymbol face={showEvt} />
      </div>
    </div>
  )
}
