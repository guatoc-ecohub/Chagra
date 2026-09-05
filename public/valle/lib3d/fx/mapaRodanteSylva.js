// mapaRodanteSylva.js — mapa de suelo horneado que acompaña a la cámara.
//
// Inspirado por la organización de world maps de Sylva / realistic-forest
// (Token-Gremlin, MIT). Este bake y shader son una implementación original;
// el aviso MIT del estudio permanece en ../flora/LICENSE-sylva-MIT.

function fract(v) { return v - Math.floor(v); }

function hash(x, z) {
  return fract(Math.sin(x * 127.1 + z * 311.7) * 43758.5453123);
}

function noise(x, z) {
  const ix = Math.floor(x);
  const iz = Math.floor(z);
  const fx = x - ix;
  const fz = z - iz;
  const sx = fx * fx * (3 - 2 * fx);
  const sz = fz * fz * (3 - 2 * fz);
  const a = hash(ix, iz);
  const b = hash(ix + 1, iz);
  const c = hash(ix, iz + 1);
  const d = hash(ix + 1, iz + 1);
  return (a + (b - a) * sx) * (1 - sz) + (c + (d - c) * sx) * sz;
}

function saturate(v) { return Math.max(0, Math.min(1, v)); }

function trailZ(x) {
  return 10 * Math.sin(x * 0.037) + 6 * Math.sin(x * 0.11 + 0.8) - 2.3;
}

function bake(canvas, originX, originZ, span, resolution) {
  const ctx = canvas.getContext('2d', { alpha: false });
  const pixels = ctx.createImageData(resolution, resolution);
  const data = pixels.data;
  const step = span / resolution;
  for (let py = 0; py < resolution; py++) {
    const z = originZ + (py + 0.5) * step;
    for (let px = 0; px < resolution; px++) {
      const x = originX + (px + 0.5) * step;
      const macro = noise(x * 0.055, z * 0.055);
      const clump = noise(x * 0.22 + 17.3, z * 0.22 - 11.8);
      const grain = noise(x * 1.25, z * 1.25);
      const pale = saturate((macro - 0.64) / 0.26);
      const wet = 1 - saturate(Math.abs(z - trailZ(x)) / 24);
      const detail = (clump - 0.5) * 0.12 + (grain - 0.5) * 0.055;
      let r = 0.115 + (0.188 - 0.115) * (0.42 + macro * 0.40);
      let g = 0.125 + (0.285 - 0.125) * (0.42 + macro * 0.40);
      let b = 0.075 + (0.105 - 0.075) * (0.42 + macro * 0.40);
      r += (0.380 - r) * pale * 0.38;
      g += (0.520 - g) * pale * 0.38;
      b += (0.205 - b) * pale * 0.38;
      r += (0.145 - r) * wet * 0.25;
      g += (0.300 - g) * wet * 0.25;
      b += (0.155 - b) * wet * 0.25;
      const shade = 0.88 + macro * 0.12 + detail;
      const i = (py * resolution + px) * 4;
      data[i] = Math.round(saturate(r * shade) * 255);
      data[i + 1] = Math.round(saturate(g * shade) * 255);
      data[i + 2] = Math.round(saturate(b * shade) * 255);
      data[i + 3] = 255;
    }
  }
  ctx.putImageData(pixels, 0, 0);
}

function snappedOrigin(x, z, span, cell) {
  return {
    x: Math.floor(x / cell) * cell - span * 0.5,
    z: Math.floor(z / cell) * cell - span * 0.5,
  };
}

/**
 * Devuelve un MeshStandardMaterial y su controlador de bake rodante. Cada mapa
 * contiene color absoluto de mundo; al cruzar una celda se hornea el siguiente
 * y se funde con el anterior. Así no hay una textura tiled ni salto visible.
 */
export function crearMapaRodanteSylva(THREE, {
  span = 160,
  resolution = 384,
  cell = 8,
  transitionSeconds = 0.22,
  center = new THREE.Vector2(),
} = {}) {
  const canvasA = document.createElement('canvas');
  const canvasB = document.createElement('canvas');
  canvasA.width = canvasA.height = resolution;
  canvasB.width = canvasB.height = resolution;
  const textureA = new THREE.CanvasTexture(canvasA);
  const textureB = new THREE.CanvasTexture(canvasB);
  for (const texture of [textureA, textureB]) {
    // Los bytes del bake ya contienen albedo lineal, como el shader analítico.
    // Declararlos sRGB los decodificaba una segunda vez y ennegrecía el páramo.
    texture.colorSpace = THREE.LinearSRGBColorSpace;
    texture.generateMipmaps = true;
    texture.minFilter = THREE.LinearMipmapLinearFilter;
    texture.magFilter = THREE.LinearFilter;
    texture.wrapS = texture.wrapT = THREE.ClampToEdgeWrapping;
    texture.anisotropy = 8;
  }

  const initial = snappedOrigin(center.x, center.y, span, cell);
  bake(canvasA, initial.x, initial.z, span, resolution);
  bake(canvasB, initial.x, initial.z, span, resolution);
  textureA.needsUpdate = textureB.needsUpdate = true;

  const uniforms = {
    uGroundBakeA: { value: textureA },
    uGroundBakeB: { value: textureB },
    uGroundBakeOriginA: { value: new THREE.Vector2(initial.x, initial.z) },
    uGroundBakeOriginB: { value: new THREE.Vector2(initial.x, initial.z) },
    uGroundBakeSpan: { value: span },
    uGroundBakeMix: { value: 0 },
  };
  let currentTexture = textureA;
  let spareTexture = textureB;
  let currentCanvas = canvasA;
  let spareCanvas = canvasB;
  const currentOrigin = new THREE.Vector2(initial.x, initial.z);
  const nextOrigin = new THREE.Vector2(initial.x, initial.z);
  let mixing = false;
  let mix = 0;
  let bakes = 2;

  const material = new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 1, metalness: 0 });
  material.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, uniforms);
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vRollingGroundWorldPosition;')
      .replace('#include <project_vertex>', 'vRollingGroundWorldPosition = (modelMatrix * vec4(transformed, 1.0)).xyz;\n#include <project_vertex>');
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', `#include <common>
varying vec3 vRollingGroundWorldPosition;
uniform sampler2D uGroundBakeA;
uniform sampler2D uGroundBakeB;
uniform vec2 uGroundBakeOriginA;
uniform vec2 uGroundBakeOriginB;
uniform float uGroundBakeSpan;
uniform float uGroundBakeMix;

vec3 sampleRollingBake(sampler2D map, vec2 origin, vec2 xz) {
  vec2 uv = (xz - origin) / uGroundBakeSpan;
  return texture2D(map, clamp(uv, 0.001, 0.999)).rgb;
}`)
      .replace('#include <color_fragment>', `
vec2 rollingXZ = vRollingGroundWorldPosition.xz;
vec2 rollingUvA = (rollingXZ - uGroundBakeOriginA) / uGroundBakeSpan;
float rollingInsideA = step(0.0, rollingUvA.x) * step(0.0, rollingUvA.y) * step(rollingUvA.x, 1.0) * step(rollingUvA.y, 1.0);
vec3 rollingA = sampleRollingBake(uGroundBakeA, uGroundBakeOriginA, rollingXZ);
vec3 rollingColor = rollingA;
// El segundo sample solo existe durante los 0,22 s de recambio: en reposo el
// bake rodante cuesta una lectura de textura, no dos ni el ruido analítico.
if (uGroundBakeMix > 0.0) {
  vec2 rollingUvB = (rollingXZ - uGroundBakeOriginB) / uGroundBakeSpan;
  float rollingInsideB = step(0.0, rollingUvB.x) * step(0.0, rollingUvB.y) * step(rollingUvB.x, 1.0) * step(rollingUvB.y, 1.0);
  vec3 rollingB = sampleRollingBake(uGroundBakeB, uGroundBakeOriginB, rollingXZ);
  // El mapa más nuevo manda fuera del borde compartido; dentro, el fundido es suave.
  rollingColor = mix(rollingA, rollingB, uGroundBakeMix * rollingInsideB);
  rollingColor = mix(rollingB, rollingColor, rollingInsideA + rollingInsideB * (1.0 - rollingInsideA));
}
diffuseColor.rgb *= rollingColor;`);
  };
  material.customProgramCacheKey = () => 'ground-rolling-map-sylva-v1';
  material.userData.ground = 'rolling-bake-xz';

  function queue(x, z) {
    const wanted = snappedOrigin(x, z, span, cell);
    if (mixing || (wanted.x === currentOrigin.x && wanted.z === currentOrigin.y)) return false;
    nextOrigin.set(wanted.x, wanted.z);
    bake(spareCanvas, wanted.x, wanted.z, span, resolution);
    spareTexture.needsUpdate = true;
    uniforms.uGroundBakeB.value = spareTexture;
    uniforms.uGroundBakeOriginB.value.copy(nextOrigin);
    uniforms.uGroundBakeMix.value = 0;
    mixing = true;
    mix = 0;
    bakes++;
    return true;
  }

  function advance(dt) {
    if (!mixing) return;
    mix = Math.min(1, mix + dt / transitionSeconds);
    uniforms.uGroundBakeMix.value = mix;
    if (mix < 1) return;
    currentOrigin.copy(nextOrigin);
    [currentTexture, spareTexture] = [spareTexture, currentTexture];
    [currentCanvas, spareCanvas] = [spareCanvas, currentCanvas];
    uniforms.uGroundBakeA.value = currentTexture;
    uniforms.uGroundBakeOriginA.value.copy(currentOrigin);
    uniforms.uGroundBakeB.value = spareTexture;
    uniforms.uGroundBakeOriginB.value.copy(currentOrigin);
    uniforms.uGroundBakeMix.value = 0;
    mixing = false;
  }

  return {
    material,
    update: queue,
    advance,
    state: () => ({ span, resolution, cell, bakes, mixing, origin: [currentOrigin.x, currentOrigin.y] }),
    dispose: () => { textureA.dispose(); textureB.dispose(); material.dispose(); },
  };
}
