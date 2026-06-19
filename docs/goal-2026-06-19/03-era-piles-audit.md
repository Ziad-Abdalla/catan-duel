# F1 — Era draw-stack tuck bug audit (DRAW-STACK / era-deck lens)

**Date:** 2026-06-19 · **Scope:** the era draw-stack ("Nachziehstapel") system and the
owner bug F1: "when you play other eras you can only shuffle era cards to the BASE piles
1–4, not their respective 5 or 6 piles." Shared DISCARD pile is out of scope and works fine.

**Verdict: the bug is purely a UI hardcode.** The engine and `newGame` already build the
extra era stacks correctly at indices 4, 5, 6 … and `discardToStack` accepts any
`stackIndex`. THREE separate "Exchange under stack" UIs hardcode `[0, 1, 2, 3]`, so the
buttons never expose stacks 5+. Fix = make those three loops render `state.drawStacks.length`
buttons.

---

## 1. How `drawStacks` is constructed (newGame / setup)

File: `src/engine/newGame.ts:78-88`.

```ts
const baseDeck = shuffle(buildDrawDeck(['base']), rng)
const drawStacks: string[][] = [[], [], [], []]   // L81 — 4 base stacks, ALWAYS
baseDeck.forEach((id, i) => drawStacks[i % 4].push(id))   // L82 — round-robin into 4
for (const era of sets.filter((s) => s !== 'base')) {     // L84 — each enabled era…
  const eraDeck = shuffle(buildDrawDeck([era]), rng)
  const half = Math.ceil(eraDeck.length / 2)
  drawStacks.push(eraDeck.slice(0, half), eraDeck.slice(half))  // L87 — pushes TWO stacks
}
```

- **The count is NOT fixed at 4 — it is `4 + 2 × (#enabled eras)`.**
  - Base only → 4 stacks (indices 0–3).
  - Base + 1 era (e.g. Gold) → 6 stacks (0–3 base, **4 & 5** = Gold). ← the owner's "5/6".
  - Base + 2 eras → 8 stacks (…6 & 7 = second era).
  - Base + 3 eras → 10 stacks (indices 0–9).
- `buildDrawDeck` (`newGame.ts:8-17`) flattens only `building | hero-or-unit | action`
  cards of the named set, by `copies`. Drawable-card counts per set (from `cards.json`):
  **base 36, gold 24, turmoil 24, progress 26** → each era splits into two ~12-card stacks.
- Each era stack is HOMOGENEOUS to its set: every id in stacks 4/5 starts with `gold-…`,
  etc. The deck-wall reads each pile's set from `st[0].split('-')[0]` to pick the themed
  back (`CentralWall.tsx:112`, `CenterColumn.tsx:142`).
- `cards.json` structure: flat array, each card has `set` ∈ {base, gold, turmoil, progress}
  and `category`; era grouping is purely by the `set` field (no pre-bundled stacks in JSON).

This MATCHES the official rule. `docs/OFFICIAL_SETUP_VERIFICATION.md:141`:
> "In **Themenspiele** the base set is split into **3 stacks of 12** instead, plus 2
> theme-set stacks."

Minor deviation (not the F1 bug): the official theme game uses **3** base stacks of 12,
but `newGame` keeps **4** base stacks even in theme play (`drawStacks: [[],[],[],[]]` is
unconditional). Functionally harmless for a trust-based sandbox, but worth noting if exact
fidelity is wanted later. The era stacks themselves are correct (2 per era).

## 2. The "tuck under a stack" UI — what stacks it exposes

`discardToStack` (the tuck/exchange action) and `grantCard` (pull from a stack) both accept
ANY index in the engine. The limitation is entirely in three UI components, each hardcoding
`[0, 1, 2, 3].map(...)`:

| # | File:line | Surface |
|---|-----------|---------|
| 1 | `src/ui/board/HandView.tsx:41` | hand toolbar — "Exchange under stack: 1 2 3 4" |
| 2 | `src/ui/board/CardZoom.tsx:125` | zoomed-card overlay — "Exchange under stack" |
| 3 | `src/ui/board/ResolutionPanel.tsx:347` | resolution panel — "discard → stack N" |

(A 4th `[0,1,2,3]` at `src/ui/CenterArt.tsx:276` is UNRELATED — it draws SVG grain kernels,
not stacks. Leave it.)

The deck-wall RENDER side is already dynamic (`state.drawStacks.map(...)` in
`CentralWall.tsx:111` and `CenterColumn.tsx:134`), so you can DRAW from era stacks 5/6 fine —
you just can't TUCK into them. That's the asymmetry the owner hit.

## 3. Bug reproduction / root cause

Enable an era (e.g. Gold) via the top-bar chip → `newGame` builds 6 stacks (0–5). The
deck wall shows all 6 (draw works). But to return/exchange a card, the player uses the hand
toolbar / card zoom / resolution panel — all three iterate `[0, 1, 2, 3]`, so only buttons
"1 2 3 4" appear. Stacks 5 and 6 (the Gold stacks, indices 4 & 5) have no button.

**Root cause = (b) the UI hardcodes 4 buttons.** It is NOT (a) — extra stacks ARE created;
not (c) — era cards DO have home stacks (4 & 5…); the home stacks simply aren't reachable
from the tuck UI. The engine reducer `discardToStack` (`actions.ts:537-546`) tucks to
`stackIndex` with no upper bound:
```ts
const drawStacks = out.drawStacks.map((st, i) =>
  i === a.stackIndex ? [a.cardId, ...st] : st)   // L542-544
```

## 4. Correct structure per official rules / docs intent

Yes — **eras get their own numbered stacks beyond 4.** Per
`OFFICIAL_SETUP_VERIFICATION.md:141`, a theme game = (3 base stacks) + (2 stacks per theme
set). The code's intent (PROGRESS.md:175,186-187) is "each enabled era → 2 themed draw
stacks". So with Gold enabled the stacks are: 1–4 base, **5 & 6 Gold**. The owner's
expectation is correct; cards from any set should be tuckable under any of the existing
stacks (trust-based sandbox — no per-set restriction needed, just expose every stack).

## 5. Exact fix list (file:line)

Replace the hardcoded `[0, 1, 2, 3]` with the live stack count in all three tuck UIs.
Each component already has access to the stacks:

1. **`src/ui/board/HandView.tsx:41`** — uses `useGame((s) => s.state...)`. Add a
   `drawStacks` selector (or read `state.drawStacks.length`) and render
   `Array.from({ length: drawStacks.length }, (_, i) => i)` instead of `[0,1,2,3]`.
2. **`src/ui/board/CardZoom.tsx:125`** — same change; component already reads game state
   (has `exchange(i)` handler).
3. **`src/ui/board/ResolutionPanel.tsx:347`** — already has
   `const stacks = useGame((s) => s.state.drawStacks)` at **L323**. Change `[0, 1, 2, 3]`
   to `stacks.map((_, i) => i)` (or `[...stacks.keys()]`). The `disabled={!stacks[i]}` guard
   already there will gray out absent indices, so this one is the cleanest.

No engine change required — `discardToStack` (`actions.ts:537`) and `grantCard`
(`actions.ts:659`, `fromStack`) already handle arbitrary indices.

### Shuffle / auto-trigger behavior
- Tucking does NOT and should not auto-shuffle: official "exchange" tucks the card UNDER the
  chosen stack (face-down to the bottom). The engine already does exactly this
  (`[a.cardId, ...st]` prepends to the array, and draws `pop()` from the END /
  `stack[stack.length-1]`, so prepend = bottom). No shuffle needed; correct as-is.
- Only the EVENT deck auto-reshuffles, and only on Yule (`actions.ts:584-589`) — unrelated
  to draw stacks. No new shuffle trigger is required for this fix.
- Optional nicety (not required): label the buttons with the stack's set so the player knows
  "5/6 = Gold" — derive from `st[0]?.split('-')[0]` like the deck wall does. Purely cosmetic.

---

### One-line summary
F1 is three UI hardcodes of `[0,1,2,3]` (`HandView.tsx:41`, `CardZoom.tsx:125`,
`ResolutionPanel.tsx:347`); make each render one button per `state.drawStacks` entry. Engine
and `newGame` already create + accept era stacks 5/6+. No shuffle change needed.
