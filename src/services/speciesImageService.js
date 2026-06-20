/**
 * speciesImageService, imágenes reales por nombre científico.
 *
 * Fuente primaria: GBIF occurrence media. Fallback: Wikimedia Commons.
 * No inventa URLs y solo acepta licencias abiertas compatibles.
 */

const GBIF_API = 'https://api.gbif.org/v1';
const WIKIMEDIA_API = 'https://commons.wikimedia.org/w/api.php';
const CACHE_NAME = 'chagra-species-images-v1';
const CACHE_TTL_MS = 1000 * 60 * 60 * 24 * 30;
const THROTTLE_MS = 350;

let lastRequestAt = 0;
const pending = new Map();

const OPEN_LICENSE_PATTERNS = [
  /cc0/i,
  /public\s*domain/i,
  /cc[_\-\s]?by/i,
  /cc[_\-\s]?by[_\-\s]?sa/i,
  /creative\s*commons/i,
];

const CLOSED_LICENSE_PATTERNS = [
  /all\s*rights\s*reserved/i,
  /copyright/i,
  /proprietary/i,
  /no\s*known\s*license/i,
];

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function normalizeName(name) {
  return String(name || '').trim().replace(/\s+/g, ' ');
}

function cacheKeyFor(nombreCientifico) {
  return `/__chagra/species-image/${encodeURIComponent(normalizeName(nombreCientifico).toLowerCase())}`;
}

export function isOpenImageLicense(license) {
  const value = String(license || '').trim();
  if (!value) return false;
  if (CLOSED_LICENSE_PATTERNS.some((re) => re.test(value))) return false;
  return OPEN_LICENSE_PATTERNS.some((re) => re.test(value));
}

function firstMediaImage(result) {
  const media = Array.isArray(result?.media) ? result.media : [];
  return media.find((item) => item?.identifier && (!item.type || /stillimage|image/i.test(item.type)));
}

export function parseCatalogImage(species) {
  const image = species?.imagen || species?.image || species?.media?.image || species?.media;
  if (!image) return null;
  const url = typeof image === 'string' ? image : (image.url || image.href || image.src);
  if (!url) return null;
  const license = typeof image === 'object' ? (image.license || image.licencia || 'Catálogo Chagra') : 'Catálogo Chagra';
  return {
    url,
    thumbUrl: typeof image === 'object' ? (image.thumbUrl || image.thumbnail || image.thumb || url) : url,
    license,
    rightsHolder: typeof image === 'object' ? (image.rightsHolder || image.autor || image.credit || 'Catálogo Chagra') : 'Catálogo Chagra',
    source: typeof image === 'object' ? (image.source || image.fuente || 'Catálogo Chagra') : 'Catálogo Chagra',
    sourceUrl: typeof image === 'object' ? (image.sourceUrl || image.url_fuente || url) : url,
  };
}

export function parseGbifImage(occurrence) {
  const media = firstMediaImage(occurrence);
  if (!media) return null;
  const license = media.license || occurrence?.license || '';
  if (!isOpenImageLicense(license)) return null;
  const url = media.identifier || media.references;
  if (!url) return null;
  const rightsHolder = media.rightsHolder || occurrence?.rightsHolder || occurrence?.recordedBy || 'Autor no informado';
  const key = occurrence?.key || occurrence?.gbifID;
  return {
    url,
    thumbUrl: media.identifier || url,
    license,
    rightsHolder,
    source: 'GBIF',
    sourceUrl: key ? `https://www.gbif.org/occurrence/${key}` : 'https://www.gbif.org/',
  };
}

export function parseGbifOccurrenceSearch(payload) {
  const results = Array.isArray(payload?.results) ? payload.results : [];
  for (const occurrence of results) {
    const parsed = parseGbifImage(occurrence);
    if (parsed) return parsed;
  }
  return null;
}

function normalizeCommonsLicense(extmetadata = {}) {
  return (
    extmetadata.LicenseShortName?.value ||
    extmetadata.UsageTerms?.value ||
    extmetadata.License?.value ||
    ''
  );
}

function stripHtml(value) {
  // Saneo completo: una sola pasada de /<[^>]*>/ se puede burlar con tags
  // anidados (ej. "<scr<script>ipt>" → "<script>"). Iteramos hasta que no
  // queden tags (CodeQL js/incomplete-multi-character-sanitization).
  let s = String(value || '');
  let prev;
  do {
    prev = s;
    s = s.replace(/<[^>]*>/g, '');
  } while (s !== prev);
  return s.replace(/\s+/g, ' ').trim();
}

export function parseWikimediaImage(payload) {
  const pages = payload?.query?.pages || {};
  for (const page of Object.values(pages)) {
    const imageInfo = page?.imageinfo?.[0];
    if (!imageInfo?.url) continue;
    const metadata = imageInfo.extmetadata || {};
    const license = normalizeCommonsLicense(metadata);
    if (!isOpenImageLicense(license)) continue;
    const rightsHolder = stripHtml(
      metadata.Artist?.value ||
      metadata.Credit?.value ||
      metadata.Attribution?.value ||
      'Wikimedia Commons'
    );
    return {
      url: imageInfo.url,
      thumbUrl: imageInfo.thumburl || imageInfo.url,
      license,
      rightsHolder,
      source: 'Wikimedia Commons',
      sourceUrl: imageInfo.descriptionurl || `https://commons.wikimedia.org/wiki/${encodeURIComponent(page.title || '')}`,
    };
  }
  return null;
}

async function throttledFetchJson(url) {
  const wait = Math.max(0, THROTTLE_MS - (Date.now() - lastRequestAt));
  if (wait > 0) await sleep(wait);
  lastRequestAt = Date.now();
  const response = await fetch(url, { headers: { Accept: 'application/json' } });
  if (!response.ok) throw new Error(`species_image_http_${response.status}`);
  return response.json();
}

async function readCached(nombreCientifico) {
  if (typeof caches === 'undefined') return null;
  try {
    const cache = await caches.open(CACHE_NAME);
    const response = await cache.match(cacheKeyFor(nombreCientifico));
    if (!response) return null;
    const cached = await response.json();
    if (!cached?.storedAt || Date.now() - cached.storedAt > CACHE_TTL_MS) return null;
    return cached.value || null;
  } catch (err) {
    console.warn('[speciesImageService] cache read failed:', err?.message || err);
    return null;
  }
}

async function writeCached(nombreCientifico, value) {
  if (typeof caches === 'undefined') return;
  try {
    const cache = await caches.open(CACHE_NAME);
    const body = JSON.stringify({ storedAt: Date.now(), value });
    await cache.put(cacheKeyFor(nombreCientifico), new Response(body, {
      headers: { 'Content-Type': 'application/json' },
    }));
  } catch (err) {
    console.warn('[speciesImageService] cache write failed:', err?.message || err);
  }
}

async function cacheSpeciesImageAsset(image) {
  if (typeof caches === 'undefined' || !image?.thumbUrl) return;
  try {
    const cache = await caches.open(CACHE_NAME);
    const request = new Request(image.thumbUrl, { mode: 'no-cors' });
    const cached = await cache.match(request);
    if (cached) return;
    const response = await fetch(request);
    if (response && (response.ok || response.type === 'opaque')) {
      await cache.put(request, response.clone());
    }
  } catch (err) {
    console.warn('[speciesImageService] image asset cache failed:', err?.message || err);
  }
}

async function fetchFromGbif(nombreCientifico) {
  const matchUrl = `${GBIF_API}/species/match?name=${encodeURIComponent(nombreCientifico)}`;
  const match = await throttledFetchJson(matchUrl);
  const usageKey = match?.usageKey;
  if (!usageKey) return null;

  const occurrenceUrl = `${GBIF_API}/occurrence/search?taxonKey=${encodeURIComponent(usageKey)}&mediaType=StillImage&limit=5`;
  const occurrences = await throttledFetchJson(occurrenceUrl);
  return parseGbifOccurrenceSearch(occurrences);
}

async function fetchFromWikimedia(nombreCientifico) {
  const params = new URLSearchParams({
    action: 'query',
    format: 'json',
    origin: '*',
    generator: 'search',
    gsrnamespace: '6',
    gsrlimit: '10',
    gsrsearch: `"${nombreCientifico}" filetype:bitmap`,
    prop: 'imageinfo',
    iiprop: 'url|extmetadata|mime',
    iiurlwidth: '900',
  });
  const payload = await throttledFetchJson(`${WIKIMEDIA_API}?${params.toString()}`);
  return parseWikimediaImage(payload);
}

async function resolveSpeciesImage(nombreCientifico) {
  const cached = await readCached(nombreCientifico);
  if (cached) return cached;

  let value = null;
  try {
    value = await fetchFromGbif(nombreCientifico);
  } catch (err) {
    console.warn('[speciesImageService] GBIF image lookup failed:', err?.message || err);
  }

  if (!value) {
    try {
      value = await fetchFromWikimedia(nombreCientifico);
    } catch (err) {
      console.warn('[speciesImageService] Wikimedia image lookup failed:', err?.message || err);
    }
  }

  await writeCached(nombreCientifico, value);
  await cacheSpeciesImageAsset(value);
  return value;
}

export async function getSpeciesImage(nombreCientifico) {
  const name = normalizeName(nombreCientifico);
  if (!name) return null;
  const key = name.toLowerCase();
  if (!pending.has(key)) {
    pending.set(key, resolveSpeciesImage(name).finally(() => pending.delete(key)));
  }
  return pending.get(key);
}

export const __TEST__ = {
  cacheKeyFor,
  normalizeName,
  parseCatalogImage,
  parseGbifImage,
  parseGbifOccurrenceSearch,
  parseWikimediaImage,
};
