# Recon: Build / Place / Move — current state vs gap

**Scope:** "The Rivals for Catan" 2-player client. Deterministic, trust-based engine
in `src/engine/actions.ts` (does NOT enforce legality — every action is a free edit),
Zustand stores in `src/store`, board UI in `src/ui/board`. This doc maps five
owner-requested capabilities to the engine actions that already exist and the UI
affordances that do (or do not) wire them up, with concrete recommendations. It also
documents the build flow and where `pay`/`spendCost` and animation fire (for a separate
"visual-only build, no pay animation in manual mode" task).

> Read-only recon. No code was changed. All file:line refs are as of this read.

---

## Status table

| # | Capability | Engine action(s) | Engine status | UI status | Overall |
|---|---|---|---|---|---|
| 1 | Remove a placed **settlement / city** | `removePlaced` (actions.ts:607) | WORKS (any placedIndex) | No trigger reaches a spine settlement/city | **MISSING (UI)** |
| 2 | **Move** a landscape/region (relocate) | `swapRegions` (469), `movePlaced` (624), `placeLandscape` (595) | swap WORKS; free relocate has no region action | Region drag only does `swapRegions` (RegionTile:101) | **PARTIAL** |
| 3 | **Look through** the landscape (region) stack | `drawRegion` (485), `expandSpine` (521); no browse/take/put for region stack | Engine can only POP top (no peek/take-any/reorder) | No browser at all for region stack | **MISSING** |
| 4 | Place a building on the **opponent's** board | `playForeign` (667) | WORKS (adds to foe with `owner` set) | Hand-zoom button only; no opponent drop slots; no remove-by-owner | **PARTIAL** |
| 5 | Place a building **ON** an existing city/building (stacking/attach) | `playCard` slot (650) / building sites | One card per site; cities expose 2+2 sites, not "onto" | Sites are 1-card; no stack/attach affordance | **PARTIAL / MISSING** |

Legend: WORKS = end-to-end usable; PARTIAL = engine or UI present but incomplete/indirect; MISSING = no working path.

---

## 1. Remove a placed SETTLEMENT or CITY — **MISSING (UI only; engine works)**

**Owner symptom:** "removing settlements/cities isn't possible."

### Engine — WORKS
`removePlaced` (`actions.ts:607-622`) removes **any** placed entry by `placedIndex`,
regardless of category. It routes the card home via `discardHome` (287-293): structural
pieces (`settlement`, `city`, `road`, `region`) go back to **supply** (no discard
entry); everything else discards. So removing a settlement/city is already fully
supported by the reducer and is undoable/broadcast-safe.

`ResolutionPanel` `CardTool` also exposes a generic **"remove from play"** button for
any placed card opened with `from: 'play'` + `placedIndex` (`ResolutionPanel.tsx:356-365`),
and `CardZoom`'s play view offers Discard / Return-to-hand / Activate→resolve
(`CardZoom.tsx:167-173`). All of these already work for any placed card **if you can open
the zoom/resolve panel for it.**

### UI — MISSING the trigger for spine settlements/cities
The only `removePlaced` triggers and the only ways to reach the `from: 'play'` zoom are:

- **Roads:** draggable, drag back to the build bar (`PrincipalityBoard.tsx:110-113` start
  drag → `BuildSupply.tsx:48-58` drop → `removePlaced`). WORKS.
- **Building-site expansion cards:** draggable + clickable to open `from:'play'` zoom
  (`PrincipalityBoard.tsx:247-260`, `openZoom({from:'play'})` at :256). WORKS.
- **Foreign cards** (opponent-built): explicit ✕ button → `removePlaced`
  (`PrincipalityBoard.tsx:182-188`) and an openZoom at :179. WORKS.

**Settlements and cities (the spine `seats`)** render as a `<button className="pb-seat">`
whose ONLY interaction is `onClick → upgradeCity` (`PrincipalityBoard.tsx:88-104`). They
are **not** `draggable`, do **not** call `openZoom`/`openResolve`, and have **no remove
path**. The seat button is even `disabled` once it's a city (`:95`), so a city has zero
interaction at all. That is exactly the owner's symptom.

### Recommendation
Wire a remove affordance onto the spine seat in `PrincipalityBoard.tsx` (seats block,
~`:88-104`). Lowest-risk options:

- **Make seats open the play-zoom** (mirrors building-site cards): add
  `onClick={() => openZoom({ cardId: s.card!.id, from: 'play', player, placedIndex: s.i })}`.
  Then the existing `CardZoom` play view (Discard / Return to hand / Activate→resolve→
  `removePlaced`) handles removal with no engine change. Keep the upgrade-to-city as a
  separate control (e.g. drag a City onto it, which already works via `canCity`/drop at
  `:98-99`, or a small "Upgrade" affordance) so click no longer has to mean upgrade.
- **Or make seats draggable-to-remove** like roads: add `draggable={interactive}`,
  `onDragStart={() => setDragRemove({ placedIndex: s.i, player })}`, `onDragEnd`. The
  build bar's drop handler (`BuildSupply.tsx:48`) already turns that into `removePlaced`.
  Note `s.i` is the real `placed[]` index already carried on each `seats` entry
  (`all.map((pc,i)=>…)` at `:34`), so no index remapping is needed.

Engine: **no change required.** Add a quick test that `removePlaced` on a city returns
`base-city` to supply (covered by `discardHome`).

---

## 2. MOVE a landscape / region (relocate a region card) — **PARTIAL**

**Owner want:** "moving landscapes possible."

### Engine
- `swapRegions` (`actions.ts:469-483`) — exchanges two region positions for one player.
  WORKS, with bounds guards.
- `movePlaced` (`actions.ts:624-637`) — relocates a **placed card** (building/road) to a
  different `slot` string, refusing occupied slots. This is for `placed[]` pieces, **not**
  for `regions[]` slots. Regions are a separate array (`p.regions`), so `movePlaced`
  cannot relocate a region.
- `placeLandscape` (`actions.ts:595-605`) — fills an **empty** region slot by popping the
  region stack. It does not move an existing landscape.

So at the engine level there is **no "relocate this filled region to another slot"**
action other than swapping it with whatever occupies the target. There is also no
"move a landscape into an empty slot" (you can only `placeLandscape` from the stack).

### UI
`RegionTile` has a drag "grip" (`RegionTile.tsx:107-118`) that sets `dragRegion`, and any
other region of yours becomes a swap drop target (`:93-106`) → dispatches **`swapRegions`**
only (`:101`). Empty slots accept a **Landscape from the build bar** (`:150-172` →
`placeLandscape`), not a dragged existing region. So you can **reorder by swapping**, but
you cannot drag a filled region onto an **empty** slot to relocate it (the empty slot only
listens for `dragBuild === 'landscape'`, not `dragRegion`).

### Recommendation
Two layers:

1. **Engine** — add a `moveRegion` action (`{player, from, to}`) that moves
   `regions[from]` into `regions[to]` **when `to` is empty** (and optionally leaves an
   empty slot behind), distinct from `swapRegions` which assumes both occupied. Mirror the
   `swapRegions` bounds guards (`:471`). Small, pure, testable.
2. **UI** — in `RegionTile`'s empty-slot branch (`:150-172`), also accept a `dragRegion`
   drop (currently it only arms on `dragBuild==='landscape'`): if `dragRegion` is set and
   `dragRegion.player === player`, dispatch the new `moveRegion`. If the owner is happy
   with swap-only semantics, this is purely a UI gap — extend the existing `swapArmed`
   drop to also fire when the target is empty by routing to `swapRegions` (a swap with an
   empty slot is effectively a move). That avoids any engine change.

---

## 3. LOOK THROUGH the landscapes (region) stack — **MISSING**

**Owner want:** browse the landscapes like the card-stack browser does.

### Engine
The region stack (`s.regionStack`) supports only:
- `drawRegion` (`actions.ts:485-494`) — pop the top into a new region slot.
- `placeLandscape` (`595-605`) — pop the top into a specific empty slot.
- `expandSpine` (`521-540`) — pop the top two.

There is **no** peek / take-any-position / put-back / shuffle for the region stack. Those
exist only for the **draw card stacks**: `shuffleStack` (782), `takeFromStack` (791),
`putToStack` (804), plus `drawFromDiscard` (770).

### UI
`StackBrowser.tsx` is a full peek/search/take/put/shuffle modal — but it is bound to
`state.drawStacks[idx]` (`:32`), opened via `uiStore.openStackBrowse(i)` (`uiStore.ts:138`)
from the deck wall's 🔍 button (`CentralWall.tsx:97-104`). The discard pile has its own
browser (`DiscardBrowser`, opened via `setDiscardOpen`, `CentralWall.tsx:59-64`). **The
region stack has neither a browse action nor any UI entry point** — `grep regionStack`
across `src/ui` returns nothing. There is no on-table representation of the region stack
to click at all.

### Recommendation
1. **Engine** — add region-stack equivalents of the card-stack browse actions:
   `shuffleRegionStack`, `takeRegion {player, position}` (pop any index into a new/empty
   slot), and optionally `putRegion`. Model them on `takeFromStack`/`shuffleStack`
   (`actions.ts:782-816`). Trust-based, so they can be permissive.
2. **UI** — add a region-stack pile to `CentralWall` (next to the draw decks) with a 🔍
   button, and a `RegionStackBrowser` modal cloned from `StackBrowser.tsx`, backed by a
   new `uiStore` flag (e.g. `regionBrowse: boolean`). The simplest read-only version (just
   "look through, in order, take any") covers the owner's literal ask; reuse the Sb styles
   in `stackbrowser.css`.

---

## 4. Place a building on the OPPONENT's board — **PARTIAL (works for foreign cards; not general)**

### Engine — WORKS for designated foreign cards
`playForeign` (`actions.ts:667-682`) removes the card + cost from the actor, then pushes it
into the **opponent's** `placed[]` with `owner: a.player` and slot `foreign-{n}`
(`:679`). VP attribution: foreign cards score for nobody (rendered separately, see below).
`isForeignCard` gating decides which cards offer this (Red Light Tavern, Brigand Camp,
Trading Station per the type comment at `actions.ts:51`).

### UI
- Trigger: only from the **hand** zoom — `CardZoom.tsx:137-146` shows "Build on opponent's
  board" / "Build & pay cost" → `buildForeign` → `playForeign` (`:77-82`). WORKS.
- Render: foreign cards in your principality render in a separate `pb-foreign` strip with a
  ✕ remove button (`PrincipalityBoard.tsx:171-192`), **not** in the opponent's spine/sites.
- **Blocked / missing:** there is **no drop target on the opponent's actual board** — you
  cannot drag a card onto the opponent's city, road, or a specific site. `playForeign`
  always assigns a generic `foreign-{n}` slot (`:679`); the optional `a.slot` is never
  supplied by the UI. So "place a building *on* the opponent's city/road" specifically is
  not possible — it only lands in the generic foreign strip. Also, the opponent board is
  rendered with `interactive` only for the local seat, so the foe's `Site`/seat drop
  handlers are inert for cross-board placement.

### Recommendation
- If the owner wants targeted foreign placement (onto the opponent's specific city/road),
  pass `slot` through `playForeign` from a drop handler on the opponent's
  `PrincipalityBoard`. That needs the opponent board to expose drop targets when a foreign
  card is being dragged (a new `dragForeign` UI flag), and `playForeign` already accepts
  `a.slot`, so the engine is ready.
- If "generic foreign strip" is acceptable, only the **drag** ergonomics are missing
  (currently click-through-zoom only). Add a drag path mirroring normal play.

---

## 5. Place a building ON an existing city/building (stacking / attach) — **PARTIAL / MISSING**

**Owner want:** expansions placed *onto* a city (stacking/attaching).

### Engine
`playCard` (`actions.ts:650-665`) pushes a card into `placed[]` with whatever `slot`
string the UI supplies; it never checks occupancy. So the engine *can* place two cards
with the same slot — but the board renderer assumes **one card per site**.

### UI — sites are strictly 1-card
`PrincipalityBoard` models official capacity: a settlement exposes 1 site above + 1 below;
a **city exposes 2 above + 2 below** (`sideCapacity`, `:64`; `slotName` `:65`; site grid
`:153-169`). Each `Site` holds exactly one card (`cardForSlot` `:66`, `occupied` guard
`:211`, `place()` refuses if `occupied` `:213-219`). So a city already has **more sites**
(4 vs 2) — but there is **no "stack onto / attach to an existing building or the city
itself"**; you fill the city's *extra empty sites*, you don't place *onto* an occupied one.

`firstOpenSlot` (`CardZoom.tsx:14`) finds the first free site, so the hand "Play to
principality" path also targets empty sites only.

### Recommendation
Clarify the owner's intent (it has two readings):
- **(a) "Fill a city's expansion sites"** — already supported; a city has 4 sites. If the
  owner can't see/use the extra two, that's a layout/visibility issue in the city's
  site groups (`:153-169`), not a missing capability.
- **(b) "Literally stack a card on top of another / attach to a piece"** — not supported.
  Would need a new slot convention (e.g. `attach-{placedIndex}`) and a render layer that
  draws an attached card over its host, plus a drop target on occupied sites/seats. The
  engine's permissive `playCard` makes the data side trivial; the work is UI (render +
  drop) and a clear rule for what "attached" means for VP/removal.

Recommend a quick brainstorming clarification before building — "The Rivals for Catan"
has no literal stacking, so this may really be (a).

---

## Build / upgrade / play flow + where `pay`/animation fire (for the visual-only-build task)

### The build/upgrade/play actions and their `pay` flag
Every cost-bearing action takes `pay?: boolean`, **default true** (`pay = a.pay !== false`),
and spends via `spendCost(p, cost)` → `distributeResource(p, res, -count)`:

| Action | File:line | Cost source | `spendCost` call |
|---|---|---|---|
| `buildPiece` road | actions.ts:542-558 | `getCard('base-road').cost` | `:552` |
| `buildPiece` settlement | actions.ts:560-593 | `getCard('base-settlement').cost` | `:568` |
| `upgradeCity` | actions.ts:496-519 | `getCard('base-city').cost` | `:502` |
| `playCard` | actions.ts:650-665 | `card.cost` | `:659` |
| `playForeign` | actions.ts:667-682 | `card.cost` | `:676` |
| `expandSpine` | actions.ts:521-540 | (no explicit spend) | — |

`spendCost` is defined at `actions.ts:251-253`. With `pay === false` the piece is placed
and **no resource is touched** — this is the existing "manual sandbox" escape hatch.

### Where `pay` is decided in the UI
The UI passes `pay: payCosts` from `uiStore.payCosts` (default `true`,
`uiStore.ts:133-134`; toggle `setPayCosts`). Callsites:
- Road drop: `PrincipalityBoard.tsx:128`
- Settlement extend-left / extend-right drops: `:139`, `:147`
- Upgrade-to-city (click + drop): `:97`, `:99`
- Site `place()` (play a card into a site): `:217`
- Hand zoom `play(pay)` / `buildForeign(pay)`: `CardZoom.tsx:64-82` (explicit
  Play vs Play-&-pay buttons)

So a global "manual mode = visual only, no pay" already has a home: **set `payCosts`
false** (or force `pay:false` at these callsites). No engine change needed to suppress the
spend itself.

### Where the build "animation" actually fires
There is **no dedicated coin/pay flight animation on build.** Two distinct things happen:

1. **`playSfx('build')`** — the only build-time effect, fired in the UI drop/click
   handlers, NOT in the engine: `PrincipalityBoard.tsx:99` (upgrade), `:128` (road),
   `:139`/`:147` (settlement), `:186` (foreign ✕), and `:225` (move into site). Card plays
   use a thematic per-card cue instead (`playSfx(cardSfx(cardId), cardId)`,
   `PrincipalityBoard.tsx:218`, `CardZoom.tsx:71`).
2. **The "stored-delta" region animation** — this is the closest thing to a "pay
   animation," and it is an **emergent side effect of the state change, not an explicit
   build animation.** When `spendCost` lowers a region's `stored`, `RegionTile` reacts:
   - rotation: `rot` is derived from `region.stored` and re-animates on change
     (`RegionTile.tsx:123-130`);
   - a flash + floating `−N` / `+N`: `RegionTile.tsx:135-145` (the `float`/`flash` effect),
     rendered at `:224-233`.
   So **if a build pays a cost, the payer's regions visibly rotate down and show a `−N`
   float.** With `pay:false` no `stored` changes, so **none of this fires** — the build is
   already visual-only (piece appears, `build` sfx) with no pay animation.

3. **`FlightLayer` / `addFlight`** — card-in-flight animation (deck → hand). It is wired
   **only** for drawing a card (`CentralWall.tsx:32-51` `drawWithFlight`). It does **not**
   fire on any build/upgrade/play. So there is no card-flight to suppress for builds.

4. **`playSfx('coin')`** — the metallic "cost paid" cue exists (`sfx.ts:230`, definition
   :85) but is fired **only** in manual resource +/- (`ResolutionPanel.tsx:157/161`), the
   stack-search payment (`StackBrowser.tsx:52`), and a volume-slider preview
   (`TableHud.tsx:124`). It is **not** fired on build. So there is no coin sound on build
   to remove either.

### Implication for the "visual-only build, no pay animation in manual mode" task
- The pay **animation** (region rotate + `−N` float) is purely a consequence of `stored`
  changing, which only happens when `pay` is true. To make manual mode visual-only, the
  right lever is the existing **`payCosts` toggle / `pay:false`** at the build callsites
  above — no new "suppress animation" code is needed, because with no spend there is no
  delta to animate.
- The only always-on build feedback is **`playSfx('build')`** at the
  `PrincipalityBoard.tsx` callsites. If the task wants builds to be silent too in manual
  mode, gate those `playSfx('build')` calls on `payCosts`/a manual-mode flag.
- There is **no** coin flight, no `addFlight` on build, and no engine-side animation, so
  the surface area is small and entirely in `PrincipalityBoard.tsx` + the `payCosts`
  toggle in `uiStore.ts`.

---

## Quick file reference
- Engine actions: `src/engine/actions.ts` (action union `:33-51`; reducer `case`s as cited)
- One player's board: `src/ui/board/PrincipalityBoard.tsx`
- Region tile (rotate/swap/place/fill): `src/ui/board/RegionTile.tsx`
- Card detail + play/foreign/discard/resolve: `src/ui/board/CardZoom.tsx`
- Universal resolve panel (generic remove/return): `src/ui/board/ResolutionPanel.tsx`
- Build supply bar (drag-to-place, drop-to-remove): `src/ui/board/BuildSupply.tsx`
- Draw-stack browser (the template for a region browser): `src/ui/board/StackBrowser.tsx`
- Central wall (decks, 🔍 entry points, draw flight): `src/ui/board/CentralWall.tsx`
- Card-flight animation: `src/ui/board/FlightLayer.tsx`
- Ephemeral UI state (`payCosts`, `dragRegion`, flights, browse flags): `src/store/uiStore.ts`
