import { useEffect } from 'react'
import { cardArt } from '../../data/cards'
import type { ResourceType } from '../../types'
import { useGame } from '../../store/gameStore'
import { useUI } from '../../store/uiStore'
import { playSfx } from '../../audio/sfx'
import './stackbrowser.css'

const RLAB: Record<ResourceType, string> = {
  lumber: 'Lumber', brick: 'Brick', wool: 'Wool', grain: 'Wheat', ore: 'Ore', gold: 'Gold',
}

/** Parse a region card id like `region-gold-3` → { resource, number } for the label. */
function parseRegionId(id: string): { resource: ResourceType; number: number | null } {
  const rest = id.replace(/^region-/, '')
  const dash = rest.lastIndexOf('-')
  const resource = rest.slice(0, dash) as ResourceType
  const n = Number(rest.slice(dash + 1))
  return { resource, number: Number.isFinite(n) ? n : null }
}

/**
 * Search the landscape (region) stack like you would at the table — look through it,
 * take any landscape into your first open landscape slot, then reshuffle. This is the
 * Scout's "take cards of your choice from the region stack, then reshuffle" ability;
 * shuffling closes the browser so the searcher can't memorise the new order.
 */
export function RegionStackBrowser() {
  const open = useUI((s) => s.regionBrowse)
  const closeRegionBrowse = useUI((s) => s.closeRegionBrowse)
  const state = useGame((s) => s.state)
  const dispatch = useGame((s) => s.dispatch)
  const active = state.activePlayer

  // a page-flip cue on open, mirroring how the draw-stack browser sounds
  useEffect(() => {
    if (open) playSfx('page')
  }, [open])

  if (!open) return null
  const stack = state.regionStack
  const me = state.players[active]
  const hasOpenSlot = me.regions.some((r) => r.empty)

  const close = () => closeRegionBrowse()

  const take = (position: number) => {
    if (!hasOpenSlot) return
    dispatch({ type: 'takeRegionFromStack', player: active, position })
    playSfx('place')
  }

  // Shuffling closes the browser so the shuffler can't see/memorise the new order.
  const shuffleAndClose = () => {
    dispatch({ type: 'shuffleRegionStack' })
    playSfx('rotate')
    closeRegionBrowse()
  }

  return (
    <div className="sb-scrim" role="dialog" aria-modal="true" aria-label="Search the landscape stack" onClick={close}>
      <div className="sb-panel" onClick={(e) => e.stopPropagation()}>
        <header className="sb-head">
          <span className="sb-title">Landscape stack · {stack.length} regions</span>
          <div className="sb-tools">
            <button className="sb-btn" title="Reshuffle the landscape stack and close (you won't see the new order)" onClick={shuffleAndClose}>⤮ Reshuffle</button>
            <button className="sb-x" onClick={close} aria-label="Close">✕</button>
          </div>
        </header>

        <p className="sb-hint">
          {hasOpenSlot
            ? `Top is on the right. Click a landscape to set it in ${me.name}'s next open landscape slot, then reshuffle.`
            : `${me.name} has no open landscape slot — build a settlement first, then search.`}
        </p>

        <div className="sb-cards">
          {stack.length === 0 && <span className="sb-empty">— empty —</span>}
          {stack.map((id, i) => {
            const art = cardArt(id)
            const { resource, number } = parseRegionId(id)
            const label = `${RLAB[resource] ?? resource}${number != null ? ` #${number}` : ''}`
            return (
              <button
                key={`${id}-${i}`}
                className={`sb-card${i === stack.length - 1 ? ' sb-top' : ''}${hasOpenSlot ? '' : ' sb-locked'}`}
                disabled={!hasOpenSlot}
                title={hasOpenSlot ? `${label} — place into your next open landscape slot` : 'No open landscape slot'}
                onClick={() => take(i)}
              >
                {art ? <img src={art} alt={label} /> : <span>{label}</span>}
                {i === stack.length - 1 && <span className="sb-toptag">top</span>}
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}
