/**
 * queryComplexityAnalyzer.js — Routing dinámico de modelo LLM según
 * complejidad de la query del agente Chagra IA.
 *
 * Contexto (según bench interno en GPU local):
 *  - Modelo "simple" configurado → más rápido pero confunde plagas
 *    regionales conocidas-confundibles (chiza vs larvas defoliadoras
 *    genéricas, monalonion vs Fusarium) y mete pifias taxonómicas en
 *    pasifloras (gulupa / curuba / chulupa).
 *  - Modelo "complex" configurado → más lento pero clavó "Monalonion
 *    velezangeli" sin pestañear en bench anti-alucinación.
 *
 * Estrategia: queries simples (atributo puntual, planta conocida sin
 * confundibles, manejo estándar) → modelo simple → respuesta rápida.
 * Queries complejas (plagas regionales, pasifloras confundibles, planes
 * multi-aspecto, queries largas) → modelo complex → vale la pena pagar
 * latencia para no alucinar.
 *
 * Diseño pure-function: el módulo no toca DOM, no hace I/O y no depende
 * de stores — sólo recibe el string de la query y devuelve un veredicto.
 * El callsite (AgentScreen.callLLM) lo combina con llmRouter para elegir
 * la ruta efectiva.
 */

/**
 * Plagas regionales colombianas que el modelo simple confunde en bench. La sola
 * mención de cualquiera de éstas dispara routing a modelo "complex" porque
 * el costo de equivocar el binomio (e.g. chiza → "Neolepidopteron daquila"
 * inventado) es peor que pagar 2× latencia.
 *
 * Glosario sincronizado con AgentScreen.getSystemPrompt y con el bloque
 * PEST_GLOSSARY de analyzeQuery (mismo archivo) — si se actualiza uno
 * actualizar los otros. Duplicación intencional: este módulo es runtime
 * routing, el otro es prompt enrichment; mezclarlos acoplaría el router
 * con React state.
 *
 * @type {string[]}
 */
const REGIONAL_PESTS = [
  'chiza',
  'monalonion',
  'rondón',
  'rondon',
  'chapola',
  'gota',
  'sigatoka',
  'broca',
  'roya',
  'antracnosis',
  'cogollero',
  'picudo',
];

/**
 * Plantas colombianas con alta tasa de confusión taxonómica observada en
 * bench interno. Pasifloras (gulupa/curuba/chulupa/badea) son el caso
 * clásico — el modelo intercambia familias y géneros con confianza alta.
 * Tubérculos andinos (cubio/oca/ulluco) y subutilizadas (chachafruto)
 * también disparan errores frecuentes.
 *
 * @type {string[]}
 */
const CONFUSABLE_PLANTS = [
  'gulupa',
  'curuba',
  'chulupa',
  'badea',
  'chachafruto',
  'cubio',
  'feijoa',
  'tomate de árbol',
  'tomate de arbol',
  'tomate de palo',
  'mashua',
  'ulluco',
  'oca',
  'arracacha',
  'chontaduro',
  'borojó',
  'borojo',
  'arazá',
  'araza',
  'copoazú',
  'copoazu',
  'camu camu',
];

/**
 * Triggers léxicos de queries multi-aspecto. Una "asocia X con Y" o
 * "plan de manejo integral para Z" requiere conectar varios nodos del
 * KG y reflexionar — el modelo simple tiende a saltar pasos o inventar relaciones
 * que el catálogo no documenta. Granite reflexiona mejor antes de
 * comprometer la respuesta.
 *
 * Estos triggers se buscan por substring porque son frases o lexemas
 * comunes en español con baja ambigüedad ("manejo integral" no aparece
 * en contextos no-routing; "asocia" matchea "asocia/asociar/asociado"
 * intencionalmente).
 *
 * @type {string[]}
 */
const COMPLEXITY_TRIGGERS = [
  'plan ',
  'asocia',
  'asocio',
  'asociar',
  'manejo integral',
  'qué tengo que aprender',
  'que tengo que aprender',
  'cómo paso de',
  'como paso de',
  'transición',
  'transicion',
  'sistema agroforestal',
  'rotación',
  'rotacion',
  'diseñar',
  'disenar',
  'diseñame',
  'disenale',
];

/**
 * Match con word-boundary (tokens completos). Usado para REGIONAL_PESTS
 * y CONFUSABLE_PLANTS porque términos como 'oca' o 'gota' como substring
 * matchearían "boca", "loca", "agota" y darían falsos positivos masivos.
 *
 * Implementación: dividimos `text` en tokens por whitespace + puntuación
 * común. Comparación exacta case-insensitive. Para términos multi-palabra
 * (e.g. "tomate de árbol", "broca del café") delegamos a substring
 * porque construir un tokenizador robusto sería desproporcionado para
 * el universo de inputs que vemos.
 *
 * @param {string} lower - Texto ya en lowercase.
 * @param {string} term  - Término a buscar, también en lowercase.
 * @returns {boolean}
 */
function matchesAsWord(lower, term) {
  if (term.includes(' ')) {
    // Multi-palabra: fallback a substring. Los términos multi-palabra
    // de los glosarios son lo bastante específicos como para no colisionar
    // con frases comunes ("tomate de árbol" no es prefijo de otra cosa).
    return lower.includes(term);
  }
  // Single token: regex con word-boundary. Escapamos caracteres especiales
  // de regex aunque los glosarios no los contienen — defensive.
  const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const re = new RegExp(`(^|[^\\p{L}\\p{N}])${escaped}([^\\p{L}\\p{N}]|$)`, 'u');
  return re.test(lower);
}

/**
 * Threshold de caracteres por encima del cual la query se considera
 * "compleja" por mero volumen. 200 chars ≈ 30-40 palabras = consulta
 * multi-cláusula o con mucho contexto del operador — ahí conviene el
 * modelo con mayor capacidad de razonamiento.
 *
 * @type {number}
 */
export const COMPLEX_QUERY_CHAR_THRESHOLD = 200;

/**
 * Analiza la complejidad de una query del operador para decidir routing
 * de modelo LLM.
 *
 * Heurísticas (orden de precedencia — primera que matchea gana):
 *  1. Query null/undefined/no-string → 'simple' (safe default; no romper
 *     el agente por un input degenerado).
 *  2. Longitud > COMPLEX_QUERY_CHAR_THRESHOLD chars → 'complex'.
 *  3. Contiene planta confundible del glosario → 'complex' (beneficio
 *     anti-alucinación > costo latencia).
 *  4. Contiene plaga regional conocida-confundible → 'complex'.
 *  5. Contiene trigger léxico multi-aspecto → 'complex'.
 *  6. Resto → 'simple'.
 *
 * @param {string} query - Texto de la query del usuario.
 * @returns {'simple'|'complex'} Veredicto de routing.
 */
export function analyzeQueryComplexity(query) {
  if (typeof query !== 'string') return 'simple';
  const trimmed = query.trim();
  if (trimmed.length === 0) return 'simple';

  // Longitud sobre el texto original — espacios incluidos sí cuentan
  // porque una query verbosa con conectores también suele ser multi-cláusula.
  if (query.length > COMPLEX_QUERY_CHAR_THRESHOLD) return 'complex';

  const lower = trimmed.toLowerCase();

  // CONFUSABLE_PLANTS y REGIONAL_PESTS usan word-boundary para evitar
  // que 'oca' matchee "boca/loca", 'gota' matchee "agota", etc.
  // COMPLEXITY_TRIGGERS son frases/lexemas suficientemente específicos
  // como para usar substring directo.
  if (CONFUSABLE_PLANTS.some((p) => matchesAsWord(lower, p))) return 'complex';
  if (REGIONAL_PESTS.some((p) => matchesAsWord(lower, p))) return 'complex';
  if (COMPLEXITY_TRIGGERS.some((t) => lower.includes(t))) return 'complex';

  return 'simple';
}

/**
 * Export adicional para tests / introspección. No usar en hot path —
 * para chequeos individuales usá `analyzeQueryComplexity`.
 */
export const __TEST_GLOSSARIES__ = {
  REGIONAL_PESTS,
  CONFUSABLE_PLANTS,
  COMPLEXITY_TRIGGERS,
};

export default analyzeQueryComplexity;
