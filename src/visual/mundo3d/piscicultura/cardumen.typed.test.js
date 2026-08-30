import { describe, it, expect } from 'vitest';
import { avanzarCardumen, crearCardumen } from './cardumen.js';

describe('cardumen - TypeScript types', () => {
  it('avanzarCardumen acepta opciones con depredadorPunto', () => {
    const estado = crearCardumen({
      n: 10,
      estanque: { cx: 0, cy: 0, cz: 0, rx: 10, ry: 5, rz: 8, ySup: 2, hondo: 1 },
      semilla: 42
    });

    // No debería lanzar error de TypeScript
    expect(() => {
      avanzarCardumen(estado, 0.016, {
        depredadorPunto: { x: 2, y: 1, z: 3, radio: 1.5 }
      });
    }).not.toThrow();
  });

  it('avanzarCardumen funciona sin depredadorPunto', () => {
    const estado = crearCardumen({
      n: 10,
      estanque: { cx: 0, cy: 0, cz: 0, rx: 10, ry: 5, rz: 8, ySup: 2, hondo: 1 },
      semilla: 42
    });

    // depredadorPunto es opcional según el JSDoc
    expect(() => {
      avanzarCardumen(estado, 0.016, {});
    }).not.toThrow();
  });
});
