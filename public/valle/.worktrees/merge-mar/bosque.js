// ── bosque.js — EL BOSQUE ALTOANDINO NATIVO, DE TRES ESTRATOS ────────────────
//
// Modo `?mundo=bosque`. No es un mojón del valle: es ENTRAR al bosque de niebla,
// caminarlo por dentro y leer sus TRES ESTRATOS parados en la ladera fría
// (2400–3300 msnm, 12–17 °C, nube ocho meses al año). Archivo NUEVO y AUTÓNOMO,
// Three.js vanilla — monta su propio canvas/renderer/loop y SUPRIME el valle
// (main.js corre detrás y lo apagamos): no pelean dos renders. Su único enganche
// con main.js es el bloque marcado `// ── BOSQUE ──`.
//
// GROUNDING — deepresearch/fase1-drs/DR-bosque-3-estratos.md:
//   · DOSEL (9–17 m): encenillo (Weinmannia, CONO INVERTIDO, dominante del techo),
//     roble (Quercus humboldtii, el único roble nativo y el Ent maestro de este
//     piso), palma de cera que asoma por encima del dosel.
//   · SOTOBOSQUE (2–6 m, a la sombra): mano de oso (parasol), helecho arbóreo
//     (volante de frondas), chusque (abanico de cañas), arbusto florecido
//     (Tibouchina, la única mancha fucsia).
//   · SUELO (0–1,2 m): helechos rasantes, cojines de musgo, hojarasca, hongos.
//   · EPÍFITAS: bromelias y orquídeas colgadas de los troncos — la firma del
//     bosque altoandino. Y la niebla permanente que come la luz de arriba abajo.
//
// LAS CUATRO MIRADAS (encargo del operador):
//   · Peter Jackson — el bosque ÉPICO y HABITADO: el Ent-roble monumental, los
//     emergentes rompiendo el techo, telones de tronco que reculan en la niebla.
//   · Nolan / Interstellar — LA IMAGEN QUE SE QUEDA: los haces de luz que bajan
//     por los claros del dosel y tocan el suelo entre la niebla (god-rays).
//   · Zelda BOTW / Odyssey — color vibrante y ganas de explorar: hongos que
//     brillan, la flor fucsia del sotobosque, las bromelias de las ramas.
//   · agroecólogo — la FIDELIDAD es el efecto especial: cada arquetipo se lee por
//     su SILUETA a 30 m (el encenillo es un cono invertido, la palma una columna
//     con penacho), y los tres estratos se leen como estratos por el gradiente
//     de luz que baja del dosel al suelo.
//   · diseñador instruccional — la niña (11) y el campesino, EN USTED: la leyenda
//     de los tres estratos y el letrero del Ent enseñan sin gamificar.
//
// LEY DE LA CASA: TODO anclado al suelo con `alturaBosque(x,z)` — cero flotando.
// La fusión de mallas evita el bug clásico de `mergeGeometries` (mezclar
// indexadas con no-indexadas devuelve NULL en silencio): aquí todo se desindexa
// antes y solo viajan position + color; la normal se recalcula.

import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { ShaderGradeoFinal } from './lib3d/post/gradeoFinal.js';
// three.quarks: el polen que deriva con el viento entre los tres estratos y
// cruza los god-rays — el bosque altoandino pide motas vivas, no Points quietos.
import { crearMotas } from './lib3d-motas.js';
import { crearBosqueAltoandino } from './lib3d/flora/arbolesAltoandinos.js';
import { crearMatrizParamo } from './lib3d/flora/matrizParamo.js';
import { crearCopaMasa } from './lib3d/flora/FollajeMasa.js';

// ── PALETA MADRE (los colores aprobados del bosque, de paletaMadre.js) ────────
const C = {
  // verdes del piso frío, de la copa al musgo
  brote: '#7a9a3f', monte: '#3f6f3a', niebla: '#3b5236', hojaCoriacea: '#43593b',
  musgo: '#4c5c34', musgoClaro: '#5f6f42', liquen: '#9aa86a', aliso: '#4f6d3d',
  frioVivo: '#3c7f64',
  // tierras y hojarasca
  mantillo: '#7d6038', mantilloSombra: '#6b5230', turba: '#5a3d28', cacao: '#4a2a20',
  rocaParamo: '#7c7c70', piedra: '#9a8b74',
  // cortezas por especie
  roble: '#6a5c4a', encenillo: '#6d4535', quenual: '#8a4a33', quenualPapel: '#cf9166',
  yarumo: '#bcbfb2', cortezaAliso: '#9a9a8f', raicilla: '#5a3b2b',
  // acentos que gritan (los únicos)
  fucsia: '#e46b9b', mortino: '#33305c', maiz: '#f4c542', frailejonFlor: '#e0c24a',
  ambar: '#e0a63b', ambarVivo: '#f6c65a',
  // hongos
  hongoRojo: '#c14b3a', hongoCrema: '#e8dcb8', hongoLuz: '#bfe6c0',
  // niebla / cielo / sol
  nieblaParamo: '#d6e0d2', nieblaLechosa: '#eef0e8', sol: '#ffe7bf',
};
const col = (h) => new THREE.Color(h);
const mezcla = (a, b, t) => col(a).lerp(col(b), t);
const rand = (a, b) => a + Math.random() * (b - a);

// ── PRNG determinista (mismo bosque cada carga: el gate compara) ──────────────
function prng(semilla) {
  let a = semilla >>> 0;
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ── EL RELIEVE DE LA LADERA (el bosque ES ladera, no plano) ───────────────────
// value-noise + fbm barato, sin cargar nada. La ladera SUBE hacia el fondo (-Z):
// el bosque trepa por el flanco frío. `alturaBosque` es la ÚNICA verdad del
// suelo — todo lo demás se ancla a ella.
function hash2(x, z) {
  let h = Math.sin(x * 127.1 + z * 311.7) * 43758.5453;
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
// la ladera: pendiente base hacia el fondo + ondulación orgánica + un claro
// central suave (donde caen los god-rays y se planta el Ent).
const CLARO = { x: 0, z: 6, r: 46 };
function alturaBosque(x, z) {
  const pend = -z * 0.14;                              // sube hacia -Z (al monte)
  const ond = (fbm(x * 0.012 + 40, z * 0.012 - 20) - 0.5) * 26;
  const micro = (fbm(x * 0.06, z * 0.06) - 0.5) * 4.5; // matojos del terreno
  // el claro se ahonda apenas para leerse como vega donde entra la luz
  const d = Math.hypot(x - CLARO.x, z - CLARO.z);
  const vega = -Math.max(0, 1 - d / (CLARO.r * 1.4)) * 3.2;
  return pend + ond + micro + vega;
}

// ── TALLER DE MALLAS ──────────────────────────────────────────────────────────
// pieza(geo, color) → hornea el color por vértice; poner() la coloca; fusionar()
// une una lista en UNA geometría (desindexada, position+color, normal recalculada
// — nunca `mergeGeometries` a pelo: devuelve null en silencio y la planta no sale).
const _c = new THREE.Color();
function pintar(g, color) {
  const gg = g.index ? g.toNonIndexed() : g;
  const n = gg.attributes.position.count, arr = new Float32Array(n * 3);
  _c.set(color);
  for (let i = 0; i < n; i++) { arr[i * 3] = _c.r; arr[i * 3 + 1] = _c.g; arr[i * 3 + 2] = _c.b; }
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

// SOTOBOSQUE · HELECHO ARBÓREO (Cyathea): un VOLANTE — estípite pelado + corona
// de frondas que se arquean.
function geomHelechoArboreo(seed = 6) {
  const r = prng(seed), p = [];
  const H = 3.0 + r() * 1.6;
  p.push(pieza(new THREE.CylinderGeometry(0.16, 0.26, H, 6), C.turba, [0, H / 2, 0]));
  for (let i = 0; i < 9; i++) {
    const a = (i / 9) * Math.PI * 2;
    const fr = new THREE.ConeGeometry(0.34, 2.8, 4);
    // frondas arqueadas hacia afuera-abajo
    p.push(pieza(fr, mezcla(C.frioVivo, C.brote, 0.3).getStyle(),
      [Math.cos(a) * 1.0, H, Math.sin(a) * 1.0], [Math.sin(a) * 0.7, -a, Math.cos(a) * 0.7 - 0.95]));
  }
  return fusionar(p);
}

// SUELO · HELECHO RASANTE: roseta baja de frondas arqueadas.
function geomHelechoSuelo(seed = 10) {
  const r = prng(seed), p = [];
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    const fr = new THREE.ConeGeometry(0.28, 1.5, 4);
    p.push(pieza(fr, mezcla(C.frioVivo, C.musgoClaro, 0.4).getStyle(),
      [Math.cos(a) * 0.35, 0.55, Math.sin(a) * 0.35], [Math.sin(a) * 1.0, -a, Math.cos(a) * 1.0 - 1.15]));
  }
  return fusionar(p);
}

// SUELO · COJÍN DE MUSGO + HOJARASCA: la fábrica callada donde el bosque se
// vuelve tierra. Casi sin sol; lo salva el musgo.
function geomCojinMusgo(seed = 11) {
  const r = prng(seed), p = [];
  p.push(pieza(new THREE.IcosahedronGeometry(0.9, 1), C.musgo, [0, 0.16, 0], null, [1.3, 0.4, 1.3]));
  p.push(pieza(new THREE.IcosahedronGeometry(0.6, 0), mezcla(C.musgoClaro, C.liquen, 0.3).getStyle(), [0.5, 0.2, 0.3], null, [1.1, 0.4, 1.1]));
  // hojarasca alrededor (parches planos)
  for (let i = 0; i < 5; i++) {
    const a = r() * Math.PI * 2, d = 0.7 + r() * 0.9;
    p.push(pieza(new THREE.CircleGeometry(0.35, 5), r() > 0.5 ? C.mantillo : C.mantilloSombra,
      [Math.cos(a) * d, 0.04, Math.sin(a) * d], [-Math.PI / 2, r() * 3, 0]));
  }
  return fusionar(p);
}

// SUELO · HONGOS: sombreretes en racimo — el pop de Zelda (algunos con brillo).
function geomHongos(seed = 12, luz = false) {
  const r = prng(seed), p = [];
  const n = 3 + Math.floor(r() * 3);
  for (let i = 0; i < n; i++) {
    const a = r() * Math.PI * 2, d = r() * 0.5, h = 0.2 + r() * 0.35;
    p.push(pieza(new THREE.CylinderGeometry(0.05, 0.07, h, 5), C.hongoCrema, [Math.cos(a) * d, h / 2, Math.sin(a) * d]));
    p.push(pieza(new THREE.SphereGeometry(0.16, 7, 5, 0, Math.PI * 2, 0, Math.PI / 2), luz ? C.hongoLuz : C.hongoRojo,
      [Math.cos(a) * d, h, Math.sin(a) * d], null, [1, 0.7, 1]));
  }
  return fusionar(p);
}

// EPÍFITAS · BROMELIA (roseta de hojas puntudas) — se cuelga de los troncos.
function geomBromelia(seed = 20) {
  const r = prng(seed), p = [];
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    p.push(pieza(new THREE.ConeGeometry(0.09, 0.7, 4), mezcla(C.frioVivo, C.liquen, 0.35).getStyle(),
      [Math.cos(a) * 0.12, 0.3, Math.sin(a) * 0.12], [Math.sin(a) * 0.6, -a, Math.cos(a) * 0.6]));
  }
  // el cogollo rojo (bromelia en flor)
  p.push(pieza(new THREE.ConeGeometry(0.08, 0.4, 5), C.hongoRojo, [0, 0.5, 0]));
  return fusionar(p);
}

// ── material único: color por vértice, flat shading (low-poly Ghibli) ─────────
const MAT_VEG = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 1, flatShading: true });

// ── texturas pintadas (sin cargar imágenes) ──────────────────────────────────
// mota redonda y suave (evita el cuadrado feo del PointsMaterial por defecto)
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
// haz de luz: degradé vertical (fuerte arriba, se apaga abajo) + suave a los lados
let _hazTex = null;
function hazTex() {
  if (_hazTex) return _hazTex;
  const cv = document.createElement('canvas'); cv.width = 32; cv.height = 128;
  const c = cv.getContext('2d');
  // la cara del cono se mapea con V arriba->abajo: arriba (V=0) opaco, abajo se apaga
  const g = c.createLinearGradient(0, 0, 0, 128);
  g.addColorStop(0, 'rgba(255,255,255,0.9)'); g.addColorStop(0.5, 'rgba(255,255,255,0.5)'); g.addColorStop(1, 'rgba(255,255,255,0)');
  c.fillStyle = g; c.fillRect(0, 0, 32, 128);
  // desvanecer los bordes laterales para que no se vea el filo del cono
  const gl = c.createLinearGradient(0, 0, 32, 0);
  gl.addColorStop(0, 'rgba(0,0,0,1)'); gl.addColorStop(0.5, 'rgba(0,0,0,0)'); gl.addColorStop(1, 'rgba(0,0,0,1)');
  c.globalCompositeOperation = 'destination-out'; c.fillStyle = gl; c.fillRect(0, 0, 32, 128);
  _hazTex = new THREE.CanvasTexture(cv);
  return _hazTex;
}

// ── sombra de contacto (mancha radial: ancla, nada flota) ─────────────────────
let _sombraTex = null;
function sombraTex() {
  if (_sombraTex) return _sombraTex;
  const cv = document.createElement('canvas'); cv.width = cv.height = 128;
  const c = cv.getContext('2d'), r = 64;
  const g = c.createRadialGradient(r, r, 0, r, r, r);
  g.addColorStop(0, 'rgba(20,26,18,0.5)'); g.addColorStop(0.6, 'rgba(20,26,18,0.2)'); g.addColorStop(1, 'rgba(0,0,0,0)');
  c.fillStyle = g; c.beginPath(); c.arc(r, r, r, 0, Math.PI * 2); c.fill();
  _sombraTex = new THREE.CanvasTexture(cv);
  return _sombraTex;
}

// ═══════════════════════════════════════════════════════════════════════════
export function initBosque() {
  const params = new URLSearchParams(location.search);
  const camModo = params.get('cam');          // `hero` = cuadro fijo determinista para el gate

  // ── SUPRIMIR EL VALLE (main.js corre detrás) ────────────────────────────────
  const sup = document.createElement('style');
  sup.textContent =
    'body.enBosque #c,body.enBosque #onb,body.enBosque #load,body.enBosque #hud,' +
    'body.enBosque #capaLugares,body.enBosque #barraMover,body.enBosque #guiaSel,' +
    'body.enBosque #guiaV,body.enBosque #ventanaM{display:none!important}' +
    'body.enBosque{background:#0e1510}';
  document.head.appendChild(sup);
  document.body.classList.add('enBosque');
  const pararValle = () => { try { window.__r && window.__r.setAnimationLoop(null); } catch (e) { /* aún no */ } };
  pararValle(); setTimeout(pararValle, 300); setTimeout(pararValle, 1200);

  // ── CANVAS + RENDERER PROPIOS ───────────────────────────────────────────────
  const canvas = document.createElement('canvas'); canvas.id = 'cBosque';
  canvas.style.cssText = 'position:fixed;inset:0;width:100vw;height:100vh;display:block;z-index:20;touch-action:none';
  document.body.appendChild(canvas);
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.setSize(innerWidth, innerHeight);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.22;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  window.__r = renderer;                        // hook del gate (draw calls + renderer)
  window.__rBosque = renderer;

  const scene = new THREE.Scene();
  // ── CIELO Y NIEBLA DEL BOSQUE DE NUBE (verde-plata, NO celeste) ─────────────
  scene.background = cieloNiebla();
  // niebla permanente que da PROFUNDIDAD sin volverse whiteout: los troncos del
  // fondo reculan en la nube, pero cerca el bosque es verde y nítido.
  // F3-bosque: 0.0042 velaba TODO (mismo pecado del cafetal pre-25b7c15);
  // a 0.0019 el primer plano es nítido, el fondo recula — perspectiva aérea real.
  scene.fog = new THREE.FogExp2(0xc9d6c3, 0.0019);

  const camera = new THREE.PerspectiveCamera(56, innerWidth / innerHeight, 0.4, 1200);
  window.__cam = camera; window.__scene = scene;
  window.__h = alturaBosque;                    // sonda del gate

  const raiz = new THREE.Group(); scene.add(raiz);

  // ── LUZ: sol rasante y cálido que baja por los claros del dosel (Nolan) ─────
  // el piso de musgo REBOTA luz verde: las copas vistas desde abajo no son negras
  scene.add(new THREE.HemisphereLight(0xd9ead8, 0x4a5a38, 0.68));
  const sol = new THREE.DirectionalLight(0xffe4b0, 2.0);
  sol.position.set(-70, 120, 80); scene.add(sol);
  const relleno = new THREE.DirectionalLight(0x8fb6c6, 0.35);
  relleno.position.set(70, 40, -50); scene.add(relleno);

  // ── EL SUELO DE LA LADERA (hojarasca + musgo, con relieve) ──────────────────
  raiz.add(construirSuelo());

  // ── LOS TRES ESTRATOS, INSTANCIADOS Y ANCLADOS ──────────────────────────────
  // Los cinco árboles nativos vienen de arbolesAltoandinos: núcleo + cards e
  // impostor por especie, con celdas y corte LOD ya calibrados para 60 fps.
  const rr = prng(4242);
  const libre = (x, z, rmin, lista) => lista.every((q) => Math.hypot(q.x - x, q.z - z) > rmin);
  function sembrar(geom, n, { rmin, escala, dentroClaro = false, borde = 0 }) {
    const puestos = [];
    const inst = new THREE.InstancedMesh(geom, MAT_VEG, n);
    const m = new THREE.Matrix4(), q = new THREE.Quaternion(), s = new THREE.Vector3(), pos = new THREE.Vector3();
    let hechos = 0, intentos = 0;
    while (hechos < n && intentos < n * 40) {
      intentos++;
      const x = rand(-230, 230), z = rand(-210, 250);
      const dClaro = Math.hypot(x - CLARO.x, z - CLARO.z);
      if (!dentroClaro && dClaro < CLARO.r) continue;      // deja el claro para el Ent
      if (dentroClaro && dClaro > CLARO.r * (1 + borde)) continue;
      if (!libre(x, z, rmin, puestos)) continue;
      const y = alturaBosque(x, z);
      const e = escala[0] + rr() * (escala[1] - escala[0]);
      pos.set(x, y, z); q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), rr() * Math.PI * 2);
      s.set(e, e * (0.92 + rr() * 0.16), e);
      m.compose(pos, q, s); inst.setMatrixAt(hechos, m);
      puestos.push({ x, z }); hechos++;
    }
    inst.count = hechos; inst.instanceMatrix.needsUpdate = true;
    inst.frustumCulled = false;
    raiz.add(inst);
    return puestos;
  }

  const bosqueNativo = crearBosqueAltoandino({
    area: { x0: -230, x1: 230, z0: -210, z1: 250 },
    alturaEn: alturaBosque,
    libre: (x, z) => Math.hypot(x - CLARO.x, z - CLARO.z) > CLARO.r * 0.9,
    densidad: 0.95,
    seed: 4242,
    rDetalle: 42,
    banda: 10,
    corteLejos: 420,
    ambiente: 0.95,
  });
  raiz.add(bosqueNativo.grupo);
  const arbolesNativos = bosqueNativo.arboles;

  // Helechos: no hay una fábrica de helecho arbóreo en lib3d todavía; se
  // conserva el arquetipo histórico mientras llega ese asset, fuera del
  // reemplazo de árboles solicitado.
  // SOTOBOSQUE — a media altura, a la sombra
  sembrar(geomHelechoArboreo(16), 44, { rmin: 5, escala: [0.85, 1.3] });
  sembrar(geomHelechoArboreo(26), 10, { rmin: 6, escala: [0.9, 1.3], dentroClaro: true, borde: 0.18 });
  // chusque + roca + matriz de piso frío: asset canónico, no scatter de
  // sólidos regulares. Se acota al entorno del claro para no llenar el mundo.
  const matriz = crearMatrizParamo({
    area: { x0: -150, x1: 150, z0: -130, z1: 170 },
    alturaEn: alturaBosque,
    libre: (x, z) => Math.hypot(x - CLARO.x, z - CLARO.z) > CLARO.r * 0.72,
    densidad: 0.42,
    emergentes: 0,
    calidad: 'media',
    seed: 1717,
    ambiente: 0.88,
  });
  raiz.add(matriz.grupo);

  // TODO(asset): musgo y cojines no tienen reemplazo real en lib3d/flora.
  // TODO(asset): hongos luminosos tampoco tienen fábrica canónica.
  sembrar(geomCojinMusgo(21), 200, { rmin: 2.0, escala: [0.7, 1.4], dentroClaro: true, borde: 1.2 });
  sembrar(geomHongos(22, false), 70, { rmin: 1.8, escala: [0.8, 1.4], dentroClaro: true, borde: 1.2 });
  sembrar(geomHongos(23, true), 36, { rmin: 2.2, escala: [0.9, 1.5], dentroClaro: true, borde: 1.2 });  // los que brillan

  // ── SOMBRA DE CONTACTO bajo el dosel (ancla los árboles: nada flota) ────────
  // un solo InstancedMesh de discos suaves; con fog activa para que las sombras
  // del fondo se fundan en la nube igual que sus árboles (perspectiva aérea).
  {
    const datos = [
      ...arbolesNativos.map((p) => ({ x: p.x, z: p.z, r: p.especie === 'mano_de_oso' ? 2.2 : 4.4 })),
    ];
    const sg = new THREE.CircleGeometry(1, 14); sg.rotateX(-Math.PI / 2);
    const sm = new THREE.MeshBasicMaterial({ map: sombraTex(), transparent: true, depthWrite: false });
    const sInst = new THREE.InstancedMesh(sg, sm, datos.length);
    const m = new THREE.Matrix4(), q = new THREE.Quaternion(), s = new THREE.Vector3(), pos = new THREE.Vector3();
    datos.forEach((d, i) => {
      pos.set(d.x, alturaBosque(d.x, d.z) + 0.09, d.z);
      s.set(d.r, 1, d.r);
      m.compose(pos, q, s); sInst.setMatrixAt(i, m);
    });
    sInst.instanceMatrix.needsUpdate = true; sInst.frustumCulled = false;
    raiz.add(sInst);
  }

  // TODO(asset): bromelias epífitas no tienen reemplazo real en lib3d/flora.
  // ── EPÍFITAS sobre los troncos del dosel (bromelias colgadas) ───────────────
  const bromeliaGeo = geomBromelia(20);
  const nBrom = Math.min(110, arbolesNativos.length * 2);
  const brom = new THREE.InstancedMesh(bromeliaGeo, MAT_VEG, nBrom);
  {
    const m = new THREE.Matrix4(), q = new THREE.Quaternion(), s = new THREE.Vector3(), pos = new THREE.Vector3();
    const hosts = arbolesNativos; let k = 0;
    for (let i = 0; i < nBrom && k < nBrom; i++) {
      const h = hosts[i % hosts.length];
      const a = rr() * Math.PI * 2, rad = 0.7 + rr() * 0.5, yy = alturaBosque(h.x, h.z) + 4 + rr() * 5;
      pos.set(h.x + Math.cos(a) * rad, yy, h.z + Math.sin(a) * rad);
      q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), a);
      const e = 0.8 + rr() * 0.7; s.set(e, e, e);
      m.compose(pos, q, s); brom.setMatrixAt(k++, m);
    }
    brom.count = k; brom.instanceMatrix.needsUpdate = true; brom.frustumCulled = false;
    raiz.add(brom);
  }

  // ── EL ENT-ROBLE: el árbol maestro del piso frío, en el claro ───────────────
  const ent = construirEntRoble();
  const eBaseY = alturaBosque(CLARO.x, CLARO.z);
  ent.group.position.set(CLARO.x, eBaseY, CLARO.z + 4);
  raiz.add(ent.group);
  // sombra grande del Ent
  raiz.add(sombraPlano(11, CLARO.x, eBaseY + 0.06, CLARO.z + 4));

  // ── LOS HACES DE LUZ (god-rays): LA IMAGEN QUE SE QUEDA (Nolan) ──────────────
  // conos aditivos que bajan de los claros del dosel y tocan el suelo entre la
  // niebla. Anclados: la base cae sobre el suelo real.
  const rayos = construirRayos(eBaseY);
  raiz.add(rayos.group);

  // ── partículas de esporas/polvo suspendido en los haces (bosque vivo) ───────
  const motas = construirMotas(eBaseY);
  raiz.add(motas.points);

  // ── CÁMARA: intro que ENTRA a la niebla y baja a los pies del Ent ───────────
  const OJO = 1.7;
  const HERO_POS = new THREE.Vector3(CLARO.x + 13, eBaseY + OJO + 2.6, CLARO.z + 39);
  const HERO_TGT = new THREE.Vector3(CLARO.x, eBaseY + 11, CLARO.z + 4);

  const controls = new OrbitControls(camera, canvas);
  controls.enableDamping = true; controls.dampingFactor = 0.08;
  controls.minDistance = 8; controls.maxDistance = 180;
  controls.maxPolarAngle = 1.52;               // no meterse bajo el suelo
  controls.target.copy(HERO_TGT);
  controls.enabled = false;
  window.__ctl = controls;

  let introDone = false, introStart = null;
  // intro = dolly CORTO ya DENTRO del bosque (nada de plano cenital de mapa:
  // desde el primer frame se leen claro, Ent y paredes de monte — y el gate,
  // que captura ~5 s tras cargar, ve bosque aunque el primer frame tarde).
  const introPos = new THREE.CatmullRomCurve3([
    new THREE.Vector3(CLARO.x + 28, eBaseY + 7.5, CLARO.z + 68),   // entre los troncos
    new THREE.Vector3(CLARO.x + 21, eBaseY + 5.6, CLARO.z + 54),
    HERO_POS.clone(),
  ]);
  const introTgt = new THREE.CatmullRomCurve3([
    new THREE.Vector3(CLARO.x, eBaseY + 13, CLARO.z + 2),
    HERO_TGT.clone(), HERO_TGT.clone(),
  ]);
  const INTRO_S = 2.6;

  function darControl() {
    if (controls.enabled) return;
    camera.position.copy(HERO_POS); controls.target.copy(HERO_TGT);
    controls.enabled = true; controls.update();
  }
  function endIntro() { if (introDone) return; introDone = true; darControl(); avisar(); }
  function mano() { if (!introDone) endIntro(); }
  addEventListener('pointerdown', mano); addEventListener('keydown', mano); addEventListener('wheel', mano, { passive: true });

  // cuadro fijo determinista para el gate visual
  if (camModo === 'hero') {
    introDone = true;
    camera.position.copy(HERO_POS); camera.lookAt(HERO_TGT);
  } else if (camModo === 'estratos') {
    // cuadro que PRUEBA la verticalidad: bajo y retirado, mirando de perfil los
    // tres pisos — el dosel arriba, el sotobosque medio, el suelo al frente.
    introDone = true;
    camera.position.set(CLARO.x - 66, eBaseY + 4, CLARO.z + 26);
    camera.lookAt(CLARO.x + 6, eBaseY + 13, CLARO.z - 6);
  } else {
    camera.position.copy(introPos.getPoint(0)); camera.lookAt(introTgt.getPoint(0));
  }

  // ── HUD: la leyenda de los TRES ESTRATOS (instruccional, en usted) ──────────
  montarLeyenda();
  const avisar = montarAvisoYSalida();

  // ── raycast al Ent → su lección ─────────────────────────────────────────────
  const ray = new THREE.Raycaster(), pt = new THREE.Vector2();
  let dx0 = 0, dy0 = 0, dt0 = 0;
  canvas.addEventListener('pointerdown', (e) => { dx0 = e.clientX; dy0 = e.clientY; dt0 = performance.now(); });
  canvas.addEventListener('pointerup', (e) => {
    if (Math.hypot(e.clientX - dx0, e.clientY - dy0) > 9 || performance.now() - dt0 > 600) return;
    pt.x = (e.clientX / innerWidth) * 2 - 1; pt.y = -(e.clientY / innerHeight) * 2 + 1;
    ray.setFromCamera(pt, camera);
    if (ray.intersectObject(ent.group, true).length) tarjetaEnt();
  });

  // ── POST: bloom cinematográfico (los haces, el musgo iluminado) ─────────────
  const composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene, camera));
  // threshold alto: que bloomeen los haces y los hongos, NO el cielo pálido
  // (a 0.86 el cielo entero entraba al bloom y lavaba el cuadro)
  composer.addPass(new UnrealBloomPass(new THREE.Vector2(innerWidth, innerHeight), 0.24, 0.7, 0.9));
  composer.addPass(new OutputPass());
  // gradeo fílmico final unificado (lib3d)
  const gradeo = new ShaderPass(ShaderGradeoFinal);
  gradeo.uniforms.uTexel.value.set(1 / innerWidth, 1 / innerHeight);
  composer.addPass(gradeo);

  // ── POLEN GPU A LA DERIVA (three.quarks vía lib3d-motas) ───────────────────
  // Motas cálidas que nacen entre el suelo y el dosel y derivan con el viento
  // cruzando los god-rays. Centrado en el claro, mismo eje que los haces.
  const polen = crearMotas(scene, {
    color: '#fff2cf', opacidad: 0.5,
    tam: [0.35, 0.9], vida: [10, 20], emisionSeg: 95,
    caja: [150, 22, 150], centro: new THREE.Vector3(CLARO.x, eBaseY + 11, CLARO.z + 6),
    viento: new THREE.Vector3(0.5, 0, 0.3), subida: 0.03,
  });

  addEventListener('resize', () => {
    camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix();
    renderer.setSize(innerWidth, innerHeight); composer.setSize(innerWidth, innerHeight);
    gradeo.uniforms.uTexel.value.set(1 / innerWidth, 1 / innerHeight);
  });

  const loadEl = document.getElementById('load');
  if (loadEl) { loadEl.style.opacity = 0; setTimeout(() => loadEl.remove(), 700); }

  // ── LOOP ────────────────────────────────────────────────────────────────────
  const clock = new THREE.Clock();
  renderer.setAnimationLoop(() => {
    const delta = clock.getDelta();
    const t = clock.elapsedTime;
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
    ent.update(t);
    bosqueNativo.actualizar(camera);
    matriz.actualizar(camera);
    rayos.update(t);
    motas.update(t);              // esporas Points de base (se mantienen)
    polen.update(delta);          // polen GPU a la deriva (three.quarks)
    gradeo.uniforms.uSemilla.value = (t % 1000);
    composer.render();
  });

  window.__bosque = { scene, camera, renderer, controls, ent };
  return window.__bosque;
}

// ── CIELO DE NIEBLA (degradé verde-plata luminoso, bosque de nube) ────────────
function cieloNiebla() {
  const cv = document.createElement('canvas'); cv.width = 16; cv.height = 512;
  const c = cv.getContext('2d');
  const g = c.createLinearGradient(0, 0, 0, 512);
  g.addColorStop(0.00, '#a2beb0');   // cenit con cuerpo: el dosel siluetea contra la nube
  g.addColorStop(0.42, '#c2d2c1');
  g.addColorStop(0.72, '#dbe3d0');   // la niebla que traga el fondo
  g.addColorStop(1.00, '#e9ecdc');
  c.fillStyle = g; c.fillRect(0, 0, 16, 512);
  const tx = new THREE.CanvasTexture(cv); tx.colorSpace = THREE.SRGBColorSpace;
  return tx;
}

// ── EL SUELO: heightfield hojarasca+musgo con color por vértice ───────────────
function construirSuelo() {
  const SIZE = 620, SEG = 130;
  const geo = new THREE.PlaneGeometry(SIZE, SIZE, SEG, SEG);
  geo.rotateX(-Math.PI / 2);
  const pos = geo.attributes.position;
  const colr = new Float32Array(pos.count * 3);
  // suelo mossy-verde-pardo (bosque de niebla, no un potrero pardo): la base ya
  // trae musgo, y la hojarasca parda entra en parches; el sol tibio dapplea los altos.
  const base = mezcla(C.musgo, C.mantilloSombra, 0.28), musgo = col(C.musgo), musgoClaro = col(C.musgoClaro);
  const hoja = col(C.mantillo), cacao = col(C.cacao), liquen = col(C.liquen), solTinte = col('#c7b56e');
  const tmp = new THREE.Color();
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), z = pos.getZ(i);
    const y = alturaBosque(x, z);
    pos.setY(i, y);
    const musgoK = fbm(x * 0.05 + 5, z * 0.05 - 8);        // parches de musgo
    const hojaK = fbm(x * 0.08 - 3, z * 0.08 + 11);        // parches de hojarasca
    tmp.copy(base);
    if (hojaK > 0.55) tmp.lerp(hoja, (hojaK - 0.55) * 1.1);  // hojarasca en PARCHES, no manto pardo
    if (musgoK > 0.45) tmp.lerp(musgoClaro, (musgoK - 0.45) * 1.2);  // el musgo DOMINA el piso frío
    if (fbm(x * 0.11, z * 0.11) < 0.22) tmp.lerp(cacao, 0.4);        // tierra desnuda apenas
    if (fbm(x * 0.15 + 20, z * 0.15) > 0.72) tmp.lerp(liquen, 0.3);  // líquen pálido sobre piedra
    // dapple cálido donde el terreno mira al sol (los altos del microrelieve)
    const dap = THREE.MathUtils.clamp((fbm(x * 0.09 + 2, z * 0.09 - 6) - 0.45) * 2, 0, 1);
    tmp.lerp(solTinte, dap * 0.06);
    colr[i * 3] = tmp.r; colr[i * 3 + 1] = tmp.g; colr[i * 3 + 2] = tmp.b;
  }
  geo.setAttribute('color', new THREE.BufferAttribute(colr, 3));
  geo.computeVertexNormals();
  return new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 1, flatShading: false }));
}

// ── sombra de contacto como plano ────────────────────────────────────────────
function sombraPlano(r, x, y, z) {
  const m = new THREE.Mesh(new THREE.PlaneGeometry(r * 2, r * 2),
    new THREE.MeshBasicMaterial({ map: sombraTex(), transparent: true, depthWrite: false, fog: false }));
  m.rotation.x = -Math.PI / 2; m.position.set(x, y, z);
  return m;
}

// ═══════════════════════════════════════════════════════════════════════════
//  EL ENT-ROBLE — el árbol maestro del piso frío (Quercus humboldtii)
//  Ghibli / Deku Tree: monumental, sereno, con una cara honda en la corteza.
//  NO rubber-hose (los mundos son lámina Humboldt): la vida es el balanceo
//  lento y la mirada ámbar que asoma de la sombra, no la caricatura.
// ═══════════════════════════════════════════════════════════════════════════
function construirEntRoble() {
  const g = new THREE.Group();
  const est = [];   // piezas estáticas fusionables

  const H = 22;                                  // altura total del Ent
  const Rt = 2.6;                                // radio del fuste

  // RAÍCES CONTRAFUERTE (lo ancla y le da porte de árbol viejo)
  for (let i = 0; i < 7; i++) {
    const a = (i / 7) * Math.PI * 2;
    const raiz = new THREE.CylinderGeometry(0.3, 0.9, 4.5, 5);
    est.push(pieza(raiz, C.raicilla, [Math.cos(a) * Rt * 0.9, 0.9, Math.sin(a) * Rt * 0.9], [Math.sin(a) * 0.5, -a, -Math.cos(a) * 0.5]));
  }
  // FUSTE: cilindro grueso ligeramente cónico, corteza gris del roble
  est.push(pieza(new THREE.CylinderGeometry(Rt * 0.7, Rt, H * 0.5, 12), C.roble, [0, H * 0.25, 0]));
  // engrosamientos/nudos de la corteza
  const rn = prng(77);
  for (let i = 0; i < 10; i++) {
    const a = rn() * Math.PI * 2, yy = 1 + rn() * H * 0.42;
    est.push(pieza(new THREE.IcosahedronGeometry(0.5 + rn() * 0.4, 0), mezcla(C.roble, C.raicilla, 0.4).getStyle(),
      [Math.cos(a) * Rt * 0.85, yy, Math.sin(a) * Rt * 0.85], null, [1, 1.4, 0.7]));
  }
  // musgo trepando el tronco (barba del árbol de niebla)
  for (let i = 0; i < 14; i++) {
    const a = rn() * Math.PI * 2, yy = 0.6 + rn() * H * 0.42;
    est.push(pieza(new THREE.IcosahedronGeometry(0.35 + rn() * 0.25, 0), rn() > 0.4 ? C.musgo : C.liquen,
      [Math.cos(a) * Rt * 0.82, yy, Math.sin(a) * Rt * 0.82], null, [1.2, 0.6, 0.5]));
  }
  // RAMAS gruesas hacia la copa
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2 + 0.3;
    const lr = 6 + rn() * 2;
    est.push(pieza(new THREE.CylinderGeometry(0.28, 0.7, lr, 6), C.roble,
      [Math.cos(a) * Rt * 0.7, H * 0.5, Math.sin(a) * Rt * 0.7], [Math.sin(a) * 0.7, -a, -Math.cos(a) * 0.7 - 0.4]));
  }
  const estaticoG = new THREE.Mesh(fusionar(est), MAT_VEG);
  g.add(estaticoG);

  // COPA: masa real de FollajeMasa (núcleo esculpido + cards densos), no
  // icosaedros faceteados. El Ent conserva su identidad en el fuste/cara.
  const copaG = crearCopaMasa(THREE, {
    esferas: [
      { c: [0, 0, 0], r: 8.2, esc: [1.35, 0.84, 1.35] },
      { c: [5.0, -0.3, 1.2], r: 3.5, esc: [1.18, 0.82, 1.08] },
      { c: [-5.1, 0.2, 0.4], r: 3.7, esc: [1.18, 0.84, 1.1] },
      { c: [0.5, 1.4, -4.6], r: 3.8, esc: [1.2, 0.8, 1.12] },
    ],
    seed: 88, brillo: 0.12, cobertura: 1.3, tamCard: 3.2,
    maxCards: 720, modulacion: 0.4,
    nucleoOpts: { segs: [18, 13], encoger: 0.9, rugosidad: 0.28, sombra: 0.48 },
    texOpts: { oscuro: C.niebla, medio: C.hojaCoriacea, claro: C.brote, hojas: 600, alargue: 2.2 },
    viento: { amplitud: 0.018, piso: 8, velocidad: 0.65 },
  }).grupo;
  copaG.position.y = H * 0.5 + 3;
  g.add(copaG);

  // ── LA CARA en la corteza (honda, serena; mira al frente +Z) ────────────────
  const caraG = new THREE.Group(); caraG.position.set(0, H * 0.3, Rt * 0.72);
  const matGrieta = new THREE.MeshStandardMaterial({ color: col(C.cacao), roughness: 1, flatShading: true });
  const matAmbar = new THREE.MeshStandardMaterial({ color: col(C.ambarVivo), roughness: 0.5, emissive: col(C.ambar), emissiveIntensity: 0.5 });
  const matMadera = new THREE.MeshStandardMaterial({ color: mezcla(C.roble, C.raicilla, 0.3), roughness: 1, flatShading: true });
  // cuencas hondas (dos pozos oscuros)
  const ojos = [];
  for (const sx of [-1, 1]) {
    const pozo = new THREE.Mesh(new THREE.SphereGeometry(0.62, 12, 10), matGrieta);
    pozo.position.set(sx * 1.15, 0.35, -0.15); pozo.scale.set(1.2, 1.25, 0.7); caraG.add(pozo);
    // ceja/cornisa de corteza sobre el ojo
    const ceja = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.4, 0.5), matMadera);
    ceja.position.set(sx * 1.15, 1.0, 0.1); ceja.rotation.z = sx * 0.18; caraG.add(ceja);
    // el iris ámbar CHICO, asomando del pozo (adelante del globo: no ojo de calavera)
    const globo = new THREE.Mesh(new THREE.SphereGeometry(0.42, 12, 10), matGrieta);
    globo.position.set(sx * 1.15, 0.35, 0.12); caraG.add(globo);
    const iris = new THREE.Mesh(new THREE.SphereGeometry(0.2, 12, 10), matAmbar);
    iris.position.set(sx * 1.15, 0.35, 0.5); caraG.add(iris);
    ojos.push(iris);
  }
  // nariz: un puente de corteza
  const nariz = new THREE.Mesh(new THREE.ConeGeometry(0.4, 1.6, 5), matMadera);
  nariz.position.set(0, -0.3, 0.35); nariz.rotation.x = Math.PI; caraG.add(nariz);
  // boca: hendidura serena de madera
  const boca = new THREE.Mesh(new THREE.TorusGeometry(0.7, 0.14, 5, 12, Math.PI), matGrieta);
  boca.position.set(0, -1.5, 0.4); boca.rotation.z = Math.PI; caraG.add(boca);
  g.add(caraG);

  // letrero flotante discreto lo pone la tarjeta; aquí guardamos referencias
  const update = (t) => {
    // balanceo pesado desde la raíz (lento, con inercia — nunca metrónomo)
    const sway = Math.sin(t * 0.28) * 0.018 + Math.sin(t * 0.11 + 1) * 0.01;
    copaG.rotation.z = sway; copaG.rotation.x = Math.cos(t * 0.23) * 0.012;
    g.rotation.z = sway * 0.25;
    // parpadeo ancestral: mucho abierto, un pestañeo corto
    const ph = (t * 0.5) % 6;
    const blink = ph > 5.7 ? 1 - Math.abs(ph - 5.85) / 0.15 : 0;
    const k = 1 - THREE.MathUtils.clamp(blink, 0, 1) * 0.9;
    ojos.forEach((o) => { o.scale.y = k; });
    // la mirada ámbar respira apenas (emisiva)
    matAmbar.emissiveIntensity = 0.42 + Math.sin(t * 0.7) * 0.12;
  };

  return { group: g, update };
}

// ── LOS HACES DE LUZ (god-rays): conos aditivos que bajan del dosel ───────────
function construirRayos(baseY) {
  const g = new THREE.Group();
  // el haz se hornea con degradé en su textura: fuerte arriba (entra por el
  // claro), se desvanece al tocar el suelo — así no es un cono CG de borde duro.
  const rayTex = hazTex();
  const mat = () => new THREE.MeshBasicMaterial({
    map: rayTex, color: col(C.sol), transparent: true, opacity: 0.05, depthWrite: false,
    blending: THREE.AdditiveBlending, side: THREE.DoubleSide, fog: false,
  });
  const rayos = [];
  // haces esbeltos: el principal cae sobre el Ent; los demás cosen el bosque.
  // Radios chicos + baja opacidad = shafts, no reflectores que queman el cuadro.
  const sitios = [
    [CLARO.x - 7, CLARO.z - 2, 5.5, 42, 0.11], [CLARO.x - 22, CLARO.z + 16, 3.6, 34, 0.08],
    [CLARO.x + 19, CLARO.z - 6, 3.2, 32, 0.07], [CLARO.x - 34, CLARO.z - 22, 2.8, 30, 0.06],
    [44, 58, 3.2, 30, 0.06], [-58, 38, 2.8, 28, 0.05], [34, -48, 2.8, 28, 0.05],
  ];
  for (const [x, z, rad, alto, op] of sitios) {
    const y0 = alturaBosque(x, z);
    const m = mat(); m.opacity = op; m._op0 = op;
    const cono = new THREE.Mesh(new THREE.ConeGeometry(rad, alto, 12, 1, true), m);
    cono.position.set(x, y0 + alto / 2, z);
    cono.rotation.x = 0.12;                        // apenas inclinado (sol rasante)
    g.add(cono); rayos.push(cono);
    // un charco tenue de luz donde el haz toca el suelo (ancla el haz al piso)
    const charco = new THREE.Mesh(new THREE.CircleGeometry(rad * 0.9, 16),
      new THREE.MeshBasicMaterial({ color: col('#fff0cf'), transparent: true, opacity: op * 1.3, depthWrite: false, blending: THREE.AdditiveBlending, fog: false }));
    charco.rotation.x = -Math.PI / 2; charco.position.set(x, y0 + 0.14, z); g.add(charco);
  }
  const update = (t) => {
    rayos.forEach((c, i) => { c.material.opacity = c.material._op0 * (0.8 + Math.sin(t * 0.5 + i) * 0.25); });
  };
  return { group: g, update };
}

// ── MOTAS suspendidas (esporas/polvo en los haces: aire vivo) ─────────────────
function construirMotas(baseY) {
  const N = 320;
  const pos = new Float32Array(N * 3);
  for (let i = 0; i < N; i++) {
    const x = rand(-120, 120), z = rand(-90, 130);
    pos[i * 3] = x; pos[i * 3 + 1] = alturaBosque(x, z) + rand(1, 26); pos[i * 3 + 2] = z;
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  // discretas: a 0.5 de opacidad leían como NIEVE y sumaban al velo
  const mat = new THREE.PointsMaterial({ map: motaTex(), color: col('#fff4d8'), size: 0.55, sizeAttenuation: true, transparent: true, opacity: 0.3, depthWrite: false, blending: THREE.AdditiveBlending, fog: true });
  const pts = new THREE.Points(geo, mat);
  pts.frustumCulled = false;
  const update = (t) => {
    const a = geo.attributes.position.array;
    for (let i = 0; i < N; i++) {
      a[i * 3 + 1] += Math.sin(t * 0.3 + i) * 0.004 + 0.006;    // suben despacio
      a[i * 3] += Math.sin(t * 0.2 + i * 0.5) * 0.004;
      if (a[i * 3 + 1] > alturaBosque(a[i * 3], a[i * 3 + 2]) + 28) a[i * 3 + 1] = alturaBosque(a[i * 3], a[i * 3 + 2]) + 1;
    }
    geo.attributes.position.needsUpdate = true;
  };
  return { points: pts, update };
}

// ── HUD: leyenda de los TRES ESTRATOS (instruccional, en usted) ───────────────
function montarLeyenda() {
  const ESTRATOS = [
    { c: '#5cba6a', n: 'El dosel', h: '9–17 m', d: 'El techo: encenillos, robles y la palma de cera que asoma. Recibe el sol de frente y hace la sombra de todo lo demás.' },
    { c: '#3f954f', n: 'El sotobosque', h: '2–6 m', d: 'A media altura, a la sombra: manos de oso, helechos arbóreos, chusque y la única flor fucsia. Aquí la luz llega colada y verde.' },
    { c: '#7d6038', n: 'El suelo', h: '0–1,2 m', d: 'Helechos, musgo, hojarasca y hongos: la fábrica callada donde el bosque se vuelve tierra otra vez.' },
  ];
  const box = document.createElement('div');
  box.style.cssText = 'position:fixed;left:14px;top:14px;z-index:30;max-width:min(40vw,340px);' +
    'font-family:system-ui,-apple-system,sans-serif;color:#eef4ec;pointer-events:none';
  let html = '<div style="font-size:1.05rem;font-weight:700;text-shadow:0 2px 10px rgba(0,0,0,.7);margin-bottom:2px">🌳 El bosque nativo de tres estratos</div>' +
    '<div style="font-size:.72rem;opacity:.8;text-shadow:0 1px 6px rgba(0,0,0,.8);margin-bottom:9px">Piso frío altoandino · 2.400–3.300 m · la niebla ocho meses al año</div>';
  for (const e of ESTRATOS) {
    html += '<div style="display:flex;gap:8px;margin-bottom:7px;background:linear-gradient(90deg,rgba(10,20,14,.72),rgba(10,20,14,.28));' +
      'border-left:4px solid ' + e.c + ';border-radius:7px;padding:6px 9px">' +
      '<span><b style="font-size:.86rem">' + e.n + '</b> <span style="opacity:.62;font-size:.68rem">' + e.h + '</span><br>' +
      '<span style="font-size:.68rem;opacity:.82;line-height:1.3">' + e.d + '</span></span></div>';
  }
  box.innerHTML = html;
  document.body.appendChild(box);
  // en móvil vertical, la leyenda estorba menos plegada
  if (innerWidth < 620) box.style.maxWidth = '82vw';
}

// ── aviso de entrada + botón de salida al valle ───────────────────────────────
function montarAvisoYSalida() {
  const salir = document.createElement('button');
  salir.textContent = '← Volver al valle';
  salir.style.cssText = 'position:fixed;right:14px;top:14px;z-index:31;border:1px solid rgba(180,220,190,.4);' +
    'background:rgba(10,20,14,.8);color:#eef4ec;border-radius:999px;padding:8px 16px;font:600 .8rem system-ui,sans-serif;' +
    'cursor:pointer;box-shadow:0 8px 24px rgba(0,0,0,.4)';
  salir.onclick = () => { location.href = './'; };
  document.body.appendChild(salir);

  return function avisar() {
    let el = document.getElementById('bosqueToast');
    if (!el) {
      el = document.createElement('div'); el.id = 'bosqueToast';
      el.style.cssText = 'position:fixed;left:50%;bottom:26px;transform:translateX(-50%);z-index:40;' +
        'background:rgba(10,22,14,.92);color:#eef4ec;border:1px solid rgba(180,220,190,.35);border-radius:999px;' +
        'padding:10px 20px;font:500 .88rem system-ui,sans-serif;box-shadow:0 10px 30px rgba(0,0,0,.5);transition:opacity .4s';
      document.body.appendChild(el);
    }
    el.textContent = '🌳 Está dentro del bosque · arrastre para mirar · toque el roble viejo';
    el.style.opacity = '1';
    clearTimeout(el._t); el._t = setTimeout(() => { el.style.opacity = '0'; }, 4200);
  };
}

// ── tarjeta del Ent-roble (lección del árbol maestro) ─────────────────────────
function tarjetaEnt() {
  let el = document.getElementById('bosqueEntCarta');
  if (el) { el.remove(); return; }
  el = document.createElement('div'); el.id = 'bosqueEntCarta';
  el.style.cssText = 'position:fixed;left:50%;bottom:70px;transform:translateX(-50%);z-index:45;max-width:min(88vw,420px);' +
    'background:rgba(10,22,14,.95);color:#eef4ec;border:1px solid rgba(224,166,59,.5);border-radius:16px;padding:16px 18px;' +
    'font-family:system-ui,-apple-system,sans-serif;box-shadow:0 16px 40px rgba(0,0,0,.55)';
  el.innerHTML =
    '<div style="font-size:1.05rem;font-weight:700;color:#f6c65a">🌳 El Roble — el maestro del bosque frío</div>' +
    '<div style="font-size:.8rem;line-height:1.45;margin-top:8px;opacity:.9">' +
    '<i>Quercus humboldtii</i> es el único roble nativo de Colombia y el árbol emblema de este piso. ' +
    'Un roble viejo carga su propio bosque encima: musgo, bromelias y orquídeas viven de él. ' +
    'Donde hay robledal, hay agua y hay sombra — por eso el bosque de niebla se cuida entero, no árbol por árbol.</div>' +
    '<div style="font-size:.7rem;opacity:.6;margin-top:10px">Toque otra vez para cerrar</div>';
  document.body.appendChild(el);
  clearTimeout(el._t); el._t = setTimeout(() => { el && el.remove(); }, 12000);
}
