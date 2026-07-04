/**
 * encaladoCalculator — cobertura de la matemática DETERMINISTA de encalado.
 *
 * Verifica que:
 *   - CICE y saturación de aluminio son aritmética pura y correcta.
 *   - La fórmula de Cochrane (1980) produce el requerimiento esperado.
 *   - Si el aluminio no justifica cal, la dosis es 0 (no se sobre-encala).
 *   - El PRNT de la fuente sube el producto físico requerido.
 *   - Las guardas de seguridad se activan en los casos de riesgo.
 */
import { describe, it, expect } from 'vitest';
import {
  calcularCICE,
  calcularSaturacionAluminio,
  interpretarSaturacionAl,
  calcularDosisCal,
  guardasEncalado,
  FUENTES_CAL,
  COEF_COCHRANE_DEFAULT,
  FACTOR_THA_POR_CMOL_20CM_DEFAULT,
} from '../encaladoCalculator';

describe('CICE y saturación de aluminio (aritmética pura)', () => {
  it('CICE suma Al + Ca + Mg + K', () => {
    expect(calcularCICE({ al: 1.8, ca: 2.5, mg: 0.8, k: 0.3 })).toBeCloseTo(5.4, 6);
  });

  it('CICE con K ausente lo trata como 0', () => {
    expect(calcularCICE({ al: 1, ca: 2, mg: 1 })).toBeCloseTo(4, 6);
  });

  it('saturación de Al = Al / CICE × 100', () => {
    // 1.8 / 5.4 = 33.33%
    expect(calcularSaturacionAluminio({ al: 1.8, ca: 2.5, mg: 0.8, k: 0.3 })).toBeCloseTo(33.333, 2);
  });

  it('CICE = 0 → saturación null (sin división por cero)', () => {
    expect(calcularSaturacionAluminio({ al: 0, ca: 0, mg: 0, k: 0 })).toBeNull();
  });
});

describe('interpretarSaturacionAl — niveles cualitativos', () => {
  it('clasifica por umbrales', () => {
    expect(interpretarSaturacionAl(5).nivel).toBe('bajo');
    expect(interpretarSaturacionAl(20).nivel).toBe('moderado');
    expect(interpretarSaturacionAl(40).nivel).toBe('alto');
    expect(interpretarSaturacionAl(70).nivel).toBe('muy_alto');
    expect(interpretarSaturacionAl(null).nivel).toBe('sin_datos');
  });
});

describe('calcularDosisCal — fórmula de Cochrane (1980)', () => {
  it('calcula el requerimiento con el coeficiente y factor por defecto', () => {
    const bases = { al: 1.8, ca: 2.5, mg: 0.8, k: 0.3 }; // CICE 5.4, satAl 33.3%
    const r = calcularDosisCal(bases, { saturacionObjetivo: 25, fuente: 'cal_dolomita' });
    // exceso = 1.8 - 0.25*5.4 = 1.8 - 1.35 = 0.45
    // req = 1.5 * 0.45 = 0.675 cmol/kg
    expect(r.requerimientoCmol).toBeCloseTo(0.68, 1);
    expect(COEF_COCHRANE_DEFAULT).toBe(1.5);
    // CaCO3 puro = 0.675 * 1.2 = 0.81 t/ha
    expect(r.dosisCaCO3Tha).toBeCloseTo(0.81, 1);
    // ajuste PRNT 95% → 0.81 / 0.95 ≈ 0.85 t/ha
    expect(r.dosisRealTha).toBeCloseTo(0.85, 1);
    expect(r.necesitaCal).toBe(true);
    expect(FACTOR_THA_POR_CMOL_20CM_DEFAULT).toBe(1.2);
  });

  it('no requiere cal si la saturación de Al ya está bajo el objetivo', () => {
    const bases = { al: 0.2, ca: 4, mg: 1.5, k: 0.4 }; // satAl ~3.3%
    const r = calcularDosisCal(bases, { saturacionObjetivo: 25 });
    expect(r.necesitaCal).toBe(false);
    expect(r.requerimientoCmol).toBe(0);
    expect(r.dosisRealTha).toBe(0);
  });

  it('la cal de menor PRNT exige más producto físico', () => {
    const bases = { al: 2, ca: 1, mg: 0.5, k: 0.2 };
    const dolomita = calcularDosisCal(bases, { fuente: 'cal_dolomita' }); // PRNT 95
    const viva = calcularDosisCal(bases, { fuente: 'cal_viva' }); // PRNT 130
    // Más PRNT → menos producto. La cal viva (130) exige menos que la dolomita (95).
    expect(viva.dosisRealTha).toBeLessThan(dolomita.dosisRealTha);
    // Ambas parten del mismo CaCO3 puro.
    expect(viva.dosisCaCO3Tha).toBeCloseTo(dolomita.dosisCaCO3Tha, 6);
  });

  it('expone los supuestos grounded-pendiente para transparencia', () => {
    const r = calcularDosisCal({ al: 2, ca: 1, mg: 1 });
    expect(r.supuestos.groundedPendiente.length).toBeGreaterThanOrEqual(4);
    expect(r.supuestos.profundidadCm).toBe(20);
    expect(FUENTES_CAL.cal_dolomita.prnt).toBeGreaterThan(0);
  });
});

describe('guardasEncalado — seguridad', () => {
  it('avisa si la saturación de Al es baja (no sobre-encalar)', () => {
    const avisos = guardasEncalado({ al: 0.2, ca: 4, mg: 1 }, 5);
    expect(avisos.some((a) => /baja/i.test(a))).toBe(true);
  });

  it('sugiere dolomita si el calcio supera mucho al magnesio', () => {
    const avisos = guardasEncalado({ al: 2, ca: 6, mg: 0.5 }, 40);
    expect(avisos.some((a) => /dolomita/i.test(a))).toBe(true);
  });

  it('siempre advierte no mezclar con urea/estiércol fresco', () => {
    const avisos = guardasEncalado({ al: 2, ca: 2, mg: 1 }, 30);
    expect(avisos.some((a) => /urea|estiércol/i.test(a))).toBe(true);
  });
});
