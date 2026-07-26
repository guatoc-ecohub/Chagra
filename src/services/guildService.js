/**
 * guildService.js — Motor de gremios y sugerencia de policultivos.
 *
 * Tres capas de resolución:
 *   1. Explícita: companions definidos en speciesDefaults (validados a mano).
 *   2. Estructural: nichos vacíos derivados de estrato + gremio + filtros
 *      funcionales (ciclo + sombra + porte).
 *   3. Cognitiva: inferencia via Ollama/Gemma 4 (delegada al caller).
 *
 * Filtros funcionales en Capa 2 (ADR-034 — feedback usuario externo 2026-05-06):
 *   - Compatibilidad de ciclo: hortalizas anuales (<12 meses) no aceptan
 *     companions perennes (>=24 meses o cycleMonths null).
 *   - Compatibilidad de sombra: especies sun-loving (estrato bajo + ciclo
 *     corto sin tolerancia a sombra explícita) excluyen candidates con
 *     `shade_projection: 'high'`.
 *
 * El servicio NUNCA sugiere antagonistas. La validación de incompatibilidad
 * es transversal a las tres capas.
 */

import { SPECIES_DEFAULTS } from '../config/speciesDefaults';
import { CROP_TAXONOMY } from '../config/taxonomy';
import { getContextoGeoFinca } from './perfilFincaService';
import { retrieve } from './ragRetriever';

const DEFAULT_MAX_ASSETS = parseInt(import.meta.env.VITE_LLM_CONTEXT_MAX_ASSETS || '50', 10);

// Flatten de todas las especies con su grupo para resolución rápida.
const ALL_SPECIES = Object.entries(CROP_TAXONOMY).flatMap(([groupId, group]) =>
  group.species.map((sp) => ({ ...sp, groupId }))
);

const speciesById = new Map(ALL_SPECIES.map((sp) => [sp.id, sp]));

// Mapa de estratos complementarios: si la especie ocupa X, sugerir desde Y.
// Principio de diseño vertical (Restrepo / Mollison): maximizar fotosíntesis total
// distribuyendo biomasa en múltiples capas.
const COMPLEMENTARY_STRATA = {
  emergente: ['alto', 'medio', 'bajo'],
  alto: ['medio', 'bajo'],
  medio: ['bajo', 'alto'],
  bajo: ['medio'],
};

// Gremios complementarios: si la especie cumple X, sugerir funciones Y faltantes.
// Un gremio completo tiene: productivo + fijador N + acumulador + cobertura + repelente + polinización.
const COMPLEMENTARY_ROLES = {
  productivo_principal:     ['fijador_nitrogeno', 'repelente_plagas', 'atrayente_polinizadores'],
  fijador_nitrogeno:        ['productivo_principal', 'atrayente_polinizadores'],
  acumulador_dinamico:      ['productivo_principal', 'fijador_nitrogeno'],
  cobertura_suelo:          ['productivo_principal', 'fijador_nitrogeno', 'atrayente_polinizadores'],
  repelente_plagas:         ['productivo_principal', 'fijador_nitrogeno'],
  atrayente_polinizadores:  ['productivo_principal', 'repelente_plagas'],
  productor_biomasa:        ['productivo_principal', 'fijador_nitrogeno'],
};

/**
 * Especies que proyectan sombra densa cuando maduran. Si target es sun-loving
 * (estrato bajo + ciclo corto), estas se excluyen como companions estructurales
 * aunque tengan estrato/gremio complementario.
 *
 * Curado a mano post-feedback usuario externo. Lista incremental: agregar especie
 * cuando se detecte que da sombra problemática a herbáceas.
 */
const SHADE_PROJECTION_HIGH = new Set([
  'coffea_arabica',           // Café — dosel arbustivo 2-3m
  'solanum_betaceum',         // Tomate de árbol — arbusto 3-4m
  'passiflora_edulis',        // Gulupa — enredadera densa
  'passiflora_ligularis',     // Granadilla — enredadera densa
  'passiflora_tarminiana',    // Curuba — enredadera densa
  'psidium_guajava',          // Guayaba — árbol 3-6m
  'malus_domestica',          // Manzano — árbol 3-5m
  'pyrus_communis',           // Peral — árbol 3-5m
  'prunus_persica',           // Durazno — árbol 3-5m
  'ficus_carica',             // Higuera — árbol 3-6m
  'citrus_limon',             // Limón — árbol 3-5m
  'acca_sellowiana',          // Feijoa — arbusto 3m
  'vasconcellea_pubescens',   // Papayuelo — arbusto 4-5m
]);

/**
 * Determina si una especie es perenne (vive >= 2 años o ciclo indefinido).
 * Heurística sobre cycleMonths:
 *   - null → perenne explícita (café, frutales perennes)
 *   - >= 24 → bianual+ que en práctica funciona como perenne
 *   - < 24 → anual o bianual corta
 */
function isPerennial(defaults) {
  if (!defaults) return false;
  if (defaults.cycleMonths === null || defaults.cycleMonths === undefined) return true;
  return defaults.cycleMonths >= 24;
}

/**
 * Determina si una especie es de ciclo corto (anual rápido <= 12 meses).
 */
function isAnnual(defaults) {
  if (!defaults) return false;
  if (defaults.cycleMonths === null || defaults.cycleMonths === undefined) return false;
  return defaults.cycleMonths < 12;
}

/**
 * Determina si una especie es estrato bajo + ciclo corto = "hortaliza herbácea".
 * Estas especies son las más sensibles a companions de gran porte (sombra/competencia).
 */
function isHerbaceousLowCycle(defaults) {
  return defaults.estrato === 'bajo' && isAnnual(defaults);
}

/**
 * Filtro funcional: ¿es candidate compatible con target en ciclo + sombra?
 * Devuelve null si OK, o string con razón de exclusión si rechazado.
 */
function checkFunctionalCompatibility(targetDefaults, candidateId, candidateDefaults) {
  // Filtro 1: target hortaliza herbácea NO puede tener companions perennes de gran porte
  if (isHerbaceousLowCycle(targetDefaults) && isPerennial(candidateDefaults)) {
    if (SHADE_PROJECTION_HIGH.has(candidateId)) {
      return 'sombra excesiva sobre hortaliza';
    }
    if (candidateDefaults.estrato === 'medio' || candidateDefaults.estrato === 'alto') {
      return 'ciclo perenne incompatible con hortaliza anual';
    }
  }

  // Filtro 2: target ciclo corto + candidate perenne con shade alta = no
  if (isAnnual(targetDefaults) && SHADE_PROJECTION_HIGH.has(candidateId)) {
    return 'sombra densa sobre ciclo anual';
  }

  return null;
}

/**
 * Obtiene sugerencias de compañeros para una especie seleccionada.
 *
 * @param {string} speciesId - clave de CROP_TAXONOMY (ej. 'passiflora_edulis')
 * @returns {{ companions: Array<{id, name, reason, score}>, antagonists: Array<{id, name, reason}> }}
 */
export const getSuggestedCompanions = (speciesId) => {
  const defaults = SPECIES_DEFAULTS[speciesId];
  if (!defaults) return { companions: [], antagonists: [] };

  const antagonistSet = new Set(defaults.antagonists || []);
  const results = new Map(); // id → { id, name, reason, score }

  // Capa 1 — Compañeros explícitos (máxima confianza, no se filtran funcionalmente
  // porque ya fueron validados a mano por el curador del catálogo).
  for (const cId of (defaults.companions || [])) {
    if (antagonistSet.has(cId)) continue;
    const sp = speciesById.get(cId);
    if (!sp) continue;
    results.set(cId, { id: cId, name: sp.name, reason: 'Compañero directo (relación validada)', score: 100 });
  }

  // Capa 2 — Complementariedad estructural (estrato + gremio) con FILTROS FUNCIONALES
  const targetStrata = COMPLEMENTARY_STRATA[defaults.estrato] || [];
  const targetRoles = COMPLEMENTARY_ROLES[defaults.gremio] || [];

  for (const [candidateId, candidateDefaults] of Object.entries(SPECIES_DEFAULTS)) {
    if (candidateId === speciesId) continue;
    if (results.has(candidateId)) continue;
    if (antagonistSet.has(candidateId)) continue;

    // Verificar que el candidato no tenga al solicitante como antagonista
    const candidateAntagonists = new Set(candidateDefaults.antagonists || []);
    if (candidateAntagonists.has(speciesId)) continue;

    // Filtro funcional ANTES de scoring estructural (ADR-034)
    const incompatibilityReason = checkFunctionalCompatibility(defaults, candidateId, candidateDefaults);
    if (incompatibilityReason) continue;

    let score = 0;
    const reasons = [];

    // Bonus por estrato complementario
    if (targetStrata.includes(candidateDefaults.estrato)) {
      score += 30;
      reasons.push(`estrato ${candidateDefaults.estrato}`);
    }

    // Bonus por gremio complementario
    if (targetRoles.includes(candidateDefaults.gremio)) {
      score += 40;
      reasons.push(candidateDefaults.gremio.replace(/_/g, ' '));
    }

    // Bonus por ciclo similar (ambos anuales o ambos perennes) — coherencia temporal
    if (isAnnual(defaults) && isAnnual(candidateDefaults)) {
      score += 15;
      reasons.push('ciclo similar');
    } else if (isPerennial(defaults) && isPerennial(candidateDefaults)) {
      score += 15;
      reasons.push('ambos perennes');
    }

    if (score > 0) {
      const sp = speciesById.get(candidateId);
      if (sp) {
        results.set(candidateId, {
          id: candidateId,
          name: sp.name,
          reason: `Complementa: ${reasons.join(', ')}`,
          score,
        });
      }
    }
  }

  // Ordenar por score descendente, limitar a 8 mejores
  const sorted = Array.from(results.values())
    .sort((a, b) => b.score - a.score)
    .slice(0, 8);

  // Antagonistas resueltos para visualización
  const antagonists = (defaults.antagonists || [])
    .map((aId) => {
      const sp = speciesById.get(aId);
      const aDefaults = SPECIES_DEFAULTS[aId];
      return sp
        ? { id: aId, name: sp.name, reason: aDefaults ? 'Alelopatía negativa documentada' : 'Incompatibilidad reportada' }
        : null;
    })
    .filter(Boolean);

  return { companions: sorted, antagonists };
};

/**
 * Construye el prompt para consulta cognitiva via Ollama (Gemma 4).
 * El caller envía esto a /api/ollama/api/generate y parsea el JSON response.
 */
export const buildGuildPrompt = (speciesName, estrato) => {
  /* La finca sale del PERFIL del usuario (lo que ubicó en el onboarding), no
     de las variables de build: antes, en prod sin VITE_FARM_*, el gremio se
     pedía "en Colombia, piso térmico no especificada" aunque la persona
     acabara de ubicar su vereda. Las envs quedan de default de demo. */
  const geo = getContextoGeoFinca();
  const altitud = geo.altitudMsnm;
  const zonas = (geo.thermalZones || []).join(', ') || 'no especificada';
  const municipio = geo.municipio || 'Colombia';
  const ctxAltitud = altitud != null
    ? `a ${altitud} msnm (piso térmico: ${zonas})`
    : `(piso térmico: ${zonas})`;
  return `Basado en principios de agroecología de Jairo Restrepo y permacultura (diseño de gremios), sugiere 3 plantas acompañantes para ${speciesName} en estrato ${estrato} en ${municipio} ${ctxAltitud}. Considera el rango colombiano completo desde el páramo (>3000m) hasta el nivel del mar al evaluar compañeros viables. CRITERIOS FUNCIONALES OBLIGATORIOS: (1) compatibilidad de ciclo (no mezclar hortalizas anuales con perennes de gran porte), (2) compatibilidad de sombra (no sugerir companions que proyecten sombra densa sobre cultivos sun-loving), (3) compatibilidad de estrato. Responde SOLO en formato JSON array: [{"name":"Nombre común (Nombre científico)","reason":"Razón agroecológica breve incluyendo criterios de ciclo + sombra + estrato"}]. No añadas texto fuera del JSON.`;
};

/**
 * Selecciona los N assets más relevantes para un query dado.
 * Implementa scoring por relevancia para evitar context overflow en LLMs
 * cuando hay muchos assets (ej. 10K plantas).
 *
 * Scoring:
 *   - +10 si nombre contiene palabras del query (case-insensitive)
 *   - +5 si especie matchea
 *   - +3 si zona matchea
 *   - +2 si registrado en últimos 30 días (recencia)
 *   - +1 si tiene logs recientes
 *
 * @param {string} query - Query del usuario
 * @param {Array} allAssets - Lista de assets del store
 * @param {number} maxN - Máximo número de assets a retornar (default 50)
 * @returns {Array} - Top maxN assets ordenados por score
 */
export function selectRelevantAssets(query, allAssets, maxN = DEFAULT_MAX_ASSETS) {
  if (!allAssets || allAssets.length === 0) return [];
  if (allAssets.length <= maxN) return allAssets; // Fast path: no need to filter

  const queryLower = query.toLowerCase().trim();
  const queryWords = queryLower.split(/\s+/).filter(Boolean);
  const now = Date.now();
  const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

  const scored = allAssets.map((asset) => {
    let score = 0;
    const name = (asset.attributes?.name || asset.attributes?.species?.name || '').toLowerCase();
    const species = (asset.attributes?.species_slug || '').toLowerCase();
    const zone = (asset.relationships?.location?.data?.id || '').toLowerCase();
    const created = asset.attributes?.created || asset.created || 0;
    const hasLogs = asset.logs?.length > 0 || asset.relationships?.logs?.data?.length > 0;

    // +10: nombre contiene palabras del query
    for (const word of queryWords) {
      if (name.includes(word)) {
        score += 10;
        break;
      }
    }

    // +5: especie matchea
    for (const word of queryWords) {
      if (species.includes(word)) {
        score += 5;
        break;
      }
    }

    // +3: zona matchea
    for (const word of queryWords) {
      if (zone.includes(word)) {
        score += 3;
        break;
      }
    }

    // +2: registrado en últimos 30 días (recencia)
    if (now - created < THIRTY_DAYS_MS) {
      score += 2;
    }

    // +1: tiene logs recientes
    if (hasLogs) {
      score += 1;
    }

    return { asset, score };
  });

  return scored
    .sort((a, b) => b.score - a.score)
    .slice(0, maxN)
    .map((s) => s.asset);
}

/**
 * Construye contexto resumido de assets para LLM.
 * Limita a top-N relevantes para evitar context overflow.
 *
 * @param {string} query - Query original
 * @param {Array} allAssets - Todos los assets
 * @param {number} maxN - Máximo assets (default 50)
 * @returns {string} - Contexto formateado para LLM
 */
export function buildAssetContext(query, allAssets, maxN = DEFAULT_MAX_ASSETS) {
  const relevant = selectRelevantAssets(query, allAssets, maxN);

  return relevant
    .map((a) => {
      const name = a.attributes?.name || 'Sin nombre';
      const species = a.attributes?.species?.name || a.attributes?.species_slug || 'desconocida';
      const zone = a.relationships?.location?.data?.id || 'sin zona';
      return `- ${name} (${species}) [zona: ${zone}]`;
    })
    .join('\n');
}

// ============================================================================
// L1.9 — Sugerencia de gremios y policultivos vía RAG
// ============================================================================
//
// El motor `getSuggestedCompanions` (Capas 1+2) opera sobre datos curados a
// mano en `speciesDefaults.js`. Es exacto pero limitado al subset validado
// (~165 species). Las siguientes funciones complementan ese path con consultas
// RAG sobre `public/cycle-content/*.json` (~500+ species), que sí cubre todo
// el catálogo. Quien consume decide qué capa usa:
//
//   - UI síncrona / sin red               → getSuggestedCompanions (estática)
//   - UI con corpus disponible / detalle  → suggestGuildsFor (asíncrona)
//
// No se reemplaza la capa estática: complemento ortogonal.

const CYCLE_CONTENT_PATH = '/cycle-content/';

// Cache de docs JSON ya fetcheados durante la sesión para evitar
// re-fetch del mismo species entre llamadas a suggestGuildsFor /
// suggestPolyculture.
const _cycleDocCache = new Map();

/**
 * Carga el JSON de `public/cycle-content/<slug>.json` con cache de sesión.
 * Devuelve `null` si falla, no lanza.
 *
 * Misma defensa que voiceRagEnricher: validar content-type para evitar que
 * el fallback SPA del Vite dev server devuelva HTML disfrazado de JSON.
 */
async function _loadCycleDoc(slug) {
  if (!slug || typeof slug !== 'string') return null;
  if (_cycleDocCache.has(slug)) return _cycleDocCache.get(slug);
  try {
    const res = await fetch(`${CYCLE_CONTENT_PATH}${slug}.json`);
    if (!res.ok) {
      _cycleDocCache.set(slug, null);
      return null;
    }
    const ct = res.headers.get('content-type') || '';
    if (!ct.includes('json')) {
      _cycleDocCache.set(slug, null);
      return null;
    }
    const data = await res.json();
    _cycleDocCache.set(slug, data);
    return data;
  } catch (err) {
    console.warn(`[guildService] failed to load cycle-content for ${slug}:`, err);
    _cycleDocCache.set(slug, null);
    return null;
  }
}

/**
 * Parsea bloques markdown del corpus con formato:
 *   - slug_species — Nombre común (Nombre científico)
 *
 * Tolerante: acepta tanto guión largo (—) como guión simple (-). Si no
 * encuentra el separador, devuelve el slug como nombre. Pierde silenciosamente
 * líneas que no comiencen con "- ".
 */
export function parseCompanionsMarkdown(md) {
  if (typeof md !== 'string' || !md) return [];
  const lines = md.split('\n');
  const out = [];
  for (const line of lines) {
    const m = line.match(/^\s*-\s+([a-z][a-z0-9_]+)\s*(?:[—-]\s*(.+))?\s*$/i);
    if (!m) continue;
    const slug = m[1].toLowerCase();
    // Heurística: descarta tokens que no parecen species_slug (ej. items de
    // listas no-companion en bullet points encadenados).
    if (!slug.includes('_')) continue;
    const name = (m[2] || '').trim() || slug;
    out.push({ slug, name });
  }
  return out;
}

/**
 * Resuelve el nombre legible de un species_slug a partir de CROP_TAXONOMY,
 * cycle-content cacheado o el propio slug como último recurso.
 */
function _resolveSpeciesName(slug, doc = null) {
  const fromTaxonomy = speciesById.get(slug);
  if (fromTaxonomy?.name) return fromTaxonomy.name;
  if (doc) {
    if (Array.isArray(doc.common_names) && doc.common_names[0]) return doc.common_names[0];
    if (doc.scientific_name) return doc.scientific_name;
  }
  return slug;
}

/**
 * Compone `strata` (capas verticales) para el gremio sugerido. El estrato
 * viene de `speciesDefaults` cuando existe (más confiable) y se infiere del
 * cycle-content como fallback usando `roles_in_guild` y `radiacion`.
 *
 * Cobertura intencionalmente conservadora: si no hay señal clara, omitir.
 */
function _inferStratum(slug, doc) {
  const defaults = SPECIES_DEFAULTS[slug];
  if (defaults?.estrato) return defaults.estrato;
  if (!doc) return null;
  const roles = Array.isArray(doc.roles_in_guild) ? doc.roles_in_guild : [];
  if (roles.includes('canopy') || roles.includes('emergent')) return 'alto';
  if (roles.includes('shrub') || roles.includes('understory')) return 'medio';
  if (roles.includes('groundcover') || roles.includes('herb')) return 'bajo';
  if (doc.requirements?.radiacion === 'sombra' || doc.requirements?.radiacion === 'sombra_parcial') {
    return 'medio';
  }
  return null;
}

/**
 * Sugiere gremios (companions + antagonists + capas verticales) para una
 * species apoyándose en el RAG y el JSON estructurado del catálogo.
 *
 * Pipeline:
 *   1. `retrieve("companion antagonist " + species, 10)` para localizar el
 *      species_slug correcto vía BM25 (mismo truco que voiceRagEnricher).
 *   2. Por cada species_slug presente en los hits (con prioridad al que más
 *      cobertura tenga), fetch del JSON completo y extracción estructurada
 *      de `companions_markdown` + `antagonists` + `antagonists_markdown`.
 *   3. Estratos: una entrada por cada species mencionada (target + companions
 *      + antagonists conocidos), usando `_inferStratum`.
 *   4. Dedup por slug — un species solo aparece una vez en cada lista.
 *
 * Si el RAG no tiene cobertura (corpus cold / offline), degrada al curado de
 * `getSuggestedCompanions` para no devolver vacío. La forma de salida sigue
 * siendo `{ companions, antagonists, strata }`.
 *
 * @param {string} speciesSlug - slug del catálogo (ej. 'coffea_arabica')
 * @returns {Promise<{
 *   companions: Array<{slug:string, name:string, reason:string}>,
 *   antagonists: Array<{slug:string, name:string, reason:string}>,
 *   strata: Array<{species:string, layer:string}>
 * }>}
 */
export async function suggestGuildsFor(speciesSlug) {
  if (!speciesSlug || typeof speciesSlug !== 'string') {
    return { companions: [], antagonists: [], strata: [] };
  }

  // 1. Recuperar passages relevantes. El query busca tanto companions como
  //    antagonists para que BM25 priorice los docs que tienen ambos campos.
  let hits = [];
  try {
    hits = await retrieve(`companion antagonist ${speciesSlug}`, 10);
  } catch (err) {
    console.warn('[guildService] retrieve failed, falling back to static:', err);
    hits = [];
  }

  // 2. Construir el conjunto de slugs candidatos: target + todos los species
  //    que aparecen en los hits con score > 0. Damos preferencia al target
  //    pidiendo su JSON aunque no esté en los hits (puede no tener docs largos).
  const candidateSlugs = new Set([speciesSlug]);
  for (const h of hits) {
    if (h?.species && h.score > 0) candidateSlugs.add(h.species);
  }

  const companionsMap = new Map();    // slug → { slug, name, reason }
  const antagonistsMap = new Map();
  const strataMap = new Map();        // species → layer

  // El target siempre tiene su estrato si está en defaults
  const targetDoc = await _loadCycleDoc(speciesSlug);
  const targetStratum = _inferStratum(speciesSlug, targetDoc);
  if (targetStratum) strataMap.set(speciesSlug, targetStratum);

  // 3. Por cada candidato, parsear companions/antagonists markdown
  for (const slug of candidateSlugs) {
    const doc = slug === speciesSlug ? targetDoc : await _loadCycleDoc(slug);
    if (!doc) continue;

    // El doc del propio target define companions y antagonists "directos".
    // Los docs de OTRAS species solo contribuyen estratos (no merge cruzado
    // de companions para no diluir la sugerencia al target).
    if (slug === speciesSlug) {
      // Companions desde markdown
      const compEntries = parseCompanionsMarkdown(doc.companions_markdown);
      for (const c of compEntries) {
        if (c.slug === speciesSlug) continue;
        if (companionsMap.has(c.slug)) continue;
        const name = _resolveSpeciesName(c.slug) || c.name;
        companionsMap.set(c.slug, {
          slug: c.slug,
          name,
          reason: 'Asociación favorable documentada en el catálogo',
        });
      }

      // Antagonists: campo estructurado (array de slugs) + markdown (fallback)
      const antSlugs = Array.isArray(doc.antagonists) ? doc.antagonists : [];
      for (const aSlug of antSlugs) {
        if (typeof aSlug !== 'string' || aSlug === speciesSlug) continue;
        if (antagonistsMap.has(aSlug)) continue;
        antagonistsMap.set(aSlug, {
          slug: aSlug,
          name: _resolveSpeciesName(aSlug),
          reason: 'Antagonista (comparte plagas o compite por recursos)',
        });
      }
      const antMdEntries = parseCompanionsMarkdown(doc.antagonists_markdown);
      for (const a of antMdEntries) {
        if (a.slug === speciesSlug) continue;
        if (antagonistsMap.has(a.slug)) continue;
        antagonistsMap.set(a.slug, {
          slug: a.slug,
          name: _resolveSpeciesName(a.slug) || a.name,
          reason: 'Antagonista (comparte plagas o compite por recursos)',
        });
      }
    }

    // Estratos: registrar layer del candidato (incluyendo target ya hecho)
    if (!strataMap.has(slug)) {
      const layer = _inferStratum(slug, doc);
      if (layer) strataMap.set(slug, layer);
    }
  }

  // 4. Fallback al curado si el RAG no devolvió companions ni antagonists.
  //    Reusa los datos validados a mano para evitar pantalla vacía cuando
  //    el corpus está cold o la red está offline en la primera carga.
  if (companionsMap.size === 0 && antagonistsMap.size === 0) {
    const fallback = getSuggestedCompanions(speciesSlug);
    for (const c of fallback.companions) {
      companionsMap.set(c.id, {
        slug: c.id,
        name: c.name,
        reason: c.reason || 'Compañero validado en catálogo curado',
      });
    }
    for (const a of fallback.antagonists) {
      antagonistsMap.set(a.id, {
        slug: a.id,
        name: a.name,
        reason: a.reason || 'Antagonista validado en catálogo curado',
      });
    }
  }

  // Asegurar estrato para companions/antagonists conocidos en defaults
  // aunque no hayan tenido doc cargado.
  for (const slug of [...companionsMap.keys(), ...antagonistsMap.keys()]) {
    if (strataMap.has(slug)) continue;
    const layer = _inferStratum(slug, null);
    if (layer) strataMap.set(slug, layer);
  }

  const strata = Array.from(strataMap.entries()).map(([species, layer]) => ({ species, layer }));

  return {
    companions: Array.from(companionsMap.values()),
    antagonists: Array.from(antagonistsMap.values()),
    strata,
  };
}

/**
 * Sugiere otras species que complementen un conjunto de cultivos ya plantados.
 *
 * Lógica:
 *   1. Para cada species en el array, obtener su `suggestGuildsFor`.
 *   2. Acumular companions con un contador (votos): species sugerida por
 *      varios cultivos pesa más.
 *   3. Excluir las species que ya están en el array de entrada.
 *   4. Excluir species que aparecen como antagonista de ALGUNO de los
 *      cultivos del array (incompatibilidad veto).
 *   5. Ordenar por número de votos descendente y devolver top 8.
 *
 * Devuelve la misma forma que `suggestGuildsFor` para mantener consistencia
 * con consumidores existentes: el array `strata` une los estratos de todas
 * las species evaluadas.
 *
 * @param {Array<string>} speciesSlugs - cultivos ya plantados
 * @returns {Promise<{
 *   companions: Array<{slug:string, name:string, reason:string, votes:number}>,
 *   antagonists: Array<{slug:string, name:string, reason:string}>,
 *   strata: Array<{species:string, layer:string}>
 * }>}
 */
export async function suggestPolyculture(speciesSlugs) {
  if (!Array.isArray(speciesSlugs) || speciesSlugs.length === 0) {
    return { companions: [], antagonists: [], strata: [] };
  }

  const planted = new Set(speciesSlugs.filter((s) => typeof s === 'string' && s));
  if (planted.size === 0) return { companions: [], antagonists: [], strata: [] };

  // Pull guilds en paralelo (cada uno hace su propio retrieve + loadCycleDoc,
  // que están cacheados). Promise.all es seguro porque ningún branch lanza.
  const guilds = await Promise.all(
    Array.from(planted).map((slug) => suggestGuildsFor(slug).catch(() => null))
  );

  const voteMap = new Map();           // slug → { slug, name, votes, reasons:Set }
  const antagonistVeto = new Set();    // slug → bloqueado por ser antagonista de cualquiera
  const antagonistDetails = new Map(); // slug → { slug, name, reason }
  const strataMap = new Map();

  for (const g of guilds) {
    if (!g) continue;
    for (const a of g.antagonists) {
      antagonistVeto.add(a.slug);
      if (!antagonistDetails.has(a.slug)) antagonistDetails.set(a.slug, a);
    }
    for (const { species, layer } of g.strata) {
      if (!strataMap.has(species)) strataMap.set(species, layer);
    }
  }

  for (const g of guilds) {
    if (!g) continue;
    for (const c of g.companions) {
      if (planted.has(c.slug)) continue;        // ya está plantada
      if (antagonistVeto.has(c.slug)) continue; // veto cruzado
      const cur = voteMap.get(c.slug) || {
        slug: c.slug,
        name: c.name,
        votes: 0,
        reasons: new Set(),
      };
      cur.votes += 1;
      if (c.reason) cur.reasons.add(c.reason);
      voteMap.set(c.slug, cur);
    }
  }

  const companions = Array.from(voteMap.values())
    .map((v) => ({
      slug: v.slug,
      name: v.name,
      votes: v.votes,
      reason:
        v.votes > 1
          ? `Compañero de ${v.votes} cultivos plantados`
          : Array.from(v.reasons)[0] || 'Compañero sugerido por el catálogo',
    }))
    .sort((a, b) => b.votes - a.votes)
    .slice(0, 8);

  const strata = Array.from(strataMap.entries()).map(([species, layer]) => ({ species, layer }));

  return {
    companions,
    antagonists: Array.from(antagonistDetails.values()),
    strata,
  };
}

/**
 * Reset del cache de cycle-content. Solo expuesto para tests; en runtime el
 * cache vive lo que vive la sesión y se purga al recargar la PWA.
 *
 * @private
 */
export function _resetGuildCache() {
  _cycleDocCache.clear();
}

export default getSuggestedCompanions;
