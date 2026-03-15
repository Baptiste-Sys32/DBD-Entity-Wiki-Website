#!/usr/bin/env python3
"""
Download status effect icons from DBD wiki using exact URLs.
"""

import os
import requests
import time

OUTPUT_DIR = "/home/badeparday/Documents/projet-perso-application/the-entity-wiki/web/dbd_images/status_effects"
HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    'Accept': 'image/webp,image/png,image/*,*/*',
}

# Exact URLs from browser scraping
ICONS = {
    # Standard Status Effects
    "blessed": "https://static.wikia.nocookie.net/deadbydaylight_gamepedia_en/images/3/3e/FulliconStatusEffects_blessed.png",
    "blindness": "https://static.wikia.nocookie.net/deadbydaylight_gamepedia_en/images/e/ea/FulliconStatusEffects_blindness.png",
    "bloodlust": "https://static.wikia.nocookie.net/deadbydaylight_gamepedia_en/images/b/ba/FulliconStatusEffects_bloodlust.png",
    "broken": "https://static.wikia.nocookie.net/deadbydaylight_gamepedia_en/images/9/91/FulliconStatusEffects_broken.png",
    "cursed": "https://static.wikia.nocookie.net/deadbydaylight_gamepedia_en/images/a/a7/FulliconStatusEffects_cursed.png",
    "deepwound": "https://static.wikia.nocookie.net/deadbydaylight_gamepedia_en/images/f/f4/FulliconStatusEffects_deepWound.png",
    "endurance": "https://static.wikia.nocookie.net/deadbydaylight_gamepedia_en/images/3/3a/FulliconStatusEffects_enduranceSurvivor.png",
    "exhausted": "https://static.wikia.nocookie.net/deadbydaylight_gamepedia_en/images/b/b4/FulliconStatusEffects_exhausted.png",
    "exposed": "https://static.wikia.nocookie.net/deadbydaylight_gamepedia_en/images/e/e1/FulliconStatusEffects_exposed.png",
    "haemorrhage": "https://static.wikia.nocookie.net/deadbydaylight_gamepedia_en/images/7/7c/FulliconStatusEffects_bleeding.png",
    "haste": "https://static.wikia.nocookie.net/deadbydaylight_gamepedia_en/images/6/63/FulliconStatusEffects_haste.png",
    "hindered": "https://static.wikia.nocookie.net/deadbydaylight_gamepedia_en/images/b/bf/FulliconStatusEffects_hindered.png",
    "incapacitated": "https://static.wikia.nocookie.net/deadbydaylight_gamepedia_en/images/7/7e/FulliconStatusEffects_incapacitated.png",
    "madness": "https://static.wikia.nocookie.net/deadbydaylight_gamepedia_en/images/d/db/FulliconStatusEffects_madness.png",
    "mangled": "https://static.wikia.nocookie.net/deadbydaylight_gamepedia_en/images/1/10/FulliconStatusEffects_mangled.png",
    "oblivious": "https://static.wikia.nocookie.net/deadbydaylight_gamepedia_en/images/c/cf/FulliconStatusEffects_oblivious.png",
    "undetectable": "https://static.wikia.nocookie.net/deadbydaylight_gamepedia_en/images/b/b0/FulliconStatusEffects_undetectable.png",
    # Health States
    "healthy": "https://static.wikia.nocookie.net/deadbydaylight_gamepedia_en/images/6/67/IconHelp_healthy.png",
    "injured": "https://static.wikia.nocookie.net/deadbydaylight_gamepedia_en/images/9/93/IconHelp_injured.png",
    "dying": "https://static.wikia.nocookie.net/deadbydaylight_gamepedia_en/images/9/9a/IconHelp_dying.png",
    "sacrificed": "https://static.wikia.nocookie.net/deadbydaylight_gamepedia_en/images/8/82/IconHelp_Sacrificed.png",
    "bledout": "https://static.wikia.nocookie.net/deadbydaylight_gamepedia_en/images/3/3f/IconHelp_BleedOutDeath.png",
    "hooked": "https://static.wikia.nocookie.net/deadbydaylight_gamepedia_en/images/4/4f/IconHelpLoading_hook.png",
    "obsession": "https://static.wikia.nocookie.net/deadbydaylight_gamepedia_en/images/a/af/IconHelp_obsession.png",
}

def download_image(url, filepath):
    try:
        response = requests.get(url, headers=HEADERS, timeout=30, allow_redirects=True)
        if response.status_code == 200 and len(response.content) > 1000:
            # Check it's not HTML
            content_type = response.headers.get('content-type', '')
            if 'text/html' in content_type:
                return None
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
    print(f"Downloading {len(ICONS)} icons...")
    print("="*50)
    
    success = 0
    failed = 0
    
    for name, url in ICONS.items():
        filepath = os.path.join(OUTPUT_DIR, f"{name}.png")
        
        if os.path.exists(filepath):
            print(f"✓ {name} (exists)")
            success += 1
            continue
        
        print(f"  {name}...", end=" ")
        size = download_image(url, filepath)
        
        if size:
            print(f"✓ ({size} bytes)")
            success += 1
        else:
            print("✗")
            failed += 1
        
        time.sleep(0.3)
    
    print("="*50)
    print(f"Summary: {success} success, {failed} failed")

if __name__ == "__main__":
    main()
