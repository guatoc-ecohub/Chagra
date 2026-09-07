// lib3d/post/dofSylva.js — profundidad de campo con bokeh a la manera de Sylva, para el composer r160 del valle.
//
// Portado de Sylva (Token-Gremlin/realistic-forest, MIT — notice al pie; `src/shaders/post.js::dofFragment` +
// `compositeFragment`, `src/core/RenderPipeline.js`, `src/main.js`): círculo de confusión por píxel desde la
// profundidad (`c = apertura·(dist − foco)/dist`, acotado a ±maxCoc px), gather a MEDIA resolución con N muestras
// en disco de Vogel de radio |coc| del píxel central (cada muestra pesa según su PROPIO círculo alcance el píxel),
// mezcla en resolución completa con `smoothstep(0,8, 3,2, |coc|)`, y autofoco por la MEDIANA de la distancia en
// 25 muestras alrededor del centro (GPU → target 1×1 → readback cada 4 frames), con apertura más abierta de
// cerca y más cerrada en paisaje.
//
// DIFERENCIAS declaradas: (1) el valle no tiene G-buffer → la profundidad es el `depthTexture` del target del
// RenderPass (con MSAA ×4, three r160 la resuelve por blit); la distancia se reconstruye en espacio de VISTA con
// `projectionMatrixInverse`. (2) La rotación por frame del kernel SOLO se aplica con el TAA de s27 activo: sin
// integración temporal rotar es shimmer. (3) Sin director de cámara: el objetivo del autofoco es la mediana medida,
// acotada a [0,5, 4000] u (Sylva: 400 u) porque el valle mide kilómetros.
//
// Opt-in: `?dof=1` (ver `leerParamsDoF`). Sin `dof=` nada de esto se ejecuta.
// Hook para el gate: `window.__dof` (contrato en Chagra-strategy/ops/specs/2026-09-02-sylva-s29-dof/spec.md).
import * as THREE from 'three';
import { Pass, FullScreenQuad } from 'three/addons/postprocessing/Pass.js';
import { CopyShader } from 'three/addons/shaders/CopyShader.js';

const VERT = /* glsl */`
  varying vec2 vUv;
  void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }
`;

// CoC desde la profundidad (Sylva cocFromDepth / cocAt). `uDof` = (foco u, apertura px, maxCoc px, rotación).
const GLSL_COC = /* glsl */`
  uniform sampler2D tDepth;
  uniform mat4 uInvProj;
  uniform vec4 uDof;
  float distanciaVista(vec2 uv, float d) {
    vec4 p = uInvProj * vec4(uv * 2.0 - 1.0, d * 2.0 - 1.0, 1.0);
    return length(p.xyz / p.w);
  }
  float cocDesde(vec2 uv, float d) {
    if (d >= 0.999999) return uDof.z;                 // cielo: círculo máximo (Sylva)
    float dist = distanciaVista(uv, d);
    float c = uDof.y * (dist - uDof.x) / max(dist, 0.05);
    return clamp(c, -uDof.z, uDof.z);
  }
`;

// Gather a media resolución (Sylva dofFragment). N_TAPS es un define (28 en Sylva; 12 = brazo barato).
const FRAG_GATHER = /* glsl */`
  uniform sampler2D tColor;
  uniform vec2 uResolution;      // tamaño del target de MEDIA resolución
  ${GLSL_COC}
  varying vec2 vUv;
  float ign(vec2 p) { return fract(52.9829189 * fract(0.06711056 * p.x + 0.00583715 * p.y)); }
  vec2 vogel(int i, int n, float rot) {
    float r = sqrt((float(i) + 0.5) / float(n));
    float th = float(i) * 2.39996323 + rot;
    return vec2(cos(th), sin(th)) * r;
  }
  void main() {
    float d0 = texture2D(tDepth, vUv).r;
    float coc0 = cocDesde(vUv, d0);
    float r = abs(coc0);
    vec3 sum = texture2D(tColor, vUv).rgb;
    float wsum = 1.0;
    float rot = ign(gl_FragCoord.xy) * 6.2831853 + uDof.w;
    for (int i = 0; i < N_TAPS; i++) {
      vec2 o = vogel(i, N_TAPS, rot) * r / uResolution;
      vec3 s = texture2D(tColor, vUv + o).rgb;
      float sd = texture2D(tDepth, vUv + o).r;
      float sc = abs(cocDesde(vUv + o, sd));
      // acepta muestras cuyo propio círculo de confusión alcanza este píxel (Sylva)
      float w = clamp((sc - length(o * uResolution)) * 0.5 + 1.0, 0.0, 1.0);
      w = max(w, 0.02);
      sum += s * w; wsum += w;
    }
    gl_FragColor = vec4(sum / wsum, r);
  }
`;

// Mezcla en resolución completa (Sylva compositeFragment «depth of field blend») + modos de depuración crudos.
const FRAG_COMP = /* glsl */`
  uniform sampler2D tDiffuse;
  uniform sampler2D tDoF;
  uniform float uDebug;          // 0 normal · 1 gris f_foco (255 = en foco) · 2 CoC firmado (R delante, B detrás)
  ${GLSL_COC}
  varying vec2 vUv;
  void main() {
    vec3 col = texture2D(tDiffuse, vUv).rgb;
    float d = texture2D(tDepth, vUv).r;
    float coc = cocDesde(vUv, d);
    float f = smoothstep(0.8, 3.2, abs(coc));
    if (uDebug > 1.5) {
      float a = abs(coc) / max(uDof.z, 1.0e-3);
      gl_FragColor = vec4(coc < 0.0 ? a : 0.0, 1.0 - f, coc > 0.0 ? a : 0.0, 1.0);
      return;
    }
    if (uDebug > 0.5) { gl_FragColor = vec4(vec3(1.0 - f), 1.0); return; }
    if (f > 0.001) col = mix(col, texture2D(tDoF, vUv).rgb, f);
    gl_FragColor = vec4(col, 1.0);
  }
`;

// Autofoco (Sylva lumPass): mediana de la distancia en 25 muestras del centro, empaquetada en 24 bits (÷8192 u).
const FRAG_FOCO = /* glsl */`
  ${GLSL_COC}
  void main() {
    float ds[25];
    int nd = 0;
    for (int j = -2; j <= 2; j++) for (int i = -2; i <= 2; i++) {
      vec2 uv = vec2(0.5) + vec2(float(i), float(j)) * 0.045;
      float dep = texture2D(tDepth, uv).r;
      if (dep >= 0.999999) continue;
      ds[nd] = distanciaVista(uv, dep);
      nd++;
    }
    float med = 900.0;
    if (nd > 0) {
      int mid = nd / 2;                                 // selección parcial hasta el elemento central (Sylva)
      for (int a = 0; a < 13; a++) {
        if (a > mid) break;
        int mi = a;
        for (int b = a + 1; b < 25; b++) { if (b >= nd) break; if (ds[b] < ds[mi]) mi = b; }
        float tmp = ds[a]; ds[a] = ds[mi]; ds[mi] = tmp;
      }
      med = ds[mid];
    }
    float v = clamp(med / 8192.0, 0.0, 1.0);
    vec3 enc = fract(v * vec3(1.0, 255.0, 65025.0));
    enc -= enc.yzz * vec3(1.0 / 255.0, 1.0 / 255.0, 0.0);
    gl_FragColor = vec4(enc, 1.0);
  }
`;

/** Apertura de Sylva para una distancia de foco: más abierta de cerca, más cerrada en paisaje. */
export function aperturaSylva(d) {
  return THREE.MathUtils.clamp(21 - Math.log2(Math.max(d, 1)) * 3.4, 2.2, 21);
}

export class DoFPass extends Pass {
  constructor({ width = 2, height = 2, tipo = THREE.HalfFloatType, n = 28 } = {}) {
    super();
    this.needsSwap = true;
    this.tipo = tipo;
    // uniforms compartidos por los tres materiales
    this.tDepth = { value: null };
    this.uInvProj = { value: new THREE.Matrix4() };
    this.uDof = { value: new THREE.Vector4(12, 14, 12, 0) };
    const hw = Math.max(1, Math.ceil(width / 2)), hh = Math.max(1, Math.ceil(height / 2));
    const base = { vertexShader: VERT, depthTest: false, depthWrite: false };
    this.matGather = new THREE.ShaderMaterial({ ...base, defines: { N_TAPS: n | 0 }, fragmentShader: FRAG_GATHER,
      uniforms: { tColor: { value: null }, tDepth: this.tDepth, uInvProj: this.uInvProj, uDof: this.uDof, uResolution: { value: new THREE.Vector2(hw, hh) } } });
    this.matComp = new THREE.ShaderMaterial({ ...base, fragmentShader: FRAG_COMP,
      uniforms: { tDiffuse: { value: null }, tDoF: { value: null }, uDebug: { value: 0 }, tDepth: this.tDepth, uInvProj: this.uInvProj, uDof: this.uDof } });
    this.matFoco = new THREE.ShaderMaterial({ ...base, fragmentShader: FRAG_FOCO,
      uniforms: { tDepth: this.tDepth, uInvProj: this.uInvProj, uDof: this.uDof } });
    this.matCopia = new THREE.ShaderMaterial({ ...base, uniforms: THREE.UniformsUtils.clone(CopyShader.uniforms), fragmentShader: CopyShader.fragmentShader });
    this.fsGather = new FullScreenQuad(this.matGather);
    this.fsComp = new FullScreenQuad(this.matComp);
    this.fsFoco = new FullScreenQuad(this.matFoco);
    this.fsCopia = new FullScreenQuad(this.matCopia);
    this.rtMedio = new THREE.WebGLRenderTarget(hw, hh, { type: tipo, depthBuffer: false, stencilBuffer: false, minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter, generateMipmaps: false });
    this.rtFoco = new THREE.WebGLRenderTarget(1, 1, { type: THREE.UnsignedByteType, depthBuffer: false, stencilBuffer: false, minFilter: THREE.NearestFilter, magFilter: THREE.NearestFilter, generateMipmaps: false });
    this.pixel = new Uint8Array(4);
    this.autoMedir = false;        // medir la distancia del centro cada 4 frames (render en 1, lectura en 3)
    this.medirYa = false;          // medición única pedida por el hook, ejecutada dentro del próximo render
    this.distCentro = null;
    this.frames = 0;
    this._pendiente = false;
  }
  get taps() { return this.matGather.defines.N_TAPS; }
  setTaps(n) {
    n = Math.max(1, Math.min(64, n | 0));
    if (n === this.matGather.defines.N_TAPS) return;
    this.matGather.defines.N_TAPS = n;
    this.matGather.needsUpdate = true;
  }
  setSize(w, h) {
    const hw = Math.max(1, Math.ceil(w / 2)), hh = Math.max(1, Math.ceil(h / 2));
    this.rtMedio.setSize(hw, hh);
    this.matGather.uniforms.uResolution.value.set(hw, hh);
  }
  /**
   * Distancia mediana del centro. Con `tick` (un frame del loop) la medición ocurre DENTRO del pase, justo tras el
   * RenderPass, con la profundidad fresca de ese frame (mismo camino que el autofoco). Sin `tick` mide con la
   * última profundidad conocida (medido 2026-09-02 en M6000 con el composer MSAA ×4: fuera del loop el
   * depthTexture se lee como 0 en todo el cuadro y sale el plano near, 0,503 u; causa no aislada). `null` sin
   * profundidad.
   */
  medir(renderer, tick = null) {
    if (!this.tDepth.value) return null;
    if (typeof tick === 'function') { this.medirYa = true; tick(); this.medirYa = false; return this.distCentro; }
    const prev = renderer.getRenderTarget();
    renderer.setRenderTarget(this.rtFoco);
    this.fsFoco.render(renderer);
    const d = this._leer(renderer);
    renderer.setRenderTarget(prev);
    return d;
  }
  _leer(renderer) {
    const px = this.pixel;
    renderer.readRenderTargetPixels(this.rtFoco, 0, 0, 1, 1, px);
    const v = (px[0] + px[1] / 255 + px[2] / 65025) / 255;
    const d = v * 8192;
    if (Number.isFinite(d) && d > 0) this.distCentro = d;
    return this.distCentro;
  }
  render(renderer, writeBuffer, readBuffer) {
    const debug = this.matComp.uniforms.uDebug.value;
    if (!this.tDepth.value) {                          // sin profundidad no hay CoC: passthrough
      this.matCopia.uniforms.tDiffuse.value = readBuffer.texture;
      renderer.setRenderTarget(this.renderToScreen ? null : writeBuffer);
      if (this.clear) renderer.clear();
      this.fsCopia.render(renderer);
      return;
    }
    if (debug < 0.5) {
      this.matGather.uniforms.tColor.value = readBuffer.texture;
      renderer.setRenderTarget(this.rtMedio);
      this.fsGather.render(renderer);
    }
    // medición pedida por el hook (gate): render + lectura YA, con la profundidad de este frame
    if (this.medirYa) {
      this.medirYa = false; this._pendiente = false;
      renderer.setRenderTarget(this.rtFoco); this.fsFoco.render(renderer);
      try { this._leer(renderer); } catch (e) { /* se conserva la lectura anterior */ }
    }
    // autofoco a la manera de Sylva: render en frame&3==1, lectura dos frames después (menos stall)
    if (this.autoMedir) {
      if ((this.frames & 3) === 1) { renderer.setRenderTarget(this.rtFoco); this.fsFoco.render(renderer); this._pendiente = true; }
      else if (this._pendiente && (this.frames & 3) === 3) { this._pendiente = false; try { this._leer(renderer); } catch (e) { /* se conserva la lectura anterior */ } }
    }
    this.matComp.uniforms.tDiffuse.value = readBuffer.texture;
    this.matComp.uniforms.tDoF.value = this.rtMedio.texture;
    renderer.setRenderTarget(this.renderToScreen ? null : writeBuffer);
    if (this.clear) renderer.clear();
    this.fsComp.render(renderer);
    this.frames++;
  }
  dispose() {
    for (const m of [this.matGather, this.matComp, this.matFoco, this.matCopia]) m.dispose();
    for (const q of [this.fsGather, this.fsComp, this.fsFoco, this.fsCopia]) q.dispose();
    this.rtMedio.dispose(); this.rtFoco.dispose();
  }
}

/** `?dof=1` (+ `dofFoco`, `dofAp`, `dofMax`, `dofN`, `dofAuto`, `dofRot`). Sin `dof=1` → null (el vivo no cambia). */
export function leerParamsDoF(search) {
  const q = new URLSearchParams(search);
  const v = q.get('dof');
  if (v !== '1' && v !== 'on') return null;
  const num = (k, d) => { const x = Number(q.get(k)); return q.get(k) !== null && Number.isFinite(x) ? x : d; };
  const foco = q.get('dofFoco') !== null ? num('dofFoco', 12) : null;
  const rotQ = q.get('dofRot');
  return {
    foco, apertura: q.get('dofAp') !== null ? num('dofAp', 14) : null, maxCoc: num('dofMax', 12), n: num('dofN', 28),
    auto: q.get('dofAuto') !== null ? num('dofAuto', 1) !== 0 : foco === null,
    rot: rotQ === null || rotQ === 'auto' ? 'auto' : num('dofRot', 0),
  };
}

/**
 * Monta el DoF sobre un EffectComposer YA creado (RenderPass primero; el pase lo inserta quien llama) y devuelve
 * el hook `window.__dof`. `preparar(camera)` va justo antes de `composer.render()`: toma el depthTexture del
 * target que va a pintar el RenderPass (lo ata si falta), la inversa de la proyección, la rotación y el autofoco.
 * `aa` es una función que devuelve el hook del TAA (s27) o null: la rotación del kernel se aplica solo con `taa`.
 */
export function crearDoF({ renderer, composer, camera, params, aa = () => null }) {
  const rt1 = composer.renderTarget1;
  const tipoRT = rt1.texture.type === THREE.HalfFloatType ? 'half' : 'byte';
  const pass = new DoFPass({ width: rt1.width, height: rt1.height, tipo: rt1.texture.type, n: params.n });
  const foco0 = params.foco ?? 12;
  const estado = {
    activo: true, foco: foco0, apertura: params.apertura ?? aperturaSylva(foco0), maxCoc: params.maxCoc, auto: !!params.auto,
    rot: params.rot, rotAplicada: 0, frame: 0,
  };
  let prevNow = null, debug = 0, apagados = [], activoAntesDebug = true;

  function asegurarDepth(rt) {
    if (rt.depthTexture) return false;
    rt.depthTexture = rt.__depthTAA || (rt.__depthTAA = new THREE.DepthTexture(rt.width, rt.height, THREE.UnsignedIntType));
    rt.dispose();   // three recrea el framebuffer con el adjunto de profundidad en el siguiente setRenderTarget
    return true;
  }
  function leer() {
    return {
      activo: estado.activo, foco: +estado.foco.toFixed(3), apertura: +estado.apertura.toFixed(3), maxCoc: estado.maxCoc,
      n: pass.taps, auto: estado.auto, rot: estado.rot, rotAplicada: +estado.rotAplicada.toFixed(3),
      distCentro: pass.distCentro == null ? null : +pass.distCentro.toFixed(3), frame: estado.frame,
      depth: !!pass.tDepth.value, tipoRT, resMedia: [pass.rtMedio.width, pass.rtMedio.height], pr: renderer.getPixelRatio(), debug,
      pasos: Object.fromEntries(composer.passes.map((p) => [p.constructor.name + (p === pass ? '(dof)' : ''), p.enabled])),
    };
  }
  function set(on) { estado.activo = !!on; if (!debug) pass.enabled = estado.activo; return leer(); }
  function ajustar(p = {}) {
    if (Number.isFinite(p.foco)) estado.foco = p.foco;
    if (Number.isFinite(p.apertura)) estado.apertura = p.apertura;
    if (Number.isFinite(p.maxCoc)) estado.maxCoc = p.maxCoc;
    if (Number.isFinite(p.n)) pass.setTaps(p.n);
    if (p.rot !== undefined) estado.rot = p.rot === 'auto' ? 'auto' : (p.rot ? 1 : 0);
    return leer();
  }
  function fijarFoco(d) { estado.auto = false; estado.foco = d; estado.apertura = aperturaSylva(d); pass.autoMedir = false; return leer(); }
  function autofoco(on) { estado.auto = !!on; pass.autoMedir = estado.auto; return leer(); }
  function medirFoco() { return pass.medir(renderer, typeof window.__tick === 'function' ? window.__tick : null); }
  function medirFocoDirecto() { return pass.medir(renderer, null); }   // solo diagnóstico (ver nota en `medir`)
  function depurar(modo = 0) {
    modo = modo | 0;
    const idx = composer.passes.indexOf(pass);
    if (modo > 0 && debug === 0) {
      activoAntesDebug = estado.activo;
      apagados = composer.passes.slice(idx + 1).filter((p) => p.enabled);
      for (const p of apagados) p.enabled = false;      // el DoF queda como último pase → pinta CRUDO a pantalla
      pass.enabled = true;
    } else if (modo === 0 && debug > 0) {
      for (const p of apagados) p.enabled = true;
      apagados = [];
      pass.enabled = activoAntesDebug;
    }
    debug = modo;
    pass.matComp.uniforms.uDebug.value = modo;
    return leer();
  }
  function preparar(cam = camera) {
    const rt = composer.readBuffer;                     // el target que va a pintar el RenderPass este frame
    asegurarDepth(rt);
    pass.tDepth.value = rt.depthTexture;
    pass.uInvProj.value.copy(cam.projectionMatrixInverse);
    const now = performance.now();
    const dt = prevNow === null ? 0 : THREE.MathUtils.clamp((now - prevNow) / 1000, 0, 0.1);
    prevNow = now;
    if (estado.auto && pass.distCentro != null) {
      // Sylva acota el objetivo a 400 u (su bosque mide ~300 u); el valle mide kilómetros (la pared de la
      // chorrera está a ~1180 u del encuadre medio) → tope al tamaño del terreno. Medido 2026-09-02: con 900 el
      // foco se quedaba a 270 u de la distancia medida y la apertura ya es la mínima (2,2) de todos modos.
      const objetivo = THREE.MathUtils.clamp(pass.distCentro, 0.5, 4000);
      estado.foco = THREE.MathUtils.lerp(estado.foco, objetivo, 1 - Math.exp(-dt * 2.2));
      estado.apertura = THREE.MathUtils.lerp(estado.apertura, aperturaSylva(objetivo), 1 - Math.exp(-dt * 1.5));
    }
    const a = aa();
    const rotOn = estado.rot === 'auto' ? !!(a && a.modo === 'taa') : !!estado.rot;
    estado.rotAplicada = rotOn ? (estado.frame % 8) * 0.785 : 0;
    pass.uDof.value.set(estado.foco, estado.apertura, estado.maxCoc, estado.rotAplicada);
    estado.frame++;
  }
  pass.autoMedir = estado.auto;

  const hook = {
    pass, get params() { return { ...estado }; },
    set, ajustar, fijarFoco, autofoco, medirFoco, medirFocoDirecto, aperturaSylva, depurar, preparar, asegurarDepth, estado: leer,
    frame: () => { if (typeof window.__tick === 'function') window.__tick(); return leer(); },
    pausar: (on) => { if (typeof window.__loop === 'function') window.__loop(!on); return !on; },
  };
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
// Portado sin G-buffer (profundidad del RenderPass, distancia en espacio de vista) para el valle de Guatoc,
// 2026-09-02 (Sylva s29).
