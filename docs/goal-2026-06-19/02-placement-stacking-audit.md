# Placement / building-site stacking audit — 2026-06-19

ONE lens: reproduce + root-cause the owner's bug — *"I can place 2 buildings above
a settlement OR a city — only settlements should get 2."*

## TL;DR (root cause)

The bug is **not** about a *count* of stacked cards. Both settlement and city sites
accept **unlimited** building cards (no per-site cap exists anywhere). What the owner
is actually seeing is the **building-site capacity area being identical for a city and
a settlement** — and worse, the `expanded` (bigger) site is given to the **CITY**, not
the settlement.

The "2 above" the owner describes is the board's **two site rows per seat** (one `up`,
one `down`) which exist for **every** seat regardless of whether it is a settlement or a
city. There is no differentiation of *how many building cards* a settlement vs a city may
hold — the only settlement/city difference in the placement UI is a cosmetic `min-height`
(`expanded` flag), and it is wired to **city**, which the owner says is backwards.

The component actually on screen is **`PrincipalityBoard`** (rendered by `TableBoard.tsx`
lines 43 & 55). `Principality.tsx` is the older flex layout, NOT rendered in the live
table (`Board.tsx` uses it, but `TableBoard` is the table that's in play). All file:line
refs below are in `PrincipalityBoard.tsx` unless noted.

---

## 1. The slot coordinate system

Slots are free-form strings on `PlacedCard.slot` (`src/types/index.ts:91-95`). The board
derives geometry structurally (not from placed order). For `N = max(2, #seats)` seats:

- **Columns:** `cols = 2N + 1` (`PrincipalityBoard.tsx:39`).
  - **Odd columns** (`roadSlotCol(i) = 2i+1`, line 40) = ROAD slots, indices `i = 0..N`.
    There are `N+1` of them (one at each end + one between each settlement pair).
  - **Even columns** (`seatCol(j) = 2j+2`, line 41) = SEATS (settlements/cities), `j = 0..N-1`.
- **Rows** (`grid-template-rows: auto var(--reg) auto`, table.css:211): row 1 = above,
  row 2 = spine, row 3 = below. `flipped` swaps above/below (lines 53-54).

Slot string formats (all parsed by regex):
- **Seats:** `settle-{j}` — set in engine `buildPiece`/`expandSpine`. NOTE: the UI does
  **not** read `settle-N`; seats are positioned purely by their *order* among placed
  settlement/city cards (`seats.map(...j...)`, lines 80-96). The `settle-N` string is
  essentially decorative.
- **Roads:** `road-{i}` — engine `buildPiece` (actions.ts:431), `expandSpine` (409).
  UI reads the index via regex `^road-(\d+)$` (`roadSlotIndex`, lines 43-46).
- **Building sites:** `s{j}-up` / `s{j}-down` — regex `^s(\d+)-(up|down)$`
  (line 58-59 `siteCards`; engine re-indexes them on left-insert, actions.ts:449).
  `j` is the SEAT index, matched against the seat's render index `j`.
- **Regions:** NOT slot strings. Regions live in a separate `p.regions[]` array
  (`RegionSlot[]`), positioned by array index, sliced into top/bottom halves
  (`topRegions`/`botRegions`, lines 56-57) and rendered above/below the ROAD columns
  (diagonal to seats). Empty landscape slots are `{empty:true}` region entries.

### ASCII map (N=3 seats; same for a settlement seat and a city seat)

```
            col1     col2      col3     col4      col5     col6      col7
ROW1 above: [REG t0] [s0-up ] [REG t1] [s1-up ] [REG t2] [s2-up ] [REG t3]
            region   BUILD     region   BUILD     region   BUILD     region
                     SITE up            SITE up            SITE up

ROW2 spine: [road0 ] [SEAT 0] [road1 ] [SEAT 1] [road2 ] [SEAT 2] [road3 ]
            (end)    settle    between  settle    between  city     (end)
                     /city                                 /settle

ROW3 below: [REG b0] [s0-dn ] [REG b1] [s1-dn ] [REG b2] [s2-dn ] [REG b3]
            region   BUILD     region   BUILD     region   BUILD     region
                     SITE dn            SITE dn            SITE dn
```

Key point: **every seat (settlement OR city) gets exactly one `up` site and one `down`
site** — that is the "2 building areas" the owner sees. The shape is **identical**
whether the seat is a settlement or a city; only the site's CSS `min-height` differs.

---

## 2. Where BUILDING / expansion cards land, and how many stack

- Building/expansion cards are everything that is **not** settlement/city/road
  (`buildings` filter, line 36; `Principality.tsx:8` `FOUNDATION` set is the inverse).
- They are placed into a site by `playCard` with `slot = "s{j}-up"` or `"s{j}-down"`
  (the `Site` component's `place()`, lines 175-182 → `dispatch playCard ... slot`).
  Engine `playCard` (actions.ts:510-527) just pushes `{cardId, slot}` — **no capacity
  check, no settlement-vs-city check.**
- `siteCards(seat, where)` (lines 58-59) gathers **all** cards whose slot equals
  `s{seat}-{where}` and renders them stacked (`cards.map`, line 201). There is **no
  limit** — a site can hold 0, 1, 2, 10 cards. So "2 stacks per seat" is really
  "2 sites (up+down) per seat, each unbounded," for BOTH settlements and cities.

So the literal "I can place 2 buildings above" = the **single `up` site** accepting
multiple cards, plus the `down` site. Neither is gated on seat type.

---

## 3. WHERE the per-settlement-vs-city capacity is (mis)decided

The ONLY place seat type changes the building area is the `expanded` flag:

- `PrincipalityBoard.tsx:146` (up site) and `:149` (down site):
  ```
  expanded={s.card!.category === 'city'}
  ```
  → passed to `Site` (`expanded?` prop, line 167-168) → CSS class `expanded`
  (line 186: `${expanded ? ' expanded' : ''}`).
- CSS effect: `table.css:312-314`
  ```
  /* a city has a larger building area than a settlement (more development capacity) */
  .pb-site.expanded { min-height: calc(var(--site-empty) * 1.5); ... }
  ```

So the code's **stated intent** is: *city = bigger building area = more development
capacity*; settlement = the slim default strip. The comment at `PrincipalityBoard.tsx:143-144`
says the same: *"A CITY gets an expanded building area (it holds more development cards
than a settlement)."*

This is purely visual `min-height` — it does **not** cap card count, and it gives the
LARGER area to the **city**. The owner says only settlements should get "2" (the bigger /
two-slot capacity), i.e. the relationship is **inverted** from what they expect.

There is **no code anywhere** that limits a settlement to fewer building cards than a
city, or that exposes a different *number* of sites for settlement vs city. The number
of sites (2: up+down) is constant per seat.

---

## 4. The CORRECT rule the code/docs assume

Docs treat this as already-done cosmetic, with the city-bigger reading:

- `docs/REFACTOR_PLAN.md:35`: *"Expanded city grids — city building sites render an
  enlarged capacity area (sites already stack cards)"* — explicitly **city = enlarged.**
- `PROGRESS.md:35`: same line, marked complete.
- `PROGRESS.md:182`: *"EVEN columns are settlements (carry building sites above & below)"*
  — describes the up/down sites as belonging to settlements generically.
- `PROGRESS.md:30`: *"Building sites above & below each [settlement]."*

So the docs assume **city > settlement** for building capacity, and present the up/down
sites as a settlement feature that a city inherits + enlarges. **This conflicts with the
owner's statement** that "only settlements get 2." The real Rivals for Catan rule is the
arbiter here and is ambiguous in-repo — see §5.

### What the actual game rule is (for the owner to confirm)

In *The Rivals for Catan*, building-expansion cards (region-expansions/buildings/units)
are placed **adjacent to settlements/cities**; a **settlement** has room for **fewer**
building/expansion cards and a **city** has room for **more** (upgrading to a city is what
*unlocks* extra building slots). i.e. the published rule is **city = MORE capacity**,
which matches the current code's *direction* — and **contradicts the owner's phrasing**
("only settlements get 2"). This is the load-bearing ambiguity: either the owner misspoke
(and the real complaint is "both look the same / a settlement shouldn't show the big 2-slot
area") or the owner's house reading inverts the official one. **Do not fix blind — confirm.**

---

## 5. Exact fix locations + the ambiguity to resolve with the owner

Everything funnels through the `expanded` flag and the unbounded `siteCards` render.

Touch points (read-only audit — not yet changed):

1. `src/ui/board/PrincipalityBoard.tsx:146` and `:149`
   `expanded={s.card!.category === 'city'}` — the seat-type → capacity decision.
   - To **invert** (settlement gets the big area): `=== 'settlement'`.
   - To **enforce a real card cap** (not just min-height), add a limit in `siteCards`
     (line 58-59) or in the `Site` drop handler (`place`, lines 175-182) keyed on
     `expanded` / category, and/or in engine `playCard` (`actions.ts:510-527`).
2. `src/ui/board/table.css:312-314` — `.pb-site.expanded` min-height. Only cosmetic;
   adjust if the visual "2 slots" needs to read differently per seat type.
3. `PrincipalityBoard.tsx:143-144` comment + `docs/REFACTOR_PLAN.md:35` +
   `PROGRESS.md:35` — update the stated intent once the direction is settled.
4. (If a hard cap is wanted) `src/engine/actions.ts:510-527` `playCard` — the only
   choke point that could reject an over-capacity placement; currently uncapped.

### Ambiguities needing owner / rulebook confirmation (DO NOT guess)

- **Direction:** Should the LARGER building capacity belong to the **city** (current code +
  in-repo docs + the published Rivals rule) or the **settlement** (owner's literal words)?
  These disagree. The owner likely means "a settlement and a city currently look the same /
  both expose the 2-slot building area, and that's wrong" — but whether the fix is
  *settlement gets less* or *settlement gets more* hinges on the actual physical-card rule
  the owner is playing. **Confirm against the rulebook / the owner's cards.**
- **"2" meaning:** Does the owner mean (a) the **two site rows** (up + down) should not both
  appear on a given seat type, or (b) the **count of cards** inside a site should be capped
  (e.g. settlement = 1 building, city = 2)? The current board always shows up+down for every
  seat and never caps the stack. The fix differs entirely between (a) and (b).
- **Trust-based sandbox tension:** the engine deliberately enforces **no** legality
  (actions.ts:4-6). A hard capacity cap would be the first such enforcement — confirm the
  owner wants enforcement vs. just a corrected *visual* capacity hint.

---

## Quick repro

1. Open the live table (`TableBoard` → `PrincipalityBoard interactive`).
2. Drag two era buildings from the Build bar onto the SAME seat's `up` site → both stack
   (no cap), on a **settlement** and on a **city** alike.
3. Upgrade a settlement to a city (`upgradeCity`) → the only change is the site's
   `min-height` growing (`expanded`), the city getting the *bigger* area — the inverse of
   what the owner expects, and still uncapped.
