/**
 * poscosechaCalculator — cobertura de la lógica DETERMINISTA de poscosecha.
 *
 * Verifica que:
 *   - El secado de grano es un balance de masa EXACTO (la materia seca no cambia).
 *   - Las guardas rechazan datos inválidos (secar "hacia arriba", humedad ≥ 100).
 *   - La evaluación de materia seca del aguacate respeta los umbrales de norma.
 *   - Los catálogos grounded (granos, curado, transformaciones) están completos.
 */
import { describe, it, expect } from 'vitest';
import {
  GRANOS,
  calcularSecadoGrano,
  evaluarMateriaSecaAguacate,
  AGUACATE_MS_MINIMO_NORMA,
  CURADO,
  DANIO_POR_FRIO,
  TRANSFORMACIONES,
  PERDIDA_PAIS,
} from '../poscosechaCalculator';

describe('secado de grano — balance de masa exacto', () => {
  it('la materia seca se conserva al secar', () => {
    // 100 kg al 22 % → materia seca = 78 kg (constante).
    const r = calcularSecadoGrano({ pesoInicial: 100, humedadInicial: 22, humedadObjetivo: 13 });
    expect(r).not.toBeNull();
    expect(r.materiaSeca).toBeCloseTo(78, 2);
    // peso final = 78 / (1 - 0.13) = 89.655...
    expect(r.pesoFinal).toBeCloseTo(89.66, 1);
    // agua a sacar = 100 - 89.66 = 10.34
    expect(r.aguaEliminada).toBeCloseTo(10.34, 1);
  });

  it('agua eliminada + peso final = peso inicial (conservación)', () => {
    const r = calcularSecadoGrano({ pesoInicial: 50, humedadInicial: 18, humedadObjetivo: 13 });
    expect(r.pesoFinal + r.aguaEliminada).toBeCloseTo(50, 1);
  });

  it('acepta coma decimal en las entradas', () => {
    const r = calcularSecadoGrano({ pesoInicial: '100', humedadInicial: '22,5', humedadObjetivo: 13 });
    expect(r).not.toBeNull();
    expect(r.aguaEliminada).toBeGreaterThan(0);
  });

  it('rechaza secar hacia arriba (humedad objetivo ≥ actual)', () => {
    expect(calcularSecadoGrano({ pesoInicial: 100, humedadInicial: 12, humedadObjetivo: 13 })).toBeNull();
    expect(calcularSecadoGrano({ pesoInicial: 100, humedadInicial: 13, humedadObjetivo: 13 })).toBeNull();
  });

  it('rechaza datos inválidos (peso ≤ 0, humedad fuera de 0–100)', () => {
    expect(calcularSecadoGrano({ pesoInicial: 0, humedadInicial: 22, humedadObjetivo: 13 })).toBeNull();
    expect(calcularSecadoGrano({ pesoInicial: 100, humedadInicial: 120, humedadObjetivo: 13 })).toBeNull();
    expect(calcularSecadoGrano({ pesoInicial: 100, humedadInicial: '', humedadObjetivo: 13 })).toBeNull();
  });
});

describe('índice de cosecha — aguacate Hass por materia seca', () => {
  it('por debajo del 21 % está verde', () => {
    const r = evaluarMateriaSecaAguacate(19);
    expect(r.nivel).toBe('verde');
    expect(r.color).toBe('amber');
  });

  it('entre 21 y 23 % está en punto de norma', () => {
    expect(evaluarMateriaSecaAguacate(AGUACATE_MS_MINIMO_NORMA).nivel).toBe('norma');
    expect(evaluarMateriaSecaAguacate(22).nivel).toBe('norma');
  });

  it('desde 23 % está en punto óptimo', () => {
    expect(evaluarMateriaSecaAguacate(24).nivel).toBe('optimo');
    expect(evaluarMateriaSecaAguacate(24).color).toBe('emerald');
  });

  it('sin dato devuelve null', () => {
    expect(evaluarMateriaSecaAguacate('')).toBeNull();
    expect(evaluarMateriaSecaAguacate(null)).toBeNull();
  });
});

describe('catálogos grounded', () => {
  it('las dos recetas de curado son OPUESTAS (húmedo vs seco)', () => {
    expect(CURADO.raices.receta).toMatch(/húmedo/i);
    expect(CURADO.bulbos.receta).toMatch(/seco/i);
    expect(CURADO.raices.detalle.length).toBeGreaterThan(0);
    expect(CURADO.bulbos.detalle.length).toBeGreaterThan(0);
  });

  it('cada grano trae humedad segura, rango y fuente', () => {
    for (const g of Object.values(GRANOS)) {
      expect(g.humedadSegura).toBeGreaterThan(0);
      expect(g.humedadSeguraRango).toHaveLength(2);
      expect(g.fuente).toBeTruthy();
    }
    // El maíz debe estar en su rango seguro conocido (13–14 %).
    expect(GRANOS.maiz.humedadSeguraRango).toEqual([13, 14]);
  });

  it('el queso está marcado como punto crítico (pasteurizar)', () => {
    const queso = TRANSFORMACIONES.find((t) => t.id === 'queso');
    expect(queso.critico).toBe(true);
    expect(queso.puntoCritico).toMatch(/pasteuri/i);
  });

  it('cada transformación tiene punto crítico y fuente', () => {
    for (const t of TRANSFORMACIONES) {
      expect(t.puntoCritico).toBeTruthy();
      expect(t.fuente).toBeTruthy();
    }
  });

  it('el daño por frío lista tropicales con su umbral', () => {
    expect(DANIO_POR_FRIO.length).toBeGreaterThan(0);
    for (const d of DANIO_POR_FRIO) {
      expect(d.minC).toBeGreaterThan(0);
    }
  });

  it('la cifra de pérdida país está anclada a fuente', () => {
    expect(PERDIDA_PAIS.porcentajeOferta).toBe(34);
    expect(PERDIDA_PAIS.fuente).toMatch(/DNP/);
  });
});
