import { useEffect } from 'react'
import { getCard, cardArt } from '../../data/cards'
import { useGame } from '../../store/gameStore'
import { useUI } from '../../store/uiStore'
import { playSfx } from '../../audio/sfx'
import './event.css'

/**
 * Simultaneous event resolution. When an event is drawn, `state.revealedEvent` +
 * `state.eventNonce` are part of the synced snapshot, so this pop-up appears on BOTH
 * players' screens at once. Dismissal is LOCAL (each client records the nonce it has
 * seen), so one player closing their popup does NOT close the other's. It only closes
 * via the explicit button — clicking the backdrop does nothing, so it can't be lost by a
 * stray click while you read it.
 */
export function EventPopup() {
  const id = useGame((s) => s.state.revealedEvent)
  const nonce = useGame((s) => s.state.eventNonce ?? 0)
  const seen = useUI((s) => s.seenEventNonce)
  const markEventSeen = useUI((s) => s.markEventSeen)
  const card = id ? getCard(id) : null
  const open = !!id && !!card && nonce !== seen

  useEffect(() => {
    if (open) playSfx('flip')
  }, [open, nonce])

  if (!open || !card) return null
  const dismiss = () => markEventSeen(nonce)
  const art = cardArt(id!)

  return (
    <div className="evpop-scrim" role="alertdialog" aria-modal="true" aria-label={`Event: ${card.name}`}>
      <div className="evpop">
        <button className="evpop-close" onClick={dismiss} aria-label="Close event" title="Close">✕</button>
        <div className="evpop-banner">Event</div>
        {art && <img className="evpop-art" src={art} alt={card.name} />}
        <h3 className="evpop-name">{card.name}</h3>
        {card.rules_text ? (
          <p className="evpop-rules">{card.rules_text}</p>
        ) : (
          <p className="evpop-rules evpop-muted">Resolve this event as printed on the card.</p>
        )}
        {card.flavor_text && <p className="evpop-flavor">{card.flavor_text}</p>}
        <button className="evpop-ok" onClick={dismiss}>Got it</button>
      </div>
    </div>
  )
}
