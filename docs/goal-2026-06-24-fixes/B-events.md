# B — Event Pile Audit (catan-duel)

Read-only investigation, 2026-06-24. Scope: (1) the missing event-deck browser; (2) per-event
shuffle/effect correctness. All claims verified against current code/data on disk.

Key files: `src/types/index.ts` (GameState.eventDeck/revealedEvent/eventNonce), `src/engine/actions.ts`
(`drawEvent` + `seatYule`), `src/ai/sim/events.ts` (sim resolution + a SECOND `seatYule`),
`src/engine/newGame.ts` (deck assembly), `src/data/cards.json` (28 event cards),
`src/ui/board/*` (popup + browsers), `src/store/uiStore.ts` (browse modal state).

---

## Issue 1 — "We can't SEE the event pile"

### Confirmed: there is NO event-deck browser.

`grep -rn "eventDeck" src/ui/` returns **nothing**. The event deck is never surfaced as a
browsable/peekable pile anywhere in the UI. The only event UI is the transient draw popup:

- `EventPopup.tsx` reads `state.revealedEvent` + `state.eventNonce` and shows the drawn card on
  both screens. `DiceEventCue.tsx` / `EventFlourish.tsx` are the dice→event cue + flourish
  animation. None show deck count, top card, or contents.
- There is **no count badge** for `eventDeck.length` and **no way to look through the pile** the
  way you can with the other three piles.

The three existing browsers (the pattern to copy):

| Browser | What it browses | UI-store open flag (`uiStore.ts`) |
|---|---|---|
| `StackBrowser.tsx` | a numbered draw stack `state.drawStacks[idx]` | `stackBrowse: number\|null` → `openStackBrowse(i)` / `closeStackBrowse()` |
| `RegionStackBrowser.tsx` | `state.regionStack` (landscapes) | `regionBrowse: boolean` → `openRegionBrowse()` / `closeRegionBrowse()` |
| `DiscardBrowser.tsx` | the shared discard pile | `discardBrowse` (uiStore ~line 113) |

All three are mounted side-by-side in `TableBoard.tsx` lines 84–86:
```
<StackBrowser />
<RegionStackBrowser />
<DiscardBrowser />
```

### Where an event-deck browser/peek should hook in

1. **uiStore.ts** — add `eventBrowse: boolean` + `openEventBrowse()` / `closeEventBrowse()`,
   mirroring `regionBrowse` (lines 110–112 / 168–170). It is a boolean (single global pile),
   exactly like the region and discard browsers.
2. **New component** `src/ui/board/EventDeckBrowser.tsx` modelled on `RegionStackBrowser.tsx`
   (the closest analogue: one global pile, look-through, optional reshuffle). It should read
   `state.eventDeck`, render the cards via `getCard(id)` + `cardArt(id)`, and reuse
   `stackbrowser.css`. Mount it in `TableBoard.tsx` next to the other three (after line 86).
3. **Trigger** — a clickable event-deck "pile" object on the table (with a count badge =
   `eventDeck.length`) that calls `openEventBrowse()`. The same pile/widget should host the
   existing "draw event" affordance (currently only reachable via the dice path).
4. **Trust-based note** — Yule's start position (3 cards below it) and the Barbarian/Insurrection
   "top 4" placement are HIDDEN information at a physical table. A browser that reveals full order
   leaks that. Recommended: a "peek count + top card" mode by default, with a full-order
   "look through (host/sandbox)" mode behind a toggle, since this is a trust-based manual sandbox.

---

## Issue 2 — Event card mechanics audit (every card)

### 2a. CRITICAL — `drawEvent` (the actual game action) resolves NOTHING and the deck cycling is wrong

`src/engine/actions.ts` `case 'drawEvent'` (lines 804–820) is the action the human players
actually dispatch. It only:
- pops the top card into `revealedEvent` (for the popup), and
- for non-Yule cards does `eventDeck.unshift(id)` — i.e. puts the drawn card back at the
  **bottom** of the deck (`pop()` takes from the end = "top", `unshift` puts at index 0 = "bottom").

It does **NOT apply any card effect** — resolution is manual/trust-based (consistent with the
sandbox design; the popup just tells players what to do). That part is by design.

BUT two real bugs live here:

- **No "top 4" handling for Barbarian Attack / Insurrection.** Both cards' own rules_text says the
  card must be returned **under the top 4 cards of the event stack**, not sent to the bottom.
  `drawEvent` sends every non-Yule card to the bottom, so these two are mis-seated every time.
- **`base-yule` constant mismatch risk** — `drawEvent` reshuffles + reseats on `id === YULE_ID`
  (`'base-yule'`), good — but see 2c for the duplicated/diverging `seatYule`.

The rich resolution logic in `src/ai/sim/events.ts` (`resolveEventCard`) is **only used by the AI
self-play simulator**, NOT by the live human game. So any "effect correctness" for human play is
purely the popup text + manual execution. The sim's correctness still matters for AI quality and
is audited below.

### 2b. Yule placement — verify the "4th from bottom" claim

Official rule (confirmed via catan.com rules search): on setup / on Yule reshuffle you "place 3
cards face down, place Yule on top of those 3, then place the remaining cards on top." So Yule sits
with **exactly 3 cards below it** (it is the 4th card from the bottom, inclusive).

Two `seatYule` implementations exist and they **disagree**:

- `src/engine/actions.ts` (lines 18–22), `YULE_FROM_BOTTOM = 3`:
  ```
  out.splice(Math.min(YULE_FROM_BOTTOM, out.length), 0, YULE_ID)
  ```
  Inserts Yule at index `min(3, len)` from the **front**. With index 0 = bottom (because
  `drawEvent` pops the END as "top"), inserting at index 3 leaves **3 cards below Yule** — CORRECT,
  but only if "index 0 = bottom". Verify the orientation convention holds (it does: `drawEvent`
  `pop()`s the top).
- `src/ai/sim/events.ts` (lines 17–22), same `YULE_FROM_BOTTOM = 3`:
  ```
  out.splice(Math.max(0, out.length - YULE_FROM_BOTTOM), 0, YULE_ID)
  ```
  Inserts at index `len-3`, leaving **3 cards ABOVE Yule** (Yule near the TOP). This is the
  OPPOSITE end from the actions.ts version.

**Gap:** the two functions place Yule at opposite ends of the deck. At most one is correct.
`newGame.ts` line 115 imports `seatYule` from `actions.ts` and comments "Yule starts 4th from the
bottom", so the actions.ts convention is the intended one (3 below Yule). The sim's `seatYule` is
inconsistent with it. **Fix:** delete the duplicate in `events.ts` and import the single canonical
`seatYule` from `actions.ts`; add a unit test asserting Yule has exactly 3 cards below it after
seat + after a Yule-triggered reshuffle.

### 2c. Barbarian Attack & Insurrection — the "reshuffle into top 4" mechanic is UNIMPLEMENTED

Both cards explicitly return themselves into the deck under the top 4 cards (rules_text + the
prosperity/barbarians docs both say "mind the special rule … for returning … to the event card
stack"):

- `barbarians-barbarian-attack` (copies 3): rules_text "…Then place this card under the top 4 event cards."
- `prosperity-insurrection` (copies 2): rules_text "…Then place this card under the 4 topmost event card stack cards."

Neither `drawEvent` (actions.ts) nor `resolveEventCard` (events.ts) handles this. In both code
paths these two cards are treated like any other and sent to the deck bottom. **This is the second
half of the owner's complaint and the core gap.**

### 2d. Per-card table (sim resolution `resolveEventCard` in events.ts, + the human `drawEvent` path)

"Impl" = AI-sim resolution. The human game applies NO effect for any card (manual). "Reseat" =
where the card goes back in the event deck after resolving.

| Card (id) | Set | Copies | Official mechanic (esp. reseat) | Current impl (sim) | Reseat (both paths) | Gap |
|---|---|---|---|---|---|---|
| Yule `base-yule` | base | 1 | Reshuffle deck, reseat Yule with 3 cards below it, draw again | Reshuffle + `seatYule` + re-draw — handled | special | ⚠ `seatYule` diverges between the two files (2b) |
| Invention `base-invention` / `progress-invention` | base/progress | 1/2 | 1 res per progress-point building, max 2 | Implemented (caps at 2) | bottom | OK; reseat-to-bottom is the wrong cycling model (see 2e) but harmless |
| Year of Plenty `base-year-of-plenty` | base | 2 | 1 res per adjacent Storehouse & Abbey if space | Implemented | bottom | OK (does not check storage cap — minor) |
| Fraternal Feuds `base-` / `turmoil-` | base/turmoil | 1/1 | Strength holder returns 2 opp hand cards to bottom of matching stacks | Implemented (uses `drawStacks[0]`, not "matching") | bottom | Minor: dumps to stack 0, not the resource-matching stack |
| Feud `base-` / `turmoil-` | base/turmoil | 1/1 | Strength holder picks 3 opp buildings, opp removes 1 to bottom of matching stack | `buryWorstBuilding` removes 1 (heuristic) to `drawStacks[0]` | bottom | Minor: stack 0 not matching; "select 3 then opp chooses" simplified |
| Traveling Merchant `base-`/`gold-` | base/gold | 2/1 | Each player buys ≤2 res @1 gold each | Implemented | bottom | OK |
| Trade Ships Race `base-`/`gold-` | base/gold | 1/1 | Most trade ships → 1 res; tie → both (need ≥1 ship) | Implemented | bottom | OK |
| Gift for the Prince `gold-gift-for-the-prince` | gold | 1 | 1 gold per unit with ≥1 strength | Implemented | bottom | OK |
| Riots `turmoil-riots` | turmoil | 2 | Pay 1–2 gold by unit count; else remove a unit to bottom of matching stack | Implemented (incl. Chapel shield; uses stack 0) | bottom | Minor: stack 0 not matching |
| Plague `progress-plague` | progress | 3 | Every region bordering a city loses 1 res | Implemented (Bath House shield; Pharmacy comp) | bottom | OK |
| Good Neighbors `intrigue-good-neighbors` | intrigue | 2 | Reveal top of every stack, no attack; Pilgrimage Site → 1 res, Odin's Fountain → draw 1 | **default: no-op** | bottom | NOT WIRED (sim) |
| Religious Dispute `intrigue-religious-dispute` | intrigue | 2 | City owners bury all hand cards; Church/Odin's Temple −2 each; Sacrificial Site +3 wool, Bishop's See +3 gold | **default: no-op** | bottom | NOT WIRED (sim) |
| Fortunate Trade Voyage `merchants-` | merchants | 2 | Per 1 trade ship, ≤2 res of its type; Large ship variant | **default: no-op** | bottom | NOT WIRED (sim) |
| Capricious Sea `merchants-` | merchants | 1 | Die 1–4 calm (1 res per trade ship); 5–6 storm (slide a ship under a stack) | **default: no-op** | bottom | NOT WIRED (sim) |
| Hour of the Master Merchants `merchants-` | merchants | 1 | Rotate each Residence +1 level; maxed → adjacent region +1 res | **default: no-op** | bottom | NOT WIRED (sim) |
| **Barbarian Attack** `barbarians-barbarian-attack` | barbarians | 3 | Units vs city/Metro/expansion VP: fewer → discard 2 res; more+≥1 city → +2 res / rotate Triumph. **Then place under the top 4 event cards.** | **default: no-op** | bottom (WRONG) | NOT WIRED + ❗ **reseat-to-top-4 missing** (owner's example) |
| Retreat of the Barbarians `barbarians-` | barbarians | 1 | ≥1 unit → draw 1 from a stack; unit+strength adv → up to 2 | **default: no-op** | bottom | NOT WIRED (sim) |
| Friendship Between Peoples `explorers-` | explorers | 2 | 1 res per Island card rotated ≥ next level | **default: no-op** | bottom | NOT WIRED (sim) |
| Most Successful Explorer `explorers-` | explorers | 2 | Most sea cards (≥1) → draw ≤2 from one own stack; tie → each draws 1 | **default: no-op** | bottom | NOT WIRED (sim) |
| Famine `sages-famine` | sages | 2 | No Granary → discard 1 grain; no grain → discard 2 res | **default: no-op** | bottom | NOT WIRED (sim) |
| Council of the Sages `sages-` | sages | 2 | Distribute ≤2 owls among sages OR ≤2 res among regions w/ adjacent sage | **default: no-op** | bottom | NOT WIRED (sim) |
| **Insurrection** `prosperity-insurrection` | prosperity | 2 | Each player buries 1 building costing ≥2 res under a matching stack. **Then place this card under the top 4 event cards.** | **default: no-op** | bottom (WRONG) | NOT WIRED + ❗ **reseat-to-top-4 missing** |
| Taxation `prosperity-taxation` | prosperity | 2 | Pay 1 star → 1 res of choice + 1 gold | **default: no-op** | bottom | NOT WIRED (sim) |

(Two `Traveling Merchant` / `Trade Ships Race` / `Invention` ids exist per set; handled by shared
`case` labels — OK.)

### 2e. The generic deck-cycling model is wrong vs. official rules

Official Rivals: after an event resolves it is **placed at the bottom of the event stack** — the
sim (`s.eventDeck.push(id)`) and `drawEvent` (`unshift`) both do "to bottom", which is broadly
correct for the ordinary cards. The exceptions are the THREE special cases:
1. **Yule** → reshuffle + reseat (handled in both, but `seatYule` diverges).
2. **Barbarian Attack** → under the top 4 (NOT handled anywhere).
3. **Insurrection** → under the top 4 (NOT handled anywhere).

---

## Proposed design — a generic "reseat into top N after resolving" mechanic

Make reseat behaviour data-driven instead of hard-coded per id.

1. **Data**: add an optional field to each event card in `cards.json`, e.g.
   `"reseat": { "mode": "underTopN", "n": 4 }` for Barbarian Attack + Insurrection;
   `"reseat": { "mode": "yule" }` for Yule; default (absent) = `"bottom"`.
   This captures the rule on the card, where it belongs, and is trust-based-engine-friendly
   (deterministic, no hidden RNG except Yule's reshuffle which is already seeded).

2. **Single helper** `reseatEvent(deck: string[], id: string, mode, n, rng?)`:
   - `bottom` → `deck.unshift(id)` (front = bottom under the pop()/end=top convention).
   - `underTopN` → with end=top: insert at index `deck.length - n` (so n cards remain above it);
     clamp to `[0, len]`. = "under the top N".
   - `yule` → `seatYule(shuffle(deck, rng))` using the ONE canonical `seatYule`.

3. **Wire into BOTH paths**:
   - `drawEvent` (actions.ts) — replace the `unshift`/Yule branch with `reseatEvent(...)`. Use the
     existing seeded `makeRng((s.seq+1) ^ …)` for the Yule reshuffle to keep online clients in
     sync. This fixes the human/sandbox path (the owner's actual complaint).
   - `drawAndResolveEvent` (events.ts) — replace `s.eventDeck.push(id)` + the local Yule branch
     with `reseatEvent(...)` seeded by `s.rng`.

4. **De-duplicate `seatYule`** — keep the actions.ts version (3 cards below Yule, matches
   `newGame` + official rule); have events.ts import it. Delete the diverging copy.

5. **Tests** (`event.test.ts`, currently only 2 tests):
   - Yule has exactly 3 cards below it after `newGame`, after `drawEvent` on Yule, and after the
     sim reshuffle.
   - After resolving Barbarian Attack / Insurrection, the card sits with exactly 4 cards above it
     (under the top 4), drawing from the top.
   - Ordinary events go to the bottom.
   - Determinism: same seed → same deck order on both the actions and sim paths.

---

## Verified facts (provenance)

- 28 event cards enumerated from `src/data/cards.json` (`category == 'event'`). Counts/ids/sets in
  the table above are from that file.
- No `eventDeck` reference in `src/ui/` (grep, empty). No event browser exists.
- `drawEvent` applies no effect and cycles every non-Yule card to the bottom: actions.ts 804–820.
- Sim `resolveEventCard` handles only base/gold/turmoil/progress families; all intrigue, merchants,
  barbarians, explorers, sages, prosperity events fall through to `default: no-op` — events.ts.
- Two diverging `seatYule`: actions.ts 18–22 (insert idx 3) vs events.ts 17–22 (insert idx len-3).
- Yule official placement (3 cards below it) — catan.com rules via WebSearch.
- Barbarian Attack / Insurrection "under the top 4" — card rules_text in cards.json + the
  prosperity.md / barbarians.md "special rule for returning … to the event card stack" lines.
