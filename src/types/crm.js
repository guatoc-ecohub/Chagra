/**
 * Tipos del CRM agroecológico mínimo.
 *
 * No introduce recursos FarmOS nuevos: un contacto es un `asset--person`
 * identificado por `attributes.crm_contact_type`, y una interacción es un
 * `log--activity` identificado por `attributes.crm_interaction_type`.
 * La vista de red se calcula a partir de esas dos colecciones y no se guarda.
 */

/**
 * @typedef {Object} ContactAsset
 * @property {string} id
 * @property {'asset--person'} type
 * @property {Object} attributes
 * @property {string} attributes.name
 * @property {'campesino'|'tecnico'|'proveedor'} attributes.crm_contact_type
 * @property {'active'|'archived'} attributes.status
 * @property {string|null} [attributes.phone]
 * @property {string|null} [attributes.email]
 * @property {string|null} [attributes.vereda]
 * @property {string|null} [attributes.municipio]
 * @property {string|null} [attributes.notes]
 * @property {number} attributes.timestamp Unix seconds
 * @property {Object} [relationships]
 * @property {Object} [relationships.uid]
 * @property {boolean} [_pending]
 */

/**
 * @typedef {Object} InteractionLog
 * @property {string} id
 * @property {'log--activity'} type
 * @property {string} asset_id Contact asset id, denormalized for local queries
 * @property {number} timestamp Unix seconds
 * @property {Object} attributes
 * @property {string} attributes.name
 * @property {'visita'|'llamada'|'mensaje'|'intercambio'|'venta'|'asesoria'} attributes.crm_interaction_type
 * @property {'done'} attributes.status Historical interactions are completed facts
 * @property {string|null} [attributes.notes]
 * @property {string|null} [attributes.result]
 * @property {Object} [attributes.details] Optional, interaction-specific data
 * @property {Object} relationships
 * @property {Object} relationships.asset
 * @property {{id: string, type: 'asset--person'}} relationships.asset.data
 * @property {boolean} [_pending]
 */

/**
 * @typedef {Object} NetworkStats
 * Derived, read-only projection. Never persist this shape in an Asset.
 * @property {number} totalContactos
 * @property {number} totalInteracciones
 * @property {Record<string, number>} contactosPorTipo
 * @property {Record<string, number>} interaccionesPorTipo
 * @property {{id: string, name: string, count: number, type: string}[]} contactosMasActivos
 */

export {};
