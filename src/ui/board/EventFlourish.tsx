import { useEffect, useState } from 'react'
import { useUI } from '../../store/uiStore'
import type { EventFace } from '../../engine/dice'
import './flourish.css'

/** A short, non-blocking themed particle burst when the roll settles — one per event-die
 *  face (brigand has its own BrigandSequence cinematic, so it's skipped here). Tasteful and
 *  brief so it adds life without clutter; respects reduced-motion via CSS. */
const GLYPH: Partial<Record<EventFace, { ch: string; cls: string }>> = {
  trade: { ch: '🪙', cls: 'fl-trade' },
  celebration: { ch: '✦', cls: 'fl-celebration' },
  'plentiful-harvest': { ch: '🌾', cls: 'fl-harvest' },
  'event-card': { ch: '✶', cls: 'fl-event' },
}

export function EventFlourish() {
  const revealedRoll = useUI((s) => s.revealedRoll)
  const [burst, setBurst] = useState<{ key: string; face: EventFace } | null>(null)

  useEffect(() => {
    if (!revealedRoll) return
    const face = revealedRoll.event as EventFace
    if (!GLYPH[face]) return // brigand & anything unmapped → no flourish here
    const key = `${revealedRoll.turn}:${revealedRoll.production}:${face}`
    setBurst({ key, face })
    const t = setTimeout(() => setBurst((b) => (b?.key === key ? null : b)), 1500)
    return () => clearTimeout(t)
  }, [revealedRoll])

  if (!burst) return null
  const g = GLYPH[burst.face]!
  return (
    <div className={`flourish ${g.cls}`} key={burst.key} aria-hidden>
      {Array.from({ length: 9 }, (_, i) => (
        <span
          key={i}
          className="fl-particle"
          style={{
            ['--fx' as string]: `${(i / 8 - 0.5) * 2}`,
            ['--d' as string]: `${i * 0.045}s`,
            ['--r' as string]: `${(i % 3) - 1}`,
          }}
        >
          {g.ch}
        </span>
      ))}
    </div>
  )
}
