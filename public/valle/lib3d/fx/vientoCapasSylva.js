// ── lib3d/fx/vientoCapasSylva.js ─────────────────────────────────────────────
// VIENTO VERTEX POR CAPAS Y ALTURA (Sylva s14). Opt-in `?vientoCapas=1`.
//
// Qué hace el viento de Sylva (Token-Gremlin/realistic-forest, MIT;
// `src/shaders/lib.js` 431–481, `src/veg/treeMaterials.js` 54–80 y 484–495):
//   · FRENTES DE RÁFAGA `windGustAt(xz, t)`: tres bandas de ruido advectadas a lo
//     largo del viento (frecuencias 0,011 / 0,034 / 0,085 · velocidades 0,30 /
//     0,62 / 1,10 × velocidad de ráfaga) bajo una envolvente lenta → regiones
//     enteras del bosque en calma mientras otras son rastrilladas; se VE la ola
//     recorrer el dosel en vez de un seno global;
//   · SWAY ESTRUCTURAL `windSwayAt`: tres senos (lento / medio / rápido) con fase
//     por individuo, amplitud `s · escala · (1 − stiff·0,75) · h`, componente
//     perpendicular con la turbulencia y ACORTAMIENTO vertical al doblarse;
//   · CAPAS por `flex` (0 en el tronco → ≈1 en las puntas): `stiff = 1 − flex·0,92`,
//     `escala = amp · (0,35 + 0,85·flex)`, RETARDO de rama `∝ flex² · H` (las ramas
//     van detrás del tronco) y cabeceo vertical `∝ flex · H`;
//   · ALETEO de cada card sobre su propio centro `(uv − 0,5)`: el borde libre sube
//     más que el pegado, fase por card, 5,2 + 3,4·φ Hz·rad.
//   Tronco, ramas y hojas comparten la misma base, la misma fase y la misma
//   ecuación → el árbol se mueve como UNA estructura conectada.
//
// Qué se adapta al valle (InstancedMesh de tronco + copa de MASA con la MISMA
// matriz por individuo; materiales `MeshStandardMaterial` r160 ya parcheados por
// `aplicarVientoMundo`):
//   · todo en espacio MUNDO desde el origen de la instancia: `hW` = altura sobre
//     la base; `hEff = hW² / (hW + suav)` — cuadrático en la raíz (el tronco NO se
//     dobla desde el suelo: nada de gelatina, regla de F17) y lineal arriba;
//   · `flex` = 0 en el lote de troncos; en la copa = altura normalizada dentro del
//     bake × `mix(0,6, 1, aoHorneada)` (la oclusión horneada de s39 marca lo
//     exterior = puntas de ramita); en la base de la copa flex = 0 → la cima del
//     tronco y la base de la copa reciben EL MISMO desplazamiento (continuidad
//     por construcción);
//   · frentes de ráfaga con value-noise 2D SIN seno (hash de Dave Hoskins, MIT)
//     en vez del simplex de Sylva; `oct` 1..3 octavas para medir el costo en Mali;
//   · reloj, dirección, turbulencia y fuerza globales son los de `vientoMundos`
//     (`uTiempoVM`, `uDirVM`, `uTurbVM`, `uFuerzaVM`): el pasto y el resto del
//     valle siguen la MISMA ráfaga;
//   · frecuencias × `frec` (default 0,8): Sylva corre a 60 fps; el Pixel va a
//     ~13 fps y un aleteo a 8,6 Hz aliasa.
//
// A/B en la MISMA carga y el MISMO programa: `set(k)` pone `uVCk = k` y baja la
// amplitud del viento viejo (`uAmpVM`, capturada por material al encadenar) a
// `amp₀·(1 − k)`. `set(0)` = baseline EXACTO. Inyección antes de
// `#include <project_vertex>`: después de todo lo anclado a `begin_vertex`
// (masaTipo, viento viejo), antes de `worldpos_vertex` (follaje mojado lee la
// posición final).
//
// Hook de gate: `window.__vientoCapas = { activa, set(k), estado(), ajustar({…}),
// ocultar(v, { solo }), sonda({ cerca, camera }) }`.

import { uniformesVientoMundo } from '../flora/vientoMundos.js';

export const DEFAULTS_VCAPAS = Object.freeze({
  k: 1,          // drive (0 = viento viejo exacto, 1 = capas plenas)
  amp: 0.04,     // m de desplazamiento por m de altura efectiva en las puntas (Sylva uWindAmp·s típico ≈ 0,0075·5)
  ramas: 0.03,   // retardo de rama (Sylva 0,006·s, s≈5)
  punta: 0.012,  // aleteo de cards, fracción del alto del bake por unidad de fuerza
  rafaga: 1.0,   // contraste de los frentes (0 = campo uniforme)
  oct: 3,        // octavas del campo de ráfaga (1 = barato)
  suav: 4.0,     // m de raíz cuadrática (tronco rígido abajo)
  frec: 0.8,     // multiplicador de frecuencias (Sylva = 1 a 60 fps)
  tormenta: 0,   // Sylva uWeather.y: látigo extra en puntas, inclinación extra en el fuste
  vel: 0.7,      // velocidad de los frentes (Sylva uWindPhase.y = 0,55 + viento·0,075)
});

// `?vientoCapas=1` (+ vcK, vcAmp, vcRamas, vcPunta, vcRafaga, vcOct, vcSuav, vcFrec, vcTormenta, vcVel)
export function leerParamsVientoCapas(search) {
  const q = new URLSearchParams(search || '');
  if (q.get('vientoCapas') !== '1') return null;
  const num = (k, d) => { const v = Number(q.get(k)); return q.get(k) !== null && Number.isFinite(v) ? v : d; };
  return {
    k: num('vcK', DEFAULTS_VCAPAS.k),
    amp: num('vcAmp', DEFAULTS_VCAPAS.amp),
    ramas: num('vcRamas', DEFAULTS_VCAPAS.ramas),
    punta: num('vcPunta', DEFAULTS_VCAPAS.punta),
    rafaga: num('vcRafaga', DEFAULTS_VCAPAS.rafaga),
    oct: num('vcOct', DEFAULTS_VCAPAS.oct),
    suav: num('vcSuav', DEFAULTS_VCAPAS.suav),
    frec: num('vcFrec', DEFAULTS_VCAPAS.frec),
    tormenta: num('vcTormenta', DEFAULTS_VCAPAS.tormenta),
    vel: num('vcVel', DEFAULTS_VCAPAS.vel),
  };
}

export function crearUniformesVientoCapas(THREE, p = {}) {
  return {
    uVCk: { value: p.k ?? DEFAULTS_VCAPAS.k },
    uVCamp: { value: p.amp ?? DEFAULTS_VCAPAS.amp },
    uVCramas: { value: p.ramas ?? DEFAULTS_VCAPAS.ramas },
    uVCpunta: { value: p.punta ?? DEFAULTS_VCAPAS.punta },
    uVCrafaga: { value: p.rafaga ?? DEFAULTS_VCAPAS.rafaga },
    uVCoct: { value: p.oct ?? DEFAULTS_VCAPAS.oct },
    uVCsuav: { value: p.suav ?? DEFAULTS_VCAPAS.suav },
    uVCfrec: { value: p.frec ?? DEFAULTS_VCAPAS.frec },
    uVCtormenta: { value: p.tormenta ?? DEFAULTS_VCAPAS.tormenta },
    uVCvel: { value: new THREE.Vector2(p.vel ?? DEFAULTS_VCAPAS.vel, 0) },
  };
}

// ── GLSL ─────────────────────────────────────────────────────────────────────
// Uniforms y atributos: en `#include <common>` (el orden entre declaraciones no
// importa). Las FUNCIONES van justo antes de `void main()`: a esa altura ya están
// declarados los uniforms del viento viejo (`uDirVM`, `uTurbVM`…) que usan.
const VERT_UNIFORMS = /* glsl */ `
#include <common>
uniform float uVCk, uVCamp, uVCramas, uVCpunta, uVCrafaga, uVCoct, uVCsuav, uVCfrec, uVCtormenta;
uniform vec2 uVCvel;
uniform vec2 uVCy;      // y0, y1 LOCALES de esta geometría (base y cima del bake)
uniform float uVCcapa;  // 0 = tronco · 1 = copa
#ifdef VC_DECL_VM
uniform float uTiempoVM, uFuerzaVM, uTurbVM;
uniform vec2 uDirVM;
#endif
#ifdef VC_DECL_TIPO
attribute float masaTipo;
#endif
#ifdef VC_DECL_AO
attribute float aoHorneada;
#endif`;

const VERT_FUNCS = /* glsl */ `
// hash sin seno (Dave Hoskins, MIT) — robusto en Mali; value-noise 2D en [-1,1]
float vcHash(vec2 p){ vec3 p3 = fract(vec3(p.xyx) * 0.1031); p3 += dot(p3, p3.yzx + 33.33); return fract((p3.x + p3.y) * p3.z); }
float vcRuido(vec2 p){
  vec2 i = floor(p); vec2 f = fract(p); f = f * f * (3.0 - 2.0 * f);
  float a = vcHash(i), b = vcHash(i + vec2(1.0, 0.0)), c = vcHash(i + vec2(0.0, 1.0)), d = vcHash(i + vec2(1.0, 1.0));
  return mix(mix(a, b, f.x), mix(c, d, f.x), f.y) * 2.0 - 1.0;
}
// Frentes de ráfaga (Sylva windGustAt): bandas advectadas a lo largo del viento
// bajo una envolvente lenta. Media ≈ 1; en calma [0,59..1], rastrillado [0,47..1,55].
float vcRafaga(vec2 xz, float t){
  vec2 dir = normalize(uDirVM);
  float along = dot(xz, dir); float across = dot(xz, vec2(-dir.y, dir.x));
  float vel = uVCvel.x;
  float on2 = step(1.5, uVCoct), on3 = step(2.5, uVCoct);
  float f1 = vcRuido(vec2(along * 0.011 - t * vel * 0.30, across * 0.006));
  float f2 = on2 * vcRuido(vec2(along * 0.034 - t * vel * 0.62, across * 0.020) + 11.3);
  float f3 = on3 * vcRuido(vec2(along * 0.085 - t * vel * 1.10, across * 0.055) + 27.7);
  float env = vcRuido(vec2(along * 0.0028 - t * 0.035, across * 0.0025)) * 0.5 + 0.5;
  env = smoothstep(0.18, 0.92, env);
  float g = (f1 * 0.52 + f2 * 0.33 + f3 * 0.15) / (0.52 + on2 * 0.33 + on3 * 0.15);
  g = g * 0.5 + 0.5;
  g = mix(0.30, 1.0, g);
  float gust = mix(0.42 + 0.58 * g, g * 1.55, mix(env, 1.0, uVCtormenta * 0.7));
  return mix(1.0, gust, uVCrafaga);
}
// Sway estructural (Sylva windSwayAt): stiff 0..1, fase decorrelaciona vecinos.
vec3 vcSway(vec2 baseXZ, float h, float stiff, float fase, float escala, float t, float s){
  vec2 dir = normalize(uDirVM); float fr = uVCfrec;
  float slow = sin(t * fr * (0.55 + 0.25 * fase) + fase * 6.283 + dot(baseXZ, dir) * 0.035);
  float mid  = sin(t * fr * (1.63 + 0.70 * fase) + fase * 11.1 + dot(baseXZ, dir) * 0.13);
  float fast = sin(t * fr * (4.30 + 1.90 * fase) + fase * 23.7 + dot(baseXZ, dir) * 0.42);
  float turb = uTurbVM;
  float amp = s * escala * (1.0 - stiff * 0.75);
  vec3 o = vec3(0.0);
  o.xz += dir * (slow * 0.62 + mid * 0.26 * (0.5 + turb) + fast * 0.10 * turb) * amp * h;
  o.xz += vec2(-dir.y, dir.x) * (mid * 0.20 + fast * 0.13) * amp * h * (0.4 + turb);
  o.y  -= abs(slow) * amp * h * 0.16;   // se acorta al doblarse
  return o;
}
void main() {`;

// Se inyecta ANTES de project_vertex: `transformed` ya lleva el viento viejo (a
// amplitud amp₀·(1−k)); acá se suma el viento por capas × k.
const VERT_BLOQUE = /* glsl */ `
{
  mat4 _vcM = modelMatrix;
  #ifdef USE_INSTANCING
    _vcM = modelMatrix * instanceMatrix;
  #endif
  vec3 _vcBase = _vcM[3].xyz;                              // base del individuo en MUNDO
  vec3 _vcPW = (_vcM * vec4(transformed, 1.0)).xyz;
  float _vcHW = max(_vcPW.y - _vcBase.y, 0.0);            // altura MUNDO sobre la base
  float _vcFase = vcHash(_vcBase.xz * 0.173 + 7.7);        // fase por individuo
  float _vcT = uTiempoVM;
  float _vcS = uFuerzaVM * vcRafaga(_vcBase.xz, _vcT);     // fuerza en el árbol (ráfaga global × frente)
  float _vcHN = clamp((transformed.y - uVCy.x) / max(uVCy.y - uVCy.x, 1e-3), 0.0, 1.0);
  float _vcAO = 1.0;
  #ifdef VC_AO
    _vcAO = aoHorneada;
  #endif
  float _vcFlex = uVCcapa < 0.5 ? 0.0 : _vcHN * mix(0.6, 1.0, _vcAO);   // 0 tronco → 1 puntas exteriores
  float _vcHEff = _vcHW * _vcHW / (_vcHW + uVCsuav);        // raíz cuadrática (rígida), lineal arriba
  float _vcStiff = 1.0 - _vcFlex * 0.92;
  float _vcTorm = 1.0 + uVCtormenta * (0.55 + 0.85 * _vcFlex);
  vec3 _vcD = vcSway(_vcBase.xz, _vcHEff, _vcStiff, _vcFase, uVCamp * (0.35 + 0.85 * _vcFlex), _vcT, _vcS);
  vec2 _vcDir = normalize(uDirVM);
  // retardo de rama (flex² → 0 en la base de la copa = continuo con el tronco) + cabeceo
  float _vcLag = sin(_vcT * uVCfrec * (2.3 + 1.7 * _vcFase) + _vcFase * 17.0 + dot(_vcBase.xz, _vcDir) * 0.31);
  _vcD.xz += _vcDir * _vcLag * _vcS * uVCramas * _vcFlex * _vcFlex * _vcHW;
  _vcD.y  += cos(_vcT * uVCfrec * (1.9 + 1.3 * _vcFase) + _vcFase * 11.0) * _vcS * uVCramas * 0.37 * _vcFlex * _vcHW;
  _vcD *= _vcTorm;
  // MUNDO → LOCAL de la instancia (rotación Y aleatoria + escala no uniforme)
  mat3 _vcE = mat3(_vcM);
  vec3 _vcDL = vec3(
    dot(_vcD, _vcE[0]) / max(dot(_vcE[0], _vcE[0]), 1e-6),
    dot(_vcD, _vcE[1]) / max(dot(_vcE[1], _vcE[1]), 1e-6),
    dot(_vcD, _vcE[2]) / max(dot(_vcE[2], _vcE[2]), 1e-6));
  #ifdef VC_HOJAS
  {
    // aleteo del card sobre su propio centro: inclinación = desplazamiento a lo
    // largo de la normal del card ∝ (uv − 0,5); fase por card (hash de su normal)
    float _vcCard = 1.0;
    #ifdef VC_TIPO
      _vcCard = step(0.5, masaTipo);
    #endif
    float _vcFc = vcHash(vec2(normal.x * 3.1 + normal.z * 5.7, normal.y * 7.3 - normal.x * 1.9) + 3.3);
    float _vcA = _vcT * uVCfrec * (5.2 + 3.4 * _vcFc) + _vcFc * 41.0 + dot(_vcBase.xz, vec2(0.31, 0.27));
    float _vcAmpF = uVCpunta * (uVCy.y - uVCy.x) * clamp(_vcS, 0.0, 2.0) * (0.35 + 0.9 * _vcFlex) * _vcTorm;
    vec2 _vcC = uv - 0.5;
    float _vcFlap = sin(_vcA) * (0.35 + _vcC.y) * 0.6;          // el borde libre sube más que el pegado
    float _vcTwist = cos(_vcA * 1.31 + 1.1) * _vcC.x * 1.4;      // torsión sobre el eje vertical del card
    _vcDL += normal * ((_vcFlap + _vcTwist) * _vcAmpF * _vcCard);
  }
  #endif
  transformed += _vcDL * uVCk;
}
#include <project_vertex>`;

function hashTexto(s) {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; }
  return h.toString(16);
}

/**
 * Parchea UN material. `info` = { capa: 0|1, y0, y1, hojas, tipo, ao, nombre }.
 * Devuelve el registro (uniforms propios + capturas del viento viejo). Idempotente.
 */
export function aplicarVientoCapas(THREE, mat, U, info) {
  if (!mat || mat.userData?.__vientoCapas) return mat.userData?.__vientoCapas || null;
  mat.userData = mat.userData || {};
  const reg = {
    mat, nombre: info.nombre || mat.name || mat.type, capa: info.capa, y0: info.y0, y1: info.y1,
    hojas: !!info.hojas, tipo: !!info.tipo, ao: !!info.ao,
    uY: { value: new THREE.Vector2(info.y0, info.y1) },
    uCapa: { value: info.capa },
    viejos: [],   // { u: uniform uAmpVM del viento viejo, amp0 }
    amp0: mat.userData.__vientoMundoOpciones?.amplitud ?? null,
    compilaciones: 0,
  };
  mat.userData.__vientoCapas = reg;
  const prev = mat.onBeforeCompile;
  const firmaPrev = prev ? hashTexto(prev.toString()) : '0';
  const prevKey = Object.prototype.hasOwnProperty.call(mat, 'customProgramCacheKey') ? mat.customProgramCacheKey.bind(mat) : null;
  mat.onBeforeCompile = (shader) => {
    if (prev) prev(shader);   // la cadena previa primero (masaTipo, viento viejo, AO…)
    reg.compilaciones++;
    Object.assign(shader.uniforms, U);
    shader.uniforms.uVCy = reg.uY;
    shader.uniforms.uVCcapa = reg.uCapa;
    // viento viejo: capturar su amplitud para el A/B en el mismo programa
    const uAmp = shader.uniforms.uAmpVM;
    if (uAmp) {
      const amp0 = reg.amp0 ?? uAmp.value;
      reg.viejos.push({ u: uAmp, amp0 });
      uAmp.value = amp0 * (1 - U.uVCk.value);
    }
    const vs = shader.vertexShader;
    const declVM = !/\buTiempoVM\b/.test(vs);
    if (declVM) {
      shader.uniforms.uTiempoVM = uniformesVientoMundo.uTiempoVM;
      shader.uniforms.uFuerzaVM = uniformesVientoMundo.uFuerzaVM;
      shader.uniforms.uDirVM = uniformesVientoMundo.uDirVM;
      shader.uniforms.uTurbVM = uniformesVientoMundo.uTurbVM;
    }
    const defs = [
      declVM ? '#define VC_DECL_VM' : '',
      reg.hojas ? '#define VC_HOJAS' : '',
      reg.tipo ? '#define VC_TIPO' : '',
      reg.tipo && !/attribute float masaTipo/.test(vs) ? '#define VC_DECL_TIPO' : '',
      reg.ao ? '#define VC_AO' : '',
      reg.ao && !/attribute float aoHorneada/.test(vs) ? '#define VC_DECL_AO' : '',
    ].filter(Boolean).join('\n');
    shader.vertexShader = vs
      .replace('#include <common>', `${defs}\n${VERT_UNIFORMS}`)
      .replace('void main() {', VERT_FUNCS)
      .replace('#include <project_vertex>', VERT_BLOQUE);
  };
  mat.customProgramCacheKey = () => `${prevKey ? prevKey() : ''}|vcapas:${firmaPrev}:${info.capa}:${reg.hojas ? 1 : 0}${reg.tipo ? 1 : 0}${reg.ao ? 1 : 0}`;
  mat.needsUpdate = true;
  return reg;
}

// ── espejo JS de la ecuación estructural (auto-chequeo de continuidad) ────────
function jsHash(x, y) {
  const fr = (v) => v - Math.floor(v);
  let p0 = fr(x * 0.1031), p1 = fr(y * 0.1031), p2 = fr(x * 0.1031);
  const d = p0 * (p1 + 33.33) + p1 * (p2 + 33.33) + p2 * (p0 + 33.33);
  p0 += d; p1 += d; p2 += d;
  return fr((p0 + p1) * p2);
}
function jsRuido(x, y) {
  const ix = Math.floor(x), iy = Math.floor(y);
  let fx = x - ix, fy = y - iy; fx = fx * fx * (3 - 2 * fx); fy = fy * fy * (3 - 2 * fy);
  const a = jsHash(ix, iy), b = jsHash(ix + 1, iy), c = jsHash(ix, iy + 1), d = jsHash(ix + 1, iy + 1);
  const mix = (u, v, t) => u + (v - u) * t;
  return mix(mix(a, b, fx), mix(c, d, fx), fy) * 2 - 1;
}
function sstep(a, b, x) { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); }
function jsRafaga(U, dir, x, z, t) {
  const along = x * dir.x + z * dir.y, across = x * -dir.y + z * dir.x, vel = U.uVCvel.value.x, oct = U.uVCoct.value;
  const on2 = oct >= 1.5 ? 1 : 0, on3 = oct >= 2.5 ? 1 : 0;
  const f1 = jsRuido(along * 0.011 - t * vel * 0.30, across * 0.006);
  const f2 = on2 * jsRuido(along * 0.034 - t * vel * 0.62 + 11.3, across * 0.020 + 11.3);
  const f3 = on3 * jsRuido(along * 0.085 - t * vel * 1.10 + 27.7, across * 0.055 + 27.7);
  let env = jsRuido(along * 0.0028 - t * 0.035, across * 0.0025) * 0.5 + 0.5; env = sstep(0.18, 0.92, env);
  let g = (f1 * 0.52 + f2 * 0.33 + f3 * 0.15) / (0.52 + on2 * 0.33 + on3 * 0.15);
  g = g * 0.5 + 0.5; g = 0.30 + 0.70 * g;
  const k = env + (1 - env) * (U.uVCtormenta.value * 0.7);
  const gust = (0.42 + 0.58 * g) * (1 - k) + g * 1.55 * k;
  return 1 + (gust - 1) * U.uVCrafaga.value;
}
// desplazamiento MUNDO de la ecuación estructural con flex = 0 (tronco / base de copa)
function jsEstructural(U, baseX, baseZ, hW, t) {
  const dv = uniformesVientoMundo.uDirVM.value, l = Math.hypot(dv.x, dv.y) || 1, dir = { x: dv.x / l, y: dv.y / l };
  const fase = jsHash(baseX * 0.173 + 7.7, baseZ * 0.173 + 7.7);
  const s = uniformesVientoMundo.uFuerzaVM.value * jsRafaga(U, dir, baseX, baseZ, t);
  const hEff = hW * hW / (hW + U.uVCsuav.value);
  const fr = U.uVCfrec.value, along = baseX * dir.x + baseZ * dir.y, turb = uniformesVientoMundo.uTurbVM.value;
  const slow = Math.sin(t * fr * (0.55 + 0.25 * fase) + fase * 6.283 + along * 0.035);
  const mid = Math.sin(t * fr * (1.63 + 0.70 * fase) + fase * 11.1 + along * 0.13);
  const fast = Math.sin(t * fr * (4.30 + 1.90 * fase) + fase * 23.7 + along * 0.42);
  const amp = s * (U.uVCamp.value * 0.35) * (1 - 0.92 * 0 - 0.75 * (1 - 0));   // stiff = 1 → (1 − 0,75)
  const a = (slow * 0.62 + mid * 0.26 * (0.5 + turb) + fast * 0.10 * turb) * amp * hEff;
  const b = (mid * 0.20 + fast * 0.13) * amp * hEff * (0.4 + turb);
  const torm = 1 + U.uVCtormenta.value * 0.55;
  return { x: (dir.x * a - dir.y * b) * torm, y: -Math.abs(slow) * amp * hEff * 0.16 * torm, z: (dir.y * a + dir.x * b) * torm, s, fase, hEff };
}

/**
 * Parchea todo el follaje con viento viejo bajo `raiz` (capa copa) y el lote
 * `flora-bosque-troncos` (capa tronco); devuelve el controlador (+ `window.__vientoCapas`).
 * `params` = leerParamsVientoCapas(); `filtro(mesh, mat)` opcional → 0 | 1 | null.
 */
export function crearVientoCapas(THREE, { raiz, params = {}, filtro = null } = {}) {
  const U = crearUniformesVientoCapas(THREE, params);
  const registros = [];
  const mallas = [];   // { mesh, capa }
  const esTronco = (mesh) => mesh.name === 'flora-bosque-troncos';
  const capaDe = filtro || ((mesh, mat) => {
    if (esTronco(mesh)) return 0;
    if (mat.userData?.__vientoMundo) return 1;
    return null;
  });
  const box = new THREE.Box3();
  if (raiz) {
    raiz.traverse((o) => {
      if (!o.isMesh || !o.material) return;
      const mats = Array.isArray(o.material) ? o.material : [o.material];
      let capaMalla = null;
      for (const m of mats) {
        const capa = capaDe(o, m);
        if (capa === null || capa === undefined) continue;
        capaMalla = capa;
        if (m.userData?.__vientoCapas) { continue; }
        const g = o.geometry;
        if (!g.boundingBox) g.computeBoundingBox();
        box.copy(g.boundingBox);
        const info = {
          capa, y0: box.min.y, y1: box.max.y, nombre: o.name || m.name || m.type,
          hojas: capa === 1 && (!!m.map || !!g.attributes.masaTipo),
          tipo: capa === 1 && !!g.attributes.masaTipo,
          ao: capa === 1 && !!g.attributes.aoHorneada,
        };
        const reg = aplicarVientoCapas(THREE, m, U, info);
        if (reg) { reg.mesh = o; registros.push(reg); }
      }
      if (capaMalla !== null) mallas.push({ mesh: o, capa: capaMalla });
    });
  }

  function set(k) {
    const kk = Math.min(1, Math.max(0, Number(k)));
    U.uVCk.value = kk;
    for (const r of registros) for (const v of r.viejos) v.u.value = v.amp0 * (1 - kk);
    return api.estado();
  }

  // sonda: individuo (tronco + copa con la MISMA matriz) más cercano a `cerca`
  // [x, z] (default: el punto donde mira la cámara a 30 m). Devuelve alturas
  // mundo/pantalla y el desfase cima-del-tronco ↔ base-de-la-copa del espejo JS.
  const _m = new THREE.Matrix4(), _p = new THREE.Vector3(), _q = new THREE.Vector3();
  function sonda({ cerca = null, camera = (typeof window !== 'undefined' ? window.__cam : null), t = null } = {}) {
    const troncos = mallas.filter((x) => x.capa === 0 && x.mesh.isInstancedMesh);
    if (!troncos.length) return { ok: false, motivo: 'sin lote de troncos' };
    let objetivo = cerca;
    if (!objetivo && camera) {
      const d = new THREE.Vector3(); camera.getWorldDirection(d);
      objetivo = [camera.position.x + d.x * 30, camera.position.z + d.z * 30];
    }
    if (!objetivo) return { ok: false, motivo: 'sin objetivo ni cámara' };
    let mejor = null;
    for (const { mesh } of troncos) {
      for (let i = 0; i < mesh.count; i++) {
        mesh.getMatrixAt(i, _m);
        const dx = _m.elements[12] - objetivo[0], dz = _m.elements[14] - objetivo[1], d2 = dx * dx + dz * dz;
        if (!mejor || d2 < mejor.d2) mejor = { mesh, i, d2, m: _m.clone() };
      }
    }
    if (!mejor) return { ok: false, motivo: 'sin instancias' };
    const regT = mejor.mesh.material.userData.__vientoCapas;
    const baseW = new THREE.Vector3().setFromMatrixPosition(mejor.m);
    // matriz de mundo del tronco (raíz ∘ instancia)
    const mw = new THREE.Matrix4().multiplyMatrices(mejor.mesh.matrixWorld, mejor.m);
    const baseWorld = new THREE.Vector3().setFromMatrixPosition(mw);
    const troncoTop = _p.set(0, regT.y1, 0).applyMatrix4(mw).clone();
    // copa: instancia con la misma posición en algún lote de capa 1
    let copa = null;
    for (const { mesh } of mallas.filter((x) => x.capa === 1 && x.mesh.isInstancedMesh)) {
      for (let i = 0; i < mesh.count; i++) {
        mesh.getMatrixAt(i, _m);
        if (Math.abs(_m.elements[12] - baseW.x) < 1e-3 && Math.abs(_m.elements[14] - baseW.z) < 1e-3) {
          const reg = mesh.material.userData.__vientoCapas;
          const mwc = new THREE.Matrix4().multiplyMatrices(mesh.matrixWorld, _m);
          copa = { mesh, i, reg, base: _q.set(0, reg.y0, 0).applyMatrix4(mwc).clone(), top: _p.set(0, reg.y1, 0).applyMatrix4(mwc).clone() };
          break;
        }
      }
      if (copa) break;
    }
    const tt = t ?? uniformesVientoMundo.uTiempoVM.value;
    const hTronco = troncoTop.y - baseWorld.y;
    const dT = jsEstructural(U, baseWorld.x, baseWorld.z, hTronco, tt);
    let dC = null, desfase = null, hCopa = null;
    if (copa) {
      hCopa = copa.base.y - baseWorld.y;
      dC = jsEstructural(U, baseWorld.x, baseWorld.z, Math.max(hCopa, 0), tt);
      desfase = Math.hypot(dT.x - dC.x, dT.y - dC.y, dT.z - dC.z);
    }
    const pant = (v) => {
      if (!camera) return null;
      const c = v.clone().project(camera);
      return { x: +((c.x + 1) / 2).toFixed(4), y: +((1 - c.y) / 2).toFixed(4), dentro: Math.abs(c.x) <= 1 && Math.abs(c.y) <= 1 && c.z <= 1 };
    };
    const red = (v) => ({ x: +v.x.toFixed(3), y: +v.y.toFixed(3), z: +v.z.toFixed(3) });
    return {
      ok: true, t: tt, lote: mejor.mesh.name, instancia: mejor.i, distXZ: +Math.sqrt(mejor.d2).toFixed(2),
      base: red(baseWorld), troncoTop: red(troncoTop), hTronco: +hTronco.toFixed(3),
      copa: copa ? { lote: copa.mesh.name, instancia: copa.i, base: red(copa.base), top: red(copa.top), hBase: +hCopa.toFixed(3), hTop: +(copa.top.y - baseWorld.y).toFixed(3) } : null,
      pantalla: { base: pant(baseWorld), troncoTop: pant(troncoTop), copaBase: copa ? pant(copa.base) : null, copaTop: copa ? pant(copa.top) : null },
      espejo: { tronco: { x: +dT.x.toFixed(4), y: +dT.y.toFixed(4), z: +dT.z.toFixed(4), s: +dT.s.toFixed(3), fase: +dT.fase.toFixed(3) },
        copaBase: dC ? { x: +dC.x.toFixed(4), y: +dC.y.toFixed(4), z: +dC.z.toFixed(4) } : null, desfase: desfase === null ? null : +desfase.toFixed(4) },
    };
  }

  const api = {
    activa: registros.length > 0,
    uniforms: U,
    materiales: registros.length,
    troncos: registros.filter((r) => r.capa === 0).length,
    mallas: mallas.map((x) => `${x.mesh.name || x.mesh.type}:${x.capa}`),
    set,
    ajustar(o = {}) {
      if (o.amp !== undefined) U.uVCamp.value = o.amp;
      if (o.ramas !== undefined) U.uVCramas.value = o.ramas;
      if (o.punta !== undefined) U.uVCpunta.value = o.punta;
      if (o.rafaga !== undefined) U.uVCrafaga.value = o.rafaga;
      if (o.oct !== undefined) U.uVCoct.value = o.oct;
      if (o.suav !== undefined) U.uVCsuav.value = o.suav;
      if (o.frec !== undefined) U.uVCfrec.value = o.frec;
      if (o.tormenta !== undefined) U.uVCtormenta.value = o.tormenta;
      if (o.vel !== undefined) U.uVCvel.value.x = o.vel;
      return api.estado();
    },
    // oculta/muestra las mallas parcheadas; `solo: 'troncos' | 'copas'` limita la capa
    ocultar(v, { solo = null } = {}) {
      let n = 0;
      for (const { mesh, capa } of mallas) {
        if (solo === 'troncos' && capa !== 0) continue;
        if (solo === 'copas' && capa !== 1) continue;
        mesh.visible = !v; n++;
      }
      return n;
    },
    sonda,
    estado() {
      return {
        activa: api.activa, k: U.uVCk.value, materiales: registros.length, troncos: api.troncos, mallas: mallas.length,
        viejosCapturados: registros.reduce((s, r) => s + r.viejos.length, 0),
        compilaciones: registros.reduce((s, r) => s + r.compilaciones, 0),
        reloj: uniformesVientoMundo.uTiempoVM.value, fuerza: +uniformesVientoMundo.uFuerzaVM.value.toFixed(3),
        params: { amp: U.uVCamp.value, ramas: U.uVCramas.value, punta: U.uVCpunta.value, rafaga: U.uVCrafaga.value, oct: U.uVCoct.value,
          suav: U.uVCsuav.value, frec: U.uVCfrec.value, tormenta: U.uVCtormenta.value, vel: U.uVCvel.value.x },
        detalle: registros.map((r) => ({ nombre: r.nombre, capa: r.capa, y0: +r.y0.toFixed(2), y1: +r.y1.toFixed(2), hojas: r.hojas, tipo: r.tipo, ao: r.ao, amp0: r.amp0, comp: r.compilaciones })),
      };
    },
  };
  if (typeof window !== 'undefined') window.__vientoCapas = api;
  return api;
}

/*
Ecuaciones adaptadas de Sylva — https://github.com/Token-Gremlin/realistic-forest
(`src/shaders/lib.js` GLSL_WIND, `src/veg/treeMaterials.js` treeVertex/leafFlutter).

MIT License

Copyright (c) 2026 Token Gremlin

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.

`vcHash` = "Hash without Sine", Copyright (c) 2014 David Hoskins, MIT License
(https://www.shadertoy.com/view/4djSRW).
*/
