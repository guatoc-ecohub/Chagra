/*
 * LaderaAltaValle — las TERRAZAS DE TIERRA FRÍA de la ladera alta del valle.
 *
 * La ladera alta (la banda del clima frío, entre el cafetal y el frailejonal)
 * se veía VACÍA: un plano verde-azulado sin una seña de trabajo humano. Pero
 * esa franja es EL corazón agrícola del alto andino colombiano: el lote de
 * tubérculos a curva de nivel. Este componente la llena con verdad
 * agroecológica, no con confeti:
 *
 *   · TERRAZAS a curva de nivel — camellones de tierra (bermas medio
 *     enterradas) que siguen la horizontal de la ladera, como se banquea de
 *     verdad un lote pendiente. La estructura se lee de lejos: líneas de
 *     cultivo, no manchas al azar.
 *   · POLICULTIVO del frío (regla dura ANTI-MONOCULTIVO): cada terraza
 *     entrevera DOS cultivos en golpes alternados (papa criolla, haba, cubio/
 *     ulluco, arracacha) y una terraza entera descansa en BARBECHO (tierra
 *     abierta + paja) — rotación real, ningún surco uniforme. Las escalas
 *     varían por terraza (la de arriba está recién sembrada: matas jóvenes).
 *   · ESTRUCTURA del paisaje alto — cerca de piedra en el lindero bajo y el
 *     costado, un camino de tierra que SUBE culebreando entre terrazas, y un
 *     abrigo de piedra con techo pajizo en la esquina alta del lote.
 *   · VIDA entreverada — pajonal (macollos de paja), mortiño y romerillo
 *     subiendo hacia el frailejonal (COMPLEMENTAN el páramo denso existente,
 *     no lo duplican: aquí NO hay frailejones) y tres ovejas quietas pastando
 *     junto al abrigo.
 *
 * Reusa las mallas del mundo papa (floraPapa.geom: mata, flor, paja, montículo,
 * piedra) y del páramo (floraParamo.geom: mortiño, romerillo, roca); solo el
 * haba, el cubio, la arracacha, la oveja y el abrigo son geometría nueva —
 * low-poly, horneada offline con vertexColors, mismo contrato visual.
 *
 * Presupuesto (tier-safe): una geometría por especie → un InstancedMesh
 * (BancoValle). Todo lo fijo (terrazas / camino / abrigo) va FUSIONADO en una
 * malla cada uno. ~15 draw-calls en alto, ~11 en bajo. Siembra determinista.
 * SIN animación (paisaje quieto): trivial con reducedMotion y en tier bajo.
 *
 * Cableado (lo hace el host — este archivo NO toca la escena):
 *   <LaderaAltaValle alturaDe={alturaTerreno} tier={tier} nocturno={nocturno} />
 */
import { useLayoutEffect, useMemo } from 'react';
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import {
  geomMataPapa,
  geomFlorPapa,
  geomPaja,
  geomMonticulo,
  geomPiedra,
} from '../../visual/mundo3d/papa/floraPapa.geom.js';
import {
  geomMortino,
  geomRomerillo,
  geomRoca,
} from '../../visual/mundo3d/bosque/floraParamo.geom.js';
import {
  rngDe,
  cajaDe,
  nucleoZona,
  enClaro,
  sembrarLote,
  tintarLote,
} from './siembraValle.js';
import { Banco } from './BancoValle.jsx';

/* ── LA ZONA: la banda del clima frío IZQUIERDA (z −5.2…−0.6), hoy vacía.
      [0] = el lote grande de terrazas; [1] = la falda baja hacia la quebrada
      (siembra suelta, sin terrazas: un desmonte más joven). No pisa el bosque
      de la ladera derecha (x≥3), ni el frailejonal (z≤−5.2), ni el cafetal
      (z≥1.6). ── */
export const ZONA_LADERA_ALTA = [
  { cx: -5.0, cz: -3.1, rx: 3.8, rz: 2.1 },
  { cx: -1.9, cz: -1.9, rx: 1.7, rz: 1.3 },
];

/* La franja de VIDA de altura: el filo entre el lote y el frailejonal (pajonal
   que sube) + el parchecito a la derecha de la quebrada, bajo la falda del
   bosque. Complementa el páramo denso: aquí no se siembra frailejón. */
export const ZONA_VIDA_ALTA = [
  { cx: -4.6, cz: -4.95, rx: 3.4, rz: 0.55 },
  { cx: 1.7, cz: -3.1, rx: 1.1, rz: 1.5 },
];

/* Claros duros: lo ya puesto por otros. La quebrada baja por x≈−1…0.3 en esta
   banda (tres claros siguen su cauce); el portal del clima (veleta) vive en el
   filo (−3.2,−6.0); las dos matas de muestra del piso frío (VEGETACION_PISOS)
   se respetan; y el abrigo de piedra reserva su propio patio. */
export const CLAROS_LADERA_ALTA = [
  { x: 0.0, z: -2.0, r: 0.85 },
  { x: -0.5, z: -3.2, r: 0.85 },
  { x: -1.1, z: -4.1, r: 0.85 },
  { x: -3.2, z: -5.7, r: 1.5 },
  { x: -6.0, z: -3.6, r: 0.75 },
  { x: -7.6, z: -2.4, r: 0.75 },
  { x: -6.8, z: -4.5, r: 0.95 },
];

/* El abrigo de piedra (esquina alta del lote) y sus ovejas. */
const SITIO_ABRIGO = { x: -6.8, z: -4.5, rotY: 0.55 };
const SITIOS_OVEJA = [
  { x: -7.5, z: -3.35, rotY: 0.4, escala: 1.15 },
  { x: -7.0, z: -2.95, rotY: 2.4, escala: 1.0 },
  { x: -7.95, z: -2.6, rotY: 1.2, escala: 1.08 },
];

/* Las terrazas: nivel z de cada camellón (curva de nivel ≈ z constante en este
   terreno) + la MEZCLA de cada una. Ninguna repite mezcla y una descansa
   (barbecho) → rotación real, cero monocultivo. La de arriba va JOVEN. */
const TERRAZAS = [
  { z: -1.55, mezcla: ['papa', 'arracacha'], esc: [0.82, 1.15] },
  { z: -2.3, mezcla: ['haba', 'papa'], esc: [0.8, 1.12] },
  { z: -3.05, mezcla: ['barbecho', 'barbecho'], esc: [0.75, 1.0] },
  { z: -3.8, mezcla: ['cubio', 'haba'], esc: [0.78, 1.1] },
  { z: -4.5, mezcla: ['papa', 'cubio'], esc: [0.5, 0.68] }, // recién sembrada
];

/* Presupuesto por tier. `paso` = distancia entre golpes de siembra en la
   terraza; `filas` recorta terrazas en bajo; `q` = detalle de las mallas. */
const CUPOS_TIER = {
  alto: {
    filas: 5, paso: 0.5, flores: true, ovejas: 3, cerca: 44, piedrasSueltas: 4,
    faldaPapa: 6, faldaCubio: 5, faldaPaja: 6,
    paja: 22, mortino: 12, romerillo: 12, roca: 5, q: 1,
  },
  medio: {
    filas: 5, paso: 0.66, flores: false, ovejas: 2, cerca: 28, piedrasSueltas: 3,
    faldaPapa: 4, faldaCubio: 3, faldaPaja: 4,
    paja: 13, mortino: 7, romerillo: 7, roca: 3, q: 0.62,
  },
  bajo: {
    filas: 4, paso: 0.85, flores: false, ovejas: 0, cerca: 14, piedrasSueltas: 2,
    faldaPapa: 3, faldaCubio: 2, faldaPaja: 2,
    paja: 7, mortino: 4, romerillo: 0, roca: 2, q: 0.42,
  },
};

/* ── Utilidades de horneado (mismo contrato que floraPapa.geom: TODO se
      desindexa antes de fusionar y se TRUENA si mergeGeometries falla). ── */
const UP = new THREE.Vector3(0, 1, 0);

function pintar(geo, color) {
  const c = color instanceof THREE.Color ? color : new THREE.Color(color);
  const n = geo.attributes.position.count;
  const arr = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) {
    arr[i * 3] = c.r;
    arr[i * 3 + 1] = c.g;
    arr[i * 3 + 2] = c.b;
  }
  geo.setAttribute('color', new THREE.BufferAttribute(arr, 3));
  return geo;
}

function poner(geo, pos = [0, 0, 0], rot = [0, 0, 0], esc = [1, 1, 1]) {
  const m = new THREE.Matrix4().compose(
    new THREE.Vector3(...pos),
    new THREE.Quaternion().setFromEuler(new THREE.Euler(...rot)),
    new THREE.Vector3(...esc),
  );
  geo.applyMatrix4(m);
  return geo;
}

function apuntar(geo, pos, dir, esc = [1, 1, 1]) {
  const d = new THREE.Vector3(...dir).normalize();
  const q = new THREE.Quaternion().setFromUnitVectors(UP, d);
  const m = new THREE.Matrix4().compose(new THREE.Vector3(...pos), q, new THREE.Vector3(...esc));
  geo.applyMatrix4(m);
  return geo;
}

function fusionar(partes) {
  const planas = partes.filter(Boolean).map((p) => {
    const g = p.index ? p.toNonIndexed() : p;
    if (g !== p) p.dispose();
    return g;
  });
  const out = mergeGeometries(planas, false);
  if (!out) {
    throw new Error('LaderaAltaValle: mergeGeometries devolvió null — atributos incompatibles');
  }
  planas.forEach((g) => g.dispose());
  out.computeVertexNormals();
  return out;
}

function variar(base, r, amt = 0.06) {
  const c = new THREE.Color(base);
  c.multiplyScalar(1 + (r() - 0.5) * amt * 2);
  return c;
}

/* ── Geometría NUEVA (solo lo que no existía en ningún mundo) ── */

/* HABA (Vicia faba): la mata ERGUIDA del frío — tallos verticales con hojitas
   y la flor blanca de mancha negra (su firma). Silueta vertical vs. la mata
   de papa amontonada: se distinguen de lejos. */
function geomHaba({ q = 1 } = {}, seed = 21) {
  const r = rngDe(seed);
  const partes = [];
  const nTallos = q < 0.5 ? 3 : 5;
  for (let i = 0; i < nTallos; i++) {
    const a = (i / nTallos) * Math.PI * 2 + r() * 0.7;
    const alto = 0.5 + r() * 0.24;
    const lx = Math.cos(a) * (0.1 + r() * 0.12);
    const lz = Math.sin(a) * (0.1 + r() * 0.12);
    const tallo = new THREE.CylinderGeometry(0.014, 0.022, alto, 4, 1);
    apuntar(tallo, [lx, alto * 0.48, lz], [lx * 0.8, 1, lz * 0.8]);
    partes.push(pintar(tallo, '#5f8548'));
    const nHojas = q < 0.5 ? 2 : 3;
    for (let h = 0; h < nHojas; h++) {
      const hy = alto * (0.35 + 0.24 * h);
      const hoja = new THREE.IcosahedronGeometry(0.055, 0);
      poner(hoja, [lx * (1 + h * 0.3) + (r() - 0.5) * 0.05, hy, lz * (1 + h * 0.3) + (r() - 0.5) * 0.05], [0, r() * Math.PI, 0], [1.4, 0.6, 1.1]);
      partes.push(pintar(hoja, variar(h % 2 ? '#86ad5f' : '#6f9a52', r, 0.05)));
    }
    if (q >= 0.5 && i % 2 === 0) {
      // la flor del haba: blanca con la mancha negra
      const flor = new THREE.IcosahedronGeometry(0.03, 0);
      poner(flor, [lx * 1.2, alto * 0.62, lz * 1.2]);
      partes.push(pintar(flor, '#f2efe4'));
      const mancha = new THREE.IcosahedronGeometry(0.016, 0);
      poner(mancha, [lx * 1.2 + 0.02, alto * 0.6, lz * 1.2 + 0.02]);
      partes.push(pintar(mancha, '#3a3230'));
    }
  }
  return fusionar(partes);
}

/* CUBIO / ULLUCO (Tropaeolum tuberosum): mata BAJA y redonda de hoja lima —
   el cojín claro entre la papa oscura. */
function geomCubio({ q = 1 } = {}, seed = 22) {
  const r = rngDe(seed);
  const partes = [];
  const nMasas = q < 0.5 ? 2 : 3;
  const sitios = [
    [0, 0.12, 0, 0.17],
    [0.16, 0.09, 0.1, 0.13],
    [-0.14, 0.1, -0.09, 0.14],
  ];
  for (let i = 0; i < nMasas; i++) {
    const s = sitios[i];
    const masa = new THREE.IcosahedronGeometry(s[3], 1);
    poner(masa, [s[0] + (r() - 0.5) * 0.05, s[1], s[2] + (r() - 0.5) * 0.05], [0, r() * Math.PI, 0], [1.35, 0.55, 1.35]);
    partes.push(pintar(masa, variar(i % 2 ? '#74a44a' : '#5c8f3f', r, 0.05)));
  }
  const brote = new THREE.IcosahedronGeometry(0.06, 0);
  poner(brote, [0.02, 0.2, 0.02], [0, r() * Math.PI, 0], [1, 0.7, 1]);
  partes.push(pintar(brote, '#8fba55'));
  return fusionar(partes);
}

/* ARRACACHA (Arracacia xanthorrhiza): ROSETA de frondas oscuras que abren
   desde el centro — silueta de helecho bajo, inconfundible junto a las otras. */
function geomArracacha({ q = 1 } = {}, seed = 23) {
  const r = rngDe(seed);
  const partes = [];
  const nFrondas = Math.max(5, Math.round(8 * q));
  for (let i = 0; i < nFrondas; i++) {
    const a = (i / nFrondas) * Math.PI * 2 + r() * 0.5;
    const inclina = 0.55 + r() * 0.35;
    const largo = 0.3 + r() * 0.14;
    const fronda = new THREE.ConeGeometry(0.055, largo, 4, 1);
    apuntar(
      fronda,
      [Math.cos(a) * 0.1, largo * 0.36, Math.sin(a) * 0.1],
      [Math.cos(a) * inclina, 1, Math.sin(a) * inclina],
    );
    partes.push(pintar(fronda, variar(i % 3 ? '#3f7040' : '#4c7f48', r, 0.06)));
  }
  const centro = new THREE.IcosahedronGeometry(0.05, 0);
  poner(centro, [0, 0.1, 0]);
  partes.push(pintar(centro, '#5d9150'));
  return fusionar(partes);
}

/* OVEJA de tierra fría: lana crema, cara y patas oscuras. Quieta (pastando):
   cero animación — presencia lejana, no personaje. */
function geomOveja(seed = 24) {
  const r = rngDe(seed);
  const partes = [];
  const cuerpo = new THREE.IcosahedronGeometry(0.2, 1);
  poner(cuerpo, [0, 0.3, 0], [0, 0, 0], [1.25, 0.95, 1.6]);
  partes.push(pintar(cuerpo, '#e7e2d4'));
  const lomo = new THREE.IcosahedronGeometry(0.13, 0);
  poner(lomo, [0, 0.42, -0.08], [0, r() * Math.PI, 0], [1.1, 0.7, 1.2]);
  partes.push(pintar(lomo, '#ded8c6'));
  const cabeza = new THREE.BoxGeometry(0.13, 0.13, 0.18);
  poner(cabeza, [0, 0.34, 0.36], [0.35, 0, 0]);
  partes.push(pintar(cabeza, '#4a4038'));
  for (const [ex] of [[-0.08], [0.08]]) {
    const oreja = new THREE.BoxGeometry(0.05, 0.03, 0.08);
    poner(oreja, [ex, 0.41, 0.32], [0, 0, ex * 4]);
    partes.push(pintar(oreja, '#57493f'));
  }
  for (const [px, pz] of [[-0.1, 0.16], [0.1, 0.16], [-0.1, -0.18], [0.1, -0.18]]) {
    const pata = new THREE.CylinderGeometry(0.022, 0.02, 0.18, 4, 1);
    poner(pata, [px, 0.09, pz]);
    partes.push(pintar(pata, '#4a4038'));
  }
  return fusionar(partes);
}

/* El ABRIGO de piedra: paredes de piedra, techo pajizo a dos aguas, puerta
   oscura — el rancho de aperos del lote frío. UNA malla fusionada. */
function geomAbrigo(seed = 25) {
  const r = rngDe(seed);
  const partes = [];
  const base = new THREE.BoxGeometry(1.2, 0.14, 0.95);
  poner(base, [0, 0.07, 0]);
  partes.push(pintar(base, '#7c786e'));
  const muro = new THREE.BoxGeometry(1.08, 0.56, 0.84);
  poner(muro, [0, 0.42, 0]);
  partes.push(pintar(muro, variar('#8d8a80', r, 0.04)));
  const puerta = new THREE.BoxGeometry(0.26, 0.4, 0.05);
  poner(puerta, [0.14, 0.32, 0.42]);
  partes.push(pintar(puerta, '#2e2620'));
  // el techo pajizo a dos aguas
  for (const lado of [-1, 1]) {
    const agua = new THREE.BoxGeometry(1.3, 0.05, 0.56);
    poner(agua, [0, 0.86, lado * 0.24], [lado * 0.52, 0, 0]);
    partes.push(pintar(agua, variar('#b3a05e', r, 0.05)));
  }
  const cumbrera = new THREE.CylinderGeometry(0.035, 0.035, 1.32, 4, 1);
  poner(cumbrera, [0, 0.99, 0], [0, 0, Math.PI / 2]);
  partes.push(pintar(cumbrera, '#6b543a'));
  return fusionar(partes);
}

/* ── Las TERRAZAS: bermas de tierra a curva de nivel, fusionadas en UNA
      malla. Cada nivel se parte donde caiga un claro (quebrada, portal,
      abrigo): el camellón se interrumpe, no lo atropella. ── */
function geomTerrazas(lote, claros, alturaDe, filas) {
  const partes = [];
  const { cx, cz, rx, rz } = lote;
  for (let i = 0; i < filas; i++) {
    const t = TERRAZAS[i];
    const dz = (t.z - cz) / rz;
    const semi = rx * Math.sqrt(Math.max(0, 1 - dz * dz)) * 0.9;
    if (semi < 0.8) continue;
    // puntos del camellón (con culebreo suave), partidos por claros
    let tramo = [];
    const tramos = [tramo];
    for (let x = cx - semi; x <= cx + semi; x += 0.6) {
      const zw = t.z + Math.sin(x * 0.85 + i * 2.1) * 0.15;
      if (enClaro(x, zw, claros)) {
        if (tramo.length) tramos.push((tramo = []));
        continue;
      }
      tramo.push(new THREE.Vector3(x, (alturaDe ? alturaDe(x, zw) : 0) + 0.02, zw));
    }
    for (const pts of tramos) {
      if (pts.length < 3) continue;
      const curva = new THREE.CatmullRomCurve3(pts);
      const tubo = new THREE.TubeGeometry(curva, pts.length * 5, 0.1, 5, false);
      partes.push(pintar(tubo, i % 2 ? '#564334' : '#4a3a2c'));
    }
  }
  return partes.length ? fusionar(partes) : null;
}

/* El CAMINO que sube: de la orilla baja del lote al abrigo, cruzando las
   terrazas en diagonal (mismo lenguaje que SenderosValle: tubo hundido). */
function geomCamino(alturaDe) {
  const pts = [
    [-2.2, -0.7], [-3.2, -1.8], [-4.6, -2.6], [-5.8, -3.5], [-6.5, -4.15],
  ].map(([x, z]) => new THREE.Vector3(x, (alturaDe ? alturaDe(x, z) : 0) + 0.03, z));
  const curva = new THREE.CatmullRomCurve3(pts);
  return pintar(new THREE.TubeGeometry(curva, 34, 0.13, 4, false), '#9d7b4b');
}

/* La CERCA DE PIEDRA: piedras sueltas en fila por el lindero bajo y el costado
   izquierdo del lote (posiciones; la geometría es geomPiedra instanciada). */
function sitiosCerca(alturaDe, claros, cupo, r) {
  const lineas = [
    // lindero bajo: de la esquina izquierda hacia la quebrada
    { a: [-7.3, -1.5], b: [-1.9, -1.05] },
    // costado izquierdo: subiendo hacia el abrigo
    { a: [-8.3, -2.0], b: [-7.85, -4.05] },
  ];
  const items = [];
  for (const l of lineas) {
    const dx = l.b[0] - l.a[0];
    const dz = l.b[1] - l.a[1];
    const largo = Math.hypot(dx, dz);
    const n = Math.floor(largo / 0.3);
    for (let i = 0; i <= n && items.length < cupo; i++) {
      const f = i / n;
      const x = l.a[0] + dx * f + (r() - 0.5) * 0.12 + Math.sin(f * 9) * 0.08;
      const z = l.a[1] + dz * f + (r() - 0.5) * 0.12;
      if (enClaro(x, z, claros)) continue;
      items.push({
        pos: [x, (alturaDe ? alturaDe(x, z) : 0) - 0.03, z],
        rotY: r() * Math.PI * 2,
        escala: 0.5 + r() * 0.3,
        tint: [1, 1, 1],
      });
    }
  }
  return items;
}

/* La SIEMBRA de las terrazas: golpes a paso fijo sobre el banco de cada
   camellón (z − 0.3, el lado de arriba), especie por GOLPES alternados de la
   mezcla de la terraza (3–6 matas por golpe) con huecos — así se lee hilera
   trabajada Y policultivo a la vez. El barbecho lleva tierra abierta + paja. */
function sembrarTerrazas(lote, claros, alturaDe, cupo, r) {
  const porEspecie = { papa: [], haba: [], cubio: [], arracacha: [], monticulo: [], pajaBarbecho: [], flores: [] };
  const { cx, cz, rx, rz } = lote;
  for (let i = 0; i < cupo.filas; i++) {
    const t = TERRAZAS[i];
    const dz = (t.z - cz) / rz;
    const semi = rx * Math.sqrt(Math.max(0, 1 - dz * dz)) * 0.85;
    if (semi < 0.8) continue;
    let especie = t.mezcla[0];
    let quedan = 3 + Math.floor(r() * 4);
    for (let x = cx - semi; x <= cx + semi; x += cupo.paso) {
      if (quedan <= 0) {
        // cambio de golpe: alterna especie, a veces deja un hueco
        especie = especie === t.mezcla[0] ? t.mezcla[1] : t.mezcla[0];
        quedan = 3 + Math.floor(r() * 4);
        if (r() < 0.14) continue; // el hueco del golpe perdido
      }
      quedan -= 1;
      const zw = t.z + Math.sin(x * 0.85 + i * 2.1) * 0.15 - 0.3;
      if (enClaro(x, zw, claros)) continue;
      if (nucleoZona(x, zw, [lote]) < 0.1) continue;
      const escala = t.esc[0] + r() * (t.esc[1] - t.esc[0]);
      const item = {
        pos: [x + (r() - 0.5) * 0.1, (alturaDe ? alturaDe(x, zw) : 0) - 0.02, zw + (r() - 0.5) * 0.08],
        rotY: r() * Math.PI * 2,
        escala,
        tint: [1, 1, 1],
      };
      if (especie === 'barbecho') {
        if (r() < 0.3) {
          item.escala = 0.5 + r() * 0.3;
          porEspecie.pajaBarbecho.push(item);
        } else {
          item.escala = 0.6 + r() * 0.35;
          porEspecie.monticulo.push(item);
        }
      } else {
        porEspecie[especie].push(item);
        // la papa de las terrazas bajas florece (lila o blanca, por mata)
        if (cupo.flores && especie === 'papa' && i < 2 && r() < 0.4) {
          porEspecie.flores.push({
            pos: [item.pos[0], item.pos[1] + 0.38 * escala, item.pos[2]],
            rotY: r() * Math.PI * 2,
            escala: escala * 0.9,
            tint: r() < 0.7 ? [0.7, 0.55, 0.84] : [0.95, 0.93, 0.97],
          });
        }
      }
    }
  }
  return porEspecie;
}

/**
 * La ladera alta del valle: terrazas de tierra fría + estructura + vida.
 * Montar dentro del <Canvas> del valle (lo cabla el host).
 *
 * @param {{
 *   alturaDe?: ((x:number, z:number) => number) | null,
 *   tier?: 'alto'|'medio'|'bajo',
 *   reducedMotion?: boolean,
 *   nocturno?: boolean,
 *   zona?: Array<{cx:number, cz:number, rx:number, rz:number}>,
 *   zonaVida?: Array<{cx:number, cz:number, rx:number, rz:number}>,
 *   claros?: Array<{x:number, z:number, r:number}>,
 *   semilla?: number,
 * }} props
 */
export default function LaderaAltaValle({
  alturaDe = null,
  tier = 'medio',
  reducedMotion = false, // sin uso: NADA se anima aquí (paisaje quieto)
  nocturno = false,
  zona = ZONA_LADERA_ALTA,
  zonaVida = ZONA_VIDA_ALTA,
  claros = CLAROS_LADERA_ALTA,
  semilla = 7411,
}) {
  void reducedMotion;
  const cupo = CUPOS_TIER[tier] || CUPOS_TIER.medio;

  /* Geometrías: reuso del papal y del páramo + las nuevas del frío. */
  const geos = useMemo(() => {
    const q = cupo.q;
    return {
      papa: geomMataPapa({ q }, 711),
      flor: cupo.flores ? geomFlorPapa() : null,
      haba: geomHaba({ q }, 712),
      cubio: geomCubio({ q }, 713),
      arracacha: geomArracacha({ q }, 714),
      monticulo: geomMonticulo(715),
      paja: geomPaja({ q }, 716),
      piedra: geomPiedra(717),
      mortino: geomMortino({ q }, 718),
      romerillo: cupo.romerillo > 0 ? geomRomerillo({ q }, 719) : null,
      roca: geomRoca(720),
      oveja: cupo.ovejas > 0 ? geomOveja(721) : null,
      abrigo: geomAbrigo(722),
      terrazas: geomTerrazas(zona[0], claros, alturaDe, cupo.filas),
      camino: geomCamino(alturaDe),
    };
  }, [cupo, zona, claros, alturaDe]);

  /* Dos materiales: el de los bancos (blanco: el tinte va POR INSTANCIA y ya
     trae la noche) y el de lo fijo (terrazas/camino/abrigo), que de noche se
     enfría multiplicando el vertexColor — mismo azul-luna de tintarLote. */
  const matVida = useMemo(
    () => new THREE.MeshLambertMaterial({ vertexColors: true, flatShading: true }),
    [],
  );
  const matFijo = useMemo(() => {
    const m = new THREE.MeshLambertMaterial({ vertexColors: true, flatShading: true });
    if (nocturno) m.color.setRGB(0.5, 0.62, 0.88);
    return m;
  }, [nocturno]);

  /* La siembra completa (determinista). Las terrazas siembran por hileras de
     golpes; la falda y la franja de vida, con el taller común (sembrarLote). */
  const siembra = useMemo(() => {
    const r = rngDe(semilla);
    const caja = cajaDe(zona);
    const s = sembrarTerrazas(zona[0], claros, alturaDe, cupo, r);

    // la falda baja: siembra suelta (desmonte joven, sin terrazas)
    const falda = [zona[1] || zona[0]];
    s.papa = s.papa.concat(sembrarLote(cupo.faldaPapa, falda, claros, alturaDe, r, { escMin: 0.55, escMax: 0.9, esp: 0.5 }));
    s.cubio = s.cubio.concat(sembrarLote(cupo.faldaCubio, falda, claros, alturaDe, r, { escMin: 0.55, escMax: 0.9, esp: 0.5 }));
    s.pajaBarbecho = s.pajaBarbecho.concat(sembrarLote(cupo.faldaPaja, falda, claros, alturaDe, r, { escMin: 0.4, escMax: 0.7 }));

    // la franja de vida alta: pajonal + mortiño + romerillo + roca
    s.paja = sembrarLote(cupo.paja, zonaVida, claros, alturaDe, r, { escMin: 0.5, escMax: 0.95, esp: 0.3 });
    s.mortino = sembrarLote(cupo.mortino, zonaVida, claros, alturaDe, r, { escMin: 0.45, escMax: 0.8 });
    s.romerillo = sembrarLote(cupo.romerillo, zonaVida, claros, alturaDe, r, { escMin: 0.45, escMax: 0.8 });
    s.roca = sembrarLote(cupo.roca, zonaVida, claros, alturaDe, r, { escMin: 0.7, escMax: 1.3, esp: 0.6 });

    // la cerca de piedra + piedras sueltas entre lotes
    s.piedra = sitiosCerca(alturaDe, claros, cupo.cerca, r)
      .concat(sembrarLote(cupo.piedrasSueltas, zona, claros, alturaDe, r, { escMin: 0.4, escMax: 0.7, esp: 1.4 }));

    // las ovejas junto al abrigo (quietas, pastando)
    s.oveja = SITIOS_OVEJA.slice(0, cupo.ovejas).map((o) => ({
      pos: [o.x, alturaDe ? alturaDe(o.x, o.z) : 0, o.z],
      rotY: o.rotY,
      escala: o.escala,
      tint: [1, 1, 1],
    }));

    // tinte: variación individual + perspectiva aérea fría + noche
    for (const [k, items] of Object.entries(s)) {
      if (k === 'flores') continue; // la flor trae su color por mata
      tintarLote(items, r, nocturno, caja, { frio: 0.3, brilloVar: 0.14 });
    }
    if (nocturno) {
      for (const f of s.flores) {
        f.tint = [f.tint[0] * 0.5, f.tint[1] * 0.62, f.tint[2] * 0.88];
      }
    }
    return s;
  }, [cupo, zona, zonaVida, claros, alturaDe, nocturno, semilla]);

  useLayoutEffect(() => () => {
    Object.values(geos).forEach((g) => g && g.dispose());
    matVida.dispose();
    matFijo.dispose();
  }, [geos, matVida, matFijo]);

  const sombra = tier === 'alto';
  const yAbrigo = alturaDe ? alturaDe(SITIO_ABRIGO.x, SITIO_ABRIGO.z) : 0;

  return (
    <group>
      {/* La ESTRUCTURA fija: terrazas, camino que sube, abrigo de piedra. */}
      {geos.terrazas && <mesh geometry={geos.terrazas} material={matFijo} position={[0, -0.045, 0]} />}
      <mesh geometry={geos.camino} material={matFijo} position={[0, -0.07, 0]} />
      <mesh
        geometry={geos.abrigo}
        material={matFijo}
        position={[SITIO_ABRIGO.x, yAbrigo - 0.02, SITIO_ABRIGO.z]}
        rotation={[0, SITIO_ABRIGO.rotY, 0]}
        castShadow={sombra}
      />

      {/* Los CULTIVOS del frío, en golpes entreverados (anti-monocultivo). */}
      <Banco geo={geos.papa} mat={matVida} items={siembra.papa} />
      <Banco geo={geos.haba} mat={matVida} items={siembra.haba} castShadow={sombra} />
      <Banco geo={geos.cubio} mat={matVida} items={siembra.cubio} />
      <Banco geo={geos.arracacha} mat={matVida} items={siembra.arracacha} />
      {geos.flor && <Banco geo={geos.flor} mat={matVida} items={siembra.flores} />}

      {/* El BARBECHO: tierra abierta y paja — la terraza que descansa. */}
      <Banco geo={geos.monticulo} mat={matVida} items={siembra.monticulo} />
      <Banco geo={geos.paja} mat={matVida} items={siembra.pajaBarbecho} />

      {/* La CERCA de piedra + piedras sueltas del lote. */}
      <Banco geo={geos.piedra} mat={matVida} items={siembra.piedra} />

      {/* La VIDA de altura: pajonal subiendo al frailejonal (lo complementa,
          no lo duplica: aquí no hay frailejón). */}
      <Banco geo={geos.paja} mat={matVida} items={siembra.paja} />
      <Banco geo={geos.mortino} mat={matVida} items={siembra.mortino} />
      {geos.romerillo && <Banco geo={geos.romerillo} mat={matVida} items={siembra.romerillo} />}
      <Banco geo={geos.roca} mat={matVida} items={siembra.roca} />

      {/* Las OVEJAS del abrigo (quietas: presencia, no personajes). */}
      {geos.oveja && <Banco geo={geos.oveja} mat={matVida} items={siembra.oveja} castShadow={sombra} />}
    </group>
  );
}
