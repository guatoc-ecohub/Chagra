/*
 * nieveSierra — el CASQUETE de nieve, las CURVAS DE NIVEL y la NUBE-MASA de la
 * vista global de la Sierra, como funciones puras sobre la altura del macizo
 * (cero React; three solo para construir geometría/textura). Lo consume
 * `VistaGlobalSierra.jsx`.
 *
 * Por qué existe (ops/DISENO-TRANSICION-CLIMAS-20260902.md §2.3 y §6-B;
 * ops/INTEGRACION-CLIMA-CLASE-MUNDIAL-20260904.md §9):
 *
 *  1. LA CIMA NO TENÍA NIEVE. El color nival `#eef2f4` iba como color de
 *     vértice de un `MeshLambert` bajo la hora dorada (luz `#ffd79a`, domo
 *     `#f7c66b`, niebla `#f0c98d`): medido en pantalla salía ARENA
 *     (212,196,166) y el cielo de encima (242,217,168) era MÁS claro que la
 *     «nieve». Una Sierra Nevada sin nevado. La nieve no puede ser un color
 *     iluminado por la lámpara dorada: es una CAPA con su propia luz baked
 *     (sol rasante → cara al sol blanca, cara opuesta azul), inyectada en el
 *     mismo material después del tonemapping (`inyectarNieve`).
 *  2. Y pintar la cima LLENA también sería falso (§6-B): Colombia perdió casi
 *     todo su glaciar. Banda nival = casquete PEQUEÑO y mordido por encima de
 *     la línea de hielo de hoy + parches en la roca + la LÍNEA ÁMBAR de hasta
 *     dónde llegaba (la cota canónica 4 800 m del tope del superpáramo), con
 *     su rótulo. Ámbar de cuídelo, nunca rojo.
 *  3. Las bandas de piso eran conos translúcidos apilados sobre la montaña:
 *     una CUÑA de bordes rectos que lavaba las bandas altas. El mapa vertical
 *     se dibuja como mapa: curvas de nivel finas SOBRE el relieve.
 *  4. Las nubes eran un solo tono (`#fbf4e6` × alfa). Una nube es masa cuando
 *     tiene lomo, panza y borde roto (DIRECCION-CIELO-Y-NUBE §3.1): textura
 *     RGBA horneada, calco reducido de `nubeCanvas` del valle.
 *
 * Nada de esto está certificado: los números son juicio de dirección de arte,
 * medidos en captura GPU-headed (ver el informe del carril). El operador juzga.
 */
import * as THREE from 'three';

const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const sstep = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
const mix = (a, b, t) => a + (b - a) * t;
const hexRgb = (h) => [parseInt(h.slice(1, 3), 16) / 255, parseInt(h.slice(3, 5), 16) / 255, parseInt(h.slice(5, 7), 16) / 255];

/* Ruido determinista fino (senos), para romper la línea de nieve en lengüetas
   y sembrar parches en la roca. Sin Math.random: la captura del gate compara. */
export function ruidoFino(wx, wz) {
  return (
    Math.sin(wx * 7.3 + wz * 5.1) * 0.5 +
    Math.sin(wx * 13.7 - wz * 9.3 + 1.3) * 0.3 +
    Math.sin(wx * 23.1 + wz * 17.9 + 2.9) * 0.2
  );
}

/** Tokens del casquete (juicio de arte; hex de pantalla, se inyectan tras el tonemapping). */
export const NIEVE = {
  luz: '#f8f6f1',      // cara al sol rasante: blanco apenas cálido, MÁS claro que el cielo dorado
  sombra: '#c2cfe2',   // cara opuesta: la nieve en sombra es azul (manto.sombra de la helada, misma familia)
  roca: '#a9b3bb',     // la roca del nival entre parches: gris frío (no crema, no arena)
  ambar: '#e0a84a',    // «hasta aquí llegaba el hielo» — ámbar de cuídelo
  tinta: '#3a2a18',    // curvas de nivel: la tinta de los rótulos
  /* Cuánto por encima de la cota canónica del nival (4 800 m, tope del
     superpáramo = 4,15 u) arranca el casquete de HOY. +0,22 u ≈ +250 m. Es
     una decisión de dirección (§6-B «casquete mordido»), no un dato glaciológico
     medido: si el operador trae la cota real del glaciar, va aquí. */
  mordidaHoy: 0.22,
};

/**
 * La nieve en un punto del relieve: alfa (cuánto casquete) y color (lit/sombra)
 * a partir de la altura, el gradiente local y la línea de hielo canónica.
 *
 * @param {number} wx
 * @param {number} wz
 * @param {number} y  altura del vértice (world Y)
 * @param {(x:number,z:number)=>number} hFn  la altura del macizo
 * @param {{ lineaHielo:number, sol:[number,number,number] }} opts
 * @returns {[number,number,number,number]} r,g,b (0..1, sRGB) + alfa
 */
export function nieveEnPunto(wx, wz, y, hFn, { lineaHielo, sol }) {
  // La COMPUERTA gruesa: 1 en la zona del casquete, 0 lejos (ahorra el mix abajo).
  // El borde fino del casquete NO se decide aquí (con la malla de 56 segmentos el
  // alfa por vértice dibujaba dientes de sierra en la línea de nieve — medido al
  // 300 %): lo decide `inyectarNieve` por FRAGMENTO con el mismo ruido en GLSL.
  const a = sstep(lineaHielo - 0.55, lineaHielo - 0.15, y);
  if (a < 0.003) return [0, 0, 0, 0];
  // sombreado propio: normal por diferencias finitas de la ALTURA (suave), sol rasante
  const e = 0.05;
  const gx = (hFn(wx + e, wz) - hFn(wx - e, wz)) / (2 * e);
  const gz = (hFn(wx, wz + e) - hFn(wx, wz - e)) / (2 * e);
  const nl = Math.hypot(gx, 1, gz);
  const nx = -gx / nl, ny = 1 / nl, nz = -gz / nl;
  const sl = Math.hypot(sol[0], sol[1], sol[2]);
  const ndl = (nx * sol[0] + ny * sol[1] + nz * sol[2]) / sl;
  const k = sstep(-0.05, 0.75, ndl);
  const L = hexRgb(NIEVE.luz), S = hexRgb(NIEVE.sombra);
  return [mix(S[0], L[0], k), mix(S[1], L[1], k), mix(S[2], L[2], k), a];
}

/**
 * Añade a una geometría de terreno (grid regular, atributo `position`) el
 * atributo `aNieve` (vec4: color sRGB + alfa) que `inyectarNieve` lee en el
 * shader. Va ANTES de `toNonIndexed()`: los atributos viajan con la de-indexación.
 */
export function anadirAtributoNieve(geo, hFn, opts) {
  const pos = geo.getAttribute('position');
  const out = new Float32Array(pos.count * 4);
  for (let i = 0; i < pos.count; i++) {
    const v = nieveEnPunto(pos.getX(i), pos.getZ(i), pos.getY(i), hFn, opts);
    out[i * 4] = v[0]; out[i * 4 + 1] = v[1]; out[i * 4 + 2] = v[2]; out[i * 4 + 3] = v[3];
  }
  geo.setAttribute('aNieve', new THREE.BufferAttribute(out, 4));
  return geo;
}

/**
 * Fabrica el `onBeforeCompile` del material del macizo: la nieve se mezcla
 * DESPUÉS del tonemapping y del cambio de espacio de color, o sea con su luz
 * propia y sin la lámpara dorada encima (que es lo que la volvía arena). La
 * niebla de la escena sí la toca (viene después): el casquete lejano se vela
 * como todo. El BORDE se decide por fragmento (ruido GLSL = ruidoFino), no por
 * vértice: con 56 segmentos el alfa interpolado dibujaba dientes en la línea.
 * Crear UNA vez a nivel de módulo: r3f no recompila el material por identidad.
 */
export function crearInyectorNieve({ lineaHielo }) {
  const hoy = lineaHielo + NIEVE.mordidaHoy;
  const f = (v) => v.toFixed(4);
  return function inyectarNieve(shader) {
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nattribute vec4 aNieve;\nvarying vec4 vNieve;\nvarying vec3 vNieveW;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvNieve = aNieve;\nvNieveW = (modelMatrix * vec4(transformed, 1.0)).xyz;');
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', `#include <common>
varying vec4 vNieve;
varying vec3 vNieveW;
float nieveRn(vec2 p) {   // el mismo ruido determinista de ruidoFino(): la línea baja por las vaguadas
  return sin(p.x * 7.3 + p.y * 5.1) * 0.5 + sin(p.x * 13.7 - p.y * 9.3 + 1.3) * 0.3 + sin(p.x * 23.1 + p.y * 17.9 + 2.9) * 0.2;
}`)
      .replace('#include <colorspace_fragment>', `#include <colorspace_fragment>
if (vNieve.a > 0.001) {
  float yr = vNieveW.y + nieveRn(vNieveW.xz) * 0.09;
  float casq = smoothstep(${f(hoy - 0.06)}, ${f(hoy + 0.10)}, yr);                 // el casquete de hoy, continuo
  float n2 = nieveRn(vNieveW.xz * 1.9 + vec2(3.1, -2.7)) * 0.5 + 0.5;
  float enRoca = smoothstep(${f(lineaHielo - 0.02)}, ${f(lineaHielo + 0.08)}, yr);
  float parche = smoothstep(0.58, 0.82, n2) * enRoca * (1.0 - casq) * 0.7;  // nieve vieja en la roca, mordida
  gl_FragColor.rgb = mix(gl_FragColor.rgb, vNieve.rgb, max(casq, parche) * vNieve.a);
}`);
  };
}

/**
 * Muestreador de altura que sigue EXACTAMENTE las facetas del terreno tal como
 * `construirTerreno` las triangula (a,d,b)(b,d,e): las cintas se apoyan en la
 * malla dibujada, no en la función suave, y no se hunden entre facetas.
 */
export function muestreadorFacetas(hFn, { ancho, fondo, segX, segZ }) {
  const nx = segX + 1, nz = segZ + 1;
  const h = new Float32Array(nx * nz);
  for (let iz = 0; iz < nz; iz++) for (let ix = 0; ix < nx; ix++) {
    h[iz * nx + ix] = hFn(-ancho / 2 + (ancho * ix) / segX, -fondo / 2 + (fondo * iz) / segZ);
  }
  return (wx, wz) => {
    const fx = clamp(((wx + ancho / 2) / ancho) * segX, 0, segX - 1e-6);
    const fz = clamp(((wz + fondo / 2) / fondo) * segZ, 0, segZ - 1e-6);
    const ix = Math.floor(fx), iz = Math.floor(fz), u = fx - ix, v = fz - iz;
    const a = h[iz * nx + ix], b = h[iz * nx + ix + 1], d = h[(iz + 1) * nx + ix], e = h[(iz + 1) * nx + ix + 1];
    return u + v < 1 ? a + (b - a) * u + (d - a) * v : e + (d - e) * (1 - u) + (b - e) * (1 - v);
  };
}

/**
 * Curvas de nivel por marching squares sobre `hFn`, encadenadas en polilíneas.
 * @param {(x:number,z:number)=>number} hFn  altura del macizo
 * @param {number} nivel  cota a la que se traza la curva (hFn(x,z) === nivel)
 * @param {Object} [opts]  ventana de muestreo en coordenadas de mundo
 * @param {number} [opts.x0]
 * @param {number} [opts.x1]
 * @param {number} [opts.z0]
 * @param {number} [opts.z1]
 * @param {number} [opts.paso]
 * @returns {Array<Array<[number,number]>>} polilíneas [wx, wz]
 */
export function contornoNivel(hFn, nivel, { x0, x1, z0, z1, paso = 0.08 } = {}) {
  const nx = Math.ceil((x1 - x0) / paso) + 1, nz = Math.ceil((z1 - z0) / paso) + 1;
  const g = new Float32Array(nx * nz);
  for (let iz = 0; iz < nz; iz++) for (let ix = 0; ix < nx; ix++) g[iz * nx + ix] = hFn(x0 + ix * paso, z0 + iz * paso) - nivel;
  const segs = [];
  /** @type {(xa: number, za: number, va: number, xb: number, zb: number, vb: number) => [number, number]} */
  const lerpP = (xa, za, va, xb, zb, vb) => { const t = va / (va - vb); return [xa + (xb - xa) * t, za + (zb - za) * t]; };
  for (let iz = 0; iz < nz - 1; iz++) for (let ix = 0; ix < nx - 1; ix++) {
    const x = x0 + ix * paso, z = z0 + iz * paso;
    const v00 = g[iz * nx + ix], v10 = g[iz * nx + ix + 1], v01 = g[(iz + 1) * nx + ix], v11 = g[(iz + 1) * nx + ix + 1];
    const c = (v00 > 0 ? 1 : 0) | (v10 > 0 ? 2 : 0) | (v11 > 0 ? 4 : 0) | (v01 > 0 ? 8 : 0);
    if (c === 0 || c === 15) continue;
    const pts = [];
    if ((c & 1) !== ((c >> 1) & 1)) pts.push(lerpP(x, z, v00, x + paso, z, v10));                 // borde inferior
    if (((c >> 1) & 1) !== ((c >> 2) & 1)) pts.push(lerpP(x + paso, z, v10, x + paso, z + paso, v11)); // derecho
    if (((c >> 2) & 1) !== ((c >> 3) & 1)) pts.push(lerpP(x, z + paso, v01, x + paso, z + paso, v11)); // superior
    if (((c >> 3) & 1) !== (c & 1)) pts.push(lerpP(x, z, v00, x, z + paso, v01));                 // izquierdo
    if (pts.length === 2) segs.push([pts[0], pts[1]]);
    else if (pts.length === 4) { segs.push([pts[0], pts[3]]); segs.push([pts[1], pts[2]]); }     // silla: dos tramos
  }
  // encadenar por extremos coincidentes (mismo punto de borde → misma clave)
  const key = (p) => `${Math.round(p[0] * 1e4)},${Math.round(p[1] * 1e4)}`;
  const porInicio = new Map();
  segs.forEach((s, i) => { for (const k of [key(s[0]), key(s[1])]) { if (!porInicio.has(k)) porInicio.set(k, []); porInicio.get(k).push(i); } });
  const usado = new Uint8Array(segs.length);
  const lineas = [];
  for (let i = 0; i < segs.length; i++) {
    if (usado[i]) continue;
    usado[i] = 1;
    const linea = [segs[i][0], segs[i][1]];
    for (const dir of [1, 0]) {                       // crecer por la cola, luego por la cabeza
      for (;;) {
        const fin = dir ? linea[linea.length - 1] : linea[0];
        const cand = (porInicio.get(key(fin)) || []).find((j) => !usado[j]);
        if (cand === undefined) break;
        usado[cand] = 1;
        const s = segs[cand];
        const otro = key(s[0]) === key(fin) ? s[1] : s[0];
        if (dir) linea.push(otro); else linea.unshift(otro);
      }
    }
    if (linea.length >= 3) lineas.push(linea);
  }
  return lineas;
}

/**
 * Cinta (ribbon) apoyada en el relieve a lo largo de polilíneas: un quad por
 * tramo con inglete en las esquinas, uv.y ∈ [0,1] a lo ancho para que el
 * material la difumine en los bordes (nunca borde duro). Una sola geometría.
 * @param {Array<Array<[number,number]>>} lineas
 * @param {(x:number,z:number)=>number} hFn  altura DONDE SE APOYA (muestreador de facetas)
 */
export function geometriaCinta(lineas, hFn, { ancho = 0.035, alza = 0.012 } = {}) {
  const pos = [], uv = [], idx = [];
  let base = 0;
  for (const L of lineas) {
    const n = L.length;
    if (n < 2) continue;
    for (let i = 0; i < n; i++) {
      const p = L[i], pa = L[Math.max(0, i - 1)], pb = L[Math.min(n - 1, i + 1)];
      let tx = pb[0] - pa[0], tz = pb[1] - pa[1];
      const tl = Math.hypot(tx, tz) || 1; tx /= tl; tz /= tl;
      const nx = -tz, nz = tx;                          // normal en el plano XZ
      const w = ancho / 2;
      const l = [p[0] + nx * w, p[1] + nz * w], r = [p[0] - nx * w, p[1] - nz * w];
      pos.push(l[0], hFn(l[0], l[1]) + alza, l[1], r[0], hFn(r[0], r[1]) + alza, r[1]);
      uv.push(i / (n - 1), 0, i / (n - 1), 1);
      if (i > 0) { const a = base + (i - 1) * 2; idx.push(a, a + 2, a + 1, a + 1, a + 2, a + 3); }
    }
    base += n * 2;
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  geo.setIndex(idx);
  return geo;
}

/* Textura 1×N: borde difuso a lo ancho de la cinta (alfa en campana). */
let _cintaTex = null;
export function texturaCinta() {
  if (_cintaTex) return _cintaTex;
  if (typeof document === 'undefined') return null;
  const n = 32;
  const cv = document.createElement('canvas'); cv.width = 1; cv.height = n;
  const ctx = typeof cv.getContext === 'function' ? cv.getContext('2d') : null;
  if (!ctx || typeof ctx.createImageData !== 'function') return null;
  const img = ctx.createImageData(1, n);
  for (let i = 0; i < n; i++) {
    const t = i / (n - 1), a = sstep(0, 0.35, t) * sstep(1, 0.65, t);
    img.data[i * 4] = img.data[i * 4 + 1] = img.data[i * 4 + 2] = 255;
    img.data[i * 4 + 3] = Math.round(a * 255);
  }
  ctx.putImageData(img, 0, 0);
  _cintaTex = new THREE.CanvasTexture(cv);
  _cintaTex.colorSpace = THREE.SRGBColorSpace;
  return _cintaTex;
}

/**
 * La NUBE-MASA de la Sierra: canvas RGBA con tres tonos por cuerpo (lomo arriba
 * y del lado del sol, panza abajo), silueta por METABALL con umbral, motas en el
 * borde que la rompen sin geometría. Calco reducido de `nubeCanvas` (valle,
 * atmosphere.js). El sol de la hora dorada entra por el occidente (screen-right
 * con la cámara del establishing shot): el lomo carga hacia u → 1.
 *
 * (2026-09-05, arte) v4: la v3 sumaba 11 gaussianas grandes y saturaba en
 * `min(1, a·0,7)` — la unión era un PLATÓ elíptico sin lomo ni panza: el
 * «manchón» medido al 300 %. Un cúmulo se lee por la unión de pocos lóbulos
 * redondos ARRIBA sobre una base ancha y PLANA (la cota de condensación, que
 * es un dato): alfa = smoothstep sobre la suma de metaballs, así los lóbulos
 * asoman como lomos en vez de fundirse. Previsualizado en node (mismo cálculo,
 * semillas 3/5/7); la 5 no hace muesca ni hueco.
 * Devuelve `null` sin contexto 2D (jsdom, canvas bloqueado): la nube cae al
 * billboard liso de antes, nunca tumba la Sierra.
 */
export function texturaNubeMasa(seed = 5, { lomo = '#faf6ee', panza = '#a4aebf', honda = '#8f9aab', tam = 256 } = {}) {
  if (typeof document === 'undefined') return null;
  const cv = document.createElement('canvas'); cv.width = cv.height = tam;
  const ctx = typeof cv.getContext === 'function' ? cv.getContext('2d') : null;
  if (!ctx || typeof ctx.createImageData !== 'function') return null;
  const img = ctx.createImageData(tam, tam);
  const rand = (() => { let s = seed * 4801 + 7297; return () => { s = (s * 9301 + 49297) % 233280; return s / 233280; }; })();
  const L = hexRgb(lomo), P = hexRgb(panza), H = hexRgb(honda);
  const blobs = [];
  // 4 LOMOS redondos en la mitad alta (r 12-19 % del canvas), repartidos a lo ancho y a
  // distinta altura: la unión asoma como torres, no como plató. UN solo cuerpo: los lomos
  // van SOBRE la base y no más anchos que ella (en v4 la base sobresalía por los lados y
  // la nube leía como dos pisos apilados, medido al 300 %).
  const LOMOS = 4;
  for (let i = 0; i < LOMOS; i++) {
    const u = (i + 0.5) / LOMOS;
    blobs.push({ x: tam * (0.22 + u * 0.56 + (rand() - 0.5) * 0.10), y: tam * (0.46 - rand() * 0.24), r: tam * (0.12 + rand() * 0.07), sq: 1.0 });
  }
  // 3 lóbulos de BASE, algo aplastados (×1,8 en vertical), en la cota de la base plana
  for (const bx of [0.32, 0.52, 0.70]) blobs.push({ x: tam * (bx + (rand() - 0.5) * 0.06), y: tam * 0.58, r: tam * (0.15 + rand() * 0.04), sq: 1.8 });
  const v = new Float32Array(tam * tam);
  for (let y = 0; y < tam; y++) for (let x = 0; x < tam; x++) {
    let a = 0;
    for (const b of blobs) { const dx = x - b.x, dy = (y - b.y) * b.sq; a += Math.exp(-(dx * dx + dy * dy) / (b.r * b.r)); }
    a = sstep(0.36, 0.95, a);                                 // UMBRAL metaball: la unión conserva los lomos
    a *= 1 - sstep(0.70, 0.80, y / tam);                      // base PLANA: la nube se apoya en su cota de condensación
    // fundido al borde del canvas del 12 %: ningún lóbulo llega al borde (medido: cero borde recto)
    const bd = clamp(Math.min(x, y, tam - 1 - x, tam - 1 - y) / (tam * 0.12), 0, 1);
    v[y * tam + x] = a * bd * bd * (3 - 2 * bd);
  }
  // motas: lóbulos PEQUEÑOS del borde que rompen la silueta. Solo donde ya hay
  // cuerpo (alfa 0,15-0,45) y con poca amplitud: en la 1ª captura (amp 0,2-0,5,
  // radio 1-3 %) salían como CHISPAS blancas sueltas sobre la ladera, no como nube.
  for (let i = 0; i < 90; i++) {
    const mx = rand() * tam, my = rand() * tam;
    const a0 = v[(my | 0) * tam + (mx | 0)];
    if (a0 < 0.15 || a0 > 0.45) continue;
    const r = tam * (0.03 + rand() * 0.035), amp = 0.10 + rand() * 0.14, R = Math.ceil(r * 2.5);
    for (let y = Math.max(0, (my - R) | 0); y < Math.min(tam, (my + R) | 0); y++) for (let x = Math.max(0, (mx - R) | 0); x < Math.min(tam, (mx + R) | 0); x++) {
      const dx = x - mx, dy = y - my; v[y * tam + x] = Math.min(1, v[y * tam + x] + amp * Math.exp(-(dx * dx + dy * dy) / (r * r)));
    }
  }
  for (let y = 0; y < tam; y++) for (let x = 0; x < tam; x++) {
    const t = y / tam, u = x / tam;
    const lado = sstep(0.15, 0.95, u) * 0.35;                // el lomo carga hacia el lado del sol
    const arriba = 1 - sstep(0.22, 0.78, t + lado * (t - 0.5) * -1);
    // el lomo cubre los lóbulos de arriba y el cuerpo (t < 0,42); la panza arranca bajo
    // los lomos y la honda vive en la base plana (t > 0,64): la sombra propia es lo que
    // hace que la nube se lea como VOLUMEN en el aire y no como placa pegada a la ladera
    let c;
    if (t < 0.42) c = L;
    else if (t < 0.64) { const k = (t - 0.42) / 0.22; c = [0, 1, 2].map((i) => mix(L[i], P[i], k)); }
    else { const k = (t - 0.64) / 0.36; c = [0, 1, 2].map((i) => mix(P[i], H[i], k)); }
    const brillo = 1 + 0.06 * lado * arriba;
    const i4 = (y * tam + x) * 4;
    img.data[i4] = Math.min(255, c[0] * brillo * 255) | 0;
    img.data[i4 + 1] = Math.min(255, c[1] * brillo * 255) | 0;
    img.data[i4 + 2] = Math.min(255, c[2] * brillo * 255) | 0;
    img.data[i4 + 3] = Math.floor(Math.min(1, v[y * tam + x]) * 255);
  }
  ctx.putImageData(img, 0, 0);
  const tex = new THREE.CanvasTexture(cv);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}
