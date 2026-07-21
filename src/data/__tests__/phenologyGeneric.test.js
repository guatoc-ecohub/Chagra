import { describe, it, expect } from 'vitest';
import { getGenericTemplate, getGenericCategories } from '../phenologyGeneric';

describe('phenologyGeneric — getGenericTemplate', () => {
  it('retorna plantilla para categoria hortalizas_hoja', () => {
    const t = getGenericTemplate('hortalizas_hoja');
    expect(t).toBeTruthy();
    expect(t.is_generic).toBe(true);
    expect(t.template_id).toBe('generic.hortalizas_hoja');
  });

  it('retorna plantilla para tuberculos_raices', () => {
    const t = getGenericTemplate('tuberculos_raices');
    expect(t).toBeTruthy();
    expect(t.is_generic).toBe(true);
    expect(t.species_label).toMatch(/tubérculo/i);
  });

  it('retorna plantilla para cereales', () => {
    const t = getGenericTemplate('cereales');
    expect(t).toBeTruthy();
    expect(t.stages.length).toBeGreaterThanOrEqual(4);
  });

  it('retorna plantilla para granos_legumbres', () => {
    const t = getGenericTemplate('granos_legumbres');
    expect(t).toBeTruthy();
    expect(t.is_generic).toBe(true);
  });

  it('retorna plantilla para abonos_verdes_coberturas', () => {
    const t = getGenericTemplate('abonos_verdes_coberturas');
    expect(t).toBeTruthy();
    expect(t.is_generic).toBe(true);
  });

  it('retorna plantilla para atractores_polinizadores', () => {
    const t = getGenericTemplate('atractores_polinizadores');
    expect(t).toBeTruthy();
    expect(t.is_generic).toBe(true);
  });

  it('retorna plantilla para hortalizas_fruto_flor', () => {
    const t = getGenericTemplate('hortalizas_fruto_flor');
    expect(t).toBeTruthy();
    expect(t.is_generic).toBe(true);
  });

  it('retorna null para categoria desconocida', () => {
    expect(getGenericTemplate('categoria_inexistente')).toBeNull();
  });

  it('retorna null para categorias no estimables (frutales perennes)', () => {
    expect(getGenericTemplate('frutales_perennes')).toBeNull();
  });

  it('retorna null para categorias no estimables (arboles sombra)', () => {
    expect(getGenericTemplate('arboles_sombra')).toBeNull();
  });

  it('retorna null para especies_invasoras', () => {
    expect(getGenericTemplate('especies_invasoras')).toBeNull();
  });

  it('retorna null para medicinales_alelopaticas', () => {
    expect(getGenericTemplate('medicinales_alelopaticas')).toBeNull();
  });

  it('retorna null para fibras_no_maderables', () => {
    expect(getGenericTemplate('fibras_no_maderables')).toBeNull();
  });

  it('retorna null para undefined', () => {
    expect(getGenericTemplate(undefined)).toBeNull();
  });

  it('retorna null para null', () => {
    expect(getGenericTemplate(null)).toBeNull();
  });

  it('retorna null para string vacia', () => {
    expect(getGenericTemplate('')).toBeNull();
  });

  it('retorna null para numero', () => {
    expect(getGenericTemplate(/** @type {any} */ (42))).toBeNull();
  });
});

describe('phenologyGeneric — getGenericCategories', () => {
  it('retorna exactamente 7 categorias', () => {
    const cats = getGenericCategories();
    expect(cats).toHaveLength(7);
  });

  it('incluye las categorias esperadas', () => {
    const cats = getGenericCategories();
    expect(cats).toContain('hortalizas_hoja');
    expect(cats).toContain('hortalizas_fruto_flor');
    expect(cats).toContain('cereales');
    expect(cats).toContain('granos_legumbres');
    expect(cats).toContain('tuberculos_raices');
    expect(cats).toContain('abonos_verdes_coberturas');
    expect(cats).toContain('atractores_polinizadores');
  });

  it('NO incluye categorias no estimables', () => {
    const cats = getGenericCategories();
    expect(cats).not.toContain('frutales_perennes');
    expect(cats).not.toContain('arboles_sombra');
    expect(cats).not.toContain('especies_invasoras');
    expect(cats).not.toContain('medicinales_alelopaticas');
    expect(cats).not.toContain('fibras_no_maderables');
  });
});

describe('phenologyGeneric — integridad de plantillas', () => {
  it('toda plantilla generica tiene is_generic: true', () => {
    for (const cat of getGenericCategories()) {
      const t = getGenericTemplate(cat);
      expect(t.is_generic).toBe(true);
    }
  });

  it('toda plantilla generica tiene sowing con minDays=0 maxDays=0', () => {
    for (const cat of getGenericCategories()) {
      const t = getGenericTemplate(cat);
      const sowing = t.stages.find((s) => s.code === 'sowing');
      expect(sowing).toBeTruthy();
      expect(sowing.minDays).toBe(0);
      expect(sowing.maxDays).toBe(0);
    }
  });

  it('toda plantilla generica termina en closed con maxDays null', () => {
    for (const cat of getGenericCategories()) {
      const t = getGenericTemplate(cat);
      const closed = t.stages[t.stages.length - 1];
      expect(closed.code).toBe('closed');
      expect(closed.maxDays).toBeNull();
    }
  });

  it('toda plantilla generica tiene etapas monotonas en minDays', () => {
    for (const cat of getGenericCategories()) {
      const t = getGenericTemplate(cat);
      for (let i = 1; i < t.stages.length; i++) {
        expect(t.stages[i].minDays).toBeGreaterThanOrEqual(t.stages[i - 1].minDays);
      }
    }
  });

  it('toda plantilla generica tiene minDays <= maxDays donde maxDays no es null', () => {
    for (const cat of getGenericCategories()) {
      const t = getGenericTemplate(cat);
      for (const stage of t.stages) {
        if (stage.maxDays !== null) {
          expect(stage.minDays).toBeLessThanOrEqual(stage.maxDays);
        }
      }
    }
  });

  it('toda plantilla generica declara fuente como estimacion por tipo', () => {
    for (const cat of getGenericCategories()) {
      const t = getGenericTemplate(cat);
      expect(t.sources).toHaveLength(1);
      expect(t.sources[0].name).toMatch(/genérica por tipo/i);
      expect(t.sources[0].nota).toBe('aproximado-por-tipo');
    }
  });

  it('toda plantilla generica tiene sourceIndex valido en cada etapa', () => {
    for (const cat of getGenericCategories()) {
      const t = getGenericTemplate(cat);
      for (const stage of t.stages) {
        expect(stage.sourceIndex).toBeGreaterThanOrEqual(0);
        expect(stage.sourceIndex).toBeLessThan(t.sources.length);
      }
    }
  });

  it('el harvest_min y harvest_max definen ventana de cosecha razonable (min < max)', () => {
    for (const cat of getGenericCategories()) {
      const t = getGenericTemplate(cat);
      const harvest = t.stages.find((s) => s.code === 'harvest_window');
      expect(harvest).toBeTruthy();
      expect(harvest.minDays).toBeGreaterThan(0);
      if (harvest.maxDays !== null) {
        expect(harvest.minDays).toBeLessThanOrEqual(harvest.maxDays);
      }
    }
  });
});
