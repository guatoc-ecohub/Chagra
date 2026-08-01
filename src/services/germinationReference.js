/**
 * germinationReference — días de referencia a germinación / emergencia por
 * especie, derivados EXCLUSIVAMENTE de las plantillas fenológicas reales
 * (src/data/phenology-templates/*.json), con sus fuentes (Agrosavia, FAO, etc.).
 *
 * Regla anti-alucinación (inviolable): NO se inventan días. El rango de días a
 * germinar sale del stage `emergence` de cada plantilla. Si una especie no
 * tiene ese dato, el módulo de germinación dice "varía por especie y
 * temperatura" en vez de mostrar un número falso.
 *
 * Solo se exponen especies que se siembran por SEMILLA verdadera (para las que
 * tiene sentido la prueba de germinación casera en papel/algodón). Las que se
 * propagan por tubérculo (papa) o estaca (yuca) se excluyen: ahí el stage
 * `emergence` mide brotación del propágulo, no germinación de semilla, así que
 * mostrarlo como referencia de la prueba sería engañoso.
 */
import { getAllTemplates, getTemplate } from '../data/phenologyTemplates';

/**
 * Especies que se propagan por semilla verdadera y para las que la prueba de
 * germinación casera (papel húmedo) es válida. Las que no estén aquí no
 * mostrarán un número de días aunque su plantilla tenga `emergence`.
 * @type {Set<string>}
 */
const SEED_SOWN_SLUGS = new Set([
  'zea_mays', // maíz
  'phaseolus_vulgaris', // fríjol
  'coriandrum_sativum', // cilantro
  'daucus_carota', // zanahoria
  'allium_cepa', // cebolla de bulbo
  'pisum_sativum', // arveja
  'solanum_lycopersicum', // tomate (almácigo por semilla)
  'lactuca_sativa', // lechuga
]);

/**
 * Extrae el rango de días a germinar/emerger de una plantilla.
 * @param {object} template
 * @returns {{minDays:number, maxDays:number, source:object|null}|null}
 */
function emergenceRange(template) {
  if (!template || !Array.isArray(template.stages)) return null;
  const stage = template.stages.find((s) => s.code === 'emergence');
  if (!stage) return null;
  const minDays = Number(stage.minDays);
  const maxDays = Number(stage.maxDays);
  if (!Number.isFinite(minDays) || !Number.isFinite(maxDays)) return null;
  const source = Array.isArray(template.sources)
    ? (template.sources[stage.sourceIndex] || template.sources[0] || null)
    : null;
  return { minDays, maxDays, source };
}

/**
 * @typedef {Object} GerminationReference
 * @property {string} slug — species_slug de la plantilla
 * @property {string} label — etiqueta legible (species_label)
 * @property {number} minDays — días mínimos a germinar/emerger
 * @property {number} maxDays — días máximos
 * @property {string|null} sourceName — nombre de la fuente real
 */

/**
 * Lista de especies con referencia de días a germinar, ordenada alfabéticamente
 * por etiqueta. Solo especies de semilla verdadera con dato real.
 * @returns {GerminationReference[]}
 */
export function listGerminationReferences() {
  const out = [];
  for (const t of getAllTemplates()) {
    if (!SEED_SOWN_SLUGS.has(t.species_slug)) continue;
    const range = emergenceRange(t);
    if (!range) continue;
    out.push({
      slug: t.species_slug,
      label: t.species_label || t.species_slug,
      minDays: range.minDays,
      maxDays: range.maxDays,
      sourceName: range.source?.name || range.source?.reference || null,
    });
  }
  return out.sort((a, b) => a.label.localeCompare(b.label, 'es'));
}

/**
 * Referencia de días a germinar para una especie concreta (por slug). Resuelve
 * cultivar→especie madre vía getTemplate. Devuelve null si no hay dato real o
 * si la especie no se siembra por semilla (no inventa).
 *
 * @param {string} slug
 * @returns {GerminationReference|null}
 */
export function getGerminationReference(slug) {
  if (!slug) return null;
  const t = getTemplate(slug);
  if (!t) return null;
  // Resolver al slug base para validar contra la lista de semilla verdadera.
  const baseSlug = /** @type {any} */ (t).derived_from || t.species_slug;
  if (!SEED_SOWN_SLUGS.has(baseSlug)) return null;
  const range = emergenceRange(t);
  if (!range) return null;
  return {
    slug: t.species_slug,
    label: t.species_label || t.species_slug,
    minDays: range.minDays,
    maxDays: range.maxDays,
    sourceName: range.source?.name || range.source?.reference || null,
  };
}
