# AI Opponent — build status & honest notes

Implementation of `GOAL.md`. All code lives under `src/ai/` (isolated from the live
game — enforced by `src/ai/isolation.test.ts`). The only edits to existing files are
additive: a lazy `#/ai` route in `main.tsx`, an `ai:selfplay` npm script, two
`tsconfig` excludes for node-only harness files. The live game is unchanged (its 158
tests still pass).

## Phases

| Phase | What | Gate | State |
|---|---|---|---|
| 1 | Formal rules-enforcing sim (state/setup/dice/events/moves/win/rng) | random-legal games reach a legal win, 0 illegal | ✅ |
| 2 | Base card effects + heuristic evaluator + self-play harness | base self-play sane, 0 illegal, cards exercised | ✅ |
| 3 | ISMCTS + Easy/Medium/Hard | Hard ≫ Easy | ✅ (see below) |
| 4 | Standalone AI screen (`#/ai`) | full human-vs-bot game completable, isolation | ✅ |
| 5 | Era of Gold | gold self-play sane, gold economy used | ✅ |
| 6 | Era of Turmoil | turmoil self-play sane, attacks+defenses fire | ✅ |
| 7 | Era of Progress + Duel | progress/duel self-play sane | ✅ |

## The AI

- **Decision core:** open-loop determinized ISMCTS. Each iteration re-samples the
  opponent's hidden hand + deck order and lets the dice resolve fresh; tree nodes are
  keyed by move sequences. Leaves are seeded with an **evaluation prior** (first-play
  urgency) and refined with short (depth-12) rollouts under the fast policy.
- **Difficulty:** Easy = fast priority heuristic (no search); Medium = ISMCTS 400
  iters; Hard = ISMCTS 1600 iters. Live UI honours a wall-clock cap; self-play is
  iteration-bounded for determinism.

### Strength (self-play, seeded; reports under `reports/`)
- Medium vs Easy: **76%** · Medium vs the strong 1-ply greedy baseline: **56%**.
- **Hard vs Easy (60 games): 83.3%** — comfortably clears the ≥65% gate.
  (The report's "seat bias" flag is a false positive: this matchup fixes p0=Hard,
  p1=Easy, so p0 *should* win more. True seat balance is the greedy-vs-greedy runs:
  52.5/47.5 and 50/50.)
- The eval-prior was the key fix: before it, Hard ≈ greedy (the heuristic is strong, so
  1-ply already captures most of it); the prior anchors search to the heuristic and
  improves on it with depth.

### Realistic ceiling
As stated in the goal: Rivals is high-variance (dice + draws), so no bot wins
consistently. Expect a competitive-to-favoured opponent, not an unbeatable one.

## Tests
`npm test` — 182 tests. AI-specific: sim invariants & playthrough, base rules
fidelity (doubling/storehouse/brigand/ships/scout/relocation), Gold/Turmoil/Progress
effect tests, ISMCTS (beats greedy, time cap), isolation, UI mount + full-game flow.

## Documented approximations (honesty)
These keep scope tractable while preserving the *spirit* of each rule. None affect the
live game.

1. **Road cost** uses `cards.json` (1 lumber + **2** brick); the rulebook says 1+1.
   Centralised in `cards/spine.ts` — fix the corpus and it updates. (Flagged in GOAL.)
2. **Open-stack key buildings** (Merchant Guild / Hedge Tavern / University) are dealt
   into the face-down draw stacks rather than a separate always-available open stack.
   Functionally similar; availability timing differs slightly.
3. **Sub-choices** ("take any 1 resource", forced discards, which card to bury) are
   auto-resolved by a heuristic *inside* `apply` rather than exposed as moves — keeps
   the search branching tractable. The big strategic choices remain explicit.
4. **Reactive cards** are approximated (no full interrupt system): Sebastian → a small
   immediate benefit; Reiner → immediate Celebration bonus then roll; Relocation →
   structural no-op. All others are faithful.
5. **Duel** = all four sets combined + 13 VP. The half-moon "half-deck" removal (one
   copy of each key building) is **not** applied — the half-moon symbol isn't present
   in `cards.json`.
6. **Defense rolls** (Lookout Tower + Heinrich) use a single die check.
7. **Board geometry** is abstracted: each center borders a region group; 2 build sites
   per center. Faithful enough for doubling/Plague/Year-of-Plenty adjacency.
8. **Starting region→number** map comes from the operator-verified `src/data/setup.ts`.

## Cards the greedy self-play bot rarely/never picks (functional, unit-tested)
Scout, Relocation, Goldsmith, Parish Hall, Trade Master, Irmgard, Tithe Barn, and the
Progress University tech-tree (Chief Cannoneer / Building Crane / Parliament /
Three-Field / Mineral Mining) are conditional/deep-chain cards a 1-ply greedy can't
value or reach. Their mechanics are wired and covered by unit tests; the MCTS bot uses
more of them.

## How to use
- Play: open the app, go to `#/ai`, pick difficulty + seat.
- Self-play: `npm run ai:selfplay -- --mode <base|gold|turmoil|progress|duel> --games N --seed S --p0 <fast|greedy|mcts:easy|mcts:medium|mcts:hard> --p1 ...`
