import { useEffect, useRef } from 'react'
import { useUI } from '../../store/uiStore'
import { playSfx } from '../../audio/sfx'
import { eventSfx } from '../../audio/cardSound'

/**
 * The single owner of event-die audio: when a roll settles (revealedRoll, synced on both
 * screens), it plays the face's thematic cue once — brigand→menace, trade→coin,
 * celebration→festival, plentiful-harvest→rustle, event-card→flip. Visual cinematics
 * (e.g. BrigandSequence) stay separate so audio is never doubled.
 */
export function DiceEventCue() {
  const eventFx = useUI((s) => s.eventFx)
  const last = useRef<number | null>(null)
  useEffect(() => {
    if (!eventFx || eventFx.key === last.current) return
    last.current = eventFx.key
    playSfx(eventSfx(eventFx.face))
  }, [eventFx])
  return null
}
