/**
 * Factories compartidas para tests de Chagra.
 *
 * Builders para generar objetos de prueba válidos sin duplicar setup inline.
 * Derivados de los tipos reales en src/types/ (Asset, Log, ChagraSpecies, etc.)
 *
 * Usage:
 *   import { makeFinca, makePlanta, makeSpecies, makeReporte, withGrounding } from './factories';
 *   const finca = makeFinca({ name: 'La Esperanza' });
 *   const tomate = makePlanta({ name: 'Tomate Chonto', species: 'solanum_lycopersicum' });
 */

// ─── ID Generator ───────────────────────────────────────────────────────────

/**
 * Genera IDs ULID-like para tests (26 caracteres hexadecimales).
 * NO es un ULID real, pero cumple el formato esperado por los tests.
 */
const generateId = (prefix) => {
  // Generar 26 caracteres hexadecimales después del prefijo
  const timestamp = Date.now().toString(16).padStart(10, '0'); // 10 caracteres mínimo
  const random1 = Math.random().toString(16).substring(2, 10); // 8 caracteres
  const random2 = Math.random().toString(16).substring(2, 10); // 8 caracteres
  // Total: 10 (timestamp) + 8 (random1) + 8 (random2) = 26 caracteres
  const hexPart = (timestamp + random1 + random2).substring(0, 26);
  return `${prefix}${hexPart.padEnd(26, '0')}`;
};

// ─── Factories ─────────────────────────────────────────────────────────────

/**
 * Crea un asset--land (finca/lote) válido para tests.
 *
 * @example
 *   const finca = makeFinca({ name: 'La Esperanza' });
 *   // { id, type: 'asset--land', attributes: { name: 'La Esperanza', status: 'active', ... } }
 */
export const makeFinca = (overrides = {}) => {
  const {
    id,
    name = 'Finca Test',
    status = 'active',
    geometry,
    notes,
  } = overrides;

  const attributes = {
    name,
    status,
  };

  if (geometry !== undefined) attributes.geometry = geometry;
  if (notes !== undefined) {
    attributes.notes = { value: notes };
  }

  return {
    id: id || generateId('land'),
    type: 'asset--land',
    attributes,
  };
};

/**
 * Crea un asset--plant (planta individual) válido para tests.
 *
 * @example
 *   const tomate = makePlanta({ name: 'Tomate Chonto', species_slug: 'solanum_lycopersicum' });
 */
export const makePlanta = (overrides = {}) => {
  const {
    id,
    name = 'Planta Test',
    status = 'active',
    species_slug,
    location_asset_id,
    quantity,
    unit,
    notes,
  } = overrides;

  const attributes = {
    name,
    status,
  };

  if (species_slug) attributes.species_slug = species_slug;
  if (location_asset_id) attributes.location_asset_id = location_asset_id;
  if (quantity !== undefined || unit !== undefined) {
    attributes.quantity = {
      ...(quantity !== undefined && { value: quantity }),
      ...(unit !== undefined && { unit }),
    };
  }
  if (notes !== undefined) {
    attributes.notes = { value: notes };
  }

  const relationships = {};
  if (location_asset_id) {
    relationships.location = {
      data: { type: 'asset--land', id: location_asset_id },
    };
  }

  return {
    id: id || generateId('plant'),
    type: 'asset--plant',
    attributes,
    ...(Object.keys(relationships).length > 0 && { relationships }),
  };
};

/**
 * Crea un log (reporte/observación/tarea) válido para tests.
 *
 * @example
 *   const reporte = makeReporte({ type: 'log--observation', name: 'Plaga detectada' });
 */
export const makeReporte = (overrides = {}) => {
  const {
    id,
    type = 'log--observation',
    name,
    status = 'pending',
    timestamp = Date.now(),
    notes,
    quantity,
    unit,
    asset_id,
  } = overrides;

  const attributes = {
    timestamp,
    status,
  };

  if (name) attributes.name = name;
  if (notes) attributes.notes = notes;
  if (quantity !== undefined || unit !== undefined) {
    attributes.quantity = {
      ...(quantity !== undefined && { value: quantity }),
      ...(unit !== undefined && { unit }),
    };
  }

  const relationships = {};
  if (asset_id) {
    relationships.asset = {
      data: { type: 'asset--plant', id: asset_id },
    };
  }

  return {
    id: id || generateId('log'),
    type,
    attributes,
    ...(Object.keys(relationships).length > 0 && { relationships }),
  };
};

/**
 * Crea una especie del catálogo válida para tests.
 *
 * @example
 *   const tomate = makeSpecies({ nombre_comun: 'Tomate', nombre_cientifico: 'Solanum lycopersicum' });
 */
export const makeSpecies = (overrides = {}) => {
  const {
    id = 'species_test',
    nombre_comun = 'Especie Test',
    nombre_cientifico = 'Testus testus',
    category = 'hortalizas',
    cultivable = true,
    altitud_min,
    altitud_max,
  } = overrides;

  const species = {
    slug: id,
    canonical_name_es: nombre_comun,
    scientific_name: nombre_cientifico,
    categories: [category],
    cultivable,
  };

  if (altitud_min !== undefined || altitud_max !== undefined) {
    species.altitud_msnm = {
      ...(altitud_min !== undefined && { min_absoluto: altitud_min }),
      ...(altitud_max !== undefined && { max_absoluto: altitud_max }),
    };
  }

  return species;
};

/**
 * Agrega metadata de grounding (corpus RAG/embeddings) a un objeto.
 *
 * @example
 *   const tomateConGrounding = withGrounding(makeSpecies({ nombre_comun: 'Tomate' }), {
 *     corpus_file: '/cycle-content/tomate.json',
 *     embedding_id: 'vec_tomate_001',
 *   });
 */
export const withGrounding = (obj, grounding) => {
  return {
    ...obj,
    _grounding: {
      source: grounding.source || 'corpus',
      corpus_file: grounding.corpus_file,
      embedding_id: grounding.embedding_id,
      confidence: grounding.confidence,
      last_updated: grounding.last_updated || Date.now(),
    },
  };
};