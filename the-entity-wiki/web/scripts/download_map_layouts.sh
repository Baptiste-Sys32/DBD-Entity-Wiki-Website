#!/bin/bash
# Download map layout images from Dead by Daylight Fandom wiki

OUTPUT_DIR="/home/badeparday/Documents/projet-perso-application/the-entity-wiki/android/app/src/main/assets/public/dbd_images/map_layouts"
mkdir -p "$OUTPUT_DIR"

echo "=== Downloading Map Layout Images ==="
echo "Output: $OUTPUT_DIR"
echo ""

# Get all file page URLs from category
FILES=$(curl -s "https://deadbydaylight.fandom.com/wiki/Category:Map_outline_images" | \
    grep -oP 'href="/wiki/File:[^"]*Outline[^"]*\.png"' | \
    sed 's/href="//g' | sed 's/"//g' | sort -u)

count=0
total=$(echo "$FILES" | wc -l)

for file_path in $FILES; do
    ((count++))
    filename=$(basename "$file_path" | sed 's/_//g' | tr '[:upper:]' '[:lower:]')
    
    # Skip old versions
    if [[ "$filename" == *"old"* ]] || [[ "$filename" == *"1.0"* ]] || [[ "$filename" == *"2.0"* ]]; then
        echo "[$count/$total] Skipping old version: $filename"
        continue
    fi
    
    output_file="$OUTPUT_DIR/$filename"
    
    if [ -f "$output_file" ]; then
        echo "[$count/$total] Already exists: $filename"
        continue
    fi
    
    echo "[$count/$total] Downloading: $filename"
    
    # Get the file page to find direct image URL
    file_url="https://deadbydaylight.fandom.com$file_path"
    
    # Extract direct image URL from file page
    direct_url=$(curl -s "$file_url" | \
        grep -oP 'https://static\.wikia\.nocookie\.net/deadbydaylight_gamepedia_en/images/[^"]+Outline[^"]*\.png' | \
        head -1 | \
        sed 's|/revision/.*||' | \
        sed 's|/scale-to-width-down/[0-9]*||')
    
    if [ -z "$direct_url" ]; then
        echo "  ✗ Could not find direct URL"
        continue
    fi
    
    # Download the image
    if curl -s -o "$output_file" "$direct_url"; then
        size=$(stat -c%s "$output_file" 2>/dev/null || echo "?")
        echo "  ✓ Downloaded ($size bytes)"
    else
        echo "  ✗ Download failed"
        rm -f "$output_file"
    fi
    
    sleep 0.3
done

echo ""
echo "=== Done ==="
ls -la "$OUTPUT_DIR" | head -20
