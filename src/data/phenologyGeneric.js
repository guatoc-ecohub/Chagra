/**
 * phenologyGeneric — plantillas fenológicas GENÉRICAS por tipo de cultivo.
 *
 * Tarea #62: cuando una especie NO tiene plantilla específica propia (ni la de
 * su especie madre, para cultivares), el ciclo no debe quedar vacío ni mostrarse
 * como un dato firme inventado. Estas plantillas dan una referencia AMPLIA por
 * categoría agronómica del catálogo (`category`), claramente marcada como
 * aproximada.
 *
 * REGLA ANTI-ALUCINACIÓN (crítica):
 *   - Estas plantillas NO afirman días-a-cosecha de una especie concreta. Son
 *     rangos amplios por TIPO de cultivo, marcados `is_generic: true` y con una
 *     fuente que lo deja explícito. La UI debe presentarlas como aproximación,
 *     no como dato específico de la especie.
 *   - Para tipos sin ciclo anual estimable de forma honesta (árboles de sombra,
 *     frutales perennes muy variables, especies invasoras, perennes medicinales,
 *     fibras) NO se define genérico: `getGenericTemplate` retorna null y la UI
 *     mantiene "no hay estimación" en vez de inventar fechas.
 *   - Los rangos son intencionalmente anchos (baja confianza) para no aparentar
 *     precisión que no tenemos.
 */

const GENERIC_SOURCE = {
  name: 'Estimación genérica por tipo de cultivo',
  reference:
    'Rango amplio por categoría agronómica. NO es dato específico de la especie; ' +
    'es una aproximación de referencia mientras no exista plantilla propia.',
  nota: 'aproximado-por-tipo',
};

/**
 * Construye una plantilla genérica de ciclo anual con 4 etapas a partir de un
 * total de días-a-cosecha (rango). Todas las etapas heredan la misma fuente
 * genérica y el flag `is_generic`.
 *
 * @param {Object} cfg
 * @param {string} cfg.categoryId
 * @param {string} cfg.label — etiqueta del tipo de cultivo
 * @param {number} cfg.harvestMin — días mínimos a cosecha
 * @param {number} cfg.harvestMax — días máximos a cosecha
 * @returns {Object} plantilla normalizable por phenologyCalculator
 */
function annualTemplate({ categoryId, label, harvestMin, harvestMax }) {
  // Reparto proporcional de etapas sobre el ciclo total (porcentajes amplios y
  // conservadores). No pretende precisión; sirve para ubicar al campesino.
  const vegEnd = Math.round(harvestMin * 0.55);
  const flowerEnd = Math.round(harvestMin * 0.8);
  return {
    template_id: `generic.${categoryId}`,
    species_slug: `generic.${categoryId}`,
    species_label: `${label} (estimación por tipo)`,
    version: 1,
    is_generic: true,
    sources: [GENERIC_SOURCE],
    stages: [
      { code: 'sowing', label: 'Siembra', description: 'Día de siembra o trasplante.', minDays: 0, maxDays: 0, sourceIndex: 0 },
      { code: 'vegetative', label: 'Crecimiento', description: 'Desarrollo de hojas y raíces (aproximado).', minDays: 1, maxDays: vegEnd, sourceIndex: 0 },
      { code: 'flowering', label: 'Floración', description: 'Aparición de flores (aproximado).', minDays: vegEnd + 1, maxDays: flowerEnd, sourceIndex: 0 },
      { code: 'harvest_window', label: 'Cosecha', description: 'Ventana amplia de cosecha por tipo de cultivo.', minDays: harvestMin, maxDays: harvestMax, sourceIndex: 0 },
      { code: 'closed', label: 'Ciclo cerrado', description: 'Fin del ciclo.', minDays: harvestMax + 1, maxDays: null, sourceIndex: 0 },
    ],
  };
}

/**
 * Genéricos por categoría del catálogo. Solo se incluyen tipos con un ciclo
 * anual/bienal cuyo rango amplio es agronómicamente defendible. Las categorías
 * ausentes (frutales_perennes, arboles_sombra, especies_invasoras,
 * medicinales_alelopaticas, fibras_no_maderables) quedan SIN genérico a
 * propósito: su ciclo es de años o muy variable y no se estima sin datos.
 *
 * @type {Map<string, Object>}
 */
const genericRegistry = new Map([
  ['hortalizas_hoja', annualTemplate({ categoryId: 'hortalizas_hoja', label: 'Hortaliza de hoja', harvestMin: 40, harvestMax: 90 })],
  ['hortalizas_fruto_flor', annualTemplate({ categoryId: 'hortalizas_fruto_flor', label: 'Hortaliza de fruto', harvestMin: 70, harvestMax: 140 })],
  ['cereales', annualTemplate({ categoryId: 'cereales', label: 'Cereal', harvestMin: 100, harvestMax: 180 })],
  ['granos_legumbres', annualTemplate({ categoryId: 'granos_legumbres', label: 'Grano o leguminosa', harvestMin: 90, harvestMax: 180 })],
  ['tuberculos_raices', annualTemplate({ categoryId: 'tuberculos_raices', label: 'Tubérculo o raíz', harvestMin: 90, harvestMax: 270 })],
  ['abonos_verdes_coberturas', annualTemplate({ categoryId: 'abonos_verdes_coberturas', label: 'Abono verde o cobertura', harvestMin: 60, harvestMax: 150 })],
  ['atractores_polinizadores', annualTemplate({ categoryId: 'atractores_polinizadores', label: 'Atractor de polinizadores', harvestMin: 50, harvestMax: 120 })],
]);

/**
 * Retorna una plantilla genérica para una categoría del catálogo, o null si esa
 * categoría no tiene un ciclo anual estimable de forma honesta.
 *
 * @param {string} categoryId — valor de `category` del catálogo
 * @returns {Object|null}
 */
export function getGenericTemplate(categoryId) {
  if (!categoryId || typeof categoryId !== 'string') return null;
  return genericRegistry.get(categoryId) || null;
}

/**
 * Categorías que tienen genérico (para tests / introspección).
 * @returns {string[]}
 */
export function getGenericCategories() {
  return Array.from(genericRegistry.keys());
}
