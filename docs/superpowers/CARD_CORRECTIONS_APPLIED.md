# Card data corrections applied

Source: the per-era audits in `docs/superpowers/recon/cards-audit-*.md`.
Ground truth: card art at `src/assets/cards/<id>.webp`, re-opened and re-confirmed
for every correction below. Only `src/data/cards.json` was edited.

**Process:** every HIGH-confidence item was re-verified against the image and applied.
MED items were applied ONLY where re-reading the art made the fix unambiguous; all other
MED, every LOW, all id changes, and the systemic "phantom gold cost / pirate build cost"
pattern (where no specific per-card HIGH/clear-MED call existed) were DEFERRED.

**Validation after edit:** JSON valid · `tsc --noEmit` exit 0 · `vitest run` 195/195 passing (no breakages).

## Applied (45 corrections)

### base
| id | field | old → new |
|---|---|---|
| base-siglind | cost | `[]` → `wool×2, grain×1, ore×1` (HIGH) |
| base-candamir | cost | `wool×1, grain×1, ore×1` → `wool×2, grain×1, ore×1` (HIGH) |

### explorers
| id | field | old → new |
|---|---|---|
| explorers-zheng-he | name | "Zheng He" → "Haidao Chang" (HIGH) |
| explorers-cinmarone | name | "Cinmarone" → "Cimmarone" (HIGH) |
| explorers-sailmakers-shop | cost | `brick×1, gold×1` → `brick×1, grain×1` (HIGH) |
| explorers-broadside | values.requires | "At least 2 common points" → "At least 2 cannon points" (HIGH) |
| explorers-explorer-metropolis | values.requires | "…At least 2 level 3 lands." → "…At least 6 discovered sea cards or at least 2 level-3 islands." (HIGH) |
| explorers-ambassador | values.requires | garbled "…Bland of the Burds…" → "You have rotated the respective card at least to level 1." (HIGH) |
| explorers-friendship-between-peoples | rules_text | wrong "lose excess resources" text → "Each player receives any 1 resource of his choice for each Island card he has rotated at least to the next higher level." (HIGH) |

### sages
| id | field | old → new |
|---|---|---|
| sages-manifest-of-humane-conduct | name | "Manifest of Humane Conduct" → "Manifesto of Humane Conduct" (HIGH) |

### turmoil
| id | field | old → new |
|---|---|---|
| turmoil-large-festival-hall | cost | `gold×2, ore×2, brick×2` → `grain×3, ore×3, brick×2` (HIGH type + counts unambiguous on art: 3 grain sheaves / 3 ore / 2 brick) |

### gold
| id | field | old → new |
|---|---|---|
| gold-gold-cache | tag | "Building" → "Extraordinary Site" (HIGH; printed category band) |

### merchants
| id | field | old → new |
|---|---|---|
| merchants-trading-post | cost | `lumber×1, brick×1` → `grain×1, wool×1` (HIGH) |
| merchants-brigand-camp | cost | `lumber×1, brick×1` → `wool×1, grain×1` (HIGH) |
| merchants-olaf-the-merchant-ship-captain | cost | `gold×1, ore×2` → `grain×1, wool×1` (HIGH) |
| merchants-pirate-ship | cost | `wool×1, grain×1, ore×1` → `lumber×1, wool×1` (HIGH) |
| merchants-commercial-metropolis | cost | `brick×2, ore×2` → `lumber×1, brick×1, wool×1` (HIGH) |
| merchants-commercial-harbor | cost | `gold×2, brick×1, ore×1` → `grain×1, wool×1, brick×1` (HIGH) |
| merchants-master-merchants-alliance | cost | `lumber×1, brick×1, wool×1` → `grain×1, lumber×1, brick×1` (HIGH) |
| merchants-cloth-merchants-residence | rules_text | reversed "gain 2 wool" → "For 2 wool from the adjacent pasture region, you may rotate the Residence to the next higher level…" (HIGH) |
| merchants-paper-merchants-residence | rules_text | reversed "gain 2 lumber" → "For 2 lumber from the adjacent forest region, you may rotate the Residence to the next higher level…" (HIGH) |

### barbarians
| id | field | old → new |
|---|---|---|
| barbarians-arad-the-strategist | name | "Arad the Strategist" → "Arnd the Strategist" (HIGH) |
| barbarians-arad-the-strategist | cost | `grain×1` → `grain×1, wool×1, ore×1` (HIGH) |
| barbarians-white-raven-tavern | cost | `lumber×1, brick×1` → `lumber×1, grain×1` (HIGH) |
| barbarians-white-raven-tavern | values.skill | `2` → `1` (MED, single skill icon clear on re-read) |
| barbarians-caravel | cost | `lumber×1, brick×1` → `lumber×1, wool×1, ore×1` (HIGH) |
| barbarians-caravel | values.strength | (none) → `2` (MED, two swords clear on re-read) |
| barbarians-marie-the-shieldmaiden | cost | `brick×1, ore×1` → `wool×1, lumber×1` (HIGH) |
| barbarians-secret-brotherhood | cost | `lumber×1, grain×1` → `wool×1, lumber×1, gold×1` (HIGH) |
| barbarians-bailwick | cost | `lumber×1, brick×1` → `wool×2, lumber×1, brick×1` (HIGH) |
| barbarians-arsenal | cost | `brick×2, ore×1` → `wool×1, lumber×1, brick×1` (HIGH) |
| barbarians-siegfried-vanquisher-of-the-barbarians | values.requires | "Caft and at least 2 heroes." → "Castle and at least 2 heroes." (HIGH) |

### prosperity
| id | field | old → new |
|---|---|---|
| prosperity-mercenaries | cost | `wool×1, ore×1` → `ore×1, gold×1` (HIGH) |
| prosperity-hospital | cost | `lumber×2, ore×1` → `wool×2, lumber×1, ore×1` (HIGH) |
| prosperity-theater | cost | `lumber×2, brick×1` → `wool×2, lumber×1, brick×1` (HIGH) |
| prosperity-aqueduct | cost | `brick×2, ore×2` → `lumber×2, brick×2, ore×2` (HIGH) |
| prosperity-builders-hut | cost | `brick×2, ore×1` → `brick×2, ore×2` (HIGH) |
| prosperity-thieves-hideout | cost | `lumber×1, brick×1, ore×1` → `wool×1` (HIGH; single sheep icon, Extraordinary Site) |
| prosperity-prince | values | drop `victory_points:1`, add `strength:1` (MED, blue badge confirmed) |
| prosperity-princess | values | drop `victory_points:1`, add `skill:1` (MED, green badge confirmed) |

### progress
| id | field | old → new |
|---|---|---|
| progress-town-hall | cost | `wool×1, ore×1, brick×1` → `wool×2, ore×2, brick×1` (HIGH) |
| progress-university | cost | `lumber×1, grain×1, brick×1` → `lumber×2, grain×2, brick×1` (HIGH) |
| progress-pharmacy | cost | `wool×1, brick×1, gold×1` → `wool×2, brick×1, gold×1` (HIGH) |
| progress-bath-house | cost | `brick×1, wool×1, ore×1` → `brick×2, wool×1, ore×1` (HIGH) |
| progress-parliament | cost | `lumber×2, brick×1, wool×1` → `lumber×3, brick×2, wool×2` (HIGH) |

## Deferred

### base
| id | field | reason |
|---|---|---|
| base trade ships (large-trade-ship, gold-ship, ore-ship, grain-ship, lumber-ship, brick-ship, wool-ship) | values.commerce | LOW / advisory; consistent across all 7 → deliberate model choice, not asserted |

### explorers
| id | field | reason |
|---|---|---|
| explorers-zheng-he | cost | MED — pirate "no build cost" is the systemic pirate pattern; defer per instructions |
| explorers-cinmarone | cost | MED — pirate pattern, defer |
| explorers-jean | cost | MED — pirate pattern, defer |
| explorers-landing-stage | cost | MED — low-res; 2nd icon read uncertain, defer |
| explorers-cannon-foundry | cost | MED — low-res icon read, defer |
| explorers-astronomer | cost | MED — low-res icon read, defer |
| explorers-armory | rules_text/values | LOW — watermark-obscured icons |
| explorers-most-successful-explorer | rules_text | MED — needs rules-reference cross-check, defer |

### sages
| id | field | reason |
|---|---|---|
| sages-manifest-of-humane-conduct | cost / tag | LOW — marker/rotation cost not a build cost; do not assert. Tag→"Marker Card" deferred (no enum value) |
| sages-grove-of-freedom / -fraternity / -justice / -peace / -vigilance / -great-foresight / -courage | cost | MED — low-res grove art; not unambiguous, defer |
| sages-robert-herald-of-the-sages | cost | MED — icon read, defer |
| sages-academy-of-sages | cost | MED — icon read, defer |
| sages-courthouse | cost | MED — "re-verify exact" per audit, defer |
| sages-granary | cost | MED — ore presence ambiguous, defer |
| sages-great-foresight / -dispute-of-the-sages / -wise-compensation / -power-of-the-groves / -wise-protection | cost | MED — systemic action-card "phantom gold" pattern; defer per instructions |
| sages-walther-sage-of-the-gold-field | rules_text | LOW — possible extra clause, unverifiable |

### gold
| id | field | reason |
|---|---|---|
| gold-gold-cache | cost | MED — audit said "do not assert"; no top-left cost column but loader forbids inventing removal call |
| gold-merchant-guild | cost / values.commerce | MED — counts watermark-obscured, defer |
| gold-harbor / -trading-base / -salt-silo / -mint / -staple-house | values (strength-banner) | LOW — advisory, not asserted |
| gold-salt-silo | name casing | LOW — cosmetic |

### turmoil
| id | field | reason |
|---|---|---|
| turmoil-drill-ground | values.other | LOW — advisory |
| turmoil-fairgrounds / -fire-brigade / -chapel / -tithe-barn | values (strength-banner) | LOW — advisory |
| turmoil-hedge-tavern-1x | rules_text | LOW — no printed rules text (no change needed per audit) |

### merchants
| id | field | reason |
|---|---|---|
| merchants-commercial-harbor | values.requires | MED — no requirement actually printed; defer rather than blank it |
| merchants-master-merchants-alliance | values (VP/commerce) | MED — watermark; only a sword clearly visible, defer |
| merchants-trading-station | cost | MED — 2nd icon read uncertain, defer |
| merchants-craft-guild | cost / values.strength | MED/LOW — watermark, defer |
| merchants-capricious-sea | rules_text | MED — die-roll table; needs rules-reference cross-check, defer |
| merchants-pirate-ship / -fortunate-trade-voyage / -lighthouse | values / wording / cost | LOW — ambiguous, defer |

### barbarians
| id | field | reason |
|---|---|---|
| barbarians-bailwick | name ("Bailwick"→"Bailiwick") | LOW per audit + id-adjacent name; deferred (cosmetic, name graded LOW) |
| barbarians-castle | cost | MED — lumber presence ambiguous, defer |
| barbarians-barbarian-stronghold | cost | MED — 2nd icon read uncertain, defer |
| barbarians-baroc-the-barbarian | cost | MED — watermark gold/ore read, defer |
| barbarians-siward-the-scout | cost | MED — watermark, defer |
| barbarians-wolfgang-the-street-performer | cost | MED — watermark gold vs grain, defer |
| barbarians-marie-the-shieldmaiden | values | LOW — faint icons, defer |
| barbarians-triumph-card | category ("Marker Card") | LOW — no enum value; defer |
| barbarians-secret-brotherhood / -arsenal / -bailwick / -castle | values.strength | LOW — clean-scan confirmation needed |

### progress
| id | field | reason |
|---|---|---|
| progress-library | cost | MED — lumber count slightly ambiguous, defer |

### intrigue
| id | field | reason |
|---|---|---|
| intrigue-pilgrimage-site / -great-thingstead / -odins-fountain / -red-light-tavern / -bran-defender-of-the-temple / -master-of-the-brotherhood / -godfrey-the-intriguer / -odins-temple / -sacrificial-site / -church / -bishops-see / -judith-guardian-of-the-church | cost | MED/LOW — intrigue art is low-resolution; audit itself recommends cross-checking a high-res reference before editing. All deferred |
| intrigue-master-of-the-brotherhood / -godfrey-the-intriguer | values (icon counts) | LOW — value icons not clearly visible, defer |
| intrigue-missionary / -bishop / -odins-priest | tag | MED-LOW — cosmetic tag, defer |

### prosperity
| id | field | reason |
|---|---|---|
| prosperity-monument-to-the-prince | cost | MED — gold-vs-grain plausible but not unambiguous, defer |
| prosperity-bera-the-insurrectionist | values.requires ("Public Fencing"→"Public Feeling") | MED — left for orchestrator (rules_text already correct); defer to be conservative |
| prosperity-public-feeling | category ("Marker Card") | MED — no matching CardCategory enum value; defer |
| prosperity-artwork-* | values.victory_points | LOW — VP model intent unclear, defer |
| prosperity-court-astrologer / -bera | category (Action–Attack) | LOW — schema does not distinguish attack actions |

## ID-change recommendations (NOT applied — ids are breaking)

- `explorers-cinmarone` → `explorers-cimmarone` (name corrected in data; slug still misspelled).
- `explorers-zheng-he` → `explorers-haidao-chang` (name corrected; slug now mismatches the card).
- `barbarians-arad-the-strategist` → `barbarians-arnd-the-strategist` (name corrected; slug mismatches).
- `barbarians-bailwick` → `barbarians-bailiwick` (printed "Bailiwick").
- `intrigue-priestess-of-the-horns` → `intrigue-priestess-of-the-norns` (printed "Priestess of the Norns"; JSON `name` already correct, only the slug has the typo).
- `merchants-herold...` (Hergild) — audit notes the slug differs from the (correct) name "Hergild"; cosmetic.

## Notes
- `prosperity-prince` / `prosperity-princess` both carry `requires: "Not having a Princess."` in the
  data (Princess should read "Not having a Prince"). No audit flagged this as a correction, so it was
  left untouched — flagged here for the orchestrator.
