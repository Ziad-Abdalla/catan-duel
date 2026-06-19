import { useEffect, useRef, useState } from 'react'
import { useUI } from '../../store/uiStore'
import './brigand.css'

/**
 * A dedicated robbing cinematic for the Brigand effect. Triggers off the unified
 * `eventFx` signal — fired when the dice settle on a Brigand AND when a card forces a
 * Brigand attack — so it plays in sync on both screens. Purely atmospheric; the actual
 * resource loss stays manual (the resolution panel), keeping the sandbox in players' hands.
 */
export function BrigandSequence() {
  const eventFx = useUI((s) => s.eventFx)
  const [show, setShow] = useState(false)
  const lastKey = useRef<number | null>(null)

  useEffect(() => {
    if (!eventFx || eventFx.face !== 'brigand') return
    if (eventFx.key === lastKey.current) return // already played for this trigger
    lastKey.current = eventFx.key
    setShow(true)
    // audio is owned by DiceEventCue (brigand → 'menace'); this stays purely visual.
    const t = setTimeout(() => setShow(false), 1900)
    return () => clearTimeout(t)
  }, [eventFx])

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
