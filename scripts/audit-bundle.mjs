#!/usr/bin/env node
/**
 * audit-bundle.mjs — Auditor post-build del bundle público
 * ========================================================
 * Inspecciona dist/ después de `npm run build` para detectar cualquier
 * string, regex, o archivo que no debería estar ahí per
 * oss-pro/PROHIBITED_IN_PUBLIC.md.
 *
 * Usage:
 *   npm run audit:bundle
 *   o automáticamente encadenado: `npm run build && node scripts/audit-bundle.mjs`
 *
 * Exit codes:
 *   0 — bundle limpio
 *   1 — hits de strings/regex/archivos prohibidos
 *   2 — problema de ejecución (dist/ ausente, lista mal parseada)
 *
 * Ver ADR-015.
 */

import { readFileSync, existsSync, readdirSync, statSync } from 'node:fs';
import { dirname, join, extname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');
const DIST_DIR = join(ROOT, 'dist');
const PROHIBITED_LIST = join(ROOT, 'oss-pro/PROHIBITED_IN_PUBLIC.md');

function die(code, msg) {
  console.error(`\x1b[31m✗ ${msg}\x1b[0m`);
  process.exit(code);
}
function ok(msg) { console.log(`\x1b[32m✓\x1b[0m ${msg}`); }

if (!existsSync(DIST_DIR)) die(2, `dist/ no existe. Corre "npm run build" primero.`);
if (!existsSync(PROHIBITED_LIST)) die(2, `falta ${PROHIBITED_LIST}`);

// Parse oss-pro/PROHIBITED_IN_PUBLIC.md extrayendo:
// - Strings literales de los bullets bajo "## Strings literales"
// - Regex de "## Patrones regex"
// - Archivos completos de "## Archivos completos prohibidos" y "## Catálogos prohibidos"
// - Regex de "## Credenciales y tokens"
// - Regex de "## Direcciones y rangos de red interna"
const listRaw = readFileSync(PROHIBITED_LIST, 'utf8');

function extractBulletStrings(section) {
  // Split por '\n## ' para que cada chunk sea una sección H2; buscar la que
  // arranca con el título dado.
  const chunks = listRaw.split(/\n## /);
  const target = chunks.find((c) => c.trimStart().startsWith(section));
  if (!target) return [];
  return target
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l.startsWith('- '))
    .map((l) => l.slice(2).trim())
    .map((s) => s.replace(/^`/, '').replace(/`.*$/, ''))
    .filter((s) => s && !s.startsWith('**') && !s.startsWith('Nombres y'));
}

const literalStrings = extractBulletStrings('Strings literales');
const regexList = [
  ...extractBulletStrings('Patrones regex'),
  ...extractBulletStrings('Credenciales y tokens (regex)'),
  ...extractBulletStrings('Direcciones y rangos de red interna'),
];

const forbiddenRegexes = regexList
  .map((r) => {
    try { return new RegExp(r); } catch { return null; }
  })
  .filter(Boolean);

// Recorrer dist/ recursivo, leer archivos de texto
function walk(dir) {
  const out = [];
  for (const entry of readdirSync(dir)) {
    const p = join(dir, entry);
    const st = statSync(p);
    if (st.isDirectory()) out.push(...walk(p));
    else out.push(p);
  }
  return out;
}

const TEXT_EXTS = new Set(['.js', '.mjs', '.cjs', '.css', '.html', '.json', '.map', '.txt', '.svg']);
const files = walk(DIST_DIR).filter((f) => TEXT_EXTS.has(extname(f)));

const hits = [];

for (const f of files) {
  let content;
  try {
    content = readFileSync(f, 'utf8');
  } catch { continue; }

  // Literal strings
  for (const s of literalStrings) {
    if (content.includes(s)) hits.push(`[${f.slice(ROOT.length + 1)}] literal "${s}"`);
  }

  // Regex
  for (const r of forbiddenRegexes) {
    const m = content.match(r);
    if (m) hits.push(`[${f.slice(ROOT.length + 1)}] regex ${r.source} → "${String(m[0]).slice(0, 60)}"`);
  }
}

// Archivos que no deberían existir en absoluto
const forbiddenFileGlobs = [
  /\.pro\.(js|ts|jsx|tsx)$/,
  /\.gguf$/,
  /\.safetensors$/,
];
for (const f of files) {
  for (const g of forbiddenFileGlobs) {
    if (g.test(f)) hits.push(`[${f.slice(ROOT.length + 1)}] archivo prohibido por patrón`);
  }
}

// Source maps públicas — ADR-002 exige sourcemap:false en producción
const sourceMaps = files.filter((f) => f.endsWith('.map'));
if (sourceMaps.length > 0) {
  for (const sm of sourceMaps) {
    hits.push(`[${sm.slice(ROOT.length + 1)}] source map — ADR-002 exige sourcemap:false en build público`);
  }
}

console.log('Chagra Bundle Auditor');
console.log(`  dist:     ${DIST_DIR}`);
console.log(`  archivos: ${files.length}`);
console.log(`  literales prohibidos: ${literalStrings.length}`);
console.log(`  regex prohibidas:     ${forbiddenRegexes.length}`);
console.log('');

if (hits.length === 0) {
  ok('Bundle limpio — 0 hits');
  process.exit(0);
}

console.error(`\x1b[31m✗ ${hits.length} hits\x1b[0m`);
for (const h of hits.slice(0, 30)) console.error(`  ${h}`);
if (hits.length > 30) console.error(`  ... +${hits.length - 30} más`);
process.exit(1);
