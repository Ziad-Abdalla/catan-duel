// "Play vs AI" on the EXACT real board, with YOU as the clock.
//
// Turns run in explicit phases: Roll → Build → Refill → Exchange. You advance every
// phase (even on the AI's turn) with the "Next phase" button. On the AI's turn the AI
// does its work WITHIN each phase and a red/green light tells you when it has finished
// (red = working, green = done → click Next). Production and the die event resolve for
// BOTH players during the Roll phase; structural events (Feud / Fraternal Feuds /
// Riots) reconcile real cards on the board. The board never flips — you stay at the
// bottom (TableBoard `fixedBottom`).

import { useEffect, useRef, useState } from 'react'
import { useGame } from '../../store/gameStore'
import { useUI } from '../../store/uiStore'
import { TableBoard } from '../../ui/board/TableBoard'
import type { Action } from '../../engine/actions'
import type { SetId, PlayerId } from '../../types'
import {
  rollForAi, productionTotals, eventTotals, cardEventTotals, planAiActions,
  reconcileDeltas, structuralActions, refillActions, exchangeActions,
  humanEventChoice, handLimit, liveCenters, freeBuildingSlot, LIVE_TO_SIM, type Seat,
} from './aiController'
import type { Difficulty } from '../agent/difficulty'
import '../ui/ai-mode.css'

const ERAS: { id: SetId; label: string }[] = [
  { id: 'gold', label: 'Era of Gold' }, { id: 'turmoil', label: 'Era of Turmoil' }, { id: 'progress', label: 'Era of Progress' },
]
interface Config { aiSeat: PlayerId; difficulty: Difficulty }
type Phase = 'roll' | 'build' | 'refill' | 'exchange'
const PHASES: Phase[] = ['roll', 'build', 'refill', 'exchange']
const PHASE_LABEL: Record<Phase, string> = { roll: 'Roll', build: 'Build', refill: 'Refill', exchange: 'Exchange' }
const EVENT_NAME: Record<string, string> = {
  'event-card': 'Event card', 'plentiful-harvest': 'Plentiful Harvest', celebration: 'Celebration', trade: 'Trade', brigand: 'Brigand!',
}

// pacing (ms)
const T_THINK = 700, T_DICE = 3400, T_PRODUCE = 750, T_EVENT = 900, T_BUILD = 750, T_REFILL = 420

export default function AiTableMode() {
  const [started, setStarted] = useState(false)
  const [phase, setPhaseState] = useState<Phase>('roll')
  const [working, setWorkingState] = useState(false)
  const [rollResolved, setRollResolvedState] = useState(false)
  const [banner, setBanner] = useState('')

  const cfg = useRef<Config>({ aiSeat: 'p1', difficulty: 'medium' })
  const rng = useRef({ v: 1 })
  const gen = useRef(0)
  const phaseRef = useRef<Phase>('roll')
  const workingRef = useRef(false)
  const rollResolvedRef = useRef(false)
  const turnRef = useRef(0)
  // a "you still owe yourself this by hand" reminder for the current turn (from a
  // choice event); kept visible until the turn ends.
  const manualNote = useRef('')
  const stopped = useRef(false)
  const nextRef = useRef<() => void>(() => {})

  const winner = useGame((s) => s.state.winner)
  const activePlayer = useGame((s) => s.state.activePlayer)
  const hostRef = useRef<HTMLDivElement>(null)

  // During the AI's turn, block only ACTION inputs (clicks/drags) on the board so a
  // stray click can't act for the AI — but leave scrolling, hovering and inspecting
  // fully free, so you can watch and look around.
  useEffect(() => {
    if (!started) return
    const isAiTurn = activePlayer === cfg.current.aiSeat && !winner
    const host = hostRef.current
    if (!isAiTurn || !host) return
    // Block only GAME-ACTION clicks (inside a principality or the central wall) so a
    // stray click can't build/roll/end for the AI. Everything else — the top HUD
    // (Log, music, settings), the audit drawer, card zoom, scrolling — stays usable.
    const block = (e: Event) => {
      const t = e.target as HTMLElement | null
      if (t && t.closest('.pboard, .wall')) { e.stopPropagation(); e.preventDefault() }
    }
    const types = ['click', 'dblclick', 'mousedown', 'pointerdown', 'dragstart', 'contextmenu']
    for (const t of types) host.addEventListener(t, block, true)
    return () => { for (const t of types) host.removeEventListener(t, block, true) }
  }, [started, activePlayer, winner])

  const setPhase = (p: Phase) => { phaseRef.current = p; setPhaseState(p) }
  const setWorking = (w: boolean) => { workingRef.current = w; setWorkingState(w) }
  const setRollResolved = (r: boolean) => { rollResolvedRef.current = r; setRollResolvedState(r) }

  useEffect(() => {
    if (!started) return
    stopped.current = false
    const myGen = gen.current
    const stale = () => stopped.current || gen.current !== myGen
    const get = () => useGame.getState().state
    const dispatch = (a: Action) => useGame.getState().dispatch(a)
    const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms))
    const aiSeat = () => cfg.current.aiSeat
    const human = (): PlayerId => (aiSeat() === 'p0' ? 'p1' : 'p0')

    const reconcileResources = (seat: PlayerId, target: Record<string, number>) => {
      for (const d of reconcileDeltas(get(), seat, target as never)) dispatch({ type: 'addResource', player: seat, resource: d.resource, count: d.count })
    }
    const applyStructural = (before: ReturnType<typeof get>, sim: Parameters<typeof structuralActions>[1], seat: PlayerId) => {
      for (const a of structuralActions(before, sim, seat)) dispatch(a)
    }
    const applyTokens = (tokens: { hero: Seat | null; trade: Seat | null }) => {
      dispatch({ type: 'setToken', player: tokens.hero, token: 'hero' })
      dispatch({ type: 'setToken', player: tokens.trade, token: 'trade' })
    }

    // apply ONE event's effects: the AI auto-takes its own resources; whatever YOU get
    // to choose ("take any resource") is left for you to add BY HAND on the board — a
    // banner tells you what. Forced/deterministic effects (Brigand loss, Plague, fixed
    // gains) still resolve automatically for both.
    function applyEvent(eventLive: string, eventSim: string, cardId: string | undefined, ev: ReturnType<typeof eventTotals>) {
      applyStructural(get(), ev.sim, aiSeat())
      applyStructural(get(), ev.sim, human())
      applyTokens(ev.tokens)
      const c = humanEventChoice(get(), eventSim, cardId, human(), aiSeat())
      if (c?.kind === 'steal') {
        // a steal is a transfer — leave BOTH sides for you to do by hand
        const note = `${EVENT_NAME[eventLive]}: take ${c.count} from the AI by hand`
        manualNote.current = note; setBanner(`✨ ${note} (rotate a region up, the AI's down)`)
        return
      }
      reconcileResources(aiSeat(), ev.totals[aiSeat() as Seat]) // AI takes its own
      if (c) {
        const n = c.count
        const note = c.kind === 'buy'
          ? `${EVENT_NAME[eventLive]}: you may buy up to ${n} (1🪙 each) by hand`
          : `${EVENT_NAME[eventLive]}: take ${n} resource${n > 1 ? 's' : ''} of your choice by hand`
        manualNote.current = note; setBanner(`✨ ${note}`)
      } else {
        reconcileResources(human(), ev.totals[human() as Seat]) // forced/deterministic → auto
      }
    }
    const withNote = (base: string) => (manualNote.current ? `${base}  ·  📝 ${manualNote.current}` : base)

    // ── Roll-phase resolution: production (auto, both) + die event (AI auto / you pick) ──
    async function resolveRoll(prod: number, eventLive: string) {
      const roller = get().activePlayer
      const eventSim = LIVE_TO_SIM[eventLive] ?? 'event'

      // Brigand resolves BEFORE production (and is forced — no choice)
      if (eventSim === 'brigand') {
        setBanner('⚔ Brigand! — anyone over 7 loses their gold + wool')
        await applyEvent(eventLive, 'brigand', undefined, eventTotals(get(), prod, 'brigand', roller as Seat))
        await sleep(T_EVENT); if (stale()) return
      }

      setBanner('🌾 Production — collecting from the regions')
      const prodT = productionTotals(get(), prod)
      reconcileResources(aiSeat(), prodT[aiSeat() as Seat]); await sleep(T_PRODUCE); if (stale()) return
      reconcileResources(human(), prodT[human() as Seat]); await sleep(T_PRODUCE); if (stale()) return

      if (eventSim === 'event') {
        setBanner('❓ Event card')
        dispatch({ type: 'drawEvent' }); await sleep(1300); if (stale()) return
        const id = get().revealedEvent
        if (id) { await applyEvent(eventLive, 'event', id, cardEventTotals(get(), id, roller as Seat)); if (stale()) return }
        // leave the event card on screen — YOU close it when you've read it (it's
        // replaced automatically the next time an event card is drawn)
      } else if (eventSim === 'trade' || eventSim === 'celebration' || eventSim === 'plenty') {
        setBanner(`✨ ${EVENT_NAME[eventLive]}`)
        await applyEvent(eventLive, eventSim, undefined, eventTotals(get(), prod, eventSim, roller as Seat))
        if (stale()) return
      }
    }

    // ── AI phase workers (each manages the working flag) ──
    async function aiRollPhase() {
      setWorking(true); setBanner('🤖 AI is rolling…')
      await sleep(T_THINK); if (stale()) return
      const roll = rollForAi(get(), cfg.current.difficulty, rng.current)
      useUI.getState().rollDice(roll.production, roll.eventLive, get().turn)
      dispatch({ type: 'roll', production: roll.production, event: roll.eventLive })
      setBanner('🎲 Rolling…'); await sleep(T_DICE); if (stale()) return
      await resolveRoll(roll.production, roll.eventLive); if (stale()) return
      setRollResolved(true); setWorking(false)
      setBanner(withNote('🤖 AI rolled & collected — press Next when ready ▶'))
    }
    async function aiBuildPhase() {
      setWorking(true); setBanner('🤖 AI is building…')
      const plan = planAiActions(get(), aiSeat(), cfg.current.difficulty, rng.current)
      for (let i = 0; i < plan.settlements; i++) { if (get().regionStack.length < 2) break; dispatch({ type: 'expandSpine', player: aiSeat() }); await sleep(T_BUILD); if (stale()) return }
      for (let i = 0; i < plan.extraRoads; i++) { dispatch({ type: 'buildPiece', player: aiSeat(), piece: 'road', end: 'right', pay: false }); await sleep(T_BUILD); if (stale()) return }
      for (let i = 0; i < plan.cities; i++) { const st = liveCenters(get(), aiSeat()).find((c) => c.kind === 'settlement'); if (!st) break; dispatch({ type: 'upgradeCity', player: aiSeat(), seat: st.seat, pay: false }); await sleep(T_BUILD); if (stale()) return }
      for (const cardId of plan.buildings) { if (!get().players[aiSeat()].hand.includes(cardId)) continue; dispatch({ type: 'playCard', player: aiSeat(), cardId, slot: freeBuildingSlot(get(), aiSeat()) ?? undefined, pay: false }); await sleep(T_BUILD); if (stale()) return }
      // action cards can affect the opponent → reconcile BOTH seats' resources + structure
      for (const seat of [aiSeat(), human()]) applyStructural(get(), plan.sim, seat)
      for (const seat of [aiSeat(), human()]) reconcileResources(seat, plan.totals[seat as Seat])
      applyTokens(plan.tokens)
      setWorking(false); setBanner('🤖 AI finished building — press Next when ready ▶')
    }
    async function refillPhase(ai: boolean) {
      if (ai) {
        setWorking(true); setBanner('🤖 AI is drawing back up to its hand limit…')
        for (const a of refillActions(get(), aiSeat())) { dispatch(a); await sleep(T_REFILL); if (stale()) return }
        setWorking(false); setBanner('🤖 AI refilled — press Next ▶')
        return
      }
      // YOUR refill is YOUR choice — draw from whichever stacks you like on the board
      const need = handLimit(get(), human()) - get().players[human()].hand.length
      setBanner(need > 0
        ? `🎴 Refill — draw ${need} card${need > 1 ? 's' : ''} from the stacks of your choice on the board, then Next ▶`
        : '🎴 Hand already at the limit — press Next ▶')
    }
    async function exchangePhase(ai: boolean) {
      setWorking(true)
      if (ai) { for (const a of exchangeActions(get(), get().activePlayer)) { dispatch(a); await sleep(T_REFILL); if (stale()) return } }
      setWorking(false)
      setBanner(ai ? '🤖 AI done — press End turn ▶' : '🔁 Exchange — optionally swap a card on the board, then End turn ▶')
    }

    async function enterPhase(p: Phase) {
      const ai = get().activePlayer === aiSeat()
      if (p === 'build') { if (ai) await aiBuildPhase(); else setBanner(withNote('🔨 Build — build & trade on the board, then Next ▶')) }
      else if (p === 'refill') await refillPhase(ai)
      else if (p === 'exchange') await exchangePhase(ai)
    }

    async function startTurn() {
      setWorking(false); setRollResolved(false); setPhase('roll'); manualNote.current = ''
      if (get().winner) { setBanner(''); return }
      if (get().activePlayer === aiSeat()) await aiRollPhase()
      else setBanner('🎲 Roll — press Roll on the board')
    }

    async function resolveHumanRoll(prod: number, event: string) {
      if (workingRef.current) return
      setWorking(true)
      // wait for the felt dice to finish tumbling before anything changes (the board's
      // Roll button started the same ~3.4s animation the AI uses)
      setBanner('🎲 Rolling…')
      await sleep(T_DICE); if (stale()) { setWorking(false); return }
      await resolveRoll(prod, event); if (stale()) return
      setRollResolved(true); setWorking(false)
      setBanner(withNote('✅ Production & event done — press Next: Build ▶'))
    }

    nextRef.current = () => {
      if (workingRef.current) return
      if (phaseRef.current === 'roll' && !rollResolvedRef.current) return
      const i = PHASES.indexOf(phaseRef.current)
      if (i >= PHASES.length - 1) { setBanner('— passing turn —'); dispatch({ type: 'endTurn' }); return }
      const next = PHASES[i + 1]; setPhase(next); void enterPhase(next)
    }

    turnRef.current = get().turn
    void startTurn()
    const unsub = useGame.subscribe(() => {
      if (stale()) return
      const s = get()
      if (s.turn !== turnRef.current) { turnRef.current = s.turn; void startTurn(); return }
      if (!s.winner && s.activePlayer !== aiSeat() && phaseRef.current === 'roll' && !rollResolvedRef.current && !workingRef.current && s.lastRoll) {
        void resolveHumanRoll(s.lastRoll.production, s.lastRoll.event)
      }
    })
    return () => { stopped.current = true; unsub() }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [started])

  if (!started) {
    return <Setup onStart={(c, sets) => {
      cfg.current = c
      rng.current = { v: ((typeof Date !== 'undefined' ? Date.now() : 1) & 0x7fffffff) >>> 0 }
      gen.current += 1
      useGame.getState().newHotseat({ enabledSets: sets, p0Name: c.aiSeat === 'p0' ? 'AI' : 'You', p1Name: c.aiSeat === 'p1' ? 'AI' : 'You' })
      setStarted(true)
    }} />
  }

  const aiTurn = activePlayer === cfg.current.aiSeat && !winner
  const ready = !working && (phase !== 'roll' || rollResolved) && !winner
  const onExchange = phase === 'exchange'

  return (
    <div className="ai-table-wrap">
      <div className="ai-phasebar">
        <span className="ai-pb-tag">vs AI · {cfg.current.difficulty} · you are {cfg.current.aiSeat === 'p0' ? 'P2' : 'P1'}</span>
        <div className="ai-phases">
          {PHASES.map((p) => <span key={p} className={`ai-phasechip ${phase === p ? 'on' : ''}`}>{PHASE_LABEL[p]}</span>)}
        </div>
        <span className="ai-light">
          <span className={`ai-dot ${ready ? 'green' : 'red'}`} />
          {aiTurn ? (working ? 'AI working…' : 'AI ready') : (ready ? 'ready' : 'waiting for your roll')}
        </span>
        <button className="ai-next" disabled={!ready} onClick={() => nextRef.current()}>
          {onExchange ? 'End turn ▶' : 'Next phase ▶'}
        </button>
        <a href="#/" className="ai-table-exit">exit</a>
      </div>
      <div className="ai-banner-row" title={banner}>{banner || ' '}</div>
      <div className={`ai-table-host${aiTurn ? ' ai-watching' : ''}`} ref={hostRef}>
        <TableBoard mode="local" setMode={(m) => { if (m !== 'local') window.location.hash = '#/' }} fixedBottom={human(cfg.current.aiSeat)} />
      </div>
    </div>
  )
}

function human(aiSeat: PlayerId): PlayerId { return aiSeat === 'p0' ? 'p1' : 'p0' }

function Setup({ onStart }: { onStart: (c: Config, sets: SetId[]) => void }) {
  const [difficulty, setDifficulty] = useState<Difficulty>('medium')
  const [aiSeat, setAiSeat] = useState<PlayerId>('p1')
  const [sets, setSets] = useState<Record<SetId, boolean>>({ base: true, gold: false, turmoil: false, progress: false })
  const toggle = (id: SetId) => setSets((s) => ({ ...s, [id]: !s[id] }))
  const enabled = (['gold', 'turmoil', 'progress'] as SetId[]).filter((id) => sets[id])
  return (
    <div className="ai-app">
      <header className="ai-header"><h1>Rivals — vs AI</h1><a className="ai-back" href="#/">← table</a></header>
      <div className="ai-setup">
        <p>Play on the real board, at your pace. Turns run in phases — Roll · Build ·
          Refill · Exchange — and <b>you</b> advance every phase with the Next button,
          even on the AI's turn. A red/green light tells you when the AI has finished
          the current phase. You always stay at the bottom of the table.</p>
        <label>Difficulty
          <select value={difficulty} onChange={(e) => setDifficulty(e.target.value as Difficulty)}>
            <option value="easy">Easy (heuristic)</option>
            <option value="medium">Medium (search)</option>
            <option value="hard">Hard (deep search)</option>
          </select>
        </label>
        <label>You play
          <select value={aiSeat} onChange={(e) => setAiSeat(e.target.value === 'p0' ? 'p1' : 'p0')}>
            <option value="p1">First (Player 1) — AI goes second</option>
            <option value="p0">Second (Player 2) — AI goes first</option>
          </select>
        </label>
        <div className="ai-setup-sets">
          <span>Expansion sets (base always on)</span>
          <div className="ai-setup-chips">
            {ERAS.map((e) => <button key={e.id} className={`ai-chip ${sets[e.id] ? 'on' : ''}`} onClick={() => toggle(e.id)}>{e.label}</button>)}
          </div>
        </div>
        <button className="ai-start" onClick={() => onStart({ aiSeat, difficulty }, enabled)}>Start game</button>
        <p className="ai-note">Production and dice events resolve for both players in the Roll phase; win target 7 / 12 / 13 VP.</p>
      </div>
    </div>
  )
}
