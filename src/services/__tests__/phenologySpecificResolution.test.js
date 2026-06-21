import { describe, it, expect } from 'vitest';
import { resolveTemplate, calculateWindows, getCurrentStage } from '../phenologyCalculator';
import { getTemplate, resolveParentSpeciesSlug } from '../../data/phenologyTemplates';
import { getGenericTemplate, getGenericCategories } from '../../data/phenologyGeneric';

const SOWING = 1700000000000;
const DAY_MS = 86400000;

// Tarea #62: el ciclo fenológico debe ser ESPECÍFICO por especie cuando hay
// datos reales en el repo, y caer a un genérico CLARAMENTE marcado (sin
// inventar) cuando no los hay.
describe('Tarea #62 — fenología específica vs genérica', () => {
  describe('especie CON datos específicos usa esos datos', () => {
    it('una especie con plantilla propia (tomate) resuelve a su plantilla específica, no genérica', () => {
      const t = resolveTemplate({ speciesSlug: 'solanum_lycopersicum', category: 'hortalizas_fruto_flor' });
      expect(t).toBeTruthy();
      expect(t.species_slug).toBe('solanum_lycopersicum');
      expect(t.is_generic).toBeFalsy();
    });

    it('la especie específica gana incluso si se pasa una categoría con genérico', () => {
      // Aunque exista genérico para 'cereales', maíz tiene plantilla propia.
      const windows = calculateWindows({ speciesSlug: 'zea_mays', sowingDate: SOWING, category: 'cereales' });
      expect(windows.every((w) => !w.isGeneric)).toBe(true);
      // Cosecha de maíz cae en ventana específica de su plantilla.
      const harvest = windows.find((w) => w.code === 'harvest_window');
      expect(harvest.status).toBe('computed');
    });
  });

  describe('cultivar/subespecie hereda la fenología REAL de su especie madre', () => {
    it('resolveParentSpeciesSlug mapea cultivar de tomate a la especie madre', () => {
      expect(resolveParentSpeciesSlug('solanum_lycopersicum_san_marzano')).toBe('solanum_lycopersicum');
    });

    it('resolveParentSpeciesSlug mapea cultivar de papa a su especie madre', () => {
      expect(resolveParentSpeciesSlug('solanum_tuberosum_pastusa_suprema')).toBe('solanum_tuberosum');
    });

    it('un cultivar usa la plantilla específica de la especie madre (NO el genérico)', () => {
      const t = getTemplate('solanum_lycopersicum_san_marzano');
      expect(t).toBeTruthy();
      expect(t.derived_from).toBe('solanum_lycopersicum');
      expect(t.is_generic).toBeFalsy();
      // Conserva el slug pedido pero las etapas reales del tomate.
      expect(t.species_slug).toBe('solanum_lycopersicum_san_marzano');
      expect(t.stages.find((s) => s.code === 'flowering')).toBeTruthy();
    });

    it('el cultivar produce la MISMA ventana de cosecha que su especie madre', () => {
      const parent = calculateWindows({ speciesSlug: 'solanum_lycopersicum', sowingDate: SOWING });
      const cultivar = calculateWindows({ speciesSlug: 'solanum_lycopersicum_san_marzano', sowingDate: SOWING });
      const ph = parent.find((w) => w.code === 'harvest_window');
      const ch = cultivar.find((w) => w.code === 'harvest_window');
      expect(ch.windowStart).toBe(ph.windowStart);
      expect(ch.windowEnd).toBe(ph.windowEnd);
      expect(ch.isGeneric).toBeFalsy();
    });

    it('la etapa derivada del cultivar avanza igual que la de la especie madre', () => {
      const stageParent = getCurrentStage({ speciesSlug: 'solanum_lycopersicum', sowingDate: SOWING, now: SOWING + 30 * DAY_MS });
      const stageCultivar = getCurrentStage({ speciesSlug: 'solanum_lycopersicum_san_marzano', sowingDate: SOWING, now: SOWING + 30 * DAY_MS });
      expect(stageCultivar.stage.code).toBe(stageParent.stage.code);
    });
  });

  describe('especie SIN datos específicos cae al genérico SIN inventar', () => {
    it('especie de tipo hortaliza de hoja sin plantilla propia usa el genérico marcado', () => {
      // 'allium_fistulosum' (cebollín) no tiene plantilla específica.
      const t = resolveTemplate({ speciesSlug: 'allium_fistulosum', category: 'hortalizas_hoja' });
      expect(t).toBeTruthy();
      expect(t.is_generic).toBe(true);
      expect(t.species_slug.startsWith('generic.')).toBe(true);
    });

    it('las ventanas genéricas se marcan isGeneric y bajan la confianza', () => {
      const windows = calculateWindows({ speciesSlug: 'allium_fistulosum', sowingDate: SOWING, category: 'hortalizas_hoja' });
      const veg = windows.find((w) => w.code === 'vegetative');
      expect(veg.isGeneric).toBe(true);
      // Confianza fuerte hacia abajo: NO aparenta dato firme de la especie.
      expect(veg.confidence).toBeLessThanOrEqual(0.3);
      // La fuente declara explícitamente que es aproximación por tipo.
      expect(veg.sources[0]).toMatch(/genérica por tipo/i);
    });

    it('la siembra (día 0) sigue siendo un hecho con confianza 1.0 aun en el genérico', () => {
      const windows = calculateWindows({ speciesSlug: 'allium_fistulosum', sowingDate: SOWING, category: 'hortalizas_hoja' });
      const sowing = windows.find((w) => w.code === 'sowing');
      expect(sowing.confidence).toBe(1.0);
    });
  });

  describe('anti-alucinación: sin datos honestos NO se inventa nada', () => {
    it('especie sin plantilla y sin categoría con genérico devuelve template_missing', () => {
      const windows = calculateWindows({ speciesSlug: 'desconocida_xyz', sowingDate: SOWING });
      expect(windows).toHaveLength(1);
      expect(windows[0].status).toBe('template_missing');
    });

    it('categorías sin ciclo anual estimable (perennes/árboles/invasoras) NO tienen genérico', () => {
      expect(getGenericTemplate('frutales_perennes')).toBeNull();
      expect(getGenericTemplate('arboles_sombra')).toBeNull();
      expect(getGenericTemplate('especies_invasoras')).toBeNull();
      expect(getGenericTemplate('medicinales_alelopaticas')).toBeNull();
      expect(getGenericTemplate('fibras_no_maderables')).toBeNull();
    });

    it('un frutal perenne sin plantilla propia NO cae a un genérico inventado', () => {
      // 'theobroma_cacao' (cacao) no tiene plantilla específica y su categoría
      // perenne no define genérico: debe quedar como no estimable, no inventar.
      const t = resolveTemplate({ speciesSlug: 'theobroma_cacao', category: 'frutales_perennes' });
      expect(t).toBeNull();
      const windows = calculateWindows({ speciesSlug: 'theobroma_cacao', sowingDate: SOWING, category: 'frutales_perennes' });
      expect(windows[0].status).toBe('template_missing');
    });

    it('todas las categorías con genérico producen un ciclo anual coherente', () => {
      for (const cat of getGenericCategories()) {
        const t = getGenericTemplate(cat);
        expect(t.is_generic).toBe(true);
        const sowing = t.stages[0];
        const closed = t.stages[t.stages.length - 1];
        expect(sowing.code).toBe('sowing');
        expect(closed.code).toBe('closed');
        expect(closed.maxDays).toBeNull();
        // Etapas monótonas: cada minDays >= minDays anterior.
        for (let i = 1; i < t.stages.length; i++) {
          expect(t.stages[i].minDays).toBeGreaterThanOrEqual(t.stages[i - 1].minDays);
        }
      }
    });
  });
});
