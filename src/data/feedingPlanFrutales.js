import { resolveGenericFeedingForSpecies } from './feedingPlanGeneric';
import { PERENNIAL_CYCLES } from './perennialCycles';

const FRUTAL_CATEGORY = 'frutales_perennes';
const GENERIC_BY_CATEGORY_NOTE =
  'Plan generico por categoria: no hay una base nutricional propia en el catalogo, ' +
  'asi que se usa una secuencia orientativa para frutales perennes y se ajusta con ' +
  'observacion de campo.';
const NO_BASE_NOTE =
  'No existe plan_nutricion_base propio para esta especie; la propuesta se deriva ' +
  'de categoria, fenologia conocida y requerimientos documentados.';
const ACID_SUBSTRATE_NOTE =
  'En Ericaceae no encales: el sustrato debe permanecer acido y muy drenado.';

function cloneTemplate(template) {
  return typeof structuredClone === 'function'
    ? structuredClone(template)
    : JSON.parse(JSON.stringify(template));
}

function pushUnique(list, value) {
  if (!value) return;
  if (!list.includes(value)) list.push(value);
}

function formatRange(range, unit) {
  if (!range || typeof range !== 'object') return null;
  const min = range.min_absoluto ?? range.optimo_min ?? range.min ?? null;
  const max = range.max_absoluto ?? range.optimo_max ?? range.max ?? null;
  const optMin = range.optimo_min ?? null;
  const optMax = range.optimo_max ?? null;
  const parts = [];
  if (Number.isFinite(min) && Number.isFinite(max)) {
    parts.push(`${min}-${max} ${unit}`);
  }
  if (Number.isFinite(optMin) && Number.isFinite(optMax)) {
    parts.push(`optimo ${optMin}-${optMax} ${unit}`);
  }
  return parts.length > 0 ? parts.join(' / ') : null;
}

function describeRequirements(species) {
  const parts = [];
  const alt = formatRange(species?.altitud_msnm, 'msnm');
  if (alt) parts.push(`Altitud: ${alt}`);
  const temp = formatRange(species?.temperatura_c, 'C');
  if (temp) parts.push(`Temperatura: ${temp}`);
  if (species?.agua) parts.push(`Agua: ${species.agua}`);
  if (species?.drenaje_requerido) parts.push(`Drenaje: ${species.drenaje_requerido}`);
  if (species?.radiacion) parts.push(`Radiacion: ${species.radiacion}`);
  if (species?.light) parts.push(`Luz: ${species.light}`);
  return parts.join('; ');
}

function describePhenology(species) {
  const cycle = PERENNIAL_CYCLES[species?.id];
  if (!cycle) return null;

  const parts = [];
  if (Array.isArray(cycle.years_to_first_harvest)) {
    parts.push(`Primera cosecha estimada en ${cycle.years_to_first_harvest[0]}-${cycle.years_to_first_harvest[1]} anos`);
  }
  if (cycle.regime === 'continuous') {
    parts.push('Fenologia perenne de produccion casi continua');
  } else if (cycle.regime === 'seasonal') {
    parts.push('Fenologia estacional marcada');
  } else if (cycle.regime === 'bimodal') {
    parts.push('Fenologia bimodal');
  } else {
    parts.push('Fenologia variable por region');
  }
  if (cycle.region_note) parts.push(cycle.region_note);
  if (cycle.trigger) parts.push(`Disparador: ${cycle.trigger}`);
  if (cycle.source) parts.push(`Fuente fenologica: ${cycle.source}`);
  return parts.join('. ');
}

function buildGenericSource(species) {
  const notes = [];
  notes.push(`Derivado para ${species?.id || 'frutal'} en ${FRUTAL_CATEGORY}.`);
  notes.push(GENERIC_BY_CATEGORY_NOTE);
  const req = describeRequirements(species);
  if (req) notes.push(req);
  const phenology = describePhenology(species);
  if (phenology) notes.push(phenology);
  return notes.join(' ');
}

function buildGenericNotes(species, template) {
  const notes = [];
  pushUnique(notes, GENERIC_BY_CATEGORY_NOTE);
  pushUnique(notes, NO_BASE_NOTE);
  const req = describeRequirements(species);
  pushUnique(notes, req ? `Requerimientos documentados: ${req}.` : null);
  const phenology = describePhenology(species);
  pushUnique(notes, phenology ? `Fenologia documentada: ${phenology}.` : null);
  for (const note of template?.notes || []) {
    pushUnique(notes, note);
  }
  return notes;
}

function applyFamilySafetyPatches(species, template) {
  const family = String(species?.familia_botanica || '');

  if (family === 'Ericaceae') {
    template.primary_steps = template.primary_steps.filter(
      (step) => step.biofertilizer_slug !== 'cal_dolomita',
    );
    pushUnique(template.notes, ACID_SUBSTRATE_NOTE);
  }

  return template;
}

/**
 * Resuelve un plan de alimentación estrictamente derivado para una especie.
 * Si la especie ya trae `feeding_plan_template`, se devuelve tal cual.
 * Si no, usa el plan genérico por categoria y lo enriquece con fenologia y
 * requerimientos conocidos. Cuando no existe una base clara, la salida queda
 * explicitamente marcada como generica por categoria.
 *
 * @param {object} species
 * @returns {object|null}
 */
export function resolveFeedingPlanTemplateForSpecies(species) {
  if (!species || typeof species !== 'object') return null;

  const explicit = species.feeding_plan_template;
  if (explicit && Array.isArray(explicit.primary_steps) && explicit.primary_steps.length > 0) {
    return explicit;
  }

  const generic = resolveGenericFeedingForSpecies(species);
  if (!generic) return null;

  if (species.category !== FRUTAL_CATEGORY) {
    return generic;
  }

  const template = cloneTemplate(generic);
  template.source = buildGenericSource(species);
  template.notes = buildGenericNotes(species, template);

  return applyFamilySafetyPatches(species, template);
}

/**
 * Clasifica la cobertura del plan de alimentación para reportes y tests.
 *
 * @param {object} species
 * @returns {'poblado'|'generico'|'sin-datos'}
 */
export function getFeedingPlanKindForSpecies(species) {
  if (!species || typeof species !== 'object') return 'sin-datos';
  const explicit = species.feeding_plan_template;
  if (explicit && Array.isArray(explicit.primary_steps) && explicit.primary_steps.length > 0) {
    return 'poblado';
  }
  return resolveFeedingPlanTemplateForSpecies(species) ? 'generico' : 'sin-datos';
}

/**
 * Resume cobertura de planes sobre un listado de especies.
 *
 * @param {Array<object>} speciesList
 * @returns {{ poblado: number, generico: number, sinDatos: number }}
 */
export function summarizeFeedingPlanCoverage(speciesList) {
  const summary = { poblado: 0, generico: 0, sinDatos: 0 };
  for (const species of Array.isArray(speciesList) ? speciesList : []) {
    const kind = getFeedingPlanKindForSpecies(species);
    if (kind === 'poblado') summary.poblado += 1;
    else if (kind === 'generico') summary.generico += 1;
    else summary.sinDatos += 1;
  }
  return summary;
}
