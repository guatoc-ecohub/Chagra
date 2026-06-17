import { readdirSync, statSync, lstatSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const DIST = join(import.meta.dirname, '..', 'dist');
const ASSETS = join(DIST, 'assets');

const THRESHOLDS = {
  mainBundleMax: 300 * 1024,
  chunkMax:      500 * 1024,
  totalMax:      25 * 1024 * 1024,
};

function formatSize(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function getDirSize(dir) {
  let total = 0;
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isFile()) total += statSync(full).size;
    else if (entry.isDirectory()) total += getDirSize(full);
  }
  return total;
}

function checkBudget() {
  if (!existsSync(ASSETS)) {
    console.error('dist/assets/ not found. Run `npm run build` first.');
    process.exit(1);
  }

  const errors = [];

  const totalSize = getDirSize(DIST);
  if (totalSize > THRESHOLDS.totalMax) {
    errors.push('TOTAL dist exceeds budget: ' + formatSize(totalSize));
  }

  let mainBundleSize = 0;
  const chunkSizes = [];
  for (const f of readdirSync(ASSETS)) {
    const fp = join(ASSETS, f);
    if (!lstatSync(fp).isFile()) continue;
    if (!f.endsWith('.js')) continue;
    const size = statSync(fp).size;
    chunkSizes.push({ file: f, size });
    if (f.startsWith('index-') && size > mainBundleSize) mainBundleSize = size;
  }

  if (mainBundleSize > THRESHOLDS.mainBundleMax) {
    errors.push('MAIN bundle exceeds 300KB: ' + formatSize(mainBundleSize));
  }
  for (const { file, size } of chunkSizes) {
    if (size > THRESHOLDS.chunkMax) {
      errors.push('CHUNK "' + file + '" exceeds 500KB: ' + formatSize(size));
    }
  }

  console.log('Total dist: ' + formatSize(totalSize));
  console.log('Main bundle: ' + formatSize(mainBundleSize));
  console.log('Chunk count: ' + chunkSizes.length);

  if (errors.length > 0) {
    console.error('\nBUDGET EXCEEDED:\n' + errors.map(e => '  - ' + e).join('\n'));
    process.exit(1);
  }
  console.log('All budgets within thresholds.');
}

checkBudget();
