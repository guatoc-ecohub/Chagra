/**
 * @typedef {Object} Asset
 * @property {string} id
 * @property {'asset--plant'|'asset--land'|'asset--structure'|'asset--equipment'|'asset--material'|'asset--sensor'|'asset--person'} type
 * @property {Object} attributes
 * @property {string} attributes.name
 * @property {'active'|'archived'} [attributes.status]
 * @property {Object} [attributes.notes]
 * @property {string} [attributes.notes.value]
 * @property {string} [attributes.geometry]
 * @property {number} [attributes.timestamp]
 * @property {Object} [attributes.quantity]
 * @property {number|string} [attributes.quantity.value]
 * @property {string} [attributes.quantity.unit]
 * @property {Object} [relationships]
 * @property {Object} [relationships.parent]
 * @property {Object} [relationships.location]
 * @property {Object} [relationships.owner]
 * @property {Object} [relationships.uid]
 * @property {boolean} [_pending]
 * @property {'no_network'|'no_token'|'sync_error'} [_pendingReason]
 * @property {number} [_createdAt]
 */

export {};