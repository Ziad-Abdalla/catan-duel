# Cards Audit — PROSPERITY set ("The Rivals for Catan")

Read-only, image-grounded accuracy audit. Ground truth = card art at
`src/assets/cards/<id>.webp`; data under audit = `src/data/cards.json`
(cards with `"set":"prosperity"`, 26 total).

Method: read each `.webp` with the Read tool; for ambiguous resource icons
the top-left cost column and bottom-right value badge were cropped + upscaled
4–7x with PIL (`/tmp/crop`) to disambiguate wool (sheep) vs grain (sheaf) vs
gold (yellow nugget) vs ore (grey rock), and to read value-badge colour
(blue=strength, green=skill/progress, gold scales=commerce).

## Summary (counts by confidence)

- **HIGH: 6** — Mercenaries cost, Hospital cost, Theater cost, Aqueduct cost,
  Builder's Hut cost, Thieves' Hideout cost.
- **MED: 5** — Monument cost, Prince value, Princess value, Bera `requires`
  typo, Public Feeling category.
- **LOW: 2** — Artwork VP consistency, attack/marker sub-category labels.

All other prosperity cards (rules text + cost where checkable) **verified — no
change needed**: Common Land, Village School, Traveling Theater, Small Market
Town, City Palace, Prince/Princess rules text + requires, Feeding the Poor,
Artwork: Sculpture/Epic/Fountain/Relief (text), Court Astrologer, Prosperity,
Insurrection, Taxation, Card Back.

## Findings (only cards needing change)

| id | field | current (JSON) | correct (per image) | conf | image evidence |
|---|---|---|---|---|---|
| prosperity-mercenaries | cost | wool×1, ore×1 | ore×1, **gold×1** | HIGH | top-left 2 icons = grey rock (ore) + yellow nugget (gold); no sheep |
| prosperity-hospital | cost | lumber×2, ore×1 | **wool×2**, lumber×1, ore×1 | HIGH | 4 icons: two sheep, one log-bundle, one ore rock |
| prosperity-theater | cost | lumber×2, brick×1 | **wool×2**, lumber×1, brick×1 | HIGH | 4 icons: two sheep, one log-bundle, one brick |
| prosperity-aqueduct | cost | brick×2, ore×2 | **lumber×2**, brick×2, ore×2 | HIGH | 6 icons in 3 rows: 2 logs, 2 brick, 2 ore (consistent w/ Builder's Hut "6+ resources" example) |
| prosperity-builders-hut | cost | brick×2, ore×1 | brick×2, **ore×2** | HIGH | 4 icons: two brick, two ore rocks |
| prosperity-thieves-hideout | cost | lumber×1, brick×1, ore×1 | **wool×1** | HIGH | single top-left icon = one sheep; it is an "Extraordinary Site" placed/moved for 1 wool, not a 3-resource build |
| prosperity-monument-to-the-prince | cost | grain×2, brick×1 | **gold×2**, brick×1 | MED | cost icons are yellow nuggets (gold), not wheat sheaf; (two star tokens sit above, not a resource cost) |
| prosperity-prince | values.victory_points | 1 | **strength: 1** (drop VP) | MED | bottom-right badge is BLUE = strength symbol (Rivals: Prince = +1 strength) |
| prosperity-princess | values.victory_points | 1 | **skill: 1** (drop VP) | MED | bottom-right badge is GREEN = skill/progress symbol (Rivals: Princess = +1 skill) |
| prosperity-bera-the-insurrectionist | values.requires | "Public Fencing" | "Public Feeling" | MED | printed "Requires: Public Feeling"; rules_text already says Public Feeling — `requires` is a typo |
| prosperity-public-feeling | category | building | "Marker Card" (not a building) | MED | printed sub-label reads "Marker Card"; map to the project's marker/non-building category |
| prosperity-artwork-* | values.victory_points | Sculpture=1; Epic/Fountain/Relief = none | likely uniform across the 4 artworks | LOW | text identical pattern; VP not printed in body — verify intended VP model; either all 4 carry it or none do |
| prosperity-court-astrologer / bera | category | action | printed "Action – Attack" (vs Neutral) | LOW | if the schema distinguishes attack actions, these two read "Action – Attack" |

## Notes / non-issues
- Common Land cost `[]` is consistent with its "Extraordinary Site" frame (no
  resource build cost shown); top-left icon is the site marker, not a cost.
- Small Market Town: cost grain×1 ✓ and commerce:1 ✓ (gold scales badge).
- Mercenaries strength:1 ✓ (blue crossed-swords badge).
- Builder's Hut skill:1 ✓ (orange pennant badge); rules "6+ resources" ✓.
- Prince/Princess rules text, "1x", artwork-retrieval, "cannot be taken", and
  the cross-requires (Prince⇒not Princess, Princess⇒not Prince) all match art.
- Insurrection / Taxation / Prosperity / Feeding the Poor text matches art.

Confidence convention: HIGH = icons unambiguous after upscale; MED = strong
read but icon/colour interpretation or rules-knowledge dependent; LOW =
plausible inconsistency worth confirming, not a definite error.
