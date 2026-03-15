#!/usr/bin/env python3
"""
Download killer power icons using exact URLs from the wiki.
"""

import os
import requests
import time

OUTPUT_DIR = "web/dbd_images/powers"

# Exact URLs from the wiki Powers page
POWER_ICONS = {
    "The Trapper": "https://deadbydaylight.wiki.gg/images/IconPowers_trap.png",
    "The Wraith": "https://deadbydaylight.wiki.gg/images/IconPowers_bell.png",
    "The Hillbilly": "https://deadbydaylight.wiki.gg/images/IconPowers_chainsaw.png",
    "The Nurse": "https://deadbydaylight.wiki.gg/images/IconPowers_breath.png",
    "The Shape": "https://deadbydaylight.wiki.gg/images/T_UI_iconPowers_stalker.png",
    "The Hag": "https://deadbydaylight.wiki.gg/images/IconPowers_blackenedCatalyst.png",
    "The Doctor": "https://deadbydaylight.wiki.gg/images/IconPowers_cartersSpark.png",
    "The Huntress": "https://deadbydaylight.wiki.gg/images/IconPowers_huntingHatchets.png",
    "The Cannibal": "https://deadbydaylight.wiki.gg/images/IconPowers_bubbasChainsaw.png",
    "The Nightmare": "https://deadbydaylight.wiki.gg/images/IconPowers_dreamDemon.png",
    "The Pig": "https://deadbydaylight.wiki.gg/images/IconPowers_jigsawsBaptism.png",
    "The Clown": "https://deadbydaylight.wiki.gg/images/IconPowers_gasBomb.png",
    "The Spirit": "https://deadbydaylight.wiki.gg/images/IconPowers_yamaokasHaunting.png",
    "The Legion": "https://deadbydaylight.wiki.gg/images/IconPowers_feralFrenzy.png",
    "The Plague": "https://deadbydaylight.wiki.gg/images/IconPowers_vilePurge.png",
    "The Ghost Face": "https://deadbydaylight.wiki.gg/images/IconPowers_nightShroud.png",
    "The Demogorgon": "https://deadbydaylight.wiki.gg/images/IconPowers_ofTheAbyss.png",
    "The Oni": "https://deadbydaylight.wiki.gg/images/IconPowers_yamaokasWrath.png",
    "The Deathslinger": "https://deadbydaylight.wiki.gg/images/IconPowers_theRedeemer.png",
    "The Executioner": "https://deadbydaylight.wiki.gg/images/IconPowers_ritesOfJudgement.png",
    "The Blight": "https://deadbydaylight.wiki.gg/images/IconPowers_blightedCorruption.png",
    "The Twins": "https://deadbydaylight.wiki.gg/images/IconPowers_bloodBond.png",
    "The Trickster": "https://deadbydaylight.wiki.gg/images/IconPowers_showstopper.png",
    "The Nemesis": "https://deadbydaylight.wiki.gg/images/IconPowers_t-Virus_MR1.png",
    "The Cenobite": "https://deadbydaylight.wiki.gg/images/IconPowers_summonsOfPain.png",
    "The Artist": "https://deadbydaylight.wiki.gg/images/IconPowers_birdsOfTorment.png",
    "The Onryō": "https://deadbydaylight.wiki.gg/images/IconPowers_delugeOfFear.png",
    "The Dredge": "https://deadbydaylight.wiki.gg/images/IconPowers_reignOfDarkness.png",
    "The Mastermind": "https://deadbydaylight.wiki.gg/images/IconPowers_virulentBound.png",
    "The Knight": "https://deadbydaylight.wiki.gg/images/IconPowers_guardiaCompagnia_Carnifex.png",
    "The Skull Merchant": "https://deadbydaylight.wiki.gg/images/IconPowers_eyesInTheSky.png",
    "The Singularity": "https://deadbydaylight.wiki.gg/images/IconPowers_quantumInstantiation.png",
    "The Xenomorph": "https://deadbydaylight.wiki.gg/images/IconPowers_hiddenPursuit.png",
    "The Good Guy": "https://deadbydaylight.wiki.gg/images/IconPowers_playtimesOver.png",
    "The Unknown": "https://deadbydaylight.wiki.gg/images/IconPowers_ChargeUVX_K35.png",
    "The Lich": "https://deadbydaylight.wiki.gg/images/IconPowers_VileDarkness.png",
    "The Dark Lord": "https://deadbydaylight.wiki.gg/images/IconPowers_K37_Shapeshift.png",
    "The Houndmaster": "https://deadbydaylight.wiki.gg/images/IconPowers_K38_dashCommand.png",
    "The Ghoul": "https://deadbydaylight.wiki.gg/images/IconPowers_AimKaguneLeap_K39.png",
    "The Animatronic": "https://deadbydaylight.wiki.gg/images/IconPowers_throw.png",
    "The Krasue": "https://deadbydaylight.wiki.gg/images/IconPowers_HeadForm_K41.png",
    "The First": "https://deadbydaylight.wiki.gg/images/T_UI_iconPowers_EnterUpsideDown.png",
}

def download_image(url, filepath):
    """Download an image from URL to filepath."""
    try:
        response = requests.get(url, timeout=30, headers={
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept': 'image/webp,image/apng,image/*,*/*;q=0.8',
            'Referer': 'https://deadbydaylight.wiki.gg/'
        })
        if response.status_code == 200 and len(response.content) > 100:
            with open(filepath, 'wb') as f:
                f.write(response.content)
            return True
        else:
            print(f"  Status: {response.status_code}, Size: {len(response.content)}")
    except Exception as e:
        print(f"  Error: {e}")
    return False

def main():
    os.makedirs(OUTPUT_DIR, exist_ok=True)
    
    print(f"Downloading {len(POWER_ICONS)} power icons to {OUTPUT_DIR}/")
    print("=" * 60)
    
    success = 0
    failed = 0
    
    for killer, url in POWER_ICONS.items():
        safe_name = killer.lower().replace(" ", "_").replace("'", "")
        filename = f"{safe_name}_power.png"
        filepath = os.path.join(OUTPUT_DIR, filename)
        
        # Skip if exists and has content
        if os.path.exists(filepath) and os.path.getsize(filepath) > 100:
            print(f"✓ {killer}: Already exists")
            success += 1
            continue
        
        print(f"→ {killer}...")
        if download_image(url, filepath):
            print(f"  ✓ Downloaded: {filename}")
            success += 1
        else:
            print(f"  ✗ Failed")
            failed += 1
        
        time.sleep(0.2)
    
    print("\n" + "=" * 60)
    print(f"Done! {success}/{len(POWER_ICONS)} icons downloaded")
    if failed > 0:
        print(f"Failed: {failed}")

if __name__ == "__main__":
    main()
