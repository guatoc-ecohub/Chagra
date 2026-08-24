import {
  BufferAttribute,
  BufferGeometry,
  Color,
  Group,
  NormalBlending,
  Points,
  ShaderMaterial,
  Vector2,
} from 'three';

const DEFAULTS = Object.freeze({
  count: 18,
  area: { x: [-24, 24], z: [-30, 8] },
  alturaBase: 8,
  alturaVariacion: 2.5,
  tamano: [5, 10],
  opacidad: [0.22, 0.52],
  color: '#dbe8e5',
  sombra: '#9bb8ba',
  densidad: 1,
  viento: { x: 0.7, z: 0.12 },
  velocidad: 1,
  pixelRatio: 1,
  seed: 17,
});

const CLOUD_VERTEX_SHADER = /* glsl */ `
  attribute float aSize;
  attribute float aSeed;
  attribute float aOpacity;
  uniform float uTime;
  uniform float uPixelRatio;
  uniform vec2 uWind;
  uniform float uSpeed;
  varying float vSeed;
  varying float vOpacity;

  void main() {
    vec3 cloudPosition = position;
    float gust = 0.55 + fract(aSeed * 17.13) * 0.75;
    cloudPosition.x += uTime * uWind.x * uSpeed * gust;
    cloudPosition.z += uTime * uWind.y * uSpeed * gust;
    cloudPosition.y += sin(uTime * 0.12 + aSeed * 6.28318) * 0.06;

    vec4 modelViewPosition = modelViewMatrix * vec4(cloudPosition, 1.0);
    gl_Position = projectionMatrix * modelViewPosition;
    gl_PointSize = aSize * uPixelRatio * (300.0 / max(1.0, -modelViewPosition.z));
    vSeed = aSeed;
    vOpacity = aOpacity;
  }
`;

const CLOUD_FRAGMENT_SHADER = /* glsl */ `
  uniform vec3 uColor;
  uniform vec3 uShadow;
  uniform float uOpacity;
  uniform float uDensity;
  varying float vSeed;
  varying float vOpacity;

  float hash21(vec2 p) {
    p = fract(p * vec2(123.34, 456.21));
    p += dot(p, p + 45.32);
    return fract(p.x * p.y);
  }

  float noise2(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    return mix(
      mix(hash21(i), hash21(i + vec2(1.0, 0.0)), f.x),
      mix(hash21(i + vec2(0.0, 1.0)), hash21(i + vec2(1.0)), f.x),
      f.y
    );
  }

  float fbm(vec2 p) {
    float value = 0.0;
    value += noise2(p) * 0.55;
    value += noise2(p * 2.1 + 7.0) * 0.3;
    value += noise2(p * 4.4 - 3.0) * 0.15;
    return value;
  }

  void main() {
    vec2 uv = gl_PointCoord * 2.0 - 1.0;
    float edge = 1.0 - smoothstep(0.68, 1.0, length(uv));
    float lobes = fbm(uv * 2.35 + vec2(vSeed * 11.7, vSeed * 4.3));
    float body = smoothstep(0.2, 0.66, lobes - length(uv) * 0.16);
    float underside = smoothstep(-0.72, 0.14, uv.y);
    float alpha = body * edge * mix(0.66, 1.0, underside) * uOpacity * uDensity * vOpacity;
    if (alpha < 0.012) discard;

    float light = smoothstep(-0.55, 0.72, uv.y) * 0.22 + 0.78;
    vec3 cloudColor = mix(uShadow, uColor, light);
    gl_FragColor = vec4(cloudColor, alpha);
  }
`;

function clamp01(value) {
  return Math.min(1, Math.max(0, Number(value) || 0));
}

function range(value, fallback, min = -Infinity) {
  if (Array.isArray(value)) {
    const a = Number(value[0]);
    const b = Number(value[1]);
    if (Number.isFinite(a) && Number.isFinite(b)) return [Math.max(min, a), Math.max(min, b)];
  }
  const n = Number(value);
  return Number.isFinite(n) ? [Math.max(min, n), Math.max(min, n)] : fallback;
}

function createRng(seed) {
  let state = (Number(seed) || 1) >>> 0;
  return () => {
    state = Math.imul(state ^ (state >>> 16), 0x45d9f3b);
    state = Math.imul(state ^ (state >>> 16), 0x45d9f3b);
    return ((state ^ (state >>> 16)) >>> 0) / 4294967296;
  };
}

function createCloudData(options) {
  const rng = createRng(options.seed);
  const count = options.count;
  const positions = new Float32Array(count * 3);
  const sizes = new Float32Array(count);
  const seeds = new Float32Array(count);
  const opacities = new Float32Array(count);
  const [x0, x1] = options.area.x;
  const [z0, z1] = options.area.z;
  const [size0, size1] = options.tamano;
  const [opacity0, opacity1] = options.opacidad;

  for (let i = 0; i < count; i++) {
    const offset = i * 3;
    positions[offset] = x0 + rng() * (x1 - x0);
    positions[offset + 1] = options.alturaBase + (rng() - 0.5) * options.alturaVariacion;
    positions[offset + 2] = z0 + rng() * (z1 - z0);
    sizes[i] = size0 + rng() * (size1 - size0);
    seeds[i] = rng();
    opacities[i] = opacity0 + rng() * (opacity1 - opacity0);
  }
  return { positions, sizes, seeds, opacities };
}

function normalizeOptions(options) {
  const input = { ...DEFAULTS, ...options };
  const area = {
    x: range(options.area?.x, DEFAULTS.area.x),
    z: range(options.area?.z, DEFAULTS.area.z),
  };
  const viento = options.viento || DEFAULTS.viento;
  return {
    ...input,
    count: Math.max(0, Math.floor(Number(input.count) || 0)),
    area,
    alturaBase: Number(input.alturaBase) || 0,
    alturaVariacion: Math.max(0, Number(input.alturaVariacion) || 0),
    tamano: range(input.tamano, DEFAULTS.tamano, 0),
    opacidad: range(input.opacidad, DEFAULTS.opacidad, 0),
    densidad: clamp01(input.densidad),
    viento: new Vector2(Number(viento.x) || 0, Number(viento.z) || 0),
    velocidad: Number(input.velocidad) || 0,
    pixelRatio: Math.max(0.5, Number(input.pixelRatio) || 1),
  };
}

/**
 * Crea una capa de nubes de horizonte con un único draw call.
 *
 * Las nubes son billboards procedurales dibujados como puntos grandes: no
 * necesitan imágenes, atlas ni contexto WebGL durante la construcción. El
 * resultado puede montarse directamente con `scene.add(capa.group)`.
 */
export function crearNubesVolumetricas(options = {}) {
  const config = normalizeOptions(options);
  const data = createCloudData(config);
  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new BufferAttribute(data.positions, 3));
  geometry.setAttribute('aSize', new BufferAttribute(data.sizes, 1));
  geometry.setAttribute('aSeed', new BufferAttribute(data.seeds, 1));
  geometry.setAttribute('aOpacity', new BufferAttribute(data.opacities, 1));

  const uniforms = {
    uTime: { value: 0 },
    uPixelRatio: { value: config.pixelRatio },
    uWind: { value: config.viento.clone() },
    uSpeed: { value: config.velocidad },
    uColor: { value: new Color(config.color) },
    uShadow: { value: new Color(config.sombra) },
    uOpacity: { value: 1 },
    uDensity: { value: config.densidad },
  };
  const material = new ShaderMaterial({
    uniforms,
    vertexShader: CLOUD_VERTEX_SHADER,
    fragmentShader: CLOUD_FRAGMENT_SHADER,
    transparent: true,
    depthWrite: false,
    depthTest: true,
    blending: NormalBlending,
  });
  const points = new Points(geometry, material);
  points.name = 'nubes-volumetricas';
  points.frustumCulled = false;
  const group = new Group();
  group.name = 'fx-nubes-volumetricas';
  group.add(points);

  let elapsed = 0;
  return {
    group,
    points,
    material,
    uniforms,
    update(delta = 0) {
      elapsed += Math.max(0, Number(delta) || 0);
      uniforms.uTime.value = elapsed;
      return elapsed;
    },
    setIntensity(value) {
      uniforms.uDensity.value = clamp01(value);
      return this;
    },
    setWind(x, z) {
      uniforms.uWind.value.set(Number(x) || 0, Number(z) || 0);
      return this;
    },
    dispose() {
      geometry.dispose();
      material.dispose();
      group.remove(points);
    },
  };
}

/**
 * Define una niebla que se concentra abajo del horizonte y se desvanece al
 * subir. `applyTo` parchea materiales built-in de Three mediante
 * `onBeforeCompile`, sin reemplazar el material ni imponer un renderer.
 */
export function crearNieblaDeAltura(options = {}) {
  const base = Number(options.alturaBase ?? 0);
  const top = Math.max(base + 0.001, Number(options.alturaMax ?? base + 7));
  const uniforms = {
    uHeightFogColor: { value: new Color(options.color ?? '#a9c3c4') },
    uHeightFogBase: { value: base },
    uHeightFogTop: { value: top },
    uHeightFogDensity: { value: clamp01(options.densidad ?? 0.42) },
  };

  return {
    uniforms,
    get color() { return uniforms.uHeightFogColor.value; },
    get alturaBase() { return uniforms.uHeightFogBase.value; },
    get alturaMax() { return uniforms.uHeightFogTop.value; },
    setDensity(value) {
      uniforms.uHeightFogDensity.value = clamp01(value);
      return this;
    },
    applyTo(material) {
      if (!material || typeof material !== 'object') throw new TypeError('material is required');
      const previousCompile = material.onBeforeCompile;
      const previousKey = material.customProgramCacheKey;
      material.onBeforeCompile = (shader, renderer) => {
        previousCompile?.(shader, renderer);
        Object.assign(shader.uniforms, uniforms);
        shader.vertexShader = shader.vertexShader
          .replace('#include <common>', '#include <common>\nvarying float vHeightFogWorldY;')
          .replace('#include <project_vertex>', 'vHeightFogWorldY = (modelMatrix * vec4(transformed, 1.0)).y;\n#include <project_vertex>');
        shader.fragmentShader = shader.fragmentShader
          .replace('#include <common>', [
            '#include <common>',
            'uniform vec3 uHeightFogColor;',
            'uniform float uHeightFogBase;',
            'uniform float uHeightFogTop;',
            'uniform float uHeightFogDensity;',
            'varying float vHeightFogWorldY;',
          ].join('\n'))
          .replace('#include <opaque_fragment>', [
            '#include <opaque_fragment>',
            'float heightFogFade = 1.0 - smoothstep(uHeightFogBase, uHeightFogTop, vHeightFogWorldY);',
            'float heightFogAmount = clamp(heightFogFade * uHeightFogDensity, 0.0, 0.92);',
            'gl_FragColor.rgb = mix(gl_FragColor.rgb, uHeightFogColor, heightFogAmount);',
          ].join('\n'));
      };
      material.customProgramCacheKey = () => `${previousKey?.call(material) || ''}|height-fog`;
      material.needsUpdate = true;
      return () => {
        material.onBeforeCompile = previousCompile;
        material.customProgramCacheKey = previousKey;
        material.needsUpdate = true;
      };
    },
  };
}

export const NUBES_VOLUMETRICAS_DEFAULTS = DEFAULTS;
export const NUBES_VOLUMETRICAS_SHADERS = Object.freeze({
  vertex: CLOUD_VERTEX_SHADER,
  fragment: CLOUD_FRAGMENT_SHADER,
});
