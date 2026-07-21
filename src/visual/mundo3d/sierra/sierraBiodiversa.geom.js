/*
 * sierraBiodiversa.geom — la BIODIVERSIDAD REAL del macizo de la Sierra 3D.
 *
 * ── POR QUÉ ESTE ARCHIVO ─────────────────────────────────────────────────────
 * La vista global cableada (`SierraMonte3D`, ruta `sierra_global`) sembraba la
 * ladera con TRES formas genéricas —"árbol frondoso genérico"— para cuatro pisos
 * térmicos completos, y CERO fauna. La auditoría de biodiversidad (2026-07-16) lo
 * marcó: baja fidelidad pese al volumen, y sin el cóndor —la especie más asociada
 * a la Sierra Nevada—. Este módulo trae la variedad REAL, reusando lo que el repo
 * ya modeló con nombre científico:
 *
 *   · Los CUATRO árboles mayores de `arbolMayor.geom.js` (los mismos de la
 *     galería huérfana `GaleriaSierraArboles`), cada uno en SU piso:
 *        ceiba/Ceiba pentandra ....... cálido   (<1000 m) — raíces tablares
 *        guayacán/Handroanthus ....... templado (1000–2000 m) — florece de oro
 *        roble andino/Quercus ........ frío     (2000–3000 m) — copa ancha
 *        queñua/Polylepis quadrijuga . filo del páramo — el bosque más alto
 *   · El FRAILEJÓN/Espeletia (roseta plateada + enagua) de `sierraMonte.geom.js`,
 *     coronando el páramo abierto, arriba de la queñua.
 *   · FAUNA ALTOANDINA REAL como billboards/geometría (la del imaginario de la
 *     Sierra): cóndor y oso de anteojos reusan los SVG rubber-hose de la casa
 *     (los monta `SierraMonte3D`); el VENADO (Odocoileus goudotii, venado
 *     coliblanco andino) y el ÁGUILA MORA (Geranoaetus melanoleucus, la rapaz
 *     que planea los páramos) van en geometría procedural mínima, aquí.
 *
 * ── CERO three-de-pantalla, cero React ──────────────────────────────────────
 * Solo three-core (geometría + color por vértice). Corre headless y lo consume
 * `SierraMonte3D.jsx`. Geometría FUSIONADA con `fusionarSeguro` (cierra la trampa
 * del null silencioso de mergeGeometries). Los conteos de vegetación se instancian
 * (un InstancedMesh por especie): densidad sin multiplicar draw-calls.
 *
 * ── REGLA DURA (biodiversidad) ───────────────────────────────────────────────
 * Especies REALES colombianas por piso térmico. Nada inventado: cada una lleva su
 * binomio y sale de un DR o de un módulo del repo con respaldo. La Sierra es
 * territorio sagrado y habitado (Kogui, Arhuaco/Iku, Wiwa, Kankuamo); la fauna se
 * representa con sobriedad, sin iconografía ceremonial.
 */
import * as THREE from 'three';
import {
  R_MONTE,
  alturaTerreno,
  pendienteTerreno,
  metrosDeY,
  geomFrailejon,
} from './sierraMonte.geom.js';
import { geomArbol } from './arbolMayor.geom.js';
import { rng, fusionarSeguro } from '../bosque/sombreadoVegetal.js';

const clamp = (v, a, b) => Math.min(b, Math.max(a, v));

/* -------------------------------------------------------------------------- */
/*  VEGETACIÓN — cinco especies reales, una geometría fusionada por especie     */
/* -------------------------------------------------------------------------- */

/* Cuántas matas de cada especie por tier. Son INSTANCIAS (cada especie es un
   solo InstancedMesh, una draw-call por más matas que haya). Los árboles reusan
   la geometría de `arbolMayor` con calidad de LOD (baja): de lejos, sobre el
   macizo, lo único que se lee es la silueta — el detalle fino sería plata tirada.
   'bajo' deja lo mínimo que aún lee "montaña con pisos". */
export const VEG_SIERRA_TIER = {
  alto: { ceiba: 30, guayacan: 52, roble: 66, quenua: 44, frailejon: 84 },
  medio: { ceiba: 16, guayacan: 28, roble: 36, quenua: 24, frailejon: 46 },
  bajo: { ceiba: 5, guayacan: 9, roble: 12, quenua: 9, frailejon: 18 },
};
export const vegSierraDeTier = (tier) => VEG_SIERRA_TIER[tier] || VEG_SIERRA_TIER.medio;

/* Detalle geométrico por tier. Se mapea a la `q` de arbolMayor/frailejón, pero
   TOPADO bajo: estos árboles son textura de ladera vistos de lejos, no héroes. */
export const CALIDAD_SIERRA = { alto: 0.5, medio: 0.42, bajo: 0.34 };
export const calidadSierra = (tier) => CALIDAD_SIERRA[tier] ?? CALIDAD_SIERRA.medio;

/**
 * Las cinco geometrías (una por especie), ya fusionadas y con color horneado.
 * Los cuatro árboles salen de `geomArbol` con `sss:false` (contraluz apagada):
 * las instancias giran libremente en Y y una luz horneada direccional mentiría
 * (§ROTACIÓN de arbolMayor.geom). El frailejón trae su propia roseta plateada.
 *
 * @param {number} q  calidad geométrica (calidadSierra(tier)).
 * @returns {{ceiba,guayacan,roble,quenua,frailejon: THREE.BufferGeometry}}
 */
export function geomsEspeciesSierra(q = 0.5) {
  return {
    ceiba: geomArbol('ceiba', { q, variante: 0, sss: false }),
    guayacan: geomArbol('guayacan', { q, variante: 1, sss: false }),
    roble: geomArbol('roble', { q, variante: 0, sss: false }),
    quenua: geomArbol('quenua', { q, variante: 2, sss: false }),
    frailejon: geomFrailejon(q, 11),
  };
}

/* Banda de altitud REAL de cada especie (metros). La queñua y el frailejón se
   solapan a propósito (3150–3650): en el páramo real los bosquecillos de
   Polylepis salpican el frailejonal — no son bandas limpias. */
const BANDA_ESP = {
  ceiba: [640, 1000],
  guayacan: [1000, 2000],
  roble: [2000, 3050],
  quenua: [3050, 3650], // el filo: el bosque más alto del mundo
  frailejon: [3150, 3900], // el páramo abierto, coronando la queñua
};

/* Escala por especie: la geometría de arbolMayor mide 1.5–3.2 en su espacio
   local; aquí todo aterriza en ~0.3–0.5 unidades de mundo — la vegetación es
   textura de un macizo de ~10, no protagonista. La ceiba y el roble, emergentes,
   salen un pelo más grandes; la queñua, achaparrada por el viento del filo. */
const ESCALA_ESP = {
  ceiba: [0.13, 0.18],
  guayacan: [0.14, 0.2],
  roble: [0.14, 0.2],
  quenua: [0.19, 0.28],
  frailejon: [0.24, 0.4],
};

const CLAVES_ESP = ['ceiba', 'guayacan', 'roble', 'quenua', 'frailejon'];

/**
 * Reparte las matas sobre la superficie del macizo por RECHAZO, cada especie en
 * su banda de altitud real. Como la ladera tiene relieve, el bosque se acomoda
 * siguiendo las curvas de nivel (sube por vaguadas, se corta en los filos): nadie
 * dibuja ese contorno, sale de cruzar la banda con el terreno. Evita las paredes
 * empinadas, la orilla del mar y la corona nevada. Donde dos especies aceptan la
 * misma altura (queñua/frailejón), se sortea entre ellas: quedan entreveradas.
 *
 * @param {{ceiba,guayacan,roble,quenua,frailejon:number}} conteos
 * @param {number} [seed]
 * @returns {Record<string, Array<{pos:number[],rotY:number,escala:number,tint:number[]}>>}
 */
export function distribuirEspeciesReales(conteos, seed = 909) {
  const r = rng(seed);
  const out = {};
  const cap = {};
  for (const k of CLAVES_ESP) {
    out[k] = [];
    cap[k] = conteos[k] || 0;
  }
  const total = CLAVES_ESP.reduce((s, k) => s + cap[k], 0);
  const lleno = () => CLAVES_ESP.every((k) => out[k].length >= cap[k]);

  let intentos = 0;
  const maxIntentos = total * 60 + 400;
  while (!lleno() && intentos < maxIntentos) {
    intentos++;
    const ang = r() * Math.PI * 2;
    // radio en el CUERPO del macizo (ni el pico, ni el faldón raso del mar)
    const rn = 0.16 + Math.sqrt(r()) * 0.66;
    const rad = rn * R_MONTE;
    const x = Math.cos(ang) * rad;
    const z = Math.sin(ang) * rad;
    const y = alturaTerreno(x, z);
    const m = metrosDeY(y);
    if (m < 620 || m > 3950) continue; // sobre la orilla, bajo la corona
    if (pendienteTerreno(x, z) > 0.6) continue; // no en las paredes

    // ¿qué especies (con cupo libre) aceptan esta altura?
    const candidatas = CLAVES_ESP.filter(
      (k) => out[k].length < cap[k] && m >= BANDA_ESP[k][0] && m < BANDA_ESP[k][1],
    );
    if (!candidatas.length) continue;
    const esp = candidatas[Math.floor(r() * candidatas.length) % candidatas.length];

    const [e0, e1] = ESCALA_ESP[esp];
    out[esp].push({
      pos: [x, y - 0.03, z],
      rotY: r() * Math.PI * 2,
      escala: e0 + r() * (e1 - e0),
      // variación de color por instancia (que no haya dos matas iguales)
      tint: [0.88 + r() * 0.2, 0.9 + r() * 0.16, 0.88 + r() * 0.18],
    });
  }
  return out;
}

/* -------------------------------------------------------------------------- */
/*  FAUNA ALTOANDINA — geometría procedural mínima                              */
/* -------------------------------------------------------------------------- */

/*
 * El VENADO COLIBLANCO ANDINO (Odocoileus goudotii, la subespecie de páramo del
 * venado de cola blanca). Pace en el frío/páramo. Cuerpo tostado, vientre y cara
 * claros; la firma es la COLA BLANCA (va como pieza aparte, en el render). El
 * cuerpo entero es UNA geometría fusionada (fusionarSeguro); las patas van aparte
 * en el render porque se mecen al pacer. Mira hacia +x.
 */
export function geomVenadoCuerpo() {
  const tostado = new THREE.Color('#8a6a44');
  const partes = [];
  const push = (g, c) => {
    const col = c || tostado;
    const arr = new Float32Array(g.getAttribute('position').count * 3);
    for (let i = 0; i < arr.length; i += 3) {
      arr[i] = col.r;
      arr[i + 1] = col.g;
      arr[i + 2] = col.b;
    }
    g.setAttribute('color', new THREE.BufferAttribute(arr, 3));
    partes.push(g);
  };

  const cuerpo = new THREE.SphereGeometry(0.4, 9, 7);
  cuerpo.scale(1.5, 0.95, 0.72);
  cuerpo.translate(0, 0.98, 0);
  push(cuerpo);

  const grupa = new THREE.SphereGeometry(0.32, 8, 6);
  grupa.scale(1.05, 1, 0.9);
  grupa.translate(-0.5, 1.0, 0);
  push(grupa);

  const cuello = new THREE.CylinderGeometry(0.1, 0.16, 0.64, 7);
  cuello.rotateZ(-0.72);
  cuello.translate(0.62, 1.4, 0);
  push(cuello);

  const cabeza = new THREE.SphereGeometry(0.15, 8, 6);
  cabeza.scale(1.3, 1, 0.85);
  cabeza.translate(0.86, 1.68, 0);
  push(cabeza);

  // hocico y cara claros (la máscara pálida del coliblanco)
  const claro = new THREE.Color('#c9ad82');
  const hocico = new THREE.ConeGeometry(0.075, 0.26, 6);
  hocico.rotateZ(-Math.PI / 2);
  hocico.translate(1.08, 1.62, 0);
  push(hocico, claro);

  // orejas grandes (venado alerta)
  const orejaIzq = new THREE.ConeGeometry(0.055, 0.24, 5);
  orejaIzq.rotateZ(0.4);
  orejaIzq.translate(0.76, 1.9, 0.1);
  push(orejaIzq);
  const orejaDer = orejaIzq.clone();
  orejaDer.translate(0, 0, -0.2);
  push(orejaDer);

  return fusionarSeguro(partes, 'venado-cuerpo');
}

/** Una pata del venado, con el pivote arriba (en la cadera) para que columpie. */
export function geomVenadoPata() {
  const g = new THREE.CylinderGeometry(0.042, 0.03, 0.74, 5);
  g.translate(0, -0.37, 0);
  return g;
}

/*
 * El ÁGUILA MORA (Geranoaetus melanoleucus, águila real de páramo): la rapaz que
 * planea en círculos los altos de la Sierra. Silueta oscura de alas anchas y cola
 * corta en cuña (distinta del cóndor: sin gorguera blanca, más pequeña, cola
 * corta). Cuerpo + cabeza fusionados; las alas van aparte en el render (baten de
 * tanto en tanto). Mira hacia +x (rumbo del vuelo).
 */
export function geomAguilaCuerpo() {
  const oscuro = new THREE.Color('#3a3d42');
  const partes = [];
  const push = (g, c) => {
    const col = c || oscuro;
    const arr = new Float32Array(g.getAttribute('position').count * 3);
    for (let i = 0; i < arr.length; i += 3) {
      arr[i] = col.r;
      arr[i + 1] = col.g;
      arr[i + 2] = col.b;
    }
    g.setAttribute('color', new THREE.BufferAttribute(arr, 3));
    partes.push(g);
  };

  const cuerpo = new THREE.SphereGeometry(0.16, 8, 6);
  cuerpo.scale(0.9, 0.85, 2.3); // fuselado a lo largo del vuelo (+z local → giro en render)
  push(cuerpo);

  const cabeza = new THREE.SphereGeometry(0.1, 7, 6);
  cabeza.translate(0, 0.02, 0.34);
  push(cabeza);

  // pico corto y ganchudo
  const pico = new THREE.ConeGeometry(0.04, 0.12, 5);
  pico.rotateX(Math.PI / 2);
  pico.translate(0, 0, 0.44);
  push(pico, new THREE.Color('#d8b23a'));

  // cola corta en cuña (la firma que la separa del cóndor)
  const cola = new THREE.ConeGeometry(0.14, 0.4, 4);
  cola.rotateX(-Math.PI / 2);
  cola.translate(0, 0, -0.44);
  push(cola);

  return fusionarSeguro(partes, 'aguila-cuerpo');
}

/**
 * Un ala del águila: plano barrido con la punta digitada (las primarias abiertas
 * como dedos de rapaz). Va acostada, con el pivote en el hombro (x=0) para batir
 * desde el cuerpo. `lado` = +1 ala derecha (se extiende hacia +x), −1 izquierda
 * (espejo hacia −x). Devuelve una geometría plana pintada (se aclara a la punta).
 *
 * @param {1|-1} [lado]
 */
export function geomAguilaAla(lado = 1) {
  const oscuro = new THREE.Color('#33363b');
  const claro = new THREE.Color('#6b6a5e'); // el pálido de la cubierta alar
  // trapecio barrido: ancho en el hombro, angosto y retrasado en la punta
  const forma = new THREE.Shape();
  forma.moveTo(0, 0.14);
  forma.lineTo(0, -0.14);
  forma.lineTo(0.92, -0.34);
  forma.lineTo(1.02, -0.24);
  forma.lineTo(0.98, -0.12); // muescas de las primarias digitadas
  forma.lineTo(1.04, -0.04);
  forma.lineTo(0.9, 0.06);
  forma.closePath();
  const g = new THREE.ShapeGeometry(forma);
  g.rotateX(-Math.PI / 2); // acostada (plano del vuelo)
  if (lado < 0) g.scale(-1, 1, 1); // ala izquierda: espejo (side:DoubleSide la salva)
  const pos = g.getAttribute('position');
  const arr = new Float32Array(pos.count * 3);
  const tmp = new THREE.Color();
  for (let i = 0; i < pos.count; i++) {
    const x = Math.abs(pos.getX(i));
    tmp.copy(oscuro).lerp(claro, clamp(x, 0, 1) * 0.5); // se aclara hacia la punta
    arr[i * 3] = tmp.r;
    arr[i * 3 + 1] = tmp.g;
    arr[i * 3 + 2] = tmp.b;
  }
  g.setAttribute('color', new THREE.BufferAttribute(arr, 3));
  return g;
}
