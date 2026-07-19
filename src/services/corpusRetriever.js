/**
 * corpusRetriever.js — cablea el corpus del sidecar (5647 chunks dr-fanout +
 * fichas, pgvector nomic 768d) al chat del agente. Complementa el RAG cliente
 * (ragRetriever, 501 fichas arctic 1024d) llamando al endpoint /hybrid-retrieve
 * del sidecar y devolviendo pasajes en la MISMA forma { key, text, score } que
 * consume buildCorpusVariants — así se mezclan sin tocar el ensamblado del prompt.
 *
 * Gated por VITE_USE_CORPUS_RETRIEVAL (OFF por defecto → cero cambio en el flujo
 * RAG). Fail-soft: cualquier error/timeout devuelve [] (nunca degrada la UX).
 *
 * ¿Por qué separado del RAG cliente? El corpus vive server-side (768d nomic, con
 * su índice HNSW), el cliente es 1024d arctic — embeddings incompatibles. Se
 * consultan como dos piernas y se fusionan a nivel de pasajes, no de vectores.
 */

const CORPUS_TIMEOUT_MS = 5000;
const TEXT_MAX = 4000; // cota por chunk (evita inflar el prompt)

/** ¿Retrieval del corpus activo? Gated por env. OFF por defecto. */
export function isCorpusRetrievalEnabled() {
  try {
    const raw = import.meta.env?.VITE_USE_CORPUS_RETRIEVAL;
    if (raw === true) return true;
    if (typeof raw === 'string') {
      const v = raw.trim().toLowerCase();
      return v === 'true' || v === '1' || v === 'on';
    }
    return false;
  } catch (_) {
    return false;
  }
}

function getBaseUrl() {
  try {
    const raw = import.meta.env?.VITE_SIDECAR_URL;
    if (typeof raw === 'string' && raw.trim()) return raw.trim().replace(/\/+$/, '');
  } catch (_) { /* ignore */ }
  return '/api';
}

function getToken() {
  try {
    const raw = import.meta.env?.VITE_CHAGRA_MCP_TOKEN;
    return typeof raw === 'string' ? raw : '';
  } catch (_) {
    return '';
  }
}

function clip(s) {
  return typeof s === 'string' ? s.slice(0, TEXT_MAX) : '';
}

/**
 * Recupera pasajes del corpus del sidecar. Devuelve [] si está deshabilitado,
 * si falla, o si no hay resultados. Nunca lanza.
 * @param {string} query
 * @param {number} [topK=3]
 * @returns {Promise<Array<{key:string,text:string,score:number,title?:string,foreign?:boolean}>>}
 */
export async function retrieveCorpus(query, topK = 3) {
  if (!isCorpusRetrievalEnabled()) return [];
  const q = (query ?? '').trim();
  if (!q) return [];

  const url = `${getBaseUrl()}/hybrid-retrieve`;
  const headers = { 'Content-Type': 'application/json' };
  const token = getToken();
  if (token) headers['X-Chagra-Token'] = token;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), CORPUS_TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify({ query: q, top_k: Math.max(1, Math.min(topK, 10)) }),
      signal: controller.signal,
    });
    if (!res.ok) return [];
    const data = await res.json();
    if (!data || data.degraded || !Array.isArray(data.results)) return [];
    return data.results
      .filter((r) => r && typeof r.content === 'string' && r.content.trim())
      .map((r) => ({
        // key con prefijo 'corpus:' → ragOriginReconciler lo trata como pasaje
        // del corpus server-side; el chunk_key preserva la trazabilidad.
        key: `corpus:${r.chunk_key ?? 'sin-key'}`,
        text: clip(r.content),
        score: typeof r.similarity === 'number' ? r.similarity : 0,
        title: typeof r.title === 'string' ? r.title : undefined,
        source_type: typeof r.source_type === 'string' ? r.source_type : undefined,
      }));
  } catch (_) {
    return []; // fail-soft
  } finally {
    clearTimeout(timer);
  }
}
