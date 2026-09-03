#!/usr/bin/env node
/**
 * rag-chunking-count.mjs — dimensiona el corpus passage-level ANTES de embeber.
 *
 * Importa el `flattenDoc()` REAL de src/services/ragRetriever.js (vía el loader
 * que ya usa bench-rag-retrieve.mjs para stubear las deps de browser) y cuenta
 * cuántos passages saldrían por especie y en total. No embebe nada — solo mide.
 *
 * Uso: node --import ./scripts/bench-rag-retrieve.loader.mjs scripts/rag-chunking-count.mjs
 */
import { readFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { register } from 'node:module';

register(new URL('./bench-rag-retrieve.loader.mjs', import.meta.url).href);

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');
const CORPUS_DIR = resolve(ROOT, 'public', 'cycle-content');
const MANIFEST_PATH = resolve(CORPUS_DIR, 'manifest.json');

const { flattenDoc } = await import('../src/services/ragRetriever.js');

const manifest = JSON.parse(readFileSync(MANIFEST_PATH, 'utf8'));
const slugs = manifest.slugs || [];

let totalPassages = 0;
let docsWithText = 0;
const perDoc = [];
const uniqueTexts = new Set();

for (const slug of slugs) {
  const p = resolve(CORPUS_DIR, `${slug}.json`);
  if (!existsSync(p)) continue;
  const doc = JSON.parse(readFileSync(p, 'utf8'));
  const passages = flattenDoc(doc, '', slug);
  if (passages.length > 0) docsWithText += 1;
  totalPassages += passages.length;
  perDoc.push(passages.length);
  passages.forEach((pg) => uniqueTexts.add(pg.text));
}

perDoc.sort((a, b) => a - b);
const sum = perDoc.reduce((s, n) => s + n, 0);
const avg = sum / perDoc.length;
const median = perDoc[Math.floor(perDoc.length / 2)];
const p95 = perDoc[Math.floor(perDoc.length * 0.95)];

console.log(JSON.stringify({
  slugs_in_manifest: slugs.length,
  docs_with_passages: docsWithText,
  total_passages: totalPassages,
  unique_passage_texts: uniqueTexts.size,
  passages_per_doc: {
    min: perDoc[0],
    median,
    avg: Number(avg.toFixed(1)),
    p95,
    max: perDoc[perDoc.length - 1],
  },
}, null, 2));
