// Single source of truth for all audio preferences, persisted to localStorage and
// shared by the SFX engine, the music player, and the settings UI. One change-listener
// set so the UI re-renders and the music player reacts when anything changes.

export interface AudioPrefs {
  muted: boolean // master mute — silences everything
  sfxVol: number // 0..1
  musicOn: boolean // ambient background music (a shuffled playlist)
  musicVol: number // 0..1
}

// Everything ON by default (sound, effects, music); the player lowers or mutes from
// ⚙ Setup → Sound, or the quick mute button. Music starts on the first interaction
// (browsers block autoplay until then).
const KEY = 'catan-duel.audio'
const DEFAULTS: AudioPrefs = { muted: false, sfxVol: 0.85, musicOn: true, musicVol: 0.32 }

function load(): AudioPrefs {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) || '{}')
    return { ...DEFAULTS, ...raw }
  } catch {
    return { ...DEFAULTS }
  }
}

let prefs: AudioPrefs = load()
const listeners = new Set<(p: AudioPrefs) => void>()

export function getAudio(): AudioPrefs {
  return prefs
}

export function setAudio(patch: Partial<AudioPrefs>): void {
  prefs = { ...prefs, ...patch }
  try {
    localStorage.setItem(KEY, JSON.stringify(prefs))
  } catch {
    /* ignore */
  }
  listeners.forEach((l) => l(prefs))
}

export function onAudioChange(l: (p: AudioPrefs) => void): () => void {
  listeners.add(l)
  return () => listeners.delete(l)
}

// Dev hook so the e2e audio test can read/drive prefs (never present in production).
if (import.meta.env.DEV && typeof window !== 'undefined') {
  ;(window as unknown as { __audio: unknown }).__audio = { getAudio, setAudio }
}
