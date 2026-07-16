/*
 * floraCafetal.geom — la GEOMETRÍA del CAFETAL BAJO SOMBRA (piso templado).
 *
 * El café es EL cultivo del campesino colombiano y aquí se cuenta como es de
 * verdad en la montaña: una LADERA sembrada en surcos a curva de nivel, con los
 * cafetos ABAJO y el SOMBRÍO arriba — guamos y nogales cafeteros que le hacen
 * techo de hojas al cultivo — y el plátano intercalado que acompaña casi todo
 * cafetal campesino. Cada especie con su identidad inequívoca:
 *
 *   · Cafeto (Coffea arabica)   — arbusto de porte columnar con PISOS de ramas
 *                                 horizontales y hoja verde oscura lustrosa.
 *   · Cereza de café            — el fruto, INSTANCIADO APARTE con color por
 *                                 instancia: verde → pintón amarillo → ROJO
 *                                 cereza (el estado de maduración varía por mata).
 *   · Guamo (Inga)              — el árbol de sombrío clásico: tronco que se
 *                                 bifurca y copa ANCHA y plana, un parasol.
 *   · Nogal cafetero            — el otro sombrío: tronco recto y alto, copa
 *     (Cordia alliodora)          más recogida y elevada.
 *   · Plátano intercalado       — pseudotallo claro y hojas enormes arqueadas.
 *   · Hojarasca + piedra        — el mantillo que la sombra deja en el suelo.
 *
 * TÉCNICA tier-safe (mismo contrato que floraParamo.geom): cada especie se
 * FUSIONA en UNA geometría con color horneado en vertexColors y se dibuja con
 * UN InstancedMesh → una draw-call por especie. La CEREZA se pinta BLANCA en la
 * geometría para que el color POR INSTANCIA (setColorAt) sea el color real del
 * fruto — así el mismo InstancedMesh lleva cerezas verdes, pintonas y rojas.
 *
 * ⚠️ mergeGeometries devuelve NULL EN SILENCIO si se mezclan geometrías
 * indexadas con no-indexadas (ya mordió 3 veces): aquí TODO se desindexa antes
 * de fusionar y se TRUENA si aun así falla.
 *
 * Aquí viven SOLO los datos y las mallas (nada de WebGL): corre headless.
 */
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { rng } from '../bosque/entQuenua.geom.js';

/* -------------------------------------------------------------------------- */
/*  La ladera cafetera (la geografía del mundo, determinista)                  */
/* -------------------------------------------------------------------------- */

export const ANCHO = 38; // x: -19 … 19
export const FONDO = 36; // z: -18 (la loma, arriba) … 18 (el frente, abajo)

const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const smoothstep = (a, b, x) => {
  const t = clamp((x - a) / (b - a), 0, 1);
  return t * t * (3 - 2 * t);
};

/* Ruido determinista (hash de senos): misma ladera siempre, sin Math.random. */
function ruido(wx, wz) {
  return (
    Math.sin(wx * 0.8 + wz * 0.6) * 0.5 +
    Math.sin(wx * 1.9 - wz * 1.4 + 2.3) * 0.3 +
    Math.sin(wx * 3.1 + wz * 2.7 + 5.1) * 0.2
  );
}

/** La altura de la ladera en un punto: sube hacia el fondo (el café es de montaña). */
export function alturaLadera(wx, wz) {
  const sub = smoothstep(6, -16, wz); // 0 al frente (bajo), 1 al fondo (la loma)
  let h = 0.12;
  h += sub * 5.4; // la ladera cafetera gana altura hacia atrás
  h += ruido(wx * 0.5, wz * 0.5) * 0.35 * (0.3 + sub); // ondulación natural
  return h;
}

/* -------------------------------------------------------------------------- */
/*  Presupuesto por tier                                                       */
/* -------------------------------------------------------------------------- */

/*
 * Instancias por especie. 'alto' puebla el cafetal pleno; 'medio' es frugal;
 * 'bajo' deja lo mínimo para que AÚN se lea "cafetal con sombrío". La cereza es
 * el conteo del InstancedMesh de frutos (repartidos entre las matas cargadas).
 */
export const FLORA_CAFETAL = {
  alto: { cafeto: 120, cereza: 360, guamo: 7, nogal: 3, platano: 6, hojarasca: 14, piedra: 6 },
  medio: { cafeto: 70, cereza: 190, guamo: 5, nogal: 2, platano: 4, hojarasca: 8, piedra: 4 },
  bajo: { cafeto: 30, cereza: 80, guamo: 3, nogal: 1, platano: 2, hojarasca: 4, piedra: 2 },
};

/** Conteos para un tier (desconocido → frugal, nunca el más caro). */
export const cafetalDeTier = (tier) => FLORA_CAFETAL[tier] || FLORA_CAFETAL.medio;

/** Factor de detalle geométrico por tier (menos blobs/hojas en gama baja). */
export const CALIDAD_CAFETAL = { alto: 1, medio: 0.62, bajo: 0.42 };
export const calidadCafetal = (tier) => CALIDAD_CAFETAL[tier] ?? CALIDAD_CAFETAL.medio;

/* -------------------------------------------------------------------------- */
/*  Paleta del cafetal (colores horneados en vertexColors)                     */
/* -------------------------------------------------------------------------- */

export const PAL = {
  // Cafeto
  cafetoTallo: '#5a4430', // tallo leñoso delgado
  cafetoHoja: '#2e5c33', // hoja verde oscura lustrosa (la firma del café)
  cafetoHojaSol: '#477a3d', // la cara del piso que da al sol
  cafetoBrote: '#7fa24c', // cogollo tierno arriba

  // Los tres estados de la cereza (van POR INSTANCIA, no aquí; referencia):
  cerezaVerde: '#6f9e3c',
  cerezaPinton: '#dca63c',
  cerezaRoja: '#c1301f',

  // Guamo (Inga) — el parasol del sombrío
  guamoTronco: '#6b533a',
  guamoCopa: '#4b7c3a',
  guamoCopaSol: '#699a48',

  // Nogal cafetero (Cordia alliodora) — el sombrío alto y recto
  nogalTronco: '#8a8274',
  nogalCopa: '#527a40',
  nogalCopaSol: '#6c9450',

  // Plátano intercalado
  platanoTallo: '#a8b06c',
  platanoHoja: '#5d9440',
  platanoHojaSol: '#7cb04e',
  platanoHojaSeca: '#a5924c',

  // Suelo
  hojarasca: '#8a6c42',
  hojarasca2: '#75592f',
  piedra: '#8b8578',
  liquen: '#a3a878',
};

/* -------------------------------------------------------------------------- */
/*  Utilidades (fusión desindexada + colocación + color horneado)              */
/* -------------------------------------------------------------------------- */

const UP = new THREE.Vector3(0, 1, 0);

/** Hornea un color plano en TODOS los vértices (atributo `color`). */
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

/** Coloca una geometría (posición/rotación/escala) transformando vértices. */
function poner(geo, pos = [0, 0, 0], rot = [0, 0, 0], scale = [1, 1, 1]) {
  const m = new THREE.Matrix4().compose(
    new THREE.Vector3(pos[0], pos[1], pos[2]),
    new THREE.Quaternion().setFromEuler(new THREE.Euler(rot[0], rot[1], rot[2])),
    new THREE.Vector3(scale[0], scale[1], scale[2]),
  );
  geo.applyMatrix4(m);
  return geo;
}

/** Orienta el +Y de la geometría hacia `dir` y la ubica en `pos` (hojas). */
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

/**
 * Fusiona partes (ya coloreadas) en UNA geometría. Se DESINDEXA todo antes de
 * fusionar y se TRUENA si falla: mejor un error de build que una especie
 * invisible en producción (mordida conocida de mergeGeometries).
 */
function fusionar(partes) {
  const buenas = partes.filter(Boolean).map((p) => {
    const plana = p.index ? p.toNonIndexed() : p;
    if (plana !== p) p.dispose();
    return plana;
  });
  const g = mergeGeometries(buenas, false);
  if (!g) {
    throw new Error('floraCafetal: mergeGeometries devolvió null — atributos incompatibles entre partes');
  }
  return g;
}

/** Pequeña variación determinista de color (que el cafetal no sea plano). */
function variar(base, r, amt = 0.06) {
  const c = new THREE.Color(base);
  c.multiplyScalar(1 + (r() - 0.5) * amt * 2);
  return c;
}

/* -------------------------------------------------------------------------- */
/*  CAFETO (Coffea arabica) — el cultivo                                       */
/* -------------------------------------------------------------------------- */

/*
 * Porte columnar con PISOS: un tallo leñoso central y 3 pisos de follaje
 * anchos y bajos (las ramas horizontales del café leídas como masas), hoja
 * oscura abajo y cara al sol arriba, cogollo tierno en la punta. Las CEREZAS
 * no van aquí: son un InstancedMesh aparte con color por instancia.
 */
export function geomCafeto({ q = 1 } = {}, seed = 1) {
  const r = rng(seed);
  const partes = [];

  // El tallo leñoso central.
  const tallo = new THREE.CylinderGeometry(0.035, 0.06, 1.2, 5, 1);
  poner(tallo, [0, 0.6, 0]);
  partes.push(pintar(tallo, PAL.cafetoTallo));

  // Los PISOS de follaje: anchos abajo, angostos arriba (el porte del café).
  const pisos = [
    { y: 0.46, rad: 0.44, cara: false },
    { y: 0.78, rad: 0.37, cara: true },
    { y: 1.06, rad: 0.28, cara: true },
  ];
  const nPisos = q < 0.5 ? 2 : 3;
  for (let i = 0; i < nPisos; i++) {
    const p = pisos[i];
    const masa = new THREE.IcosahedronGeometry(p.rad, 1); // detail 1: la mata tupida
    poner(masa, [(r() - 0.5) * 0.08, p.y, (r() - 0.5) * 0.08], [0, r() * Math.PI, 0], [1.35, 0.6, 1.35]);
    partes.push(pintar(masa, variar(p.cara ? PAL.cafetoHojaSol : PAL.cafetoHoja, r, 0.05)));
  }

  // El cogollo tierno de la punta.
  const brote = new THREE.IcosahedronGeometry(0.12, 0);
  poner(brote, [0, 1.24, 0], [0, r() * Math.PI, 0], [1, 0.8, 1]);
  partes.push(pintar(brote, PAL.cafetoBrote));

  return fusionar(partes);
}

/** La cereza del café: UNA bolita blanca — el color real va POR INSTANCIA. */
export function geomCereza() {
  const g = new THREE.IcosahedronGeometry(0.07, 0);
  return pintar(g.index ? g.toNonIndexed() : g, '#ffffff');
}

/* -------------------------------------------------------------------------- */
/*  GUAMO (Inga) — el parasol del sombrío                                      */
/* -------------------------------------------------------------------------- */

export function geomGuamo({ q = 1 } = {}, seed = 2) {
  const r = rng(seed);
  const partes = [];

  // Tronco que se abre en ramas maestras.
  const tronco = new THREE.CylinderGeometry(0.14, 0.24, 2.9, 7, 1);
  poner(tronco, [0, 1.45, 0]);
  partes.push(pintar(tronco, PAL.guamoTronco));
  const nRamas = Math.max(2, Math.round(3 * q));
  for (let i = 0; i < nRamas; i++) {
    const a = (i / nRamas) * Math.PI * 2 + r();
    const rama = new THREE.CylinderGeometry(0.05, 0.09, 1.3, 5, 1);
    apuntar(rama, [Math.cos(a) * 0.55, 3.1, Math.sin(a) * 0.55], [Math.cos(a) * 0.9, 1, Math.sin(a) * 0.9]);
    partes.push(pintar(rama, PAL.guamoTronco));
  }

  // La copa ANCHA y plana: el techo de hojas sobre el cafetal.
  const nMasas = Math.max(3, Math.round(5 * q));
  for (let i = 0; i < nMasas; i++) {
    const a = (i / nMasas) * Math.PI * 2 + 0.7;
    const rad = i === 0 ? 0 : 1.0 + r() * 0.4;
    const masa = new THREE.IcosahedronGeometry(i === 0 ? 1.25 : 0.95 + r() * 0.25, 1);
    poner(
      masa,
      [Math.cos(a) * rad, 3.55 + (r() - 0.5) * 0.35, Math.sin(a) * rad],
      [0, r() * Math.PI, 0],
      [1.7, 0.74, 1.7],
    );
    partes.push(pintar(masa, variar(i % 2 ? PAL.guamoCopaSol : PAL.guamoCopa, r, 0.06)));
  }

  return fusionar(partes);
}

/* -------------------------------------------------------------------------- */
/*  NOGAL CAFETERO (Cordia alliodora) — el sombrío alto y recto                */
/* -------------------------------------------------------------------------- */

export function geomNogal({ q = 1 } = {}, seed = 3) {
  const r = rng(seed);
  const partes = [];

  // Tronco recto y alto (madera fina de la finca cafetera).
  const tronco = new THREE.CylinderGeometry(0.1, 0.17, 4.1, 7, 1);
  poner(tronco, [0, 2.05, 0]);
  partes.push(pintar(tronco, PAL.nogalTronco));

  // Copa recogida y elevada, por pisos cortos (silueta de nogal).
  const nMasas = Math.max(3, Math.round(4 * q));
  for (let i = 0; i < nMasas; i++) {
    const a = i * 2.1 + 0.5;
    const rad = i === 0 ? 0 : 0.55 + r() * 0.3;
    const masa = new THREE.IcosahedronGeometry(0.75 + r() * 0.2, 1);
    poner(
      masa,
      [Math.cos(a) * rad, 4.15 + i * 0.32, Math.sin(a) * rad],
      [0, r() * Math.PI, 0],
      [1.15, 0.8, 1.15],
    );
    partes.push(pintar(masa, variar(i % 2 ? PAL.nogalCopaSol : PAL.nogalCopa, r, 0.06)));
  }

  return fusionar(partes);
}

/* -------------------------------------------------------------------------- */
/*  PLÁTANO intercalado — el acompañante de casi todo cafetal campesino        */
/* -------------------------------------------------------------------------- */

export function geomPlatano({ q = 1 } = {}, seed = 4) {
  const r = rng(seed);
  const partes = [];

  // Pseudotallo claro.
  const tallo = new THREE.CylinderGeometry(0.09, 0.14, 1.9, 6, 1);
  poner(tallo, [0, 0.95, 0]);
  partes.push(pintar(tallo, PAL.platanoTallo));

  // Las hojas enormes, arqueadas hacia afuera y abajo.
  const nHojas = Math.max(4, Math.round(6 * q));
  for (let i = 0; i < nHojas; i++) {
    const a = (i / nHojas) * Math.PI * 2 + r() * 0.5;
    const caida = 0.55 + r() * 0.4; // cuánto se arquea
    const hoja = new THREE.SphereGeometry(1, 7, 5);
    const seca = r() > 0.82; // alguna hoja vieja amarillea
    apuntar(
      hoja,
      [Math.cos(a) * 0.5, 1.95, Math.sin(a) * 0.5],
      [Math.cos(a), 1 - caida, Math.sin(a)],
      [0.14, 0.85, 0.32],
    );
    partes.push(pintar(hoja, variar(seca ? PAL.platanoHojaSeca : i % 2 ? PAL.platanoHojaSol : PAL.platanoHoja, r, 0.05)));
  }

  return fusionar(partes);
}

/* -------------------------------------------------------------------------- */
/*  Suelo: hojarasca y piedra                                                  */
/* -------------------------------------------------------------------------- */

export function geomHojarasca(seed = 5) {
  const r = rng(seed);
  const partes = [];
  for (let i = 0; i < 3; i++) {
    const mancha = new THREE.CylinderGeometry(0.34 + r() * 0.3, 0.42 + r() * 0.32, 0.035, 7, 1);
    poner(mancha, [(r() - 0.5) * 0.5, 0.02 + i * 0.012, (r() - 0.5) * 0.5], [0, r() * Math.PI, 0]);
    partes.push(pintar(mancha, i % 2 ? PAL.hojarasca2 : PAL.hojarasca));
  }
  return fusionar(partes);
}

export function geomPiedra(seed = 6) {
  const r = rng(seed);
  const roca = new THREE.DodecahedronGeometry(0.32, 0);
  poner(roca, [0, 0.14, 0], [r() * 0.6, r() * Math.PI, r() * 0.6], [1.25, 0.7, 1]);
  const capa = new THREE.DodecahedronGeometry(0.18, 0);
  poner(capa, [0.12, 0.24, 0.05], [0, r() * Math.PI, 0], [1, 0.55, 1]);
  return fusionar([pintar(roca, PAL.piedra), pintar(capa, PAL.liquen)]);
}

/* -------------------------------------------------------------------------- */
/*  Distribución: surcos a curva de nivel + sombrío disperso                   */
/* -------------------------------------------------------------------------- */

/* El sombrío vive FIJO en la ladera (posiciones compuestas a mano para que el
   techo de sombra cubra el cultivo sin taparlo todo). Se recortan por tier. */
const SITIOS_GUAMO = [
  [-8.5, -5.5], [-1.5, -8.5], [6.5, -6.0], [11.0, -2.5], [-12.5, -10.0], [2.5, -12.5], [-4.5, -2.0],
];
const SITIOS_NOGAL = [
  [9.5, -10.5], [-6.5, -13.0], [14.0, -7.5],
];
const SITIOS_PLATANO = [
  [-11.5, -3.0], [4.0, -3.8], [-3.0, -11.0], [12.5, -12.0], [-14.5, -7.0], [8.0, -1.2],
];

/* La casa/beneficiadero vive arriba al fondo; los surcos la respetan. */
export const SITIO_CASA = /** @type {[number, number]} */ ([9.0, -14.6]);

/** ¿Qué tan maduro está el café en esta franja? Abajo (más caliente) más rojo. */
function madurezEn(wz, r) {
  const base = smoothstep(-13.5, 3.0, wz); // el frente de la ladera pinta primero
  return clamp(base + (r() - 0.5) * 0.35, 0, 1);
}

/**
 * Siembra determinista del cafetal completo. Devuelve items por especie:
 * `{pos, rotY, escala, tint}` (contrato del componente `Especie`), y para la
 * cereza el `tint` ES el color del fruto (verde → pintón → rojo por instancia).
 */
export function distribucionCafetal(conteos, seed = 311) {
  const c = conteos;
  const rCaf = rng(seed + 1);
  const rCer = rng(seed + 2);
  const rSue = rng(seed + 3);

  // --- Los surcos a curva de nivel (el café nunca se siembra ladera abajo). ---
  const sitios = [];
  const filasZ = [2.6, 1.0, -0.6, -2.2, -3.8, -5.4, -7.0, -8.6, -10.2, -11.8, -13.4];
  filasZ.forEach((z0, fila) => {
    for (let wx = -15; wx <= 15; wx += 1.35) {
      const jx = (rCaf() - 0.5) * 0.5;
      const curva = Math.sin(wx * 0.13 + fila * 0.45) * 0.9; // la curva del surco
      const px = wx + jx;
      const pz = z0 + curva + (rCaf() - 0.5) * 0.3;
      // respetar el patio de la casa/beneficiadero
      const dx = px - SITIO_CASA[0];
      const dz = pz - SITIO_CASA[1];
      if (dx * dx + dz * dz < 16) continue;
      sitios.push({
        px, pz,
        esc: 0.8 + rCaf() * 0.45,
        rotY: rCaf() * Math.PI * 2,
        maduro: madurezEn(pz, rCaf),
        carga: rCaf(), // qué tan cargada de fruto está la mata
      });
    }
  });
  // recorte determinista al presupuesto del tier (salto parejo, no los primeros N)
  const paso = Math.max(1, Math.floor(sitios.length / Math.max(1, c.cafeto)));
  const matas = [];
  for (let i = 0; i < sitios.length && matas.length < c.cafeto; i += paso) matas.push(sitios[i]);

  const cafeto = matas.map((s) => ({
    pos: [s.px, alturaLadera(s.px, s.pz), s.pz],
    rotY: s.rotY,
    escala: s.esc,
    tint: [0.92 + rCaf() * 0.16, 0.92 + rCaf() * 0.16, 0.92 + rCaf() * 0.16],
  }));

  // --- Las cerezas: racimos alrededor de los pisos de las matas cargadas. ---
  const verde = new THREE.Color(PAL.cerezaVerde);
  const pinton = new THREE.Color(PAL.cerezaPinton);
  const roja = new THREE.Color(PAL.cerezaRoja);
  const col = new THREE.Color();
  const cereza = [];
  const cargadas = matas.filter((s) => s.carga > 0.3);
  let gi = 0;
  while (cereza.length < c.cereza && cargadas.length > 0) {
    const s = cargadas[gi % cargadas.length];
    gi += 1;
    if (gi > cargadas.length * 9) break;
    const cuantas = 2 + Math.floor(rCer() * 3);
    for (let k = 0; k < cuantas && cereza.length < c.cereza; k++) {
      const a = rCer() * Math.PI * 2;
      const nivel = rCer();
      const rad = (0.3 + nivel * -0.08 + rCer() * 0.16) * s.esc * 1.2;
      const y = (0.42 + nivel * 0.6) * s.esc;
      // el estado del fruto: la madurez de la mata + su propio azar
      const m = clamp(s.maduro + (rCer() - 0.5) * 0.5, 0, 1);
      if (m < 0.5) col.lerpColors(verde, pinton, m * 2);
      else col.lerpColors(pinton, roja, (m - 0.5) * 2);
      col.multiplyScalar(0.92 + rCer() * 0.16);
      cereza.push({
        pos: [s.px + Math.cos(a) * rad, alturaLadera(s.px, s.pz) + y, s.pz + Math.sin(a) * rad],
        rotY: rCer() * Math.PI,
        escala: 0.85 + rCer() * 0.4,
        tint: [col.r, col.g, col.b],
      });
    }
  }

  // --- El sombrío y el plátano (sitios fijos recortados por tier). ---
  const enLadera = (p, esc, rr) => ({
    pos: [p[0], alturaLadera(p[0], p[1]), p[1]],
    rotY: rr() * Math.PI * 2,
    escala: esc,
    tint: [0.94 + rr() * 0.12, 0.94 + rr() * 0.12, 0.94 + rr() * 0.12],
  });
  const rArb = rng(seed + 4);
  const guamo = SITIOS_GUAMO.slice(0, c.guamo).map((p) => enLadera(p, 0.95 + rArb() * 0.35, rArb));
  const nogal = SITIOS_NOGAL.slice(0, c.nogal).map((p) => enLadera(p, 0.95 + rArb() * 0.25, rArb));
  const platano = SITIOS_PLATANO.slice(0, c.platano).map((p) => enLadera(p, 0.85 + rArb() * 0.3, rArb));

  // --- El suelo: hojarasca bajo el sombrío, piedras sueltas. ---
  const hojarasca = [];
  const bajoSombra = [...SITIOS_GUAMO.slice(0, c.guamo), ...SITIOS_NOGAL.slice(0, c.nogal)];
  for (let i = 0; i < c.hojarasca; i++) {
    const s = bajoSombra[i % Math.max(1, bajoSombra.length)] || [0, -6];
    const x = s[0] + (rSue() - 0.5) * 3.2;
    const z = s[1] + (rSue() - 0.5) * 3.2;
    hojarasca.push({
      pos: [x, alturaLadera(x, z) + 0.01, z],
      rotY: rSue() * Math.PI * 2,
      escala: 0.8 + rSue() * 0.7,
      tint: [0.92 + rSue() * 0.16, 0.92 + rSue() * 0.16, 0.92 + rSue() * 0.16],
    });
  }
  const piedra = [];
  for (let i = 0; i < c.piedra; i++) {
    const x = -16 + rSue() * 32;
    const z = -14 + rSue() * 28;
    piedra.push({
      pos: [x, alturaLadera(x, z), z],
      rotY: rSue() * Math.PI * 2,
      escala: 0.7 + rSue() * 0.9,
      tint: [0.92 + rSue() * 0.16, 0.92 + rSue() * 0.16, 0.92 + rSue() * 0.16],
    });
  }

  return { cafeto, cereza, guamo, nogal, platano, hojarasca, piedra };
}

/** Los centros del sombrío del tier (para la luz colada bajo las copas). */
export function centrosSombrio(conteos) {
  return [
    ...SITIOS_GUAMO.slice(0, conteos.guamo),
    ...SITIOS_NOGAL.slice(0, conteos.nogal),
  ].map(([x, z]) => /** @type {[number, number, number]} */ ([x, alturaLadera(x, z), z]));
}
