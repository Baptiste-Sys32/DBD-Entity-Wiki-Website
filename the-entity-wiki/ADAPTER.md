# Wiki Engine — Game Adapter Contract

Single-file SPA (`web/index.html`) split into a game-agnostic **engine** and a
per-game **adapter**, sharing globals via `text/babel` script tags (no bundler).
Load order in `web/index.html`: `engine/*.js` → `games/<game>/config.js` →
game bundle (inline remainder of `index.html` + generated `web/*.js` data).

Rule: `engine/` must never contain game names, game mechanics, or game data.
Game specifics live in `games/<game>/`.

## Engine (`web/engine/`)

| File | Contents |
|---|---|
| `icons.js` | Generic SVG icon set (`Icons.*`). Game logos stay in the adapter. |
| `core.js` | Haptics gate, launch-context URL parsing, entity note keys. |
| `theme.js` | `COLOR_MODES`, generic rarity-glow helper. |
| `storage.js` | Namespaced `localStorage` helpers, ordered-list utilities. Key *prefixes* (`dbd_*_v1`) are adapter data via `STORAGE_KEYS`. |
| `device.js` | Device profile, pull-to-refresh, glass button, pull indicator. |
| `shell.js` | Search portal, app toolbar, section-drawer shell, header, crumbs, scroll-to-top FAB. Game *lists* come from adapter globals. |
| `articles.js` | Article kit (infobox/meta/toc/table primitives), lightbox, notes editor. |
| `engine.css` | All design tokens (`cx-*`), shell layout, launch overlay. |

## Adapter contract (`web/games/<game>/config.js`)

A game adapter MUST define (DBD values in `games/dbd/config.js`):

- **Brand/SEO**: `SEO_SUFFIX`, `SEO_DEFAULT_TITLE`, `SEO_SITE_BASE`, `SEO_VIEW_LABELS`
- **Navigation**: `ALL_NAV_OPTIONS` (`[{id,label}]`), `NAV_ICON_MAP`, `WEBSITE_NAV_SECTIONS`, `NAV_EXTRA_LABELS`, `getNavDisplayLabel(id)`, `MAIN_PAGE_TOOLS`, `BROWSE_SHORTLIST`, `ARTICLE_VIEWS`
- **Entities**: `FAVORITE_KEYS`, `resolveCharacterView(entity)`, `Meta` (`META`)
- **Settings**: `PROGRESSION_TABS`, `DEFAULT_SETTINGS`, `STORAGE_KEYS`
- **Taxonomy**: `RARITY_ORDER`, `getRarityOrder`, `getRarityColor`, `formatRarity`, `RARITY_ALIASES`
- **Store links**: `PLAY_STORE_LINKS`, `GOOGLE_PLAY_BADGES`

Adapter functions may only use engine globals + their own config + generated
data bundles at call time. Exception: `DEFAULT_SETTINGS` may spread adapter
consts defined earlier in the same file (e.g. `PROGRESSION_TABS`) — never
inline-`index.html` names (that breaks load order and kills boot).

## Data pipeline (per game)

`content/*.json` → `scripts/build-data.js` → `web/data.js` (+ `lore.js`,
`cosmetics.js`, `community-content.js`, `worldle-data.js`). `npm run check:data`
must stay green. Sitemap: `node scripts/build-sitemap.js [--check]
[--base <url>] [--views a,b,c] [--out <path>]` (defaults = DBD).

## Script classification

- **Generic, reuse unchanged**: `atomic-write.js`, `network-resilience.js`,
  `deploy-pages.sh`, `upload-r2-assets.sh`, `prepare-android-release-assets.js`
  (parameterize asset dir per game).
- **Config-driven, pass per-game args**: `build-data.js`, `build-sitemap.js`,
  `parity-check.js`, `verify-offline-runtime.js` (scans `web/engine/` +
  `web/games/` too), `sync-all-updates.js`, `audit-cosmetics.js`,
  `audit-achievements.js`, `generate-release-summary.js`.
- **DBD-specific, rewrite per game**: `sync-catalog-updates.js`,
  `sync-community-content.js`, `sync-descriptions.js`, `sync-game-icons.js`,
  `sync-map-layouts.js`, `sync-offering-fixes.js`, `normalize-images.js`,
  `normalize-cosmetics.js`, `discover-cosmetics.js`, `cosmetics-shared.js`,
  `verify-teachables.js`, `verify-perk-descriptions.js`,
  `verify-data-contracts.js`, `build-og-cover.py`.

## Verification gates (run after every extraction/seam)

1. `npm run check:data`
2. `python3 scripts/smoke-test.py` (11 scenarios)
3. `node scripts/verify-offline-runtime.js`
4. 10 headless screenshots (home/killer/perk/realm/timeline × phone/desktop)
   byte-compared against pristine baseline (see `git worktree` baseline flow)
5. `document.title` + canonical + `og:title` on entity and view URLs

## Known remaining DBD seams (Phase 4 work)

- SEO effect entity pools (`[killers, survivors, …]` + timeline releases) are
  still inline — needs a `resolveEntry(id)` adapter hook.
- Home search branches, `ListView` filters, all article/list views, worldle,
  roulette, builds, prestige math, progression tabs are DBD views (stay in the
  game bundle; R6 clones the closest analogues).
- `CharacterArticleView` killer-vs-survivor boolean stays view-local.
- `normalizeSettings`/`SettingsView` shape is DBD (favorites per DBD type).
- `scripts/` relocation under `games/dbd/scripts/` deferred until game #2.
