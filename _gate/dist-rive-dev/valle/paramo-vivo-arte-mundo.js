// ═══════════════════════════════════════════════════════════════════════════
//  PÁRAMO VIVO — ARTE · EL MUNDO (terreno + cielo + niebla + luz)
//  ---------------------------------------------------------------------------
//  Base compartida del mundo insignia. Un DIORAMA autónomo (no cuelga del DEM
//  del valle: aquí el terreno es propio, ilustrado tipo lámina de Humboldt —
//  NO fotorrealista). Todo determinista (RNG de lib3d), procedural, cero
//  binarios. Este módulo exporta la PALETA, los HELPERS de geometría y el
//  RNG que comparten los demás `paramo-vivo-arte-*.js` (fuente única).
//
//  Dirección de arte (heredada de fable/paramo-humboldt-real, la aprobada):
//   · Firma: frailejón PLATA-SALVIA sobre pajonal DORADO. Marrón plano PROHIBIDO.
//   · Jackson: el frailejonal es un EJÉRCITO que marcha a la bruma; telón de
//     cordilleras apiladas con perspectiva aérea horneada.
//   · Nolan: bruma CON LUZ, un resplandor dorado bajo; el páramo flota sobre un
//     mar de nubes.
//   · Humboldt: huesos reales (proporción de Espeletia de verdad), piel
//     dibujada (flatShading, color plano, sin PBR).
// ═══════════════════════════════════════════════════════════════════════════
import * as THREE from 'three';

// ── RNG + RUIDO deterministas (INLINE de lib3d/core/RNG.js — dominio público) ─
// Se inlinea para que el mundo sea un bloque-import AUTÓNOMO servido bajo la
// raíz del valle (el navegador no puede subir a ../lib3d fuera del server-root).
function mulberry32(semilla) {
  let a = semilla >>> 0;
  return function () {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
export class RNG {
  constructor(semilla = 1337) { this.semilla = semilla >>> 0; this.r = mulberry32(this.semilla); }
  float(min = 0, max = 1) { return min + this.r() * (max - min); }
  int(min, max) { return Math.floor(this.float(min, max + 1)); }
  bool(p = 0.5) { return this.r() < p; }
  pick(arr) { return arr[Math.floor(this.r() * arr.length)]; }
}
const GRAD3 = new Float32Array([1, 1, 0, -1, 1, 0, 1, -1, 0, -1, -1, 0, 1, 0, 1, -1, 0, 1, 1, 0, -1, -1, 0, -1, 0, 1, 1, 0, -1, 1, 0, 1, -1, 0, -1, -1]);
export class Ruido {
  constructor(semilla = 1337) {
    const r = mulberry32(semilla), p = new Uint8Array(256);
    for (let i = 0; i < 256; i++) p[i] = i;
    for (let i = 255; i > 0; i--) { const j = Math.floor(r() * (i + 1)); const t = p[i]; p[i] = p[j]; p[j] = t; }
    this.perm = new Uint8Array(512); this.permMod12 = new Uint8Array(512);
    for (let i = 0; i < 512; i++) { this.perm[i] = p[i & 255]; this.permMod12[i] = this.perm[i] % 12; }
  }
  simplex2(xin, yin) {
    const F2 = 0.5 * (Math.sqrt(3) - 1), G2 = (3 - Math.sqrt(3)) / 6;
    const s = (xin + yin) * F2, i = Math.floor(xin + s), j = Math.floor(yin + s), t = (i + j) * G2;
    const x0 = xin - (i - t), y0 = yin - (j - t);
    let i1, j1; if (x0 > y0) { i1 = 1; j1 = 0; } else { i1 = 0; j1 = 1; }
    const x1 = x0 - i1 + G2, y1 = y0 - j1 + G2, x2 = x0 - 1 + 2 * G2, y2 = y0 - 1 + 2 * G2;
    const ii = i & 255, jj = j & 255; let n0 = 0, n1 = 0, n2 = 0;
    let t0 = 0.5 - x0 * x0 - y0 * y0;
    if (t0 >= 0) { const g0 = this.permMod12[ii + this.perm[jj]] * 3; t0 *= t0; n0 = t0 * t0 * (GRAD3[g0] * x0 + GRAD3[g0 + 1] * y0); }
    let t1 = 0.5 - x1 * x1 - y1 * y1;
    if (t1 >= 0) { const g1 = this.permMod12[ii + i1 + this.perm[jj + j1]] * 3; t1 *= t1; n1 = t1 * t1 * (GRAD3[g1] * x1 + GRAD3[g1 + 1] * y1); }
    let t2 = 0.5 - x2 * x2 - y2 * y2;
    if (t2 >= 0) { const g2 = this.permMod12[ii + 1 + this.perm[jj + 1]] * 3; t2 *= t2; n2 = t2 * t2 * (GRAD3[g2] * x2 + GRAD3[g2 + 1] * y2); }
    return 70 * (n0 + n1 + n2);
  }
  fbm(x, y, oct = 5, lac = 2, gan = 0.5) {
    let amp = 1, frec = 1, suma = 0, norm = 0;
    for (let o = 0; o < oct; o++) { suma += amp * this.simplex2(x * frec, y * frec); norm += amp; amp *= gan; frec *= lac; }
    return suma / norm;
  }
}

// ── PALETA v3 (robada de paletaMadre.js + extendida para el mundo vivo) ───────
export const P = {
  // frailejón
  frailPlata: 0xbcc6ac, frailSage: 0x9aa888, frailCogollo: 0xdde4cc,
  frailFlor: 0xe0c24a, frailSeca: 0xa8845a, frailSeca2: 0x8a6b46,
  // pajonal / suelo
  paja: 0xa5975c, pajaSol: 0xd9c176, pajaSombra: 0x77713f,
  hojarasca: 0x7d6038, sueloNegro: 0x241a10, subsuelo: 0x8a6a44, turba: 0x140e07,
  raiz: 0xd8c9a6,
  // queñua (Polylepis)
  quenuaTronco: 0x8a4a33, quenuaLamina: 0xcf9166, quenuaHoja: 0x5f7a4c, quenuaHoja2: 0x7d9463,
  // musgo / roca
  musgo: 0x6f8a49, musgoClaro: 0x8aa85c, roca: 0x9a8b74, rocaSombra: 0x6f6350,
  // agua / laguna
  lagunaHonda: 0x4f8391, lagunaEspejo: 0xd8e2d6, espuma: 0xfdf7e8,
  // atmósfera / luz
  bruma: 0xdcd5b4, cieloAlto: 0x93aec0, cieloBajo: 0xf2ddb0, sol: 0xffe6a6,
  // el Ent — cara, ámbar, herida
  cacao: 0x2a1c10, ambar: 0xffb347, ambarVivo: 0xffd98a,
  herida: 0x2e2013, heridaSeca: 0x5c4326, heridaCarbon: 0x171009,
  // micorrizas / suelo vivo / célula
  mico: 0xefe6cf, micoLuz: 0xfff0bf, azucar: 0xffb454, agua: 0x7fc7ff, mineral: 0xa8ff8f,
  bacteria: 0x9fe0ff, protozoo: 0xd6b8ff, celula: 0x9fd8cf, nucleo: 0x6f83d6, organelo: 0xe6a94e,
};

// azar determinista compartido (la foto del gate NO cambia entre corridas)
export function makeRNG(seed = 20730) { return new RNG(seed); }
export const ruido = new Ruido(4115);

export const col = (hex) => new THREE.Color(hex);
export const mezcla = (a, b, t) => new THREE.Color(a).lerp(new THREE.Color(b), t);
export const lambert = (color, opts = {}) => new THREE.MeshLambertMaterial({ color, flatShading: true, ...opts });

// concat manual de geometrías no-indexadas: cero merge null-silencioso
// (la trampa documentada en feedback_merge_geometries_null_silencioso).
// (F24) además de pos+normal arrastra color y uv CUANDO TODAS las piezas los
// traen — el degradado de las rosetas y el vaho de pelusa viajan por aquí
// (mismo concat que paramo.js estrenó en F23).
export function concat(...geos) {
  const g = geos.map((x) => (x.index ? x.toNonIndexed() : x));
  let n = 0; for (const x of g) n += x.attributes.position.count;
  const pos = new Float32Array(n * 3), nor = new Float32Array(n * 3);
  const conColor = g.every((x) => x.attributes.color);
  const conUv = g.every((x) => x.attributes.uv);
  const colA = conColor ? new Float32Array(n * 3) : null;
  const uvA = conUv ? new Float32Array(n * 2) : null;
  let off = 0, off2 = 0;
  for (const x of g) {
    pos.set(x.attributes.position.array, off);
    nor.set(x.attributes.normal.array, off);
    if (colA) colA.set(x.attributes.color.array, off);
    if (uvA) uvA.set(x.attributes.uv.array, off2);
    off += x.attributes.position.array.length;
    off2 += x.attributes.position.count * 2;
  }
  const out = new THREE.BufferGeometry();
  out.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  out.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
  if (colA) out.setAttribute('color', new THREE.BufferAttribute(colA, 3));
  if (uvA) out.setAttribute('uv', new THREE.BufferAttribute(uvA, 2));
  return out;
}

// ── EL TERRENO DEL PÁRAMO (propio, ilustrado) ────────────────────────────────
// Meseta rodante con un CLARO gentil en el origen (donde vive el Ent y su
// vecina la queñua — «protagonista = piso del usuario + 1 vecino»). fbm suave
// da las lomas; el claro se aplana con una campana radial. Función pura H(x,z)
// para que TODO se ancle (frailejones, pajonal, roca, agua) sin flotar.
export const CLARO = { x: 0, z: 0, r: 34 };   // el rellano del Ent
export function H(x, z) {
  // lomas grandes + micro-relieve, en metros-diorama
  const grande = ruido.fbm(x * 0.0055 + 11, z * 0.0055 - 7, 4) * 15;
  const medio = ruido.fbm(x * 0.02 + 3, z * 0.02 + 9, 3) * 3.2;
  let h = grande + medio - 2;
  // el claro: aplanar suave alrededor del Ent (campana), y bajar un pelo hacia
  // el hondón del nacimiento del agua (−x,−z) para que el agua tenga a dónde ir
  const d = Math.hypot(x - CLARO.x, z - CLARO.z);
  const claro = Math.exp(-(d * d) / (2 * 26 * 26));      // 1 en el centro → 0 lejos
  h = h * (1 - claro * 0.86) + (0.4) * claro;
  return h;
}
export function slopeAt(x, z) {
  const e = 2.0;
  const dx = (H(x + e, z) - H(x - e, z)) / (2 * e);
  const dz = (H(x, z + e) - H(x, z - e)) / (2 * e);
  return Math.hypot(dx, dz);
}
// muestreo de sitios anclados (pendiente baja, separación, evitar zonas)
export function muestrear(rng, n, radio, { slopeMax = 0.5, sep = 0, evitar = [] } = {}) {
  const out = []; let guard = n * 70;
  while (out.length < n && guard-- > 0) {
    const a = rng.float(0, Math.PI * 2), d = Math.sqrt(rng.float(0, 1)) * radio;
    const x = CLARO.x + Math.cos(a) * d, z = CLARO.z + Math.sin(a) * d;
    if (slopeAt(x, z) > slopeMax) continue;
    if (evitar.some((e) => Math.hypot(x - e.x, z - e.z) < e.r)) continue;
    if (sep && out.some((p) => Math.hypot(p.x - x, p.z - z) < sep)) continue;
    out.push({ x, y: H(x, z), z });
  }
  return out;
}

// la malla de terreno: plano subdividido, desplazado por H, con color por
// vértice (pajonal dorado en lo alto, sombra parda en los hondos, plata en el
// claro). MeshLambert + flatShading = lámina ilustrada, no PBR.
export function construirTerreno(rng, { size = 620, seg = 200 } = {}) {
  const geo = new THREE.PlaneGeometry(size, size, seg, seg);
  geo.rotateX(-Math.PI / 2);
  const pos = geo.attributes.position;
  const colr = new Float32Array(pos.count * 3);
  const cPaja = col(P.paja), cSol = col(P.pajaSol), cSom = col(P.pajaSombra), cMus = col(P.musgo);
  const c = new THREE.Color();
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), z = pos.getZ(i);
    const y = H(x, z);
    pos.setY(i, y);
    const s = slopeAt(x, z);
    const alto = THREE.MathUtils.clamp((y + 6) / 20, 0, 1);
    // dorado que respira: hondos en sombra, altos al sol; las pendientes verdean (musgo)
    c.copy(cSom).lerp(cPaja, THREE.MathUtils.clamp(alto * 1.4, 0, 1)).lerp(cSol, alto * alto * 0.7);
    if (s > 0.42) c.lerp(cMus, THREE.MathUtils.clamp((s - 0.42) * 1.4, 0, 0.5));
    const j = 0.94 + ruido.fbm(x * 0.08, z * 0.08, 2) * 0.12;
    colr[i * 3] = c.r * j; colr[i * 3 + 1] = c.g * j; colr[i * 3 + 2] = c.b * j;
  }
  geo.setAttribute('color', new THREE.BufferAttribute(colr, 3));
  geo.computeVertexNormals();
  const mesh = new THREE.Mesh(geo, new THREE.MeshLambertMaterial({ vertexColors: true, flatShading: true }));
  mesh.receiveShadow = false;
  return mesh;
}

// ── CIELO: domo de degradé por VÉRTICE (misma técnica del telón, que SÍ
// renderiza — la textura de fondo salía negra). Amanecer de páramo: cenit
// plata-azul luminoso → resplandor dorado bajo (Nolan). BackSide, fog:false.
export function construirCielo() {
  const geo = new THREE.SphereGeometry(880, 32, 22);
  const pos = geo.attributes.position, colr = new Float32Array(pos.count * 3);
  const cCenit = col(0xa9c6dc), cMedia = col(0xdfe6d7), cGlow = col(0xf6e9c4), cHoriz = col(0xf3ddb0);
  const c = new THREE.Color();
  for (let i = 0; i < pos.count; i++) {
    const yn = THREE.MathUtils.clamp((pos.getY(i) / 880) * 0.5 + 0.5, 0, 1);  // 0 abajo → 1 arriba
    if (yn > 0.55) c.copy(cMedia).lerp(cCenit, (yn - 0.55) / 0.45);
    else if (yn > 0.32) c.copy(cGlow).lerp(cMedia, (yn - 0.32) / 0.23);
    else c.copy(cHoriz).lerp(cGlow, yn / 0.32);
    colr[i * 3] = c.r; colr[i * 3 + 1] = c.g; colr[i * 3 + 2] = c.b;
  }
  geo.setAttribute('color', new THREE.BufferAttribute(colr, 3));
  const dome = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.BackSide, fog: false, depthWrite: false }));
  dome.renderOrder = -20;
  return dome;
}

// ── EL TELÓN: cordilleras apiladas con perspectiva aérea horneada ─────────────
export function construirTelon(rng) {
  const g = new THREE.Group();
  const cielo = col(P.bruma);
  const capas = [
    { dz: 300, base: 6, amp: 46, sub: 14, color: 0x5c7263, W: 900, up: 0.18 },
    { dz: 440, base: 24, amp: 78, sub: 22, color: 0x87997f, W: 1100, up: 0.28 },
    { dz: 600, base: 46, amp: 118, sub: 30, color: 0xb2bfa8, W: 1300, up: 0.4 },
  ];
  capas.forEach((cc, ci) => {
    const N = 80;
    const pos = new Float32Array(N * 2 * 3), colr = new Float32Array(N * 2 * 3), idx = [];
    const cBase = col(cc.color), cTop = cBase.clone().lerp(cielo, cc.up + ci * 0.08);
    for (let i = 0; i < N; i++) {
      const t = i / (N - 1), x = (t - 0.5) * 2 * cc.W;
      const ridge = ruido.fbm(x / 240 + ci * 7.3, ci * 3.1, 3) * cc.amp
        + Math.sin(t * Math.PI * (2.2 + ci * 0.7) + ci) * cc.sub;
      const yTop = cc.base + Math.max(8, ridge + cc.amp * 0.55), yBot = cc.base - 140;
      pos.set([x, yBot, 0], i * 6); pos.set([x, yTop, 0], i * 6 + 3);
      colr.set([cBase.r, cBase.g, cBase.b], i * 6); colr.set([cTop.r, cTop.g, cTop.b], i * 6 + 3);
      if (i < N - 1) { const a = i * 2; idx.push(a, a + 2, a + 1, a + 1, a + 2, a + 3); }
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(colr, 3));
    geo.setIndex(idx);
    const m = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ vertexColors: true, fog: false, side: THREE.DoubleSide }));
    m.position.set(0, 0, -cc.dz); m.renderOrder = -8 + ci;
    g.add(m);
  });
  return g;
}

// textura de vaho: algodón radial (sin assets). EXPORTADA: el halo de pelusa
// de los frailejones (arte-frailejon) usa el mismo algodón.
export function texturaVaho(warm = false) {
  const cv = document.createElement('canvas'); cv.width = cv.height = 128;
  const c = cv.getContext('2d');
  const gr = c.createRadialGradient(64, 64, 4, 64, 64, 64);
  if (warm) { gr.addColorStop(0, 'rgba(255,241,214,0.95)'); gr.addColorStop(0.5, 'rgba(250,236,210,0.4)'); gr.addColorStop(1, 'rgba(250,236,210,0)'); }
  else { gr.addColorStop(0, 'rgba(248,250,245,0.95)'); gr.addColorStop(0.5, 'rgba(232,240,230,0.4)'); gr.addColorStop(1, 'rgba(230,238,229,0)'); }
  c.fillStyle = gr; c.fillRect(0, 0, 128, 128);
  const tex = new THREE.CanvasTexture(cv); tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

// ── MAR DE NUBES + niebla rasante + el resplandor del sol (Nolan) ─────────────
export function construirNieblas(rng) {
  const g = new THREE.Group();
  const texFria = texturaVaho(false), texCalida = texturaVaho(true);
  const cartas = [];
  const carta = (tex, x, y, z, w, h, op, drift = 0, add = false) => {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h),
      new THREE.MeshBasicMaterial({ map: tex, transparent: true, opacity: op, depthWrite: false, fog: false, blending: add ? THREE.AdditiveBlending : THREE.NormalBlending }));
    m.position.set(x, y, z);
    m.userData = { base: { x, drift }, ph: rng.float(0, 100) };
    g.add(m); cartas.push(m);
    return m;
  };
  // el MAR DE NUBES a los pies del telón (esconde la costura; el páramo flota)
  for (let i = 0; i < 8; i++) carta(texFria, (i - 3.5) * 150 + rng.float(-40, 40), 2 + rng.float(0, 10), -250 - rng.float(0, 50), 220 + rng.float(0, 90), 40 + rng.float(0, 16), 0.5 + rng.float(0, 0.2), 4);
  // niebla rasante dorada hugueando el hondón del agua
  for (let i = 0; i < 6; i++) { const x = -60 + rng.float(-40, 40), z = -60 + rng.float(-40, 40); carta(texCalida, x, H(x, z) + 2 + rng.float(0, 2.5), z, 26 + rng.float(0, 18), 6 + rng.float(0, 4), 0.08 + rng.float(0, 0.06), 6); }
  // velos rasantes por el claro (aire vivo entre god-rays)
  for (let i = 0; i < 5; i++) { const x = rng.float(-70, 70), z = rng.float(-70, 90); carta(texFria, x, H(x, z) + 3 + rng.float(0, 3), z, 40 + rng.float(0, 30), 8 + rng.float(0, 5), 0.06 + rng.float(0, 0.05), 5); }
  // EL RESPLANDOR: el sol metido en la bruma (núcleo + halo), DETRÁS de la
  // escena (−z, sobre el horizonte) para que RETROILUMINE el páramo (Nolan) —
  // el Ent queda a contraluz, con halo dorado en la roseta.
  const glow = carta(texCalida, 34, 132, -210, 460, 320, 0.34, 0, true);
  const nucleo = carta(texCalida, 34, 126, -206, 165, 130, 0.95, 0, true);
  const update = (t, camera) => {
    for (const m of cartas) {
      m.position.x = m.userData.base.x + Math.sin(t * 0.05 + m.userData.ph) * m.userData.base.drift;
      if (m !== glow && m !== nucleo) m.rotation.set(0, Math.atan2(camera.position.x - m.position.x, camera.position.z - m.position.z), 0);
    }
  };
  return { group: g, update };
}

// ── GOD-RAYS: conos aditivos anclados al suelo, SIEMPRE con motas (nunca limpios)
function hazTex() {
  const cv = document.createElement('canvas'); cv.width = 32; cv.height = 128;
  const c = cv.getContext('2d');
  const gr = c.createLinearGradient(0, 0, 0, 128);
  gr.addColorStop(0, 'rgba(255,240,200,0.9)'); gr.addColorStop(0.55, 'rgba(255,238,196,0.28)'); gr.addColorStop(1, 'rgba(255,236,190,0)');
  c.fillStyle = gr; c.fillRect(0, 0, 32, 128);
  const tex = new THREE.CanvasTexture(cv); tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}
export function construirRayos(rng) {
  const g = new THREE.Group();
  const rayTex = hazTex();
  const rayos = [];
  // haces esbeltos: el principal cae sobre el claro del Ent; los demás cosen el
  // páramo. Radios chicos + baja opacidad = shafts, no reflectores.
  const sitios = [[7, -3, 7, 50, 0.17], [-18, 12, 4.2, 38, 0.12], [22, -8, 4, 36, 0.11], [-38, -26, 3.4, 32, 0.09], [44, 30, 3.6, 32, 0.08], [-56, 40, 3, 30, 0.07], [16, 20, 4, 34, 0.1]];
  for (const [x, z, rad, alto, op] of sitios) {
    const y0 = H(x, z);
    const m = new THREE.MeshBasicMaterial({ map: rayTex, color: col(P.sol), transparent: true, opacity: op, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, fog: false });
    m._op0 = op;
    const cono = new THREE.Mesh(new THREE.ConeGeometry(rad, alto, 14, 1, true), m);
    cono.position.set(x, y0 + alto / 2, z); cono.rotation.x = 0.12;
    g.add(cono); rayos.push(cono);
    const charco = new THREE.Mesh(new THREE.CircleGeometry(rad * 0.9, 18),
      new THREE.MeshBasicMaterial({ color: col('#fff0cf'), transparent: true, opacity: op * 1.3, depthWrite: false, blending: THREE.AdditiveBlending, fog: false }));
    charco.rotation.x = -Math.PI / 2; charco.position.set(x, y0 + 0.14, z); g.add(charco);
  }
  const update = (t) => rayos.forEach((c, i) => { c.material.opacity = c.material._op0 * (0.8 + Math.sin(t * 0.5 + i) * 0.25); });
  return { group: g, update };
}

// ── MOTAS: esporas/polvo suspendidas en los haces (aire vivo del páramo) ──────
function motaTex() {
  const cv = document.createElement('canvas'); cv.width = cv.height = 32;
  const c = cv.getContext('2d');
  const gr = c.createRadialGradient(16, 16, 0, 16, 16, 16);
  gr.addColorStop(0, 'rgba(255,248,224,1)'); gr.addColorStop(1, 'rgba(255,248,224,0)');
  c.fillStyle = gr; c.fillRect(0, 0, 32, 32);
  const tex = new THREE.CanvasTexture(cv); tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}
export function construirMotas(rng) {
  const N = 340;
  const pos = new Float32Array(N * 3);
  for (let i = 0; i < N; i++) {
    const x = rng.float(-120, 120), z = rng.float(-90, 130);
    pos[i * 3] = x; pos[i * 3 + 1] = H(x, z) + rng.float(1, 24); pos[i * 3 + 2] = z;
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const mat = new THREE.PointsMaterial({ map: motaTex(), color: col('#fff4d8'), size: 0.5, sizeAttenuation: true, transparent: true, opacity: 0.32, depthWrite: false, blending: THREE.AdditiveBlending, fog: true });
  const pts = new THREE.Points(geo, mat); pts.frustumCulled = false;
  const update = (t) => {
    const a = geo.attributes.position.array;
    for (let i = 0; i < N; i++) {
      a[i * 3 + 1] += Math.sin(t * 0.3 + i) * 0.004 + 0.006;
      a[i * 3] += Math.sin(t * 0.2 + i * 0.5) * 0.004;
      if (a[i * 3 + 1] > H(a[i * 3], a[i * 3 + 2]) + 26) a[i * 3 + 1] = H(a[i * 3], a[i * 3 + 2]) + 1;
    }
    geo.attributes.position.needsUpdate = true;
  };
  return { points: pts, update };
}

// ── ROCAS del páramo (afloramientos, ancladas) — silueta que oculta/revela ────
export function construirRocas(rng) {
  const g = new THREE.Group();
  const matL = lambert(P.roca), matS = lambert(P.rocaSombra);
  const sitios = muestrear(rng, 14, 150, { slopeMax: 0.9, sep: 20, evitar: [{ x: CLARO.x, z: CLARO.z, r: 26 }] });
  for (const s of sitios) {
    const r = rng.float(1.2, 4.2);
    const roca = new THREE.Mesh(new THREE.DodecahedronGeometry(r, 0), rng.bool() ? matL : matS);
    roca.position.set(s.x, s.y + r * 0.3, s.z);
    roca.rotation.set(rng.float(0, 6), rng.float(0, 6), rng.float(0, 6));
    roca.scale.set(1, rng.float(0.6, 0.95), 1);
    g.add(roca);
  }
  return g;
}
