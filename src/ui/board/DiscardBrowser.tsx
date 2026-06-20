import { getCard, cardArt } from '../../data/cards'
import { useGame } from '../../store/gameStore'
import { useUI } from '../../store/uiStore'
import { playSfx } from '../../audio/sfx'
import './stackbrowser.css'

/**
 * Look through the whole shared discard pile (like picking it up at the table) and take
 * ANY card into the active player's hand — not just the top one. Read-only otherwise.
 */
export function DiscardBrowser() {
  const open = useUI((s) => s.discardOpen)
  const setOpen = useUI((s) => s.setDiscardOpen)
  const discard = useGame((s) => s.state.discard)
  const active = useGame((s) => s.state.activePlayer)
  const me = useGame((s) => s.state.players[active])
  const dispatch = useGame((s) => s.dispatch)

  if (!open) return null
  const close = () => setOpen(false)
  const take = (cardId: string) => {
    dispatch({ type: 'drawFromDiscard', player: active, cardId })
    playSfx('flip')
    // if that was the last copy, nothing left to browse → close
    if (discard.length <= 1) setOpen(false)
  }

  return (
    <div className="sb-scrim" role="dialog" aria-modal="true" aria-label="Discard pile" onClick={close}>
      <div className="sb-panel" onClick={(e) => e.stopPropagation()}>
        <header className="sb-head">
          <span className="sb-title">Discard pile · {discard.length} cards</span>
          <button className="sb-x" onClick={close} aria-label="Close">✕</button>
        </header>
        <p className="sb-hint">Most-recently discarded is on the right. Click a card to take it into {me.name}'s hand.</p>
        <div className="sb-cards">
          {discard.length === 0 && <span className="sb-empty">— empty —</span>}
          {discard.map((id, i) => {
            const card = getCard(id)
            if (!card) return null
            const art = cardArt(id)
            return (
              <button
                key={`${id}-${i}`}
                className={`sb-card${i === discard.length - 1 ? ' sb-top' : ''}`}
                title={`${card.name} — take into hand`}
                onClick={() => take(id)}
              >
                {art ? <img src={art} alt={card.name} /> : <span>{card.name}</span>}
                {i === discard.length - 1 && <span className="sb-toptag">latest</span>}
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}
