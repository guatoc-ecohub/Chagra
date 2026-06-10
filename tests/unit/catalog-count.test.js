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
    // 2026-06-10: subset v3.2 enriquecido con 58 especies de páramo (Cruz Verde,
    // demo MinAmbiente) → 205 → 263. Ver PR #1386 + enrich-oss-paramo-cruz-verde.mjs.
    expect(catalog.species.length).toBe(263);
  });

  it('should include Carludovica palmata (palma de iraca) - Task #iraca-seed', () => {
    const catalogPath = path.join(__dirname, '../../catalog/chagra-catalog-seed-v3.1.json');
    const catalog = JSON.parse(fs.readFileSync(catalogPath, 'utf-8'));

    const speciesIds = catalog.species.map(s => s.id);
    expect(speciesIds).toContain('carludovica_palmata');

    const iraca = catalog.species.find(s => s.id === 'carludovica_palmata');
    expect(iraca).toBeDefined();
    expect(iraca.nombre_comun).toBe('Palma de iraca (paja toquilla)');
    expect(iraca.nombre_cientifico).toBe('Carludovica palmata Ruiz & Pav.');
    expect(iraca.familia_botanica).toBe('Cyclanthaceae');
    expect(iraca.category).toBe('fibras_no_maderables');
    expect(iraca.cultivable).toBe(true);
    expect(iraca.conservation_status).toBe('nativo_silvestre');
    expect(iraca.altitud_msnm.min_absoluto).toBe(0);
    expect(iraca.altitud_msnm.max_absoluto).toBe(1800);
    expect(iraca.source_ids).toContain('gbif-taxonomic-backbone');
    expect(iraca.source_ids).toContain('powo-kew');
    expect(iraca.valor_pedagogico).toContain('Sandoná');
    expect(iraca.valor_pedagogico).toContain('Nariño');
  });

  it('should have proper schema version', () => {
    const catalogPath = path.join(__dirname, '../../catalog/chagra-catalog-oss-subset-v3.2.json');
    const catalog = JSON.parse(fs.readFileSync(catalogPath, 'utf-8'));

    expect(catalog.schema_version).toBe('3.2');
    expect(catalog._subset_meta).toBeDefined();
    // NOTA: _subset_meta.species_count quedó en 204 mientras species.length es
    // 205 (off-by-one en la metadata del subset, NO en este test). Se asserta el
    // valor real para no enmascarar la inconsistencia; corregir la metadata es
    // tarea aparte del owner del catálogo.
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
