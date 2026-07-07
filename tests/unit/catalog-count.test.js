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
    // 2026-06-25: ampliación grounded grafo→catálogo (+267 especies cultivables y
    // nativas con asocio construidas desde public/cycle-content + AGE chagra_kg) →
    // 263 → 530. Ver feat(catalogo) promover grafo→catálogo + backfill asociaciones.
    // 2026-07-04: +50 especies comestibles (frutales/hortalizas/tubérculos/
    // aromáticas relevantes para Colombia, incluido el lichi/Litchi chinensis
    // notado como faltante) → 530 → 580. Ver scripts/add-50-comestibles.mjs.
    expect(catalog.species.length).toBe(581);
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
    // 2026-06-14 (chore higiene catálogo público): _subset_meta.species_count
    // reconciliado a 263 para que coincida con species.length real (205 curación
    // inicial + 58 páramo Cruz Verde). Antes declaraba 204 (off-by-one heredado).
    // El conteo declarado DEBE coincidir con el array real.
    // 2026-06-25: 263 → 530 tras ampliación grounded grafo→catálogo.
    // 2026-07-04: 530 → 580 tras +50 especies comestibles.
    expect(catalog._subset_meta.species_count).toBe(581);
    expect(catalog._subset_meta.species_count).toBe(catalog.species.length);
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

  it('should include Litchi chinensis (lichi) - notado como faltante por el operador', () => {
    const catalogPath = path.join(__dirname, '../../catalog/chagra-catalog-oss-subset-v3.2.json');
    const catalog = JSON.parse(fs.readFileSync(catalogPath, 'utf-8'));

    const lichi = catalog.species.find((s) => s.id === 'litchi_chinensis');
    expect(lichi).toBeDefined();
    expect(lichi.nombre_cientifico).toBe('Litchi chinensis Sonn.');
    expect(lichi.familia_botanica).toBe('Sapindaceae');
    expect(lichi.category).toBe('frutales_perennes');
  });

  it('should include the 50 especies comestibles batch (2026-07-04)', () => {
    const catalogPath = path.join(__dirname, '../../catalog/chagra-catalog-oss-subset-v3.2.json');
    const catalog = JSON.parse(fs.readFileSync(catalogPath, 'utf-8'));
    const ids = catalog.species.map((s) => s.id);

    for (const id of [
      'litchi_chinensis', 'nephelium_lappaceum', 'garcinia_mangostana', 'dimocarpus_longan',
      'annona_muricata', 'annona_reticulata', 'tamarindus_indica', 'morinda_citrifolia',
      'plukenetia_volubilis', 'averrhoa_carambola', 'anacardium_occidentale', 'quararibea_cordata',
      'syzygium_malaccense', 'carica_papaya', 'vitis_vinifera', 'manilkara_zapota',
      'pouteria_lucuma', 'manihot_esculenta_dulce', 'poraqueiba_sericea', 'theobroma_subincanum',
      'elaeis_oleifera', 'acrocomia_aculeata', 'cucurbita_ficifolia', 'maranta_arundinacea',
      'oryza_sativa', 'glycine_max', 'sesamum_indicum', 'phaseolus_coccineus', 'sechium_edule',
      'momordica_charantia', 'basella_alba', 'capsicum_frutescens', 'portulaca_oleracea',
      'talinum_triangulare', 'amaranthus_dubius', 'chenopodium_album', 'lagenaria_siceraria',
      'musa_acuminata', 'diospyros_kaki', 'stevia_rebaudiana', 'laurus_nobilis',
      'lippia_origanoides', 'minthostachys_mollis', 'pimenta_dioica', 'ziziphus_mauritiana',
      'vigna_radiata', 'citrus_reticulata', 'citrus_aurantiifolia', 'phyllanthus_acidus',
      'averrhoa_bilimbi',
    ]) {
      expect(ids, `falta especie comestible: ${id}`).toContain(id);
    }
  });
});
