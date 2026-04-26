#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const {
  ensureDir,
  getImageInfo,
  downloadToFile
} = require('./cosmetics-shared');

const ROOT = path.resolve(__dirname, '..');
const OFFERING_DIR = path.join(ROOT, 'web', 'dbd_images', 'offerings');

const OFFERING_FIXES = [
  {
    name: 'MISTLE TOES',
    fileTitle: 'File:IconsFavors Winter.png',
    targetFile: 'iconfavors_mistletoes.png'
  },
  {
    name: 'Shroud of Vanishing',
    fileTitle: 'File:IconsFavors shroudOfVanishing.png',
    targetFile: 'iconfavors_shroudofvanishing.png'
  },
  {
    name: 'Coconut Scream Pie',
    fileTitle: 'File:IconsFavors 9thAnniversary.png',
    targetFile: 'iconfavors_9thanniversary.png'
  }
];

const force = process.argv.includes('--force');

async function main() {
  ensureDir(OFFERING_DIR);
  let downloaded = 0;
  let skipped = 0;

  for (const entry of OFFERING_FIXES) {
    const targetPath = path.join(OFFERING_DIR, entry.targetFile);
    if (!force && fs.existsSync(targetPath)) {
      skipped += 1;
      continue;
    }
    const info = await getImageInfo(entry.fileTitle);
    if (!info?.url) {
      throw new Error(`Missing official image info for ${entry.name} (${entry.fileTitle}).`);
    }
    await downloadToFile(info.url, targetPath);
    downloaded += 1;
    console.log(`sync-offering-fixes: downloaded ${entry.name} -> ${path.relative(ROOT, targetPath)}`);
  }

  console.log(`sync-offering-fixes: downloaded=${downloaded} skipped=${skipped}`);
}

main().catch((error) => {
  console.error(`sync-offering-fixes: ${error.message}`);
  process.exit(1);
});
