#!/usr/bin/env node
// Reviewed field-level updates. Discovery is read-only; promotion is explicit.
const fs = require('fs');
const path = require('path');
const { isDeepStrictEqual } = require('util');
const { mapContractIssues } = require('./map-contracts');
const { writeJsonAtomic } = require('./atomic-write');
const ROOT = path.resolve(__dirname, '..');
const UNRESOLVED = /\{(?:Tunable|Keyword|Input)\.|\{\d+\}|@#[A-Za-z0-9_]+/;

function locate(document, parts) {
  let current = document;
  for (const part of parts) {
    if (part && typeof part === 'object') {
      if (!Array.isArray(current)) throw new Error('Entity selector requires an array');
      const matches = current.filter(item => Object.entries(part).every(([key, value]) => item[key] === value));
      if (matches.length !== 1) throw new Error(`Ambiguous or missing entity ${JSON.stringify(part)}`);
      current = matches[0];
    } else {
      if (!current || !Object.prototype.hasOwnProperty.call(current, part)) throw new Error(`Missing path ${part}`);
      current = current[part];
    }
  }
  return current;
}

function validateDocument(value, allowExistingTemplates = false) {
  if (!allowExistingTemplates && typeof value === 'string' && UNRESOLVED.test(value)) throw new Error('Unresolved source template');
  if (!value || typeof value !== 'object') return;
  if (Array.isArray(value)) {
    const ids = value.filter(item => item && typeof item === 'object' && item.id).map(item => item.id);
    if (new Set(ids).size !== ids.length) throw new Error('Duplicate entity IDs');
  }
  for (const child of Object.values(value)) validateDocument(child, allowExistingTemplates);
}

function stage(manifest, root = ROOT) {
  if (!Array.isArray(manifest.operations) || !manifest.operations.length) throw new Error('Empty update manifest');
  const documents = new Map();
  let changed = 0;
  for (const operation of manifest.operations) {
    if (!/^content\/[a-z0-9-]+\.json$/.test(operation.file)) throw new Error('Only canonical content JSON can be updated');
    if (!operation.source || !/^https:\/\//.test(operation.source.url) || operation.source.channel !== 'live' || !operation.source.patch) throw new Error('A live, versioned source is required');
    if (!documents.has(operation.file)) documents.set(operation.file, JSON.parse(fs.readFileSync(path.join(root, operation.file), 'utf8')));
    const document = documents.get(operation.file);
    if (operation.path.length === 0) {
      if (isDeepStrictEqual(document, operation.value)) continue;
      if (!isDeepStrictEqual(document, operation.before)) throw new Error(`Local document changed: ${operation.file}`);
      validateDocument(operation.value);
      documents.set(operation.file, structuredClone(operation.value));
      changed++;
      continue;
    }
    const parent = locate(document, operation.path.slice(0, -1));
    const field = operation.path.at(-1);
    const previous = parent[field];
    if (operation.append) {
      if (!Array.isArray(previous) || !operation.value.id) throw new Error('Append requires an entity ID and array');
      const existing = previous.find(item => item.id === operation.value.id);
      if (existing && isDeepStrictEqual(existing, operation.value)) continue;
      if (existing) throw new Error(`Existing entity differs: ${operation.value.id}`);
      validateDocument(operation.value);
      if (operation.file === 'content/cosmetics.json') {
        for (const key of ['id', 'name', 'baseCharacterId', 'baseCharacterName', 'baseCharacterType', 'groupKey', 'groupLabel', 'image', 'sourceKind', 'sourcePage', 'assetProvenance', 'status']) {
          if (typeof operation.value[key] !== 'string' || !operation.value[key].trim()) throw new Error(`Missing cosmetic field ${key}`);
        }
        if (!Array.isArray(operation.value.aliases) || !Array.isArray(operation.value.assetFileTitleCandidates)) throw new Error('Missing cosmetic identity arrays');
      }
      if (operation.value.image) {
        const image = operation.value.image.replace(/^\.\//, '');
        if (!image.startsWith('dbd_images/') || image.includes('..') || !fs.existsSync(path.join(root, 'web', image))) throw new Error('Missing local image');
      }
      previous.push(structuredClone(operation.value));
      changed++;
      continue;
    }
    if (isDeepStrictEqual(previous, operation.value)) continue;
    if (!isDeepStrictEqual(previous, operation.before)) throw new Error(`Local value changed: ${operation.file} ${JSON.stringify(operation.path)}`);
    validateDocument(operation.value);
    parent[field] = structuredClone(operation.value);
    changed++;
  }
  if (manifest.operations.some(operation => operation.file === 'content/cosmetics.json' && operation.append)) {
    const catalog = documents.get('content/cosmetics.json');
    const counts = {};
    for (const entry of catalog.fullSets) counts[entry.outfitLinkMode || 'unlinked'] = (counts[entry.outfitLinkMode || 'unlinked'] || 0) + 1;
    const linked = catalog.fullSets.filter(entry => entry.isLinkedSet).length;
    const metadata = { ...catalog.metadata, characterSwapCount: catalog.characterSwaps.length,
      fullSetCount: catalog.fullSets.length, cosmeticCount: catalog.fullSets.length,
      linkedFullSetCount: linked, linkedCosmeticCount: linked,
      fullSetLinkModeCounts: counts, cosmeticLinkModeCounts: counts };
    if (manifest.asOf && /^\d{4}-\d{2}-\d{2}$/.test(manifest.asOf)) metadata.lastCollectionSync = manifest.asOf;
    if (!isDeepStrictEqual(metadata, catalog.metadata)) { catalog.metadata = metadata; changed++; }
    if (metadata.lastCollectionSync && catalog.generatedAt !== metadata.lastCollectionSync + 'T00:00:00.000Z') {
      catalog.generatedAt = metadata.lastCollectionSync + 'T00:00:00.000Z'; changed++;
    }
  }
  // Validate the complete staged update before writing any canonical file.
  for (const document of documents.values()) validateDocument(document, true);
  const database = documents.get('content/database.json');
  if (database && ('maps' in database || 'realms' in database)) {
    const issues = mapContractIssues(database);
    if (issues.length) throw new Error(issues.join('; '));
  }
  return { documents, changed };
}

function main() {
  const args = process.argv.slice(2);
  const index = args.indexOf('--manifest');
  if (index < 0 || !args[index + 1]) throw new Error('--manifest FILE is required');
  const manifest = JSON.parse(fs.readFileSync(path.resolve(args[index + 1]), 'utf8'));
  const result = stage(manifest);
  if (args.includes('--apply') && (args.includes('--check') || args.includes('--dry-run'))) throw new Error('Choose apply or read-only mode');
  const policyPath = path.join(__dirname, 'description-overrides.json');
  const policy = fs.existsSync(policyPath) ? JSON.parse(fs.readFileSync(policyPath, 'utf8')) : [];
  const byId = new Map(policy.map(entry => [entry.id, entry]));
  for (const operation of manifest.operations.filter(operation => operation.file === 'content/database.json' && operation.path[0] === 'perks' && operation.path[2] === 'descriptionPost95')) {
    const id = operation.path[1]?.id;
    if (!id) throw new Error('Description overrides require a stable perk ID');
    const previous = byId.get(id);
    if (previous && previous.source.patch.localeCompare(operation.source.patch, undefined, { numeric: true }) > 0) throw new Error('Refusing an older official description override');
    byId.set(id, { id, description: operation.value, source: operation.source });
  }
  if (args.includes('--apply') && result.changed) {
    for (const [file, document] of result.documents) writeJsonAtomic(path.join(ROOT, file), document, { backup: false });
  }
  if (args.includes('--apply')) {
    const nextPolicy = [...byId.values()].sort((a, b) => a.id.localeCompare(b.id));
    if (!isDeepStrictEqual(policy, nextPolicy)) writeJsonAtomic(policyPath, nextPolicy, { backup: false });
  }
  console.log(`sync-approved-update: fields=${result.changed} mode=${args.includes('--apply') ? 'apply' : 'discovery'}`);
  if (args.includes('--check') && result.changed) process.exitCode = 1;
}

module.exports = { locate, stage, validateDocument };
if (require.main === module) {
  try { main(); } catch (error) { console.error(`sync-approved-update: ${error.message}`); process.exitCode = 1; }
}
