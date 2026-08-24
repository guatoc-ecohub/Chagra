import { describe, expect, it } from 'vitest';
import { erosionarHeightfield } from '../../lib3d/terrain/erosion.js';
import { crearSuperficieErosionada } from '../../lib3d/terrain/superficie.js';
import { crearClimaVolumetrico } from '../../lib3d/terrain/clima.js';

describe('red-sands terrain integration', () => {
  it('is deterministic and changes a sloped heightfield', () => {
    const make = () => Float32Array.from({ length: 18 * 18 }, (_, i) => (i % 18) * 0.1 + Math.floor(i / 18) * 0.03);
    const a = make();
    const b = make();
    erosionarHeightfield(a, 18, 18, { droplets: 120, maxSteps: 16, seed: 42 });
    erosionarHeightfield(b, 18, 18, { droplets: 120, maxSteps: 16, seed: 42 });
    expect(Array.from(a)).toEqual(Array.from(b));
    expect(a.some((value, i) => value !== make()[i])).toBe(true);
  });

  it('returns one bounded surface sampler', () => {
    const surface = crearSuperficieErosionada({
      resolution: 12,
      sampleBase: (x, z) => x * 0.1 - z * 0.04,
      droplets: 80,
      seed: 9,
    });
    expect(surface.heightAt(-100, 100)).toBeTypeOf('number');
    expect(surface.normalAt(0, 0).y).toBeGreaterThan(0);
  });
});
describe('red-sands weather state machine', () => {
  it('shares deterministic wind and applies rain state', () => {
    const a = crearClimaVolumetrico({ estadoInicial: 'fair', seed: 7 });
    const b = crearClimaVolumetrico({ estadoInicial: 'fair', seed: 7 });
    a.setWeather('overcast');
    b.setWeather('overcast');
    expect(a.tick(1)).toEqual(b.tick(1));
    a.setWeather('rain');
    expect(a.env.rainIntensity).toBeGreaterThan(0);
    expect(a.env.wetness).toBeGreaterThan(0);
  });
});
