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
import type { AssetType, ChagraAsset, TaxonomyTerm, TransactionRecord } from '../types';

export { openDB, STORES };

// Registros locales pueden tener un flag _pending durante operaciones optimistas
interface LocalAsset extends ChagraAsset {
  _pending?: boolean;
  [key: string]: unknown;
}

interface LocalTaxonomy extends TaxonomyTerm {
  cached_at?: number;
  [key: string]: unknown;
}

export const assetCache = {
  /**
   * Almacenar un asset individual
   * Enriquece el registro JSON:API con asset_type y cached_at para indexación local
   */
  async put(assetType: AssetType, asset: ChagraAsset): Promise<void> {
    const db = await openDB();
    return new Promise<void>((resolve, reject) => {
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
   */
  async bulkPut(assetType: AssetType, remoteAssets: ChagraAsset[]): Promise<void> {
    const db = await openDB();
    const tx = db.transaction(STORES.ASSETS, 'readwrite');
    const store = tx.objectStore(STORES.ASSETS);

    // 1. Obtener todos los assets locales actuales del tipo específico
    const index = store.index('asset_type');
    const localAssets: LocalAsset[] = await new Promise((res, rej) => {
      const req = index.getAll(IDBKeyRange.only(assetType));
      req.onsuccess = () => res((req.result as LocalAsset[]) || []);
      req.onerror = () => rej(req.error);
    });

    const localMap = new Map<string, LocalAsset>(localAssets.map((a) => [a.id, a]));

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

    return new Promise<void>((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onabort = () => reject(tx.error);
      tx.onerror = () => reject(tx.error);
    });
  },

  /**
   * Obtener un asset individual por su id
   */
  async getAsset(id: string): Promise<ChagraAsset | null> {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORES.ASSETS, 'readonly');
      const request = tx.objectStore(STORES.ASSETS).get(id);
      request.onsuccess = () => resolve((request.result as ChagraAsset | undefined) || null);
      request.onerror = () => reject(request.error);
    });
  },

  /**
   * Obtener todos los assets de un tipo desde IndexedDB
   */
  async getByType(assetType: AssetType): Promise<ChagraAsset[]> {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORES.ASSETS, 'readonly');
      const store = tx.objectStore(STORES.ASSETS);
      const index = store.index('asset_type');
      const request = index.getAll(IDBKeyRange.only(assetType));
      request.onsuccess = () => resolve((request.result as ChagraAsset[]) || []);
      request.onerror = () => reject(request.error);
    });
  },

  /**
   * Eliminar un asset del cache
   */
  async remove(_assetType: AssetType, assetId: string): Promise<void> {
    const db = await openDB();
    return new Promise<void>((resolve, reject) => {
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
  async bulkPutTaxonomyTerms(terms: TaxonomyTerm[]): Promise<void> {
    const db = await openDB();
    return new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORES.TAXONOMY, 'readwrite');
      const store = tx.objectStore(STORES.TAXONOMY);
      store.clear();
      for (const term of terms) {
        const enriched: LocalTaxonomy = { ...term, cached_at: Date.now() };
        store.put(enriched);
      }
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  },

  /**
   * Obtener todos los taxonomy terms desde IndexedDB
   */
  async getAllTaxonomyTerms(): Promise<TaxonomyTerm[]> {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORES.TAXONOMY, 'readonly');
      const store = tx.objectStore(STORES.TAXONOMY);
      const request = store.getAll();
      request.onsuccess = () => resolve((request.result as TaxonomyTerm[]) || []);
      request.onerror = () => reject(request.error);
    });
  },

  /**
   * Guardar timestamp de última sincronización
   */
  async setLastSync(timestamp: number): Promise<void> {
    const db = await openDB();
    return new Promise<void>((resolve, reject) => {
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
  async getLastSync(): Promise<number | null> {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORES.SYNC_META, 'readonly');
      const store = tx.objectStore(STORES.SYNC_META);
      const request = store.get('lastAssetSync');
      request.onsuccess = () => {
        const result = request.result as { value?: number } | undefined;
        resolve(result?.value ?? null);
      };
      request.onerror = () => reject(request.error);
    });
  },

  /**
   * Obtiene el timestamp de cooldown para una combinación de sensor y tipo de alerta.
   */
  async getAlertCooldown(sensorId: string, alertType: string): Promise<number> {
    const db = await openDB();
    const key = `cooldown:${sensorId}:${alertType}`;
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORES.SYNC_META, 'readonly');
      const request = tx.objectStore(STORES.SYNC_META).get(key);
      request.onsuccess = () => {
        const result = request.result as { value?: number } | undefined;
        resolve(result?.value ?? 0);
      };
      request.onerror = () => reject(request.error);
    });
  },

  /**
   * Registra una alerta y su cooldown de forma atómica.
   * Garantiza que pending_transactions y sync_meta queden consistentes.
   */
  async commitAlertWithCooldown(
    sensorId: string,
    alertType: string,
    pendingTx: Partial<TransactionRecord>
  ): Promise<void> {
    const db = await openDB();
    const cooldownKey = `cooldown:${sensorId}:${alertType}`;
    return new Promise<void>((resolve, reject) => {
      const tx = db.transaction([STORES.PENDING_TX, STORES.SYNC_META], 'readwrite');
      tx.oncomplete = () => resolve();
      tx.onabort = () => reject(tx.error);
      tx.onerror = () => reject(tx.error);

      // 1. Encolar transacción de red
      tx.objectStore(STORES.PENDING_TX).put({
        ...pendingTx,
        synced: false,
        retries: 0,
        timestamp: Date.now(),
      });

      // 2. Persistir cooldown
      tx.objectStore(STORES.SYNC_META).put({
        key: cooldownKey,
        value: Date.now(),
      });
    });
  },

  /**
   * Ejecuta una mutación atómica múltiple.
   */
  async commitOptimisticUpdate(
    assetUpdates: Array<{ assetType: AssetType; asset: ChagraAsset }> = [],
    pendingTxs: Array<Partial<TransactionRecord>> = []
  ): Promise<void> {
    const db = await openDB();
    return new Promise<void>((resolve, reject) => {
      const storesToLock: string[] = [STORES.PENDING_TX];
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
        const base = Date.now();
        pendingTxs.forEach((txData, index) => {
          syncStore.put({
            ...txData,
            synced: false,
            retries: 0,
            // Offset ensures dependent transactions (e.g. seeding after plant) are
            // processed in insertion order when sorted by timestamp.
            timestamp: (txData.timestamp || base) + index,
          });
        });
      }
    });
  },
};
