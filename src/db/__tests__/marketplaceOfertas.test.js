/**
 * marketplaceOfertas.test.js — store offline de ofertas del marketplace.
 *
 * Mock pequeño de IDB con un Map en memoria (mismo patrón que
 * glaciarReportes.test.js — sin fake-indexeddb). Verifica:
 *   - save() persiste y genera id/createdAt si faltan, y fuerza demo:false.
 *   - getAll() devuelve ordenado del más reciente al más antiguo.
 *   - get()/remove()/count() funcionan; persiste fotoDataUrl.
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
  };
  tx.objectStore = () => objectStore;
  return tx;
};

const mockDB = { transaction: vi.fn(() => makeTx()) };

vi.mock('../dbCore', () => ({
  openDB: vi.fn(() => Promise.resolve(mockDB)),
  STORES: { MARKETPLACE_OFERTAS: 'marketplace_ofertas' },
}));

describe('marketplaceOfertas store', () => {
  beforeEach(() => {
    store = new Map();
    vi.clearAllMocks();
  });

  it('save() persiste y genera id/createdAt y moneda COP por defecto', async () => {
    const { marketplaceOfertas } = await import('../marketplaceOfertas');
    const saved = await marketplaceOfertas.save({
      producto: 'Tomate chonto',
      categoria: 'hortaliza',
      cantidad: 50,
      unidad: 'kg',
      precio: 2400,
    });
    expect(saved.id).toMatch(/^oferta-/);
    expect(typeof saved.createdAt).toBe('number');
    expect(saved.moneda).toBe('COP');
    expect(store.size).toBe(1);
  });

  it('save() fuerza demo:false aunque venga demo:true', async () => {
    const { marketplaceOfertas } = await import('../marketplaceOfertas');
    const saved = await marketplaceOfertas.save({ producto: 'X', demo: true });
    expect(saved.demo).toBe(false);
  });

  it('getAll() devuelve ordenado del más reciente al más antiguo', async () => {
    const { marketplaceOfertas } = await import('../marketplaceOfertas');
    await marketplaceOfertas.save({ id: 'a', createdAt: 1000, producto: 'A' });
    await marketplaceOfertas.save({ id: 'b', createdAt: 3000, producto: 'B' });
    await marketplaceOfertas.save({ id: 'c', createdAt: 2000, producto: 'C' });
    const all = await marketplaceOfertas.getAll();
    expect(all.map((o) => o.id)).toEqual(['b', 'c', 'a']);
  });

  it('save() respeta un id explícito (upsert)', async () => {
    const { marketplaceOfertas } = await import('../marketplaceOfertas');
    await marketplaceOfertas.save({ id: 'fijo-1', producto: 'Papa', cantidad: 1 });
    await marketplaceOfertas.save({ id: 'fijo-1', producto: 'Papa', cantidad: 3 });
    expect(store.size).toBe(1);
    const got = await marketplaceOfertas.get('fijo-1');
    expect(got.cantidad).toBe(3);
  });

  it('get() devuelve null si no existe', async () => {
    const { marketplaceOfertas } = await import('../marketplaceOfertas');
    expect(await marketplaceOfertas.get('nope')).toBeNull();
  });

  it('remove() retira la publicación', async () => {
    const { marketplaceOfertas } = await import('../marketplaceOfertas');
    await marketplaceOfertas.save({ id: 'x', producto: 'Mora' });
    expect(store.size).toBe(1);
    await marketplaceOfertas.remove('x');
    expect(store.size).toBe(0);
  });

  it('count() cuenta las ofertas publicadas', async () => {
    const { marketplaceOfertas } = await import('../marketplaceOfertas');
    await marketplaceOfertas.save({ id: '1', producto: 'A' });
    await marketplaceOfertas.save({ id: '2', producto: 'B' });
    expect(await marketplaceOfertas.count()).toBe(2);
  });

  it('persiste fotoDataUrl (offline survival de la foto)', async () => {
    const { marketplaceOfertas } = await import('../marketplaceOfertas');
    const dataUrl = 'data:image/jpeg;base64,/9j/AAA';
    await marketplaceOfertas.save({ id: 'foto-1', producto: 'Miel', fotoDataUrl: dataUrl });
    const got = await marketplaceOfertas.get('foto-1');
    expect(got.fotoDataUrl).toBe(dataUrl);
  });
});
