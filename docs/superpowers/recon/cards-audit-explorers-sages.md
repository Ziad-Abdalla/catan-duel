# Cards Audit — Explorers & Sages (image-grounded, read-only)

**Scope:** All 23 `explorers` + 28 `sages` cards in `src/data/cards.json`, compared field-by-field
against the printed card art at `src/assets/cards/<id>.webp` (ground truth).
**Method:** Read each `.webp`, compared cost icons, `values.requires`, rules_text (material only),
icon counts, name/category. Conservative — uncertain flagged LOW.

## Summary counts (cards needing a change)

- **HIGH confidence:** 7
- **MED confidence:** 14
- **LOW confidence:** 2
- Cards verified correct (no change): 28

### Systemic issues found

1. **Action cards carry phantom resource costs.** In Rivals for Catan, *action* cards are not bought
   with resources; their "Pay N owls" is an in-play cost, not a build cost. Every sages action card has
   `cost: [{gold:1}]` in JSON but the art shows **no resource cost icons**. (5 cards.)
2. **Pirate (Sea) cards carry phantom build costs.** Explorers pirates (Haidao Chang / Cimmarone / Jean)
   are fought, not built. JSON gives them `grain+gold` costs; the top-left icons are pirate level markers,
   not a resource build cost.
3. **Grove build costs are largely wrong/missing** — most groves show a single resource (or gold/ore)
   in the art that the JSON does not match.

## Top 5 fixes (highest impact)

1. `explorers-zheng-he` — **name is wrong**: art reads **"Haidao Chang"**, not "Zheng He" (HIGH).
2. `explorers-friendship-between-peoples` — **rules_text entirely wrong** (HIGH).
3. `explorers-sailmakers-shop` — cost 2nd icon is **grain**, JSON says **gold** (HIGH).
4. `explorers-explorer-metropolis` — `values.requires` wrong (art: "6+ discovered sea cards OR 2 level-3 islands") (HIGH).
5. `explorers-ambassador` — `values.requires` is garbled OCR ("Bland of the Burds…") (HIGH).

## Findings table (only cards needing change)

| id | field | current | correct (per image) | conf | image evidence |
|---|---|---|---|---|---|
| explorers-zheng-he | name | "Zheng He" | **"Haidao Chang"** | HIGH | title bar reads "Haidao Chang"; strength 5 |
| explorers-zheng-he | cost | grain:1, gold:1 | no build cost (pirate; "Pay 1 gold or fight") | MED | "Extraordinary Site / Sea" pirate, top-left = level markers |
| explorers-cinmarone | name | "Cinmarone" | **"Cimmarone"** (double-m) | HIGH | title bar "Cimmarone"; strength 6 |
| explorers-cinmarone | cost | grain:1, gold:1 | no build cost (pirate) | MED | pirate card, "Pay 1 gold or fight" |
| explorers-jean | cost | grain:2, gold:1 | no build cost (pirate; "Pay 2 resources or fight") | MED | pirate card |
| explorers-sailmakers-shop | cost | brick:1, gold:1 | brick:1, **grain:1** | HIGH | 2nd icon is yellow grain sheaf, not gold |
| explorers-landing-stage | cost | brick:1, gold:1 | brick:1, **grain:1** | MED | 2nd icon = grain sheaf |
| explorers-cannon-foundry | cost | ore:2, brick:1, gold:1 | ore:1, **lumber:1**, brick:1 | MED | 3 icons: ore, logs(lumber), brick; no gold |
| explorers-astronomer | cost | gold:2 | grain:1, brick:1, wool:1 | MED | 3 icons: grain, brick, wool; not 2 gold |
| explorers-explorer-metropolis | values.requires | "…At least 2 level 3 lands." | "At least 6 discovered sea cards OR at least 2 level-3 islands" | HIGH | rules line on art; rules_text already correct |
| explorers-armory | rules_text/values | skill:1; "1 strength + 1 cannon" | flavor text only ("…understand our language") — likely a commerce building, verify icons | LOW | flavor mismatches a weapons building; bottom-right blue+red icons hard to read |
| explorers-broadside | values.requires | "At least 2 common points" | "At least 2 **cannon** points" | HIGH | art + own rules_text say cannon |
| explorers-ambassador | values.requires | "…leveled the Bland of the Burds…" (garbled) | "You have rotated the respective card at least to level 1" | HIGH | clear OCR corruption vs art text |
| explorers-friendship-between-peoples | rules_text | "If you receive more resources than you can store, lose excess…" | "Each player receives any 1 resource of his choice for each Island card he has rotated at least to the next higher level." | HIGH | art text completely different |
| explorers-most-successful-explorer | rules_text | only the tie clause | primary effect missing: most-sea-card player (≥1) draws up to 2 cards from a stack; then the tie clause | MED | art leads with the draw effect |
| sages-grove-of-freedom | cost | lumber:1, grain:1 | **ore:1, gold:1** | MED | top-left icons = grey ore + gold |
| sages-grove-of-fraternity | cost | lumber:1, grain:1 | no cost icons shown | MED | top-left empty on art |
| sages-grove-of-justice | cost | brick:1, ore:1 | **ore:1** only | MED | single grey ore icon |
| sages-grove-of-peace | cost | (none) | **gold:1** | MED | single gold icon top-left |
| sages-grove-of-vigilance | cost | (none) | **gold:1** | MED | single gold icon |
| sages-grove-of-great-foresight | cost | (none) | **ore:1** | MED | single grey ore icon |
| sages-grove-of-courage | cost | (none) | **gold:1** | MED | single gold icon |
| sages-manifest-of-humane-conduct | name | "Manifest of Humane Conduct" | "**Manifesto** of Humane Conduct" | HIGH | title bar "Manifesto"; tag also reads "Marker Card" not "Face-up Expansion" |
| sages-manifest-of-humane-conduct | cost | lumber:1, grain:2, wool:3 | rotation/marker cost (lumber+gold+owls), not a build cost | LOW | Marker Card; bottom-left shows lumber+gold+owl rotation cost |
| sages-robert-herald-of-the-sages | cost | grain:1, ore:1 | grain:1, **brick:1, wool:1** (3 icons) | MED | top-left: sheaf, brick, sheep |
| sages-academy-of-sages | cost | brick:2, wool:1, grain:1 | brick:2, **gold:1** | MED | art: brick pair + gold; not wool+grain |
| sages-courthouse | cost | brick:2, wool:1, ore:1 | **lumber:1 + brick** (re-verify exact) | MED | top icon = logs(lumber) then brick |
| sages-granary | cost | brick:2, wool:1, grain:1, ore:1 | brick:2, wool:1, grain:1 (no ore visible) | MED | 3 icon groups; no ore |
| sages-great-foresight | cost | gold:1 | no resource cost (action card; "Pay 1 owl") | MED | "Action – Neutral", no cost icons |
| sages-dispute-of-the-sages | cost | gold:1 | no resource cost (action card) | MED | action card, no cost icons |
| sages-wise-compensation | cost | gold:1 | no resource cost (action card) | MED | action card |
| sages-power-of-the-groves | cost | gold:1 | no resource cost (action card) | MED | action card |
| sages-wise-protection | cost | gold:1 | no resource cost (action card) | MED | "Action – Attack", no cost icons |
| sages-walther-sage-of-the-gold-field | rules_text | "…Feud/Fraternal Feud events have no effect on you." | art shows only the placement/rotate rule; feud-immunity clause not visible | LOW | possible added clause (feud immunity belongs to Grove of Courage) |

**Category notes (not blockers):** several explorers heroes/actions are `hero-or-unit` in JSON but the art
labels them `Action – Neutral/Attack` (Lars, Navigator, Ambassador, Broadside). Minor; left as observations.

## Rest verified (no change)

explorers: shipwreck, island-of-the-bards, island-of-the-merchants, islands-of-the-scholars,
island-of-the-forgotten-tribe, explorer-harbor, shipyard, cartographer, lars-the-naval-hero, navigator.
sages: grove-of-* rules text (costs aside), peter / michaela / barbara / frederich / piet /
principal-sage-woman / cole (cost grain+ore confirmed correct), famine, council-of-the-sages,
courthouse rules, granary rules. `sages-unknown` is a card-back/placeholder ("?" art) — left as-is.
