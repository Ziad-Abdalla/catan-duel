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

## Reused prior research (do NOT re-run)
- docs/goal-2026-06-21-expansion-themes/rules-work/*.md — barbarians, explorers, intrigue, merchants, prosperity, sages rules text
- docs/goal-2026-06-19/06-official-rules-research.md — base/gold/turmoil/progress
- docs/OFFICIAL_SETUP_VERIFICATION.md — canonical setup
- docs/goal-2026-06-22-aod-playable/AUDIT.md — most recent playability audit
