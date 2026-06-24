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
  stopVictoryMusic() // never stack two celebrations (fixes "victory sound stuck on replay")
  // Duck the background bed under the fanfare (don't hard-stop it) so the celebration glides in
  // and the music is still there when it ends.
  ducked = true
  if (ambEl && !ambEl.paused) ramp(ambEl, bedVolume(), 600)
  if (isMuted()) return
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
// 42 bundled royalty-free instrumental tracks, grouped into a mood-matched, shuffled
// playlist PER ERA — so the felt sounds different in the intro vs Gold vs Turmoil vs
// Innovation vs the full Duel. bgm-1..18 are CC0 public-domain (archive.org); bgm-19..42
// are Kevin MacLeod period/theme instrumentals (CC-BY 4.0 — see docs/superpowers/
// MUSIC_LICENSES.md for the required attribution). Lists overlap so every era's pool is
// 30+ minutes and reshuffles each lap so it never gets repetitive. On by default; on/off
// + volume in shared prefs.
const ALL = Array.from({ length: 42 }, (_, i) => `audio/bgm-${i + 1}.mp3`)

export type MusicEra =
  | 'base' | 'gold' | 'turmoil' | 'progress' | 'duel'
  | 'intrigue' | 'merchants' | 'barbarians' | 'explorers' | 'sages' | 'prosperity'
// 0-based indices into ALL, chosen by mood; lists overlap and each era's pool totals 30+ min
// so the music never runs dry. (18=Angevin 19=Folk Round 20=Master of the Feast 21=Achaidh
// Cheide 22=Minstrel Guild 23=Teller of the Tales 24=Pippin 25=Court of the Queen
// 26=Procession of the King 27=Sovereign 28=Suonatore di Liuto 29=Hidden Agenda 30=Ossuary 1
// 31=Echoes of Time 32=Lightless Dawn 33=Volatile Reaction 34=Heroic Age 35=Despair and
// Triumph 36=Crusade 37=Lord of the Land 38=Meditation Impromptu 03 39=At Rest 40=Frost Waltz
// 41=Egmont Overture.)
const ERA_TRACKS: Record<MusicEra, number[]> = {
  base: [0, 3, 2, 13, 17, 4, 18, 19, 20, 21, 24, 37], // village/folk: tavern dance, calm folk, minstrels
  gold: [1, 7, 8, 14, 9, 15, 25, 26, 27, 35], // wealthy/merchant grandeur: courtly, stately, regal processions
  turmoil: [5, 6, 10, 12, 4, 29, 30, 31, 32, 33, 35], // tense/political: dark, conspiratorial, ominous
  progress: [9, 11, 15, 16, 2, 34, 41, 26, 38, 39, 40], // hopeful/building: bright baroque, heroic, uplifting
  duel: [5, 12, 6, 11, 1, 0, 35, 41, 33, 18], // full-game epic mix
  intrigue: [5, 10, 12, 6, 4, 28, 29, 30, 23, 32], // mysterious/courtly: lute, hidden agenda, ossuary
  merchants: [1, 7, 8, 14, 9, 22, 20, 25, 37, 26, 18], // bustling market/trade: lively courtly, feasts
  barbarians: [5, 12, 6, 10, 1, 33, 36, 32, 35, 30, 31], // martial/ominous: crusade, volatile, driving
  explorers: [8, 14, 1, 9, 17, 18, 23, 41, 21, 35], // seafaring/adventurous: expansive, dramatic overture
  sages: [11, 16, 2, 9, 3, 38, 39, 40, 28, 31], // mystical/scholarly: meditative, calm, contemplative
  prosperity: [2, 9, 11, 15, 16, 34, 26, 40, 20, 35, 21], // triumphant/abundant: bright, peaceful, regal
}

let ambEl: HTMLAudioElement | null = null
let currentEra: MusicEra = 'base'
let pool: number[] = ERA_TRACKS.base // the current era's track indices
let order: number[] = []
let pos = 0
let ducked = false // ambient bed lowered under the victory fanfare

// Smoothly ramp an element's volume instead of cutting — removes the jarring hard-cut
// between tracks / on era change / on stop, so the bed glides ("better everywhere").
const FADE_MS = 900
let rampTimer: ReturnType<typeof setInterval> | null = null
function ramp(el: HTMLAudioElement, to: number, ms = FADE_MS, onDone?: () => void): void {
  if (rampTimer) clearInterval(rampTimer)
  const from = el.volume
  const steps = Math.max(1, Math.round(ms / 40))
  let i = 0
  rampTimer = setInterval(() => {
    i++
    el.volume = Math.max(0, Math.min(1, from + (to - from) * (i / steps)))
    if (i >= steps) {
      if (rampTimer) clearInterval(rampTimer)
      rampTimer = null
      onDone?.()
    }
  }, 40)
}
/** The bed's target volume right now (ducked under victory, else the player's setting). */
function bedVolume(): number {
  const v = getAudio().musicVol
  return ducked ? Math.min(v, 0.08) : v
}

function reshuffle(): void {
  order = pool.map((_, i) => i)
  for (let i = order.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[order[i], order[j]] = [order[j], order[i]]
  }
  pos = 0
}

function startTrack(): void {
  if (!ambEl) return
  ambEl.src = `${import.meta.env.BASE_URL}${ALL[pool[order[pos]]]}`
  ambEl.volume = 0 // fade in from silence so a new track never cuts in abruptly
  void ambEl
    .play()
    .then(() => ambEl && ramp(ambEl, bedVolume()))
    .catch(() => {
      /* missing file / autoplay still blocked → stays silent until the next gesture */
    })
}

function advance(): void {
  pos++
  if (pos >= order.length) reshuffle()
  startTrack()
}

/** Start or resume the era's shuffled playlist. Pass an era to switch the music to that
 *  era's mood (restarts with a fresh shuffle). No-op (and pauses) if music is off/muted. */
export function playAmbient(era?: MusicEra): void {
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
  if (era && era !== currentEra) {
    // era changed → fade the current mood out, then start the new era's fresh track (which
    // fades in), so switching sets mid-game glides instead of cutting.
    currentEra = era
    pool = ERA_TRACKS[era] ?? ERA_TRACKS.base
    const go = () => { reshuffle(); startTrack() }
    if (ambEl.src && !ambEl.paused) ramp(ambEl, 0, FADE_MS, go)
    else go()
    return
  }
  if (!ambEl.src) {
    reshuffle()
    startTrack()
  } else {
    const el = ambEl
    void el.play().then(() => ramp(el, bedVolume())).catch(() => {}) // resume + ease back up
  }
}

export function stopAmbient(): void {
  if (!ambEl) return
  const el = ambEl
  try {
    ramp(el, 0, 500, () => { try { el.pause() } catch { /* ignore */ } })
  } catch {
    try { el.pause() } catch { /* ignore */ }
  }
}

/** Live volume change without interrupting the current track. */
export function setAmbientVolume(v: number): void {
  if (ambEl) ambEl.volume = ducked ? Math.min(v, 0.08) : v
}

/** Stop whatever victory music is playing (safe to call anytime). */
export function stopVictoryMusic(): void {
  if (loop) {
    clearInterval(loop)
    loop = null
  }
  try {
    if (mp3) {
      mp3.pause()
      mp3.currentTime = 0 // reset so a replay restarts it cleanly instead of stacking/sticking
    }
  } catch {
    /* ignore */
  }
  // un-duck and bring the background bed back up once the celebration ends
  ducked = false
  if (ambEl && !ambEl.paused) ramp(ambEl, bedVolume(), 800)
  else playAmbient()
}
