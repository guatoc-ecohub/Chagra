/**
 * perennialCalculator — resuelve el ciclo HÍBRIDO de una especie perenne.
 *
 * A diferencia de phenologyCalculator (ciclo anual siembra → cosecha), un árbol
 * o arbusto perenne tiene DOS dimensiones que el campesino necesita ver juntas:
 *
 *   1. ESTABLECIMIENTO — en qué punto va entre la siembra y la primera cosecha
 *      (progreso 0–1) y en qué año se espera esa primera cosecha.
 *   2. CALENDARIO ANUAL recurrente — una vez productiva, qué meses suele
 *      florecer/cosechar cada año, o si produce de forma casi continua.
 *
 * Degradación honesta (nunca rompe):
 *   - Sin datos perennes para la especie → devuelve null (la UI cae al ciclo
 *     anual existente, sin inventar nada).
 *   - Sin fecha de siembra → fase 'productive' por defecto (no podemos calcular
 *     el establecimiento, pero el calendario anual sigue siendo útil) y el bloque
 *     `establishment` queda con progreso null.
 */
import { getPerennialCycle } from '../data/perennialCycles';

const MS_PER_YEAR = 365.25 * 24 * 60 * 60 * 1000;

/**
 * @typedef {Object} PerennialResolution
 * @property {string} speciesId
 * @property {'establishment'|'productive'} phase
 * @property {Object} establishment
 * @property {number|null} establishment.yearsElapsed — años desde la siembra (null si no hay fecha)
 * @property {[number, number]} establishment.yearsToFirstHarvest — [min, max]
 * @property {number|null} establishment.progress — 0–1 hacia la primera cosecha (null si no hay fecha)
 * @property {number|null} establishment.firstHarvestYear — año calendario estimado de la 1ª cosecha
 * @property {Object} annual
 * @property {number} annual.currentMonth — 1–12
 * @property {boolean} annual.isFlowering — el mes actual está en floración
 * @property {boolean} annual.isHarvest — el mes actual está en cosecha
 * @property {'continuous'|'bimodal'|'seasonal'|'unknown'} annual.regime
 * @property {number[]} annual.floweringMonths
 * @property {number[]} annual.harvestMonths
 * @property {number[]} annual.nextHarvestMonths — próximos meses de cosecha desde el mes actual
 * @property {string} annual.note
 * @property {number|null} productiveLifeYears
 * @property {string} source
 * @property {string} confidence
 */

const clamp01 = (n) => Math.max(0, Math.min(1, n));

/**
 * Próximos meses de cosecha a partir del mes actual (recorre el calendario de
 * forma circular). Devuelve los meses de cosecha ordenados empezando por el más
 * cercano hacia adelante.
 *
 * @param {number[]} harvestMonths — meses 1-12
 * @param {number} currentMonth — 1-12
 * @returns {number[]}
 */
function computeNextHarvestMonths(harvestMonths, currentMonth) {
  if (!Array.isArray(harvestMonths) || harvestMonths.length === 0) return [];
  const sorted = [...new Set(harvestMonths)].filter((m) => m >= 1 && m <= 12).sort((a, b) => a - b);
  if (sorted.length === 0) return [];
  const ahead = sorted.filter((m) => m >= currentMonth);
  const behind = sorted.filter((m) => m < currentMonth);
  return [...ahead, ...behind];
}

/**
 * Texto corto para el campesino según el régimen.
 * @param {Object} cycle
 * @returns {string}
 */
function regimeNote(cycle) {
  switch (cycle.regime) {
    case 'continuous':
      return cycle.harvest_months.length > 0
        ? 'Produce casi todo el año, con picos en los meses resaltados.'
        : 'Produce casi todo el año una vez establecida.';
    case 'bimodal':
      return 'Tiene dos temporadas de producción al año.';
    case 'seasonal':
      return 'Tiene una temporada de producción marcada al año.';
    case 'unknown':
    default:
      return 'El calendario varía por región y altitud; consulta el comportamiento en tu zona.';
  }
}

/**
 * Resuelve el ciclo híbrido (establecimiento + calendario anual) de una especie.
 *
 * @param {Object} input
 * @param {string} input.speciesId — id de catálogo
 * @param {number} [input.plantingDate] - timestamp ms de la siembra
 * @param {number} [input.now] - timestamp ms de referencia (default Date.now())
 * @returns {PerennialResolution|null}
 */
export function resolvePerennialCycle(opts = /** @type {any} */ ({})) {
  const { speciesId, plantingDate, now } = opts;
  const cycle = getPerennialCycle(speciesId);
  if (!cycle) return null;

  const today = now && now > 0 ? now : Date.now();
  const currentMonth = new Date(today).getMonth() + 1; // 1-12
  const [minYears, maxYears] = cycle.years_to_first_harvest;

  // ── Establecimiento ──
  let yearsElapsed = null;
  let progress = null;
  let firstHarvestYear = null;
  let phase = /** @type {'productive'|'establishment'} */ ('productive');

  const hasPlanting = Number.isFinite(plantingDate) && plantingDate > 0;
  if (hasPlanting) {
    yearsElapsed = Math.max(0, (today - plantingDate) / MS_PER_YEAR);
    // El progreso usa el extremo MÁXIMO del rango para no prometer cosecha antes
    // de tiempo (conservador: 100% solo cuando seguro ya produce).
    progress = clamp01(yearsElapsed / maxYears);
    firstHarvestYear = new Date(plantingDate).getFullYear() + maxYears;
    // Entra en producción cuando supera el mínimo del rango.
    phase = /** @type {'productive'|'establishment'} */ (yearsElapsed >= minYears ? 'productive' : 'establishment');
  }

  // ── Calendario anual ──
  const floweringMonths = Array.isArray(cycle.flowering_months) ? cycle.flowering_months : [];
  const harvestMonths = Array.isArray(cycle.harvest_months) ? cycle.harvest_months : [];
  const continuous = cycle.regime === 'continuous';

  const isFlowering = floweringMonths.includes(currentMonth);
  // En régimen continuo siempre puede haber cosecha; los meses listados son picos.
  const isHarvest = continuous || harvestMonths.includes(currentMonth);

  return {
    speciesId,
    phase,
    establishment: {
      yearsElapsed,
      yearsToFirstHarvest: [minYears, maxYears],
      progress,
      firstHarvestYear,
    },
    annual: {
      currentMonth,
      isFlowering,
      isHarvest,
      regime: cycle.regime,
      floweringMonths,
      harvestMonths,
      nextHarvestMonths: computeNextHarvestMonths(harvestMonths, currentMonth),
      note: regimeNote(cycle),
    },
    productiveLifeYears: cycle.productive_life_years,
    source: cycle.source,
    confidence: cycle.confidence,
  };
}
