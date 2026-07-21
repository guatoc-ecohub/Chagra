/**
 * plantDossierService.js — Agregador único del "dossier de planta por voz".
 *
 * Motivación (módulo unificado de voz, 2026-06-15): el flujo de voz ya agrega
 * una planta (VoiceCapture → savePayload seeding → FarmProcess autocreado) y la
 * confirmación muestra companions/antagonistas/biopreparados del RAG. Pero, una
 * vez guardada, el usuario NO veía en un solo lugar:
 *   1. el CICLO GENEALÓGICO de la planta (fenología: etapas siembra→cosecha),
 *   2. los BIOINSUMOS/biopreparados aplicables a esa especie,
 *   3. TODOS los ciclos (FarmProcess) asociados a esa planta,
 *   4. + las SUGERENCIAS (companions) y ANTAGONISTAS.
 *
 * Este servicio NO inventa datos ni reimplementa lógica: orquesta los servicios
 * existentes y devuelve un objeto plano renderizable. Reutiliza:
 *   - phenologyTemplates.getTemplate         → ciclo genealógico (etapas)
 *   - guildService.suggestGuildsFor          → companions + antagonistas + estratos
 *     (RAG sobre cycle-content + fallback curado offline)
 *   - climateCycleService.getBiopreparadosForStage → biopreparados por etapa
 *   - sidecarClient.callTool(get_biopreparados/get_companions) → grafo AGE (online)
 *   - farmProcessCache.listFarmProcesses     → ciclos asociados (FarmProcess)
 *
 * Contrato: NUNCA lanza. Cada fuente degrada con gracia (offline / corpus cold /
 * AGE caído) — el dossier siempre devuelve algo renderizable, marcando con flags
 * de dónde salió cada bloque.
 */

import { getTemplate } from '../data/phenologyTemplates';
import { suggestGuildsFor } from './guildService';
import { getBiopreparadosForStage } from './climateCycleService';
import { callTool } from './sidecarClient';
import { listFarmProcesses } from '../db/farmProcessCache';

// Etapas en las que el catálogo local sugiere biopreparados (climateCycleService).
// Se recorren todas para componer el set completo aplicable a la especie, no
// solo a la etapa actual del ciclo.
const BIO_STAGES = ['vegetative', 'flowering', 'fruiting', 'harvest_window'];

/**
 * Normaliza un nombre de companion/antagonista venido del grafo AGE. El sidecar
 * puede devolver strings o {especie|nombre_comun|nombre_cientifico|id}.
 */
function normalizeGraphSpecies(raw) {
  if (!raw) return null;
  if (typeof raw === 'string') {
    const s = raw.trim();
    return s ? { slug: '', name: s } : null;
  }
  if (typeof raw === 'object') {
    const name = raw.nombre_comun || raw.especie || raw.name || raw.nombre_cientifico || '';
    const slug = raw.canonical_id || raw.id || raw.slug || '';
    if (!name && !slug) return null;
    return { slug: String(slug), name: String(name || slug).trim() };
  }
  return null;
}

/**
 * Deduplica una lista de {slug,name,reason} por slug (o por name si no hay slug).
 * El primero gana (conserva la razón más específica que llegue primero).
 */
function dedupeBySlug(list) {
  const seen = new Set();
  const out = [];
  for (const item of list) {
    if (!item) continue;
    const key = (item.slug || item.name || '').toLowerCase();
    if (!key || seen.has(key)) continue;
    seen.add(key);
    out.push(item);
  }
  return out;
}

/**
 * Biopreparados aplicables a una especie. Une dos fuentes:
 *   - AGE (sidecar get_biopreparados) cuando hay conexión — recetas del grafo.
 *   - Catálogo local por etapa (climateCycleService.getBiopreparadosForStage)
 *     recorriendo las etapas con recomendación → cobertura offline garantizada.
 *
 * @param {string} speciesSlug
 * @returns {Promise<{items: Array<{nombre:string, uso:string, etapa?:string, source:'grafo'|'catalogo'}>, fromGraph:boolean}>}
 */
export async function getBioinsumosForPlant(speciesSlug) {
  const items = [];
  let fromGraph = false;

  // 1. Grafo AGE (online, defense-in-depth: callTool degrada a null/ToolError).
  try {
    const res = await callTool('get_biopreparados', { species_id: speciesSlug });
    const recipes = res && !res._error
      ? (res.recipes || res.biopreparados || res.results || [])
      : [];
    if (Array.isArray(recipes) && recipes.length > 0) {
      fromGraph = true;
      for (const r of recipes) {
        const nombre = (r && (r.nombre || r.name)) || '';
        const uso = (r && (r.uso || r.descripcion || r.usage)) || '';
        if (nombre) items.push({ nombre: String(nombre), uso: String(uso), source: 'grafo' });
      }
    }
  } catch (_) { /* graceful: el grafo es opcional */ }

  // 2. Catálogo local por etapa (siempre disponible, offline-first).
  for (const stage of BIO_STAGES) {
    let bios = [];
    try { bios = getBiopreparadosForStage(stage) || []; } catch (_) { bios = []; }
    for (const b of bios) {
      if (b && b.nombre) {
        items.push({ nombre: String(b.nombre), uso: String(b.uso || ''), etapa: stage, source: 'catalogo' });
      }
    }
  }

  // Dedupe por nombre (un mismo biopreparado puede aparecer en varias etapas /
  // en el grafo y el catálogo). El grafo va primero, así su receta gana.
  const seen = new Set();
  const deduped = [];
  for (const it of items) {
    const key = it.nombre.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    deduped.push(it);
  }
  return { items: /** @type {Array<{nombre:string, uso:string, etapa?:string, source:'grafo'|'catalogo'}>} */ (deduped), fromGraph };
}

/**
 * Companions + antagonistas de una especie. Une el grafo AGE (online) con el
 * motor de gremios (guildService.suggestGuildsFor: RAG + curado offline). El
 * grafo enriquece; guildService garantiza cobertura offline.
 *
 * @param {string} speciesSlug
 * @returns {Promise<{
 *   companions: Array<{slug:string, name:string, reason:string}>,
 *   antagonists: Array<{slug:string, name:string, reason:string}>,
 *   strata: Array<{species:string, layer:string}>,
 *   fromGraph: boolean,
 * }>}
 */
export async function getRelationsForPlant(speciesSlug) {
  // Base: guildService (siempre devuelve algo — RAG o fallback curado).
  let base = { companions: [], antagonists: [], strata: [] };
  try { base = await suggestGuildsFor(speciesSlug); } catch (_) { /* keep empty */ }

  const companions = [...(base.companions || [])];
  const antagonists = [...(base.antagonists || [])];
  let fromGraph = false;

  // Enriquecer con el grafo AGE si hay conexión.
  try {
    const res = await callTool('get_companions', { species_id: speciesSlug });
    if (res && !res._error) {
      fromGraph = true;
      const gComp = Array.isArray(res.companions) ? res.companions : [];
      const gAnt = Array.isArray(res.antagonists) ? res.antagonists : [];
      for (const c of gComp) {
        const n = normalizeGraphSpecies(c);
        if (n) companions.push({ slug: n.slug, name: n.name, reason: 'Asociación favorable (grafo de conocimiento)' });
      }
      for (const a of gAnt) {
        const n = normalizeGraphSpecies(a);
        if (n) antagonists.push({ slug: n.slug, name: n.name, reason: 'Antagonista (grafo de conocimiento)' });
      }
    }
  } catch (_) { /* graceful */ }

  return {
    companions: dedupeBySlug(companions),
    antagonists: dedupeBySlug(antagonists),
    strata: base.strata || [],
    fromGraph,
  };
}

/**
 * Ciclo genealógico (fenología) de la especie: etapas siembra→cosecha con
 * fuentes. Devuelve null si no hay plantilla para el slug (el catálogo cubre
 * ~18 species con plantilla fenológica; el resto degrada a "sin plantilla").
 *
 * @param {string} speciesSlug
 * @returns {{template_id:string, species_label:string, stages:Array, sources:Array}|null}
 */
export function getCycleForPlant(speciesSlug) {
  try {
    return getTemplate(speciesSlug) || null;
  } catch (_) {
    return null;
  }
}

/**
 * Todos los ciclos (FarmProcess) asociados a una especie. Filtra los procesos
 * de IndexedDB por `subject_slug` (listFarmProcesses solo filtra por status/
 * process_type, así que el match por especie se hace aquí). Más recientes
 * primero (por updated_at, luego created_at).
 *
 * @param {string} speciesSlug
 * @returns {Promise<Array>} procesos FarmProcess
 */
export async function getAssociatedCycles(speciesSlug) {
  let all = [];
  try { all = await listFarmProcesses(); } catch (_) { return []; }
  if (!Array.isArray(all)) return [];
  const matched = all.filter((p) => p?.attributes?.subject_slug === speciesSlug);
  matched.sort((a, b) => {
    const ax = a.attributes?.updated_at || a.attributes?.created_at || '';
    const bx = b.attributes?.updated_at || b.attributes?.created_at || '';
    return String(bx).localeCompare(String(ax));
  });
  return matched;
}

/**
 * Compone el dossier completo de una planta agregada por voz. Reúne ciclo
 * genealógico + bioinsumos + ciclos asociados + companions/antagonistas en un
 * único objeto. NUNCA lanza: cada bloque degrada por separado.
 *
 * @param {{ cropSlug?:string, slug?:string, crop?:string, canonical?:string, label?:string }} plant
 *   entidad confirmada (la misma forma que VoiceConfirmation entrega a onConfirm)
 * @returns {Promise<{
 *   slug: string|null,
 *   label: string,
 *   cycle: object|null,
 *   bioinsumos: { items: Array, fromGraph: boolean },
 *   relations: { companions: Array, antagonists: Array, strata: Array, fromGraph: boolean },
 *   cycles: Array,
 * }>}
 */
export async function buildPlantDossier(plant) {
  const slug = (plant && (plant.cropSlug || plant.slug || /** @type {any} */ (plant).subject_slug)) || null;
  const label = (plant && (plant.canonical || plant.label || plant.crop || /** @type {any} */ (plant).subject_label)) || slug || 'Planta';

  // Sin slug canónico no podemos consultar grafo/fenología/gremios: devolvemos
  // el esqueleto vacío (la UI muestra el estado "sin ficha de catálogo").
  if (!slug) {
    return {
      slug: null,
      label,
      cycle: null,
      bioinsumos: { items: [], fromGraph: false },
      relations: { companions: [], antagonists: [], strata: [], fromGraph: false },
      cycles: [],
    };
  }

  const [bioinsumos, relations, cycles] = await Promise.all([
    getBioinsumosForPlant(slug).catch(() => ({ items: [], fromGraph: false })),
    getRelationsForPlant(slug).catch(() => ({ companions: [], antagonists: [], strata: [], fromGraph: false })),
    getAssociatedCycles(slug).catch(() => []),
  ]);
  const cycle = getCycleForPlant(slug);

  return { slug, label, cycle, bioinsumos, relations, cycles };
}

export const __TEST__ = {
  normalizeGraphSpecies,
  dedupeBySlug,
  BIO_STAGES,
};
