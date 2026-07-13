/**
 * directorioEspecies.js — orquestación de datos del Directorio de Especies.
 *
 * Explorador visual del catálogo: dado un nombre libre ("frailejón",
 * "mandarina", "frijol cargamanto"), resuelve la(s) especie(s) del catálogo y
 * construye una FICHA grounded uniendo TODAS las fuentes locales/offline que ya
 * existen en el cliente — sin reinventar resolvers ni tocar el sidecar GPU:
 *
 *   - catalog.sqlite (getAllSpecies/getSpeciesById)  → identidad, piso térmico,
 *       altitud, asociaciones (companions/antagonists), plagas/enfermedades,
 *       fenología (valor_pedagogico), familia, estrato.
 *   - grafo-relations.json (grafoRelations)          → biopreparados y
 *       controladores biológicos por plaga (aristas del grafo AGE exportadas).
 *   - species-images.json (speciesImageResolver)     → foto CC del binomio.
 *   - catalog.sqlite biopreparados                   → dosis/uso/ingredientes
 *       cuando el id del grafo coincide con una receta curada del catálogo.
 *
 * Regla anti-alucinación: si una fuente no tiene el dato, la sección queda
 * vacía y la UI muestra una deflección honesta ("sin datos de X todavía").
 * NUNCA se inventa relación, dosis ni foto.
 *
 * Búsqueda: REUSA `normalizeForMatch` / `containsWholeWord` / `CURATED_ALIASES`
 * de utils/speciesResolver (el matcher canónico del proyecto) para devolver
 * candidatos ranqueados cuando la consulta es ambigua, sin cruzar géneros.
 */

import {
  getAllSpecies,
  getSpeciesById,
  getAllBiopreparados,
} from '../db/catalogDB.js';
import { getRelationsForSpecies, resolvePestSynonym } from './grafoRelations.js';
import { findLocalImage } from '../utils/speciesImageResolver.js';
import { normalizeForMatch, __TEST__ as RESOLVER_TEST } from '../utils/speciesResolver.js';

const { containsWholeWord, CURATED_ALIASES } = RESOLVER_TEST;

// Etiquetas, iconografía conceptual y rango canónico de cada piso térmico
// colombiano. El rango msnm es referencial (frontera difusa); la franja visual
// usa la altitud REAL de la especie cuando existe, esto es solo el telón.
export const PISOS_TERMICOS = [
  { id: 'calido', label: 'Cálido', minM: 0, maxM: 1000, tempC: '24–28 °C', tone: 'orange' },
  { id: 'templado', label: 'Templado', minM: 1000, maxM: 2000, tempC: '17–24 °C', tone: 'amber' },
  { id: 'frio', label: 'Frío', minM: 2000, maxM: 3000, tempC: '12–17 °C', tone: 'emerald' },
  { id: 'paramo', label: 'Páramo', minM: 3000, maxM: 4200, tempC: '< 12 °C', tone: 'indigo' },
];

const ALTITUD_TECHO_M = 4200; // techo de la franja visual (alto-andino).

/**
 * Nombre legible de una especie del catálogo (común + científico).
 * @param {object} sp — row del catálogo (data JSON).
 * @returns {{ id: string, comun: string, cientifico: string }}
 */
function speciesLabel(sp) {
  if (!sp) return { id: '', comun: '', cientifico: '' };
  return {
    id: sp.id || sp.slug || '',
    comun: sp.nombre_comun || sp.name_es || sp.id || '',
    cientifico: sp.nombre_cientifico || sp.name_la || '',
  };
}

/**
 * Convierte la lista de ids de asociación (companions/antagonists) en
 * objetos legibles resolviendo cada id contra el índice del catálogo. Los ids
 * sin entrada se muestran con el id "humanizado" (nunca se descartan en
 * silencio — el dato existe en el grafo aunque la especie no esté poblada).
 *
 * @param {string[]} ids
 * @param {Map<string, object>} byId — índice id → species row.
 * @returns {Array<{ id: string, comun: string, cientifico: string, enCatalogo: boolean }>}
 */
function resolveAssociationIds(ids, byId) {
  if (!Array.isArray(ids)) return [];
  return ids
    .filter((id) => typeof id === 'string' && id)
    .map((id) => {
      const sp = byId.get(id);
      if (sp) return { ...speciesLabel(sp), enCatalogo: true };
      return {
        id,
        comun: humanizeId(id),
        cientifico: '',
        enCatalogo: false,
      };
    });
}

/** "solanum_tuberosum_sabanera" → "Solanum tuberosum sabanera" (fallback legible). */
function humanizeId(id) {
  return String(id || '')
    .split('_')
    .filter(Boolean)
    .map((w, i) => (i === 0 ? w.charAt(0).toUpperCase() + w.slice(1) : w))
    .join(' ');
}

let biopreparadoIndexCache = null;
/** Índice id → receta del catálogo de biopreparados (lazy, una vez). */
async function getBiopreparadoIndex() {
  if (biopreparadoIndexCache) return biopreparadoIndexCache;
  const idx = new Map();
  try {
    const all = await getAllBiopreparados();
    for (const bp of all || []) {
      if (bp && bp.id) idx.set(bp.id, bp);
    }
  } catch (e) {
    console.warn('[directorioEspecies] biopreparados no disponibles:', e?.message || e);
  }
  biopreparadoIndexCache = idx;
  return idx;
}

/** Invalida caches internos (tests / cambios de catálogo). */
export function __resetDirectorioCache() {
  biopreparadoIndexCache = null;
}

/**
 * Busca especies por texto libre y devuelve candidatos RANQUEADOS.
 *
 * Estrategia (reusa el matcher canónico del proyecto, sin cruzar géneros):
 *   0. Alias curado exacto (frijol→phaseolus_vulgaris, limón→cítrico, …).
 *   1. id exacto.
 *   2. Nombre común/científico/regional EXACTO normalizado.
 *   3. Palabra completa con frontera (consulta = palabra entera del nombre, o
 *      el nombre = palabra entera de la consulta). Ranqueado por especificidad.
 *
 * @param {string} query — texto libre del buscador.
 * @param {object} [opts]
 * @param {number} [opts.limit=12] - máximo de candidatos devueltos.
 * @returns {Promise<Array<{ id, comun, cientifico, familia, match: 'alias'|'exact'|'word' }>>}
 */
export async function searchSpecies(query, opts = {}) {
  const { limit = 12 } = opts;
  const q = normalizeForMatch(query);
  if (!q || q.length < 2) return [];

  let list;
  try {
    list = await getAllSpecies();
  } catch (e) {
    console.warn('[directorioEspecies] catálogo no disponible:', e?.message || e);
    return [];
  }
  if (!Array.isArray(list) || list.length === 0) return [];

  const aliasFirst = [];
  const exact = [];
  const word = [];
  const seen = new Set();

  // 0) Alias curado → si el destino existe, lo PROMOVEMOS al primer lugar
  // (tier tope) pero NO corta-circuita: el explorador debe seguir listando los
  // demás candidatos (todos los tomates, no solo el de mesa). El alias resuelve
  // el "default esperado" (tomate → cerasiforme, no tomate de árbol); el resto
  // se recolecta debajo por match exacto/palabra. Lo metemos en `seen` para no
  // duplicarlo cuando el loop lo vuelva a encontrar por nombre.
  const aliasTarget = CURATED_ALIASES[q];
  if (aliasTarget) {
    const hit = list.find((s) => s?.id === aliasTarget || s?.slug === aliasTarget);
    if (hit) {
      const aliasId = hit.id || hit.slug;
      if (aliasId) {
        aliasFirst.push({ ...labelWithFamilia(hit), match: 'alias' });
        seen.add(aliasId);
      }
    }
  }

  for (const sp of list) {
    if (!sp) continue;
    const id = sp.id || sp.slug;
    if (!id || seen.has(id)) continue;

    const names = collectNames(sp);
    const normalizedNames = names.map(normalizeForMatch).filter(Boolean);

    // 1/2) match exacto por id o por cualquier nombre normalizado.
    if (normalizeForMatch(id) === q || normalizedNames.includes(q)) {
      exact.push({ ...labelWithFamilia(sp), match: 'exact' });
      seen.add(id);
      continue;
    }

    // 3) palabra completa con frontera (≥3 chars para evitar ruido).
    if (q.length >= 3) {
      const hit = normalizedNames.some(
        (n) => containsWholeWord(n, q) || containsWholeWord(q, n),
      );
      if (hit) {
        // peso = longitud del nombre más corto que matcheó (más corto = más
        // genérico/relevante).
        const matchedLen = Math.min(
          ...normalizedNames
            .filter((n) => containsWholeWord(n, q) || containsWholeWord(q, n))
            .map((n) => n.length),
        );
        word.push({ ...labelWithFamilia(sp), match: 'word', _w: matchedLen });
        seen.add(id);
      }
    }
  }

  word.sort((a, b) => a._w - b._w);
  const ranked = [...aliasFirst, ...exact, ...word.map(({ _w, ...rest }) => rest)];
  return /** @type {Array<{id:any, comun:any, cientifico:any, familia:any, match:'exact'|'alias'|'word'}>} */ (ranked.slice(0, limit));
}

/** Recolecta todos los nombres buscables de una especie del catálogo. */
function collectNames(sp) {
  const out = [];
  if (sp.nombre_comun) {
    // El catálogo lista variantes con "/": "Frijol arbustivo / voluble".
    for (const part of String(sp.nombre_comun).split('/')) out.push(part.trim());
  }
  if (sp.name_es) out.push(sp.name_es);
  if (sp.nombre_cientifico) out.push(sp.nombre_cientifico);
  if (sp.name_la) out.push(sp.name_la);
  if (Array.isArray(sp.nombre_comunes_regionales)) out.push(...sp.nombre_comunes_regionales);
  if (Array.isArray(sp.nombres_comunes)) out.push(...sp.nombres_comunes);
  return out.filter(Boolean);
}

function labelWithFamilia(sp) {
  return {
    ...speciesLabel(sp),
    familia: sp.familia_botanica || sp.family || '',
  };
}

/**
 * Normaliza el rango de altitud de una especie a la forma estándar
 * { min_absoluto, optimo_min, optimo_max, max_absoluto } sin importar si vino
 * como `altitud_msnm` (catálogo SQLite) o `requirements.altitud_msnm`
 * (cycle-content). Devuelve null si no hay dato.
 */
function normalizeAltitud(sp) {
  const a = sp?.altitud_msnm || sp?.requirements?.altitud_msnm || null;
  if (!a || typeof a !== 'object') return null;
  const pick = (v) => (typeof v === 'number' && Number.isFinite(v) ? v : null);
  const out = {
    min_absoluto: pick(a.min_absoluto),
    optimo_min: pick(a.optimo_min),
    optimo_max: pick(a.optimo_max),
    max_absoluto: pick(a.max_absoluto),
  };
  // Si TODO es null, no hay rango útil.
  if (Object.values(out).every((v) => v === null)) return null;
  return out;
}

/**
 * Construye la FICHA completa y grounded de una especie por su id.
 *
 * Une catálogo + grafo + imagen. Cada sección reporta su propia presencia para
 * que la UI muestre deflección honesta donde falte el dato. NUNCA lanza:
 * cualquier fuente caída degrada esa sección a vacía.
 *
 * @param {string} speciesId
 * @returns {Promise<null | object>} null si la especie no existe en el catálogo.
 */
export async function buildSpeciesFicha(speciesId) {
  if (!speciesId || typeof speciesId !== 'string') return null;

  let sp = null;
  try {
    sp = await getSpeciesById(speciesId);
  } catch (e) {
    console.warn('[directorioEspecies] getSpeciesById falló:', e?.message || e);
  }
  if (!sp) return null;

  // Índice id → species para resolver nombres de asociaciones.
  let byId = new Map();
  try {
    const all = await getAllSpecies();
    for (const s of all || []) {
      if (s?.id) byId.set(s.id, s);
      else if (s?.slug) byId.set(s.slug, s);
    }
  } catch (_) {
    /* sin índice → las asociaciones se muestran humanizadas por id */
  }

  // --- Relaciones del grafo (offline) — biopreparados + controladores. ---
  let rel = null;
  try {
    rel = await getRelationsForSpecies(speciesId);
  } catch (_) {
    /* sin grafo → secciones de biopreparados/controladores vacías */
  }

  // --- Imagen CC (binomio) ---
  let imagen = null;
  try {
    imagen = await findLocalImage(sp.nombre_cientifico || sp.name_la || speciesId);
  } catch (_) {
    imagen = null;
  }

  // --- Asociaciones (catálogo manda; grafo complementa) ---
  const compatibleIds = uniqueStrings([
    ...(Array.isArray(sp.companions) ? sp.companions : []),
    ...(rel && Array.isArray(rel.compatible_with) ? rel.compatible_with : []),
  ]);
  const antagonistIds = uniqueStrings([
    ...(Array.isArray(sp.antagonists) ? sp.antagonists : []),
    ...(rel && Array.isArray(rel.antagonist_of) ? rel.antagonist_of : []),
  ]);

  // --- Biopreparados (grafo) enriquecidos con receta del catálogo si existe ---
  const bioIndex = await getBiopreparadoIndex();
  const biopreparados = (rel && Array.isArray(rel.biopreparados) ? rel.biopreparados : [])
    .filter((b) => b && !b.disputed && (b.id || b.nombre))
    .map((b) => {
      const receta = b.id ? bioIndex.get(b.id) : null;
      const data = receta?.data ? safeParse(receta.data) : null;
      return {
        id: b.id || '',
        nombre: b.nombre || (data?.nombre) || humanizeId(b.id),
        // Detalle curado del catálogo (solo si el id coincide):
        tipo: data?.tipo || null,
        dosis: data?.dosis || null,
        uso: data?.uso || null,
        ingredientes: Array.isArray(data?.ingredientes) ? data.ingredientes : null,
        enCatalogo: Boolean(receta),
      };
    });

  // --- Plagas/enfermedades (catálogo) + controladores (grafo) ---
  const controllersByPlaga = new Map();
  if (rel && Array.isArray(rel.pest_controllers)) {
    for (const pc of rel.pest_controllers) {
      if (pc && pc.plaga && !pc.disputed && Array.isArray(pc.controladores)) {
        controllersByPlaga.set(
          normalizeForMatch(pc.plaga),
          { plaga: pc.plaga, controladores: pc.controladores.filter(Boolean) },
        );
      }
    }
  }
  const amenazas = await buildAmenazas(sp, controllersByPlaga);

  return {
    id: speciesId,
    ...speciesLabel(sp),
    familia: sp.familia_botanica || sp.family || '',
    categoria: sp.category || '',
    estrato: sp.estrato || '',
    cultivable: sp.cultivable !== false,
    nombresRegionales: uniqueStrings([
      ...(Array.isArray(sp.nombre_comunes_regionales) ? sp.nombre_comunes_regionales : []),
      ...(rel && Array.isArray(rel.nombres_comunes) ? rel.nombres_comunes : []),
    ]),
    imagen, // { url, thumbUrl, license, rightsHolder, source, sourceUrl } | null
    pisoTermico: {
      thermalZones: Array.isArray(sp.thermal_zones) ? sp.thermal_zones : [],
      altitud: normalizeAltitud(sp),
      temperatura: sp.temperatura_c || null,
      agua: sp.agua || null,
    },
    asociaciones: {
      compatibles: resolveAssociationIds(compatibleIds, byId),
      antagonistas: resolveAssociationIds(antagonistIds, byId),
    },
    biopreparados,
    amenazas, // [{ nombre, tipo: 'plaga'|'enfermedad', controladores: [str] }]
    fenologia: {
      valorPedagogico: sp.valor_pedagogico || '',
      cycleMonths: sp.cycleMonths ?? null,
      propagation: sp.propagation || null,
      harvestType: sp.harvest_type || null,
    },
    fuentes: collectSources(sp),
  };
}

/** Une plagas/enfermedades del catálogo con sus controladores del grafo. */
async function buildAmenazas(sp, controllersByPlaga) {
  const out = [];
  const speciesId = sp?.id || sp?.slug || '';
  const resolvedCache = new Map();

  const getResolvedPest = async (nombre) => {
    const key = normalizeForMatch(nombre);
    if (!key) return null;
    if (resolvedCache.has(key)) return resolvedCache.get(key);
    const resolved = await resolvePestSynonym(nombre);
    resolvedCache.set(key, resolved);
    return resolved;
  };

  const push = async (nombre, tipo) => {
    if (!nombre) return;
    const key = normalizeForMatch(nombre);
    // match por palabra completa contra las plagas del grafo (los nombres no
    // son idénticos: catálogo "Bemisia tabaci" vs grafo "mosca blanca").
    let controladores = [];
    const direct = controllersByPlaga.get(key);
    if (direct) {
      controladores = direct.controladores;
    } else {
      for (const [, pc] of controllersByPlaga) {
        const pk = normalizeForMatch(pc.plaga);
        if (containsWholeWord(key, pk) || containsWholeWord(pk, key)) {
          controladores = pc.controladores;
          break;
        }
      }
    }
    const resolved = await getResolvedPest(nombre);
    const displayName = resolved && speciesId && Array.isArray(resolved.especiesAfectadas) && resolved.especiesAfectadas.includes(speciesId)
      ? (resolved.plaga || nombre)
      : nombre;
    out.push({ nombre: displayName, tipo, controladores });
  };
  if (Array.isArray(sp.plagas_criticas)) {
    for (const p of sp.plagas_criticas) {
      await push(p, 'plaga');
    }
  }
  if (Array.isArray(sp.enfermedades_criticas)) {
    for (const e of sp.enfermedades_criticas) {
      await push(e, 'enfermedad');
    }
  }
  // Plagas que SOLO trae el grafo (no listadas como críticas en el catálogo).
  for (const [, pc] of controllersByPlaga) {
    const ya = out.some((a) => {
      const ak = normalizeForMatch(a.nombre);
      const pk = normalizeForMatch(pc.plaga);
      return containsWholeWord(ak, pk) || containsWholeWord(pk, ak) || ak === pk;
    });
    if (!ya) {
      const resolved = await getResolvedPest(pc.plaga);
      const displayName = resolved && speciesId && Array.isArray(resolved.especiesAfectadas) && resolved.especiesAfectadas.includes(speciesId)
        ? (resolved.plaga || pc.plaga)
        : pc.plaga;
      out.push({ nombre: displayName, tipo: 'plaga', controladores: pc.controladores });
    }
  }
  return out;
}

function collectSources(sp) {
  const raw = Array.isArray(sp.sources) ? sp.sources
    : Array.isArray(sp.source_ids) ? sp.source_ids.map((id) => ({ id, title: id }))
    : [];
  return raw
    .map((s) => (typeof s === 'string' ? { id: s, title: s } : s))
    .filter((s) => s && (s.id || s.title))
    .map((s) => ({ id: s.id || s.title, title: s.title || s.id, url: s.url || null, tier: s.tier || null }));
}

function uniqueStrings(arr) {
  return [...new Set((arr || []).filter((x) => typeof x === 'string' && x))];
}

function safeParse(json) {
  try {
    return typeof json === 'string' ? JSON.parse(json) : json;
  } catch (_) {
    return null;
  }
}

/**
 * Resuelve la posición porcentual [0..100] de un valor de altitud sobre la
 * franja visual (0 → ALTITUD_TECHO_M). Útil para posicionar marcadores en la
 * banda de piso térmico.
 */
export function altitudToPct(msnm) {
  if (typeof msnm !== 'number' || !Number.isFinite(msnm)) return null;
  const clamped = Math.max(0, Math.min(ALTITUD_TECHO_M, msnm));
  return Math.round((clamped / ALTITUD_TECHO_M) * 100);
}

export const __ALTITUD_TECHO_M = ALTITUD_TECHO_M;
