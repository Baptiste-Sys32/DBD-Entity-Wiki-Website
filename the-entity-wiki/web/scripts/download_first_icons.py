#!/usr/bin/env python3
"""
Download all icons for The First (Henry Creel / Vecna - Stranger Things):
- Power icon
- Perk icons (into dbd_images/perks/)
- Addon icons (into dbd_images/addons/)
"""

import os
import requests
import time

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
BASE_DIR = os.path.join(SCRIPT_DIR, '..')

POWERS_DIR = os.path.join(BASE_DIR, 'dbd_images', 'powers')
PERKS_DIR = os.path.join(BASE_DIR, 'dbd_images', 'perks')
ADDONS_DIR = os.path.join(BASE_DIR, 'dbd_images', 'addons')

WIKI_BASE = "https://deadbydaylight.wiki.gg/images"

HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept': 'image/webp,image/apng,image/*,*/*;q=0.8',
    'Referer': 'https://deadbydaylight.wiki.gg/'
}

# Power icon
POWER_ICONS = {
    "the_first_power.png": f"{WIKI_BASE}/T_UI_iconPowers_EnterUpsideDown.png",
}

# Perk icons - using the naming convention from dbd_images/perks/
PERK_ICONS = {
    "IconPerks_turnBackTheClock.png": f"{WIKI_BASE}/IconsPerks_TurnBackTheClock.png",
    "IconPerks_secretProject.png": f"{WIKI_BASE}/IconsPerks_SecretProject.png",
    "IconPerks_hexHiveMind.png": f"{WIKI_BASE}/IconsPerks_HexHiveMind.png",
}

# Addon icons - using lowercase naming convention from dbd_images/addons/
ADDON_ICONS = {
    "iconaddon_beadmaze.png": f"{WIKI_BASE}/IconAddon_BeadMaze.png",
    "iconaddon_orderlyid.png": f"{WIKI_BASE}/IconAddon_OrderlyID.png",
    "iconaddon_shatteredwristrocket.png": f"{WIKI_BASE}/IconAddon_ShatteredWristRocket.png",
    "iconaddon_stainedglassmural.png": f"{WIKI_BASE}/IconAddon_StainedGlassMural.png",
    "iconaddon_bloodyrollerskate.png": f"{WIKI_BASE}/IconAddon_BloodyRollerSkate.png",
    "iconaddon_clockhands.png": f"{WIKI_BASE}/IconAddon_ClockHands.png",
    "iconaddon_guttedsupercom.png": f"{WIKI_BASE}/IconAddon_GuttedSupercom.png",
    "iconaddon_mid-centuryradio.png": f"{WIKI_BASE}/IconAddon_Mid-CenturyRadio.png",
    "iconaddon_smashedcassettedeck.png": f"{WIKI_BASE}/IconAddon_SmashedCassetteDeck.png",
    "iconaddon_electrodecap.png": f"{WIKI_BASE}/IconAddon_ElectrodeCap.png",
    "iconaddon_forgeddeathcertificate.png": f"{WIKI_BASE}/IconAddon_ForgedDeathCertificate.png",
    "iconaddon_necktendril.png": f"{WIKI_BASE}/IconAddon_NeckTendril.png",
    "iconaddon_rabbitremains.png": f"{WIKI_BASE}/IconAddon_RabbitRemains.png",
    "iconaddon_victorsrazorblade.png": f"{WIKI_BASE}/IconAddon_VictorsRazorBlade.png",
    "iconaddon_blackwidowspider.png": f"{WIKI_BASE}/IconAddon_BlackWidowSpider.png",
    "iconaddon_brokenskateboard.png": f"{WIKI_BASE}/IconAddon_BrokenSkateboard.png",
    "iconaddon_electroshockcollar.png": f"{WIKI_BASE}/IconAddon_ElectroshockCollar.png",
    "iconaddon_pizzagoggles.png": f"{WIKI_BASE}/IconAddon_PizzaGoggles.png",
    "iconaddon_chesspiece.png": f"{WIKI_BASE}/IconAddon_ChessPiece.png",
    "iconaddon_iridescentsoteriaChip.png": f"{WIKI_BASE}/IconAddon_IridescentSoteriaChip.png",
}


def download_image(url, filepath):
    """Download an image from URL to filepath."""
    try:
        response = requests.get(url, timeout=30, headers=HEADERS)
        if response.status_code == 200 and len(response.content) > 100:
            content_type = response.headers.get('content-type', '')
            if 'text/html' in content_type:
                print(f"    Got HTML instead of image")
                return False
            with open(filepath, 'wb') as f:
                f.write(response.content)
            return True
        else:
            print(f"    Status: {response.status_code}, Size: {len(response.content)}")
    except Exception as e:
        print(f"    Error: {e}")
    return False


def download_batch(icons, output_dir, category):
    """Download a batch of icons to a directory."""
    os.makedirs(output_dir, exist_ok=True)
    print(f"\n{'='*60}")
    print(f"Downloading {len(icons)} {category} icons to {output_dir}")
    print(f"{'='*60}")
    
    success = 0
    failed = 0
    
    for filename, url in icons.items():
        filepath = os.path.join(output_dir, filename)
        
        if os.path.exists(filepath) and os.path.getsize(filepath) > 100:
            print(f"  ✓ {filename} (already exists)")
            success += 1
            continue
        
        print(f"  → {filename}...")
        if download_image(url, filepath):
            size = os.path.getsize(filepath)
            print(f"    ✓ Downloaded ({size} bytes)")
            success += 1
        else:
            print(f"    ✗ Failed")
            failed += 1
        
        time.sleep(0.3)
    
    print(f"\n{category}: {success}/{len(icons)} downloaded, {failed} failed")
    return failed


def main():
    print("=" * 60)
    print("Downloading all icons for The First (Henry Creel / Vecna)")
    print("=" * 60)
    
    total_failed = 0
    total_failed += download_batch(POWER_ICONS, POWERS_DIR, "Power")
    total_failed += download_batch(PERK_ICONS, PERKS_DIR, "Perk")
    total_failed += download_batch(ADDON_ICONS, ADDONS_DIR, "Addon")
    
    print(f"\n{'='*60}")
    if total_failed == 0:
        print("All icons downloaded successfully!")
    else:
        print(f"Done with {total_failed} failures")
    print(f"{'='*60}")


if __name__ == "__main__":
    main()
