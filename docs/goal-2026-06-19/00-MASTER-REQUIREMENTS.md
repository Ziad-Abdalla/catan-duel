# Catan Duel — "Make it fully playable like Tabletop Simulator" goal (2026-06-19)

Living spec. Source = owner's streamed `/goal` + follow-ups. Authoritative checklist for this effort.
Philosophy (LOCKED): trust-based MANUAL sandbox. Automation **assists** (cost math, routing, logging, juice)
but NEVER rigidly enforces. Everything you could do at a real table must be possible here, interactively,
polished, fun — like Tabletop Simulator.

## Requirements (verbatim intent, grouped)

### A. Logging
- A1. Action log must be **automatic** — entries happen as we do actions (debug + tracking aid).
  e.g. "Brigand: P1 over 7 — lost gold + wool". Not a manual "log a note" chore.
- A2. Keep/introduce rich logs broadly so the owner (and the agent) can understand + debug.

### B. Icons / art
- B1. Road / settlement / city icons + "some buildings" icons look bad + outdated → redesign, modern, clean.

### C. Placement / building rules
- C1. BUG: "I can place 2 buildings above a settlement OR a city — shouldn't be the case; only settlements get 2."
  (Investigation: no capacity cap exists; city currently gets the enlarged area — opposite of owner's words.
   Resolve against official Rivals rule + owner intent. Settlement vs city building-site capacity must be correct.)
- C2. BUG: face-up pieces (roads, settlements, taverns, etc.) do **not** get their resource cost reduced when played
  ("don't get reduced for some reason"). Paying should actually deduct resources.
- C3. Payment must be **manual/interactive**, not forced-auto — but when you choose to pay, it must actually work (see C2).
- C4. Destruction: account for buildings/pieces getting destroyed — give freedom to **drag** placed pieces off/around.

### D. Missing interactive mechanics (make everything possible)
- D1. "Look through a pile" — peek/search a draw pile (e.g. pay 2 resources to see the deck, swap a card), then **auto-shuffle**.
- D2. General: make EVERY physical tabletop action possible in the most user-friendly, interactive, manual way. Polished.

### E. UI / flow
- E1. UI is still clunky + too much → declutter.
- E2. Turn "phases" — owner would ideally remove them (optional; may leave if it costs nothing).

### F. Era decks / piles
- F1. BUG: when playing other eras you can only shuffle era cards back into the BASE piles (1,2,3,4),
  not their respective **5 / 6** piles. (Discard pile works fine — leave it.)

### G. "Alive" / juice
- G1. Owner doesn't SEE the background changes or the "make-the-game-alive" stuff.
  (Investigation: per-era background only triggers when an era is enabled, which is OFF by default;
   ambient orbs occluded; two headline features — ship water, deploy-pop — wired to a DEAD component subtree.)
- G2. Make the game feel alive + interactive on a normal default game, not only in rare states.

### H. Testing (owner directive)
- H1. e2e test ~100% of all actions; screenshot after every click for analysis + improvement.
- H2. Test all interactables in many possible orders.
- H3. Keep/introduce logs to aid understanding + debugging.
- H4. Only stop when complete, bugless, ready to be played. Polish ALL.

## Open rule confirmations (research, do not fabricate)
- Official Rivals-for-Catan building-site rule: how many expansion/building cards may sit at a settlement vs a city,
  and what "2 above a settlement" means physically. (C1)
- Era deck structure: do gold/turmoil/progress add their own draw stacks (5/6) or shuffle into the base 4? (F1)

## Status: see 99-PROGRESS.md (updated each batch).
