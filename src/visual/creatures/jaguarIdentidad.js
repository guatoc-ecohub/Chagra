/*
 * jaguarIdentidad — LA IDENTIDAD VISUAL DEL JAGUAR, COMO DATOS.
 *
 * Hermana de `abejaIdentidad.js` y `faunaAndina.js`: el JAGUAR (Panthera onca),
 * el felino de tierra cálida/selva, tiene aquí su silueta canónica. Rubber-hose
 * (Cuphead + Miss Minutes) con calidez campesina — el MISMO lenguaje de goma de
 * la abeja y el oso, otro animal y otro CARÁCTER: majestuoso, poderoso,
 * ACECHADOR. Sereno pero imponente, se mueve con acecho de hombros (los
 * omóplatos suben), la cola ondea con peso y la mirada felina es intensa. Su
 * color de poder es el PÚRPURA depredador (abeja=dorado, oso=rojo, rana=verde,
 * colibrí=iridiscente).
 *
 * REGLA DE ORO (idéntica a abejaIdentidad/faunaAndina): SOLO datos. Cero three,
 * cero react. La creature del bundle base lo importa; jamás debe arrastrar
 * `vendor-three`. La CADENCIA (animación) vive en `creatures.css` (clases
 * `rh-*`/`crt-*`/`jaguar-*`); el DIBUJO compone el KIT `_rubberhose.jsx`; el
 * CLIMA→cuerpo, en `creatureClimaCuerpo.js` (consumiendo el PERFIL_JAGUAR de
 * abajo). El aura de poder (púrpura) vive en `transformacion.js` (AURA_POR_BICHO)
 * y la ropa por clima en `creatureClimaCuerpo.js` (ROPA_PERFIL_POR_BICHO): ambos
 * ya traen la fila 'jaguar' — este archivo NO la duplica, solo la silueta.
 */

/* La tinta cálida del contorno es de TODA la familia rubber-hose. */
export { RH_INK as JAGUAR_TINTA } from './_rubberhose.jsx';

/* Slug estable del jaguar (data-creature, aura, ropa, perfiles). */
export const JAGUAR_SLUG = 'jaguar';

/* ── JAGUAR — Panthera onca (el felino de tierra cálida/selva). Pelaje leonado
   dorado con ROSETAS negras de centro ocre (su firma — manchas con centro, NO
   puntos como el leopardo), vientre crema, cuerpo MUSCULOSO, orejas redondas,
   mirada felina ÁMBAR intensa y cola larga y pesada. Majestuoso y poderoso. */
export const JAGUAR_PALETA = {
  cuerpo: '#d99a45',        // pelaje leonado dorado
  cuerpoGlow: 'rgba(217,154,69,0.7)',
  vientre: '#f4e6c8',       // pecho/vientre crema
  hombro: '#c9853a',        // omóplato un tono más hondo (el músculo del acecho)
  roseta: '#241608',        // el anillo negro de la roseta (tinta oscura cálida)
  rosetaCentro: '#a86a24',  // el centro ocre de la roseta (la firma: mancha con centro)
  hocico: '#f4e6c8',        // morro claro
  nariz: '#3a2012',         // trufa
  oreja: '#7a4718',         // dorso oscuro de la oreja
  iris: '#e8a53a',          // ojo felino ámbar (mirada intensa)
  colmillo: '#fff8ec',      // colmillos del rugido
};

export const JAGUAR_PROPORCION = {
  troncoRx: 10.4,           // musculoso (más ancho que alto)
  troncoRy: 7.4,
  cabezaR: 6.2,
  orejaR: 2.2,              // orejas redondas de felino
  hombroAlto: 4.2,          // pico del omóplato en el acecho
};

/*
 * PERFIL_JAGUAR — el perfil de CLIMA→cuerpo del jaguar para `cuerpoDeClima`
 * (creatureClimaCuerpo.js). Mismo shape que PERFIL_OSO/PERFIL_RANA — se pasa vía
 * la opción `perfil`, así NO hay que tocar el archivo compartido (anti-conflicto).
 *   alas    false → sin aleteo (velocidadAlas siempre 1).
 *   humedad 0.6  → pelaje lustroso que escurre el agua (no chorrea como la rana).
 *   difusa  0.5  → felino grande: la niebla apenas lo difumina (como la mole del oso).
 *   sequia  0.3  → de tierra cálida: robusto ante la seca (poco vulnerable).
 */
export const PERFIL_JAGUAR = Object.freeze({
  alas: false,
  humedad: 0.6,
  difusa: 0.5,
  sequia: 0.3,
});
