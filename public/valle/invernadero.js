// ── invernadero.js — EL INVERNADERO VIVO, CULTIVO PROTEGIDO DE LA FINCA ────────
//
// Modo `?mundo=invernadero`. No es un mojón del valle: es ENTRAR bajo el plástico
// y caminar el túnel por dentro — la casa de arcos donde la luz entra FILTRADA y
// el tomate cuelga a tutorado. Archivo NUEVO y AUTÓNOMO, Three.js vanilla: monta
// su propio canvas/renderer/loop y SUPRIME el valle (main.js corre detrás y lo
// apagamos): no pelean dos renders. Su único enganche con main.js es el bloque
// marcado `// ── INVERNADERO ──`. Dialoga igual que papa.js, aguacatal.js,
// cafetal.js y mercado.js: mismo Humboldt/Ghibli, low-poly entintado, cero
// fotorrealismo. Otra CARA productiva del valle: el cultivo protegido — adelantar
// cosecha y tapar el granizo/la helada, a cambio de MANEJAR la humedad.
//
// GROUNDING — chagra/src/data (dictionary: mosca-blanca, DLI, microclima; glosario
// solo_alertar; iot-alertas-umbrales · AGROSAVIA/ICA):
//   · LA CUBIERTA: túnel/casa de arcos de guadua con plástico TRANSLÚCIDO que deja
//     pasar luz DIFUSA (no sombra dura). El invernadero es un MICROCLIMA: más
//     cálido y húmedo que afuera. Sirve para ADELANTAR la cosecha y PROTEGER de
//     granizo/helada — pero encierra humedad, y humedad alta sin ventilar = HONGOS.
//   · VENTILAR: cortinas laterales enrolladas y puertas abiertas. El sensor AVISA
//     ("está muy caliente el invernadero", >30 °C) pero NUNCA abre la válvula solo
//     (principio solo_alertar): una válvula pegada = encharcado = más riesgo.
//   · EL TOMATE A TUTORADO: mata indeterminada de ~2 m colgada de una CUERDA a un
//     alambre alto, en CAMA ELEVADA. Racimos con fruta verde (cuajando) y roja
//     (madura). El DLI de tomate/pimiento de invernadero es alto (20–30 mol/m²/día).
//   · RIEGO POR GOTEO: manguera negra con goteros que llevan el agua GOTA A GOTA a
//     la raíz — no moja la hoja (menos hongo) y ahorra agua.
//   · CONTROL BIOLÓGICO, no calendario de venenos: la MOSCA BLANCA (Trialeurodes
//     vaporariorum / Bemisia tabaci) explota en invernadero por el calor estable y
//     la falta de enemigos. Se maneja con TRAMPAS CROMÁTICAS amarillas y azules
//     (pegajosas), el parasitoide ENCARSIA FORMOSA, el hongo Beauveria bassiana y
//     mariquitas — no bañando la mata. Y el ABEJORRO (Bombus) POLINIZA por vibración
//     (buzz pollination): sin viento bajo el plástico, el fruto cuaja mejor con él.
//
// LAS CUATRO MIRADAS (encargo del operador):
//   · Peter Jackson — el túnel ÉPICO y HABITADO: los arcos de guadua recediendo
//     bajo la piel de plástico que brilla, las hileras de tomate colgadas a la
//     cuerda subiendo al alambre, la cama con el goteo y la trampa amarilla como
//     lugar trabajado, no maqueta.
//   · Nolan / Interstellar — LA IMAGEN QUE SE QUEDA: la luz difusa entrando por la
//     cubierta translúcida, los haces de polvo suspendido, la geometría de los
//     arcos repetidos perdiéndose al fondo del túnel.
//   · Zelda BOTW / Odyssey — color y ganas de recorrer: el verde jugoso del follaje
//     bajo la luz lechosa, el rojo de los racimos maduros, el amarillo/azul de las
//     trampas, el abejorro gordo zumbando de flor en flor.
//   · agroecólogo — la FIDELIDAD es el efecto especial: se lee el TUTORADO (cuerda
//     al alambre), la CAMA ELEVADA, el GOTEO a la raíz, las TRAMPAS cromáticas, el
//     abejorro polinizador y la cortina lateral enrollada para VENTILAR. Cada cosa
//     se lee por su silueta a 20 m.
//   · diseñador instruccional — la niña (11) y el campesino, EN USTED: la leyenda
//     de la cubierta, el goteo y el control biológico enseñan por qué el plástico
//     adelanta la cosecha pero exige ventilar, sin gamificar.
//
// LEY DE LA CASA: TODO anclado al suelo con `alturaInv(x,z)` — cero flotando. La
// fusión de mallas evita el bug clásico de `mergeGeometries` (mezclar indexadas con
// no-indexadas devuelve NULL en silencio): aquí todo se desindexa antes y sólo
// viajan position + color; la normal se recalcula.

import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { ShaderGradeoFinal } from './lib3d/post/gradeoFinal.js';
// three.quarks: el polvo suspendido en los haces de luz filtrada — LA firma
// Nolan del invernadero («los haces de polvo suspendidos», cabecera).
import { crearMotas } from './lib3d-motas.js';

// ── PALETA MADRE (el túnel a media mañana, luz lechosa filtrada por el plástico) ─
const C = {
  // el follaje del tomate: verde jugoso, hoja compuesta; brotes claros
  hoja: '#3a6a3c', hojaMedia: '#4c7e46', hojaClara: '#69a556', hojaOscura: '#2c5230', hojaJoven: '#84bb63',
  // los frutos: tomate verde cuajando → pintón → rojo maduro
  tomVerde: '#7fa84a', tomPinton: '#d69a3e', tomRojo: '#d1402e', tomRojoBrillo: '#e85c3f', tomCaliz: '#4c7a3a',
  // pimentón: verde, rojo, amarillo en la misma mata
  pimVerde: '#3f8a3c', pimRojo: '#c8342a', pimAmar: '#e6b93a',
  // lechuga de hoja: verde claro rosetado
  lechuga: '#7fc059', lechugaCogollo: '#a7d67a', lechugaMorada: '#8a5a86',
  // la cubierta de plástico: translúcida blanca-azulada (deja pasar luz difusa)
  plastico: '#dfeaf0', plasticoTinte: '#c8dce8', cortina: '#e8e4d6', cortinaSombra: '#c2bda6',
  // la estructura: guadua (bambú) tostada verdosa, con nudos; alambre metálico
  guadua: '#b8a35a', guaduaNudo: '#8a7638', guaduaVerde: '#9aaa55', madera: '#8a6a45', maderaClara: '#c7ad7c',
  alambre: '#9aa0a2', metal: '#8a8f92',
  // la cama elevada y el sustrato vivo (oscuro, húmedo, con mantillo)
  camaMadera: '#9c7a4c', camaMaderaOsc: '#6e502e', sustrato: '#3a2e22', sustratoHumedo: '#2a2016', mantillo: '#4a3a28',
  // el riego por goteo: manguera negra, goteros, gota de agua
  manguera: '#232323', gotero: '#3a3a3a', gota: '#bfe0ec',
  // las trampas cromáticas: amarilla y azul pegajosas
  trampaAmar: '#f2d21e', trampaAzul: '#2f6fd6', trampaBrillo: '#ffe94a',
  // fauna del control biológico: abejorro (Bombus), mariquita, mosca blanca plaga
  abejorroNegro: '#241f18', abejorroAmar: '#e6b52a', mariquita: '#c8402e', moscaBlanca: '#f2f0e6',
  // piso y aire del túnel
  piso: '#6a5a44', pisoClaro: '#8a7656', cieloAfuera: '#a9c6d2', neblina: '#dfe8ea',
};
const col = (h) => new THREE.Color(h);
const mezcla = (a, b, t) => col(a).lerp(col(b), t);
const rand = (a, b) => a + Math.random() * (b - a);

// ── PRNG determinista (mismo invernadero cada carga: el gate compara) ──────────
function prng(semilla) {
  let a = semilla >>> 0;
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ── EL SUELO (el invernadero se para en una explanada NIVELADA de la finca) ─────
// El piso protegido va casi plano (leveled): la cama no puede bailar. Afuera del
// túnel una ondulación LEVE da contexto de finca. `alturaInv` es la ÚNICA verdad.
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
// dimensiones del túnel (ejes: largo = Z, ancho = X, alto = Y)
const INV = { W2: 2.7, SH: 1.55, len: 26, z0: -13, z1: 13 };  // half-width, hombro, largo
INV.ridge = INV.SH + INV.W2;                                   // ~4.25 m al caballete
const dentroPad = (x, z) => Math.abs(x) < INV.W2 + 3.2 && z > INV.z0 - 3 && z < INV.z1 + 3;
function alturaInv(x, z) {
  // afuera: leve ondulación de la finca; el pad del túnel se aplana a 0
  const ond = (fbm(x * 0.012 + 5, z * 0.012 - 3) - 0.5) * 6;
  const micro = (fbm(x * 0.06, z * 0.06) - 0.5) * 0.9;
  let y = ond + micro;
  const dx = Math.max(0, Math.abs(x) - (INV.W2 + 3.2));
  const dz = Math.max(0, Math.max(INV.z0 - 3 - z, z - (INV.z1 + 3)));
  const fuera = Math.min(1, Math.hypot(dx, dz) / 18);          // 0 dentro, 1 lejos
  const plano = 1 - fuera;
  return y * (1 - plano * 0.95);                                // dentro ≈ 0 (nivelado)
}

// ── TALLER DE MALLAS ───────────────────────────────────────────────────────────
// pieza(geo,color) hornea color por vértice; poner() lo coloca; fusionar() une una
// lista en UNA geometría (desindexada, position+color, normal recalculada — nunca
// `mergeGeometries` a pelo: devuelve null en silencio y la planta no sale).
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

// ── material único para la vegetación: color por vértice, flat (low-poly Ghibli) ─
const MAT_VEG = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 1, flatShading: true });

// ═══════════════════════════════════════════════════════════════════════════
//  LOS ARQUETIPOS VEGETALES, POR SU SILUETA (cada uno se lee a 20 m)
// ═══════════════════════════════════════════════════════════════════════════

// RACIMO DE TOMATE: la cruceta con 4–6 frutos, verdes (cuajando) y rojos (maduros).
function pushRacimo(p, x, y, z, seed) {
  const r = prng(seed);
  const n = 3 + Math.floor(r() * 3);
  // el pedúnculo del racimo
  p.push(pieza(new THREE.CylinderGeometry(0.012, 0.018, 0.16, 4), C.tomCaliz, [x, y, z], [0.4, 0, 0.3]));
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2 + r();
    const d = 0.05 + r() * 0.05;
    const madura = r();
    const cf = madura < 0.5 ? C.tomRojo : madura < 0.72 ? C.tomPinton : C.tomVerde;
    const rr = 0.06 + r() * 0.03;
    p.push(pieza(new THREE.IcosahedronGeometry(rr, 0),
      madura < 0.5 ? mezcla(C.tomRojo, C.tomRojoBrillo, r()).getStyle() : cf,
      [x + Math.cos(a) * d, y - 0.06 - r() * 0.06, z + Math.sin(a) * d], null, [1, 0.94, 1]));
  }
}

// LA MATA DE TOMATE A TUTORADO (Solanum lycopersicum, indeterminado): tallo alto y
// esbelto que sube ~1.9 m, hoja compuesta en pisos, racimos colgando alternos,
// corona de brotes tiernos arriba. Se lee la COLUMNA verde con los puntos rojos.
function geomTomate(seed = 1, { H = 1.9, conFruto = true } = {}) {
  const r = prng(seed), p = [];
  // el tallo principal (con un leve zigzag: la mata guiada a la cuerda)
  const NS = 7;
  let px = 0, pz = 0;
  for (let s = 0; s < NS; s++) {
    const y0 = (s / NS) * H, y1 = ((s + 1) / NS) * H;
    const nx = (r() - 0.5) * 0.08, nz = (r() - 0.5) * 0.08;
    p.push(pieza(new THREE.CylinderGeometry(0.02 - s * 0.002, 0.03 - s * 0.002, y1 - y0, 5),
      mezcla(C.hojaOscura, C.hojaMedia, 0.3).getStyle(),
      [(px + nx) / 2, (y0 + y1) / 2, (pz + nz) / 2]));
    px = nx; pz = nz;
  }
  // los pisos de hoja compuesta (foliolos en abanico bajo)
  const pisos = 5;
  for (let s = 1; s <= pisos; s++) {
    const yy = (s / (pisos + 1)) * H;
    const nH = 3 + Math.floor(r() * 2);
    for (let h = 0; h < nH; h++) {
      const a = (h / nH) * Math.PI * 2 + r() * 0.8;
      const d = 0.22 + r() * 0.18;
      p.push(pieza(new THREE.IcosahedronGeometry(0.16 + r() * 0.08, 0),
        mezcla(C.hoja, r() < 0.5 ? C.hojaClara : C.hojaOscura, r()).getStyle(),
        [Math.cos(a) * d, yy, Math.sin(a) * d], [0, -a, 0.35], [1.5, 0.32, 1.0]));
    }
  }
  // los racimos colgando (fruta verde + roja) — alternos a lo largo del tallo
  if (conFruto) {
    const nr = 2 + Math.floor(r() * 3);
    for (let i = 0; i < nr; i++) {
      const yy = H * (0.28 + i * 0.15 + r() * 0.05);
      const a = r() * Math.PI * 2, d = 0.18 + r() * 0.06;
      pushRacimo(p, Math.cos(a) * d, yy, Math.sin(a) * d, seed * 31 + i * 7);
    }
  }
  // corona de brotes tiernos (la mata sigue creciendo hacia el alambre)
  p.push(pieza(new THREE.IcosahedronGeometry(0.14, 0), C.hojaJoven, [0, H * 1.0, 0], null, [1.1, 0.7, 1.1]));
  // pequeñas flores amarillas del tomate (lo que el abejorro poliniza)
  for (let f = 0; f < 3; f++) {
    const yy = H * (0.55 + r() * 0.35), a = r() * 6.28, d = 0.14 + r() * 0.08;
    p.push(pieza(new THREE.IcosahedronGeometry(0.045, 0), '#e8d24a',
      [Math.cos(a) * d, yy, Math.sin(a) * d], null, [1.3, 0.4, 1.3]));
  }
  return fusionar(p);
}

// LA MATA DE PIMENTÓN (Capsicum annuum): arbusto bajo (~0.6 m) y compacto, hoja
// lustrosa, con frutos colgando verdes/rojos/amarillos en la misma mata.
function geomPimenton(seed = 2) {
  const r = prng(seed), p = [];
  const H = 0.55 + r() * 0.2;
  p.push(pieza(new THREE.CylinderGeometry(0.025, 0.04, H, 5), C.hojaOscura, [0, H / 2, 0]));
  const NL = 8 + Math.floor(r() * 4);
  for (let i = 0; i < NL; i++) {
    const a = r() * 6.28, d = 0.1 + r() * 0.22, yy = H * (0.4 + r() * 0.7);
    p.push(pieza(new THREE.IcosahedronGeometry(0.12 + r() * 0.06, 0),
      mezcla(C.hoja, C.hojaClara, r()).getStyle(),
      [Math.cos(a) * d, yy, Math.sin(a) * d], null, [1.3, 0.5, 1.1]));
  }
  // los pimentones (bloques cónicos colgando)
  const nf = 2 + Math.floor(r() * 3);
  for (let i = 0; i < nf; i++) {
    const a = r() * 6.28, d = 0.12 + r() * 0.14, yy = H * (0.35 + r() * 0.5);
    const u = r();
    const cf = u < 0.5 ? C.pimVerde : u < 0.78 ? C.pimRojo : C.pimAmar;
    p.push(pieza(new THREE.ConeGeometry(0.075, 0.2, 6), cf,
      [Math.cos(a) * d, yy, Math.sin(a) * d], [Math.PI, 0, (r() - 0.5) * 0.4]));
  }
  return fusionar(p);
}

// LA LECHUGA DE HOJA (Lactuca sativa): roseta baja de hojas rizadas, verde claro,
// alguna morada. Va en cama/bolsa; se lee la borla achatada a ras de sustrato.
function geomLechuga(seed = 3, { morada = false } = {}) {
  const r = prng(seed), p = [];
  const base = morada ? C.lechugaMorada : C.lechuga;
  const NL = 7 + Math.floor(r() * 4);
  for (let i = 0; i < NL; i++) {
    const a = (i / NL) * Math.PI * 2 + r() * 0.3;
    const d = 0.1 + r() * 0.08, yy = 0.06 + r() * 0.06;
    p.push(pieza(new THREE.IcosahedronGeometry(0.11 + r() * 0.04, 0),
      mezcla(base, C.lechugaCogollo, r() * 0.6).getStyle(),
      [Math.cos(a) * d, yy, Math.sin(a) * d], [0, -a, 0.9], [1.5, 0.35, 1.0]));
  }
  // el cogollo apretado del centro
  p.push(pieza(new THREE.IcosahedronGeometry(0.09, 0), C.lechugaCogollo, [0, 0.09, 0], null, [1, 0.7, 1]));
  return fusionar(p);
}

// UN TRAMO DE GUADUA (bambú): caña con nudos, para las cerchas del túnel.
function geomGuadua(largo, seed = 5, radio = 0.05) {
  const r = prng(seed), p = [];
  p.push(pieza(new THREE.CylinderGeometry(radio, radio * 1.05, largo, 7), C.guadua, [0, 0, 0]));
  // los nudos (anillos) cada ~0.9 m
  const nn = Math.max(1, Math.floor(largo / 0.9));
  for (let i = 1; i < nn; i++) {
    p.push(pieza(new THREE.TorusGeometry(radio * 1.15, radio * 0.35, 5, 8), C.guaduaNudo,
      [0, -largo / 2 + (i / nn) * largo, 0], [Math.PI / 2, 0, 0]));
  }
  return fusionar(p);
}

// ── material único: color por vértice para la guadua/madera fusionadas ────────
const MAT_ESTR = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.9, flatShading: true });

// ── texturas pintadas (sin cargar imágenes) ──────────────────────────────────
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
  g.addColorStop(0, 'rgba(24,20,14,0.5)'); g.addColorStop(0.6, 'rgba(24,20,14,0.2)'); g.addColorStop(1, 'rgba(0,0,0,0)');
  c.fillStyle = g; c.beginPath(); c.arc(r, r, r, 0, Math.PI * 2); c.fill();
  _sombraTex = new THREE.CanvasTexture(cv);
  return _sombraTex;
}

// ── FAUNA · sprites pintados: abejorro (poliniza), mariquita (control), mosca blanca (plaga)
function abejorroTex() {
  const cv = document.createElement('canvas'); cv.width = cv.height = 64;
  const c = cv.getContext('2d');
  // alas translúcidas
  c.fillStyle = 'rgba(230,236,240,0.5)';
  for (const sx of [-1, 1]) { c.beginPath(); c.ellipse(32 + sx * 10, 24, 9, 6, sx * 0.3, 0, Math.PI * 2); c.fill(); }
  // cuerpo gordo con bandas
  c.fillStyle = '#241f18'; c.beginPath(); c.ellipse(32, 38, 11, 14, 0, 0, Math.PI * 2); c.fill();
  c.fillStyle = '#e6b52a';
  c.beginPath(); c.ellipse(32, 34, 11, 4, 0, 0, Math.PI * 2); c.fill();
  c.beginPath(); c.ellipse(32, 44, 9, 3.5, 0, 0, Math.PI * 2); c.fill();
  const tx = new THREE.CanvasTexture(cv); tx.colorSpace = THREE.SRGBColorSpace; return tx;
}
function mariquitaTex() {
  const cv = document.createElement('canvas'); cv.width = cv.height = 64;
  const c = cv.getContext('2d');
  c.fillStyle = '#c8402e'; c.beginPath(); c.ellipse(32, 34, 12, 11, 0, 0, Math.PI * 2); c.fill();
  c.fillStyle = '#201a16';
  c.fillRect(31, 22, 2, 24);
  for (const [px, py] of [[24, 30], [40, 30], [26, 40], [38, 40], [32, 26]]) { c.beginPath(); c.arc(px, py, 2.6, 0, Math.PI * 2); c.fill(); }
  c.beginPath(); c.arc(32, 22, 5, 0, Math.PI * 2); c.fill();
  const tx = new THREE.CanvasTexture(cv); tx.colorSpace = THREE.SRGBColorSpace; return tx;
}
function moscaBlancaTex() {
  const cv = document.createElement('canvas'); cv.width = cv.height = 32;
  const c = cv.getContext('2d');
  c.fillStyle = 'rgba(242,240,230,0.95)';
  c.beginPath(); c.ellipse(16, 16, 5, 3, 0, 0, Math.PI * 2); c.fill();
  const tx = new THREE.CanvasTexture(cv); tx.colorSpace = THREE.SRGBColorSpace; return tx;
}

// ═══════════════════════════════════════════════════════════════════════════
//  INIT — monta el mundo autónomo
// ═══════════════════════════════════════════════════════════════════════════
export function initInvernadero() {
  const params = new URLSearchParams(location.search);
  const camModo = params.get('cam');          // `hero`/`tunel`/`cama` = cuadros fijos del gate

  // ── SUPRIMIR EL VALLE (main.js corre detrás) ────────────────────────────────
  const sup = document.createElement('style');
  sup.textContent =
    'body.enInvernadero #c,body.enInvernadero #onb,body.enInvernadero #load,body.enInvernadero #hud,' +
    'body.enInvernadero #capaLugares,body.enInvernadero #barraMover,body.enInvernadero #guiaSel,' +
    'body.enInvernadero #guiaV,body.enInvernadero #ventanaM,body.enInvernadero #compaiFotoBtn,' +
    'body.enInvernadero #mmapa{display:none!important}' +
    'body.enInvernadero{background:#c8dce8}';
  document.head.appendChild(sup);
  document.body.classList.add('enInvernadero');
  const pararValle = () => { try { window.__r && window.__r.setAnimationLoop(null); } catch (e) { /* aún no */ } };
  pararValle(); setTimeout(pararValle, 300); setTimeout(pararValle, 1200);

  // ── CANVAS + RENDERER PROPIOS ───────────────────────────────────────────────
  const canvas = document.createElement('canvas'); canvas.id = 'cInv';
  canvas.style.cssText = 'position:fixed;inset:0;width:100vw;height:100vh;display:block;z-index:20;touch-action:none';
  document.body.appendChild(canvas);
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.setSize(innerWidth, innerHeight);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.2;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  window.__r = renderer;                        // hook del gate (draw calls + renderer)
  window.__rInv = renderer;

  const scene = new THREE.Scene();
  scene.background = cieloLechoso();
  scene.fog = new THREE.FogExp2(0xdfe8ea, 0.006);   // aire húmedo del túnel, LEVE

  const camera = new THREE.PerspectiveCamera(58, innerWidth / innerHeight, 0.3, 1200);
  window.__cam = camera; window.__scene = scene;
  window.__h = alturaInv;                       // sonda del gate

  const raiz = new THREE.Group(); scene.add(raiz);

  // ── LUZ: la clave del invernadero es la luz DIFUSA que entra por el plástico ──
  //    Fuerte hemisférica lechosa (rebote del plástico) + un sol suave y velado.
  scene.add(new THREE.HemisphereLight(0xf2f6f4, 0x5a5240, 1.15));
  const sol = new THREE.DirectionalLight(0xfdf6e6, 1.15);
  sol.position.set(40, 90, 30); scene.add(sol);
  const relleno = new THREE.DirectionalLight(0xc8dce8, 0.5);
  relleno.position.set(-40, 50, -30); scene.add(relleno);

  // ── EL SUELO (explanada nivelada + piso de tierra apisonada del túnel) ───────
  raiz.add(construirSuelo());

  // ── LA ESTRUCTURA: la casa de arcos de guadua + la cubierta translúcida ──────
  const estructura = construirEstructura();
  raiz.add(estructura.group);

  // ── LAS CAMAS ELEVADAS con el sustrato, el goteo, los cultivos y las trampas ─
  const camas = construirCamas();
  raiz.add(camas.group);

  // ── neblina/polvo suspendido en los haces de luz filtrada ───────────────────
  const motas = construirMotas();
  raiz.add(motas.points);

  // ── FAUNA: el abejorro que poliniza + mariquitas + la mosca blanca en la trampa
  const fauna = construirFauna(camas.trampas);
  raiz.add(fauna.group);

  // ── CÁMARA: 3/4 dentro del túnel, cerca de la boca abierta — se lee el corredor
  //    de arcos recediendo, las hileras de tomate a tutorado, la cama con el goteo
  //    y la trampa amarilla. NO enterrada en el follaje.
  const HERO_POS = new THREE.Vector3(1.75, 2.25, 10.8);
  const HERO_TGT = new THREE.Vector3(-0.35, 1.45, -8.5);

  const controls = new OrbitControls(camera, canvas);
  controls.enableDamping = true; controls.dampingFactor = 0.08;
  controls.minDistance = 2.4; controls.maxDistance = 60;
  controls.maxPolarAngle = 1.53;               // no meterse bajo el suelo
  controls.target.copy(HERO_TGT);
  controls.enabled = false;
  window.__ctl = controls;

  let introDone = false, introStart = null;
  const introPos = new THREE.CatmullRomCurve3([
    new THREE.Vector3(14, 8.5, 28),            // afuera y alto, viendo el túnel entero
    new THREE.Vector3(8, 5.2, 20),
    new THREE.Vector3(4.2, 3.2, 15),           // entrando por la boca
    HERO_POS.clone(),
  ]);
  const introTgt = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0, 2.4, 6),
    new THREE.Vector3(-0.2, 1.8, 0),
    HERO_TGT.clone(), HERO_TGT.clone(),
  ]);
  const INTRO_S = 7.0;

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
  } else if (camModo === 'tunel') {
    // el corredor central: los arcos y la cubierta translúcida recediendo, las
    // hileras de tomate colgadas a la cuerda a lado y lado.
    introDone = true;
    camera.position.set(0, 1.75, 12.6);
    camera.lookAt(0, 1.7, -13);
  } else if (camModo === 'cama') {
    // de cerca: la cama elevada con el sustrato, la manguera de goteo y la trampa.
    introDone = true;
    camera.position.set(2.9, 1.15, 3.2);
    camera.lookAt(1.4, 0.45, -1.5);
  } else if (params.get('onb') === '0') {
    // lanzamiento directo (y el gate): sin vuelo de intro — al cuadro hero, con los
    // controles ya vivos (determinista para la captura).
    introDone = true;
    darControl();
  } else {
    camera.position.copy(introPos.getPoint(0)); camera.lookAt(introTgt.getPoint(0));
  }

  // ── HUD: la leyenda del INVERNADERO (instruccional, en usted) ────────────────
  montarLeyenda();
  const avisar = montarAvisoYSalida();

  // ── raycast: la cubierta/arcos → "por qué un invernadero" · la cama → control biológico
  const ray = new THREE.Raycaster(), pt = new THREE.Vector2();
  let dx0 = 0, dy0 = 0, dt0 = 0;
  canvas.addEventListener('pointerdown', (e) => { dx0 = e.clientX; dy0 = e.clientY; dt0 = performance.now(); });
  canvas.addEventListener('pointerup', (e) => {
    if (Math.hypot(e.clientX - dx0, e.clientY - dy0) > 9 || performance.now() - dt0 > 600) return;
    pt.x = (e.clientX / innerWidth) * 2 - 1; pt.y = -(e.clientY / innerHeight) * 2 + 1;
    ray.setFromCamera(pt, camera);
    if (ray.intersectObject(camas.group, true).length) { tarjetaControlBiologico(); return; }
    if (ray.intersectObject(estructura.group, true).length) tarjetaPorQue();
  });

  // ── POST: bloom suave y lechoso (la luz que rebota en el plástico) ───────────
  const composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene, camera));
  composer.addPass(new UnrealBloomPass(new THREE.Vector2(innerWidth, innerHeight), 0.3, 0.8, 0.82));
  composer.addPass(new OutputPass());
  // gradeo fílmico final unificado (lib3d)
  const gradeo = new ShaderPass(ShaderGradeoFinal);
  gradeo.uniforms.uTexel.value.set(1 / innerWidth, 1 / innerHeight);
  composer.addPass(gradeo);

  // ── POLVO SUSPENDIDO GPU (three.quarks vía lib3d-motas) ────────────────────
  // Motas finas que respiran bajo la cubierta translúcida, dentro del túnel.
  // Additive + tamaño pequeño = haces de polvo que se leen al cruzar la luz.
  const polvo = crearMotas(scene, {
    color: '#f6f2e4', opacidad: 0.42,
    tam: [0.05, 0.16], vida: [7, 13], emisionSeg: 90,
    caja: [INV.W2 * 1.9, INV.ridge - 0.6, (INV.z1 - INV.z0) * 0.92],
    centro: new THREE.Vector3(0, INV.ridge * 0.5 + 0.4, (INV.z0 + INV.z1) / 2),
    viento: new THREE.Vector3(0.12, 0, 0.05), subida: 0.015,
  });

  addEventListener('resize', () => {
    camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix();
    renderer.setSize(innerWidth, innerHeight); composer.setSize(innerWidth, innerHeight);
    gradeo.uniforms.uTexel.value.set(1 / innerWidth, 1 / innerHeight);
  });

  const loadEl = document.getElementById('load');
  if (loadEl) { loadEl.style.opacity = 0; setTimeout(() => loadEl.remove(), 700); }

  // ── LOOP ─────────────────────────────────────────────────────────────────────
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
    camas.update(t);
    fauna.update(t, camera);
    motas.update(t);              // motas Points de base (se mantienen)
    polvo.update(delta);          // polvo suspendido GPU (three.quarks)
    gradeo.uniforms.uSemilla.value = (t % 1000);
    composer.render();
  });

  window.__invernadero = { scene, camera, renderer, controls, camas, estructura };
  return window.__invernadero;
}

// ── CIELO LECHOSO (degradé celeste pálido a blanco neblinoso — cielo velado) ────
function cieloLechoso() {
  const cv = document.createElement('canvas'); cv.width = 16; cv.height = 512;
  const c = cv.getContext('2d');
  const g = c.createLinearGradient(0, 0, 0, 512);
  g.addColorStop(0.00, C.cieloAfuera);
  g.addColorStop(0.5, C.plasticoTinte);
  g.addColorStop(1.00, C.neblina);
  c.fillStyle = g; c.fillRect(0, 0, 16, 512);
  const tx = new THREE.CanvasTexture(cv); tx.colorSpace = THREE.SRGBColorSpace;
  return tx;
}

// ── EL SUELO: explanada nivelada, piso de tierra apisonada bajo el túnel ────────
function construirSuelo() {
  const SIZE = 220, SEG = 120;
  const geo = new THREE.PlaneGeometry(SIZE, SIZE, SEG, SEG);
  geo.rotateX(-Math.PI / 2);
  const pos = geo.attributes.position;
  const colr = new Float32Array(pos.count * 3);
  const piso = col(C.piso), pisoClaro = col(C.pisoClaro), tierra = col('#5c4a34');
  const pastoAfuera = col('#6f8a4a'), mant = col(C.mantillo);
  const tmp = new THREE.Color();
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), z = pos.getZ(i);
    const y = alturaInv(x, z);
    pos.setY(i, y);
    const dentro = Math.abs(x) < INV.W2 + 1.4 && z > INV.z0 - 1 && z < INV.z1 + 1;
    if (dentro) {
      // el piso apisonado del túnel: tierra clara con el pasillo central marcado
      tmp.copy(piso);
      if (Math.abs(x) < 0.9) tmp.lerp(pisoClaro, 0.5);          // el pasillo pisado
      if (fbm(x * 0.5, z * 0.5) < 0.35) tmp.lerp(tierra, 0.35);
    } else {
      // afuera: pasto de la finca con vetas de tierra
      tmp.copy(pastoAfuera);
      const d = fbm(x * 0.06 + 3, z * 0.06 - 2);
      if (d > 0.6) tmp.lerp(tierra, (d - 0.6) * 1.5);
      if (fbm(x * 0.12, z * 0.12) < 0.28) tmp.lerp(mant, 0.25);
    }
    colr[i * 3] = tmp.r; colr[i * 3 + 1] = tmp.g; colr[i * 3 + 2] = tmp.b;
  }
  geo.setAttribute('color', new THREE.BufferAttribute(colr, 3));
  geo.computeVertexNormals();
  return new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 1, flatShading: false }));
}

// ═══════════════════════════════════════════════════════════════════════════
//  LA ESTRUCTURA — la casa de arcos de guadua + la cubierta translúcida + las
//  cortinas laterales enrolladas para ventilar. El caparazón que hace del mundo
//  un invernadero DE VERDAD y explica la luz filtrada.
// ═══════════════════════════════════════════════════════════════════════════
function construirEstructura() {
  const g = new THREE.Group();
  const { W2, SH, z0, z1, len } = INV;

  // ── LAS CERCHAS DE GUADUA: poste vertical + arco de medio punto, cada ~2 m ────
  const ribGeoms = [];
  const nRibs = Math.round(len / 2) + 1;
  for (let i = 0; i < nRibs; i++) {
    const z = z0 + (i / (nRibs - 1)) * len;
    const rib = [];
    // dos postes verticales hasta el hombro
    for (const sx of [-1, 1]) {
      rib.push(poner(geomGuadua(SH, 500 + i * 3 + sx, 0.055), [sx * W2, alturaInv(sx * W2, z) + SH / 2, z]));
    }
    // el arco de medio punto (semicírculo) sobre los hombros
    const segs = 14;
    for (let s = 0; s < segs; s++) {
      const a0 = Math.PI - (s / segs) * Math.PI;       // de -W2 (izq) a +W2 (der)
      const a1 = Math.PI - ((s + 1) / segs) * Math.PI;
      const x0 = Math.cos(a0) * W2, y0 = SH + Math.sin(a0) * W2;
      const x1 = Math.cos(a1) * W2, y1 = SH + Math.sin(a1) * W2;
      const mx = (x0 + x1) / 2, my = (y0 + y1) / 2;
      const dl = Math.hypot(x1 - x0, y1 - y0);
      const ang = Math.atan2(y1 - y0, x1 - x0);
      rib.push(pieza(new THREE.CylinderGeometry(0.05, 0.05, dl + 0.02, 6), C.guadua,
        [mx, alturaInv(0, z) + my, z], [0, 0, ang - Math.PI / 2]));
    }
    ribGeoms.push(fusionar(rib));
  }
  // fusionar todas las cerchas en una malla (barato)
  g.add(new THREE.Mesh(fusionar(ribGeoms), MAT_ESTR));

  // ── LAS CORREAS (largueros longitudinales que amarran las cerchas) ────────────
  const corr = [];
  const alturasCorrea = [
    { x: 0, y: SH + W2 },                 // caballete
    { x: -Math.cos(0.6) * W2, y: SH + Math.sin(0.6) * W2 },
    { x: Math.cos(0.6) * W2, y: SH + Math.sin(0.6) * W2 },
    { x: -W2, y: SH * 0.6 }, { x: W2, y: SH * 0.6 },
  ];
  for (const a of alturasCorrea) {
    corr.push(pieza(new THREE.CylinderGeometry(0.035, 0.035, len, 6), C.guaduaNudo,
      [a.x, alturaInv(0, 0) + a.y, (z0 + z1) / 2], [Math.PI / 2, 0, 0]));
  }
  // el ALAMBRE alto del tutorado (de aquí cuelgan las cuerdas del tomate)
  for (const sx of [-1, 1]) {
    corr.push(pieza(new THREE.CylinderGeometry(0.012, 0.012, len, 4), C.alambre,
      [sx * 1.55, alturaInv(0, 0) + 2.55, (z0 + z1) / 2], [Math.PI / 2, 0, 0]));
  }
  g.add(new THREE.Mesh(fusionar(corr), MAT_ESTR));

  // ── LA CUBIERTA DE PLÁSTICO TRANSLÚCIDO (lofting del arco a lo largo del túnel) ─
  //    Una piel semicilíndrica semitransparente: deja pasar la luz difusa y brilla.
  const cubierta = new THREE.Mesh(cubiertaGeom(W2, SH, z0, z1), new THREE.MeshStandardMaterial({
    color: col(C.plastico), transparent: true, opacity: 0.24, roughness: 0.15, metalness: 0.0,
    side: THREE.DoubleSide, depthWrite: false, emissive: col(C.plasticoTinte), emissiveIntensity: 0.25,
  }));
  g.add(cubierta);

  // ── EL FRONTÓN DEL FONDO (gable translúcido cerrando el túnel, con puerta) ────
  const gableFar = cubiertaFrontonGeom(W2, SH, z0 - 0.05);
  g.add(new THREE.Mesh(gableFar, new THREE.MeshStandardMaterial({
    color: col(C.plastico), transparent: true, opacity: 0.2, roughness: 0.15,
    side: THREE.DoubleSide, depthWrite: false, emissive: col(C.plasticoTinte), emissiveIntensity: 0.2,
  })));

  // ── LAS CORTINAS LATERALES ENROLLADAS (para ventilar: humedad = hongos) ───────
  //    Un rollo de plástico blanco a media altura y la faldilla baja: el aire entra.
  const cortinas = [];
  for (const sx of [-1, 1]) {
    // el rollo enrollado en la parte alta del faldón lateral
    cortinas.push(pieza(new THREE.CylinderGeometry(0.14, 0.14, len - 0.4, 10), C.cortina,
      [sx * (W2 + 0.02), alturaInv(0, 0) + SH * 0.62, (z0 + z1) / 2], [Math.PI / 2, 0, 0]));
    // la faldilla baja que queda (desde el suelo hasta ~0.5 m): translúcida
  }
  const gc = new THREE.Mesh(fusionar(cortinas), new THREE.MeshStandardMaterial({
    color: col(C.cortina), roughness: 0.6, flatShading: true,
  }));
  g.add(gc);
  // faldillas bajas translúcidas (plástico) a ras de suelo
  for (const sx of [-1, 1]) {
    const fald = new THREE.Mesh(new THREE.PlaneGeometry(len - 0.4, 0.5),
      new THREE.MeshStandardMaterial({ color: col(C.plastico), transparent: true, opacity: 0.22, roughness: 0.2, side: THREE.DoubleSide, depthWrite: false }));
    fald.rotation.y = Math.PI / 2;
    fald.position.set(sx * W2, alturaInv(0, 0) + 0.25, (z0 + z1) / 2);
    g.add(fald);
  }

  return { group: g };
}

// piel del túnel: media caña lofteada (semicírculo repetido a lo largo de Z)
function cubiertaGeom(W2, SH, z0, z1) {
  const segA = 24, segZ = 30;
  const nx = segA + 1, nz = segZ + 1;
  const pos = new Float32Array(nx * nz * 3);
  for (let zi = 0; zi <= segZ; zi++) {
    const z = z0 + (zi / segZ) * (z1 - z0);
    for (let ai = 0; ai <= segA; ai++) {
      const a = (ai / segA) * Math.PI;                 // 0..PI recorre el arco
      const x = -Math.cos(a) * W2;                     // a=0→-W2, a=PI→+W2
      const y = alturaInv(0, z) + SH + Math.sin(a) * W2;
      const idx = (zi * nx + ai) * 3;
      pos[idx] = x; pos[idx + 1] = y; pos[idx + 2] = z;
    }
  }
  const indices = [];
  for (let zi = 0; zi < segZ; zi++) {
    for (let ai = 0; ai < segA; ai++) {
      const a0 = zi * nx + ai, b0 = zi * nx + ai + 1, a1 = (zi + 1) * nx + ai, b1 = (zi + 1) * nx + ai + 1;
      indices.push(a0, a1, b0, b0, a1, b1);
    }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setIndex(indices);
  geo.computeVertexNormals();
  return geo;
}

// el frontón (gable) del fondo: el semicírculo relleno como abanico de triángulos
function cubiertaFrontonGeom(W2, SH, z) {
  const segA = 24;
  const pos = [];
  const y0 = alturaInv(0, z);
  for (let ai = 0; ai < segA; ai++) {
    const aA = (ai / segA) * Math.PI, aB = ((ai + 1) / segA) * Math.PI;
    const xA = -Math.cos(aA) * W2, yA = y0 + SH + Math.sin(aA) * W2;
    const xB = -Math.cos(aB) * W2, yB = y0 + SH + Math.sin(aB) * W2;
    // triángulo del centro-base a cada segmento del arco
    pos.push(0, y0 + SH, z, xA, yA, z, xB, yB, z);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(pos), 3));
  geo.computeVertexNormals();
  return geo;
}

// ═══════════════════════════════════════════════════════════════════════════
//  LAS CAMAS ELEVADAS — el sustrato vivo, el riego por goteo, las hileras de
//  cultivo (tomate a tutorado, pimentón, lechuga) y las trampas cromáticas.
//  Es el corazón trabajado del invernadero (y enseña goteo + control biológico).
// ═══════════════════════════════════════════════════════════════════════════
function construirCamas() {
  const g = new THREE.Group();
  const { z0, z1 } = INV;
  const zA = z0 + 1.5, zB = z1 - 1.5, largoCama = zB - zA;
  const matMad = new THREE.MeshStandardMaterial({ color: col(C.camaMadera), roughness: 0.95, flatShading: true });
  const matMadOsc = new THREE.MeshStandardMaterial({ color: col(C.camaMaderaOsc), roughness: 0.95, flatShading: true });
  const matSus = new THREE.MeshStandardMaterial({ color: col(C.sustrato), roughness: 1, flatShading: true });
  const matMang = new THREE.MeshStandardMaterial({ color: col(C.manguera), roughness: 0.5, flatShading: true });
  const rp = prng(4242);

  const bedX = [-1.55, 0, 1.55];                        // tres camas: 2 de tomate + 1 central
  const trampas = [];
  const cultivosMesh = [];

  bedX.forEach((bx, bi) => {
    // ── la cama elevada: cajón de madera con sustrato oscuro ──────────────────
    const cama = new THREE.Group();
    const by = alturaInv(bx, (zA + zB) / 2);
    cama.position.set(bx, by, (zA + zB) / 2);
    const anchoCama = bi === 1 ? 0.8 : 0.7;
    // paredes de la cama (tablas)
    for (const sx of [-1, 1]) {
      const pared = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.34, largoCama), matMad);
      pared.position.set(sx * anchoCama / 2, 0.17, 0); cama.add(pared);
    }
    for (const sz of [-1, 1]) {
      const tapa = new THREE.Mesh(new THREE.BoxGeometry(anchoCama + 0.12, 0.34, 0.06), matMadOsc);
      tapa.position.set(0, 0.17, sz * largoCama / 2); cama.add(tapa);
    }
    // el sustrato (colmado, un poco por encima de las tablas)
    const sus = new THREE.Mesh(new THREE.BoxGeometry(anchoCama, 0.32, largoCama), matSus);
    sus.position.set(0, 0.19, 0); cama.add(sus);
    // motas de mantillo/compost sobre el sustrato (vivo)
    for (let m = 0; m < 26; m++) {
      const mm = new THREE.Mesh(new THREE.IcosahedronGeometry(0.03 + rp() * 0.03, 0),
        new THREE.MeshStandardMaterial({ color: rp() < 0.5 ? col(C.mantillo) : col(C.sustratoHumedo), roughness: 1, flatShading: true }));
      mm.position.set((rp() - 0.5) * anchoCama * 0.8, 0.35, (rp() - 0.5) * largoCama * 0.95); cama.add(mm);
    }
    // ── el riego por goteo: manguera negra a lo largo + goteros ────────────────
    const mang = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, largoCama, 6), matMang);
    mang.rotation.x = Math.PI / 2; mang.position.set(0, 0.37, 0); cama.add(mang);
    g.add(cama);

    // ── los cultivos sobre la cama ────────────────────────────────────────────
    const nP = Math.floor(largoCama / (bi === 1 ? 0.75 : 1.3));
    const drips = [];
    for (let k = 0; k < nP; k++) {
      const pz = -largoCama / 2 + (k + 0.5) * (largoCama / nP);
      const wx = bx + (rp() - 0.5) * 0.12;
      const wz = (zA + zB) / 2 + pz;
      const gy = alturaInv(wx, wz) + 0.36;               // sobre el sustrato
      // gotero + gota junto a cada planta
      const got = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.025, 0.05, 6),
        new THREE.MeshStandardMaterial({ color: col(C.gotero), roughness: 0.6, flatShading: true }));
      got.position.set(wx, gy - 0.01, wz); g.add(got);
      drips.push({ x: wx, y: gy, z: wz });

      if (bi === 1) {
        // cama central: lechuga y pimentón alternados (hortaliza de hoja + fruto)
        let mesh;
        if (k % 3 === 0) {
          mesh = new THREE.Mesh(geomPimenton(100 + k * 7), MAT_VEG);
          mesh.scale.setScalar(0.95 + rp() * 0.3);
        } else {
          mesh = new THREE.Mesh(geomLechuga(200 + k * 5, { morada: rp() < 0.25 }), MAT_VEG);
          mesh.scale.setScalar(1.0 + rp() * 0.3);
        }
        mesh.position.set(wx, gy, wz); mesh.rotation.y = rp() * 6.28;
        mesh.frustumCulled = false; g.add(mesh); cultivosMesh.push(mesh);
      } else {
        // camas laterales: TOMATE a tutorado, colgado a la cuerda del alambre alto
        const H = 1.75 + rp() * 0.35;
        const mata = new THREE.Mesh(geomTomate(300 + bi * 50 + k * 3, { H, conFruto: rp() < 0.85 }), MAT_VEG);
        mata.position.set(wx, gy, wz); mata.rotation.y = rp() * 6.28;
        mata.frustumCulled = false; g.add(mata); cultivosMesh.push(mata);
        // la CUERDA del tutorado: del pie de la mata al alambre alto (y2.55)
        const topY = alturaInv(0, 0) + 2.55;
        const cuerda = new THREE.Mesh(
          new THREE.CylinderGeometry(0.006, 0.006, topY - gy, 4),
          new THREE.MeshStandardMaterial({ color: col('#d8cdb2'), roughness: 0.8, flatShading: true }));
        cuerda.position.set(bx + Math.sign(bx || 1) * 0.0, (gy + topY) / 2, wz);
        cuerda.position.x = bx; g.add(cuerda);
      }
    }

    // ── las TRAMPAS CROMÁTICAS colgadas sobre la cama (amarilla + azul) ────────
    if (bi !== 1) {
      const nTr = 3;
      for (let tI = 0; tI < nTr; tI++) {
        const tz = (zA + zB) / 2 + (-largoCama / 2 + (tI + 0.5) * (largoCama / nTr));
        const amar = tI % 2 === 0;
        const trG = new THREE.Group();
        trG.position.set(bx + (amar ? 0.42 : -0.42), alturaInv(bx, tz) + 1.35, tz);
        // el cartón pegajoso (placa vertical)
        const placa = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.34, 0.24),
          new THREE.MeshStandardMaterial({ color: col(amar ? C.trampaAmar : C.trampaAzul), roughness: 0.4, emissive: col(amar ? C.trampaAmar : C.trampaAzul), emissiveIntensity: 0.25, flatShading: true }));
        trG.add(placa);
        // el hilo del que cuelga
        const hilo = new THREE.Mesh(new THREE.CylinderGeometry(0.004, 0.004, 1.1, 4),
          new THREE.MeshStandardMaterial({ color: col('#cccccc'), roughness: 0.8 }));
        hilo.position.y = 0.72; trG.add(hilo);
        g.add(trG);
        trampas.push({ x: trG.position.x, y: trG.position.y, z: tz, amar });
      }
    }
  });

  // pequeña sombra de contacto bajo cada cama para asentarla
  for (const bx of bedX) {
    g.add(sombraPlano(largoCama * 0.5, bx, alturaInv(bx, (zA + zB) / 2) + 0.02, (zA + zB) / 2, largoCama * 0.62, 0.55));
  }

  function update(t) {
    for (let i = 0; i < cultivosMesh.length; i++) {
      cultivosMesh[i].rotation.z = Math.sin(t * 0.5 + i * 0.7) * 0.012;   // respiración leve
    }
  }
  return { group: g, update, trampas };
}

// ── sombra de contacto como plano (elíptico para las camas) ────────────────────
function sombraPlano(r, x, y, z, sx = 1, sz = 1) {
  const m = new THREE.Mesh(new THREE.PlaneGeometry(r * 2, r * 2),
    new THREE.MeshBasicMaterial({ map: sombraTex(), transparent: true, depthWrite: false, fog: false }));
  m.rotation.x = -Math.PI / 2; m.position.set(x, y, z); m.scale.set(sx, sz, 1);
  return m;
}

// ── polvo/neblina suspendido en los haces de luz filtrada ──────────────────────
function construirMotas() {
  const N = 220, geo = new THREE.BufferGeometry();
  const pos = new Float32Array(N * 3), base = new Float32Array(N);
  for (let i = 0; i < N; i++) {
    const x = rand(-INV.W2 - 1, INV.W2 + 1), z = rand(INV.z0, INV.z1), y = alturaInv(x, z) + rand(0.6, INV.ridge - 0.4);
    pos[i * 3] = x; pos[i * 3 + 1] = y; pos[i * 3 + 2] = z; base[i] = y;
  }
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const mat = new THREE.PointsMaterial({
    map: motaTex(), color: 0xf4f0e2, size: 0.05, sizeAttenuation: true,
    transparent: true, opacity: 0.5, depthWrite: false, blending: THREE.AdditiveBlending, fog: false,
  });
  const points = new THREE.Points(geo, mat);
  points.frustumCulled = false;
  const update = (t) => {
    const p = geo.attributes.position.array;
    for (let i = 0; i < N; i++) {
      p[i * 3 + 1] = base[i] + Math.sin(t * 0.3 + i * 1.3) * 0.12;
      p[i * 3] += Math.sin(t * 0.15 + i) * 0.002;
    }
    geo.attributes.position.needsUpdate = true;
  };
  return { points, update };
}

// ── FAUNA: el abejorro que poliniza + mariquitas (control) + la mosca blanca plaga
function construirFauna(trampas) {
  const g = new THREE.Group();
  const bichos = [];
  const abTex = abejorroTex(), maTex = mariquitaTex(), moTex = moscaBlancaTex();
  const rf = prng(7777);
  // focos: sobre las camas laterales (donde está el tomate en flor)
  const focos = [
    { x: -1.55, z: -4, y: alturaInv(-1.55, -4) + 1.5 },
    { x: 1.55, z: 3, y: alturaInv(1.55, 3) + 1.5 },
    { x: -1.55, z: 6, y: alturaInv(-1.55, 6) + 1.4 },
    { x: 1.55, z: -7, y: alturaInv(1.55, -7) + 1.6 },
  ];
  // 3 abejorros gordos polinizando de flor en flor
  for (let i = 0; i < 3; i++) {
    const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: abTex, transparent: true, depthWrite: false, fog: false }));
    sp.scale.set(0.34, 0.34, 0.34);
    bichos.push({ sp, foco: focos[i % focos.length], r: 0.7 + rf() * 1.4, ph: rf() * 6.28, sp2: 0.7 + rf() * 0.7, yb: (rf() - 0.5) * 0.7, tipo: 'abejorro' });
    g.add(sp);
  }
  // 4 mariquitas del control biológico
  for (let i = 0; i < 4; i++) {
    const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: maTex, transparent: true, depthWrite: false, fog: false }));
    sp.scale.set(0.24, 0.24, 0.24);
    bichos.push({ sp, foco: focos[(i + 1) % focos.length], r: 0.9 + rf() * 1.6, ph: rf() * 6.28, sp2: 0.5 + rf() * 0.6, yb: (rf() - 0.5) * 0.9, tipo: 'mariquita' });
    g.add(sp);
  }
  // moscas blancas rondando las trampas amarillas (la plaga que cae en la trampa)
  const trampAmar = (trampas || []).filter((t) => t.amar);
  for (let i = 0; i < 8; i++) {
    const foco = trampAmar.length ? trampAmar[i % trampAmar.length] : focos[0];
    const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: moTex, transparent: true, depthWrite: false, fog: false }));
    sp.scale.set(0.09, 0.09, 0.09);
    bichos.push({ sp, foco, r: 0.15 + rf() * 0.4, ph: rf() * 6.28, sp2: 1.4 + rf() * 1.6, yb: (rf() - 0.5) * 0.4, tipo: 'mosca' });
    g.add(sp);
  }
  function update(t) {
    for (const b of bichos) {
      const a = t * b.sp2 + b.ph;
      b.sp.position.set(
        b.foco.x + Math.cos(a) * b.r,
        b.foco.y + b.yb + Math.sin(a * 1.7) * (b.tipo === 'mosca' ? 0.12 : 0.4),
        b.foco.z + Math.sin(a) * b.r,
      );
    }
  }
  return { group: g, update };
}

// ── HUD: la leyenda del INVERNADERO (instruccional, en usted) ──────────────────
function montarLeyenda() {
  const CAPAS = [
    { c: '#c8dce8', n: 'La cubierta translúcida', h: 'luz difusa', d: 'El plástico deja pasar la luz suave y encierra un microclima más cálido: adelanta la cosecha y tapa el granizo y la helada. Pero encierra humedad — y humedad sin ventilar es hongo.' },
    { c: '#d1402e', n: 'Tomate a tutorado', h: 'cuerda al alambre', d: 'La mata indeterminada de ~2 m se cuelga de una cuerda a un alambre alto, en cama elevada. Los racimos cuajan verdes y maduran rojos. Bajo el plástico el tomate recibe mucha luz (DLI alto).' },
    { c: '#232323', n: 'Riego por goteo', h: 'gota a la raíz', d: 'La manguera lleva el agua gota a gota a la raíz: no moja la hoja (menos hongo) y ahorra agua. El sensor avisa si hace calor, pero nunca abre la válvula solo.' },
    { c: '#f2d21e', n: 'Control biológico', h: 'trampas + abejorro', d: 'La mosca blanca explota bajo el plástico. Se maneja con trampas amarillas y azules pegajosas, la avispita Encarsia y mariquitas — no con veneno. Y el abejorro poliniza por vibración: sin viento, cuaja mejor.' },
  ];
  const box = document.createElement('div');
  box.style.cssText = 'position:fixed;left:14px;top:14px;z-index:30;max-width:min(40vw,360px);' +
    'font-family:system-ui,-apple-system,sans-serif;color:#1c2a22;pointer-events:none';
  let html = '<div style="font-size:1.05rem;font-weight:700;text-shadow:0 1px 8px rgba(255,255,255,.7);margin-bottom:2px;color:#14352a">🏠 El invernadero</div>' +
    '<div style="font-size:.72rem;opacity:.9;text-shadow:0 1px 5px rgba(255,255,255,.8);margin-bottom:9px;color:#243a30">Cultivo protegido · luz filtrada · del goteo al control biológico</div>';
  for (const e of CAPAS) {
    html += '<div style="display:flex;gap:8px;margin-bottom:7px;background:linear-gradient(90deg,rgba(250,252,250,.9),rgba(250,252,250,.55));' +
      'border-left:4px solid ' + e.c + ';border-radius:7px;padding:6px 9px;color:#22302a">' +
      '<span><b style="font-size:.86rem">' + e.n + '</b> <span style="opacity:.6;font-size:.68rem">' + e.h + '</span><br>' +
      '<span style="font-size:.68rem;opacity:.82;line-height:1.3">' + e.d + '</span></span></div>';
  }
  box.innerHTML = html;
  document.body.appendChild(box);
  if (innerWidth < 620) box.style.maxWidth = '82vw';
}

// ── aviso de entrada + botón de salida al valle ────────────────────────────────
function montarAvisoYSalida() {
  const salir = document.createElement('button');
  salir.textContent = '← Volver al valle';
  salir.style.cssText = 'position:fixed;right:14px;top:14px;z-index:31;border:1px solid rgba(40,60,50,.35);' +
    'background:rgba(250,252,250,.9);color:#1c2a22;border-radius:999px;padding:8px 16px;font:600 .8rem system-ui,sans-serif;' +
    'cursor:pointer;box-shadow:0 8px 24px rgba(0,0,0,.25)';
  salir.onclick = () => { location.href = './'; };
  document.body.appendChild(salir);

  return function avisar() {
    let el = document.getElementById('invToast');
    if (!el) {
      el = document.createElement('div'); el.id = 'invToast';
      el.style.cssText = 'position:fixed;left:50%;bottom:26px;transform:translateX(-50%);z-index:40;' +
        'background:rgba(20,32,26,.9);color:#f0f4ee;border:1px solid rgba(200,220,232,.35);border-radius:999px;' +
        'padding:10px 20px;font:500 .88rem system-ui,sans-serif;box-shadow:0 10px 30px rgba(0,0,0,.4);transition:opacity .4s';
      document.body.appendChild(el);
    }
    el.textContent = '🏠 Está en el invernadero · arrastre para mirar · toque la cama o la cubierta';
    el.style.opacity = '1';
    clearTimeout(el._t); el._t = setTimeout(() => { el.style.opacity = '0'; }, 4200);
  };
}

// ── tarjeta: POR QUÉ un invernadero (adelantar cosecha vs manejar la humedad) ──
function tarjetaPorQue() {
  let el = document.getElementById('invPorQueCarta');
  if (el) { el.remove(); return; }
  el = document.createElement('div'); el.id = 'invPorQueCarta';
  el.style.cssText = 'position:fixed;left:50%;bottom:70px;transform:translateX(-50%);z-index:45;max-width:min(88vw,440px);' +
    'background:rgba(20,32,26,.96);color:#f0f4ee;border:1px solid rgba(200,220,232,.5);border-radius:16px;padding:16px 18px;' +
    'font-family:system-ui,-apple-system,sans-serif;box-shadow:0 16px 40px rgba(0,0,0,.55)';
  el.innerHTML =
    '<div style="font-size:1.05rem;font-weight:700;color:#bcd8e8">🏠 Por qué taparlo con plástico</div>' +
    '<div style="font-size:.8rem;line-height:1.45;margin-top:8px;opacity:.92">' +
    'El invernadero es un MICROCLIMA: más cálido y húmedo que afuera. Sirve para ADELANTAR la cosecha (produce fuera de ' +
    'temporada) y para PROTEGER el cultivo del granizo y la helada — el plástico translúcido deja pasar la luz difusa que ' +
    'la planta necesita.<br><br>' +
    'El precio: encierra humedad. Sin ventilar, la humedad alta dispara los HONGOS. Por eso se abren las CORTINAS ' +
    'laterales y las puertas, y el riego va por GOTEO a la raíz (no se moja la hoja). El sensor avisa "está muy caliente", ' +
    'pero nunca abre la válvula solo: una válvula pegada = encharcado.</div>' +
    '<div style="font-size:.7rem;opacity:.6;margin-top:10px">Toque otra vez para cerrar · fuente: AGROSAVIA / ICA</div>';
  document.body.appendChild(el);
  clearTimeout(el._t); el._t = setTimeout(() => { el && el.remove(); }, 13000);
}

// ── tarjeta: CONTROL BIOLÓGICO, no calendario de venenos ───────────────────────
function tarjetaControlBiologico() {
  let el = document.getElementById('invBioCarta');
  if (el) { el.remove(); return; }
  el = document.createElement('div'); el.id = 'invBioCarta';
  el.style.cssText = 'position:fixed;left:50%;bottom:70px;transform:translateX(-50%);z-index:45;max-width:min(88vw,440px);' +
    'background:rgba(20,32,26,.96);color:#f0f4ee;border:1px solid rgba(242,210,30,.55);border-radius:16px;padding:16px 18px;' +
    'font-family:system-ui,-apple-system,sans-serif;box-shadow:0 16px 40px rgba(0,0,0,.55)';
  el.innerHTML =
    '<div style="font-size:1.05rem;font-weight:700;color:#f2d21e">🐝 Bichos, no veneno</div>' +
    '<div style="font-size:.8rem;line-height:1.45;margin-top:8px;opacity:.92">' +
    'Bajo el plástico la MOSCA BLANCA (Trialeurodes vaporariorum / Bemisia tabaci) explota: hace calor estable y no hay ' +
    'enemigos naturales. El monocultivo la combate con un calendario de venenos — y la vuelve resistente.<br><br>' +
    'Aquí no. Se cuelgan TRAMPAS cromáticas amarillas y azules (pegajosas) que la atrapan, se suelta la avispita ENCARSIA ' +
    'FORMOSA que la parasita, el hongo Beauveria y las mariquitas hacen el resto. Y como bajo el plástico no hay viento, ' +
    'el ABEJORRO (Bombus) POLINIZA por vibración: el fruto cuaja mejor con él.</div>' +
    '<div style="font-size:.7rem;opacity:.6;margin-top:10px">Toque otra vez para cerrar · fuente: dictionary mosca-blanca / AGROSAVIA</div>';
  document.body.appendChild(el);
  clearTimeout(el._t); el._t = setTimeout(() => { el && el.remove(); }, 13000);
}
