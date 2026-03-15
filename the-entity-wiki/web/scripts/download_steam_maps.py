#!/usr/bin/env python3
"""
Download map layout images from Steam Community guide.
Uses steamusercontent.com/ugc/ URLs found by browser.
"""

import os
import requests
import time

OUTPUT_DIR = "/home/badeparday/Documents/projet-perso-application/the-entity-wiki/web/dbd_images/map_layouts_steam"
HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    'Accept': 'image/*,*/*'
}

# Sample Steam guide URLs from the browser extraction
# These need a trailing slash to work
STEAM_URLS = [
    "https://images.steamusercontent.com/ugc/5100921132430164815/09F368B7CAA4AD261EEDB61DE78C362CF7B0E5F2/",
    "https://images.steamusercontent.com/ugc/5100921132430162399/0FA47F49C06553DE2BFC2257B9BEC2A6EB604066/",
    "https://images.steamusercontent.com/ugc/2035097135958753889/BDB500D6B2FD810F375316F32AFFD73DB44C2C79/",
]

def get_all_steam_urls():
    """
    Fetch the Steam guide page and extract all image URLs.
    """
    import re
    
    guide_url = "https://steamcommunity.com/sharedfiles/filedetails/?id=2904838739"
    
    print(f"Fetching guide page: {guide_url}")
    response = requests.get(guide_url, headers=HEADERS, timeout=30)
    
    if response.status_code != 200:
        print(f"Failed to fetch guide: {response.status_code}")
        return []
    
    html = response.text
    
    # Find all steamusercontent.com/ugc/ URLs
    pattern = r'https://images\.steamusercontent\.com/ugc/[^"\'<>\s]+'
    urls = re.findall(pattern, html)
    
    # Clean URLs - remove query params and ensure trailing slash
    cleaned = set()
    for url in urls:
        base = url.split('?')[0]
        if not base.endswith('/'):
            base += '/'
        cleaned.add(base)
    
    return list(cleaned)

def download_image(url, filepath):
    """Download an image from URL to filepath."""
    try:
        response = requests.get(url, headers=HEADERS, timeout=30)
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
    
    urls = get_all_steam_urls()
    print(f"Found {len(urls)} unique image URLs")
    print("="*60)
    
    if not urls:
        print("No URLs found!")
        return
    
    success = 0
    failed = 0
    
    for i, url in enumerate(urls, 1):
        # Generate filename from URL hash
        url_hash = url.split('/')[-2] if url.endswith('/') else url.split('/')[-1]
        filename = f"steam_map_{i:03d}_{url_hash[:8]}.png"
        filepath = os.path.join(OUTPUT_DIR, filename)
        
        if os.path.exists(filepath):
            print(f"[{i:02d}/{len(urls)}] ✓ {filename} (exists)")
            success += 1
            continue
        
        print(f"[{i:02d}/{len(urls)}] Downloading: {filename}...", end=" ")
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
