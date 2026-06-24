# D — Sandbox UX audit (placement freedom · card size · rotation · dynamic supply)

Read-only investigation, 2026-06-24. Catan Duel is a TRUST-BASED MANUAL sandbox
(Tabletop-Simulator style). The engine reducers in `src/engine/actions.ts` already
do NOT enforce rule legality — `playCard`, `playRegionExpansion`, `playForeign`,
`attachCard`, `movePlaced`, `rotatePlaced` all just move/track state. **Every
restriction the owner is hitting is in the UI layer (drop-target arming + the
CardZoom routing), not the engine.** That is the key finding: loosening the UI
guards is sufficient; the engine needs no changes for items 1 and 3.

Note on stylesheets: `src/ui/board/board.css` is a LEGACY sheet (`.board`,
`.pr-regions`, `.mini`, `.deck-row`, fixed 122px regions / 86px cards) still
imported by `TableBoard.tsx:30` but whose classes are NOT rendered by the current
board. The live board is driven by **`table.css`** (`.pboard`, `.pb-*`, `.rtile`,
`.deckwall`, `.cardstack`, `.build-*`) and **`region.css`** (`.rt-*`, `.pb-rexp`).
All size/layout proposals below target `table.css` / `region.css` / `card.css`.

---

## 1. "Place LITERALLY ANY card on any region / building / production slot"

### Current behavior — where placement is RESTRICTED (all UI-side)

Placement is gated in TWO places: (a) which drop targets *arm* (highlight + accept
a drop) while dragging, and (b) which buttons CardZoom shows. The engine accepts
anything.

**A. Building site (`Site`, `PrincipalityBoard.tsx:402-477`)** — the ONE generous
target. It arms for any `dragCardId || selectedCardId || dragRemove` and on drop
calls `playCard` with the site slot (`:435`, `:442-451`). It only blocks if the
site is already `occupied` (`:421`, `:435`). So a hand card of ANY category can
already be dropped into a building site. This is the model to copy.

**B. Region tile (`RegionCell`, `PrincipalityBoard.tsx:254-294`)** — RESTRICTED.
- `:273` `const def = armedId ? regionExpansionOf(armedId) : undefined` — only the
  6 ids in `REGION_EXPANSIONS` (`cards.ts:36-43`) are even candidates.
- `:274` `const matches = !!def && !expansion && (def.resource === 'any' || def.resource === region.resource)`
  — additionally requires the region's terrain to match the card's declared
  terrain (e.g. Cloth Merchant's Residence only arms on a `wool` region). Triumph
  (`resource:'any'`) arms anywhere; everything else is terrain-locked.
- So: a non-region-expansion card (a building, a unit, an action) can NEVER be
  dropped on a region tile, and a region-expansion can only land on its matching
  terrain. `onDragOver`/`onDrop`/`onClick` are all `undefined` unless `matches`.

**C. Road slot (`RoadComplementCell`, `PrincipalityBoard.tsx:350-400`)** —
RESTRICTED. `:368` `const armed = !!armedId && isRoadComplement(armedId) && !isForeignCard(armedId)`
— only the 4 ids in `ROAD_COMPLEMENT_IDS` (`cards.ts:68-73`), excluding foreign
ones, arm on your own road. Anything else: no drop target.

**D. City-upgrade drop (`PrincipalityBoard.tsx:115`, `:138-139`)** — a seat only
accepts a drop when `dragBuild === 'city'` AND it is a settlement.

**E. Road-slot build target (`:164-177`)** — empty road slots only arm when
`dragBuild === 'road'`.

**F. Empty landscape slot (`RegionTile.tsx:150-171`)** — only arms when
`dragBuild === 'landscape'`.

**G. CardZoom routing (`CardZoom.tsx:214-270`)** — the hand-card buttons branch on
card identity: foreign → "Build on opponent's board"; region-expansion → "Place on
a {terrain} region"; road-complement → "Place on your roads"; attachable →
"Place on host"; action/event → "Play card"; everything else → "Play to
principality" (which calls `firstOpenSlot` → a building site). There is no
"place anywhere" path; a region card / road / settlement in hand has no generic
"put it on a region tile / road slot" button.

### Why region tiles reject most things — `region.stored` semantics
A region tile's rotation (`stored` 0–3) is the PRODUCTION resource counter, not a
generic card holder. `RegionCell` overlays a region-EXPANSION badge (`pb-rexp`,
`region.css:252-259`) in the tile's top-right corner; it does not host arbitrary
cards. Dropping, say, a settlement "on a region" has no slot model — there is no
`PlacedCard.slot` convention for "card sitting loose on region N" beyond `rexp-N`
(one per region, `PrincipalityBoard.tsx:54-58`).

### Concrete proposal — loosen each gate (minimal, sandbox-honest)

The cleanest minimal change is to make every drop zone a **"any-card sink"** the
way `Site` already is, while keeping the *smart* auto-routing as the default. Add a
single opt-in: when a card is being dragged and it is NOT the "natural" type for a
zone, still arm the zone and route the drop to a generic placement.

1. **Region tile accepts ANY card** — in `RegionCell` (`PrincipalityBoard.tsx:272-288`):
   - Change `matches` so the zone also arms for a non-expansion card. Introduce
     `const anyArmed = interactive && !region.empty && (dragCardId || selectedCardId)`
     and arm when `matches || (anyArmed && !expansion)`.
   - In `place()` (`:275-280`): if `regionExpansionOf(cardId)` is undefined, dispatch
     `playRegionExpansion` anyway (the engine stores it at `rexp-<index>` regardless
     of type — `actions.ts:616-633` never checks the category), OR introduce a new
     loose slot. Simplest: reuse `rexp-<index>` so it renders via
     `RegionExpansionBadge`. The badge already renders any card's art (`:313`).
   - Drop the terrain match for region-expansions too (owner wants ANY terrain):
     set `matches = !!def && !expansion` (remove the `def.resource === ...` clause
     at `:274`). One-line change covers "Residence on any region".

2. **Road slot accepts ANY card** — in `RoadComplementCell` (`:366-368`): change
   `armed` to also arm for a generic dragged card: `const armed = !!armedId && !entry`
   (drop the `isRoadComplement && !isForeignCard` filter). `place()` (`:369-374`)
   already calls `playCard` with `rc-<index>`, which the engine accepts for any id.
   Keep returning `null` only when `!entry && !armed` (`:375`).

3. **Seat / settlement accepts a city-or-any drop** — relax
   `canCity` (`:115`) is the narrow one; leave the click-to-upgrade, but allow any
   dragged card to drop ONTO a seat as an *attached* card (reuse `attachCard` →
   `attachedTo`, rendered by `AttachBadge` `:331-346`). Minimal: add an
   `onDragOver/onDrop` to the seat button that, for a generic dragged hand card,
   dispatches `attachCard` with `hostSlot = s.pc.slot`.

4. **CardZoom — add a universal "Place anywhere" affordance** — in the hand branch
   (`CardZoom.tsx:261-270`), keep the smart buttons but always also show
   "Play to principality" (the `play(false)` building-site fallback) so no card is
   ever stranded with no place button. It already exists for the default case;
   extend it to the foreign / region-expansion / road / attach branches as a
   secondary button.

5. **`movePlaced` already lets you relocate any placed card to any empty building
   site** (`Site.moveHere`, `:429-434`; engine `actions.ts:689-702`). Extend the
   same drag-to-region / drag-to-road moves once 1–2 land (route `dragRemove` to
   `movePlaced` with `rexp-N` / `rc-N`).

The lowest-risk first cut for the owner's literal request: **(a) delete the terrain
clause at `PrincipalityBoard.tsx:274`** (any region-expansion on any region), and
**(b) drop the type filters at `:368` and the `def` gate at `:273`** so region tiles
and road slots arm for any dragged card and route to `playRegionExpansion` /
`playCard`. The engine needs zero changes.

---

## 2. "Make cards a little bigger"

### Current sizing (the live `table.css` / `region.css` system)
- Master unit: **`--reg-base: clamp(64px, min(16.5vh, 13.5vw), 210px)`** (`table.css:12`).
  Everything board-side scales off `--reg`. The per-board override
  (`table.css:303`) shrinks `--reg` so a wide spine fits `min(92vw,1240px)`.
- Region tile + building site = `var(--reg)` (`table.css:343`, `:405`); tucked
  building cards `calc(var(--reg) * 0.82)` (`:424`).
- Hand cards: **`.hand-card width: clamp(64px, 6.2vw, 112px)`** (`table.css:939`),
  fan height `clamp(56px, 7vh, 104px)` (`:935`).
- Deck stacks: `.cardstack width: clamp(38px, 3.4vw, 54px)` (`:788`).
- Build-supply pieces: `.build-piece width: clamp(50px, 6.2vh, 78px)` (`:532`);
  era buildings `.build-era clamp(42px, 5vh, 64px)` (`:506`).
- The big CardZoom detail card is sized by `cardzoom.css` (not read here; the
  `.cv` card in `card.css` has no fixed width — it fills its container).

### Proposal — modest, layout-safe bump (~+10–12%)
The board pieces all key off `--reg-base`, which already has a width guard
(`:303`) and the felt scrolls, so a small base bump is safe:
- `table.css:12` `--reg-base: clamp(64px, min(16.5vh, 13.5vw), 210px)`
  → `clamp(72px, min(18vh, 15vw), 230px)`. This enlarges regions, building sites,
  tucked cards, road slots and seats together, proportionally. The `:303` guard
  still prevents horizontal overflow on wide boards (it caps `--reg` to fit width),
  so the bump is felt mainly on 2–4 settlement boards where there is room.
- Hand cards `table.css:939` `clamp(64px, 6.2vw, 112px)` →
  `clamp(72px, 7vw, 124px)` and `.hand-fan` height `:935` `clamp(56px, 7vh, 104px)`
  → `clamp(64px, 8vh, 116px)`.
- Optional: build-supply pieces `:532` and `:506` +~10% if the owner wants the
  toolbox bigger too.
- `card.css` `.cv-name` (15px), `.cv-rules` (12.5px) etc. only affect the zoom/
  detail view; bump only if the owner means the *zoomed* card text — independent of
  board piece size.

Verify after: a 5-settlement board (cols = 11) at 1280px wide still fits via the
`:303` cap; the sticky wall height `--wall-h` (`:8`) is independent and unaffected.

---

## 3. "Rotate them like in productions — only Residency / some Barbarian cards"

### Current rotation model (two separate systems)
- **Region production rotation** (`RegionTile.tsx`): the terrain tile physically
  spins; `region.stored` 0–3 = stored resources, driven by `setStored` /
  `rotateRegion` (`actions.ts:452-476`). This is the "like in productions" feel the
  owner references. Click right half +1 / left half −1 (`RegionTile.tsx:176-190`),
  continuous CSS rotation `transform: rotate(stored*90deg)` (`:120-130`, `:200`).
- **Region-EXPANSION level rotation** (`PrincipalityBoard.tsx:296-328`,
  `RegionExpansionBadge`): a placed Residence/Border-Fortress card carries
  `PlacedCard.level` 0–3. Rotate UI = the `pb-rexp-rot` cluster with `−` / `L{level}`
  / `＋` buttons (`:315-324`), each dispatching
  `rotatePlaced` with `delta: ±1` (`:318`, `:322`). Engine `rotatePlaced`
  (`actions.ts:635-654`) clamps 0–3, spends `rotateCost` on step-up, and
  `levelValuesOf` (`cards.ts:60-61`) makes the card's stats reflect its level
  (`computeStats`/`computeVP` use it — `actions.ts:102`, `:133`).

### Which cards EXPOSE the rotate control today
The rotate cluster only renders when `def?.rotates` is true (`PrincipalityBoard.tsx:315`).
`rotates: true` is set in `REGION_EXPANSIONS` (`cards.ts:36-43`) for exactly:
- `intrigue-abbey-brewery` (grain)
- `merchants-cloth-merchants-residence` (wool) ✅ Residence
- `merchants-paper-merchants-residence` (lumber) ✅ Residence
- `barbarians-border-fortress` (brick) ✅ Barbarian rotating card

Non-rotating expansions: `intrigue-reiner-the-miller`, `barbarians-triumph-card`.
(Triumph is tracked instead as a plate MARKER level — `markers.triumph`,
`actions.ts:954-967` — contributing VP via `computeVP` `:104`.)

### So the mechanism the owner wants ALREADY EXISTS and is correctly scoped.
The two Residences and the Border Fortress already rotate through levels with a
spent cost and live stat updates. The likely gaps / asks:

1. **Discoverability** — the `pb-rexp-rot` control is a tiny 16px cluster in the
   tile corner (`region.css:256-259`); easy to miss. Proposal: enlarge it with the
   #2 size bump, or add a tooltip/label. No logic change.

2. **Add more rotating cards** if the owner names specific other Barbarian /
   Residence-like cards — it is a pure DATA change: add an entry to
   `REGION_EXPANSIONS` (`cards.ts:36-43`) with `rotates: true` + `rotateCost`, and
   (for live stats) a row in `PLACED_LEVEL_VALUES` (`cards.ts:55-59`). No component
   change — `RegionExpansionBadge` renders the control off `def.rotates` for any id.
   - Note `PLACED_LEVEL_VALUES` is missing `intrigue-abbey-brewery` (it rotates but
     has no per-level values), so its level changes spend cost + show `L{n}` but add
     no stats. If Abbey Brewery should yield per level, add its row.

3. **If the owner wants rotation on cards NOT in a region tile** (e.g. a barbarian
   unit in a building site) — those render via `Site` (`:454-468`) /
   `pb-site-card`, which has no rotate control. Adding one would mean: detect
   `regionExpansionOf(id)?.rotates` (or a new `rotates` flag for placed units) in
   `Site` and render a small ± cluster that also dispatches `rotatePlaced`. The
   engine `rotatePlaced` already works on ANY placed index regardless of slot
   (`actions.ts:635-654`), so only the UI control is missing. Minimal: factor the
   `pb-rexp-rot` JSX into a shared `<RotateControl entry .../>` and drop it into
   `Site` for ids flagged rotating.

The rotate handler to reuse everywhere: `dispatch({ type: 'rotatePlaced', player,
placedIndex, delta: ±1, pay: payCosts })`.

---

## 4. "Too many themes/encounters → too many cards; layout must be DYNAMIC"

### Root cause — the deck wall and supply scale linearly with enabled sets, in a FIXED-HEIGHT bar
- **Deck stacks**: `newGame` (`newGame.ts:90-101`) builds **4 base stacks + 2 stacks
  per enabled non-base set**. With all 6 expansion themes on: 4 + 6×2 = **16 draw
  stacks**, plus the region stack and the discard pile → **~18 stacks** rendered in
  `.deckwall` (`CentralWall.tsx:84-144`).
- **`.deckwall`** (`table.css:752-761`) is `display:flex; overflow-x:auto;
  flex:1 1 0` inside **`.wall`** which is a fixed-height bar
  (`--wall-h: clamp(82px, 10vh, 136px)`, `table.css:8`; `.wall` height
  `calc(var(--wall-h) - clamp(8px,1.4vh,20px))`, `:693`). Each `.cardstack` is
  `clamp(38px, 3.4vw, 54px)` wide (`:788`) with `5/7` aspect → ~54–75px tall.
- The wall ALSO holds turn controls (left), roll/outcome (right) and the advantage
  tokens (`CentralWall.tsx:69-185`), which compete for the same horizontal space
  (`.wall` is `justify-content: space-between`, `:696`). So with 18 stacks the
  deckwall's `flex:1 1 0` region cannot show them all; `overflow-x:auto` lets it
  scroll, **but the scrollbar is HIDDEN** (`table.css:31-32` removes the deckwall
  bar). Result: stacks beyond the visible width are scrollable-but-invisible with no
  affordance — the owner's "we won't see all the cards."
- **Build supply**: `.build-row` (`table.css:504`) is `flex-wrap: wrap` so era
  buildings wrap to new lines — that part is already dynamic, but the era-building
  list grows one face-up expansion per enabled era (`BuildSupply.tsx:39-41`); only
  3 sets (gold/turmoil/progress) currently have a `Face-up Expansion`-tagged card,
  so this is a smaller pressure than the deck wall.

### The clipping is in the WALL (fixed height + hidden-scroll deckwall), not the supply.

### Proposal — make the deck wall dynamic & fully reachable

Pick one (or combine):

**Option A (lowest-risk): show the scroll affordance + let stacks shrink.**
- Stop hiding the deckwall scrollbar — remove `.deckwall` from the hidden-scrollbar
  rule (`table.css:31-32`) and give it the slim styled bar that modals use
  (`:34-41`). Now the 18 stacks are reachable by an obvious horizontal scroll.
- Let stacks shrink when crowded: change `.cardstack` width
  (`:788`) from `clamp(38px,3.4vw,54px)` to allow a smaller floor, e.g.
  `clamp(28px, 3.4vw, 54px)`, and add `flex-shrink` context so more fit before
  scrolling kicks in.

**Option B (best UX): grouped, wrap-capable deck shelf with a taller wall when needed.**
- Make `.wall` height auto-grow with content instead of a hard
  `--wall-h` cap: allow the deckwall to wrap (`flex-wrap: wrap`) and let the wall's
  sticky height be `min-content` up to a max (e.g. `max-height: 22vh; overflow-y:auto`).
  Because the wall is `position:sticky` (`.wall-rail`, `:680-689`), a taller wall
  still pins; the two principality panes already size off `--pane-h`
  (`= 100dvh - --wall-h - 6px`, `:21`) so `--wall-h` would need to track the actual
  wall height (set a slightly larger default or measure via ResizeObserver).
- Group the 16 draw stacks by set (base + one labelled mini-group per era) so a
  many-theme game reads as ~7 groups, not 18 loose stacks. `CentralWall.tsx:84-108`
  already derives the set per stack (`st[0]?.split('-')[0]`); group on that.

**Option C (scalable for ALL future themes): a collapsible / scrollable deck drawer.**
- Keep the wall compact; move the per-set draw stacks into a horizontally
  scrollable strip with a styled scrollbar + left/right chevrons, OR a "Decks ▾"
  popover (like the existing `hud-pop` setup popover, `table.css:254-268`) that
  opens the full set of stacks on demand. This guarantees visibility regardless of
  how many themes are enabled.

**Recommended minimal first cut:** Option A — un-hide the deckwall scrollbar
(`table.css:31-32`) and lower the `.cardstack` min width (`:788`). One/two-line CSS,
makes every stack reachable immediately. Then layer Option B (wrap + set-grouping)
if the owner wants all visible without scrolling.

Files to touch for #4: `src/ui/board/table.css` (`--wall-h` :8, deckwall rules
:31-32 / :752-761, `.cardstack` :788, `.wall` :690-711), and optionally
`src/ui/board/CentralWall.tsx:84-144` (group stacks by set). `TableBoard.tsx` needs
no change; `board.css` is legacy/irrelevant here.

---

## Summary of file:line touch-points

| Ask | Primary edits |
|---|---|
| 1. Place anything anywhere | `PrincipalityBoard.tsx` :273-274 (region match), :366-368 (road arm), :115/:138 (seat), `CardZoom.tsx` :214-270 (universal place button). Engine: no change. |
| 2. Bigger cards | `table.css` :12 (`--reg-base`), :935/:939 (hand). Optional :506/:532 (supply). |
| 3. Rotate Residency/Barbarian | Already works: `cards.ts` :36-43 (`rotates`), `PrincipalityBoard.tsx` :296-328 (control), `actions.ts` :635-654 (`rotatePlaced`). To add cards: data only (`cards.ts` :36-43 + :55-59). To rotate building-site cards: add `RotateControl` to `Site` (`PrincipalityBoard.tsx` :402-477). |
| 4. Dynamic deck wall | `table.css` :8 (`--wall-h`), :31-32 (hidden scrollbar), :752-761 (`.deckwall`), :788 (`.cardstack`), :690-711 (`.wall`); optional `CentralWall.tsx` :84-144 (group by set). |
