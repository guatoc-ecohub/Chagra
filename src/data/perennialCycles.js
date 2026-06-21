/**
 * perennialCycles — modelo HÍBRIDO del ciclo de frutales y árboles perennes.
 *
 * El modelo de ciclo anual (siembra → cosecha) NO aplica a un árbol o arbusto
 * que vive varios años: el campesino siembra una vez y la planta produce año
 * tras año tras un periodo de establecimiento. Estos datos describen ese ciclo
 * en dos partes complementarias:
 *
 *   1. ESTABLECIMIENTO — cuántos años desde la siembra hasta la primera cosecha
 *      (rango), y cuántos años vive en producción.
 *   2. CALENDARIO ANUAL RECURRENTE — qué meses suele florecer y producir cada
 *      año una vez establecida; o si produce de forma casi continua.
 *
 * REGLA DE HONESTIDAD (anti-alucinación, crítica):
 *   - `regime: 'continuous'`  → produce casi todo el año; los arrays de meses
 *     pueden quedar vacíos o traer SOLO los picos cuando hay dato firme.
 *   - `regime: 'bimodal'`     → dos temporadas marcadas al año (meses listados).
 *   - `regime: 'seasonal'`    → una temporada marcada al año (meses listados).
 *   - `regime: 'unknown'`     → el calendario varía por región/altitud y no hay
 *     un dato firme que listar; los arrays quedan vacíos y `region_note` lo dice.
 *   - NUNCA se inventan meses que la fuente no respalde. Si la fuente no da
 *     meses claros, el régimen es 'unknown' y la UI lo presenta como variable.
 *   - Todos los rangos de meses son aproximados y varían por región y altitud.
 *
 * Meses: enteros 1-12 (1 = enero ... 12 = diciembre).
 *
 * @typedef {Object} PerennialCycle
 * @property {[number, number]} years_to_first_harvest — [min, max] años desde la siembra
 * @property {number|null} productive_life_years — años de vida productiva (null si no hay dato)
 * @property {'continuous'|'bimodal'|'seasonal'|'unknown'} regime
 * @property {number[]} flowering_months — meses de floración (1-12), vacío si no aplica/no hay dato
 * @property {number[]} harvest_months — meses de cosecha (1-12), vacío si no aplica/no hay dato
 * @property {string} trigger — disparador de la floración (texto corto)
 * @property {string} region_note — cómo varía por región/altitud (honesto)
 * @property {string} source — nombres de fuentes públicas
 * @property {'alta'|'media'|'baja'} confidence
 */

/** @type {Record<string, PerennialCycle>} */
export const PERENNIAL_CYCLES = {
  // ── Frutales arbóreos y arbustivos perennes ──
  persea_americana: {
    years_to_first_harvest: [2, 4],
    productive_life_years: 15,
    regime: 'unknown',
    flowering_months: [],
    harvest_months: [],
    trigger: 'patrón injertado y régimen de lluvias',
    region_note:
      'El calendario depende fuerte de la localidad y la altitud (1340–2420 msnm, óptimo 1800–2000). Hay fincas que producen casi todo el año. Consulta el patrón de tu zona.',
    source: 'Agrosavia, Universidad Nacional de Colombia',
    confidence: 'media',
  },
  coffea_arabica: {
    years_to_first_harvest: [2, 5],
    productive_life_years: null,
    regime: 'bimodal',
    flowering_months: [],
    harvest_months: [4, 5, 6, 9, 10, 11, 12],
    trigger: 'días cortos y déficit hídrico tras la temporada seca',
    region_note:
      'Dos picos de cosecha al año en buena parte del país (abril–junio y septiembre–diciembre); la fecha exacta cambia con la latitud y la altitud (1200–2200 msnm).',
    source: 'Cenicafé, Universidad Nacional de Colombia',
    confidence: 'alta',
  },
  theobroma_cacao: {
    years_to_first_harvest: [2, 5],
    productive_life_years: null,
    regime: 'continuous',
    flowering_months: [],
    harvest_months: [4, 5, 6, 11, 12],
    trigger: 'estímulos ambientales y la entrada de la temporada seca',
    region_note:
      'Produce a lo largo del año con dos picos marcados (abril–junio y noviembre–diciembre). Cultivo de tierras cálidas húmedas (por debajo de 1250 msnm).',
    source: 'Fedecacao, Agrosavia',
    confidence: 'alta',
  },
  rubus_glaucus: {
    years_to_first_harvest: [1, 1],
    productive_life_years: null,
    regime: 'continuous',
    flowering_months: [],
    harvest_months: [],
    trigger: 'flujo constante de brotes con buen manejo',
    region_note:
      'Recolección casi semanal una vez en plena producción (cerca de los 15 meses). Se cultiva entre 1200 y 3200 msnm.',
    source: 'Agrosavia',
    confidence: 'media',
  },
  solanum_quitoense: {
    years_to_first_harvest: [1, 2],
    productive_life_years: null,
    regime: 'unknown',
    flowering_months: [],
    harvest_months: [],
    trigger: 'acumulación térmica; el clima retrasa o adelanta la madurez',
    region_note:
      'La recolección inicia cerca del primer año y se sostiene varios meses. El calendario cambia con la altitud (estudiado entre 1800 y 2600 msnm); consulta tu zona.',
    source: 'Universidad Nacional de Colombia, Agrosavia',
    confidence: 'media',
  },
  solanum_betaceum: {
    years_to_first_harvest: [1, 2],
    productive_life_years: 8,
    regime: 'continuous',
    flowering_months: [],
    harvest_months: [],
    trigger: 'desarrollo de la planta y clima frío moderado',
    region_note:
      'Produce a lo largo del año con recolecciones frecuentes (cada ~20 días); los primeros 5 años son los más productivos. Clima frío moderado andino (16–20 °C).',
    source: 'Agrosavia',
    confidence: 'alta',
  },
  passiflora_ligularis: {
    years_to_first_harvest: [1, 2],
    productive_life_years: null,
    regime: 'unknown',
    flowering_months: [],
    harvest_months: [],
    trigger: 'condiciones ambientales; las sequías prolongadas abortan flores',
    region_note:
      'Producción sostenida una vez establecida; el calendario varía con el clima y la altitud (1700–2100 msnm). Consulta el comportamiento local.',
    source: 'Agrosavia, Universidad Nacional de Colombia',
    confidence: 'alta',
  },
  passiflora_tripartita_mollissima: {
    years_to_first_harvest: [1, 2],
    productive_life_years: 9,
    regime: 'continuous',
    flowering_months: [],
    harvest_months: [6, 7, 8, 12, 1],
    trigger: 'lluvias bien repartidas durante el año',
    region_note:
      'Produce casi a diario una vez establecida, con picos hacia junio–agosto y diciembre–enero. Se da en alturas frías (1800–3500 msnm).',
    source: 'Agrosavia',
    confidence: 'alta',
  },
  mangifera_indica: {
    years_to_first_harvest: [3, 5],
    productive_life_years: null,
    regime: 'seasonal',
    flowering_months: [8, 9, 10],
    harvest_months: [11, 12],
    trigger: 'temperatura, radiación y estado hídrico del árbol',
    region_note:
      'Una temporada marcada al año (floración hacia agosto–octubre y recolección hacia noviembre–diciembre en el Tolima); cambia de fecha según la región.',
    source: 'Agrosavia',
    confidence: 'media',
  },
  psidium_guajava_manzana: {
    years_to_first_harvest: [2, 4],
    productive_life_years: null,
    regime: 'seasonal',
    flowering_months: [1, 2, 3, 4],
    harvest_months: [5, 6, 7],
    trigger: 'la floración suele seguir al abonado y la poda',
    region_note:
      'El árbol cuaja y madura el fruto en unos 4 meses; la floración se concentra hacia comienzos de año en zonas como Santander. Produce del nivel del mar hasta 1800 msnm.',
    source: 'Agrosavia',
    confidence: 'media',
  },
  acca_sellowiana: {
    years_to_first_harvest: [2, 3],
    productive_life_years: 25,
    regime: 'continuous',
    flowering_months: [],
    harvest_months: [5, 6, 12, 1],
    trigger: 'clima fresco; evitar el exceso de nitrógeno',
    region_note:
      'Produce buena parte del año en clima de montaña con picos hacia mayo–junio y diciembre–enero. Zonas frías (1800–2700 msnm, óptimo 2100–2600).',
    source: 'Agrosavia',
    confidence: 'alta',
  },
  passiflora_edulis_flavicarpa: {
    years_to_first_harvest: [1, 1],
    productive_life_years: null,
    regime: 'continuous',
    flowering_months: [],
    harvest_months: [],
    trigger: 'la entrada de las lluvias',
    region_note:
      'Produce de forma cíclica y sostenida durante el ciclo de cultivo (cerca de un año desde la primera cosecha). Clima cálido hasta ~1000 msnm.',
    source: 'ICA, Universidad Nacional de Colombia',
    confidence: 'alta',
  },
  passiflora_edulis_morada: {
    years_to_first_harvest: [1, 1],
    productive_life_years: 5,
    regime: 'continuous',
    flowering_months: [],
    harvest_months: [],
    trigger: 'desarrollo de la planta en clima frío moderado',
    region_note:
      'Produce a lo largo del año una vez establecida. Se cultiva entre 1400 y 2200 msnm; a mayor altura la producción inicia más tarde y el fruto es más pequeño.',
    source: 'Agrosavia, UNAD',
    confidence: 'alta',
  },
  physalis_peruviana: {
    years_to_first_harvest: [1, 1],
    productive_life_years: null,
    regime: 'continuous',
    flowering_months: [],
    harvest_months: [],
    trigger: 'crecimiento continuo de la planta',
    region_note:
      'Florece y produce de forma continua tras los primeros meses. Se adapta entre 1800 y 2800 msnm; a mayor altura, el primer pico se retrasa.',
    source: 'Agrosavia, ICA',
    confidence: 'alta',
  },
  citrus_latifolia: {
    years_to_first_harvest: [3, 4],
    productive_life_years: null,
    regime: 'continuous',
    flowering_months: [],
    harvest_months: [11, 12, 1, 2, 3],
    trigger: 'el estrés hídrico de la temporada seca',
    region_note:
      'Produce todo el año con un pico hacia noviembre–marzo; en zonas andinas con dos temporadas de lluvia hay floración adicional. Del nivel del mar hasta ~2100 msnm.',
    source: 'Agrosavia',
    confidence: 'alta',
  },
  citrus_sinensis: {
    years_to_first_harvest: [3, 5],
    productive_life_years: null,
    regime: 'unknown',
    flowering_months: [],
    harvest_months: [],
    trigger: 'estrés hídrico y temperatura',
    region_note:
      'El calendario de floración y producción varía mucho por región y altitud y no hay un dato firme nacional; consulta el comportamiento de tu finca.',
    source: 'Agrosavia, ICA',
    confidence: 'baja',
  },
  vaccinium_corymbosum_biloxi: {
    years_to_first_harvest: [2, 3],
    productive_life_years: 20,
    regime: 'continuous',
    flowering_months: [],
    harvest_months: [],
    trigger: 'podas que estimulan nuevos brotes',
    region_note:
      'Con manejo de podas produce a lo largo del año en clima frío (potencial entre 2200 y 2900 msnm). Vive más de 20 años en producción.',
    source: 'ProColBerries',
    confidence: 'media',
  },
  vaccinium_meridionale: {
    years_to_first_harvest: [3, 5],
    productive_life_years: null,
    regime: 'bimodal',
    flowering_months: [2, 3, 4, 5, 8, 9, 10, 11],
    harvest_months: [4, 5, 6, 9, 10, 11, 12],
    trigger: 'humedad relativa y el brote de hojas nuevas',
    region_note:
      'Dos temporadas de fructificación al año reportadas en el oriente antioqueño; planta nativa de la zona andina.',
    source: 'Corantioquia, SciELO Colombia',
    confidence: 'media',
  },
  musa_paradisiaca: {
    years_to_first_harvest: [1, 2],
    productive_life_years: null,
    regime: 'continuous',
    flowering_months: [],
    harvest_months: [],
    trigger: 'la planta florece sola al madurar; se renueva con los hijos',
    region_note:
      'Cada planta da un racimo (floración a los ~10–12 meses, cosecha ~4 meses después) y la mata se renueva con sus hijos, dando producción escalonada todo el año.',
    source: 'Agrosavia',
    confidence: 'alta',
  },
  ananas_comosus: {
    years_to_first_harvest: [1, 2],
    productive_life_years: null,
    regime: 'unknown',
    flowering_months: [],
    harvest_months: [],
    trigger: 'la floración suele inducirse; el calendario depende del manejo',
    region_note:
      'El calendario depende del manejo (inducción de la floración) y de la región (Santander, Meta, Valle, Antioquia, Llanos); no hay un patrón natural fijo que listar.',
    source: 'Agrosavia',
    confidence: 'baja',
  },
};

const MONTH_NAMES = [
  'ene', 'feb', 'mar', 'abr', 'may', 'jun',
  'jul', 'ago', 'sep', 'oct', 'nov', 'dic',
];

/** Conjunto de regímenes válidos. */
export const PERENNIAL_REGIMES = ['continuous', 'bimodal', 'seasonal', 'unknown'];

/**
 * Devuelve el ciclo perenne de una especie por su id de catálogo, o null.
 * @param {string} speciesId
 * @returns {PerennialCycle|null}
 */
export function getPerennialCycle(speciesId) {
  if (!speciesId) return null;
  return PERENNIAL_CYCLES[speciesId] || null;
}

/**
 * Indica si una especie tiene ciclo perenne grounded en estos datos.
 * @param {string} speciesId
 * @returns {boolean}
 */
export function isPerennialSpecies(speciesId) {
  return !!getPerennialCycle(speciesId);
}

/**
 * Nombre corto del mes (1-12) en español, o cadena vacía si está fuera de rango.
 * @param {number} m
 * @returns {string}
 */
export function monthShortName(m) {
  if (!Number.isInteger(m) || m < 1 || m > 12) return '';
  return MONTH_NAMES[m - 1];
}

/** Lista de ids de especies con ciclo perenne grounded. */
export function getPerennialSpeciesIds() {
  return Object.keys(PERENNIAL_CYCLES);
}
