# Catan Duel — marathon handoff (2026-06-22)

Working in `catan-duel` at `/home/abdalla/projects/catan-duel`. Goal (/goal active): most
polished complete version; playable by anyone FREE with no Radmin/repo (web/app); add
animations + SFX + music everywhere; fix card-data accuracy across all eras; proactively
find bugs; rigorous test; then PUSH (owner asked). No AI signature on commits.

Plan + recon: docs/superpowers/specs/2026-06-22-marathon-plan.md ; docs/superpowers/recon/*.md
Music/SFX licenses: docs/superpowers/MUSIC_LICENSES.md, SFX_LICENSES.md (Kevin MacLeod CC-BY → credit is in the GALLERY footer collapsed <details>, never on the gameplay page).

## DONE + committed (HEAD chain after b5ba612)
- Manual play default (no auto-pay), Pay chip removed, Brigand manual prompt. (dd02fc2)
- Collapsible HUD (corner handle, persisted). Online lobby NAME now applies+syncs (renamePlayer on connect/hello/seat-slide). e2e updated.
- 3D dice (perspective+multi-axis+shadow). Per-card-type placement flourishes (cardFx.ts + cardfx.css), era-tinted. (f954c64)
- Richer thematic SFX cues wired (cardSound.ts: ship/drums/mystic; remove cue on removePlaced). New CC0 SFX + 24 new BGM tracks (era pools ≥30min) from agents. (f954c64)
- Music on lobby+gallery too; collapsed credits. (a25417d, then collapsed)
- Prod build GREEN (vite build ✓), tsc 0, 195 unit tests green.

## IN FLIGHT
- BACKGROUND AGENT (af7f79f98890bef09) applying HIGH-confidence card-data corrections to src/data/cards.json from the 10 audit docs. Will write docs/superpowers/CARD_CORRECTIONS_APPLIED.md. ⚠️ DO NOT edit cards.json until it reports. After it lands: verify json valid + tsc + vitest; then OWNER WANTS NO DEFERRALS — dispatch a 2nd-pass agent to resolve EVERY remaining/uncertain card (cost/requires/rules/name) using the official Rivals for Catan wiki + high-res image re-analysis, for ALL of them.

## NEXT (priority order)
1. DEPLOY PROOF (must-hit): `npm run build` (done) → run the dist artifact via `npx partykit dev` (serves dist) → Playwright TWO browser contexts: create room in A, join in B, verify moves sync + names + refresh-resync. Write docs/DEPLOY.md (owner runs `npm run party:deploy` once — browser GitHub/Cloudflare login, no token present → owner-gated final step → permanent *.partykit.dev URL, free). PartyKit deploy is free on own Cloudflare acct; budget ≤£10 OK.
2. Card corrections: land agent + 2nd full pass (above). Re-run unit tests (some cost-asserting tests may need review — verify, don't force).
3. Audit-log accuracy (all actions): show when a player SEARCHED a stack + picked a specific card (not top-draw) WITHOUT revealing which card; chronological, readable, secret-safe. Engine logged() in actions.ts.
4. Feature gaps (several owner-requested): remove settlements/cities (pb-seat → setDragRemove/removePlaced); add+remove cards ON existing buildings (heroes on chapel/temple/court) all types; move landscape into empty slot (swapRegions); browse REGION stack + Scout search (generalize StackBrowser, regionBrowse state, take2+reshuffle); foreign placement drop targets on opponent board; standalone die-roll tool usable on opponent turn w/o ending turn (DiceTool in ResolutionPanel — verify/extend); show MULTIPLE hand cards to opponent (extend ShowcasePopup). Recon: docs/superpowers/recon/01-build-place-move.md.
5. Icons/UI polish: proper SETTLEMENT icon (current unsuitable); general symbol/icon polish. (PieceArt.tsx / CenterArt)
6. Subtle animations more broadly (region disc rotate easing, VP pulse, card placement flight via addFlight). Recon 02-dice-animations.md.
7. D5 large-trade-ship "requires City" — UNVERIFIED by rulebook; confirm via wiki in the 2nd-pass card agent, then apply or drop.
8. PROACTIVE bug hunt: Playwright playthrough (hotseat + online two-context), watch console errors, screenshot key states; fix found bugs.
9. WRAP: full gate green (tsc, vitest, e2e, build); space check (public/audio ~181MB — acceptable, reused shared tracks); clean temp; update this handoff + memory; commit logically; PUSH to origin (owner asked) — no AI signature.

## Verify commands
cd ~/projects/catan-duel && npx tsc --noEmit && npx vitest run && npm run build && npm run e2e
Run dev: npm run dev (5173). Online relay local: npx partykit dev.
