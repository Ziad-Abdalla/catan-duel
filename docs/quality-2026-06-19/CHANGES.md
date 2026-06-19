# Quality marathon — changes shipped (2026-06-19)

Driven by the audits in this folder (see INDEX.md). Each batch verified (tsc + tests + e2e).

## Q1 — Face-up Expansion supply (P0: used buildings stayed in the public pile) ✅
- Face-up Expansions (Merchant Guild, Hedge Tavern, University) no longer seeded into draw stacks
  (`newGame.ts buildDrawDeck` skips `tag: 'Face-up Expansion'`).
- New `supply: Record<string,number>` on GameState (id → copies left), built by `buildSupply`.
- `playCard` spends from the supply (`takeFromSupply`); `removePlaced`/`discardCard` return it (`returnToSupply`).
- `BuildSupply.tsx` shows remaining count and disables a depleted expansion.
- Tests: `src/engine/supply.test.ts` (8) + a supply invariant added to the fuzz. **Building one now truly removes it from the public supply; no duplication.**

## Q2 — Art consistency ✅
- Dropped `base-city` from `FOUNDATION_ART` → the city renders the clean hand-drawn SVG (the low-res
  `city.webp` is no longer used; drop an official scan there to switch back to a photo).
- `BuildSupply` now renders pieces via `PieceArt` so the supply matches the board (was CenterArt SVG).
- The player-colour ring now covers the SVG city too (`.pb-seat .ctr`).

## Q3 — Thematic sound system ✅
- Synth voices added (no asset files): `build, coin, vp, turn, deny, water, menace, hero, harvest, festival, magic`.
- New `src/audio/cardSound.ts`: `cardSfx(id)` picks a cue by card category/keywords (ship→water,
  pirate/brigand→menace, hero→flourish, festival, invention→magic, harvest, gold/trade→coin); `eventSfx(face)`.
- Wired: card plays → `cardSfx`; structural builds → `build`; paid plays → `coin`; VP gain → `vp` (plate);
  endTurn → `turn`; resource ±/transfer → `coin`; new `DiceEventCue` plays the event-die face cue on settle;
  BrigandSequence is now purely visual (audio owned by DiceEventCue).

## Q5 — Dead code removed ✅
- Deleted the unused `Board / Principality / HandView / MiniCard / CenterColumn / PlayerHeader` subtree
  (root `Board` was imported by nothing) — also removes the soundless duplicate endTurn/VP paths.

## Q4 — HUD declutter ✅
- Sets / Win-target / Theme folded into one **⚙ Setup popover** (with a "starts a new game" hint on the
  sets, guarding the one-click reset footgun). Main bar = title · Setup · Pay · Log · mute · New · mode tabs.
- Pay toggle gained `aria-pressed`.

## Logic-bug-hunt fixes (see 04-logic-bug-hunt.md) ✅
- **BUG-1/2/3 (supply drift, incl. P0 online merge):** rewrote supply as **DERIVED from the board**
  (`deriveSupply` in `applyAction` + `mergeSnapshots`) = copies − every copy in play/hand/stacks/discard.
  Correct after any action AND any merge by construction; can't exceed copies, drift, or be lost online.
  Regression tests: over-build clamp + concurrent-build merge.
- **BUG-4 (movePlaced onto an occupied site):** guarded — a site holds one card; move is a no-op if taken.
  Regression test added.
- **BUG-5 (search pay not refunded):** StackBrowser now tracks paid resources and refunds them on
  cancel / close-without-take (consumed only when a card is actually taken).
- **BUG-6 (left-prepend didn't shift `settle-N`):** now shifts seat slots too (was latent/cosmetic).

## Pending
- Q4 HUD declutter (setup popover) · Q6 polish tail (a11y, blank cards) · creative (cursor, resource
  theming, ambient music, animations) · asset-download HTML · Radmin guide · logic-bug-hunt fixes (04) · final push.
