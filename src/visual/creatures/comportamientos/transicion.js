/* Contrato temporal del cruce de una criatura entre capas 2D y 3D. */
export const CRUCE_ATRAPA_MS = 760;
export const CRUCE_ENTRAR_MS = 980;
export const CRUCE_VOLVER_MS = 620;
export const CRUCE_SUELTA_MS = 180;

export function configurarTransicion(sentido = 'entrar', { reducedMotion = false } = {}) {
  const valido = sentido === 'volver' ? 'volver' : 'entrar';
  const duracion = valido === 'entrar' ? CRUCE_ENTRAR_MS : CRUCE_VOLVER_MS;
  return Object.freeze({
    sentido: valido,
    duracion: reducedMotion ? 0 : duracion,
    instanteMesh: valido === 'entrar' ? CRUCE_ATRAPA_MS : CRUCE_SUELTA_MS,
    reducida: Boolean(reducedMotion),
  });
}
