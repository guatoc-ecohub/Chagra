import { describe, it, expect } from 'vitest';
import { normalizarPrecioSIPSA } from '../services/datosAbiertos.js';

describe('datosAbiertos — SIPSA', () => {
  it('normaliza precio de kg a libra', () => {
    const result = normalizarPrecioSIPSA({
      producto: 'Papa pastusa',
      precio_kg: 4800,
      ciudad: 'Bogotá',
    });
    expect(result.producto).toBe('Papa pastusa');
    expect(result.precio_libra).toBe(2177); // 4800 / 2.2046 ≈ 2177
    expect(result.ciudad).toBe('Bogotá');
    expect(result.fuente).toBe('SIPSA-DANE');
  });
});
