# Cards audit — PROGRESS & INTRIGUE sets (image-grounded, read-only)

**Game:** The Rivals for Catan (Rivals deluxe / Big Game expansions).
**Method:** Each card's art at `src/assets/cards/<id>.webp` read directly and compared
field-by-field against `src/data/cards.json`. Ground truth = the card image.
No code or data was edited. Findings are conservative; uncertain calls marked LOW.

**Scope:** 18 `set:progress` + 21 `set:intrigue` = 39 cards, all images present and read.

## Summary

| Confidence | Count | Meaning |
|---|---|---|
| HIGH | 6 | Image clearly contradicts JSON; safe to fix |
| MED | 12 | Strong visual disagreement; verify against a rules reference before changing |
| LOW | 5 | Low-res art / plausible-but-uncertain; verify before any change |

**Dominant pattern — systematic cost undercount.** Across BOTH sets, JSON `cost`
counts tend to be lower than the printed resource icons (the art shows two icons in a
box = 2 of that resource, and JSON often records 1), and several intrigue cards list the
wrong resource *types* entirely. The PROGRESS building costs are high-confidence because
the art is high-resolution; the INTRIGUE art is low-resolution, so most intrigue cost
calls are MED/LOW.

> The PROGRESS *action / event / hero* cards and most rules_text are clean — see
> "rest verified" below.

## Findings (only cards needing change)

| id | field | current (JSON) | correct (per image) | conf | image evidence |
|---|---|---|---|---|---|
| progress-town-hall | cost | wool×1, ore×1, brick×1 | wool×2, ore×2, brick×1 | HIGH | top box shows 2 sheep, second box 2 ore lumps, third box 1 brick |
| progress-university | cost | lumber×1, grain×1, brick×1 | lumber×2, grain×2, brick×1 | HIGH | box1 = 2 lumber bundles, box2 = 2 grain sheaves, box3 = 1 brick |
| progress-pharmacy | cost | wool×1, brick×1, gold×1 | wool×2, brick×1, gold×1 | HIGH | top box shows 2 sheep; then 1 brick; then 1 gold |
| progress-bath-house | cost | brick×1, wool×1, ore×1 | brick×2, wool×1, ore×1 | HIGH | top box shows 2 brick; then 1 wool; then 1 ore |
| progress-parliament | cost | lumber×2, brick×1, wool×1 | lumber×3, brick×2, wool×2 | HIGH | row1 = 3 lumber boxes, row2 = 2 brick boxes, row3 = 2 wool boxes |
| progress-library | cost | lumber×1, brick×1, ore×1 | lumber×2, brick×1, ore×1 | MED | top box appears to hold 2 lumber bundles; brick + ore single |
| intrigue-pilgrimage-site | cost | brick×1, wool×1 | ore×1, gold×1 | MED | two cost icons are an ore lump and a gold nugget, not brick/wool |
| intrigue-great-thingstead | cost | brick×1, grain×1, ore×1 | lumber×1, grain×1, wool×1 | MED | icons read lumber bundle, grain sheaf, wool sheep |
| intrigue-odins-fountain | cost | brick×1, grain×1, gold×1 | wool×1, ore×1, gold×1 (uncertain) | LOW | small art; top reads wool/brick, mid ore, bottom gold |
| intrigue-red-light-tavern | cost | brick×1, grain×1 | lumber×1, grain×1 | MED | top icon is a lumber bundle, not brick |
| intrigue-bran-defender-of-the-temple | cost | lumber×1, brick×1 | wool×2, ore×1 (uncertain) | MED | top box shows 2 sheep, then an ore lump; no lumber visible |
| intrigue-master-of-the-brotherhood | cost | grain×2, ore×1 | gold×2, wool×1 | MED | top box = 2 gold nuggets, then 1 wool sheep |
| intrigue-master-of-the-brotherhood | icon count | strength 1, progress 1, skill 1 | progress 1, skill 1 (2 icons) | LOW | only two value icons visible bottom-right; no strength shield seen |
| intrigue-godfrey-the-intriguer | cost | brick×1, ore×1 | wool×1, ore×1 | MED | top icon reads wool sheep, not brick |
| intrigue-godfrey-the-intriguer | icon count | skill 1, strength 1 | skill 1 (1 icon) | LOW | single skill icon visible bottom-right; strength shield not seen |
| intrigue-odins-temple | cost | brick×2, gold×1 | lumber×2, grain×1 | MED | box1 = 2 lumber bundles, then 1 grain sheaf; no brick/gold |
| intrigue-sacrificial-site | cost | wool×1, brick×1, grain×1 | wool×2, lumber×1, ore×1 (uncertain) | MED | top box 2 sheep, then lumber, then ore lump |
| intrigue-church | cost | brick×2, grain×1 | brick×2, ore×1 (uncertain) | LOW | top box 2 brick ✓; third icon reads grey ore, not grain |
| intrigue-bishops-see | cost | ore×2, grain×2, brick×1 | ore×?, gold×2, brick×? (uncertain) | LOW | gold nuggets visible mid-stack; exact counts unreadable |
| intrigue-judith-guardian-of-the-church | cost | grain×2, brick×1 | grain×2, ore×1 (uncertain) | LOW | 2 grain sheaves ✓; third icon ambiguous (ore vs brick) |
| intrigue-priestess-of-the-horns | id slug | priestess-of-the-**horns** | priestess-of-the-**norns** | LOW | printed name "Priestess of the Norns"; JSON `name` already correct, only the id slug has the typo (cosmetic; changing an id is breaking) |

### Tag / category notes (non-cost, low priority)
- `intrigue-missionary`, `intrigue-bishop`, `intrigue-odins-priest` print as
  **Action – Attack** but JSON `tag` is `"None"` (category=action is fine). MED-LOW.
- `intrigue-pilgrimage-site`, `great-thingstead`, `odins-fountain` print as
  **Extraordinary Site / Settlement-city**, not plain "building"; several intrigue
  hero/unit cards print **Unit-Hero / City** or **Region** sub-tags that JSON stores as
  `"None"`. Cosmetic; not flagged as data errors.

## Rest verified (no change needed)
PROGRESS — chief-cannoneer (lumber+ore, strength 4 = 4 shields, Req University all ✓),
building-crane (lumber×1 ✓), three-field-system, mineral-mining, benjamin, guido,
gustav, doctor, brigitta, relocation, plague, invention — all costs, requires, and
rules_text match the printed cards.
INTRIGUE — reiner-the-miller (grain+gold, commerce 1 ✓), bishop, odins-priest,
missionary, priestess (rules), michael-the-master-builder, good-neighbors,
religious-dispute, abbey-brewery (no cost-box disagreement found) — rules_text and
`requires` strings match the printed text.

## Recommended next step
The PROGRESS building-cost block (6 HIGH/MED rows) is the highest-value, lowest-risk fix
and should be corrected first. For all INTRIGUE cost rows, cross-check against a
high-resolution Rivals for Catan card reference (or the printed cards) before editing —
the supplied art is too low-resolution to be the sole authority on resource *type*.
