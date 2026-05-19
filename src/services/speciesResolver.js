/**
 * speciesResolver — Resolver de nombres libres a species del catálogo.
 *
 * Regla operativa (operator 2026-05-19):
 *   "Cuando una species no se pueda matchear con lo registrado en el
 *    catálogo se skipea esa especie sin afectar otros registros. Se
 *    debe sugerir la que mejor matchea con lo existente siempre; pero
 *    si no la encuentra, skippea."
 *
 * Estrategia en cascada:
 *   1. Exact match: contra slug, name_es, name_la (case-insensitive,
 *      acentos-folded). Confianza 1.0.
 *   2. RAG match: query BM25 sobre cycle-content (passages indexados
 *      por species_slug). Agrupa scores por species, toma el top. Si
 *      score normalizado > RAG_THRESHOLD → match 'fuzzy'.
 *   3. Sin match → return null (caller debe skip silencioso).
 *
 * NO bloquea: si el catálogo no está listo o el RAG falla, retorna null
 * (skip) sin throw. El caller decide qué hacer con los skippeados (log,
 * UI badge, etc.).
 *
 * @example
 *   const result = await resolveSpecies('tomate cherry');
 *   if (result?.match === 'exact') {
 *     usar result.species;
 *   } else if (result?.match === 'fuzzy') {
 *     sugerir result.species + 'confianza: ' + result.confidence;
 *   } else {
 *     skip silencioso, log para audit
 *   }
 */

import { getAllSpecies } from '../db/catalogDB';
import { retrieve } from './ragRetriever';

// Threshold conservador: BM25 retorna scores absolutos variables; basta
// que el species ganador tenga > 2.0 acumulado en el top-10 para considerarlo
// candidato. Ajustar empíricamente si genera falsos positivos.
const RAG_THRESHOLD = 2.0;

const fold = (s) =>
  (s || '')
    .toString()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .trim()
    .replace(/\s+/g, ' ');

/**
 * Cache del índice de species por slug/name. Se invalida si el catálogo
 * cambia (rara vez en runtime). KISS: TTL por sesión.
 */
let speciesIndexCache = null;

async function buildSpeciesIndex() {
  if (speciesIndexCache) return speciesIndexCache;
  try {
    const all = await getAllSpecies();
    const bySlug = new Map();
    const byName = new Map();
    for (const sp of all) {
      if (!sp || !sp.slug) continue;
      bySlug.set(fold(sp.slug), sp);
      if (sp.name_es) byName.set(fold(sp.name_es), sp);
      if (sp.name_la) byName.set(fold(sp.name_la), sp);
      // Nombres regionales también indexados (opcional, depende del schema).
      if (Array.isArray(sp.nombres_comunes)) {
        for (const n of sp.nombres_comunes) {
          if (typeof n === 'string') byName.set(fold(n), sp);
        }
      }
    }
    speciesIndexCache = { bySlug, byName };
    return speciesIndexCache;
  } catch (e) {
    // catalogDB no listo o vacío — devolver índices vacíos, el caller
    // recibirá null y skippeará silenciosamente.
    console.warn('[speciesResolver] catálogo no disponible, RAG-only:', e?.message || e);
    return { bySlug: new Map(), byName: new Map() };
  }
}

/**
 * Intenta resolver `name` a una species del catálogo.
 *
 * @param {string} name - texto libre (slug, nombre español, nombre latín,
 *   nombre regional).
 * @param {object} [opts]
 * @param {number} [opts.ragTopK=10] - cuántos passages mirar para agrupar.
 * @param {number} [opts.ragThreshold=RAG_THRESHOLD] - score mínimo del top.
 * @returns {Promise<{species: object, slug: string, match: 'exact'|'fuzzy', confidence: number}|null>}
 *   null si no hay match razonable (caller debe skip).
 */
export async function resolveSpecies(name, opts = {}) {
  const { ragTopK = 10, ragThreshold = RAG_THRESHOLD } = opts;
  const q = fold(name);
  if (!q) return null;

  const { bySlug, byName } = await buildSpeciesIndex();

  // 1. Exact slug
  if (bySlug.has(q)) {
    const sp = bySlug.get(q);
    return { species: sp, slug: sp.slug, match: 'exact', confidence: 1.0 };
  }
  // 2. Exact name (español/latín/regional)
  if (byName.has(q)) {
    const sp = byName.get(q);
    return { species: sp, slug: sp.slug, match: 'exact', confidence: 1.0 };
  }

  // 3. RAG fallback — usar BM25 sobre cycle-content para encontrar species
  //    con mayor evidencia textual relacionada al query. Agrupar scores por
  //    species_slug (cada passage trae su slug).
  let scoredPassages;
  try {
    scoredPassages = await retrieve(name, ragTopK);
  } catch (e) {
    console.warn('[speciesResolver] RAG falló:', e?.message || e);
    return null;
  }
  if (!Array.isArray(scoredPassages) || scoredPassages.length === 0) {
    return null;
  }

  const speciesScores = new Map();
  for (const p of scoredPassages) {
    if (!p || !p.species) continue;
    speciesScores.set(p.species, (speciesScores.get(p.species) || 0) + (p.score || 0));
  }
  if (speciesScores.size === 0) return null;

  let topSlug = null;
  let topScore = -Infinity;
  for (const [slug, score] of speciesScores) {
    if (score > topScore) {
      topScore = score;
      topSlug = slug;
    }
  }
  if (!topSlug || topScore < ragThreshold) {
    return null; // sin candidato confiable → skip
  }

  // Recuperar species del índice si lo tenemos; si no, devolver shape
  // mínimo (slug solo). El caller puede enriquecer después con
  // getSpeciesById.
  const sp = bySlug.get(fold(topSlug));
  // Normaliza confidence a [0, 1] usando el score acumulado.
  // Heurística: 2 → 0.5, 4 → 0.75, 8+ → ~0.9. logística simple.
  const confidence = Math.min(1, topScore / (topScore + ragThreshold * 2));
  return {
    species: sp || { slug: topSlug },
    slug: topSlug,
    match: 'fuzzy',
    confidence,
  };
}

/**
 * Resuelve un array de nombres aplicando la regla skip-on-no-match.
 * Retorna `{ resolved: [{name, species, match}], skipped: [name] }`.
 * Útil para importers / batch loaders que no deben fallar por 1 species.
 *
 * @param {string[]} names
 * @param {object} [opts] - mismas opciones que resolveSpecies
 */
export async function resolveSpeciesBatch(names, opts = {}) {
  if (!Array.isArray(names)) return { resolved: [], skipped: [] };
  const resolved = [];
  const skipped = [];
  for (const name of names) {
    const result = await resolveSpecies(name, opts);
    if (result) {
      resolved.push({ name, ...result });
    } else {
      skipped.push(name);
    }
  }
  if (skipped.length > 0) {
    console.warn(`[speciesResolver] skip ${skipped.length} sin match:`, skipped);
  }
  return { resolved, skipped };
}

/** Invalida cache — útil tras cambios en catálogo (tests, migraciones). */
export function __resetSpeciesResolverCache() {
  speciesIndexCache = null;
}
