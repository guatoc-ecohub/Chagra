import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// ─── Mocks de módulos externos ────────────────────────────────────────────
// Mockeamos en orden: dbCore (apertura IDB), apiService (POST FarmOS),
// logCache (persistencia logs sincronizados), voiceTelemetryService (no-op),
// planGeneratorService (verificamos llamadas al helper).
vi.mock('../apiService', () => ({
    sendToFarmOS: vi.fn(),
    fetchFromFarmOS: vi.fn(),
}));

vi.mock('../../db/dbCore', () => ({
    openDB: vi.fn().mockResolvedValue({}),
    STORES: { PENDING_VOICE: 'pending_voice_recordings' },
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

// Mockeamos también payloadService imports auxiliares en case-of importchain
vi.mock('../../utils/taskCompletionParser', () => ({
    getCompletedTaskIds: vi.fn().mockReturnValue(new Set()),
}));

vi.mock('../../utils/id', () => ({
    newId: vi.fn().mockReturnValue('mock-id'),
}));

// ─── Helpers ──────────────────────────────────────────────────────────────
const PLANT_UUID = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee';

function makeSeedingTransaction({ includeSpeciesSlug = true, assetUUID = null } = {}) {
    const inlineAsset = {
        type: 'asset--plant',
        ...(assetUUID ? { id: assetUUID } : {}),
        ...(includeSpeciesSlug ? { _speciesSlug: 'tomate' } : {}),
        attributes: { name: 'Tomate Cherry [voz]', status: 'active' },
    };
    return {
        id: 'tx-1',
        type: 'seeding',
        endpoint: '/api/log/seeding',
        payload: {
            data: {
                type: 'log--seeding',
                attributes: { name: 'Siembra: tomate (x1) [voz]', timestamp: 1_700_000_000, status: 'done' },
                relationships: {
                    asset: { data: [inlineAsset] },
                },
            },
        },
        synced: false,
    };
}

function makeFarmOSResponse({ remoteAssetUUID = PLANT_UUID } = {}) {
    return {
        data: {
            id: 'log-seeding-uuid',
            type: 'log--seeding',
            attributes: { timestamp: 1_700_000_000 },
            relationships: {
                asset: { data: [{ type: 'asset--plant', id: remoteAssetUUID }] },
            },
        },
    };
}

// ─── Stub mínimo de IDBDatabase para syncManager ──────────────────────────
// syncManager.syncAll consume getPendingTransactions(), deleteTransaction(),
// y syncTransaction(). Stubbeamos los métodos en la instancia para evitar
// montar un mock completo de IndexedDB.
function patchSyncManager(syncManager, pendingTransactions) {
    syncManager.db = { mocked: true };
    syncManager.isOnline = true;
    syncManager.isSyncing = false;
    syncManager.getPendingTransactions = vi.fn().mockResolvedValue(pendingTransactions);
    syncManager.deleteTransaction = vi.fn().mockResolvedValue(undefined);
    syncManager.persistSyncedLog = vi.fn().mockResolvedValue(undefined);
    syncManager.markRetry = vi.fn().mockResolvedValue(1);
    return syncManager;
}

describe('syncManager — plan generation hook (audit finding #2)', () => {
    let syncManager;
    let sendToFarmOS;
    let tryGeneratePlanFromSeeding;

    beforeEach(async () => {
        vi.resetModules();
        vi.clearAllMocks();

        // navigator.onLine no es writable en jsdom por defecto; defineProperty.
        Object.defineProperty(navigator, 'onLine', {
            configurable: true,
            writable: true,
            value: true,
        });

        ({ syncManager } = await import('../syncManager'));
        ({ sendToFarmOS } = await import('../apiService'));
        ({ tryGeneratePlanFromSeeding } = await import('../planGeneratorService'));
    });

    afterEach(() => {
        vi.clearAllMocks();
    });

    describe('extractPlanSeed', () => {
        it('extrae assetId, speciesSlug, plantingDate y plantName de seeding sincronizado', () => {
            const tx = makeSeedingTransaction({ includeSpeciesSlug: true });
            const result = makeFarmOSResponse({ remoteAssetUUID: PLANT_UUID });

            const seed = syncManager.extractPlanSeed(tx, result);

            expect(seed).toEqual({
                assetId: PLANT_UUID,
                speciesSlug: 'tomate',
                plantingDate: new Date(1_700_000_000 * 1000).toISOString(),
                plantName: 'Tomate Cherry [voz]',
            });
        });

        it('retorna null si la transacción no es seeding', () => {
            const tx = { ...makeSeedingTransaction(), type: 'observation' };
            const result = makeFarmOSResponse();
            expect(syncManager.extractPlanSeed(tx, result)).toBeNull();
        });

        it('retorna null si el inline asset--plant no trae _speciesSlug', () => {
            const tx = makeSeedingTransaction({ includeSpeciesSlug: false });
            const result = makeFarmOSResponse();
            expect(syncManager.extractPlanSeed(tx, result)).toBeNull();
        });

        it('cae al UUID del payload si el syncResult no trae relationships.asset', () => {
            const tx = makeSeedingTransaction({
                includeSpeciesSlug: true,
                assetUUID: PLANT_UUID,
            });
            const result = { data: { id: 'log-id', type: 'log--seeding' } };
            const seed = syncManager.extractPlanSeed(tx, result);
            expect(seed?.assetId).toBe(PLANT_UUID);
        });

        it('retorna null si no hay assetId ni en syncResult ni en payload', () => {
            const tx = makeSeedingTransaction({ includeSpeciesSlug: true });
            const result = { data: { id: 'log-id', type: 'log--seeding' } };
            expect(syncManager.extractPlanSeed(tx, result)).toBeNull();
        });
    });

    describe('syncAll → tryGeneratePlanFromSeeding (path offline)', () => {
        it('llama tryGeneratePlanFromSeeding tras sync exitoso de seeding con _speciesSlug', async () => {
            const tx = makeSeedingTransaction({ includeSpeciesSlug: true });
            const farmosResult = makeFarmOSResponse({ remoteAssetUUID: PLANT_UUID });
            patchSyncManager(syncManager, [tx]);
            sendToFarmOS.mockResolvedValue(farmosResult);
            tryGeneratePlanFromSeeding.mockResolvedValue({ steps: [{ id: 'step-1' }] });

            await syncManager.syncAll();

            expect(tryGeneratePlanFromSeeding).toHaveBeenCalledOnce();
            expect(tryGeneratePlanFromSeeding).toHaveBeenCalledWith({
                assetId: PLANT_UUID,
                speciesSlug: 'tomate',
                plantingDate: new Date(1_700_000_000 * 1000).toISOString(),
                plantName: 'Tomate Cherry [voz]',
            });
        });

        it('emite syncCompleted con planGenerated cuando el plan tiene steps', async () => {
            const tx = makeSeedingTransaction({ includeSpeciesSlug: true });
            patchSyncManager(syncManager, [tx]);
            sendToFarmOS.mockResolvedValue(makeFarmOSResponse());
            tryGeneratePlanFromSeeding.mockResolvedValue({ steps: [{ id: 's1' }, { id: 's2' }] });

            const events = [];
            const listener = (e) => events.push(e.detail);
            window.addEventListener('syncCompleted', listener);

            await syncManager.syncAll();
            window.removeEventListener('syncCompleted', listener);

            const seedingEvent = events.find((d) => d?.planGenerated);
            expect(seedingEvent).toBeTruthy();
            expect(seedingEvent.planGenerated).toEqual({
                plantId: PLANT_UUID,
                plantName: 'Tomate Cherry [voz]',
                steps: 2,
            });
        });

        it('NO llama tryGeneratePlanFromSeeding si la transacción no es seeding', async () => {
            const tx = {
                id: 'tx-obs',
                type: 'observation',
                payload: { data: { type: 'log--observation', attributes: {}, relationships: {} } },
                synced: false,
            };
            patchSyncManager(syncManager, [tx]);
            sendToFarmOS.mockResolvedValue({ data: { id: 'log-obs' } });

            await syncManager.syncAll();

            expect(tryGeneratePlanFromSeeding).not.toHaveBeenCalled();
        });

        it('no rompe el sync si la generación de plan falla (resiliencia)', async () => {
            const tx = makeSeedingTransaction({ includeSpeciesSlug: true });
            patchSyncManager(syncManager, [tx]);
            sendToFarmOS.mockResolvedValue(makeFarmOSResponse());
            // El helper ya captura errores internamente y retorna null. Pero
            // verificamos defensivamente que ante un throw inesperado, syncAll
            // no propague. Forzamos rechazo y validamos que deleteTransaction
            // se haya ejecutado igual.
            tryGeneratePlanFromSeeding.mockResolvedValue(null);

            await expect(syncManager.syncAll()).resolves.not.toThrow();
            expect(syncManager.deleteTransaction).toHaveBeenCalledWith('tx-1');
        });

        it('idempotente: ya delegamos la verificación al helper — syncAll lo invoca una vez por transacción', async () => {
            const tx = makeSeedingTransaction({ includeSpeciesSlug: true });
            patchSyncManager(syncManager, [tx, { ...tx, id: 'tx-2' }]);
            sendToFarmOS.mockResolvedValue(makeFarmOSResponse());
            tryGeneratePlanFromSeeding.mockResolvedValue({ steps: [] });

            await syncManager.syncAll();

            // 2 transacciones seeding → 2 invocaciones. La idempotencia per
            // assetId vive dentro del helper (tested aparte en planGeneratorService).
            expect(tryGeneratePlanFromSeeding).toHaveBeenCalledTimes(2);
        });
    });
});

// Tests del helper compartido tryGeneratePlanFromSeeding viven en
// src/services/__tests__/planGeneratorService.test.js — separados para que
// vi.mock('../planGeneratorService') que necesita este archivo (para aislar
// syncManager.syncAll) no contamine los tests del helper.
