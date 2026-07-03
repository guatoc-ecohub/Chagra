import { describe, it, expect } from 'vitest';
import {
  describeSipsaPrice,
  formatCop,
  resolveSipsaProductForCycleSpecies,
} from '../sipsaPriceService.js';

describe('sipsaPriceService', () => {
  it('resuelve especies del ciclo al producto SIPSA correspondiente', () => {
    expect(resolveSipsaProductForCycleSpecies('maiz')).toBe('maiz');
    expect(resolveSipsaProductForCycleSpecies('papa')).toBe('papa');
    expect(resolveSipsaProductForCycleSpecies('cafe')).toBeNull();
  });

  it('formatea COP con separador colombiano', () => {
    expect(formatCop(1450)).toBe('$1.450');
    expect(formatCop(0)).toBeNull();
    expect(formatCop(null)).toBeNull();
  });

  it('describeSipsaPrice resume el precio vivo con texto coherente', () => {
    const summary = describeSipsaPrice(
      {
        available: true,
        price: {
          producto: 'Maiz',
          plaza: 'Corabastos',
          precio_promedio_cop_kg: 1450,
          fecha: '2026-07-01',
        },
        central_abastos: 'Corabastos, Bogotá',
        frescura: {
          fecha_dato: '2026-07-01',
          desactualizado: false,
        },
      },
      'maiz',
    );

    expect(summary.live).toBe(true);
    expect(summary.label).toBe('$1.450 COP/kg');
    expect(summary.sublabel).toContain('SIPSA');
    expect(summary.sublabel).toContain('Corabastos, Bogotá');
  });
});
