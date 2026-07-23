/*
 * casaAdentro.geom — la GEOMETRÍA de LA CASA POR DENTRO: el interior de la
 * casa campesina andina del valle (la casa-ancla, "el punto de silencio").
 *
 * Un solo cuarto de tapia encalada con zócalo pintado, techo de teja VISTO
 * desde adentro (pares de madera, cumbrera, tirantes), piso de tierra pisada —
 * y adentro la vida de la casa de vereda:
 *
 *   · el FOGÓN DE LEÑA contra el muro, con su plancha ahumada, la boca de la
 *     candela, la leña rajada y el hollín que sube por la pared;
 *   · la MESA de comer al centro con sus taburetes, la totuma, el pocillo y
 *     las mazorcas del día;
 *   · el RINCÓN DE LOS FERMENTOS: el estante de madera donde los frascos
 *     trabajan callados (las posiciones se exportan; el vidrio lo pone la
 *     escena porque es material aparte);
 *   · la VENTANA DE LOS MUNDOS al fondo (el vano con postigos abiertos por
 *     donde la escena cuelga el resplandor-portal);
 *   · los objetos de finca: el costal de maíz, el sombrero en su clavo, el
 *     azadón recostado, la repisa con tarros y platos, el banco de la ventana;
 *   · la casa HABITADA (pasada Nolan): el ZARZO sobre el rincón del fogón
 *     (la troja de tablas donde el grano se cura con el humo), las ristras de
 *     mazorca colgando de su borde, la RUANA en el clavo junto a la puerta,
 *     el TIZNE del techo sobre el fogón (años de candela, no decoración) y el
 *     DESGASTE del piso de tierra por donde más se camina (puerta → mesa →
 *     fogón: la huella de la rutina, horneada en el color).
 *
 * La TEJA DE VIDRIO (la claraboya campesina: una teja translúcida entre las de
 * barro) se exporta como ancla (`TEJA_LUZ`) — el vidrio y su haz cenital son
 * material de la escena, aquí solo vive el punto del techo por donde entra.
 *
 * TÉCNICA (mismo contrato que invernadero.geom / floraCafetal.geom): todo lo
 * estático y opaco se FUSIONA en UNA geometría con el color horneado en
 * vertexColors → una sola draw-call para el cuarto entero. Lo transparente
 * (vidrio, humo, luz) y lo interactivo viven en la escena.
 *
 * ⚠️ mergeGeometries devuelve NULL EN SILENCIO si se mezclan geometrías
 * indexadas con no-indexadas (mordida conocida, mordió 2x): aquí TODO se
 * desindexa antes de fusionar y se TRUENA si aun así falla.
 *
 * Aquí viven SOLO los datos y las mallas (nada de WebGL): corre headless.
 */
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import {
  CASA,
  TIERRAS,
  ACENTOS,
  NEUTROS,
  VERDES,
  PALETA,
  mezclar,
} from '../paleta/paletaMadre.js';

/* -------------------------------------------------------------------------- */
/*  El cuarto (dimensiones compartidas entre muros, techo y escena)           */
/* -------------------------------------------------------------------------- */

/** El cuarto único de la casa: la cocina-comedor de toda casa de vereda. */
export const SALA = {
  ancho: 7.2, // x: -3.6 … 3.6 (el fogón al poniente, los fermentos al oriente)
  fondo: 5.6, // z: -2.8 … 2.8 (la puerta del valle mira a +z)
  alero: 2.5, // altura del muro donde arranca el techo
  cumbre: 3.75, // la cumbrera, al centro y a lo largo de x
  muro: 0.16, // espesor de la tapia
};

/* El vano de la puerta del valle (muro sur, +z) — por aquí "se entró". */
export const PUERTA = { x0: 0.62, x1: 1.58, alto: 1.95 };
/* La ventana de la luz (muro sur): por aquí entra el día. */
export const VENTANA_SUR = { x0: -2.2, x1: -1.3, base: 1.05, alto: 1.85 };
/* LA VENTANA DE LOS MUNDOS (muro norte, -z): el acceso a los portales. */
export const VENTANA_MUNDOS = { x0: -0.7, x1: 0.7, base: 0.95, alto: 2.05 };

/* Los sitios que la lección señala ([x, y, z] de mundo). */
export const SITIO_FOGON = [-2.55, 1.0, 0.2];
export const SITIO_LUZ = [-1.75, 0.85, 1.5];
export const SITIO_MESA = [0.45, 0.85, 0.15];
export const SITIO_FERMENTOS = [3.05, 1.05, -0.6];
export const SITIO_MUNDOS = [0, 1.5, -2.55];

/* LA TEJA DE VIDRIO: el punto del faldón norte por donde entra el haz cenital
   del mediodía (la claraboya de toda cocina campesina). `pos` es el centro de
   la teja sobre el plano del techo; `piso` es donde su charco cae. */
export const TEJA_LUZ = {
  pos: [-0.6, 3.34, -0.85],
  piso: [-0.6, 0.012, -0.85],
  ancho: 0.4,
  largo: 0.52,
};

/* -------------------------------------------------------------------------- */
/*  Paleta local (todo derivado de la paleta madre)                           */
/* -------------------------------------------------------------------------- */

const PAL = {
  encaladoSombra: mezclar(CASA.encalado, LADO_SOMBRA(), 0.14), // el muro en penumbra
  piso: mezclar(TIERRAS.siembra, TIERRAS.camino, 0.45), // tierra pisada
  estera: mezclar(TIERRAS.vega, ACENTOS.maizTextil, 0.12), // la estera tejida
  tejaAdentro: mezclar(CASA.tejaSombra, NEUTROS.tinta, 0.42), // teja vista desde abajo
  viga: CASA.madera,
  vigaOscura: mezclar(CASA.madera, NEUTROS.tinta, 0.3),
  tabla: PALETA.maderaClara ?? '#a9885f',
  adobe: mezclar(TIERRAS.arcilla, TIERRAS.siembra, 0.4), // la masa del fogón
  plancha: mezclar(NEUTROS.lamina, NEUTROS.tinta, 0.5), // plancha ahumada
  hollin: mezclar(CASA.encalado, NEUTROS.tinta, 0.72), // la mancha sobre el fogón
  barro: mezclar(TIERRAS.arcilla, NEUTROS.tinta, 0.28), // la olla de barro
  costal: mezclar(TIERRAS.vega, NEUTROS.cal, 0.3),
};

function LADO_SOMBRA() {
  return NEUTROS.tinta;
}

/* -------------------------------------------------------------------------- */
/*  Los FRASCOS del rincón de los fermentos (la escena pone el vidrio)        */
/* -------------------------------------------------------------------------- */

/* Cada frasco: posición del CENTRO del líquido, radio, alto del vidrio y el
   color del fermento (todos de la paleta madre — la chicha, el vinagre, el
   encurtido, el mortiño y el guarapo). */
export const FRASCOS = [
  { pos: [3.28, 0.96, -1.18], r: 0.095, h: 0.27, liquido: ACENTOS.ambar }, // chicha
  { pos: [3.3, 0.945, -0.78], r: 0.085, h: 0.24, liquido: CASA.teja }, // vinagre de plátano
  { pos: [3.27, 0.93, -0.34], r: 0.075, h: 0.21, liquido: VERDES.calido }, // encurtido
  { pos: [3.3, 1.45, -1.0], r: 0.08, h: 0.22, liquido: ACENTOS.indigo }, // mortiño
  { pos: [3.28, 1.44, -0.5], r: 0.07, h: 0.2, liquido: ACENTOS.maizGrano }, // guarapo
];

/* -------------------------------------------------------------------------- */
/*  El armado (helpers de horneado de color + desindexado)                    */
/* -------------------------------------------------------------------------- */

/** Hornea `color` como vertexColors en `geo` (desindexada) y la deja en lista. */
function poner(lista, geo, color, x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0) {
  let g = geo.index ? geo.toNonIndexed() : geo;
  if (rx) g.rotateX(rx);
  if (ry) g.rotateY(ry);
  if (rz) g.rotateZ(rz);
  g.translate(x, y, z);
  const c = new THREE.Color(color);
  const n = g.getAttribute('position').count;
  const arr = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) {
    arr[i * 3] = c.r;
    arr[i * 3 + 1] = c.g;
    arr[i * 3 + 2] = c.b;
  }
  g.setAttribute('color', new THREE.BufferAttribute(arr, 3));
  lista.push(g);
}

const caja = (w, h, d) => new THREE.BoxGeometry(w, h, d);
const cil = (rt, rb, h, seg = 8) => new THREE.CylinderGeometry(rt, rb, h, seg);
const esfera = (r, ws = 8, hs = 6) => new THREE.SphereGeometry(r, ws, hs);

/* Un tramo de muro sur/norte (a lo largo de x). */
function tramoMuro(lista, x0, x1, y0, y1, z, color) {
  const w = x1 - x0;
  const h = y1 - y0;
  if (w <= 0 || h <= 0) return;
  poner(lista, caja(w, h, SALA.muro), color, (x0 + x1) / 2, (y0 + y1) / 2, z);
}

/* -------------------------------------------------------------------------- */
/*  construirCasaAdentro — TODO el cuarto en una geometría                    */
/* -------------------------------------------------------------------------- */

/**
 * El interior completo, fusionado (vertexColors). `rico` (tier alto) suma los
 * detalles que no cambian la lectura: platos, ristra de maíz, más tarros.
 * @param {boolean} rico
 * @returns {THREE.BufferGeometry}
 */
export function construirCasaAdentro(rico = true) {
  const L = [];
  const { ancho, fondo, alero, cumbre, muro } = SALA;
  const hx = ancho / 2; // 3.6
  const hz = fondo / 2; // 2.8

  /* ── El piso de tierra pisada + la estera bajo la mesa ─────────────────── */
  poner(L, caja(ancho + 0.2, 0.14, fondo + 0.2), PAL.piso, 0, -0.07, 0);
  poner(L, cil(1.12, 1.12, 0.025, 14), PAL.estera, 0.45, 0.012, 0.15);

  /* ── Los muros (encalado en penumbra; los vanos se componen por tramos) ── */
  // muro poniente (el del fogón) y oriente (el de los fermentos), macizos
  poner(L, caja(muro, alero, fondo), PAL.encaladoSombra, -hx, alero / 2, 0);
  poner(L, caja(muro, alero, fondo), PAL.encaladoSombra, hx, alero / 2, 0);
  // muro sur (+z): puerta del valle + ventana de la luz
  tramoMuro(L, -hx, VENTANA_SUR.x0, 0, alero, hz, CASA.encalado);
  tramoMuro(L, VENTANA_SUR.x0, VENTANA_SUR.x1, 0, VENTANA_SUR.base, hz, CASA.encalado);
  tramoMuro(L, VENTANA_SUR.x0, VENTANA_SUR.x1, VENTANA_SUR.alto, alero, hz, CASA.encalado);
  tramoMuro(L, VENTANA_SUR.x1, PUERTA.x0, 0, alero, hz, CASA.encalado);
  tramoMuro(L, PUERTA.x0, PUERTA.x1, PUERTA.alto, alero, hz, CASA.encalado);
  tramoMuro(L, PUERTA.x1, hx, 0, alero, hz, CASA.encalado);
  // muro norte (-z): la ventana de los mundos al centro
  tramoMuro(L, -hx, VENTANA_MUNDOS.x0, 0, alero, -hz, CASA.encalado);
  tramoMuro(L, VENTANA_MUNDOS.x1, hx, 0, alero, -hz, CASA.encalado);
  tramoMuro(L, VENTANA_MUNDOS.x0, VENTANA_MUNDOS.x1, 0, VENTANA_MUNDOS.base, -hz, CASA.encalado);
  tramoMuro(L, VENTANA_MUNDOS.x0, VENTANA_MUNDOS.x1, VENTANA_MUNDOS.alto, alero, -hz, CASA.encalado);

  /* ── El zócalo pintado por dentro (la franja baja de toda casa de vereda) ─ */
  poner(L, caja(0.05, 0.32, fondo - 0.2), CASA.zocalo, -hx + muro / 2 + 0.03, 0.16, 0);
  poner(L, caja(0.05, 0.32, fondo - 0.2), CASA.zocalo, hx - muro / 2 - 0.03, 0.16, 0);
  poner(L, caja(ancho - 0.2, 0.32, 0.05), CASA.zocalo, 0, 0.16, -hz + muro / 2 + 0.03);
  poner(L, caja(PUERTA.x0 + hx - 0.1, 0.32, 0.05), CASA.zocalo, (PUERTA.x0 - hx) / 2, 0.16, hz - muro / 2 - 0.03);
  poner(L, caja(hx - PUERTA.x1 - 0.1, 0.32, 0.05), CASA.zocalo, (PUERTA.x1 + hx) / 2, 0.16, hz - muro / 2 - 0.03);

  /* ── Las culatas (los triángulos del muro bajo el techo, escalonados) ──── */
  for (const sx of [-1, 1]) {
    poner(L, caja(muro, 0.55, 4.3), PAL.encaladoSombra, sx * hx, alero + 0.275, 0);
    poner(L, caja(muro, 0.5, 2.5), PAL.encaladoSombra, sx * hx, alero + 0.8 + 0.25, 0);
    poner(L, caja(muro, 0.4, 1.1), PAL.encaladoSombra, sx * hx, alero + 1.3 + 0.2, 0);
  }

  /* ── El techo visto desde adentro: dos faldones, cumbrera, pares, tirantes ─ */
  const inclinacion = Math.atan2(cumbre - alero, hz + 0.1); // ~0.41 rad
  const faldon = Math.hypot(cumbre - alero, hz + 0.1) + 0.25;
  poner(L, caja(ancho + 0.5, 0.07, faldon), PAL.tejaAdentro, 0, (alero + cumbre) / 2, (hz + 0.1) / 2, inclinacion);
  poner(L, caja(ancho + 0.5, 0.07, faldon), PAL.tejaAdentro, 0, (alero + cumbre) / 2, -(hz + 0.1) / 2, -inclinacion);
  poner(L, caja(ancho + 0.3, 0.13, 0.15), PAL.vigaOscura, 0, cumbre - 0.09, 0);
  for (let i = 0; i < 6; i++) {
    const x = -3 + i * 1.2;
    poner(L, caja(0.08, 0.08, faldon - 0.3), PAL.viga, x, (alero + cumbre) / 2 - 0.09, (hz + 0.1) / 2, inclinacion);
    poner(L, caja(0.08, 0.08, faldon - 0.3), PAL.viga, x, (alero + cumbre) / 2 - 0.09, -(hz + 0.1) / 2, -inclinacion);
  }
  // los dos tirantes de lado a lado (de aquí cuelga la ristra)
  poner(L, caja(0.1, 0.12, fondo + 0.1), PAL.viga, -1.6, alero - 0.08, 0);
  poner(L, caja(0.1, 0.12, fondo + 0.1), PAL.viga, 1.6, alero - 0.08, 0);

  /* ── Los marcos de los vanos (madera y carpintería verde campesina) ────── */
  // puerta del valle: jambas + dintel + la hoja abierta recostada adentro
  poner(L, caja(0.09, PUERTA.alto, 0.12), CASA.madera, PUERTA.x0 - 0.04, PUERTA.alto / 2, hz);
  poner(L, caja(0.09, PUERTA.alto, 0.12), CASA.madera, PUERTA.x1 + 0.04, PUERTA.alto / 2, hz);
  poner(L, caja(PUERTA.x1 - PUERTA.x0 + 0.26, 0.11, 0.12), CASA.madera, (PUERTA.x0 + PUERTA.x1) / 2, PUERTA.alto + 0.05, hz);
  poner(L, caja(0.9, 1.82, 0.05), CASA.carpinteria, 2.12, 0.92, hz - 0.32, 0, 0.62, 0);
  // ventana de la luz: marco + alféizar
  marcoVentana(L, VENTANA_SUR, hz, CASA.carpinteria);
  // ventana de los mundos: marco + postigos abiertos contra el muro
  marcoVentana(L, VENTANA_MUNDOS, -hz, CASA.carpinteria);
  poner(L, caja(0.55, VENTANA_MUNDOS.alto - VENTANA_MUNDOS.base - 0.08, 0.045), CASA.carpinteria, VENTANA_MUNDOS.x0 - 0.38, (VENTANA_MUNDOS.base + VENTANA_MUNDOS.alto) / 2, -hz + 0.14, 0, -0.5, 0);
  poner(L, caja(0.55, VENTANA_MUNDOS.alto - VENTANA_MUNDOS.base - 0.08, 0.045), CASA.carpinteria, VENTANA_MUNDOS.x1 + 0.38, (VENTANA_MUNDOS.base + VENTANA_MUNDOS.alto) / 2, -hz + 0.14, 0, 0.5, 0);

  /* ── EL FOGÓN DE LEÑA (contra el muro poniente) ────────────────────────── */
  poner(L, caja(1.35, 0.82, 1.9), PAL.adobe, -2.88, 0.41, 0.2);
  poner(L, caja(1.42, 0.08, 1.96), PAL.plancha, -2.88, 0.86, 0.2);
  // la boca de la candela (el hueco negro donde vive el fuego)
  poner(L, caja(0.52, 0.42, 0.66), NEUTROS.tinta, -2.32, 0.34, 0.2);
  // el hollín que sube por la pared (la casa que SÍ cocina)
  poner(L, caja(0.035, 1.35, 1.5), PAL.hollin, -hx + muro / 2 + 0.02, 1.6, 0.2);
  // la leña rajada, apilada al pie
  for (let i = 0; i < 6; i++) {
    const fila = Math.floor(i / 3);
    poner(
      L,
      cil(0.065, 0.075, 0.62, 6),
      i % 2 ? PAL.vigaOscura : CASA.madera,
      -2.95 + (i % 3) * 0.17,
      0.085 + fila * 0.14,
      1.62,
      0,
      0,
      Math.PI / 2,
    );
  }
  // las ollas de barro sobre la plancha (dos puestas y una esperando)
  poner(L, esfera(0.21), PAL.barro, -2.72, 0.99, -0.25);
  poner(L, esfera(0.16), PAL.barro, -3.05, 0.96, 0.5);
  poner(L, cil(0.13, 0.16, 0.1, 9), PAL.barro, -2.6, 0.92, 0.72);

  /* ── LA MESA con sus taburetes (el centro de la casa) ──────────────────── */
  poner(L, caja(1.5, 0.07, 0.95), PAL.tabla, 0.45, 0.78, 0.15);
  for (const [dx, dz] of [[-0.66, -0.38], [0.66, -0.38], [-0.66, 0.38], [0.66, 0.38]]) {
    poner(L, caja(0.07, 0.75, 0.07), CASA.madera, 0.45 + dx, 0.375, 0.15 + dz);
  }
  // sobre la mesa: la totuma, el pocillo y las mazorcas del día
  poner(L, esfera(0.11, 9, 5), CASA.bejuco, 0.15, 0.845, 0.05);
  poner(L, cil(0.05, 0.04, 0.08, 8), CASA.carpinteria, 0.75, 0.855, 0.32);
  poner(L, cil(0.045, 0.055, 0.26, 7), ACENTOS.maizGrano, 0.85, 0.84, -0.08, 0, 0, Math.PI / 2.2);
  poner(L, cil(0.04, 0.05, 0.24, 7), ACENTOS.maizGrano, 0.68, 0.84, -0.18, 0, 0.6, Math.PI / 2.4);
  // los tres taburetes de tres patas
  for (const [tx, tz, giro] of [[-0.55, 0.85, 0.4], [1.5, -0.35, 1.2], [0.1, -0.75, 2.3]]) {
    poner(L, cil(0.19, 0.17, 0.06, 9), PAL.tabla, tx, 0.45, tz);
    for (let p = 0; p < 3; p++) {
      const a = giro + (p * Math.PI * 2) / 3;
      poner(L, cil(0.028, 0.034, 0.44, 6), CASA.madera, tx + Math.cos(a) * 0.12, 0.22, tz + Math.sin(a) * 0.12);
    }
  }

  /* ── EL RINCÓN DE LOS FERMENTOS (el estante del muro oriente) ──────────── */
  poner(L, caja(0.46, 0.05, 1.55), PAL.vigaOscura, 3.3, 0.8, -0.75);
  poner(L, caja(0.46, 0.05, 1.55), PAL.vigaOscura, 3.3, 1.3, -0.75);
  poner(L, caja(0.42, 1.42, 0.06), PAL.vigaOscura, 3.3, 0.71, -1.5);
  poner(L, caja(0.42, 1.42, 0.06), PAL.vigaOscura, 3.3, 0.71, 0.0);
  // las tapas de tela amarrada de los frascos (lo opaco; el vidrio es de la escena)
  for (const f of FRASCOS) {
    poner(L, cil(f.r + 0.02, f.r + 0.015, 0.035, 9), NEUTROS.cal, f.pos[0], f.pos[1] + f.h / 2 + 0.03, f.pos[2]);
  }

  /* ── Los objetos de finca ──────────────────────────────────────────────── */
  // el costal de maíz junto a la puerta
  poner(L, cil(0.24, 0.29, 0.6, 9), PAL.costal, -0.6, 0.3, 2.35);
  poner(L, cil(0.2, 0.24, 0.1, 9), ACENTOS.maizGrano, -0.6, 0.63, 2.35);
  // el sombrero aguadeño en su clavo, junto a la puerta
  poner(L, cil(0.02, 0.02, 0.1, 5), PAL.vigaOscura, 2.6, 1.78, hz - 0.12, Math.PI / 2);
  poner(L, cil(0.24, 0.26, 0.02, 12), mezclar(TIERRAS.vega, TIERRAS.arenaOrilla, 0.5), 2.6, 1.72, hz - 0.2, 0.35);
  poner(L, cil(0.12, 0.14, 0.13, 10), mezclar(TIERRAS.vega, TIERRAS.arenaOrilla, 0.5), 2.6, 1.78, hz - 0.24, 0.35);
  // el azadón recostado al rincón nororiente
  poner(L, cil(0.024, 0.028, 1.5, 6), CASA.madera, 3.32, 0.78, 2.2, 0, 0, 0.24);
  poner(L, caja(0.06, 0.2, 0.1), NEUTROS.lamina, 3.5, 0.12, 2.2);
  // el banco bajo la ventana de la luz
  poner(L, caja(0.85, 0.06, 0.3), PAL.tabla, -1.75, 0.42, 2.35);
  for (const [bx, bz] of [[-2.1, 2.25], [-1.4, 2.25], [-2.1, 2.45], [-1.4, 2.45]]) {
    poner(L, caja(0.05, 0.4, 0.05), CASA.madera, bx, 0.2, bz);
  }
  // la repisa de cocina (muro norte, del lado del fogón) con sus tarros
  poner(L, caja(1.5, 0.05, 0.35), CASA.madera, -2.2, 1.5, -hz + 0.26);
  poner(L, cil(0.09, 0.1, 0.22, 8), PAL.barro, -2.75, 1.64, -hz + 0.26);
  poner(L, cil(0.07, 0.08, 0.18, 8), PAL.barro, -2.45, 1.62, -hz + 0.24);
  poner(L, caja(0.14, 0.2, 0.14), NEUTROS.lamina, -2.1, 1.63, -hz + 0.27);
  // el pocillo esmaltado en la punta de la repisa (la loza de diario)
  poner(L, cil(0.05, 0.042, 0.09, 8), CASA.carpinteria, -1.68, 1.57, -hz + 0.28);

  /* ── LA COCINA VIVA (lo que toda cocina de humo cuelga y guarda) ───────── */
  // LA CUELGA del tirante del poniente: los manojos de hierbas boca abajo y
  // la ristra de ají — la despensa aérea, curándose al calor del fogón.
  // (ancho arriba y punta abajo: manojo amarrado, no pantalla de lámpara)
  for (const [cz, colHierba] of [[0.85, VERDES.aliso], [-0.12, VERDES.calido]]) {
    poner(L, cil(0.014, 0.014, 0.14, 5), PAL.vigaOscura, -1.6, 2.29, cz);
    poner(L, cil(0.095, 0.03, 0.26, 7), colHierba, -1.6, 2.09, cz);
    poner(L, cil(0.05, 0.014, 0.12, 6), mezclar(colHierba, NEUTROS.tinta, 0.25), -1.6, 1.92, cz);
  }
  poner(L, cil(0.012, 0.012, 0.5, 5), PAL.vigaOscura, -1.6, 2.11, 0.38);
  for (let i = 0; i < 5; i++) {
    poner(
      L,
      cil(0.042, 0.016, 0.1, 6),
      i % 2 ? ACENTOS.cochinilla : ACENTOS.cafeCereza,
      -1.615 + (i % 2) * 0.03,
      2.26 - i * 0.095,
      0.38 + (i % 2 ? -0.015 : 0.015),
    );
  }
  // LA PAILA y el CUCHARÓN de palo en el muro del fogón (a mano de la candela)
  poner(L, cil(0.17, 0.17, 0.035, 12), NEUTROS.lamina, -3.48, 1.72, 0.9, 0, 0, Math.PI / 2);
  poner(L, cil(0.016, 0.016, 0.34, 5), CASA.madera, -3.5, 1.6, 1.25);
  poner(L, esfera(0.045, 7, 5), CASA.madera, -3.5, 1.41, 1.25);
  // LAS PAPAS asomadas en el canasto de cosecha (que el canasto no esté vacío)
  for (const [px, pz] of [[-2.2, -1.85], [-2.08, -1.95], [-2.18, -1.98]]) {
    poner(L, esfera(0.07, 7, 5), TIERRAS.camino, px, 0.41, pz);
  }
  // EL PLATO DE AREPAS en la mesa (lo que la finca dio, servido)
  poner(L, cil(0.13, 0.13, 0.02, 10), NEUTROS.cal, 0.4, 0.825, 0.42);
  poner(L, cil(0.085, 0.085, 0.03, 9), mezclar(TIERRAS.vega, ACENTOS.maizGrano, 0.4), 0.37, 0.85, 0.44);
  poner(L, cil(0.08, 0.08, 0.03, 9), mezclar(TIERRAS.vega, ACENTOS.maizGrano, 0.55), 0.45, 0.875, 0.4);

  /* ── LA CASA HABITADA (pasada Nolan: historia, no catálogo) ────────────── */

  // EL ZARZO: la troja de tablas sobre el rincón noroccidental del fogón,
  // donde el grano se cura con el humo. Media agua nada más — la otra mitad
  // queda abierta para que el humo suba libre a la cumbrera.
  poner(L, caja(0.09, 0.09, 2.0), PAL.vigaOscura, -3.45, 2.46, -1.25); // durmiente del muro
  poner(L, caja(0.09, 0.09, 2.0), PAL.vigaOscura, -1.55, 2.46, -1.25); // viga del borde
  for (let i = 0; i < 5; i++) {
    // las tablas del zarzo, con sus rendijas (por ahí se cuela el humo)
    poner(L, caja(2.0, 0.045, 0.27), PAL.tabla, -2.5, 2.53, -2.1 + i * 0.42);
  }
  // lo que el zarzo guarda: el costal recostado y unas mazorcas al borde
  poner(L, cil(0.2, 0.24, 0.38, 9), PAL.costal, -2.95, 2.75, -1.35, 0, 0, 0.14);
  poner(L, cil(0.045, 0.055, 0.24, 7), ACENTOS.maizGrano, -1.85, 2.6, -1.0, 0, 0.4, Math.PI / 2.3);
  poner(L, cil(0.04, 0.05, 0.22, 7), ACENTOS.maizGrano, -2.1, 2.6, -1.72, 0, 1.1, Math.PI / 2.5);
  // las ristras colgando del borde del zarzo (el maíz al alcance y al humo)
  for (const rz of [-0.85, -1.65]) {
    poner(L, cil(0.012, 0.012, 0.34, 5), PAL.vigaOscura, -1.55, 2.28, rz);
    for (let i = 0; i < 3; i++) {
      poner(L, cil(0.042, 0.052, 0.2, 7), ACENTOS.maizGrano, -1.55, 2.12 - i * 0.22, rz + (i % 2) * 0.04);
      poner(L, cil(0.018, 0.032, 0.09, 6), VERDES.calido, -1.55, 2.25 - i * 0.22, rz + (i % 2) * 0.04);
    }
  }

  // LA RUANA en su clavo, junto a la puerta (se cuelga al entrar; lana de
  // oveja sin teñir con su franja cruda — la prenda es de quien vive aquí).
  const lanaRuana = mezclar(TIERRAS.turba, NEUTROS.tinta, 0.32);
  const franjaRuana = mezclar(NEUTROS.cal, TIERRAS.vega, 0.45);
  poner(L, cil(0.018, 0.018, 0.09, 5), PAL.vigaOscura, -0.35, 1.66, hz - 0.1, Math.PI / 2);
  poner(L, caja(0.4, 0.13, 0.11), lanaRuana, -0.35, 1.6, hz - 0.15); // el doblez sobre el clavo
  poner(L, caja(0.37, 0.55, 0.07), lanaRuana, -0.35, 1.28, hz - 0.17); // la caída
  poner(L, caja(0.375, 0.055, 0.075), franjaRuana, -0.35, 1.1, hz - 0.17); // la franja tejida
  poner(L, caja(0.375, 0.03, 0.075), franjaRuana, -0.35, 1.02, hz - 0.17); // el fleco

  // EL TIZNE del techo sobre el fogón: años de humo pegados a la teja y a los
  // pares — la mancha que cuenta cuántas ollas ha visto esta casa.
  const inclTizne = Math.atan2(cumbre - alero, hz + 0.1);
  poner(L, caja(1.7, 0.02, 2.1), mezclar(PAL.tejaAdentro, NEUTROS.tinta, 0.55), -2.7, (alero + cumbre) / 2 - 0.055, (hz + 0.1) / 2, inclTizne);
  poner(L, caja(1.7, 0.02, 2.1), mezclar(PAL.tejaAdentro, NEUTROS.tinta, 0.55), -2.7, (alero + cumbre) / 2 - 0.055, -(hz + 0.1) / 2, -inclTizne);
  poner(L, caja(1.5, 0.15, 0.17), mezclar(PAL.vigaOscura, NEUTROS.tinta, 0.5), -2.7, cumbre - 0.09, 0); // la cumbrera ahumada (envuelve la viga)

  // EL DESGASTE del piso: la tierra pisada brilla más clara por donde más se
  // camina — de la puerta a la mesa y de la mesa al fogón. La huella de vivir.
  const tierraPisada = mezclar(PAL.piso, TIERRAS.vega, 0.24);
  for (const [px, pz, pr] of [
    [1.1, 2.3, 0.42], // el umbral de la puerta
    [0.85, 1.55, 0.36],
    [0.55, 1.0, 0.34], // llegando a la mesa
    [-0.9, 0.5, 0.33],
    [-1.7, 0.35, 0.36], // camino al fogón
    [-2.15, 0.28, 0.4], // parado frente a la candela
  ]) {
    poner(L, cil(pr, pr, 0.012, 12), tierraPisada, px, 0.008, pz);
  }

  /* ── Los detalles del tier alto (no cambian la lectura, la abrigan) ────── */
  if (rico) {
    // los platos parados contra el muro de la repisa
    for (let i = 0; i < 3; i++) {
      poner(L, cil(0.115, 0.115, 0.015, 12), NEUTROS.cal, -1.85 + i * 0.26, 1.63, -hz + 0.2, 1.25);
    }
    // la ristra de maíz colgada del tirante
    for (let i = 0; i < 3; i++) {
      poner(L, cil(0.042, 0.052, 0.22, 7), ACENTOS.maizGrano, 1.6, 2.22 - i * 0.24, 0.8 + (i % 2) * 0.05);
      poner(L, cil(0.02, 0.035, 0.1, 6), VERDES.calido, 1.6, 2.36 - i * 0.24, 0.8 + (i % 2) * 0.05);
    }
    poner(L, cil(0.012, 0.012, 0.5, 5), PAL.vigaOscura, 1.6, 2.2, 0.82);
    // un segundo tramo de leña y la olla grande de la chicha junto al fogón
    poner(L, cil(0.24, 0.3, 0.42, 10), PAL.barro, -2.3, 0.21, -1.35);
    poner(L, cil(0.2, 0.24, 0.05, 10), PAL.tabla, -2.3, 0.45, -1.35);
  }

  const geo = mergeGeometries(L, false);
  if (!geo) {
    throw new Error('casaAdentro.geom: mergeGeometries devolvió null (¿mezcla indexada/no-indexada?)');
  }
  geo.computeVertexNormals();
  return geo;
}

/* Marco de ventana + alféizar (madera pintada) sobre un muro a lo largo de x. */
function marcoVentana(L, v, z, color) {
  const w = v.x1 - v.x0;
  const h = v.alto - v.base;
  const cx = (v.x0 + v.x1) / 2;
  poner(L, caja(0.07, h + 0.12, 0.14), color, v.x0 - 0.03, (v.base + v.alto) / 2, z);
  poner(L, caja(0.07, h + 0.12, 0.14), color, v.x1 + 0.03, (v.base + v.alto) / 2, z);
  poner(L, caja(w + 0.2, 0.07, 0.14), color, cx, v.alto + 0.03, z);
  poner(L, caja(w + 0.2, 0.09, 0.22), color, cx, v.base - 0.04, z);
}

/* -------------------------------------------------------------------------- */
/*  El canasto (aparte: cilindro abierto → DoubleSide, no se puede fusionar)  */
/* -------------------------------------------------------------------------- */

/** Posición del canasto de cosecha (junto al fogón). La escena pone la malla. */
export const CANASTO = { pos: [-2.15, 0.19, -1.9], rTop: 0.26, rBase: 0.18, h: 0.38 };
