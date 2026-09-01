// ── cielo.js — cielo tropical procedural + función compartida con el agua ───
// cieloColor(dir, sunDir) es LA MISMA función en el domo y en el reflejo del
// mar: lo que el agua espeja es exactamente el cielo que se ve. Sin env-map,
// sin texturas: gradiente + sol + cúmulos de alisios (fbm barato). Horizonte
// nítido y estable — la referencia visual que el anti-mareo exige.

import * as THREE from 'three';

export const SKY_GLSL = /* glsl */ `
float hashC(vec2 p) {
  vec3 p3 = fract(vec3(p.xyx) * 0.1031);
  p3 += dot(p3, p3.yzx + 33.33);
  return fract((p3.x + p3.y) * p3.z);
}
float vnoise(vec2 p) {
  vec2 i = floor(p), f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(hashC(i), hashC(i + vec2(1, 0)), u.x),
             mix(hashC(i + vec2(0, 1)), hashC(i + vec2(1, 1)), u.x), u.y);
}
float fbmC(vec2 p) {
  float v = 0.0, a = 0.55;
  for (int i = 0; i < 4; i++) { v += a * vnoise(p); p = p * 2.13 + 17.7; a *= 0.5; }
  return v;
}

// Cielo caribeño de media mañana. dir normalizado, sunDir normalizado.
vec3 cieloColor(vec3 dir, vec3 sunDir) {
  float h = clamp(dir.y, -1.0, 1.0);
  vec3 zenit = vec3(0.145, 0.34, 0.63);
  vec3 medio = vec3(0.40, 0.62, 0.82);
  vec3 horiz = vec3(0.82, 0.88, 0.915);
  vec3 col = mix(medio, zenit, pow(clamp(h, 0.0, 1.0), 0.75));
  col = mix(horiz, col, smoothstep(0.0, 0.32, h));

  // bruma cálida alrededor del sol, pegada al horizonte
  float cosS = clamp(dot(dir, sunDir), 0.0, 1.0);
  col += vec3(1.0, 0.82, 0.55) * pow(cosS, 7.0) * 0.10 * (1.0 - clamp(h, 0.0, 1.0));

  // cúmulos de alisios: banda baja (0.03 < y < 0.38), quietos (referencia fija)
  if (h > 0.015 && h < 0.55) {
    vec2 uv = dir.xz / max(dir.y + 0.14, 0.05);
    float n = fbmC(uv * 1.35 + vec2(7.3, -2.1));
    float franja = smoothstep(0.03, 0.10, h) * (1.0 - smoothstep(0.30, 0.52, h));
    float nube = smoothstep(0.585, 0.75, n) * franja;
    float sombra = smoothstep(0.585, 0.92, n);
    vec3 colNube = mix(vec3(0.985, 0.985, 0.975), vec3(0.72, 0.76, 0.80), sombra * 0.55);
    // caras al sol un toque doradas
    colNube += vec3(0.06, 0.04, 0.0) * pow(cosS, 3.0);
    col = mix(col, colNube, clamp(nube, 0.0, 0.88));
  }

  // disco solar + halo
  col += vec3(1.0, 0.95, 0.86) * pow(cosS, 1400.0) * 32.0;
  col += vec3(1.0, 0.90, 0.72) * pow(cosS, 48.0) * 0.35;

  // bajo el horizonte (solo lo ve el reflejo): agua lejana azulada
  col = mix(vec3(0.30, 0.46, 0.55), col, smoothstep(-0.10, 0.005, h));
  return col;
}

vec3 acesTone(vec3 x) {
  return clamp((x * (2.51 * x + 0.03)) / (x * (2.43 * x + 0.59) + 0.14), 0.0, 1.0);
}
`;

const VERT = /* glsl */ `
precision highp float;
in vec3 position;
uniform mat4 projectionMatrix;
uniform mat4 modelViewMatrix;
out vec3 vDir;
void main() {
  vDir = position;
  vec4 p = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  gl_Position = p.xyww;   // profundidad = far: el domo siempre detrás de todo
}
`;

const FRAG = /* glsl */ `
precision highp float;
uniform vec3 uSunDir;
uniform float uExposicion;
${SKY_GLSL}
in vec3 vDir;
out vec4 oColor;
void main() {
  // [MAR-REAL] salida LINEAL: el OutputPass del composer del kart aplica
  // ACES + sRGB; el aces+gamma interno del original se duplicaría aquí.
  vec3 col = cieloColor(normalize(vDir), uSunDir) * uExposicion;
  oColor = vec4(col, 1.0);
}
`;

export function crearCielo(sunDir) {
  const uniforms = {
    uSunDir: { value: sunDir.clone() },
    uExposicion: { value: 1.15 },
  };
  const mat = new THREE.RawShaderMaterial({
    name: 'CieloMar',
    glslVersion: THREE.GLSL3,
    vertexShader: VERT,
    fragmentShader: FRAG,
    uniforms,
    side: THREE.BackSide,
    depthWrite: false,
    depthTest: true,
  });
  const mesh = new THREE.Mesh(new THREE.SphereGeometry(60000, 48, 24), mat);
  mesh.frustumCulled = false;
  mesh.renderOrder = -10;
  return { mesh, uniforms };
}
