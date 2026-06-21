import json, html

new = json.load(open("docs/goal-2026-06-21-expansion-themes/generated/new-cards.json"))
THEMES = [
 ("intrigue","Era of Intrigue","Age of Darkness · 2011",
  "Clash of Christian & Odinist faiths — Religious Dispute, foreign cards, build the Great Thingstead to end the conflict.","#5e2a66"),
 ("merchants","Era of Merchant Princes","Age of Darkness · 2011",
  "Trade dominance via Commercial Harbour, rotatable Residences and the Commercial Metropolis.","#9a6a1e"),
 ("barbarians","Era of Barbarians","Age of Darkness · 2011",
  "Barbarian invasions, mustered units, Castles & the Triumph track. Played to 13 VP.","#7a3326"),
 ("explorers","Era of Explorers","Age of Enlightenment · 2012",
  "A 3×3 sea grid explored by ships — islands, pirates, sail & cannon points, the Explorer Metropolis.","#1f5f6b"),
 ("sages","Era of Sages","Age of Enlightenment · 2012",
  "Sages generate wisdom (owls) to sway events, improve draws and fend off famine.","#2f6b4a"),
 ("prosperity","Era of Prosperity","Age of Enlightenment · 2012",
  "Peaceful governance — contentment (stars), Public Feeling, the arts, and Riots.","#8a6d1e"),
]
by = {}
for c in new:
    by.setdefault(c["set"], []).append(c)

def chip(c):
    cost = "".join('<span class=ck>%d%s</span>' % (x["count"], x["resource"][0].upper()) for x in c.get("cost", []))
    badges = "".join('<span class=pt>%s %s</span>' % (k[:3], v) for k, v in c.get("values", {}).items() if isinstance(v, int))
    cp = c.get("copies", 1)
    return ('<figure class=card><img loading=lazy src="../../src/assets/cards/%s.webp" alt="%s">'
            '<figcaption><b>%s</b><span class=meta>%s%s</span><div class=costs>%s%s</div></figcaption></figure>'
            % (c["id"], html.escape(c["name"]), html.escape(c["name"]), c["category"],
               (" · %d×" % cp) if cp > 1 else "", cost, badges))

sections = ""
for sid, title, era, desc, col in THEMES:
    cards = by.get(sid, [])
    grid = "".join(chip(c) for c in cards)
    sections += ('<section class=theme style="--accent:%s">'
                 '<div class=thead><h2>%s</h2><span class=eralabel>%s</span></div>'
                 '<p class=desc>%s</p><p class=count>%d unique cards · %d total</p>'
                 '<div class=grid>%s</div></section>'
                 % (col, title, era, desc, len(cards), sum(c.get("copies", 1) for c in cards), grid))

total = sum(len(v) for v in by.values())
CSS = """
:root{--parch:#f5e6c8;--parch2:#e8d0a0;--wood:#6b4226;--ink:#3b2a1a;--gold:#c8922a;--red:#8b2e2e;--green:#3a6b35}
*{box-sizing:border-box}
body{margin:0;background:radial-gradient(130% 120% at 50% 0%,#1f4a4a,#0a1d1f 80%);color:var(--ink);font-family:'IM Fell English',Georgia,serif;line-height:1.5}
.wrap{max-width:1100px;margin:0 auto;padding:32px 20px 80px}
.sheet{background:linear-gradient(180deg,var(--parch),var(--parch2));border:2px solid var(--wood);border-radius:16px;box-shadow:0 24px 60px rgba(0,0,0,.55),inset 0 0 0 4px rgba(200,146,42,.25);padding:36px 40px;margin-bottom:28px}
h1{font-family:Cinzel,serif;font-size:34px;margin:0 0 4px;color:var(--wood);letter-spacing:.5px}
h2{font-family:Cinzel,serif;margin:0;color:#fff;font-size:23px;text-shadow:0 1px 2px rgba(0,0,0,.4)}
.sub{font-style:italic;color:rgba(59,42,26,.8);margin:0 0 18px}
.lead{font-size:16px}
.stats{display:flex;gap:14px;flex-wrap:wrap;margin:18px 0 4px}
.stat{background:rgba(107,66,38,.1);border:1px solid rgba(107,66,38,.3);border-radius:10px;padding:10px 16px;min-width:120px}
.stat b{display:block;font-family:Cinzel,serif;font-size:24px;color:var(--wood)}
ol.phases{margin:8px 0 0;padding-left:20px} ol.phases li{margin:6px 0}
.done{color:var(--green);font-weight:700} .todo{color:var(--red)}
.theme{background:linear-gradient(180deg,var(--parch),var(--parch2));border:2px solid var(--wood);border-left:10px solid var(--accent);border-radius:14px;padding:22px 26px;margin-bottom:22px;box-shadow:0 16px 40px rgba(0,0,0,.45)}
.thead{display:flex;align-items:baseline;gap:14px;background:var(--accent);margin:-22px -26px 12px;padding:12px 26px;border-radius:11px 11px 0 0}
.eralabel{color:rgba(255,255,255,.85);font-style:italic;font-size:13px;margin-left:auto}
.desc{margin:4px 0}.count{font-family:Cinzel,serif;color:var(--wood);font-size:13px;margin:2px 0 14px}
.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(120px,1fr));gap:12px}
figure.card{margin:0;background:#fff;border:1px solid rgba(107,66,38,.4);border-radius:8px;overflow:hidden;box-shadow:0 3px 8px rgba(59,42,26,.25)}
figure.card img{width:100%;display:block;aspect-ratio:1;object-fit:cover;background:var(--parch2)}
figcaption{padding:6px 7px;font-size:11.5px} figcaption b{display:block;line-height:1.2}
.meta{color:rgba(59,42,26,.6);font-size:10px;text-transform:capitalize}
.costs{display:flex;flex-wrap:wrap;gap:3px;margin-top:4px}
.ck,.pt{font-family:Cinzel,serif;font-size:9px;background:rgba(200,146,42,.25);border:1px solid rgba(107,66,38,.35);border-radius:3px;padding:1px 4px}
.pt{background:rgba(80,110,170,.2)}
footer{color:rgba(245,230,200,.7);text-align:center;font-style:italic;margin-top:30px}
"""
HEAD = ('<!doctype html><html lang=en><head><meta charset=utf-8>'
 '<meta name=viewport content="width=device-width,initial-scale=1">'
 '<title>Rivals for Catan — Expansion Themes Build Report</title>'
 '<link rel=preconnect href="https://fonts.googleapis.com">'
 '<link href="https://fonts.googleapis.com/css2?family=Cinzel:wght@500;700&family=IM+Fell+English:ital@0;1&display=swap" rel=stylesheet>'
 '<style>' + CSS + '</style></head><body><div class=wrap>')

INTRO = ('<div class=sheet><h1>The Rivals for Catan — Expansion Themes</h1>'
 '<p class=sub>Build report · 2026-06-21 · digital re-implementation (Catan Duel)</p>'
 '<p class=lead>The game shipped with the Basic Set plus three theme sets (Gold, Turmoil, Innovation). '
 'This effort adds the <b>six remaining official theme sets</b> — the three of <i>Age of Darkness</i> '
 'and the three of <i>Age of Enlightenment</i> — sourced from the official rulebook Card Indexes and '
 'the "Included Cards" image PDFs.</p>'
 '<div class=stats>'
 '<div class=stat><b>6</b>new theme sets</div>'
 '<div class=stat><b>%d</b>new cards</div>'
 '<div class=stat><b>144</b>card faces cropped from the official PDFs</div>'
 '<div class=stat><b>247</b>cards in the game total</div></div></div>' % total)

BUILT = ('<div class=sheet><h2 style="color:var(--wood)">What was built</h2><ol class=phases>'
 '<li><span class=done>Done</span> — Downloaded the 6 official source PDFs (card images + rulebooks); mapped the engine, sim/AI, data and UI architecture across four read-only surveys.</li>'
 '<li><span class=done>Done</span> — Built a PyMuPDF extraction pipeline: each card is a separate embedded image, so all 216 AoD+AoE faces were cropped in reading order.</li>'
 '<li><span class=done>Done</span> — Transcribed every card face with a 19-agent read-only vision pass (names + costs reliable; points/rules cross-checked against the rulebook).</li>'
 '<li><span class=done>Done</span> — Wired all six new set ids through the type system, lobby selectors, deck labels, music, win thresholds and felt themes (Barbarians plays to 13 VP).</li>'
 '<li><span class=done>Done</span> — Generated %d card entries and copied 144 cropped faces into the game art pipeline; verified live that selecting a theme deals its real cards with art.</li>'
 '<li><span class=todo>Next</span> — Per-card rulebook polish; bespoke mechanic UIs (owl/star/sail/cannon icons, Triumph / Manifesto / Public-Feeling tracks, foreign cards, metropolis, the 3×3 sea board); AI-opponent support for the new themes.</li>'
 '</ol><p style="font-size:14px">Each card’s <b>cropped face is the source of truth at the table</b> — it shows the official '
 'printed rules, costs and point icons — so the themes are playable now in trust-based hot-seat, with the JSON rules text as a best-effort functional summary pending polish.</p></div>' % total)

FOOT = ('<footer>Generated from src/data/cards.json · art cropped from the official Catan Studio '
 '"Included Cards" PDFs for this faithful re-implementation.</footer></div></body></html>')

open("docs/goal-2026-06-21-expansion-themes/report.html", "w", encoding="utf-8").write(HEAD + INTRO + BUILT + sections + FOOT)
print("report.html written; total new cards:", total, "themes:", list(by.keys()))
