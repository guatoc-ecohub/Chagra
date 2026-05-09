/**
 * @typedef {Object} Log
 * @property {string} id
 * @property {'log--seeding'|'log--input'|'log--harvest'|'log--observation'|'log--maintenance'|'log--activity'|'log--task'} type
 * @property {Object} attributes
 * @property {string} [attributes.name]
 * @property {number} attributes.timestamp
 * @property {'pending'|'done'|'held'} [attributes.status]
 * @property {string} [attributes.notes]
 * @property {Object} [attributes.quantity]
 * @property {number|string} [attributes.quantity.value]
 * @property {string} [attributes.quantity.unit]
 * @property {Object} [relationships]
 * @property {Object} [relationships.asset]
 * @property {Object} [relationships.owner]
 * @property {Object} [relationships.uid]
 * @property {Object} [metadata]
 * @property {Object} [metadata.ai]
 * @property {string} [metadata.ai.source]
 * @property {string} [metadata.ai.model_version]
 * @property {number} [metadata.ai.confidence]
 * @property {boolean} [metadata.ai.needs_human_review]
 * @property {string} [metadata.ai.reasoning]
 * @property {boolean} [_pending]
 */

export {};