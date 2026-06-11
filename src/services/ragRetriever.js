import { CROP_TAXONOMY } from '../config/taxonomy';
import { recordRagEvent } from './ragTelemetry';
import { getAllSpecies } from '../db/catalogDB';
import { expandQueryTokens } from './ragSynonyms';

const CORPUS_PATH = '/cycle-content/';
const EMBEDDINGS_PATH = '/rag-embeddings.json';

const BM25_PARAMS = {
  k1: 1.5,
  b: 0.75,
};

// RRF (Reciprocal Rank Fusion): parámetro de suavizado. k=60 es el
// estándar empírico (Cormack et al. 2009, TREC). No requiere calibrar
// contra el dataset — la fusión es parameter-free en la práctica.
const RRF_K = 60;

// Peso relativo BM25 vs semántico en la fusión RRF. 1.0 = mismo peso.
// BM25 1.0 + semántico 1.0 = ambos contribuyen igual.
const BM25_WEIGHT = 1.0;
const SEMANTIC_WEIGHT = 1.0;

let corpusCache = null;
let avgDocLen = 0;

// Embeddings precomputados: { slug -> Float32Array(768) }.
// Se cargan lazy la primera vez que se necesita una query semántica.
let embeddingsCache = null;
let embeddingsLoadPromise = null;

// Promesa en vuelo de loadCorpus(). Sin esto, dos callers concurrentes
// (ej. pre-warm fire-and-forget + primera query del usuario que llega antes
// de que el pre-warm complete) dispararían DOS cargas completas del corpus en
// paralelo — 2× los fetches de ~491 docs. Coalescemos: si ya hay una carga en
// vuelo, todos los callers esperan la misma promesa.
let corpusLoadPromise = null;

// Concurrencia del prefetch de docs del corpus. El bug de prod (2026-06-02):
// loadCorpus hacía `for (const slug) { await fetch }` SERIAL sobre los ~491
// slugs del manifest → ~491 × ~390ms = ~3.2min bloqueando la primera query de
// cada sesión (incluido un simple saludo), y el chat nunca respondía. Con
// batches acotados de 12, los fetches corren en paralelo de a 12 → ~15-20s.
// El límite evita saturar la conexión móvil rural o gatillar throttling del
// servidor (no queremos 491 sockets simultáneos). La lógica per-doc
// (flattenDoc + pre-tokenize) se conserva idéntica; solo cambia serial→batch.
const CORPUS_FETCH_CONCURRENCY = 12;

function tokenize(text) {
  if (!text || typeof text !== 'string') return [];
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\w\sáéíóúñ]/g, ' ')
    .split(/\s+/)
    .filter((t) => t.length > 2);
}

function buildInvertedIndex(docs) {
  const df = new Map();
  docs.forEach((doc) => {
    // Cada doc trae `tokenized` ya pre-computado en loadCorpus.
    // Usamos Set para contar document frequency (DF) — un término que
    // aparece N veces en el mismo doc cuenta como 1 para DF.
    const terms = new Set(doc.tokenized);
    terms.forEach((term) => {
      df.set(term, (df.get(term) || 0) + 1);
    });
  });
  return df;
}

function computeIDF(df, N) {
  const idf = new Map();
  df.forEach((freq, term) => {
    idf.set(term, Math.log((N - freq + 0.5) / (freq + 0.5) + 1));
  });
  return idf;
}

/**
 * Calcula score BM25 contra un doc.
 *
 * Requiere que `doc` traiga pre-computados `termCounts: Map<term, count>` y
 * `docLen: number` (lo hace `loadCorpus` una sola vez en carga del corpus).
 * Antes esta función re-tokenizaba el texto del doc en cada query × cada doc,
 * generando 500ms–2s de bloqueo del main thread con 5K–15K passages y query
 * de 4 términos. El pre-tokenize bajó el costo a O(|queryTerms|) por doc.
 */
function scoreBM25(doc, queryTerms, idf, avgLen) {
  let score = 0;
  const docLen = doc.docLen;
  const termCounts = doc.termCounts;
  queryTerms.forEach((term) => {
    const tf = termCounts.get(term) || 0;
    if (tf > 0) {
      const idfVal = idf.get(term) || 0;
      const tfNorm = (tf * (BM25_PARAMS.k1 + 1)) / (tf + BM25_PARAMS.k1 * (1 - BM25_PARAMS.b + (BM25_PARAMS.b * docLen) / avgLen));
      score += idfVal * tfNorm;
    }
  });
  return score;
}

function flattenDoc(doc, prefix = '', speciesSlug = null) {
  const slug = speciesSlug || doc.species_slug || '';
  const passages = [];
  const addPassage = (key, val) => {
    if (typeof val === 'string' && val.length > 20) {
      passages.push({ key: `${prefix}${key}`, text: val, species: slug });
    } else if (Array.isArray(val)) {
      val.forEach((item, i) => {
        if (typeof item === 'string' && item.length > 20) {
          passages.push({ key: `${prefix}${key}[${i}]`, text: item, species: slug });
        } else if (typeof item === 'object' && item !== null) {
          flattenDoc(item, `${prefix}${key}[${i}].`, slug).forEach((p) => passages.push(p));
        }
      });
    } else if (typeof val === 'object' && val !== null) {
      flattenDoc(val, `${prefix}${key}.`, slug).forEach((p) => passages.push(p));
    }
  };

  Object.entries(doc).forEach(([k, v]) => addPassage(k, v));
  return passages;
}

/**
 * Lee public/cycle-content/manifest.json para saber qué slugs JSON
 * existen físicamente. Sin manifest, el loader iteraba el CROP_TAXONOMY
 * entero (~30+ species) haciendo fetch a cada slug → mayoría 404 +
 * fallback SPA HTML (mitigado por content-type guard) → latencia mobile
 * rural. Audit pre-demo-institucional hallazgo #8.
 *
 * El manifest se genera en build time (scripts/generate-cycle-content-manifest.mjs).
 * Si el manifest no existe o falla la carga, fallback al comportamiento
 * legacy (iterar CROP_TAXONOMY).
 */
async function loadManifest() {
  try {
    const res = await fetch(`${CORPUS_PATH}manifest.json`);
    if (!res.ok) return null;
    const ct = res.headers.get('content-type') || '';
    if (!ct.includes('json')) return null;
    const data = await res.json();
    if (!Array.isArray(data?.slugs)) return null;
    return data.slugs;
  } catch (_) {
    return null;
  }
}

/**
 * Carga UN slug del corpus y devuelve sus passages pre-tokenizados.
 *
 * Extraído del loop de loadCorpus sin cambiar la lógica per-doc: mismo
 * content-type guard, mismo flattenDoc, mismo pre-tokenize (tokenized /
 * termCounts / docLen). Se separa solo para poder dispararlo en paralelo
 * acotado (ver loadCorpus). Devuelve [] ante 404, no-json o error de red
 * (degradación silenciosa: un doc faltante no debe tumbar el corpus entero).
 */
async function loadSlugDocs(slug) {
  try {
    const res = await fetch(`${CORPUS_PATH}${slug}.json`);
    if (!res.ok) return [];
    const ct = res.headers.get('content-type') || '';
    if (!ct.includes('json')) return [];
    const data = await res.json();
    const passages = flattenDoc(data);
    passages.forEach((p) => {
      // Pre-tokenize cada passage una sola vez en carga del corpus.
      // Trade-off de memoria: ~2-5MB extra para 10K docs con ~50 tokens promedio
      // (tokenized[] + termCounts Map). Aceptable a cambio de evitar re-tokenizar
      // 5K-15K docs × cada query (que bloqueaba el main thread 500ms-2s y
      // generaba la latencia post-voz que motivó ese fix).
      const tokenized = tokenize(p.text);
      const termCounts = new Map();
      tokenized.forEach((t) => termCounts.set(t, (termCounts.get(t) || 0) + 1));
      p.tokenized = tokenized;
      p.termCounts = termCounts;
      p.docLen = tokenized.length;
    });
    return passages;
  } catch (e) {
    console.warn(`[RAG] Failed to load ${slug}:`, e);
    return [];
  }
}

/**
 * Implementación real de la carga del corpus. NO llamar directo — usar
 * loadCorpus(), que coalesce llamadas concurrentes en una sola promesa.
 */
async function buildCorpus() {
  // Manifest first: si existe, itera solo los slugs presentes.
  // Fallback: iterar CROP_TAXONOMY (legacy, con N-3 fetches fallidos).
  const manifestSlugs = await loadManifest();
  let species = manifestSlugs ?? Object.values(CROP_TAXONOMY).flatMap((group) =>
    group.species.map((sp) => sp.id)
  );

  // Tier gate (SEC-002 / UXC-004): filtrar slugs contra el catalogo activo.
  // En OSS el catalogo tiene ~263 especies; el manifest ~491. Los ~296 slugs
  // sin entrada en el catalogo NO deben groundearse para evitar leak de
  // contenido Pro a usuarios OSS. Degradacion: si el catalogo falla, se
  // cargan todos los slugs (mejor grounding completo que ninguno).
  try {
    const catalogSpecies = await getAllSpecies();
    if (catalogSpecies && catalogSpecies.length > 0) {
      const allowedIds = new Set(catalogSpecies.map((s) => s.id));
      const before = species.length;
      species = species.filter((slug) => allowedIds.has(slug));
      if (before !== species.length) {
        console.info(`[RAG] Tier gate: ${before} slugs en manifest, ${species.length} dentro del catalogo (${before - species.length} excluidos).`);
      }
    }
  } catch (err) {
    console.warn('[RAG] No se pudo cargar el catalogo para tier-gate — cargando todos los slugs:', err?.message);
  }

  const docs = [];

  // Prefetch PARALELO-ACOTADO: en vez del loop serial que bloqueaba ~3min la
  // primera query (491 fetches secuenciales), procesamos los slugs en lotes de
  // CORPUS_FETCH_CONCURRENCY. Dentro de cada lote los fetches corren en
  // paralelo (Promise.all); entre lotes hay una barrera, así nunca hay más de
  // `CORPUS_FETCH_CONCURRENCY` requests en vuelo a la vez. El orden de inserción
  // de docs es estable lote-a-lote, lo que mantiene determinístico el retrieve.
  for (let i = 0; i < species.length; i += CORPUS_FETCH_CONCURRENCY) {
    const batch = species.slice(i, i + CORPUS_FETCH_CONCURRENCY);
    const batchResults = await Promise.all(batch.map((slug) => loadSlugDocs(slug)));
    batchResults.forEach((passages) => {
      passages.forEach((p) => docs.push(p));
    });
  }

  const totalLen = docs.reduce((sum, d) => sum + d.docLen, 0);
  avgDocLen = docs.length > 0 ? totalLen / docs.length : 1;

  const df = buildInvertedIndex(docs);
  const idf = computeIDF(df, docs.length);
  corpusCache = { docs, idf };
  return corpusCache;
}

async function loadCorpus() {
  if (corpusCache) return corpusCache;
  // Coalesce: si ya hay una carga en vuelo (ej. pre-warm), reusala en vez de
  // arrancar una segunda. Limpiamos la promesa al fallar para permitir reintento.
  if (!corpusLoadPromise) {
    corpusLoadPromise = buildCorpus().catch((err) => {
      corpusLoadPromise = null;
      throw err;
    });
  }
  return corpusLoadPromise;
}

/**
 * Pre-carga el corpus en background (fire-and-forget). Pensado para llamarse
 * al login / post-OAuth, junto al pre-warm de Ollama, de modo que el corpus
 * esté cacheado en `corpusCache` ANTES de la primera query del usuario.
 *
 * NO bloqueante y nunca lanza: si la carga falla, el primer `retrieve()` real
 * reintentará (loadCorpus limpia la promesa fallida). Idempotente: si el
 * corpus ya está cacheado o cargándose, no dispara trabajo extra.
 *
 * @returns {Promise<void>} resuelve cuando el pre-warm termina (callers la
 *   ignoran; existe para tests).
 */
export function prewarmCorpus() {
  return loadCorpus().then(
    () => undefined,
    (err) => {
      console.warn('[RAG] prewarmCorpus falló (se reintentará en la primera query):', err?.message);
    },
  );
}

/**
 * Implementación interna del retrieve HÍBRIDO (BM25 + semántico).
 *
 * Flujo:
 * 1. BM25 léxico (siempre, incluso offline) — con expansión de sinónimos
 *    campesinos para mejorar recall en vocabulario no-técnico.
 * 2. Semántico (solo si ollama responde): embebe la query, calcula
 *    similitud coseno contra vectores precomputados.
 * 3. RRF fusion: combina ambos rankings por posición (robusto a escalas
 *    distintas de score).
 * 4. Fallback offline: si el semántico falla → solo BM25 (comportamiento
 *    actual intacto, offline-first SAGRADO).
 */
async function retrieveInternal(query, topK) {
  const { docs, idf } = await loadCorpus();

  // BM25 léxico con expansión de sinónimos campesinos (AIA-004)
  const rawTokens = tokenize(query);
  const queryTerms = expandQueryTokens(rawTokens);

  if (queryTerms.length === 0) return [];

  // Ranking BM25
  const bm25Results = docs.map((doc) => ({
    species: doc.species,
    text: doc.text,
    key: doc.key,
    score: scoreBM25(doc, queryTerms, idf, avgDocLen),
  }));
  bm25Results.sort((a, b) => b.score - a.score);
  const bm25Top = bm25Results.filter((d) => d.score > 0);

  // Semántico: intentar, pero nunca bloquear si falla
  const embeddings = await loadEmbeddings();
  if (!embeddings) {
    // Sin embeddings precomputados → solo BM25 (offline o sin build)
    return bm25Top.slice(0, topK);
  }

  const queryEmbedding = await embedQuery(query);
  if (!queryEmbedding) {
    // Ollama caído / sin red → fallback a BM25 solo (offline-first)
    return bm25Top.slice(0, topK);
  }

  const semanticResults = semanticRetrieve(queryEmbedding, docs, embeddings, topK * 3);

  // RRF fusion: combinar ambos rankings
  return rrfFusion(bm25Top, semanticResults, topK);
}

// ══════════════════════════════════════════════════════════════════
// RAG SEMÁNTICO (AIA-004) — híbrido BM25 + cosine similarity
// ══════════════════════════════════════════════════════════════════

/**
 * Similitud coseno entre dos vectores.
 * Ambos deben tener la misma dimensión.
 */
function cosineSimilarity(a, b) {
  if (!a || !b || a.length !== b.length) return 0;
  let dot = 0, normA = 0, normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  const denom = Math.sqrt(normA) * Math.sqrt(normB);
  return denom > 0 ? dot / denom : 0;
}

/**
 * Carga los embeddings precomputados (build-time, public/rag-embeddings.json).
 * Cachea en memoria. Si el archivo no existe (no se corrió el script de
 * build), retorna null → el modo semántico se desactiva, solo BM25.
 */
async function loadEmbeddings() {
  if (embeddingsCache) return embeddingsCache;
  if (embeddingsLoadPromise) return embeddingsLoadPromise;

  embeddingsLoadPromise = (async () => {
    try {
      const res = await fetch(EMBEDDINGS_PATH);
      if (!res.ok) return null;
      const ct = res.headers.get('content-type') || '';
      if (!ct.includes('json')) return null;
      const raw = await res.json();
      if (!raw || typeof raw !== 'object') return null;
      // Convertir arrays planos a Float32Array para similitud rápida
      const converted = {};
      for (const [slug, vec] of Object.entries(raw)) {
        if (Array.isArray(vec) && vec.length > 0) {
          converted[slug] = new Float32Array(vec);
        }
      }
      embeddingsCache = converted;
      console.info(`[RAG] Embeddings cargados: ${Object.keys(converted).length} vectores.`);
      return converted;
    } catch (err) {
      console.warn('[RAG] No se pudieron cargar embeddings — modo semántico desactivado:', err?.message);
      return null;
    }
  })();

  return embeddingsLoadPromise;
}

/**
 * Embebe una query via Ollama (POST /api/ollama/api/embeddings).
 * Si falla (sin red, modelo caído), retorna null → fallback a BM25 solo.
 */
async function embedQuery(queryText) {
  try {
    const res = await fetch('/api/ollama/api/embeddings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: 'nomic-embed-text', prompt: queryText }),
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) return null;
    const data = await res.json();
    if (Array.isArray(data.embedding) && data.embedding.length > 0) {
      return new Float32Array(data.embedding);
    }
    return null;
  } catch (_) {
    return null;
  }
}

/**
 * Retrieval semántico: calcula similitud coseno entre el embedding de la
 * query y los vectores precomputados de cada doc, retorna top-K con scores.
 */
function semanticRetrieve(queryEmbedding, docs, embeddings, topK) {
  const scored = [];
  for (const doc of docs) {
    const slugVec = embeddings[doc.species];
    if (!slugVec) continue;
    const sim = cosineSimilarity(queryEmbedding, slugVec);
    if (sim > 0) {
      scored.push({
        species: doc.species,
        text: doc.text,
        key: doc.key,
        score: sim,
      });
    }
  }
  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, topK);
}

/**
 * Reciprocal Rank Fusion (RRF): fusiona dos rankings BM25 + semántico.
 * score_rrf(doc) = w_bm25 / (k + rank_bm25) + w_sem / (k + rank_sem)
 *
 * Ventaja sobre score ponderado: no requiere normalizar scores entre
 * sistemas con escalas distintas (BM25 es no acotado, coseno es [-1,1]).
 * RRF solo usa la POSICIÓN en el ranking → robusto a diferencias de escala.
 */
function rrfFusion(bm25Results, semanticResults, topK) {
  const bm25Rank = new Map();
  bm25Results.forEach((r, i) => bm25Rank.set(_docKey(r), i + 1));

  const semRank = new Map();
  semanticResults.forEach((r, i) => semRank.set(_docKey(r), i + 1));

  const fused = new Map();
  for (const [key, rank] of bm25Rank) {
    fused.set(key, {
      species: bm25Results[rank - 1].species,
      text: bm25Results[rank - 1].text,
      key: bm25Results[rank - 1].key,
      score: (BM25_WEIGHT / (RRF_K + rank)) + (SEMANTIC_WEIGHT / (RRF_K + (semRank.get(key) || topK + 1))),
    });
  }
  for (const [key, rank] of semRank) {
    if (!fused.has(key)) {
      fused.set(key, {
        species: semanticResults[rank - 1].species,
        text: semanticResults[rank - 1].text,
        key: semanticResults[rank - 1].key,
        score: (BM25_WEIGHT / (RRF_K + (bm25Rank.get(key) || topK + 1))) + (SEMANTIC_WEIGHT / (RRF_K + rank)),
      });
    }
  }

  return Array.from(fused.values())
    .sort((a, b) => b.score - a.score)
    .slice(0, topK);
}

function _docKey(doc) {
  return `${doc.species}::${doc.key}`;
}

/**
 * Colapsa variedades -> especie base + boost a especie sobre variedad.
 * "lactuca_sativa_longifolia_morada" → "lactuca_sativa".
 * Variedades (>2 partes en slug) reciben penalizacion 0.85x.
 * Agrupa por genus_especie conservando el score mas alto.
 */
function collapseVarieties(results) {
  if (!results?.length) return results;
  const bySpecies = new Map();
  for (const r of results) {
    const parts = (r.species || '').split('_');
    const base = parts.length >= 2 ? parts.slice(0, 2).join('_') : r.species;
    const isVariety = parts.length > 2;
    const s = isVariety ? r.score * 0.85 : r.score;
    const existing = bySpecies.get(base);
    if (!existing || s > existing.score) {
      bySpecies.set(base, { ...r, species: base, score: s });
    }
  }
  return Array.from(bySpecies.values()).sort((a, b) => b.score - a.score);
}

/**
 * Recupera los top-K passages más relevantes al query usando BM25.
 *
 * @param {string} query - texto a buscar (se tokeniza con normalización NFD).
 * @param {number} [topK=5] - cantidad máxima de passages a devolver.
 * @param {string} [surface='unknown'] - identificador de la pantalla/servicio
 *   que dispara el RAG, usado solo para telemetría (L1.10). No afecta la
 *   lógica de scoring ni los resultados. Valores convenidos: 'agente',
 *   'foliage', 'voice', 'species'. Si no se pasa, default `'unknown'`.
 *
 * @returns {Promise<Array>} top-K passages con score>0, o [] si falla la carga
 *   del corpus (caller debe tratar [] como "sin contexto RAG disponible").
 */
export async function retrieve(query, topK = 5, surface = 'unknown') {
  const startedAt = (typeof performance !== 'undefined' && performance.now)
    ? performance.now()
    : Date.now();
  let results = [];
  let errorKind = null;
  try {
    results = await retrieveInternal(query, Math.max(topK * 3, 15));
    results = collapseVarieties(results).slice(0, topK);
    return results;
  } catch (err) {
    errorKind = 'unknown';
    console.error('[RAG] retrieve failed, returning empty result:', err);
    results = [];
    return results;
  } finally {
    // Telemetría: nunca debe romper el camino feliz. recordRagEvent ya falla
    // silente, pero envolvemos en try/catch defensivo por si alguien
    // monkey-patchea el módulo.
    try {
      const endedAt = (typeof performance !== 'undefined' && performance.now)
        ? performance.now()
        : Date.now();
      const latencyMs = endedAt - startedAt;
      const topScore = results.length > 0 && typeof results[0].score === 'number'
        ? results[0].score
        : null;
      // No await: fire-and-forget. La promesa que retorna recordRagEvent ya
      // captura su propio error.
      recordRagEvent({
        surface,
        query: typeof query === 'string' ? query : String(query ?? ''),
        topScore,
        latencyMs,
        resultCount: results.length,
        error: errorKind,
      });
    } catch (_) { /* noop — telemetría nunca rompe la UX */ }
  }
}

/**
 * @returns {Promise<Object>} stats del corpus o defaults zero si falla.
 */
export async function getCorpusStats() {
  try {
    const { docs, idf } = await loadCorpus();
    return {
      totalDocs: docs.length,
      uniqueTerms: idf.size,
      avgDocLen: Math.round(avgDocLen),
    };
  } catch (err) {
    console.error('[RAG] getCorpusStats failed:', err);
    return { totalDocs: 0, uniqueTerms: 0, avgDocLen: 0 };
  }
}

export const RAG_SERVICE = {
  retrieve,
  getCorpusStats,
  prewarmCorpus,
};