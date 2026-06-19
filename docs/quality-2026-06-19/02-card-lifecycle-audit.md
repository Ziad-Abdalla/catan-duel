# Card Lifecycle Correctness Audit — Catan Duel

Lens: **card lifecycle correctness** — duplication, non-removal, wrong-zone.
Scope: `src/engine/actions.ts`, `src/data/cards.ts`, `src/data/setup.ts`, `src/engine/newGame.ts`, and the UI play/build/take paths.
Date: 2026-06-19. READ-ONLY audit.

---

## P0 — Owner's bug: "buildings, when used, are still not removed from the public pile"

### Root cause (confirmed)

The three era "Face-up Expansion" buildings — **Merchant Guild** (`gold-merchant-guild`),
**Hedge Tavern** (`turmoil-hedge-tavern-1x`), **University** (`progress-university`) — exist
in **TWO independent zones at once**, and the build path never touches the pile:

1. **They are seeded into the public draw stacks.** `buildDrawDeck` in
   `src/engine/newGame.ts:8-17` includes every card whose `category` is
   `building | hero-or-unit | action`. All three Face-up Expansions are
   `category: "building"` with `copies: 2`, so **2 copies of each land in `drawStacks`**
   (verified: with Gold enabled, `gold-merchant-guild` appears twice in the draw deck).

2. **They are ALSO always offered in the Build supply as buildable pieces**, independent of
   any pile. `src/ui/board/BuildSupply.tsx:38-40` selects them by `tag === 'Face-up Expansion'`
   and renders an always-present draggable button (`BuildSupply.tsx:86-106`). The comment at
   `BuildSupply.tsx:35-37` states the intent: "build straight from the supply (the rest are drawn)".

3. **Building one from the supply dispatches `playCard` with that card id** — but `playCard`
   only removes the card from the player's **hand**, never from a pile. In
   `src/engine/actions.ts:568-585`:
   ```ts
   const i = p.hand.indexOf(a.cardId)   // -1 for a supply build → nothing removed
   if (i >= 0) p.hand.splice(i, 1)
   if (pay) spendCost(p, cost)
   p.placed.push({ cardId: a.cardId, slot: a.slot })
   ```
   The drop handlers that reach this are `Site.place()` in
   `src/ui/board/PrincipalityBoard.tsx:185-192` and the zoom `play()` in
   `src/ui/board/CardZoom.tsx:63-70`. Neither passes a `fromStack`/pile index; `playCard`
   has no pile parameter at all.

**Net effect:** you "use"/build a Face-up Expansion from the supply, it goes to `placed`, but
**its 2 copies are still sitting in the public draw stacks** — visible and drawable. That is
exactly the owner's report: a used building remains available in the central pile. It is a
**design-level duplication**: the card is double-sourced (supply + stacks) with no reconciliation.

There is a second, sharper face of the same bug on **removal**: when a supply-built Face-up
Expansion leaves play, `discardHome` (`actions.ts:232-238`) returns `'supply'` for it
(`tag === 'Face-up Expansion'` → early return), so `removePlaced`/`discardCard` send it to *no
zone at all* (it just vanishes from `placed`, not added to discard). For a true "limited supply"
building this is fine only because the supply is modelled as infinite (the button is always
there). But the draw-stack copies are never the supply that's being decremented — so the pile
copies are pure duplicates with no lifecycle tie to the supply button. The existing test
`refactor.test.ts:89-98` only asserts the discard behaviour, never the pile, so it passes while
the duplication is live.

### Why a player sees it

With an era enabled: open a draw stack browser (`StackBrowser`) or just look at the deck wall
counts — the Face-up Expansion copies are in there. Build the same building from the supply bar.
The building is now in your principality AND still in the stack → 3 copies of the same building id
exist across zones (2 in stacks + 1 placed) when the physical game has only 2.

### Fix direction (pick one; option A is the rules-correct one)

- **A — Single source of truth = the supply, NOT the stacks (recommended).** Exclude
  `tag === 'Face-up Expansion'` from `buildDrawDeck` (`newGame.ts:13`) so Face-up Expansions
  never enter `drawStacks`. They live only as supply buttons. Track remaining supply count
  per Face-up id (e.g. a `supply: Record<string, number>` zone seeded to `copies`); building
  decrements it, removal increments it, and `BuildSupply` disables the button at 0. This makes
  `discardHome → 'supply'` actually mean something. This matches the real game: face-up
  expansions sit in a visible limited supply, not in the draw decks.
- **B — Single source of truth = the stacks.** Keep them in the draw deck, drop the always-on
  supply buttons, and require drawing them like any other card. Simpler but loses the
  "build straight from supply" UX the code intends.

Either way the invariant to add: **a Face-up Expansion id must exist in exactly one of
{stacks, supply-counter} — never both.**

---

## Finding 2 — `playCard` is a pure materialiser, not a move (general duplication risk)

`playCard` (`actions.ts:568-585`) removes only from `hand` and never from `drawStacks`,
`discard`, or any supply. Every UI path that calls `playCard` with a `cardId` that is **not in
the player's hand** therefore materialises a card from nothing:

- `Site.place()` — `PrincipalityBoard.tsx:189` — drop target reads
  `e.dataTransfer.getData('text/cardid') || dragCardId`. The Build supply era buttons set
  `text/cardid` to the era building id (`BuildSupply.tsx:96`), so dropping one calls `playCard`
  for a card never in hand → the pile copy persists (the P0 path).
- `CardZoom.play()` — `CardZoom.tsx:67` — when opened `from: 'build'` the zoom hides the play
  buttons (`CardZoom.tsx:109-115` only shows hints for `from==='build'`), so this is currently
  reachable only for hand cards. Safe today, but fragile: nothing in `playCard` enforces
  "card came from hand".

Fix direction: give `playCard` an explicit source (`from: 'hand' | 'supply'` or a
`fromStack?`) and only `placed.push` after a successful removal from the named source; for a
supply build, decrement the supply counter from finding 1. Add an assertion/log when the id is
absent from the claimed source so the no-op duplication can't pass silently.

---

## Finding 3 — Other era/hero/unit/action cards: NOT duplicated (good)

Non-Face-up cards (hero/unit/action/normal buildings) are **only** in `drawStacks`. The Build
supply only ever surfaces the 4 base structures + Face-up Expansions, so they cannot be built
without first drawing (which slices the stack: `drawToHand` `actions.ts:557-566`,
`takeFromStack` `actions.ts:683-694`). Across all eras (gold/turmoil/progress) the duplication
is confined to the 3 Face-up Expansion ids. The base structures
(`base-settlement/-city/-road`) are intentionally infinite/structural and never in any pile —
correct.

---

## Finding 4 — `discardHome()` routing review (`actions.ts:232-238`)

```ts
if (c.tag === 'Face-up Expansion') return 'supply'
if (['settlement','city','road','region'].includes(c.category)) return 'supply'
return 'discard'
```

- Face-up Expansions → `'supply'`: correct intent, but currently a black hole because there is
  no supply zone to return them to (finding 1). They just disappear from `placed`.
- Structural pieces (settlement/city/road/region) → `'supply'`: correct — they're infinite/board
  furniture, not deck cards. Removing them should not add to discard (verified: `removePlaced`
  `actions.ts:528-543` only appends to discard when `home==='discard'`).
- Everything else (normal buildings, heroes/units, actions) → `'discard'`: correct. These came
  from the draw stacks; removing/discarding routes them to the shared discard, from which
  `drawFromDiscard` (`actions.ts:662-672`) can recirculate them. No leak.

One subtlety: a **normal building drawn from a stack, then removed, goes to `discard`** — it does
NOT return to the stack bottom. That's a reasonable model (shared discard = the recirculation
zone) and is internally consistent. Not a bug, but worth noting vs the physical game where some
buildings return under the deck.

---

## Finding 5 — Zone leak / loss scan (all reducers)

Walked every card-moving reducer. Conservation holds EXCEPT for the Face-up Expansion case:

| Reducer | removes from | adds to | conserved? |
|---|---|---|---|
| `drawToHand` (557) | stack top | hand | ✓ |
| `takeFromStack` (683) | stack[idx] | hand | ✓ |
| `putToStack` (696) | hand | stack | ✓ (guarded by `hand.includes`) |
| `discardToStack` (602) | hand | stack bottom | ✓ |
| `discardCard` (613) | hand/placed | discard or supply(void) | ✓ for discard; **Face-up → void** |
| `drawFromDiscard` (662) | discard[idx] | hand | ✓ |
| `playCard` (568) | hand only | placed | **leaks if id not in hand** (finding 1/2) |
| `returnToHand` (587) | placed | hand | ✓ |
| `removePlaced` (528) | placed | discard or supply(void) | ✓ for discard; **Face-up → void** |
| `movePlaced` (545) | — | — (slot only) | ✓ |
| `grantCard` (797) | optional stack | hand | ✓ when `fromStack` given; **materialises** when not |
| `drawEvent` (642) | eventDeck top | (cycles to bottom / reshuffles) | ✓ |
| `drawRegion`/`expandSpine`/`placeLandscape` | regionStack | regions | ✓ |

- **`grantCard` (`actions.ts:797-813`)** is an intentional materialiser (resolution toolkit:
  "gain a card"). When called with `fromStack` it correctly slices that stack
  (`actions.ts:799-808`); when called WITHOUT `fromStack` (the common path from
  `ResolutionPanel` `CardTool`, `ResolutionPanel.tsx:339`) it conjures a fresh copy into hand
  with no pile removal. For a trust-based "enact any effect" tool this is by design, but it is a
  duplication vector if a player uses it to grant a building that is also a finite supply/pile
  card. Lower severity than P0 (manual, deliberate), but the same class. Consider defaulting
  `CardTool`'s grant to pull from a stack when the chosen id exists in one.
- **`discardCard` from `placed`** uses `a.placedIndex!` after the hand branch; if
  `from==='placed'` but `placedIndex` is invalid it `return s` early (`actions.ts:624`) — safe.
- No reducer drops a card on the floor except the Face-up `'supply'` void above.

---

## Severity summary

| # | Issue | Severity | File:line |
|---|---|---|---|
| 1 | Face-up Expansions exist in BOTH draw stacks and the always-on supply; building one never removes the pile copies → **used building stays in the public pile** | **P0** | `newGame.ts:13`, `BuildSupply.tsx:38`, `actions.ts:568` |
| 1b | Removed Face-up Expansion routes to `'supply'` but no supply zone exists → card vanishes | P1 | `actions.ts:235`, `removePlaced` 528 / `discardCard` 631 |
| 2 | `playCard` removes only from hand; no source enforcement → silent materialise | P1 | `actions.ts:577` |
| 5a | `grantCard` without `fromStack` materialises (toolkit, by design but a vector) | P2 | `actions.ts:809`, `ResolutionPanel.tsx:339` |

**The one fix that closes the owner's P0:** exclude `tag === 'Face-up Expansion'` from
`buildDrawDeck` (so they are never in the draw stacks) and model the supply as a finite,
decrementing counter that `playCard`/`removePlaced` adjust. Add an invariant test: for every
enabled era, no `Face-up Expansion` id appears in `drawStacks`, and building one from supply
leaves total copies (placed + supply-counter) equal to `copies`.
