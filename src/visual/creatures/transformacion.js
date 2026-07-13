/*
 * transformacion — helper del power-up "modo poder" (biblia de personajes).
 *
 * Dos cosas:
 *   1) AURA_POR_BICHO — el color de aura de cada bicho (lo ÚNICO que cambia entre
 *      especies: la clase `.is-powered-up` y las 4 capas son idénticas). Datos
 *      puros, testeables.
 *   2) usePoderTemporal — hook para DISPARAR la transformación un rato (la
 *      "mega-celebra"): activás y a los `ms` se apaga sola.
 *
 * Uso típico (avatar/diálogo):
 *   const { poderoso, activar } = usePoderTemporal();
 *   <div className={poderoso ? 'is-powered-up' : ''}
 *        style={{ '--aura-color': auraDeBicho('abeja-angelita') }}>
 *     <AbejaAngelita /> {poderoso && <AuraPoder />}
 *   </div>
 */

import { useCallback, useEffect, useRef, useState } from 'react';

/* La clase maestra (por si algún consumidor DOM la togglea sin React). */
export const CLASE_PODER = 'is-powered-up';

/* Aura por bicho (biblia de personajes — tabla de transformación).
   Claves = slugs estables de la creature. Solo el COLOR difiere; el resto del
   efecto es transversal. Los tonos "iridiscente/chispas" se aproximan con un
   color base — fable los refina con gradientes por-bicho después. */
export const AURA_POR_BICHO = Object.freeze({
  'abeja-angelita': '#ffd54a', // dorada clásica
  'oso-andino': '#ff3b30',     // roja berserker
  'rana-andina': '#39d98a',    // verde-zen (slug real de la creature)
  'rana-arlequin': '#39d98a',  // alias biblia
  colibri: '#4fd1ff',          // iridiscente (aprox. celeste)
  jaguar: '#a855f7',           // púrpura depredador
  ardilla: '#ff9f1c',          // chispas ámbar
  perezoso: '#1ec9b7',         // turquesa/teal zen irónico (distinto del verde de la rana)
  morrocoy: '#ff7a3c',         // caparazón que brilla (ámbar-rojizo)
});

/* Aura por defecto si el slug no está mapeado (la dorada de la guía). */
export const AURA_DEFECTO = '#ffd54a';

/**
 * Color de aura de un bicho por su slug. Desconocido/no-string → aura por
 * defecto (nunca undefined, así `--aura-color` siempre tiene valor).
 *
 * @param {string} slug
 * @returns {string} color CSS.
 */
export function auraDeBicho(slug) {
  return (typeof slug === 'string' && AURA_POR_BICHO[slug]) || AURA_DEFECTO;
}

/* Duración por defecto de la mega-celebra (ms). */
export const PODER_MS = 2600;

/**
 * Hook para disparar el power-up TEMPORAL (la "mega-celebra"). `activar()` lo
 * enciende y lo apaga solo a los `ms`. Reentrante: llamar de nuevo reinicia el
 * reloj (no se acumula ni parpadea).
 *
 * @param {object} [opts]
 * @param {number} [opts.ms=PODER_MS]
 * @returns {{ poderoso: boolean, activar: () => void, apagar: () => void }}
 */
export function usePoderTemporal({ ms = PODER_MS } = {}) {
  const [poderoso, setPoderoso] = useState(false);
  const timerRef = useRef(0);

  const apagar = useCallback(() => {
    clearTimeout(timerRef.current);
    setPoderoso(false);
  }, []);

  const activar = useCallback(() => {
    setPoderoso(true);
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => setPoderoso(false), ms);
  }, [ms]);

  useEffect(() => () => clearTimeout(timerRef.current), []);

  return { poderoso, activar, apagar };
}
