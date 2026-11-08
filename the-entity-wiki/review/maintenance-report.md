# DBD maintenance, November 8, 2026

Website base: 85e809a, preserving the existing local search hardening commit. Shared canonical game data was still at October 7 / 10.2.0. Research and implementation were limited to the two renamed DBD repos. No release build, native change, versionCode/versionName bump, deploy or website push was performed.

## Applied content

The reviewed field-level manifest is maintenance-update.json. It records 57 operations, including 38 cosmetic records and their existing schemas, images, character identities and source URLs. Promotion now reports zero changes on a repeat run.

- Dark Arrogance: all basic-attack cooldowns are 10% shorter, with 15/20/25% faster vaults and the 25% blind/stun penalty. Historical text is preserved. Source: https://forums.bhvr.com/dead-by-daylight/kb/articles/562-10-2-2-bugfix-patch
- Executioner: 16 m Punishment range; 8 trail charges; 0.5 charges/s recharge; 0.8 s activation; 1.2 s cancellation; 0.25 s initial spawn; 0.001 s segment delay; 0.3 s segment lifetime. Good Guy: 10 s cooldown, 2 s maximum dash and 0.8 s vault. Guide and mechanics JSON reflect the backend update. Source: https://steamcommunity.com/games/381210/announcements/detail/692024563197805375
- Corrected Abandon/Surrender and End Trial glossary conditions; recorded the November 5-12 Lights Out event. Sources: the official 10.2.1 and 10.2.2 patch notes.
- Updated Void Crystal's 2026 smoke and remote-generator-repair mechanics. Source: https://deadbydaylight.wiki.gg/wiki/Haunted_by_Daylight_2026
- Cosmetics: Sugar Rush, Zombie, Esq, Ghost Face Dia De Los Muertos, Panic At Prenn, Sexy Beast, Tactical Babysitter, Curse Lifter and Battle Ready; 24 associated pieces; six standalone Halloween rewards. Curse Lifter is linked. Steve's Brown Slacks is separate from Dwight's identically named piece. Sources: Haunted by Daylight 2026 and Stranger Things Collection inventories.
- The 38 PNGs total 4,279,717 bytes. All load in the labeled gallery. The catalog now has 4,425 ready records.
- Client gameVersion is 10.2.2; backend 10.2.2a is documented separately. Website release remains 5.34.2; Android remains 5.34.1 / versionCode 48.

No new live roster/map/realm was established. Diablo's six outfits were already present. Terrifier is future/PTB content with an official November 24 release and was excluded.

## Pipeline and correctness

Six inline datasets now load from canonical generated modules. This restores glossary updates previously absent from the actual website and prevents future JSON-only changes from leaving stale visible guides. Existing inline Blight speed was 4.6 m/s while canonical JSON said 4.4; canonical data now preserves the site's 4.6 behavior.

Discovery defaults are read-only. Applying the orchestrated update requires a reviewed manifest. Raw API templates are rejected before writes; the current API still leaves placeholders in Boil Over, Sloppy Butcher and Windows of Opportunity. Official description overrides are versioned and protect the newer Dark Arrogance text. Collection parsing covers expanded and standalone pieces and linked-set metadata. PNG signatures are checked before asset writes. Network handling now bounds redirects, resolves relative redirects, honors bounded Retry-After delays and keeps the timeout active through body consumption.

The authoritative parity checker now compares complete shared records and asset hashes and verifies generated payloads against each repo's own canonical JSON. Metadata/changelog differences are intentional. Android tooling and UI were not ported. Required secret-ignore coverage was added to the app separately from its data commit.

Fixed site bugs: global icon results preserve their original category for label/color; historical character releases no longer claim the current game patch was their release patch. Search priority already existed and was retained. Empty, malformed and random commands and score-bonus bounds remain covered by the rank harness.

## Measured performance

maintenance-evidence.json contains raw results. Three cold runs per profile, local uncompressed HTTP, cache disabled, 1440px desktop and 390px mobile viewport with 4x CPU throttle. These are lab timings, not production field metrics.

| Metric | Before median | After median |
| --- | ---: | ---: |
| Desktop app-root appearance | 3,079 ms | 3,023 ms |
| 4x CPU app-root appearance | 12,244 ms | 11,882 ms |
| Desktop worst scoring over 24 queries | 40.3 ms | 35.2 ms |
| 4x CPU worst scoring over 24 queries | 126.3 ms | 127.2 ms |
| Desktop maximum startup task | 2,322 ms | 2,255 ms |
| 4x CPU maximum startup task | 9,734 ms | 9,326 ms |
| Desktop initial image bodies | 26,467 bytes | 26,467 bytes |
| 4x CPU initial image bodies | 12,469 bytes | 12,469 bytes |

The small startup difference does not establish a meaningful speedup. JavaScript resource bodies increased from 13,040,111 to 13,340,440 bytes as inline datasets became ordinary modules and content grew; HTML became smaller. Images stored on disk are not all downloaded at startup.

Current inline transpile samples with the existing wiki preset were 1,592 / 1,570 / 1,733 ms. The comparison env+react preset took 4,644 / 4,385 / 4,180 ms. No preset change was made in this pass. Runtime compilation remains a substantial CPU cost.

A separate DevTools trace reported loading-screen LCP 613 ms and CLS 0.08. LCP here describes the loading screen, not a usable app. Adding image dimensions alone did not improve the shift in a follow-up trace, so that trial was reverted. Local-server compression/cache recommendations were not applied as production hosting changes.

## Maps and deferred findings

Map article UI is implemented and tested in the refreshed Downloads preview, pending the required visual approval. All 57 IDs, 47 canonical groups, invalid routes, layouts, notes, realm links and responsive checks pass. Website main currently does not include that map UI.

The local layout usage audit finds 59 referenced paths and no missing local files across the 57 IDs. This establishes file availability, not semantic correctness. Active sources are Hens callouts plus two legacy Midwich floor plans. The unreferenced Steam archive is 41,244,589 bytes; it increases deployment storage but creates no runtime layout requests. Archives were retained. A dry-run source check finds 58 Hens callouts and no unmatched map names. The requested deeper association/image-content audit follows this maintenance commit.

Deferred with evidence/reasons:

- The API offers 29 perk wording candidates and a Refined Serum omission. Unresolved macros, stale official values and conflicting durations prevent blind promotion. Bada Bada Boom remains at the local six seconds supported by its original official release note. Hex: Scared to Death's radius discrepancy remains flagged for a separately corroborated correction.
- Older anniversary items, Searcher's Pendant and historical cosmetic components are coverage gaps, not established post-cutoff releases. Unsupported badges/banners/charms need a separate content/UI decision.
- Build/icon scoped substring filters differ from global smart search. For example, a global typo can match Exhausted while the local icon filter misses it. Unifying the semantics needs a scoped shared-query design; saved-build filtering was not silently changed.
- Existing Boots of {0} is an older unresolved item name. It was not guessed from the incomplete source.
- Runtime Babel and runtime Tailwind remain. A separate performance proposal can precompile with the already vendored compiler and verify generated output, without a framework migration. No new build workflow was introduced here.
- Historical source reports are retained. The local map usage and cosmetic audits are deterministic; a stale source-report timestamp alone is not evidence of missing runtime coverage.

## Verification and app port

Website: all four required gates passed; 11 smoke scenarios; 24 search queries and all 98 full character names; updated perk/killer browser assertions; all 38 new images; three failure-path/parser/network tests. The map preview independently passed all map-specific checks. Description source discovery intentionally rejects the three unresolved template sources without writes. Repeated collection discovery adds zero already imported entries.

Android: check:data including content coverage, its existing 10 smoke scenarios, offline runtime and generated-bundle freshness passed. The website parity checker passed in both directions, including referenced asset hashes. App native versions and UI are unchanged. Initial data port commit 329c9fd was pushed to modernize/vite-cap8; no force push was used.

Screenshots and the contact sheet are in ~/Downloads/dbd-maintenance-evidence/. Map previews are in ~/Downloads/dbd-maintenance-preview/screenshots/. The browser harnesses can reproduce them. App search, footer, engine and map article drift remains a separate UI-port proposal; copying the site index or engine is excluded.
