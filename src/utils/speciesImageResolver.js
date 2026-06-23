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

// Ruido taxonómico que NO forma parte del species_id (rangos infraespecíficos
// y conectores de autoría). El epíteto de autor (L., Cav., Kunth, '(Duchesne…)')
// se descarta por la lógica de candidatos: el species_id del JSON es
// género_especie[_infra/cultivar], sin autor.
const TAXON_NOISE = new Set([
  'var', 'subsp', 'ssp', 'f', 'cv', 'cultivar', 'sp', 'spp', 'ex', 'aff', 'cf',
]);

/**
 * Genera species_id candidatos para un nombre científico normalizado, de MÁS
 * específico a MENOS. El JSON indexa por species_id SIN autor (p.ej.
 * `solanum_tuberosum`), pero los nombres del catálogo traen autor
 * ("Solanum tuberosum L." → `solanum_tuberosum_l`). Probar el binomio
 * (género_especie) rescata esos casos; el trinomio cubre cultivares/infra.
 */
export function buildSpeciesIdCandidates(normalized) {
  const tokens = String(normalized || '').split('_').filter(Boolean);
  if (tokens.length < 2) return tokens.length === 1 ? [tokens[0]] : [];
  const clean = tokens.filter((t) => !TAXON_NOISE.has(t));
  const out = [];
  const push = (arr) => {
    const id = arr.join('_');
    if (id && !out.includes(id)) out.push(id);
  };
  push(tokens); // 1) completo tal cual (cultivar exacto si no hay autor)
  push(clean); // 2) sin rangos infra (var/subsp…)
  if (clean.length >= 3) push(clean.slice(0, 3)); // 3) género_especie_infra
  if (clean.length >= 2) push(clean.slice(0, 2)); // 4) binomio género_especie
  return out;
}

/**
 * Deriva la variante LIGERA (`medium`, ~150–250 KB) de una foto de iNaturalist
 * cuyo `image_url` apunta a la variante `original` (1.7–3.5 MB).
 *
 * Bug #61 (ficha de especie, foto no carga): el 85% del catálogo (535/626)
 * referencia `…/photos/<id>/original.jpg`. En señal móvil rural —el usuario
 * real— esos varios MB por ficha frecuentemente se cuelgan o nunca terminan
 * de bajar, dejando la foto en blanco o rota. La variante `medium` de
 * iNaturalist es 10–20× más liviana y visualmente idéntica al tamaño en que
 * la ficha la muestra (80 px / 176 px de alto). Servimos `medium` como
 * `thumbUrl` (el que el <img> prefiere) y conservamos `original` como `url`
 * de respaldo. Para URLs que no son de iNaturalist devolvemos el original
 * sin tocar.
 *
 * iNaturalist sirve las variantes en la MISMA ruta: solo cambia el último
 * segmento del path (original|large|medium|small|square). No tocamos query
 * params ni el host.
 */
function inaturalistThumb(imageUrl) {
  const url = String(imageUrl || '');
  if (!/inaturalist/i.test(url)) return url;
  return url.replace(
    /\/photos\/(\d+)\/(?:original|large)(\.[a-z]+)(\?|$)/i,
    '/photos/$1/medium$2$3',
  );
}

/**
 * Mapea una entrada del JSON al shape de imagen consumido por los componentes.
 */
function toImageResult(entry) {
  return {
    url: entry.image_url,
    thumbUrl: inaturalistThumb(entry.image_url),
    license: formatLicense(entry.license),
    rightsHolder: entry.attribution || 'Autor no informado',
    source: 'iNaturalist',
    sourceUrl: entry.image_url,
  };
}

/**
 * Devuelve el binomio `genero_especie` de una lista de candidatos (el más
 * corto que tenga exactamente 2 tokens), o null si no hay.
 */
function binomioOf(candidates) {
  for (const c of candidates) {
    if (c.split('_').filter(Boolean).length === 2) return c;
  }
  return null;
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

  // 1) Probar species_id candidatos de más a menos específico. El binomio
  //    rescata los nombres con autor ("…_l", "…_kunth") que el match exacto
  //    no encuentra.
  const candidates = buildSpeciesIdCandidates(normalized);
  for (const candidate of candidates) {
    const entry = index.get(candidate);
    if (entry) return toImageResult(entry);
  }

  // 2) Fallback por PREFIJO de binomio (bug 2026-06-21, fresa): el catálogo
  //    trae el binomio base ("Fragaria × ananassa" → `fragaria_ananassa`)
  //    pero el JSON solo indexa el cultivar (`fragaria_ananassa_monterrey`).
  //    Tomar la primera entrada cuyo species_id EMPIECE por `genero_especie_`.
  //    Determinista: ordenamos por species_id para no depender del orden de
  //    inserción del Map.
  const binomio = binomioOf(candidates);
  if (binomio) {
    const prefix = `${binomio}_`;
    let bestId = null;
    for (const id of index.keys()) {
      if (id.startsWith(prefix) && (bestId === null || id < bestId)) {
        bestId = id;
      }
    }
    if (bestId) return toImageResult(index.get(bestId));
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
  inaturalistThumb,
};
