/*
 * dantaIdentidad — LA IDENTIDAD VISUAL DE LA DANTA, COMO DATOS.
 *
 * Hermana de `borugoIdentidad.js` / `jaguarIdentidad.js` / `faunaAndina.js`: la
 * DANTA DE PÁRAMO (Tapirus pinchaque — el tapir andino, el mamífero grande del
 * bosque altoandino) tiene aquí su silueta canónica. Rubber-hose (Cuphead +
 * Miss Minutes) con calidez campesina — el MISMO lenguaje de goma de la abeja,
 * el oso y el borugo, otro animal y otro CARÁCTER: MANSA, monumental y
 * andariega. LA JARDINERA DEL BOSQUE: come frutos monte adentro y va sembrando
 * el bosque al andar (las semillas viajan en ella) — todo lo que pisa, germina.
 *
 * Su firma inconfundible es doble: la TROMPA corta y flexible (el hocico-
 * probóscide que tantea, husmea y saluda) y el BORDE BLANCO de las orejas y
 * los labios claros (la marca del pinchaque contra el pelaje lanudo oscuro).
 * Su color de poder es el VERDE SEMILLA (lima tierno, la vida que germina a su
 * paso) — distinto de los 9: dorado (abeja), rojo (oso), verde-zen (rana),
 * iridiscente (colibrí), púrpura (jaguar), ámbar (ardilla), turquesa
 * (perezoso), bronce (morrocoy) y plata lunar (borugo).
 *
 * REGLA DE ORO (idéntica a borugoIdentidad/faunaAndina): SOLO datos. Cero
 * three, cero react. La creature del bundle base lo importa; jamás debe
 * arrastrar `vendor-three`. La CADENCIA (animación) vive en `creatures.css`
 * (clases `rh-*`/`crt-*`/`danta-*`); el DIBUJO compone el KIT
 * `_rubberhose.jsx`; el CLIMA→cuerpo, en `creatureClimaCuerpo.js`
 * (consumiendo el PERFIL_DANTA de abajo). El aura de poder (verde semilla)
 * vive en `transformacion.js` (AURA_POR_BICHO) y la ropa por clima en
 * `creatureClimaCuerpo.js` (ROPA_PERFIL_POR_BICHO): ambos traen la fila
 * 'danta' — este archivo NO la duplica, solo la silueta.
 */

/* La tinta cálida del contorno es de TODA la familia rubber-hose. */
export { RH_INK as DANTA_TINTA } from './_rubberhose.jsx';

/* Slug estable de la danta (data-creature, aura, ropa, perfiles). */
export const DANTA_SLUG = 'danta';

/* ── DANTA — Tapirus pinchaque (el tapir andino / danta de páramo). Mole
   LANUDA de pelaje pardo-negruzco (el único tapir de tierra fría), con la
   firma doble: TROMPA corta y flexible que tantea el aire, y el BORDE BLANCO
   de orejas y labios contra el pelaje oscuro. Patas cortas, andar pesado y
   manso. Tierna, pacífica, monumental. */
export const DANTA_PALETA = {
  cuerpo: '#4a4038',        // pelaje lanudo pardo-negruzco (tierra fría)
  cuerpoGlow: 'rgba(74,64,56,0.65)',
  lomo: '#37302a',          // dorso un tono más hondo (la lana densa)
  panza: '#5e5348',         // vientre apenas más claro (mole discreta)
  trompa: '#5c5044',        // la trompa, un tono MÁS CLARO que la cara (que se lea)
  trompaPunta: '#b8a68c',   // la puntita clara y móvil de la trompa
  labio: '#e8ddca',         // los LABIOS BLANCOS del pinchaque (su firma)
  orejaBorde: '#efe6d4',    // el BORDE BLANCO de las orejas (su firma)
  oreja: '#2f2924',         // interior de la oreja redonda
  cachete: '#6b5d4e',       // chapetas pardas claras a los lados
  pezuna: '#2b2521',        // pezuñitas oscuras
  cria: '#d6c8ab',          // las RAYAS/MOTAS pálidas de cría (los tapires nacen rayados)
  /* ── La jardinera del bosque (el verde semilla) ── */
  semilla: '#a8e05f',       // el verde-lima de su aura de poder (lo que germina)
  brote: '#d4f0a2',         // el brillo tierno de los brotes (chispas de vida)
};

export const DANTA_PROPORCION = {
  troncoRx: 10.6,           // la mole (el mamífero más grande del bosque andino)
  troncoRy: 7.4,
  cabezaR: 5.2,
  orejaR: 1.8,             // orejas redondas de borde blanco, atentas
  trompaLargo: 4.2,        // la trompa corta que cae y tantea
  colaR: 1.5,              // la colita-nudito de tapir (corta, casi un botón)
};

/*
 * PERFIL_DANTA — el perfil de CLIMA→cuerpo de la danta para `cuerpoDeClima`
 * (creatureClimaCuerpo.js). Mismo shape que PERFIL_OSO/PERFIL_BORUGO — se pasa
 * vía la opción `perfil`, así NO hay que tocar el archivo compartido
 * (anti-conflicto).
 *   alas    false → sin aleteo (velocidadAlas siempre 1).
 *   humedad 0.55 → lana densa de tierra fría: empapa despacio (no chorrea).
 *   difusa  0.45 → mole grande: la niebla apenas la difumina.
 *   sequia  0.5  → de bosque húmedo: la seca le pesa (los frutos escasean).
 */
export const PERFIL_DANTA = Object.freeze({
  alas: false,
  humedad: 0.55,
  difusa: 0.45,
  sequia: 0.5,
});
