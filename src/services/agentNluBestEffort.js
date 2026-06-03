/**
 * agentNluBestEffort.js — Lógica pura del routing NLU "best-effort" del agente.
 *
 * Contexto (bug prod 2026-06-02): el planner `/nlu` del sidecar tiene un prefill
 * conocido de ~9.5s. Con el timeout cliente viejo de 10s, una query agro legítima
 * abortaba justo en el borde → `planNlu` devolvía null → se perdía el routing de
 * herramientas. Peor: el caso `plan === null` era un fall-through SILENCIOSO en el
 * AgentScreen, indistinguible de "el planner decidió no usar tool". Eso dificultaba
 * diagnosticar y daba la impresión de que el turno "moría" sin razón.
 *
 * Este módulo concentra la DECISIÓN PURA de qué hacer con el resultado del planner,
 * con un invariante duro: **el NLU es opcional. Su ausencia NUNCA bloquea el turno.**
 * Pase lo que pase con `/nlu`, `proceedToChat` siempre es true — el AgentScreen sigue
 * a `callLLM` con el grounding que ya tiene (resolve-entities + system prompt +
 * guardas), solo SIN el routing de tools cuando el planner no respondió.
 *
 * Mantenerlo como función pura (sin React, sin red, sin DOM) lo hace testeable en
 * vitest mockeando el sidecar, y deja el AgentScreen delgado y auditable.
 */

/**
 * Outcomes posibles del routing del planner. Sirven para telemetría
 * (`console.debug`) y para que el caller sepa qué ejecutar a continuación.
 *
 * - `tool_chain`  → el planner pidió una cadena de tools (ejecutar executeToolChain).
 * - `single_tool` → el planner pidió un tool simple (ejecutar callTool).
 * - `no_tool`     → el planner respondió OK pero decidió no usar tool (chat directo).
 * - `degraded`    → el planner devolvió null (timeout/5xx/red/flag-off): chat directo.
 *                   Es el caso que ANTES era silencioso. NO es un error del turno.
 */
export const NLU_OUTCOME = Object.freeze({
  TOOL_CHAIN: 'tool_chain',
  SINGLE_TOOL: 'single_tool',
  NO_TOOL: 'no_tool',
  DEGRADED: 'degraded',
});

/**
 * Decide el routing a partir del resultado de `planNlu`.
 *
 * @param {null | {
 *   useTool?: boolean,
 *   tool?: string|null,
 *   args?: object|null,
 *   toolChain?: Array<{tool: string, args: object}>|null,
 *   reason?: string|null,
 * }} plan — el objeto que devuelve `planNlu` (o null en timeout/fail).
 * @returns {{
 *   outcome: 'tool_chain'|'single_tool'|'no_tool'|'degraded',
 *   proceedToChat: true,
 *   degraded: boolean,
 *   toolChain: Array<{tool: string, args: object}>|null,
 *   tool: string|null,
 *   args: object|null,
 *   reason: string|null,
 * }}
 *   `proceedToChat` es SIEMPRE true (invariante best-effort). `degraded` marca el
 *   caso `plan === null` para que el caller lo loguee como "caí a chat directo"
 *   (no como error). El resto de campos guían la ejecución de tools cuando aplica.
 */
export function decideNluRouting(plan) {
  // Caso degradado: el planner no devolvió nada utilizable (timeout sobre el
  // prefill ~9.5-14s, 5xx, red caída, flag off, offline). El turno NO muere:
  // seguimos a chat grounded directo SIN routing de tools.
  if (!plan || typeof plan !== 'object') {
    return {
      outcome: NLU_OUTCOME.DEGRADED,
      proceedToChat: true,
      degraded: true,
      toolChain: null,
      tool: null,
      args: null,
      reason: null,
    };
  }

  // Modo cadena (D2 #246): el planner pidió ejecutar varios tools en orden.
  if (plan.useTool && Array.isArray(plan.toolChain) && plan.toolChain.length > 0) {
    return {
      outcome: NLU_OUTCOME.TOOL_CHAIN,
      proceedToChat: true,
      degraded: false,
      toolChain: plan.toolChain,
      tool: null,
      args: null,
      reason: plan.reason || null,
    };
  }

  // Modo simple: el planner pidió un único tool con args.
  if (plan.useTool && plan.tool && plan.args) {
    return {
      outcome: NLU_OUTCOME.SINGLE_TOOL,
      proceedToChat: true,
      degraded: false,
      toolChain: null,
      tool: plan.tool,
      args: plan.args,
      reason: plan.reason || null,
    };
  }

  // El planner respondió OK pero decidió no usar tool (o le faltaban tool/args).
  // Chat directo, igual que el degradado, pero NO marcamos `degraded` porque el
  // planner SÍ respondió a tiempo: es una decisión deliberada, no una falla.
  return {
    outcome: NLU_OUTCOME.NO_TOOL,
    proceedToChat: true,
    degraded: false,
    toolChain: null,
    tool: null,
    args: null,
    reason: plan.reason || 'no_tool',
  };
}

export default decideNluRouting;
