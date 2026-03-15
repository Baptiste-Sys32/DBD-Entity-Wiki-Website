#!/bin/bash
# Download high-quality map layouts from hens333.com
# Uses proper URL encoding and headers

OUTPUT_DIR="/home/badeparday/Documents/projet-perso-application/the-entity-wiki/android/app/src/main/assets/public/dbd_images/map_layouts"
OUTPUT_DIR_WEB="/home/badeparday/Documents/projet-perso-application/the-entity-wiki/web/dbd_images/map_layouts"
BASE_URL="https://hens333.com/img/dbd/callouts"

echo "=== Downloading High-Quality Map Layouts from hens333.com ==="
echo ""

# Clear old webp files (keep png as backup)
rm -f "$OUTPUT_DIR"/*.webp 2>/dev/null
rm -f "$OUTPUT_DIR_WEB"/*.webp 2>/dev/null

download_map() {
    local remote="$1"
    local local_name="$2"
    
    curl -s -f -L -H "Accept: image/webp,*/*" -H "User-Agent: Mozilla/5.0" \
        -o "$OUTPUT_DIR/$local_name" "$BASE_URL/$remote"
    
    if [ $? -eq 0 ]; then
        cp "$OUTPUT_DIR/$local_name" "$OUTPUT_DIR_WEB/$local_name"
        echo "  ✓ $(stat -c%s "$OUTPUT_DIR/$local_name") bytes"
        return 0
    else
        echo "  ✗ Failed"
        return 1
    fi
}

count=0
success=0

# MacMillan Estate
echo "[MacMillan Estate]"
for map in "Coal Tower" "Coal Tower II" "Groaning Storehouse" "Groaning Storehouse II" \
    "Ironworks of Misery" "Ironworks of Misery II" "Shelter Woods" "Shelter Woods II" \
    "Suffocation Pit" "Suffocation Pit II"; do
    ((count++))
    local_name=$(echo "$map" | tr '[:upper:]' '[:lower:]' | tr ' ' '-').webp
    echo -n "  $map -> $local_name: "
    download_map "McMillan/${map// /%20}.webp" "$local_name" && ((success++))
done

# Autohaven Wreckers
echo "[Autohaven Wreckers]"
for map in "Azarovs Resting Place" "Azarovs Resting Place II" "Blood Lodge" "Blood Lodge II" \
    "Gas Heaven" "Gas Heaven II" "Wreckers Yard" "Wreckers Yard II" \
    "Wretched Shop" "Wretched Shop II"; do
    ((count++))
    local_name=$(echo "$map" | tr '[:upper:]' '[:lower:]' | tr ' ' '-').webp
    echo -n "  $map -> $local_name: "
    download_map "Azarovs/${map// /%20}.webp" "$local_name" && ((success++))
done

# Coldwind Farm
echo "[Coldwind Farm]"
for map in "Fractured Cowshed" "Fractured Cowshed II" "Rancid Abattoir" "Rancid Abattoir II" \
    "Rotten Fields" "Rotten Fields II" "Thompson House" "Thompson House II" \
    "Torment Creek" "Torment Creek II"; do
    ((count++))
    local_name=$(echo "$map" | tr '[:upper:]' '[:lower:]' | tr ' ' '-').webp
    echo -n "  $map -> $local_name: "
    download_map "Coldwind/${map// /%20}.webp" "$local_name" && ((success++))
done

# Crotus Prenn Asylum
echo "[Crotus Prenn Asylum]"
for map in "Disturbed Ward" "Disturbed Ward II" "Father Campbells Chapel" "Father Campbells Chapel II"; do
    ((count++))
    local_name=$(echo "$map" | tr '[:upper:]' '[:lower:]' | tr ' ' '-').webp
    echo -n "  $map -> $local_name: "
    download_map "Crotus%20Prenn/${map// /%20}.webp" "$local_name" && ((success++))
done

# Backwater Swamp
echo "[Backwater Swamp]"
for map in "Grim Pantry" "Grim Pantry II" "Pale Rose" "Pale Rose II"; do
    ((count++))
    local_name=$(echo "$map" | tr '[:upper:]' '[:lower:]' | tr ' ' '-').webp
    echo -n "  $map -> $local_name: "
    download_map "Swamp/${map// /%20}.webp" "$local_name" && ((success++))
done

# Yamaoka Estate
echo "[Yamaoka Estate]"
for map in "Family Residence" "Family Residence II" "Sanctum of Wrath" "Sanctum of Wrath II"; do
    ((count++))
    local_name=$(echo "$map" | tr '[:upper:]' '[:lower:]' | tr ' ' '-').webp
    echo -n "  $map -> $local_name: "
    download_map "Yamaoka/${map// /%20}.webp" "$local_name" && ((success++))
done

# Red Forest  
echo "[Red Forest]"
for map in "Mothers Dwelling" "Mothers Dwelling II" "Temple of Purgation" "Temple of Purgation II"; do
    ((count++))
    local_name=$(echo "$map" | tr '[:upper:]' '[:lower:]' | tr ' ' '-').webp
    echo -n "  $map -> $local_name: "
    download_map "Red%20Forest/${map// /%20}.webp" "$local_name" && ((success++))
done

# Haddonfield
echo "[Haddonfield]"
for map in "Lampkin Lane" "Lampkin Lane II"; do
    ((count++))
    local_name=$(echo "$map" | tr '[:upper:]' '[:lower:]' | tr ' ' '-').webp
    echo -n "  $map -> $local_name: "
    download_map "Haddonfield/${map// /%20}.webp" "$local_name" && ((success++))
done

# Gideon Meat Plant
echo "[Gideon Meat Plant]"
for map in "The Game Lower" "The Game Upper"; do
    ((count++))
    local_name=$(echo "$map" | tr '[:upper:]' '[:lower:]' | tr ' ' '-').webp
    echo -n "  $map -> $local_name: "
    download_map "Gideon/${map// /%20}.webp" "$local_name" && ((success++))
done

# Silent Hill (Midwich)
echo "[Silent Hill]"
for map in "Midwich Elementary School Lower" "Midwich Elementary School Upper"; do
    ((count++))
    local_name=$(echo "$map" | tr '[:upper:]' '[:lower:]' | tr ' ' '-').webp
    echo -n "  $map -> $local_name: "
    download_map "Midwich/${map// /%20}.webp" "$local_name" && ((success++))
done

# Ormond
echo "[Ormond]"
for map in "Mount Ormond Resort" "Mount Ormond Resort II"; do
    ((count++))
    local_name=$(echo "$map" | tr '[:upper:]' '[:lower:]' | tr ' ' '-').webp
    echo -n "  $map -> $local_name: "
    download_map "Ormond/${map// /%20}.webp" "$local_name" && ((success++))
done

# Raccoon City
echo "[Raccoon City]"
for map in "Rpd Main" "Rpd Main II" "Rpd East Wing" "Rpd East Wing II" "Rpd West Wing" "Rpd West Wing II"; do
    ((count++))
    local_name=$(echo "$map" | tr '[:upper:]' '[:lower:]' | tr ' ' '-').webp
    echo -n "  $map -> $local_name: "
    download_map "Raccoon%20City/${map// /%20}.webp" "$local_name" && ((success++))
done

# Dead Dawg (Grave of Glenvale)
echo "[Grave of Glenvale]"
for map in "Dead Dawg Saloon" "Dead Dawg Saloon II"; do
    ((count++))
    local_name=$(echo "$map" | tr '[:upper:]' '[:lower:]' | tr ' ' '-').webp
    echo -n "  $map -> $local_name: "
    download_map "Other/${map// /%20}.webp" "$local_name" && ((success++))
done

# Withered Isle (Garden of Joy)
echo "[Withered Isle]"  
for map in "Garden of Joy" "Garden of Joy II"; do
    ((count++))
    local_name=$(echo "$map" | tr '[:upper:]' '[:lower:]' | tr ' ' '-').webp
    echo -n "  $map -> $local_name: "
    download_map "Withered%20Isle/${map// /%20}.webp" "$local_name" && ((success++))
done

# Lery's Memorial Institute
echo "[Lery's Memorial Institute]"
for map in "Treatment Theater" "Treatment Theater II"; do
    ((count++))
    local_name=$(echo "$map" | tr '[:upper:]' '[:lower:]' | tr ' ' '-').webp
    echo -n "  $map -> $local_name: "
    download_map "Lerys/${map// /%20}.webp" "$local_name" && ((success++))
done

# Hawkins
echo "[Hawkins]"
map="Underground Complex"
((count++))
local_name=$(echo "$map" | tr '[:upper:]' '[:lower:]' | tr ' ' '-').webp
echo -n "  $map -> $local_name: "
download_map "Hawkins/${map// /%20}.webp" "$local_name" && ((success++))

# Badham
echo "[Badham Preschool]"
for map in "Badham Preschool I" "Badham Preschool II" "Badham Preschool III" "Badham Preschool IV" "Badham Preschool V"; do
    ((count++))
    local_name=$(echo "$map" | tr '[:upper:]' '[:lower:]' | tr ' ' '-').webp
    echo -n "  $map -> $local_name: "
    download_map "Badham/${map// /%20}.webp" "$local_name" && ((success++))
done

# Forsaken Boneyard (Eyrie of Crows)
echo "[Forsaken Boneyard]"
for map in "Eyrie of Crows" "Eyrie of Crows II"; do
    ((count++))
    local_name=$(echo "$map" | tr '[:upper:]' '[:lower:]' | tr ' ' '-').webp
    echo -n "  $map -> $local_name: "
    download_map "Boneyard/${map// /%20}.webp" "$local_name" && ((success++))
done

# Dead sands too
map="Dead Sands"
((count++))
local_name=$(echo "$map" | tr '[:upper:]' '[:lower:]' | tr ' ' '-').webp
echo -n "  $map -> $local_name: "
download_map "Boneyard/${map// /%20}.webp" "$local_name" && ((success++))

# Borgo
echo "[Decimated Borgo]"
for map in "Decimated Borgo" "Decimated Borgo II"; do
    ((count++))
    local_name=$(echo "$map" | tr '[:upper:]' '[:lower:]' | tr ' ' '-').webp
    echo -n "  $map -> $local_name: "
    download_map "Borgo/${map// /%20}.webp" "$local_name" && ((success++))
done

# Dvarka Deepwood (Toba Landing)
echo "[Dvarka Deepwood]"
for map in "Toba Landing" "Toba Landing II"; do
    ((count++))
    local_name=$(echo "$map" | tr '[:upper:]' '[:lower:]' | tr ' ' '-').webp
    echo -n "  $map -> $local_name: "
    download_map "Dvarka/${map// /%20}.webp" "$local_name" && ((success++))
done

echo ""
echo "=== Summary ==="
echo "Success: $success / $count"
