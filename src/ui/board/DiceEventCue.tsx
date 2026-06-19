import { useEffect, useRef } from 'react'
import { useUI } from '../../store/uiStore'
import { playSfx } from '../../audio/sfx'
import { eventSfx } from '../../audio/cardSound'
import type { EventFace } from '../../engine/dice'

/**
 * The single owner of event-die audio: when a roll settles (revealedRoll, synced on both
 * screens), it plays the face's thematic cue once — brigand→menace, trade→coin,
 * celebration→festival, plentiful-harvest→rustle, event-card→flip. Visual cinematics
 * (e.g. BrigandSequence) stay separate so audio is never doubled.
 */
export function DiceEventCue() {
  const revealedRoll = useUI((s) => s.revealedRoll)
  const last = useRef<string | null>(null)
  useEffect(() => {
    if (!revealedRoll) return
    const key = `${revealedRoll.turn}:${revealedRoll.production}:${revealedRoll.event}`
    if (key === last.current) return
    last.current = key
    playSfx(eventSfx(revealedRoll.event as EventFace))
  }, [revealedRoll])
  return null
}
