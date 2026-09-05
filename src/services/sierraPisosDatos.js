/**
 * sierraPisosDatos — selector PURO del estado por piso térmico de la Sierra.
 *
 * Consume `src/data/sierra-pisos-datos.json`, el derivado ESTÁTICO que
 * `scripts/build-sierra-pisos-datos.mjs` genera desde el catálogo
 * (`thermal_zones`) y el grafo (`_piso_termico`). Regeneración y fresca
 * garantizadas por `tests/unit/sierraPisosDatos.test.js`.
 *
 * Anti-fabricación: si no existe piso para ese id, devuelve `null` — el
 * llamador decide. Los pisos sin especie documentada (`con_dato: false`,
 * superpáramo y nival en el catálogo actual) se entregan como tal, con
 * total 0: "sin datos para este piso" es un hecho medido, no prosa.
 *
 * @module services/sierraPisosDatos
 */

import datos from '../data/sierra-pisos-datos.json';

/** El archivo derivado completo (pisos en orden mar→cima). */
export const SIERRA_PISOS_DATOS = datos;

/** Total de especies del catálogo que alimenta los conteos. */
export const TOTAL_ESPECIES_CATALOGO = datos._total_catalogo;

/** Ids de piso SIN especie documentada (con_dato: false). */
export const PISOS_SIERRA_SIN_DATO = datos.pisos
  .filter((p) => !p.con_dato)
  .map((p) => p.id);

/**
 * La ficha de datos de un piso de la Sierra, o `null` si el id no existe.
 *
 * @param {string|null|undefined} id  uno de calido|templado|frio|paramo|superparamo|nival
 * @returns {object|null}
 */
export function datoPisoPorId(id) {
  if (!id) return null;
  return datos.pisos.find((p) => p.id === id) || null;
}