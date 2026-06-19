# Catan Duel — Adversarial Logic / Edge-Case Bug Hunt (2026-06-19)

Scope: semantic correctness the fuzz can't see + the new features (face-up supply,
building-site capacity, stack manipulation, VP/victory, sync/merge, turn flow, UI).
Baseline: 139 tests green. All findings below were reproduced against the live engine.

Severity: **P0** breaks a game / corrupts shared invariant · **P1** wrong-but-recoverable · **P2** cosmetic/latent.

---

## P0 / P1 — confirmed real bugs

### BUG-1 (P1) — `supply` over-returns past `copies`; the "placed + supply == copies" invariant is destroyable
`actions.ts:242` `returnToSupply` does `supply[cardId] + 1` with **no clamp** to the card's `copies`.
Because the engine is a trust sandbox, a player can over-build a face-up expansion (build 5 of a
2-copy Merchant Guild — supply floors at 0 thanks to `takeFromSupply`'s `Math.max(0, …)`), then
remove them all → supply climbs to **5** for a card with only 2 copies.

Repro:
```
newGame({enabledSets:['gold']})                       // supply['gold-merchant-guild'] = 2
playCard FE ×5 (pay:false)                             // supply -> 0  (floored)
removePlaced the 5 placed copies                       // supply -> 5  ← BUG (expected ≤ 2)
```
Wrong: `supply['gold-merchant-guild'] = 5`. Expected: clamped to `copies` (2). The BuildSupply bar then
shows "5 left" and lets you build 5 more — the limited public pile is no longer limited.
Fix: `returnToSupply` should clamp: `Math.min(copies, supply[cardId] + 1)` (read `getCard(id).copies`).
`takeFromSupply` already floors at 0; mirror that on the ceiling.

### BUG-2 (P1) — Granting / replaying a face-up expansion silently mints extra copies (supply accounting is one-directional)
The supply is only decremented in **`playCard`** (`actions.ts:600`). Several other paths put a face-up
expansion into a player's hand or move it around WITHOUT decrementing, so the same physical card can be
duplicated relative to the supply counter:

- **`grantCard` (`actions.ts:815`)** pushes ANY cardId to hand with no `takeFromSupply`. Grant a
  Merchant Guild (supply stays 2), then `playCard` it → supply 1 but two real copies now exist (the
  granted one + you can still build 2 from the bar = 3 total of a 2-copy card).
- **`returnToHand` (`actions.ts:604`)** of a placed face-up does NOT `returnToSupply`. Build it
  (supply 1), return to hand (supply still 1), play it again → supply 0 with only **one** copy in play.
  Net: a permanent miscount; the bar shows fewer copies than physically exist.
- **`discardToStack` (`actions.ts:619`)** tucks a hand face-up UNDER a face-down draw stack. Now the
  face-up expansion lives in `drawStacks` — exactly what `buildDrawDeck`/the supply design forbids
  (`newGame.ts:13` excludes them). A later `drawToHand`/`takeFromStack` re-draws it; supply untouched.

Repro (mint extra):
```
grantCard p0 'gold-merchant-guild'        // supply 2 (no decrement)
playCard p0 'gold-merchant-guild'         // supply 1, but +1 already in hand-lineage → 3 reachable
```
Repro (drift low):
```
playCard FE (supply 1) → returnToHand (supply 1) → playCard FE again (supply 0)  // only 1 in play
```
Fix direction: centralise supply lifecycle. Decrement when a face-up LEAVES the supply into a
hand/board (also in `grantCard`, and don't allow `discardToStack`/`putToStack` of a face-up — route it
to `returnToSupply` instead), and increment on EVERY leave-play path (`returnToHand` of a placed face-up
should return it to supply, not hand). Simplest robust fix: make supply a pure function of
`copies − (placed copies across both players) − (hand copies)` recomputed in `finalize`, instead of
incremental ± that drifts. That also fixes BUG-1 and BUG-4 in one move.

### BUG-3 (P0 for the new supply feature, online) — `mergeSnapshots` double-counts / loses supply decrements under concurrent face-up builds
`supply` is a SHARED zone, so `mergeSnapshots` takes it whole from ONE lineage (`base`, chosen by global
`seq`, `actions.ts:365`). But the *placed* cards are merged **per-seat** (seat-authority). When each
client builds a DIFFERENT face-up on its own seat in the same tick, both placements survive (correct)
but only ONE side's supply decrement survives → the other face-up is in play yet its supply counter is
untouched.

Repro (both start from the same base, seq ties → stableGt tiebreak picks aSide's supply whole):
```
base = newGame({enabledSets:['gold','turmoil']})       // GM=2, HT=2
aSide = playCard p0 'gold-merchant-guild'              // aSide: GM=1, HT=2
bSide = playCard p1 'turmoil-hedge-tavern-1x'          // bSide: GM=2, HT=1
merge(aSide,bSide)  → supply GM=1, HT=2                // ← HT decrement LOST
                      p0.placed has GM  ✓
                      p1.placed has HT  ✓  (in play but supply still 2)
```
Wrong: HT supply = 2 while one HT is on p1's board (invariant placed+supply==copies broken across the
merge). Same merge can also DOUBLE-count if the lineages disagree the other way. Because supply is global
last-write-wins but the things that consume it are seat-local, the two can never stay consistent.
Fix: derive supply from board+hands in `finalize` (the merge already calls `finalize`), so after a merge
the counter is recomputed from the merged placements rather than carried from one lineage. This is the
single cleanest fix and it composes with seat-authority correctly.

### BUG-4 (P1) — `movePlaced` (and CardZoom/drag race) can over-stack a building site (2 cards in one slot)
`movePlaced` (`actions.ts:563`) only rewrites `pc.slot`; it never checks the target slot is empty. The
UI `Site.moveHere` guards with `occupied`, but the engine action is reachable and the guard is a stale
React closure — a drop that lands as an incoming snapshot fills the slot can still fire `movePlaced`
onto it. Result: two `base-marketplace` both at `s0-up`. `cardForSlot` (`PrincipalityBoard.tsx:63`) uses
`.find`, so only the first renders; the second is an invisible orphan that still counts toward VP/stats
and can't be clicked off.

Repro:
```
playCard A slot s0-up ; playCard B slot s0-down
movePlaced(B → 's0-up')      // engine accepts; 2 cards now claim s0-up
```
Wrong: `placed.filter(p=>p.slot==='s0-up').length === 2`. Expected: reject (return `s`) when the slot is
occupied, OR the official 1-card-per-site capacity should be enforced in `movePlaced`/`playCard`.
Fix: in `movePlaced` and the `playCard` site path, no-op if another placed card already holds `slot`.

### BUG-5 (P1) — StackBrowser "Search" spends resources with NO refund on cancel/close
`StackBrowser.tsx:41` `pay()` dispatches a real `addResource −1` immediately. `cancelSearch` (`:40`) and
the dialog `close`/scrim/✕ only reset the local `paid`/`search` React state — they never refund. A player
who pays 1 (of the 2-cost search) then changes their mind, OR closes the modal, OR whose dialog is closed
by an incoming snapshot, **permanently loses** the paid resource(s) without taking a card.
Repro: open stack browser → Search → click one resource (−1) → Cancel search (or ✕). That resource is
gone; no card taken. Expected: pay only commits when a card is actually taken, or cancel refunds.
Fix: don't dispatch on each click; accumulate a local "to-pay" selection and dispatch the spend ATOMICALLY
inside `take()` (right before `takeFromStack`). On cancel, nothing was spent. Also makes the
take+spend+reshuffle one logical, sync-safe step.

---

## P2 — latent / cosmetic (real, but low impact)

### BUG-6 (P2) — `buildPiece end:'left'` creates duplicate `settle-0` slots
`actions.ts:509-518`: the left-prepend regex shifts building-site slots (`s\d+-up`) and road slots
(`road-\d+`), but NOT the spine `settle-N` slots. Prepending a new `settle-0` leaves the old `settle-0`
in place → two placed cards both labelled `settle-0` (`settle slots: [settle-0, settle-0, settle-1]`).
Today this is harmless because the UI renders seats by ARRAY ORDER (`seats.map((s,j))` + `seatCol(j)`),
and `upgradeCity` indexes by order too — the `settle-N` string is decorative. Flagging because the
collision is a trap for any future code that keys off the settle slot name.
Fix: either drop the `settle-N` slot string entirely (it's unused) or shift it in the left-prepend like
the others.

---

## Areas checked and found CORRECT (no bug)

- **`applyProduction` (`actions.ts:385`)**: empty landscape slots have `number: null`, never match
  `r.number === n`, and the cap is `Math.min(3, …)`. No over-fill, no empty-slot bump. Correct.
- **Winner stickiness / eligibility freshness**: `finalize` re-derives `eligible` every time (clears on
  undo/threshold-raise/VP-removal), while `winner` + `phase:'gameover'` are set ONLY via the
  claim→agree vote and stay set after later VP changes — exactly the intended sticky-winner,
  non-sticky-eligible behavior. `agreeVictory` correctly requires the *opponent* (`actions.ts:864`).
- **`mergeSnapshots` commutativity**: every tiebreak is `stableGt` (JSON compare) → `merge(a,b)===merge(b,a)`;
  the rebroadcast `contributed` check excludes log length, so no ping-pong. Sound as a join for
  per-seat + global-seq state. (The supply problem above is specifically that supply is the wrong KIND
  of shared state — it must be derived, not carried.)
- **`takeFromStack` / `drawFromDiscard` bounds**: index guards (`idx<0||idx>=length`, empty-stack
  early-returns, `lastIndexOf`) are all present; no out-of-range. `position` vs `cardId` precedence is
  cardId-first then position then top — consistent.
- **`grantCard` with bad `fromStack`/missing card**: safely no-ops the stack removal and still grants;
  no crash, no NaN.
- **`shuffleStack` / Yule reshuffle / event cycling**: seeded by `seq` → deterministic and identical on
  both online clients. Yule re-seating uses `Math.min(…, len)` bound. Correct.
- **`endTurn`**: resets `usedThisTurn` for BOTH seats, flips active, clears `lastRoll`, bumps turn.
  Correct.
- **`transferResource` to/from `bank`**: bank legs are skipped, player legs clamp 0..3 via
  `distributeResource`. No underflow/overflow leak (overflow silently dropped per the trust design).
- **`resolveBrigand`**: only zeroes gold+wool for players strictly over 7, logs precisely, no-ops when
  nobody qualifies. Correct.

---

## Recommended fix priority
1. **BUG-3 + BUG-1 + BUG-2 + BUG-4** are all the same root cause family (incremental supply counter that
   drifts, and unenforced site capacity). Replace the incremental supply ± with a **derived** supply
   recomputed in `finalize` from `copies − placed − hand` across both seats, and reject occupied-slot
   placement in `movePlaced`/`playCard`. One refactor closes four findings and makes the online merge
   correct by construction.
2. **BUG-5** (resource loss on search cancel) — make pay atomic with take.
3. **BUG-6** (cosmetic slot dup) — optional cleanup.
