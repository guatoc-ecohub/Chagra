// ── godRaysSylva.js — rayos filtrados por dosel, opt-in `?rayos=1` ───────────
//
// Implementación propia para el valle: acumulación radial de luminancia del
// cielo hacia el sol proyectado, con una pequeña contribución cálida de disco.
// No se copia código ni shader de una dependencia externa. La atribución MIT
// de Sylva retenida en `lib3d/flora/LICENSE-sylva-MIT` cubre la referencia de
// diseño; este pase es una implementación original y no agrega dependencias.
//
// El pase conserva la profundidad del RenderPass y trabaja sobre un RT privado.
// Así puede convivir con TAA/DoF/horizonte sin cambiar el contrato de sus
// targets. La dosis es deliberadamente baja: debe leerse como luz interrumpida
// por follaje, nunca como niebla opaca.

import * as THREE from 'three';
import { Pass, FullScreenQuad } from 'three/addons/postprocessing/Pass.js';
import { CopyShader } from 'three/addons/shaders/CopyShader.js';

const num = (value, fallback) => {
  if (value === null || value === undefined || value === '') return fallback;
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
};

export function leerParamsRayos(search = globalThis.location?.search ?? '') {
  const q = new URLSearchParams(search);
  const raw = q.get('rayos') ?? q.get('godrays');
  if (raw === null || raw === '0' || raw === 'off' || raw === 'false') return null;
  return {
    densidad: Math.max(0, num(q.get('rayosDensidad'), 0.72)),
    peso: Math.max(0, num(q.get('rayosPeso'), 0.045)),
    decaimiento: Math.min(1, Math.max(0, num(q.get('rayosDecaimiento'), 0.94))),
    umbral: Math.max(0, num(q.get('rayosUmbral'), 0.58)),
    sol: Math.max(0, num(q.get('rayosSol'), 0.22)),
    pasos: Math.max(4, Math.min(16, Math.round(num(q.get('rayosPasos'), 10)))),
    radio: Math.max(0.002, num(q.get('rayosRadio'), 0.06)),
  };
}

const VERT = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = vec4(position.xy, 0.0, 1.0);
  }
`;

const FRAG = /* glsl */ `
  uniform sampler2D tDiffuse;
  uniform sampler2D tDepth;
  uniform vec2 uLightUv;
  uniform vec4 uRay;       // x densidad, y peso, z decaimiento, w umbral
  uniform vec2 uSol;       // x fuerza, y radio del disco
  uniform float uTieneDepth;
  varying vec2 vUv;

  float luminancia(vec3 c) {
    return dot(c, vec3(0.2126, 0.7152, 0.0722));
  }

  void main() {
    vec3 base = texture2D(tDiffuse, vUv).rgb;
    vec2 haciaSol = uLightUv - vUv;
    vec2 paso = haciaSol * (uRay.x / 10.0);
    vec2 uv = vUv;
    float acumulado = 0.0;
    float peso = 1.0;

    // Las muestras viajan hacia el cielo. La profundidad permite discriminar
    // cielo abierto de una superficie iluminada: sólo la abertura del dosel
    // alimenta el volumen, por lo que el efecto conserva dirección y ritmo.
    for (int i = 0; i < RAY_STEPS; i++) {
      uv += paso;
      if (uv.x < 0.0 || uv.x > 1.0 || uv.y < 0.0 || uv.y > 1.0) break;
      vec3 muestra = texture2D(tDiffuse, uv).rgb;
      float d = uTieneDepth > 0.5 ? texture2D(tDepth, uv).r : 1.0;
      float abertura = uTieneDepth > 0.5 ? smoothstep(0.994, 0.9998, d) : 1.0;
      float brillo = smoothstep(uRay.w, uRay.w + 0.42, luminancia(muestra));
      acumulado += brillo * abertura * peso;
      peso *= uRay.z;
    }
    acumulado /= float(RAY_STEPS);

    // Disco cálido muy suave: evita que el rayo desaparezca cuando la
    // exposición deja el sol bajo el umbral, pero no dibuja una mancha sólida.
    float sd = distance(vUv, uLightUv);
    float disco = exp(-sd * sd / max(uSol.y * uSol.y, 0.00001));
    vec3 calidez = vec3(1.0, 0.62, 0.24) * disco * uSol.x;
    float forma = smoothstep(0.0, 0.92, 1.0 - length(vUv - 0.5) * 0.72);
    vec3 rayos = (vec3(1.0, 0.66, 0.30) * acumulado * 0.90 + calidez) * uRay.y * forma;
    gl_FragColor = vec4(base + rayos, 1.0);
  }
`;

class GodRaysPass extends Pass {
  constructor({ width = 2, height = 2, tipo = THREE.HalfFloatType, pasos = 10 } = {}) {
    super();
    this.needsSwap = false;
    this.pasos = pasos;
    this.material = new THREE.ShaderMaterial({
      uniforms: {
        tDiffuse: { value: null },
        tDepth: { value: null },
        uLightUv: { value: new THREE.Vector2(0.5, 0.75) },
        uRay: { value: new THREE.Vector4(0.72, 0.045, 0.94, 0.58) },
        uSol: { value: new THREE.Vector2(0.22, 0.06) },
        uTieneDepth: { value: 0 },
      },
      vertexShader: VERT,
      fragmentShader: FRAG,
      defines: { RAY_STEPS: pasos },
      depthTest: false,
      depthWrite: false,
      toneMapped: false,
    });
    this.fsQuad = new FullScreenQuad(this.material);
    this.copyMaterial = new THREE.ShaderMaterial({
      uniforms: THREE.UniformsUtils.clone(CopyShader.uniforms),
      vertexShader: CopyShader.vertexShader,
      fragmentShader: CopyShader.fragmentShader,
      depthTest: false,
      depthWrite: false,
      toneMapped: false,
    });
    this.fsCopy = new FullScreenQuad(this.copyMaterial);
    this.rt = new THREE.WebGLRenderTarget(width, height, {
      type: tipo,
      depthBuffer: false,
      stencilBuffer: false,
      minFilter: THREE.LinearFilter,
      magFilter: THREE.LinearFilter,
      generateMipmaps: false,
    });
  }

  setSize(width, height) { this.rt.setSize(width, height); }

  render(renderer, writeBuffer, readBuffer) {
    const u = this.material.uniforms;
    u.tDiffuse.value = readBuffer.texture;
    u.tDepth.value = readBuffer.depthTexture || null;
    u.uTieneDepth.value = readBuffer.depthTexture ? 1 : 0;
    renderer.setRenderTarget(this.rt);
    this.fsQuad.render(renderer);
    this.copyMaterial.uniforms.tDiffuse.value = this.rt.texture;
    renderer.setRenderTarget(readBuffer);
    const autoClear = renderer.autoClear;
    renderer.autoClear = false;
    this.fsCopy.render(renderer);
    renderer.autoClear = autoClear;
  }

  dispose() {
    this.material.dispose();
    this.copyMaterial.dispose();
    this.fsQuad.dispose();
    this.fsCopy.dispose();
    this.rt.dispose();
  }
}

export function crearRayosDosel({ renderer, composer, camera, sun, params }) {
  const rt = composer.renderTarget1;
  const pass = new GodRaysPass({ width: rt.width, height: rt.height, tipo: rt.texture.type, pasos: params.pasos });
  const u = pass.material.uniforms;
  const estado = {
    activo: true,
    densidad: params.densidad,
    peso: params.peso,
    decaimiento: params.decaimiento,
    umbral: params.umbral,
    sol: params.sol,
    pasos: params.pasos,
    radio: params.radio,
    enCuadro: false,
    fuente: 'sin-fuente',
    profundidad: false,
    frame: 0,
  };
  const puntoSol = new THREE.Vector3();
  const ndc = new THREE.Vector3();

  function asegurarDepth(target) {
    if (target.depthTexture) return false;
    target.depthTexture = target.__depthRayos || (target.__depthRayos = new THREE.DepthTexture(target.width, target.height, THREE.UnsignedIntType));
    target.dispose();
    return true;
  }

  function subirUniforms() {
    u.uRay.value.set(estado.densidad, estado.peso, estado.decaimiento, estado.umbral);
    u.uSol.value.set(estado.sol, estado.radio);
  }
  subirUniforms();

  function leer() {
    return {
      ...estado,
      pass: pass.enabled,
      profundidad: !!u.tDepth.value,
      pr: renderer.getPixelRatio(),
    };
  }

  function preparar(cam = camera) {
    const target = composer.readBuffer;
    asegurarDepth(target);
    u.tDepth.value = target.depthTexture || null;
    cam.updateMatrixWorld();
    const direccion = sun?.material?.uniforms?.sunPosition?.value || sun;
    if (!direccion) return leer();
    puntoSol.copy(direccion).normalize().multiplyScalar(1200).add(cam.position);
    ndc.copy(puntoSol).project(cam);
    const visible = ndc.z > -1 && ndc.z < 1 && ndc.x > -1.25 && ndc.x < 1.25 && ndc.y > -1.25 && ndc.y < 1.25;
    // El sol de amanecer está detrás del mirador en el cuadro oficial. La luz
    // que entra por el borde superior sigue siendo una fuente válida de rayos,
    // pero se declara como tal: no se reporta como disco solar visible.
    const fuenteBorde = !visible;
    estado.enCuadro = visible;
    estado.fuente = visible ? 'sol-visible' : fuenteBorde ? 'borde-cielo' : 'sin-fuente';
    pass.enabled = estado.activo && (visible || fuenteBorde);
    if (visible) {
      u.uLightUv.value.set(ndc.x * 0.5 + 0.5, ndc.y * 0.5 + 0.5);
    } else {
      u.uLightUv.value.set(0.78, 0.12);
    }
    estado.frame++;
    return leer();
  }

  function set(activo) {
    estado.activo = !!activo;
    pass.enabled = estado.activo && estado.enCuadro;
    return leer();
  }

  function ajustar(next = {}) {
    for (const key of ['densidad', 'peso', 'decaimiento', 'umbral', 'sol', 'radio']) {
      if (Number.isFinite(next[key])) estado[key] = next[key];
    }
    if (Number.isFinite(next.pasos)) estado.pasos = Math.max(4, Math.min(16, Math.round(next.pasos)));
    subirUniforms();
    return leer();
  }

  return { pass, preparar, set, ajustar, estado: leer };
}
