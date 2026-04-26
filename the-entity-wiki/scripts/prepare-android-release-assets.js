#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const WEB_FULL_SET_DIR = path.join(ROOT, 'web', 'dbd_images', 'cosmetics', 'full_sets');
const ANDROID_PUBLIC_ROOT = path.join(ROOT, 'android', 'app', 'src', 'main', 'assets', 'public');
const ANDROID_FULL_SET_DIR = path.join(ANDROID_PUBLIC_ROOT, 'dbd_images', 'cosmetics', 'full_sets');
const ASSET_PACK_ROOT = path.join(ROOT, 'android', 'cosmeticsfullsetpack', 'src', 'main', 'assets');
const ASSET_PACK_FULL_SET_DIR = path.join(ASSET_PACK_ROOT, 'dbd_images', 'cosmetics', 'full_sets');

function fail(message) {
  console.error(`prepare-android-release-assets: ${message}`);
  process.exit(1);
}

function ensureDir(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true });
}

function main() {
  if (!fs.existsSync(ANDROID_PUBLIC_ROOT)) {
    fail(`Android public assets directory is missing: ${path.relative(ROOT, ANDROID_PUBLIC_ROOT)}. Run "npx cap sync android" first.`);
  }
  if (!fs.existsSync(WEB_FULL_SET_DIR)) {
    fail(`Full-set cosmetics source directory is missing: ${path.relative(ROOT, WEB_FULL_SET_DIR)}`);
  }

  if (fs.existsSync(ANDROID_FULL_SET_DIR)) {
    fs.rmSync(ANDROID_FULL_SET_DIR, { recursive: true, force: true });
  }
  if (fs.existsSync(ASSET_PACK_FULL_SET_DIR)) {
    fs.rmSync(ASSET_PACK_FULL_SET_DIR, { recursive: true, force: true });
  }

  ensureDir(path.dirname(ASSET_PACK_FULL_SET_DIR));
  fs.cpSync(WEB_FULL_SET_DIR, ASSET_PACK_FULL_SET_DIR, { recursive: true });

  const fullSetFileCount = fs.readdirSync(ASSET_PACK_FULL_SET_DIR).length;

  console.log(
    `prepare-android-release-assets: copied full-set cosmetics into ${path.relative(ROOT, ASSET_PACK_FULL_SET_DIR)}`
  );
  console.log(
    `prepare-android-release-assets: stripped base copy at ${path.relative(ROOT, ANDROID_FULL_SET_DIR)}`
  );
  console.log(`prepare-android-release-assets: asset-pack file count=${fullSetFileCount}`);
}

main();
