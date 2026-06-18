import type { PlayerId } from '../../types'
import { getCard, cardArt } from '../../data/cards'
import { useGame } from '../../store/gameStore'
import { useUI } from '../../store/uiStore'

/**
 * The active player's hand, fanned along the bottom edge. Tap a card to enlarge
 * it (readable rules text + play/exchange); or drag it onto a building site to
 * place it directly.
 */
export function Hand({ player }: { player: PlayerId }) {
  const hand = useGame((s) => s.state.players[player].hand)
  const { setDrag, openZoom } = useUI()

  return (
    <>
      <div className="hand-toolbar">
        <span>Hand · {hand.length} — tap a card to read &amp; play it, or drag it onto a building site</span>
      </div>
      <div className="hand-fan" id="hand-target">
        {hand.length === 0 && <span className="hand-empty">— empty hand —</span>}
        {hand.map((id, i) => {
          const card = getCard(id)
          const art = card ? cardArt(card.id) : undefined
          if (!card) return null
          return (
            <div
              key={`${id}-${i}`}
              className="hand-card"
              title={`${card.name} — tap to enlarge`}
              draggable
              onDragStart={(e) => {
                e.dataTransfer.setData('text/cardid', id)
                e.dataTransfer.effectAllowed = 'move'
                setDrag(id)
              }}
              onDragEnd={() => setDrag(null)}
              onClick={() => openZoom({ cardId: id, from: 'hand', player })}
            >
              {art ? <img src={art} alt={card.name} loading="lazy" /> : <span>{card.name}</span>}
            </div>
          )
        })}
      </div>
    </>
  )
}
