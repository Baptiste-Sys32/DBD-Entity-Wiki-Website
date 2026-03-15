#!/usr/bin/env python3
"""
Comprehensive Map Layout Scraper
Downloads all map images from:
1. hens333.com/callouts
2. Steam Community Guide
"""

import os
import requests
import time
from urllib.parse import quote

# Configuration
OUTPUT_DIR = "/home/badeparday/Documents/projet-perso-application/the-entity-wiki/web/dbd_images/map_layouts_all"
HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    'Accept': 'image/webp,image/png,image/*,*/*',
    'Referer': 'https://hens333.com/'
}

# All known maps from hens333.com with their folder structure
HENS_MAPS = {
    # MacMillan Estate
    "McMillan": [
        "Coal Tower", "Coal Tower II",
        "Groaning Storehouse", "Groaning Storehouse II",
        "Ironworks of Misery", "Ironworks of Misery II",
        "Shelter Woods", "Shelter Woods II",
        "Suffocation Pit", "Suffocation Pit II"
    ],
    # Autohaven Wreckers
    "Azarovs": [
        "Azarovs Resting Place", "Azarovs Resting Place II",
        "Blood Lodge", "Blood Lodge II",
        "Gas Heaven", "Gas Heaven II",
        "Wreckers Yard", "Wreckers Yard II",
        "Wretched Shop", "Wretched Shop II"
    ],
    # Coldwind Farm
    "Coldwind": [
        "Fractured Cowshed", "Fractured Cowshed II",
        "Rancid Abattoir", "Rancid Abattoir II",
        "Rotten Fields", "Rotten Fields II",
        "Thompson House", "Thompson House II",
        "Torment Creek", "Torment Creek II"
    ],
    # Crotus Prenn Asylum
    "Crotus Prenn": [
        "Disturbed Ward", "Disturbed Ward II",
        "Father Campbells Chapel", "Father Campbells Chapel II"
    ],
    # Backwater Swamp
    "Swamp": [
        "Grim Pantry", "Grim Pantry II",
        "Pale Rose", "Pale Rose II"
    ],
    # Yamaoka Estate
    "Yamaoka": [
        "Family Residence", "Family Residence II",
        "Sanctum of Wrath", "Sanctum of Wrath II"
    ],
    # Red Forest
    "Red Forest": [
        "Mothers Dwelling", "Mothers Dwelling II",
        "Temple of Purgation", "Temple of Purgation II"
    ],
    # Haddonfield
    "Haddonfield": [
        "Lampkin Lane", "Lampkin Lane II"
    ],
    # Gideon Meat Plant
    "Gideon": [
        "The Game Lower", "The Game Upper"
    ],
    # Silent Hill
    "Midwich": [
        "Midwich Elementary School Lower", "Midwich Elementary School Upper"
    ],
    # Ormond
    "Ormond": [
        "Mount Ormond Resort", "Mount Ormond Resort II"
    ],
    # Raccoon City
    "Raccoon City": [
        "Rpd Main", "Rpd Main II",
        "Rpd East Wing", "Rpd East Wing II",
        "Rpd West Wing", "Rpd West Wing II"
    ],
    # Grave of Glenvale
    "Other": [
        "Dead Dawg Saloon", "Dead Dawg Saloon II"
    ],
    # Withered Isle
    "Withered Isle": [
        "Garden of Joy", "Garden of Joy II"
    ],
    # Lery's Memorial Institute
    "Lerys": [
        "Treatment Theater", "Treatment Theater II"
    ],
    # Hawkins
    "Hawkins": [
        "Underground Complex"
    ],
    # Badham
    "Badham": [
        "Badham Preschool I", "Badham Preschool II",
        "Badham Preschool III", "Badham Preschool IV", "Badham Preschool V"
    ],
    # Forsaken Boneyard
    "Boneyard": [
        "Eyrie of Crows", "Eyrie of Crows II",
        "Dead Sands"
    ],
    # Borgo
    "Borgo": [
        "Decimated Borgo", "Decimated Borgo II"
    ],
    # Dvarka Deepwood
    "Dvarka": [
        "Toba Landing", "Toba Landing II"
    ],
    # Nostromo (if available)
    "Nostromo": [
        "Nostromo Wreckage"
    ]
}

def download_image(url, filepath):
    """Download an image from URL to filepath."""
    try:
        response = requests.get(url, headers=HEADERS, timeout=30)
        if response.status_code == 200:
            with open(filepath, 'wb') as f:
                f.write(response.content)
            return len(response.content)
        return None
    except Exception as e:
        print(f"    Error: {e}")
        return None

def download_hens_maps():
    """Download all maps from hens333.com."""
    print("\n" + "="*60)
    print("DOWNLOADING FROM HENS333.COM")
    print("="*60)
    
    hens_dir = os.path.join(OUTPUT_DIR, "hens333")
    os.makedirs(hens_dir, exist_ok=True)
    
    base_url = "https://hens333.com/img/dbd/callouts"
    success = 0
    failed = 0
    
    for realm_folder, maps in HENS_MAPS.items():
        print(f"\n[{realm_folder}]")
        realm_dir = os.path.join(hens_dir, realm_folder.replace(" ", "_"))
        os.makedirs(realm_dir, exist_ok=True)
        
        for map_name in maps:
            # URL encode the map name
            encoded_realm = quote(realm_folder)
            encoded_map = quote(map_name)
            url = f"{base_url}/{encoded_realm}/{encoded_map}.webp"
            
            # Local filename
            local_name = map_name.replace(" ", "-").lower() + ".webp"
            filepath = os.path.join(realm_dir, local_name)
            
            if os.path.exists(filepath):
                print(f"  ✓ {map_name} (already exists)")
                success += 1
                continue
            
            print(f"  Downloading: {map_name}...", end=" ")
            size = download_image(url, filepath)
            
            if size:
                print(f"✓ ({size} bytes)")
                success += 1
            else:
                print("✗ Failed")
                failed += 1
            
            time.sleep(0.3)
    
    print(f"\nHens333 Summary: {success} success, {failed} failed")
    return success, failed

def download_steam_maps():
    """
    Download maps from Steam Community Guide.
    Steam images are embedded in the guide page.
    """
    print("\n" + "="*60)
    print("DOWNLOADING FROM STEAM COMMUNITY")
    print("="*60)
    
    steam_dir = os.path.join(OUTPUT_DIR, "steam")
    os.makedirs(steam_dir, exist_ok=True)
    
    # Steam guide URL
    guide_url = "https://steamcommunity.com/sharedfiles/filedetails/?id=2904838739"
    
    print(f"\nFetching guide page: {guide_url}")
    
    try:
        response = requests.get(guide_url, headers={
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }, timeout=30)
        
        if response.status_code != 200:
            print(f"Failed to fetch guide page: {response.status_code}")
            return 0, 1
        
        html = response.text
        
        # Find all Steam CDN image URLs in the guide
        import re
        
        # Pattern for Steam CDN images
        patterns = [
            r'https://steamuserimages[^"\'>\s]+\.(?:png|jpg|jpeg|webp)',
            r'https://cdn\.cloudflare\.steamstatic[^"\'>\s]+\.(?:png|jpg|jpeg|webp)',
            r'https://steamcdn[^"\'>\s]+\.(?:png|jpg|jpeg|webp)'
        ]
        
        all_urls = set()
        for pattern in patterns:
            urls = re.findall(pattern, html, re.IGNORECASE)
            all_urls.update(urls)
        
        print(f"Found {len(all_urls)} image URLs")
        
        success = 0
        failed = 0
        
        for i, url in enumerate(sorted(all_urls), 1):
            # Generate filename from URL
            filename = f"steam_map_{i:03d}.png"
            filepath = os.path.join(steam_dir, filename)
            
            if os.path.exists(filepath):
                print(f"  ✓ {filename} (exists)")
                success += 1
                continue
            
            print(f"  [{i}/{len(all_urls)}] Downloading...", end=" ")
            size = download_image(url, filepath)
            
            if size:
                print(f"✓ ({size} bytes)")
                success += 1
            else:
                print("✗")
                failed += 1
            
            time.sleep(0.3)
        
        print(f"\nSteam Summary: {success} success, {failed} failed")
        return success, failed
        
    except Exception as e:
        print(f"Error: {e}")
        return 0, 1

def main():
    os.makedirs(OUTPUT_DIR, exist_ok=True)
    print(f"Output directory: {OUTPUT_DIR}")
    
    # Download from both sources
    hens_success, hens_failed = download_hens_maps()
    steam_success, steam_failed = download_steam_maps()
    
    print("\n" + "="*60)
    print("FINAL SUMMARY")
    print("="*60)
    print(f"Hens333: {hens_success} downloaded, {hens_failed} failed")
    print(f"Steam:   {steam_success} downloaded, {steam_failed} failed")
    print(f"Total:   {hens_success + steam_success} images")

if __name__ == "__main__":
    main()
