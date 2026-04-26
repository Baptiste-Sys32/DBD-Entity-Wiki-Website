#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const {
  CONTENT_PATH,
  CHARACTER_SWAP_DIR,
  FULL_SET_DIR,
  readJson,
  writeJson,
  getImageInfo,
  downloadToFile,
  ensureDir,
  fetchPageImages,
  fetchRenderedHtml,
  extractRenderedImageTitles,
  requestJson,
  uniq,
  normalizeKey
} = require('./cosmetics-shared');

const force = process.argv.includes('--force');

function getPlaceholderCandidates(entry) {
  const pieceType = normalizeKey(entry.pieceType || '');
  if (pieceType.includes('outfit')) return ['File:CategoryIcon_outfits.png'];
  if (pieceType.includes('head')) return ['File:CategoryIcon_head.png', 'File:CategoryIcon_masks.png'];
  if (pieceType.includes('body')) return ['File:CategoryIcon_body.png', 'File:CategoryIcon_torso.png'];
  if (pieceType.includes('legs')) return ['File:CategoryIcon_legs.png'];
  if (pieceType.includes('weapon')) return ['File:CategoryIcon_weapons.png'];
  return ['File:CategoryIcon_outfits.png'];
}

async function searchFileTitles(query) {
  if (!query) return [];
  try {
    const data = await requestJson({
      action: 'query',
      list: 'search',
      srsearch: query,
      srnamespace: '6',
      srlimit: '30'
    });
    return (data.query?.search || [])
      .map((entry) => entry?.title)
      .filter((title) => /^File:/i.test(String(title || '')));
  } catch (error) {
    return [];
  }
}

function scoreFallbackCandidate(fileTitle, entry) {
  const key = normalizeKey(fileTitle);
  let score = 0;

  if (/categoryicon|iconhelp|banner|splash|loading|portrait|background|logo/i.test(fileTitle)) {
    score -= 120;
  }

  const addTokenScore = (raw, weight) => {
    normalizeKey(raw)
      .split(' ')
      .filter((token) => token.length >= 3)
      .slice(0, 6)
      .forEach((token) => {
        if (key.includes(token)) score += weight;
      });
  };

  addTokenScore(entry.name || '', 16);
  addTokenScore(entry.baseCharacterName || '', 10);
  addTokenScore(entry.collectionName || entry.sourceBucket || '', 6);

  const pieceTypeKey = normalizeKey(entry.pieceType || '');
  if (pieceTypeKey.includes('outfit') && key.includes('outfit')) score += 18;
  if (pieceTypeKey.includes('head') && /head|mask|hair/.test(key)) score += 16;
  if (pieceTypeKey.includes('body') && /body|torso|upper/.test(key)) score += 16;
  if (pieceTypeKey.includes('legs') && /legs|pants|lower/.test(key)) score += 16;
  if (pieceTypeKey.includes('weapon') && /weapon|w\d+/.test(key)) score += 16;

  return score;
}

async function buildFallbackCandidates(entry) {
  const sourcePage = String(entry.sourcePage || '').trim();
  const fromSourcePageImages = sourcePage ? await fetchPageImages(sourcePage).catch(() => []) : [];
  const fromRenderedSource = sourcePage ? extractRenderedImageTitles(await fetchRenderedHtml(sourcePage).catch(() => '')) : [];

  const searchTerms = [
    `${entry.baseCharacterName || ''} ${entry.name || ''}`.trim(),
    `${entry.name || ''} dead by daylight`.trim(),
    `${entry.baseCharacterName || ''} ${entry.collectionName || entry.sourceBucket || ''}`.trim()
  ].filter(Boolean);

  const fromSearch = [];
  for (const term of searchTerms) {
    const titles = await searchFileTitles(term);
    fromSearch.push(...titles);
  }

  return uniq([
    ...fromSourcePageImages,
    ...fromRenderedSource,
    ...fromSearch
  ])
    .filter((title) => /^File:/i.test(String(title || '')))
    .map((title) => ({ title, score: scoreFallbackCandidate(title, entry) }))
    .filter((entryScore) => entryScore.score > 0)
    .sort((left, right) => right.score - left.score || left.title.localeCompare(right.title))
    .map((entryScore) => entryScore.title)
    .slice(0, 16);
}

async function downloadEntry(entry) {
  const targetPath = path.join(path.resolve(__dirname, '..', 'web'), entry.image.replace(/^\.\//, ''));
  if (!force && !entry.assetIsPlaceholder) {
    try {
      fs.accessSync(targetPath);
      return { status: 'skipped', entry, fileTitle: null };
    } catch (error) {
      // continue to candidate lookup and download
    }
  }

  const candidates = Array.isArray(entry.assetFileTitleCandidates) ? entry.assetFileTitleCandidates : [];
  for (const candidate of candidates) {
    const info = await getImageInfo(candidate);
    if (!info?.url) continue;
    ensureDir(path.dirname(targetPath));
    await downloadToFile(info.url, targetPath);
    return { status: 'downloaded', entry, fileTitle: candidate, usedFallback: false };
  }

  const fallbackCandidates = await buildFallbackCandidates(entry);
  for (const candidate of fallbackCandidates) {
    const info = await getImageInfo(candidate);
    if (!info?.url) continue;
    ensureDir(path.dirname(targetPath));
    await downloadToFile(info.url, targetPath);
    return { status: 'downloaded', entry, fileTitle: candidate, usedFallback: true };
  }

  const placeholderCandidates = getPlaceholderCandidates(entry);
  for (const candidate of placeholderCandidates) {
    const info = await getImageInfo(candidate);
    if (!info?.url) continue;
    ensureDir(path.dirname(targetPath));
    await downloadToFile(info.url, targetPath);
    return { status: 'downloaded', entry, fileTitle: candidate, usedFallback: true, usedPlaceholder: true };
  }

  return { status: 'missing', entry, fileTitle: null };
}

async function main() {
  const cosmetics = readJson(CONTENT_PATH);
  const groups = ['characterSwaps', 'fullSets'];
  const readyEntries = groups.flatMap((groupKey) =>
    (cosmetics[groupKey] || [])
      .filter((entry) => entry.status === 'ready')
      .map((entry) => ({ entry, groupKey }))
  );
  ensureDir(CHARACTER_SWAP_DIR);
  ensureDir(FULL_SET_DIR);

  console.log(`sync-cosmetic-assets: starting ready=${readyEntries.length}${force ? ' (force)' : ''}`);

  let downloaded = 0;
  let skipped = 0;
  let fallbackResolved = 0;
  let placeholderResolved = 0;
  const missing = [];
  const progressEvery = 100;

  for (let index = 0; index < readyEntries.length; index += 1) {
    const { entry, groupKey } = readyEntries[index];
    const result = await downloadEntry(entry);
    if (result.status === 'downloaded') {
      downloaded += 1;
      if (result.usedFallback) fallbackResolved += 1;
      if (result.fileTitle) {
        const targetGroup = cosmetics[groupKey] || [];
        const manifestEntry = targetGroup.find((candidateEntry) => candidateEntry.id === entry.id);
        if (manifestEntry) {
          const existingCandidates = Array.isArray(manifestEntry.assetFileTitleCandidates) ? manifestEntry.assetFileTitleCandidates : [];
          manifestEntry.assetFileTitleCandidates = uniq([result.fileTitle, ...existingCandidates]);
          if (result.usedPlaceholder) {
            manifestEntry.assetIsPlaceholder = true;
            manifestEntry.assetPlaceholderSource = result.fileTitle;
          } else {
            delete manifestEntry.assetIsPlaceholder;
            delete manifestEntry.assetPlaceholderSource;
          }
        }
      }
      if (result.usedPlaceholder) placeholderResolved += 1;
    }
    if (result.status === 'skipped') skipped += 1;
    if (result.status === 'missing') missing.push({ ...result, groupKey });

    const processed = index + 1;
    if (processed % progressEvery === 0 || processed === readyEntries.length) {
      console.log(
        `sync-cosmetic-assets: ${processed}/${readyEntries.length} processed downloaded=${downloaded} skipped=${skipped} blocked=${missing.length}`
      );
    }
  }

  if (missing.length) {
    missing.forEach((result) => {
      const targetGroup = cosmetics[result.groupKey] || [];
      const manifestEntry = targetGroup.find((entry) => entry.id === result.entry.id);
      if (manifestEntry) manifestEntry.status = 'blocked_art';
      console.warn(`sync-cosmetic-assets: blocked missing asset for ${result.entry.name}`);
    });
    writeJson(CONTENT_PATH, cosmetics);
  } else if (fallbackResolved > 0 || placeholderResolved > 0) {
    writeJson(CONTENT_PATH, cosmetics);
  }

  console.log(`sync-cosmetic-assets: ready=${readyEntries.length} downloaded=${downloaded} skipped=${skipped} fallbackResolved=${fallbackResolved} placeholderResolved=${placeholderResolved} blocked=${missing.length}`);
}

main().catch((error) => {
  console.error(`sync-cosmetic-assets: ${error.message}`);
  process.exit(1);
});
