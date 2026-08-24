/* Burn-away de RiggedActor, patrón MIT de rork-medieval-chess. */
import { Color, Vector2 } from 'three';

export function createDissolveUniforms(opts = {}) {
  return {
    uDissolve: { value: 0 },
    uDissolveEdge: { value: opts.edge ?? 0.06 },
    uDissolveScale: { value: opts.scale ?? 1.6 },
    uDissolveSpan: { value: new Vector2(opts.span?.[0] ?? 0, opts.span?.[1] ?? 2) },
    uDissolveEmber: { value: new Color(opts.ember ?? 0xffa060) },
  };
}

export function installDissolve(material, uniforms, heightBias = 0.85) {
  const bias = Number(heightBias).toFixed(3);
  material.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, uniforms);
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vDissolveP;')
      .replace('#include <project_vertex>', 'vDissolveP = transformed;\n#include <project_vertex>');
    const fragmentCommon = [
      '#include <common>',
      'uniform float uDissolve;',
      'uniform float uDissolveEdge;',
      'uniform float uDissolveScale;',
      'uniform vec2 uDissolveSpan;',
      'uniform vec3 uDissolveEmber;',
      'varying vec3 vDissolveP;',
      'float dissolveNoise(vec3 p) { return fract(sin(dot(floor(p), vec3(127.1, 311.7, 74.7))) * 43758.5453); }',
    ].join('\n');
    const fragmentCut = [
      '#include <clipping_planes_fragment>',
      'float dissolveGlow = 0.0;',
      'if (uDissolve > 0.001) {',
      '  vec3 p = vDissolveP * uDissolveScale;',
      '  float noise = dissolveNoise(p) * 0.65 + dissolveNoise(p * 2.7 + 11.3) * 0.35;',
      '  float height = clamp((vDissolveP.y - uDissolveSpan.x) / max(uDissolveSpan.y, 0.0001), 0.0, 1.0);',
      `  float mask = mix(noise, noise * 0.45 + height * 0.55, ${bias});`,
      '  float cut = mix(-uDissolveEdge, 1.0 + uDissolveEdge, uDissolve);',
      '  if (mask < cut) discard;',
      '  dissolveGlow = 1.0 - smoothstep(0.0, uDissolveEdge * 1.6, mask - cut);',
      '}',
    ].join('\n');
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', fragmentCommon)
      .replace('#include <clipping_planes_fragment>', fragmentCut)
      .replace('#include <opaque_fragment>', '#include <opaque_fragment>\ngl_FragColor.rgb += uDissolveEmber * dissolveGlow * 3.2;');
  };
  material.customProgramCacheKey = () => `dissolve-${bias}`;
  material.needsUpdate = true;
}
