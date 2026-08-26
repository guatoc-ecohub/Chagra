// ── lib/impostor-lod.js ──────────────────────────────────────────────────────
// Sistema de IMPOSTORES + LOD para follaje masivo, módulo NUEVO y AISLADO.
// No se cablea al valle: el orquestador lo conecta a mano. Compatible con la
// convención del repo (three r160, `import * as THREE from 'three'`).
//
// Por qué existe: la ladera del páramo usa `IcosahedronGeometry(r,0)` crudos
// (~15.740 instancias) y viola la regla dura "follaje = MASA; si se le cuentan
// las caras → SACAR". El arreglo obvio (reemplazar cada icosaedro por una malla
// horneada de encenillo) ya se midió y FALLÓ: 59.9 → 30 FPS y la pared quedó
// pelada (malla a ~1/7 de escala). Conclusión heredada: no es un cambio de
// geometría de una línea, es trabajo CON PRESUPUESTO DE TRIÁNGULOS. Esto es eso.
//
// Tres niveles por distancia a la cámara, con histéresis (no parpadea en borde):
//   · CERCA (anillo chico, pool ≤ nearCap): malla real con volumen (esfera
//     esculpida con ruido, normales suaves, textura moteada de hojas). Poca
//     cantidad, solo los árboles más próximos.
//   · MEDIA: 3 billboards cruzados (quads a 0°/60°/120°) → volumen desde
//     cualquier ángulo, textura de copa-masa del atlas.
//   · LEJOS: billboard único encarado a cámara (se orienta en el vertex
//     shader), con variante del atlas para que no repitan silueta.
// UN draw call por nivel (`THREE.InstancedMesh`), matrices reescritas por frame
// SOLO cuando cambia la asignación de nivel (membresía), no cada frame.
//
// La textura de copa se genera POR CÓDIGO a un CanvasTexture: masa densa de
// hojitas con ruido, borde irregular dentado (NUNCA un círculo liso ni silueta
// poligonal contable). Sin descargas de assets. Verde dominante; el acento
// (amarillo/rosado) es mínimo. Prohibido eucalipto/pino pátula/retamo/acacia:
// la paleta por defecto es encenillo/gaque de páramo.
//
// El follaje SE MUEVE (regla dura "los árboles se mueven en TODOS los mundos"):
// viento suave en el vertex shader, pivotado en la base y con fase distinta por
// árbol (derivada de la posición), en los tres niveles.
//
// ═════════════════════════════════════════════════════════════════════════════
// HONESTIDAD DE RENDIMIENTO (este worker NO corre GPU — la medición es del gate
// del orquestador; no se inventan números):
//  · Presupuesto de geometría garantizado por diseño, independiente del conteo:
//    3 draw calls de InstancedMesh en total (cerca/media/lejos) para el sistema
//    completo. En el peor caso (15.740 árboles, cámara lejos) son ~15.740 quads
//    texturizados de 2 triángulos (≈31.5k tris) + ≤96 mallas reales del anillo.
//  · El FPS final (objetivo: ≥55 sostenido a 15.740) lo mide el gate sobre esta
//    arquitectura. Si no se sostiene, los knobs de ajuste SIN tocar la
//    arquitectura son: `opts.wind = 0`, tile del atlas a 128 (genAtlas), o bajar
//    `pixelRatio` en el demo. Lo que este archivo SÍ garantiza es que el conteo
//    de triángulos es del orden de un billboard por árbol, no de una malla por
//    árbol — que era lo que partía el framerate en dos.

import * as THREE from 'three';
import { uniformesVientoMundo } from '../lib3d/flora/vientoMundos.js';

// El impostor comparte el mismo reloj, ráfaga y dirección MUNDO que la flora
// cercana. La ecuación es la misma pareja de ondas co-primas del viento común;
// sólo cambia la forma de aplicarla: la copa cercana proyecta el vector sobre
// los ejes de su instancia y los billboards se desplazan directamente en mundo.
const VIENTO_MUNDO_GLSL = /* glsl */ `
uniform float uTiempoVM, uFuerzaVM;
uniform vec2 uDirVM;
uniform float uTurbVM, uFrecVM;
vec3 vientoImpostor(vec3 centroW) {
  vec2 dirW = normalize(uDirVM);
  vec2 perpW = vec2(-dirW.y, dirW.x);
  float ondaP = sin(dot(centroW.xz, dirW) * uFrecVM + uTiempoVM * 1.05);
  float ondaS = sin(dot(centroW.xz, perpW) * uFrecVM * 1.7 + uTiempoVM * 1.05 * 0.73) * uTurbVM;
  return vec3(dirW.x, 0.0, dirW.y) * (ondaP + ondaS);
}
`;

// ═════════════════════════════════════════════════════════════════════════════
//  Utilidades numéricas (PRNG + ruido determinista, mismas formas que lib3d)
// ═════════════════════════════════════════════════════════════════════════════
function mulberry32(a) {
  let s = a >>> 0;
  return () => {
    s |= 0; s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function hash2(x, y) {
  const h = Math.sin(x * 127.1 + y * 311.7) * 43758.5453;
  return h - Math.floor(h);
}

function vnoise(x, y) {
  const xi = Math.floor(x), yi = Math.floor(y);
  const xf = x - xi, yf = y - yi;
  const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
  return hash2(xi, yi) * (1 - u) * (1 - v) + hash2(xi + 1, yi) * u * (1 - v) +
    hash2(xi, yi + 1) * (1 - u) * v + hash2(xi + 1, yi + 1) * u * v;
}

function fbm(x, y, oct) {
  let s = 0, amp = 1, f = 1, norm = 0;
  for (let i = 0; i < oct; i++) { s += amp * vnoise(x * f, y * f); norm += amp; amp *= 0.5; f *= 2.03; }
  return s / norm;
}

function hexRGB(hex) {
  const n = parseInt(String(hex).replace('#', ''), 16);
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
}

function cssRGB(c) {
  return 'rgb(' + Math.round(c[0] * 255) + ',' + Math.round(c[1] * 255) + ',' + Math.round(c[2] * 255) + ')';
}

function mixRGB(a, b, t) {
  return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
}

function normalizarPaleta(p = {}) {
  return {
    base: hexRGB(p.base ?? '#3a5c2a'),
    claro: hexRGB(p.claro ?? '#6f9140'),
    oscuro: hexRGB(p.oscuro ?? '#24391d'),
    acento: hexRGB(p.acento ?? '#c9b54a'),
  };
}

// ═════════════════════════════════════════════════════════════════════════════
//  Texturas de copa generadas por código (canvas, deterministas)
// ═════════════════════════════════════════════════════════════════════════════
function pinta(ctx, x, y, rx, ry, color, alpha, rot) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rot);
  ctx.globalAlpha = alpha;
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.ellipse(0, 0, rx, ry, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

// ATLAS 2×2 de copas-masa (1024×512, 4 tiles de 512×256). Cada tile es una copa
// de masa densa con borde DENTADO (hojitas que se caen sobre la silueta, nunca
// un círculo liso). Se usa en MEDIA y LEJOS con variante por instancia.
function genAtlas(paleta, seed = 11) {
  const COLS = 2, ROWS = 2, TW = 512, TH = 256;
  const cv = document.createElement('canvas');
  cv.width = COLS * TW; cv.height = ROWS * TH;
  const ctx = cv.getContext('2d');
  for (let v = 0; v < COLS * ROWS; v++) {
    const c = v % COLS, r = (v / COLS) | 0;
    drawTile(ctx, c * TW, r * TH, TW, TH, seed * 131 + v * 97, paleta);
  }
  const tex = new THREE.CanvasTexture(cv);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.magFilter = THREE.LinearFilter;
  tex.minFilter = THREE.LinearMipmapLinearFilter;
  return tex;
}

function drawTile(ctx, ox, oy, TW, TH, seed, paleta) {
  const rn = mulberry32(seed);
  const rx = TW / 2, ry = TH / 2;
  const s = seed % 100;
  const blobR = (a) => {
    const n = fbm(Math.cos(a) * 2.1 + s, Math.sin(a) * 2.1 + s * 1.7, 3);
    return 0.88 * (1 + (n - 0.5) * 0.36);
  };
  const pt = (spread) => {
    const a = rn() * Math.PI * 2;
    const rr = blobR(a) * Math.pow(rn(), spread);
    return [ox + rx + Math.cos(a) * rx * rr, oy + ry + Math.sin(a) * ry * rr];
  };
  // capa 1 — sombra interior: manchas grandes oscuras hacia el centro
  for (let i = 0; i < 80; i++) {
    const [x, y] = pt(0.5);
    pinta(ctx, x, y, TW * (0.05 + rn() * 0.05), TH * (0.05 + rn() * 0.05), cssRGB(paleta.oscuro), 0.5, rn() * Math.PI);
  }
  // capa 2 — cuerpo: cientos de hojitas en tonos medios, denso en el centro
  for (let i = 0; i < 620; i++) {
    const [x, y] = pt(0.6);
    const t = rn();
    const tono = t < 0.62 ? mixRGB(paleta.base, paleta.oscuro, rn() * 0.55) : mixRGB(paleta.base, paleta.claro, (t - 0.62) * 1.4);
    pinta(ctx, x, y, TW * (0.013 + rn() * 0.024), TH * (0.012 + rn() * 0.022), cssRGB(tono), 0.92, rn() * Math.PI);
  }
  // capa 3 — luz: hojitas claras sesgadas a la cumbre (arriba-izquierda, el sol)
  for (let i = 0; i < 170; i++) {
    const a = Math.PI * (0.5 + rn() * 0.45);
    const rr = blobR(a) * Math.pow(rn(), 0.5);
    const x = ox + rx + Math.cos(a) * rx * rr;
    const y = oy + ry + Math.sin(a) * ry * rr;
    const tono = mixRGB(paleta.claro, paleta.acento, rn() * 0.45);
    pinta(ctx, x, y, TW * (0.011 + rn() * 0.018), TH * (0.01 + rn() * 0.017), cssRGB(tono), 0.8, rn() * Math.PI);
  }
  // capa 4 — acento mínimo: amarillo/rosado solo como manchitas contadas
  for (let i = 0; i < 30; i++) {
    const a = Math.PI * (0.45 + rn() * 0.6);
    const rr = blobR(a) * Math.pow(rn(), 0.4);
    const x = ox + rx + Math.cos(a) * rx * rr;
    const y = oy + ry + Math.sin(a) * ry * rr;
    pinta(ctx, x, y, TW * 0.012, TH * 0.011, cssRGB(paleta.acento), 0.5, rn() * Math.PI);
  }
  // capa 5 — borde DENTADO: hojitas oscuras justo sobre/tras la silueta para
  // que el contorno lea irregular (la copa es masa, no un círculo ni un polígono)
  for (let i = 0; i < 240; i++) {
    const a = rn() * Math.PI * 2;
    const rr = blobR(a) * (0.9 + rn() * 0.32);
    const x = ox + rx + Math.cos(a) * rx * rr;
    const y = oy + ry + Math.sin(a) * ry * rr;
    pinta(ctx, x, y, TW * (0.008 + rn() * 0.014), TH * (0.007 + rn() * 0.013), cssRGB(paleta.oscuro), 0.72, rn() * Math.PI);
  }
}

// Textura MOTTEADA tileable SIN alpha: para la malla real del nivel CERCA.
function genMoteado(paleta, seed = 3) {
  const tam = 256;
  const cv = document.createElement('canvas');
  cv.width = cv.height = tam;
  const ctx = cv.getContext('2d');
  const rn = mulberry32(seed * 4409 + 3);
  ctx.fillStyle = cssRGB(paleta.base);
  ctx.fillRect(0, 0, tam, tam);
  for (let i = 0; i < 540; i++) {
    const x = rn() * tam, y = rn() * tam;
    const L = tam * (0.014 + rn() * 0.03);
    const t = rn();
    const tono = t < 0.42 ? mixRGB(paleta.base, paleta.oscuro, rn() * 0.9) : mixRGB(paleta.base, paleta.claro, (t - 0.42) * 1.5);
    pinta(ctx, x, y, L, L / 2.3, cssRGB(tono), 0.8, rn() * Math.PI);
    for (const [dx, dy] of [[-tam, 0], [tam, 0], [0, -tam], [0, tam]]) {
      pinta(ctx, x + dx, y + dy, L, L / 2.3, cssRGB(tono), 0.8, rn() * Math.PI);
    }
  }
  const tex = new THREE.CanvasTexture(cv);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  return tex;
}

// ═════════════════════════════════════════════════════════════════════════════
//  Geometrías
// ═════════════════════════════════════════════════════════════════════════════
// Copa REAL del nivel cerca: esfera esculpida con ruido, normales suaves (NADA
// de facetas contables), color por vértice con gradiente de sombra→luz.
function buildNearCrown(paleta, seed) {
  const rn = mulberry32(seed * 331 + 7);
  const g = new THREE.SphereGeometry(1, 14, 11);
  const P = g.attributes.position;
  const n = P.count;
  for (let i = 0; i < n; i++) {
    const x = P.getX(i), y = P.getY(i), z = P.getZ(i);
    const nz = fbm(x * 1.7 + 7.1 + seed, z * 1.7 + 3.3, 3);
    const r = 1 + (nz - 0.5) * 0.55;
    P.setXYZ(i, x * r, y * r * 0.94, z * r);
  }
  g.computeVertexNormals();
  const col = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) {
    const t = THREE.MathUtils.clamp((P.getY(i) + 1) / 2, 0, 1);
    const c = mixRGB(paleta.oscuro, paleta.claro, t * 0.85 + 0.12);
    const j = (rn() - 0.5) * 0.09;
    col[i * 3] = Math.max(0, c[0] + j);
    col[i * 3 + 1] = Math.max(0, c[1] + j);
    col[i * 3 + 2] = Math.max(0, c[2] + j);
  }
  g.setAttribute('color', new THREE.BufferAttribute(col, 3));
  g.computeBoundingSphere();
  return g;
}

// 3 quads cruzados (0°/60°/120°) fusionados en UNA geometría: volumen desde
// cualquier ángulo, un solo draw call por nivel.
function buildCrossed() {
  const pos = [], nrm = [], uvs = [];
  for (const ang of [0, Math.PI / 3, (2 * Math.PI) / 3]) {
    const q = new THREE.PlaneGeometry(1, 1, 1, 1);
    q.rotateY(ang);
    const p = q.attributes.position, nn = q.attributes.normal, u = q.attributes.uv;
    for (let i = 0; i < p.count; i++) {
      pos.push(p.getX(i), p.getY(i), p.getZ(i));
      nrm.push(nn.getX(i), nn.getY(i), nn.getZ(i));
      uvs.push(u.getX(i), u.getY(i));
    }
    q.dispose();
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(pos), 3));
  g.setAttribute('normal', new THREE.BufferAttribute(new Float32Array(nrm), 3));
  g.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(uvs), 2));
  g.computeBoundingSphere();
  return g;
}

// ═════════════════════════════════════════════════════════════════════════════
//  Shaders de los niveles MEDIA y LEJOS (impostores texturizados con atlas).
//  · LEJOS: billboard encarado a cámara en el vertex shader (mv.xy alineado a
//    pantalla) + viento pivotado en la base (mv.x += sway con hf por vértice).
//  · MEDIA: transformación completa de instancia + viento en el mundo.
//  El color por instancia (instanceColor) modula el verde con variedad de valor.
//  Los atlas procedurales declaran sRGB para que el renderer no trate sus
//  bytes de color como lineales y aclare el bosque al aplicar la salida.
// ═════════════════════════════════════════════════════════════════════════════
const FRAG = `
uniform sampler2D uMap;
uniform vec3 uFogColor;
uniform float uFogNear;
uniform float uFogFar;
varying vec2 vUv;
varying float vDist;
varying vec3 vTint;
void main() {
  vec4 tex = texture2D(uMap, vUv);
  if (tex.a < 0.28) discard;
  vec3 c = tex.rgb * vTint;
  float f = clamp((vDist - uFogNear) / max(uFogFar - uFogNear, 1.0), 0.0, 1.0);
  c = mix(c, uFogColor, f);
  gl_FragColor = vec4(c, 1.0);
}
`;

const FAR_VERT = `
uniform float uWind;
${VIENTO_MUNDO_GLSL}
attribute vec3 aVariant;
varying vec2 vUv;
varying float vDist;
varying vec3 vTint;
void main() {
  vec3 corner = position;
  vec3 centerW = (instanceMatrix * vec4(0.0, 0.0, 0.0, 1.0)).xyz;
  // La matriz incluye yaw por instancia: leer [0][0] multiplica el ancho por
  // cos(yaw) y aplasta al azar la mayoría de los billboards lejanos. La norma
  // de cada columna conserva la escala real, independientemente de la rotación.
  float sx = length(instanceMatrix[0].xyz);
  float sy = length(instanceMatrix[1].xyz);
  float hf = clamp(corner.y + 0.5, 0.0, 1.0);
  vec3 swayW = vientoImpostor(centerW) * (uWind * uFuerzaVM * hf * sy * 0.05);
  vec4 mv = modelViewMatrix * vec4(centerW + swayW, 1.0);
  mv.xy += corner.xy * vec2(sx, sy);
  gl_Position = projectionMatrix * mv;
  vUv = aVariant.xy + (corner.xy + 0.5) * aVariant.z;
  vDist = -mv.z;
  #ifdef USE_INSTANCING_COLOR
    vTint = instanceColor;
  #else
    vTint = vec3(1.0);
  #endif
}
`;

const MED_VERT = `
uniform float uWind;
${VIENTO_MUNDO_GLSL}
attribute vec3 aVariant;
varying vec2 vUv;
varying float vDist;
varying vec3 vTint;
void main() {
  vec3 centerW = (instanceMatrix * vec4(0.0, 0.0, 0.0, 1.0)).xyz;
  vec3 wp = (instanceMatrix * vec4(position, 1.0)).xyz;
  float sy = length(instanceMatrix[1].xyz);
  float hf = clamp(position.y + 0.5, 0.0, 1.0);
  wp += vientoImpostor(centerW) * (uWind * uFuerzaVM * hf * sy * 0.05);
  vec4 mv = modelViewMatrix * vec4(wp, 1.0);
  gl_Position = projectionMatrix * mv;
  vUv = aVariant.xy + (position.xy + 0.5) * aVariant.z;
  vDist = -mv.z;
  #ifdef USE_INSTANCING_COLOR
    vTint = instanceColor;
  #else
    vTint = vec3(1.0);
  #endif
}
`;

// ═════════════════════════════════════════════════════════════════════════════
//  Fábrica principal
// ═════════════════════════════════════════════════════════════════════════════
// makeImpostorLOD({ count, area, alturaObjetivo, paleta, terreno, nearCap,
//                  wind, fog, seed, posiciones }) → { group, update(camera, dt),
//                  resize(n), counts(), dispose() }
// `posiciones`: array o `(m) => array` de `{x, y, z, sx, sy, tint?, yaw?}`
// (opcional). Cuando se da, reemplaza el scatter por heightfield con centros de
// copa ya anclados a la superficie — usado por la pared del páramo (cliff.js).
export function makeImpostorLOD(opts = {}) {
  const altura = Math.max(2, opts.alturaObjetivo ?? 11);
  const area = opts.area ?? { x0: -80, x1: 80, z0: -40, z1: 40 };
  const terreno = opts.terreno ?? (() => 0);
  const paleta = normalizarPaleta(opts.paleta);
  const nearCap = Math.max(1, Math.floor(opts.nearCap ?? 96));
  const wind = opts.wind ?? 0.6;
  const seed = opts.seed ?? 7;
  const fog = opts.fog ?? { near: altura * 8, far: altura * 30, color: 0xc4d6ce };

  // rados de histéresis (en función de la altura objetivo: escalan con el mundo)
  const nearEnter = altura * 0.9;
  const nearExit = altura * 1.45;
  const medEnter = altura * 3.6;
  const medExit = altura * 5.5;

  const cap = Math.max(Math.floor(opts.count ?? 15740), 20000);

  // ── estado por instancia ──
  const pos = new Float32Array(cap * 3);   // posición del centro de copa
  const scl = new Float32Array(cap * 2);   // ancho, alto
  const yaw = new Float32Array(cap);
  const variant = new Uint8Array(cap);
  let n = Math.max(1, Math.floor(opts.count ?? 15740));

  // ── buffers scratch (sin GC por frame) ──
  const _d = new Float32Array(cap);
  const _lev = new Int8Array(cap); _lev.fill(1);
  const _nearCand = new Int32Array(cap);
  const _nearIdx = new Int32Array(cap);
  const _medIdx = new Int32Array(cap);
  const _farIdx = new Int32Array(cap);
  let allDirty = true;

  // ── texturas ──
  const atlas = opts.atlas ?? genAtlas(paleta, seed);
  const mottled = opts.moteado ?? genMoteado(paleta, seed);

  // ── nivel CERCA: malla real, pool chico ──
  const nearGeo = buildNearCrown(paleta, seed);
  const nearU = {
    uWind: { value: wind },
    uTiempoVM: uniformesVientoMundo.uTiempoVM,
    uFuerzaVM: uniformesVientoMundo.uFuerzaVM,
    uDirVM: uniformesVientoMundo.uDirVM,
    uTurbVM: uniformesVientoMundo.uTurbVM,
    uFrecVM: uniformesVientoMundo.uFrecVM,
  };
  const nearMat = new THREE.MeshStandardMaterial({ map: mottled, vertexColors: true, roughness: 1, metalness: 0 });
  nearMat.onBeforeCompile = (shader) => {
    shader.uniforms.uWind = nearU.uWind;
    shader.uniforms.uTiempoVM = nearU.uTiempoVM;
    shader.uniforms.uFuerzaVM = nearU.uFuerzaVM;
    shader.uniforms.uDirVM = nearU.uDirVM;
    shader.uniforms.uTurbVM = nearU.uTurbVM;
    shader.uniforms.uFrecVM = nearU.uFrecVM;
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>',
        `#include <common>\nuniform float uWind;\n${VIENTO_MUNDO_GLSL}`)
      .replace('#include <begin_vertex>',
        '#include <begin_vertex>\n' +
        '\tfloat hf_ = clamp( transformed.y + 0.5, 0.0, 1.0 );\n' +
        '\tvec3 centroW_ = ( modelMatrix * instanceMatrix * vec4( 0.0, 0.0, 0.0, 1.0 ) ).xyz;\n' +
        '\tvec3 vientoW_ = vientoImpostor( centroW_ );\n' +
        '\tmat3 ejesW_ = mat3( modelMatrix * instanceMatrix );\n' +
        '\tvec3 vientoL_ = vec3(\n' +
        '\t\tdot( vientoW_, ejesW_[0] ) / max( dot( ejesW_[0], ejesW_[0] ), 1e-5 ),\n' +
        '\t\tdot( vientoW_, ejesW_[1] ) / max( dot( ejesW_[1], ejesW_[1] ), 1e-5 ),\n' +
        '\t\tdot( vientoW_, ejesW_[2] ) / max( dot( ejesW_[2], ejesW_[2] ), 1e-5 )\n' +
        '\t);\n' +
        '\ttransformed += vientoL_ * ( uWind * uFuerzaVM * hf_ * 0.07 );');
  };
  const nearMesh = new THREE.InstancedMesh(nearGeo, nearMat, cap);
  nearMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  nearMesh.frustumCulled = false;
  nearMesh.count = 0;
  nearMesh.visible = false;

  // ── nivel MEDIA: billboards cruzados ──
  const medGeo = buildCrossed();
  const medVarAttr = new THREE.InstancedBufferAttribute(new Float32Array(cap * 3), 3);
  medGeo.setAttribute('aVariant', medVarAttr);

  // ── nivel LEJOS: billboard único encarado a cámara ──
  const farGeo = new THREE.PlaneGeometry(1, 1, 1, 1);
  const farVarAttr = new THREE.InstancedBufferAttribute(new Float32Array(cap * 3), 3);
  farGeo.setAttribute('aVariant', farVarAttr);

  const baseU = {
    uMap: { value: atlas },
    uWind: { value: wind },
    uTiempoVM: uniformesVientoMundo.uTiempoVM,
    uFuerzaVM: uniformesVientoMundo.uFuerzaVM,
    uDirVM: uniformesVientoMundo.uDirVM,
    uTurbVM: uniformesVientoMundo.uTurbVM,
    uFrecVM: uniformesVientoMundo.uFrecVM,
    uFogColor: { value: new THREE.Color(fog.color) },
    uFogNear: { value: fog.near },
    uFogFar: { value: fog.far },
  };
  const medMat = new THREE.ShaderMaterial({ uniforms: baseU, vertexShader: MED_VERT, fragmentShader: FRAG, side: THREE.DoubleSide });
  const farMat = new THREE.ShaderMaterial({ uniforms: baseU, vertexShader: FAR_VERT, fragmentShader: FRAG, side: THREE.DoubleSide });

  const medMesh = new THREE.InstancedMesh(medGeo, medMat, cap);
  medMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  medMesh.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(cap * 3), 3);
  medMesh.frustumCulled = false;
  medMesh.count = 0;
  medMesh.visible = false;

  const farMesh = new THREE.InstancedMesh(farGeo, farMat, cap);
  farMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  farMesh.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(cap * 3), 3);
  farMesh.frustumCulled = false;
  farMesh.count = 0;
  farMesh.visible = false;

  const group = new THREE.Group();
  group.add(nearMesh, medMesh, farMesh);

  // ── scatter + pintado de atributos por instancia ──
  // `opts.posiciones` (OPCIONAL, usado por la pared del páramo): array o
  // función `(m) => array` de `{x, y, z, sx, sy, tint?, yaw?}` con los CENTROS
  // de copa ya anclados a la superficie (por ej. la cara paramétrica del
  // farallón, que un heightfield no sabe representar). Cuando se da, se usa en
  // vez del scatter por `area`/`terreno`; el yaw y la variante del atlas se
  // siguen randomizando igual. `tint` multiplica el instanceColor (luz horneada
  // de gran forma). Backward compatible: sin `posiciones` todo queda igual.
  const TS = 0.5; // atlas 2×2
  function regenerar(m) {
    const P = typeof opts.posiciones === 'function'
      ? opts.posiciones(m)
      : (Array.isArray(opts.posiciones) ? opts.posiciones : null);
    const aw = area.x1 - area.x0, az = area.z1 - area.z0;
    const cols = Math.max(1, Math.ceil(Math.sqrt((m * aw) / Math.max(az, 0.1))));
    const rows = Math.ceil(m / cols);
    const rn = mulberry32(seed * 131 + 7);
    for (let i = 0; i < m; i++) {
      const p = P && P[i];
      if (p) {
        pos[i * 3] = p.x; pos[i * 3 + 1] = p.y; pos[i * 3 + 2] = p.z;
        scl[i * 2] = p.sx; scl[i * 2 + 1] = p.sy;
        yaw[i] = p.yaw !== undefined ? p.yaw : rn() * Math.PI * 2;
        variant[i] = (rn() * 4) | 0;
      } else {
        const gx = i % cols, gy = (i / cols) | 0;
        const u = (gx + 0.5 + (rn() - 0.5)) / cols;
        const v = (gy + 0.5 + (rn() - 0.5)) / rows;
        const x = area.x0 + u * aw;
        const z = area.z0 + v * az;
        const emerg = rn() < 0.06 ? 1.75 : 1;
        const sy = altura * (0.55 + rn() * 0.5) * emerg;
        const sx = sy * (0.72 + rn() * 0.34);
        pos[i * 3] = x;
        pos[i * 3 + 1] = terreno(x, z) + sy * 0.62;
        pos[i * 3 + 2] = z;
        scl[i * 2] = sx;
        scl[i * 2 + 1] = sy;
        yaw[i] = rn() * Math.PI * 2;
        variant[i] = (rn() * 4) | 0;
      }
    }
    const am = medVarAttr.array, af = farVarAttr.array;
    for (let i = 0; i < m; i++) {
      const v = variant[i], c = v % 2, r = (v / 2) | 0;
      am[i * 3] = c * TS; am[i * 3 + 1] = r * TS; am[i * 3 + 2] = TS;
      af[i * 3] = c * TS; af[i * 3 + 1] = r * TS; af[i * 3 + 2] = TS;
    }
    medVarAttr.needsUpdate = true;
    farVarAttr.needsUpdate = true;
    // tinte por instancia: variedad de valor del verde (modulación de luz).
    // `tint` puede ser escalar (compatibilidad) o RGB: la pared del farallón
    // pasa la misma rampa fría por canal que usa la portada, porque estos
    // billboards no reciben la iluminación de MeshStandardMaterial.
    const icm = medMesh.instanceColor.array, icf = farMesh.instanceColor.array;
    const rn2 = mulberry32(seed ^ 0x9e3779b9);
    for (let i = 0; i < m; i++) {
      const p = P && P[i];
      const tK = p && p.tint !== undefined ? p.tint : 1;
      const t = 0.82 + rn2() * 0.32;
      const tr = Array.isArray(tK) ? tK[0] : t * 0.96 * tK;
      const tg = Array.isArray(tK) ? tK[1] : t * 1.02 * tK;
      const tb = Array.isArray(tK) ? tK[2] : t * 0.9 * tK;
      icm[i * 3] = tr; icm[i * 3 + 1] = tg; icm[i * 3 + 2] = tb;
      icf[i * 3] = icm[i * 3]; icf[i * 3 + 1] = icm[i * 3 + 1]; icf[i * 3 + 2] = icm[i * 3 + 2];
    }
    medMesh.instanceColor.needsUpdate = true;
    farMesh.instanceColor.needsUpdate = true;
  }

  // ── escritura de matrices ──
  const _m = new THREE.Matrix4();
  const _q = new THREE.Quaternion();
  const _v = new THREE.Vector3();
  const _sc = new THREE.Vector3();
  const YAXIS = new THREE.Vector3(0, 1, 0);

  function escribirCerca(lista, cnt) {
    nearMesh.count = cnt;
    nearMesh.visible = cnt > 0;
    for (let k = 0; k < cnt; k++) {
      const idx = lista[k];
      _q.setFromAxisAngle(YAXIS, yaw[idx]);
      _v.set(pos[idx * 3], pos[idx * 3 + 1], pos[idx * 3 + 2]);
      _sc.set(scl[idx * 2], scl[idx * 2 + 1], scl[idx * 2]);
      _m.compose(_v, _q, _sc);
      nearMesh.setMatrixAt(k, _m);
    }
    nearMesh.instanceMatrix.needsUpdate = true;
  }

  function escribirMedia(lista, cnt) {
    medMesh.count = cnt;
    medMesh.visible = cnt > 0;
    for (let k = 0; k < cnt; k++) {
      const idx = lista[k];
      _q.setFromAxisAngle(YAXIS, yaw[idx]);
      _v.set(pos[idx * 3], pos[idx * 3 + 1], pos[idx * 3 + 2]);
      _sc.set(scl[idx * 2], scl[idx * 2 + 1], 1);
      _m.compose(_v, _q, _sc);
      medMesh.setMatrixAt(k, _m);
    }
    medMesh.instanceMatrix.needsUpdate = true;
  }

  function escribirLejos(lista, cnt) {
    farMesh.count = cnt;
    farMesh.visible = cnt > 0;
    for (let k = 0; k < cnt; k++) {
      const idx = lista[k];
      // `Matrix4.set()` recibe los elementos en orden matemático (fila,
      // columna). La traslación vive en la ÚLTIMA COLUMNA, que es la que
      // lee `instanceMatrix * vec4(...)` en FAR_VERT; ponerla en n41/n42/n43
      // deja todos los billboards en el origen aunque el array parezca lleno.
      _m.set(
        scl[idx * 2], 0, 0, pos[idx * 3],
        0, scl[idx * 2 + 1], 0, pos[idx * 3 + 1],
        0, 0, 1, pos[idx * 3 + 2],
        0, 0, 0, 1
      );
      farMesh.setMatrixAt(k, _m);
    }
    farMesh.instanceMatrix.needsUpdate = true;
  }

  // ── update(camera, dt): reparto LOD con histéresis + viento ──
  function update(camera, dt) {
    if (dt === undefined || dt < 0) dt = 0;

    const cxp = camera.position;
    const cx = cxp.x, cz = cxp.z;
    for (let i = 0; i < n; i++) {
      const dx = pos[i * 3] - cx;
      const dz = pos[i * 3 + 2] - cz;
      _d[i] = Math.sqrt(dx * dx + dz * dz);
    }

    // primer frame / tras resize: asignación limpia por distancia (sin histéresis)
    if (allDirty) {
      let c0 = 0, c1 = 0, c2 = 0;
      for (let i = 0; i < n; i++) {
        const di = _d[i];
        if (di < nearExit) _nearCand[c0++] = i;
        else if (di < medExit) _medIdx[c1++] = i;
        else _farIdx[c2++] = i;
      }
      for (let k = 1; k < c0; k++) {
        const vv = _nearCand[k], dv = _d[vv];
        let j = k - 1;
        while (j >= 0 && _d[_nearCand[j]] > dv) { _nearCand[j + 1] = _nearCand[j]; j--; }
        _nearCand[j + 1] = vv;
      }
      const ns = Math.min(c0, nearCap);
      let nCnt = 0;
      for (let k = 0; k < ns; k++) { _lev[_nearCand[k]] = 0; _nearIdx[nCnt++] = _nearCand[k]; }
      for (let k = ns; k < c0; k++) { _lev[_nearCand[k]] = 1; _medIdx[c1++] = _nearCand[k]; }
      escribirCerca(_nearIdx, nCnt);
      escribirMedia(_medIdx, c1);
      escribirLejos(_farIdx, c2);
      allDirty = false;
      return;
    }

    let nearDirty = false, medDirty = false, farDirty = false;

    // anillo CERCA: candidatos con histéresis (entrar = bien adentro, salir = bien afuera)
    let candC = 0;
    for (let i = 0; i < n; i++) {
      const di = _d[i], cur = _lev[i];
      if (cur === 0) {
        if (di > nearExit) { _lev[i] = 1; nearDirty = true; medDirty = true; }
        else _nearCand[candC++] = i;
      } else if (di < nearEnter) {
        _nearCand[candC++] = i;
      }
    }
    for (let k = 1; k < candC; k++) {
      const vv = _nearCand[k], dv = _d[vv];
      let j = k - 1;
      while (j >= 0 && _d[_nearCand[j]] > dv) { _nearCand[j + 1] = _nearCand[j]; j--; }
      _nearCand[j + 1] = vv;
    }
    const ns = Math.min(candC, nearCap);
    let nCnt = 0;
    for (let k = 0; k < ns; k++) {
      const idx = _nearCand[k];
      if (_lev[idx] !== 0) { _lev[idx] = 0; nearDirty = true; medDirty = true; }
      _nearIdx[nCnt++] = idx;
    }
    for (let k = ns; k < candC; k++) {
      const idx = _nearCand[k];
      if (_lev[idx] === 0) { _lev[idx] = 1; nearDirty = true; medDirty = true; }
    }

    // MEDIA/LEJOS: histéresis sobre los dos umbrales
    for (let i = 0; i < n; i++) {
      const cur = _lev[i];
      if (cur === 0) continue;
      const di = _d[i];
      if (cur === 1) {
        if (di > medExit) { _lev[i] = 2; medDirty = true; farDirty = true; }
      } else if (di < medEnter) {
        _lev[i] = 1; medDirty = true; farDirty = true;
      }
    }

    if (nearDirty) escribirCerca(_nearIdx, nCnt);
    if (medDirty) {
      let c = 0;
      for (let i = 0; i < n; i++) if (_lev[i] === 1) _medIdx[c++] = i;
      escribirMedia(_medIdx, c);
    }
    if (farDirty) {
      let c = 0;
      for (let i = 0; i < n; i++) if (_lev[i] === 2) _farIdx[c++] = i;
      escribirLejos(_farIdx, c);
    }
  }

  function resize(m) {
    m = Math.max(1, Math.min(Math.floor(m), cap));
    n = m;
    regenerar(m);
    _lev.fill(1);
    allDirty = true;
  }

  function counts() {
    return { total: n, near: nearMesh.count, med: medMesh.count, far: farMesh.count };
  }

  function dispose() {
    nearGeo.dispose(); medGeo.dispose(); farGeo.dispose();
    atlas.dispose(); mottled.dispose();
    nearMat.dispose(); medMat.dispose(); farMat.dispose();
  }

  regenerar(n);
  return { group, update, resize, counts, dispose };
}
