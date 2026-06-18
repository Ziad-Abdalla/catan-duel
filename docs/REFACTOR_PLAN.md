# Catan Duel — Online Refactor & Polish Plan

Consolidated from the owner's streamed goal (2026-06-18/19). Authoritative source of
truth for this effort. Manual-sandbox philosophy is preserved throughout: automation
ASSISTS (cost math, routing, logging, juice) but never rigidly enforces turn flow.

## Locked architectural decisions (owner-approved)
1. **Networking:** keep PartyKit (already real-time WS, free, tested). Do NOT migrate to Socket.io/Render/Railway.
2. **Race fix (vanishing tokens):** seat-authority merge — each client authoritative for its own half; merge not overwrite.
3. **Starting setup:** verified vs official rulebook (docs/OFFICIAL_SETUP_VERIFICATION.md). See "Open data confirmations".
4. **Victory music:** pluggable hook; owner supplies any file they have rights to (NOT the copyrighted track, which cannot ship).

## Verified rules corrections
- **VP thresholds:** 7 (intro) / 12 (single theme) / 13 (Duel of the Princes) / 15 (tournament). The goal's "7/13/15" was wrong.
- **Starting regions:** each player has numbers 1–6 once; the two players DIFFER in resource→number mapping (NOT shared). e.g. number 6: Red=grain, Blue=ore. Current setup.ts shares ore=5/grain=6 across both → suspect; several cells low-confidence → OPEN for physical-card confirmation.
- Gold field starts with 0 stored; all other regions start with 1. Max 3 per region.

## Batches
- [x] B0 Research: official setup verification (done; doc written)
- [ ] B1 Engine: cost spending on build/play/upgrade (fix "resources don't reduce"); discard pile + clean card lifecycle (action→discard, building remove→discard, face-up→supply); configurable win threshold; rich action logging (rolls, +/- resources, builds, swaps)
- [ ] B2 Sync: seat-authority merge (fix vanishing tokens), property-tested
- [ ] B3 Data/Icons: Wheat rebrand + distinct from Gold; crafted icons for road/settlement/city; ensure every card renders an icon; official-art drop pipeline
- [ ] B4 Card data: correct costs/requirements everywhere; settlements/structural complete
- [ ] B5 UI cleanup: collapsible audit-log sidebar; "Requirements Met" flag; VP threshold control; discard-pile zone; one-click discard; cleaner interactions
- [ ] B6 Events: simultaneous event pop-up both screens, only the relevant rule paragraph; anti-spoiling dice (no glow until dice settle)
- [ ] B7 Juice/audio: card-deploy 3D intro + sweep; water under ships; dynamic bg per era; dice sequences (brigand robbing); advantage chime + opponent cue; victory music hook
- [ ] B8 End game: non-abrupt "Vote to End" → opponent "Agree" → celebration screen (pluggable music)
- [ ] B9 Identity: real player names everywhere (no hardcoded Player 1/2)
- [ ] B10 Review (adversarial) + full gate green + build + DEPLOY to origin (shared public repo)

## Open data confirmations (owner/friend, from physical cards — no fabrication)
- Exact per-player resource→number maps (low-confidence cells in research doc).
- Any non-canonical printed build costs (settlement/city/road flagged in cards.json).
- Official card art/icons: owner to drop scans into src/assets/** (pipeline provided).
