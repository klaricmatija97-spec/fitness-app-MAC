#!/usr/bin/env python3
"""
Fix duplicate IDs in meal_components.json
"""

import json
import os

MEAL_FILE = os.path.join(os.path.dirname(__file__), '..', 'lib', 'data', 'meal_components.json')

# Mapping of meals that need new IDs (by name)
NEW_ID_MAPPING = {
    # Breakfast
    "Avokado tost s jajima": "breakfast_new_1",
    "Overnight oats s bademima": "breakfast_new_2",
    "Palačinke od banane i jaja": "breakfast_new_3",
    
    # Lunch
    "Piletina u zelenom curry umaku": "lunch_new_1",
    "Salata s tunjevinom i jajetom": "lunch_new_2",
    "Tikvice punjene mljevenom puretinom": "lunch_new_3",
    "Juha od piletine i povrća": "lunch_new_4",
    
    # Dinner
    "Pečeni brancin s mladim krumpirom": "dinner_new_1",
    "Pureća prsa s gljivama i pireom": "dinner_new_2",
    "Salata s piletinom i avokadom": "dinner_new_3",
    "Oslić u foliji s povrćem": "dinner_new_4",
    
    # Snack
    "Štapići od krastavca s humusom": "snack_new_1",
    "Skyr s borovnicama": "snack_new_2",
}

def main():
    print("📖 Učitavam meal_components.json...")
    
    with open(MEAL_FILE, 'r', encoding='utf-8') as f:
        data = json.load(f)
    
    # Collect all IDs
    all_ids = set()
    for category in ['breakfast', 'lunch', 'dinner', 'snack']:
        for meal in data[category]:
            all_ids.add(meal['id'])
    
    print(f"   Ukupno jela: {len(all_ids)}")
    
    # Fix duplicates
    fixed_count = 0
    for category in ['breakfast', 'lunch', 'dinner', 'snack']:
        for meal in data[category]:
            if meal['name'] in NEW_ID_MAPPING:
                old_id = meal['id']
                new_id = NEW_ID_MAPPING[meal['name']]
                print(f"   🔄 {meal['name']}: {old_id} -> {new_id}")
                meal['id'] = new_id
                fixed_count += 1
    
    print(f"\n💾 Spremam promjene... ({fixed_count} popravljeno)")
    
    with open(MEAL_FILE, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
    
    # Verify no duplicates
    all_ids = []
    for category in ['breakfast', 'lunch', 'dinner', 'snack']:
        for meal in data[category]:
            all_ids.append(meal['id'])
    
    duplicates = [x for x in all_ids if all_ids.count(x) > 1]
    if duplicates:
        print(f"\n⚠️ Još ima duplikata: {set(duplicates)}")
    else:
        print(f"\n✅ Nema duplikata! Ukupno {len(set(all_ids))} jedinstvenih jela.")

if __name__ == "__main__":
    main()

