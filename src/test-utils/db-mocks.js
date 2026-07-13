/**
 * test-utils/db-mocks.js — Factories para mockear IndexedDB (dbCore) en tests.
 *
 * Evita los 14+ vi.mock duplicados de db/dbCore.js. Provee:
 *  - mockDbCore() → vi.mock factory ligero (stores vacios).
 *  - fakeIndexedDB() → Map-backed IndexedDB completo para tests de colas/telemetria.
 *
 * @module test-utils/db-mocks
 */
import { vi } from 'vitest';

/** @type {Record<string,string>} STORES usados en los tests del repo. */
const DEFAULT_STORES = {
  ASSETS: 'assets',
  LOGS: 'logs',
  AGENT_REQUESTS: 'agent_requests',
  AGENT_TELEMETRY: 'agent_telemetry',
  VOICE_TELEMETRY: 'voice_telemetry',
  MEDIA_CACHE: 'media_cache',
  FINCA_CONTEXT: 'finca_context',
  CONVERSATION_MEMORY: 'conversation_memory',
  CORPUS_INDEX: 'corpus_index',
  GLACIAR_DRAFTS: 'glaciar_drafts',
  GLACIAR_REPORTES: 'glaciar_reportes',
};

/**
 * Devuelve un objeto vi.mock factory para db/dbCore.js con stores vacios.
 * Usar como:
 *   vi.mock('../../db/dbCore.js', mockDbCore())
 *
 * @returns {object} factory para pasar a vi.mock segundo argumento.
 */
export function mockDbCoreFactory() {
  return {
    openDB: vi.fn().mockResolvedValue({}),
    STORES: DEFAULT_STORES,
    DB_NAME: 'chagra_test',
    DB_VERSION: 12,
  };
}

/**
 * Crea un IndexedDB falso completo (Map-backed) para tests de colas,
 * telemetria, outbox, vision queue (pattern usado en 4+ archivos de test).
 *
 * Simula la superficie minima de IDBDatabase: transaction → objectStore →
 * {add, put, get, delete, getAll}. autoIncrement simulado con sequencia.
 *
 * @returns {object} Fake DB con __data expuesto para inspeccion.
 */
export function makeFakeDB() {
  const data = new Map();
  let seq = 0;
  const makeReq = (resultFn) => {
    const req = {};
    queueMicrotask(() => {
      try {
        req.result = resultFn();
        req.onsuccess?.({ target: req });
      } catch (e) {
        req.error = e;
        req.onerror?.({ target: req });
      }
    });
    return req;
  };
  return {
    transaction() {
      return {
        objectStore() {
          return {
            add(record) {
              return makeReq(() => {
                const id = record.id != null ? record.id : ++seq;
                data.set(id, { ...record, id });
                return id;
              });
            },
            put(record) {
              return makeReq(() => {
                data.set(record.id, { ...record });
                return record.id;
              });
            },
            get(id) {
              return makeReq(() => data.get(id) || undefined);
            },
            delete(id) {
              return makeReq(() => {
                data.delete(id);
                return undefined;
              });
            },
            getAll() {
              return makeReq(() => Array.from(data.values()));
            },
          };
        },
      };
    },
    __data: data,
  };
}

/**
 * Crea un IndexedDB falso multi-tabla (Map-backed) para tests que ejercitan
 * transacciones en multiples stores.
 *
 * @returns {object} con { db, tables }.
 */
export function fakeIndexedDB() {
  const tables = new Map();

  function ensureTable(name) {
    if (!tables.has(name)) tables.set(name, []);
    return tables.get(name);
  }

  function createStore(name) {
    const rows = ensureTable(name);
    return {
      _rows: rows,
      add(item) { rows.push(item); },
      put(item) {
        const idx = rows.findIndex((r) => r.id === item.id);
        if (idx >= 0) rows[idx] = item;
        else rows.push(item);
      },
      get(id) {
        const found = rows.find((r) => r.id === id);
        const req = { result: found || null };
        queueMicrotask(() => { if (req.onsuccess) req.onsuccess(); });
        return req;
      },
      getAll(range, limit) {
        let items = [...rows];
        if (limit) items = items.slice(0, limit);
        const req = { result: items };
        queueMicrotask(() => { if (req.onsuccess) req.onsuccess(); });
        return req;
      },
      index(name) {
        this._indexName = name;
        return this;
      },
      openCursor(_range, _dir) {
        const req = { onsuccess: null };
        queueMicrotask(() => { if (req.onsuccess) req.onsuccess({ target: { result: null } }); });
        return req;
      },
      clear() { rows.length = 0; },
    };
  }

  const db = {
    transaction(names, _mode) {
      const stores = (Array.isArray(names) ? names : [names]).map((n) => createStore(n));
      const tx = {
        objectStore: (_name) => stores[0],
        oncomplete: null,
        onerror: null,
      };
      queueMicrotask(() => { if (tx.oncomplete) tx.oncomplete(); });
      return tx;
    },
    close() {},
  };

  return { db, tables };
}
