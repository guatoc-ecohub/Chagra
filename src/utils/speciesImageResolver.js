/**
 * speciesImageResolver — Resuelve imágenes de especies desde el JSON local.
 *
 * Este módulo carga el JSON species-images.json que contiene las URLs
 * de imágenes licencia abierta generadas por OpenCode. Se integra con
 * speciesImageService para evitar llamadas externas cuando tenemos una
 * imagen local disponible.
 */

let imageCache = null;
let loadPromise = null;

/**
 * Normaliza un nombre científico para matching contra species_id.
 * Convierte "Fragaria ananassa" → "fragaria_ananassa"
 */
function normalizeScientificName(name) {
  if (!name || typeof name !== 'string') return '';
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/\s+/g, '_')
    .replace(/[^a-z0-9_]/g, '')
    .trim();
}

/**
 * Carga el JSON de imágenes del catálogo local.
 */
async function loadSpeciesImages() {
  if (imageCache) return imageCache;
  if (loadPromise) return loadPromise;

  loadPromise = fetch('/species-images.json')
    .then((res) => {
      if (!res.ok) throw new Error(`species-images.json fetch failed: ${res.status}`);
      return res.json();
    })
    .then((data) => {
      if (!data || !Array.isArray(data.species)) {
        throw new Error('Invalid species-images.json structure');
      }
      // Crear índice por species_id para búsqueda O(1)
      const index = new Map();
      for (const sp of data.species) {
        if (sp?.species_id && sp?.image_url) {
          index.set(sp.species_id, sp);
        }
      }
      imageCache = index;
      return index;
    })
    .catch((err) => {
      console.warn('[speciesImageResolver] Failed to load local images:', err?.message || err);
      imageCache = new Map(); // Cache vacío para no reintentar
      return imageCache;
    });

  return loadPromise;
}

/**
 * Busca una imagen por nombre científico en el JSON local.
 * Retorna null si no hay imagen disponible.
 */
export async function findLocalImage(scientificName) {
  const normalized = normalizeScientificName(scientificName);
  if (!normalized) return null;

  const index = await loadSpeciesImages();
  if (!index) return null;

  // 1. Búsqueda exacta por species_id normalizado
  if (index.has(normalized)) {
    const entry = index.get(normalized);
    return {
      url: entry.image_url,
      thumbUrl: entry.image_url,
      license: formatLicense(entry.license),
      rightsHolder: entry.attribution || 'Autor no informado',
      source: 'iNaturalist',
      sourceUrl: entry.image_url,
    };
  }

  // 2. Si el nombre contiene espacios, intentar con guion bajo
  if (normalized.includes('_')) {
    // Ya lo intentamos con guion bajo, no hay más variantes
    return null;
  }

  // 3. Si el nombre tiene espacios, reemplazar por guiones y reintentar
  const withUnderscores = normalized.replace(/\s+/g, '_');
  if (withUnderscores !== normalized && index.has(withUnderscores)) {
    const entry = index.get(withUnderscores);
    return {
      url: entry.image_url,
      thumbUrl: entry.image_url,
      license: formatLicense(entry.license),
      rightsHolder: entry.attribution || 'Autor no informado',
      source: 'iNaturalist',
      sourceUrl: entry.image_url,
    };
  }

  return null;
}

/**
 * Formatea una licencia para display consistente.
 */
function formatLicense(license) {
  if (!license) return 'CC-BY';
  const s = String(license).toLowerCase();
  if (s.includes('cc0')) return 'CC0';
  if (s.includes('by')) return 'CC-BY';
  if (s.includes('by-sa')) return 'CC-BY-SA';
  if (s.includes('by-nc')) return 'CC-BY-NC';
  return license;
}

/**
 * Invalida el cache (útil para tests).
 */
export function __resetSpeciesImageCache() {
  imageCache = null;
  loadPromise = null;
}

export const __TEST__ = {
  normalizeScientificName,
  formatLicense,
};
