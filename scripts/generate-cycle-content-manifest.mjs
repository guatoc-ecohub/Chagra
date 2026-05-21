#!/usr/bin/env node
/**
 * generate-cycle-content-manifest.mjs
 *
 * Genera public/cycle-content/manifest.json listando los slugs JSON que
 * SÍ existen en el corpus RAG. ragRetriever.js usa este manifest para
 * iterar SOLO sobre archivos presentes en lugar de N fetches del
 * CROP_TAXONOMY entero (~80% de los cuales caían en 404).
 *
 * Bug observado: la primera carga del AgentScreen disparaba ~N fetches
 * a /cycle-content/{slug}.json sin verificación previa. Solo 3-N
 * archivos existen físicamente (fresa, lechuga, tomate_chonto), las
 * demás devolvían 404 mitigado con content-type guard (PR #277) pero
 * con latencia importante en mobile rural. Audit pre-demo-institucional hallazgo #8.
 *
 * Script idempotente. Corre antes de `vite build` vía npm prebuild.
 */

import { readdirSync, writeFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const CYCLE_CONTENT_DIR = join(__dirname, '..', 'public', 'cycle-content');
const MANIFEST_PATH = join(CYCLE_CONTENT_DIR, 'manifest.json');

if (!existsSync(CYCLE_CONTENT_DIR)) {
  console.warn(`[manifest] ${CYCLE_CONTENT_DIR} no existe — skipeando.`);
  process.exit(0);
}

const files = readdirSync(CYCLE_CONTENT_DIR)
  .filter((f) => f.endsWith('.json') && f !== 'manifest.json')
  .map((f) => f.replace(/\.json$/, ''))
  .sort();

const manifest = {
  generated_at: new Date().toISOString(),
  slugs: files,
};

writeFileSync(MANIFEST_PATH, JSON.stringify(manifest, null, 2) + '\n');
console.log(`[manifest] ${MANIFEST_PATH} — ${files.length} slug(s): ${files.join(', ')}`);
