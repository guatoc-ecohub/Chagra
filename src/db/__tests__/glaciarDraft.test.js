/**
 * glaciarDraft.test.js — autosave del borrador del reporte glaciar (IndexedDB).
 *
 * Mock de IDB con un Map en memoria (mismo patrón que corpusIndexCache.test.js
 * / glaciarReportes.test.js, sin fake-indexeddb). El borrador antes vivía en
 * sessionStorage (CodeQL js/clear-text-storage-of-sensitive-data por el GPS);
 * ahora vive en el store glaciar_draft. Verifica:
 *   - roundtrip saveDraft→loadDraft preservando form + coords.
 *   - loadDraft devuelve null si no hay borrador.
 *   - clearDraft borra el registro.
 *   - save/load/clear nunca lanzan ante fallo de IDB (best-effort).
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';

// Store en memoria compartido por el mock de openDB.
let memStore;
let failMode;

vi.mock('../dbCore', () => {
  const STORES = { GLACIAR_DRAFT: 'glaciar_draft' };
  const makeTx = () => {
    const tx = { oncomplete: null, onerror: null, onabort: null };
    const objectStore = {
      put(record) {
        if (failMode === 'put') {
          Promise.resolve().then(() => tx.onerror?.());
          return;
        }
        memStore.set(record.key, record);
        Promise.resolve().then(() => tx.oncomplete?.());
      },
      get(key) {
        const req = { onsuccess: null, onerror: null, result: undefined };
        Promise.resolve().then(() => {
          if (failMode === 'get') {
            req.onerror?.();
            return;
          }
          req.result = memStore.get(key);
          req.onsuccess?.();
        });
        return req;
      },
      delete(key) {
        memStore.delete(key);
        Promise.resolve().then(() => tx.oncomplete?.());
      },
    };
    tx.objectStore = () => objectStore;
    return tx;
  };
  return {
    STORES,
    openDB: vi.fn(async () => {
      if (failMode === 'open') throw new Error('IDB no disponible');
      return { transaction: () => makeTx() };
    }),
  };
});

import { saveDraft, loadDraft, clearDraft } from '../glaciarDraft';

const sampleForm = () => ({
  montana: 'ruiz',
  puntoId: 'RITACUBA-FRENTE-01',
  tipoSuperficie: 'hielo_glaciar_azul',
  dureza: 'H1',
  peligros: ['seracs'],
});
const sampleCoords = () => ({ lat: 4.81, lng: -75.33, altitud: 4850, precision: 8 });

describe('glaciarDraft store', () => {
  beforeEach(() => {
    memStore = new Map();
    failMode = null;
  });

  it('roundtrip saveDraft→loadDraft preserva form y coords (incluido GPS)', async () => {
    const ok = await saveDraft(sampleForm(), sampleCoords());
    expect(ok).toBe(true);

    const draft = await loadDraft();
    expect(draft).not.toBeNull();
    expect(draft.form.montana).toBe('ruiz');
    expect(draft.form.tipoSuperficie).toBe('hielo_glaciar_azul');
    expect(draft.form.dureza).toBe('H1');
    expect(draft.coords.lat).toBeCloseTo(4.81);
    expect(draft.coords.lng).toBeCloseTo(-75.33);
  });

  it('persiste un solo borrador (la segunda escritura reemplaza a la primera)', async () => {
    await saveDraft({ montana: 'ruiz' }, null);
    await saveDraft({ montana: 'tolima' }, sampleCoords());
    expect(memStore.size).toBe(1);
    const draft = await loadDraft();
    expect(draft.form.montana).toBe('tolima');
    expect(draft.coords.lat).toBeCloseTo(4.81);
  });

  it('guarda coords como null cuando aún no hay GPS', async () => {
    await saveDraft({ montana: 'ruiz' }, null);
    const draft = await loadDraft();
    expect(draft.coords).toBeNull();
  });

  it('loadDraft devuelve null si no hay borrador persistido', async () => {
    expect(await loadDraft()).toBeNull();
  });

  it('clearDraft borra el borrador (al guardar el reporte con éxito)', async () => {
    await saveDraft(sampleForm(), sampleCoords());
    expect(memStore.size).toBe(1);
    await clearDraft();
    expect(memStore.size).toBe(0);
    expect(await loadDraft()).toBeNull();
  });

  it('saveDraft no lanza y devuelve false si IDB falla al abrir', async () => {
    failMode = 'open';
    await expect(saveDraft(sampleForm(), sampleCoords())).resolves.toBe(false);
  });

  it('loadDraft no lanza y devuelve null si IDB falla al abrir', async () => {
    failMode = 'open';
    await expect(loadDraft()).resolves.toBeNull();
  });

  it('clearDraft no lanza si IDB falla al abrir', async () => {
    failMode = 'open';
    await expect(clearDraft()).resolves.toBeUndefined();
  });
});
