/**
 * crm/types.js — Tipos para el CRM Agroecológico Mínimo
 * 
 * Extiende el modelo Asset-flat + Log del ADR-019 para soportar:
 * - Contactos/aliados (asset--contact)
 * - Interacciones (log--interaction)
 * 
 * El modelo respeta las reglas del ADR-019:
 * - Los contactos son assets planos (no anidados)
 * - Las interacciones son logs append-only (inmutables)
 * - No hay vistas derivadas almacenadas como campo de Asset
 */

/**
 * @typedef {Object} ContactAsset
 * Asset de tipo contacto/aliado para el CRM agroecológico.
 * Extiende el Asset base con atributos específicos de contactos.
 *
 * @property {string} id
 * @property {'asset--contact'} type
 * @property {Object} attributes
 * @property {string} attributes.name
 * @property {'campesino'|'tecnico'|'comprador'|'vivero'|'otro'} attributes.contact_type
 * @property {'activo'|'inactivo'|'archivado'} [attributes.status]
 * @property {string} [attributes.phone]
 * @property {string} [attributes.email]
 * @property {string} [attributes.location]
 * @property {string} [attributes.vereda]
 * @property {string} [attributes.municipio]
 * @property {string} [attributes.notes]
 * @property {Object} [attributes.metadata]
 * @property {string[]} [attributes.metadata.cultivos]
 * @property {string[]} [attributes.metadata.especialidades]
 * @property {Object} [attributes.coordinates]
 * @property {number} [attributes.coordinates.lat]
 * @property {number} [attributes.coordinates.lng]
 * @property {number} [attributes.timestamp]
 * @property {Object} [relationships]
 * @property {Object} [relationships.owner]
 * @property {Object} [relationships.uid]
 * @property {boolean} [_pending]
 * @property {'no_network'|'no_token'|'sync_error'} [_pendingReason]
 * @property {number} [_createdAt]
 */

/**
 * @typedef {Object} InteractionLog
 * Log de tipo interacción para el CRM agroecológico.
 * Extiende el Log base con atributos específicos de interacciones.
 *
 * @property {string} id
 * @property {'log--interaction'} type
 * @property {Object} attributes
 * @property {string} [attributes.name]
 * @property {number} attributes.timestamp
 * @property {'visita'|'intercambio_semilla'|'venta'|'asesoria'|'llamada'|'mensaje'|'otro'} attributes.interaction_type
 * @property {'pending'|'done'|'held'} [attributes.status]
 * @property {string} [attributes.notes]
 * @property {string} [attributes.result]
 * @property {Object} [attributes.details]
 * @property {Object} [attributes.details.intercambio]
 * @property {string} [attributes.details.intercambio.especie]
 * @property {number} [attributes.details.intercambio.cantidad]
 * @property {string} [attributes.details.intercambio.unidad]
 * @property {Object} [attributes.details.venta]
 * @property {string} [attributes.details.venta.producto]
 * @property {number} [attributes.details.venta.cantidad]
 * @property {string} [attributes.details.venta.unidad]
 * @property {number} [attributes.details.venta.valor]
 * @property {Object} [attributes.quantity]
 * @property {number|string} [attributes.quantity.value]
 * @property {string} [attributes.quantity.unit]
 * @property {Object} [relationships]
 * @property {Object} [relationships.contact]
 * @property {Object} [relationships.owner]
 * @property {Object} [relationships.uid]
 * @property {boolean} [_pending]
 */

/**
 * @typedef {Object} ContactoConHistorial
 * Un contacto con su historial de interacciones materializado.
 * NO se persiste (ADR-019: esto es cache reconstruible desde logs).
 *
 * @property {ContactAsset} contacto
 * @property {InteractionLog[]} historial
 * @property {number} totalInteracciones
 * @property {number} ultimaInteraccion
 */

export {};
