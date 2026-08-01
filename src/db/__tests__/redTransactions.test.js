/**
 * redTransactions.test.js — store offline de los TRATOS de la red humana.
 *
 * Mock pequeño de IDB con un Map en memoria (mismo patrón que
 * marketplaceOfertas.test.js). Verifica save/getAll/get/remove/count +
 * byProductor (con y sin índice disponible).
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';

let store; // Map en memoria keyed by id

const makeTx = () => {
  const tx = { oncomplete: null, onerror: null, onabort: null };
  const objectStore = {
    put(record) {
      store.set(record.id, record);
      Promise.resolve().then(() => tx.oncomplete?.());
    },
    delete(id) {
      store.delete(id);
      Promise.resolve().then(() => tx.oncomplete?.());
    },
    get(id) {
      const req = { onsuccess: null, onerror: null };
      Promise.resolve().then(() => {
        req.result = store.get(id) || undefined;
        req.onsuccess?.();
      });
      return req;
    },
    getAll() {
      const req = { onsuccess: null, onerror: null };
      Promise.resolve().then(() => {
        req.result = [...store.values()];
        req.onsuccess?.();
      });
      return req;
    },
    count() {
      const req = { onsuccess: null, onerror: null };
      Promise.resolve().then(() => {
        req.result = store.size;
        req.onsuccess?.();
      });
      return req;
    },
    index() {
      // Simula ausencia de índice → el servicio degrada a filtrar getAll.
      return {
        getAll() {
          const req = { onsuccess: null, onerror: null };
          Promise.resolve().then(() => {
            req.result = [...store.values()];
            req.onsuccess?.();
          });
          return req;
        },
      };
    },
  };
  tx.objectStore = () => objectStore;
  return tx;
};

const mockDB = { transaction: vi.fn(() => makeTx()) };

vi.mock('../dbCore', () => ({
  openDB: vi.fn(() => Promise.resolve(mockDB)),
  STORES: { RED_TRANSACTIONS: 'red_transactions' },
}));

describe('redTransactions store', () => {
  beforeEach(() => {
    store = new Map();
    vi.clearAllMocks();
  });

  it('save() persiste y genera id/createdAt si faltan', async () => {
    const { redTransactions } = await import('../redTransactions');
    const saved = await redTransactions.save({
      productorHash: 'p1', producto: 'Tomate', entrega: 'entregado', shareLevel: 2,
    });
    expect(saved.id).toMatch(/^trato-/);
    expect(typeof saved.createdAt).toBe('number');
    expect(store.size).toBe(1);
  });

  it('save() respeta id explícito (upsert)', async () => {
    const { redTransactions } = await import('../redTransactions');
    await redTransactions.save({ id: 'fijo', producto: 'Papa', cantidad: 1 });
    await redTransactions.save({ id: 'fijo', producto: 'Papa', cantidad: 5 });
    expect(store.size).toBe(1);
    expect((await redTransactions.get('fijo')).cantidad).toBe(5);
  });

  it('getAll() ordena del más reciente al más antiguo', async () => {
    const { redTransactions } = await import('../redTransactions');
    await redTransactions.save({ id: 'a', createdAt: 1000 });
    await redTransactions.save({ id: 'b', createdAt: 3000 });
    await redTransactions.save({ id: 'c', createdAt: 2000 });
    const all = await redTransactions.getAll();
    expect(all.map((t) => t.id)).toEqual(['b', 'c', 'a']);
  });

  it('byProductor() filtra por hash (degrada a getAll sin índice real)', async () => {
    const { redTransactions } = await import('../redTransactions');
    await redTransactions.save({ id: '1', productorHash: 'p1' });
    await redTransactions.save({ id: '2', productorHash: 'p2' });
    await redTransactions.save({ id: '3', productorHash: 'p1' });
    const p1 = await redTransactions.byProductor('p1');
    expect(p1.map((t) => t.id).sort()).toEqual(['1', '3']);
  });

  it('byProductor() sin hash devuelve vacío', async () => {
    const { redTransactions } = await import('../redTransactions');
    expect(await redTransactions.byProductor('')).toEqual([]);
  });

  it('get() null si no existe; remove() y count()', async () => {
    const { redTransactions } = await import('../redTransactions');
    expect(await redTransactions.get('nope')).toBeNull();
    await redTransactions.save({ id: 'x', producto: 'Mora' });
    expect(await redTransactions.count()).toBe(1);
    await redTransactions.remove('x');
    expect(await redTransactions.count()).toBe(0);
  });
});
