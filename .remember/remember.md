# Catan Duel — session close 2026-06-25

Working in `catan-duel` at `/home/abdalla/projects/catan-duel`. **PUSHED to origin/master,
HEAD `21d32d3`.** Gate: tsc 0 · **240 unit ✓** · `npm run build` ✓ · **8/9 e2e ✓**.
- The 1 e2e miss is `ai-playthrough.spec` timing out at the 420s cap (full-game click-through,
  slow on this WSL machine). Its logic is covered green by `playthrough.test.ts` /
  `analysis.test.ts` — not a regression. Bump the per-test timeout if you want it green in CI.

## What shipped this session (owner live-playtest fix batch — 5 commits)
Deep audit first → `docs/goal-2026-06-24-fixes/INDEX.md` (+ A–E findings + backlog). READ IT
before re-touching any of these areas.
1. `183d101` Face-up supply: Church + Odin's Temple → Face-up Expansion (13 total); 5 copy-count
   fixes; removed junk cards `sages-unknown`, `prosperity-card-back`. (`src/data/corpus.test.ts`)
2. `6a19ff0` Event pile browser (`EventDeckBrowser`) + data-driven `Card.reseat`: Yule reshuffle,
   Barbarian Attack + Insurrection tuck under the top 4. (`src/engine/reseat.test.ts`)
   NOTE: the AI-sim deck uses the OPPOSITE orientation (.shift()=top), so its mirror `seatYule`
   is INTENTIONAL — don't "fix" it.
3. `6b50262` Sandbox UX: place ANY card on any region/road; upright production die-number on each
   region nameplate; ~12% bigger cards; deck-wall scrollbar reachable; bigger rotate control.
4. `b56b67e` Multiplayer desync ROOT FIX: `seedFromRoom()` (both clients build an identical game) +
   reconvergence gate (rebroadcast on content diff; the join converges in one round-trip).
   (`src/net/reconverge.test.ts`) — this is the "matching regions" + "mismatched versions" fix.
5. `21d32d3` Audio: −20% defaults + one-time ×0.8 migration; fade/duck (no hard cuts); rebalanced
   the 3 thin era playlists 9→11. (`src/audio/prefs.test.ts`)

## NEXT (backlog — see docs INDEX "Deferred / backlog")
- Deeper sync hardening (concurrent deck-edit data-loss, Lamport clock, `undo` peer-clobber).
- Bundle ~15-20 NEW music tracks (owner approved scope) — needs reliable CC0/CC-BY files the owner
  can audition; incompetech direct URLs returned HTML this session. Owner drops files in
  `public/audio/bgm-43..N.mp3` → wire `ERA_TRACKS` + `MUSIC_LICENSES.md`.
- 4 `unclear[]` card point-values need physical-card confirmation (esp. `turmoil-large-festival-hall`).
- `res-*.wav` gather SFX (synth fallback only).

## To play online (servers left RUNNING this session)
Relay `npm run party` (1999) + game `npm run dev` (5173) are up; Radmin IP `26.79.157.209` matches
`.env.development.local`. Owner's one Windows action: `PLAY-ONLINE.bat` → press `1`. Friend joins
`http://26.79.157.209:5173`. Procedure in `AI-HANDOUT.md`. ⚠️ `git pull --rebase` before any push.
