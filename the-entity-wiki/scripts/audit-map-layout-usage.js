#!/usr/bin/env node

// Local-only usage audit. Does not download, sync, remove, or modify game data.
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const crypto = require('crypto');
const { writeJsonAtomic } = require('./atomic-write');

const root = path.resolve(__dirname, '..');
const web = path.join(root, 'web');
const report = path.join(root, 'review', 'map-layout-usage.json');
const html = require('./web-source').readUiSource();
const start = html.indexOf('const MAP_LAYOUTS =');
const end = html.indexOf('const GAME_ICONS =', start);
if (start < 0 || end < 0) throw new Error('Map layout declarations were not found.');
const lookup = vm.runInNewContext(`${html.slice(start, end)}; ({ layouts: MAP_LAYOUTS, resolve: getMapLayoutsForName })`, {}, { timeout: 3000 });
const references = new Set(Object.values(lookup.layouts).flat().map(entry => entry.path));
const database = JSON.parse(fs.readFileSync(path.join(root, 'content', 'database.json'), 'utf8'));
const hashes = new Map();
const directories = ['map_layouts', 'map_layouts_hens', 'map_layouts_steam'].map(name => {
  const files = fs.readdirSync(path.join(web, 'dbd_images', name)).sort().filter(file => fs.statSync(path.join(web, 'dbd_images', name, file)).isFile()).map(file => {
    const relative = `${name}/${file}`;
    const data = fs.readFileSync(path.join(web, 'dbd_images', relative));
    const hash = crypto.createHash('sha256').update(data).digest('hex');
    if (!hashes.has(hash)) hashes.set(hash, []);
    hashes.get(hash).push(relative);
    return { path: relative, bytes: data.length, referenced: references.has(relative) };
  });
  return {
    name, files: files.length, bytes: files.reduce((sum, file) => sum + file.bytes, 0),
    referencedFiles: files.filter(file => file.referenced).length,
    referencedBytes: files.filter(file => file.referenced).reduce((sum, file) => sum + file.bytes, 0),
    unreferencedPaths: files.filter(file => !file.referenced).map(file => file.path)
  };
});
const uncovered = database.maps.filter(map => {
  const layouts = lookup.resolve(map.name);
  return !layouts.length || layouts.some(entry => !fs.existsSync(path.join(web, 'dbd_images', entry.path)));
}).map(map => ({ id: map.id, name: map.name }));
const result = {
  databaseMaps: database.maps.length,
  uniqueMapNames: new Set(database.maps.map(map => map.name)).size,
  layoutKeys: Object.keys(lookup.layouts).length,
  uniqueReferencedPaths: references.size,
  uncovered,
  directories,
  byteIdenticalGroups: [...hashes.values()].filter(paths => paths.length > 1),
  decision: {
    active: 'Hens callouts plus separate legacy Midwich floor plans. All current database maps resolve to existing files.',
    retained: 'Unreferenced Steam and legacy assets are historical source archives. Retained pending a separate asset cleanup decision; no browser request is made for these by the layout resolver.',
    deployment: 'The Pages script uploads the entire web directory, so archives increase deployment storage even though they are not requested during browsing.',
    sync: 'sync-map-layouts.js preserves the first existing file unless --upgrade-legacy is explicitly requested. No source refresh or game-data sync was run.'
  }
};
if (uncovered.length) throw new Error(`Maps without complete local layouts: ${JSON.stringify(uncovered)}`);
if (process.argv.includes('--write')) writeJsonAtomic(report, result, { backup: false });
if (process.argv.includes('--check') && fs.readFileSync(report, 'utf8') !== `${JSON.stringify(result, null, 2)}\n`) {
  throw new Error('Map layout usage report is stale; run with --write.');
}
console.log(`map-layout-usage: ${database.maps.length} maps covered, ${references.size} referenced paths, ${result.byteIdenticalGroups.length} duplicate groups.`);
