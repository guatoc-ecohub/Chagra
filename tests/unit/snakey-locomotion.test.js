import { describe, expect, it } from 'vitest';
import { Vector3 } from 'three';
import {
  crearRastro,
  normalDeSuperficie,
  pegarAlTerreno,
  puntoEnRastro,
} from '../../lib3d/locomocion/snakey.js';

describe('snakey locomotion terrain contact', () => {
  const slope = (x, z) => x * 0.25 - z * 0.1;

  it('computes a normal from the same height sampler', () => {
    const normal = normalDeSuperficie(slope, 2, -1);
    expect(normal.x).toBeCloseTo(-0.25, 1);
    expect(normal.z).toBeCloseTo(0.1, 1);
    expect(normal.y).toBeGreaterThan(0.9);
  });

  it('grounds an object instead of leaving it floating', () => {
    const object = { position: new Vector3(2, 99, -1) };
    const result = pegarAlTerreno(object, slope, { offset: 0.03 });
    expect(result.grounded).toBe(true);
    expect(object.position.y).toBeCloseTo(slope(2, -1) + 0.03);
  });

  it('keeps trail samples ordered by arc distance', () => {
    const trail = crearRastro({ spacing: 0.2 });
    trail.push(new Vector3(0, 0, 0));
    trail.push(new Vector3(0.1, 0, 0));
    trail.push(new Vector3(0.4, 0, 0));
    expect(trail.points).toHaveLength(2);
    expect(trail.distance).toBeCloseTo(0.4);
    expect(puntoEnRastro(trail, 0.2).x).toBeCloseTo(0.2);
  });
});
