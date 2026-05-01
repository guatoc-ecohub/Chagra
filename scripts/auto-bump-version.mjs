#!/usr/bin/env node
/**
 * auto-bump-version.mjs — Lefthook pre-commit hook que detecta cambios en
 * archivos críticos (src/**, public/**) y auto-bumpea version + CACHE_NAME
 * si el dev olvidó hacerlo manualmente.
 *
 * Razón: en sesión 2026-04-30/05-01 hubo ~6 conflicts en `package.json` y
 * `public/sw.js` por bumps simultáneos en PRs paralelos. La convención
 * nueva: el dev NO bumpea, el pre-commit hook sí. Cero conflicts.
 *
 * Comportamiento:
 *   1. Detecta archivos críticos staged (src/**, index.html, public/* salvo sw.js).
 *   2. Si NINGÚN crítico cambió → no bumpea (commit docs/scripts/etc).
 *   3. Si SÍ cambió + ni package.json ni sw.js bumpeados → patch-bump ambos auto + git add.
 *   4. Si UNO ya bumpeó manual → bumpea el otro para mantener sync.
 *
 * Idempotente.
 */
import { execSync } from 'child_process';
import { readFileSync, writeFileSync } from 'fs';

const REPO_ROOT = execSync('git rev-parse --show-toplevel').toString().trim();
const PKG = `${REPO_ROOT}/package.json`;
const SW = `${REPO_ROOT}/public/sw.js`;

const TRIGGER_PATTERNS = [
  /^src\//,
  /^public\/(?!sw\.js$)/,
  /^index\.html$/,
];

const SKIP_PATTERNS = [
  /^docs\//,
  /^scripts\//,
  /^\.github\//,
  /^tests\//,
  /\.test\.(js|jsx|ts|tsx)$/,
  /\.spec\.(js|jsx|ts|tsx)$/,
];

function getStagedFiles() {
  const out = execSync('git diff --cached --name-only --diff-filter=ACMR').toString().trim();
  return out ? out.split('\n') : [];
}

function shouldBump(stagedFiles) {
  for (const f of stagedFiles) {
    if (SKIP_PATTERNS.some(p => p.test(f))) continue;
    if (TRIGGER_PATTERNS.some(p => p.test(f))) return true;
  }
  return false;
}

function isStaged(filename) {
  return getStagedFiles().includes(filename);
}

function readPkgVersion() {
  return JSON.parse(readFileSync(PKG, 'utf8')).version;
}

function readSwCacheName() {
  const m = readFileSync(SW, 'utf8').match(/^const CACHE_NAME = '(chagra-v\d+)';/m);
  return m ? m[1] : null;
}

function bumpPatch(v) {
  const p = v.split('.');
  p[2] = String(parseInt(p[2], 10) + 1);
  return p.join('.');
}

function bumpCacheName(name) {
  const m = name.match(/^chagra-v(\d+)$/);
  if (!m) throw new Error(`Unexpected CACHE_NAME: ${name}`);
  return `chagra-v${parseInt(m[1], 10) + 1}`;
}

function writePkgVersion(v) {
  const c = readFileSync(PKG, 'utf8').replace(/"version":\s*"[^"]+"/, `"version": "${v}"`);
  writeFileSync(PKG, c, 'utf8');
}

function writeSwCacheName(n) {
  const c = readFileSync(SW, 'utf8').replace(/^const CACHE_NAME = '[^']+';/m, `const CACHE_NAME = '${n}';`);
  writeFileSync(SW, c, 'utf8');
}

function gitAdd(file) { execSync(`git add ${file}`); }

const staged = getStagedFiles();
if (!shouldBump(staged)) process.exit(0);

const pkgStaged = isStaged('package.json');
const swStaged = isStaged('public/sw.js');

if (pkgStaged && swStaged) {
  console.log('[auto-bump] package.json + sw.js bumpeados manual, skip');
  process.exit(0);
}

const ver = readPkgVersion();
const cache = readSwCacheName();

if (!pkgStaged && !swStaged) {
  const nv = bumpPatch(ver);
  const nc = bumpCacheName(cache);
  writePkgVersion(nv);
  writeSwCacheName(nc);
  gitAdd(PKG);
  gitAdd(SW);
  console.log(`[auto-bump] ${ver} → ${nv} + ${cache} → ${nc} (auto)`);
  process.exit(0);
}

if (pkgStaged && !swStaged) {
  const nc = bumpCacheName(cache);
  writeSwCacheName(nc);
  gitAdd(SW);
  console.log(`[auto-bump] sw.js: ${cache} → ${nc} (sync con package.json)`);
  process.exit(0);
}

if (swStaged && !pkgStaged) {
  const nv = bumpPatch(ver);
  writePkgVersion(nv);
  gitAdd(PKG);
  console.log(`[auto-bump] package.json: ${ver} → ${nv} (sync con sw.js)`);
  process.exit(0);
}
