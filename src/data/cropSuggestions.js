/**
 * cropSuggestions.js — generador DETERMINÍSTICO de sugerencias agronómicas
 * contextuales para la portada del agente (AgentHero).
 *
 * Reemplaza el array de TIPS genérico por sugerencias que se basan en los
 * CULTIVOS REALES del usuario (las plantas registradas en su finca, vía
 * `useAssetStore().plants`) cruzadas con el MES del año y el PISO TÉRMICO
 * (derivado de la altitud del perfil). Rotan en el home cada ~5s.
 *
 * REGLA DURA (operador 2026-06-06): NADA de LLM en el home. La portada debe
 * pintar al instante y offline-first. Por eso esto es 100% reglas/plantillas
 * puras (sin red, sin IndexedDB pesado, sin async). Si el usuario no tiene
 * cultivos registrados, el llamador cae al tip genérico actual.
 *
 * Cada cultivo conocido declara reglas estacionales. La regla matchea por:
 *   - keyword normalizado del nombre de la planta (attributes.name) — el mismo
 *     normalizado de biodiversityStats (lowercase, sin tildes, sin "#001").
 *   - meses aplicables (1–12). Si la regla no declara meses, aplica todo el año.
 * El piso térmico (calido/templado/frio/paramo) se usa para afinar el copy
 * cuando aplica, pero NO es requisito de match (un aguacate sirve consejo
 * aunque no sepamos su altitud).
 *
 * Español colombiano (tú/usted). SIN voseo argentino — validado por el test.
 *
 * @module data/cropSuggestions
 */

/**
 * Normaliza un nombre de planta para matching contra las keywords de cultivo.
 * Igual criterio que biodiversityStats.normalizeForMatch: lowercase, sin
 * tildes, sin sufijo "#003" de siembras bulk-individual.
 *
 * @param {string} s
 * @returns {string}
 */
export function normalizeCropName(s) {
  if (!s || typeof s !== 'string') return '';
  return s
    .replace(/\s+#\d+$/, '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .trim();
}

/**
 * Deriva el piso térmico colombiano a partir de la altitud (msnm).
 * Cálido <1000 · templado 1000–2000 · frío 2000–3000 · páramo >3000.
 *
 * @param {number|string|null|undefined} altitud
 * @returns {'calido'|'templado'|'frio'|'paramo'|null}
 */
export function pisoTermicoFromAltitud(altitud) {
  const n = Number(altitud);
  if (!Number.isFinite(n) || n <= 0) return null;
  if (n < 1000) return 'calido';
  if (n < 2000) return 'templado';
  if (n < 3000) return 'frio';
  return 'paramo';
}

/**
 * Catálogo de reglas por cultivo. Cada entrada:
 *   - keys:   keywords normalizadas que matchean el nombre de la planta.
 *   - label:  nombre legible del cultivo (para el copy, en plural cuando aplica).
 *   - rules:  [{ months?: number[], piso?: string[], text: (label)=>string }]
 *             La primera regla que matchea mes (+ piso si lo declara) gana; si
 *             ninguna declara meses, se usa como consejo de fondo todo el año.
 *
 * Los textos son consejos agronómicos seguros y genéricos (poda, abono, biol,
 * cosecha, prevención) — NO dosis químicas ni recetas peligrosas (los guards
 * del chat real cubren ese terreno; aquí solo invitamos a preguntar).
 */
const CROP_RULES = [
  {
    keys: ['aguacate', 'palta'],
    label: 'aguacates',
    rules: [
      { months: [2, 3, 4, 8, 9, 10], text: (l) => `Te sugiero aplicar biol para mejorar la fructificación de tus ${l}.` },
      { months: [5, 6, 7], text: (l) => `Es buena época para revisar el drenaje de tus ${l} y prevenir la pudrición de raíz.` },
      { text: (l) => `Pregúntame cómo nutrir y proteger tus ${l} este mes.` },
    ],
  },
  {
    keys: ['cafe', 'cafeto'],
    label: 'café',
    rules: [
      { months: [1, 2, 3], text: () => `Es buena época para podar tu café y renovar los tejidos productivos.` },
      { months: [9, 10, 11, 12], text: () => `Tu café puede estar en cosecha: pregúntame cómo manejar el beneficio y el secado.` },
      { text: () => `Pregúntame cómo abonar tu café según tu piso térmico.` },
    ],
  },
  {
    keys: ['tomate'],
    label: 'tomates',
    rules: [
      { months: [3, 4, 5, 9, 10], text: (l) => `Buena época para tutorar y deschuponar tus ${l} y mejorar el cuajado.` },
      { text: (l) => `Pregúntame un biopreparado para fortalecer tus ${l} contra hongos.` },
    ],
  },
  {
    keys: ['mora'],
    label: 'mora',
    rules: [
      { months: [1, 2, 6, 7], text: () => `Es buena época para podar tu mora y renovar las cañas que ya produjeron.` },
      { text: () => `Pregúntame cómo abonar tu mora para una cosecha más pareja.` },
    ],
  },
  {
    keys: ['platano', 'banano', 'guineo'],
    label: 'plátano',
    rules: [
      { text: () => `Te sugiero deshojar y desguascar tu plátano para prevenir la sigatoka.` },
    ],
  },
  {
    keys: ['maiz'],
    label: 'maíz',
    rules: [
      { months: [3, 4, 9, 10], text: () => `Buena época de siembra de maíz: pregúntame la distancia y el abono de fondo.` },
      { text: () => `Pregúntame cómo asociar tu maíz con fríjol y calabaza (milpa).` },
    ],
  },
  {
    keys: ['frijol', 'frisol', 'habichuela'],
    label: 'fríjol',
    rules: [
      { text: () => `Pregúntame cómo aprovechar tu fríjol para fijar nitrógeno y mejorar el suelo.` },
    ],
  },
  {
    keys: ['papa'],
    label: 'papa',
    rules: [
      { months: [4, 5, 6], text: () => `Buena época para aporcar tu papa y prevenir la gota (tizón).` },
      { text: () => `Pregúntame cómo prevenir la gota en tu papa de forma agroecológica.` },
    ],
  },
  {
    keys: ['cacao'],
    label: 'cacao',
    rules: [
      { text: () => `Te sugiero hacer poda de mantenimiento y manejo de sombra en tu cacao.` },
    ],
  },
  {
    keys: ['lulo', 'naranjilla'],
    label: 'lulo',
    rules: [
      { text: () => `Pregúntame un biopreparado para fortalecer tu lulo contra la antracnosis.` },
    ],
  },
  {
    keys: ['cebolla'],
    label: 'cebolla',
    rules: [
      { text: () => `Pregúntame el riego y el abono justo para que tu cebolla engruese bien.` },
    ],
  },
  {
    keys: ['lechuga'],
    label: 'lechugas',
    rules: [
      { text: (l) => `Tus ${l} agradecen riego parejo y sombra al medio día: pregúntame cómo.` },
    ],
  },
  {
    keys: ['cilantro', 'culantro'],
    label: 'cilantro',
    rules: [
      { text: () => `Pregúntame cómo escalonar siembras de cilantro para tener cosecha continua.` },
    ],
  },
  {
    keys: ['gulupa', 'maracuya', 'curuba'],
    label: 'pasifloras',
    rules: [
      { text: (l) => `Te sugiero revisar el tutorado y la polinización de tus ${l}.` },
    ],
  },
  {
    keys: ['fresa', 'frutilla'],
    label: 'fresas',
    rules: [
      { text: (l) => `Pregúntame cómo poner mulch a tus ${l} para fruta más limpia y sana.` },
    ],
  },
  {
    keys: ['citrico', 'naranja', 'limon', 'mandarina'],
    label: 'cítricos',
    rules: [
      { text: (l) => `Te sugiero abonar y revisar minador en tus ${l}: pregúntame el manejo.` },
    ],
  },
];

// Índice keyword → regla (O(1) por keyword). Construido una vez al cargar.
const CROP_INDEX = (() => {
  const idx = new Map();
  for (const entry of CROP_RULES) {
    for (const k of entry.keys) {
      if (!idx.has(k)) idx.set(k, entry);
    }
  }
  return idx;
})();

/**
 * Resuelve la entrada de cultivo (si existe) para un nombre de planta.
 * Hace match por contención de keyword: "Aguacate Hass" → aguacate.
 *
 * @param {string} plantName
 * @returns {object|null}
 */
function matchCropEntry(plantName) {
  const norm = normalizeCropName(plantName);
  if (!norm) return null;
  // Match exacto primero (rápido), luego por contención de palabra.
  if (CROP_INDEX.has(norm)) return CROP_INDEX.get(norm);
  for (const [key, entry] of CROP_INDEX) {
    // \b-ish: la keyword aparece como palabra dentro del nombre.
    if (norm === key || norm.startsWith(`${key} `) || norm.includes(` ${key}`) || norm.includes(`${key} `) || norm.includes(key)) {
      return entry;
    }
  }
  return null;
}

/**
 * Elige el texto de la regla aplicable a una entrada según mes + piso térmico.
 *
 * @param {object} entry - entrada de CROP_RULES
 * @param {number} month - 1–12
 * @param {string|null} piso
 * @returns {string}
 */
function pickRuleText(entry, month, piso) {
  // 1) regla que matchea mes (+ piso si lo declara)
  for (const r of entry.rules) {
    if (Array.isArray(r.months) && !r.months.includes(month)) continue;
    if (Array.isArray(r.piso) && piso && !r.piso.includes(piso)) continue;
    if (Array.isArray(r.months)) return r.text(entry.label);
  }
  // 2) regla de fondo (sin meses) — la última suele serlo
  const fallback = entry.rules.find((r) => !Array.isArray(r.months));
  return (fallback || entry.rules[entry.rules.length - 1]).text(entry.label);
}

/**
 * Construye la lista ROTATIVA de sugerencias contextuales a partir de las
 * plantas reales del usuario. Determinístico: mismas plantas + mismo mes ⇒
 * misma lista en el mismo orden.
 *
 * @param {Array<{attributes?: {name?: string}, name?: string}>} plants
 * @param {object} [opts]
 * @param {number} [opts.month] - mes 1–12 (default: mes actual)
 * @param {number|string|null} [opts.altitud] - msnm para el piso térmico
 * @param {number} [opts.max] - máximo de sugerencias (default 5)
 * @returns {string[]} textos de sugerencia, sin duplicados, en orden estable
 */
export function buildCropSuggestions(plants, opts = {}) {
  const month = Number.isInteger(opts.month) ? opts.month : new Date().getMonth() + 1;
  const piso = pisoTermicoFromAltitud(opts.altitud);
  const max = Number.isInteger(opts.max) ? opts.max : 5;

  if (!Array.isArray(plants) || plants.length === 0) return [];

  // Recolecta entradas de cultivo únicas, en orden de aparición de las plantas
  // (estable). Varias plantas del mismo cultivo ⇒ una sola sugerencia.
  const seen = new Set();
  const suggestions = [];
  for (const p of plants) {
    const name = p?.attributes?.name || p?.name || '';
    const entry = matchCropEntry(name);
    if (!entry) continue;
    const key = entry.label;
    if (seen.has(key)) continue;
    seen.add(key);
    const text = pickRuleText(entry, month, piso);
    if (text) suggestions.push(text);
    if (suggestions.length >= max) break;
  }
  return suggestions;
}

// (__CROP_RULES__ — no exportado: sin referencias externas)
