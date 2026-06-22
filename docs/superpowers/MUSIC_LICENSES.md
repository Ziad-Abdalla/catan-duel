# Background music — sources & licenses

All background-music tracks in `public/audio/bgm-*.mp3` are royalty-free and used here
under public-domain (CC0) or CC-BY terms. The victory fanfare (`public/audio/victory.mp3`)
and the SFX engine are out of scope for this document.

The era→track pools are defined in `src/audio/music.ts` (`ALL` + `ERA_TRACKS`).

## bgm-1 .. bgm-18 — CC0 / Public Domain

These tracks were already bundled before this pass. They are public-domain recordings of
medieval / renaissance / classical works sourced from the Internet Archive
(<https://archive.org>) public-domain music collections. No attribution is legally required
(CC0 / PD). They remain unchanged.

## bgm-19 .. bgm-42 — Kevin MacLeod (incompetech.com), CC-BY 4.0

Source site: <https://incompetech.com/music/royalty-free/music.html>
Composer: **Kevin MacLeod (incompetech.com)**
License: **Creative Commons Attribution 4.0** — <https://creativecommons.org/licenses/by/4.0/>

These files were downloaded from incompetech.com and re-encoded to MP3 ~112 kbps (stereo,
44.1 kHz) to keep the bundle small; the recordings are otherwise unmodified.

> **REQUIRED ATTRIBUTION** (place in the game's credits / about screen):
>
> Music by Kevin MacLeod (incompetech.com).
> Licensed under Creative Commons: By Attribution 4.0 License
> https://creativecommons.org/licenses/by/4.0/

| File | Title | Source URL |
|------|-------|-----------|
| bgm-19.mp3 | Angevin | https://incompetech.com/music/royalty-free/index.html?isrc=USUAN1100196 |
| bgm-20.mp3 | Folk Round | https://incompetech.com/music/royalty-free/index.html?isrc=USUAN1100258 |
| bgm-21.mp3 | Master of the Feast | https://incompetech.com/music/royalty-free/index.html?isrc=USUAN1100302 |
| bgm-22.mp3 | Achaidh Cheide | https://incompetech.com/music/royalty-free/index.html?isrc=USUAN1100185 |
| bgm-23.mp3 | Minstrel Guild | https://incompetech.com/music/royalty-free/index.html?isrc=USUAN1100307 |
| bgm-24.mp3 | Teller of the Tales | https://incompetech.com/music/royalty-free/index.html?isrc=USUAN1100366 |
| bgm-25.mp3 | Pippin the Hunchback | https://incompetech.com/music/royalty-free/index.html?isrc=USUAN1100327 |
| bgm-26.mp3 | Court of the Queen | https://incompetech.com/music/royalty-free/index.html?isrc=USUAN1100230 |
| bgm-27.mp3 | Procession of the King | https://incompetech.com/music/royalty-free/index.html |
| bgm-28.mp3 | Sovereign | https://incompetech.com/music/royalty-free/index.html |
| bgm-29.mp3 | Suonatore di Liuto | https://incompetech.com/music/royalty-free/index.html?isrc=USUAN1100356 |
| bgm-30.mp3 | Hidden Agenda | https://incompetech.com/music/royalty-free/index.html?isrc=USUAN1100279 |
| bgm-31.mp3 | Ossuary 1 - A Beginning | https://incompetech.com/music/royalty-free/index.html?isrc=USUAN1100314 |
| bgm-32.mp3 | Echoes of Time v2 | https://incompetech.com/music/royalty-free/index.html?isrc=USUAN1100251 |
| bgm-33.mp3 | Lightless Dawn | https://incompetech.com/music/royalty-free/index.html?isrc=USUAN1100295 |
| bgm-34.mp3 | Volatile Reaction | https://incompetech.com/music/royalty-free/index.html |
| bgm-35.mp3 | Heroic Age | https://incompetech.com/music/royalty-free/index.html?isrc=USUAN1100278 |
| bgm-36.mp3 | Despair and Triumph | https://incompetech.com/music/royalty-free/index.html?isrc=USUAN1100242 |
| bgm-37.mp3 | Crusade | https://incompetech.com/music/royalty-free/index.html?isrc=USUAN1100232 |
| bgm-38.mp3 | Lord of the Land | https://incompetech.com/music/royalty-free/index.html?isrc=USUAN1100298 |
| bgm-39.mp3 | Meditation Impromptu 03 | https://incompetech.com/music/royalty-free/index.html?isrc=USUAN1100304 |
| bgm-40.mp3 | At Rest | https://incompetech.com/music/royalty-free/index.html |
| bgm-41.mp3 | Frost Waltz | https://incompetech.com/music/royalty-free/index.html?isrc=USUAN1100265 |
| bgm-42.mp3 | Egmont Overture | https://incompetech.com/music/royalty-free/index.html |

Note: Egmont Overture is Beethoven's public-domain composition; this particular *recording*
is Kevin MacLeod's and is therefore covered by the same CC-BY 4.0 attribution above.

## Era pools (≈ minutes, all ≥ 30 min, looping & shuffled)

| Era | Approx. pool length |
|-----|---------------------|
| base | ~33 min |
| gold | ~32 min |
| turmoil | ~34 min |
| progress | ~32 min |
| duel | ~42 min |
| intrigue | ~35 min |
| merchants | ~34 min |
| barbarians | ~34 min |
| explorers | ~35 min |
| sages | ~30 min |
| prosperity | ~31 min |

Pools intentionally overlap (share tracks across moods) to reach 30+ min per era without
bundling 11 separate 30-minute libraries.
