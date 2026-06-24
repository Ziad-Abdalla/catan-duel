import { describe, it, expect } from 'vitest'
import { migrateAudioPrefs, AUDIO_DEFAULTS } from './prefs'

describe('audio prefs defaults — ~20% quieter', () => {
  it('ships the lowered defaults', () => {
    expect(AUDIO_DEFAULTS.sfxVol).toBeCloseTo(0.68, 5)
    expect(AUDIO_DEFAULTS.musicVol).toBeCloseTo(0.26, 2)
  })
})

describe('audio prefs migration — one-time 20% turn-down for existing players', () => {
  it('scales a pre-versioning (v0) blob down by 20% once', () => {
    const m = migrateAudioPrefs({ muted: false, sfxVol: 0.85, musicOn: true, musicVol: 0.32 })
    expect(m.sfxVol).toBeCloseTo(0.68, 5) // 0.85 * 0.8
    expect(m.musicVol).toBeCloseTo(0.256, 5) // 0.32 * 0.8
    expect(m.version).toBeGreaterThanOrEqual(1)
  })

  it('preserves a player\'s own relative choice (scales whatever they had)', () => {
    const m = migrateAudioPrefs({ muted: false, sfxVol: 0.5, musicOn: true, musicVol: 0.6 })
    expect(m.sfxVol).toBeCloseTo(0.4, 5)
    expect(m.musicVol).toBeCloseTo(0.48, 5)
  })

  it('does NOT scale again once already migrated (idempotent)', () => {
    const once = migrateAudioPrefs({ muted: false, sfxVol: 0.85, musicOn: true, musicVol: 0.32 })
    const twice = migrateAudioPrefs(once)
    expect(twice.sfxVol).toBeCloseTo(once.sfxVol, 5)
    expect(twice.musicVol).toBeCloseTo(once.musicVol, 5)
  })

  it('keeps the mute and music-on flags intact through migration', () => {
    const m = migrateAudioPrefs({ muted: true, sfxVol: 0.85, musicOn: false, musicVol: 0.32 })
    expect(m.muted).toBe(true)
    expect(m.musicOn).toBe(false)
  })
})
