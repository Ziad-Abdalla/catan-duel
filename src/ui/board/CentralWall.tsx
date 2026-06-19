import { type MouseEvent as ReactMouseEvent } from 'react'
import type { Phase } from '../../types'
import { EVENT_TEXT, type EventFace } from '../../engine/dice'
import { cardArt, getCard } from '../../data/cards'
import { AdvantageControl } from './TokenLayer'
import { PipDie, EventSymbol, EVENT_COLOR, EVENT_NAME } from './diceart'
import { useGame } from '../../store/gameStore'
import { useUI } from '../../store/uiStore'
import { playSfx } from '../../audio/sfx'

const prefersReducedMotion = () =>
  typeof window !== 'undefined' && !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

const SET_LABEL: Record<'base' | 'gold' | 'turmoil' | 'progress', string> = {
  base: 'Basic',
  gold: 'Era of Gold',
  turmoil: 'Era of Turmoil',
  progress: 'Innovation',
}

const PHASES: { id: Phase; label: string }[] = [
  { id: 'roll', label: 'Roll' },
  { id: 'action', label: 'Action' },
  { id: 'replenish', label: 'Replenish' },
  { id: 'exchange', label: 'Exchange' },
]

/** The central wall: card stacks, dice tray, phase track, turn controls, tokens. */
export function CentralWall() {
  const state = useGame((s) => s.state)
  const dispatch = useGame((s) => s.dispatch)
  const roll = useGame((s) => s.roll)
  const undo = useGame((s) => s.undo)
  const canUndo = useGame((s) => s.history.length > 0)
  const active = state.activePlayer
  const over = state.phase === 'gameover'
  const phaseIdx = PHASES.findIndex((p) => p.id === state.phase)

  const addFlight = useUI((s) => s.addFlight)
  const openResolve = useUI((s) => s.openResolve)
  const revealedRoll = useUI((s) => s.revealedRoll)

  // the roll result is "written" in the wall only once the felt dice have settled
  const shown =
    state.lastRoll && revealedRoll && revealedRoll.turn === state.turn ? state.lastRoll : null
  const tumbling = !!state.lastRoll && !shown

  /** Fly the drawn card from the deck to the hand, then draw it. */
  const drawWithFlight = (stackIndex: number, e: ReactMouseEvent<HTMLButtonElement>) => {
    const stack = state.drawStacks[stackIndex]
    const top = stack?.[stack.length - 1]
    const art = top && cardArt(top)
    const handEl = document.getElementById('hand-target')
    if (art && handEl && !prefersReducedMotion()) {
      const d = e.currentTarget.getBoundingClientRect()
      const h = handEl.getBoundingClientRect()
      addFlight({
        art,
        fx: d.left + d.width / 2,
        fy: d.top + d.height / 2,
        tx: h.left + h.width / 2,
        ty: h.top + h.height / 2,
        w: d.width,
      })
    }
    dispatch({ type: 'drawToHand', player: active, stackIndex })
    playSfx('flip')
  }

  // Draw the top event card — the synced EventPopup shows it (and plays the
  // flip cue) on BOTH screens, so no extra sound here (avoids a double tick).
  const drawEvent = () => {
    dispatch({ type: 'drawEvent' })
  }

  /** Draw the top of the shared discard pile into the active player's hand. */
  const drawFromDiscard = () => {
    if (state.discard.length === 0) return
    dispatch({ type: 'drawFromDiscard', player: active })
    playSfx('flip')
  }

  return (
    <div className="wall">
      {/* left: phase + turn */}
      <div className="wall-flow">
        <div className="phase-rail">
          {PHASES.map((ph, i) => (
            <div key={ph.id} className={`prail-step${state.phase === ph.id ? ' on' : ''}${i < phaseIdx ? ' done' : ''}`}>
              <b>{i + 1}</b>
              <span>{ph.label}</span>
            </div>
          ))}
        </div>
        <div className="turn-row">
          <span className="turn-tag">Turn {state.turn}</span>
          <button className="wbtn" disabled={over || state.phase === 'exchange' || state.phase === 'roll'} onClick={() => dispatch({ type: 'nextPhase' })}>
            Next phase
          </button>
          <button className="wbtn wbtn-undo" disabled={!canUndo} title="Undo the last change (trust-based fat-finger recovery)" onClick={() => { undo(); playSfx('ui') }}>
            ↶ Undo
          </button>
          <button className="wbtn wbtn-end" disabled={over} onClick={() => dispatch({ type: 'endTurn' })}>
            End turn
          </button>
        </div>
      </div>

      {/* center: the deck wall — each draw pile shows its set's card back */}
      <div className="deckwall">
        {state.drawStacks.map((st, i) => {
          const set = (st[0]?.split('-')[0] ?? 'base') as 'base' | 'gold' | 'turmoil' | 'progress'
          return (
            <button
              key={i}
              className={`cardstack cs-set-${set}`}
              disabled={st.length === 0 || over}
              title={`Draw from the ${SET_LABEL[set]} deck to ${state.players[active].name}`}
              onClick={(e) => drawWithFlight(i, e)}
            >
              <span className="cs-emblem" aria-hidden />
              <span className="cs-count">{st.length}</span>
            </button>
          )
        })}
        <div className="cardstack cs-event" title="Event deck">
          <span className="cs-face">?</span>
          <span className="cs-count">{state.eventDeck.length}</span>
        </div>
        <button
          className="cardstack cs-discard"
          disabled={state.discard.length === 0 || over}
          title={
            state.discard.length
              ? `Discard pile — draw the top card (${getCard(state.discard[state.discard.length - 1])?.name ?? '?'}) to ${state.players[active].name}`
              : 'Discard pile (empty)'
          }
          onClick={drawFromDiscard}
        >
          <span className="cs-face">♺</span>
          <span className="cs-count">{state.discard.length}</span>
        </button>
      </div>

      {/* roll + outcome — the result is written here once the felt dice settle */}
      <div className="wall-roll">
        {state.phase === 'roll' && !state.lastRoll ? (
          <button className="wbtn wbtn-roll" disabled={over} onClick={() => roll()}>
            Roll dice
          </button>
        ) : tumbling ? (
          <span className="wo-pending">the dice are rolling…</span>
        ) : shown ? (
          <div className="wall-outcome">
            <div className="wo-evt" title={EVENT_TEXT[shown.event as EventFace]}>
              <span className="wo-evt-disc" style={{ ['--evt-bg' as string]: EVENT_COLOR[shown.event as EventFace] }}>
                <EventSymbol face={shown.event as EventFace} />
              </span>
              <span className="wo-evt-name">{EVENT_NAME[shown.event as EventFace]}</span>
            </div>
            <div className="wo-prod">
              <PipDie n={shown.production} />
              <span className="wo-evt-name">rolled {shown.production}</span>
            </div>
            <div className="wo-actions">
              <button className="wbtn wbtn-sm" onClick={() => { dispatch({ type: 'applyProduction' }); playSfx('place') }}>
                Produce {shown.production}
              </button>
              <button
                className="wbtn wbtn-sm wbtn-resolve"
                title="Open the resolution panel for this event"
                onClick={() => openResolve({ player: active, from: 'event', event: shown.event as EventFace })}
              >
                Resolve {EVENT_NAME[shown.event as EventFace]}
              </button>
              {shown.event === 'event-card' && (
                <button className="wbtn wbtn-sm" onClick={drawEvent}>Draw event card</button>
              )}
            </div>
          </div>
        ) : (
          <span className="wo-pending">rolled this turn</span>
        )}
      </div>

      {/* advantage tokens — compact controls; the disc sits on the holder's plate */}
      <div className="tokpost">
        <AdvantageControl kind="hero" label="Strength" />
        <AdvantageControl kind="trade" label="Trade" />
      </div>

    </div>
  )
}
