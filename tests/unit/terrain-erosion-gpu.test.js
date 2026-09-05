import { describe, expect, it } from 'vitest';
import {
  crearErosionGPU,
  EROSION_GPU_FRAGMENT_SHADER,
} from '../../lib3d/terrain/erosionGPU.js';

function createSoftwareRenderer() {
  let currentTarget = null;
  let renderCount = 0;

  return {
    get renderCount() {
      return renderCount;
    },
    setRenderTarget(target) {
      currentTarget = target;
    },
    render(scene) {
      const source = scene.children[0].material.uniforms.uState.value;
      const sourceState = source.image?.data || source.userData.state;
      const state = new Float32Array(sourceState);
      const center = (Math.floor(state.length / 4 / 2) * 4);
      state[center] -= 0.01;
      currentTarget.texture.userData.state = state;
      renderCount++;
    },
    readRenderTargetPixels(target, _x, _y, _width, _height, pixels) {
      const state = target.texture.userData.state;
      for (let i = 0; i < pixels.length / 4; i++) pixels[i * 4] = state[i * 4];
    },
  };
}

describe('GPU hydraulic erosion', () => {
  it('produces a modified heightfield through render-target passes', () => {
    const renderer = createSoftwareRenderer();
    const width = 8;
    const heightRows = 8;
    const original = Float32Array.from({ length: width * heightRows }, (_, i) => (i % width) * 0.1);
    const simulator = crearErosionGPU({ renderer, width, heightRows, options: { iterations: 3 } });

    const result = simulator.erosionar(original);

    expect(result).toBeInstanceOf(Float32Array);
    expect(result).not.toBe(original);
    expect(result.some((value, index) => value !== original[index])).toBe(true);
    expect(renderer.renderCount).toBe(3);
    simulator.dispose();
  });

  it('keeps the erosion algorithm in a fragment shader with ping-pong state', () => {
    expect(EROSION_GPU_FRAGMENT_SHADER).toContain('uState');
    expect(EROSION_GPU_FRAGMENT_SHADER).toContain('nextHeight');
    expect(EROSION_GPU_FRAGMENT_SHADER).toContain('nextSediment');
  });
});
