import { describe, it, expect } from 'vitest';
import { getPisoTermicoInfo, PISO_TERMICO_INFO } from '../locationService.js';

describe('locationService (#201) — piso térmico offline-safe', () => {
  it('clasifica cálido a baja altitud', () => {
    const info = getPisoTermicoInfo(500);
    expect(info.slug).toBe('cálido');
    expect(info.cultivos.length).toBeGreaterThan(0);
  });

  it('clasifica templado en zona cafetera', () => {
    expect(getPisoTermicoInfo(1500).slug).toBe('templado');
  });

  it('clasifica frío en sabana', () => {
    expect(getPisoTermicoInfo(2600).slug).toBe('frío');
  });

  it('clasifica páramo', () => {
    expect(getPisoTermicoInfo(3200).slug).toBe('páramo');
  });

  it('null para altitud inválida', () => {
    expect(getPisoTermicoInfo(null)).toBeNull();
    expect(getPisoTermicoInfo(-50)).toBeNull();
    expect(getPisoTermicoInfo('abc')).toBeNull();
  });

  it('cada piso térmico tiene color, rango y cultivos', () => {
    for (const info of Object.values(PISO_TERMICO_INFO)) {
      expect(info.color).toBeTruthy();
      expect(info.rango).toBeTruthy();
      expect(Array.isArray(info.cultivos)).toBe(true);
    }
  });
});
