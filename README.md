# Catan Duel

A digital, **hands-on** table for the two-player *Catan: The Duel / Rivals for Catan*. It tracks
state, does the maths, dice and shuffling, and adds atmosphere — but it never enforces the rules:
both players dictate the flow, exactly like the cards in front of you (a "trust-based" sandbox).

Plays the whole basic game plus the **Gold / Turmoil / Innovation** eras on **one screen** (both
principalities + the central row), with fitting sounds for every card and event, shuffled medieval
background music, and a clean, minimal UI.

> Personal project for private play by owners of the physical game. Not affiliated with or endorsed
> by the publisher. Do not redistribute the publisher's card art.

## Play (easiest — double-click)

On Windows with the repo in WSL, just double-click these (they live in the repo and in
`C:\Projects\catan-duel\`):

| Double-click | What it does |
|---|---|
| **`PLAY.bat`** | Installs on first run, starts the game, opens the browser. Hotseat = both sides on one screen. |
| **`PLAY-ONLINE.bat`** | Opens the **online control panel** (`RADMIN.ps1`) — live status + one-key Open/Close. |
| **`UPDATE.bat`** | `git pull` + reinstall — get the latest version, no terminal needed. |
| **`STOP.bat`** | Stop the local servers. |
| **`START-HERE.html`** | Friendly index: live "is it running?" check + makes your friend's online link. |

## Run from source (any OS)

Requires Node 18+.

```bash
npm install
npm run dev        # local play — open the printed URL (Hotseat works out of the box)
```

| Command | What |
|---|---|
| `npm run dev` | Local dev server (Hotseat / pass-and-play) |
| `npm run build` | Type-check + production build to `dist/` |
| `npm test` | Unit + fuzz suite (Vitest) |
| `npm run e2e` | Playwright end-to-end suite (incl. an audio playback test) |
| `npm run party` | Run the PartyKit relay locally (for Online play) |
| `npm run party:deploy` | Deploy the relay to Cloudflare (needs a PartyKit login) |

## Play online (two devices)

Online uses a tiny [PartyKit](https://www.partykit.io/) websocket relay; all game logic is
client-side and deterministic, so the relay is just a message bus.

- **Easiest — over [Radmin VPN](https://www.radmin-vpn.com/) (free, private, no cloud):** both join one
  Radmin network, then the host runs **`PLAY-ONLINE.bat`** → press `1` (it starts the servers, opens
  the firewall **to Radmin peers only**, and shows your link), shares the link, and presses `2` to close
  it safely afterwards. The panel shows live Radmin / firewall / server / friend status. See
  `PLAY-ONLINE.html` for the full walk-through.
- **Manual:** `npm run party` + `npm run dev`, both open the dev URL and join the same room code from
  the **Online** tab. (LAN / VPN IPs use plain `ws` automatically.)
- **Public:** `npm run party:deploy`, set `VITE_PARTYKIT_HOST` to the deployed URL, build, host `dist/`.

## Audio

- **Sound effects** are synthesized live (no files) — a fitting cue per card/event (build, ship→water,
  hero→flourish, attack→menace, trade→coin, festival, invention, harvest, action card). One sound per
  action; nothing layers.
- **Background music** is a shuffled playlist of bundled **CC0 (public-domain)** medieval tracks
  (`public/audio/bgm-*.mp3`) that cycle and reshuffle; a victory track plays on the win screen
  (`public/audio/victory.mp3`), with a synth fanfare fallback.
- **Controls:** everything is on by default; lower or mute SFX/music from **⚙ Setup → Sound** or the
  mute button. To swap a track, replace the file in `public/audio/` (see `docs/quality-2026-06-19/ASSETS.html`
  for curated royalty-free sources).

## Optional assets (drop in your own)

- **Card photos:** `src/assets/cards/<card-id>.webp` (foundations: `src/assets/buildings/`, regions:
  `src/assets/regions/<resource>.webp`). Picked up automatically.
- **Official city art:** the city currently uses a clean hand-drawn SVG (the only scan was low-res). Drop
  `src/assets/buildings/city.webp` and re-add `'base-city': 'city'` to `FOUNDATION_ART` in
  `src/data/cards.ts` to use a photo instead.

## How it's built

- **React + TypeScript + Vite + Zustand.**
- `src/engine/` — a pure, serializable, deterministic rules/state reducer (no React); the source of
  truth, broadcast verbatim between clients. The face-up-expansion supply is **derived from the board**,
  so it's correct after any action and any sync merge.
- `src/net/` — a swappable transport (`loopback` for local, `partykit` for online) with a seat-authority
  merge so two players' simultaneous edits never clobber each other.
- `src/ui/` — the table, cards, animations, and `src/audio/` (synth SFX + the music playlist).
- `docs/` — official-setup verification, the refactor plan, UX research, and the
  `docs/quality-2026-06-19/` findings + change log.

See `docs/REFACTOR_PLAN.md` for the feature map and `docs/quality-2026-06-19/INDEX.md` for the latest work.
