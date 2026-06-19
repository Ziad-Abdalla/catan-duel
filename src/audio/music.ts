// Victory music for the celebration screen.
//
// Two sources, in order: (1) an owner-supplied track at `public/victory.mp3` if you
// drop one in; (2) otherwise an ORIGINAL, royalty-free fanfare synthesized live in
// the browser — so the celebration always has music with no bundled audio file and
// no copyright concern. Honors the global mute toggle; never throws.
import { isMuted } from './sfx'
import { getAudio } from './prefs'

let ctx: AudioContext | null = null
let mp3: HTMLAudioElement | null = null
let loop: ReturnType<typeof setInterval> | null = null

function ac(): AudioContext | null {
  if (typeof window === 'undefined') return null
  const AC = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
  if (!AC) return null
  if (!ctx) ctx = new AC()
  if (ctx.state === 'suspended') void ctx.resume()
  return ctx
}

/** One warm plucked note. */
function note(a: AudioContext, freq: number, start: number, dur: number, gain = 0.12, type: OscillatorType = 'triangle') {
  const o = a.createOscillator()
  const g = a.createGain()
  o.type = type
  o.frequency.value = freq
  g.gain.setValueAtTime(0.0001, start)
  g.gain.exponentialRampToValueAtTime(gain, start + 0.02)
  g.gain.exponentialRampToValueAtTime(0.0001, start + dur)
  o.connect(g)
  g.connect(a.destination)
  o.start(start)
  o.stop(start + dur + 0.05)
}

/** An original triumphant flourish: a rising C-major arpeggio resolving to a chord. */
function fanfare() {
  const a = ac()
  if (!a || isMuted()) return
  const t = a.currentTime + 0.04
  const arp: [number, number][] = [
    [523.25, 0.0], // C5
    [659.25, 0.16], // E5
    [783.99, 0.32], // G5
    [1046.5, 0.5], // C6
  ]
  for (const [f, dt] of arp) note(a, f, t + dt, 0.5, 0.11)
  // resolving major chord + a soft bass
  note(a, 783.99, t + 0.86, 1.4, 0.09) // G5
  note(a, 1046.5, t + 0.86, 1.4, 0.09) // C6
  note(a, 659.25, t + 0.86, 1.4, 0.07) // E5
  note(a, 130.81, t + 0.86, 1.6, 0.1, 'sine') // C3 bass
}

/** Loop the celebration music — owner mp3 if present, else the synth fanfare. */
export function playVictoryMusic(): void {
  if (isMuted()) return
  stopVictoryMusic()
  if (typeof Audio !== 'undefined') {
    try {
      if (!mp3) {
        mp3 = new Audio(`${import.meta.env.BASE_URL}audio/victory.mp3`)
        mp3.loop = true
      }
      mp3.volume = Math.min(1, getAudio().musicVol + 0.3) // celebration sits a touch louder than the bed
      mp3.currentTime = 0
      void mp3
        .play()
        .then(() => {
          /* owner track is playing */
        })
        .catch(() => startSynth()) // no file / blocked → fall back to the synth fanfare
      return
    } catch {
      /* fall through to synth */
    }
  }
  startSynth()
}

function startSynth() {
  fanfare()
  // replay every 7s with a gap between, so it celebrates without droning
  loop = setInterval(() => {
    if (isMuted()) return
    fanfare()
  }, 7000)
}

// ── Ambient background music ─────────────────────────────────────────────────
// A shuffled PLAYLIST of bundled CC0 medieval tracks that cycle one after another and
// reshuffle each lap — variety, so it never gets repetitive (better than one short loop).
// Low volume, on by default; on/off + volume live in shared prefs and yield to master mute.
// Browsers only allow it to sound after the first user gesture (handled in AmbientMusic).
const PLAYLIST = ['audio/bgm-1.mp3', 'audio/bgm-2.mp3', 'audio/bgm-3.mp3', 'audio/bgm-4.mp3']
let ambEl: HTMLAudioElement | null = null
let order: number[] = []
let pos = 0

function reshuffle(): void {
  order = PLAYLIST.map((_, i) => i)
  for (let i = order.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[order[i], order[j]] = [order[j], order[i]]
  }
  pos = 0
}

function startTrack(): void {
  if (!ambEl) return
  ambEl.src = `${import.meta.env.BASE_URL}${PLAYLIST[order[pos]]}`
  ambEl.volume = getAudio().musicVol
  void ambEl.play().catch(() => {
    /* missing file / autoplay still blocked → stays silent until the next gesture */
  })
}

function advance(): void {
  pos++
  if (pos >= order.length) reshuffle()
  startTrack()
}

/** Start or resume the shuffled background playlist. No-op (and pauses) if music is off
 *  or muted. */
export function playAmbient(): void {
  const p = getAudio()
  if (!p.musicOn || p.muted || typeof Audio === 'undefined') {
    stopAmbient()
    return
  }
  if (!ambEl) {
    ambEl = new Audio()
    ambEl.loop = false
    ambEl.onended = advance
  }
  ambEl.volume = p.musicVol
  if (!ambEl.src) {
    reshuffle()
    startTrack()
  } else {
    void ambEl.play().catch(() => {}) // resume where it left off
  }
}

export function stopAmbient(): void {
  try {
    ambEl?.pause()
  } catch {
    /* ignore */
  }
}

/** Live volume change without interrupting the current track. */
export function setAmbientVolume(v: number): void {
  if (ambEl) ambEl.volume = v
}

/** Stop whatever victory music is playing (safe to call anytime). */
export function stopVictoryMusic(): void {
  if (loop) {
    clearInterval(loop)
    loop = null
  }
  try {
    mp3?.pause()
  } catch {
    /* ignore */
  }
}
