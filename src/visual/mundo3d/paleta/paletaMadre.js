/*
 * paletaMadre — LA PALETA MADRE ANDINA de Chagra, con nombre y apellido.
 *
 * atmosferaMadre ya unificó la HORA (la luz dorada, los cielos por familia,
 * los 14 tonos low-poly). Pero cada mundo siguió inventando sus verdes, sus
 * cortezas y sus acentos por su cuenta: el bosque tiene ONCE verdes locales,
 * la sierra SEIS, el valle CUATRO — y ninguno sabe del otro. Este módulo NO
 * reemplaza nada de eso: lo EXTRAE de lo ya aprobado y lo vuelve vocabulario
 * común, para que el próximo mundo no invente el verde número treinta y dos.
 *
 * De dónde sale cada color (fuentes aprobadas, no gusto propio):
 *   - bosque/floraParamo.geom.js + entQuenua.geom.js  → verdes de páramo,
 *     plata de frailejón, cortezas, musgo, líquen.
 *   - sierra/GaleriaSierraArboles.jsx + arbolesMayores.js → el eje térmico
 *     cálido→nival, roca, laguna, nieve, guayacán.
 *   - mockups/valle/valleData.js (PISOS/CLIMAS)       → verdes por piso,
 *     luces por hora.
 *   - finca/fincaRealista.geom.js                     → maíz, café, tierras
 *     de labranza.
 *   - creatures/_faunaRubberTokens.js                 → los acentos de
 *     textil andino (cochinilla, maíz, índigo) y la tinta rubber-hose.
 *   - atmosferaMadre.js                               → sigue siendo la LEY
 *     de atmósfera; aquí se re-exporta para compra en un solo lugar.
 *
 * REGLA DE LA CASA (heredada de atmosferaMadre y ahora explícita):
 *   1. Los verdes andinos NO son saturados de tech: van del oliva del cálido
 *      al verde-plata del páramo, siempre con tierra adentro.
 *   2. El único azul con permiso es el AGUA (y el índigo de mortiño como
 *      acento textil). Cielos y sombras se resuelven con la atmósfera.
 *   3. No hay gris fabril puro: bajo el sol andino hasta el zinc se entibia.
 *   4. El rojo existe como cochinilla/café cereza (textil, fruto), nunca
 *      como rojo catástrofe de UI.
 *
 * Solo constantes y re-exports: cero costo por frame, cero three propio.
 */
import {
  ATMOSFERA,
  CIELOS,
  PALETA,
  BLOOM,
  mezclar,
  mezclarCielo,
} from '../atmosferaMadre.js';

/* Re-export: quien importa la paleta madre tiene TODO el sistema visual en un
   solo `from './paleta'` (atmósfera, cielos, tonos low-poly, bloom, mezcla). */
export { ATMOSFERA, CIELOS, PALETA, BLOOM, mezclar, mezclarCielo };

/* ------------------------------------------------------------------ */
/* VERDES — el eje térmico andino, de la tierra caliente al páramo.    */
/* La regla: a más altura, menos saturación y más plata/gris adentro   */
/* (así lo pinta la sierra aprobada y así se ve el páramo real).       */
/* ------------------------------------------------------------------ */
export const VERDES = {
  /* — piso cálido: oliva amarillento, pasto al sol — */
  calido: '#98ab4b', // sierra, banda del piso cálido
  calidoVivo: '#84a83f', // valle, piso cálido (verde cálido amarillento)

  /* — piso templado: el verde franco del trabajo — */
  templado: '#63a447', // sierra, banda templada
  templadoVivo: '#4e9143', // valle, piso templado (verde vivo)
  trabajo: '#5f8a3f', // = PALETA.follaje: surco, mata (el default del juego)
  brote: '#7a9a3f', // = PALETA.follajeClaro: brote, pasto al sol
  monte: '#3f6f3a', // = PALETA.follajeOscuro: copa en sombra

  /* — piso frío: se apaga hacia el azul-gris, sin volverse azul — */
  frio: '#3f7358', // sierra, banda fría (verde-azulado)
  frioVivo: '#3c7f64', // valle, piso frío
  aliso: '#4f6d3d', // bosque, hoja fresca de aliso

  /* — páramo: los verdes callados de la niebla — */
  paramoHoja: '#43593b', // bosque, hoja coriácea de roble
  paramoNiebla: '#3b5236', // bosque, copa oscura de encenillo (árbol de niebla)
  paramoMusgo: '#4c5c34', // bosque, musgo de piedra
  paramoMusgoClaro: '#5f6f42', // quenual, mechón de musgo de la barba
  paramoLiquen: '#9aa86a', // bosque, líquen pálido sobre roca
  paramoPlata: '#bcc6ac', // bosque, roseta plateada del frailejón (LA firma)
  paramoSage: '#aeb890', // quenual, liquen foliáceo pálido
  altoAndino: '#63807a', // valle, frío grisáceo del alto andino
};

/* El eje térmico como rampa ordenada (cálido → nival), para pintar altura,
   leyendas o gradientes sin re-inventar las paradas. Colores de la sierra. */
export const EJE_TERMICO = [
  { id: 'calido', color: VERDES.calido },
  { id: 'templado', color: VERDES.templado },
  { id: 'frio', color: VERDES.frio },
  { id: 'paramo', color: '#a5975c' }, // pajonal dorado-verdoso
  { id: 'superparamo', color: '#83836f' }, // roca con vida rala
  { id: 'nival', color: '#e9eef2' }, // el blanco azulado de la nieve
];

/* ------------------------------------------------------------------ */
/* TIERRAS Y ROCAS — el suelo que sostiene todo.                       */
/* ------------------------------------------------------------------ */
export const TIERRAS = {
  cacao: '#4a2a20', // quenual, fondo de grieta (la tierra más honda)
  siembra: '#6b4a2e', // = PALETA.tierra: cama de siembra, tierra removida
  camino: '#8a6a44', // = PALETA.tierraClara: suelo seco, camino de finca
  turba: '#5a3d28', // fauna, el suelo de la lombriz (tierra viva del páramo)
  pajonal: '#a5975c', // sierra, banda de páramo (paja dorada-verdosa)
  rocaSierra: '#6f6357', // sierra, el risco que asoma en lo empinado
  rocaParamo: '#7c7c70', // bosque, piedra con líquen
  piedra: '#9a8b74', // = PALETA.piedra: tanque, roca de río (gris pardo)
  vega: '#c9b593', // sierra, tierra clara de la vega baja
  arenaOrilla: '#e6d2a0', // sierra, playa de la laguna
};

/* ------------------------------------------------------------------ */
/* CORTEZAS — los troncos aprobados, por especie insignia.             */
/* ------------------------------------------------------------------ */
export const CORTEZAS = {
  quenual: '#8a4a33', // bosque, corteza rojiza madura del Ent quenual
  quenualPapel: '#cf9166', // bosque, lámina de papel que se despega (LA firma)
  sieteCueros: '#a5502e', // sierra, cobre que se descama
  sieteCuerosClaro: '#c9723f',
  encenillo: '#6d4535', // bosque, corteza rojiza del árbol de niebla
  roble: '#6a5c4a', // bosque, corteza gris-parda fisurada (la genérica digna)
  yarumo: '#bcbfb2', // bosque, tronco pálido anillado
  aliso: '#9a9a8f', // bosque, corteza gris clara
  raicilla: '#5a3b2b', // quenual, raicilla leñosa colgante
  /* madera TRABAJADA (poste, tabla, viga) → PALETA.madera/maderaClara/
     maderaOscura de atmosferaMadre; corteza VIVA → estas. */
};

/* ------------------------------------------------------------------ */
/* AGUAS — el único azul con permiso.                                  */
/* ------------------------------------------------------------------ */
export const AGUAS = {
  viva: '#3f8fb0', // = PALETA.agua: acequia, río (el acento azul del juego)
  lagunaHonda: '#5d8d97', // sierra, el centro de la laguna de páramo
  lagunaOrilla: '#a8cbb4', // sierra, la orilla verde-lechosa
  espuma: '#fdf7e8', // sierra, brillo del agua a contraluz
};

/* ------------------------------------------------------------------ */
/* NIEBLAS — la bruma andina por altitud (para fog y veladuras).       */
/* ------------------------------------------------------------------ */
export const NIEBLAS = {
  dorada: '#f0c98d', // = ATMOSFERA.niebla: la niebla madre del valle
  paramo: '#d6e0d2', // = CIELOS.ladera.fondo: bruma verde-plata, no celeste
  lechosa: '#fbf3df', // sierra, las veladuras de bruma entre planos
};

/* ------------------------------------------------------------------ */
/* LUCES — la luz andina con nombre (los hex que ya usan las escenas). */
/* Las INTENSIDADES y la receta viven en LuzMadre / cielosHoraData.    */
/* ------------------------------------------------------------------ */
export const LUCES = {
  sol: '#ffd79a', // = ATMOSFERA.luz: el sol bajo, dorado
  rellenoFrio: '#9db8d9', // = ATMOSFERA.relleno: cielo abierto opuesto al sol
  ambienteTibio: '#fff1d6', // sierra, el baño ambiente de la galería
  horizonte: '#ffe6ba', // sierra, el degradé bajo del cielo
  sombra: '#3a2a18', // = ATMOSFERA.sombra: tinte de sombra de contacto
  luna: '#b9c6e6', // cielosHora, la luna plata de la noche de páramo
  fogata: '#6b5638', // cielosHora, el relleno tibio nocturno
  candela: '#ffd28a', // valle, la pointLight de los hitos encendidos
};

/* ------------------------------------------------------------------ */
/* ACENTOS — textil andino y frutos: los ÚNICOS colores que gritan.    */
/* Se usan a cucharadas (una cinta, una baya, una flor), jamás a balde. */
/* ------------------------------------------------------------------ */
export const ACENTOS = {
  cochinilla: '#d1382b', // fauna, el rojo textil (mariquita)
  cafeCereza: '#c23227', // finca, la cereza madura del cafeto
  maizTextil: '#f4c542', // fauna, el rombo/chakana de las guardas
  maizGrano: '#e2c04c', // finca, el grano de la mazorca
  guayacan: '#f2c33a', // sierra, la flor dorada maciza del guayacán
  frailejonFlor: '#e0c24a', // bosque, los capítulos amarillos
  ambar: '#d9a13b', // = PALETA.ambar: señal, alerta amable (nunca rojo UI)
  indigo: '#33305c', // bosque, la baya del mortiño (el índigo textil)
  florDeMonte: '#e46b9b', // fauna, la flor que visita el abejorro
};

/* ------------------------------------------------------------------ */
/* NEUTROS — tinta, hueso, cal, nieve: los silencios de la paleta.     */
/* ------------------------------------------------------------------ */
export const NEUTROS = {
  tinta: '#241a10', // rubber-hose INK: negro cálido, nunca negro puro
  hueso: '#fff8ec', // rubber-hose HUESO: blanco de ojos y brillos
  cal: '#efe7d8', // = PALETA.cal: pared encalada
  nieve: '#f4f7fb', // sierra, la corona nival
  nival: '#e9eef2', // sierra, banda nival del terreno
  lamina: '#8b8578', // = PALETA.lamina: zinc, barril (gris CÁLIDO)
  concreto: '#a89a84', // = PALETA.concreto: obra civil entibiada
};
