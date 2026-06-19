import type { Card } from '../../types'
import { cardArt } from '../../data/cards'
import { CenterArt } from '../CenterArt'
import { SettlementIcon, CityIcon, RoadIcon } from './PieceIcon'

/**
 * Renders a piece. The structural pieces (settlement / city / road) use crisp,
 * player-coloured icon tokens; other cards use their photo art, falling back to the
 * hand-drawn CenterArt SVG. Keeps the board clean and modern.
 */
export function PieceArt({ card, className = 'piece-art' }: { card: Card; className?: string }) {
  if (card.category === 'settlement') return <SettlementIcon />
  if (card.category === 'city') return <CityIcon />
  if (card.category === 'road') return <RoadIcon />
  const art = cardArt(card.id)
  if (art) return <img className={className} src={art} alt={card.name} loading="lazy" />
  return <CenterArt card={card} />
}
