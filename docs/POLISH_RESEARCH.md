# Polish & UX Research — Catan Duel (manual trust-based sandbox)

Research date: 2026-06-19. Target: a web-based, 2-player, **manual-sandbox** digital version of *Catan: The Duel / Rivals for Catan*. The engine is **trust-based** — it tracks state but does NOT enforce rules; players dictate flow. Stack: React/TS/Vite + PartyKit websockets.

Already shipped: full-viewport fluid table, audit log, dice/event/vote-to-end flows, card-deploy + water + per-era atmosphere animations, synthesized SFX + original victory fanfare, drag-drop building, discard pile, resource +/- floats. The repo already has a `store/undo.test.ts`, `store/uiStore.ts`, and a `gameStore.ts`, so several backlog items below extend existing scaffolding rather than starting cold.

Goal of this research: **high-value, low-risk** improvements toward "ready, polished, accurate, responsive, user-friendly, simplified" — without becoming annoying or spammy. Special focus: (1) first-run onboarding for a manual sandbox, (2) responsiveness & touch for a fixed desktop table, (3) affordance/clarity wins, (4) restraint guidelines.

---

## 1. Online tabletop UX — Board Game Arena, Tabletopia, Tabletop Simulator

### Board Game Arena — Studio Guidelines
Source: https://en.doc.boardgamearena.com/BGA_Studio_Guidelines

- **One persistent Action Bar is the single source of turn truth.** It "always shows the current state: turn in progress, who we're waiting for, or what the player can do." Players never hunt for whose turn it is. → A fixed React banner driven by current player + a lightweight phase enum (`Your turn — build phase` / `Waiting for [opponent]`). Drive it off current player + phase, not enforced legality.
- **"Players should never wonder what do I click." Highlight valid options.** Even in a sandbox you can *softly* highlight likely targets (glow the build area during a build phase) as hints, not hard constraints — CSS `box-shadow`/outline pulse on clickable zones.
- **Score/turn-order/objectives live in panels/tabs; the central area is shared actions, panels are private resources.** → collapsible side panel for resource counts + VP; duel board stays central.
- **Tooltips add detail, never duplicate.** "Add extra detail beyond what's on screen (hints about when to use)"; a pure zoom of already-legible text is a smell. → hover tooltip shows rules text / timing hints, not just a bigger image.
- **Errors are concise plain text** ("You don't have enough resources"). → small toast / inline string.

### BGA — Undo Policy (take-backs in a trust-based context)
Source: https://en.doc.boardgamearena.com/BGA_Undo_policy

- **Default is "don't undo"; allow it only for misclicks / complex action chains** where real opponents would grant a take-back.
- **Never allow undo that crosses revealed hidden info or randomness** (card draw, dice roll, shuffle) or that **changes the active player.** Savepoint must be taken *before* information is revealed.
- **Prefer direct move-reversal over full state restore; prefer client-side undo; keep a distinct red "Undo" button.**
- **Confirm vs undo:** confirmation verifies intent ("did you mean to Pass?"); undo reverses a committed action. For irreversible buttons, add a confirm prompt.

→ For this app (highly relevant — trust-based, 2-player): undo as a **last-action stack** in the reducer (extends existing `undo.test.ts`); gate it so it disables the moment a die roll / face-down draw occurs (`dirtyAfterReveal` flag). Safest model: **client-local undo of your own un-broadcast intent + a mutual "request take-back" message** the opponent accepts — trust games lean on social consent.

### Tabletopia — interacting with components (manual affordances)
Sources: https://help.tabletopia.com/knowledge-base/actions-with-game-objects/ , https://help.tabletopia.com/knowledge-base/card/

- **Small consistent verb set:** left-drag to move (objects highlight on select); rotate (Ctrl-drag / Q-E); flip (F); auto-stack by dragging onto each other; **L locks** an object to prevent accidental movement.
- **Right-click radial context menu** whose options vary by object (Take, Draw, Shuffle, Deal, Flip, Lock).
- **Bottom hand zone** that highlights on drag-over; Space/Z enlarges a hovered card.

→ One mental model covers every piece. In React: draggable piece components (pointer events / dnd-kit), a right-click context-menu component, a bottom hand drop zone that highlights on drag-over, hotkeys (F flip, Space zoom). **Lock** is especially valuable in a sandbox to stop knocking the board around.

### Tabletop Simulator — snap points (snapping vs free placement)
Sources: https://kb.tabletopsimulator.com/game-tools/snap-point-tool/ , https://tabletopsimulator.nolt.io/847

- **Two snap types** (positional, positional+rotation); objects "gravitate toward" nearby snap points on drop.
- **Per-object attraction toggle** — any piece can opt out of snapping (free placement). Offer **both**, switchable per object.
- **Top user pain point:** free-hand placement "feels clumsy"; users want **the target zone highlighted while a card hovers near it**, then exact correction on drop.

→ Define snap targets as DOM regions; on drag, if pointer is within threshold, **show a highlight ghost** and snap on release; modifier/toggle for free placement. The hover-highlight-before-commit is the single biggest polish win and is trivial CSS (`.snap-target--active`).

### BGA — reconnection & disconnect
Sources: https://en.boardgamearena.com/doc/Game_clock , http://en.boardgamearena.com/doc/Troubleshooting

- Server-authoritative state; a returning client simply re-syncs. Over-time/disconnected players can be expelled after a grace period.

→ PartyKit room (Durable Object) is authoritative; on socket drop auto-reconnect and request a full snapshot (`onConnect` replays state). Show a non-blocking **"Opponent disconnected — reconnecting…" banner** instead of freezing; **presence dots** (green/grey per seat) are the lighter win.

### Empty states as onboarding
Source: https://www.useronboard.com/onboarding-ux-patterns/empty-states/

- Treat the blank board as an onboarding surface; show the single next action ("Drag your settlement here to start"), and keep an always-available Help button to avoid the "onboarding cliff."

---

## 2. Card-play feedback, readable HUD, clean logs — Master Duel & Civ V/VI

### Yu-Gi-Oh Master Duel — dramatic but disciplined
Sources: https://upcomer.com/yu-gi-oh-master-duel-update-adds-animations-for-spells-and-traps/ , https://gamefaqs.gamespot.com/boards/326292-yu-gi-oh-master-duel/79869720 , https://steamcommunity.com/app/1449850/discussions/0/3819658451376387972/

- **Animations teach the effect** (readability + drama in one). You don't need 1,000 bespoke effects — define **3–5 reusable "play archetypes"** (build/settlement, raid/attack, draw/trade, special-event) as keyframe presets; the card's category picks the preset.
- **Tiered emphasis:** routine plays get a brief glow; full-screen center-stage floats are reserved for win conditions. → a `tier` prop (`subtle | standard | hero`): subtle = ~150ms glow pulse, hero = ~1.2s center sequence + backdrop dim.
- **Restraint, learned the hard way:** Master Duel's community constantly begs to speed up / disable animations, even though its timer pauses during them. **Ship the speed/skip controls Konami didn't:** an animation-speed setting (Off / Fast / Full) and **click-to-skip** any in-progress animation. Highest-value restraint lever.

### Card hover-zoom & focus
Sources: https://uxdesign.cc/8-best-practices-for-ui-card-design-898f45bb60cc , https://blog.prototypr.io/ui-case-study-state-styles-of-card-component-with-accessibility-in-mind-2f30137c6108

- **In-hand hover = cheap lift** (`translateY(-8px) scale(1.05)` CSS-only, no re-render). **Read-zoom = a separate, stable surface:** one fixed-position `<CardPreview>` node, data swapped on hover/focus, with ~150ms intent delay to avoid flicker. Always pair with a `:focus-visible` outline (keyboard + a11y).

### Board zones / drop targets
Sources: https://www.eleken.co/blog-posts/drag-and-drop-ui , https://blog.logrocket.com/drag-and-drop-react-dnd/

- **On drag-start: dim the board, light up eligible zones; on hover: intensify the target + show a placement ghost.** In a manual sandbox, visual affordance is the *only* guidance — it replaces rule enforcement. CSS classes `.zone--eligible` / `.zone--hot`. `@dnd-kit` is the modern accessible DnD lib if the layer is ever revisited.

### Civ V/VI — notification / transaction log (strongest template for the audit log)
Sources: https://steamcommunity.com/sharedfiles/filedetails/?id=1459493312 , https://steamcommunity.com/app/289070/discussions/0/340412122418831937/

- **Consolidate, don't pop** — route every state change into ONE scrollable log instead of stacking toasts; at most one brief transient toast for the latest event, mirrored into the log.
- **Group by type** with colored icon / left-border (`build | trade | dice | combat | resource | system`) for instant eye-filtering.
- **Scannable + retained:** cap ~50–100 entries, newest on top, **tabular numerals** so resource deltas align in columns.
- **Dismiss vs retain + unread badge** on the log toggle.
- **Batch bursts:** debounce log writes within a short window; render a multi-resource trade as one grouped row ("+2 wood, −1 ore, −1 brick"), not three. Prevents spam from the existing resource +/- floats.

### Living ambient HUD without distraction
Sources: https://garden.bradwoods.io/notes/design/juice , https://uxdworld.com/designing-ui-cards/

- Keep ambient motion (drifting clouds, breathing dice, idle resource icons) on slow, low-amplitude loops **behind** the interactive layer. Rule of thumb: ~one animated feature per region; more reads as clutter. (You already have atmosphere animations — keep them ambient, never competing with action feedback.)

---

## 3. First-run / how-to-play onboarding for a manual sandbox

The hardest problem here: **teaching a flow the software deliberately refuses to enforce.** Teach the *turn loop*, not individual rules.

### NN/g — onboarding tutorials vs contextual help
Source: https://www.nngroup.com/articles/onboarding-tutorials/

- **Upfront tutorials mostly fail:** the active-user paradox (people skip to start doing), decontextualization (front-loaded steps are forgotten by the time they're needed), dismissal friction.
- **Reserve a full tutorial only for genuinely novel paradigms** — a manual no-enforcement sandbox *is* novel, so a **short framing screen** is justified to set the mental model, not to teach mechanics.
- **Prefer "pull" / just-in-time contextual help** triggered by user signals (entering a phase, hovering) over "push" walls of text. Rules: easy dismiss + recovery; progressive disclosure; no memorization (help sits beside the step); time help to real task analysis.

### NN/g — instructional overlays / coach marks
Source: https://www.nngroup.com/articles/mobile-instructional-overlay/

- Coach marks help only for **non-self-evident** features. **Chains of coach marks strain memory** — users dismiss them faster regardless of value. Keep any tour ≤3–4 steps, one primary action per overlay, **styled so it doesn't look like real UI** (dashed/handwritten arrows, scrim with a cut-out highlight via `getBoundingClientRect`).

### Game onboarding specifics
Sources: https://userguiding.com/blog/video-game-onboarding , https://acagamic.com/newsletter/2023/04/04/dont-spook-the-newbies-unveiling-5-proven-game-onboarding-techniques/

- **Teach by doing, one mechanic at a time;** always provide a visible **Skip**. A manual sandbox does NOT self-guide, so it needs *more explicit scaffolding* than a rules-enforcing game.
- Monopoly digital uses **Pass & Play + AI practice** as implicit onboarding (a safe space to fumble). The cheap equivalent here: a **solo "free play / practice board"** with no opponent.

### Progressive disclosure & empty states
Sources: https://userpilot.com/blog/progressive-disclosure-examples/ , https://carbondesignsystem.com/patterns/empty-states-pattern/

- **Empty states are the #1 onboarding opportunity:** a fresh board should show the single next action ("It's your turn. Roll the production dice →"), not a silent table. Each action reveals the next layer.

### Persisting completion / "don't show again"
Source: https://frigade.com/blog/stop-storing-impressions-in-local-storage

- Standard `localStorage` flag (`catanduel.introSeen`) gated on dismiss/complete. Caveat: browser-scoped not user-scoped (new device = tutorial reappears) — acceptable for a casual game; mirror server-side later if accounts arrive. HIG rule: **if skipped, don't reshow — but keep it findable** (a "Replay tutorial" entry in Settings).

### Collapsible quick-reference cheat-sheet
Sources: https://www.gameuidatabase.com/ , https://ui.shadcn.com/docs/components/radix/collapsible

- A persistent, collapsible **"How to play" cheat sheet** (turn order, build costs, win condition) one click away — reduces noise while staying instantly available. Replaces long coach-mark chains.

### Recommended onboarding stack for THIS app (layered)
1. **One tiny framing screen on first run** (3 bullets: "you run the game by hand, the app tracks state and never blocks you" / "each turn: roll → produce → build → pass" / Start + Skip). Set the `localStorage` flag on either button.
2. **Phase-aware just-in-time hints** driven off existing game state — the board's empty state shows the single next action; the hint follows the state the player creates. Auto-suppress a hint after the action has been taken a few times (per-phase counter in `localStorage`).
3. **Persistent collapsible "How to play" cheat-sheet** ("?" button).
4. **Solo free-play practice board** (Monopoly Pass-&-Play analogue) — defer; medium effort.
5. **Never trap players:** global Skip / "don't show again" + a Settings "replay tutorial / reset hints."

Avoid: long launch spotlight tours, walls of text, overlays styled like real buttons.

### Fast asset / state-verification UX (the trust model's safety net)
- **At-a-glance state summary bar:** each player's resources, VP, whose turn — both players eyeball-confirm correctness in ~1 second.
- **Change highlighting + last-action log:** briefly flash the tile/counter that changed; keep a short scrollable "P1 built road · P2 +2 wool" log so the opponent can verify a manual move matched intent.
- **Show illegal-looking state, don't block it:** surface a *soft* non-blocking warning ("P1 has −1 brick?") rather than preventing it — informs without removing agency.

---

## 4. Responsiveness & touch, WCAG, and game juice

### Responsive & touch for a fixed desktop table
Sources: https://www.williammalone.com/articles/html5-game-scaling/ , https://en.doc.boardgamearena.com/Your_game_mobile_version , https://www.w3.org/TR/pointerevents3/ , https://www.uxpin.com/studio/blog/responsive-design-touch-devices-key-considerations/

- **Scale-to-fit container (single highest-value move):** keep the fixed-pixel layout, wrap it, apply one `transform: scale(k)` where `k = min(vp.w/board.w, vp.h/board.h)`; center the remainder (letterbox). React: `ResizeObserver` sets a `--k` var on the wrapper; child uses `transform: scale(var(--k)); transform-origin: top left`. Use `position: fixed` outer + **`dvh`/`dvw`** units (fixes the `100vh` mobile-chrome bug) + **`env(safe-area-inset-*)`** padding + `viewport-fit=cover`. Define a **safe area** (dice/build controls) that must never crop.
- **Pinch-zoom + pan on top of scale-to-fit:** a dense Catan board is too small on a phone otherwise. Pointer Events (1 pointer = pan, 2 = pinch); set `touch-action: none` on the board so the browser doesn't steal the gesture. `@use-gesture/react` or `react-zoom-pan-pinch` saves the math. (BGA itself admits its old pinch-zoom "is showing its age" — easy to beat.)
- **Touch drag-drop via unified Pointer Events** (`pointerdown/move/up` + `setPointerCapture`), `touch-action: none` on pieces. Mouse-only handlers "won't work on mobile" (BGA). **WCAG 2.2 SC 2.5.7 Dragging Movements (AA)** now requires a non-drag alternative → also add **tap-source-then-tap-target** ("select settlement, then tap a corner").
- **Touch targets ≥44–48px, no hover-only affordances.** WCAG 2.5.8 floor is 24px but iOS 44pt / Material 48dp is the practical floor. Scale-to-fit shrinks everything, so a 44px button at `scale(0.5)` is really 22px — **enforce min sizes after scale**, or boost padding on coarse pointers. Detect via `@media (pointer: coarse)` / `@media (hover: none)`; replace hover tooltips/highlights with tap-to-reveal or always-visible cues.
- **Feedback on `pointerdown`, not release** (finger obscures target); primary actions (roll, build, end turn) in the bottom thumb zone; re-run fit on `orientationchange`; `clamp()` fluid type for chrome *outside* the scaled board.

### WCAG basics for games (WCAG 2.2)
Sources: https://developer.mozilla.org/en-US/docs/Web/Accessibility/ARIA/Guides/Live_regions , https://www.a11y-collective.com/blog/aria-live/ , https://silktide.com/accessibility-guide/the-wcag-standard/2-5/input-modalities/2-5-8-target-size-minimum/

- **ARIA live regions (highest-value a11y win + clarity for sighted users too):** wrap the audit log in `role="log" aria-live="polite" aria-relevant="additions"`; a separate `role="alert"` / `aria-live="assertive"` region for urgent events (your turn, dice, robber). Keep the live node in the DOM from load (empty), then inject — toggling `display` breaks announcements.
- **Keyboard operability:** every drag action also keyboard-reachable (focusable pieces/corners, roving tabindex, Enter/Space to pick up/place) — also satisfies 2.5.7.
- **Focus management:** move focus into modals (trade, dice), return on close; never `outline: none` without a replacement (2.4.11–2.4.13 focus appearance).
- **Don't convey state by color alone (1.4.1):** player ownership, "your turn," valid spots need icon/shape/label too (critical for the two player colors + colorblind). Contrast: text ≥4.5:1, UI/large ≥3:1.

### Game "juice" + restraint
Sources: https://www.wayline.io/blog/the-juice-problem-how-exaggerated-feedback-is-harming-game-design , https://www.wayline.io/blog/the-seductive-squeeze-when-juice-in-game-development-becomes-a-crutch , https://feel-docs.moremountains.com/screen-shakes.html

- **What feels good:** layered immediate response (anticipation→action→reaction): a placement snap with quick scale-overshoot + settle, resource count-up tween + soft chime, dice tumble-then-settle, turn-handoff banner sweep. **Easing matters more than magnitude** (fast-in/slow-out reads as weight). Sound + animation carry more feel per unit than particles.
- **Restraint is load-bearing:** juice becomes "a crutch masking flaws" when everything explodes. (a) **Hierarchy** — biggest feedback for the rarest events (win, longest-road steal); routine actions subtle. (b) **Juice audit** — "does this clarify a mechanic or just decorate?" cut decoration. (c) Priority order: sound → animation → environmental → particles. (d) Turn-based: **juice must never block input or hide state** — queue input so a fast player isn't gated behind an animation.
- **Screen shake:** most overused + nausea-inducing; for a calm strategy game use almost never (tiny one-shot on robber/steal at most, <200ms), and disable it first under reduced-motion.
- **`prefers-reduced-motion` + skippability:** honor it by *swapping to a static equivalent* (instant change / quick cross-fade), not just removing feedback. Read once via `matchMedia`, branch animation config; make long animations tap-to-skip; offer an in-game **animation-speed toggle**.

---

## Prioritized implementable backlog

Effort: **S** ≤ a few hours · **M** ~half-day to a day · **L** multi-day. Risk = chance of regressing existing behaviour.

### Tier 1 — do now (high value, low risk, mostly isolated additions)

| # | What | Why | Effort | Risk |
|---|------|-----|--------|------|
| 1 | **Persistent turn/phase Action Bar** — one banner: `Your turn — build phase` / `Waiting for [opponent]`, driven by current player + phase enum. | Single biggest clarity win; players never hunt for whose turn it is. (BGA) | S | Low |
| 2 | **Empty-state "next action" prompt on a fresh board** ("It's your turn. Roll the production dice →"). | Teaches the turn loop without a tutorial; reuses existing state. (NN/g, Carbon) | S | Low |
| 3 | **Animation speed setting (Off / Fast / Full) + click-to-skip** any in-progress animation; auto-Off under `prefers-reduced-motion`. | The #1 restraint lever; the lesson Master Duel learned the hard way. Pure win. | S–M | Low |
| 4 | **ARIA live regions:** `role="log" aria-live="polite"` on the audit log; `role="alert"` for turn/dice/robber. | Big a11y win + clarity; cheap. (WCAG 2.2, MDN) | S | Low |
| 5 | **First-run framing screen + `localStorage` flag + Skip + Settings "replay."** 3 bullets on the no-enforcement model + turn loop. | Sets the novel mental model; justified precisely because the sandbox is unusual. (NN/g) | S–M | Low |
| 6 | **Collapsible "How to play" cheat-sheet** ("?" button: turn order, build costs, win condition). | Always-on safety net for a rules-heavy unenforced game; replaces coach-mark chains. | S–M | Low |
| 7 | **State summary bar** (each player's resources, VP, whose turn always visible). | Lets both players eyeball-verify the trust-based board in ~1s. | S–M | Low |
| 8 | **Consolidate the log:** one scrollable audit log with categorized colored icons + tabular-numeral deltas + newest-first + cap; at most one transient toast mirrored in. | Civ-style scannability; stops toast/float spam. (Civ Notification Log) | M | Low–Med |

### Tier 2 — next (strong value, moderate effort)

| # | What | Why | Effort | Risk |
|---|------|-----|--------|------|
| 9 | **Scale-to-fit wrapper** (`transform: scale` + ResizeObserver + `dvh` + safe-area insets, with a defined uncroppable safe area). | Makes the whole fixed table responsive with one transform; near-zero layout risk. (William Malone) | M | Low–Med |
| 10 | **Drag-drop on unified Pointer Events** (`setPointerCapture`, `touch-action: none`) + **tap-select-then-tap-target fallback.** | Unblocks all touch play; satisfies WCAG 2.5.7. (W3C, BGA) | M | Med |
| 11 | **`@media (pointer: coarse)` hit-area boost** (pad targets to 44–48px *after* scale) + kill hover-only cues. | Fat-finger-proof on phones/tablets. (UXPin, WCAG 2.5.8) | S–M | Low |
| 12 | **Drag affordance pass:** dim board + light eligible zones on drag-start, intensify hovered target, show placement ghost. | Visual affordance replaces rule enforcement in a sandbox; #1 thing TTS users ask for. | M | Med |
| 13 | **Reveal-gated undo + mutual take-back request.** Local undo stack (extends `undo.test.ts`); disable after any roll / face-down reveal; "request take-back" the opponent accepts. | Forgives misclicks without enabling cheating; fits trust design. (BGA Undo) | M–L | Med |
| 14 | **Batch burst events** (debounce + grouped log row: "+2 wood, −1 ore, −1 brick"). | One scannable line instead of a spam stream from resource floats. (Civ) | S–M | Low |
| 15 | **Presence dots + non-blocking reconnect banner** ("Opponent disconnected — reconnecting…"), full-snapshot re-sync on PartyKit `onConnect`. | Graceful disconnects; don't freeze the board. (BGA) | M | Med |
| 16 | **Tiered card-play emphasis** (`subtle | standard | hero`) via 3–5 reusable keyframe presets keyed off card category. | Drama where it counts, speed everywhere else; honors restraint hierarchy. (Master Duel) | M | Low–Med |
| 17 | **CSS-only in-hand hover lift + one fixed read-zoom `<CardPreview>`** (150ms intent delay, reused node) + `:focus-visible`. | Readable cards without layout thrash; keyboard-accessible. | S–M | Low |
| 18 | **Per-object Lock + free-placement toggle.** | Keeps it a true sandbox; stops knocking the board around. (TTS/Tabletopia) | M | Med |

### Tier 3 — later (nice-to-have / higher effort)

| # | What | Why | Effort | Risk |
|---|------|-----|--------|------|
| 19 | **Phase-aware just-in-time hints** driven off game state, auto-suppressed after N uses. | Most effective teaching for a manual flow; more wiring. (NN/g) | M | Med |
| 20 | **Pinch-zoom + pan layer** (`@use-gesture/react`). | Dense board legibility on phones; do after Tier 2 phone testing. | M | Med |
| 21 | **Solo free-play / practice board** (Pass-&-Play analogue). | Safe space to learn the manual flow. (Monopoly) | L | Med |
| 22 | **Right-click context menu** (Flip/Rotate/Shuffle/Draw) + hotkeys (F/Space). | One consistent verb set for every piece. (Tabletopia) | M | Med |
| 23 | **Soft non-blocking warnings** for illegal-looking state ("P1 has −1 brick?"). | Informs without removing agency; fits trust model. | M | Med |
| 24 | **Keyboard operability pass** (roving tabindex, Enter/Space pick-up/place) + focus management in modals. | Full WCAG 2.2 keyboard coverage. | M–L | Med |

### Guiding restraint principles (apply across all of the above)
- One sound + one visual per action; don't stack effects.
- Reserve the biggest feedback for the rarest events; routine actions stay subtle and fast (120–200ms, `ease-out` arriving / `ease-in` leaving).
- Never block the next legal action behind an animation; queue input.
- Honor `prefers-reduced-motion` by swapping to a static equivalent, not by removing confirmation.
- Every new feedback effect must pass the audit: *does it clarify a mechanic, or just decorate?*

---

### Source index
BGA Studio Guidelines · BGA Undo Policy · BGA mobile / Game clock / Troubleshooting · Tabletopia component & card docs · TTS snap-point KB + feedback · Master Duel update coverage (Upcomer, GameFAQs, Steam) · Civ Notification Log (Steam Workshop + threads) · NN/g onboarding tutorials & instructional overlays · UserGuiding / acagamic game onboarding · Userpilot / Carbon progressive disclosure & empty states · Frigade localStorage · Game UI Database · William Malone HTML5 scaling · W3C Pointer Events 3 · UXPin touch design · MDN + A11Y Collective ARIA live regions · Silktide WCAG 2.5.8 · Wayline juice articles · More Mountains screen shake. (Full URLs inline in sections 1–4 above.)
