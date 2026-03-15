import json
import os

# Paths
base_dir = os.path.dirname(os.path.abspath(__file__))
glossary_path = os.path.join(base_dir, 'glossary.json')
index_path = os.path.join(base_dir, 'web/index.html')

# Read new glossary data
with open(glossary_path, 'r') as f:
    glossary_data = json.load(f)

# Format as JS string (keeping it pretty)
new_glossary_js = "    const GLOSSARY = " + json.dumps(glossary_data, indent=4) + ";"

# Read index.html
with open(index_path, 'r') as f:
    lines = f.readlines()

# Find start and end
start_idx = -1
end_idx = -1

for i, line in enumerate(lines):
    if 'const GLOSSARY = [' in line:
        start_idx = i
        break

if start_idx != -1:
    # Find the end of the array (closing ];)
    # matching indentation or just the next ]; at the same level
    for i in range(start_idx, len(lines)):
        if lines[i].strip() == '];':
            end_idx = i
            break

if start_idx != -1 and end_idx != -1:
    print(f"Replacing lines {start_idx+1} to {end_idx+1}")
    
    # We replace the Range with new content
    # The new content is a string, we need to split it into lines
    new_lines = [l + '\n' for l in new_glossary_js.split('\n')]
    
    final_lines = lines[:start_idx] + new_lines + lines[end_idx+1:]
    
    with open(index_path, 'w') as f:
        f.writelines(final_lines)
    print("Successfully updated index.html")
else:
    print("Could not find GLOSSARY block in index.html")
    print(f"Start: {start_idx}, End: {end_idx}")
