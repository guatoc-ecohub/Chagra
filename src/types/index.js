/**
 * @typedef {Object} ChagraAsset
 * @property {string} id - UUID FarmOS
 * @property {'asset--plant' | 'asset--material' | 'asset--land' | 'asset--structure'} type
 * @property {Object} attributes
 * @property {string} attributes.name
 * @property {'active' | 'archived'} attributes.status
 * @property {Object} [attributes.notes]
 * @property {string} [attributes.notes.value]
 * @property {Object} relationships
 * @property {boolean} [_pending] - flag local pre-FarmOS sync
 * @property {'no_network' | 'no_token' | 'sync_error'} [_pendingReason]
 * @property {number} [_createdAt] - timestamp local ms
 */

/**
 * @typedef {Object} ChagraLog
 * @property {string} id
 * @property {'log--seeding' | 'log--input' | 'log--harvest' | 'log--observation'} type
 * @property {Object} attributes
 * @property {string} attributes.name
 * @property {number} attributes.timestamp - unix seconds
 * @property {'pending' | 'done'} attributes.status
 * @property {Object} relationships
 */

/**
 * @typedef {Object} ChagraInventoryEvent  // ADR-027 canonical events
 * @property {string} log_id
 * @property {'received' | 'consumed' | 'transformed' | 'counted' | 'lost' | 'transferred' | 'adjusted' | 'reserved'} event_type
 * @property {string} timestamp - ISO 8601
 * @property {Object} hlc
 * @property {string} hlc.wall
 * @property {number} hlc.counter
 * @property {string} hlc.device_id
 * @property {Object} payload
 * @property {string} idempotency_key
 * @property {string} [prev_log_hash]
 */

/**
 * @typedef {Object} ChagraSpecies  // catalog v3.1+
 * @property {string} slug
 * @property {string} canonical_name_es
 * @property {string} scientific_name
 * @property {string[]} categories - gremios
 * @property {Object} [tracking_mode]
 * @property {string} [tracking_mode.default] - 'individual' | 'aggregate'
 */

/**
 * @typedef {Object} ChagraBiopreparado  // recipe shape
 * @property {string} id
 * @property {string} name
 * @property {Array<{ingredient: string, qty: number, unit: string}>} ingredients
 * @property {string[]} steps
 * @property {string} preparation_time
 * @property {string} expiration
 */

// Export empty object to make this a valid ES module (typedefs are JSDoc-only, no runtime exports)
export {};