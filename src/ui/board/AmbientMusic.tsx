import { useEffect, useState } from 'react'
import { useUI } from '../../store/uiStore'
import { isMuted, onMuteChange } from '../../audio/sfx'
import { playAmbient, stopAmbient } from '../../audio/music'

/**
 * Drives the ambient background-music loop from the ⚙ Setup → Music toggle, always
 * yielding to the global mute. Plays `public/ambient.mp3` if the owner dropped one in
 * (see ASSETS.html); otherwise it's a silent no-op. Renders nothing.
 */
export function AmbientMusic() {
  const musicOn = useUI((s) => s.musicOn)
  const [muted, setMuted] = useState(isMuted())
  useEffect(() => onMuteChange(setMuted), [])
  useEffect(() => {
    if (musicOn && !muted) playAmbient()
    else stopAmbient()
    return () => stopAmbient()
  }, [musicOn, muted])
  return null
}
