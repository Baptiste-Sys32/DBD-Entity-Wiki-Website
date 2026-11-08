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
