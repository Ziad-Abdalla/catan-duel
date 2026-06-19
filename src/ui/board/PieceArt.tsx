import type { Card } from '../../types'
import { cardArt } from '../../data/cards'
import { CenterArt } from '../CenterArt'

/**
 * Renders a piece's photo art when one exists (settlements/cities/roads/regions now
 * resolve to assets/buildings + assets/regions), falling back to the hand-drawn
 * CenterArt SVG. Keeps the board consistent with the card gallery.
 */
export function PieceArt({ card, className = 'piece-art' }: { card: Card; className?: string }) {
  const art = cardArt(card.id)
  if (art) return <img className={className} src={art} alt={card.name} loading="lazy" />
  return <CenterArt card={card} />
}
