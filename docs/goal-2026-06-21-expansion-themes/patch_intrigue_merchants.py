"""Patch cards.json: accurate functional rules + fixes for Intrigue + Merchant Princes,
to make both themes fully playable in the trust-based hot-seat. Functional paraphrases
(game mechanics), not verbatim card text."""
import json, os
ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
P = os.path.join(ROOT, "src/data/cards.json")
cards = json.load(open(P))

# id -> {rules_text, [name], [copies], [category], [values(merge)]}
PATCH = {
 # ---- INTRIGUE ----
 "intrigue-pilgrimage-site": {"rules_text": "If an event or an opponent's action makes you lose cards from your hand, immediately draw back up to your hand limit."},
 "intrigue-great-thingstead": {"rules_text": "Neither player may play action-attack cards, and the event Religious Dispute no longer affects either player. Requires: Church and Odin's Temple.", "values": {"requires": "Church and Odin's Temple"}},
 "intrigue-odins-fountain": {"rules_text": "At the end of your turn you may exchange 2 cards instead of 1."},
 "intrigue-reiner-the-miller": {"rules_text": "Place on a fields region. Trade that region's grain 2:1 for any resource; once per turn 1:1 if it borders a Grain Mill.", "values": {"commerce": 1}},
 "intrigue-abbey-brewery": {"rules_text": "Place on a fields region. Pay 2 grain to rotate it to any side of your principality. Requires: City.", "values": {"commerce": 1, "requires": "City"}},
 "intrigue-red-light-tavern": {"rules_text": "Foreign card built on the opponent's free road. The opponent's units count as only 1 strength. Removed automatically once the opponent has 3 heroines.", "category": "building"},
 "intrigue-judith-guardian-of-the-church": {"rules_text": "Place on your Church to protect it from actions, expansion effects and events. Once per turn, pay 1 non-gold resource to receive up to 2 gold. Judith + Church are worth 2 VP together.", "values": {"strength": 1, "victory_points": 1}},
 "intrigue-bran-defender-of-the-temple": {"rules_text": "Place on your Odin's Temple. Draw 2 cards when built. Protects the Temple. Bran + Temple are worth 2 VP together.", "values": {"strength": 1, "victory_points": 1}},
 "intrigue-master-of-the-brotherhood": {"rules_text": "Caps how much gold an opponent's action card can cost you, and you receive up to 1 gold. Requires: not owning or building an Abbey.", "values": {"progress": 1, "skill": 1, "requires": "no Abbey"}},
 "intrigue-godfrey-the-intriguer": {"rules_text": "On a later turn, pay 1 gold to view the opponent's hand and take 1 card; if you take one, discard Godfrey afterwards.", "values": {"strength": 1}},
 "intrigue-church": {"rules_text": "When built, immediately receive up to 2 gold. Prerequisite for several Intrigue cards.", "values": {}},
 "intrigue-odins-temple": {"rules_text": "When built, immediately draw 1 card from any draw stack. Prerequisite for several Intrigue cards.", "values": {}},
 "intrigue-sacrificial-site": {"rules_text": "Trade wool 2:1 for any resource. Wool on adjacent pastures is safe from the Brigand. Requires: Odin's Fountain or Odin's Temple.", "values": {"requires": "Odin's Fountain or Odin's Temple"}},
 "intrigue-bishops-see": {"rules_text": "When built, choose 3 of the opponent's units; they remove 1 of them. Requires: Church, Abbey or Chapel.", "values": {"requires": "Church, Abbey or Chapel"}},
 "intrigue-missionary": {"rules_text": "The opponent removes 1 of their heroes; place it in your principality or discard it. Requires: Church or Bishop's See.", "values": {"requires": "Church or Bishop's See"}},
 "intrigue-bishop": {"rules_text": "Demand 1 gold from the opponent, then receive as much gold as one gold field can hold. Requires: Church or Bishop's See.", "values": {"requires": "Church or Bishop's See"}},
 "intrigue-odins-priest": {"rules_text": "The opponent reveals their hand and places all action cards and units under matching draw stacks. Requires: Odin's Temple.", "values": {"requires": "Odin's Temple"}},
 "intrigue-priestess-of-the-horns": {"name": "Priestess of the Norns", "rules_text": "Choose a draw stack and take up to 2 cards from it. Requires: Odin's Fountain or Odin's Temple.", "values": {"requires": "Odin's Fountain or Odin's Temple"}},
 "intrigue-michael-the-master-builder": {"rules_text": "When building, you may replace 1-3 of the required resources with 1 gold each."},
 "intrigue-good-neighbors": {"rules_text": "A peaceful event - no attack occurs. (See the card for its effect on face-up cards left on the draw stacks.)", "confidence": "medium"},
 "intrigue-religious-dispute": {"rules_text": "Each player with at least 1 city loses cards from their hand (placed under matching draw stacks). A Church and an Odin's Temple each reduce how many you lose."},
 # ---- MERCHANT PRINCES ----
 "merchants-wainwright": {"rules_text": "Once per turn, move resources between two of your regions of the same type, or trade 3:1."},
 "merchants-cloth-merchants-residence": {"rules_text": "Place above or below a pasture region. Rotate up through levels for more commerce; at higher levels gain 2 wool. Requires: City.", "values": {"commerce": 1, "requires": "City"}},
 "merchants-paper-merchants-residence": {"rules_text": "Place above or below a forest region. Rotate up through levels for more commerce; at higher levels gain 2 lumber. Requires: City.", "values": {"commerce": 1, "requires": "City"}},
 "merchants-trading-post": {"rules_text": "Road complement on your own free road. Once per turn, convert 1 resource between its two adjacent regions 1:1."},
 "merchants-brigand-camp": {"rules_text": "Foreign card built on the opponent's free road. The opponent's commerce is reduced by 1, and whenever they store a resource gained via their Marketplace you receive 1 gold.", "category": "building"},
 "merchants-ship-builder": {"rules_text": "Each of your trade ships costs 1 lumber or 1 wool less. Once, pay 1 gold to retrieve a trade ship from the discard pile.", "values": {"skill": 1}},
 "merchants-olaf-the-merchant-ship-captain": {"rules_text": "On a later turn, demand 1-2 resources and give 1 back, then discard Olaf.", "values": {"commerce": 1, "skill": 1}},
 "merchants-pirate-ship": {"rules_text": "When built, the opponent removes 1 trade ship to the discard. On Plentiful Harvest, gain 1 gold."},
 "merchants-commercial-metropolis": {"rules_text": "Place on one of your cities. Worth 2 VP (4 total with the city). Cannot be removed or attacked. Requires: a top-level Residence or 6 commerce points.", "values": {"victory_points": 2, "requires": "top-level Residence or 6 commerce"}},
 "merchants-trading-station": {"rules_text": "Foreign card built on the opponent's city. Once per turn, pay 1 gold to buy 1 resource from them. Requires: Commercial Harbor.", "category": "building", "values": {"requires": "Commercial Harbor"}},
 "merchants-commercial-harbor": {"copies": 2, "rules_text": "Once per turn, downgrade one of your Residences by 1 level to take any 2 resources. Prerequisite for several cards."},
 "merchants-lighthouse": {"rules_text": "Once per turn, use a trade ship adjacent to it to trade 1:1. Immune to Capricious Sea. Requires: Commercial Harbor or 2+ trade ships.", "values": {"requires": "Commercial Harbor or 2 trade ships"}},
 "merchants-craft-guild": {"rules_text": "When built, rotate all your Residences up 1 level (or take 2 resources if you have none). Prerequisite."},
 "merchants-master-merchants-alliance": {"rules_text": "When the opponent makes a 2:1 or 3:1 trade in their principality, you receive 1 of the resource they paid.", "values": {"commerce": 1}},
 "merchants-guild-master": {"rules_text": "Take up to 2 resources of your choice. Requires: Craft Guild.", "values": {"requires": "Craft Guild"}},
 "merchants-herold-the-master-merchant": {"name": "Hergild the Master Merchant", "rules_text": "This turn, freely trade one trade-ship resource type 1:1. Requires: Commercial Harbor or 2+ trade ships.", "values": {"requires": "Commercial Harbor or 2 trade ships"}},
 "merchants-gero-the-master-merchant": {"rules_text": "Take any 1-2 resources of your choice. Requires: 2+ trade ships.", "values": {"requires": "2 trade ships"}},
 "merchants-tactical-retreat": {"rules_text": "Remove one of your buildings from the opponent's principality to gain any 2 resources (1 of them taken from the opponent)."},
 "merchants-mendicants": {"rules_text": "If the opponent has the trade advantage, demand 1 resource (2 if they also lead on VP)."},
 "merchants-trade-monopoly": {"rules_text": "Demand 1-3 resources of a single type; give 1 back. Requires: Commercial Harbor.", "values": {"requires": "Commercial Harbor"}},
 "merchants-maritime-trade-monopoly": {"rules_text": "Demand 1 resource for each trade ship you have more than the opponent (max 2)."},
 "merchants-fortunate-trade-voyage": {"rules_text": "A favourable voyage - each player receives resources according to their trade ships.", "confidence": "medium"},
 "merchants-capricious-sea": {"rules_text": "Trade is disrupted: resources you cannot store are lost. A Lighthouse is immune.", "confidence": "medium"},
 "merchants-hour-of-the-master-merchants": {"rules_text": "Rotate each of your Residences to the next higher level. For each Residence already at the highest level, receive 1 resource in its adjacent region."},
}

by_id = {c["id"]: c for c in cards}
applied = 0; missing = []
for cid, p in PATCH.items():
    c = by_id.get(cid)
    if not c:
        missing.append(cid); continue
    for k, v in p.items():
        if k == "values":
            c.setdefault("values", {}).update(v)
        else:
            c[k] = v
    applied += 1

json.dump(cards, open(P, "w"), indent=2, ensure_ascii=False)
print("patched:", applied, "| missing ids:", missing)
