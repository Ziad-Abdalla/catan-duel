import { useState, type CSSProperties } from 'react'
import type { PlacedCard, PlayerId, RegionSlot } from '../../types'
import { getCard, cardArt, regionExpansionOf } from '../../data/cards'
import { PieceArt } from './PieceArt'
import { RegionTile } from './RegionTile'
import { useGame } from '../../store/gameStore'
import { useUI } from '../../store/uiStore'
import { playSfx } from '../../audio/sfx'
import { cardSfx } from '../../audio/cardSound'

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
  const { dragBuild, setDragRemove, clear, payCosts, openZoom } = useUI()

  const all = p.placed.map((pc, i) => ({ pc, i, card: getCard(pc.cardId) })).filter((x) => x.card)
  // foreign cards (built HERE by the opponent) render in a separate strip, not the spine
  const foreign = all.filter((x) => x.pc.owner && x.pc.owner !== player)
  const spine = all.filter((x) => !(x.pc.owner && x.pc.owner !== player))
  const seats = spine.filter((x) => x.card!.category === 'settlement' || x.card!.category === 'city')
  const roads = spine.filter((x) => x.card!.category === 'road')
  // region-expansions (Residences, Border Fortress, Reiner, Triumph) live ON a region, not in a
  // settlement building site — pull them out of `buildings` and render them over their region tile.
  const buildings = spine.filter((x) => !['settlement', 'city', 'road'].includes(x.card!.category) && !/^rexp-/.test(x.pc.slot ?? ''))
  const regionExpansions = new Map<number, (typeof all)[number]>()
  for (const x of spine) {
    const m = /^rexp-(\d+)$/.exec(x.pc.slot ?? '')
    if (m) regionExpansions.set(Number(m[1]), x)
  }

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
  // Official building-site capacity: a settlement has 1 site above + 1 below; a city
  // has 2 above + 2 below. Each site holds exactly ONE expansion card.
  const sideCapacity = (category: string) => (category === 'city' ? 2 : 1)
  const slotName = (seat: number, where: 'up' | 'down', k: number) => (k === 0 ? `s${seat}-${where}` : `s${seat}-${where}${k + 1}`)
  const cardForSlot = (slot: string) => buildings.find((b) => b.pc.slot === slot)

  const gridStyle: CSSProperties = {
    gridTemplateColumns: `repeat(${cols}, var(--reg))`,
    ['--cols' as string]: cols, // drives the fit-to-width region sizing in table.css
  }

  return (
    <div className={`pboard${flipped ? ' flipped' : ''}`} style={gridStyle} data-player={player}>
      {/* regions: above & below each road slot (diagonal to the settlements) */}
      {topRegions.map((r, i) => {
        const gi = p.regions.indexOf(r)
        return (
          <RegionCell key={`t${i}`} player={player} region={r} index={gi} interactive={interactive} expansion={regionExpansions.get(gi)} style={{ gridRow: aboveRow, gridColumn: roadSlotCol(i), alignSelf: 'end' }} />
        )
      })}
      {botRegions.map((r, i) => {
        const gi = p.regions.indexOf(r)
        return (
          <RegionCell key={`b${i}`} player={player} region={r} index={gi} interactive={interactive} expansion={regionExpansions.get(gi)} style={{ gridRow: belowRow, gridColumn: roadSlotCol(i), alignSelf: 'start' }} />
        )
      })}

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
            onClick={() => dispatch({ type: 'upgradeCity', player, seat: j, pay: payCosts })}
            onDragOver={canCity ? (e) => e.preventDefault() : undefined}
            onDrop={canCity ? (e) => { e.preventDefault(); dispatch({ type: 'upgradeCity', player, seat: j, pay: payCosts }); playSfx('build'); clear() } : undefined}
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
              onDrop={canRoad ? (e) => { e.preventDefault(); dispatch({ type: 'buildPiece', player, piece: 'road', slot: i, pay: payCosts }); playSfx('build'); clear() } : undefined}
            />
          )
        })}

      {/* a frontier road opens a settlement slot beyond it (drop a Settlement) */}
      {extendLeft && (
        <div
          className={`pb-extend left${dragBuild === 'settlement' ? ' armed' : ''}`}
          title="Build a settlement here"
          onDragOver={dragBuild === 'settlement' ? (e) => e.preventDefault() : undefined}
          onDrop={dragBuild === 'settlement' ? (e) => { e.preventDefault(); dispatch({ type: 'buildPiece', player, piece: 'settlement', end: 'left', pay: payCosts }); playSfx('build'); clear() } : undefined}
        >＋</div>
      )}
      {extendRight && (
        <div
          className={`pb-extend right${dragBuild === 'settlement' ? ' armed' : ''}`}
          title="Build a settlement here"
          onDragOver={dragBuild === 'settlement' ? (e) => e.preventDefault() : undefined}
          onDrop={dragBuild === 'settlement' ? (e) => { e.preventDefault(); dispatch({ type: 'buildPiece', player, piece: 'settlement', end: 'right', pay: payCosts }); playSfx('build'); clear() } : undefined}
        >＋</div>
      )}

      {/* building sites: a settlement exposes 1 site above + 1 below; a CITY exposes
          2 above + 2 below (official rule). Each site holds a single expansion. */}
      {(['up', 'down'] as const).map((where) =>
        seats.map((s, j) => {
          const cap = sideCapacity(s.card!.category)
          const row = where === 'up' ? aboveRow : belowRow
          return (
            <div
              key={`grp-${where}-${j}`}
              className={`pb-sitegroup pb-sitegroup-${where}`}
              style={{ gridRow: row, gridColumn: seatCol(j), alignSelf: where === 'up' ? 'end' : 'start' }}
            >
              {Array.from({ length: cap }, (_, k) => slotName(j, where, k)).map((slot) => (
                <Site key={slot} player={player} slot={slot} entry={cardForSlot(slot)} interactive={interactive} />
              ))}
            </div>
          )
        }),
      )}

      {/* FOREIGN cards the opponent built in this principality — shown intruding at the top */}
      {foreign.length > 0 && (
        <div className="pb-foreign" title="Foreign cards your opponent built in your principality">
          {foreign.map((x) => (
            <button
              key={`fgn-${x.i}`}
              className="pb-foreign-card"
              title={x.card!.name}
              onClick={() => openZoom({ cardId: x.card!.id, from: 'play', player, placedIndex: x.i })}
            >
              {cardArt(x.card!.id) ? <img src={cardArt(x.card!.id)} alt={x.card!.name} /> : <span>{x.card!.name}</span>}
              {interactive && (
                <span
                  className="pb-foreign-x"
                  title="Remove this foreign card"
                  onClick={(e) => { e.stopPropagation(); dispatch({ type: 'removePlaced', player, placedIndex: x.i }); playSfx('build') }}
                >✕</span>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

type PlacedEntry = { pc: PlacedCard; card: ReturnType<typeof getCard>; i: number }

/** A region tile cell that ALSO hosts any region-expansion card placed on it and accepts a
 *  region-expansion card dropped from the hand (Residences onto pasture/forest, Border Fortress
 *  onto hills, Reiner/Abbey onto fields, Triumph onto any region). */
function RegionCell({
  player,
  region,
  index,
  interactive,
  expansion,
  style,
}: {
  player: PlayerId
  region: RegionSlot
  index: number
  interactive?: boolean
  expansion?: PlacedEntry
  style?: CSSProperties
}) {
  const dispatch = useGame((s) => s.dispatch)
  const { dragCardId, selectedCardId, payCosts, clear } = useUI()
  const [over, setOver] = useState(false)
  const armedId = interactive && !region.empty ? dragCardId || selectedCardId : null
  const def = armedId ? regionExpansionOf(armedId) : undefined
  const matches = !!def && !expansion && (def.resource === 'any' || def.resource === region.resource)
  const place = (cardId: string) => {
    if (!cardId) return
    dispatch({ type: 'playRegionExpansion', player, cardId, regionIndex: index, pay: payCosts })
    playSfx(cardSfx(cardId), cardId)
    clear()
  }
  return (
    <div
      className={`pb-region${matches ? ' rexp-armed' : ''}${over ? ' rexp-over' : ''}`}
      style={style}
      onDragOver={matches ? (e) => { e.preventDefault(); setOver(true) } : undefined}
      onDragLeave={matches ? () => setOver(false) : undefined}
      onDrop={matches ? (e) => { e.preventDefault(); setOver(false); place(e.dataTransfer.getData('text/cardid') || dragCardId || '') } : undefined}
      onClick={matches && selectedCardId ? () => place(selectedCardId) : undefined}
    >
      <RegionTile player={player} region={region} index={index} />
      {expansion?.card && <RegionExpansionBadge player={player} entry={expansion} interactive={interactive} />}
    </div>
  )
}

/** The card sitting on a region: art + (for rotating ones) a level badge with rotate buttons. */
function RegionExpansionBadge({ player, entry, interactive }: { player: PlayerId; entry: PlacedEntry; interactive?: boolean }) {
  const dispatch = useGame((s) => s.dispatch)
  const { openZoom, setDragRemove, payCosts } = useUI()
  const card = entry.card!
  const def = regionExpansionOf(card.id)
  const level = entry.pc.level ?? 0
  return (
    <div className="pb-rexp">
      <button
        className="pb-rexp-card"
        title={`${card.name} — tap to read, drag to the build bar to remove`}
        draggable={interactive}
        onDragStart={interactive ? () => setDragRemove({ placedIndex: entry.i, player }) : undefined}
        onDragEnd={interactive ? () => setDragRemove(null) : undefined}
        onClick={() => openZoom({ cardId: card.id, from: 'play', player, placedIndex: entry.i })}
      >
        {cardArt(card.id) ? <img src={cardArt(card.id)} alt={card.name} /> : <span>{card.name}</span>}
      </button>
      {def?.rotates && (
        <div className="pb-rexp-rot">
          {interactive && (
            <button className="pb-rexp-btn" title="Rotate down a level" onClick={() => dispatch({ type: 'rotatePlaced', player, placedIndex: entry.i, delta: -1, pay: payCosts })}>−</button>
          )}
          <span className="pb-rexp-lvl" title="Rotation level">L{level}</span>
          {interactive && (
            <button className="pb-rexp-btn" title="Rotate up a level (spends its rotation cost)" onClick={() => dispatch({ type: 'rotatePlaced', player, placedIndex: entry.i, delta: 1, pay: payCosts })}>＋</button>
          )}
        </div>
      )}
    </div>
  )
}

function Site({
  player,
  slot,
  entry,
  interactive,
}: {
  player: PlayerId
  slot: string
  entry: { pc: PlacedCard; card: ReturnType<typeof getCard>; i: number } | undefined
  interactive?: boolean
}) {
  const dispatch = useGame((s) => s.dispatch)
  const { dragCardId, selectedCardId, dragRemove, payCosts, clear, openZoom, setDragRemove } = useUI()
  const [over, setOver] = useState(false)
  const occupied = !!entry

  const place = (cardId: string | null) => {
    if (!cardId || occupied) return
    // Honour the global auto-pay toggle — on by default so face-up buildings actually
    // spend their cost; off lets you place freely in the manual sandbox.
    dispatch({ type: 'playCard', player, cardId, slot, pay: payCosts })
    playSfx(cardSfx(cardId), cardId) // thematic cue (ship→water, hero→sword…), varied per card
    clear()
  }
  // Dropping a piece you dragged off the board (dragRemove) into an empty site MOVES it.
  const moveHere = () => {
    if (!dragRemove || occupied) return
    dispatch({ type: 'movePlaced', player: dragRemove.player, placedIndex: dragRemove.placedIndex, slot })
    playSfx('build')
    setDragRemove(null)
  }
  const armed = interactive && !occupied && (!!dragCardId || !!selectedCardId || !!dragRemove)

  return (
    <div
      className={`pb-site${occupied ? ' filled' : ''}${over ? ' over' : ''}${armed ? ' droppable' : ''}`}
      onDragOver={interactive && !occupied ? (e) => { e.preventDefault(); setOver(true) } : undefined}
      onDragLeave={interactive ? () => setOver(false) : undefined}
      onDrop={
        interactive
          ? (e) => {
              e.preventDefault()
              setOver(false)
              if (dragRemove) moveHere()
              else place(e.dataTransfer.getData('text/cardid') || dragCardId)
            }
          : undefined
      }
      onClick={interactive && selectedCardId && !occupied ? () => place(selectedCardId) : undefined}
    >
      {entry && (
        <div
          className="pb-site-card"
          title={`${entry.card!.name} — tap to enlarge, drag to a free site to move or to the build bar to remove`}
          draggable={interactive}
          onDragStart={interactive ? (e) => { e.stopPropagation(); setDragRemove({ placedIndex: entry.i, player }) } : undefined}
          onDragEnd={interactive ? () => setDragRemove(null) : undefined}
          onClick={(e) => {
            e.stopPropagation()
            openZoom({ cardId: entry.card!.id, from: 'play', player, placedIndex: entry.i })
          }}
        >
          {cardArt(entry.card!.id) ? <img src={cardArt(entry.card!.id)} alt={entry.card!.name} /> : <span>{entry.card!.name}</span>}
        </div>
      )}
    </div>
  )
}

