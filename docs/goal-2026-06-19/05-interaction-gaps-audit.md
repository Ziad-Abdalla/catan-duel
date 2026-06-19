# 05 — Interaction-Gaps Audit (physical tabletop actions)

Lens: what physical tabletop actions are currently IMPOSSIBLE or clunky, vs the owner asks C4 (destruction/free-drag of placed pieces), D1 (pile-peek/swap/auto-shuffle), D2 (make EVERY physical action manual & TTS-like). READ-ONLY pass; no code changed.

Files inspected: `src/engine/actions.ts`, `src/types/index.ts`, `src/store/uiStore.ts`, `src/ui/board/{PrincipalityBoard,BuildSupply,CentralWall,Hand,CardZoom,ResolutionPanel,RegionTile}.tsx`.

---

## 1. Current interaction model (click vs drag)

The game ALREADY uses native HTML5 drag-and-drop (`draggable` + `onDragStart`/`onDragOver`/`onDrop` + `dataTransfer`), NOT a DnD library and NOT pointer-based dragging. It is a hybrid: most actions support BOTH a click/menu path and a drag path.

Drag UI state lives in `uiStore.ts`:
- `dragCardId` (a hand/era card being dragged to a site) — `uiStore.ts:43`, set at `Hand.tsx:32-37`, `BuildSupply.tsx:94-99`.
- `dragBuild: 'settlement'|'road'|'city'|'landscape'` (a supply piece) — `uiStore.ts:45`, set at `BuildSupply.tsx:70-74`.
- `dragRemove: { placedIndex, player }` (a placed piece dragged BACK off the board) — `uiStore.ts:47`, set at `PrincipalityBoard.tsx:104` (roads) and `:209` (building-site cards).

Drag is **native** and uses `e.dataTransfer.setData('text/cardid' | 'text/build', …)` (`BuildSupply.tsx:71,95`; `Hand.tsx:33`); drops read it back at `PrincipalityBoard.tsx:195`. There is no `onPointerDown`/pointer-move free-dragging anywhere — pieces snap to predefined grid slots, they don't float to arbitrary coordinates.

**How a placed piece is moved/removed TODAY:**
- **Remove (drag):** grab a road (`PrincipalityBoard.tsx:97-108`) or a building-site card (`:201-219`), drag it onto the Build bar; the bar's drop handler dispatches `removePlaced` (`BuildSupply.tsx:44-57`). Engine: `actions.ts:482-497` splices it out of `placed[]` and routes it to discard or supply via `discardHome` (`actions.ts:206-212`).
- **Remove (menu):** open CardZoom → "Discard" (`CardZoom.tsx:134` → `discardCard from:'placed'`) or "Return to hand" (`:135` → `returnToHand`); or ResolutionPanel CardTool "remove from play" / "return to hand" (`ResolutionPanel.tsx:357-362`).
- **MOVE to a different slot:** NOT POSSIBLE. There is no `movePlaced` action. The only way to relocate a placed piece is remove-then-replace, which re-pays nothing but loses its identity ordering and any per-card state, and for a building means discard → redraw/re-grant → re-drop. Dropping a hand card onto a site (`playCard`, `PrincipalityBoard.tsx:179`) only ADDS; it never relocates an already-placed card.

Resources are not pieces you drag: a region tile is rotated (`RegionTile.tsx:152-155` click-half = ±1; `setStored`) and resources move between players only via the ResolutionPanel `transferResource` gutter (`ResolutionPanel.tsx:131-132`). There is no drag of a single resource token from region A to region B or between players.

Draw stacks are click-only and **top-only**: `CentralWall.tsx:111-125` draws the top of a deck (`drawToHand`), `:130-142` draws the top of discard (`drawFromDiscard`). No way to look inside a face-down stack.

---

## 2. C4 — free-drag / move / destroy placed pieces

**Destroy** is well covered (remove via drag-to-bar, discard, return-to-hand; engine `removePlaced`/`discardCard`). The gap is **MOVE / FREE PLACEMENT**.

Gaps:
- **No `movePlaced` action.** `placed[]` entries carry a free-form `slot` string (`types/index.ts:91-95`), but no action edits `slot` in place. To move a road from `road-2` to `road-4` you must remove + rebuild.
- **Slots are a fixed grid, not free coordinates.** Positions are computed (`PrincipalityBoard.tsx:40-46`, `seatCol`/`roadSlotCol`); a piece cannot be parked at an arbitrary x/y like in Tabletop Simulator. Building-site cards only land in `s{seat}-{up|down}` buckets (`PrincipalityBoard.tsx:58-60`).
- **No drag of a placed card from one site to another site.** Sites are drop targets only for hand/supply drags (`PrincipalityBoard.tsx:188-198`); a `dragRemove` piece can only be dropped on the Build bar, not on another slot.
- **No reorder within a site stack** (cards in one site render in `placed[]` order, `:201`).

Recommended new actions (all serializable, fit the existing reducer):
- `{ type: 'movePlaced'; player; placedIndex; slot: string }` — rewrite one `placed[i].slot`. Minimal, covers road→road, building→building-site, settlement reseat. ~6 lines in `reduce`.
- Optionally `{ type: 'reorderPlaced'; player; placedIndex; toIndex }` for stacking order within a site.
- (Only if true free placement is wanted) extend `PlacedCard` with optional `{ x; y }` and a `freePlace` action — larger change, needs an absolute-positioned overlay layer; see §5.

Recommended UI: make every slot (and the opposite player's sites, for cross-player effects) a drop target for a `dragRemove`/`dragMove` payload, dispatching `movePlaced` instead of (or alongside) `removePlaced`. The drag plumbing already exists — this is mostly adding `onDrop` handlers that branch on whether a move-drag is active.

---

## 3. D1 — peek a stack → take/swap a card → auto-shuffle

This is the **biggest gap**. The engine treats `drawStacks: string[][]`, `regionStack`, `eventDeck`, `discard` as black boxes you can only pop the top of, plus a few targeted pulls.

Existing partial support:
- `drawToHand` (`actions.ts:499-508`) — top only.
- `grantCard` with `fromStack` (`actions.ts:659-675`) — CAN pull a SPECIFIC named card out of a known stack into a hand. This is the closest existing primitive to "take a specific card", but it assumes you already know the id (the UI grants from a global card list, `ResolutionPanel.tsx:329-343`), and it does NOT shuffle afterward.
- `discardToStack` (`actions.ts:537-546`) — tucks a card UNDER a stack (front of array). The "swap" half of the ask partially exists as draw-top + tuck-under, but it never reveals the stack and never shuffles.
- `drawFromDiscard` with optional `cardId` (`actions.ts:597-607`) — can take any named card from the visible discard pile.
- Shuffle exists only internally for Yule (`actions.ts:587`, `shuffle(... makeRng(seq ^ …))`); there is NO player-triggered shuffle action.

MISSING engine primitives for the full "pay 2 → peek → swap → auto-shuffle" flow:
1. **Peek / reveal a face-down stack** — no action exposes a stack's contents to the UI for the acting player. (`drawStacks` IS in the synced snapshot, so the data is reachable; what's missing is a *UI affordance + an audit-logged "peeked" action*, not new state.)
2. **Take a specific card from a stack by index** — `grantCard fromStack` removes by `lastIndexOf(cardId)`; there's no take-by-position, and no "remove from stack, no recipient" variant.
3. **Put a card to a specific position in a stack** — `discardToStack` only prepends (bottom). No "insert at top" / "insert at index N".
4. **Shuffle a stack on demand** — none. Need `{ type: 'shuffleStack'; which: 'draw'|'region'|'event'; stackIndex? }` using the existing seeded `shuffle`/`makeRng` so both online clients converge.
5. **Reorder a stack** (scry-style rearrange of the top N) — none.

Proposed minimal new Actions (serializable, deterministic):
- `{ type: 'shuffleStack'; target: 'draw'|'region'|'event'|'discard'; stackIndex?: number }` — reuse `shuffle(arr, makeRng((s.seq+1) ^ salt))` so it's sync-safe (same pattern as Yule).
- `{ type: 'takeFromStack'; player; target; stackIndex?; index: number }` — pull the card at a position into hand (generalises `grantCard fromStack`).
- `{ type: 'putToStack'; player; target; stackIndex?; cardId; position: 'top'|'bottom'|number }` — generalises `discardToStack` (which is bottom-only).
- (Peek needs no engine state change — add a `logNote`-style `{ type:'peekStack'; player; target }` purely for the audit trail, and a UI modal that lists the stack for the acting player.)

The "pay 2 resources" half is already expressible via `addResource`/`transferResource` (`ResolutionPanel.tsx:155-161`) — wrap peek+swap+shuffle as a sequence the ResolutionPanel runs, just like `quickToActions` dispatches arrays (`ResolutionPanel.tsx:431-435`).

UI affordance: a "Look through deck" button on each `cardstack` in `CentralWall.tsx:110-143` → opens a stack-browser modal (reuse the CardZoom scrim pattern) listing every card face-up TO THE ACTING PLAYER, each with "take to hand" (`takeFromStack`) and a "swap with…" picker, then a "Shuffle & close" button (`shuffleStack`). Auto-shuffle on close satisfies "then it should auto-shuffle."

---

## 4. D2 — concise gap list of physical actions not currently possible

Possible today: rotate region (±1), draw top of any deck/discard, draw a named card from discard, grant any named card to a hand, tuck a card under a deck, play/discard/return placed & hand cards, transfer 1 resource between players, ±resources/VP/stats, override dice, set tokens, notes, undo.

NOT currently possible / clunky:
- **Move a placed piece to another slot** (only remove+rebuild) — §2.
- **Free-place a piece at an arbitrary position** (grid-snap only) — §2/§5.
- **Peek / search a face-down draw stack, region stack, or event deck** — §3.
- **Take a specific (by-position) card from a draw/region stack** — only top-draw or grant-by-known-id.
- **Shuffle any stack on demand** (only Yule auto-shuffles) — §3.
- **Reorder / scry the top of a deck.**
- **Move a single resource between two of a player's OWN regions**, or pick WHICH region loses/gains (distribution is automatic, `actions.ts:154-175`).
- **Reveal a hand card to the opponent** (no "show" action; only play/discard).
- **Flip a card face-up/face-down** (no facing state on `PlacedCard`/cards).
- **Rotate/tap a placed card** (no orientation state — common TTS need for "exhausted" units).
- **Mill / discard the top of a deck** without it going to a hand.
- **Search the discard freely from the UI** (engine supports named pull, but UI only draws the top, `CentralWall.tsx:138`).
- **Move the event deck around / re-seat an event** (only the coded Yule re-seat).
- **Draw a region to a SPECIFIC empty landscape slot of choice** is supported (`placeLandscape`), but you can't choose WHICH region card — always top of `regionStack`.

---

## 5. Recommendation — real DnD library vs improved click-based

**Recommendation: keep the current native-HTML5-drag + click hybrid; do NOT add dnd-kit or react-dnd yet. Close the gaps at the ENGINE + slot-drop level first.**

Reasoning:
- The app already has a working, lightweight native-drag system with zero deps, and a parallel click path for every action (good for touch / accessibility / online clarity). A library would be a rewrite of working code for marginal benefit.
- The owner's actual asks (C4 move/destroy, D1 peek/swap/shuffle, D2 completeness) are **80% engine primitives + modal UI**, not a dragging-engine problem. `movePlaced`, `shuffleStack`, `takeFromStack`, `putToStack`, and a stack-browser modal deliver almost all of it with no DnD upgrade.
- True **free placement at arbitrary x/y (TTS-style)** is the one ask that the grid model can't satisfy and that a pointer-based system suits. If the owner genuinely wants pieces to float anywhere (not snap to slots), THAT — and only that — justifies dnd-kit (best-maintained, pointer + touch + keyboard sensors, accessible) over the brittle native API. Treat it as an optional Tier-2 follow-up behind the engine work, scoped to an absolute-positioned overlay with `{x,y}` on `PlacedCard`.

Pragmatic order:
1. Add `movePlaced` + make slots accept move-drops (C4) — small, high value.
2. Add `shuffleStack` + `takeFromStack`/`putToStack` + a stack-browser modal wired into the ResolutionPanel sequence runner (D1) — medium, highest owner value.
3. Add the smaller D2 primitives (per-region resource move, reveal, flip/tap facing) as needed.
4. ONLY IF free-placement is confirmed wanted: introduce dnd-kit for an arbitrary-position overlay (Tier 2).

All new actions stay in the pure reducer (`actions.ts`), keep `seq`/`seatSeq` bumping (`applyAction`, `:278-287`), and use the existing seeded `shuffle` so they broadcast and undo cleanly online.
