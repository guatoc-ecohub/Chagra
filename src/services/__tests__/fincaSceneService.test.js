import { describe, it, expect } from 'vitest';
import {
  spriteForStage,
  calcularVitalidad,
  etiquetaVitalidad,
  buildFincaScene,
} from '../fincaSceneService';

// ─── Fixtures: procesos REALES de finca (shape de farmProcessCache) ─────────

/** Proceso plano (como lo pasan tests/llamadas directas). */
function proc({ id, type = 'sowing', stage = 'vegetative', status = 'active', slug = 'zea_mays', label = 'Maíz' }) {
  return {
    process_id: id,
    process_type: type,
    current_stage: stage,
    status,
    subject_slug: slug,
    subject_label: label,
  };
}

/** Proceso anidado en .attributes (shape real del almacenamiento). */
function procAnidado({ id, type = 'sowing', stage = 'flowering', status = 'active', slug = 'coffea_arabica', label = 'Café' }) {
  return {
    process_id: id,
    type: 'farm_process',
    attributes: {
      process_type: type,
      current_stage: stage,
      status,
      subject_slug: slug,
      subject_label: label,
      location_zone_id: 'zona-1',
    },
  };
}

describe('fincaSceneService — spriteForStage (mapeo etapa→sprite)', () => {
  it('mapea cada etapa fenológica de cultivo a una fase coherente', () => {
    expect(spriteForStage('sowing_confirmed').fase).toBe('seed');
    expect(spriteForStage('germination').fase).toBe('sprout');
    expect(spriteForStage('vegetative').fase).toBe('leaf');
    expect(spriteForStage('flowering').fase).toBe('flower');
    expect(spriteForStage('fruiting').fase).toBe('fruit');
    expect(spriteForStage('harvest').fase).toBe('harvest');
  });

  it('el crecimiento visual aumenta de semilla a cosecha', () => {
    expect(spriteForStage('sowing_confirmed').growth)
      .toBeLessThan(spriteForStage('germination').growth);
    expect(spriteForStage('germination').growth)
      .toBeLessThan(spriteForStage('vegetative').growth);
    expect(spriteForStage('vegetative').growth)
      .toBeLessThan(spriteForStage('flowering').growth);
    expect(spriteForStage('flowering').growth)
      .toBeLessThan(spriteForStage('fruiting').growth);
    expect(spriteForStage('harvest').growth).toBe(1);
  });

  it('etapa de restauración usa hitos ecológicos (no fenología de cultivo)', () => {
    expect(spriteForStage('establecimiento').fase).toBe('sprout');
    expect(spriteForStage('cierre').sprite).toBe('tree');
  });

  it('etapa desconocida cae a un brote genérico, nunca rompe', () => {
    expect(spriteForStage('etapa_inexistente').sprite).toBe('sprout');
    expect(spriteForStage(undefined).sprite).toBe('sprout');
    expect(spriteForStage(null).fase).toBe('sprout');
  });

  it('cada etapa trae una etiqueta corta legible', () => {
    expect(spriteForStage('flowering').etiqueta).toBe('Florecida');
    expect(spriteForStage('harvest_window').etiqueta).toBe('Lista para cosechar');
  });
});

describe('fincaSceneService — calcularVitalidad (cero fabricación)', () => {
  it('finca sin cultivos activos → vitalidad 0', () => {
    expect(calcularVitalidad([])).toBe(0);
    expect(calcularVitalidad([{ activo: false, fase: 'harvest' }])).toBe(0);
  });

  it('una semilla recién puesta vale menos que una cosecha', () => {
    const semilla = calcularVitalidad([{ activo: true, fase: 'seed', subjectSlug: 'a' }]);
    const cosecha = calcularVitalidad([{ activo: true, fase: 'harvest', subjectSlug: 'a' }]);
    expect(semilla).toBeLessThan(cosecha);
  });

  it('más cultivos distintos → más vitalidad (diversidad), con techo', () => {
    const uno = calcularVitalidad([
      { activo: true, fase: 'leaf', subjectSlug: 'a' },
    ]);
    const varios = calcularVitalidad([
      { activo: true, fase: 'leaf', subjectSlug: 'a' },
      { activo: true, fase: 'leaf', subjectSlug: 'b' },
      { activo: true, fase: 'leaf', subjectSlug: 'c' },
    ]);
    expect(varios).toBeGreaterThan(uno);
  });

  it('vitalidad queda acotada a 0-100', () => {
    const muchos = Array.from({ length: 30 }, (_, i) => ({
      activo: true, fase: 'harvest', subjectSlug: `s${i}`,
    }));
    const v = calcularVitalidad(muchos);
    expect(v).toBeGreaterThanOrEqual(0);
    expect(v).toBeLessThanOrEqual(100);
  });
});

describe('fincaSceneService — etiquetaVitalidad', () => {
  it('da una etiqueta cariñosa y creciente', () => {
    expect(etiquetaVitalidad(0)).toMatch(/por sembrar/i);
    expect(etiquetaVitalidad(10)).toMatch(/empezando/i);
    expect(etiquetaVitalidad(40)).toMatch(/creciendo/i);
    expect(etiquetaVitalidad(60)).toMatch(/viva|fuerte/i);
    expect(etiquetaVitalidad(90)).toMatch(/floreciendo/i);
  });
});

describe('fincaSceneService — buildFincaScene (estado vacío)', () => {
  it('sin procesos → escena vacía que invita a sembrar', () => {
    const s = buildFincaScene({ processes: [] });
    expect(s.vacia).toBe(true);
    expect(s.lotes).toHaveLength(0);
    expect(s.vitalidad).toBe(0);
    expect(s.resumen).toMatch(/primera siembra/i);
  });

  it('procesos cancelados no cuentan como finca viva', () => {
    const s = buildFincaScene({ processes: [proc({ id: 'p1', status: 'cancelled' })] });
    expect(s.vacia).toBe(true);
    expect(s.lotes).toHaveLength(0);
  });
});

describe('fincaSceneService — buildFincaScene (datos reales)', () => {
  it('dibuja un lote por cultivo con su etapa real', () => {
    const s = buildFincaScene({
      processes: [
        proc({ id: 'p1', stage: 'flowering', slug: 'coffea_arabica', label: 'Café' }),
        proc({ id: 'p2', stage: 'harvest', slug: 'zea_mays', label: 'Maíz' }),
      ],
    });
    expect(s.vacia).toBe(false);
    expect(s.lotes).toHaveLength(2);
    const cafe = s.lotes.find((l) => l.nombre === 'Café');
    expect(cafe.fase).toBe('flower');
    expect(cafe.etiquetaEtapa).toBe('Florecida');
  });

  it('acepta procesos anidados en .attributes (shape real)', () => {
    const s = buildFincaScene({ processes: [procAnidado({ id: 'p1' })] });
    expect(s.lotes).toHaveLength(1);
    expect(s.lotes[0].nombre).toBe('Café');
    expect(s.lotes[0].fase).toBe('flower');
  });

  it('ordena los cultivos más maduros adelante (más visibles)', () => {
    const s = buildFincaScene({
      processes: [
        proc({ id: 'p1', stage: 'germination', slug: 'a' }),
        proc({ id: 'p2', stage: 'harvest', slug: 'b' }),
      ],
    });
    expect(s.lotes[0].fase).toBe('harvest');
  });

  it('cuenta cultivos activos y los que están en cosecha', () => {
    const s = buildFincaScene({
      processes: [
        proc({ id: 'p1', stage: 'harvest', slug: 'a' }),
        proc({ id: 'p2', stage: 'fruiting', slug: 'b' }),
        proc({ id: 'p3', stage: 'germination', slug: 'c' }),
      ],
    });
    expect(s.cultivosActivos).toBe(3);
    expect(s.enCosecha).toBe(2); // harvest + fruiting
  });

  it('separa animales (cerdos) en su propio corral', () => {
    const s = buildFincaScene({
      processes: [
        proc({ id: 'p1', stage: 'vegetative', slug: 'zea_mays', label: 'Maíz' }),
        proc({ id: 'a1', type: 'pigs', stage: 'engorde', slug: 'pigs', label: 'Cerdos' }),
      ],
    });
    expect(s.lotes).toHaveLength(1);
    expect(s.animales).toHaveLength(1);
    expect(s.animales[0].emoji).toBe('🐷');
    expect(s.animales[0].animal).toBe(true);
  });

  it('respeta el tope de lotes dibujados (rendimiento gama baja)', () => {
    const procesos = Array.from({ length: 20 }, (_, i) => proc({ id: `p${i}`, slug: `s${i}` }));
    const s = buildFincaScene({ processes: procesos, maxLotes: 12 });
    expect(s.lotes).toHaveLength(12);
    expect(s.totalCultivos).toBe(20);
  });

  it('una finca próspera tiene más vitalidad que una recién sembrada', () => {
    const recien = buildFincaScene({
      processes: [proc({ id: 'p1', stage: 'sowing_confirmed', slug: 'a' })],
    });
    const prospera = buildFincaScene({
      processes: [
        proc({ id: 'p1', stage: 'harvest', slug: 'a' }),
        proc({ id: 'p2', stage: 'fruiting', slug: 'b' }),
        proc({ id: 'p3', stage: 'flowering', slug: 'c' }),
      ],
    });
    expect(prospera.vitalidad).toBeGreaterThan(recien.vitalidad);
  });
});

describe('fincaSceneService — clima (opcional, sin fabricar)', () => {
  it('sin clima → solo sol', () => {
    const s = buildFincaScene({ processes: [proc({ id: 'p1' })] });
    expect(s.clima).toEqual(['sol']);
  });

  it('con lluvia → agrega lluvia a la escena', () => {
    const s = buildFincaScene({ processes: [proc({ id: 'p1' })], clima: { lluvia: true } });
    expect(s.clima).toContain('lluvia');
  });

  it('ENSO La Niña sugiere lluvia', () => {
    const s = buildFincaScene({ processes: [proc({ id: 'p1' })], clima: { ensoPhase: 'la_nina' } });
    expect(s.clima).toContain('lluvia');
  });
});
