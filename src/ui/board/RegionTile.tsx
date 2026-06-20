import { useEffect, useRef, useState, type MouseEvent as ReactMouseEvent, type DragEvent as ReactDragEvent } from 'react'
import type { PlayerId, RegionSlot, ResourceType } from '../../types'
import { regionCardFor } from '../../data/cards'
import { ResourceIcon } from '../CenterArt'
import { useGame } from '../../store/gameStore'
import { useUI } from '../../store/uiStore'
import { playSfx } from '../../audio/sfx'
import './region.css'

// Terrain art lives in src/assets/regions/<resource>.webp (final art — read, never edited).
const TERRAIN = import.meta.glob('../../assets/regions/*.webp', {
  eager: true,
  import: 'default',
}) as Record<string, string>
const terrainSrc = (r: ResourceType) => TERRAIN[`../../assets/regions/${r}.webp`]

/** Pip positions on a 3×3 die face (cell indices 0–8). */
const PIPS: Record<number, number[]> = {
  1: [4],
  2: [0, 8],
  3: [0, 4, 8],
  4: [0, 2, 6, 8],
  5: [0, 2, 4, 6, 8],
  6: [0, 2, 3, 5, 6, 8],
}

function DieFace({ n }: { n: number }) {
  const on = new Set(PIPS[n] ?? [])
  return (
    <div className="rt-die" aria-hidden>
      {Array.from({ length: 9 }, (_, i) => (
        <span key={i} className={on.has(i) ? 'pip on' : 'pip'} />
      ))}
    </div>
  )
}

/** A stack of `count` resource icons laid along one edge of the tile. */
function EdgeIcons({ count, resource }: { count: number; resource: ResourceType }) {
  if (count <= 0) return null
  return (
    <>
      {Array.from({ length: count }, (_, i) => (
        <span key={i} className="rt-edge-ic">
          <ResourceIcon resource={resource} />
        </span>
      ))}
    </>
  )
}

/**
 * THE signature interaction — a physical region tile you ROTATE like the real game.
 *
 * Its four edges carry 0 · 1 · 2 · 3 stacked resource icons. A fixed reading edge
 * (the bottom, toward the viewer) shows how many you've stored. Click rotates the
 * whole tile 90° clockwise (+1 stored); right-click / shift-click turns it back
 * (−1). The production number is shown as dice pips on the face; the region's name
 * sits OUTSIDE the tile on an upright nameplate so it never turns with the card.
 *
 * Edge→icon mapping is chosen so a clockwise turn always brings the next-higher
 * count to the reading edge: local bottom=0, right=1, top=2, left=3.
 */
export function RegionTile({
  player,
  region,
  index,
}: {
  player: PlayerId
  region: RegionSlot
  index: number
}) {
  // ALL hooks are called unconditionally and BEFORE any early return — otherwise
  // a slot flipping between empty/filled (e.g. when building a settlement splices
  // a new slot in) changes the hook count and crashes React (rules of hooks).
  const dispatch = useGame((s) => s.dispatch)
  // Anti-spoiling: a region only glows AFTER the dice animation has settled — we
  // gate on the UI's `revealedRoll` (set when the tumble ends), not the raw
  // `lastRoll` (set the instant the roll is dispatched), so the result of a roll
  // is never telegraphed by a glowing tile mid-tumble.
  const rolledNumber = useGame((s) => s.state.lastRoll?.production)
  const turn = useGame((s) => s.state.turn)
  const revealedRoll = useUI((s) => s.revealedRoll)
  const produces = !!revealedRoll && revealedRoll.turn === turn && rolledNumber === region.number
  const dragBuild = useUI((s) => s.dragBuild)
  const dragRegion = useUI((s) => s.dragRegion)
  const setDragRegion = useUI((s) => s.setDragRegion)
  const clearUI = useUI((s) => s.clear)
  const [over, setOver] = useState(false)
  const [swapOver, setSwapOver] = useState(false)

  // a region of YOURS being dragged here (and it isn't this same tile) → drop swaps them
  const swapArmed = !!dragRegion && dragRegion.player === player && dragRegion.index !== index
  const swapProps = {
    onDragOver: swapArmed ? (e: ReactDragEvent) => { e.preventDefault(); setSwapOver(true) } : undefined,
    onDragLeave: swapArmed ? () => setSwapOver(false) : undefined,
    onDrop: swapArmed
      ? (e: ReactDragEvent) => {
          e.preventDefault()
          setSwapOver(false)
          dispatch({ type: 'swapRegions', player, from: dragRegion!.index, to: index })
          playSfx('place')
          setDragRegion(null)
        }
      : undefined,
  }
  const grip = (
    <span
      className="rt-grip"
      draggable
      title="Drag to swap this region with another of yours"
      onDragStart={(e) => { e.stopPropagation(); e.dataTransfer.effectAllowed = 'move'; setDragRegion({ player, index }) }}
      onDragEnd={() => setDragRegion(null)}
      aria-label="Drag to swap region"
    >
      ⠿
    </span>
  )

  // Continuous rotation: derive the angle from `stored`, but always pick the
  // equivalent angle CLOSEST to the previous one so the tile spins the short way
  // (and 3→0 keeps turning forward instead of unwinding 270°).
  const [rot, setRot] = useState(region.stored * 90)
  useEffect(() => {
    setRot((prev) => {
      const target = region.stored * 90
      const k = Math.round((prev - target) / 360)
      return target + 360 * k
    })
  }, [region.stored])

  // tactile flash + thunk whenever the stored count changes, plus a subtle
  // floating +N / −N so a production or spend reads at a glance (not spammy: one
  // short float per change, auto-removed on animation end).
  const [flash, setFlash] = useState(false)
  const [float, setFloat] = useState<{ delta: number; key: number } | null>(null)
  const prev = useRef(region.stored)
  useEffect(() => {
    if (prev.current !== region.stored) {
      const delta = region.stored - prev.current
      prev.current = region.stored
      setFlash(true)
      setFloat({ delta, key: Date.now() + index })
    }
  }, [region.stored, index])

  const card = regionCardFor(region.resource)

  // an open landscape slot: a drop target for a Landscape from the build bar
  if (region.empty) {
    const armed = dragBuild === 'landscape'
    const fill = () => {
      dispatch({ type: 'placeLandscape', player, regionIndex: index })
      playSfx('place')
      clearUI()
    }
    return (
      <div className="rtile">
        <div
          className={`rt-empty${armed ? ' armed' : ''}${over ? ' over' : ''}`}
          title="Open landscape slot — drag a Landscape here"
          onDragOver={armed ? (e) => { e.preventDefault(); setOver(true) } : undefined}
          onDragLeave={() => setOver(false)}
          onDrop={armed ? (e) => { e.preventDefault(); setOver(false); fill() } : undefined}
          onClick={armed ? fill : undefined}
        >
          <span className="rt-empty-mark">⬡</span>
        </div>
        <div className="rt-nameplate"><span className="rt-name">Open slot</span></div>
      </div>
    )
  }

  if (!card) return null

  const step = (delta: number) => {
    const next = ((region.stored + delta + 4) % 4) as 0 | 1 | 2 | 3
    dispatch({ type: 'setStored', player, regionIndex: index, stored: next })
    playSfx('rotate')
  }

  // click the LEFT half to take a resource off (−1), the RIGHT half to add one (+1)
  const onClick = (e: ReactMouseEvent<HTMLButtonElement>) => {
    const r = e.currentTarget.getBoundingClientRect()
    step(e.clientX < r.left + r.width / 2 ? -1 : +1)
  }

  const src = terrainSrc(region.resource)

  return (
    <div className={`rtile${produces ? ' produces' : ''}${swapArmed ? ' swap-armed' : ''}${swapOver ? ' swap-over' : ''}`} {...swapProps}>
      <div className="rt-stage">
        <button
          type="button"
          className={`rt-card${flash ? ' flash' : ''}`}
          style={{ transform: `rotate(${rot}deg)` }}
          title={`${card.name} · ${region.stored}/3 ${region.resource}\nClick left half: −1   ·   right half: +1`}
          aria-label={`${card.name}, production ${region.number ?? '?'}, ${region.stored} of 3 ${region.resource} stored. Click the right half to add one, the left half to take one.`}
          onClick={onClick}
          onContextMenu={(e) => {
            e.preventDefault()
            step(-1)
          }}
          onAnimationEnd={() => setFlash(false)}
        >
          {src ? (
            <img className="rt-terrain" src={src} alt="" draggable={false} />
          ) : (
            <span className="rt-terrain rt-terrain-fallback" style={{ background: `var(--res-${region.resource})` }} />
          )}
          <div className="rt-glaze" aria-hidden />
          {region.number != null && <DieFace n={region.number} />}
          <div className="rt-edge rt-edge-top"><EdgeIcons count={2} resource={region.resource} /></div>
          <div className="rt-edge rt-edge-right"><EdgeIcons count={1} resource={region.resource} /></div>
          <div className="rt-edge rt-edge-bottom"><EdgeIcons count={0} resource={region.resource} /></div>
          <div className="rt-edge rt-edge-left"><EdgeIcons count={3} resource={region.resource} /></div>
        </button>
        {/* fixed reading bracket at the bottom — what you currently hold */}
        <div className="rt-reading" aria-hidden />
        {float && (
          <span
            key={float.key}
            className={`rt-float ${float.delta > 0 ? 'gain' : 'loss'}`}
            aria-hidden
            onAnimationEnd={() => setFloat(null)}
          >
            {float.delta > 0 ? `+${float.delta}` : float.delta}
          </span>
        )}
      </div>
      <div className="rt-nameplate">
        {grip}
        <span className="rt-name">{card.name}</span>
        <span className={`rt-count r-${region.resource}`}>{region.stored}<i>/3</i></span>
      </div>
    </div>
  )
}
