// Pluggable victory music. The app ships NO audio file — drop your own track at
// `public/victory.mp3` (anything you hold the rights to) and the celebration screen
// will loop it. If the file is absent or autoplay is blocked, this stays silent and
// never throws. Honors the global mute toggle.
import { isMuted } from './sfx'

let audio: HTMLAudioElement | null = null

function el(): HTMLAudioElement | null {
  if (typeof Audio === 'undefined') return null
  if (!audio) {
    audio = new Audio(`${import.meta.env.BASE_URL}victory.mp3`)
    audio.loop = true
    audio.volume = 0.7
  }
  return audio
}

/** Loop the owner-supplied victory track (no-op if muted / missing / blocked). */
export function playVictoryMusic(): void {
  if (isMuted()) return
  const a = el()
  if (!a) return
  try {
    a.currentTime = 0
    void a.play().catch(() => {}) // missing file or autoplay policy → silently ignore
  } catch {
    /* ignore */
  }
}

/** Stop the victory track (safe to call even if it never started). */
export function stopVictoryMusic(): void {
  try {
    audio?.pause()
  } catch {
    /* ignore */
  }
}
