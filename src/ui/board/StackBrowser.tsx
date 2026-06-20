import { useState } from 'react'
import { getCard, cardArt } from '../../data/cards'
import { RESOURCES, type ResourceType } from '../../types'
import { resourceTotalOf } from '../../engine/actions'
import { useGame } from '../../store/gameStore'
import { useUI } from '../../store/uiStore'
import { playSfx } from '../../audio/sfx'
import { SET_LABEL, setOfStack } from './deckmeta'
import './stackbrowser.css'

const RLAB: Record<ResourceType, string> = {
  lumber: 'Lumber', brick: 'Brick', wool: 'Wool', grain: 'Wheat', ore: 'Ore', gold: 'Gold',
}
const SEARCH_COST = 2

/**
 * Peek/search a draw stack like you would at the table — pick it up, look through it,
 * take any card, drop a hand card on top or bottom, or shuffle it. A normal look-through
 * preserves order (per the rules); the SEARCH mode models the "pay 2, look, take one, then
 * reshuffle" ability — it spends 2 resources, then taking a card reshuffles the pile.
 */
export function StackBrowser() {
  const idx = useUI((s) => s.stackBrowse)
  const closeStackBrowse = useUI((s) => s.closeStackBrowse)
  const state = useGame((s) => s.state)
  const dispatch = useGame((s) => s.dispatch)
  const active = state.activePlayer
  const [search, setSearch] = useState(false)
  const [paidRes, setPaidRes] = useState<ResourceType[]>([])

  if (idx == null) return null
  const stack = state.drawStacks[idx]
  if (!stack) return null
  const set = setOfStack(stack)
  const hand = state.players[active].hand
  const me = state.players[active]
  const paid = paidRes.length
  const ready = !search || paid >= SEARCH_COST

  // refund any resources spent searching if the search is abandoned (cancel / close)
  const refund = () => {
    for (const r of paidRes) dispatch({ type: 'addResource', player: active, resource: r, count: 1 })
    setPaidRes([])
  }
  const startSearch = () => { setSearch(true); setPaidRes([]) }
  const cancelSearch = () => { refund(); setSearch(false) }
  const close = () => { if (search) refund(); closeStackBrowse() }
  const pay = (r: ResourceType) => {
    if (paid >= SEARCH_COST || resourceTotalOf(me, r) <= 0) return
    dispatch({ type: 'addResource', player: active, resource: r, count: -1 })
    setPaidRes((p) => [...p, r])
    playSfx('coin')
  }
  const take = (position: number) => {
    if (!ready) return
    dispatch({ type: 'takeFromStack', player: active, stackIndex: idx, position })
    playSfx('flip')
    if (search) {
      // search consumes the cost, reshuffles, and CLOSES — so you never see the new order
      dispatch({ type: 'shuffleStack', stackIndex: idx })
      setSearch(false)
      setPaidRes([])
      closeStackBrowse()
    }
  }
  // Shuffling closes the browser so the shuffler can't see/memorise the new order.
  const shuffleAndClose = () => {
    dispatch({ type: 'shuffleStack', stackIndex: idx })
    playSfx('flip')
    closeStackBrowse()
  }

  return (
    <div className="sb-scrim" role="dialog" aria-modal="true" aria-label={`Browse draw stack ${idx + 1}`} onClick={close}>
      <div className="sb-panel" onClick={(e) => e.stopPropagation()}>
        <header className="sb-head">
          <span className="sb-title">Stack {idx + 1} · {SET_LABEL[set]} · {stack.length} cards</span>
          <div className="sb-tools">
            {!search ? (
              <button className="sb-btn" title={`Pay ${SEARCH_COST} resources, take a card, then reshuffle`} onClick={startSearch}>🔎 Search (−{SEARCH_COST})</button>
            ) : (
              <button className="sb-btn" onClick={cancelSearch}>Cancel search</button>
            )}
            <button className="sb-btn" title="Shuffle this stack and close (you won't see the new order)" onClick={shuffleAndClose}>⤮ Shuffle</button>
            <button className="sb-x" onClick={close} aria-label="Close">✕</button>
          </div>
        </header>

        {search ? (
          <div className="sb-search">
            <span className="sb-put-label">
              {ready ? '✓ Paid — now take any card; the pile reshuffles.' : `Pay ${SEARCH_COST} resources to search (${paid}/${SEARCH_COST}):`}
            </span>
            {!ready && (
              <div className="sb-paybar">
                {RESOURCES.map((r) => {
                  const have = resourceTotalOf(me, r)
                  return (
                    <button key={r} className="sb-pay" disabled={have <= 0} title={`Pay 1 ${RLAB[r]}`} onClick={() => pay(r)}>
                      <span className="sb-pay-sw" style={{ background: `var(--res-${r})` }} />{RLAB[r]} {have}
                    </button>
                  )
                })}
              </div>
            )}
          </div>
        ) : (
          <p className="sb-hint">Top of the deck is on the right. Click a card to take it into {me.name}'s hand.</p>
        )}

        <div className="sb-cards">
          {stack.length === 0 && <span className="sb-empty">— empty —</span>}
          {stack.map((id, i) => {
            const card = getCard(id)
            if (!card) return null
            const art = cardArt(id)
            return (
              <button
                key={`${id}-${i}`}
                className={`sb-card${i === stack.length - 1 ? ' sb-top' : ''}${ready ? '' : ' sb-locked'}`}
                disabled={!ready}
                title={ready ? `${card.name} — take into hand` : 'Pay the search cost first'}
                onClick={() => take(i)}
              >
                {art ? <img src={art} alt={card.name} /> : <span>{card.name}</span>}
                {i === stack.length - 1 && <span className="sb-toptag">top</span>}
              </button>
            )
          })}
        </div>

        {!search && hand.length > 0 && (
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
