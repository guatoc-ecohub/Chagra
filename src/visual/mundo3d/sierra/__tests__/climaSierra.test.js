import { describe, expect, test } from 'vitest';
import { perfilClimaSierra } from '../climaSierra.js';

describe('perfilClimaSierra', () => {
  test('separa cielo despejado de cielo nublado con la señal real', () => {
    const despejado = perfilClimaSierra({
      senal: true,
      condicion: 'despejado',
      nubosidad: 3,
      lluvia: false,
      niebla: false,
      helada: false,
    });
    const nublado = perfilClimaSierra({
      senal: true,
      condicion: 'nublado',
      nubosidad: 92,
      lluvia: false,
      niebla: false,
      helada: true,
    });

    expect(despejado.cobertura).toBeLessThan(0.1);
    expect(despejado.nubes).toBe(0);
    expect(nublado.cobertura).toBeCloseTo(0.92);
    expect(nublado.nubes).toBeGreaterThan(despejado.nubes);
    expect(nublado.luzIntensidad).toBeLessThan(despejado.luzIntensidad);
    expect(nublado.helada).toBe(true);
  });

  test('no monta fenómenos ni inventa cobertura sin snapshot', () => {
    const perfil = perfilClimaSierra(null);

    expect(perfil.senal).toBe(false);
    expect(perfil.cobertura).toBe(0);
    expect(perfil.nubes).toBe(0);
    expect(perfil.lluvia).toBe(false);
    expect(perfil.niebla).toBe(false);
    expect(perfil.helada).toBe(false);
  });
});
