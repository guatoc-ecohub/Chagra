/**
 * aguaCalculos.js — lógica DETERMINISTA del módulo "Agua de la finca".
 *
 * Solo matemática de unidades y fórmulas clásicas de manejo de agua. AQUÍ NO
 * VIVEN DATOS DUROS (lluvia por zona, Kc por cultivo, ETo por piso térmico):
 * esos son slots grounded-pendiente en src/data/aguaFinca.js y llegan por el
 * pipeline de grounding (DR → catálogo/AGE), nunca inventados en código.
 *
 * Identidad de unidades que sostiene todo el módulo:
 *   1 mm de lluvia sobre 1 m² = 1 litro. (No es un dato: es la definición
 *   del milímetro de precipitación.)
 */

/**
 * Coeficiente de escorrentía del techo: fracción de la lluvia que de verdad
 * llega al tanque (el resto se pierde en salpique, evaporación y primeras
 * lavadas del techo). 0.8 es un valor CONSERVADOR de diseño, usado como
 * default editable por la persona.
 *
 * TODO GROUNDED-PENDIENTE: coeficiente por material de techo (zinc/teja de
 * barro/fibrocemento/paja) con fuente técnica citada (DR cosecha de agua
 * lluvia). Cuando llegue, este default pasa a ser el fallback.
 */
export const COEF_ESCORRENTIA_TECHO_DEFAULT = 0.8;

/** Una caneca azul estándar de 55 galones (EE. UU.) ≈ 208 litros. Conversión de unidades, no dato de campo. */
export const LITROS_POR_CANECA_55GAL = 208;

/**
 * Parseo estricto para inputs de formulario: '' / null / undefined → NaN
 * (Number('') sería 0 y un campo vacío se volvería "0 mm de lluvia" — falso).
 * @param {number|string|null|undefined} v
 * @returns {number}
 */
function num(v) {
  if (v == null || (typeof v === 'string' && v.trim() === '')) return NaN;
  return Number(v);
}

/**
 * Litros de lluvia captables en un periodo.
 * litros = área de techo (m²) × lluvia (mm) × coeficiente de escorrentía.
 *
 * @param {Object} p
 * @param {number|string} p.areaTechoM2 - área de techo que drena a canal (m²)
 * @param {number|string} p.lluviaMm - lámina de lluvia del periodo (mm)
 * @param {number|string} [p.coefEscorrentia] - fracción 0–1 que llega al tanque
 * @returns {number|null} litros (redondeados), o null si la entrada no sirve
 */
export function litrosLluviaCaptables({ areaTechoM2, lluviaMm, coefEscorrentia = COEF_ESCORRENTIA_TECHO_DEFAULT }) {
  const area = num(areaTechoM2);
  const mm = num(lluviaMm);
  const coef = num(coefEscorrentia);
  if (!Number.isFinite(area) || area <= 0) return null;
  if (!Number.isFinite(mm) || mm < 0) return null;
  if (!Number.isFinite(coef) || coef <= 0 || coef > 1) return null;
  return Math.round(area * mm * coef);
}

/**
 * Cuántas canecas de 55 galones equivalen a unos litros. Para que el número
 * grande se pueda "ver" en objetos de finca.
 * @param {number|string} litros — acepta string crudo de input.
 * @returns {number|null} canecas (1 decimal)
 */
export function canecasEquivalentes(litros) {
  const l = num(litros);
  if (!Number.isFinite(l) || l < 0) return null;
  return Math.round((l / LITROS_POR_CANECA_55GAL) * 10) / 10;
}

/**
 * Porcentaje de llenado de un tanque (tope 100).
 * @param {Object} p
 * @param {number|string} p.litros - litros captados
 * @param {number|string} p.capacidadL - capacidad del tanque en litros
 * @returns {number|null} 0–100
 */
export function porcentajeTanque({ litros, capacidadL }) {
  const l = num(litros);
  const cap = num(capacidadL);
  if (!Number.isFinite(l) || l < 0) return null;
  if (!Number.isFinite(cap) || cap <= 0) return null;
  return Math.min(100, Math.round((l / cap) * 100));
}

/**
 * ETc (consumo diario del cultivo) = ETo × Kc. Fórmula FAO clásica; los
 * VALORES de ETo (por piso térmico) y Kc (por cultivo y etapa) son slots
 * grounded-pendiente en src/data/aguaFinca.js — aquí solo se multiplica lo
 * que la persona (o el catálogo, cuando llegue) ponga.
 *
 * @param {Object} p
 * @param {number|string} p.etoMmDia - evapotranspiración de referencia (mm/día)
 * @param {number|string} p.kc - coeficiente del cultivo (típico 0.2–1.3)
 * @returns {number|null} ETc en mm/día (2 decimales)
 */
export function etcDiaria({ etoMmDia, kc }) {
  const eto = num(etoMmDia);
  const k = num(kc);
  if (!Number.isFinite(eto) || eto <= 0) return null;
  if (!Number.isFinite(k) || k <= 0 || k > 2) return null;
  return Math.round(eto * k * 100) / 100;
}

/**
 * Litros de riego por día para un área: ETc (mm/día) × área (m²).
 * (1 mm = 1 L/m², identidad de unidades.) Es la necesidad NETA de la planta;
 * el sistema de riego pierde una parte según su eficiencia (ese coeficiente
 * es slot grounded-pendiente, no se aplica aquí).
 *
 * @param {Object} p
 * @param {number|string} p.etcMmDia - consumo del cultivo (mm/día)
 * @param {number|string} p.areaM2 - área sembrada (m²)
 * @returns {number|null} litros por día (redondeados)
 */
export function litrosRiegoDia({ etcMmDia, areaM2 }) {
  const etc = num(etcMmDia);
  const area = num(areaM2);
  if (!Number.isFinite(etc) || etc <= 0) return null;
  if (!Number.isFinite(area) || area <= 0) return null;
  return Math.round(etc * area);
}

/**
 * Cuántos días alcanza el agua guardada para un consumo diario dado.
 * @param {Object} p
 * @param {number|string} p.litrosGuardados
 * @param {number|string} p.consumoLitrosDia
 * @returns {number|null} días enteros (piso)
 */
export function diasDeReserva({ litrosGuardados, consumoLitrosDia }) {
  const l = num(litrosGuardados);
  const c = num(consumoLitrosDia);
  if (!Number.isFinite(l) || l < 0) return null;
  if (!Number.isFinite(c) || c <= 0) return null;
  return Math.floor(l / c);
}
