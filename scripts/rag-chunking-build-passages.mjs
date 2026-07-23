#!/usr/bin/env node
/**
 * rag-chunking-build-passages.mjs — corpus PASSAGE-LEVEL para el experimento
 * exp/rag-chunking-passages (NO toca prod).
 *
 * Hoy prod tiene UN vector por especie (chunking grueso): extractPassageText()
 * en build-rag-embeddings.mjs aplasta toda la ficha en un texto y lo embebe una
 * vez. Este script hace lo contrario: usa el flattenDoc() REAL de
 * src/services/ragRetriever.js para sacar los N passages de cada ficha y embebe
 * CADA passage por separado con el MISMO modelo que prod (nomic-embed-text, 768d).
 *
 * Hallazgo de dimensionado (rag-chunking-count.mjs): 501 fichas → 20.201 passages,
 * pero solo 3.909 TEXTOS ÚNICOS (mucho boilerplate compartido entre especies:
 * labels de milestones, campos contextuales "clima templado", nombres de
 * companions...). Por eso embebemos los textos ÚNICOS una sola vez y reusamos el
 * vector para cada (slug,key) que lo repite — 5× menos llamadas a Ollama.
 *
 * Salidas (data/rag-chunking-exp/, gitignored — son grandes):
 *   1. rag-embeddings-passages.json  — corpus passage-level DEDUPADO:
 *        { model, dim, generated_at, total_passages, unique_texts,
 *          texts: { <id>: number[768] },              // 3.909 vectores únicos
 *          passages: [ { slug, key, t: <id> } ] }     // 20.201 refs
 *      (La forma literal {slug,key,vector[]} × 20.201 pesaría ~140MB; deduped ~27MB.)
 *   2. rag-embeddings-docflat.json   — arm de control: { slug: number[768] }
 *      con el vector del TEXTO CONCATENADO de flattenDoc por ficha (mismo
 *      contenido que los passages, pero 1 vector/especie). Aísla el efecto
 *      "más contenido" del efecto "chunking fino".
 *
 * Uso:
 *   OLLAMA_URL=http://alpha.local:11434 node scripts/rag-chunking-build-passages.mjs
 */
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import { register } from 'node:module';
import { performance } from 'node:perf_hooks';

register(new URL('./bench-rag-retrieve.loader.mjs', import.meta.url).href);

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');
const CORPUS_DIR = resolve(ROOT, 'public', 'cycle-content');
const MANIFEST_PATH = resolve(CORPUS_DIR, 'manifest.json');
const OUT_DIR = resolve(ROOT, 'data', 'rag-chunking-exp');

const OLLAMA_URL = process.env.OLLAMA_URL || 'http://localhost:11434';
const EMBED_MODEL = process.env.RAG_EMBED_MODEL || 'nomic-embed-text';
const CONCURRENCY = Number.parseInt(process.env.RAG_EMBED_CONCURRENCY || '8', 10);
// nomic-embed-text en este Ollama tiene ctx ~2048 tokens y devuelve HTTP 500
// ("input length exceeds the context length") con textos largos (verificado:
// falla >~6000 chars de prosa densa, OK a 5000). num_ctx NO lo extiende. Los
// passages > este budget se truncan a los primeros N chars antes de embeber
// (mismo régimen de contexto por defecto con el que se construyó el corpus
// doc-level de prod). Afecta a un puñado de outliers (<2% de los textos únicos);
// se cuenta y se reporta.
const TRUNCATE_CHARS = Number.parseInt(process.env.RAG_EMBED_TRUNCATE_CHARS || '5000', 10);
let truncatedPassages = 0;
let truncatedConcats = 0;

const { flattenDoc } = await import('../src/services/ragRetriever.js');

function textId(text) {
  return createHash('sha1').update(text).digest('hex').slice(0, 12);
}

async function embedOne(text, tries = 3) {
  for (let attempt = 1; attempt <= tries; attempt += 1) {
    try {
      const res = await fetch(`${OLLAMA_URL}/api/embeddings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        // Mismo contrato que prod: prompt crudo, sin prefijos search_query/document.
        body: JSON.stringify({ model: EMBED_MODEL, prompt: text }),
      });
      if (!res.ok) throw new Error(`ollama ${res.status}: ${await res.text().catch(() => res.statusText)}`);
      const data = await res.json();
      if (!Array.isArray(data.embedding) || data.embedding.length === 0) throw new Error('embedding vacío');
      return data.embedding;
    } catch (err) {
      if (attempt === tries) throw err;
      await new Promise((r) => setTimeout(r, 400 * attempt));
    }
  }
  throw new Error('unreachable');
}

// Embebe una lista de textos con concurrencia acotada. Devuelve Map<text, vec>.
async function embedTexts(texts, label) {
  const out = new Map();
  let done = 0;
  const t0 = performance.now();
  for (let i = 0; i < texts.length; i += CONCURRENCY) {
    const batch = texts.slice(i, i + CONCURRENCY);
    const vecs = await Promise.all(batch.map((t) => embedOne(t)));
    batch.forEach((t, j) => out.set(t, vecs[j]));
    done += batch.length;
    if (done % 200 === 0 || done === texts.length) {
      const rate = done / ((performance.now() - t0) / 1000);
      process.stderr.write(`  [${label}] ${done}/${texts.length} (${rate.toFixed(1)}/s)\n`);
    }
  }
  return out;
}

async function main() {
  console.log('=== rag-chunking-build-passages ===');
  console.log(`  Ollama: ${OLLAMA_URL}  modelo: ${EMBED_MODEL}  concurrencia: ${CONCURRENCY}`);
  mkdirSync(OUT_DIR, { recursive: true });

  const manifest = JSON.parse(readFileSync(MANIFEST_PATH, 'utf8'));
  const slugs = manifest.slugs || [];

  // 1. Extraer passages (flattenDoc REAL) + texto concatenado por ficha.
  const passages = [];            // { slug, key, text }
  const concatBySlug = new Map();  // slug -> texto concatenado de sus passages
  for (const slug of slugs) {
    const p = resolve(CORPUS_DIR, `${slug}.json`);
    if (!existsSync(p)) continue;
    const doc = JSON.parse(readFileSync(p, 'utf8'));
    const flat = flattenDoc(doc, '', slug);
    if (flat.length === 0) continue;
    for (const pg of flat) {
      let text = pg.text;
      if (text.length > TRUNCATE_CHARS) { text = text.slice(0, TRUNCATE_CHARS); truncatedPassages += 1; }
      passages.push({ slug, key: pg.key, text });
    }
    let concat = flat.map((pg) => pg.text).join(' ');
    if (concat.length > TRUNCATE_CHARS) { concat = concat.slice(0, TRUNCATE_CHARS); truncatedConcats += 1; }
    concatBySlug.set(slug, concat);
  }
  const uniqueTexts = [...new Set(passages.map((p) => p.text))];
  console.log(`  Fichas: ${concatBySlug.size}  passages: ${passages.length}  textos únicos: ${uniqueTexts.length}`);
  console.log(`  Truncados a ${TRUNCATE_CHARS} chars — passages: ${truncatedPassages}/${passages.length}  concats(docflat): ${truncatedConcats}/${concatBySlug.size}`);

  // 2. Embeber textos ÚNICOS de passages.
  console.log('  Embebiendo textos únicos de passages...');
  const vecByText = await embedTexts(uniqueTexts, 'passages');
  const dim = vecByText.get(uniqueTexts[0]).length;

  // 3. Escribir corpus passage-level deduplicado.
  const texts = {};
  for (const t of uniqueTexts) texts[textId(t)] = vecByText.get(t);
  const passageRefs = passages.map((p) => ({ slug: p.slug, key: p.key, t: textId(p.text) }));
  const passageCorpus = {
    model: EMBED_MODEL,
    dim,
    generated_at: new Date().toISOString(),
    total_passages: passages.length,
    unique_texts: uniqueTexts.length,
    truncate_chars: TRUNCATE_CHARS,
    truncated_passages: truncatedPassages,
    texts,
    passages: passageRefs,
  };
  const passagesPath = resolve(OUT_DIR, 'rag-embeddings-passages.json');
  writeFileSync(passagesPath, JSON.stringify(passageCorpus));
  console.log(`  OK passage-level → ${passagesPath} (${(Buffer.byteLength(JSON.stringify(passageCorpus)) / 1e6).toFixed(1)} MB)`);

  // 4. Arm de control: 1 vector por ficha con el texto CONCATENADO (flattenDoc).
  console.log('  Embebiendo texto concatenado por ficha (arm docflat)...');
  const concatSlugs = [...concatBySlug.keys()];
  const concatTexts = concatSlugs.map((s) => concatBySlug.get(s));
  const vecByConcat = await embedTexts(concatTexts, 'docflat');
  const docflat = {};
  concatSlugs.forEach((s, i) => { docflat[s] = vecByConcat.get(concatTexts[i]); });
  const docflatPath = resolve(OUT_DIR, 'rag-embeddings-docflat.json');
  writeFileSync(docflatPath, JSON.stringify(docflat));
  console.log(`  OK docflat → ${docflatPath} (${Object.keys(docflat).length} vectores)`);

  console.log('=== build listo ===');
}

main().catch((err) => {
  console.error('[build-passages] FATAL:', err?.stack || err?.message || err);
  process.exit(1);
});
