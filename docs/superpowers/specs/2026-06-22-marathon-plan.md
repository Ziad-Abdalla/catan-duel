# Catan Duel — Marathon Implementation Plan (2026-06-22)

Goal: best, most polished, complete, fully tested version; playable by anyone (no Radmin,
no repo) the simplest hands-free way; free or ≤£10. Recon: `docs/superpowers/recon/*.md`.

Baseline: HEAD b5ba612, 195 unit tests green, tsc clean, in sync with origin/master.
Engine is trust-based (no legality enforcement) — most gaps are UI wiring.

## Wave 1 — Core asks (manual pay, HUD, quick wins)
- [ ] B1 Default `payCosts` → false (uiStore). Human play never auto-deducts. (fixes "visual build animates")
- [ ] B2 Remove the 💰 Pay/Free HUD chip (TableHud).
- [ ] B3 Brigand → manual: BrigandSequence/resolveBrigand prompts + logs, players rotate by hand (no auto-zero).
- [ ] C1 Collapsible HUD: one small corner handle hides/shows the whole `.table-hud`; persist in prefs.
- [ ] C2 Declutter: move fullscreen (⛶) + Log into ⚙ Setup or slim group.
- [ ] D5 Large trade ships require a City: add `requires:"City"` to base-large-trade-ship + gold-large-trade-ship (cards.json) + rules_text clause.
- [ ] D1 Remove placed settlement/city: wire pb-seat → setDragRemove/openZoom → removePlaced.

## Wave 2 — Feature gaps
- [ ] D2 Move a landscape/region into an empty slot (region drop on empty → swapRegions; verify stored carries).
- [ ] D3 Region (landscape) stack browser: generalize StackBrowser → RegionStackBrowser; uiStore regionBrowse; CentralWall 🔍 entry.
- [ ] D4 Scout: wire base-scout to open region browser, take 2 + reshuffle (new region take/shuffle actions + focus QuickAction).
- [ ] D6 Place on opponent's specific city/road: drop targets on opponent board → playForeign with slot.
- [ ] D7 Place on existing city/building sites: verify city extra sites render+accept; clarify literal stacking (Rivals has none → fill sites).

## Wave 3 — Animations & polish
- [ ] E1 3D dice cube (CSS preserve-3d) reusing tumble→settle→fade state machine + contact shadow.
- [ ] E2 Card placement animation: hand/build→board flight via addFlight before dispatch.
- [ ] E3 Subtle animations: region disc rotate easing, VP pulse, resource +/- pulse, advantage token slide, modal scrim fade.
- [ ] E4 SFX where missing (placement, remove, rotate, browse).

## Wave 4 — Music everywhere
- [ ] F1 Mount ambient music on Online lobby, Card Gallery, vs-AI screens.
- [ ] F2 Add new CC0/public-domain medieval/folk tracks (trusted source e.g. archive.org/Kevin MacLeod CC). Extend ALL + era pools. Verify licensing, keep size sane.

## Wave 5 — Cards audit
- [ ] G Read cards.json broadly; ensure every action/event card is doable (has a quick-action or manual path). Fill obvious unwired effects.

## Owner follow-ups (added mid-session)
- [ ] PRIORITY per owner: main goals = UI polish + animations/SFX everywhere + music + FREE play for anyone, no Radmin, no repo. Feature gaps are secondary/best-effort.
- [ ] D8 Online lobby: the NAME box does nothing on join — make the entered name apply (and set seat to the remaining open seat); allow naming correctly there. (src/ui/net or src/net)
- [ ] Friend reportedly did: placing on road/region, rotating residences; owner fixed 3 Era-of-Darkness themes. NOT in this repo (clean tree) — verify live, don't assume.
- [ ] Read cards broadly; ensure all card actions doable; add anim/sfx where possible. Downloads from trusted sources permitted (music/sfx). Clean up + wrap up properly at end.

## Owner follow-ups batch 2 (added mid-session)
- [ ] Per-card-type + per-era effects: classify cards (building / city-building / hero / ship / unit / action-neutral / action-attack / event / region) AND era; each group + era gets fitting, correctly-triggered animation+SFX. Base buildings vs era buildings differ.
- [ ] cardFx.ts taxonomy classifier + per-group SFX at play sites + flourish CSS. [in progress]
- [ ] 3D rolling dice (perspective + multi-axis + contact shadow). [done, needs build verify]
- [ ] Settlement icon: current is unsuitable — design/replace a proper settlement icon. Icon/symbol polish broadly.
- [ ] Add/remove cards on EXISTING buildings (heroes on chapel/Odin temple/court etc.) for ALL types, everywhere; some already work — make uniform. (engine playForeign/playCard + slot; removePlaced; UI drop targets)
- [ ] Base card audit DONE: 2 fixes (base-siglind cost empty→wool2+grain+ore; base-candamir wool1→wool2). Apply with the rest.
- [ ] Volume consistency across all SFX/music via the existing sliders; nothing obnoxious/overlapping.
- [ ] Prefer free-licensed assets (pixabay/freesound CC/opengameart/itch-free/incompetech) over ripped-OST sites for clean public deploy.
- [ ] Wrap-up: space-efficient, clean repo + memory files; ready via Radmin AND ideally free online (web/app), no radmin/repo needed.

## Wave 6 — Deploy + verify + wrap
- [ ] A1 Clean prod build → dist.
- [ ] A2 Run exact artifact via partykit dev serving dist; two-browser Playwright online-sync proof + refresh resync.
- [ ] A3 DEPLOY.md + owner one-command handoff (`npm run party:deploy`, browser login, URL shape, re-run to update).
- [ ] H1 Full gate green: tsc, unit, e2e, build.
- [ ] H2 Two-browser live playthrough (manual pay + new features).
- [ ] H3 Cleanup temp/artifacts; update .remember handoff; owner-hub.
- [ ] H4 Commit logically (no push).

## Owner-gated / flagged
- Final `partykit deploy` needs owner GitHub/Cloudflare login (no token present). Agent stops at proven artifact + one command.
- D7 literal stacking & D5 exact requirement text flagged for owner confirmation against printed cards.
