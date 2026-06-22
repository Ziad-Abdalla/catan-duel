# Catan Duel — Sound Effect Licenses & Attribution

All sound samples played by `src/audio/sfx.ts` are sourced from clearly free-licensed
collections suitable for public deployment. Each source file was decoded, converted to
mono, silence-trimmed, peak-normalized to **-3 dBFS** (loudness-aware, ceiling-limited so
nothing clips), and re-encoded as **44.1 kHz / 16-bit mono WAV** for volume consistency.
The engine plays every sample at 0.8x through the user-controlled master SFX gain.

## Existing base layer

| Files | Source | License | Author |
|---|---|---|---|
| All originally curated stems (`build`, `place`, `coin`, `hero`, `magic`, `menace`, `rotate`, `turn`, `ui`, `vp`, `harvest`, `sweep`, `water`, `token`, `flip`, `action`, plus `-2`/`-3` variants from the original import) | [RPG Sound Pack](https://opengameart.org/content/rpg-sound-pack) | CC0 (Public Domain) | artisticdude |

## Added / improved in this pass

All newly added files come from **CC0 (Public Domain)** packs by **rubberduck** on
OpenGameArt — no attribution legally required; credited here as a courtesy.

| Cue (stem) | Derived from | Source pack | License | Author |
|---|---|---|---|---|
| `ship.wav` | `wood_squeak_01` + `loop_water_01` (layered: timber creak over a low-passed water bed) | [100 CC0 metal and wood SFX](https://opengameart.org/content/100-cc0-metal-and-wood-sfx) + [100 CC0 SFX #2](https://opengameart.org/content/100-cc0-sfx-2) | CC0 | rubberduck |
| `drums.wav` | `sfx100v2_hit_02` (low-passed, doubled into a martial boom-boom) | [100 CC0 SFX #2](https://opengameart.org/content/100-cc0-sfx-2) | CC0 | rubberduck |
| `drums-2.wav` | `hit_03` (doubled) | [100 CC0 SFX](https://opengameart.org/content/100-cc0-sfx) | CC0 | rubberduck |
| `mystic.wav` | `bell_02` | [100 CC0 SFX](https://opengameart.org/content/100-cc0-sfx) | CC0 | rubberduck |
| `mystic-2.wav` | `bell_01` | [100 CC0 SFX](https://opengameart.org/content/100-cc0-sfx) | CC0 | rubberduck |
| `remove.wav` | `wood_breaking_02` | [100 CC0 metal and wood SFX](https://opengameart.org/content/100-cc0-metal-and-wood-sfx) | CC0 | rubberduck |
| `remove-2.wav` | `wood_slam_01` | [100 CC0 metal and wood SFX](https://opengameart.org/content/100-cc0-metal-and-wood-sfx) | CC0 | rubberduck |
| `page.wav` | `book_01` | [80 CC0 RPG SFX](https://opengameart.org/content/80-cc0-rpg-sfx) | CC0 | rubberduck |
| `page-2.wav` | `book_02` | [80 CC0 RPG SFX](https://opengameart.org/content/80-cc0-rpg-sfx) | CC0 | rubberduck |
| `coin-3.wav` | `item_coins_01` | [80 CC0 RPG SFX](https://opengameart.org/content/80-cc0-rpg-sfx) | CC0 | rubberduck |
| `magic-3.wav` | `spell_02` | [80 CC0 RPG SFX](https://opengameart.org/content/80-cc0-rpg-sfx) | CC0 | rubberduck |
| `build-3.wav` | `wood_hammer_01` | [100 CC0 metal and wood SFX](https://opengameart.org/content/100-cc0-metal-and-wood-sfx) | CC0 | rubberduck |

## Notes

- **No CC-BY assets were used.** Every file is CC0 / Public Domain, so the deployed game
  carries no mandatory attribution obligation. This document is a courtesy record.
- A CC-BY "Taiko drums" loop was evaluated for the battle cue and **rejected** to avoid an
  attribution requirement and because it is a long musical loop rather than a short hit;
  the `drums` cue is built from a CC0 percussive hit instead.
- New cue stems support deterministic variants (`drums`/`drums-2`, `mystic`/`mystic-2`,
  `remove`/`remove-2`, `page`/`page-2`) so repeated events of the same card don't all sound
  identical. See `VARIANTS` in `src/audio/sfx.ts`.
