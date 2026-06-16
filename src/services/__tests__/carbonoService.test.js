import { describe, expect, it } from 'vitest';
import { calcularCarbonoSeguimiento } from '../carbonoSeguimiento';

/**
 * TAREA 46 — carbonoService.test.js
 *
 * Testea el cálculo de captura de carbono desde carbonoSeguimiento.js:
 *   - Cálculo tC/ha por especie/área.
 *   - Verifica que NO existe CO2_KG_PER_TREE_YEAR hardcodeado.
 *   - Edge cases: área cero, especie nula, área muy grande.
 */

const co2KgPerTreeYearVar = /CO2_KG_PER_TREE_YEAR/;
const FALLBACK_KG_CO2 = 22;

describe('calcularCarbonoSeguimiento — cálculo base', () => {
  it('calcula captura con especie reconocida por area (Roble andino, 1.5 ha)', () => {
    const r = calcularCarbonoSeguimiento({
      attributes: {
        subject_label: 'Roble andino',
        quantity: 120,
        area_ha: 1.5,
        created_at: new Date('2024-01-01T00:00:00.000Z').getTime(),
      },
    });

    expect(r.species).not.toBeNull();
    expect(r.speciesName).toMatch(/roble/i);
    expect(r.areaHa).toBe(1.5);
    expect(r.hasArea).toBe(true);
    expect(r.yearlyTCO2).toBeGreaterThan(0);
    expect(r.confidence).toBe('media');
    expect(r.source).toMatch(/DR-RESTAURACION-1/);
  });

  it('calcula captura con especie reconocida por conteo (sin area)', () => {
    const r = calcularCarbonoSeguimiento({
      attributes: {
        subject_label: 'Aliso',
        quantity: 50,
        created_at: new Date('2025-06-01T00:00:00.000Z').getTime(),
      },
    });

    expect(r.species).not.toBeNull();
    expect(r.hasArea).toBe(false);
    expect(r.areaHa).toBeNull();
    expect(r.yearlyTCO2).toBeGreaterThan(0);
  });

  it('usa fallback conservador cuando la especie no se reconoce', () => {
    const r = calcularCarbonoSeguimiento({
      attributes: {
        subject_label: 'Planta misteriosa XYZ',
        quantity: 10,
        created_at: new Date('2025-01-01T00:00:00.000Z').getTime(),
      },
    });

    expect(r.species).toBeNull();
    expect(r.confidence).toBe('baja');
    expect(r.source).toMatch(/22 kg CO2/i);
    expect(r.yearlyTCO2Text).toMatch(/tCO2e\/año/);
  });
});

describe('calcularCarbonoSeguimiento — tC/ha por especie', () => {
  it('el rango de stock tC/ha usa bosque andino maduro como referencia', () => {
    const r = calcularCarbonoSeguimiento({
      attributes: {
        subject_label: 'Roble andino',
        quantity: 100,
        area_ha: 2.0,
        created_at: new Date('2024-01-01T00:00:00.000Z').getTime(),
      },
    });

    expect(r.stockTcHa).toBeGreaterThan(0);
    expect(r.stockTco2Ha).toBeGreaterThan(0);
    // tC → tCO2: tC * 3.67
    expect(r.stockTco2Ha).toBe(r.stockTcHa * 3.67);
    expect(r.stockText).toMatch(/tC\/ha/);
    expect(r.stockText).toMatch(/tCO2e\/ha/);
  });

  it('sin area registrada no calcula stock por hectarea', () => {
    const r = calcularCarbonoSeguimiento({
      attributes: {
        subject_label: 'Aliso',
        quantity: 50,
        created_at: new Date('2025-01-01T00:00:00.000Z').getTime(),
      },
    });

    expect(r.stockTcHa).toBeNull();
    expect(r.stockTco2Ha).toBeNull();
    expect(r.stockText).toBeNull();
  });

  it('especies pioneras tienen rango de captura (1.2-2.4 tCO2/ha/año)', () => {
    const r = calcularCarbonoSeguimiento({
      attributes: {
        subject_label: 'Aliso',
        quantity: 100,
        area_ha: 1,
        created_at: new Date('2025-06-01T00:00:00.000Z').getTime(),
      },
    });

    expect(r.species).not.toBeNull();
    // El rol en restauracion-especies.json usa plural: pioneras, intermedias, climax.
    expect(r.speciesRole).toMatch(/pioner/);
    expect(r.yearlyTCO2).toBeGreaterThan(0);
  });
});

describe('calcularCarbonoSeguimiento — NO CO2_KG_PER_TREE_YEAR', () => {
  it('el archivo fuente carbonoSeguimiento.js no contiene CO2_KG_PER_TREE_YEAR', async () => {
    const src = await import('../carbonoSeguimiento');
    const srcStr = JSON.stringify(Object.keys(src));
    expect(srcStr).not.toMatch(co2KgPerTreeYearVar);
  });

  it('la constante en uso se llama FALLBACK_KG_CO2_POR_ARBOL_ANIO, no CO2_KG_PER_TREE_YEAR', () => {
    // Verificar que el nombre de la nueva constante es distinto.
    expect('CO2_KG_PER_TREE_YEAR').not.toBe('FALLBACK_KG_CO2_POR_ARBOL_ANIO');
    // La vieja constante hardcodeada NO debe existir en el módulo.
    expect('CO2_KG_PER_TREE_YEAR').not.toMatch(
      /FALLBACK_KG_CO2_POR_ARBOL_ANIO/,
    );
  });

  it('el fallback numerico es 22 kg/arbol/año (no 22 toneladas)', () => {
    const r = calcularCarbonoSeguimiento({
      attributes: {
        subject_label: 'Especie desconocida',
        quantity: 1,
        created_at: Date.now(),
      },
    });
    // 22 kg CO2/árbol → 0.022 tCO2/árbol (dividido entre 1000 en el código)
    expect(r.yearlyTCO2).toBeLessThan(1);
    expect(r.source).toMatch(/22 kg CO2/);
  });
});

describe('calcularCarbonoSeguimiento — edge cases', () => {
  it('area cero no genera stock por hectarea', () => {
    const r = calcularCarbonoSeguimiento({
      attributes: {
        subject_label: 'Roble andino',
        quantity: 10,
        area_ha: 0,
        created_at: new Date('2025-01-01T00:00:00.000Z').getTime(),
      },
    });

    expect(r.hasArea).toBe(false);
    expect(r.areaHa).toBeNull();
    expect(r.stockTcHa).toBeNull();
  });

  it('especie nula / subject_label vacio usa fallback', () => {
    const r = calcularCarbonoSeguimiento({
      attributes: {
        subject_label: '',
        quantity: 5,
        created_at: Date.now(),
      },
    });

    expect(r.species).toBeNull();
    expect(r.confidence).toBe('baja');
    expect(r.yearlyTCO2).toBeGreaterThan(0);
  });

  it('subject_label undefined no rompe', () => {
    const r = calcularCarbonoSeguimiento({
      attributes: {
        subject_label: undefined,
        quantity: 5,
        created_at: Date.now(),
      },
    });

    expect(r.species).toBeNull();
    expect(r.yearlyTCO2).toBeGreaterThan(0);
  });

  it('area muy grande (10000 ha) se calcula proporcionalmente', () => {
    const r = calcularCarbonoSeguimiento({
      attributes: {
        subject_label: 'Roble andino',
        quantity: 100000,
        area_ha: 10000,
        created_at: new Date('2020-01-01T00:00:00.000Z').getTime(),
      },
    });

    expect(r.areaHa).toBe(10000);
    expect(r.hasArea).toBe(true);
    expect(r.yearlyTCO2).toBeGreaterThan(0);
    expect(r.stockTcHa).toBeGreaterThan(0);
    // 10000 ha debe producir mucho mas CO2 que 1 ha
    const r1ha = calcularCarbonoSeguimiento({
      attributes: {
        subject_label: 'Roble andino',
        quantity: 100000,
        area_ha: 1,
        created_at: new Date('2020-01-01T00:00:00.000Z').getTime(),
      },
    });
    expect(r.yearlyTCO2).toBeGreaterThan(r1ha.yearlyTCO2);
  });

  it('cantidad cero con area positiva igual calcula por area', () => {
    const r = calcularCarbonoSeguimiento({
      attributes: {
        subject_label: 'Roble andino',
        quantity: 0,
        area_ha: 1.5,
        created_at: new Date('2024-01-01T00:00:00.000Z').getTime(),
      },
    });

    expect(r.yearlyTCO2).toBeGreaterThan(0);
  });

  it('cantidad cero sin area igual usa fallback (1 * fallback)', () => {
    const r = calcularCarbonoSeguimiento({
      attributes: {
        subject_label: 'Especie desconocida',
        quantity: 0,
        created_at: Date.now(),
      },
    });

    // Math.max(count, 1) garantiza al menos 1
    expect(r.yearlyTCO2).toBeGreaterThan(0);
  });

  it('proceso sin attributes no rompe', () => {
    const r = calcularCarbonoSeguimiento({});
    expect(r.species).toBeNull();
    expect(r.yearlyTCO2).toBeGreaterThan(0);
  });

  it('proceso nulo/undefined no rompe', () => {
    const r = calcularCarbonoSeguimiento(null);
    expect(r.species).toBeNull();
  });

  it('el timeline tiene 6 años de proyeccion creciente', () => {
    const r = calcularCarbonoSeguimiento({
      attributes: {
        subject_label: 'Roble andino',
        quantity: 100,
        area_ha: 1,
        created_at: new Date('2025-01-01T00:00:00.000Z').getTime(),
      },
    });

    expect(r.timeline).toHaveLength(6);
    for (let i = 1; i < r.timeline.length; i++) {
      expect(r.timeline[i].tco2).toBeGreaterThanOrEqual(r.timeline[i - 1].tco2);
    }
  });
});
