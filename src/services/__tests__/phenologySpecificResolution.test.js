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
      expect(windows.every((w) => !(/** @type {any} */ (w)).isGeneric)).toBe(true);
      // Cosecha de maíz cae en ventana específica de su plantilla.
      const harvest = windows.find((w) => w.code === 'harvest_window');
      expect(harvest.status).toBe('computed');
    });

    it('la plantilla explicita (template embebido) gana sobre todo lo demas', () => {
      const explicitTpl = {
        template_id: 'embedded.test',
        species_slug: 'especie_x',
        species_label: 'Especie X embebida',
        version: 2,
        sources: [{ name: 'Manual incrustado' }],
        stages: [
          { code: 'sowing', label: 'Siembra', minDays: 0, maxDays: 0, sourceIndex: 0 },
          { code: 'germination', label: 'Germinacion', minDays: 1, maxDays: 5, sourceIndex: 0 },
          { code: 'closed', label: 'Cerrado', minDays: 6, maxDays: null, sourceIndex: 0 },
        ],
      };
      const t = resolveTemplate({ speciesSlug: 'especie_x', template: explicitTpl, category: 'hortalizas_hoja' });
      expect(t).toBeTruthy();
      expect(t.template_id).toBe('embedded.test');
      expect(t.is_generic).toBeFalsy();
      expect(t.stages.find((s) => s.code === 'germination')).toBeTruthy();
    });

    it('la plantilla explicita gana aunque la especie tenga plantilla propia', () => {
      const explicitTpl = {
        template_id: 'custom.override',
        species_slug: 'solanum_lycopersicum',
        version: 1,
        sources: [{ name: 'Override manual' }],
        stages: [
          { code: 'sowing', label: 'Siembra', minDays: 0, maxDays: 0, sourceIndex: 0 },
          { code: 'custom_stage', label: 'Etapa custom', minDays: 1, maxDays: 30, sourceIndex: 0 },
          { code: 'closed', label: 'Cerrado', minDays: 31, maxDays: null, sourceIndex: 0 },
        ],
      };
      const t = resolveTemplate({
        speciesSlug: 'solanum_lycopersicum',
        template: explicitTpl,
        category: 'hortalizas_fruto_flor',
      });
      expect(t).toBeTruthy();
      expect(t.template_id).toBe('custom.override');
      expect(t.stages.find((s) => s.code === 'custom_stage')).toBeTruthy();
      expect(t.stages.find((s) => s.code === 'flowering')).toBeFalsy();
    });

    it('todas las etapas de plantilla especifica tienen isGeneric falso', () => {
      const windows = calculateWindows({ speciesSlug: 'solanum_tuberosum', sowingDate: SOWING, altitudeM: 2000 });
      for (const w of windows) {
        expect(/** @type {any} */ (w).isGeneric).toBe(false);
      }
    });
  });

  describe('cultivar/subespecie hereda la fenología REAL de su especie madre', () => {
    it('resolveParentSpeciesSlug mapea cultivar de tomate a la especie madre', () => {
      expect(resolveParentSpeciesSlug('solanum_lycopersicum_san_marzano')).toBe('solanum_lycopersicum');
    });

    it('resolveParentSpeciesSlug mapea cultivar de papa a su especie madre', () => {
      expect(resolveParentSpeciesSlug('solanum_tuberosum_pastusa_suprema')).toBe('solanum_tuberosum');
    });

    it('resolveParentSpeciesSlug devuelve null para slug sin plantilla madre', () => {
      expect(resolveParentSpeciesSlug('desconocida_xyz_variedad_rara')).toBeNull();
    });

    it('resolveParentSpeciesSlug devuelve null para string vacia', () => {
      expect(resolveParentSpeciesSlug('')).toBeNull();
    });

    it('resolveParentSpeciesSlug devuelve null para undefined', () => {
      expect(resolveParentSpeciesSlug(undefined)).toBeNull();
    });

    it('un cultivar usa la plantilla específica de la especie madre (NO el genérico)', () => {
      const t = getTemplate('solanum_lycopersicum_san_marzano');
      expect(t).toBeTruthy();
      expect(/** @type {any} */ (t).derived_from).toBe('solanum_lycopersicum');
      expect(/** @type {any} */ (t).is_generic).toBeFalsy();
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
      expect(/** @type {any} */ (ch).isGeneric).toBeFalsy();
    });

    it('la etapa derivada del cultivar avanza igual que la de la especie madre', () => {
      const stageParent = getCurrentStage({ speciesSlug: 'solanum_lycopersicum', sowingDate: SOWING, now: SOWING + 30 * DAY_MS });
      const stageCultivar = getCurrentStage({ speciesSlug: 'solanum_lycopersicum_san_marzano', sowingDate: SOWING, now: SOWING + 30 * DAY_MS });
      expect(stageCultivar.stage.code).toBe(stageParent.stage.code);
    });

    it('cultivar que deriva de especie madre con plantilla no cae al generico aunque tenga categoria', () => {
      const t = resolveTemplate({ speciesSlug: 'solanum_lycopersicum_san_marzano', category: 'hortalizas_fruto_flor' });
      expect(t).toBeTruthy();
      expect(t.species_slug).toBe('solanum_lycopersicum_san_marzano');
      expect(t.derived_from).toBe('solanum_lycopersicum');
      expect(t.is_generic).toBeFalsy();
    });

    it('cultivar de zea_mays resuelve a su especie madre en la cascada', () => {
      const t = resolveTemplate({ speciesSlug: 'zea_mays_hibrido_x', category: 'cereales' });
      expect(t).toBeTruthy();
      expect(t.species_slug).toBe('zea_mays_hibrido_x');
      expect(t.derived_from).toBe('zea_mays');
      expect(t.is_generic).toBeFalsy();
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

    it('especie sin plantilla con categoria tuberculos_raices cae al generico', () => {
      const t = resolveTemplate({ speciesSlug: 'oxalis_tuberosa', category: 'tuberculos_raices' });
      expect(t).toBeTruthy();
      expect(t.is_generic).toBe(true);
      expect(t.template_id).toBe('generic.tuberculos_raices');
    });

    it('especie sin plantilla con categoria hortalizas_fruto_flor cae al generico', () => {
      const t = resolveTemplate({ speciesSlug: 'capsicum_annuum', category: 'hortalizas_fruto_flor' });
      expect(t).toBeTruthy();
      expect(t.is_generic).toBe(true);
      expect(t.template_id).toBe('generic.hortalizas_fruto_flor');
    });

    it('especie sin plantilla con categoria granos_legumbres cae al generico', () => {
      const t = resolveTemplate({ speciesSlug: 'cicer_arietinum', category: 'granos_legumbres' });
      expect(t).toBeTruthy();
      expect(t.is_generic).toBe(true);
    });

    it('especie sin plantilla con categoria cereales cae al generico', () => {
      const t = resolveTemplate({ speciesSlug: 'avena_sativa', category: 'cereales' });
      expect(t).toBeTruthy();
      expect(t.is_generic).toBe(true);
    });

    it('especie sin plantilla con categoria abonos_verdes_coberturas cae al generico', () => {
      const t = resolveTemplate({ speciesSlug: 'canavalia_ensiformis', category: 'abonos_verdes_coberturas' });
      expect(t).toBeTruthy();
      expect(t.is_generic).toBe(true);
      expect(t.template_id).toBe('generic.abonos_verdes_coberturas');
    });

    it('especie sin plantilla con categoria atractores_polinizadores cae al generico', () => {
      const t = resolveTemplate({ speciesSlug: 'borago_officinalis', category: 'atractores_polinizadores' });
      expect(t).toBeTruthy();
      expect(t.is_generic).toBe(true);
    });

    it('cultivar sin especie madre con plantilla pero con categoria estimable cae al generico', () => {
      // 'capsicum_annuum_pimenton' no tiene especie madre en el registro (capsicum_annuum no tiene plantilla)
      const t = resolveTemplate({ speciesSlug: 'capsicum_annuum_pimenton', category: 'hortalizas_fruto_flor' });
      expect(t).toBeTruthy();
      expect(t.is_generic).toBe(true);
    });

    it('las ventanas genéricas se marcan isGeneric y bajan la confianza', () => {
      const windows = calculateWindows({ speciesSlug: 'allium_fistulosum', sowingDate: SOWING, category: 'hortalizas_hoja' });
      const veg = windows.find((w) => w.code === 'vegetative');
      expect(/** @type {any} */ (veg).isGeneric).toBe(true);
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

    it('todas las etapas no-sowing de plantilla generica tienen confianza <= 0.3 sin altitud', () => {
      const windows = calculateWindows({ speciesSlug: 'allium_fistulosum', sowingDate: SOWING, category: 'hortalizas_hoja' });
      for (const w of windows) {
        if (w.code !== 'sowing') {
          expect(w.confidence).toBeLessThanOrEqual(0.3);
        }
      }
    });

    it('plantilla generica con altitud mantiene confianza baja en no-sowing', () => {
      const windows = calculateWindows({ speciesSlug: 'allium_fistulosum', sowingDate: SOWING, altitudeM: 1500, category: 'hortalizas_hoja' });
      const veg = windows.find((w) => w.code === 'vegetative');
      expect(/** @type {any} */ (veg).isGeneric).toBe(true);
      expect(veg.confidence).toBeLessThanOrEqual(0.3);
    });
  });

  describe('anti-alucinación: sin datos honestos NO se inventa nada', () => {
    it('especie sin plantilla y sin categoría con genérico devuelve template_missing', () => {
      const windows = calculateWindows({ speciesSlug: 'desconocida_xyz', sowingDate: SOWING });
      expect(windows).toHaveLength(1);
      expect(windows[0].status).toBe('template_missing');
    });

    it('especie sin plantilla y sin categoria devuelve null de resolveTemplate', () => {
      const t = resolveTemplate({ speciesSlug: 'desconocida_xyz' });
      expect(t).toBeNull();
    });

    it('especie sin plantilla con categoria no estimable devuelve null de resolveTemplate', () => {
      expect(resolveTemplate({ speciesSlug: 'mangifera_indica', category: 'frutales_perennes' })).toBeNull();
      expect(resolveTemplate({ speciesSlug: 'cedrela_odorata', category: 'arboles_sombra' })).toBeNull();
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

    it('un arbol de sombra sin plantilla propia NO recibe ventanas inventadas', () => {
      const windows = calculateWindows({ speciesSlug: 'inga_edulis', sowingDate: SOWING, category: 'arboles_sombra' });
      expect(windows).toHaveLength(1);
      expect(windows[0].status).toBe('template_missing');
      expect(windows[0].confidence).toBe(0);
    });

    it('resolveTemplate con category vacia no cae a generico', () => {
      const t = resolveTemplate({ speciesSlug: 'desconocida_xyz', category: '' });
      expect(t).toBeNull();
    });

    it('resolveTemplate con category null no lanza ni cae a generico', () => {
      const t = resolveTemplate({ speciesSlug: 'desconocida_xyz', category: null });
      expect(t).toBeNull();
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
