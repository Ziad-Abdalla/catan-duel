import { useEffect, useState } from 'react'
import { getAudio, onAudioChange, type AudioPrefs } from '../../audio/prefs'
import { playAmbient, stopAmbient, setAmbientVolume } from '../../audio/music'

/**
 * Drives the shuffled background-music playlist from the shared audio prefs. Music is on
 * by default, but browsers block autoplay until the first interaction, so we also kick it
 * off on the first pointer/key event. Starts/stops on music+mute changes and updates the
 * volume live. Renders nothing.
 */
export function AmbientMusic() {
  const [p, setP] = useState<AudioPrefs>(getAudio())
  useEffect(() => onAudioChange(setP), [])

  // start on the first user gesture (autoplay policy)
  useEffect(() => {
    const kick = () => playAmbient()
    window.addEventListener('pointerdown', kick, { once: true })
    window.addEventListener('keydown', kick, { once: true })
    return () => {
      window.removeEventListener('pointerdown', kick)
      window.removeEventListener('keydown', kick)
    }
  }, [])

  useEffect(() => {
    playAmbient() // no-op if off/muted; resumes/starts otherwise
    return () => stopAmbient()
  }, [p.musicOn, p.muted])
  useEffect(() => setAmbientVolume(p.musicVol), [p.musicVol])
  return null
}
