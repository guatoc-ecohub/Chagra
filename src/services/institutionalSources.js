/**
 * institutionalSources.js — #356 (+ refinamiento 2026-06-03): convierte la cita
 * de una fuente institucional ("Fuente: IDEAM / SIPSA / Agrosavia …") en un link
 * clickeable AL RECURSO CITADO — nunca a la homepage genérica de la institución.
 *
 * Filosofía (regla del operador 2026-06-03):
 *   - Un link de fuente debe llevar al RECURSO citado, no a la landing genérica.
 *     Linkear a la homepage es trazabilidad TEATRAL: el usuario hace clic
 *     esperando el documento y aterriza en una portada que no prueba nada.
 *     Honestidad > trazabilidad teatral.
 *   - Tres tipos de destino por institución (campo `kind` del mapa):
 *       1. 'deeplink' (vía opts.deepLink): URL precisa curada (ficha Agrosavia
 *          con species_id, dataset SIPSA puntual). Gana SIEMPRE.
 *       2. 'section': la URL mapeada YA es la sección específica del tipo de dato
 *          citado (boletín SIPSA de precios, tabla ONI de NOAA-CPC para fase
 *          ENSO). Acerca al usuario al dato → se linkea directo.
 *       3. 'search': la institución no tiene una sección estable por dato, PERO
 *          sí un buscador estable. Si tenemos el CONCEPTO citado (opts.concept),
 *          construimos una URL de BÚSQUEDA de ese concepto. Sin concepto NO
 *          linkeamos (un buscador vacío == homepage disfrazada).
 *   - 'text' (o 'search' sin concepto): no hay forma de acercar al usuario al
 *     dato → NO se emite <a>. La cita se presenta como TEXTO PLANO ("Fuente: X").
 *   - SOLO URLs que resuelven. Cada destino se verificó empíricamente (HTTP 200,
 *     curl 2026-06-03). NO se inventan deep-links.
 *
 * Puro, sin red, sin estado. Seguro para el system prompt y la UX.
 */

/**
 * Catálogo de fuentes institucionales. Cada entrada declara su `kind`:
 *
 *   - kind:'section' + `url`: la URL es la sección del dato citado. Link directo.
 *   - kind:'search'  + `searchUrl(concept)`: builder de URL de búsqueda estable
 *     (verificada HTTP 200). Solo se usa si hay concepto; si no, la cita queda
 *     en texto plano.
 *   - kind:'text': la institución NO tiene sección por dato ni buscador estable
 *     parametrizable → su cita SIEMPRE se presenta como texto plano (sin link).
 *
 * Las claves se matchean por substring normalizado con frontera de palabra. El
 * orden importa: entradas más específicas (SIPSA antes que DANE) van primero.
 *
 * @type {Array<{ keys: string[], kind: 'section'|'search'|'text', url?: string, searchUrl?: (concept: string) => string }>}
 */
const INSTITUTIONS = [
  // SIPSA — sistema de precios del DANE. La URL ES la sección de precios SIPSA
  // (no la home del DANE): acerca al dato de precios citado. → section.
  {
    keys: ['sipsa'],
    kind: 'section',
    url: 'https://www.dane.gov.co/index.php/estadisticas-por-tema/precios-y-costos/sistema-de-informacion-de-precios-sipsa',
  },
  // IDEAM — clima/pronóstico/alertas. El portal de pronóstico es JS-rendered y
  // sus rutas profundas devuelven 404 (verificado); no hay buscador estable
  // parametrizable. Linkear a la home NO acerca al pronóstico citado → texto.
  { keys: ['ideam'], kind: 'text' },
  // Agrosavia — repositorio institucional DSpace con buscador estable por
  // concepto (?query=). Sin concepto, su home/landing del repo no prueba la
  // ficha citada → search.
  {
    keys: ['agrosavia', 'corpoica'],
    kind: 'search',
    searchUrl: (c) => `https://repository.agrosavia.co/search?query=${encodeURIComponent(c)}`,
  },
  // ICA — sanidad vegetal/animal. Buscador estable (?q=). → search.
  {
    keys: ['ica'],
    kind: 'search',
    searchUrl: (c) => `https://www.ica.gov.co/buscador?q=${encodeURIComponent(c)}`,
  },
  // Cenicafé — Centro Nacional de Investigaciones de Café. Buscador WordPress
  // estable (?s=). La home a secas fue justo el caso que reportó el operador. → search.
  {
    keys: ['cenicafe'],
    kind: 'search',
    searchUrl: (c) => `https://www.cenicafe.org/?s=${encodeURIComponent(c)}`,
  },
  // DANE genérico (cita "DANE" sin SIPSA). Sin una sección/búsqueda estable por
  // dato que acerque a la cifra citada → texto plano.
  { keys: ['dane'], kind: 'text' },
  // FAO — citada en biopreparados/manejo agroecológico. Buscador estable (?q=). → search.
  {
    keys: ['fao'],
    kind: 'search',
    searchUrl: (c) => `https://www.fao.org/search/es/?q=${encodeURIComponent(c)}`,
  },
  // NOAA-CPC — fase ENSO (ONI). La URL ES la tabla ONI oficial (el dato citado
  // cuando se menciona la fase del Niño/Niña), no la home del CPC → section.
  {
    keys: ['noaa'],
    kind: 'section',
    url: 'https://www.cpc.ncep.noaa.gov/products/analysis_monitoring/ensostuff/ONI_v5.php',
  },
  // Open-Meteo — pronóstico abierto vía API. No expone buscador público por
  // dato; su web es docs de API, no acerca al pronóstico de la finca → texto.
  { keys: ['open-meteo', 'openmeteo', 'open meteo'], kind: 'text' },
  // INVIMA — autoridad sanitaria (fermentos/alimentos). Buscador estable (?q=). → search.
  {
    keys: ['invima'],
    kind: 'search',
    searchUrl: (c) => `https://www.invima.gov.co/buscar?q=${encodeURIComponent(c)}`,
  },
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
 */
function _matchesKey(text, key) {
  const escaped = key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(`\\b${escaped}\\b`).test(text);
}

/** Encuentra la entrada institucional que matchea la cita, o null. */
function _matchInstitution(source) {
  if (typeof source !== 'string' || !source.trim()) return null;
  const n = _norm(source);
  for (const inst of INSTITUTIONS) {
    if (inst.keys.some((k) => _matchesKey(n, k))) return inst;
  }
  return null;
}

/** Limpia el concepto citado para usarlo como término de búsqueda. */
function _cleanConcept(concept) {
  if (typeof concept !== 'string') return '';
  // Quitamos el ruido típico de un label de fuente y dejamos el término.
  const t = concept.replace(/\s+/g, ' ').trim();
  // Concepto demasiado corto (1 char) o vacío no produce búsqueda útil.
  return t.length >= 2 ? t : '';
}

/**
 * Devuelve la URL al RECURSO citado para una fuente institucional, o null si no
 * hay un recurso al que acercar al usuario (institución 'text', o 'search' sin
 * concepto, o fuente no reconocida). NUNCA devuelve una homepage genérica.
 *
 * Resolución (primero que aplique):
 *   1. opts.deepLink http(s) válido → se usa tal cual (recurso curado preciso).
 *   2. institución 'section' → su URL de sección del dato citado.
 *   3. institución 'search' + opts.concept usable → URL de búsqueda del concepto.
 *   4. en cualquier otro caso → null (la cita irá como texto plano).
 *
 * @param {unknown} source — nombre de la fuente citada (ej. "IDEAM", "Agrosavia / FAO").
 * @param {{ deepLink?: string, concept?: string }} [opts]
 * @returns {string|null}
 */
export function institutionalSourceUrl(source, opts = {}) {
  const deep = opts && typeof opts.deepLink === 'string' ? opts.deepLink.trim() : '';
  if (_isHttpUrl(deep)) return deep;

  const inst = _matchInstitution(source);
  if (!inst) return null;

  if (inst.kind === 'section' && _isHttpUrl(inst.url)) return inst.url;

  if (inst.kind === 'search' && typeof inst.searchUrl === 'function') {
    const concept = _cleanConcept(opts && opts.concept);
    if (!concept) return null; // buscador sin término == homepage disfrazada.
    const url = inst.searchUrl(concept);
    return _isHttpUrl(url) ? url : null;
  }

  // kind 'text' (o 'search' sin concepto): no hay recurso al que acercar.
  return null;
}

/**
 * Resuelve el badge de fuente al máximo nivel de trazabilidad HONESTA disponible:
 *
 *   - `{ fuente, fuente_url }`  → la cita lleva a un recurso (deep-link / sección
 *     / búsqueda del concepto). El badge se renderiza como LINK.
 *   - `{ fuente, fuente_texto: true }` → la fuente es una institución reconocida
 *     pero no hay recurso puntual al que acercar (institución 'text', o 'search'
 *     sin concepto). El badge se renderiza como TEXTO PLANO ("Fuente: X"). NO se
 *     emite homepage.
 *   - `{}` → la fuente no es institucional reconocida (no inventamos nada).
 *
 * @param {unknown} source — nombre de la fuente citada.
 * @param {{ deepLink?: string, concept?: string }} [opts]
 * @returns {{ fuente?: string, fuente_url?: string, fuente_texto?: boolean }}
 */
export function classifySource(source, opts = {}) {
  const deep = opts && typeof opts.deepLink === 'string' ? opts.deepLink.trim() : '';
  const label = typeof source === 'string' ? source.trim() : '';

  // Deep-link curado preciso: linkea aunque la fuente no sea institucional.
  if (_isHttpUrl(deep)) {
    return label ? { fuente: label, fuente_url: deep } : { fuente_url: deep };
  }

  const inst = _matchInstitution(source);
  if (!inst) return {};

  const url = institutionalSourceUrl(source, opts);
  if (url) return { fuente: label, fuente_url: url };

  // Institución reconocida pero sin recurso puntual → texto plano, no homepage.
  return { fuente: label, fuente_texto: true };
}

/**
 * De una cita de fuente (string o array de strings) produce el shape de badge.
 * Toma la PRIMERA entrada que mapee a una institución reconocida (o que tenga un
 * deep-link), conservando su label original como `fuente`.
 *
 * - Si `opts.deepLink` es válido, se usa esa URL.
 * - Si la institución tiene recurso (sección o búsqueda con concepto) → link.
 * - Si la institución NO tiene recurso puntual → `{ fuente, fuente_texto: true }`
 *   (texto plano, sin link a homepage).
 * - Si nada mapea, devuelve {} (sin badge).
 *
 * @param {unknown} sources — string | string[] de fuentes citadas.
 * @param {{ deepLink?: string, concept?: string }} [opts]
 * @returns {{ fuente?: string, fuente_url?: string, fuente_texto?: boolean }}
 */
export function resolveSourceLink(sources, opts = {}) {
  const list = Array.isArray(sources)
    ? sources
    : typeof sources === 'string' && sources.trim()
      ? [sources]
      : [];
  // 1ª pasada: preferimos una fuente que produzca LINK (recurso real).
  let plainFallback = null;
  for (const s of list) {
    if (typeof s !== 'string' || !s.trim()) continue;
    const r = classifySource(s, opts);
    if (r.fuente_url) return r;
    if (r.fuente_texto && !plainFallback) plainFallback = r;
  }
  // 2ª: ninguna dio link, pero alguna institución reconocida → texto plano.
  return plainFallback || {};
}

export default { institutionalSourceUrl, classifySource, resolveSourceLink };
