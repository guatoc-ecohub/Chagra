/*
 * paletaLamina — la tinta y el papel de las láminas botánicas.
 *
 * NO inventa colores: baja de `mundo3d/paleta/paletaMadre` (VERDES por piso
 * térmico, TIERRAS, ACENTOS textiles, NEUTROS) y los traduce al oficio de la
 * lámina científica, que tiene reglas propias que el 3D no tiene:
 *
 *   1. EL PAPEL NO ES BLANCO. Es crema envejecido. El blanco puro sólo existe
 *      como brillo del lavado, jamás como fondo — un fondo blanco delata la
 *      pantalla y mata el pliego.
 *   2. LA TINTA NO ES NEGRA. Es agalla de hierro: parda cálida. Se hereda de
 *      NEUTROS.tinta ("negro cálido, nunca negro puro" — regla de la casa)
 *      y se aclara para los rótulos, que pesan menos que el dibujo.
 *   3. EL LAVADO ES BAJO. La acuarela botánica se aguada: los VERDES de la
 *      paleta madre entran al 55-75% sobre el papel, no a saturación plena.
 *      Un verde a balde convierte la lámina en caricatura.
 *   4. LOS ACENTOS GRITAN UNA VEZ. cochinilla/maízTextil/índigo son la baya,
 *      la flor, el grano — a cucharadas, como manda la paleta madre.
 *
 * La regla 4 tiene un corolario propio de esta librería: los colores de
 * ENFERMEDAD (roya naranja, gota parda, monilia harinosa) también son
 * acentos, y son los únicos que tienen permiso de romper el lavado — porque
 * la señal de la enfermedad ES el contenido de la lámina.
 */
import { VERDES, TIERRAS, ACENTOS, NEUTROS, CORTEZAS } from '../../../mundo3d/paleta/paletaMadre.js';

/* ------------------------------------------------------------------ */
/* PAPEL — el pliego.                                                  */
/* ------------------------------------------------------------------ */
export const PAPEL = {
  base: '#f6eeda', // crema de cuaderno (NEUTROS.cal entibiado)
  claro: '#fdf8ec', // el brillo del grano del papel
  sombra: '#e8dcc0', // la vela de sombra en el pliegue
  borde: '#d8c9a6', // filete del marco del pliego
  mancha: '#e2d3b0', // foxing: la mota parda del papel viejo
};

/* ------------------------------------------------------------------ */
/* TINTA — la plumilla. Jerarquía de peso, que es lo que da oficio.    */
/* ------------------------------------------------------------------ */
export const TINTA = {
  plena: NEUTROS.tinta, // '#241a10' — contorno principal
  media: '#4a3928', // nervadura secundaria, corte
  suave: '#6d5946', // puntillismo, tramado
  fantasma: '#8d7862', // línea de guía, cota, hilo del rótulo
  rotulo: '#3a2c1e', // el texto (pesa menos que el dibujo: nunca `plena`)
};

/* Jerarquía de grosor de plumilla. La lámina científica se lee por el PESO
   de la línea, no por el color: contorno > nervio > vena > punto. */
export const PLUMA = {
  contorno: 1.15,
  nervio: 0.7,
  vena: 0.4,
  vello: 0.28,
  hilo: 0.35, // hilo del rótulo (leader line)
  marco: 0.8,
};

/* ------------------------------------------------------------------ */
/* LAVADOS — la acuarela aguada, derivada de los VERDES madre.         */
/* ------------------------------------------------------------------ */
export const LAVADO = {
  /* haz y envés NO son el mismo verde: el envés siempre es más pálido y más
     gris. Dibujar los dos iguales es el error clásico del aficionado. */
  hazCalido: VERDES.calidoVivo,
  hazTemplado: VERDES.trabajo,
  hazFrio: VERDES.frio,
  hazOscuro: VERDES.monte,
  brote: VERDES.brote,
  envesCalido: '#b3c07e',
  envesTemplado: '#9fb183',
  envesFrio: '#8fa896',
  glauco: '#c3cfba', // el envés blanco-azulado (mora: Rubus *glaucus*)
  paramoPlata: VERDES.paramoPlata,
};

/* Verde de la mata según el piso térmico de la especie: el eje de la paleta
   madre (a más altura, menos saturación y más plata adentro). */
export const VERDE_POR_PISO = {
  calido: { haz: LAVADO.hazCalido, enves: LAVADO.envesCalido, sombra: '#5f7a2f' },
  templado: { haz: LAVADO.hazTemplado, enves: LAVADO.envesTemplado, sombra: '#3f5b25' },
  frio: { haz: LAVADO.hazFrio, enves: LAVADO.envesFrio, sombra: '#2f5544' },
};

/* ------------------------------------------------------------------ */
/* TIERRA Y MADERA — bajo la línea del suelo.                          */
/* ------------------------------------------------------------------ */
export const SUELO = {
  linea: TIERRAS.camino, // '#8a6a44'
  cuerpo: TIERRAS.siembra, // '#6b4a2e'
  hondo: TIERRAS.cacao, // '#4a2a20'
  raiz: '#c9ab7e', // la raíz viva es CLARA, no parda: contrasta con la tierra
  raizSombra: TIERRAS.raicilla || '#5a3b2b',
  corteza: CORTEZAS.roble, // '#6a5c4a'
  cortezaClara: '#8b7a63',
  pulpaClara: '#f0e2c0', // carne de tubérculo/raíz en corte
  pulpaAmarilla: '#e8c766', // arracacha amarilla, papa criolla
  pulpaBlanca: '#f4ecd8', // yuca
};

/* ------------------------------------------------------------------ */
/* ACENTOS DE FRUTO Y FLOR — los que gritan una vez.                   */
/* ------------------------------------------------------------------ */
export const FRUTO = {
  cereza: ACENTOS.cafeCereza, // '#c23227'
  cochinilla: ACENTOS.cochinilla,
  maiz: ACENTOS.maizGrano, // '#e2c04c'
  maizMorado: '#4a2c48', // maíz Negro de Páramo (antocianinas)
  ambar: ACENTOS.ambar,
  naranjaUchuva: '#e79a2b',
  moradoMora: '#3b1e33',
  indigo: ACENTOS.indigo,
  florDeMonte: ACENTOS.florDeMonte, // '#e46b9b' — curuba, tomate de árbol
  petalo: '#fbf6e8',
  antera: ACENTOS.maizTextil, // '#f4c542'
  verdeFruto: '#93a84f',
};

/* ------------------------------------------------------------------ */
/* SÍNTOMA — los únicos colores con permiso de romper el lavado.       */
/* Cada uno sale de una señal descrita en el corpus de plagas, no del  */
/* gusto: si el campesino ve "polvo naranja en el envés", este naranja */
/* es ESE naranja.                                                     */
/* ------------------------------------------------------------------ */
export const SINTOMA = {
  roya: '#d98324', // polvo naranja de Hemileia (envés)
  royaHalo: '#d9c85e', // la mancha amarilla translúcida del haz
  gota: '#2f3a25', // el negro-verdoso húmedo de Phytophthora
  gotaBorde: '#6b6a3a', // el borde difuso, aceitoso
  vellosidadBlanca: '#e9e6d6', // el moho blanco del envés en la mañana húmeda
  vellosidadGris: '#7d7590', // la vellosidad gris-morada del mildeo velloso
  alternaria: '#6b4426', // el pardo de los anillos concéntricos
  amarilleo: '#d8c250', // el halo amarillo de la clorosis
  necrosis: '#4b3624', // el tejido muerto, seco
  salmon: '#e08a63', // el centro rosado-salmón de la antracnosis
  hollin: '#2a2622', // fumagina/negrilla
  polvoNegro: '#241f1c', // las esporas del carbón del maíz
  harina: '#e8e2cf', // la capa polvorienta de la monilia
  algodon: '#f2efe4', // la cera algodonosa de la cochinilla
  plateado: '#b9bfb6', // el raspado de los trips
  galeria: '#efe9d2', // la galería del minador (tejido vaciado)
  vascular: '#5c3b22', // el anillo oscuro dentro del tallo
};

/* Re-export para que una lámina compre TODO desde un solo `from`. */
export { VERDES, TIERRAS, ACENTOS, NEUTROS, CORTEZAS };
