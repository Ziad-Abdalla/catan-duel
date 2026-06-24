# Audit E — Audio system (catan-duel)

Read-only investigation, 2026-06-24. Owner asks:
(a) "add longer and more music and better everywhere";
(b) "decrease the default volume by ~20% less than now."

Files audited: `src/audio/prefs.ts`, `src/audio/music.ts`, `src/audio/sfx.ts`,
`src/audio/cardSound.ts`, `src/ui/board/AmbientMusic.tsx`, `src/ui/board/VictoryFlow.tsx`,
`src/App.tsx`, `docs/superpowers/MUSIC_LICENSES.md`, `public/audio/*`.

Note: `ffprobe`/`ffmpeg`/`mediainfo` are NOT installed in this environment. Durations were
computed from `file`-reported MP3 bitrate × byte size (CBR encodes, so this is accurate to
~±2%). bgm-1..3,6,7 are 320 kbps; bgm-4,5,8..18 are 256 kbps; bgm-19..42 are 112 kbps.

---

## 1. Default-volume change (deliverable 1)

**File/line:** `src/audio/prefs.ts:16`
```ts
const DEFAULTS: AudioPrefs = { muted: false, sfxVol: 0.85, musicOn: true, musicVol: 0.32 }
```

Relative −20% (multiply each by 0.8):
- `sfxVol`  0.85 → **0.68**
- `musicVol` 0.32 → **0.256 ≈ 0.26** (recommend 0.26; 0.256 also fine)

Proposed new line:
```ts
const DEFAULTS: AudioPrefs = { muted: false, sfxVol: 0.68, musicOn: true, musicVol: 0.26 }
```

### localStorage caveat (IMPORTANT — document, owner decides)
`DEFAULTS` are only applied for users with **no saved prefs**. `load()` (`prefs.ts:18-25`)
does `{ ...DEFAULTS, ...raw }`, so any user who has *ever* opened the game and triggered a
`setAudio(...)` call has a persisted `catan-duel.audio` key in localStorage with the OLD
values, and the new defaults will NOT reach them. The settings UI writes the full object on
every change, so returning players are pinned to whatever they last had (or the old 0.85/0.32
if they never touched the sliders but the key was written elsewhere — verify whether anything
writes prefs on load; currently nothing does, so untouched users stay on DEFAULTS and WILL get
the new values).

**Options (propose, do not decide):**
- **A — defaults only (no migration).** Simplest; new/cleared users get the quieter mix,
  existing tweakers keep their choice. Matches "default volume" wording literally.
- **B — one-time migration.** Bump a stored `version` field; on load, if the persisted values
  equal the *old* defaults exactly (0.85 / 0.32) and no explicit user change was recorded,
  rewrite to the new defaults. Risk: can't distinguish "user deliberately set 0.85" from
  "old default 0.85". Fragile; only do if owner wants everyone quieter.
- **C — scale-down migration.** On a version bump, multiply persisted `sfxVol`/`musicVol` by
  0.8 once. Respects each user's relative preference. Cleanest if owner wants ALL users ~20%
  quieter. Recommended if migration is wanted.

My recommendation: ship **A** (one-line change) now; offer **C** as a follow-up only if the
owner explicitly wants existing players turned down too. Note: the current `AudioPrefs`
interface has no `version` field, so B/C need a schema addition (`prefs.ts:5-10`).

### Victory music volume (a knock-on, flag it)
`music.ts:68` sets victory volume to `Math.min(1, getAudio().musicVol + 0.3)`. With the old
default that was 0.62; with the new default 0.26 it becomes 0.56 — automatically quieter,
which is consistent with the owner's intent. No change needed, but note it tracks `musicVol`.

---

## 2. More + longer + better music (deliverable 2)

### Current state (all doc claims VERIFIED against real files)
- **42 bundled tracks**, `public/audio/bgm-1.mp3 .. bgm-42.mp3`, all present. `music.ts:101`
  builds `ALL` as a 42-entry array. `public/audio` total = **181 MB** (bgm ≈ 172 MB, sfx 4 MB,
  victory.mp3 5 MB).
- Licenses: bgm-1..18 CC0/PD (archive.org), bgm-19..42 Kevin MacLeod CC-BY 4.0. The licenses
  doc `docs/superpowers/MUSIC_LICENSES.md` **EXISTS and is correct** — per-track titles + ISRC
  URLs for all 24 MacLeod tracks. Attribution is rendered in-app at `src/App.tsx:85`
  ("Music by Kevin MacLeod (incompetech.com), licensed under CC BY 4.0.") — CC-BY requirement
  satisfied.
- 11 eras, each a shuffled overlapping pool (`ERA_TRACKS`, `music.ts:113-125`). `reshuffle()`
  (`music.ts:133-140`) Fisher-Yates shuffles per lap; `advance()` reshuffles at end of order.

### Measured per-era pool length (VERIFIED — every era ≥ 30 min, matches the doc)
| Era | Tracks | Measured min | Doc claim |
|-----|-------:|-------------:|-----------|
| base | 12 | 34.1 | ~33 |
| gold | 10 | 32.1 | ~32 |
| turmoil | 9 | 33.6 | ~34 |
| progress | 9 | 32.0 | ~32 |
| duel | 10 | 42.0 | ~42 |
| intrigue | 10 | 34.8 | ~35 |
| merchants | 11 | 33.5 | ~34 |
| barbarians | 9 | 34.2 | ~34 |
| explorers | 10 | 34.9 | ~35 |
| sages | 10 | 31.0 | ~30 |
| prosperity | 11 | 31.9 | ~31 |

**Thinnest pools (fewest distinct tracks → reshuffle repeats soonest):** `turmoil`, `progress`,
`barbarians` (9 each), then `sages`/`prosperity` lean heavily on the same MacLeod set. Because
pools overlap, the *distinct* track count is what matters for perceived repetition, not minutes.
All pools clear 30 min, so the owner's "longer" ask is about adding NEW material + raising the
distinct-track floor, not about a shortage of minutes.

### Per-track durations (longest / shortest, for "longer" sourcing targets)
- Longest: bgm-42 Egmont Overture 9.1 min, bgm-28 Sovereign 6.4 min, bgm-33 Lightless Dawn 6.3,
  bgm-6 5.1, bgm-7 4.9, bgm-36 4.8, bgm-32 4.8, bgm-19 Angevin 4.7, bgm-39 4.6.
- Shortest (candidates to deprioritise/replace): bgm-15 1.19 min, bgm-13 1.30, bgm-35 1.62,
  bgm-18 1.70, bgm-4 1.77. Several sub-2-min loops make the bed feel choppy; sourcing longer
  replacements/additions for these moods is the highest-value "longer" win.

### Ideal target & SOURCING plan (do NOT download — plan only)
**Ideal:** raise each era to **12–14 distinct tracks** and ~40+ min, with at least 4–5 tracks
≥ 4 min per era so the loop feels long. Net new tracks to add: ~15–20 (target ~bgm-43..60).

**Sources (all royalty-free, attribution-correct):**
1. **Kevin MacLeod / incompetech.com (CC-BY 4.0)** — same attribution block already in
   `App.tsx:85` and `MUSIC_LICENSES.md` covers any new MacLeod track (just add rows). Best
   single source: huge medieval/fantasy catalogue, consistent quality.
2. **archive.org public-domain (CC0)** — no attribution required; matches bgm-1..18.
3. **Other CC-BY composers** (only if a new attribution line is added): e.g. incompetech is
   sufficient; avoid mixing NC/SA licenses (NC could conflict if the game is ever monetised —
   keep CC0 + CC-BY only, per the existing safe posture).

**Candidate MacLeod tracks by mood (real incompetech titles, royalty-free, not yet bundled):**
- **base / merchants (village/folk/market):** "Wagon Wheel", "Daily Beetle", "Rotten Tree",
  "Fox Tale Waltz", "Kalimba Relaxation Music", "Pop Goes the Weasel".
- **gold / prosperity (regal/stately):** "Marty Gots a Plan", "Royal Banana", "King of the
  Hill", "Brandenburg Concerto" (PD recording), "Canon in D" (PD).
- **turmoil / intrigue (dark/conspiratorial):** "Ossuary 5 - Rest", "Ossuary 6 - Air",
  "Long Note Two", "Despair and Triumph" already in; add "Anguish", "Crypto", "Bump in the
  Night".
- **barbarians (martial/driving):** "Killers", "Five Armies", "Clash Defiant", "Hitman",
  "Decisions" — strong percussion-led pieces.
- **progress / sages (hopeful/meditative):** "Healing", "Tranquility", "Reawakening",
  "Anamalie", "Floating Cities", "Impromptu Meditation".
- **explorers (seafaring/adventurous):** "Wepa", "Master of the Feast" already in; add
  "Crossing the Chasm", "Constance", "The Pyre", "Adventure Meme".

(All names above must be verified at download time on incompetech.com — titles drift; this is a
mood-matched shortlist, not a confirmed manifest.)

**Repo-size implications:**
- `public/audio` is already **181 MB** and is committed (not git-LFS — confirm). Adding ~18
  MacLeod tracks at 112 kbps ≈ 2.5 MB each = **~45 MB**, pushing the dir toward ~225 MB.
- **Mitigations to recommend:**
  - Encode all new BGM at **112 kbps** (matches bgm-19..42) — the 320 kbps CC0 tracks
    (bgm-1,2,3,6,7 = ~42 MB combined) are the biggest offenders; **re-encoding the five
    320 kbps files to 128 kbps would reclaim ~25 MB** with no perceptible loss for a background
    bed. This alone offsets most of the additions.
  - Consider git-LFS or a CDN/`public`-hosted fetch if the repo's `.git` history is bloating
    (each re-encode adds a full blob). Flag: the audio is bundled in `public/`, so it ships in
    every build/deploy too — relevant for Vercel/static-host size limits.
  - Do NOT add lossless/256 kbps for new ambient tracks; 112–128 kbps stereo is the right tier.

---

## 3. "Better everywhere" audio polish (deliverable 3)

Current ambient playback (`music.ts:142-185`) is a **hard cut** between tracks: `advance()`
(`151-155`) sets a new `src` and calls `play()` with no fade. Era switches (`171-178`) also cut
instantly. Victory (`music.ts:58-91`) does an abrupt `stopAmbient()` then plays the fanfare.

Recommended polish (file:line for each):
1. **Crossfade between tracks** — `music.ts:151-155` (`advance`) + `142-149` (`startTrack`).
   Use a second `HTMLAudioElement` (A/B pair) and ramp one down while the other ramps up over
   ~1.5–2 s on `timeupdate`/`onended`. Removes the jarring gap; biggest perceived-quality win.
2. **Crossfade on era change** — `music.ts:171-178`. Same A/B mechanism so switching sets mid-
   game glides instead of cutting.
3. **Fade-in on first start / fade-out on stop** — `startTrack` (`142-149`) and `stopAmbient`
   (`187-193`). `stopAmbient` currently calls `ambEl.pause()` with no ramp; a 0.5 s gain ramp
   to 0 before pause avoids the click.
4. **Ducking under victory** — `music.ts:58-69`. Instead of a hard `stopAmbient()`, ramp the
   ambient bed down to ~0.1 and resume/ramp-back in `stopVictoryMusic()` (`201-216`, which
   already calls `playAmbient()` to restore). Smoother celebration transition.
5. **Per-era victory variation** — `playVictoryMusic` (`music.ts:58`) and the synth `fanfare`
   (`39-55`) are era-agnostic. Could pick a fanfare key/instrumentation (or a different victory
   stem) by current era for variety. Low priority; the single fanfare is fine.
6. **Gapless loop / smoother loop** — long tracks loop only at pool-reshuffle, not within a
   track (`ambEl.loop = false`, `music.ts:168`). With crossfade (item 1) this is handled; no
   separate work needed.
7. **SFX layer is already strong** — `sfx.ts` has a recorded-sample layer (CC0 OpenGameArt,
   34 `.wav` files present in `public/audio/sfx/`, 4 MB) with synth fallback, deterministic
   variants per card (`VARIANTS`, `sfx.ts:87-97`), and master-gain volume control
   (`sfx.ts:59-63`). The 6 per-resource gather cues (`res-*`) have **no .wav files** (only
   `res-lumber..res-gold` synth fallbacks at `sfx.ts:318-342`) — `SAMPLE_VOICES` lists them
   (`sfx.ts:82-84`) but `public/audio/sfx/` has no `res-*.wav`. Adding 6 real CC0 recordings
   (chop/kiln/shears/scythe/pickaxe/coins) is the main SFX "better" opportunity. Verified: the
   fetch silently falls back, so this is a polish gap, not a bug.

---

## Verification summary
- All counts/sizes/durations verified against real files (`stat`, `file`, computed).
- `MUSIC_LICENSES.md` exists, accurate, attribution rendered in `App.tsx:85` — CC-BY satisfied.
- Per-era minute claims in the doc match measured values (±1 min).
- `res-*.wav` SFX samples confirmed ABSENT (synth fallback only).
- No crossfade/ducking/fade currently exists — confirmed hard cuts in `music.ts`.
