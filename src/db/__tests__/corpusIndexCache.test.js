/**
 * corpusIndexCache.test.js — persistencia del índice RAG (offline-first).
 *
 * Verifica el contrato de saveCorpusIndex / loadCorpusIndex sin tocar
 * IndexedDB real: mockeamos openDB con un store en memoria (Map) que replica
 * el subset de la API IDB que el módulo usa (transaction → objectStore →
 * put/get + tx.oncomplete/onerror). Sigue el patrón de assetCache.tenant.test.
 *
 * Cubre:
 *   - roundtrip save→load preservando el Map de idf (structured clone).
 *   - invalidación por manifestStamp (deploy del corpus).
 *   - invalidación por tier (OSS↔Pro, catálogo distinto).
 *   - degradación: load sin registro o con docs vacíos → null.
 *   - save/load nunca lanzan ante fallo de IDB.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';

// Store en memoria compartido por el mock de openDB.
let memStore;
let failMode;

vi.mock('../dbCore', () => {
  const STORES = { RAG_CORPUS_CACHE: 'rag_corpus_cache' };
  const makeTx = () => {
    const tx = { oncomplete: null, onerror: null, onabort: null };
    const objectStore = () => ({
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
    });
    return { tx, objectStore };
  };
  return {
    STORES,
    openDB: vi.fn(async () => {
      if (failMode === 'open') throw new Error('IDB no disponible');
      return {
        // El objeto transaction DEBE ser el MISMO que el mock usa para disparar
        // oncomplete/onerror: producción setea `tx.oncomplete = ...` sobre el
        // objeto retornado, así que ese objeto y el que el mock dispara tienen
        // que ser idénticos (un spread {...tx} crearía una COPIA → producción
        // setea el callback en la copia, el mock lo dispara en el original →
        // la promesa nunca resuelve y el test cuelga 30s).
        transaction: () => {
          const { tx, objectStore } = makeTx();
          tx.objectStore = () => objectStore();
          return tx;
        },
      };
    }),
  };
});

import { saveCorpusIndex, loadCorpusIndex, clearCorpusIndex } from '../corpusIndexCache';

const sampleIndex = () => ({
  docs: [
    {
      species: 'fragaria_x_ananassa',
      key: 'valor_pedagogico',
      text: 'fresa rosácea perenne',
      tokenized: ['fresa', 'rosacea', 'perenne'],
      termCounts: new Map([['fresa', 1], ['rosacea', 1], ['perenne', 1]]),
      docLen: 3,
    },
  ],
  idf: new Map([['fresa', 1.2], ['rosacea', 0.8]]),
  avgDocLen: 3,
});

describe('corpusIndexCache', () => {
  beforeEach(() => {
    memStore = new Map();
    failMode = null;
  });

  it('roundtrip save→load preserva docs e idf como Map', async () => {
    const idx = sampleIndex();
    const ok = await saveCorpusIndex({ ...idx, manifestStamp: 'm1', tier: 263 });
    expect(ok).toBe(true);

    const loaded = await loadCorpusIndex({ manifestStamp: 'm1', tier: 263 });
    expect(loaded).not.toBeNull();
    expect(loaded.docs).toHaveLength(1);
    expect(loaded.avgDocLen).toBe(3);
    expect(loaded.idf instanceof Map).toBe(true);
    expect(loaded.idf.get('fresa')).toBe(1.2);
    expect(loaded.docs[0].termCounts instanceof Map).toBe(true);
    expect(loaded.docs[0].termCounts.get('fresa')).toBe(1);
  });

  it('invalida si el manifestStamp esperado difiere (deploy del corpus)', async () => {
    await saveCorpusIndex({ ...sampleIndex(), manifestStamp: 'm1', tier: 263 });
    const loaded = await loadCorpusIndex({ manifestStamp: 'm2', tier: 263 });
    expect(loaded).toBeNull();
  });

  it('invalida si el tier esperado difiere (OSS↔Pro)', async () => {
    await saveCorpusIndex({ ...sampleIndex(), manifestStamp: 'm1', tier: 263 });
    const loaded = await loadCorpusIndex({ manifestStamp: 'm1', tier: 491 });
    expect(loaded).toBeNull();
  });

  it('devuelve null si no hay índice persistido', async () => {
    const loaded = await loadCorpusIndex({ manifestStamp: 'm1', tier: 263 });
    expect(loaded).toBeNull();
  });

  it('devuelve null si los docs persistidos están vacíos', async () => {
    await saveCorpusIndex({ docs: [], idf: new Map(), avgDocLen: 1, manifestStamp: 'm1', tier: 263 });
    const loaded = await loadCorpusIndex({ manifestStamp: 'm1', tier: 263 });
    expect(loaded).toBeNull();
  });

  it('hidrata sin validar cuando el caller no pasa manifestStamp/tier', async () => {
    await saveCorpusIndex({ ...sampleIndex(), manifestStamp: 'm1', tier: 263 });
    const loaded = await loadCorpusIndex();
    expect(loaded).not.toBeNull();
    expect(loaded.docs).toHaveLength(1);
  });

  it('saveCorpusIndex no lanza y devuelve false si IDB falla al abrir', async () => {
    failMode = 'open';
    await expect(saveCorpusIndex({ ...sampleIndex(), manifestStamp: 'm1', tier: 263 })).resolves.toBe(false);
  });

  it('loadCorpusIndex no lanza y devuelve null si IDB falla al abrir', async () => {
    failMode = 'open';
    await expect(loadCorpusIndex({ manifestStamp: 'm1', tier: 263 })).resolves.toBeNull();
  });

  it('clearCorpusIndex borra el registro y no lanza', async () => {
    await saveCorpusIndex({ ...sampleIndex(), manifestStamp: 'm1', tier: 263 });
    await clearCorpusIndex();
    const loaded = await loadCorpusIndex({ manifestStamp: 'm1', tier: 263 });
    expect(loaded).toBeNull();
  });
});
