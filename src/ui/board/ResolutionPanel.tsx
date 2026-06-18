import { useEffect, useRef, useState } from 'react'
import type { PlayerId, ResourceType, Stat } from '../../types'
import { RESOURCES } from '../../types'
import { getCard, cardArt, CARDS, requirementOf, displaySummary } from '../../data/cards'
import {
  computeStats,
  resourceTotal,
  resourceTotalOf,
  suggestAdvantage,
  type Action,
} from '../../engine/actions'
import { requirementMet } from '../../engine/requirements'
import {
  effectFor,
  EVENT_EFFECTS,
  quickToActions,
  FOCUS_KINDS,
  type QuickAction,
  type EffectStep,
} from '../../engine/effects'
import { EVENT_DIE_FACES, type EventFace } from '../../engine/dice'
import { EventSymbol, EVENT_NAME, EVENT_COLOR, PipDie } from './diceart'
import { useGame } from '../../store/gameStore'
import { useUI } from '../../store/uiStore'
import { playSfx } from '../../audio/sfx'
import './resolution.css'

const RLAB: Record<ResourceType, string> = {
  lumber: 'Lumber',
  brick: 'Brick',
  wool: 'Wool',
  grain: 'Wheat',
  ore: 'Ore',
  gold: 'Gold',
}
const STATS: Stat[] = ['strength', 'skill', 'commerce', 'progress']
const STAT_GLYPH: Record<Stat, string> = { strength: '⚔', skill: '✦', commerce: '⚖', progress: '⚙' }

type FocusKey = 'dice' | 'cards' | 'advantages' | null

function ResSwatch({ res, onClick, title }: { res: ResourceType; onClick?: () => void; title?: string }) {
  return (
    <button className="rl-swatch" style={{ background: `var(--res-${res})` }} title={title ?? RLAB[res]} onClick={onClick}>
      {RLAB[res][0]}
    </button>
  )
}

/** A row of the six resources to pick from (for "of your choice" effects). */
function ResourcePicker({ onPick }: { onPick: (r: ResourceType) => void }) {
  return (
    <div className="rl-picker" role="group" aria-label="Choose a resource">
      {RESOURCES.map((r) => (
        <ResSwatch key={r} res={r} onClick={() => onPick(r)} title={`Choose ${RLAB[r]}`} />
      ))}
    </div>
  )
}

function StepButton({
  qa,
  owner,
  run,
  focus,
}: {
  qa: QuickAction
  owner: PlayerId
  run: (a: Action[]) => void
  focus: (qa: QuickAction) => void
}) {
  const [picking, setPicking] = useState(false)
  const needsResource = qa.kind === 'gainChoice' || qa.kind === 'steal' || qa.kind === 'give'
  const onClick = () => {
    if (FOCUS_KINDS.has(qa.kind)) return focus(qa)
    if (needsResource) return setPicking((p) => !p)
    run(quickToActions(qa, owner))
  }
  return (
    <span className="rl-stepbtn-wrap">
      <button className="rl-quick" onClick={onClick}>
        {qa.label}
      </button>
      {picking && (
        <ResourcePicker
          onPick={(r) => {
            run(quickToActions(qa, owner, r))
            setPicking(false)
          }}
        />
      )}
    </span>
  )
}

function Steps({
  steps,
  owner,
  run,
  focus,
}: {
  steps: EffectStep[]
  owner: PlayerId
  run: (a: Action[]) => void
  focus: (qa: QuickAction) => void
}) {
  return (
    <ol className="rl-steps">
      {steps.map((s, i) => (
        <li key={i} className="rl-step">
          <p className="rl-step-text">{s.text}</p>
          {s.quick && s.quick.length > 0 && (
            <div className="rl-step-actions">
              {s.quick.map((qa, j) => (
                <StepButton key={j} qa={qa} owner={owner} run={run} focus={focus} />
              ))}
            </div>
          )}
        </li>
      ))}
    </ol>
  )
}

/** Signature element: the two-column resource ledger with a player↔player gutter. */
function Ledger() {
  const players = useGame((s) => s.state.players)
  const dispatch = useGame((s) => s.dispatch)
  const [xfer, setXfer] = useState<ResourceType>('lumber')
  const ids: PlayerId[] = ['p0', 'p1']

  const move = (from: PlayerId, to: PlayerId) =>
    dispatch({ type: 'transferResource', from, to, resource: xfer, count: 1 })

  return (
    <div className="rl-ledger">
      {ids.map((id, col) => {
        const p = players[id]
        const total = resourceTotal(p)
        return (
          <div key={id} className={`rl-col rl-col-${id}${col === 1 ? ' rl-col-right' : ''}`}>
            <div className="rl-col-head">
              <span className="rl-col-name">{p.name}</span>
              <span className={`rl-total${total > 7 ? ' over' : ''}`} title="Total resources held">
                {total}
                {total > 7 && <small> &gt;7</small>}
              </span>
            </div>
            {RESOURCES.map((r) => {
              const n = resourceTotalOf(p, r)
              return (
                <div key={r} className="rl-resrow">
                  <ResSwatch res={r} />
                  <span className="rl-resname">{RLAB[r]}</span>
                  <span className="rl-spacer" />
                  <button className="rl-pm" title={`Remove 1 ${RLAB[r]}`} onClick={() => dispatch({ type: 'addResource', player: id, resource: r, count: -1 })}>
                    −
                  </button>
                  <span className="rl-resn">{n}</span>
                  <button className="rl-pm" title={`Add 1 ${RLAB[r]}`} onClick={() => dispatch({ type: 'addResource', player: id, resource: r, count: 1 })}>
                    ＋
                  </button>
                </div>
              )
            })}
          </div>
        )
      })}

      {/* central transfer gutter */}
      <div className="rl-gutter">
        <span className="rl-gutter-label">Transfer</span>
        <div className="rl-gutter-swatches">
          {RESOURCES.map((r) => (
            <button
              key={r}
              className={`rl-swatch rl-mini${xfer === r ? ' sel' : ''}`}
              style={{ background: `var(--res-${r})` }}
              title={RLAB[r]}
              onClick={() => setXfer(r)}
            >
              {RLAB[r][0]}
            </button>
          ))}
        </div>
        <div className="rl-gutter-dirs">
          <button className="rl-dir" onClick={() => move('p1', 'p0')} title={`Move 1 ${RLAB[xfer]} to ${players.p0.name}`}>
            ◀ to {players.p0.name}
          </button>
          <button className="rl-dir" onClick={() => move('p0', 'p1')} title={`Move 1 ${RLAB[xfer]} to ${players.p1.name}`}>
            to {players.p1.name} ▶
          </button>
        </div>
      </div>
    </div>
  )
}

function DiceTool({ presetEvent, hot }: { presetEvent?: EventFace; hot: boolean }) {
  const lastRoll = useGame((s) => s.state.lastRoll)
  const dispatch = useGame((s) => s.dispatch)
  const [prod, setProd] = useState<number>(lastRoll?.production ?? 1)
  const [evt, setEvt] = useState<EventFace>((presetEvent ?? (lastRoll?.event as EventFace) ?? 'plentiful-harvest'))
  useEffect(() => {
    if (presetEvent) setEvt(presetEvent)
  }, [presetEvent])
  return (
    <section className={`rl-section${hot ? ' hot' : ''}`} id="rl-dice">
      <h4 className="rl-h">Dice</h4>
      <div className="rl-dice-row">
        <span className="rl-mini-label">Production</span>
        {[1, 2, 3, 4, 5, 6].map((n) => (
          <button key={n} className={`rl-die${prod === n ? ' sel' : ''}`} onClick={() => setProd(n)}>
            <PipDie n={n} />
          </button>
        ))}
      </div>
      <div className="rl-dice-row">
        <span className="rl-mini-label">Event</span>
        {EVENT_DIE_FACES.filter((f, i) => EVENT_DIE_FACES.indexOf(f) === i).map((f) => (
          <button
            key={f}
            className={`rl-evt${evt === f ? ' sel' : ''}`}
            title={EVENT_NAME[f]}
            style={{ ['--evt-bg' as string]: EVENT_COLOR[f] }}
            onClick={() => setEvt(f)}
          >
            <EventSymbol face={f} />
          </button>
        ))}
      </div>
      <div className="rl-dice-row">
        <button className="rl-apply" onClick={() => dispatch({ type: 'setDice', production: prod, event: evt })}>
          Override current roll
        </button>
        <button className="rl-apply alt" onClick={() => dispatch({ type: 'roll', production: prod, event: evt })}>
          Set as this turn's roll
        </button>
      </div>
    </section>
  )
}

function ScoringTool() {
  const players = useGame((s) => s.state.players)
  const dispatch = useGame((s) => s.dispatch)
  const ids: PlayerId[] = ['p0', 'p1']
  return (
    <section className="rl-section">
      <h4 className="rl-h">Scoring &amp; stats</h4>
      <div className="rl-stats-grid">
        {ids.map((id) => {
          const st = computeStats(players[id])
          return (
            <div key={id} className={`rl-statcol rl-col-${id}`}>
              <div className="rl-statname">{players[id].name}</div>
              <div className="rl-statrow">
                <span className="rl-statlab">{st.vp} VP</span>
                <button className="rl-pm" onClick={() => dispatch({ type: 'adjustVP', player: id, delta: -1 })}>
                  −
                </button>
                <button className="rl-pm" onClick={() => dispatch({ type: 'adjustVP', player: id, delta: 1 })}>
                  ＋
                </button>
              </div>
              {STATS.map((stat) => (
                <div key={stat} className="rl-statrow">
                  <span className="rl-statlab">
                    {st[stat]} {STAT_GLYPH[stat]} <em>{stat}</em>
                  </span>
                  <button className="rl-pm" onClick={() => dispatch({ type: 'adjustStat', player: id, stat, delta: -1 })}>
                    −
                  </button>
                  <button className="rl-pm" onClick={() => dispatch({ type: 'adjustStat', player: id, stat, delta: 1 })}>
                    ＋
                  </button>
                </div>
              ))}
            </div>
          )
        })}
      </div>
    </section>
  )
}

function AdvantageTool({ hot }: { hot: boolean }) {
  const state = useGame((s) => s.state)
  const dispatch = useGame((s) => s.dispatch)
  const sug = suggestAdvantage(state)
  const rows: { token: 'hero' | 'trade'; label: string; holder: PlayerId | null; suggested: PlayerId | null }[] = [
    { token: 'hero', label: 'Strength', holder: state.players.p0.hasHeroToken ? 'p0' : state.players.p1.hasHeroToken ? 'p1' : null, suggested: sug.hero },
    { token: 'trade', label: 'Trade', holder: state.players.p0.hasTradeToken ? 'p0' : state.players.p1.hasTradeToken ? 'p1' : null, suggested: sug.trade },
  ]
  const name = (id: PlayerId | null) => (id ? state.players[id].name : 'Centre')
  return (
    <section className={`rl-section${hot ? ' hot' : ''}`} id="rl-advantages">
      <h4 className="rl-h">Advantages</h4>
      {rows.map((r) => (
        <div key={r.token} className="rl-advrow">
          <span className="rl-advlabel">{r.label}</span>
          <div className="rl-advpick">
            {(['p0', null, 'p1'] as (PlayerId | null)[]).map((opt, i) => (
              <button
                key={i}
                className={`rl-chip${r.holder === opt ? ' on' : ''}`}
                onClick={() => dispatch({ type: 'setToken', player: opt, token: r.token })}
              >
                {opt ? state.players[opt].name : 'Centre'}
              </button>
            ))}
          </div>
          <span className="rl-suggest" title="Trust-based suggestion from the tallies — not enforced">
            {r.suggested ? `suggests ${name(r.suggested)}` : 'no clear leader'}
          </span>
        </div>
      ))}
    </section>
  )
}

function CardTool({ owner, resolveFrom, cardId, placedIndex, hot }: { owner: PlayerId; resolveFrom: string; cardId?: string; placedIndex?: number; hot: boolean }) {
  const dispatch = useGame((s) => s.dispatch)
  const stacks = useGame((s) => s.state.drawStacks)
  const [grant, setGrant] = useState('')
  const sorted = [...CARDS].filter((c) => c.category !== 'region').sort((a, b) => a.name.localeCompare(b.name))
  return (
    <section className={`rl-section${hot ? ' hot' : ''}`} id="rl-cards">
      <h4 className="rl-h">Cards</h4>
      <div className="rl-cardgrant">
        <select className="rl-select" value={grant} onChange={(e) => setGrant(e.target.value)}>
          <option value="">Choose a card…</option>
          {sorted.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name} · {c.set}
            </option>
          ))}
        </select>
        {(['p0', 'p1'] as PlayerId[]).map((id) => (
          <button key={id} className="rl-quick" disabled={!grant} onClick={() => grant && dispatch({ type: 'grantCard', player: id, cardId: grant })}>
            → {id === owner ? 'your' : "opp's"} hand
          </button>
        ))}
      </div>
      {cardId && resolveFrom === 'hand' && (
        <div className="rl-cardthis">
          <span className="rl-mini-label">This card</span>
          {[0, 1, 2, 3].map((i) => (
            <button key={i} className="rl-quick" disabled={!stacks[i]} onClick={() => dispatch({ type: 'discardToStack', player: owner, cardId, stackIndex: i })}>
              discard → stack {i + 1}
            </button>
          ))}
        </div>
      )}
      {resolveFrom === 'play' && placedIndex != null && (
        <div className="rl-cardthis">
          <span className="rl-mini-label">This card</span>
          <button className="rl-quick" onClick={() => dispatch({ type: 'returnToHand', player: owner, placedIndex })}>
            return to hand
          </button>
          <button className="rl-quick" onClick={() => dispatch({ type: 'removePlaced', player: owner, placedIndex })}>
            remove from play
          </button>
        </div>
      )}
    </section>
  )
}

function NoteTool({ owner }: { owner: PlayerId }) {
  const dispatch = useGame((s) => s.dispatch)
  const [text, setText] = useState('')
  const add = () => {
    if (!text.trim()) return
    dispatch({ type: 'logNote', player: owner, text: text.trim() })
    setText('')
    playSfx('ui')
  }
  return (
    <section className="rl-section">
      <h4 className="rl-h">Log a note</h4>
      <div className="rl-note">
        <input
          className="rl-noteinput"
          placeholder="e.g. Brigand: P1 over 7 — lost gold + wool"
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && add()}
        />
        <button className="rl-quick" onClick={add}>
          Add
        </button>
      </div>
    </section>
  )
}

/**
 * The universal resolution panel. Opens when a card is played/activated or an
 * event is resolved. Shows the full rules text + coded suggested steps + the
 * universal manual toolkit (resources, dice, scoring, cards, advantages, notes).
 * Everything dispatches through the pure reducer, so it broadcasts online and is
 * undoable. This is the guaranteed fallback — no card is ever a dead end.
 */
export function ResolutionPanel() {
  const resolve = useUI((s) => s.resolve)
  const close = useUI((s) => s.closeResolve)
  const state = useGame((s) => s.state)
  const dispatch = useGame((s) => s.dispatch)
  const undo = useGame((s) => s.undo)
  const canUndo = useGame((s) => s.history.length > 0)
  const [focus, setFocus] = useState<FocusKey>(null)
  const [presetEvent, setPresetEvent] = useState<EventFace | undefined>(undefined)
  const scroller = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!resolve) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && close()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [resolve, close])

  if (!resolve) return null
  const owner = resolve.player
  const card = resolve.cardId ? getCard(resolve.cardId) : undefined
  const steps: EffectStep[] | null = resolve.event
    ? EVENT_EFFECTS[resolve.event]
    : card
      ? effectFor(card.id)
      : null

  const run = (actions: Action[]) => {
    if (actions.length === 0) return
    actions.forEach((a) => dispatch(a))
    playSfx('ui')
  }

  const onFocus = (qa: QuickAction) => {
    const key: FocusKey = qa.kind === 'setDie' ? 'dice' : qa.kind === 'grant' ? 'cards' : 'advantages'
    if (qa.kind === 'setDie' && 'event' in qa && qa.event) setPresetEvent(qa.event)
    setFocus(key)
    requestAnimationFrame(() => document.getElementById(`rl-${key}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' }))
    setTimeout(() => setFocus(null), 1600)
  }

  const title = resolve.event ? EVENT_NAME[resolve.event] : (card?.name ?? 'Resolve effect')
  const rules = resolve.event ? undefined : card ? displaySummary(card) : undefined
  const req = card ? requirementOf(card) : null
  const met = card ? requirementMet(card, state, owner) : null

  return (
    <div className="rl-scrim" role="dialog" aria-modal="true" aria-label={`Resolve ${title}`} onClick={close}>
      <div className="rl-panel" onClick={(e) => e.stopPropagation()}>
        <button className="rl-x" onClick={close} aria-label="Close">
          ✕
        </button>

        {/* header */}
        <header className="rl-head">
          {resolve.event ? (
            <span className="rl-evt-disc" style={{ ['--evt-bg' as string]: EVENT_COLOR[resolve.event] }}>
              <EventSymbol face={resolve.event} />
            </span>
          ) : card && cardArt(card.id) ? (
            <img className="rl-head-art" src={cardArt(card.id)} alt={card.name} />
          ) : null}
          <div className="rl-head-text">
            <h3 className="rl-title">{title}</h3>
            <span className="rl-owner">resolving for {state.players[owner].name}</span>
            {req && (
              <span className={`rl-req${met == null ? '' : met ? ' met' : ' unmet'}`}>
                Requires: {req} {met != null && (met ? '✓' : '✗')}
              </span>
            )}
          </div>
        </header>

        {rules && <p className="rl-rules">{rules}</p>}

        <div className="rl-body" ref={scroller}>
          {steps && steps.length > 0 ? (
            <section className="rl-section rl-suggested">
              <h4 className="rl-h">Suggested steps</h4>
              <Steps steps={steps} owner={owner} run={run} focus={onFocus} />
            </section>
          ) : (
            <p className="rl-fallback">
              No coded shortcut for this card — enact its effect by hand with the toolkit below. Nothing is enforced.
            </p>
          )}

          <section className="rl-section">
            <h4 className="rl-h">Resources</h4>
            <Ledger />
          </section>

          <DiceTool presetEvent={presetEvent} hot={focus === 'dice'} />
          <ScoringTool />
          <AdvantageTool hot={focus === 'advantages'} />
          <CardTool owner={owner} resolveFrom={resolve.from} cardId={resolve.cardId} placedIndex={resolve.placedIndex} hot={focus === 'cards'} />
          <NoteTool owner={owner} />
        </div>

        <footer className="rl-foot">
          <button className="rl-undo" disabled={!canUndo} onClick={() => undo()} title="Undo the last change">
            ↶ Undo
          </button>
          <button className="rl-done" onClick={close}>
            Done
          </button>
        </footer>
      </div>
    </div>
  )
}
