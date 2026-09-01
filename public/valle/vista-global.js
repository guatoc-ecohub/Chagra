// ── vista-global.js — LA NAVEGACIÓN GRANDE: pisos térmicos del valle ─────────
//
// Modo `?vista=global`. No es el valle real (ese es main.js, el DEM medido de
// Guatoc): es la LÁMINA de Humboldt — el corte altitudinal que enseñó al mundo
// a leer una montaña andina por franjas de temperatura. El valle entero se
// abstrae a CUATRO BANDAS de altitud que ascienden hacia el nevado, y cada uno
// de los nueve mundos vive en la banda que le corresponde. Clic = entrar.
//
//   cálido   #cba04a  (abajo, al frente, tierra caliente)
//   templado #6f9e4a
//   frío     #4f8f7d  (bosque altoandino de tres estratos, con su niebla)
//   páramo   #aec7cf  (arriba, junto al nevado — de aquí baja La Chorrera)
//
// El páramo y La Chorrera coronan la lámina, cerca del nevado: es donde nace el
// agua (queñua = «fábrica de agua», ver `catalogo.js`) y de donde baja el salto.
// Un HILO DE AGUA cose las cuatro bandas: del nevado al pie, todo compuesto.
//
// REFERENTES (encargo del operador):
//   · Peter Jackson — el paisaje ÉPICO: cordillera en capas + nevado monumental,
//     escala que quita el aliento, telones que reculan en perspectiva aérea.
//   · Christopher Nolan — composición y LUZ: hora dorada, contraste cálido/frío,
//     profundidad atmosférica, brillo cinematográfico (bloom en nieve/agua/sol).
//   · Zelda BOTW / Mario Odyssey — un mapa-mundo BELLO y navegable: color
//     vibrante, landmarks (los mundos como hitos), ganas de entrar a cada piso.
//
// GROUNDING (deepresearch/fase1-drs):
//   · DR-paramo-frailejon.md → frailejón caulirrosulado (tallo con necromasa +
//     roseta en espiral), pajonal en macolla, laguna, niebla.
//   · DR-bosque-3-estratos.md → los tres estratos (dosel 3-8 m · sotobosque ·
//     rasante), niebla permanente.
//
// ANTI-TANGLE: archivo NUEVO y AUTÓNOMO. Su único enganche con main.js es el
// bloque marcado `┃F4┃` que lo importa. Monta su propio canvas/renderer/loop y
// SUPRIME el valle (oculta #c + para el loop de main): no pelean dos renders.

import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { ShaderGradeoFinal } from './lib3d/post/gradeoFinal.js';
import { MUNDOS } from './catalogo.js';
// Silueta ez-tree (rama recursiva) para los arbolitos de la lámina: reemplaza
// los conos/domos gomita por copas ramificadas reales. Fusión rama+hoja con
// color por vértice → 1 material compartido, geometría horneada UNA vez y
// clonada por árbol (barato: la lámina tiene pocos árboles). Filtro
// agroecológico intacto (veta eucalipto/pino/retamo/acacia).
import { bakearArquetipoFusion } from './flora-eztree-bake.js';
import { buildFrailejon } from './lib3d/flora/frailejonFabrica.js';
import { crearParchePasto } from './lib3d/flora/quickGrass.js';
import { crearGeometriaPiedraEsculpida } from './lib3d/fx/aguaParamo.js';

// ── LOS CUATRO PISOS ─────────────────────────────────────────────────────────
const PISOS = [
  { id: 'calido',   nombre: 'Cálido',   rango: '0 – 1.000 m',      color: '#cba04a' },
  { id: 'templado', nombre: 'Templado', rango: '1.000 – 2.400 m',  color: '#6f9e4a' },
  { id: 'frio',     nombre: 'Frío',     rango: '2.400 – 3.000 m',  color: '#4f8f7d' },
  { id: 'paramo',   nombre: 'Páramo',   rango: '3.000 m – nevado', color: '#aec7cf' },
];

// ── EN QUÉ BANDA VIVE CADA MUNDO ─────────────────────────────────────────────
// Anclado en el Ent que enseña cada mundo (`catalogo.js` ata Ent→piso):
//   roble→templado · aliso→frío · queñua→páramo · ceiba→cálido.
// Los sin Ent, por tema y cota medida en el valle:
//   vender→cálido (plaza aguas abajo, salida al pueblo, 2318 m, el más bajo) ·
//   animales→cálido (corral doméstico) · finca→templado (el alto sobre la casa) ·
//   tiempo→frío (el alto despejado donde se lee el cielo, 2601 m).
const PISO_DE = {
  vender: 'calido',  animales: 'calido',
  plantas: 'templado', finca: 'templado',
  bosque: 'frio', abono: 'frio', tiempo: 'frio',
  agua: 'paramo', paramo: 'paramo',
};

// ── MUNDOS EXTRA (autónomos `?mundo=X`, NO viven en catalogo.js/MUNDOS) ─────
// La ceiba, el mercado, el aguacatal, el invernadero y la papa son módulos
// propios (ver `main.js`) sin mojón en el listado de nueve — no tienen `x,z`
// en el DEM del valle todavía, así que no encajan en `MUNDOS`. Se agregan acá
// como letreros más, en su piso térmico REAL, para que la vista-global sea el
// hub de navegación completo. Mismo shape mínimo que consume `texMundo`/`entrar`
// (id, nombre, emoji, color, url); `aviso` queda null porque los cinco SÍ abren.
const MUNDOS_EXTRA = [
  { id: 'ceiba', nombre: 'La ceiba', emoji: '🌳', color: '#4ea63a', url: '/?mundo=ceiba', aviso: null, piso: 'calido' },
  { id: 'mercado', nombre: 'La plaza de mercado', emoji: '🧺', color: '#d9534f', url: '/?mundo=mercado', aviso: null, piso: 'calido' },
  { id: 'aguacatal', nombre: 'El aguacatal', emoji: '🥑', color: '#5c8a3a', url: '/?mundo=aguacatal', aviso: null, piso: 'templado' },
  { id: 'invernadero', nombre: 'El invernadero', emoji: '🍅', color: '#e0684a', url: '/?mundo=invernadero', aviso: null, piso: 'templado' },
  { id: 'papa', nombre: 'El papal', emoji: '🥔', color: '#c9995a', url: '/?mundo=papa', aviso: null, piso: 'frio' },
];

// ── ESCALERA DE PISOS (contornos que ascienden al nevado) ───────────────────
const ANCHO = 168;                 // ancho de cada terraza (X)
const PROF = 36;                   // fondo de cada huella (Z)
const ALTO = 13;                   // salto de altura entre terrazas (Y)
const Z0 = 52;                     // borde delantero de la terraza cálida
const tierZfrente = (i) => Z0 - i * PROF;
const tierZfondo = (i) => tierZfrente(i) - PROF;
const tierY = (i) => i * ALTO;

const col = (hex) => new THREE.Color(hex);
const aclarar = (c, k) => c.clone().lerp(new THREE.Color('#ffffff'), k);
const oscurecer = (c, k) => c.clone().lerp(new THREE.Color('#000000'), k);
const rand = (a, b) => a + Math.random() * (b - a);

// ── CIELO DE HORA DORADA (Nolan) ─────────────────────────────────────────────
function gradSky() {
  const cv = document.createElement('canvas'); cv.width = 16; cv.height = 512;
  const c = cv.getContext('2d');
  const g = c.createLinearGradient(0, 0, 0, 512);
  g.addColorStop(0.00, '#5fa9c9');   // cenit alpino limpio
  g.addColorStop(0.34, '#8fc6d4');
  g.addColorStop(0.60, '#cfe3d9');
  g.addColorStop(0.80, '#f3dcac');   // bruma cálida
  g.addColorStop(1.00, '#e6b877');   // horizonte dorado
  c.fillStyle = g; c.fillRect(0, 0, 16, 512);
  const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace;
  return t;
}
// disco de sol difuso (con bloom, glow cinematográfico)
function sunTex() {
  const sz = 256, cv = document.createElement('canvas'); cv.width = cv.height = sz;
  const c = cv.getContext('2d'), r = sz / 2;
  const g = c.createRadialGradient(r, r, 0, r, r, r);
  g.addColorStop(0, 'rgba(255,250,232,1)');
  g.addColorStop(0.28, 'rgba(255,241,200,0.9)');
  g.addColorStop(0.6, 'rgba(255,224,160,0.25)');
  g.addColorStop(1, 'rgba(255,224,160,0)');
  c.fillStyle = g; c.beginPath(); c.arc(r, r, r, 0, Math.PI * 2); c.fill();
  const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace;
  return t;
}
// textura pintada para la banda (mancha orgánica, sin cargar imágenes)
function texBanda(hex) {
  const sz = 256, cv = document.createElement('canvas'); cv.width = cv.height = sz;
  const c = cv.getContext('2d'); const base = col(hex);
  c.fillStyle = '#' + base.getHexString(); c.fillRect(0, 0, sz, sz);
  for (let i = 0; i < 150; i++) {
    const x = Math.random() * sz, y = Math.random() * sz, rr = 8 + Math.random() * 40;
    const k = (Math.random() - 0.5) * 0.34;
    const t = k > 0 ? aclarar(base, k) : oscurecer(base, -k);
    c.fillStyle = 'rgba(' + Math.round(t.r * 255) + ',' + Math.round(t.g * 255) + ',' + Math.round(t.b * 255) + ',0.18)';
    c.beginPath(); c.ellipse(x, y, rr, rr * 0.55, Math.random() * 3, 0, Math.PI * 2); c.fill();
  }
  const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(3.4, 1);
  return t;
}
// sombra en el piso: mancha radial oscura (ancla los objetos, nada flota)
let _sombraTex = null;
function sombraTex() {
  if (_sombraTex) return _sombraTex;
  const sz = 128, cv = document.createElement('canvas'); cv.width = cv.height = sz;
  const c = cv.getContext('2d'), r = sz / 2;
  const g = c.createRadialGradient(r, r, 0, r, r, r);
  g.addColorStop(0, 'rgba(0,0,0,0.42)'); g.addColorStop(0.7, 'rgba(0,0,0,0.16)'); g.addColorStop(1, 'rgba(0,0,0,0)');
  c.fillStyle = g; c.beginPath(); c.arc(r, r, r, 0, Math.PI * 2); c.fill();
  _sombraTex = new THREE.CanvasTexture(cv);
  return _sombraTex;
}
function sombra(r, x, y, z) {
  const m = new THREE.Mesh(new THREE.PlaneGeometry(r * 2, r * 2),
    new THREE.MeshBasicMaterial({ map: sombraTex(), transparent: true, depthWrite: false, fog: false }));
  m.rotation.x = -Math.PI / 2; m.position.set(x, y + 0.05, z);
  return m;
}

// ── LETRERO DE MUNDO (hito navegable, estilo Zelda) ─────────────────────────
function texMundo(M, activo) {
  const w = 512, h = 300, cv = document.createElement('canvas'); cv.width = w; cv.height = h;
  const c = cv.getContext('2d');
  const cm = activo ? (M.color || '#a9d5cb') : '#8b9298';
  c.fillStyle = 'rgba(12,27,34,0.94)'; rr(c, 8, 8, w - 16, h - 16, 28); c.fill();
  c.lineWidth = 7; c.strokeStyle = cm; c.globalAlpha = activo ? 1 : 0.6; rr(c, 8, 8, w - 16, h - 16, 28); c.stroke();
  c.globalAlpha = 1;
  c.fillStyle = cm; rr(c, 8, 8, w - 16, 92, 28, true); c.fill();
  c.font = '74px system-ui,"Noto Color Emoji",sans-serif';
  c.textAlign = 'left'; c.textBaseline = 'middle'; c.fillText(M.emoji, 30, 56);
  c.fillStyle = '#eaf4f1'; c.font = '700 46px system-ui,-apple-system,sans-serif';
  c.textAlign = 'center'; c.textBaseline = 'middle'; wrap(c, M.nombre, w / 2, 168, w - 56, 50);
  c.font = '500 25px system-ui,sans-serif'; c.fillStyle = activo ? cm : '#f0b585';
  c.fillText(activo ? '▸ toque para entrar' : '🚧 sin ruta todavía', w / 2, h - 42);
  const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace;
  return t;
}
function rr(c, x, y, w, h, r, topOnly) {
  c.beginPath(); c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r);
  if (topOnly) { c.lineTo(x + w, y + h); c.lineTo(x, y + h); } else c.arcTo(x + w, y + h, x, y + h, r);
  c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath();
}
function wrap(c, txt, x, y, maxW, lh) {
  const words = txt.split(' '); let line = ''; const lines = [];
  for (const w of words) { const test = line ? line + ' ' + w : w; if (c.measureText(test).width > maxW && line) { lines.push(line); line = w; } else line = test; }
  if (line) lines.push(line);
  const y0 = y - (lines.length - 1) * lh / 2; lines.forEach((l, i) => c.fillText(l, x, y0 + i * lh));
}

export function initVistaGlobal() {
  // ── SUPRIMIR EL VALLE (main.js corre detrás; lo apagamos) ──────────────────
  const sup = document.createElement('style');
  sup.textContent =
    'body.vistaGlobal #c,body.vistaGlobal #onb,body.vistaGlobal #load,' +
    'body.vistaGlobal #hud,body.vistaGlobal #capaLugares,body.vistaGlobal #barraMover,' +
    'body.vistaGlobal #guiaSel,body.vistaGlobal #guiaV,body.vistaGlobal #ventanaM,' +
    'body.vistaGlobal #compaiFotoBtn,body.vistaGlobal #compaiBocadillo' +
    '{display:none!important}body.vistaGlobal{background:#0a0a0f}';
  document.head.appendChild(sup);
  document.body.classList.add('vistaGlobal');
  const pararValle = () => { try { window.__r && window.__r.setAnimationLoop(null); } catch (e) { /* aún no */ } };
  pararValle(); setTimeout(pararValle, 300); setTimeout(pararValle, 1200);

  // ── CANVAS + RENDERER PROPIOS ──────────────────────────────────────────────
  const canvas = document.createElement('canvas'); canvas.id = 'cVista';
  canvas.style.cssText = 'position:fixed;inset:0;width:100vw;height:100vh;display:block;z-index:20;touch-action:none';
  document.body.appendChild(canvas);
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.setSize(innerWidth, innerHeight);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.22;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  window.__rVista = renderer;

  const scene = new THREE.Scene();
  scene.background = gradSky();
  scene.fog = new THREE.Fog(0xe8dcc0, 150, 430);   // bruma cálida, profundidad aérea

  const camera = new THREE.PerspectiveCamera(46, innerWidth / innerHeight, 0.5, 3000);
  const CAM0 = new THREE.Vector3(0, 50, 128);
  const TGT = new THREE.Vector3(0, 21, -54);
  camera.position.copy(CAM0); camera.lookAt(TGT);
  window.__camVista = camera;

  // ── LUZ CINEMATOGRÁFICA (hora dorada, cálido vs frío) ──────────────────────
  scene.add(new THREE.HemisphereLight(0xdff0f4, 0x5c4a30, 0.85));
  const sol = new THREE.DirectionalLight(0xffe7bf, 1.35);   // sol cálido rasante
  sol.position.set(-90, 110, 70); scene.add(sol);
  const rim = new THREE.DirectionalLight(0x9fc4e0, 0.5);    // relleno frío del otro lado
  rim.position.set(95, 60, 40); scene.add(rim);

  const raiz = new THREE.Group(); scene.add(raiz);

  // ── EL SOL (glow, se enciende con el bloom) ────────────────────────────────
  const sunSprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: sunTex(), transparent: true, depthWrite: false, depthTest: false, fog: false }));
  sunSprite.scale.setScalar(150); sunSprite.position.set(-150, 150, -320); raiz.add(sunSprite);

  // ── TELONES DE CORDILLERA (Jackson: capas que reculan) ─────────────────────
  function telon(z, base, amp, hex, opacity, seed) {
    const seg = 90, w = 900, pts = [];
    for (let i = 0; i <= seg; i++) {
      const x = -w / 2 + (i / seg) * w;
      const y = base
        + amp * (0.55 + 0.45 * Math.sin(i * 0.5 + seed))
        + amp * 0.6 * Math.abs(Math.sin(i * 0.17 + seed * 2))
        + amp * 0.25 * Math.sin(i * 1.6 + seed);
      pts.push(new THREE.Vector2(x, y));
    }
    pts.push(new THREE.Vector2(w / 2, -60)); pts.push(new THREE.Vector2(-w / 2, -60));
    const geo = new THREE.ShapeGeometry(new THREE.Shape(pts));
    const m = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color: col(hex), transparent: true, opacity, fog: false }));
    m.position.z = z; raiz.add(m);
    return m;
  }
  // de fondo (pálido, lavado por la bruma) a cerca (más saturado)
  telon(-360, 48, 58, '#b9c7d2', 0.7, 0.3);
  telon(-330, 40, 52, '#a7bccb', 0.78, 1.1);
  telon(-300, 30, 48, '#95b1c2', 0.84, 2.0);
  telon(-268, 22, 44, '#82a3b6', 0.9, 3.2);
  // franjas de niebla entre telones (aire de lámina)
  function nieblaStrip(z, y, hgt, op) {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(900, hgt),
      new THREE.MeshBasicMaterial({ color: 0xeef0e8, transparent: true, opacity: op, depthWrite: false, fog: false }));
    m.position.set(0, y, z); raiz.add(m); return m;
  }
  nieblaStrip(-315, 34, 26, 0.28);
  nieblaStrip(-285, 26, 22, 0.32);

  // ── EL NEVADO MONUMENTAL (con alpenglow) ───────────────────────────────────
  const nevGrp = new THREE.Group(); nevGrp.position.set(-6, tierY(3) - 4, -210);
  function pico(rBase, hRoca, rNieve, hNieve, lados, roca, nieve) {
    const g = new THREE.Group();
    const r = new THREE.Mesh(new THREE.ConeGeometry(rBase, hRoca, lados),
      new THREE.MeshStandardMaterial({ color: roca, roughness: 1, flatShading: true }));
    r.position.y = hRoca / 2; g.add(r);
    const n = new THREE.Mesh(new THREE.ConeGeometry(rNieve, hNieve, lados),
      new THREE.MeshStandardMaterial({ color: nieve, roughness: 0.55, metalness: 0.02, flatShading: true, emissive: 0x223040, emissiveIntensity: 0.12 }));
    n.position.y = hRoca - hNieve * 0.28; g.add(n);
    return g;
  }
  const cumbre = pico(96, 150, 58, 78, 8, 0x5a6572, 0xf6fafd);
  nevGrp.add(cumbre);
  [[-128, -16, 0.66, 0x616c79], [104, -10, 0.6, 0x66707d], [-58, 30, 0.44, 0x6b7480]].forEach(([dx, dz, s, rc]) => {
    const p = pico(90, 120, 40, 56, 7, rc, 0xeaf2f8); p.position.set(dx, 0, dz); p.scale.setScalar(s); nevGrp.add(p);
  });
  raiz.add(nevGrp);

  // ── LAS CUATRO TERRAZAS (contornos con borde orgánico + roquedal) ──────────
  const rockMat = new THREE.MeshStandardMaterial({ color: 0x707a83, vertexColors: true, roughness: 1, flatShading: true });
  function terraza(i) {
    const P = PISOS[i]; const base = col(P.color);
    const zF = tierZfrente(i), zB = tierZfondo(i), y = tierY(i);
    // CONTRAHUELLA con borde superior ONDULADO (ecotono, no una caja)
    const seg = 40, hCara = i === 0 ? y + 26 : ALTO + 5;
    const pts = [];
    for (let k = 0; k <= seg; k++) {
      const x = -ANCHO / 2 + (k / seg) * ANCHO;
      const wob = Math.sin(k * 0.6 + i) * 1.6 + Math.sin(k * 1.7 + i * 2) * 0.9;
      pts.push(new THREE.Vector2(x, wob));
    }
    pts.push(new THREE.Vector2(ANCHO / 2, -hCara)); pts.push(new THREE.Vector2(-ANCHO / 2, -hCara));
    const cara = new THREE.Mesh(new THREE.ShapeGeometry(new THREE.Shape(pts)),
      new THREE.MeshStandardMaterial({ map: texBanda(P.color), color: 0xffffff, roughness: 0.94 }));
    cara.position.set(0, y, zF + 0.1); raiz.add(cara);
    // HUELLA — superficie viva donde se paran mundos y vegetación
    const huella = new THREE.Mesh(new THREE.PlaneGeometry(ANCHO, PROF, 1, 1),
      new THREE.MeshStandardMaterial({ map: texBanda(P.color), color: aclarar(base, 0.1), roughness: 1 }));
    huella.rotation.x = -Math.PI / 2; huella.position.set(0, y + 0.02, (zF + zB) / 2); raiz.add(huella);
    // filo iluminado en el borde delantero
    const filo = new THREE.Mesh(new THREE.BoxGeometry(ANCHO, 1.1, 1.6),
      new THREE.MeshBasicMaterial({ color: aclarar(base, 0.42) }));
    filo.position.set(0, y + 0.5, zF); raiz.add(filo);
    // roquedal disperso sobre el filo: rompe la línea recta, ancla la banda
    for (let k = 0; k < 9; k++) {
      const rk = new THREE.Mesh(crearGeometriaPiedraEsculpida(THREE, { seed: 900 + i * 31 + k }), rockMat);
      rk.position.set(rand(-ANCHO / 2 + 6, ANCHO / 2 - 6), y - rand(0.2, 1.4), zF - rand(-0.5, 2.5));
      rk.rotation.set(rand(0, 3), rand(0, 3), rand(0, 3));
      rk.scale.setScalar(rand(0.8, 2.2)); rk.scale.y *= rand(0.6, 1); raiz.add(rk);
    }
    return { y, zF, zB };
  }
  PISOS.forEach((_, i) => terraza(i));

  // ── VEGETACIÓN GROUNDED POR PISO ─────────────────────────────────────────
  // COPAS EZ-TREE (2026-08-03): la lámina abandona los conos/domos gomita. Se
  // hornean tres siluetas ramificadas UNA vez (encenillo verde de masa +
  // guayacán rosado/amarillo de color) y se clonan por árbol. Un solo material
  // (color por vértice) → barato. Cada geometría trae el pie en y=0 y su altura
  // natural ≈ 1 m (alturaObjetivo:1) → `arbol(alto,...)` escala a la altura pedida.
  const _fusion = {
    verde: bakearArquetipoFusion('encenillo', { alturaObjetivo: 1, tintHoja: 0x2f7d46, tintCorteza: 0x5f4127 }),
    rosa: bakearArquetipoFusion('guayacan_rosado', { alturaObjetivo: 1, tintCorteza: 0x6f5138 }),
    oro: bakearArquetipoFusion('guayacan_amarillo', { alturaObjetivo: 1, tintCorteza: 0x6f5138 }),
  };
  const _matFusion = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 1, flatShading: true });

  function plantar(i, x, z, obj, rSombra) {
    obj.position.set(x, tierY(i), z);
    if (rSombra) raiz.add(sombra(rSombra, x, tierY(i), z));
    raiz.add(obj);
  }
  // FRAILEJÓN y PAJONAL: fábricas canónicas de lib3d (LOD y masa GPU).
  let frailejonN = 0;
  function frailejon(esc = 1) {
    const especies = ['grandiflora', 'argentea', 'killipii', 'lopezii', 'pycnophylla', 'uribei'];
    const g = buildFrailejon(especies[frailejonN % especies.length], 7100 + frailejonN++);
    g.scale.setScalar(esc);
    return g;
  }
  function pajonal() {
    return crearParchePasto(raiz, {
      puntos: [{ x: 0, y: 0, z: 0 }], densidad: 32, radio: 0.85,
      altura: [1.1, 2.0], ancho: 0.045, segmentos: 5,
      colorBase: '#52662d', colorPunta: '#cdb877', tinteJitter: 0.18,
      viento: 0.75, combado: 0.6, semilla: 7300 + frailejonN,
      name: 'vista-global-pajonal-masa',
    }).mesh;
  }
  // árbol de la lámina: silueta ez-tree ramificada (rama+hoja fusionadas, color
  // por vértice) escalada a la altura pedida. `tipo` elige la especie/color:
  // 'verde' (encenillo de masa), 'rosa'/'oro' (guayacanes en floración).
  function arbol(alto, radio, tipo = 'verde') {
    const geo = (_fusion[tipo] || _fusion.verde);
    const m = new THREE.Mesh(geo, _matFusion);
    // la geometría mide ~1 m de alto (alturaObjetivo:1) → escala a `alto`. El
    // ancho lo damos con `radio` relativo para que no quede un fideo ni un balón.
    m.scale.set(alto * (radio / 2.0), alto, alto * (radio / 2.0));
    return m;
  }
  // BOSQUE DE TRES ESTRATOS (DR-bosque): tres portes de encenillo, la franja
  // fría es VERDE. Regla dura del operador 2026-08-11: máximo 2 árboles
  // ROSADOS en TODO el valle, y esos 2 ya los siembra `flora.js` (los guayacanes
  // héroe del domo). Este sembrador corre en `main.js` Y en `main-impostores.js`
  // ⇒ cualquier rosado de aquí se publica DOS veces y revienta el presupuesto:
  // por eso va en cero, no en "poquitos".
  function tresEstratos() {
    const g = new THREE.Group();
    g.add(arbol(8, 2.4, 'verde'));
    const s = arbol(4.6, 1.7, 'verde'); s.position.set(2.7, 0, 1.3); g.add(s);
    const r = arbol(2.4, 1.2, 'verde'); r.position.set(-2.4, 0, 1.7); g.add(r);
    return g;
  }
  // ceiba de la lámina (piso cálido): copa ancha ramificada. El color de la
  // tierra caliente lo pone el guayacán AMARILLO como acento (`tipo:'oro'`),
  // no una fila de rosados — verde dominante por ciencia (piso térmico).
  function ceiba(tipo = 'verde') {
    return arbol(9, 4.6, tipo);
  }
  function bancal() {
    const g = new THREE.Group();
    for (let k = 0; k < 5; k++) {
      const s = new THREE.Mesh(new THREE.BoxGeometry(7.5, 0.5, 0.95),
        new THREE.MeshStandardMaterial({ color: k % 2 ? 0x79ab4c : 0x5c7d3a, roughness: 1 }));
      s.position.set(0, 0.25, -2 + k); g.add(s);
    }
    return g;
  }

  // Poblar (denso pero acotado, para que se lea vivo y no pese)
  for (let k = 0; k < 12; k++) plantar(3, rand(-72, 72), tierZfondo(3) + rand(3, 30), frailejon(rand(0.85, 1.35)), 1.1);
  for (let k = 0; k < 16; k++) plantar(3, rand(-74, 74), tierZfondo(3) + rand(2, 32), pajonal());
  for (let k = 0; k < 8; k++) plantar(2, rand(-70, 70), tierZfondo(2) + rand(4, 30), tresEstratos(), 2.4);
  for (let k = 0; k < 6; k++) plantar(1, rand(-66, 66), tierZfondo(1) + rand(4, 28), bancal());
  for (let k = 0; k < 4; k++) plantar(1, rand(-68, 68), tierZfondo(1) + rand(4, 28), arbol(rand(3.2, 4.8), 1.5, k % 2 ? 'oro' : 'verde'), 1.6);
  // ceibas a los COSTADOS del piso cálido: enmarcan el frente sin tapar los
  // letreros de animales/vender que van al centro.
  for (let k = 0; k < 5; k++) {
    const lado = k % 2 ? 1 : -1;
    // una sola ceiba de ORO por costado como acento cálido; el resto, masa verde.
    plantar(0, lado * rand(40, 74), tierZfrente(0) - rand(6, 30), ceiba(k < 2 ? 'oro' : 'verde'), 3.4);
  }

  // ── LAGUNA DEL PÁRAMO (DR-paramo: lagunas y turberas) ──────────────────────
  const laguna = new THREE.Mesh(new THREE.CircleGeometry(9, 28),
    new THREE.MeshStandardMaterial({ color: 0x3f6f7a, roughness: 0.25, metalness: 0.4, emissive: 0x16333e, emissiveIntensity: 0.2 }));
  laguna.rotation.x = -Math.PI / 2; laguna.position.set(-46, tierY(3) + 0.06, tierZfondo(3) + 16); raiz.add(laguna);

  // ── LA CHORRERA + EL HILO DE AGUA que cose los pisos ──────────────────────
  // El salto baja del pie del nevado por una pared en el páramo, y de ahí un
  // hilo de agua desciende terraza por terraza hasta el frente: todo compuesto.
  const cliffGrp = new THREE.Group();
  const cx = 30, cz = tierZfondo(3) + 3, cy = tierY(3);
  cliffGrp.position.set(cx, cy, cz);
  const pared = new THREE.Mesh(new THREE.BoxGeometry(30, 54, 8),
    new THREE.MeshStandardMaterial({ color: 0x49535e, roughness: 1, flatShading: true }));
  pared.position.y = 27; cliffGrp.add(pared);
  const aguaCae = new THREE.Mesh(new THREE.PlaneGeometry(5, 52),
    new THREE.MeshBasicMaterial({ color: 0xeef7ff, transparent: true, opacity: 0.95, fog: false }));
  aguaCae.position.set(-1.5, 26, 4.1); cliffGrp.add(aguaCae);
  const espuma = new THREE.Mesh(new THREE.CircleGeometry(4, 18),
    new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.85, fog: false }));
  espuma.position.set(-1.5, 1.4, 4.6); espuma.rotation.x = -Math.PI / 2.1; cliffGrp.add(espuma);
  raiz.add(cliffGrp);
  // hilo de agua serpenteando por las cuatro huellas hacia el frente
  const rio = [];
  for (let i = 3; i >= 0; i--) {
    const zf = tierZfrente(i), zb = tierZfondo(i), y = tierY(i);
    const xJit = (i - 1.5) * 10 + Math.sin(i) * 8;
    // tramo sobre la huella
    const trecho = new THREE.Mesh(new THREE.PlaneGeometry(3.4, PROF + 4),
      new THREE.MeshBasicMaterial({ color: 0x8fd3e8, transparent: true, opacity: 0.85, depthWrite: false, fog: false }));
    trecho.rotation.x = -Math.PI / 2; trecho.rotation.z = (Math.random() - 0.5) * 0.3;
    trecho.position.set(cx + xJit * 0.5, y + 0.12, (zf + zb) / 2); raiz.add(trecho); rio.push(trecho);
    // saltito al borde delantero (une con la terraza de abajo)
    if (i > 0) {
      const salto = new THREE.Mesh(new THREE.PlaneGeometry(3.4, ALTO + 2),
        new THREE.MeshBasicMaterial({ color: 0xd8f2fb, transparent: true, opacity: 0.9, depthWrite: false, fog: false }));
      salto.position.set(cx + xJit * 0.5, y - ALTO / 2 + 1, zf + 0.4); raiz.add(salto);
    }
  }

  // ── MARCADORES DE MUNDO (hitos, anclados con poste + sombra) ───────────────
  const marcadores = [];
  const porPiso = {};
  MUNDOS.forEach((M) => { const p = PISO_DE[M.id] || 'templado'; (porPiso[p] ||= []).push(M); });
  const idsYaPuestos = new Set(MUNDOS.map((M) => M.id));
  MUNDOS_EXTRA.forEach((M) => {
    if (idsYaPuestos.has(M.id)) return;   // no duplicar si ya vino de catalogo.js
    (porPiso[M.piso] ||= []).push(M);
  });
  PISOS.forEach((P, i) => {
    const lista = porPiso[P.id] || []; const y = tierY(i);
    const zMid = tierZfrente(i) - 11;
    lista.forEach((M, k) => {
      const n = lista.length;
      const spread = Math.min(48, n * 21);
      const x = n === 1 ? 8 : -spread / 2 + (k / (n - 1)) * spread;
      const activo = !!M.url;
      const g = new THREE.Group();
      const poste = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.3, 6, 6),
        new THREE.MeshStandardMaterial({ color: 0x3a2c20, roughness: 1 }));
      poste.position.y = 3; g.add(poste);
      const w = 11, h = 6.5;
      const letra = new THREE.Mesh(new THREE.PlaneGeometry(w, h),
        new THREE.MeshBasicMaterial({ map: texMundo(M, activo), transparent: true, side: THREE.DoubleSide, fog: false }));
      letra.position.y = 6 + h / 2 - 0.5; g.add(letra);
      g.position.set(x, y, zMid); raiz.add(g);
      raiz.add(sombra(2.6, x, y, zMid));
      marcadores.push({ M, g, letra, activo });
    });
  });

  // ── ENTRAR A UN MUNDO ──────────────────────────────────────────────────────
  function leerGuia() { try { return localStorage.getItem('guatoc.guia'); } catch (e) { return null; } }
  function toast(txt) {
    let el = document.getElementById('vgToast');
    if (!el) {
      el = document.createElement('div'); el.id = 'vgToast';
      el.style.cssText = 'position:fixed;left:50%;bottom:26px;transform:translateX(-50%);z-index:40;' +
        'background:rgba(11,26,33,.94);color:#eaf4f1;border:1px solid rgba(169,213,203,.4);' +
        'border-radius:999px;padding:10px 20px;font:500 .9rem system-ui,sans-serif;box-shadow:0 10px 30px rgba(0,0,0,.5);transition:opacity .3s';
      document.body.appendChild(el);
    }
    el.textContent = txt; el.style.opacity = '1';
    clearTimeout(el._t); el._t = setTimeout(() => { el.style.opacity = '0'; }, 2600);
  }
  function entrar(M) {
    if (!M.url) { toast('🚧 ' + M.nombre + ': ' + (M.aviso || 'sin ruta todavía')); return; }
    let url = M.url; const g = leerGuia();
    if (g) { const sep = url.includes('?') ? '&' : '?'; url += sep + 'guia=' + encodeURIComponent(g); }
    toast(M.emoji + ' Entrando: ' + M.nombre + '…');
    setTimeout(() => { location.href = url; }, 550);
  }

  // ── RAYCAST + ARRASTRE (mirar la lámina) ───────────────────────────────────
  const ray = new THREE.Raycaster(); const pt = new THREE.Vector2();
  let dX = 0, dY = 0, dT = 0;
  function pick(ev) {
    pt.x = (ev.clientX / innerWidth) * 2 - 1; pt.y = -(ev.clientY / innerHeight) * 2 + 1;
    ray.setFromCamera(pt, camera);
    const hits = ray.intersectObjects(marcadores.map((m) => m.letra), false);
    if (!hits.length) return null;
    return marcadores.find((m) => m.letra === hits[0].object) || null;
  }
  canvas.addEventListener('pointerdown', (ev) => { dX = ev.clientX; dY = ev.clientY; dT = performance.now(); });
  canvas.addEventListener('pointerup', (ev) => {
    if (Math.hypot(ev.clientX - dX, ev.clientY - dY) > 9) return;
    if (performance.now() - dT > 700) return;
    const m = pick(ev); if (m) entrar(m.M);
  });
  let arrastrando = false, aX = 0, aY0 = 0, orbit = 0, pitch = 0;
  canvas.addEventListener('pointermove', (ev) => { canvas.style.cursor = pick(ev) ? 'pointer' : (arrastrando ? 'grabbing' : 'grab'); });
  canvas.addEventListener('pointerdown', (ev) => { arrastrando = true; aX = ev.clientX; aY0 = ev.clientY; });
  addEventListener('pointerup', () => { arrastrando = false; });
  addEventListener('pointermove', (ev) => {
    if (!arrastrando) return;
    orbit = THREE.MathUtils.clamp(orbit + (ev.clientX - aX) * 0.0016, -0.52, 0.52);
    pitch = THREE.MathUtils.clamp(pitch + (ev.clientY - aY0) * 0.0011, -0.12, 0.22);
    aX = ev.clientX; aY0 = ev.clientY;
  });

  // ── LEGENDA DOM DE PISOS (izquierda, páramo arriba) ────────────────────────
  const leg = document.createElement('div');
  leg.style.cssText = 'position:fixed;left:14px;top:50%;transform:translateY(-50%);z-index:30;' +
    'display:flex;flex-direction:column;gap:0;pointer-events:none;border-radius:12px;overflow:hidden;' +
    'box-shadow:0 12px 34px rgba(0,0,0,.45);font-family:system-ui,-apple-system,sans-serif';
  [...PISOS].reverse().forEach((P) => {
    const row = document.createElement('div');
    row.style.cssText = 'display:flex;align-items:center;gap:9px;padding:8px 13px 8px 11px;' +
      'background:linear-gradient(90deg,rgba(11,26,33,.86),rgba(11,26,33,.5));border-left:5px solid ' + P.color + ';color:#eaf4f1';
    row.innerHTML = '<span style="width:13px;height:13px;border-radius:3px;background:' + P.color +
      ';box-shadow:0 0 0 1.5px rgba(0,0,0,.5)"></span><span><b style="font-size:.92rem;font-weight:700">' + P.nombre +
      '</b><br><span style="font-size:.68rem;opacity:.72">' + P.rango + '</span></span>';
    leg.appendChild(row);
  });
  document.body.appendChild(leg);
  const tit = document.createElement('div');
  tit.style.cssText = 'position:fixed;left:0;right:0;top:16px;z-index:30;text-align:center;pointer-events:none;' +
    'color:#eaf4f1;font-family:system-ui,-apple-system,sans-serif;text-shadow:0 2px 12px rgba(0,0,0,.75)';
  tit.innerHTML = '<div style="font-size:1.2rem;font-weight:700;letter-spacing:.01em">El valle por pisos térmicos</div>' +
    '<div style="font-size:.76rem;opacity:.82;margin-top:2px">Del calor abajo al páramo bajo el nevado · toque un mundo para entrar</div>';
  document.body.appendChild(tit);

  // ── POST: bloom cinematográfico (nieve, agua, sol) ─────────────────────────
  const composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene, camera));
  composer.addPass(new UnrealBloomPass(new THREE.Vector2(innerWidth, innerHeight), 0.5, 0.75, 0.82));
  composer.addPass(new OutputPass());
  // gradeo fílmico final unificado (lib3d) — mismo look en TODA la app
  const gradeo = new ShaderPass(ShaderGradeoFinal);
  gradeo.uniforms.uTexel.value.set(1 / innerWidth, 1 / innerHeight);
  composer.addPass(gradeo);

  addEventListener('resize', () => {
    camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix();
    renderer.setSize(innerWidth, innerHeight); composer.setSize(innerWidth, innerHeight);
    gradeo.uniforms.uTexel.value.set(1 / innerWidth, 1 / innerHeight);
  });

  // ── LOOP ─────────────────────────────────────────────────────────────────
  const clock = new THREE.Clock(); const camTmp = new THREE.Vector3(), wp = new THREE.Vector3();
  renderer.setAnimationLoop(() => {
    const t = clock.getElapsedTime();
    const rad = 128, ox = orbit + Math.sin(t * 0.09) * 0.045;
    camTmp.set(Math.sin(ox) * rad, 50 + pitch * 70, Math.cos(ox) * rad);
    camera.position.lerp(camTmp, 0.05); camera.lookAt(TGT);
    marcadores.forEach((m) => { m.letra.getWorldPosition(wp); m.letra.lookAt(camera.position.x, wp.y, camera.position.z); });
    aguaCae.material.opacity = 0.88 + Math.sin(t * 3) * 0.06;
    rio.forEach((r, k) => { r.material.opacity = 0.78 + Math.sin(t * 2 + k) * 0.1; });
    gradeo.uniforms.uSemilla.value = (t % 1000);
    composer.render();
  });

  window.__vistaGlobal = { scene, camera, renderer, marcadores, PISOS, PISO_DE };
  return window.__vistaGlobal;
}
