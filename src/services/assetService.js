/**
 * assetService.js — Operaciones directas contra la API JSON:API de FarmOS
 * para entidades no cubiertas por el flujo offline-first (ej. asset--person).
 *
 * Usa fetchFromFarmOS/sendToFarmOS de apiService.js que ya gestionan auth,
 * timeout y propagación de error.status.
 */

import { fetchFromFarmOS, sendToFarmOS } from './apiService';

/**
 * Busca un asset de tipo person por nombre exacto.
 * @param {string} name — nombre a buscar (ej. "Jimmy")
 * @returns {Promise<object|null>} — el asset JSON:API encontrado o null
 */
export const findPersonByName = async (name) => {
  const endpoint =
    '/api/asset/person?' +
    'filter[name][condition][path]=name&' +
    'filter[name][condition][operator]=CONTAINS&' +
    `filter[name][condition][value]=${encodeURIComponent(name)}`;
  const res = await fetchFromFarmOS(endpoint);
  const matches = (res.data || []).filter(
    (p) => (p.attributes?.name || '') === name
  );
  return matches.length > 0 ? matches[0] : null;
};

/**
 * Renombra un asset--person de oldName a newName via PATCH.
 * @param {string} oldName
 * @param {string} newName
 * @returns {Promise<{success: boolean, id?: string, error?: string}>}
 */
export const renameWorker = async (oldName, newName) => {
  try {
    const person = await findPersonByName(oldName);
    if (!person) {
      console.info(`[assetService] No se encontró persona "${oldName}" en FarmOS.`);
      return { success: false, error: 'not_found' };
    }

    await sendToFarmOS(`/api/asset/person/${person.id}`, {
      data: {
        type: 'asset--person',
        id: person.id,
        attributes: { name: newName },
      },
    }, 'PATCH');

    console.info(`[assetService] Persona "${oldName}" renombrada a "${newName}" (${person.id}).`);
    return { success: true, id: person.id };
  } catch (err) {
    console.error('[assetService] Error al renombrar persona:', err);
    return { success: false, error: err.message };
  }
};
