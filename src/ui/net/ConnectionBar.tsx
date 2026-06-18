import { useGame } from '../../store/gameStore'
import type { ConnStatus } from '../../net/transport'
import './net.css'

const STATUS_LABEL: Record<ConnStatus, string> = {
  idle: 'idle',
  connecting: 'connecting…',
  connected: 'connected',
  closed: 'disconnected',
  error: 'connection error',
}

/** Slim bar shown above the board while online: status, room, peers, leave. */
export function ConnectionBar() {
  const room = useGame((s) => s.room)
  const status = useGame((s) => s.status)
  const mySeat = useGame((s) => s.mySeat)
  const myName = useGame((s) => s.myName)
  const peers = useGame((s) => s.peers)
  const disconnect = useGame((s) => s.disconnect)

  const peerList = Object.values(peers)

  return (
    <div className={`connbar status-${status}`}>
      <span className={`conn-dot ${status}`} />
      <span className="conn-status">{STATUS_LABEL[status]}</span>
      <span className="conn-room">
        room <b>{room}</b>
      </span>
      <span className="conn-you">
        you: {myName} ({mySeat === 'p0' ? 'Seat 1' : 'Seat 2'})
      </span>
      <span className="conn-peers">
        {peerList.length === 0
          ? 'waiting for opponent…'
          : `with ${peerList.map((p) => p.name).join(', ')}`}
      </span>
      <button className="btn btn-sm conn-leave" onClick={disconnect}>
        Leave
      </button>
    </div>
  )
}
