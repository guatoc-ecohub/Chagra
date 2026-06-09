/**
 * chipIntentRouter.js — Router PURO de los CHIPS DE MODO (A3/A4).
 *
 * Decisión operador 2026-06-02: la "caja de herramientas" del agente se
 * expone como chips de modo (estilo Gemini). Al tocar un chip, la intención
 * queda FORZADA y rutea DIRECTO a la capacidad determinística (un MCP tool
 * concreto), SALTANDO el NLU planner del sidecar.
 *
 * Racional: el NLU es el que misroutea (incidente "papa precio": el planner
 * mandaba una pregunta de precio al tool de precio cuando el usuario quería
 * la ficha de la papa, y viceversa). Si el usuario YA declaró su intención
 * tocando un chip, no hay nada que inferir — vamos directo al tool.
 *
 * Este módulo es PURO (sin red, sin React): mapea (intent, texto, opts) a un
 * "plan forzado" que el AgentScreen ejecuta sin pasar por `planNlu()`. Toda la
 * lógica de routing vive acá para poder testearla en aislamiento (TDD).
 *
 * Enum de intención: { siembro, plaga, biopreparado, clima, precio,
 *                      calendario, deep }.
 *
 * Tools determinísticos (ya existen en el sidecar, ver sidecarClient.ALLOWED_TOOLS):
 *   - siembro      → get_species          (ficha + viabilidad de la especie)
 *   - calendario   → get_calendario_siembra
 *   - plaga        → get_pest_controllers  (controladores agroecológicos de la plaga)
 *   - biopreparado → get_biopreparados     (recetas de biopreparados)
 *   - clima        → get_clima_ideam       (IDEAM nacional; requiere municipio)
 *
 * IMPORTANTE — español colombiano (tú/usted), NUNCA voseo argentino. Todos los
 * strings visibles al campesino se redactan en neutro colombiano.
 */
import { MODE_CAPABILITIES } from './agentCapabilities.js';

/** Enum de intención de los chips. Las claves == valores (string union). */
export const CHIP_INTENTS = Object.freeze({
  siembro: 'siembro',
  plaga: 'plaga',
  biopreparado: 'biopreparado',
  clima: 'clima',
  precio: 'precio',
  calendario: 'calendario',
  deep: 'deep',
});

/**
 * Definiciones declarativas de los 7 chips. El orden de este array es el orden
 * de render en la barra. `placeholder` reemplaza el placeholder del input
 * cuando el modo está activo, para guiar al campesino sobre qué escribir.
 *
 * `kind`:
 *   - 'mode' → rutea a un tool determinístico (planForcedIntent.tool).
 *   - 'deep' → flujo dedicado de investigación profunda.
 */
export const CHIP_DEFS = MODE_CAPABILITIES;

const DEF_BY_INTENT = Object.freeze(
  CHIP_DEFS.reduce((acc, def) => {
    acc[def.intent] = def;
    return acc;
  }, {}),
);

/**
 * ¿Este intent es un STUB (backend no implementado)?
 * Devuelve false para 'deep' — Deep Research ya tiene backend live.
 * @param {string} intent
 * @returns {boolean}
 */
export function isStubIntent(intent) {
  const def = DEF_BY_INTENT[intent];
  return Boolean(def && def.kind === 'stub');
}

/**
 * ¿Este intent es Deep Research?
 * Permite al AgentScreen interceptar el flujo ANTES del stub-check y del
 * pipeline NLU/tool, lanzando el job async de deep research.
 * @param {string} intent
 * @returns {boolean}
 */
export function isDeepResearchIntent(intent) {
  const def = DEF_BY_INTENT[intent];
  return Boolean(def && def.kind === 'deep');
}

/**
 * Mapea un chip (intención forzada) + texto del usuario a un plan
 * determinístico que el AgentScreen ejecuta SIN pasar por el NLU.
 *
 * @param {string} intent — uno de CHIP_INTENTS.
 * @param {string} text — texto crudo del usuario (lo que escribió en el input).
 * @param {object} [opts]
 * @param {string|null} [opts.municipio] — municipio de la finca activa (para clima).
 * @param {string|null} [opts.pisoTermico] — frio|templado|calido (para calendario).
 * @returns {null | {
 *   intent: string,
 *   tool: string | null,        // tool determinístico, o null si stub
 *   args: object | null,        // args del tool (forma específica por tool)
 *   stub: boolean,              // true → no hay tool real
 *   stubResult: object | null,  // evidence sintética inyectable (ej. clima no_municipio)
 *   stubMessage: string | null, // mensaje honesto "aún no disponible" para el usuario
 *   prompt: string,             // texto del usuario trimmeado (lo que se manda al LLM/burbuja)
 *   skipNlu: true,              // SIEMPRE true: el chip salta el NLU planner
 * }}
 */
export function planForcedIntent(intent, text, opts = {}) {
  const def = DEF_BY_INTENT[intent];
  if (!def) return null;
  if (typeof text !== 'string') return null;
  const prompt = text.trim();
  if (!prompt) return null;

  const base = {
    intent,
    tool: null,
    args: null,
    stub: false,
    stubResult: null,
    stubMessage: null,
    prompt,
    skipNlu: true,
  };

  switch (intent) {
    case CHIP_INTENTS.siembro:
      return { ...base, tool: 'get_species', args: { id_or_name: prompt } };

    case CHIP_INTENTS.plaga:
      // Controladores agroecológicos de la plaga (AGE Cypher).
      return { ...base, tool: 'get_pest_controllers', args: { pest_id_or_name: prompt } };

    case CHIP_INTENTS.biopreparado:
      // Recetas de biopreparados del catálogo.
      return { ...base, tool: 'get_biopreparados', args: { species_id_or_pest: prompt } };

    case CHIP_INTENTS.clima: {
      const municipio =
        typeof opts.municipio === 'string' && opts.municipio.trim()
          ? opts.municipio.trim()
          : null;
      if (!municipio) {
        // Sin municipio NO llamamos el tool: inyectamos evidence sintética
        // que obliga al LLM a PEDIR el municipio (NO inventar datos de IDEAM).
        // Mismo contrato que la heurística de clima existente en AgentScreen.
        return {
          ...base,
          tool: 'get_clima_ideam',
          args: { action: 'monthly_avg' },
          stub: true,
          stubResult: {
            available: false,
            reason: 'no_municipio',
            hint: 'pedirle al usuario su municipio para consultar IDEAM',
          },
        };
      }
      const desde = isoDaysAgo(30);
      return {
        ...base,
        tool: 'get_clima_ideam',
        args: { action: 'monthly_avg', municipio, metric: 'precipitation', desde },
      };
    }

    case CHIP_INTENTS.precio:
      return {
        ...base,
        tool: 'get_precio_sipsa',
        args: { action: 'latest_price', producto: prompt },
      };

    case CHIP_INTENTS.calendario: {
      const piso = normalizePisoTermico(opts.pisoTermico);
      if (!piso) {
        return {
          ...base,
          tool: 'get_calendario_siembra',
          args: {},
          stub: true,
          stubResult: {
            available: false,
            reason: 'no_piso_termico',
            hint: 'pedir la altitud de la finca para calcular el piso térmico',
          },
        };
      }
      return {
        ...base,
        tool: 'get_calendario_siembra',
        args: { piso_termico: piso },
      };
    }

    case CHIP_INTENTS.deep:
      // Deep Research: el backend está live (POST /deep-research → GET /deep-research/:id).
      // Devolvemos el plan con kind='deep' para que AgentScreen lo intercepte
      // ANTES del flujo NLU/tool y lance el job async. El caller (AgentScreen)
      // gestiona el polling y actualiza el card en el historial de chat.
      return { ...base, deep: true };

    default:
      return null;
  }
}

/**
 * Fecha ISO (YYYY-MM-DD) de hace N días. Aislado para testabilidad y para no
 * acoplar el router a Date.now() en el switch.
 * @param {number} days
 * @returns {string}
 */
function isoDaysAgo(days) {
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000)
    .toISOString()
    .slice(0, 10);
}

function normalizePisoTermico(value) {
  if (typeof value !== 'string') return null;
  const normalized = value.trim().toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
  if (normalized === 'frio' || normalized === 'paramo') return 'frio';
  if (normalized === 'templado') return 'templado';
  if (normalized === 'calido') return 'calido';
  return null;
}
