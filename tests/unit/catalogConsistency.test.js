import { describe, expect, it } from 'vitest';

import {
  inferBaseId,
  isValidBinomialScientificName,
  validateCatalogConsistency,
} from '../../scripts/validate-catalog-consistency.mjs';
import {
  buildGraphParitySql,
  formatGraphParityReport,
  parsePsqlRows,
} from '../../scripts/validate-graph-parity.mjs';

function baseCatalog(overrides = {}) {
  return {
    species: [
      {
        id: 'solanum_lycopersicum',
        nombre_cientifico: 'Solanum lycopersicum L.',
        plagas_criticas: ['Tuta absoluta'],
        enfermedades_criticas: ['Phytophthora infestans'],
        feeding_plan_template: {
          primary_steps: [{ biofertilizer_slug: 'caldo_bordeles' }],
        },
      },
      {
        id: 'solanum_lycopersicum_san_marzano',
        nombre_cientifico: "Solanum lycopersicum 'San Marzano'",
        plagas_criticas: ['Tuta absoluta'],
        enfermedades_criticas: ['Phytophthora infestans'],
        feeding_plan_template: {
          primary_steps: [{ biofertilizer_slug: 'caldo_bordeles' }],
        },
      },
    ],
    biopreparados: [{ id: 'caldo_bordeles' }],
    pests: [{ id: 'tuta_absoluta' }, { id: 'phytophthora_infestans' }],
    ...overrides,
  };
}

describe('catalog consistency validator', () => {
  it('accepts a base species that contains the pest and biopreparado refs of its variety', () => {
    const result = validateCatalogConsistency(baseCatalog());
    expect(result.ok).toBe(true);
    expect(result.issues).toEqual([]);
  });

  it('detects base to variety parity gaps with offenders', () => {
    const catalog = baseCatalog({
      species: [
        {
          id: 'solanum_lycopersicum',
          nombre_cientifico: 'Solanum lycopersicum L.',
          plagas_criticas: [],
          feeding_plan_template: { primary_steps: [] },
        },
        {
          id: 'solanum_lycopersicum_san_marzano',
          nombre_cientifico: "Solanum lycopersicum 'San Marzano'",
          plagas_criticas: ['Tuta absoluta'],
          feeding_plan_template: {
            primary_steps: [{ biofertilizer_slug: 'caldo_bordeles' }],
          },
        },
      ],
    });

    const result = validateCatalogConsistency(catalog);

    expect(result.ok).toBe(false);
    expect(result.issues).toEqual(expect.arrayContaining([
      expect.objectContaining({
        code: 'base_variety_parity_pest',
        offender: expect.objectContaining({
          id: 'solanum_lycopersicum_san_marzano',
          base_id: 'solanum_lycopersicum',
          ref: 'Tuta absoluta',
        }),
      }),
      expect.objectContaining({
        code: 'base_variety_parity_biopreparado',
        offender: expect.objectContaining({
          id: 'solanum_lycopersicum_san_marzano',
          base_id: 'solanum_lycopersicum',
          ref: 'caldo_bordeles',
        }),
      }),
    ]));
  });

  it('allows documented parity exclusions', () => {
    const catalog = baseCatalog({
      species: [
        {
          id: 'solanum_lycopersicum',
          nombre_cientifico: 'Solanum lycopersicum L.',
        },
        {
          id: 'solanum_lycopersicum_san_marzano',
          nombre_cientifico: "Solanum lycopersicum 'San Marzano'",
          plagas_criticas: ['Tuta absoluta'],
          justificacion_exclusion: [{ tipo: 'pest', id: 'Tuta absoluta' }],
        },
      ],
    });

    expect(validateCatalogConsistency(catalog).issues).not.toEqual(expect.arrayContaining([
      expect.objectContaining({ code: 'base_variety_parity_pest' }),
    ]));
  });

  it('detects duplicate ids across species and biopreparados', () => {
    const catalog = baseCatalog({
      species: [
        { id: 'zea_mays', nombre_cientifico: 'Zea mays L.' },
        { id: 'zea_mays', nombre_cientifico: 'Zea mays L.' },
      ],
      biopreparados: [{ id: 'zea_mays' }, { id: 'biol' }, { id: 'biol' }],
    });

    const result = validateCatalogConsistency(catalog);
    expect(result.issues.filter((issue) => issue.code === 'duplicate_id')).toHaveLength(3);
  });

  it('validates scientific names as binomial names with optional authors or cultivar markers', () => {
    expect(isValidBinomialScientificName('Solanum lycopersicum L.')).toBe(true);
    expect(isValidBinomialScientificName("Solanum lycopersicum 'San Marzano'")).toBe(true);
    expect(isValidBinomialScientificName("Fragaria x ananassa 'Monterrey'")).toBe(true);
    expect(isValidBinomialScientificName("Ananas comosus (L.) Merr. 'MD-2'")).toBe(true);
    expect(isValidBinomialScientificName('Solanum')).toBe(false);
    expect(isValidBinomialScientificName('solanum lycopersicum')).toBe(false);
    expect(isValidBinomialScientificName('Solanum_lycopersicum')).toBe(false);
  });

  it('detects varieties that point to a missing base species', () => {
    const catalog = baseCatalog({
      species: [{
        id: 'solanum_lycopersicum_san_marzano',
        nombre_cientifico: "Solanum lycopersicum 'San Marzano'",
      }],
    });

    const result = validateCatalogConsistency(catalog);
    expect(result.issues).toEqual(expect.arrayContaining([
      expect.objectContaining({
        code: 'missing_base_species',
        offender: expect.objectContaining({
          id: 'solanum_lycopersicum_san_marzano',
          base_id: 'solanum_lycopersicum',
        }),
      }),
    ]));
  });

  it('detects missing pest and biopreparado references when registries exist', () => {
    const catalog = baseCatalog({
      species: [{
        id: 'zea_mays',
        nombre_cientifico: 'Zea mays L.',
        plagas_criticas: ['Spodoptera frugiperda'],
        feeding_plan_template: {
          primary_steps: [{ biofertilizer_slug: 'bio_inventado' }],
        },
      }],
      biopreparados: [{ id: 'biol' }],
      pests: [{ id: 'tuta_absoluta' }],
    });

    const result = validateCatalogConsistency(catalog);
    expect(result.issues).toEqual(expect.arrayContaining([
      expect.objectContaining({ code: 'missing_pest_ref' }),
      expect.objectContaining({ code: 'missing_biopreparado_ref' }),
    ]));
  });

  it('infers the nearest existing base id before falling back to the binomial marker', () => {
    const ids = new Set(['solanum_tuberosum', 'solanum_tuberosum_andigena']);
    expect(inferBaseId({ id: 'solanum_tuberosum_andigena_pastusa' }, ids))
      .toBe('solanum_tuberosum_andigena');
    expect(inferBaseId({
      id: 'solanum_lycopersicum_san_marzano',
      nombre_cientifico: "Solanum lycopersicum 'San Marzano'",
    }, new Set())).toBe('solanum_lycopersicum');
  });
});

describe('graph parity validator helpers', () => {
  it('builds a read-only AGE query for pest and biopreparado parity', () => {
    const sql = buildGraphParitySql('chagra_kg');

    expect(sql).toContain("cypher('chagra_kg'");
    expect(sql).toContain("variety.id STARTS WITH base.id + '_'");
    expect(sql).toContain('TARGETS_PEST');
    expect(sql).toContain('USED_AS_BIOPREPARADO');
    expect(sql).not.toMatch(/\b(CREATE|MERGE|DELETE|REMOVE)\b/i);
    expect(sql).not.toMatch(/\bSET\s+(base|variety)\./i);
  });

  it('parses tabular psql rows returned as agtype strings', () => {
    const rows = parsePsqlRows('"solanum_lycopersicum"\t"solanum_lycopersicum_san_marzano"\t"TARGETS_PEST"\t"tuta_absoluta"\n');

    expect(rows).toEqual([{
      base_id: 'solanum_lycopersicum',
      variety_id: 'solanum_lycopersicum_san_marzano',
      relation: 'TARGETS_PEST',
      missing_id: 'tuta_absoluta',
    }]);
  });

  it('formats graph parity offenders with counts by relation', () => {
    const report = formatGraphParityReport([
      {
        base_id: 'solanum_lycopersicum',
        variety_id: 'solanum_lycopersicum_san_marzano',
        relation: 'TARGETS_PEST',
        missing_id: 'tuta_absoluta',
      },
      {
        base_id: 'solanum_lycopersicum',
        variety_id: 'solanum_lycopersicum_san_marzano',
        relation: 'USED_AS_BIOPREPARADO',
        missing_id: 'caldo_bordeles',
      },
    ]);

    expect(report).toContain('Graph parity gaps: 2');
    expect(report).toContain('- TARGETS_PEST: 1');
    expect(report).toContain('- USED_AS_BIOPREPARADO: 1');
    expect(report).toContain('base=solanum_lycopersicum');
  });
});
