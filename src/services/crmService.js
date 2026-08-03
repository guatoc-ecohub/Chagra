/**
 * crmService.js — Servicio del CRM Agroecológico Mínimo
 * 
 * Gestión de contactos/aliados y sus interacciones siguiendo el patrón
 * Asset-flat + Log del ADR-019.
 * 
 * - Los contactos son assets planos (asset--contact)
 * - Las interacciones son logs append-only (log--interaction)
 * - El historial se deriva de los logs, no se almacena
 * 
 * @module services/crmService
 */

import { ulid } from 'ulid';
import { assetCache } from '../db/assetCache.js';
import { logCache } from '../db/logCache.js';
import {
  CONTACT_TYPE,
  CONTACT_STATUS,
  INTERACTION_TYPE,
  INTERACTION_TYPE_LABELS
} from '../constants/crmConstants.js';

/**
 * Crea un nuevo contacto (asset--contact)
 * @param {Object} contactData
 * @param {string} contactData.name
 * @param {string} contactData.contact_type
 * @param {string} [contactData.phone]
 * @param {string} [contactData.email]
 * @param {string} [contactData.location]
 * @param {string} [contactData.vereda]
 * @param {string} [contactData.municipio]
 * @param {string} [contactData.notes]
 * @param {Object} [contactData.metadata]
 * @returns {Promise<Object>} El contacto creado
 */
export const createContact = async (contactData) => {
  const now = Date.now();
  const contact = {
    id: ulid(),
    type: 'asset--contact',
    attributes: {
      name: contactData.name,
      contact_type: contactData.contact_type || CONTACT_TYPE.OTRO,
      status: CONTACT_STATUS.ACTIVO,
      phone: contactData.phone || null,
      email: contactData.email || null,
      location: contactData.location || null,
      vereda: contactData.vereda || null,
      municipio: contactData.municipio || null,
      notes: contactData.notes || null,
      metadata: contactData.metadata || {},
      timestamp: Math.floor(now / 1000),
    },
    relationships: {
      uid: {
        data: {
          id: contactData.uid || null,
          type: 'user',
        },
      },
    },
    _pending: true,
    _pendingReason: 'no_network',
    _createdAt: now,
  };

  await assetCache.put('contact', contact);
  console.info(`[crmService] Contacto creado: ${contact.id} - ${contact.attributes.name}`);
  return contact;
};

/**
 * Actualiza un contacto existente
 * @param {string} contactId
 * @param {Object} updates
 * @returns {Promise<Object>} El contacto actualizado
 */
export const updateContact = async (contactId, updates) => {
  // En un sistema real esto se haría via PATCH a la API
  // Por ahora marcamos el asset como _pending
  const db = await assetCache.openDB();
  
  return new Promise((resolve, reject) => {
    const tx = db.transaction(assetCache.STORES.ASSETS, 'readwrite');
    const store = tx.objectStore(assetCache.STORES.ASSETS);
    const index = store.index('asset_type');
    
    const req = index.getAll(IDBKeyRange.only('contact'));
    req.onsuccess = () => {
      const contacts = req.result || [];
      const contact = contacts.find(c => c.id === contactId);
      
      if (!contact) {
        reject(new Error(`Contacto no encontrado: ${contactId}`));
        return;
      }

      // Actualizar campos permitidos
      const updatedContact = {
        ...contact,
        attributes: {
          ...contact.attributes,
          ...updates,
        },
        _pending: true,
        _pendingReason: 'no_network',
      };

      store.put(updatedContact);
      
      tx.oncomplete = () => {
        console.info(`[crmService] Contacto actualizado: ${contactId}`);
        resolve(updatedContact);
      };
      tx.onerror = () => reject(tx.error);
    };
    req.onerror = () => reject(req.error);
  });
};

/**
 * Obtiene todos los contactos
 * @param {Object} [filters]
 * @param {string} [filters.contact_type]
 * @param {string} [filters.status]
 * @returns {Promise<Array>} Lista de contactos
 */
export const getContacts = async (filters = {}) => {
  const db = await assetCache.openDB();
  
  return new Promise((resolve, reject) => {
    const tx = db.transaction(assetCache.STORES.ASSETS, 'readonly');
    const index = tx.objectStore(assetCache.STORES.ASSETS).index('asset_type');
    const req = index.getAll(IDBKeyRange.only('contact'));
    
    req.onsuccess = () => {
      let contacts = req.result || [];

      // Aplicar filtros
      if (filters.contact_type) {
        contacts = contacts.filter(c => c.attributes?.contact_type === filters.contact_type);
      }
      if (filters.status) {
        contacts = contacts.filter(c => c.attributes?.status === filters.status);
      }

      // Ordenar por nombre
      contacts.sort((a, b) => {
        const nameA = (a.attributes?.name || '').toLowerCase();
        const nameB = (b.attributes?.name || '').toLowerCase();
        return nameA.localeCompare(nameB, 'es');
      });

      resolve(contacts);
    };
    req.onerror = () => reject(req.error);
  });
};

/**
 * Obtiene un contacto por ID
 * @param {string} contactId
 * @returns {Promise<Object|null>} El contacto o null si no existe
 */
export const getContactById = async (contactId) => {
  const contacts = await getContacts();
  return contacts.find(c => c.id === contactId) || null;
};

/**
 * Busca contactos por nombre
 * @param {string} searchTerm
 * @returns {Promise<Array>} Contactos que coinciden
 */
export const searchContacts = async (searchTerm) => {
  const contacts = await getContacts();
  const term = searchTerm.toLowerCase();
  
  return contacts.filter(c => {
    const name = (c.attributes?.name || '').toLowerCase();
    return name.includes(term);
  });
};

/**
 * Registra una interacción con un contacto (log--interaction)
 * @param {Object} interactionData
 * @param {string} interactionData.contact_id
 * @param {string} interactionData.interaction_type
 * @param {string} [interactionData.notes]
 * @param {Object} [interactionData.details]
 * @param {number} [interactionData.timestamp]
 * @returns {Promise<Object>} La interacción creada
 */
export const createInteraction = async (interactionData) => {
  const now = interactionData.timestamp || Date.now();
  
  const interaction = {
    id: ulid(),
    type: 'log--interaction',
    attributes: {
      name: `${INTERACTION_TYPE_LABELS[interactionData.interaction_type] || 'Interacción'} - ${now}`,
      timestamp: Math.floor(now / 1000),
      interaction_type: interactionData.interaction_type,
      status: 'done',
      notes: interactionData.notes || null,
      result: interactionData.result || null,
      details: interactionData.details || {},
    },
    relationships: {
      asset: {
        data: {
          id: interactionData.contact_id,
          type: 'asset--contact',
        },
      },
    },
    _pending: true,
    _pendingReason: 'no_network',
  };

  await logCache.put(interaction);
  console.info(`[crmService] Interacción creada: ${interaction.id} para contacto ${interactionData.contact_id}`);
  return interaction;
};

/**
 * Obtiene el historial de interacciones de un contacto
 * @param {string} contactId
 * @returns {Promise<Array>} Lista de interacciones ordenadas por fecha descendente
 */
export const getContactHistory = async (contactId) => {
  const db = await logCache.openDB();
  
  return new Promise((resolve, reject) => {
    const tx = db.transaction(logCache.STORES.LOGS, 'readonly');
    const index = tx.objectStore(logCache.STORES.LOGS).index('type');
    const req = index.getAll(IDBKeyRange.only('log--interaction'));
    
    req.onsuccess = () => {
      let interactions = req.result || [];
      
      // Filtrar por contacto
      interactions = interactions.filter(log => {
        const assetId = log.relationships?.asset?.data?.id;
        return assetId === contactId;
      });

      // Ordenar por timestamp descendente
      interactions.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));

      resolve(interactions);
    };
    req.onerror = () => reject(req.error);
  });
};

/**
 * Obtiene todas las interacciones (para vista global)
 * @param {Object} [filters]
 * @param {string} [filters.interaction_type]
 * @returns {Promise<Array>} Lista de interacciones
 */
export const getAllInteractions = async (filters = {}) => {
  const db = await logCache.openDB();
  
  return new Promise((resolve, reject) => {
    const tx = db.transaction(logCache.STORES.LOGS, 'readonly');
    const index = tx.objectStore(logCache.STORES.LOGS).index('type');
    const req = index.getAll(IDBKeyRange.only('log--interaction'));
    
    req.onsuccess = () => {
      let interactions = req.result || [];

      // Aplicar filtros
      if (filters.interaction_type) {
        interactions = interactions.filter(i => 
          i.attributes?.interaction_type === filters.interaction_type
        );
      }

      // Ordenar por timestamp descendente
      interactions.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));

      resolve(interactions);
    };
    req.onerror = () => reject(req.error);
  });
};

/**
 * Obtiene un contacto con su historial materializado
 * NO se persiste (ADR-019: cache reconstruible)
 * @param {string} contactId
 * @returns {Promise<Object|null>} Contacto con historial
 */
export const getContactWithHistory = async (contactId) => {
  const contact = await getContactById(contactId);
  if (!contact) return null;

  const historial = await getContactHistory(contactId);

  return {
    contacto: contact,
    historial,
    totalInteracciones: historial.length,
    ultimaInteraccion: historial.length > 0 
      ? historial[0].timestamp 
      : null,
  };
};

/**
 * Obtiene estadísticas de la red (vista read-only)
 * @returns {Promise<Object>} Estadísticas agregadas
 */
export const getNetworkStats = async () => {
  const contacts = await getContacts();
  const interactions = await getAllInteractions();

  // Agrupar contactos por tipo
  const contactsByType = contacts.reduce((acc, c) => {
    const type = c.attributes?.contact_type || 'otro';
    acc[type] = (acc[type] || 0) + 1;
    return acc;
  }, {});

  // Agrupar interacciones por tipo
  const interactionsByType = interactions.reduce((acc, i) => {
    const type = i.attributes?.interaction_type || 'otro';
    acc[type] = (acc[type] || 0) + 1;
    return acc;
  }, {});

  // Contactos más activos (con más interacciones)
  const interactionCountByContact = interactions.reduce((acc, i) => {
    const contactId = i.relationships?.asset?.data?.id;
    if (contactId) {
      acc[contactId] = (acc[contactId] || 0) + 1;
    }
    return acc;
  }, {});

  const topContacts = Object.entries(interactionCountByContact)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([id, count]) => {
      const contact = contacts.find(c => c.id === id);
      return {
        id,
        name: contact?.attributes?.name || 'Desconocido',
        count,
        type: contact?.attributes?.contact_type || 'otro',
      };
    });

  return {
    totalContactos: contacts.length,
    totalInteracciones: interactions.length,
    contactosPorTipo: contactsByType,
    interaccionesPorTipo: interactionsByType,
    contactosMasActivos: topContacts,
  };
};

// Re-exportar constantes para conveniencia
export { CONTACT_TYPE, CONTACT_STATUS, INTERACTION_TYPE, INTERACTION_TYPE_LABELS };
