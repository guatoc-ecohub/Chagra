/**
 * hojaVidaMataService.js — Hoja de vida por mata (cruza logs de finca + grafo AGE).
 *
 * Motivación (idea #3 backlog consolidado 2026-08-02): generar una hoja de vida
 * unificada por cada mata individual que combine:
 *   1. La identidad de la mata (FarmProcess individual)
 *   2. La cronología de eventos (farm_process_events)
 *   3. El conocimiento del grafo AGE vía MCP (companions, biopreparados, fenología)
 *   4. Observaciones registradas y evidencia multimedia
 *
 * Este servicio NO crea nuevos datos — solo orquesta lecturas de:
 *   - farmProcessCache (proceso + eventos)
 *   - plantDossierService (fenología + companions + bioinsumos)
 *   - sidecarClient/MCP (get_species para ficha técnica completa)
 *
 * Contrato: NUNCA lanza. Cada fuente degrada con gracia (offline / MCP caído).
 * La hoja de vida siempre devuelve algo renderizable, marcando con flags
 * de dónde salió cada bloque.
 */

import { getFarmProcess, getFarmEvents } from '../db/farmProcessCache';
import { buildPlantDossier } from './plantDossierService';
import { callTool } from './sidecarClient';
import { MSG } from '../config/messages';

/**
 * Normaliza una entrada de species del MCP (get_species).
 * El sidecar puede devolver shapes variables — extraemos lo seguro.
 */
function normalizeSpeciesProfile(raw) {
  if (!raw || typeof raw !== 'object') return null;
  
  return {
    id: raw.canonical_id || raw.id || raw.slug || '',
    nombre_comun: raw.nombre_comun || raw.name || raw.common_name || '',
    nombre_cientifico: raw.nombre_cientifico || raw.scientific_name || '',
    familia_botanica: raw.familia_botanica || raw.family || '',
    ciclo_vida: raw.ciclo_vida || raw.life_cycle || '',
    altitud_min: typeof raw.altitud_min === 'number' ? raw.altitud_min : null,
    altitud_max: typeof raw.altitud_max === 'number' ? raw.altitud_max : null,
    piso_termico: raw.piso_termico || raw.thermal_floor || '',
    usos: Array.isArray(raw.usos) ? raw.usos : [],
    descripcion: raw.descripcion || raw.description || '',
    origen: raw.origen || raw.origin || '',
    fuente: raw.fuente || raw.source || 'MCP',
    found: raw.found === true,
  };
}

/**
 * Obtiene la ficha técnica de la especie desde el grafo AGE (MCP).
 * @param {string} speciesSlug
 * @returns {Promise<null | object>}
 */
async function getSpeciesProfile(speciesSlug) {
  try {
    const res = await callTool('get_species', { species_id: speciesSlug });
    if (res && !res._error && res.found !== false) {
      return normalizeSpeciesProfile(res);
    }
  } catch (_) {
    // graceful: MCP opcional
  }
  return null;
}

/**
 * Obtiene la cronología de eventos de un proceso, enriquecida con
 * etiquetas legibles para humanos.
 * @param {string} processId
 * @returns {Promise<Array>}
 */
async function getEventTimeline(processId) {
  let events = [];
  try {
    events = await getFarmEvents(processId);
  } catch (_) {
    return [];
  }
  
  if (!Array.isArray(events)) return [];
  
  // Ordenar por occurred_at DESC (más reciente primero)
  return events
    .filter(e => e && e.attributes)
    .sort((a, b) => {
      const ta = a.attributes.occurred_at || 0;
      const tb = b.attributes.occurred_at || 0;
      return tb - ta;
    })
    .map(e => ({
      event_id: e.event_id,
      event_type: e.attributes.event_type,
      occurred_at: e.attributes.occurred_at,
      actor: e.attributes.actor,
      source: e.attributes.source,
      payload: e.attributes.payload || {},
      confidence: e.attributes.confidence,
      evidence: e.attributes.evidence,
      // Etiquetas legibles para UI
      tipo_legible: getEventTypeLabel(e.attributes.event_type),
    }));
}

/**
 * Mapea un event_type a etiqueta legible para humanos.
 */
function getEventTypeLabel(eventType) {
  return MSG.eventTypes[eventType] || eventType;
}

/**
 * Agrega contadores agregados a la cronología de eventos.
 */
function summarizeTimeline(events) {
  const summary = {
    total_eventos: events.length,
    por_tipo: {},
    primer_evento: null,
    ultimo_evento: null,
  };
  
  if (events.length === 0) return summary;
  
  // Contar por tipo
  for (const e of events) {
    const tipo = e.event_type || 'unknown';
    summary.por_tipo[tipo] = (summary.por_tipo[tipo] || 0) + 1;
  }
  
  // Primer y último evento (por occurred_at)
  const sorted = [...events].sort((a, b) => a.occurred_at - b.occurred_at);
  summary.primer_evento = sorted[0]?.occurred_at || null;
  summary.ultimo_evento = sorted[sorted.length - 1]?.occurred_at || null;
  
  return summary;
}

/**
 * Compone la hoja de vida completa de una mata.
 *
 * @param {string} processId — ID del FarmProcess que representa la mata
 * @returns {Promise<{
 *   mata: object | null,
 *   especie_mcp: object | null,
 *   dossier: object | null,
 *   cronologia: Array,
 *   resumen_cronologia: object,
 *   metadata: object,
 * }>}
 */
export async function buildHojaVidaMata(processId) {
  if (!processId || typeof processId !== 'string') {
    return {
      mata: null,
      especie_mcp: null,
      dossier: null,
      cronologia: [],
      resumen_cronologia: summarizeTimeline([]),
      metadata: {
        error: 'process_id requerido',
        generated_at: Date.now(),
      },
    };
  }
  
  // 1. Obtener el proceso (la mata)
  let mata = null;
  try {
    mata = await getFarmProcess(processId);
  } catch (_) {
    mata = null;
  }
  
  // Si no hay mata, devolver esqueleto vacío
  if (!mata) {
    return {
      mata: null,
      especie_mcp: null,
      dossier: null,
      cronologia: [],
      resumen_cronologia: summarizeTimeline([]),
      metadata: {
        error: 'proceso_no_encontrado',
        process_id: processId,
        generated_at: Date.now(),
      },
    };
  }

  const attrs = /** @type {import('../types/farmProcess').FarmProcessAttributes} */ (mata.attributes || {});
  const speciesSlug = attrs.subject_slug || '';
  
  // 2. Obtener cronología de eventos en paralelo
  const [cronologia, speciesMcp, dossier] = await Promise.all([
    getEventTimeline(processId),
    getSpeciesProfile(speciesSlug),
    // Solo construir dossier si hay slug de especie
    speciesSlug 
      ? buildPlantDossier({ cropSlug: speciesSlug, canonical: attrs.subject_label }).catch(() => null)
      : Promise.resolve(null),
  ]);
  
  const resumen = summarizeTimeline(cronologia);
  
  return {
    mata: {
      process_id: mata.process_id,
      tipo: mata.type,
      attributes: {
        process_type: attrs.process_type,
        subject_kind: attrs.subject_kind,
        subject_slug: attrs.subject_slug,
        subject_label: attrs.subject_label,
        quantity: attrs.quantity,
        unit: attrs.unit,
        location_land_asset_id: attrs.location_land_asset_id,
        status: attrs.status,
        current_stage: attrs.current_stage,
        created_at: attrs.created_at,
        updated_at: attrs.updated_at,
      },
    },
    especie_mcp: speciesMcp,
    dossier: dossier,
    cronologia,
    resumen_cronologia: resumen,
    metadata: {
      generated_at: Date.now(),
      source: 'hojaVidaMataService',
      offline_mode: speciesMcp === null,
    },
  };
}

/**
 * Obtiene múltiples hojas de vida (batch) para una lista de processIds.
 * Útil para vistas de lote o dashboard.
 *
 * @param {string[]} processIds
 * @returns {Promise<Array<object>>}
 */
export async function buildHojaVidaMataBatch(processIds) {
  if (!Array.isArray(processIds) || processIds.length === 0) {
    return [];
  }
  
  // Limitar a 10 hojas de vida por batch para evitar sobrecarga
  const limited = processIds.slice(0, 10);
  
  const pending = limited.map(pid => 
    buildHojaVidaMata(pid).catch(err => ({
      mata: null,
      especie_mcp: null,
      dossier: null,
      cronologia: [],
      resumen_cronologia: summarizeTimeline([]),
      metadata: {
        error: err?.message || 'unknown_error',
        process_id: pid,
        generated_at: Date.now(),
      },
    }))
  );
  
  return Promise.all(pending);
}

// Exportar para testing
export const __TEST__ = {
  normalizeSpeciesProfile,
  getEventTypeLabel,
  summarizeTimeline,
};
