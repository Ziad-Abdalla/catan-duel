import { useEffect } from 'react'
import { getCard } from '../../data/cards'
import { CardView } from '../CardView'
import { requirementMet } from '../../engine/requirements'
import { useGame } from '../../store/gameStore'
import { useUI } from '../../store/uiStore'
import { playSfx } from '../../audio/sfx'
import './cardzoom.css'

/** First empty building site for a player, scanning up/down across each seat;
 *  falls back to the first seat's upper site (cards stack) when all are filled. */
function firstOpenSlot(placed: { cardId: string; slot?: string }[]): string {
  const seats = placed.filter((pc) => {
    const c = getCard(pc.cardId)
    return c && (c.category === 'settlement' || c.category === 'city')
  }).length
  const n = Math.max(2, seats)
  const used = new Set(placed.map((pc) => pc.slot).filter(Boolean))
  for (let i = 0; i < n; i++) {
    for (const w of ['up', 'down']) {
      const slot = `s${i}-${w}`
      if (!used.has(slot)) return slot
    }
  }
  return 's0-up'
}

/**
 * The card detail view: tap any card (in hand or in play) to blow it up to a
 * readable size with its rules + flavor text shown beneath — the printed text on
 * the art is too small to read even enlarged. Play / exchange a hand card or
 * return an in-play card straight from here. Dragging from the hand still places.
 */
export function CardZoom() {
  const zoom = useUI((s) => s.zoom)
  const closeZoom = useUI((s) => s.closeZoom)
  const openResolve = useUI((s) => s.openResolve)
  const dispatch = useGame((s) => s.dispatch)
  const state = useGame((s) => s.state)
  const placed = useGame((s) => (zoom ? s.state.players[zoom.player].placed : null))

  useEffect(() => {
    if (!zoom) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && closeZoom()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [zoom, closeZoom])

  if (!zoom) return null
  const card = getCard(zoom.cardId)
  if (!card) return null
  const met = requirementMet(card, state, zoom.player)
  const hasCost = !!card.cost && card.cost.length > 0

  const play = (pay: boolean) => {
    const slot = firstOpenSlot(placed ?? [])
    dispatch({ type: 'playCard', player: zoom.player, cardId: zoom.cardId, slot })
    if (pay && card.cost) {
      for (const c of card.cost) dispatch({ type: 'addResource', player: zoom.player, resource: c.resource, count: -c.count })
    }
    playSfx('place')
    closeZoom()
  }
  const exchange = (stackIndex: number) => {
    dispatch({ type: 'discardToStack', player: zoom.player, cardId: zoom.cardId, stackIndex })
    playSfx('flip')
    closeZoom()
  }
  const returnToHand = () => {
    if (zoom.placedIndex != null) {
      dispatch({ type: 'returnToHand', player: zoom.player, placedIndex: zoom.placedIndex })
      playSfx('flip')
    }
    closeZoom()
  }
  const resolve = (from: 'hand' | 'play') =>
    openResolve({ player: zoom.player, from, cardId: zoom.cardId, placedIndex: zoom.placedIndex })

  return (
    <div className="cardzoom-scrim" role="dialog" aria-modal="true" aria-label={`${card.name} details`} onClick={closeZoom}>
      <div className="cardzoom" onClick={(e) => e.stopPropagation()}>
        <button className="cardzoom-x" onClick={closeZoom} aria-label="Close">✕</button>
        <div className="cardzoom-card">
          <CardView card={card} requirementMet={met} />
        </div>
        <div className="cardzoom-actions">
          {zoom.from === 'build' ? (
            <>
              <p className="cz-hint">Drag this onto the board to place it. Settlements go at either end,
                roads on an open road slot, a city onto one of your settlements, and a landscape onto an
                open landscape slot.</p>
              {hasCost && <p className="cz-hint">Pay its cost with the resource counters after placing, or open the resolution panel.</p>}
            </>
          ) : zoom.from === 'hand' ? (
            <>
              <button className="cz-btn cz-play" onClick={() => play(false)}>Play to principality</button>
              {hasCost && (
                <button className="cz-btn" onClick={() => play(true)} title="Place it and spend its cost from your regions">
                  Play &amp; pay cost
                </button>
              )}
              <button className="cz-btn cz-resolve" onClick={() => resolve('hand')}>Resolve effect…</button>
              <div className="cz-exchange">
                <span>Exchange under stack</span>
                {[0, 1, 2, 3].map((i) => (
                  <button key={i} className="cz-btn cz-sm" onClick={() => exchange(i)}>{i + 1}</button>
                ))}
              </div>
              <p className="cz-hint">…or drag the card onto a building site.</p>
            </>
          ) : (
            <>
              <button className="cz-btn cz-resolve" onClick={() => resolve('play')}>Activate / resolve…</button>
              <button className="cz-btn" onClick={returnToHand}>Return to hand</button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
