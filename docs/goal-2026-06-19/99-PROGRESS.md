# Goal progress — 2026-06-19 (COMPLETE)

Every requirement in 00-MASTER-REQUIREMENTS.md addressed. Gate green: 131 unit/fuzz tests,
tsc clean, production build OK, e2e 3 specs / 78 screenshots / 0 console errors.

| Req | What shipped | Verify |
|-----|--------------|--------|
| A1/A2 auto-log | `logged()` added to roll, production, region rotate/set, drawRegion, expandSpine, placeLandscape, transfer, setToken, adjustVP/Stat, grantCard, move, stack ops, endTurn; one-click **Brigand resolver** logs "Brigand: <name> over 7 — lost X gold + Y wool" | goal-actions.test.ts; audit-log screenshot shows rolls+production |
| B1 icons | **HYBRID (owner-chosen):** board pieces use Ziad's official high-res art (he pushed `fd0961f` "fixed the art" — settlement+road) with a **player-colour ring** (red p0 / blue p1, verified #b5403a / #2f6aa0) for at-a-glance identity. My SVG-icon approach was reverted in favour of his art; `PieceIcon.tsx` deleted. ⚠️ **`city.webp` is still the OLD low-res** — Ziad fixed settlement+road only; drop an official city scan into `src/assets/buildings/city.webp` to match. | board screenshots (red/blue rings) |
| C1 stacking | Building sites match the rulebook: settlement 1 above+1 below, city 2 above+2 below, **1 card per site** (was: uncapped, 2 stacked on a settlement) | drove city → 2 upper sites; settlement caps at 1/side |
| C2 costs reduce | Site/tavern drops now pay via the toggle; verified marketplace play reduced resources by its cost with a visible log line | end-to-end pay check (−2, log "(-1 wheat, -1 wool)") |
| C3 manual pay | Global **Pay / Free** toggle in the HUD (default Pay); every build/play honours it | ui-flows screenshot |
| C4 move/destroy | New `movePlaced`; drag a placed piece onto a free site to MOVE it; removePlaced unchanged | goal-actions.test.ts |
| D1 peek pile | **Stack browser** modal: peek face-up, take any card, put a hand card top/bottom, shuffle. New `shuffleStack`/`takeFromStack`/`putToStack` (seeded → sync-safe) | stack-browser screenshot |
| D2 everything possible | Move, peek, take, put, shuffle + the existing resolution toolkit (resources, dice, scoring, advantages) | — |
| E1/E2 declutter/phases | Removed the 4-step phase rail + Next-phase button (free manual play); slim turn row | wall screenshots |
| F1 era stacks 5/6 | Tuck/exchange/draw/browse all enumerate the real `drawStacks` (4 + 2·eras), not a hardcoded 1–4 | 6 stacks with Gold; browse stack 6 |
| G1/G2 alive/bg | Each theme re-tints the **visible** mat (gold/turmoil/progress/duel); mat gently breathes; HUD theme picker decoupled from card sets | theme screenshots |
| H1–H4 e2e | Playwright harness: every reducer + real UI clicks + 3×40 randomized orders, screenshot each, invariants + clean-console asserted | `npm run e2e` |

## Notes / deliberately not done
- Discard pile left as-is (owner said it works).
- Dead `Board`/`Principality`/`MiniCard`/`HandView` subtree (ship-water, deploy-pop) left in place — not rendered; removing it is a separate cleanup, out of scope and risky mid-change.
- HUD is functional but still has several controls; further consolidation possible later.
- Online sync untouched beyond what the new serializable actions inherit (they broadcast + undo like all others).

## Commits
- 0e4fa34 engine + interaction overhaul
- ad5ed18 living table + declutter
- 482813a modern piece icons
- 6c8a77a e2e harness
(+ this docs commit)

NOT pushed: shared repo (Ziad-Abdalla/catan-duel, master) with no standing push auth — left for the owner.
