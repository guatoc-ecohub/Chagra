/*
 * floraLecheria.geom — la GEOMETRÍA del POTRERO SILVOPASTORIL de la lechería
 * campesina (piso templado, la lechería tropical de altura media de Colombia).
 *
 * La ganadería agroecológica no es potrero pelado a pleno sol: es un SISTEMA
 * SILVOPASTORIL — árboles y arbustos forrajeros REALES sembrados entre el pasto,
 * que dan sombra, forraje de alta proteína, fijan nitrógeno y traen de vuelta la
 * vida. Cada especie con su identidad inequívoca (todas verificadas en el DR de
 * la cadena láctea, confirmadas por gemini Y glm):
 *
 *   · Nacedero / quiebrabarrigo   — Trichanthera gigantea. Arbolito de HOJA
 *     (Trichanthera gigantea)       GRANDE y copa densa; fija nitrógeno, forraje
 *                                   de alta calidad. La columna del banco forrajero.
 *   · Matarratón                  — Gliricidia sepium. Copa abierta y aireada con
 *     (Gliricidia sepium)           FLOR ROSADA-LILA (su firma); follaje muy
 *                                   nutritivo, antiparasitario, y el poste vivo
 *                                   por excelencia de la cerca viva.
 *   · Leucaena                    — Leucaena leucocephala. El "árbol insignia" de
 *     (Leucaena leucocephala)       los SSP: alto, follaje FINO y plumoso, vainas
 *                                   y flores en pompón crema. Alto aporte de proteína.
 *   · Botón de oro                — Tithonia diversifolia. ARBUSTO de FLOR AMARILLA
 *     (Tithonia diversifolia)       intensa (16–28% de proteína); el banco forrajero
 *                                   que además alimenta polinizadores.
 *   · Macolla de pasto            — el pasto de piso (kikuyo/estrella según el
 *                                   clima); la cobertura viva del potrero.
 *   · Boñiga                      — la plasta de estiércol en el potrero: el
 *                                   principio del ciclo (estiércol → abono/biogás).
 *
 * TÉCNICA tier-safe (mismo contrato que floraCafetal.geom): cada especie se
 * FUSIONA en UNA geometría con color horneado en vertexColors y se dibuja con UN
 * InstancedMesh → una draw-call por especie. La FLOR (rosada del matarratón,
 * amarilla del botón de oro) va HORNEADA en la geometría de su especie.
 *
 * ⚠️ mergeGeometries devuelve NULL EN SILENCIO si se mezclan geometrías indexadas
 * con no-indexadas (ya mordió 3 veces): aquí TODO se desindexa antes de fusionar
 * y se TRUENA si aun así falla.
 *
 * Aquí viven SOLO los datos y las mallas (nada de WebGL): corre headless.
 */
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { rng } from '../bosque/entQuenua.geom.js';

/* -------------------------------------------------------------------------- */
/*  El potrero (la geografía del mundo, determinista)                          */
/* -------------------------------------------------------------------------- */

export const ANCHO = 42; // x: -21 … 21
export const FONDO = 40; // z: -20 (los cerros, al fondo) … 20 (el frente)

const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const smoothstep = (a, b, x) => {
  const t = clamp((x - a) / (b - a), 0, 1);
  return t * t * (3 - 2 * t);
};

/* Ruido determinista (hash de senos): mismo potrero siempre, sin Math.random. */
function ruido(wx, wz) {
  return (
    Math.sin(wx * 0.7 + wz * 0.5) * 0.5 +
    Math.sin(wx * 1.7 - wz * 1.3 + 2.1) * 0.3 +
    Math.sin(wx * 3.0 + wz * 2.4 + 4.7) * 0.2
  );
}

/**
 * La altura del potrero: casi PLANO al frente (donde pastan las vacas y está la
 * quesera), con ondulación suave de loma, y SUBE hacia el fondo a encontrarse
 * con los cerros. Un potrero no es una ladera empinada como el cafetal.
 */
export function alturaPotrero(wx, wz) {
  const alFondo = smoothstep(-6, -19, wz); // 0 al frente, 1 contra los cerros
  let h = 0.08;
  h += alFondo * 3.2; // el pie de monte al fondo
  h += ruido(wx * 0.35, wz * 0.32) * 0.45 * (0.4 + alFondo); // el rolar del potrero
  return h;
}

/* Los SITIOS de lo construido (la escena los posa sobre el terreno). */
export const SITIO_QUESERA = /** @type {[number, number]} */ ([8.2, 3.4]);
export const SITIO_BIODIGESTOR = /** @type {[number, number]} */ ([3.6, 5.6]);
export const SITIO_ABONO = /** @type {[number, number]} */ ([0.4, 6.4]);
export const SITIO_BEBEDERO = /** @type {[number, number]} */ ([-3.0, -2.4]);

/* LA SALA DE ORDEÑO (pasada Nolan: la hora del ordeño) — el cobertizo del
   lado del hato, con la boca abierta hacia el oriente y el frente (por donde
   entra el primer azul de la madrugada). */
export const SITIO_ORDENO = /** @type {[number, number]} */ ([-11.0, 4.2]);
export const ROT_ORDENO = -0.5; // giro Y de la sala (la boca mira al sureste)

/* El PUESTO del brete DENTRO de la sala, en coordenadas de mundo: donde la
   vaca del ordeño se para (GanadoLechero la trae aquí de madrugada), de cara
   a la canoa de la media pared. */
const LOCAL_BRETE = [-1.05, -0.35]; // x,z locales de la sala
export const PUESTO_ORDENO = {
  pos: /** @type {[number, number]} */ ([
    SITIO_ORDENO[0] + LOCAL_BRETE[0] * Math.cos(ROT_ORDENO) + LOCAL_BRETE[1] * Math.sin(ROT_ORDENO),
    SITIO_ORDENO[1] - LOCAL_BRETE[0] * Math.sin(ROT_ORDENO) + LOCAL_BRETE[1] * Math.cos(ROT_ORDENO),
  ]),
  giro: Math.PI / 2 + ROT_ORDENO, // el modelo mira +x → queda de cara a la pared (-z local)
};

/* -------------------------------------------------------------------------- */
/*  Presupuesto por tier                                                       */
/* -------------------------------------------------------------------------- */

export const FLORA_LECHERIA = {
  alto: { nacedero: 5, matarraton: 6, leucaena: 4, botonDeOro: 16, pasto: 96, boniga: 12 },
  medio: { nacedero: 3, matarraton: 4, leucaena: 2, botonDeOro: 9, pasto: 54, boniga: 7 },
  bajo: { nacedero: 2, matarraton: 2, leucaena: 1, botonDeOro: 4, pasto: 22, boniga: 3 },
};
export const lecheriaDeTier = (tier) => FLORA_LECHERIA[tier] || FLORA_LECHERIA.medio;

export const CALIDAD_LECHERIA = { alto: 1, medio: 0.62, bajo: 0.42 };
export const calidadLecheria = (tier) => CALIDAD_LECHERIA[tier] ?? CALIDAD_LECHERIA.medio;

/* -------------------------------------------------------------------------- */
/*  Paleta del potrero (colores horneados en vertexColors)                     */
/* -------------------------------------------------------------------------- */

export const PAL = {
  // Nacedero (Trichanthera) — hoja grande, verde franco
  nacederoTronco: '#6a5c4a',
  nacederoHoja: '#4e8a3e',
  nacederoHojaSol: '#68a548',
  nacederoHojaSombra: '#3a6c34',

  // Matarratón (Gliricidia) — copa aireada + flor rosada-lila (LA firma)
  matarratonTronco: '#9a9a8f',
  matarratonHoja: '#7a9a45',
  matarratonHojaSol: '#95b45a',
  matarratonFlor: '#e46b9b', // la flor rosada del matarratón (ACENTOS.florDeMonte)
  matarratonFlorPalo: '#d98fb0',

  // Leucaena — follaje fino plumoso azul-verdoso + pompón crema
  leucaenaTronco: '#7a6a52',
  leucaenaHoja: '#5c8a5e',
  leucaenaHojaSol: '#79a56e',
  leucaenaPompon: '#f2ead3', // la flor crema en pompón
  leucaenaVaina: '#9a7c46', // la vaina parda

  // Botón de oro (Tithonia) — arbusto verde + FLOR AMARILLA intensa
  botonHoja: '#5f8a3f',
  botonHojaSol: '#7a9a3f',
  botonFlor: '#f2c33a', // el amarillo botón de oro (ACENTOS.guayacan)
  botonFlorCentro: '#c98a2a',

  // Pasto y suelo
  pasto: '#5f8a3f',
  pastoSol: '#7a9a3f',
  pastoSeco: '#a5975c',
  boniga: '#5a3d28', // la plasta fresca-parda del estiércol (TIERRAS.turba)
  bonigaBorde: '#6b4a2e',
};

/* -------------------------------------------------------------------------- */
/*  Utilidades (fusión desindexada + colocación + color horneado)              */
/* -------------------------------------------------------------------------- */

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

function poner(geo, pos = [0, 0, 0], rot = [0, 0, 0], scale = [1, 1, 1]) {
  const m = new THREE.Matrix4().compose(
    new THREE.Vector3(pos[0], pos[1], pos[2]),
    new THREE.Quaternion().setFromEuler(new THREE.Euler(rot[0], rot[1], rot[2])),
    new THREE.Vector3(scale[0], scale[1], scale[2]),
  );
  geo.applyMatrix4(m);
  return geo;
}

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
function fusionar(partes, etiqueta) {
  const buenas = partes.filter(Boolean).map((p) => {
    const plana = p.index ? p.toNonIndexed() : p;
    if (plana !== p) p.dispose();
    return plana;
  });
  const g = mergeGeometries(buenas, false);
  if (!g) {
    throw new Error(`floraLecheria: mergeGeometries devolvió null en "${etiqueta}" — atributos incompatibles`);
  }
  return g;
}

function variar(base, r, amt = 0.06) {
  const c = new THREE.Color(base);
  c.multiplyScalar(1 + (r() - 0.5) * amt * 2);
  return c;
}

/* -------------------------------------------------------------------------- */
/*  NACEDERO (Trichanthera gigantea) — la columna del banco forrajero          */
/* -------------------------------------------------------------------------- */

/*
 * Arbolito de HOJA GRANDE: tronco corto que se abre en pocas ramas maestras y
 * una copa densa, redondeada, de masas anchas — con unas hojas gigantes
 * insinuadas como paletas planas (su firma: la hoja de quiebrabarrigo).
 */
export function geomNacedero({ q = 1 } = {}, seed = 2) {
  const r = rng(seed);
  const partes = [];

  const tronco = new THREE.CylinderGeometry(0.1, 0.17, 2.2, 6, 1);
  poner(tronco, [0, 1.1, 0]);
  partes.push(pintar(tronco, PAL.nacederoTronco));

  const nRamas = Math.max(2, Math.round(3 * q));
  for (let i = 0; i < nRamas; i++) {
    const a = (i / nRamas) * Math.PI * 2 + r();
    const rama = new THREE.CylinderGeometry(0.05, 0.08, 1.1, 5, 1);
    apuntar(rama, [Math.cos(a) * 0.35, 2.2, Math.sin(a) * 0.35], [Math.cos(a) * 0.7, 1, Math.sin(a) * 0.7]);
    partes.push(pintar(rama, PAL.nacederoTronco));
  }

  // La copa densa y redonda: masas anchas de hoja grande.
  const nMasas = Math.max(3, Math.round(6 * q));
  for (let i = 0; i < nMasas; i++) {
    const a = (i / nMasas) * Math.PI * 2 + 0.5;
    const rad = i === 0 ? 0 : 0.55 + r() * 0.35;
    const masa = new THREE.IcosahedronGeometry(i === 0 ? 1.05 : 0.72 + r() * 0.22, 1);
    poner(
      masa,
      [Math.cos(a) * rad, 2.7 + (r() - 0.5) * 0.4, Math.sin(a) * rad],
      [0, r() * Math.PI, 0],
      [1.25, 1.0, 1.25],
    );
    partes.push(pintar(masa, variar(i % 2 ? PAL.nacederoHojaSol : PAL.nacederoHoja, r, 0.06)));
  }

  // Unas hojas GIGANTES asomando (la firma del nacedero): paletas planas anchas.
  const nHojas = q < 0.5 ? 2 : Math.round(5 * q);
  for (let i = 0; i < nHojas; i++) {
    const a = r() * Math.PI * 2;
    const hoja = new THREE.SphereGeometry(1, 6, 4);
    apuntar(
      hoja,
      [Math.cos(a) * 0.95, 2.55 + r() * 0.5, Math.sin(a) * 0.95],
      [Math.cos(a), 0.35, Math.sin(a)],
      [0.34, 0.05, 0.5],
    );
    partes.push(pintar(hoja, i % 2 ? PAL.nacederoHojaSol : PAL.nacederoHojaSombra));
  }

  return fusionar(partes, 'nacedero');
}

/* -------------------------------------------------------------------------- */
/*  MATARRATÓN (Gliricidia sepium) — copa aireada + flor rosada (su firma)     */
/* -------------------------------------------------------------------------- */

export function geomMatarraton({ q = 1 } = {}, seed = 3) {
  const r = rng(seed);
  const partes = [];

  // Tronco esbelto que se inclina y bifurca (el árbol de cerca viva).
  const tronco = new THREE.CylinderGeometry(0.09, 0.15, 3.0, 6, 1);
  poner(tronco, [0, 1.5, 0], [0, 0, 0.08]);
  partes.push(pintar(tronco, PAL.matarratonTronco));
  const nRamas = Math.max(2, Math.round(3 * q));
  for (let i = 0; i < nRamas; i++) {
    const a = (i / nRamas) * Math.PI * 2 + r();
    const rama = new THREE.CylinderGeometry(0.04, 0.07, 1.4, 5, 1);
    apuntar(rama, [Math.cos(a) * 0.5, 3.05, Math.sin(a) * 0.5], [Math.cos(a) * 1.1, 1, Math.sin(a) * 1.1]);
    partes.push(pintar(rama, PAL.matarratonTronco));
  }

  // Copa AIREADA: masas más chicas y separadas (deja pasar la luz).
  const nMasas = Math.max(4, Math.round(7 * q));
  const centros = [];
  for (let i = 0; i < nMasas; i++) {
    const a = (i / nMasas) * Math.PI * 2 + 0.3;
    const rad = i === 0 ? 0.2 : 0.9 + r() * 0.5;
    const cx = Math.cos(a) * rad;
    const cy = 3.5 + (r() - 0.5) * 0.6;
    const cz = Math.sin(a) * rad;
    centros.push([cx, cy, cz]);
    const masa = new THREE.IcosahedronGeometry(0.55 + r() * 0.22, 1);
    poner(masa, [cx, cy, cz], [0, r() * Math.PI, 0], [1.15, 0.78, 1.15]);
    partes.push(pintar(masa, variar(i % 2 ? PAL.matarratonHojaSol : PAL.matarratonHoja, r, 0.06)));
  }

  // LA FLOR ROSADA-LILA: racimos de bolitas rosadas por la copa (su identidad).
  const nFlores = q < 0.5 ? 4 : Math.round(12 * q);
  for (let i = 0; i < nFlores; i++) {
    const c = centros[i % centros.length];
    const flor = new THREE.IcosahedronGeometry(0.11 + r() * 0.05, 0);
    poner(flor, [c[0] + (r() - 0.5) * 0.7, c[1] + (r() - 0.5) * 0.5, c[2] + (r() - 0.5) * 0.7]);
    partes.push(pintar(flor, i % 3 ? PAL.matarratonFlor : PAL.matarratonFlorPalo));
  }

  return fusionar(partes, 'matarraton');
}

/* -------------------------------------------------------------------------- */
/*  LEUCAENA (Leucaena leucocephala) — el árbol insignia del SSP, follaje fino */
/* -------------------------------------------------------------------------- */

export function geomLeucaena({ q = 1 } = {}, seed = 4) {
  const r = rng(seed);
  const partes = [];

  // Tronco recto y alto (crece más que sus vecinos del banco).
  const tronco = new THREE.CylinderGeometry(0.08, 0.14, 3.9, 6, 1);
  poner(tronco, [0, 1.95, 0]);
  partes.push(pintar(tronco, PAL.leucaenaTronco));

  // Copa FINA y plumosa: muchas masas chicas, verde-azuloso claro.
  const nMasas = Math.max(5, Math.round(9 * q));
  const centros = [];
  for (let i = 0; i < nMasas; i++) {
    const a = i * 2.2 + 0.4;
    const rad = i === 0 ? 0 : 0.5 + r() * 0.45;
    const cx = Math.cos(a) * rad;
    const cy = 3.9 + i * 0.16 + (r() - 0.5) * 0.4;
    const cz = Math.sin(a) * rad;
    centros.push([cx, cy, cz]);
    const masa = new THREE.IcosahedronGeometry(0.42 + r() * 0.2, 1);
    poner(masa, [cx, cy, cz], [0, r() * Math.PI, 0], [1.2, 0.72, 1.2]);
    partes.push(pintar(masa, variar(i % 2 ? PAL.leucaenaHojaSol : PAL.leucaenaHoja, r, 0.06)));
  }

  // Los pompones crema (la flor) y alguna vaina parda colgando.
  const nPom = q < 0.5 ? 3 : Math.round(7 * q);
  for (let i = 0; i < nPom; i++) {
    const c = centros[i % centros.length];
    const pom = new THREE.IcosahedronGeometry(0.08 + r() * 0.03, 0);
    poner(pom, [c[0] + (r() - 0.5) * 0.6, c[1] + 0.2 + r() * 0.2, c[2] + (r() - 0.5) * 0.6]);
    partes.push(pintar(pom, PAL.leucaenaPompon));
  }
  const nVainas = q < 0.5 ? 0 : Math.round(4 * q);
  for (let i = 0; i < nVainas; i++) {
    const c = centros[(i + 2) % centros.length];
    const vaina = new THREE.BoxGeometry(0.03, 0.4, 0.09);
    poner(vaina, [c[0] + (r() - 0.5) * 0.5, c[1] - 0.35, c[2] + (r() - 0.5) * 0.5], [0, r() * Math.PI, 0.1]);
    partes.push(pintar(vaina, PAL.leucaenaVaina));
  }

  return fusionar(partes, 'leucaena');
}

/* -------------------------------------------------------------------------- */
/*  BOTÓN DE ORO (Tithonia diversifolia) — el arbusto de flor amarilla         */
/* -------------------------------------------------------------------------- */

export function geomBotonDeOro({ q = 1 } = {}, seed = 5) {
  const r = rng(seed);
  const partes = [];

  // Varios tallos delgados desde la base (mata arbustiva).
  const nTallos = Math.max(2, Math.round(4 * q));
  const cimas = [];
  for (let i = 0; i < nTallos; i++) {
    const a = (i / nTallos) * Math.PI * 2 + r();
    const incl = 0.12 + r() * 0.14;
    const cx = Math.cos(a) * 0.24;
    const cz = Math.sin(a) * 0.24;
    const tallo = new THREE.CylinderGeometry(0.02, 0.03, 1.35, 4, 1);
    poner(tallo, [cx, 0.68, cz], [Math.sin(a) * incl, 0, -Math.cos(a) * incl]);
    partes.push(pintar(tallo, '#6f7d3a'));
    cimas.push([cx + Math.sin(a) * incl * 0.7, 1.3, cz - Math.cos(a) * incl * 0.7]);
  }

  // La mata verde (masas bajas y anchas).
  const nMasas = Math.max(2, Math.round(4 * q));
  for (let i = 0; i < nMasas; i++) {
    const a = r() * Math.PI * 2;
    const masa = new THREE.IcosahedronGeometry(0.36 + r() * 0.16, 1);
    poner(masa, [Math.cos(a) * 0.3, 0.85 + r() * 0.45, Math.sin(a) * 0.3], [0, r() * Math.PI, 0], [1.15, 0.85, 1.15]);
    partes.push(pintar(masa, variar(i % 2 ? PAL.botonHojaSol : PAL.botonHoja, r, 0.06)));
  }

  // LA FLOR AMARILLA (el "botón de oro"): discos amarillos con centro anaranjado.
  const nFlores = Math.max(2, Math.round(6 * q));
  for (let i = 0; i < nFlores; i++) {
    const c = cimas[i % Math.max(1, cimas.length)] || [0, 1.3, 0];
    const dx = (r() - 0.5) * 0.4;
    const dz = (r() - 0.5) * 0.4;
    const petalos = new THREE.CylinderGeometry(0.16, 0.16, 0.035, 8, 1);
    poner(petalos, [c[0] + dx, c[1] + r() * 0.2, c[2] + dz], [0, r() * Math.PI, 0]);
    partes.push(pintar(petalos, PAL.botonFlor));
    const centro = new THREE.IcosahedronGeometry(0.06, 0);
    poner(centro, [c[0] + dx, c[1] + 0.03 + r() * 0.2, c[2] + dz]);
    partes.push(pintar(centro, PAL.botonFlorCentro));
  }

  return fusionar(partes, 'botonDeOro');
}

/* -------------------------------------------------------------------------- */
/*  MACOLLA DE PASTO — la cobertura viva del potrero                           */
/* -------------------------------------------------------------------------- */

export function geomPasto({ q = 1 } = {}, seed = 6) {
  const r = rng(seed);
  const partes = [];
  const nHojas = q < 0.5 ? 4 : Math.round(9 * q);
  for (let i = 0; i < nHojas; i++) {
    const a = r() * Math.PI * 2;
    const incl = 0.2 + r() * 0.35;
    const alto = 0.22 + r() * 0.26;
    const hoja = new THREE.ConeGeometry(0.03, alto, 3, 1);
    poner(
      hoja,
      [Math.cos(a) * 0.06, alto * 0.45, Math.sin(a) * 0.06],
      [Math.sin(a) * incl, 0, -Math.cos(a) * incl],
    );
    partes.push(pintar(hoja, i % 2 ? PAL.pastoSol : PAL.pasto));
  }
  return fusionar(partes, 'pasto');
}

/* -------------------------------------------------------------------------- */
/*  BOÑIGA — la plasta de estiércol: el principio del ciclo del abono          */
/* -------------------------------------------------------------------------- */

export function geomBoniga(seed = 7) {
  const r = rng(seed);
  const base = new THREE.CylinderGeometry(0.24 + r() * 0.08, 0.3 + r() * 0.08, 0.05, 9, 1);
  poner(base, [0, 0.025, 0]);
  const cupula = new THREE.SphereGeometry(0.16, 8, 4, 0, Math.PI * 2, 0, Math.PI / 2);
  poner(cupula, [(r() - 0.5) * 0.05, 0.05, (r() - 0.5) * 0.05], [0, 0, 0], [1.2, 0.55, 1.2]);
  return fusionar([pintar(base, PAL.bonigaBorde), pintar(cupula, PAL.boniga)], 'boniga');
}

/* -------------------------------------------------------------------------- */
/*  Distribución del potrero silvopastoril                                     */
/* -------------------------------------------------------------------------- */

/* Los árboles del banco forrajero viven en sitios FIJOS (compuestos a mano para
   que den sombra al potrero sin taparlo). Se recortan por tier. */
const SITIOS_NACEDERO = [
  [-9.5, -4.5], [-2.5, -8.0], [6.0, -9.5], [-13.0, -9.0], [11.5, -5.5],
];
const SITIOS_MATARRATON = [
  [-6.5, -1.5], [3.0, -3.5], [-11.0, -1.0], [9.5, -1.5], [-4.0, -11.5], [13.0, -10.5],
];
const SITIOS_LEUCAENA = [
  [-8.0, -13.5], [1.5, -14.5], [8.5, -13.0], [-14.5, -5.5],
];

/** Sitios de la cerca viva de matarratón (postes vivos), en línea al frente-izq. */
export const LINEA_CERCA = (() => {
  const pts = [];
  for (let i = 0; i <= 8; i++) {
    const t = i / 8;
    const wx = -19 + t * 12; // de -19 a -7
    const wz = 9.5 - t * 2.2; // baja apenas hacia el centro
    pts.push([wx, wz]);
  }
  return pts;
})();

/**
 * Siembra determinista del potrero. Devuelve items por especie
 * (`{pos, rotY, escala, tint}` — contrato del componente `Especie`).
 */
export function distribucionLecheria(conteos, seed = 707) {
  const c = conteos;
  const rArb = rng(seed + 1);
  const rPas = rng(seed + 2);
  const rBon = rng(seed + 3);

  const enSuelo = (p, esc, rr) => ({
    pos: /** @type {[number, number, number]} */ ([p[0], alturaPotrero(p[0], p[1]), p[1]]),
    rotY: rr() * Math.PI * 2,
    escala: esc,
    tint: /** @type {[number, number, number]} */ ([
      0.94 + rr() * 0.12,
      0.94 + rr() * 0.12,
      0.94 + rr() * 0.12,
    ]),
  });

  const nacedero = SITIOS_NACEDERO.slice(0, c.nacedero).map((p) => enSuelo(p, 0.95 + rArb() * 0.3, rArb));
  const matarraton = SITIOS_MATARRATON.slice(0, c.matarraton).map((p) => enSuelo(p, 0.95 + rArb() * 0.3, rArb));
  const leucaena = SITIOS_LEUCAENA.slice(0, c.leucaena).map((p) => enSuelo(p, 0.95 + rArb() * 0.25, rArb));

  // Botón de oro: en RACIMOS (el banco forrajero) al borde del potrero y bajo
  // los árboles — junto a la cerca y en manchas sueltas.
  const botonDeOro = [];
  const focos = [[-16, 6.5], [-15, 2.0], [12.5, -3.5], [-9.5, -4.5], [6.0, -9.5], [10.0, 2.5]];
  let fi = 0;
  while (botonDeOro.length < c.botonDeOro) {
    const f = focos[fi % focos.length];
    fi += 1;
    if (fi > focos.length * 6) break;
    const cuantas = 2 + Math.floor(rArb() * 2);
    for (let k = 0; k < cuantas && botonDeOro.length < c.botonDeOro; k++) {
      const x = f[0] + (rArb() - 0.5) * 3.4;
      const z = f[1] + (rArb() - 0.5) * 3.0;
      botonDeOro.push({
        pos: [x, alturaPotrero(x, z), z],
        rotY: rArb() * Math.PI * 2,
        escala: 0.82 + rArb() * 0.5,
        tint: [0.94 + rArb() * 0.12, 0.96 + rArb() * 0.08, 0.94 + rArb() * 0.12],
      });
    }
  }

  // Pasto: repartido por el potrero, RALO cerca de lo construido (quesera, ciclo,
  // bebedero) y sin invadir el frente por donde entra la cámara.
  const evitar = [SITIO_QUESERA, SITIO_BIODIGESTOR, SITIO_ABONO, SITIO_BEBEDERO, SITIO_ORDENO];
  const pasto = [];
  let intentos = 0;
  while (pasto.length < c.pasto && intentos < c.pasto * 8) {
    intentos += 1;
    const x = -20 + rPas() * 40;
    const z = -18 + rPas() * 34;
    // dejar despejado el proscenio (muy al frente y centrado)
    if (z > 8.5 && Math.abs(x) < 6) continue;
    let choca = false;
    for (const e of evitar) {
      if ((x - e[0]) ** 2 + (z - e[1]) ** 2 < 5) {
        choca = true;
        break;
      }
    }
    if (choca) continue;
    pasto.push({
      pos: [x, alturaPotrero(x, z), z],
      rotY: rPas() * Math.PI * 2,
      escala: 0.7 + rPas() * 0.8,
      tint: [0.92 + rPas() * 0.16, 0.94 + rPas() * 0.14, 0.9 + rPas() * 0.14],
    });
  }

  // Boñigas: donde pastan las vacas (el centro-izquierda del potrero) — la
  // materia prima del ciclo del abono.
  const boniga = [];
  for (let i = 0; i < c.boniga; i++) {
    const x = -9 + rBon() * 12;
    const z = -8 + rBon() * 8;
    boniga.push({
      pos: [x, alturaPotrero(x, z) + 0.01, z],
      rotY: rBon() * Math.PI * 2,
      escala: 0.8 + rBon() * 0.6,
      tint: [0.9 + rBon() * 0.14, 0.9 + rBon() * 0.12, 0.9 + rBon() * 0.12],
    });
  }

  return { nacedero, matarraton, leucaena, botonDeOro, pasto, boniga };
}

/** Los centros de sombra del banco forrajero (para posar la luz colada). */
export function centrosSombra(conteos) {
  return [
    ...SITIOS_NACEDERO.slice(0, conteos.nacedero),
    ...SITIOS_MATARRATON.slice(0, conteos.matarraton),
    ...SITIOS_LEUCAENA.slice(0, conteos.leucaena),
  ].map(([x, z]) => /** @type {[number, number, number]} */ ([x, alturaPotrero(x, z), z]));
}
