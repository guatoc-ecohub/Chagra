import { describe, it, expect } from 'vitest';
import { estimarCostoIoT } from '../iotCostCalculator.js';

describe('estimarCostoIoT', () => {
  it('calcula costo con opciones por defecto', () => {
    const c = estimarCostoIoT();
    expect(c.hardware).toBeGreaterThan(0);
    expect(c.recurrente_mensual).toBe(21000);
    expect(c.total).toBe(c.hardware + c.recurrente_mensual);
    expect(c.fuente).toBeTruthy();
  });

  it('excluye camara si incluirCamara=false', () => {
    const con = estimarCostoIoT({ incluirCamara: true });
    const sin = estimarCostoIoT({ incluirCamara: false });
    expect(con.hardware).toBeGreaterThan(sin.hardware);
  });

  it('excluye SHT30 si incluirSHT30=false', () => {
    const con = estimarCostoIoT({ incluirSHT30: true });
    const sin = estimarCostoIoT({ incluirSHT30: false });
    expect(con.hardware).toBeGreaterThan(sin.hardware);
  });

  it('usa costo mayor para bateria LiFePO4', () => {
    const lipo = estimarCostoIoT({ bateria: 'LiFePO4' });
    const std = estimarCostoIoT({ bateria: '18650' });
    expect(lipo.hardware).toBeGreaterThan(std.hardware);
  });

  it('retorna objeto con fuente', () => {
    const c = estimarCostoIoT();
    expect(typeof c.fuente).toBe('string');
    expect(c.fuente.length).toBeGreaterThan(0);
  });
});
