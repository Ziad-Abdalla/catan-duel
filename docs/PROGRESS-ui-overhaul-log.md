# Catan Duel — "Real Table" UI Overhaul · Progress Log

Goal: make the game feel like playing the physical _Rivals for Catan_ at a real table, not a web
app. One screen, no scroll. Run till all done. (Driven by the `/goal` directive.)

## Design direction (locked)
- **Hero = the table.** Dark-walnut gaming table + forest-felt play area, candlelit vignette.
  Two principalities face each other across a raised central "wall" of card stacks. Pieces sit
  on the felt with soft contact shadows.
- **Signature** = advantage tokens as physical wooden discs that **arc across the table** between
  players (FLIP).
- **Player identity:** P1 = Catan red `#b5403a`, P2 = Catan blue `#2f5a8a` (piece frames/glow + tokens).
- **Type:** keep Cinzel (display/labels/numbers) + IM Fell English (body/rules).
- **Scaling:** fixed design space (1280×800) scaled to the viewport via `transform: scale` → always
  one screen, never scrolls.

## Layout (1:1 with the real game)
```
  region  region  region          ┐
     \ building-sites /            │ opponent principality (top, mirrored)
      Stl —road— Stl               │
     / building-sites \            ┘
  region  region  region
 ───────────────────────────────── central WALL: draw stacks ×4 · region · event · dice tray ·
  region  region  region            phase track · turn · advantage tokens
      ...your principality...       ┐ (bottom, your seat)
  fanned hand along bottom edge     ┘
```
Spine = Settlement—road—Settlement (expand to 3). Regions nestle in the corners (top row + bottom
row, middle regions shared). City upgrades a settlement in place. Building sites above & below each
settlement hold buildings + heroes (freely placed).

## Milestones
1. **One-screen scalable table scaffold + exact layout** — ✅ DONE
2. **Pieces via CenterArt + crafted tokens + table surface/lighting** — ✅ DONE
3. **Drag-drop placement + city upgrades + spine expansion (engine TDD)** — ✅ DONE
4. **Pervasive animation + living tokens** — ✅ DONE
5. **Cohesion: responsiveness, reduced-motion, final polish** — ✅ DONE

## ✅ ALL MILESTONES COMPLETE
The board now plays like the physical game on a real table: one screen, 1:1 layout, tactile pieces,
drag-drop placement, and living tokens. tsc clean · **43 tests green** · `npm run build` clean.
Final state captured in `.shots/hero.png` (compare `.shots/before.png`).

## Done
### M1 — scalable table + 1:1 layout
- `Table.tsx` / `table.css`: fixed 1280×864 design space scaled to the viewport (`transform: scale`)
  → always one screen, no scroll. Walnut table + forest-felt + candle vignette.
- `PrincipalityBoard.tsx`: the real-table grid — spine (Settlement—road—Settlement) with region
  cards in the diagonal corners and building sites above/below each settlement. Generalizes to N
  settlements (cols = 2N+1; expansion → +1 region column = +2 regions).
- `CentralWall.tsx`: deck wall (4 draw + region + event as stacked cards), dice tray (suspense roll),
  phase rail, turn controls, advantage-token posts.
- `AdvantageToken.tsx`: crafted wooden-disc tokens (crossed swords / balance).
- `PlayerPlate.tsx`: per-player plaque (colour identity, name, VP ±, held tokens).
- `Hand.tsx`: fanned hand along the bottom edge.
- `TableHud.tsx` + `TableBoard.tsx`: compose it all; `App.tsx` now renders the full-viewport table
  for Hotseat/Online and keeps the scrollable gallery for Cards. Overlays (turn banner, toasts,
  game-over, connection bar) render OUTSIDE the scaled table so `position:fixed` hits the viewport.
- Verified: tsc clean, **40 tests green** (smoke test updated to the table UI), `npm run build` clean,
  headless-Chrome screenshots confirm the layout (`.shots/`).

### M2 — tactile pieces, tokens, table lighting
- Felt: layered radial candlelight + vignette + inlaid gold hairline + woven texture.
- Pieces lifted off the felt with contact shadows; region tiles hover-lift; settlements carry a
  player-colour ground glow + roof pennant.
- Central wall restyled as a raised carved-wood shelf dividing the two players.
- Player plates: player-coloured (red P1 / blue P2), grander, glow when it's their turn.
- Principalities centred; plates float into the side margins (balanced, not lopsided).
- Screenshot verified (`.shots/m2-d.png`).
- **Screenshot tooling:** headless Chrome → `.shots/*.png`, then read the image. (`.shots/` is scratch.)
- For interactive states, drive the live store via Chrome DevTools Protocol (`window.__game` dev hook
  in `gameStore`, DEV-only) then capture — see `.shots/m3-driven.png`.

### M3 — placement, upgrades, expansion
- Engine (TDD, in `actions.ts` + `actions.test.ts`): `upgradeCity` (settlement→city in place, keeps
  slot, +VP) and `expandSpine` (+settlement +road, draws 2 regions: 1 inserted after the existing top
  regions, 1 appended bottom — keeps the corner grid stable). Placement reuses `playCard` with a
  structured slot id (`s{i}-up` / `s{i}-down`). 43 tests green.
- `uiStore.ts`: ephemeral drag/selection state, SEPARATE from the game snapshot (never broadcast).
- Drag-and-drop: hand cards are draggable; building sites are drop targets that glow while dragging
  (`droppable`/`over`), with click-to-place fallback (select card → click site). Settlements show an
  upgrade affordance (click → city); an expand "＋" sits at the spine's end (→ draws 2 regions).
- Verified via CDP: placed buildings, a city (VP 4), a 3-settlement / 8-region expansion, tokens on
  plates all render correctly.

### M4 — pervasive animation + living tokens
- **Signature: travelling advantage tokens.** `TokenLayer.tsx` renders the two tokens at viewport
  level and FLIP-animates each (WAAPI, arcing bounce) from its old anchor to the new whenever the
  holder changes. `TokenAnchor` markers live on each plate + the wall posts; the token physically
  travels between them. Verified via CDP probe (tokens land on the correct plates).
- Dice tumble (wall die), piece drop-in (regions/settlements/roads/placed cards, incl. settlement→
  city morph via keyed remount), hand deal-in, VP-number pulse on the plate, region produce flash
  (RegionTile), turn-handoff banner, gameover pop. All gated behind `prefers-reduced-motion`.
- Note: draw/play motion is covered by the deal-in / drop-in mount animations; a true point-to-point
  deck→hand card flight is a candidate enhancement (left for the cohesion pass if budget allows).

## Decisions / notes
- Settlement/city/road art stays the user's job — rendered through `<CenterArt>`; I only position +
  animate them. Region & card art are final (do not touch CenterArt.tsx / center.css / src/assets).
- For the user, later: drop `settlement.webp` / `city.webp` / `road.webp` into `src/assets/buildings/`
  (the ART instance wires the glob in CenterArt).

### M5 — cohesion, responsiveness, final polish
- Verified one-screen fit at 1366×768 and 1920×1080 (transform:scale, wood edges fill the
  letterbox). No scroll at any size.
- **Card flight:** drawing from a deck flies the card from the stack to the hand (`FlightLayer.tsx`
  + flight queue in `uiStore`). Fixed a React-StrictMode bug where the dev double-invoke cancelled
  the flight instantly (now only removes on `finish`, never on `cancel`).
- Win overlay (parchment "X WINS!" over the dimmed table) and the online lobby both restyled/verified.
- Dev hooks `window.__game` / `window.__ui` (DEV-only, tree-shaken in prod) for CDP-driven screenshots.

---

# Pass 2 — "feel like physically playing" (the second `/goal` run)

Direction: the real-table board is too small + under-animated. Make it tactile and big.
Screenshot tooling this pass: `node scripts/shot.mjs out.png --url=http://localhost:5180/ --w --h
--motion --wait --eval='<js>'` (headless Chrome + CDP; `--motion` emulates prefers-reduced-motion:
no-preference; `--eval` drives `window.__game`/`window.__ui` and can scroll `.felt-scroll`).

## P2 milestones
1. **Layout — HALF + SCROLL, fully responsive** — ✅ DONE
2. Region tiles — physical rotation, edge icons, dice-pip number, outside nameplate — ✅ DONE
3. Cards — grid-aligned placed cards + tap-to-enlarge with rules text — ✅ DONE
4. Dice — felt tumble → settle → focal outcome in the wall — ✅ DONE
5. Animations + Sound — token flight fix (StrictMode), region rotation, SFX + mute — ✅ DONE
6. Live feedback fixes — uniform region-sized aligned grid + free scrolling — ✅ DONE

### P2·M5 — animations + sound (DONE)
- **Advantage tokens reworked for the half+scroll layout.** The two plates now live in different
  scroll panes, so a token flying plate→plate would go off-screen. Instead each token is a wooden
  disc on a 3-stop track (P1 · open · P2) INSIDE the always-visible wall, and it physically ARCS
  (WAAPI, lift + spin) between stops when reassigned — always on screen, reads clearly as "moved to
  that player". `TokenLayer.tsx` now exports `AdvantagePost`; old plate/viewport token anchors removed.
  WAAPI is StrictMode-safe: the resting `left` is set directly (no teleport if an animation is
  cancelled) and the from-stop is kept in a ref across re-renders.
- **Sound:** `src/audio/sfx.ts` — Web-Audio-synthesized cues (rotate tick, dice clatter, token thunk,
  card place/flip, ui blip), no asset files. Persisted MUTE toggle (🔊/🔇) in the HUD; wired into
  region turns, dice, token moves, card play/exchange/return, deck draws. Lazy AudioContext (first
  gesture), all gated by the mute flag; reduced-motion still plays sound (motion ≠ audio).
- Region-rotation animation landed in M2; dice/flight animations from M2/M4 retained.

### P2 live-feedback round 5 (DONE)
- **Build bar: ONE buildable-without-drawing building per era** (not all). The data marker is the
  card `tag === 'Extraordinary Site'` → **Gold Cache** for Era of Gold. Turmoil/Progress have no such
  tag in the transcribed data (a known gap) — awaiting the operator to name those two so they can be
  tagged. The build bar now filters to that tag instead of all `building` cards.
- **Advantage tokens move to the holder's BOARD.** Redesigned: a compact control lives in the wall
  (always there to reassign — click → Player 1 / Center / Player 2), but the wooden DISC now renders
  ON the holder's plate (`PlateToken`), popping in when it arrives; the wall control dims to a faint
  marker + the holder's name while held. Tokens no longer sit in the wall flex flow, so they can't
  get pushed off-screen when the deck wall fills.

### P2 live-feedback round 4 (DONE)
- **Dice actually ROLL now.** Root cause: the die showed the final pips the whole time and only
  rotated (reads as "shaking with the answer on it"). `DiceLayer` now flips through random pip faces
  / event symbols every ~90ms WHILE tumbling, then snaps to the real outcome on settle. (Plus the
  earlier fix making the spin unconditional regardless of reduced-motion.)
- **Fixed the white-screen crash** — a Rules-of-Hooks violation: `RegionTile`'s empty-slot branch
  returned before later `useState`/`useEffect` hooks, so a slot flipping empty↔filled (when building
  a settlement splices a slot in) changed the hook count and crashed React. All hooks now run before
  any return. Added an `ErrorBoundary` so a crash shows a recoverable panel, never a blank screen.
- **Compact, clickable advantage tokens.** Replaced the wide 3-stop track with a small disc; click
  opens a popover (Player 1 · Center · Player 2); choosing reassigns + pops the disc. The central
  wall now fits the screen width (deck wall flex-shrinks/scrolls; tokens are tiny).
- **Road → settlement frontier.** Roads carry an explicit road-slot index (`road-{i}`); dropping a
  road on an END slot opens a gold settlement-frontier slot beyond it to drop a settlement into.
  Left-build remaps road slots too. (engine)
- **Era buildings buildable from the bar.** Each enabled era's `building` cards appear in a scrollable
  build-bar section (themed borders); drag one onto a building site to build it without drawing.
- **Yule (festival) event mechanic** (engine, TDD): Yule starts 4th from the bottom of the event
  deck; drawing it reshuffles the deck (deterministic, seeded by `seq`) and re-seats Yule 4th from
  the bottom. `seatYule()` helper.
- **Era decks split in two** (each enabled era → 2 themed draw stacks) and **editable player names**
  (the plate name is an input → `renamePlayer` action; broadcast online). 54 tests green, build clean.

### P2 live-feedback round 3 (DONE)
- **Dice now always animate.** They were gated behind prefers-reduced-motion (the user's OS had it
  on → no spin). The ~3s decelerating roll is now unconditional (core feedback), spawned centre-screen.
- **Authentic diagonal layout.** Rewrote the grid: 2N+1 equal columns where ODD columns are road
  slots (carry a region above & below) and EVEN columns are settlements (carry building sites above &
  below). Spine alternates settlement–road–settlement; end road slots sit empty (extension frontier).
  Regions are therefore diagonal to settlements. Clean 3-row grid (above/spine/below), no fine-column
  hacks. Fixed the S/road ordering (structure-driven, not placed-order).
- **Per-set card backs + deck wall.** `newGame` now builds 4 base draw stacks (red backs) plus ONE
  stack per enabled era; the deck wall renders each pile with its set's themed back (red / gold /
  violet / teal) and an emblem. Removed the useless green "draw a region" deck button.
- **Build bar overhaul.** `BuildSupply` items = Settlement · City · Road · Landscape. CLICK shows the
  piece's cost & details (CardZoom `build` mode) — no auto-place. DRAG to place: settlement → end
  zones, road → an open road slot, city → onto a settlement, landscape → an open landscape slot. Drag
  a placed road/building back onto the bar to remove it (the bar becomes a "Drop to remove" target).
  Engine (TDD, +2 → 51 tests): building a settlement now adds 2 OPEN landscape slots (no auto-draw);
  `placeLandscape` fills an open slot from the region stack; `removePlaced` returns buildings to hand
  / clears roads. `RegionSlot.empty` marks open slots. Cities are intentionally not drag-removable.
- **Background life.** Slow-drifting cool light orbs + a faint rising mote field behind the felt.
- NOTE for the user: era *buildings* currently arrive via the themed DRAW decks (into your hand),
  as in the physical game — they're not added as infinite build-bar supply items. If you want
  specific era structures as buildable supply pieces, tell me which and I'll add them.

### P2 live-feedback round 2 (DONE)
- **Dice clearly visible:** the two dice now tumble in near the CENTRE of the viewport (small
  jitter) instead of a random far corner, and are larger — always seen whichever half you're on.
  Reduced-motion now still shows the dice (static, no violent tumble) rather than skipping them.
- **Region click halves:** clicking the LEFT half of a tile takes a resource off (−1), the RIGHT
  half adds one (+1); a −/+ hover affordance shows the split. (Right-click still −1.)
- **Regions diagonal to settlements:** rewrote the grid to the authentic Rivals diagonal — two
  packed rows of regions with the spine offset by HALF a card (fine grid of half-region columns),
  so each settlement sits at a seam between regions; a road sits under the region between two
  settlements. Spine pieces layer (settlements above roads).
- **Manual settlement/road placement:** new engine action `buildPiece` (TDD, +3 tests → 46) —
  `road` appends a road; `settlement` appends a settlement AND draws its 2 regions (keeps the grid
  balanced). New `BuildSupply` rail (draggable Settlement/Road pieces, click to add) + a `BuildZone`
  drop spot at the spine's edge; `dragBuild` channel in `uiStore`. Replaces the old auto "+expand".
- **Board polish:** warmer focused candlelight on the felt, layered overlapping spine, bigger tiles,
  re-tuned the responsive clamps so the top regions clear the sticky wall down to 1280×720.

### P2 live-feedback fixes (DONE)
- **Uniform, aligned grid.** The principality is now ONE square grid where regions, settlements, the
  road and placed buildings are ALL the same region size (`--reg`) and share columns: a settlement
  sits directly under its region, the road under the middle region, and a building stacks in its
  settlement's own column. Verified by CDP: regions/seats/road/cards all share x-centres
  (585/720/855) and width (119px). (Was: settlements/buildings were 0.86× and offset into the gaps.)
- **Free scrolling.** `scroll-snap-type` changed from `y mandatory` to `y proximity` and the
  smooth-scroll removed, so scrolling up/down is never yanked back — it only gently rests near a half.

### P2·M4 — dice tumble + focal wall outcome (DONE)
- `diceart.tsx`: `PipDie` (1–6 as real pips) + `EventSymbol` (carved emblems for all five event faces:
  brigand / trade / celebration / plentiful-harvest / event-card) + colour map.
- `DiceLayer.tsx` + `dice.css`: on a roll, TWO physical dice tumble in from above at a RANDOM felt
  spot (viewport %), bounce, settle, then fade once the wall has written the result. Triggered off
  `lastRoll` changes (fires for local AND remote rolls).
- The whole timeline lives in `uiStore.rollDice` (store singleton, per-roll key guard) NOT a React
  effect — so React StrictMode's dev mount/unmount/mount can't cancel the timers. `revealedRoll` is
  set only when the dice settle, so the wall "writes" the outcome AFTER the tumble (`wo-pending`
  "the dice are rolling…" until then).
- The central wall now shows a focal **event symbol** disc + name, the production pips, and the
  Produce / Draw-event actions. Dice clatter SFX on tumble, soft thunk on settle.
- Verified tumble + settled outcome via CDP (Plentiful Harvest emblem focal, pip die beside it).

### P2·M3 — grid-aligned cards + tap-to-enlarge (DONE)
- Placed buildings/heroes now render at full settlement size (`--seat`), aligned in the settlement's
  grid column above/below it (no more tiny squares). Empty sites stay a slim drop strip.
- `CardZoom.tsx` + `cardzoom.css`: tap any card (hand or in-play) → a large, readable detail modal
  reusing `CardView` (art + cost + value badges + **rules_text + flavor_text** beneath, scaled up so
  the unreadable printed text is legible). Esc / scrim closes it.
- Actions in the zoom: a hand card → **Play to principality** (auto-targets the first open building
  site) or **Exchange under stack 1–4**; an in-play card → **Return to hand**. Each fires a SFX.
- Drag-to-place from the hand still works unchanged. Zoom state lives in `uiStore` (never broadcast).
- Verified hand-zoom, in-play-zoom, and placement via CDP.

### P2·M2 — rotating region tiles (DONE)
- New board-owned `RegionTile.tsx` + `region.css` rendered over the final terrain webp
  (own `import.meta.glob`; reuses CenterArt's *exported* `ResourceIcon` — never edits CenterArt).
- The tile physically TURNS: inline `transform: rotate(stored*90deg)`, but the angle is derived as
  the equivalent CLOSEST to the previous one (`target + 360*round((prev-target)/360)`) so each step
  is a short ±90° and clicking through 3→0 keeps spinning forward (270→360) instead of unwinding.
- Four edges carry 0·1·2·3 resource-icon chips (local bottom=0, right=1, top=2, left=3) so a
  clockwise turn always brings the next-higher count to the fixed reading edge (screen bottom).
  Click = +1 CW, right-click / shift = −1 CCW; tactile flash + a `rotate` SFX per turn.
- Production number drawn as real DICE PIPS on a cream die-face plaque centred on the tile.
- Region NAME + a `stored/3` gold chip sit on an upright nameplate OUTSIDE the rotating card.
- Verified rotation mapping (0/90/180/270) and the forward-wrap via CDP transform probes + closeups.

### P2·M1 — layout (DONE)
- Dropped `transform: scale` / fixed 1280×864 canvas. `Table.tsx` is now a `.felt-scroll`
  (`position:fixed; overflow-y:scroll; scroll-snap-type:y mandatory`) over a fixed walnut `.felt-bg`.
- Two `.ppane` halves (opponent / you), each a candle-lit felt `.pmat`, separated by a **sticky**
  `.wall-rail` (`position:sticky; top:0`) so the central wall is ALWAYS visible. Snap points:
  opponent pane `snap-align:start`, your pane `snap-align:end` → you see one principality + the wall
  at a time and scroll "across the table". No auto-snap on turn change (none added).
- Fully fluid: every size derives from the viewport via a master `--reg` unit (`clamp(84px,14.5vh,
  200px)`) + `--wall-h`, `--seat`, `--gap`, `--pane-h` — no fixed design px. Empty building sites
  collapse to a slim drop strip so the default board fits one pane; placed cards grow it (scroll).
- Verified via CDP at 1920×1080, 1440×900, 1280×720, 820×1180 — wall visible at both snaps, hand
  reachable, no clipping. tsc + 43 tests + build clean (smoke test updated to the new markup).

# Pass 3 — "make every card actually playable" (the third `/goal` run)

Direction: the board was polished but most cards were inert — you could place them but not carry
out their effects, and costs/requirements weren't shown. This pass adds the LOGIC to USE cards,
trust-based (present + assist, never enforce). **85 tests green · tsc clean · build clean.**
Verified visually via headless-Chrome/CDP (`.shots/v-*.png`).

## What shipped
1. **Costs & requirements shown everywhere.** Filled the canonical **build costs** for
   settlement (1 lumber·1 brick·1 wool·1 grain), city (2 grain·3 ore upgrade), road (1 lumber·1 brick)
   in `cards.json` — flagged `unclear` ("confirm against the physical card", per
   [[feedback_no_fabrication]]; NOT invented — the documented Catan/Rivals costs). `CardView` now shows
   a labelled **Cost** row (incl. "No build cost" for free pieces) and a dedicated **Requires** line
   (`requirementOf()` parses `values.requires` OR the printed "Requires: …" clause — text is the source
   of truth). `requirementMet()` (`engine/requirements.ts`) gives an assist-only ✓/✗ met-hint in CardZoom.
   Surfaced in build-bar popup, hand/in-play zoom, and the gallery (all via `CardView`).
2. **Universal Resolution Panel** (`ui/board/ResolutionPanel.tsx` + `resolution.css`) — the core. Opens
   from a hand card ("Resolve effect…"), an in-play card/hero ("Activate / resolve…"), an event-die face
   ("Resolve <Event>" in the wall), or a drawn event card. A parchment **game-master's ledger** on the
   dimmed felt with the full rules text (or a synthesised passive/"no text transcribed" summary — never
   blank) + a toolkit that enacts ANY effect through the pure reducer (serializable, broadcast, undoable):
   the signature **two-column resource ledger** (P0 red ∕ transfer gutter ∕ P1 blue, per-resource ±,
   live TOTAL with a red **>7** badge for Brigand), dice override (set production + event, or set as the
   roll), VP + strength/skill/commerce/progress ±, grant/return/discard any card, advantage reassign, and
   a free-form log note. **Guaranteed fallback → no card is a dead end.**
3. **EffectOp registry** (`engine/effects.ts`) — coded shortcuts on top of the manual toolkit. Card id →
   ordered `EffectStep`s (guidance text + ready-made `QuickAction` buttons); covers the taxonomy
   (gain/choose resource, fixed gain, steal/give, die override e.g. Brigitta/Reiner, once-per-turn e.g.
   Mint, protection notes, draw/grant, trade ratios). Every **event-die face** wired (`EVENT_EFFECTS`):
   Brigand / Plentiful Harvest / Celebration / Trade / Event-card. `quickToActions()` maps a button (+
   chosen resource) to engine Actions; focus kinds (die/grant/advantage) scroll-highlight the toolkit.
4. **Derived stats** (`computeStats`) — per-player strength/skill/commerce/progress from placed cards'
   values + manual `statAdjust`, shown as chips on each `PlayerPlate`. `suggestAdvantage()` highlights the
   strength/commerce leader (assist-only, never enforced) on the plate and in the panel.
5. **Undo / history** — `gameStore` keeps a 50-deep snapshot stack; `undo()` restores the prior state with
   a monotonic seq (so online peers still adopt it) and force-broadcasts. Undo button in the wall + panel.

## Engine (all TDD-first, pure & serializable)
New actions: `addResource` (distribute ±N across matching regions, cap 0–3, overflow dropped),
`transferResource` (player↔player↔bank), `adjustStat`, `grantCard` (+optional pull from a stack),
`setDice` (override roll, no phase change), `markUsed`/clear-on-endTurn (once-per-turn), `logNote`.
Helpers: `computeStats`, `resourceTotal`, `resourceTotalOf`, `suggestAdvantage`. `PlayerState` gained
optional `statAdjust` + `usedThisTurn`. New tests: `resolution.test.ts` (15), `effects.test.ts` (9),
`completeness.test.ts` (3), `undo.test.ts` (4) → 54 → **85 green**.

## Era face-up buildings (operator-confirmed)
The "build straight from the supply, no draw" cards are the **face-up expansion cards**, 2 copies
each (operator confirmed from the physical cards): **Merchant Guild** (Gold), **Hedge Tavern**
(Turmoil), **University** (Innovation) — NOT Gold Cache (which is drawn like any other card).
Tagged `"Face-up Expansion"` in `cards.json`; `BuildSupply` filters on that tag and shows a `×copies`
badge. Enable an era via the top-bar chips (Gold · Turmoil · Innovation) → its face-up building
appears in the build bar. Online: toggling an era starts a fresh game and force-syncs to the peer.

## ⚑ For the operator to confirm (no fabrication)
- **Build costs** for settlement / city / road are the canonical Catan/Rivals costs — please confirm
  against your physical cards (they're flagged "needs verify" in the gallery).
- **Siglind** and **Irmgard** have no cost in the transcribed data — confirm the printed cost.
- **Abbey** and **Hedge Tavern** have no transcribed rules text — confirm whether they carry a printed
  effect or are prerequisite-only cards (flagged in-app). All four are still fully resolvable manually.

## Coordination notes for the user
- **Settlement / City / Road art is still yours to add** (currently the placeholder SVG via CenterArt).
  Drop `settlement.webp` / `city.webp` / `road.webp` into `src/assets/buildings/` — the ART instance
  wires the glob in CenterArt; the table will pick them up with no layout changes.
- **Region corner placement is index-based** (regions[0..2] top, [3..5] bottom, etc.) — an arbitrary
  but consistent assignment. If you want the exact physical corner arrangement, tell me the per-region
  positions and I'll map them (like the region numbers were confirmed).
- `.shots/` holds reference screenshots (gitignored); safe to delete.
