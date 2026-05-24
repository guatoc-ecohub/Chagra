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
 * Fetchea el catálogo SQLite y devuelve un Uint8Array. Valida magic header
 * SQLite ("SQLite format 3\0") antes de devolver, para fallar rápido si el
 * CDN devuelve HTML de error o el archivo está corrupto.
 *
 * Throws si:
 *   - fetch no responde 2xx.
 *   - el blob es muy chico (<16 bytes) o no empieza con magic SQLite.
 *
 * @returns {Promise<{ buffer: Uint8Array, source: { url: string, tier: 'OSS'|'PRO', fallback: boolean } }>}
 */
export async function loadCatalogBuffer() {
    const source = resolveCatalogUrl();
    const response = await fetch(source.url);
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

    return { buffer, source };
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
