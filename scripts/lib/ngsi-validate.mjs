/**
 * scripts/lib/ngsi-validate.mjs
 *
 * ADR-051 (FIWARE Smart Data Models como capa de interoperabilidad NGSI-LD),
 * ítem de fase 1 "Validación conformidad NGSI-LD (ajv vs schemas oficiales)
 * en CI": valida las entidades que emite `scripts/export-ngsi-ld.mjs` contra
 * los JSON Schema **oficiales** de `smart-data-models/dataModel.Agrifood`,
 * vendorizados en `scripts/fiware-schemas/` (ver `$comment` de cada archivo
 * para la URL fuente y fecha de descarga).
 *
 * Nota importante sobre representación NGSI-LD vs. el schema oficial:
 * el `schema.json` que publica smart-data-models valida la representación
 * **simplificada** (`keyValues`) de la entidad — la misma que se ve en
 * `AgriCrop/examples/example.json` upstream, donde `name` es un string
 * plano, no `{type:'Property', value:'...'}`. Nuestro export produce la
 * representación **normalizada NGSI-LD** (ETSI GS CIM 009, con `Property`/
 * `Relationship` + `@context`), que es la forma correcta para interoperar
 * con un broker NGSI-LD real (Orion-LD). Por eso este módulo aplana
 * (`toSimplifiedEntity`) la entidad normalizada a `keyValues` ANTES de
 * correr ajv — es el mismo paso que hacen las herramientas de la comunidad
 * FIWARE (ej. `NGSI-LD keyValues` / `filip`) para poder reusar el schema
 * oficial sin reescribirlo. El aplanado es solo para efectos de validación:
 * `export-ngsi-ld.mjs` sigue emitiendo NGSI-LD normalizado tal cual.
 *
 * Atributos custom (`x-chagra-mip`) y `@context` no están restringidos por
 * el schema oficial (no declara `additionalProperties: false`), así que
 * quedan presentes en el objeto aplanado sin afectar el resultado — es
 * justo el comportamiento que ADR-051 Decisión punto 4 pide (extensión
 * propia declarada, no forzada en un campo FIWARE con otro significado).
 */

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

import Ajv from 'ajv';

const __dirname = dirname(fileURLToPath(import.meta.url));
const SCHEMAS_DIR = join(__dirname, '..', 'fiware-schemas');

/** Mapeo `type` NGSI-LD -> nombre de archivo del schema oficial vendorizado. */
const SCHEMA_FILES_BY_TYPE = {
  AgriCrop: 'AgriCrop.schema.json',
  AgriPest: 'AgriPest.schema.json',
  AgriParcelRecord: 'AgriParcelRecord.schema.json',
};

/** Cachés de módulo (evita releer/recompilar en cada llamada). */
let ajvInstance = null;
const validatorsByType = new Map();

function readSchema(filename) {
  const path = join(SCHEMAS_DIR, filename);
  return JSON.parse(readFileSync(path, 'utf-8'));
}

/**
 * Construye (una sola vez, cacheado a nivel de módulo) la instancia ajv con
 * los schemas comunes registrados (`common-schema.json`,
 * `agrifood-schema.json`) que resuelven los `$ref` cruzados de
 * `AgriCrop.schema.json` / `AgriPest.schema.json` / `AgriParcelRecord.schema.json`.
 *
 * @returns {import('ajv').default}
 */
function getAjv() {
  if (ajvInstance) return ajvInstance;

  const ajv = new Ajv({
    strict: false,
    allErrors: true,
    validateSchema: false,
    validateFormats: false,
  });

  // Schemas de soporte (definen GSMA-Commons/EntityIdentifierType y
  // AgriFood-Commons) — se registran por $id para que los `$ref` absolutos
  // de AgriCrop/AgriPest resuelvan en local, sin red en tiempo de validación.
  ajv.addSchema(readSchema('common-schema.json'));
  ajv.addSchema(readSchema('agrifood-schema.json'));

  ajvInstance = ajv;
  return ajv;
}

/**
 * Compila (cacheado) el validador ajv para un `type` NGSI-LD soportado.
 *
 * @param {'AgriCrop'|'AgriPest'|'AgriParcelRecord'} type
 * @returns {import('ajv').ValidateFunction}
 */
function getValidatorForType(type) {
  if (validatorsByType.has(type)) return validatorsByType.get(type);

  const filename = SCHEMA_FILES_BY_TYPE[type];
  if (!filename) {
    throw new Error(
      `No hay schema oficial vendorizado para type=${JSON.stringify(type)} `
      + `(soportados: ${Object.keys(SCHEMA_FILES_BY_TYPE).join(', ')})`,
    );
  }

  const schema = readSchema(filename);
  const validate = getAjv().compile(schema);
  validatorsByType.set(type, validate);
  return validate;
}

/**
 * Aplana un atributo NGSI-LD normalizado (`Property`/`Relationship`, o
 * arrays de estos) a su valor `keyValues` equivalente, para poder validar
 * contra el schema oficial (ver nota de cabecera del archivo).
 *
 * @param {unknown} attr
 * @returns {unknown}
 */
function simplifyAttribute(attr) {
  if (Array.isArray(attr)) {
    return attr.map((item) => simplifyAttribute(item));
  }
  if (attr && typeof attr === 'object') {
    if (attr.type === 'Relationship' && 'object' in attr) return attr.object;
    if ('value' in attr) return attr.value;
  }
  return attr;
}

/**
 * Convierte una entidad NGSI-LD normalizada (como las que emite
 * `export-ngsi-ld.mjs`) a su representación `keyValues` simplificada, que es
 * la que exige el `schema.json` oficial de smart-data-models. `id`/`type` se
 * copian tal cual (ya son strings planos en ambas representaciones);
 * `@context` se conserva (el schema oficial no lo prohíbe ni lo exige).
 *
 * @param {object} entity
 * @returns {object}
 */
export function toSimplifiedEntity(entity) {
  if (!entity || typeof entity !== 'object') return entity;

  const simplified = {};
  for (const [key, value] of Object.entries(entity)) {
    if (key === 'id' || key === 'type' || key === '@context') {
      simplified[key] = value;
      continue;
    }
    simplified[key] = simplifyAttribute(value);
  }
  return simplified;
}

/**
 * Valida una entidad NGSI-LD normalizada contra el JSON Schema oficial de
 * smart-data-models correspondiente a su `type` (`AgriCrop`/`AgriPest`,
 * únicos vendorizados hoy — ver `SCHEMA_FILES_BY_TYPE`).
 *
 * @param {object} entity - entidad NGSI-LD normalizada (con Property/Relationship)
 * @returns {{valid: boolean, errors: string[]}}
 */
export function validateEntityAjv(entity) {
  if (!entity || typeof entity !== 'object') {
    return { valid: false, errors: ['entity no es un objeto'] };
  }

  const type = entity.type;
  if (typeof type !== 'string' || !SCHEMA_FILES_BY_TYPE[type]) {
    return {
      valid: false,
      errors: [
        `type ausente o sin schema oficial vendorizado (soportados: `
        + `${Object.keys(SCHEMA_FILES_BY_TYPE).join(', ')}): ${JSON.stringify(type)}`,
      ],
    };
  }

  const validate = getValidatorForType(type);
  const simplified = toSimplifiedEntity(entity);
  const valid = validate(simplified);

  if (valid) return { valid: true, errors: [] };

  const errors = (validate.errors ?? []).map((err) => {
    const path = err.instancePath && err.instancePath.length > 0 ? err.instancePath : '(raíz)';
    return `${path} ${err.message ?? err.keyword}`;
  });
  return { valid: false, errors };
}

/**
 * Valida un array de entidades NGSI-LD contra los schemas oficiales.
 * Devuelve un reporte agregado análogo a `validateAgriCropEntities` /
 * `validateAgriPestEntities` / `validateAgriParcelRecordEntities` de
 * `export-ngsi-ld.mjs`.
 *
 * @param {object[]} entities
 * @returns {{valid: boolean, invalidCount: number, details: Array<{id: string|null, type: string|null, errors: string[]}>}}
 */
export function validateEntitiesAjv(entities) {
  const details = [];
  for (const entity of Array.isArray(entities) ? entities : []) {
    const { valid, errors } = validateEntityAjv(entity);
    if (!valid) {
      details.push({ id: entity?.id ?? null, type: entity?.type ?? null, errors });
    }
  }
  return { valid: details.length === 0, invalidCount: details.length, details };
}
