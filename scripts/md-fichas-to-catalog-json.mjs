#!/usr/bin/env node
/**
 * md-fichas-to-catalog-json.mjs
 * ================================================================
 * Reconcilia el catálogo según ADR-025: markdown narrativo con
 * frontmatter YAML (source of truth) → JSON estructurado committed
 * para fast-load PWA + CI validation.
 *
 * Uso:
 *   node scripts/md-fichas-to-catalog-json.mjs
 *   node scripts/md-fichas-to-catalog-json.mjs --check  (no escribe)
 *
 * Lee:  docs/species/[0-9]*-*.md  (ignora README.md y -template.md)
 * Lee:  catalog/sources-seed.json     (preserva sin tocar)
 * Lee:  catalog/biopreparados-seed.json  (preserva sin tocar)
 * Escribe: catalog/chagra-catalog-seed-v3.1.json
 *
 * Comportamiento:
 *   - Si una ficha NO tiene frontmatter completo, la SALTA con warning
 *     (no rompe build — coexistencia con fichas legacy hasta migración)
 *   - Las fichas saltadas NO entran al JSON; el JSON conserva las especies
 *     del seed actual que NO tengan ficha markdown asociada
 *   - Fichas con frontmatter sobrescriben la entrada con id correspondiente
 *     en el JSON
 *
 * Exit codes:
 *   0 — OK (incluso con warnings)
 *   1 — Error fatal de IO o JSON inválido
 *   2 — Modo --check + cambios detectados (CI fail)
 *
 * Dependencia: ninguna fuera de stdlib Node. Frontmatter parser
 * minimal inline para evitar requerir npm install.
 *
 * Estado (2026-04-28): script funcional pero las fichas en docs/species/
 * todavía son legacy markdown SIN frontmatter ADR-025 completo. Hasta
 * migrarlas, el seed JSON manual sigue siendo source of truth efectivo.
 * Cuando una ficha se migra a frontmatter completo, el script empieza
 * a emitirla al JSON (sobrescribiendo la versión manual del seed).
 * ================================================================
 */

import { readFileSync, writeFileSync, readdirSync, existsSync } from 'node:fs';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');

const SPECIES_DIR = join(ROOT, 'docs/species');
const SEED_PATH = join(ROOT, 'catalog/chagra-catalog-seed-v3.1.json');

const args = process.argv.slice(2);
const CHECK_MODE = args.includes('--check');

function info(msg) { console.log(`[ok] ${msg}`); }
function warn(msg) { console.warn(`\x1b[33m[warn]\x1b[0m ${msg}`); }
function fail(code, msg) { console.error(`\x1b[31m[fail]\x1b[0m ${msg}`); process.exit(code); }

// ----------------------------------------------------------------
// Frontmatter YAML parser minimal (subset suficiente para fichas).
// Soporta: scalars (string/number/bool), arrays inline + multi-line,
// objects multi-line con indent 2-space, comentarios #.
// NO soporta: anchors, multi-doc, tipos custom, flow style complex.
// Para frontmatter más complejo, instalar `gray-matter` via npm.
// ----------------------------------------------------------------

function parseFrontmatter(content) {
  const match = content.match(/^---\n([\s\S]*?)\n---\n?/);
  if (!match) return { frontmatter: null, body: content };
  const yaml = match[1];
  const body = content.slice(match[0].length);
  return { frontmatter: parseYAML(yaml), body };
}

function parseYAML(yaml) {
  // Implementación minimal — para producción usar js-yaml o gray-matter
  // Suficiente para frontmatter de schema v3.1 con campos planos + objetos
  // simples + arrays. Si falla, return null y el script salta la ficha
  // con warning (defense-in-depth).
  try {
    const lines = yaml.split('\n').filter(l => !l.trim().startsWith('#'));
    const obj = {};
    parseLines(lines, 0, 0, obj);
    return obj;
  } catch (e) {
    return null;
  }
}

function parseLines(lines, i, baseIndent, target) {
  while (i < lines.length) {
    const line = lines[i];
    if (!line.trim()) { i++; continue; }
    const indent = line.match(/^( *)/)[0].length;
    if (indent < baseIndent) return i;
    const trimmed = line.trim();
    const colonIdx = trimmed.indexOf(':');
    if (colonIdx === -1) { i++; continue; }
    const key = trimmed.slice(0, colonIdx).trim();
    const valRaw = trimmed.slice(colonIdx + 1).trim();
    if (valRaw === '' || valRaw === null) {
      // Multi-line value: object or array
      const next = lines[i + 1] || '';
      const nextIndent = next.match(/^( *)/)[0].length;
      if (next.trim().startsWith('-')) {
        // Array
        const arr = [];
        let j = i + 1;
        while (j < lines.length && lines[j].match(/^( *)/)[0].length === nextIndent && lines[j].trim().startsWith('-')) {
          arr.push(parseScalar(lines[j].trim().slice(1).trim()));
          j++;
        }
        target[key] = arr;
        i = j;
      } else if (nextIndent > indent) {
        const subObj = {};
        i = parseLines(lines, i + 1, nextIndent, subObj);
        target[key] = subObj;
      } else {
        target[key] = null;
        i++;
      }
    } else if (valRaw.startsWith('[') && valRaw.endsWith(']')) {
      // Inline array
      const inner = valRaw.slice(1, -1).trim();
      target[key] = inner ? inner.split(',').map(s => parseScalar(s.trim())) : [];
      i++;
    } else {
      target[key] = parseScalar(valRaw);
      i++;
    }
  }
  return i;
}

function parseScalar(s) {
  if (s === 'true') return true;
  if (s === 'false') return false;
  if (s === 'null' || s === '~') return null;
  if (/^-?\d+$/.test(s)) return parseInt(s, 10);
  if (/^-?\d+\.\d+$/.test(s)) return parseFloat(s);
  // Strip quotes
  if ((s.startsWith('"') && s.endsWith('"')) || (s.startsWith("'") && s.endsWith("'"))) {
    return s.slice(1, -1);
  }
  return s;
}

// ----------------------------------------------------------------
// Main pipeline
// ----------------------------------------------------------------

function main() {
  if (!existsSync(SPECIES_DIR)) {
    warn(`docs/species/ no existe — nada que procesar. Creando estructura base.`);
    // Salir limpio, no es error
    process.exit(0);
  }

  const seed = JSON.parse(readFileSync(SEED_PATH, 'utf8'));
  const seedSpeciesById = new Map((seed.species || []).map(s => [s.id, s]));

  const fichas = readdirSync(SPECIES_DIR)
    .filter(f => /^\d+-.+\.md$/.test(f) && f !== 'README.md');

  let migrated = 0;
  let skipped = 0;

  for (const ficha of fichas) {
    const fullPath = join(SPECIES_DIR, ficha);
    const content = readFileSync(fullPath, 'utf8');
    const { frontmatter } = parseFrontmatter(content);

    if (!frontmatter || !frontmatter.id) {
      warn(`${ficha}: sin frontmatter o sin campo 'id' — saltada (legacy ficha narrativa)`);
      skipped++;
      continue;
    }

    // Fichas con frontmatter sobrescriben entrada del seed
    seedSpeciesById.set(frontmatter.id, frontmatter);
    migrated++;
    info(`${ficha} → species[${frontmatter.id}]`);
  }

  // Reconstruir species[] ordenado alfabéticamente por id (output determinístico)
  const species = Array.from(seedSpeciesById.values()).sort((a, b) =>
    (a.id || '').localeCompare(b.id || ''));

  const newSeed = { ...seed, species };

  // Update generated_at metadata si existe
  if (newSeed.generated_at !== undefined) {
    newSeed.generated_at = new Date().toISOString().slice(0, 10);
    newSeed.generated_by = 'md-fichas-to-catalog-json.mjs';
  }

  const newJSON = JSON.stringify(newSeed, null, 2) + '\n';
  const oldJSON = readFileSync(SEED_PATH, 'utf8');

  if (CHECK_MODE) {
    if (newJSON === oldJSON) {
      info(`Catalog sync ✓ (${migrated} migradas, ${skipped} saltadas, ${seedSpeciesById.size} total species)`);
      process.exit(0);
    } else {
      fail(2, `Catalog drift detectado — corre sin --check para regenerar`);
    }
  }

  if (newJSON === oldJSON) {
    info(`Catalog sin cambios (${migrated} migradas, ${skipped} saltadas, ${seedSpeciesById.size} total)`);
  } else {
    writeFileSync(SEED_PATH, newJSON);
    info(`Catalog regenerado: ${SEED_PATH}`);
    info(`  ${migrated} fichas migradas, ${skipped} saltadas, ${seedSpeciesById.size} species totales`);
  }
}

try {
  main();
} catch (e) {
  fail(1, e.message);
}
