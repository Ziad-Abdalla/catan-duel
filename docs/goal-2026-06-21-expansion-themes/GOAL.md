# Goal — Implement all 6 remaining Rivals for Catan expansion themes

**Started:** 2026-06-21 · **Status:** in progress

## Objective
The game ships 3 theme sets (Era of Gold, Turmoil, Progress/"Innovation") on top of the
Basic Set. Add the **6 remaining official theme sets** faithfully:

- **Age of Darkness (2011):** Intrigue, Merchant Princes, Barbarians
- **Age of Enlightenment (2012):** Explorers, Sages, Prosperity

### Locked decisions (owner, 2026-06-21)
1. **Scope:** all 6 themes, fully **human-playable** (trust-based hot-seat). Accurate cards,
   selectable in both lobbies, on-theme UI, full rules guidance, new markers/mechanics rendered.
   AI-opponent support for the new themes is a follow-up.
2. **Hard themes:** **full fidelity** for Barbarians (invasion + Triumph track) and
   Explorers (3×3 sea-exploration sub-board).
3. **Art:** crop the real card faces out of the official "Included Cards" PDFs and use them
   as card art, fitted exactly like the existing themes' assets.

## Sources of truth (downloaded to `sources/`, git-ignored — re-fetch from these URLs)
**Card-image PDFs (printed costs/points + art):**
- base: https://www.catan.com/sites/default/files/2021-06/rfc-cards.pdf
- AoD: https://www.catan.com/sites/default/files/2021-06/rfc-aod-cards.pdf
- AoE: https://www.catan.com/sites/default/files/2021-06/rfc-aoe-cards.pdf

**Rulebooks w/ full Card Index (authoritative functional reference):**
- base: https://www.catan.com/sites/default/files/2021-06/rivals_for_catan_rules_200309.pdf
- AoD: https://www.catan.com/sites/default/files/2021-06/rivals-aod-rules-eng_200415.pdf
- AoE: https://www.catan.com/sites/default/files/2021-06/rivals-aoe-rules-eng_200421.pdf

A compiled card-by-card reference (rulebook-derived functional text for all 9 themes) lives in
the owner's Downloads (`compass_artifact_*.md`) — used as the authoritative **functional** layer.

## Data-sourcing strategy (after a vision-transcription quality check)
The card-image PDFs embed **one ~271–275px JPEG per card** (full card face). Extraction is clean
(`art-staging/`), but at 271px the vision pass is **reliable for names + costs, unreliable for
point icons + rules text** (AoD cards were given AoE-only point types; rules garbled). Therefore:
- **Functional data** (names, categories, quantities, requirements, effects, which point types):
  from the **rulebook Card Index / reference doc** (authoritative).
- **Costs:** from the vision pass (`transcripts/raw-transcription.json`), spot-verified vs the
  card images + the reference doc's confirmed anchors.
- **Art:** the cropped image itself, mapped to its card id by the (reliable) printed name.
- Rules text stored as concise **functional paraphrases** (game-mechanics facts), no flavor text —
  matching the existing `cards.json` convention.

## Architecture map (from 4 read-only subsystem surveys)
- **Card data:** `src/data/cards.json` is the single source both layers read. `src/ai/cards/*`
  reads the same JSON. Adding cards = JSON entries + enum extensions.
- **Live engine (`src/engine/*`)** is **trust-based**: effects are data-driven `EffectStep[]` +
  `QuickAction` buttons + a universal manual toolkit; requirements parsed from text. New themes
  need accurate data + EFFECTS guidance + new marker state/UI — not a per-card rules engine.
- **Sim/AI (`src/ai/sim/*`, `agent/*`)** fully reimplements the 3 current eras (per-card switches).
  New-theme AI support is the deep follow-up (Explorers' sea grid is HIGH effort).
- **~19 hard-coded era-reference points** (types, lobby lists, deck labels, music, felt themes,
  win thresholds, sim mode) must each gain the new set ids. Listed in `architecture-notes.md`.

## Phase plan
- [x] P0 Download sources, map architecture, build art-extraction pipeline, extract 216 card imgs
- [x] P0 Transcription fan-out (19 read-only agents) → `transcripts/raw-transcription.json`
- [x] P1 Build card dataset (144 entries) → `generated/new-cards.json`, merged into cards.json
- [x] P2 Crop art → `src/assets/cards/<id>.webp` (144 faces) — verified loading live
- [x] P3 Wire 6 set ids through all era-reference points (types + live + sim-data + UI) — tsc/tests green
- [x] P4a cards.json entries for all 6 themes (selectable + playable in hot-seat, real art)
- [x] Deck-back colors per new theme (table.css `.cs-set-*`)
- [x] P4b QA pass vs rulebook Card Index: face-up flags, copies, categories (9cb8dbc; remaining
      non-rules_text data flags captured in `rules-work/data-discrepancy-notes.json` for a later pass)
- [x] P4c Per-card rules_text polish from the rulebook (all 6 themes): Intrigue/Merchants (2aebecd),
      Barbarians/Explorers/Sages/Prosperity (6f90494, via a 6-agent rulebook fan-out)
- [~] P5 New mechanics UI:
  - [x] Point icons owl/star/sail/cannon — render infra on CardView + PlayerPlate (78ac71c).
        DATA PENDING: no card carries point values yet (printed icons are below 271px vision
        threshold; rulebook states only requirements). Lights up once values are populated.
  - [x] Per-era felt theming for all 6 themes (f7dea6e)
  - [x] Marker tracks Triumph/Manifesto/Public Feeling — state + setMarker + plate strip (b58e82d)
  - [x] Foreign cards — `owner` on PlacedCard + place/overlay + VP/stats exclusion (17d173b)
  - [x] EFFECTS resolution guidance for all themes' action/event cards (2aebecd + 16897fc)
  - [~] Metropolis: Commercial Metropolis exists as a +2VP card (2aebecd); the city→metropolis
        upgrade variant + Explorer Metropolis belong with the sea board
  - [ ] **3×3 sea board (full fidelity)** — NOT STARTED (the big remaining item: GameState.seaGrid,
        explorer ships, islands/pirates/shipwrecks, sail/cannon combat, Explorer Metropolis)
  - [ ] Owl/star spendable-pool economy — gap noted: action cards gain/spend owls & stars, but
        only the auto-derived card tallies exist (no per-player pool to spend from yet)
- [~] P6 Per-theme verification: tsc + 195 unit tests green throughout; live e2e for felt + markers
      (`e2e/expansion-themes.spec.ts`). Full hot-seat playthrough per theme still to do.
- [x] P7 HTML report (`report.html`) — to refresh as themes complete
- [ ] P8 AI-opponent support for the 6 new themes (deferred follow-up; sim/agent/evaluate)

## Progress log
- 2026-06-21: P0–P4a + deck colors + report shipped (commits 056aa94…4c0dc1c). All 6 themes
  selectable and playable in trust-based hot-seat with real cropped official art. AI-opponent
  support and the bespoke-mechanic UIs (sea board, marker tracks, foreign cards) remain.
- Known data caveats from the auto-generated baseline (being fixed in P4b): `copies` mostly 1
  (vision deduped by name), `face_up` over-applied (only the per-theme face-up stack should be
  flagged), some categories collapsed to `building`, rules_text is best-effort.
- 2026-06-21 (session 2): ran alongside a parallel instance (it owned Intrigue/Merchants +
  foreign cards; commits 2aebecd, 17d173b). This instance: rulebook-accurate rules_text for the
  other 4 themes, AoE point-icon render infra, per-era felt theming, the 3 marker tracks, and
  EFFECTS guidance for the 4 themes' action/event cards (6f90494, 78ac71c, f7dea6e, b58e82d,
  16897fc). Coordinated by staying in a non-overlapping lane after detecting the shared worktree.
  REMAINING (next session, fresh context): the 3×3 sea board (#8, biggest), the owl/star spendable
  pool, and point-value DATA population (needs the physical cards). AI support is the deferred P8.

## Notes
- Commit as you go (owner directive this session). No AI-mode regressions.
- Win thresholds: theme games 12 VP; **Era of Barbarians 13 VP**.
