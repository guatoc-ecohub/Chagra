/**
 * feedingPlanGeneric — plantillas GENÉRICAS de NUTRICIÓN por tipo de cultivo.
 *
 * Espejo del patrón de `phenologyGeneric.js`: cuando una especie del catálogo
 * NO tiene `feeding_plan_template` propio (hoy ~12 de 263 lo tienen), en vez de
 * mostrar "Sin plan disponible" se ofrece un plan de nutrición ORIENTATIVO por
 * `category` agronómica, claramente marcado como aproximado.
 *
 * REGLAS ANTI-ALUCINACIÓN (críticas):
 *   - Estas plantillas son SOLO de NUTRICIÓN (alimentación de la planta). NUNCA
 *     incluyen biopreparados fitosanitarios (caldo_bordeles, caldo_sulfocalcico,
 *     bacillus_subtilis_foliar, trichoderma_harzianum_suelo, etc.): la sanidad
 *     es otra sección, no es "plan de alimentación".
 *   - NO se inventan dosis. Cada paso referencia un biopreparado/enmienda del
 *     seed (`catalog/biopreparados-seed.json`) y copia su dosis TEXTUAL en
 *     `dose_text`. La dosis foliar concreta y SEGURA del paso (sin arrastrar el
 *     párrafo crudo con rangos amplios) va en `dose_safe`, derivada de la misma
 *     fuente. Si no hay dosis documentada, se deja la guía textual; no se
 *     fabrican números.
 *   - Toda plantilla lleva `isGeneric: true`, `confidence: 'baja'` y una nota
 *     que recuerda que es orientativa por TIPO de cultivo, no dato de la especie.
 *
 * Biopreparados PREDIALES de nutrición usados (todos con dosis en el seed):
 * bocashi, biol, supermagro, humus_liquido, te_compost. Enmiendas minerales de
 * suelo (paso 0): cal_dolomita, roca_fosforica (dosis textual en proceso_resumen).
 */
import biopreparadosSeed from '../../catalog/biopreparados-seed.json';

// Índice id → entrada del seed, para leer dosis/nombre TEXTUALMENTE (no inventar).
const SEED_BY_ID = new Map(
  (biopreparadosSeed?.biopreparados || []).map((b) => [b.id, b]),
);

/**
 * Biopreparados fitosanitarios — PROHIBIDOS en plantillas de alimentación.
 * Se usan en tests y como guardia documental: la sanidad vive en otra sección.
 * caldo_sulfocalcico es la ÚNICA fuente de azufre del catálogo, pero es
 * FITOSANITARIO: nunca debe usarse como abono (ver nota de brásicas).
 */
export const FITOSANITARIOS = Object.freeze([
  'caldo_bordeles',
  'caldo_sulfocalcico',
  'bacillus_subtilis_foliar',
  'trichoderma_harzianum_suelo',
]);

const GENERIC_NOTE =
  'Plan orientativo por tipo de cultivo — ajústalo a tu suelo y a lo que veas ' +
  'en la planta.';

// P2-8: análisis de suelo como paso recomendado explícito (no solo "idealmente").
const SOIL_TEST_NOTE =
  'Antes de encalar o abonar, lo recomendado es hacer un análisis de suelo: te ' +
  'dice el pH y qué falta, así no botas plata en lo que no necesitas.';

/**
 * Lee la dosis TEXTUAL de un id del seed. Los fermentados traen
 * `dosis_aplicacion`; las enmiendas minerales (cal, roca fosfórica) la traen en
 * `proceso_resumen`. No se inventa nada: si no hay ninguno, retorna null.
 *
 * @param {string} seedId
 * @returns {string|null}
 */
function seedDoseText(seedId) {
  const seed = SEED_BY_ID.get(seedId) || null;
  if (!seed) return null;
  return seed.dosis_aplicacion || seed.proceso_resumen || null;
}

/**
 * Construye un paso de nutrición a partir de un id de biopreparado/enmienda del
 * seed. La dosis del seed se copia TEXTUAL en `dose_text` (referencia completa);
 * la dosis CONCRETA y segura del paso va en `dose_safe` (corta, legible). Nunca
 * inventa números fuera de los rangos documentados en el seed.
 *
 * @param {Object} cfg
 * @param {number} cfg.offset_days — días desde siembra/trasplante (negativo = pre-siembra)
 * @param {string} cfg.action — qué hacer, en lenguaje campesino
 * @param {string} cfg.biofertilizer_slug — id del biopreparado/enmienda en el seed
 * @param {string} cfg.notes — contexto agronómico del paso (lenguaje campesino)
 * @param {string} [cfg.dose_safe] — dosis concreta y segura del paso (foliar/suelo)
 * @param {number} [cfg.dose_g] — dosis sólida numérica SOLO si está documentada
 *   como rango de campo en el seed (ej. bocashi "80-150 g por planta")
 * @returns {Object} paso normalizado, compatible con primary_steps del catálogo
 */
function step({ offset_days, action, biofertilizer_slug, notes, dose_safe, dose_g }) {
  return {
    offset_days,
    action,
    biofertilizer_slug,
    // Dosis TEXTUAL del seed (no inventada). null si el id no la trae.
    dose_text: seedDoseText(biofertilizer_slug),
    // Dosis concreta y segura del paso (corta), dentro de los rangos del seed.
    ...(dose_safe ? { dose_safe } : {}),
    // Dosis numérica solo cuando el seed la documenta como rango de campo.
    ...(Number.isFinite(dose_g) ? { dose_g } : {}),
    notes,
  };
}

/**
 * P0-1: Paso 0 de SUELO (pre-siembra). Encalado y fósforo según análisis. Cal
 * dolomítica solo en suelos ácidos; roca fosfórica para aportar fósforo (se
 * solubiliza en suelos ácidos). Dosis TEXTUALES del seed. Va antes del bocashi.
 *
 * @returns {Array<Object>} pasos de suelo (cal + roca fosfórica)
 */
function soilSteps() {
  return [
    step({
      offset_days: -15,
      action: 'Encalar el suelo si está ácido (cal dolomítica)',
      biofertilizer_slug: 'cal_dolomita',
      dose_safe: '500-2000 kg/ha (según análisis) para subir el pH medio punto',
      notes:
        'Según análisis de suelo; en los suelos ácidos del Cauca y el altiplano ' +
        'normalmente hace falta encalar. La cal aporta calcio y magnesio y ' +
        'corrige la acidez. Aplícala 2-3 semanas antes de sembrar. ' +
        SOIL_TEST_NOTE,
    }),
    step({
      offset_days: -15,
      action: 'Aportar fósforo con roca fosfórica (suelos ácidos)',
      biofertilizer_slug: 'roca_fosforica',
      dose_safe: '500-1000 kg/ha al voleo, incorporada antes de sembrar',
      notes:
        'La roca fosfórica suelta el fósforo despacio y necesita suelo ácido ' +
        '(pH menor a 5.5) para solubilizarse, o compostarla antes con materia ' +
        'orgánica. Según análisis de suelo.',
    }),
  ];
}

/**
 * Envuelve una secuencia de pasos en una plantilla genérica marcada como
 * orientativa. Antepone el paso 0 de suelo (cal + roca fosfórica) a todos los
 * tipos de cultivo (P0-1).
 *
 * @param {Object} cfg
 * @param {string} cfg.categoryId
 * @param {string} cfg.label — etiqueta legible del tipo de cultivo
 * @param {Array<Object>} cfg.steps — pasos de nutrición (post-siembra)
 * @param {boolean} [cfg.isLegume=false]
 * @param {string[]} [cfg.extraNotes=[]] — notas adicionales (override familia)
 * @returns {Object}
 */
function template({ categoryId, label, steps, isLegume = false, extraNotes = [] }) {
  return {
    template_id: `generic.feeding.${categoryId}`,
    category: categoryId,
    label,
    isGeneric: true,
    isLegume,
    confidence: 'baja',
    source:
      'Biopreparados y enmiendas prediales del catálogo Chagra ' +
      '(catalog/biopreparados-seed.json). Secuencia de nutrición genérica por ' +
      'tipo de cultivo, NO específica de la especie.',
    notes: [GENERIC_NOTE, SOIL_TEST_NOTE, ...extraNotes],
    // Paso 0 de suelo (pre-siembra) + pasos de nutrición del ciclo.
    primary_steps: [...soilSteps(), ...steps],
  };
}

/**
 * Plantillas base por categoría. Patrón común:
 *   suelo (cal + roca fosfórica según análisis) → fondo (bocashi al hoyo/surco)
 *   → refuerzo vegetativo (biol foliar / humus al pie) → pico de demanda según
 *   órgano → té de compost de mantenimiento.
 *
 * @returns {Object} plantilla genérica
 */
function buildLeafy() {
  // Hortalizas de hoja: órgano cosechado = hoja → demanda de N en vegetativo.
  return template({
    categoryId: 'hortalizas_hoja',
    label: 'Hortaliza de hoja',
    steps: [
      step({
        offset_days: 0,
        action: 'Incorporar bocashi al hoyo o surco de trasplante',
        biofertilizer_slug: 'bocashi',
        dose_g: 100,
        dose_safe: '80-150 g por planta',
        notes: 'Abono de fondo. Mézclalo con la tierra (0-15 cm); que esté maduro y frío.',
      }),
      step({
        offset_days: 15,
        action: 'Foliar con biol cuando están creciendo las hojas',
        biofertilizer_slug: 'biol',
        dose_safe: 'biol al 10-15% (1-1.5 L por 10 L de agua); en plántula empezar 1:20',
        notes:
          'Es cuando más nitrógeno piden, porque la hoja es lo que se cosecha. ' +
          'Aplícalo temprano en la mañana o al atardecer, nunca con sol fuerte.',
      }),
      step({
        offset_days: 30,
        action: 'Empapar al pie con humus líquido (regar a la raíz)',
        biofertilizer_slug: 'humus_liquido',
        dose_safe: 'al pie 1:4 a 1:5 (250 ml por planta)',
        notes: 'Le da fuerza al follaje y vida al suelo para sostener la hoja tierna.',
      }),
      step({
        offset_days: 45,
        action: 'Té de compost de mantenimiento',
        biofertilizer_slug: 'te_compost',
        dose_safe: 'foliar 1:5 a 1:10 (té claro)',
        notes: 'Aporte de microbios para sostener la planta hasta la cosecha.',
      }),
    ],
  });
}

function buildFruitFlower() {
  // Hortalizas de fruto/flor: pico de demanda de K + microelementos en cuaje.
  return template({
    categoryId: 'hortalizas_fruto_flor',
    label: 'Hortaliza de fruto o flor',
    steps: [
      step({
        offset_days: 0,
        action: 'Incorporar bocashi al hoyo de trasplante',
        biofertilizer_slug: 'bocashi',
        dose_g: 150,
        dose_safe: '80-150 g por planta',
        notes: 'Abono de fondo. Mézclalo con la tierra (0-15 cm); que esté maduro y frío.',
      }),
      step({
        offset_days: 20,
        action: 'Foliar con biol mientras crece la planta',
        biofertilizer_slug: 'biol',
        dose_safe: 'biol al 10-15% (1-1.5 L por 10 L de agua); en plántula empezar 1:20',
        notes: 'Sostiene el crecimiento de la planta antes de que florezca.',
      }),
      step({
        offset_days: 45,
        action: 'Foliar con supermagro en floración y cuaje',
        biofertilizer_slug: 'supermagro',
        dose_safe: 'supermagro ~1:20 (5%); no pasar del 10% para no quemar',
        notes:
          'Es cuando más lo pide: aporta potasio y micronutrientes (Mg, Zn, B) para ' +
          'la flor, el cuaje y el llenado del fruto.',
      }),
      step({
        offset_days: 75,
        action: 'Té de compost de mantenimiento en producción',
        biofertilizer_slug: 'te_compost',
        dose_safe: 'foliar 1:5 a 1:10 (té claro)',
        notes: 'Aporte de microbios para sostener la planta durante la cosecha escalonada.',
      }),
    ],
  });
}

function buildTubers() {
  // Tubérculos/raíces: pico de K en llenado (supermagro), N moderado al inicio.
  return template({
    categoryId: 'tuberculos_raices',
    label: 'Tubérculo o raíz',
    steps: [
      step({
        offset_days: 0,
        action: 'Incorporar bocashi al surco de siembra',
        biofertilizer_slug: 'bocashi',
        dose_g: 120,
        dose_safe: '80-150 g por sitio',
        notes:
          'Abono de fondo al surco. En siembra directa (zanahoria, rábano, ' +
          'cereales, leguminosas) mezcla el bocashi al suelo a banda, no ' +
          'concentrado bajo la semilla. Que esté maduro y frío para no quemar ' +
          'la semilla o el tubérculo.',
      }),
      step({
        offset_days: 25,
        action: 'Foliar con biol mientras desarrolla el follaje',
        biofertilizer_slug: 'biol',
        dose_safe: 'biol al 10-15% (1-1.5 L por 10 L de agua)',
        notes: 'Sostiene las hojas, que son las que alimentan el llenado del tubérculo o la raíz.',
      }),
      step({
        offset_days: 60,
        action: 'Foliar con supermagro cuando llena el tubérculo',
        biofertilizer_slug: 'supermagro',
        dose_safe: 'supermagro ~1:20 (5%); no pasar del 10%',
        notes: 'Es cuando más potasio pide, para el llenado y la calidad del tubérculo o la raíz.',
      }),
      step({
        offset_days: 90,
        action: 'Té de compost de mantenimiento',
        biofertilizer_slug: 'te_compost',
        dose_safe: 'foliar 1:5 a 1:10 (té claro)',
        notes: 'Aporte de microbios para sostener la planta hasta el final del ciclo.',
      }),
    ],
  });
}

function buildLegumes() {
  // Leguminosas: FIJAN su propio nitrógeno → NO aplicar biol rico en N.
  // Foco: fósforo (vía bocashi/compost) + materia orgánica.
  return template({
    categoryId: 'granos_legumbres',
    label: 'Grano o leguminosa',
    isLegume: true,
    extraNotes: [
      'Las leguminosas fijan su propio nitrógeno: NO aplicar biol rico en N; ' +
        'da prioridad al fósforo y al compost.',
      // P1-5: nota de inoculación con rizobio.
      'Si es la primera vez que siembras esta leguminosa en este lote, inocula ' +
        'la semilla con tierra de un lote donde el fríjol o el haba haya dado ' +
        'bien (lleva el rizobio). La cal ayuda a la fijación: libera el ' +
        'molibdeno que la acidez bloquea.',
    ],
    steps: [
      step({
        offset_days: 0,
        action: 'Incorporar bocashi al surco (fósforo y materia orgánica)',
        biofertilizer_slug: 'bocashi',
        dose_g: 100,
        dose_safe: '80-150 g por sitio',
        notes:
          'Abono de fondo. En leguminosas el foco es el fósforo y la materia ' +
          'orgánica, no el nitrógeno. En siembra directa mezcla el bocashi al ' +
          'suelo a banda, no concentrado bajo la semilla.',
      }),
      step({
        offset_days: 30,
        action: 'Empapar al pie con humus líquido (regar a la raíz)',
        biofertilizer_slug: 'humus_liquido',
        dose_safe: 'al pie 1:4 a 1:5 (250 ml por planta)',
        notes:
          'Microbios y materia orgánica que ayudan a que se formen los nódulos. ' +
          'NO se aplica biol: la planta ya fija su propio nitrógeno.',
      }),
      step({
        offset_days: 60,
        action: 'Té de compost de mantenimiento',
        biofertilizer_slug: 'te_compost',
        dose_safe: 'foliar 1:5 a 1:10 (té claro)',
        notes: 'Aporte de microbios para sostener la planta. Sin nitrógeno añadido.',
      }),
    ],
  });
}

function buildCereals() {
  // Cereales: N cuando echa más tallos (biol), refuerzo en llenado del grano.
  return template({
    categoryId: 'cereales',
    label: 'Cereal',
    steps: [
      step({
        offset_days: 0,
        action: 'Incorporar bocashi al surco de siembra',
        biofertilizer_slug: 'bocashi',
        dose_g: 100,
        dose_safe: '80-150 g por sitio',
        notes:
          'Abono de fondo al surco. En siembra directa mezcla el bocashi al ' +
          'suelo a banda, no concentrado bajo la semilla. Que esté maduro y frío.',
      }),
      step({
        offset_days: 25,
        action: 'Foliar con biol cuando echa más tallos',
        biofertilizer_slug: 'biol',
        dose_safe: 'biol al 10-15% (1-1.5 L por 10 L de agua)',
        notes: 'Es cuando más nitrógeno pide: ahí se define cuántos tallos van a producir.',
      }),
      step({
        offset_days: 55,
        action: 'Foliar con biol cuando empieza a llenar el grano',
        biofertilizer_slug: 'biol',
        dose_safe: 'biol al 10-15% (1-1.5 L por 10 L de agua)',
        notes: 'Refuerzo para sostener el llenado del grano.',
      }),
      step({
        offset_days: 85,
        action: 'Té de compost de mantenimiento',
        biofertilizer_slug: 'te_compost',
        dose_safe: 'foliar 1:5 a 1:10 (té claro)',
        notes: 'Aporte de microbios para sostener la planta hasta que madura.',
      }),
    ],
  });
}

/**
 * Registro de plantillas genéricas por `category` del catálogo.
 * Solo categorías con un ciclo anual de nutrición agronómicamente defendible.
 * @type {Map<string, () => Object>}
 */
const builders = new Map([
  ['hortalizas_hoja', buildLeafy],
  ['hortalizas_fruto_flor', buildFruitFlower],
  ['tuberculos_raices', buildTubers],
  ['granos_legumbres', buildLegumes],
  ['cereales', buildCereals],
]);

/**
 * Retorna la plantilla genérica de nutrición para una categoría, o null si esa
 * categoría no tiene plantilla definida.
 *
 * @param {string} categoryId — valor de `category` del catálogo
 * @returns {Object|null}
 */
export function getGenericFeedingTemplate(categoryId) {
  if (!categoryId || typeof categoryId !== 'string') return null;
  const build = builders.get(categoryId);
  return build ? build() : null;
}

/**
 * Categorías que tienen plantilla genérica de nutrición (para tests/introspección).
 * @returns {string[]}
 */
export function getGenericFeedingCategories() {
  return Array.from(builders.keys());
}

/**
 * Resuelve la plantilla genérica de nutrición para una especie concreta,
 * aplicando overrides por familia botánica / rol en el gremio.
 *
 * Reglas de override (sobre la plantilla base por `category`):
 *   - `nitrogen_fixer` en roles_in_guild O familia Fabaceae → plantilla
 *     LEGUMINOSA (sin N), sin importar su category.
 *   - familia Solanaceae → nota de calcio reescrita (la pudrición de la punta
 *     de abajo NO es por falta de cal — ver P0-2).
 *   - familia Brassicaceae → nota de azufre segura (yeso, nunca sulfocálcico).
 *
 * @param {Object} species — entrada del catálogo (con category, familia_botanica, roles_in_guild)
 * @returns {Object|null} plantilla genérica con overrides, o null si no hay base
 */
export function resolveGenericFeedingForSpecies(species) {
  if (!species || typeof species !== 'object') return null;

  const familia = species.familia_botanica || '';
  const roles = Array.isArray(species.roles_in_guild) ? species.roles_in_guild : [];
  const isNitrogenFixer = roles.includes('nitrogen_fixer') || familia === 'Fabaceae';

  // Override #1: leguminosa / fijadora de N → plantilla legumbre (sin N).
  if (isNitrogenFixer) {
    return getGenericFeedingTemplate('granos_legumbres');
  }

  // Base por categoría del catálogo.
  const base = getGenericFeedingTemplate(species.category);
  if (!base) return null;

  // Override #2 (P0-2): nota de calcio para solanáceas REESCRITA. La pudrición
  // de la punta de abajo del tomate casi nunca es por falta de cal.
  if (familia === 'Solanaceae') {
    return {
      ...base,
      notes: [
        ...base.notes,
        'La pudrición de la punta de abajo del tomate casi siempre es por riego ' +
          'desparejo y exceso de nitrógeno, NO por falta de cal. Corrige con riego ' +
          'parejo, mulch y sin abusar del biol. Solo aporta calcio si un análisis ' +
          'muestra que falta.',
      ],
    };
  }

  // Override #3 (P0-3): nota de azufre para brásicas. NO pedir "una fuente de
  // azufre" genérica: el único S del catálogo es caldo sulfocálcico, que es
  // FITOSANITARIO y está prohibido como abono.
  if (familia === 'Brassicaceae') {
    return {
      ...base,
      notes: [
        ...base.notes,
        'Las coles y el brócoli piden azufre; si tienes yeso agrícola (sulfato ' +
          'de calcio) puedes usarlo. NUNCA uses caldo sulfocálcico como abono ' +
          '(es para sanidad, no para alimentación).',
      ],
    };
  }

  return base;
}

export default getGenericFeedingTemplate;
