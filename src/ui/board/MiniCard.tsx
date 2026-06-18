import type { Card } from '../../types'
import { cardArt } from '../../data/cards'
import { CardView } from '../CardView'
import { CenterArt } from '../CenterArt'

/**
 * Compact in-play / in-hand card. Shows a thumbnail + name; on hover or keyboard
 * focus it reveals the full verbatim card (rules text) in a floating panel.
 */
export function MiniCard({
  card,
  onClick,
  selected,
  actionLabel,
  popUp,
}: {
  card: Card
  onClick?: () => void
  selected?: boolean
  actionLabel?: string
  /** render the detail popover above the card instead of below (for top row) */
  popUp?: boolean
}) {
  const art = cardArt(card.id)
  const isCenter = ['region', 'settlement', 'city', 'road'].includes(card.category)
  return (
    <div
      className={`mini${selected ? ' selected' : ''}`}
      tabIndex={0}
      role={onClick ? 'button' : undefined}
      onClick={onClick}
      onKeyDown={(e) => {
        if (onClick && (e.key === 'Enter' || e.key === ' ')) {
          e.preventDefault()
          onClick()
        }
      }}
    >
      <div className="mini-art">
        {art ? (
          <img src={art} alt={card.name} loading="lazy" />
        ) : isCenter ? (
          <CenterArt card={card} />
        ) : (
          <span className="mini-ph">{card.category}</span>
        )}
      </div>
      <span className="mini-name">{card.name}</span>
      {actionLabel && <span className="mini-action">{actionLabel}</span>}
      <div className={`mini-pop${popUp ? ' up' : ''}`} role="tooltip">
        <CardView card={card} />
      </div>
    </div>
  )
}
