#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const databasePath = path.join(root, 'content', 'database.json');
const reportPath = path.join(root, 'content', 'perk-description-report.json');

function fail(message) {
  console.error(`verify-perk-descriptions: ${message}`);
  process.exit(1);
}

if (!fs.existsSync(databasePath)) {
  fail(`missing ${databasePath}`);
}

if (!fs.existsSync(reportPath)) {
  fail(`missing ${reportPath}`);
}

const database = JSON.parse(fs.readFileSync(databasePath, 'utf8'));
const report = JSON.parse(fs.readFileSync(reportPath, 'utf8'));

if (!Array.isArray(database.perks)) {
  fail('content/database.json is missing perks');
}

if (!Array.isArray(report.entries)) {
  fail('content/perk-description-report.json is missing entries');
}

const perks = database.perks;
const entries = report.entries;
const unresolvedTemplateRe = /\{(?:Tunable|Keyword|Input)\.[^}]+\}/;

if (report.totalPerks !== perks.length) {
  fail(`report totalPerks=${report.totalPerks} does not match database perks=${perks.length}`);
}

const entriesById = new Map();
for (const entry of entries) {
  if (entriesById.has(entry.id)) {
    fail(`duplicate report entry for perk id ${entry.id}`);
  }
  entriesById.set(entry.id, entry);
}

if (entriesById.size !== perks.length) {
  fail(`report covers ${entriesById.size} perks but database has ${perks.length}`);
}

let different = 0;
let sameAsLegacy = 0;
let unresolved = 0;

for (const perk of perks) {
  const entry = entriesById.get(perk.id);
  if (!entry) {
    fail(`missing report entry for ${perk.name}`);
  }

  if (entry.name !== perk.name) {
    fail(`report name mismatch for ${perk.id}: ${entry.name} vs ${perk.name}`);
  }

  if (entry.status === 'different') {
    different += 1;
    if (!perk.descriptionPost95) {
      fail(`${perk.name} is marked different but has no descriptionPost95`);
    }
    const unresolvedMatch = String(perk.descriptionPost95).match(unresolvedTemplateRe);
    if (unresolvedMatch) {
      fail(`${perk.name} has unresolved template token ${unresolvedMatch[0]} in descriptionPost95`);
    }
    continue;
  }

  if (entry.status === 'same_as_legacy') {
    sameAsLegacy += 1;
    if (perk.descriptionPost95) {
      fail(`${perk.name} is marked same_as_legacy but still has descriptionPost95`);
    }
    continue;
  }

  if (entry.status === 'unresolved') {
    unresolved += 1;
    continue;
  }

  fail(`${perk.name} has invalid report status ${entry.status}`);
}

if (unresolved !== 0) {
  fail(`report still has ${unresolved} unresolved perks`);
}

console.log(
  `verify-perk-descriptions: perks=${perks.length} different=${different} same_as_legacy=${sameAsLegacy}`
);
