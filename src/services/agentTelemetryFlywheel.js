/**
 * agentTelemetryFlywheel.js — Flywheel de telemetría del agente Chagra.
 *
 * Captura cada interacción real para mejorarla (SFT/DPO). Privacidad primero:
 * NADA de PII, NADA de datos de finca identificables. Solo pregunta, intención,
 * subgrafo (ids anónimos), respuesta, latencia, tokens, guards, y señal calidad.
 *
 * Local-first / offline-first: se persiste en IndexedDB y se sincroniza cuando
 * hay red. La telemetría es aditiva y silenciosa — nunca rompe el agente.
 *
 * ESQUEMA (ver TELEMETRIA-FLYWHEEL.md):
 *   {
 *     id: ULID,
 *     ts: ISO8601,
 *     pregunta: string (anonimizada, sin nombres de finca),
 *     intencion: string | null,
 *     subgrafo_ids: string[] (ids del grafo, no nombres),
 *     respuesta: string,
 *     latencia_ms: number,
 *     tokens_prompt: number | null,
 *     tokens_completion: number | null,
 *     guards_disparados: string[],
 *     senal_calidad: 'explicita_buena' | 'explicita_mala' | 'implicita_buena'
 *                   | 'implicita_mala' | 'ambigua' | null,
 *     sesion_id: string,
 *     metadata: { source: 'chagra-agent', version: '1.0' }
 *   }
 *
 * @module services/agentTelemetryFlywheel
 */
import { crearULID } from '../utils/id.js';

/** @type {IDBDatabase|null} */
let db = null;
const DB_NAME = 'ChagraAgentTelemetry';
const DB_VERSION = 1;
const STORE = 'interacciones';

// ── Inicialización (IndexedDB, offline-first) ─────────────────────

/**
 * Abre/crea la base de datos de telemetría.
 * @returns {Promise<IDBDatabase>}
 */
export function openTelemetryDB() {
  if (db) return Promise.resolve(db);
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = (/** @type {IDBVersionChangeEvent} */ e) => {
      const database = /** @type {IDBOpenDBRequest} */ (e.target).result;
      if (!database.objectStoreNames.contains(STORE)) {
        database.createObjectStore(STORE, { keyPath: 'id' });
      }
    };
    req.onsuccess = () => { db = req.result; resolve(db); };
    req.onerror = () => reject(req.error);
  });
}

// ── Registro de interacción ───────────────────────────────────────

/**
 * @typedef {Object} Interaccion
 * @property {string} id
 * @property {string} ts
 * @property {string} pregunta
 * @property {string|null} intencion
 * @property {string[]} subgrafo_ids
 * @property {string} respuesta
 * @property {number} latencia_ms
 * @property {number|null} tokens_prompt
 * @property {number|null} tokens_completion
 * @property {string[]} guards_disparados
 * @property {string|null} senal_calidad
 * @property {string} sesion_id
 * @property {{source:string, version:string}} metadata
 */

/**
 * Registra una interacción completa.
 * @param {Omit<Interaccion, 'id'|'ts'|'metadata'>} datos
 * @returns {Promise<void>}
 */
export async function registrarInteraccion(datos) {
  try {
    const database = await openTelemetryDB();
    /** @type {Interaccion} */
    const entrada = {
      id: crearULID(),
      ts: new Date().toISOString(),
      metadata: { source: 'chagra-agent', version: '1.0' },
      ...datos,
    };
    return new Promise((resolve, reject) => {
      const tx = database.transaction(STORE, 'readwrite');
      tx.objectStore(STORE).add(entrada);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch (err) {
    // La telemetría nunca rompe el agente. Degradación silenciosa.
    console.debug('[telemetry] No se pudo registrar interacción:', err);
  }
}

/**
 * Actualiza la señal de calidad de una interacción ya registrada.
 * @param {string} id
 * @param {string} senal
 * @returns {Promise<void>}
 */
export async function actualizarSenal(id, senal) {
  try {
    const database = await openTelemetryDB();
    return new Promise((resolve, reject) => {
      const tx = database.transaction(STORE, 'readwrite');
      const store = tx.objectStore(STORE);
      const req = store.get(id);
      req.onsuccess = () => {
        if (req.result) {
          req.result.senal_calidad = senal;
          store.put(req.result);
        }
      };
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch (err) {
    console.debug('[telemetry] No se pudo actualizar señal:', err);
  }
}

// ── Exportación (JSONL para mining SFT/DPO) ───────────────────────

/**
 * Exporta todas las interacciones en formato JSONL.
 * Cada línea es un objeto JSON completo con el esquema de telemetría.
 * El minador de pares (scripts/mine-pairs-from-telemetry.mjs) consume este
 * formato para producir sft.jsonl y dpo.jsonl.
 *
 * @returns {Promise<string>} JSONL con una interacción por línea
 */
export async function exportarJSONL() {
  try {
    const database = await openTelemetryDB();
    return new Promise((resolve, reject) => {
      const tx = database.transaction(STORE, 'readonly');
      const req = tx.objectStore(STORE).getAll();
      req.onsuccess = () => {
        const lineas = (req.result || []).map((r) => JSON.stringify(r));
        resolve(lineas.join('\n') + (lineas.length ? '\n' : ''));
      };
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    console.debug('[telemetry] No se pudo exportar:', err);
    return '';
  }
}

// ── Señal de calidad implícita ────────────────────────────────────

/**
 * Detecta señal de calidad implícita basada en comportamiento del usuario.
 *
 * Heurísticas (sin tracking invasivo):
 *   - 'implicita_mala': el usuario reformuló la misma pregunta en <30s
 *   - 'implicita_buena': el usuario hizo otra pregunta distinta en <60s
 *   - 'ambigua': ninguna de las anteriores
 *
 * @param {Object} opts
 * @param {string} opts.preguntaActual
 * @param {string|null} opts.preguntaAnterior
 * @param {string|null} opts.tsAnterior
 * @returns {string}
 */
export function detectarSenalImplicita({ preguntaActual, preguntaAnterior, tsAnterior }) {
  if (!preguntaAnterior || !tsAnterior) return 'ambigua';

  const actual = preguntaActual.toLowerCase().trim();
  const anterior = preguntaAnterior.toLowerCase().trim();
  const delta = Date.now() - new Date(tsAnterior).getTime();

  if (delta < 30_000) {
    // Muy rápido → reformuló (respuesta anterior fue mala)
    if (_similitudSimple(actual, anterior) > 0.5) return 'implicita_mala';
  }

  if (delta < 60_000) {
    return 'implicita_buena';
  }

  return 'ambigua';
}

/**
 * Similitud simple de Jaccard entre dos strings (sin depender de embeddings).
 * @param {string} a
 * @param {string} b
 * @returns {number} 0-1
 */
function _similitudSimple(a, b) {
  const setA = new Set(a.split(/\s+/));
  const setB = new Set(b.split(/\s+/));
  let interseccion = 0;
  for (const w of setA) if (setB.has(w)) interseccion++;
  const union = setA.size + setB.size - interseccion;
  return union === 0 ? 0 : interseccion / union;
}
