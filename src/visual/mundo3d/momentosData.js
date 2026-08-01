/*
 * momentosData — la PARTITURA de los momentos de la finca (MomentosFinca.jsx).
 *
 * Un "momento" es un beat: el espejo vivo celebra que el dato real cambió
 * (nació una semilla, la mata subió un escalón, se recogió un fruto, se vendió
 * un animal/producto). Este archivo es three-free a propósito: puro dato y
 * funciones puras (duraciones, fases, easings, colores), testeable sin GPU.
 *
 * El lenguaje de animación es rubber-hose (norte visual Cuphead/Miss Minutes):
 * ANTICIPACIÓN (se agacha antes de saltar) → ACCIÓN con OVERSHOOT (se pasa un
 * poquito y vuelve) → ASENTAR (un respiro que decae, nunca un corte seco).
 * Cada beat corre UNA vez y termina limpio: al final todo brillo queda en
 * opacidad 0 y toda mota invisible — el diorama sigue como si nada.
 */

import { PALETA } from './atmosferaMadre.js';

/* ------------------------------------------------------------------ easings */

export const clamp01 = (x) => (x < 0 ? 0 : x > 1 ? 1 : x);
export const lerp = (a, b, t) => a + (b - a) * t;
export const easeOutCubic = (p) => 1 - (1 - p) ** 3;
export const easeInCubic = (p) => p * p * p;
export const easeInOutSine = (p) => -(Math.cos(Math.PI * p) - 1) / 2;

/* Overshoot suave: el gesto se pasa ~10% y asienta con un respiro (el corazón
   del rubber-hose; misma curva que AnimalMomento usa para la cría). */
export const easeOutBack = (p) => {
  const c1 = 1.70158;
  const c3 = c1 + 1;
  return 1 + c3 * (p - 1) ** 3 + c1 * (p - 1) ** 2;
};

/* Progreso LOCAL de una fase: mapea p∈[0,1] global al tramo [ini,fin] y lo
   normaliza a [0,1] con clamp. Las fases se SOLAPAN un poco a propósito
   (follow-through: la acción siguiente arranca antes de que muera la previa). */
export const fase = (p, ini, fin) => clamp01((p - ini) / (fin - ini));

/* Respiro que decae: oscilación amortiguada para el "asentar" (t∈[0,1]).
   ciclos = cuántas idas y vueltas; amp = amplitud inicial. */
export const respiro = (t, ciclos = 3, amp = 1) =>
  Math.sin(t * Math.PI * ciclos) * amp * (1 - t);

/* ------------------------------------------------------- partitura por beat */

/* Duración total de cada momento (s). El adiós de la venta es el más pausado;
   el escalón de crecimiento es el más ágil (pasa seguido, no puede cansar). */
export const DUR_MOMENTO = {
  nace: 2.6,
  crece: 2.0,
  cosecha: 2.4,
  vende: 3.0,
};

/* Fases de cada beat como tramos [ini, fin] del progreso global p∈[0,1].
   Documentan la coreografía y alimentan `fase()` en MomentosFinca.jsx. */
export const FASES_MOMENTO = {
  nace: {
    anticipa: [0, 0.18], //  la tierra se abomba y tiembla (algo empuja abajo)
    brota: [0.16, 0.62], //  el tallo sube con overshoot; la cascarita se ladea
    abre: [0.55, 0.88], //   las dos hojas se despliegan (overshoot propio)
    asienta: [0.78, 1], //   halo cálido + motas + balanceo que decae
  },
  crece: {
    anticipa: [0, 0.18], //  squash: la mata se agacha para tomar impulso
    estira: [0.16, 0.72], // sube al escalón nuevo; Y con overshoot, XZ con retraso
    asienta: [0.7, 1], //    onda-anillo en la base + hoja nueva + respiro
  },
  cosecha: {
    anticipa: [0, 0.2], //   el fruto se mece en la rama, cargando el gesto
    desprende: [0.2, 0.36], // ¡pop! se suelta con un estirón hacia arriba
    vuela: [0.34, 0.8], //   arco parabólico al canasto (stretch en vuelo)
    posa: [0.78, 1], //      el canasto recibe con squash; chispas tibias
  },
  vende: {
    anticipa: [0, 0.15], //  se orienta al camino y se agacha (allá vamos)
    viaja: [0.15, 0.62], //  trota a saltitos con squash&stretch por brinco
    despide: [0.62, 0.84], // llega, mira atrás y hace una venia; sube el adiós
    parte: [0.84, 1], //     se desvanece hacia arriba, suave — no un corte
  },
};

/* Números finos de la coreografía (amplitudes, alturas, conteos). */
export const AJUSTE_MOMENTO = {
  nace: { altoTallo: 0.5, aperturaHoja: 0.85, plegadaHoja: 1.35 },
  crece: { dipAnticipa: 0.16, contraXZ: 0.1, radioAnillo: 0.42 },
  cosecha: { alturaArco: 0.55, estironVuelo: 0.25, squashCanasto: 0.2 },
  vende: { saltos: 5, altoSalto: 0.16, venia: 0.38, subidaAdios: 0.3 },
};

/* Colores de los brillos y motas — SIEMPRE cálidos (nunca alarma fría).
   Los cuerpos usan PALETA directa; esto es solo la luz del momento. */
export const LUZ_MOMENTO = {
  halo: '#ffe6b0', //   el brillo del nacimiento (mismo tono que la cría del corral)
  motaTibia: '#ffe6b0', // motas que suben (nace, el adiós de la venta)
  motaBrote: '#eaf5c0', //  motas verdecitas del escalón de crecimiento
  chispa: '#ffd27a', //  chispitas al posar el fruto en el canasto
  anillo: '#d9e8b0', //  la onda que emana de la base al crecer
  fruto: PALETA.ambar, // fruto por defecto (el operador puede pasar el suyo)
};
