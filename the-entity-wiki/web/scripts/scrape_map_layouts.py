#!/usr/bin/env python3
"""
Download map layout images from Dead by Daylight Fandom wiki.
Source: https://deadbydaylight.fandom.com/wiki/Category:Map_outline_images
"""

import os
import requests
import re
from bs4 import BeautifulSoup
import time

# Configuration
OUTPUT_DIR = '/home/badeparday/Documents/projet-perso-application/the-entity-wiki/android/app/src/main/assets/public/dbd_images/map_layouts'
CATEGORY_URL = 'https://deadbydaylight.fandom.com/wiki/Category:Map_outline_images'
HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
}

def get_image_urls_from_category():
    """Fetch all image file pages from the category."""
    print(f"Fetching category page: {CATEGORY_URL}")
    response = requests.get(CATEGORY_URL, headers=HEADERS)
    soup = BeautifulSoup(response.text, 'html.parser')
    
    # Find all links to file pages
    file_links = []
    for link in soup.find_all('a', href=True):
        href = link['href']
        if '/wiki/File:' in href and 'Outline' in href:
            full_url = f"https://deadbydaylight.fandom.com{href}"
            file_links.append(full_url)
    
    print(f"Found {len(file_links)} file pages")
    return list(set(file_links))  # Remove duplicates

def get_direct_image_url(file_page_url):
    """Get the direct image URL from a file page."""
    response = requests.get(file_page_url, headers=HEADERS)
    soup = BeautifulSoup(response.text, 'html.parser')
    
    # Look for the full resolution image link
    img_tag = soup.find('img', class_='pi-image-thumbnail')
    if img_tag and img_tag.get('src'):
        src = img_tag['src']
        # Remove scaling parameters to get full size
        src = re.sub(r'/revision/.*$', '', src)
        return src
    
    # Try another method - look for the main image
    for img in soup.find_all('img'):
        src = img.get('src', '')
        if 'Outline' in src and 'static.wikia.nocookie.net' in src:
            # Remove scaling parameters
            src = re.sub(r'/scale-to-width-down/\d+', '', src)
            src = re.sub(r'/revision/.*$', '', src)
            return src
    
    return None

def download_image(url, filename):
    """Download an image from URL to local file."""
    try:
        response = requests.get(url, headers=HEADERS, timeout=30)
        response.raise_for_status()
        
        filepath = os.path.join(OUTPUT_DIR, filename)
        with open(filepath, 'wb') as f:
            f.write(response.content)
        
        print(f"  ✓ Downloaded: {filename} ({len(response.content)} bytes)")
        return True
    except Exception as e:
        print(f"  ✗ Failed: {filename} - {e}")
        return False

def main():
    # Create output directory
    os.makedirs(OUTPUT_DIR, exist_ok=True)
    print(f"Output directory: {OUTPUT_DIR}\n")
    
    # Get all file page URLs
    file_pages = get_image_urls_from_category()
    
    if not file_pages:
        print("No file pages found. The wiki structure may have changed.")
        return
    
    downloaded = 0
    failed = 0
    
    for i, file_page_url in enumerate(file_pages, 1):
        # Extract filename from URL
        filename_match = re.search(r'File:(.+\.png)', file_page_url)
        if not filename_match:
            continue
        
        filename = filename_match.group(1).replace('_', '')
        filename = filename.lower()
        
        print(f"[{i}/{len(file_pages)}] {filename}")
        
        # Check if already downloaded
        filepath = os.path.join(OUTPUT_DIR, filename)
        if os.path.exists(filepath):
            print(f"  → Already exists, skipping")
            downloaded += 1
            continue
        
        # Get direct image URL
        image_url = get_direct_image_url(file_page_url)
        if not image_url:
            print(f"  ✗ Could not find direct image URL")
            failed += 1
            continue
        
        # Download the image
        if download_image(image_url, filename):
            downloaded += 1
        else:
            failed += 1
        
        # Be nice to the server
        time.sleep(0.5)
    
    print(f"\n=== Summary ===")
    print(f"Downloaded: {downloaded}")
    print(f"Failed: {failed}")
    print(f"Total: {len(file_pages)}")

if __name__ == '__main__':
    main()
