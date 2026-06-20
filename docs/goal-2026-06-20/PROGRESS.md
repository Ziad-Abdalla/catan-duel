# Goal marathon — 2026-06-20 (faithful Catan: The Duel manual sandbox + juice)

Accurate, fully-playable *Catan: The Duel* as a clean manual sandbox, alive with animation/SFX/music.
All work below is committed + pushed to `Ziad-Abdalla/catan-duel` master; 142 unit tests + 4 e2e specs
(every reducer, random action orders across all eras, 0 console errors) + production build all green.

## Shipped this marathon

**Accuracy (engine/data)**
- 12 red city-expansion cards now declare `Requires: City` (Harbor, Merchant Guild, Trading Base,
  Library, Pharmacy, Bath House, Town Hall, University, Building Crane, Parliament, Fire Brigade,
  Large Festival Hall) — the UI shows "Requires City" + the engine checks it. Full audit:
  `docs/goal-2026-06-20/CARD_REQUIREMENTS_AUDIT.md`.
- Card data fixes: Gold Cache cost, Large Festival Hall = 2 VP, Abbey progress point, Hedge Tavern +
  Marketplace text/commerce.
- Road cost = 1 lumber + 2 brick (per the physical cards). Regions acquired during play start EMPTY.
- Road + settlement art rotated to the correct upright orientation. New painterly castle for the city.

**Event / flow**
- Event popup: explicit close button only (no click-outside dismiss), and each player closes their OWN
  popup independently (synced reveal nonce + local seen-nonce).
- Removed the Produce / Resolve buttons — production + events are resolved BY HAND (roll still shows
  what came up). Only the event-card draw stays.
- Full-screen flourish per event-die face (Trade / Celebration / Plentiful Harvest / Event) — colour
  flash + glyph shower + title; Brigand keeps its cinematic.

**Online**
- Smart seats: joining via a shared link defaults to Seat 2; if both still pick the same side, the
  store resolves it deterministically on connect (larger client id slides over). No more "both Player 1".
- Victory music fixed (reset + duck/restore the bed) so it can't stick on replay.

**UI / feel**
- Restored the big two-halves layout (each principality fills the screen, snap across the table, sticky
  wall, hidden scrollbars) + a jump-to-side button & ↑/↓ keys + optional fullscreen toggle.
- Player names shown + a clickable crest avatar. Attack ⚔ + Commerce ⚖ tally by the VP. Removed the
  inert "?" event stack. Square building-site drop slots. Build pieces drop with a gold glow.
- Region swapping (drag the nameplate grip onto another of your regions).
- Audit log grouped by turn ("Turn N" headers, "1→2 lumber", "Swapped wool ⇄ brick").
- Shuffling a stack closes the browser so the shuffler can't see the new order.
- Richer layered table background (hearth glow, vignette, fabric grain).

**Audio**
- ~48 min of CC0 music across **18 tracks**, grouped into a **per-era** mood-matched shuffled playlist
  (intro / Gold / Turmoil / Innovation / full Duel); switches mood with the theme/sets.
- Victory: a fitting CC0 celebration track + the synth fanfare fallback. NOTE: the specific requested
  song is copyrighted, so it is NOT bundled — drop your own file at `public/audio/victory.mp3` to use it.

## Second wave — all explicit items now done
- **Card showcase** — a played card (or "Show opponent") pops big on BOTH screens like an event,
  dismissed per-player (`ShowcasePopup`).
- **Discard browser** — look through the whole pile + take ANY card (`DiscardBrowser`).
- **Bigger browse cards** — stack/discard cards hover-zoom 1.5× so effects are readable when swapping.
- **Compound requirements** — `requirementMet` evaluates "City and (Abbey or Library)" style clauses.
- **Building-card size** bumped for readability.

## Genuinely optional (future polish, not blocking)
- Real one-shot SFX files to augment the synth palette (synth already covers every action + the
  full-screen event flourishes); per-hero unique persona cues.

Gate at HEAD `6203639`: 142 unit tests + production build green; e2e (every reducer, random orders,
all eras, UI flows, audio) all green with 0 console errors.
