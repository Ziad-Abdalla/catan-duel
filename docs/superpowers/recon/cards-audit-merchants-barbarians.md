# Image-Grounded Accuracy Audit — Merchants & Barbarians

**Scope:** 24 `merchants` + 21 `barbarians` cards (45 total) in `src/data/cards.json`, audited against card art at `src/assets/cards/<image>.webp` (read with the Read tool).
**Method:** read-only. Compared per card: (1) cost icons vs `cost`; (2) printed requirement vs `values.requires`; (3) `rules_text` for material inaccuracies; (4) commerce/strength/skill/VP icon counts vs `values`; (5) name/category. Conservative — anything obscured by the "All rights reserved 2011" watermark or genuinely ambiguous is marked LOW.

## Summary (issues by confidence)

| Confidence | Count |
|---|---|
| HIGH | 14 |
| MED | 13 |
| LOW | 8 |

- **Dominant systemic issue:** the `cost` field is wrong on a large share of cards in BOTH sets. The art clearly shows different resource icons (and often a different *number* of resources) than the JSON. This is by far the most impactful and recurring error class.
- Two cards have a wrong **name** vs the printed card (`barbarians-arad-the-strategist` → "Arnd"; `barbarians-bailwick` → "Bailiwick").
- One **requires** typo (`barbarians-siegfried...` "Caft" → "Castle").
- One card's **rules_text describes the wrong effect** (`merchants-capricious-sea`).
- Several buildings show a **strength sword** icon bottom-right that is not recorded in `values` (Barbarians fortifications especially). Marked MED/LOW because the watermark and small icon size make exact counts uncertain — recommend a second pass with clean scans before bulk-editing `values`.

## Findings (only cards needing change; all others verified)

### Merchants

| id | field | current | correct (per image) | conf | image evidence |
|---|---|---|---|---|---|
| merchants-cloth-merchants-residence | rules_text | "...at higher levels gain 2 wool" | "For **2 wool from** the adjacent pasture region, you may rotate the Residence up a level" (you PAY 2 wool, not gain) | HIGH | printed text reverses the JSON mechanism |
| merchants-paper-merchants-residence | rules_text | "...at higher levels gain 2 lumber" | "For **2 lumber from** the adjacent forest region, rotate the Residence up a level" (PAY, not gain) | HIGH | same reversed mechanism as cloth |
| merchants-trading-post | cost | lumber+brick | **grain + wool** | HIGH | top-left icons are a wheat sheaf and a sheep |
| merchants-brigand-camp | cost | lumber+brick | **wool + grain** | HIGH | top-left icons are a sheep and a wheat sheaf |
| merchants-olaf-the-merchant-ship-captain | cost | gold(1)+ore(2) | **grain(1) + wool(1)** | HIGH | top-left = wheat sheaf + sheep |
| merchants-pirate-ship | cost | wool+grain+ore (3) | **lumber + wool** (2) | HIGH | top-left = log + sheep |
| merchants-commercial-metropolis | cost | brick(2)+ore(2) | **lumber(1) + brick(1) + wool(1)** | HIGH | top-left stack = log, brick, sheep (3 distinct) |
| merchants-commercial-harbor | cost | gold(2)+brick(1)+ore(1) | **grain(1) + wool(1) + brick(1)** | HIGH | top-left = wheat sheaf, sheep, brick |
| merchants-commercial-harbor | values.requires | "of the highest level 2 Residences" | garbled string; no requirement is printed on this card (it IS the prerequisite) | MED | card front shows no "Requires:" line |
| merchants-master-merchants-alliance | cost | lumber+brick+wool | **grain + lumber + brick** | HIGH | top-left first icon is a wheat sheaf, not a sheep |
| merchants-master-merchants-alliance | values | victory_points:2, commerce:1 | image shows a **strength** sword bottom-right; no VP crowns / commerce scale clearly visible | MED | watermark partly obscures upper-right, but the only clear value icon is a sword |
| merchants-trading-station | cost | brick+grain | **brick + wool** | MED | second icon is a sheep, not a wheat sheaf |
| merchants-craft-guild | cost | lumber(1)+brick(1)+wool(1) | **wool(2) + lumber(1) + brick(1)** | MED | top icon shows two stacked sheep (wool x2) |
| merchants-craft-guild | values (strength) | {} | possible **strength:1** (sword bottom-right) | LOW | small icon, watermark interference |
| merchants-capricious-sea | rules_text | "Trade is disrupted: resources you cannot store are lost. A Lighthouse is immune." | "**Calm Sea (1–4):** each player gains 1 resource per trade ship. **Storm (5,6):** each player slides a trade ship under a matching draw stack." | MED | printed effect is a die-roll table, materially different |
| merchants-pirate-ship | values (commerce) | {} | possible commerce:1 (faint scale bottom-left) | LOW | icon ambiguous under watermark |
| merchants-fortunate-trade-voyage | rules_text | vague paraphrase | printed is more specific (up to 2 res per trade ship; Large Trade Ship clause) — not materially wrong, just loose | LOW | wording only |
| merchants-lighthouse | cost | brick(2)+lumber(1)+ore(1) | likely correct (brick stack + log + ore visible) | LOW | brick count slightly ambiguous; treat as verified |

### Barbarians

| id | field | current | correct (per image) | conf | image evidence |
|---|---|---|---|---|---|
| barbarians-arad-the-strategist | name | "Arad the Strategist" | **"Arnd the Strategist"** | HIGH | title and body both read "Arnd" |
| barbarians-arad-the-strategist | cost | grain(1) | **grain + wool + ore** (3) | HIGH | top-left = wheat sheaf, sheep, ore |
| barbarians-arad-the-strategist | rules_text | uses "Arnd" already | consistent with corrected name | — | n/a (name is the fix) |
| barbarians-siegfried-vanquisher-of-the-barbarians | values.requires | "Caft and at least 2 heroes." | **"Castle and at least 2 heroes."** | HIGH | printed "Requires: Castle…"; rules_text already correct |
| barbarians-white-raven-tavern | cost | lumber+brick | **lumber + grain** | HIGH | second icon is a wheat sheaf, not brick |
| barbarians-white-raven-tavern | values.skill | 2 | likely **1** (single book icon bottom-right) | MED | only one skill icon visible |
| barbarians-caravel | cost | lumber+brick | **lumber + wool + ore** (3) | HIGH | top-left = log, sheep, ore |
| barbarians-caravel | values (strength) | {} (only requires:City) | **strength:2** (two swords bottom-right) | MED | two sword icons clearly visible |
| barbarians-marie-the-shieldmaiden | cost | brick+ore | **wool + lumber** | HIGH | top-left = sheep + log |
| barbarians-secret-brotherhood | cost | lumber+grain | **wool + lumber + gold** (3) | HIGH | top-left = sheep, log, gold coins |
| barbarians-bailwick | name | "Bailwick" | **"Bailiwick"** | LOW | printed title "Bailiwick (1x)" |
| barbarians-bailwick | cost | lumber+brick | **wool(2) + lumber + brick** | HIGH | top shows two sheep + log + brick |
| barbarians-arsenal | cost | brick(2)+ore(1) | **wool + lumber + brick** | HIGH | top-left = sheep, log, brick (no ore) |
| barbarians-castle | cost | brick(2)+ore(1) | **brick + lumber + ore** (lumber missing from JSON) | MED | middle icon is clearly a log |
| barbarians-barbarian-stronghold | cost | lumber+brick | **lumber + wool** | MED | second icon is a sheep |
| barbarians-baroc-the-barbarian | cost | grain(1) | **grain + gold** | MED | top-left wheat sheaf + gold coins (ore icon lower is part of rules text) |
| barbarians-siward-the-scout | cost | grain(1) | **grain + gold** | MED | top-left = wheat sheaf + gold coins |
| barbarians-wolfgang-the-street-performer | cost | grain(2) | **gold (≈2)** | MED | top-left icon is gold coins, not a wheat sheaf |
| barbarians-marie-the-shieldmaiden | values | {} | possible commerce:1 + skill:1 (scale + book bottom-right) | LOW | icons faint under watermark |
| barbarians-triumph-card | category | "building" | printed tag is **"Marker Card"** | LOW | front label reads "Marker Card" (may be intentional mapping) |
| barbarians-secret-brotherhood / arsenal / bailwick / castle | values (strength) | {} | each shows a strength sword bottom-right — possible missing strength:1 | LOW | small icons; recommend clean-scan confirmation |

**Rest verified** (no change needed): merchants — wainwright, ship-builder, guild-master, hergild (id `merchants-herold...` — note name "Hergild" is CORRECT, only the slug differs), gero, tactical-retreat, mendicants, trade-monopoly, maritime-trade-monopoly, hour-of-the-master-merchants. barbarians — border-fortress, alliance-against-the-barbarians, castellan, relocation, contest-of-the-heroes, barbarian-attack, retreat-of-the-barbarians.

## Caveats
- Every image carries a diagonal "© Catan GmbH … 2011 / All rights reserved" watermark that overlaps the cost column and value icons on some cards. Cost-icon *identity* (resource type) was usually clear; exact *counts* and small value icons (strength swords, commerce scales) are the least certain — hence the MED/LOW grades there.
- Do not bulk-rewrite `values.strength` from this audit alone; confirm sword counts on clean art first.
- The single most valuable corrective action is a systematic re-derivation of every `cost` field in both sets from the art — the error rate is high and consistent (the JSON costs appear to have been guessed/templated rather than read).
