import { getCard, cardArt } from '../../data/cards'
import { useGame } from '../../store/gameStore'
import { useUI } from '../../store/uiStore'
import { playSfx } from '../../audio/sfx'
import { SET_LABEL, setOfStack } from './deckmeta'
import './stackbrowser.css'

/**
 * Peek/search a draw stack like you would at the table — pick it up, look through it,
 * take any card, drop a hand card on top or bottom, or shuffle it. Per the official
 * rules a normal look-through does NOT reshuffle (order is preserved), so shuffling is
 * an explicit button rather than something that happens on close.
 */
export function StackBrowser() {
  const idx = useUI((s) => s.stackBrowse)
  const close = useUI((s) => s.closeStackBrowse)
  const state = useGame((s) => s.state)
  const dispatch = useGame((s) => s.dispatch)
  const active = state.activePlayer

  if (idx == null) return null
  const stack = state.drawStacks[idx]
  if (!stack) return null
  const set = setOfStack(stack)
  const hand = state.players[active].hand

  return (
    <div className="sb-scrim" role="dialog" aria-modal="true" aria-label={`Browse draw stack ${idx + 1}`} onClick={close}>
      <div className="sb-panel" onClick={(e) => e.stopPropagation()}>
        <header className="sb-head">
          <span className="sb-title">Stack {idx + 1} · {SET_LABEL[set]} · {stack.length} cards</span>
          <div className="sb-tools">
            <button className="sb-btn" title="Shuffle this stack" onClick={() => { dispatch({ type: 'shuffleStack', stackIndex: idx }); playSfx('flip') }}>⤮ Shuffle</button>
            <button className="sb-x" onClick={close} aria-label="Close">✕</button>
          </div>
        </header>

        <p className="sb-hint">Top of the deck is on the right. Click a card to take it into {state.players[active].name}'s hand.</p>
        <div className="sb-cards">
          {stack.length === 0 && <span className="sb-empty">— empty —</span>}
          {stack.map((id, i) => {
            const card = getCard(id)
            if (!card) return null
            const art = cardArt(id)
            return (
              <button
                key={`${id}-${i}`}
                className={`sb-card${i === stack.length - 1 ? ' sb-top' : ''}`}
                title={`${card.name} — take into hand`}
                onClick={() => { dispatch({ type: 'takeFromStack', player: active, stackIndex: idx, position: i }); playSfx('flip') }}
              >
                {art ? <img src={art} alt={card.name} /> : <span>{card.name}</span>}
                {i === stack.length - 1 && <span className="sb-toptag">top</span>}
              </button>
            )
          })}
        </div>

        {hand.length > 0 && (
          <div className="sb-put">
            <span className="sb-put-label">Put a hand card on:</span>
            <select className="sb-select" id="sb-handsel" defaultValue={hand[0]}>
              {hand.map((id, i) => (
                <option key={`${id}-${i}`} value={id}>{getCard(id)?.name ?? id}</option>
              ))}
            </select>
            <button className="sb-btn" onClick={() => {
              const sel = (document.getElementById('sb-handsel') as HTMLSelectElement)?.value
              if (sel) { dispatch({ type: 'putToStack', player: active, cardId: sel, stackIndex: idx, position: 'top' }); playSfx('flip') }
            }}>top</button>
            <button className="sb-btn" onClick={() => {
              const sel = (document.getElementById('sb-handsel') as HTMLSelectElement)?.value
              if (sel) { dispatch({ type: 'putToStack', player: active, cardId: sel, stackIndex: idx, position: 'bottom' }); playSfx('flip') }
            }}>bottom</button>
          </div>
        )}
      </div>
    </div>
  )
}
