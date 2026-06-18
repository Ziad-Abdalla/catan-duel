import type { Card, ResourceType } from '../types'
import './center.css'

export const CENTER_CATEGORIES = ['region', 'settlement', 'city', 'road'] as const

const SVG_PROPS = {
  className: 'ctr-svg',
  viewBox: '0 0 100 100',
  preserveAspectRatio: 'xMidYMid slice',
} as const

function Forest() {
  const trees: [number, number, number][] = [
    [16, 72, 1], [33, 64, 1.3], [50, 74, 1.1], [67, 63, 1.35], [84, 73, 1], [25, 82, 0.9], [76, 84, 0.95],
  ]
  return (
    <svg {...SVG_PROPS}>
      <defs>
        <linearGradient id="f-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#dcebb6" />
          <stop offset="1" stopColor="#7aa257" />
        </linearGradient>
      </defs>
      <rect width="100" height="100" fill="url(#f-sky)" />
      <ellipse cx="50" cy="86" rx="78" ry="26" fill="#456827" />
      {trees.map(([x, y, s], i) => (
        <g key={i} transform={`translate(${x} ${y}) scale(${s})`}>
          <rect x="-1.8" y="0" width="3.6" height="9" fill="#6b4226" />
          <polygon points="0,-21 -10,2 10,2" fill="#3c6531" />
          <polygon points="0,-14 -8.5,5 8.5,5" fill="#4d7c3e" />
          <polygon points="0,-8 -7,8 7,8" fill="#5d8c4a" />
        </g>
      ))}
    </svg>
  )
}

function Mountains() {
  return (
    <svg {...SVG_PROPS}>
      <defs>
        <linearGradient id="m-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#d6dbe6" />
          <stop offset="1" stopColor="#8d96a8" />
        </linearGradient>
      </defs>
      <rect width="100" height="100" fill="url(#m-sky)" />
      <polygon points="-5,100 26,34 60,100" fill="#7c8698" />
      <polygon points="26,34 39,58 14,58" fill="#f4f6fa" />
      <polygon points="42,100 70,28 100,100" fill="#90899a" />
      <polygon points="70,28 82,52 58,52" fill="#eef0f6" />
      <polygon points="-2,100 12,62 30,100" fill="#6c7587" />
      <ellipse cx="32" cy="93" rx="9" ry="4" fill="#5a6172" />
      <ellipse cx="70" cy="95" rx="11" ry="4.5" fill="#525a6b" />
    </svg>
  )
}

function Hills() {
  return (
    <svg {...SVG_PROPS}>
      <defs>
        <linearGradient id="h-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#f2d3a3" />
          <stop offset="1" stopColor="#c06a35" />
        </linearGradient>
      </defs>
      <rect width="100" height="100" fill="url(#h-sky)" />
      <path d="M-5,70 Q25,48 55,68 T110,64 V110 H-5 Z" fill="#b5562a" />
      <path d="M-5,86 Q30,66 62,84 T110,82 V110 H-5 Z" fill="#9d4622" />
      <g transform="translate(60 66)">
        <rect x="0" y="0" width="7" height="4" fill="#a83a26" stroke="#7d2a18" strokeWidth="0.5" />
        <rect x="8" y="0" width="7" height="4" fill="#bb4a30" stroke="#7d2a18" strokeWidth="0.5" />
        <rect x="4" y="-4" width="7" height="4" fill="#b34228" stroke="#7d2a18" strokeWidth="0.5" />
      </g>
    </svg>
  )
}

function Pasture() {
  const sheep: [number, number, number][] = [[30, 58, 1], [60, 70, 1.2], [44, 82, 1.05]]
  return (
    <svg {...SVG_PROPS}>
      <defs>
        <linearGradient id="p-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#d6e6a6" />
          <stop offset="1" stopColor="#7fa84e" />
        </linearGradient>
      </defs>
      <rect width="100" height="100" fill="url(#p-sky)" />
      <ellipse cx="50" cy="92" rx="80" ry="20" fill="#6c9540" />
      {sheep.map(([x, y, s], i) => (
        <g key={i} transform={`translate(${x} ${y}) scale(${s})`}>
          <ellipse cx="0" cy="0" rx="9" ry="6.5" fill="#f3f1e7" />
          <ellipse cx="-9" cy="-1" rx="3.2" ry="3.6" fill="#4a4036" />
          <rect x="-4" y="5" width="1.6" height="4" fill="#4a4036" />
          <rect x="3" y="5" width="1.6" height="4" fill="#4a4036" />
        </g>
      ))}
    </svg>
  )
}

function Fields() {
  return (
    <svg {...SVG_PROPS}>
      <defs>
        <linearGradient id="g-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#efdca6" />
          <stop offset="0.55" stopColor="#cf9f3e" />
          <stop offset="1" stopColor="#9a7d35" />
        </linearGradient>
      </defs>
      <rect width="100" height="100" fill="url(#g-sky)" />
      {[20, 38, 56, 74, 92].map((y, i) => (
        <path key={i} d={`M-5,${y} Q50,${y - 7} 105,${y}`} stroke="#bd8a2a" strokeWidth="2.4" fill="none" opacity="0.7" />
      ))}
      {[[28, 60], [50, 70], [72, 60]].map(([x, y], i) => (
        <g key={i} transform={`translate(${x} ${y})`} stroke="#8a6418" strokeWidth="1.4" strokeLinecap="round">
          <line x1="0" y1="0" x2="0" y2="-16" />
          <line x1="0" y1="-10" x2="-5" y2="-18" />
          <line x1="0" y1="-10" x2="5" y2="-18" />
        </g>
      ))}
    </svg>
  )
}

function GoldField() {
  return (
    <svg {...SVG_PROPS}>
      <defs>
        <linearGradient id="o-land" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#caa86a" />
          <stop offset="1" stopColor="#8a6a3a" />
        </linearGradient>
      </defs>
      <rect width="100" height="100" fill="url(#o-land)" />
      <path d="M44,-5 Q52,40 40,70 Q34,90 50,110 L66,110 Q58,80 64,55 Q70,30 60,-5 Z" fill="#5fa9d6" />
      <path d="M46,8 Q54,42 44,68" stroke="#bfe2f4" strokeWidth="2" fill="none" opacity="0.8" />
      {[[22, 40], [78, 36], [30, 78], [74, 74], [50, 20]].map(([x, y], i) => (
        <circle key={i} cx={x} cy={y} r="3.4" fill="#f1c84a" stroke="#b78a1e" strokeWidth="0.7" />
      ))}
    </svg>
  )
}

function Settlement() {
  return (
    <svg {...SVG_PROPS}>
      <defs>
        <linearGradient id="s-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#cfe3ad" />
          <stop offset="1" stopColor="#6f9a52" />
        </linearGradient>
      </defs>
      <rect width="100" height="100" fill="url(#s-sky)" />
      <ellipse cx="50" cy="94" rx="80" ry="20" fill="#5d8742" />
      <g transform="translate(50 56)">
        <rect x="-18" y="0" width="36" height="26" fill="#e0c08c" stroke="#7d5a32" strokeWidth="1.2" />
        <polygon points="-23,2 0,-20 23,2" fill="#9b4a28" stroke="#6e3318" strokeWidth="1.2" />
        <rect x="-6" y="9" width="12" height="17" fill="#7d5226" />
        <rect x="-14" y="6" width="8" height="8" fill="#b9d4e6" stroke="#6e3318" strokeWidth="0.8" />
        <rect x="6" y="6" width="8" height="8" fill="#b9d4e6" stroke="#6e3318" strokeWidth="0.8" />
      </g>
    </svg>
  )
}

function City() {
  return (
    <svg {...SVG_PROPS}>
      <defs>
        <linearGradient id="c-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#f3e3b0" />
          <stop offset="1" stopColor="#cdaa5e" />
        </linearGradient>
      </defs>
      <rect width="100" height="100" fill="url(#c-sky)" />
      <ellipse cx="50" cy="95" rx="82" ry="18" fill="#9c7a3c" />
      <g stroke="#6e5526" strokeWidth="1.1">
        <rect x="20" y="44" width="14" height="42" fill="#cdb98e" />
        <rect x="66" y="44" width="14" height="42" fill="#cdb98e" />
        <rect x="32" y="56" width="36" height="30" fill="#c2ad7e" />
        {[20, 26, 32, 66, 72, 78, 32, 38, 44, 56, 62].map((x, i) => (
          <rect key={i} x={x} y={i < 6 ? 40 : 52} width="4" height="4" fill="#cdb98e" />
        ))}
        <rect x="44" y="68" width="12" height="18" fill="#6e4a22" />
      </g>
      <g transform="translate(27 44)">
        <line x1="0" y1="0" x2="0" y2="-12" stroke="#6e5526" strokeWidth="1" />
        <polygon points="0,-12 12,-9 0,-5" fill="#8b2e2e" />
      </g>
    </svg>
  )
}

function Road() {
  return (
    <svg {...SVG_PROPS}>
      <defs>
        <linearGradient id="r-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#cfe3ad" />
          <stop offset="1" stopColor="#6f9a52" />
        </linearGradient>
      </defs>
      <rect width="100" height="100" fill="url(#r-sky)" />
      <path d="M30,108 Q20,70 50,52 Q80,34 70,-8" stroke="#a07a48" strokeWidth="26" fill="none" />
      <path d="M30,108 Q20,70 50,52 Q80,34 70,-8" stroke="#8a6238" strokeWidth="26" fill="none" opacity="0.35" />
      <path d="M30,108 Q20,70 50,52 Q80,34 70,-8" stroke="#efe3c4" strokeWidth="2.4" strokeDasharray="5 7" fill="none" />
    </svg>
  )
}

function Scene({ card }: { card: Card }) {
  if (card.category === 'region') {
    switch (card.region_resource) {
      case 'lumber': return <Forest />
      case 'ore': return <Mountains />
      case 'brick': return <Hills />
      case 'wool': return <Pasture />
      case 'grain': return <Fields />
      case 'gold': return <GoldField />
    }
  }
  if (card.category === 'settlement') return <Settlement />
  if (card.category === 'city') return <City />
  if (card.category === 'road') return <Road />
  return null
}

// Real Catan terrain art (sourced online, painterly hex scans) for region tiles, by produced resource.
const regionArtModules = import.meta.glob('../assets/regions/*.webp', {
  eager: true,
  import: 'default',
}) as Record<string, string>
function regionArt(resource: ResourceType): string | undefined {
  return regionArtModules[`../assets/regions/${resource}.webp`]
}

/** Small inline icon of a produced resource — used for the 0–3 storage on region tiles. */
export function ResourceIcon({ resource }: { resource: ResourceType }) {
  switch (resource) {
    case 'lumber':
      return (
        <svg viewBox="0 0 20 20" className="res-ic">
          <rect x="2" y="7" width="16" height="7" rx="3" fill="#8a5a2e" stroke="#5e3a18" strokeWidth="1" />
          <ellipse cx="5" cy="10.5" rx="2.4" ry="3" fill="#b58a55" stroke="#5e3a18" strokeWidth="0.6" />
        </svg>
      )
    case 'brick':
      return (
        <svg viewBox="0 0 20 20" className="res-ic">
          <rect x="2.5" y="6" width="15" height="8" rx="1" fill="#b5562a" stroke="#7d3318" strokeWidth="1" />
          <line x1="10" y1="6" x2="10" y2="14" stroke="#7d3318" strokeWidth="0.8" />
          <line x1="2.5" y1="10" x2="17.5" y2="10" stroke="#7d3318" strokeWidth="0.8" />
        </svg>
      )
    case 'wool':
      return (
        <svg viewBox="0 0 20 20" className="res-ic">
          <g fill="#f4f2ea" stroke="#bdb6a2" strokeWidth="0.7">
            <circle cx="7" cy="11.5" r="3.3" />
            <circle cx="11" cy="9" r="3.6" />
            <circle cx="13.6" cy="12" r="3" />
            <circle cx="9.6" cy="13" r="3.3" />
          </g>
        </svg>
      )
    case 'grain':
      // Wheat: a warm amber-tan head of grain with kernels — deliberately NOT a
      // round yellow coin, so it never reads as Gold.
      return (
        <svg viewBox="0 0 20 20" className="res-ic">
          <line x1="10" y1="18" x2="10" y2="9" stroke="#8a6418" strokeWidth="1.2" strokeLinecap="round" />
          {[0, 1, 2, 3].map((i) => {
            const y = 4 + i * 2.6
            return (
              <g key={i} fill="#d9a637" stroke="#a9781b" strokeWidth="0.5">
                <ellipse cx={10 - 2.6} cy={y + 1} rx="1.7" ry="2.5" transform={`rotate(-28 ${10 - 2.6} ${y + 1})`} />
                <ellipse cx={10 + 2.6} cy={y + 1} rx="1.7" ry="2.5" transform={`rotate(28 ${10 + 2.6} ${y + 1})`} />
              </g>
            )
          })}
          <ellipse cx="10" cy="4.5" rx="1.6" ry="2.6" fill="#e6b94d" stroke="#a9781b" strokeWidth="0.5" />
        </svg>
      )
    case 'ore':
      return (
        <svg viewBox="0 0 20 20" className="res-ic">
          <polygon points="4,13 8,6 14,6 17,12 11,16 6,15" fill="#8a93a3" stroke="#5a6172" strokeWidth="1" />
          <polygon points="8,6 14,6 11,10.5" fill="#aab2bf" />
        </svg>
      )
    case 'gold':
      return (
        <svg viewBox="0 0 20 20" className="res-ic">
          <circle cx="10" cy="10" r="6.2" fill="#f1c84a" stroke="#b78a1e" strokeWidth="1.2" />
          <ellipse cx="8" cy="8" rx="2.1" ry="1.4" fill="#fbe9a8" opacity="0.85" />
        </svg>
      )
  }
}

/**
 * Hand-drawn SVG visuals for the foundation cards (no good photo art exists online).
 * Region tiles are reused by the board as the interactive production tiles.
 */
export function CenterArt({
  card,
  number,
  stored,
}: {
  card: Card
  number?: number | null
  stored?: number
}) {
  const n = card.category === 'region' ? (number ?? card.region_number ?? null) : null
  const img =
    card.category === 'region' && card.region_resource ? regionArt(card.region_resource) : undefined
  return (
    <div className={`ctr ctr-${card.category}`}>
      {img ? <img className="ctr-img" src={img} alt={card.name} /> : <Scene card={card} />}
      {n != null && (
        <div className="ctr-die" title="Production number">
          {n}
        </div>
      )}
      {card.category === 'region' && card.region_resource && (
        <div className="ctr-store" aria-label={`${stored ?? 0} of 3 ${card.region_resource} stored`}>
          {[0, 1, 2].map((i) => (
            <span key={i} className={`res-slot ${i < (stored ?? 0) ? 'on' : ''}`}>
              <ResourceIcon resource={card.region_resource!} />
            </span>
          ))}
        </div>
      )}
      {card.category === 'settlement' && <div className="ctr-vp">1 VP</div>}
      {card.category === 'city' && <div className="ctr-vp">2 VP</div>}
      <div className="ctr-label">{card.name}</div>
    </div>
  )
}
