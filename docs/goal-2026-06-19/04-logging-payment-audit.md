# Logging + Payment/Cost Audit (Catan Duel) — 2026-06-19

Scope: (1) automatic action logging, (2) the manual payment/cost system + the
"costs don't reduce when playing face-up buildings" bug (C2).

Engine is at `src/engine/actions.ts`; card data at `src/data/cards.json`
(loaded by `src/data/cards.ts`). READ-ONLY audit — no code changed.

---

## 1. C2 ROOT CAUSE — "costs don't reduce"

### The data is CORRECT — costs are NOT missing.
`getCard('base-road' | 'base-settlement' | 'base-city')` all RESOLVE and all
have non-empty `cost` arrays with resource types that exactly match the region
resources (`lumber / brick / wool / grain / ore / gold`). Verified against
`cards.json` (103 cards total):

```json
// base-settlement (cards.json line 63)
"cost": [ {"resource":"lumber","count":1}, {"resource":"brick","count":1},
          {"resource":"wool","count":1},   {"resource":"grain","count":1} ]
// base-city (line 96)
"cost": [ {"resource":"grain","count":2}, {"resource":"ore","count":3} ]
// base-road (line 118)
"cost": [ {"resource":"lumber","count":1}, {"resource":"brick","count":1} ]
// turmoil-hedge-tavern-1x  (the "tavern")  — Face-up Expansion, set=turmoil
"cost": [ {"resource":"gold","count":1}, {"resource":"grain","count":1},
          {"resource":"wool","count":1} ]
// gold-merchant-guild  — Face-up Expansion (brick+wool+grain)
// progress-university   — Face-up Expansion (lumber+grain+brick)
```

Cost resource set == region resource set (confirmed by diff). `spendCost` →
`distributeResource` would deduct correctly. **So the bug is NOT the data and NOT
the engine math.**

### The bug is in the UI dispatch — `pay: false` (and a path split).

`playCard` / `buildPiece` / `upgradeCity` all default `pay = (a.pay !== false)`,
i.e. **omitting `pay` ⇒ true ⇒ engine deducts**; passing `pay: false` ⇒ no spend.
(`actions.ts:375, 421-422, 511`.)

Two classes of "build" exist in the UI, and they behave DIFFERENTLY:

| Piece | How it's placed | Dispatch | Deducts? |
|---|---|---|---|
| road / settlement / city | drag from BuildSupply → drop on PrincipalityBoard | `buildPiece` / `upgradeCity` with **NO `pay`** ⇒ default **true** | YES (engine spends) |
| **tavern / merchant-guild / university** (Face-up Expansion "buildings") | drag from BuildSupply → drop on a **building Site** | `playCard … **pay: false**` (`PrincipalityBoard.tsx:179`) | **NO — this is the leak** |
| any hand card | Play button / drag to site | `playCard … **pay: false**` (`HandView.tsx:34`, `PrincipalityBoard.tsx:179`, `CardZoom.tsx play(false)`) | NO (manual by design) |

**So the literal owner complaint splits in two:**

1. **Taverns / era face-up buildings genuinely DON'T deduct** — they route
   through `Site.place()` → `playCard … pay:false` (`PrincipalityBoard.tsx:175-181`).
   They HAVE a cost but it is never spent. This is a real C2 bug. ✅ confirmed.

2. **Roads / settlements / cities DO deduct in code today** (pay defaults true at
   the PrincipalityBoard drop sites: lines 89, 91, 120, 131, 139). If the owner
   also sees these "not reducing", the likely real-world reasons are:
   - The deduction IS happening but is **invisible/under-communicated** — it only
     shows as region counters dropping + a log line like `Built road (-1 wood,
     -1 brick)`; with no toast/animation a player easily misses it. (The cost is
     spread across regions by `distributeResource`, capped 0..3 each.)
   - `distributeResource` is **best-effort & silent** (`actions.ts:154-175`): if
     the player stores 0 of a required region type, that portion is silently
     skipped — looks like "nothing happened".
   - There is **no manual/interactive confirmation** for structural builds (they
     auto-pay), which conflicts with the C3 "payment must be manual" goal — the
     owner may be reading "it didn't ask me / didn't visibly change" as "didn't
     reduce".

**Bottom line:** Era buildings = a true non-deduction bug (`pay:false`).
Roads/settlements/cities = deduct silently & non-interactively; the felt problem
is invisibility + the lack of a manual pay step, not missing math.

---

## 2. AUTO-LOG INVENTORY — what logs today vs. what's missing

`logged(s, player, text)` (`actions.ts:215`) appends `{turn, player, text}`.
Manual notes use `logNote` and add `manual:true` (`actions.ts:694-698`).
`AuditLog.tsx` is a pure read-only renderer of `state.log`.

### Reducers that DO auto-log (✅):
- `upgradeCity` → "Upgraded to city (-2 wheat, -3 ore)" (`379-396`)
- `buildPiece` road → "Built road (…)" (`427-436`)
- `buildPiece` settlement → "Built settlement (…)" (`443-468`)
- `removePlaced` → "Removed <name> → discard" / "Removed <name>" (`492-496`)
- `drawToHand` → "Drew a card from stack N" (`507`)
- `playCard` → "Played <name> (cost)" (`515-526`)
- `discardToStack` → "Tucked a card under stack N" (`545`)
- `discardCard` → "Discarded <name>" / "Returned <name> to supply" (`570-574`)
- `drawEvent` → "Event: <name>" (`588, 591`)
- `drawFromDiscard` → "Drew <name> from the discard pile" (`606`)
- `addResource` → "+1 wheat" / "-2 ore" (`631-635`)
- `claimVictory` / `agreeVictory` → vote-to-end lines (`704, 710-714`)

### Reducers that DO **NOT** log (❌ — gaps for owner's debugging goal):
- **`roll`** (`335-336`) — dice rolls are NOT logged. (Dispatched from
  `gameStore.ts:142` every turn.) **Biggest gap** — owner expects the raw roll
  trail. The contrary docstring in `AuditLog.tsx` ("raw dice rolls") is wrong.
- **`applyProduction`** (`338-350`) — production payout to both players: silent.
- **`rotateRegion`** (`352-356`) / **`setStored`** (`358-362`) — manual region
  counter changes: silent. (Frequent, and exactly the "where did my resources
  go" events.)
- **`drawRegion`** (`364-372`) / **`placeLandscape`** (`471-480`) — silent.
- **`expandSpine`** (`399-418`) — adds settlement+road+2 regions: silent (no cost
  logged either; note it also DOESN'T spend a cost).
- **`returnToHand`** (`529-535`) — silent.
- **`transferResource`** (`637-648`) — opponent-to-opponent resource moves
  (Trade event, theft): **silent**. Should log "P0 → P1: -1 wool".
- **`setToken`** (`621-628`) — hero/trade advantage handoff: silent.
- **`adjustVP`** (`614-619`) / **`adjustStat`** (`650-657`) — manual nudges: silent.
- **`grantCard`** (`659-675`) — materialise a card into hand: silent.
- **`setDice`** (`677-686`) / **`markUsed`** (`688-692`) — silent (markUsed maybe fine).
- **`dismissEvent`/`declineVictory`/`nextPhase`/`endTurn`** — silent (endTurn /
  turn-advance arguably worth a log line for the trail).
- **Brigand effect** — there is NO Brigand reducer. `BrigandSequence.tsx` is a
  pure visual cinematic that dispatches NOTHING (`grep` of file: zero dispatch).
  The actual "lose gold + wool" is done MANUALLY by the player (addResource /
  transferResource / a typed note). That's why the owner's example
  *"Brigand: P1 over 7 — lost gold + wool"* is literally the placeholder text in
  the manual NoteTool input (`ResolutionPanel.tsx:386`).
- **Victory eligibility** (`finalize`, `227-241`) — crossing the threshold is not
  logged (only the manual claim/agree are).

### MISSING rich auto-log entries the owner wants (debug/track goal):
1. **Dice roll** — "Rolled 8 · Brigand" every roll (from `roll`).
2. **Production payout** — "Production 8: P0 +1 ore, P1 +1 grain" (from `applyProduction`).
3. **Event resolution / Brigand effect** — currently impossible to auto-log
   because there is NO engine action for the Brigand robbery; it's manual. Either
   add a `resolveBrigand` action OR at minimum log the manual `transferResource`/
   `addResource` that players use to enact it.
4. **transferResource** — cross-player steals/trades (Trade event).
5. **Region counter edits** — rotateRegion/setStored (the "resources changed" trail).
6. **Token / VP / stat changes** — advantage + score movement.
7. **Turn boundary** — "— Turn N: P1 to act —".

---

## 3. The manual "Log a note" UI

- Component: **`NoteTool`** in `src/ui/board/ResolutionPanel.tsx:369-395`.
- Input placeholder is literally `"e.g. Brigand: P1 over 7 — lost gold + wool"`
  (line 386) — matches the owner's stated example exactly.
- Dispatches `{ type: 'logNote', player: owner, text }` (line 374) →
  reducer `logNote` (`actions.ts:694-698`) appends `{…, manual:true}`.
- `AuditLog.tsx:37` styles manual rows with the `manual` class.
- This is the only `logNote` dispatch site in the app (others are tests/fuzz).
  It is a manual chore — the A1/A2 goal is to make logging AUTOMATIC so this note
  box becomes optional, not the primary record.

---

## 4. Payment call sites (where pay defaults / where to add manual affordance)

Default rule (engine): `pay = a.pay !== false` ⇒ omit ⇒ **true (auto-pay)**.

| Site | Dispatch | pay | Behaviour |
|---|---|---|---|
| `PrincipalityBoard.tsx:89` click upgrade | `upgradeCity` (no pay) | true | **auto-pays** — feels automatic |
| `PrincipalityBoard.tsx:91` drop city | `upgradeCity` (no pay) | true | **auto-pays** |
| `PrincipalityBoard.tsx:120` drop road | `buildPiece road` (no pay) | true | **auto-pays** |
| `PrincipalityBoard.tsx:131` drop settlement L | `buildPiece` (no pay) | true | **auto-pays** |
| `PrincipalityBoard.tsx:139` drop settlement R | `buildPiece` (no pay) | true | **auto-pays** |
| `PrincipalityBoard.tsx:179` drop card on Site | `playCard pay:false` | **false** | **NEVER pays — tavern leak (C2 #1)** |
| `HandView.tsx:34` Play button | `playCard pay:false` | false | never pays (manual by design) |
| `CardZoom.tsx:64` play(false) "Play to principality" | `playCard pay:false` | false | never pays |
| `CardZoom.tsx:64` play(true) "Play & pay cost" | `playCard pay:true` | true | the ONLY manual-pay affordance today |
| `expandSpine` (`actions.ts:399`) | no cost at all | — | never pays a cost |

**Where the owner "feels auto-paying":** the four structural drop sites
(upgrade/road/settlement) silently auto-pay. **Where to add a manual pay
affordance:** those same structural drops should NOT default-pay; instead, like
hand cards, they should place first and offer an explicit "Pay cost" action (the
`CardZoom` "Play & pay cost" pattern, lines 116-120, is the model to generalise).

**Where the tavern leak is:** `PrincipalityBoard.tsx:175-181` `Site.place()` hard-
codes `pay:false` for EVERY card dropped on a site, including era buildings that
have a cost. Era buildings need the same interactive "Pay cost" affordance, not a
silent skip.

---

## 5. Exact file:line list a fix must touch

### (a) Make costs actually deduct (the C2 bug)
- `src/ui/board/PrincipalityBoard.tsx:179` — `Site.place()` always sends
  `pay:false`; era face-up buildings (tavern/guild/university) therefore never
  charge. Route paid pieces through a pay-aware path.
- (`src/ui/board/CardZoom.tsx:60-67` already exposes a paid play; mirror that
  for site drops.)
- Engine is already correct — no change needed to `spendCost`
  (`actions.ts:200-202`) / `distributeResource` (`154-175`) / `playCard`
  (`510-527`). Optionally make `distributeResource` log/flag when it can't fully
  spend (silent best-effort hides "you couldn't afford it").

### (b) Interactive-but-manual pay (C3)
- Generalise the `CardZoom.tsx:116-120` "Play & pay cost" two-button pattern
  (place vs. place-and-pay) to:
  - Structural drops `PrincipalityBoard.tsx:89, 91, 120, 131, 139` — change from
    silent `pay:true` to an explicit player choice (place now, pay on demand), OR
    add a confirm/toast so the deduction is visible.
  - Site drops `PrincipalityBoard.tsx:179` — offer pay/no-pay for cost-bearing cards.
  - `HandView.tsx:34` Play button — add a "& pay" sibling (matches CardZoom).
- Engine already supports it via the `pay` flag on `playCard`/`buildPiece`/
  `upgradeCity` — no reducer change required for manual pay.

### (c) Comprehensive auto-logging
Add `logged(...)` calls in `src/engine/actions.ts`:
- `roll` `335-336` — "Rolled <prod> · <event>".
- `applyProduction` `338-350` — per-player production payout.
- `transferResource` `637-648` — "<from> → <to>: <n> <res>".
- `rotateRegion` `352-356` / `setStored` `358-362` — region counter change.
- `expandSpine` `399-418` — "Expanded principality (+settlement +road)".
- `drawRegion` `364-372` / `placeLandscape` `471-480` — region added.
- `setToken` `621-628` — advantage handoff.
- `adjustVP` `614-619` / `adjustStat` `650-657` — manual nudge.
- `grantCard` `659-675` — card materialised.
- `endTurn` `727-735` — turn boundary marker.
- Brigand: there is no Brigand action — EITHER add a `resolveBrigand` reducer
  (auto-computes & logs the gold/wool loss) OR ensure the manual
  transfer/addResource enacting it is logged (covered above). NB: the cinematic
  copy (`BrigandSequence.tsx`: "gold & ore") disagrees with `EVENT_TEXT.brigand`
  ("gold and wool", `dice.ts`) and the note placeholder ("gold + wool") — pick one.
- Fix the stale docstring in `AuditLog.tsx:6-11` once rolls/production are logged.

### Verification on fix
- `src/engine/resolution.test.ts` already covers `logNote` (155) and resource
  ops; add cases asserting each newly-logged action appends an entry, and a test
  that a tavern played on a site WITH `pay:true` reduces the matching regions.
- `src/engine/fuzz.test.ts` exercises the action space — keep new log strings
  side-effect-free.
