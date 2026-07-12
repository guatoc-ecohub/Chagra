/*
 * faunaAndina — LA IDENTIDAD VISUAL DEL TRÍO ANDINO, COMO DATOS.
 *
 * Hermana de `abejaIdentidad.js`: así como Angelita bebe su paleta/medidas de
 * una fuente única, el OSO ANDINO (Tremarctos ornatus), el COLIBRÍ esmeralda
 * (Colibri coruscans) y la RANA arlequín (Atelopus, páramo) tienen aquí su
 * silueta canónica. Los tres son rubber-hose (Cuphead + Miss Minutes) con
 * calidez campesina andina — el MISMO lenguaje de goma de la abeja, otro animal.
 *
 * REGLA DE ORO (idéntica a abejaIdentidad): SOLO datos. Cero three, cero react.
 * La creature del bundle base lo importa; jamás debe arrastrar `vendor-three`.
 * La CADENCIA (animación) vive en `creatures.css` (clases `rh-*`/`crt-*`); el
 * DIBUJO compone el KIT `_rubberhose.jsx`; el CLIMA→cuerpo, en
 * `creatureClimaCuerpo.js` (perfiles PERFIL_OSO/COLIBRI/RANA).
 */

/* La tinta cálida del contorno es de TODA la familia rubber-hose. */
export { RH_INK as FAUNA_TINTA } from './_rubberhose.jsx';

/* ── OSO ANDINO — Tremarctos ornatus (oso de anteojos, único oso de Suramérica).
   Pelaje pardo-negro, hocico y pecho crema, y los ANTEOJOS crema alrededor de
   los ojos: su firma. Entrañable y pesado. */
export const OSO_PALETA = {
  cuerpo: '#3b2a1e',       // pelaje pardo oscuro
  cuerpoGlow: 'rgba(90,64,44,0.7)',
  panza: '#5a4130',        // vientre un tono más cálido
  crema: '#f0dcb4',        // hocico, pecho y ANTEOJOS (el rasgo de la especie)
  cremaClara: '#fbeed0',   // realce del pecho
  hocico: '#241812',       // nariz/trufa
  oreja: '#2e2016',        // pabellón de la oreja
};
export const OSO_PROPORCION = {
  troncoRx: 10.2,
  troncoRy: 8.4,
  cabezaR: 6.8,
  orejaR: 2.7,
};

/* ── COLIBRÍ — Colibri coruscans (colibrí chillón / esmeralda andino).
   Dorso turquesa iridiscente, garganta violeta, vientre claro, pico recto y
   largo. Nervioso: alas que baten en borrón. */
export const COLIBRI_PALETA = {
  cuerpo: '#2fd6ab',       // dorso turquesa esmeralda
  cuerpoGlow: 'rgba(45,255,196,0.75)',
  vientre: '#d6fff0',      // pecho/vientre claro
  garganta: '#b28dff',     // gorguera violeta iridiscente (la firma)
  gargantaBrillo: '#d9c6ff',
  ala: '#59e0ff',          // ala en borrón (turquesa-cielo)
  alaClara: '#bff4ff',
  pico: '#241812',         // pico recto (tinta cálida)
  cola: '#26b894',         // timoneras
};
export const COLIBRI_PROPORCION = {
  troncoRx: 6.0,
  troncoRy: 4.6,
  cabezaR: 3.4,
  picoLargo: 9.0,
};

/* ── RANA — arlequín andina (Atelopus, del páramo). Anfibia: la más brillante
   mojada y la más golpeada por la seca. Verde húmedo dorsal con manchas
   arlequín ocre, vientre dorado, ojos saltones enormes y bocota de goma. */
export const RANA_PALETA = {
  cuerpo: '#4bbf6a',       // verde musgo húmedo
  cuerpoGlow: 'rgba(75,191,106,0.7)',
  vientre: '#f4d774',      // vientre dorado (arlequín)
  mancha: '#c9772e',       // manchas ocre del patrón arlequín
  manchaClara: '#e6a23c',
  papada: '#7fd98f',       // garganta que late
  dedo: '#f7e6a8',         // discos de los dedos (crema-dorado)
  parpado: '#3a9e57',      // párpado sobre el ojo saltón
};
export const RANA_PROPORCION = {
  troncoRx: 9.2,
  troncoRy: 6.2,
  ojoR: 2.9,
};
