#!/usr/bin/env node
/**
 * build-rag-embeddings.mjs — precómputo de embeddings para RAG semántico (AIA-004).
 *
 * Genera un asset compacto `public/rag-embeddings.json` con vectores 1024d
 * por slug del corpus, usando snowflake-arctic-embed2 via Ollama local — el
 * mismo modelo que embedQuery() en src/services/ragRetriever.js usa en runtime
 * (ver Chagra-strategy/ops/MODELS.md, fila "embeddings (RAG)"). Los dos DEBEN
 * coincidir: si se regenera este asset con un modelo/dimensión distinto al de
 * embedQuery(), cosineSimilarity() descarta cada par por longitud de vector
 * desigual y el híbrido degrada a BM25-only en silencio (root cause auditado
 * 2026-07-02, ver comentario en embedQuery()).
 *
 * Uso:
 *   node scripts/build-rag-embeddings.mjs
 *   OLLAMA_URL=http://alpha.local:11434 node scripts/build-rag-embeddings.mjs
 *   RAG_EMBED_MODEL=otro-modelo node scripts/build-rag-embeddings.mjs  # actualizar también embedQuery()
 *
 * Salida: `public/rag-embeddings.json` → { slug: vector[1024], ... }
 *
 * Idempotente: si ya existe, lo sobreescribe.
 * NO corre contra prod sin avisar — es build-time, no runtime.
 *
 * Tamaño esperado: ~491 docs × 1024 floats × 4 bytes ≈ 2.0 MB (sin comprimir,
 * ~1.9 MB con --quantize int8).
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
const EMBED_MODEL = process.env.RAG_EMBED_MODEL || 'snowflake-arctic-embed2';
const BATCH_SIZE = 10;

async function embedTexts(texts) {
  const url = `${OLLAMA_URL}/api/embeddings`;
  const vectors = [];
  for (let i = 0; i < texts.length; i += BATCH_SIZE) {
    const batch = texts.slice(i, i + BATCH_SIZE);
    const batchVectors = await Promise.all(
      batch.map(async (text) => {
        // lgtm[js/file-access-to-http] Este generador local envía únicamente el
        // corpus seleccionado al servicio de embeddings configurado por quien lo ejecuta.
        const res = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          // Default CPU (num_gpu:0): en la M6000 de 12GB el batch OOMea cuando
          // granite (7GB, keep_alive 24h) recarga a mitad del embed (verificado
          // 2026-07-18). En CPU arctic (1.2GB) NO pelea VRAM y no hay que parar
          // el sidecar. Mas lento por vector, aceptable para un regen one-off.
          // CHAGRA_EMBED_GPU=1 fuerza GPU (mas rapido; requiere granite descargado).
          body: JSON.stringify({
            model: EMBED_MODEL,
            prompt: text,
            ...(process.env.CHAGRA_EMBED_GPU === '1'
              ? {}
              : { options: { num_gpu: 0 } }),
          }),
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
  // Clima / altitud / piso termico (RUNPATH 2026-07-15 #9): antes NO se embebian,
  // asi que la capa SEMANTICA nunca recuperaba DONDE crece una mata (complementa
  // el fix BM25 de flattenDoc, #00). Se construyen frases legibles para que nomic
  // capte "clima frio / altura alta", no numeros sueltos.
  if (Array.isArray(doc.thermal_zones) && doc.thermal_zones.length) {
    parts.push(`Piso termico: ${doc.thermal_zones.join(', ')}.`);
  }
  const req = doc.requirements;
  if (req && typeof req === 'object') {
    const alt = req.altitud_msnm;
    if (alt && typeof alt === 'object') {
      const lo = alt.optimo_min ?? alt.min_absoluto;
      const hi = alt.optimo_max ?? alt.max_absoluto;
      if (lo != null && hi != null) parts.push(`Altitud optima: ${lo} a ${hi} msnm.`);
    }
    const temp = req.temperatura_c;
    if (temp && typeof temp === 'object' && temp.optimo_min != null && temp.optimo_max != null) {
      parts.push(`Temperatura optima: ${temp.optimo_min} a ${temp.optimo_max} grados C.`);
    }
    if (typeof req.agua === 'string' && req.agua) parts.push(`Requerimiento de agua: ${req.agua}.`);
  }
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
  // int8 por DEFAULT: el reader (ragRetriever) espera {q:'int8',s,v}; floats
  // crudos rompen el retrieve y pesan 6x (10MB vs 1.6MB). --no-quantize solo para
  // debug. (Antes el default eran floats crudos: footgun real, 2026-07-18.)
  const quantize = !process.argv.includes('--no-quantize');

  if (quantize) {
    // int8 quantization: cada vector 768d float32 → Int8Array + escala
    for (let i = 0; i < validSlugs.length; i++) {
      const vec = vectors[i];
      let maxAbs = 0;
      for (let j = 0; j < vec.length; j++) maxAbs = Math.max(maxAbs, Math.abs(vec[j]));
      const scale = maxAbs / 127;
      const int8 = new Int8Array(vec.length);
      for (let j = 0; j < vec.length; j++) int8[j] = Math.round(vec[j] / scale);
      output[validSlugs[i]] = { q: 'int8', s: Number(scale.toFixed(8)), v: Array.from(int8) };
    }
  } else {
    for (let i = 0; i < validSlugs.length; i++) {
      output[validSlugs[i]] = vectors[i];
    }
  }

  writeFileSync(OUTPUT_PATH, JSON.stringify(output));
  const stats = { slugs: validSlugs.length, dim: vectors[0]?.length || 0, bytes: Buffer.byteLength(JSON.stringify(output), 'utf8') };
  console.log(`  OK — ${stats.slugs} vectores de ${stats.dim}d escritos a ${OUTPUT_PATH}`);
  console.log(`  Tamaño: ${(stats.bytes / 1024).toFixed(1)} KB (${(stats.bytes / (1024 * 1024)).toFixed(2)} MB)`);
}

const IS_CLI = import.meta.url === 'file://' + process.argv[1];

export { main };
export { extractPassageText };

if (IS_CLI) {
  main().catch((err) => {
    console.error(`[build-rag-embeddings] ERROR: ${err.message}`);
    process.exit(1);
  });
}
