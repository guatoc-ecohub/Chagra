/**
 * agentComplexIngest — descompone registros de campo con varias acciones.
 *
 * Esta primera ruta es deliberadamente determinista: reconoce únicamente un
 * vocabulario cerrado y devuelve propuestas para el gate humano. No consulta
 * el sidecar ni cambia datos por sí misma. Quien integra la UI pasa cada
 * propuesta a actionExecutor después de que el operador la confirme.
 */
import { toISODateTime } from '../utils/dateFormatter';
import { createLote } from './loteService';
import { createFarmProcess, recordFarmEvent } from './farmEventService';
import { newUlid } from '../utils/id';

const NUMBER_WORDS = {
  un: 1,
  una: 1,
  dos: 2,
  tres: 3,
  cuatro: 4,
  cinco: 5,
  seis: 6,
  siete: 7,
  ocho: 8,
  nueve: 9,
  diez: 10,
};

const TREATMENT_FOLLOW_UP = '¿quieres contarme qué tratamiento seguiste para trozador y gota?';

const normalizeText = (value) => String(value || '')
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .toLowerCase();

const readNumber = (value) => {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : NUMBER_WORDS[normalizeText(value)] || null;
};

/** Resta meses de calendario sin asumir que todos duran 30 días. */
function subtractCalendarMonths(date, months) {
  const input = new Date(date);
  const originalDay = input.getUTCDate();
  input.setUTCDate(1);
  input.setUTCMonth(input.getUTCMonth() - months);
  const lastDay = new Date(Date.UTC(input.getUTCFullYear(), input.getUTCMonth() + 1, 0)).getUTCDate();
  input.setUTCDate(Math.min(originalDay, lastDay));
  return input;
}

function makeOperation(kind, toolName, parameters, originalText) {
  return {
    kind,
    tool_name: toolName,
    parameters,
    requiresConfirmation: true,
    proposal: {
      tool_name: toolName,
      parameters,
      operation_kind: kind,
      intent: originalText,
      llm_response: '',
      timestamp: new Date().toISOString(),
    },
  };
}

function extractCaseOne(text, now) {
  const normalized = normalizeText(text);
  const seeding = normalized.match(/sembr(?:e|o|amos|ar)\s+(\d+)\s+(tomate\s+cherry)\b/);
  const land = normalized.match(/(?:surco|lote)\s*(?:numero\s*)?(\d+)\b/);
  const monthsAgo = normalized.match(/hace\s+(\d+)\s+mes(?:es)?\b/);
  const harvest = normalized.match(/(?:entreg(?:ue|o)|registr(?:e|o)|tuve\s+|ya\s+)?(\d+|un|una|dos|tres|cuatro|cinco|seis|siete|ocho|nueve|diez)\s+cosechas?\b/);
  const cadence = normalized.match(/(?:abon(?:e|o)?\s+(?:cada\s+)?(\d+)\s+dias?|abono\s+c\s*\/\s*(\d+)\s*d(?:ias?)?)\b/);
  const treatmentMentioned = /trat(?:e|o|amos|amiento)|apliqu|fumigu|fumig|control(?:e|o)/.test(normalized);
  const problems = [
    normalized.includes('trozador') ? { name: 'trozador', problem_type: 'plaga' } : null,
    normalized.includes('gota') ? { name: 'gota', problem_type: 'enfermedad' } : null,
  ].filter(Boolean);

  if (!seeding || !land || !monthsAgo || !harvest || !cadence || problems.length !== 2) return null;

  const quantity = readNumber(seeding[1]);
  const harvestCount = readNumber(harvest[1]);
  const intervalDays = readNumber(cadence[1] || cadence[2]);
  const months = readNumber(monthsAgo[1]);
  if (!quantity || !harvestCount || !intervalDays || !months) return null;

  return {
    crop: seeding[2],
    quantity,
    landReference: land[1],
    seedingTimestamp: toISODateTime(subtractCalendarMonths(now, months)),
    harvestCount,
    intervalDays,
    problems,
    treatmentMentioned,
  };
}

/**
 * Detecta el Caso 1 y produce el plan confirmado de operaciones. El contrato
 * es estable para que AgentScreen lo pueda consultar ANTES del pipeline LLM.
 *
 * @param {string} text
 * @param {{now?: Date|number|string}} [options]
 * @returns {{detected:false}|{detected:true, requiresConfirmation:true, operations:object[], followUpQuestion:string, agroecologicalSuggestion:object}}
 */
export function decomposeComplexIngest(text, options = {}) {
  if (!text || typeof text !== 'string') return { detected: false };

  const extracted = extractCaseOne(text, options.now || new Date());
  if (!extracted) return { detected: false };

  const operations = [
    makeOperation('ensure_land', 'crear_lote', {
      name: `Surco ${extracted.landReference}`,
      land_type: 'bed',
      reference: extracted.landReference,
    }, text),
    makeOperation('create_seeding', 'registrar_siembra', {
      crop: extracted.crop,
      quantity: extracted.quantity,
      land_reference: extracted.landReference,
      timestamp: extracted.seedingTimestamp,
    }, text),
    ...Array.from({ length: extracted.harvestCount }, (_, index) => makeOperation('register_harvest', 'crear_log', {
      log_type: 'log--harvest',
      land_reference: extracted.landReference,
      ordinal: index + 1,
      notes: `Cosecha histórica ${index + 1} de ${extracted.harvestCount} del surco ${extracted.landReference}`,
    }, text)),
    makeOperation('register_fertilizer_cadence', 'crear_log', {
      log_type: 'log--input',
      land_reference: extracted.landReference,
      interval_days: extracted.intervalDays,
      notes: `Abono registrado cada ${extracted.intervalDays} días en el surco ${extracted.landReference}`,
    }, text),
    ...extracted.problems.map((problem) => makeOperation('register_problem', 'crear_log', {
      log_type: 'log--observation',
      land_reference: extracted.landReference,
      ...problem,
      treatment_applied: extracted.treatmentMentioned,
      treatment_status: extracted.treatmentMentioned ? 'incomplete' : 'missing',
      notes: extracted.treatmentMentioned
        ? `${problem.problem_type}: ${problem.name}. Se mencionó tratamiento, sin detalle.`
        : `${problem.problem_type}: ${problem.name}. No se informó tratamiento.`,
    }, text)),
  ];

  return {
    detected: true,
    requiresConfirmation: true,
    operations,
    followUpQuestion: TREATMENT_FOLLOW_UP,
    agroecologicalSuggestion: {
      crop: extracted.crop,
      problems: extracted.problems,
      land_reference: extracted.landReference,
    },
  };
}

/**
 * Ejecuta secuencialmente propuestas ya confirmadas a través del executor
 * existente. La UI conserva el gate porque cada propuesta lleva la marca de
 * confirmación y `executeAction` abre el modal para sus herramientas write.
 *
 * @param {ReturnType<typeof decomposeComplexIngest>} plan
 * @param {{operatorId?:string, execute?:(proposal:object, operatorId:string)=>Promise<object>}} [options]
 */
export async function executeComplexIngest(plan, { operatorId, execute } = {}) {
  if (!plan?.detected || !Array.isArray(plan.operations)) {
    return { status: 'ignored', executed: 0, failed: 0, results: [] };
  }
  if (typeof execute !== 'function') throw new TypeError('executeComplexIngest requiere un executor');

  const results = [];
  for (const operation of plan.operations) {
    const result = await execute(operation.proposal, operatorId);
    results.push({ operation, result });
    // No continuar con operaciones que dependen del mismo lote si el
    // operador rechazó o el executor no logró ejecutar una propuesta.
    if (result?.status !== 'executed') break;
  }

  const failed = results.filter(({ result }) => result?.status === 'failed').length;
  const rejected = results.filter(({ result }) => result?.status === 'rejected').length;
  return {
    status: failed || rejected ? 'partial' : 'executed',
    executed: results.filter(({ result }) => result?.status === 'executed').length,
    failed,
    rejected,
    results,
  };
}

const EVENT_SOURCE = 'operator';
const AI_METADATA = {
  source: 'agent-complex-ingest',
  model_version: 'deterministic-rules-v1',
  confidence: 1,
  needs_human_review: false,
};

/**
 * Persiste una ingesta ya aprobada usando las puertas de escritura existentes.
 * La función mantiene el contexto generado por la operación de lote y no muta
 * ningún Asset directamente: el lote pasa por createLote y el ciclo/eventos por
 * createFarmProcess y recordFarmEvent.
 *
 * @param {ReturnType<typeof decomposeComplexIngest>} plan
 * @param {{operatorId?: string, now?: number}} [options]
 * @returns {Promise<{status:string, executed:number, failed:number, results:object[], processId?:string, landId?:string}>}
 */
export async function persistComplexIngest(plan, { operatorId = 'operator', now = Date.now() } = {}) {
  if (!plan?.detected || !Array.isArray(plan.operations)) {
    return { status: 'ignored', executed: 0, failed: 0, results: [] };
  }

  const context = { landId: null, processId: null };
  const results = [];
  for (const operation of plan.operations) {
    try {
      let result;
      const params = operation.parameters || {};
      if (operation.kind === 'ensure_land') {
        result = await createLote({ name: params.name, landType: params.land_type || 'bed' });
        context.landId = result.id;
      } else if (operation.kind === 'create_seeding') {
        const process = {
          process_id: newUlid(),
          type: 'farm_process',
          attributes: {
            process_type: 'sowing',
            subject_kind: 'aggregate',
            subject_slug: 'solanum_lycopersicum',
            subject_label: params.crop,
            quantity: params.quantity,
            unit: 'plantas',
            location_land_asset_id: context.landId,
            status: 'active',
            current_stage: 'sowing_confirmed',
            created_at: Date.parse(params.timestamp) || now,
            updated_at: now,
          },
        };
        const created = await createFarmProcess(process, { awaitSync: true });
        context.processId = process.process_id;
        result = created;
      } else if (!context.processId) {
        throw new Error(`No hay ciclo para la operación ${operation.kind}`);
      } else if (operation.kind === 'register_harvest') {
        result = await recordFarmEvent({
          process_id: context.processId,
          event_type: 'harvest_confirmed',
          occurred_at: now,
          actor: operatorId,
          source: EVENT_SOURCE,
          idempotency_key: `complex:${context.processId}:harvest:${params.ordinal}`,
          payload: { ordinal: params.ordinal, land_reference: params.land_reference },
          await_sync: true,
        });
      } else if (operation.kind === 'register_fertilizer_cadence') {
        result = await recordFarmEvent({
          process_id: context.processId,
          event_type: 'task_completed',
          occurred_at: now,
          actor: operatorId,
          source: EVENT_SOURCE,
          idempotency_key: `complex:${context.processId}:fertilizer:${params.interval_days}`,
          payload: {
            completed_task: 'abono',
            interval_days: params.interval_days,
            land_reference: params.land_reference,
            text: params.notes,
          },
          await_sync: true,
        });
      } else if (operation.kind === 'register_problem') {
        result = await recordFarmEvent({
          process_id: context.processId,
          event_type: 'observation',
          occurred_at: now,
          actor: operatorId,
          source: EVENT_SOURCE,
          idempotency_key: `complex:${context.processId}:problem:${params.name}`,
          payload: {
            text: params.notes,
            problem_type: params.problem_type,
            name: params.name,
            treatment_applied: params.treatment_applied,
            treatment_status: params.treatment_status,
            land_reference: params.land_reference,
            metadata: { ai: { ...AI_METADATA, reasoning: 'clasificación por término explícito del operador' } },
          },
          await_sync: true,
        });
      } else {
        throw new Error(`Operación no soportada: ${operation.kind}`);
      }
      results.push({ operation, result, status: 'executed' });
    } catch (error) {
      results.push({ operation, status: 'failed', error: error?.message || 'fallo de persistencia' });
      break;
    }
  }

  const failed = results.filter((item) => item.status === 'failed').length;
  return {
    status: failed ? 'partial' : 'executed',
    executed: results.filter((item) => item.status === 'executed').length,
    failed,
    results,
    ...(context.processId ? { processId: context.processId } : {}),
    ...(context.landId ? { landId: context.landId } : {}),
  };
}

/**
 * Deja la recomendación para una ruta secundaria. `suggest` puede usar el
 * grafo o el LLM, pero nunca participa en la ejecución de los registros.
 */
export function scheduleAgroecologicalSuggestion(plan, suggest) {
  if (!plan?.detected || typeof suggest !== 'function') return Promise.resolve(null);
  return Promise.resolve().then(() => suggest(plan.agroecologicalSuggestion));
}

export default decomposeComplexIngest;
