import { useEffect, useRef, useState } from 'react'
import type { PlayerId } from '../../types'
import { AdvantageToken } from './AdvantageToken'
import { useGame } from '../../store/gameStore'
import { playSfx } from '../../audio/sfx'

const KEY = { hero: 'hasHeroToken', trade: 'hasTradeToken' } as const

function useAdvantage(kind: 'hero' | 'trade') {
  const dispatch = useGame((s) => s.dispatch)
  const k = KEY[kind]
  const holder: PlayerId | null = useGame((s) => (s.state.players.p0[k] ? 'p0' : s.state.players.p1[k] ? 'p1' : null))
  const p0 = useGame((s) => s.state.players.p0.name)
  const p1 = useGame((s) => s.state.players.p1.name)
  const choose = (next: PlayerId | null) => dispatch({ type: 'setToken', player: next, token: kind })
  return { holder, p0, p1, choose }
}

/** The pop-up list of choices (Player 1 · Center · Player 2). */
function TokenMenu({ kind, onClose }: { kind: 'hero' | 'trade'; onClose: () => void }) {
  const { holder, p0, p1, choose } = useAdvantage(kind)
  const pick = (next: PlayerId | null) => {
    choose(next)
    onClose()
  }
  return (
    <div className="adv-menu" role="menu">
      <button className={holder === 'p0' ? 'on' : ''} onClick={() => pick('p0')}>{p0}</button>
      <button className={holder === null ? 'on' : ''} onClick={() => pick(null)}>Center</button>
      <button className={holder === 'p1' ? 'on' : ''} onClick={() => pick('p1')}>{p1}</button>
    </div>
  )
}

/**
 * The compact control in the central wall. It is the always-available place to
 * reassign the advantage (click → choices). When the advantage is unowned the
 * disc lives HERE (centre); when a player holds it the disc sits on that player's
 * plate instead, and this shows a faint marker with the holder's name.
 */
export function AdvantageControl({ kind, label }: { kind: 'hero' | 'trade'; label: string }) {
  const { holder, p0, p1 } = useAdvantage(kind)
  const [open, setOpen] = useState(false)
  const held = holder !== null
  return (
    <div className={`advctl${held ? ' held' : ''}`}>
      <button className="advctl-btn" onClick={() => setOpen((o) => !o)} title={`${label} advantage`} aria-haspopup="true" aria-expanded={open}>
        <span className="advctl-disc"><AdvantageToken kind={kind} size={34} /></span>
      </button>
      <span className="advctl-label">{held ? (holder === 'p0' ? p0 : p1) : label}</span>
      {open && <TokenMenu kind={kind} onClose={() => setOpen(false)} />}
    </div>
  )
}

/**
 * The disc as it sits on a player's plate — rendered only on the holder's plate,
 * popping in when the advantage arrives. Clicking it also opens the choices.
 */
export function PlateToken({ kind, player }: { kind: 'hero' | 'trade'; player: PlayerId }) {
  const { holder } = useAdvantage(kind)
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLSpanElement>(null)
  const mine = holder === player

  useEffect(() => {
    if (mine && ref.current) {
      ref.current.animate(
        [
          { transform: 'translateY(-22px) scale(1.4) rotate(-12deg)', opacity: 0 },
          { transform: 'translateY(0) scale(1) rotate(0)', opacity: 1 },
        ],
        { duration: 460, easing: 'cubic-bezier(.5,1.4,.4,1)' },
      )
      playSfx('token')
    }
    // run once when this player becomes the holder
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mine])

  if (!mine) return null
  return (
    <span className="plate-token">
      <button className="plate-token-btn" onClick={() => setOpen((o) => !o)} title="Reassign advantage">
        <span ref={ref} className="advctl-disc"><AdvantageToken kind={kind} size={34} /></span>
      </button>
      {open && <TokenMenu kind={kind} onClose={() => setOpen(false)} />}
    </span>
  )
}
