import { useState } from 'react'
import type { PlayerId } from '../../types'
import { getCard, regionCardFor, CARDS, cardArt } from '../../data/cards'
import { CenterArt } from '../CenterArt'
import { PieceArt } from './PieceArt'
import { useGame } from '../../store/gameStore'
import { useUI, type BuildKind } from '../../store/uiStore'
import { playSfx } from '../../audio/sfx'

const LANDSCAPE = regionCardFor('grain') // representative card for the Landscape detail

const STRUCTURES: { kind: BuildKind; cardId: string; label: string }[] = [
  { kind: 'settlement', cardId: 'base-settlement', label: 'Settlement' },
  { kind: 'city', cardId: 'base-city', label: 'City' },
  { kind: 'road', cardId: 'base-road', label: 'Road' },
  { kind: 'landscape', cardId: LANDSCAPE?.id ?? 'base-settlement', label: 'Landscape' },
]

const ERA_LABEL: Record<string, string> = { gold: 'Gold', turmoil: 'Turmoil', progress: 'Innovation' }

/**
 * Your supply of placeable pieces. CLICK an item to read its cost & details; DRAG
 * it onto the board to place it. The four structures (settlement/city/road/
 * landscape) plus — for each enabled era — that era's buildings, which you can
 * build straight from here (drag onto a building site) without drawing them.
 * Drag a placed road/building back onto this bar to remove it.
 */
export function BuildSupply({ player }: { player: PlayerId }) {
  const dispatch = useGame((s) => s.dispatch)
  const enabledSets = useGame((s) => s.state.enabledSets)
  const supply = useGame((s) => s.state.supply)
  const { setDragBuild, setDrag, openZoom, dragRemove, clear } = useUI()
  const [over, setOver] = useState(false)

  // Each era has ONE face-up expansion building you can build straight from the
  // supply (the rest are drawn). In the data that's the card tagged
  // "Face-up Expansion": Gold = Merchant Guild, Turmoil = Hedge Tavern,
  // Innovation = University (2 copies each, per the operator's physical cards).
  const eraBuildings = CARDS.filter(
    (c) => c.set !== 'base' && enabledSets.includes(c.set) && c.tag === 'Face-up Expansion',
  )

  return (
    <div
      className={`build-supply${dragRemove ? ' removable' : ''}${over ? ' over' : ''}`}
      onDragOver={dragRemove ? (e) => { e.preventDefault(); setOver(true) } : undefined}
      onDragLeave={() => setOver(false)}
      onDrop={
        dragRemove
          ? (e) => {
              e.preventDefault()
              setOver(false)
              dispatch({ type: 'removePlaced', player: dragRemove.player, placedIndex: dragRemove.placedIndex })
              playSfx('flip')
              clear()
            }
          : undefined
      }
    >
      <span className="build-label">{dragRemove ? 'Drop to remove' : 'Build'}</span>
      <div className="build-row">
        {STRUCTURES.map(({ kind, cardId, label }) => {
          const card = getCard(cardId)
          if (!card) return null
          return (
            <button
              key={kind}
              className="build-piece"
              draggable
              title={`${label} — click for details, drag onto the board to place`}
              onDragStart={(e) => {
                e.dataTransfer.setData('text/build', kind)
                e.dataTransfer.effectAllowed = 'copy'
                setDragBuild(kind)
              }}
              onDragEnd={() => setDragBuild(null)}
              onClick={() => openZoom({ cardId, from: 'build', player })}
            >
              <PieceArt card={card} />
              <span className="build-piece-name">{label}</span>
            </button>
          )
        })}

        {eraBuildings.length > 0 && <span className="build-sep" aria-hidden />}

        {eraBuildings.map((card) => {
          const art = cardArt(card.id)
          const left = supply[card.id] ?? card.copies
          const out = left <= 0
          return (
            <button
              key={card.id}
              className={`build-piece build-era era-${card.set}${out ? ' depleted' : ''}`}
              aria-disabled={out}
              draggable={!out}
              title={out
                ? `${card.name} — none left in the supply`
                : `${card.name} (${ERA_LABEL[card.set] ?? card.set}) — ${left} left · click for details, drag onto a building site`}
              onDragStart={out ? undefined : (e) => {
                e.dataTransfer.setData('text/cardid', card.id)
                e.dataTransfer.effectAllowed = 'copy'
                setDrag(card.id)
              }}
              onDragEnd={() => setDrag(null)}
              onClick={() => openZoom({ cardId: card.id, from: 'build', player })}
            >
              {art ? <img src={art} alt={card.name} /> : <CenterArt card={card} />}
              <span className="build-copies">{left}</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
