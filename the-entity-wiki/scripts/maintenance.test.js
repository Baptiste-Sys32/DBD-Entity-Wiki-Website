const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');
const http = require('http');
const { stage, validateDocument } = require('./sync-approved-update');
const { fetchTextWithRetry } = require('./network-resilience');
const { parseCollectionOutfitRows, buildCharactersList } = require('./discover-cosmetics');
const { buildCharacterLookup } = require('./cosmetics-shared');
const { parseHensCallouts } = require('./sync-map-layouts');
const vm = require('vm');
const { compile, buildRuntime, SOURCES, outputFor } = require('./build-runtime');

test('runtime freshness checks reject stale source without rewriting output and refresh cache versions on build', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'dbd-runtime-test-'));
  try {
    for (const [index, source] of SOURCES.entries()) {
      const file = path.join(root, source);
      fs.mkdirSync(path.dirname(file), { recursive: true });
      fs.writeFileSync(file, `const fixture${index} = ${index};`);
    }
    const indexPath = path.join(root, 'index.html');
    fs.writeFileSync(indexPath, SOURCES.map(source => `<script src="./${outputFor(source)}"></script>`).join('\n'));
    buildRuntime({ webRoot: root });
    const firstHtml = fs.readFileSync(indexPath, 'utf8');
    const outputPath = path.join(root, outputFor(SOURCES[0]));
    const firstOutput = fs.readFileSync(outputPath, 'utf8');
    buildRuntime({ webRoot: root, check: true });
    fs.appendFileSync(path.join(root, SOURCES[0]), '\nconst changed = 42;');
    assert.throws(() => buildRuntime({ webRoot: root, check: true }), /stale/);
    assert.equal(fs.readFileSync(indexPath, 'utf8'), firstHtml);
    assert.equal(fs.readFileSync(outputPath, 'utf8'), firstOutput);
    buildRuntime({ webRoot: root });
    assert.notEqual(fs.readFileSync(indexPath, 'utf8'), firstHtml);
    buildRuntime({ webRoot: root, check: true });
  } finally { fs.rmSync(root, { recursive: true, force: true }); }
});

test('compiled classic scripts preserve shared globals and JSX rendering', () => {
  const sandbox = { React: { createElement: (type, props, ...children) => ({ type, props, children }) } };
  vm.createContext(sandbox);
  vm.runInContext(compile('const shared = { label: "visible" };'), sandbox);
  vm.runInContext(compile('const Component = () => <span>{shared.label}</span>; globalThis.rendered = Component();'), sandbox);
  assert.deepEqual(JSON.parse(JSON.stringify(sandbox.rendered)), { type: 'span', props: null, children: ['visible'] });
});

test('known source typo maps Badham IV without rewriting unrelated labels', () => {
  const rows = parseHensCallouts('<button data-path="Badham/Preschool4.webp">Preschool IIIV</button><button data-path="Elsewhere/Unknown.webp">Preschool IIIV</button>');
  assert.equal(rows[0].label, 'Preschool IV');
  assert.equal(rows[0].rawLabel, 'Preschool IIIV');
  assert.equal(rows[1].label, 'Preschool IIIV');
});

test('reviewed updates reject changed inputs and invalid templates before any write', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'dbd-update-test-'));
  try {
    fs.mkdirSync(path.join(root, 'content'));
    const file = path.join(root, 'content', 'database.json');
    const original = JSON.stringify({ perks: [{ id: 'p', descriptionPost95: 'old' }] });
    fs.writeFileSync(file, original);
    const operation = { file: 'content/database.json', path: ['perks', { id: 'p' }, 'descriptionPost95'], before: 'old', value: 'new', source: { url: 'https://example.com/patch', patch: '10.2.2', channel: 'live' } };
    assert.equal(stage({ operations: [operation] }, root).changed, 1);
    assert.equal(fs.readFileSync(file, 'utf8'), original);
    assert.throws(() => stage({ operations: [{ ...operation, before: 'unexpected' }] }, root), /Local value changed/);
    assert.throws(() => stage({ operations: [{ ...operation, value: '{Tunable.X.Value}' }] }, root), /Unresolved/);
    assert.throws(() => stage({ operations: [{ ...operation, value: '@#MAP_swamp_III_NAME' }] }, root), /Unresolved/);
    assert.throws(() => stage({ operations: [{ ...operation, source: { ...operation.source, channel: 'ptb' } }] }, root), /live/);
    assert.throws(() => stage({ operations: [{ ...operation, file: '../outside.json' }] }, root), /canonical/);
    assert.throws(() => validateDocument([{ id: 'same' }, { id: 'same' }]), /Duplicate/);
    assert.equal(fs.readFileSync(file, 'utf8'), original);
  } finally { fs.rmSync(root, { recursive: true, force: true }); }
});

test('collection parser preserves linked outfits and standalone component ownership', () => {
  const database = { killers: [], survivors: [{ id: 'steve', name: 'Steve Harrington' }] };
  const html = `<div class="cosmeticTable"><div class="outfitView"><div class="cosmeticPiece">
    <div class="pieceThumbnail SquareBG-4-enh"><img alt="QM Outfit 011.png"><span class="linkedIcon"></span></div>
    <div class="pieceName cellHeader">Tactical Babysitter</div><div class="pieceCharacter"><a>Steve Harrington</a></div>
    <div class="outfitPieces"><img alt="CategoryIcon head.png"><img alt="CategoryIcon torso.png"><img alt="CategoryIcon legs.png"></div>
    <div class="releaseDateValue">05 November 2026</div></div></div>
    <div class="expandedPiece"><div class="pieceThumbnail SquareBG-4-enh"><img alt="QM Legs011.png"></div>
    <div class="pieceName divTableCell">Brown Slacks</div><div class="bodyPartHeader divTableCell"><img alt="CategoryIcon legs.png"></div></div></div>`;
  const parsed = parseCollectionOutfitRows(html, 'Stranger Things Collection', buildCharacterLookup(database), buildCharactersList(database));
  assert.deepEqual(parsed.unmappedRows, []);
  assert.equal(parsed.entries.length, 2);
  assert.equal(parsed.entries[0].outfitLinkMode, 'linked');
  assert.equal(parsed.entries[1].baseCharacterId, 'steve');
  assert.equal(parsed.entries[1].pieceType, 'Legs');
  assert.equal(parsed.entries[1].releaseDate, '05 November 2026');
});

test('network requests follow relative redirects, bound loops, retry HTTP errors and time out stalled bodies', async () => {
  let attempts = 0;
  const server = http.createServer((request, response) => {
    if (request.url === '/relative') { response.writeHead(302, { location: '/ok' }); response.end(); }
    else if (request.url === '/loop') { response.writeHead(302, { location: '/loop' }); response.end(); }
    else if (request.url === '/retry' && attempts++ === 0) { response.writeHead(503, { 'retry-after': '0' }); response.end(); }
    else if (request.url === '/stall') { response.writeHead(200); response.write('partial'); }
    else response.end('ok');
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const base = `http://127.0.0.1:${server.address().port}`;
  try {
    assert.equal(await fetchTextWithRetry(base + '/relative'), 'ok');
    await assert.rejects(fetchTextWithRetry(base + '/loop', { retries: 0, maxRedirects: 2 }), /Redirect limit/);
    assert.equal(await fetchTextWithRetry(base + '/retry', { retries: 1, baseDelayMs: 50 }), 'ok');
    assert.equal(attempts, 2);
    await assert.rejects(fetchTextWithRetry(base + '/stall', { retries: 0, timeoutMs: 1000 }), /Timeout/);
  } finally { server.closeAllConnections(); await new Promise(resolve => server.close(resolve)); }
});

test('map contracts detect missing, duplicate, cross-realm and orphan references while retaining name variants', () => {
  const { mapContractIssues } = require('./map-contracts');
  const valid = { maps: [{ id: 'a', name: 'Variant', realm: 'R' }, { id: 'b', name: 'Variant', realm: 'R' }], realms: [{ name: 'R', maps: ['a', 'b'] }] };
  assert.deepEqual(mapContractIssues(valid), []);
  const changed = structuredClone(valid);
  changed.realms[0].maps = ['a', 'missing', 'a'];
  changed.realms.push({ name: 'Other', maps: ['a'] });
  const issues = mapContractIssues(changed).join('; ');
  for (const pattern of [/Missing map/, /Duplicate map reference/, /Wrong realm/, /Orphan map/]) assert.match(issues, pattern);
  assert.match(mapContractIssues({ maps: valid.maps, realms: [{ name: 'R', maps: null }] }).join('; '), /must be an array/);
  assert.match(mapContractIssues({ ...valid, maps: [...valid.maps, valid.maps[0]] }).join('; '), /duplicate map ID/);
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'dbd-map-stage-'));
  try {
    fs.mkdirSync(path.join(root, 'content'));
    const file = path.join(root, 'content/database.json');
    const original = JSON.stringify(valid);
    fs.writeFileSync(file, original);
    assert.throws(() => stage({ operations: [{ file: 'content/database.json', path: ['realms', { name: 'R' }, 'maps'], before: ['a', 'b'], value: ['missing'], source: { url: 'https://example.com/patch', patch: '1.0.0', channel: 'live' } }] }, root), /Missing map/);
    assert.equal(fs.readFileSync(file, 'utf8'), original);
  } finally { fs.rmSync(root, { recursive: true, force: true }); }

});
