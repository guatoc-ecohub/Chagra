/**
 * zariguyaGestos — LO QUE LA ZARIGÜEYA SABE Y HACE. Núcleo portable.
 *
 * Para Julieta (11), que ama las zarigüeyas y tiene a su peluche "Miguelón":
 * el compai zarigüeya se hace con ese cariño. Este módulo es SOLO datos (cero
 * imports, como todo el núcleo) — el vocabulario de sus gestos, que comparten
 * la PWA (React) y el valle de `3d.guatoc.co` (ESM sin build). El RUNTIME que
 * los pinta (respiración por `idleMachine`, azar por `gestos`, DOM) vive en el
 * valle: `compai/zariguyaCompai.js` importa ESTOS datos de aquí.
 *
 * Sobre la base de Angelita (los 10 estados de `angelitaEstados.js` + el idle
 * de `gestos.js`), la zarigüeya suma LO SUYO:
 *   · VER / observar  → saca una LUPA y escanea.
 *   · ESCUCHAR         → se le AGRANDA la oreja + ondas de sonido.
 *   · MUERTA (thanatosis, ~1 de cada 5 momentos ociosos, NUNCA el default):
 *     se desploma de costado, rígida, lengua afuera — y DICE, con empatía y
 *     sin susto, POR QUÉ lo hace (`FRASE_MUERTA`). Es pedagogía.
 *
 * @module compai/nucleo/zariguyaGestos
 */

/* LA FRASE. Educativa, gentil, para una niña: empatía, no miedo. Enseña por
   qué el animal hace tanatosis (se hace la muerta para sobrevivir). */
export const FRASE_MUERTA =
  'Me hago la muerta cuando me atacan mucho… pero no le hago daño a nadie: '
  + 'solo estoy sobreviviendo, igual que todos los que vivimos en este planeta.';

/* Narración accesible por gesto (usted, colombiano — nunca "tú"). */
export const ARIA_ZARIGUYA = {
  acompana: 'La zarigüeya la acompaña: husmea el aire y menea la cola',
  ver: 'La zarigüeya saca su lupa y observa con cuidado',
  escuchando: 'La zarigüeya agranda la oreja para escucharla mejor',
  muerta: 'La zarigüeya se hace la muerta para sobrevivir, y le explica por qué',
};

/* EL REPERTORIO OCIOSO de la zarigüeya. Sobre la base de Angelita (husmea /
   mira / acicala) suma SUS gestos (ver → lupa, escucha → oreja, cola prensil)
   y la muerta pesada a propósito para caer ~1 de cada 5 (0.20):
       muerta 3.5 / (3+3+2+2+2+2 + 3.5) = 3.5 / 17.5 = 0.20.
   El azar sin-repetir (`gestos.elegirSinRepetir`) excluye el anterior, así que
   el valor real ronda 0.19 — es un gesto ocasional, nunca el default.
   `dur` en ms (el runtime lo usa como duración del momento). */
export const IDLE_ZARIGUYA = {
  husmea: { peso: 3, dur: 2600 }, // olfatea el aire, nocturna y alerta
  mira: { peso: 3, dur: 2400 }, // mira alrededor, curiosa
  acicala: { peso: 2, dur: 2800 }, // se limpia el hocico con la manita
  cola: { peso: 2, dur: 2600 }, // enrosca y mece la cola prensil
  ver: { peso: 2, dur: 3000 }, // saca la lupa y observa  → LUPA
  escucha: { peso: 2, dur: 3000 }, // agranda la oreja        → OREJA
  muerta: { peso: 3.5, dur: 5200 }, // se hace la muerta + la frase (≈20%)
};

/* Momentos que disparan un gesto VISIBLE (los demás son micro-pose del idle).
   Array (no Set) para que el núcleo quede como datos puros y serializables. */
export const GESTOS_VISIBLES = ['ver', 'escucha', 'muerta'];

/* Estado manual (los botones del comparador / selector) → momento del
   repertorio. `null` = volver al idle vivo, sin gesto forzado. */
export const ESTADO_A_MOMENTO = {
  acompana: null,
  idle: null,
  ver: 'ver',
  observa: 'ver',
  husmea: 'ver',
  escuchando: 'escucha',
  escucha: 'escucha',
  muerta: 'muerta',
  tanatosis: 'muerta',
};

export default { FRASE_MUERTA, ARIA_ZARIGUYA, IDLE_ZARIGUYA, GESTOS_VISIBLES, ESTADO_A_MOMENTO };
