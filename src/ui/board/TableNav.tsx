import { useEffect, useState } from 'react'

/**
 * A single floating button (and ↑/↓ arrow keys) to jump between your half of the
 * table and your opponent's. You can still free-scroll with the wheel; this is the
 * one-press "take me there / bring me back" the table is built around.
 */
function felt() {
  return document.querySelector('.felt-scroll') as HTMLElement | null
}
function jump(to: 'opp' | 'you') {
  const fs = felt()
  if (!fs) return
  fs.scrollTo({ top: to === 'opp' ? 0 : fs.scrollHeight, behavior: 'smooth' })
}

export function TableNav() {
  // onOpp = the opponent's half (the top pane) is the one currently in view.
  const [onOpp, setOnOpp] = useState(false)

  useEffect(() => {
    const fs = felt()
    if (!fs) return
    const update = () => setOnOpp(fs.scrollTop < fs.clientHeight * 0.5)
    update()
    fs.addEventListener('scroll', update, { passive: true })
    return () => fs.removeEventListener('scroll', update)
  }, [])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null
      if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable)) return
      if (e.key === 'ArrowUp') { e.preventDefault(); jump('opp') }
      else if (e.key === 'ArrowDown') { e.preventDefault(); jump('you') }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  return (
    <button
      className="table-nav"
      onClick={() => jump(onOpp ? 'you' : 'opp')}
      title="Jump to the other side of the table (or press ↑ / ↓)"
      aria-label={onOpp ? 'Go to your board' : "Go to your opponent's board"}
    >
      <span className="table-nav-arrow">{onOpp ? '▼' : '▲'}</span>
      <span className="table-nav-label">{onOpp ? 'Your board' : 'Opponent'}</span>
    </button>
  )
}
