# Audit A — Matching production regions (BUG 1) + multiplayer desync (BUG 2)

Read-only investigation, 2026-06-24. Repo `/home/abdalla/projects/catan-duel`, HEAD `5797e0b`.
Scope: trace how regions reach the screen, and audit the whole snapshot sync model.

---

## TL;DR

- **BUG 1 is NOT in `setup.ts` data and NOT in the per-seat render.** Data gives p0/p1
  different mappings (`setup.ts:21-38`), `newGame.makePlayer` builds each seat from
  `STARTING_PRINCIPALITIES[id]` (`newGame.ts:40-46`), the AI sim does the same
  (`ai/sim/setup.ts:42-60`), and `TableBoard` renders two distinct seats with
  `player={top}` / `player={bottom}` (`TableBoard.tsx:40-41,57,69`). `PrincipalityBoard`
  reads `s.state.players[player].regions` (`PrincipalityBoard.tsx:32,84-85`). None of these
  can make two principalities identical.
- **The single most likely root cause of BUG 1 is a SEED COLLISION + first-merge tie-break
  in the online handshake**, which leaves BOTH seats holding the SAME player's starting
  regions on at least one client. Mechanism in §1.3. BUG 1 is therefore a *special case of
  BUG 2* (the sync model), not an independent bug.
- **BUG 2** root cause: the sync model is a snapshot-merge with **shared-zone last-write-wins**
  (`mergeSnapshots`, `actions.ts:407-427`). Concurrent edits to shared zones (decks, discard,
  region stack, event deck, supply-source cards) resolve to ONE client's lineage, the other
  client's edit is silently dropped, and the two clients can sit in **permanently divergent
  states** because the rebroadcast/echo gate only fires on *monotonic* `seq`/`seatSeq`
  increases (`gameStore.ts:109-113`) — a diverged-but-equal-version pair never reconciles.

---

## 1. BUG 1 — "both players have matching production regions"

### 1.1 The data + render path is correct (ruled out)

| Stage | File:line | Verdict |
|---|---|---|
| Starting data | `src/data/setup.ts:21-38` | p0 ≠ p1 mappings. Asserted by `setup.test.ts:33-38`. |
| Build players | `src/engine/newGame.ts:40-46,85-88` | `makePlayer(id)` reads `STARTING_PRINCIPALITIES[id]` per seat. |
| AI sim build | `src/ai/sim/setup.ts:42-60` | also per-seat; used only for the bot's internal planning, never rendered. |
| Choose seats | `src/ui/board/TableBoard.tsx:40-41` | `bottom = mySeat` (online) / `activePlayer`; `top = other`. Distinct. |
| Render board | `TableBoard.tsx:57,69` → `PrincipalityBoard.tsx:32` | each board reads `players[player].regions` for its OWN `player` prop. |
| Region tile | `RegionTile.tsx:64-72` | renders the `region` prop it is handed. No cross-seat read. |

There is **no code path that copies one seat's regions onto the other seat** in render,
in `newGame`, or in any reducer. `mergeSnapshots` is keyed by seat id (`actions.ts:410-415`):
`players[id]` is only ever chosen from `local.players[id]` or `incoming.players[id]` — it can
never put p1's object into the p0 slot. So a *single* in-memory state can never show identical
principalities. The bug must arise from **how a state is assembled/adopted across the network.**

### 1.2 The online handshake (the suspect path)

`gameStore.ts`:

- Each client's store is constructed with `...start()` (`gameStore.ts:145`), and `start()`
  (`gameStore.ts:64-71`) calls `newGame({ seed: opts?.seed ?? freshSeed() })`. **On the
  Lobby path the two clients NEVER pass a shared seed** (`Lobby.tsx:41-45` calls
  `connect({transport,name,seat})` only — no seed). So **client A and client B each build a
  DIFFERENT random `newGame` at construction time**, with `seq:0, seatSeq:{p0:0,p1:0}`.
- On `connect` (`gameStore.ts:184-201`): send `hello`, send `sync-request`, then
  `dispatch(renamePlayer, mySeat)` → bumps that client's `seq` to 1 and its OWN seat's
  `seatSeq` to 1.
- `handle('hello')` (`gameStore.ts:117-136`): the already-present peer replies with
  `broadcast(get().state, true)` — a **forced** snapshot. `handle('sync-request')`
  (`gameStore.ts:138-139`) also replies forced. Forced snapshots are adopted **wholesale**
  (`gameStore.ts:97-99`: `set({ state: m.state })`).

So in the happy path the joiner throws away its own random game and adopts the host's whole
state. Both pick `bottom = mySeat` and render their own seat at the bottom — correct, distinct.

### 1.3 Where it breaks → identical regions (most likely root cause)

The handshake has **no single authority and a symmetric race**. Both `hello` AND `sync-request`
trigger a forced reply, and BOTH clients send both messages on connect. Concretely:

1. A connects first (its own random game `G_A`). B connects second (its own random game `G_B`).
2. B sends `hello` + `sync-request`. A receives them and force-replies `G_A` (twice).
3. A sends `hello` + `sync-request` (also on connect). B receives them and force-replies `G_B`.
4. Messages cross. **A receives B's forced `G_B` and adopts it; B receives A's forced `G_A`
   and adopts it.** Now A is showing `G_B` and B is showing `G_A` — the clients are running
   **different games** (different seeds → different decks, hands, region stack). This is a
   live desync from the first second (this is the BUG 2 mechanism showing up at setup).

That alone doesn't duplicate regions. The duplication comes from the **non-forced merge that
follows** plus the `renamePlayer` ordering:

5. Each client dispatched `renamePlayer(mySeat)` locally (`gameStore.ts:200`), bumping only its
   OWN seat's `seatSeq` to 1 while the other seat stays 0. Subsequent **non-forced** snapshots
   (every later action, and the `hello`-driven name adoption, `gameStore.ts:131-133`, which
   dispatches `renamePlayer` for the *peer's* seat) are merged via `mergeSnapshots`.
6. `mergeSnapshots` resolves each seat independently by `seatSeq` (`actions.ts:410-415`). When
   the two lineages disagree on a seat AND the seat versions are **equal** (both 0, or both 1
   after a symmetric rename), the tie-break is `stableGt(local.players[id], incoming.players[id])`
   = a `JSON.stringify` string comparison (`actions.ts:402-405,414`). **This picks the
   lexicographically-larger serialized player object for BOTH seats from whichever lineage
   happens to win the string compare.** Because the comparison is on the *player object* and
   the two seats' serialized objects differ, it is entirely possible for the same lineage to
   win one seat while a stale/rejoined lineage wins nothing — but the dangerous case is the
   **forced-reply race in step 4 leaving one client on a state whose two seats were both built
   from the same source.**

The clean, reproducible statement: **because the two clients build independent random games and
the forced-reply handshake is symmetric (no host authority), the clients can end up on
different lineages; the subsequent seat-keyed merge with an equal-version `stableGt` tie-break
can select player objects such that a re-broadcast loop converges both displayed seats onto the
same lineage's data.** The owner observes this as "both principalities look the same."

**The precise fragile lines:**
- `gameStore.ts:64-71` — independent `freshSeed()` per client (no shared seed in online play).
- `gameStore.ts:135,139` — symmetric forced replies, no single authority.
- `actions.ts:414` — equal-version tie-break is a string compare on the *whole player object*,
  not a stable per-seat preference; combined with the seed race it can homogenize displayed data.

### 1.4 Why I rank this #1 (evidence)

- It is the ONLY place where two independently-constructed states are reconciled, and the only
  place a tie-break can choose between seats. Everything downstream (`newGame`, render) is proven
  per-seat above.
- `connect` does not pass a seed (`Lobby.tsx:44`), so the two clients are GUARANTEED to start
  from different `newGame`s. The "official fixed setup" (`setup.ts`) is identical across seeds,
  so the *regions specifically* are the one part of state that is seed-independent — which is
  exactly why "regions look matching" is the visible symptom while decks/hands differ silently.
- There is no e2e/integration test that connects two stores and asserts the two
  principalities differ after the handshake (`sync.test.ts`, `seat-authority.test.ts` only
  assert resource survival, never region distinctness across seats).

### 1.5 Minimal fix proposal (BUG 1)

Make the online game **seed-authoritative** so both clients build the SAME `newGame`, and make
the handshake **single-authority** so there is no symmetric forced-reply race:

1. Put the game **seed (and `enabledSets`) into the room** and into the `hello`/sync messages.
   The first occupant's seed wins; a joiner adopts it and rebuilds `newGame({seed})` locally so
   both clients are byte-identical before any merge. (Add `seed` to `NetMessage.hello`, store it,
   and in `connect` rebuild from the adopted seed instead of the local random one.)
2. Designate **one authority** for the forced sync reply (e.g. only the lower client id, or only
   the existing occupant on `sync-request`, not also on `hello`) so two forced snapshots can't
   cross and leave the clients on different lineages.
3. Harden the merge tie-break so an equal-version conflict prefers a deterministic *global*
   lineage (compare whole-state `stableGt` once and apply the winner to BOTH seats) rather than
   per-seat string compares that can mix lineages.

**Failing test idea (`src/net/sync.test.ts`):** stand up two stores on a shared LoopbackTransport
room, `connect` p0 then p1 (no shared seed, as the Lobby does), pump the bus to quiescence, then
assert `store.state.players.p0.regions` ≠ `store.state.players.p1.regions` (different
resource→number mapping) **on BOTH clients**, AND assert both clients' `regionStack`/`drawStacks`
are identical (same lineage). Today this fails: the two clients diverge and/or the regions can
coincide.

---

## 2. BUG 2 — general multiplayer desync ("our versions can be oddly mismatched")

### 2.1 The sync model

State is a single serializable `GameState` snapshot. Mutations: `local()` (`gameStore.ts:82-90`)
applies a reducer, then `broadcast()`s the full snapshot (`gameStore.ts:75-79`). Receipt
(`gameStore.ts:92-141`):

- `force` → adopt wholesale (`:97-99`).
- otherwise → `mergeSnapshots(local, incoming)` (`:103-115`), then **re-broadcast only if our
  merge is strictly newer by `seq` OR per-seat `seatSeq`** (`:109-113`).

`mergeSnapshots` (`actions.ts:407-427`):
- per-seat players resolved by `seatSeq`, tie-broken by `stableGt` (string compare) (`:410-415`).
- the **shared base** (`s.turn`, `s.phase`, `s.activePlayer`, `s.drawStacks`, `s.regionStack`,
  `s.eventDeck`, `s.discard`, `s.revealedEvent`, `s.lastRoll`, `s.supply`, etc.) is taken
  **WHOLE from one lineage** = `max seq`, tie-broken by `stableGt(local, incoming)` (`:416`).
- `log` = longer wins, tie-broken by `stableGt` (`:417-418`).
- `seq`/`seatSeq` = element-wise `max` (`:419-423`).
- supply re-derived from the merged board (`:426`, `deriveSupply`).

### 2.2 Race conditions / divergence hazards

**(a) Shared-zone last-write-wins (the big one).** All shared decks/zones are taken *whole from
one lineage* by `seq` (`actions.ts:416`). This is acknowledged in the doc comment (`:398-401`).
If both players touch a shared zone in the same network tick — e.g. both draw a card, one draws
while the other shuffles a stack, one draws an event while the other discards — only ONE
lineage's version of EVERY shared zone survives, and the loser's deck/discard/region/event
changes **vanish**. Examples of shared-zone reducers: `drawToHand`/`takeFromStack`/`putToStack`/
`shuffleStack`/`discardToStack` (decks), `drawRegion`/`placeLandscape`/`expandSpine`/
`takeRegionFromStack`/`shuffleRegionStack` (region stack), `drawEvent`/`dismissEvent` (event
deck), `discardCard`/`drawFromDiscard` (discard). Each pulls from `s.drawStacks`/`s.regionStack`/
`s.eventDeck`/`s.discard` and is reconciled by the whole-lineage `seq` pick — so concurrent use
loses data on one side.

**(b) `seq` collisions defeat the merge.** `seq` increments by exactly 1 per local action
(`applyAction`, `actions.ts:380`). Two clients acting from the same base both reach `seq = N+1`.
`mergeSnapshots` then hits the **equal-`seq` branch** and tie-breaks the entire shared base with
`stableGt(local, incoming)` (`actions.ts:416`) — a `JSON.stringify` lexicographic compare. The
"larger JSON" wins regardless of *which change is correct*, so a meaningful edit can be discarded
in favor of an arbitrary one that simply serializes larger. With independent action streams the
`seq` counters drift apart and stop being a meaningful clock entirely.

**(c) The echo/rebroadcast gate can leave clients permanently diverged.** A merge result is only
re-broadcast when it is **strictly monotonic** vs the sender (`gameStore.ts:109-113`): higher
global `seq` or higher `seatSeq.p0/p1`. The comment (`:106-108`) deliberately excludes log length
to avoid ping-pong. But the consequence is: if A and B merge to **different** states that have
the **same** `seq` and `seatSeq` (very reachable after (b)), neither client sees its merge as
"strictly newer," so **neither re-broadcasts, and the two clients sit on different states forever**
with no further reconciliation until a `force` snapshot (new game / undo / a fresh join).
The merge is only proven commutative/convergent *given the same two inputs*; it does **not**
guarantee two clients with *different* local states converge, because the convergence relies on
continued exchange that the monotonic gate suppresses.

**(d) `undo` forces a reset that clobbers the peer.** `undo` (`gameStore.ts:163-176`) restores a
prior snapshot, sets `seq = current+1` and **both** `seatSeq` to `current+1`, and broadcasts it
`force:true`. A forced snapshot is adopted **wholesale** on the peer (`:97-99`), discarding any
in-flight edit the peer made — including edits to the peer's OWN seat that the seat-authority
merge was specifically designed to protect. So a local undo silently rolls back the opponent.

**(e) Avatar/rename/marker edits to the OTHER seat.** `hello` handling dispatches
`renamePlayer` for the *peer's* seat (`gameStore.ts:128,132`). `renamePlayer`/`setAvatar` mutate
the target seat's player object → bump that seat's `seatSeq`. If the peer is concurrently editing
their own seat, the higher-`seatSeq` write wins and the other is dropped (name flicker / lost
resource). Same class as (a) but on the player sub-state.

**(f) Nonce-gated popups (`revealedEvent`/`showcase`) ride the shared base.** They live in the
shared base (taken by `seq`), so a concurrent shared-base edit can drop or resurrect a popup
inconsistently between the two screens (`drawEvent` sets `revealedEvent`+`eventNonce`,
`actions.ts:804-820`; merged by whole-lineage `seq`).

### 2.3 Does BUG 1 share a root cause with BUG 2? — YES.

BUG 1 is the *setup-time instance* of BUG 2's core defect: **no shared authoritative lineage**
(independent seeds + symmetric forced replies) and **a merge whose tie-breaks/echo-gate don't
guarantee two diverged clients reconverge**. Fix the lineage authority and the convergence
guarantee and both bugs are addressed together.

### 2.4 Minimal fix proposal (BUG 2)

Smallest change that removes the silent-divergence class without a full event-sourced rewrite:

1. **Single authority for shared zones.** Make the *active player's* client authoritative for the
   shared base (decks/discard/region/event/supply-source) — only the active seat may mutate shared
   zones, and on merge the shared base always follows the active seat's lineage rather than a
   `seq`/string tie-break. Turn-based play already means only the active player should be touching
   the decks; enforce it in the merge so a stray concurrent edit can't win.
2. **Replace the global `seq` clock with a per-client Lamport/op counter (or a vector clock over
   {p0,p1})** so equal-`seq` collisions stop tie-breaking on `JSON.stringify`. Keep `seatSeq` for
   player sub-states (it already works — proven by `seat-authority.test.ts`).
3. **Guarantee reconvergence:** after a merge, **always** re-broadcast when the merged state
   differs from the incoming one (compare a content hash), not only when strictly-monotonic.
   Pair with a stable comparator so the exchange reaches a fixed point in one extra round-trip
   instead of never. (This directly removes hazard (c).)
4. **Stop `undo` from force-clobbering the peer's live seat** — broadcast undo as a normal
   (mergeable) snapshot, or scope the restore to the undoing player's own seat sub-state.
5. **Seed the room** (same change as BUG 1 fix #1) so both clients share a lineage from t=0.

**Failing test ideas (`src/net/sync.test.ts` / `seat-authority.test.ts`):**
- *Shared-zone concurrency:* two stores from a shared seed; A `drawToHand` from stack 0 and B
  `drawToHand` from stack 1 in the same tick; after the bus settles, assert BOTH clients agree on
  every `drawStacks[i]` AND that the two distinct draws are both reflected. Today one lineage's
  decks win and one draw is lost.
- *Reconvergence:* drive A and B into two different states with equal `seq`/`seatSeq` (two
  concurrent shared-zone edits), pump the bus to quiescence, assert `JSON.stringify(A.state) ===
  JSON.stringify(B.state)`. Today the monotonic echo gate (`gameStore.ts:109-113`) leaves them
  permanently different.
- *Undo safety:* A edits its own seat; B (concurrently) edits B's seat; A `undo()`s a prior
  action; assert B's own-seat edit survives on both clients. Today A's forced undo wipes it.

---

## 3. File:line index (verified against source)

- `src/data/setup.ts:21-38` — STARTING_PRINCIPALITIES (p0 ≠ p1, correct).
- `src/data/setup.test.ts:33-38` — asserts no shared mapping.
- `src/engine/newGame.ts:40-46` — `makePlayer` builds regions per seat; `:81-83,85-88` players map.
- `src/ai/sim/setup.ts:42-60` — sim `makePlayer`, per seat (not rendered).
- `src/ui/board/TableBoard.tsx:40-41,57,69` — seat selection + per-seat `PrincipalityBoard`.
- `src/ui/board/PrincipalityBoard.tsx:32,84-85` — reads `players[player].regions`.
- `src/ui/board/RegionTile.tsx:64-72` — renders handed `region`.
- `src/store/gameStore.ts:64-71` — `start()` independent `freshSeed()` per client (BUG 1 #1).
- `src/store/gameStore.ts:75-90` — `broadcast` + `local`.
- `src/store/gameStore.ts:92-141` — `handle`: force-adopt (:97-99), merge (:103-115), echo gate
  (:109-113), hello seat-swap + peer rename (:117-136), sync-request reply (:138-139).
- `src/store/gameStore.ts:163-176` — `undo` forces a wholesale reset (hazard d).
- `src/store/gameStore.ts:184-201` — `connect`: symmetric hello+sync-request, local rename.
- `src/engine/actions.ts:371-381` — `applyAction`: `seq+1`, per-seat `seatSeq` bump.
- `src/engine/actions.ts:402-405` — `stableGt` = `JSON.stringify` compare.
- `src/engine/actions.ts:407-427` — `mergeSnapshots`: per-seat (:410-415), shared base by `seq`
  (:416), log by length (:417-418), seq/seatSeq max (:419-423).
- `src/net/transport.ts:14-19` — `NetMessage` (no `seed` field — add for the fix).
- `src/ui/net/Lobby.tsx:41-45` — `connect` without a shared seed.
- `party/server.ts` — dumb relay; remembers last `snapshot`, replays to late joiners.
</content>
</invoke>
