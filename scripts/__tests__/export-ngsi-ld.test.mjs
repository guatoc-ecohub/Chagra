/**
 * scripts/__tests__/export-ngsi-ld.test.mjs
 *
 * Cobertura unitaria del export NGSI-LD AgriCrop + AgriPest + AgriProductType
 * (ADR-051 fase 1). NO toca red ni broker; verifica únicamente que las
 * funciones puras `buildAgriCropEntity`/`buildAgriPestEntity`/
 * `buildAgriProductTypeEntity` (y sus validadores) producen/validan
 * entidades NGSI-LD bien-formadas a partir de fixtures sintéticos + de una
 * muestra del catálogo OSS real.
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
  parsePestNameFromRaw,
  buildPestMipAttribute,
  derivePestRecords,
  buildAgriPestEntity,
  buildAgriPestEntities,
  validateAgriPestEntity,
  validateAgriPestEntities,
  agriProductTypeUrn,
  buildBiopreparadoClasificacionAttribute,
  buildAgriProductTypeEntity,
  buildAgriProductTypeEntities,
  validateAgriProductTypeEntity,
  validateAgriProductTypeEntities,
  agriParcelRecordUrn,
  buildAgriParcelRecordEntity,
  buildAgriParcelRecordEntities,
  validateAgriParcelRecordEntity,
  validateAgriParcelRecordEntities,
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
    // En CI sin acceso al catálogo (poco probable aquí), skip suave.
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

// =============================================================================
// AgriPest (ADR-051 fase 1, Anexo A fila AgriPest)
// =============================================================================

describe('parsePestNameFromRaw', () => {
  it('separa "Científico (comun)" en alternateName/name', () => {
    expect(parsePestNameFromRaw('Hemileia vastatrix (roya)')).toEqual({
      name: 'roya',
      alternateName: 'Hemileia vastatrix',
    });
    expect(parsePestNameFromRaw('Hypothenemus hampei (broca)')).toEqual({
      name: 'broca',
      alternateName: 'Hypothenemus hampei',
    });
  });

  it('sin paréntesis, devuelve el string completo como name y alternateName null', () => {
    expect(parsePestNameFromRaw('Scolytidae')).toEqual({ name: 'Scolytidae', alternateName: null });
    expect(parsePestNameFromRaw('Pulgones')).toEqual({ name: 'Pulgones', alternateName: null });
  });

  it('ambiguo (ninguno de los dos segmentos parece binomio): no adivina, conserva el string completo', () => {
    expect(parsePestNameFromRaw('trps (heliothis)')).toEqual({ name: 'trps (heliothis)', alternateName: null });
  });
});

describe('buildPestMipAttribute', () => {
  it('construye {type:Property, value} con los 3 campos MIP cuando están presentes', () => {
    const mip = buildPestMipAttribute({
      umbral_accion: '5% tubérculos dañados en muestreo',
      control_biologico: ['Trichogramma pretiosum sueltas 100mil/ha'],
      control_cultural: ['aporque profundo'],
    });
    expect(mip).toEqual({
      type: 'Property',
      value: {
        umbral_accion: '5% tubérculos dañados en muestreo',
        control_biologico: ['Trichogramma pretiosum sueltas 100mil/ha'],
        control_cultural: ['aporque profundo'],
      },
    });
  });

  it('devuelve null si no hay ningún campo MIP reconocible (no inventa)', () => {
    expect(buildPestMipAttribute({ nombre_cientifico: 'x', nombre_comun: 'y' })).toBeNull();
    expect(buildPestMipAttribute({})).toBeNull();
    expect(buildPestMipAttribute(null)).toBeNull();
  });

  it('omite campos MIP vacíos/mal tipados sin fallar', () => {
    const mip = buildPestMipAttribute({ umbral_accion: '', control_biologico: [], control_cultural: ['ok'] });
    expect(mip).toEqual({ type: 'Property', value: { control_cultural: ['ok'] } });
  });
});

describe('buildAgriPestEntity — shape string (catálogo público hoy)', () => {
  it('mapea "Científico (comun)" -> name/alternateName, sin x-chagra-mip (el string no trae MIP)', () => {
    const entity = buildAgriPestEntity('Hypothenemus hampei (broca)');
    expect(entity.id).toBe('urn:ngsi-ld:AgriPest:hypothenemus_hampei_broca');
    expect(entity.type).toBe('AgriPest');
    expect(entity.name).toEqual({ type: 'Property', value: 'broca' });
    expect(entity.alternateName).toEqual({ type: 'Property', value: 'Hypothenemus hampei' });
    expect(entity['x-chagra-mip']).toBeUndefined();
    expect(entity['@context']).toEqual(DEFAULT_CONTEXT);
  });

  it('el slug coincide con normalizePest/derivePestSlugs (join AgriCrop.hasAgriPest <-> AgriPest.id)', () => {
    const raw = 'Hemileia vastatrix (roya)';
    const entity = buildAgriPestEntity(raw);
    const [pestSlug] = derivePestSlugs([raw]);
    expect(entity.id).toBe(`urn:ngsi-ld:AgriPest:${pestSlug}`);
  });

  it('devuelve null para string vacío', () => {
    expect(buildAgriPestEntity('')).toBeNull();
  });
});

describe('buildAgriPestEntity — shape objeto enriquecido (MIP)', () => {
  const mipRecord = {
    nombre_cientifico: 'Phthorimaea operculella',
    nombre_comun: 'Polilla guatemalteca',
    umbral_accion: '5% tubérculos dañados en muestreo',
    control_biologico: ['asociar minthostachys_mollis a 1m perimetro', 'Trichogramma pretiosum sueltas 100mil/ha'],
    control_cultural: ['aporque profundo', 'no dejar tubérculos en campo post-cosecha'],
  };

  it('mapea nombre_comun -> name, nombre_cientifico -> alternateName, MIP -> x-chagra-mip', () => {
    const entity = buildAgriPestEntity(mipRecord);
    expect(entity.id).toBe('urn:ngsi-ld:AgriPest:phthorimaea_operculella');
    expect(entity.type).toBe('AgriPest');
    expect(entity.name).toEqual({ type: 'Property', value: 'Polilla guatemalteca' });
    expect(entity.alternateName).toEqual({ type: 'Property', value: 'Phthorimaea operculella' });
    expect(entity['x-chagra-mip']).toEqual({
      type: 'Property',
      value: {
        umbral_accion: '5% tubérculos dañados en muestreo',
        control_biologico: mipRecord.control_biologico,
        control_cultural: mipRecord.control_cultural,
      },
    });
  });

  it('NO agrega x-chagra-mip si el objeto no trae ningún campo MIP', () => {
    const entity = buildAgriPestEntity({ nombre_cientifico: 'Tecia solanivora', nombre_comun: 'Polilla de la papa' });
    expect(entity['x-chagra-mip']).toBeUndefined();
  });

  it('mapea descripcion -> description cuando está presente (no la inventa si falta)', () => {
    const withDesc = buildAgriPestEntity({ ...mipRecord, descripcion: 'Barrenador del tubérculo de papa.' });
    expect(withDesc.description).toEqual({ type: 'Property', value: 'Barrenador del tubérculo de papa.' });

    const withoutDesc = buildAgriPestEntity(mipRecord);
    expect(withoutDesc.description).toBeUndefined();
  });

  it('devuelve null si no se puede derivar slug ni name', () => {
    expect(buildAgriPestEntity({ umbral_accion: 'x' })).toBeNull();
    expect(buildAgriPestEntity(null)).toBeNull();
    expect(buildAgriPestEntity(undefined)).toBeNull();
  });
});

describe('derivePestRecords', () => {
  it('deduplica por slug entre species distintas', () => {
    const species = [
      { id: 'sp_a', plagas_criticas: ['Hemileia vastatrix (roya)'] },
      { id: 'sp_b', plagas_criticas: ['Hemileia vastatrix (roya)', 'Hypothenemus hampei (broca)'] },
    ];
    const records = derivePestRecords(species);
    expect(records).toHaveLength(2);
  });

  it('prefiere el objeto enriquecido (con MIP) sobre el string plano para el mismo slug', () => {
    const mipRecord = {
      nombre_cientifico: 'Phthorimaea operculella',
      nombre_comun: 'Polilla guatemalteca',
      umbral_accion: '5% tubérculos dañados',
    };
    const species = [
      { id: 'sp_a', plagas_criticas: ['Phthorimaea operculella'] },
      { id: 'sp_b', plagas_criticas: [mipRecord] },
    ];
    const records = derivePestRecords(species);
    expect(records).toHaveLength(1);
    expect(records[0]).toBe(mipRecord);
  });

  it('devuelve [] si no hay species o plagas_criticas', () => {
    expect(derivePestRecords([])).toEqual([]);
    expect(derivePestRecords([{ id: 'sp_sin_plagas' }])).toEqual([]);
    expect(derivePestRecords(undefined)).toEqual([]);
  });
});

describe('buildAgriPestEntities', () => {
  const fixture = {
    species: [
      { id: 'sp_a', plagas_criticas: ['Hemileia vastatrix (roya)'] },
      { id: 'sp_b', plagas_criticas: ['Hemileia vastatrix (roya)', 'Hypothenemus hampei (broca)'] },
      { id: 'sp_c', plagas_criticas: [] },
      { id: 'sp_d' },
    ],
  };

  it('emite una entidad AgriPest por plaga única del catálogo', () => {
    const { entities, report } = buildAgriPestEntities(fixture);
    expect(entities).toHaveLength(2);
    expect(report.total).toBe(2);
    expect(report.emitted).toBe(2);
    expect(report.omitted).toEqual([]);
  });

  it('es determinista: misma entrada produce misma salida (idempotente)', () => {
    const first = buildAgriPestEntities(fixture);
    const second = buildAgriPestEntities(fixture);
    expect(JSON.stringify(first.entities)).toBe(JSON.stringify(second.entities));
  });
});

describe('validateAgriPestEntity', () => {
  it('valida OK una entidad AgriPest bien formada (con x-chagra-mip)', () => {
    const entity = buildAgriPestEntity({
      nombre_cientifico: 'Phthorimaea operculella',
      nombre_comun: 'Polilla guatemalteca',
      umbral_accion: '5% tubérculos dañados en muestreo',
    });
    const { valid, errors } = validateAgriPestEntity(entity);
    expect(valid).toBe(true);
    expect(errors).toEqual([]);
  });

  it('valida OK una entidad AgriPest sin x-chagra-mip (shape string)', () => {
    const entity = buildAgriPestEntity('Hemileia vastatrix (roya)');
    const { valid, errors } = validateAgriPestEntity(entity);
    expect(valid).toBe(true);
    expect(errors).toEqual([]);
  });

  it('rechaza id sin prefijo urn:ngsi-ld:AgriPest:', () => {
    const { valid, errors } = validateAgriPestEntity({
      id: 'not-a-urn',
      type: 'AgriPest',
      name: { type: 'Property', value: 'roya' },
      '@context': DEFAULT_CONTEXT,
    });
    expect(valid).toBe(false);
    expect(errors.some((e) => e.includes('id inválido'))).toBe(true);
  });

  it('rechaza type distinto de AgriPest', () => {
    const { valid, errors } = validateAgriPestEntity({
      id: 'urn:ngsi-ld:AgriPest:roya',
      type: 'AgriCrop',
      name: { type: 'Property', value: 'roya' },
      '@context': DEFAULT_CONTEXT,
    });
    expect(valid).toBe(false);
    expect(errors.some((e) => e.includes('type inválido'))).toBe(true);
  });

  it('rechaza x-chagra-mip mal formado (sin ningún campo MIP reconocible)', () => {
    const { valid, errors } = validateAgriPestEntity({
      id: 'urn:ngsi-ld:AgriPest:roya',
      type: 'AgriPest',
      name: { type: 'Property', value: 'roya' },
      'x-chagra-mip': { type: 'Property', value: {} },
      '@context': DEFAULT_CONTEXT,
    });
    expect(valid).toBe(false);
    expect(errors.some((e) => e.includes('x-chagra-mip'))).toBe(true);
  });

  it('rechaza x-chagra-mip que no sea {type:Property, value:object}', () => {
    const { valid, errors } = validateAgriPestEntity({
      id: 'urn:ngsi-ld:AgriPest:roya',
      type: 'AgriPest',
      name: { type: 'Property', value: 'roya' },
      'x-chagra-mip': { type: 'Property', value: 'no es un objeto' },
      '@context': DEFAULT_CONTEXT,
    });
    expect(valid).toBe(false);
    expect(errors.some((e) => e.includes('x-chagra-mip'))).toBe(true);
  });

  it('rechaza @context faltante', () => {
    const { valid, errors } = validateAgriPestEntity({
      id: 'urn:ngsi-ld:AgriPest:roya',
      type: 'AgriPest',
      name: { type: 'Property', value: 'roya' },
    });
    expect(valid).toBe(false);
    expect(errors.some((e) => e.includes('@context'))).toBe(true);
  });
});

describe('validateAgriPestEntities (agregado)', () => {
  it('reporta valid=true cuando todas las entidades son válidas', () => {
    const { entities } = buildAgriPestEntities({
      species: [{ id: 'sp_a', plagas_criticas: ['Hemileia vastatrix (roya)', 'Hypothenemus hampei (broca)'] }],
    });
    const result = validateAgriPestEntities(entities);
    expect(result.valid).toBe(true);
    expect(result.invalidCount).toBe(0);
  });

  it('reporta detalle por entidad inválida', () => {
    const result = validateAgriPestEntities([
      { id: 'no-urn', type: 'AgriPest', name: { type: 'Property', value: 'x' }, '@context': DEFAULT_CONTEXT },
    ]);
    expect(result.valid).toBe(false);
    expect(result.invalidCount).toBe(1);
    expect(result.details[0].errors.length).toBeGreaterThan(0);
  });
});

// =============================================================================
// Integración: muestra real del catálogo OSS v3.2 (ADR-051 fase 1)
// =============================================================================

describe('buildAgriPestEntities — muestra real del catálogo OSS v3.2', () => {
  const catalogPath = resolve('catalog/chagra-catalog-oss-subset-v3.2.json');
  let seed = null;
  try {
    seed = JSON.parse(readFileSync(catalogPath, 'utf-8'));
  } catch {
    seed = null;
  }

  it.skipIf(!seed)('emite una entidad AgriPest válida por cada plaga única de plagas_criticas[] del catálogo real', () => {
    const { entities, report } = buildAgriPestEntities(seed);
    // El catálogo público de hoy solo trae plagas_criticas[] como strings
    // libres (sin MIP curado — ver nota de proveniencia en export-ngsi-ld.mjs);
    // aun así debe emitir N entidades AgriPest reales, no cero ni inventadas.
    expect(report.total).toBeGreaterThan(0);
    expect(entities.length).toBe(report.total);

    const validation = validateAgriPestEntities(entities);
    expect(validation.details).toEqual([]);
    expect(validation.valid).toBe(true);
  });

  it.skipIf(!seed)('cada entidad emitida tiene id URN AgriPest único', () => {
    const { entities } = buildAgriPestEntities(seed);
    const ids = entities.map((e) => e.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const id of ids) {
      expect(id).toMatch(/^urn:ngsi-ld:AgriPest:.+$/);
    }
  });

  it.skipIf(!seed)('todo hasAgriPest emitido por AgriCrop resuelve a un id AgriPest emitido (join AGE-safe)', () => {
    const { entities: crops } = buildAgriCropEntities(seed);
    const { entities: pests } = buildAgriPestEntities(seed);
    const pestIds = new Set(pests.map((p) => p.id));

    let checked = 0;
    for (const crop of crops) {
      for (const rel of crop.hasAgriPest || []) {
        expect(pestIds.has(rel.object)).toBe(true);
        checked++;
      }
    }
    expect(checked).toBeGreaterThan(0);
  });

  it.skipIf(!seed)('no inventa agroVocConcept (gap documentado en ADR-051 — viene del grafo AGE, fuera de alcance)', () => {
    const { entities } = buildAgriPestEntities(seed);
    for (const entity of entities) {
      expect(entity.agroVocConcept).toBeUndefined();
    }
  });
});

// =============================================================================
// AgriProductType (ADR-051 Anexo A, fila bonus AgriProductType, desde
// biopreparados[] del catálogo público)
// =============================================================================

describe('agriProductTypeUrn', () => {
  it('construye el URN AgriProductType con prefijo canónico', () => {
    expect(agriProductTypeUrn('bocashi')).toBe('urn:ngsi-ld:AgriProductType:bocashi');
  });

  it('trimea espacios en el id de entrada', () => {
    expect(agriProductTypeUrn('  biol  ')).toBe('urn:ngsi-ld:AgriProductType:biol');
  });
});

describe('buildBiopreparadoClasificacionAttribute', () => {
  it('construye {type:Property, value:{tipo, proposito}} cuando ambos están presentes', () => {
    const attr = buildBiopreparadoClasificacionAttribute({
      tipo: 'fermentado',
      proposito: ['fertilizacion', 'estimulante_microbiano'],
    });
    expect(attr).toEqual({
      type: 'Property',
      value: { tipo: 'fermentado', proposito: ['fertilizacion', 'estimulante_microbiano'] },
    });
  });

  it('omite tipo o proposito individualmente si faltan (no inventa)', () => {
    expect(buildBiopreparadoClasificacionAttribute({ tipo: 'mineral' })).toEqual({
      type: 'Property',
      value: { tipo: 'mineral' },
    });
    expect(buildBiopreparadoClasificacionAttribute({ proposito: ['enmienda_ph'] })).toEqual({
      type: 'Property',
      value: { proposito: ['enmienda_ph'] },
    });
  });

  it('devuelve null si no hay ningún campo reconocible', () => {
    expect(buildBiopreparadoClasificacionAttribute({})).toBeNull();
    expect(buildBiopreparadoClasificacionAttribute(null)).toBeNull();
    expect(buildBiopreparadoClasificacionAttribute({ tipo: '', proposito: [] })).toBeNull();
  });
});

describe('buildAgriProductTypeEntity — fixtures sintéticos', () => {
  it('mapea id -> urn, nombre -> name, proceso_resumen -> description, tipo/proposito -> x-chagra-clasificacion', () => {
    const biopreparado = {
      id: 'bocashi',
      nombre: 'Bocashi',
      tipo: 'fermentado',
      proposito: ['fertilizacion', 'estimulante_microbiano'],
      proceso_resumen: 'Fermentación aeróbica 15-21 días con volteo diario.',
    };
    const entity = buildAgriProductTypeEntity(biopreparado);

    expect(entity.id).toBe('urn:ngsi-ld:AgriProductType:bocashi');
    expect(entity.type).toBe('AgriProductType');
    expect(entity.name).toEqual({ type: 'Property', value: 'Bocashi' });
    expect(entity.description).toEqual({
      type: 'Property',
      value: 'Fermentación aeróbica 15-21 días con volteo diario.',
    });
    expect(entity['x-chagra-clasificacion']).toEqual({
      type: 'Property',
      value: { tipo: 'fermentado', proposito: ['fertilizacion', 'estimulante_microbiano'] },
    });
    expect(entity['@context']).toEqual(DEFAULT_CONTEXT);
  });

  it('NO agrega description si proceso_resumen falta (no inventa datos)', () => {
    const entity = buildAgriProductTypeEntity({ id: 'x', nombre: 'X', tipo: 'caldo', proposito: ['fitosanitario_preventivo'] });
    expect(entity.description).toBeUndefined();
  });

  it('NO agrega x-chagra-clasificacion si faltan tipo y proposito', () => {
    const entity = buildAgriProductTypeEntity({ id: 'x', nombre: 'X' });
    expect(entity['x-chagra-clasificacion']).toBeUndefined();
  });

  it('NO inventa jerarquía padre-hijo, root, category ni agroVocConcept (gaps documentados en ADR-051)', () => {
    const entity = buildAgriProductTypeEntity({
      id: 'bocashi',
      nombre: 'Bocashi',
      tipo: 'fermentado',
      proposito: ['fertilizacion'],
    });
    expect(entity.hasAgriProductTypeParent).toBeUndefined();
    expect(entity.hasAgriProductTypeChildren).toBeUndefined();
    expect(entity.root).toBeUndefined();
    expect(entity.category).toBeUndefined();
    expect(entity.agroVocConcept).toBeUndefined();
  });

  it('trunca description larga (reusa truncText, maxLen 500)', () => {
    const largo = 'x'.repeat(900);
    const entity = buildAgriProductTypeEntity({ id: 'bp1', nombre: 'BP Uno', proceso_resumen: largo });
    expect(entity.description.value.length).toBe(500);
    expect(entity.description.value.endsWith('...')).toBe(true);
  });

  it('devuelve null si falta id o nombre (no rellena con datos falsos)', () => {
    expect(buildAgriProductTypeEntity({ nombre: 'Sin id' })).toBeNull();
    expect(buildAgriProductTypeEntity({ id: 'sin_nombre' })).toBeNull();
    expect(buildAgriProductTypeEntity(null)).toBeNull();
  });
});

describe('buildAgriProductTypeEntities', () => {
  const fixture = {
    biopreparados: [
      { id: 'bp_a', nombre: 'BP A', tipo: 'fermentado', proposito: ['fertilizacion'] },
      { id: 'bp_b', nombre: 'BP B', tipo: 'caldo', proposito: ['fitosanitario_preventivo'] },
      { nombre: 'Sin id, se omite' },
    ],
  };

  it('emite una entidad por biopreparado válido y reporta las omitidas', () => {
    const { entities, report } = buildAgriProductTypeEntities(fixture);
    expect(entities).toHaveLength(2);
    expect(report.total).toBe(3);
    expect(report.emitted).toBe(2);
    expect(report.omitted).toHaveLength(1);
  });

  it('respeta --limit (slicing de biopreparados[])', () => {
    const { entities, report } = buildAgriProductTypeEntities(fixture, { limit: 1 });
    expect(entities).toHaveLength(1);
    expect(report.total).toBe(1);
  });

  it('es determinista: misma entrada produce misma salida (idempotente)', () => {
    const first = buildAgriProductTypeEntities(fixture);
    const second = buildAgriProductTypeEntities(fixture);
    expect(JSON.stringify(first.entities)).toBe(JSON.stringify(second.entities));
  });

  it('devuelve [] si el seed no trae biopreparados[]', () => {
    const { entities, report } = buildAgriProductTypeEntities({});
    expect(entities).toEqual([]);
    expect(report.total).toBe(0);
  });
});

describe('validateAgriProductTypeEntity', () => {
  it('valida OK una entidad bien formada', () => {
    const entity = buildAgriProductTypeEntity({
      id: 'bocashi',
      nombre: 'Bocashi',
      tipo: 'fermentado',
      proposito: ['fertilizacion', 'estimulante_microbiano'],
      proceso_resumen: 'Fermentación aeróbica con volteo diario.',
    });
    const { valid, errors } = validateAgriProductTypeEntity(entity);
    expect(valid).toBe(true);
    expect(errors).toEqual([]);
  });

  it('valida OK una entidad sin x-chagra-clasificacion ni description (mínima)', () => {
    const entity = buildAgriProductTypeEntity({ id: 'x', nombre: 'X' });
    const { valid, errors } = validateAgriProductTypeEntity(entity);
    expect(valid).toBe(true);
    expect(errors).toEqual([]);
  });

  it('rechaza id sin prefijo urn:ngsi-ld:AgriProductType:', () => {
    const { valid, errors } = validateAgriProductTypeEntity({
      id: 'not-a-urn',
      type: 'AgriProductType',
      name: { type: 'Property', value: 'x' },
      '@context': DEFAULT_CONTEXT,
    });
    expect(valid).toBe(false);
    expect(errors.some((e) => e.includes('id inválido'))).toBe(true);
  });

  it('rechaza type distinto de AgriProductType', () => {
    const { valid, errors } = validateAgriProductTypeEntity({
      id: 'urn:ngsi-ld:AgriProductType:x',
      type: 'AgriCrop',
      name: { type: 'Property', value: 'x' },
      '@context': DEFAULT_CONTEXT,
    });
    expect(valid).toBe(false);
    expect(errors.some((e) => e.includes('type inválido'))).toBe(true);
  });

  it('rechaza name ausente o mal formado', () => {
    expect(validateAgriProductTypeEntity({
      id: 'urn:ngsi-ld:AgriProductType:x',
      type: 'AgriProductType',
      '@context': DEFAULT_CONTEXT,
    }).valid).toBe(false);

    expect(validateAgriProductTypeEntity({
      id: 'urn:ngsi-ld:AgriProductType:x',
      type: 'AgriProductType',
      name: { type: 'Property', value: '' },
      '@context': DEFAULT_CONTEXT,
    }).valid).toBe(false);
  });

  it('rechaza x-chagra-clasificacion mal formado (sin tipo ni proposito reconocible)', () => {
    const { valid, errors } = validateAgriProductTypeEntity({
      id: 'urn:ngsi-ld:AgriProductType:x',
      type: 'AgriProductType',
      name: { type: 'Property', value: 'x' },
      'x-chagra-clasificacion': { type: 'Property', value: {} },
      '@context': DEFAULT_CONTEXT,
    });
    expect(valid).toBe(false);
    expect(errors.some((e) => e.includes('x-chagra-clasificacion'))).toBe(true);
  });

  it('rechaza x-chagra-clasificacion que no sea {type:Property, value:object}', () => {
    const { valid, errors } = validateAgriProductTypeEntity({
      id: 'urn:ngsi-ld:AgriProductType:x',
      type: 'AgriProductType',
      name: { type: 'Property', value: 'x' },
      'x-chagra-clasificacion': { type: 'Property', value: 'no es un objeto' },
      '@context': DEFAULT_CONTEXT,
    });
    expect(valid).toBe(false);
    expect(errors.some((e) => e.includes('x-chagra-clasificacion'))).toBe(true);
  });

  it('rechaza @context faltante', () => {
    const { valid, errors } = validateAgriProductTypeEntity({
      id: 'urn:ngsi-ld:AgriProductType:x',
      type: 'AgriProductType',
      name: { type: 'Property', value: 'x' },
    });
    expect(valid).toBe(false);
    expect(errors.some((e) => e.includes('@context'))).toBe(true);
  });
});

describe('validateAgriProductTypeEntities (agregado)', () => {
  it('reporta valid=true cuando todas las entidades son válidas', () => {
    const { entities } = buildAgriProductTypeEntities({
      biopreparados: [
        { id: 'bp_a', nombre: 'BP A', tipo: 'fermentado', proposito: ['fertilizacion'] },
        { id: 'bp_b', nombre: 'BP B' },
      ],
    });
    const result = validateAgriProductTypeEntities(entities);
    expect(result.valid).toBe(true);
    expect(result.invalidCount).toBe(0);
  });

  it('reporta detalle por entidad inválida', () => {
    const result = validateAgriProductTypeEntities([
      { id: 'no-urn', type: 'AgriProductType', name: { type: 'Property', value: 'x' }, '@context': DEFAULT_CONTEXT },
    ]);
    expect(result.valid).toBe(false);
    expect(result.invalidCount).toBe(1);
    expect(result.details[0].errors.length).toBeGreaterThan(0);
  });
});

// =============================================================================
// Integración: muestra real del catálogo OSS v3.2 (ADR-051 fase 1) — los ~36
// biopreparados públicos
// =============================================================================

describe('buildAgriProductTypeEntities — muestra real del catálogo OSS v3.2', () => {
  const catalogPath = resolve('catalog/chagra-catalog-oss-subset-v3.2.json');
  let seed = null;
  try {
    seed = JSON.parse(readFileSync(catalogPath, 'utf-8'));
  } catch {
    // En CI sin acceso al catálogo (poco probable aquí), skip suave.
    seed = null;
  }

  it.skipIf(!seed)('emite una entidad AgriProductType válida por cada biopreparado del catálogo (~36)', () => {
    const { entities, report } = buildAgriProductTypeEntities(seed);
    expect(report.total).toBeGreaterThanOrEqual(30);
    expect(entities.length).toBe(report.total);
    expect(report.omitted).toEqual([]);

    const validation = validateAgriProductTypeEntities(entities);
    expect(validation.details).toEqual([]);
    expect(validation.valid).toBe(true);
  });

  it.skipIf(!seed)('cada entidad emitida tiene id URN AgriProductType único', () => {
    const { entities } = buildAgriProductTypeEntities(seed);
    const ids = entities.map((e) => e.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const id of ids) {
      expect(id).toMatch(/^urn:ngsi-ld:AgriProductType:.+$/);
    }
  });

  it.skipIf(!seed)('biopreparados reales con tipo/proposito producen x-chagra-clasificacion válido (ej. bocashi)', () => {
    const bocashi = seed.biopreparados.find((b) => b.id === 'bocashi');
    expect(bocashi).toBeTruthy();

    const entity = buildAgriProductTypeEntity(bocashi);
    const { valid, errors } = validateAgriProductTypeEntity(entity);
    expect(valid).toBe(true);
    expect(errors).toEqual([]);
    expect(entity['x-chagra-clasificacion'].value.tipo).toBe(bocashi.tipo);
    expect(entity['x-chagra-clasificacion'].value.proposito).toEqual(bocashi.proposito);
  });

  it.skipIf(!seed)('no inventa jerarquía padre-hijo, root, category ni agroVocConcept (gaps documentados en ADR-051)', () => {
    const { entities } = buildAgriProductTypeEntities(seed);
    for (const entity of entities) {
      expect(entity.hasAgriProductTypeParent).toBeUndefined();
      expect(entity.hasAgriProductTypeChildren).toBeUndefined();
      expect(entity.root).toBeUndefined();
      expect(entity.category).toBeUndefined();
      expect(entity.agroVocConcept).toBeUndefined();
    }
  });
});

// =============================================================================
// AgriParcelRecord (ADR-051 fase 2, Anexo A fila AgriParcelRecord)
// =============================================================================

describe('AgriParcelRecord helpers', () => {
  it('construye el URN AgriParcelRecord con prefijo canonico', () => {
    expect(agriParcelRecordUrn('obs-123')).toBe('urn:ngsi-ld:AgriParcelRecord:obs-123');
  });
});

describe('buildAgriParcelRecordEntity', () => {
  const observation = {
    id: 'obs-fdr-1',
    type: 'log--observation',
    attributes: {
      name: 'FDR lote norte',
      timestamp: '2026-05-04T12:30:00Z',
      notes: { value: 'Registro FDR diario de suelo.', format: 'plain_text' },
      geometry: 'POINT(-74.1 4.6)',
      soilTemperature: 27.5,
      soilMoistureVwc: '0.42',
      soilMoistureEc: 1.8,
      solarRadiation: 15,
      relativeHumidity: 0.84,
      leafWetness: 0.1,
      atmosphericPressure: 1013.25,
      depth: 20,
    },
    relationships: {
      location: { data: [{ type: 'asset--land', id: 'urn:ngsi-ld:AgriParcel:lote-norte' }] },
      device: { data: [{ type: 'device', id: 'urn:ngsi-ld:Device:fdr-01' }] },
      sensor: { data: [{ type: 'device', id: 'urn:ngsi-ld:Device:fdr-02' }] },
    },
  };

  it('mapea log--observation a AgriParcelRecord con geografia y medidas', () => {
    const entity = buildAgriParcelRecordEntity(observation);

    expect(entity.id).toBe('urn:ngsi-ld:AgriParcelRecord:obs-fdr-1');
    expect(entity.type).toBe('AgriParcelRecord');
    expect(entity.name).toEqual({ type: 'Property', value: 'FDR lote norte' });
    expect(entity.description).toEqual({ type: 'Property', value: 'Registro FDR diario de suelo.' });
    expect(entity.hasAgriParcel).toEqual({ type: 'Relationship', object: 'urn:ngsi-ld:AgriParcel:lote-norte' });
    expect(entity.location).toEqual({
      type: 'GeoProperty',
      value: { type: 'Point', coordinates: [-74.1, 4.6] },
    });
    expect(entity.soilTemperature.value).toBe(27.5);
    expect(entity.soilTemperature.observedAt).toBe('2026-05-04T12:30:00.000Z');
    expect(entity.soilMoistureVwc.value).toBe(0.42);
    expect(entity.hasDevice).toEqual({
      type: 'Relationship',
      object: ['urn:ngsi-ld:Device:fdr-01', 'urn:ngsi-ld:Device:fdr-02'],
    });
    expect(entity['@context']).toEqual(DEFAULT_CONTEXT);

    const { valid, errors } = validateAgriParcelRecordEntity(entity);
    expect(valid).toBe(true);
    expect(errors).toEqual([]);
  });

  it('retorna null si falta location GeoJSON o hasAgriParcel', () => {
    expect(buildAgriParcelRecordEntity({
      id: 'obs-sin-geo',
      type: 'log--observation',
      attributes: { name: 'Sin geo' },
      relationships: { location: { data: [{ type: 'asset--land', id: 'urn:ngsi-ld:AgriParcel:lote-x' }] } },
    })).toBeNull();

    expect(buildAgriParcelRecordEntity({
      id: 'obs-sin-parcela',
      type: 'log--observation',
      attributes: { name: 'Sin parcela', geometry: 'POINT(-74.0 4.6)' },
    })).toBeNull();
  });
});

describe('buildAgriParcelRecordEntities', () => {
  it('emite una entidad por observacion valida y reporta la omitida', () => {
    const { entities, report } = buildAgriParcelRecordEntities({
      logs: [
        {
          id: 'obs-ok',
          type: 'log--observation',
          attributes: {
            name: 'Obs valida',
            timestamp: '2026-05-04T12:30:00Z',
            geometry: 'POINT(-74.1 4.6)',
          },
          relationships: {
            location: { data: [{ type: 'asset--land', id: 'urn:ngsi-ld:AgriParcel:lote-norte' }] },
          },
        },
        {
          id: 'obs-missing-geo',
          type: 'log--observation',
          attributes: { name: 'Obs incompleta' },
          relationships: {
            location: { data: [{ type: 'asset--land', id: 'urn:ngsi-ld:AgriParcel:lote-norte' }] },
          },
        },
      ],
    });

    expect(report.total).toBe(2);
    expect(report.emitted).toBe(1);
    expect(report.omitted).toHaveLength(1);
    expect(entities).toHaveLength(1);
    expect(validateAgriParcelRecordEntities(entities).valid).toBe(true);
  });
});
