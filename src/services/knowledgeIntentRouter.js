/**
 * knowledgeIntentRouter.js — routing determinístico de intenciones de
 * CONOCIMIENTO del grafo (usos tradicionales / toxicidad / variedades / suelo).
 *
 * Por qué existe: el grafo de conocimiento tiene datos curados de usos
 * tradicionales documentados, perfil de toxicidad, variedades/cultivares
 * registrados (ICA/Cenicafé) y requerimientos de suelo/nutrición por especie,
 * pero el planner NLU (LLM pequeño) no siempre los enruta — "¿para qué sirve
 * la ruda?" caía a ficha genérica o a generativo puro. Este router replica el
 * patrón de `chipIntentRouter`/`agentNluFallback`: PURO, SÍNCRONO, cero red.
 * El caller (AgentScreen) ejecuta el plan con `callTool(plan.tool, plan.args)`
 * y la evidencia entra al bloque de grounding del system prompt (mismo
 * mecanismo `toolEvidence` → promptAssembler, presupuesto respetado).
 *
 * Doctrina (conservadora a propósito):
 *   - SOLO dispara si hay una ESPECIE ya resuelta por `resolveEntities`
 *     (canónica, validada contra el grafo). Sin ancla de especie, el matcher
 *     del sidecar no tiene a quién apuntar — dejamos que el NLU decida.
 *   - Si hay señal de PLAGA (entidad o keywords), las intenciones de saberes
 *     se inhiben: "qué remedio le echo a la broca" es CONTROL, no etnobotánica.
 *   - Prioridad: toxicidad > saberes > variedades > suelo. La seguridad
 *     (¿puedo comer esto?) domina sobre lo informativo.
 *   - CERO fabricación: si el grafo no tiene el dato, la tool devuelve
 *     found:false con una nota anti-invención y el agente responde neutral.
 */

/** ¿Pregunta por TOXICIDAD / comestibilidad? → get_toxicidad. */
const TOXICIDAD_RE =
  /\b(toxic[ao]s?|toxicidad|venenos[ao]s?|veneno|intoxicacion(es)?|envenenamiento|comestible[s]?)\b|puedo\s+comer|se\s+puede[n]?\s+comer|es\s+peligros[oa]\s+(comer|consumir)|parte[s]?\s+toxica/;

/** ¿Pregunta por USOS TRADICIONALES / medicinales? → get_saberes. */
const SABERES_RE =
  /para\s+que\s+(sirve|se\s+usa)|uso[s]?\s+(tradicional|medicinal|ancestral)\w*|propiedades\s+(medicinales|curativas)|planta\s+medicinal|remedio\s+(casero|tradicional|natural)|\bsahumerio[s]?\b|\binfusion\b/;

/** ¿Pregunta por VARIEDADES / cultivares? → get_variedades. */
const VARIEDADES_RE = /\bvariedad(es)?\b|\bcultivar(es)?\b/;

/** ¿Pregunta por SUELO / pH / nutrición? → get_suelo. */
const SUELO_RE =
  /\bph\b|que\s+suelo|suelo\s+(necesita|requiere|para|ideal)|deficiencia[s]?\b|\bencalar\b|plan\s+de\s+nutricion|como\s+abon(ar|o)\b/;

/**
 * Señal de PLAGA/CONTROL que inhibe el routing de saberes (la intención
 * dominante es control, no etnobotánica). Subconjunto conservador del regex
 * de `agentNluFallback`.
 */
const PLAGA_GUARD_RE =
  /\b(plaga[s]?|broca|roya|pulgon(es)?|trips|cogollero|mosca\s+blanca|picudo|barrenador|minador|nematodo[s]?|gusano[s]?|chinche[s]?|controlar|combatir|fumigar)\b|que\s+le\s+echo/;

/** Normaliza a minúsculas SIN tildes (criterio del resto del pipeline). */
function _norm(text) {
  return String(text)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, ''); // quita tildes (diacríticos combinantes)
}

function _isPest(e) {
  const kind = String(e?.kind || '').toLowerCase();
  return kind === 'pest' || kind === 'plaga';
}

function _isSpecies(e) {
  const kind = String(e?.kind || '').toLowerCase();
  return kind === 'species' || kind === 'planta' || kind === 'especie' || kind === 'cultivo';
}

/**
 * Deriva un plan determinístico { tool, args, source } para las intenciones de
 * conocimiento del grafo, o null si no hay señal clara (el NLU decide).
 *
 * @param {string} userMessage — texto crudo del usuario.
 * @param {Array<object>|null} [resolvedEntities] — entidades canónicas ya
 *   resueltas por `resolveEntities` ({ kind, canonical_id, mentioned, ... }).
 * @returns {null | { tool: string, args: { species_id_or_name: string }, source: string }}
 */
export function planKnowledgeIntent(userMessage, resolvedEntities = null) {
  if (typeof userMessage !== 'string' || userMessage.trim().length === 0) {
    return null;
  }
  const norm = _norm(userMessage);
  const entities = Array.isArray(resolvedEntities) ? resolvedEntities : [];

  // Ancla OBLIGATORIA: una especie canónica validada por el grafo. Sin ella no
  // disparamos (el matcher del sidecar no puede resolver la frase completa).
  const speciesEntity = entities.find(
    (e) => _isSpecies(e) && (e.canonical_id || e.mentioned),
  );
  if (!speciesEntity) return null;
  const anchor = speciesEntity.canonical_id || speciesEntity.mentioned;

  const hasPestSignal = entities.some(_isPest) || PLAGA_GUARD_RE.test(norm);

  // Prioridad: toxicidad (seguridad) > saberes > variedades > suelo.
  if (TOXICIDAD_RE.test(norm)) {
    return {
      tool: 'get_toxicidad',
      args: { species_id_or_name: anchor },
      source: 'knowledge_toxicidad',
    };
  }
  if (!hasPestSignal && SABERES_RE.test(norm)) {
    return {
      tool: 'get_saberes',
      args: { species_id_or_name: anchor },
      source: 'knowledge_saberes',
    };
  }
  if (VARIEDADES_RE.test(norm)) {
    return {
      tool: 'get_variedades',
      args: { species_id_or_name: anchor },
      source: 'knowledge_variedades',
    };
  }
  if (SUELO_RE.test(norm)) {
    return {
      tool: 'get_suelo',
      args: { species_id_or_name: anchor },
      source: 'knowledge_suelo',
    };
  }
  return null;
}

// Export interno para testabilidad de los regex.
export const __TEST__ = {
  TOXICIDAD_RE,
  SABERES_RE,
  VARIEDADES_RE,
  SUELO_RE,
  PLAGA_GUARD_RE,
  _norm,
};

/** Señal de DIAGNÓSTICO de suelo — descripción del terreno del campesino. */
const SUELO_DIAG_RE =
  /\b(tierra|suelo|terreno|lote|parcela)\b.*\b(amarilla|colorada|pegajosa|greda|chiclosa|empoza|encharca|barro|dura|piedra|pal[ií]n|rebota|cansad[ao]|flojita|negr[ao]|sueltica|se\s+lava|helecho|cortadera|coquito|lombriz|vinagre|bicarbonato|cal|encalar)\b|^\s*(m[ií]\s+tierra|la\s+tierra|el\s+suelo|el\s+lote)/i;

/**
 * Detecta si el mensaje del campesino describe su suelo (diagnóstico).
 * A diferencia de SUELO_RE (que busca requerimientos de suelo por especie),
 * esta detecta descripciones del terreno para activar diagnosticarSuelo().
 *
 * @param {string} userMessage
 * @returns {boolean}
 */
export function hasSoilDiagnosticIntent(userMessage) {
  if (typeof userMessage !== 'string' || userMessage.trim().length < 5) return false;
  const norm = _norm(userMessage);
  return SUELO_DIAG_RE.test(norm);
}

// ── Intenciones de los otros modulos DR (Task 4, audit ministerio) ──

const AGUA_DIAG_RE = /\b(lluvia|llueve|sequ[ií]a|quebrada|riego|regar|tanque|agua|capta[cç]|pozo|aljibe|nacimiento|reservorio|goteo|se\s+sec[oó])\b|no\s+llueve|falta\s+agua|agua\s+no\s+(me\s+)?alcanza|se\s+sec[oó]\s+la\s+quebrada|se\s+me\s+ahog[oó]/i;
export function hasWaterDiagnosticIntent(msg) { return typeof msg === 'string' && msg.trim().length >= 5 && AGUA_DIAG_RE.test(_norm(msg)); }

const ANIMAL_DIAG_RE = /\b(vacas?|novillas?|toro|gallinas?|ponedoras?|pollos?|cabras?|chivos?|ovejas?|corderos?|marranos?|cochina|lech[oó]n|conejos?|abejas?|angelitas?|colmenas?|caballo|mula|bestia|yunta|forraje|banco\s+de\s+prote[ií]na|leucaena)\b|qu[eé]\s+les?\s+doy\s+de\s+comer/i;
export function hasAnimalDiagnosticIntent(msg) { return typeof msg === 'string' && msg.trim().length >= 5 && ANIMAL_DIAG_RE.test(_norm(msg)); }

const RESTAURACION_DIAG_RE = /\b(restaura[cç]|reforesta[cç]|recuperar\s+(el\s+)?(monte|bosque)|p[aá]ramo|frailej[oó]n|sucesi[oó]n\s+ecol[oó]gica|corredor\s+ripario|cerca\s+viva|arbol(es)?\s+nativ[oa]s?|especies?\s+nativ[oa]s?)\b|proteger\s+(el\s+)?nacimiento|controlar\s+(la\s+)?erosion/i;
export function hasRestauracionDiagnosticIntent(msg) { return typeof msg === 'string' && msg.trim().length >= 5 && RESTAURACION_DIAG_RE.test(_norm(msg)); }

/**
 * Señal de RIESGO DE INCENDIO (estacional). Distinta de la restauración
 * post-incendio: aquí el campesino pregunta si su zona ESTÁ en riesgo /
 * temporada de incendios, no cómo recuperar un sitio ya quemado.
 *   - matchea: "riesgo de incendio", "temporada de incendios", "alerta de
 *     incendio", "se va a quemar", "época de quemas", "peligro de fuego".
 *   - NO matchea: "restaurar después del incendio" / "sitio quemado" (eso es
 *     restauración → su propio matcher arriba). La co-ocurrencia de un término
 *     de riesgo/temporada con uno de fuego/quema desambigua.
 */
const INCENDIO_RIESGO_RE =
  /\b(riesgo|peligro|temporada|epoca|alerta|amenaza)\b[^.?!]*\b(incendio|incendios|quema[rs]?|fuego|conato)\b|\b(incendio|incendios|quema[rs]?|fuego)\b[^.?!]*\b(riesgo|peligro|temporada|epoca|alerta|amenaza)\b|se\s+(va|puede|pueden)\s+(a\s+)?quemar|epoca\s+de\s+quemas|estamos\s+en\s+(epoca|temporada)\s+seca/i;
/**
 * Detecta si el mensaje pregunta por riesgo/temporada de incendio (para
 * activar incendioRiskService). Conservador: requiere co-ocurrencia de un
 * término de riesgo/temporada con uno de fuego/quema.
 *
 * @param {string} msg
 * @returns {boolean}
 */
export function hasIncendioRiskIntent(msg) {
  return typeof msg === 'string' && msg.trim().length >= 5 && INCENDIO_RIESGO_RE.test(_norm(msg));
}
