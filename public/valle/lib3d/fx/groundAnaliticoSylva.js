// groundAnaliticoSylva.js — suelo continuo evaluado en coordenadas de mundo XZ.
//
// La idea de un ground analítico viene de Sylva / realistic-forest
// (Token-Gremlin, MIT). La implementación GLSL de este archivo es original;
// el aviso MIT completo del estudio se conserva en ../flora/LICENSE-sylva-MIT.

/**
 * Material estándar sin mapa raster: el albedo se evalúa por posición XZ.
 * La malla puede cambiar de teselado sin que aparezcan costuras ni cambie el
 * patrón; la senda usa la misma ecuación que terrainHeight() del paisaje.
 */
export function crearMaterialTerrenoAnalitico(THREE) {
  const material = new THREE.MeshStandardMaterial({
    color: '#ffffff',
    roughness: 1,
    metalness: 0,
  });

  material.onBeforeCompile = (shader) => {
    shader.vertexShader = shader.vertexShader
      .replace(
        '#include <common>',
        '#include <common>\nvarying vec3 vGroundWorldPosition;'
      )
      .replace(
        '#include <project_vertex>',
        'vGroundWorldPosition = (modelMatrix * vec4(transformed, 1.0)).xyz;\n#include <project_vertex>'
      );

    shader.fragmentShader = shader.fragmentShader
      .replace(
        '#include <common>',
        `#include <common>
varying vec3 vGroundWorldPosition;

float groundHash(vec2 p) {
  p = fract(p * vec2(0.1031, 0.11369));
  p += dot(p, p.yx + 19.19);
  return fract((p.x + p.y) * p.x);
}

float groundNoise(vec2 p) {
  vec2 cell = floor(p);
  vec2 local = fract(p);
  local = local * local * (3.0 - 2.0 * local);
  float a = groundHash(cell);
  float b = groundHash(cell + vec2(1.0, 0.0));
  float c = groundHash(cell + vec2(0.0, 1.0));
  float d = groundHash(cell + vec2(1.0, 1.0));
  return mix(mix(a, b, local.x), mix(c, d, local.x), local.y);
}

vec3 groundAlbedo(vec2 xz) {
  // Corresponde a trailZ(x) del relieve CPU: misma coordenada, sin UVs.
  float trail = 10.0 * sin(xz.x * 0.037) + 6.0 * sin(xz.x * 0.11 + 0.8) - 2.3;
  float wet = 1.0 - smoothstep(0.0, 24.0, abs(xz.y - trail));
  // Una sola banda suave: evita tanto los bloques de una textura tiled como
  // el coste de varias octavas por píxel en el plano amplio.
  float macro = groundNoise(xz * 0.055);
  float pale = smoothstep(0.64, 0.9, macro);
  vec3 soil = vec3(0.115, 0.125, 0.075);
  vec3 moss = vec3(0.188, 0.285, 0.105);
  vec3 leaf = vec3(0.380, 0.520, 0.205);
  vec3 wetTone = vec3(0.145, 0.300, 0.155);
  vec3 color = mix(soil, moss, 0.42 + macro * 0.40);
  color = mix(color, leaf, pale * 0.38);
  color = mix(color, wetTone, wet * 0.25);
  return color * (0.88 + macro * 0.12);
}`
      )
      .replace(
        '#include <color_fragment>',
        'diffuseColor.rgb *= groundAlbedo(vGroundWorldPosition.xz);'
      );
  };
  material.customProgramCacheKey = () => 'ground-analitico-sylva-xz-v1';
  material.userData.ground = 'analitico-xz';
  return material;
}
