/**
 * Capa de persistencia IndexedDB para activos FarmOS (Offline-First)
 *
 * Extiende ChagraDB de v2 a v3 agregando stores:
 *   - assets: cache de entidades FarmOS (structure, equipment, material)
 *   - taxonomy_terms: cache de términos de taxonomía (plant_type, material_type)
 *   - sync_meta: timestamps de última sincronización por tipo
 */

// Hotfix 11.6: la apertura de IndexedDB se centraliza en dbCore.
// assetCache re-exporta openDB/STORES para preservar la API consumida por
// el resto de los módulos (useAssetStore, logCache).
import { openDB, STORES } from './dbCore';

export { openDB, STORES };

export const assetCache = {
  /**
   * Almacenar un asset individual
   * Enriquece el registro JSON:API con asset_type y cached_at para indexación local
   */
  async put(assetType, asset) {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORES.ASSETS, 'readwrite');
      const store = tx.objectStore(STORES.ASSETS);
      store.put({ ...asset, asset_type: assetType, cached_at: Date.now() });
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  },

  /**
   * Inserta múltiples activos preservando aquellos que tienen cambios locales pendientes.
   * Regla: si `local._pending === true`, la versión remota se ignora.
   * Los datos del servidor siempre nacen confirmados (`_pending: false`).
   * @param {string} assetType - Tipo de activo (plant, equipment, etc.)
   * @param {Array} remoteAssets - Lista de activos provenientes del servidor
   */
  async bulkPut(assetType, remoteAssets) {
    const db = await openDB();
    const tx = db.transaction(STORES.ASSETS, 'readwrite');
    const store = tx.objectStore(STORES.ASSETS);

    // 1. Obtener todos los assets locales actuales del tipo específico
    const index = store.index('asset_type');
    const localAssets = await new Promise((res, rej) => {
      const req = index.getAll(IDBKeyRange.only(assetType));
      req.onsuccess = () => res(req.result || []);
      req.onerror = () => rej(req.error);
    });

    const localMap = new Map(localAssets.map((a) => [a.id, a]));

    // 2. Merge lógico: remotos entran, pendings locales se preservan
    for (const remote of remoteAssets) {
      const local = localMap.get(remote.id);

      if (local && local._pending) {
        console.warn(`[Cache] Preservando cambio local _pending para ${remote.id}.`);
        continue;
      }

      store.put({
        ...remote,
        asset_type: assetType,
        cached_at: Date.now(),
        _pending: false,
      });
    }

    // 3. Garbage Collection: purgar locales confirmados que el servidor ya no tiene
    const remoteIds = new Set(remoteAssets.map((r) => r.id));
    for (const local of localAssets) {
      if (!remoteIds.has(local.id) && !local._pending) {
        store.delete(local.id);
        console.warn(`[Cache] Purgando activo eliminado en servidor: ${local.id}`);
      }
    }

    return new Promise((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onabort = () => reject(tx.error);
      tx.onerror = () => reject(tx.error);
    });
  },

  /**
   * Obtener un asset individual por su id
   */
  async getAsset(id) {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORES.ASSETS, 'readonly');
      const request = tx.objectStore(STORES.ASSETS).get(id);
      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => reject(request.error);
    });
  },

  /**
   * Obtener todos los assets de un tipo desde IndexedDB
   */
  async getByType(assetType) {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORES.ASSETS, 'readonly');
      const store = tx.objectStore(STORES.ASSETS);
      const index = store.index('asset_type');
      const request = index.getAll(IDBKeyRange.only(assetType));
      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
  },

  /**
   * Eliminar un asset del cache
   */
  async remove(assetType, assetId) {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORES.ASSETS, 'readwrite');
      const store = tx.objectStore(STORES.ASSETS);
      store.delete(assetId);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  },

  /**
   * Almacenar taxonomy terms (bulk)
   */
  async bulkPutTaxonomyTerms(terms) {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORES.TAXONOMY, 'readwrite');
      const store = tx.objectStore(STORES.TAXONOMY);
      store.clear();
      for (const term of terms) {
        store.put({ ...term, cached_at: Date.now() });
      }
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  },

  /**
   * Obtener todos los taxonomy terms desde IndexedDB
   */
  async getAllTaxonomyTerms() {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORES.TAXONOMY, 'readonly');
      const store = tx.objectStore(STORES.TAXONOMY);
      const request = store.getAll();
      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
  },

  /**
   * Guardar timestamp de última sincronización
   */
  async setLastSync(timestamp) {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORES.SYNC_META, 'readwrite');
      const store = tx.objectStore(STORES.SYNC_META);
      store.put({ key: 'lastAssetSync', value: timestamp });
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  },

  /**
   * Obtener timestamp de última sincronización
   */
  async getLastSync() {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORES.SYNC_META, 'readonly');
      const store = tx.objectStore(STORES.SYNC_META);
      const request = store.get('lastAssetSync');
      request.onsuccess = () => resolve(request.result?.value || null);
      request.onerror = () => reject(request.error);
    });
  },

  /**
   * Obtiene el timestamp de cooldown para una combinación de sensor y tipo de alerta.
   */
  async getAlertCooldown(sensorId, alertType) {
    const db = await openDB();
    const key = `cooldown:${sensorId}:${alertType}`;
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORES.SYNC_META, 'readonly');
      const request = tx.objectStore(STORES.SYNC_META).get(key);
      request.onsuccess = () => resolve(request.result?.value || 0);
      request.onerror = () => reject(request.error);
    });
  },

  /**
   * Registra una alerta y su cooldown de forma atómica.
   * Garantiza que pending_transactions y sync_meta queden consistentes.
   */
  async commitAlertWithCooldown(sensorId, alertType, pendingTx) {
    const db = await openDB();
    const cooldownKey = `cooldown:${sensorId}:${alertType}`;
    return new Promise((resolve, reject) => {
      const tx = db.transaction([STORES.PENDING_TX, STORES.SYNC_META], 'readwrite');
      tx.oncomplete = () => resolve();
      tx.onabort = () => reject(tx.error);
      tx.onerror = () => reject(tx.error);

      // 1. Encolar transacción de red
      tx.objectStore(STORES.PENDING_TX).put({
        ...pendingTx,
        synced: false,
        retries: 0,
        timestamp: Date.now()
      });

      // 2. Persistir cooldown
      tx.objectStore(STORES.SYNC_META).put({
        key: cooldownKey,
        value: Date.now()
      });
    });
  },

  /**
   * Ejecuta una mutación atómica múltiple.
   * @param {Array} assetUpdates - Lista de { assetType, asset }
   * @param {Array} pendingTxs - Lista de transacciones de red a encolar
   */
  async commitOptimisticUpdate(assetUpdates = [], pendingTxs = []) {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const storesToLock = [STORES.PENDING_TX];
      if (assetUpdates.length > 0) storesToLock.push(STORES.ASSETS);

      const tx = db.transaction(storesToLock, 'readwrite');
      tx.oncomplete = () => resolve();
      tx.onabort = () => reject(tx.error);
      tx.onerror = () => reject(tx.error);

      if (assetUpdates.length > 0) {
        const assetStore = tx.objectStore(STORES.ASSETS);
        assetUpdates.forEach(({ assetType, asset }) => {
          assetStore.put({ ...asset, asset_type: assetType, cached_at: Date.now() });
        });
      }

      if (pendingTxs.length > 0) {
        const syncStore = tx.objectStore(STORES.PENDING_TX);
        pendingTxs.forEach((txData) => {
          syncStore.put({
            ...txData,
            synced: false,
            retries: 0,
            timestamp: txData.timestamp || Date.now()
          });
        });
      }
    });
  },
};
