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
import { getActiveTenantId } from '../services/tenantContext';

export { openDB, STORES };

// ADR-036 MVP multi-finca: filtra una lista de assets ya leídos de IDB para
// dejar pasar solo los del tenant activo (o los legacy sin _tenant_id, que
// se consideran heredados pre-multifinca y se le asignan al tenant que los
// hidrate primero — comportamiento conservador para no esconder datos del
// operador single-tenant histórico).
//
// Mantener este filtro en el read-path (no en un IDB index) tiene un costo
// O(n) por query pero evita una migración de schema v14→v15 forzada hoy.
// Si la base supera ~5k assets por tenant, considerar índice compuesto
// [asset_type, _tenant_id] en una versión futura.
const filterByActiveTenant = (assets) => {
  const tenantId = getActiveTenantId();
  if (!tenantId) return assets; // sin login: comportamiento single-tenant.
  return assets.filter((a) => !a._tenant_id || a._tenant_id === tenantId);
};

export const assetCache = {
  /**
   * Almacenar un asset individual
   * Enriquece el registro JSON:API con asset_type y cached_at para indexación local
   */
  async put(assetType, asset) {
    const db = await openDB();
    // ADR-036 MVP multi-finca: stamp del tenant activo. Si el asset ya trae
    // un `_tenant_id` (rehidratación desde syncFromServer con asset remoto),
    // preservarlo — el caller sabe a qué tenant pertenece.
    const tenantId = asset._tenant_id || getActiveTenantId() || null;
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORES.ASSETS, 'readwrite');
      const store = tx.objectStore(STORES.ASSETS);
      store.put({ ...asset, asset_type: assetType, _tenant_id: tenantId, cached_at: Date.now() });
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  },

  /**
   * Inserta múltiples activos preservando aquellos que tienen cambios locales pendientes.
   * Regla: si `local._pending === true`, la versión remota se ignora.
   * Los datos del servidor siempre nacen confirmados (`_pending: false`).
   *
   * 2026-05-19 — DATA LOSS FIX: el GC NO se ejecuta dentro de bulkPut por
   * defecto. Antes purgaba assets locales que no estuvieran en `remoteAssets`,
   * pero como el sync llama bulkPut **por página**, las plantas de páginas
   * posteriores se borraban tras procesar la primera página → operator
   * perdió plantas creadas hoy. El GC ahora vive en `purgeAbsent(...)` que
   * `syncFromServer` invoca UNA vez al final con todos los ids remotos del
   * tipo. Para no romper callers que dependían del comportamiento anterior,
   * el flag `allowInlineGC: true` mantiene la semántica vieja.
   *
   * @param {string} assetType - Tipo de activo (plant, equipment, etc.)
   * @param {Array} remoteAssets - Lista de activos provenientes del servidor
   * @param {object} [opts]
   * @param {boolean} [opts.allowInlineGC=false] - Si true, purga locales no
   *   presentes en `remoteAssets`. ÚSALO solo cuando `remoteAssets` representa
   *   el universo completo del tipo. NUNCA dentro de un loop paginado.
   */
  async bulkPut(assetType, remoteAssets, { allowInlineGC = false } = {}) {
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
    // ADR-019 Fase 4: registrar reconciliaciones LWW para emitir alerta UI.
    const reconciliations = [];

    // 2. Merge lógico: remotos entran, pendings locales se preservan
    for (const remote of remoteAssets) {
      const local = localMap.get(remote.id);

      if (local && local._pending) {
        console.warn(`[Cache] Preservando cambio local _pending para ${remote.id}.`);
        continue;
      }

      // ADR-019 Fase 4: LWW field-level para inventory_value en
      // asset--material. Si el timestamp local es más reciente que el del
      // servidor, preservamos local y notificamos al operador. Esto cubre el
      // caso multi-dispositivo donde otro cliente sincronizó valores antiguos.
      if (assetType === 'material') {
        const localTs = local?.attributes?.inventory_value_updated_at || 0;
        const remoteTs = remote?.attributes?.inventory_value_updated_at || 0;
        if (localTs > 0 && localTs > remoteTs) {
          reconciliations.push({
            id: remote.id,
            name: local.attributes?.name || 'material',
            localValue: local.attributes?.inventory_value,
            remoteValue: remote.attributes?.inventory_value,
          });
          console.warn(
            `[Cache] LWW: preservando local de ${remote.id} (local ${localTs} > remote ${remoteTs}).`
          );
          continue;
        }
      }

      store.put({
        ...remote,
        asset_type: assetType,
        // ADR-036 MVP: assets recién recibidos pertenecen al tenant que los
        // descargó. Si no hay tenant activo (dev sin login), queda null y se
        // trata como legacy pre-multifinca.
        _tenant_id: getActiveTenantId() || null,
        cached_at: Date.now(),
        _pending: false,
      });
    }

    // 3. Garbage Collection: solo cuando el caller garantiza que
    // `remoteAssets` es el universo COMPLETO del tipo (no una página).
    // Sin este guard, un sync paginado purgaba plantas legítimas que aún
    // no habían aparecido en una página previa (data loss reportado
    // 2026-05-19). Para sync paginado, ver `purgeAbsent(...)` al cierre.
    if (allowInlineGC) {
      const remoteIds = new Set(remoteAssets.map((r) => r.id));
      for (const local of localAssets) {
        if (!remoteIds.has(local.id) && !local._pending) {
          store.delete(local.id);
          console.warn(`[Cache] Purgando activo eliminado en servidor: ${local.id}`);
        }
      }
    }

    return new Promise((resolve, reject) => {
      tx.oncomplete = () => {
        // ADR-019 Fase 4: emitir alerta de reconciliación para que el operador
        // sepa que su valor local se preservó frente a un servidor más viejo.
        // Se invoca tras tx.oncomplete para garantizar que el merge ya está
        // persistido cuando el listener (NetworkStatusBar) recibe la señal.
        if (typeof window !== 'undefined' && reconciliations.length > 0) {
          const names = reconciliations.map((r) => r.name).join(', ');
          window.dispatchEvent(
            new CustomEvent('farmosLog', {
              detail: `Inventario reconciliado (${reconciliations.length}): ${names} — revisar logs`,
            })
          );
        }
        resolve();
      };
      tx.onabort = () => reject(tx.error);
      tx.onerror = () => reject(tx.error);
    });
  },

  /**
   * Purga assets locales no-pending que NO están en el universo completo
   * del servidor. Llamar UNA sola vez al final de un sync paginado, con
   * el Set de TODOS los ids retornados sumando todas las páginas.
   *
   * @param {string} assetType
   * @param {Set<string>} allRemoteIds - universo completo del sync
   * @returns {Promise<number>} cantidad purgada
   */
  async purgeAbsent(assetType, allRemoteIds) {
    if (!(allRemoteIds instanceof Set)) {
      throw new Error('purgeAbsent: allRemoteIds debe ser un Set');
    }
    const db = await openDB();
    const tx = db.transaction(STORES.ASSETS, 'readwrite');
    const store = tx.objectStore(STORES.ASSETS);
    const index = store.index('asset_type');
    const localAssets = await new Promise((res, rej) => {
      const req = index.getAll(IDBKeyRange.only(assetType));
      req.onsuccess = () => res(req.result || []);
      req.onerror = () => rej(req.error);
    });
    // ADR-036 MVP multi-finca: el GC opera solo dentro del tenant activo.
    // Si un usuario A sincroniza, NO debe purgar assets que pertenezcan al
    // tenant B en el mismo device — el universo `allRemoteIds` solo cubre A.
    // Assets legacy sin _tenant_id también se purgan (mismo criterio que
    // filterByActiveTenant: se asumen del tenant activo).
    const activeTenant = getActiveTenantId();
    let purged = 0;
    for (const local of localAssets) {
      const belongsToActive = !local._tenant_id || !activeTenant || local._tenant_id === activeTenant;
      if (!belongsToActive) continue;
      if (!allRemoteIds.has(local.id) && !local._pending) {
        store.delete(local.id);
        purged++;
      }
    }
    return new Promise((resolve, reject) => {
      tx.oncomplete = () => {
        if (purged > 0) {
          console.warn(`[Cache] purgeAbsent(${assetType}): ${purged} purgados (post-sync completo)`);
        }
        resolve(purged);
      };
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
      // ADR-036 MVP multi-finca: scope por tenant activo en read-path.
      request.onsuccess = () => resolve(filterByActiveTenant(request.result || []));
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
        const activeTenant = getActiveTenantId() || null;
        assetUpdates.forEach(({ assetType, asset }) => {
          // ADR-036 MVP: stamp `_tenant_id` para que las queries scoped puedan
          // filtrarlo. Preserva el del asset si ya viene marcado (refill,
          // updates desde otro tenant en device compartido, etc).
          assetStore.put({
            ...asset,
            asset_type: assetType,
            _tenant_id: asset._tenant_id || activeTenant,
            cached_at: Date.now(),
          });
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
