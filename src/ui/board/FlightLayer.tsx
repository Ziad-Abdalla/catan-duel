import { useEffect, useRef } from 'react'
import { useUI, type Flight } from '../../store/uiStore'

/** Renders cards in flight across the table (deck → hand) at viewport level. */
export function FlightLayer() {
  const flights = useUI((s) => s.flights)
  return (
    <>
      {flights.map((f) => (
        <FlyingCard key={f.id} flight={f} />
      ))}
    </>
  )
}

function FlyingCard({ flight }: { flight: Flight }) {
  const remove = useUI((s) => s.removeFlight)
  const ref = useRef<HTMLImageElement>(null)

  useEffect(() => {
    const node = ref.current
    if (!node) return
    const dx = flight.tx - flight.fx
    const dy = flight.ty - flight.fy
    const anim = node.animate(
      [
        { transform: 'translate(-50%, -50%) translate(0, 0) scale(0.7) rotate(-8deg)', opacity: 0.2 },
        { transform: `translate(-50%, -50%) translate(${dx * 0.5}px, ${dy * 0.5 - 26}px) scale(1.08) rotate(4deg)`, opacity: 1, offset: 0.5 },
        { transform: `translate(-50%, -50%) translate(${dx}px, ${dy}px) scale(1) rotate(0deg)`, opacity: 1 },
      ],
      { duration: 480, easing: 'cubic-bezier(.4, 0, .2, 1)' },
    )
    // Only remove when the flight actually completes — NOT on cancel, so React
    // StrictMode's dev double-invoke (which cancels the first pass) can't drop it.
    anim.addEventListener('finish', () => remove(flight.id))
    // safety net in case the browser drops the animation
    const t = setTimeout(() => remove(flight.id), 1200)
    return () => {
      clearTimeout(t)
      anim.cancel()
    }
  }, [flight, remove])

  return (
    <img
      ref={ref}
      className="flight-card"
      src={flight.art}
      alt=""
      style={{ left: flight.fx, top: flight.fy, width: flight.w }}
    />
  )
}
