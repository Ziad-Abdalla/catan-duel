import { useEffect, useRef, useState } from 'react'
import { useGame } from '../../store/gameStore'

interface Toast {
  id: number
  text: string
  leave?: boolean
}

/** Transient toasts for online events: opponent joining, your link dropping. */
export function NetToasts() {
  const online = useGame((s) => s.online)
  const peerCount = useGame((s) => Object.keys(s.peers).length)
  const status = useGame((s) => s.status)
  const [toast, setToast] = useState<Toast | null>(null)
  const prevPeers = useRef(peerCount)
  const prevStatus = useRef(status)
  const nextId = useRef(0)

  const push = (text: string, leave = false) => {
    const id = nextId.current++
    setToast({ id, text, leave })
    setTimeout(() => setToast((t) => (t && t.id === id ? null : t)), 2400)
  }

  useEffect(() => {
    if (!online) return
    if (peerCount > prevPeers.current) push('Opponent connected')
    prevPeers.current = peerCount
  }, [peerCount, online])

  useEffect(() => {
    if (online && prevStatus.current !== status && (status === 'closed' || status === 'error')) {
      push('Connection lost', true)
    }
    prevStatus.current = status
  }, [status, online])

  if (!toast) return null
  return <div className={`toast${toast.leave ? ' leave' : ''}`}>{toast.text}</div>
}
