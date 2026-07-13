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
                exec: ({ bind } = /** @type {any} */ ({})) => {
                    const rows = {
                        tomate: {
                            id: 'tomate',
                            feeding_plan_template: {
                                primary_steps: [
                                    { offset_days: 0, action: 'apply_biofertilizer', biofertilizer_slug: 'humus', dose_ml: 100, notes: 'siembra' },
                                    { offset_days: 30, action: 'apply_biofertilizer', biofertilizer_slug: 'humus', dose_ml: 100, notes: 'mes 1' },
                                ],
                            },
                        },
                        eugenia_stipitata: {
                            id: 'eugenia_stipitata',
                            nombre_comun: 'Arazá',
                            nombre_cientifico: 'Eugenia stipitata',
                            category: 'frutales_perennes',
                            familia_botanica: 'Myrtaceae',
                            altitud_msnm: { min_absoluto: 0, optimo_min: 100, optimo_max: 600, max_absoluto: 1000 },
                            temperatura_c: { optimo_min: 22, optimo_max: 28, max_tolerable: 35 },
                            agua: 'alto',
                            drenaje_requerido: 'bueno',
                            light: 'sol_pleno',
                        },
                    };
                    const id = bind?.[0];
                    const row = rows[id];
                    return row ? [{ data: JSON.stringify(row) }] : [];
                },
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

    it('genera un plan derivado generico para un frutal sin template explicito', async () => {
        const plan = await tryGeneratePlanFromSeeding({
            assetId: 'ffffffff-eeee-dddd-cccc-bbbbbbbbbbbb',
            speciesSlug: 'eugenia_stipitata',
            plantingDate: new Date(1_700_000_000 * 1000).toISOString(),
            plantName: 'Arazá',
        });

        expect(plan).toBeTruthy();
        expect(plan.steps.length).toBeGreaterThan(0);
        expect(plan.feeding_plan_source).toMatch(/generico por categoria/i);
        expect(plan.feeding_plan_source).toMatch(/frutales_perennes/i);
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

// ─── generatePlanForPlant — plantingDate custom (audit finding 070.3, 2026-05-18) ─────
// Verifica que cuando el form pasa fechaGerminacion (operador inscribió una
// planta que lleva tiempo sembrada), los offsets del template se calculan
// desde esa fecha y no desde Date.now(). Backward-compat: si no se pasa
// plantingDate, debe seguir anclando a Date.now() sin romper.
describe('generatePlanForPlant — plantingDate custom (audit finding 070.3)', () => {
    const PLANT_UUID_2 = 'cccccccc-dddd-eeee-ffff-000000000000';
    let generatePlanForPlant;
    let inMemoryPlansById;

    beforeEach(async () => {
        vi.resetModules();
        vi.clearAllMocks();

        inMemoryPlansById = new Map();

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
                getAll: () => {
                    const req = { onsuccess: null, onerror: null };
                    Promise.resolve().then(() => {
                        req.result = [];
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
        vi.doMock('../../db/catalogDB.js', () => ({
            initCatalog: vi.fn().mockResolvedValue({
                exec: () => [{
                    data: JSON.stringify({
                        id: 'tomate',
                        feeding_plan_template: {
                            primary_steps: [
                                { offset_days: 0, action: 'apply_biofertilizer', biofertilizer_slug: 'humus', dose_ml: 100, notes: 'siembra' },
                                { offset_days: 30, action: 'apply_biofertilizer', biofertilizer_slug: 'humus', dose_ml: 100, notes: 'mes 1' },
                                { offset_days: 60, action: 'apply_biofertilizer', biofertilizer_slug: 'humus', dose_ml: 100, notes: 'mes 2' },
                            ],
                        },
                    }),
                }],
            }),
        }));

        ({ generatePlanForPlant } = await import('../planGeneratorService.js'));
    });

    it('plantingDate custom: ancla offsets desde la fecha pasada (NO Date.now())', async () => {
        // 2024-03-15 00:00 UTC — fecha conocida claramente anterior a Date.now().
        const plantingIso = '2024-03-15T00:00:00.000Z';
        const plantingTs = new Date(plantingIso).getTime();

        const plan = await generatePlanForPlant({
            assetId: PLANT_UUID_2,
            speciesSlug: 'tomate',
            plantingDate: plantingIso,
        });

        expect(plan).toBeTruthy();
        expect(plan.steps).toHaveLength(3);

        // Step 0: offset_days=0 → scheduled = plantingTs.
        expect(plan.steps[0].scheduled_date).toBe(plantingTs);
        // Step 1: offset_days=30 → scheduled = plantingTs + 30d.
        expect(plan.steps[1].scheduled_date).toBe(plantingTs + 30 * 86400000);
        // Step 2: offset_days=60 → scheduled = plantingTs + 60d.
        expect(plan.steps[2].scheduled_date).toBe(plantingTs + 60 * 86400000);
    });

    it('plantingDate omitido: fallback a Date.now() (backward-compat)', async () => {
        const before = Date.now();
        const plan = await generatePlanForPlant({
            assetId: PLANT_UUID_2,
            speciesSlug: 'tomate',
            // plantingDate intencionalmente omitido
        });
        const after = Date.now();

        expect(plan).toBeTruthy();
        // El step 0 (offset_days=0) debe quedar entre before y after — anclado
        // a Date.now() interno, no a NaN ni a un valor del pasado lejano.
        expect(plan.steps[0].scheduled_date).toBeGreaterThanOrEqual(before);
        expect(plan.steps[0].scheduled_date).toBeLessThanOrEqual(after);
    });

    it('plantingDate inválido (string basura): fallback a Date.now() sin throw', async () => {
        const before = Date.now();
        const plan = await generatePlanForPlant({
            assetId: PLANT_UUID_2,
            speciesSlug: 'tomate',
            plantingDate: 'no-es-una-fecha',
        });
        const after = Date.now();

        expect(plan).toBeTruthy();
        // Verifica que no quedó NaN (NaN no es ≥ before).
        expect(Number.isFinite(plan.steps[0].scheduled_date)).toBe(true);
        expect(plan.steps[0].scheduled_date).toBeGreaterThanOrEqual(before);
        expect(plan.steps[0].scheduled_date).toBeLessThanOrEqual(after);
    });
});
