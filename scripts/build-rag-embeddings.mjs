#!/usr/bin/env node
/**
 * build-rag-embeddings.mjs — precómputo de embeddings para RAG semántico (AIA-004).
 *
 * Genera un asset compacto `public/rag-embeddings.json` con vectores 768d
 * por slug del corpus, usando nomic-embed-text via Ollama local.
 *
 * Uso:
 *   node scripts/build-rag-embeddings.mjs
 *   OLLAMA_URL=http://alpha.local:11434 node scripts/build-rag-embeddings.mjs
 *
 * Salida: `public/rag-embeddings.json` → { slug: vector[768], ... }
 *
 * Idempotente: si ya existe, lo sobreescribe.
 * NO corre contra prod sin avisar — es build-time, no runtime.
 *
 * Tamaño esperado: ~491 docs × 768 floats × 4 bytes ≈ 1.5 MB (sin comprimir).
 */

import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');
const MANIFEST_PATH = resolve(ROOT, 'public/cycle-content/manifest.json');
const CORPUS_DIR = resolve(ROOT, 'public/cycle-content');
const OUTPUT_PATH = resolve(ROOT, 'public/rag-embeddings.json');

const OLLAMA_URL = process.env.OLLAMA_URL || 'http://localhost:11434';
const EMBED_MODEL = process.env.RAG_EMBED_MODEL || 'nomic-embed-text';
const BATCH_SIZE = 10;

async function embedTexts(texts) {
  const url = `${OLLAMA_URL}/api/embeddings`;
  const vectors = [];
  for (let i = 0; i < texts.length; i += BATCH_SIZE) {
    const batch = texts.slice(i, i + BATCH_SIZE);
    const batchVectors = await Promise.all(
      batch.map(async (text) => {
        const res = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ model: EMBED_MODEL, prompt: text }),
        });
        if (!res.ok) throw new Error(`Ollama ${res.status}: ${await res.text().catch(() => res.statusText)}`);
        const data = await res.json();
        if (!Array.isArray(data.embedding) || data.embedding.length === 0) {
          throw new Error('Embedding vacío');
        }
        return data.embedding;
      }),
    );
    vectors.push(...batchVectors);
    process.stderr.write(`  [${Math.min(i + BATCH_SIZE, texts.length)}/${texts.length}]\n`);
  }
  return vectors;
}

function extractPassageText(doc) {
  // Concatenamos los pasajes textuales mas representativos: valor_pedagogico,
  // milestones, companions, biopreparados, failure_modes, leccion_agroecologica.
  const parts = [];
  if (doc.valor_pedagogico) parts.push(doc.valor_pedagogico);
  if (Array.isArray(doc.milestones)) {
    doc.milestones.forEach((m) => {
      if (m.label) parts.push(m.label);
      if (m.description) parts.push(m.description);
    });
  }
  if (Array.isArray(doc.companions)) {
    parts.push(doc.companions.map((c) => c.especie || c.nombre || '').filter(Boolean).join(', '));
  }
  if (Array.isArray(doc.failure_modes)) {
    doc.failure_modes.forEach((f) => {
      if (f.mode) parts.push(f.mode);
      if (f.solucion) parts.push(f.solucion);
    });
  }
  if (doc.leccion_agroecologica) parts.push(doc.leccion_agroecologica);
  return parts.join(' ').trim();
}

async function main() {
  console.log('[build-rag-embeddings] Iniciando precómputo de embeddings...');
  console.log(`  Ollama: ${OLLAMA_URL}`);
  console.log(`  Modelo: ${EMBED_MODEL}`);

  if (!existsSync(MANIFEST_PATH)) {
    console.error(`  ERROR: manifest no encontrado en ${MANIFEST_PATH}`);
    process.exit(1);
  }

  const manifest = JSON.parse(readFileSync(MANIFEST_PATH, 'utf8'));
  const slugs = manifest.slugs || [];
  console.log(`  Slugs en manifest: ${slugs.length}`);

  const texts = [];
  const validSlugs = [];
  for (const slug of slugs) {
    const docPath = resolve(CORPUS_DIR, `${slug}.json`);
    if (!existsSync(docPath)) {
      console.warn(`  WARN: ${slug}.json no existe — saltando`);
      continue;
    }
    const doc = JSON.parse(readFileSync(docPath, 'utf8'));
    const text = extractPassageText(doc);
    if (!text) {
      console.warn(`  WARN: ${slug} sin texto extraíble — saltando`);
      continue;
    }
    texts.push(text);
    validSlugs.push(slug);
  }

  console.log(`  Docs con texto: ${validSlugs.length}`);
  console.log(`  Embeddeando en lotes de ${BATCH_SIZE}...`);

  const vectors = await embedTexts(texts);

  const output = {};
  validSlugs.forEach((slug, i) => {
    output[slug] = vectors[i];
  });

  writeFileSync(OUTPUT_PATH, JSON.stringify(output));
  const stats = { slugs: validSlugs.length, dim: vectors[0]?.length || 0, bytes: Buffer.byteLength(JSON.stringify(output), 'utf8') };
  console.log(`  OK — ${stats.slugs} vectores de ${stats.dim}d escritos a ${OUTPUT_PATH}`);
  console.log(`  Tamaño: ${(stats.bytes / 1024).toFixed(1)} KB (${(stats.bytes / (1024 * 1024)).toFixed(2)} MB)`);
}

main().catch((err) => {
  console.error(`[build-rag-embeddings] ERROR: ${err.message}`);
  process.exit(1);
});
