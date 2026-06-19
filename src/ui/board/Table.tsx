import { type ReactNode } from 'react'
import { useGame } from '../../store/gameStore'
import { useUI } from '../../store/uiStore'
import './table.css'

/** The themed atmosphere for the felt, chosen by which card sets are in play. */
function tableEra(eras: string[]): string {
  if (eras.length >= 2) return 'duel' // multiple eras → the combined "Duel of the Princes" look
  if (eras.length === 1) return eras[0] // gold / turmoil / progress
  return 'base'
}

/**
 * The tabletop. A full-viewport vertical scroll surface: you look at one half of
 * the table (your principality + the central wall), and scroll "across the table"
 * to the other principality. The wall stays pinned (sticky) the whole way. Fully
 * fluid — every size derives from the viewport, never a fixed design canvas.
 *
 * The whole felt re-tints to match the active thematic expansion (era).
 */
export function Table({ children }: { children: ReactNode }) {
  const enabledSets = useGame((s) => s.state.enabledSets)
  const tableTheme = useUI((s) => s.tableTheme)
  // The felt atmosphere normally follows the enabled eras, but the player can pin a
  // specific theme so the background visibly changes whenever they want.
  const era = tableTheme === 'auto' ? tableEra(enabledSets.filter((s) => s !== 'base')) : tableTheme
  return (
    <div className={`felt-scroll felt-era-${era}`} data-era={era}>
      <div className="felt-bg" aria-hidden>
        <span className="felt-orb o1" />
        <span className="felt-orb o2" />
        <span className="felt-orb o3" />
        <span className="felt-motes" />
      </div>
      {children}
    </div>
  )
}
