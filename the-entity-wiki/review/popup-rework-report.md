# Approved popup and reference UI rework

Visual preview approved for integration and Cloudflare deployment on November 9, 2026.

## Changes

- Map viewer: article typography and thin rules, larger desktop drawing with overview/notes sidebar, full-height mobile dialog, variation/floor controls and zoom/fit. Existing map IDs, art and personal notes retained.
- Game icons: categorized reference list, compact icon grid, accessible disclosures, search/category counts and matching icon-reference popup. Existing descriptions and advice retained.
- Perk comparison and image previews: shared reference-dialog style, horizontal comparison on narrow screens, explicit close/remove controls and a flat selection bar.
- Dialogs render above mobile chrome, name themselves for assistive technology, make the background inert, contain keyboard focus, close with Escape/backdrop and restore focus to the opener.
- Reproduced long-press comparison selecting a perk and also navigating into its article. A stable ref preserves gesture state across rerenders and guards article/image activation. Explicit Compare buttons provide a normal-click and keyboard alternative.
- Stylesheet content hashes, alongside script hashes, prevent a freshly deployed page using stale CSS. Freshness checks reject modified CSS without rewriting output.

## Scope

Website only. No Android UI/engine/native changes, game-data modifications, release-version bump or release build. This integrates the approved popup preview. The separate map article proposal and three replacement map drawings remain outside the repo.

## Verification

Required data, smoke, offline-runtime and generated-bundle gates; maintenance unit tests including CSS cache freshness; popup-browser.py on desktop and mobile with 4x CPU throttling. Targeted checks cover layout variations, zoom, local note persistence, visible close controls, focus containment/restoration, Escape, icon modes/disclosures/filters/empty reset, four-perk comparison/removal and image previews. Actual Light setting and persisted palette were checked through the settings UI. Separate real-input checks exercised image clicks, long-press selection, explicit Compare, the comparison bar, Midwich floors and blocked-layout recovery.

Run the popup checks against a local or deployed site:

```sh
python3 scripts/popup-browser.py --base http://127.0.0.1:8893 --out /tmp/dbd-popup-check
```

The CI parity checkout explicitly uses the Android data-port branch modernize/vite-cap8; its default branch does not contain the current canonical metadata. Both public repositories are accessible to the existing workflow token.

The existing GitHub Actions workflow uploads committed web output to the entity-wiki Pages production branch after a main push. Deployment status and actual live HTML/assets and browser behavior must be verified after publication.
