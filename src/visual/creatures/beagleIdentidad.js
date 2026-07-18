/*
 * beagleIdentidad — LA IDENTIDAD VISUAL DEL BEAGLE, COMO DATOS.
 *
 * Hermana de `dalmataIdentidad.js` y `borugoIdentidad.js`: el BEAGLE (Canis
 * lupus familiaris), el sabueso BAJITO y orejón de la casa, tiene aquí su
 * silueta canónica. Rubber-hose (Cuphead + Miss Minutes) con calidez campesina
 * — el MISMO lenguaje de goma de la abeja y el jaguar, otro animal y otro
 * CARÁCTER: dulce, curioso, NARIZ-PRIMERO (un sabueso vive oliendo). La SEÑA
 * INEQUÍVOCA de la raza (fidelidad primero): TRICOLOR — manto/SILLA NEGRA en el
 * lomo, BLANCO en cara-pecho-patas-punta de cola, FUEGO/canela en cabeza y
 * orejas; orejas LARGUÍSIMAS, anchas y CAÍDAS que enmarcan la cara; LISTA
 * BLANCA que sube por el centro del hocico ancho; PATAS CORTAS de cuerpo
 * compacto; y la COLA ERGUIDA con PUNTA BLANCA (la "bandera" que los cazadores
 * criaron para verlo entre el monte). Ojos GRANDES café con expresión dulce.
 * Bajito y orejón donde el dálmata es alto y moteado: las dos siluetas jamás se
 * confunden. Su color de poder es el CANELA DE RASTRO (la nariz de oro del
 * sabueso; abeja=dorado, jaguar=púrpura, dálmata=azul cobalto).
 *
 * REGLA DE ORO (idéntica a jaguarIdentidad/borugoIdentidad): SOLO datos. Cero
 * three, cero react. La creature del bundle base lo importa; jamás debe
 * arrastrar `vendor-three`. La CADENCIA (animación) vive en `creatures.css`
 * (clases `rh-*`/`crt-*`/`beagle-*`); el DIBUJO compone el KIT
 * `_rubberhose.jsx`; el CLIMA→cuerpo, en `creatureClimaCuerpo.js` (consumiendo
 * el PERFIL_BEAGLE de abajo). El aura de poder (canela) vive en
 * `transformacion.js` (AURA_POR_BICHO) y la ropa por clima en
 * `creatureClimaCuerpo.js` (ROPA_PERFIL_POR_BICHO) — este archivo NO las
 * duplica, solo la silueta.
 */

/* La tinta cálida del contorno es de TODA la familia rubber-hose. */
export { RH_INK as BEAGLE_TINTA } from './_rubberhose.jsx';

/* Slug estable del beagle (data-creature, aura, ropa, perfiles). */
export const BEAGLE_SLUG = 'beagle';

/* ── BEAGLE — Canis lupus familiaris (el sabueso tricolor). Compacto,
   pequeño-mediano, patas CORTAS. El TRICOLOR es la firma: silla NEGRA sobre el
   lomo, blanco abajo y en la lista de la cara, canela/fuego en cabeza y
   orejas. Orejas LARGAS anchas caídas, hocico ANCHO, trufa grande (la nariz es
   su vida), ojos grandes café dulces, cola erguida con punta BLANCA. */
export const BEAGLE_PALETA = {
  cuerpo: '#fdf8ec',        // base BLANCA (pecho, patas, vientre — lo de abajo)
  cuerpoGlow: 'rgba(211,150,77,0.6)',
  canela: '#d3964d',        // el FUEGO/canela de cabeza y orejas
  canelaHondo: '#b3753a',   // canela más hondo (interior/sombra de la oreja)
  manto: '#33200f',         // la SILLA NEGRA del lomo (negro cálido, no industrial)
  lista: '#fdf8ec',         // la LISTA blanca que sube por el centro de la cara
  hocico: '#fbf3e2',        // hocico ancho claro (belfos de sabueso)
  nariz: '#241608',         // trufa GRANDE negra (la nariz manda)
  iris: '#6b4423',          // ojo GRANDE café dulce (mirada de sabueso)
  lengua: '#ef8398',        // lengüita rosada
  colaPunta: '#ffffff',     // la PUNTA BLANCA de la cola (la bandera)
};

export const BEAGLE_PROPORCION = {
  troncoRx: 9.8,            // LONG AND LOW: claramente más ancho que alto (~1.6:1) — la anti-silueta del dálmata cuadrado
  troncoRy: 6.2,
  cabezaR: 6.0,             // cabeza grande y dulce (abombada de sabueso)
  orejaRx: 2.7,             // orejas LARGUÍSIMAS anchas caídas: casi TAPAN el hocico en reposo
  orejaRy: 6.3,
  pataCorta: 11.8,          // hasta dónde llegan las PATAS CORTAS y robustas (y del pie)
  colaAlto: -9.0,           // hasta dónde SUBE la cola erguida (bandera)
};

/*
 * PERFIL_BEAGLE — el perfil de CLIMA→cuerpo del beagle para `cuerpoDeClima`
 * (creatureClimaCuerpo.js). Mismo shape que PERFIL_DALMATA — se pasa vía la
 * opción `perfil`, así NO hay que tocar el archivo compartido (anti-conflicto).
 *   alas    false → sin aleteo (velocidadAlas siempre 1).
 *   humedad 0.55 → sabueso de monte: se moja y sigue oliendo (chorrea un poco más).
 *   difusa  0.5  → bajito: la niebla del suelo lo tapa antes.
 *   sequia  0.35 → rústico y terco: la seca apenas lo mella.
 */
export const PERFIL_BEAGLE = Object.freeze({
  alas: false,
  humedad: 0.55,
  difusa: 0.5,
  sequia: 0.35,
});
