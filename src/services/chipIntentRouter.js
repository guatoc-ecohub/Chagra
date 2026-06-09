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
 * CHIP_INTENTS y CHIP_DEFS se importan de agentCapabilities.js (fuente única
 * de verdad). Este módulo NO redefine esas constantes.
 *
 * Tools determinísticos (ya existen en el sidecar, ver sidecarClient.ALLOWED_TOOLS):
 *   - siembro      → get_species          (ficha + viabilidad de la especie)
 *   - calendario   → get_species          (época de siembra se deriva de la ficha;
 *                                           NO existe get_calendario_siembra dedicado)
 *   - plaga        → get_pest_controllers  (controladores agroecológicos de la plaga)
 *   - biopreparado → get_biopreparados     (recetas de biopreparados)
 *   - clima        → get_clima_ideam       (IDEAM nacional; requiere municipio)
 *
 * Intents STUB (el backend aún NO existe — NO inventamos endpoints):
 *   - precio → SIPSA/DANE consulta directa no disponible (dataset ZIP federado).
 *   - deep   → investigación profunda multi-fuente sin pipeline implementado.
 *   Ambos devuelven un mensaje honesto "aún no disponible" en vez de routear
 *   a un tool fantasma.
 *
 * IMPORTANTE — español colombiano (tú/usted), NUNCA voseo argentino. Todos los
 * strings visibles al campesino se redactan en neutro colombiano.
 */

import { CHIP_INTENTS, CHIP_DEFS } from './agentCapabilities.js';
export { CHIP_INTENTS, CHIP_DEFS };

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
    case CHIP_INTENTS.calendario:
      // Ficha de especie. El calendario/época de siembra se deriva de la ficha
      // (no hay get_calendario_siembra dedicado en el sidecar). El grounding
      // trae piso térmico / ciclo y el LLM lo expone como época de siembra.
      return { ...base, tool: 'get_species', args: { query: prompt } };

    case CHIP_INTENTS.plaga:
      // Controladores agroecológicos de la plaga (AGE Cypher).
      return { ...base, tool: 'get_pest_controllers', args: { pest: prompt } };

    case CHIP_INTENTS.biopreparado:
      // Recetas de biopreparados del catálogo.
      return { ...base, tool: 'get_biopreparados', args: { query: prompt } };

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
      // STUB: backend no implementado. NO inventamos endpoint.
      return { ...base, stub: true, stubMessage: def.stubMessage };

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
