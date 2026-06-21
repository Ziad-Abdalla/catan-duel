import { useEffect, useRef, useState } from 'react'
import type { MarkerId, PlayerId, SetId, Stat } from '../../types'
import { PlateToken } from './TokenLayer'
import { computeStats, suggestAdvantage } from '../../engine/actions'
import { useGame } from '../../store/gameStore'
import { useUI } from '../../store/uiStore'
import { playSfx } from '../../audio/sfx'

// crest options cycled by clicking the avatar — a quick, fun identity, no assets needed
const AVATARS = ['🦁', '🐉', '🦅', '🐺', '🐗', '🦊', '🦌', '🐻', '🦉', '🏰', '👑', '⚔️', '🛡️', '🏹', '🐎', '🦄']

const STAT_META: { key: Stat; glyph: string; title: string }[] = [
  { key: 'strength', glyph: '⚔', title: 'Strength' },
  { key: 'skill', glyph: '✦', title: 'Skill' },
  { key: 'commerce', glyph: '⚖', title: 'Commerce' },
  { key: 'progress', glyph: '⚙', title: 'Progress' },
]

// Age of Enlightenment point types — shown on the plate only when a player has any
const EXTRA_STAT_META: { key: 'wisdom' | 'contentment' | 'sail' | 'cannon'; glyph: string; title: string }[] = [
  { key: 'wisdom', glyph: '🦉', title: 'Wisdom (owls)' },
  { key: 'contentment', glyph: '★', title: 'Contentment (stars)' },
  { key: 'sail', glyph: '⛵', title: 'Sail points' },
  { key: 'cannon', glyph: '💣', title: 'Cannon points' },
]

// Rotating marker-card tracks, surfaced when their expansion set is in play. Trust-based:
// the ±buttons rotate the level; the card's printed art defines what each level grants.
const MARKER_META: { id: MarkerId; set: SetId; label: string; glyph: string }[] = [
  { id: 'triumph', set: 'barbarians', label: 'Triumph', glyph: '🏆' },
  { id: 'manifesto', set: 'sages', label: 'Manifesto', glyph: '📜' },
  { id: 'publicFeeling', set: 'prosperity', label: 'Public Feeling', glyph: '🌡' },
]

/** A player's plaque (slim horizontal bar): colour identity, name, held advantage
 *  tokens, turn marker, derived stat tallies, and VP with a ± nudge. */
export function PlayerPlate({ player }: { player: PlayerId }) {
  const p = useGame((s) => s.state.players[player])
  const state = useGame((s) => s.state)
  const active = state.activePlayer === player
  const dispatch = useGame((s) => s.dispatch)
  const stats = computeStats(p)
  const suggest = suggestAdvantage(state)
  const accent = player === 'p0' ? 'var(--p0)' : 'var(--p1)'
  const cued = useUI((s) => s.negativeCue === player)

  const [bump, setBump] = useState(false)
  const prevVP = useRef(p.victoryPoints)
  useEffect(() => {
    if (prevVP.current !== p.victoryPoints) {
      prevVP.current = p.victoryPoints
      setBump(true) // the build/play already made its own sound; VP just bumps visually
    }
  }, [p.victoryPoints])

  return (
    <div className={`player-plate${active ? ' active' : ''}${cued ? ' cued-negative' : ''}`} style={{ ['--pc-accent' as string]: accent }}>
      <button
        className="plate-avatar"
        title="Click to change your crest"
        aria-label="Change crest"
        onClick={() => {
          const cur = p.avatar ?? AVATARS[0]
          const next = AVATARS[(AVATARS.indexOf(cur) + 1) % AVATARS.length]
          dispatch({ type: 'setAvatar', player, avatar: next })
          playSfx('ui')
        }}
      >
        {p.avatar ?? AVATARS[0]}
      </button>
      <input
        className="plate-name"
        value={p.name}
        aria-label="Player name"
        title="Click to rename"
        placeholder="Your name"
        onChange={(e) => dispatch({ type: 'renamePlayer', player, name: e.target.value })}
        onFocus={(e) => e.target.select()}
        maxLength={18}
      />
      <span className="plate-turn">{active ? '● your turn' : ''}</span>
      <div className="plate-stats" aria-label="Derived tallies">
        {STAT_META.map(({ key, glyph, title }) => {
          const lead =
            (key === 'strength' && suggest.hero === player) ||
            (key === 'commerce' && suggest.trade === player)
          return (
            <span key={key} className={`plate-stat${lead ? ' lead' : ''}`} title={`${title}: ${stats[key]}${lead ? ' — leads (advantage suggested)' : ''}`}>
              <i>{glyph}</i>
              {stats[key]}
            </span>
          )
        })}
      </div>
      {EXTRA_STAT_META.some(({ key }) => stats[key] > 0) && (
        <div className="plate-stats plate-stats-extra" aria-label="Expansion point tallies">
          {EXTRA_STAT_META.filter(({ key }) => stats[key] > 0).map(({ key, glyph, title }) => (
            <span key={key} className="plate-stat" title={`${title}: ${stats[key]}`}>
              <i>{glyph}</i>
              {stats[key]}
            </span>
          ))}
        </div>
      )}
      {MARKER_META.some(({ set }) => state.enabledSets.includes(set)) && (
        <div className="plate-markers" aria-label="Marker tracks">
          {MARKER_META.filter(({ set }) => state.enabledSets.includes(set)).map(({ id, label, glyph }) => {
            const lvl = p.markers?.[id] ?? 0
            return (
              <span key={id} className="plate-marker" title={`${label} — level ${lvl} (rotate per the card)`}>
                <button className="plate-mk-btn" aria-label={`lower ${label}`} onClick={() => { dispatch({ type: 'setMarker', player, marker: id, level: lvl - 1 }); playSfx('ui') }}>−</button>
                <i>{glyph}</i>
                <b>{lvl}</b>
                <button className="plate-mk-btn" aria-label={`raise ${label}`} onClick={() => { dispatch({ type: 'setMarker', player, marker: id, level: lvl + 1 }); playSfx('vp') }}>+</button>
              </span>
            )
          })}
        </div>
      )}
      <div className="plate-tokens">
        <PlateToken kind="hero" player={player} />
        <PlateToken kind="trade" player={player} />
      </div>
      <div className="plate-keytally" title="Attack (strength) · Commerce — these win the advantage tokens">
        <span className={`kt kt-att${suggest.hero === player ? ' kt-lead' : ''}`}>⚔ {stats.strength}</span>
        <span className={`kt kt-com${suggest.trade === player ? ' kt-lead' : ''}`}>⚖ {stats.commerce}</span>
      </div>
      <div className="plate-vprow">
        <button className="plate-vpbtn" aria-label="decrease VP" onClick={() => { dispatch({ type: 'adjustVP', player, delta: -1 }); playSfx('ui') }}>
          {'−'}
        </button>
        <span className={`plate-vp${bump ? ' bump' : ''}`} onAnimationEnd={() => setBump(false)}>
          {p.victoryPoints}
          <small>/{state.winThreshold}</small>
        </span>
        <button className="plate-vpbtn" aria-label="increase VP" onClick={() => { dispatch({ type: 'adjustVP', player, delta: +1 }); playSfx('vp') }}>
          +
        </button>
      </div>
    </div>
  )
}
