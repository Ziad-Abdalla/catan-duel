import { useEffect } from 'react'
import { getCard } from '../../data/cards'
import { useGame } from '../../store/gameStore'
import { playSfx } from '../../audio/sfx'
import './event.css'

/**
 * Simultaneous event resolution. When an event card is drawn, `state.revealedEvent`
 * is part of the synced snapshot, so this pop-up appears on BOTH players' screens at
 * once. It shows ONLY the drawn card's own rule text — no scrolling or hunting through
 * a rules sheet. Dismissing is shared too, so both sides clear together.
 */
export function EventPopup() {
  const id = useGame((s) => s.state.revealedEvent)
  const dispatch = useGame((s) => s.dispatch)
  const card = id ? getCard(id) : null

  useEffect(() => {
    if (id) playSfx('flip')
  }, [id])

  if (!id || !card) return null
  const dismiss = () => dispatch({ type: 'dismissEvent' })

  return (
    <div className="evpop-scrim" role="alertdialog" aria-modal="true" aria-label={`Event: ${card.name}`} onClick={dismiss}>
      <div className="evpop" onClick={(e) => e.stopPropagation()}>
        <div className="evpop-banner">Event</div>
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
