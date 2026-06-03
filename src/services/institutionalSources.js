/**
 * institutionalSources.js — #356: convierte la cita de una fuente institucional
 * ("Fuente: IDEAM / SIPSA / Agrosavia …") en un link clickeable a la página
 * institucional REAL.
 *
 * Filosofía:
 *   - SOLO URLs que resuelven. Cada destino se verificó empíricamente (HTTP 200)
 *     contra la web pública de la institución (curl, 2026-06-03). NO se inventan
 *     deep-links: si una institución no tiene una página pública estable para el
 *     dato exacto, se linkea a su landing/sección oficial.
 *   - El DATO no cambia: esto es presentación (la cita ya existía en texto). Si
 *     la fuente NO es una institución reconocida, se devuelve null y el ChatBubble
 *     simplemente no renderiza el link (degrada con gracia).
 *   - Deep-link gana: si el grounding trae una URL precisa (p.ej. la ficha de una
 *     especie en el repositorio Agrosavia, vía el consolidador de URLs), esa URL
 *     manda sobre la página institucional genérica.
 *
 * Puro, sin red, sin estado. Seguro para el system prompt y la UX.
 */

/**
 * Catálogo de fuentes institucionales → URL pública verificada (HTTP 200).
 * Las claves se matchean por substring normalizado (sin tildes, minúsculas), así
 * una cita compuesta ("NOAA CPC · IDEAM", "Agrosavia / FAO") resuelve a la
 * primera institución reconocida. El orden importa: las entradas más específicas
 * (SIPSA antes que DANE) van primero.
 *
 * @type {Array<{ keys: string[], url: string }>}
 */
const INSTITUTIONS = [
  // SIPSA es el sistema de precios del DANE → su boletín vive en dane.gov.co.
  {
    keys: ['sipsa'],
    url: 'https://www.dane.gov.co/index.php/estadisticas-por-tema/precios-y-costos/sistema-de-informacion-de-precios-sipsa',
  },
  // IDEAM — clima/pronóstico/alertas. El portal de pronóstico es JS-rendered;
  // la landing institucional es el destino estable que resuelve.
  { keys: ['ideam'], url: 'https://www.ideam.gov.co' },
  // Agrosavia — repositorio institucional (fichas técnicas de especies/biopreparados).
  { keys: ['agrosavia', 'corpoica'], url: 'https://repository.agrosavia.co/' },
  // ICA — Instituto Colombiano Agropecuario (sanidad vegetal/animal).
  { keys: ['ica'], url: 'https://www.ica.gov.co/' },
  // Cenicafé — Centro Nacional de Investigaciones de Café.
  { keys: ['cenicafe'], url: 'https://www.cenicafe.org/' },
  // DANE genérico (si la cita es "DANE" sin SIPSA).
  { keys: ['dane'], url: 'https://www.dane.gov.co/' },
  // FAO — citada en biopreparados/manejo agroecológico.
  { keys: ['fao'], url: 'https://www.fao.org/home/en' },
  // NOAA — fase ENSO (ONI). CPC.
  { keys: ['noaa'], url: 'https://www.cpc.ncep.noaa.gov/' },
  // Open-Meteo — pronóstico abierto usado por el snapshot de clima.
  { keys: ['open-meteo', 'openmeteo', 'open meteo'], url: 'https://open-meteo.com/' },
  // INVIMA — autoridad sanitaria (fermentos/alimentos).
  { keys: ['invima'], url: 'https://www.invima.gov.co/' },
];

/** Normaliza para matchear: minúsculas, sin tildes, espacios colapsados. */
function _norm(s) {
  return String(s)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/** true si la URL es un http(s) seguro (no javascript:, data:, etc.). */
function _isHttpUrl(u) {
  return typeof u === 'string' && /^https?:\/\//i.test(u.trim());
}

/**
 * Matchea una key contra el texto normalizado con frontera de palabra, para que
 * keys cortas no peguen dentro de otra (p.ej. "ica" NO debe matchear "cenicafe").
 * Escapa la key y usa \b alrededor; "open-meteo" y compañía siguen funcionando
 * porque el guion es separador de palabra.
 */
function _matchesKey(text, key) {
  const escaped = key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(`\\b${escaped}\\b`).test(text);
}

/**
 * Devuelve la URL institucional para una cita de fuente, o null si no se
 * reconoce ninguna institución. Si `opts.deepLink` es un http(s) válido, gana
 * sobre la página institucional (p.ej. ficha de especie Agrosavia con species_id).
 *
 * @param {unknown} source — nombre de la fuente citada (ej. "IDEAM", "Agrosavia / FAO").
 * @param {{ deepLink?: string }} [opts]
 * @returns {string|null}
 */
export function institutionalSourceUrl(source, opts = {}) {
  const deep = opts && typeof opts.deepLink === 'string' ? opts.deepLink.trim() : '';
  if (_isHttpUrl(deep)) return deep;

  if (typeof source !== 'string' || !source.trim()) return null;
  const n = _norm(source);
  for (const inst of INSTITUTIONS) {
    if (inst.keys.some((k) => _matchesKey(n, k))) return inst.url;
  }
  return null;
}

/**
 * De una cita de fuente (string o array de strings) produce el shape de badge
 * `{ fuente, fuente_url }` que el ChatBubble (FuenteBadge) renderiza como link.
 *
 * - Si es array, toma la PRIMERA entrada que mapee a una institución reconocida,
 *   conservando su label original como `fuente`.
 * - Si `opts.deepLink` es válido, se usa esa URL (la institución sigue dando el label).
 * - Si nada mapea, devuelve {} (sin link — la UX no muestra badge).
 *
 * @param {unknown} sources — string | string[] de fuentes citadas.
 * @param {{ deepLink?: string }} [opts]
 * @returns {{ fuente?: string, fuente_url?: string }}
 */
export function resolveSourceLink(sources, opts = {}) {
  const list = Array.isArray(sources)
    ? sources
    : typeof sources === 'string' && sources.trim()
      ? [sources]
      : [];
  for (const s of list) {
    if (typeof s !== 'string' || !s.trim()) continue;
    const url = institutionalSourceUrl(s, opts);
    if (url) return { fuente: s.trim(), fuente_url: url };
  }
  return {};
}

export default { institutionalSourceUrl, resolveSourceLink };
