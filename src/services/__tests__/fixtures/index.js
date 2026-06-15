/**
 * Fixtures compartidos para tests unitarios (Vitest).
 *
 * Este módulo centraliza factories y fixtures que antes se duplicaban
 * en ~17 archivos de tests. Objetivo:
 *
 * 1. Eliminar redundancia de fixtures de especies (CAFE, MANGO, etc.)
 * 2. Proveer factories estándar (makeSpecies, makeUser, makeFinca, makeEvent)
 * 3. Mantener contratos compatibles con lo que ya usan los tests
 * 4. Facilitar adición de nuevos fixtures sin romper tests existentes
 *
 * Uso típico:
 *
 * ```js
 * import { makeSpecies, makeUser, SPECIES } from './fixtures';
 *
 * const cafe = makeSpecies({ nombre_comun: 'café', altitud_min: 1000, altitud_max: 2000 });
 * const user = makeUser({ finca_altitud: 1500 });
 * ```
 *
 * @module fixtures
 */

/**
 * Factory para crear fixtures de especies con grounding completo.
 * Compatible con el formato que espera resolve-entities / AGE.
 *
 * @param {Object} overrides - Campos opcionales a sobreescribir
 * @returns {Object} Fixture de especie con kind, mentioned, grounding y rangos
 *
 * @example
 * makeSpecies({ nombre_comun: 'café', altitud_min: 1000, altitud_max: 2000 })
 * // → { kind: 'species', mentioned: 'café', nombre_comun: 'café', nombre_cientifico: 'Coffea arabica', altitud_min: 1000, altitud_max: 2000, alternativas_viables: [...] }
 */
export const makeSpecies = (overrides = {}) => {
  const base = {
    kind: 'species',
    mentioned: overrides.nombre_comun || 'especie',
    nombre_comun: overrides.nombre_comun || 'especie',
    nombre_cientifico: overrides.nombre_cientifico || 'Scientific name',
    altitud_min: overrides.altitud_min ?? 0,
    altitud_max: overrides.altitud_max ?? 3000,
    alternativas_viables: overrides.alternativas_viables || [],
  };
  return { ...base, ...overrides };
};

/**
 * Factory para crear fixtures de usuarios con perfil de finca.
 * Compatible con userProfileService y derivados.
 *
 * @param {Object} overrides - Campos opcionales a sobreescribir
 * @returns {Object} Fixture de usuario con finca, altitud, ubicación
 *
 * @example
 * makeUser({ finca_altitud: 1500, municipio: 'Filandia' })
 * // → { finca_altitud: 1500, altitud_source: 'user', municipio: 'Filandia', departamento: 'Quindío' }
 */
export const makeUser = (overrides = {}) => {
  const base = {
    finca_altitud: overrides.finca_altitud ?? 1500,
    altitud_source: overrides.altitud_source || 'user',
    municipio: overrides.municipio || 'Filandia',
    departamento: overrides.departamento || 'Quindío',
    finca_nombre: overrides.finca_nombre || 'Finca El Recuerdo',
  };
  return { ...base, ...overrides };
};

/**
 * Factory para crear fixtures de fincas con ubicación y metadatos.
 *
 * @param {Object} overrides - Campos opcionales a sobreescribir
 * @returns {Object} Fixture de finca con assets, ubicación, área
 *
 * @example
 * makeFinca({ altitud: 1800, area_hectareas: 5, municipio: 'Salento' })
 * // → { altitud: 1800, area_hectareas: 5, municipio: 'Salento', departamento: 'Quindío' }
 */
export const makeFinca = (overrides = {}) => {
  const base = {
    finca_id: overrides.finca_id || 'finca-001',
    altitud: overrides.altitud ?? 1500,
    area_hectareas: overrides.area_hectareas ?? 3,
    municipio: overrides.municipio || 'Filandia',
    departamento: overrides.departamento || 'Quindío',
    nombre: overrides.nombre || 'Finca El Recuerdo',
    cultivos: overrides.cultivos || [],
  };
  return { ...base, ...overrides };
};

/**
 * Factory para crear eventos de inventario (inventoryService).
 * Compatible con el patrón evt() que ya usan varios tests.
 *
 * @param {string} eventType - Tipo de evento (EVENT_TYPES.RECEIVED, etc.)
 * @param {Object} payload - Payload del evento (item_id, delta, unit, etc.)
 * @param {Object} opts - Opciones adicionales (id, timestamp, device, seq)
 * @returns {Object} Evento con estructura canónica de inventoryService
 *
 * @example
 * makeInventoryEvent('RECEIVED', { item_id: 'compost-A', delta: 50, unit: 'kg' })
 * // → { id: '...', event_type: 'RECEIVED', timestamp: '...', payload: { item_id: 'compost-A', delta: 50, unit: 'kg' }, ... }
 */
export const makeInventoryEvent = (eventType, payload, opts = {}) => {
  const base = {
    id: opts.id || crypto.randomUUID().replace(/-/g, '').slice(0, 26).toUpperCase(),
    event_type: eventType,
    timestamp: opts.timestamp || new Date().toISOString(),
    device_id_lex_hash: opts.device || 'AAAA0000',
    sequence_number: opts.seq ?? 1,
    operator_id_hash: 'a'.repeat(64),
    idempotency_key: opts.idempotency_key || `${eventType}:${payload.item_id || 'x'}:${Math.random()}`,
    payload,
    schema_version: '1',
  };
  return { ...base, ...opts };
};

/**
 * Factory para crear eventos de farm process (farmProcessSync).
 * Compatible con el patrón makeEvent() que ya existe en farmProcessSync.test.js.
 *
 * @param {string} processId - ID del proceso
 * @param {string} eventType - Tipo de evento (sowing_confirmed, harvest_confirmed, etc.)
 * @param {Object} overrides - Campos opcionales a sobreescribir
 * @returns {Object} Evento con estructura de farm process
 *
 * @example
 * makeFarmProcessEvent('proc-001', 'sowing_confirmed', { actor: 'operator' })
 * // → { event_id: 'evt-001', type: 'farm_process_event', attributes: { process_id: 'proc-001', event_type: 'sowing_confirmed', ... } }
 */
export const makeFarmProcessEvent = (processId, eventType, overrides = {}) => {
  const base = {
    event_id: 'evt-001',
    type: 'farm_process_event',
    attributes: {
      process_id: processId || 'proc-001',
      event_type: eventType || 'sowing_confirmed',
      occurred_at: Date.now(),
      actor: 'operator',
      source: 'operator',
      idempotency_key: 'key-001',
      ...overrides,
    },
  };
  return base;
};

/**
 * Helper para añadir grounding a una entidad existente.
 * Útil cuando tienes una entidad básica y quieres añadirle rangos de altitud.
 *
 * @param {Object} entity - Entidad base (kind, mentioned, nombre_comun, etc.)
 * @param {Object} grounding - Campos de grounding (altitud_min, altitud_max, alternativas_viables)
 * @returns {Object} Entidad con grounding añadido
 *
 * @example
 * withGrounding({ kind: 'species', mentioned: 'café', nombre_comun: 'café' }, { altitud_min: 1000, altitud_max: 2000 })
 * // → { kind: 'species', mentioned: 'café', nombre_comun: 'café', altitud_min: 1000, altitud_max: 2000, alternativas_viables: [] }
 */
export const withGrounding = (entity, grounding) => {
  return {
    ...entity,
    altitud_min: grounding.altitud_min ?? 0,
    altitud_max: grounding.altitud_max ?? 3000,
    alternativas_viables: grounding.alternativas_viables || [],
  };
};

/**
 * Fixtures predefinidos de especies comunes (con grounding completo).
 * Estos evitan tener que redefinir CAFE, MANGO, etc. en cada test.
 *
 * @example
 * import { SPECIES } from './fixtures';
 *
 * const cafe = SPECIES.CAFE; // → { kind: 'species', mentioned: 'café', nombre_comun: 'café', nombre_cientifico: 'Coffea arabica', altitud_min: 1000, altitud_max: 2000, alternativas_viables: ['coco', 'cacao', 'plátano'] }
 */
export const SPECIES = {
  CAFE: {
    kind: 'species',
    mentioned: 'café',
    nombre_comun: 'café',
    nombre_cientifico: 'Coffea arabica',
    altitud_min: 1000,
    altitud_max: 2000,
    alternativas_viables: ['coco', 'cacao', 'plátano'],
  },
  MANGO: {
    kind: 'species',
    mentioned: 'mango',
    nombre_comun: 'mango',
    nombre_cientifico: 'Mangifera indica',
    altitud_min: 0,
    altitud_max: 1000,
    alternativas_viables: ['mora de Castilla', 'curuba'],
  },
  YUCA: {
    kind: 'species',
    mentioned: 'yuca',
    nombre_comun: 'yuca',
    nombre_cientifico: 'Manihot esculenta',
    altitud_min: 0,
    altitud_max: 1800,
    alternativas_viables: ['plátano', 'maíz'],
  },
  PLATANO: {
    kind: 'species',
    mentioned: 'plátano',
    nombre_comun: 'plátano',
    nombre_cientifico: 'Musa × paradisiaca',
    altitud_min: 0,
    altitud_max: 1600,
    alternativas_viables: ['cacao', 'cítricos'],
  },
  TOMATE: {
    kind: 'species',
    mentioned: 'tomate',
    nombre_comun: 'tomate',
    nombre_cientifico: 'Solanum lycopersicum',
    altitud_min: 0,
    altitud_max: 2400,
    alternativas_viables: ['pimentón', 'cebolla'],
  },
  CACAO: {
    kind: 'species',
    mentioned: 'cacao',
    nombre_comun: 'cacao',
    nombre_cientifico: 'Theobroma cacao',
    altitud_min: 0,
    altitud_max: 800,
    alternativas_viables: ['plátano', 'coco'],
  },
};

/**
 * Fixtures predefinidos de usuarios comunes (con perfil de finca).
 *
 * @example
 * import { USERS } from './fixtures';
 *
 * const user = USERS.FILANDIA_1500; // → { finca_altitud: 1500, altitud_source: 'user', municipio: 'Filandia', departamento: 'Quindío' }
 */
export const USERS = {
  FILANDIA_1500: {
    finca_altitud: 1500,
    altitud_source: 'user',
    municipio: 'Filandia',
    departamento: 'Quindío',
    finca_nombre: 'Finca El Recuerdo',
  },
  SALENTO_1800: {
    finca_altitud: 1800,
    altitud_source: 'user',
    municipio: 'Salento',
    departamento: 'Quindío',
    finca_nombre: 'Finca La Montaña',
  },
  CALI_1000: {
    finca_altitud: 1000,
    altitud_source: 'user',
    municipio: 'Cali',
    departamento: 'Valle',
    finca_nombre: 'Finca El Valle',
  },
  BUGA_900: {
    finca_altitud: 900,
    altitud_source: 'user',
    municipio: 'Buga',
    departamento: 'Valle',
    finca_nombre: 'Finca El Llano',
  },
};

/**
 * Fixtures predefinidos de fincas comunes.
 *
 * @example
 * import { FINCAS } from './fixtures';
 *
 * const finca = FINCAS.FILANDIA_1500; // → { finca_id: 'finca-001', altitud: 1500, area_hectareas: 3, municipio: 'Filandia', departamento: 'Quindío', nombre: 'Finca El Recuerdo' }
 */
export const FINCAS = {
  FILANDIA_1500: {
    finca_id: 'finca-001',
    altitud: 1500,
    area_hectareas: 3,
    municipio: 'Filandia',
    departamento: 'Quindío',
    nombre: 'Finca El Recuerdo',
    cultivos: [],
  },
  SALENTO_1800: {
    finca_id: 'finca-002',
    altitud: 1800,
    area_hectareas: 5,
    municipio: 'Salento',
    departamento: 'Quindío',
    nombre: 'Finca La Montaña',
    cultivos: [],
  },
  CALI_1000: {
    finca_id: 'finca-003',
    altitud: 1000,
    area_hectareas: 2,
    municipio: 'Cali',
    departamento: 'Valle',
    nombre: 'Finca El Valle',
    cultivos: [],
  },
};
