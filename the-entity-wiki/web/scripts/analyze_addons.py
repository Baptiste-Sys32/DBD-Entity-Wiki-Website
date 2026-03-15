#!/usr/bin/env python3
"""
Analyze addon image mismatches between API data and local files.
Outputs: matches found, potential matches, and truly missing files.
"""

import os
import re
import json
from difflib import get_close_matches

# Paths
DATA_JS = '/home/badeparday/Documents/projet-perso-application/the-entity-wiki/web/data.js'
ADDONS_DIR = '/home/badeparday/Documents/projet-perso-application/the-entity-wiki/android/app/src/main/assets/public/dbd_images/addons'

# Extract addon image names from data.js
def get_api_addon_names():
    with open(DATA_JS, 'r') as f:
        content = f.read()
    # Find all iconAddon_* patterns
    pattern = r'iconAddon_([A-Za-z0-9_]+)'
    matches = set(re.findall(pattern, content))
    return matches

# Get local addon file names (without extension and prefix)
def get_local_addon_names():
    files = os.listdir(ADDONS_DIR)
    names = {}
    for f in files:
        if f.endswith('.png'):
            # Remove 'iconaddon_' prefix and '.png' suffix
            name = f.replace('iconaddon_', '').replace('.png', '')
            names[name.lower()] = f
    return names

def main():
    api_names = get_api_addon_names()
    local_names = get_local_addon_names()
    local_keys = list(local_names.keys())
    
    exact_matches = []
    potential_matches = []
    missing = []
    
    for api_name in sorted(api_names):
        api_lower = api_name.lower()
        
        # Check exact match
        if api_lower in local_names:
            exact_matches.append(api_name)
        else:
            # Find closest matches
            close = get_close_matches(api_lower, local_keys, n=3, cutoff=0.6)
            if close:
                potential_matches.append({
                    'api': api_name,
                    'api_lower': f'iconaddon_{api_lower}.png',
                    'suggestions': [local_names[c] for c in close]
                })
            else:
                missing.append(api_name)
    
    print(f"=== ADDON IMAGE ANALYSIS ===\n")
    print(f"Total API addon names: {len(api_names)}")
    print(f"Total local addon files: {len(local_names)}")
    print(f"Exact matches: {len(exact_matches)}")
    print(f"Potential matches (need alias): {len(potential_matches)}")
    print(f"Truly missing (no close match): {len(missing)}\n")
    
    print("=== POTENTIAL MATCHES (need aliases) ===")
    for pm in potential_matches:
        print(f"\nAPI: {pm['api_lower']}")
        print(f"  → Suggestions: {pm['suggestions']}")
    
    print("\n\n=== TRULY MISSING (may need to download) ===")
    for m in missing:
        print(f"  - iconaddon_{m.lower()}.png")

if __name__ == '__main__':
    main()
