import ENSO from '../data/enso-modulacion.json';

export function modularPorENSO(faseENSO, recomendacionBase) {
  if (!faseENSO || !ENSO[faseENSO]) return recomendacionBase;
  const m = ENSO[faseENSO];
  return `${recomendacionBase} (Contexto ENSO ${faseENSO}: ${m.efecto} — ${m.lluvia})`;
}
