import {
  RH_EASE,
  RH_LINE_BOIL,
  RH_PERIODOS,
  esRubberhose,
} from '../rubberhoseSpec.js';

export { RH_EASE, RH_LINE_BOIL, RH_PERIODOS, esRubberhose };

/**
 * Resuelve los gates que todos los compais deben aplicar al rig rubber-hose.
 * El resultado no muta el dibujo: solo indica qué capas puede montar.
 */
export function aplicarRubberhose({ activo = true, tier } = {}) {
  const animado = activo !== false;
  const frugal = tier === 'bajo';
  return Object.freeze({
    animado,
    frugal,
    capasContinuas: animado && !frugal,
    attrs: Object.freeze({
      'data-tier': tier || undefined,
    }),
  });
}
