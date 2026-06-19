# Catan Duel — UI/UX Polish + Completeness Audit (2026-06-19)

Lens: minimal, intelligent, well-organised UI at best-digital-tabletop quality; fully
playable in ANY era with ANY action/event. Read-only audit. All paths absolute-relative
to repo root `/home/abdalla/projects/catan-duel`.

Verdict up front: the game IS completeness-clean — every era plays start-to-finish and
no card/event is a dead end (the universal ResolutionPanel toolkit guarantees it). The
work here is almost entirely POLISH: HUD density, one art inconsistency, the low-res city
photo, and a few silent actions. Prioritised high-value/low-effort first.

---

## 1. UI CLUTTER — the HUD (highest value, low effort)

`src/ui/board/TableHud.tsx` packs **9 distinct control clusters** onto one 30px strip
(`table.css:165` `.table-hud height:30px`): title, Sets chips (Basic+3 eras), Win@ select,
Theme select, Pay/Free toggle, Log, Mute, New game, and 3 mode tabs. On a narrow screen
these wrap or crowd; it reads as a settings bar, not a game frame. Several are
"set-once" options that don't deserve permanent real estate.

**Proposed reorganisation (minimal, grouped):**

- **Collapse setup-time options into one "⚙ Setup/Game" popover.** Sets, Win@, and Theme
  (`TableHud.tsx:54-93`) are configuration, not per-turn controls. Move all three behind a
  single gear button that opens a small popover. This removes 3 of the widest clusters from
  the always-on strip. Sets + Win@ also START A NEW GAME when toggled mid-game
  (`TableHud.tsx:44-49` calls `newHotseat`) — burying them in a popover reduces accidental
  game-resets, which is currently a real footgun sitting one click away.
- **Pay/Free toggle → into the same popover OR a small inline pill near the Build bar.**
  It's a play-style mode, not a frequent action; `TableHud.tsx:94-100`. Keeping it visible
  is defensible, but it belongs next to building, not between Theme and Log.
- **Group the 3 utility buttons (Log / Mute / New game) into a right-aligned icon cluster**
  with consistent sizing. Today Mute is `font-size:15px` (`table.css:212`) while Log/New are
  text buttons — visually mismatched. Make all three icon-first (☰ 🔊 ⟳) with tooltips.
- **Keep only the mode tabs (Hotseat/Online/Cards) + title permanently.** That's the true
  top-level navigation. Result: strip = `[Catan Duel] … [⚙] [☰ 🔊 ⟳] [tabs]` — calm and
  legible vs today's 9 clusters.
- **"Sets" picker redundancy:** the Theme select already has gold/turmoil/progress/duel
  options (`TableHud.tsx:86-91`) AND the Sets chips toggle eras. Two controls that both
  re-theme the table is confusing. Theme should be visual-only (it is) but consider auto-
  defaulting Theme to the enabled era so the user rarely touches it — then Theme can leave
  the always-on strip entirely.

**Naming inconsistency (1-line fix):** the Innovation era is labelled `'progress'` set id
but shown as **"Innovation"** in HUD eras (`TableHud.tsx:15`) and Theme, yet
`ERA_LABEL`/`SET_LABEL` elsewhere say **"Innovation"** while `BuildSupply.tsx:19`
`ERA_LABEL` and `table.css` classes say `progress`. User-facing copy is consistent
("Innovation"); just confirm no stray "Progress" leaks (ResolutionPanel ScoringTool shows
the stat literally as "progress" lowercased — that's the STAT, which is correct, but it sits
next to era naming and could confuse; consider "Innovation pts" label).

---

## 2. COMPLETENESS across eras — can every era be played fully?

**YES.** Verified:
- 103 cards: base 44, gold 21, turmoil 20, progress 18; categories region 6 / foundation 3
  / building 35 / hero-or-unit 19 / action 25 / event 15.
- **No dead-end cards.** `completeness.test.ts` asserts every non-region card yields a
  non-empty `displaySummary`. The 11 cards with empty `rules_text` (base-abbey, the base
  heroes, gold-merchant-guild, turmoil-carl-forkbeard, turmoil-hedge-tavern-1x,
  turmoil-large-festival-hall) are all **passive** — they carry `values` (stats/VP) or are
  prerequisite/flavor buildings, and `displaySummary` (`cards.ts:90-101`) synthesises a
  "Passive — provides X" line or an honest "resolve manually" note. Not dead ends.
- **Every event resolvable.** All 5 event-die faces have `EVENT_EFFECTS` entries
  (`effects.ts:168-176`); Brigand additionally has a one-click `resolveBrigand`
  (`ResolutionPanel.tsx:480-491`). Of the 15 event-DECK cards, 12 have coded shortcuts; the
  3 manual-only ones (base-yule, turmoil-riots, progress-plague) have full `rules_text` shown
  in `EventPopup` and the toolkit handles them. Fine — but see the gaps below.

**Minor completeness gaps worth closing:**

- **`base-abbey` + `turmoil-hedge-tavern-1x` have `values:{}` AND no rules_text** — both
  carry an `unclear` note ("confirm against the physical card whether it has printed rules
  or is prerequisite-only"). They're resolvable (toolkit), but they're the only two truly
  blank playable cards. ACTION: owner should confirm the physical cards and fill rules_text
  or mark them explicitly "prerequisite only — no active effect" so the panel says something
  meaningful instead of the generic fallback. Low effort, removes the last ambiguity.
- **Manual-only events have NO coded affordance, but their needs are mechanical:**
  - `progress-plague` ("every region bordering a city loses 1 resource") — the toolkit's
    region resource +/- handles it, but there's no quick button. Consider an EVENT_EFFECTS
    entry with a guidance step (no auto, since it's board-position dependent).
  - `turmoil-riots` (pay 1–2 gold per unit) — likewise resolvable via the Ledger gold −,
    but a `gainFixed gold -1/-2` quick step would save clicks.
  - `base-yule` (reshuffle event deck, redraw) — purely a deck op; a quick "shuffle event
    deck + draw" affordance would be nice. Currently the player just dismisses and re-rolls
    manually. Low priority.
- **No "event deck" interaction parity:** the event deck stack (`CentralWall.tsx:117-120`)
  is a static display (`cs-event`, no draw button, `cursor:default`) — events are drawn only
  via the dice "Draw event card" button (`CentralWall.tsx:167-169`). That's correct per
  rules, but a player who wants to draw an event manually (e.g. Yule redraw) has no path
  except rolling. Minor; consider making the event stack clickable to draw when appropriate.

Net: completeness is solid. The above are refinements, not blockers.

---

## 3. ICONS / ART

### 3a. The city.webp problem (CONFIRMED, high-value)
`src/assets/buildings/city.webp` is **8.1 KB** vs settlement **70 KB** and road **64 KB** —
it is the old low-res scrap. It renders wherever `cardArt('base-city')` resolves
(`cards.ts:39-43` FOUNDATION_ART), i.e. the on-board city piece via `PieceArt`
(`PieceArt.tsx:12-13`) and the city in CardZoom/Resolution headers.
Official photo art exists for settlement + road but **NOT city** (per the brief).
**Options (best first):**
1. **Source/commission a matching city photo** at the same painterly style + resolution as
   settlement.webp/road.webp and drop it in `assets/buildings/city.webp`. Zero code change —
   `cardArt` already wires it. Best result, owner-supplied art per the repo's "no copyrighted
   files" rule.
2. **Fall back to the hand-drawn `City()` SVG** (`CenterArt.tsx:170-196`) until a real photo
   exists. The SVG city is clean and consistent with the other CenterArt scenes. Implement by
   removing `'base-city'` from `FOUNDATION_ART` (`cards.ts:39-43`) so `cardArt` returns
   undefined and `PieceArt` falls through to `CenterArt`. This makes city visually MATCH the
   build-supply rendering (see 3b) and removes the ugly low-res photo immediately, $0.
3. **Upscale** the existing city.webp — not recommended; it's too small to recover.
Recommendation: do **2 now** (instant consistency win) and **1 when art is available**.

### 3b. Settlement/city/road inconsistency: build supply vs board
`BuildSupply.tsx:78` renders the 4 STRUCTURES with **`<CenterArt>`** (hand-drawn SVG),
while the board renders placed pieces with **`PieceArt`/`cardArt`** (real photos)
(`PieceArt.tsx`). So the SAME settlement looks like an SVG in your supply tray and like a
photo once placed. Either:
- Switch BuildSupply to `PieceArt` for the foundation structures (consistent photos), OR
- If you adopt 3a-option-2 (city falls back to SVG), this partly self-resolves for city.
Pick one rendering path for foundation pieces everywhere. Low effort, removes a jarring
swap the player sees on every build.

### 3c. Other iconography notes
- Stat glyphs use raw unicode: ⚔ strength, ✦ skill, ⚖ commerce, ⚙ progress
  (`PlayerPlate.tsx:8-13`, `ResolutionPanel.tsx:37`). Functional and consistent across both
  files — fine, but ✦ (skill) and ⚙ (progress) are weak/abstract; consider small custom SVGs
  to match the polished region/resource icons in `CenterArt.tsx:242-303` (those are
  excellent). Low priority.
- Resource icons in `CenterArt.tsx` are strong and the wheat-not-coin distinction
  (`242-303` comment) is a nice touch. No change.
- Card-back emblems (`table.css:666-681`) are generic radial blobs per set colour. Adequate;
  a small per-era emblem glyph would lift them. Optional.

---

## 4. SFX / feedback

Synth-only SFX engine (`audio/sfx.ts`), 7 cues (rotate/dice/token/place/flip/ui/sweep),
mute-gated + persisted. Good architecture. Coverage is broad but has **silent actions that
should give feedback:**

- **`endTurn` is SILENT** — `CentralWall.tsx:85` dispatches endTurn with no `playSfx`. Ending
  your turn is the single most frequent table action; it should have a clear cue (e.g. a soft
  `ui` tick or a dedicated "pass" whoosh). HIGH-value, 1-line fix. (TurnBanner appears but
  makes no sound.)
- **`adjustVP` ± buttons are SILENT** — `PlayerPlate.tsx:67,74`, `PlayerHeader.tsx:30,37`,
  and `ResolutionPanel.tsx:258-263`. Scoring a point is a celebratory moment; add a light
  `token`/`ui` cue (and there's already a VP `bump` animation at `PlayerPlate.tsx:70` with no
  paired sound). Low effort.
- **Advantage reassign via ResolutionPanel `AdvantageTool` chips** (`ResolutionPanel.tsx:306`)
  — silent. The TokenLayer path plays `token` (`TokenLayer.tsx:78`) and AdvantageAudio reacts
  to holder change; verify the panel path also triggers AdvantageAudio (it dispatches
  `setToken`, so the global AdvantageAudio watcher SHOULD fire — confirm it isn't gated to the
  wall control only).
- **`applyProduction`** plays `place` in CentralWall (`157`) but NOT in the older
  CenterColumn (`CenterColumn.tsx:101`). If CenterColumn is still reachable, align it; if it's
  dead code, note for removal (see §5).
- **Dice:** good — `uiStore.ts:134-145` plays a layered clatter on roll. Nice.

Nothing is annoying/over-triggered (the code is careful about "one sound per action",
e.g. `CentralWall.tsx:63-66` deliberately avoids a double tick). No music loop during play
(only victory fanfare in `music.ts`) — that's a reasonable choice for a manual sandbox; an
optional ambient toggle could be a Tier-3 nicety.

---

## 5. Other polish — turn flow, empty states, dead code, a11y

- **Possible dead/duplicate components:** `CenterColumn.tsx` and `PlayerHeader.tsx` both
  duplicate functionality now owned by `CentralWall.tsx` and `PlayerPlate.tsx` (endTurn,
  applyProduction, VP ±). If `TableBoard` is the live layout, CenterColumn/PlayerHeader/
  HandView may be legacy from the pre-"felt table" design. Confirm and DELETE unused ones —
  duplicate turn controls are a clutter + maintenance risk (two endTurn buttons, only one
  with sound). Worth a quick `grep` for their imports before the polish batch.
- **Empty states are handled** — empty hand shows "— empty hand —" (`Hand.tsx:21`), empty
  discard tooltip (`CentralWall.tsx:124-128`), empty log "No actions yet."
  (`AuditLog.tsx:35`), empty stack "— empty —" (`StackBrowser.tsx:93`). Good.
- **Error states:** there's an `ErrorBoundary.tsx` — confirm it wraps the board. No obvious
  inline error UI for failed online sync beyond NetToasts (out of this lens).
- **Turn flow:** the "no enforced phases / free manual play" model is clean and matches the
  trust-based design. The roll outcome panel (`CentralWall.tsx:137-175`) is well-built:
  Produce + Resolve + (conditional) Draw-event buttons. One nit: after rolling, the strip
  shows `Produce N` and `Resolve <event>` but there's no explicit "skip/ignore" — fine, since
  endTurn is the skip, but a player might not realise Produce is optional. A faint hint helps.
- **Accessibility wins already present:** `prefers-reduced-motion` honoured
  (`table.css:879`, `CenterArt`/dice), aria-labels on dialogs/inputs, `role="log"` +
  `aria-live="polite"` on the audit list (`AuditLog.tsx:34`), keyboard Escape closes
  Zoom/Resolution (`CardZoom.tsx:48`, `ResolutionPanel.tsx:417`). Strong baseline.
- **A11y gaps:** the Sets/Theme/Pay controls rely on `title` tooltips for meaning, not visible
  labels — fine for sighted mouse users, weak for keyboard/SR. The Pay/Free toggle is a
  `<button>` with emoji text (`TableHud.tsx:99`) but no `aria-pressed`; add it (Mute has it,
  `TableHud.tsx:106`). Stat glyph spans use `title` for the stat name but the glyph itself is
  decorative unicode with no aria — acceptable since the number is visible.
- **Drag-only affordances:** building from the supply is drag-only
  (`BuildSupply.tsx:69` "drag onto the board"); there's no click-to-place fallback. On touch
  devices and for motor-accessibility, a click-to-arm-then-tap-slot flow would help. The
  CardZoom has buttons (good), but the supply tray pieces (settlement/road) are drag-only.
  Medium effort, real inclusivity win.
- **`hud-name` CSS exists (`table.css:192-201`) but names are edited on the PlayerPlate
  (`PlayerPlate.tsx:39`), not the HUD** — likely orphaned style from an earlier HUD that had
  name inputs. Confirm + remove. Minor.

---

## Prioritised action list (high-value / low-effort first)

1. **Add SFX to `endTurn`** (`CentralWall.tsx:85`) and **`adjustVP`** (PlayerPlate/
   PlayerHeader/ResolutionPanel). Most-used actions are silent. ~5 lines. [HIGH/LOW]
2. **Fix the city art** — drop city to the SVG fallback now (remove `base-city` from
   `FOUNDATION_ART`, `cards.ts:39-43`), commission a real city.webp later. [HIGH/LOW]
3. **Unify foundation-piece rendering** — make BuildSupply use `PieceArt` (or accept SVG
   everywhere) so supply ≠ board inconsistency disappears (`BuildSupply.tsx:78`). [HIGH/LOW]
4. **Declutter the HUD** — fold Sets/Win@/Theme (and maybe Pay) into one ⚙ popover; group
   Log/Mute/New into a consistent icon cluster; keep only title + tabs always-on. Also guards
   the accidental new-game footgun. [HIGH/MED]
5. **Confirm + remove dead duplicate components** (CenterColumn/PlayerHeader/HandView/
   orphaned `.hud-name`) to kill double turn-controls. [MED/LOW]
6. **Fill `base-abbey` + `turmoil-hedge-tavern-1x`** rules_text or explicit "prerequisite
   only" so no card shows the generic blank fallback. [MED/LOW — owner physical-card check]
7. **Add quick EVENT_EFFECTS steps for plague/riots/yule** to save manual clicks. [MED/MED]
8. **a11y:** `aria-pressed` on Pay toggle; visible labels or better SR text on Setup controls;
   a click-to-place fallback for the drag-only supply pieces. [MED/MED]
9. **Stat glyphs → custom SVGs** to match the excellent resource icons. [LOW/MED]

No completeness blockers. Every era is fully playable; the universal ResolutionPanel toolkit
guarantees no card or event is ever a dead end. The remaining work is polish and tidiness.
