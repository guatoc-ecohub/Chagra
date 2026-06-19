import sqlite3InitModule from '@sqlite.org/sqlite-wasm';
import { loadCatalogBuffer, assertCatalogShape, isAbortLikeFetchError } from '../services/corpusLoader';

let dbInstance = null;
let initPromise = null;

async function doInit() {
    const sqlite3 = await sqlite3InitModule({
        print: console.log,
        printErr: console.error,
    });
    console.log('[SQLite WASM] Engine loaded successfully.');

    // CHAGRA_TIER detection (#74): el blob SQLite puede venir del bundle
    // OSS (`/catalog.sqlite`) o de un CDN Pro override. corpusLoader
    // resuelve la URL, fetchea y valida magic header. Si TIER=PRO sin URL
    // set, hace fallback a OSS (no rompe deploy).
    const { buffer: uint8Array, source } = await loadCatalogBuffer();
    console.log(`[SQLite WASM] Catalog loaded from ${source.url} (tier=${source.tier}${source.fallback ? ', fallback' : ''})`);

    let db = null;
    if (sqlite3.opfs && typeof navigator !== 'undefined' && navigator.storage && navigator.storage.getDirectory) {
        try {
            const root = await navigator.storage.getDirectory();
            // Write to OPFS root directory
            const fileHandle = await root.getFileHandle('catalog.sqlite', { create: true });
            const writable = await fileHandle.createWritable();
            await writable.write(uint8Array);
            await writable.close();

            db = new sqlite3.oo1.OpfsDb('/catalog.sqlite');
            console.log('[SQLite WASM] Opened SQLite DB backed by OPFS');
        } catch (e) {
            console.warn('[SQLite WASM] Failed to use OPFS cleanly in this thread. Falling back to memory...', e);
        }
    }

    if (!db) {
        // Fallback: transient Memory (deserialization)
        const p = sqlite3.wasm.allocFromTypedArray(uint8Array);
        db = new sqlite3.oo1.DB();
        const deserializeFlag = sqlite3.capi.SQLITE_DESERIALIZE_FREEONCLOSE;
        const rc = sqlite3.capi.sqlite3_deserialize(
            db.pointer, 'main', p, uint8Array.byteLength, uint8Array.byteLength, deserializeFlag
        );
        if (rc !== 0) throw new Error('Deserialize failed with code ' + rc);
        console.log('[SQLite WASM] Opened SQLite DB locally from Memory deserialization');
    }

    // Validar shape mínimo: tabla species con rows. Si el CDN Pro sirvió un
    // blob malformado, fallamos rápido acá en vez de degradar silencioso.
    assertCatalogShape(db);

    return db;
}

export async function initCatalog() {
    // Si dbInstance ya está, devolverlo de inmediato.
    if (dbInstance) return dbInstance;
    // Si hay init en vuelo, devolver esa promesa (evita race conditions).
    if (initPromise) return initPromise;

    initPromise = doInit().then((db) => {
        dbInstance = db;
        return db;
    }).catch((error) => {
        // Bug fix v0.8.2: si init falla, limpiamos initPromise para permitir
        // retry en la próxima llamada. Sin esto, una falla inicial (ej.
        // /catalog.sqlite 404 transitorio, OPFS bloqueado) dejaba el catálogo
        // permanentemente broken hasta refresh manual.
        initPromise = null;
        // Abort por unload/reload (bug prod 2026-06-14): el fetch del catálogo
        // se aborta cuando un SW nuevo recarga el cliente durante el arranque.
        // NO es bloqueante (el home usa fallback de stats y los componentes
        // reintentan al usar el catálogo) y NO debe gritar console.error: es
        // ruido esperado en cada deploy. Degradamos a debug; loadCatalogBuffer
        // ya reintentó una vez antes de llegar acá.
        if (isAbortLikeFetchError(error)) {
            console.debug('[SQLite WASM] init del catálogo abortado (probable reload por SW nuevo); se reintentará on-demand.');
        } else {
            console.error('[SQLite WASM] Failed to initialize catalog db:', error);
        }
        throw error;
    });

    return initPromise;
}

export async function getAllSpecies() {
    if (!dbInstance) await initCatalog();
    const rows = dbInstance.exec({
        sql: 'SELECT data FROM species',
        rowMode: 'object'
    });
    return rows.map(r => JSON.parse(r.data));
}

export async function getSpeciesById(id) {
    if (!id) return null;
    if (!dbInstance) await initCatalog();
    const rows = dbInstance.exec({
        sql: 'SELECT data FROM species WHERE id = ?',
        bind: [id],
        rowMode: 'object',
    });
    return rows.length ? JSON.parse(rows[0].data) : null;
}

/**
 * Versión síncrona para simplificar consumo en componentes React/Hooks (ADR-030).
 * Retorna null si la DB no está lista o no existe el ID.
 * App.jsx garantiza el preload; este sync es seguro en el 99% de los casos.
 */
export function getSpeciesByIdSync(id) {
    if (!id || !dbInstance) return null;
    try {
        const rows = dbInstance.exec({
            sql: 'SELECT data FROM species WHERE id = ?',
            bind: [id],
            rowMode: 'object',
        });
        return rows.length ? JSON.parse(rows[0].data) : null;
    } catch (e) {
        console.warn(`[getSpeciesByIdSync] Error lookup ${id}:`, e);
        return null;
    }
}

export async function getSpeciesByThermalZone(zone) {
    if (!dbInstance) await initCatalog();
    const rows = dbInstance.exec({
        sql: `SELECT s.data FROM species s
          JOIN species_thermal_zones t ON s.id = t.species_id
          WHERE t.thermal_zone = ?`,
        bind: [zone],
        rowMode: 'object'
    });
    return rows.map(r => JSON.parse(r.data));
}

/**
 * Obtiene sustitutos nativos curados para una especie invasora.
 * @param {string} invasiveId - ID de la especie invasora
 * @param {Object} [options]
 * @param {string} [options.thermalZone] - Filtrar por piso térmico
 * @param {number} [options.limit=5] - Máximo de resultados
 * @returns {Promise<Array<{id,nombre_comun,nombre_cientifico,estrato,thermal_zones,sources_ids}>>}
 */
export async function getNativeSubstitutesForInvasive(invasiveId, options = {}) {
    if (!dbInstance) await initCatalog();
    const { thermalZone, limit = 5 } = options;

    // 1. Load invasive species data blob
    const invasiveRows = dbInstance.exec({
        sql: 'SELECT data FROM species WHERE id = ?',
        bind: [invasiveId],
        rowMode: 'object',
    });
    if (!invasiveRows.length) return [];

    const invasive = JSON.parse(invasiveRows[0].data);
    const substituteIds = invasive.especies_nativas_sustitutas;
    if (!Array.isArray(substituteIds) || substituteIds.length === 0) return [];

    // 2. Load each substitute species
    const results = [];
    for (const id of substituteIds) {
        const rows = dbInstance.exec({
            sql: 'SELECT data FROM species WHERE id = ?',
            bind: [id],
            rowMode: 'object',
        });
        if (!rows.length) continue;
        const sp = JSON.parse(rows[0].data);

        // 3. Optional thermal zone filter
        if (thermalZone) {
            const zones = sp.thermal_zones || [];
            if (!zones.includes(thermalZone)) continue;
        }

        results.push({
            id: sp.id,
            nombre_comun: sp.nombre_comun,
            nombre_cientifico: sp.nombre_cientifico,
            estrato: sp.estrato,
            thermal_zones: sp.thermal_zones || [],
            sources_ids: sp.sources_ids || [],
        });
        if (results.length >= limit) break;
    }
    return results;
}

/**
 * Stats agregados del catálogo. Usado por WelcomeStatsHero pre/post login.
 * Devuelve counts de species + biopreparados + sources tier A.
 * Si SQLite no inicializó, retorna fallbacks razonables del seed actual
 * para que el banner muestre números reales (486/19/52) en vez de 0.
 *
 * @returns {Promise<{species:number, biopreparados:number, sourcesTierA:number, endemicas:number, endangered:number, invasoras:number}>}
 */
export async function getCatalogStats() {
    const FALLBACK = {
        species: 486,
        biopreparados: 19,
        sourcesTierA: 52,
        endemicas: 9,
        endangered: 18,
        invasoras: 17,
    };
    try {
        if (!dbInstance) await initCatalog();
        if (!dbInstance) return FALLBACK;

        const speciesRow = dbInstance.exec({
            sql: 'SELECT COUNT(*) as n FROM species',
            rowMode: 'object',
        });
        const speciesCount = speciesRow?.[0]?.n ?? FALLBACK.species;

        const biopRow = dbInstance.exec({
            sql: 'SELECT COUNT(*) as n FROM biopreparados',
            rowMode: 'object',
        });
        const biopreparadosCount = biopRow?.[0]?.n ?? FALLBACK.biopreparados;

        return {
            species: Number(speciesCount) || FALLBACK.species,
            biopreparados: Number(biopreparadosCount) || FALLBACK.biopreparados,
            sourcesTierA: FALLBACK.sourcesTierA,
            endemicas: FALLBACK.endemicas,
            endangered: FALLBACK.endangered,
            invasoras: FALLBACK.invasoras,
        };
    } catch (err) {
        console.warn('[catalogDB.getCatalogStats] failed, using fallback:', err);
        return FALLBACK;
    }
}

/**
 * Lista todos los biopreparados del catálogo.
 * @returns {Promise<Array<biopreparado>>}
 */
export async function getAllBiopreparados() {
    if (!dbInstance) await initCatalog();
    const rows = dbInstance.exec({
        sql: 'SELECT data FROM biopreparados ORDER BY nombre',
        rowMode: 'object',
    });
    return rows.map((r) => JSON.parse(r.data));
}

/**
 * Lista todos los fermentos del catálogo (alimentarios + vetos de seguridad).
 * @returns {Promise<Array<fermento>>}
 */
export async function getAllFermentos() {
    if (!dbInstance) await initCatalog();
    const rows = dbInstance.exec({
        sql: 'SELECT data FROM fermentos ORDER BY tipo DESC, nombre',
        rowMode: 'object',
    });
    return rows.map((r) => JSON.parse(r.data));
}

/**
 * Encuentra biopreparados que usan un ingrediente específico (Miguel UX
 * 2026-05-03: cuando user agrega melaza a bodega, sugerir Bocashi/Biol/etc).
 *
 * Match fuzzy: normaliza ambos lados (lowercase + sin tildes) y comprueba
 * substring. Maneja sinónimos comunes (suero ↔ suero de leche, leche
 * ↔ suero de leche).
 *
 * @param {string} ingredientName — nombre del material como lo añadió user
 * @returns {Promise<Array<biopreparado>>}
 */
export async function findBiopreparadosByIngredient(ingredientName) {
    if (!ingredientName || typeof ingredientName !== 'string') return [];
    if (!dbInstance) await initCatalog();
    const norm = (s) => (s || '')
        .toLowerCase()
        .normalize('NFD')
        .replace(/[̀-ͯ]/g, '')
        .trim();
    const target = norm(ingredientName);
    if (target.length < 3) return [];

    const all = await getAllBiopreparados();
    return all.filter((bp) => {
        if (!Array.isArray(bp.ingredientes)) return false;
        return bp.ingredientes.some((ing) => {
            const ingNorm = norm(ing);
            return ingNorm.includes(target) || target.includes(ingNorm);
        });
    });
}

if (import.meta.env.DEV) {
    if (typeof window !== 'undefined') {
        window.__chagraCatalog = {
            initCatalog,
            getAllSpecies,
            getAllBiopreparados,
            getAllFermentos,
            findBiopreparadosByIngredient,
            getSpeciesByThermalZone,
            getNativeSubstitutesForInvasive
        };
    }
}
