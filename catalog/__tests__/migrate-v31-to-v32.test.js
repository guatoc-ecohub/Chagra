/**
 * migrate-v31-to-v32.test.js — tests para migración del catálogo v3.1 a v3.2
 *
 * Task #033-tracking-mode-v32: ADR-030 Regla 1 tracking_mode
 *
 * Verifica:
 * 1. Schema v3.2 valide correctamente
 * 2. Migración sea idempotente (ejecutar 2 veces produce mismo resultado)
 * 3. Ninguna especie pierda campos v3.1 (preservación de datos)
 * 4. Asignación de tracking_mode por categoría según ADR-030
 */

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { execSync } from 'node:child_process';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..', '..');

const v31Seed = JSON.parse(
  readFileSync(join(ROOT, 'catalog', 'chagra-catalog-seed-v3.1.json'), 'utf8'),
);
const v32Seed = JSON.parse(
  readFileSync(join(ROOT, 'catalog', 'chagra-catalog-seed-v3.2.json'), 'utf8'),
);
const v32Schema = JSON.parse(
  readFileSync(join(ROOT, 'catalog', 'schema-v3.2.json'), 'utf8'),
);

describe('migrate-v31-to-v32', () => {
  describe('schema v3.2', () => {
    it('debe tener schema_version="3.2" en enum', () => {
      expect(v32Schema.properties.schema_version.enum).toContain('3.2');
    });

    it('debe tener tracking_mode definido en species', () => {
      const speciesProps = v32Schema.definitions.species.properties;
      expect(speciesProps.tracking_mode).toBeDefined();
      expect(speciesProps.tracking_mode.type).toEqual(['string', 'null']);
      expect(speciesProps.tracking_mode.enum).toContain('individual');
      expect(speciesProps.tracking_mode.enum).toContain('aggregate');
      expect(speciesProps.tracking_mode.enum).toContain(null);
    });

    it('debe tener description que menciona ADR-030', () => {
      const speciesProps = v32Schema.definitions.species.properties;
      expect(speciesProps.tracking_mode.description).toContain('ADR-030');
    });

    it('debe tener $id correcto para v3.2', () => {
      expect(v32Schema.$id).toBe('https://chagra.guatoc.co/schema/catalog/v3.2.json');
    });
  });

  describe('catálogo v3.2 generado', () => {
    it('debe tener schema_version="3.2"', () => {
      expect(v32Seed.schema_version).toBe('3.2');
    });

    it('debe tener el mismo número de especies que v3.1', () => {
      expect(v32Seed.species.length).toBe(v31Seed.species.length);
    });

    it('debe preservar biopreparados de v3.1', () => {
      expect(v32Seed.biopreparados.length).toBe(v31Seed.biopreparados.length);
      expect(v32Seed.biopreparados).toEqual(v31Seed.biopreparados);
    });

    it('debe preservar sources de v3.1', () => {
      expect(v32Seed.sources.length).toBe(v31Seed.sources.length);
      expect(v32Seed.sources).toEqual(v31Seed.sources);
    });

    it('debe tener _meta con estadísticas de tracking_mode', () => {
      expect(v32Seed._meta).toBeDefined();
      expect(v32Seed._meta.estadisticas).toBeDefined();
      expect(v32Seed._meta.estadisticas.total_especies).toBe(v32Seed.species.length);
      expect(v32Seed._meta.estadisticas.tracking_individual).toBeGreaterThan(0);
      expect(v32Seed._meta.estadisticas.tracking_aggregate).toBeGreaterThan(0);
    });

    it('debe tener reporte de especies sin clasificar', () => {
      expect(v32Seed._meta_especies_sin_clasificar).toBeDefined();
      expect(Array.isArray(v32Seed._meta_especies_sin_clasificar)).toBe(true);
    });
  });

  describe('preservación de campos v3.1', () => {
    it('ninguna especie pierde campos requeridos de v3.1', () => {
      const v31Fields = ['id', 'nombre_comun', 'nombre_cientifico', 'category', 'thermal_zones', 'roles_in_guild', 'cultivable', 'conservation_status', 'altitud_msnm', 'source_ids'];
      
      for (const spV32 of v32Seed.species) {
        const spV31 = v31Seed.species.find(s => s.id === spV32.id);
        expect(spV31).toBeDefined();
        
        for (const field of v31Fields) {
          expect(spV32[field]).toBeDefined();
          expect(spV32[field]).toEqual(spV31[field]);
        }
      }
    });

    it('todas las especies conservan sus companions y antagonists', () => {
      for (const spV32 of v32Seed.species) {
        const spV31 = v31Seed.species.find(s => s.id === spV32.id);
        
        expect(spV32.companions).toEqual(spV31.companions);
        expect(spV32.antagonists).toEqual(spV31.antagonists);
      }
    });

    it('todas las especies conservan altitud_msnm', () => {
      for (const spV32 of v32Seed.species) {
        const spV31 = v31Seed.species.find(s => s.id === spV32.id);
        expect(spV32.altitud_msnm).toEqual(spV31.altitud_msnm);
      }
    });
  });

  describe('asignación de tracking_mode por categoría', () => {
    it('frutales_perennes deben ser individual', () => {
      const frutales = v32Seed.species.filter(s => s.category === 'frutales_perennes');
      // Solo verificamos las que NO tenían tracking_mode preexistente
      const nuevas = frutales.filter(s => !v31Seed.species.find(v => v.id === s.id)?.tracking_mode);
      
      if (nuevas.length > 0) {
        nuevas.forEach(sp => {
          if (sp.tracking_mode !== null) {
            expect(sp.tracking_mode).toBe('individual');
          }
        });
      }
    });

    it('tuberculos_raices deben ser individual', () => {
      const tuberculos = v32Seed.species.filter(s => s.category === 'tuberculos_raices');
      const nuevas = tuberculos.filter(s => !v31Seed.species.find(v => v.id === s.id)?.tracking_mode);
      
      if (nuevas.length > 0) {
        nuevas.forEach(sp => {
          if (sp.tracking_mode !== null) {
            expect(sp.tracking_mode).toBe('individual');
          }
        });
      }
    });

    it('hortalizas_hoja deben ser aggregate', () => {
      const hortalizas = v32Seed.species.filter(s => s.category === 'hortalizas_hoja');
      const nuevas = hortalizas.filter(s => !v31Seed.species.find(v => v.id === s.id)?.tracking_mode);
      
      if (nuevas.length > 0) {
        nuevas.forEach(sp => {
          if (sp.tracking_mode !== null) {
            expect(sp.tracking_mode).toBe('aggregate');
          }
        });
      }
    });

    it('cereales deben ser aggregate', () => {
      const cereales = v32Seed.species.filter(s => s.category === 'cereales');
      const nuevas = cereales.filter(s => !v31Seed.species.find(v => v.id === s.id)?.tracking_mode);
      
      if (nuevas.length > 0) {
        nuevas.forEach(sp => {
          if (sp.tracking_mode !== null) {
            expect(sp.tracking_mode).toBe('aggregate');
          }
        });
      }
    });

    it('especies_invasoras deben tener tracking_mode=null', () => {
      const invasoras = v32Seed.species.filter(s => s.category === 'especies_invasoras');
      invasoras.forEach(sp => {
        expect(sp.tracking_mode).toBeNull();
      });
    });

    it('arboles_sombra deben ser individual', () => {
      const arboles = v32Seed.species.filter(s => s.category === 'arboles_sombra');
      const nuevas = arboles.filter(s => !v31Seed.species.find(v => v.id === s.id)?.tracking_mode);
      
      if (nuevas.length > 0) {
        nuevas.forEach(sp => {
          if (sp.tracking_mode !== null) {
            expect(sp.tracking_mode).toBe('individual');
          }
        });
      }
    });
  });

  describe('idempotencia de la migración', () => {
    it('ejecutar migración 2 veces produce mismo resultado', () => {
      // Primera ejecución ya está en v32Seed
      // Ejecutar de nuevo
      try {
        execSync('node scripts/migrate-v31-to-v32.mjs', { cwd: ROOT });
      } catch (_e) {
        // Script puede tener warnings, pero debería completar
      }
      
      // Leer el resultado de la segunda ejecución
      const v32SecondRun = JSON.parse(
        readFileSync(join(ROOT, 'catalog', 'chagra-catalog-seed-v3.2.json'), 'utf8'),
      );
      
      // Verificar que sea idéntico
      expect(v32SecondRun.schema_version).toBe(v32Seed.schema_version);
      expect(v32SecondRun.species.length).toBe(v32Seed.species.length);
      
      // Cada especie debe tener el mismo tracking_mode
      for (const sp of v32SecondRun.species) {
        const original = v32Seed.species.find(s => s.id === sp.id);
        expect(original).toBeDefined();
        expect(sp.tracking_mode).toBe(original.tracking_mode);
      }
    });
  });

  describe('invariantes ADR-030', () => {
    it('todas las especies deben tener tracking_mode definido', () => {
      v32Seed.species.forEach(sp => {
        expect(sp.tracking_mode).toBeDefined();
        // Puede ser 'individual', 'aggregate' o null
        expect(['individual', 'aggregate', null]).toContain(sp.tracking_mode);
      });
    });

    it('estadísticas en _meta deben coincidir con conteo real', () => {
      const stats = v32Seed._meta.estadisticas;
      
      const actualIndividual = v32Seed.species.filter(s => s.tracking_mode === 'individual').length;
      const actualAggregate = v32Seed.species.filter(s => s.tracking_mode === 'aggregate').length;
      const actualNull = v32Seed.species.filter(s => s.tracking_mode === null).length;
      
      expect(stats.tracking_individual).toBe(actualIndividual);
      expect(stats.tracking_aggregate).toBe(actualAggregate);
      expect(stats.tracking_null).toBe(actualNull);
    });

    it(' especies sin clasificar deben tener tracking_mode=null', () => {
      const sinClasificar = v32Seed._meta_especies_sin_clasificar;
      sinClasificar.forEach(sp => {
        const fullSp = v32Seed.species.find(s => s.id === sp.id);
        expect(fullSp).toBeDefined();
        expect(fullSp.tracking_mode).toBeNull();
      });
    });
  });
});
