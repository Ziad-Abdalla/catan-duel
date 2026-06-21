import { useEffect, useRef } from 'react'
import { useGame } from '../../store/gameStore'
import { useUI } from '../../store/uiStore'
import './audit.css'

/**
 * Collapsible action-history ledger. Every engine action is logged with its
 * acting player, so this shows the full chronological trail: raw dice rolls,
 * +/- resource updates, builds, card plays/discards and hand swaps. Newest last,
 * auto-scrolled. Read-only — it never mutates game state.
 */
export function AuditLog() {
  const open = useUI((s) => s.auditOpen)
  const toggle = useUI((s) => s.toggleAudit)
  const log = useGame((s) => s.state.log)
  const names = {
    p0: useGame((s) => s.state.players.p0.name),
    p1: useGame((s) => s.state.players.p1.name),
  }
  const listRef = useRef<HTMLOListElement>(null)
  // Keep the newest entry in view as the log grows — by scrolling the LIST itself,
  // never scrollIntoView (which would also nudge the whole table, e.g. on every one
  // of the AI's many actions).
  useEffect(() => {
    const el = listRef.current
    if (open && el) el.scrollTop = el.scrollHeight
  }, [open, log.length])

  if (!open) return null

  return (
    <aside className="audit" aria-label="Action history">
      <header className="audit-head">
        <span className="audit-title">Action Log</span>
        <button className="audit-x" onClick={toggle} aria-label="Close action log">✕</button>
      </header>
      <ol ref={listRef} className="audit-list" role="log" aria-live="polite" aria-relevant="additions" aria-label="Game action history">
        {log.length === 0 && <li className="audit-empty">No actions yet.</li>}
        {log.map((e, i) => {
          const newTurn = i === 0 || log[i - 1].turn !== e.turn
          return (
            <li key={i} className={`audit-row seat-${e.player}${e.manual ? ' manual' : ''}${newTurn ? ' turn-start' : ''}`}>
              {newTurn && <span className="audit-turnhead">Turn {e.turn}</span>}
              <span className="audit-line">
                <span className="audit-who" style={{ color: e.player === 'p0' ? 'var(--p1-red, #c75c54)' : 'var(--p2-blue, #5a86c4)' }}>
                  {names[e.player]}
                </span>
                <span className="audit-text">{e.text}</span>
              </span>
            </li>
          )
        })}
        <li aria-hidden className="audit-end" />
      </ol>
    </aside>
  )
}
