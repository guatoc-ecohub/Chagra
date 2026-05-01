import { ulid } from 'ulid';
import { openDB, STORES } from '../db/dbCore.js';
import { appendEvent, getStock } from './inventoryService.js';
import { createInventoryEvent, EVENT_TYPES } from './inventoryEvents.js';

// Mapeo de companions/antagonists D6 (árboles) + D7 (microorganismos) a
// sugerencias accionables específicas que el operador puede aplicar al plan.
// Cada entry produce un suggestion step (no es step obligatorio del template,
// es enriquecimiento basado en relaciones documentadas en el catálogo v3.1).
//
// Razón: post catálogo v3.1 (60 sp) los entries D6/D7 venían como data orfana
// en companions/antagonists arrays — el plan los listaba pero sin acción
// concreta. Esta función traduce relaciones simbólicas en steps ejecutables.
const D6_D7_SUGGESTION_RECIPES = {
  // === D7 microorganismos benéficos (bioinsumos) ===
  trichoderma_harzianum: {
    type: 'biocontrol_suggestion',
    label: 'Aplicar Trichoderma harzianum al sustrato',
    note: 'Biofungicida preventivo contra Fusarium/Rhizoctonia/Pythium. Dosis: 5g/L agua. Aplicar al trasplante + cada 30-60 días en raíces.',
    timing: 'pre_planting_or_30d_intervals',
    cost_tier: 'low',
  },
  bacillus_subtilis: {
    type: 'biocontrol_suggestion',
    label: 'Aplicar Bacillus subtilis foliar',
    note: 'PGPR + fungicida foliar. Dosis: 5g/L agua, spray cada 15 días. Ideal para brassicas + solanáceas.',
    timing: '15d_intervals',
    cost_tier: 'low',
  },
  beauveria_bassiana: {
    type: 'biocontrol_suggestion',
    label: 'Aplicar Beauveria bassiana contra plagas',
    note: 'Insecticida biológico (broca, ácaros, áfidos). Dosis: 2g/L agua, spray foliar al detectar plaga o preventivo cada 21 días en frutales.',
    timing: 'on_pest_or_21d_intervals',
    cost_tier: 'medium',
  },
  eisenia_fetida: {
    type: 'amendment_suggestion',
    label: 'Aplicar humus de lombriz al sustrato',
    note: 'Fertilizante orgánico premium. Dosis: 200-500g/m² al trasplante + 100g cada 60 días. Vermicultura propia o adquirir Eisenia fetida.',
    timing: 'planting_and_60d_intervals',
    cost_tier: 'low',
  },
  pleurotus_ostreatus: {
    type: 'companion_crop_suggestion',
    label: 'Cultivo asociado: Pleurotus ostreatus bajo sombra',
    note: 'Hongo ostra cultivable en sustratos lignocelulósicos. Aprovechar sombra de árboles D6 cercanos. Ciclo 14-30 días.',
    timing: 'continuous',
    cost_tier: 'medium',
  },
  lentinula_edodes: {
    type: 'companion_crop_suggestion',
    label: 'Cultivo asociado: Shiitake en troncos',
    note: 'Adaptable Choachí piso medio-alto bajo techo. Cultivo en troncos de Quercus humboldtii (roble negro D6).',
    timing: 'continuous',
    cost_tier: 'medium',
  },
  // === D6 árboles (companion / antagonist agroforestal) ===
  aliso: {
    type: 'agroforestry_suggestion',
    label: 'Considerar Aliso (Alnus acuminata) cerca',
    note: 'Fija nitrógeno via Frankia + sombra rápida. Distancia recomendada: 5-8 m del cultivo. Companion universal para cereales/brassicas/frutales.',
    timing: 'long_term_planning',
    cost_tier: 'low',
  },
  cedro_andino: {
    type: 'agroforestry_warning',
    label: '⚠ Evitar plantar bajo Cedro andino (Cedrela montana)',
    note: 'Alelopatía documentada con cultivos de ciclo corto. Distancia mínima: 15 m. CITES II en peligro — proteger ejemplares existentes pero no asociar.',
    timing: 'planning_check',
    cost_tier: 'n/a',
  },
  encenillo: {
    type: 'agroforestry_suggestion',
    label: 'Asociación con Encenillo (Weinmannia tomentosa)',
    note: 'Páramo bajo dosel — favorece regeneración natural. Compatible con frailejón. Distancia: 8-10 m.',
    timing: 'long_term_planning',
    cost_tier: 'low',
  },
  // === D5 biopreparados (recetas en catalog) ===
  ortiga: {
    type: 'biopreparation_suggestion',
    label: 'Aplicar purín de ortiga (Urtica dioica)',
    note: 'Fertilizante + fungicida natural. Receta: 1 kg planta fresca en 10 L agua, fermentar 2 semanas, dilución 1:10 para abono foliar.',
    timing: '15d_intervals',
    cost_tier: 'minimal',
  },
  cola_de_caballo: {
    type: 'biopreparation_suggestion',
    label: 'Aplicar Cola de caballo preventivo',
    note: 'Fungicida natural (sílice). Receta: 100g planta seca en 1L agua, decocción 30min, dilución 1:5 spray preventivo botrytis/oídio cada 15 días.',
    timing: '15d_intervals',
    cost_tier: 'minimal',
  },
  calendula: {
    type: 'companion_crop_suggestion',
    label: 'Sembrar Caléndula como companion',
    note: 'Atrae polinizadores + repele nematodos del suelo. Companion universal. Receta floral: 100g flores frescas en 1L agua, infusión 24h, riego foliar.',
    timing: 'continuous',
    cost_tier: 'minimal',
  },
};

/**
 * Genera suggestion steps adicionales basados en companions/antagonists
 * documentados que tengan recetas en D6_D7_SUGGESTION_RECIPES.
 *
 * @param {object} speciesData - entry del catalog
 * @param {number} pDate - planting date timestamp
 * @returns {Array} suggestion steps con flag `is_suggestion: true`
 */
function enrichSuggestionsFromCompanions(speciesData, pDate) {
  const suggestions = [];
  const seen = new Set();

  // Companions: extract slugs (puede ser array de strings o objects con .id)
  const extractSlug = (entry) => typeof entry === 'string' ? entry : entry?.id;

  const companions = (speciesData.companions || []).map(extractSlug).filter(Boolean);
  const antagonists = (speciesData.antagonists || []).map(extractSlug).filter(Boolean);

  for (const slug of [...companions, ...antagonists]) {
    if (seen.has(slug)) continue;
    seen.add(slug);
    const recipe = D6_D7_SUGGESTION_RECIPES[slug];
    if (!recipe) continue;

    suggestions.push({
      id: ulid(),
      // Las suggestions no tienen scheduled_date fijo: se anclan al pDate +
      // 7 días (margen de revisión post-trasplante por parte del operador).
      scheduled_date: pDate + 7 * 86400000,
      action_type: recipe.type,
      label: recipe.label,
      notes: recipe.note,
      timing: recipe.timing,
      cost_tier: recipe.cost_tier,
      related_slug: slug,
      status: 'suggested',  // distinto de 'pending' del template — operador decide aplicar o ignorar
      is_suggestion: true,
    });
  }

  return suggestions;
}

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

    // Default to 'huerto_casero' or whichever has notes
    let scaleNotes = '';
    if (speciesData.manejo_por_escala) {
        // Try getting specific notes or first available
        scaleNotes = speciesData.manejo_por_escala.huerto_casero?.nota ||
            speciesData.manejo_por_escala.produccion?.nota || '';
    }

    const steps = await Promise.all(template.primary_steps.map(async (stepTpl) => {
        const stepId = ulid();
        let offset = stepTpl.offset_days || 0;

        // Modula frecuencia según climateZone
        if (climateZone === 'frio' || climateZone === 'paramo') offset = Math.round(offset * 1.2);
        if (climateZone === 'calido') offset = Math.round(offset * 0.8);

        // Considera lunarPhase (ejemplo: add 1-2 days based on phase)
        if (lunarPhase === 'creciente' || lunarPhase === 'llena') offset += 1;

        // Limita offsets inmensos
        // Para árboles de largo ciclo (D6), un offset puede exceder 3650 días
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

    // Enriquecer con sugerencias D5/D6/D7 (biopreparados + árboles
    // agroforestales + microorganismos benéficos). Estos NO son steps
    // obligatorios del template — son recomendaciones derivadas de
    // companions/antagonists del catálogo v3.1 que el operador puede
    // aceptar (cambia status a 'pending') o ignorar.
    const suggestions = enrichSuggestionsFromCompanions(speciesData, pDate);

    return await savePlan({
        id: planId,
        asset_id: assetId,
        species_slug: speciesSlug,
        generated_at: generatedAt,
        scale_notes: scaleNotes,
        companions: speciesData.companions || [],
        antagonists: speciesData.antagonists || [],
        steps,
        suggestions,
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
