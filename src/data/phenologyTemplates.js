/**
 * phenologyTemplates — cargador de plantillas fenológicas versionadas.
 *
 * Task 21: Plantillas fuera de React, en JSON con fuentes y rangos.
 * Las plantillas se importan estáticamente (no fetch remoto) para que
 * el calculador sea testeable sin mock de red.
 *
 * Task 21 no implementa cálculo. Solo definir el tipo y el loader.
 * El cálculo es responsabilidad de phenologyCalculator (Task 22).
 */
import coffeaArabica from './phenology-templates/coffea_arabica.v1.json';
import solanumTuberosum from './phenology-templates/solanum_tuberosum.v1.json';
import solanumLycopersicum from './phenology-templates/solanum_lycopersicum.v1.json';
import zeaMays from './phenology-templates/zea_mays.v1.json';
import phaseolusVulgaris from './phenology-templates/phaseolus_vulgaris.v1.json';
import manihotEsculenta from './phenology-templates/manihot_esculenta.v1.json';
import musaParadisiaca from './phenology-templates/musa_paradisiaca.v1.json';
import perseaAmericana from './phenology-templates/persea_americana.v1.json';
import solanumBetaceum from './phenology-templates/solanum_betaceum.v1.json';
import solanumQuitoense from './phenology-templates/solanum_quitoense.v1.json';
import rubusGlaucus from './phenology-templates/rubus_glaucus.v1.json';
import physalisPeruviana from './phenology-templates/physalis_peruviana.v1.json';
import fragariaAnanassa from './phenology-templates/fragaria_ananassa.v1.json';
import lactucaSativa from './phenology-templates/lactuca_sativa.v1.json';
import alliumCepa from './phenology-templates/allium_cepa.v1.json';
import coriandrumSativum from './phenology-templates/coriandrum_sativum.v1.json';
import daucusCarota from './phenology-templates/daucus_carota.v1.json';
import pisumSativum from './phenology-templates/pisum_sativum.v1.json';

/**
 * @typedef {Object} PhenologyStage
 * @property {string} code — id de la etapa (sowing, emergence, vegetative, ...)
 * @property {string} label — nombre legible
 * @property {string} description — explicación
 * @property {number} minDays — días mínimos desde siembra
 * @property {number|null} maxDays — días máximos desde siembra (null = infinito / cerrado)
 * @property {number} sourceIndex — índice en el array sources del template
 */

/**
 * @typedef {Object} PhenologyTemplate
 * @property {string} template_id
 * @property {string} species_slug
 * @property {string} species_label
 * @property {number} version
 * @property {Array<{name:string, reference:string, url:string}>} sources
 * @property {PhenologyStage[]} stages
 * @property {{sowing_to_harvest_min_days?: number, sowing_to_harvest_max_days?: number, natural_death_days?: number}} [lifecycle] -
 *   bloque opcional de días explícitos siembra→cosecha/muerte natural (curado por especie),
 *   usado por phenologyCalculator.calculateLifecycleEnd cuando está presente.
 */

/** @type {Map<string, PhenologyTemplate>} */
const registry = new Map();

const templates = [
  coffeaArabica,
  solanumTuberosum,
  solanumLycopersicum,
  zeaMays,
  phaseolusVulgaris,
  manihotEsculenta,
  musaParadisiaca,
  perseaAmericana,
  solanumBetaceum,
  solanumQuitoense,
  rubusGlaucus,
  physalisPeruviana,
  fragariaAnanassa,
  lactucaSativa,
  alliumCepa,
  coriandrumSativum,
  daucusCarota,
  pisumSativum,
];

for (const t of templates) {
  registry.set(t.species_slug, /** @type {PhenologyTemplate} */ (t));
}

/**
 * Slugs de plantilla ordenados de más largo a más corto. Permite resolver un
 * cultivar/subespecie (slug largo) a la plantilla de su especie madre buscando
 * el prefijo más específico primero (ej. `solanum_tuberosum_pastusa_suprema`
 * antes de un hipotético `solanum`).
 * @type {string[]}
 */
const slugsByLength = Array.from(registry.keys()).sort((a, b) => b.length - a.length);

/**
 * Resuelve el slug de la especie MADRE cuando el slug recibido es un cultivar o
 * subespecie con plantilla propia ausente.
 *
 * Regla anti-alucinación: solo se considera "madre" cuando el slug del cultivar
 * EMPIEZA por el slug de una especie con plantilla seguido de `_` (ej.
 * `solanum_lycopersicum_san_marzano` → `solanum_lycopersicum`). Un cultivar
 * comparte la biología base de su especie, así que NO se inventa nada: se
 * reutiliza la fenología real de la especie. Si no hay coincidencia, retorna
 * null (el llamador caerá al genérico por tipo o a "no estimable").
 *
 * @param {string} speciesSlug
 * @returns {string|null} slug de la especie madre con plantilla, o null
 */
export function resolveParentSpeciesSlug(speciesSlug) {
  if (!speciesSlug || typeof speciesSlug !== 'string') return null;
  if (registry.has(speciesSlug)) return speciesSlug;
  for (const slug of slugsByLength) {
    if (speciesSlug.startsWith(`${slug}_`)) return slug;
  }
  return null;
}

/**
 * Retorna la plantilla para una especie, o null.
 *
 * Si el slug exacto no tiene plantilla pero corresponde a un cultivar/subespecie
 * de una especie que SÍ la tiene (ej. `solanum_lycopersicum_san_marzano`), se
 * devuelve la plantilla de la especie madre marcada con `derived_from`. Esto NO
 * es una estimación genérica: es la fenología real de la especie aplicada a su
 * cultivar, que comparte el mismo ciclo biológico.
 *
 * @param {string} speciesSlug
 * @returns {PhenologyTemplate|null}
 */
export function getTemplate(speciesSlug) {
  const direct = registry.get(speciesSlug);
  if (direct) return direct;
  const parent = resolveParentSpeciesSlug(speciesSlug);
  if (parent && parent !== speciesSlug) {
    const parentTemplate = registry.get(parent);
    if (parentTemplate) {
      return /** @type {any} */ ({ ...parentTemplate, species_slug: speciesSlug, derived_from: parent });
    }
  }
  return null;
}

/**
 * Retorna todas las plantillas registradas.
 * @returns {PhenologyTemplate[]}
 */
export function getAllTemplates() {
  return Array.from(registry.values());
}
