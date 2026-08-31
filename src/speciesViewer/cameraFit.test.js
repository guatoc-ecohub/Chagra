import { describe, expect, it } from 'vitest';
import {
  getPerspectiveFitDistanceForSilhouette,
  isExcludedFromCameraFit,
} from './cameraFit.js';

describe('species camera fit', () => {
  it('fits the real silhouette, including depth from the anatomical pivot', () => {
    const distance = getPerspectiveFitDistanceForSilhouette([
      [-0.3, -0.4, 0],
      [0.3, 0.4, 0],
      [0.04, 1.2, 0.3],
    ], { verticalFov: Math.PI / 3, aspect: 1, fill: 0.8, pivot: [0, 0, 0] });

    expect(distance).toBeCloseTo(2.898, 3);
  });

  it('respects a pivot that is not the geometric center', () => {
    const centered = getPerspectiveFitDistanceForSilhouette([[0, 0, 0], [0, 1, 0]], {
      verticalFov: Math.PI / 3,
      aspect: 1,
      fill: 0.8,
      pivot: [0, 0, 0],
    });
    const anatomical = getPerspectiveFitDistanceForSilhouette([[0, 0, 0], [0, 1, 0]], {
      verticalFov: Math.PI / 3,
      aspect: 1,
      fill: 0.8,
      pivot: [0, 0.5, 0],
    });

    expect(anatomical).toBeLessThan(centered);
  });

  it('walks parents to exclude a stage surface from fitting', () => {
    const stage = { userData: { excludeFromCameraFit: true }, parent: null };
    const mesh = { userData: {}, parent: stage };
    expect(isExcludedFromCameraFit(mesh)).toBe(true);
    expect(isExcludedFromCameraFit({ userData: {}, parent: null })).toBe(false);
  });
});
