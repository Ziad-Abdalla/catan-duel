# Age of Darkness — full-playability audit (2026-06-22)

Goal: make the 3 Age of Darkness sets (Intrigue 21 · Merchant Princes 24 · Barbarians 21 = 66 cards)
**fully playable** in the trust-based hot-seat. Produced by a 16-agent read-only audit
(`wf_9855b78a-cf6`): 10 per-card auditors + 5 mechanic auditors + 1 arbiter. Findings below are the
arbiter's synthesis **corrected against live `cards.json`** (the arbiter cited some stale line numbers
and one invalid category — fixed here).

"Fully playable" under this engine = each card can be (a) **placed** where it belongs and (b) its effect
**resolved/tracked** (guided EFFECTS step, the universal toolkit, or a bespoke affordance). The engine
never enforces legality.

## Verification corrections to the raw agent report
- Commercial Harbor copies are **x2** in live data (matches rulebook) — NO fix needed (agent read stale data).
- `pilgrimage-site` "extraordinary site" category is **invalid** (not in `CardCategory`) — keep `building`.
- Trade ships already render in **building sites** (`hero-or-unit`, tag `Unit - Trade Ship`). "Place on roads"
  = **road complements** (Trading Post own-road; Brigand Camp/Barbarian Stronghold foreign), not ships.

---

## 1. Three systemic mechanic gaps (the real "missing things")

### A. Residence / region-expansion rotation — **HIGH** (the owner's example)
Cards placed *adjacent to a region* that **rotate through levels** (spend 2 of the adjacent resource → benefit):
`merchants-cloth-merchants-residence` (pasture), `merchants-paper-merchants-residence` (forest),
`barbarians-border-fortress` (hills). Dependents: `merchants-craft-guild` (rotate ALL residences up),
`merchants-commercial-harbor` (downgrade 1 residence → 2 resources), `merchants-hour-of-the-master-merchants`
(rotate all up; top-level → adjacent region gains), `merchants-commercial-metropolis` (requires top-level residence).
**Gap:** placed cards have NO level/rotation state (only regions `stored` and the plate marker tracks rotate).
**Approach:** add `PlacedCard.level`, a `setPlacedLevel` action, per-level value lookup in `computeStats`, a level
badge + rotate buttons in the `Site` component, and adjacent-to-region placement. Effort **M**.

### B. Road-complement placement — **HIGH** (the owner's example)
`merchants-trading-post` (your own free road, x2 on different roads; 1×/turn trade between the two adjacent regions),
`merchants-brigand-camp` + `barbarians-barbarian-stronghold` (foreign, on opponent road),
`merchants-trading-station` (foreign, on an opponent **city building site**).
**Gap:** road slots accept only a road piece (`buildPiece road`); a card can't be dropped on a road. Trading Post is
neither foreign nor road-eligible → unplayable. Foreign cards land in a generic strip, not on a road/site.
**Approach:** make road slots accept a card drop (own + foreign), store the road-slot index on the placed card, render
the complement on the road; route Trading Post via a road placement (own). Effort **M–L**.

### C. Place-on-another-card — **MED**
`merchants-commercial-metropolis` upgrades a **city** (combined 4 VP, unremovable); `intrigue-bran-defender-of-the-temple`
sits on your Odin's Temple (Bran + Temple = 2 VP together); `intrigue-judith-guardian-of-the-church` pairs with a Church.
**Gap:** no affordance to stack/attach a card onto an occupied slot; combined scoring is accidental.
**Approach:** `PlacedCard.attachedTo` + an attach action + overlay badge; metropolis as a city upgrade with combined VP.
Effort **S–M**.

### D. Barbarian invasion + Triumph fidelity — **MED**
`barbarians-barbarian-attack` (x3) defence resolution; the Triumph marker (plate) ↔ `barbarians-triumph-card`;
defence buildings Castle/Arsenal/Border Fortress/Bailiwick/Secret Brotherhood/Caravel; 13-VP threshold.
**Gap:** Triumph card/marker not linked; Triumph level not auto-scored as VP; Barbarian Attack only has guidance text.
**Approach (consistent with non-enforcing design):** keep resolution guided, link Triumph card→marker, optionally fold
Triumph level into `computeVP` (needs the per-level VP mapping from the physical card). Effort **S** (excl. data).

---

## 2. Data fixes (live `cards.json`)

Confirmed wrong against live data (apply):
- `merchants-master-merchants-alliance`: spurious `victory_points: 2` (rulebook lists no VP) → remove. `commerce` confirm.
- `intrigue-judith-guardian-of-the-church`: `vp:2` is the **joint** Judith+Church value; `commerce:1` likely should be skill. Confirm.
- `intrigue-bran-defender-of-the-temple`: `vp:2` joint with Temple; `commerce:1` confirm.
- `barbarians-siegfried-...`: `requires` `"Caft and at least 2 heroes."` → `"Castle and at least 2 heroes"`.
- `barbarians-castellan`: `requires` `"Castle."` → `"Castle"` (trailing period breaks the parser).
- `merchants-commercial-harbor`: `requires` `"of the highest level 2 Residences"` is garbled → set to `"City"` (or empty).
- `merchants-commercial-metropolis`: `requires` `"1 Residence of the highest level or 6 commerce points"` unparseable → rework.
- `barbarians-caravel`: category `building` → `hero-or-unit` (Unit – Ship).
- `barbarians-border-fortress`: missing per-level `strength`; clarify build-cost vs rotation-cost in rules_text.
- `barbarians-arad-the-strategist`: name "Arad" → "Arnd"; missing `strength:1`. `barbarians-baroc`, `siward`: add `strength:1`.
- `barbarians-bailwick`: name "Bailwick" → "Bailiwick".
- `barbarians-triumph-card`: `category` building; rulebook calls it a Marker Card; copies x3 vs rulebook 2 — confirm.
- Many `requires:"City"` missing on city-expansion buildings (great-thingstead, abbey-brewery, etc.).
- **Garbled `rules_text` across most AoD cards** (vision artifacts) → rewrite as concise paraphrases from the rulebook index.

Needs physical-card confirmation (no fabrication): per-level Residence stat progression; hero strength points;
Triumph level→VP mapping; several costs (Lighthouse, Herold, Gero, Olaf, Wolfgang, Pilgrimage Site, Great Thingstead);
Judith/Bran commerce-vs-skill; Master Merchants' Alliance stats; Triumph card copy count (2 vs 3).

## 3. Requirements parser fixes (`requirements.ts`)
Comma-OR ("Church, Abbey or Chapel"); negation ("no Abbey"); trailing-period strip; "N trade ships"
(count placed cards whose tag contains "Trade Ship", normalizing hyphen/en-dash); "at least N heroes";
"Triumph Card indicating at least N victory point(s)" (read `markers.triumph`); "top-level Residence" / "N commerce".

## 4. EFFECTS registry gaps (`effects.ts`)
~20+ AoD cards with activated/triggered effects lack a guided entry (Judith, Godfrey, Trading Station, Olaf,
Secret Brotherhood, Bailiwick, White Raven Tavern, Marie, Wolfgang, Ship Builder, Border Fortress, Triumph Card,
Baroc, Siward, Castle, Arsenal, Caravel, Arad, Sacrificial Site…). Extend existing entries (good-neighbors,
religious-dispute, capricious-sea Calm/Storm, fortunate-trade-voyage 2-per-player) with missing sub-steps.

## 5. Open decisions for the owner — see the questions posed in chat (depth, physical-card data, commit cadence).
