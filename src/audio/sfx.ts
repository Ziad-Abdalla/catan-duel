// Tasteful table SFX, fully synthesized with the Web Audio API — no asset files,
// nothing to license. One lazy AudioContext (created on first sound, after a user
// gesture, per browser autoplay rules). Master mute + SFX volume live in shared prefs.

import { getAudio, setAudio, onAudioChange } from './prefs'

export type Sfx =
  | 'rotate' | 'dice' | 'token' | 'place' | 'flip' | 'ui' | 'sweep'
  | 'build' // a solid wooden construction thunk (settlement/city/road)
  | 'coin' // a bright metallic clink when a cost is paid
  | 'vp' // an ascending bell when victory points are gained
  | 'turn' // a soft sweep marking the turn passing
  | 'deny' // a short low buzz for an illegal / unavailable action
  | 'water' // a soft wave swoosh — ships, harbours
  | 'menace' // a low ominous swell — pirates, brigands, raids
  | 'hero' // a bright heroic flourish — heroes & units
  | 'harvest' // a warm rustle + chime — plenty, grain, mills
  | 'festival' // a bright jingle — celebrations, halls, abbeys
  | 'magic' // a shimmering arpeggio — inventions, universities
  | 'action' // a short parchment-and-chime flourish — one-shot action cards

// Master mute lives in shared prefs; these wrappers keep existing callers working.
export function isMuted(): boolean {
  return getAudio().muted
}
export function setMuted(m: boolean): void {
  setAudio({ muted: m })
}
export function toggleMute(): boolean {
  const m = !getAudio().muted
  setAudio({ muted: m })
  return m
}
export function onMuteChange(l: (m: boolean) => void): () => void {
  return onAudioChange((p) => l(p.muted))
}

let ctx: AudioContext | null = null
let master: GainNode | null = null
function audio(): AudioContext | null {
  if (typeof window === 'undefined') return null
  const AC = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
  if (!AC) return null
  if (!ctx) {
    ctx = new AC()
    master = ctx.createGain()
    master.gain.value = getAudio().sfxVol
    master.connect(ctx.destination)
    onAudioChange((p) => { if (master) master.gain.value = p.sfxVol }) // live SFX-volume changes
  }
  if (ctx.state === 'suspended') void ctx.resume()
  return ctx
}
/** The node every cue routes through — the master SFX gain (falls back to destination). */
function out(): AudioNode {
  return master ?? ctx!.destination
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
  node.connect(out())
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
  node.connect(out())
  src.start(at)
  src.stop(at + opts.dur + 0.02)
}

export function playSfx(kind: Sfx): void {
  if (getAudio().muted) return
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
    case 'sweep': // a rising, dramatic whoosh as a card is deployed to the board
      tone(ac, t, { type: 'sawtooth', freq: 180, to: 720, dur: 0.34, gain: 0.12 })
      noise(ac, t, { dur: 0.3, gain: 0.07, freq: 1800, q: 0.5, type: 'bandpass' })
      tone(ac, t + 0.04, { type: 'sine', freq: 520, to: 880, dur: 0.26, gain: 0.07 })
      break
    case 'build': // a solid wooden double-thunk — a structure going up
      tone(ac, t, { type: 'sine', freq: 150, to: 70, dur: 0.16, gain: 0.3 })
      noise(ac, t, { dur: 0.07, gain: 0.12, freq: 700, q: 0.6, type: 'lowpass' })
      tone(ac, t + 0.11, { type: 'sine', freq: 120, to: 60, dur: 0.14, gain: 0.22 })
      noise(ac, t + 0.11, { dur: 0.06, gain: 0.09, freq: 600, q: 0.6, type: 'lowpass' })
      break
    case 'coin': // bright metallic clink as a cost is paid
      tone(ac, t, { type: 'triangle', freq: 1180, dur: 0.09, gain: 0.1 })
      tone(ac, t + 0.05, { type: 'triangle', freq: 1560, dur: 0.1, gain: 0.08 })
      noise(ac, t, { dur: 0.05, gain: 0.04, freq: 5200, q: 1, type: 'highpass' })
      break
    case 'vp': // an ascending bell — victory points gained
      tone(ac, t, { type: 'sine', freq: 660, dur: 0.16, gain: 0.12 })
      tone(ac, t + 0.08, { type: 'sine', freq: 880, dur: 0.18, gain: 0.12 })
      tone(ac, t + 0.16, { type: 'sine', freq: 1320, dur: 0.26, gain: 0.12 })
      break
    case 'turn': // a soft sweep marking the turn passing
      tone(ac, t, { type: 'sine', freq: 320, to: 480, dur: 0.3, gain: 0.1 })
      noise(ac, t, { dur: 0.28, gain: 0.04, freq: 900, q: 0.4, type: 'bandpass' })
      break
    case 'deny': // a short low buzz — unavailable / illegal
      tone(ac, t, { type: 'sawtooth', freq: 150, to: 110, dur: 0.16, gain: 0.12 })
      break
    case 'water': // a soft wave swoosh — ships, harbours
      noise(ac, t, { dur: 0.45, gain: 0.12, freq: 700, q: 0.4, type: 'lowpass' })
      noise(ac, t + 0.12, { dur: 0.4, gain: 0.08, freq: 1100, q: 0.4, type: 'bandpass', pan: 0.3 })
      tone(ac, t, { type: 'sine', freq: 90, to: 60, dur: 0.4, gain: 0.05 })
      break
    case 'menace': // a low ominous swell — pirates, brigands, raids
      tone(ac, t, { type: 'sawtooth', freq: 70, to: 55, dur: 0.5, gain: 0.18 })
      tone(ac, t, { type: 'sawtooth', freq: 73, to: 58, dur: 0.5, gain: 0.14 }) // detuned beat
      noise(ac, t + 0.1, { dur: 0.35, gain: 0.07, freq: 300, q: 0.5, type: 'lowpass' })
      break
    case 'hero': // a bright heroic flourish — heroes & units
      tone(ac, t, { type: 'triangle', freq: 392, dur: 0.12, gain: 0.13 })
      tone(ac, t + 0.09, { type: 'triangle', freq: 523, dur: 0.12, gain: 0.13 })
      tone(ac, t + 0.18, { type: 'triangle', freq: 784, dur: 0.3, gain: 0.14 })
      break
    case 'harvest': // a warm rustle + soft chime — plenty, grain, mills
      noise(ac, t, { dur: 0.3, gain: 0.08, freq: 2200, q: 0.4, type: 'bandpass' })
      tone(ac, t + 0.05, { type: 'sine', freq: 560, to: 680, dur: 0.22, gain: 0.1 })
      break
    case 'festival': // a bright little jingle — celebrations, halls, abbeys
      tone(ac, t, { type: 'triangle', freq: 660, dur: 0.1, gain: 0.1 })
      tone(ac, t + 0.07, { type: 'triangle', freq: 880, dur: 0.1, gain: 0.1 })
      tone(ac, t + 0.14, { type: 'triangle', freq: 990, dur: 0.1, gain: 0.1 })
      tone(ac, t + 0.21, { type: 'triangle', freq: 1320, dur: 0.22, gain: 0.11 })
      break
    case 'magic': // a shimmering arpeggio — inventions, universities, progress
      for (let i = 0; i < 4; i++) {
        tone(ac, t + i * 0.05, { type: 'sine', freq: 880 * Math.pow(1.26, i), dur: 0.3, gain: 0.06 })
      }
      break
    case 'action': // a short parchment rustle + quick two-note chime — one-shot actions
      noise(ac, t, { dur: 0.09, gain: 0.07, freq: 3000, q: 0.5, type: 'highpass' })
      tone(ac, t + 0.02, { type: 'triangle', freq: 740, dur: 0.1, gain: 0.09 })
      tone(ac, t + 0.1, { type: 'triangle', freq: 988, dur: 0.14, gain: 0.08 })
      break
  }
}
