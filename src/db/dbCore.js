/**
 * dbCore — Singleton de acceso a ChagraDB (IndexedDB).
 *
 * Único punto de apertura para toda la aplicación. Reemplaza a las aperturas
 * manuales previas en assetCache.js y syncManager.js, evitando race conditions
 * de `onupgradeneeded` duplicado y garantizando una sola versión activa.
 *
 * Esquema v7 (2026-04-29):
 *   - assets               (keyPath: id; indexes: asset_type, cached_at)
 *   - taxonomy_terms       (keyPath: id; indexes: type)
 *   - sync_meta            (keyPath: key)
 *   - pending_transactions (keyPath: id, autoIncrement; indexes: timestamp, type)
 *   - pending_tasks        (keyPath: id; indexes: timestamp, status)
 *   - logs                 (keyPath: id; indexes: asset_id, timestamp, type)
 *   - media_cache          (keyPath: id, autoIncrement; indexes: logId, createdAt)
 *   - pending_voice_recordings (v0.5.0: keyPath: id, autoIncrement)
 *   - inventory_events     (v7 ADR-027.i+ii: keyPath: id ULID; indexes:
 *                           item_id, timestamp, event_type, idempotency_key)
 *   - inventory_stock_snapshot (v7: materialized view, keyPath: item_id)
 */

export const DB_NAME = 'ChagraDB';
export const DB_VERSION = 8;

export const STORES = {
  ASSETS: 'assets',
  TAXONOMY: 'taxonomy_terms',
  SYNC_META: 'sync_meta',
  LOGS: 'logs',
  PENDING_TX: 'pending_transactions',
  PENDING_TASKS: 'pending_tasks', // @deprecated: usar LOGS con type='log--task'
  MEDIA_CACHE: 'media_cache',
  PENDING_VOICE: 'pending_voice_recordings',
  INVENTORY_EVENTS: 'inventory_events',
  INVENTORY_STOCK: 'inventory_stock_snapshot',
  PLANS: 'plans',
};

let dbInstance = null;
let connectionPromise = null;

export const openDB = async () => {
  if (dbInstance) return dbInstance;
  if (connectionPromise) return connectionPromise;

  connectionPromise = new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      console.log(`[DB] Upgrading schema to v${DB_VERSION}…`);

      // pending_transactions (cola de salida — autoincrement + string uuids)
      if (!db.objectStoreNames.contains(STORES.PENDING_TX)) {
        const store = db.createObjectStore(STORES.PENDING_TX, { keyPath: 'id', autoIncrement: true });
        store.createIndex('timestamp', 'timestamp', { unique: false });
        store.createIndex('type', 'type', { unique: false });
      }

      // pending_tasks (snapshot offline de tareas FarmOS)
      if (!db.objectStoreNames.contains(STORES.PENDING_TASKS)) {
        const store = db.createObjectStore(STORES.PENDING_TASKS, { keyPath: 'id' });
        store.createIndex('timestamp', 'timestamp', { unique: false });
        store.createIndex('status', 'status', { unique: false });
      }

      // assets (cache de activos FarmOS)
      if (!db.objectStoreNames.contains(STORES.ASSETS)) {
        const store = db.createObjectStore(STORES.ASSETS, { keyPath: 'id' });
        store.createIndex('asset_type', 'asset_type', { unique: false });
        store.createIndex('cached_at', 'cached_at', { unique: false });
      }

      // taxonomy_terms
      if (!db.objectStoreNames.contains(STORES.TAXONOMY)) {
        const store = db.createObjectStore(STORES.TAXONOMY, { keyPath: 'id' });
        store.createIndex('type', 'type', { unique: false });
      }

      // sync_meta (timestamps y cooldowns)
      if (!db.objectStoreNames.contains(STORES.SYNC_META)) {
        db.createObjectStore(STORES.SYNC_META, { keyPath: 'key' });
      }

      // logs (timeline de eventos por activo — Fase 11)
      if (!db.objectStoreNames.contains(STORES.LOGS)) {
        const store = db.createObjectStore(STORES.LOGS, { keyPath: 'id' });
        store.createIndex('asset_id', 'asset_id', { unique: false });
        store.createIndex('timestamp', 'timestamp', { unique: false });
        store.createIndex('type', 'type', { unique: false });
      }

      // v5: media_cache — binarios de evidencia fotográfica asociados a logs
      if (!db.objectStoreNames.contains(STORES.MEDIA_CACHE)) {
        const store = db.createObjectStore(STORES.MEDIA_CACHE, { keyPath: 'id', autoIncrement: true });
        store.createIndex('logId', 'logId', { unique: false });
        store.createIndex('assetId', 'assetId', { unique: false });
        store.createIndex('createdAt', 'createdAt', { unique: false });
      }

      // v6: pending_voice_recordings — blobs de audio capturados offline o
      // con fallo de transcripción/extracción, pendientes de reprocesamiento.
      if (!db.objectStoreNames.contains(STORES.PENDING_VOICE)) {
        const store = db.createObjectStore(STORES.PENDING_VOICE, { keyPath: 'id', autoIncrement: true });
        store.createIndex('createdAt', 'createdAt', { unique: false });
        store.createIndex('status', 'status', { unique: false });
      }

      // v7: inventory_events — log append-only ADR-019 + ADR-027.i+ii.
      // Append-only inmutable. Reconciliación post-sync por timestamp +
      // device_id_lex_hash + sequence_number.
      if (!db.objectStoreNames.contains(STORES.INVENTORY_EVENTS)) {
        const store = db.createObjectStore(STORES.INVENTORY_EVENTS, { keyPath: 'id' });
        store.createIndex('item_id', 'payload.item_id', { unique: false });
        store.createIndex('timestamp', 'timestamp', { unique: false });
        store.createIndex('event_type', 'event_type', { unique: false });
        store.createIndex('idempotency_key', 'idempotency_key', { unique: false });
      }

      // v7: inventory_stock_snapshot — materialized view derivada de
      // inventory_events. Reconstruible desde scratch en cualquier momento
      // (cumple ADR-019 — log es source of truth, esto es solo cache O(1)).
      if (!db.objectStoreNames.contains(STORES.INVENTORY_STOCK)) {
        db.createObjectStore(STORES.INVENTORY_STOCK, { keyPath: 'item_id' });
      }

      // v8: plans — generated feeding plans
      if (!db.objectStoreNames.contains(STORES.PLANS)) {
        const store = db.createObjectStore(STORES.PLANS, { keyPath: 'id' });
        store.createIndex('asset_id', 'asset_id', { unique: false });
        store.createIndex('species_slug', 'species_slug', { unique: false });
      }
    };

    request.onsuccess = (event) => {
      dbInstance = event.target.result;
      connectionPromise = null;

      // Cerrar la conexión si otra pestaña solicita un upgrade futuro,
      // evitando bloqueos durante el onblocked de nuevas versiones.
      dbInstance.onversionchange = () => {
        dbInstance.close();
        dbInstance = null;
        console.warn('[DB] Version change detected. Connection closed.');
      };

      resolve(dbInstance);
    };

    request.onerror = (event) => {
      connectionPromise = null;
      reject(event.target.error);
    };

    request.onblocked = () => {
      console.warn('[DB] Open request blocked — another connection holds the DB.');
    };
  });

  return connectionPromise;
};
