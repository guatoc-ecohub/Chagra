/**
 * ragWithPhotos — combinación no destructiva de RAG de texto + fotos del operador.
 *
 * Motivación (L1.6, pre-Diana 2026-05-19):
 *   El RAG actual (`ragRetriever.retrieve`) devuelve passages de texto del corpus
 *   `public/cycle-content/*.json`. Pero el operador ya capturó fotos reales de su
 *   finca atadas a `speciesSlug` en IndexedDB store `media_cache` (ver
 *   `photoService.listUserPhotosBySpecies`). Cuando un consumidor del RAG busca
 *   por una species, debería poder mostrar también las fotos que el operador
 *   tomó — no solo texto del corpus.
 *
 * Decisión de diseño — separación de canales:
 *   - NO mezclamos blobs binarios en el corpus BM25 (sería ruidoso, ineficiente,
 *     y el índice se recalcularía mal). El corpus de texto sigue intacto.
 *   - En cambio, hacemos un "join lateral" post-retrieve: para cada species_slug
 *     que apareció en los hits, traemos top-N fotos por separado y devolvemos
 *     un shape compuesto `{ passages, photosBySpecies }`.
 *
 * Convención del campo `species`:
 *   - `retrieve()` produce passages con la prop `species` igual al `species_slug`.
 *   - Documentos sintéticos sin `species_slug` quedan con `species === undefined`
 *     y se omiten del join (defensivo).
 *
 * Caller responsibility:
 *   - Si las photos contienen Blob, el caller debe gestionar `URL.createObjectURL`
 *     y su `revoke` cuando ya no las necesite. Este service NO crea ObjectURLs
 *     (mantiene la separación: dato vs presentación).
 *
 * @module ragWithPhotos
 */

import { retrieve } from './ragRetriever';
import { listUserPhotosBySpecies } from './photoService';

const DEFAULT_PHOTOS_PER_SPECIES = 2;

/**
 * Ordena las fotos por `capturedAt` desc, con fallback a `createdAt` desc.
 * Las fotos sin fecha quedan al final (orden estable).
 *
 * @param {Array<Object>} photos
 * @returns {Array<Object>} nueva lista ordenada (no muta input).
 */
function sortPhotosRecentFirst(photos) {
  return [...photos].sort((a, b) => {
    const aKey = a?.capturedAt || a?.createdAt || '';
    const bKey = b?.capturedAt || b?.createdAt || '';
    // localeCompare maneja ISO-8601 correctamente (orden lexicográfico = cronológico).
    return bKey.localeCompare(aKey);
  });
}

/**
 * Recupera passages del RAG y los enriquece con fotos del operador agrupadas
 * por species_slug. NO modifica el shape de los passages individuales — solo
 * agrega un mapa lateral `photosBySpecies`.
 *
 * Manejo de errores:
 *   - Si `retrieve()` falla, devuelve `{ passages: [], photosBySpecies: {} }`.
 *   - Si `listUserPhotosBySpecies` falla para una species, esa species queda con
 *     `[]` (no rompe las otras). photoService ya hace try/catch interno.
 *
 * @param {string} query — texto libre del usuario / agente.
 * @param {number} [topK=5] — top-K passages a recuperar del corpus de texto.
 * @param {Object} [opts]
 * @param {number} [opts.photosPerSpecies=2] — máximo de fotos por species
 *   incluidas en el resultado. Negativo o 0 desactiva el join de fotos.
 * @returns {Promise<{passages: Array<Object>, photosBySpecies: Object<string, Array<Object>>}>}
 *   `passages` mantiene el shape original de `ragRetriever.retrieve()`.
 *   `photosBySpecies` mapea cada species_slug presente en los hits a un array
 *   de fotos del operador (top-N por `capturedAt` desc). Species sin fotos
 *   quedan con `[]`.
 */
export async function retrieveWithPhotos(query, topK = 5, opts = {}) {
  const { photosPerSpecies = DEFAULT_PHOTOS_PER_SPECIES } = opts;

  let passages;
  try {
    passages = await retrieve(query, topK);
  } catch (err) {
    // Defensivo: retrieve() ya tiene su propio try/catch interno, pero protegemos
    // contra una excepción inesperada (ej. import roto en test).
    console.error('[ragWithPhotos] retrieve failed:', err);
    return { passages: [], photosBySpecies: {} };
  }

  if (!Array.isArray(passages) || passages.length === 0) {
    return { passages: passages || [], photosBySpecies: {} };
  }

  // Si el caller desactivó fotos, devolvemos passages tal cual.
  if (!photosPerSpecies || photosPerSpecies <= 0) {
    return { passages, photosBySpecies: {} };
  }

  // Unique species presentes en los hits, en orden de primera aparición.
  // Preserva el orden estable: si dos passages comparten species, la entrada
  // del slug se crea al ver el primer hit.
  const speciesSlugs = [];
  const seen = new Set();
  for (const p of passages) {
    const slug = p?.species;
    if (typeof slug === 'string' && slug.length > 0 && !seen.has(slug)) {
      seen.add(slug);
      speciesSlugs.push(slug);
    }
  }

  // Fetch en paralelo — IndexedDB es non-blocking y agrupar reduce latencia
  // en mobile rural cuando hay 3-5 species en los hits.
  const photoLists = await Promise.all(
    speciesSlugs.map(async (slug) => {
      try {
        const all = await listUserPhotosBySpecies(slug);
        const sorted = sortPhotosRecentFirst(all || []);
        return [slug, sorted.slice(0, photosPerSpecies)];
      } catch (err) {
        console.error(`[ragWithPhotos] listUserPhotosBySpecies(${slug}) failed:`, err);
        return [slug, []];
      }
    }),
  );

  const photosBySpecies = Object.fromEntries(photoLists);
  return { passages, photosBySpecies };
}

export const RAG_WITH_PHOTOS_SERVICE = {
  retrieveWithPhotos,
};
