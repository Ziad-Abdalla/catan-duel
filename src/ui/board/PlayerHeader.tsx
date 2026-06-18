import { useEffect, useRef, useState } from 'react'
import type { PlayerId } from '../../types'
import { useGame } from '../../store/gameStore'

/** Name + victory points (with manual ± nudge) + advantage markers for one player. */
export function PlayerHeader({ player }: { player: PlayerId }) {
  const p = useGame((s) => s.state.players[player])
  const active = useGame((s) => s.state.activePlayer) === player
  const dispatch = useGame((s) => s.dispatch)

  // pulse the VP number whenever it changes
  const [bump, setBump] = useState(false)
  const prevVP = useRef(p.victoryPoints)
  useEffect(() => {
    if (prevVP.current !== p.victoryPoints) {
      prevVP.current = p.victoryPoints
      setBump(true)
    }
  }, [p.victoryPoints])

  return (
    <header className={`ph${active ? ' active' : ''}`}>
      <div className="ph-id">
        <span className="ph-dot" />
        <span className="ph-name">{p.name}</span>
        {active && <span className="ph-turn">● your turn</span>}
      </div>

      <div className="ph-vp" title="Victory points (auto from board + manual nudge). Win at 7.">
        <button className="vp-btn" aria-label="decrease VP" onClick={() => dispatch({ type: 'adjustVP', player, delta: -1 })}>
          −
        </button>
        <span className={`vp-num${bump ? ' bump' : ''}`} onAnimationEnd={() => setBump(false)}>
          {p.victoryPoints}
        </span>
        <span className="vp-cap">/ 7 VP</span>
        <button className="vp-btn" aria-label="increase VP" onClick={() => dispatch({ type: 'adjustVP', player, delta: +1 })}>
          +
        </button>
      </div>

      <div className="ph-tokens">
        {p.hasHeroToken && <span className="token token-hero" title="Strength advantage">⚔ Strength</span>}
        {p.hasTradeToken && <span className="token token-trade" title="Trade advantage">⚖ Trade</span>}
        <span className="ph-hand" title="Cards in hand">🂠 {p.hand.length}</span>
      </div>
    </header>
  )
}
