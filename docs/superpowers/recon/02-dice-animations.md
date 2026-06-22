# Recon 02 — Dice, Card-Placement & Subtle Animations

Read-only map of the animation/SFX surface in the Catan Duel client (React + Vite, Web
Animations API + pure-CSS keyframes, Web-Audio-synth SFX). All `file:line` refs verified
against the tree at recon time. **No code was changed.**

## Status table

| # | Area | Current state | Owner want | Gap / verdict | Risk |
|---|------|---------------|-----------|---------------|------|
| 1 | Dice roll UX | 2D CSS tumble: drop-in, multi-spin, bounce, settle, fade. Two dice (production pips + coloured event die). `rolling` flips random faces during tumble, snaps to real outcome on settle. | "An actual die that falls on the table and rolls" | Already a falling/tumbling die. Upgrade to 3D-ish **CSS `transform-style: preserve-3d` cube** (6 real faces, rotateX/Y to land on outcome) — no new deps. Reuse existing tumble→settle→fade state machine. | Low–Med |
| 2 | Card placement (hand/build→board) | **No flight.** Card vanishes from source, target pops via `.pb-site-card` / `.mini.deploy` `piece-drop`/`card-deploy` keyframes. Deck→hand DOES fly (`FlightLayer` + `addFlight`). | "Placing cards animated" | Real gap: no source→board flight. Reuse `addFlight` (already viewport-coord, StrictMode-safe) at the `playCard`/`buildPiece` call sites. | Low |
| 3 | Subtle animations everywhere | Rich already: flights, dice, event flourish, brigand cinematic, victory, turn banner, VP bump, deploy pop, hand-hover lift, active-mat breathe, button press, ship water, region flash. | "Subtle animations everywhere" | Mostly covered. Low-risk adds: region-disc rotate easing, draw-stack count tick, token travel, resource +/- pulse, popup scrim fade. | Very low |
| 4 | BUILD anim/SFX | Build plays **only `'build'`** (wooden double-thunk). Engine deducts cost **silently** — NO `'coin'`/pay SFX on the build path. VP `bump` is visual-only. | Make builds visual-only (no pay anim) in manual mode | **Already audio-clean of pay.** A separate task only needs to suppress *resource deduction* under `payCosts === false`; no pay animation to strip. | n/a |

---

## 1. Dice roll UX

### Files & flow
- **`src/engine/dice.ts`** — pure model. `EventFace` union (`event-card | plentiful-harvest | celebration | trade | brigand`), `EVENT_DIE_FACES` (`dice.ts:10`) = **6 physical faces, 5 symbols** (`event-card` appears twice). Confirms **Rivals-style two dice**: a 1–6 **production die** + an **event die** of symbols. `rollDice(rng)` (`dice.ts:34`) returns `{ production, event }`.
- **`src/ui/board/diceart.tsx`** — the art. `PipDie` (`diceart.tsx:14`) renders 1–6 as a 3×3 pip grid (`PIPS`, `diceart.tsx:4`). `EventSymbol` (`diceart.tsx:42`) draws an inline SVG emblem per face (hooded brigand, trade scale, celebration goblet, wheat sheaf, scroll `?`). `EVENT_COLOR` (`diceart.tsx:25`) / `EVENT_NAME` (`diceart.tsx:33`) drive the felt colour and label. **Confirmed: production die = numbers/pips, event die = faces/symbols.**
- **`src/store/uiStore.ts`** — the state machine. `dice` state shape at `uiStore.ts:70`: `{ id, x, y, prod, event, phase: 'tumble' | 'settle' | 'fade' }`. `rollDice(production,event,turn)` (`uiStore.ts:152`) is the orchestrator and **owns the timers as a store singleton** (not a React effect) so React StrictMode's double mount can't cancel mid-flight; a per-roll `diceKey` (`uiStore.ts:153`) makes the double call a no-op. Sequence:
  - Spawn near viewport centre with jitter (`x = 46+rand*8`, `y = 44+rand*10`, `uiStore.ts:160`), phase `tumble`, `playSfx('dice')`.
  - Extra clatter at 700 ms & 1500 ms (`uiStore.ts:169-170`).
  - `tumble = 2800` ms → phase `settle` (`uiStore.ts:171`).
  - `+480` ms → `reveal()` (writes `revealedRoll` + fires `eventFx`), `playSfx('place')`, phase `fade` (`uiStore.ts:172-176`).
  - `+980` ms → `dice = null` (`uiStore.ts:177`).
- **`src/ui/board/DiceLayer.tsx`** — the renderer. Mounted in `TableBoard.tsx:81`. Drives off `lastRoll` changes (`DiceLayer.tsx:22`) so it fires for **local AND remote** rolls. During `tumble` it flips random faces every 90 ms (`DiceLayer.tsx:30-39`) so the die reads as genuinely rolling, then `showProd`/`showEvt` snap to the real `dice.prod`/`dice.event` on settle (`DiceLayer.tsx:42-43`). Two `.pdie` divs (`d-prod`, `d-evt`) carry `phase-${dice.phase}` classes.
- **`src/ui/board/dice.css`** — the animation. `.phase-tumble` (`dice.css:46`) = `die-tumble` 2.8 s `cubic-bezier(.16,.7,.12,1)`; the event die runs 2.9 s with a different curve (`dice.css:47`) so they desync naturally. `@keyframes die-tumble` (`dice.css:51`) = a **2D** `translateY` drop from −170px + `rotate` 0→1680deg + scale bounce (hits felt at 16%, bounces at 24%, decelerates to rest). `die-settle` (`dice.css:59`) little pop, `die-fade` (`dice.css:65`). **Explicit comment (`dice.css:116`): the spin is intentionally NOT gated by `prefers-reduced-motion` — it's core game feedback.**
- **`src/ui/board/DiceEventCue.tsx`** — sole owner of event-die audio (`TableBoard.tsx:92`); on `eventFx` change plays the face cue once via `eventSfx` (`cardSound.ts:38`): brigand→`menace`, trade→`coin`, celebration→`festival`, harvest→`harvest`, event-card→`flip`.
- Old/unused: **`src/ui/board/anim.css:3-25`** has a legacy `.die.tumbling`/`.pipdie.settled` 2D micro-tumble — superseded by `dice.css`, kept for the inline wall die. The dice `'dice'` SFX is synth-only (`sfx.ts:198`, not in `SAMPLE_VOICES`).

### Recommendation — "a real die that falls and rolls" (lightweight, no deps)
The current die is a flat square spinning in 2D. To make it read as a physical cube **with zero new dependencies**, convert each `.pdie` into a **CSS 3D cube** using `transform-style: preserve-3d`:

1. **Markup (DiceLayer.tsx):** render 6 child face divs per die (`.cube-face` rotated/translated onto each side of a cube via `rotateY/​rotateX(…) translateZ(half-size)`). Production die: a `PipDie` on each face (1–6); event die: the 6 `EVENT_DIE_FACES` symbols (note the two `event-card` faces). This reuses the existing `PipDie`/`EventSymbol` components unchanged.
2. **Tumble (dice.css):** keep the `tumble→settle→fade` machine and timings. Replace the flat `rotate(…)` in `die-tumble` with **compound `rotateX()` + `rotateY()` + `rotateZ()`** (e.g. land near `rotateX(1080deg) rotateY(720deg)`) plus the same `translateY` drop/bounce. `perspective` goes on the `.dice-felt` parent (`perspective: 700px`).
3. **Settle to the true face:** instead of the random-face flip during tumble, compute a **target transform per outcome** — a small lookup `FACE_ROT[n] = { x, y }` that rotates the cube so face `n` faces the camera. On `phase === 'settle'`, snap the cube wrapper to `FACE_ROT[dice.prod]` (and the event-die equivalent) via inline `transform`/CSS var, with the existing `die-settle` bounce on top. This keeps the "flips while rolling, snaps to answer on settle" contract that already exists (`DiceLayer.tsx:42-43`), just in 3D.
4. **Add a contact shadow** under `.dice-felt` (a blurred radial-gradient ellipse that scales with the bounce) so the die reads as landing ON the felt. Pure CSS.
5. **Effort:** ~1 new CSS block + ~25 lines in `DiceLayer.tsx` + a 6-entry rotation lookup. No physics engine, no canvas, no WebGL. If a *true* physics tumble is ever wanted, `cannon-es` (~30 KB) + a tiny `<canvas>` is the lightest real-physics option — but **not recommended**; the CSS cube gives 90% of the feel for ~0 KB and reuses the proven state machine.

---

## 2. Card-placement animation (hand/build → board)

### What exists
- **Deck → hand flies.** `CentralWall.tsx:32` `drawWithFlight` measures the source stack rect and `#hand-target` rect, then `addFlight({art, fx, fy, tx, ty, w})` (`CentralWall.tsx:40-48`) before dispatching `drawToHand`. `FlightLayer.tsx` (`TableBoard.tsx:80`) renders each flight as an `<img>` and animates it with the **Web Animations API** (`node.animate(...)`, `FlightLayer.tsx:25-32`): a 480 ms arc (lift + scale 1.08 + slight rotate), removed on `finish` (not `cancel`, for StrictMode safety, `FlightLayer.tsx:35`) with a 1200 ms safety timeout.
- **Placement target** has only a mount pop, no travel: `.pb-site-card`/`.pb-seat`/`.pb-road`/`.pb-region` → `piece-drop` keyframe (`anim.css:45-56`, drop from −22px + glow), and `.mini.deploy`/`.foundation` → `card-deploy` (`anim.css:134-140`, 3D-ish scale-in with `rotateX`). The card simply disappears from hand and the new piece pops in place.

### The gap
There is **no hand→board or build-bar→board flight**. Placement call sites that currently just dispatch + play a sound:
- `PrincipalityBoard.tsx:217` `place()` — `playCard` + `playSfx(cardSfx(cardId), cardId)` + `clear()`.
- `PrincipalityBoard.tsx:128/139/147` — `buildPiece` (road/settlement) on drop + `playSfx('build')`.
- `PrincipalityBoard.tsx:97/99` — `upgradeCity`.
- `CardZoom.tsx:68` `play()` and `CardZoom.tsx:78` `buildForeign()` — play from the zoom modal.

### Recommendation
Reuse the existing flight machinery — it already handles viewport coords + StrictMode:
1. At each placement site, before dispatch, capture the **source rect** (the dragged hand card / build-bar item / zoom card) and the **target site rect** (the `.pb-site` / seat / road slot the drop landed on — `onDrop`'s `e.currentTarget.getBoundingClientRect()`). For `CardZoom` plays (no drag), source = the zoom card centre, target = `firstOpenSlot` element (give sites a queryable id like the existing `#hand-target`).
2. Call `addFlight({art: cardArt(cardId), fx, fy, tx, ty, w})` then dispatch. `FlightLayer` already lands the card; the `piece-drop`/`card-deploy` pop then plays as the real piece mounts — chaining cleanly into a "lands, then settles" feel.
3. Keep `playSfx` where it is. **Effort:** small helper `flyToBoard(srcRect, targetRect, art)` reused at the 4–5 call sites. No new deps.

---

## 3. Subtle animations — inventory & low-risk additions

### Already animated (CSS, GPU transforms, `prefers-reduced-motion`-aware where appropriate)
- **Flights** — deck→hand (`FlightLayer.tsx`, WAAPI).
- **Dice** — full tumble cinematic (`dice.css`, §1).
- **Event flourish** — `EventFlourish.tsx` + `flourish.css`: per-face full-screen colour flash + glyph shower + title, ~1.7 s, deterministic spread, respects reduced-motion (`TableBoard.tsx:93`).
- **Brigand cinematic** — `BrigandSequence.tsx` + `brigand.css` (`TableBoard.tsx:91`).
- **Victory** — `VictoryFlow.tsx` + `victory.css`, `pop-in` (`anim.css:124`), looping celebration + victory music (`TableBoard.tsx:89`).
- **Turn banner** — `TurnBanner.tsx` + `banner-sweep` (`anim.css:91-98`), 1.25 s sweep on turn change (`TableBoard.tsx:95`).
- **VP change** — `.plate-vp.bump` `vp-bump` keyframe (`anim.css:61-68`), triggered by `prevVP` diff in `PlayerPlate.tsx:48-54` (visual only).
- **Deploy pop** — `card-deploy` / `piece-drop` (`anim.css:133-140`, `44-56`).
- **Hand hover** — cards lift + dim neighbours (`anim.css:164-166`).
- **Active mat** — `active-breathe` gold glow (`anim.css:169-173`).
- **Button press** — `:active { transform: scale(.93) }` across common buttons (`anim.css:176-177`).
- **Draw-stack hover** — `cardstack-wrap:hover` lift (`anim.css:180-181`).
- **Ship water** — `ship-water` shimmer under placed ships (`anim.css:143-160`).
- **Region tile** — `.rt-card` `rotate(${rot}deg)` inline transform + a `flash` class (`RegionTile.tsx:199-200`); `rotate` SFX on take (`RegionTile.tsx:183`).
- **Victory banner** — `vbanner-pulse` (`anim.css:184-188`).

### High-value, low-risk gaps (all pure CSS transitions, no JS, no deps)
1. **Region disc rotation easing** — the `rotate(${rot}deg)` (`RegionTile.tsx:200`) appears to snap. Add `transition: transform .25s var(--ease-snap)` to `.rt-card` so storing/spending visibly *turns*. (Owner explicitly called out "region disc rotate".)
2. **Draw-stack count tick** — `.cs-count` (`CentralWall.tsx:104`) changes instantly. A tiny `scale`/colour pulse on change (re-key the span or a CSS animation) reads the deck depleting.
3. **Advantage-token travel** — `.travel-token` only has `transition: filter` (`anim.css:58`); a FLIP-style or transition-based slide when the token changes owner would sell the "stealing the advantage" moment. Token swap fires `flashNegative` (`uiStore.ts:143`) already.
4. **Resource +/- pulse** — the `addResource` buttons (`ResolutionPanel.tsx:157/161`, region `step` `RegionTile.tsx:176`) play SFX but the number doesn't react; reuse the `vp-bump` pattern for stored-count changes.
5. **Modal scrim fade** — `CardZoom`/`StackBrowser`/`EventPopup` scrims could fade/scale in (`center.css:69` already uses `--ease-snap` for some). Cheap polish.
6. **Negative cue** — `negativeCue` flag (`uiStore.ts:91`, 900 ms) is wired in `PlayerPlate.tsx:45` (`cued`); confirm a red shake/flash class consumes it (low-risk to add if missing).

Easing tokens to reuse (defined `src/theme.css:24-26`): `--ease-snap` (overshoot), `--ease-spring` (bouncier), `--ease-out` (decelerate).

---

## 4. BUILD animation/SFX — confirmation for the "visual-only build" task

- **Build SFX = `'build'` only.** Every build path plays exactly `playSfx('build')` — a synthesised/sampled **wooden double-thunk** (`sfx.ts:224-229`, sample variants `build`/`build-2` at `sfx.ts:86`). Call sites: `buildPiece` road/settlement (`PrincipalityBoard.tsx:128/139/147`), `upgradeCity` (`PrincipalityBoard.tsx:99`), `movePlaced`/`removePlaced` (`PrincipalityBoard.tsx:225/186`). Card plays use `cardSfx(cardId)` (`PrincipalityBoard.tsx:218`, `CardZoom.tsx:71`), which returns `'build'` for settlement/city/road/building categories (`cardSound.ts:13,24`).
- **No pay/coin animation or sound on build.** `'coin'` SFX fires only on manual resource adjusters and the volume slider (`ResolutionPanel.tsx:133/157/161`, `StackBrowser.tsx:52`, `TableHud.tsx:124`) — never on `buildPiece`/`upgradeCity`/`playCard`. Grep confirmed: build path → `'build'` only, never `'coin'`.
- **Cost is deducted silently in the engine.** UI passes `pay: payCosts` (`uiStore.ts:133`, default `true`; toggled by the HUD `💰 Pay / 🆓 Free` chip, `TableHud.tsx:142-147`). The **engine** spends the cost when `pay=true` (`CardZoom.tsx:66-67` comment: "the engine spends the cost — no manual subtraction here, that would double-charge"). `grep` confirms **no `playSfx` anywhere in `src/engine`** — the engine emits no sound; all SFX live in the UI.
- **VP bump is visual-only** already (`PlayerPlate.tsx:52` comment: "the build/play already made its own sound; VP just bumps visually").

**Verdict for the visual-only-build task:** there is **no pay animation to strip** — builds are already free of any coin/pay cue. To make a build "visual-only in manual mode," the only lever is the existing `payCosts` toggle: when `payCosts === false`, the engine simply doesn't deduct resources (manual mode), while the `'build'` thunk + `piece-drop`/`card-deploy` visuals fire either way. If the task means "fire the build visuals/sound but never the resource math in manual mode," that is already the behaviour of `pay: false`. No animation removal is needed.

---

## Layer mounting reference
All cinematic layers mount in **`src/ui/board/TableBoard.tsx`**: `FlightLayer` (80), `DiceLayer` (81), `VictoryFlow` (89), `BrigandSequence` (91), `DiceEventCue` (92), `EventFlourish` (93), `TurnBanner` (95). Adding a placement-flight reuses `FlightLayer` (already mounted) — no new layer needed.
