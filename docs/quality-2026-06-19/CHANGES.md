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

## Creative + polish ✅
- **Thematic sound system** (Q3, above) + **ambient background music** hook (`public/ambient.mp3`, drop-in,
  ⚙ Setup → Music, yields to mute) + drop-in victory track.
- **Event-die flourishes:** brief per-face particle burst on roll settle (trade/celebration/harvest/event-card;
  brigand keeps its cinematic) — non-blocking, reduced-motion aware.
- **Tactile cursors:** grab/grabbing on every pickup-able piece.
- **Asset guide** `ASSETS.html` (curated CC0/royalty-free music/sfx/texture/city-art download links → exact slots).
- **Online play:** `PLAY-ONLINE.html` — dead-simple, safe Radmin guide for host + friend + teardown; one-click
- Fixed RADMIN-ONLINE/OFFLINE.ps1: run non-elevated + write .env via wsl.exe + elevate only the firewall/bridge inline (the old self-elevate-then-write-to-\wsl path would fail in practice).
  `RADMIN-ONLINE.ps1` / `RADMIN-OFFLINE.ps1`.

## Final verification ✅
- tsc clean · 142 unit/fuzz tests · prod build OK · e2e (action-coverage + random-orders + ui-flows) 0 console errors
  · visual sweep across gold/turmoil/progress (one-screen fit, themed felt, clean city, supply counts) 0 errors.
- e2e ui-flows updated for the new ⚙ Setup popover.

## Audio system (music + SFX) ✅
- **Centralised, persisted audio prefs** (`src/audio/prefs.ts`): master mute + SFX volume + music
  on/off + music volume. Everything ON by default; lower or mute from ⚙ Setup → Sound (Effects + Music
  sliders) or the quick mute button. SFX route through a master gain so the volume is live.
- **Background music = a shuffled PLAYLIST** of 4 bundled CC0 medieval tracks (`public/audio/bgm-*.mp3`)
  that cycle and reshuffle each lap — variety, never a repetitive loop. Starts on first interaction
  (autoplay policy), yields to mute, volume live. Victory track `public/audio/victory.mp3` + synth fallback.
  All CC0 1.0 (public domain) from archive.org — safe to commit/share.
- **Per-card/per-event thematic SFX** (`cardSfx`/`eventSfx`): buildings→build, ships→water, heroes→hero,
  attacks/brigands→menace, trade/gold→coin, festivals→festival, inventions→magic, harvest→harvest, and
  **action cards→a short parchment chime**.
- **No layering** — strictly one sound per action (removed coin+thunk doubling on paid plays; VP chime now
  only on the manual ± buttons, so a build no longer fires build+VP together).
- **Every event face has an effect** (sound + animation), via a unified `eventFx` trigger fired both when
  the dice settle AND when a **card forces** that event (a "Play effect" button in the resolution panel;
  Brigand keeps its cinematic). Verified: card-forced Brigand cinematic plays with no dice roll.
- **Tested** (`e2e/audio.spec.ts`): playlist starts on gesture, all SFX-producing actions fire with 0
  errors, volume/on-off controls take effect. Cursors: grab/grabbing on pickup-able pieces (earlier).

## Owner hub ✅
- Created `C:\Projects\catan-duel\` (owner hub + repo pointer) matching the other projects, with the
  online-play guide, asset guide, and current-state overview; added to the top `C:\Projects` index.

## Status: COMPLETE — shipped to master.

## (earlier) Pending
- Q4 HUD declutter (setup popover) · Q6 polish tail (a11y, blank cards) · creative (cursor, resource
  theming, ambient music, animations) · asset-download HTML · Radmin guide · logic-bug-hunt fixes (04) · final push.
