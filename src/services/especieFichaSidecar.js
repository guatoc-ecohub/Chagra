/**
 * especieFichaSidecar.js — capa VIVA de la Ficha de Especie (#2049).
 *
 * La ficha del catálogo (`buildSpeciesFicha`, offline-first) es el CIMIENTO:
 * identidad + foto + piso térmico + ciclo + asociaciones/sanidad exportadas del
 * grafo. Esta capa la ENRIQUECE en vivo consultando el sidecar agro-mcp (las
 * mismas 30 tools que usa el agente), sin pedir un JSON gigante de 700 especies:
 *
 *   - get_companions          → asocios frescos del grafo AGE (merge en la base)
 *   - get_pest_controllers    → controladores por plaga (merge en sanidad)
 *   - get_species             → confirmación viva del grafo (binomio/viabilidad)
 *   - get_toxicidad           → perfil de toxicidad y seguridad (bloque grounded)
 *   - get_saberes             → usos/saberes tradicionales (bloque, con descargo)
 *   - get_variedades          → variedades/cultivares registrados (bloque)
 *   - get_suelo               → requerimientos de suelo/nutrición (bloque)
 *   - get_multihop_companions → cadenas ecológicas funcionales N-salto (bloque)
 *
 * Reglas (idénticas a las del agente):
 * - Offline-first: si la flag del sidecar está apagada o no hay red, `callTool`
 *   devuelve `null` de inmediato → la sección queda en estado `offline` y la base
 *   del catálogo cubre la ficha. NUNCA se cuelga un skeleton eterno.
 * - Nunca inventa: `found:false` es evidencia útil (deflección honesta). Un error
 *   de red degrada esa sección con gracia; el resto de la ficha sigue viva.
 * - Nunca lanza: todo error se atrapa y se traduce a un estado observable.
 *
 * El componente dispara cada sección por separado para pintar su propio skeleton
 * y no bloquear a las demás (latencia = max, no sum).
 */

import { callTool, isSidecarEnabled } from './sidecarClient.js';
import { buildSpeciesFicha } from './directorioEspecies.js';

/**
 * Secciones de CONOCIMIENTO que solo aporta el grafo vivo (la base offline no
 * las tiene). Cada una consulta una tool y renderiza su `bloque` grounded.
 * El orden es intencional: seguridad (toxicidad) primero.
 */
export const LIVE_KNOWLEDGE_SECTIONS = [
  {
    kind: 'toxicidad',
    tool: 'get_toxicidad',
    title: 'Toxicidad y seguridad',
    accent: 'rose',
    emptyText: 'El grafo no registra alerta de toxicidad para esta especie todavía.',
  },
  {
    kind: 'saberes',
    tool: 'get_saberes',
    title: 'Usos y saberes tradicionales',
    accent: 'indigo',
    emptyText: 'Sin usos tradicionales documentados en el grafo todavía.',
  },
  {
    kind: 'variedades',
    tool: 'get_variedades',
    title: 'Variedades y cultivares',
    accent: 'teal',
    emptyText: 'Sin variedades registradas en el grafo para esta especie todavía.',
  },
  {
    kind: 'suelo',
    tool: 'get_suelo',
    title: 'Suelo y nutrición',
    accent: 'amber',
    emptyText: 'Sin requerimientos de suelo documentados en el grafo todavía.',
  },
  {
    kind: 'multihop',
    tool: 'get_multihop_companions',
    title: 'Cadenas ecológicas (multi-salto)',
    accent: 'emerald',
    emptyText: 'Sin cadenas de asociación multi-salto en el grafo todavía.',
  },
];

/** Args por tool. Se pasan varias claves conocidas para robustez de ruteo. */
function argsFor(tool, speciesId) {
  switch (tool) {
    case 'get_multihop_companions':
      // El agente la invoca con `cultivo`; incluimos alias por robustez.
      return { cultivo: speciesId, species_id: speciesId, species_id_or_name: speciesId };
    case 'get_companions':
      return { species_id: speciesId, species_id_or_name: speciesId };
    default:
      // Tools de conocimiento del grafo (toxicidad/saberes/variedades/suelo).
      return { species_id_or_name: speciesId, species_id: speciesId };
  }
}

/**
 * ¿Tiene sentido intentar el grafo vivo? (flag encendida + navegador online).
 * Si es false, el componente ni siquiera dispara las tools: marca todo `offline`
 * al instante y se apoya en la base del catálogo.
 *
 * @returns {boolean}
 */
export function isLiveGraphAvailable() {
  if (!isSidecarEnabled()) return false;
  if (typeof navigator !== 'undefined' && navigator.onLine === false) return false;
  return true;
}

/**
 * Clasifica el resultado crudo de `callTool` en un estado observable de UI.
 *
 * Contrato de `callTool`:
 *   - `null`                → flag off / offline / no intentado  → 'offline'
 *   - `{ _error, reason }`  → intentado pero falló (red/timeout) → 'error'
 *   - `{ available:false }` → grafo caído (graceful)             → 'error'
 *   - `{ found:false, ... }`→ ausencia GROUNDED (no inventa)     → 'empty'
 *   - resto                 → dato útil                          → 'ready'
 *
 * @param {any} result
 * @returns {{ status: 'offline'|'error'|'empty'|'ready', bloque?: string, nota?: string, raw?: object }}
 */
export function classifySidecarResult(result) {
  if (result == null) return { status: 'offline' };
  if (typeof result !== 'object') return { status: 'error' };
  if (result._error) return { status: 'error', reason: result.reason };
  if (result.available === false) return { status: 'error', reason: 'unavailable' };

  const bloque = typeof result.bloque === 'string' ? result.bloque.trim() : '';
  const nota = typeof result.nota === 'string' ? result.nota.trim() : '';

  if (result.found === false) {
    // La ausencia trae su propia nota anti-invención cuando existe.
    return { status: 'empty', nota: nota || bloque };
  }
  // Sin `bloque` ni señales estructuradas útiles → trátalo como vacío honesto.
  if (!bloque && !hasStructuredPayload(result)) {
    return { status: 'empty', nota };
  }
  return { status: 'ready', bloque, raw: result };
}

/** ¿El resultado trae alguna carga estructurada útil (más allá del bloque)? */
function hasStructuredPayload(result) {
  const keys = ['companions', 'antagonists', 'controls', 'controladores', 'cadenas', 'variedades', 'usos'];
  return keys.some((k) => Array.isArray(result[k]) && result[k].length > 0);
}

/**
 * Dispara UNA sección de conocimiento del grafo. Nunca lanza.
 *
 * @param {string} tool — nombre de la tool del sidecar.
 * @param {string} speciesId
 * @returns {Promise<{ status, bloque?, nota?, raw? }>}
 */
export async function fetchKnowledgeSection(tool, speciesId) {
  if (!tool || !speciesId) return { status: 'error' };
  if (!isLiveGraphAvailable()) return { status: 'offline' };
  let result = null;
  try {
    result = await callTool(tool, argsFor(tool, speciesId));
  } catch (_) {
    return { status: 'error' };
  }
  return classifySidecarResult(result);
}

/* ------------------------------------------------- enriquecimiento estructural */

const norm = (s) =>
  String(s || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();

function humanizeId(id) {
  return String(id || '')
    .split(/[_\s]+/)
    .filter(Boolean)
    .map((w, i) => (i === 0 ? w.charAt(0).toUpperCase() + w.slice(1) : w))
    .join(' ');
}

/** Nombre visible de un nodo-especie del grafo (defensivo ante shapes). */
function graphSpeciesLabel(o) {
  if (!o || typeof o !== 'object') return null;
  const id = o.species_id || o.slug || o.id || '';
  const comun = o.nombre_comun || o.name_es || o.comun || o.name || o.nombre || (id ? humanizeId(id) : '');
  if (!id && !comun) return null;
  return {
    id: id || norm(comun).replace(/\s+/g, '_'),
    comun: comun || humanizeId(id),
    cientifico: o.nombre_cientifico || o.name_la || o.cientifico || '',
    enCatalogo: Boolean(o.en_catalogo ?? o.enCatalogo ?? o.in_catalog ?? false),
    fromGraph: true,
  };
}

/**
 * Normaliza la respuesta de `get_companions` a listas de asocios del grafo vivo.
 *
 * @param {any} res
 * @returns {{ compatibles: object[], antagonistas: object[] } | null}
 */
export function normalizeCompanions(res) {
  if (!res || typeof res !== 'object' || res._error || res.available === false) return null;
  const comp = Array.isArray(res.companions) ? res.companions : [];
  const ant = Array.isArray(res.antagonists) ? res.antagonists : [];
  const compatibles = comp.map(graphSpeciesLabel).filter(Boolean);
  const antagonistas = ant.map(graphSpeciesLabel).filter(Boolean);
  if (compatibles.length === 0 && antagonistas.length === 0) return null;
  return { compatibles, antagonistas };
}

/**
 * Normaliza la respuesta de `get_pest_controllers` a una lista de controladores
 * (defensiva: los items pueden venir como string o como objeto).
 *
 * @param {any} res
 * @returns {string[]}
 */
export function normalizeControllers(res) {
  if (!res || typeof res !== 'object' || res._error || res.available === false) return [];
  const raw = Array.isArray(res.controls) ? res.controls
    : Array.isArray(res.controladores) ? res.controladores
    : [];
  const out = [];
  for (const c of raw) {
    if (typeof c === 'string' && c.trim()) out.push(c.trim());
    else if (c && typeof c === 'object') {
      const n = c.nombre || c.name || c.comun || c.especie || c.controlador || '';
      if (n) out.push(String(n));
    }
  }
  return [...new Set(out)];
}

/**
 * Fusiona los asocios vivos del grafo dentro de la ficha base (dedupe por
 * id/nombre normalizado). Devuelve una NUEVA ficha; no muta la original.
 *
 * @param {object} ficha — salida de buildSpeciesFicha.
 * @param {{ compatibles: object[], antagonistas: object[] } | null} live
 * @returns {object}
 */
export function mergeCompanions(ficha, live) {
  if (!ficha || !live) return ficha;
  const base = ficha.asociaciones || { compatibles: [], antagonistas: [] };
  const merge = (existing, incoming) => {
    const seen = new Set((existing || []).map((x) => norm(x.id) || norm(x.comun)));
    const extra = (incoming || []).filter((x) => {
      const key = norm(x.id) || norm(x.comun);
      if (!key || seen.has(key)) return false;
      seen.add(key);
      return true;
    });
    return [...(existing || []), ...extra];
  };
  return {
    ...ficha,
    grafoVivo: true,
    asociaciones: {
      compatibles: merge(base.compatibles, live.compatibles),
      antagonistas: merge(base.antagonistas, live.antagonistas),
    },
  };
}

/**
 * Fusiona controladores vivos en una amenaza concreta de la ficha (por índice),
 * deduplicando. Devuelve una NUEVA ficha.
 *
 * @param {object} ficha
 * @param {number} amenazaIndex
 * @param {string[]} controladores
 * @returns {object}
 */
export function mergeControllers(ficha, amenazaIndex, controladores) {
  if (!ficha || !Array.isArray(ficha.amenazas) || !controladores?.length) return ficha;
  if (amenazaIndex < 0 || amenazaIndex >= ficha.amenazas.length) return ficha;
  const amenazas = ficha.amenazas.map((a, i) => {
    if (i !== amenazaIndex) return a;
    const prev = Array.isArray(a.controladores) ? a.controladores : [];
    const seen = new Set(prev.map(norm));
    const extra = controladores.filter((c) => c && !seen.has(norm(c)));
    return { ...a, controladores: [...prev, ...extra] };
  });
  return { ...ficha, grafoVivo: true, amenazas };
}

/**
 * Extrae la confirmación viva de `get_species` (binomio + viabilidad) para el
 * sello de estado de la cabecera. Nunca lanza.
 *
 * @param {any} res
 * @returns {{ speciesName?: string, viabilidad?: string } | null}
 */
export function normalizeSpeciesConfirm(res) {
  if (!res || typeof res !== 'object' || res._error || res.available === false) return null;
  const speciesName = res.species_name || res.nombre_cientifico || res.binomio || '';
  const viabilidad = typeof res.viabilidad === 'string' ? res.viabilidad : '';
  if (!speciesName && !viabilidad) return null;
  return { speciesName: speciesName || undefined, viabilidad: viabilidad || undefined };
}

/* ------------------------------------------------------ wrappers de fetch vivo */

/**
 * Confirmación viva de la especie por el grafo (get_species). No lanza; devuelve
 * null si offline/flag off/error.
 * @param {string} speciesId
 * @returns {Promise<{ speciesName?, viabilidad? } | null>}
 */
export async function fetchSpeciesConfirm(speciesId) {
  if (!speciesId || !isLiveGraphAvailable()) return null;
  try {
    const res = await callTool('get_species', {
      query: speciesId, species_id: speciesId, species_id_or_name: speciesId,
    });
    return normalizeSpeciesConfirm(res);
  } catch (_) {
    return null;
  }
}

/**
 * Asocios vivos del grafo (get_companions), ya normalizados. No lanza.
 * @param {string} speciesId
 * @returns {Promise<{ compatibles, antagonistas } | null>}
 */
export async function fetchLiveCompanions(speciesId) {
  if (!speciesId || !isLiveGraphAvailable()) return null;
  try {
    const res = await callTool('get_companions', argsFor('get_companions', speciesId));
    return normalizeCompanions(res);
  } catch (_) {
    return null;
  }
}

/**
 * Controladores biológicos de UNA plaga (get_pest_controllers), normalizados.
 * No lanza.
 * @param {string} pestName — nombre o id de la plaga.
 * @returns {Promise<string[]>}
 */
export async function fetchPestControllers(pestName) {
  if (!pestName || !isLiveGraphAvailable()) return [];
  try {
    const res = await callTool('get_pest_controllers', { pest_id_or_name: pestName });
    return normalizeControllers(res);
  } catch (_) {
    return [];
  }
}

// Re-export de la base offline para que el componente tenga un único import.
export { buildSpeciesFicha };
