#!/usr/bin/env python3
"""
Download ALL map layouts from hens333.com using the exact URLs found.
56 maps total.
"""

import os
import requests
import time

OUTPUT_DIR = "/home/badeparday/Documents/projet-perso-application/the-entity-wiki/web/dbd_images/map_layouts_hens"
HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    'Accept': 'image/webp,image/png,image/*,*/*',
    'Referer': 'https://hens333.com/'
}

# All 56 exact URLs found from browser scraping
HENS_URLS = [
    "https://hens333.com/img/dbd/callouts/Azarovs/Azarovs%20Resting%20Place.webp",
    "https://hens333.com/img/dbd/callouts/Azarovs/Blood%20Lodge.webp",
    "https://hens333.com/img/dbd/callouts/McMillan/Coal%20Tower.webp",
    "https://hens333.com/img/dbd/callouts/McMillan/Coal%20Tower%20II.webp",
    "https://hens333.com/img/dbd/callouts/Other/Dead%20Dawg%20Saloon.webp",
    "https://hens333.com/img/dbd/callouts/Boneyard/Dead%20Sands.webp",
    "https://hens333.com/img/dbd/callouts/Crotus%20Pen/Disturbed%20Ward.webp",
    "https://hens333.com/img/dbd/callouts/Boneyard/Eyrie%20of%20Crows.webp",
    "https://hens333.com/img/dbd/callouts/Other/Fallen%20Refuge.webp",
    "https://hens333.com/img/dbd/callouts/Yamaoka/Family%20Residence.webp",
    "https://hens333.com/img/dbd/callouts/Yamaoka/Family%20Residence%20II.webp",
    "https://hens333.com/img/dbd/callouts/Crotus%20Pen/Father%20Campbells%20Chapel.webp",
    "https://hens333.com/img/dbd/callouts/Borgo/Forgotten%20Ruins.webp",
    "https://hens333.com/img/dbd/callouts/Coldwind/Fractured%20Cowshed.webp",
    "https://hens333.com/img/dbd/callouts/Other/Freddy%20Fazbears%20Pizza.webp",
    "https://hens333.com/img/dbd/callouts/Other/Garden%20of%20Joy.webp",
    "https://hens333.com/img/dbd/callouts/Azarovs/Gas%20Heaven.webp",
    "https://hens333.com/img/dbd/callouts/Other/Greenville%20Square.webp",
    "https://hens333.com/img/dbd/callouts/Swamp/Grim%20Pantry.webp",
    "https://hens333.com/img/dbd/callouts/McMillan/Groaning%20Storehouse.webp",
    "https://hens333.com/img/dbd/callouts/McMillan/Groaning%20Storehouse%20II.webp",
    "https://hens333.com/img/dbd/callouts/McMillan/Ironworks%20Of%20Misery.webp",
    "https://hens333.com/img/dbd/callouts/McMillan/Ironworks%20Of%20Misery%20II.webp",
    "https://hens333.com/img/dbd/callouts/Other/Haddonfield.webp",
    "https://hens333.com/img/dbd/callouts/Other/Midwich.gif",
    "https://hens333.com/img/dbd/callouts/Red%20Forest/Mothers%20Dwelling.webp",
    "https://hens333.com/img/dbd/callouts/Ormond/Ormond.webp",
    "https://hens333.com/img/dbd/callouts/Ormond/Ormond%20II.webp",
    "https://hens333.com/img/dbd/callouts/Ormond/Ormond%20III.webp",
    "https://hens333.com/img/dbd/callouts/Ormond/Ormond%20Lake%20Mine.webp",
    "https://hens333.com/img/dbd/callouts/Dvarka%20Deepwood/Nostromo%20Wreckage.webp",
    "https://hens333.com/img/dbd/callouts/Raccoon%20City/Rpd%20East%20Wing.webp",
    "https://hens333.com/img/dbd/callouts/Raccoon%20City/Rpd%20West%20Wing.webp",
    "https://hens333.com/img/dbd/callouts/Badham/Preschool1.webp",
    "https://hens333.com/img/dbd/callouts/Badham/Preschool2.webp",
    "https://hens333.com/img/dbd/callouts/Badham/Preschool3.webp",
    "https://hens333.com/img/dbd/callouts/Badham/Preschool4.webp",
    "https://hens333.com/img/dbd/callouts/Badham/Preschool5.webp",
    "https://hens333.com/img/dbd/callouts/Coldwind/Rancid%20Abbatoir.webp",
    "https://hens333.com/img/dbd/callouts/Coldwind/Rotten%20Fields.webp",
    "https://hens333.com/img/dbd/callouts/Yamaoka/Sanctum%20of%20Wrath.webp",
    "https://hens333.com/img/dbd/callouts/Yamaoka/Sanctum%20of%20Wrath%20II.webp",
    "https://hens333.com/img/dbd/callouts/Borgo/Shattered%20Square.webp",
    "https://hens333.com/img/dbd/callouts/McMillan/Shelter%20Woods.webp",
    "https://hens333.com/img/dbd/callouts/McMillan/Shelter%20Woods%20II.webp",
    "https://hens333.com/img/dbd/callouts/McMillan/Suffocation%20Pit.webp",
    "https://hens333.com/img/dbd/callouts/McMillan/Suffocation%20Pit%20II.webp",
    "https://hens333.com/img/dbd/callouts/Red%20Forest/Temple%20of%20Purgation.webp",
    "https://hens333.com/img/dbd/callouts/Other/The%20Game.webp",
    "https://hens333.com/img/dbd/callouts/Swamp/Pale%20Rose.webp",
    "https://hens333.com/img/dbd/callouts/Coldwind/The%20Thompson%20House.webp",
    "https://hens333.com/img/dbd/callouts/Dvarka%20Deepwood/Toba%20Landing.webp",
    "https://hens333.com/img/dbd/callouts/Coldwind/Torment%20Creek.webp",
    "https://hens333.com/img/dbd/callouts/Other/Lerys.webp",
    "https://hens333.com/img/dbd/callouts/Azarovs/Wreckers.webp",
    "https://hens333.com/img/dbd/callouts/Azarovs/Wretched%20Shop.webp",
]

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

def main():
    os.makedirs(OUTPUT_DIR, exist_ok=True)
    print(f"Output directory: {OUTPUT_DIR}")
    print(f"Downloading {len(HENS_URLS)} maps from hens333.com")
    print("="*60)
    
    success = 0
    failed = 0
    
    for i, url in enumerate(HENS_URLS, 1):
        # Extract filename from URL
        filename = url.split('/')[-1].replace('%20', '_').lower()
        filepath = os.path.join(OUTPUT_DIR, filename)
        
        if os.path.exists(filepath):
            print(f"[{i:02d}/{len(HENS_URLS)}] ✓ {filename} (exists)")
            success += 1
            continue
        
        print(f"[{i:02d}/{len(HENS_URLS)}] Downloading: {filename}...", end=" ")
        size = download_image(url, filepath)
        
        if size:
            print(f"✓ ({size} bytes)")
            success += 1
        else:
            print("✗ Failed")
            failed += 1
        
        time.sleep(0.2)
    
    print("="*60)
    print(f"SUMMARY: {success} downloaded, {failed} failed")
    print(f"Files saved to: {OUTPUT_DIR}")

if __name__ == "__main__":
    main()
