// ── horizonteSylva.js — niebla de horizonte con depth-fade (Sylva s45) ────────
//
// Port de `src/shaders/volumetrics.js::fogCompositeFragment` + `settings.aerial`
// de `src/core/RenderPipeline.js` de Sylva (github.com/Token-Gremlin/realistic-forest
// — MIT License, Copyright (c) 2026 Token Gremlin; el notice completo va al pie).
// En Sylva cada píxel que NO es cielo (`depth < 0.999999`) reconstruye su posición
// de mundo, tira el rayo cámara→punto por el MISMO modelo de scattering del cielo
// (8 pasos Rayleigh+Mie) y mezcla `col = col·mix(1, tr, aerial) + rad·3.15·aerial`
// (aerial = 0,48). El cielo no se toca: ya trae la atmósfera. Eso es lo que hace
// que lo lejano se FUNDA con el cielo de su propia dirección en vez de aplastarse
// contra un gris uniforme (el FogExp2 clásico): la profundidad se lee como aire.
//
// Port al valle (forward r160, destino Mali-G78):
//   · La marcha se reemplaza por la integral CERRADA de una capa exponencial por
//     altura (misma integral que s18): D(y) = D·exp(−(y−y0)/H),
//     τ = D0·(1−exp(−e·t))/e con e = rd.y/H (→ D0·t si rd.y→0). Mirar bajo mete
//     el rayo en aire más denso: el horizonte acumula más que la cresta.
//   · Transmitancia espectral tr = exp(−τ·β), β = mix(1, (0,75, 0,88, 1), tinte):
//     lo lejano conserva el rojo directo y gana el azul del cielo (Rayleigh).
//   · In-scatter = cielo(rd)·(1−tr) + solColor·sol·HG(μ, 0,55)·(1−exp(−τ)).
//   · `cielo(rd)` es el cielo REAL del valle: el `Sky` de three (uniforms vivos:
//     sol, turbidez, noche, clima) se renderiza a un cubemap chico con CubeCamera
//     cada `cada` frames (a un render target three no aplica tonemapping ni sRGB
//     → lineal, igual que el target del RenderPass) y el pase lo muestrea con
//     `textureCube(rd)` (cube RT: sin flip, `flipEnvMap = 1` en three).
//   · El pase es PARITY-NEUTRAL como el TAAPass de s27: pinta en un RT propio y
//     COPIA al `readBuffer` sin swap y con `autoClear=false`, para no borrar la
//     profundidad del target del RenderPass ni cambiar quién escribe dónde. Así
//     el TAA (s27) y el DoF (s29), que muestrean esa profundidad, siguen sin
//     bucle de retroalimentación (GL 1282 y cuadro negro en Mali, medido 2026-09-02).
//   · Va en el índice 1 del composer, tras el RenderPass y ANTES del TAA/DoF:
//     el orden de Sylva (fog → TAA → bloom → DoF).
//
// Opt-in por página (`?horizonte=1`); sin llamar `crearHorizonte` nada cambia.
// Contrato del hook `window.__horizonte` en
// Chagra-strategy/ops/specs/2026-09-02-sylva-s45-horizonte/spec.md.

import * as THREE from 'three';
import { Pass, FullScreenQuad } from 'three/addons/postprocessing/Pass.js';
import { CopyShader } from 'three/addons/shaders/CopyShader.js';

// null/undefined/'' = ausente → default (Number(null) es 0, NO un valor pedido)
const num = (v, def) => {
  if (v === null || v === undefined || v === '') return def;
  const n = Number(v);
  return Number.isFinite(n) ? n : def;
};

/**
 * Lee los parámetros de la URL. `?horizonte=1` enciende (opt-in). Devuelve null si
 * no está pedido (= baseline intacto).
 */
export function leerParamsHorizonte(search = globalThis.location?.search ?? '') {
  const q = new URLSearchParams(search);
  const on = q.get('horizonte');
  if (on === null || on === '0' || on === 'off' || on === 'false') return null;
  return {
    K: num(q.get('horizonteK'), 0.48),          // cantidad (Sylva: settings.aerial = 0,48)
    D: num(q.get('horizonteD'), 0.00008),       // extinción por unidad de escena a la cota y0 (medido 2026-09-02: 0,0004 lava el plano medio +38 L;
                                                //  6e-5…9e-5 deja CERCA en +1 L y MEDIO en +13…+18 L; el in-scatter usa el cielo HDR, por eso D tan bajo)
    H: num(q.get('horizonteH'), 1000),          // altura de escala (u; 1000 u ≈ 1,7 km): con 350 la cresta (y≈341) queda en aire fino y LEJOS no
                                                //  recibe más que MEDIO; con 1000 manda la distancia sin perder la capa baja
    y0: num(q.get('horizonteY'), -75),          // cota base (piso del cañón, como s18)
    tinte: num(q.get('horizonteTinte'), 0.6),   // 0 = neutro, 1 = Rayleigh pleno
    sol: num(q.get('horizonteSol'), 0.25),      // lóbulo HG del sol en el in-scatter
    cielo: q.get('horizonteCielo') === '0' ? 0 : 1,   // 0 = objetivo uniforme (fog.color) — control
    lejos: num(q.get('horizonteLejos'), 4000),  // tope de distancia (tamaño del terreno)
    cada: num(q.get('horizonteCada'), 30),      // frames entre re-renders del cubo (0 = una vez)
    cubo: num(q.get('horizonteCubo'), 64),      // lado del cubemap del cielo (px)
  };
}

const VERT = /* glsl */`
  varying vec2 vUv;
  void main() { vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }
`;

// Sin `precision` manual: three la prefija (highp) y un mediump a mano rompe el
// link en NVIDIA sin pageerror (memoria shader-precision-uniforme-cruzada).
const FRAG = /* glsl */`
  uniform sampler2D tDiffuse;
  uniform sampler2D tDepth;
  uniform samplerCube tCielo;
  uniform mat4 uInvProj;
  uniform mat3 uCamRot;
  uniform float uCamY;
  uniform vec3 uSol;
  uniform vec3 uSolColor;
  uniform vec3 uFogColor;
  uniform vec4 uNiebla;   // x D, y H, z y0, w K
  uniform vec4 uMezcla;   // x tinte, y sol, z cielo (0/1), w lejos
  uniform float uDebug;
  varying vec2 vUv;

  float hg(float mu, float g) {
    float g2 = g * g;
    return (1.0 - g2) / (12.566370614 * pow(max(1.0 + g2 - 2.0 * g * mu, 1e-4), 1.5));
  }

  void main() {
    vec3 col = texture2D(tDiffuse, vUv).rgb;
    float d = texture2D(tDepth, vUv).r;
    bool cielo = d >= 0.999999;
    // posición en espacio de VISTA desde la profundidad (misma reconstrucción que s29)
    vec4 p = uInvProj * vec4(vUv * 2.0 - 1.0, d * 2.0 - 1.0, 1.0);
    vec3 pv = p.xyz / p.w;
    float dist = length(pv);
    vec3 rd = normalize(uCamRot * pv);          // rayo en MUNDO, unitario
    float t = min(dist, uMezcla.w);
    // integral cerrada de la capa exponencial por altura (Sylva s18)
    float e = rd.y / uNiebla.y;
    float D0 = uNiebla.x * exp(clamp(-(uCamY - uNiebla.z) / uNiebla.y, -30.0, 30.0));
    float tau = (abs(e) > 1e-6) ? D0 * (1.0 - exp(clamp(-e * t, -60.0, 60.0))) / e : D0 * t;
    tau = max(tau, 0.0);
    vec3 beta = mix(vec3(1.0), vec3(0.75, 0.88, 1.0), uMezcla.x);
    vec3 tr = exp(-tau * beta);
    vec3 cieloDir = uMezcla.z > 0.5 ? textureCube(tCielo, rd).rgb : uFogColor;
    float ph = hg(dot(rd, uSol), 0.55);
    vec3 ins = cieloDir * (1.0 - tr) + uSolColor * uMezcla.y * ph * (1.0 - exp(-tau));
    vec3 res = cielo ? col : col * mix(vec3(1.0), tr, uNiebla.w) + ins * uNiebla.w;
    if (uDebug > 2.5) { gl_FragColor = vec4(textureCube(tCielo, rd).rgb, 1.0); return; }   // cubo en todo el cuadro
    if (uDebug > 1.5) { gl_FragColor = vec4(vec3(cielo ? 1.0 : dot(tr, vec3(1.0 / 3.0))), 1.0); return; }   // transmitancia
    if (uDebug > 0.5) {   // código de distancia: g = log2(1+dist)/log2(1+lejos), cielo = 1
      float g = cielo ? 1.0 : min(log2(1.0 + dist) / log2(1.0 + uMezcla.w), 0.98);
      gl_FragColor = vec4(vec3(g), 1.0); return;
    }
    gl_FragColor = vec4(res, 1.0);
  }
`;

export class HorizontePass extends Pass {
  constructor({ width = 2, height = 2, tipo = THREE.HalfFloatType } = {}) {
    super();
    this.needsSwap = false;   // parity-neutral: ver cabecera
    this.material = new THREE.ShaderMaterial({
      uniforms: {
        tDiffuse: { value: null }, tDepth: { value: null }, tCielo: { value: null },
        uInvProj: { value: new THREE.Matrix4() }, uCamRot: { value: new THREE.Matrix3() }, uCamY: { value: 0 },
        uSol: { value: new THREE.Vector3(0, 1, 0) }, uSolColor: { value: new THREE.Vector3(1, 0.9, 0.8) },
        uFogColor: { value: new THREE.Vector3(0.5, 0.5, 0.5) },
        uNiebla: { value: new THREE.Vector4(0.00008, 1000, -75, 0.48) },
        uMezcla: { value: new THREE.Vector4(0.6, 0.25, 1, 4000) },
        uDebug: { value: 0 },
      },
      vertexShader: VERT, fragmentShader: FRAG, depthTest: false, depthWrite: false,
    });
    this.fsQuad = new FullScreenQuad(this.material);
    // La copia al readBuffer: `toneMapped:false` para que nunca tonemapee (a un RT three tampoco lo haría).
    this.copyMaterial = new THREE.ShaderMaterial({
      uniforms: THREE.UniformsUtils.clone(CopyShader.uniforms), vertexShader: CopyShader.vertexShader,
      fragmentShader: CopyShader.fragmentShader, depthTest: false, depthWrite: false, toneMapped: false,
    });
    this.fsCopy = new FullScreenQuad(this.copyMaterial);
    this.rt = new THREE.WebGLRenderTarget(width, height, {
      type: tipo, depthBuffer: false, stencilBuffer: false, minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter, generateMipmaps: false,
    });
  }
  setSize(w, h) { this.rt.setSize(w, h); }
  render(renderer, writeBuffer, readBuffer) {
    const u = this.material.uniforms;
    u.tDiffuse.value = readBuffer.texture;
    u.tDepth.value = readBuffer.depthTexture || null;
    if (!u.tDepth.value) {   // sin profundidad no hay rayo: passthrough (el readBuffer ya tiene el color)
      if (this.renderToScreen) { this.copyMaterial.uniforms.tDiffuse.value = readBuffer.texture; renderer.setRenderTarget(null); this.fsCopy.render(renderer); }
      return;
    }
    if (this.renderToScreen) {   // último pase (depuración): pinta CRUDO a pantalla, sin copia ni tonemap
      renderer.setRenderTarget(null);
      this.fsQuad.render(renderer);
      return;
    }
    renderer.setRenderTarget(this.rt);
    this.fsQuad.render(renderer);
    this.copyMaterial.uniforms.tDiffuse.value = this.rt.texture;
    // copia al readBuffer con autoClear apagado: el quad cubre todo el color y NO toca la profundidad del target
    renderer.setRenderTarget(readBuffer);
    const autoClear = renderer.autoClear;
    renderer.autoClear = false;
    this.fsCopy.render(renderer);
    renderer.autoClear = autoClear;
  }
  dispose() { this.material.dispose(); this.copyMaterial.dispose(); this.fsQuad.dispose(); this.fsCopy.dispose(); this.rt.dispose(); }
}

/**
 * Monta el horizonte sobre un EffectComposer YA creado (RenderPass primero; el pase lo inserta quien llama, en el
 * índice 1) y devuelve el hook `window.__horizonte`. `preparar(camera)` va justo antes de `composer.render()`
 * (después de `aa.preparar` y `dof.preparar`): ata la profundidad al target que va a pintar el RenderPass, sube la
 * inversa de la proyección (con el jitter del TAA, como la profundidad), la rotación y la cota de la cámara, el sol,
 * y re-renderiza el cubo del cielo cuando toca.
 *   sky = Mesh `Sky` del valle (atmos.noche.sky) · fog = scene.fog (color del control uniforme) ·
 *   sol = DirectionalLight del sol (atmos.dir) para el color del lóbulo.
 */
export function crearHorizonte({ renderer, composer, camera, params, sky = null, fog = null, sol = null }) {
  const rt1 = composer.renderTarget1;
  const tipo = rt1.texture.type;
  const tipoRT = tipo === THREE.HalfFloatType ? 'half' : 'byte';
  const pass = new HorizontePass({ width: rt1.width, height: rt1.height, tipo });
  const u = pass.material.uniforms;
  const estado = {
    activo: true, K: params.K, D: params.D, H: params.H, y0: params.y0, tinte: params.tinte, sol: params.sol,
    cielo: params.cielo ? 1 : 0, lejos: params.lejos, cada: Math.max(0, params.cada | 0), frame: 0, cubosRender: 0,
  };
  let debug = 0, apagados = [], activoAntesDebug = true;
  const _pos = new THREE.Vector3();

  // ── cubo del cielo: escena privada con un Mesh que COMPARTE geometría y material del Sky (uniforms vivos) ──
  const lado = Math.max(8, Math.min(256, params.cubo | 0));
  const cuboRT = new THREE.WebGLCubeRenderTarget(lado, {
    type: tipo, generateMipmaps: false, minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter, depthBuffer: false,
  });
  const cuboCam = new THREE.CubeCamera(1, 20000, cuboRT);
  const escenaCielo = new THREE.Scene();
  if (sky) {
    const espejo = new THREE.Mesh(sky.geometry, sky.material);
    espejo.scale.copy(sky.scale);
    espejo.frustumCulled = false;
    escenaCielo.add(espejo);
  }
  u.tCielo.value = cuboRT.texture;
  function recubrir() {
    if (!sky) return estado.cubosRender;
    cuboCam.update(renderer, escenaCielo);   // restaura el render target activo al terminar
    estado.cubosRender++;
    return estado.cubosRender;
  }

  function subirUniforms() {
    u.uNiebla.value.set(estado.D, Math.max(estado.H, 1e-3), estado.y0, estado.K);
    u.uMezcla.value.set(estado.tinte, estado.sol, estado.cielo, Math.max(estado.lejos, 1));
  }
  subirUniforms();

  function asegurarDepth(rt) {
    if (rt.depthTexture) return false;
    // misma ranura que TAA (s27) y DoF (s29): un solo DepthTexture por target, compartido
    rt.depthTexture = rt.__depthTAA || (rt.__depthTAA = new THREE.DepthTexture(rt.width, rt.height, THREE.UnsignedIntType));
    rt.dispose();   // three recrea el framebuffer con el adjunto de profundidad en el siguiente setRenderTarget
    return true;
  }
  function leer() {
    return {
      activo: estado.activo, K: estado.K, D: estado.D, H: estado.H, y0: estado.y0, tinte: estado.tinte, sol: estado.sol,
      cielo: estado.cielo, lejos: estado.lejos, cada: estado.cada, cubo: cuboRT.width, frame: estado.frame,
      cubosRender: estado.cubosRender, depth: !!u.tDepth.value, tipoRT, pr: renderer.getPixelRatio(), debug,
      pasos: Object.fromEntries(composer.passes.map((p) => [p.constructor.name + (p === pass ? '(horizonte)' : ''), p.enabled])),
    };
  }
  function set(on) { estado.activo = !!on; if (!debug) pass.enabled = estado.activo; return leer(); }
  function ajustar(p = {}) {
    for (const k of ['K', 'D', 'H', 'y0', 'tinte', 'sol', 'lejos']) if (Number.isFinite(p[k])) estado[k] = p[k];
    if (p.cada !== undefined && Number.isFinite(p.cada)) estado.cada = Math.max(0, p.cada | 0);
    if (p.cielo !== undefined) estado.cielo = p.cielo ? 1 : 0;
    subirUniforms();
    if (estado.cielo && estado.cubosRender === 0) recubrir();
    return leer();
  }
  function depurar(modo = 0) {
    modo = modo | 0;
    const idx = composer.passes.indexOf(pass);
    const apaga = modo === 1 || modo === 2;   // 3 deja la cadena posterior (tonemap+gradeo) encendida
    if (apaga && !apagados.length) {
      apagados = composer.passes.slice(idx + 1).filter((p) => p.enabled);
      for (const p of apagados) p.enabled = false;   // el horizonte queda como último pase → pinta CRUDO a pantalla
    } else if (!apaga && apagados.length) {
      for (const p of apagados) p.enabled = true;
      apagados = [];
    }
    if (modo > 0 && debug === 0) activoAntesDebug = estado.activo;
    pass.enabled = modo > 0 ? true : activoAntesDebug;
    if (modo === 0) estado.activo = activoAntesDebug;
    debug = modo;
    u.uDebug.value = modo;
    return leer();
  }
  function preparar(cam = camera) {
    const rt = composer.readBuffer;                     // el target que va a pintar el RenderPass este frame
    asegurarDepth(rt);
    u.uInvProj.value.copy(cam.projectionMatrixInverse);
    cam.updateMatrixWorld();
    u.uCamRot.value.setFromMatrix4(cam.matrixWorld);
    cam.getWorldPosition(_pos);
    u.uCamY.value = _pos.y;
    if (sky && sky.material.uniforms.sunPosition) u.uSol.value.copy(sky.material.uniforms.sunPosition.value).normalize();
    if (sol) u.uSolColor.value.set(sol.color.r, sol.color.g, sol.color.b).multiplyScalar(sol.intensity);
    if (fog) u.uFogColor.value.set(fog.color.r, fog.color.g, fog.color.b);
    if ((estado.cielo || debug === 3) && (estado.cubosRender === 0 || (estado.cada > 0 && estado.frame % estado.cada === 0))) recubrir();
    estado.frame++;
  }

  const hook = {
    pass, cuboRT, get params() { return { ...estado }; },
    set, ajustar, recubrir, depurar, preparar, asegurarDepth, estado: leer,
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
