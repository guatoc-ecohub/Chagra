import sqlite3InitModule from '@sqlite.org/sqlite-wasm';

let dbInstance = null;
let initPromise = null;

export async function initCatalog() {
    if (initPromise) return initPromise;
    initPromise = (async () => {
        try {
            const sqlite3 = await sqlite3InitModule({
                print: console.log,
                printErr: console.error,
            });
            console.log('[SQLite WASM] Engine loaded successfully.');

            const response = await fetch('/catalog.sqlite');
            if (!response.ok) throw new Error('Failed to fetch /catalog.sqlite');
            const arrayBuffer = await response.arrayBuffer();
            const uint8Array = new Uint8Array(arrayBuffer);

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

            dbInstance = db;
            return db;
        } catch (error) {
            console.error('[SQLite WASM] Failed to initialize catalog db:', error);
            throw error;
        }
    })();
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

if (import.meta.env.DEV) {
    if (typeof window !== 'undefined') {
        window.__chagraCatalog = {
            initCatalog,
            getAllSpecies,
            getSpeciesByThermalZone,
            getNativeSubstitutesForInvasive
        };
    }
}
