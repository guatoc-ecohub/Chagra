// lib3d/post/taaSylva.js — antialiasing temporal (TAA) a la manera de Sylva, para el composer r160 del valle.
//
// Portado de Sylva (Token-Gremlin/realistic-forest, MIT — notice al pie): jitter Halton(2,3) de 8 frames
// en la proyección, clamp del historial en YCoCg con clip de varianza (μ ± 1,45·σ) sobre color con
// tonemap reversible, blend 0,90 frenado por velocidad, invalidación tras corte de cámara, sharpen 4-tap
// en espacio de display para recuperar la suavidad del TAA.
//
// DIFERENCIA declarada: Sylva tiene G-buffer con velocidad por objeto; el valle no. Aquí la velocidad es
// por REPROYECCIÓN DE CÁMARA: la posición de mundo se reconstruye de la profundidad del RenderPass con la
// viewProj jitterada y se proyecta con la viewProj SIN jitter del frame anterior (matriz `uReproj`
// precompuesta en JS). El movimiento propio (viento, animales, guías) no tiene vector y lo contiene el
// clip de varianza, como en cualquier TAA sin motion vectors.
//
// Opt-in: `?aa=taa|fxaa|none|msaa` (ver `leerParamsAA`). Sin `aa=` nada de esto se ejecuta.
// Hook para el gate: `window.__aa` (contrato en Chagra-strategy/ops/specs/2026-09-02-sylva-s27-taa/spec.md).
import * as THREE from 'three';
import { Pass, FullScreenQuad } from 'three/addons/postprocessing/Pass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { CopyShader } from 'three/addons/shaders/CopyShader.js';

// Halton(2) y Halton(3) de 8 términos (Sylva RenderPipeline.js)
const HALTON2 = [0.5, 0.25, 0.75, 0.125, 0.625, 0.375, 0.875, 0.0625];
const HALTON3 = [1 / 3, 2 / 3, 1 / 9, 4 / 9, 7 / 9, 2 / 9, 5 / 9, 8 / 9];
const MODOS = ['msaa', 'taa', 'fxaa', 'none'];

const VERT = /* glsl */`
  varying vec2 vUv;
  void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }
`;

// Fragment del TAA (Sylva post.js::taaFragment, con la reproyección por cámara en vez de uMiscTex)
const FRAG_TAA = /* glsl */`
  uniform sampler2D tDiffuse;   // color lineal del RenderPass (jitterado)
  uniform sampler2D tDepth;     // profundidad del mismo target
  uniform sampler2D tHistory;   // salida TAA del frame anterior (centrada en píxel)
  uniform mat4 uReproj;         // prevViewProj(sin jitter) · inverse(viewProj jitterada actual)
  uniform vec2 uJitterUv;       // desplazamiento del jitter en uv (uv sin jitter = vUv + uJitterUv)
  uniform vec2 uResolution;
  uniform float uBlend, uClip, uFirst, uVelFreno;
  varying vec2 vUv;

  vec3 rgb2ycocg(vec3 c) {
    return vec3(0.25 * c.r + 0.5 * c.g + 0.25 * c.b, 0.5 * c.r - 0.5 * c.b, -0.25 * c.r + 0.5 * c.g - 0.25 * c.b);
  }
  vec3 ycocg2rgb(vec3 c) { return vec3(c.x + c.y - c.z, c.x + c.z, c.x - c.y - c.z); }
  float maxc(vec3 c) { return max(c.r, max(c.g, c.b)); }
  vec3 tonemapT(vec3 c) { c = max(c, vec3(0.0)); return c / (1.0 + maxc(c)); }
  // el clamp en YCoCg puede sacar un canal de [0,1] tras la vuelta; sin la guarda el recíproco explota
  // y salen motas magenta en la sombra (nota de Sylva)
  vec3 tonemapInv(vec3 c) { c = clamp(c, vec3(0.0), vec3(0.994)); return c / max(1.0 - maxc(c), 6.0e-3); }

  void main() {
    vec2 texel = 1.0 / uResolution;
    // vecino de menor profundidad (3×3): la velocidad de la silueta manda, no la del fondo (Sylva)
    float bestD = 2.0; vec2 bestOff = vec2(0.0);
    for (int j = -1; j <= 1; j++) for (int i = -1; i <= 1; i++) {
      vec2 o = vec2(float(i), float(j)) * texel;
      float d = texture2D(tDepth, vUv + o).r;
      if (d < bestD) { bestD = d; bestOff = o; }
    }
    vec2 uvC = vUv + bestOff;
    vec4 prev = uReproj * vec4(uvC * 2.0 - 1.0, bestD * 2.0 - 1.0, 1.0);
    float valid = (uFirst > 0.5 || prev.w <= 1.0e-6) ? 0.0 : 1.0;
    vec2 prevUv = prev.xy / max(prev.w, 1.0e-6) * 0.5 + 0.5;
    vec2 vel = (uvC + uJitterUv) - prevUv;          // uv sin jitter − uv previa (en uv); 0 con cámara quieta
    // El historial está CENTRADO en el píxel (promedio de los 8 jitters): con cámara quieta se lee en vUv
    // exacto, sin remuestreo bilineal (leerlo en vUv+jitter/2 emborronaba el promedio; medido 2026-09-02).
    vec2 histUv = vUv - vel;
    if (any(lessThan(histUv, vec2(0.0))) || any(greaterThan(histUv, vec2(1.0)))) valid = 0.0;

    vec3 c00 = texture2D(tDiffuse, vUv).rgb;
    vec3 m1 = vec3(0.0), m2 = vec3(0.0);
    vec3 mn = vec3(1.0e9), mx = vec3(-1.0e9);
    for (int j = -1; j <= 1; j++) for (int i = -1; i <= 1; i++) {
      vec3 s = rgb2ycocg(tonemapT(texture2D(tDiffuse, vUv + vec2(float(i), float(j)) * texel).rgb));
      m1 += s; m2 += s * s; mn = min(mn, s); mx = max(mx, s);
    }
    m1 /= 9.0; m2 /= 9.0;
    vec3 sigma = sqrt(max(m2 - m1 * m1, vec3(0.0)));
    vec3 lo = max(mn, m1 - sigma * uClip);
    vec3 hi = min(mx, m1 + sigma * uClip);

    vec3 hist = texture2D(tHistory, histUv).rgb;
    vec3 histT = clamp(rgb2ycocg(tonemapT(hist)), lo, hi);
    vec3 curT = rgb2ycocg(tonemapT(c00));

    float blend = uBlend * valid;
    blend *= 1.0 - clamp(length(vel * uResolution) * uVelFreno, 0.0, 0.55);   // menos historial si vuela
    vec3 outT = mix(curT, histT, blend);
    gl_FragColor = vec4(max(tonemapInv(ycocg2rgb(outT)), vec3(0.0)), 1.0);
  }
`;

// Sharpen 4-tap en espacio de display (Sylva post.js: «recovers TAA softness»)
export const ShaderSharpenSylva = {
  name: 'SharpenSylva',
  uniforms: { tDiffuse: { value: null }, uTexel: { value: new THREE.Vector2(1 / 1280, 1 / 800) }, uFuerza: { value: 0.3 } },
  vertexShader: VERT,
  fragmentShader: /* glsl */`
    uniform sampler2D tDiffuse; uniform vec2 uTexel; uniform float uFuerza; varying vec2 vUv;
    void main() {
      vec3 c = texture2D(tDiffuse, vUv).rgb;
      vec3 blur = (texture2D(tDiffuse, vUv + vec2(uTexel.x, 0.0)).rgb + texture2D(tDiffuse, vUv - vec2(uTexel.x, 0.0)).rgb
                 + texture2D(tDiffuse, vUv + vec2(0.0, uTexel.y)).rgb + texture2D(tDiffuse, vUv - vec2(0.0, uTexel.y)).rgb) * 0.25;
      gl_FragColor = vec4(clamp(c + (c - blur) * uFuerza, 0.0, 1.0), 1.0);
    }
  `,
};

export class TAAPass extends Pass {
  constructor({ width = 2, height = 2, tipo = THREE.HalfFloatType } = {}) {
    super();
    // La salida del TAA se copia de vuelta al `readBuffer` (el target del RenderPass) SIN swap: así los pases
    // siguientes que muestrean la profundidad de ese target (DoF s29) nunca escriben en él mientras la leen
    // (bucle de retroalimentación → GL_INVALID_OPERATION 1282 y cuadro negro, medido en Mali-G78 2026-09-02).
    this.needsSwap = false;
    this.tipo = tipo;
    this.material = new THREE.ShaderMaterial({
      uniforms: {
        tDiffuse: { value: null }, tDepth: { value: null }, tHistory: { value: null },
        uReproj: { value: new THREE.Matrix4() }, uJitterUv: { value: new THREE.Vector2() },
        uResolution: { value: new THREE.Vector2(width, height) },
        uBlend: { value: 0.90 }, uClip: { value: 1.45 }, uFirst: { value: 1 }, uVelFreno: { value: 0.014 },
      },
      vertexShader: VERT, fragmentShader: FRAG_TAA, depthTest: false, depthWrite: false,
    });
    this.fsQuad = new FullScreenQuad(this.material);
    this.copyMaterial = new THREE.ShaderMaterial({ uniforms: THREE.UniformsUtils.clone(CopyShader.uniforms), vertexShader: CopyShader.vertexShader, fragmentShader: CopyShader.fragmentShader, depthTest: false, depthWrite: false });
    this.fsCopy = new FullScreenQuad(this.copyMaterial);
    const opt = { type: tipo, depthBuffer: false, stencilBuffer: false, minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter, generateMipmaps: false };
    this.historia = [new THREE.WebGLRenderTarget(width, height, opt), new THREE.WebGLRenderTarget(width, height, opt)];
    this.frames = 0;   // frames acumulados desde el último corte
  }
  cortar() { this.material.uniforms.uFirst.value = 1; this.frames = 0; }
  setSize(w, h) {
    this.material.uniforms.uResolution.value.set(w, h);
    this.historia[0].setSize(w, h); this.historia[1].setSize(w, h);
    this.cortar();
  }
  render(renderer, writeBuffer, readBuffer) {
    const u = this.material.uniforms;
    u.tDiffuse.value = readBuffer.texture;
    u.tDepth.value = readBuffer.depthTexture;
    if (!readBuffer.depthTexture) u.uFirst.value = 1;   // sin profundidad no hay reproyección: passthrough
    u.tHistory.value = this.historia[1].texture;
    renderer.setRenderTarget(this.historia[0]);
    this.fsQuad.render(renderer);
    this.copyMaterial.uniforms.tDiffuse.value = this.historia[0].texture;
    // copia al readBuffer con autoClear apagado: el quad cubre todo el color y NO toca la profundidad del target
    renderer.setRenderTarget(this.renderToScreen ? null : readBuffer);
    const autoClear = renderer.autoClear;
    renderer.autoClear = false;
    if (this.clear) renderer.clear();
    this.fsCopy.render(renderer);
    renderer.autoClear = autoClear;
    const t = this.historia[0]; this.historia[0] = this.historia[1]; this.historia[1] = t;
    u.uFirst.value = 0;
    this.frames++;
  }
  dispose() {
    this.material.dispose(); this.copyMaterial.dispose(); this.fsQuad.dispose(); this.fsCopy.dispose();
    this.historia[0].dispose(); this.historia[1].dispose();
  }
}

/** `?aa=taa|fxaa|none|msaa` (+ `aaBlend`, `aaSharp`, `aaJitter`, `aaClip`). Sin `aa=` → null (el vivo no cambia). */
export function leerParamsAA(search) {
  const q = new URLSearchParams(search);
  const modo = q.get('aa');
  if (!modo || !MODOS.includes(modo)) return null;
  const num = (k, d) => { const v = Number(q.get(k)); return q.get(k) !== null && Number.isFinite(v) ? v : d; };
  return { modo, blend: num('aaBlend', 0.90), sharp: num('aaSharp', 0), jitter: num('aaJitter', 1), clip: num('aaClip', 1.45) };
}

/**
 * Monta el TAA/FXAA/sharpen sobre un EffectComposer YA creado (con RenderPass como primer pase) y devuelve
 * el hook `window.__aa`. `composer` debe haberse creado con targets propios; `set(modo)` cambia `samples`
 * y `depthTexture` de ambos targets y los dispone (three los recrea en el siguiente render). El TAAPass deja su
 * salida en el MISMO target del RenderPass (sin swap), con la profundidad de ese frame intacta.
 * `preparar(camera)` va justo antes de `composer.render()`, `terminar(camera)` justo después.
 */
export function crearAA({ renderer, composer, camera, params, msaaDisponible = true, indiceFXAA = null, size = () => [innerWidth, innerHeight], onModo = null }) {
  const tipoRT = composer.renderTarget1.texture.type === THREE.HalfFloatType ? 'half' : 'byte';
  const [w0, h0] = size();
  const pr0 = renderer.getPixelRatio();
  const taaPass = new TAAPass({ width: Math.round(w0 * pr0), height: Math.round(h0 * pr0), tipo: composer.renderTarget1.texture.type });
  const sharpenPass = new ShaderPass(ShaderSharpenSylva);
  sharpenPass.setSize = (w, h) => sharpenPass.uniforms.uTexel.value.set(1 / w, 1 / h);
  let fxaaPass = null, fxaaDisponible = null;   // null = cargando

  const P_unj = new THREE.Matrix4(), VP_unj = new THREE.Matrix4(), VPj = new THREE.Matrix4();
  const prevVP = new THREE.Matrix4(), invVPj = new THREE.Matrix4();
  const prevPos = new THREE.Vector3(), prevDir = new THREE.Vector3(), dir = new THREE.Vector3();
  let tienePrev = false, frame = 0, jx = 0, jy = 0, jitterado = false;
  const estado = { modo: null, params: { ...params } };

  function aplicarPasos() {
    taaPass.enabled = estado.modo === 'taa';
    sharpenPass.enabled = estado.modo === 'taa' && estado.params.sharp > 0;
    sharpenPass.uniforms.uFuerza.value = estado.params.sharp;
    if (fxaaPass) fxaaPass.enabled = estado.modo === 'fxaa';
    taaPass.material.uniforms.uBlend.value = estado.params.blend;
    taaPass.material.uniforms.uClip.value = estado.params.clip;
  }
  function configurarTargets(modo) {
    const samples = modo === 'msaa' && msaaDisponible ? 4 : 0;
    const conDepth = modo === 'taa';
    for (const rt of [composer.renderTarget1, composer.renderTarget2]) {
      const cambia = rt.samples !== samples || (!!rt.depthTexture) !== conDepth;
      if (!cambia) continue;
      rt.samples = samples;
      if (conDepth) {
        rt.depthTexture = rt.__depthTAA || (rt.__depthTAA = new THREE.DepthTexture(rt.width, rt.height, THREE.UnsignedIntType));
      } else {
        rt.depthTexture = null;
      }
      rt.dispose();   // three recrea framebuffer/texturas con los flags nuevos en el siguiente setRenderTarget
    }
  }
  function set(modo) {
    if (!MODOS.includes(modo)) throw new Error(`modo aa inválido: ${modo}`);
    estado.modo = modo;
    configurarTargets(modo);
    aplicarPasos();
    taaPass.cortar();
    tienePrev = false;
    if (onModo) onModo(modo);
    return leer();
  }
  function ajustar(p) { Object.assign(estado.params, p); aplicarPasos(); return leer(); }
  function leer() {
    return {
      modo: estado.modo, frame, samples: composer.renderTarget1.samples, tipoRT,
      historia: taaPass.material.uniforms.uFirst.value === 0 && taaPass.frames > 0, framesHistoria: taaPass.frames,
      jitter: [+jx.toExponential(3), +jy.toExponential(3)], pr: renderer.getPixelRatio(),
      params: { ...estado.params }, fxaaDisponible,
      pasos: Object.fromEntries(composer.passes.map((p) => [p.constructor.name + (p === sharpenPass ? '(sharp)' : p === fxaaPass ? '(fxaa)' : ''), p.enabled])),
    };
  }
  // Jitter en la proyección (Sylva applyJitter): se suma a elements[8|9] con amplitud de un píxel;
  // la imagen se desplaza −jx en NDC, o sea uv sin jitter = uv + jx/2.
  function preparar(cam = camera) {
    cam.updateMatrixWorld();
    cam.updateProjectionMatrix();                       // proyección limpia (sin jitter) desde fov/aspect
    P_unj.copy(cam.projectionMatrix);
    VP_unj.multiplyMatrices(P_unj, cam.matrixWorldInverse);
    const rt = composer.renderTarget1;
    const w = Math.max(1, rt.width), h = Math.max(1, rt.height);
    jx = 0; jy = 0; jitterado = false;
    if (estado.modo === 'taa' && estado.params.jitter > 0) {
      const i = frame % 8;
      jx = (HALTON2[i] - 0.5) * 2 / w * estado.params.jitter;
      jy = (HALTON3[i] - 0.5) * 2 / h * estado.params.jitter;
      cam.projectionMatrix.elements[8] += jx;
      cam.projectionMatrix.elements[9] += jy;
      cam.projectionMatrixInverse.copy(cam.projectionMatrix).invert();
      jitterado = true;
    }
    VPj.multiplyMatrices(cam.projectionMatrix, cam.matrixWorldInverse);
    invVPj.copy(VPj).invert();
    // corte automático: salto grande de posición o de rumbo → el historial no sirve
    cam.getWorldDirection(dir);
    const salto = tienePrev && (prevPos.distanceTo(cam.position) > 20 || prevDir.angleTo(dir) > 0.35);
    if (!tienePrev || salto) taaPass.cortar();
    const u = taaPass.material.uniforms;
    if (tienePrev && !salto) u.uReproj.value.multiplyMatrices(prevVP, invVPj);
    else u.uReproj.value.identity();
    u.uJitterUv.value.set(jx * 0.5, jy * 0.5);
    prevVP.copy(VP_unj); prevPos.copy(cam.position); prevDir.copy(dir); tienePrev = true;
    frame++;
  }
  function terminar(cam = camera) {
    if (!jitterado) return;
    cam.projectionMatrix.copy(P_unj);
    cam.projectionMatrixInverse.copy(P_unj).invert();
    jitterado = false;
  }

  // FXAA (three r180, MIT) vendorizado aparte: carga perezosa para que su ausencia no tumbe el valle
  import('three/addons/shaders/FXAAShader.js').then((m) => {
    fxaaPass = new ShaderPass(m.FXAAShader);
    fxaaPass.setSize = (w, h) => fxaaPass.uniforms.resolution.value.set(1 / w, 1 / h);
    const [w, h] = size(); const pr = renderer.getPixelRatio();
    fxaaPass.setSize(Math.round(w * pr), Math.round(h * pr));
    const idx = indiceFXAA != null ? Math.min(indiceFXAA, composer.passes.length) : composer.passes.length;
    composer.insertPass(fxaaPass, idx);
    fxaaDisponible = true;
    aplicarPasos();
  }).catch((e) => { fxaaDisponible = false; console.warn('[aa] FXAAShader no disponible:', e?.message || e); });

  const hook = {
    get modo() { return estado.modo; }, get params() { return estado.params; },
    taaPass, sharpenPass, get fxaaPass() { return fxaaPass; },
    set, ajustar, estado: leer, cortar: () => { taaPass.cortar(); tienePrev = false; },
    preparar, terminar,
    frame: () => { if (typeof window.__tick === 'function') window.__tick(); return leer(); },
    pausar: (on) => { if (typeof window.__loop === 'function') window.__loop(!on); return !on; },
  };
  set(params.modo);
  return hook;
}

// ─────────────────────────────────────────────────────────────────────────────
// Sylva — realistic-forest (github.com/Token-Gremlin/realistic-forest)
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
// Portado por reproyección de cámara (sin G-buffer) para el valle de Guatoc, 2026-09-02 (Sylva s27).
