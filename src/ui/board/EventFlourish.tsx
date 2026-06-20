import { useEffect, useState } from 'react'
import { useUI } from '../../store/uiStore'
import type { EventFace } from '../../engine/dice'
import './flourish.css'

/**
 * A brief, non-blocking FULL-SCREEN flourish when the roll settles — one cinematic per
 * event-die face (brigand has its own BrigandSequence, so it's skipped here). A themed
 * colour flash + a shower of fitting glyphs + a title, ~1.7s, then it clears. Tasteful
 * and brief so it adds life without getting in the way; respects reduced-motion via CSS.
 */
const FACE: Partial<Record<EventFace, { ch: string; cls: string; title: string }>> = {
  trade: { ch: '🪙', cls: 'fl-trade', title: 'Trade' },
  celebration: { ch: '🎉', cls: 'fl-celebration', title: 'Celebration' },
  'plentiful-harvest': { ch: '🌾', cls: 'fl-harvest', title: 'Plentiful Harvest' },
  'event-card': { ch: '✶', cls: 'fl-event', title: 'Event' },
}

// deterministic spread so particles don't all stack (no Math.random in render)
const COLS = Array.from({ length: 22 }, (_, i) => i)

export function EventFlourish() {
  const eventFx = useUI((s) => s.eventFx)
  const [burst, setBurst] = useState<{ key: number; face: EventFace } | null>(null)

  useEffect(() => {
    if (!eventFx) return
    const face = eventFx.face
    if (!FACE[face]) return // brigand & anything unmapped → handled elsewhere
    const key = eventFx.key
    setBurst({ key, face })
    const t = setTimeout(() => setBurst((b) => (b?.key === key ? null : b)), 1700)
    return () => clearTimeout(t)
  }, [eventFx])

  if (!burst) return null
  const f = FACE[burst.face]!
  return (
    <div className={`flourish ${f.cls}`} key={burst.key} aria-hidden>
      <div className="fl-flash" />
      <div className="fl-title">{f.title}</div>
      {COLS.map((i) => {
        const x = (i / (COLS.length - 1)) * 100 // 0..100vw
        const delay = ((i * 37) % 60) / 100 // 0..0.6s spread
        const drift = ((i * 53) % 7) - 3 // -3..3
        const dur = 1.2 + ((i * 29) % 9) / 10 // 1.2..2.0s
        return (
          <span
            key={i}
            className="fl-particle"
            style={{
              left: `${x}vw`,
              ['--d' as string]: `${delay}s`,
              ['--drift' as string]: `${drift}`,
              ['--dur' as string]: `${dur}s`,
              ['--rot' as string]: `${(i % 2 ? 1 : -1) * (180 + (i % 5) * 60)}deg`,
            }}
          >
            {f.ch}
          </span>
        )
      })}
    </div>
  )
}
