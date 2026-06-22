# Catan Duel

A digital, **hands-on** table for the two-player *Catan: The Duel / Rivals for Catan*. It tracks
state, does the maths, dice and shuffling, and adds atmosphere — but it never enforces the rules:
both players dictate the flow, exactly like the cards in front of you (a "trust-based" sandbox).

Plays the whole basic game plus **all nine theme eras** (Gold, Turmoil, Innovation, Intrigue,
Merchants, Barbarians, Explorers, Sages, Prosperity — mix as many as you like) on **one screen**
(both principalities + the central row), with fitting sounds for every card type and event, a
fitting 30-minute soundtrack per era, and a clean, minimal UI whose top bar folds away to a
corner handle so nothing covers the board.

Payment is fully **manual**: building, upgrading and playing never auto-spend — you rotate your own
region discs, exactly like the table. Drag a card onto the board to place it (its sound + a fitting
flourish fire on the drop); drag a piece to the build bar to remove it; play an active card with one
tap that shows your opponent, fires its effect, and discards it.

> Personal project for private play by owners of the physical game. Not affiliated with or endorsed
> by the publisher. Do not redistribute the publisher's card art.

## Play (easiest — double-click)

On Windows with the repo in WSL, just double-click these (they live in the repo and in
`C:\Projects\catan-duel\`):

| Double-click | What it does |
|---|---|
| **`Catan-Duel.hta`** | **Desktop control panel** — one window with Play / Host online / Stop / Update buttons, live game + firewall status, and a copy-to-clipboard link for your friend. The Desktop shortcut points here. |
| **`PLAY.bat`** | Installs on first run, starts the game, opens the browser. Hotseat = both sides on one screen. |
| **`PLAY-ONLINE.bat`** | Opens the **online control panel** (`RADMIN.ps1`) — live status + one-key Open/Close. |
| **`UPDATE.bat`** | `git pull` + reinstall, then refreshes the panel files — get the latest version, no terminal needed. |
| **`STOP.bat`** | Stop the local servers. |
| **`START-HERE.html`** | Friendly index: live "is it running?" check + makes your friend's online link. |

The control panel (`Catan-Duel.hta`) is a self-contained window: its buttons drive the sibling
`.bat` launchers, so keep it in the same folder as them. `UPDATE.bat` re-copies the panel + launchers
to wherever they sit after each pull, so the Desktop copy stays current on its own.

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
- **Public (easiest for friends — no Radmin, no repo, free):** `npm run build && npm run party:deploy`.
  PartyKit serves the built game **and** the relay from one free Cloudflare URL, so friends just open a
  link in any browser. Full walk-through in **[`docs/DEPLOY.md`](docs/DEPLOY.md)**.

## Audio

- **Sound effects** are a fitting cue per card type/event — recorded CC0 samples (ship, war drums,
  mystic chime, demolish, coins, build, page-flip…) with a live synth fallback, all volume-normalised
  and driven by the SFX slider. One sound per action; nothing layers.
- **Background music** gives each era its own fitting ~30-minute shuffled, looping soundtrack
  (`public/audio/bgm-*.mp3`); two or more eras play a blended "duel" mix. A victory track plays on the
  win screen. Tracks are CC0 (archive.org) plus **CC-BY Kevin MacLeod (incompetech.com)** — the required
  attribution lives in a collapsed "Credits & licenses" note in the card gallery (never over gameplay).
  Full attributions: `docs/superpowers/MUSIC_LICENSES.md` and `SFX_LICENSES.md`.
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
