// ── cieloSylva.js — cielo analítico por scattering (Sylva s20) ────────────────
//
// Port de `src/shaders/lib.js::GLSL_ATMOS::atmScatter` y del pase de cielo en
// pantalla `src/fx/Sky.js::skyBlit` (disco solar con limbo + aureola) de Sylva
// (github.com/Token-Gremlin/realistic-forest — MIT License, Copyright (c) 2026
// Token Gremlin; el notice completo va al pie). En Sylva el cielo NO es una rampa
// ni el modelo Preetham: por cada píxel de cielo se integra a lo largo del rayo de
// vista el single scattering Rayleigh + Mie + ozono a escala planetaria (radio
// 6 360 km, HR 8 km, HM 1,2 km), con la profundidad óptica hacia el sol por muestra;
// el amanecer, la hora dorada y la hora azul salen de la física.
//
// Port al valle (forward r160, destino Mali-G78):
//   · El valle YA tiene un cielo Preetham (el `Sky` de three, `atmosphere.js`).
//     Este módulo NO crea otro mesh: MUTA EN SITIO el material de ese Sky (mismo
//     objeto `ShaderMaterial`, mismo objeto `uniforms`) reemplazando vertex y
//     fragment y guardando los originales. Así `noche.js`, `clima.js`,
//     `clima-vivo.js` (que capturaron `sky.material.uniforms` al montar) y el cubo
//     del horizonte s45 (que comparte geometría y material) siguen mandando sin
//     cambios, y `set(false)` devuelve el Preetham en la MISMA carga (A/B pareado).
//   · Mandos vivos → física: `sol = normalize(sunPosition)`; la cantidad efectiva
//     de Mie del Preetham de three es `turbidity·mieCoefficient` (vBetaM ∝ T·mie),
//     así que `mieMult = T·mie / 0,15` (día = 1) y `rayMult = rayleigh / 2,6`
//     (día = 1): lluvia/niebla/noche/clima-vivo siguen actuando igual que antes.
//   · Altura: Rayleigh y ozono se evalúan con `h + msnm` (aire fino REAL de los
//     2 500 msnm del sitio → cenit más profundo); la bruma Mie con la altura sobre
//     el piso LOCAL del cañón (la bruma vive junto al bosque, no a nivel del mar).
//   · Muestreo cuadrático a lo largo del rayo (t = tMax·u²): con 12 pasos deja las
//     muestras densas cerca de la cámara, donde la atmósfera exponencial pesa.
//     (Sylva usa 20 pasos uniformes; a igual costo el cuadrático pierde menos.)
//   · `renderOrder` alto mientras está activo: el Sky de three se dibuja PRIMERO
//     (su centro está en la cámara) y sombrea toda la pantalla que el terreno tapa
//     después; dibujado al final de los opacos el test de profundidad deja solo el
//     cielo visible — misma imagen, menos fragmentos (importa en Mali).
//   · Salida lineal HDR + tonemapping_fragment + colorspace_fragment como el Sky
//     original: a un RT three no tonemapea (el OutputPass hace AgX); sin composer
//     tonemapea en el material. `gl_Position.z = w` → plano lejano.
//   · Sin `precision` manual (memoria shader-precision-uniforme-cruzada).
//
// Opt-in por página (`?cielo=1`); sin llamar `crearCieloSylva` nada cambia.
// Contrato del hook `window.__cielo` en
// Chagra-strategy/ops/specs/2026-09-02-sylva-s20-cielo-analitico/spec.md.

import * as THREE from 'three';

// null/undefined/'' = ausente → default (Number(null) es 0, NO un valor pedido)
const num = (v, def) => {
  if (v === null || v === undefined || v === '') return def;
  const n = Number(v);
  return Number.isFinite(n) ? n : def;
};

/**
 * Lee los parámetros de la URL. `?cielo=1` enciende (opt-in). Devuelve null si no
 * está pedido (= baseline intacto).
 */
export function leerParamsCielo(search = globalThis.location?.search ?? '') {
  const q = new URLSearchParams(search);
  const on = q.get('cielo');
  if (on === null || on === '0' || on === 'off' || on === 'false') return null;
  return {
    expo: num(q.get('cieloExpo'), 60),         // exposición de la radiancia (Sylva: 3,15 + auto-exposición; acá AgX fijo 1,55). Barrido 2026-09-02 guatoc desnudo:
                                               //  Preetham L̄ 215 / span 4; Sylva expo 20 → L̄ 186 span 21 · 40 → 203/15 · 80 → 213/10 · 150 → 220/7 · 300 → 224/4
    pasos: num(q.get('cieloPasos'), 12),       // muestras del rayo (Sylva 20 uniformes; acá cuadráticas)
    msnm: num(q.get('cieloMsnm'), 2500),       // altitud del sitio (main.js:387: suelo y=−8 → 2 503 msnm) → Rayleigh/ozono
    escala: num(q.get('cieloEscala'), 1.6),    // metros por unidad de escena (s45: 1 000 u ≈ 1,7 km)
    y0: num(q.get('cieloY0'), -75),            // piso del cañón (como s18/s45): la altura local de la bruma Mie se mide desde aquí
    g: num(q.get('cieloG'), 0.76),             // HG del Mie (Sylva 0,76; el 0,955 del Preetham es demasiado puntiagudo)
    sol: num(q.get('cieloSol'), 20),           // brillo del disco solar (Sylva 800 con su exposición; acá bloom opt-in) — por barrido
    halo: num(q.get('cieloHalo'), 1.7),        // aureola pow(μ, 900) (Sylva 1,7)
    mie: num(q.get('cieloMie'), 1),            // multiplicador global de Mie (sobre el T·mie vivo)
    rayleigh: num(q.get('cieloRayleigh'), 1),  // multiplicador global de Rayleigh (sobre el rayleigh vivo)
    ozono: num(q.get('cieloOzono'), 1),        // multiplicador del ozono (la hora azul)
  };
}

const VERT = /* glsl */`
  varying vec3 vWorldPosition;
  void main() {
    vec4 worldPosition = modelMatrix * vec4(position, 1.0);
    vWorldPosition = worldPosition.xyz;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    gl_Position.z = gl_Position.w;   // plano lejano, como el Sky de three
  }
`;

// Mismos nombres de uniform que el Sky de three para los mandos vivos (sunPosition,
// turbidity, rayleigh, mieCoefficient): el objeto `uniforms` es el MISMO.
const FRAG = /* glsl */`
  varying vec3 vWorldPosition;
  uniform vec3 sunPosition;
  uniform vec4 uCieloA;     // x expo, y altura local (m), z msnm, w g (HG del Mie)
  uniform vec4 uCieloB;     // x mieMult, y rayMult, z ozono, w debug (0 normal, 1 negro, 2 gris)
  uniform vec4 uCieloSol;   // xyz transmitancia al sol (color del disco), w brillo del disco
  uniform float uCieloHalo;
  uniform int uCieloPasos;

  const float PI = 3.14159265359;
  const float ATM_Rg = 6360000.0;     // radio del suelo (m)
  const float ATM_Rt = 6420000.0;     // tope de la atmósfera
  const vec3  ATM_BETA_R = vec3(5.802e-6, 13.558e-6, 33.1e-6);
  const vec3  ATM_BETA_M = vec3(3.996e-6);
  const vec3  ATM_BETA_O = vec3(0.650e-6, 1.881e-6, 0.085e-6);
  const float ATM_HR = 8000.0;
  const float ATM_HM = 1200.0;

  vec2 raySphere(vec3 o, vec3 d, float r) {
    float b = dot(o, d);
    float c = dot(o, o) - r * r;
    float h = b * b - c;
    if (h < 0.0) return vec2(-1.0);
    h = sqrt(h);
    return vec2(-b - h, -b + h);
  }
  float ozoneDensity(float h) { return max(0.0, 1.0 - abs(h - 25000.0) / 15000.0); }
  float phaseHG(float c, float g) {
    float g2 = g * g;
    return (1.0 - g2) / (4.0 * PI * pow(max(1.0 + g2 - 2.0 * g * c, 1e-4), 1.5));
  }
  // densidades por componente: Rayleigh/ozono con la altitud real (h + msnm), Mie con la altura local
  vec3 densR(float h) { return ATM_BETA_R * uCieloB.y * exp(-(h + uCieloA.z) / ATM_HR); }
  vec3 densM(float h) { return ATM_BETA_M * uCieloB.x * exp(-h / ATM_HM); }
  vec3 densO(float h) { return ATM_BETA_O * uCieloB.z * ozoneDensity(h + uCieloA.z); }
  // profundidad óptica hacia el sol (6 muestras uniformes, como Sylva)
  vec3 atmOpticalDepth(vec3 p, vec3 dir, float dist) {
    float ds = dist / 6.0;
    vec3 od = vec3(0.0);
    for (int i = 0; i < 6; i++) {
      vec3 s = p + dir * (float(i) + 0.5) * ds;
      float h = max(length(s) - ATM_Rg, 0.0);
      od += (densR(h) + densM(h) * 1.11 + densO(h)) * ds;
    }
    return od;
  }
  // radiancia dispersada a lo largo del rayo de vista + transmitancia hasta el tope
  void atmScatter(vec3 rd, vec3 sunDir, out vec3 radiance, out vec3 transmittance) {
    vec3 o = vec3(0.0, ATM_Rg + max(uCieloA.y, 1.0), 0.0);
    vec2 tTop = raySphere(o, rd, ATM_Rt);
    float tMax = tTop.y;
    vec2 tGround = raySphere(o, rd, ATM_Rg);
    if (tGround.x > 0.0) tMax = min(tMax, tGround.x);
    tMax = max(tMax, 0.0);
    float mu = dot(rd, sunDir);
    float pr = 3.0 / (16.0 * PI) * (1.0 + mu * mu);
    float pm = phaseHG(mu, uCieloA.w);
    vec3 sumR = vec3(0.0), sumM = vec3(0.0), od = vec3(0.0);
    float n = float(uCieloPasos);
    for (int i = 0; i < 32; i++) {
      if (i >= uCieloPasos) break;
      // muestreo cuadrático: t = tMax·u², ds = tMax·2u·du (denso cerca de la cámara)
      float u = (float(i) + 0.5) / n;
      float t = tMax * u * u;
      float ds = tMax * 2.0 * u / n;
      vec3 s = o + rd * t;
      float h = max(length(s) - ATM_Rg, 0.0);
      vec3 dR = densR(h);
      vec3 dM = densM(h);
      vec3 odSeg = (dR + dM * 1.11 + densO(h)) * ds;
      vec3 upS = normalize(s);
      float cz = dot(upS, sunDir);
      vec2 tS = raySphere(s, sunDir, ATM_Rt);
      vec3 odSun = cz > -0.15 ? atmOpticalDepth(s, sunDir, max(tS.y, 0.0)) : vec3(30.0);   // sombra de la Tierra
      vec3 trans = exp(-(od + odSeg * 0.5) - odSun);
      sumR += trans * dR * ds;
      sumM += trans * dM * ds;
      od += odSeg;
    }
    radiance = sumR * pr + sumM * pm;
    transmittance = exp(-od);
  }

  void main() {
    vec3 rd = normalize(vWorldPosition - cameraPosition);
    vec3 sunDir = normalize(sunPosition);
    vec3 rad, tr;
    atmScatter(rd, sunDir, rad, tr);
    vec3 col = rad * uCieloA.x;
    // disco solar con oscurecimiento de limbo (Sylva) — el color es la transmitancia al sol
    float cs = dot(rd, sunDir);
    float sunAng = 0.00465;
    if (cs > cos(sunAng * 3.0)) {
      float th = acos(clamp(cs, -1.0, 1.0)) / sunAng;
      float disc = 1.0 - smoothstep(0.985, 1.02, th);
      float m = sqrt(max(0.0, 1.0 - min(th, 1.0) * min(th, 1.0)));
      float limb = 0.34 + 0.66 * pow(m, 0.72);
      col += uCieloSol.xyz * disc * limb * uCieloSol.w;
    }
    // aureola (el Mie hacia adelante ya está en atmScatter; esto es el resplandor extra de Sylva)
    col += uCieloSol.xyz * pow(max(cs, 0.0), 900.0) * uCieloHalo;
    if (uCieloB.w > 1.5) col = vec3(0.18);          // depurar(2): gris plano (control de cadena)
    else if (uCieloB.w > 0.5) col = vec3(0.0);      // depurar(1): cielo negro (máscara CIELO PURO)
    gl_FragColor = vec4(max(col, 0.0), 1.0);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }
`;

/**
 * Transmitancia analítica hasta el sol desde el suelo (port JS de `Sky.sunTransmittance`
 * de Sylva) con la misma altitud dividida: Rayleigh/ozono con `h + msnm`, Mie local.
 * Es el color del disco solar (blanco a mediodía, dorado/rojo rasante).
 */
export function transmitanciaSol(sunDir, { hLocal = 2, msnm = 0, mieMult = 1, rayMult = 1, ozono = 1 } = {}) {
  const Rg = 6360000, Rt = 6420000;
  const betaR = [5.802e-6, 13.558e-6, 33.1e-6];
  const betaM = 3.996e-6 * 1.11;
  const betaO = [0.650e-6, 1.881e-6, 0.085e-6];
  const o = [0, Rg + Math.max(hLocal, 1), 0];
  const d = [sunDir.x, sunDir.y, sunDir.z];
  const b = o[1] * d[1];
  const c = o[1] * o[1] - Rt * Rt;
  const disc = b * b - c;
  if (disc < 0) return [0, 0, 0];
  const tMax = -b + Math.sqrt(disc);
  const N = 20;
  const ds = tMax / N;
  let odR = 0, odM = 0, odO = 0;
  for (let i = 0; i < N; i++) {
    const t = (i + 0.5) * ds;
    const px = d[0] * t, py = o[1] + d[1] * t, pz = d[2] * t;
    const h = Math.max(0, Math.sqrt(px * px + py * py + pz * pz) - Rg);
    odR += Math.exp(-(h + msnm) / 8000) * ds;
    odM += Math.exp(-h / 1200) * ds;
    odO += Math.max(0, 1 - Math.abs(h + msnm - 25000) / 15000) * ds;
  }
  // sol bajo el horizonte local: la sombra de la Tierra (misma cota que el shader, cz ≤ −0,15)
  if (d[1] <= -0.15) return [0, 0, 0];
  return [0, 1, 2].map((k) => Math.exp(-(betaR[k] * rayMult * odR + betaM * mieMult * odM + betaO[k] * ozono * odO)));
}

/**
 * Monta el cielo Sylva SOBRE el Sky de three del valle (`atmos.noche.sky`) mutando su
 * material en sitio, y devuelve el hook `window.__cielo`. `preparar(camera)` va en el
 * tick antes del render (y antes de `horizonte.preparar`, que re-renderiza el cubo con
 * este mismo material): sube la altura local, el sol y su transmitancia.
 */
export function crearCieloSylva({ renderer = null, sky, params, capas = null }) {
  const mat = sky.material;
  const u = mat.uniforms;
  const original = { vertexShader: mat.vertexShader, fragmentShader: mat.fragmentShader, renderOrder: sky.renderOrder };
  const estado = {
    activo: false, expo: params.expo, pasos: params.pasos, msnm: params.msnm, escala: params.escala, y0: params.y0,
    g: params.g, sol: params.sol, halo: params.halo, mie: params.mie, rayleigh: params.rayleigh, ozono: params.ozono,
    frame: 0, hLocal: 0,
  };
  let debug = 0, activoAntesDebug = false;
  // `desnudar(true)`: esconde lo que va ENCIMA del Sky (sprites del sol, telón, cartas, aves, nubes vivas) para medir
  // el cielo desnudo; se restaura la visibilidad guardada con `desnudar(false)`.
  let desnudo = false, ocultas = [];
  const solDir = new THREE.Vector3(0, 1, 0);
  let solTr = [1, 1, 1], mieMult = 1, rayMult = 1;
  const _pos = new THREE.Vector3();

  // uniforms propios dentro del MISMO objeto (los del Preetham siguen ahí y vivos)
  u.uCieloA = u.uCieloA || { value: new THREE.Vector4(150, 2, 2500, 0.76) };
  u.uCieloB = u.uCieloB || { value: new THREE.Vector4(1, 1, 1, 0) };
  u.uCieloSol = u.uCieloSol || { value: new THREE.Vector4(1, 1, 1, 20) };
  u.uCieloHalo = u.uCieloHalo || { value: 1.7 };
  u.uCieloPasos = u.uCieloPasos || { value: 12 };

  function subirUniforms() {
    u.uCieloA.value.set(estado.expo, Math.max(estado.hLocal, 1), estado.msnm, estado.g);
    u.uCieloB.value.set(mieMult * estado.mie, rayMult * estado.rayleigh, estado.ozono, debug);
    u.uCieloSol.value.set(solTr[0], solTr[1], solTr[2], estado.sol);
    u.uCieloHalo.value = estado.halo;
    u.uCieloPasos.value = Math.max(1, Math.min(32, estado.pasos | 0));
  }
  function aplicarShader(sylva) {
    const vs = sylva ? VERT : original.vertexShader;
    const fs = sylva ? FRAG : original.fragmentShader;
    if (mat.vertexShader !== vs || mat.fragmentShader !== fs) {
      mat.vertexShader = vs;
      mat.fragmentShader = fs;
      mat.needsUpdate = true;
    }
    sky.renderOrder = sylva ? 100000 : original.renderOrder;   // último de los opacos: solo se sombrea el cielo visible
  }
  function leer() {
    return {
      activo: estado.activo, expo: estado.expo, pasos: estado.pasos, msnm: estado.msnm, escala: estado.escala, y0: estado.y0,
      g: estado.g, sol: estado.sol, halo: estado.halo, mie: estado.mie, rayleigh: estado.rayleigh, ozono: estado.ozono,
      solDir: solDir.toArray().map((v) => +v.toFixed(4)), solTr: solTr.map((v) => +v.toFixed(4)),
      mieMult: +mieMult.toFixed(4), rayMult: +rayMult.toFixed(4),
      turbidez: u.turbidity?.value ?? null, rayleighU: u.rayleigh?.value ?? null, mieC: u.mieCoefficient?.value ?? null,
      hLocal: +estado.hLocal.toFixed(2), renderOrder: sky.renderOrder, debug, desnudo, capasOcultas: ocultas.length, frame: estado.frame, compartido: true,
      shader: mat.fragmentShader === FRAG ? 'sylva' : 'preetham',
    };
  }
  function set(on) {
    estado.activo = !!on;
    if (!debug) aplicarShader(estado.activo);
    return leer();
  }
  function ajustar(p = {}) {
    for (const k of ['expo', 'pasos', 'msnm', 'escala', 'y0', 'g', 'sol', 'halo', 'mie', 'rayleigh', 'ozono']) if (Number.isFinite(p[k])) estado[k] = p[k];
    subirUniforms();
    return leer();
  }
  function depurar(modo = 0) {
    modo = modo | 0;
    if (modo > 0 && debug === 0) activoAntesDebug = estado.activo;
    debug = modo;
    if (modo > 0) aplicarShader(true);          // el negro/gris se pinta con el shader Sylva
    else { estado.activo = activoAntesDebug; aplicarShader(estado.activo); }
    subirUniforms();
    return leer();
  }
  function desnudar(on) {
    on = !!on;
    if (on && !desnudo) {
      const lista = (typeof capas === 'function' ? capas() : capas) || [];
      ocultas = lista.filter((o) => o && typeof o.visible === 'boolean').map((o) => ({ o, visible: o.visible }));
      for (const { o } of ocultas) o.visible = false;
    } else if (!on && desnudo) {
      for (const { o, visible } of ocultas) o.visible = visible;
      ocultas = [];
    }
    desnudo = on;
    return leer();
  }
  function preparar(cam) {
    if (cam) { cam.getWorldPosition(_pos); estado.hLocal = (_pos.y - estado.y0) * estado.escala; }
    if (u.sunPosition) solDir.copy(u.sunPosition.value).normalize();
    // cantidad efectiva de Mie del Preetham de three: T·mie (día 7,5·0,02 = 0,15 → 1); rayleigh 2,6 → 1
    const T = u.turbidity?.value ?? 7.5, mc = u.mieCoefficient?.value ?? 0.02, ry = u.rayleigh?.value ?? 2.6;
    mieMult = Math.max(0, (T * mc) / 0.15);
    rayMult = Math.max(0, ry / 2.6);
    solTr = transmitanciaSol(solDir, { hLocal: estado.hLocal, msnm: estado.msnm, mieMult: mieMult * estado.mie, rayMult: rayMult * estado.rayleigh, ozono: estado.ozono });
    subirUniforms();
    estado.frame++;
  }

  preparar(null);
  set(true);

  const hook = {
    sky, material: mat, get params() { return { ...estado }; },
    set, ajustar, depurar, desnudar, preparar, estado: leer, transmitanciaSol,
    frame: () => { if (typeof window.__tick === 'function') window.__tick(); return leer(); },
    pausar: (on) => { if (typeof window.__loop === 'function') window.__loop(!on); return !on; },
  };
  return hook;
}

// ── Atribución ───────────────────────────────────────────────────────────────
// Port de Sylva — https://github.com/Token-Gremlin/realistic-forest
// MIT License · Copyright (c) 2026 Token Gremlin
// Permission is hereby granted, free of charge, to any person obtaining a copy of this software and
// associated documentation files (the "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
// copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the
// following conditions: The above copyright notice and this permission notice shall be included in all
// copies or substantial portions of the Software. THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY
// KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A
// PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR
// ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
// OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
