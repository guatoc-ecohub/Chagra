import { describe, expect, it } from 'vitest';
import { calcularCarbonoSeguimiento } from '../carbonoSeguimiento';

describe('calcularCarbonoSeguimiento', () => {
  it('reconoce una especie del catalogo y calcula una estimacion por area', () => {
    const proceso = {
      attributes: {
        subject_label: 'Roble andino',
        quantity: 120,
        area_ha: 1.5,
        created_at: new Date('2024-01-01T00:00:00.000Z').getTime(),
      },
    };

    const r = calcularCarbonoSeguimiento(proceso);

    expect(r.speciesName).toMatch(/roble/i);
    expect(r.areaHa).toBe(1.5);
    expect(r.yearlyTCO2).toBeGreaterThan(0);
    expect(r.timeline).toHaveLength(6);
    expect(r.timeline[0].tco2).toBeLessThan(r.timeline[5].tco2);
    expect(r.source).toMatch(/DR-RESTAURACION-1|IDEAM/i);
  });

  it('usa fallback conservador cuando no reconoce la especie', () => {
    const proceso = {
      attributes: {
        subject_label: 'Especie desconocida',
        quantity: 10,
        created_at: new Date('2025-01-01T00:00:00.000Z').getTime(),
      },
    };

    const r = calcularCarbonoSeguimiento(proceso);

    expect(r.species).toBeNull();
    expect(r.confidence).toBe('baja');
    expect(r.yearlyTCO2Text).toMatch(/tCO2e\/año/);
    expect(r.source).toMatch(/22 kg CO2/i);
  });
});
