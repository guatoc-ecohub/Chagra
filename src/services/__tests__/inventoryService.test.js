import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../inventoryEvents.js', () => {
  const mockValidateLogEntry = vi.fn(() => true);
  return {
    validateLogEntry: mockValidateLogEntry,
    EVENT_TYPES: {
      RECEIVED: 'inventory_received',
      CONSUMED: 'inventory_consumed',
      TRANSFORMED: 'inventory_transformed',
      COUNTED: 'inventory_counted',
      ADJUSTED: 'inventory_adjusted',
      TRANSFERRED: 'inventory_transferred',
      LOST: 'inventory_lost',
      PRODUCED: 'inventory_produced',
    },
    ValidationError: class extends Error {
      constructor(field, expected, got) {
        super(`Invalid ${field}: expected ${expected}, got ${JSON.stringify(got)}`);
        this.field = field;
        this.expected = expected;
        this.got = got;
      }
    },
  };
});

class FakeIndexedDB {
  constructor() {
    this.stores = {
      inventory_events: new Map(),
      inventory_stock_snapshot: new Map(),
    };
  }

  reset() {
    this.stores = {
      inventory_events: new Map(),
      inventory_stock_snapshot: new Map(),
    };
  }

  _getStore(storeName) {
    return this.stores[storeName];
  }

  transaction(storeNames, mode) {
    const tx = {
      db: this,
      mode,
      objectStore: (name) => {
        const store = this._getStore(name);
        return {
          get: (key) => {
            const req = {};
            Object.defineProperty(req, 'result', {
              value: store.get(key),
              writable: false,
            });
            let _onsuccess = null;
            let _onerror = null;
            Object.defineProperty(req, 'onsuccess', {
              set: (fn) => {
                _onsuccess = fn;
                if (fn) fn({ target: req });
              },
              get: () => _onsuccess,
            });
            Object.defineProperty(req, 'onerror', {
              set: (fn) => { _onerror = fn; },
              get: () => _onerror,
            });
            return req;
          },
          getAll: () => {
            const req = {};
            Object.defineProperty(req, 'result', {
              value: Array.from(store.values()),
              writable: false,
            });
            let _onsuccess = null;
            let _onerror = null;
            Object.defineProperty(req, 'onsuccess', {
              set: (fn) => {
                _onsuccess = fn;
                if (fn) fn({ target: req });
              },
              get: () => _onsuccess,
            });
            Object.defineProperty(req, 'onerror', {
              set: (fn) => { _onerror = fn; },
              get: () => _onerror,
            });
            return req;
          },
          add: (value) => {
            const req = {};
            const k = value.id || value.item_id;
            try {
              if (store.has(k)) {
                throw new Error('Key already exists');
              }
              store.set(k, value);
              Object.defineProperty(req, 'result', {
                value: k,
                writable: false,
              });
            } catch (err) {
              Object.defineProperty(req, 'error', {
                value: err,
                writable: false,
              });
            }
            let _onsuccess = null;
            let _onerror = null;
            Object.defineProperty(req, 'onsuccess', {
              set: (fn) => {
                _onsuccess = fn;
                if (fn && !req.error) fn({ target: req });
              },
              get: () => _onsuccess,
            });
            Object.defineProperty(req, 'onerror', {
              set: (fn) => {
                _onerror = fn;
                if (fn && req.error) fn({ target: { error: req.error } });
              },
              get: () => _onerror,
            });
            return req;
          },
          put: (value) => {
            const req = {};
            const k = value.id || value.item_id;
            try {
              store.set(k, value);
              Object.defineProperty(req, 'result', {
                value: k,
                writable: false,
              });
            } catch (err) {
              Object.defineProperty(req, 'error', {
                value: err,
                writable: false,
              });
            }
            let _onsuccess = null;
            let _onerror = null;
            Object.defineProperty(req, 'onsuccess', {
              set: (fn) => {
                _onsuccess = fn;
                if (fn && !req.error) fn({ target: req });
              },
              get: () => _onsuccess,
            });
            Object.defineProperty(req, 'onerror', {
              set: (fn) => {
                _onerror = fn;
                if (fn && req.error) fn({ target: { error: req.error } });
              },
              get: () => _onerror,
            });
            return req;
          },
          clear: () => {
            const req = {};
            try {
              store.clear();
            } catch (err) {
              Object.defineProperty(req, 'error', {
                value: err,
                writable: false,
              });
            }
            let _onsuccess = null;
            let _onerror = null;
            Object.defineProperty(req, 'onsuccess', {
              set: (fn) => {
                _onsuccess = fn;
                if (fn && !req.error) fn({ target: req });
              },
              get: () => _onsuccess,
            });
            Object.defineProperty(req, 'onerror', {
              set: (fn) => {
                _onerror = fn;
                if (fn && req.error) fn({ target: { error: req.error } });
              },
              get: () => _onerror,
            });
            return req;
          },
          index: (indexName) => ({
            getAll: (key) => {
              const req = {};
              const filtered = Array.from(store.values()).filter((item) => {
                if (indexName === 'item_id') {
                  return item.payload?.item_id === key;
                }
                return false;
              });
              Object.defineProperty(req, 'result', {
                value: filtered,
                writable: false,
              });
              let _onsuccess = null;
              Object.defineProperty(req, 'onsuccess', {
                set: (fn) => {
                  _onsuccess = fn;
                  if (fn) fn({ target: req });
                },
                get: () => _onsuccess,
              });
              return req;
            },
          }),
        };
      },
      oncomplete: null,
      onerror: null,
    };
    return tx;
  }
}

let fakeDB = new FakeIndexedDB();

vi.mock('../../db/dbCore.js', () => ({
  openDB: vi.fn(() => Promise.resolve(fakeDB)),
  STORES: {
    INVENTORY_EVENTS: 'inventory_events',
    INVENTORY_STOCK: 'inventory_stock_snapshot',
  },
}));

import {
  appendEvent,
  getStock,
  getAllStock,
  getEventsForItem,
  getAllEvents,
  rebuildSnapshot,
} from '../inventoryService.js';
import { openDB } from '../../db/dbCore.js';
import { EVENT_TYPES, validateLogEntry } from '../inventoryEvents.js';

function makeEvent(eventType, payload, opts = {}) {
  return {
    id: opts.id || `01H${Math.random().toString(16).slice(2, 24).toUpperCase()}`,
    event_type: eventType,
    timestamp: opts.timestamp || new Date().toISOString(),
    device_id_lex_hash: opts.device || 'AAAA0000',
    sequence_number: opts.seq ?? 1,
    operator_id_hash: 'a'.repeat(64),
    idempotency_key: opts.idempotency_key || `${eventType}:${payload.item_id || 'x'}:${Date.now()}`,
    payload,
    schema_version: '1',
  };
}

beforeEach(() => {
  fakeDB.reset();
  vi.clearAllMocks();
  vi.mocked(validateLogEntry).mockReturnValue(true);
});

describe('inventoryService — integración IndexedDB', () => {
  describe('appendEvent — write path + snapshot update', () => {
    it('persiste evento y actualiza snapshot', async () => {
      const event = makeEvent(EVENT_TYPES.RECEIVED, {
        item_id: 'compost-A',
        delta: 50,
        unit: 'kg',
        source: 'compra',
      });

      const result = await appendEvent(event);

      expect(result.duplicated).toBe(false);
      expect(result.event).toEqual(event);

      const events = await getAllEvents();
      expect(events).toHaveLength(1);
      expect(events[0]).toEqual(event);

      const stock = await getStock('compost-A');
      expect(stock.quantity).toBe(50);
      expect(stock.unit).toBe('kg');
    });

    it('es idempotente — si el id ya existe, no duplica', async () => {
      const event = makeEvent(EVENT_TYPES.RECEIVED, {
        item_id: 'compost-A',
        delta: 50,
        unit: 'kg',
        source: 'compra',
      });

      await appendEvent(event);
      const result2 = await appendEvent(event);
      expect(result2.duplicated).toBe(true);

      const events = await getAllEvents();
      expect(events).toHaveLength(1);
      expect((await getStock('compost-A')).quantity).toBe(50);
    });

    it('lanza ValidationError si validateLogEntry falla', async () => {
      vi.mocked(validateLogEntry).mockImplementation(() => {
        const error = new Error('Invalid payload');
        error.field = 'payload';
        throw error;
      });

      const event = makeEvent(EVENT_TYPES.RECEIVED, {
        item_id: 'compost-A',
        delta: 50,
        unit: 'kg',
        source: 'compra',
      });

      await expect(appendEvent(event)).rejects.toThrow('Invalid payload');
    });

    it('actualiza snapshot para consumed (resta)', async () => {
      await appendEvent(makeEvent(EVENT_TYPES.RECEIVED, {
        item_id: 'compost-A',
        delta: 50,
        unit: 'kg',
        source: 'compra',
      }));

      await appendEvent(makeEvent(EVENT_TYPES.CONSUMED, {
        item_id: 'compost-A',
        delta: -15,
        unit: 'kg',
      }));

      expect((await getStock('compost-A')).quantity).toBe(35);
    });

    it('actualiza snapshot para counted (reancla)', async () => {
      await appendEvent(makeEvent(EVENT_TYPES.RECEIVED, {
        item_id: 'compost-A',
        delta: 50,
        unit: 'kg',
        source: 'compra',
      }));

      await appendEvent(makeEvent(EVENT_TYPES.COUNTED, {
        item_id: 'compost-A',
        counted_qty: 30,
        unit: 'kg',
      }));

      expect((await getStock('compost-A')).quantity).toBe(30);
    });

    it('actualiza snapshot para transformed', async () => {
      await appendEvent(makeEvent(EVENT_TYPES.RECEIVED, {
        item_id: 'gallinaza',
        delta: 40,
        unit: 'kg',
        source: 'compra',
      }));

      await appendEvent(makeEvent(EVENT_TYPES.TRANSFORMED, {
        inputs: [{ item_id: 'gallinaza', delta_consumido: 40, unit: 'kg' }],
        outputs: [{ item_id: 'bocashi', delta_producido: 80, unit: 'kg' }],
        recipe_id: 'recipe-bocashi-v1',
      }));

      expect((await getStock('gallinaza')).quantity).toBe(0);
      expect((await getStock('bocashi')).quantity).toBe(80);
    });
  });

  describe('getStock — read snapshot O(1)', () => {
    it('retorna stock existente', async () => {
      await appendEvent(makeEvent(EVENT_TYPES.RECEIVED, {
        item_id: 'compost-A',
        delta: 50,
        unit: 'kg',
        source: 'compra',
      }));

      const stock = await getStock('compost-A');
      expect(stock.item_id).toBe('compost-A');
      expect(stock.quantity).toBe(50);
      expect(stock.unit).toBe('kg');
    });

    it('retorna default si item no existe', async () => {
      const stock = await getStock('inexistente');
      expect(stock.quantity).toBe(0);
      expect(stock.unit).toBeNull();
    });

    it('es defensivo si IndexedDB falla', async () => {
      vi.mocked(openDB).mockRejectedValueOnce(new Error('IDB error'));
      const stock = await getStock('compost-A');
      expect(stock.quantity).toBe(0);
    });
  });

  describe('getAllStock — read full snapshot', () => {
    it('retorna snapshot completo vacío', async () => {
      const allStock = await getAllStock();
      expect(allStock).toEqual([]);
    });

    it('retorna snapshot completo con items', async () => {
      await appendEvent(makeEvent(EVENT_TYPES.RECEIVED, {
        item_id: 'item-1',
        delta: 10,
        unit: 'kg',
        source: 'compra',
      }));

      await appendEvent(makeEvent(EVENT_TYPES.RECEIVED, {
        item_id: 'item-2',
        delta: 20,
        unit: 'litro',
        source: 'compra',
      }));

      const allStock = await getAllStock();
      expect(allStock).toHaveLength(2);
    });

    it('es defensivo si IndexedDB falla', async () => {
      vi.mocked(openDB).mockRejectedValueOnce(new Error('IDB error'));
      const allStock = await getAllStock();
      expect(allStock).toEqual([]);
    });
  });

  describe('getEventsForItem — read events filtered', () => {
    it('retorna eventos de un item específico', async () => {
      await appendEvent(makeEvent(EVENT_TYPES.RECEIVED, {
        item_id: 'compost-A',
        delta: 50,
        unit: 'kg',
        source: 'compra',
      }, { timestamp: '2026-04-29T08:00:00-05:00' }));

      await appendEvent(makeEvent(EVENT_TYPES.CONSUMED, {
        item_id: 'compost-A',
        delta: -15,
        unit: 'kg',
      }, { timestamp: '2026-04-29T10:00:00-05:00' }));

      await appendEvent(makeEvent(EVENT_TYPES.RECEIVED, {
        item_id: 'otro-item',
        delta: 100,
        unit: 'kg',
        source: 'compra',
      }));

      const events = await getEventsForItem('compost-A');
      expect(events).toHaveLength(2);
      expect(events.every((e) => e.payload.item_id === 'compost-A')).toBe(true);
    });

    it('retorna [] si item no tiene eventos', async () => {
      const events = await getEventsForItem('inexistente');
      expect(events).toEqual([]);
    });

    it('ordena por timestamp ASC', async () => {
      await appendEvent(makeEvent(EVENT_TYPES.RECEIVED, {
        item_id: 'compost-A',
        delta: 10,
        unit: 'kg',
        source: 'compra',
      }, { timestamp: '2026-04-29T10:00:00-05:00' }));

      await appendEvent(makeEvent(EVENT_TYPES.RECEIVED, {
        item_id: 'compost-A',
        delta: 20,
        unit: 'kg',
        source: 'compra',
      }, { timestamp: '2026-04-29T08:00:00-05:00' }));

      const events = await getEventsForItem('compost-A');
      expect(events[0].payload.delta).toBe(20);
      expect(events[1].payload.delta).toBe(10);
    });

    it('es defensivo si IndexedDB falla', async () => {
      vi.mocked(openDB).mockRejectedValueOnce(new Error('IDB error'));
      const events = await getEventsForItem('compost-A');
      expect(events).toEqual([]);
    });
  });

  describe('getAllEvents — read all events sorted', () => {
    it('retorna todos los eventos ordenados', async () => {
      await appendEvent(makeEvent(EVENT_TYPES.RECEIVED, {
        item_id: 'item-3',
        delta: 30,
        unit: 'kg',
        source: 'compra',
      }, { timestamp: '2026-04-29T10:00:00-05:00' }));

      await appendEvent(makeEvent(EVENT_TYPES.RECEIVED, {
        item_id: 'item-1',
        delta: 10,
        unit: 'kg',
        source: 'compra',
      }, { timestamp: '2026-04-29T08:00:00-05:00' }));

      await appendEvent(makeEvent(EVENT_TYPES.RECEIVED, {
        item_id: 'item-2',
        delta: 20,
        unit: 'kg',
        source: 'compra',
      }, { timestamp: '2026-04-29T09:00:00-05:00' }));

      const events = await getAllEvents();
      expect(events).toHaveLength(3);
      expect(events[0].payload.item_id).toBe('item-1');
      expect(events[1].payload.item_id).toBe('item-2');
      expect(events[2].payload.item_id).toBe('item-3');
    });

    it('retorna [] si no hay eventos', async () => {
      const events = await getAllEvents();
      expect(events).toEqual([]);
    });
  });

  describe('rebuildSnapshot — full rebuild from events', () => {
    it('reconstruye snapshot desde cero', async () => {
      await appendEvent(makeEvent(EVENT_TYPES.RECEIVED, {
        item_id: 'compost-A',
        delta: 50,
        unit: 'kg',
        source: 'compra',
      }));

      await appendEvent(makeEvent(EVENT_TYPES.CONSUMED, {
        item_id: 'compost-A',
        delta: -15,
        unit: 'kg',
      }));

      fakeDB.stores.inventory_stock_snapshot.set('compost-A', {
        item_id: 'compost-A',
        quantity: 999,
        unit: 'kg',
      });

      const result = await rebuildSnapshot();
      expect(result.rebuilt_count).toBe(1);
      expect((await getStock('compost-A')).quantity).toBe(35);
    });

    it('limpia snapshot previo antes de reconstruir', async () => {
      await appendEvent(makeEvent(EVENT_TYPES.RECEIVED, {
        item_id: 'item-1',
        delta: 10,
        unit: 'kg',
        source: 'compra',
      }));

      fakeDB.stores.inventory_stock_snapshot.set('basura', {
        item_id: 'basura',
        quantity: 999,
        unit: 'kg',
      });

      await rebuildSnapshot();

      const allStock = await getAllStock();
      expect(allStock).toHaveLength(1);
      expect(allStock[0].item_id).toBe('item-1');
    });

    it('lanza error si rebuild falla', async () => {
      vi.mocked(openDB).mockRejectedValueOnce(new Error('IDB error'));
      await expect(rebuildSnapshot()).rejects.toThrow('IDB error');
    });
  });

  describe('casos borde', () => {
    it('maneja cantidades negativas en consumed', async () => {
      await appendEvent(makeEvent(EVENT_TYPES.RECEIVED, {
        item_id: 'test',
        delta: 100,
        unit: 'kg',
        source: 'compra',
      }));

      await appendEvent(makeEvent(EVENT_TYPES.CONSUMED, {
        item_id: 'test',
        delta: -50,
        unit: 'kg',
      }));

      expect((await getStock('test')).quantity).toBe(50);
    });

    it('maneja lost como consumo negativo', async () => {
      await appendEvent(makeEvent(EVENT_TYPES.RECEIVED, {
        item_id: 'test',
        delta: 100,
        unit: 'kg',
        source: 'compra',
      }));

      await appendEvent(makeEvent(EVENT_TYPES.LOST, {
        item_id: 'test',
        delta: -20,
        unit: 'kg',
        cause: 'derrame',
      }));

      expect((await getStock('test')).quantity).toBe(80);
    });

    it('maneja adjusted', async () => {
      await appendEvent(makeEvent(EVENT_TYPES.RECEIVED, {
        item_id: 'test',
        delta: 100,
        unit: 'kg',
        source: 'compra',
      }));

      await appendEvent(makeEvent(EVENT_TYPES.ADJUSTED, {
        item_id: 'test',
        delta: -10,
        reason: 'error_registro',
      }));

      expect((await getStock('test')).quantity).toBe(90);
    });

    it('maneja produced', async () => {
      await appendEvent(makeEvent(EVENT_TYPES.PRODUCED, {
        item_id: 'semillas-prop',
        delta: 5,
        unit: 'kg',
      }));

      expect((await getStock('semillas-prop')).quantity).toBe(5);
    });

    it('transferred NO afecta stock total', async () => {
      await appendEvent(makeEvent(EVENT_TYPES.RECEIVED, {
        item_id: 'test',
        delta: 100,
        unit: 'kg',
        source: 'compra',
      }));

      await appendEvent(makeEvent(EVENT_TYPES.TRANSFERRED, {
        item_id: 'test',
        from_location_id: 'loc-1',
        to_location_id: 'loc-2',
        qty: 30,
      }));

      expect((await getStock('test')).quantity).toBe(100);
    });

    it('maneja múltiples eventos del mismo item', async () => {
      await appendEvent(makeEvent(EVENT_TYPES.RECEIVED, {
        item_id: 'test',
        delta: 100,
        unit: 'kg',
        source: 'compra',
      }, { timestamp: '2026-04-29T08:00:00-05:00' }));

      await appendEvent(makeEvent(EVENT_TYPES.CONSUMED, {
        item_id: 'test',
        delta: -20,
        unit: 'kg',
      }, { timestamp: '2026-04-29T09:00:00-05:00' }));

      await appendEvent(makeEvent(EVENT_TYPES.RECEIVED, {
        item_id: 'test',
        delta: 50,
        unit: 'kg',
        source: 'cosecha',
      }, { timestamp: '2026-04-29T10:00:00-05:00' }));

      expect((await getStock('test')).quantity).toBe(130);
    });
  });
});
