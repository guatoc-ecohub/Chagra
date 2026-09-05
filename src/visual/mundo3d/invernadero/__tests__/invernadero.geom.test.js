import { describe, expect, it } from 'vitest';
import {
  normalizarCultivo,
  posicionesCultivo,
  invernaderoDeTier,
} from '../invernadero.geom.js';

describe('cultivo parametrizable del invernadero', () => {
  it('prioriza tomate y mantiene el contrato dentro de 1 a 10.000 plantas', () => {
    expect(normalizarCultivo()).toMatchObject({ especie: 'tomate', cantidad: 1500 });
    expect(normalizarCultivo({ especie: 'tomato', cantidad: 12000 })).toMatchObject({
      especie: 'tomate',
      cantidad: 10000,
    });
    expect(normalizarCultivo({ especie: 'desconocida', cantidad: -4 })).toMatchObject({
      especie: 'tomate',
      cantidad: 1,
    });
  });

  it('siembra exactamente 1.500 y 10.000 puntos sin crear meshes por planta', () => {
    const mediano = posicionesCultivo({ especie: 'tomate', cantidad: 1500, layout: 'surcos' }, 20260818);
    const grande = posicionesCultivo({ especie: 'tomate', cantidad: 10000, layout: 'compacto' }, 20260818);

    expect(mediano).toHaveLength(1500);
    expect(grande).toHaveLength(10000);
    expect(grande[0]).toEqual(posicionesCultivo({ especie: 'tomate', cantidad: 10000, layout: 'compacto' }, 20260818)[0]);
    expect(grande.every(({ pos }) => pos[0] >= -2.5 && pos[0] <= 2.5 && pos[2] >= -6.2 && pos[2] <= 6.2)).toBe(true);

    for (const semilla of [20260818, 20260819, 20260820]) {
      expect(posicionesCultivo({ especie: 'tomate', cantidad: 10000, layout: 'surcos' }, semilla)).toHaveLength(10000);
    }
  });

  it('cambia de especie y conserva el mismo contrato de render', () => {
    const cultivo = normalizarCultivo({ especie: 'lechuga', cantidad: 1500, layout: { tipo: 'franjas', filas: 12 } });
    const conteos = invernaderoDeTier('alto', cultivo);

    expect(cultivo.especieInfo.geometria).toBe('hortaliza');
    expect(cultivo.layout).toEqual({ tipo: 'franjas', filas: 12 });
    expect(conteos.frutosPorPlanta).toBe(0);
  });
});
