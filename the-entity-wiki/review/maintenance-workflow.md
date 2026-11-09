# Reviewed game-data update workflow

The website is authoritative. Android receives canonical data, generated data modules and referenced images only. Release versions and native files are independent.

## Discover without writes

Run from the website's the-entity-wiki directory:

```sh
node scripts/sync-all-updates.js --dry-run
node scripts/prepare-collection-update.js --collection 'Stranger Things Collection' --since 2026-10-07
node scripts/sync-map-layouts.js --dry-run --check
```

Discovery never promotes API data. A nonzero description-discovery exit can mean unresolved source templates, not a network failure. Read the diagnostic and retain local text. Catalog discovery currently covers new characters and their associated perks/powers/add-ons; ordinary items, maps, realms, offerings and lore still need source-backed comparison. Do not infer absence of changes from zero new characters.

Create a reviewed JSON manifest with asOf, operations and source provenance. Each operation specifies file, path, before and value. Path segments can select a stable entity, for example `['perks', {'id': 'stable-id'}, 'descriptionPost95']`. Sources require a URL, effective patch and live channel. PTB content stays outside the live database. Preserve historical perk descriptions.

Collection preparation accepts --prepare --manifest FILE to stage PNG artwork and append cosmetic operations. It does not change canonical cosmetics. Use a dated collection page or a --since cutoff, inspect every candidate, and check the labeled image gallery. Missing source dates with a cutoff are excluded. Character and file identity prevent same-name collisions. Linked sets retain their slot bindings.

## Review and promote

```sh
node scripts/sync-approved-update.js --manifest review/maintenance-update.json --dry-run
node scripts/sync-all-updates.js --apply --manifest review/maintenance-update.json
node scripts/sync-approved-update.js --manifest review/maintenance-update.json --check
```

Promotion validates staged documents, expected local values, duplicate IDs, source templates, required cosmetic fields and local image existence before writing. Each file is written atomically. This is not a transaction across files: after an interruption, rerun the same manifest and gates. Do not replace changed local values silently.

Approved modern perk changes update scripts/description-overrides.json. Description sync uses this versioned policy before API text and rejects an older override. Future official corrections should be expressed in a new reviewed manifest. Direct description apply remains blocked while any unresolved source template exists, including with --allow-unresolved.

Cosmetic counts derive from the resulting catalog. asOf gives deterministic collection timestamps. A repeated promotion must report zero changed fields. Optional community snapshots and historical layout-source refreshes cannot block a core game-data update.

## Verify and port

Run check:data, test:smoke, verify:offline, build-data --check, maintenance.test.js and targeted browser checks. maintenance-browser.py compares an immutable Git baseline with the current site, records three cold runs per CPU profile and captures affected surfaces. hardening-browser.py covers 24 queries and all 98 character names.

Use the website parity checker with --peer, and again with --local pointing at Android. It compares all shared canonical record fields, each generated payload against its own source, shared game metadata and referenced asset hashes. App/site release metadata and changelog histories intentionally differ. The older Android parity tool remains unchanged.

Port changed shared JSON and referenced images, update Android's dated metadata/changelog without a release bump, and regenerate using Android's existing build-data script. Never copy the website index, engine, tooling, native files or dist directory. Verify the staged file list before committing. Site main requires explicit push approval.


## Website runtime and map safeguards

Edit web/app.jsx, web/engine/*.js or web/games/dbd/config.js, then run node scripts/build-data.js. Never edit web/runtime output by hand. The already vendored Babel compiler precompiles classic scripts with the existing esmodules/react settings; it does not bundle modules. Generated script hashes in index.html prevent stale cached code after a data or UI update. build-data --check validates generated data, source/compiler hashes, script ordering and outputs without rewriting them. Keep the compiler vendored for regeneration, but do not load it in the browser.

Map/realm contracts are checked before promotion and by check:data. A map must have a stable unique ID, a valid realm name and membership in that realm's ID list. Identically named historical variants can retain distinct IDs. Do not infer map identity from an engine filename such as Ice_Level01. Use named source images and release evidence. audit-map-associations.js compares layout bytes with independently named sources, including pixel comparison for the legacy Midwich PNGs. Its three known drawing differences are pending visual review; do not automatically overwrite those assets. Images with immutable cache headers need new content-versioned filenames when replacements are approved.
