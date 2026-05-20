import { CROP_TAXONOMY } from '../config/taxonomy';
import { recordRagEvent } from './ragTelemetry';

const CORPUS_PATH = '/cycle-content/';

const BM25_PARAMS = {
  k1: 1.5,
  b: 0.75,
};

let corpusCache = null;
let avgDocLen = 0;

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

function flattenDoc(doc, prefix = '') {
  const passages = [];
  const addPassage = (key, val) => {
    if (typeof val === 'string' && val.length > 20) {
      passages.push({ key: `${prefix}${key}`, text: val, species: doc.species_slug });
    } else if (Array.isArray(val)) {
      val.forEach((item, i) => {
        if (typeof item === 'string' && item.length > 20) {
          passages.push({ key: `${prefix}${key}[${i}]`, text: item, species: doc.species_slug });
        } else if (typeof item === 'object' && item !== null) {
          flattenDoc(item, `${prefix}${key}[${i}].`).forEach((p) => passages.push(p));
        }
      });
    } else if (typeof val === 'object' && val !== null) {
      flattenDoc(val, `${prefix}${key}.`).forEach((p) => passages.push(p));
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
 * rural. Audit pre-Diana hallazgo #8.
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

async function loadCorpus() {
  if (corpusCache) return corpusCache;

  // Manifest first: si existe, itera solo los slugs presentes.
  // Fallback: iterar CROP_TAXONOMY (legacy, con N-3 fetches fallidos).
  const manifestSlugs = await loadManifest();
  const species = manifestSlugs ?? Object.values(CROP_TAXONOMY).flatMap((group) =>
    group.species.map((sp) => sp.id)
  );
  const docs = [];

  for (const slug of species) {
    try {
      const res = await fetch(`${CORPUS_PATH}${slug}.json`);
      if (!res.ok) continue;
      const ct = res.headers.get('content-type') || '';
      if (!ct.includes('json')) continue;
      const data = await res.json();
      const passages = flattenDoc(data);
      passages.forEach((p) => {
        // Pre-tokenize cada passage una sola vez en carga del corpus.
        // Trade-off de memoria: ~2-5MB extra para 10K docs con ~50 tokens promedio
        // (tokenized[] + termCounts Map). Aceptable a cambio de evitar re-tokenizar
        // 5K-15K docs × cada query (que bloqueaba el main thread 500ms-2s y
        // generaba la latencia post-voz que motivó este fix).
        const tokenized = tokenize(p.text);
        const termCounts = new Map();
        tokenized.forEach((t) => termCounts.set(t, (termCounts.get(t) || 0) + 1));
        p.tokenized = tokenized;
        p.termCounts = termCounts;
        p.docLen = tokenized.length;
        docs.push(p);
      });
    } catch (e) {
      console.warn(`[RAG] Failed to load ${slug}:`, e);
    }
  }

  const totalLen = docs.reduce((sum, d) => sum + d.docLen, 0);
  avgDocLen = docs.length > 0 ? totalLen / docs.length : 1;

  const df = buildInvertedIndex(docs);
  const idf = computeIDF(df, docs.length);
  corpusCache = { docs, idf };
  return corpusCache;
}

/**
 * Implementación interna del retrieve BM25. Separada de `retrieve` para que
 * el wrapper de telemetría pueda medir latencia sin contaminar la lógica
 * de scoring.
 */
async function retrieveInternal(query, topK) {
  const { docs, idf } = await loadCorpus();
  const queryTerms = tokenize(query);

  if (queryTerms.length === 0) return [];

  // Project explícito: NO spreedeamos `...doc` porque ahora trae `tokenized`,
  // `termCounts` y `docLen` (estructuras de scoring interno). Devolvemos solo
  // los campos públicos que los callers consumen (species, text, key, score).
  const scored = docs.map((doc) => ({
    species: doc.species,
    text: doc.text,
    key: doc.key,
    score: scoreBM25(doc, queryTerms, idf, avgDocLen),
  }));

  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, topK).filter((d) => d.score > 0);
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
    results = await retrieveInternal(query, topK);
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
};