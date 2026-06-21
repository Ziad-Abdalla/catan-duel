# Apply the 4-theme rules_text to cards.json. Safe to run after the other instance's edits.
# Usage: python apply-rules-text.py
import json, pathlib
root = pathlib.Path(__file__).resolve().parents[3]
cards_path = root / 'src/data/cards.json'
m = json.load(open(pathlib.Path(__file__).parent / 'rules-text-4themes.json', encoding='utf-8'))
cards = json.load(open(cards_path, encoding='utf-8'))
n = 0
for c in cards:
    if c['id'] in m and c.get('rules_text') != m[c['id']]:
        c['rules_text'] = m[c['id']]; n += 1
json.dump(cards, open(cards_path, 'w', encoding='utf-8'), indent=2, ensure_ascii=True)
open(cards_path, 'a', encoding='utf-8').write('\n')
print(f'applied rules_text to {n} cards (barbarians/explorers/sages/prosperity)')
