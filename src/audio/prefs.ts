// Single source of truth for all audio preferences, persisted to localStorage and
// shared by the SFX engine, the music player, and the settings UI. One change-listener
// set so the UI re-renders and the music player reacts when anything changes.

export interface AudioPrefs {
  muted: boolean // master mute — silences everything
  sfxVol: number // 0..1
  musicOn: boolean // ambient background music (a shuffled playlist)
  musicVol: number // 0..1
  /** prefs schema/migration version (absent = pre-versioning v0). */
  version?: number
}

// Everything ON by default (sound, effects, music); the player lowers or mutes from
// ⚙ Setup → Sound, or the quick mute button. Music starts on the first interaction
// (browsers block autoplay until then). Defaults are ~20% quieter than the original
// 0.85 / 0.32 (owner request) — a calmer mix out of the box.
const KEY = 'catan-duel.audio'
const PREFS_VERSION = 1
export const AUDIO_DEFAULTS: AudioPrefs = { muted: false, sfxVol: 0.68, musicOn: true, musicVol: 0.26, version: PREFS_VERSION }

const clamp01 = (n: number) => Math.max(0, Math.min(1, n))

/**
 * Bring a persisted prefs blob up to the current schema. The v0→v1 step is the owner's
 * "turn everyone down ~20% once": existing players (who have a saved blob with no version)
 * get their CURRENT volumes scaled by 0.8 a single time, preserving their relative choice.
 * Idempotent — re-running on an already-migrated blob changes nothing.
 */
export function migrateAudioPrefs(raw: Partial<AudioPrefs>): AudioPrefs {
  const merged: AudioPrefs = { ...AUDIO_DEFAULTS, ...raw }
  if ((raw.version ?? 0) < 1) {
    merged.sfxVol = clamp01(merged.sfxVol * 0.8)
    merged.musicVol = clamp01(merged.musicVol * 0.8)
  }
  merged.version = PREFS_VERSION
  return merged
}

function load(): AudioPrefs {
  try {
    const stored = localStorage.getItem(KEY)
    if (stored == null) return { ...AUDIO_DEFAULTS } // brand-new player → the quieter defaults
    const raw = JSON.parse(stored)
    const migrated = migrateAudioPrefs(raw)
    // Persist the one-time migration immediately so the 20% turn-down can't repeat on reload.
    if ((raw.version ?? 0) !== migrated.version) {
      try { localStorage.setItem(KEY, JSON.stringify(migrated)) } catch { /* ignore */ }
    }
    return migrated
  } catch {
    return { ...AUDIO_DEFAULTS }
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
