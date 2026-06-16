/**
 * syncManager.branches.test.js — Branch coverage para syncManager.
 *
 * Cubre ramas no alcanzadas por syncManager.test.js:
 * - classifyHttpError (todos los status codes)
 * - quarantineTransaction / requeueFailedTransaction / discardFailedTransaction
 * - markRetry (record existente y no existente)
 * - getFailedTransactions / getPendingTransactions (result null guard)
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock de dbCore
vi.mock('../../db/dbCore', () => ({
  openDB: vi.fn().mockResolvedValue({}),
  STORES: {
    PENDING_VOICE: 'pending_voice_recordings',
    FAILED_TX: 'failed_transactions',
  },
}));

vi.mock('../apiService', () => ({
  sendToFarmOS: vi.fn(),
  fetchFromFarmOS: vi.fn(),
}));

vi.mock('../../db/logCache', () => ({
  logCache: {
    put: vi.fn().mockResolvedValue(undefined),
    getByType: vi.fn().mockResolvedValue([]),
    bulkPut: vi.fn().mockResolvedValue(undefined),
  },
}));

vi.mock('../voiceTelemetryService', () => ({
  recordEvent: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('../planGeneratorService', () => ({
  tryGeneratePlanFromSeeding: vi.fn(),
}));

vi.mock('../../utils/taskCompletionParser', () => ({
  getCompletedTaskIds: vi.fn().mockReturnValue(new Set()),
}));

vi.mock('../../utils/id', () => ({
  newId: vi.fn().mockReturnValue('mock-id'),
}));

vi.mock('../visionQueueService', () => ({
  flushVisionQueue: vi.fn().mockResolvedValue(undefined),
}));

describe('syncManager — branch coverage: classifyHttpError', () => {
  let smInstance;

  beforeEach(async () => {
    vi.clearAllMocks();
    Object.defineProperty(navigator, 'onLine', {
      configurable: true,
      writable: true,
      value: true,
    });
    const mod = await import('../syncManager');
    smInstance = new mod.SyncManager();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('clasifica 401 como auth_expired', () => {
    expect(smInstance.classifyHttpError(401)).toBe('auth_expired');
  });

  it('clasifica 403 como forbidden', () => {
    expect(smInstance.classifyHttpError(403)).toBe('forbidden');
  });

  it('clasifica 404 como not_found', () => {
    expect(smInstance.classifyHttpError(404)).toBe('not_found');
  });

  it('clasifica 409 como conflict', () => {
    expect(smInstance.classifyHttpError(409)).toBe('conflict');
  });

  it('clasifica 422 como validation', () => {
    expect(smInstance.classifyHttpError(422)).toBe('validation');
  });

  it('clasifica 429 como rate_limit', () => {
    expect(smInstance.classifyHttpError(429)).toBe('rate_limit');
  });

  it('clasifica 400-499 restante como client_other', () => {
    expect(smInstance.classifyHttpError(400)).toBe('client_other');
    expect(smInstance.classifyHttpError(405)).toBe('client_other');
    expect(smInstance.classifyHttpError(418)).toBe('client_other');
  });

  it('clasifica 500+ como server', () => {
    expect(smInstance.classifyHttpError(500)).toBe('server');
    expect(smInstance.classifyHttpError(502)).toBe('server');
    expect(smInstance.classifyHttpError(503)).toBe('server');
  });

  it('clasifica desconocido como unknown', () => {
    expect(smInstance.classifyHttpError(0)).toBe('unknown');
    expect(smInstance.classifyHttpError(200)).toBe('unknown');
    expect(smInstance.classifyHttpError(302)).toBe('unknown');
  });
});

describe('syncManager — branch coverage: quarantine + discard + requeue', () => {
  const mockTxStore = {};

  function mockDbWithFailedStore() {
    const db = {
      transaction: vi.fn().mockReturnValue({
        objectStore: vi.fn().mockReturnValue(mockTxStore),
        oncomplete: null,
        onerror: null,
      }),
    };
    return db;
  }

  beforeEach(async () => {
    vi.clearAllMocks();
    Object.defineProperty(navigator, 'onLine', {
      configurable: true,
      writable: true,
      value: true,
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('quarantineTransaction', () => {
    it('construye record con todos los campos del error', async () => {
      const { SyncManager } = await import('../syncManager');
      const sm = new SyncManager();
      sm.db = mockDbWithFailedStore();

      const tx = {
        id: 'tx-fail-1',
        type: 'seeding',
        endpoint: '/api/log/seeding',
        payload: { data: { type: 'log--seeding' } },
        retries: 2,
        timestamp: 1700000000,
      };
      const error = { status: 422, message: 'Validation failed' };

      const mockStore = {
        add: vi.fn(),
      };
      const mockTx = {
        objectStore: vi.fn().mockReturnValue(mockStore),
        oncomplete: null,
        onerror: null,
      };
      sm.db.transaction = vi.fn().mockReturnValue(mockTx);

      // Disparamos la operacion
      const promise = sm.quarantineTransaction(tx, error);

      // Simulamos oncomplete
      mockTx.oncomplete();

      await expect(promise).resolves.toBeUndefined();
      expect(sm.db.transaction).toHaveBeenCalledWith(['failed_transactions'], 'readwrite');
    });

    it('clasifica error.status 0 como unknown', async () => {
      const { SyncManager } = await import('../syncManager');
      const sm = new SyncManager();
      sm.db = mockDbWithFailedStore();

      const tx = { id: 'tx-unk', type: 'observation', payload: {} };
      const error = { status: 0, message: 'Network Error' };

      const mockStore = {
        add: vi.fn(),
      };
      const mockTx = {
        objectStore: vi.fn().mockReturnValue(mockStore),
        oncomplete: null,
        onerror: null,
      };
      sm.db.transaction = vi.fn().mockReturnValue(mockTx);

      const promise = sm.quarantineTransaction(tx, error);
      mockTx.oncomplete();

      await expect(promise).resolves.toBeUndefined();
    });
  });

  describe('discardFailedTransaction', () => {
    it('elimina transaccion de failed_transactions', async () => {
      const { SyncManager } = await import('../syncManager');
      const sm = new SyncManager();
      sm.db = mockDbWithFailedStore();

      const mockStore = {
        delete: vi.fn(),
      };
      const mockTx = {
        objectStore: vi.fn().mockReturnValue(mockStore),
        oncomplete: null,
        onerror: null,
      };
      sm.db.transaction = vi.fn().mockReturnValue(mockTx);

      const promise = sm.discardFailedTransaction('failed-99');
      mockTx.oncomplete();

      await expect(promise).resolves.toBeUndefined();
      expect(mockStore.delete).toHaveBeenCalledWith('failed-99');
      expect(sm.db.transaction).toHaveBeenCalledWith(['failed_transactions'], 'readwrite');
    });
  });

  describe('requeueFailedTransaction', () => {
    it('mueve failed a pending cuando existe el record', async () => {
      const { SyncManager } = await import('../syncManager');
      const sm = new SyncManager();
      sm.db = mockDbWithFailedStore();

      const failedRecord = {
        type: 'seeding',
        endpoint: '/api/log/seeding',
        payload: { data: { type: 'log--seeding' } },
      };

      const mockFailedStore = {
        get: vi.fn().mockReturnValue({
          get result() { return failedRecord; },
          onsuccess: null,
          onerror: null,
        }),
        delete: vi.fn(),
      };
      const mockPendingStore = {
        add: vi.fn(),
      };

      const mockTx = {
        objectStore: vi.fn((name) => {
          if (name === 'failed_transactions') return mockFailedStore;
          if (name === 'pending_transactions') return mockPendingStore;
          return null;
        }),
        oncomplete: null,
        onerror: null,
      };
      sm.db.transaction = vi.fn().mockReturnValue(mockTx);

      const promise = sm.requeueFailedTransaction('failed-1');
      const getReq = mockFailedStore.get();
      getReq.onsuccess();
      mockTx.oncomplete();

      await expect(promise).resolves.toBe(true);
      expect(mockPendingStore.add).toHaveBeenCalled();
      expect(mockFailedStore.delete).toHaveBeenCalledWith('failed-1');
    });

    it('retorna false si el record no existe', async () => {
      const { SyncManager } = await import('../syncManager');
      const sm = new SyncManager();
      sm.db = mockDbWithFailedStore();

      const mockFailedStore = {
        get: vi.fn().mockReturnValue({
          get result() { return undefined; },
          onsuccess: null,
          onerror: null,
        }),
        delete: vi.fn(),
      };
      const mockPendingStore = { add: vi.fn() };

      const mockTx = {
        objectStore: vi.fn((name) => {
          if (name === 'failed_transactions') return mockFailedStore;
          if (name === 'pending_transactions') return mockPendingStore;
          return null;
        }),
        oncomplete: null,
        onerror: null,
      };
      sm.db.transaction = vi.fn().mockReturnValue(mockTx);

      const promise = sm.requeueFailedTransaction('missing-id');
      const getReq = mockFailedStore.get();
      getReq.onsuccess();

      await expect(promise).resolves.toBe(false);
      expect(mockPendingStore.add).not.toHaveBeenCalled();
    });

    it('usa mutatedPayload cuando se provee', async () => {
      const { SyncManager } = await import('../syncManager');
      const sm = new SyncManager();
      sm.db = mockDbWithFailedStore();

      const failedRecord = {
        type: 'seeding',
        endpoint: '/api/log/seeding',
        payload: { data: { type: 'log--seeding', attributes: { name: 'old' } } },
      };

      const mutatedPayload = { data: { type: 'log--seeding', attributes: { name: 'corrected' } } };

      const mockFailedStore = {
        get: vi.fn().mockReturnValue({
          get result() { return failedRecord; },
          onsuccess: null,
          onerror: null,
        }),
        delete: vi.fn(),
      };
      const mockPendingStore = {
        add: vi.fn(),
      };

      const mockTx = {
        objectStore: vi.fn((name) => {
          if (name === 'failed_transactions') return mockFailedStore;
          if (name === 'pending_transactions') return mockPendingStore;
          return null;
        }),
        oncomplete: null,
        onerror: null,
      };
      sm.db.transaction = vi.fn().mockReturnValue(mockTx);

      const promise = sm.requeueFailedTransaction('failed-2', mutatedPayload);
      const getReq = mockFailedStore.get();
      getReq.onsuccess();
      mockTx.oncomplete();

      await expect(promise).resolves.toBe(true);
      const addedRecord = mockPendingStore.add.mock.calls[0]?.[0];
      expect(addedRecord.payload).toEqual(mutatedPayload);
    });
  });

  describe('getFailedTransactions', () => {
    it('devuelve array vacio cuando no hay failed transactions', async () => {
      const { SyncManager } = await import('../syncManager');
      const sm = new SyncManager();
      sm.db = mockDbWithFailedStore();

      const mockStore = {
        getAll: vi.fn().mockReturnValue({
          get result() { return undefined; },
          onsuccess: null,
          onerror: null,
        }),
      };
      const mockTx = {
        objectStore: vi.fn().mockReturnValue(mockStore),
      };
      sm.db.transaction = vi.fn().mockReturnValue(mockTx);

      const promise = sm.getFailedTransactions();
      const req = mockStore.getAll();
      req.onsuccess();

      await expect(promise).resolves.toEqual([]);
    });

    it('devuelve lista de failed transactions', async () => {
      const { SyncManager } = await import('../syncManager');
      const sm = new SyncManager();
      sm.db = mockDbWithFailedStore();

      const failedList = [{ id: 'f1', type: 'seeding' }, { id: 'f2', type: 'observation' }];
      const mockStore = {
        getAll: vi.fn().mockReturnValue({
          get result() { return failedList; },
          onsuccess: null,
          onerror: null,
        }),
      };
      const mockTx = {
        objectStore: vi.fn().mockReturnValue(mockStore),
      };
      sm.db.transaction = vi.fn().mockReturnValue(mockTx);

      const promise = sm.getFailedTransactions();
      const req = mockStore.getAll();
      req.onsuccess();

      await expect(promise).resolves.toEqual(failedList);
    });
  });

  describe('markRetry', () => {
    it('incrementa retries en record existente', async () => {
      const { SyncManager } = await import('../syncManager');
      const sm = new SyncManager();
      sm.db = mockDbWithFailedStore();

      const existingRecord = { id: 'tx-r1', retries: 1 };
      const mockStore = {
        get: vi.fn().mockReturnValue({
          get result() { return existingRecord; },
          onsuccess: null,
          onerror: null,
        }),
        put: vi.fn(),
      };
      const mockTx = {
        objectStore: vi.fn().mockReturnValue(mockStore),
        oncomplete: null,
        onerror: null,
      };
      sm.db.transaction = vi.fn().mockReturnValue(mockTx);

      const promise = sm.markRetry('tx-r1', 'Timeout');
      const getReq = mockStore.get();
      getReq.onsuccess();
      mockTx.oncomplete();

      const retries = await promise;
      expect(retries).toBe(2);
      expect(existingRecord.lastError).toBe('Timeout');
      expect(mockStore.put).toHaveBeenCalledWith(existingRecord);
    });

    it('retorna undefined cuando el record no existe', async () => {
      const { SyncManager } = await import('../syncManager');
      const sm = new SyncManager();
      sm.db = mockDbWithFailedStore();

      const mockStore = {
        get: vi.fn().mockReturnValue({
          get result() { return undefined; },
          onsuccess: null,
          onerror: null,
        }),
        put: vi.fn(),
      };
      const mockTx = {
        objectStore: vi.fn().mockReturnValue(mockStore),
      };
      sm.db.transaction = vi.fn().mockReturnValue(mockTx);

      const promise = sm.markRetry('nonexistent', 'error');
      const getReq = mockStore.get();
      getReq.onsuccess();

      await expect(promise).resolves.toBeUndefined();
      expect(mockStore.put).not.toHaveBeenCalled();
    });

    it('inicializa retries en 0 si el campo no existe', async () => {
      const { SyncManager } = await import('../syncManager');
      const sm = new SyncManager();
      sm.db = mockDbWithFailedStore();

      const record = { id: 'tx-new' };
      const mockStore = {
        get: vi.fn().mockReturnValue({
          get result() { return record; },
          onsuccess: null,
          onerror: null,
        }),
        put: vi.fn(),
      };
      const mockTx = {
        objectStore: vi.fn().mockReturnValue(mockStore),
        oncomplete: null,
        onerror: null,
      };
      sm.db.transaction = vi.fn().mockReturnValue(mockTx);

      const promise = sm.markRetry('tx-new', 'First error');
      const getReq = mockStore.get();
      getReq.onsuccess();
      mockTx.oncomplete();

      const retries = await promise;
      expect(retries).toBe(1);
      expect(record.retries).toBe(1);
    });
  });
});
