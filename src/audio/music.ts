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
  stopAmbient() // duck the background bed while the fanfare plays
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
// 18 bundled CC0 medieval/folk tracks (archive.org public-domain collection), grouped
// into a mood-matched, shuffled playlist PER ERA — so the felt sounds different in the
// intro vs Gold vs Turmoil vs Innovation vs the full Duel. Each era's list reshuffles
// every lap so it never gets repetitive. On by default; on/off + volume in shared prefs.
const ALL = Array.from({ length: 18 }, (_, i) => `audio/bgm-${i + 1}.mp3`)

export type MusicEra =
  | 'base' | 'gold' | 'turmoil' | 'progress' | 'duel'
  | 'intrigue' | 'merchants' | 'barbarians' | 'explorers' | 'sages' | 'prosperity'
// indices into ALL, chosen by mood; lists overlap so each era has 5-6 tracks and never runs dry.
const ERA_TRACKS: Record<MusicEra, number[]> = {
  base: [0, 3, 2, 13, 17, 4], // intro: tavern dance, calm folk, renaissance airs
  gold: [1, 7, 8, 14, 9, 15], // courtly + stately pavanes, dances, ayres
  turmoil: [5, 6, 10, 12, 4], // tense + epic + sacre/dramatic
  progress: [9, 11, 15, 16, 2], // bright baroque + concertino
  duel: [5, 12, 6, 11, 1, 0], // epic mix for the full game
  intrigue: [5, 10, 12, 6, 4], // dark, conspiratorial tension
  merchants: [1, 7, 8, 14, 9], // courtly trade, stately ayres
  barbarians: [5, 12, 6, 10, 1], // martial, epic, driving
  explorers: [8, 14, 1, 9, 17], // adventurous, expansive
  sages: [11, 16, 2, 9, 3], // calm, scholarly, contemplative
  prosperity: [2, 9, 11, 15, 16], // bright, peaceful, baroque
}

let ambEl: HTMLAudioElement | null = null
let currentEra: MusicEra = 'base'
let pool: number[] = ERA_TRACKS.base // the current era's track indices
let order: number[] = []
let pos = 0

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
  ambEl.volume = p.musicVol
  if (era && era !== currentEra) {
    // era changed → swap to that era's mood and start a fresh track
    currentEra = era
    pool = ERA_TRACKS[era] ?? ERA_TRACKS.base
    reshuffle()
    startTrack()
    return
  }
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
    if (mp3) {
      mp3.pause()
      mp3.currentTime = 0 // reset so a replay restarts it cleanly instead of stacking/sticking
    }
  } catch {
    /* ignore */
  }
  // bring the background bed back once the celebration ends
  playAmbient()
}
