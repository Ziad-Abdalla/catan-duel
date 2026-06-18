import type { EventFace } from '../../engine/dice'

/** Pip positions on a 3×3 die face (cell indices 0–8). */
const PIPS: Record<number, number[]> = {
  1: [4],
  2: [0, 8],
  3: [0, 4, 8],
  4: [0, 2, 6, 8],
  5: [0, 2, 4, 6, 8],
  6: [0, 2, 3, 5, 6, 8],
}

/** A white production die showing `n` as pips. */
export function PipDie({ n }: { n: number }) {
  const on = new Set(PIPS[n] ?? [])
  return (
    <div className="die-face die-pips" aria-label={`production ${n}`}>
      {Array.from({ length: 9 }, (_, i) => (
        <span key={i} className={on.has(i) ? 'pip on' : 'pip'} />
      ))}
    </div>
  )
}

export const EVENT_COLOR: Record<EventFace, string> = {
  brigand: '#3a2c4a',
  trade: '#1f5a6b',
  celebration: '#7a2e57',
  'plentiful-harvest': '#5a7a2e',
  'event-card': '#7a5a1e',
}

export const EVENT_NAME: Record<EventFace, string> = {
  brigand: 'Brigand',
  trade: 'Trade',
  celebration: 'Celebration',
  'plentiful-harvest': 'Plentiful Harvest',
  'event-card': 'Event Card',
}

/** A carved emblem for each of the five event-die symbols. */
export function EventSymbol({ face }: { face: EventFace }) {
  const common = { fill: 'none', stroke: '#f3e6c6', strokeWidth: 4, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const }
  switch (face) {
    case 'brigand': // hooded robber + blade
      return (
        <svg viewBox="0 0 64 64" className="evt-emblem">
          <path d="M32 12c-10 0-17 8-17 19 0 6 3 12 8 17h18c5-5 8-11 8-17 0-11-7-19-17-19Z" fill="#1c1426" stroke="#f3e6c6" strokeWidth="3" />
          <rect x="20" y="30" width="24" height="7" rx="3.5" fill="#0e0a16" />
          <circle cx="26" cy="33.5" r="2" fill="#e7c489" />
          <circle cx="38" cy="33.5" r="2" fill="#e7c489" />
        </svg>
      )
    case 'trade': // balance scale
      return (
        <svg viewBox="0 0 64 64" className="evt-emblem">
          <g {...common}>
            <line x1="32" y1="14" x2="32" y2="46" />
            <line x1="16" y1="22" x2="48" y2="22" />
            <line x1="22" y1="48" x2="42" y2="48" />
            <path d="M16 22 L9 36 L23 36 Z" />
            <path d="M48 22 L41 36 L55 36 Z" />
          </g>
          <circle cx="32" cy="14" r="3.4" fill="#f3e6c6" />
        </svg>
      )
    case 'celebration': // goblet with a star
      return (
        <svg viewBox="0 0 64 64" className="evt-emblem">
          <g {...common}>
            <path d="M22 24 H42 L39 38 Q32 44 25 38 Z" />
            <line x1="32" y1="44" x2="32" y2="52" />
            <line x1="24" y1="52" x2="40" y2="52" />
          </g>
          <path d="M32 9 l2.6 5.4 5.9.8 -4.3 4.2 1 5.9 -5.2-2.8 -5.2 2.8 1-5.9 -4.3-4.2 5.9-.8Z" fill="#f3d79a" />
        </svg>
      )
    case 'plentiful-harvest': // wheat sheaf
      return (
        <svg viewBox="0 0 64 64" className="evt-emblem">
          <g {...common}>
            <line x1="32" y1="50" x2="32" y2="22" />
            <line x1="24" y1="52" x2="40" y2="52" />
            <path d="M32 22 q-7 -3 -9 -11 q7 1 9 7" />
            <path d="M32 22 q7 -3 9 -11 q-7 1 -9 7" />
            <path d="M32 30 q-7 -3 -9 -11 q7 1 9 7" />
            <path d="M32 30 q7 -3 9 -11 q-7 1 -9 7" />
          </g>
        </svg>
      )
    case 'event-card': // a drawn scroll / card
      return (
        <svg viewBox="0 0 64 64" className="evt-emblem">
          <rect x="18" y="12" width="28" height="40" rx="4" fill="#0e0a16" stroke="#f3e6c6" strokeWidth="3" transform="rotate(-7 32 32)" />
          <text x="32" y="40" textAnchor="middle" fontFamily="Cinzel, serif" fontSize="26" fontWeight="700" fill="#f3d79a" transform="rotate(-7 32 32)">?</text>
        </svg>
      )
  }
}
