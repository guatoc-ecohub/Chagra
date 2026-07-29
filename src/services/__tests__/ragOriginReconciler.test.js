import { describe, it, expect } from 'vitest';
import {
  classifyPassageOrigin,
  tagPassagesOrigin,
  reconcileOrigins,
  foreignOriginSuffix,
} from '../ragOriginReconciler.js';

describe('classifyPassageOrigin', () => {
  it('sin señal estructurada → unknown (NUNCA asume Colombia)', () => {
    expect(classifyPassageOrigin({ species: 'x', text: 'algo', key: 'valor_pedagogico' }))
      .toEqual({ tag: 'unknown', label: null });
  });

  it('input inválido → unknown', () => {
    expect(classifyPassageOrigin(null)).toEqual({ tag: 'unknown', label: null });
    expect(classifyPassageOrigin(undefined)).toEqual({ tag: 'unknown', label: null });
    expect(classifyPassageOrigin('no-object')).toEqual({ tag: 'unknown', label: null });
  });

  it('campo origin explícito "co" → co', () => {
    expect(classifyPassageOrigin({ text: 'x', origin: 'co' }).tag).toBe('co');
    expect(classifyPassageOrigin({ text: 'x', origin: 'Colombia' }).tag).toBe('co');
    expect(classifyPassageOrigin({ text: 'x', origen: 'NACIONAL' }).tag).toBe('co');
  });

  it('campo origin explícito foráneo → foreign', () => {
    expect(classifyPassageOrigin({ text: 'x', origin: 'foreign' }).tag).toBe('foreign');
    expect(classifyPassageOrigin({ text: 'x', origin: 'foráneo' }).tag).toBe('foreign');
    expect(classifyPassageOrigin({ text: 'x', origin: 'non-co' }).tag).toBe('foreign');
  });

  it('país/continente estructurado no colombiano → foreign con label real', () => {
    expect(classifyPassageOrigin({ text: 'x', continente: 'Asia' }))
      .toEqual({ tag: 'foreign', label: 'Asia' });
    expect(classifyPassageOrigin({ text: 'x', pais: 'México' }))
      .toEqual({ tag: 'foreign', label: 'México' });
  });

  it('país estructurado = Colombia → co (sin label)', () => {
    expect(classifyPassageOrigin({ text: 'x', pais: 'Colombia' }))
      .toEqual({ tag: 'co', label: null });
  });

  it('campo origin foráneo conserva el país estructurado como label', () => {
    expect(classifyPassageOrigin({ text: 'x', origin: 'foreign', pais: 'Perú' }))
      .toEqual({ tag: 'foreign', label: 'Perú' });
  });

  it('key con marcador colombiano estructurado → co', () => {
    expect(classifyPassageOrigin({ text: 'x', key: 'diferenciador_colombiano' }).tag).toBe('co');
    expect(classifyPassageOrigin({ text: 'x', key: 'convergencia_dr_034' }).tag).toBe('co');
    expect(classifyPassageOrigin({ text: 'x', key: 'leccion_agroecologica' }).tag).toBe('co');
  });

  it('origin explícito tiene precedencia sobre key', () => {
    // key dice Co pero origin dice foráneo → gana origin (más autoritativo)
    expect(classifyPassageOrigin({ text: 'x', key: 'diferenciador_colombiano', origin: 'foreign' }).tag)
      .toBe('foreign');
  });

  it('establishment_means NO fuerza clasificación (anti-alucinación)', () => {
    // nativo no implica "conocimiento colombiano"; introducido no implica foráneo
    const nat = classifyPassageOrigin({ text: 'x' }, { establishmentMeans: { x: 'nativo' } });
    expect(nat.tag).toBe('unknown');
    const intro = classifyPassageOrigin({ text: 'x' }, { establishmentMeans: { x: 'introducido' } });
    expect(intro.tag).toBe('unknown');
  });
});

describe('tagPassagesOrigin', () => {
  it('etiqueta sin mutar los originales', () => {
    const passages = [{ text: 'a', key: 'diferenciador_colombiano' }, { text: 'b' }];
    const tagged = tagPassagesOrigin(passages);
    expect(tagged[0]._origin).toBe('co');
    expect(tagged[1]._origin).toBe('unknown');
    expect(passages[0]).not.toHaveProperty('_origin'); // original intacto
  });

  it('input no-array → []', () => {
    expect(tagPassagesOrigin(null)).toEqual([]);
    expect(tagPassagesOrigin(/** @type {any} */ ('x'))).toEqual([]);
  });
});

describe('reconcileOrigins', () => {
  it('coloca colombiano primero, luego desconocido; foráneo aparte', () => {
    const tagged = [
      { text: 'foraneo1', _origin: 'foreign' },
      { text: 'co1', _origin: 'co' },
      { text: 'desconocido1', _origin: 'unknown' },
      { text: 'co2', _origin: 'co' },
    ];
    const r = reconcileOrigins(tagged);
    expect(r.local.map((p) => p.text)).toEqual(['co1', 'co2', 'desconocido1']);
    expect(r.foreign.map((p) => p.text)).toEqual(['foraneo1']);
    expect(r.onlyForeign).toBe(false);
    expect(r.counts).toEqual({ co: 2, unknown: 1, foreign: 1 });
  });

  it('preserva el orden por score dentro de cada grupo', () => {
    const tagged = [
      { text: 'co-alto', _origin: 'co' },
      { text: 'co-medio', _origin: 'co' },
      { text: 'co-bajo', _origin: 'co' },
    ];
    const r = reconcileOrigins(tagged);
    expect(r.local.map((p) => p.text)).toEqual(['co-alto', 'co-medio', 'co-bajo']);
  });

  it('onlyForeign=true cuando SOLO hay pasajes foráneos', () => {
    const tagged = [
      { text: 'f1', _origin: 'foreign' },
      { text: 'f2', _origin: 'foreign' },
    ];
    const r = reconcileOrigins(tagged);
    expect(r.local).toEqual([]);
    expect(r.foreign.length).toBe(2);
    expect(r.onlyForeign).toBe(true);
  });

  it('onlyForeign=false cuando hay solo desconocidos (no foráneos)', () => {
    const r = reconcileOrigins([{ text: 'u', _origin: 'unknown' }]);
    expect(r.onlyForeign).toBe(false);
    expect(r.local.length).toBe(1);
  });

  it('lista vacía / inválida → grupos vacíos, onlyForeign false', () => {
    expect(reconcileOrigins([])).toEqual({
      local: [], foreign: [], onlyForeign: false, counts: { co: 0, unknown: 0, foreign: 0 },
    });
    expect(reconcileOrigins(null).onlyForeign).toBe(false);
  });

  it('pasaje sin _origin se trata como unknown (no como co)', () => {
    const r = reconcileOrigins([{ text: 'sin-tag' }]);
    expect(r.counts.unknown).toBe(1);
    expect(r.counts.co).toBe(0);
  });
});

describe('foreignOriginSuffix', () => {
  it('usa el label estructurado real cuando existe', () => {
    expect(foreignOriginSuffix({ _originLabel: 'Asia' })).toBe(' [origen: Asia]');
  });

  it('genérico cuando NO hay label (no inventa geografía)', () => {
    expect(foreignOriginSuffix({})).toBe(' [origen: fuera de Colombia]');
    expect(foreignOriginSuffix({ _originLabel: '' })).toBe(' [origen: fuera de Colombia]');
    expect(foreignOriginSuffix(null)).toBe(' [origen: fuera de Colombia]');
  });
});

describe('integración tag → reconcile (flujo real)', () => {
  it('clasifica y reconcilia un lote mixto del corpus', () => {
    const passages = [
      { species: 'fresa', text: 'Cundinamarca produce el 73%...', key: 'diferenciador_colombiano' },
      { species: 'jamaica', text: 'originaria de África occidental...', continente: 'África' },
      { species: 'cafe', text: 'crece entre 1200-1800 msnm', key: 'valor_pedagogico' },
    ];
    const r = reconcileOrigins(tagPassagesOrigin(passages));
    expect(r.counts).toEqual({ co: 1, unknown: 1, foreign: 1 });
    expect(r.local.map((p) => p.species)).toEqual(['fresa', 'cafe']);
    expect(r.foreign[0].species).toBe('jamaica');
    expect(r.foreign[0]._originLabel).toBe('África');
    expect(foreignOriginSuffix(r.foreign[0])).toBe(' [origen: África]');
  });
});
