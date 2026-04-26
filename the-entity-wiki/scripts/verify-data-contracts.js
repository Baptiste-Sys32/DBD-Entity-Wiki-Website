#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const DATABASE_PATH = path.join(ROOT, 'content', 'database.json');
const PERK_REPORT_PATH = path.join(ROOT, 'content', 'perk-description-report.json');
const ADDON_REPORT_PATH = path.join(ROOT, 'content', 'addon-description-report.json');
const SUMMARY_REPORT_PATH = path.join(ROOT, 'review', 'description-sync-report.json');

function fail(message) {
  console.error(`verify-data-contracts: ${message}`);
  process.exit(1);
}

function readJson(filePath) {
  if (!fs.existsSync(filePath)) {
    fail(`missing file: ${path.relative(ROOT, filePath)}`);
  }

  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch (error) {
    fail(`invalid JSON in ${path.relative(ROOT, filePath)}: ${error.message}`);
  }
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function normalizeInlineText(text) {
  return String(text || '')
    .replace(/\s+/g, ' ')
    .replace(/\s+([,.;:!?])/g, '$1')
    .trim();
}

function assertUnique(items, label) {
  const seen = new Set();
  const duplicates = [];

  items.forEach((item) => {
    const normalized = String(item || '').trim();
    if (!normalized) return;
    if (seen.has(normalized)) {
      duplicates.push(normalized);
      return;
    }
    seen.add(normalized);
  });

  assert(duplicates.length === 0, `${label} must be unique, duplicates: ${duplicates.slice(0, 10).join(', ')}`);
}

function assertString(value, label) {
  assert(typeof value === 'string', `${label} must be a string`);
  assert(normalizeInlineText(value).length > 0, `${label} must not be empty`);
}

function validateDatabase(database) {
  const requiredArrays = ['killers', 'survivors', 'perks', 'addons', 'maps', 'realms', 'items', 'offerings'];
  requiredArrays.forEach((key) => {
    assert(Array.isArray(database[key]), `content/database.json.${key} must be an array`);
  });

  assert(database.perks.length > 0, 'database perks array is empty');
  assert(database.addons.length > 0, 'database addons array is empty');

  assertUnique(database.perks.map((perk) => perk.id), 'perk ids');
  assertUnique(database.addons.map((addon) => addon.id), 'addon ids');
  assertUnique(database.addons.map((addon) => addon.internalId), 'addon internalIds');

  database.perks.forEach((perk, index) => {
    assertString(perk.id, `perk[${index}].id`);
    assertString(perk.name, `perk[${index}].name`);
    assertString(perk.description, `perk[${index}].description`);
    if (typeof perk.descriptionPost95 !== 'undefined') {
      assertString(perk.descriptionPost95, `perk[${index}].descriptionPost95`);
    }
  });

  database.addons.forEach((addon, index) => {
    assertString(addon.id, `addon[${index}].id`);
    assertString(addon.name, `addon[${index}].name`);
    assertString(addon.internalId, `addon[${index}].internalId`);
    assertString(addon.description, `addon[${index}].description`);
  });

  database.maps.forEach((map, index) => {
    assertString(map.id, `map[${index}].id`);
    assertString(map.name, `map[${index}].name`);
  });
}

function validatePerkReport(perkReport, database) {
  assert(Number(perkReport.totalPerks) === database.perks.length, 'perk report totalPerks must match database perks length');
  assert(Array.isArray(perkReport.entries), 'perk report entries must be an array');
  assert(perkReport.entries.length === database.perks.length, 'perk report entries length must match database perks length');

  const byPerkId = new Map(database.perks.map((perk) => [perk.id, perk]));
  const allowedStatuses = new Set(['different', 'same_as_legacy', 'unresolved']);
  const unresolved = [];
  let differentCount = 0;
  let sameAsLegacyCount = 0;

  perkReport.entries.forEach((entry, index) => {
    assertString(entry.id, `perk report entry[${index}].id`);
    assertString(entry.name, `perk report entry[${index}].name`);
    assert(allowedStatuses.has(entry.status), `perk report entry[${index}] has invalid status ${entry.status}`);

    if (entry.status === 'unresolved') {
      unresolved.push(entry.name);
      return;
    }

    if (entry.status === 'different') differentCount += 1;
    if (entry.status === 'same_as_legacy') sameAsLegacyCount += 1;

    const perk = byPerkId.get(entry.id);
    assert(Boolean(perk), `perk report entry[${index}] references missing perk id ${entry.id}`);

    if (entry.status === 'different') {
      assert(typeof perk.descriptionPost95 === 'string' && normalizeInlineText(perk.descriptionPost95).length > 0, `perk ${perk.name} is marked different but missing descriptionPost95`);
    }

    if (entry.status === 'same_as_legacy') {
      assert(typeof perk.descriptionPost95 === 'undefined', `perk ${perk.name} is marked same_as_legacy but still has descriptionPost95`);
    }
  });

  assert(unresolved.length === 0, `perk report contains unresolved entries: ${unresolved.slice(0, 10).join(', ')}`);

  const counts = perkReport.counts || {};
  assert(Number(counts.different) === differentCount, 'perk report counts.different does not match entries');
  assert(Number(counts.same_as_legacy) === sameAsLegacyCount, 'perk report counts.same_as_legacy does not match entries');
  assert(differentCount + sameAsLegacyCount === database.perks.length, 'perk report status totals do not match perk roster size');
}

function validateAddonReport(addonReport, database) {
  assert(Number(addonReport.totalAddons) === database.addons.length, 'addon report totalAddons must match database addons length');
  assert(Array.isArray(addonReport.entries), 'addon report entries must be an array');
  assert(addonReport.entries.length === database.addons.length, 'addon report entries length must match database addons length');

  const allowedStatuses = new Set(['updated', 'unchanged', 'unresolved']);
  let updatedCount = 0;
  let unchangedCount = 0;
  const unresolved = [];

  addonReport.entries.forEach((entry, index) => {
    assertString(entry.id, `addon report entry[${index}].id`);
    assertString(entry.name, `addon report entry[${index}].name`);
    assertString(entry.internalId, `addon report entry[${index}].internalId`);
    assert(allowedStatuses.has(entry.status), `addon report entry[${index}] has invalid status ${entry.status}`);

    if (entry.status === 'updated') updatedCount += 1;
    if (entry.status === 'unchanged') unchangedCount += 1;
    if (entry.status === 'unresolved') unresolved.push(entry.name);
  });

  const counts = addonReport.counts || {};
  assert(Number(counts.updated) === updatedCount, 'addon report counts.updated does not match entries');
  assert(Number(counts.unchanged) === unchangedCount, 'addon report counts.unchanged does not match entries');
  assert(Number(counts.unresolved || 0) === unresolved.length, 'addon report counts.unresolved does not match entries');
  assert(updatedCount + unchangedCount + unresolved.length === database.addons.length, 'addon report status totals do not match addon roster size');
  assert(unresolved.length === 0, `addon report contains unresolved entries: ${unresolved.slice(0, 10).join(', ')}`);
}

function validateSummaryReportIfPresent(database) {
  if (!fs.existsSync(SUMMARY_REPORT_PATH)) {
    return { checked: false };
  }

  const summaryReport = readJson(SUMMARY_REPORT_PATH);
  const perks = summaryReport.perks || {};
  const addons = summaryReport.addons || {};

  assert(Number(perks.total || 0) === database.perks.length, 'description summary perks.total must match database perks length');
  assert(Number(addons.total || 0) === database.addons.length, 'description summary addons.total must match database addons length');
  assert(Number(perks.unresolvedCount || 0) === 0, 'description summary has unresolved perks');
  assert(Number(addons.unresolvedCount || 0) === 0, 'description summary has unresolved addons');

  return {
    checked: true,
    perksTotal: Number(perks.total || 0),
    addonsTotal: Number(addons.total || 0)
  };
}

function main() {
  const database = readJson(DATABASE_PATH);
  const perkReport = readJson(PERK_REPORT_PATH);
  const addonReport = readJson(ADDON_REPORT_PATH);

  try {
    validateDatabase(database);
    validatePerkReport(perkReport, database);
    validateAddonReport(addonReport, database);
    const summaryStatus = validateSummaryReportIfPresent(database);

    console.log(`verify-data-contracts: database perks=${database.perks.length} addons=${database.addons.length} maps=${database.maps.length}`);
    console.log(`verify-data-contracts: perk report and addon report are consistent with canonical database`);
    if (summaryStatus.checked) {
      console.log(`verify-data-contracts: summary report verified perks=${summaryStatus.perksTotal} addons=${summaryStatus.addonsTotal}`);
    } else {
      console.log('verify-data-contracts: summary report not found (skipped optional validation)');
    }
  } catch (error) {
    fail(error.message || String(error));
  }
}

main();
