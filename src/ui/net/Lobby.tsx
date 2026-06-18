import { useState } from 'react'
import { useGame } from '../../store/gameStore'
import { LoopbackTransport } from '../../net/loopback'
import { PartyKitTransport } from '../../net/partykit'
import { normalizeRoom } from '../../net/transport'
import type { PlayerId } from '../../types'
import './net.css'

type Kind = 'loopback' | 'party'

function randomCode(): string {
  const words = ['oak', 'fjord', 'ore', 'kiln', 'loom', 'dell', 'reef', 'mead', 'pike', 'rune']
  // deterministic-enough variety without Math.random ceremony
  const a = words[Math.floor(Math.random() * words.length)]
  const b = words[Math.floor(Math.random() * words.length)]
  const n = Math.floor(Math.random() * 90 + 10)
  return `${a}-${b}-${n}`
}

function readQuery() {
  if (typeof window === 'undefined') return { room: '', kind: 'loopback' as Kind }
  const q = new URLSearchParams(window.location.search)
  return {
    room: q.get('room') ?? '',
    kind: (q.get('net') === 'party' ? 'party' : 'loopback') as Kind,
  }
}

/** Pre-connection screen: pick a name, room code, seat and transport. */
export function Lobby() {
  const connect = useGame((s) => s.connect)
  const q = readQuery()

  const [name, setName] = useState('')
  const [room, setRoom] = useState(q.room || randomCode())
  const [seat, setSeat] = useState<PlayerId>('p0')
  const [kind, setKind] = useState<Kind>(q.kind)

  const start = () => {
    const code = normalizeRoom(room)
    const tp = kind === 'party' ? new PartyKitTransport(code) : new LoopbackTransport(code)
    connect({ transport: tp, name: name.trim() || (seat === 'p0' ? 'Player 1' : 'Player 2'), seat })
  }

  const shareUrl =
    typeof window !== 'undefined'
      ? `${window.location.origin}${window.location.pathname}?room=${encodeURIComponent(
          normalizeRoom(room),
        )}&net=${kind}`
      : ''

  return (
    <div className="lobby">
      <h2 className="lobby-title">Play online</h2>
      <p className="lobby-sub">
        Share a room code with your friend. Same code + same transport = same table.
      </p>

      <label className="lobby-field">
        <span>Your name</span>
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Reiner" />
      </label>

      <label className="lobby-field">
        <span>Room code</span>
        <div className="lobby-room">
          <input value={room} onChange={(e) => setRoom(e.target.value)} />
          <button className="btn btn-sm" onClick={() => setRoom(randomCode())}>
            ⟳
          </button>
        </div>
      </label>

      <div className="lobby-field">
        <span>Your seat</span>
        <div className="seg">
          <button className={`seg-b${seat === 'p0' ? ' on' : ''}`} onClick={() => setSeat('p0')}>
            Seat 1 (bottom)
          </button>
          <button className={`seg-b${seat === 'p1' ? ' on' : ''}`} onClick={() => setSeat('p1')}>
            Seat 2 (bottom)
          </button>
        </div>
      </div>

      <div className="lobby-field">
        <span>Connection</span>
        <div className="seg">
          <button className={`seg-b${kind === 'loopback' ? ' on' : ''}`} onClick={() => setKind('loopback')}>
            Same PC · 2 tabs
          </button>
          <button className={`seg-b${kind === 'party' ? ' on' : ''}`} onClick={() => setKind('party')}>
            Internet · PartyKit
          </button>
        </div>
      </div>

      {kind === 'party' && (
        <p className="lobby-note">
          Needs the PartyKit server running: <code>npx partykit dev</code> locally, or deploy with
          <code>npx partykit deploy</code> and set <code>VITE_PARTYKIT_HOST</code>.
        </p>
      )}
      {kind === 'loopback' && (
        <p className="lobby-note">
          Opens a shared table across browser tabs/windows on this computer — great for testing.
        </p>
      )}

      <button className="btn btn-primary lobby-go" onClick={start}>
        Enter room →
      </button>

      <div className="lobby-share">
        <span>Invite link</span>
        <code className="lobby-url">{shareUrl}</code>
        <button
          className="btn btn-sm"
          onClick={() => navigator.clipboard?.writeText(shareUrl)}
        >
          Copy
        </button>
      </div>
    </div>
  )
}
