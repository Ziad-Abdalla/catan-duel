# Locked decisions & root causes (2026-06-19)

Synthesis of investigations 01–06. Each row = root cause + the fix direction. Implement against this.

## Rule decisions (from official rulebook — see 06-official-rules-research.md)
- **Building sites:** settlement = **2 sites** (1 above, 1 below); city = **4 sites** (2 above, 2 below). **Each site holds exactly 1 expansion.** Upgrading settlement→city adds the 2 extra sites.
  - This resolves **C1**: today every seat has one uncapped `up` + one `down` zone, so 2 cards pile into a settlement's single above-zone, and cities never gain extra sites. FIX: model `up`/`down` site **counts** per seat type (settlement 1+1, city 2+2) and 1 card per site.
  - Trust-based: render the correct sites; a site is a 1-card drop zone. Keep free remove/move; no harsh blocking elsewhere.
- **Era/theme decks:** theme game adds **2 separate theme draw stacks** (the "5/6"). Resolves **F1**.
- **Look-through-a-stack:** order is preserved; reshuffle ONLY when a card says so (Scout=regions, Yule=events). So peek/take should NOT auto-shuffle by default; offer an explicit "shuffle" affordance (owner's "auto shuffle" = make shuffle available + one-click).
- **Destroyed cards:** voluntary removal/actions → discard; some attacks → bottom of a draw stack. Keep current discardHome logic; add explicit "to bottom of stack" option.

## Bug root causes → fixes
| ID | Root cause | Fix |
|----|-----------|-----|
| C2 | Tavern/era face-up buildings drop via `playCard pay:false` (`PrincipalityBoard.tsx:179`); structural drops auto-pay silently/invisibly | Make pay interactive+visible; deduct on pay; cost flash/toast |
| F1 | UI hardcodes `[0,1,2,3]` in HandView:41, CardZoom:125, ResolutionPanel:347; engine already creates 4+2·eras stacks | Render one target per actual `drawStacks` entry |
| A1/A2 | ~11 reducers don't log (roll, applyProduction, transferResource, rotate/setStored, expandSpine, setToken, adjustVP/Stat, grantCard, endTurn); Brigand has no action | Add `logged()` to those reducers; add a Brigand resolve action that logs the steal |
| C1 | No per-seat site model/cap (see rule above) | Site grid: settlement 1up/1down, city 2up/2down; 1 card/site |
| C4 | Only `removePlaced`; no MOVE | Add `movePlaced` (placedIndex→slot) + slot move-drops |
| D1 | Stacks are top-pop black boxes; no peek/take/shuffle | Add `shuffleStack`, `takeFromStack`, `putToStack` (seeded shuffle); stack-browser modal |
| G1/G2 | Per-era bg only when era enabled (off by default); ambient orbs occluded; ship-water + deploy-pop wired to DEAD `Board`/`MiniCard` subtree | Make default game alive: ambient motion visible, era bg selectable/visible, wire or port the dead juice into live `PrincipalityBoard`; lift occluding opacity |
| E1 | UI clunky/too much | Declutter HUD/panels during the UI pass |
| E2 | Turn phases | Optional; de-emphasize, keep non-blocking |
| B1 | Icons outdated (CenterArt SVG road/settlement/city) | Redesign via frontend-design |

## Batch plan
- **B1 Engine (TDD, pure):** C2 pay, A1/A2 logging, C4 movePlaced, D1 stack actions, C1 site-model support. All with tests.
- **B2 UI wiring:** F1 dynamic stacks, C1 site grid, C2/C3 manual-pay UI, D1 stack-browser, C4 move-drops, AuditLog polish.
- **B3 Icons/art:** B1 redesign road/settlement/city/building icons.
- **B4 Alive + declutter:** G1/G2 juice on default game, E1 declutter, E2 phases.
- **B5 e2e harness:** Playwright — every action, screenshot each, many orders, invariants, logs (H1–H4).
- **B6 Full gate + visual sweep + close.**
