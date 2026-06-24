# C — Card data / effects + Face-up central supply audit (2026-06-24)

Read-only investigation of `src/data/cards.json` (246 cards) against the official
Rivals for Catan rulebooks. The corpus is loaded by `src/data/cards.ts`; the face-up
supply is built in `src/engine/newGame.ts` (`buildSupply` filters `tag === 'Face-up Expansion'`
into `GameState.supply`; `buildDrawDeck` EXCLUDES that tag from the face-down draw stacks).

**Authoritative sources used (re-verifiable):**
- Base rules (Gold/Turmoil/Progress face-up + the rule): `rivals_for_catan_rules_200309.pdf`
- Age of Darkness — **Mayfair 2011 edition** has the explicit per-era face-up list that the
  2021 reprint OMITS for Intrigue: `catancollector.com/.../rfc-ageofdarkness_rules_2011-mayfair.pdf`
- Age of Darkness — 2021 reprint: `rivals-aod-rules-eng_200415.pdf`
- Age of Enlightenment: `rivals-aoe-rules-eng_200421.pdf`
- BGG threads: "1x cards confusion" (#2948904), "Era of Intrigue Face Up Expansion Cards" (#2652507)
- Project docs: `docs/goal-2026-06-19/06-official-rules-research.md`,
  `docs/goal-2026-06-21-expansion-themes/rules-work/*.md`, `docs/goal-2026-06-22-aod-playable/AUDIT.md`

---

## THE RULE (base rulebook p.14, verbatim)

> "In each Theme Set, there are expansion cards that must be accessible to both players. Separate
> these cards out and place them as a **face-up expansion card stack** next to the draw stacks.
> These cards are never part of your hand. Instead, you may look through this stack, select the card
> you want to build, and pay the building costs as usual… **Each card in the face-up expansion card
> stack is marked with a "(1x)" after the card name. You may only have 1 copy of each in your
> principality.**"

**Critical clarification (resolves the owner's "missing many / wrongly including" concern):**
The "(1x)" suffix is NOT a reliable face-up marker. It is also printed on draw-deck cards that simply
have a "max 1 in your principality" limit (e.g. `intrigue-odins-fountain`, `intrigue-pilgrimage-site`,
`intrigue-master-of-the-brotherhood`, many AoD/AoE "1x" cards). **The face-up stack contents are
defined ONLY by the explicit per-era setup sentence** ("The face-up expansion card stack consists of…").
Each rulebook names them per era. That sentence — not the "(1x)" suffix — is authoritative.

Lifecycle note (base p.15): a building taken from the face-up stack, when removed, **returns to the
face-up stack, not the discard pile** (the engine already models this — see
`docs/quality-2026-06-19/CHANGES.md` Q1).

---

## AUTHORITATIVE FACE-UP STACK — per era (quoted from the rulebooks)

| Era / set | Face-up cards (rulebook setup sentence) | Copies |
|---|---|---|
| `gold` | "…consists of the two **Merchant Guilds**." | Merchant Guild ×2 |
| `turmoil` | "…consists of the 2 **Hedge Tavern** cards." | Hedge Tavern ×2 |
| `progress` | "…consists of the two **University** cards." | University ×2 |
| `intrigue` | (Mayfair 2011) "…consists of 2 **Odin's Temple** cards and 2 **Church** cards." | Church ×2, Odin's Temple ×2 |
| `merchants` | "…consists of the two **Commercial Harbor** cards." | Commercial Harbor ×2 |
| `barbarians` | "…consists of 2 **Castle** cards and 2 **Triumph Cards**." | Castle ×2, Triumph Card ×2 |
| `explorers` | "…consists of 2 **Shipyard** cards." | Shipyard ×2 |
| `sages` | "…consists of 2 **Manifesto of Humane Conduct** cards." | Manifesto ×2 |
| `prosperity` | "…consists of 2 **Builders' Hut** cards, the **Prince** card, and the **Princess** card." | Builder's Hut ×2, Prince ×1, Princess ×1 |

(The 2021 AoD reprint's Intrigue intro paragraph simply omits the face-up sentence — a known reprint
gap, confirmed by the BGG "Era of Intrigue Face Up Expansion Cards" thread; the Mayfair edition fills it.)

So the correct face-up id set is **13 ids** (the current data tags only 11, and 2 of those have wrong
copy counts — see below).

---

## FOCUS 1 — Face-up supply: current vs correct

### Currently tagged `"Face-up Expansion"` (11 cards)
| id | set | copies (data) | verdict |
|---|---|---|---|
| `gold-merchant-guild` | gold | 2 | KEEP ✓ |
| `turmoil-hedge-tavern-1x` | turmoil | 2 | KEEP ✓ |
| `progress-university` | progress | 2 | KEEP ✓ |
| `merchants-commercial-harbor` | merchants | 2 | KEEP ✓ |
| `barbarians-castle` | barbarians | 2 | KEEP ✓ |
| `barbarians-triumph-card` | barbarians | 2 | KEEP ✓ |
| `explorers-shipyard` | explorers | **3** | KEEP but **FIX copies → 2** |
| `sages-manifest-of-humane-conduct` | sages | **3** | KEEP but **FIX copies → 2** |
| `prosperity-builders-hut` | prosperity | **3** | KEEP but **FIX copies → 2** |
| `prosperity-prince` | prosperity | **2** | KEEP but **FIX copies → 1** |
| `prosperity-princess` | prosperity | **2** | KEEP but **FIX copies → 1** |

### CORRECTED face-up list — actions to apply

**ADD the tag `"Face-up Expansion"` to (the owner's correction):**
- `intrigue-church` — currently `tag: null`, copies 2. Rulebook: face-up, ×2. **ADD.** ✓ owner correct.
- `intrigue-odins-temple` — currently `tag: null`, copies 2. Rulebook: face-up, ×2. **ADD.** ✓ owner correct.

**Owner mentioned Odin's *cards* — clarify what is NOT face-up:**
- `intrigue-odins-priest` — **action card**, drawn from the deck. NOT face-up. (Do not tag.)
- `intrigue-odins-fountain` — a "(1x)" Extraordinary Site **drawn from the deck** ("max 1" limit, not
  in the setup sentence). NOT face-up.
- `intrigue-pilgrimage-site`, `intrigue-great-thingstead`, `intrigue-sacrificial-site`,
  `intrigue-bishops-see` — all "(1x)" or city expansions but **drawn**, NOT in the face-up sentence.
  Do not tag. (This is exactly the "(1x) ≠ face-up" trap.)

**REMOVE the tag from / FIX:** none need the tag removed — all 11 currently-tagged cards ARE genuine
face-up cards. The errors are (a) two MISSING (`intrigue-church`, `intrigue-odins-temple`) and
(b) five WRONG copy counts.

### Net corrected face-up supply (13 ids)
```
gold-merchant-guild              copies 2
turmoil-hedge-tavern-1x          copies 2
progress-university              copies 2
intrigue-church                  copies 2   <- ADD TAG
intrigue-odins-temple            copies 2   <- ADD TAG
merchants-commercial-harbor      copies 2
barbarians-castle                copies 2
barbarians-triumph-card          copies 2
explorers-shipyard               copies 2   <- FIX (was 3)
sages-manifest-of-humane-conduct copies 2   <- FIX (was 3)
prosperity-builders-hut          copies 2   <- FIX (was 3)
prosperity-prince                copies 1   <- FIX (was 2)
prosperity-princess              copies 1   <- FIX (was 2)
```

**IMPORTANT engine note:** `intrigue-church` and `intrigue-odins-temple` are referenced by name in
many requirement strings (Bishop, Missionary, Bishop's See, Bran, Judith, Sacrificial Site, Great
Thingstead, Religious Dispute, etc.) and effects. Moving them from the draw deck to the face-up supply
is exactly the intended behaviour, but verify they still satisfy those `requires` checks when built
from the supply (the requirements parser keys on placed-card names, so it should be unaffected — but
this is the blast radius to re-test). Also confirm `barbarians-triumph-card` (a Marker Card) being in
the supply still drives the Triumph→VP marker logic added in the AoD-playable pass.

---

## FOCUS 2 — Format + effects audit of active cards

**Good news:** the AoD rules_text was fully rewritten from the rulebook on 2026-06-22 (commits
645c22d…ee020ef, per `AUDIT.md`), and the AoE rules_text was rewritten in the expansion-themes pass.
The garbled text seen in `rules-work/intrigue.md` (e.g. "Cold Castle", "facet fact", "fortifies") is a
**stale pre-rewrite snapshot** — the LIVE `cards.json` rules_text is clean and rulebook-accurate.
I verified this by dumping current text for the intrigue, explorers, sages, and prosperity sets.

### Prioritized DATA ERRORS still present in live data

| Priority | id | Issue | Correct value / action | Source |
|---|---|---|---|---|
| **P0** | `sages-unknown` | Junk extraction artifact: name "Unknown", `category: building`, `copies: 1`, empty rules_text, empty cost. **It will be shuffled into a Sages draw stack as a blank buildable card.** | REMOVE from corpus (or change to a non-drawn category). It is an unidentified card image, not a real card. | `cards.json:4353`; AoE has no "Unknown" card |
| **P0** | `prosperity-card-back` | Junk artifact: name "Card Back", `category: building`, `copies: 1`, empty rules_text. **The deck-back image leaked into the playable corpus and will shuffle into a Prosperity draw stack.** | REMOVE from corpus. | `cards.json:4826` |
| **P1** | `explorers-shipyard` | `copies: 3` but face-up stack is ×2 | set `copies: 2` | AoE rules setup sentence |
| **P1** | `sages-manifest-of-humane-conduct` | `copies: 3` but face-up stack is ×2 | set `copies: 2` | AoE rules setup sentence |
| **P1** | `prosperity-builders-hut` | `copies: 3` but face-up stack is ×2 | set `copies: 2` | AoE rules setup sentence |
| **P1** | `prosperity-prince` | `copies: 2` but face-up stack has ×1 | set `copies: 1` | AoE rules setup sentence |
| **P1** | `prosperity-princess` | `copies: 2` but face-up stack has ×1 | set `copies: 1` | AoE rules setup sentence |
| **P2** | `explorers-explorer-metropolis` | `values.requires` is malformed — it embeds the placement sentence AND a literal "Requires:" prefix: `"Place on the city adjacent to the Explorer Harbor. Requires: At least 6 discovered sea cards or at least 2 level-3 islands."` The requirements parser cannot match this (it expects atomic predicates). | Set `requires` to the predicate only, e.g. `"6 discovered sea cards or 2 level-3 islands"`; keep the placement instruction in `rules_text` (already there). | AoE rules; `cards.json` |
| **P2** | Several `requires` end with a trailing period | `barbarians-siegfried-vanquisher-of-the-barbarians` ("Castle and at least 2 heroes."), `prosperity-hospital` ("Aqueduct."), `prosperity-artwork-sculpture` ("Prince or Princess."), `sages-dispute-of-the-sages`, `sages-wise-compensation`, `sages-power-of-the-groves`, `prosperity-prince`/`princess` ("Not having a Prince/Princess."), `explorers-ambassador`, `barbarians-alliance-against-the-barbarians` | The parser (`requirements.ts:56,77`) DOES strip trailing periods, so these are tolerated — but they read poorly and the longer-sentence ones (`ambassador`, `explorer-metropolis`) risk mis-parsing. Normalize to terse predicates for safety/consistency. | `requirements.ts`; `cards.json` |

### NOT errors (verified OK; clearing earlier suspicions)
- Commercial Harbor copies ×2 — correct (matches rulebook), as `AUDIT.md` already noted.
- No AoE point types (wisdom/contentment/sail/cannon) leaked onto base/AoD cards — the earlier vision
  bug is fixed. Zero cross-set contamination found.
- AoD/AoE rules_text — clean, concise, rulebook-faithful paraphrases. No garble markers in live data.
- The empty-rules_text base heroes (`base-austin`, `base-harald`, `base-inga`, `base-osmund`,
  `base-candamir`, `base-siglind`, `turmoil-carl-forkbeard`) are **strength/skill-only heroes with no
  special text** — empty rules_text is correct for them (their value is the point icon, not an effect).
  `gold-merchant-guild` empty rules_text is also fine (a passive money building; its effect is
  guided/manual). These are NOT errors.

---

## FOCUS 3 — Cards still needing owner / physical-card confirmation

These carry `confidence: 'low'` or `'medium'` (provenance flags from the source-quality pass). The
rules_text reads correctly for nearly all; the flags mostly reflect "transcribed from a 271px image /
rulebook paraphrase, point VALUE not physically confirmed." Genuine open questions to confirm against
the physical cards:

**`unclear[]` flags still set (4 cards):**
- `turmoil-large-festival-hall` — `unclear`: the two red banner icons' point type (VP vs strength?) and
  the cost icon row (read as 2 gold + 2 ore + 2 brick). **Needs physical-card confirmation.**
- `base-abbey` — `unclear`: "No effect text transcribed — confirm whether it has printed rules or is a
  prerequisite-only card." (Likely prerequisite-only, but confirm.)
- `turmoil-hedge-tavern-1x` — `unclear`: "No effect text transcribed — confirm." (A face-up money
  building; likely passive, but confirm.)
- `gold-merchant-guild` — `unclear: ["<MISSING>"]` — placeholder garbage in the unclear array; the card
  itself is a passive money building. Clean up the `<MISSING>` token regardless.

**`confidence: 'low'` cards where the point VALUES specifically want physical confirmation** (rules_text
is fine; the open item is whether printed point icons match):
- Explorers: `explorers-armory` (strength 1 + cannon 1 — confirm icons).
- Prosperity: `prosperity-prince`, `prosperity-princess` (strength 1 each + the "Artwork retrieval"
  ability — confirm), `prosperity-monument-to-the-prince`, `prosperity-city-palace`,
  `prosperity-mercenaries`.
- Sages: `sages-grove-of-courage`, `sages-manifest-of-humane-conduct`, `sages-cole-paladin-of-the-sages`.
- Barbarians: `barbarians-white-raven-tavern`, `barbarians-siward-the-scout`,
  `barbarians-wolfgang-the-street-performer`, `barbarians-caravel`, `barbarians-secret-brotherhood`,
  `barbarians-contest-of-the-heroes`, `barbarians-barbarian-attack`, `barbarians-retreat-of-the-barbarians`.
- Intrigue: `intrigue-odins-fountain`, `intrigue-reiner-the-miller`, `intrigue-abbey-brewery`,
  `intrigue-red-light-tavern`, `intrigue-sacrificial-site`, `intrigue-bishop`, `intrigue-odins-priest`.
- Merchants: `merchants-commercial-harbor`, `merchants-lighthouse`.

(28 `low` + 64 `medium` total. `AUDIT.md` claimed the AoD `unclear[]` flags were all cleared on
2026-06-22, yet `confidence` flags persist on AoD cards — the values pass cleared the array flags but
left the `confidence` field; this is a labelling inconsistency, not a data bug. Recommend: do not treat
`confidence:'medium'` as "needs fixing" — only the 4 `unclear[]` cards above are genuine open data
questions.)

---

## Summary of recommended changes (for the fix batch)

1. **Face-up tag ADD ×2:** `intrigue-church`, `intrigue-odins-temple` → `tag: "Face-up Expansion"`.
   (Owner's correction confirmed; Odin's Priest/Fountain stay in the draw deck.)
2. **Copy-count fixes ×5:** shipyard 3→2, manifesto 3→2, builders-hut 3→2, prince 2→1, princess 2→1.
3. **REMOVE 2 junk cards:** `sages-unknown`, `prosperity-card-back` (currently buildable blanks).
4. **Fix malformed `requires`:** `explorers-explorer-metropolis` (strip embedded placement sentence +
   duplicate "Requires:"); optionally normalize trailing-period `requires` strings.
5. **Cleanup:** `gold-merchant-guild` `unclear: ["<MISSING>"]` token.
6. **Re-test blast radius** after #1: requirement checks that name Church / Odin's Temple, and the
   Triumph-card→VP marker, when those cards are built from the supply rather than drawn.
7. **Owner confirmation (physical cards):** the 4 `unclear[]` cards' point values/costs (esp.
   `turmoil-large-festival-hall`).
