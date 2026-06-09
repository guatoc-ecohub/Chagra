/**
 * ChagraAsset / ChagraLog: definiciones canónicas viven en `./asset.js` y `./log.js`.
 * Se re-exportan abajo vía `@typedef {import(...)}` para evitar duplicate identifier (TS2300).
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

/** @typedef {import('./asset.js').Asset} Asset */
/** @typedef {import('./log.js').Log} Log */
/** @typedef {import('./syncEvent.js').SyncEvent} SyncEvent */
/** @typedef {import('./asset.js').Asset} ChagraAsset */
/** @typedef {import('./log.js').Log} ChagraLog */
/** @typedef {import('./farmProcess.js').FarmProcess} FarmProcess */
/** @typedef {import('./farmProcess.js').FarmProcessEvent} FarmProcessEvent */
/** @typedef {import('./farmProcess.js').CultivationProfile} CultivationProfile */
/** @typedef {import('./farmProcess.js').Population} Population */

export {};