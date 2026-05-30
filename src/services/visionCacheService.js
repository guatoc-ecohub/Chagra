/**
 * visionCacheService.js — Cache de respuestas de visión por hash de contenido
 * (V-11 #231).
 *
 * Las inferencias multimodales (`analyzeFoliage`, `recognizeSpecies` en
 * `aiService.js`) cuestan varios segundos en GPU Maxwell. Cuando el usuario
 * re-analiza la MISMA foto (mismos bytes), no tiene sentido re-llamar al
 * modelo: este módulo cachea el resultado keyed por SHA-256 del contenido del
 * Blob y lo devuelve al instante.
 *
 * --- Decisión de almacenamiento (justificada) -------------------------------
 * Se usa un LRU **en memoria** (Map con orden de inserción nativo) en vez de
 * IndexedDB. Razones:
 *   1) Conflict-avoidance: persistir en IndexedDB exigiría bumpear
 *      `DB_VERSION` en `db/dbCore.js` (schema compartido, alto riesgo de
 *      conflicto con otras PRs en vuelo) y añadir un objectStore + migración.
 *   2) Entorno de test: jsdom NO implementa IndexedDB y `fake-indexeddb` no
 *      está instalado; los unit tests de `src/services/__tests__/*` no tocan
 *      IDB real (solo los E2E Playwright lo hacen en browser real). Un store en
 *      memoria es testeable sin nuevas dependencias.
 *   3) Suficiencia: el beneficio principal es ahorrar la re-inferencia DENTRO
 *      de una sesión (el usuario re-analizando la foto que acaba de tomar). Un
 *      cache de sesión cubre ese caso de uso.
 *
 * Persistencia liviana best-effort: además del Map en memoria se intenta
 * espejar el cache a `localStorage` (que jsdom SÍ soporta), de modo que un
 * reload de la PWA conserve los hits recientes. Es totalmente opcional: si
 * `localStorage` no está disponible o lanza (quota, modo privado), el cache
 * sigue funcionando solo en memoria sin romper nada.
 *
 * --- Política de retención --------------------------------------------------
 *   - LRU de `MAX_ENTRIES` (128) entradas. Al insertar la #129 se expulsa la
 *     menos recientemente usada. Un `getCached` exitoso refresca el recency.
 *   - TTL de `TTL_MS` (24h). Una entrada más vieja que el TTL se trata como
 *     miss y se purga en el momento del acceso (lazy expiration).
 *   - NUNCA se cachean resultados `null`/`undefined` (respuestas de error del
 *     modelo): se reintenta en la siguiente llamada.
 *
 * Privacy: la clave es el hash del contenido (no reversible a la imagen) y el
 * valor es solo el resultado estructurado del diagnóstico — no se persiste la
 * imagen ni el base64.
 */

// Máximo de entradas vivas en el LRU. 128 × (~1 KB por resultado JSON) ≈ 128 KB
// peak, despreciable y suficiente para una sesión de campo.
const MAX_ENTRIES = 128;

// Time-to-live de cada entrada. 24h: una foto re-analizada al día siguiente
// puede haber cambiado de contexto (modelo actualizado, etc.); refrescar.
const TTL_MS = 24 * 60 * 60 * 1000;

// Prefijo de las claves en localStorage para el mirror de persistencia.
const LS_KEY = 'chagra:visionCache:v1';

// Store en memoria. `Map` preserva orden de inserción → el primer key es el
// candidato a expulsión LRU. Cada valor: { value, ts }.
const store = new Map();

/**
 * Convierte un ArrayBuffer a string hex.
 */
const bufToHex = (buffer) => {
  const bytes = new Uint8Array(buffer);
  let hex = '';
  for (let i = 0; i < bytes.length; i += 1) {
    hex += bytes[i].toString(16).padStart(2, '0');
  }
  return hex;
};

/**
 * Calcula el SHA-256 hex del contenido binario de un Blob. Determinístico:
 * mismos bytes → mismo hash. El mime type del Blob NO afecta el hash (solo
 * cuentan los bytes, que es lo que ve el modelo tras decodificar).
 *
 * @param {Blob} blob - imagen (WebP/JPEG) a hashear.
 * @returns {Promise<string>} hash hex de 64 chars.
 */
export const hashImage = async (blob) => {
  const buffer = await blob.arrayBuffer();
  const digest = await crypto.subtle.digest('SHA-256', buffer);
  return bufToHex(digest);
};

/**
 * Mirror best-effort del store a localStorage. Silencioso ante cualquier fallo
 * (quota, modo privado, SSR sin window). Persistir es un nice-to-have; el
 * cache en memoria es la fuente de verdad.
 */
const persist = () => {
  try {
    if (typeof localStorage === 'undefined') return;
    const obj = {};
    for (const [k, v] of store.entries()) obj[k] = v;
    localStorage.setItem(LS_KEY, JSON.stringify(obj));
  } catch (_) {
    // best-effort: ignorar.
  }
};

/**
 * Hidrata el store en memoria desde localStorage al cargar el módulo. Descarta
 * entradas expiradas y respeta MAX_ENTRIES. Best-effort y silencioso.
 */
const hydrate = () => {
  try {
    if (typeof localStorage === 'undefined') return;
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return;
    const obj = JSON.parse(raw);
    const now = Date.now();
    const entries = Object.entries(obj)
      .filter(([, v]) => v && typeof v.ts === 'number' && now - v.ts < TTL_MS)
      .slice(-MAX_ENTRIES);
    for (const [k, v] of entries) store.set(k, v);
  } catch (_) {
    // best-effort: ignorar.
  }
};

hydrate();

/**
 * Devuelve un clon defensivo (structured) del valor cacheado para que el caller
 * no pueda mutar el objeto guardado. JSON round-trip basta: los resultados de
 * visión son JSON-safe (score/issues/strings).
 */
const clone = (value) => JSON.parse(JSON.stringify(value));

/**
 * Busca un resultado cacheado por hash. Lazy expiration: si la entrada superó
 * el TTL se purga y se trata como miss. Un hit refresca el recency LRU
 * (re-inserción al final del Map).
 *
 * @param {string} hash - hash de `hashImage`.
 * @returns {Promise<Object|null>} copia del resultado, o null si miss/expirado.
 */
export const getCached = async (hash) => {
  const entry = store.get(hash);
  if (!entry) return null;
  if (Date.now() - entry.ts >= TTL_MS) {
    store.delete(hash);
    persist();
    return null;
  }
  // Refrescar recency: re-insertar al final del orden de iteración.
  store.delete(hash);
  store.set(hash, entry);
  return clone(entry.value);
};

/**
 * Cachea un resultado de visión bajo su hash. NUNCA cachea null/undefined
 * (respuestas de error del modelo). Aplica eviction LRU al superar MAX_ENTRIES.
 *
 * @param {string} hash - hash de `hashImage`.
 * @param {Object|null} result - resultado estructurado del modelo.
 * @returns {Promise<void>}
 */
export const setCached = async (hash, result) => {
  if (result === null || result === undefined) return;

  // Si ya existe, borrar primero para que la re-inserción quede al final
  // (recency fresco).
  if (store.has(hash)) store.delete(hash);
  store.set(hash, { value: clone(result), ts: Date.now() });

  // Eviction LRU: expulsar las entradas más viejas (inicio del Map) hasta
  // respetar el límite.
  while (store.size > MAX_ENTRIES) {
    const oldestKey = store.keys().next().value;
    store.delete(oldestKey);
  }
  persist();
};

/**
 * Vacía todo el cache (memoria + persistencia). Útil para tests y para un
 * eventual "limpiar caché" en settings.
 */
export const clearCache = () => {
  store.clear();
  try {
    if (typeof localStorage !== 'undefined') localStorage.removeItem(LS_KEY);
  } catch (_) {
    // best-effort.
  }
};

// Test-only: introspección del store interno. NO usar en runtime.
export const __TEST__ = {
  MAX_ENTRIES,
  TTL_MS,
  size: () => store.size,
  // Fuerza el timestamp de una entrada al pasado para testear expiración.
  expireEntry: (hash) => {
    const entry = store.get(hash);
    if (entry) entry.ts = Date.now() - TTL_MS - 1;
  },
};
