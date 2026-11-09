# DBD maintenance, November 9, 2026

Website base: 85e809a, preserving the existing local search hardening commit. Shared canonical game data was still at October 7 / 10.2.0. Research and implementation were limited to the two renamed DBD repos. No release build, native change, versionCode/versionName bump, deploy or website push was performed.

## Applied content

The reviewed field-level manifest is maintenance-update.json. It records 57 operations, including 38 cosmetic records and their existing schemas, images, character identities and source URLs. The initial promotion reported zero changes on a repeat run. Later dated map bookkeeping supersedes that manifest's metadata; use the new map manifest for the follow-up rather than reapplying the old metadata.

- Dark Arrogance: all basic-attack cooldowns are 10% shorter, with 15/20/25% faster vaults and the 25% blind/stun penalty. Historical text is preserved. Source: https://forums.bhvr.com/dead-by-daylight/kb/articles/562-10-2-2-bugfix-patch
- Executioner: 16 m Punishment range; 8 trail charges; 0.5 charges/s recharge; 0.8 s activation; 1.2 s cancellation; 0.25 s initial spawn; 0.001 s segment delay; 0.3 s segment lifetime. Good Guy: 10 s cooldown, 2 s maximum dash and 0.8 s vault. Guide and mechanics JSON reflect the backend update. Source: https://steamcommunity.com/games/381210/announcements/detail/692024563197805375
- Corrected Abandon/Surrender and End Trial glossary conditions; recorded the November 5-12 Lights Out event. Sources: the official 10.2.1 and 10.2.2 patch notes.
- Updated Void Crystal's 2026 smoke and remote-generator-repair mechanics. Source: https://deadbydaylight.wiki.gg/wiki/Haunted_by_Daylight_2026
- Cosmetics: Sugar Rush, Zombie, Esq, Ghost Face Dia De Los Muertos, Panic At Prenn, Sexy Beast, Tactical Babysitter, Curse Lifter and Battle Ready; 24 associated pieces; six standalone Halloween rewards. Curse Lifter is linked. Steve's Brown Slacks is separate from Dwight's identically named piece. Sources: Haunted by Daylight 2026 and Stranger Things Collection inventories.
- The 38 PNGs total 4,279,717 bytes. All load in the labeled gallery. The catalog now has 4,425 ready records.
- Client gameVersion is 10.2.2; backend 10.2.2a is documented separately. Website release remains 5.34.2; Android remains 5.34.1 / versionCode 48.

No newly released live roster/map/realm was established. A later approved historical repair restores Dead Sands, released in 8.6.0, and removes a stale Backwater Swamp reference; this is not November content. Diablo's six outfits were already present. Terrifier is future/PTB content with an official November 24 release and was excluded.

## Pipeline and correctness

Six inline datasets now load from canonical generated modules. This restores glossary updates previously absent from the actual website and prevents future JSON-only changes from leaving stale visible guides. Existing inline Blight speed was 4.6 m/s while canonical JSON said 4.4; canonical data now preserves the site's 4.6 behavior.

Discovery defaults are read-only. Applying the orchestrated update requires a reviewed manifest. Raw API templates are rejected before writes; the current API still leaves placeholders in Boil Over, Sloppy Butcher and Windows of Opportunity, plus three GasBomb add-on localization keys. The final discovery check rejected all six without writing. Official description overrides are versioned and protect the newer Dark Arrogance text. Collection parsing covers expanded and standalone pieces and linked-set metadata. PNG signatures are checked before asset writes. Network handling now bounds redirects, resolves relative redirects, honors bounded Retry-After delays and keeps the timeout active through body consumption.

The authoritative parity checker now compares complete shared records and asset hashes and verifies generated payloads against each repo's own canonical JSON. Metadata/changelog differences are intentional. Android tooling and UI were not ported. Required secret-ignore coverage was added to the app separately from its data commit.

Fixed site bugs: global icon results preserve their original category for label/color; historical character releases no longer claim the current game patch was their release patch. Search priority already existed and was retained. Empty, malformed and random commands and score-bonus bounds remain covered by the rank harness.

## Measured performance

The final runtime comparison is runtime-evidence.json. Three cold runs per profile, local uncompressed HTTP, cache disabled, 1440px desktop and 390px mobile viewport with 4x CPU throttle. These are lab timings, not production field metrics. App-root appearance does not imply the loading overlay has disappeared.

| Metric | Before median | After median |
| --- | ---: | ---: |
| Desktop app-root appearance | 2,948 ms | 460 ms |
| 4x CPU app-root appearance | 11,576 ms | 1,193 ms |
| Desktop worst scoring over 24 queries | 46.6 ms | 34.1 ms |
| 4x CPU worst scoring over 24 queries | 119.4 ms | 119.2 ms |
| Desktop maximum startup task | 2,206 ms | 248 ms |
| 4x CPU maximum startup task | 9,050 ms | 822 ms |
| JavaScript resource bodies | 13,340,443 bytes | 11,137,507 bytes |
| Desktop initial image bodies | 26,467 bytes | 26,467 bytes |
| 4x CPU initial image bodies | 12,469 bytes | 12,469 bytes |

The measured bottleneck was browser-side Babel compilation. The existing vendored compiler now generates ten classic scripts with the same target/presets, without bundling or adding dependencies. Author JSX is web/app.jsx; HTML is a shell; web/runtime is generated. build-data generates/checks both canonical data and runtime scripts. Source/compiler/output hashes and content-versioned script URLs protect freshness and script caching. Tests reject stale source without rewriting outputs. Authored engine files remain the source of truth. Android does not receive these website files.

Real 50 ms-per-character mobile typing was measured separately. Original final-key-to-results samples ranged from 38 to 400 ms. An 80 ms debounce plus memoized cards reduced repeated work on the long query but increased final latency (139-704 ms in the isolated run). Memoization alone gave 50-376 ms but increased long tasks for the longest query from 32 to 52. Both experiments were reverted. Scoring remains about 119 ms in the repeated throttled benchmark; no typing speedup is claimed. Evidence retains the original and rejected experiments. These lab timings are not field INP.

A separate earlier DevTools trace reported loading-screen LCP 613 ms and CLS 0.08. LCP described the loading screen, not a usable app. An image-dimension trial did not improve the shift and was reverted. Runtime Tailwind remains a measured limitation; no framework/build-system migration was introduced.

## Maps and additional correctness

The approved two-operation map-corrections.json has been applied and reports zero changes on a repeat run. Dead Sands uses its existing realm ID, image and layout. The Ice_Level01 filename is the source asset's internal name; its pixels and documented identity are desert Dead Sands. Backwater Swamp now references its two extant map records. Its removed UUID was dangling since the initial import; identification with the API's unreleased placeholder is not proven.

There are now 58 map records and 48 unique realm/name groups. A shared map contract catches duplicate IDs/references, malformed realm lists, missing map references, wrong-realm placement and orphan maps, both before manifest promotion and in check:data. Duplicate display names with distinct stable IDs remain allowed.

The source association audit compares every reachable layout with independently named source files: 53 map records match the named Hens source, three differ, and the two Midwich floor images are pixel-identical to their wiki sources despite different file hashes. The three differences are Freddy Fazbear's Pizza, Fallen Refuge and Disturbed Ward. Visual comparison shows older drawings/style/orientation, not a confirmed map swap. Replacement artwork remains staged outside the repo pending visual approval. The source audit deliberately exits nonzero while those three differences remain; all required application gates pass.

The layout usage audit resolves all 58 IDs through 59 referenced paths. The unused Steam archive is 41,244,589 bytes, adding deployment storage but no initial browsing transfers. Historical archives and stable alias IDs are retained. The sync check is genuinely read-only, checks every variation rather than just the first existing image, and records the source's Badham IV label typo without modifying unrelated labels.

Map article UI remains outside the repo pending visual approval. The refreshed candidate passes all 58 IDs, 48 canonical groups, invalid routes, notes, layouts, realm links and mobile checks. Website main still uses its existing realm and modal UI. The approved Dead Sands data is browser-verified in that actual UI, not merely in the candidate.

Fixed a reproduced article-to-home footer crash: cleanup removed the newly mounted React-owned footer, causing removeChild failures when searching. Cleanup now removes only the footer node it injected. The browser regression exercises article, home, then Dwight search and verifies the footer remains. Before/after screenshots and reproduction JSON are retained.

Deferred with evidence/reasons:

- The API offers 29 perk wording candidates and a Refined Serum omission. Unresolved macros, stale official values and conflicting durations prevent blind promotion. Bada Bada Boom remains at the local six seconds supported by its original official release note. Hex: Scared to Death's radius discrepancy remains flagged for a separately corroborated correction.
- Older anniversary items, Searcher's Pendant and historical cosmetic components are coverage gaps, not established post-cutoff releases. Unsupported badges/banners/charms need a separate content/UI decision.
- Build/icon scoped substring filters differ from global smart search. For example, a global typo can match Exhausted while the local icon filter misses it. Unifying the semantics needs a scoped shared-query design; saved-build filtering was not silently changed.
- Existing Boots of {0} is an older unresolved item name. It was not guessed from the incomplete source.
- Runtime Tailwind remains. Browser Babel has been removed through the verified vendored-compiler workflow described above. Further search scheduling/rendering work is deferred because the tested changes did not consistently improve measured behavior.
- The achievement audit reads canonical JSON after extraction: 295 unique IDs, with five historical numbering holes at 156-160. Numbering alone does not establish missing released achievements, so no records were invented.
- Historical source reports are retained. The local map usage and cosmetic audits are deterministic; a stale source-report timestamp alone is not evidence of missing runtime coverage.

## Verification and app port

Website: all four required gates passed; 11 smoke scenarios; 24 search queries and all 98 full character names; updated perk/killer browser assertions; all 38 new images; seven runtime, map-contract, parser, staging and network tests. The map preview independently passed all map-specific checks. Approved map data also passes search-to-realm-to-layout browser checks on desktop and mobile in the actual site. Description source discovery intentionally rejects the six unresolved perk/add-on template sources without writes. Repeated collection discovery adds zero already imported entries.

Android: check:data including content coverage, its existing 10 smoke scenarios, offline runtime and generated-bundle freshness passed. The website parity checker passed in both directions, including referenced asset hashes. App native versions and UI are unchanged. Initial data port commits 329c9fd and aa930c7 were pushed to modernize/vite-cap8; the approved map correction is committed and pushed as 8fb8a02. No force push is used.

Screenshots and the contact sheet are in ~/Downloads/dbd-maintenance-evidence/. Runtime and actual map correction evidence is in ~/Downloads/dbd-runtime-final/. The pending combined map preview is in ~/Downloads/dbd-map-association-review/data-preview/; the three drawing comparisons are in its parent folder. The browser harnesses can reproduce them. App search, footer, engine and map article drift remains a separate UI-port proposal; copying the site index or engine is excluded.


## App UI proposal, not ported

Exact source-marker checks confirm Android has no web/engine directory, stemWord, characterIntent, descriptionVocabulary, SiteFooterContent, injectedFooter or iconCategory. Its older Smart Search Engine exists but lacks the website's stemming/indexed description search and character-priority logic. Its role scoring still compares item.role directly with the parsed context rather than normalizing the character type. Android already has case 'map' and MapDetailView; copying the website article code would overwrite a different existing UI. A future explicitly requested UI port should adapt and browser-test search, role normalization, icon categories, footer behavior and article navigation independently. The website's compiled runtime workflow must also be adapted to Android's own pipeline, never copied as a data bundle. No such UI/engine/native changes were made here.
