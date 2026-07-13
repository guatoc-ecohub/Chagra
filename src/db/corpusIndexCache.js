/**
 * corpusIndexCache — persistencia del ÍNDICE RAG construido (offline-first).
 *
 * Por qué existe (audit verify-first 2026-06-13, hueco offline de campo):
 *   El Service Worker ya cachea los BYTES crudos de /cycle-content/* y
 *   /rag-embeddings.json (capa de RED → la PWA puede re-fetchearlos offline).
 *   Pero `corpusCache` de ragRetriever.js vivía SOLO en memoria: en cada
 *   recarga (incluida una recarga OFFLINE en frío) había que re-fetchear y
 *   re-TOKENIZAR las 491 fichas — CPU cara en un teléfono rural, y sin red el
 *   re-fetch depende del SW cache (rápido) pero el re-tokenize igual corre.
 *
 *   Este módulo persiste el índice YA construido (docs pre-tokenizados + IDF +
 *   avgDocLen) en IndexedDB (store rag_corpus_cache, v21). Una recarga offline
 *   en frío hidrata el índice desde aquí → grounding disponible sin re-tokenizar
 *   ni depender de que el SW tenga las 491 fichas.
 *
 * Serialización: IndexedDB usa structured clone, que soporta Map y Float32Array
 * de forma nativa. NO convertimos a JSON: los `termCounts: Map` y el `idf: Map`
 * se guardan/recuperan tal cual, sin pérdida ni coste de re-parseo.
 *
 * Invalidación: guardamos `manifestStamp` (generated_at del manifest + nº de
 * slugs) y `tier` (cantidad de especies del catálogo activo). Si al arrancar el
 * manifest o el tier-gate cambiaron, el índice persistido se descarta y se
 * reconstruye — así un deploy del corpus o un cambio OSS↔Pro no sirve grounding
 * obsoleto. Solo local, no toca syncManager. Sigue el patrón IDB de
 * farmProcessCache / assetCache.
 */
import { openDB, STORES } from './dbCore';

// Clave única del registro KV. Un solo corpus por dispositivo.
const CORPUS_KEY = 'corpus';

/**
 * Persiste el índice RAG construido.
 *
 * @param {Object} payload
 * @param {Array} payload.docs - passages pre-tokenizados (con termCounts:Map, docLen).
 * @param {Map} payload.idf - inverse document frequency por término.
 * @param {number} payload.avgDocLen - longitud media de doc (para BM25).
 * @param {string} payload.manifestStamp - huella del manifest (invalidación).
 * @param {number} payload.tier - nº de especies del catálogo activo (tier-gate).
 * @returns {Promise<boolean>} true si guardó, false si falló (no lanza).
 */
export async function saveCorpusIndex({ docs, idf, avgDocLen, manifestStamp, tier }) {
  try {
    const db = await openDB();
    return await new Promise((resolve, reject) => {
      const tx = db.transaction(STORES.RAG_CORPUS_CACHE, 'readwrite');
      tx.objectStore(STORES.RAG_CORPUS_CACHE).put({
        key: CORPUS_KEY,
        docs,
        idf,
        avgDocLen,
        manifestStamp: manifestStamp ?? null,
        tier: tier ?? null,
        savedAt: Date.now(),
      });
      tx.oncomplete = () => resolve(true);
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error);
    });
  } catch (err) {
    // Quota/storage/structured-clone: degradar a memoria. Persistir es una
    // optimización; nunca debe romper la carga del corpus.
    console.warn('[RAG] No se pudo persistir el índice del corpus:', err?.message);
    return false;
  }
}

/**
 * Lee el índice RAG persistido, validando que siga vigente.
 *
 * @param {Object} expected
 * @param {string} expected.manifestStamp - huella esperada del manifest.
 * @param {number} expected.tier - nº de especies esperado del catálogo.
 * @returns {Promise<{docs:Array, idf:Map, avgDocLen:number}|null>}
 *   El índice si existe y coincide manifest+tier; null si no hay, está obsoleto
 *   o falla la lectura (el caller reconstruye desde la red).
 */
export async function loadCorpusIndex(opts = /** @type {any} */ ({})) {
  const { manifestStamp, tier } = opts;
  try {
    const db = await openDB();
    const record = await new Promise((resolve, reject) => {
      const tx = db.transaction(STORES.RAG_CORPUS_CACHE, 'readonly');
      const req = tx.objectStore(STORES.RAG_CORPUS_CACHE).get(CORPUS_KEY);
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => reject(req.error);
    });

    if (!record || !Array.isArray(record.docs) || record.docs.length === 0) {
      return null;
    }

    // Invalidación: si la huella del manifest cambió (deploy del corpus) o el
    // tier-gate cambió (OSS↔Pro, catálogo distinto), el índice está obsoleto.
    // Solo comparamos cuando el caller pasa el valor esperado (si no lo pasa,
    // confiamos en lo persistido — degradación tolerante).
    if (manifestStamp != null && record.manifestStamp !== manifestStamp) {
      return null;
    }
    if (tier != null && record.tier != null && record.tier !== tier) {
      return null;
    }

    // idf se guardó como Map (structured clone lo preserva). Defensa por si un
    // navegador viejo lo serializó distinto: reconstruir Map desde entries.
    let idf = record.idf;
    if (!(idf instanceof Map)) {
      idf = new Map(idf && typeof idf === 'object' ? Object.entries(idf) : []);
    }

    return {
      docs: record.docs,
      idf,
      avgDocLen: typeof record.avgDocLen === 'number' ? record.avgDocLen : 1,
    };
  } catch (err) {
    console.warn('[RAG] No se pudo leer el índice persistido del corpus:', err?.message);
    return null;
  }
}

/**
 * Borra el índice persistido (debug / invalidación manual). No lanza.
 * @returns {Promise<void>}
 */
export async function clearCorpusIndex() {
  try {
    const db = await openDB();
    await new Promise((resolve, reject) => {
      const tx = db.transaction(STORES.RAG_CORPUS_CACHE, 'readwrite');
      tx.objectStore(STORES.RAG_CORPUS_CACHE).delete(CORPUS_KEY);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch (err) {
    console.warn('[RAG] No se pudo borrar el índice persistido del corpus:', err?.message);
  }
}
