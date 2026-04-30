import { ulid } from 'ulid';
import { openDB, STORES } from '../db/dbCore.js';
import { appendEvent, getStock } from './inventoryService.js';
import { createInventoryEvent, EVENT_TYPES } from './inventoryEvents.js';

export async function generatePlanForPlant({ assetId, speciesSlug, plantingDate, climateZone, lunarPhase }) {
    // Query from sqlite directly using the global helper if present, else fallback.
    // Using the window.__chagraCatalog is usually available in the app context, or we can fetch.
    // Actually, let's use the DB directly or fetch JSON since initCatalog is in db/catalogDB.js
    let speciesData = null;

    if (typeof window !== 'undefined' && window.__chagraCatalog) {
        const speciesList = await window.__chagraCatalog.getAllSpecies();
        speciesData = speciesList.find(s => s.id === speciesSlug);
    } else {
        // Basic fallback if catalog DB is not initialized here
        try {
            const { initCatalog } = await import('../db/catalogDB.js');
            const catalogDb = await initCatalog();
            const rows = catalogDb.exec({
                sql: 'SELECT data FROM species WHERE id = ?',
                bind: [speciesSlug],
                rowMode: 'object'
            });
            if (rows.length > 0) {
                speciesData = JSON.parse(rows[0].data);
            }
        } catch (e) {
            console.warn("Could not fetch species from catalogDB", e);
        }
    }

    if (!speciesData) return null;
    const template = speciesData.feeding_plan_template;
    if (!template || !template.primary_steps) {
        // Returns empty plan with no steps
        return await savePlan({
            id: ulid(),
            asset_id: assetId,
            species_slug: speciesSlug,
            generated_at: Date.now(),
            steps: []
        });
    }

    const planId = ulid();
    const generatedAt = Date.now();
    const pDate = new Date(plantingDate).getTime();

    const steps = await Promise.all(template.primary_steps.map(async (stepTpl) => {
        const stepId = ulid();
        let offset = stepTpl.offset_days || 0;

        // Modula frecuencia según climateZone
        if (climateZone === 'frio' || climateZone === 'paramo') offset = Math.round(offset * 1.2);
        if (climateZone === 'calido') offset = Math.round(offset * 0.8);

        // Considera lunarPhase (ejemplo: add 1-2 days based on phase)
        if (lunarPhase === 'creciente' || lunarPhase === 'llena') offset += 1;

        const scheduledDate = pDate + offset * 86400000;

        // Consulta inventory_stock_snapshot
        let stock_unavailable = false;
        if (stepTpl.biofertilizer_slug) {
            try {
                const stock = await getStock(stepTpl.biofertilizer_slug);
                if (!stock || stock.quantity <= 0) {
                    stock_unavailable = true;
                }
            } catch {
                stock_unavailable = true;
            }
        }

        return {
            id: stepId,
            scheduled_date: scheduledDate,
            action_type: stepTpl.action || 'apply_biofertilizer',
            biofertilizer_slug: stepTpl.biofertilizer_slug,
            dose_ml: stepTpl.dose_ml,
            notes: stepTpl.notes || '',
            status: 'pending',
            stock_unavailable
        };
    }));

    return await savePlan({
        id: planId,
        asset_id: assetId,
        species_slug: speciesSlug,
        generated_at: generatedAt,
        steps,
    });
}

async function savePlan(plan) {
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const tx = db.transaction(STORES.PLANS, 'readwrite');
        const r = tx.objectStore(STORES.PLANS).put(plan);
        r.onsuccess = () => resolve(plan);
        r.onerror = () => reject(r.error);
    });
}

export async function getPlanForAsset(assetId) {
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const tx = db.transaction(STORES.PLANS, 'readonly');
        const idx = tx.objectStore(STORES.PLANS).index('asset_id');
        const getReq = idx.getAll(assetId);
        getReq.onsuccess = () => {
            const plans = getReq.result || [];
            if (plans.length === 0) resolve(null);
            else resolve(plans.sort((a, b) => b.generated_at - a.generated_at)[0]);
        };
        getReq.onerror = () => reject(getReq.error);
    });
}

export async function getAllPlans() {
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const tx = db.transaction(STORES.PLANS, 'readonly');
        const getReq = tx.objectStore(STORES.PLANS).getAll();
        getReq.onsuccess = () => resolve(getReq.result || []);
        getReq.onerror = () => reject(getReq.error);
    });
}

export async function updatePlanStep(planId, stepId, changes, advisorOperatorHash) {
    if (!advisorOperatorHash) {
        throw new Error("Unauthorized: Solo asesores pueden editar planes");
    }

    const db = await openDB();
    return new Promise((resolve, reject) => {
        const tx = db.transaction(STORES.PLANS, 'readwrite');
        const store = tx.objectStore(STORES.PLANS);
        const getReq = store.get(planId);
        getReq.onsuccess = () => {
            const plan = getReq.result;
            if (!plan) return reject(new Error("Plan no encontrado"));

            const stepIdx = plan.steps.findIndex(s => s.id === stepId);
            if (stepIdx === -1) return reject(new Error("Step no encontrado"));

            plan.steps[stepIdx] = { ...plan.steps[stepIdx], ...changes };

            const putReq = store.put(plan);
            putReq.onsuccess = () => resolve(plan);
            putReq.onerror = () => reject(putReq.error);
        };
        getReq.onerror = () => reject(getReq.error);
    });
}

export async function markStepExecuted(planId, stepId, operatorIdHash = 'default-hash-00000000000000000000000000000000000000000000000000000') {
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const tx = db.transaction(STORES.PLANS, 'readwrite');
        const store = tx.objectStore(STORES.PLANS);
        const getReq = store.get(planId);
        getReq.onsuccess = async () => {
            const p = getReq.result;
            if (!p) return reject(new Error("Plan no encontrado"));

            const stepIdx = p.steps.findIndex(s => s.id === stepId);
            if (stepIdx === -1) return reject(new Error("Step no encontrado"));

            const step = p.steps[stepIdx];
            if (step.status === 'completed') return reject(new Error("Step ya completado"));

            p.steps[stepIdx].status = 'completed';

            // Update plan DB
            const putReq = store.put(p);
            putReq.onsuccess = async () => {
                // Create event
                try {
                    if (step.biofertilizer_slug && step.dose_ml) {
                        const evPayload = {
                            item_id: step.biofertilizer_slug,
                            delta: -Math.abs(step.dose_ml),
                            unit: 'ml',
                            application_log_ref: 'plan-execution'
                        };
                        const idempotencyKey = `plan-${planId}-step-${stepId}`;
                        const event = await createInventoryEvent(EVENT_TYPES.CONSUMED, evPayload, {
                            operator_id_hash: operatorIdHash,
                            idempotency_key: idempotencyKey,
                            notes: step.notes || step.action_type
                        });
                        await appendEvent(event);
                        // We attach the consumed event id to the step
                        p.steps[stepIdx].completed_event_id = event.id;
                        // Re-put to save the event id
                        const tx2 = db.transaction(STORES.PLANS, 'readwrite');
                        tx2.objectStore(STORES.PLANS).put(p);
                    }
                } catch (e) {
                    console.error("Failed to append event: ", e);
                }
                resolve(p);
            };
            putReq.onerror = () => reject(putReq.error);
        };
        getReq.onerror = () => reject(getReq.error);
    });
}
