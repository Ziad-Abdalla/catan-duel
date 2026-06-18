# CATAN – The Duel ("Das Duell", 2023 / orig. 2010) — Official Setup Verification

**Purpose:** Settle a data conflict in a digital implementation against the *official* rules of
**CATAN – Das Duell** (Kosmos), the standalone 2-player card game. "Das Duell" (2016/2023 printings)
is an unchanged re-issue of **"Die Fürsten von Catan"** (2010), which itself is the standalone
successor line to the older **"The Rivals for Catan" / "Die Fürsten von Catan"** family.

**Primary source used:** the official Kosmos rulebook PDF
`catan_das_duell_anleitung.pdf` (downloaded from catan.de, 4.3 MB, 20 pages). Text extracted with
`pypdf`; setup diagrams rendered with `pymupdf` and read visually. German text quoted verbatim.

**Confidence legend:** HIGH = directly quoted rulebook text or a clearly legible die in the diagram,
cross-checked. MEDIUM = legible-but-slightly-blurry die OR derived from the
"each number once per player" constraint. LOW = could not verify; flagged.

> **Important quality caveat on the die images:** the region-card artwork in the PDF is embedded as
> low-resolution raster images. The little white production die on each card is therefore blurry even
> at high render DPI. Where a value rests on a blurry pip-count it is marked MEDIUM/LOW. The two
> *load-bearing* values (Red grain = 6, Blue ore = 6) and the sharing verdict do **not** depend on
> pip-counting — they are stated in the rulebook prose.

---

## Q1 — Starting principality setup (the "Einführungsspiel / Die ersten Cataner" fixed setup)

### Structure (HIGH)
Each player's starting principality = **2 settlements + 1 road + 6 different region (landscape) cards**,
one region per resource. Quote (p.2):

> *"Ihr Fürstentum besteht zu Spielbeginn aus 2 Siedlungen, die mit einer Straße verbunden sind und
> 6 unterschiedlichen Landschaften."*

The six landscapes and their resources (p.2):
Goldfluss → **Gold**, Ackerland → **Getreide/grain**, Hügelland → **Lehm/brick**,
Wald → **Holz/lumber**, Weideland → **Wolle/wool**, Gebirge → **Erz/ore**.

### The "each number once" rule (HIGH — the key structural fact)
Quote (p.5):

> *"Bei Spielbeginn hat jeder Spieler jede Zahl genau 1-mal auf einer seiner Landschaften."*
> ("At the start of the game each player has each number exactly once on one of his landscapes.")

So **every player's six regions carry the numbers 1, 2, 3, 4, 5, 6 — each exactly once.** Both players
therefore use the *same set* of numbers. What differs between the two players is *which resource sits
on which number*.

### The two anchored die→resource facts (HIGH — from the worked dice example, pp.4–5)
The rulebook's income example fixes two cells beyond any doubt:

> p.5: *"Beispiel: Spieler Rot würfelt im ersten Zug eine 6. Sein **Ackerland** trägt die Augenzahl 6.
> Daher erhält Spieler Rot ein Getreide."* → **Red: grain (Ackerland) = 6.**

> p.4: *"Auch Spieler Blau erhält 1 Rohstoff auf seiner Landschaft mit der 6; bei ihm ist es das
> **Gebirge**. Daher erhält er 1 Erz…"* → **Blue: ore (Gebirge) = 6.**

i.e. on the number **6**, Red has **grain** but Blue has **ore** — the same number, *different* resource.

### Full per-player resource→number mapping (mix of HIGH / MEDIUM)
Read from the "Übersicht Startauslage" setup diagram (p.2) and "Ihr Fürstentum" example (pp.4–5).
Values marked MEDIUM are legible-but-blurry pip-counts; LOW = not confidently read.

| Resource (region)        | Player ROT (Red)   | Player BLAU (Blue) |
|--------------------------|--------------------|--------------------|
| Holz / lumber (Wald)     | **1** (HIGH)       | **5** (MEDIUM)     |
| Wolle / wool (Weideland) | ? (LOW)            | **1** (MEDIUM)     |
| Gold (Goldfluss)         | ? (LOW)            | **2** (MEDIUM)     |
| Getreide / grain (Ackerl.)| **6** (HIGH)      | ? (LOW)            |
| Lehm / brick (Hügelland) | ? (LOW)            | ? (LOW — {3 or 4}) |
| Erz / ore (Gebirge)      | ? (LOW)            | **6** (HIGH)       |

By the "each number once" rule, **Blue's missing two cells (brick, grain) must be {3, 4}** in some
order, since Blue already uses {1,2,5,6}. **Red's missing four cells (wool, gold, brick, ore) must be
{2,3,4,5}** in some order, since Red already uses {1,6}. The exact remaining assignments could not be
certified from the blurry diagram and are flagged LOW — they should be confirmed against a physical
copy or a high-resolution scan before being trusted as ground truth in the implementation.

**What is certain and sufficient to settle the conflict:** both players carry 1–6; on number 6 Red =
grain and Blue = ore. (The conflict claim "*both players have ore on 5 and grain on 6*" is therefore
FALSE — see Q-verdict below.)

### Starting resource tokens per region (HIGH)
Quote (p.3):

> *"Zu Spielbeginn ist bei allen Landschaften – mit Ausnahme des Goldflusses – der Rand mit
> 1 Rohstoff-Symbol zu Ihnen ausgerichtet. Das bedeutet, dass Sie von jedem dieser Rohstoffe genau
> 1 besitzen. Nur Gold haben Sie noch keines."*

So at start **each region holds 1 resource token, EXCEPT the Goldfluss (gold) region, which holds 0.**
Each landscape can store **0–3** tokens (rotated 90° per gain/spend); a 4th gain is lost.

---

## Q2 — Victory-point thresholds (all HIGH, all quoted)

| Mode | German term | VP to win | Quote |
|------|-------------|-----------|-------|
| Intro / base game | Einführungsspiel "Die ersten Cataner" | **7** | *"…bis ein Spieler am Ende seines Spielzugs **7** (oder mehr) Siegpunkte erreicht hat."* (p.4) |
| A single theme set | Themenspiel | **12** | *"Jedes Themenspiel wird so lange gespielt, bis ein Spieler in seinem Spielzug **12** (oder mehr) Siegpunkte erreicht hat."* (p.10) |
| All theme sets combined | "Das Duell der Fürsten" | **13** | *"„Das Duell der Fürsten“ wird auf **13** Siegpunkte gespielt."* (p.12) |
| Tournament play | Turnierspiel | **15** | German Wikipedia ("Turnierspiel: 15 Siegpunkte") — not in this base rulebook. |

**Verdict on the impl's claimed "7 / 13 / 15":**
- 7 for base/intro = **CORRECT.**
- 13 for "a single themed expansion set" = **INCORRECT** — a single theme set plays to **12**. 13 is
  the *all-sets-combined* "Duell der Fürsten" value.
- 15 for "all themed sets combined" = **INCORRECT** — all sets combined = **13**; **15** is the
  separate **tournament** mode.

So the impl appears to have shifted the labels: the real ladder is **7 (intro) → 12 (one set) →
13 (all sets) → 15 (tournament)**. Each scattered Siedlung = 1 VP (2 at start), each Stadt = 2 VP.

---

## Q3 — Region/landscape distribution & central draw stack

### Region (landscape) card counts (HIGH — from the Karten-Index, p.13)
Each of the six landscapes appears **4×** in the box; index entries (verbatim form):

> *"Gebirge (4) … Goldfluss (4) … Hügelland (4) … Wald (4) … Weideland (4) … Ackerland (4)"*,
> each listed as *"2x mit Rückseite Landschaft, 1x mit Rückseite rotes Schild, 1x mit Rückseite
> blaues Schild."*

So **6 resources × 4 = 24 region cards total.** Of each resource's 4 copies:
- **1** has a **red-shield back** = part of player Rot's fixed starting principality,
- **1** has a **blue-shield back** = part of player Blau's fixed starting principality,
- **2** have the plain **Landschaft back** = the shuffled landscape draw pile.

This independently confirms Q1: each player's start = exactly one region of each resource (6 regions),
and the printed start numbers live on the 12 shielded start-cards.

### How the central stacks are formed (HIGH — p.2, intro game)
- 3 identical piles for **Straßen / Siedlungen / Städte** (roads / settlements / cities), face-down;
  not shuffled (all identical). Leave a gap between Siedlungen and Städte.
- Shuffle the **Landschaften** (the 12 plain-back landscape cards) and place that pile in the gap
  between Siedlungen and Städte.
- **Nachziehstapel (draw stacks):** *"Mischen Sie die **36 Karten** mit dem Symbol des Basissets,
  teilen Sie diese in **4 Stapel zu je 9 Karten** auf und legen Sie sie neben die Städte."* → shuffle
  the 36 base-set cards into **4 draw stacks of 9**.
- **Event stack:** turn events face-up, remove all non-base-set events, set aside "Julfest". Shuffle
  remaining base events, count off 3, place Julfest face-down on them, then the rest on top.
- In **Themenspiele** the base set is split into **3 stacks of 12** instead, plus 2 theme-set stacks.

---

## Q4 — "Das Duell" (2010/2016/2023) vs older "Rivals for Catan" — on these specific points

**Headline:** "Catan – Das Duell" is an unchanged re-issue of "Die Fürsten von Catan" (2010). The
rulebook states it outright (p.1):

> *"„Catan – Das Duell“ ist eine Neuausgabe des 2010 erschienenen „Die Fürsten von Catan“.
> Die Spielkarten und Regeln wurden nicht geändert…"* ("…the cards and rules were not changed…")

Imprint: *"Lizenz: Catan GmbH © 2010, 2016"*, author Klaus Teuber.

Relative to the **English "The Rivals for Catan" (Mayfair, 2010)** — same game, but note a known
labeling difference in modes/terms:
- **Theme-set VP in this German "Das Duell" rulebook = 12.** Older English "Rivals for Catan"
  descriptions and some summaries quote the *Duel/expanded* format at **13**. The 13 here is
  specifically the **all-three-sets "Duell der Fürsten"** value, and 15 is **tournament**. A digital
  impl that lifted "13" from a Rivals-era summary as the *single-set* threshold has mismatched the
  ladder. (German Wikipedia notes the theme VP was "reduced … to 12".)
- The **starting setup, the "each number 1–6 once per player" rule, the 1-token-per-region-except-gold
  rule, and the 6×4 = 24 landscape composition are the SAME** across "Rivals for Catan" /
  "Die Fürsten von Catan" / "Das Duell". The codebase comments that reference the German "Das Duell"
  physical cards are therefore pointing at the correct, current edition.

---

## KEY VERDICT — do the two players share die-numbers?

**They share the NUMBER SET but NOT the resource→number assignment.**

- Each player's six regions are numbered **1, 2, 3, 4, 5, 6 — each exactly once** (rulebook, HIGH).
  In that sense both principalities "use the same numbers."
- But the *mapping* of resource to number is **different per player.** The rulebook's own example
  proves it on number 6: **Red's 6 = grain (Ackerland), Blue's 6 = ore (Gebirge).**

**Therefore the specific conflict claim — "both players have ore on a region numbered 5 AND grain on a
region numbered 6" — is FALSE.** On number 6 the two players hold *different* resources (Red grain,
Blue ore), and there is no rule making any single (resource, number) pair identical across both
players. A correct implementation must store **two separate resource→number maps**, one per player,
not one shared map.

(Confidence: HIGH for the verdict and for the number-6 counter-example; the *complete* per-player
table is HIGH/MEDIUM/LOW per the Q1 table — verify the LOW cells against a physical copy / hi-res scan
before locking them into the data model.)

---

## Sources

1. **Official Kosmos rulebook (PRIMARY):** *CATAN – Das Duell, Spielanleitung* —
   https://www.catan.de/sites/default/files/2021-06/catan_das_duell_anleitung.pdf
   (also linked from https://www.catan.de/das-duell). All German quotes above are from this PDF.
2. **German Wikipedia, "Catan – Das Duell":**
   https://de.wikipedia.org/wiki/Catan_%E2%80%93_Das_Duell — VP ladder (intro 7, theme 12, Duell 13,
   tournament 15), re-issue history, card counts. (Secondary, cross-check.)
3. **English Wikipedia, "The Rivals for Catan":**
   https://en.wikipedia.org/wiki/The_Rivals_for_Catan — confirms the English lineage / equivalence.
4. **Official "Rivals for Catan" rulebook (English), catan.com:**
   https://cdn.1j1ju.com/medias/60/52/ed-rivals-for-catan-rulebook.pdf and
   https://www.catan.com/rivals-catan — confirms structure (2 settlements + road + 6 regions,
   1 resource per region except gold). (Secondary.)
5. **"Rivals for Catan" rules summary, officialgamerules.org:**
   https://officialgamerules.org/game-rules/rivals-for-catan/ — corroborates setup & 1-token rule.

_Generated 2026-06-19. Re-verify the LOW-confidence per-player number cells against a physical
"Das Duell" copy or a high-resolution card scan before treating the full table as authoritative._
