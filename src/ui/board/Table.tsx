import { type ReactNode } from 'react'
import './table.css'

/**
 * The tabletop. A full-viewport vertical scroll surface: you look at one half of
 * the table (your principality + the central wall), and scroll "across the table"
 * to the other principality. The wall stays pinned (sticky) the whole way. Fully
 * fluid — every size derives from the viewport, never a fixed design canvas.
 */
export function Table({ children }: { children: ReactNode }) {
  return (
    <div className="felt-scroll">
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
