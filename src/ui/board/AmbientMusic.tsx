import { useEffect, useState } from 'react'
import { getAudio, onAudioChange, type AudioPrefs } from '../../audio/prefs'
import { playAmbient, stopAmbient, setAmbientVolume, type MusicEra } from '../../audio/music'
import { useGame } from '../../store/gameStore'
import { useUI } from '../../store/uiStore'

/** Which era's music to play: a pinned theme wins, else it follows the enabled eras
 *  (2+ → the full "Duel" mix, 1 → that era, none → the intro/base bed). */
function musicEra(enabled: string[], theme: string): MusicEra {
  if (theme !== 'auto') return (theme === 'base' ? 'base' : theme) as MusicEra
  const eras = enabled.filter((s) => s !== 'base')
  if (eras.length >= 2) return 'duel'
  if (eras.length === 1) return eras[0] as MusicEra
  return 'base'
}

/**
 * Drives the per-era shuffled background-music playlist from the shared audio prefs. Music
 * is on by default, but browsers block autoplay until the first interaction, so we also kick
 * it off on the first pointer/key event. Switches the era's mood when the theme/sets change,
 * starts/stops on music+mute changes, updates volume live. Renders nothing.
 */
export function AmbientMusic() {
  const [p, setP] = useState<AudioPrefs>(getAudio())
  useEffect(() => onAudioChange(setP), [])
  const enabledSets = useGame((s) => s.state.enabledSets)
  const tableTheme = useUI((s) => s.tableTheme)
  const era = musicEra(enabledSets, tableTheme)

  // start on the first user gesture (autoplay policy)
  useEffect(() => {
    const kick = () => playAmbient(era)
    window.addEventListener('pointerdown', kick, { once: true })
    window.addEventListener('keydown', kick, { once: true })
    return () => {
      window.removeEventListener('pointerdown', kick)
      window.removeEventListener('keydown', kick)
    }
  }, [era])

  // start/stop on music+mute changes, and switch the era's mood when it changes
  useEffect(() => {
    playAmbient(era) // no-op if off/muted; resumes/starts/switches otherwise
    return () => stopAmbient()
  }, [p.musicOn, p.muted, era])
  useEffect(() => setAmbientVolume(p.musicVol), [p.musicVol])
  return null
}
