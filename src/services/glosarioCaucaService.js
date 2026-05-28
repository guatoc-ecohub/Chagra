/**
 * glosarioCaucaService.js — normalización léxica regional Cauca para el agente
 * (Free 7→10 fix-pack #5, memoria project-free-7-10-analysis-2026-05-28 hipótesis #2).
 *
 * Bug observado: Free (campesino-target Cauca rural) usa términos del habla
 * regional que el LLM no reconoce. Ejemplo: dice "papa runa" en vez de "papa
 * criolla", "rascadero" en vez de "rastrojo", "jelao" en vez de "frío". Si
 * el LLM no entiende el término, la respuesta es genérica o incorrecta.
 *
 * Estrategia:
 *   - Preprocess input → reemplazar términos regionales por sus equivalentes
 *     estándar ANTES de mandar al LLM. El LLM responde sobre conceptos que
 *     conoce.
 *   - Postprocess output (opcional) → reemplazar los estándar en la
 *     respuesta del LLM por el término regional para que el campesino sienta
 *     que el agente habla "su" idioma. Esto es mejor-effort: si el LLM ya
 *     mezcla términos, no rompemos.
 *
 * Diseño defensivo:
 *   - Si el glosario no carga, las funciones devuelven el texto sin cambios
 *     (passthrough seguro).
 *   - Match case-insensitive con boundaries de palabra para evitar matches
 *     dentro de palabras compuestas ("papa runa" no debe matchear "papar uña").
 *   - El `isInCaucaRegion(finca)` decide si aplicar el glosario. Por ahora
 *     bioculturalmente Cauca andino + pacífico. Si el finca no tiene zona
 *     o región definida, conservador: NO aplicar (passthrough).
 */

import glosario from '../data/glosario-regional-cauca.json';

const GLOSARIO_TERMINOS = glosario?.terminos || {};

// Construido lazy en el primer uso para no penalizar el cold-start.
let _forwardEntries = null;
let _reverseEntries = null;

/**
 * Escapa caracteres regex en una clave para usarla en RegExp segura.
 * "papa runa" → "papa runa" (no hay regex chars).
 * "ñ" o "í" pasan tal cual (es regex-safe).
 */
function escapeRegex(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Construye las entradas ordenadas por largo descendente para que matches
 * más específicos ganen ("papa runa" antes que "papa"). Lazy + memoized.
 */
function getForwardEntries() {
  if (_forwardEntries === null) {
    _forwardEntries = Object.entries(GLOSARIO_TERMINOS)
      .filter(([k, v]) => typeof k === 'string' && typeof v === 'string')
      .sort((a, b) => b[0].length - a[0].length);
  }
  return _forwardEntries;
}

/**
 * Inverso: estándar → regional. Si dos términos regionales mapean al mismo
 * estándar ("papa runa" + "papa amarilla pequeña" → "papa criolla"), nos
 * quedamos con la primera ocurrencia (la del término más usado, que está
 * arriba en el JSON).
 */
function getReverseEntries() {
  if (_reverseEntries === null) {
    const reverseMap = {};
    Object.entries(GLOSARIO_TERMINOS).forEach(([local, estandar]) => {
      if (typeof estandar === 'string' && !(estandar in reverseMap)) {
        reverseMap[estandar] = local;
      }
    });
    _reverseEntries = Object.entries(reverseMap)
      .sort((a, b) => b[0].length - a[0].length);
  }
  return _reverseEntries;
}

/**
 * Decide si el glosario regional Cauca debe aplicarse para una finca activa.
 *
 * Conservador: solo aplica si la zona biocultural está dentro del Cauca
 * andino-pacífico (los slugs documentados son `valle_caucano` y `pacifico`
 * con departamento `cauca`). Si no hay info de finca, NO aplica.
 *
 * @param {Object|null|undefined} finca
 * @returns {boolean}
 */
export function isInCaucaRegion(finca) {
  if (!finca || typeof finca !== 'object') return false;
  const zone = (finca.biocultural_zone || '').toLowerCase();
  const depto = (finca.departamento || finca.region || '').toLowerCase();
  if (depto === 'cauca' || depto === 'cauca_dpto') return true;
  if (zone === 'valle_caucano' || zone === 'pacifico') {
    // Cauca y Valle del Cauca comparten habla. Si el departamento es
    // explícito, ya devolvimos true arriba. Si solo tenemos zona, asumimos
    // habla regional Cauca aplica.
    return true;
  }
  return false;
}

/**
 * Normaliza el input del usuario antes de mandarlo al LLM.
 *
 * Reemplaza términos regionales del Cauca por sus equivalentes estándar
 * para que el LLM (entrenado mayormente con español estándar / neutro
 * latino) entienda la pregunta.
 *
 * Idempotente: aplicar dos veces da el mismo resultado (los términos
 * estándar no están en el glosario como claves).
 *
 * @param {string} text - input crudo del usuario.
 * @param {Object} [opts]
 * @param {Object} [opts.finca] - finca activa para gate por región. Si no se
 *   pasa, asume aplicación global (útil para tests).
 * @param {boolean} [opts.force] - forzar aplicación sin chequear región.
 * @returns {string} texto con términos regionales reemplazados, o el texto
 *   original si la región no califica o el glosario está vacío.
 */
export function normalizeUserInput(text, opts = {}) {
  if (typeof text !== 'string' || text.length === 0) return text;
  const { finca = null, force = false } = opts;
  if (!force && finca !== null && !isInCaucaRegion(finca)) return text;

  let out = text;
  for (const [local, estandar] of getForwardEntries()) {
    // Word boundaries `\b` no funcionan bien con caracteres acentuados en
    // todos los browsers. Usamos look-around manual: precedido por start
    // o non-letter, seguido por end o non-letter.
    const escaped = escapeRegex(local);
    const re = new RegExp(`(^|[^\\p{L}\\p{N}_])${escaped}(?![\\p{L}\\p{N}_])`, 'giu');
    out = out.replace(re, (match, pre) => `${pre}${estandar}`);
  }
  return out;
}

/**
 * Localiza la respuesta del LLM reemplazando términos estándar por sus
 * equivalentes regionales del Cauca, para que la voz del agente "suene"
 * más cercana al campesino-target.
 *
 * Conservador: solo aplica reverse-replace si el término estándar aparece
 * en un contexto plano (no dentro de citas científicas que el LLM emite
 * como "Solanum tuberosum"). Esto se logra con la misma regla de
 * boundaries que la normalización.
 *
 * Mejor-effort: si el LLM ya mezcla términos o usa formas no exactas, no
 * pasa nada. Devolverá el texto sin cambios para las partes que no
 * matchean.
 *
 * @param {string} text - respuesta del LLM.
 * @param {Object} [opts] - mismas opciones que normalizeUserInput.
 * @returns {string}
 */
export function localizeAgentOutput(text, opts = {}) {
  if (typeof text !== 'string' || text.length === 0) return text;
  const { finca = null, force = false } = opts;
  if (!force && finca !== null && !isInCaucaRegion(finca)) return text;

  let out = text;
  for (const [estandar, local] of getReverseEntries()) {
    const escaped = escapeRegex(estandar);
    const re = new RegExp(`(^|[^\\p{L}\\p{N}_])${escaped}(?![\\p{L}\\p{N}_])`, 'giu');
    out = out.replace(re, (match, pre) => `${pre}${local}`);
  }
  return out;
}

/**
 * Devuelve el contador de términos cargados — útil para tests y debug.
 */
export function getGlosarioStats() {
  return {
    version: glosario?._meta?.version || 'unknown',
    region: glosario?._meta?.region || 'unknown',
    totalTerminos: Object.keys(GLOSARIO_TERMINOS).length,
  };
}

export default {
  isInCaucaRegion,
  normalizeUserInput,
  localizeAgentOutput,
  getGlosarioStats,
};
