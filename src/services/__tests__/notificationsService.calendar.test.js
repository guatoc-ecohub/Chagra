import { describe, it, expect } from 'vitest';
import { resolveCalendarMonth } from '../notificationsService.js';

describe('resolveCalendarMonth', () => {
  it('retorna null para zona nula', () => {
    expect(resolveCalendarMonth(null)).toBeNull();
    expect(resolveCalendarMonth(undefined)).toBeNull();
    expect(resolveCalendarMonth('')).toBeNull();
  });

  it('retorna null para zona desconocida', () => {
    expect(resolveCalendarMonth('zona_inexistente')).toBeNull();
  });

  it('resuelve cultivos para andino_medio', () => {
    const r = resolveCalendarMonth('andino_medio');
    expect(r).not.toBeNull();
    expect(r.month).toBeTruthy();
    expect(Array.isArray(r.cultivos)).toBe(true);
    expect(r.cultivos.length).toBeGreaterThan(0);
  });

  it('resuelve cultivos para andino_alto_paramo', () => {
    const r = resolveCalendarMonth('andino_alto_paramo');
    expect(r).not.toBeNull();
    expect(Array.isArray(r.cultivos)).toBe(true);
  });

  it('resuelve cultivos para andino_bajo', () => {
    const r = resolveCalendarMonth('andino_bajo');
    expect(r).not.toBeNull();
    expect(Array.isArray(r.cultivos)).toBe(true);
  });

  it('resuelve cultivos para pacifico_humedo', () => {
    const r = resolveCalendarMonth('pacifico_humedo');
    expect(r).not.toBeNull();
    expect(Array.isArray(r.cultivos)).toBe(true);
  });

  it('resuelve cultivos para caribe_seco', () => {
    const r = resolveCalendarMonth('caribe_seco');
    expect(r).not.toBeNull();
    expect(Array.isArray(r.cultivos)).toBe(true);
  });

  it('normaliza guiones a underscores', () => {
    const r = resolveCalendarMonth('andino-medio');
    expect(r).not.toBeNull();
    expect(r.cultivos.length).toBeGreaterThan(0);
  });

  it('retorna siempre 3 cultivos para cada zona/mes', () => {
    for (const zone of ['andino_alto_paramo', 'andino_medio', 'andino_bajo', 'caribe_seco', 'pacifico_humedo', 'amazonia']) {
      for (let m = 1; m <= 12; m++) {
        // Mockeamos el mes actual para iterar todos
        const originalGetMonth = Date.prototype.getMonth;
        Date.prototype.getMonth = () => m - 1;
        const r = resolveCalendarMonth(zone);
        Date.prototype.getMonth = originalGetMonth;
        if (r && r.cultivos) {
          expect(r.cultivos.length).toBe(3);
        }
      }
    }
  });
});
