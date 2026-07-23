#!/usr/bin/env node
/**
 * build-rag-embeddings.mjs — precómputo de embeddings para RAG semántico (AIA-004).
 *
 * Genera un asset compacto `public/rag-embeddings.json` con un vector 768d por
 * slug del corpus, usando nomic-embed-text via Ollama local — el mismo modelo
 * que embedQuery() en src/services/ragRetriever.js usa en runtime (ver
 * Chagra-strategy/ops/MODELS.md, fila "embeddings (RAG)"; migrado de
 * snowflake-arctic-embed2 1024d → nomic-embed-text 768d el 2026-07-23). Los dos
 * DEBEN coincidir: si se regenera este asset con un modelo/dimensión distinto al
 * de embedQuery(), cosineSimilarity() descarta cada par por longitud de vector
 * desigual y el híbrido degrada a BM25-only en silencio (root cause auditado
 * 2026-07-02, ver comentario en embedQuery()).
 *
 * Uso:
 *   node scripts/build-rag-embeddings.mjs
 *   OLLAMA_URL=http://alpha.local:11434 node scripts/build-rag-embeddings.mjs
 *   RAG_EMBED_MODEL=otro-modelo node scripts/build-rag-embeddings.mjs  # actualizar también embedQuery()
 *
 * Salida: `public/rag-embeddings.json` → { slug: vector[768], ... }
 *
 * Idempotente: si ya existe, lo sobreescribe.
 * NO corre contra prod sin avisar — es build-time, no runtime.
 *
 * Tamaño esperado: ~501 docs × 768 floats × 4 bytes ≈ 1.5 MB (sin comprimir,
 * ~0.5 MB con --quantize int8).
 *
 * TEXTO EMBEBIDO (extractPassageText): el vector encabeza con la IDENTIDAD de la
 * especie (common_names + scientific_name + family) ANTES del cuerpo pedagógico.
 * Sin esa cabecera el embedding queda dominado por `valor_pedagogico` (prosa
 * botánica genérica compartida) y la ficha no recupera ni su propio nombre común
 * — medido: self-retrieval recall@5 de 31,2 %→47,4 % (+16,2 pp sobre 500
 * especies) al anteponer la identidad. Ver ops/informes/rag-cultivos-cero-2026-07-23.md.
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

// Cabecera de IDENTIDAD de la ficha: nombres comunes + nombre científico +
// familia. Presente en 501/501 fichas del corpus (common_names, scientific_name,
// family). Se antepone al cuerpo para que el embedding codifique QUIÉN es la
// especie, no solo la prosa pedagógica.
function identityHeader(doc) {
  const commons = Array.isArray(doc.common_names)
    ? doc.common_names.filter(Boolean).join(', ')
    : (typeof doc.common_names === 'string' ? doc.common_names.trim() : '');
  const sci = typeof doc.scientific_name === 'string' ? doc.scientific_name.trim() : '';
  const fam = typeof doc.family === 'string' ? doc.family.trim() : '';
  return [commons, sci && `(${sci})`, fam && `familia ${fam}`]
    .filter(Boolean)
    .join(' ')
    .trim();
}

function extractPassageText(doc) {
  // ROOT CAUSE (auditado 2026-07-23, ver ops/informes/rag-cultivos-cero-2026-07-23.md):
  // antes esta función embebía SOLO el cuerpo pedagógico (valor_pedagogico +
  // milestones/companions/failure_modes, que solo existen en ~12/501 fichas). El
  // vector quedaba dominado por prosa botánica genérica y compartida (~80 % del
  // corpus es boilerplate repetido), de modo que la ficha NO recuperaba ni su
  // propio nombre común: self-retrieval semántico (nombre común → slug) daba
  // recall@5 31,2 % sobre 500 especies (66 % de las fichas no aparecían ni en el
  // top-5 de su propio nombre; ej. «Papa Pastusa Suprema» rankeaba #199 de sí
  // misma). Ejemplo café-vs-plátano en el informe.
  //
  // FIX medido: anteponer la cabecera de identidad (common_names +
  // scientific_name + family, presentes en 501/501) sube self-retrieval a
  // recall@5 47,4 % (+16,2 pp) sin bajar las fichas que ya funcionaban, y es
  // neutro sobre el golden de queries reales (el híbrido ya las rescataba vía
  // BM25). Un prefijo de tarea nomic ("search_document:"/"search_query:") suma
  // otros ~+1,8 pp pero exige cambiar embedQuery() en lockstep (invariante de
  // modelo); se deja documentado, no cableado aquí.
  const parts = [];

  const header = identityHeader(doc);
  if (header) parts.push(header);

  // Cuerpo pedagógico + pasajes representativos (comportamiento previo).
  const body = [];
  if (doc.valor_pedagogico) body.push(doc.valor_pedagogico);
  if (Array.isArray(doc.milestones)) {
    doc.milestones.forEach((m) => {
      if (m.label) body.push(m.label);
      if (m.description) body.push(m.description);
    });
  }
  if (Array.isArray(doc.companions)) {
    body.push(doc.companions.map((c) => c.especie || c.nombre || '').filter(Boolean).join(', '));
  }
  if (Array.isArray(doc.failure_modes)) {
    doc.failure_modes.forEach((f) => {
      if (f.mode) body.push(f.mode);
      if (f.solucion) body.push(f.solucion);
    });
  }
  if (doc.leccion_agroecologica) body.push(doc.leccion_agroecologica);

  const bodyText = body.join(' ').trim();
  if (bodyText) parts.push(bodyText);

  return parts.join('. ').trim();
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
  const quantize = process.argv.includes('--quantize');

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
