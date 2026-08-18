// ── abejas.js — EL COLMENAR DE LA ANGELITA (mundo `?mundo=abejas`) ───────────
//
// La abeja ANGELITA (*Tetragonisca angustula*): meliponino nativo SIN aguijón,
// la abeja de la finca andina. Su vivienda es una CAJA de potes de cerumen con
// una piquera de TUBO que sus guardianas vigilan; guarda miel y polen en
// vasijas, no en panales verticales. Al lado, para la LECCIÓN, la colmena
// Langstroth de la *Apis mellifera* (la europea, con aguijón): panales de cera
// en cuadros. Ponerlas juntas ENSEÑA en qué se diferencian.
//
// Y la polinización COMO GESTO: cada angelita vuela flor→flor, se posa, liba, la
// flor se estremece y suelta un puff de polen; en vuelo deja un RASTRO de motas
// ámbar que dibuja el recorrido — así la polinización se LEE como proceso, no
// como abejas quietas. Al cerrar la ronda entra a su piquera y sale cargada.
//
// LAS 4 MIRADAS (norte de la casa):
//   · Peter Jackson — el claro ÉPICO y habitado: lomas que reculan, monte a
//     contraluz, escala; el colmenar como el hito del cuadro.
//   · Nolan/Interstellar — la LUZ dorada de la hora mágica (RDR): bóveda gradada,
//     sol bajo con halos, bruma cálida que da profundidad; una imagen que se queda.
//   · Zelda BOTW/Odyssey — color vibrante, world-craft, guayacanes de acento,
//     ganas de recorrer el prado.
//   · Agroecólogo + diseñador instruccional (una niña de 11 + campesino) — la
//     fidelidad ES el efecto especial: angelita sin aguijón, potes de cerumen,
//     piquera de tubo, guardianas; los rótulos en «usted», de un vistazo.
//
// REUSA: rama `fable/abejas-jackson-rdr` (composición del colmenar, la lección
// de las dos viviendas, el ciclo de forrajeo) y `abejaIdentidad.js` (paleta +
// silueta canónica de la angelita rubber-hose — la MISMA de los avatares 2D).
//
// ANCLADO: TODO se posa sobre `alturaPrado(x,z)` — cero flotando. Las angelitas
// y el apicultor son billboards SVG rubber-hose (bichos = rubber-hose; el mundo
// = Humboldt ilustrado), proyectados sobre el canvas cuadro a cuadro.
//
// ANTI-TANGLE: archivo NUEVO y AUTÓNOMO. Único enganche con main.js = el bloque
// marcado `// ── ABEJAS ──`. Monta su propio canvas/renderer/loop y SUPRIME el
// valle (oculta #c + para el loop de main): no pelean dos renders. Como
// `vista-global.js`.
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { crearCopaMasa } from './lib3d/flora/FollajeMasa.js';
import { tickVientoMundos } from './lib3d/flora/vientoMundos.js';

// ── LA IDENTIDAD DE LA ANGELITA (fuente única 2D↔3D) ────────────────────────
// La misma paleta y silueta que pintan sus avatares en la app: así la abeja del
// home y la de este mundo son, a los ojos, la MISMA Angelita.
const ABEJA = {
  cuerpo: '#ffb54f', cuerpoGlow: 'rgba(255,181,79,0.9)', cabeza: '#ffd76a',
  hiloChumbe: '#9c3b1e', alaTul: '#bfeaff', alaTulClara: '#eafff6',
  lengua: '#c9524e', tinta: '#2a1a0c',
};

// ── LA PALETA DEL MUNDO (Humboldt entintado a la hora dorada) ────────────────
// Verdes por distancia + tierras + los ámbar de cera/miel/cerumen (los únicos
// acentos propios del tema). Derivada de la de `fable/abejas-jackson-rdr`.
const C = {
  pasto: '#8f9c4c', pastoSol: '#b6bd5c', loma: '#7f9048', lomaLejos: '#a6b184',
  monte: '#40592c', monteClaro: '#587038', hoja: '#4f7a3a', hojaOscura: '#31532a',
  tierra: '#6a5233', tierraClara: '#8c7047',
  madera: '#8a5a31', maderaClara: '#c99a55', maderaVieja: '#6e4a2a',
  cal: '#e9e2cf', hueso: '#efe6cc', tinta: '#2a1a0c',
  miel: '#f3a91d', cera: '#f4cf62', ceraVieja: '#d7ac48',
  cerumen: '#a9762f', cerumenClaro: '#c68f3e',
  guayacan: '#e8b23a', florMonte: '#cf5f88', florBlanca: '#f3ead0',
  nube: '#fdf6e6',
  cieloCenit: '#eec565', cieloHorizonte: '#f6dca0', cieloRescoldo: '#e2934a',
};

const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const smoothstep = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
const mezclar = (a, b, t) => new THREE.Color(a).lerp(new THREE.Color(b), t).getStyle();
function gauss(x, z, cx, cz, sx, sz) { const dx = x - cx, dz = z - cz; return Math.exp(-((dx * dx) / (2 * sx * sx) + (dz * dz) / (2 * sz * sz))); }
function ruido(x, z) {
  return Math.sin(x * 0.8 + z * 0.6) * 0.5 + Math.sin(x * 1.9 - z * 1.4 + 2.3) * 0.3 + Math.sin(x * 3.1 + z * 2.7 + 5.1) * 0.2;
}

// ═══════════════════ SOMBRA DE CONTACTO (grammar del cafetal) ═══════════════
// Disco radial (gradiente en canvas) que aterriza cada cosa al prado: sin él
// todo FLOTA sobre la loma (el pecado del diorama de manual). Copiado tal cual
// del `sombraPlano()` del cafetal: rgba(28,20,12) de 0.5 al borde transparente.
let _texSombra = null;
function texSombra() {
  if (_texSombra) return _texSombra;
  const cv = document.createElement('canvas'); cv.width = cv.height = 128;
  const g = cv.getContext('2d');
  const grad = g.createRadialGradient(64, 64, 2, 64, 64, 64);
  grad.addColorStop(0, 'rgba(28,20,12,0.52)');
  grad.addColorStop(0.55, 'rgba(28,20,12,0.24)');
  grad.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = grad; g.fillRect(0, 0, 128, 128);
  _texSombra = new THREE.CanvasTexture(cv);
  return _texSombra;
}
let _matSombra = null, _geoSombra = null;
function matSombra() {
  if (!_matSombra) _matSombra = new THREE.MeshBasicMaterial({ map: texSombra(), transparent: true, depthWrite: false, opacity: 0.92 });
  return _matSombra;
}
function geoSombra() { if (!_geoSombra) { _geoSombra = new THREE.PlaneGeometry(1, 1); _geoSombra.rotateX(-Math.PI / 2); } return _geoSombra; }
// radio = medio-ancho del disco; el sol viene del oeste-alto, así que se alarga
// un pelo hacia el este (dx) para que la sombra "caiga" y no sea un plato simétrico.
function sombra(raiz, x, z, radio, opts = {}) {
  const m = new THREE.Mesh(geoSombra(), matSombra());
  m.scale.set(radio * 2 * (opts.ex || 1), 1, radio * 2);
  m.position.set(x + (opts.dx || 0.12) * radio, alturaPrado(x, z) + (opts.y || 0.045), z + (opts.dz || 0.06) * radio);
  raiz.add(m); return m;
}

// ═══════════════════ NIEBLA EN CAPAS (grammar del páramo) ═══════════════════
// Cards de bruma cálida (gradiente radial en canvas) suspendidas sobre la línea
// de monte y una bruma baja dorada entre la faena y la ladera: es lo que abre la
// PROFUNDIDAD (el diorama plano no tenía ninguna). depthWrite:false, fog:false,
// derivan despacito (drift senoidal) como en el mar de nubes del páramo.
let _texNiebla = null;
function texNiebla() {
  if (_texNiebla) return _texNiebla;
  const cv = document.createElement('canvas'); cv.width = 256; cv.height = 128;
  const g = cv.getContext('2d');
  const grad = g.createRadialGradient(128, 70, 6, 128, 70, 128);
  grad.addColorStop(0, 'rgba(253,247,232,0.92)');
  grad.addColorStop(0.5, 'rgba(250,236,205,0.42)');
  grad.addColorStop(1, 'rgba(250,236,205,0)');
  g.fillStyle = grad; g.fillRect(0, 0, 256, 128);
  _texNiebla = new THREE.CanvasTexture(cv);
  return _texNiebla;
}
// [x, y, z, ancho, alto, opacidad, drift]
const NIEBLA = [
  [-8.5, 2.7, -12.5, 17, 5.4, 0.52, 3.4],  // banco de bruma que come el pie del monte
  [7.5, 2.5, -14.0, 16, 4.8, 0.46, 4.2],
  [0.0, 2.1, -16.5, 22, 6.0, 0.58, 2.8],   // el telón del fondo que separa monte de cielo
  [-3.0, 1.15, -8.5, 15, 3.0, 0.30, 5.0],  // bruma baja dorada (separa faena de ladera)
  [4.5, 0.95, -6.5, 12, 2.6, 0.26, 5.6],
];
function montarNiebla(raiz) {
  const cards = [];
  NIEBLA.forEach((n, i) => {
    const mat = new THREE.MeshBasicMaterial({ map: texNiebla(), transparent: true, opacity: n[5], depthWrite: false, fog: false, blending: THREE.NormalBlending });
    const m = new THREE.Mesh(new THREE.PlaneGeometry(n[3], n[4]), mat);
    m.position.set(n[0], n[1], n[2]);
    raiz.add(m);
    cards.push({ m, x0: n[0], ph: i * 1.7, dr: n[6] });
  });
  return cards;
}

// ═══════════════════ LA GEOGRAFÍA DEL CLARO ═══════════════════
// Explanada plana donde vive el colmenar (para que las cajas no bailen sobre el
// relieve) y lomas que suben al fondo y cierran el cuadro (Jackson).
const ANCHO = 34, FONDO = 30;
function alturaPrado(x, z) {
  let h = ruido(x * 0.42, z * 0.42) * 0.17;
  h += gauss(x, z, -11, -10, 5.6, 4.2) * 2.3;   // loma occidental
  h += gauss(x, z, 11.5, -11, 6.4, 4.6) * 2.7;  // loma oriental
  h += gauss(x, z, 0.5, -14, 8.6, 3.8) * 2.2;   // el fondo que cierra el cuadro
  h += gauss(x, z, -13, 6, 5.2, 5.2) * 0.9;     // falda que sube por la izquierda
  const plano = clamp(gauss(x, z, 0, 0.6, 6.0, 5.2) * 1.35, 0, 1); // la faena aplana el colmenar
  return h * (1 - plano);
}

function construirPrado() {
  const seg = 120, nx = seg + 1;
  const pos = new Float32Array(nx * nx * 3);
  const col = new Float32Array(nx * nx * 3);
  const cPasto = new THREE.Color(C.pasto), cSol = new THREE.Color(C.pastoSol);
  const cTierra = new THREE.Color(C.tierra), cLoma = new THREE.Color(C.loma), cLejos = new THREE.Color(C.lomaLejos);
  const cSombra = new THREE.Color(C.hojaOscura);   // moteado en las vaguadas (fake-AO)
  const cKiss = new THREE.Color(C.guayacan);        // beso dorado del sol rasante
  const c = new THREE.Color();
  let p = 0;
  for (let iz = 0; iz < nx; iz++) {
    const z = -FONDO / 2 + (FONDO * iz) / seg;
    for (let ix = 0; ix < nx; ix++) {
      const x = -ANCHO / 2 + (ANCHO * ix) / seg;
      const y = alturaPrado(x, z);
      pos[p] = x; pos[p + 1] = y; pos[p + 2] = z;
      c.lerpColors(cPasto, cSol, smoothstep(-0.35, 1.0, ruido(x + 3, z - 2)));
      // MOTEADO: manchones de pasto claro/oscuro (rompe el fieltro de billar liso)
      const dap = ruido(x * 0.95 + 11, z * 0.95 - 7);
      c.lerp(cSombra, clamp(-dap * 0.16, 0, 0.2));
      c.lerp(cSol, clamp(dap * 0.14, 0, 0.18));
      const surco = Math.max(gauss(x, z, 0, 3.6, 4.6, 0.72), gauss(x, z, -0.5, 2.5, 3.3, 0.6));
      c.lerp(cTierra, clamp(surco * 0.95, 0, 0.85));
      c.lerp(cLoma, clamp(y * 0.32, 0, 0.6));
      c.lerp(cKiss, clamp((y - 1.4) * 0.12, 0, 0.14)); // crestas doradas al contraluz
      c.lerp(cLejos, smoothstep(-7, -14, z) * 0.55);
      col[p] = c.r; col[p + 1] = c.g; col[p + 2] = c.b;
      p += 3;
    }
  }
  const idx = [];
  for (let iz = 0; iz < seg; iz++) for (let ix = 0; ix < seg; ix++) {
    const a = iz * nx + ix, b = a + 1, d = a + nx, e = d + 1;
    idx.push(a, d, b, b, d, e);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
  geo.setIndex(idx);
  geo.computeVertexNormals();
  return geo;
}

// ═══════════════════ EL CIELO DE LA HORA DORADA (RDR) ═══════════════════
// Bóveda GRADADA (no color plano): cenit dorado que cae a horizonte de bruma y,
// abajo, un rescoldo anaranjado. La hora dorada de mundo abierto, pero PINTADA
// (Humboldt es ilustrado, no fotográfico).
function construirBoveda() {
  const geo = new THREE.SphereGeometry(120, 28, 18);
  const pos = geo.attributes.position;
  const col = new Float32Array(pos.count * 3);
  const cCenit = new THREE.Color(C.cieloCenit);
  const cHor = new THREE.Color(C.cieloHorizonte);
  const cResc = new THREE.Color(C.cieloRescoldo);
  const c = new THREE.Color();
  for (let i = 0; i < pos.count; i++) {
    const y = pos.getY(i) / 120;
    c.copy(cHor).lerp(cCenit, smoothstep(-0.08, 0.8, y));
    if (y < 0.14) c.lerp(cResc, smoothstep(0.14, -0.28, y) * 0.7);
    col[i * 3] = c.r; col[i * 3 + 1] = c.g; col[i * 3 + 2] = c.b;
  }
  geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
  return geo;
}

// El monte del fondo: copas REDONDAS (monte andino, no pinar de postal) con dos
// guayacanes floridos de acento. Silueta y color a contraluz.
const ARBOLES = [
  [-10, -10, 1.5, 0], [-8, -11.6, 1.1, 1], [-12.2, -8, 1.3, 1], [-5.4, -12.8, 0.95, 0],
  [-2.4, -13.6, 1.35, 1], [0.9, -14.2, 1.05, 0], [4.1, -13.4, 1.45, 2], [7.4, -12, 1.1, 0],
  [10.4, -10.8, 1.55, 1], [12.8, -8.8, 1.15, 0], [-13.8, -5, 1.1, 1], [12.4, -5.6, 0.9, 2],
  [-9, -13.8, 0.85, 1], [6.4, -14.2, 1.0, 0],
];
function montarMonte(raiz) {
  ARBOLES.forEach(([x, z, esc, tipo], i) => {
    const y = alturaPrado(x, z);
    // PERSPECTIVA AÉREA: cuanto más atrás (−z), más se lava la copa hacia la bruma
    // del horizonte → el monte RECULA en vez de venirse encima (adiós postal plana).
    const aire = smoothstep(-6, -15, z) * 0.44;
    const esGuayacan = tipo === 2;
    let copa = esGuayacan ? mezclar(C.guayacan, C.monteClaro, 0.22) : tipo === 1 ? C.monte : C.monteClaro;
    // el guayacán florido resiste la bruma (acento dorado que ancla el fondo)
    copa = mezclar(copa, C.cieloHorizonte, esGuayacan ? aire * 0.5 : aire);
    const claro = mezclar(copa, C.cieloHorizonte, 0.18 + aire * 0.3);
    // la sombra de contacto del árbol, primero (queda bajo el follaje)
    sombra(raiz, x, z, 0.62 * esc, { y: 0.05, ex: 1.15 });
    const g = new THREE.Group();
    g.position.set(x, y, z); g.scale.setScalar(esc); g.rotation.y = i * 0.9;
    const tronco = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.17, 1.1, 5), new THREE.MeshLambertMaterial({ color: mezclar(C.maderaVieja, C.cieloHorizonte, aire), flatShading: true }));
    tronco.position.y = 0.52; g.add(tronco);
    // La silueta de cuatro lóbulos se conserva, pero la faceta se reemplaza por
    // masa (núcleo suave + cards densos). Los cuatro centros/radios son los de
    // las copas anteriores: solo cambia la construcción del follaje.
    const copaOscura = new THREE.Color(mezclar(copa, C.monte, 0.4 - aire * 0.3));
    const copaMedia = new THREE.Color(copa);
    const copaClara = new THREE.Color(claro);
    const colorTmp = new THREE.Color();
    const gradiente = (vx, vy, vz) => {
      const altura = smoothstep(1.08, 2.12, vy);
      const moteado = (Math.sin(vx * 4.1 + vz * 3.3 + i) * 0.5 + 0.5) * 0.12;
      return colorTmp.copy(copaOscura)
        .lerp(copaMedia, clamp(0.32 + altura * 0.5 + moteado, 0, 1))
        .lerp(copaClara, altura * 0.24);
    };
    const copaMasa = crearCopaMasa(THREE, {
      esferas: [
        { c: [0, 1.52, 0], r: 0.72, esc: [1.05, 1.0, 1.0] },
        { c: [0.44, 1.24, 0.16], r: 0.5, esc: [1, 0.92, 1] },
        { c: [-0.4, 1.3, -0.14], r: 0.46, esc: [1, 0.9, 1] },
        { c: [-0.06, 2.02, 0.2], r: 0.36, esc: [1, 1, 1] },
      ],
      gradiente,
      seed: Number(new URLSearchParams(location.search).get('copaSeed')) || 20260812,
      brillo: 0.08,
      cobertura: 1.2,
      tamCard: 0.62,
      maxCards: 110,
      modulacion: 0.36,
      nucleoOpts: { segs: [12, 9], encoger: 0.9, rugosidad: 0.28, sombra: 0.46 },
      texOpts: {
        oscuro: C.monte, medio: C.hoja, claro: C.monteClaro,
        hojas: 300, alargue: 1.7,
      },
      viento: { amplitud: 0.055, piso: 0.35, velocidad: 1.0 },
      sombra: true,
    });
    g.add(copaMasa.grupo);
    raiz.add(g);
  });
}

// Nubes del atardecer: esferas aplanadas, quietas, muy lejos.
const NUBES = [[-14, 6.4, -30, 3.0], [5.5, 7.6, -32, 2.6], [15, 5.8, -28, 2.8], [-6.5, 8.2, -27, 2.0]];
function montarNubes(raiz) {
  NUBES.forEach((n) => {
    const m = new THREE.Mesh(new THREE.SphereGeometry(1, 9, 7), new THREE.MeshBasicMaterial({ color: C.nube, transparent: true, opacity: 0.82, depthWrite: false, fog: false }));
    m.position.set(n[0], n[1], n[2]); m.scale.set(n[3], n[3] * 0.3, n[3] * 0.6);
    raiz.add(m);
  });
}

// Macollas de pasto alto y arbustos: cosen el claro con la ladera, rompen el
// verde liso del primer plano.
const MACOLLAS = [[-4.6, 5.2], [-2.6, 6.0], [0.4, 6.2], [2.8, 5.9], [4.8, 5.0], [-5.6, 1.8], [5.7, 2.2], [-5.0, -1.8], [5.3, -2.6], [-7.4, 3.0], [7.6, 2.8]];
const ARBUSTOS = [[-6.6, -3.4, 0.95], [-7.6, 0.4, 0.8], [6.8, -4.0, 1.0], [7.6, 0.8, 0.85], [-5.4, 5.8, 0.7], [5.8, 5.6, 0.8], [-8.6, 3.6, 0.9], [8.4, 3.2, 0.75]];
function montarSotobosque(raiz) {
  const hojaM = new THREE.MeshLambertMaterial({ color: C.hoja, flatShading: true });
  const pastoM = new THREE.MeshLambertMaterial({ color: C.pastoSol, flatShading: true });
  const hojaOM = new THREE.MeshLambertMaterial({ color: C.hojaOscura, flatShading: true });
  MACOLLAS.forEach(([x, z], i) => {
    const g = new THREE.Group(); g.position.set(x, alturaPrado(x, z), z); g.rotation.y = i * 1.1;
    for (let j = 0; j < 5; j++) {
      const a = j * 1.257 + i;
      const h = new THREE.Mesh(new THREE.ConeGeometry(0.05, 0.46 + (j % 3) * 0.09, 4), j % 2 ? hojaM : pastoM);
      h.position.set(Math.cos(a) * 0.12, 0.22, Math.sin(a) * 0.12);
      h.rotation.set(Math.sin(a) * 0.3, 0, Math.cos(a) * 0.3);
      g.add(h);
    }
    raiz.add(g);
  });
  ARBUSTOS.forEach(([x, z, esc]) => {
    sombra(raiz, x, z, 0.42 * esc, { y: 0.045 });
    const g = new THREE.Group(); g.position.set(x, alturaPrado(x, z), z); g.scale.setScalar(esc);
    [[0, 0.3, 0, 0.44], [0.32, 0.22, 0.12, 0.32], [-0.28, 0.24, -0.1, 0.35]].forEach((b, j) => {
      const m = new THREE.Mesh(new THREE.DodecahedronGeometry(b[3]), j % 2 ? hojaOM : hojaM);
      m.position.set(b[0], b[1], b[2]); m.scale.set(1, 0.8, 1); g.add(m);
    });
    raiz.add(g);
  });
}

// ═══════════════════ EL SURCO DE FLORES ═══════════════════
// Dos hileras apretadas + una hilera de primer plano (donde la angelita se posa
// en grande). Cada flor con su especie de color y su fase de brisa.
const FLORES = [
  { x: -3.0, z: 3.9, color: C.guayacan, esc: 1.0, fase: 0.0 },
  { x: -2.0, z: 3.7, color: C.florBlanca, esc: 0.88, fase: 1.1 },
  { x: -1.0, z: 3.9, color: C.florMonte, esc: 1.05, fase: 2.3 },
  { x: 0.0, z: 3.6, color: C.guayacan, esc: 0.92, fase: 3.4 },
  { x: 1.0, z: 3.85, color: C.florBlanca, esc: 1.0, fase: 4.5 },
  { x: 2.0, z: 3.6, color: C.florMonte, esc: 0.9, fase: 5.6 },
  { x: 3.0, z: 3.8, color: C.guayacan, esc: 1.08, fase: 0.7 },
  { x: -2.5, z: 2.5, color: C.florMonte, esc: 0.95, fase: 1.9 },
  { x: -1.5, z: 2.35, color: C.guayacan, esc: 0.86, fase: 3.0 },
  { x: -0.4, z: 2.55, color: C.florBlanca, esc: 1.02, fase: 4.1 },
  { x: 0.7, z: 2.3, color: C.florMonte, esc: 0.9, fase: 5.2 },
  { x: 1.8, z: 2.5, color: C.guayacan, esc: 0.98, fase: 6.0 },
  { x: -2.8, z: 5.1, color: C.guayacan, esc: 1.14, fase: 2.6 },
  { x: -0.3, z: 5.6, color: C.florMonte, esc: 1.2, fase: 4.8 },
  { x: 1.2, z: 5.2, color: C.florBlanca, esc: 1.12, fase: 0.4 },
  { x: 2.5, z: 4.95, color: C.guayacan, esc: 1.06, fase: 3.7 },
];
// Escala global de las flores: a tamaño real una flor no le llega ni a la rodilla
// al apicultor ni a media caja de melipona (la fidelidad ES el efecto especial).
const FLOR_S = 0.62;
// El punto de la corola donde la abeja se para (anclado al prado + alto del tallo).
function puntoDeFlor(f) { return new THREE.Vector3(f.x, alturaPrado(f.x, f.z) + 0.62 * FLOR_S * f.esc + 0.05, f.z); }
const VISITAS = new Float32Array(FLORES.length); // canal abeja→flor (0..1)

// BOTÓN DE ORO (*Tithonia diversifolia*) / margarita: dos coronas de rayos —la
// externa cae, la interna se levanta— forman un CUENCO (volumen), y un disco
// central DOMADO (media esfera) con granulado ámbar. Adiós molinete plano.
function construirMargarita(corola, colorPetalo, esBoton) {
  const petM = new THREE.MeshLambertMaterial({ color: colorPetalo, side: THREE.DoubleSide, flatShading: true });
  const petM2 = new THREE.MeshLambertMaterial({ color: mezclar(colorPetalo, '#ffffff', 0.22), side: THREE.DoubleSide, flatShading: true });
  const rayos = esBoton ? 13 : 11;
  [[0.0, -0.16, 0.15, petM, 1.0], [0.14, 0.14, 0.11, petM2, 0.82]].forEach(([lift, pitch, off, mat, s]) => {
    for (let i = 0; i < rayos; i++) {
      const a = (i / rayos) * Math.PI * 2 + lift;
      const pet = new THREE.Mesh(new THREE.CircleGeometry(0.12, 6), mat);
      pet.scale.set(0.5 * s, 2.0 * s, 1);
      pet.position.set(Math.cos(a) * off, 0.03 + (1 - s) * 0.06, Math.sin(a) * off);
      pet.rotation.set(-Math.PI / 2 + pitch, 0, -a + Math.PI / 2);
      corola.add(pet);
    }
  });
  const discoColor = esBoton ? mezclar(C.miel, C.tierra, 0.5) : C.guayacan;
  const disco = new THREE.Mesh(new THREE.SphereGeometry(0.11, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2), new THREE.MeshLambertMaterial({ color: discoColor, flatShading: true }));
  disco.scale.set(1, 0.6, 1); disco.position.y = 0.05; corola.add(disco);
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    const pip = new THREE.Mesh(new THREE.SphereGeometry(0.018, 5, 4), new THREE.MeshBasicMaterial({ color: C.miel }));
    pip.position.set(Math.cos(a) * 0.052, 0.092, Math.sin(a) * 0.052); corola.add(pip);
  }
}
// MATARRATÓN (*Gliricidia sepium*): racimo de florecitas papilionadas apiñadas —
// estandarte (esfera aplanada rosada) + quilla más clara. Volumen por CÚMULO.
function construirRacimo(corola, color) {
  const cRosa = new THREE.MeshLambertMaterial({ color, flatShading: true });
  const cClaro = new THREE.MeshLambertMaterial({ color: mezclar(color, '#ffffff', 0.35), flatShading: true });
  const cQuilla = new THREE.MeshLambertMaterial({ color: mezclar(color, C.florBlanca, 0.5), flatShading: true });
  const puntos = [[0, 0.02, 0, 0.075], [0.09, 0.0, 0.04, 0.065], [-0.08, 0.01, 0.05, 0.07], [0.04, 0.06, -0.07, 0.06], [-0.05, 0.07, -0.05, 0.062], [0.02, 0.13, 0.02, 0.055], [-0.03, 0.11, 0.06, 0.05], [0.07, 0.09, -0.02, 0.052]];
  puntos.forEach((p, i) => {
    const est = new THREE.Mesh(new THREE.SphereGeometry(p[3], 7, 5), i % 3 === 0 ? cClaro : cRosa);
    est.position.set(p[0], p[1], p[2]); est.scale.set(1.1, 0.8, 1); corola.add(est);
    const q = new THREE.Mesh(new THREE.SphereGeometry(p[3] * 0.5, 6, 4), cQuilla);
    q.position.set(p[0], p[1] - p[3] * 0.4, p[2] + p[3] * 0.5); corola.add(q);
  });
}

function montarFlores(raiz) {
  const flores = [];
  const hojaM = new THREE.MeshLambertMaterial({ color: C.hoja, side: THREE.DoubleSide });
  const hojaOM = new THREE.MeshLambertMaterial({ color: C.hojaOscura, side: THREE.DoubleSide });
  FLORES.forEach((f, idx) => {
    // sombra de contacto: aterriza la mata (sin ella la flor es un sticker flotante)
    sombra(raiz, f.x, f.z, 0.16 * f.esc, { y: 0.035, dx: 0.05, dz: 0.03 });
    const g = new THREE.Group();
    g.position.set(f.x, alturaPrado(f.x, f.z), f.z); g.rotation.y = idx * 1.3; g.scale.setScalar(f.esc * FLOR_S);
    const tallo = new THREE.Group(); g.add(tallo);
    const t = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.055, 0.62, 6), new THREE.MeshLambertMaterial({ color: mezclar(C.hoja, C.hojaOscura, 0.3) }));
    t.position.y = 0.31; tallo.add(t);
    const h1 = new THREE.Mesh(new THREE.CircleGeometry(0.09, 5), hojaOM);
    h1.position.set(0.13, 0.22, 0.02); h1.rotation.set(Math.PI / 2, 0, 0.5); h1.scale.set(1, 2.0, 1); tallo.add(h1);
    const h2 = new THREE.Mesh(new THREE.CircleGeometry(0.08, 5), hojaM);
    h2.position.set(-0.12, 0.33, -0.03); h2.rotation.set(Math.PI / 2, 0, -0.6); h2.scale.set(1, 1.8, 1); tallo.add(h2);
    // la cabeza florida, INCLINADA hacia el sol/cámara para que se lea de frente
    const corola = new THREE.Group(); corola.position.y = 0.62; corola.rotation.x = 0.4; tallo.add(corola);
    if (f.color === C.florMonte) construirRacimo(corola, f.color);         // matarratón rosado
    else construirMargarita(corola, f.color, f.color === C.guayacan);      // botón de oro / margarita blanca
    const puff = new THREE.Group(); puff.visible = false; corola.add(puff);
    [[-0.1, 0, 0.06], [0.11, 0.05, -0.04], [0.02, 0.1, 0.12], [-0.06, 0.12, -0.1]].forEach((m) => {
      const mo = new THREE.Mesh(new THREE.SphereGeometry(0.035, 5, 4), new THREE.MeshBasicMaterial({ color: C.miel }));
      mo.position.set(m[0], m[1], m[2]); puff.add(mo);
    });
    raiz.add(g);
    flores.push({ idx, datos: f, tallo, corola, puff });
  });
  return flores;
}

// ═══════════════════ LAS DOS VIVIENDAS ═══════════════════
// Apretadas a propósito (en pantalla de celular una escena ancha se sale). La
// MELIPONA va protagonista: es la de la finca (angelita nativa) y va al centro.
const MELIPONA_POS = new THREE.Vector3(1.2, 0, 0.2);
const MELIPONA_ESC = 1.25;
const LANGSTROTH_POS = new THREE.Vector3(-2.6, 0, -1.4);
// Las bocas de las piqueras en coords de MUNDO (ahí llegan y de ahí salen).
const PIQUERAS = {
  melipona: {
    boca: new THREE.Vector3(MELIPONA_POS.x, 0.62 * MELIPONA_ESC, MELIPONA_POS.z + 0.92 * MELIPONA_ESC),
    dentro: new THREE.Vector3(MELIPONA_POS.x, 0.6 * MELIPONA_ESC, MELIPONA_POS.z + 0.5 * MELIPONA_ESC),
  },
  langstroth: {
    boca: new THREE.Vector3(LANGSTROTH_POS.x + 0.02, 0.5, LANGSTROTH_POS.z + 0.72),
    dentro: new THREE.Vector3(LANGSTROTH_POS.x + 0.02, 0.46, LANGSTROTH_POS.z + 0.42),
  },
};

// La caja MELIPONA: banco de tierra, cajón horizontal, tapa corrida que deja ver
// los POTES de cerumen, y la piquera de TUBO abocinada que sus guardianas vigilan.
function montarMelipona(raiz) {
  sombra(raiz, MELIPONA_POS.x, MELIPONA_POS.z, 0.95 * MELIPONA_ESC, { y: 0.05, ex: 1.2 });
  const g = new THREE.Group();
  g.position.copy(MELIPONA_POS); g.position.y = alturaPrado(MELIPONA_POS.x, MELIPONA_POS.z); g.scale.setScalar(MELIPONA_ESC);
  const M = (color) => new THREE.MeshLambertMaterial({ color });
  const banco = new THREE.Mesh(new THREE.CylinderGeometry(0.72, 0.82, 0.18, 8), M(C.tierraClara)); banco.position.y = 0.09; g.add(banco);
  const cajon = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.72, 0.86), M(C.maderaClara)); cajon.position.y = 0.55; g.add(cajon);
  const tapa = new THREE.Mesh(new THREE.BoxGeometry(1.36, 0.09, 0.62), M(C.madera)); tapa.position.set(-0.1, 0.95, -0.34); tapa.rotation.x = 0.18; g.add(tapa);
  // los POTES DE CERUMEN: el nido a la vista
  const potes = [[-0.34, 0.04, -0.16, 0.1], [-0.16, 0.05, -0.22, 0.11], [0.04, 0.04, -0.18, 0.095], [0.24, 0.05, -0.2, 0.105], [0.38, 0.04, -0.1, 0.09], [-0.38, 0.05, 0.04, 0.1], [-0.2, 0.06, 0.0, 0.115], [0.0, 0.05, -0.02, 0.1], [0.2, 0.06, 0.02, 0.11], [0.36, 0.04, 0.1, 0.095], [-0.28, 0.04, 0.2, 0.09], [-0.06, 0.05, 0.18, 0.105], [0.16, 0.04, 0.22, 0.095], [-0.1, 0.15, -0.1, 0.085], [0.1, 0.15, 0.06, 0.08], [-0.26, 0.14, 0.08, 0.075]];
  const nido = new THREE.Group(); nido.position.set(0.06, 0.86, 0.12); g.add(nido);
  potes.forEach((p, i) => {
    const m = new THREE.Mesh(new THREE.SphereGeometry(p[3], 8, 6), M(i % 3 === 0 ? C.cerumenClaro : C.cerumen));
    m.position.set(p[0], p[1], p[2]); m.scale.set(1, 1.25, 1); nido.add(m);
  });
  const involucro = new THREE.Mesh(new THREE.SphereGeometry(0.3, 8, 6), M(mezclar(C.cerumen, C.tierra, 0.4)));
  involucro.position.set(0.02, 0.04, 0.24); involucro.rotation.x = -0.2; involucro.scale.set(1, 0.5, 1); nido.add(involucro);
  // LA PIQUERA DE TUBO: el pitillo de cerumen que la angelita construye, bien salido.
  const anillo = new THREE.Mesh(new THREE.TorusGeometry(0.16, 0.06, 6, 14), M(C.cerumen)); anillo.position.set(0, 0.62, 0.44); anillo.rotation.x = Math.PI / 2; g.add(anillo);
  const tubo = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.15, 0.3, 10), M(C.cerumenClaro)); tubo.position.set(0, 0.62, 0.58); tubo.rotation.x = Math.PI / 2; g.add(tubo);
  const bocina = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.1, 0.08, 10), M(C.cerumenClaro)); bocina.position.set(0, 0.62, 0.74); bocina.rotation.x = Math.PI / 2; g.add(bocina);
  const hueco = new THREE.Mesh(new THREE.CylinderGeometry(0.065, 0.065, 0.05, 10), new THREE.MeshBasicMaterial({ color: '#24170f' })); hueco.position.set(0, 0.62, 0.77); hueco.rotation.x = Math.PI / 2; g.add(hueco);
  raiz.add(g);
}

// La colmena LANGSTROTH (Apis mellifera): cajón de cuadros verticales con la
// tapa LEVANTADA y un cuadro de panal a la vista — el contraste con la melipona.
function montarLangstroth(raiz) {
  sombra(raiz, LANGSTROTH_POS.x, LANGSTROTH_POS.z, 0.85, { y: 0.05, ex: 1.2 });
  const g = new THREE.Group();
  g.position.copy(LANGSTROTH_POS); g.position.y = alturaPrado(LANGSTROTH_POS.x, LANGSTROTH_POS.z);
  const M = (color) => new THREE.MeshLambertMaterial({ color });
  [-0.55, 0.55].forEach((x) => { const pata = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.25, 1.1), M(C.madera)); pata.position.set(x, 0.12, 0); g.add(pata); });
  const base = new THREE.Mesh(new THREE.BoxGeometry(1.45, 0.12, 1.05), M(C.madera)); base.position.y = 0.28; g.add(base);
  const camara = new THREE.Mesh(new THREE.BoxGeometry(1.35, 0.82, 0.95), M(C.cal)); camara.position.y = 0.75; g.add(camara);
  const tablaVuelo = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.06, 0.36), M(C.maderaClara)); tablaVuelo.position.set(0, 0.36, 0.62); tablaVuelo.rotation.x = -0.12; g.add(tablaVuelo);
  const piquera = new THREE.Mesh(new THREE.BoxGeometry(0.52, 0.09, 0.08), new THREE.MeshBasicMaterial({ color: '#2a1c10' })); piquera.position.set(0, 0.46, 0.49); g.add(piquera);
  // los cuadros asomando + un cuadro levantado con su panal + la tapa recostada
  [-0.42, -0.14, 0.14, 0.42].forEach((x) => { const q = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.06, 0.92), M(C.maderaClara)); q.position.set(x, 1.18, 0); g.add(q); });
  const capaCera = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.1, 0.86), M(C.ceraVieja)); capaCera.position.y = 1.1; g.add(capaCera);
  // UN cuadro de panal levantado, apoyado en el borde
  const cuadro = new THREE.Group(); cuadro.position.set(0.05, 1.5, 0.42); cuadro.rotation.set(0.22, -0.24, 0.06); cuadro.scale.setScalar(0.72); g.add(cuadro);
  const marco = new THREE.Mesh(new THREE.BoxGeometry(1.05, 1.0, 0.08), M(C.madera)); cuadro.add(marco);
  const liston = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.1, 0.1), M(C.maderaClara)); liston.position.y = 0.55; cuadro.add(liston);
  for (let fila = -2; fila <= 2; fila++) for (let cc = -2; cc <= 2; cc++) {
    if (Math.abs(fila) + Math.abs(cc) >= 4) continue;
    const cel = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 0.07, 6), M(fila < 1 ? C.miel : C.cera));
    cel.position.set(cc * 0.18 + (fila % 2) * 0.09, fila * 0.16, 0.06); cel.rotation.x = Math.PI / 2; cuadro.add(cel);
  }
  const tapaRec = new THREE.Mesh(new THREE.BoxGeometry(1.55, 0.12, 1.12), M(C.maderaClara)); tapaRec.position.set(-1.15, 0.55, 0.3); tapaRec.rotation.set(0, 0.35, 1.24); g.add(tapaRec);
  raiz.add(g);
}

// ═══════════════════ EL RASTRO DE POLEN ═══════════════════
// La abeja no solo se posa: LLEVA el polen de una flor a la siguiente. En vuelo
// suelta motas ámbar que suben y se apagan — un solo draw call (Points, ring
// buffer). El color = ámbar·vida; bajo blending aditivo, vida→0 = invisible.
const RASTRO_MAX = 90;
function crearRastro(raiz) {
  const pos = new Float32Array(RASTRO_MAX * 3);
  const col = new Float32Array(RASTRO_MAX * 3);
  const vida = new Float32Array(RASTRO_MAX);
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
  const mat = new THREE.PointsMaterial({ size: 0.14, vertexColors: true, transparent: true, opacity: 0.95, depthWrite: false, blending: THREE.AdditiveBlending, sizeAttenuation: true, fog: false });
  const pts = new THREE.Points(geo, mat);
  pts.frustumCulled = false;
  raiz.add(pts);
  const amber = new THREE.Color(C.miel);
  let cursor = 0;
  return {
    emitir(x, y, z) {
      const i = cursor;
      pos[i * 3] = x; pos[i * 3 + 1] = y; pos[i * 3 + 2] = z; vida[i] = 1;
      cursor = (cursor + 1) % RASTRO_MAX;
    },
    update(dt) {
      for (let i = 0; i < RASTRO_MAX; i++) {
        if (vida[i] <= 0) { col[i * 3] = 0; col[i * 3 + 1] = 0; col[i * 3 + 2] = 0; continue; }
        vida[i] = Math.max(0, vida[i] - dt * 0.55);
        pos[i * 3 + 1] += dt * 0.35;
        const v = vida[i] * vida[i];
        col[i * 3] = amber.r * v; col[i * 3 + 1] = amber.g * v; col[i * 3 + 2] = amber.b * v;
      }
      geo.attributes.position.needsUpdate = true;
      geo.attributes.color.needsUpdate = true;
    },
  };
}

// ═══════════════════ LAS ANGELITAS (billboards SVG rubber-hose) ═══════════════
// La angelita 2D↔3D: la MISMA silueta de sus avatares (abejaIdentidad), montada
// como billboard SVG sobre el canvas. Bichos = rubber-hose; el mundo = Humboldt.
function svgAngelita() {
  const A = ABEJA;
  return `
  <svg viewBox="-15 -15 32 30" class="abjBee" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
    <ellipse r="6.4" fill="${A.cuerpo}" opacity="0.28"/>
    <ellipse class="abjWing" cx="-1.8" cy="-7" rx="6" ry="3.6" fill="${A.alaTul}" opacity="0.62" stroke="rgba(42,26,12,0.4)" stroke-width="0.5"/>
    <ellipse class="abjWing abjWing2" cx="2.2" cy="-6.4" rx="4.6" ry="2.8" fill="${A.alaTulClara}" opacity="0.5" stroke="rgba(42,26,12,0.35)" stroke-width="0.5"/>
    <path d="M-2.6,4.4 C-3.2,6.6 -3.4,8 -3.0,9.2" stroke="${A.tinta}" stroke-width="1.9" fill="none" stroke-linecap="round"/>
    <circle cx="-3.0" cy="9.4" r="1.1" fill="${A.cabeza}" stroke="${A.tinta}" stroke-width="0.6"/>
    <path d="M1.8,4.7 C1.4,6.8 1.3,8.2 1.8,9.4" stroke="${A.tinta}" stroke-width="1.9" fill="none" stroke-linecap="round"/>
    <circle cx="1.8" cy="9.6" r="1.1" fill="${A.cabeza}" stroke="${A.tinta}" stroke-width="0.6"/>
    <ellipse cx="0" cy="0" rx="8.6" ry="5.4" fill="${A.cuerpo}" stroke="${A.tinta}" stroke-width="1.3"/>
    <path d="M-3.6,-4.7 L-3.6,4.7" stroke="${A.tinta}" stroke-width="1.9" stroke-linecap="round"/>
    <path d="M-3.6,-4.1 L-3.6,4.1" stroke="${A.hiloChumbe}" stroke-width="0.7" stroke-linecap="round"/>
    <path d="M0.4,-5.0 L0.4,5.0" stroke="${A.tinta}" stroke-width="1.9" stroke-linecap="round"/>
    <path d="M0.4,-4.4 L0.4,4.4" stroke="${A.hiloChumbe}" stroke-width="0.7" stroke-linecap="round"/>
    <path d="M4.0,-4.0 L4.0,4.0" stroke="${A.tinta}" stroke-width="1.9" stroke-linecap="round"/>
    <path d="M-6.2,1.4 C-8.2,2.4 -9.0,4.1 -8.4,5.9" stroke="${A.tinta}" stroke-width="2.1" fill="none" stroke-linecap="round"/>
    <circle cx="-8.5" cy="6.2" r="1.55" fill="${A.cabeza}" stroke="${A.tinta}" stroke-width="0.6"/>
    <path d="M5.4,3.0 C6.9,4.2 7.5,5.9 7.0,7.5" stroke="${A.tinta}" stroke-width="2.2" fill="none" stroke-linecap="round"/>
    <circle cx="7.0" cy="7.8" r="1.6" fill="${A.cabeza}" stroke="${A.tinta}" stroke-width="0.6"/>
    <circle cx="8.6" cy="-1.0" r="4.4" fill="${A.cabeza}" stroke="${A.tinta}" stroke-width="1.2"/>
    <circle cx="10.4" cy="0.7" r="1.15" fill="#e8896b" opacity="0.55"/>
    <path d="M7.5,1.4 Q8.9,2.5 10.3,1.4" stroke="${A.tinta}" stroke-width="0.9" fill="none" stroke-linecap="round"/>
    <circle cx="10.1" cy="-1.9" r="1.95" fill="#fff" stroke="${A.tinta}" stroke-width="0.7"/>
    <circle cx="10.5" cy="-1.6" r="1.0" fill="${A.tinta}"/>
    <circle cx="10.9" cy="-2.0" r="0.35" fill="#fff"/>
    <circle cx="7.4" cy="-2.2" r="1.45" fill="#fff" stroke="${A.tinta}" stroke-width="0.7"/>
    <circle cx="7.7" cy="-2.0" r="0.72" fill="${A.tinta}"/>
    <path d="M7.7,-4.7 C6.7,-7.3 7.0,-9.3 8.3,-10.1" stroke="${A.tinta}" stroke-width="0.9" fill="none" stroke-linecap="round"/>
    <circle cx="8.3" cy="-10.3" r="0.95" fill="${A.tinta}"/>
    <path d="M9.7,-4.6 C11.0,-6.7 11.3,-8.7 10.5,-10.3" stroke="${A.tinta}" stroke-width="0.9" fill="none" stroke-linecap="round"/>
    <circle cx="10.5" cy="-10.5" r="0.95" fill="${A.tinta}"/>
  </svg>`;
}

// El circuito de cada angelita: las flores que trabaja y la vivienda a la que
// lleva la carga. Velocidades co-primas para que no vuelvan a la vez.
const FORRAJERAS = [
  { flores: [12, 7, 1], casa: 'melipona', vel: 1.7, posa: 2.6, px: 40, fase: 0.0 },
  { flores: [4, 13, 6], casa: 'melipona', vel: 2.0, posa: 2.1, px: 37, fase: 1.6 },
  { flores: [2, 9, 14], casa: 'melipona', vel: 1.9, posa: 2.9, px: 38, fase: 3.1 },
  { flores: [11, 15, 8], casa: 'langstroth', vel: 2.2, posa: 1.9, px: 34, fase: 4.7 },
  { flores: [8, 1, 10], casa: 'melipona', vel: 1.6, posa: 3.2, px: 36, fase: 2.4 },
  { flores: [13, 3, 11], casa: 'langstroth', vel: 2.3, posa: 2.3, px: 33, fase: 5.5 },
  { flores: [9, 0, 4], casa: 'melipona', vel: 1.85, posa: 2.7, px: 36, fase: 0.9 },
];
const GUARDIANAS = [
  { casa: 'melipona', px: 30, fase: 0.0, lado: 1 },
  { casa: 'melipona', px: 28, fase: 2.7, lado: -1 },
];

// ═══════════════════ EL APICULTOR (billboard SVG rubber-hose) ═══════════════
function svgApicultor() {
  const T = C.tinta;
  return `
  <svg viewBox="0 0 120 165" class="abjApi" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
    <g opacity="0.9"><circle cx="26" cy="86" r="3.2" fill="${C.hueso}" opacity="0.7"/><circle cx="21" cy="74" r="4.4" fill="${C.hueso}" opacity="0.5"/><circle cx="27" cy="60" r="5.6" fill="${C.hueso}" opacity="0.32"/></g>
    <path d="M42 74 Q32 82 30 92" stroke="${T}" stroke-width="7" stroke-linecap="round" fill="none"/>
    <circle cx="30" cy="94" r="6" fill="${C.hueso}" stroke="${T}" stroke-width="2.2"/>
    <path d="M22 96 L36 96 L34 116 L24 116 Z" fill="#b9bfc4" stroke="${T}" stroke-width="2.2"/>
    <path d="M24 96 Q29 84 34 96 Z" fill="#b9bfc4" stroke="${T}" stroke-width="2"/>
    <path d="M29 86 L26 90 L32 90 Z" fill="${T}"/>
    <path d="M36 100 Q46 104 40 112 Q34 110 34 104 Z" fill="${C.maderaVieja}" stroke="${T}" stroke-width="2"/>
    <ellipse cx="47" cy="152" rx="9" ry="4.5" fill="${T}"/><ellipse cx="68" cy="152" rx="9" ry="4.5" fill="${T}"/>
    <path d="M42 108 L44 146 L52 146 L54 112 Z" fill="${C.cal}" stroke="${T}" stroke-width="2.4"/>
    <path d="M58 112 L60 146 L68 146 L70 108 Z" fill="${C.cal}" stroke="${T}" stroke-width="2.4"/>
    <path d="M40 66 Q56 60 72 66 L74 112 Q56 120 38 112 Z" fill="${C.cal}" stroke="${T}" stroke-width="2.6"/>
    <path d="M40 92 Q56 98 74 92" stroke="${C.maderaVieja}" stroke-width="3.4" fill="none"/>
    <rect x="49" y="76" width="14" height="12" rx="2" fill="none" stroke="${T}" stroke-width="1.8"/>
    <path d="M70 72 Q84 66 90 54" stroke="${T}" stroke-width="7" stroke-linecap="round" fill="none"/>
    <circle cx="91" cy="52" r="6" fill="${C.hueso}" stroke="${T}" stroke-width="2.2"/>
    <rect x="76" y="14" width="34" height="40" rx="2" fill="${C.maderaClara}" stroke="${T}" stroke-width="2.4"/>
    <rect x="80" y="19" width="26" height="14" fill="${C.cera}" stroke="${T}" stroke-width="1.2"/>
    <rect x="80" y="33" width="26" height="16" fill="${C.miel}" stroke="${T}" stroke-width="1.2"/>
    <path d="M74 12 h38" stroke="${T}" stroke-width="3" stroke-linecap="round"/>
    <path d="M40 34 Q56 26 72 34 L76 66 Q56 74 36 66 Z" fill="${C.hueso}" opacity="0.42" stroke="${T}" stroke-width="2"/>
    <circle cx="56" cy="44" r="13" fill="#c98f62" stroke="${T}" stroke-width="2.2" opacity="0.9"/>
    <circle cx="51.5" cy="42" r="2" fill="${T}"/><circle cx="61" cy="42" r="2" fill="${T}"/>
    <path d="M50 50 Q56 55 62 50" stroke="${T}" stroke-width="2" fill="none" stroke-linecap="round"/>
    <ellipse cx="56" cy="30" rx="27" ry="7.5" fill="${C.cal}" stroke="${T}" stroke-width="2.6"/>
    <path d="M43 29 Q43 13 56 13 Q69 13 69 29 Z" fill="${C.cal}" stroke="${T}" stroke-width="2.6"/>
    <rect x="43" y="24" width="26" height="4.5" fill="${C.maderaVieja}"/>
  </svg>`;
}

// ── EL CSS del overlay (bees + apicultor + rótulos + lámina) ────────────────
const CSS = `
#abjOverlay{position:fixed;inset:0;z-index:21;pointer-events:none;overflow:hidden;font-family:Georgia,'Times New Roman',serif}
#abjOverlay .abjBB{position:absolute;left:0;top:0;will-change:transform;transform-origin:50% 55%}
#abjOverlay .abjBee{display:block;filter:drop-shadow(0 2px 3px rgba(71,49,20,0.35))}
#abjOverlay .abjApi{display:block;filter:drop-shadow(0 3px 4px rgba(50,35,15,0.4))}
@keyframes abjWingBeat{0%,100%{transform:scaleY(1) rotate(0deg)}50%{transform:scaleY(0.55) rotate(-8deg)}}
#abjOverlay .abjWing{transform-origin:0% 100%;animation:abjWingBeat .12s linear infinite}
#abjOverlay .abjWing2{animation-delay:-.06s}
@media (prefers-reduced-motion:reduce){#abjOverlay .abjWing{animation:none}}
#abjOverlay .abjChip{position:absolute;left:0;top:0;transform:translate(-50%,-100%);
  background:rgba(253,247,232,0.94);border:2px solid #7a5a2a;border-radius:9px;padding:5px 9px;
  box-shadow:3px 4px 0 rgba(42,26,12,0.18);color:#2a1a0c;max-width:170px;text-align:left;line-height:1.25}
#abjOverlay .abjChip b{display:block;font-size:12px;font-weight:700;letter-spacing:.02em}
#abjOverlay .abjChip i{display:block;font-size:10px;color:#6a4a1e}
#abjOverlay .abjChip span{display:block;font-size:10px;color:#3a2c18;margin-top:1px}
#abjLamina{position:fixed;left:20px;top:16px;z-index:22;pointer-events:none;max-width:min(70vw,560px)}
#abjLamina .abjKicker{font:600 12px/1 system-ui,sans-serif;letter-spacing:.18em;text-transform:uppercase;color:#7a5a20}
#abjLamina h1{margin:2px 0 0;font-size:clamp(26px,4.4vw,44px);font-style:italic;font-weight:700;color:#4a3208;text-shadow:0 2px 0 rgba(255,255,255,.45);line-height:1.02}
#abjPie{position:fixed;left:50%;bottom:16px;transform:translateX(-50%);z-index:22;pointer-events:none;text-align:center;
  background:rgba(253,247,232,0.9);border-radius:10px;padding:7px 15px;box-shadow:0 2px 8px rgba(0,0,0,.15)}
#abjPie .abjPieK{font:600 10px/1 system-ui,sans-serif;letter-spacing:.14em;text-transform:uppercase;color:#7a5a20}
#abjPie .abjPieT{margin-top:3px;font-style:italic;font-size:14px;color:#3a2c18}
`;

// ── EL DOM del mundo (lámina + pie + overlay) ────────────────────────────────
function montarDOM() {
  const style = document.createElement('style'); style.textContent = CSS; document.head.appendChild(style);
  const lamina = document.createElement('div'); lamina.id = 'abjLamina';
  lamina.innerHTML = '<div class="abjKicker">Chagra · Escuela Viva</div><h1>El colmenar de la angelita</h1>';
  document.body.appendChild(lamina);
  const pie = document.createElement('div'); pie.id = 'abjPie';
  pie.innerHTML = '<div class="abjPieK">Colmenar andino · hora dorada</div><div class="abjPieT">La angelita poliniza · <em>Tetragonisca angustula</em> &amp; <em>Apis mellifera</em></div>';
  document.body.appendChild(pie);
  const overlay = document.createElement('div'); overlay.id = 'abjOverlay';
  document.body.appendChild(overlay);
  return overlay;
}

// ═══════════════════ EL MONTAJE ═══════════════════
export function initAbejas() {
  // ── SUPRIMIR EL VALLE (main.js corre detrás; lo apagamos) ──────────────────
  const sup = document.createElement('style');
  sup.textContent =
    'body.mundoAbejas #c,body.mundoAbejas #onb,body.mundoAbejas #load,' +
    'body.mundoAbejas #hud,body.mundoAbejas #capaLugares,body.mundoAbejas #barraMover,' +
    'body.mundoAbejas #guiaSel,body.mundoAbejas #guiaV,body.mundoAbejas #ventanaM,' +
    'body.mundoAbejas #minimapaWrap{display:none!important}body.mundoAbejas{background:#0a0a0f}';
  document.head.appendChild(sup);
  document.body.classList.add('mundoAbejas');
  const pararValle = () => { try { window.__r && window.__r.setAnimationLoop(null); } catch (e) { /* aún no */ } };
  pararValle(); setTimeout(pararValle, 300); setTimeout(pararValle, 1200);

  // ── CANVAS + RENDERER PROPIOS ──────────────────────────────────────────────
  const canvas = document.createElement('canvas'); canvas.id = 'cAbejas';
  canvas.style.cssText = 'position:fixed;inset:0;width:100vw;height:100vh;display:block;z-index:20;touch-action:none';
  document.body.appendChild(canvas);
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.setSize(innerWidth, innerHeight);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.28;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  window.__rAbejas = renderer; window.__r = renderer; // hooks del gate

  const scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(new THREE.Color(C.cieloHorizonte).getHex(), 0.018);

  const camera = new THREE.PerspectiveCamera(44, innerWidth / innerHeight, 0.1, 400);
  // Encuadre HERO (Jackson): bajo y al frente del colmenar, el surco de flores en
  // primer plano, las viviendas al centro, el monte y el cielo dorado detrás.
  const HERO = new THREE.Vector3(2.6, 2.9, 11.5);
  const MIRA = new THREE.Vector3(-0.2, 1.15, 0.4);
  camera.position.copy(HERO); camera.lookAt(MIRA);
  window.__camAbejas = camera; window.__cam = camera; window.__scene = scene;

  const controls = new OrbitControls(camera, canvas);
  controls.target.copy(MIRA);
  controls.enableDamping = true; controls.dampingFactor = 0.08;
  controls.minDistance = 5; controls.maxDistance = 24;
  controls.maxPolarAngle = Math.PI * 0.495; // no bajar del suelo
  controls.minPolarAngle = 0.2;
  controls.enablePan = false;
  controls.update();

  // ── LUZ CINEMATOGRÁFICA (hora dorada, cálido vs frío) ──────────────────────
  scene.add(new THREE.HemisphereLight(0xffe7c0, 0x5a5030, 0.9));
  const sol = new THREE.DirectionalLight(0xffdf9c, 2.4);
  sol.position.set(-14, 12, -8); scene.add(sol);
  const relleno = new THREE.DirectionalLight(0xbcd0e6, 0.45);
  relleno.position.set(12, 8, 10); scene.add(relleno);

  const raiz = new THREE.Group(); scene.add(raiz);

  // ── el cielo dorado + sol con halos ─────────────────────────────────────────
  const boveda = new THREE.Mesh(construirBoveda(), new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.BackSide, depthWrite: false, fog: false }));
  boveda.scale.set(1, 0.7, 1); boveda.position.y = -8; scene.add(boveda);
  const solG = new THREE.Group();
  const dir = new THREE.Vector3(-14, 12, -8).normalize();
  solG.position.set(dir.x * 70, Math.max(16, dir.y * 60), dir.z * 74);
  solG.add(new THREE.Mesh(new THREE.SphereGeometry(3.2, 20, 16), new THREE.MeshBasicMaterial({ color: '#fff3d2', fog: false })));
  solG.add(new THREE.Mesh(new THREE.SphereGeometry(5.4, 20, 16), new THREE.MeshBasicMaterial({ color: '#ffdf9c', transparent: true, opacity: 0.42, depthWrite: false, fog: false })));
  solG.add(new THREE.Mesh(new THREE.SphereGeometry(8.4, 20, 16), new THREE.MeshBasicMaterial({ color: '#f6c261', transparent: true, opacity: 0.16, depthWrite: false, fog: false })));
  scene.add(solG);

  // ── el prado y todo lo que se ancla a él ────────────────────────────────────
  const prado = new THREE.Mesh(construirPrado(), new THREE.MeshLambertMaterial({ vertexColors: true }));
  raiz.add(prado);
  montarMonte(raiz);
  montarNubes(raiz);
  montarSotobosque(raiz);
  const flores = montarFlores(raiz);
  montarMelipona(raiz);
  montarLangstroth(raiz);
  const niebla = montarNiebla(raiz);   // capas de bruma → PROFUNDIDAD
  const rastro = crearRastro(raiz);

  // ── aves lejanas cruzando el atardecer (el mundo abierto respira) ───────────
  const AVES = [[-16, 13, -26, 0.0, 0.6], [-4, 15, -30, 1.5, 0.72], [9, 12.5, -25, 2.7, 0.5]];
  const avesG = new THREE.Group(); scene.add(avesG);
  AVES.forEach((d) => {
    const a = new THREE.Group(); a.position.set(d[0], d[1], d[2]); a.scale.setScalar(d[4]);
    [1, -1].forEach((s) => { const ala = new THREE.Mesh(new THREE.BoxGeometry(1.7, 0.06, 0.26), new THREE.MeshBasicMaterial({ color: C.tinta, fog: false })); ala.rotation.z = s * 0.5; a.add(ala); });
    avesG.add(a);
  });

  // ── post: bloom de golden hour ──────────────────────────────────────────────
  const composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene, camera));
  composer.addPass(new UnrealBloomPass(new THREE.Vector2(innerWidth, innerHeight), 0.42, 0.75, 0.82));
  composer.addPass(new OutputPass());

  // ── OVERLAY DOM: las angelitas, el apicultor y los rótulos ──────────────────
  const overlay = montarDOM();
  function billboard(html) { const d = document.createElement('div'); d.className = 'abjBB'; d.innerHTML = html; overlay.appendChild(d); return d; }
  function chip(titulo, latin, texto) {
    const d = document.createElement('div'); d.className = 'abjChip';
    d.innerHTML = `<b>${titulo}</b><i>${latin}</i><span>${texto}</span>`;
    overlay.appendChild(d); return d;
  }

  // el apicultor, plantado junto a las viviendas (anclado al prado + su sombra)
  const apiPos = new THREE.Vector3(-0.5, 0, 1.7); apiPos.y = alturaPrado(apiPos.x, apiPos.z);
  sombra(raiz, apiPos.x, apiPos.z, 0.5, { y: 0.05, ex: 1.1 });
  const apiEl = billboard(svgApicultor());

  // los rótulos de las dos viviendas (la lección de un vistazo)
  const rotMelipona = chip('Caja melipona', 'Tetragonisca angustula', 'potes de cerumen · piquera de tubo · SIN aguijón');
  const rotMeliponaPos = MELIPONA_POS.clone(); rotMeliponaPos.y = alturaPrado(MELIPONA_POS.x, MELIPONA_POS.z) + 1.5 * MELIPONA_ESC;
  const rotLang = chip('Colmena Langstroth', 'Apis mellifera', 'panales de cera en cuadros · la europea');
  const rotLangPos = LANGSTROTH_POS.clone(); rotLangPos.y = alturaPrado(LANGSTROTH_POS.x, LANGSTROTH_POS.z) + 1.9;

  // las forrajeras y las guardianas
  const _v = new THREE.Vector3();
  const abejas = FORRAJERAS.map((datos) => {
    const el = billboard(svgAngelita());
    const paradas = datos.flores.map((i) => ({ tipo: 'flor', i, p: puntoDeFlor(FLORES[i]) }));
    paradas.push({ tipo: 'piquera', i: -1, p: PIQUERAS[datos.casa].boca, dentro: PIQUERAS[datos.casa].dentro });
    const p0 = paradas[0].p;
    return {
      datos, el, paradas, pos: new THREE.Vector3(),
      est: { fase: 'vuelo', destino: 0, t0: -datos.fase * 0.6, desde: new THREE.Vector3(p0.x + Math.sin(datos.fase) * 2.2, p0.y + 1.4, p0.z + Math.cos(datos.fase) * 1.6), dur: 2.4, arco: 0.6, dir: 1, k: 1 },
    };
  });
  const guardianas = GUARDIANAS.map((g) => ({ datos: g, el: billboard(svgAngelita()), base: PIQUERAS[g.casa].boca.clone().add(new THREE.Vector3(0.28 * g.lado, 0.18, 0.22)) }));

  // ── proyección 3D→pantalla para los billboards ──────────────────────────────
  function proyectar(el, v3, pxBase, dirX) {
    _v.copy(v3).project(camera);
    if (_v.z > 1) { el.style.display = 'none'; return; }
    el.style.display = 'block';
    const x = (_v.x * 0.5 + 0.5) * innerWidth;
    const y = (-_v.y * 0.5 + 0.5) * innerHeight;
    // escala por distancia real a cámara (billboard: más cerca = más grande)
    const dist = camera.position.distanceTo(v3);
    const px = clamp(pxBase * (8 / dist), pxBase * 0.4, pxBase * 2.2);
    const svg = el.firstElementChild;
    if (svg && svg.tagName.toLowerCase() === 'svg') { svg.style.width = px + 'px'; svg.style.height = 'auto'; }
    el.style.transform = `translate(${x.toFixed(1)}px,${y.toFixed(1)}px) translate(-50%,-55%) scaleX(${dirX})`;
    el.style.zIndex = Math.round((1 - _v.z) * 1000);
  }
  function proyectarChip(el, v3) {
    _v.copy(v3).project(camera);
    if (_v.z > 1) { el.style.display = 'none'; return; }
    el.style.display = 'block';
    const x = (_v.x * 0.5 + 0.5) * innerWidth;
    const y = (-_v.y * 0.5 + 0.5) * innerHeight;
    el.style.transform = `translate(${x.toFixed(1)}px,${y.toFixed(1)}px) translate(-50%,-100%)`;
  }

  const reduced = matchMedia('(prefers-reduced-motion:reduce)').matches;
  const _aux = new THREE.Vector3();

  function actualizarAbejas(t, dt) {
    for (const b of abejas) {
      const e = b.est;
      const parada = b.paradas[e.destino];
      let dirX = e.dir, escala = 1;
      if (reduced) { b.pos.copy(b.paradas[0].p); VISITAS[b.paradas[0].i] = 1; proyectar(b.el, b.pos, b.datos.px, 1); continue; }

      const avanzar = (desdeAqui) => {
        e.desde.copy(desdeAqui);
        e.destino = (e.destino + 1) % b.paradas.length;
        const meta = b.paradas[e.destino].p;
        const dist = e.desde.distanceTo(meta);
        e.dur = Math.max(0.7, dist / b.datos.vel);
        e.arco = 0.28 + dist * 0.1;
        e.dir = meta.x < e.desde.x - 0.05 ? -1 : meta.x > e.desde.x + 0.05 ? 1 : e.dir;
        e.fase = 'vuelo'; e.t0 = t;
      };

      if (e.fase === 'vuelo') {
        const u = clamp((t - e.t0) / e.dur, 0, 1);
        const s = u * u * (3 - 2 * u);
        _aux.lerpVectors(e.desde, parada.p, s);
        _aux.y += Math.sin(s * Math.PI) * e.arco + Math.sin(t * 6 + b.datos.fase) * 0.05;
        b.pos.copy(_aux);
        dirX = e.dir;
        // rastro de polen: soltar motas en vuelo (no en cada frame)
        if (Math.random() < dt * 8) rastro.emitir(b.pos.x, b.pos.y, b.pos.z);
        if (u >= 1) {
          if (parada.tipo === 'flor') { e.fase = 'posada'; e.t0 = t; }
          else { e.fase = 'entra'; e.t0 = t; e.desde.copy(parada.p); }
        }
      } else if (e.fase === 'posada') {
        b.pos.copy(parada.p);
        VISITAS[parada.i] = 1; // la flor se estremece + puff
        if (t - e.t0 >= b.datos.posa) avanzar(parada.p);
      } else if (e.fase === 'entra') {
        const u = clamp((t - e.t0) / 0.6, 0, 1);
        b.pos.lerpVectors(parada.p, parada.dentro, u);
        escala = 1 - u * 0.85;
        if (u >= 1) { e.fase = 'dentro'; e.t0 = t; }
      } else if (e.fase === 'dentro') {
        b.pos.copy(parada.dentro); escala = 0.05;
        if (t - e.t0 >= 2.0) { e.fase = 'sale'; e.t0 = t; }
      } else if (e.fase === 'sale') {
        const u = clamp((t - e.t0) / 0.6, 0, 1);
        b.pos.lerpVectors(parada.dentro, parada.p, u);
        escala = 0.15 + u * 0.85;
        if (u >= 1) { avanzar(parada.p); }
      }
      proyectar(b.el, b.pos, b.datos.px * escala, dirX);
    }
    // guardianas: suspendidas frente al tubo, tanteando
    for (const g of guardianas) {
      if (reduced) { proyectar(g.el, g.base, g.datos.px, g.datos.lado); continue; }
      _aux.copy(g.base);
      _aux.x += Math.sin(t * 1.6 + g.datos.fase) * 0.06 * g.datos.lado;
      _aux.y += Math.sin(t * 2.3 + g.datos.fase) * 0.05;
      proyectar(g.el, _aux, g.datos.px, g.datos.lado);
    }
    proyectar(apiEl, new THREE.Vector3(apiPos.x, apiPos.y, apiPos.z), 150, 1);
    proyectarChip(rotMelipona, rotMeliponaPos);
    proyectarChip(rotLang, rotLangPos);
  }

  // las flores reaccionan a la visita (estremecen, corola se abre, puff sube)
  function actualizarFlores(t, dt) {
    for (const fl of flores) {
      const v = VISITAS[fl.idx];
      fl.tallo.rotation.z = Math.sin(t * 1.15 + fl.datos.fase) * 0.055 + Math.sin(t * 12.5) * 0.075 * v;
      fl.tallo.rotation.x = Math.sin(t * 0.92 + fl.datos.fase * 1.7) * 0.04;
      fl.corola.scale.setScalar(1 + v * 0.2);
      fl.puff.visible = v > 0.04;
      fl.puff.position.y = 0.08 + (1 - v) * 0.6;
      fl.puff.scale.setScalar(0.3 + v * 0.8);
      if (v > 0) VISITAS[fl.idx] = Math.max(0, v - dt * 0.5);
    }
  }

  // ── resize ───────────────────────────────────────────────────────────────
  addEventListener('resize', () => {
    camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix();
    renderer.setSize(innerWidth, innerHeight); composer.setSize(innerWidth, innerHeight);
  });

  // quitar el loader del valle (por si quedó)
  const loadEl = document.getElementById('load');
  if (loadEl) loadEl.remove();

  // ── el loop ──────────────────────────────────────────────────────────────
  const clock = new THREE.Clock();
  let last = 0;
  renderer.setAnimationLoop(() => {
    const t = clock.getElapsedTime();
    const dt = Math.min(0.05, t - last); last = t;
    tickVientoMundos(t);
    controls.update();
    // aves aleteando lento
    if (!reduced) avesG.children.forEach((a, i) => {
      const d = AVES[i];
      a.position.x = d[0] + Math.sin(t * 0.05 + d[3]) * 6.5;
      a.position.y = d[1] + Math.sin(t * 0.5 + d[3]) * 0.5;
      const bat = Math.sin(t * 6 + d[3]) * 0.42;
      if (a.children[0]) a.children[0].rotation.z = 0.5 + bat;
      if (a.children[1]) a.children[1].rotation.z = -0.5 - bat;
    });
    // la niebla deriva despacito (mar de nubes que respira)
    if (!reduced) for (const n of niebla) n.m.position.x = n.x0 + Math.sin(t * 0.05 + n.ph) * n.dr;
    actualizarFlores(t, dt);
    actualizarAbejas(t, dt);
    rastro.update(dt);
    composer.render();
  });

  return { renderer, scene, camera };
}
