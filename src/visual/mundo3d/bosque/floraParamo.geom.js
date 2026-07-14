/*
 * floraParamo.geom — la GEOMETRÍA del ECOSISTEMA que rodea al Ent de la queñua.
 *
 * El Ent (queñua) es EL árbol mayor y sigue siendo el foco; esto es el páramo que
 * lo acompaña para que el claro se sienta un bosque altoandino VIVO y no un árbol
 * solo. Especies reales del páramo/bosque altoandino colombiano, cada una con su
 * identidad inequívoca:
 *
 *   · Frailejón (Espeletia)      — el ícono: tallo con enagua de hojas muertas y
 *                                  ROSETA plateada peluda arriba. Va al frente,
 *                                  formando el frailejonar. (Algunos en flor.)
 *   · Yarumo plateado/blanco     — Cecropia telealba: tronco pálido esbelto y copa
 *     (Cecropia telealba)          en sombrilla de hojas palmeadas de ENVÉS BLANCO.
 *   · Roble andino               — Quercus humboldtii: tronco robusto y copa ancha
 *     (Quercus humboldtii)         densa de hoja coriácea oscura (con bellotas).
 *   · Encenillo (Weinmannia)     — árbol de niebla: tronco rojizo, copa oscura y
 *                                  compacta, velo de musgo.
 *   · Aliso (Alnus acuminata)    — tronco gris claro esbelto, copa cónica verde
 *                                  fresca; el vecino más alto (aun así < Ent).
 *   · Gaque (Clusia)             — copa redonda densa de hoja gruesa verde-lustrosa.
 *   · Mortiño (Vaccinium         — arbusto bajo con BAYAS azul-moradas (agraz andino).
 *     meridionale)
 *   · Romerillo                  — mata baja de follaje fino amarillo-verde.
 *   · Rocas con líquen + musgo   — el suelo del páramo.
 *
 * TÉCNICA tier-safe (DR §3): cada especie se FUSIONA en UNA sola geometría
 * (tronco + follaje + detalles) con color horneado en vertexColors, y luego se
 * dibuja con UN InstancedMesh → una draw-call por especie por más matas que haya.
 * Cero assets externos: todo procedural. Corre headless (three core + merge puro).
 *
 * El componente r3f (`FloraParamo.jsx`) consume esto: instancia, ubica y le pone
 * luz. Aquí viven SOLO los datos y las mallas (nada de WebGL).
 */
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { rng } from './entQuenua.geom.js';

/* -------------------------------------------------------------------------- */
/*  Presupuesto por tier                                                       */
/* -------------------------------------------------------------------------- */

/*
 * Cuántas matas de cada especie (tier-safe). 'alto' puebla un ecosistema pleno;
 * 'medio' es frugal; 'bajo' deja lo mínimo para que AÚN se lea "páramo" (unos
 * frailejones, un par de árboles, rocas y musgo) si algo fuerza el 3D. Cada
 * especie es UN InstancedMesh → estos números son instancias, no draw-calls.
 */
export const FLORA_TIER = {
  alto: {
    frailejon: 30, frailejonFlor: 6, yarumo: 3, roble: 3, encenillo: 4,
    aliso: 3, gaque: 2, mortino: 10, romerillo: 12, roca: 9, musgo: 12, niebla: 3,
  },
  medio: {
    frailejon: 18, frailejonFlor: 3, yarumo: 2, roble: 2, encenillo: 2,
    aliso: 2, gaque: 1, mortino: 6, romerillo: 7, roca: 5, musgo: 6, niebla: 0,
  },
  bajo: {
    frailejon: 7, frailejonFlor: 0, yarumo: 1, roble: 1, encenillo: 0,
    aliso: 0, gaque: 0, mortino: 2, romerillo: 3, roca: 2, musgo: 3, niebla: 0,
  },
};

/** Conteos de flora para un tier (desconocido → frugal, nunca el más caro). */
export const floraDeTier = (tier) => FLORA_TIER[tier] || FLORA_TIER.medio;

/*
 * Factor de DETALLE geométrico por tier: escala cuántas hojas/blobs lleva cada
 * mata. Menos detalle en gama baja = menos vértices por instancia (que se
 * multiplican por el número de matas).
 */
export const CALIDAD_TIER = { alto: 1, medio: 0.62, bajo: 0.42 };
export const calidadDeTier = (tier) => CALIDAD_TIER[tier] ?? CALIDAD_TIER.medio;

/* -------------------------------------------------------------------------- */
/*  Paleta del páramo (colores horneados en vertexColors)                      */
/* -------------------------------------------------------------------------- */

export const PAL = {
  // Frailejón
  frailejonTronco: '#6f5c40', // tallo bajo la enagua
  frailejonSeco: '#8a7350', // hojas muertas de la enagua (marcescentes)
  frailejonPlata: '#bcc6ac', // roseta plateada peluda (la firma)
  frailejonCorazon: '#cfd7c6', // centro velloso del cogollo
  frailejonFlor: '#e0c24a', // capítulos amarillos
  frailejonTallo: '#95a06a', // escapo floral

  // Yarumo plateado / blanco (Cecropia telealba)
  yarumoTronco: '#bcbfb2', // tronco pálido anillado
  yarumoRama: '#a9ac9f',
  yarumoEnves: '#e2e7dc', // envés BLANCO de la hoja palmeada (la firma)
  yarumoHaz: '#7f9070', // dejo verde del haz

  // Roble andino (Quercus humboldtii)
  robleTronco: '#6a5c4a', // corteza gris-parda fisurada
  robleHoja: '#43593b', // hoja coriácea verde oscuro
  robleHoja2: '#516b42',
  robleBellota: '#7a5a34', // bellota
  robleCapa: '#54432a', // capuchón de la bellota

  // Encenillo (Weinmannia tomentosa)
  encenilloTronco: '#6d4535', // corteza rojiza
  encenilloHoja: '#3b5236', // copa oscura compacta
  encenilloMusgo: '#586a44', // velo de musgo del árbol de niebla

  // Aliso (Alnus acuminata)
  alisoTronco: '#9a9a8f', // corteza gris clara
  alisoHoja: '#4f6d3d', // verde fresco
  alisoHoja2: '#5c7a46',

  // Gaque (Clusia)
  gaqueTronco: '#57493a',
  gaqueHoja: '#2f4a2d', // verde muy oscuro lustroso
  gaqueHoja2: '#37552f',

  // Mortiño (Vaccinium meridionale)
  mortinoHoja: '#3f5a3a',
  mortinoBrote: '#7a4536', // brote rojizo nuevo
  mortinoBaya: '#33305c', // baya azul-morada (agraz)
  mortinoBaya2: '#3d3768',

  // Romerillo
  romerilloHoja: '#79883f',
  romerilloHoja2: '#8a9a4e',
  romerilloFlor: '#d8c24a',

  // Suelo
  roca: '#7c7c70',
  liquen: '#9aa86a', // líquen pálido sobre la piedra
  liquen2: '#b7c08a',
  musgo: '#4c5c34',
  musgo2: '#5a6a3e',
};

/* -------------------------------------------------------------------------- */
/*  Utilidades de construcción (fusión + colocación + color horneado)          */
/* -------------------------------------------------------------------------- */

const UP = new THREE.Vector3(0, 1, 0);

/** Hornea un color plano en TODOS los vértices (atributo `color`). Idempotente. */
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

/** Coloca una geometría con posición/rotación/escala (transforma vértices). */
function poner(geo, pos = [0, 0, 0], rot = [0, 0, 0], scale = [1, 1, 1]) {
  const m = new THREE.Matrix4().compose(
    new THREE.Vector3(pos[0], pos[1], pos[2]),
    new THREE.Quaternion().setFromEuler(new THREE.Euler(rot[0], rot[1], rot[2])),
    new THREE.Vector3(scale[0], scale[1], scale[2]),
  );
  geo.applyMatrix4(m);
  return geo;
}

/** Orienta el eje +Y de la geometría hacia `dir` y la ubica en `pos` (para hojas
    que apuntan en cualquier dirección). `esc` escala en el eje local antes de
    girar (aplana hojas: escala z pequeña → lámina). */
function apuntar(geo, pos, dir, esc = [1, 1, 1]) {
  const d = new THREE.Vector3(dir[0], dir[1], dir[2]).normalize();
  const q = new THREE.Quaternion().setFromUnitVectors(UP, d);
  const m = new THREE.Matrix4().compose(
    new THREE.Vector3(pos[0], pos[1], pos[2]),
    q,
    new THREE.Vector3(esc[0], esc[1], esc[2]),
  );
  geo.applyMatrix4(m);
  return geo;
}

/** Fusiona la lista de partes (ya coloreadas) en UNA geometría.
    OJO: los poliedros (Icosahedron) son NO-indexados y el resto sí — merge
    directo devolvía null y la especie quedaba invisible. Se uniformiza todo
    a no-indexado antes de fusionar. */
function fusionar(partes) {
  const buenas = partes.filter(Boolean).map((g) => (g.index ? g.toNonIndexed() : g));
  const g = mergeGeometries(buenas, false);
  // Las partes de entrada nunca tocaron la GPU: quedan para el GC.
  return g;
}

/** Pequeña variación determinista de color (para que un bosque no sea plano). */
function variar(base, r, amt = 0.06) {
  const c = new THREE.Color(base);
  c.multiplyScalar(1 + (r() - 0.5) * amt * 2);
  return c;
}

/* -------------------------------------------------------------------------- */
/*  FRAILEJÓN (Espeletia) — el ícono del páramo                                */
/* -------------------------------------------------------------------------- */

/*
 * Tallo columnar vestido con una ENAGUA de hojas muertas (marcescentes) que
 * cuelgan, coronado por una ROSETA de hojas lanceoladas plateadas y peludas que
 * apuntan hacia arriba y afuera en espiral (ángulo áureo). Esa roseta velluda
 * plateada es lo que lo hace inequívoco. Con `flor`, le nace un escapo con
 * capítulos amarillos.
 */
export function geomFrailejon({ flor = false, q = 1 } = {}, seed = 1) {
  const r = rng(seed);
  const partes = [];
  const GOLDEN = Math.PI * (3 - Math.sqrt(5));

  // 1) Tallo (mayormente oculto por la enagua).
  const tronco = new THREE.CylinderGeometry(0.11, 0.14, 1.0, 7, 1);
  poner(tronco, [0, 0.5, 0]);
  partes.push(pintar(tronco, PAL.frailejonTronco));

  // 2) Enagua de hojas muertas: anillos de hojas que cuelgan hacia abajo-afuera.
  const anillos = Math.max(2, Math.round(3 * q));
  const porAnillo = Math.max(5, Math.round(7 * q));
  for (let a = 0; a < anillos; a++) {
    const y = 0.26 + a * (0.72 / anillos);
    const rad = 0.15 - a * 0.02;
    for (let i = 0; i < porAnillo; i++) {
      const ang = (i / porAnillo) * Math.PI * 2 + a * 0.5;
      const hoja = new THREE.ConeGeometry(0.05, 0.34, 4, 1);
      apuntar(
        hoja,
        [Math.cos(ang) * rad, y, Math.sin(ang) * rad],
        [Math.cos(ang) * 0.8, -0.7, Math.sin(ang) * 0.8],
        [1, 1, 0.4],
      );
      partes.push(pintar(hoja, variar(PAL.frailejonSeco, r, 0.12)));
    }
  }

  // 3) Roseta plateada: hojas lanceoladas hacia arriba-afuera, en espiral áurea.
  const nRoseta = Math.max(8, Math.round(16 * q));
  const cy = 0.98;
  for (let i = 0; i < nRoseta; i++) {
    const ang = i * GOLDEN;
    const tilt = 0.72 + (i / nRoseta) * 0.5 + (r() - 0.5) * 0.12; // afuera al borde
    const s = Math.sin(tilt);
    const hoja = new THREE.ConeGeometry(0.055, 0.52, 4, 1);
    apuntar(
      hoja,
      [Math.cos(ang) * 0.04, cy, Math.sin(ang) * 0.04],
      [Math.cos(ang) * s, Math.cos(tilt), Math.sin(ang) * s],
      [1, 1, 0.42],
    );
    partes.push(pintar(hoja, variar(PAL.frailejonPlata, r, 0.08)));
  }
  // Cogollo velloso en el centro.
  const corazon = new THREE.IcosahedronGeometry(0.13, 0);
  poner(corazon, [0, cy + 0.02, 0], [0, 0, 0], [1, 0.7, 1]);
  partes.push(pintar(corazon, PAL.frailejonCorazon));

  // 4) Escapo floral (solo en flor): tallo + capítulos amarillos.
  if (flor) {
    const tallo = new THREE.CylinderGeometry(0.028, 0.04, 0.95, 5, 1);
    poner(tallo, [0.05, 1.42, 0], [0, 0, 0.08]);
    partes.push(pintar(tallo, PAL.frailejonTallo));
    const nCap = Math.max(4, Math.round(7 * q));
    for (let i = 0; i < nCap; i++) {
      const ang = (i / nCap) * Math.PI * 2;
      const rad = 0.1 + r() * 0.06;
      const cap = new THREE.IcosahedronGeometry(0.055 + r() * 0.02, 0);
      poner(cap, [0.08 + Math.cos(ang) * rad, 1.82 + r() * 0.1, Math.sin(ang) * rad], [0, 0, 0], [1, 0.7, 1]);
      partes.push(pintar(cap, variar(PAL.frailejonFlor, r, 0.08)));
    }
  }

  return fusionar(partes);
}

/* -------------------------------------------------------------------------- */
/*  YARUMO PLATEADO / BLANCO (Cecropia telealba)                               */
/* -------------------------------------------------------------------------- */

/*
 * Pionera esbelta: tronco pálido y recto, ramas en candelabro arriba y una copa
 * en SOMBRILLA de hojas palmeadas (mano de 7 lóbulos) cuyo ENVÉS es blanco-plata.
 * Desde abajo se ve ese blanco: la firma inconfundible del yarumo.
 */
export function geomYarumo({ q = 1 } = {}, seed = 2) {
  const r = rng(seed);
  const partes = [];
  const H = 3.4;

  const tronco = new THREE.CylinderGeometry(0.08, 0.14, H, 8, 1);
  poner(tronco, [0, H / 2, 0], [0, 0, 0.03]);
  partes.push(pintar(tronco, PAL.yarumoTronco));

  // Ramas en candelabro (pocas, arriba).
  const nRamas = Math.max(2, Math.round(3 * q));
  const puntas = [[0, H + 0.05, 0]];
  for (let i = 0; i < nRamas; i++) {
    const ang = (i / nRamas) * Math.PI * 2 + 0.4;
    const largo = 0.7 + r() * 0.3;
    const rama = new THREE.CylinderGeometry(0.03, 0.05, largo, 5, 1);
    const dir = [Math.cos(ang) * 0.7, 0.7, Math.sin(ang) * 0.7];
    const base = [Math.cos(ang) * 0.05, H - 0.35 + i * 0.06, Math.sin(ang) * 0.05];
    apuntar(rama, [base[0] + dir[0] * largo * 0.3, base[1] + dir[1] * largo * 0.3, base[2] + dir[2] * largo * 0.3], dir);
    partes.push(pintar(rama, PAL.yarumoRama));
    puntas.push([base[0] + dir[0] * largo, base[1] + dir[1] * largo, base[2] + dir[2] * largo]);
  }

  // Hojas palmeadas: discos aplanados de 7 lóbulos, envés blanco, colgando.
  const porPunta = Math.max(2, Math.round(3 * q));
  for (const p of puntas) {
    for (let i = 0; i < porPunta; i++) {
      const ang = (i / porPunta) * Math.PI * 2 + r();
      const rad = 0.18 + r() * 0.12;
      const hoja = new THREE.ConeGeometry(0.42, 0.09, 7, 1); // 7-gono chato = "mano"
      // caída suave hacia afuera (envés hacia el suelo → se ve el blanco)
      apuntar(
        hoja,
        [p[0] + Math.cos(ang) * rad, p[1] - 0.05 - r() * 0.08, p[2] + Math.sin(ang) * rad],
        [Math.cos(ang) * 0.4, 0.9, Math.sin(ang) * 0.4],
        [1, 0.5, 1],
      );
      partes.push(pintar(hoja, variar(PAL.yarumoEnves, r, 0.05)));
    }
  }

  return fusionar(partes);
}

/* -------------------------------------------------------------------------- */
/*  ROBLE ANDINO (Quercus humboldtii) — el único roble nativo de Colombia      */
/* -------------------------------------------------------------------------- */

/*
 * Árbol robusto de robledal altoandino: tronco grueso de corteza gris-parda
 * fisurada y una copa ANCHA y densa de hoja coriácea verde oscuro, con bellotas.
 * Imponente pero SIEMPRE menor que el Ent (el guardián sigue mandando).
 */
export function geomRoble({ q = 1 } = {}, seed = 3) {
  const r = rng(seed);
  const partes = [];
  const H = 2.4;

  const tronco = new THREE.CylinderGeometry(0.16, 0.24, H, 8, 1);
  poner(tronco, [0, H / 2, 0], [0.03, 0, 0.02]);
  partes.push(pintar(tronco, PAL.robleTronco));

  // Un par de ramas gruesas bajas que abren la copa ancha.
  const nRamas = Math.max(2, Math.round(3 * q));
  for (let i = 0; i < nRamas; i++) {
    const ang = (i / nRamas) * Math.PI * 2 + 0.5;
    const rama = new THREE.CylinderGeometry(0.06, 0.1, 0.9, 6, 1);
    apuntar(rama, [Math.cos(ang) * 0.3, H - 0.4, Math.sin(ang) * 0.3], [Math.cos(ang) * 0.8, 0.55, Math.sin(ang) * 0.8]);
    partes.push(pintar(rama, PAL.robleTronco));
  }

  // Copa ancha densa: cúpula amplia de follaje coriáceo oscuro.
  const nBlobs = Math.max(6, Math.round(12 * q));
  for (let i = 0; i < nBlobs; i++) {
    const ang = r() * Math.PI * 2;
    const rad = 0.2 + r() * 1.05; // ANCHA
    const y = H + 0.1 + r() * 1.0;
    const s = 0.42 + r() * 0.42;
    const blob = new THREE.IcosahedronGeometry(s, 0);
    poner(blob, [Math.cos(ang) * rad, y, Math.sin(ang) * rad], [r(), r(), r()], [1, 0.85, 1]);
    partes.push(pintar(blob, variar(r() > 0.5 ? PAL.robleHoja : PAL.robleHoja2, r, 0.08)));
  }

  // Bellotas (unas pocas, cuelgan del borde de la copa).
  if (q > 0.5) {
    const nBel = Math.max(2, Math.round(4 * q));
    for (let i = 0; i < nBel; i++) {
      const ang = r() * Math.PI * 2;
      const rad = 0.7 + r() * 0.5;
      const y = H + 0.2 + r() * 0.5;
      const bellota = new THREE.IcosahedronGeometry(0.06, 0);
      poner(bellota, [Math.cos(ang) * rad, y, Math.sin(ang) * rad], [0, 0, 0], [1, 1.4, 1]);
      partes.push(pintar(bellota, PAL.robleBellota));
      const capa = new THREE.SphereGeometry(0.05, 6, 4, 0, Math.PI * 2, 0, Math.PI * 0.5);
      poner(capa, [Math.cos(ang) * rad, y + 0.07, Math.sin(ang) * rad]);
      partes.push(pintar(capa, PAL.robleCapa));
    }
  }

  return fusionar(partes);
}

/* -------------------------------------------------------------------------- */
/*  ENCENILLO (Weinmannia tomentosa) — el árbol de la niebla                   */
/* -------------------------------------------------------------------------- */

/*
 * Copa oscura, compacta e irregular sobre tronco rojizo algo torcido, con un
 * velo de musgo (vive envuelto en niebla). Más estrecho y sombrío que el roble.
 */
export function geomEncenillo({ q = 1 } = {}, seed = 4) {
  const r = rng(seed);
  const partes = [];
  const H = 2.3;

  const tronco = new THREE.CylinderGeometry(0.1, 0.16, H, 7, 1);
  poner(tronco, [0, H / 2, 0], [0.05, 0, -0.03]);
  partes.push(pintar(tronco, PAL.encenilloTronco));

  const nBlobs = Math.max(5, Math.round(9 * q));
  for (let i = 0; i < nBlobs; i++) {
    const ang = r() * Math.PI * 2;
    const rad = 0.15 + r() * 0.6; // copa estrecha
    const y = H + 0.05 + r() * 1.0;
    const s = 0.34 + r() * 0.3;
    const blob = new THREE.IcosahedronGeometry(s, 0);
    poner(blob, [Math.cos(ang) * rad, y, Math.sin(ang) * rad], [r(), r(), r()], [1, 0.95, 1]);
    const mossy = r() > 0.65;
    partes.push(pintar(blob, variar(mossy ? PAL.encenilloMusgo : PAL.encenilloHoja, r, 0.08)));
  }

  return fusionar(partes);
}

/* -------------------------------------------------------------------------- */
/*  ALISO (Alnus acuminata) — el vecino alto de corteza clara                  */
/* -------------------------------------------------------------------------- */

/*
 * Tronco recto y esbelto de corteza gris clara, copa CÓNICA-ovalada de verde
 * fresco. Es el árbol más alto del cortejo (crece rápido) pero no llega al Ent.
 */
export function geomAliso({ q = 1 } = {}, seed = 5) {
  const r = rng(seed);
  const partes = [];
  const H = 3.2;

  const tronco = new THREE.CylinderGeometry(0.07, 0.13, H, 8, 1);
  poner(tronco, [0, H / 2, 0]);
  partes.push(pintar(tronco, PAL.alisoTronco));

  // Copa cónica: blobs que se estrechan hacia arriba.
  const nBlobs = Math.max(5, Math.round(10 * q));
  for (let i = 0; i < nBlobs; i++) {
    const f = i / nBlobs; // 0 abajo → 1 arriba
    const ang = r() * Math.PI * 2;
    const rad = (0.65 - f * 0.5) * (0.4 + r() * 0.8);
    const y = H - 1.1 + f * 2.0 + r() * 0.2;
    const s = 0.4 - f * 0.18 + r() * 0.18;
    const blob = new THREE.IcosahedronGeometry(Math.max(0.16, s), 0);
    poner(blob, [Math.cos(ang) * rad, y, Math.sin(ang) * rad], [r(), r(), r()], [1, 1, 1]);
    partes.push(pintar(blob, variar(r() > 0.5 ? PAL.alisoHoja : PAL.alisoHoja2, r, 0.08)));
  }

  return fusionar(partes);
}

/* -------------------------------------------------------------------------- */
/*  GAQUE (Clusia) — copa redonda de hoja gruesa lustrosa                       */
/* -------------------------------------------------------------------------- */

/*
 * Copa REDONDA densa y baja de hoja gruesa verde muy oscuro (casi lustrosa),
 * sobre tronco corto y firme. Compacto y sólido.
 */
export function geomGaque({ q = 1 } = {}, seed = 6) {
  const r = rng(seed);
  const partes = [];
  const H = 1.9;

  const tronco = new THREE.CylinderGeometry(0.13, 0.19, H, 8, 1);
  poner(tronco, [0, H / 2, 0]);
  partes.push(pintar(tronco, PAL.gaqueTronco));

  const nBlobs = Math.max(5, Math.round(9 * q));
  for (let i = 0; i < nBlobs; i++) {
    const ang = r() * Math.PI * 2;
    const rad = 0.15 + r() * 0.75;
    const y = H + 0.15 + r() * 0.7; // domo bajo y ancho
    const s = 0.4 + r() * 0.38;
    const blob = new THREE.IcosahedronGeometry(s, 0);
    poner(blob, [Math.cos(ang) * rad, y, Math.sin(ang) * rad], [r(), r(), r()], [1, 0.8, 1]);
    partes.push(pintar(blob, variar(r() > 0.5 ? PAL.gaqueHoja : PAL.gaqueHoja2, r, 0.06)));
  }

  return fusionar(partes);
}

/* -------------------------------------------------------------------------- */
/*  MORTIÑO (Vaccinium meridionale) — arbusto de agraz con bayas azules         */
/* -------------------------------------------------------------------------- */

/*
 * Mata baja de hojitas verdes con brotes rojizos y —la firma— BAYAS azul-moradas
 * (el agraz andino) salpicadas entre el follaje.
 */
export function geomMortino({ q = 1 } = {}, seed = 7) {
  const r = rng(seed);
  const partes = [];

  const nBlobs = Math.max(4, Math.round(7 * q));
  for (let i = 0; i < nBlobs; i++) {
    const ang = r() * Math.PI * 2;
    const rad = r() * 0.32;
    const y = 0.18 + r() * 0.5;
    const s = 0.16 + r() * 0.16;
    const blob = new THREE.IcosahedronGeometry(s, 0);
    poner(blob, [Math.cos(ang) * rad, y, Math.sin(ang) * rad], [r(), r(), r()], [1, 1, 1]);
    const brote = r() > 0.72;
    partes.push(pintar(blob, variar(brote ? PAL.mortinoBrote : PAL.mortinoHoja, r, 0.08)));
  }
  // Bayas azul-moradas.
  const nBayas = Math.max(3, Math.round(10 * q));
  for (let i = 0; i < nBayas; i++) {
    const ang = r() * Math.PI * 2;
    const rad = r() * 0.34;
    const y = 0.15 + r() * 0.5;
    const baya = new THREE.IcosahedronGeometry(0.04 + r() * 0.015, 0);
    poner(baya, [Math.cos(ang) * rad, y, Math.sin(ang) * rad]);
    partes.push(pintar(baya, variar(r() > 0.5 ? PAL.mortinoBaya : PAL.mortinoBaya2, r, 0.1)));
  }

  return fusionar(partes);
}

/* -------------------------------------------------------------------------- */
/*  ROMERILLO — mata baja de follaje fino                                       */
/* -------------------------------------------------------------------------- */

/*
 * Cojín bajo de follaje FINO amarillo-verde (hojita de escama tipo romero de
 * páramo), a veces con puntos de flor amarilla. Relleno del sotobosque.
 */
export function geomRomerillo({ q = 1 } = {}, seed = 8) {
  const r = rng(seed);
  const partes = [];

  const nRamitas = Math.max(6, Math.round(14 * q));
  for (let i = 0; i < nRamitas; i++) {
    const ang = r() * Math.PI * 2;
    const rad = r() * 0.28;
    const largo = 0.28 + r() * 0.32;
    const ramita = new THREE.ConeGeometry(0.05, largo, 4, 1);
    apuntar(
      ramita,
      [Math.cos(ang) * rad, largo * 0.4, Math.sin(ang) * rad],
      [Math.cos(ang) * 0.35 + (r() - 0.5) * 0.3, 1, Math.sin(ang) * 0.35 + (r() - 0.5) * 0.3],
    );
    partes.push(pintar(ramita, variar(r() > 0.5 ? PAL.romerilloHoja : PAL.romerilloHoja2, r, 0.1)));
  }
  if (q > 0.5) {
    const nFlor = Math.max(2, Math.round(5 * q));
    for (let i = 0; i < nFlor; i++) {
      const ang = r() * Math.PI * 2;
      const rad = r() * 0.26;
      const flor = new THREE.IcosahedronGeometry(0.035, 0);
      poner(flor, [Math.cos(ang) * rad, 0.35 + r() * 0.3, Math.sin(ang) * rad]);
      partes.push(pintar(flor, PAL.romerilloFlor));
    }
  }

  return fusionar(partes);
}

/* -------------------------------------------------------------------------- */
/*  SUELO — rocas con líquen + montículos de musgo                              */
/* -------------------------------------------------------------------------- */

/** Roca baja gris con parches de líquen pálido (piedra del páramo). */
export function geomRoca(seed = 9) {
  const r = rng(seed);
  const partes = [];
  const piedra = new THREE.IcosahedronGeometry(0.3, 0);
  poner(piedra, [0, 0.12, 0], [r(), r(), r()], [1 + r() * 0.4, 0.55 + r() * 0.2, 1 + r() * 0.4]);
  partes.push(pintar(piedra, variar(PAL.roca, r, 0.08)));
  // Líquen encima.
  const nLiquen = 2 + Math.round(r() * 2);
  for (let i = 0; i < nLiquen; i++) {
    const ang = r() * Math.PI * 2;
    const rad = r() * 0.22;
    const parche = new THREE.IcosahedronGeometry(0.07 + r() * 0.05, 0);
    poner(parche, [Math.cos(ang) * rad, 0.2 + r() * 0.06, Math.sin(ang) * rad], [0, 0, 0], [1.3, 0.4, 1.3]);
    partes.push(pintar(parche, variar(r() > 0.5 ? PAL.liquen : PAL.liquen2, r, 0.1)));
  }
  return fusionar(partes);
}

/** Montículo de musgo húmedo (domo bajo). */
export function geomMusgo(seed = 10) {
  const r = rng(seed);
  const domo = new THREE.SphereGeometry(0.28, 8, 5, 0, Math.PI * 2, 0, Math.PI * 0.5);
  poner(domo, [0, 0, 0], [0, 0, 0], [1 + r() * 0.5, 0.45 + r() * 0.2, 1 + r() * 0.5]);
  return pintar(domo, variar(r() > 0.5 ? PAL.musgo : PAL.musgo2, r, 0.1));
}

/* -------------------------------------------------------------------------- */
/*  DISTRIBUCIÓN biogeográfica alrededor del Ent                               */
/* -------------------------------------------------------------------------- */

/*
 * Estratos concéntricos (el Ent en el centro, 0,0,0). La cámara ORBITA, así que
 * la composición es un anillo por estrato (no un frente fijo):
 *   · frailejonar + sotobosque + suelo → anillo interior-medio (al frente visual).
 *   · árboles (roble, encenillo, aliso, yarumo, gaque) → anillo exterior, velados
 *     por la niebla → dan fondo y hacen que el Ent RESALTE como el mayor.
 * Devuelve, por especie, instancias {pos, rotY, escala, tint}.
 */
function tinteInstancia(r, amt) {
  const f = 1 + (r() - 0.5) * amt;
  const h = (r() - 0.5) * amt * 0.4;
  const cl = (v) => Math.max(0.7, Math.min(1.16, v));
  return [cl(f + h), cl(f), cl(f - h * 0.6)];
}

function sembrar(n, rMin, rMax, r, opts = {}) {
  const arr = [];
  const eMin = opts.eMin ?? 0.9;
  const eMax = opts.eMax ?? 1.15;
  for (let i = 0; i < n; i++) {
    // Árboles (uniforme): reparto angular parejo + leve jitter → no se solapan.
    // Sotobosque/frailejonar (agrupado): ángulo aleatorio → matorral natural.
    const ang = opts.uniforme
      ? (i / Math.max(1, n)) * Math.PI * 2 + (r() - 0.5) * 0.7
      : r() * Math.PI * 2;
    const rad = rMin + (rMax - rMin) * (opts.haciaAfuera ? Math.sqrt(r()) : r());
    arr.push({
      pos: [Math.cos(ang) * rad, 0, Math.sin(ang) * rad],
      rotY: r() * Math.PI * 2,
      escala: eMin + r() * (eMax - eMin),
      tint: tinteInstancia(r, opts.varia ?? 0.12),
    });
  }
  return arr;
}

/** Todas las instancias de flora para unos conteos dados. */
export function distribucionFlora(conteos, seed = 707) {
  const c = conteos;
  return {
    // Frailejonar: anillo interior-medio, agrupado, mucha variación de tamaño.
    frailejon: sembrar(c.frailejon, 3.8, 10.5, rng(seed + 1), { eMin: 0.82, eMax: 1.28, varia: 0.14 }),
    frailejonFlor: sembrar(c.frailejonFlor, 4.5, 9.5, rng(seed + 2), { eMin: 0.9, eMax: 1.2, varia: 0.1 }),
    // Sotobosque.
    mortino: sembrar(c.mortino, 4, 12, rng(seed + 3), { eMin: 0.8, eMax: 1.2, varia: 0.12 }),
    romerillo: sembrar(c.romerillo, 3, 12, rng(seed + 4), { eMin: 0.8, eMax: 1.25, varia: 0.14 }),
    // Suelo.
    roca: sembrar(c.roca, 2, 11, rng(seed + 5), { eMin: 0.7, eMax: 1.5, varia: 0.1 }),
    musgo: sembrar(c.musgo, 1.2, 9, rng(seed + 6), { eMin: 0.7, eMax: 1.6, varia: 0.12 }),
    // Árboles de fondo (anillo exterior, reparto parejo, velados por niebla).
    gaque: sembrar(c.gaque, 8.5, 14, rng(seed + 7), { eMin: 0.9, eMax: 1.1, uniforme: true, varia: 0.08 }),
    roble: sembrar(c.roble, 9.5, 16, rng(seed + 8), { eMin: 0.92, eMax: 1.15, uniforme: true, varia: 0.08 }),
    encenillo: sembrar(c.encenillo, 10, 17, rng(seed + 9), { eMin: 0.85, eMax: 1.1, uniforme: true, varia: 0.08 }),
    yarumo: sembrar(c.yarumo, 10, 17, rng(seed + 10), { eMin: 0.9, eMax: 1.15, uniforme: true, varia: 0.06 }),
    aliso: sembrar(c.aliso, 11, 19, rng(seed + 11), { eMin: 0.9, eMax: 1.12, uniforme: true, varia: 0.08 }),
  };
}
