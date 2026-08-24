import {
  ClampToEdgeWrapping,
  DataTexture,
  FloatType,
  Mesh,
  NearestFilter,
  OrthographicCamera,
  PlaneGeometry,
  RGBAFormat,
  Scene,
  ShaderMaterial,
  WebGLRenderTarget,
} from 'three';

/**
 * Hydraulic erosion pass for a heightfield backed by a WebGL render target.
 *
 * The render target stores height, water and sediment in R/G/B. Each shader
 * pass adds rain, erodes cells above their lower neighbours and deposits the
 * sediment when its local carrying capacity is exceeded. Two targets are
 * swapped so callers can reuse the simulator without allocating per pass.
 *
 * The input and output heightfields use row-major order. A renderer with
 * float render-target support is required because the final heightfield is
 * read back from the GPU.
 */

const DEFAULTS = Object.freeze({
  iterations: 24,
  rainfall: 0.025,
  evaporation: 0.045,
  erosionRate: 0.18,
  depositionRate: 0.12,
  sedimentCapacity: 1.35,
  flowRate: 0.35,
  initialWater: 0.08,
  initialSediment: 0,
});

const VERTEX_SHADER = /* glsl */ `
  varying vec2 vUv;

  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const FRAGMENT_SHADER = /* glsl */ `
  uniform sampler2D uState;
  uniform vec2 uTexelSize;
  uniform float uRainfall;
  uniform float uEvaporation;
  uniform float uErosionRate;
  uniform float uDepositionRate;
  uniform float uSedimentCapacity;
  uniform float uFlowRate;
  uniform float uInitialWater;

  varying vec2 vUv;

  float heightAt(vec2 offset) {
    return texture2D(uState, clamp(vUv + offset, vec2(0.0), vec2(1.0))).r;
  }

  void main() {
    vec4 state = texture2D(uState, vUv);
    float height = state.r;
    float water = max(state.g, 0.0);
    float sediment = max(state.b, 0.0);

    float west = heightAt(vec2(-uTexelSize.x, 0.0));
    float east = heightAt(vec2(uTexelSize.x, 0.0));
    float north = heightAt(vec2(0.0, uTexelSize.y));
    float south = heightAt(vec2(0.0, -uTexelSize.y));
    float lowerNeighbour = min(min(west, east), min(north, south));
    float averageNeighbour = (west + east + north + south) * 0.25;
    float downhill = max(height - lowerNeighbour, 0.0);
    float slope = max(height - averageNeighbour, 0.0);

    water = min(1.0, water + uRainfall + uInitialWater * 0.02);
    float carryingCapacity = max(0.0001,
      (slope * uFlowRate + water * 0.05) * uSedimentCapacity);
    float eroded = min(downhill * uErosionRate * water, slope * 0.5);
    float deposited = max(sediment - carryingCapacity, 0.0) * uDepositionRate;
    float nextHeight = height - eroded + deposited;
    float nextSediment = max(sediment + eroded - deposited, 0.0);
    float nextWater = max(water * (1.0 - uEvaporation), 0.0);

    gl_FragColor = vec4(nextHeight, nextWater, nextSediment, 1.0);
  }
`;

function assertDimensions(width, heightRows) {
  if (!Number.isInteger(width) || width < 2) {
    throw new RangeError('width must be an integer greater than 1');
  }
  if (!Number.isInteger(heightRows) || heightRows < 2) {
    throw new RangeError('heightRows must be an integer greater than 1');
  }
}

function assertHeightfield(height, width, heightRows) {
  if (!height || typeof height.length !== 'number' || height.length < width * heightRows) {
    throw new RangeError('height must contain width * heightRows samples');
  }
}

function createStateTexture(height, width, heightRows, options) {
  const state = new Float32Array(width * heightRows * 4);
  for (let i = 0; i < width * heightRows; i++) {
    state[i * 4] = Number(height[i]) || 0;
    state[i * 4 + 1] = options.initialWater;
    state[i * 4 + 2] = options.initialSediment;
    state[i * 4 + 3] = 1;
  }

  const texture = new DataTexture(state, width, heightRows, RGBAFormat, FloatType);
  texture.minFilter = NearestFilter;
  texture.magFilter = NearestFilter;
  texture.wrapS = ClampToEdgeWrapping;
  texture.wrapT = ClampToEdgeWrapping;
  texture.needsUpdate = true;
  return texture;
}

function createRenderTarget(width, heightRows) {
  return new WebGLRenderTarget(width, heightRows, {
    minFilter: NearestFilter,
    magFilter: NearestFilter,
    wrapS: ClampToEdgeWrapping,
    wrapT: ClampToEdgeWrapping,
    format: RGBAFormat,
    type: FloatType,
    depthBuffer: false,
    stencilBuffer: false,
  });
}

function readHeightfield(renderer, target, width, heightRows) {
  const rgba = new Float32Array(width * heightRows * 4);
  renderer.readRenderTargetPixels(target, 0, 0, width, heightRows, rgba);
  const height = new Float32Array(width * heightRows);
  for (let i = 0; i < height.length; i++) height[i] = rgba[i * 4];
  return height;
}

function copyHeightfield(height, size) {
  const samples = height.subarray
    ? height.subarray(0, size)
    : Array.from(height).slice(0, size);
  return Float32Array.from(samples);
}

/**
 * Create a reusable GPU erosion simulator.
 *
 * @param {{renderer: object, width: number, heightRows: number, options?: object}} config
 * @returns {{erosionar: Function, dispose: Function}}
 */
export function crearErosionGPU({ renderer, width, heightRows, options = {} } = {}) {
  assertDimensions(width, heightRows);
  if (!renderer || typeof renderer.render !== 'function' || typeof renderer.setRenderTarget !== 'function') {
    throw new TypeError('renderer must provide render() and setRenderTarget()');
  }
  if (typeof renderer.readRenderTargetPixels !== 'function') {
    throw new TypeError('renderer must provide readRenderTargetPixels()');
  }

  const targets = [createRenderTarget(width, heightRows), createRenderTarget(width, heightRows)];
  const geometry = new PlaneGeometry(2, 2);
  const material = new ShaderMaterial({
    uniforms: {
      uState: { value: null },
      uTexelSize: { value: { x: 1 / width, y: 1 / heightRows } },
      uRainfall: { value: DEFAULTS.rainfall },
      uEvaporation: { value: DEFAULTS.evaporation },
      uErosionRate: { value: DEFAULTS.erosionRate },
      uDepositionRate: { value: DEFAULTS.depositionRate },
      uSedimentCapacity: { value: DEFAULTS.sedimentCapacity },
      uFlowRate: { value: DEFAULTS.flowRate },
      uInitialWater: { value: DEFAULTS.initialWater },
    },
    vertexShader: VERTEX_SHADER,
    fragmentShader: FRAGMENT_SHADER,
    depthTest: false,
    depthWrite: false,
  });
  const scene = new Scene();
  scene.add(new Mesh(geometry, material));
  const camera = new OrthographicCamera(-1, 1, 1, -1, 0, 2);
  camera.position.z = 1;

  let disposed = false;

  const erosionar = (height, runOptions = {}) => {
    if (disposed) throw new Error('erosion GPU simulator has been disposed');
    assertHeightfield(height, width, heightRows);
    const cfg = { ...DEFAULTS, ...options, ...runOptions };
    const iterations = Math.max(0, Math.floor(Number(cfg.iterations) || 0));
    if (iterations === 0) return copyHeightfield(height, width * heightRows);

    const input = createStateTexture(height, width, heightRows, cfg);
    let source = input;
    let targetIndex = 0;
    const previousTarget = typeof renderer.getRenderTarget === 'function'
      ? renderer.getRenderTarget()
      : null;

    material.uniforms.uRainfall.value = Number(cfg.rainfall) || 0;
    material.uniforms.uEvaporation.value = Math.min(1, Math.max(0, Number(cfg.evaporation) || 0));
    material.uniforms.uErosionRate.value = Math.max(0, Number(cfg.erosionRate) || 0);
    material.uniforms.uDepositionRate.value = Math.max(0, Number(cfg.depositionRate) || 0);
    material.uniforms.uSedimentCapacity.value = Math.max(0, Number(cfg.sedimentCapacity) || 0);
    material.uniforms.uFlowRate.value = Math.max(0, Number(cfg.flowRate) || 0);
    material.uniforms.uInitialWater.value = Math.max(0, Number(cfg.initialWater) || 0);

    try {
      for (let pass = 0; pass < iterations; pass++) {
        const target = targets[targetIndex];
        material.uniforms.uState.value = source;
        renderer.setRenderTarget(target);
        renderer.render(scene, camera);
        source = target.texture;
        targetIndex = 1 - targetIndex;
      }
      return readHeightfield(renderer, targets[1 - targetIndex], width, heightRows);
    } finally {
      input.dispose();
      if (typeof renderer.setRenderTarget === 'function') renderer.setRenderTarget(previousTarget);
    }
  };

  const dispose = () => {
    if (disposed) return;
    disposed = true;
    targets.forEach((target) => target.dispose());
    geometry.dispose();
    material.dispose();
  };

  return { erosionar, dispose };
}

/**
 * Run hydraulic erosion once and release the GPU resources.
 */
export function erosionarHeightfieldGPU(renderer, height, width, heightRows, options = {}) {
  const simulator = crearErosionGPU({ renderer, width, heightRows, options });
  try {
    return simulator.erosionar(height, options);
  } finally {
    simulator.dispose();
  }
}

export {
  DEFAULTS as EROSION_GPU_DEFAULTS,
  VERTEX_SHADER as EROSION_GPU_VERTEX_SHADER,
  FRAGMENT_SHADER as EROSION_GPU_FRAGMENT_SHADER,
};
