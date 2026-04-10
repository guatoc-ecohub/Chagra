/**
 * Capa de persistencia IndexedDB para logs FarmOS (Fase 11 - Offline-First).
 *
 * Store: 'logs' (ChagraDB v4)
 * Índices: asset_id, timestamp, type
 *
 * Esquema normalizado por log:
 *   - id            (PK, string UUID)
 *   - type          (log--seeding, log--harvest, log--input, ...)
 *   - asset_id      (derivado de relationships.asset.data[0].id)
 *   - timestamp     (UNIX seconds)
 *   - status        ('pending' | 'done')
 *   - _pending      (flag de sincronización de salida)
 *   - attributes    (JSON:API raw)
 *   - relationships (JSON:API raw)
 *   - cached_at     (ms)
 */

import { openDB, STORES } from './dbCore';

// Extrae asset_id desde la relación JSON:API (soporta to-one y to-many)
const extractAssetId = (log) => {
  const rel = log.relationships?.asset?.data;
  if (Array.isArray(rel)) return rel[0]?.id || null;
  return rel?.id || null;
};

// Resuelve la cantidad (quantity--standard) desde el array `included` del JSON:API.
// FarmOS devuelve las quantities como recursos separados; el log solo trae la referencia.
const extractQuantityFromIncluded = (relationships, included) => {
  if (!relationships?.quantity?.data || !included) return null;
  const refs = Array.isArray(relationships.quantity.data)
    ? relationships.quantity.data
    : [relationships.quantity.data];
  if (refs.length === 0) return null;

  const first = refs[0];
  const quantityObj = included.find(
    (inc) => inc.id === first.id && (inc.type === first.type || inc.type?.startsWith('quantity'))
  );
  if (!quantityObj) return null;

  const attrs = quantityObj.attributes || {};
  const rawValue = attrs.value;
  const value = typeof rawValue === 'object' && rawValue !== null
    ? parseFloat(rawValue.decimal ?? rawValue.value ?? 0)
    : parseFloat(rawValue ?? 0);

  return {
    value: isNaN(value) ? 0 : value,
    unit: attrs.unit || attrs.label || null,
    label: attrs.label || null,
    measure: attrs.measure || null,
  };
};

// Polimórfica (Fase 15.1): agnóstica al tipo de log, resuelve quantity via
// included y aplana campos críticos a top-level (timestamp, name, quantity,
// asset_id) para consumo O(1) desde hooks de analítica. Mantiene attributes
// anidado para compat con consumers que leen el shape JSON:API.
const normalizeRemoteLog = (remote, fallbackType, included = null) => {
  const quantity = extractQuantityFromIncluded(remote.relationships, included);
  const baseAttrs = remote.attributes || {};
  const resolvedQuantity = quantity || baseAttrs.quantity || null;
  return {
    id: remote.id,
    type: remote.type || fallbackType,
    asset_id: extractAssetId(remote),
    timestamp: baseAttrs.timestamp || 0,
    name: baseAttrs.name || '',
    status: baseAttrs.status || 'done',
    quantity: resolvedQuantity,
    attributes: {
      ...baseAttrs,
      quantity: resolvedQuantity,
    },
    relationships: remote.relationships || {},
    cached_at: Date.now(),
    _pending: false,
  };
};

export const logCache = {
  /**
   * Obtener un log individual por id.
   */
  async getLog(id) {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORES.LOGS, 'readonly');
      const request = tx.objectStore(STORES.LOGS).get(id);
      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => reject(request.error);
    });
  },

  /**
   * Insertar/actualizar un log individual (usado por mutaciones locales con _pending).
   */
  async put(log) {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORES.LOGS, 'readwrite');
      tx.objectStore(STORES.LOGS).put({ ...log, cached_at: Date.now() });
      tx.oncomplete = () => resolve();
      tx.onabort = () => reject(tx.error);
      tx.onerror = () => reject(tx.error);
    });
  },

  /**
   * Obtener logs por asset_id, ordenados por timestamp descendente.
   */
  async getLogsByAsset(assetId) {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORES.LOGS, 'readonly');
      const index = tx.objectStore(STORES.LOGS).index('asset_id');
      const req = index.getAll(IDBKeyRange.only(assetId));
      req.onsuccess = () => {
        const sorted = (req.result || []).sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
        resolve(sorted);
      };
      req.onerror = () => reject(req.error);
    });
  },

  /**
   * Obtener todos los logs del store, sin filtro.
   */
  async getAll() {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORES.LOGS, 'readonly');
      const req = tx.objectStore(STORES.LOGS).getAll();
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => reject(req.error);
    });
  },

  /**
   * Obtener todos los logs de un tipo (p.ej. log--harvest).
   */
  async getByType(type) {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORES.LOGS, 'readonly');
      const index = tx.objectStore(STORES.LOGS).index('type');
      const req = index.getAll(IDBKeyRange.only(type));
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => reject(req.error);
    });
  },

  /**
   * Merge desde el servidor con preservación de logs _pending locales.
   * Aplica la misma regla de oro de assetCache.bulkPut (Fase 10.1) + GC.
   * @param {string} type - p.ej. 'log--harvest'
   * @param {Array} remoteLogs - data[] del JSON:API de FarmOS
   * @param {Array} included - array included[] del JSON:API para resolver quantities
   */
  async bulkPut(type, remoteLogs, included = null) {
    const db = await openDB();
    const tx = db.transaction(STORES.LOGS, 'readwrite');
    const store = tx.objectStore(STORES.LOGS);

    const localLogs = await new Promise((res, rej) => {
      const req = store.index('type').getAll(IDBKeyRange.only(type));
      req.onsuccess = () => res(req.result || []);
      req.onerror = () => rej(req.error);
    });
    const localMap = new Map(localLogs.map((l) => [l.id, l]));

    for (const remote of remoteLogs) {
      const local = localMap.get(remote.id);
      if (local && local._pending) {
        console.warn(`[LogCache] Preservando log _pending ${remote.id}.`);
        continue;
      }
      store.put(normalizeRemoteLog(remote, type, included));
    }

    // GC: purgar logs confirmados de este type que el servidor ya no devuelve.
    const remoteIds = new Set(remoteLogs.map((r) => r.id));
    for (const local of localLogs) {
      if (!remoteIds.has(local.id) && !local._pending) {
        store.delete(local.id);
      }
    }

    return new Promise((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onabort = () => reject(tx.error);
      tx.onerror = () => reject(tx.error);
    });
  },
};
