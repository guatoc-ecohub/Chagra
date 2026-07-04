/* eslint-disable chagra-i18n/no-hardcoded-spanish */
import { CROP_TAXONOMY } from '../config/taxonomy';
import { recordRagEvent } from './ragTelemetry';
import { TOOL_TIMEOUT_MS } from './sidecarClient.js';
import { getAllSpecies } from '../db/catalogDB';
import { expandQueryTokens } from './ragSynonyms';
import { saveCorpusIndex, loadCorpusIndex } from '../db/corpusIndexCache';
import { fetchWithAuthRetry } from './apiService';

const CORPUS_PATH = '/cycle-content/';
const EMBEDDINGS_PATH = '/rag-embeddings.json';

const BM25_PARAMS = {
  k1: 1.5,
  b: 0.75,
};

// Peso relativo BM25 vs semántico en la fusión por score combinado.
// Ambos se normalizan a [0, 1] antes de sumar, así el peso se interpreta
// de forma directa.
const BM25_WEIGHT = 1.0;
const SEMANTIC_WEIGHT = 1.5;

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

// Métrica de bloqueo del tier-gate (audit P0-1, 2026-07-03). Cuenta cuántas
// veces buildCorpus tuvo que degradar FAIL-CLOSED por no poder confiar en el
// catálogo activo (throw o vacío). Un valor creciente es la señal observable de
// que el RAG está sirviendo solo el subconjunto seguro, no el corpus completo.
let tierGateBlockCount = 0;

/**
 * @returns {number} nº de veces que el tier-gate degradó FAIL-CLOSED por
 *   catálogo no disponible. Para health-checks / telemetría.
 */
export function getTierGateBlockCount() {
  return tierGateBlockCount;
}

// Slug sentinel para el `tier` cuando degradamos FAIL-CLOSED. Debe ser distinto
// de cualquier tamaño real de catálogo (que es un número) para que el índice
// persistido de un build seguro NO se sirva a una sesión con catálogo sano, ni
// viceversa (corpusIndexCache invalida cuando `tier` cambia).
const FAIL_CLOSED_TIER = 'fail-closed-safe-subset';

/**
 * Universo de slugs OSS-seguro hardcodeado: los ids de CROP_TAXONOMY, que
 * viajan en el repo público y NO contienen contenido Pro/privado. Es el
 * fallback FAIL-CLOSED del tier-gate cuando el catálogo activo no está
 * disponible: nunca deja groundear un slug fuera de esta taxonomía baked-in.
 */
function safeSubsetIds() {
  return new Set(
    Object.values(CROP_TAXONOMY).flatMap((group) => group.species.map((sp) => sp.id)),
  );
}

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

function normalizeScore(score, maxScore) {
  if (!Number.isFinite(score) || score <= 0 || !Number.isFinite(maxScore) || maxScore <= 0) {
    return 0;
  }
  return score / maxScore;
}

function resolveSpeciesSlug(doc, speciesSlug = null) {
  if (typeof speciesSlug === 'string' && speciesSlug.trim()) return speciesSlug.trim();
  if (!doc || typeof doc !== 'object') return '';
  const candidates = [
    doc.species_slug,
    doc.speciesSlug,
    doc.species_id,
    doc.slug,
    typeof doc.species === 'string' ? doc.species : '',
  ];
  for (const candidate of candidates) {
    if (typeof candidate === 'string' && candidate.trim()) return candidate.trim();
  }
  return '';
}

export function flattenDoc(doc, prefix = '', speciesSlug = null) {
  const slug = resolveSpeciesSlug(doc, speciesSlug);
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
    // Devolvemos los slugs + una huella (`stamp`) para invalidar el índice
    // persistido cuando el corpus cambia (deploy nuevo del manifest). La huella
    // combina generated_at + cantidad de slugs: barato y suficiente para
    // detectar un manifest distinto sin hashear todo el contenido.
    const stamp = `${data.generated_at ?? ''}:${data.slugs.length}`;
    return { slugs: data.slugs, stamp };
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
  const manifest = await loadManifest();
  const manifestStamp = manifest?.stamp ?? null;
  let species = manifest?.slugs ?? Object.values(CROP_TAXONOMY).flatMap((group) =>
    group.species.map((sp) => sp.id)
  );

  // Tier gate (SEC-002 / UXC-004): filtrar slugs contra el catalogo activo.
  // En OSS el catalogo tiene ~263 especies; el manifest ~491. Los ~296 slugs
  // sin entrada en el catalogo NO deben groundearse para evitar leak de
  // contenido Pro a usuarios OSS.
  //
  // FAIL-CLOSED (audit P0-1, 2026-07-03): si el catálogo NO está disponible
  // (getAllSpecies lanza) o viene vacío, NO cargamos el manifest completo —
  // eso serviría corpus fuera de tier (contenido Pro/privado) justo cuando el
  // gate debía impedirlo. En su lugar degradamos a un SUBCONJUNTO SEGURO
  // hardcodeado (CROP_TAXONOMY ∩ manifest, ver safeSubsetIds), contamos el
  // bloqueo y NUNCA servimos RAG "amplio" por defecto.
  let tier = null;
  let catalogTrusted = false;
  try {
    const catalogSpecies = await getAllSpecies();
    if (catalogSpecies && catalogSpecies.length > 0) {
      catalogTrusted = true;
      tier = catalogSpecies.length;
      const allowedIds = new Set(catalogSpecies.map((s) => s.id));
      const before = species.length;
      species = species.filter((slug) => allowedIds.has(slug));
      if (before !== species.length) {
        console.info(`[RAG] Tier gate: ${before} slugs en manifest, ${species.length} dentro del catalogo (${before - species.length} excluidos).`);
      }
    } else {
      console.warn('[RAG] Tier gate: catálogo vacío — degradando FAIL-CLOSED al subconjunto seguro.');
    }
  } catch (err) {
    console.warn('[RAG] No se pudo cargar el catálogo para tier-gate — degradando FAIL-CLOSED al subconjunto seguro:', err?.message);
  }

  if (!catalogTrusted) {
    // FAIL-CLOSED: sin un catálogo confiable no podemos determinar el tier, así
    // que restringimos al subconjunto seguro OSS en vez de servir el manifest
    // completo. Nunca contenido fuera de CROP_TAXONOMY. Si el manifest era null,
    // `species` ya era CROP_TAXONOMY (este filtro es un no-op y es correcto).
    const safeIds = safeSubsetIds();
    const before = species.length;
    species = species.filter((slug) => safeIds.has(slug));
    tier = FAIL_CLOSED_TIER;
    tierGateBlockCount += 1;
    console.warn(`[RAG] Tier gate FAIL-CLOSED (#${tierGateBlockCount}): ${before} slugs → ${species.length} del subconjunto seguro (CROP_TAXONOMY). Sin catálogo confiable no se sirve RAG amplio.`);
  }

  // OFFLINE-FIRST: intentar hidratar el índice YA construido desde IndexedDB
  // ANTES de re-fetchear+re-tokenizar las 491 fichas. Si existe y coincide la
  // huella del manifest + el tier-gate, lo usamos tal cual → arranque (incluida
  // recarga OFFLINE en frío) sin re-tokenizar. Si está obsoleto o no existe,
  // loadCorpusIndex devuelve null y reconstruimos desde la red (SW cache).
  try {
    const persisted = await loadCorpusIndex({ manifestStamp, tier });
    if (persisted) {
      avgDocLen = persisted.avgDocLen;
      corpusCache = { docs: persisted.docs, idf: persisted.idf };
      console.info(`[RAG] Índice del corpus hidratado desde IndexedDB: ${persisted.docs.length} passages (sin re-tokenizar).`);
      return corpusCache;
    }
  } catch (err) {
    console.warn('[RAG] Hidratación del índice persistido falló — reconstruyendo:', err?.message);
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

  // OFFLINE-FIRST: persistir el índice construido a IndexedDB (fire-and-forget,
  // no bloqueante). Una recarga OFFLINE en frío posterior lo hidratará sin
  // re-tokenizar las 491 fichas. Solo persistimos si hay docs reales (no un
  // corpus vacío por fallo de red). saveCorpusIndex nunca lanza.
  if (docs.length > 0) {
    saveCorpusIndex({ docs, idf, avgDocLen, manifestStamp, tier }).then((ok) => {
      if (ok) console.info(`[RAG] Índice del corpus persistido en IndexedDB (${docs.length} passages).`);
    });
  }

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
 * 1. BM25 léxico (siempre, incluso offline) con expansión de sinónimos.
 * 2. Semántico (solo si existe `rag-embeddings.json` y Ollama responde).
 * 3. Fusión por score combinado normalizado.
 * 4. Fallback offline: si el semántico falla, devuelve solo BM25.
 */
async function retrieveInternal(query, topK) {
  const { docs, idf } = await loadCorpus();

  const rawTokens = tokenize(query);
  const queryTerms = expandQueryTokens(rawTokens);
  if (queryTerms.length === 0) return [];

  const bm25Scored = docs.map((doc) => ({
    doc,
    score: scoreBM25(doc, queryTerms, idf, avgDocLen),
  }));
  bm25Scored.sort((a, b) => b.score - a.score);
  const bm25Top = bm25Scored
    .filter((item) => item.score > 0)
    .map(({ doc, score }) => ({
      species: doc.species,
      text: doc.text,
      key: doc.key,
      score,
    }));

  const embeddings = await loadEmbeddings();
  if (!embeddings) {
    return bm25Top.slice(0, topK);
  }

  const queryEmbedding = await embedQuery(query);
  if (!queryEmbedding) {
    return bm25Top.slice(0, topK);
  }

  const semanticScored = scoreSemanticDocs(queryEmbedding, docs, embeddings);
  const fused = combineResults(bm25Scored, semanticScored);
  return fused.slice(0, topK);
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
  // FIX P0 (audit 2026-06-23): antes había `if (embeddingsLoadPromise) return
  // embeddingsLoadPromise` — pero el promise IIFE resuelve a null en cualquier
  // fallo/HTTP-error, y el objeto Promise sigue siendo truthy → la siguiente
  // consulta reusaba el promise resuelto a null y el agente quedaba en BM25-only
  // permanente y silencioso. Ahora: al fallar/null reseteamos la var a null para
  // que el siguiente turno vuelva a intentar la carga (retries naturales).
  // El happy-path (carga exitosa) sigue cacheado en `embeddingsCache`.
  if (embeddingsLoadPromise) return embeddingsLoadPromise;

  embeddingsLoadPromise = (async () => {
    try {
      const res = await fetch(EMBEDDINGS_PATH);
      if (!res.ok) {
        embeddingsLoadPromise = null; // permitir reintento en próxima consulta
        return null;
      }
      const ct = res.headers.get('content-type') || '';
      if (!ct.includes('json')) {
        embeddingsLoadPromise = null;
        return null;
      }
      const raw = await res.json();
      if (!raw || typeof raw !== 'object') {
        embeddingsLoadPromise = null;
        return null;
      }
      // Convertir a Float32Array. Soporta int8 quantizado (q:'int8',s:scale,v:Int8Array)
      const converted = {};
      for (const [slug, entry] of Object.entries(raw)) {
        if (entry && typeof entry === 'object' && entry.q === 'int8' && Array.isArray(entry.v) && entry.s) {
          // Dequantizar: int8 → float32
          const f32 = new Float32Array(entry.v.length);
          for (let i = 0; i < entry.v.length; i++) f32[i] = entry.v[i] * entry.s;
          converted[slug] = f32;
        } else if (Array.isArray(entry) && entry.length > 0) {
          converted[slug] = new Float32Array(entry);
        }
      }
      embeddingsCache = converted;
      console.info(`[RAG] Embeddings cargados: ${Object.keys(converted).length} vectores.`);
      return converted;
    } catch (err) {
      console.warn('[RAG] No se pudieron cargar embeddings — modo semántico desactivado:', err?.message);
      embeddingsLoadPromise = null; // permitir reintento en próxima consulta
      return null;
    }
  })();

  return embeddingsLoadPromise;
}

/**
 * Embebe una query via Ollama (POST /api/ollama/api/embeddings).
 * Si falla (sin red, modelo caído), retorna null → fallback a BM25 solo.
 *
 * `options.num_gpu: 0` fuerza el embed a CPU (P0 warm, audit 2026-06-28): evita
 * que el embedder co-resida en la GPU del chat y dispare OOM.
 */
async function embedQuery(queryText) {
  try {
    const res = await fetchWithAuthRetry('/api/ollama/api/embeddings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      // num_gpu:0 → el embedder corre en CPU, NO en la M6000 (12 GiB). La
      // co-residencia embedder + granite3.3:8b puede disparar un cudaMalloc
      // OOM y tumbar el runner compartido.
      //
      // FIX P0 (auditoría RAG 2026-07-02): el commit anterior de esta rama
      // había puesto `model: 'nomic-embed-text'` aquí, con el comentario (falso)
      // de que "el corpus se generó con nomic-embed-text". El corpus real de
      // `public/rag-embeddings.json` (verificado: 501 vectores, TODOS de
      // dimensión 1024) fue re-indexado con snowflake-arctic-embed2 en #1825 y
      // #1828 — nomic-embed-text emite 768d. Con el modelo equivocado pasan dos
      // cosas, cualquiera de las dos deja el híbrido en BM25-only silencioso:
      // (a) si el modelo no está pulled en el host de Ollama, el POST devuelve
      // 404 y embedQuery() retorna null; (b) si SÍ está pulled, cosineSimilarity()
      // descarta el par por `a.length !== b.length` (768 vs 1024) y el score
      // semántico da 0 para TODOS los docs. En ambos casos combineResults()
      // fusiona con semanticNorm=0 en todo el corpus, así que el ranking final
      // es idéntico al de BM25-only — exactamente el +0.0pp que reportó el
      // benchmark de este PR. snowflake-arctic-embed2 es también el modelo
      // documentado como fuente de verdad en Chagra-strategy/ops/MODELS.md
      // ("embeddings (RAG) | snowflake-arctic-embed2 | ragRetriever.js:442") y
      // el que usa scripts/bench-complejos-con-tools.mjs. Restaurado en esta línea.
      body: JSON.stringify({
        model: 'snowflake-arctic-embed2',
        prompt: queryText,
        options: { num_gpu: 0 },
      }),
      signal: AbortSignal.timeout(TOOL_TIMEOUT_MS),
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
 * query y los vectores precomputados de cada doc.
 */
function scoreSemanticDocs(queryEmbedding, docs, embeddings) {
  const scored = [];
  for (const doc of docs) {
    const slugVec = embeddings[doc.species];
    if (!slugVec) continue;
    const sim = Math.max(0, cosineSimilarity(queryEmbedding, slugVec));
    if (sim > 0) {
      scored.push({
        doc,
        score: sim,
      });
    }
  }
  scored.sort((a, b) => b.score - a.score);
  return scored;
}

function combineResults(bm25Scored, semanticScored) {
  const bm25ByKey = new Map();
  let maxBm25 = 0;
  for (const item of bm25Scored) {
    const key = _docKey(item.doc);
    bm25ByKey.set(key, item.score);
    if (item.score > maxBm25) maxBm25 = item.score;
  }

  const semanticByKey = new Map();
  let maxSemantic = 0;
  for (const item of semanticScored) {
    const key = _docKey(item.doc);
    semanticByKey.set(key, item.score);
    if (item.score > maxSemantic) maxSemantic = item.score;
  }

  const fused = [];
  for (const item of bm25Scored) {
    const key = _docKey(item.doc);
    const bm25Norm = normalizeScore(bm25ByKey.get(key) || 0, maxBm25);
    const semanticNorm = normalizeScore(semanticByKey.get(key) || 0, maxSemantic);
    const score = (BM25_WEIGHT * bm25Norm) + (SEMANTIC_WEIGHT * semanticNorm);
    if (score > 0) {
      fused.push({
        species: item.doc.species,
        text: item.doc.text,
        key: item.doc.key,
        score,
        bm25Score: item.score,
        semanticScore: semanticByKey.get(key) || 0,
      });
    }
  }

  for (const item of semanticScored) {
    const key = _docKey(item.doc);
    if (bm25ByKey.has(key)) continue;
    const score = SEMANTIC_WEIGHT * normalizeScore(item.score, maxSemantic);
    if (score > 0) {
      fused.push({
        species: item.doc.species,
        text: item.doc.text,
        key: item.doc.key,
        score,
        bm25Score: 0,
        semanticScore: item.score,
      });
    }
  }

  return fused.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    if (b.semanticScore !== a.semanticScore) return b.semanticScore - a.semanticScore;
    if (b.bm25Score !== a.bm25Score) return b.bm25Score - a.bm25Score;
    if (a.species !== b.species) return a.species.localeCompare(b.species);
    return a.key.localeCompare(b.key);
  });
}

function _docKey(doc) {
  return `${doc.species}::${doc.key}`;
}

/**
 * Colapsa variedades a especie base. "lactuca_sativa_longifolia_morada"
 * → "lactuca_sativa". Agrupa por genus_especie (2 partes), conserva el
 * score mas alto por grupo, re-ordena. El mayor lever del deep-test RAG.
 */
function collapseVarieties(results) {
  if (!results?.length) return results;
  const bySpecies = new Map();
  for (const r of results) {
    const parts = (r.species || '').split('_');
    const base = parts.length >= 2 ? parts.slice(0, 2).join('_') : r.species;
    const existing = bySpecies.get(base);
    if (!existing || r.score > existing.score) {
      bySpecies.set(base, { ...r, species: base });
    }
  }
  return Array.from(bySpecies.values()).sort((a, b) => b.score - a.score);
}

/**
 * Recupera los top-K passages más relevantes al query con ranking híbrido.
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
    // Colapsar variedades a especie base (A1: el mayor lever del deep-test)
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
  getTierGateBlockCount,
};
