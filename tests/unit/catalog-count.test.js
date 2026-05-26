/**
 * Test para verificar que el catálogo OSS subset v3.2 tiene al menos 200 species
 * Task #189: Expandir catálogo species 105 → ~200+
 */

import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

describe('Catalog Count - Task #189', () => {
  it('should have at least 200 species in OSS subset v3.2', () => {
    const catalogPath = path.join(__dirname, '../../catalog/chagra-catalog-oss-subset-v3.2.json');
    const catalog = JSON.parse(fs.readFileSync(catalogPath, 'utf-8'));
    
    expect(catalog.species).toBeDefined();
    expect(catalog.species.length).toBeGreaterThanOrEqual(200);
    expect(catalog.species.length).toBe(204); // Count exacto después de task #189
  });
  
  it('should have proper schema version', () => {
    const catalogPath = path.join(__dirname, '../../catalog/chagra-catalog-oss-subset-v3.2.json');
    const catalog = JSON.parse(fs.readFileSync(catalogPath, 'utf-8'));
    
    expect(catalog.schema_version).toBe('3.1');
    expect(catalog._subset_meta).toBeDefined();
    expect(catalog._subset_meta.species_count).toBe(204);
  });
  
  it('should include new species from batches 4-9', () => {
    const catalogPath = path.join(__dirname, '../../catalog/chagra-catalog-oss-subset-v3.2.json');
    const catalog = JSON.parse(fs.readFileSync(catalogPath, 'utf-8'));
    
    const newSpeciesIds = catalog.species.map(s => s.id);
    
    // Especies de batch 4 (invasoras)
    expect(newSpeciesIds).toContain('eucalyptus_globulus');
    expect(newSpeciesIds).toContain('bidens_alba');
    expect(newSpeciesIds).toContain('pennisetum_clandestinum');
    
    // Especies de batch 5 (medicinales)
    expect(newSpeciesIds).toContain('artemisia_absinthium');
    expect(newSpeciesIds).toContain('borago_officinalis');
    expect(newSpeciesIds).toContain('melilotus_officinalis');
    
    // Especies de batch 6 (especias)
    expect(newSpeciesIds).toContain('piper_nigrum');
    expect(newSpeciesIds).toContain('myristica_fragrans');
    expect(newSpeciesIds).toContain('cinnamomum_verum');
    
    // Especies de batch 7 (frutales andinos)
    expect(newSpeciesIds).toContain('prunus_persica');
    expect(newSpeciesIds).toContain('prunus_domestica');
    expect(newSpeciesIds).toContain('cydonia_oblonga');
    
    // Especies de batch 8 (árboles útiles)
    expect(newSpeciesIds).toContain('acacia_mangium');
    expect(newSpeciesIds).toContain('calliandra_calothyrsus');
    expect(newSpeciesIds).toContain('albizia_guachapele');
    
    // Especies de batch 9 (cultivos sacrificiales)
    expect(newSpeciesIds).toContain('canavalia_ensiformis');
    expect(newSpeciesIds).toContain('vigna_unguiculata');
    expect(newSpeciesIds).toContain('lablab_purpureus');
  });
});
