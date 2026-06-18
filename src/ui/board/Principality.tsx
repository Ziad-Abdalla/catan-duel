import type { PlayerId } from '../../types'
import { getCard } from '../../data/cards'
import { CenterArt } from '../CenterArt'
import { MiniCard } from './MiniCard'
import { RegionTile } from './RegionTile'
import { useGame } from '../../store/gameStore'

const FOUNDATION = new Set(['settlement', 'city', 'road'])

/**
 * One player's principality: the rotatable region tiles, the settlement/road
 * skeleton, and the building sites holding played cards. `top` mirrors the
 * vertical order so the opponent sits across the table.
 */
export function Principality({ player, top }: { player: PlayerId; top?: boolean }) {
  const p = useGame((s) => s.state.players[player])
  const dispatch = useGame((s) => s.dispatch)

  const foundations = p.placed
    .map((pc, i) => ({ pc, i, card: getCard(pc.cardId) }))
    .filter((x) => x.card && FOUNDATION.has(x.card.category))
  const buildings = p.placed
    .map((pc, i) => ({ pc, i, card: getCard(pc.cardId) }))
    .filter((x) => x.card && !FOUNDATION.has(x.card.category))

  const Regions = (
    <section className="pr-regions" key="regions">
      {p.regions.map((r, i) => (
        <RegionTile key={`${r.cardId}-${i}`} player={player} region={r} index={i} />
      ))}
    </section>
  )

  const Foundations = (
    <section className="pr-foundations" key="foundations">
      {foundations.map(({ card, i }) => (
        <div className="foundation" key={i}>
          <CenterArt card={card!} />
        </div>
      ))}
    </section>
  )

  const Buildings = (
    <section className="pr-buildings" key="buildings">
      {buildings.length === 0 && <span className="pr-empty">— no buildings or units in play —</span>}
      {buildings.map(({ card, i }) => (
        <MiniCard
          key={i}
          card={card!}
          popUp={top}
          actionLabel="↩ hand"
          onClick={() => dispatch({ type: 'returnToHand', player, placedIndex: i })}
        />
      ))}
    </section>
  )

  const order = top ? [Buildings, Foundations, Regions] : [Regions, Foundations, Buildings]
  return <div className={`principality${top ? ' top' : ''}`}>{order}</div>
}
