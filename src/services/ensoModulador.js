import ENSO from '../data/enso-modulacion.json';

/**
 * Modula una recomendacion agronomica segun la fase ENSO.
 * @param {string|null} faseENSO
 * @param {string} recomendacionBase
 * @returns {string}
 */
export function modularPorENSO(faseENSO, recomendacionBase) {
  if (!faseENSO || !ENSO[faseENSO]) return recomendacionBase;
  const m = ENSO[faseENSO];
  return `${recomendacionBase} (Contexto ENSO ${faseENSO}: ${m.efecto} — ${m.lluvia})`;
}
