/**
 * voiceToDraft — adaptador de la extracción por voz a FarmProcessDraft.
 *
 * Reusa el extractor actual de voz y el enriquecedor RAG. NO guarda nada.
 * Produce un borrador que pasa a VoiceConfirmation (Task 18) para revisión
 * humana antes de persistir.
 *
 * No rompe VoiceCapture/VoiceConfirmation — se conecta después del RAG
 * enrichment, antes de la confirmación.
 */
import { newUlid } from '../utils/id';
import { resolveSpeciesDefaults } from '../config/speciesDefaults';

/**
 * @typedef {Object} FarmProcessDraft
 * @property {string} draft_id — ULID temporario
 * @property {string} transcription — texto original de voz
 * @property {'sowing'|'restoration'} process_type
 * @property {string} subject_slug — slug del catálogo
 * @property {string} subject_label — nombre común resuelto
 * @property {string} [variety]
 * @property {number} quantity
 * @property {string} unit
 * @property {'individual'|'aggregate'} subject_kind — tracking mode
 * @property {string} location_land_asset_id — ID del land resuelto
 * @property {string} [location_land_label]
 * @property {Array} [companions] - del RAG
 * @property {Array} [antagonists] - del RAG
 * @property {Array} [biopreparados] - del RAG
 * @property {boolean} invasive
 * @property {string[]} warnings
 */

/**
 * Convierte la salida del pipeline de voz (entidades extraídas + RAG) en
 * un FarmProcessDraft listo para confirmación.
 *
 * @param {Object} input
 * @param {string} input.transcription — texto original
 * @param {Array<{crop:string, quantity:number, location:string, _ragInsights?:Object}>} input.entities — entidades extraídas
 * @param {function} [input.resolveLocation] - (rawLocation) => {id, type, label} | null
 * @param {function} [input.resolveCrop] - (cropName) => {slug, label, variety, tracking_mode}
 * @returns {FarmProcessDraft[]} — un draft por entidad
 */
/**
 * Detecta el TIPO de proceso productivo desde la transcripción (heurística por
 * palabras clave). Soporta reforestación/restauración, silvopastoreo, cosecha,
 * post-cosecha y manejo de plagas además de la siembra normal. process_type
 * válido en types/farmProcess.
 * @param {string} text
 * @returns {'sowing'|'restoration'|'silvopasture'|'harvest'|'post_harvest'|'pest_management'}
 */
export function detectProcessType(text) {
  const t = (text || '').toLowerCase();
  if (/silvopast|silvo-?past|\bganad\w* con (árbol|arbol|sombr)|leucaena|sombr\w* para (el )?ganado|árboles? con (pasto|ganado)/.test(t)) {
    return 'silvopasture';
  }
  if (/reforest|restaur|reforesté|árboles? (nativ|para|en el bosque)|\bbosque\b|revegetar?|enriquec\w* el bosque|roble|quercus|nogal|cativo/.test(t)) {
    return 'restoration';
  }
  if (/secad|almacen|poscosech|beneficiad/.test(t)) {
    return 'post_harvest';
  }
  if (/fumig|control de (broca|plaga)|aplic/.test(t)) {
    return 'pest_management';
  }
  if (/cosech|recolect/.test(t)) {
    return 'harvest';
  }
  return 'sowing';
}

export const buildDraftsFromVoice = ({
  transcription,
  entities,
  processType,
  resolveLocation = defaultResolveLocation,
  resolveCrop = defaultResolveCrop,
}) => {
  if (!Array.isArray(entities) || entities.length === 0) return [];

  const ptype = processType || detectProcessType(transcription);

  return entities.map((e) => {
    const cropInfo = resolveCrop(e.crop);
    const locInfo = resolveLocation(e.location);
    const defaults = cropInfo.slug ? resolveSpeciesDefaults(cropInfo.slug) : null;
    const trackingMode = defaults?.tracking_mode || 'individual';
    const insights = e._ragInsights || null;

    const unit = (() => {
      if (ptype === 'restoration' || ptype === 'silvopasture') return 'árboles';
      if (ptype === 'harvest' || ptype === 'post_harvest') return 'kg';
      if (ptype === 'pest_management') return 'litros';
      return trackingMode === 'individual' ? 'plantas' : 'semillas';
    })();

    return {
      draft_id: newUlid(),
      transcription,
      process_type: ptype,
      subject_slug: cropInfo.slug || '',
      subject_label: cropInfo.label || e.crop,
      variety: cropInfo.variety || undefined,
      quantity: e.quantity || 1,
      unit,
      subject_kind: trackingMode,
      location_land_asset_id: locInfo?.id || '',
      location_land_label: locInfo?.label || undefined,
      companions: insights?.companions || [],
      antagonists: insights?.antagonists || [],
      biopreparados: insights?.biopreparados || [],
      invasive: insights?.invasive || false,
      warnings: insights?.warnings || [],
    };
  });
};

/**
 * Resolución por defecto de ubicación — devuelve siempre null.
 * La resolución real se inyecta desde VoiceConfirmation (que usa el store).
 */
function defaultResolveLocation(/** @type {any} */ _loc) {
  return null;
}

/**
 * Resolución por defecto de cultivo — usa el nombre crudo.
 */
function defaultResolveCrop(crop) {
  return { slug: '', label: crop, variety: null };
}
