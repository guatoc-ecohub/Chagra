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
  COMPRADOR: 'comprador',
  VIVERO: 'vivero',
  OTRO: 'otro',
});

/**
 * Etiquetas humanas para los tipos de contacto
 */
export const CONTACT_TYPE_LABELS = Object.freeze({
  [CONTACT_TYPE.CAMPESINO]: 'Campesino',
  [CONTACT_TYPE.TECNICO]: 'Técnico',
  [CONTACT_TYPE.COMPRADOR]: 'Comprador',
  [CONTACT_TYPE.VIVERO]: 'Vivero',
  [CONTACT_TYPE.OTRO]: 'Otro',
});

/**
 * Tipos de interacciones en el CRM (log--interaction)
 * @readonly
 * @enum {string}
 */
export const INTERACTION_TYPE = Object.freeze({
  VISITA: 'visita',
  INTERCAMBIO_SEMILLA: 'intercambio_semilla',
  VENTA: 'venta',
  ASESORIA: 'asesoria',
  LLAMADA: 'llamada',
  MENSAJE: 'mensaje',
  OTRO: 'otro',
});

/**
 * Etiquetas humanas para los tipos de interacción
 */
export const INTERACTION_TYPE_LABELS = Object.freeze({
  [INTERACTION_TYPE.VISITA]: 'Visita',
  [INTERACTION_TYPE.INTERCAMBIO_SEMILLA]: 'Intercambio de Semilla',
  [INTERACTION_TYPE.VENTA]: 'Venta',
  [INTERACTION_TYPE.ASESORIA]: 'Asesoría',
  [INTERACTION_TYPE.LLAMADA]: 'Llamada',
  [INTERACTION_TYPE.MENSAJE]: 'Mensaje',
  [INTERACTION_TYPE.OTRO]: 'Otro',
});

/**
 * Estados de un contacto (similar a assetStatuses)
 * @readonly
 * @enum {string}
 */
export const CONTACT_STATUS = Object.freeze({
  ACTIVO: 'activo',
  INACTIVO: 'inactivo',
  ARCHIVADO: 'archivado',
});

/**
 * Configuración visual de estados de contacto
 */
export const CONTACT_STATUS_CONFIG = Object.freeze({
  [CONTACT_STATUS.ACTIVO]: {
    id: 'activo',
    label: 'Activo',
    color: '#22c55e',
    textColor: '#064e3b',
  },
  [CONTACT_STATUS.INACTIVO]: {
    id: 'inactivo',
    label: 'Inactivo',
    color: '#f59e0b',
    textColor: '#78350f',
  },
  [CONTACT_STATUS.ARCHIVADO]: {
    id: 'archivado',
    label: 'Archivado',
    color: '#64748b',
    textColor: '#ffffff',
  },
});

/**
 * Tipos de roles en la red campesina
 * @readonly
 * @enum {string}
 */
export const NETWORK_ROLE = Object.freeze({
  PRODUCTOR: 'productor',
  COMPRADOR: 'comprador',
  TECNICO: 'tecnico',
  INTERMEDIARIO: 'intermediario',
});
