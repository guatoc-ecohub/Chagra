import { describe, it, expect } from 'vitest';
import {
  getGenericFeedingTemplate,
  getGenericFeedingCategories,
  resolveGenericFeedingForSpecies,
  FITOSANITARIOS,
} from '../feedingPlanGeneric';

const NUTRITION_CATEGORIES = [
  'hortalizas_hoja',
  'hortalizas_fruto_flor',
  'tuberculos_raices',
  'granos_legumbres',
  'cereales',
];

// Slugs del seed que aportan nitrógeno vía biol (rico en N).
const N_BEARING_SLUG = 'biol';

describe('feedingPlanGeneric — getGenericFeedingCategories', () => {
  it('expone exactamente las 5 categorías de nutrición', () => {
    const cats = getGenericFeedingCategories();
    expect(cats).toHaveLength(5);
    for (const c of NUTRITION_CATEGORIES) {
      expect(cats).toContain(c);
    }
  });
});

describe('feedingPlanGeneric — cada categoría devuelve pasos', () => {
  for (const cat of NUTRITION_CATEGORIES) {
    it(`devuelve plantilla con pasos para ${cat}`, () => {
      const t = getGenericFeedingTemplate(cat);
      expect(t).toBeTruthy();
      expect(t.isGeneric).toBe(true);
      expect(t.confidence).toBe('baja');
      expect(t.category).toBe(cat);
      expect(Array.isArray(t.primary_steps)).toBe(true);
      expect(t.primary_steps.length).toBeGreaterThan(0);
      // Primer paso = abonado de fondo con bocashi.
      expect(t.primary_steps[0].biofertilizer_slug).toBe('bocashi');
      expect(t.primary_steps[0].offset_days).toBe(0);
    });
  }

  it('devuelve null para categoría desconocida', () => {
    expect(getGenericFeedingTemplate('categoria_inexistente')).toBeNull();
  });

  it('devuelve null para categorías sin plantilla de nutrición (perennes/sombra)', () => {
    expect(getGenericFeedingTemplate('frutales_perennes')).toBeNull();
    expect(getGenericFeedingTemplate('arboles_sombra')).toBeNull();
    expect(getGenericFeedingTemplate('medicinales_alelopaticas')).toBeNull();
    expect(getGenericFeedingTemplate('especies_invasoras')).toBeNull();
  });

  it('devuelve null para entradas no-string', () => {
    expect(getGenericFeedingTemplate(null)).toBeNull();
    expect(getGenericFeedingTemplate(undefined)).toBeNull();
    expect(getGenericFeedingTemplate('')).toBeNull();
    expect(getGenericFeedingTemplate(42)).toBeNull();
  });
});

describe('feedingPlanGeneric — dosis textuales del seed (no inventadas)', () => {
  it('todo paso con dosis numérica tiene texto de dosis del seed', () => {
    for (const cat of NUTRITION_CATEGORIES) {
      const t = getGenericFeedingTemplate(cat);
      for (const step of t.primary_steps) {
        // dose_text proviene del seed (dosis_aplicacion). Los biopreparados
        // usados (bocashi, biol, supermagro, humus_liquido, te_compost) sí lo
        // tienen, así que dose_text nunca debe ser null para esta selección.
        expect(step.dose_text).toBeTruthy();
        expect(typeof step.dose_text).toBe('string');
      }
    }
  });
});

describe('feedingPlanGeneric — leguminosas NO tienen paso de N', () => {
  it('la plantilla de granos_legumbres no aplica biol (rico en N)', () => {
    const t = getGenericFeedingTemplate('granos_legumbres');
    expect(t.isLegume).toBe(true);
    const slugs = t.primary_steps.map((s) => s.biofertilizer_slug);
    expect(slugs).not.toContain(N_BEARING_SLUG);
  });

  it('la plantilla de leguminosas incluye la nota explícita de no-N', () => {
    const t = getGenericFeedingTemplate('granos_legumbres');
    const joined = t.notes.join(' ');
    expect(joined).toMatch(/fijan su propio nitrógeno/i);
    expect(joined).toMatch(/NO aplicar biol/i);
  });

  it('las categorías no-leguminosas SÍ usan biol como aporte de N', () => {
    for (const cat of ['hortalizas_hoja', 'cereales']) {
      const slugs = getGenericFeedingTemplate(cat).primary_steps.map((s) => s.biofertilizer_slug);
      expect(slugs).toContain('biol');
    }
  });
});

describe('feedingPlanGeneric — ninguna plantilla contiene fitosanitarios', () => {
  it('ningún paso usa un biopreparado fitosanitario', () => {
    for (const cat of NUTRITION_CATEGORIES) {
      const t = getGenericFeedingTemplate(cat);
      const slugs = t.primary_steps.map((s) => s.biofertilizer_slug);
      for (const fito of FITOSANITARIOS) {
        expect(slugs).not.toContain(fito);
      }
    }
  });
});

describe('feedingPlanGeneric — toda plantilla está marcada como orientativa', () => {
  it('lleva la nota orientativa por tipo de cultivo', () => {
    for (const cat of NUTRITION_CATEGORIES) {
      const t = getGenericFeedingTemplate(cat);
      expect(t.notes.join(' ')).toMatch(/orientativo por tipo de cultivo/i);
    }
  });
});

describe('feedingPlanGeneric — resolveGenericFeedingForSpecies (override familia/rol)', () => {
  it('nitrogen_fixer en roles → plantilla legumbre (sin N), aunque su category sea otra', () => {
    const species = {
      id: 'canavalia_ensiformis',
      category: 'abonos_verdes_coberturas',
      familia_botanica: 'Fabaceae',
      roles_in_guild: ['nitrogen_fixer', 'ground_cover'],
    };
    const t = resolveGenericFeedingForSpecies(species);
    expect(t).toBeTruthy();
    expect(t.isLegume).toBe(true);
    expect(t.primary_steps.map((s) => s.biofertilizer_slug)).not.toContain('biol');
  });

  it('familia Fabaceae sin rol nitrogen_fixer también → plantilla legumbre', () => {
    const species = {
      id: 'phaseolus_vulgaris',
      category: 'granos_legumbres',
      familia_botanica: 'Fabaceae',
      roles_in_guild: ['crop'],
    };
    const t = resolveGenericFeedingForSpecies(species);
    expect(t.isLegume).toBe(true);
    expect(t.primary_steps.map((s) => s.biofertilizer_slug)).not.toContain('biol');
  });

  it('Solanaceae (no fijadora) → base por categoría + nota de calcio', () => {
    const species = {
      id: 'solanum_lycopersicum_san_marzano',
      category: 'hortalizas_fruto_flor',
      familia_botanica: 'Solanaceae',
      roles_in_guild: ['crop'],
    };
    const t = resolveGenericFeedingForSpecies(species);
    expect(t.isLegume).toBe(false);
    expect(t.category).toBe('hortalizas_fruto_flor');
    expect(t.notes.join(' ')).toMatch(/calcio/i);
    expect(t.notes.join(' ')).toMatch(/blossom-end rot|pudrición apical/i);
    // Hortaliza de fruto sí usa biol como N (no es leguminosa).
    expect(t.primary_steps.map((s) => s.biofertilizer_slug)).toContain('biol');
  });

  it('Brassicaceae → base por categoría + nota de azufre', () => {
    const species = {
      id: 'brassica_oleracea',
      category: 'hortalizas_hoja',
      familia_botanica: 'Brassicaceae',
      roles_in_guild: ['crop'],
    };
    const t = resolveGenericFeedingForSpecies(species);
    expect(t.category).toBe('hortalizas_hoja');
    expect(t.notes.join(' ')).toMatch(/azufre/i);
  });

  it('lechuga (Asteraceae hoja, no fijadora) → plantilla de hoja, sin override especial', () => {
    const species = {
      id: 'lactuca_sativa_crispa_verde',
      category: 'hortalizas_hoja',
      familia_botanica: 'Asteraceae',
      roles_in_guild: ['crop', 'ground_cover'],
    };
    const t = resolveGenericFeedingForSpecies(species);
    expect(t.category).toBe('hortalizas_hoja');
    expect(t.isLegume).toBe(false);
    expect(t.primary_steps.map((s) => s.biofertilizer_slug)).toContain('biol');
  });

  it('especie sin categoría con plantilla → null (degrada limpio)', () => {
    const species = {
      id: 'cedrela_odorata',
      category: 'arboles_sombra',
      familia_botanica: 'Meliaceae',
      roles_in_guild: ['timber'],
    };
    expect(resolveGenericFeedingForSpecies(species)).toBeNull();
  });

  it('entrada inválida → null', () => {
    expect(resolveGenericFeedingForSpecies(null)).toBeNull();
    expect(resolveGenericFeedingForSpecies(undefined)).toBeNull();
    expect(resolveGenericFeedingForSpecies('x')).toBeNull();
  });
});
