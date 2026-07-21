/*
 * abejaIdentidad — LA IDENTIDAD VISUAL DE ANGELITA, COMO DATOS.
 *
 * Angelita es UNA sola compañera aunque viva en dos capas: el dibujo 2D
 * rubber-hose (`AbejaAngelita.jsx` — avatares, diálogo, home, overlay del
 * cruce) y su presencia dentro de los mundos 3D (`useEntradaAbeja.jsx` — el
 * billboard que vuela por las escenas, su percha y su sombra de contacto).
 * Para que se LEA como una sola, ambos lados beben de esta fuente única:
 *
 *   - ABEJA_PALETA      → los colores del cuerpo (chumbe ámbar, alas de tul,
 *                         lengüita, gotas). El SVG los pinta; la escena 3D los
 *                         usa para todo lo abeja-adyacente (auras, tintes).
 *   - ABEJA_PROPORCION  → las medidas del cuerpo en unidades del viewBox
 *                         (tronco, cabeza) — la silueta canónica.
 *   - ABEJA_PRESENCIA   → cómo ocupa una escena 3D: tamaño del billboard por
 *                         energía, distancia de cámara, su percha junto al
 *                         foco y su sombra de contacto (radio, tintes, caída
 *                         por altura). Cualquier arquetipo nuevo la coloca
 *                         con ESTOS números, no con offsets a ojo.
 *
 * REGLA DE ORO: este módulo es SOLO datos (cero three, cero react como
 * dependencia directa) — la creature del bundle base lo importa, así que
 * jamás debe arrastrar el chunk perezoso `vendor-three`. La CADENCIA
 * (animaciones) no vive aquí: sigue en `creatures.css` / el useFrame de la
 * escena. Aquí vive lo que hace que la abeja del home y la de los mundos
 * sean, a los ojos, la misma Angelita.
 */

/* La tinta cálida del contorno es de TODA la familia rubber-hose; se re-exporta
   para que el lado 3D tiña la sombra de Angelita con su misma línea. */
export { RH_INK as ABEJA_TINTA } from './_rubberhose.jsx';

/* Paleta del cuerpo — Tetragonisca angustula REAL elevada a rubber-hose andino.
   La firma de la especie es la ESTRUCTURA DE VALORES: cabeza y tórax OSCUROS
   (casi negros) + abdomen ámbar PÁLIDO y LISO. Es lo contrario de la Apis
   europea (cabeza/tórax claros + abdomen con bandas oscuras) — la que saquea
   las colmenas de angelita; por eso el color es fidelidad, no decoración. */
export const ABEJA_PALETA = {
  cuerpo: '#f2c064',      // ámbar PÁLIDO del abdomen liso y del aura viva
  cuerpoGlow: 'rgba(242,192,100,0.85)', // el mismo ámbar como resplandor (drop-shadow)
  cabeza: '#33281a',      // cabeza OSCURA (casi negra) — meliponino, NO Apis
  torax: '#3d2c19',       // tórax oscuro (un pelo más cálido que la cabeza)
  acento: '#ffd76a',      // dorado claro SOLO para acentos de UI (certeza del agente)
  cara: '#ffe3ad',        // máscara facial clara (clípeo amarillo real de la angelita)
  hiloChumbe: '#c98a3e',  // tergite tenue del abdomen (línea suave, ya NO banda)
  alaTul: '#cfeeff',      // ala grande de tul (hialina)
  alaTulClara: '#eafff8', // ala chica, más pálida
  lengua: '#c9524e',      // probóscide (sed / libar)
  gota: '#bfe6ff',        // gotas de lluvia cuando está mojada
};

/* Silueta canónica en unidades del viewBox del SVG ('-15 -15 32 30'). */
export const ABEJA_PROPORCION = {
  troncoRx: 8.6,
  troncoRy: 5.4,
  cabezaR: 4.4,
};

/* Presencia en escena 3D: los números con los que el mundo la dimensiona y la
   posa. Extraídos de la coreografía compartida (useEntradaAbeja) para que
   ningún host reinvente el tamaño/percha de Angelita por su cuenta. */
export const ABEJA_PRESENCIA = {
  /* Billboard <Html>: px base + ganancia por energía (0..1) y el
     distanceFactor con el que la cámara la escala. */
  billboardBase: 48,
  billboardPorEnergia: 14,
  distancia: 7,
  /* Su percha junto al foco (hotspot activo o centro del diorama) y la altura
     a la que ronda cuando no está entrando. */
  percha: { x: 0.45, y: 0.85, z: 0.6 },
  rondaAltura: 1.6,
  /* Su sombra de contacto: tintada con ABEJA_TINTA (la misma línea del
     contorno), se ensancha y atenúa cuanto más alto vuela. */
  sombra: {
    radio: 0.3,
    opacidad: 0.24,      // la del montaje (antes del primer frame)
    opacidadBase: 0.3,   // techo del cálculo por frame
    opacidadMin: 0.06,
    atenuaPorAltura: 0.06,
    ensanchaPorAltura: 0.15,
  },
};
