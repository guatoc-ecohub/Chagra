/**
 * agentNluFallback.js — router heurístico de GROUNDING para el path de FALLO del
 * NLU (#349).
 *
 * Contexto del bug (#349): cuando el planner `/nlu` del sidecar expira o falla,
 * `planNlu` devuelve null. Hoy ese caso degrada a "chat directo" — NO se invoca
 * ningún MCP tool, así que el LLM responde solo con el grounding ligero de
 * `resolveEntities` (binomio canónico) y, en el peor caso (sin entidad resuelta),
 * a generativo PURO sin consultar el grafo → alucinación máxima. El NLU planner
 * es justo el lever #1 de calidad; que muera no debería tirar abajo TODO el
 * grounding.
 *
 * Este módulo deriva, SIN red extra de NLU, el tool OBVIO que el turno necesita,
 * usando dos señales baratas que ya están disponibles cuando el NLU murió:
 *   1. Las ENTIDADES ya resueltas por `resolveEntities` (corre en paralelo, ANTES
 *      del planner — sobrevive aunque el planner expire). Una entidad canónica con
 *      `canonical_id` es la señal MÁS fuerte: el grafo ya la validó.
 *   2. KEYWORDS del mensaje crudo (plaga/control → controladores; biopreparado →
 *      recetas; resto → ficha de especie).
 *
 * Prioridad (de más fuerte a más débil):
 *   plaga resuelta > especie resuelta > keyword de plaga > keyword de biopreparado
 *   > get_species por defecto (query crudo).
 * La plaga gana a la especie porque una consulta que menciona ambas
 * ("qué le echo a la broca del café") es de CONTROL, no de ficha.
 *
 * PURO y SÍNCRONO: cero red, cero estado. El caller (AgentScreen) toma el plan y
 * lo ejecuta con `callTool(plan.tool, plan.args)` SOLO en el path donde `planNlu`
 * devolvió null. Si `callTool` falla, el turno sigue (igual que hoy) — pero al
 * menos lo INTENTAMOS en vez de saltarnos el grounding.
 *
 * Conservador por diseño: para una consulta agro real SIEMPRE devuelve un plan
 * (peor caso: get_species genérico). Devuelve null solo si el mensaje no es un
 * string útil (no hay nada que groundear).
 */

/**
 * ¿La consulta es de CONTROL de plaga? Señal para routear a get_pest_controllers.
 * Combina nombres/daño de plaga con pedido de control. Conservador: una sola
 * señal de plaga o daño basta (en el path de fallo preferimos intentar el tool de
 * controladores a quedarnos sin grounding). Sobre el texto en minúsculas.
 */
const PEST_KEYWORDS_RE =
  /\b(plaga[s]?|plagad[oa]|insecto[s]?|bicho[s]?|gusano[s]?|oruga[s]?|larva[s]?|pulg[oó]n(es)?|[aá]caro[s]?|trips|cogollero|broca|chiza|picudo|barrenador|mosca\s+(blanca|de\s+la\s+fruta|del)|chinche[s]?|nematodo[s]?|gorgojo[s]?|cochinilla[s]?|minador|hormiga\s+arriera|controlar(la|lo|las|los)?|control\s+de\s+plaga|me\s+(esta|estan|está|están)\s+acaba|me\s+(ataca|atacan)|se\s+(me\s+)?(comio|comió|comieron|esta\s+comiendo))\b/;

/**
 * ¿La consulta pide un BIOPREPARADO / receta orgánica? Señal para get_biopreparados.
 * Sobre el texto en minúsculas.
 */
const BIOPREP_KEYWORDS_RE =
  /\b(biopreparado[s]?|bioinsumo[s]?|caldo\s+(bordeles|sulfocalcico|de\s+ceniza)|purin(es)?|biol\b|extracto[s]?\s+vegetal|receta\s+(organica|casera)|preparado\s+casero|abono\s+organico|microorganismo[s]?\s+eficientes|jabon\s+potasico)\b/;

/**
 * Normaliza a minúsculas SIN tildes para el matching de keywords (replica el
 * criterio del resto del pipeline: campesino escribe con/sin tildes).
 */
function _norm(text) {
  return String(text)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, ''); // quita tildes (diacriticos combinantes)
}

/**
 * ¿La entidad es una plaga? (kind del sidecar). Tolerante a sinónimos español.
 */
function _isPest(e) {
  const kind = String(e?.kind || '').toLowerCase();
  return kind === 'pest' || kind === 'plaga';
}

/**
 * ¿La entidad es una especie vegetal/cultivo? (kind del sidecar).
 */
function _isSpecies(e) {
  const kind = String(e?.kind || '').toLowerCase();
  return kind === 'species' || kind === 'planta' || kind === 'especie' || kind === 'cultivo' || kind === '';
}

/**
 * Deriva un plan de tool OBVIO para el path de fallo del NLU.
 *
 * @param {string} userMessage — texto crudo del operador.
 * @param {Array<object>|null} [resolvedEntities] — entidades ya resueltas por
 *   `resolveEntities` (cada una puede traer { kind, canonical_id, nombre_comun }).
 * @returns {null | { tool: string, args: object, source: string }}
 *   null si el mensaje no es un string útil. En caso contrario, SIEMPRE un plan.
 *   `source` documenta qué señal disparó (telemetría / tests).
 */
export function planNluFallback(userMessage, resolvedEntities = null) {
  if (typeof userMessage !== 'string' || userMessage.trim().length === 0) {
    return null;
  }
  const query = userMessage.trim();
  const norm = _norm(query);
  const entities = Array.isArray(resolvedEntities) ? resolvedEntities : [];

  // (a) SEÑAL FUERTE — entidad ya resuelta por el grafo. La plaga gana a la
  // especie: si el campesino menciona una plaga resuelta, la consulta es de
  // control (queremos controladores), no la ficha del cultivo.
  const pestEntity = entities.find((e) => _isPest(e) && e.canonical_id);
  if (pestEntity) {
    return { tool: 'get_pest_controllers', args: { pest: pestEntity.canonical_id }, source: 'fallback_resolved_pest' };
  }
  const speciesEntity = entities.find((e) => _isSpecies(e) && e.canonical_id);
  if (speciesEntity) {
    return { tool: 'get_species', args: { id_or_name: speciesEntity.canonical_id }, source: 'fallback_resolved_species' };
  }

  // (b) HEURÍSTICA por keywords del mensaje crudo (sin entidad resuelta usable).
  if (PEST_KEYWORDS_RE.test(norm)) {
    return { tool: 'get_pest_controllers', args: { pest: query }, source: 'fallback_keyword_pest' };
  }
  if (BIOPREP_KEYWORDS_RE.test(norm)) {
    return { tool: 'get_biopreparados', args: { query }, source: 'fallback_keyword_biopreparado' };
  }

  // (c) DEFAULT — ficha de especie con el query crudo. Grounding genérico, pero
  // preferible a generativo puro: el sidecar resuelve el cultivo por nombre.
  return { tool: 'get_species', args: { query }, source: 'fallback_default_species' };
}

// Export interno para testabilidad de los regex sin reflectar la closure.
export const __TEST__ = { PEST_KEYWORDS_RE, BIOPREP_KEYWORDS_RE, _norm };
