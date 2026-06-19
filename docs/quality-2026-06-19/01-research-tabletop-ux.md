# 01 — Tabletop UX Research for a Manual, Trust-Based Catan Duel

**Date:** 2026-06-19 · **Scope:** Actionable UX/polish patterns from the best digital tabletop
sandboxes + *Rivals for Catan* specifics, filtered for a **manual sandbox** (assist, never enforce).

> Complements (does not duplicate) `docs/POLISH_RESEARCH.md` and `docs/goal-2026-06-19/*`. This pass
> goes deeper on raw sandbox card interactions, Rivals-specific layout/UX, and fresh tasteful additions,
> with primary citations. Where a finding overlaps prior research it is flagged "[confirms prior]".

Each finding is tagged **[HV-LE]** high-value/low-effort, **[HV-ME]** high-value/moderate, or
**[NH]** nice-but-heavy. The doctrine: **automation assists, never forces** — every helper must have a
manual override and must not lock a player out of doing it "by hand."

---

## 1. Digital tabletop sandboxes — what feels good

### Tabletop Simulator (TTS) — the gold standard for manual feel

- **Draw N by hotkey.** Hover a deck and press a number key to draw that many; a ~1s window lets you
  type double digits (press `1` then `2` → draw 12). Hovering a single card and pressing a number
  draws one. → *Pattern:* **hover-a-pile + number-key = draw N**, no dialog. **[HV-LE]**
- **Peek with a visible "I'm peeking" tell.** `Shift+Alt` while hovering shows the card's underside,
  and an **eye icon appears to other players** so peeking can't be silent. → *Pattern:* peeking is
  allowed but **socially visible** — perfect for a trust-based 2p game. **[HV-LE]**
- **Shuffle / deal from right-click radial**; shuffle a hand selection with `R`. Flip with `F`.
- **Snap points gravitate dropped objects** to defined locations; **tags restrict which objects snap**
  to which points (cards-only snap zones), and snap points can be **attached to cards** so overlapping
  rows stay neat. Crucially, snapping is a *gravity assist*, not a lock — free placement still works.
  → *Pattern:* **soft snap zones with free-drop fallback**. **[HV-ME]** [confirms prior]
  - Sources: [How-to-play wiki](https://tabletopsimulator.fandom.com/wiki/How_to_play_guide_for_Tabletop_Simulator),
    [Advanced controls](https://kb.tabletopsimulator.com/player-guides/advanced-controls/),
    [Snap Point Tool](https://kb.tabletopsimulator.com/game-tools/snap-point-tool/),
    [Clean snap points (BGG)](https://boardgamegeek.com/blogpost/117182/tabletop-simulator-clean-snap-points).

### Tabletopia — drag-and-drop + contextual radial menus

- Cards held in a **bottom-of-screen hand area**, rearranged by drag-drop; **`H` hides/shows** the hand,
  **`Space` enlarges** the hovered card, **`F` flips**. Draw / Deal / Shuffle live on a **right-click
  radial**. Stacking: drop a card onto another; `Shift` while adding puts it on the bottom.
- **No undo/redo at all** — and the game is still beloved. Their FAQ confirms undo is "planned" but absent.
  → *Lesson for us:* a manual sandbox **does not need true undo**; a visible **log + manual move-back**
  is enough and avoids the hidden-info problems undo creates. **[HV-LE]**
  - Sources: [Interacting with components](https://help.tabletopia.com/knowledge-base/actions-with-game-objects/),
    [Tabletopia FAQ](https://help.tabletopia.com/knowledge-base/faq/).

### Board Game Arena — the undo *philosophy* (apply, don't copy the engine)

BGA enforces rules, so we don't copy its mechanics — but its **undo policy is the rulebook for our
"take-back"**:

- Undo is "**painful for opponents**"; allowed mainly for **misclicks** or genuine multi-action take-backs.
- Undo is **forbidden once** "no hidden (or private) information has been revealed" is violated, or once
  "a random event with a visible effect" (shuffle, dice roll, card pick) has happened.
- Undo "**must never change the active player**."

→ *Pattern for us:* our move-back/log-rewind should **stop at the last shuffle/dice/reveal** and never
flip whose turn it is. In a trust game this is a **soft warning, not a hard block** ("This will undo a
dice roll — both players should agree"). **[HV-LE]**
  - Sources: [BGA Undo policy](https://en.doc.boardgamearena.com/BGA_Undo_policy),
    [BGA Studio guidelines](https://en.boardgamearena.com/doc/BGA_Studio_Guidelines).

### Screentop.gg — the closest analog to *us*

A browser, no-install **tabletop sandbox supporting "cards, dice, boards, counters, and hidden player
state"** that explicitly does **not** enforce rules; spectators can watch without logging in. Validates
our exact product shape (manual, browser, free, hidden-hand support) as a real category, not a compromise.
  - Sources: [Screentop on Hacker News (author)](https://news.ycombinator.com/item?id=22015718),
    [screentop.gg](https://screentop.gg/).

**Cross-sandbox synthesis — the interactions that feel best:**
1. **Hover + hotkey** beats menus for frequent actions (draw, flip, peek).
2. **Peeking must be visible** to the opponent (eye icon / log line) — trust needs transparency.
3. **Soft snap with free-drop fallback** — never trap a card in a slot.
4. **Right-click radial** for rarer actions (shuffle, deal, send-to-bottom) keeps the surface clean.
5. **No true undo needed** — a readable log + manual rewind is the trust-game-correct substitute.

---

## 2. *The Rivals for Catan* — layout & rules nuances that drive UX

Structure that the table must render and let players move by hand:

- **Two facing principalities.** Each player starts with **2 settlements joined by 1 road, flanked by
  6 region cards**; expansions (roads → settlements → cities, then buildings/units) grow outward.
  The board is **mirror-symmetric** between the two players. → strong, readable **2-player color/side
  identity** anchor.
- **Central card row / draw stacks.** Basic Set = **36 cards split into four face-down draw stacks of 9**,
  plus **face-up center stacks** (roads, settlements, cities) shared by both players. Region deck sits
  near center. → *UX:* the central area is the busiest interaction zone — **draw-stack peek/draw and
  face-up "buy from center" need the lowest-friction interactions.** **[HV-ME]**
- **Theme Sets / eras** (Era of Gold = 1, Turmoil = 2, Progress = 3) are **separated by an era symbol**;
  a Theme game swaps in era-tagged cards (university, pharmacy, trade-advantage cards, etc.).
  → *UX:* a **deck-builder / era picker** and clear **era badges on cards** matter. [confirms prior]
- **Trade & Strength advantage tokens** swing to whoever leads (e.g. most commerce / most strength).
  → *UX:* these are **derived-state indicators** the app can compute and surface as **assist** (badge
  "You hold Trade Advantage") — but in a manual sandbox keep a **manual toggle** so players who track it
  themselves aren't overridden. **[HV-LE]**
  - Sources: [Rivals rules (officialgamerules)](https://officialgamerules.org/game-rules/rivals-for-catan/),
    [Tournament rules PDF (catan.com)](https://www.catan.com/sites/default/files/inline-files/rfc-tournament_game_rules_08-01-15.pdf),
    [Wikipedia: The Rivals for Catan](https://en.wikipedia.org/wiki/The_Rivals_for_Catan),
    [Discarding into draw stacks (BGG)](https://boardgamegeek.com/thread/1479424/).

### What players complain about in the official digital version (Catan Universe)

Concrete, repeated Steam complaints — a **negative checklist** of what to avoid:
- "**UI is clunky … should not require scrolling around**"; "little of the UI is intuitive and some of
  it plain not working."
- "GPU-intensive, battery-hogging, slow-loading bloated software when a board game should run **fast and
  lightweight**."
- Online play "**bugged … often disconnected**," hard to finish games. Aggressive monetization.

→ *Our differentiators (cheap to keep):* **lightweight, no-scroll single-screen table, fast load,
robust reconnection, zero monetization friction.** Being *not bloated* is itself a feature. **[HV-LE]**
  - Sources: [Catan Universe negative reviews (Steam)](https://steamcommunity.com/app/544730/negativereviews/),
    [Catan Universe discussions (Steam)](https://steamcommunity.com/app/544730/discussions/0/3414307711412611709).

---

## 3. Polish patterns that add without clutter

### Juice — maximum output for minimum input

The governing rule (Jonasson & Purho): **"maximum output for minimum input"** — put juice on the
**moment-to-moment actions players repeat constantly** (draw, place, build, roll), not on rare events.
Tasteful + low-effort: **tween/ease state changes** (FLIP-style move animations "reduce cognitive load
when the UI changes"), **redundant sound** that "acknowledges the action," **small scale/bounce** on
place, light **particles** on build/win. Heavier / use sparingly: **screen shake** (needs calibration
or it annoys), elaborate multi-system choreography.

**Recommended SFX map** (original/synth audio only — no copyrighted files in repo, per README):
| Action | Sound | Motion |
|---|---|---|
| Draw card | soft paper *snap*/whoosh | card slides from pile, slight scale-in **[HV-LE]** |
| Place / build | muted *thock* / wood click | drop with tiny squash-stretch + snap settle **[HV-LE]** |
| Dice roll | tumble + settle | dice spin then settle; brief number pop **[HV-ME]** |
| Event card | distinct low *chime* | card flips to center, holds, then docks **[HV-ME]** |
| Advantage swap | short rising note | token slides to new owner, brief glow **[HV-LE]** |
| Win | synth fanfare (README already supports `public/victory.mp3` fallback) | confetti/particles **[HV-ME]** |

Add a **global mute + reduced-motion toggle** (respect `prefers-reduced-motion`). **[HV-LE]**
  - Sources: [Juice (bradwoods.io)](https://garden.bradwoods.io/notes/design/juice),
    ["Juicy" with simple effects (Medium)](https://gamedev4u.medium.com/when-you-play-a-great-game-it-feels-good-d23761b6eccf),
    [Game UI best practices (Procreator)](https://procreator.design/blog/best-practices-for-game-ui-design/).

### Minimal UI / turn-flow without rigid phases

- "**Reduce clutter when the player does not need constant feedback**" — keep the HUD supporting
  immersion, surfacing only essential signals. A manual sandbox should **not** impose rigid phases; show
  a soft, **non-blocking turn banner** ("Red's turn") + a **one-line current-action hint**, never a
  forced wizard.
- **Highlight valid drop zones on drag** ("highlighting of slots/play areas … helps players understand
  card placement") — but as an **affordance hint, not a gate** (you can still drop anywhere).
- Show **event cards center-stage, held, then docked** to a small event slot/log so context survives.
  - Sources: [Procreator](https://procreator.design/blog/best-practices-for-game-ui-design/),
    [Q99 Studio UI/UX tips](https://medium.com/@q99studio/ui-ux-design-tips-for-creating-intuitive-game-interfaces-1eb6c5c90604).

### Accessibility (low-effort, high inclusion)

- **Never rely on color alone** for player identity or turn: pair each side with a **symbol/shape**
  (icon + color), like Ticket to Ride's color+symbol cards. Helps colorblind players *and* general
  readability. **[HV-LE]**
- Provide a **colorblind-safe palette** for the two-player identity; ensure WCAG-ish text contrast.
- Pair turn color with a **text label + icon** ("● Red — your turn").
  - Sources: [Colorblind game design (Calliope)](https://calliopegames.com/9699/accomodations-for-color-blind-players/),
    [Colour blindness in board games (Meeple Like Us)](https://www.meeplelikeus.co.uk/board-games-colour-blindness/).

---

## 4. Fresh, tasteful additions for a manual 2p sandbox

Only additions that **respect "we mainly want to play manually"** (each is an assist with a manual path):

1. **Quick action log / move feed** ("Blue drew 1 from Stack 2", "Red built City") — the trust-game
   substitute for undo, and the audit trail. **Peeks and dice/shuffles must log** (transparency). **[HV-LE]**
2. **Hover-pile + key to draw N** and **right-click radial** for shuffle/deal/send-to-bottom — match
   TTS/Tabletopia muscle memory. **[HV-LE]**
3. **Pile peek with a visible tell** — fan out a draw stack to look; the opponent sees an "eye"/log line.
   No silent peeking. **[HV-LE]**
4. **Soft snap zones with free-drop fallback** for the principality grid + center row — neat by default,
   never trapping. **[HV-ME]**
5. **One-click common actions** computed but optional: "Take Trade Advantage", "Pay 1 ore (auto-move
   token)", "Roll event die" — each also doable by hand; **derived advantage badges** with a manual
   override. **[HV-LE/ME]**
6. **Manual rewind** (step the log back) gated by a **soft warning at the last shuffle/dice/reveal**,
   never auto-flipping the active player — the BGA philosophy applied to a trust game. **[HV-ME]**
7. **Era/deck picker + era badges** on cards for Theme Set games. **[HV-ME]**
8. **Spectate-style "show table" / shareable state** (Screentop-like) — low priority. **[NH]**

---

## Prioritized verdict

**Do first (HV-LE):** quick action log incl. peek/dice/shuffle lines · hover-pile + number-key draw and
right-click radial · visible-tell pile peek · derived advantage/derived-state **badges with manual
override** · color+symbol player identity · SFX map for draw/place/build/roll/win + mute + reduced-motion.

**Next (HV-ME):** soft snap zones w/ free-drop · event card center-stage→dock · manual log rewind with
soft warning at the last random/reveal · era picker + badges · dice/event juice.

**Defer (NH):** screen-shake/heavy choreography · shareable spectate state · anything that *enforces*
rules or *blocks* a manual move.

**North star:** the official Catan Universe is hated for being **clunky, scroll-y, bloated, and flaky
online**. Winning is mostly *not doing that* — a fast, single-screen, lightweight, transparent, manual
table where every automation is an optional assist.

---

### Source index
- TTS: [How-to-play wiki](https://tabletopsimulator.fandom.com/wiki/How_to_play_guide_for_Tabletop_Simulator) ·
  [Advanced controls](https://kb.tabletopsimulator.com/player-guides/advanced-controls/) ·
  [Snap Point Tool](https://kb.tabletopsimulator.com/game-tools/snap-point-tool/) ·
  [Clean snap points (BGG)](https://boardgamegeek.com/blogpost/117182/tabletop-simulator-clean-snap-points)
- Tabletopia: [Interacting with components](https://help.tabletopia.com/knowledge-base/actions-with-game-objects/) ·
  [FAQ](https://help.tabletopia.com/knowledge-base/faq/)
- BGA: [Undo policy](https://en.doc.boardgamearena.com/BGA_Undo_policy) ·
  [Studio guidelines](https://en.boardgamearena.com/doc/BGA_Studio_Guidelines)
- Screentop: [HN (author)](https://news.ycombinator.com/item?id=22015718) · [screentop.gg](https://screentop.gg/)
- Rivals: [officialgamerules](https://officialgamerules.org/game-rules/rivals-for-catan/) ·
  [Tournament PDF (catan.com)](https://www.catan.com/sites/default/files/inline-files/rfc-tournament_game_rules_08-01-15.pdf) ·
  [Wikipedia](https://en.wikipedia.org/wiki/The_Rivals_for_Catan)
- Catan Universe complaints: [Steam negative reviews](https://steamcommunity.com/app/544730/negativereviews/) ·
  [Steam discussions](https://steamcommunity.com/app/544730/discussions/0/3414307711412611709)
- Juice/UI: [Juice (bradwoods)](https://garden.bradwoods.io/notes/design/juice) ·
  [Juicy effects (Medium)](https://gamedev4u.medium.com/when-you-play-a-great-game-it-feels-good-d23761b6eccf) ·
  [Game UI best practices (Procreator)](https://procreator.design/blog/best-practices-for-game-ui-design/) ·
  [Q99 UI/UX tips](https://medium.com/@q99studio/ui-ux-design-tips-for-creating-intuitive-game-interfaces-1eb6c5c90604)
- Accessibility: [Calliope colorblind](https://calliopegames.com/9699/accomodations-for-color-blind-players/) ·
  [Meeple Like Us](https://www.meeplelikeus.co.uk/board-games-colour-blindness/)
