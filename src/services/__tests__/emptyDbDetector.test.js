import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock de dbCore. El test maneja distintos escenarios cambiando lo que
// devuelve openDB en cada caso.
const makeFakeDB = (storeCounts) => {
  const storeNames = Object.keys(storeCounts);
  return {
    name: 'ChagraDB',
    version: 14,
    objectStoreNames: {
      contains: (n) => storeNames.includes(n),
      length: storeNames.length,
    },
    transaction(_storeName) {
      return {
        objectStore(name) {
          return {
            count() {
              const req = {};
              setTimeout(() => {
                req.result = storeCounts[name] || 0;
                req.onsuccess?.({ target: req });
              }, 0);
              return req;
            },
          };
        },
      };
    },
  };
};

vi.mock('../../db/dbCore', () => ({
  openDB: vi.fn(),
  STORES: { ASSETS: 'assets', LOGS: 'logs', MEDIA_CACHE: 'media_cache' },
}));

import { openDB } from '../../db/dbCore';
import {
  markHadData,
  clearHadDataFlag,
  isCurrentlyEmpty,
  shouldWarnDataLoss,
  HAD_DATA_KEY,
  LAST_COUNT_KEY,
  LAST_MARKED_AT_KEY,
} from '../emptyDbDetector';

beforeEach(() => {
  vi.clearAllMocks();
  window.localStorage.clear();
});

describe('emptyDbDetector.markHadData', () => {
  it('setea flag had-data + last-asset-count + last-marked-at', () => {
    markHadData(42);
    expect(window.localStorage.getItem(HAD_DATA_KEY)).toBe('1');
    expect(window.localStorage.getItem(LAST_COUNT_KEY)).toBe('42');
    expect(window.localStorage.getItem(LAST_MARKED_AT_KEY)).toBeTruthy();
    // El timestamp debe ser ISO parseable.
    const ts = window.localStorage.getItem(LAST_MARKED_AT_KEY);
    expect(new Date(ts).toString()).not.toBe('Invalid Date');
  });

  it('no rompe si no se le pasa count (mantiene last-count previo)', () => {
    window.localStorage.setItem(LAST_COUNT_KEY, '10');
    markHadData();
    expect(window.localStorage.getItem(HAD_DATA_KEY)).toBe('1');
    expect(window.localStorage.getItem(LAST_COUNT_KEY)).toBe('10');
  });

  it('ignora counts no-finitos (NaN, Infinity)', () => {
    markHadData(NaN);
    expect(window.localStorage.getItem(LAST_COUNT_KEY)).toBeNull();
    markHadData(Infinity);
    expect(window.localStorage.getItem(LAST_COUNT_KEY)).toBeNull();
  });
});

describe('emptyDbDetector.clearHadDataFlag', () => {
  it('limpia todas las claves had-data', () => {
    markHadData(5);
    clearHadDataFlag();
    expect(window.localStorage.getItem(HAD_DATA_KEY)).toBeNull();
    expect(window.localStorage.getItem(LAST_COUNT_KEY)).toBeNull();
    expect(window.localStorage.getItem(LAST_MARKED_AT_KEY)).toBeNull();
  });
});

describe('emptyDbDetector.isCurrentlyEmpty', () => {
  it('true cuando assets + logs + media_cache están todos en cero', async () => {
    vi.mocked(openDB).mockResolvedValue(makeFakeDB({ assets: 0, logs: 0, media_cache: 0 }));
    expect(await isCurrentlyEmpty()).toBe(true);
  });

  it('false cuando hay aunque sea un asset', async () => {
    vi.mocked(openDB).mockResolvedValue(makeFakeDB({ assets: 1, logs: 0, media_cache: 0 }));
    expect(await isCurrentlyEmpty()).toBe(false);
  });

  it('false cuando hay un log aunque no haya assets', async () => {
    vi.mocked(openDB).mockResolvedValue(makeFakeDB({ assets: 0, logs: 1, media_cache: 0 }));
    expect(await isCurrentlyEmpty()).toBe(false);
  });

  it('false cuando hay solo una foto suelta', async () => {
    vi.mocked(openDB).mockResolvedValue(makeFakeDB({ assets: 0, logs: 0, media_cache: 1 }));
    expect(await isCurrentlyEmpty()).toBe(false);
  });

  it('false (NO alerta) si openDB lanza error — conservador para no romper UI', async () => {
    vi.mocked(openDB).mockRejectedValue(new Error('DB bloqueada'));
    expect(await isCurrentlyEmpty()).toBe(false);
  });

  it('ignora stores ausentes (PWA nueva sin schema completo)', async () => {
    vi.mocked(openDB).mockResolvedValue(makeFakeDB({})); // ningún store
    expect(await isCurrentlyEmpty()).toBe(true);
  });
});

describe('emptyDbDetector.shouldWarnDataLoss', () => {
  it('NEVER HAD DATA: no advierte aunque IDB esté vacío', async () => {
    vi.mocked(openDB).mockResolvedValue(makeFakeDB({ assets: 0, logs: 0, media_cache: 0 }));
    // No llamamos markHadData → no hay flag.

    const result = await shouldWarnDataLoss();

    expect(result.shouldWarn).toBe(false);
    expect(result.lastKnownCount).toBe(0);
    expect(result.lastMarkedAt).toBeNull();
  });

  it('HAD DATA + NOW EMPTY: ADVIERTE — caso post-clear-cache', async () => {
    vi.mocked(openDB).mockResolvedValue(makeFakeDB({ assets: 0, logs: 0, media_cache: 0 }));
    markHadData(100);

    const result = await shouldWarnDataLoss();

    expect(result.shouldWarn).toBe(true);
    expect(result.lastKnownCount).toBe(100);
    expect(result.lastMarkedAt).toBeTruthy();
  });

  it('HAS DATA: no advierte aunque el flag had-data esté seteado', async () => {
    vi.mocked(openDB).mockResolvedValue(makeFakeDB({ assets: 50, logs: 0, media_cache: 0 }));
    markHadData(50);

    const result = await shouldWarnDataLoss();

    expect(result.shouldWarn).toBe(false);
    expect(result.lastKnownCount).toBe(50);
  });

  it('clearHadDataFlag desactiva la advertencia aunque IDB siga vacío', async () => {
    vi.mocked(openDB).mockResolvedValue(makeFakeDB({ assets: 0, logs: 0, media_cache: 0 }));
    markHadData(7);
    expect((await shouldWarnDataLoss()).shouldWarn).toBe(true);
    clearHadDataFlag();
    expect((await shouldWarnDataLoss()).shouldWarn).toBe(false);
  });
});
