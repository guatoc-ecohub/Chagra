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
  registry.set(t.species_slug, t);
}

/**
 * Retorna la plantilla para una especie, o null.
 * @param {string} speciesSlug
 * @returns {PhenologyTemplate|null}
 */
export function getTemplate(speciesSlug) {
  return registry.get(speciesSlug) || null;
}

/**
 * Retorna todas las plantillas registradas.
 * @returns {PhenologyTemplate[]}
 */
export function getAllTemplates() {
  return Array.from(registry.values());
}
