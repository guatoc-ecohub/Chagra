/**
 * glaciarReportes.test.js — store offline de reportes de punto glaciar.
 *
 * Mock pequeño de IDB con un Map en memoria (mismo patrón que
 * assetCache.tenant.test.js — sin fake-indexeddb). Verifica:
 *   - save() persiste y genera id/createdAt/fechaISO si faltan.
 *   - getAll() devuelve ordenado del más reciente al más antiguo.
 *   - get()/remove()/count() funcionan.
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
  STORES: { GLACIAR_REPORTES: 'glaciar_reportes' },
}));

describe('glaciarReportes store', () => {
  beforeEach(() => {
    store = new Map();
    vi.clearAllMocks();
  });

  it('save() persiste y genera id/createdAt/fechaISO si faltan', async () => {
    const { glaciarReportes } = await import('../glaciarReportes');
    const saved = await glaciarReportes.save({
      guia: 'Pedro',
      lat: 4.8,
      lng: -75.3,
      tipoSuperficie: 'hielo_glaciar',
      dureza: 4,
      estado: 'estable',
    });
    expect(saved.id).toMatch(/^glaciar-/);
    expect(typeof saved.createdAt).toBe('number');
    expect(typeof saved.fechaISO).toBe('string');
    expect(store.size).toBe(1);
  });

  it('save() respeta un id explícito (upsert)', async () => {
    const { glaciarReportes } = await import('../glaciarReportes');
    await glaciarReportes.save({ id: 'fijo-1', dureza: 2, estado: 'precaucion' });
    await glaciarReportes.save({ id: 'fijo-1', dureza: 5, estado: 'estable' });
    expect(store.size).toBe(1);
    const got = await glaciarReportes.get('fijo-1');
    expect(got.dureza).toBe(5);
  });

  it('getAll() devuelve ordenado del más reciente al más antiguo', async () => {
    const { glaciarReportes } = await import('../glaciarReportes');
    await glaciarReportes.save({ id: 'a', createdAt: 1000, estado: 'estable' });
    await glaciarReportes.save({ id: 'b', createdAt: 3000, estado: 'peligro' });
    await glaciarReportes.save({ id: 'c', createdAt: 2000, estado: 'precaucion' });
    const all = await glaciarReportes.getAll();
    expect(all.map((r) => r.id)).toEqual(['b', 'c', 'a']);
  });

  it('get() devuelve null si no existe', async () => {
    const { glaciarReportes } = await import('../glaciarReportes');
    expect(await glaciarReportes.get('nope')).toBeNull();
  });

  it('remove() elimina el reporte', async () => {
    const { glaciarReportes } = await import('../glaciarReportes');
    await glaciarReportes.save({ id: 'x', estado: 'estable' });
    expect(store.size).toBe(1);
    await glaciarReportes.remove('x');
    expect(store.size).toBe(0);
  });

  it('count() cuenta los reportes', async () => {
    const { glaciarReportes } = await import('../glaciarReportes');
    await glaciarReportes.save({ id: '1', estado: 'estable' });
    await glaciarReportes.save({ id: '2', estado: 'peligro' });
    expect(await glaciarReportes.count()).toBe(2);
  });

  it('persiste fotoDataUrl (offline survival de la foto)', async () => {
    const { glaciarReportes } = await import('../glaciarReportes');
    const dataUrl = 'data:image/jpeg;base64,/9j/AAA';
    await glaciarReportes.save({ id: 'foto-1', fotoDataUrl: dataUrl, estado: 'estable' });
    const got = await glaciarReportes.get('foto-1');
    expect(got.fotoDataUrl).toBe(dataUrl);
  });
});
