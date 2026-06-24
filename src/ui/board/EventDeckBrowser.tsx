import { useEffect } from 'react'
import { getCard, cardArt } from '../../data/cards'
import { useGame } from '../../store/gameStore'
import { useUI } from '../../store/uiStore'
import { playSfx } from '../../audio/sfx'
import './stackbrowser.css'

/**
 * Look through the event pile like you would at the table. The deck's TOP is the card drawn
 * next; here it is shown on the RIGHT and tagged "top" (matching the landscape-stack browser).
 * You can draw the top card straight from here, so the event deck is reachable outside the dice
 * path. Trust-based sandbox: the full order is visible (same as the region/discard browsers) —
 * Yule's seat and the "under the top 4" cards are part of what you came here to see.
 */
export function EventDeckBrowser() {
  const open = useUI((s) => s.eventBrowse)
  const closeEventBrowse = useUI((s) => s.closeEventBrowse)
  const state = useGame((s) => s.state)
  const dispatch = useGame((s) => s.dispatch)

  // a page-flip cue on open, mirroring the other pile browsers
  useEffect(() => {
    if (open) playSfx('page')
  }, [open])

  if (!open) return null
  const deck = state.eventDeck

  const close = () => closeEventBrowse()

  const drawTop = () => {
    if (deck.length === 0) return
    dispatch({ type: 'drawEvent' })
    playSfx('place')
    closeEventBrowse()
  }

  return (
    <div className="sb-scrim" role="dialog" aria-modal="true" aria-label="Look through the event pile" onClick={close}>
      <div className="sb-panel" onClick={(e) => e.stopPropagation()}>
        <header className="sb-head">
          <span className="sb-title">Event pile · {deck.length} cards</span>
          <div className="sb-tools">
            <button className="sb-btn" disabled={deck.length === 0} title="Draw the top event card (pops up for both players)" onClick={drawTop}>⤒ Draw top card</button>
            <button className="sb-x" onClick={close} aria-label="Close">✕</button>
          </div>
        </header>

        <p className="sb-hint">The top of the pile (drawn next) is on the right.</p>

        <div className="sb-cards">
          {deck.length === 0 && <span className="sb-empty">— empty —</span>}
          {deck.map((id, i) => {
            const art = cardArt(id)
            const label = getCard(id)?.name ?? id
            const isTop = i === deck.length - 1
            return (
              <div key={`${id}-${i}`} className={`sb-card${isTop ? ' sb-top' : ''}`} title={label}>
                {art ? <img src={art} alt={label} /> : <span>{label}</span>}
                {isTop && <span className="sb-toptag">top</span>}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
