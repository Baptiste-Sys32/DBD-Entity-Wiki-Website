#!/usr/bin/env node
// Discover a bounded collection update. --prepare stages assets and a manifest;
// sync-approved-update.js performs the separately reviewable canonical promotion.
const fs = require('fs');
const path = require('path');
const { parseCollectionOutfitRows, buildCharactersList } = require('./discover-cosmetics');
const { mapFullSet } = require('./normalize-cosmetics');
const { fetchRenderedHtml, buildCharacterLookup, getImageInfo, downloadToFile, normalizeKey } = require('./cosmetics-shared');
const { writeJsonAtomic } = require('./atomic-write');
const ROOT = path.resolve(__dirname, '..');

async function main() {
  const args = process.argv.slice(2);
  const option = name => args[args.indexOf(name) + 1];
  if (!args.includes('--collection')) throw new Error('--collection PAGE is required');
  const page = option('--collection');
  const since = args.includes('--since') ? Date.parse(option('--since')) : null;
  if (since !== null && !Number.isFinite(since)) throw new Error('Invalid --since date');
  const database = require('../content/database.json');
  const catalog = require('../content/cosmetics.json');
  const lookup = buildCharacterLookup(database);
  const characters = buildCharactersList(database);
  const parsed = parseCollectionOutfitRows(await fetchRenderedHtml(page), page, lookup, characters);
  if (parsed.unmappedRows.length) throw new Error(`Unmapped rows: ${parsed.unmappedRows.join(', ')}`);
  const eligible = parsed.entries.filter(entry => {
    const release = Date.parse(entry.releaseDate);
    return (!Number.isFinite(release) || release <= Date.now()) && (since === null || release > since);
  });
  if (!eligible.length) throw new Error('No eligible collection rows; check the source schema and cutoff');
  const byId = new Map(characters.map(character => [character.id, character]));
  const ids = new Set([...catalog.fullSets, ...catalog.characterSwaps].map(entry => entry.id));
  const manifestPath = args.includes('--manifest') ? path.resolve(ROOT, option('--manifest')) : null;
  if (args.includes('--prepare') && !manifestPath) throw new Error('--prepare requires --manifest FILE');
  const manifest = manifestPath ? JSON.parse(fs.readFileSync(manifestPath, 'utf8')) : { asOf: new Date().toISOString().slice(0, 10), operations: [] };
  const source = { url: `https://deadbydaylight.wiki.gg/wiki/${encodeURIComponent(page.replace(/ /g, '_'))}`, patch: page, channel: 'live' };
  let added = 0;
  for (const candidate of eligible) {
    const existing = catalog.fullSets.find(entry => entry.baseCharacterId === candidate.baseCharacterId && entry.assetFileTitleCandidates?.some(title => candidate.assetFileTitleCandidates.some(candidateTitle => normalizeKey(candidateTitle) === normalizeKey(title))));
    if (existing) continue;
    const entry = mapFullSet(candidate, lookup, byId, ids);
    if (manifest.operations.some(operation => operation.append && operation.value.id === entry.id)) continue;
    if (args.includes('--prepare')) {
      const info = await getImageInfo(entry.assetFileTitleCandidates[0]);
      if (!info || info.mime !== 'image/png') throw new Error(`Missing PNG image for ${entry.name}`);
      await downloadToFile(info.url, path.join(ROOT, 'web', entry.image));
    }
    manifest.operations.push({ file: 'content/cosmetics.json', path: ['fullSets'], append: true, value: entry, source });
    added++;
  }
  if (args.includes('--prepare')) writeJsonAtomic(manifestPath, manifest, { backup: false });
  console.log(`prepare-collection-update: eligible=${eligible.length} additions=${added} mode=${args.includes('--prepare') ? 'staged' : 'discovery'}`);
}

if (require.main === module) main().catch(error => { console.error(`prepare-collection-update: ${error.message}`); process.exitCode = 1; });
