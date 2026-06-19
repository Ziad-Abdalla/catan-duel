# Quality marathon — 2026-06-19 (research, audit, fixes)

Owner directive: research how the best digital/tabletop versions are polished (respecting our MANUAL
sandbox), audit what we have, then implement + test + iterate until it's an incredibly polished, fully
playable Catan Duel (any era, any combination of actions/events), minimal & non-cluttered. Findings are
recorded here so the whole team can see them.

## Findings docs
- [01 — Tabletop UX research](01-research-tabletop-ux.md) — how TTS/Tabletopia/BGA/Yucata + the Rivals digital versions feel polished; manual-first patterns; SFX map; the "don't be Catan Universe (clunky/scrolling/bloated)" checklist.
- [02 — Card-lifecycle audit](02-card-lifecycle-audit.md) — **P0:** Face-up Expansions double-sourced (pile + supply) → "used buildings stay in the public pile"; **P1:** removed Face-up cards vanish (no supply zone); playCard is a pure materialiser (no source enforcement).
- [03 — UI/completeness audit](03-ui-completeness-audit.md) — completeness is clean (every era + event resolvable); polish: silent endTurn/VP, low-res city.webp, build-supply vs board art mismatch, HUD clutter, dead components, blank cards, a11y.

## Fix batches (this session) — see CHANGES.md for what shipped
- **Q1 Card-lifecycle (P0/P1):** Face-up Expansion supply model — out of draw stacks, finite supply counter, correct return on remove. TDD + invariant.
- **Q2 Art consistency:** city → clean SVG (low-res photo dropped); unify build-supply rendering with the board (PieceArt).
- **Q3 SFX coverage:** sound on endTurn + VP changes (the silent frequent/celebratory actions).
- **Q4 HUD declutter:** fold Sets/Win@/Theme config into one ⚙ setup popover (also guards the one-click new-game footgun); tidy the icon cluster.
- **Q5 Dead-code removal:** delete the unused Board/Principality/HandView/MiniCard/CenterColumn/PlayerHeader subtree.
- **Q6 Polish tail:** a11y (Pay aria-pressed, click-to-place), mark genuinely-blank cards, advantage-badge/identity touches as warranted.
- **Q7 Verify + visual sweep + push:** full gate + e2e (all eras) + screenshots; review, commit, push.

Status + per-batch detail tracked in [CHANGES.md](CHANGES.md).
