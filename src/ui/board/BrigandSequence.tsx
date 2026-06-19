import { useEffect, useRef, useState } from 'react'
import { useUI } from '../../store/uiStore'
import { playSfx } from '../../audio/sfx'
import './brigand.css'

/**
 * A dedicated robbing cinematic for the Brigand event die. Triggers off the UI's
 * `revealedRoll` (set once the dice settle, on BOTH screens) so it plays in sync.
 * It fires once per roll, then fades — purely atmospheric; the actual resource loss
 * stays manual (the resolution panel), keeping the sandbox in the players' hands.
 */
export function BrigandSequence() {
  const revealedRoll = useUI((s) => s.revealedRoll)
  const [show, setShow] = useState(false)
  const lastKey = useRef<string | null>(null)

  useEffect(() => {
    if (!revealedRoll || revealedRoll.event !== 'brigand') return
    const key = `${revealedRoll.turn}:${revealedRoll.production}`
    if (key === lastKey.current) return // already played for this roll
    lastKey.current = key
    setShow(true)
    playSfx('token')
    const t = setTimeout(() => setShow(false), 1900)
    return () => clearTimeout(t)
  }, [revealedRoll])

  if (!show) return null
  return (
    <div className="brigand" aria-hidden>
      <div className="brigand-shade" />
      <div className="brigand-rider">
        <span className="brigand-glyph">🏴‍☠️</span>
        <span className="brigand-title">Brigands raid the roads!</span>
        <span className="brigand-sub">Anyone holding more than 7 resources loses their gold &amp; wool.</span>
      </div>
    </div>
  )
}
