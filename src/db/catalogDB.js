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

if (import.meta.env.DEV) {
    if (typeof window !== 'undefined') {
        window.__chagraCatalog = {
            initCatalog,
            getAllSpecies,
            getSpeciesByThermalZone
        };
    }
}
