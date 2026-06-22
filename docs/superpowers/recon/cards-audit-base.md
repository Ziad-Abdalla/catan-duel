# Base-set card data accuracy audit

**Scope:** the 44 cards with `"set": "base"` in `src/data/cards.json`, compared against the printed card art in `src/assets/cards/<id>.webp`.
**Method:** read-only. For each card I read its image and compared the printed cost icons (top-left), printed requirement/value icons, category label, name, and rules text against the JSON. No code or data was edited.

## Can webp be read?

**YES.** All `.webp` card images were read and rendered successfully (verified on `base-toll-bridge.webp` first, then used throughout). Image-based audit was performed as intended.

**Caveat — 9 base cards have NO image file** (they are the starting-principality pieces, not draw-stack cards, so no art ships with them):
`base-region-forest`, `base-region-hills`, `base-region-pasture`, `base-region-fields`, `base-region-mountains`, `base-region-gold-field`, `base-settlement`, `base-city`, `base-road`.
These were audited for **internal consistency / rules-text only** — no image ground truth exists for them. Their data looks internally consistent (Rivals base build costs: settlement = lumber+brick+wool+grain; city upgrade = grain×2+ore×3; road = lumber+brick — these match the known Rivals for Catan basic costs). Not flagged.

## Confidence summary

| Confidence | Count | Cards |
|---|---|---|
| HIGH corrections | 2 | base-siglind (missing cost), base-candamir (missing 1 wool in cost) |
| MED corrections | 0 | — |
| LOW / advisory | 1 | trade-ship `commerce` value omission (see notes; consistent across 7 ships, so likely intentional model choice — not a real error) |

35 of 35 imaged cards verified. **2 require a change; the rest are accurate.** Costs, hero strength/skill values, "2x" doubling flags, "2:1" trade arrows, commerce/progress icons, categories, names, and rules text all otherwise match their printed cards.

## Corrections (only cards needing a change)

| id | field | current value | correct value (per image) | confidence | image evidence |
|---|---|---|---|---|---|
| base-siglind | cost | `[]` (empty) | `[{wool:2},{grain:1},{ore:1}]` | high | Top-left cost column shows FOUR icons: two wool (sheep), one grain (wheat sheaf), one ore (grey nugget). JSON has no cost at all. Strength/skill (2 blue axe-shields + 3 green harps → strength 2, skill 3) already match. |
| base-candamir | cost | `[{wool:1},{grain:1},{ore:1}]` | `[{wool:2},{grain:1},{ore:1}]` | high | Top-left cost column shows TWO wool icons (two stacked sheep at top), then grain, then ore — i.e. wool×2, not wool×1. Strength 4 / skill 1 (4 blue axe-shields + 1 green harp) already match. |

## Notes / non-issues (verified accurate, no change needed)

- **Trade ships** (`base-large-trade-ship`, `base-gold-ship`, `base-ore-ship`, `base-grain-ship`, `base-lumber-ship`, `base-brick-ship`, `base-wool-ship`): every ship shows a commerce (gold scales) icon top-right, but JSON records only `values.other: "2:1"` and no `commerce`. This is consistent across all 7 ships, so it reads as a deliberate model choice (commerce captured elsewhere or out of scope) rather than a data error. Costs all = lumber+wool (correct), trade ratios correct. **Advisory only, low confidence it's a defect.**
- **base-abbey**: JSON `rules_text` gives the game function ("Provides 1 progress point…"); the card's printed bottom line is flavor ("Progress is not the only thing here; you also get red wine and lots of dark beer"). The functional rules_text is correct and the purple progress icon → `values.progress: 1` matches. No change.
- **Doubling buildings** (iron-foundry, grain-mill, lumber-camp, brick-factory, weaver's-shop): all show the green "2x" flags on both lower corners and correct cost icons; `values.other` describes them. Costs verified: lumber-camp = lumber+ore (correct, the second icon is dark ore not wool), brick-factory = brick+ore, iron-foundry = brick+ore, grain-mill = lumber+grain, weaver's = lumber+wool. All accurate.
- **Heroes** austin/harald/inga/osmund: costs and strength(blue axe-shield)/skill(green harp) icon counts all match JSON exactly.
- **Buildings** toll-bridge (lumber+brick, commerce, Plentiful Harvest 2 gold), storehouse, marketplace (grain+wool, commerce), parish-hall (brick+grain): all costs, commerce icons, and rules text match.
- **Action/Event cards** (brigitta, relocation, scout, merchant-caravan, goldsmith, invention, yule, year-of-plenty, fraternal-feuds, feud, traveling-merchant, trade-ships-race): no cost icons (correct — none have costs), rules text matches the printed text materially. Categories "Action – Neutral" / "Event" map correctly to JSON `action`/`event`.

## Conservative stance

Per the loader rule (do not invent requirements), I flagged only what icons clearly show. The only hard cost errors are the two heroes above (Siglind, Candamir), both involving the wool count. No requirement/`values.requires` mismatches were found on base cards (base cards have no `requires` fields and none of the images show a build-prerequisite requirement icon).
