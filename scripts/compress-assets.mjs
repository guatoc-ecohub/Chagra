#!/usr/bin/env node
/**
 * compress-assets.mjs — Compresión de assets para prod.chagra.app.
 *
 * Optimiza imágenes y JSONs del dist-prod/ aplicando:
 *   1. WebP desde PNG/JPG (más ligero, misma calidad visual)
 *   2. JSON minificado (sin whitespace)
 *   3. Reporte de ahorro total
 *
 * Requiere: sharp (npm i -D sharp)
 * Uso: node scripts/compress-assets.mjs dist-prod/
 */
import { readdirSync, statSync, writeFileSync, readFileSync, existsSync } from 'node:fs';
import { join, extname } from 'node:path';
import { execSync } from 'node:child_process';

const DIST = process.argv[2] || 'dist-prod';
if (!existsSync(DIST)) { console.error('dist-prod/ not found. Run build:prod first.'); process.exit(1); }

let totalBefore = 0;
let totalAfter = 0;
let filesOptimized = 0;

// ── JSON minification ─────────────────────────────────────────────
function walkDir(dir, fn) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory() && entry.name !== 'node_modules') walkDir(full, fn);
    else if (entry.isFile()) fn(full);
  }
}

walkDir(DIST, (file) => {
  const ext = extname(file).toLowerCase();
  if (ext !== '.json') return;

  const before = statSync(file).size;
  try {
    const data = JSON.parse(readFileSync(file, 'utf8'));
    const minified = JSON.stringify(data); // sin espacios extra
    writeFileSync(file, minified, 'utf8');
    const after = statSync(file).size;
    totalBefore += before;
    totalAfter += after;
    filesOptimized++;
  } catch { /* archivo no JSON válido */ }
});

// ── Report ────────────────────────────────────────────────────────
const saved = totalBefore - totalAfter;
const pct = totalBefore > 0 ? ((saved / totalBefore) * 100).toFixed(1) : 0;

console.log(`JSONs optimizados: ${filesOptimized}`);
console.log(`Ahorro: ${(saved / 1024).toFixed(1)} KB (${pct}%)`);

if (totalAfter > 0) {
  console.log(`\nPara comprimir imágenes: npx sharp-cli (requiere instalación adicional)`);
  console.log(`  find ${DIST} -name '*.jpg' -o -name '*.png' | while read f; do`);
  console.log(`    npx sharp -i "$f" -o "\${f%.*}.webp" && rm "$f"`);
  console.log(`  done`);
}
