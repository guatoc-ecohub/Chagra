import { describe, expect, it } from 'vitest';
import {
  clearHotspotCache,
  getHotspotCacheSize,
  ndcToPixels,
  snapHotspotsToSurface,
} from './hotspots.js';

describe('2D to 3D hotspot bridge', () => {
  it('snaps authored coordinates to the nearest surface vertex and caches by model URL', () => {
    clearHotspotCache();
    const first = snapHotspotsToSurface({
      modelUrl: 'tomato-procedural',
      vertices: [[0, 0, 0], [1, 0, 0]],
      hotspots: [{ id: 'fruit', position: [0.8, 0.1, 0] }],
    });
    const cached = snapHotspotsToSurface({
      modelUrl: 'tomato-procedural',
      vertices: [[100, 100, 100]],
      hotspots: [{ id: 'fruit', position: [100, 100, 100] }],
    });

    expect(first[0].position).toEqual([1, 0, 0]);
    expect(cached[0].position).toEqual([1, 0, 0]);
    expect(cached[0].snapped).toBe(true);
    expect(getHotspotCacheSize()).toBe(1);
  });

  it('maps projected NDC coordinates to DOM pixels', () => {
    expect(ndcToPixels({ x: -1, y: 1 }, 800, 600)).toEqual({ x: 0, y: 0 });
    expect(ndcToPixels({ x: 0, y: 0 }, 800, 600)).toEqual({ x: 400, y: 300 });
  });
});
