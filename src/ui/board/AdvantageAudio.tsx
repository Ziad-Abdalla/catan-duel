import { useEffect, useRef } from 'react'
import type { PlayerId } from '../../types'
import { useGame } from '../../store/gameStore'
import { playSfx } from '../../audio/sfx'

type Holder = PlayerId | null

/**
 * Plays a satisfying chime whenever an advantage token (hero / trade) is GAINED by
 * a player, and a softer cue when one is lost. Renders nothing — it only watches the
 * synced state, so both screens chime together as the disc changes hands.
 */
export function AdvantageAudio() {
  const hero: Holder = useGame((s) => (s.state.players.p0.hasHeroToken ? 'p0' : s.state.players.p1.hasHeroToken ? 'p1' : null))
  const trade: Holder = useGame((s) => (s.state.players.p0.hasTradeToken ? 'p0' : s.state.players.p1.hasTradeToken ? 'p1' : null))
  const prev = useRef<{ hero: Holder; trade: Holder } | null>(null)

  useEffect(() => {
    const before = prev.current
    if (before) {
      const gained = (before.hero !== hero && hero) || (before.trade !== trade && trade)
      const lostOnly = !gained && ((before.hero !== hero && !hero) || (before.trade !== trade && !trade))
      if (gained) playSfx('token') // success chime for the new holder
      else if (lostOnly) playSfx('flip') // softer cue when an advantage is given up
    }
    prev.current = { hero, trade }
  }, [hero, trade])

  return null
}
