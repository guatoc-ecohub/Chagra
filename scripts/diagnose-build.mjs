#!/usr/bin/env node
/**
 * diagnose-build.mjs — Diagnóstico rápido de causas conocidas de fallo del build.
 *
 * Uso:
 *   node scripts/diagnose-build.mjs
 *
 * Chequea:
 *   1. Integridad de better-sqlite3 (ABI match).
 *   2. Estado de public/catalog.sqlite (no borrado por hooks previos).
 *   3. Permisos del directorio dist/.
 *
 * Códigos de salida: 0 = todo ok, 1 = error diagnosticado.
 */

import { existsSync, readdirSync, statSync, writeFileSync, unlinkSync } from 'node:fs';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);

let exitCode = 0;
const fail = (msg) => { console.error('[FAIL]', msg); exitCode = 1; };
const ok = (msg) => console.log('[OK]', msg);

console.log(`Node.js: ${process.versions.node}, V8: ${process.versions.v8}, ${process.platform} ${process.arch}`);
console.log('');

// 1. Check better-sqlite3 ABI
try {
  const sqlite = require('better-sqlite3');
  const db = new sqlite(':memory:');
  db.exec('SELECT 1 AS test');
  const row = db.prepare('SELECT 1 AS test').get();
  db.close();
  if (row && row.test === 1) {
    ok('better-sqlite3 ABI match');
  } else {
    fail('better-sqlite3 respondió con resultado inesperado');
  }
} catch (err) {
  const msg = err.message || String(err);
  if (msg.includes('was compiled against a different Node.js version')) {
    fail(`ABI mismatch en better-sqlite3. Node ${process.versions.node} requiere reconstrucción.`);
    console.error('  npm rebuild better-sqlite3');
  } else if (msg.includes('Cannot find module')) {
    fail('better-sqlite3 no instalado. Ejecuta: npm install');
  } else {
    fail(`better-sqlite3: ${msg}`);
  }
}

// 2. Check catalog.sqlite
const catalogPath = 'public/catalog.sqlite';
if (existsSync(catalogPath)) {
  const st = statSync(catalogPath);
  if (st.size > 1000) {
    ok(`catalog.sqlite presente (${(st.size / 1024 / 1024).toFixed(1)} MB)`);
  } else {
    fail(`catalog.sqlite sospechosamente pequeño: ${st.size} bytes`);
  }
} else {
  fail('Falta public/catalog.sqlite. Regenerar: node scripts/build-cycle-content.mjs');
}

// 3. Dist directory writable
if (existsSync('dist')) {
  try {
    const testFile = 'dist/.build-diagnostic-write-test';
    writeFileSync(testFile, 'ok');
    unlinkSync(testFile);
    ok('dist/ tiene permisos de escritura');
  } catch (_) {
    fail('dist/ sin permisos de escritura');
  }
} else {
  ok('dist/ no existe (se creará en el build)');
}

// 4. node_modules integridad (rápido)
const keyDeps = ['vite', 'react', 'react-dom', 'better-sqlite3'];
const missing = keyDeps.filter(d => {
  try { require(d); return false; } catch { return true; }
});
if (missing.length === 0) {
  ok(`Dependencias clave presentes (${keyDeps.join(', ')})`);
} else {
  fail(`Faltan dependencias: ${missing.join(', ')}`);
}

console.log('');
if (exitCode === 0) {
  console.log('✅ Diagnóstico: todo OK. npm run build debería funcionar.');
} else {
  console.log('❌ Problemas detectados. Revisa [FAIL] arriba.');
}
process.exit(exitCode);
