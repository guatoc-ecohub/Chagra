/**
 * bench-pool-facts.mjs — extractores PUROS de "hechos evaluables" del grafo para
 * el pool de capacidades (gen-bench-capabilities-pool.mjs).
 *
 * MOTIVACIÓN (recalibración 2026-06-03): el pool viejo metía en `must_include` de
 * los prompts de dosis DOS tokens mal calibrados:
 *   1. `doseFact(bio)` = el PRIMER FRAGMENTO DE PROSA de `dosis_aplicacion` (hasta
 *      70 chars), p. ej. "Caldo madre al 1% para 10 L: 100 g de sulfato de cobre
 *      pentahidratado". Como `must_include`, el scorer (determinístico o LLM) exige
 *      que la respuesta REPRODUZCA esa prosa por fondo → el modelo nunca repite la
 *      oración entera aunque cite bien la dosis → FALSO NEGATIVO.
 *   2. `fuente.split('/')[0]` = la fuente VERBATIM ("FAO", "Restrepo Rivera, J. —
 *      ABC de la agricultura organica…", "ICA bioinsumos"). Pedirle al agente que
 *      cite la fuente palabra-por-palabra NO mide grounding de dosis: mide si el
 *      modelo memorizó una cita. Tokens curados a mano, mal calibrados.
 *
 * El hecho que SÍ mide el grounding de dosis es la CANTIDAD CUANTITATIVA atómica
 * (número + unidad: "1%", "1-1,5 cc/L", "2 kg/ha"), que el agente puede citar
 * literalmente cuando el grafo se la pasa por /resolve-entities. `doseNumberFact`
 * la extrae del MISMO string del grafo (no hardcode): el pool sigue al grafo.
 *
 * Si el string de dosis NO tiene una cantidad numérica con unidad (p. ej. bocashi
 * = "abono sólido fermentado… NO se diluye"), devuelve null → el caller cae al
 * `doseFact` recortado como respaldo (sigue siendo un hecho del grafo).
 *
 * Módulo PURO (sin I/O, sin efectos) → importable por el generador y por el test.
 *
 * @module bench-pool-facts
 */

/** número decimal (coma o punto): 1, 0,5, 1.5 */
const NUM = '[0-9]+(?:[.,][0-9]+)?';
/** rango opcional: 1, 1-1,5, 100-200, 2 a 3 */
const RANGE = `(?:${NUM}(?:\\s?[-a]\\s?${NUM})?)`;
/**
 * Unidades de dosis típicas de biopreparados, ORDENADAS de más específica
 * (compuesta) a más general, para que "kg/ha" gane sobre "kg" y no se trunque, y
 * "%" no robe el match cuando hay una unidad de masa/volumen primero.
 */
const DOSE_UNITS = [
  'cc\\/l',
  'ml\\/l',
  'g\\/l',
  'kg\\/ha',
  'g\\/ha',
  'g\\/m2',
  'kg\\/m2',
  'cc\\/20\\s?l',
  'g\\/planta',
  'partes',
  '%',
  'kg',
  'cc',
  'ml',
  'g',
];

/**
 * doseFact — primer fragmento atómico (prosa recortada) de la dosis verificada.
 * Se conserva como RESPALDO cuando no hay cantidad numérica con unidad. NO debe
 * usarse como único `must_include` para dosis con número (usar doseNumberFact).
 *
 * @param {{dosis_aplicacion?:string}} bio
 * @returns {string} fragmento (puede ser '')
 */
export function doseFact(bio = {}) {
  const raw = (bio.dosis_aplicacion || '').trim();
  let frag = raw.split(';')[0].trim();
  if (frag.length > 70) frag = frag.slice(0, 70).replace(/[\s,]+\S*$/, '');
  return frag;
}

/**
 * doseNumberFact — extrae la PRIMERA cantidad cuantitativa (número[-rango] +
 * unidad) del string de dosis del grafo. Es el hecho evaluable que mide el
 * grounding: "1%", "1-1,5 cc/L", "2 kg/ha". Devuelve null si la dosis no expresa
 * una cantidad con unidad (proceso cualitativo).
 *
 * @param {{dosis_aplicacion?:string}} bio
 * @returns {string|null}
 */
export function doseNumberFact(bio = {}) {
  const raw = (bio.dosis_aplicacion || '').trim();
  if (!raw) return null;
  let best = null;
  let bestIdx = Infinity;
  for (const unit of DOSE_UNITS) {
    // `(?![\\wáéíóúñ])` = la unidad NO puede ir seguida de letra/dígito → evita
    // que "g" case dentro de "grados" o "ml" dentro de una palabra mayor.
    const re = new RegExp(`(${RANGE}\\s?${unit})(?![\\wáéíóúñ])`, 'i');
    const m = raw.match(re);
    if (m && m.index < bestIdx) {
      best = m[1].replace(/\s+/g, ' ').trim();
      bestIdx = m.index;
    }
  }
  return best;
}

/**
 * doseMustInclude — arma el array `must_include` de un prompt de dosis a partir
 * del nodo del grafo. Política recalibrada:
 *   - SIEMPRE el nombre canónico del biopreparado.
 *   - la CANTIDAD cuantitativa (doseNumberFact) si existe; si no, el fragmento de
 *     prosa recortado (doseFact) como respaldo.
 *   - NUNCA la fuente verbatim (FAO/Agrosavia/Restrepo…): no mide grounding.
 *
 * @param {{nombre?:string, dosis_aplicacion?:string}} bio
 * @returns {string[]}
 */
export function doseMustInclude(bio = {}) {
  const out = [];
  if (bio.nombre) out.push(bio.nombre);
  const num = doseNumberFact(bio);
  if (num) out.push(num);
  else {
    const frag = doseFact(bio);
    if (frag) out.push(frag);
  }
  return out;
}
