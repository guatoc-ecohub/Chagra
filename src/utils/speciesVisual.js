/**
 * speciesVisual.js — icono (emoji) + tono de color POR ESPECIE para el
 * catálogo y las cards de especie.
 *
 * Problema que resuelve (feedback del operador 2026-07): en el Directorio de
 * especies, el combobox del catálogo y las fichas, TODAS las especies se
 * pintaban con el mismo glifo genérico (Leaf). A 16–24px eso no distingue una
 * papa de un guayacán. Este módulo da un emoji reconocible por especie
 * (keyword sobre nombre común/científico/id) con fallback por CATEGORÍA del
 * catálogo, y un "tono" para el fondo del badge, consistente con la paleta
 * slate/emerald/amber de la UI.
 *
 * Reglas de diseño:
 *   - Emoji = contenido (especies) — misma convención que CicloVivo,
 *     HelpCycleSection y el fallback de SpeciesImage. Los iconos de línea
 *     (lucide) quedan para el chrome de UI y las etapas de ciclo.
 *   - Solo emoji ≤ Unicode 14 (🫘 ya está en uso en producción): los
 *     teléfonos rurales viejos deben poder renderizarlos.
 *   - Determinístico y puro: sin red, sin estado — igual criterio que
 *     cropSuggestions.js (regla dura: el home pinta al instante y offline).
 *
 * Grounding: keywords derivadas del catálogo real v3.1 (72 especies, 14
 * categorías). Una especie sin match cae a su categoría; sin categoría cae a
 * 🌱 emerald — nunca un hueco.
 *
 * @module utils/speciesVisual
 */

/**
 * Normaliza un texto para matching: minúsculas, sin tildes/diacríticos.
 * @param {string} s
 * @returns {string}
 */
export function normalizeSpeciesText(s) {
  if (!s || typeof s !== 'string') return '';
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .trim();
}

/*
 * Mapa de keywords → visual. El ORDEN importa: la primera coincidencia gana,
 * así que lo específico va antes que lo genérico (ej. "tomate de arbol" y
 * "tomate" comparten keyword y ambos van a 🍅, pero "tomillo" NO debe caer
 * en "tomate" — por eso se matchea con includes sobre el texto normalizado
 * y las keywords se eligen para no colisionar entre sí).
 *
 * tone ∈ {'emerald','lime','amber','orange','rose','pink','sky','slate'} —
 * ver SPECIES_TONE_CLASSES en los componentes consumidores.
 */
const KEYWORD_VISUALS = [
  // --- Cereales y pseudocereales ---
  { kw: ['maiz', 'zea mays'], emoji: '🌽', tone: 'amber' },
  { kw: ['arroz', 'oryza'], emoji: '🌾', tone: 'amber' },
  { kw: ['quinua', 'quinoa', 'chenopodium'], emoji: '🌾', tone: 'amber' },
  { kw: ['amaranto', 'amaranthus'], emoji: '🌾', tone: 'amber' },
  { kw: [' chia ', 'salvia hispanica'], emoji: '🌾', tone: 'amber' },
  { kw: ['trigo', 'cebada', 'avena'], emoji: '🌾', tone: 'amber' },

  // --- Tubérculos y raíces ---
  // Keywords cortas van ACOTADAS con espacios (el haystack se paddea) para
  // no matchear substrings: ' papa ' NO matchea "papaya", ' oca ' NO
  // matchea "cacao", etc.
  { kw: [' papa ', 'solanum tuberosum'], emoji: '🥔', tone: 'amber' },
  { kw: ['zanahoria', 'daucus', 'arracacha'], emoji: '🥕', tone: 'orange' },
  { kw: ['batata', 'camote', 'ipomoea batatas', 'yuca', 'manihot', ' name ', 'dioscorea', ' oca ', 'hibia', 'ulluco', 'chugua', 'oxalis tuberosa', 'ullucus'], emoji: '🍠', tone: 'amber' },
  { kw: ['remolacha', 'rabano'], emoji: '🥕', tone: 'rose' },

  // --- Hortalizas ---
  { kw: ['cebolla', 'cebollin', 'allium fistulosum', 'allium cepa'], emoji: '🧅', tone: 'amber' },
  { kw: ['ajo', 'allium sativum'], emoji: '🧄', tone: 'slate' },
  { kw: ['lechuga', 'lactuca', 'repollo', ' col ', 'espinaca', 'acelga'], emoji: '🥬', tone: 'emerald' },
  { kw: ['brocoli', 'coliflor'], emoji: '🥦', tone: 'emerald' },
  // "tomate" cubre tomate de mesa Y tomate de árbol/tamarillo.
  { kw: ['tomate', 'lycopersicum', 'betaceum', 'tamarillo'], emoji: '🍅', tone: 'rose' },
  { kw: ['pepino', 'cucumis'], emoji: '🥒', tone: 'emerald' },
  { kw: ['ahuyama', 'calabaza', 'zapallo', 'cucurbita'], emoji: '🎃', tone: 'orange' },
  { kw: ['pimenton', ' aji ', 'capsicum'], emoji: '🌶️', tone: 'rose' },
  { kw: ['berenjena'], emoji: '🍆', tone: 'rose' },

  // --- Granos y legumbres ---
  { kw: ['frijol', 'habichuela', 'phaseolus', 'chocho', 'tarwi', 'lupinus', 'gandul', 'cajanus', 'haba', 'lenteja', 'garbanzo', 'mucuna', 'chachafruto', 'balu', 'erythrina edulis'], emoji: '🫘', tone: 'amber' },
  { kw: ['arveja', 'pisum'], emoji: '🫘', tone: 'emerald' },
  { kw: ['maranon', 'anacardium', 'sacha inchi', 'plukenetia', ' mani ', 'arachis'], emoji: '🥜', tone: 'amber' },

  // --- Frutales ---
  // ' cafe ' acotado: NO matchea "nogal cafetero" (cordia alliodora).
  { kw: [' cafe ', 'coffea'], emoji: '☕', tone: 'amber' },
  { kw: ['cacao', 'theobroma'], emoji: '🍫', tone: 'amber' },
  { kw: ['fresa', 'fragaria'], emoji: '🍓', tone: 'rose' },
  { kw: [' mora', 'rubus', 'arandano', 'agraz', 'mortino', 'vaccinium'], emoji: '🫐', tone: 'sky' },
  { kw: ['uchuva', 'physalis'], emoji: '🍒', tone: 'orange' },
  { kw: ['lulo', 'naranjilla', 'quitoense'], emoji: '🍊', tone: 'orange' },
  { kw: ['naranja', 'mandarina', 'citrus'], emoji: '🍊', tone: 'orange' },
  { kw: [' limon '], emoji: '🍋', tone: 'amber' },
  { kw: ['aguacate', 'persea'], emoji: '🥑', tone: 'emerald' },
  { kw: ['platano', 'banano', 'musa '], emoji: '🍌', tone: 'amber' },
  { kw: [' mango', 'mangifera'], emoji: '🥭', tone: 'orange' },
  { kw: [' pina', 'ananas'], emoji: '🍍', tone: 'amber' },
  { kw: [' uva ', ' vid ', 'vitis'], emoji: '🍇', tone: 'pink' },
  { kw: ['guanabana', 'annona', 'papaya', 'carica', 'guayaba', 'psidium', 'pitahaya', 'selenicereus', 'granadilla', 'maracuya', 'curuba', 'gulupa', 'passiflora'], emoji: '🍈', tone: 'emerald' },
  { kw: ['guamo', 'inga edulis'], emoji: '🌳', tone: 'emerald' },
  { kw: ['palma', 'palmito', 'chontaduro', 'bactris', 'elaeis', ' coco'], emoji: '🌴', tone: 'emerald' },

  // --- Medicinales, aromáticas y alelopáticas ---
  { kw: ['sabila', 'aloe'], emoji: '🌵', tone: 'emerald' },
  { kw: ['vainilla', 'vanilla'], emoji: '🌸', tone: 'pink' },
  { kw: ['manzanilla', 'matricaria', 'calendula', 'boton de oro', 'tithonia', 'girasol', 'helianthus', 'crisantemo', 'chrysanthemum', 'pompon'], emoji: '🌼', tone: 'amber' },
  { kw: ['toronjil', 'melissa', 'yerbabuena', 'hierbabuena', ' menta', 'mentha', 'oregano', 'origanum', 'ortiga', 'urtica', 'llanten', 'plantago', 'cilantro', 'coriandrum', 'perejil', 'apio', 'ruda', 'romero', 'tomillo', 'albahaca', 'salvia officinalis', 'limonaria'], emoji: '🌿', tone: 'emerald' },

  // --- Flores y atractores de polinizadores ---
  { kw: [' rosa ', 'rosa x', 'rosa hybrida'], emoji: '🌹', tone: 'rose' },
  { kw: ['clavel', 'dianthus'], emoji: '🌸', tone: 'pink' },
  { kw: ['heliconia'], emoji: '🌺', tone: 'rose' },
  { kw: ['mirto', 'azahar', 'murraya'], emoji: '🌸', tone: 'pink' },
  { kw: ['orquidea', 'cattleya'], emoji: '🌸', tone: 'pink' },

  // --- Árboles, cercas vivas y coberturas ---
  { kw: ['guadua', 'bambu'], emoji: '🎋', tone: 'emerald' },
  { kw: ['iraca', 'toquilla', 'carludovica'], emoji: '🎋', tone: 'emerald' },
  { kw: ['cedro', 'caoba', 'swietenia', 'nogal', 'cordia', 'guayacan', 'tabebuia', 'aliso', 'alnus', 'roble', 'urapan', 'yarumo', 'eucalipto', 'eucalyptus', ' pino ', 'cipres'], emoji: '🌳', tone: 'emerald' },
  { kw: ['trebol', 'trifolium', 'alfalfa', 'crotalaria', 'vicia', 'abono verde'], emoji: '☘️', tone: 'lime' },
  { kw: ['kikuyo', 'pasto', 'cenchrus', 'brachiaria', 'raigras', 'melinis'], emoji: '🌾', tone: 'lime' },
  { kw: ['helecho', 'pteridium', 'retamo', 'ulex'], emoji: '🌿', tone: 'rose' },
  { kw: ['taruya', 'buchon', 'eichhornia'], emoji: '🌿', tone: 'sky' },
  { kw: ['frailejon', 'espeletia'], emoji: '🌼', tone: 'emerald' },

  // --- Organismos no-planta del catálogo ---
  { kw: ['trichoderma', 'bacillus', 'micorriza', 'microorganismo', 'bacteria', 'levadura'], emoji: '🔬', tone: 'sky' },
  { kw: ['hongo', 'orellana', ' seta', 'champinon'], emoji: '🍄', tone: 'rose' },
  { kw: ['broca', 'gorgojo', 'polilla', 'trozador', 'pulgon', 'acaro', 'mosca', 'plaga', 'fusarium', 'roya', 'gota ', 'tizon'], emoji: '🐛', tone: 'rose' },
  { kw: ['abeja', 'apis'], emoji: '🐝', tone: 'amber' },
  { kw: ['lombriz', 'eisenia'], emoji: '🪱', tone: 'amber' },
];

/*
 * Fallback por categoría del catálogo v3.1 (slugs reales del seed). Cubre
 * también los alias legacy de config/taxonomy.js (frutales, hortalizas…).
 */
const CATEGORY_VISUALS = {
  frutales_perennes: { emoji: '🍎', tone: 'rose' },
  frutales: { emoji: '🍎', tone: 'rose' },
  tuberculos_raices: { emoji: '🥔', tone: 'amber' },
  tuberculos: { emoji: '🥔', tone: 'amber' },
  cereales: { emoji: '🌾', tone: 'amber' },
  granos_legumbres: { emoji: '🫘', tone: 'amber' },
  leguminosas: { emoji: '🫘', tone: 'amber' },
  hortalizas_hoja: { emoji: '🥬', tone: 'emerald' },
  hortalizas_fruto_flor: { emoji: '🍅', tone: 'rose' },
  hortalizas: { emoji: '🥬', tone: 'emerald' },
  medicinales_alelopaticas: { emoji: '🌿', tone: 'emerald' },
  medicinales: { emoji: '🌿', tone: 'emerald' },
  atractores_polinizadores: { emoji: '🌼', tone: 'pink' },
  ornamentales_nativas: { emoji: '🌺', tone: 'pink' },
  abonos_verdes_coberturas: { emoji: '☘️', tone: 'lime' },
  abonos_verdes: { emoji: '☘️', tone: 'lime' },
  arboles_sombra: { emoji: '🌳', tone: 'emerald' },
  cercas_vivas: { emoji: '🌳', tone: 'emerald' },
  fibras_no_maderables: { emoji: '🎋', tone: 'emerald' },
  especies_invasoras: { emoji: '🌿', tone: 'rose' },
  microorganismos: { emoji: '🔬', tone: 'sky' },
  plagas: { emoji: '🐛', tone: 'rose' },
};

const DEFAULT_VISUAL = { emoji: '🌱', tone: 'emerald' };

/**
 * Resuelve el visual (emoji + tono) de una especie del catálogo.
 *
 * @param {object} sp
 * @param {string} [sp.comun] - nombre común ("Mora andina / Mora de Castilla").
 * @param {string} [sp.cientifico] - nombre científico ("Rubus glaucus Benth.").
 * @param {string} [sp.id] - id canónico del catálogo ("rubus_glaucus").
 * @param {string} [sp.familia] - familia botánica (apoyo, poco discriminante).
 * @param {string} [sp.categoria] - slug de categoría del catálogo.
 * @returns {{ emoji: string, tone: string }} nunca null — siempre hay visual.
 */
export function getSpeciesVisual(sp) {
  if (!sp || typeof sp !== 'object') return DEFAULT_VISUAL;

  // El id canónico usa "_" (rubus_glaucus) — se vuelve espacio para que las
  // keywords científicas matcheen también contra el id.
  const haystack = ` ${normalizeSpeciesText(
    [sp.comun, sp.cientifico, String(sp.id || '').replace(/_/g, ' '), sp.familia].filter(Boolean).join(' · ')
  )} `;

  if (haystack.trim()) {
    for (const entry of KEYWORD_VISUALS) {
      if (entry.kw.some((k) => haystack.includes(k))) {
        return { emoji: entry.emoji, tone: entry.tone };
      }
    }
  }

  const cat = normalizeSpeciesText(sp.categoria || '').replace(/\s+/g, '_');
  if (cat && CATEGORY_VISUALS[cat]) return CATEGORY_VISUALS[cat];

  return DEFAULT_VISUAL;
}

/**
 * Clases tailwind por tono para el BADGE del emoji (fondo tenue + borde),
 * pensadas para fondo slate-900/950. Se declaran literales para que el JIT
 * de tailwind las incluya en el bundle.
 */
export const SPECIES_TONE_CLASSES = {
  emerald: 'bg-emerald-900/40 border-emerald-700/40',
  lime: 'bg-lime-900/40 border-lime-700/40',
  amber: 'bg-amber-900/40 border-amber-700/40',
  orange: 'bg-orange-900/40 border-orange-700/40',
  rose: 'bg-rose-900/40 border-rose-700/40',
  pink: 'bg-pink-900/40 border-pink-700/40',
  sky: 'bg-sky-900/40 border-sky-700/40',
  slate: 'bg-slate-800/60 border-slate-600/40',
};
