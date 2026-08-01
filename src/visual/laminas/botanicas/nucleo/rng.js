/*
 * rng — azar DETERMINISTA para el puntillismo de las láminas.
 *
 * Por qué existe: una lámina botánica se sostiene sobre el puntillismo
 * (stipple) y la plumilla. Si esos puntos se re-sortearan en cada render,
 * la lámina "hierve" — y una lámina que hierve deja de ser un documento y
 * pasa a ser una animación. Aquí el azar se siembra con el nombre de la
 * especie: la papa siempre tiene EXACTAMENTE los mismos puntos, en alpha,
 * en stg y en la captura de mañana.
 *
 * mulberry32: PRNG de 32 bits, ~5 líneas, sin dependencias, buena
 * distribución para nube de puntos. No es criptográfico y no pretende serlo.
 */

/** Hash de string → semilla uint32 (FNV-1a). */
export function semilla(texto) {
  let h = 0x811c9dc5;
  for (let i = 0; i < texto.length; i += 1) {
    h ^= texto.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

/** Generador determinista. `rng()` → [0,1). */
export function generador(sem) {
  let a = typeof sem === 'string' ? semilla(sem) : sem >>> 0;
  return function rng() {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Atajos legibles sobre un rng. */
export const entre = (rng, min, max) => min + rng() * (max - min);
export const enteroEntre = (rng, min, max) => Math.floor(entre(rng, min, max + 1));
/** Jitter simétrico alrededor de 0: ±amp. */
export const tembleque = (rng, amp) => (rng() - 0.5) * 2 * amp;
/** Elige un elemento de una lista. */
export const elige = (rng, lista) => lista[Math.floor(rng() * lista.length) % lista.length];

/** Redondeo a 2 decimales: los `d` de SVG no necesitan 15 cifras. */
export const r2 = (n) => Math.round(n * 100) / 100;
