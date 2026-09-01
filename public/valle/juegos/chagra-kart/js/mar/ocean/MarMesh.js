// ── MarMesh.js — superficie del mar para chagra-mar-kart ────────────────────
// Grilla proyectada en screen-space: cada vértice es un rayo de vista
// intersectado con el mar ESFÉRICO, así la densidad de triángulos es uniforme
// en píxeles y la malla termina exactamente en el horizonte geométrico real
// (horizonte nítido y quieto = referencia anti-mareo).
//
// El esqueleto del vertex shader (grilla proyectada, seaHit con forma
// Citardauq, anillo de falda, footprint por celdas vecinas, horizonFade) está
// Implementación oceánica vendorizada para el mundo MAR. Se desacopló de su
// atmósfera, clima y
// desastres; el sombreado del fragment es propio (cielo procedural compartido
// con cielo.js, GGX de sol, scatter turquesa, espuma de las cascadas FFT).

import * as THREE from 'three';
import { SWELL_GLSL } from './SwellGLSL.js';
import { SKY_GLSL } from '../cielo.js';

function buildProjectedGrid(nx, ny) {
  const vertCount = (nx + 1) * (ny + 1);
  const grid = new Float32Array(vertCount * 2);
  let o = 0;
  for (let j = 0; j <= ny; j++) {
    for (let i = 0; i <= nx; i++) {
      grid[o++] = i / nx;
      grid[o++] = j / ny;
    }
  }
  const idx = new Uint32Array(nx * ny * 6);
  let k = 0;
  for (let j = 0; j < ny; j++) {
    for (let i = 0; i < nx; i++) {
      const a = j * (nx + 1) + i;
      const b = a + 1;
      const c = a + (nx + 1);
      const d = c + 1;
      idx[k++] = a; idx[k++] = c; idx[k++] = d;
      idx[k++] = a; idx[k++] = d; idx[k++] = b;
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('aGrid', new THREE.BufferAttribute(grid, 2));
  g.setIndex(new THREE.BufferAttribute(idx, 1));
  g.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 1e9);
  return g;
}

// uniforms de las cascadas (los llena oceanFFT.bind()) + muestreo con LOD
const OCEAN_GLSL = /* glsl */ `
uniform sampler2D uOceanDisp0, uOceanDisp1, uOceanDisp2;
uniform sampler2D uOceanDeriv0, uOceanDeriv1, uOceanDeriv2;
uniform sampler2D uOceanTurb0, uOceanTurb1, uOceanTurb2;
uniform vec3 uOceanScales;
uniform float uOceanTexels;
uniform float uOceanAniso;

vec3 oceanDisplacementLod(vec2 p, vec3 lods) {
  vec3 d = textureLod(uOceanDisp0, p / uOceanScales.x, lods.x).xyz;
  if (lods.y < 7.5) d += textureLod(uOceanDisp1, p / uOceanScales.y, lods.y).xyz;
  if (lods.z < 7.5) d += textureLod(uOceanDisp2, p / uOceanScales.z, lods.z).xyz;
  return d;
}
`;

const VERT = /* glsl */ `
precision highp float;
precision highp int;
precision highp sampler2D;

in vec2 aGrid;

uniform mat4 projectionMatrix;
uniform mat4 viewMatrix;
uniform mat4 uInvViewProj;
uniform vec3 uCamPos;
uniform float uSeaLevel;
uniform float uRMax;
uniform vec2 uGridSize;
uniform float uGridMargin;
uniform float uSkirt;
uniform float uDisplaceScale;

${OCEAN_GLSL}
${SWELL_GLSL}

out vec3 vWorldPos;
out vec2 vFlatPos;
out float vDist;
out float vWaveY;
out vec2 vSwellSlope;

const float EARTH_R = 6371000.0;

vec3 rayFor(vec2 ndc) {
  vec4 a = uInvViewProj * vec4(ndc, -1.0, 1.0);
  vec4 b = uInvViewProj * vec4(ndc,  1.0, 1.0);
  return normalize(b.xyz / b.w - a.xyz / a.w);
}

/** Rayo de vista contra el mar esférico (parabólico). Forma Citardauq:
 *  con a~1e-8 la resta clásica se cancela a ruido float y agujerea la malla. */
vec2 seaHit(vec3 dir, float eyeHeight) {
  float curv = 1.0 / (2.0 * EARTH_R);
  float a = max((1.0 - dir.y * dir.y) * curv, 1e-14);
  float b = dir.y;
  float c = eyeHeight;
  float disc = b * b - 4.0 * a * c;
  float t = 0.0;
  bool miss = true;
  if (disc >= 0.0) {
    float sq = sqrt(disc);
    float qq = -0.5 * (b + (b >= 0.0 ? sq : -sq));
    float r1 = qq / a;
    float r2 = abs(qq) > 1e-20 ? c / qq : -1.0;
    float lo = min(r1, r2), hi = max(r1, r2);
    t = lo > 0.02 ? lo : hi;
    miss = t <= 0.02;
  }
  if (miss || t > uRMax) {
    // snap al punto tangente azimutal => cae exacto sobre el horizonte
    float rh = sqrt(max(2.0 * EARTH_R * max(abs(c), 0.05), 1.0));
    rh = min(rh, uRMax);
    float horiz = max(length(dir.xz), 1e-5);
    return vec2(rh / horiz, 1.0);
  }
  return vec2(t, 0.0);
}

float earthDrop(vec2 p, vec3 camPos) {
  float r2 = dot(p - camPos.xz, p - camPos.xz);
  return r2 / (2.0 * EARTH_R);
}

void main() {
  // anillo exterior lanzado fuera del frustum: garantiza cobertura del borde
  vec2 cellIdx = aGrid * uGridSize;
  vec2 atMin = step(cellIdx, vec2(0.5));
  vec2 atMax = step(uGridSize - 0.5, cellIdx);
  vec2 ndc = (aGrid * 2.0 - 1.0) * uGridMargin + (atMax - atMin) * uSkirt;
  vec3 dir = rayFor(ndc);

  float eyeHeight = max(uCamPos.y - uSeaLevel, 0.35);
  vec2 hit = seaHit(dir, eyeHeight);
  float t = hit.x;
  float snapped = hit.y;

  vec2 world = uCamPos.xz + dir.xz * t;

  // footprint por celdas vecinas → LOD de las cascadas (anti-facetado)
  vec2 ndcDu = (vec2(aGrid.x + 1.0 / uGridSize.x, aGrid.y) * 2.0 - 1.0) * uGridMargin;
  vec2 ndcDv = (vec2(aGrid.x, aGrid.y + 1.0 / uGridSize.y) * 2.0 - 1.0) * uGridMargin;
  vec3 dirU = rayFor(ndcDu);
  vec3 dirV = rayFor(ndcDv);
  vec2 wu = uCamPos.xz + dirU.xz * seaHit(dirU, eyeHeight).x;
  vec2 wv = uCamPos.xz + dirV.xz * seaHit(dirV, eyeHeight).x;
  float cell = max(max(length(wu - world), length(wv - world)), 0.015);
  vec3 texel = uOceanScales / uOceanTexels;
  vec3 lods = log2(max(vec3(cell) / texel, vec3(1.0)));

  vec3 disp = oceanDisplacementLod(world, lods) * uDisplaceScale;
  disp += swellDisplace(world);

  // el relieve muere JUSTO en el horizonte: silueta limpia, línea quieta
  float horizonFade = 1.0 - snapped * 0.92;
  disp *= horizonFade;

  vec3 wp = vec3(world.x + disp.x, uSeaLevel + disp.y, world.y + disp.z);
  wp.y -= earthDrop(world, uCamPos);

  vWorldPos = wp;
  vFlatPos = world;
  vDist = length(wp - uCamPos);
  vWaveY = disp.y;
  vSwellSlope = swellSlope(world) * horizonFade;

  gl_Position = projectionMatrix * viewMatrix * vec4(wp, 1.0);
}
`;

const FRAG = /* glsl */ `
precision highp float;
precision highp int;
precision highp sampler2D;

uniform vec3 uCamPos;
uniform vec3 uSunDir;
uniform vec3 uSunColor;
uniform float uSunI;
uniform vec3 uSkyAmb;
uniform vec3 uWaterScatter;
uniform vec3 uWaterAbsorb;
uniform float uVientoMS;
uniform float uFoamStrength;
uniform float uExposicion;

${OCEAN_GLSL}
${SKY_GLSL}

in vec3 vWorldPos;
in vec2 vFlatPos;
in float vDist;
in float vWaveY;
in vec2 vSwellSlope;

out vec4 oColor;

const float PI_M = 3.14159265;

float ggxD(float NoH, float a) {
  float a2 = a * a;
  float d = NoH * NoH * (a2 - 1.0) + 1.0;
  return a2 / (PI_M * d * d);
}
float smithG(float NoV, float NoL, float a) {
  float a2 = a * a;
  float gv = NoL * sqrt(NoV * NoV * (1.0 - a2) + a2);
  float gl = NoV * sqrt(NoL * NoL * (1.0 - a2) + a2);
  return 0.5 / max(gv + gl, 1e-5);
}

void main() {
  vec2 q = vFlatPos;
  vec2 ddxq = dFdx(q);
  vec2 ddyq = dFdy(q);

  // ---- normal: derivadas de las 3 cascadas FFT + pendiente del swell
  vec4 d0 = textureGrad(uOceanDeriv0, q / uOceanScales.x, ddxq / uOceanScales.x, ddyq / uOceanScales.x);
  vec4 d1 = textureGrad(uOceanDeriv1, q / uOceanScales.y, ddxq / uOceanScales.y, ddyq / uOceanScales.y);
  vec4 d2 = textureGrad(uOceanDeriv2, q / uOceanScales.z, ddxq / uOceanScales.z, ddyq / uOceanScales.z);
  vec4 dsum = d0 + d1 + d2;
  vec2 slope = vec2(dsum.x / max(1.0 + dsum.z, 0.05), dsum.y / max(1.0 + dsum.w, 0.05));
  slope += vSwellSlope;
  vec3 N = normalize(vec3(-slope.x, 1.0, -slope.y));

  vec3 V = normalize(uCamPos - vWorldPos);
  float NoV = max(dot(N, V), 1e-4);

  // ---- rugosidad: lo que el footprint ya no resuelve se vuelve lobo especular
  float fp = sqrt(length(ddxq) * length(ddyq) + 1e-12);
  float lost = clamp(log2(max(fp / 0.12, 1.0)) / 6.5, 0.0, 1.0);
  float mss = 0.004 + 0.00512 * max(uVientoMS, 0.5);
  float alpha = clamp(sqrt(2.0 * mss * (0.32 + 0.68 * lost)) + 0.010, 0.02, 0.55);

  // ---- espuma de las cascadas, carcomida con ruido (nunca pintura pareja)
  float f0 = textureGrad(uOceanTurb0, q / uOceanScales.x, ddxq / uOceanScales.x, ddyq / uOceanScales.x).r;
  float f1 = textureGrad(uOceanTurb1, q / uOceanScales.y, ddxq / uOceanScales.y, ddyq / uOceanScales.y).r;
  float f2 = textureGrad(uOceanTurb2, q / uOceanScales.z, ddxq / uOceanScales.z, ddyq / uOceanScales.z).r;
  float rawFoam = max(max(f0 * 0.75, f1), f2 * 0.45);
  float fn = fbmC(q * 0.61) * 0.62 + fbmC(q * 0.147 + 31.7) * 0.38;
  float carved = rawFoam * uFoamStrength * (0.18 + fn * 1.45);
  float foam = smoothstep(0.34, 0.72, carved);
  float foamThin = smoothstep(0.17, 0.62, carved) * 0.5;

  vec3 L = normalize(uSunDir);
  float NoL = dot(N, L);
  vec3 sun = uSunColor * uSunI;

  // ---- reflejo: el MISMO cielo procedural, doblado sobre el horizonte
  vec3 R = reflect(-V, N);
  if (R.y < 0.0) R = normalize(vec3(R.x, mix(0.02, 0.30, alpha) - R.y * 0.2, R.z));
  vec3 env = cieloColor(R, L);

  // fresnel de agua (Schlick, templado por rugosidad)
  float F = 0.02 + 0.98 * pow(1.0 - NoV, 5.0);
  F = mix(F, 0.035, alpha * 0.55);

  // ---- especular del sol (GGX)
  vec3 spec = vec3(0.0);
  if (NoL > 0.0) {
    vec3 H = normalize(L + V);
    float NoH = max(dot(N, H), 0.0);
    float VoH = max(dot(V, H), 1e-4);
    float Fs = 0.02 + 0.98 * pow(1.0 - VoH, 5.0);
    spec = sun * ggxD(NoH, alpha) * smithG(NoV, max(NoL, 1e-4), alpha) * Fs * max(NoL, 0.0);
  }

  // ---- cuerpo de agua: scatter turquesa + resplandor de cresta a contraluz
  float backlit = clamp(vWaveY * 0.55 + 0.42, 0.0, 1.4)
                * pow(clamp(dot(L, -V), 0.0, 1.0), 4.0)
                * pow(0.5 - 0.5 * NoL, 3.0);
  vec3 scatter = uWaterScatter * sun * backlit * 3.0;
  scatter += uWaterScatter * (sun * max(L.y, 0.0) * 0.32 + uSkyAmb * 1.05);
  vec3 deep = uWaterAbsorb * uSkyAmb * 0.9;
  vec3 refracted = scatter + deep;

  vec3 color = mix(refracted, env, F) + spec;

  // ---- espuma iluminada (wrap diffuse, sin especular duro)
  if (foam + foamThin > 0.003) {
    float wrapNoL = clamp((NoL + 0.5) / 1.5, 0.0, 1.0);
    vec3 foamLit = vec3(0.93, 0.955, 0.97) * (sun * wrapNoL * 0.16 + uSkyAmb * 1.35);
    color = mix(color, foamLit, clamp(foam, 0.0, 1.0));
    color = mix(color, mix(color, foamLit, 0.22), foamThin * (1.0 - foam));
  }

  // ---- perspectiva aérea hacia el horizonte (bruma, no niebla)
  float fogF = 1.0 - exp(-pow(vDist * 1.35e-4, 1.4));
  vec3 haze = vec3(0.80, 0.865, 0.90) * 1.02;
  color = mix(color, haze, clamp(fogF, 0.0, 1.0));

  // [MAR-REAL] salida LINEAL: el kart renderiza vía EffectComposer y su
  // OutputPass aplica ACES + sRGB al buffer entero. El aces+gamma interno
  // del original (render directo) aquí se duplicaría y lavaría el mar.
  color *= uExposicion;
  oColor = vec4(color, 1.0);
}
`;

export class MarMesh {
  constructor(oceanFFT, swellUniforms, sunDir, opts = {}) {
    this.fft = oceanFFT;
    this.gridX = 0;
    this.gridY = 0;

    const uniforms = {
      uInvViewProj: { value: new THREE.Matrix4() },
      uCamPos: { value: new THREE.Vector3() },
      uSeaLevel: { value: 0 },
      uRMax: { value: 42000.0 },
      uGridSize: { value: new THREE.Vector2(1, 1) },
      uGridMargin: { value: 1.04 },
      uSkirt: { value: 1.1 },
      uDisplaceScale: { value: 1.0 },
      uSunDir: { value: sunDir.clone() },
      uSunColor: { value: new THREE.Vector3(1.0, 0.96, 0.90) },
      uSunI: { value: 2.3 },
      uSkyAmb: { value: new THREE.Vector3(0.34, 0.46, 0.58) },
      uWaterScatter: { value: new THREE.Vector3(0.020, 0.105, 0.115) },
      uWaterAbsorb: { value: new THREE.Vector3(0.004, 0.021, 0.036) },
      uVientoMS: { value: 6.5 },
      uFoamStrength: { value: 1.0 },
      uExposicion: { value: 1.15 },
      ...swellUniforms,
    };
    oceanFFT.bind(uniforms);

    this.uniforms = uniforms;
    this.material = new THREE.RawShaderMaterial({
      name: 'MarSurface',
      glslVersion: THREE.GLSL3,
      vertexShader: VERT,
      fragmentShader: FRAG,
      uniforms,
      side: THREE.DoubleSide,
      transparent: false,
      depthWrite: true,
      depthTest: true,
    });

    this.mesh = new THREE.Mesh(new THREE.BufferGeometry(), this.material);
    this.mesh.frustumCulled = false;
    this.mesh.renderOrder = 0;
    this.setResolution(opts.gridX ?? 224, opts.gridY ?? 128);

    this._vp = new THREE.Matrix4();
  }

  setResolution(gridX, gridY) {
    gridX = Math.max(16, gridX | 0); gridY = Math.max(12, gridY | 0);
    if (this.gridX === gridX && this.gridY === gridY) return;
    this.gridX = gridX; this.gridY = gridY;
    const old = this.mesh.geometry;
    this.mesh.geometry = buildProjectedGrid(gridX, gridY);
    if (old) old.dispose();
    this.uniforms.uGridSize.value.set(gridX, gridY);
  }

  /** Llamar cada frame DESPUÉS de mover la cámara. */
  update(camera) {
    camera.updateMatrixWorld();
    this._vp.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse);
    this.uniforms.uInvViewProj.value.copy(this._vp).invert();
    this.uniforms.uCamPos.value.copy(camera.position);
  }

  dispose() {
    this.mesh.geometry.dispose();
    this.material.dispose();
  }
}
