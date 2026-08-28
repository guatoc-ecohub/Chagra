/**
 * Servicio del CRM agroecológico mínimo.
 *
 * Contactos: `asset--person` con `crm_contact_type`.
 * Interacciones: `log--activity` append-only con `crm_interaction_type`.
 * La red es una proyección en memoria de ambos recursos.
 */

import { ulid } from 'ulid';
import { assetCache } from '../db/assetCache.js';
import { logCache } from '../db/logCache.js';
import {
  CONTACT_TYPE,
  CONTACT_STATUS,
  INTERACTION_TYPE,
  INTERACTION_TYPE_LABELS,
} from '../constants/crmConstants.js';

const CONTACT_TYPES = new Set(Object.values(CONTACT_TYPE));
const INTERACTION_TYPES = new Set(Object.values(INTERACTION_TYPE));

const requireText = (value, field) => {
  if (typeof value !== 'string' || !value.trim()) {
    throw new Error(`${field} es obligatorio`);
  }
  return value.trim();
};

const asUnixSeconds = (timestamp) => Math.floor(timestamp / 1000);

const isCrmContact = (asset) => (
  asset?.type === 'asset--person'
  && CONTACT_TYPES.has(asset.attributes?.crm_contact_type)
);

const isCrmInteraction = (log) => (
  log?.type === 'log--activity'
  && INTERACTION_TYPES.has(log.attributes?.crm_interaction_type)
);

const getInteractionType = (interaction) => interaction.attributes.crm_interaction_type;

/** Creates a CRM contact using the existing FarmOS person bundle. */
export const createContact = async (contactData) => {
  const name = requireText(contactData?.name, 'El nombre');
  const contactType = contactData.contact_type || CONTACT_TYPE.CAMPESINO;
  if (!CONTACT_TYPES.has(contactType)) {
    throw new Error('Tipo de contacto no válido');
  }

  const now = Date.now();
  const contact = {
    id: ulid(),
    type: 'asset--person',
    attributes: {
      name,
      crm_contact_type: contactType,
      status: CONTACT_STATUS.ACTIVO,
      phone: contactData.phone || null,
      email: contactData.email || null,
      vereda: contactData.vereda || null,
      municipio: contactData.municipio || null,
      notes: contactData.notes || null,
      timestamp: asUnixSeconds(now),
    },
    relationships: contactData.uid
      ? { uid: { data: { id: contactData.uid, type: 'user' } } }
      : {},
    _pending: true,
    _pendingReason: 'no_network',
    _createdAt: now,
  };

  await assetCache.put('person', contact);
  return contact;
};

/** Updates editable fields without changing the resource identity or CRM role. */
export const updateContact = async (contactId, updates) => {
  const contact = await getContactById(contactId);
  if (!contact) throw new Error(`Contacto no encontrado: ${contactId}`);

  const allowed = ['name', 'phone', 'email', 'vereda', 'municipio', 'notes', 'status'];
  const nextAttributes = { ...contact.attributes };
  for (const key of allowed) {
    if (Object.hasOwn(updates, key)) nextAttributes[key] = updates[key];
  }
  if (!nextAttributes.name?.trim()) throw new Error('El nombre es obligatorio');
  if (!Object.values(CONTACT_STATUS).includes(nextAttributes.status)) {
    throw new Error('Estado de contacto no válido');
  }

  const updatedContact = {
    ...contact,
    attributes: nextAttributes,
    _pending: true,
    _pendingReason: 'no_network',
  };
  await assetCache.put('person', updatedContact);
  return updatedContact;
};

/** Gets CRM-marked people only, preserving the cache tenant filtering. */
export const getContacts = async (filters = {}) => {
  let contacts = (await assetCache.getByType('person')).filter(isCrmContact);
  if (filters.contact_type) {
    contacts = contacts.filter((contact) => contact.attributes.crm_contact_type === filters.contact_type);
  }
  if (filters.status) {
    contacts = contacts.filter((contact) => contact.attributes.status === filters.status);
  }
  return contacts.sort((a, b) => a.attributes.name.localeCompare(b.attributes.name, 'es'));
};

export const getContactById = async (contactId) => {
  const contact = await assetCache.getAsset(contactId);
  return isCrmContact(contact) ? contact : null;
};

export const searchContacts = async (searchTerm) => {
  const term = String(searchTerm || '').trim().toLocaleLowerCase('es');
  if (!term) return getContacts();
  const contacts = await getContacts();
  return contacts.filter((contact) => (
    contact.attributes.name.toLocaleLowerCase('es').includes(term)
    || contact.attributes.vereda?.toLocaleLowerCase('es').includes(term)
    || contact.attributes.municipio?.toLocaleLowerCase('es').includes(term)
  ));
};

/** Records a completed interaction as an immutable activity log. */
export const createInteraction = async (interactionData) => {
  const contactId = requireText(interactionData?.contact_id, 'El contacto');
  const interactionType = interactionData.interaction_type;
  if (!INTERACTION_TYPES.has(interactionType)) {
    throw new Error('Tipo de interacción no válido');
  }

  const timestamp = interactionData.timestamp || Date.now();
  const interaction = {
    id: ulid(),
    type: 'log--activity',
    asset_id: contactId,
    timestamp: asUnixSeconds(timestamp),
    name: INTERACTION_TYPE_LABELS[interactionType],
    status: 'done',
    attributes: {
      name: INTERACTION_TYPE_LABELS[interactionType],
      timestamp: asUnixSeconds(timestamp),
      crm_interaction_type: interactionType,
      status: 'done',
      notes: interactionData.notes || null,
      result: interactionData.result || null,
      details: interactionData.details || {},
    },
    relationships: {
      asset: { data: { id: contactId, type: 'asset--person' } },
    },
    _pending: true,
    _pendingReason: 'no_network',
  };

  await logCache.put(interaction);
  return interaction;
};

export const getContactHistory = async (contactId) => {
  const logs = await logCache.getLogsByAsset(contactId);
  return logs.filter(isCrmInteraction);
};

export const getAllInteractions = async (filters = {}) => {
  let interactions = (await logCache.getByType('log--activity')).filter(isCrmInteraction);
  if (filters.interaction_type) {
    interactions = interactions.filter((interaction) => getInteractionType(interaction) === filters.interaction_type);
  }
  return interactions.sort((a, b) => b.timestamp - a.timestamp);
};

export const getContactWithHistory = async (contactId) => {
  const contacto = await getContactById(contactId);
  if (!contacto) return null;
  const historial = await getContactHistory(contactId);
  return {
    contacto,
    historial,
    totalInteracciones: historial.length,
    ultimaInteraccion: historial[0]?.timestamp || null,
  };
};

/** Builds the read-only network summary from contacts and immutable logs. */
export const getNetworkStats = async () => {
  const [contacts, interactions] = await Promise.all([getContacts(), getAllInteractions()]);
  const contactosPorTipo = {};
  const interaccionesPorTipo = {};
  const interactionCountByContact = {};

  for (const contact of contacts) {
    const type = contact.attributes.crm_contact_type;
    contactosPorTipo[type] = (contactosPorTipo[type] || 0) + 1;
  }
  for (const interaction of interactions) {
    const type = getInteractionType(interaction);
    interaccionesPorTipo[type] = (interaccionesPorTipo[type] || 0) + 1;
    const contactId = interaction.asset_id || interaction.relationships?.asset?.data?.id;
    if (contactId) interactionCountByContact[contactId] = (interactionCountByContact[contactId] || 0) + 1;
  }

  const contactsById = new Map(contacts.map((contact) => [contact.id, contact]));
  const contactosMasActivos = Object.entries(interactionCountByContact)
    .filter(([id]) => contactsById.has(id))
    .sort(([, a], [, b]) => b - a)
    .slice(0, 10)
    .map(([id, count]) => {
      const contact = contactsById.get(id);
      return { id, name: contact.attributes.name, count, type: contact.attributes.crm_contact_type };
    });

  return {
    totalContactos: contacts.length,
    totalInteracciones: interactions.length,
    contactosPorTipo,
    interaccionesPorTipo,
    contactosMasActivos,
  };
};

export { CONTACT_TYPE, CONTACT_STATUS, INTERACTION_TYPE, INTERACTION_TYPE_LABELS };
