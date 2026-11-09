#!/usr/bin/env node
// Compare every reachable map/variant against the source's independently named
// asset, rather than treating an existing local file as proof of correctness.
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const crypto = require('crypto');
const { spawnSync } = require('child_process');
const { getImageInfo } = require('./cosmetics-shared');
const { fetchTextWithRetry, fetchBinaryWithRetry, fetchJsonWithRetry } = require('./network-resilience');
const { parseHensCallouts, buildMapCandidates, normalizeKey, encodePathSegments } = require('./sync-map-layouts');
const ROOT = path.resolve(__dirname, '..');
const WEB = path.join(ROOT, 'web');
const SOURCE = 'https://hens333.com/callouts';
const IMAGE_BASE = 'https://hens333.com/img/dbd/callouts/';
const hash = bytes => crypto.createHash('sha256').update(bytes).digest('hex');

async function main() {
  const args = process.argv.slice(2);
  const stageIndex = args.indexOf('--stage');
  const stageRoot = stageIndex === -1 ? null : path.resolve(args[stageIndex + 1] || '');
  if (stageIndex !== -1 && (!args[stageIndex + 1] || args[stageIndex + 1].startsWith('--'))) throw new Error('--stage requires a directory');
  const html = require('./web-source').readUiSource();
  const start = html.indexOf('const MAP_LAYOUTS =');
  const end = html.indexOf('const GAME_ICONS =', start);
  if (start < 0 || end < 0) throw new Error('Missing map layout registry');
  const registry = vm.runInNewContext(html.slice(start, end) + ';({ layouts: MAP_LAYOUTS, resolve: getMapLayoutsForName })', {}, { timeout: 3000 });
  const database = require('../content/database.json');
  const options = { timeoutMs: 15000, retries: 2, headers: { 'user-agent': 'Mozilla/5.0 (compatible; map-layout-sync/1.0)', referer: 'https://hens333.com/' } };
  const apiUrl = 'https://dbd.tricky.lol/api/maps';
  const [sourceHtml, apiMaps] = await Promise.all([
    fetchTextWithRetry(SOURCE, options),
    fetchJsonWithRetry(apiUrl, { ...options, headers: { 'user-agent': 'Mozilla/5.0 (compatible; map-catalog-audit/1.0)' } })
  ]);
  if (!apiMaps || Array.isArray(apiMaps) || !Object.keys(apiMaps).length) throw new Error('Invalid maps API snapshot');
  const sources = parseHensCallouts(sourceHtml);
  if (!sources.length) throw new Error('No source callouts found');
  const byLabel = new Map(sources.map(source => [normalizeKey(source.label), source]));
  const rows = [];
  const usedPaths = new Set();
  const seenNames = new Set();
  const remoteChecks = new Map();
  for (const map of database.maps) {
    const key = `${map.realm || ''}::${map.name}`;
    if (seenNames.has(key)) continue;
    seenNames.add(key);
    const layouts = registry.resolve(map.name);
    if (!layouts.length) rows.push({ map: map.name, id: map.id, status: 'missing-layout' });
    for (const layout of layouts) {
      usedPaths.add(layout.path);
      const row = { map: map.name, id: map.id, realm: map.realm, variant: layout.label || '', localPath: layout.path };
      rows.push(row);
      const local = path.join(WEB, 'dbd_images', layout.path);
      if (!fs.existsSync(local)) { row.status = 'missing-local-file'; continue; }
      row.localSha256 = hash(fs.readFileSync(local));
      if (!layout.path.startsWith('map_layouts_hens/')) {
        row.status = 'legacy-floor-needs-independent-source-check';
        continue;
      }
      const variation = /^Variation (II|III)$/.exec(layout.label || '');
      const suffix = variation ? ' ' + variation[1] : '';
      const candidateNames = buildMapCandidates(map.name).map(name => name + suffix);
      const source = candidateNames.map(name => byLabel.get(normalizeKey(name))).find(Boolean);
      if (!source) { row.status = 'source-association-missing'; continue; }
      row.sourceLabel = source.rawLabel;
      row.normalizedSourceLabel = source.label;
      row.sourceUrl = IMAGE_BASE + encodePathSegments(source.dataPath);
      row.status = 'pending-source-hash';
      if (!remoteChecks.has(row.sourceUrl)) remoteChecks.set(row.sourceUrl, []);
      remoteChecks.get(row.sourceUrl).push(row);
    }
  }
  // Bound concurrency to three source requests; do not modify image assets.
  for (const row of rows.filter(row => row.status === 'legacy-floor-needs-independent-source-check')) {
    const title = row.variant === 'Lower Floor' ? 'File:MidwichElementarySchoolOutline LowerFloor.png' : 'File:MidwichElementarySchoolOutline UpperFloors.png';
    const info = await getImageInfo(title);
    if (!info) { row.status = 'wiki-floor-source-missing'; continue; }
    row.sourceUrl = 'https://deadbydaylight.wiki.gg/wiki/' + encodeURIComponent(title.replace(/ /g, '_'));
    row.sourceFileUrl = info.url;
    remoteChecks.set(info.url, [row]);
  }
  const pending = [...remoteChecks.entries()];
  const worker = async () => {
    while (pending.length) {
      const [url, assigned] = pending.pop();
      try {
        const bytes = await fetchBinaryWithRetry(url, options);
        const image = bytes.subarray(0, 4).toString() === 'RIFF' && bytes.subarray(8, 12).toString() === 'WEBP' || bytes.subarray(0, 3).toString() === 'GIF' || bytes.subarray(0, 8).equals(Buffer.from([137,80,78,71,13,10,26,10]));
        if (!image) throw new Error('Source did not return a valid map image');
        const remote = hash(bytes);
        for (const row of assigned) {
          row.sourceSha256 = remote;
          row.status = row.localSha256 === remote ? 'matches-named-source' : 'differs-from-named-source';
          if (row.sourceFileUrl) {
            row.status = row.localSha256 === remote ? 'matches-wiki-floor-source' : 'differs-from-wiki-floor-source';
            if (row.localSha256 !== remote) {
              // PNG encoding metadata can differ while every rendered pixel is identical.
              const comparison = spawnSync('python3', ['-c', 'import io,sys,json; from PIL import Image; a=Image.open(sys.argv[1]).convert("RGBA"); b=Image.open(io.BytesIO(sys.stdin.buffer.read())).convert("RGBA"); print(json.dumps({"samePixels":a.size==b.size and a.tobytes()==b.tobytes(),"localSize":a.size,"sourceSize":b.size}))', path.join(WEB, 'dbd_images', row.localPath)], { input: bytes, encoding: 'utf8', timeout: 10000 });
              if (comparison.status === 0) {
                row.pixelComparison = JSON.parse(comparison.stdout);
                if (row.pixelComparison.samePixels) row.status = 'same-pixels-as-wiki-floor-source';
              } else row.pixelComparison = { unavailable: true };
            }
          }
          if (stageRoot && row.status.startsWith('differs-')) {
            fs.mkdirSync(stageRoot, { recursive: true });
            row.stagedFile = path.basename(row.localPath);
            fs.writeFileSync(path.join(stageRoot, row.stagedFile), bytes);
          }
        }
      } catch (error) {
        for (const row of assigned) { row.status = 'source-download-failed'; row.error = error.message; }
      }
    }
  };
  await Promise.all([worker(), worker(), worker()]);
  const counts = {};
  for (const row of rows) counts[row.status] = (counts[row.status] || 0) + 1;
  const mapIds = new Set(database.maps.map(map => map.id));
  const danglingRealmReferences = database.realms.flatMap(realm => realm.maps.filter(id => !mapIds.has(id)).map(id => ({ realm: realm.name, id })));
  const catalogLabels = new Set();
  for (const map of database.maps) {
    for (const name of buildMapCandidates(map.name)) {
      catalogLabels.add(normalizeKey(name));
      for (const layout of registry.resolve(map.name)) {
        const variation = /^Variation (II|III)$/.exec(layout.label || '');
        if (variation) catalogLabels.add(normalizeKey(name + ' ' + variation[1]));
      }
    }
  }
  const sourceOnlyLabels = sources.filter(source => !catalogLabels.has(normalizeKey(source.label))).map(source => ({ label: source.label, sourcePath: source.dataPath }));
  const mapKey = (name, realm) => [realm, name].map(value => normalizeKey(value).replace(/^the /, '')).join('::');
  const catalogKeys = new Set(database.maps.map(map => mapKey(map.name, map.realm)));
  const unresolvedApiMaps = [];
  const apiMapsAbsentFromCatalog = [];
  for (const [code, map] of Object.entries(apiMaps)) {
    if (!map?.name || /^@#|\{/.test(map.name) || !map.image) {
      unresolvedApiMaps.push({ code, name: map?.name || '', reason: 'Unresolved label or missing artwork; never import automatically' });
    } else if (!catalogKeys.has(mapKey(map.name, map.realm))) {
      apiMapsAbsentFromCatalog.push({ code, name: map.name.trim(), realm: map.realm, image: map.image, review: 'May be missing, retired or otherwise unavailable; corroborate before import' });
    }
  }
  const report = { checkedOn: new Date().toISOString().slice(0, 10), source: SOURCE,
    databaseMapIds: database.maps.length, uniqueArticles: seenNames.size, sourceCallouts: sources.length,
    counts, rows, danglingRealmReferences, sourceOnlyLabels,
    apiUrl, apiMapCount: Object.keys(apiMaps).length, unresolvedApiMaps, apiMapsAbsentFromCatalog,
    unusedRegistryPaths: [...new Set(Object.values(registry.layouts).flat().map(layout => layout.path))].filter(file => !usedPaths.has(file)).sort(),
    limitation: 'A hash match proves the local file matches the named source asset. It does not independently certify that the third-party drawing matches current game geometry.' };
  if (args.includes('--write')) {
    const { writeJsonAtomic } = require('./atomic-write');
    writeJsonAtomic(path.join(ROOT, 'review/map-associations.json'), report, { backup: false });
  }
  console.log(`map-associations: ${JSON.stringify({ mapIds: database.maps.length, uniqueArticles: seenNames.size, sourceCallouts: sources.length, counts })}`);
  if (danglingRealmReferences.length || rows.some(row => !['matches-named-source', 'matches-wiki-floor-source', 'same-pixels-as-wiki-floor-source'].includes(row.status))) process.exitCode = 1;
}

if (require.main === module) main().catch(error => { console.error(`map-associations: ${error.message}`); process.exitCode = 1; });
