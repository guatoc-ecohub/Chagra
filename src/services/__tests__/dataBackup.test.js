import { describe, it, expect, vi, beforeEach } from 'vitest';

// ─── Mocks ────────────────────────────────────────────────────────────────
// dbCore.openDB se mockea para devolver un IDBDatabase fake que expone los
// dos métodos que dataBackup usa: `objectStoreNames` (DOMStringList-like)
// y `transaction(storeName).objectStore(storeName).getAll()`.

const makeFakeDB = (data, { name = 'ChagraDB', version = 14 } = {}) => {
  const storeNames = Object.keys(data);
  return {
    name,
    version,
    objectStoreNames: {
      contains: (n) => storeNames.includes(n),
      length: storeNames.length,
      [Symbol.iterator]: function* () {
        for (const n of storeNames) yield n;
      },
    },
    transaction(_storeName) {
      return {
        objectStore(name) {
          return {
            getAll() {
              const req = {};
              setTimeout(() => {
                req.result = data[name] || [];
                req.onsuccess?.({ target: req });
              }, 0);
              return req;
            },
            count() {
              const req = {};
              setTimeout(() => {
                req.result = (data[name] || []).length;
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
  STORES: {
    ASSETS: 'assets',
    LOGS: 'logs',
    MEDIA_CACHE: 'media_cache',
    PENDING_TX: 'pending_transactions',
  },
}));

import { openDB } from '../../db/dbCore';
import { exportAllData, downloadBackupJSON, getBackupSummary, BACKUP_VERSION } from '../dataBackup';

beforeEach(() => {
  vi.clearAllMocks();
  // Limpiamos localStorage entre tests.
  window.localStorage.clear();
});

describe('dataBackup.exportAllData', () => {
  it('devuelve estructura con version, exportedAt, idb y localStorage', async () => {
    vi.mocked(openDB).mockResolvedValue(
      makeFakeDB({
        assets: [{ id: 'a1', asset_type: 'plant', attributes: { name: 'Tomate' } }],
        logs: [{ id: 'l1', type: 'log--seeding' }],
      })
    );
    window.localStorage.setItem('chagra:operator:name', 'Miguel');

    const dump = await exportAllData();

    expect(dump.version).toBe(BACKUP_VERSION);
    expect(typeof dump.exportedAt).toBe('string');
    expect(new Date(dump.exportedAt).toString()).not.toBe('Invalid Date');
    expect(dump.dbName).toBe('ChagraDB');
    expect(dump.idb.assets).toHaveLength(1);
    expect(dump.idb.assets[0].id).toBe('a1');
    expect(dump.idb.logs).toHaveLength(1);
    expect(dump.localStorage['chagra:operator:name']).toBe('Miguel');
  });

  it('NO exporta claves sensibles de localStorage (token/password/secret)', async () => {
    vi.mocked(openDB).mockResolvedValue(makeFakeDB({ assets: [] }));
    window.localStorage.setItem('access_token', 'super-secret-jwt');
    window.localStorage.setItem('refresh_token', 'refresh-jwt');
    window.localStorage.setItem('user_password', 'plain123');
    window.localStorage.setItem('some_secret_key', 'shh');
    window.localStorage.setItem('chagra:operator:name', 'Miguel');

    const dump = await exportAllData();

    expect(dump.localStorage.access_token).toBeUndefined();
    expect(dump.localStorage.refresh_token).toBeUndefined();
    expect(dump.localStorage.user_password).toBeUndefined();
    expect(dump.localStorage.some_secret_key).toBeUndefined();
    expect(dump.localStorage['chagra:operator:name']).toBe('Miguel');
  });

  it('serializa blobs de media_cache a dataURL base64', async () => {
    const blob = new Blob(['hola mundo'], { type: 'text/plain' });
    vi.mocked(openDB).mockResolvedValue(
      makeFakeDB({
        media_cache: [{ id: 1, logId: 'log-1', blob, mimeType: 'text/plain' }],
      })
    );

    const dump = await exportAllData();

    expect(dump.idb.media_cache).toHaveLength(1);
    const record = dump.idb.media_cache[0];
    expect(typeof record.blob).toBe('string');
    expect(record.blob.startsWith('data:')).toBe(true);
    expect(record._blobEncoding).toBe('dataURL');
  });

  it('soporta stores nuevos no listados manualmente (itera objectStoreNames real)', async () => {
    vi.mocked(openDB).mockResolvedValue(
      makeFakeDB({
        assets: [],
        un_store_nuevo_que_no_estaba_listado: [{ id: 'x', payload: 'datos' }],
      })
    );

    const dump = await exportAllData();

    expect(dump.idb.un_store_nuevo_que_no_estaba_listado).toHaveLength(1);
    expect(dump.idb.un_store_nuevo_que_no_estaba_listado[0].id).toBe('x');
  });
});

describe('dataBackup.downloadBackupJSON', () => {
  it('genera un Blob JSON, dispara un click sintético y revoca el ObjectURL', async () => {
    vi.mocked(openDB).mockResolvedValue(makeFakeDB({ assets: [{ id: 'a1', asset_type: 'plant' }] }));

    const createObjectURL = vi.fn(() => 'blob:mock-url');
    const revokeObjectURL = vi.fn();
    const originalCreate = URL.createObjectURL;
    const originalRevoke = URL.revokeObjectURL;
    URL.createObjectURL = createObjectURL;
    URL.revokeObjectURL = revokeObjectURL;

    const clickSpy = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});

    try {
      const result = await downloadBackupJSON();
      expect(createObjectURL).toHaveBeenCalledTimes(1);
      const blobArg = /** @type {any[]} */ (createObjectURL.mock.calls[0])[0];
      expect(blobArg).toBeInstanceOf(Blob);
      expect(/** @type {any} */ (blobArg).type).toBe('application/json');
      expect(clickSpy).toHaveBeenCalledTimes(1);
      // El filename debe seguir el patrón chagra-backup-YYYY-MM-DD-HHMM.json
      expect(result._filename).toMatch(/^chagra-backup-\d{4}-\d{2}-\d{2}-\d{4}\.json$/);

      // El revoke se hace en setTimeout(0); esperamos a que se procese.
      await new Promise((r) => setTimeout(r, 5));
      expect(revokeObjectURL).toHaveBeenCalledWith('blob:mock-url');
    } finally {
      clickSpy.mockRestore();
      URL.createObjectURL = originalCreate;
      URL.revokeObjectURL = originalRevoke;
    }
  });
});

describe('dataBackup.getBackupSummary', () => {
  it('cuenta items por tipo (plants, structures, logs, photos, pendingTx)', async () => {
    vi.mocked(openDB).mockResolvedValue(
      makeFakeDB({
        assets: [
          { id: 'a1', asset_type: 'plant' },
          { id: 'a2', asset_type: 'plant' },
          { id: 'a3', asset_type: 'structure' },
          { id: 'a4', asset_type: 'material' },
          { id: 'a5', asset_type: 'land' },
        ],
        logs: [{ id: 'l1' }, { id: 'l2' }, { id: 'l3' }],
        media_cache: [{ id: 1, blob: null }, { id: 2, blob: null }],
        pending_transactions: [{ id: 1 }],
        pending_voice_recordings: [],
        taxonomy_terms: [{ id: 't1' }, { id: 't2' }, { id: 't3' }],
      })
    );

    const summary = await getBackupSummary();

    expect(summary.assets).toBe(5);
    expect(summary.plants).toBe(2);
    expect(summary.structures).toBe(1);
    expect(summary.materials).toBe(1);
    expect(summary.lands).toBe(1);
    expect(summary.logs).toBe(3);
    expect(summary.photos).toBe(2);
    expect(summary.pendingTx).toBe(1);
    expect(summary.pendingVoice).toBe(0);
    expect(summary.taxonomyTerms).toBe(3);
    expect(summary.totalStores).toBeGreaterThan(0);
  });

  it('devuelve ceros cuando los stores no existen en el DB (PWA recién instalada)', async () => {
    vi.mocked(openDB).mockResolvedValue(makeFakeDB({})); // ningún store

    const summary = await getBackupSummary();

    expect(summary.assets).toBe(0);
    expect(summary.plants).toBe(0);
    expect(summary.logs).toBe(0);
    expect(summary.photos).toBe(0);
    expect(summary.pendingTx).toBe(0);
  });
});
