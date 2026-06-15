/**
 * tests/fixtures/index.js — Factories compartidos para tests.
 *
 * Este módulo centraliza la creación de objetos de prueba para evitar
 * redundancia en los tests y hacer más fácil mantener la consistencia.
 *
 * Factories disponibles:
 * - makeFinca(): crea datos de finca con defaults sanos
 * - makeCase(): crea datos de caso de estudio con defaults
 * - makeInventoryEvent(): crea eventos de inventario (received, consumed, etc.)
 * - makeSpecies(): crea datos de especies para tests de catálogo
 * - withGrounding(): añade contexto de grounding a respuestas
 *
 * Cada factory acepta opciones para override defaults, permitiendo tests
 * específicos sin repetir toda la estructura del objeto.
 */

/**
 * Crea un objeto de finca con defaults sanos.
 * @param {Object} opts - Opciones para override defaults
 * @returns {Object} Objeto de finca
 */
export function makeFinca(opts = {}) {
  return {
    id: opts.id || 'guatoc',
    name: opts.name || 'Guatoc',
    slug: opts.slug || 'guatoc',
    location: opts.location || {
      lat: 4.6,
      lng: -74.1,
      altitude: 2600,
      municipality: 'Cajicá',
      department: 'Cundinamarca',
    },
    biocultural_zone: opts.biocultural_zone || 'andino_alto_páramo',
    ...opts,
  };
}

/**
 * Crea un objeto de caso de estudio con defaults sanos.
 * @param {string} title - Título del caso
 * @param {Object} opts - Opciones adicionales
 * @returns {Object} Objeto de caso para createCase()
 */
export function makeCase(title = 'Caso de prueba', opts = {}) {
  return {
    title,
    finca_slug: opts.finca_slug || 'guatoc',
    zone_freetext: opts.zone_freetext || 'zona-general',
    subject: opts.subject || {
      species_ids: opts.species_ids || [],
      count_total: opts.count_total || null,
      count_affected: opts.count_affected || null,
    },
    problem: opts.problem || {
      name_freetext: opts.problem_name || 'Problema genérico',
      pest_id: opts.pest_id || null,
      severity: opts.severity || 'medium',
      detected_at: opts.detected_at || new Date().toISOString(),
    },
    visibility: opts.visibility || 'private',
    ...opts,
  };
}

/**
 * Crea un evento de inventario con defaults sanos.
 * @param {string} eventType - Tipo de evento (EVENT_TYPES.RECEIVED, etc.)
 * @param {Object} payload - Payload del evento
 * @param {Object} opts - Opciones adicionales
 * @returns {Object} Objeto de evento para projectStock()
 */
export function makeInventoryEvent(eventType, payload, opts = {}) {
  return {
    id: opts.id || crypto.randomUUID().replace(/-/g, '').slice(0, 26).toUpperCase(),
    event_type: eventType,
    timestamp: opts.timestamp || new Date().toISOString(),
    device_id_lex_hash: opts.device || 'AAAA0000',
    sequence_number: opts.seq ?? 1,
    operator_id_hash: opts.operator_id_hash || 'a'.repeat(64),
    idempotency_key: opts.idempotency_key || `${eventType}:${payload.item_id || 'x'}:${Math.random()}`,
    payload,
    schema_version: opts.schema_version || '1',
    ...opts,
  };
}

/**
 * Crea un evento de inventario received.
 * @param {Object} opts - Opciones del evento
 * @returns {Object} Objeto de evento received
 */
export function makeReceivedEvent(opts = {}) {
  const payload = {
    item_id: opts.item_id || 'compost-A',
    delta: opts.delta ?? 50,
    unit: opts.unit || 'kg',
    source: opts.source || 'compra',
    ...opts.payload,
  };
  return makeInventoryEvent('RECEIVED', payload, opts);
}

/**
 * Crea un evento de inventario consumed.
 * @param {Object} opts - Opciones del evento
 * @returns {Object} Objeto de evento consumed
 */
export function makeConsumedEvent(opts = {}) {
  const payload = {
    item_id: opts.item_id || 'compost-A',
    delta: opts.delta ?? -10,
    unit: opts.unit || 'kg',
    ...opts.payload,
  };
  return makeInventoryEvent('CONSUMED', payload, opts);
}

/**
 * Crea un evento de inventario counted.
 * @param {Object} opts - Opciones del evento
 * @returns {Object} Objeto de evento counted
 */
export function makeCountedEvent(opts = {}) {
  const payload = {
    item_id: opts.item_id || 'compost-A',
    counted_qty: opts.counted_qty ?? 40,
    unit: opts.unit || 'kg',
    notes: opts.notes || '',
    ...opts.payload,
  };
  return makeInventoryEvent('COUNTED', payload, opts);
}

/**
 * Crea datos de especie para tests de catálogo.
 * @param {Object} opts - Opciones de la especie
 * @returns {Object} Objeto de especie
 */
export function makeSpecies(opts = {}) {
  return {
    id: opts.id || 'solanum_lycopersicum',
    common_name: opts.common_name || 'Tomate',
    scientific_name: opts.scientific_name || 'Solanum lycopersicum',
    variety: opts.variety || null,
    category: opts.category || 'hortalizas',
    tier: opts.tier || 'culti-v1',
    sources: opts.sources || ['MADR-2024'],
    ...opts,
  };
}

/**
 * Crea contexto de grounding para respuestas del agente.
 * @param {Object} resolvedEntities - Entidades resueltas
 * @param {Object} opts - Opciones adicionales
 * @returns {Object} Objeto de contexto grounding
 */
export function withGrounding(resolvedEntities = {}, opts = {}) {
  return {
    resolvedEntities: {
      species: resolvedEntities.species || [],
      pests: resolvedEntities.pests || [],
      biopreparados: resolvedEntities.biopreparados || [],
      locations: resolvedEntities.locations || [],
      ...resolvedEntities,
    },
    groundingContext: {
      confidence: opts.confidence || 'medium',
      source_count: opts.source_count || 1,
      has_validation: opts.has_validation || false,
      ...opts.groundingContext,
    },
    ...opts,
  };
}

/**
 * Cara una respuesta del LLM con metadata de grounding.
 * @param {string} text - Texto de la respuesta
 * @param {Object} grounding - Contexto de grounding
 * @returns {Object} Objeto de respuesta con grounding
 */
export function makeLLMResponse(text, grounding = {}) {
  return {
    text,
    ...withGrounding(grounding),
    model_used: 'gemma3:4b',
    latency_ms: 200,
    timestamp: new Date().toISOString(),
  };
}

/**
 * Crea un objeto de reporte con defaults sanos.
 * @param {Object} opts - Opciones del reporte
 * @returns {Object} Objeto de reporte
 */
export function makeReport(opts = {}) {
  return {
    id: opts.id || 'report-1',
    report_type: opts.report_type || 'activity',
    finca_slug: opts.finca_slug || 'guatoc',
    created_at: opts.created_at || new Date().toISOString(),
    created_by: opts.created_by || 'operator-1',
    status: opts.status || 'draft',
    ...opts,
  };
}
