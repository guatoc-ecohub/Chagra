/**
 * assetService.ts — Operaciones directas contra la API JSON:API de FarmOS
 * para entidades no cubiertas por el flujo offline-first (ej. asset--person).
 *
 * Usa fetchFromFarmOS/sendToFarmOS de apiService.ts que ya gestionan auth,
 * timeout y propagación de error.status.
 */

import { fetchFromFarmOS, sendToFarmOS } from './apiService';

interface PersonResource {
  id: string;
  type?: string;
  attributes?: { name?: string; [key: string]: unknown };
}

interface JsonApiListResponse {
  data?: PersonResource[];
}

interface JsonApiSingleResponse {
  data?: PersonResource;
}

interface RenameResult {
  success: boolean;
  id?: string;
  error?: string;
}

/**
 * Busca un asset de tipo person por nombre exacto.
 */
export const findPersonByName = async (name: string): Promise<PersonResource | null> => {
  const endpoint =
    '/api/asset/person?' +
    'filter[name][condition][path]=name&' +
    'filter[name][condition][operator]=CONTAINS&' +
    `filter[name][condition][value]=${encodeURIComponent(name)}`;
  const res = (await fetchFromFarmOS(endpoint)) as JsonApiListResponse;
  const matches = (res.data || []).filter((p) => (p.attributes?.name || '') === name);
  return matches.length > 0 ? matches[0]! : null;
};

/**
 * Renombra un asset--person de oldName a newName via PATCH.
 */
export const renameWorker = async (oldName: string, newName: string): Promise<RenameResult> => {
  try {
    const person = await findPersonByName(oldName);
    if (!person) {
      console.info(`[assetService] No se encontró persona "${oldName}" en FarmOS.`);
      return { success: false, error: 'not_found' };
    }

    (await sendToFarmOS(
      `/api/asset/person/${person.id}`,
      {
        data: {
          type: 'asset--person',
          id: person.id,
          attributes: { name: newName },
        },
      },
      'PATCH'
    )) as JsonApiSingleResponse;

    console.info(`[assetService] Persona "${oldName}" renombrada a "${newName}" (${person.id}).`);
    return { success: true, id: person.id };
  } catch (err) {
    console.error('[assetService] Error al renombrar persona:', err);
    return { success: false, error: (err as Error).message };
  }
};
