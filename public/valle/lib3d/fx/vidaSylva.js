// ── vidaSylva.js — LUCIÉRNAGAS y AVES FX con CAP DE CONTEO (Sylva s23) ───────
//
// Emula `src/fx/Life.js` de Sylva (Token-Gremlin/realistic-forest, MIT). La
// técnica, no el código: cada capa es UN solo draw instanciado de cards de dos
// triángulos y NADA se simula en CPU. Cada instancia deriva su posición de sus
// hashes (aquí precomputados en atributos, deterministas por semilla) envueltos
// en un VOLUMEN que sigue a la cámara; el suelo lo lee el vertex shader de una
// textura de altura horneada UNA vez del DEM real (`height()` de terrain.js), y
// el cap de conteo tiene dos pisos:
//   · CAPACIDAD — reservada una sola vez por tier (los atributos miden eso y
//     nunca se realocan) → jamás un overrun instanciado en Mali;
//   · VIVO — `geo.instanceCount` por frame = floor(capacidad × smoothstep(drive)),
//     donde el drive lo mandan noche/lluvia (luciérnagas) o día/tormenta (aves).
//     Con drive 0 el mesh se apaga (`visible=false`): cero costo de día para
//     las luciérnagas y de noche para las aves.
//
// Diferencias a propósito respecto a Sylva (adaptación al valle, K=0,6 u/m):
//   · El envoltorio del volumen es ANCLADO AL MUNDO (mod sobre la posición
//     mundial, no `fract(hash + deriva)` relativo a la cámara): al panear, la
//     luciérnaga se queda en su mata y solo re-entra por el otro lado cuando
//     sale del volumen. Con la cámara libre del valle (MapControls) lo relativo
//     arrastraba el enjambre pegado al lente.
//   · Sin eco-map: el "fit" de hábitat sale de la PENDIENTE del DEM (pradera
//     sí, farallón no) — dos taps más a la textura de altura.
//   · Sin depth-texture (pipeline forward): depthTest normal, depthWrite off.
//   · El pulso es el LATIDO del bestiario (`juegos/bestiario/criaturas/
//     luciernaga.js`): subida rápida, caída lenta, pausa larga a oscuras — el
//     mismo idioma que los cocuyos fijos de `noche.js`, no un LED que titila.
//   · Aves: en vez de anillos relativos a la cámara, TÉRMICAS ancladas al
//     mundo (gallinazos en columna, bandadas aleteando) con silueta de dos
//     alas por distancia a segmento (a 20 px la "V" de Sylva se leía como
//     mancha; a 3 px da igual).
//   · GLSL ES 1.00 vía ShaderMaterial (three inyecta precisión y matrices; no
//     declarar `precision` a mano — ver memoria shader-precision-uniforme-cruzada).
//
// ── NOTICE (retenido por la licencia MIT de la fuente emulada) ───────────────
// Adaptado de Sylva — https://github.com/Token-Gremlin/realistic-forest
// MIT License · Copyright (c) 2026 Token Gremlin
// Permission is hereby granted, free of charge, to any person obtaining a copy
// of this software and associated documentation files (the "Software"), to deal
// in the Software without restriction, including without limitation the rights
// to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
// copies of the Software, and to permit persons to whom the Software is
// furnished to do so, subject to the following conditions: The above copyright
// notice and this permission notice shall be included in all copies or
// substantial portions of the Software. THE SOFTWARE IS PROVIDED "AS IS",
// WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED
// TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND
// NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE
// FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT,
// TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR
// THE USE OR OTHER DEALINGS IN THE SOFTWARE.
// ─────────────────────────────────────────────────────────────────────────────
//
// PORTABLE: recibe THREE y `height(x,z)` del que llama; no conoce escenas.
// Determinista por semilla (el gate A/B compara con `?t=` congelado).

// ── PRNG determinista (mulberry32) ──────────────────────────────────────────
function prng(semilla) {
  let a = semilla >>> 0;
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const sstep = (x, a, b) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };

// ── textura de altura: el DEM horneado en RGBA8 (16 bits: hi, lo) ────────────
// NEAREST + bilineal MANUAL en el shader: portable a WebGL1 y a Mali sin pedir
// texturas float ni su filtrado lineal. `res²` llamadas a height() UNA vez.
function hornearMapaAltura(THREE, height, { cx, cz, medio, res }) {
  const t0 = performance.now();
  const N = res;
  const hs = new Float32Array(N * N);
  let hMin = Infinity, hMax = -Infinity;
  for (let j = 0; j < N; j++) {
    const z = cz + (j / (N - 1) - 0.5) * 2 * medio;
    for (let i = 0; i < N; i++) {
      const x = cx + (i / (N - 1) - 0.5) * 2 * medio;
      const h = height(x, z);
      hs[j * N + i] = h;
      if (h < hMin) hMin = h;
      if (h > hMax) hMax = h;
    }
  }
  const rango = Math.max(hMax - hMin, 1e-3);
  const data = new Uint8Array(N * N * 4);
  for (let k = 0; k < N * N; k++) {
    const v = Math.round((hs[k] - hMin) / rango * 65535);
    data[k * 4] = v >> 8; data[k * 4 + 1] = v & 255; data[k * 4 + 2] = 0; data[k * 4 + 3] = 255;
  }
  const tex = new THREE.DataTexture(data, N, N, THREE.RGBAFormat, THREE.UnsignedByteType);
  tex.magFilter = THREE.NearestFilter;
  tex.minFilter = THREE.NearestFilter;
  tex.wrapS = THREE.ClampToEdgeWrapping;
  tex.wrapT = THREE.ClampToEdgeWrapping;
  tex.generateMipmaps = false;
  tex.colorSpace = THREE.NoColorSpace;
  tex.needsUpdate = true;
  return { tex, hMin, rango, cx, cz, medio, res: N, bakeMs: performance.now() - t0 };
}

// GLSL compartido: lectura bilineal del suelo + pendiente (en unidades/unidad)
const GLSL_SUELO = /* glsl */`
  uniform sampler2D uMapa;
  uniform vec2 uMapaCentro;
  uniform float uMapaMedio;
  uniform float uMapaRes;
  uniform vec2 uMapaRango;      // (hMin, rango)
  float leerH(vec2 uv) {
    vec4 t = texture2D(uMapa, uv);
    return (t.r * 255.0 * 256.0 + t.g * 255.0) / 65535.0 * uMapaRango.y + uMapaRango.x;
  }
  float suelo(vec2 xz) {
    vec2 f = (xz - uMapaCentro + uMapaMedio) / (2.0 * uMapaMedio) * uMapaRes - 0.5;
    f = clamp(f, vec2(0.0), vec2(uMapaRes - 1.0));
    vec2 i = floor(f);
    vec2 w = f - i;
    vec2 t0 = (i + 0.5) / uMapaRes;
    vec2 t1 = min((i + 1.5) / uMapaRes, vec2(1.0 - 0.5 / uMapaRes));
    float a = leerH(vec2(t0.x, t0.y)), b = leerH(vec2(t1.x, t0.y));
    float c = leerH(vec2(t0.x, t1.y)), d = leerH(vec2(t1.x, t1.y));
    return mix(mix(a, b, w.x), mix(c, d, w.x), w.y);
  }
  float pendiente(vec2 xz, float h0) {
    float d = 2.0 * uMapaMedio / uMapaRes;   // un texel
    float hx = suelo(xz + vec2(d, 0.0));
    float hz = suelo(xz + vec2(0.0, d));
    return length(vec2(hx - h0, hz - h0)) / d;
  }
  // envoltorio toroidal ANCLADO AL MUNDO: base (mundial) llevada al cubo
  // [origen-V, origen+V) sin cambiar su congruencia módulo 2V
  float envolver(float base, float origen, float V) {
    return origen - V + mod(base - origen + V, 2.0 * V);
  }
`;

// ── LUCIÉRNAGAS ─────────────────────────────────────────────────────────────
const LUCI_VERT = /* glsl */`
  uniform float uT;
  uniform vec3 uCamPos;
  uniform vec3 uOrigen;         // centro del volumen (cámara + frente·L)
  uniform vec3 uVolumen;        // semi-extensiones del volumen (u)
  uniform float uProjEscY;      // proyección[1][1] · alto_px / 2 → px = tam·uProjEscY/dist
  uniform float uDrive;
  uniform vec2 uTam;            // tamaño de la card (u), rango
  uniform vec2 uPx;             // (mín, máx) píxeles de la card
  uniform vec2 uLejos;          // fundido por distancia (u)
  attribute vec4 aH;            // hashes: x vivo, y hábitat/altura, z tamaño+fase, w velocidad
  attribute vec3 aH3;           // posición base en [0,1)³ + fase de vuelo
  varying vec2 vUv;
  varying float vAlpha;
  varying float vPulso;
  ${GLSL_SUELO}
  float destello(float u, float t0) {
    float d = u - t0;
    if (d < 0.0) return 0.0;
    if (d < 0.026) return smoothstep(0.0, 1.0, d / 0.026);   // subida ~100 ms
    return exp(-(d - 0.026) / 0.08);                          // caída lenta
  }
  void fuera() { gl_Position = vec4(2.0, 2.0, 2.0, 1.0); vAlpha = 0.0; vUv = vec2(0.0); vPulso = 0.0; }
  void main() {
    vec4 h = aH; vec3 h3 = aH3;
    float V2x = uVolumen.x * 2.0, V2z = uVolumen.z * 2.0;
    vec3 p;
    p.x = envolver(h3.x * V2x, uOrigen.x, uVolumen.x);
    p.z = envolver(h3.z * V2z, uOrigen.z, uVolumen.z);
    // vuelo: deriva lenta y errática (mismo idioma que los cocuyos de noche.js)
    float w = mix(0.35, 0.85, h.w), f = h3.y * 6.2831853;
    p.x += sin(uT * w + f) * mix(0.15, 0.5, h.y);
    p.z += cos(uT * w * 0.8 + f * 2.0) * mix(0.15, 0.5, h.y);
    float g = suelo(p.xz);
    // hábitat: pradera y borde de monte sí; el farallón no
    float pend = pendiente(p.xz, g);
    float fit = 1.0 - smoothstep(0.30, 0.75, pend);
    if (h.y > fit * 0.95 + 0.05) { fuera(); return; }
    // vuelo bajo: 0,35–2,4 m sobre el pasto (K=0,6) + cabeceo
    float hover = mix(0.21, 1.45, h.y);
    p.y = g + hover + sin(uT * mix(0.4, 1.1, h.w) + h.z * 8.0) * 0.11;
    // latido: dos destellos y pausa larga; brasa mínima 0,05
    float periodo = mix(3.0, 5.2, h.w);
    float u = fract(uT / periodo + h.z);
    float pulso = max(0.05, max(destello(u, 0.09), destello(u, 0.34) * 0.9));
    // billboard alineado a pantalla (nunca degenera al mirar en picada)
    vec3 derecha = vec3(viewMatrix[0][0], viewMatrix[1][0], viewMatrix[2][0]);
    vec3 arriba  = vec3(viewMatrix[0][1], viewMatrix[1][1], viewMatrix[2][1]);
    vec3 vista = p - uCamPos;
    float dist = length(vista);
    float tam = mix(uTam.x, uTam.y, h.z);
    float pxU = dist / max(uProjEscY, 1.0);          // unidades por píxel a esa distancia
    float pxNat = tam / pxU;                         // píxeles que mediría sin el clamp
    tam = clamp(tam, uPx.x * pxU, uPx.y * pxU);      // nunca sub-píxel (shimmer), nunca pelota
    vec3 mundo = p + derecha * (position.x * tam) + arriba * (position.y * tam);
    float radioXZ = length(p.xz - uOrigen.xz);
    float fade = 1.0 - smoothstep(uVolumen.x * 0.76, uVolumen.x * 1.08, radioXZ);
    fade *= smoothstep(0.25, 1.0, dist);
    fade *= 1.0 - smoothstep(uLejos.x, uLejos.y, dist);
    // la que quedó CLAVADA al mínimo de píxeles es una luz lejana: se atenúa en
    // vez de quedar como un punto duro (en el Pixel, a 2 px de canvas, la
    // gaussiana colapsaba a un cuadrito verde)
    fade *= mix(0.4, 1.0, smoothstep(uPx.x * 0.8, uPx.x * 2.2, pxNat));
    vAlpha = fade * uDrive * pulso;
    vPulso = pulso;
    vUv = position.xy;
    gl_Position = projectionMatrix * viewMatrix * vec4(mundo, 1.0);
  }
`;

const LUCI_FRAG = /* glsl */`
  uniform vec3 uColNucleo;
  uniform vec3 uColHalo;
  varying vec2 vUv;
  varying float vAlpha;
  varying float vPulso;
  void main() {
    if (vAlpha < 0.01) discard;
    float d2 = dot(vUv, vUv);
    float nucleo = exp(-d2 * 22.0);
    float halo = exp(-d2 * 4.8);
    if (nucleo + halo < 0.03) discard;
    vec3 col = mix(uColHalo, uColNucleo, nucleo) * (0.35 + vPulso * 1.65);
    float a = (nucleo + halo * 0.22) * vAlpha;
    gl_FragColor = vec4(col * a, a);   // premultiplicado, mezcla One+One (aditivo)
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }
`;

// ── AVES ────────────────────────────────────────────────────────────────────
const AVE_VERT = /* glsl */`
  uniform float uT;
  uniform vec3 uCamPos;
  uniform float uVolAves;       // semi-extensión del cubo de térmicas (u)
  uniform float uProjEscY;
  uniform float uDrive;
  uniform vec2 uAltura;         // sobre el suelo del ancla (u), rango
  uniform vec2 uCerca;          // (corte, fundido-in) u
  uniform vec2 uLejos;          // (fundido-out, corte) u
  uniform float uPxMin;
  attribute vec4 aH;            // por ave: x fase, y radio, z fase2, w frecuencia
  attribute vec3 aH3;           // por ave: dispersión
  attribute vec4 aG;            // por grupo: x fase+sentido, y velocidad/altura, zw ancla mundial [0,1)
  attribute float aTipo;        // por grupo: 0 = planeador (gallinazo), 1 = aleteador (bandada)
  varying vec2 vUv;
  varying float vAlpha;
  varying float vAleteo;        // punta del ala: -1 abajo … +1 arriba
  varying float vTipo;
  varying float vPx;            // semi-ancho de la card en píxeles (para trazos ≥ 1 px)
  ${GLSL_SUELO}
  void fuera() { gl_Position = vec4(2.0, 2.0, 2.0, 1.0); vAlpha = 0.0; vUv = vec2(0.0); vAleteo = 0.0; vTipo = 0.0; vPx = 1.0; }
  void main() {
    vec4 h = aH; vec3 h3 = aH3; vec4 g = aG;
    float V2 = uVolAves * 2.0;
    // la térmica: un punto anclado al mundo, envuelto al cubo alrededor de la cámara
    vec2 ancla = vec2(envolver(g.z * V2, uCamPos.x, uVolAves), envolver(g.w * V2, uCamPos.z, uVolAves));
    float sentido = g.x > 0.5 ? 1.0 : -1.0;
    float planea = 1.0 - aTipo;
    // giro: los planeadores suben en espiral ancha y lenta; la bandada gira apretada
    float velAng = mix(mix(0.10, 0.18, g.y), mix(0.22, 0.34, g.y), aTipo);
    float ang = uT * velAng * sentido + h.x * 6.2831853;
    float rad = mix(mix(14.0, 34.0, h.y), mix(5.0, 14.0, h.y), aTipo);
    vec2 centro = ancla + vec2(cos(ang), sin(ang)) * rad;
    float gy = suelo(ancla);
    float alt = gy + mix(uAltura.x, uAltura.y, g.y) + (h3.y - 0.5) * 4.0
              + sin(uT * 0.3 + h.z * 6.0) * 1.5 - aTipo * 6.0;
    vec3 p = vec3(centro.x, alt, centro.y);
    vec3 vista = p - uCamPos;
    float dist = length(vista);
    if (dist < uCerca.x || dist > uLejos.y) { fuera(); return; }
    vec3 vistaN = vista / dist;
    vec3 lado = cross(vec3(0.0, 1.0, 0.0), vistaN);
    if (dot(lado, lado) < 0.0025) lado = vec3(1.0, 0.0, 0.0);   // mirando en picada
    lado = normalize(lado);
    vec3 frente = normalize(cross(vistaN, lado));
    // aleteo: el gallinazo planea con las alas en diedro y apenas se mece; la
    // bandada bate rápido
    float aleteoPlan = 0.35 + 0.12 * sin(uT * mix(0.8, 1.4, h.w) + h.z * 9.0);
    float aleteoBate = sin(uT * mix(5.5, 10.0, h.w) + h.z * 9.0);
    float aleteo = mix(aleteoPlan, aleteoBate, aTipo);
    float envergadura = mix(mix(0.85, 1.05, h.y), mix(0.42, 0.68, h.y), aTipo);   // u (1,4–1,75 m / 0,7–1,1 m)
    float pxU = dist / max(uProjEscY, 1.0);
    float ancho = max(envergadura * 0.5, uPxMin * pxU);
    float alto = ancho * 0.7;
    vec3 mundo = p + lado * (position.x * ancho) + frente * (position.y * alto);
    float fade = smoothstep(uCerca.x, uCerca.y, dist) * (1.0 - smoothstep(uLejos.x, uLejos.y, dist));
    vAlpha = fade * uDrive * 0.85;
    vAleteo = aleteo;
    vTipo = aTipo;
    vPx = ancho / pxU;
    vUv = position.xy;
    gl_Position = projectionMatrix * viewMatrix * vec4(mundo, 1.0);
  }
`;

const AVE_FRAG = /* glsl */`
  uniform vec3 uColAve;
  varying vec2 vUv;
  varying float vAlpha;
  varying float vAleteo;
  varying float vTipo;
  varying float vPx;
  float segDist(vec2 p, vec2 a, vec2 b) {
    vec2 pa = p - a, ba = b - a;
    float h = clamp(dot(pa, ba) / dot(ba, ba), 0.0, 1.0);
    return length(pa - ba * h);
  }
  void main() {
    if (vAlpha < 0.02) discard;
    // silueta: cuerpo al centro, dos alas simétricas con codo (la "M" de un ave
    // vista contra el cielo); la punta sube y baja con el aleteo.
    // TRAZOS EN PÍXELES: la card mínima mide ~7 px y un trazo de 0,05–0,17 del
    // semi-ancho quedaba sub-píxel → ningún fragmento caía dentro y el ave no
    // se dibujaba (medido: 0 px de aves en ?cam=portales). El grosor y el
    // borde nunca bajan de ~0,6 px / 1 px. (Sin backticks en comentarios GLSL:
    // cierran el template literal — memoria gate-esm-backticks-node-check.)
    float aa = 1.0 / max(vPx, 1.0);                       // un píxel, en unidades de la card
    vec2 q = vec2(abs(vUv.x), vUv.y);
    float yPunta = mix(-0.35, 0.55, vAleteo * 0.5 + 0.5);
    vec2 codo = vec2(0.42, yPunta * 0.35 + 0.14);
    vec2 punta = vec2(1.0, yPunta);
    float d = min(segDist(q, vec2(0.0, 0.0), codo), segDist(q, codo, punta));
    float grosor = max(mix(0.17, 0.05, q.x), 0.6 * aa);
    float ala = 1.0 - smoothstep(grosor, grosor + max(0.07, aa), d);
    float rc = max(0.13, 0.7 * aa);
    float cuerpo = 1.0 - smoothstep(rc, rc + max(0.07, aa), length(vUv * vec2(1.0, 0.55)));
    float mask = max(ala, cuerpo);
    if (mask < 0.06) discard;
    gl_FragColor = vec4(uColAve, mask * vAlpha);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }
`;

function cardGeometry(THREE) {
  const g = new THREE.InstancedBufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(new Float32Array([
    -1, -1, 0, 1, -1, 0, -1, 1, 0,
    -1, 1, 0, 1, -1, 0, 1, 1, 0,
  ]), 3));
  g.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 1e6);
  return g;
}

/**
 * @param {typeof import('three')} THREE
 * @param {object} o
 * @param {(x:number,z:number)=>number} o.height  altura del terreno (u)
 * @param {boolean} [o.coarse]     puntero táctil → tier móvil (caps más bajos)
 * @param {number}  [o.capLuci]    capacidad de luciérnagas (override del tier)
 * @param {number}  [o.capAves]    capacidad de aves (override del tier)
 * @param {number}  [o.semilla]
 * @param {{cx?:number,cz?:number,medio?:number,res?:number}} [o.mapa]  región horneada
 */
export function makeVidaSylva(THREE, o) {
  const {
    height, coarse = false, semilla = 2323,
  } = o;
  const CAP_MAX = 2048;
  // Tiers: Sylva reserva max(28, 0.004·lluvia) aves y max(220, 0.045·lluvia)
  // luciérnagas por tier. Acá: escritorio 320/64, táctil 160/32. Las aves van
  // ancladas al mundo en un cubo de ±190 u: con 40 caían ~2 dentro del cono de
  // una cámara media (medido en ?cam=portales); con 64 el cuadro medio lleva
  // aves sin subir el costo (sigue siendo UN draw).
  const capLuci = Math.max(0, Math.min(CAP_MAX, Math.round(o.capLuci ?? (coarse ? 160 : 320))));
  const capAves = Math.max(0, Math.min(CAP_MAX, Math.round(o.capAves ?? (coarse ? 32 : 64))));
  const mapa = hornearMapaAltura(THREE, height, {
    cx: o.mapa?.cx ?? 0, cz: o.mapa?.cz ?? -300, medio: o.mapa?.medio ?? 880, res: o.mapa?.res ?? 288,
  });
  const uMapa = {
    uMapa: { value: mapa.tex },
    uMapaCentro: { value: new THREE.Vector2(mapa.cx, mapa.cz) },
    uMapaMedio: { value: mapa.medio },
    uMapaRes: { value: mapa.res },
    uMapaRango: { value: new THREE.Vector2(mapa.hMin, mapa.rango) },
  };
  const grupo = new THREE.Group();
  grupo.name = 'vidaSylva';
  const rnd = prng(semilla);

  // ── luciérnagas ──
  const luci = (() => {
    const geo = cardGeometry(THREE);
    const aH = new Float32Array(Math.max(1, capLuci) * 4);
    const aH3 = new Float32Array(Math.max(1, capLuci) * 3);
    for (let i = 0; i < capLuci; i++) {
      aH[i * 4] = rnd(); aH[i * 4 + 1] = rnd(); aH[i * 4 + 2] = rnd(); aH[i * 4 + 3] = rnd();
      aH3[i * 3] = rnd(); aH3[i * 3 + 1] = rnd(); aH3[i * 3 + 2] = rnd();
    }
    geo.setAttribute('aH', new THREE.InstancedBufferAttribute(aH, 4));
    geo.setAttribute('aH3', new THREE.InstancedBufferAttribute(aH3, 3));
    geo.instanceCount = 0;
    const mat = new THREE.ShaderMaterial({
      uniforms: {
        uT: { value: 0 }, uCamPos: { value: new THREE.Vector3() },
        uOrigen: { value: new THREE.Vector3() }, uVolumen: { value: new THREE.Vector3(30, 4, 30) },
        uProjEscY: { value: 800 }, uDrive: { value: 0 },
        uTam: { value: new THREE.Vector2(0.10, 0.20) },
        // mínimo 4 px de canvas: por debajo la gaussiana no cabe y el halo se
        // vuelve un píxel duro (visto en Pixel con 2,5 px); máximo 18 px
        uPx: { value: new THREE.Vector2(4.0, 18) },
        uLejos: { value: new THREE.Vector2(150, 280) },
        // el mismo verde-amarillo frío de los cocuyos de noche.js y del bestiario
        uColNucleo: { value: new THREE.Color(1.6, 1.7, 0.62) },
        uColHalo: { value: new THREE.Color(0.22, 0.68, 0.08) },
        ...uMapa,
      },
      vertexShader: LUCI_VERT, fragmentShader: LUCI_FRAG,
      transparent: true, depthTest: true, depthWrite: false, fog: false,
      blending: THREE.CustomBlending, blendEquation: THREE.AddEquation,
      blendSrc: THREE.OneFactor, blendDst: THREE.OneFactor,
    });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.name = 'vidaSylva-luciernagas';
    mesh.frustumCulled = false;
    mesh.matrixAutoUpdate = false;
    mesh.renderOrder = 5;
    mesh.visible = false;
    grupo.add(mesh);
    return { geo, mat, mesh, cap: capLuci };
  })();

  // ── aves ──
  const aves = (() => {
    const geo = cardGeometry(THREE);
    const n = Math.max(1, capAves);
    const aH = new Float32Array(n * 4), aH3 = new Float32Array(n * 3);
    const aG = new Float32Array(n * 4), aTipo = new Float32Array(n);
    // grupos: ~6 aves por térmica; 1 de cada 3 grupos es bandada aleteadora
    const NG = Math.max(1, Math.ceil(capAves / 6));
    const grupos = [];
    for (let k = 0; k < NG; k++) grupos.push({ g: [rnd(), rnd(), rnd(), rnd()], tipo: (k % 3 === 2) ? 1 : 0 });
    for (let i = 0; i < capAves; i++) {
      const G = grupos[i % NG];
      aH[i * 4] = rnd(); aH[i * 4 + 1] = rnd(); aH[i * 4 + 2] = rnd(); aH[i * 4 + 3] = rnd();
      aH3[i * 3] = rnd(); aH3[i * 3 + 1] = rnd(); aH3[i * 3 + 2] = rnd();
      aG[i * 4] = G.g[0]; aG[i * 4 + 1] = G.g[1]; aG[i * 4 + 2] = G.g[2]; aG[i * 4 + 3] = G.g[3];
      aTipo[i] = G.tipo;
    }
    geo.setAttribute('aH', new THREE.InstancedBufferAttribute(aH, 4));
    geo.setAttribute('aH3', new THREE.InstancedBufferAttribute(aH3, 3));
    geo.setAttribute('aG', new THREE.InstancedBufferAttribute(aG, 4));
    geo.setAttribute('aTipo', new THREE.InstancedBufferAttribute(aTipo, 1));
    geo.instanceCount = 0;
    const mat = new THREE.ShaderMaterial({
      uniforms: {
        uT: { value: 0 }, uCamPos: { value: new THREE.Vector3() },
        uVolAves: { value: 190 }, uProjEscY: { value: 800 }, uDrive: { value: 0 },
        // Sylva vuela sus aves a 20–46 m porque su cámara va a ras del sotobosque
        // y las ve contra el cielo. Las cámaras del valle miran DESDE ARRIBA
        // (portales +38 u, valle +70 u): a esa altura las aves quedaban contra
        // el bosque oscuro y desaparecían (medido: el juez no encontró ninguna
        // en `?cam=portales`). Gallinazos y bandadas van entre 47 y 107 m,
        // por encima del ojo de las cámaras fijas → se recortan contra el cielo.
        uAltura: { value: new THREE.Vector2(36, 90) },
        uCerca: { value: new THREE.Vector2(21, 45) },
        uLejos: { value: new THREE.Vector2(300, 460) },
        // 4,2 px de semi-ancho mínimo (card ≈ 8 px): con 3,4 las aves lejanas
        // quedaban en 2–4 px de silueta y desde `?cam=valle` casi no se leían.
        uPxMin: { value: 4.2 },
        // silueta a contraluz: casi negro azulado. Con 0,05 lineal (≈0,25 sRGB)
        // el gradeo del valle (gamma 0,62, levanta sombras) las dejaba GRIS
        // CLARO sobre la pradera oscura: se leían como puntos blancos.
        uColAve: { value: new THREE.Color(0.005, 0.0055, 0.008) },
        ...uMapa,
      },
      vertexShader: AVE_VERT, fragmentShader: AVE_FRAG,
      transparent: true, depthTest: true, depthWrite: false, fog: false,
      // DoubleSide OBLIGATORIO: el billboard con arriba-del-mundo (lado = up ×
      // vista, frente = vista × lado) deja la normal de la card APUNTANDO A LA
      // ESCENA (lado × frente = vista), o sea de espaldas a la cámara → con
      // FrontSide el driver la descartaba entera y no se dibujaba UN solo
      // píxel (bisección 2026-09-02: cull, suelo y envolver descartados; el
      // mismo quad con ejes de pantalla sí salía). Las luciérnagas no lo
      // sufren porque usan las filas de viewMatrix (derecha × arriba = +z de
      // cámara). Dos triángulos por ave: el doble lado no cuesta nada.
      side: THREE.DoubleSide,
    });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.name = 'vidaSylva-aves';
    mesh.frustumCulled = false;
    mesh.matrixAutoUpdate = false;
    mesh.renderOrder = 3;
    mesh.visible = false;
    grupo.add(mesh);
    return { geo, mat, mesh, cap: capAves };
  })();

  const stats = {
    capLuci, capAves, luciernagas: 0, aves: 0, driveLuci: 0, driveAves: 0,
    bakeMs: mapa.bakeMs, mapaRes: mapa.res, hCam: 0, volumen: 0,
  };
  const _fwd = new THREE.Vector3();

  /**
   * @param {number} t   segundos (congelable con ?t=)
   * @param {THREE.Camera} camera
   * @param {{noche?:number,lluvia?:number,tormenta?:number}} [amb]  0..1 cada uno
   */
  function update(t, camera, amb = {}) {
    const noche = amb.noche ?? 0, lluvia = amb.lluvia ?? 0, tormenta = amb.tormenta ?? 0;
    const cp = camera.position;
    camera.getWorldDirection(_fwd);
    const alto = camera.projectionMatrix.elements[5] * (o.altoPx?.() ?? innerHeight) * 0.5;
    const hCam = Math.max(0, cp.y - height(cp.x, cp.z));
    stats.hCam = hCam;

    // ── luciérnagas: noche sin lluvia ──
    const driveLuci = sstep(noche, 0.16, 0.52) * (1 - sstep(lluvia, 0.28, 0.72));
    const vivasLuci = driveLuci > 0.05 ? Math.max(1, Math.floor(luci.cap * sstep(driveLuci, 0.05, 0.9))) : 0;
    luci.geo.instanceCount = Math.min(vivasLuci, luci.cap);
    luci.mesh.visible = luci.geo.instanceCount > 0;
    if (luci.mesh.visible) {
      const u = luci.mat.uniforms;
      u.uT.value = t; u.uCamPos.value.copy(cp); u.uProjEscY.value = alto; u.uDrive.value = driveLuci;
      // el volumen crece con la altura de la cámara: de cerca, un claro; de
      // arriba, la pradera entera (y el fundido lejano la apaga a ~450 m)
      const L = Math.min(70, Math.max(8, hCam));
      const V = Math.min(110, Math.max(20, 20 + hCam * 0.9));
      u.uOrigen.value.set(cp.x + _fwd.x * L, 0, cp.z + _fwd.z * L);
      u.uVolumen.value.set(V, 4, V);
      stats.volumen = V;
    }

    // ── aves: día sin tormenta ni aguacero ──
    const driveAves = (1 - sstep(noche, 0.42, 0.78)) * (1 - sstep(tormenta, 0.55, 0.92)) * (1 - sstep(lluvia, 0.45, 0.85));
    const vivasAves = driveAves > 0.08 ? Math.max(1, Math.floor(aves.cap * sstep(driveAves, 0.08, 0.9))) : 0;
    aves.geo.instanceCount = Math.min(vivasAves, aves.cap);
    aves.mesh.visible = aves.geo.instanceCount > 0;
    if (aves.mesh.visible) {
      const u = aves.mat.uniforms;
      u.uT.value = t; u.uCamPos.value.copy(cp); u.uProjEscY.value = alto; u.uDrive.value = driveAves;
    }
    stats.luciernagas = luci.geo.instanceCount;
    stats.aves = aves.geo.instanceCount;
    stats.driveLuci = driveLuci;
    stats.driveAves = driveAves;
  }

  function dispose() {
    luci.geo.dispose(); luci.mat.dispose();
    aves.geo.dispose(); aves.mat.dispose();
    mapa.tex.dispose();
  }

  return { grupo, update, stats, dispose, mapa, luci, aves };
}
