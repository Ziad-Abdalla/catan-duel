import { useState } from 'react'
import type { PlayerId } from '../../types'
import { getCard } from '../../data/cards'
import { MiniCard } from './MiniCard'
import { useGame } from '../../store/gameStore'
import { useUI } from '../../store/uiStore'
import { SET_LABEL, setOfStack } from './deckmeta'

/**
 * The active player's hand. Select a card, then play it into the in-play area or
 * exchange it back under a draw stack (replenish/exchange phase). Trust-based:
 * nothing is blocked, the toolbar just makes the legal moves convenient.
 */
export function HandView({ player }: { player: PlayerId }) {
  const hand = useGame((s) => s.state.players[player].hand)
  const drawStacks = useGame((s) => s.state.drawStacks)
  const dispatch = useGame((s) => s.dispatch)
  const payCosts = useUI((s) => s.payCosts)
  const [selected, setSelected] = useState<number | null>(null)

  const sel = selected != null ? hand[selected] : undefined
  const selCard = sel ? getCard(sel) : undefined

  const clear = () => setSelected(null)

  return (
    <div className="hand">
      <div className="hand-bar">
        <span className="hand-title">Hand · {hand.length}</span>
        {selCard ? (
          <div className="hand-actions">
            <span className="hand-sel">{selCard.name}</span>
            <button
              className="btn"
              title={payCosts ? 'Play and spend its cost' : 'Place for free (auto-pay is off)'}
              onClick={() => {
                // Honour the global auto-pay toggle (manual sandbox: turn it off for free placement).
                dispatch({ type: 'playCard', player, cardId: sel!, pay: payCosts })
                clear()
              }}
            >
              ▶ Play
            </button>
            <span className="hand-x-label">Exchange under stack:</span>
            {drawStacks.map((st, i) => (
              <button
                key={i}
                className="btn btn-sm"
                title={`Put under draw stack ${i + 1} (${SET_LABEL[setOfStack(st)]})`}
                onClick={() => {
                  dispatch({ type: 'discardToStack', player, cardId: sel!, stackIndex: i })
                  clear()
                }}
              >
                {i + 1}
              </button>
            ))}
            <button className="btn btn-ghost" onClick={clear}>
              ✕
            </button>
          </div>
        ) : (
          <span className="hand-hint">Select a card to play or exchange</span>
        )}
      </div>
      <div className="hand-cards">
        {hand.length === 0 && <span className="pr-empty">— empty hand —</span>}
        {hand.map((id, i) => {
          const card = getCard(id)
          if (!card) return null
          return (
            <MiniCard
              key={`${id}-${i}`}
              card={card}
              selected={selected === i}
              onClick={() => setSelected(selected === i ? null : i)}
            />
          )
        })}
      </div>
    </div>
  )
}
