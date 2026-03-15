#!/usr/bin/env python3
"""
Scrape status effect icons from the DBD wiki.
"""

import os
import requests
import time
import re

OUTPUT_DIR = "/home/badeparday/Documents/projet-perso-application/the-entity-wiki/web/dbd_images/status_effects"
HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    'Accept': 'image/webp,image/png,image/*,*/*',
}

# Status effects to scrape
STATUS_EFFECTS = [
    "Blessed",
    "Blindness", 
    "Bloodlust",
    "Broken",
    "Cursed",
    "Deafened",
    "Deep_Wound",
    "Endurance",
    "Exhausted",
    "Exposed",
    "Haemorrhage",
    "Haste",
    "Hindered", 
    "Incapacitated",
    "Madness",
    "Mangled",
    "Oblivious",
    "Undetectable"
]

# Known icon URLs from wiki (IconStatusEffects pattern)
BASE_URL = "https://static.wikia.nocookie.net/deadbydaylight_gamepedia_en/images"

# Icon filenames follow pattern: IconStatusEffects_<name>.png
def get_icon_urls():
    """
    Construct known wiki icon URLs.
    """
    urls = []
    for effect in STATUS_EFFECTS:
        # Common patterns for status effect icons
        name = effect.replace("_", "")
        urls.append({
            "name": effect.lower().replace("_", ""),
            "urls": [
                f"https://deadbydaylight.fandom.com/wiki/Special:Redirect/file/IconStatusEffects_{effect.replace('_', '')}.png",
                f"https://deadbydaylight.fandom.com/wiki/Special:Redirect/file/IconStatusEffects_{effect}.png",
                f"https://deadbydaylight.fandom.com/wiki/Special:Redirect/file/iconStatusEffects_{effect.lower().replace('_', '')}.png",
            ]
        })
    return urls

def download_image(url, filepath):
    """Download an image from URL to filepath."""
    try:
        response = requests.get(url, headers=HEADERS, timeout=30, allow_redirects=True)
        if response.status_code == 200 and len(response.content) > 1000:
            with open(filepath, 'wb') as f:
                f.write(response.content)
            return len(response.content)
        return None
    except Exception as e:
        print(f"    Error: {e}")
        return None

def main():
    os.makedirs(OUTPUT_DIR, exist_ok=True)
    print(f"Output directory: {OUTPUT_DIR}")
    
    effects = get_icon_urls()
    success = 0
    failed = 0
    
    for effect in effects:
        name = effect["name"]
        filepath = os.path.join(OUTPUT_DIR, f"{name}.png")
        
        if os.path.exists(filepath):
            print(f"✓ {name} (exists)")
            success += 1
            continue
        
        downloaded = False
        for url in effect["urls"]:
            print(f"  Trying: {name}...", end=" ")
            size = download_image(url, filepath)
            if size:
                print(f"✓ ({size} bytes)")
                downloaded = True
                success += 1
                break
            else:
                print("✗")
        
        if not downloaded:
            failed += 1
        
        time.sleep(0.3)
    
    print(f"\nSummary: {success} success, {failed} failed")
    print(f"Files saved to: {OUTPUT_DIR}")

if __name__ == "__main__":
    main()
