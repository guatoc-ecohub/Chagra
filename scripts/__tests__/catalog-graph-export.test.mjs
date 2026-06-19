import { describe, expect, it } from 'vitest';

import {
  buildGraphExportSql,
  graphRowsToCatalog,
  parseGraphRows,
} from '../export-graph-to-catalog.mjs';
import {
  findSeedConflicts,
  validateCatalogExport,
} from '../validate-catalog-export.mjs';

const seed = {
  schema_version: '3.1',
  species: [
    {
      id: 'solanum_lycopersicum',
      nombre_comun: 'Tomate',
      nombre_cientifico: 'Solanum lycopersicum L.',
      familia_botanica: 'Solanaceae',
      category: 'hortalizas_fruto_flor',
      thermal_zones: ['templado'],
      roles_in_guild: ['crop'],
      cultivable: true,
      conservation_status: 'cultivo_comun',
      altitud_msnm: { min_absoluto: 0, optimo_min: 800, optimo_max: 1800, max_absoluto: 2400 },
      source_ids: ['seed-source'],
      tracking_mode: 'aggregate',
    },
  ],
  sources: [
    {
      id: 'seed-source',
      tipo: 'base_datos',
      autores: 'Seed',
      titulo: 'Seed source',
      _url_pendiente: true,
    },
  ],
  biopreparados: [],
};

describe('export-graph-to-catalog', () => {
  it('emite SQL para ejecutarse por STDIN y no invoca psql internamente', () => {
    const sql = buildGraphExportSql('chagra_kg');
    expect(sql).toContain("LOAD 'age'");
    expect(sql).toContain('MATCH (s:Species)');
    expect(sql).toContain('ASOCIA_CON');
    expect(sql).toContain('USED_AS_BIOPREPARADO');
    expect(sql).toContain('TIENE_ETAPA');
  });

  it('parsea filas agtype impresas por psql', () => {
    const rows = parseGraphRows(`
LOAD
SET
{"id": "abatia_parviflora", "category": "arbol", "cultivable": true, "nombre_comun": "Duraznillo", "familia_botanica": "Salicaceae", "nombre_cientifico": "Abatia parviflora Ruiz & Pav.", "altitud_min_msnm": 1800, "altitud_max_msnm": 3200, "fuente_agroclima": "Instituto Humboldt"}
`);
    expect(rows).toHaveLength(1);
    expect(rows[0].id).toBe('abatia_parviflora');
  });

  it('convierte species nuevas usando solo campos del grafo y fuentes del grafo', () => {
    const catalog = graphRowsToCatalog([
      {
        id: 'abatia_parviflora',
        category: 'arbol',
        cultivable: true,
        nombre_comun: 'Duraznillo',
        familia_botanica: 'Salicaceae',
        nombre_cientifico: 'Abatia parviflora Ruiz & Pav.',
        altitud_min_msnm: 1800,
        altitud_max_msnm: 3200,
        fuente_agroclima: 'Instituto Humboldt',
        companions: ['solanum_lycopersicum'],
      },
    ], { seed });

    expect(catalog.species).toHaveLength(1);
    expect(catalog.species[0]).toMatchObject({
      id: 'abatia_parviflora',
      category: 'arboles_sombra',
      thermal_zones: ['templado', 'frio', 'paramo'],
      roles_in_guild: ['nurse_plant'],
      conservation_status: 'no_evaluada',
      source_ids: ['graph_instituto_humboldt_agroclima'],
    });
    expect(catalog.sources[0]).toMatchObject({
      id: 'graph_instituto_humboldt_agroclima',
      tipo: 'ficha_tecnica_institucional',
      autores: 'Instituto Humboldt',
    });
    expect(catalog._graph_export_meta.species_new_vs_seed).toBe(1);
  });

  it('preserva la ficha del seed para ids existentes y sanea sources legacy', () => {
    const catalog = graphRowsToCatalog([
      {
        id: 'solanum_lycopersicum',
        category: 'hortaliza',
        nombre_comun: 'Tomate chonto',
      },
    ], { seed });

    expect(catalog.species).toHaveLength(1);
    expect(catalog.species[0].nombre_comun).toBe('Tomate');
    expect(catalog.sources[0]._url_pendiente).toBeUndefined();
    expect(catalog._graph_export_meta.species_already_in_seed).toBe(1);
  });

  it('omite species nuevas que no pueden cumplir v3.1 sin inventar campos', () => {
    const catalog = graphRowsToCatalog([
      {
        id: 'sin_categoria',
        cultivable: true,
        nombre_comun: 'Sin categoria',
        familia_botanica: 'Asteraceae',
        nombre_cientifico: 'Ageratina example',
        altitud_min_msnm: 1800,
        altitud_max_msnm: 2400,
        fuente_agroclima: 'Fuente tecnica',
      },
    ], { seed });

    expect(catalog.species).toHaveLength(0);
    expect(catalog._graph_export_meta.species_skipped_not_schema_ready).toBe(1);
    expect(catalog._graph_export_meta.skipped_examples[0].missing).toContain('category');
  });
});

describe('validate-catalog-export', () => {
  it('detecta conflictos contra ids ya presentes en el seed', () => {
    const conflicts = findSeedConflicts({
      species: [
        {
          ...seed.species[0],
          nombre_cientifico: 'Solanum pimpinellifolium L.',
        },
      ],
    }, seed);
    expect(conflicts).toEqual([
      expect.objectContaining({
        id: 'solanum_lycopersicum',
        field: 'nombre_cientifico',
        reason: 'seed_conflict',
      }),
    ]);
  });

  it('valida schema minimo y conflictos en un export correcto', () => {
    const schema = {
      type: 'object',
      required: ['schema_version', 'species', 'sources', 'biopreparados'],
      properties: {
        schema_version: { type: 'string' },
        species: {
          type: 'array',
          items: {
            type: 'object',
            required: ['id', 'nombre_cientifico'],
            properties: {
              id: { type: 'string' },
              nombre_cientifico: { type: 'string' },
            },
          },
        },
        sources: { type: 'array' },
        biopreparados: { type: 'array' },
      },
    };
    const result = validateCatalogExport({
      schema_version: '3.1',
      species: [{ id: 'abatia_parviflora', nombre_cientifico: 'Abatia parviflora Ruiz & Pav.' }],
      sources: [],
      biopreparados: [],
    }, schema, seed);

    expect(result.ok).toBe(true);
    expect(result.stats.species_new_vs_seed).toBe(1);
  });
});
