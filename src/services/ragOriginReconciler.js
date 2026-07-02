/**
 * ragOriginReconciler.js — etiquetado de ORIGEN y reconciliación Co ↔ NON-Co
 * de los pasajes RAG (#35).
 *
 * CONTEXTO (#34 → #35): tras ingerir DRs continentales (Oceanía, Sudamérica,
 * Asia, Europa, …) al grafo AGE, el sistema tiene conocimiento NO colombiano.
 * El agente NO debe presentar lo foráneo como práctica local validada en
 * Colombia. Este módulo:
 *
 *   1. ETIQUETA cada pasaje recuperado con su ORIGEN — usando SOLO señales
 *      estructuradas deterministas presentes en el pasaje/corpus. NUNCA
 *      infiere origen del texto libre (eso alucinaría país/continente).
 *   2. RECONCILIA: el contexto colombiano va PRIMERO; lo foráneo se presenta
 *      como complemento explícito y NUNCA mezclado como equivalente.
 *
 * ANTI-ALUCINACIÓN (innegociable):
 *   - Sin señal estructurada de origen → 'unknown'. JAMÁS se asume 'co'.
 *   - No se inventa país/continente: el bloque foráneo dice "en otros países
 *     / fuera de Colombia se reporta…" en términos genéricos salvo que el
 *     pasaje traiga un país/continente estructurado (campo `pais`/`continente`/
 *     `origin`). El LLM recibe la etiqueta, no una geografía inventada.
 *
 * FORMA del pasaje (lo que produce ragRetriever.retrieve):
 *   { species, text, key, score, ...extra }
 *
 * Este módulo es LÓGICA PURA (sin red, sin IndexedDB) salvo el lookup
 * opcional de `establishment_means`, que se pasa inyectado (no se importa
 * grafoRelations aquí para mantener la función testeable sin red).
 */

/** @typedef {'co'|'foreign'|'unknown'} OriginTag */

/**
 * Campos estructurados del pasaje que, si están presentes y con valor, marcan
 * ORIGEN colombiano validado. Derivados del corpus real (cycle-content):
 * - `diferenciador_colombiano`: contexto agronómico específico de Colombia.
 * - `convergencia_dr_034`: hecho proveniente del DR-034 (corpus base colombiano).
 * Si el pasaje proviene de uno de estos `key` paths, es contexto Co.
 */
const CO_KEY_MARKERS = ['diferenciador_colombiano', 'convergencia_dr_034', 'leccion_agroecologica'];

/**
 * Valores del campo estructurado `origin`/`origen` (si el pasaje lo trae,
 * típicamente desde el grafo AGE vía sidecar #34) que clasifican como foráneo.
 * Se mantiene como lista para extender sin tocar la lógica.
 */
const FOREIGN_ORIGIN_VALUES = new Set([
  'foreign', 'foraneo', 'foráneo', 'non-co', 'nonco', 'non_co',
  'internacional', 'extranjero', 'fuera-colombia',
]);

const CO_ORIGIN_VALUES = new Set([
  'co', 'colombia', 'colombiano', 'local', 'nacional',
]);

/**
 * Normaliza un valor de origen a minúsculas sin acentos para comparar.
 * @param {unknown} v
 * @returns {string}
 */
function normOrigin(v) {
  if (typeof v !== 'string') return '';
  return v.trim().toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
}

/**
 * Clasifica el ORIGEN de un pasaje RAG usando SOLO señales estructuradas.
 *
 * Precedencia (de más a menos autoritativa):
 *   1. Campo explícito `origin`/`origen`/`pais`/`continente` en el pasaje
 *      (lo aporta el grafo AGE #34 cuando exista). foreign vs co vs unknown.
 *   2. `key` del pasaje en un marcador Co estructurado del corpus.
 *   3. `establishmentMeans` inyectado (mapa species→'nativo'/'introducido'):
 *      'nativo' es señal DÉBIL de relevancia local → NO clasifica 'co' por sí
 *      solo (un introducido como el tomate es local en la práctica). Solo se
 *      usa para desempatar hacia 'unknown' explícito, nunca para inventar.
 *   4. Sin señal → 'unknown'. NUNCA 'co' por defecto.
 *
 * @param {object} passage — { species, text, key, origin?, origen?, pais?, continente? }
 * @param {object} [opts]
 * @param {Record<string,string>} [opts.establishmentMeans] - species→means (opcional, no usado para forzar co/foreign).
 * @returns {{ tag: OriginTag, label: string|null }} etiqueta + label geográfico
 *   estructurado SI existe (país/continente real del dato), o null.
 */
export function classifyPassageOrigin(passage, opts = {}) {
  if (!passage || typeof passage !== 'object') return { tag: 'unknown', label: null };

  // 1) Campo explícito de origen del dato (grafo AGE #34). Autoritativo.
  const rawOrigin = passage.origin ?? passage.origen ?? null;
  const pais = typeof passage.pais === 'string' ? passage.pais.trim() : null;
  const continente = typeof passage.continente === 'string' ? passage.continente.trim() : null;
  const label = pais || continente || null;

  const o = normOrigin(rawOrigin);
  if (o) {
    if (CO_ORIGIN_VALUES.has(o)) return { tag: 'co', label: null };
    if (FOREIGN_ORIGIN_VALUES.has(o)) return { tag: 'foreign', label };
  }
  // País/continente estructurado presente sin campo origin: clasifica por país.
  if (label) {
    const lp = normOrigin(label);
    if (CO_ORIGIN_VALUES.has(lp)) return { tag: 'co', label: null };
    // Cualquier otro país/continente estructurado = foráneo, con su label real.
    return { tag: 'foreign', label };
  }

  // 2) Marcador Co estructurado en el key del pasaje (corpus colombiano base).
  const key = typeof passage.key === 'string' ? passage.key : '';
  if (key && CO_KEY_MARKERS.some((m) => key.includes(m))) {
    return { tag: 'co', label: null };
  }

  // 3) establishment_means: señal demasiado débil para forzar clasificación.
  //    Se ignora a propósito (anti-alucinación: nativo≠"conocimiento Co",
  //    introducido≠"conocimiento foráneo"). Reservado para futura telemetría.
  void opts.establishmentMeans;

  // 4) Sin señal estructurada → desconocido. NUNCA se asume Colombia.
  return { tag: 'unknown', label: null };
}

/**
 * Etiqueta una lista de pasajes con su origen (no muta los originales).
 * @param {Array<object>} passages
 * @param {object} [opts] - ver classifyPassageOrigin.
 * @returns {Array<object>} pasajes con `_origin: OriginTag` y `_originLabel`.
 */
export function tagPassagesOrigin(passages, opts = {}) {
  if (!Array.isArray(passages)) return [];
  return passages.map((p) => {
    const { tag, label } = classifyPassageOrigin(p, opts);
    return { ...p, _origin: tag, _originLabel: label };
  });
}

/**
 * RECONCILIA pasajes Co ↔ NON-Co para presentarlos al LLM sin mezclarlos.
 *
 * Política (#35):
 *   - El contexto colombiano (`co`) y el de origen desconocido (`unknown`) van
 *     PRIMERO, como referencia principal. `unknown` se trata como referencia
 *     general (no se afirma que sea local NI que sea foránea).
 *   - Lo foráneo (`foreign`) se separa en un bloque APARTE marcado
 *     explícitamente, para que la respuesta lo presente como complemento
 *     ("en otros países se reporta…"), nunca como práctica local validada.
 *   - Si NO hay ningún pasaje co/unknown y SOLO hay foráneo, el bloque foráneo
 *     se conserva pero con la marca de que NO hay validación local (el LLM debe
 *     aclararlo). NO se descarta — sería peor no responder; pero se marca.
 *
 * Conserva el orden por score dentro de cada grupo (los pasajes ya vienen
 * ordenados por el retriever).
 *
 * @param {Array<object>} taggedPassages — salida de tagPassagesOrigin (o con `_origin`).
 * @returns {{
 *   local: Array<object>,        // co + unknown, en orden
 *   foreign: Array<object>,      // foreign, en orden
 *   onlyForeign: boolean,        // true si no hay nada local/unknown
 *   counts: { co:number, unknown:number, foreign:number }
 * }}
 */
export function reconcileOrigins(taggedPassages) {
  const list = Array.isArray(taggedPassages) ? taggedPassages : [];
  const counts = { co: 0, unknown: 0, foreign: 0 };
  const co = [];
  const unknown = [];
  const foreign = [];

  for (const p of list) {
    const tag = p && p._origin;
    if (tag === 'co') { co.push(p); counts.co += 1; }
    else if (tag === 'foreign') { foreign.push(p); counts.foreign += 1; }
    else { unknown.push(p); counts.unknown += 1; }
  }

  // Local = colombiano primero, luego desconocido (referencia general).
  const local = [...co, ...unknown];
  const onlyForeign = local.length === 0 && foreign.length > 0;

  return { local, foreign, onlyForeign, counts };
}

/**
 * Construye el SUFIJO de etiqueta de origen para un pasaje foráneo, usando SOLO
 * el label estructurado (país/continente) si existe. Sin label → genérico.
 * NUNCA inventa geografía.
 * @param {object} passage — con `_originLabel` opcional.
 * @returns {string} ej. " [origen: Asia]" o " [origen: fuera de Colombia]".
 */
export function foreignOriginSuffix(passage) {
  const label = passage && typeof passage._originLabel === 'string' ? passage._originLabel.trim() : '';
  return label ? ` [origen: ${label}]` : ' [origen: fuera de Colombia]';
}
