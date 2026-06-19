# Catan Duel

A digital, **hands-on** table for the two-player *Catan: The Duel / Rivals for Catan*. It tracks
state, does the maths, dice and shuffling, and adds atmosphere — but it never enforces the rules:
both players dictate the flow, exactly like the cards in front of you (a "trust-based" sandbox).

> Personal project for private play by owners of the physical game. Not affiliated with or endorsed
> by the publisher. Do not redistribute the publisher's card art or any copyrighted audio.

## Run it

Requires Node 18+.

```bash
npm install
npm run dev        # play locally — open the printed URL (Hotseat works out of the box)
```

Useful scripts:

| Command | What |
|---|---|
| `npm run dev` | Local dev server (Hotseat / pass-and-play) |
| `npm run build` | Type-check + production build to `dist/` |
| `npm run preview` | Serve the production build |
| `npm test` | Run the test suite (Vitest) |
| `npm run party` | Run the PartyKit relay locally (for Online play) |
| `npm run party:deploy` | Deploy the relay to Cloudflare (needs a PartyKit login) |

## Play online (two devices)

Online uses a tiny [PartyKit](https://www.partykit.io/) websocket relay (free tier).

- **Same network / Radmin VPN:** run `npm run party` and `npm run dev`, then both players open the
  dev URL and join the same room code from the **Online** tab. (VPN/LAN IPs use plain `ws`
  automatically.)
- **Public:** `npm run party:deploy`, set `VITE_PARTYKIT_HOST` to the deployed URL, build, and host
  the static `dist/` anywhere (e.g. Vercel/Netlify). The relay is a dumb message bus; all game logic
  is client-side and deterministic.

## Optional assets (drop in your own)

The app ships no copyrighted media. To use your own:

- **Card photos:** `src/assets/cards/<card-id>.webp` (foundations: `src/assets/buildings/`,
  regions: `src/assets/regions/<resource>.webp`). Picked up automatically.
- **Victory music:** `public/victory.mp3`. If absent, the celebration plays an original synthesized
  fanfare instead.

## How it's built

- **React + TypeScript + Vite + Zustand.**
- `src/engine/` — a pure, serializable, deterministic rules/state reducer (no React); the source of
  truth, broadcast verbatim between clients.
- `src/net/` — a swappable transport (`loopback` for local, `partykit` for online) with a
  seat-authority merge so two players' simultaneous edits never clobber each other.
- `src/ui/` — the table, cards, animations and audio (synthesized via Web Audio).
- `docs/` — the official-setup verification, the refactor plan, and UX polish research.

See `docs/REFACTOR_PLAN.md` for the feature map and `docs/POLISH_RESEARCH.md` for UX references.
