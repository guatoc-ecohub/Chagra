import { describe, it, expect, vi, beforeEach } from 'vitest';

// ─── Helper tryGeneratePlanFromSeeding (audit finding #2, 2026-05-18) ─────
// Aísla planGeneratorService de IDB real (sqlite-wasm catalog + plans store).
// Mockea openDB y los servicios de inventory que son tirados transitivamente.

const PLANT_UUID = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee';

describe('tryGeneratePlanFromSeeding — helper compartido (audit finding #2)', () => {
    let inMemoryPlansById;
    let tryGeneratePlanFromSeeding;

    beforeEach(async () => {
        vi.resetModules();
        vi.clearAllMocks();

        inMemoryPlansById = new Map();

        // IndexedDB stub mínimo. Las funciones reales de planGeneratorService
        // usan store.put / index('asset_id').getAll(assetId) sobre STORES.PLANS.
        // Reproducimos esos endpoints con un Map en memoria.
        const stubStore = {
            put: (plan) => {
                const req = { onsuccess: null, onerror: null };
                Promise.resolve().then(() => {
                    inMemoryPlansById.set(plan.id, plan);
                    req.result = plan;
                    req.onsuccess?.({ target: req });
                });
                return req;
            },
            index: () => ({
                getAll: (assetId) => {
                    const req = { onsuccess: null, onerror: null };
                    Promise.resolve().then(() => {
                        const found = [...inMemoryPlansById.values()].filter((p) => p.asset_id === assetId);
                        req.result = found;
                        req.onsuccess?.({ target: req });
                    });
                    return req;
                },
            }),
        };
        const stubDb = { transaction: () => ({ objectStore: () => stubStore }) };

        vi.doMock('../../db/dbCore.js', () => ({
            openDB: vi.fn().mockResolvedValue(stubDb),
            STORES: { PLANS: 'plans' },
        }));
        vi.doMock('../inventoryService.js', () => ({
            appendEvent: vi.fn(),
            getStock: vi.fn().mockResolvedValue(null),
        }));
        vi.doMock('../inventoryEvents.js', () => ({
            createInventoryEvent: vi.fn(),
            EVENT_TYPES: {},
        }));
        // catalogDB stub: una especie 'tomate' con 2 steps simples.
        vi.doMock('../../db/catalogDB.js', () => ({
            initCatalog: vi.fn().mockResolvedValue({
                exec: () => [{
                    data: JSON.stringify({
                        id: 'tomate',
                        feeding_plan_template: {
                            primary_steps: [
                                { offset_days: 0, action: 'apply_biofertilizer', biofertilizer_slug: 'humus', dose_ml: 100, notes: 'siembra' },
                                { offset_days: 30, action: 'apply_biofertilizer', biofertilizer_slug: 'humus', dose_ml: 100, notes: 'mes 1' },
                            ],
                        },
                    }),
                }],
            }),
        }));

        ({ tryGeneratePlanFromSeeding } = await import('../planGeneratorService.js'));
    });

    it('retorna null si falta assetId', async () => {
        const plan = await tryGeneratePlanFromSeeding({ speciesSlug: 'tomate', plantingDate: new Date().toISOString() });
        expect(plan).toBeNull();
    });

    it('retorna null si falta speciesSlug', async () => {
        const plan = await tryGeneratePlanFromSeeding({ assetId: PLANT_UUID, plantingDate: new Date().toISOString() });
        expect(plan).toBeNull();
    });

    it('genera plan si no existe previamente para el asset', async () => {
        const plan = await tryGeneratePlanFromSeeding({
            assetId: PLANT_UUID,
            speciesSlug: 'tomate',
            plantingDate: new Date(1_700_000_000 * 1000).toISOString(),
            plantName: 'Tomate Cherry',
        });
        expect(plan).toBeTruthy();
        expect(plan.asset_id).toBe(PLANT_UUID);
        expect(plan.steps.length).toBeGreaterThan(0);
        expect(plan._plantName).toBe('Tomate Cherry');
    });

    it('idempotente: si ya hay plan para el asset, retorna el existente sin regenerar', async () => {
        const existing = {
            id: 'plan-existing',
            asset_id: PLANT_UUID,
            species_slug: 'tomate',
            generated_at: Date.now() - 1000,
            steps: [{ id: 'existing-step', status: 'pending' }],
        };
        inMemoryPlansById.set(existing.id, existing);

        const plan = await tryGeneratePlanFromSeeding({
            assetId: PLANT_UUID,
            speciesSlug: 'tomate',
            plantingDate: new Date().toISOString(),
        });

        expect(plan?.id).toBe('plan-existing');
        // No regeneró → sigue siendo 1 plan total en el store.
        expect(inMemoryPlansById.size).toBe(1);
    });
});
