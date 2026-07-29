/*
 * paletaValle — LA LEY DEL LENGUAJE VISUAL DEL VALLE (datos puros, cero three).
 *
 * La auditoría visual del valle (AUDITORIA-VALLE.md, hallazgo 1.1) midió el
 * problema exacto: 321 materiales únicos, 712 colores hex, 288 usos de
 * flatShading contra 199 de sombreado suave y CUATRO modelos de material
 * (Standard, Lambert, Basic, Phong) compitiendo en el mismo cuadro. "Una
 * misma luz produce faceta, gradiente y color plano según quién construyó la
 * pieza. El ojo no interpreta variedad dentro de un lugar, sino activos de
 * bibliotecas distintas."
 *
 * Este módulo es la corrección #1: UNA ley, pocas decisiones, disciplina
 * total (la lente Nintendo: menos decisiones aplicadas con más rigor).
 * Son TRES reglas:
 *
 *   1. LA PALETA: 4 colores madre y 16 muestras aprobadas (abajo). Ningún
 *      material del valle usa un hex que no esté aquí. Los estados horarios
 *      transforman valor y temperatura DE ESTAS muestras vía la luz
 *      (CIELOS_HORA); jamás agregan paletas paralelas. Las variantes
 *      "*Sombra" horneadas desaparecen: la banda de sombra las produce.
 *   2. EL SOMBREADO: una sola familia de shader — rampa de TRES bandas
 *      (sombra / media / luz) compartida por todo material físico opaco,
 *      con variación POR COLOR de muestra, no por modelo de respuesta.
 *      flatShading queda PROHIBIDO: la banda es el lenguaje, no la faceta.
 *      La fábrica vive en ./materialValle.js.
 *   3. EL BORDE: el paisaje NO lleva contorno. Los habitantes (personas,
 *      animales) y los interactivos (portales, señales tocables) llevan
 *      contorno tinta de ~1.5 px de pantalla. Regla binaria, sin grosores
 *      por autor.
 *
 * TODO color de aquí se EXTRAE de la paleta madre aprobada
 * (../paleta/paletaMadre.js) — cero hex inventado. Este módulo restringe
 * aquel vocabulario al subconjunto del valle; no lo reemplaza.
 *
 * La verificación es visual: la HOJA DE PRUEBA (#/mockups/hoja-prueba-valle)
 * monta roca, árbol, casa, persona, animal y portal bajo las cinco franjas.
 * Ningún activo entra al valle si rompe las bandas o el borde en esa hoja.
 */
import {
  VERDES,
  TIERRAS,
  CORTEZAS,
  AGUAS,
  NIEBLAS,
  LUCES,
  CASA,
  NEUTROS,
  ACENTOS,
  PALETA,
} from '../paleta/paletaMadre.js';
import { mezclaHex } from '../cielosHoraData.js';

/* ------------------------------------------------------------------ */
/* 1. LOS CUATRO COLORES MADRE                                         */
/* Toda muestra del valle pertenece a UNA de estas cuatro familias.    */
/* Si una pieza no puede nombrar su madre, no entra a la escena.       */
/* ------------------------------------------------------------------ */
export const COLORES_MADRE = {
  /* la vida vegetal: del pasto al monte, siempre con tierra adentro */
  verde: VERDES.trabajo, // '#5f8a3f'
  /* el suelo y lo que sale de él: labranza, camino, corteza, teja, barro */
  tierra: TIERRAS.siembra, // '#6b4a2e'
  /* la luz hecha materia: muro encalado, piedra clara, hueso, espuma */
  cal: NEUTROS.cal, // '#efe7d8'
  /* el único azul con permiso: quebrada, acequia, estanque */
  agua: AGUAS.viva, // '#3f8fb0'
};

/* ------------------------------------------------------------------ */
/* 2. LAS DIECISÉIS MUESTRAS APROBADAS                                 */
/* Cada una: hex de la paleta madre (fuente comentada), color madre    */
/* al que pertenece y uso semántico. El esclavo de refactor mapea cada */
/* uno de los 712 hex del valle a la muestra más cercana — o lo borra. */
/* ------------------------------------------------------------------ */
export const MUESTRAS = {
  /* — familia verde — */
  follajeCerca: {
    hex: VERDES.trabajo, // '#5f8a3f' — el verde de trabajo del juego
    madre: 'verde',
    uso: 'copa y hoja del plano cercano y medio; el verde por defecto',
  },
  follajeLejos: {
    /* el monte del fondo, desaturado y enfriado hacia la bruma del páramo
       (auditoría 3.2: fondo 15%-25% menos saturado y más frío que el medio) */
    hex: mezclaHex(VERDES.monte, NIEBLAS.paramo, 0.3),
    madre: 'verde',
    uso: 'bosque y ladera a más de 25 u; nunca en primer plano',
  },
  pasto: {
    hex: VERDES.brote, // '#7a9a3f' — brote, pasto al sol
    madre: 'verde',
    uso: 'potrero, pradera, brizna de suelo',
  },
  cultivo: {
    hex: VERDES.templadoVivo, // '#4e9143' — el verde vivo del piso templado
    madre: 'verde',
    uso: 'surco trabajado, milpa, cafetal joven: lo sembrado por la mano',
  },

  /* — familia tierra — */
  tierraLabrada: {
    hex: TIERRAS.siembra, // '#6b4a2e' — cama de siembra
    madre: 'tierra',
    uso: 'era, surco abierto, tierra removida',
  },
  camino: {
    hex: TIERRAS.camino, // '#8a6a44' — suelo seco, camino de finca
    madre: 'tierra',
    uso: 'sendero, patio pisado, suelo seco',
  },
  corteza: {
    hex: CORTEZAS.roble, // '#6a5c4a' — la corteza gris-parda digna
    madre: 'tierra',
    uso: 'tronco vivo; variantes de especie SOLO desde CORTEZAS',
  },
  madera: {
    hex: PALETA.madera, // '#7a5a38' — poste, tabla, mango
    madre: 'tierra',
    uso: 'madera trabajada: cerca, banco, viga, herramienta',
  },
  teja: {
    hex: CASA.teja, // '#b0603f' — el faldón de la casa canónica
    madre: 'tierra',
    uso: 'cubierta de teja; SIN variante sombra: la banda la produce',
  },
  zocalo: {
    hex: CASA.zocalo, // '#a35a3c' — la franja pintada de toda casa de vereda
    madre: 'tierra',
    uso: 'zócalo de casa, matera de barro, ladrillo',
  },
  piel: {
    hex: TIERRAS.vega, // '#c9b593' — tierra clara de la vega
    madre: 'tierra',
    uso: 'piel de habitante 3D (persona); el SVG rubber-hose manda en 2D',
  },

  /* — familia cal — */
  encalado: {
    hex: CASA.encalado, // '#f3ecdc' — el muro de tapia encalada
    madre: 'cal',
    uso: 'muro de casa, tanque encalado',
  },
  piedra: {
    hex: TIERRAS.piedra, // '#9a8b74' — roca de río, tanque (gris pardo)
    madre: 'cal',
    uso: 'piedra suelta, roca de quebrada, cimiento',
  },
  roca: {
    hex: TIERRAS.rocaSierra, // '#6f6357' — el risco que asoma
    madre: 'cal',
    uso: 'afloramiento, risco de ladera, piedra grande',
  },
  carpinteria: {
    hex: CASA.carpinteria, // '#44685a' — el verde-aguamarina campesino
    madre: 'cal',
    uso: 'puerta y ventana pintadas, silla, cancel',
  },

  /* — familia agua — */
  agua: {
    hex: AGUAS.viva, // '#3f8fb0' — el acento azul del juego
    madre: 'agua',
    uso: 'quebrada, acequia, estanque; ÚNICO material transparente',
  },
};

/* Guardia de la ley: entre 12 y 16 muestras, jamás más. */
export const MUESTRAS_MIN = 12;
export const MUESTRAS_MAX = 16;

/* ------------------------------------------------------------------ */
/* 3. LOS EMISIVOS CON PERMISO                                         */
/* MeshBasicMaterial queda RESERVADO para lo realmente emisivo o       */
/* celeste (auditoría 1.1). Nada físico se dibuja sin responder a la   */
/* luz. Un emisivo fuera de esta lista es un halo sin fuente: se apaga.*/
/* ------------------------------------------------------------------ */
export const EMISIVOS = {
  ventana: CASA.ventana, // '#ffd9a0' — la luz cálida de "la casa espera"
  candela: LUCES.candela, // '#ffd28a' — el hito encendido
  luna: LUCES.luna, // '#b9c6e6' — la luna plata
  portal: CASA.ventana, // '#ffd9a0' — el corazón de la ventana-mundo
};

/* Los acentos (cochinilla, maíz, guayacán…) SIGUEN siendo de ACENTOS de la
   paleta madre: a cucharadas — una cinta, una flor, una baya — jamás una
   superficie. Regla de dosis: máximo UN acento por objeto y nunca más del
   5% del área visible de la pieza. */
export { ACENTOS };

/* ------------------------------------------------------------------ */
/* 4. LA RAMPA DE TRES BANDAS                                          */
/* Una sola respuesta a la luz para todo material físico opaco:        */
/* sombra / media / luz, con cortes duros (NearestFilter). Los tres    */
/* niveles son factores de luminancia sobre el color de la muestra.    */
/* La banda de sombra NO es negra: conserva el color (regla Ghibli /   */
/* BOTW: la sombra es color enfriado, no ausencia).                    */
/* ------------------------------------------------------------------ */
export const RAMPA_BANDAS = [0.42, 0.74, 1.0];

/* flatShading queda prohibido en el valle: la banda es el lenguaje.
   (288 usos actuales migran a suave; el relieve es geometría.) */
export const FLAT_SHADING_PROHIBIDO = true;

/* ------------------------------------------------------------------ */
/* 5. LA REGLA DE BORDE                                                */
/* Binaria, sin excepciones por autor:                                 */
/*   paisaje (terreno, vegetación, arquitectura, roca, agua) → SIN     */
/*   contorno. habitante (persona, animal) e interactivo (portal,      */
/*   señal tocable) → contorno tinta de ~1.5 px de pantalla.           */
/* La tinta es NEUTROS.tinta: negro cálido, nunca negro puro.          */
/* ------------------------------------------------------------------ */
export const REGLA_BORDE = {
  paisaje: null,
  habitante: { color: NEUTROS.tinta, grosorPx: 1.5 },
  interactivo: { color: NEUTROS.tinta, grosorPx: 1.5 },
};

/**
 * Grosor de contorno en unidades de mundo para que el borde mida
 * `grosorPx` píxeles a la distancia dada (cámara perspectiva).
 * El casco invertido usa este valor a la distancia del plano de autor;
 * es geometría fija, no post-proceso (barato en todos los tiers).
 * @param {number} distancia  distancia cámara→objeto en unidades
 * @param {number} fovDeg     fov vertical de la cámara en grados
 * @param {number} altoPx     alto del viewport en píxeles
 * @param {number} [grosorPx] grosor deseado en píxeles de pantalla
 */
export function grosorContornoMundo(
  distancia,
  fovDeg,
  altoPx,
  grosorPx = REGLA_BORDE.habitante.grosorPx,
) {
  const mundoPorPx = (2 * distancia * Math.tan((fovDeg * Math.PI) / 360)) / altoPx;
  return grosorPx * mundoPorPx;
}

/* ------------------------------------------------------------------ */
/* 6. LA RELACIÓN LUZ/RELLENO POR FRANJA                               */
/* La auditoría 4.1 midió relleno = 90% de la clave en TODAS las       */
/* franjas: cambia el tinte, no la estructura. Para que las tres       */
/* bandas EXISTAN, el relleno se desacopla de la clave. Estos son los  */
/* objetivos de la ley (relleno total / luz direccional):              */
/* ------------------------------------------------------------------ */
export const RELACION_LUZ = {
  amanecer: 0.4,
  manana: 0.55,
  mediodia: 0.55,
  tarde: 0.5,
  atardecer: 0.38,
  noche: 0.35,
};

/* Compensación de exposición al bajar el relleno (auditoría 4.1:
   "compensando exposición para no aplastar negros"). */
export const COMPENSACION_CLAVE = 1.15;

/* Reparto del presupuesto de relleno entre las luces de apoyo:
   el hemisferio modela (cielo/suelo), el ambiente levanta el toe,
   la direccional opuesta despega la silueta. Suman 1. */
export const REPARTO_RELLENO = { hemisferio: 0.6, ambiente: 0.25, contra: 0.15 };
