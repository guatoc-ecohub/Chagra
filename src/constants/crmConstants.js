/**
 * crmConstants.js — Constantes para el CRM Agroecológico Mínimo
 * 
 * Define los tipos de contactos/aliados y los tipos de interacciones
 * del sistema, siguiendo el patrón de constantes de Chagra.
 */

/**
 * Tipos de contactos/aliados en el CRM agroecológico
 * @readonly
 * @enum {string}
 */
export const CONTACT_TYPE = Object.freeze({
  CAMPESINO: 'campesino',
  TECNICO: 'tecnico',
  PROVEEDOR: 'proveedor',
});

/**
 * Etiquetas humanas para los tipos de contacto
 */
export const CONTACT_TYPE_LABELS = Object.freeze({
  [CONTACT_TYPE.CAMPESINO]: 'Campesino',
  [CONTACT_TYPE.TECNICO]: 'Técnico',
  [CONTACT_TYPE.PROVEEDOR]: 'Proveedor',
});

/**
 * Tipos de interacciones en el CRM (log--interaction)
 * @readonly
 * @enum {string}
 */
export const INTERACTION_TYPE = Object.freeze({
  VISITA: 'visita',
  LLAMADA: 'llamada',
  MENSAJE: 'mensaje',
  INTERCAMBIO: 'intercambio',
  VENTA: 'venta',
  ASESORIA: 'asesoria',
});

/**
 * Etiquetas humanas para los tipos de interacción
 */
export const INTERACTION_TYPE_LABELS = Object.freeze({
  [INTERACTION_TYPE.VISITA]: 'Visita',
  [INTERACTION_TYPE.LLAMADA]: 'Llamada',
  [INTERACTION_TYPE.MENSAJE]: 'Mensaje',
  [INTERACTION_TYPE.INTERCAMBIO]: 'Intercambio',
  [INTERACTION_TYPE.VENTA]: 'Venta',
  [INTERACTION_TYPE.ASESORIA]: 'Asesoría',
});

/**
 * Estados de un contacto (similar a assetStatuses)
 * @readonly
 * @enum {string}
 */
export const CONTACT_STATUS = Object.freeze({
  ACTIVO: 'active',
  ARCHIVADO: 'archived',
});

/**
 * Configuración visual de estados de contacto
 */
export const CONTACT_STATUS_CONFIG = Object.freeze({
  [CONTACT_STATUS.ACTIVO]: {
    id: 'active',
    label: 'Activo',
    color: '#22c55e',
    textColor: '#064e3b',
  },
  [CONTACT_STATUS.ARCHIVADO]: {
    id: 'archived',
    label: 'Archivado',
    color: '#64748b',
    textColor: '#ffffff',
  },
});
