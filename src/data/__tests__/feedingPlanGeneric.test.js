import { describe, it, expect } from 'vitest';
import {
  getGenericFeedingTemplate,
  getGenericFeedingCategories,
  resolveGenericFeedingForSpecies,
  FITOSANITARIOS,
} from '../feedingPlanGeneric';

// Categorías ANUALES de hortaliza/grano: comparten el patrón de validación
// estricto (abonado de fondo con bocashi a offset 0, biol como N, supermagro
// con tope 10%, dosis foliar corta, etc.).
const NUTRITION_CATEGORIES = [
  'hortalizas_hoja',
  'hortalizas_fruto_flor',
  'tuberculos_raices',
  'granos_legumbres',
  'cereales',
];

// Categorías PERENNES (frutal / árbol de sombra-servicio): tienen su propio
// patrón (esquema anual recurrente, abono en la gotera/corona, mulch, mínima
// fertilización en árboles de servicio). Validación de estructura básica.
const PERENNIAL_CATEGORIES = ['frutales_perennes', 'arboles_sombra'];

// Todas las categorías con plantilla de nutrición (anuales + perennes).
const ALL_FEEDING_CATEGORIES = [...NUTRITION_CATEGORIES, ...PERENNIAL_CATEGORIES];

// Slugs del seed que aportan nitrógeno vía biol (rico en N).
const N_BEARING_SLUG = 'biol';

describe('feedingPlanGeneric — getGenericFeedingCategories', () => {
  it('expone exactamente las 7 categorías de nutrición (anuales + perennes)', () => {
    const cats = getGenericFeedingCategories();
    expect(cats).toHaveLength(7);
    for (const c of ALL_FEEDING_CATEGORIES) {
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
      // Primer paso = suelo (pre-siembra, offset negativo).
      expect(t.primary_steps[0].offset_days).toBeLessThan(0);
      // Abonado de fondo con bocashi = primer paso post-siembra (offset 0).
      const fondo = t.primary_steps.find((s) => s.offset_days === 0);
      expect(fondo).toBeTruthy();
      expect(fondo.biofertilizer_slug).toBe('bocashi');
    });
  }

  it('devuelve null para categoría desconocida', () => {
    expect(getGenericFeedingTemplate('categoria_inexistente')).toBeNull();
  });

  it('devuelve null para categorías sin plantilla de nutrición (medicinales/invasoras)', () => {
    expect(getGenericFeedingTemplate('medicinales_alelopaticas')).toBeNull();
    expect(getGenericFeedingTemplate('especies_invasoras')).toBeNull();
    expect(getGenericFeedingTemplate('ornamentales_nativas')).toBeNull();
    expect(getGenericFeedingTemplate('cercas_vivas')).toBeNull();
  });

  it('devuelve null para entradas no-string', () => {
    expect(getGenericFeedingTemplate(null)).toBeNull();
    expect(getGenericFeedingTemplate(undefined)).toBeNull();
    expect(getGenericFeedingTemplate('')).toBeNull();
    expect(getGenericFeedingTemplate(/** @type {any} */ (42))).toBeNull();
  });
});

describe('feedingPlanGeneric — plantillas perennes (frutal / árbol de servicio)', () => {
  for (const cat of PERENNIAL_CATEGORIES) {
    it(`devuelve plantilla con estructura válida para ${cat}`, () => {
      const t = getGenericFeedingTemplate(cat);
      expect(t).toBeTruthy();
      expect(t.isGeneric).toBe(true);
      expect(t.confidence).toBe('baja');
      expect(t.category).toBe(cat);
      expect(Array.isArray(t.notes)).toBe(true);
      expect(Array.isArray(t.primary_steps)).toBe(true);
      expect(t.primary_steps.length).toBeGreaterThan(0);
      // Paso 0 de suelo presente (cal/roca fosfórica), antepuesto por template().
      const slugs = t.primary_steps.map((s) => s.biofertilizer_slug);
      expect(slugs).toContain('cal_dolomita');
      expect(slugs).toContain('roca_fosforica');
      // Abono de fondo al sembrar (bocashi/compost) en el hoyo, a offset 0.
      const fondo = t.primary_steps.find((s) => s.offset_days === 0);
      expect(fondo).toBeTruthy();
      expect(fondo.biofertilizer_slug).toBe('bocashi');
      // Sin fitosanitarios (es nutrición, no sanidad).
      for (const fito of FITOSANITARIOS) {
        expect(slugs).not.toContain(fito);
      }
    });
  }

  it('el frutal perenne deja claro que es un esquema ANUAL recurrente (gotera/corona + mulch)', () => {
    const t = getGenericFeedingTemplate('frutales_perennes');
    const joined = [
      ...t.notes,
      ...t.primary_steps.flatMap((s) => [s.action, s.notes]),
    ]
      .filter(Boolean)
      .join(' ');
    // Esquema que se repite cada año, no una sola vez.
    expect(joined).toMatch(/cada año/i);
    expect(joined).toMatch(/se REPITE/i);
    // Abono en la zona de goteo / corona del árbol al inicio de lluvias.
    expect(joined).toMatch(/gotera|corona/i);
    expect(joined).toMatch(/lluvias/i);
    expect(joined).toMatch(/mulch/i);
    // Honestidad: orientativo por tipo + análisis de suelo manda + fuentes.
    expect(joined).toMatch(/orientativo por tipo/i);
    expect(joined).toMatch(/análisis de suelo/i);
    expect(joined).toMatch(/AGROSAVIA|ICA|FAO|Cenicafé/);
  });

  it('el árbol de sombra/servicio pide mínima fertilización y aporta más de lo que toma', () => {
    const t = getGenericFeedingTemplate('arboles_sombra');
    // Sobrio: pocos pasos de nutrición (suelo + fondo + un mantenimiento opcional).
    const nutricion = t.primary_steps.filter((s) => s.offset_days >= 0);
    expect(nutricion.length).toBeLessThanOrEqual(3);
    const joined = [
      ...t.notes,
      ...t.primary_steps.flatMap((s) => [s.action, s.notes]),
    ]
      .filter(Boolean)
      .join(' ');
    expect(joined).toMatch(/aportan más de lo que piden|hojarasca/i);
    expect(joined).toMatch(/mulch/i);
    // Honestidad: orientativo + fuentes.
    expect(joined).toMatch(/orientativo por tipo/i);
    expect(joined).toMatch(/AGROSAVIA|ICA|FAO/);
  });

  it('los pasos perennes con biopreparado del seed traen dosis textual', () => {
    for (const cat of PERENNIAL_CATEGORIES) {
      const t = getGenericFeedingTemplate(cat);
      for (const step of t.primary_steps) {
        // bocashi, biol, te_compost, cal/roca: todos con texto en el seed.
        expect(step.dose_text).toBeTruthy();
        expect(typeof step.dose_text).toBe('string');
      }
    }
  });

  it('resolveGenericFeedingForSpecies resuelve un frutal perenne no fijador', () => {
    const species = {
      id: 'persea_americana',
      category: 'frutales_perennes',
      familia_botanica: 'Lauraceae',
      roles_in_guild: ['crop'],
    };
    const t = resolveGenericFeedingForSpecies(species);
    expect(t).toBeTruthy();
    expect(t.category).toBe('frutales_perennes');
    expect(t.isLegume).toBe(false);
  });

  it('resolveGenericFeedingForSpecies resuelve un árbol de sombra no fijador', () => {
    const species = {
      id: 'cedrela_odorata',
      category: 'arboles_sombra',
      familia_botanica: 'Meliaceae',
      roles_in_guild: ['timber'],
    };
    const t = resolveGenericFeedingForSpecies(species);
    expect(t).toBeTruthy();
    expect(t.category).toBe('arboles_sombra');
    expect(t.isLegume).toBe(false);
  });

  it('un árbol de sombra leguminoso (fijador) recibe el plan de legumbre (sin N externo)', () => {
    const guamo = {
      id: 'inga_edulis',
      category: 'arboles_sombra',
      familia_botanica: 'Fabaceae',
      roles_in_guild: ['nitrogen_fixer', 'shade'],
    };
    const t = resolveGenericFeedingForSpecies(guamo);
    expect(t).toBeTruthy();
    expect(t.isLegume).toBe(true);
    expect(t.primary_steps.map((s) => s.biofertilizer_slug)).not.toContain('biol');
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

  it('Solanaceae (no fijadora) → base por categoría + nota de calcio corregida', () => {
    const species = {
      id: 'solanum_lycopersicum_san_marzano',
      category: 'hortalizas_fruto_flor',
      familia_botanica: 'Solanaceae',
      roles_in_guild: ['crop'],
    };
    const t = resolveGenericFeedingForSpecies(species);
    expect(t.isLegume).toBe(false);
    expect(t.category).toBe('hortalizas_fruto_flor');
    // P0-2: la nota habla de calcio pero ya NO afirma que la cal evita la
    // pudrición de la punta (eso era desinformación: ver test dedicado).
    expect(t.notes.join(' ')).toMatch(/calcio/i);
    expect(t.notes.join(' ')).not.toMatch(/blossom-end rot/i);
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
    // Medicinal no fijadora: su categoría sigue sin plantilla de nutrición.
    const species = {
      id: 'ruta_graveolens',
      category: 'medicinales_alelopaticas',
      familia_botanica: 'Rutaceae',
      roles_in_guild: ['medicinal'],
    };
    expect(resolveGenericFeedingForSpecies(species)).toBeNull();
  });

  it('entrada inválida → null', () => {
    expect(resolveGenericFeedingForSpecies(null)).toBeNull();
    expect(resolveGenericFeedingForSpecies(undefined)).toBeNull();
    expect(resolveGenericFeedingForSpecies('x')).toBeNull();
  });
});

// P0-1: paso 0 de suelo (encalado + fósforo según análisis).
describe('feedingPlanGeneric — paso 0 de suelo (cal dolomítica + roca fosfórica)', () => {
  for (const cat of NUTRITION_CATEGORIES) {
    it(`${cat} incluye encalado (cal_dolomita) y fósforo (roca_fosforica) pre-siembra`, () => {
      const t = getGenericFeedingTemplate(cat);
      const slugs = t.primary_steps.map((s) => s.biofertilizer_slug);
      expect(slugs).toContain('cal_dolomita');
      expect(slugs).toContain('roca_fosforica');
      // Son pasos pre-siembra (offset negativo).
      const cal = t.primary_steps.find((s) => s.biofertilizer_slug === 'cal_dolomita');
      const roca = t.primary_steps.find((s) => s.biofertilizer_slug === 'roca_fosforica');
      expect(cal.offset_days).toBeLessThan(0);
      expect(roca.offset_days).toBeLessThan(0);
    });
  }

  it('cal y roca fosfórica traen dosis TEXTUAL del seed (no inventada)', () => {
    const t = getGenericFeedingTemplate('hortalizas_hoja');
    const cal = t.primary_steps.find((s) => s.biofertilizer_slug === 'cal_dolomita');
    const roca = t.primary_steps.find((s) => s.biofertilizer_slug === 'roca_fosforica');
    // dose_text proviene del seed (proceso_resumen de las enmiendas minerales).
    expect(cal.dose_text).toMatch(/500-2000 kg\/ha/);
    expect(roca.dose_text).toMatch(/500-1000 kg\/ha/);
  });

  it('la nota de cal condiciona a suelo ácido (Cauca/altiplano)', () => {
    const t = getGenericFeedingTemplate('hortalizas_fruto_flor');
    const cal = t.primary_steps.find((s) => s.biofertilizer_slug === 'cal_dolomita');
    expect(cal.notes).toMatch(/ácidos?/i);
    expect(cal.notes).toMatch(/análisis de suelo/i);
  });
});

// P2-8: análisis de suelo como paso recomendado explícito.
describe('feedingPlanGeneric — análisis de suelo recomendado explícito', () => {
  for (const cat of NUTRITION_CATEGORIES) {
    it(`${cat} menciona el análisis de suelo en las notas`, () => {
      const t = getGenericFeedingTemplate(cat);
      expect(t.notes.join(' ')).toMatch(/análisis de suelo/i);
    });
  }
});

// P1-4: dosis foliar concreta y segura por paso (dose_safe), sin arrastrar rangos amplios.
describe('feedingPlanGeneric — dosis foliar concreta y segura (dose_safe)', () => {
  it('todo paso de nutrición (no suelo) tiene dose_safe corto', () => {
    for (const cat of NUTRITION_CATEGORIES) {
      const t = getGenericFeedingTemplate(cat);
      const nutricion = t.primary_steps.filter((s) => s.offset_days >= 0);
      for (const s of nutricion) {
        expect(s.dose_safe).toBeTruthy();
        // Dosis segura corta, no el párrafo crudo del seed.
        expect(s.dose_safe.length).toBeLessThan(120);
      }
    }
  });

  it('el biol en plántula arranca diluido 1:20 (seguro contra fitotoxicidad)', () => {
    const t = getGenericFeedingTemplate('hortalizas_hoja');
    const biol = t.primary_steps.find((s) => s.biofertilizer_slug === 'biol');
    expect(biol.dose_safe).toMatch(/10-15%/);
    expect(biol.dose_safe).toMatch(/1:20/);
  });

  it('el supermagro no supera el 10% (tope de seguridad)', () => {
    const t = getGenericFeedingTemplate('hortalizas_fruto_flor');
    const sm = t.primary_steps.find((s) => s.biofertilizer_slug === 'supermagro');
    expect(sm.dose_safe).toMatch(/1:20|5%/);
    expect(sm.dose_safe).toMatch(/10%/);
  });
});

// P0-2: nota de calcio para solanáceas REESCRITA (no "echa cal → evitas BER").
describe('feedingPlanGeneric — solanáceas: nota de calcio corregida (P0-2)', () => {
  const tomate = {
    id: 'solanum_lycopersicum',
    category: 'hortalizas_fruto_flor',
    familia_botanica: 'Solanaceae',
    roles_in_guild: ['crop'],
  };

  it('NO afirma que la cal evita la pudrición de la punta', () => {
    const joined = resolveGenericFeedingForSpecies(tomate).notes.join(' ');
    // No debe quedar la receta falsa "echa cal → evitas pudrición".
    expect(joined).not.toMatch(/blossom-end rot/i);
    expect(joined).not.toMatch(/cal\b.*evit\w*.*pudrición/i);
  });

  it('explica la causa real: riego desparejo y exceso de nitrógeno', () => {
    const joined = resolveGenericFeedingForSpecies(tomate).notes.join(' ');
    expect(joined).toMatch(/punta de abajo/i);
    expect(joined).toMatch(/riego desparejo/i);
    expect(joined).toMatch(/exceso de nitrógeno/i);
    expect(joined).toMatch(/NO por falta de cal/i);
  });
});

// P0-3: nota de azufre para brásicas (yeso, nunca caldo sulfocálcico como abono).
describe('feedingPlanGeneric — brásicas: nota de azufre segura (P0-3)', () => {
  const brassica = {
    id: 'brassica_oleracea_italica',
    category: 'hortalizas_hoja',
    familia_botanica: 'Brassicaceae',
    roles_in_guild: ['crop'],
  };

  it('ofrece yeso agrícola y PROHÍBE el caldo sulfocálcico como abono', () => {
    const joined = resolveGenericFeedingForSpecies(brassica).notes.join(' ');
    expect(joined).toMatch(/yeso agrícola/i);
    expect(joined).toMatch(/NUNCA uses caldo sulfocálcico/i);
  });

  it('no pide una "fuente de azufre" genérica al suelo', () => {
    const joined = resolveGenericFeedingForSpecies(brassica).notes.join(' ');
    expect(joined).not.toMatch(/una fuente de azufre/i);
  });
});

// P1-5: leguminosas — nota de inoculación con rizobio.
describe('feedingPlanGeneric — leguminosas: nota de inoculación (P1-5)', () => {
  it('explica inocular con tierra de un lote donde haya dado bien (rizobio)', () => {
    const t = getGenericFeedingTemplate('granos_legumbres');
    const joined = t.notes.join(' ');
    expect(joined).toMatch(/inocula/i);
    expect(joined).toMatch(/rizobio/i);
    expect(joined).toMatch(/molibdeno/i);
  });
});

// P1-6: siembra directa vs trasplante (bocashi a banda, no bajo la semilla).
describe('feedingPlanGeneric — siembra directa vs trasplante (P1-6)', () => {
  it('el bocashi de fondo aclara siembra directa = a banda, no bajo la semilla', () => {
    const t = getGenericFeedingTemplate('tuberculos_raices');
    const fondo = t.primary_steps.find((s) => s.offset_days === 0);
    expect(fondo.notes).toMatch(/siembra directa/i);
    expect(fondo.notes).toMatch(/a banda/i);
    expect(fondo.notes).toMatch(/no concentrado bajo la semilla/i);
  });
});

// P2-7: tecnicismos traducidos a lenguaje campesino (sin jerga cruda).
describe('feedingPlanGeneric — lenguaje campesino, sin tecnicismos crudos (P2-7)', () => {
  // Términos crudos que NO deben aparecer en notas de NINGUNA plantilla base.
  const JERGA_PROHIBIDA = [
    'drench',
    'blossom-end rot',
    'macollamiento',
    'encañe',
    'clorosis intervenal',
    'aminoácidos y microbiota',
  ];

  it('ninguna nota de plantilla base contiene jerga cruda', () => {
    for (const cat of NUTRITION_CATEGORIES) {
      const t = getGenericFeedingTemplate(cat);
      const allText = [
        ...t.notes,
        ...t.primary_steps.flatMap((s) => [s.action, s.notes]),
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      for (const jerga of JERGA_PROHIBIDA) {
        expect(allText).not.toContain(jerga.toLowerCase());
      }
    }
  });

  it('usa equivalentes campesinos (empapar al pie, echa más tallos)', () => {
    const cereal = getGenericFeedingTemplate('cereales');
    const cerealText = cereal.primary_steps.map((s) => s.action).join(' ');
    expect(cerealText).toMatch(/echa más tallos/i);

    const hoja = getGenericFeedingTemplate('hortalizas_hoja');
    const hojaText = hoja.primary_steps.map((s) => s.action).join(' ');
    expect(hojaText).toMatch(/empapar al pie|regar a la raíz/i);
  });
});
