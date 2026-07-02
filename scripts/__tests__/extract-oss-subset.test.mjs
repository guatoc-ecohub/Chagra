/**
 * scripts/__tests__/extract-oss-subset.test.mjs
 *
 * Regresion del extractor OSS v3.1.
 * Verifica que el subset derivado cierre las referencias cruzadas de species
 * y sources necesarias para que AMB-13 quede en cero errores.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, it, expect } from 'vitest';

import { buildOssSubset, REF_FIELDS_TO_CLOSE } from '../extract-oss-subset.mjs';
import { validateAmb13_crossRefs } from '../validate-catalog.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const fullCatalogPath = path.join(__dirname, '../../catalog/chagra-catalog-oss-subset-v3.2.json');
const fullCatalog = JSON.parse(fs.readFileSync(fullCatalogPath, 'utf8'));

describe('extract-oss-subset.mjs', () => {
  it('cierra species y sources referenciados sin dejar errores AMB-13', () => {
    const subset = buildOssSubset(fullCatalog);
    const speciesIds = new Set(subset.species.map((s) => s.id));
    const sourceIds = new Set(subset.sources.map((s) => s.id));

    expect(subset._subset_meta.seed_species_count).toBe(50);
    expect(subset.species.length).toBeGreaterThan(50);
    expect(speciesIds.has('solanum_phureja')).toBe(true);
    expect(speciesIds.has('vaccinium_corymbosum_biloxi')).toBe(true);
    expect(speciesIds.has('solanum_lycopersicum_san_marzano')).toBe(true);
    expect(speciesIds.has('ulex_europaeus')).toBe(true);

    expect(sourceIds.has('restrepo-1996-bocashi')).toBe(true);
    expect(sourceIds.has('pinheiro-machado-2017-biofertilizantes')).toBe(true);
    expect(sourceIds.has('ingham-2000-compost-tea')).toBe(true);

    for (const sp of subset.species) {
      for (const field of REF_FIELDS_TO_CLOSE) {
        for (const refId of sp[field] || []) {
          expect(speciesIds.has(refId), `${sp.id}.${field} -> ${refId} no existe en species[]`).toBe(true);
        }
      }
    }

    for (const bp of subset.biopreparados) {
      for (const sid of bp.source_ids || []) {
        expect(sourceIds.has(sid), `biopreparado ${bp.id} -> ${sid} no existe en sources[]`).toBe(true);
      }
    }

    const amb13 = validateAmb13_crossRefs(subset, true);
    expect(amb13.errors).toEqual([]);
  });
});
