#!/usr/bin/env python3
"""
DBD Data Scraper - Fetches killer powers and character lore from the DBD API
and updates data.js with real data.
"""

import json
import re
import urllib.request
import os

API_BASE = "https://dbd.tricky.lol/api"

def strip_html(text):
    """Remove HTML tags from text."""
    if not text:
        return ""
    # Replace <br> with newlines
    text = re.sub(r'<br\s*/?>', '\n', text)
    # Remove all other HTML tags
    text = re.sub(r'<[^>]+>', '', text)
    return text.strip()

def fetch_json(url):
    """Fetch JSON from URL."""
    print(f"Fetching: {url}")
    try:
        with urllib.request.urlopen(url, timeout=30) as response:
            return json.loads(response.read().decode('utf-8'))
    except Exception as e:
        print(f"Error fetching {url}: {e}")
        return None

def load_data_js(filepath):
    """Load DATA from data.js file."""
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # Extract JSON from "const DATABASE = {...};"
    match = re.search(r'const DATABASE = (\{.*\});', content, re.DOTALL)
    if match:
        return json.loads(match.group(1)), content
    return None, content

def save_data_js(filepath, data):
    """Save DATA to data.js file."""
    json_str = json.dumps(data, indent=2, ensure_ascii=False)
    content = f"const DATABASE = {json_str};"
    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(content)
    print(f"Saved to {filepath}")

def update_killers(data, api_killers):
    """Update killer power and lore from API data."""
    # Create lookup by name
    api_lookup = {}
    for k_id, k_data in api_killers.items():
        name = k_data.get('name', '')
        api_lookup[name.lower()] = k_data
    
    updated = 0
    for killer in data.get('killers', []):
        name = killer.get('name', '').lower()
        if name in api_lookup:
            api_k = api_lookup[name]
            # Update power (bio field contains power description)
            bio = api_k.get('bio', '')
            if bio:
                killer['power'] = strip_html(bio)
            # Update lore (story field contains backstory)
            story = api_k.get('story', '')
            if story:
                killer['lore'] = strip_html(story)
            updated += 1
            print(f"  Updated: {killer.get('name')}")
    
    print(f"Updated {updated} killers")
    return data

def update_survivors(data, api_survivors):
    """Update survivor lore from API data."""
    # Create lookup by name - handle both dict and list formats
    api_lookup = {}
    if isinstance(api_survivors, dict):
        for s_id, s_data in api_survivors.items():
            name = s_data.get('name', '')
            api_lookup[name.lower()] = s_data
    elif isinstance(api_survivors, list):
        for s_data in api_survivors:
            name = s_data.get('name', '')
            api_lookup[name.lower()] = s_data
    
    updated = 0
    for survivor in data.get('survivors', []):
        name = survivor.get('name', '').lower()
        if name in api_lookup:
            api_s = api_lookup[name]
            # Update lore (story field contains backstory)
            story = api_s.get('story', '')
            if story:
                survivor['lore'] = strip_html(story)
            updated += 1
            print(f"  Updated: {survivor.get('name')}")
    
    print(f"Updated {updated} survivors")
    return data

def main():
    script_dir = os.path.dirname(os.path.abspath(__file__))
    data_js_path = os.path.join(script_dir, 'data.js')
    
    print("Loading data.js...")
    data, original_content = load_data_js(data_js_path)
    if not data:
        print("Failed to parse data.js")
        return
    
    print(f"Loaded {len(data.get('killers', []))} killers, {len(data.get('survivors', []))} survivors")
    
    # Fetch killer data
    print("\nFetching killer data...")
    api_killers = fetch_json(f"{API_BASE}/characters?role=killer")
    if api_killers:
        data = update_killers(data, api_killers)
    
    # Fetch survivor data
    print("\nFetching survivor data...")
    api_survivors = fetch_json(f"{API_BASE}/characters?role=survivor")
    if api_survivors:
        data = update_survivors(data, api_survivors)
    
    # Save updated data
    print("\nSaving updated data.js...")
    save_data_js(data_js_path, data)
    print("Done!")

if __name__ == "__main__":
    main()
