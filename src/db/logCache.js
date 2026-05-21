/**
 * Capa de persistencia IndexedDB para logs FarmOS (Fase 11 - Offline-First).
 *
 * Store: 'logs' (ChagraDB v9)
 * Índices: asset_id, timestamp, type, asset_id_timestamp (compuesto v9)
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
import { getActiveTenantId } from '../services/tenantContext';

// Extrae asset_id desde la relación JSON:API (soporta to-one y to-many)
const extractAssetId = (log) => {
  const rel = log.relationships?.asset?.data;
  if (Array.isArray(rel)) return rel[0]?.id || null;
  return rel?.id || null;
};

// ADR-036 MVP multi-finca: filtra una lista de logs ya leídos de IDB para
// dejar pasar solo los del tenant activo (o los legacy sin _tenant_id, que
// se consideran heredados pre-multifinca, mismo criterio que assetCache).
// Read-path O(n) por query — barato porque los logs ya pasan por el filtro
// server-side de `filter[uid.name]` en apiService; el filtrado en IDB es
// defense-in-depth para el caso de re-login en device compartido.
const filterLogsByActiveTenant = (logs) => {
  const tenantId = getActiveTenantId();
  if (!tenantId) return logs; // sin login: comportamiento single-tenant.
  return logs.filter((l) => !l._tenant_id || l._tenant_id === tenantId);
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
    // ADR-036 MVP: logs descargados pertenecen al tenant activo en el
    // momento del pull. Si no hay tenant activo (dev sin login), queda
    // null y se trata como legacy pre-multifinca.
    _tenant_id: getActiveTenantId() || null,
    cached_at: Date.now(),
    _pending: false,
  };
};

export const logCache = {
  /**
   * Obtener un log individual por id.
   * ADR-036 MVP: si el log pertenece a OTRO tenant, devolvemos null (oculto).
   * Legacy (sin `_tenant_id`) sigue visible para el tenant activo — mismo
   * criterio que assetCache.
   */
  async getLog(id) {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORES.LOGS, 'readonly');
      const request = tx.objectStore(STORES.LOGS).get(id);
      request.onsuccess = () => {
        const log = request.result || null;
        if (!log) return resolve(null);
        const tenantId = getActiveTenantId();
        if (tenantId && log._tenant_id && log._tenant_id !== tenantId) {
          return resolve(null);
        }
        resolve(log);
      };
      request.onerror = () => reject(request.error);
    });
  },

  /**
   * Insertar/actualizar un log individual (usado por mutaciones locales con _pending).
   * ADR-036 MVP: stamp `_tenant_id` con el tenant activo, salvo que el log ya
   * traiga uno (preserva la propiedad cuando se vuelve a normalizar desde el
   * pull remoto o cuando otro flujo lo marca explícitamente).
   */
  async put(log) {
    const db = await openDB();
    const tenantId = log._tenant_id || getActiveTenantId() || null;
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORES.LOGS, 'readwrite');
      tx.objectStore(STORES.LOGS).put({ ...log, _tenant_id: tenantId, cached_at: Date.now() });
      tx.oncomplete = () => resolve();
      tx.onabort = () => reject(tx.error);
      tx.onerror = () => reject(tx.error);
    });
  },

  /**
   * Obtener logs por asset_id, ordenados por timestamp descendente.
   * Usa índice compuesto asset_id_timestamp (v9) para evitar sort en memoria.
   * Fallback a índice asset_id + sort JS si el compuesto no existe
   * (e.g. durante migración parcial).
   *
   * ADR-036 MVP: filtra por tenant activo post-query (read-path scoping).
   */
  async getLogsByAsset(assetId) {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORES.LOGS, 'readonly');
      const store = tx.objectStore(STORES.LOGS);
      if (store.indexNames.contains('asset_id_timestamp')) {
        const index = store.index('asset_id_timestamp');
        const range = IDBKeyRange.bound([assetId, 0], [assetId, Infinity]);
        const req = index.getAll(range);
        req.onsuccess = () => {
          const results = req.result || [];
          resolve(filterLogsByActiveTenant(results.reverse()));
        };
        req.onerror = () => reject(req.error);
      } else {
        const index = store.index('asset_id');
        const req = index.getAll(IDBKeyRange.only(assetId));
        req.onsuccess = () => {
          const sorted = (req.result || []).sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
          resolve(filterLogsByActiveTenant(sorted));
        };
        req.onerror = () => reject(req.error);
      }
    });
  },

  /**
   * Obtener todos los logs del store. ADR-036: scope al tenant activo.
   */
  async getAll() {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORES.LOGS, 'readonly');
      const req = tx.objectStore(STORES.LOGS).getAll();
      req.onsuccess = () => resolve(filterLogsByActiveTenant(req.result || []));
      req.onerror = () => reject(req.error);
    });
  },

  /**
   * Obtener todos los logs de un tipo (p.ej. log--harvest). ADR-036: scope.
   */
  async getByType(type) {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORES.LOGS, 'readonly');
      const index = tx.objectStore(STORES.LOGS).index('type');
      const req = index.getAll(IDBKeyRange.only(type));
      req.onsuccess = () => resolve(filterLogsByActiveTenant(req.result || []));
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
    // ADR-036 MVP multi-finca: el GC opera solo dentro del tenant activo —
    // si user A sincroniza, NO debe purgar logs de user B en el mismo device.
    // Logs legacy (sin _tenant_id) se barren con el activo, mismo criterio
    // que filterLogsByActiveTenant. El universo `remoteLogs` está scoped por
    // server-side filter[uid.name] (apiService) así que solo cubre al activo.
    const remoteIds = new Set(remoteLogs.map((r) => r.id));
    const activeTenant = getActiveTenantId();
    for (const local of localLogs) {
      const belongsToActive = !local._tenant_id || !activeTenant || local._tenant_id === activeTenant;
      if (!belongsToActive) continue;
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

  /**
   * Obtener logs sincronizados de las últimas 24h, ordenados por timestamp desc.
   * Para WorkerHistory "Recientes" (bitácora Parte C).
   * ADR-036 MVP: scope al tenant activo en read-path.
   */
  async getRecent24h() {
    const db = await openDB();
    const cutoff = Date.now() - 24 * 60 * 60 * 1000;
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORES.LOGS, 'readonly');
      const req = tx.objectStore(STORES.LOGS).getAll();
      req.onsuccess = () => {
        const recent = filterLogsByActiveTenant(req.result || [])
          .filter((log) => !log._pending && log.timestamp && log.timestamp * 1000 >= cutoff)
          .sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
        resolve(recent);
      };
      req.onerror = () => reject(req.error);
    });
  },
};
