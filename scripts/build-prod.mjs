#!/usr/bin/env node
/**
 * build-prod.mjs — Build de prod.chagra.app (3D-first)
 *
 * Estrategia:
 *   1. Copia index-prod.html → index.html (backup temporal)
 *   2. Ejecuta vite build --outDir dist-prod
 *   3. Restaura index.html original
 */
import { execSync } from 'node:child_process';
import { copyFileSync, renameSync, existsSync, unlinkSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');
const INDEX = resolve(ROOT, 'index.html');
const INDEX_PROD = resolve(ROOT, 'index-prod.html');
const INDEX_BAK = resolve(ROOT, 'index.html.bak');

try {
  copyFileSync(INDEX, INDEX_BAK);
  copyFileSync(INDEX_PROD, INDEX);
  console.log('[build:prod] Entry swapped → building...');
  execSync('npx vite build --outDir dist-prod', {
    cwd: ROOT,
    stdio: 'inherit',
    timeout: 600_000,
  });
  console.log('[build:prod] Done → dist-prod/');
} finally {
  if (existsSync(INDEX_BAK)) {
    renameSync(INDEX_BAK, INDEX);
  }
}
