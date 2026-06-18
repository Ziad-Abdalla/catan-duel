import { useState } from 'react'
import type { Phase, PlayerId } from '../../types'
import { EVENT_TEXT, type EventFace } from '../../engine/dice'
import { getCard } from '../../data/cards'
import { CardView } from '../CardView'
import { useGame } from '../../store/gameStore'

const PHASES: { id: Phase; label: string; hint: string }[] = [
  { id: 'roll', label: 'Roll', hint: 'Roll the production & event dice.' },
  { id: 'action', label: 'Action', hint: 'Build, play cards, trade — in any order.' },
  { id: 'replenish', label: 'Replenish', hint: 'Draw back up to your hand limit from any stacks.' },
  { id: 'exchange', label: 'Exchange', hint: 'Optionally swap a hand card under a stack.' },
]

const EVENT_LABEL: Record<EventFace, string> = {
  brigand: '🗡 Brigand',
  trade: '⚖ Trade',
  celebration: '🎉 Celebration',
  'plentiful-harvest': '🌾 Plentiful Harvest',
  'event-card': '❓ Event Card',
}

function PipDie({ n, className = '' }: { n: number; className?: string }) {
  return <span className={`pipdie ${className}`}>{n}</span>
}

const prefersReducedMotion = () =>
  typeof window !== 'undefined' && !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

export function CenterColumn() {
  const state = useGame((s) => s.state)
  const dispatch = useGame((s) => s.dispatch)
  const roll = useGame((s) => s.roll)
  const active = state.activePlayer
  const [revealed, setRevealed] = useState<string | null>(null)
  const [rolling, setRolling] = useState(false)
  const [face, setFace] = useState(1)

  const phaseIdx = PHASES.findIndex((p) => p.id === state.phase)
  const isLastPhase = state.phase === 'exchange'
  const over = state.phase === 'gameover'

  /** Suspenseful roll: tumble the die for a beat, then resolve via the engine. */
  const doRoll = () => {
    if (rolling || over) return
    if (prefersReducedMotion()) {
      roll()
      return
    }
    setRolling(true)
    const iv = setInterval(() => setFace(1 + Math.floor(Math.random() * 6)), 80)
    setTimeout(() => {
      clearInterval(iv)
      setRolling(false)
      roll()
    }, 650)
  }

  const drawEvent = () => {
    const top = state.eventDeck[state.eventDeck.length - 1]
    setRevealed(top ?? null)
    dispatch({ type: 'drawEvent' })
  }

  return (
    <div className="center-col">
      {/* phase track */}
      <div className="phasebar" role="group" aria-label="Turn phase">
        {PHASES.map((ph, i) => (
          <div
            key={ph.id}
            className={`phase-step${state.phase === ph.id ? ' on' : ''}${i < phaseIdx ? ' done' : ''}`}
          >
            <span className="phase-n">{i + 1}</span>
            <span className="phase-l">{ph.label}</span>
          </div>
        ))}
      </div>
      <p className="phase-hint">{over ? 'Game over.' : PHASES[Math.max(0, phaseIdx)].hint}</p>

      {/* dice */}
      <div className="dice-box">
        <button className="btn btn-roll" disabled={over || rolling} onClick={doRoll}>
          🎲 {rolling ? 'Rolling…' : 'Roll dice'}
        </button>
        {rolling && (
          <div className="roll-result">
            <div className="roll-prod">
              <PipDie n={face} className="tumbling" />
              <span className="roll-cap">the dice tumble…</span>
            </div>
          </div>
        )}
        {!rolling && state.lastRoll && (
          <div className="roll-result">
            <div className="roll-prod">
              <PipDie key={state.turn} n={state.lastRoll.production} className="settled" />
              <span className="roll-cap">
                Regions showing <b>{state.lastRoll.production}</b> produce 1 — both players.
              </span>
              <button className="btn btn-sm" onClick={() => dispatch({ type: 'applyProduction' })}>
                Apply to matching regions
              </button>
            </div>
            <div className="roll-event">
              <span className="event-badge">{EVENT_LABEL[state.lastRoll.event as EventFace]}</span>
              <span className="event-text">{EVENT_TEXT[state.lastRoll.event as EventFace]}</span>
              {state.lastRoll.event === 'event-card' && (
                <button className="btn btn-sm" onClick={drawEvent}>
                  Draw event card
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {revealed && getCard(revealed) && (
        <div className="event-reveal">
          <div className="event-reveal-head">
            <span>Event drawn</span>
            <button className="btn btn-ghost" onClick={() => setRevealed(null)}>
              ✕
            </button>
          </div>
          <CardView card={getCard(revealed)!} />
        </div>
      )}

      {/* decks */}
      <div className="decks">
        <span className="decks-title">Draw stacks → active player ({state.players[active].name})</span>
        <div className="deck-row">
          {state.drawStacks.map((st, i) => (
            <button
              key={i}
              className="deck"
              disabled={st.length === 0 || over}
              title={`Draw the top card of stack ${i + 1}`}
              onClick={() => dispatch({ type: 'drawToHand', player: active, stackIndex: i })}
            >
              <span className="deck-back">{i + 1}</span>
              <span className="deck-count">{st.length}</span>
            </button>
          ))}
        </div>
        <div className="deck-row deck-row-special">
          <button
            className="deck deck-region"
            disabled={state.regionStack.length === 0 || over}
            title="Draw a new region into the active principality"
            onClick={() => dispatch({ type: 'drawRegion', player: active })}
          >
            <span className="deck-back">⬡</span>
            <span className="deck-label">Region</span>
            <span className="deck-count">{state.regionStack.length}</span>
          </button>
          <div className="deck deck-event" title="Event deck (drawn on an Event-Card roll)">
            <span className="deck-back">❓</span>
            <span className="deck-label">Events</span>
            <span className="deck-count">{state.eventDeck.length}</span>
          </div>
        </div>
      </div>

      {/* advantage tokens */}
      <div className="tokens-assign">
        <TokenRow token="hero" label="⚔ Strength advantage" />
        <TokenRow token="trade" label="⚖ Trade advantage" />
      </div>

      {/* turn controls */}
      <div className="turn-controls">
        <span className="turn-n">Turn {state.turn}</span>
        <button
          className="btn"
          disabled={over || isLastPhase || state.phase === 'roll'}
          onClick={() => dispatch({ type: 'nextPhase' })}
        >
          Next phase →
        </button>
        <button
          className="btn btn-primary"
          disabled={over}
          onClick={() => {
            setRevealed(null)
            dispatch({ type: 'endTurn' })
          }}
        >
          End turn ⤳
        </button>
      </div>
    </div>
  )
}

function TokenRow({ token, label }: { token: 'hero' | 'trade'; label: string }) {
  const dispatch = useGame((s) => s.dispatch)
  const key = token === 'hero' ? 'hasHeroToken' : 'hasTradeToken'
  const holder: PlayerId | null = useGame((s) =>
    s.state.players.p0[key] ? 'p0' : s.state.players.p1[key] ? 'p1' : null,
  )
  const n0 = useGame((s) => s.state.players.p0.name)
  const n1 = useGame((s) => s.state.players.p1.name)
  return (
    <div className="token-row">
      <span className="token-label">{label}</span>
      <div className="token-pick">
        <button className={`chip${holder === 'p0' ? ' on' : ''}`} onClick={() => dispatch({ type: 'setToken', player: 'p0', token })}>
          {n0}
        </button>
        <button className={`chip${holder === 'p1' ? ' on' : ''}`} onClick={() => dispatch({ type: 'setToken', player: 'p1', token })}>
          {n1}
        </button>
        <button className={`chip${holder === null ? ' on' : ''}`} onClick={() => dispatch({ type: 'setToken', player: null, token })}>
          None
        </button>
      </div>
    </div>
  )
}
