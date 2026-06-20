import { useEffect } from 'react'
import { getCard } from '../../data/cards'
import { requirementMet } from '../../engine/requirements'
import { useGame } from '../../store/gameStore'
import { useUI } from '../../store/uiStore'
import { CardView } from '../CardView'
import { playSfx } from '../../audio/sfx'
import { cardSfx } from '../../audio/cardSound'
import './event.css'

/**
 * "Showcase" — a big read-only look at a card a player chose to show BOTH players (an action
 * they played, or a manual "show opponent"). Synced via `state.showcase` + `showcaseNonce`;
 * each player dismisses their OWN copy locally (like the event popup), and only the close
 * button dismisses it (no stray click-outside).
 */
export function ShowcasePopup() {
  const id = useGame((s) => s.state.showcase)
  const nonce = useGame((s) => s.state.showcaseNonce ?? 0)
  const state = useGame((s) => s.state)
  const seen = useUI((s) => s.seenShowcaseNonce)
  const mark = useUI((s) => s.markShowcaseSeen)
  const card = id ? getCard(id) : null
  const open = !!id && !!card && nonce !== seen

  useEffect(() => {
    if (open && id) playSfx(cardSfx(id))
  }, [open, nonce, id])

  if (!open || !card) return null
  const dismiss = () => mark(nonce)
  const met = requirementMet(card, state, state.activePlayer)

  return (
    <div className="evpop-scrim sc-scrim" role="alertdialog" aria-modal="true" aria-label={`Card: ${card.name}`}>
      <div className="sc-pop">
        <button className="evpop-close" onClick={dismiss} aria-label="Close" title="Close">✕</button>
        <div className="sc-banner">Played card</div>
        <div className="sc-card">
          <CardView card={card} requirementMet={met} />
        </div>
        <button className="evpop-ok" onClick={dismiss}>Got it</button>
      </div>
    </div>
  )
}
