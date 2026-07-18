/*
 * condorIdentidad — LA IDENTIDAD VISUAL DEL CÓNDOR, COMO DATOS.
 *
 * Hermano de `dantaIdentidad.js` / `faunaAndina.js`: el
 * CÓNDOR DE LOS ANDES (Vultur gryphus — el ave voladora más grande del mundo,
 * el emblema del páramo y del escudo) tiene aquí su silueta canónica.
 * Rubber-hose (Cuphead + Miss Minutes) con calidez campesina — el MISMO
 * lenguaje de goma de la abeja y la danta, otro animal y otro
 * CARÁCTER: MAJESTUOSO, paciente y de otra altura. EL SEÑOR DEL VIENTO:
 * casi nunca aletea — se DESLIZA en las térmicas con las alas planchadas,
 * y verlo cruzar el cielo es saber que el páramo está sano (carroñero
 * sagrado: limpia la montaña y cierra el ciclo).
 *
 * Su firma inconfundible es TRIPLE: las ALAS ENORMES con las plumas
 * primarias abiertas como DEDOS (hasta 3.3 m reales de envergadura), el
 * COLLAR BLANCO de plumón esponjoso (su ruana propia — jamás necesita otra)
 * y la CABEZA PELADA rosada con la cresta carnosa (la carúncula). Su color
 * de poder es el CELESTE DE ALTURA (el azul del cielo a 5000 msnm, el viento
 * del glaciar) — distinto del resto: dorado (abeja), verde-zen
 * (rana), iridiscente (colibrí), púrpura (jaguar), ámbar (ardilla), turquesa
 * (perezoso), bronce (morrocoy) y verde semilla (danta).
 *
 * REGLA DE ORO (idéntica a dantaIdentidad/faunaAndina): SOLO datos. Cero
 * three, cero react. La creature del bundle base lo importa; jamás debe
 * arrastrar `vendor-three`. La CADENCIA (animación) vive en `creatures.css`
 * (clases `rh-*`/`crt-*`/`condor-*`); el DIBUJO compone el KIT
 * `_rubberhose.jsx`; el CLIMA→cuerpo, en `creatureClimaCuerpo.js` con el
 * PERFIL_CONDOR de abajo. El aura de poder (celeste de altura) vive en
 * `transformacion.js` (AURA_POR_BICHO, fila 'condor'). VESTUARIO: el cóndor
 * NO lleva ruana ni sombrero — su collar de plumón ES su ruana (contrato
 * de altura: el rey del viento no se abriga, y a 5000 msnm nadie suda).
 */

/* La tinta cálida del contorno es de TODA la familia rubber-hose. */
export { RH_INK as CONDOR_TINTA } from './_rubberhose.jsx';

/* Slug estable del cóndor (data-creature, aura, perfiles). */
export const CONDOR_SLUG = 'condor';

/* ── CÓNDOR — Vultur gryphus (el cóndor de los Andes). Plumaje NEGRO
   AZABACHE con las coberteras PLATEADAS sobre el ala (la banda clara que
   relumbra al sol cuando planea), collar de plumón BLANCO, cabeza PELADA
   rosada-gris con la carúncula carnosa y el pico ganchudo marfil. Alas
   enormes de puntas digitadas. Paciente, imperturbable, de otra altura. */
export const CONDOR_PALETA = {
  cuerpo: '#23262b',        // plumaje negro azabache (con alma azulosa, no negro puro)
  cuerpoGlow: 'rgba(35,38,43,0.65)',
  ala: '#1d2023',           // el ala, un tono más honda (la sombra del planeo)
  cobertera: '#b9c4cc',     // la banda PLATEADA sobre el ala (su relumbre al sol)
  pluma: '#15181b',         // las primarias digitadas (los dedos del viento)
  collar: '#f6f1e3',        // el COLLAR BLANCO de plumón (su firma, su ruana propia)
  cabeza: '#c98d7a',        // la cabeza PELADA rosada-gris (su firma)
  caruncula: '#a85d4e',     // la cresta carnosa sobre el pico (el macho adulto)
  pico: '#e8dcc0',          // el pico ganchudo marfil
  picoPunta: '#8a7a5c',     // la punta del gancho, más honda
  cola: '#191c1f',          // el abanico corto de la cola
  cachete: '#b06a58',       // el rubor sobre la piel pelada (ternura rubber-hose)
  /* ── El señor del viento (el celeste de altura) ── */
  viento: '#9fd8ff',        // su aura de poder: el cielo a 5000 msnm
  rafaga: '#e2f3ff',        // el brillo de las corrientes (chispas de aire)
};

export const CONDOR_PROPORCION = {
  cuerpoRx: 5.0,            // el torso compacto (todo lo demás es ALA)
  cuerpoRy: 6.4,
  cabezaR: 3.0,             // la cabeza pelada, chica sobre el collar
  alaLargo: 19.5,           // media envergadura (las alas MANDAN en la silueta)
  primarias: 5,             // las plumas-dedo de cada punta
  colaLargo: 5.0,           // el abanico corto
};

/*
 * PERFIL_CONDOR — el perfil de CLIMA→cuerpo del cóndor para `cuerpoDeClima`
 * (creatureClimaCuerpo.js). Mismo shape que PERFIL_DANTA — se pasa vía la
 * opción `perfil`, así NO hay que tocar el archivo compartido (anti-conflicto).
 *   alas    false → su planeo es IMPERTURBABLE: ningún clima lo apura ni lo
 *                   frena (no hay aleteo continuo que acelerar — casi no aletea).
 *   humedad 0.3  → vuela POR ENCIMA de la lluvia: apenas lo salpica.
 *   difusa  0.6  → ave de lejos: la niebla sí se lo traga (aparece y se pierde).
 *   sequia  0.25 → planea igual con seca: el viento no se seca.
 */
export const PERFIL_CONDOR = Object.freeze({
  alas: false,
  humedad: 0.3,
  difusa: 0.6,
  sequia: 0.25,
});
