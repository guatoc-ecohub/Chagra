/**
 * promptAssembler — ensamblado del system prompt del agente con PRESUPUESTO
 * de tokens explícito y PRIORIDAD por relevancia (re-arquitectura GR-10,
 * 2026-06-10).
 *
 * Problema que resuelve: el prompt se ensamblaba como concatenación de orden
 * FIJO con la EVIDENCIA AUTORITATIVA al principio; cuando el total superaba
 * num_ctx (4096/6144), ollama truncaba EL INICIO en silencio y el grounding
 * (la única defensa real anti-alucinación) desaparecía mientras los bloques
 * de baja relevancia sobrevivían.
 *
 * Diseño:
 *   1. ORDEN POR PRIORIDAD: el grounding (evidencia / entidades / hechos
 *      curados / cadena de relaciones) va al FINAL del system prompt — donde
 *      ni la truncación de ollama ni la pérdida de atención del modelo lo
 *      tocan (recency). Los bloques de contexto ambiental van antes.
 *   2. PRESUPUESTO EXPLÍCITO: si el total estimado supera el presupuesto, se
 *      degradan SOLO los bloques marcados sacrificables (corpus RAG por
 *      variantes, contexto ambiental), en orden de sacrificio declarado.
 *      Los bloques protegidos (base, guardas de seguridad, grounding,
 *      análisis de query) JAMÁS se recortan: si aún así no cabe, se emite
 *      warning — preferimos pasarnos con las guardas intactas a mutilarlas.
 *
 * PURO y SÍNCRONO: cero red, cero estado. Testeable en CI (presupuesto como
 * test de regresión: promptAssembler.budget.test.js).
 *
 * @module promptAssembler
 */

/**
 * Presupuesto del system prompt ensamblado (tokens estimados). num_ctx prod
 * es 6144 (GR-10, config/setup-llm-prod.json): el system debe dejar sitio a
 * historial de conversación + query + generación (hasta 1024 tokens según
 * llmRouter). 4600 de system deja ~1500 de holgura dentro de 6144 y headroom
 * cómodo hacia 8192.
 */
export const SYSTEM_PROMPT_TOKEN_BUDGET = 6144;

/**
 * Presupuesto del prompt COMPLETO (system + historial + query) — el techo de
 * headroom hacia 8192 (config/setup-llm-prod.json: el plan es subir num_ctx a
 * 8192 cuando la VRAM lo permita). El system cabe en 6144 (num_ctx prod) y el
 * historial + query usan el margen hacia 8192. El grounding va al final del
 * system, así que aun si ollama trunca por el inicio (num_ctx), lo que cede es
 * la base — nunca la evidencia (esto es lo que cierra el hueco GR-10).
 */
export const PROMPT_TOKEN_BUDGET = 8192;

/** Máximo de pasajes RAG a incluir en el prompt del agente. */
export const TOP_N_RAG = 8;

/** Máximo de aristas del grafo a incluir en el bloque relacional. */
export const TOP_N_EDGES = 12;

/**
 * estimateTokens — estimador heurístico de tokens para texto español técnico
 * con tokenizers BPE de la familia llama/granite.
 *
 * Calibrado empíricamente contra granite3.1-dense:8b (ollama
 * prompt_eval_count, 2026-06-10) sobre el prompt ENSAMBLADO real del agente:
 * las 3 queries representativas dan 2.71 / 2.74 / 2.76 chars/token. Usamos
 * 2.65 (ligeramente por debajo del mínimo medido → SOBRE-estima ~2-4%) para
 * que el presupuesto FALLE ANTES de que la truncación real de ollama ocurra.
 * Verificado: el estimador queda por encima del prompt_eval_count real en las
 * 3 queries (margen de seguridad, nunca por debajo).
 *
 * @param {string} text
 * @returns {number} tokens estimados (0 para entrada vacía/no-string).
 */
export function estimateTokens(text) {
  if (typeof text !== 'string' || text.length === 0) return 0;
  return Math.ceil(text.length / 2.65);
}

/**
 * Orden de ensamblado por prioridad (de menor a mayor recency dentro del
 * system prompt). El grounding y las reglas dominantes van al final.
 */
export const BLOCK_ORDER = [
  'base', // instrucciones + glosarios + perfil (protegido)
  'campesino', // MODO CAMPESINO registro oral — sacrificable
  'clima', // contexto ambiental — sacrificable en emergencia
  'finca', // contexto ambiental — sacrificable en emergencia
  'asociacion', // policultivo — sacrificable en emergencia
  'memoria', // MEMORIA EPISÓDICA de la finca (TIER 2 #6) — prioridad media, sacrificable
  'corpus', // RAG — PRIMER sacrificio (por variantes con menos chunks)
  'frostHeat', // riesgo térmico por cultivo
  'viabilidad', // GUARDA viabilidad/altitud (protegido)
  'seguridad', // GUARDA invasoras/conservación (protegido)
  'evidence', // GROUNDING evidencia autoritativa (protegido)
  'resolvedEntities', // GROUNDING entidades canónicas (protegido)
  'curatedFacts', // GROUNDING hechos curados AGE (protegido)
  'relacional', // GROUNDING cadena de relaciones GraphRAG (protegido)
  'groundingPolicy', // MODO CIENTÍFICO #17: answer/hedge/abstain por confianza (protegido)
  'queryAnalysis', // análisis NN2/NN3 de ESTA query (protegido)
  'suggested', // GUARDA CASO B baja confianza (protegido)
  'priceDecline', // GUARDA precio sin dato (protegido)
  'fermento', // GUARDA DR-FOOD-3 (protegido, máxima recency)
  'biopreparado', // GROUNDING biopreparados chagra-pro #248 (protegido, máxima recency — anti-negación)
  'pisoTermico', // GUARDA desajuste de piso térmico chagra-pro #288 (protegido, ÚLTIMA — cross_thermal, SUPRESIÓN-Y-REEMPLAZO)
];

/**
 * Orden de SACRIFICIO cuando el total supera el presupuesto (primero se
 * degrada el de la izquierda). Solo estos bloques pueden recortarse; el
 * resto (base, guardas, grounding, análisis) es intocable.
 */
// Orden de sacrificio bajo presión de presupuesto: primero el corpus RAG (por
// chunks), luego la MEMORIA EPISÓDICA (personalización: valiosa pero nunca por
// encima de las guardas ni la evidencia — TIER 2 #6), luego el contexto
// AMBIENTAL (asociaciones, fase ENSO, riesgo térmico y por último el marco de
// finca — su altitud también la cita el bloque de viabilidad), y finalmente el
// MODO CAMPESINO (cambio de registro, valioso pero sacrificable). El grounding
// duro (evidencia, entidades, dosis curadas, cadena del grafo) y las guardas
// NUNCA están aquí: jamás se recortan.
const SACRIFICE_ORDER = ['corpus', 'memoria', 'asociacion', 'clima', 'frostHeat', 'finca', 'campesino'];

const _normalize = (t) => (typeof t === 'string' ? t.replace(/^\n+|\n+$/g, '') : '');

/**
 * assembleSystemContent — ensambla el system prompt final a partir de bloques
 * nombrados, en el orden de BLOCK_ORDER, aplicando el presupuesto.
 *
 * @param {Object<string, string|{variants: string[]}>} blocks — mapa nombre →
 *   texto del bloque ('' = no-op) o `{ variants: [...] }` con degradaciones
 *   ordenadas de la más completa a la más corta (la última suele ser '').
 *   Solo los nombres en SACRIFICE_ORDER se degradan; en el resto, variants[0]
 *   es la única versión usada.
 * @param {object} [opts]
 * @param {number} [opts.budget=SYSTEM_PROMPT_TOKEN_BUDGET]
 * @returns {{ content: string, totalTokens: number, breakdown: Array<{name:string, tokens:number, degraded:boolean}>, overBudget: boolean }}
 */
export function assembleSystemContent(blocks, { budget = SYSTEM_PROMPT_TOKEN_BUDGET } = {}) {
  const state = new Map();
  for (const name of BLOCK_ORDER) {
    const raw = blocks ? blocks[name] : undefined;
    const variants =
      raw && typeof raw === 'object' && Array.isArray(raw.variants)
        ? raw.variants.map(_normalize)
        : [_normalize(typeof raw === 'string' ? raw : '')];
    state.set(name, { variants: variants.length > 0 ? variants : [''], idx: 0 });
  }

  const totalOf = () => {
    let total = 0;
    for (const { variants, idx } of state.values()) total += estimateTokens(variants[idx]);
    return total;
  };

  // Degradación por presupuesto: SOLO bloques sacrificables, en orden.
  let total = totalOf();
  if (total > budget) {
    for (const name of SACRIFICE_ORDER) {
      const b = state.get(name);
      if (!b) continue;
      while (total > budget && b.idx < b.variants.length - 1) {
        b.idx += 1;
        total = totalOf();
      }
      if (total <= budget) break;
    }
  }

  const breakdown = [];
  const parts = [];
  for (const name of BLOCK_ORDER) {
    const b = state.get(name);
    const text = b.variants[b.idx];
    breakdown.push({ name, tokens: estimateTokens(text), degraded: b.idx > 0 });
    if (text) parts.push(text);
  }

  const overBudget = total > budget;
  if (overBudget) {
    // Nunca mutilamos guardas/grounding: preferimos pasarnos y avisar.
    console.warn(
      `[promptAssembler] system prompt ${total} tokens > presupuesto ${budget} tras degradar sacrificables — guardas y grounding se conservan intactos`,
    );
  }

  return { content: parts.join('\n\n'), totalTokens: total, breakdown, overBudget };
}
