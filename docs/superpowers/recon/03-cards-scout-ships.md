# Recon 03 — Cards, Scout, Ships, Stacks & Auto-Deductions

Read-only map of card data + engine effects for: the Scout card (no functionality),
Large Ships (missing "requires a city"), manual-payment audit of auto resource
deductions, and the region/landscape stack model.

> Card data lives in **`src/data/cards.json`** (4843 lines), loaded read-only by
> `src/data/cards.ts`. There is no `cards.ts` array — `cards.ts` is the loader/helpers.

---

## Status table

| # | Task | Status | Root cause | Where the fix goes |
|---|------|--------|-----------|--------------------|
| 1 | **Scout** searches the landscapes stack | ❌ NOT WIRED | `drawRegion` action exists but is never dispatched from any UI; no region-stack browser exists; `takeFromStack` only indexes `drawStacks`, NOT `regionStack`. Scout's effect step is pure text. | New region-stack browser UI + a `takeFromRegionStack` action (or reuse pattern of StackBrowser); wire from Scout's effect step. |
| 2 | **Large Trade Ship** "requires a city" | ❌ MISSING REQUIREMENT | `base-large-trade-ship` and `gold-large-trade-ship` have no `values.requires` and no "Requires:" in `rules_text`. | `src/data/cards.json` — add `"requires": "City"` to `values` of both ids. (No "Large Settler Ship" exists in this corpus.) |
| 3 | Audit auto resource deductions | ✅ CONFIRMED CLEAN | Only two engine-driven deduction paths: `spendCost` (gated by `pay` flag) and `resolveBrigand`. All `count: -N` in effects.ts are manual `quick` buttons. | n/a — documented below. |
| 4 | Region / landscape stack model | ✅ MAPPED | `regionStack: string[]` (region card ids), top = last element. Consumed only by `drawRegion`, `expandSpine`, `placeLandscape`. No browse UI. | See §4. |

---

## 1. SCOUT card — currently has NO functional search

### Card definition
`src/data/cards.json:778-792`
```
id: "base-scout"  set: base  category: action  tag: "Action – Neutral"
name: "Scout"  cost: []  copies: 2
rules_text: "Play this card when building a settlement. Take 2 cards of your
             choice from the region card stack. Reshuffle the region card stack."
```

### Current effect (text only, no action)
`src/engine/effects.ts:125`
```
'base-scout': [{ text: 'Take 2 cards from the region card stack, then reshuffle it.
                        Use Draw Region in play, or the toolkit.' }],
```
This step has **no `quick` QuickAction** — it renders as guidance text only in the
ResolutionPanel. It tells the player to "Use Draw Region in play, or the toolkit", but:

- **`drawRegion` (action `actions.ts:485-494`) is NEVER dispatched from any UI.**
  `grep -rn "drawRegion" src/ui src/store` → 0 hits. It exists in the engine and in the
  AI sim only. So "Draw Region in play" is a dead instruction.
- `drawRegion` also only **pops the TOP** of `regionStack` into a new region slot in the
  principality — it does **not** let you look through / choose 2 cards / reshuffle. That
  is the wrong primitive for Scout (Scout = search + take into consideration + reshuffle,
  it does not add a region slot).

### What the rules want
Rivals/Catan-Duel Scout = look through the **region card stack**, take 2 of your choice,
then reshuffle the region stack. (The transcribed text matches.)

### How stack-search works TODAY for the DRAW stacks (the reusable pattern)
- `takeFromStack` (`actions.ts:791-802`): pulls a card from **`s.drawStacks[stackIndex]`**
  into a player's hand, by `cardId` / `position` / top. **It does not touch `regionStack`.**
- `shuffleStack` (`actions.ts:782-789`): shuffles a **draw** stack.
- `StackBrowser.tsx` (`src/ui/board/StackBrowser.tsx`): the "pick up a draw pile, look
  through it, pay 2 to search-take-then-reshuffle" modal. It reads
  `useUI.stackBrowse` (a `number | null` draw-stack index, `uiStore.ts:84-86`) and
  dispatches `takeFromStack` + `shuffleStack` against `drawStacks`. **It is hard-bound to
  draw stacks**, both in the store (`stackBrowse: number`) and in the action it calls.

So there is **no region-stack browser** and `takeFromStack` **cannot** read `regionStack`.

### Recommendation to wire Scout
The cleanest path mirrors the existing draw-stack pattern:

1. **New engine action** in `src/engine/actions.ts` (next to `takeFromStack` ~L791 and
   `drawRegion` ~L485). Region cards are NOT hand cards (they're placed slots), so taking
   "into hand" is wrong. Two options:
   - **(a) Place-from-search**: `takeRegionFromStack` that pops a *chosen* region id from
     `regionStack` and either creates a region slot (like `drawRegion`/`placeLandscape`)
     or fills a specific empty slot (`placeLandscape` already does `regions[idx]` fill at
     `actions.ts:595-605`). Add a `shuffleRegionStack` (mirror `shuffleStack:782`).
   - **(b) Minimal**: a `shuffleRegionStack` action + let the browser call existing
     `placeLandscape`/`drawRegion` for the chosen ids. Scout's "take 2 then reshuffle"
     ≈ choose 2 region ids to keep on top (or place) then shuffle the rest.
   Recommend (a): an explicit `takeRegionFromStack { player, regionId|position, slot? }`
   that removes the id from `regionStack` and fills an empty region slot, plus a
   `shuffleRegionStack` — symmetric with the draw-stack verbs, fully testable.

2. **New region browser UI** — generalize `StackBrowser`, OR add a sibling
   `RegionStackBrowser.tsx`. Add a UI-store field (e.g. `regionBrowse: boolean` +
   open/close, alongside `stackBrowse` at `uiStore.ts:84-86,137-139`). Render the
   `state.regionStack` ids with `cardArt(id)` (the loader already resolves region art via
   the `region-<resource>-<n>` id pattern, `cards.ts` `cardArt`), click to take, then a
   "reshuffle & close" that dispatches `shuffleRegionStack` (mirrors
   `StackBrowser.shuffleAndClose` at `StackBrowser.tsx:67-71`).

3. **Wire from Scout's effect step** — give `effects.ts:125` a `quick` QuickAction. The
   QuickAction union (`effects.ts:16-26`) has no "open region browser" kind. Add a focus
   kind (e.g. `{ kind: 'regions' }`) added to `FOCUS_KINDS` (`effects.ts:36`) and handled
   in `ResolutionPanel` where focus kinds are mapped (`ResolutionPanel.tsx:441`,
   `const key = qa.kind === 'setDie' ? 'dice' : qa.kind === 'grant' ? 'cards' : …`). The
   focus handler would call the new `openRegionBrowse()` instead of opening a toolkit
   widget.

Lowest-effort viable version: just add `shuffleRegionStack` + reuse a generalized browser
bound to `regionStack`, and wire Scout's step `quick` to open it.

---

## 2. LARGE SHIPS — missing the "requires a city" text

There are **two** "LARGE TRADE SHIP" cards. **No "Large Settler Ship" exists** in this
corpus (`grep '"name": ".*(settler|explorer).*ship'` → 0 hits).

### `base-large-trade-ship` — `src/data/cards.json:401-426`
```
category: "hero-or-unit"  tag: "Unit - Trade Ship"  name: "LARGE TRADE SHIP"
cost: [lumber 1, wool 1]
values: { other: "2:1 (left arrow) and 2:1 (right arrow)" }   ← NO `requires`
rules_text: "You may trade 2 resources of the left or right neighboring region for any 1
             other resource of your choice."                  ← NO "Requires:" clause
```

### `gold-large-trade-ship` — `src/data/cards.json:1027-1052`
```
category: "hero-or-unit"  tag: "Unit – Trade Ship"  name: "LARGE TRADE SHIP"
cost: [lumber 1, wool 1]
values: { commerce: 1, other: "2:1 (left and right banners)" }  ← NO `requires`
rules_text: "You may trade 2 resources of the left or right neighboring region for any 1
             other resource of your choice."                    ← NO "Requires:" clause
```

`requirementOf()` (`cards.ts`) reads `values.requires` first, else a "Requires:" regex on
`rules_text`. Both ships currently return **null** → the UI shows no prerequisite. By
comparison, ~25 other cards DO carry `"requires": "City"` (e.g. `gold-merchant-guild`
`cards.json:1076`; full list at `grep '"requires"'`, lines 1076,1138,1169,1658,1692,…).

The **resource (single-resource) trade ships** (`base-gold-ship`, `base-ore-ship`,
`base-grain-ship`, `base-lumber-ship`, `base-brick-ship`, `base-wool-ship`,
`cards.json:427-582`) are the small 2:1 traders — they correctly require nothing.

### Recommended exact data edits (DATA ONLY — owner to confirm the rules wording)
In `src/data/cards.json`, add to the `values` object of each large ship:

- `base-large-trade-ship` (`values` at `cards.json:417-419`): add `"requires": "City"`.
- `gold-large-trade-ship` (`values` at `cards.json:1042-1045`): add `"requires": "City"`.

That single field is enough — `requirementOf()` prefers `values.requires`, so the
prerequisite then surfaces everywhere without editing `rules_text`. (Optionally also
append `" Requires: City."` to each `rules_text` for the read-out, but the structured
field is the source of truth per the `cards.ts` doc-comment.)

> ⚠️ Verify the rule against the printed card before editing: in *Rivals/Catan Duel*, the
> Large Trade Ship's "requires a City" gate should be confirmed from the physical card —
> the `cards.ts` comment is explicit that requirements are never invented, only
> transcribed. This is a data-correctness change, so confirm the wording with the owner.

---

## 3. Audit — automatic resource DEDUCTIONS (manual-payments task)

**Confirmed: only two engine-driven deduction paths, plus manual click-buttons.**

### The single mutation primitive
`distributeResource(p, resource, count)` — `src/engine/actions.ts:196-215`. Negative
count subtracts across matching regions (`r.stored = r.stored - take`, L213). Every
resource change goes through it. Direct `r.stored` writes in the file: L204/L213 (inside
`distributeResource`), L449 (`applyProduction`, manual rotate), L462 (`setStored`, manual
toolkit), L831 (`resolveBrigand`).

### Auto-deduction sites (engine-applied, not a manual click)
1. **`spendCost` — `actions.ts:251-253`** — loops cost, calls `distributeResource(p, r, -count)`.
   Called only when `pay !== false`:
   - `upgradeCity` — `actions.ts:497,502` (`const pay = a.pay !== false`)
   - `buildPiece` (road) — `actions.ts:544,552`
   - `buildPiece` (settlement) — `actions.ts:568`
   - `playCard` — `actions.ts:651,659`
   - `playForeign` — `actions.ts:668,676`
   Every caller is **gated by the `pay` flag** (defaults true; pass `pay:false` to skip).
2. **`resolveBrigand` — `actions.ts:818-842`** — for any player over 7 total resources,
   zeroes all gold+wool regions (`r.stored = 0`, **L831**). This is the only deduction the
   engine applies *without* a `pay` flag — it's the explicit Brigand event resolution.

### NOT auto-deductions (manual click-to-apply)
All `count: -N` entries in `effects.ts` are inside `quick` QuickAction arrays = buttons
the player must click in the ResolutionPanel; nothing auto-fires:
- `base-merchant-caravan` (`effects.ts:95`, two "Spend 1" buttons)
- `base-goldsmith` / `gold-goldsmith` (`effects.ts:96,97`, "Spend 3 gold")
- `gold-mint` (`effects.ts:122`, "Spend 1 gold")
- `sages-famine` (`effects.ts:205`, "Discard 1 grain")
- `prosperity-feeding-the-poor` (`effects.ts:209`, "Pay 1 grain")
- Brigand event face (`effects.ts:234`, four "clear gold/wool" buttons) — manual mirror of
  `resolveBrigand`; only fires on click.

`quickToActions` (`effects.ts:43-67`) turns these into `addResource`/`transferResource`
actions, which the player triggers by clicking — never automatic.

**Conclusion:** the manual-payments task only needs to ensure callers pass `pay:false`
where the player should pay by hand. `spendCost` (gated) + `resolveBrigand` are the only
two auto paths. No hidden negative-resource effect exists in `effects.ts`.

---

## 4. Region / landscape STACK model

### Shape
`GameState.regionStack: string[]` (`src/types/index.ts:152`). Each entry is a region card
id (e.g. `region-gold-3`). Built/shuffled at game start in `src/engine/newGame.ts:111-127`.
**Top of stack = last array element** (engine uses `.pop()`).

### Consumers (engine)
- **`drawRegion`** — `actions.ts:485-494`: `regionStack.pop()` → `makeRegionSlot(id)`
  appended to `p.regions`. Adds a new region to the principality. **Not dispatched by any
  UI.**
- **`expandSpine`** — `actions.ts:521-539`: pops **2** regions (needs `regionStack.length>=2`,
  L522) + adds a settlement & road. This is the real "expand" verb used by the AI table
  mode (`AiTableMode.tsx:197`) and presumably the build bar.
- **`placeLandscape`** — `actions.ts:595-605`: pops the top region and fills a specific
  **empty** region slot (`regions[regionIndex]`). The ONLY region-stack consumer wired to
  UI: `RegionTile.tsx:153` dispatches it when you drop a "landscape" from the build bar
  onto an empty slot (`uiStore` BuildKind includes `'landscape'`, `uiStore.ts:17`).

### Is there a "browse the region stack" UI? — **NO**
- `grep -rn "regionStack" src/ui` → 0 hits (UI never reads it; only the engine + AI sim +
  `liveToSim`/`ismcts`/`setup` in `src/ai/**` touch it).
- The only stack-browsing modal is `StackBrowser.tsx`, hard-bound to **draw** stacks
  (`useUI.stackBrowse: number`, opened from `CentralWall.tsx:101` per-deck "🔍" button).
- `CentralWall.tsx` renders `state.drawStacks` (`:84-107`) and the discard
  (`:110-122`) but **never** `regionStack`.

So for both the **Scout** task (§1) and any "look through the landscapes" feature, a new
region-stack browser must be built — it does not exist. The closest reusable template is
`StackBrowser.tsx` (peek/take/shuffle modal) and the `drawRegion`/`placeLandscape` engine
verbs; the missing pieces are a region-aware take action, a region browser component, and
a UI-store open/close pair (mirroring `stackBrowse`).

---

## Key file references
- `src/data/cards.json` — Scout `:778-792`; base large ship `:401-426`; gold large ship
  `:1027-1052`; resource ships `:427-582`.
- `src/data/cards.ts` — loader + `requirementOf()` / `displaySummary()` / `cardArt()`.
- `src/engine/effects.ts` — Scout step `:125`; QuickAction union `:16-26`;
  `FOCUS_KINDS :36`; manual spend buttons `:95-97,122,205,209,234`.
- `src/engine/actions.ts` — `spendCost :251`; `drawRegion :485`; `expandSpine :521`;
  `placeLandscape :595`; `takeFromStack :791`; `shuffleStack :782`; `resolveBrigand :818`;
  `addResource :888`; `transferResource :895`; `distributeResource :196`.
- `src/ui/board/StackBrowser.tsx` — draw-stack peek/search modal (template for region one).
- `src/ui/board/CentralWall.tsx` — deck wall; opens StackBrowser `:101`; no regionStack.
- `src/ui/board/RegionTile.tsx:153` — only UI dispatch of `placeLandscape`.
- `src/store/uiStore.ts:84-86,137-139` — `stackBrowse` open/close (add region sibling).
- `src/types/index.ts:152` — `regionStack: string[]`.
