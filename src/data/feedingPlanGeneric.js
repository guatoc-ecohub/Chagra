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
 *   - NO se inventan dosis. Cada paso referencia un biopreparado del seed
 *     (`catalog/biopreparados-seed.json`) y copia su `dosis_aplicacion` TEXTUAL
 *     en `dose_text`. Si un biopreparado no trae dosis numérica, se deja la guía
 *     textual; no se fabrican números.
 *   - Toda plantilla lleva `isGeneric: true`, `confidence: 'baja'` y una nota
 *     que recuerda que es orientativa por TIPO de cultivo, no dato de la especie.
 *
 * Biopreparados PREDIALES de nutrición usados (todos con `dosis_aplicacion` en
 * el seed): bocashi, biol, supermagro, humus_liquido, te_compost.
 */
import biopreparadosSeed from '../../catalog/biopreparados-seed.json';

// Índice id → entrada del seed, para leer dosis/nombre TEXTUALMENTE (no inventar).
const SEED_BY_ID = new Map(
  (biopreparadosSeed?.biopreparados || []).map((b) => [b.id, b]),
);

/**
 * Biopreparados fitosanitarios — PROHIBIDOS en plantillas de alimentación.
 * Se usan en tests y como guardia documental: la sanidad vive en otra sección.
 */
export const FITOSANITARIOS = Object.freeze([
  'caldo_bordeles',
  'caldo_sulfocalcico',
  'bacillus_subtilis_foliar',
  'trichoderma_harzianum_suelo',
]);

const GENERIC_NOTE =
  'Plan orientativo por tipo de cultivo — ajústalo a tu suelo (idealmente con ' +
  'análisis) y a lo que veas en la planta.';

/**
 * Construye un paso de nutrición a partir de un id de biopreparado del seed.
 * La dosis se copia TEXTUAL del seed (`dosis_aplicacion`); si no existe, se
 * deja `dose_text: null` y la guía honesta queda en `notes`. Nunca inventa.
 *
 * @param {Object} cfg
 * @param {number} cfg.offset_days — días desde siembra/trasplante
 * @param {string} cfg.action — qué hacer, en lenguaje campesino
 * @param {string} cfg.biofertilizer_slug — id del biopreparado en el seed
 * @param {string} cfg.notes — contexto agronómico del paso
 * @param {number} [cfg.dose_g] — dosis sólida numérica SOLO si está documentada
 *   como rango de campo en el seed (ej. bocashi "80-150 g por planta")
 * @returns {Object} paso normalizado, compatible con primary_steps del catálogo
 */
function step({ offset_days, action, biofertilizer_slug, notes, dose_g }) {
  const seed = SEED_BY_ID.get(biofertilizer_slug) || null;
  const doseText = seed?.dosis_aplicacion || null;
  return {
    offset_days,
    action,
    biofertilizer_slug,
    // Dosis TEXTUAL del seed (no inventada). null si el biopreparado no la trae.
    dose_text: doseText,
    // Dosis numérica solo cuando el seed la documenta como rango de campo.
    ...(Number.isFinite(dose_g) ? { dose_g } : {}),
    notes,
  };
}

/**
 * Envuelve una secuencia de pasos en una plantilla genérica marcada como
 * orientativa.
 *
 * @param {Object} cfg
 * @param {string} cfg.categoryId
 * @param {string} cfg.label — etiqueta legible del tipo de cultivo
 * @param {Array<Object>} cfg.steps
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
      'Biopreparados prediales del catálogo Chagra (catalog/biopreparados-seed.json). ' +
      'Secuencia de nutrición genérica por tipo de cultivo, NO específica de la especie.',
    notes: [GENERIC_NOTE, ...extraNotes],
    primary_steps: steps,
  };
}

/**
 * Plantillas base por categoría. Patrón común:
 *   fondo (bocashi al hoyo/surco) → refuerzo vegetativo (biol foliar / humus
 *   drench) → pico de demanda según órgano → té de compost de mantenimiento.
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
        notes: 'Abonado de fondo. Mezclar con el sustrato 0-15 cm; aplicar maduro y frío.',
      }),
      step({
        offset_days: 15,
        action: 'Foliar con biol en pleno crecimiento de hojas',
        biofertilizer_slug: 'biol',
        notes: 'Pico de demanda de nitrógeno: la hoja es el órgano que se cosecha. Aplicar al amanecer o atardecer.',
      }),
      step({
        offset_days: 30,
        action: 'Drench de humus líquido al pie',
        biofertilizer_slug: 'humus_liquido',
        notes: 'Refuerzo de aminoácidos y microbiota para sostener el follaje tierno.',
      }),
      step({
        offset_days: 45,
        action: 'Té de compost de mantenimiento',
        biofertilizer_slug: 'te_compost',
        notes: 'Aporte microbiano de sostenimiento hasta cosecha.',
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
        notes: 'Abonado de fondo. Mezclar con el sustrato 0-15 cm; aplicar maduro y frío.',
      }),
      step({
        offset_days: 20,
        action: 'Foliar con biol en crecimiento vegetativo',
        biofertilizer_slug: 'biol',
        notes: 'Sostiene el desarrollo de la planta antes de la floración.',
      }),
      step({
        offset_days: 45,
        action: 'Foliar con supermagro en floración y cuaje',
        biofertilizer_slug: 'supermagro',
        notes: 'Pico de demanda: aporta potasio y microelementos (Mg, Zn, B) para floración, cuaje y llenado de fruto.',
      }),
      step({
        offset_days: 75,
        action: 'Té de compost de mantenimiento en producción',
        biofertilizer_slug: 'te_compost',
        notes: 'Aporte microbiano de sostenimiento durante la cosecha escalonada.',
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
        notes: 'Abonado de fondo al surco. Aplicar maduro y frío para no quemar la semilla/tubérculo.',
      }),
      step({
        offset_days: 25,
        action: 'Foliar con biol en desarrollo de follaje',
        biofertilizer_slug: 'biol',
        notes: 'Sostiene el área foliar que alimentará el llenado del tubérculo/raíz.',
      }),
      step({
        offset_days: 60,
        action: 'Foliar con supermagro en llenado de tubérculo',
        biofertilizer_slug: 'supermagro',
        notes: 'Pico de demanda de potasio para el llenado y la calidad del tubérculo/raíz.',
      }),
      step({
        offset_days: 90,
        action: 'Té de compost de mantenimiento',
        biofertilizer_slug: 'te_compost',
        notes: 'Aporte microbiano de sostenimiento hasta el final del ciclo.',
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
      'Las leguminosas fijan su propio nitrógeno: NO aplicar biol rico en N; priorizar fósforo y compost.',
    ],
    steps: [
      step({
        offset_days: 0,
        action: 'Incorporar bocashi al surco (fósforo y materia orgánica)',
        biofertilizer_slug: 'bocashi',
        dose_g: 100,
        notes: 'Abonado de fondo. En leguminosas el foco es fósforo y materia orgánica, no nitrógeno.',
      }),
      step({
        offset_days: 30,
        action: 'Drench de humus líquido al pie',
        biofertilizer_slug: 'humus_liquido',
        notes: 'Microbiota y materia orgánica que favorecen la nodulación. NO se aplica biol (la planta ya fija su propio N).',
      }),
      step({
        offset_days: 60,
        action: 'Té de compost de mantenimiento',
        biofertilizer_slug: 'te_compost',
        notes: 'Aporte microbiano de sostenimiento. Sin nitrógeno añadido.',
      }),
    ],
  });
}

function buildCereals() {
  // Cereales: N en macollamiento (biol), refuerzo en encañe/llenado.
  return template({
    categoryId: 'cereales',
    label: 'Cereal',
    steps: [
      step({
        offset_days: 0,
        action: 'Incorporar bocashi al surco de siembra',
        biofertilizer_slug: 'bocashi',
        dose_g: 100,
        notes: 'Abonado de fondo al surco. Aplicar maduro y frío.',
      }),
      step({
        offset_days: 25,
        action: 'Foliar con biol en macollamiento',
        biofertilizer_slug: 'biol',
        notes: 'Pico de demanda de nitrógeno en macollamiento: define el número de tallos productivos.',
      }),
      step({
        offset_days: 55,
        action: 'Foliar con biol en encañe / inicio de llenado',
        biofertilizer_slug: 'biol',
        notes: 'Refuerzo para sostener el llenado del grano.',
      }),
      step({
        offset_days: 85,
        action: 'Té de compost de mantenimiento',
        biofertilizer_slug: 'te_compost',
        notes: 'Aporte microbiano de sostenimiento hasta maduración.',
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
 *   - familia Solanaceae → nota de calcio (anti pudrición apical / blossom-end rot).
 *   - familia Brassicaceae → nota de azufre.
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

  // Override #2/#3: notas por familia (no cambian dosis ni añaden N inventado).
  if (familia === 'Solanaceae') {
    return {
      ...base,
      notes: [
        ...base.notes,
        'Aporta calcio (cal/cascarón) para evitar pudrición apical (blossom-end rot).',
      ],
    };
  }
  if (familia === 'Brassicaceae') {
    return {
      ...base,
      notes: [
        ...base.notes,
        'Las brásicas demandan azufre: complementa con una fuente de azufre al suelo.',
      ],
    };
  }

  return base;
}

export default getGenericFeedingTemplate;
