#!/usr/bin/env node
/**
 * scripts/export-ngsi-ld.mjs
 *
 * ADR-051 (FIWARE Smart Data Models como capa de interoperabilidad NGSI-LD),
 * Fase 1: lee el catálogo público (`catalog/chagra-catalog-oss-subset-v3.2.json`)
 * y emite entidades **NGSI-LD `AgriCrop`**, **`AgriPest`** y
 * **`AgriProductType`** (Smart Data Models — Smart AgriFood) para cada
 * `species` cultivable, cada plaga referenciada en
 * `species.plagas_criticas[]`, y cada `biopreparado` del catálogo.
 *
 * Análogo de `scripts/catalog-to-age.mjs`: función pura + CLI delgado. NO
 * toca red ni base de datos — es un export offline, no un cliente de un
 * broker Orion-LD (ver ADR-051 §Decisión punto 2: no se despliega runtime
 * FIWARE en Guatoc).
 *
 * Mapeo AgriCrop (Anexo A de ADR-051, fila AgriCrop):
 *   - `species.id`                  -> id (`urn:ngsi-ld:AgriCrop:<id>`)
 *   - `species.nombre_comun`        -> name
 *   - `species.nombre_cientifico`   -> alternateName
 *   - `species.valor_pedagogico`    -> description (truncado, ver truncText)
 *   - `species.plagas_criticas[]`   -> hasAgriPest (Relationship[] a AgriPest)
 *
 * Mapeo AgriPest (Anexo A de ADR-051, fila AgriPest):
 *   - slug de plaga (`normalizePest`) -> id (`urn:ngsi-ld:AgriPest:<slug>`)
 *   - nombre común / parseado del raw -> name
 *   - nombre científico (si se puede derivar) -> alternateName
 *   - descripción (si el registro la trae)    -> description
 *   - MIP (`umbral_accion`/`control_biologico[]`/`control_cultural[]`) ->
 *     **`x-chagra-mip`** (Property custom, NO campo FIWARE estándar — ver
 *     nota junto a `buildPestMipAttribute` más abajo).
 *
 * Mapeo AgriProductType (Anexo A de ADR-051, fila bonus AgriProductType):
 *   - `biopreparado.id`              -> id (`urn:ngsi-ld:AgriProductType:<id>`)
 *   - `biopreparado.nombre`          -> name
 *   - `biopreparado.proceso_resumen` -> description (truncado, ver truncText)
 *   - `biopreparado.tipo` + `biopreparado.proposito[]` ->
 *     **`x-chagra-clasificacion`** (Property custom — ver nota junto a
 *     `buildBiopreparadoClasificacionAttribute` más abajo: el `category`
 *     oficial de AgriProductType es un enum cerrado de 5 valores que NO tiene
 *     mapeo 1:1 sin pérdida/distorsión con la taxonomía propia de Chagra de
 *     `tipo` (7 valores) + `proposito` (8 valores), así que se expone tal
 *     cual en vez de forzarla).
 *   - Jerarquía padre-hijo (`hasAgriProductTypeParent`/
 *     `hasAgriProductTypeChildren`) y `root` -> **se OMITEN** (gap
 *     documentado en el Anexo A de ADR-051; Chagra no modela jerarquía entre
 *     biopreparados hoy, y `root` es booleano derivado de esa jerarquía —
 *     no se inventa un valor).
 *
 * NOTA DE PROVENIENCIA (verificado 2026-07-01): el catálogo público
 * (`chagra-catalog-oss-subset-v3.2.json`) solo trae `plagas_criticas[]` como
 * strings libres (ej. "Hemileia vastatrix (roya)"), sin campos MIP — el MIP
 * curado con `umbral_accion` real vive en el repo *privado* hermano
 * `chagra-pro` (`data/age/*-mip-*-ingest-*.sql`, marcado explícitamente
 * "privative data, do not redistribute outside chagra-pro repo") y se
 * inyecta directo al grafo compartido `chagra_kg`, fuera de este pipeline
 * público. Por eso `buildAgriPestEntity` acepta también un shape de objeto
 * enriquecido (`{nombre_cientifico, nombre_comun, umbral_accion,
 * control_biologico[], control_cultural[]}` — el mismo shape ya usado como
 * referencia en `catalog/chagra-catalog-seed-v3.0.json`), para quedar listo
 * el día que el MIP entre al catálogo público por un canal no-privativo,
 * SIN copiar ni un byte del dataset de `chagra-pro` aquí.
 *
 * Campos NGSI-LD sin equivalente en Chagra hoy (agroVocConcept,
 * harvestingInterval, plantingFrom, hasAgriSoil) se OMITEN — son opcionales
 * en el schema oficial `dataModel.Agrifood/AgriCrop`. NO se rellenan con
 * datos inventados (regla explícita de ADR-051 y del anti-alucinación
 * general del catálogo). `agroVocConcept` en `AgriPest` también se OMITE
 * (viene del grafo AGE — fuera de alcance de este export). `agroVocConcept`,
 * `category`, `hasAgriProductTypeParent`, `hasAgriProductTypeChildren` y
 * `root` en `AgriProductType` también se OMITEN (ver Mapeo AgriProductType
 * arriba).
 *
 * Slugs de plaga: reutiliza `normalizePest`/`classifyBiopreparadoTarget` de
 * `catalog-to-age.mjs` para que el `urn:ngsi-ld:AgriPest:<slug>` quede
 * alineado con el nodo `:Pest` del grafo `chagra_kg` (mismo slug en ambos
 * lados == join gratis entre el export NGSI-LD y el grafo AGE, y coincide
 * con los objetos de `hasAgriPest` que emite `buildAgriCropEntity`).
 *
 * Idempotencia: función pura sobre el JSON del catálogo — misma entrada,
 * misma salida byte a byte. Sin red, sin DB, sin estado mutable global.
 *
 * Uso:
 *   node scripts/export-ngsi-ld.mjs \
 *     --input catalog/chagra-catalog-oss-subset-v3.2.json \
 *     --out /tmp/ngsi-ld.json \
 *     [--json]        # imprime el array de entidades NGSI-LD crudo por stdout
 *     [--limit 10]    # subset de species (default: todas)
 *     [--pretty]      # indenta el JSON (default: 2 espacios; con --json activa igual)
 *
 * El array de salida combina entidades `AgriCrop`, seguidas de `AgriPest`,
 * seguidas de `AgriProductType` (batch mixto — formato aceptado por
 * `entityOperations/upsert` de Orion-LD; ver ADR-051, no implica correr el
 * broker).
 *
 * Sin `--json` ni `--out`, imprime un reporte humano (conteo, validación)
 * por stdout — pensado para revisión manual del operador antes de un demo.
 *
 * Validación de conformidad NGSI-LD (ADR-051 fase 1, ítem CI): además de la
 * validación estructural propia (`validateAgriCropEntity`/
 * `validateAgriPestEntity`), `main()` corre `validateEntitiesAjv` (ver
 * `scripts/lib/ngsi-validate.mjs`) contra los JSON Schema **oficiales** de
 * `smart-data-models/dataModel.Agrifood` vendorizados en
 * `scripts/fiware-schemas/`. Si cualquiera de las dos capas falla, el
 * proceso sale con código 1 — pensado para engancharse a CI vía
 * `npm run validate:ngsi`.
 */

import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { normalizePest, classifyBiopreparadoTarget, truncText } from './catalog-to-age.mjs';
import { validateEntitiesAjv } from './lib/ngsi-validate.mjs';

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
    // classifyBiopreparadoTarget solo se usa aquí para reafirmar que el
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
// AgriPest — construcción de entidades (ADR-051 Anexo A, fila AgriPest)
// =============================================================================

/**
 * Parsea un nombre de plaga en texto libre (formato observado en el catálogo:
 * `"Nombre científico (nombre común)"`, ej. `"Hemileia vastatrix (roya)"`) en
 * `{name, alternateName}`. Si no calza el patrón entre paréntesis, o si no se
 * puede determinar con confianza cuál de los dos segmentos es el binomio
 * científico, se devuelve el string completo como `name` y `alternateName:
 * null` — nunca se inventa cuál segmento es cuál.
 *
 * @param {string} raw
 * @returns {{name: string, alternateName: string|null}}
 */
export function parsePestNameFromRaw(raw) {
  const str = String(raw ?? '').trim();
  const match = str.match(/^(.+?)\s*\(([^()]+)\)\s*$/);
  if (!match) return { name: str, alternateName: null };

  const [, first, second] = match;
  const looksLikeBinomial = (s) => /^[A-ZÀ-Ý][a-zà-ÿ]+(?:\s+[a-zà-ÿ.]+){1,3}$/.test(s.trim());

  if (looksLikeBinomial(first) && !looksLikeBinomial(second)) {
    return { name: second.trim(), alternateName: first.trim() };
  }
  if (looksLikeBinomial(second) && !looksLikeBinomial(first)) {
    return { name: first.trim(), alternateName: second.trim() };
  }
  // Ambiguo (ambos o ninguno parecen binomio): no se adivina, se conserva
  // el string completo tal cual llegó del catálogo.
  return { name: str, alternateName: null };
}

/**
 * Construye el atributo NGSI-LD custom `x-chagra-mip` a partir de un registro
 * de plaga enriquecido. El MIP (umbral económico de acción + control
 * biológico/cultural) **no tiene equivalente en ningún schema FIWARE
 * revisado** — ni `AgriPest` ni `AgriPhytosanitary` lo modelan (ADR-051,
 * Anexo A fila AgriPest + alternativa #4 descartada: `AgriPhytosanitary.
 * entrylimit` es un registro fitosanitario tipo SIGPAC, semántica distinta a
 * un umbral económico agronómico). Por eso se expone como `Property` custom
 * en vez de forzarlo en un campo FIWARE con otro significado (ADR-051
 * Decisión punto 4). Devuelve `null` si el registro no trae ningún campo MIP
 * reconocible (no se rellena con datos inventados).
 *
 * @param {object} pestRecord
 * @returns {{type:'Property', value: object}|null}
 */
export function buildPestMipAttribute(pestRecord) {
  if (!pestRecord || typeof pestRecord !== 'object') return null;

  const value = {};
  if (typeof pestRecord.umbral_accion === 'string' && pestRecord.umbral_accion.trim()) {
    value.umbral_accion = pestRecord.umbral_accion.trim();
  }
  if (Array.isArray(pestRecord.control_biologico) && pestRecord.control_biologico.length > 0) {
    value.control_biologico = pestRecord.control_biologico;
  }
  if (Array.isArray(pestRecord.control_cultural) && pestRecord.control_cultural.length > 0) {
    value.control_cultural = pestRecord.control_cultural;
  }

  if (Object.keys(value).length === 0) return null;
  return { type: 'Property', value };
}

/**
 * Construye una entidad NGSI-LD `AgriPest` a partir de un registro de plaga.
 * Acepta dos shapes:
 *
 *   1. `string` — el shape real de hoy en `species.plagas_criticas[]` del
 *      catálogo público (ej. `"Hypothenemus hampei (broca)"`). Se parsea con
 *      `parsePestNameFromRaw`; nunca trae MIP.
 *   2. `object` — shape enriquecido `{nombre_cientifico, nombre_comun,
 *      descripcion?, umbral_accion?, control_biologico?, control_cultural?}`
 *      (mismo shape usado como referencia en
 *      `catalog/chagra-catalog-seed-v3.0.json`). Si trae `umbral_accion`/
 *      `control_biologico`/`control_cultural`, se emite `x-chagra-mip`.
 *
 * Devuelve `null` si no se puede derivar un slug/id o un `name` — se reporta
 * como "omitida" por el caller, nunca se rellena con datos inventados.
 *
 * @param {string|object} pestRecord
 * @param {object} [opts]
 * @param {string[]} [opts.context]
 * @returns {object|null}
 */
export function buildAgriPestEntity(pestRecord, opts = {}) {
  const context = opts.context || DEFAULT_CONTEXT;
  if (pestRecord === null || pestRecord === undefined || pestRecord === '') return null;

  let slug = null;
  let name = null;
  let alternateName = null;
  let description = null;
  let mip = null;

  if (typeof pestRecord === 'string') {
    slug = normalizePest(pestRecord);
    const parsed = parsePestNameFromRaw(pestRecord);
    name = parsed.name;
    alternateName = parsed.alternateName;
  } else if (typeof pestRecord === 'object' && !Array.isArray(pestRecord)) {
    const cientifico = typeof pestRecord.nombre_cientifico === 'string' ? pestRecord.nombre_cientifico.trim() : '';
    const comun = typeof pestRecord.nombre_comun === 'string' ? pestRecord.nombre_comun.trim() : '';
    slug = normalizePest(cientifico || comun);
    name = comun || cientifico || null;
    alternateName = (comun && cientifico) ? cientifico : null;
    description = typeof pestRecord.descripcion === 'string' && pestRecord.descripcion.trim()
      ? pestRecord.descripcion.trim()
      : null;
    mip = buildPestMipAttribute(pestRecord);
  } else {
    return null;
  }

  if (!slug || !name) return null;

  const entity = {
    id: agriPestUrn(slug),
    type: 'AgriPest',
  };

  const nameProp = ngsiProperty(name);
  if (nameProp) entity.name = nameProp;

  const alternateNameProp = ngsiProperty(alternateName);
  if (alternateNameProp) entity.alternateName = alternateNameProp;

  const descriptionProp = ngsiProperty(description);
  if (descriptionProp) entity.description = descriptionProp;

  if (mip) entity['x-chagra-mip'] = mip;

  entity['@context'] = context;

  return entity;
}

/**
 * Deriva la lista deduplicada (por slug de plaga) de registros de plaga a
 * partir de `species[].plagas_criticas[]`. Cada entrada puede ser un string
 * libre o un objeto enriquecido (ver `buildAgriPestEntity`); si el mismo slug
 * aparece como string en una species y como objeto enriquecido en otra, se
 * conserva el objeto (superset de información, nunca se descarta MIP real a
 * favor de un string).
 *
 * @param {object[]} speciesArray
 * @returns {Array<string|object>}
 */
export function derivePestRecords(speciesArray) {
  const bySlug = new Map();
  for (const sp of Array.isArray(speciesArray) ? speciesArray : []) {
    for (const raw of Array.isArray(sp?.plagas_criticas) ? sp.plagas_criticas : []) {
      if (raw === null || raw === undefined || raw === '') continue;

      let slug = null;
      if (typeof raw === 'string') {
        slug = normalizePest(raw);
      } else if (typeof raw === 'object' && !Array.isArray(raw)) {
        slug = normalizePest(raw.nombre_cientifico || raw.nombre_comun);
      }
      if (!slug) continue;

      const existing = bySlug.get(slug);
      if (!existing || (typeof existing === 'string' && typeof raw === 'object')) {
        bySlug.set(slug, raw);
      }
    }
  }
  return Array.from(bySlug.values());
}

/**
 * Construye entidades AgriPest para el catálogo, junto a un reporte de
 * cuántas se omitieron.
 *
 * @param {object} seed - catálogo parseado ({ species: [...] })
 * @param {object} [opts]
 * @param {number} [opts.limit] - subset de species de las que se derivan
 *   plagas (default: todas; mismo semántica que `buildAgriCropEntities`)
 * @param {string[]} [opts.context]
 * @returns {{entities: object[], report: {total: number, emitted: number, omitted: Array<{raw: string|null, reason: string}>}}}
 */
export function buildAgriPestEntities(seed, opts = {}) {
  const speciesAll = Array.isArray(seed?.species) ? seed.species : [];
  const species = typeof opts.limit === 'number' ? speciesAll.slice(0, opts.limit) : speciesAll;
  const pestRecords = derivePestRecords(species);

  const entities = [];
  const omitted = [];
  for (const rec of pestRecords) {
    const entity = buildAgriPestEntity(rec, { context: opts.context });
    if (entity) {
      entities.push(entity);
    } else {
      const raw = typeof rec === 'string' ? rec : (rec?.nombre_cientifico ?? rec?.nombre_comun ?? null);
      omitted.push({ raw, reason: 'no se pudo derivar slug o name' });
    }
  }

  return {
    entities,
    report: {
      total: pestRecords.length,
      emitted: entities.length,
      omitted,
    },
  };
}

// =============================================================================
// AgriProductType — construcción de entidades (ADR-051 Anexo A, fila bonus
// AgriProductType, mapeada desde `biopreparado` del catálogo público)
// =============================================================================

/**
 * Construye el URN NGSI-LD para una entidad AgriProductType a partir del id
 * canónico de un `biopreparado` del catálogo Chagra (`biopreparados[].id`,
 * ya snake_case por schema-v3.1.json).
 *
 * @param {string} biopreparadoId
 * @returns {string}
 */
export function agriProductTypeUrn(biopreparadoId) {
  return `urn:ngsi-ld:AgriProductType:${String(biopreparadoId).trim()}`;
}

/**
 * Construye el atributo NGSI-LD custom `x-chagra-clasificacion` a partir de
 * `biopreparado.tipo` (forma física: fermentado/mineral/microbiano/
 * extracto/caldo/residuo/compuesto) y `biopreparado.proposito[]` (función
 * agroecológica: fertilizacion/fitosanitario_preventivo/.../
 * repelente_insectos — ver enum completo en `catalog/schema-v3.1.json`).
 *
 * El schema oficial `dataModel.Agrifood/AgriProductType` sí define un campo
 * `category` (enum cerrado: cropNutrition, cropProtection, cropVariety,
 * fertiliser, harvestCommodity), pero es una taxonomía de 5 valores que NO
 * tiene mapeo 1:1 sin pérdida ni distorsión con la taxonomía propia de
 * Chagra (`tipo`: 7 valores de forma física; `proposito`: 8 valores de
 * función agroecológica, ej. `enmienda_ph`/`enmienda_ca`/`enmienda_p` no
 * corresponden a ninguno de los 5 valores oficiales). Forzar un biopreparado
 * de enmienda de pH dentro de `fertiliser` sería inventar una clasificación
 * que el catálogo no afirma (regla explícita anti-alucinación de ADR-051).
 * Por eso, igual que `x-chagra-mip` en AgriPest, se expone la taxonomía real
 * de Chagra como Property custom en vez de forzarla en `category`.
 *
 * Devuelve `null` si el biopreparado no trae `tipo` ni `proposito` (no se
 * rellena con datos inventados).
 *
 * @param {object} biopreparado
 * @returns {{type:'Property', value:{tipo?: string, proposito?: string[]}}|null}
 */
export function buildBiopreparadoClasificacionAttribute(biopreparado) {
  if (!biopreparado || typeof biopreparado !== 'object') return null;

  const value = {};
  if (typeof biopreparado.tipo === 'string' && biopreparado.tipo.trim()) {
    value.tipo = biopreparado.tipo.trim();
  }
  if (Array.isArray(biopreparado.proposito) && biopreparado.proposito.length > 0) {
    value.proposito = biopreparado.proposito.filter((p) => typeof p === 'string' && p.trim());
  }

  if (Object.keys(value).length === 0) return null;
  return { type: 'Property', value };
}

/**
 * Construye una entidad NGSI-LD `AgriProductType` a partir de un
 * `biopreparado` del catálogo público (`catalog/chagra-catalog-oss-subset-
 * v3.2.json` → `biopreparados[]`). Devuelve `null` si falta `id` o `nombre`
 * — se reporta como "omitida" por el caller, nunca se rellena con datos
 * inventados.
 *
 * La jerarquía padre-hijo (`hasAgriProductTypeParent`/
 * `hasAgriProductTypeChildren`) y el booleano `root` que exige el schema
 * oficial se OMITEN a propósito: es el gap documentado en el Anexo A de
 * ADR-051 ("jerarquía padre-hijo") y Chagra no modela ninguna jerarquía
 * entre biopreparados hoy — no hay dato del que derivar `root` sin
 * inventarlo.
 *
 * @param {object} biopreparado
 * @param {object} [opts]
 * @param {string[]} [opts.context] - `@context` a usar (default DEFAULT_CONTEXT)
 * @returns {object|null}
 */
export function buildAgriProductTypeEntity(biopreparado, opts = {}) {
  const context = opts.context || DEFAULT_CONTEXT;
  if (!biopreparado || !biopreparado.id || !biopreparado.nombre) return null;

  const entity = {
    id: agriProductTypeUrn(biopreparado.id),
    type: 'AgriProductType',
  };

  const name = ngsiProperty(biopreparado.nombre);
  if (name) entity.name = name;

  const description = ngsiProperty(truncText(biopreparado.proceso_resumen, 500));
  if (description) entity.description = description;

  const clasificacion = buildBiopreparadoClasificacionAttribute(biopreparado);
  if (clasificacion) entity['x-chagra-clasificacion'] = clasificacion;

  entity['@context'] = context;

  return entity;
}

/**
 * Construye entidades AgriProductType para `seed.biopreparados[]`, junto a
 * un reporte de cuántas se omitieron (y por qué id, si tiene) por faltar
 * campos mínimos.
 *
 * @param {object} seed - catálogo parseado ({ biopreparados: [...] })
 * @param {object} [opts]
 * @param {number} [opts.limit] - subset de biopreparados (default: todos)
 * @param {string[]} [opts.context]
 * @returns {{entities: object[], report: {total: number, emitted: number, omitted: Array<{id: string|null, reason: string}>}}}
 */
export function buildAgriProductTypeEntities(seed, opts = {}) {
  const biopreparadosAll = Array.isArray(seed?.biopreparados) ? seed.biopreparados : [];
  const biopreparados = typeof opts.limit === 'number' ? biopreparadosAll.slice(0, opts.limit) : biopreparadosAll;

  const entities = [];
  const omitted = [];
  for (const bp of biopreparados) {
    const entity = buildAgriProductTypeEntity(bp, { context: opts.context });
    if (entity) {
      entities.push(entity);
    } else {
      omitted.push({ id: bp?.id ?? null, reason: 'missing id o nombre' });
    }
  }

  return {
    entities,
    report: {
      total: biopreparados.length,
      emitted: entities.length,
      omitted,
    },
  };
}

// =============================================================================
// Validación estructural (sin dependencia externa — ver nota abajo)
// =============================================================================

/**
 * NOTA (actualizada — ADR-051 fase 1, ítem "Validación conformidad NGSI-LD
 * (ajv vs schemas oficiales) en CI"): esta función valida solo la
 * estructura mínima NGSI-LD (id URN `urn:ngsi-ld:AgriCrop:*`, type, name, y
 * forma de hasAgriPest/@context si están presentes) — es rápida y no
 * depende de los schemas oficiales, útil como smoke check dentro de
 * `buildAgriCropEntities`/CLI. La validación **completa** contra los JSON
 * Schema oficiales de `smart-data-models` (vendorizados en
 * `scripts/fiware-schemas/`) vive en `scripts/lib/ngsi-validate.mjs`
 * (`validateEntitiesAjv`) y se corre además en `main()` más abajo — ambas
 * capas se mantienen porque esta es más barata y da mensajes más
 * específicos al dominio Chagra (ej. formato de URN de plaga).
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

/**
 * Valida la estructura mínima NGSI-LD de una entidad AgriPest (mismo alcance
 * y misma nota sobre `ajv` que `validateAgriCropEntity`). Adicionalmente
 * valida la forma de `x-chagra-mip` si está presente: debe ser
 * `{type:'Property', value: object}` con al menos uno de
 * `umbral_accion`/`control_biologico`/`control_cultural` reconocible.
 *
 * @param {object} entity
 * @returns {{valid: boolean, errors: string[]}}
 */
export function validateAgriPestEntity(entity) {
  const errors = [];

  if (!entity || typeof entity !== 'object') {
    return { valid: false, errors: ['entity no es un objeto'] };
  }

  if (typeof entity.id !== 'string' || !/^urn:ngsi-ld:AgriPest:.+$/.test(entity.id)) {
    errors.push(`id inválido (esperado urn:ngsi-ld:AgriPest:*): ${JSON.stringify(entity.id)}`);
  }

  if (entity.type !== 'AgriPest') {
    errors.push(`type inválido (esperado 'AgriPest'): ${JSON.stringify(entity.type)}`);
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

  if (entity['x-chagra-mip'] !== undefined) {
    const mip = entity['x-chagra-mip'];
    if (!mip || mip.type !== 'Property' || typeof mip.value !== 'object' || mip.value === null) {
      errors.push('x-chagra-mip presente pero mal formado (esperado {type:"Property", value: object})');
    } else {
      const { umbral_accion: umbralAccion, control_biologico: controlBiologico, control_cultural: controlCultural } = mip.value;
      const hasAnyMipField = (typeof umbralAccion === 'string' && umbralAccion.length > 0)
        || (Array.isArray(controlBiologico) && controlBiologico.length > 0)
        || (Array.isArray(controlCultural) && controlCultural.length > 0);
      if (!hasAnyMipField) {
        errors.push('x-chagra-mip.value no tiene ningún campo MIP reconocible (umbral_accion/control_biologico/control_cultural)');
      }
    }
  }

  if (!entity['@context'] || (Array.isArray(entity['@context']) && entity['@context'].length === 0)) {
    errors.push('@context faltante o vacío');
  }

  return { valid: errors.length === 0, errors };
}

/**
 * Valida un array de entidades AgriPest. Devuelve un reporte agregado.
 *
 * @param {object[]} entities
 * @returns {{valid: boolean, invalidCount: number, details: Array<{id: string|null, errors: string[]}>}}
 */
export function validateAgriPestEntities(entities) {
  const details = [];
  for (const entity of entities) {
    const { valid, errors } = validateAgriPestEntity(entity);
    if (!valid) details.push({ id: entity?.id ?? null, errors });
  }
  return { valid: details.length === 0, invalidCount: details.length, details };
}

/**
 * Valida la estructura mínima NGSI-LD de una entidad AgriProductType (mismo
 * alcance y misma nota sobre `ajv` que `validateAgriCropEntity`).
 * Adicionalmente valida la forma de `x-chagra-clasificacion` si está
 * presente: debe ser `{type:'Property', value: object}` con al menos
 * `tipo` (string) o `proposito` (array no-vacío) reconocible. NO exige
 * `hasAgriProductTypeParent`/`hasAgriProductTypeChildren`/`root`/`category`
 * — se omiten a propósito (ver `buildAgriProductTypeEntity`).
 *
 * @param {object} entity
 * @returns {{valid: boolean, errors: string[]}}
 */
export function validateAgriProductTypeEntity(entity) {
  const errors = [];

  if (!entity || typeof entity !== 'object') {
    return { valid: false, errors: ['entity no es un objeto'] };
  }

  if (typeof entity.id !== 'string' || !/^urn:ngsi-ld:AgriProductType:.+$/.test(entity.id)) {
    errors.push(`id inválido (esperado urn:ngsi-ld:AgriProductType:*): ${JSON.stringify(entity.id)}`);
  }

  if (entity.type !== 'AgriProductType') {
    errors.push(`type inválido (esperado 'AgriProductType'): ${JSON.stringify(entity.type)}`);
  }

  if (
    !entity.name
    || entity.name.type !== 'Property'
    || typeof entity.name.value !== 'string'
    || entity.name.value.length === 0
  ) {
    errors.push('name faltante o mal formado (esperado {type:"Property", value: string no vacío})');
  }

  if (entity.description !== undefined) {
    if (entity.description.type !== 'Property' || typeof entity.description.value !== 'string') {
      errors.push('description presente pero mal formado');
    }
  }

  if (entity['x-chagra-clasificacion'] !== undefined) {
    const clasificacion = entity['x-chagra-clasificacion'];
    if (!clasificacion || clasificacion.type !== 'Property' || typeof clasificacion.value !== 'object' || clasificacion.value === null) {
      errors.push('x-chagra-clasificacion presente pero mal formado (esperado {type:"Property", value: object})');
    } else {
      const { tipo, proposito } = clasificacion.value;
      const hasAnyField = (typeof tipo === 'string' && tipo.length > 0)
        || (Array.isArray(proposito) && proposito.length > 0);
      if (!hasAnyField) {
        errors.push('x-chagra-clasificacion.value no tiene ningún campo reconocible (tipo/proposito)');
      }
    }
  }

  if (!entity['@context'] || (Array.isArray(entity['@context']) && entity['@context'].length === 0)) {
    errors.push('@context faltante o vacío');
  }

  return { valid: errors.length === 0, errors };
}

/**
 * Valida un array de entidades AgriProductType. Devuelve un reporte agregado.
 *
 * @param {object[]} entities
 * @returns {{valid: boolean, invalidCount: number, details: Array<{id: string|null, errors: string[]}>}}
 */
export function validateAgriProductTypeEntities(entities) {
  const details = [];
  for (const entity of entities) {
    const { valid, errors } = validateAgriProductTypeEntity(entity);
    if (!valid) details.push({ id: entity?.id ?? null, errors });
  }
  return { valid: details.length === 0, invalidCount: details.length, details };
}

// =============================================================================
// CLI entry point
// =============================================================================

/**
 * @param {string[]} argv - process.argv.slice(2)
 * @returns {Promise<{outputPath: string|null, entityCount: number, valid: boolean, ajvValid: boolean}>}
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
        + '  --out FILE    Escribe el array de entidades NGSI-LD (AgriCrop + AgriPest + \n'
        + '                AgriProductType, JSON) a FILE.\n'
        + '  --json        Imprime el array de entidades NGSI-LD crudo por stdout\n'
        + '                (sin esto, imprime un reporte humano de conteo/validación).\n'
        + '  --limit N     Subset de species (AgriCrop/AgriPest) y de biopreparados\n'
        + '                (AgriProductType) de los que se derivan entidades (default: todas).',
      );
      return { outputPath: null, entityCount: 0, valid: true };
    }
  }

  const seedPath = resolve(opts.input);
  const seed = JSON.parse(readFileSync(seedPath, 'utf-8'));

  const cropResult = buildAgriCropEntities(seed, { limit: opts.limit ?? undefined });
  const cropValidation = validateAgriCropEntities(cropResult.entities);

  const pestResult = buildAgriPestEntities(seed, { limit: opts.limit ?? undefined });
  const pestValidation = validateAgriPestEntities(pestResult.entities);

  const productTypeResult = buildAgriProductTypeEntities(seed, { limit: opts.limit ?? undefined });
  const productTypeValidation = validateAgriProductTypeEntities(productTypeResult.entities);

  // Batch mixto AgriCrop + AgriPest + AgriProductType (formato aceptado por
  // entityOperations/upsert de Orion-LD; ver nota de cabecera del archivo).
  const entities = [...cropResult.entities, ...pestResult.entities, ...productTypeResult.entities];

  // Validación de conformidad NGSI-LD contra los schemas OFICIALES de
  // smart-data-models (ADR-051 fase 1, ítem CI) — capa adicional a la
  // validación estructural propia de arriba (ver `scripts/lib/ngsi-validate.mjs`).
  const ajvValidation = validateEntitiesAjv(entities);

  const valid = cropValidation.valid && pestValidation.valid && productTypeValidation.valid && ajvValidation.valid;

  const jsonOut = JSON.stringify(entities, null, 2) + '\n';

  if (opts.out) {
    writeFileSync(opts.out, jsonOut, 'utf-8');
    console.error(
      `Escrito ${entities.length} entidades NGSI-LD (${cropResult.entities.length} AgriCrop + `
      + `${pestResult.entities.length} AgriPest + ${productTypeResult.entities.length} AgriProductType) `
      + `a ${opts.out} (válidas: ${valid ? 'sí' : 'NO'})`,
    );
  } else if (opts.json) {
    process.stdout.write(jsonOut);
  } else {
    // Reporte humano por stdout — pensado para revisión manual del operador.
    console.log('--- export-ngsi-ld: reporte AgriCrop + AgriPest + AgriProductType (ADR-051 fase 1) ---');
    console.log(`Fuente: ${opts.input}`);
    console.log(`Species leídas: ${cropResult.report.total}`);
    console.log(`Entidades AgriCrop emitidas: ${cropResult.report.emitted}`);
    console.log(`Omitidas (faltan campos mínimos): ${cropResult.report.omitted.length}`);
    if (cropResult.report.omitted.length > 0) {
      console.log('  ids omitidos:', cropResult.report.omitted.map((o) => o.id).join(', '));
    }
    console.log(`Validación estructural NGSI-LD (AgriCrop): ${cropValidation.valid ? 'OK' : `FALLÓ (${cropValidation.invalidCount} entidad(es))`}`);
    if (!cropValidation.valid) {
      for (const d of cropValidation.details.slice(0, 10)) {
        console.log(`  - ${d.id}: ${d.errors.join(' | ')}`);
      }
    }
    console.log(`Plagas únicas derivadas de plagas_criticas[]: ${pestResult.report.total}`);
    console.log(`Entidades AgriPest emitidas: ${pestResult.report.emitted}`);
    console.log(`Omitidas (faltan campos mínimos): ${pestResult.report.omitted.length}`);
    if (pestResult.report.omitted.length > 0) {
      console.log('  plagas omitidas:', pestResult.report.omitted.map((o) => o.raw).join(', '));
    }
    console.log(`Validación estructural NGSI-LD (AgriPest): ${pestValidation.valid ? 'OK' : `FALLÓ (${pestValidation.invalidCount} entidad(es))`}`);
    if (!pestValidation.valid) {
      for (const d of pestValidation.details.slice(0, 10)) {
        console.log(`  - ${d.id}: ${d.errors.join(' | ')}`);
      }
    }
    console.log(`Biopreparados leídos: ${productTypeResult.report.total}`);
    console.log(`Entidades AgriProductType emitidas: ${productTypeResult.report.emitted}`);
    console.log(`Omitidas (faltan campos mínimos): ${productTypeResult.report.omitted.length}`);
    if (productTypeResult.report.omitted.length > 0) {
      console.log('  ids omitidos:', productTypeResult.report.omitted.map((o) => o.id).join(', '));
    }
    console.log(`Validación estructural NGSI-LD (AgriProductType): ${productTypeValidation.valid ? 'OK' : `FALLÓ (${productTypeValidation.invalidCount} entidad(es))`}`);
    if (!productTypeValidation.valid) {
      for (const d of productTypeValidation.details.slice(0, 10)) {
        console.log(`  - ${d.id}: ${d.errors.join(' | ')}`);
      }
    }
    console.log(
      `Validación ajv vs. schemas oficiales smart-data-models (AgriCrop+AgriPest+AgriProductType): `
      + `${ajvValidation.valid ? 'OK' : `FALLÓ (${ajvValidation.invalidCount} entidad(es))`}`,
    );
    if (!ajvValidation.valid) {
      for (const d of ajvValidation.details.slice(0, 10)) {
        console.log(`  - [${d.type}] ${d.id}: ${d.errors.join(' | ')}`);
      }
    }
  }

  if (!valid) {
    process.exitCode = 1;
  }

  return {
    outputPath: opts.out,
    entityCount: entities.length,
    valid,
    ajvValid: ajvValidation.valid,
  };
}

// ESM-friendly entry-point check.
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((err) => {
    console.error('export-ngsi-ld failed:', err);
    process.exit(1);
  });
}
