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

interface CachedLog {
  id: string;
  type: string;
  asset_id: string | null;
  timestamp: number;
  name: string;
  status: string;
  quantity: unknown;
  attributes: Record<string, unknown>;
  relationships: Record<string, unknown>;
  cached_at: number;
  _pending: boolean;
}

interface JsonApiRelationshipRef {
  id: string;
  type?: string;
}

interface JsonApiRelationship {
  data?: JsonApiRelationshipRef | JsonApiRelationshipRef[] | null;
}

interface JsonApiResource {
  id: string;
  type?: string;
  attributes?: Record<string, unknown>;
  relationships?: Record<string, JsonApiRelationship>;
}

// Extrae asset_id desde la relación JSON:API (soporta to-one y to-many)
const extractAssetId = (log: JsonApiResource): string | null => {
  const rel = log.relationships?.['asset']?.data;
  if (Array.isArray(rel)) return rel[0]?.id ?? null;
  return rel?.id ?? null;
};

// Resuelve la cantidad (quantity--standard) desde el array `included` del JSON:API.
const extractQuantityFromIncluded = (
  relationships: Record<string, JsonApiRelationship> | undefined,
  included: JsonApiResource[] | null
): { value: number; unit: string | null; label: string | null; measure: string | null } | null => {
  if (!relationships?.['quantity']?.data || !included) return null;
  const qData = relationships['quantity'].data;
  const refs: JsonApiRelationshipRef[] = Array.isArray(qData) ? qData : [qData];
  if (refs.length === 0) return null;

  const first = refs[0]!;
  const quantityObj = included.find(
    (inc) => inc.id === first.id && (inc.type === first.type || inc.type?.startsWith('quantity'))
  );
  if (!quantityObj) return null;

  const attrs = quantityObj.attributes || {};
  const rawValue = attrs['value'];
  let value: number;
  if (typeof rawValue === 'object' && rawValue !== null) {
    const obj = rawValue as { decimal?: unknown; value?: unknown };
    value = parseFloat(String(obj.decimal ?? obj.value ?? 0));
  } else {
    value = parseFloat(String(rawValue ?? 0));
  }

  return {
    value: isNaN(value) ? 0 : value,
    unit: (attrs['unit'] as string | undefined) || (attrs['label'] as string | undefined) || null,
    label: (attrs['label'] as string | undefined) || null,
    measure: (attrs['measure'] as string | undefined) || null,
  };
};

// Polimórfica (Fase 15.1): agnóstica al tipo de log.
const normalizeRemoteLog = (
  remote: JsonApiResource,
  fallbackType: string,
  included: JsonApiResource[] | null = null
): CachedLog => {
  const quantity = extractQuantityFromIncluded(remote.relationships, included);
  const baseAttrs = remote.attributes || {};
  const resolvedQuantity = quantity || (baseAttrs['quantity'] as unknown) || null;
  return {
    id: remote.id,
    type: remote.type || fallbackType,
    asset_id: extractAssetId(remote),
    timestamp: (baseAttrs['timestamp'] as number | undefined) || 0,
    name: (baseAttrs['name'] as string | undefined) || '',
    status: (baseAttrs['status'] as string | undefined) || 'done',
    quantity: resolvedQuantity,
    attributes: {
      ...baseAttrs,
      quantity: resolvedQuantity,
    },
    relationships: (remote.relationships as Record<string, unknown>) || {},
    cached_at: Date.now(),
    _pending: false,
  };
};

export const logCache = {
  /**
   * Obtener un log individual por id.
   */
  async getLog(id: string): Promise<CachedLog | null> {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORES.LOGS, 'readonly');
      const request = tx.objectStore(STORES.LOGS).get(id);
      request.onsuccess = () => resolve((request.result as CachedLog | undefined) || null);
      request.onerror = () => reject(request.error);
    });
  },

  /**
   * Insertar/actualizar un log individual (usado por mutaciones locales con _pending).
   */
  async put(log: Partial<CachedLog> & { id: string }): Promise<void> {
    const db = await openDB();
    return new Promise<void>((resolve, reject) => {
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
  async getLogsByAsset(assetId: string): Promise<CachedLog[]> {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORES.LOGS, 'readonly');
      const index = tx.objectStore(STORES.LOGS).index('asset_id');
      const req = index.getAll(IDBKeyRange.only(assetId));
      req.onsuccess = () => {
        const sorted = ((req.result as CachedLog[]) || []).sort(
          (a, b) => (b.timestamp || 0) - (a.timestamp || 0)
        );
        resolve(sorted);
      };
      req.onerror = () => reject(req.error);
    });
  },

  /**
   * Obtener todos los logs del store, sin filtro.
   */
  async getAll(): Promise<CachedLog[]> {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORES.LOGS, 'readonly');
      const req = tx.objectStore(STORES.LOGS).getAll();
      req.onsuccess = () => resolve((req.result as CachedLog[]) || []);
      req.onerror = () => reject(req.error);
    });
  },

  /**
   * Obtener todos los logs de un tipo (p.ej. log--harvest).
   */
  async getByType(type: string): Promise<CachedLog[]> {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORES.LOGS, 'readonly');
      const index = tx.objectStore(STORES.LOGS).index('type');
      const req = index.getAll(IDBKeyRange.only(type));
      req.onsuccess = () => resolve((req.result as CachedLog[]) || []);
      req.onerror = () => reject(req.error);
    });
  },

  /**
   * Merge desde el servidor con preservación de logs _pending locales.
   */
  async bulkPut(
    type: string,
    remoteLogs: unknown[],
    included: unknown[] | null = null
  ): Promise<void> {
    const db = await openDB();
    const tx = db.transaction(STORES.LOGS, 'readwrite');
    const store = tx.objectStore(STORES.LOGS);

    const localLogs: CachedLog[] = await new Promise((res, rej) => {
      const req = store.index('type').getAll(IDBKeyRange.only(type));
      req.onsuccess = () => res((req.result as CachedLog[]) || []);
      req.onerror = () => rej(req.error);
    });
    const localMap = new Map<string, CachedLog>(localLogs.map((l) => [l.id, l]));

    const remoteResources = remoteLogs as JsonApiResource[];
    const includedResources = (included as JsonApiResource[] | null) || null;

    for (const remote of remoteResources) {
      const local = localMap.get(remote.id);
      if (local && local._pending) {
        console.warn(`[LogCache] Preservando log _pending ${remote.id}.`);
        continue;
      }
      store.put(normalizeRemoteLog(remote, type, includedResources));
    }

    // GC: purgar logs confirmados de este type que el servidor ya no devuelve.
    const remoteIds = new Set(remoteResources.map((r) => r.id));
    for (const local of localLogs) {
      if (!remoteIds.has(local.id) && !local._pending) {
        store.delete(local.id);
      }
    }

    return new Promise<void>((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onabort = () => reject(tx.error);
      tx.onerror = () => reject(tx.error);
    });
  },
};

export type { CachedLog };
