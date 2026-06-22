# Catan Duel — session close 2026-06-22

Working in `catan-duel` at `/home/abdalla/projects/catan-duel`. In sync with origin/master
(HEAD `b300f29`). Gate GREEN: tsc 0 · 214 unit tests · e2e exit 0 (9 specs) · build ✓.

## What this session delivered (all committed + pushed)
- **Manual play by default** — engine never auto-deducts; Pay chip removed; Brigand is a manual prompt.
- **Collapsible HUD** (corner handle, persisted); **online name fix** (entered name writes to seat + syncs).
- **3D dice** (perspective, multi-axis tumble, falls + bounces + contact shadow).
- **Per-card-type placement flourishes** (buildings rise, ships rock, heroes flash, attacks shudder,
  actions shimmer), era-tinted — fire on the manual drag-to-board. **Active cards** get a one-tap Play
  (showcase → effect → auto-discard). **Settlement/city removal** (drag to build bar) + demolish cue.
- **SFX everywhere** — thematic per-card cues incl. CC0 ship/drums/mystic/remove/page, volume-normalised.
- **Music everywhere** — each era a fitting 30+ min looping soundtrack (42 tracks), on board/lobby/gallery.
  Credits collapsed in the gallery only (Kevin MacLeod CC-BY + CC0 SFX). Licenses: docs/superpowers/*_LICENSES.md.
- **Card accuracy** — ~95 image-verified fixes across all eras (2 passes, zero deferrals); reconciled
  field-by-field with the friend's rulebook pass on merge.
- **MERGED the friend's AoD work** (origin/master, 13 commits): placement on roads/regions, attach heroes
  onto Temple/Church/city, Residence rotation, rulebook data + new engine/tests. Both efforts combined, green.
- **Region/landscape stack** — search + reshuffle browser (🔍 on the central wall) + working **Scout**
  (secret-safe log). Move landscapes = swap (already worked).
- **Audit log** already records resource +/- and transfers, and stack searches without revealing the pick.
- **Free deploy, no Radmin/repo for players**: `npm run party:deploy` → one free PartyKit URL. Docs:
  `PLAY-FOR-EVERYONE.html` + `docs/DEPLOY.md`. Auto-deploy CI: `.github/workflows/deploy.yml` (set
  PARTYKIT_LOGIN+PARTYKIT_TOKEN secrets once). DEPLOY is done by the OWNER'S FRIEND (non-flagged GitHub
  account) — owner's account is GitHub-flagged (appeal submitted by owner; flag also 404s public repos).

## Optional future polish (NOT blocking; core game complete)
- Card "flight" hand→board (currently the placement flourish animates the card into its spot).
- Show MULTIPLE hand cards to opponent at once (showcase is one at a time).
- Settlement icon redraw (CenterArt Settlement() SVG) — needs visual iteration.

## Verify
cd ~/projects/catan-duel && npx tsc --noEmit && npx vitest run && npm run build && npm run e2e
Local: npm run dev (5173). Online relay local: npm run party. Deploy: npm run party:deploy.
Repo hygiene: node_modules/dist/.partykit/e2e artifacts all gitignored. public/audio ~181MB = the era soundtracks (intended).
