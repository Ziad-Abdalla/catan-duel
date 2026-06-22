import { useEffect } from 'react'
import { getCard, isForeignCard } from '../../data/cards'
import { CardView } from '../CardView'
import { requirementMet } from '../../engine/requirements'
import { resourceTotalOf } from '../../engine/actions'
import { useGame } from '../../store/gameStore'
import { useUI } from '../../store/uiStore'
import { playSfx } from '../../audio/sfx'
import { cardSfx } from '../../audio/cardSound'
import './cardzoom.css'

/** First empty building site for a player, scanning up/down across each seat. A city
 *  exposes 2 sites per side, a settlement 1 (official capacity). Falls back to s0-up. */
function firstOpenSlot(placed: { cardId: string; slot?: string }[]): string {
  const seats = placed.filter((pc) => {
    const c = getCard(pc.cardId)
    return c && (c.category === 'settlement' || c.category === 'city')
  })
  const n = Math.max(2, seats.length)
  const used = new Set(placed.map((pc) => pc.slot).filter(Boolean))
  for (let i = 0; i < n; i++) {
    const cap = getCard(seats[i]?.cardId ?? '')?.category === 'city' ? 2 : 1
    for (const w of ['up', 'down'] as const) {
      for (let k = 0; k < cap; k++) {
        const slot = k === 0 ? `s${i}-${w}` : `s${i}-${w}${k + 1}`
        if (!used.has(slot)) return slot
      }
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
  // Affordability flag: does the owner currently store enough of each cost resource?
  const costMet = hasCost
    ? card.cost!.every((c) => resourceTotalOf(state.players[zoom.player], c.resource) >= c.count)
    : null

  const play = (pay: boolean) => {
    const slot = firstOpenSlot(placed ?? [])
    // The engine spends the cost when pay=true (no manual subtraction here — that
    // would double-charge). pay=false just places it (manual "show your friend").
    dispatch({ type: 'playCard', player: zoom.player, cardId: zoom.cardId, slot, pay })
    // show BOTH players the card that was just played (big popup, dismissed per-player)
    dispatch({ type: 'showcaseCard', player: zoom.player, cardId: zoom.cardId })
    playSfx(cardSfx(zoom.cardId), zoom.cardId) // one thematic cue per play, varied per card
    closeZoom()
  }
  // Active (one-shot) cards — neutral & attack actions, events — aren't placed on the
  // board: you play them for their effect, the opponent sees what you played, then the
  // card is discarded. One button does the whole ritual (showcase → thematic cue →
  // open the resolve toolkit → discard), so the right SFX/animation fire every time.
  const playActive = () => {
    dispatch({ type: 'showcaseCard', player: zoom.player, cardId: zoom.cardId })
    playSfx(cardSfx(zoom.cardId), zoom.cardId)
    openResolve({ player: zoom.player, from: 'hand', cardId: zoom.cardId })
    dispatch({ type: 'discardCard', player: zoom.player, from: 'hand', cardId: zoom.cardId })
    closeZoom()
  }
  // Foreign cards (Red Light Tavern, Brigand Camp, Trading Station…) are built in the
  // OPPONENT's principality and affect them — the engine adds them to the opponent's
  // placed cards with `owner` set so they score for nobody.
  const buildForeign = (pay: boolean) => {
    dispatch({ type: 'playForeign', player: zoom.player, cardId: zoom.cardId, pay })
    dispatch({ type: 'showcaseCard', player: zoom.player, cardId: zoom.cardId })
    playSfx(cardSfx(zoom.cardId), zoom.cardId)
    closeZoom()
  }
  // Manually show this card big to both players (without playing it).
  const showOpponent = () => {
    dispatch({ type: 'showcaseCard', player: zoom.player, cardId: zoom.cardId })
    playSfx('flip')
    closeZoom()
  }
  const exchange = (stackIndex: number) => {
    dispatch({ type: 'discardToStack', player: zoom.player, cardId: zoom.cardId, stackIndex })
    playSfx('flip')
    closeZoom()
  }
  // One-click discard — replaces the old return-to-hand-then-tuck-under-deck dance.
  // The engine routes action cards + buildings to the shared discard pile and
  // sends face-up expansions back to their supply automatically.
  const discardFromHand = () => {
    dispatch({ type: 'discardCard', player: zoom.player, from: 'hand', cardId: zoom.cardId })
    playSfx('flip')
    closeZoom()
  }
  const discardFromPlay = () => {
    if (zoom.placedIndex != null) {
      dispatch({ type: 'discardCard', player: zoom.player, from: 'placed', placedIndex: zoom.placedIndex })
      playSfx('flip')
    }
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
          <CardView card={card} requirementMet={met} costMet={costMet} />
        </div>
        <div className="cardzoom-actions">
          <button className="cz-btn cz-show" onClick={showOpponent} title="Show this card big to both players">📢 Show opponent</button>
          {zoom.from === 'build' ? (
            <>
              <p className="cz-hint">Drag this onto the board to place it. Settlements go at either end,
                roads on an open road slot, a city onto one of your settlements, and a landscape onto an
                open landscape slot.</p>
              {hasCost && <p className="cz-hint">Roads, settlements and cities spend their cost from your regions automatically when built. Adjust the counters anytime.</p>}
            </>
          ) : zoom.from === 'hand' ? (
            <>
              {isForeignCard(zoom.cardId) ? (
                <>
                  <button className="cz-btn cz-play" onClick={() => buildForeign(false)} title="Built in your opponent's principality">Build on opponent’s board</button>
                  {hasCost && (
                    <button className="cz-btn" onClick={() => buildForeign(true)} title="Build it on your opponent and spend its cost from your regions">
                      Build &amp; pay cost
                    </button>
                  )}
                  <p className="cz-hint">A foreign card — it is built in your opponent’s principality and affects them.</p>
                </>
              ) : card.category === 'action' || card.category === 'event' ? (
                <>
                  <button className="cz-btn cz-play" onClick={playActive} title="Show your opponent, fire its effect, then it auto-discards">▶ Play card</button>
                  <p className="cz-hint">Active cards are played for their effect (the toolkit opens), then discarded.</p>
                </>
              ) : (
                <>
                  <button className="cz-btn cz-play" onClick={() => play(false)}>Play to principality</button>
                  {hasCost && (
                    <button className="cz-btn" onClick={() => play(true)} title="Place it and spend its cost from your regions">
                      Play &amp; pay cost
                    </button>
                  )}
                </>
              )}
              <button className="cz-btn cz-resolve" onClick={() => resolve('hand')}>Resolve effect…</button>
              <button className="cz-btn cz-discard" onClick={discardFromHand}>Discard</button>
              <div className="cz-exchange">
                <span>Exchange under stack</span>
                {state.drawStacks.map((_, i) => (
                  <button key={i} className="cz-btn cz-sm" onClick={() => exchange(i)}>{i + 1}</button>
                ))}
              </div>
              <p className="cz-hint">…or drag the card onto a building site.</p>
            </>
          ) : (
            <>
              <button className="cz-btn cz-resolve" onClick={() => resolve('play')}>Activate / resolve…</button>
              <button className="cz-btn cz-discard" onClick={discardFromPlay}>Discard</button>
              <button className="cz-btn cz-ghost" onClick={returnToHand}>Return to hand</button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
