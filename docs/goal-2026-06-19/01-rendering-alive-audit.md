# Rendering / "alive" audit — why the owner doesn't see the background & juice

Lens: trace every "juice / make-it-alive" feature from the mounted render tree
(`TableBoard`) and verify whether it is (a) mounted, (b) gated, and (c) actually
visible/audible in a **DEFAULT new hotseat game**. Read-only; no source changed.

## 0. What is actually mounted

- `src/App.tsx:30` renders **`TableBoard`** for hotseat (`mode === 'local'`).
- `TableBoard` (`src/ui/board/TableBoard.tsx`) is the live tree. It mounts:
  `Table` (felt + bg) → `TableHud`, `PrincipalityBoard` ×2, `PlayerPlate` ×2,
  `CentralWall`, `BuildSupply`, `Hand`, plus the overlay layers
  `FlightLayer`, `DiceLayer`, `CardZoom`, `ResolutionPanel`, `AuditLog`,
  `EventPopup`, `VictoryFlow`, `AdvantageAudio`, `BrigandSequence`, `TurnBanner`.
- **`Board.tsx`, `Principality.tsx`, `CenterColumn.tsx`, `MiniCard.tsx`,
  `PlayerHeader.tsx`, `HandView.tsx` are an OLD/alternate layout that is NEVER
  rendered.** Nothing imports `Board` except itself (`grep` confirms only
  `App.tsx → TableBoard`). This matters because **several "alive" CSS animations
  target only the old tree** (see §B-dead).

---

## A. THE BACKGROUND (the owner's #1 complaint)

### A.1 What sets the table background
- The felt surface is `.felt-scroll` and the atmosphere layer is `.felt-bg`,
  both created in `Table.tsx:24-30`. `.felt-bg` (`table.css:30-46`) paints a
  fixed radial gradient — the default **cool teal/blue room**
  (`#2b4255 → #15222e → #0a121a`). Inside it: 3 drifting `.felt-orb`s and a
  `.felt-motes` dust field (`table.css:48-76`).
- On top of that, each player's `.pmat` (`table.css:92-111`) has its OWN nearly
  opaque dark-teal radial gradient (`#1f4a4a → #0a1d1f`) plus
  `inset 0 0 140px rgba(0,0,0,.55)` and a big drop shadow.

### A.2 Is there a per-era background system? YES — and it works.
- `Table.tsx:6-10` `tableEra()` maps enabled non-base sets → an era class:
  1 set → that set, 2+ → `duel`, 0 → `base`. Applied as
  `felt-era-${era}` on `.felt-scroll` (`Table.tsx:24`).
- Per-era tints exist at `table.css:757-780`: `felt-era-gold` (warm amber),
  `felt-era-turmoil` (red), `felt-era-progress` (green), `felt-era-duel`
  (violet). These re-paint `.felt-bg` and its `::after` glow. **Implemented and
  wired correctly.**

### A.3 Why the owner never sees it change — ROOT CAUSE
- **Default game = `enabledSets: ['base']` only.** `newGame` always seeds
  `['base', ...enabledSets]` with `enabledSets` undefined by default
  (`newGame.ts:71`, `gameStore.ts:69`). A brand-new hotseat passes no eras.
- So `tableEra([])` → `'base'` → the felt stays the **default teal** forever
  **unless the user clicks an era chip** (Gold / Turmoil / Innovation) in the
  HUD. `TableHud.tsx:52` hard-codes only "Basic" as on; the era chips start off.
- The prompt's premise "ALL sets enabled" is **not the default** — the owner
  would have to toggle chips, and toggling one **starts a brand-new game**
  (`TableHud.tsx:40-45 toggleEra → newHotseat`). Most players never do this, so
  they conclude "the background never changes."
- Even when toggled, the change is **subtle**: only the radial wash + a faint
  top glow shift hue between dark desaturated colors. There is no big, obvious
  scene/parallax swap. Easy to miss.

### A.4 Why the ambient "alive" bg (orbs + motes) is barely visible — ROOT CAUSE
- `.felt-bg` is `z-index: 0` (`table.css:33`); `.ppane` is `z-index: 1`
  (`table.css:81`). Each pane is full-viewport height and holds a `.pmat` of
  `min(100%, 1320px)` width and `~full pane height` with an **opaque dark
  gradient + inset 140px shadow** (`table.css:103-110`). The mat physically
  covers the centre of the screen where the orbs drift.
- The orbs are `filter: blur(60px); opacity: 0.5` and the motes `opacity: 0.7`,
  positioned at centre-ish coordinates (`table.css:55-57`), so they render
  **behind the opaque mat** and only peek through the thin margins
  (`.ppane` padding `~10-40px`). Net effect: the "living room" ambience is
  almost entirely occluded → reads as a flat dark border. **Implemented & runs,
  but visually swallowed by the mat on top.**

**Background verdict:** implemented and works, but (1) never leaves the default
teal in normal play because no era is enabled by default, (2) the per-era shift
is subtle even when enabled, and (3) the ambient orb/mote life is occluded by
the opaque player mats.

---

## B. Feature-by-feature "alive" inventory (mounted tree)

For each: implemented? mounted? gate to fire? seen in a default hotseat?

### B.1 Dice roll cinematic (felt dice tumble) — WORKS
- `DiceLayer.tsx` (mounted `TableBoard.tsx:68`). Fires off `state.lastRoll`
  change via `useUI.rollDice` (`uiStore.ts:104-130`): two physical dice tumble
  at a random centre spot for ~2.8s, flip random faces while tumbling
  (`DiceLayer.tsx:30-39`), settle, then fade. CSS `dice.css:46-68`.
- Gate: a roll must happen (`CentralWall` "Roll dice" button → `roll()`).
  **NOT** gated by reduced-motion (intentional, `dice.css:116`).
- Default hotseat: **YES, seen** the moment you roll. Plus `playSfx('dice')`.

### B.2 Region tile glow on production ("anti-spoil") — WORKS
- `RegionTile.tsx:81-84`: a tile gets `.produces` only when
  `revealedRoll.turn === turn && rolledNumber === region.number` — i.e. AFTER
  the dice settle, never mid-tumble. Plus a flash + floating `+N/−N`
  (`RegionTile.tsx:104-114, 189-198`) and rotate sound on store change.
- Default hotseat: **YES** — roll a number that matches a region.

### B.3 Card-in-flight (deck → hand) — WORKS (conditionally)
- `FlightLayer.tsx` (mounted `:67`). Triggered in `CentralWall.drawWithFlight`
  (`CentralWall.tsx:49-68`) which calls `addFlight`. A card image animates
  deck→hand over 480ms.
- Gate: **skipped if `prefers-reduced-motion`** (`CentralWall.tsx:54`) and needs
  an element with `id="hand-target"` to exist. Also only on the styled deck
  stacks, not the discard/event piles.
- Default hotseat: **YES** when drawing from a deck (motion allowed).

### B.4 Card-deploy "pop" when placed on board — PARTIAL / WEAK in live tree
- The dramatic `card-deploy` keyframe (`anim.css:155-162`) targets `.mini.deploy`
  and `.foundation` — **both only exist in the DEAD `Principality`/`MiniCard`
  tree** (`MiniCard.tsx:30`). NOT rendered.
- In the LIVE tree, placed pieces are `.pb-site-card / .pb-seat / .pb-road /
  .pb-region`, which animate via the milder `piece-drop` keyframe
  (`anim.css:45-57`) — a small drop+settle. There IS a `playSfx('sweep')` deploy
  whoosh (`PrincipalityBoard.tsx:180`, `CardZoom.tsx:65`).
- Default hotseat: a **subtle** drop + a whoosh — yes, but **the big "dramatic
  deploy pop" the comments describe is on a dead component**, so it never fires.

### B.5 "Living water" under ships — IMPLEMENTED BUT NEVER RENDERED (dead)
- `.mini-water` animated ripple (`anim.css:167-186`) is emitted ONLY by
  `MiniCard.tsx:41` (`{isShip && <span className="mini-water"/>}`).
- `MiniCard` is used only by `Principality`/`HandView` — the **dead old layout**.
  The live `PieceArt`/`Hand` path never renders `.mini-water`.
- Default hotseat: **NEVER seen.** Root cause: feature lives on an orphaned
  component.

### B.6 Advantage chime + negative cue — WORKS (when a token moves)
- `AdvantageAudio.tsx` (mounted `:74`, renders null). Watches synced
  `hasHeroToken/hasTradeToken`; on gain → `playSfx('token')`, on loss →
  `playSfx('flip')` + `flashNegative(loser)` (`AdvantageAudio.tsx:20-34`).
- Negative cue = `.player-plate.cued-negative` red flash (`table.css:793-799`),
  driven by `useUI.flashNegative` (`uiStore.ts:95-98`) → `PlayerPlate.tsx:25,37`.
- Gate: a token must actually CHANGE holder. In the manual sandbox the player
  assigns tokens by hand (`TokenLayer`), so it fires only when someone clicks to
  move a token. Default hotseat: **YES, but only after a token is moved** — many
  early games never touch tokens, so it feels absent.

### B.7 Brigand robbing cinematic — WORKS (rare trigger)
- `BrigandSequence.tsx` (mounted `:75`). Fires off `revealedRoll.event ===
  'brigand'` (`:18-26`): full-screen shade + a rider sweep + `playSfx('token')`,
  ~1.9s. CSS `brigand.css`. z-index 76, `pointer-events:none`.
- Gate: the **event die must roll `brigand`** (1 of several faces). Default
  hotseat: **seen only when that face comes up** — purely chance, so a short
  session may never see it. Implemented & correct.

### B.8 Event popup (event card drawn) — WORKS (conditional draw)
- `EventPopup.tsx` (mounted `:72`). Shows off synced `state.revealedEvent`;
  `playSfx('flip')` on open (`:18-20`). Modal scrim + pop (`event.css`).
- Gate: requires rolling `event-card` AND clicking "Draw event card"
  (`CentralWall.tsx:176-178`). Default hotseat: **seen only on that path.**

### B.9 Turn banner sweep — WORKS
- `TurnBanner.tsx` (mounted `:76`). On `state.turn` change (not gameover) shows
  a "<name>'s turn" banner ~1.25s. CSS `anim.css:73-99` (z 150).
- Gate: turn must change (End turn). Reduced-motion kills the sweep
  (`anim.css:148`) but the text still flashes. Default hotseat: **YES** on
  End turn.

### B.10 VP bump — WORKS (live plate)
- `PlayerPlate.tsx:27-34,70` adds `.bump` to `.plate-vp` when VP changes;
  keyframe `anim.css:62-70`. (The old `.vp-num.bump` in `PlayerHeader` is dead.)
- Default hotseat: **YES** when you ± a player's VP.

### B.11 Victory celebration + fanfare — WORKS
- `VictoryFlow.tsx` (mounted `:73`). Non-blocking flow: eligibility banner →
  claim → agree → `Celebration` with spinning rays (`victory.css:73-79`),
  trophy, `playSfx('token')` + `playVictoryMusic()` (`music.ts`: owner
  `public/victory.mp3` if present, else a synth fanfare looping every 7s).
- Gate: a player must reach `winThreshold` VP, claim, and the other agree
  (in hotseat either seat agrees). Default hotseat: **seen only at game end.**
- Note: `Board.tsx`'s old `.gameover` modal is dead; the live end-screen is
  `Celebration`.

### B.12 Ambient felt orbs / motes — IMPLEMENTED, mostly occluded
- See §A.4. Mounted (`Table.tsx:25-30`) and animating, but covered by the
  opaque `.pmat`. Default hotseat: **barely perceptible.**

### B.13 SFX engine — WORKS but easy to think it's silent
- `sfx.ts`: synth Web Audio, one lazy `AudioContext` created on first sound
  AFTER a user gesture (autoplay policy), gated by a persisted mute flag
  (default unmuted). Sounds: rotate/dice/token/place/flip/ui/sweep.
- Caveat: the **first** sound only arms after a click; if the very first action
  is muted or the context is suspended, early cues can be missed.

---

## C. Implemented-but-dead (never in the live tree)

| Feature | CSS / file | Why dead |
|---|---|---|
| Card-deploy dramatic pop | `anim.css:155-162` `.mini.deploy`,`.foundation` | only on `MiniCard`/`Principality` (old layout) |
| Living water under ships | `anim.css:167-186` `.mini-water` | only on `MiniCard.tsx:41` (old layout) |
| `vp-num.bump` | `anim.css:62` | only on `PlayerHeader` (old layout); live tree uses `plate-vp.bump` (works) |
| Old gameover modal | `Board.tsx:59` `.gameover` | replaced by `VictoryFlow`/`Celebration` |
| `CenterColumn` suspense roll | `CenterColumn.tsx:44-57` | old layout; live tree uses `DiceLayer` |

These are real code that the owner can read about in comments but will NEVER see,
because they hang off the unused `Board` component subtree.

---

## D. Prioritized root causes — "owner doesn't see the alive stuff"

1. **Background never leaves default teal in normal play.** Per-era tint is
   implemented and correct, but a default hotseat enables no eras
   (`newGame.ts:71`), and eras must be toggled manually (which restarts the
   game). So the felt is always the base teal unless the user discovers the HUD
   chips. (table.css:757-780; Table.tsx:6-10; TableHud.tsx:40-52) — **highest
   impact on the complaint.**

2. **Ambient orbs/motes are occluded by the opaque player mats.** The "living
   room" layer is z-0 behind z-1 panes whose `.pmat` has an opaque gradient +
   140px inset shadow, so the drifting orbs/motes only show in thin margins.
   (table.css:30-76 vs 92-111) — the felt reads as flat/dead.

3. **Two headline "alive" features are wired to dead components and NEVER
   render:** living water under ships (`.mini-water`) and the dramatic
   card-deploy pop (`.mini.deploy`/`.foundation`). The live board uses milder
   `piece-drop` instead. (anim.css:155-186; MiniCard.tsx; Board subtree unused.)

4. **Several juice features are gated behind rare/optional in-game events**, so a
   short default session legitimately won't trigger them: brigand sweep (needs
   the brigand die face), event popup (needs event-card roll + draw), advantage
   chime/negative cue (needs a token to actually change hands), victory
   celebration (needs game end). All implemented & correct — just low-frequency.

5. **Even-when-enabled era tints are subtle** (hue shift on a dark radial wash,
   no scene swap), so the dynamic background is underwhelming relative to the
   "make the game alive" expectation.

6. **First SFX requires a user gesture** (Web Audio autoplay). The very first
   cue can be lost / context suspended, contributing to "I don't hear anything."

### Quick wins (for a later fix session — not done here)
- Default-enable all sets (or default to a non-base/`duel` felt) so the
  background is dynamic out of the box; OR make the era tint far more dramatic.
- Lower `.pmat` background opacity / shrink it / raise orb opacity & z so the
  ambient life shows through.
- Port `.mini-water` and the dramatic deploy pop onto the LIVE `PieceArt`/board
  pieces (or delete the dead `Board`/`Principality`/`MiniCard` tree to stop the
  confusion).
