#!/usr/bin/env node

// Generates web/sitemap.xml from content JSON so deep links stay indexable.
// Usage: node scripts/build-sitemap.js [--check] [--base <url>] [--views a,b,c] [--out <path>]
// Defaults emit the DBD sitemap; other games override --base/--views/--out
// (per-game article mappings arrive with that game's adapter).

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const DATABASE_PATH = path.join(ROOT, 'content', 'database.json');
const TIMELINE_PATH = path.join(ROOT, 'content', 'timeline.json');
const DEFAULT_SITEMAP_PATH = path.join(ROOT, 'web', 'sitemap.xml');
const DEFAULT_BASE = 'https://entity-wiki.pages.dev';
const DEFAULT_VIEWS = ['killers', 'survivors', 'perks', 'items', 'offerings', 'realms', 'timeline', 'glossary', 'communityContent'];

const rawArgs = process.argv.slice(2);
const args = new Set(rawArgs);
const checkOnly = args.has('--check');

function flagValue(name) {
  const prefixed = `--${name}=`;
  for (const arg of rawArgs) {
    if (arg.startsWith(prefixed)) return arg.slice(prefixed.length);
  }
  const index = rawArgs.indexOf(`--${name}`);
  return index >= 0 && index + 1 < rawArgs.length ? rawArgs[index + 1] : null;
}

const BASE = flagValue('base') || DEFAULT_BASE;
const VIEW_LIST = flagValue('views') ? flagValue('views').split(',').map((view) => view.trim()).filter(Boolean) : DEFAULT_VIEWS;
const SITEMAP_PATH = flagValue('out') || DEFAULT_SITEMAP_PATH;

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function esc(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function main() {
  const database = readJson(DATABASE_PATH);
  const timeline = readJson(TIMELINE_PATH);
  const lastmod = new Date().toISOString().slice(0, 10);

  const urls = [];
  const add = (loc, changefreq, priority) => urls.push({ loc, changefreq, priority });

  add(`${BASE}/`, 'weekly', '1.0');
  VIEW_LIST.forEach((view) => {
    add(`${BASE}/?view=${view}`, 'weekly', '0.8');
  });

  const articles = [
    ['killer', database.killers],
    ['survivor', database.survivors],
    ['perk', database.perks],
    ['realm', database.realms],
  ];
  articles.forEach(([view, entries]) => {
    (entries || []).forEach((entry) => {
      if (entry && entry.id) add(`${BASE}/?view=${view}&id=${entry.id}`, 'monthly', '0.6');
    });
  });
  (timeline.releases || []).forEach((release) => {
    if (release && release.id) add(`${BASE}/?view=release&id=${release.id}`, 'monthly', '0.6');
  });

  add(`${BASE}/privacy-policy`, 'yearly', '0.3');

  const lines = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
  ];
  urls.forEach(({ loc, changefreq, priority }) => {
    lines.push('  <url>', `    <loc>${esc(loc)}</loc>`, `    <lastmod>${lastmod}</lastmod>`, `    <changefreq>${changefreq}</changefreq>`, `    <priority>${priority}</priority>`, '  </url>');
  });
  lines.push('</urlset>', '');
  const output = lines.join('\n');

  if (checkOnly) {
    const current = fs.existsSync(SITEMAP_PATH) ? fs.readFileSync(SITEMAP_PATH, 'utf8') : '';
    const normalize = (text) => text.replace(/<lastmod>\d{4}-\d{2}-\d{2}<\/lastmod>/g, '<lastmod>DATE</lastmod>');
    if (normalize(current) !== normalize(output)) {
      console.error('build-sitemap: web/sitemap.xml is stale, run node scripts/build-sitemap.js');
      process.exit(1);
    }
    console.log(`build-sitemap: sitemap fresh (${urls.length} urls).`);
    return;
  }

  fs.writeFileSync(SITEMAP_PATH, output);
  console.log(`build-sitemap: wrote web/sitemap.xml (${urls.length} urls).`);
}

main();
