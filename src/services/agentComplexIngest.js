/**
 * agentComplexIngest — descompone registros de campo con varias acciones.
 *
 * Esta primera ruta es deliberadamente determinista: reconoce únicamente un
 * vocabulario cerrado y devuelve propuestas para el gate humano. No consulta
 * el sidecar ni cambia datos por sí misma. Quien integra la UI pasa cada
 * propuesta a actionExecutor después de que el operador la confirme.
 */
import { toISODateTime } from '../utils/dateFormatter';

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
  const seeding = normalized.match(/sembr(?:e|é)\s+(\d+)\s+(tomate\s+cherry)\b/);
  const land = normalized.match(/(?:surco|lote)\s*(?:numero\s*)?(\d+)\b/);
  const monthsAgo = normalized.match(/hace\s+(\d+)\s+mes(?:es)?\b/);
  const harvest = normalized.match(/(?:entreg(?:ue|ué)|registr(?:e|é)|tuve)\s+(\d+|un|una|dos|tres|cuatro|cinco|seis|siete|ocho|nueve|diez)\s+cosechas?\b/);
  const cadence = normalized.match(/abon(?:e|é|o)\s+cada\s+(\d+)\s+dias?\b/);
  const problems = [
    normalized.includes('trozador') ? { name: 'trozador', problem_type: 'plaga' } : null,
    normalized.includes('gota') ? { name: 'gota', problem_type: 'enfermedad' } : null,
  ].filter(Boolean);

  if (!seeding || !land || !monthsAgo || !harvest || !cadence || problems.length !== 2) return null;

  const quantity = readNumber(seeding[1]);
  const harvestCount = readNumber(harvest[1]);
  const intervalDays = readNumber(cadence[1]);
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
      treatment_applied: true,
      treatment_status: 'incomplete',
      notes: `${problem.problem_type}: ${problem.name}. Tratamiento aplicado sin detalle.`,
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
 * @param {{operatorId:string, execute:(proposal:object, operatorId:string)=>Promise<object>}} options
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

/**
 * Deja la recomendación para una ruta secundaria. `suggest` puede usar el
 * grafo o el LLM, pero nunca participa en la ejecución de los registros.
 */
export function scheduleAgroecologicalSuggestion(plan, suggest) {
  if (!plan?.detected || typeof suggest !== 'function') return Promise.resolve(null);
  return Promise.resolve().then(() => suggest(plan.agroecologicalSuggestion));
}

export default decomposeComplexIngest;
