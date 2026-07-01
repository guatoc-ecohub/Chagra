#!/usr/bin/env node
/**
 * scripts/export-ngsi-ld.mjs
 *
 * ADR-051 (FIWARE Smart Data Models como capa de interoperabilidad NGSI-LD),
 * Fase 1: lee el catálogo público (`catalog/chagra-catalog-oss-subset-v3.2.json`)
 * y emite entidades **NGSI-LD `AgriCrop`** (Smart Data Models — Smart AgriFood)
 * para cada `species` cultivable del catálogo.
 *
 * Análogo de `scripts/catalog-to-age.mjs`: función pura + CLI delgado. NO
 * toca red ni base de datos — es un export offline, no un cliente de un
 * broker Orion-LD (ver ADR-051 §Decisión punto 2: no se despliega runtime
 * FIWARE en Guatoc).
 *
 * Mapeo (Anexo A de ADR-051, fila AgriCrop):
 *   - `species.id`                  -> id (`urn:ngsi-ld:AgriCrop:<id>`)
 *   - `species.nombre_comun`        -> name
 *   - `species.nombre_cientifico`   -> alternateName
 *   - `species.valor_pedagogico`    -> description (truncado, ver truncText)
 *   - `species.plagas_criticas[]`   -> hasAgriPest (Relationship[] a AgriPest)
 *
 * Campos NGSI-LD sin equivalente en Chagra hoy (agroVocConcept,
 * harvestingInterval, plantingFrom, hasAgriSoil) se OMITEN — son opcionales
 * en el schema oficial `dataModel.Agrifood/AgriCrop`. NO se rellenan con
 * datos inventados (regla explícita de ADR-051 y del anti-alucinación
 * general del catálogo).
 *
 * Slugs de plaga: reutiliza `normalizePest`/`classifyBiopreparadoTarget` de
 * `catalog-to-age.mjs` para que el `urn:ngsi-ld:AgriPest:<slug>` quede
 * alineado con el nodo `:Pest` del grafo `chagra_kg` (mismo slug en ambos
 * lados == join gratis entre el export NGSI-LD y el grafo AGE).
 *
 * Idempotencia: función pura sobre el JSON del catálogo — misma entrada,
 * misma salida byte a byte. Sin red, sin DB, sin estado mutable global.
 *
 * Uso:
 *   node scripts/export-ngsi-ld.mjs \
 *     --input catalog/chagra-catalog-oss-subset-v3.2.json \
 *     --out /tmp/agricrop-ngsi-ld.json \
 *     [--json]        # imprime el array de entidades NGSI-LD crudo por stdout
 *     [--limit 10]    # subset de species (default: todas)
 *     [--pretty]      # indenta el JSON (default: 2 espacios; con --json activa igual)
 *
 * Sin `--json` ni `--out`, imprime un reporte humano (conteo, validación)
 * por stdout — pensado para revisión manual del operador antes de un demo.
 */

import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { normalizePest, classifyBiopreparadoTarget, truncText } from './catalog-to-age.mjs';

// =============================================================================
// Contexto NGSI-LD
// =============================================================================

/** Contexto núcleo NGSI-LD (ETSI GS CIM 009). */
export const NGSI_LD_CORE_CONTEXT = 'https://uri.etsi.org/ngsi-ld/v1/ngsi-ld-core-context.jsonld';

/** Contexto oficial Smart Data Models — Smart AgriFood (dataModel.Agrifood). */
export const AGRIFOOD_CONTEXT = 'https://raw.githubusercontent.com/smart-data-models/dataModel.Agrifood/master/context.jsonld';

/** `@context` por defecto para entidades AgriCrop emitidas por este export. */
export const DEFAULT_CONTEXT = [AGRIFOOD_CONTEXT, NGSI_LD_CORE_CONTEXT];

// =============================================================================
// Utilidades públicas (exportadas para tests)
// =============================================================================

/**
 * Construye el URN NGSI-LD para una entidad AgriCrop a partir del id
 * canónico de species en el catálogo Chagra.
 *
 * @param {string} speciesId
 * @returns {string}
 */
export function agriCropUrn(speciesId) {
  return `urn:ngsi-ld:AgriCrop:${String(speciesId).trim()}`;
}

/**
 * Construye el URN NGSI-LD para una entidad AgriPest a partir de un slug de
 * plaga ya normalizado (ver `normalizePest` en catalog-to-age.mjs).
 *
 * @param {string} pestSlug
 * @returns {string}
 */
export function agriPestUrn(pestSlug) {
  return `urn:ngsi-ld:AgriPest:${String(pestSlug).trim()}`;
}

/**
 * Envuelve un valor escalar en un atributo NGSI-LD `Property`.
 * Devuelve `null` si el valor es vacío (null/undefined/string vacío) para
 * que el caller lo pueda omitir del objeto entidad (NGSI-LD no exige
 * atributos opcionales presentes con valor null).
 *
 * @param {string|number|boolean|null|undefined} value
 * @returns {{type:'Property', value: unknown}|null}
 */
export function ngsiProperty(value) {
  if (value === null || value === undefined || value === '') return null;
  return { type: 'Property', value };
}

/**
 * Construye un atributo NGSI-LD `Relationship` apuntando a `objectUrn`.
 *
 * @param {string} objectUrn
 * @returns {{type:'Relationship', object: string}}
 */
export function ngsiRelationship(objectUrn) {
  return { type: 'Relationship', object: objectUrn };
}

/**
 * Deriva la lista de slugs de plaga (normalizados + deduplicados, en orden
 * de primera aparición) desde `species.plagas_criticas[]`, reusando el
 * clasificador de catalog-to-age.mjs solo para mantener consistencia de
 * normalización (no filtra por tipo — cualquier entrada de
 * `plagas_criticas` se considera una plaga real del catálogo agrónomo,
 * curada por el proceso de validación del catálogo mismo).
 *
 * @param {string[]|undefined} plagasCriticas
 * @returns {string[]}
 */
export function derivePestSlugs(plagasCriticas) {
  const slugs = [];
  const seen = new Set();
  for (const raw of Array.isArray(plagasCriticas) ? plagasCriticas : []) {
    // classifyBiopreparadoTarget solo se usa acá para reafirmar que el
    // normalizador de slugs es el mismo del grafo AGE; el `kind` resultante
    // no se usa para filtrar (plagas_criticas ya es una lista curada).
    void classifyBiopreparadoTarget(raw);
    const slug = normalizePest(raw);
    if (slug && !seen.has(slug)) {
      seen.add(slug);
      slugs.push(slug);
    }
  }
  return slugs;
}

/**
 * Construye una entidad NGSI-LD `AgriCrop` a partir de una `species` del
 * catálogo Chagra. Devuelve `null` si la species no tiene los campos
 * mínimos requeridos (`id` + `nombre_comun`) — se reporta como "omitida"
 * por el caller, nunca se rellena con datos inventados.
 *
 * @param {object} species
 * @param {object} [opts]
 * @param {string[]} [opts.context] - `@context` a usar (default DEFAULT_CONTEXT)
 * @returns {object|null}
 */
export function buildAgriCropEntity(species, opts = {}) {
  const context = opts.context || DEFAULT_CONTEXT;
  if (!species || !species.id || !species.nombre_comun) return null;

  const entity = {
    id: agriCropUrn(species.id),
    type: 'AgriCrop',
  };

  const name = ngsiProperty(species.nombre_comun);
  if (name) entity.name = name;

  const alternateName = ngsiProperty(species.nombre_cientifico);
  if (alternateName) entity.alternateName = alternateName;

  const description = ngsiProperty(truncText(species.valor_pedagogico, 500));
  if (description) entity.description = description;

  const pestSlugs = derivePestSlugs(species.plagas_criticas);
  if (pestSlugs.length > 0) {
    entity.hasAgriPest = pestSlugs.map((slug) => ngsiRelationship(agriPestUrn(slug)));
  }

  // NGSI-LD: @context va al final del objeto entidad (convención de la
  // representación normalizada / Orion-LD `Accept: application/ld+json`).
  entity['@context'] = context;

  return entity;
}

/**
 * Construye entidades AgriCrop para un array de species, junto a un reporte
 * de cuántas se omitieron (y por qué id, si tiene) por faltar campos
 * mínimos.
 *
 * @param {object} seed - catálogo parseado ({ species: [...] })
 * @param {object} [opts]
 * @param {number} [opts.limit] - subset de species (default: todas)
 * @param {string[]} [opts.context]
 * @returns {{entities: object[], report: {total: number, emitted: number, omitted: Array<{id: string|null, reason: string}>}}}
 */
export function buildAgriCropEntities(seed, opts = {}) {
  const speciesAll = Array.isArray(seed?.species) ? seed.species : [];
  const species = typeof opts.limit === 'number' ? speciesAll.slice(0, opts.limit) : speciesAll;

  const entities = [];
  const omitted = [];
  for (const sp of species) {
    const entity = buildAgriCropEntity(sp, { context: opts.context });
    if (entity) {
      entities.push(entity);
    } else {
      omitted.push({ id: sp?.id ?? null, reason: 'missing id o nombre_comun' });
    }
  }

  return {
    entities,
    report: {
      total: species.length,
      emitted: entities.length,
      omitted,
    },
  };
}

// =============================================================================
// Validación estructural (sin dependencia externa — ver nota abajo)
// =============================================================================

/**
 * NOTA: `ajv` no está en las dependencias del repo (verificado en
 * package.json). Por ADR-051 + instrucción de la tarea, no se agrega una
 * dependencia nueva solo para esto — se valida la estructura mínima NGSI-LD
 * exigida (id URN `urn:ngsi-ld:AgriCrop:*`, type, name, y forma de
 * hasAgriPest/@context si están presentes). Si en el futuro `ajv` entra al
 * repo (ver `fiware-ngsild-ajv-ci` en queue), esta función puede
 * reemplazarse por validación JSON Schema completa contra los schemas
 * oficiales `smart-data-models` sin cambiar la firma pública.
 *
 * @param {object} entity
 * @returns {{valid: boolean, errors: string[]}}
 */
export function validateAgriCropEntity(entity) {
  const errors = [];

  if (!entity || typeof entity !== 'object') {
    return { valid: false, errors: ['entity no es un objeto'] };
  }

  if (typeof entity.id !== 'string' || !/^urn:ngsi-ld:AgriCrop:.+$/.test(entity.id)) {
    errors.push(`id inválido (esperado urn:ngsi-ld:AgriCrop:*): ${JSON.stringify(entity.id)}`);
  }

  if (entity.type !== 'AgriCrop') {
    errors.push(`type inválido (esperado 'AgriCrop'): ${JSON.stringify(entity.type)}`);
  }

  if (
    !entity.name
    || entity.name.type !== 'Property'
    || typeof entity.name.value !== 'string'
    || entity.name.value.length === 0
  ) {
    errors.push('name faltante o mal formado (esperado {type:"Property", value: string no vacío})');
  }

  if (entity.alternateName !== undefined) {
    if (entity.alternateName.type !== 'Property' || typeof entity.alternateName.value !== 'string') {
      errors.push('alternateName presente pero mal formado');
    }
  }

  if (entity.description !== undefined) {
    if (entity.description.type !== 'Property' || typeof entity.description.value !== 'string') {
      errors.push('description presente pero mal formado');
    }
  }

  if (entity.hasAgriPest !== undefined) {
    if (!Array.isArray(entity.hasAgriPest) || entity.hasAgriPest.length === 0) {
      errors.push('hasAgriPest presente pero no es un array no-vacío');
    } else {
      entity.hasAgriPest.forEach((rel, idx) => {
        if (
          !rel
          || rel.type !== 'Relationship'
          || typeof rel.object !== 'string'
          || !/^urn:ngsi-ld:AgriPest:.+$/.test(rel.object)
        ) {
          errors.push(`hasAgriPest[${idx}] mal formado: ${JSON.stringify(rel)}`);
        }
      });
    }
  }

  if (!entity['@context'] || (Array.isArray(entity['@context']) && entity['@context'].length === 0)) {
    errors.push('@context faltante o vacío');
  }

  return { valid: errors.length === 0, errors };
}

/**
 * Valida un array de entidades AgriCrop. Devuelve un reporte agregado.
 *
 * @param {object[]} entities
 * @returns {{valid: boolean, invalidCount: number, details: Array<{id: string|null, errors: string[]}>}}
 */
export function validateAgriCropEntities(entities) {
  const details = [];
  for (const entity of entities) {
    const { valid, errors } = validateAgriCropEntity(entity);
    if (!valid) details.push({ id: entity?.id ?? null, errors });
  }
  return { valid: details.length === 0, invalidCount: details.length, details };
}

// =============================================================================
// CLI entry point
// =============================================================================

/**
 * @param {string[]} argv - process.argv.slice(2)
 * @returns {Promise<{outputPath: string|null, entityCount: number, valid: boolean}>}
 */
export async function main(argv = process.argv.slice(2)) {
  const opts = {
    input: 'catalog/chagra-catalog-oss-subset-v3.2.json',
    out: null,
    json: false,
    limit: null,
  };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--input') opts.input = argv[++i];
    else if (a === '--out') opts.out = argv[++i];
    else if (a === '--json') opts.json = true;
    else if (a === '--limit') opts.limit = Number(argv[++i]);
    else if (a === '--help' || a === '-h') {
      console.error(
        'Usage: node scripts/export-ngsi-ld.mjs [--input FILE] [--out FILE] [--json] [--limit N]\n\n'
        + '  --input FILE  Catálogo fuente (default: catalog/chagra-catalog-oss-subset-v3.2.json)\n'
        + '  --out FILE    Escribe el array de entidades NGSI-LD (JSON) a FILE.\n'
        + '  --json        Imprime el array de entidades NGSI-LD crudo por stdout\n'
        + '                (sin esto, imprime un reporte humano de conteo/validación).\n'
        + '  --limit N     Subset de species (default: todas).',
      );
      return { outputPath: null, entityCount: 0, valid: true };
    }
  }

  const seedPath = resolve(opts.input);
  const seed = JSON.parse(readFileSync(seedPath, 'utf-8'));

  const { entities, report } = buildAgriCropEntities(seed, { limit: opts.limit ?? undefined });
  const validation = validateAgriCropEntities(entities);

  const jsonOut = JSON.stringify(entities, null, 2) + '\n';

  if (opts.out) {
    writeFileSync(opts.out, jsonOut, 'utf-8');
    console.error(
      `Escrito ${entities.length} entidades AgriCrop a ${opts.out} `
      + `(omitidas: ${report.omitted.length}, válidas: ${validation.valid ? 'sí' : `NO (${validation.invalidCount})`})`,
    );
  } else if (opts.json) {
    process.stdout.write(jsonOut);
  } else {
    // Reporte humano por stdout — pensado para revisión manual del operador.
    console.log('--- export-ngsi-ld: reporte AgriCrop (ADR-051 fase 1) ---');
    console.log(`Fuente: ${opts.input}`);
    console.log(`Species leídas: ${report.total}`);
    console.log(`Entidades AgriCrop emitidas: ${report.emitted}`);
    console.log(`Omitidas (faltan campos mínimos): ${report.omitted.length}`);
    if (report.omitted.length > 0) {
      console.log('  ids omitidos:', report.omitted.map((o) => o.id).join(', '));
    }
    console.log(`Validación estructural NGSI-LD: ${validation.valid ? 'OK' : `FALLÓ (${validation.invalidCount} entidad(es))`}`);
    if (!validation.valid) {
      for (const d of validation.details.slice(0, 10)) {
        console.log(`  - ${d.id}: ${d.errors.join(' | ')}`);
      }
    }
  }

  if (!validation.valid) {
    process.exitCode = 1;
  }

  return { outputPath: opts.out, entityCount: entities.length, valid: validation.valid };
}

// ESM-friendly entry-point check.
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((err) => {
    console.error('export-ngsi-ld failed:', err);
    process.exit(1);
  });
}
