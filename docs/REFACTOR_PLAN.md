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
- [x] B1 Engine: cost spending on build/play/upgrade (fixes "resources don't reduce"); discard pile + clean lifecycle (action→discard, building remove→discard, face-up→supply); configurable win threshold; rich audit logging — 15 tests
- [x] B2 Sync: seat-authority merge (fixes vanishing tokens) + commutative/convergent join — 4 tests + merge fuzz
- [x] B3 Data/Icons: Wheat rebrand (labels everywhere) + distinct wheat icon & field from Gold. (Crafted road/settlement/city icons + official-art drop pipeline → folded into B4.)
- [ ] B4 Card data + art: confirm costs/requirements vs physical cards; crafted icons for road/settlement/city; official-art drop pipeline for all cards
- [x] B4 (data) Official match start: per-player region numbers set to owner spec (each 1–6 once; players differ) — tests pinned. (Crafted road/settlement/city icons via CenterArt; official photo-art drop pipeline still open.)
- [x] B5 (core) UI: collapsible audit-log sidebar (auto-scroll); VP threshold control in HUD; one-click discard (hand + in-play); pay-flag wiring (structural auto-charges, hand cards manual)
- [x] B5b: "Requirements Met" flash flag on cards. (Visible shared discard-pile draw zone still open.)
- [x] Hardening: non-sticky winner (no frozen game-over after corrections); fuzz suite — 15k random actions, all invariants hold; adversarial review applied
- [x] B6 Events: simultaneous event pop-up both screens (synced `revealedEvent`, only the relevant rule paragraph); anti-spoiling dice (glow gated on settled roll)
- [x] B7 (most) Juice/audio: water under ships; dynamic bg per era; card-deploy pop animation; advantage chime + soft loss cue; victory music hook. (Still open: dramatic card-deploy AUDIO sweep; dedicated brigand robbing dice sequence; opponent negative VISUAL cue.)
- [x] B8 End game: non-abrupt "Vote to End" → opponent "Agree" → celebration screen (pluggable music)
- [x] B9 Identity: real player names render everywhere (Player 1/2 only as editable defaults)
- [x] B10: full gate green (117 tests + fuzz, tsc, prod build) + DEPLOYED to origin/master

## Still open (next sessions)
- Expanded city grids (more building sites per city + extra buildable slots)
- Visible shared discard-pile zone you can draw from; "draw from any pile" affordances + exhaustive hover metadata
- Heavy juice tail: card-deploy audio sweep, dedicated brigand robbing sequence, opponent negative visual cue
- Official photo-art drop pipeline for all cards (crafted SVG icons already cover foundations)

## Open data confirmations (owner/friend, from physical cards — no fabrication)
- Region DRAW STACK numbers still operator-typed; reconcile against the new starting numbers if exact physical layout matters.
- Any non-canonical printed build costs (settlement/city/road flagged in cards.json).
- Official card photo-art: owner to drop scans into src/assets/** (pipeline provided).
