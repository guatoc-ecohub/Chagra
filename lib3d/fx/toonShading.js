import {
  BackSide,
  ClampToEdgeWrapping,
  Color,
  DataTexture,
  Mesh,
  MeshBasicMaterial,
  MeshToonMaterial,
  NearestFilter,
  RGBAFormat,
  UnsignedByteType,
} from 'three';

const DEFAULT_BANDS = Object.freeze([0.18, 0.42, 0.7, 1]);

export const TOON_SAKURA_DEFAULTS = Object.freeze({
  color: 0xd58b9d,
  rim: Object.freeze({
    color: 0xffdce6,
    strength: 0.38,
    power: 2.6,
  }),
  outline: Object.freeze({
    color: 0x321d2c,
    thickness: 0.035,
    opacity: 0.92,
  }),
});

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function finiteNumber(value, fallback) {
  return Number.isFinite(Number(value)) ? Number(value) : fallback;
}

/**
 * Creates the scalar ramp consumed by MeshToonMaterial's gradientMap.
 *
 * Each entry is one discrete light band. Nearest filtering is intentional:
 * linear filtering would turn the cel steps into a soft gradient.
 */
export function createGradientMap(levels = DEFAULT_BANDS) {
  if (!levels || typeof levels[Symbol.iterator] !== 'function') {
    throw new TypeError('levels must be an iterable of numbers');
  }

  const bands = [...levels]
    .map((level) => clamp(finiteNumber(level, 1), 0, 1))
    .sort((a, b) => a - b);
  if (bands.length === 0) throw new RangeError('levels must contain at least one value');

  const data = new Uint8Array(bands.length * 4);
  bands.forEach((level, index) => {
    const channel = Math.round(level * 255);
    const offset = index * 4;
    data[offset] = channel;
    data[offset + 1] = channel;
    data[offset + 2] = channel;
    data[offset + 3] = 255;
  });

  const texture = new DataTexture(
    data,
    bands.length,
    1,
    RGBAFormat,
    UnsignedByteType,
  );
  texture.name = 'chagra-toon-gradient-map';
  texture.minFilter = NearestFilter;
  texture.magFilter = NearestFilter;
  texture.wrapS = ClampToEdgeWrapping;
  texture.wrapT = ClampToEdgeWrapping;
  texture.generateMipmaps = false;
  texture.needsUpdate = true;
  return texture;
}

function normalizeRim(rim) {
  if (rim === false) return { enabled: false, ...TOON_SAKURA_DEFAULTS.rim };
  const config = { ...TOON_SAKURA_DEFAULTS.rim, ...(rim || {}) };
  return {
    enabled: config.enabled !== false,
    color: new Color(config.color),
    strength: Math.max(0, finiteNumber(config.strength, TOON_SAKURA_DEFAULTS.rim.strength)),
    power: Math.max(0.1, finiteNumber(config.power, TOON_SAKURA_DEFAULTS.rim.power)),
  };
}

function installRimLight(material, rim) {
  const rimUniforms = {
    color: { value: rim.color },
    strength: { value: rim.strength },
    power: { value: rim.power },
  };
  const previousOnBeforeCompile = material.onBeforeCompile;

  material.onBeforeCompile = (shader, renderer) => {
    previousOnBeforeCompile?.(shader, renderer);
    shader.uniforms.toonRimColor = rimUniforms.color;
    shader.uniforms.toonRimStrength = rimUniforms.strength;
    shader.uniforms.toonRimPower = rimUniforms.power;

    shader.fragmentShader = shader.fragmentShader.replace(
      'uniform float opacity;',
      `uniform float opacity;
uniform vec3 toonRimColor;
uniform float toonRimStrength;
uniform float toonRimPower;`,
    );
    shader.fragmentShader = shader.fragmentShader.replace(
      'vec3 outgoingLight = reflectedLight.directDiffuse + reflectedLight.indirectDiffuse + totalEmissiveRadiance;',
      `vec3 outgoingLight = reflectedLight.directDiffuse + reflectedLight.indirectDiffuse + totalEmissiveRadiance;

float toonRimFacing = max(dot(normalize(normal), normalize(-vViewPosition)), 0.0);
float toonRim = pow(1.0 - toonRimFacing, toonRimPower);
outgoingLight += toonRimColor * toonRim * toonRimStrength;`,
    );
    material.userData.toonRimShaderUniforms = shader.uniforms;
  };
  material.customProgramCacheKey = () => 'chagra-toon-rim-v1';
  material.userData.toonRim = rimUniforms;
}

/**
 * Creates a reusable cel-shaded material for the valley's low-poly meshes.
 * The rim is injected into MeshToonMaterial's fragment shader and therefore
 * follows the camera instead of behaving like a second ordinary light.
 */
export function createToonMaterial({
  color = TOON_SAKURA_DEFAULTS.color,
  gradientMap = createGradientMap(),
  rim = TOON_SAKURA_DEFAULTS.rim,
  ...materialOptions
} = {}) {
  const material = new MeshToonMaterial({
    ...materialOptions,
    color,
    gradientMap,
  });
  const rimConfig = normalizeRim(rim);
  if (rimConfig.enabled && rimConfig.strength > 0) installRimLight(material, rimConfig);
  material.userData.toonShading = {
    kind: 'sakura-crossing',
    bands: gradientMap,
    rimEnabled: rimConfig.enabled && rimConfig.strength > 0,
  };
  return material;
}

/**
 * Adds a back-face shell as a child of `mesh`, producing a cheap silhouette
 * outline without a post-processing pass. `thickness` is a local scale ratio.
 */
export function createToonOutline(mesh, {
  color = TOON_SAKURA_DEFAULTS.outline.color,
  thickness = TOON_SAKURA_DEFAULTS.outline.thickness,
  opacity = TOON_SAKURA_DEFAULTS.outline.opacity,
  ...materialOptions
} = {}) {
  if (!mesh?.isMesh || !mesh.geometry) {
    throw new TypeError('createToonOutline requires a THREE.Mesh with geometry');
  }

  const outlineMaterial = new MeshBasicMaterial({
    ...materialOptions,
    color,
    opacity: clamp(finiteNumber(opacity, 1), 0, 1),
    transparent: finiteNumber(opacity, 1) < 1,
    depthWrite: false,
    side: BackSide,
  });
  const outline = new Mesh(mesh.geometry, outlineMaterial);
  outline.name = `${mesh.name || 'toon-mesh'}-outline`;
  outline.scale.setScalar(1 + Math.max(0, finiteNumber(thickness, 0)));
  outline.renderOrder = mesh.renderOrder - 1;
  outline.userData.toonOutline = true;
  outline.userData.sourceMeshUuid = mesh.uuid;
  mesh.add(outline);
  return outline;
}

export const crearMapaGradienteToon = createGradientMap;
export const crearMaterialToon = createToonMaterial;
export const crearOutlineToon = createToonOutline;
