# Goal 2026-06-24 — Owner-reported fixes (live playtest batch)

AI-facing knowledge manifest for this batch. Read this first; each row points to a findings
doc written by a read-only audit agent. Implementation reads these, never re-runs the audit.

## Owner's reported issues (verbatim intent)
1. Production regions match across both players — should differ.
2. Can't see the event pile (no browser/visibility).
3. Event reshuffle/effect mechanics wrong (Yule, Barbarian Raid → reshuffle into top 4, etc.).
4. Adding many themes ("encounters") overflows — face-up supply layout must be dynamic so all cards stay visible.
5. Must be able to place ANY card on any region / building / production slot.
6. Cards a little bigger; rotation enabled (residences, some barbarian cards — like productions rotate).
7. Face-up central supply audit: Church + Odin's should be face-up; some wrongly included/excluded.
8. Audit format + effects of ALL active cards everywhere (research vs implementation).
9. Multiplayer: host/friend versions oddly mismatched — sync both.
10. Audio: more + longer + better music everywhere; default volume −20%.
11. General polish anywhere.

## Findings docs (filled by audit agents)
| # | Lens | Doc | Status |
|---|------|-----|--------|
| A | Production regions + multiplayer sync | A-regions-and-sync.md | DONE — root cause: no shared seed + no authority; matching regions is the visible symptom of the desync |
| B | Event pile visibility + per-event mechanics | B-events.md | DONE — no event browser; reseat mechanics (Yule/top-4) missing; needs data-driven `reseat` field |
| C | Card data/effects + face-up supply audit | C-card-data.md | DONE — face-up should be 13 (add Church + Odin's Temple); remove 2 junk cards; 5 copy-count fixes |
| D | Sandbox placement/rotation/sizing/layout | D-sandbox-ux.md | DONE — all restrictions are UI-only (engine already permissive); deck wall scrollbar hidden |
| E | Audio expansion + volume | E-audio.md | DONE — defaults −20%; crossfade polish; adding tracks = +45MB download decision |

## Deferred / backlog (noted, not silently skipped)
- **Deeper sync hardening** (A-regions-and-sync.md §2.4): the headline bugs (matching regions /
  mismatched versions) are fixed by the room-derived shared seed + the reconvergence gate (clients
  now build identical games and always converge — `src/net/reconverge.test.ts`). NOT yet done, lower
  risk to defer because turn-based play rarely triggers them: (a) concurrent shared-zone edits
  (both draw/discard in one tick) still resolve to one lineage — both clients agree, but one edit can
  be dropped; (b) global `seq` could be a Lamport/vector clock; (c) `undo` still force-broadcasts a
  wholesale reset that can clobber a peer's in-flight own-seat edit. These are deck-level concurrency
  refinements, not the owner's reported symptom.
- **AI-sim event effects + reseat** (`src/ai/sim/events.ts`): many theme events resolve as `default: no-op`
  in the self-play simulator, and the sim still cycles Barbarian Attack / Insurrection to the bottom
  (its deck uses the OPPOSITE top/bottom orientation from the engine, so its `seatYule` is intentionally
  mirrored — NOT a bug). This is AI-quality only; it does not affect the human/live game, which is the
  owner's reported scope. The engine (live) path is fixed + tested in `src/engine/reseat.test.ts`.
- **Card point-values needing physical confirmation** (C-card-data.md FOCUS 3): 4 `unclear[]` cards
  (esp. `turmoil-large-festival-hall`).
- **New music TRACK FILES (~15-20) not added this session.** Done in code: −20% defaults + one-time
  ×0.8 turn-down, fade-in/out + duck-not-cut victory (no more hard cuts), and rebalanced the three
  thinnest era playlists (turmoil/progress/barbarians 9→11 distinct) from the existing 42 tracks.
  NOT done: bundling new mp3s — incompetech direct URLs returned HTML not audio, and tracks can't be
  auditioned here, so dumping ~45 MB of unverified files into the (already 181 MB, flagged-account)
  repo was the wrong call. Path to add: owner drops files in `public/audio/bgm-43..N.mp3` (or approves
  verified CC0/CC-BY URLs) → wire into `ERA_TRACKS` + `MUSIC_LICENSES.md`. Sourcing shortlist in E-audio.md §2.
- **res-*.wav gather SFX** (E-audio.md §3.7): the 6 per-resource gather cues use synth fallback (no
  recorded samples). Adding real CC0 recordings is a polish opportunity.

## Reused prior research (do NOT re-run)
- docs/goal-2026-06-21-expansion-themes/rules-work/*.md — barbarians, explorers, intrigue, merchants, prosperity, sages rules text
- docs/goal-2026-06-19/06-official-rules-research.md — base/gold/turmoil/progress
- docs/OFFICIAL_SETUP_VERIFICATION.md — canonical setup
- docs/goal-2026-06-22-aod-playable/AUDIT.md — most recent playability audit
