import { CatmullRomCurve3, PerspectiveCamera, Vector3 } from 'three';
import { demoSurco, GestoSurco, sembrarAloLargo } from '../../lib3d/vfx/siembraGesto.js';
import { sembrarGestoEnValle } from '../../src/mockups/valle/siembraValle.js';

describe('siembra por gesto', () => {
  it('emite puntos uniformes y deterministas a lo largo del spline', () => {
    const curve = demoSurco({ largo: 6, ancho: 2, sampleHeight: (x, z) => x * 0.1 + z * 0.02 });
    const first = [];
    const second = [];
    const collect = (target) => ({ onPunto: (point) => target.push(point.toArray()) });
    expect(sembrarAloLargo(curve, { espaciado: 0.5, jitter: 0.1, seed: 7, ...collect(first) })).toBe(first.length);
    expect(sembrarAloLargo(curve, { espaciado: 0.5, jitter: 0.1, seed: 7, ...collect(second) })).toBe(second.length);
    expect(second).toEqual(first);
    expect(first.length).toBeGreaterThan(5);
  });

  it('adapta el gesto al contrato de siembra del valle', () => {
    const curve = new CatmullRomCurve3([new Vector3(0, 0, 0), new Vector3(0, 0, 4)]);
    const items = sembrarGestoEnValle(curve, () => 1, { espaciado: 0.5 });
    expect(items.length).toBeGreaterThan(5);
    expect(items[0].pos[1]).toBeCloseTo(1.02);
    expect(items.every((item) => item.tint.length === 3)).toBe(true);
  });

  it('captura un trazo sobre el plano y cancela trazos cortos', () => {
    const camera = new PerspectiveCamera(45, 1, 0.1, 100);
    camera.position.set(0, 5, 5);
    camera.lookAt(0, 0, 0);
    camera.updateMatrixWorld();
    const cancel = vi.fn();
    const gesto = new GestoSurco(camera, { minPathLength: 2, onCancel: cancel });
    expect(gesto.begin({ x: 0, y: 0 })).toBe(true);
    gesto.move({ x: 0.02, y: 0 });
    expect(gesto.end()).toBeNull();
    expect(cancel).toHaveBeenCalledOnce();
  });
});
