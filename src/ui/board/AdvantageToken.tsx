/**
 * A physical advantage token — a turned-wood disc with a carved brass emblem.
 * Strength (crossed swords) and Trade (balance) are the two tokens that travel
 * between players. Pure vector so it scales/animates freely (milestone 4).
 */
export function AdvantageToken({
  kind,
  size = 54,
}: {
  kind: 'hero' | 'trade'
  size?: number
}) {
  const id = `tok-${kind}`
  return (
    <svg width={size} height={size} viewBox="0 0 60 60" className={`adv-token adv-${kind}`}>
      <defs>
        <radialGradient id={`${id}-wood`} cx="38%" cy="30%" r="80%">
          <stop offset="0" stopColor="#8a5e34" />
          <stop offset="1" stopColor="#4f3318" />
        </radialGradient>
        <radialGradient id={`${id}-face`} cx="40%" cy="32%" r="82%">
          <stop offset="0" stopColor="#e7c489" />
          <stop offset="0.7" stopColor="#c79a5a" />
          <stop offset="1" stopColor="#a87c3e" />
        </radialGradient>
      </defs>
      {/* drop, rim, recessed face */}
      <circle cx="30" cy="32" r="27" fill="rgba(0,0,0,0.35)" />
      <circle cx="30" cy="29" r="27" fill={`url(#${id}-wood)`} stroke="#3a2412" strokeWidth="1.5" />
      <circle cx="30" cy="29" r="21.5" fill={`url(#${id}-face)`} stroke="#7a5026" strokeWidth="1.5" />
      {kind === 'hero' ? (
        <g stroke="#4a2f17" strokeWidth="3" strokeLinecap="round" fill="none">
          <line x1="20" y1="40" x2="40" y2="18" />
          <line x1="40" y1="40" x2="20" y2="18" />
          <line x1="17" y1="40" x2="23" y2="40" />
          <line x1="37" y1="40" x2="43" y2="40" />
        </g>
      ) : (
        <g stroke="#4a2f17" strokeWidth="2.4" strokeLinecap="round" fill="none">
          <line x1="30" y1="16" x2="30" y2="40" />
          <line x1="18" y1="22" x2="42" y2="22" />
          <path d="M18 22 L13 32 L23 32 Z" fill="#4a2f17" stroke="none" />
          <path d="M42 22 L37 32 L47 32 Z" fill="#4a2f17" stroke="none" />
          <line x1="24" y1="40" x2="36" y2="40" />
        </g>
      )}
    </svg>
  )
}
