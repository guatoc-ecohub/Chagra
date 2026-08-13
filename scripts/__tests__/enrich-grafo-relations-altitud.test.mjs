import { describe, expect, it } from 'vitest';

import {
  buildAltitudSql,
  mergeAltitudIntoGrafoRelations,
  pickAltitudFields,
} from '../enrich-grafo-relations-altitud.mjs';
import { parseGraphRows } from '../export-graph-to-catalog.mjs';

describe('buildAltitudSql', () => {
  it('emite un WHERE s.id IN [...] con los ids dados, sin traer todo el grafo', () => {
    const sql = buildAltitudSql(['alnus_acuminata', "o'brien_test"]);
    expect(sql).toContain("MATCH (s:Species)");
    expect(sql).toContain("WHERE s.id IN ['alnus_acuminata','o''brien_test']");
    expect(sql).toContain('altitud_min: s.altitud_min');
    expect(sql).toContain('helada_letal: s.helada_letal');
  });

  it('usa el nombre de grafo pasado por parámetro', () => {
    const sql = buildAltitudSql(['x'], 'otro_grafo');
    expect(sql).toContain("cypher('otro_grafo'");
  });
});

describe('pickAltitudFields', () => {
  it('conserva solo los campos numéricos no nulos', () => {
    expect(pickAltitudFields({ id: 'x', altitud_min: 800, altitud_max: null, temp_min: '' })).toEqual({
      altitud_min: 800,
    });
  });

  it('convierte strings numéricos (agtype los puede traer como string)', () => {
    expect(pickAltitudFields({ altitud_min: '800', altitud_max: '2200' })).toEqual({
      altitud_min: 800,
      altitud_max: 2200,
    });
  });

  it('fila sin ningún campo de altitud/temp → objeto vacío', () => {
    expect(pickAltitudFields({ id: 'x', nombre_comun: 'Y' })).toEqual({});
  });
});

describe('mergeAltitudIntoGrafoRelations', () => {
  const baseGrafo = {
    _meta: { schema_version: 1 },
    species: {
      gliricidia_sepium: { nombre_comun: 'Matarratón', compatible_with: ['albizia_guachapele'] },
      alnus_acuminata: { nombre_comun: 'Aliso' },
    },
  };

  it('enriquece SOLO las especies ya presentes en species, preservando sus otros campos', () => {
    const rows = [
      { id: 'gliricidia_sepium', altitud_min: 0, altitud_max: 1200, temp_min: 20, temp_max: 30, helada_letal: 0 },
    ];
    const { grafoRelations, enriched, skippedNotInSpecies, skippedNoData } = mergeAltitudIntoGrafoRelations(baseGrafo, rows);
    expect(enriched).toBe(1);
    expect(skippedNotInSpecies).toBe(0);
    expect(skippedNoData).toBe(0);
    expect(grafoRelations.species.gliricidia_sepium).toEqual({
      nombre_comun: 'Matarratón',
      compatible_with: ['albizia_guachapele'],
      altitud_min: 0,
      altitud_max: 1200,
      temp_min: 20,
      temp_max: 30,
      helada_letal: 0,
    });
    // la especie NO tocada por esta fila queda intacta.
    expect(grafoRelations.species.alnus_acuminata).toEqual({ nombre_comun: 'Aliso' });
  });

  it('NUNCA agrega una especie nueva al catálogo offline (fila con id ausente de species)', () => {
    const rows = [{ id: 'especie_inventada', altitud_min: 100, altitud_max: 200 }];
    const { grafoRelations, enriched, skippedNotInSpecies } = mergeAltitudIntoGrafoRelations(baseGrafo, rows);
    expect(enriched).toBe(0);
    expect(skippedNotInSpecies).toBe(1);
    expect(Object.keys(grafoRelations.species)).toEqual(['gliricidia_sepium', 'alnus_acuminata']);
  });

  it('fila del grafo sin ningún dato de altitud/temp (todos null) no modifica la especie', () => {
    const rows = [{ id: 'alnus_acuminata', altitud_min: null, altitud_max: null, temp_min: null, temp_max: null, helada_letal: null }];
    const { grafoRelations, enriched, skippedNoData } = mergeAltitudIntoGrafoRelations(baseGrafo, rows);
    expect(enriched).toBe(0);
    expect(skippedNoData).toBe(1);
    expect(grafoRelations.species.alnus_acuminata).toEqual({ nombre_comun: 'Aliso' });
  });

  it('no muta el objeto grafoRelations original (PURA)', () => {
    const rows = [{ id: 'alnus_acuminata', altitud_min: 1500, altitud_max: 3200 }];
    mergeAltitudIntoGrafoRelations(baseGrafo, rows);
    expect(baseGrafo.species.alnus_acuminata).toEqual({ nombre_comun: 'Aliso' });
  });

  it('integración con parseGraphRows: parsea salida agtype cruda de psql y mergea', () => {
    const psqlOutput = [
      'LOAD',
      'SET',
      '{"id": "gliricidia_sepium", "altitud_max": 1200, "altitud_min": 0, "temp_min": 20, "temp_max": 30, "helada_letal": 0}',
      '{"id": "alnus_acuminata", "altitud_max": 3200, "altitud_min": 1500}',
    ].join('\n');
    const rows = parseGraphRows(psqlOutput);
    const { grafoRelations, enriched } = mergeAltitudIntoGrafoRelations(baseGrafo, rows);
    expect(enriched).toBe(2);
    expect(grafoRelations.species.gliricidia_sepium.altitud_min).toBe(0);
    expect(grafoRelations.species.alnus_acuminata.altitud_max).toBe(3200);
  });
});
