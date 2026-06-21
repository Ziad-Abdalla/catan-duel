// "Play vs AI" using the EXACT real board. Starts a hotseat game in the live store,
// renders the real <TableBoard>, and drives the AI's seat automatically via
// playAiTurn (which dispatches real store actions). The human plays their seat with
// the full, familiar UI; the AI plays its own turns, animated on the same board.

import { useEffect, useRef, useState } from 'react'
import { useGame } from '../../store/gameStore'
import { TableBoard } from '../../ui/board/TableBoard'
import type { SetId, PlayerId } from '../../types'
import { playAiTurn } from './aiController'
import type { Difficulty } from '../agent/difficulty'
import '../ui/ai-mode.css'

const ERAS: { id: SetId; label: string }[] = [
  { id: 'gold', label: 'Era of Gold' },
  { id: 'turmoil', label: 'Era of Turmoil' },
  { id: 'progress', label: 'Era of Progress' },
]

interface Config { aiSeat: PlayerId; difficulty: Difficulty }

export default function AiTableMode() {
  const [started, setStarted] = useState(false)
  const cfg = useRef<Config>({ aiSeat: 'p1', difficulty: 'medium' })
  const rng = useRef({ v: 1 })
  const acting = useRef(false)
  // bumped each time a NEW game starts; an in-flight AI turn aborts if its
  // generation is stale. Strict-mode's double-mount keeps the same generation, so
  // the first turn is NOT spuriously cancelled.
  const gen = useRef(0)

  const activePlayer = useGame((s) => s.state.activePlayer)
  const winner = useGame((s) => s.state.winner)
  const phase = useGame((s) => s.state.phase)

  // Drive the AI's turn. Depend on activePlayer/winner ONLY (not phase) — the AI's
  // own dispatches change phase, and we must not re-trigger / cancel mid-turn.
  useEffect(() => {
    if (!started) return
    const { aiSeat, difficulty } = cfg.current
    if (activePlayer !== aiSeat || winner || phase === 'gameover') return
    if (acting.current) return
    acting.current = true
    const myGen = gen.current
    playAiTurn({
      getState: () => useGame.getState().state,
      dispatch: (a) => useGame.getState().dispatch(a),
      aiSeat, difficulty, rng: rng.current,
      delayMs: 650,
      cancelled: () => gen.current !== myGen,
    }).finally(() => { acting.current = false })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [started, activePlayer, winner])

  if (!started) {
    return <Setup onStart={(c, sets) => {
      cfg.current = c
      rng.current = { v: ((typeof Date !== 'undefined' ? Date.now() : 1) & 0x7fffffff) >>> 0 }
      gen.current += 1 // invalidate any in-flight turn from a previous game
      acting.current = false
      useGame.getState().newHotseat({
        enabledSets: sets,
        p0Name: c.aiSeat === 'p0' ? 'AI' : 'You',
        p1Name: c.aiSeat === 'p1' ? 'AI' : 'You',
      })
      setStarted(true)
    }} />
  }

  const aiTurn = activePlayer === cfg.current.aiSeat && !winner && phase !== 'gameover'
  return (
    <div className="ai-table-wrap">
      <div className="ai-table-banner">
        <span>vs AI · <b>{cfg.current.difficulty}</b> · you are {cfg.current.aiSeat === 'p0' ? 'Player 2' : 'Player 1'}</span>
        {aiTurn && <span className="ai-table-thinking">AI is taking its turn…</span>}
        <a href="#/" className="ai-table-exit">exit</a>
      </div>
      <div className="ai-table-host">
        <TableBoard mode="local" setMode={(m) => { if (m !== 'local') window.location.hash = '#/' }} />
        {/* block input on the AI's turn so a stray click can't act for it */}
        {aiTurn && <div className="ai-table-shield" aria-hidden />}
      </div>
    </div>
  )
}

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
        <p>Play against an AI opponent on the real game board. The AI plays its own
          seat automatically — rolling, producing, building, trading — while you play
          yours with the full, familiar interface.</p>
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
            {ERAS.map((e) => (
              <button key={e.id} className={`ai-chip ${sets[e.id] ? 'on' : ''}`} onClick={() => toggle(e.id)}>{e.label}</button>
            ))}
          </div>
        </div>
        <button className="ai-start" onClick={() => onStart({ aiSeat, difficulty }, enabled)}>Start game</button>
        <p className="ai-note">Win target follows the rules: 7 VP base · 12 with one era · 13 with all three.
          Production, dice events and small “take any resource” choices resolve automatically.</p>
      </div>
    </div>
  )
}
