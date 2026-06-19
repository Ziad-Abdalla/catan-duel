import { useState, type CSSProperties } from 'react'
import type { PlacedCard, PlayerId } from '../../types'
import { getCard, cardArt } from '../../data/cards'
import { PieceArt } from './PieceArt'
import { RegionTile } from './RegionTile'
import { useGame } from '../../store/gameStore'
import { useUI } from '../../store/uiStore'
import { playSfx } from '../../audio/sfx'

/**
 * One player's principality, laid out like the real table. The spine alternates
 * settlement — road — settlement. There are N+1 ROAD SLOTS (one at each end + one
 * between each pair of settlements); every road slot carries a region card ABOVE
 * and BELOW it, so the regions sit DIAGONALLY to the settlements. Each settlement
 * carries building sites above & below it.
 *
 * Grid: 2N+1 equal columns. Odd columns (1,3,5…) are road slots → regions; even
 * columns (2,4…) are settlements → buildings. Three rows: above / spine / below.
 */
export function PrincipalityBoard({
  player,
  flipped,
  interactive,
}: {
  player: PlayerId
  flipped?: boolean
  interactive?: boolean
}) {
  const p = useGame((s) => s.state.players[player])
  const dispatch = useGame((s) => s.dispatch)
  const { dragBuild, setDragRemove, clear } = useUI()

  const spine = p.placed.map((pc, i) => ({ pc, i, card: getCard(pc.cardId) })).filter((x) => x.card)
  const seats = spine.filter((x) => x.card!.category === 'settlement' || x.card!.category === 'city')
  const roads = spine.filter((x) => x.card!.category === 'road')
  const buildings = spine.filter((x) => !['settlement', 'city', 'road'].includes(x.card!.category))

  const N = Math.max(2, seats.length)
  const cols = 2 * N + 1 // N+1 road-slot columns (odd) + N settlement columns (even)
  const roadSlotCol = (i: number) => 2 * i + 1 // road slot i: 0..N
  const seatCol = (j: number) => 2 * j + 2 // settlement j: 0..N-1
  // roads carry their road-slot index in the slot string `road-{i}`
  const roadSlotIndex = (pc: PlacedCard) => {
    const m = /^road-(\d+)$/.exec(pc.slot ?? '')
    return m ? Number(m[1]) : 1
  }
  const filledRoadSlots = new Set(roads.map((r) => roadSlotIndex(r.pc)))
  // a road in an END slot (0 or N) is a frontier — you can drop a settlement past it
  const extendLeft = interactive && filledRoadSlots.has(0)
  const extendRight = interactive && filledRoadSlots.has(N)

  // rows: 1 = above, 2 = spine, 3 = below (flipped swaps above/below)
  const aboveRow = flipped ? 3 : 1
  const belowRow = flipped ? 1 : 3

  const topRegions = p.regions.slice(0, N + 1)
  const botRegions = p.regions.slice(N + 1, 2 * (N + 1))
  const siteCards = (seat: number, where: 'up' | 'down') =>
    buildings.filter((b) => b.pc.slot === `s${seat}-${where}`)

  const gridStyle: CSSProperties = {
    gridTemplateColumns: `repeat(${cols}, var(--reg))`,
  }

  return (
    <div className={`pboard${flipped ? ' flipped' : ''}`} style={gridStyle} data-player={player}>
      {/* regions: above & below each road slot (diagonal to the settlements) */}
      {topRegions.map((r, i) => (
        <div key={`t${i}`} className="pb-region" style={{ gridRow: aboveRow, gridColumn: roadSlotCol(i), alignSelf: 'end' }}>
          <RegionTile player={player} region={r} index={p.regions.indexOf(r)} />
        </div>
      ))}
      {botRegions.map((r, i) => (
        <div key={`b${i}`} className="pb-region" style={{ gridRow: belowRow, gridColumn: roadSlotCol(i), alignSelf: 'start' }}>
          <RegionTile player={player} region={r} index={p.regions.indexOf(r)} />
        </div>
      ))}

      {/* spine: settlements on even columns, roads / empty road slots on odd */}
      {seats.map((s, j) => {
        const canCity = interactive && dragBuild === 'city' && s.card!.category === 'settlement'
        return (
          <button
            key={`seat${j}-${s.card!.id}`}
            className={`pb-seat${interactive && s.card!.category === 'settlement' ? ' upgradable' : ''}${canCity ? ' droppable' : ''}`}
            style={{ gridRow: 2, gridColumn: seatCol(j) }}
            disabled={!interactive || s.card!.category !== 'settlement'}
            title={s.card!.category === 'settlement' ? 'Upgrade to city' : 'City'}
            onClick={() => dispatch({ type: 'upgradeCity', player, seat: j })}
            onDragOver={canCity ? (e) => e.preventDefault() : undefined}
            onDrop={canCity ? (e) => { e.preventDefault(); dispatch({ type: 'upgradeCity', player, seat: j }); playSfx('place'); clear() } : undefined}
          >
            <PieceArt card={s.card!} />
          </button>
        )
      })}
      {roads.map((r) => (
        <div
          key={`road${r.i}`}
          className="pb-road"
          style={{ gridRow: 2, gridColumn: roadSlotCol(roadSlotIndex(r.pc)) }}
          draggable={interactive}
          title={interactive ? 'Drag back to the build bar to remove' : undefined}
          onDragStart={interactive ? () => setDragRemove({ placedIndex: r.i, player }) : undefined}
          onDragEnd={interactive ? () => setDragRemove(null) : undefined}
        >
          <PieceArt card={r.card!} />
        </div>
      ))}
      {Array.from({ length: N + 1 }, (_, i) => i)
        .filter((i) => !filledRoadSlots.has(i))
        .map((i) => {
          const canRoad = interactive && dragBuild === 'road'
          return (
            <div
              key={`rslot${i}`}
              className={`pb-roadslot${canRoad ? ' droppable' : ''}`}
              style={{ gridRow: 2, gridColumn: roadSlotCol(i) }}
              onDragOver={canRoad ? (e) => e.preventDefault() : undefined}
              onDrop={canRoad ? (e) => { e.preventDefault(); dispatch({ type: 'buildPiece', player, piece: 'road', slot: i }); playSfx('place'); clear() } : undefined}
            />
          )
        })}

      {/* a frontier road opens a settlement slot beyond it (drop a Settlement) */}
      {extendLeft && (
        <div
          className={`pb-extend left${dragBuild === 'settlement' ? ' armed' : ''}`}
          title="Build a settlement here"
          onDragOver={dragBuild === 'settlement' ? (e) => e.preventDefault() : undefined}
          onDrop={dragBuild === 'settlement' ? (e) => { e.preventDefault(); dispatch({ type: 'buildPiece', player, piece: 'settlement', end: 'left' }); playSfx('place'); clear() } : undefined}
        >＋</div>
      )}
      {extendRight && (
        <div
          className={`pb-extend right${dragBuild === 'settlement' ? ' armed' : ''}`}
          title="Build a settlement here"
          onDragOver={dragBuild === 'settlement' ? (e) => e.preventDefault() : undefined}
          onDrop={dragBuild === 'settlement' ? (e) => { e.preventDefault(); dispatch({ type: 'buildPiece', player, piece: 'settlement', end: 'right' }); playSfx('place'); clear() } : undefined}
        >＋</div>
      )}

      {/* building sites: above & below each settlement. A CITY gets an expanded
          building area (it holds more development cards than a settlement). */}
      {seats.map((s, j) => (
        <Site key={`up${j}`} player={player} slot={`s${j}-up`} cards={siteCards(j, 'up')} interactive={interactive} expanded={s.card!.category === 'city'} style={{ gridRow: aboveRow, gridColumn: seatCol(j), alignSelf: 'end' }} />
      ))}
      {seats.map((s, j) => (
        <Site key={`dn${j}`} player={player} slot={`s${j}-down`} cards={siteCards(j, 'down')} interactive={interactive} expanded={s.card!.category === 'city'} style={{ gridRow: belowRow, gridColumn: seatCol(j), alignSelf: 'start' }} />
      ))}
    </div>
  )
}

function Site({
  player,
  slot,
  cards,
  interactive,
  expanded,
  style,
}: {
  player: PlayerId
  slot: string
  cards: { pc: PlacedCard; card: ReturnType<typeof getCard>; i: number }[]
  interactive?: boolean
  /** city sites get a larger building area (more development capacity) */
  expanded?: boolean
  style: CSSProperties
}) {
  const dispatch = useGame((s) => s.dispatch)
  const { dragCardId, selectedCardId, clear, openZoom, setDragRemove } = useUI()
  const [over, setOver] = useState(false)

  const place = (cardId: string | null) => {
    if (!cardId) return
    // Dropping a card onto a site places it without auto-charging (manual sandbox);
    // structural road/settlement/city builds DO auto-charge in the engine.
    dispatch({ type: 'playCard', player, cardId, slot, pay: false })
    playSfx('place')
    playSfx('sweep') // dramatic deploy whoosh
    clear()
  }

  return (
    <div
      className={`pb-site${cards.length ? ' filled' : ''}${over ? ' over' : ''}${expanded ? ' expanded' : ''}${interactive && (dragCardId || selectedCardId) ? ' droppable' : ''}`}
      style={style}
      onDragOver={interactive ? (e) => { e.preventDefault(); setOver(true) } : undefined}
      onDragLeave={interactive ? () => setOver(false) : undefined}
      onDrop={
        interactive
          ? (e) => {
              e.preventDefault()
              setOver(false)
              place(e.dataTransfer.getData('text/cardid') || dragCardId)
            }
          : undefined
      }
      onClick={interactive && selectedCardId ? () => place(selectedCardId) : undefined}
    >
      {cards.map((c) => {
        const art = cardArt(c.card!.id)
        return (
          <div
            key={c.i}
            className="pb-site-card"
            title={`${c.card!.name} — tap to enlarge, drag to the build bar to remove`}
            draggable={interactive}
            onDragStart={interactive ? (e) => { e.stopPropagation(); setDragRemove({ placedIndex: c.i, player }) } : undefined}
            onDragEnd={interactive ? () => setDragRemove(null) : undefined}
            onClick={(e) => {
              e.stopPropagation()
              openZoom({ cardId: c.card!.id, from: 'play', player, placedIndex: c.i })
            }}
          >
            {art ? <img src={art} alt={c.card!.name} /> : <span>{c.card!.name}</span>}
          </div>
        )
      })}
    </div>
  )
}

