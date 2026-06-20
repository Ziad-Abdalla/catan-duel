# Card Requirements & Effects Audit — catan-duel

**Date:** 2026-06-20
**Scope (READ-ONLY audit — no code edited):** every non-region/non-base-foundation building &
expansion card in `src/data/cards.json` for the sets **base, gold, turmoil, progress**.
**Game:** *The Rivals for Catan / CATAN – Das Duell* (same ruleset; see
`docs/goal-2026-06-19/06-official-rules-research.md` and `docs/OFFICIAL_SETUP_VERIFICATION.md`).

## How requirements flow through the engine (so fixes land in the right field)

`src/data/cards.ts` → `requirementOf(card)`:

```
if (card.values?.requires) return card.values.requires
const m = card.rules_text?.match(/Requires:\s*([^.]+)/i)   // else parse "Requires: X" from rules text
return m ? m[1].trim() : null
```

So a requirement is recognised **only** if it is either (a) in `values.requires`, or (b) written as
a literal `Requires: …` clause inside `rules_text`. `src/engine/requirements.ts` then interprets the
string: it understands `strength advantage`, `trade advantage`, `N commerce` (+ `or city`),
`N progress`, `hero with at least 1 strength`, named buildings, `city`, and the
`… or fewer victory points than your opponent` escape hatch.

### THE CORE FINDING — "city" requirements are almost entirely missing

Per the official rulebook (`06-official-rules-research.md` Q1), there are **two** expansion card types:

- **GREEN "settlement/city expansion"** — placeable on a settlement (2 sites) OR a city (4 sites).
- **RED "city expansion"** — *city-ONLY*; "You may only place a city expansion card on a building site
  adjacent to a **city**." (rulebook p.14). A bare (un-upgraded) settlement can never hold one.

**The data does not encode the green/red distinction at all** — there is no `placement` /
`cityOnly` flag and the city-expansion cards do **not** say `Requires: City`. The engine's
`hasCity()` / `requirementMet` "city" branch therefore never fires for them, so the UI cannot tell
the player "this needs a City." This is the owner's exact complaint: *"how many buildings need a city
but you don't say that — specify that."* Every RED city-expansion below should gain
`"requires": "City"` in `values` (or a `Requires: City.` clause in `rules_text`) so the engine and the
read-out both communicate it.

> Note: a few cards already carry a printed `Requires:` clause that the engine reads correctly
> (Gold Cache, Staple House, Trade Master, Merchant, University, Building Crane, Parliament,
> Chief Cannoneer, Three-Field System, Mineral Mining, Archer, Arsonist, Traitor, Guido, Gustav,
> the attack cards). Those are NOT the gap; the gap is the **city-only** placement requirement which
> is a different rule and is missing everywhere.

---

## Master table

Legend for **OFFICIAL requirement**: `CITY` = red city-expansion, must be built adjacent to a City.
`S/C` = green settlement/city expansion (no city needed). Named prereqs are the printed `Requires:`.

| id | name | set | cost (json) | requirement in json | OFFICIAL requirement | official effect (summary) | MISMATCH? | suggested json fix |
|---|---|---|---|---|---|---|---|---|
| base-toll-bridge | Toll Bridge | base | lumber1+brick1 | — | S/C (none) | Plentiful Harvest event → +2 gold | No | — |
| base-storehouse | Storehouse | base | lumber1+wool1 | — | S/C (none) | Brigand Attack: ignore 2 neighbouring regions | No | — |
| base-iron-foundry | Iron Foundry | base | brick1+ore1 | — | S/C (none) | Doubles ore of neighbouring mountains | No | — |
| base-grain-mill | Grain Mill | base | lumber1+grain1 | — | S/C (none) | Doubles grain of neighbouring fields | No | — |
| base-lumber-camp | Lumber Camp | base | lumber1+ore1 | — | S/C (none) | Doubles lumber of neighbouring forests | No | — |
| base-brick-factory | Brick Factory | base | brick1+ore1 | — | S/C (none) | Doubles brick of neighbouring hills | No | — |
| base-weaver-s-shop | Weaver's Shop | base | lumber1+wool1 | — | S/C (none) | Doubles wool of neighbouring pastures | No | — |
| base-abbey | ABBEY | base | brick1+grain1+ore1 | — | S/C (none) | **Provides 1 progress point** (prerequisite for University) | **YES — effect blank** | set `values.progress: 1`; rules_text "Provides 1 progress point." (currently empty; `unclear` flags it). Abbey is a progress-point building, not effect-less. |
| base-marketplace | MARKETPLACE | base | grain1+wool1 | — | S/C (none); has 1 commerce point | If a number is rolled more often on opp regions, take 1 resource | partial | effect text OK; add `values.commerce: 1` (Marketplace prints a commerce point — Trading Base references it). |
| base-parish-hall | PARISH HALL | base | brick1+grain1 | — | S/C (none) | Pay only 1 resource to choose a card from a draw stack | No | — |
| base-large-trade-ship | LARGE TRADE SHIP | base | lumber1+wool1 | — | S/C (none) | Trade 2 of a neighbouring region's resource for 1 | No | — |
| gold-storehouse | STOREHOUSE | gold | lumber1+wool1 | — | S/C (none) | (dup of base Storehouse) | No | — |
| gold-toll-bridge | TOLL BRIDGE | gold | lumber1+brick1 | — | S/C (none) | (dup of base Toll Bridge) | No | — |
| gold-gold-cache | GOLD CACHE | gold | **[] (none)** | `Hero with at least 1 strength point` (parsed from text) | S/C; req hero≥1 strength | Stores gold safe from Brigand Attack | **YES — cost missing** | Gold Cache **has a build cost** (lumber+wool in the physical set). Empty cost is almost certainly an OCR miss — confirm & fill (likely `lumber1+wool1`). Requirement itself is fine. |
| gold-pirate-ship | PIRATE SHIP | gold | lumber1+wool1 | — | S/C (none) | Sink an opp trade ship; Plentiful Harvest → +1 gold | No | — |
| gold-large-trade-ship | LARGE TRADE SHIP | gold | lumber1+wool1 | — | S/C; 1 commerce | Trade 2 neighbouring for 1 | No | — |
| **gold-merchant-guild** | MERCHANT GUILD | gold | brick1+wool1+grain1 | — | **CITY** (red city-expansion; face-up 1x supply) | 1 commerce point; prereq for Staple House/Trade Master | **YES — needs City** | add `values.requires: "City"`. It is the Era-of-Gold red city expansion (rulebook names it city-only). |
| gold-moneylender | MONEYLENDER | gold | lumber1+ore1+brick1 | — | S/C (none) | Trade advantage + Trade event → take 2 from opp | No | — |
| **gold-harbor** | HARBOR | gold | brick1+wool1+ore1 | — | **CITY** (red city-expansion) | 1 commerce; +1 VP while ≥3 trade ships | **YES — needs City** | add `values.requires: "City"`. Rulebook explicitly lists Harbor as a red city-only expansion. |
| **gold-trading-base** | TRADING BASE | gold | grain1+wool1+brick1 | — | **CITY** (red city-expansion) | Marketplace & Harbor get a 2nd commerce point | **YES — needs City** | add `values.requires: "City"`. Rulebook explicitly lists Trading Base as city-only. |
| gold-mint | MINT | gold | lumber1+ore1+brick1 | — | S/C (none) | Once/turn trade 1 gold → 1 resource | No | — |
| gold-staple-house | STAPLE HOUSE | gold | brick1+ore1+wool1 | `Merchant Guild` (parsed) | S/C; req **Merchant Guild** | Build → +2 resources | No (req present) | OK. (Indirectly needs a city since Merchant Guild does, but that's transitive — fine.) |
| gold-salt-silo | Salt Silo | gold | wool1+gold1+brick1 | — | S/C (none) | Each trade ship +1 commerce | No | — |
| turmoil-drill-ground | Drill Ground | turmoil | brick1+ore1 | — | S/C (none) | Each hero built costs 1 resource less | No | — |
| turmoil-lookout-tower | Lookout Tower | turmoil | lumber1+grain1 | — | S/C (none) | Roll 1–2 negates opp Archer/Arsonist/Traitor | No | — |
| turmoil-chapel | Chapel | turmoil | ore1+brick1+grain1 | — | S/C (none) | Roll 1–3 → Riots doesn't apply to you | No | — |
| turmoil-fairgrounds | Fairgrounds | turmoil | lumber1+grain1+wool1 | — | S/C (none) | More skill than opp → +2 resources on build | No | — |
| turmoil-hedge-tavern-1x | Hedge Tavern (1x) | turmoil | gold1+grain1+wool1 | — | **S/C, face-up 1x supply** (green, NOT city) | Prerequisite enabling Archer/Arsonist/Traitor | **YES — effect blank** | rules_text empty + `unclear` flags it. Hedge Tavern is a prerequisite-only building (its value is that it unlocks the 3 attack cards). Add a rules_text note e.g. "Required to play Archer, Arsonist and Traitor." It is the Era-of-Turmoil face-up 1x expansion (correct tag), **not** city-only. |
| turmoil-tithe-barn | Tithe Barn | turmoil | lumber1+brick1+grain1 | — | S/C (none) | Build → 1 grain OR wool per hero you own | No | — |
| **turmoil-large-festival-hall** | Large Festival Hall | turmoil | gold2+ore2+brick2 | — | **CITY** (red city-expansion) — confidence low in json | Worth **2 victory points** (the two red banner markers) | **YES — VP missing + needs City** | set `values.victory_points: 2` (the "2 red flag/banner markers" ARE 2 VP); add `values.requires: "City"`. Large Festival Hall is a red city expansion worth 2 VP. The json's own `unclear` already doubts the banners. |
| turmoil-fire-brigade | Fire Brigade | turmoil | wool1+brick1+ore1 | — | **CITY** (red city-expansion) | This city's buildings are safe from the Arsonist | **YES — needs City** | rules_text already says "This **city's** buildings…" → it is inherently city-attached. Add `values.requires: "City"` so the engine flags it. |
| progress-town-hall | TOWN HALL | progress | wool1+ore1+brick1 | — | **CITY** (red city-expansion); placed on Parish Hall | Upgrades Parish Hall: end of turn, choosing a card is free | **YES — needs City** (and references Parish Hall) | add `values.requires: "City"`. Town Hall is an Era-of-Progress red city expansion. (It also sits on a Parish Hall, but its placement site is a city building site.) |
| progress-university | UNIVERSITY | progress | lumber1+grain1+brick1 | `Abbey or Library` (parsed) | **CITY** + req **Abbey or Library**; face-up 1x; 1 skill | Prereq for Chief Cannoneer, Building Crane, 3-Field, Mineral Mining | **YES — also needs City** | requirement string present but **incomplete**: University is a red city expansion AND needs Abbey/Library. Change `values.requires` to `"City and (Abbey or Library)"` (or keep text req + add city). At minimum the city half is missing. |
| progress-library | LIBRARY | progress | lumber1+brick1+ore1 | — | **CITY** (red city-expansion) | Build → immediately choose a card from a draw stack | **YES — needs City** | add `values.requires: "City"`. Library is a red city expansion (and itself a University prereq). |
| progress-pharmacy | PHARMACY | progress | wool1+brick1+gold1 | — | **CITY** (red city-expansion) | Plague event → you still get 1 resource | **YES — needs City** | add `values.requires: "City"`. |
| progress-bath-house | BATH HOUSE | progress | brick1+wool1+ore1 | — | **CITY** (red city-expansion) | Protects this city's 4 bordering regions from Plague | **YES — needs City** | rules_text already says "bordering **this city**". Add `values.requires: "City"`. |
| progress-building-crane | BUILDING CRANE | progress | lumber1 | `University` (parsed) | **CITY** + req **University** | City expansions costing >4 cost 1 less | **YES — also needs City** | req present but city half missing. Set `values.requires: "City and University"` (University itself implies a city, so this is transitively covered, but state it for the read-out). |
| progress-parliament | PARLIAMENT | progress | lumber2+brick1+wool1 | `2 progress points` (parsed) | **CITY** + req **2 progress points**; the 2 orange icons = **building sites / VP** | "For the benefit of the people…" — provides extra building capability | **YES — effect vague + city** | the rules_text is only flavour; the real effect (the 2 orange settlement icons) is undocumented — confirm against the card (Parliament grants extra settlement/expansion capacity). Add `values.requires` to include City alongside the 2-progress req. |
| progress-chief-cannoneer | Chief Cannoneer | progress | lumber1+ore1 | `University` (in values) | S/C unit; req **University** (4 strength) | Strength 4 hero; needs University | No (req present) | OK. (Unit, not a building — no city needed itself; University prereq already encoded.) |

### Action / event cards with requirements (verified correct — listed for completeness)

These already carry a parseable `Requires:` and the engine reads them. **No change needed** unless noted.

| id | requirement (parsed) | OK? |
|---|---|---|
| gold-trade-master | Merchant Guild | yes |
| gold-merchant | 3 commerce points or city | yes (engine handles `N commerce … or city`) |
| gold-brigands / turmoil-brigands | Strength advantage | yes |
| turmoil-voyage-of-plunder | Strength advantage | yes |
| turmoil-archer / turmoil-arsonist / turmoil-traitor | Hedge Tavern | yes |
| progress-three-field-system / progress-mineral-mining | University | yes |
| progress-guido-the-ambassador | Town Hall or fewer VP than opponent | yes |
| progress-gustav-the-librarian | Library or fewer VP than opponent | yes |

---

## (a) Cards that REQUIRE A CITY but don't say so in the data

These are the RED "city expansion" cards. **None** currently states a city requirement; all need
`values.requires` to include `"City"` (the engine's `requirementMet` already has a `city` branch via
`hasCity()` — it just never gets the string today):

1. `gold-merchant-guild` — Merchant Guild (Era of Gold)
2. `gold-harbor` — Harbor (Era of Gold)
3. `gold-trading-base` — Trading Base (Era of Gold)
4. `turmoil-large-festival-hall` — Large Festival Hall (Era of Turmoil)
5. `turmoil-fire-brigade` — Fire Brigade (Era of Turmoil)
6. `progress-town-hall` — Town Hall (Era of Progress)
7. `progress-university` — University (Era of Progress) — add City **alongside** the existing "Abbey or Library"
8. `progress-library` — Library (Era of Progress)
9. `progress-pharmacy` — Pharmacy (Era of Progress)
10. `progress-bath-house` — Bath House (Era of Progress)
11. `progress-building-crane` — Building Crane (Era of Progress) — add City alongside "University"
12. `progress-parliament` — Parliament (Era of Progress) — add City alongside "2 progress points"

**= 12 city-requiring cards, all currently silent on the city requirement.**

> Cross-check / confidence note: items 1–3 (Harbor, Merchant Guild, Trading Base) are named city-only
> **verbatim** in `06-official-rules-research.md` (HIGH confidence). Items 4–12 are classified city-only
> from the Rivals card type ("red text box = city expansion", Era-of-Progress city expansions, and the
> "this city's …" wording printed on Fire Brigade / Bath House). The owner should verify 4–12 against
> the physical red/green text-box colour, but the rulebook's structure and the card wording make these
> the correct set. Lower-confidence members to double-check: Town Hall, Parliament, Library (some
> printings treat these as city expansions; their effects clearly attach to a city).

## (b) Wrong / missing COST

- **`gold-gold-cache`** — `cost: []` (none). The Gold Cache is a buildable expansion and has a printed
  build cost (lumber+wool in the set). Empty cost is an OCR/transcription miss. **Fill the cost.**
- **`turmoil-large-festival-hall`** — cost transcribed `gold2+ore2+brick2` but flagged `confidence:low`
  with an `unclear` note doubting the icon counts. Verify against the physical card.
- (`base-siglind` hero has `cost: []` — Siglind is a free/starting hero in some variants; out of the
  building scope but worth confirming.)

## (c) Wrong / missing REQUIREMENT

- All 12 city cards in (a) — missing the city requirement.
- `progress-university` and `progress-building-crane` — requirement present but **incomplete** (missing
  the city half).
- No *false* requirements were found (no card claims a prereq it shouldn't have). The remaining
  building cards (Storehouse, Toll Bridge, the production-doublers, Mint, Moneylender, Drill Ground,
  Lookout Tower, Chapel, Fairgrounds, Tithe Barn, etc.) are genuinely green/no-prereq — correct as-is.

## (d) Effect text wrong / unclear

- **`base-abbey`** — `rules_text: ""`. Abbey is **not** effect-less: it is a **progress-point**
  building (the prerequisite chain for University). Add `values.progress: 1` and a rules_text line.
  The json's own `unclear` already asks this.
- **`turmoil-hedge-tavern-1x`** — `rules_text: ""`. Hedge Tavern is a **prerequisite** building that
  unlocks Archer/Arsonist/Traitor (those three already say `Requires: Hedge Tavern`). State that in
  rules_text so the read-out isn't blank.
- **`turmoil-large-festival-hall`** — `rules_text: ""` with two red banners. Those banners are **2
  victory points**. Add `values.victory_points: 2` and a rules_text line. (Also needs City per (a).)
- **`progress-parliament`** — rules_text is only flavour ("For the benefit of the people…"); the actual
  game effect (the two orange settlement/site icons) is undocumented. Confirm the real effect (extra
  building capacity) against the card and write it.
- **`base-marketplace`** / **`gold-large-trade-ship`** — effect text fine; Marketplace should also carry
  `values.commerce: 1` (Trading Base's effect references the Marketplace's commerce point), and Large
  Trade Ship already has commerce 1 in the gold copy but the **base** copy
  (`base-large-trade-ship`) does not — confirm whether the base Large Trade Ship prints a commerce point.

---

## Suggested concrete edits (apply directly)

For each city card, add to its `values` object:

```jsonc
"requires": "City"
```

except the two with an existing partial requirement:

```jsonc
// progress-university
"requires": "City and (Abbey or Library)"
// progress-building-crane
"requires": "City and University"
// progress-parliament
"requires": "City and 2 progress points"
```

(The engine's `requirementMet` splits on `or`/named buildings and has a `city` branch, so
`"City and …"` strings will at least surface the city via `hasCity()`. If exact AND-logic is wanted,
that is an `requirements.ts` enhancement — out of scope for this data audit, but worth a follow-up.)

Other edits:
- `gold-gold-cache`: fill `cost` (likely `[{lumber:1},{wool:1}]` — verify).
- `base-abbey`: `values.progress: 1` + rules_text "Provides 1 progress point."
- `turmoil-large-festival-hall`: `values.victory_points: 2` + rules_text noting 2 VP.
- `turmoil-hedge-tavern-1x`: rules_text "Required to play Archer, Arsonist, and Traitor."
- `base-marketplace`: `values.commerce: 1`.
- `progress-parliament`: real effect text once confirmed.

## Summary counts

- **Building/expansion cards audited (the focus set):** 33 (plus 8 requirement-bearing action/event
  cards verified correct = 41 cards examined total).
- **Cards with a MISMATCH needing a json fix:** **18**
  (12 missing-city + Gold Cache cost + Abbey effect + Hedge Tavern effect + Large Festival Hall VP +
  Parliament effect + Marketplace commerce; University & Building Crane are inside the 12).
- **Cards that REQUIRE A CITY but don't say so:** **12** (the list in section (a)).
- **Cost errors:** 1 hard (Gold Cache empty) + 1 to verify (Large Festival Hall).
- **Effect text blank/unclear:** 4 (Abbey, Hedge Tavern, Large Festival Hall, Parliament).
</content>
</invoke>
