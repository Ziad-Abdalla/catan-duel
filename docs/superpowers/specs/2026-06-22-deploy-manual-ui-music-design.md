# Catan Duel — Public Deploy · Manual Payments · UI Declutter · Music

**Date:** 2026-06-22
**Status:** Design (awaiting owner review)
**Game:** "The Rivals for Catan" 2-player implementation (React + Vite client, PartyKit relay)

## Problem

1. Friends without repo access need to play online without Radmin VPN setup. Want the
   easiest handoff for the owner that is guaranteed to work.
2. Auto-paying is annoying: building/upgrading/playing auto-deducts resources (rotates
   region discs) and the Brigand event auto-zeroes gold+wool. Owner wants ALL resource
   deductions manual in human (PvP) play.
3. A visual-only build still fires the resource-rotation/coin animation.
4. The HUD nav bar is clunky and overlaps the board ("above stuff").
5. Music only plays on the board; other screens are silent. Owner wants more music
   everywhere, including new tracks.

## Key facts about the codebase (verified)

- **Client-authoritative + trust-based.** `party/server.ts` is a dumb relay: forwards
  messages, caches the last `snapshot` for late joiners. The deterministic engine runs in
  each browser. The engine explicitly does NOT enforce rule legality (`src/engine/actions.ts`
  header) — it MOVES and TRACKS state, exactly like a physical tabletop.
- **Zero-config deploy is already wired.** `src/net/partykit.ts` resolves the host as
  `VITE_PARTYKIT_HOST` → page origin → `localhost:1999`. On a PartyKit deploy the app is
  served from the same host as the relay, so it just works with no env var. `partykit.json`
  has `serve: { path: "dist" }`. `package.json` has `party:deploy: partykit deploy`.
- **The Radmin coupling is only `.env.development.local`** (`VITE_PARTYKIT_HOST=26.79.157.209:1999`).
  Vite loads `.env.development.local` ONLY in dev mode, so a production `vite build` does NOT
  bake the Radmin IP in. The deploy is clean.
- **Resources are region discs** (`stored: 0|1|2|3` per region card), not a card hand.
  "Paying" = rotating discs down via `spendCost()`.
- **The only automatic deductions in human play are TWO:**
  1. `spendCost()` — gated by `pay !== false`, fires on `upgradeCity`, `buildPiece`
     (road/settlement), `playCard`, `playForeign`. The UI passes `pay: payCosts` (the
     `payCosts` UI toggle, default `true`).
  2. `resolveBrigand` (`src/engine/actions.ts` ~L820-840) — zeroes everyone's gold+wool
     when over 7. NOT gated by any flag.
- **Card effects are ALREADY manual** — `src/engine/effects.ts` defines steal/give/discard
  as click-to-resolve `QuickAction` buttons ("Take 1", "Give 1 back"). No change needed.
- **Human-facing modes are PvP only:** `AppMode = 'local' (Hotseat) | 'online' | 'gallery'`,
  plus a separate `#/ai` single-player route. No in-app human-vs-AI game that would break
  if auto-pay goes off for humans. Engine `pay` capability is kept for tests + AI self-play.
- **Audio:** `src/audio/music.ts` has 18 bundled CC0 tracks (`public/audio/bgm-*.mp3`) grouped
  into eras + a victory track. `AmbientMusic` (`src/ui/board/AmbientMusic.tsx`) is mounted on
  the board only. Lobby / gallery / vs-AI are silent.

## Decisions (owner-confirmed)

- **Hosting:** PartyKit deploy → one permanent public URL. Easiest ongoing handoff
  (paste a link); always-on (not the owner's PC). Owner does a one-time login; agent proves
  the artifact works first. Alternatives rejected: tunnel/ngrok (ties play to owner's PC,
  fragile), desktop download (still needs a hosted relay; more work, no gain for a browser game).
- **Manual scope:** ALL resource deductions manual in human play. Production GAINS stay
  automatic (a gain is not a payment). Engine `pay` kept dormant, not ripped out (reversible).
- **HUD:** collapse the entire nav bar behind one small corner handle; persisted.
- **Music:** play existing tracks on the silent screens AND add new CC0/public-domain tracks.

## Design — 4 batches

Each batch is taken to green (built + tested) before the next, then a pause for "continue".

### Batch 1 — Deploy (proven handoff)
- Confirm a clean `npm run build` (tsc + vite build) → `dist/`.
- Run the exact deployed artifact locally: `partykit dev` serving `dist/` (the production
  bundle, not the dev server), so what is tested IS what deploys.
- Drive **two browser tabs** through a real game via Playwright on that artifact: create a
  room code in tab A, join from tab B, make moves, assert both sides sync (incl. a refresh →
  snapshot resync). This is how "ensure it works" is satisfied before any login.
- Write `docs/DEPLOY.md` + a short owner handoff: the single `npm run party:deploy` command,
  what the browser login looks like, the resulting URL shape, and "re-run to ship updates".
- **Owner-gated:** the actual deploy needs the owner's GitHub/Cloudflare login. Agent stops
  at "artifact proven + one command ready".

### Batch 2 — Remove auto-paying + fix build animation
- Default human play to manual: the build/upgrade/play UI dispatches `pay: false` always;
  `payCosts` default → `false`.
- **No animation on a no-cost / manual build.** Investigate (systematic-debugging) the
  rotation/coin animation: confirm it is driven by a `stored` delta (so manual = no delta =
  no animation), and remove any unconditional pay animation/SFX on build. A visual-only
  placement must be silent of pay FX.
- **Brigand → manual.** Replace the auto-zero in `resolveBrigand` with a prompt + log
  ("each player over 7 loses all gold + wool — rotate your gold/wool regions to 0"); players
  rotate by hand. Keep the audit log entry. (Keep the engine reducer capability behind a flag
  if cheap, for tests.)
- Tests: update/extend `discard.test.ts`, `actions.test.ts`, brigand coverage to assert
  manual-default behavior; keep `pay:true` paths covered for AI/tests.

### Batch 3 — Declutter + collapsible HUD
- Remove the 💰 Pay / 🆓 Free chip.
- Move rarely-used controls (fullscreen ⛶, possibly ☰ Log) into the ⚙ Setup popover to slim
  the bar.
- **Collapse toggle:** one small persistent handle (e.g. ☰ in a corner). Tap to hide/show the
  whole `.table-hud`. Persist in audio/prefs-style storage so it survives reloads. When hidden,
  nothing of the bar overlaps the board except the handle.
- Verify z-index: handle + revealed bar sit above the board but the hidden state frees the area.

### Batch 4 — Music everywhere + new tracks + polish
- Mount ambient music on the Online lobby, Card Gallery, and vs-AI screens (reuse
  `AmbientMusic` / `playAmbient`, choosing a sensible era/menu pool per screen).
- Source + bundle additional CC0 / public-domain medieval/folk tracks (same provenance as the
  existing archive.org set), extend `ALL` + era pools in `src/audio/music.ts`. Verify licensing
  and keep bundle size reasonable.
- Final verification: unit suite (`npm test`) + e2e (`npm run e2e`) green; a live two-browser
  playthrough; report polish findings (anything the live run surfaces) before fixing.

## Testing strategy

- Engine reducers: unit tests assert manual-default (no `stored` change on build with default
  UI), Brigand manual, and that `pay:true` still works for AI/tests.
- Net/sync: existing `sync.test.ts` / `server.test.ts` stay green; manual disc rotations
  broadcast and resync.
- E2E (Playwright): two-tab online game on the production artifact (the deploy proof) + a
  hotseat manual-pay flow.
- Audio: smoke that music starts on each screen when `musicOn` (no autoplay-policy crash).

## Out of scope

- No rule-legality enforcement (engine stays trust-based by design).
- No change to production GAINS or to the already-manual steal/give/discard effects.
- AI self-play behavior unchanged (keeps auto-pay).
- Custom domain (the `*.partykit.dev` URL is sufficient).

## Risks / trade-offs

- Manual everything removes the software's payment validation — a player could build without
  paying. This is the explicit, reversible owner preference and matches physical play.
- New audio adds bundle size; mitigate by compressing and capping track count.
- Deploy is owner-gated on login; agent cannot fully complete it headlessly — mitigated by
  proving the identical artifact locally first.
