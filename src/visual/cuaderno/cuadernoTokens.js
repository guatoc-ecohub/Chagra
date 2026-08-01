/*
 * cuadernoTokens — el lenguaje visual de EL CUADERNO VIVO.
 *
 * El cuaderno es la columna educativa de Chagra hecha objeto: observar →
 * registrar → aprender. No es una libreta genérica con skin: es EL cuaderno
 * del campesino, y por eso hereda el ADN de la casa en vez de inventarlo:
 *
 *   - colores: CALCADOS de la paleta madre (`paleta/paletaMadre.js`) con la
 *     fuente comentada en cada uno — ni un hex nuevo sin pariente. Se calca
 *     en vez de importar porque `mezclar` de la paleta usa THREE.Color y
 *     este módulo es del BUNDLE BASE (DOM/SVG puro): mismo precedente que
 *     `artesaniaAndina.js`, que por eso define su PALETA_ANDINA local.
 *   - forma: las tres reglas de la artesanía andina (nada perfectamente
 *     recto, el remate se ve, la gravedad es la firma), aplicadas a papel,
 *     costura y tinta en vez de a guadua y fique.
 *   - trazo: `artesaniaAndina.js` (three-free) pone la línea que respira y
 *     el PRNG determinista — la misma página tiembla igual en cada visita.
 *
 * LA IDEA CENTRAL DE ESTE ARCHIVO: **la tinta tiene edad**. Lo recién
 * anotado se ve fresco (tinta honda, papel claro); lo del año pasado se ve
 * asentado; lo de hace años, desteñido pero legible. Así el tiempo largo —
 * la paciencia — se VE en el objeto, sin un solo contador ni barra.
 *
 * REGLA DURA (del operador, no negociable): CERO gamificación. Este módulo
 * no exporta puntos, rachas, medallas, niveles ni felicitaciones. El
 * cuaderno refleja; no premia. El fracaso es dato digno, nunca error rojo.
 */
import { TRAZO_ANDINO, rngArtesania } from '../mundo3d/artesaniaAndina.js';

export { rngArtesania, TRAZO_ANDINO };

/**
 * Mezcla sRGB pura (sin three): lerp por canal de `a` hacia `b` en `t`.
 * Gemela funcional de `mezclar` de la paleta madre para el bundle base;
 * los valores de abajo quedan PRECALCULADOS y comentados para que el CSS
 * espejo (`cuadernoVivo.css`) nunca diverja.
 * @param {string} a hex `#rrggbb`
 * @param {string} b hex `#rrggbb`
 * @param {number} t 0..1
 * @returns {string} hex `#rrggbb`
 */
export function mezclarHex(a, b, t) {
  const canal = (h, i) => parseInt(h.slice(i, i + 2), 16);
  const lerp = (i) => Math.round(canal(a, i) + (canal(b, i) - canal(a, i)) * t)
    .toString(16)
    .padStart(2, '0');
  return `#${lerp(1)}${lerp(3)}${lerp(5)}`;
}

/* Los padres calcados (fuente: paleta/paletaMadre.js y artesaniaAndina.js) */
const HUESO = '#f6efe0'; // PALETA_ANDINA.hueso — algodón claro
const VEGA = '#c9b593'; // TIERRAS.vega — la cabuya
const TINTA = '#241a10'; // NEUTROS.tinta — negro cálido, nunca #000
const ANIL = '#33507a'; // PALETA_ANDINA.anil — azul de añil
const COCHINILLA = '#d1382b'; // ACENTOS.cochinilla — rojo textil
const CAMINO = '#8a6a44'; // TIERRAS.camino — suelo seco de finca
const LAMINA = '#8b8578'; // NEUTROS.lamina — gris CÁLIDO de zinc
const ALISO = '#4f6d3d'; // VERDES.aliso — hoja fresca de aliso
const PARAMO_HOJA = '#43593b'; // VERDES.paramoHoja — hoja coriácea
const NIVAL = '#e9eef2'; // NEUTROS.nival — blanco azulado de nieve
const TRABAJO = '#5f8a3f'; // VERDES.trabajo — el verde default del juego
const INDIGO = '#33305c'; // ACENTOS.indigo — la baya del mortiño
const MAIZ = '#e2c04c'; // ACENTOS.maizGrano — el grano de la mazorca

/* ------------------------------------------------------------------ */
/* PAPEL — el cuaderno es de papel que vivió en el bolsillo de la      */
/* camisa: crudo, entibiado, jamás blanco de oficina.                  */
/* ------------------------------------------------------------------ */
export const PAPEL = {
  hoja: HUESO, // la hoja de hoy
  hojaVieja: mezclarHex(HUESO, VEGA, 0.28), // #e9dfca — hoja de años atrás, hacia la cabuya
  tapa: mezclarHex(VEGA, TINTA, 0.18), // #ab997b — cartón forrado en cabuya
  tapaOscura: mezclarHex(VEGA, TINTA, 0.42), // #84745c — el lomo, más manoseado
  renglon: mezclarHex(HUESO, ANIL, 0.16), // #d7d6d0 — el renglón azuloso del cuaderno escolar
  margen: mezclarHex(HUESO, COCHINILLA, 0.4), // #e7a698 — la línea roja de margen, ya destiñida
};

/* ------------------------------------------------------------------ */
/* TINTAS — la edad de lo escrito. La misma mano, distinto tiempo.     */
/* ------------------------------------------------------------------ */
export const TINTAS = {
  fresca: TINTA, // lo anotado esta temporada
  asentada: mezclarHex(TINTA, CAMINO, 0.32), // #453421 — el año pasado: la tinta ya se acomodó al papel
  destenida: mezclarHex(TINTA, VEGA, 0.55), // #7f6f58 — hace años: sepia digna, legible todavía
  eco: INDIGO, // la voz del cuaderno cuando devuelve algo (índigo textil, nunca rojo)
  lapiz: mezclarHex(TINTA, LAMINA, 0.5), // #585044 — apuntes al margen, a lápiz
};

/**
 * La tinta que corresponde a una edad en temporadas (0 = esta, 1 = la
 * pasada, 2+ = años atrás). El tiempo se pinta, no se cuenta.
 * @param {number} temporadas hace cuántas temporadas se escribió
 * @returns {string} color de tinta
 */
export function tintaPorEdad(temporadas = 0) {
  if (temporadas <= 0) return TINTAS.fresca;
  if (temporadas === 1) return TINTAS.asentada;
  return TINTAS.destenida;
}

/* ------------------------------------------------------------------ */
/* ACENTOS DEL CUADERNO — a cucharadas, como manda la paleta madre.    */
/* ------------------------------------------------------------------ */
export const ACENTO_CUADERNO = {
  hilo: VEGA, // la cabuya que cose el lomo
  hiloOscuro: mezclarHex(VEGA, TINTA, 0.35), // #8f7f65
  hojaPrensada: mezclarHex(ALISO, CAMINO, 0.55), // #6f6b41 — la hoja seca guardada entre páginas
  hojaPrensadaNervio: mezclarHex(PARAMO_HOJA, CAMINO, 0.6), // #6e6340
  hojaViva: TRABAJO, // el brote en los glifos de método
  escarcha: mezclarHex(NIVAL, ANIL, 0.22), // #c1cbd8 — el glifo de helada: frío sin azul chillón
  sol: MAIZ, // el glifo de sol: maíz, no amarillo tráfico
  lluvia: mezclarHex(ANIL, HUESO, 0.3), // #6e8099 — trazos de aguacero
};

/* ------------------------------------------------------------------ */
/* LA MANO — cuánto tiembla lo escrito. Continuo y bajito (la mano     */
/* corrige despacio), jamás ruido nervioso. Determinista por seed.     */
/* ------------------------------------------------------------------ */
export const MANO_CUADERNO = {
  giroMax: 0.9, // grados: cada página cuelga apenas torcida, como pegada a mano
  ondasSubrayado: 3, // el subrayado respira en pocas curvas largas
  amplitudSubrayado: 1.8, // px de vaivén (pariente de TRAZO_ANDINO.respiracion)
  grosor: TRAZO_ANDINO.grosor, // 3 — el trazo estructural rubber-hose
  fino: TRAZO_ANDINO.fino, // 1.4 — nervios, lluvia, detalles
};

/**
 * El giro de una página: −giroMax..+giroMax grados, determinista por seed.
 * La misma página cuelga igual torcida en cada visita (contrato artesanía).
 * @param {number} seed
 * @returns {number} grados
 */
export function giroDePagina(seed = 7) {
  const r = rngArtesania(seed);
  return (r() * 2 - 1) * MANO_CUADERNO.giroMax;
}
