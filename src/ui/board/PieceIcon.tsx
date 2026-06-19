/**
 * Clean, modern game-piece tokens for the structural pieces (settlement / city / road).
 * They render in the active player's colour via `currentColor` (set in CSS from --pc),
 * with flat light/shadow overlays so they read as crisp 3D tokens on any colour — a
 * deliberate replacement for the dated scanned photos.
 */

const SHADOW = 'rgba(0,0,0,0.22)'
const SHADE = 'rgba(0,0,0,0.20)'
const HILITE = 'rgba(255,255,255,0.22)'
const OUTLINE = 'rgba(0,0,0,0.45)'
const props = { viewBox: '0 0 100 100', className: 'piece-icon', xmlns: 'http://www.w3.org/2000/svg' } as const

export function SettlementIcon() {
  return (
    <svg {...props} aria-label="settlement">
      <ellipse cx="50" cy="85" rx="29" ry="6" fill={SHADOW} />
      {/* body */}
      <path d="M30,52 H70 V81 H30 Z" fill="currentColor" />
      <path d="M50,52 H70 V81 H50 Z" fill={SHADE} />
      {/* roof */}
      <path d="M24,55 L50,31 L76,55 Z" fill="currentColor" />
      <path d="M50,31 L76,55 H50 Z" fill={SHADE} />
      <path d="M24,55 L50,31 H50 V55 Z" fill={HILITE} />
      {/* door */}
      <rect x="44" y="62" width="12" height="19" rx="1.5" fill={OUTLINE} />
      <path d="M24,55 L50,31 L76,55 V81 H24 Z" fill="none" stroke={OUTLINE} strokeWidth="2.6" strokeLinejoin="round" />
    </svg>
  )
}

export function CityIcon() {
  return (
    <svg {...props} aria-label="city">
      <ellipse cx="50" cy="87" rx="35" ry="6.5" fill={SHADOW} />
      {/* lower keep */}
      <path d="M18,52 H54 V83 H18 Z" fill="currentColor" />
      <path d="M38,52 H54 V83 H38 Z" fill={SHADE} />
      {/* keep roof */}
      <path d="M14,53 L36,34 L58,53 Z" fill="currentColor" />
      <path d="M36,34 L58,53 H36 Z" fill={SHADE} />
      {/* tower */}
      <path d="M56,40 H82 V83 H56 Z" fill="currentColor" />
      <path d="M70,40 H82 V83 H70 Z" fill={SHADE} />
      {/* crenellations on the tower */}
      <path d="M56,40 v-7 h6 v7 M68,40 v-7 h6 v7 M80,33 h2 v7" fill="currentColor" />
      <path d="M56,33 H82 V40 H56 Z" fill="currentColor" />
      <path d="M56,33 H62 V40 H56 Z M68,33 H74 V40 H68 Z M80,33 H82 V40 H80 Z" fill={HILITE} />
      {/* windows + door */}
      <rect x="64" y="50" width="7" height="9" rx="1" fill={OUTLINE} />
      <rect x="30" y="60" width="11" height="23" rx="1.5" fill={OUTLINE} />
      {/* outlines */}
      <path d="M18,52 H54 V83 H18 Z" fill="none" stroke={OUTLINE} strokeWidth="2.4" strokeLinejoin="round" />
      <path d="M56,40 H82 V83 H56 Z" fill="none" stroke={OUTLINE} strokeWidth="2.4" strokeLinejoin="round" />
      <path d="M14,53 L36,34 L58,53" fill="none" stroke={OUTLINE} strokeWidth="2.4" strokeLinejoin="round" />
    </svg>
  )
}

export function RoadIcon() {
  return (
    <svg {...props} aria-label="road">
      <g transform="rotate(-34 50 50)">
        <rect x="10" y="42" width="80" height="18" rx="5" fill={SHADOW} transform="translate(2 3)" />
        <rect x="10" y="42" width="80" height="18" rx="5" fill="currentColor" />
        <rect x="10" y="51" width="80" height="9" rx="5" fill={SHADE} />
        <rect x="10" y="43" width="80" height="5" rx="3" fill={HILITE} />
        <rect x="10" y="42" width="80" height="18" rx="5" fill="none" stroke={OUTLINE} strokeWidth="2.6" />
      </g>
    </svg>
  )
}
