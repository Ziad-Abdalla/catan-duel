import type { Card, ResourceType } from '../types'
import { cardArt, requirementOf } from '../data/cards'
import { CenterArt, CENTER_CATEGORIES } from './CenterArt'
import './card.css'

const RES_LABEL: Record<ResourceType, string> = {
  lumber: 'Lumber',
  brick: 'Brick',
  wool: 'Wool',
  grain: 'Wheat',
  ore: 'Ore',
  gold: 'Gold',
}

/** Categories that you BUILD/PLAY for a cost — label their cost row "Cost". */
const COSTED = new Set(['settlement', 'city', 'road', 'building', 'hero-or-unit'])

function CostChips({ card, affordable }: { card: Card; affordable?: boolean | null }) {
  const cost = card.cost
  if (!cost || cost.length === 0) {
    // make "free to play" explicit for buildable pieces so the absence isn't ambiguous
    if (COSTED.has(card.category)) return <div className="cv-cost cv-cost-free">No build cost</div>
    return null
  }
  return (
    <div className="cv-cost">
      {COSTED.has(card.category) && <span className="cv-cost-label">Cost</span>}
      {cost.flatMap((c) =>
        Array.from({ length: c.count }, (_, i) => (
          <span
            key={`${c.resource}-${i}`}
            className="cv-res"
            style={{ background: `var(--res-${c.resource})` }}
            title={RES_LABEL[c.resource]}
          >
            {RES_LABEL[c.resource][0]}
          </span>
        )),
      )}
      {/* "Requirements Met" flag — flashes the instant your stored resources cover the cost. */}
      {affordable != null && (
        <span className={`cv-afford${affordable ? ' ok' : ''}`} aria-live="polite">
          {affordable ? '✓ Requirements met' : 'Short on resources'}
        </span>
      )}
    </div>
  )
}

function ValueBadges({ card }: { card: Card }) {
  const v = card.values
  const badges: { label: string; cls: string }[] = []
  if (card.category === 'region' && card.region_resource) {
    badges.push({
      label:
        card.region_number != null
          ? `${RES_LABEL[card.region_resource]} · ${card.region_number}`
          : `${RES_LABEL[card.region_resource]} ×4`,
      cls: 'region',
    })
  }
  if (v?.victory_points) badges.push({ label: `${v.victory_points} VP`, cls: 'vp' })
  if (v?.strength) badges.push({ label: `${v.strength} ⚔`, cls: 'str' })
  if (v?.skill) badges.push({ label: `${v.skill} ✦`, cls: 'skill' })
  if (v?.commerce) badges.push({ label: `${v.commerce} ⚖`, cls: 'commerce' })
  if (v?.progress) badges.push({ label: `${v.progress} ⚙`, cls: 'progress' })
  // Age of Enlightenment point types
  if (v?.wisdom) badges.push({ label: `${v.wisdom} 🦉`, cls: 'wisdom' })
  if (v?.contentment) badges.push({ label: `${v.contentment} ★`, cls: 'contentment' })
  if (v?.sail) badges.push({ label: `${v.sail} ⛵`, cls: 'sail' })
  if (v?.cannon) badges.push({ label: `${v.cannon} 💣`, cls: 'cannon' })
  if (badges.length === 0) return null
  return (
    <div className="cv-badges">
      {badges.map((b, i) => (
        <span key={i} className={`cv-badge cv-badge-${b.cls}`}>
          {b.label}
        </span>
      ))}
    </div>
  )
}

/** The prerequisite line ("Requires: …"), optionally tinted by whether it's met. */
function Requirement({ card, met }: { card: Card; met?: boolean | null }) {
  const req = requirementOf(card)
  if (!req) return null
  const state = met == null ? '' : met ? ' cv-req-met' : ' cv-req-unmet'
  return (
    <div className={`cv-req${state}`}>
      <span className="cv-req-key">Requires</span>
      <span className="cv-req-val">{req}</span>
      {met != null && <span className="cv-req-flag">{met ? '✓ met' : '✗ not yet'}</span>}
    </div>
  )
}

export function CardView({
  card,
  requirementMet,
  costMet,
}: {
  card: Card
  requirementMet?: boolean | null
  costMet?: boolean | null
}) {
  const art = cardArt(card.id)
  const isCenter = (CENTER_CATEGORIES as readonly string[]).includes(card.category)
  return (
    <article className={`cv cv-${card.category}`}>
      {art ? (
        <img className="cv-art" src={art} alt={card.name} loading="lazy" />
      ) : isCenter ? (
        <CenterArt card={card} />
      ) : (
        <div className="cv-art cv-art-placeholder">{card.category}</div>
      )}
      <h3 className="cv-name">
        {card.name}
        {card.copies > 1 && <span className="cv-copies">×{card.copies}</span>}
      </h3>
      <CostChips card={card} affordable={costMet} />
      <Requirement card={card} met={requirementMet} />
      <ValueBadges card={card} />
      {card.rules_text && <p className="cv-rules">{card.rules_text}</p>}
      {card.flavor_text && <p className="cv-flavor">{card.flavor_text}</p>}
      {card.unclear && card.unclear.length > 0 && (
        <p className="cv-unclear" title={card.unclear.join('; ')}>
          ⚑ needs verify
        </p>
      )}
    </article>
  )
}
