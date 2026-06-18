// Tasteful table SFX, fully synthesized with the Web Audio API — no asset files,
// nothing to license. One lazy AudioContext (created on first sound, after a user
// gesture, per browser autoplay rules). A persisted mute toggle gates everything.

export type Sfx = 'rotate' | 'dice' | 'token' | 'place' | 'flip' | 'ui'

const STORE_KEY = 'catan-duel.muted'
let muted = readMuted()
const listeners = new Set<(m: boolean) => void>()

function readMuted(): boolean {
  try {
    return localStorage.getItem(STORE_KEY) === '1'
  } catch {
    return false
  }
}

export function isMuted(): boolean {
  return muted
}
export function setMuted(m: boolean): void {
  muted = m
  try {
    localStorage.setItem(STORE_KEY, m ? '1' : '0')
  } catch {
    /* ignore */
  }
  listeners.forEach((l) => l(m))
}
export function toggleMute(): boolean {
  setMuted(!muted)
  return muted
}
export function onMuteChange(l: (m: boolean) => void): () => void {
  listeners.add(l)
  return () => listeners.delete(l)
}

let ctx: AudioContext | null = null
function audio(): AudioContext | null {
  if (typeof window === 'undefined') return null
  const AC = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
  if (!AC) return null
  if (!ctx) ctx = new AC()
  if (ctx.state === 'suspended') void ctx.resume()
  return ctx
}

/** A short pitched body with an envelope — the building block for most cues. */
function tone(
  ac: AudioContext,
  at: number,
  opts: { type?: OscillatorType; freq: number; to?: number; dur: number; gain: number; pan?: number },
) {
  const osc = ac.createOscillator()
  const g = ac.createGain()
  osc.type = opts.type ?? 'sine'
  osc.frequency.setValueAtTime(opts.freq, at)
  if (opts.to) osc.frequency.exponentialRampToValueAtTime(opts.to, at + opts.dur)
  g.gain.setValueAtTime(0.0001, at)
  g.gain.exponentialRampToValueAtTime(opts.gain, at + 0.006)
  g.gain.exponentialRampToValueAtTime(0.0001, at + opts.dur)
  let node: AudioNode = g
  if (opts.pan != null && ac.createStereoPanner) {
    const p = ac.createStereoPanner()
    p.pan.value = opts.pan
    g.connect(p)
    node = p
  }
  osc.connect(g)
  node.connect(ac.destination)
  osc.start(at)
  osc.stop(at + opts.dur + 0.02)
}

/** A burst of filtered noise — clatter / taps / swishes. */
function noise(
  ac: AudioContext,
  at: number,
  opts: { dur: number; gain: number; freq: number; q?: number; type?: BiquadFilterType; pan?: number },
) {
  const n = Math.max(1, Math.floor(ac.sampleRate * opts.dur))
  const buf = ac.createBuffer(1, n, ac.sampleRate)
  const d = buf.getChannelData(0)
  for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / n)
  const src = ac.createBufferSource()
  src.buffer = buf
  const f = ac.createBiquadFilter()
  f.type = opts.type ?? 'bandpass'
  f.frequency.value = opts.freq
  f.Q.value = opts.q ?? 1
  const g = ac.createGain()
  g.gain.setValueAtTime(opts.gain, at)
  g.gain.exponentialRampToValueAtTime(0.0001, at + opts.dur)
  let node: AudioNode = g
  if (opts.pan != null && ac.createStereoPanner) {
    const p = ac.createStereoPanner()
    p.pan.value = opts.pan
    g.connect(p)
    node = p
  }
  src.connect(f)
  f.connect(g)
  node.connect(ac.destination)
  src.start(at)
  src.stop(at + opts.dur + 0.02)
}

export function playSfx(kind: Sfx): void {
  if (muted) return
  const ac = audio()
  if (!ac) return
  const t = ac.currentTime
  switch (kind) {
    case 'rotate': // a soft wooden tick as the tile turns
      tone(ac, t, { type: 'triangle', freq: 230, to: 150, dur: 0.1, gain: 0.16 })
      noise(ac, t, { dur: 0.05, gain: 0.05, freq: 2600, q: 0.7, type: 'highpass' })
      break
    case 'dice': // two dice clattering on felt
      for (let i = 0; i < 5; i++) {
        const at = t + i * (0.055 + Math.random() * 0.03)
        noise(ac, at, { dur: 0.05, gain: 0.12, freq: 1400 + Math.random() * 1400, q: 1.2, pan: (Math.random() - 0.5) * 0.8 })
        tone(ac, at, { type: 'square', freq: 90 + Math.random() * 40, dur: 0.04, gain: 0.05 })
      }
      break
    case 'token': // a heavy wooden disc thunk
      tone(ac, t, { type: 'sine', freq: 170, to: 70, dur: 0.22, gain: 0.32 })
      noise(ac, t, { dur: 0.09, gain: 0.1, freq: 500, q: 0.6, type: 'lowpass' })
      break
    case 'place': // a card set down on the felt
      noise(ac, t, { dur: 0.08, gain: 0.16, freq: 1100, q: 0.8 })
      tone(ac, t, { type: 'sine', freq: 130, to: 80, dur: 0.1, gain: 0.12 })
      break
    case 'flip': // a quick card flip / deal
      noise(ac, t, { dur: 0.12, gain: 0.12, freq: 3200, q: 0.5, type: 'highpass' })
      break
    case 'ui':
      tone(ac, t, { type: 'triangle', freq: 520, dur: 0.06, gain: 0.08 })
      break
  }
}
