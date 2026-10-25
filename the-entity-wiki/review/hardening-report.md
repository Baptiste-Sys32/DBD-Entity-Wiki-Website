# Site hardening pass, 2026-10-26

Site search and runtime changes are implemented. Map articles are implemented in the Downloads preview and await the visual approval required by the site AGENTS.md before integration. The app is unchanged. Baseline: main at 3e1abe4.

## Search and correctness

Code: `web/index.html:4162` (scoring), `web/index.html:4313` (query parsing), `web/index.html:4442` (catalog cache), `web/index.html:13171` (cosmetic routing), `scripts/audit-cosmetics.js:87` (stable reports).

- Bare character names take entity priority over cosmetics. Baseline: Dwight cosmetic 163 versus survivor 123; Spirit cosmetic 138 versus killer 123. All 98 full character names and the four required character queries now put the character first without inflating raw scores. Cosmetic intent disables that priority.
- Explicit categories, roles, item types and rarities constrain results. There are no very-rare toolbox add-ons in the canonical data. `purple toolbox addons` therefore returns no results; `green toolbox addons` returns Grip Wrench and Hacksaw, and `purple toolbox items` returns the two very-rare toolboxes.
- Exact catalog titles bypass command-word interpretation, preserving Sole Survivor, No Mither and No One Left Behind. Role detection no longer disappears behind category detection, including scoped queries. Multiword character recognition no longer stops subsequent compound-rarity parsing.
- Known mechanics retain description intent instead of being mistaken for character typos. Description positions and a query-level prefix vocabulary replace repeated text scans. The catalog is memoized by its actual data dependencies. Repeated tags, aliases and perk metadata cannot stack unlimited bonuses.
- Random commands share exact character aliases, reject empty/ambiguous names and safely handle inherited dictionary keys. `random:sally` resolves to Nurse with matching add-ons. `random:the` and `random:constructor` return no command result. Random commands and filler-only queries bypass scoring.
- Cosmetic search previously opened the base character without forwarding the cosmetic focus ID. The routing callback now preserves it; the browser test clicks Trapper Mask and verifies the focused cosmetic.
- Empty substring checks in scoped lists are intentional browse-all behavior. Scoring retains explicit nonempty guards for full-query and alias bonuses.
- The cosmetic audit was stale (4357 versus 4387 ready entries). It now reflects the current catalog and preserves its timestamp when findings are unchanged.

## Maps, preview pending approval

The candidate follows the existing article layout: realm breadcrumb/link, map image, overview, layouts and existing modal, relevant releases, related maps and existing per-map notes. All 57 IDs work, with 47 canonical realm/name pairs. Search results, realm lists/articles and release articles link to maps. Duplicate IDs retain their note keys. The sitemap, route whitelist, mobile title and canonical/OG URL follow the same model. Unknown IDs have a clear fallback.

The preview browser checks cover every ID, correct canonical/title, image loading, desktop/mobile overflow, deep-link reload, note persistence, the layout modal, realm-to-map navigation and realm-name filtering. Existing spelling/article differences in release map names are resolved during joins, including generic Badham and RPD entries. No game data is changed. Historical timeline maps missing from the current database remain plain text rather than fabricated article links.

The layout usage audit covers all 57 records: 59 referenced paths, 30 byte-identical duplicate groups. Active files are 57 Hens layouts plus two Midwich floor plans. Steam contains 67 files / 41,244,589 bytes and no runtime references. Historical source archives are retained for a separate cleanup decision. The current Pages script uploads the whole web directory, so archives increase deployment storage while adding no layout browser requests. No sync script or source refresh was run. `review/map-layout-usage.json` is deterministic and reproducible with `node scripts/audit-map-layout-usage.js --check`.

## Measured runtime costs

Measurements and methodology are in `review/hardening-evidence.json` and `scripts/hardening-browser.py`. Local uncompressed HTTP, Chrome 156.0.8078.47, cache disabled, 1440px desktop and 390px mobile viewport with 4x CPU throttle. These are lab observations, not production network timings or real-device field metrics. App-root appearance is distinct from the loading-overlay paint. Search measurements time the actual scoring code through a test-only closure; the real input/effect and result navigation are also exercised.

| Metric | Before | After |
| --- | ---: | ---: |
| Desktop, app-root appearance | 7.10 s | 3.31 s |
| Desktop, worst scoring across 24 queries | 176 ms | 30 ms |
| Mobile viewport, 4x CPU, app-root appearance | 29.11 s | 14.51 s |
| Mobile viewport, 4x CPU, worst scoring across 24 queries | 707 ms | 120 ms |
| Inline script transpile, median of 3 runs | 4.64 s | 1.67 s |
| Desktop image bodies captured by root + 1 s | 1,458,564 bytes | 26,467 bytes |

All phases use the same test-only instrumentation. Cold local observations vary between runs. The mobile image window precedes the old idle preload, so it does not establish a mobile transfer saving. The inline transpile benchmark excludes the external engine scripts and is distinct from total page startup. JavaScript resource bodies remain 13,040,111 bytes; no metadata bundles were rewritten. Residual Babel, metadata parsing and rendering costs remain visible in the 14.51 s throttled startup.

Code: `web/index.html:43`. The preset retains JSX and newer-syntax transforms for module-capable browsers, avoiding the default ES5 target. Existing Tailwind already contains modern JavaScript syntax. Cosmetic image preloading is limited to the cosmetics view. The web directory stores 576,653,288 file bytes, including 552,357,811 image bytes; those images are not all downloaded by a visitor. The deployment script still includes the full directory. Generated data scripts remain unchanged.

## Deliberately deferred

- Map integration is pending the required approve/deny response to the Downloads previews. No map UI or sitemap changes are in the repo yet.
- In-browser Babel, runtime Tailwind and the large eagerly loaded metadata scripts remain. No framework migration or bundler was introduced. A separate proposal would precompile JSX with the vendored compiler, with explicit generated-file checks and offline verification, before any build workflow change is approved.
- Build/icon scoped filters remain local substring filters. For example, global `icons:exausted` finds Exhausted while the icon browser requires the correct substring. Unifying their search semantics needs a separate, scoped UX change rather than silently changing saved-build filtering.
- Global icon results overwrite their original icon category with GameIcon; the presentation then uses that value for a health/buff/debuff color lookup. This existing label/color issue is confirmed in source and deferred from this map preview, which does not approve icon presentation changes.
- Existing timestamped source-sync reports are retained as historical snapshots. Only the local usage audit and cosmetics audit were refreshed. The old map-layout audit date does not imply that current local coverage is missing.

## App-port proposal, no port performed

Confirmed with fixed-string searches on the app branch `modernize/vite-cap8`:

- App `the-entity-wiki/web/index.html`: 12,588 lines; no web/engine directory or engine script references.
- App `the-entity-wiki/web/index.html:4770` has an older Smart Search Engine, but no stemWord or MECHANIC_SYNONYMS definitions. At `the-entity-wiki/web/index.html:4897`, its role bonus compares item.role directly with context.role and misses the site type fallback.
- No SiteFooterContent component or calls exist in the app. The site renders it inside the home and search result flow.
- App `the-entity-wiki/web/index.html:11274` has MapDetailView and `the-entity-wiki/web/index.html:12467` has a map route using context.mapId. A site-style article port must adapt that contract and preserve old routes, notes and native behavior.

No data export is needed for this pass because canonical game content did not change. If explicitly requested later, propose separate UI work for search, map articles and footer behavior, preceded by an inventory of app-specific features. Do not copy the site index or engine wholesale. Native, build, version and release changes are excluded.

## Verification

Passed on the current repo source:

- `npm run check:data`
- `python3 scripts/smoke-test.py`: all 11 scenarios
- `DBD_WEB_ROOT=web node scripts/verify-offline-runtime.js`
- `node scripts/build-data.js --check`
- `node scripts/audit-map-layout-usage.js --check`
- `python3 scripts/hardening-browser.py --compare 3e1abe4 --transpile-benchmark --out review/hardening-evidence.json`: 24 queries, all 98 full character names, random commands, metadata bonus bounds, real input and cosmetic navigation

The 24-query result ranks and scores were unchanged by the alias/description cache optimization. Repeating the cosmetics audit leaves its report byte-identical. The staged map candidate additionally passes all 57 ID, canonical, image, notes, modal, realm navigation, invalid-route and responsive checks; its generated sitemap has exactly 47 map URLs. Full map integration remains explicitly pending approval.

No deploy, push, app edit, release build, version bump, game-data update or asset deletion was performed.
