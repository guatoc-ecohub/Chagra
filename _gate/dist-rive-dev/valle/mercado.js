// ── mercado.js — LA PLAZA DE MERCADO CAMPESINA, AGUAS ABAJO DEL VALLE ────────
//
// Modo `?mundo=mercado`. No es un mojón del valle: es BAJAR a la plaza de
// mercado del pueblo, por donde se sale del valle (el puesto medido del mojón
// `vender`: aguas abajo, 2318 msnm, pendiente suave). Archivo NUEVO y AUTÓNOMO,
// Three.js vanilla — monta su propio canvas/renderer/loop y SUPRIME el valle
// (main.js corre detrás y lo apagamos): no pelean dos renders. Su único enganche
// con main.js es el bloque marcado `// ── MERCADO ──`. Dialoga igual que
// cafetal.js, bosque.js y abejas.js: lámina Humboldt + Ghibli, low-poly
// entintado, cero fotorrealismo.
//
// GROUNDING — chagra `mundo-mercado-3d` (la cara ECONÓMICA de Chagra):
//   · LA CADENA CORTA campo→plaza: lo cosechado baja por el CAMINO y se vende
//     directo, del productor al comprador — la ganancia vuelve a la finca, no a
//     la tajada del intermediario. Aquí el camino ES un elemento del mundo: la
//     mula cargada de costales baja del monte con su arriero.
//   · EL PRECIO JUSTO: la BÁSCULA de platillos en la tarima — se pesa a la
//     vista de todos y se paga parejo. Conocer el precio de referencia antes de
//     vender es parte del oficio: cosechar bien y vender mal es trabajar para
//     otro.
//   · LA PROCEDENCIA: el letrero dice de qué VEREDA y de qué PISO TÉRMICO viene
//     cada producto (café del templado, papa de la tierra fría) — el origen es
//     el sello.
//   · LOS PUESTOS con su toldo y la cosecha REAL de la finca andina: café en
//     costales, bultos de papa, guacales de tomate y zanahoria, maíz, aguacate
//     y plátano, cubetas de huevos, frascos de miel, hierbas y ristras de ají.
//
// LAS CUATRO MIRADAS (encargo del operador):
//   · Peter Jackson — la plaza HABITADA: dos hileras de toldos de color, gente
//     que compra y vende, la mula que llega del monte, el pueblo con su torre
//     asomando en la niebla al fondo. Un lugar vivido, no una maqueta.
//   · Nolan — LA IMAGEN QUE SE QUEDA: los banderines cruzando la calle del
//     mercado contra la luz de la mañana, y la báscula al fondo como altar
//     sereno del trato parejo.
//   · Zelda BOTW / Odyssey — color y ganas de recorrer: el rojo del tomate, el
//     naranja de la zanahoria, el amarillo del maíz y de los toldos — el pop de
//     la cosecha contra el gris cálido del empedrado.
//   · agroecólogo — la FIDELIDAD es el efecto especial: no hay producto sin
//     origen (el letrero de veredas y pisos), el café va en costal de fique, la
//     papa en bulto, el huevo en cubeta; la plaza enseña "del fruto al ingreso"
//     sin inventar cifras.
//   · diseñador instruccional — la niña (11) y el campesino, EN USTED: la
//     leyenda de la cadena corta y la tarjeta de la báscula enseñan a vender
//     sin gamificar.
//
// LEY DE LA CASA: TODO anclado al suelo con `alturaMercado(x,z)` — cero
// flotando. Fusión de mallas SIEMPRE desindexada (mergeGeometries mezclado
// devuelve null en silencio): aquí viajan solo position + color.

import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
// ez-tree: el árbol de la plaza deja de ser el lollipop (domo + lóbulos
// icosaedro) y pasa a ser un roble negro (Quercus humboldtii) ez-tree VIVO,
// individual con su silueta rica — es un solo árbol, cabe un Tree completo.
import { crearHeroe } from './flora-eztree-bake.js';

// ── PALETA MADRE (la mañana de mercado: empedrado cálido y cosecha que grita) ─
const C = {
  // el piso: pasto de potrero bajo + empedrado + camino de herradura
  pasto: '#6f9648', pastoSeco: '#96a355', pastoSombra: '#55793c',
  piedra: '#9b9489', piedraClara: '#b3aa99', piedraSombra: '#7c766c',
  tierra: '#8c5a3a', tierraRoja: '#9c5330', tierraSombra: '#6c4830',
  // maderas de puesto y tarima
  madera: '#8a6a45', maderaClara: '#c7ad7c', maderaVieja: '#5f4630', tabla: '#a8895c',
  // los toldos (lona teñida, no plástico)
  toldoRojo: '#c0492f', toldoVerde: '#3f8f4e', toldoOcre: '#d9a13b', toldoAzul: '#3e6e9e', lona: '#d8c9a4',
  // LA COSECHA (el pop de Zelda)
  tomate: '#d5402b', zanahoria: '#e07b28', cebolla: '#b087c2', cebollaBlanca: '#e8dfc8',
  maiz: '#e8c33a', maizHoja: '#8fae54', papa: '#b08d5a', papaOscura: '#8a6a44',
  aguacate: '#3d5c2a', naranja: '#e59a2e', platano: '#cfae3d', platanoVerde: '#7f9c3f',
  cereza: '#c92c1d', cafePergamino: '#d9c89b', huevo: '#efe0c0', miel: '#d98e2b',
  aji: '#c9331d', hierba: '#4e8f3f', flor: '#e2b13c',
  // costales y canastos
  fique: '#cab587', fiqueOscuro: '#a8905e', canasto: '#b3924f',
  // la gente (ropa de plaza: ruanas y sombreros aguadeños)
  piel: '#c99d76', pielOscura: '#9a6f4d', sombrero: '#e4d8b8', cinta: '#3a2c1c',
  ruanaRoja: '#8a3a2c', ruanaAzul: '#3c5876', ruanaVerde: '#5c6e3a', ruanaCafe: '#6e5138', ropa: '#7a7466', falda: '#7c4a56',
  // la mula cafetera
  mula: '#5a4a3a', mulaPanza: '#8a7660', crin: '#3a2e22',
  // el pueblo esbozado (cal blanca y teja de barro)
  cal: '#ece4d2', teja: '#9a5236', tejaVieja: '#7f452e', muro: '#d9cdb4',
  // cielo de mañana de mercado / niebla crema
  cieloCenit: '#9fc2d8', cieloMedio: '#cfd9c9', cieloHorizonte: '#eee0c2', niebla: '#e4e6d2', sol: '#ffe6bd',
  zinc: '#aab2b4', metal: '#6e6a60',
};
const col = (h) => new THREE.Color(h);
const mezcla = (a, b, t) => col(a).lerp(col(b), t);
const rand = (a, b) => a + Math.random() * (b - a);

// ── PRNG determinista (la misma plaza cada carga: el gate compara) ────────────
function prng(semilla) {
  let a = semilla >>> 0;
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ── EL RELIEVE: la salida suave del valle (pendiente 8°, no ladera brava) ─────
function hash2(x, z) {
  const h = Math.sin(x * 127.1 + z * 311.7) * 43758.5453;
  return h - Math.floor(h);
}
function vnoise(x, z) {
  const xi = Math.floor(x), zi = Math.floor(z), xf = x - xi, zf = z - zi;
  const u = xf * xf * (3 - 2 * xf), v = zf * zf * (3 - 2 * zf);
  const a = hash2(xi, zi), b = hash2(xi + 1, zi), c = hash2(xi, zi + 1), d = hash2(xi + 1, zi + 1);
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
}
function fbm(x, z) {
  let s = 0, amp = 1, f = 1, norm = 0;
  for (let i = 0; i < 4; i++) { s += amp * vnoise(x * f, z * f); norm += amp; amp *= 0.5; f *= 2.05; }
  return s / norm;
}
function gauss(x, z, cx, cz, s) { const dx = x - cx, dz = z - cz; return Math.exp(-(dx * dx + dz * dz) / (2 * s * s)); }

// la PLAZA: explanada empedrada donde vive el mercado
const PLAZA = { x: 0, z: 10, r: 26 };
// el CAMINO de herradura que baja del monte (-Z) a la plaza: la cadena corta
function caminoX(z) { return Math.sin(z * 0.021) * 13 - 4; }
function alturaMercado(x, z) {
  const pend = -z * 0.055;                              // sube suave hacia el monte (-Z)
  const ond = (fbm(x * 0.012 + 11, z * 0.012 - 7) - 0.5) * 14;
  const micro = (fbm(x * 0.06, z * 0.06) - 0.5) * 2.0;
  let y = pend + ond + micro;
  const plano = gauss(x, z, PLAZA.x, PLAZA.z, 19);
  // el camino asienta una cinta transitable monte abajo (cede ante la plaza:
  // sin el factor (1-plano) abría una zanja en la boca de la explanada)
  if (z < PLAZA.z) {
    const dx = x - caminoX(z);
    const k = Math.exp(-(dx * dx) / (2 * 4.2 * 4.2)) * 0.5 * (1 - plano);
    const yCam = pend + ond * 0.4;
    y = y * (1 - k) + yCam * k;
  }
  // la plaza aplana su explanada
  const yPlaza = -PLAZA.z * 0.055 + 0.35;
  y = y * (1 - plano * 0.94) + yPlaza * (plano * 0.94);
  return y;
}

// ── TALLER DE MALLAS (idéntico contrato que cafetal.js) ───────────────────────
function pintar(g, color) {
  const gg = g.index ? g.toNonIndexed() : g;
  const n = gg.attributes.position.count, arr = new Float32Array(n * 3);
  const c = col(color);
  for (let i = 0; i < n; i++) { arr[i * 3] = c.r; arr[i * 3 + 1] = c.g; arr[i * 3 + 2] = c.b; }
  gg.setAttribute('color', new THREE.BufferAttribute(arr, 3));
  return gg;
}
function poner(g, [x, y, z], rot, esc) {
  if (esc) g.scale(esc[0], esc[1], esc[2]);
  if (rot) { if (rot[0]) g.rotateX(rot[0]); if (rot[1]) g.rotateY(rot[1]); if (rot[2]) g.rotateZ(rot[2]); }
  g.translate(x, y, z);
  return g;
}
const pieza = (geo, color, pos = [0, 0, 0], rot, esc) => pintar(poner(geo, pos, rot, esc), color);
function fusionar(lista) {
  const gs = lista.map((x) => (x.index ? x.toNonIndexed() : x));
  let n = 0;
  for (const g of gs) n += g.attributes.position.count;
  const pos = new Float32Array(n * 3), colr = new Float32Array(n * 3);
  let o = 0;
  for (const g of gs) {
    const P = g.attributes.position.array, Cc = g.attributes.color ? g.attributes.color.array : null;
    for (let i = 0; i < g.attributes.position.count; i++) {
      pos[(o + i) * 3] = P[i * 3]; pos[(o + i) * 3 + 1] = P[i * 3 + 1]; pos[(o + i) * 3 + 2] = P[i * 3 + 2];
      if (Cc) { colr[(o + i) * 3] = Cc[i * 3]; colr[(o + i) * 3 + 1] = Cc[i * 3 + 1]; colr[(o + i) * 3 + 2] = Cc[i * 3 + 2]; }
      else { colr[(o + i) * 3] = colr[(o + i) * 3 + 1] = colr[(o + i) * 3 + 2] = 1; }
    }
    o += g.attributes.position.count; g.dispose();
  }
  const out = new THREE.BufferGeometry();
  out.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  out.setAttribute('color', new THREE.BufferAttribute(colr, 3));
  out.computeVertexNormals(); out.computeBoundingSphere();
  return out;
}

// material único (DoubleSide: los toldos y banderines se ven por debajo)
const MAT = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 1, flatShading: true, side: THREE.DoubleSide });

// ── texturas pintadas (sin cargar imágenes) ───────────────────────────────────
let _motaTex = null;
function motaTex() {
  if (_motaTex) return _motaTex;
  const cv = document.createElement('canvas'); cv.width = cv.height = 32;
  const c = cv.getContext('2d'), r = 16;
  const g = c.createRadialGradient(r, r, 0, r, r, r);
  g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(0.4, 'rgba(255,255,255,0.6)'); g.addColorStop(1, 'rgba(255,255,255,0)');
  c.fillStyle = g; c.beginPath(); c.arc(r, r, r, 0, Math.PI * 2); c.fill();
  _motaTex = new THREE.CanvasTexture(cv);
  return _motaTex;
}
let _sombraTex = null;
function sombraTex() {
  if (_sombraTex) return _sombraTex;
  const cv = document.createElement('canvas'); cv.width = cv.height = 128;
  const c = cv.getContext('2d'), r = 64;
  const g = c.createRadialGradient(r, r, 0, r, r, r);
  g.addColorStop(0, 'rgba(28,20,12,0.5)'); g.addColorStop(0.6, 'rgba(28,20,12,0.2)'); g.addColorStop(1, 'rgba(0,0,0,0)');
  c.fillStyle = g; c.beginPath(); c.arc(r, r, r, 0, Math.PI * 2); c.fill();
  _sombraTex = new THREE.CanvasTexture(cv);
  return _sombraTex;
}
function sombraPlano(r, x, y, z) {
  const m = new THREE.Mesh(new THREE.PlaneGeometry(r * 2, r * 2),
    new THREE.MeshBasicMaterial({ map: sombraTex(), transparent: true, depthWrite: false, fog: false }));
  m.rotation.x = -Math.PI / 2; m.position.set(x, y, z);
  return m;
}

// letrero de PROCEDENCIA: tabla pintada a mano (canvas, diegética)
function letreroTex() {
  const cv = document.createElement('canvas'); cv.width = 512; cv.height = 360;
  const c = cv.getContext('2d');
  c.fillStyle = '#332920'; c.fillRect(0, 0, 512, 360);
  c.strokeStyle = '#c7ad7c'; c.lineWidth = 8; c.strokeRect(10, 10, 492, 340);
  c.fillStyle = '#f3e9cf'; c.textAlign = 'center';
  c.font = '700 34px Georgia,serif';
  c.fillText('DE LA VEREDA A LA PLAZA', 256, 62);
  c.font = 'italic 20px Georgia,serif'; c.fillStyle = '#d8c9a4';
  c.fillText('lo que se vende dice de dónde viene', 256, 94);
  const filas = [
    ['#c92c1d', 'café — vereda El Alto · piso templado'],
    ['#b08d5a', 'papa — El Páramo · tierra fría'],
    ['#3d5c2a', 'aguacate — La Ladera · clima medio'],
    ['#d98e2b', 'miel — el colmenar de la angelita'],
  ];
  c.textAlign = 'left'; c.font = '22px Georgia,serif';
  filas.forEach(([tinte, txt], i) => {
    const y = 140 + i * 44;
    c.fillStyle = tinte; c.beginPath(); c.arc(48, y - 7, 9, 0, Math.PI * 2); c.fill();
    c.fillStyle = '#f3e9cf'; c.fillText(txt, 70, y);
  });
  c.textAlign = 'center'; c.font = 'italic 700 22px Georgia,serif'; c.fillStyle = '#e2b13c';
  c.fillText('el origen es el sello', 256, 330);
  const tx = new THREE.CanvasTexture(cv); tx.colorSpace = THREE.SRGBColorSpace;
  return tx;
}
// tablero del trato parejo (junto a la báscula)
function tableroTex() {
  const cv = document.createElement('canvas'); cv.width = 512; cv.height = 256;
  const c = cv.getContext('2d');
  c.fillStyle = '#2c3328'; c.fillRect(0, 0, 512, 256);
  c.strokeStyle = '#c7ad7c'; c.lineWidth = 8; c.strokeRect(8, 8, 496, 240);
  c.fillStyle = '#f3e9cf'; c.textAlign = 'center';
  c.font = '700 40px Georgia,serif';
  c.fillText('PRECIO JUSTO', 256, 84);
  c.font = '26px Georgia,serif'; c.fillStyle = '#d8c9a4';
  c.fillText('se pesa a la vista de todos', 256, 140);
  c.fillText('se paga al que cosechó', 256, 180);
  const tx = new THREE.CanvasTexture(cv); tx.colorSpace = THREE.SRGBColorSpace;
  return tx;
}

// ═══════════════════════════════════════════════════════════════════════════
//  LOS ARQUETIPOS DE LA PLAZA (cada uno se lee por su silueta)
// ═══════════════════════════════════════════════════════════════════════════

// canasto/guacal de feria: cajón de listones con la cosecha encima
function guacal(p, x, z, y0, fruta, nf, rf, seed, esc = 1) {
  const r = prng(seed);
  const w = 0.62 * esc, d = 0.44 * esc, h = 0.24 * esc;
  p.push(pieza(new THREE.BoxGeometry(w, 0.03, d), C.canasto, [x, y0 + 0.015, z]));
  for (const [sx, sz, ww, dd] of [[-w / 2, 0, 0.03, d], [w / 2, 0, 0.03, d], [0, -d / 2, w, 0.03], [0, d / 2, w, 0.03]]) {
    p.push(pieza(new THREE.BoxGeometry(ww, h, dd), mezcla(C.canasto, C.maderaVieja, 0.25).getStyle(), [x + sx, y0 + h / 2, z + sz]));
  }
  for (let i = 0; i < nf; i++) {
    p.push(pieza(new THREE.IcosahedronGeometry(rf, 0), fruta,
      [x + (r() - 0.5) * (w - rf * 2) * 0.9, y0 + h * 0.8 + rf * 0.6 + r() * rf * 0.5, z + (r() - 0.5) * (d - rf * 2) * 0.9]));
  }
}
// costal de fique parado (café, panela…)
function costal(p, x, z, y0, seed, tinte = C.fique, esc = 1) {
  const r = prng(seed);
  const rot = (r() - 0.5) * 0.2;
  p.push(pieza(new THREE.CylinderGeometry(0.3 * esc, 0.4 * esc, 0.86 * esc, 8), tinte, [x, y0 + 0.43 * esc, z], [0, r() * 3, rot]));
  p.push(pieza(new THREE.CylinderGeometry(0.24 * esc, 0.31 * esc, 0.2 * esc, 8), mezcla(tinte, C.fiqueOscuro, 0.5).getStyle(),
    [x + rot * 0.7, y0 + 0.9 * esc, z], [0, 0, rot]));
}

// EL PUESTO DE MERCADO (~3 m de frente, toldo a 2,6 m): 4 postes + toldo a dos
// aguas con flecos + mesón de tablas + la cosecha según el `tipo`. TODO fusionado
// en UNA geometría (el puesto es escenografía quieta). Mira hacia +Z local.
function geomPuesto(tipo, toldo, seed) {
  const r = prng(seed), p = [];
  const W = 3.0, D = 2.0, HP = 2.15;
  // postes (los de atrás más altos: el toldo cae hacia el frente)
  for (const [px, pz] of [[-W / 2, -D / 2], [W / 2, -D / 2], [-W / 2, D / 2], [W / 2, D / 2]]) {
    p.push(pieza(new THREE.CylinderGeometry(0.05, 0.07, HP + (pz > 0 ? 0.1 : 0.5), 6), C.madera, [px, (HP + (pz > 0 ? 0.1 : 0.5)) / 2, pz]));
  }
  // toldo a un agua (cae hacia el frente +Z), lona teñida con parche claro
  const caida = 0.5;
  const techo = new THREE.PlaneGeometry(W + 0.7, D + 0.9, 3, 2);
  const tv = techo.attributes.position;
  for (let i = 0; i < tv.count; i++) tv.setZ(i, tv.getZ(i) + Math.sin(tv.getX(i) * 2.1) * 0.05); // lona ondulada
  p.push(pieza(techo, toldo, [0, HP + 0.32, 0.05], [-Math.PI / 2 + caida / (D + 0.9), 0, 0]));
  // parche remendado (Ghibli: la lona vivida)
  p.push(pieza(new THREE.PlaneGeometry(0.7, 0.55), mezcla(toldo, C.lona, 0.55).getStyle(),
    [W * 0.22, HP + 0.36 + 0.02, -0.2], [-Math.PI / 2 + caida / (D + 0.9), 0, 0]));
  // el FALDÓN perimetral: la banda que cuelga del borde del toldo — es lo que
  // da el color del puesto a la altura del ojo (el plano del techo se ve de
  // canto y desaparece; la banda vertical no)
  const fw = W + 0.7, fd = D + 0.9;
  const tinteFald = mezcla(toldo, '#4a3524', 0.12).getStyle();
  p.push(pieza(new THREE.PlaneGeometry(fw, 0.32), tinteFald, [0, HP + 0.05, fd / 2 + 0.04]));
  p.push(pieza(new THREE.PlaneGeometry(fw, 0.32), tinteFald, [0, HP + 0.56, -fd / 2 + 0.02]));
  for (const sx of [-1, 1]) {
    p.push(pieza(new THREE.PlaneGeometry(fd, 0.32), tinteFald, [sx * fw / 2, HP + 0.3, 0.05], [0, Math.PI / 2, 0]));
  }
  // flecos: festón triangular colgando bajo el faldón delantero
  for (let i = 0; i < 8; i++) {
    const fx = -W / 2 - 0.3 + (i + 0.5) * ((W + 0.6) / 8);
    p.push(pieza(new THREE.CircleGeometry(0.14, 3), mezcla(toldo, '#4a3524', 0.3).getStyle(),
      [fx, HP - 0.16, fd / 2 + 0.05], [0, 0, Math.PI]));
  }
  // mesón de tablas (0,85 m de alto: altura real de mesa de feria)
  p.push(pieza(new THREE.BoxGeometry(W - 0.2, 0.08, 1.1), C.tabla, [0, 0.85, D / 2 - 0.5]));
  for (let i = 0; i < 4; i++) {
    p.push(pieza(new THREE.BoxGeometry(0.09, 0.85, 0.09), C.maderaVieja,
      [-W / 2 + 0.35 + i * ((W - 0.9) / 3), 0.42, D / 2 - 0.5 + (i % 2 ? 0.4 : -0.4)]));
  }
  // faldón de la mesa (tela que cae al frente)
  p.push(pieza(new THREE.PlaneGeometry(W - 0.3, 0.7), mezcla(C.lona, toldo, 0.25).getStyle(), [0, 0.47, D / 2 + 0.06]));
  const MY = 0.89;                            // cara superior del mesón
  const mz = D / 2 - 0.5;
  // LA COSECHA según el puesto
  if (tipo === 'cafe') {
    costal(p, -0.5, -0.25, 0, seed + 1); costal(p, 0.35, -0.45, 0, seed + 2); costal(p, -0.05, 0.35, 0, seed + 3, C.fiqueOscuro);
    // bandeja de café cereza + bandeja de pergamino sobre el mesón
    for (const [bx, tinte] of [[-0.8, C.cereza], [0.1, C.cafePergamino]]) {
      p.push(pieza(new THREE.CylinderGeometry(0.34, 0.3, 0.09, 10), C.maderaClara, [bx, MY + 0.05, mz]));
      p.push(pieza(new THREE.SphereGeometry(0.27, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2), tinte, [bx, MY + 0.08, mz], null, [1, 0.5, 1]));
    }
    costal(p, 0.95, 0, MY, seed + 4, C.fique, 0.62);
  } else if (tipo === 'papa') {
    // bultos gordos en el piso + montón de papas en el mesón
    costal(p, -0.7, -0.1, 0, seed + 1, C.fique, 1.15); costal(p, 0.2, -0.4, 0, seed + 2, C.fiqueOscuro, 1.1); costal(p, 0.9, 0.15, 0, seed + 3, C.fique, 1.05);
    for (let i = 0; i < 14; i++) {
      p.push(pieza(new THREE.IcosahedronGeometry(0.09 + r() * 0.04, 0), r() > 0.4 ? C.papa : C.papaOscura,
        [-0.9 + r() * 1.8, MY + 0.09, mz + (r() - 0.5) * 0.5]));
    }
  } else if (tipo === 'hortaliza') {
    guacal(p, -0.85, mz, MY, C.tomate, 9, 0.085, seed + 1);
    guacal(p, 0.0, mz + 0.1, MY, C.cebolla, 7, 0.09, seed + 2);
    guacal(p, 0.85, mz, MY, C.cebollaBlanca, 7, 0.085, seed + 3);
    // zanahorias acostadas en manojo
    for (let i = 0; i < 6; i++) {
      p.push(pieza(new THREE.ConeGeometry(0.05, 0.34, 5), C.zanahoria,
        [-0.3 + i * 0.11, MY + 0.05, mz - 0.42], [Math.PI / 2 + 0.15, 0, (r() - 0.5) * 0.3]));
    }
    guacal(p, -0.5, 0.1, 0.02, C.tomate, 8, 0.085, seed + 5);   // guacal en el piso
  } else if (tipo === 'maiz') {
    // mazorcas amarillas con su hoja, en pila
    for (let i = 0; i < 9; i++) {
      const mx = -0.8 + (i % 3) * 0.55 + r() * 0.12, mzz = mz - 0.15 + Math.floor(i / 3) * 0.22;
      p.push(pieza(new THREE.CylinderGeometry(0.07, 0.055, 0.42, 6), C.maiz, [mx, MY + 0.07, mzz], [Math.PI / 2, r() * 3, 0]));
      p.push(pieza(new THREE.ConeGeometry(0.05, 0.2, 4), C.maizHoja, [mx + 0.26, MY + 0.07, mzz], [0, 0, -Math.PI / 2]));
    }
    guacal(p, 0.9, mz, MY, C.maiz, 6, 0.08, seed + 2);
    costal(p, -0.6, -0.2, 0, seed + 3, C.fiqueOscuro);
  } else if (tipo === 'fruta') {
    guacal(p, -0.85, mz, MY, C.aguacate, 8, 0.1, seed + 1);
    guacal(p, 0.0, mz + 0.08, MY, C.naranja, 8, 0.09, seed + 2);
    // racimos de plátano colgando del travesaño del toldo
    for (const [gx, tinte] of [[-0.9, C.platanoVerde], [0.5, C.platano]]) {
      p.push(pieza(new THREE.CylinderGeometry(0.012, 0.012, 0.5, 4), C.maderaVieja, [gx, HP - 0.27, D / 2 - 0.2]));
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * Math.PI * 2;
        p.push(pieza(new THREE.CylinderGeometry(0.045, 0.06, 0.3, 5), tinte,
          [gx + Math.cos(a) * 0.09, HP - 0.62, D / 2 - 0.2 + Math.sin(a) * 0.09], [0.25 * Math.cos(a), 0, 0.25 * Math.sin(a)]));
      }
    }
    guacal(p, 0.85, mz - 0.05, MY, C.aguacate, 6, 0.1, seed + 3);
  } else if (tipo === 'huevos') {
    // cubetas de huevos apiladas + frascos de miel ámbar
    for (const [cx, czz, n] of [[-0.85, mz, 12], [-0.25, mz + 0.05, 12]]) {
      p.push(pieza(new THREE.BoxGeometry(0.56, 0.05, 0.42), mezcla(C.canasto, C.cal, 0.4).getStyle(), [cx, MY + 0.03, czz]));
      for (let i = 0; i < n; i++) {
        p.push(pieza(new THREE.SphereGeometry(0.05, 6, 5), C.huevo,
          [cx - 0.21 + (i % 4) * 0.14, MY + 0.09, czz - 0.14 + Math.floor(i / 4) * 0.14], null, [1, 1.25, 1]));
      }
    }
    for (let i = 0; i < 4; i++) {
      p.push(pieza(new THREE.CylinderGeometry(0.075, 0.075, 0.2, 8), C.miel, [0.45 + (i % 2) * 0.22, MY + 0.1, mz - 0.12 + Math.floor(i / 2) * 0.24]));
      p.push(pieza(new THREE.CylinderGeometry(0.08, 0.08, 0.03, 8), C.metal, [0.45 + (i % 2) * 0.22, MY + 0.215, mz - 0.12 + Math.floor(i / 2) * 0.24]));
    }
    guacal(p, 0.95, mz, MY, C.huevo, 5, 0.07, seed + 4, 0.8);
  } else { // 'hierbas'
    // manojos verdes parados + ristra de ají colgando (el pop rojo)
    for (let i = 0; i < 7; i++) {
      p.push(pieza(new THREE.ConeGeometry(0.09, 0.4, 5), mezcla(C.hierba, C.maizHoja, r() * 0.5).getStyle(),
        [-0.9 + i * 0.3, MY + 0.18, mz + (i % 2 ? 0.16 : -0.12)], [(r() - 0.5) * 0.4, 0, (r() - 0.5) * 0.4]));
    }
    for (const gx of [-0.6, 0.2, 0.9]) {
      p.push(pieza(new THREE.CylinderGeometry(0.012, 0.012, 0.55, 4), C.maderaVieja, [gx, HP - 0.3, D / 2 - 0.15]));
      for (let i = 0; i < 6; i++) {
        p.push(pieza(new THREE.ConeGeometry(0.035, 0.13, 5), C.aji,
          [gx + (r() - 0.5) * 0.08, HP - 0.62 + 0.06 - i * 0.1, D / 2 - 0.15 + (r() - 0.5) * 0.08], [Math.PI, 0, (r() - 0.5) * 0.5]));
      }
    }
    // flores de caléndula en tarro
    p.push(pieza(new THREE.CylinderGeometry(0.11, 0.09, 0.24, 7), C.metal, [-0.35, MY + 0.12, mz - 0.35]));
    for (let i = 0; i < 5; i++) {
      p.push(pieza(new THREE.IcosahedronGeometry(0.05, 0), C.flor, [-0.35 + (r() - 0.5) * 0.16, MY + 0.32 + r() * 0.08, mz - 0.35 + (r() - 0.5) * 0.16]));
    }
  }
  return fusionar(p);
}

// LA GENTE de la plaza (~1,7 m): campesino/a esbozado en low-poly entintado —
// ruana, sombrero aguadeño, canasto. NO rubber-hose: figura serena de lámina.
function geomPersona(seed, { ruana = C.ruanaRoja, falda = false, canasto = false, sombrero = true } = {}) {
  const r = prng(seed), p = [];
  const piel = r() > 0.45 ? C.piel : C.pielOscura;
  // piernas / falda
  if (falda) {
    p.push(pieza(new THREE.CylinderGeometry(0.17, 0.3, 0.78, 8), C.falda, [0, 0.39, 0]));
  } else {
    for (const sx of [-1, 1]) p.push(pieza(new THREE.CylinderGeometry(0.07, 0.09, 0.78, 6), C.ropa, [sx * 0.1, 0.39, 0]));
  }
  // torso + ruana (cae en campana sobre los hombros)
  p.push(pieza(new THREE.CylinderGeometry(0.16, 0.19, 0.55, 8), mezcla(C.ropa, '#b8b0a0', 0.3).getStyle(), [0, 1.02, 0]));
  p.push(pieza(new THREE.CylinderGeometry(0.09, 0.4, 0.52, 8), ruana, [0, 1.18, 0]));
  p.push(pieza(new THREE.CylinderGeometry(0.1, 0.13, 0.1, 8), mezcla(ruana, '#241812', 0.35).getStyle(), [0, 1.42, 0])); // cuello ruana
  // brazos que asoman bajo la ruana
  for (const sx of [-1, 1]) p.push(pieza(new THREE.CylinderGeometry(0.05, 0.055, 0.34, 5), piel, [sx * 0.24, 0.86, 0.02], [0, 0, sx * 0.18]));
  // cabeza + sombrero aguadeño (ala ancha clara + cinta oscura)
  p.push(pieza(new THREE.SphereGeometry(0.13, 9, 7), piel, [0, 1.55, 0]));
  if (sombrero) {
    p.push(pieza(new THREE.CylinderGeometry(0.25, 0.27, 0.03, 10), C.sombrero, [0, 1.64, 0]));
    p.push(pieza(new THREE.CylinderGeometry(0.12, 0.14, 0.12, 9), C.sombrero, [0, 1.7, 0]));
    p.push(pieza(new THREE.CylinderGeometry(0.135, 0.145, 0.045, 9), C.cinta, [0, 1.665, 0]));
  } else {
    p.push(pieza(new THREE.SphereGeometry(0.135, 9, 7, 0, Math.PI * 2, 0, Math.PI * 0.55), C.cinta, [0, 1.56, -0.01])); // pelo
  }
  // canasto al brazo (la compra del día)
  if (canasto) {
    p.push(pieza(new THREE.CylinderGeometry(0.17, 0.13, 0.2, 8), C.canasto, [0.32, 0.72, 0.05]));
    p.push(pieza(new THREE.TorusGeometry(0.13, 0.02, 5, 10, Math.PI), C.maderaVieja, [0.32, 0.83, 0.05], [0, 0, 0]));
    for (let i = 0; i < 3; i++) {
      p.push(pieza(new THREE.IcosahedronGeometry(0.055, 0), [C.tomate, C.maiz, C.hierba][i], [0.32 + (r() - 0.5) * 0.12, 0.85, 0.05 + (r() - 0.5) * 0.12]));
    }
  }
  return fusionar(p);
}

// LA GALLINA de plaza (suelta, picoteando el descache)
function geomGallina(seed) {
  const r = prng(seed), p = [];
  const tinte = r() > 0.5 ? '#b06a34' : '#e8e2d2';
  p.push(pieza(new THREE.SphereGeometry(0.14, 8, 6), tinte, [0, 0.18, 0], null, [1.25, 1, 0.9]));
  p.push(pieza(new THREE.ConeGeometry(0.09, 0.18, 5), mezcla(tinte, '#3a2c1c', 0.4).getStyle(), [-0.17, 0.26, 0], [0, 0, 0.9]));
  p.push(pieza(new THREE.SphereGeometry(0.07, 7, 5), tinte, [0.16, 0.32, 0]));
  p.push(pieza(new THREE.BoxGeometry(0.03, 0.06, 0.05), C.tomate, [0.16, 0.4, 0]));
  p.push(pieza(new THREE.ConeGeometry(0.025, 0.07, 4), C.zanahoria, [0.23, 0.31, 0], [0, 0, -Math.PI / 2]));
  for (const sz of [-1, 1]) p.push(pieza(new THREE.CylinderGeometry(0.012, 0.012, 0.12, 4), C.maiz, [0.02, 0.06, sz * 0.05]));
  return fusionar(p);
}

// (EL ÁRBOL DE LA PLAZA ya no se hornea a mano: es un roble negro ez-tree VIVO
//  creado con crearHeroe('roble_negro'); ver más abajo donde se planta. El viejo
//  geomArbolPlaza —domo esfera + lóbulos icosaedro, un lollipop— quedó eliminado
//  por la purga de árboles no-estándar, AUDIT-ARBOLES-HUMBOLDT.)

// EL PUEBLO ESBOZADO: casitas de cal y teja + la torre de la iglesia, en la
// niebla del fondo (+Z). Una sola malla — es telón, no lugar por recorrer.
function geomPueblo() {
  const p = [];
  const casitas = [
    [-34, 58, 0.4], [-18, 64, -0.2], [-4, 60, 0.15], [14, 63, -0.3], [30, 58, 0.5],
    [-26, 76, 0.1], [8, 78, -0.15], [24, 74, 0.35], [-8, 84, 0],
  ];
  for (const [cx, cz, rot] of casitas) {
    const cy = alturaMercado(cx, cz);
    const w = 3.4 + hash2(cx, cz) * 1.6, d = 2.8, h = 2.3;
    p.push(pieza(new THREE.BoxGeometry(w, h, d), hash2(cx, cz + 3) > 0.5 ? C.cal : C.muro, [cx, cy + h / 2, cz], [0, rot, 0]));
    p.push(pieza(new THREE.ConeGeometry(w * 0.72, 1.15, 4), hash2(cx + 5, cz) > 0.5 ? C.teja : C.tejaVieja, [cx, cy + h + 0.55, cz], [0, rot + Math.PI / 4, 0]));
    p.push(pieza(new THREE.BoxGeometry(0.6, 1.15, 0.08), C.maderaVieja, [cx + Math.sin(rot) * 0.4, cy + 0.58, cz - Math.cos(rot) * (d / 2 + 0.02)], [0, rot, 0]));
  }
  // la iglesia: nave + torre con su campanario y cruz (la silueta del pueblo)
  const ix = -2, iz = 96, iy = alturaMercado(ix, iz);
  p.push(pieza(new THREE.BoxGeometry(7, 4.6, 11), C.cal, [ix, iy + 2.3, iz]));
  p.push(pieza(new THREE.ConeGeometry(5.1, 2.2, 4), C.teja, [ix, iy + 5.7, iz], [0, Math.PI / 4, 0], [1, 1, 1.55]));
  p.push(pieza(new THREE.BoxGeometry(2.6, 8.5, 2.6), C.cal, [ix - 4.6, iy + 4.25, iz - 3]));
  p.push(pieza(new THREE.BoxGeometry(1.7, 1.4, 1.7), '#443626', [ix - 4.6, iy + 7.7, iz - 3]));     // hueco del campanario
  p.push(pieza(new THREE.ConeGeometry(2.1, 1.8, 4), C.tejaVieja, [ix - 4.6, iy + 9.4, iz - 3], [0, Math.PI / 4, 0]));
  p.push(pieza(new THREE.BoxGeometry(0.12, 1.1, 0.12), C.cal, [ix - 4.6, iy + 10.8, iz - 3]));
  p.push(pieza(new THREE.BoxGeometry(0.62, 0.12, 0.12), C.cal, [ix - 4.6, iy + 10.95, iz - 3]));
  return fusionar(p);
}

// LOS BANDERINES de día de mercado: triángulos de color colgando en catenaria
// entre postes — la fiesta serena de la plaza (Ghibli).
function geomBanderines() {
  const p = [];
  const tintes = [C.toldoRojo, C.toldoOcre, C.toldoVerde, C.toldoAzul, C.lona];
  const cuerdas = [
    { a: [-9.5, -3], b: [9.5, -2], h: 3.5 },
    { a: [9.5, 11.5], b: [-9.5, 12.5], h: 3.6 },
  ];
  for (const [ci, cu] of cuerdas.entries()) {
    const ya = alturaMercado(cu.a[0], cu.a[1]) + cu.h, yb = alturaMercado(cu.b[0], cu.b[1]) + cu.h;
    // postes de los extremos
    for (const [pt, py] of [[cu.a, ya], [cu.b, yb]]) {
      p.push(pieza(new THREE.CylinderGeometry(0.045, 0.06, cu.h + 0.25, 6), C.madera,
        [pt[0], py - (cu.h + 0.25) / 2 + 0.25, pt[1]]));
    }
    const N = 16;
    for (let i = 0; i <= N; i++) {
      const t = i / N;
      const x = cu.a[0] + (cu.b[0] - cu.a[0]) * t, z = cu.a[1] + (cu.b[1] - cu.a[1]) * t;
      const y = ya + (yb - ya) * t - Math.sin(t * Math.PI) * 0.55;     // comba de la cuerda
      if (i < N) {
        const x2 = cu.a[0] + (cu.b[0] - cu.a[0]) * ((i + 1) / N), z2 = cu.a[1] + (cu.b[1] - cu.a[1]) * ((i + 1) / N);
        const seg = new THREE.CylinderGeometry(0.012, 0.012, Math.hypot(x2 - x, z2 - z) + 0.02, 3);
        p.push(pieza(seg, C.cinta, [(x + x2) / 2, y, (z + z2) / 2], [0, Math.atan2(x2 - x, z2 - z), Math.PI / 2 - 0.06]));
      }
      if (i > 0 && i < N) {
        p.push(pieza(new THREE.CircleGeometry(0.19, 3), tintes[(i + ci) % tintes.length], [x, y - 0.2, z], [0, ci ? Math.PI : 0, Math.PI]));
      }
    }
  }
  return fusionar(p);
}

// ═══════════════════════════════════════════════════════════════════════════
export function initMercado() {
  const params = new URLSearchParams(location.search);
  const camModo = params.get('cam');          // `hero`/`puestos`/`bascula` = cuadros fijos del gate

  // ── SUPRIMIR EL VALLE (main.js corre detrás) ────────────────────────────────
  const sup = document.createElement('style');
  sup.textContent =
    'body.enMercado #c,body.enMercado #onb,body.enMercado #load,body.enMercado #hud,' +
    'body.enMercado #capaLugares,body.enMercado #barraMover,body.enMercado #guiaSel,' +
    'body.enMercado #guiaV,body.enMercado #ventanaM,body.enMercado #compaiFotoBtn{display:none!important}' +
    'body.enMercado{background:#12100a}';
  document.head.appendChild(sup);
  document.body.classList.add('enMercado');
  const pararValle = () => { try { window.__r && window.__r.setAnimationLoop(null); } catch (e) { /* aún no */ } };
  pararValle(); setTimeout(pararValle, 300); setTimeout(pararValle, 1200);

  // ── CANVAS + RENDERER PROPIOS ───────────────────────────────────────────────
  const canvas = document.createElement('canvas'); canvas.id = 'cMercado';
  canvas.style.cssText = 'position:fixed;inset:0;width:100vw;height:100vh;display:block;z-index:20;touch-action:none';
  document.body.appendChild(canvas);
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.setSize(innerWidth, innerHeight);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.2;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  window.__r = renderer;                        // hook del gate (draw calls + renderer)
  window.__rMercado = renderer;

  const scene = new THREE.Scene();
  scene.background = cieloMercado();
  scene.fog = new THREE.FogExp2(0xe0e3d0, 0.0035);   // niebla crema: el pueblo se esboza, la plaza se lee

  const camera = new THREE.PerspectiveCamera(56, innerWidth / innerHeight, 0.4, 1200);
  window.__cam = camera; window.__scene = scene;
  window.__h = alturaMercado;                   // sonda del gate

  const raiz = new THREE.Group(); scene.add(raiz);

  // ── LUZ: mañana de mercado (sol claro + relleno frío del valle) ─────────────
  scene.add(new THREE.HemisphereLight(0xe8e4ce, 0x54503e, 0.85));
  const sol = new THREE.DirectionalLight(0xffe8b8, 1.7);
  sol.position.set(-80, 100, 50); scene.add(sol);
  const relleno = new THREE.DirectionalLight(0x9fc0cf, 0.35);
  relleno.position.set(70, 40, -60); scene.add(relleno);

  // ── EL SUELO: potrero + plaza EMPEDRADA + camino de herradura ───────────────
  raiz.add(construirSuelo());
  raiz.add(construirEmpedrado());   // el mosaico de piedra en alta resolución

  // ── EL DESCARGUE: la carga que acaba de bajar del monte (primer plano) ──────
  const desc = [];
  costal(desc, 0, 0, 0, 61, C.fique, 0.9); costal(desc, 0.65, 0.35, 0, 62, C.fique, 0.82); costal(desc, 0.22, -0.58, 0, 63, C.fiqueOscuro, 0.88);
  guacal(desc, -0.75, 0.2, 0, C.tomate, 8, 0.085, 64);
  guacal(desc, -0.8, 0.75, 0, C.maiz, 6, 0.08, 65);
  guacal(desc, -0.78, 0.48, 0.3, C.naranja, 6, 0.085, 66);   // guacal apilado
  const descargue = new THREE.Mesh(fusionar(desc), MAT);
  const dY = alturaMercado(4.2, -7);
  descargue.position.set(4.2, dY, -7); descargue.rotation.y = 0.65;
  raiz.add(descargue);
  raiz.add(sombraPlano(1.9, 4.2, dY + 0.07, -7));

  // ── LOS PUESTOS: dos hileras mirando a la calle del mercado ─────────────────
  const PUESTOS = [
    // la hilera izquierda mira a +X (la calle); la derecha a -X
    { tipo: 'cafe', x: -8.6, z: -2, rot: Math.PI / 2, toldo: C.toldoRojo },
    { tipo: 'hortaliza', x: -8.9, z: 6, rot: Math.PI / 2, toldo: C.toldoVerde },
    { tipo: 'fruta', x: -8.6, z: 14, rot: Math.PI / 2, toldo: C.toldoOcre },
    { tipo: 'hierbas', x: -8.9, z: 22, rot: Math.PI / 2, toldo: C.toldoAzul },
    { tipo: 'papa', x: 8.6, z: 0, rot: -Math.PI / 2, toldo: C.toldoOcre },
    { tipo: 'maiz', x: 8.9, z: 8, rot: -Math.PI / 2, toldo: C.toldoAzul },
    { tipo: 'huevos', x: 8.6, z: 16, rot: -Math.PI / 2, toldo: C.toldoRojo },
  ];
  for (const [i, P] of PUESTOS.entries()) {
    const y = alturaMercado(P.x, P.z);
    const m = new THREE.Mesh(geomPuesto(P.tipo, P.toldo, 900 + i * 31), MAT);
    m.position.set(P.x, y, P.z); m.rotation.y = P.rot;
    raiz.add(m);
    raiz.add(sombraPlano(2.6, P.x, y + 0.05, P.z));
  }

  // ── LA TARIMA DE LA BÁSCULA (el precio justo, clickable) ────────────────────
  const bascula = construirBascula();
  raiz.add(bascula.group);

  // ── EL LETRERO DE PROCEDENCIA (el origen es el sello) ───────────────────────
  raiz.add(construirLetrero());

  // ── EL ÁRBOL DE LA PLAZA con sus bancas ─────────────────────────────────────
  // roble negro ez-tree VIVO (Quercus humboldtii), escalado a la altura de plaza
  // (~9 m) con la disciplina Box3 (mide la altura natural, no la adivina).
  const aX = -18, aZ = 27, aY = alturaMercado(aX, aZ);
  const arbol = crearHeroe('roble_negro');
  {
    const box = new THREE.Box3().setFromObject(arbol);
    const alturaNatural = Math.max(0.001, box.max.y - box.min.y);
    const k = 9 / alturaNatural;
    arbol.scale.setScalar(k);
    arbol.rotation.y = Math.random() * Math.PI * 2;
  }
  arbol.position.set(aX, aY, aZ); raiz.add(arbol);
  raiz.add(sombraPlano(6.5, aX, aY + 0.06, aZ));
  for (const [bx, bz, br] of [[aX + 4.2, aZ - 1.5, 0.5], [aX + 1, aZ + 4.6, -0.9]]) {
    const banca = new THREE.Mesh(fusionar([
      pieza(new THREE.BoxGeometry(1.7, 0.07, 0.4), C.tabla, [0, 0.45, 0]),
      pieza(new THREE.BoxGeometry(0.09, 0.45, 0.4), C.maderaVieja, [-0.7, 0.22, 0]),
      pieza(new THREE.BoxGeometry(0.09, 0.45, 0.4), C.maderaVieja, [0.7, 0.22, 0]),
    ]), MAT);
    banca.position.set(bx, alturaMercado(bx, bz), bz); banca.rotation.y = br;
    raiz.add(banca);
  }

  // ── LOS BANDERINES cruzando la calle ────────────────────────────────────────
  raiz.add(new THREE.Mesh(geomBanderines(), MAT));

  // ── EL PUEBLO en la niebla (+Z) ─────────────────────────────────────────────
  raiz.add(new THREE.Mesh(geomPueblo(), MAT));

  // ── LA GENTE: vendedores tras el mesón + compradores por la calle ───────────
  const gente = construirGente();
  raiz.add(gente.group);

  // ── LA MULA CARGADA que baja del monte con su arriero (la cadena corta) ─────
  const mula = construirMula();
  raiz.add(mula.group);

  // ── GALLINAS sueltas picoteando el descache ─────────────────────────────────
  const gallinas = construirGallinas();
  raiz.add(gallinas.group);

  // ── polvo dorado de la mañana ───────────────────────────────────────────────
  const motas = construirMotas();
  raiz.add(motas.points);

  // ── CÁMARA: intro que baja por el camino de herradura hasta la plaza ────────
  const OJO = 1.65;
  const gHero = alturaMercado(10, -13);
  const HERO_POS = new THREE.Vector3(10, gHero + OJO + 1.15, -13);
  const HERO_TGT = new THREE.Vector3(-1.5, gHero + 1.0, 17);

  const controls = new OrbitControls(camera, canvas);
  controls.enableDamping = true; controls.dampingFactor = 0.08;
  controls.minDistance = 4; controls.maxDistance = 200;
  controls.maxPolarAngle = 1.52;
  controls.target.copy(HERO_TGT);
  controls.enabled = false;
  window.__ctl = controls;

  let introDone = false, introStart = null;
  const introPos = new THREE.CatmullRomCurve3([
    new THREE.Vector3(caminoX(-110) + 8, alturaMercado(caminoX(-110), -110) + 42, -110),
    new THREE.Vector3(caminoX(-70) + 6, alturaMercado(caminoX(-70), -70) + 18, -70),
    new THREE.Vector3(caminoX(-40) + 8, alturaMercado(caminoX(-40), -40) + 7, -40),
    HERO_POS.clone(),
  ]);
  const introTgt = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0, alturaMercado(0, 10) + 4, 10),
    new THREE.Vector3(0, alturaMercado(0, 10) + 3, 10),
    HERO_TGT.clone(), HERO_TGT.clone(),
  ]);
  const INTRO_S = 7;

  function darControl() {
    if (controls.enabled) return;
    camera.position.copy(HERO_POS); controls.target.copy(HERO_TGT);
    controls.enabled = true; controls.update();
  }
  function endIntro() { if (introDone) return; introDone = true; darControl(); avisar(); }
  function mano() { if (!introDone) endIntro(); }
  addEventListener('pointerdown', mano); addEventListener('keydown', mano); addEventListener('wheel', mano, { passive: true });

  // cuadros fijos deterministas para el gate visual
  if (camModo === 'hero') {
    introDone = true; camera.position.copy(HERO_POS); camera.lookAt(HERO_TGT);
  } else if (camModo === 'puestos') {
    // la hilera de toldos de cerca: la cosecha sobre el mesón
    introDone = true;
    const gy = alturaMercado(0, 8);
    camera.position.set(1.5, gy + 2.1, 8);
    camera.lookAt(-8.8, gy + 1.2, 9);
  } else if (camModo === 'bascula') {
    // la tarima del precio justo de cerca
    introDone = true;
    const gy = alturaMercado(0, 26);
    camera.position.set(4.2, gy + 2.4, 20.5);
    camera.lookAt(0, gy + 1.5, 27);
  } else if (params.get('onb') === '0') {
    // lanzamiento directo (y el gate): sin vuelo de intro — al cuadro hero,
    // con los controles ya vivos (determinista para la captura).
    introDone = true;
    darControl();
  } else {
    camera.position.copy(introPos.getPoint(0)); camera.lookAt(introTgt.getPoint(0));
  }

  // ── HUD: la leyenda DEL FRUTO AL INGRESO (instruccional, en usted) ──────────
  montarLeyenda();
  const avisar = montarAvisoYSalida();

  // ── raycast a la báscula → la lección del precio justo ──────────────────────
  const ray = new THREE.Raycaster(), pt = new THREE.Vector2();
  let dx0 = 0, dy0 = 0, dt0 = 0;
  canvas.addEventListener('pointerdown', (e) => { dx0 = e.clientX; dy0 = e.clientY; dt0 = performance.now(); });
  canvas.addEventListener('pointerup', (e) => {
    if (Math.hypot(e.clientX - dx0, e.clientY - dy0) > 9 || performance.now() - dt0 > 600) return;
    pt.x = (e.clientX / innerWidth) * 2 - 1; pt.y = -(e.clientY / innerHeight) * 2 + 1;
    ray.setFromCamera(pt, camera);
    if (ray.intersectObject(bascula.group, true).length) tarjetaBascula();
  });

  // ── POST: bloom suave (los toldos y la cosecha a la luz de la mañana) ───────
  const composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene, camera));
  composer.addPass(new UnrealBloomPass(new THREE.Vector2(innerWidth, innerHeight), 0.24, 0.7, 0.88));
  composer.addPass(new OutputPass());

  addEventListener('resize', () => {
    camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix();
    renderer.setSize(innerWidth, innerHeight); composer.setSize(innerWidth, innerHeight);
  });

  const loadEl = document.getElementById('load');
  if (loadEl) { loadEl.style.opacity = 0; setTimeout(() => loadEl.remove(), 700); }

  // ── LOOP ────────────────────────────────────────────────────────────────────
  const clock = new THREE.Clock();
  renderer.setAnimationLoop(() => {
    const t = clock.getElapsedTime();
    if (!introDone && camModo !== 'hero') {
      if (introStart === null) introStart = t;
      const k = Math.min((t - introStart) / INTRO_S, 1);
      const e = k * k * k * (k * (k * 6 - 15) + 10);   // smootherstep
      introPos.getPoint(e, camera.position);
      const tg = introTgt.getPoint(e); camera.lookAt(tg);
      if (k >= 1) endIntro();
    } else if (controls.enabled) {
      controls.update();
    }
    bascula.update(t);
    gente.update(t);
    mula.update(t);
    gallinas.update(t);
    motas.update(t);
    composer.render();
  });

  window.__mercado = { scene, camera, renderer, controls, bascula };
  return window.__mercado;
}

// ── CIELO de mañana de mercado (celeste que baja a crema dorado) ──────────────
function cieloMercado() {
  const cv = document.createElement('canvas'); cv.width = 16; cv.height = 512;
  const c = cv.getContext('2d');
  const g = c.createLinearGradient(0, 0, 0, 512);
  g.addColorStop(0.00, C.cieloCenit);
  g.addColorStop(0.45, C.cieloMedio);
  g.addColorStop(0.78, C.niebla);
  g.addColorStop(1.00, C.cieloHorizonte);
  c.fillStyle = g; c.fillRect(0, 0, 16, 512);
  const tx = new THREE.CanvasTexture(cv); tx.colorSpace = THREE.SRGBColorSpace;
  return tx;
}

// ── EL SUELO: heightfield con plaza empedrada + camino, color por vértice ─────
function construirSuelo() {
  const SIZE = 460, SEG = 130;
  const geo = new THREE.PlaneGeometry(SIZE, SIZE, SEG, SEG);
  geo.rotateX(-Math.PI / 2);
  const pos = geo.attributes.position;
  const colr = new Float32Array(pos.count * 3);
  const pasto = mezcla(C.pasto, C.pastoSombra, 0.25), seco = col(C.pastoSeco), sombra = col(C.pastoSombra);
  const piedra = col(C.piedra), piedraC = col(C.piedraClara), piedraS = col(C.piedraSombra);
  const tierra = col(C.tierra), roja = col(C.tierraRoja);
  const tmp = new THREE.Color();
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), z = pos.getZ(i);
    pos.setY(i, alturaMercado(x, z));
    const dPlaza = Math.hypot(x - PLAZA.x, z - PLAZA.z);
    const dCam = z < PLAZA.z ? Math.abs(x - caminoX(z)) : 99;
    if (dPlaza < PLAZA.r) {
      // EMPEDRADO: celdas de piedra con junta oscura (mosaico por hash)
      const cel = hash2(Math.floor(x / 1.5), Math.floor(z / 1.5));
      tmp.copy(piedra).lerp(piedraC, cel * 0.55);
      if (hash2(Math.floor(x / 1.5) + 7, Math.floor(z / 1.5)) < 0.22) tmp.lerp(piedraS, 0.5);
      if (dPlaza > PLAZA.r - 2.2) tmp.lerp(piedraS, 0.4);     // el borde de la explanada
    } else if (dCam < 2.8) {
      // el camino de herradura: tierra pisada APAGADA (no lava), orillas suaves
      tmp.copy(tierra).lerp(pasto, 0.3);
      tmp.lerp(roja, fbm(x * 0.08, z * 0.08) * 0.25);
      if (dCam > 1.6) tmp.lerp(pasto, (dCam - 1.6) * 0.7);
    } else {
      tmp.copy(pasto);
      const k = fbm(x * 0.045 + 3, z * 0.045 - 8);
      if (k > 0.55) tmp.lerp(seco, (k - 0.55) * 1.5);
      if (fbm(x * 0.09, z * 0.09) < 0.32) tmp.lerp(sombra, 0.4);
      if (dPlaza < PLAZA.r + 3) tmp.lerp(piedra, (PLAZA.r + 3 - dPlaza) * 0.12);
    }
    colr[i * 3] = tmp.r; colr[i * 3 + 1] = tmp.g; colr[i * 3 + 2] = tmp.b;
  }
  geo.setAttribute('color', new THREE.BufferAttribute(colr, 3));
  geo.computeVertexNormals();
  return new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 1, flatShading: false }));
}

// ── EL EMPEDRADO en alta resolución: TEXTURA pintada (canvas), no color por
//    vértice — el heightfield no alcanza a dibujar piedra de 1,5 m (3,5 m por
//    vértice) y el disco por vértice tampoco: la junta se emborrona. La piedra
//    se pinta nítida en un canvas y la malla solo pone el relieve.
function empedradoTex(S) {
  const px = 1024;
  const cv = document.createElement('canvas'); cv.width = cv.height = px;
  const c = cv.getContext('2d');
  c.fillStyle = '#6f695f'; c.fillRect(0, 0, px, px);      // la junta (fondo)
  const NC = Math.round(S / 1.15);                         // piedras de ~1,15 m
  const cel = px / NC;
  const tintes = ['#9b9489', '#a89f90', '#b3aa99', '#8b8478', '#a19788'];
  for (let i = 0; i < NC; i++) {
    for (let j = 0; j < NC; j++) {
      const h = hash2(i * 3 + 1, j * 5 + 2);
      const tinte = tintes[Math.floor(h * tintes.length)];
      c.fillStyle = hash2(i + 7, j) < 0.16 ? '#7c766c' : tinte;
      const jx = (hash2(i, j + 9) - 0.5) * cel * 0.14, jy = (hash2(i + 4, j) - 0.5) * cel * 0.14;
      const inset = 1.5 + hash2(i + 2, j + 6) * 2;
      const x0 = i * cel + inset + jx, y0 = j * cel + inset + jy;
      const w = cel - inset * 2, hh = cel - inset * 2;
      const rr = cel * 0.22;
      c.beginPath();
      c.moveTo(x0 + rr, y0); c.lineTo(x0 + w - rr, y0); c.quadraticCurveTo(x0 + w, y0, x0 + w, y0 + rr);
      c.lineTo(x0 + w, y0 + hh - rr); c.quadraticCurveTo(x0 + w, y0 + hh, x0 + w - rr, y0 + hh);
      c.lineTo(x0 + rr, y0 + hh); c.quadraticCurveTo(x0, y0 + hh, x0, y0 + hh - rr);
      c.lineTo(x0, y0 + rr); c.quadraticCurveTo(x0, y0, x0 + rr, y0);
      c.fill();
    }
  }
  // manchas de uso (el paso de años de mercado)
  c.globalAlpha = 0.1; c.fillStyle = '#4e483e';
  for (let i = 0; i < 26; i++) {
    const x = hash2(i, 3) * px, y = hash2(i, 8) * px, r = 40 + hash2(i, 5) * 120;
    c.beginPath(); c.arc(x, y, r, 0, Math.PI * 2); c.fill();
  }
  c.globalAlpha = 1;
  const tx = new THREE.CanvasTexture(cv);
  tx.colorSpace = THREE.SRGBColorSpace; tx.anisotropy = 4;
  return tx;
}
function construirEmpedrado() {
  const R = 26.2, S = R * 2 + 2, SEG = 64;
  const geo = new THREE.PlaneGeometry(S, S, SEG, SEG);
  geo.rotateX(-Math.PI / 2);
  geo.translate(PLAZA.x, 0, PLAZA.z);
  const pos = geo.attributes.position;
  const colr = new Float32Array(pos.count * 3);
  const tmp = new THREE.Color();
  const oscura = col(C.piedraSombra);
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), z = pos.getZ(i);
    const d = Math.hypot(x - PLAZA.x, z - PLAZA.z);
    if (d > R) {
      pos.setY(i, alturaMercado(x, z) - 0.6);         // el borde se esconde bajo el potrero
      tmp.copy(oscura);
    } else {
      pos.setY(i, alturaMercado(x, z) + 0.03);
      tmp.set(1, 1, 1);
      if (d > R - 2.5) tmp.lerp(oscura, (d - (R - 2.5)) * 0.18);   // el borde pisado
    }
    colr[i * 3] = tmp.r; colr[i * 3 + 1] = tmp.g; colr[i * 3 + 2] = tmp.b;
  }
  geo.setAttribute('color', new THREE.BufferAttribute(colr, 3));
  geo.computeVertexNormals();
  return new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ map: empedradoTex(S), vertexColors: true, roughness: 1, flatShading: false }));
}

// ── LA BÁSCULA DE PLATILLOS en su tarima (el altar sereno del trato parejo) ───
function construirBascula() {
  const g = new THREE.Group();
  const bx = 0, bz = 27, by = alturaMercado(bx, bz);
  g.position.set(bx, by, bz);
  const matMad = new THREE.MeshStandardMaterial({ color: col(C.madera), roughness: 1, flatShading: true });
  const matMadC = new THREE.MeshStandardMaterial({ color: col(C.tabla), roughness: 1, flatShading: true });
  const matMetal = new THREE.MeshStandardMaterial({ color: col('#7a6f52'), roughness: 0.5, metalness: 0.5, flatShading: true });

  // la tarima (3×3 m, 0,4 m de alto, tablas a la vista)
  const tarima = new THREE.Mesh(new THREE.BoxGeometry(3.2, 0.4, 3.2), matMad);
  tarima.position.y = 0.2; g.add(tarima);
  for (let i = 0; i < 5; i++) {
    const tb = new THREE.Mesh(new THREE.BoxGeometry(0.58, 0.03, 3.2), matMadC);
    tb.position.set(-1.28 + i * 0.64, 0.42, 0); g.add(tb);
  }
  // columna + brazo que se balancea con sus dos platillos colgados
  const base = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.3, 0.1, 10), matMetal);
  base.position.y = 0.48; g.add(base);
  const columna = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.07, 1.1, 8), matMetal);
  columna.position.y = 1.0; g.add(columna);
  const brazoG = new THREE.Group(); brazoG.position.y = 1.56; g.add(brazoG);
  const brazo = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.06, 0.06), matMetal);
  brazoG.add(brazo);
  const fiel = new THREE.Mesh(new THREE.ConeGeometry(0.05, 0.28, 5), matMetal);
  fiel.position.y = 0.16; brazoG.add(fiel);
  const cuelgas = [];
  for (const sx of [-1, 1]) {
    const hang = new THREE.Group(); hang.position.set(sx * 0.72, 0, 0); brazoG.add(hang); cuelgas.push(hang);
    for (const a of [0, 2.1, 4.2]) {
      const cuerda = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.42, 3), matMad);
      cuerda.position.set(Math.cos(a) * 0.14, -0.21, Math.sin(a) * 0.14);
      cuerda.rotation.z = Math.cos(a) * 0.32; cuerda.rotation.x = -Math.sin(a) * 0.32;
      hang.add(cuerda);
    }
    const platillo = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.2, 0.05, 12), matMetal);
    platillo.position.y = -0.44; hang.add(platillo);
    if (sx < 0) {
      // las pesas patronas
      for (const [px, pr, ph] of [[-0.06, 0.055, 0.1], [0.07, 0.04, 0.07]]) {
        const pesa = new THREE.Mesh(new THREE.CylinderGeometry(pr, pr * 1.15, ph, 8), matMetal);
        pesa.position.set(px, -0.44 + ph / 2 + 0.03, 0.02); hang.add(pesa);
      }
    } else {
      // lo pesado: papas de la cosecha
      const matPapa = new THREE.MeshStandardMaterial({ color: col(C.papa), roughness: 1, flatShading: true });
      for (const [px, pz] of [[-0.05, 0.04], [0.07, -0.03], [0.0, -0.09]]) {
        const papa = new THREE.Mesh(new THREE.IcosahedronGeometry(0.07, 0), matPapa);
        papa.position.set(px, -0.38, pz); hang.add(papa);
      }
    }
  }
  // el tablero del PRECIO JUSTO sobre dos parales, detrás de la báscula,
  // MIRANDO a la calle del mercado (-Z): si no, se lee espejado
  const tablero = new THREE.Mesh(new THREE.PlaneGeometry(2.0, 1.0),
    new THREE.MeshBasicMaterial({ map: tableroTex(), side: THREE.DoubleSide }));
  tablero.position.set(0, 2.35, -1.35); tablero.rotation.y = Math.PI; g.add(tablero);
  for (const sx of [-1, 1]) {
    const paral = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.06, 2.6, 6), matMad);
    paral.position.set(sx * 0.95, 1.3, -1.35); g.add(paral);
  }
  // bulto recién pesado al pie de la tarima
  const matFique = new THREE.MeshStandardMaterial({ color: col(C.fique), roughness: 1, flatShading: true });
  const bulto = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.44, 0.9, 8), matFique);
  bulto.position.set(1.9, 0.45, 0.8); bulto.rotation.z = 0.12; g.add(bulto);

  const update = (t) => {
    const sw = Math.sin(t * 0.55) * 0.045 - 0.03;      // el fiel casi parejo (pesa bien)
    brazoG.rotation.z = sw;
    cuelgas.forEach((h) => { h.rotation.z = -sw; });   // los platillos cuelgan a plomo
  };
  return { group: g, update };
}

// ── EL LETRERO DE PROCEDENCIA (tabla en dos parales, junto a la tarima) ───────
function construirLetrero() {
  const g = new THREE.Group();
  const lx = 5.6, lz = 26.4, ly = alturaMercado(lx, lz);
  g.position.set(lx, ly, lz); g.rotation.y = -0.5;
  const matMad = new THREE.MeshStandardMaterial({ color: col(C.maderaVieja), roughness: 1, flatShading: true });
  for (const sx of [-1, 1]) {
    const paral = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.07, 2.2, 6), matMad);
    paral.position.set(sx * 1.05, 1.1, 0); g.add(paral);
  }
  const tabla = new THREE.Mesh(new THREE.PlaneGeometry(2.3, 1.6),
    new THREE.MeshBasicMaterial({ map: letreroTex(), side: THREE.DoubleSide }));
  tabla.position.set(0, 1.45, 0.045); g.add(tabla);
  const marco = new THREE.Mesh(new THREE.BoxGeometry(2.42, 1.72, 0.07), matMad);
  marco.position.set(0, 1.45, 0); g.add(marco);
  return g;
}

// ── LA GENTE: vendedores quietos (bob) + compradores que caminan la calle ─────
function construirGente() {
  const g = new THREE.Group();
  const quietos = [];
  const RUANAS = [C.ruanaRoja, C.ruanaAzul, C.ruanaVerde, C.ruanaCafe];
  // vendedores tras cada mesón (mirando a la calle)
  const vendedores = [
    [-10.4, -2, Math.PI / 2, 0], [-10.7, 6, Math.PI / 2, 1], [-10.4, 14, Math.PI / 2, 2], [-10.7, 22, Math.PI / 2, 3],
    [10.4, 0, -Math.PI / 2, 1], [10.7, 8, -Math.PI / 2, 2], [10.4, 16, -Math.PI / 2, 0],
  ];
  for (const [i, [x, z, rot, ri]] of vendedores.entries()) {
    const m = new THREE.Mesh(geomPersona(500 + i * 17, { ruana: RUANAS[ri], falda: i % 3 === 1, sombrero: i % 4 !== 2 }), MAT);
    m.position.set(x, alturaMercado(x, z), z); m.rotation.y = rot;
    g.add(m); quietos.push({ m, f: i * 1.7 });
  }
  // corrillos parados charlando + uno mirando la báscula
  const parados = [
    [-2.6, 2.6, 0.9, 0, true], [-1.8, 3.3, -2.3, 1, false],
    [3.1, 17.2, -0.8, 2, true], [3.8, 16.5, 2.2, 3, false],
    [-1.8, 23.8, 0.5, 1, false],   // mirando la báscula, sin tapar la cámara de detalle
  ];
  for (const [i, [x, z, rot, ri, canasto]] of parados.entries()) {
    const m = new THREE.Mesh(geomPersona(700 + i * 23, { ruana: RUANAS[ri], falda: i % 2 === 0, canasto, sombrero: i !== 3 }), MAT);
    m.position.set(x, alturaMercado(x, z), z); m.rotation.y = rot;
    g.add(m); quietos.push({ m, f: 2 + i * 1.3 });
  }
  // compradores que recorren la calle del mercado (ida y vuelta)
  const andantes = [];
  const rutas = [
    { x: -1.3, z0: -12, z1: 22, v: 0.55, f: 0, ri: 2, canasto: true },
    { x: 1.6, z0: 24, z1: -10, v: 0.5, f: 9, ri: 3, canasto: false },
    { x: 0.2, z0: -6, z1: 20, v: 0.62, f: 21, ri: 0, canasto: true },
  ];
  for (const [i, R] of rutas.entries()) {
    const m = new THREE.Mesh(geomPersona(820 + i * 31, { ruana: RUANAS[R.ri], falda: i === 1, canasto: R.canasto }), MAT);
    g.add(m); andantes.push({ m, ...R });
  }
  const update = (t) => {
    for (const q of quietos) {
      q.m.position.y = alturaMercado(q.m.position.x, q.m.position.z) + Math.sin(t * 1.1 + q.f) * 0.015;
      q.m.rotation.y += Math.sin(t * 0.4 + q.f) * 0.0006;   // se gira apenas (charla)
    }
    for (const a of andantes) {
      const L = Math.abs(a.z1 - a.z0);
      const ph = ((t * a.v + a.f) % (2 * L)); // ida y vuelta
      const s = ph < L ? ph : 2 * L - ph;
      const z = a.z0 + Math.sign(a.z1 - a.z0) * s;
      a.m.position.set(a.x, alturaMercado(a.x, z) + Math.abs(Math.sin(t * 4 + a.f)) * 0.03, z);
      a.m.rotation.y = (ph < L ? 1 : -1) * Math.sign(a.z1 - a.z0) > 0 ? 0 : Math.PI;
    }
  };
  return { group: g, update };
}

// ── LA MULA CAFETERA cargada + su arriero, bajando el camino (loop lejano) ────
function construirMula() {
  const g = new THREE.Group();
  const mulaG = new THREE.Group(); g.add(mulaG);
  // cuerpo + cuello + cabeza + orejas largas (la firma mula) + carga de costales
  const cuerpo = new THREE.Mesh(fusionar([
    pieza(new THREE.SphereGeometry(0.42, 10, 7), C.mula, [0, 1.02, 0], null, [1.55, 0.95, 0.8]),
    pieza(new THREE.SphereGeometry(0.3, 8, 6), C.mulaPanza, [0, 0.9, 0], null, [1.5, 0.8, 0.75]),
    pieza(new THREE.CylinderGeometry(0.13, 0.17, 0.62, 6), C.mula, [0.62, 1.32, 0], [0, 0, -0.7]),
    pieza(new THREE.BoxGeometry(0.42, 0.2, 0.18), C.mula, [0.95, 1.55, 0]),
    pieza(new THREE.BoxGeometry(0.18, 0.14, 0.14), C.mulaPanza, [1.13, 1.5, 0]),
    pieza(new THREE.ConeGeometry(0.05, 0.24, 4), C.mula, [0.82, 1.75, 0.07], [0, 0, 0.15]),
    pieza(new THREE.ConeGeometry(0.05, 0.24, 4), C.mula, [0.82, 1.75, -0.07], [0, 0, -0.15]),
    pieza(new THREE.CylinderGeometry(0.02, 0.03, 0.5, 4), C.crin, [-0.68, 0.85, 0], [0, 0, 0.25]),
    // enjalma + los dos costales de café a los flancos
    pieza(new THREE.BoxGeometry(0.6, 0.1, 0.55), C.ruanaRoja, [0, 1.42, 0]),
    pieza(new THREE.CylinderGeometry(0.2, 0.23, 0.6, 7), C.fique, [0.05, 1.32, 0.42], [Math.PI / 2 - 0.25, 0, 0.3]),
    pieza(new THREE.CylinderGeometry(0.2, 0.23, 0.6, 7), C.fiqueOscuro, [0.05, 1.32, -0.42], [Math.PI / 2 + 0.25, 0, 0.3]),
  ]), MAT);
  mulaG.add(cuerpo);
  // patas (separadas: caminan)
  const patas = [];
  const matMula = new THREE.MeshStandardMaterial({ color: col(C.mula), roughness: 1, flatShading: true });
  for (const [px, pz] of [[0.42, 0.2], [0.42, -0.2], [-0.42, 0.2], [-0.42, -0.2]]) {
    const pata = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.045, 0.8, 5), matMula);
    pata.geometry.translate(0, -0.4, 0);
    pata.position.set(px, 0.82, pz); mulaG.add(pata); patas.push(pata);
  }
  const sombra = sombraPlano(1.3, 0, 0.06, 0); mulaG.add(sombra);
  // el arriero adelante, con su bordón
  const arriero = new THREE.Mesh(geomPersona(950, { ruana: C.ruanaCafe }), MAT);
  g.add(arriero);
  const bordon = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.03, 1.5, 5),
    new THREE.MeshStandardMaterial({ color: col(C.maderaVieja), roughness: 1 }));
  g.add(bordon);

  const Z0 = -108, Z1 = -16, V = 1.15;   // baja del monte a la boca de la plaza
  const update = (t) => {
    const s = (t * V) % (Z1 - Z0);
    const z = Z0 + s, x = caminoX(z);
    const y = alturaMercado(x, z);
    const zA = Math.min(z + 2.2, Z1 + 2), xA = caminoX(zA), yA = alturaMercado(xA, zA);
    // orientación: mirando ladera abajo (+Z), siguiendo la curva del camino
    const dirA = Math.atan2(caminoX(z + 1) - x, 1);
    mulaG.position.set(x, y, z);
    mulaG.rotation.y = dirA - Math.PI / 2;               // el frente (+X del cuerpo) apunta ladera abajo (+Z)
    patas.forEach((p, i) => { p.rotation.z = Math.sin(t * 4.2 + (i % 2 ? Math.PI : 0) + (i > 1 ? 0.6 : 0)) * 0.4; });
    arriero.position.set(xA + 0.9, yA + Math.abs(Math.sin(t * 4.2)) * 0.03, zA);
    arriero.rotation.y = -dirA;
    bordon.position.set(xA + 1.2, yA + 0.75, zA + 0.1); bordon.rotation.z = 0.15;
  };
  return { group: g, update };
}

// ── GALLINAS de plaza (picotean el maíz que se riega) ─────────────────────────
function construirGallinas() {
  const g = new THREE.Group();
  const aves = [];
  for (const [i, [x, z, rot]] of [[-5.2, -5.5, 0.7], [-4.3, -6.4, -1.8], [6.2, 24.5, 2.4]].entries()) {
    const m = new THREE.Mesh(geomGallina(430 + i * 13), MAT);
    m.position.set(x, alturaMercado(x, z), z); m.rotation.y = rot;
    g.add(m); aves.push({ m, f: i * 2.3 });
  }
  const update = (t) => {
    for (const a of aves) {
      const pk = Math.max(0, Math.sin(t * 2.2 + a.f));           // picotea a ratos
      a.m.rotation.z = -pk * 0.35;
      a.m.rotation.y += Math.sin(t * 0.7 + a.f) * 0.002;
    }
  };
  return { group: g, update };
}

// ── MOTAS doradas (el polvo de la mañana de plaza) ────────────────────────────
function construirMotas() {
  const N = 180;
  const pos = new Float32Array(N * 3);
  for (let i = 0; i < N; i++) {
    const x = rand(-40, 40), z = rand(-30, 50);
    pos[i * 3] = x; pos[i * 3 + 1] = alturaMercado(x, z) + rand(0.5, 9); pos[i * 3 + 2] = z;
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const mat = new THREE.PointsMaterial({ map: motaTex(), color: col('#fff2d4'), size: 0.38, sizeAttenuation: true, transparent: true, opacity: 0.3, depthWrite: false, blending: THREE.AdditiveBlending, fog: true });
  const pts = new THREE.Points(geo, mat); pts.frustumCulled = false;
  const update = (t) => {
    const a = geo.attributes.position.array;
    for (let i = 0; i < N; i++) {
      a[i * 3 + 1] += Math.sin(t * 0.3 + i) * 0.003 + 0.004;
      a[i * 3] += Math.sin(t * 0.2 + i * 0.5) * 0.003;
      if (a[i * 3 + 1] > alturaMercado(a[i * 3], a[i * 3 + 2]) + 10) a[i * 3 + 1] = alturaMercado(a[i * 3], a[i * 3 + 2]) + 0.5;
    }
    geo.attributes.position.needsUpdate = true;
  };
  return { points: pts, update };
}

// ── HUD: la leyenda DEL FRUTO AL INGRESO (instruccional, en usted) ────────────
function montarLeyenda() {
  const CAPAS = [
    { c: '#d9a13b', n: 'La cadena corta', h: 'campo → plaza', d: 'Lo cosechado baja por el camino y se vende directo, del productor al comprador. Sin la tajada del intermediario, la ganancia vuelve a la finca.' },
    { c: '#c0492f', n: 'El precio justo', h: 'la báscula', d: 'Se pesa a la vista de todos y se paga parejo. Conocer el precio de referencia antes de vender es parte del oficio: cosechar bien y vender mal es trabajar para otro.' },
    { c: '#3f8f4e', n: 'La procedencia', h: 'el letrero', d: 'Cada producto dice de qué vereda y de qué piso térmico viene: café del templado, papa de la tierra fría. El origen es el sello.' },
  ];
  const box = document.createElement('div');
  box.style.cssText = 'position:fixed;left:14px;top:14px;z-index:30;max-width:min(40vw,350px);' +
    'font-family:system-ui,-apple-system,sans-serif;color:#f3efe4;pointer-events:none';
  let html = '<div style="font-size:1.05rem;font-weight:700;text-shadow:0 2px 10px rgba(0,0,0,.7);margin-bottom:2px">🧺 La plaza de mercado</div>' +
    '<div style="font-size:.72rem;opacity:.82;text-shadow:0 1px 6px rgba(0,0,0,.8);margin-bottom:9px">Aguas abajo del valle · día de mercado · del fruto al ingreso</div>';
  for (const e of CAPAS) {
    html += '<div style="display:flex;gap:8px;margin-bottom:7px;background:linear-gradient(90deg,rgba(20,14,8,.72),rgba(20,14,8,.26));' +
      'border-left:4px solid ' + e.c + ';border-radius:7px;padding:6px 9px">' +
      '<span><b style="font-size:.86rem">' + e.n + '</b> <span style="opacity:.62;font-size:.68rem">' + e.h + '</span><br>' +
      '<span style="font-size:.68rem;opacity:.84;line-height:1.3">' + e.d + '</span></span></div>';
  }
  box.innerHTML = html;
  document.body.appendChild(box);
  if (innerWidth < 620) box.style.maxWidth = '82vw';
}

// ── aviso de entrada + botón de salida al valle ───────────────────────────────
function montarAvisoYSalida() {
  const salir = document.createElement('button');
  salir.textContent = '← Volver al valle';
  salir.style.cssText = 'position:fixed;right:14px;top:14px;z-index:31;border:1px solid rgba(224,190,140,.4);' +
    'background:rgba(20,14,8,.8);color:#f3efe4;border-radius:999px;padding:8px 16px;font:600 .8rem system-ui,sans-serif;' +
    'cursor:pointer;box-shadow:0 8px 24px rgba(0,0,0,.4)';
  salir.onclick = () => { location.href = './'; };
  document.body.appendChild(salir);

  return function avisar() {
    let el = document.getElementById('mercadoToast');
    if (!el) {
      el = document.createElement('div'); el.id = 'mercadoToast';
      el.style.cssText = 'position:fixed;left:50%;bottom:26px;transform:translateX(-50%);z-index:40;' +
        'background:rgba(22,15,9,.92);color:#f3efe4;border:1px solid rgba(224,190,140,.35);border-radius:999px;' +
        'padding:10px 20px;font:500 .88rem system-ui,sans-serif;box-shadow:0 10px 30px rgba(0,0,0,.5);transition:opacity .4s';
      document.body.appendChild(el);
    }
    el.textContent = '🧺 Está en la plaza de mercado · arrastre para mirar · toque la báscula';
    el.style.opacity = '1';
    clearTimeout(el._t); el._t = setTimeout(() => { el.style.opacity = '0'; }, 4200);
  };
}

// ── tarjeta de la báscula (la lección del precio justo) ───────────────────────
function tarjetaBascula() {
  let el = document.getElementById('mercadoBasculaCarta');
  if (el) { el.remove(); return; }
  el = document.createElement('div'); el.id = 'mercadoBasculaCarta';
  el.style.cssText = 'position:fixed;left:50%;bottom:70px;transform:translateX(-50%);z-index:45;max-width:min(88vw,430px);' +
    'background:rgba(22,15,9,.95);color:#f3efe4;border:1px solid rgba(224,166,59,.5);border-radius:16px;padding:16px 18px;' +
    'font-family:system-ui,-apple-system,sans-serif;box-shadow:0 16px 40px rgba(0,0,0,.55)';
  el.innerHTML =
    '<div style="font-size:1.05rem;font-weight:700;color:#f6c65a">⚖️ La báscula — el precio justo</div>' +
    '<div style="font-size:.8rem;line-height:1.45;margin-top:8px;opacity:.92">' +
    'En la plaza se pesa a la vista de todos y se paga al que cosechó. La cadena corta —del productor al ' +
    'comprador, directo— deja la ganancia en la finca: el intermediario que compra barato en la vereda y vende ' +
    'caro en la ciudad se queda con la tajada más grande. Saber el precio de referencia antes de bajar al pueblo ' +
    'es tan importante como saber sembrar: cosechar bien y vender mal es trabajar para otro.</div>' +
    '<div style="font-size:.7rem;opacity:.6;margin-top:10px">Toque otra vez para cerrar</div>';
  document.body.appendChild(el);
  clearTimeout(el._t); el._t = setTimeout(() => { el && el.remove(); }, 12000);
}
