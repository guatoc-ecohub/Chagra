/**
 * scripts/__tests__/ngsi-validate.test.mjs
 *
 * Cobertura del ítem de fase 1 de ADR-051 "Validación conformidad NGSI-LD
 * (ajv vs schemas oficiales) en CI": verifica que `validateEntityAjv` /
 * `validateEntitiesAjv` (scripts/lib/ngsi-validate.mjs) validan las
 * entidades emitidas por `export-ngsi-ld.mjs` contra los JSON Schema
 * OFICIALES vendorizados de smart-data-models/dataModel.Agrifood — no
 * contra una reimplementación propia del schema.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import {
  toSimplifiedEntity,
  validateEntityAjv,
  validateEntitiesAjv,
} from '../lib/ngsi-validate.mjs';

import {
  buildAgriCropEntity,
  buildAgriPestEntity,
} from '../export-ngsi-ld.mjs';

describe('toSimplifiedEntity', () => {
  it('aplana Property/Relationship a valores planos (keyValues), preserva id/type/@context', () => {
    const entity = buildAgriCropEntity({
      id: 'coffea_arabica',
      nombre_comun: 'Café',
      nombre_cientifico: 'Coffea arabica',
      plagas_criticas: ['Hypothenemus hampei (broca)'],
    });

    const simplified = toSimplifiedEntity(entity);

    expect(simplified.id).toBe('urn:ngsi-ld:AgriCrop:coffea_arabica');
    expect(simplified.type).toBe('AgriCrop');
    expect(simplified.name).toBe('Café');
    expect(simplified.alternateName).toBe('Coffea arabica');
    expect(simplified.hasAgriPest).toEqual(['urn:ngsi-ld:AgriPest:hypothenemus_hampei_broca']);
    expect(simplified['@context']).toEqual(entity['@context']);
  });
});

describe('validateEntityAjv — AgriCrop', () => {
  it('(a) valida OK una entidad AgriCrop bien formada contra el schema oficial', () => {
    const entity = buildAgriCropEntity({
      id: 'solanum_lycopersicum',
      nombre_comun: 'Tomate',
      nombre_cientifico: 'Solanum lycopersicum L.',
      valor_pedagogico: 'Cultivo indeterminado de alto valor culinario.',
      plagas_criticas: ['Tuta absoluta (polilla del tomate)'],
    });

    const { valid, errors } = validateEntityAjv(entity);
    expect(valid).toBe(true);
    expect(errors).toEqual([]);
  });

  it('(b) rechaza una entidad malformada sin id ni type', () => {
    const { valid, errors } = validateEntityAjv({
      name: { type: 'Property', value: 'Sin id ni type' },
    });

    expect(valid).toBe(false);
    expect(errors.length).toBeGreaterThan(0);
  });

  it('rechaza una entidad AgriCrop sin name (requerido por el schema oficial)', () => {
    const { valid, errors } = validateEntityAjv({
      id: 'urn:ngsi-ld:AgriCrop:sin_nombre',
      type: 'AgriCrop',
      '@context': ['https://uri.etsi.org/ngsi-ld/v1/ngsi-ld-core-context.jsonld'],
    });

    expect(valid).toBe(false);
    expect(errors.some((e) => e.includes('name'))).toBe(true);
  });

  it('rechaza hasAgriPest con un URN que no calza el patrón de identificador NGSI (ej. contiene espacios)', () => {
    const entity = buildAgriCropEntity({
      id: 'coffea_arabica',
      nombre_comun: 'Café',
    });
    // Fuerza un Relationship malformado (URN con espacios, fuera del patrón
    // EntityIdentifierType del schema oficial) para probar el rechazo.
    entity.hasAgriPest = [{ type: 'Relationship', object: 'urn:ngsi-ld:AgriPest:no valido' }];

    const { valid, errors } = validateEntityAjv(entity);
    expect(valid).toBe(false);
    expect(errors.length).toBeGreaterThan(0);
  });
});

describe('validateEntityAjv — AgriPest', () => {
  it('(c) valida OK una entidad AgriPest bien formada (shape string del catálogo público)', () => {
    const entity = buildAgriPestEntity('Hemileia vastatrix (roya)');
    const { valid, errors } = validateEntityAjv(entity);
    expect(valid).toBe(true);
    expect(errors).toEqual([]);
  });

  it('valida OK una entidad AgriPest con x-chagra-mip (atributo custom no restringido por el schema oficial)', () => {
    const entity = buildAgriPestEntity({
      nombre_cientifico: 'Hypothenemus hampei',
      nombre_comun: 'Broca del café',
      umbral_accion: '5% de frutos infestados',
      control_biologico: ['Beauveria bassiana'],
    });
    const { valid, errors } = validateEntityAjv(entity);
    expect(valid).toBe(true);
    expect(errors).toEqual([]);
  });

  it('rechaza una entidad AgriPest malformada sin id', () => {
    const { valid, errors } = validateEntityAjv({
      type: 'AgriPest',
      name: { type: 'Property', value: 'roya' },
    });
    expect(valid).toBe(false);
    expect(errors.length).toBeGreaterThan(0);
  });
});

describe('validateEntityAjv — casos borde', () => {
  it('rechaza entity no-objeto', () => {
    expect(validateEntityAjv(null).valid).toBe(false);
    expect(validateEntityAjv(undefined).valid).toBe(false);
    expect(validateEntityAjv('no-es-un-objeto').valid).toBe(false);
  });

  it('rechaza type sin schema oficial vendorizado', () => {
    const { valid, errors } = validateEntityAjv({ id: 'x', type: 'AgriSoil' });
    expect(valid).toBe(false);
    expect(errors[0]).toMatch(/sin schema oficial vendorizado/);
  });
});

describe('validateEntitiesAjv (agregado)', () => {
  it('reporta valid=true cuando AgriCrop + AgriPest son válidas', () => {
    const crop = buildAgriCropEntity({ id: 'zea_mays', nombre_comun: 'Maíz' });
    const pest = buildAgriPestEntity('Spodoptera frugiperda (gusano cogollero)');

    const result = validateEntitiesAjv([crop, pest]);
    expect(result.valid).toBe(true);
    expect(result.invalidCount).toBe(0);
  });

  it('reporta detalle por entidad inválida, incluyendo el type', () => {
    const result = validateEntitiesAjv([
      { id: 'urn:ngsi-ld:AgriCrop:x', type: 'AgriCrop' }, // sin name
    ]);
    expect(result.valid).toBe(false);
    expect(result.invalidCount).toBe(1);
    expect(result.details[0].type).toBe('AgriCrop');
    expect(result.details[0].errors.length).toBeGreaterThan(0);
  });
});

// =============================================================================
// Integración: muestra real del catálogo OSS v3.2 (ADR-051 fase 1)
// =============================================================================

describe('validateEntitiesAjv — muestra real del catálogo OSS v3.2', () => {
  const catalogPath = resolve('catalog/chagra-catalog-oss-subset-v3.2.json');
  let seed = null;
  try {
    seed = JSON.parse(readFileSync(catalogPath, 'utf-8'));
  } catch {
    seed = null; // En CI sin acceso al catálogo (poco probable aquí), skip suave.
  }

  it.skipIf(!seed)('las primeras 30 species del catálogo OSS producen AgriCrop conformes al schema oficial', () => {
    const entities = seed.species
      .slice(0, 30)
      .map((sp) => buildAgriCropEntity(sp))
      .filter(Boolean);
    expect(entities.length).toBeGreaterThan(0);

    const result = validateEntitiesAjv(entities);
    expect(result.details).toEqual([]);
    expect(result.valid).toBe(true);
  });

  it.skipIf(!seed)('las plagas reales con plagas_criticas producen AgriPest conformes al schema oficial', () => {
    const conPlagas = seed.species.find((s) => Array.isArray(s.plagas_criticas) && s.plagas_criticas.length > 0);
    expect(conPlagas).toBeTruthy();

    const entities = conPlagas.plagas_criticas
      .map((raw) => buildAgriPestEntity(raw))
      .filter(Boolean);
    expect(entities.length).toBeGreaterThan(0);

    const result = validateEntitiesAjv(entities);
    expect(result.details).toEqual([]);
    expect(result.valid).toBe(true);
  });
});
