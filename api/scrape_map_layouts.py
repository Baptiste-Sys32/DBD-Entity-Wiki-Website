#!/usr/bin/env python3
"""
DBD Map Layout Scraper - Selenium Version
Scrapes map outline/layout images from the Dead by Daylight wiki using browser automation.
"""

import os
import re
import time
from urllib.parse import urljoin, unquote

try:
    from selenium import webdriver
    from selenium.webdriver.chrome.options import Options
    from selenium.webdriver.chrome.service import Service
    from selenium.webdriver.common.by import By
    from selenium.webdriver.support.ui import WebDriverWait
    from selenium.webdriver.support import expected_conditions as EC
except ImportError:
    print("Selenium not installed. Installing...")
    import subprocess
    subprocess.run(["pip", "install", "selenium", "webdriver-manager"])
    from selenium import webdriver
    from selenium.webdriver.chrome.options import Options
    from selenium.webdriver.chrome.service import Service
    from selenium.webdriver.common.by import By
    from selenium.webdriver.support.ui import WebDriverWait
    from selenium.webdriver.support import expected_conditions as EC

try:
    from webdriver_manager.chrome import ChromeDriverManager
except ImportError:
    print("webdriver-manager not installed. Installing...")
    import subprocess
    subprocess.run(["pip", "install", "webdriver-manager"])
    from webdriver_manager.chrome import ChromeDriverManager

import requests

# Configuration
BASE_URL = "https://deadbydaylight.wiki.gg"
OUTPUT_DIR = "./assets/map_layouts"
DELAY_BETWEEN_REQUESTS = 2  # seconds

# All known map pages to scrape
MAP_PAGES = [
    # MacMillan Estate
    "Coal_Tower", "Groaning_Storehouse", "Ironworks_of_Misery", "Shelter_Woods", "Suffocation_Pit",
    # Autohaven Wreckers
    "Azarov%27s_Resting_Place", "Blood_Lodge", "Gas_Heaven", "Wreckers%27_Yard", "Wretched_Shop",
    # Coldwind Farm
    "Fractured_Cowshed", "Rancid_Abattoir", "Rotten_Fields", "The_Thompson_House", "Torment_Creek",
    # Crotus Prenn Asylum
    "Disturbed_Ward", "Father_Campbell%27s_Chapel",
    # Haddonfield
    "Lampkin_Lane",
    # Backwater Swamp
    "The_Pale_Rose", "Grim_Pantry",
    # Léry's Memorial Institute
    "Treatment_Theatre",
    # Red Forest
    "Mother%27s_Dwelling", "The_Temple_of_Purgation",
    # Springwood
    "Badham_Preschool",
    # Gideon Meat Plant
    "The_Game",
    # Yamaoka Estate
    "Family_Residence", "Sanctum_of_Wrath",
    # Ormond
    "Mount_Ormond_Resort", "Ormond_Lake_Mine",
    # Hawkins
    "The_Underground_Complex",
    # Grave of Glenvale
    "Dead_Dawg_Saloon",
    # Silent Hill
    "Midwich_Elementary_School",
    # Raccoon City
    "Raccoon_City_Police_Station_East_Wing", "Raccoon_City_Police_Station_West_Wing",
    # Forsaken Boneyard
    "Dead_Sands", "Eyrie_of_Crows",
    # Withered Isle
    "Garden_of_Joy", "Greenville_Square",
    # The Decimated Borgo
    "The_Shattered_Square", "Forgotten_Ruins",
    # Dvarka Deepwood
    "Toba_Landing", "Nostromo_Wreckage",
]


def create_output_dir():
    """Create the output directory if it doesn't exist."""
    if not os.path.exists(OUTPUT_DIR):
        os.makedirs(OUTPUT_DIR)
        print(f"Created directory: {OUTPUT_DIR}")


def setup_driver():
    """Set up Chrome driver with headless options."""
    chrome_options = Options()
    chrome_options.add_argument("--headless")
    chrome_options.add_argument("--no-sandbox")
    chrome_options.add_argument("--disable-dev-shm-usage")
    chrome_options.add_argument("--disable-gpu")
    chrome_options.add_argument("--window-size=1920,1080")
    chrome_options.add_argument("--user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36")
    
    try:
        service = Service(ChromeDriverManager().install())
        driver = webdriver.Chrome(service=service, options=chrome_options)
        return driver
    except Exception as e:
        print(f"Failed to set up Chrome driver: {e}")
        print("\nTrying with Firefox...")
        from selenium.webdriver.firefox.options import Options as FirefoxOptions
        from webdriver_manager.firefox import GeckoDriverManager
        from selenium.webdriver.firefox.service import Service as FirefoxService
        
        firefox_options = FirefoxOptions()
        firefox_options.add_argument("--headless")
        service = FirefoxService(GeckoDriverManager().install())
        return webdriver.Firefox(service=service, options=firefox_options)


def find_layout_images(driver, map_name):
    """Find layout/outline images on the current page."""
    images = []
    
    # Look for image links containing 'outline' or 'layout'
    try:
        all_links = driver.find_elements(By.TAG_NAME, "a")
        for link in all_links:
            href = link.get_attribute("href") or ""
            href_lower = href.lower()
            
            # Check for outline/layout images
            if "/wiki/File:" in href and ("outline" in href_lower or "layout" in href_lower or "mapoutline" in href_lower):
                images.append(href)
        
        # Also look for images directly
        all_imgs = driver.find_elements(By.TAG_NAME, "img")
        for img in all_imgs:
            src = img.get_attribute("src") or ""
            src_lower = src.lower()
            
            if "outline" in src_lower or "layout" in src_lower:
                images.append(src)
                
    except Exception as e:
        print(f"  Error finding images: {e}")
    
    return list(set(images))


def get_direct_image_url(driver, file_page_url):
    """Get the direct image URL from a wiki File: page."""
    try:
        driver.get(file_page_url)
        time.sleep(1)
        
        # Look for the full resolution link or main image
        try:
            full_img = driver.find_element(By.CSS_SELECTOR, "a.internal img.mw-file-element")
            if full_img:
                src = full_img.get_attribute("src")
                # Convert thumbnail to full size if needed
                if "/thumb/" in src:
                    src = re.sub(r'/thumb/([^/]+/[^/]+)/[^/]+$', r'/\1', src)
                return src
        except:
            pass
        
        try:
            main_img = driver.find_element(By.CSS_SELECTOR, ".fullMedia a")
            return main_img.get_attribute("href")
        except:
            pass
            
        try:
            main_img = driver.find_element(By.CSS_SELECTOR, "#file img")
            return main_img.get_attribute("src")
        except:
            pass
            
    except Exception as e:
        print(f"  Error getting direct URL: {e}")
    
    return None


def download_image(url, filename):
    """Download an image to the output directory."""
    try:
        if not url.startswith('http'):
            url = urljoin(BASE_URL, url)
        
        headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            'Accept': 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8',
            'Referer': 'https://deadbydaylight.wiki.gg/'
        }
        response = requests.get(url, headers=headers, timeout=30)
        response.raise_for_status()
        
        filepath = os.path.join(OUTPUT_DIR, filename)
        with open(filepath, 'wb') as f:
            f.write(response.content)
        
        print(f"  ✓ Downloaded: {filename}")
        return True
    except Exception as e:
        print(f"  ✗ Failed to download {filename}: {e}")
        return False


def scrape_map(driver, map_name):
    """Scrape layout images for a single map."""
    print(f"\n📍 Scraping: {unquote(map_name)}")
    
    # Fetch the map page
    page_url = f"{BASE_URL}/wiki/{map_name}"
    
    try:
        driver.get(page_url)
        time.sleep(DELAY_BETWEEN_REQUESTS)
    except Exception as e:
        print(f"  Error loading page: {e}")
        return []
    
    # Find layout images
    image_refs = find_layout_images(driver, map_name)
    
    if not image_refs:
        print(f"  No layout images found")
        return []
    
    downloaded = []
    for ref in image_refs:
        # Get the filename from the reference
        if '/wiki/File:' in ref:
            filename = unquote(ref.split('/wiki/File:')[-1])
            direct_url = get_direct_image_url(driver, ref)
        else:
            filename = os.path.basename(unquote(ref.split('?')[0]))
            direct_url = ref
        
        if direct_url:
            # Clean filename
            safe_filename = re.sub(r'[<>:"/\\|?*]', '_', filename)
            if download_image(direct_url, safe_filename):
                downloaded.append(safe_filename)
        
        time.sleep(1)
    
    return downloaded


def main():
    """Main entry point."""
    print("=" * 60)
    print("Dead by Daylight Map Layout Scraper (Selenium)")
    print("=" * 60)
    
    create_output_dir()
    
    print("\nSetting up browser...")
    driver = setup_driver()
    
    all_downloaded = []
    failed_maps = []
    
    try:
        for map_name in MAP_PAGES:
            try:
                downloaded = scrape_map(driver, map_name)
                all_downloaded.extend(downloaded)
            except Exception as e:
                print(f"  ✗ Error processing {map_name}: {e}")
                failed_maps.append(map_name)
            
            time.sleep(DELAY_BETWEEN_REQUESTS)
    finally:
        driver.quit()
    
    # Summary
    print("\n" + "=" * 60)
    print("SUMMARY")
    print("=" * 60)
    print(f"Total images downloaded: {len(all_downloaded)}")
    print(f"Maps with no images: {len(failed_maps)}")
    print(f"Output directory: {os.path.abspath(OUTPUT_DIR)}")
    
    if all_downloaded:
        print("\nDownloaded files:")
        for f in all_downloaded:
            print(f"  - {f}")
    
    if failed_maps:
        print("\nFailed maps:")
        for m in failed_maps:
            print(f"  - {unquote(m)}")


if __name__ == "__main__":
    main()
