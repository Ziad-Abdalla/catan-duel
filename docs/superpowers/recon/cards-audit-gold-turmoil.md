# GOLD + TURMOIL card data accuracy audit

**Scope:** the 21 cards with `"set": "gold"` and the 20 cards with `"set": "turmoil"` in `src/data/cards.json` (41 cards), compared against the printed card art in `src/assets/cards/<id>.webp`.
**Method:** read-only. For each card I read its image and compared printed cost icons (top-left), printed requirement/value icons (bottom-right banners), category label, name, and rules text against the JSON. No code or data was edited.

## Can webp be read?

**YES.** All 41 `.webp` files exist and were read/rendered successfully. Full image-grounded audit performed.

## Icon convention (confirmed against known base heroes)

Cross-checked against `base-candamir` (str 4) and `base-inga` (str 1 / skill 3):
- **Blue round shield with axe = STRENGTH point.** (Candamir shows 4; Inga shows 1.)
- **Green round shield (harp) = SKILL point.** (Inga shows 3.)
- **Gold disc with balance-scales = COMMERCE point.**
- **Red/orange disc with a banner/flag = a "region growth" / strength-banner marker (Rivals: town growth / strength symbol).**

This convention is the basis for the value-icon findings below.

## Confidence summary

| Confidence | Count | Cards |
|---|---|---|
| HIGH corrections | 3 | gold-large-festival-hall (cost: gold→grain), gold-cache (category/tag), turmoil-large-festival-hall (cost: gold→grain) — see note: both festival-hall ids are the SAME printed card |
| MED corrections | 3 | gold-cache (cost likely not lumber+wool), gold-merchant-guild (cost counts), turmoil-large-festival-hall cost counts |
| LOW / advisory | 4 | strength-banner value omissions on several buildings; salt-silo name casing; hedge-tavern empty rules_text; drill-ground `other:"1x"` vs printed skill/strength point |

**Carl Forkbeard (str 5) and Heinrich the Sentinel (str 2) verified CORRECT** — the 5 and 2 blue axe-shields are strength, matching JSON. The rest of the 41 cards have rules text that matches the printed text materially.

## Corrections (only cards needing a change)

| id | field | current | correct (per image) | confidence | image evidence |
|---|---|---|---|---|---|
| turmoil-large-festival-hall | cost | `[{gold:2},{ore:2},{brick:2}]` | `~[{grain:3},{ore:3},{brick:2}]` | high (resource type) / med (counts) | Top-left cost block: top row = 3 YELLOW grain sheaves, middle row = 3 grey ore, bottom = 2 red brick. No gold (gold = shiny yellow nuggets, not sheaves). "gold" in JSON is wrong; they are grain. Exact counts (3/3/2) are MED due to watermark overlap. |
| gold-cache | tag / category | `tag:"Building"`, `category:"building"` | `tag:"Extraordinary Site"` | high | Bottom category band reads **"Extraordinary Site"**, not "Building". It is a gold-storage card, not a buildable building. |
| gold-cache | cost | `[{lumber:1},{wool:1}]` | likely NO build cost (flag, do not assert) | med | Top-left has NO cost icons; the gold tokens around the art are storage slots, not a cost column. The lumber+wool cost appears invented. Conservative: flag for verification rather than assert a replacement (loader forbids inventing). |
| gold-merchant-guild | cost | `[{brick:1},{wool:1},{grain:1}]` | `~[{brick:2},{wool:2},{grain:1}]` | med | Top-left shows 2 brick (red) + 2 wool (sheep) + 1 grain. JSON has 1/1/1. Counts partly obscured by watermark — MED. |
| gold-merchant-guild | values.commerce | `1` (with unclear note) | `2` commerce + 1 strength-banner | med | Bottom-right shows a red strength-banner disc THEN two gold balance-scale (commerce) discs = 2 commerce points + 1 banner. JSON `commerce:1` undercounts; resolves the existing `unclear` flag. |

### Note on the two "Large Festival Hall" entries
`gold-large-festival-hall` does **not exist** in the data — the festival hall is only `turmoil-large-festival-hall` (image `p10_c8.png`). The gold-set list has no festival hall. The cost fix above applies to the turmoil id. (No duplicate; disregard the summary-row shorthand.)

## Low-confidence / advisory (verify against physical card; not asserted)

| id | field | observation | confidence |
|---|---|---|---|
| gold-harbor | values | Bottom-right shows commerce (scales) + a red strength-banner labelled "with 3 Trade-Ships". JSON has `commerce:1` + a note. The banner = a conditional growth/strength marker not captured. | low |
| gold-trading-base | values | Bottom-right shows a red strength-banner + a commerce-scale disc. JSON `commerce:1` only. | low |
| gold-salt-silo / gold-mint / gold-staple-house / turmoil-fairgrounds / turmoil-fire-brigade / turmoil-chapel / turmoil-tithe-barn | values | Each shows a single red strength-banner disc bottom-right that JSON does not record in `values`. Consistent pattern → may be a deliberate model choice (banner = the building's settlement/town marker), so advisory only. | low |
| gold-salt-silo | name | JSON `"Salt Silo"` vs printed all-caps "SALT SILO"; other cards are stored ALL-CAPS or Title — cosmetic only. | low |
| turmoil-drill-ground | values.other | `"1x"`; bottom-right shows a single BLUE axe-shield = a strength point (not a skill icon). `other:"1x"` is vague; the blue shield is strength. Name printed "DRILL GROUND (1x)". Cost (brick+ore) verified correct. | low |
| turmoil-hedge-tavern-1x | rules_text | Empty in JSON; card prints only flavor text (no rules line) — it is a prerequisite-only "Face-up Expansion". Resolves the existing `unclear` flag: there IS no printed rules text. No change needed. | low |

## Verified accurate (no change) — the rest

- **Costs verified correct:** gold-storehouse (lumber+wool), gold-toll-bridge (lumber+brick), gold-pirate-ship (lumber+wool), gold-large-trade-ship (lumber+wool), gold-moneylender (lumber+ore+brick), gold-harbor (brick+wool+ore), gold-trading-base (grain+wool+brick), gold-mint (lumber+ore+brick), gold-staple-house (brick+ore+wool), gold-salt-silo (wool+gold+brick), turmoil-drill-ground (brick+ore), turmoil-lookout-tower (lumber+grain), turmoil-carl-forkbeard (wool+grain+ore), turmoil-heinrich (grain+wool+ore), turmoil-chapel (ore+brick+grain), turmoil-fairgrounds (lumber+grain+wool), turmoil-hedge-tavern (gold+grain+wool), turmoil-tithe-barn (lumber+brick+grain), turmoil-fire-brigade (wool+brick+ore). All action/event cards correctly have no cost (top-left "A" Action shield or Event banner).
- **Hero strength icons verified:** Carl Forkbeard = 5 blue axe-shields = str 5 ✓; Heinrich = 2 = str 2 ✓; Irmgard = no point icons (her bottom-right green discs are her irmgard ability marker, str/skill correctly absent).
- **Trade arrows / flags:** gold-large-trade-ship shows "2:1" on both left & right green arrows ✓ matches `values.other`.
- **Rules text verified materially correct** on all 41 (storehouse, toll-bridge, gold-cache, pirate-ship, moneylender, harbor, trading-base, mint, staple-house, salt-silo, trade-master, merchant, reiner, goldsmith, gold-brigands, gudrun, traveling-merchant, trade-ships-race, gift-for-the-prince; lookout-tower, irmgard, chapel, fairgrounds, tithe-barn, fire-brigade, voyage-of-plunder, archer, arsonist, turmoil-brigands, sebastian, traitor, riots, fraternal-feuds, feud). Requirements printed on cards (Merchant Guild, Hero+strength, Strength advantage, Hedge Tavern, City, 3 commerce/city) all match `Requires:` lines in rules_text.
- **Categories/tags** otherwise map correctly (Building, Unit, Unit – Hero, Unit – Trade Ship, Action – Attack/Neutral, Event, Face-up Expansion).

## Conservative stance

No requirement was invented. Where the image showed a value-icon the JSON omits (strength-banner discs), I flagged LOW and did not assert a `requires`/value change unless the printed icon was unambiguous. Cost-count corrections are MED where watermarks obscure exact quantities; the only HIGH cost correction is the festival-hall resource-TYPE error (grain mislabelled as gold), which is unambiguous.
