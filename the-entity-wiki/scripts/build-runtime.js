#!/usr/bin/env node
// Compile the existing JSX with the already vendored compiler. No bundling,
// dependency resolution, framework migration or remote compiler is involved.
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { writeFileAtomic } = require('./atomic-write');
const ROOT = path.resolve(__dirname, '..');
const WEB = path.join(ROOT, 'web');
const COMPILER = path.join(WEB, 'vendor/babel.min.js');
const SOURCES = ['engine/icons.js', 'engine/core.js', 'engine/theme.js',
  'engine/storage.js', 'engine/device.js', 'engine/shell.js', 'engine/assets.js',
  'engine/articles.js', 'games/dbd/config.js', 'app.jsx'];
const outputFor = source => 'runtime/' + source.replace(/\.jsx$/, '.js');
const hash = value => crypto.createHash('sha256').update(value).digest('hex');
let babel;

function compile(source) {
  babel ||= require(COMPILER);
  return babel.transform(source, {
    presets: [[babel.availablePresets.env, { targets: { esmodules: true }, modules: false }], babel.availablePresets.react],
    comments: false, compact: false
  }).code + '\n';
}

function buildRuntime({ check = false, webRoot = WEB } = {}) {
  const html = fs.readFileSync(path.join(webRoot, 'index.html'), 'utf8');
  if (/text\/babel|src=["'][^"']*babel\.min\.js/.test(html)) throw new Error('Production HTML must load compiled scripts');
  const outputs = new Map();
  const manifest = { compilerSha256: hash(fs.readFileSync(COMPILER)), target: 'esmodules', entries: [] };
  let lastPosition = -1;
  for (const source of SOURCES) {
    const output = outputFor(source);
    const escaped = output.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const tags = [...html.matchAll(new RegExp(`<script\\s+src="\\./${escaped}(?:\\?v=[^"]+)?"[^>]*></script>`, 'g'))];
    if (tags.length !== 1) throw new Error(`Runtime script must be loaded exactly once: ${output}`);
    const position = tags[0].index;
    if (position <= lastPosition) throw new Error(`Missing or out-of-order runtime script: ${output}`);
    lastPosition = position;
    const input = fs.readFileSync(path.join(webRoot, source), 'utf8');
    const compiled = compile(input);
    outputs.set(output, compiled);
    manifest.entries.push({ source, output, sourceSha256: hash(input), outputSha256: hash(compiled) });
  }
  // HTML is revalidated on navigation, while scripts can be cached for hours.
  // Content-derived URL versions prevent a fresh page using cached old scripts.
  const nextHtml = html.replace(/<script\s+src="([^"?]+)(?:\?v=[^"]+)?"([^>]*)><\/script>/g, (tag, src, attributes) => {
    if (/^https?:/.test(src)) throw new Error('Runtime scripts must be local');
    const file = src.replace(/^\.\//, '');
    const bytes = outputs.has(file) ? outputs.get(file) : fs.readFileSync(path.join(webRoot, file));
    const errorHandler = file.startsWith('runtime/') && !attributes.includes('onerror=')
      ? ` onerror="window.__dbdDataScriptError('${file}')"` : '';
    return `<script src="${src}?v=${hash(bytes).slice(0, 12)}"${attributes}${errorHandler}></script>`;
  }).replace(/<link\s+rel="stylesheet"\s+href="([^"?]+)(?:\?v=[^"]+)?"/g, (tag, href) => {
    if (/^https?:/.test(href)) throw new Error('Stylesheets must be local');
    const bytes = fs.readFileSync(path.join(webRoot, href.replace(/^\.\//, '')));
    return `<link rel="stylesheet" href="${href}?v=${hash(bytes).slice(0, 12)}"`;
  });
  outputs.set('index.html', nextHtml);
  outputs.set('runtime/manifest.json', JSON.stringify(manifest, null, 2) + '\n');
  const stale = [...outputs].filter(([file, text]) => !fs.existsSync(path.join(webRoot, file)) || fs.readFileSync(path.join(webRoot, file), 'utf8') !== text);
  if (check && stale.length) throw new Error(`Generated runtime is stale: ${stale.map(([file]) => file).join(', ')}`);
  if (!check) {
    for (const [file, text] of stale) {
      fs.mkdirSync(path.dirname(path.join(webRoot, file)), { recursive: true });
      writeFileAtomic(path.join(webRoot, file), text, 'utf8');
    }
  }
  console.log(`build-runtime: ${SOURCES.length} scripts ${check ? 'verified' : 'generated'}; changed=${stale.length}`);
}

module.exports = { compile, buildRuntime, SOURCES, outputFor };
if (require.main === module) {
  try { buildRuntime({ check: process.argv.includes('--check') }); }
  catch (error) { console.error(`build-runtime: ${error.message}`); process.exitCode = 1; }
}
