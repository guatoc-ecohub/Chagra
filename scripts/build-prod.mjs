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
import { copyFileSync, renameSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');
const INDEX = resolve(ROOT, 'index.html');
const INDEX_PROD = resolve(ROOT, 'index-prod.html');
const INDEX_BAK = resolve(ROOT, 'index.html.bak');
const SW_DIST = resolve(ROOT, 'dist-prod', 'sw.js');

try {
  copyFileSync(INDEX, INDEX_BAK);
  copyFileSync(INDEX_PROD, INDEX);
  console.log('[build:prod] Entry swapped → building...');
  execSync('npx vite build --outDir dist-prod', {
    cwd: ROOT,
    stdio: 'inherit',
    timeout: 600_000,
  });

  // Post-build: renombrar CACHE_NAME de `chagra-<sha>` a `chagra-prodapp-<sha>`
  // para que prod.chagra.app tenga su propio bucket de cache y no colisione
  // con chagra.app (dev/staging). El SW se versiona por SHA del bundle, pero
  // el prefijo distinto garantiza que un deploy de prod no pise el cache de
  // dev y viceversa. Además evita que el SW de prod sirva assets de dev.
  try {
    let sw = readFileSync(SW_DIST, 'utf8');
    sw = sw.replace(/`chagra-\$\{SW_BUILD_SHA\}`/g, '`chagra-prodapp-${SW_BUILD_SHA}`');
    sw = sw.replace(/'chagra-dev'/g, "'chagra-prodapp-dev'");
    writeFileSync(SW_DIST, sw, 'utf8');
    console.log('[build:prod] SW CACHE_NAME → chagra-prodapp- prefixed');
  } catch (error) {
    if (error?.code !== 'ENOENT') throw error;
  }

  console.log('[build:prod] Done → dist-prod/');
} finally {
  try {
    renameSync(INDEX_BAK, INDEX);
  } catch (error) {
    if (error?.code !== 'ENOENT') throw error;
  }
}
