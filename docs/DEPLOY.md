# Play online with friends — no Radmin, no repo, free

Catan Duel deploys as a single public website using **PartyKit** (runs on Cloudflare).
Your friends just open a link in any browser — nothing to install, no VPN, no GitHub.

## Why this works
- The whole game runs in the browser; the server (`party/server.ts`) is a tiny message
  relay. When PartyKit serves the built site, the game talks to that same address with
  zero config — so one deploy gives you the game **and** the multiplayer in one URL.
- A 2-player turn game is far inside the free tier, so this costs **£0**.

## One-time setup (you, once)
```bash
cd ~/projects/catan-duel
npm install            # if you haven't
npm run build          # bundles the game into dist/  (already verified working)
npm run party:deploy   # deploys to your own Cloudflare account
```
The first `party:deploy` opens a browser to log in (GitHub / Cloudflare — both free).
After it finishes it prints your permanent URL, e.g.:
```
https://catan-duel.<your-username>.partykit.dev
```

## Playing
1. Share that URL with your friend.
2. Both open it → **Online** tab.
3. One person picks a room code (or uses the random one) and shares it; the other types
   the same code. Enter your names (they now show on the board). You're playing.

## Shipping updates later
Make changes, then just:
```bash
npm run build && npm run party:deploy
```
Same URL, updated game.

## Notes
- Local LAN/Radmin play still works exactly as before (`PLAY.bat` / hotseat); this only
  adds the public option.
- Verified before deploy: `npm run build` succeeds and `npx partykit dev` serves the
  built `dist/` with the relay on the same origin (the exact deploy behaviour), so what
  you deploy is what was tested.
- The only step that needs you is the one-time login (it can't be automated for your
  account). Everything else is prepared.
