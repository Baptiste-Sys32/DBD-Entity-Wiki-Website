#!/usr/bin/env node
// Discover first; apply only a reviewed manifest. Optional community and layout
// source refreshes remain separate from live game-data promotion.
const path = require('path');
const { spawnSync } = require('child_process');
const ROOT = path.resolve(__dirname, '..');
const args = process.argv.slice(2);

function run(script, flags = []) {
  const result = spawnSync(process.execPath, ['scripts/' + script, ...flags], {
    cwd: ROOT, stdio: 'inherit', shell: false, timeout: 120000
  });
  if (result.error) console.error(result.error.message);
  return result.status === 0;
}

if (args.includes('--apply')) {
  const index = args.indexOf('--manifest');
  if (index === -1 || !args[index + 1] || args.includes('--dry-run') || args.includes('--check')) {
    console.error('sync-all-updates: --apply requires --manifest FILE and cannot be combined with read-only flags');
    process.exitCode = 1;
  } else {
    const steps = [
      ['sync-approved-update.js', ['--manifest', args[index + 1], '--apply']],
      ['build-data.js', []], ['normalize-images.js', ['--check']],
      ['build-data.js', ['--check']], ['verify-data-contracts.js', []]
    ];
    for (const [script, flags] of steps) {
      if (!run(script, flags)) { process.exitCode = 1; break; }
    }
  }
} else {
  let ok = true;
  for (const script of ['sync-catalog-updates.js', 'sync-descriptions.js']) {
    if (!run(script, ['--dry-run'])) ok = false;
  }
  console.log('sync-all-updates: discovery only. Review a source-backed manifest; apply with --apply --manifest FILE.');
  console.log('sync-all-updates: community snapshots and layout source refreshes are optional separate tasks.');
  if (!ok) process.exitCode = 1;
}
