# The Rivals for Catan — Official Rules Research

**Purpose:** Authoritative, citable answers to resolve game-logic bugs in catan-duel.
**Game:** *The Rivals for Catan* (Klaus Teuber, 2010 revised edition of the Catan Card Game; aka *Catan: Das Duell*; same ruleset as *Rivals for Catan: Deluxe*).
**Researched:** 2026-06-19.

## Primary source (authoritative)

The full **official Rivals for Catan rulebook PDF** (28 pages, English) was downloaded and its text extracted in full. It is the canonical source and answers every question below verbatim. Page numbers cited are from this PDF.

- **Official rulebook PDF (primary):** https://cdn.1j1ju.com/medias/60/52/ed-rivals-for-catan-rulebook.pdf
- **Official Catan site — Rivals for Catan:** https://www.catan.com/rivals-catan
- **Catan Universe — Rivals for Catan:** https://catanuniverse.com/en/rivals-for-catan/
- **Official Game Rules (how-to-play guide):** https://officialgamerules.org/game-rules/rivals-for-catan/
- **BGG thread — settlement/city expansion placement:** https://boardgamegeek.com/thread/1658766/question-about-settlementcity-expansion-cards-and (403 to bot fetch; listed for human cross-check)
- **Official era-expansion rulebooks (cross-check of theme structure):**
  - Age of Enlightenment: https://www.catan.com/sites/default/files/2021-06/rivals-aoe-rules-eng_200421.pdf
  - Age of Darkness: https://catancollector.com/images/uploads/rivals/rfc-ageofdarkness_rules_2011-mayfair.pdf

> **Confidence note:** Q1–Q4 below are answered directly and unambiguously by the primary rulebook with quoted text. Where I flag uncertainty (a couple of edge interpretations), I say so explicitly. Quotes are verbatim from the extracted PDF text.

---

## Q1 — Building / Expansion placement capacity (the key question)

### Settlement = 2 building sites. City = 4 building sites. CONFIRMED.

The "1 settlement / 2 city" common understanding the user described is **WRONG in number** — it is **2 for a settlement and 4 for a city** (not 1 and 2). The "one above, one below" intuition is right for a settlement; a city is "two above, two below."

**Settlement (p.3, p.8):**

> "A settlement also provides **2 empty building sites for expansion cards (buildings or units), one above and one below the settlement**." (p.3)

> "Each settlement provides 2 new building sites (1 above and 1 below the building site)." (p.8)

The setup diagram on p.3 explicitly labels two slots flanking the settlement, each captioned **"Building site for 1 expansion card."**

**City (p.9):**

> "Each city provides **2 additional building sites**. Now you can place **2 settlement/city expansions above and 2 below the city**." (p.9)

So a city has the settlement's original 2 sites **plus** 2 more = **4 total** (two above, two below). The p.9 diagram labels the two new slots **"Additional Building Site."**

This is reinforced when city expansions are introduced for theme games (p.14):

> "**Each city has 4 building sites (2 above, 2 below).**" (p.14)
> "City expansions may only be placed on one of the 4 building sites for a city (two above and two below)." (p.15)

### Exact capacity table

| Structure | Building sites | Layout |
|---|---|---|
| **Settlement** | **2** | 1 above, 1 below |
| **City** | **4** | 2 above, 2 below |

### Does upgrading a settlement to a city change capacity? YES.

When you upgrade, the settlement card stays underneath the city card, and the city **adds** 2 more sites:

> "When you build a city, you pay the building costs and place the city **on top of an existing settlement**. For the rest of the game, the settlement card remains underneath the city card... **Each city provides 2 additional building sites.**" (p.9)

So an upgrade takes a structure from **2 → 4** building sites. Expansions already placed on the settlement's 2 sites remain; the upgrade simply opens 2 more.

### Which expansions are CITY-ONLY vs settlement-OK?

There are two distinct card types, distinguished by **text-box color**:

1. **Settlement/city expansions** (GREEN text box) — buildings + units (heroes, trade ships). May be placed on **any empty building site adjacent to a settlement *or* a city**:
   > "A settlement/city expansion must always be placed on an empty building site **adjacent to a settlement/city**." (p.7)

2. **City expansions** (RED text box) — a separate card type introduced in the Theme Sets. **City-only:**
   > "'City expansion' is a new card type introduced in the Theme Sets. Each of these cards has a **red text box**. You may only place a city expansion card on a building site **adjacent to a city**. Each city has 4 building sites (2 above, 2 below)." (p.14)

Examples of city-only (red) expansions seen in the index: **Harbor, Merchant Guild, Trading Base** (Era of Gold/Turmoil city-expansion sections, p.22–23). In the basic/introductory game there are **no** city expansions — green settlement/city expansions only.

**Distinguishing rule for the engine:**
- GREEN settlement/city expansion → placeable on a settlement (2 sites) OR a city (4 sites).
- RED city expansion → placeable on a city ONLY (one of its 4 sites).
- A bare settlement (not upgraded) can never hold a red city expansion.

### Above/below positional note (relevant to adjacency bugs)

> "Some expansion cards affect adjacent regions on the left and right. Positioning an expansion card either above or below a settlement/city may thus be important. However, **it doesn't matter which of the two neighboring building sites you occupy: the two regions on the left and right are equally adjacent to both building sites.**" (p.9)
> "Important: Cards on an additional building site are **also considered adjacent to the diagonally contiguous regions.**" (p.9)

So for a city, an expansion on an *additional* (outer) site is adjacent to both its own row's regions and the diagonally contiguous ones.

---

## Q2 — Principality structure at game start

> "To start the game, it [your principality] consists of **6 different regions and 2 settlements connected by a road**." (p.2)

> "Your principality at the start of the game consists of these **9 cards** — they are your 'starting cards.'" (p.2)

Starting 9 cards = **2 settlements + 1 road + 6 regions** (per the p.2 "Basic Set / Starting Cards" panel: 6 regions, 2 settlements, 1 road).

**Region arrangement relative to settlements:** Each settlement is flanked by regions **above and below** it. The two starting settlements (joined by the one road) sit in a horizontal row; the 6 regions are placed in the two corner slots (above/below) of each settlement.

> "When you build a new settlement, you also receive the 2 top cards from the region stack. Place these regions **adjacent to the unoccupied corners of the settlement**." (p.8)

**Region orientation / resource storage (relevant to resource bugs):**
> "each region — except for the center-top gold field — is aligned so that its edge with 1 resource symbol is closest to you. This means that you have exactly 1 of each of these resources stored... You do not start with gold, so your gold field card starts with its 'no resource' edge closest to you." (p.3)
> "You can thus store between **0 and 3 resources in a region**." (p.3) Excess beyond 3 is lost.

Each player's principality has the **same structure**, but production numbers on the regions differ between the two players (p.4).

---

## Q3 — Theme-set / Era deck structure (draw stacks)

### Basic / Introductory game: **4 draw stacks**.

> "Shuffle the 36 cards whose backs show the Basic Set symbol. **Divide these cards into 4 stacks of 9 cards each** and place them next to the city card stack. These stacks are called 'draw stacks.'" (p.4)

So in the introductory game: **4 draw stacks × 9 cards = 36 cards.** (Plus the separate *center-card* stacks — roads, settlements, cities, regions — which are NOT draw stacks.)

### Theme / Era games: **3 Basic draw stacks + 2 Theme draw stacks = 5 draw stacks** (plus a face-up expansion stack).

The structure **changes** when you play a Theme Set. The base count drops to 3 (12 cards each) and **2 additional Theme-Set draw stacks** are added:

> "**Shuffle the Basic Set cards** whose backs show the Basic Set symbol. Organize these cards into **3 Basic Set draw stacks of 12 cards each**. Separately shuffle the appropriate Theme Set cards not already in stacks. Organize these cards into **2 Theme Set draw stacks** — each with an equal number of cards." (p.15)

So in a Theme Game: **3 Basic + 2 Theme = 5 draw stacks total.** The Theme cards form their **own separate draw stacks**, distinct from the Basic stacks (the example on p.15 shows the 2 Theme draw stacks placed *next to* the 3 Basic draw stacks). Per-era counts:

- **Era of Gold:** "These two Theme Set draw stacks each contain **11 cards**." (p.16)
- **Era of Turmoil:** "These two Theme Set draw stacks each contain **11 cards**." (p.16)
- **Era of Progress:** "These two Theme Set draw stacks each contain **12 cards**." (p.17)

> **On the user's "stacks 5 and 6" phrasing:** the *card backs* are numbered — "The Era of Gold" (1), "The Era of Turmoil" (2), "The Era of Progress" (3) — but the rulebook does **not** number the draw stacks "5 and 6." It says 3 Basic + 2 Theme = 5 stacks. There are **2** theme draw stacks, not just one. The user's count of "more than the basic count" holds in *total stacks* (5 > 4) but the basic stack count actually drops from 4 to 3.

### Also added in Theme Sets: a **face-up expansion card stack** (NOT a draw stack)

> "In each Theme Set, there are expansion cards that must be accessible to both players. Separate these cards and place them as a **face-up expansion card stack** next to the draw stacks. These cards are never part of your hand. Instead, you may look through this stack, select the card you want to build, and pay the building costs... Each card in the face-up expansion card stack is marked with a '1x.'" (p.14)

Contents: Era of Gold = two Merchant Guilds; Era of Turmoil = two Hedge Taverns; Era of Progress = two Universities (p.16–17).

### Duel of the Princes (all 3 themes combined): **3 Basic + 3 Theme = 6 draw stacks**

> "Prepare the Basic Set cards as in the Theme Game: **3 Basic Set draw stacks of 12 cards each.** ... place the resulting **3 Theme Set draw stacks** next to the 3 Basic Set draw stacks." (p.17) (Half-moon-marked cards are removed/out of play.)

---

## Q4 — Card lifecycle (removal / destruction / draw-stack scan)

### When a building/expansion is REMOVED or DESTROYED — depends on *how*:

**Voluntary removal (to free a building site):** → **discard pile.**
> "during your action phase, you may remove one of your buildings or units in your principality. This costs you nothing. **Return the removed card to the discard pile.**" (p.15)

**Action cards (after use):** → **discard pile.**
> "return the card face up to the **discard pile** used by both players. This removes the card from play." (p.7)

**Destroyed by an event/attack:** → usually **bottom of a matching draw stack** (NOT discard). The destination is card-specific:
- **Feud** event: "The opponent must remove one of them and **return it to the bottom of a matching draw stack.**" (p.14/20)
- **Arsonist** (Turmoil): "He must place it **under a draw stack of his choice.**" (p.23)
- **Archer** (Turmoil): opponent places a unit "**under a matching draw stack.**" (p.23)
- **Pirate Ship** (Gold): sinks an opponent's trade ship — "**place it on the discard pile.**" (p.22) ← exception: discard, not draw stack.

**Rule for returning to a stack (matching back):**
> "When you return a card to the bottom of a draw stack, you must choose a stack **whose cards have the same back as the returning card.** ... If a stack is totally depleted, you may still return the card to the former stack location and thereby reestablish the stack with 1 card. During the entire course of a game, the number of possibilities to discard a card remains the same." (p.16)

> **Engine takeaway:** there is no single "destroyed → here" rule. Voluntary removals and action cards and Pirate-Ship sinks go to the **shared discard pile**; most *attack/event destructions* go to the **bottom of a back-matching draw stack**. Honor each card's text.

### Looking through a draw stack to take a card — is it reshuffled? **NO (for the standard exchange action). YES only where a card explicitly says "reshuffle."**

**Standard "exchange a card" action (pay 2 resources, look at a stack, take 1):** the stack is **NOT reshuffled** and order must be preserved:
> "Pay any 2 resources of your choice. Choose a draw stack and **look at all of its cards. Then take 1 card of your choice from that stack.** Please note: **You may not change the order of the cards in the draw stack!**" (p.10)

The same order-preservation rule applies when choosing starting cards in theme games:
> "each player chooses a Basic Set draw stack and selects 3 cards for a starting hand. **You may not change the order of the cards in the draw stack.**" (p.15)

**Exception — only when a card's text explicitly orders a reshuffle.** The **Scout** action card is the notable one:
> "Scout: Play this card when building a settlement. Take 2 cards of your choice from the region card stack. **Reshuffle the region card stack.**" (p.18)

> **Engine takeaway:** the generic "look through a stack and take one" action **does NOT** reshuffle and **must preserve order**. Only reshuffle when a specific card (e.g., Scout on the *region* stack, or Yule on the *event* stack) says to. The region card stack is also reshuffled by Scout but not by ordinary settlement-building draws.

### Hand limit / replenish / discard mechanics (related)
> "At the end of your turn, you may have no more than 3 cards in your hand. In addition, you may hold 1 additional card for each card with a progress point... If you have more cards... **Return discarded cards to the bottom of your choice of draw stack(s).**" (p.10)
> Replenish: "randomly draw cards from the **tops of the draw stacks.**" (p.10)
> "Cards drawn to replenish your hand can't be used immediately — you must wait until your next turn." (p.10)

---

## Quick-reference answers (for the bug fixes)

| # | Question | Answer |
|---|---|---|
| **Q1** | Sites at a **settlement** | **2** (1 above, 1 below) |
| **Q1** | Sites at a **city** | **4** (2 above, 2 below) |
| **Q1** | Does upgrade change capacity? | **Yes**, 2 → 4 |
| **Q1** | City-only expansions | **Red-text "city expansions"** (Harbor, Merchant Guild, Trading Base, University, etc.). Green "settlement/city expansions" go on either. |
| **Q2** | Start: settlements / roads / regions | **2 settlements, 1 road, 6 regions** (9 starting cards); regions flank each settlement above + below |
| **Q3** | Draw stacks — basic game | **4** (9 cards each) |
| **Q3** | Draw stacks — theme/era game | **3 Basic (12 each) + 2 Theme = 5 total**; Theme cards = their own 2 separate stacks. (Duel = 3+3 = 6.) |
| **Q4** | Removed/destroyed building → | **Voluntary removal + action cards + Pirate Ship = discard pile.** Most event/attack destructions = **bottom of a back-matching draw stack.** Per-card. |
| **Q4** | Look-through-stack-and-take → reshuffle? | **No** — order must be preserved. Reshuffle ONLY when a card says so (Scout → region stack; Yule → event stack). |

---

## Sources

1. **Official Rivals for Catan rulebook (PDF, full text extracted — primary):** https://cdn.1j1ju.com/medias/60/52/ed-rivals-for-catan-rulebook.pdf
2. **Official Catan — Rivals for Catan:** https://www.catan.com/rivals-catan
3. **Catan Universe — Rivals for Catan:** https://catanuniverse.com/en/rivals-for-catan/
4. **Official Game Rules — Rivals for Catan how-to-play:** https://officialgamerules.org/game-rules/rivals-for-catan/
5. **BoardGameGeek — settlement/city expansion placement thread:** https://boardgamegeek.com/thread/1658766/question-about-settlementcity-expansion-cards-and
6. **Official Age of Enlightenment expansion rules (PDF):** https://www.catan.com/sites/default/files/2021-06/rivals-aoe-rules-eng_200421.pdf
7. **Age of Darkness expansion rules (PDF):** https://catancollector.com/images/uploads/rivals/rfc-ageofdarkness_rules_2011-mayfair.pdf
8. **Tournament Game rules (PDF, official):** https://www.catan.com/sites/default/files/inline-files/rfc-tournament_game_rules_08-01-15.pdf

**Cross-check status:** Q1 capacity (2 / 4) confirmed by the primary rulebook in **three** independent passages (p.3/p.8 for settlement, p.9 for city, p.14 restating "4 building sites"); the settlement=2 figure was additionally confirmed by web search of the officialgamerules.org guide. Theme-stack structure confirmed by the rulebook's explicit setup section (p.15) and per-era counts (p.16–17). No contradictions found across sources.
