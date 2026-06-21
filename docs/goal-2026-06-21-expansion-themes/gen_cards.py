"""Regenerate the 6 new themes' card entries + art from the vision transcription,
with the AoD->AoE segmentation fixed, empty cards dropped, and authoritative
face-up flags from the rulebook-derived reference. Atomically purges the old
new-set entries/art and rewrites them."""
import json, re, os, shutil, glob

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
G = os.path.join(ROOT, "docs/goal-2026-06-21-expansion-themes")
raw = json.load(open(os.path.join(G, "transcripts/raw-transcription.json")))
pages = raw["result"]["pages"]

def parse_block(text):
    m = re.search(r"```json\s*(.+?)```", text, re.S) or re.search(r"(\[.*\])", text, re.S)
    if not m: return []
    try: return json.loads(m.group(1))
    except Exception: return []

flat = []
order = {"aod": 0, "aoe": 1}
for pg in sorted(pages, key=lambda p: (order[p["tag"]], p["page"])):
    for c in parse_block(pg["text"]):
        c["_tag"] = pg["tag"]; c["_page"] = pg["page"]; flat.append(c)

AOD_SETS = {"intrigue", "merchants", "barbarians"}
AOE_SETS = {"explorers", "sages", "prosperity"}
NEW_SETS = AOD_SETS | AOE_SETS
SET_KW = [("intrigue", "intrigue"), ("merchant", "merchants"), ("barbar", "barbarians"),
          ("explor", "explorers"), ("entdeck", "explorers"), ("sage", "sages"),
          ("weisen", "sages"), ("prosper", "prosperity"), ("wohlstand", "prosperity")]
def set_from_cover(name):
    n = name.lower()
    for kw, s in SET_KW:
        if kw in n: return s
    return None

def kebab(s):
    s = re.sub(r"\(\s*\d+\s*x\s*\)", "", s, flags=re.I)
    s = s.lower().replace("'", "").replace("’", "")
    return re.sub(r"[^a-z0-9]+", "-", s).strip("-")

CATMAP = {"building": "building", "unit": "hero-or-unit", "hero": "hero-or-unit", "action": "action",
          "event": "event", "region-expansion": "building", "extraordinary-site": "building",
          "road-complement": "building", "metropolis": "building", "marker": "building", "sea": "building"}
VALMAP = {"vp": "victory_points", "strength": "strength", "skill": "skill", "commerce": "commerce",
          "progress": "progress", "wisdom": "wisdom", "contentment": "contentment", "sail": "sail", "cannon": "cannon"}
AOD_OK = {"victory_points", "strength", "skill", "commerce", "progress"}

# authoritative face-up expansion-stack cards (from the rulebook-derived reference)
FACE_UP = {
    "intrigue": set(),
    "merchants": {"commercial-harbor"},
    "barbarians": {"castle", "triumph-card"},
    "explorers": {"shipyard"},
    "sages": {"manifesto-of-humane-conduct", "manifest-of-humane-conduct"},
    "prosperity": {"builders-hut", "prince", "princess"},
}
def is_face_up(s, kb):
    if s == "sages" and "manifest" in kb: return True
    return kb in FACE_UP.get(s, set())

cur = None; entries = {}; artmap = {}; counts = {}
for c in flat:
    name = (c.get("name") or "").strip()
    cat = (c.get("category") or "").strip().lower()
    # AoD->AoE boundary: AoE pages can only hold AoE themes; reset if we carried an AoD set over
    if c["_tag"] == "aoe" and (cur in AOD_SETS or cur is None):
        cur = "explorers"
    if cat == "cover" or name.lower().startswith("the era"):
        s = set_from_cover(name)
        if s: cur = s
        continue
    if not name:  # drop empty/malformed cards
        continue
    if cur is None: cur = "intrigue"
    kb = kebab(name)
    if not kb: continue
    cid = f"{cur}-{kb}"
    src = os.path.join(G, f"art-staging/{c['_tag']}/p{c['_page']:02d}/pos{c['pos']:02d}.webp")
    if cid in entries:
        entries[cid]["copies"] += 1
        continue
    pts = {}
    for k, v in (c.get("points") or {}).items():
        mk = VALMAP.get(k)
        if not mk or (cur in AOD_SETS and mk not in AOD_OK): continue
        if isinstance(v, (int, float)) and v: pts[mk] = int(v)
    if c.get("requires"): pts["requires"] = c["requires"]
    cost = [{"resource": x["resource"], "count": x["count"]} for x in (c.get("cost") or []) if x.get("resource")]
    e = {"id": cid, "set": cur, "category": CATMAP.get(cat, "building"),
         "name": re.sub(r"\s*\(\s*\d+x\s*\)", "", name).strip(),
         "cost": cost, "values": pts, "rules_text": (c.get("rules_text") or ""),
         "image": f"{cid}.webp", "copies": 1, "confidence": c.get("confidence", "low")}
    if is_face_up(cur, kb):
        e["tag"] = "Face-up Expansion"; e["copies"] = 2  # face-up stacks come as 2
    entries[cid] = e; artmap[cid] = src; counts[cur] = counts.get(cur, 0) + 1

out = list(entries.values())
json.dump(out, open(os.path.join(G, "generated/new-cards.json"), "w"), indent=2, ensure_ascii=False)

# ---- atomic re-integration into the live game ----
dest = os.path.join(ROOT, "src/assets/cards")
# 1) purge old new-set art
for f in glob.glob(f"{dest}/*.webp"):
    if os.path.basename(f).split("-")[0] in NEW_SETS:
        os.remove(f)
# 2) copy fresh art
copied = 0
for cid, src in artmap.items():
    if os.path.exists(src):
        shutil.copyfile(src, f"{dest}/{cid}.webp"); copied += 1
# 3) rewrite cards.json: drop old new-set entries, append fresh
cards = json.load(open(os.path.join(ROOT, "src/data/cards.json")))
cards = [c for c in cards if c.get("set") not in NEW_SETS]
KEEP = ["id", "set", "category", "name", "tag", "cost", "values", "rules_text", "image", "copies", "confidence"]
for e in out:
    cards.append({k: e[k] for k in KEEP if k in e})
json.dump(cards, open(os.path.join(ROOT, "src/data/cards.json"), "w"), indent=2, ensure_ascii=False)

faceup = {s: sorted([e["id"] for e in out if e["set"] == s and e.get("tag")]) for s in NEW_SETS}
print("unique per set:", counts)
print("total unique:", len(out), "| copies:", sum(e["copies"] for e in out))
print("art copied:", copied, "| cards.json total:", len(cards))
print("face-up per set:")
for s in ["intrigue", "merchants", "barbarians", "explorers", "sages", "prosperity"]:
    print("  ", s, faceup.get(s))
