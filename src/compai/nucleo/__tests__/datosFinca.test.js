/**
 * datosFinca — el contrato de datos del compAI.
 *
 * Contratos que cuidamos:
 *   - agruparPorNombre: agrupa instancias ("Café #01".."Café #05") como UN
 *     cultivo, junta variantes sin tilde, excluye muerto/archivado, acepta
 *     las dos formas de nombre (farmOS y plano) y ordena de más a menos.
 *   - inventarioCompai: arma la forma completa que espera el comentarista.
 *   - ultimaCosecha: la más RECIENTE en el tiempo, no el timestamp con el
 *     número más grande — normaliza segundos y milisegundos antes de
 *     comparar. null si no hay ninguna con fecha usable.
 *   - datosDeMundo: la forma EXACTA por mundo, mezclando `extra` al final.
 *   - anti-fabricación: entradas vacías/basura nunca inventan datos ni
 *     lanzan excepción.
 */
import { describe, it, expect } from 'vitest';
import { agruparPorNombre, inventarioCompai, ultimaCosecha, datosDeMundo } from '../datosFinca';

describe('agruparPorNombre', () => {
  it('agrupa "Café #01".."Café #05" como UN cultivo con count 5', () => {
    const assets = Array.from({ length: 5 }, (_, i) => ({
      attributes: { name: `Café #0${i + 1}`, status: 'active' },
    }));
    const r = agruparPorNombre(assets);
    expect(r).toHaveLength(1);
    expect(r[0]).toEqual({ name: 'Café', count: 5 });
  });

  it('agrupa "Café" y "Cafe" (sin tilde) como el mismo cultivo', () => {
    const assets = [
      { attributes: { name: 'Café', status: 'active' } },
      { attributes: { name: 'Cafe', status: 'active' } },
    ];
    const r = agruparPorNombre(assets);
    expect(r).toHaveLength(1);
    expect(r[0].count).toBe(2);
  });

  it('excluye los assets muertos o archivados', () => {
    const assets = [
      { attributes: { name: 'Papa', status: 'active' } },
      { attributes: { name: 'Papa', status: 'dead' } },
      { attributes: { name: 'Papa', status: 'archived' } },
      { name: 'Papa', status: 'dead' }, // forma plana también se respeta
    ];
    const r = agruparPorNombre(assets);
    expect(r).toEqual([{ name: 'Papa', count: 1 }]);
  });

  it('acepta las dos formas de nombre: attributes.name (farmOS) y name (plano)', () => {
    const assets = [
      { attributes: { name: 'Uchuva', status: 'active' } },
      { name: 'Uchuva', status: 'active' },
    ];
    const r = agruparPorNombre(assets);
    expect(r).toEqual([{ name: 'Uchuva', count: 2 }]);
  });

  it('ordena de más a menos numeroso', () => {
    const assets = [
      { name: 'Fríjol', status: 'active' },
      { name: 'Café', status: 'active' },
      { name: 'Café', status: 'active' },
      { name: 'Café', status: 'active' },
      { name: 'Papa', status: 'active' },
      { name: 'Papa', status: 'active' },
    ];
    const r = agruparPorNombre(assets);
    expect(r.map((c) => c.name)).toEqual(['Café', 'Papa', 'Fríjol']);
    expect(r.map((c) => c.count)).toEqual([3, 2, 1]);
  });
});

describe('inventarioCompai', () => {
  it('devuelve cultivos/especies/total/matasTotal/cosechaReciente', () => {
    const inv = inventarioCompai({
      plants: [
        { name: 'Café #01', status: 'active' },
        { name: 'Café #02', status: 'active' },
        { name: 'Papa', status: 'active' },
      ],
      animales: [
        { name: 'Gallina', status: 'active' },
        { name: 'Gallina', status: 'active' },
      ],
      cosechas: [{ cultivo: 'Café', timestamp: 1_780_000_000 }],
    });
    expect(inv.cultivos).toEqual([
      { name: 'Café', count: 2 },
      { name: 'Papa', count: 1 },
    ]);
    expect(inv.especies).toEqual([{ name: 'Gallina', count: 2 }]);
    expect(inv.total).toBe(2);
    expect(inv.matasTotal).toBe(3);
    expect(inv.cosechaReciente).toEqual({ cultivo: 'Café', cuandoMs: 1_780_000_000_000 });
  });
});

describe('ultimaCosecha', () => {
  it('devuelve la de timestamp MÁS RECIENTE, no el número más grande (mezcla segundos/ms)', () => {
    // "vieja" viene en MILISEGUNDOS (2020) → número crudo GRANDE (>1e12).
    const vieja = { cultivo: 'Vieja', timestamp: new Date('2020-01-01').getTime() };
    // "nueva" viene en SEGUNDOS (2026) → número crudo chico, pero es la
    // fecha real más reciente una vez normalizado a ms.
    const nueva = { cultivo: 'Nueva', timestamp: Math.floor(new Date('2026-01-01').getTime() / 1000) };
    expect(vieja.timestamp).toBeGreaterThan(nueva.timestamp); // el crudo engaña
    const r = ultimaCosecha([vieja, nueva]);
    expect(r.cultivo).toBe('Nueva');
  });

  it('acepta timestamp en segundos y en milisegundos por igual', () => {
    const enSegundos = ultimaCosecha([{ cultivo: 'Café', timestamp: 1_700_000_000 }]);
    expect(enSegundos.cuandoMs).toBe(1_700_000_000_000);
    const enMs = ultimaCosecha([{ cultivo: 'Café', timestamp: 1_700_000_000_000 }]);
    expect(enMs.cuandoMs).toBe(1_700_000_000_000);
  });

  it('null si no hay ninguna cosecha con fecha usable', () => {
    expect(ultimaCosecha([])).toBeNull();
    expect(ultimaCosecha([{ cultivo: 'Café' }])).toBeNull(); // sin timestamp ni date
    expect(ultimaCosecha([{ cultivo: 'Café', date: 'fecha-invalida' }])).toBeNull();
    expect(ultimaCosecha(null)).toBeNull();
  });
});

describe('datosDeMundo — forma exacta por mundo', () => {
  const inventario = {
    cultivos: [{ name: 'Café', count: 4 }],
    especies: [{ name: 'Gallina', count: 6 }],
    total: 6,
    matasTotal: 4,
    cosechaReciente: null,
  };

  it('mis_matas / vender / finca reciben SOLO {cultivos, ...extra}', () => {
    for (const mundo of ['mis_matas', 'vender', 'finca']) {
      const d = datosDeMundo(mundo, inventario, { describirFase: () => 'x' });
      expect(d.cultivos).toEqual(inventario.cultivos);
      expect(d.especies).toBeUndefined();
      expect(d.describirFase).toBeTypeOf('function');
    }
  });

  it('mis_animales recibe {especies, total, ...extra}', () => {
    const d = datosDeMundo('mis_animales', inventario, { snapshot: { ok: true } });
    expect(d.especies).toEqual(inventario.especies);
    expect(d.total).toBe(6);
    expect(d.cultivos).toBeUndefined();
    expect(d.snapshot).toEqual({ ok: true });
  });

  it('mundos sin datos de finca (clima, bosque, paramo, aprender) sólo mezclan extra', () => {
    for (const mundo of ['clima', 'bosque', 'paramo', 'aprender']) {
      const d = datosDeMundo(mundo, inventario, { snapshot: { alertas: 1 } });
      expect(d.cultivos).toBeUndefined();
      expect(d.especies).toBeUndefined();
      expect(d.snapshot).toEqual({ alertas: 1 });
    }
  });
});

describe('anti-fabricación: entradas vacías/basura nunca inventan ni lanzan', () => {
  it('agruparPorNombre tolera null/undefined/no-array/basura', () => {
    expect(agruparPorNombre(null)).toEqual([]);
    expect(agruparPorNombre(undefined)).toEqual([]);
    expect(agruparPorNombre('no soy un array')).toEqual([]);
    expect(() => agruparPorNombre([null, undefined, {}, { attributes: {} }])).not.toThrow();
    expect(agruparPorNombre([null, undefined, {}, { attributes: {} }])).toEqual([]);
  });

  it('inventarioCompai sin fuentes no inventa nada', () => {
    expect(() => inventarioCompai()).not.toThrow();
    const inv = inventarioCompai();
    expect(inv).toEqual({
      cultivos: [],
      especies: [],
      total: 0,
      matasTotal: 0,
      cosechaReciente: null,
    });
    expect(() => inventarioCompai({})).not.toThrow();
  });

  it('ultimaCosecha tolera basura sin lanzar', () => {
    expect(() => ultimaCosecha('no soy un array')).not.toThrow();
    expect(ultimaCosecha('no soy un array')).toBeNull();
    expect(() => ultimaCosecha([null, undefined, 42, { cultivo: '', timestamp: 123 }])).not.toThrow();
    expect(ultimaCosecha([null, undefined, 42, { cultivo: '', timestamp: 123 }])).toBeNull();
  });

  it('datosDeMundo tolera inventario/extra nulos sin lanzar', () => {
    expect(() => datosDeMundo('mis_matas', null, null)).not.toThrow();
    expect(datosDeMundo('mis_matas', null, null)).toEqual({ cultivos: [] });
    expect(() => datosDeMundo('mundo_inventado')).not.toThrow();
    expect(datosDeMundo('mundo_inventado')).toEqual({});
  });
});
