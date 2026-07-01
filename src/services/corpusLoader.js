/**
 * corpusLoader.js — TIER detection runtime para el catálogo SQLite (#74).
 *
 * Step 3 del cutover OSS→Pro (ADR-002, oss-pro/README.md). La PWA se
 * compila a un único bundle público; el seed del catálogo SQLite que se
 * embebe en `public/catalog.sqlite` lo elige el build script según
 * `CHAGRA_SEED` (subset OSS v3.2 por default; corpus full en build Pro).
 * Este módulo decide en RUNTIME desde dónde fetchea el blob según
 * `VITE_CHAGRA_TIER`, para que un único deploy pueda servir el catálogo
 * full cuando vive en CDN separado (chagra-pro).
 *
 * Reglas operativas:
 * - OSS (default): fetchea `/catalog.sqlite` bundleado (subset 105 species).
 * - PRO: fetchea `VITE_CHAGRA_CATALOG_URL`. Si la URL no está set, se
 *   loguea warning y se cae a OSS para no romper el deploy.
 * - El loader valida que la respuesta tenga magic header SQLite y devuelve
 *   el Uint8Array. La validación del shape (tabla `species` con rows) la
 *   hace el caller (catalogDB.js) cuando deserializa, vía
 *   `assertCatalogShape(db)`.
 * - Backwards-compatible: sin las nuevas vars, sigue cargando `/catalog.sqlite`.
 *
 * Env vars (build-time, opcionales):
 * - VITE_CHAGRA_TIER=OSS|PRO            — default OSS
 * - VITE_CHAGRA_CATALOG_URL=<absURL>    — solo aplica si TIER=PRO
 *
 * NOTA: este módulo NO importa nada del bundle Pro (ADR-002). El catálogo
 * Pro vive en un CDN externo; este código sólo conoce su URL como string.
 */

const SQLITE_MAGIC = 'SQLite format 3\0';
const TIER_OSS = 'OSS';
const TIER_PRO = 'PRO';
const DEFAULT_CATALOG_URL = '/catalog.sqlite';
// Timeout defensivo del fetch del catálogo (~1.2 MB). En rural lento un fetch
// colgado indefinidamente bloquearía el preload; abortamos y dejamos que el
// retry/los componentes reintenten on-demand.
const CATALOG_FETCH_TIMEOUT_MS = 30000;

/**
 * Heurística: ¿este error es un ABORT del fetch del catálogo por unload/reload,
 * y NO un fallo real (404, magic header, CDN caído)?
 *
 * Caso principal (bug prod 2026-06-14): el SW nuevo de un deploy hace
 * clients.claim() y el cliente recarga vía controllerchange MIENTRAS el fetch
 * de 1.2 MB de `/catalog.sqlite` está en vuelo → el browser lo aborta
 * (net::ERR_ABORTED → en JS un TypeError "Failed to fetch", o un AbortError si
 * fue nuestro propio AbortController). NO es bloqueante (el home usa fallback de
 * stats) y NO debe gritar console.error: es ruido esperado en cada deploy.
 *
 * @param {unknown} err
 * @returns {boolean}
 */
export function isAbortLikeFetchError(err) {
    if (!err || typeof err !== 'object') return false;
    const name = 'name' in err ? String(err.name) : '';
    if (name === 'AbortError') return true;
    // "Failed to fetch" (Chromium) / "NetworkError when attempting to fetch
    // resource." (Firefox): aborto por navegación/unload o red caída. Lo
    // tratamos como abort-like (degradable) en boot; el retry/los componentes
    // cubren el caso de red genuinamente caída.
    if (name === 'TypeError') {
        const msg = 'message' in err ? String(err.message) : '';
        return /failed to fetch|networkerror|load failed/i.test(msg);
    }
    return false;
}

/**
 * Lee `VITE_CHAGRA_TIER`. Acepta 'PRO'/'pro' como Pro; cualquier otro valor
 * (incluido undefined, vacío o cualquier string) → OSS.
 *
 * @returns {'OSS'|'PRO'}
 */
export function getTier() {
    try {
        const raw = import.meta.env?.VITE_CHAGRA_TIER;
        if (typeof raw === 'string' && raw.trim().toUpperCase() === TIER_PRO) {
            return TIER_PRO;
        }
    } catch (_) {
        // ignore — fallback OSS
    }
    return TIER_OSS;
}

/**
 * Resuelve la URL del catálogo SQLite a fetchear.
 *
 * Contrato:
 *   - tier=OSS → `/catalog.sqlite` (bundle estático en public/).
 *   - tier=PRO + URL set → la URL override (CDN externo Pro).
 *   - tier=PRO + URL ausente → warning + fallback a OSS (no rompe deploy).
 *
 * @returns {{ url: string, tier: 'OSS'|'PRO', fallback: boolean }}
 */
export function resolveCatalogUrl() {
    const tier = getTier();
    if (tier === TIER_OSS) {
        return { url: DEFAULT_CATALOG_URL, tier, fallback: false };
    }

    let overrideUrl = null;
    try {
        const raw = import.meta.env?.VITE_CHAGRA_CATALOG_URL;
        if (typeof raw === 'string' && raw.trim()) {
            overrideUrl = raw.trim();
        }
    } catch (_) {
        // ignore
    }

    if (!overrideUrl) {
        console.warn(
            '[corpusLoader] VITE_CHAGRA_TIER=PRO pero VITE_CHAGRA_CATALOG_URL no está set; ' +
            'fallback a catálogo OSS bundleado para no romper deploy.'
        );
        return { url: DEFAULT_CATALOG_URL, tier: TIER_OSS, fallback: true };
    }

    return { url: overrideUrl, tier: TIER_PRO, fallback: false };
}

/**
 * Una sola pasada de fetch + validación del blob del catálogo. Usa un
 * AbortController propio con timeout defensivo. Separada de loadCatalogBuffer
 * para que esta pueda reintentar ante un abort sin duplicar la validación.
 *
 * @param {{ url: string, tier: 'OSS'|'PRO', fallback: boolean }} source
 * @param {AbortSignal} [externalSignal] - signal del caller (ej. reload/unload).
 * @returns {Promise<Uint8Array>}
 */
async function fetchCatalogOnce(source, externalSignal) {
    const controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
    let timer = null;
    // Encadena el signal externo (si lo hay) al nuestro: si el caller aborta,
    // abortamos también.
    const onExternalAbort = () => controller?.abort();
    if (externalSignal && controller) {
        if (externalSignal.aborted) controller.abort();
        else externalSignal.addEventListener('abort', onExternalAbort, { once: true });
    }
    if (controller) {
        timer = setTimeout(() => controller.abort(), CATALOG_FETCH_TIMEOUT_MS);
    }

    try {
        const response = await fetch(source.url, controller ? { signal: controller.signal } : undefined);
        if (!response.ok) {
            throw new Error(
                `[corpusLoader] Failed to fetch ${source.url}: HTTP ${response.status} ${response.statusText}`
            );
        }
        const arrayBuffer = await response.arrayBuffer();
        const buffer = new Uint8Array(arrayBuffer);

        if (buffer.byteLength < SQLITE_MAGIC.length) {
            throw new Error(
                `[corpusLoader] Catalog payload too small (${buffer.byteLength} bytes) — not a valid SQLite file.`
            );
        }
        // Validar magic header SQLite.
        for (let i = 0; i < SQLITE_MAGIC.length; i++) {
            if (buffer[i] !== SQLITE_MAGIC.charCodeAt(i)) {
                throw new Error(
                    `[corpusLoader] Invalid catalog payload — missing SQLite magic header. ` +
                    `Source=${source.url} tier=${source.tier}`
                );
            }
        }
        return buffer;
    } finally {
        if (timer) clearTimeout(timer);
        if (externalSignal && controller) externalSignal.removeEventListener('abort', onExternalAbort);
    }
}

/**
 * Fetchea el catálogo SQLite y devuelve un Uint8Array. Valida magic header
 * SQLite ("SQLite format 3\0") antes de devolver, para fallar rápido si el
 * CDN devuelve HTML de error o el archivo está corrupto.
 *
 * RESILIENCIA AL ABORT (bug prod 2026-06-14): el fetch de ~1.2 MB se aborta si
 * el cliente recarga durante el arranque (SW nuevo → clients.claim() →
 * controllerchange → reload). En ese caso NO gritamos: degradamos a
 * console.debug y reintentamos UNA vez (el reload casi siempre lo desencadena
 * el SW recién activado, que ya dejó `/catalog.sqlite` cacheado, así que el
 * retry es instantáneo desde el SW cache-first). Un fallo real (404, magic
 * header inválido, CDN caído) NO es abort-like → propaga el throw como siempre.
 *
 * Throws si:
 *   - fetch no responde 2xx (y no es un abort).
 *   - el blob es muy chico (<16 bytes) o no empieza con magic SQLite.
 *
 * @param {{ signal?: AbortSignal }} [options]
 * @returns {Promise<{ buffer: Uint8Array, source: { url: string, tier: 'OSS'|'PRO', fallback: boolean } }>}
 */
export async function loadCatalogBuffer(options = {}) {
    const source = resolveCatalogUrl();
    const { signal } = options;
    try {
        const buffer = await fetchCatalogOnce(source, signal);
        return { buffer, source };
    } catch (err) {
        // Fallo real (HTTP/magic/corrupto) → propagar tal cual.
        if (!isAbortLikeFetchError(err)) throw err;
        // Si el caller abortó a propósito, no reintentar: respetamos su intención.
        if (signal?.aborted) throw err;
        // Abort por unload/reload: ruido esperado en cada deploy. Degradar a
        // debug (NO error) y reintentar UNA vez.
        console.debug(
            `[corpusLoader] fetch de ${source.url} abortado (probable reload por SW nuevo); reintentando una vez.`
        );
        const buffer = await fetchCatalogOnce(source, signal);
        return { buffer, source };
    }
}

/**
 * Valida que un handle SQLite ya inicializado contiene un catálogo bien
 * formado (tabla `species` con al menos una row). Llamado por catalogDB.js
 * después de deserializar.
 *
 * Lanza Error si la tabla no existe o está vacía. El motivo: un blob SQLite
 * válido pero vacío (ej. CDN devolvió placeholder) pasaría la validación de
 * magic header pero rompería todo el agente downstream.
 *
 * @param {object} db — handle sqlite-wasm con .exec().
 * @returns {{ speciesCount: number }}
 */
export function assertCatalogShape(db) {
    if (!db || typeof db.exec !== 'function') {
        throw new Error('[corpusLoader] assertCatalogShape: handle SQLite inválido.');
    }
    let rows;
    try {
        rows = db.exec({
            sql: 'SELECT COUNT(*) as n FROM species',
            rowMode: 'object',
        });
    } catch (e) {
        throw new Error(
            `[corpusLoader] assertCatalogShape: tabla species no consultable (${e.message}).`
        );
    }
    const count = Number(rows?.[0]?.n ?? 0);
    if (!Number.isFinite(count) || count <= 0) {
        throw new Error(
            `[corpusLoader] assertCatalogShape: tabla species vacía o count inválido (${count}).`
        );
    }
    return { speciesCount: count };
}
