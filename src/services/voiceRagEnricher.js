/**
 * voiceRagEnricher.js — Conecta la salida del entityExtractor (voz / Whisper +
 * modelo configurado) con el corpus RAG en `public/cycle-content/` para enriquecer
 * cada entidad reconocida con contexto agronómico del catálogo.
 *
 * Motivación (audit deep finding 2026-05-18):
 *   El entityExtractor extrae `{crop, quantity, location}` pero NO consulta el
 *   RAG, así que VoiceConfirmation no muestra:
 *     - companions favorables (ej. "fresa va bien con caléndula y ajo"),
 *     - antagonistas (ej. "evitar junto a repollo"),
 *     - biopreparados típicos (ej. "bocashi al trasplante, caldo bordelés"),
 *     - advertencia si la especie está marcada como invasora.
 *
 * Diseño:
 *   1. `retrieve(query, k)` ya implementa BM25 sobre los pasajes del corpus.
 *      Lo usamos como índice para identificar el `species_slug` que mejor
 *      cubre la consulta `{nombre del cultivo} biopreparados companions
 *      manejo`.
 *   2. Una vez identificado el slug ganador (>= 1 hit con score>0), se
 *      hace fetch directo del JSON del species en `/cycle-content/<slug>.json`
 *      para extraer campos estructurados:
 *        - `companions[].especie` + `razon`,
 *        - `antagonistas[].especie` + `razon`,
 *        - `biopreparados[].nombre` + `uso`,
 *        - flags de invasora (category=="especies_invasoras" o
 *          conservation_status=="invasor").
 *      Esto evita el ruido del re-ranking por pasaje y nos da datos
 *      directamente renderizables.
 *   3. Degrade gracefully: si el RAG está cold (corpusCache=null y la primera
 *      carga falla) o no hay hits, devuelve `ragInsights: null` y la UI
 *      simplemente omite la sección.
 *
 * Contrato:
 *   `enrichEntitiesWithRag(entities)` → mismo array de entidades, cada una
 *   con `_ragInsights` opcional. Nunca lanza: errores se loguean con
 *   `console.warn` y la entidad queda sin enriquecer.
 *
 * NO toca el LLM prompt del modelo configurado ni la integración Whisper. Es estrictamente
 * post-procesamiento sobre el array de entidades ya extraído.
 */

import { retrieve } from './ragRetriever';

const CORPUS_PATH = '/cycle-content/';

// Cache en memoria de documentos species ya fetcheados para evitar re-fetch
// dentro de una misma sesión (común cuando el operador registra el mismo
// cultivo varias veces).
const docCache = new Map();

/**
 * Carga el JSON completo de un species desde `public/cycle-content/<slug>.json`.
 * Cachea el resultado en memoria. Devuelve null si la carga falla.
 */
async function loadSpeciesDoc(slug) {
  if (!slug) return null;
  if (docCache.has(slug)) return docCache.get(slug);

  try {
    const res = await fetch(`${CORPUS_PATH}${slug}.json`);
    if (!res.ok) {
      docCache.set(slug, null);
      return null;
    }
    const ct = res.headers.get('content-type') || '';
    if (!ct.includes('json')) {
      docCache.set(slug, null);
      return null;
    }
    const data = await res.json();
    docCache.set(slug, data);
    return data;
  } catch (err) {
    console.warn(`[voiceRagEnricher] Failed to load species doc ${slug}:`, err);
    docCache.set(slug, null);
    return null;
  }
}

/**
 * Detección de especies invasoras. El corpus marca con dos campos posibles
 * según la generación del JSON (esquema mixto pre/post 2026-05):
 *   - `category: "especies_invasoras"`
 *   - `conservation_status: "invasor"`
 *   - `roles_in_guild` incluye `"invasive"`
 *   - `cultivable: false`
 */
function detectInvasive(doc) {
  if (!doc) return false;
  if (doc.category === 'especies_invasoras') return true;
  if (doc.conservation_status === 'invasor') return true;
  if (Array.isArray(doc.roles_in_guild) && doc.roles_in_guild.includes('invasive')) return true;
  return false;
}

/**
 * Mapea companions del corpus al shape que renderiza VoiceConfirmation.
 * Algunas variantes del corpus traen strings, otras objetos {especie, razon}.
 */
function normalizeCompanions(raw) {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((c) => {
      if (typeof c === 'string') return { especie: c, razon: '' };
      if (c && typeof c === 'object') {
        const especie = c.especie || c.species || c.name || '';
        const razon = c.razon || c.reason || '';
        if (!especie) return null;
        return { especie: String(especie).trim(), razon: String(razon).trim() };
      }
      return null;
    })
    .filter(Boolean);
}

function normalizeBiopreparados(raw) {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((b) => {
      if (typeof b === 'string') return { nombre: b, uso: '' };
      if (b && typeof b === 'object') {
        const nombre = b.nombre || b.name || '';
        const uso = b.uso || b.usage || '';
        if (!nombre) return null;
        return { nombre: String(nombre).trim(), uso: String(uso).trim() };
      }
      return null;
    })
    .filter(Boolean);
}

/**
 * Extrae el species_slug que el BM25 considera más relevante para el cultivo.
 * Reglas:
 *   - Si todos los hits coinciden en un mismo species, ese es el winner.
 *   - Si hay disparidad, escoge el species cuyo top-hit tiene mayor score
 *     (suma de scores como tiebreaker).
 *   - Devuelve null si no hay hits con score > 0.
 */
function pickWinningSlug(hits) {
  if (!Array.isArray(hits) || hits.length === 0) return null;
  const tally = new Map();
  hits.forEach((h, i) => {
    if (!h?.species || !(h.score > 0)) return;
    const cur = tally.get(h.species) || { totalScore: 0, topScore: 0, firstRank: i };
    cur.totalScore += h.score;
    if (h.score > cur.topScore) cur.topScore = h.score;
    tally.set(h.species, cur);
  });
  if (tally.size === 0) return null;
  // Mejor topScore primero; desempate por totalScore (más cobertura del doc).
  let bestSlug = null;
  let bestKey = [-Infinity, -Infinity];
  for (const [slug, info] of tally.entries()) {
    const key = [info.topScore, info.totalScore];
    if (key[0] > bestKey[0] || (key[0] === bestKey[0] && key[1] > bestKey[1])) {
      bestKey = key;
      bestSlug = slug;
    }
  }
  return bestSlug;
}

/**
 * Enriquece una única entidad reconocida por voz con insights del RAG.
 *
 * @param {{crop:string, quantity:number, location:string}} entity
 * @returns {Promise<{
 *   sourceSlug: string|null,
 *   companions: Array<{especie:string, razon:string}>,
 *   antagonists: Array<{especie:string, razon:string}>,
 *   biopreparados: Array<{nombre:string, uso:string}>,
 *   invasive: boolean,
 *   warnings: string[],
 *   hitCount: number
 * }|null>} insights o null si el RAG no tiene cobertura.
 */
export async function enrichEntity(entity) {
  if (!entity || typeof entity.crop !== 'string' || !entity.crop.trim()) return null;

  const cropName = entity.crop.trim();
  // Query construida para maximizar coverage del doc species: incluye términos
  // clave del esquema (companions, biopreparados) y palabras de manejo. BM25
  // los recogerá del passage flat-key + text.
  const query = `${cropName} companions biopreparados manejo asociaciones`;

  let hits = [];
  try {
    hits = await retrieve(query, 6, 'voice');
  } catch (err) {
    console.warn('[voiceRagEnricher] retrieve failed:', err);
    return null;
  }

  const slug = pickWinningSlug(hits);
  if (!slug) return null;

  const doc = await loadSpeciesDoc(slug);
  if (!doc) return null;

  const companions = normalizeCompanions(doc.companions);
  const antagonists = normalizeCompanions(doc.antagonistas || doc.antagonists);
  const biopreparados = normalizeBiopreparados(doc.biopreparados);
  const invasive = detectInvasive(doc);

  const warnings = [];
  if (invasive) {
    const sub = Array.isArray(doc.especies_nativas_sustitutas) && doc.especies_nativas_sustitutas.length > 0
      ? ` Considera sustitutas nativas: ${doc.especies_nativas_sustitutas.slice(0, 3).join(', ')}.`
      : '';
    warnings.push(`Especie marcada como invasora en el catálogo.${sub}`);
  }

  // Si no hay nada útil que mostrar, devolvemos null para que la UI omita
  // la sección por completo (degrade gracefully).
  const hasSomething =
    companions.length > 0 ||
    antagonists.length > 0 ||
    biopreparados.length > 0 ||
    warnings.length > 0;
  if (!hasSomething) return null;

  return {
    sourceSlug: slug,
    companions,
    antagonists,
    biopreparados,
    invasive,
    warnings,
    hitCount: hits.filter((h) => h.score > 0).length,
  };
}

/**
 * Enriquece un array de entidades en paralelo. Devuelve un nuevo array donde
 * cada entidad puede traer `_ragInsights` (campo opcional). No muta el input.
 *
 * Telemetría: devuelve también un summary `{enriched, total}` que el caller
 * puede registrar con voiceTelemetry.
 *
 * @param {Array} entities
 * @returns {Promise<{entities: Array, summary: {enriched:number, total:number, slugs:string[]}}>}
 */
export async function enrichEntitiesWithRag(entities) {
  const list = Array.isArray(entities) ? entities : [];
  if (list.length === 0) return { entities: list, summary: { enriched: 0, total: 0, slugs: [] } };

  const results = await Promise.all(list.map((e) => enrichEntity(e).catch(() => null)));
  const enrichedEntities = list.map((e, i) => {
    const insights = results[i];
    if (!insights) return e;
    return { ...e, _ragInsights: insights };
  });

  const slugs = results.filter(Boolean).map((r) => r.sourceSlug).filter(Boolean);
  const summary = {
    enriched: results.filter(Boolean).length,
    total: list.length,
    slugs,
  };
  return { entities: enrichedEntities, summary };
}

export const __TEST__ = {
  detectInvasive,
  normalizeCompanions,
  normalizeBiopreparados,
  pickWinningSlug,
  _resetDocCache: () => docCache.clear(),
};
