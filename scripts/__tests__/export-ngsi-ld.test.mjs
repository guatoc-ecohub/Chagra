/**
 * scripts/__tests__/export-ngsi-ld.test.mjs
 *
 * Cobertura unitaria del export NGSI-LD AgriCrop (ADR-051 fase 1). NO toca
 * red ni broker; verifica únicamente que las funciones puras
 * `buildAgriCropEntity(entities)` y `validateAgriCropEntity(entities)`
 * producen/validan entidades NGSI-LD bien-formadas a partir de fixtures
 * sintéticos + de una muestra del catálogo OSS real.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import {
  NGSI_LD_CORE_CONTEXT,
  AGRIFOOD_CONTEXT,
  DEFAULT_CONTEXT,
  agriCropUrn,
  agriPestUrn,
  ngsiProperty,
  ngsiRelationship,
  derivePestSlugs,
  buildAgriCropEntity,
  buildAgriCropEntities,
  validateAgriCropEntity,
  validateAgriCropEntities,
} from '../export-ngsi-ld.mjs';

describe('agriCropUrn / agriPestUrn', () => {
  it('construye el URN AgriCrop con prefijo canónico', () => {
    expect(agriCropUrn('solanum_lycopersicum')).toBe('urn:ngsi-ld:AgriCrop:solanum_lycopersicum');
  });

  it('construye el URN AgriPest con prefijo canónico', () => {
    expect(agriPestUrn('roya')).toBe('urn:ngsi-ld:AgriPest:roya');
  });

  it('trimea espacios en el id de entrada', () => {
    expect(agriCropUrn('  allium_cepa  ')).toBe('urn:ngsi-ld:AgriCrop:allium_cepa');
  });
});

describe('DEFAULT_CONTEXT', () => {
  it('incluye el contexto Agrifood y el contexto núcleo NGSI-LD, en ese orden', () => {
    expect(DEFAULT_CONTEXT).toEqual([AGRIFOOD_CONTEXT, NGSI_LD_CORE_CONTEXT]);
  });

  it('son URLs https válidas', () => {
    for (const ctx of DEFAULT_CONTEXT) {
      expect(ctx).toMatch(/^https:\/\//);
    }
  });
});

describe('ngsiProperty', () => {
  it('envuelve un valor no vacío en {type: Property, value}', () => {
    expect(ngsiProperty('Cebolla cabezona')).toEqual({ type: 'Property', value: 'Cebolla cabezona' });
  });

  it('devuelve null para null/undefined/string vacío', () => {
    expect(ngsiProperty(null)).toBeNull();
    expect(ngsiProperty(undefined)).toBeNull();
    expect(ngsiProperty('')).toBeNull();
  });
});

describe('ngsiRelationship', () => {
  it('construye un atributo Relationship apuntando al objeto', () => {
    expect(ngsiRelationship('urn:ngsi-ld:AgriPest:roya')).toEqual({
      type: 'Relationship',
      object: 'urn:ngsi-ld:AgriPest:roya',
    });
  });
});

describe('derivePestSlugs', () => {
  it('normaliza y deduplica plagas_criticas[]', () => {
    const slugs = derivePestSlugs([
      'Hemileia vastatrix (roya)',
      'Hypothenemus hampei (broca)',
      'Hemileia vastatrix (roya)', // duplicado
    ]);
    expect(slugs).toEqual(['hemileia_vastatrix_roya', 'hypothenemus_hampei_broca']);
  });

  it('devuelve [] para undefined/array vacío', () => {
    expect(derivePestSlugs(undefined)).toEqual([]);
    expect(derivePestSlugs([])).toEqual([]);
  });
});

describe('buildAgriCropEntity — fixtures sintéticos', () => {
  it('mapea nombre_comun -> name, nombre_cientifico -> alternateName, valor_pedagogico -> description', () => {
    const species = {
      id: 'solanum_lycopersicum_san_marzano',
      nombre_comun: 'Tomate San Marzano',
      nombre_cientifico: 'Solanum lycopersicum L.',
      valor_pedagogico: 'Tomate de crecimiento indeterminado, alto valor culinario.',
      plagas_criticas: [],
    };
    const entity = buildAgriCropEntity(species);

    expect(entity.id).toBe('urn:ngsi-ld:AgriCrop:solanum_lycopersicum_san_marzano');
    expect(entity.type).toBe('AgriCrop');
    expect(entity.name).toEqual({ type: 'Property', value: 'Tomate San Marzano' });
    expect(entity.alternateName).toEqual({ type: 'Property', value: 'Solanum lycopersicum L.' });
    expect(entity.description).toEqual({
      type: 'Property',
      value: 'Tomate de crecimiento indeterminado, alto valor culinario.',
    });
    expect(entity['@context']).toEqual(DEFAULT_CONTEXT);
  });

  it('mapea plagas_criticas[] -> hasAgriPest (array de Relationship)', () => {
    const species = {
      id: 'coffea_arabica',
      nombre_comun: 'Café',
      plagas_criticas: ['Hypothenemus hampei (broca)', 'Hemileia vastatrix (roya)'],
    };
    const entity = buildAgriCropEntity(species);

    expect(entity.hasAgriPest).toHaveLength(2);
    expect(entity.hasAgriPest[0]).toEqual({
      type: 'Relationship',
      object: 'urn:ngsi-ld:AgriPest:hypothenemus_hampei_broca',
    });
    expect(entity.hasAgriPest[1]).toEqual({
      type: 'Relationship',
      object: 'urn:ngsi-ld:AgriPest:hemileia_vastatrix_roya',
    });
  });

  it('NO agrega hasAgriPest si plagas_criticas está vacío o ausente', () => {
    const entity = buildAgriCropEntity({ id: 'zea_mays', nombre_comun: 'Maíz' });
    expect(entity.hasAgriPest).toBeUndefined();
  });

  it('NO agrega alternateName/description si faltan en el catálogo (no inventa datos)', () => {
    const entity = buildAgriCropEntity({ id: 'zea_mays', nombre_comun: 'Maíz' });
    expect(entity.alternateName).toBeUndefined();
    expect(entity.description).toBeUndefined();
    // Campos FIWARE sin equivalente en Chagra: nunca deben aparecer inventados.
    expect(entity.agroVocConcept).toBeUndefined();
    expect(entity.harvestingInterval).toBeUndefined();
    expect(entity.plantingFrom).toBeUndefined();
    expect(entity.hasAgriSoil).toBeUndefined();
  });

  it('trunca description larga (reusa truncText de catalog-to-age, maxLen 500)', () => {
    const largo = 'x'.repeat(900);
    const entity = buildAgriCropEntity({ id: 'sp1', nombre_comun: 'Especie X', valor_pedagogico: largo });
    expect(entity.description.value.length).toBe(500);
    expect(entity.description.value.endsWith('...')).toBe(true);
  });

  it('devuelve null si falta id o nombre_comun (no rellena con datos falsos)', () => {
    expect(buildAgriCropEntity({ nombre_comun: 'Sin id' })).toBeNull();
    expect(buildAgriCropEntity({ id: 'sin_nombre' })).toBeNull();
    expect(buildAgriCropEntity(null)).toBeNull();
  });
});

describe('buildAgriCropEntities', () => {
  const fixture = {
    species: [
      { id: 'sp_a', nombre_comun: 'Especie A' },
      { id: 'sp_b', nombre_comun: 'Especie B', plagas_criticas: ['roya'] },
      { nombre_comun: 'Sin id, se omite' },
    ],
  };

  it('emite una entidad por species válida y reporta las omitidas', () => {
    const { entities, report } = buildAgriCropEntities(fixture);
    expect(entities).toHaveLength(2);
    expect(report.total).toBe(3);
    expect(report.emitted).toBe(2);
    expect(report.omitted).toHaveLength(1);
  });

  it('respeta --limit (slicing de species[])', () => {
    const { entities, report } = buildAgriCropEntities(fixture, { limit: 1 });
    expect(entities).toHaveLength(1);
    expect(report.total).toBe(1);
  });

  it('es determinista: misma entrada produce misma salida (idempotente)', () => {
    const first = buildAgriCropEntities(fixture);
    const second = buildAgriCropEntities(fixture);
    expect(JSON.stringify(first.entities)).toBe(JSON.stringify(second.entities));
  });
});

describe('validateAgriCropEntity', () => {
  it('valida OK una entidad bien formada', () => {
    const entity = buildAgriCropEntity({
      id: 'sp1',
      nombre_comun: 'Especie X',
      nombre_cientifico: 'Species x L.',
      plagas_criticas: ['roya'],
    });
    const { valid, errors } = validateAgriCropEntity(entity);
    expect(valid).toBe(true);
    expect(errors).toEqual([]);
  });

  it('rechaza id sin prefijo urn:ngsi-ld:AgriCrop:', () => {
    const { valid, errors } = validateAgriCropEntity({
      id: 'not-a-urn',
      type: 'AgriCrop',
      name: { type: 'Property', value: 'x' },
      '@context': DEFAULT_CONTEXT,
    });
    expect(valid).toBe(false);
    expect(errors.some((e) => e.includes('id inválido'))).toBe(true);
  });

  it('rechaza type distinto de AgriCrop', () => {
    const { valid, errors } = validateAgriCropEntity({
      id: 'urn:ngsi-ld:AgriCrop:x',
      type: 'AgriPest',
      name: { type: 'Property', value: 'x' },
      '@context': DEFAULT_CONTEXT,
    });
    expect(valid).toBe(false);
    expect(errors.some((e) => e.includes('type inválido'))).toBe(true);
  });

  it('rechaza name ausente o mal formado', () => {
    expect(validateAgriCropEntity({
      id: 'urn:ngsi-ld:AgriCrop:x',
      type: 'AgriCrop',
      '@context': DEFAULT_CONTEXT,
    }).valid).toBe(false);

    expect(validateAgriCropEntity({
      id: 'urn:ngsi-ld:AgriCrop:x',
      type: 'AgriCrop',
      name: { type: 'Property', value: '' },
      '@context': DEFAULT_CONTEXT,
    }).valid).toBe(false);
  });

  it('rechaza @context faltante', () => {
    const { valid, errors } = validateAgriCropEntity({
      id: 'urn:ngsi-ld:AgriCrop:x',
      type: 'AgriCrop',
      name: { type: 'Property', value: 'x' },
    });
    expect(valid).toBe(false);
    expect(errors.some((e) => e.includes('@context'))).toBe(true);
  });

  it('rechaza hasAgriPest mal formado (relationship sin urn AgriPest válido)', () => {
    const { valid, errors } = validateAgriCropEntity({
      id: 'urn:ngsi-ld:AgriCrop:x',
      type: 'AgriCrop',
      name: { type: 'Property', value: 'x' },
      hasAgriPest: [{ type: 'Relationship', object: 'roya' }],
      '@context': DEFAULT_CONTEXT,
    });
    expect(valid).toBe(false);
    expect(errors.some((e) => e.includes('hasAgriPest'))).toBe(true);
  });
});

describe('validateAgriCropEntities (agregado)', () => {
  it('reporta valid=true cuando todas las entidades son válidas', () => {
    const { entities } = buildAgriCropEntities({
      species: [
        { id: 'sp_a', nombre_comun: 'Especie A' },
        { id: 'sp_b', nombre_comun: 'Especie B', plagas_criticas: ['roya'] },
      ],
    });
    const result = validateAgriCropEntities(entities);
    expect(result.valid).toBe(true);
    expect(result.invalidCount).toBe(0);
  });

  it('reporta detalle por entidad inválida', () => {
    const result = validateAgriCropEntities([
      { id: 'no-urn', type: 'AgriCrop', name: { type: 'Property', value: 'x' }, '@context': DEFAULT_CONTEXT },
    ]);
    expect(result.valid).toBe(false);
    expect(result.invalidCount).toBe(1);
    expect(result.details[0].errors.length).toBeGreaterThan(0);
  });
});

// =============================================================================
// Integración: muestra real del catálogo OSS v3.2 (ADR-051 fase 1)
// =============================================================================

describe('buildAgriCropEntities — muestra real del catálogo OSS v3.2', () => {
  const catalogPath = resolve('catalog/chagra-catalog-oss-subset-v3.2.json');
  let seed = null;
  try {
    seed = JSON.parse(readFileSync(catalogPath, 'utf-8'));
  } catch {
    // En CI sin acceso al catálogo (poco probable acá), skip suave.
    seed = null;
  }

  it.skipIf(!seed)('emite entidades NGSI-LD AgriCrop válidas para una muestra de 25 species', () => {
    const { entities, report } = buildAgriCropEntities(seed, { limit: 25 });
    expect(report.total).toBe(25);
    expect(entities.length).toBeGreaterThan(0);

    const validation = validateAgriCropEntities(entities);
    expect(validation.details).toEqual([]);
    expect(validation.valid).toBe(true);
  });

  it.skipIf(!seed)('cada entidad emitida tiene id URN AgriCrop único', () => {
    const { entities } = buildAgriCropEntities(seed, { limit: 50 });
    const ids = entities.map((e) => e.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const id of ids) {
      expect(id).toMatch(/^urn:ngsi-ld:AgriCrop:.+$/);
    }
  });

  it.skipIf(!seed)('species reales con plagas_criticas producen hasAgriPest válido (ej. café)', () => {
    const cafe = seed.species.find((s) => Array.isArray(s.plagas_criticas) && s.plagas_criticas.length > 0);
    expect(cafe).toBeTruthy();

    const entity = buildAgriCropEntity(cafe);
    const { valid, errors } = validateAgriCropEntity(entity);
    expect(valid).toBe(true);
    expect(errors).toEqual([]);
    expect(entity.hasAgriPest.length).toBe(cafe.plagas_criticas.length);
  });

  it.skipIf(!seed)('no inventa agroVocConcept/harvestingInterval/plantingFrom/hasAgriSoil (gaps documentados en ADR-051)', () => {
    const { entities } = buildAgriCropEntities(seed, { limit: 25 });
    for (const entity of entities) {
      expect(entity.agroVocConcept).toBeUndefined();
      expect(entity.harvestingInterval).toBeUndefined();
      expect(entity.plantingFrom).toBeUndefined();
      expect(entity.hasAgriSoil).toBeUndefined();
    }
  });
});
