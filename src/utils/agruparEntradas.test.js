import { describe, it, expect } from 'vitest';
import {
  stripInstanceSuffix,
  dayBucket,
  formatFechaSiembra,
  claveMataAgrupada,
  agruparEntradas,
} from './agruparEntradas';

describe('stripInstanceSuffix', () => {
  it('quita el sufijo " #NN" de matas individuales', () => {
    expect(stripInstanceSuffix('Fresa #01')).toBe('Fresa');
    expect(stripInstanceSuffix('Tomate #007')).toBe('Tomate');
    expect(stripInstanceSuffix('Maíz común #12')).toBe('Maíz común');
  });
  it('deja el nombre intacto si no hay sufijo', () => {
    expect(stripInstanceSuffix('Fresa')).toBe('Fresa');
    expect(stripInstanceSuffix('Lote #A no es índice')).toBe('Lote #A no es índice');
  });
  it('es robusto ante entradas no-string', () => {
    expect(stripInstanceSuffix(undefined)).toBe('');
    expect(stripInstanceSuffix(null)).toBe('');
    expect(stripInstanceSuffix(42)).toBe('');
  });
});

describe('dayBucket', () => {
  it('extrae el día de un string ISO o YYYY-MM-DD', () => {
    expect(dayBucket('2026-03-04')).toBe('2026-03-04');
    expect(dayBucket('2026-03-04T15:30:00Z')).toBe('2026-03-04');
  });
  it('agrupa timestamps del mismo día que difieren en milisegundos', () => {
    const base = new Date(2026, 2, 4, 10, 0, 0, 0).getTime();
    expect(dayBucket(base)).toBe(dayBucket(base + 3)); // misma siembra, +3ms
  });
  it('devuelve "" para fechas ausentes o inválidas', () => {
    expect(dayBucket(null)).toBe('');
    expect(dayBucket(undefined)).toBe('');
    expect(dayBucket('')).toBe('');
    expect(dayBucket('no-es-fecha')).toBe('');
  });
});

describe('formatFechaSiembra', () => {
  it('formatea a "día mes" en español', () => {
    expect(formatFechaSiembra('2026-03-04')).toBe('4 mar');
    expect(formatFechaSiembra('2026-12-25')).toBe('25 dic');
  });
  it('devuelve "" sin fecha', () => {
    expect(formatFechaSiembra(null)).toBe('');
  });
});

describe('claveMataAgrupada', () => {
  it('agrupa por especie + fecha + lote', () => {
    const a = claveMataAgrupada({ species: 'fragaria_ananassa', date: '2026-03-04', bed: 'cama-1' });
    const b = claveMataAgrupada({ species: 'fragaria_ananassa', date: '2026-03-04T09:00:00Z', bed: 'cama-1' });
    expect(a).toBe(b);
  });
  it('separa especies distintas', () => {
    const fresa = claveMataAgrupada({ species: 'fresa', date: '2026-03-04', bed: 'c1' });
    const tomate = claveMataAgrupada({ species: 'tomate', date: '2026-03-04', bed: 'c1' });
    expect(fresa).not.toBe(tomate);
  });
  it('separa distinto lote y distinta fecha', () => {
    const c1 = claveMataAgrupada({ species: 'fresa', date: '2026-03-04', bed: 'c1' });
    const c2 = claveMataAgrupada({ species: 'fresa', date: '2026-03-04', bed: 'c2' });
    const d2 = claveMataAgrupada({ species: 'fresa', date: '2026-03-05', bed: 'c1' });
    expect(new Set([c1, c2, d2]).size).toBe(3);
  });
  it('deriva la especie del nombre (quitando "#NN") si no hay slug', () => {
    const k1 = claveMataAgrupada({ name: 'Fresa #01', date: '2026-03-04', bed: 'c1' });
    const k2 = claveMataAgrupada({ name: 'Fresa #20', date: '2026-03-04', bed: 'c1' });
    expect(k1).toBe(k2);
  });
  it('sin especie identificable devuelve "" (no agrupa)', () => {
    expect(claveMataAgrupada({ date: '2026-03-04', bed: 'c1' })).toBe('');
    expect(claveMataAgrupada({})).toBe('');
  });
});

describe('agruparEntradas', () => {
  const mkAsset = (i, name, slug, date, bed) => ({
    id: `id-${i}`,
    attributes: { name, _speciesSlug: slug, _chagra_plant_meta: { fecha_germinacion: date } },
    _bed: bed,
  });
  const keyOf = (a) => claveMataAgrupada({
    species: a.attributes._speciesSlug,
    name: a.attributes.name,
    date: a.attributes._chagra_plant_meta?.fecha_germinacion,
    bed: a._bed,
  });

  it('colapsa 20 fresas idénticas en un solo grupo', () => {
    const items = Array.from({ length: 20 }, (_, i) =>
      mkAsset(i, `Fresa #${String(i + 1).padStart(2, '0')}`, 'fragaria_ananassa', '2026-03-04', 'cama-1'),
    );
    const groups = agruparEntradas(items, keyOf);
    expect(groups).toHaveLength(1);
    expect(groups[0].count).toBe(20);
    expect(groups[0].grouped).toBe(true);
    expect(groups[0].representative.id).toBe('id-0');
    expect(groups[0].items).toHaveLength(20); // no se pierde ninguna
  });

  it('no colapsa matas de distinto lote', () => {
    const items = [
      mkAsset(0, 'Fresa #01', 'fresa', '2026-03-04', 'cama-1'),
      mkAsset(1, 'Fresa #02', 'fresa', '2026-03-04', 'cama-2'),
    ];
    const groups = agruparEntradas(items, keyOf);
    expect(groups).toHaveLength(2);
    expect(groups.every((g) => g.grouped === false)).toBe(true);
  });

  it('una sola mata queda como grupo no colapsado', () => {
    const groups = agruparEntradas([mkAsset(0, 'Fresa', 'fresa', '2026-03-04', 'c1')], keyOf);
    expect(groups).toHaveLength(1);
    expect(groups[0].grouped).toBe(false);
    expect(groups[0].count).toBe(1);
  });

  it('mezcla: agrupa las repetidas y deja las únicas sueltas, preservando orden', () => {
    const items = [
      mkAsset(0, 'Fresa #01', 'fresa', '2026-03-04', 'c1'),
      mkAsset(1, 'Fresa #02', 'fresa', '2026-03-04', 'c1'),
      mkAsset(2, 'Tomate', 'tomate', '2026-03-01', 'c1'),
      mkAsset(3, 'Fresa #03', 'fresa', '2026-03-04', 'c1'),
    ];
    const groups = agruparEntradas(items, keyOf);
    // Fresa (3, primera aparición idx0) + Tomate (1, idx2)
    expect(groups).toHaveLength(2);
    expect(groups[0].key).toContain('fresa');
    expect(groups[0].count).toBe(3);
    expect(groups[0].grouped).toBe(true);
    expect(groups[1].count).toBe(1);
    expect(groups[1].grouped).toBe(false);
  });

  it('claves nulas nunca colapsan entre sí (grupos unitarios)', () => {
    const items = [{ x: 1 }, { x: 2 }, { x: 3 }];
    const groups = agruparEntradas(items, () => null);
    expect(groups).toHaveLength(3);
    expect(groups.every((g) => g.grouped === false && g.count === 1)).toBe(true);
  });

  it('respeta minGroupSize', () => {
    const items = [
      mkAsset(0, 'Fresa #01', 'fresa', '2026-03-04', 'c1'),
      mkAsset(1, 'Fresa #02', 'fresa', '2026-03-04', 'c1'),
    ];
    expect(agruparEntradas(items, keyOf, { minGroupSize: 3 })[0].grouped).toBe(false);
    expect(agruparEntradas(items, keyOf, { minGroupSize: 2 })[0].grouped).toBe(true);
  });

  it('es robusto ante entrada no-array', () => {
    expect(agruparEntradas(null, keyOf)).toEqual([]);
    expect(agruparEntradas(undefined, keyOf)).toEqual([]);
  });

  it('no lanza si keyOf falla en un item', () => {
    const items = [{ ok: true }, { ok: false }];
    const groups = agruparEntradas(items, (it) => {
      if (!it.ok) throw new Error('boom');
      return 'k';
    });
    expect(groups).toHaveLength(2); // el que falló cae a grupo unitario
  });
});
