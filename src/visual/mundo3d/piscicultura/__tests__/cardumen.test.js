import { describe, expect, test } from 'vitest';
import { avanzarCardumen, crearCardumen } from '../cardumen.js';

describe('cardumen', () => {
  test('la cohesión acerca tres peces al centro común de forma determinista', () => {
    const estanque = { cx: 0, cz: 0, rx: 10, rz: 10, ySup: 2, hondo: 2 };
    const estado = {
      estanque,
      peces: [
        { x: -1, y: 1, z: 0, vx: 0, vy: 0, vz: 0, fase: 0, escala: 1 },
        { x: 0, y: 1, z: 0, vx: 0, vy: 0, vz: 0, fase: 1, escala: 1 },
        { x: 1, y: 1, z: 0, vx: 0, vy: 0, vz: 0, fase: 2, escala: 1 },
      ],
    };
    const aperturaAntes = estado.peces[2].x - estado.peces[0].x;
    avanzarCardumen(estado, 0.05, {
      vision: 4,
      separacion: 0,
      alineacion: 0,
      cohesion: 8,
      borde: 0,
      velocidadMinima: 0,
      velocidadMaxima: 10,
      maximoAceleracion: 20,
    });
    expect(estado.peces[2].x - estado.peces[0].x).toBeLessThan(aperturaAntes);
    expect(estado.peces[0].vx).toBeGreaterThan(0);
    expect(estado.peces[2].vx).toBeLessThan(0);
  });

  test('la semilla reproduce el cardumen inicial', () => {
    const estanque = { cx: 0, cz: 0, rx: 2, rz: 1, ySup: 1, hondo: 0.8 };
    expect(crearCardumen({ n: 4, estanque, semilla: 31 })).toEqual(
      crearCardumen({ n: 4, estanque, semilla: 31 }),
    );
  });
});
