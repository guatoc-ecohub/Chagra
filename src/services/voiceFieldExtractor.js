/**
 * voiceFieldExtractor — Extractor DETERMINÍSTICO on-device (offline) del
 * registro por voz unificado (#23, "botón único de voz").
 *
 * Toma una transcripción en español campesino y produce un REGISTRO
 * ESTRUCTURADO unificado: clasifica la intención entre TODOS los tipos
 * (planta, siembra, cosecha, insumo, mantenimiento, observación, plaga) y
 * extrae los campos presentes (especie, medidas, fenología, síntomas,
 * posición, tiempo).
 *
 * Es la capa de FALLBACK del agente grounded (`voiceRouter`): cuando el
 * sidecar/NLU no está disponible (offline, modelo caído), este extractor
 * resuelve el registro SIN red, SIN modelo. Por eso es PURO y SÍNCRONO:
 *   - No toca red, no toca IndexedDB, no llama al LLM.
 *   - La resolución de especie usa el catálogo ESTÁTICO `CROP_TAXONOMY`
 *     (src/config/taxonomy.js) vía fuzzy match — la MISMA fuente de verdad
 *     que VoiceConfirmation, así que la trampa gulupa≠guayaba se respeta
 *     (gulupa → passiflora_edulis, nunca psidium_guajava).
 *   - El tiempo relativo se calcula contra un `now` inyectable (testable;
 *     no llama Date.now() en el core).
 *
 * Diseño anti-alucinación: NO inventa especie. Si el nombre no cruza con el
 * catálogo (ej. aguacate/mango no están en CROP_TAXONOMY hoy), deja la
 * especie como texto crudo (`raw`) con slug null y el confirm lo muestra
 * editable — nunca fuerza un binomio falso.
 */

import { CROP_TAXONOMY } from '../config/taxonomy';
import { normalize } from '../utils/entityMatcher';

/** Intenciones soportadas por el flujo de voz unificado. */
export const INTENTS = {
  PLANTA: 'registrar_planta',
  SIEMBRA: 'registrar_siembra',
  COSECHA: 'registrar_cosecha',
  INSUMO: 'registrar_insumo',
  MANTENIMIENTO: 'registrar_mantenimiento',
  OBSERVACION: 'registrar_observacion',
  PLAGA: 'reportar_plaga',
};

/**
 * Metadatos por intención: etiqueta legible, ícono, y a qué entidad FarmOS
 * se persiste (saveType = enum de payloadService.savePayload). Compartido por
 * el confirm (UI) y el builder de payload.
 */
export const INTENT_META = {
  [INTENTS.PLANTA]: { label: 'Planta', icon: '🌳', saveType: 'plant_asset', farmos: 'asset--plant', georef: true },
  [INTENTS.SIEMBRA]: { label: 'Siembra', icon: '🌱', saveType: 'seeding', farmos: 'log--seeding', georef: true },
  [INTENTS.COSECHA]: { label: 'Cosecha', icon: '🧺', saveType: 'harvest', farmos: 'log--harvest', georef: false },
  [INTENTS.INSUMO]: { label: 'Insumo aplicado', icon: '🧪', saveType: 'input', farmos: 'log--input', georef: false },
  [INTENTS.MANTENIMIENTO]: { label: 'Mantenimiento', icon: '✂️', saveType: 'task', farmos: 'log--task', georef: false },
  [INTENTS.OBSERVACION]: { label: 'Observación', icon: '👁️', saveType: 'observation', farmos: 'log--observation', georef: true },
  [INTENTS.PLAGA]: { label: 'Plaga / Invasora', icon: '🐛', saveType: 'observation', farmos: 'log--observation', georef: true },
};

// ───────────────────────── Numerales en palabra → entero ─────────────────────────

const UNITS = {
  cero: 0, un: 1, uno: 1, una: 1, dos: 2, tres: 3, cuatro: 4, cinco: 5,
  seis: 6, siete: 7, ocho: 8, nueve: 9, diez: 10, once: 11, doce: 12,
  trece: 13, catorce: 14, quince: 15, dieciseis: 16, diecisiete: 17,
  dieciocho: 18, diecinueve: 19, veinte: 20, veintiun: 21, veintiuno: 21,
  veintidos: 22, veintitres: 23, veinticuatro: 24, veinticinco: 25,
  veintiseis: 26, veintisiete: 27, veintiocho: 28, veintinueve: 29,
};
const TENS = { treinta: 30, cuarenta: 40, cincuenta: 50, sesenta: 60, setenta: 70, ochenta: 80, noventa: 90 };
const SCALES = { cien: 100, ciento: 100, cienta: 100, mil: 1000 };

// Lista de tokens numéricos para construir regex (más largos primero para no
// cortar "veintidos" en "dos").
const NUMBER_WORDS = [
  ...Object.keys(UNITS), ...Object.keys(TENS), ...Object.keys(SCALES),
].sort((a, b) => b.length - a.length);
const NUMBER_WORD_RE = NUMBER_WORDS.join('|');

/**
 * Convierte un token numérico (dígitos o palabra, incl. compuestos "treinta y
 * cinco") a entero. Devuelve null si no es numérico.
 */
export function parseNumberToken(tok) {
  if (tok == null) return null;
  const s = normalize(String(tok));
  if (!s) return null;
  if (/^\d+$/.test(s)) return parseInt(s, 10);
  // Compuesto "treinta y cinco" / "cincuenta y dos".
  const compound = s.match(/^(treinta|cuarenta|cincuenta|sesenta|setenta|ochenta|noventa)\s+y\s+(\w+)$/);
  if (compound && TENS[compound[1]] != null && UNITS[compound[2]] != null) {
    return TENS[compound[1]] + UNITS[compound[2]];
  }
  if (UNITS[s] != null) return UNITS[s];
  if (TENS[s] != null) return TENS[s];
  if (SCALES[s] != null) return SCALES[s];
  return null;
}

// ───────────────────────── Índice de especies (catálogo estático) ─────────────────────────

/**
 * Aliases / regionalismos → slug del catálogo. Resuelven nombres campesinos
 * y desambiguan trampas que el fuzzy solo no acierta:
 *   - "mora" sola → Mora de Castilla (rubus_glaucus), no la silvestre.
 *   - "gulupa" → passiflora_edulis (NUNCA guayaba).
 *   - "cafetal"/"cafeto" → coffea_arabica (el fuzzy de "cafe" choca con otras).
 */
const SPECIES_ALIASES = {
  durazno: 'prunus_persica', duraznero: 'prunus_persica',
  gulupa: 'passiflora_edulis',
  curuba: 'passiflora_tarminiana',
  granadilla: 'passiflora_ligularis',
  mora: 'rubus_glaucus', moras: 'rubus_glaucus',
  cafe: 'coffea_arabica', cafeto: 'coffea_arabica', cafetal: 'coffea_arabica', cafetales: 'coffea_arabica',
  frijol: 'phaseolus_vulgaris', frisol: 'phaseolus_vulgaris', frijoles: 'phaseolus_vulgaris', frisoles: 'phaseolus_vulgaris',
  lechuga: 'lactuca_sativa', lechugas: 'lactuca_sativa',
  cilantro: 'coriandrum_sativum', culantro: 'coriandrum_sativum',
  acelga: 'beta_vulgaris_cicla', acelgas: 'beta_vulgaris_cicla',
  tomate: 'solanum_lycopersicum', tomatera: 'solanum_lycopersicum', tomates: 'solanum_lycopersicum',
  'cebolla larga': 'allium_fistulosum', 'cebolla de rama': 'allium_fistulosum',
  maiz: 'zea_mays',
  papa: 'solanum_tuberosum',
  'papa criolla': 'solanum_phureja',
  arveja: 'pisum_sativum', alverja: 'pisum_sativum',
  fresa: 'fragaria_ananassa', fresas: 'fragaria_ananassa',
  uchuva: 'physalis_peruviana',
};

let _speciesIndex = null;

/** Construye {slug → {slug, canonical, common, group}} y la lista de tokens. */
function getSpeciesIndex() {
  if (_speciesIndex) return _speciesIndex;
  const bySlug = new Map();
  const tokens = []; // { token (normalizado), slug }
  for (const group of Object.values(CROP_TAXONOMY)) {
    for (const sp of group.species) {
      const common = sp.name.split('(')[0].trim();
      bySlug.set(sp.slug || sp.id, { slug: sp.id, canonical: sp.name, common, group: group.label });
      // Tokens del nombre común: separa por "/" ("Cebolla Larga / Rama"),
      // descarta la parte "[Invernadero]" u otros corchetes.
      const cleaned = common.replace(/\[.*?\]/g, '').trim();
      for (const part of cleaned.split('/')) {
        const t = normalize(part);
        if (t.length >= 3) tokens.push({ token: t, slug: sp.id });
      }
    }
  }
  for (const [alias, slug] of Object.entries(SPECIES_ALIASES)) {
    tokens.push({ token: normalize(alias), slug });
  }
  // Más largos primero: "cebolla larga" gana sobre "cebolla".
  tokens.sort((a, b) => b.token.length - a.token.length);
  _speciesIndex = { bySlug, tokens };
  return _speciesIndex;
}

/** Permite invalidar el índice en tests que mockean CROP_TAXONOMY. */
export function _resetSpeciesIndex() {
  _speciesIndex = null;
}

/**
 * Escanea la transcripción buscando especies del catálogo. Empareja por
 * límite de palabra (tolera plural simple) y enmascara los tramos ya
 * resueltos para que un token corto no re-empareje sobre uno largo
 * ("cebolla larga" consume "cebolla"). Devuelve una entrada por slug en el
 * orden en que aparecen.
 *
 * @param {string} normText — transcripción ya normalizada.
 * @returns {Array<{raw, slug, canonical, common, group}>}
 */
function scanSpecies(normText) {
  const { bySlug, tokens } = getSpeciesIndex();
  let work = ` ${normText} `;
  const found = [];
  const seen = new Set();
  for (const { token, slug } of tokens) {
    if (seen.has(slug)) continue;
    const esc = token.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    // (?<![a-z]) y (?![a-z]) hacen de límite tolerante a acentos ya quitados;
    // permite sufijo plural s/es.
    const re = new RegExp(`(?<![a-z])${esc}(?:es|s)?(?![a-z])`);
    const m = work.match(re);
    if (m) {
      const meta = bySlug.get(slug) || { slug, canonical: null, common: token, group: null };
      found.push({ raw: token, ...meta });
      seen.add(slug);
      // Enmascara el tramo emparejado.
      work = work.replace(re, ' '.repeat(m[0].length));
    }
  }
  return found;
}

// ───────────────────────── Detección de campos ─────────────────────────

/** Construye un regex que captura un numeral (dígito o palabra) antes de `kw`. */
function numBeforeKeyword(kw) {
  return new RegExp(`(\\d+|${NUMBER_WORD_RE})\\s+(?:${kw})`);
}
/** Numeral después de un verbo/sintagma `kw` (ej. "mide unos seis metros"). */
function numAfterKeyword(kw) {
  return new RegExp(`(?:${kw})\\s+(?:unos?\\s+|como\\s+|de\\s+)?(\\d+|${NUMBER_WORD_RE})`);
}

/** Extrae altura/ancho/cantidad y unidad regional desde el texto normalizado. */
function extractMeasures(t) {
  const measures = {};

  // Altura: "dos metros de alto", "mide unos seis metros", "como dos metros de alto".
  const altoDe = t.match(/(\d+|[a-z]+)\s+metros?\s+de\s+alt/);
  const mide = t.match(numAfterKeyword('mide'));
  const altoTok = (altoDe && altoDe[1]) || (mide && mide[1]);
  const alturaM = parseNumberToken(altoTok);
  if (alturaM != null) measures.altura_m = alturaM;

  // Ancho: "tres de ancho", "como tres metros de ancho".
  const ancho = t.match(/(\d+|[a-z]+)\s+(?:metros?\s+)?de\s+anch/);
  const anchoM = ancho && parseNumberToken(ancho[1]);
  if (anchoM != null) measures.ancho_m = anchoM;

  // Cantidad + unidad. Arrobas primero (unidad de peso regional ~12.5 kg).
  const arrobas = t.match(numBeforeKeyword('arrobas?'));
  if (arrobas) {
    const n = parseNumberToken(arrobas[1]);
    if (n != null) { measures.cantidad = n; measures.unidad = 'arroba'; measures.kg_aprox = n * 12.5; }
  }
  if (measures.cantidad == null) {
    const kg = t.match(numBeforeKeyword('kilos?|kg|kilogramos?'));
    if (kg) { const n = parseNumberToken(kg[1]); if (n != null) { measures.cantidad = n; measures.unidad = 'kg'; } }
  }
  if (measures.cantidad == null) {
    // Conteo de individuos / frutos: "veinte maticas", "cincuenta mangos".
    const conteo = t.match(numBeforeKeyword(
      'matic\\w+|mat\\w+|plant\\w+|palos?|arbol\\w+|arbustos?|frutos?|mangos?|unidades?|matas?',
    ));
    if (conteo) {
      const n = parseNumberToken(conteo[1]);
      if (n != null) { measures.cantidad = n; measures.unidad = 'unidades'; }
    }
  }
  return measures;
}

const PHENOLOGY_RULES = [
  { re: /reventando en flor|plena flor|mucha flor|en flor|flori(ad|and|o)/, canon: 'floración' },
  { re: /pint[oó]n|pintones/, canon: 'maduración (pintón)' },
  { re: /grano verde/, canon: 'llenado de grano' },
  { re: /espigad|espig[oó]/, canon: 'espigado (floración/bolting)' },
  { re: /pa'?\s*cortar|para\s+cortar|lista?\s+para\s+(cosech|cortar)/, canon: 'cosecha (lista)' },
  { re: /apenas\s+pegando|\bpegando\b|prendiendo|reci[eé]n\s+sembrad/, canon: 'establecimiento' },
  { re: /cuajad|pepas?\s+chiquit|frutos?\s+peque/, canon: 'cuajado' },
  { re: /cargad/, canon: 'fructificación (cargado)' },
];

/** Devuelve todas las fenologías detectadas (campesino → canónico). */
function extractPhenology(t) {
  const out = [];
  for (const { re, canon } of PHENOLOGY_RULES) {
    const m = t.match(re);
    if (m) out.push({ raw: m[0], canon });
  }
  return out;
}

const SYMPTOM_RULES = [
  { re: /hojas?\s+(toda\s+)?comid|comid[ao]s?|defoliaci/, txt: 'hojas comidas (defoliación)' },
  { re: /telara[ñn]a/, txt: 'telaraña en puntas (posible ácaro/araña roja)' },
  { re: /manchas?\s+amarill|amarill/, txt: 'manchas/amarillamiento' },
  { re: /manchas?/, txt: 'manchas en hojas' },
  { re: /quemad|bordes\s+quemad/, txt: 'bordes quemados' },
  { re: /flor\s+caid|caida\s+de\s+(la\s+)?flor|cayendo\s+las\s+hojas|se\s+le\s+(estan\s+)?cay\w+\s+(las\s+)?hojas/, txt: 'caída de flor/hojas' },
  { re: /pudri|podrid/, txt: 'pudrición' },
];

/** Síntomas/problemas observados → texto corto (rutea a observación grounded). */
function extractSymptoms(t) {
  const out = [];
  const seen = new Set();
  for (const { re, txt } of SYMPTOM_RULES) {
    if (re.test(t) && !seen.has(txt)) { out.push(txt); seen.add(txt); }
  }
  return out;
}

// Organismo plaga nombrado. NO incluye "nido de" (es contenedor, no el
// organismo): la clasificación de intención ya lo usa por separado, y aquí
// queremos el binomio campesino real ("hormiga arriera").
const PEST_RE = /hormiga\s+arriera|arriera|\bchiza\b|cogollero|trozador|gusano|pulg[oó]n|pulgones|[aá]caro|ara[ñn]ita|broca|mosca\s+blanca|polilla|babosa|caracol|langosta/;

/** Detecta organismo plaga nombrado (best-effort, texto corto). */
function extractPest(t) {
  const m = t.match(PEST_RE);
  return m ? m[0] : null;
}

const LABOR_RULES = [
  { re: /pod[eé]\b|\bpoda\b|podan|podamos/, txt: 'poda' },
  { re: /deshierb|desyerb|limpi[eé]?\s+de\s+maleza|limpieza\s+de\s+maleza|desmalez/, txt: 'deshierbe' },
  { re: /guada[ñn]|rocer[ií]a|roza/, txt: 'guadañada/rocería' },
  { re: /aporqu/, txt: 'aporque' },
  { re: /amarr|tutorad|tutore/, txt: 'amarre/tutorado' },
  { re: /raleo|ralea/, txt: 'raleo' },
];

/** Labores de mantenimiento detectadas. */
function extractLabors(t) {
  const out = [];
  const seen = new Set();
  for (const { re, txt } of LABOR_RULES) {
    if (re.test(t) && !seen.has(txt)) { out.push(txt); seen.add(txt); }
  }
  return out;
}

/** Insumo/producto aplicado (caldo bordelés, biol, purín, etc.). */
function extractInput(t) {
  const known = t.match(/caldo\s+bordel[eé]s|caldo\s+sulfoc[aá]lcico|biol\b|purin\w*|bocashi|super\s*magro|ceniza|cal\b/);
  if (known) return known[0];
  const aplico = t.match(/(?:le\s+ech[eé]|ech[eé]|apliqu[eé]|aplica\w+|fumigu[eé]\s+con)\s+(?:el\s+|la\s+|los\s+|las\s+|un\s+|una\s+)?([a-z]+(?:\s+[a-z]+)?)/);
  return aplico ? aplico[1] : null;
}

const POSITION_RE = /aqui|aca|al\s+lado\s+de|en\s+el\s+filo|\bfilo\b/;

/** Captura señal de posición/lugar (locativo o zona nombrada). */
function extractPosition(t) {
  const locative = t.match(POSITION_RE);
  // Zona nombrada: "en la era nueva", "el lote de abajo", "lote de la entrada",
  // cerca del "nacedero". Best-effort para mostrar al usuario. Trabaja sobre una
  // copia sin puntuación para no cortar la zona en la coma.
  const tp = t.replace(/[,.;]/g, ' ').replace(/\s+/g, ' ');
  const zona = tp.match(
    /(?:en\s+(?:el\s+|la\s+)?|del\s+|cerca\s+del\s+|al\s+lado\s+del\s+|\bel\s+|\bla\s+|\buna\s+)((?:era|lote|huerta|cama|filo|nacedero|parcela|invernadero|balcon|patio)\b[\w\s]{0,18}?)(?=\s+(?:hace|que|y|porque|pero|tiene|esta|con|ya)\b|$)/,
  );
  return {
    raw: zona ? zona[1].trim() : (locative ? locative[0] : ''),
    locative: !!locative,
  };
}

const TIME_RULES = [
  { re: /hace\s+(\d+|[a-z]+)\s+d[ií]as?/, fn: (m) => -(parseNumberToken(m[1]) ?? 0), raw: (m) => m[0] },
  { re: /anteayer|antier/, fn: () => -2, raw: () => 'anteayer' },
  { re: /\bayer\b/, fn: () => -1, raw: () => 'ayer' },
  { re: /esta\s+ma[ñn]ana|en\s+la\s+ma[ñn]ana|esta\s+tarde|\bhoy\b|acabo\s+de|ahorita|ahora|reci[eé]n/, fn: () => 0, raw: (m) => m[0] },
];

/** Tiempo relativo → { raw, offsetDays }. Default hoy (0). */
function extractTime(t) {
  for (const { re, fn, raw } of TIME_RULES) {
    const m = t.match(re);
    if (m) return { raw: raw(m), offsetDays: fn(m) };
  }
  return { raw: '', offsetDays: 0 };
}

// ───────────────────────── Clasificación de intención ─────────────────────────

const VERB_RULES = [
  { intent: INTENTS.INSUMO, re: /le\s+ech[eé]|\bech[eé]\b|apliqu[eé]|aplica\w+|fumigu?[eé]|fertilic[eé]|abon[eé]|caldo\s+bordel/ },
  { intent: INTENTS.COSECHA, re: /cosech[eé]|cosech\w+|recolect|recog[ií]|coger\b|cog[ií]\b|saqu[eé]|sacamos|coseche/ },
  { intent: INTENTS.MANTENIMIENTO, re: /pod[eé]\b|podamos|deshierb|desyerb|limpi[eé]?\s+de\s+maleza|guada[ñn]|aporqu|raleo|desbrot|amarr[eé]/ },
  { intent: INTENTS.SIEMBRA, re: /sembr[eé]|sembre|sembramos|plant[eé]|plante\b|trasplant|\bpuse\b|pusimos/ },
];

const POSSESSION_RE = /\btengo\b|\btenemos\b|aqui\s+tengo|aca\s+tengo|me\s+naci[oó]/;

/**
 * Clasifica la intención principal. Orden: plaga-invasora > verbo de acción
 * (insumo/cosecha/mantenimiento/siembra) > rama descriptiva/observacional.
 *
 * @returns {{intent, secondary: string|null}}
 */
function classifyIntent(t, { species, symptoms, measures, pest }) {
  // 1. Plaga invasora explícita (nido/arriera/"acabando con").
  if (/hormiga\s+arriera|\barriera\b|nido\s+de|invasora|acabando\s+con|plaga\s+de/.test(t)) {
    return { intent: INTENTS.PLAGA, secondary: null };
  }
  // 2. Verbo de acción (el primero en prioridad gana).
  for (const { intent, re } of VERB_RULES) {
    if (re.test(t)) return { intent, secondary: null };
  }
  // 3. Rama descriptiva / observacional (sin verbo de acción).
  const hasMeasures = measures.altura_m != null || measures.ancho_m != null;
  const hasPossession = POSSESSION_RE.test(t);
  const multiCultivo = species.length >= 2;

  // Varios cultivos describiendo estados en una huerta = observación
  // multi-cultivo (límite documentado del fixture, c10).
  if (multiCultivo && !hasMeasures) {
    return { intent: INTENTS.OBSERVACION, secondary: null };
  }
  if (symptoms.length > 0) {
    // Describiendo una planta concreta (medidas o posesión) → planta + obs.
    if (hasMeasures || hasPossession) {
      return { intent: INTENTS.PLANTA, secondary: INTENTS.OBSERVACION };
    }
    // Síntoma puro → observación (plaga si hay organismo/daño biótico).
    return { intent: pest ? INTENTS.OBSERVACION : INTENTS.OBSERVACION, secondary: pest ? INTENTS.PLAGA : null };
  }
  // Sin síntomas: descripción de una planta existente (b1, c5).
  return { intent: INTENTS.PLANTA, secondary: null };
}

// ───────────────────────── Entry point ─────────────────────────

/**
 * Clasifica + extrae todos los campos de una transcripción, SIN red.
 *
 * @param {string} text — transcripción en español.
 * @param {object} [opts]
 * @param {number} [opts.now=0] — epoch ms de referencia para el tiempo
 *   relativo. Inyectable para tests (no se llama Date.now en el core).
 * @returns {object} registro unificado (ver JSDoc del módulo).
 */
export function classifyAndExtractLocal(text, opts = {}) {
  const now = Number.isFinite(opts.now) ? opts.now : 0;
  const transcription = (text || '').toString();
  const t = normalize(transcription);

  if (!t) {
    return {
      intent: INTENTS.OBSERVACION, secondary: null, confidence: 0, source: 'ondevice',
      transcription, species: [], measures: {}, phenology: [], symptoms: [],
      pest: null, labors: [], input: null, position: { raw: '', locative: false },
      time: { raw: '', offsetDays: 0 }, timestampMs: now,
    };
  }

  const species = scanSpecies(t);
  const measures = extractMeasures(t);
  const phenology = extractPhenology(t);
  const symptoms = extractSymptoms(t);
  const pest = extractPest(t);
  const labors = extractLabors(t);
  const input = extractInput(t);
  const position = extractPosition(t);
  const time = extractTime(t);

  const { intent, secondary } = classifyIntent(t, { species, symptoms, measures, pest });

  // GPS por defecto para planta/observación/plaga/siembra, o si hay locativo.
  const georef = (INTENT_META[intent]?.georef || position.locative) === true
    ? true
    : !!position.locative;

  // Confianza heurística: clasificó + al menos un campo sustantivo extraído.
  const signals = [
    species.length > 0, Object.keys(measures).length > 0, phenology.length > 0,
    symptoms.length > 0, !!pest, labors.length > 0, !!input,
  ].filter(Boolean).length;
  const confidence = Math.min(0.9, 0.4 + 0.1 * signals);

  return {
    intent,
    secondary,
    confidence,
    source: 'ondevice',
    transcription,
    species,
    measures,
    phenology,
    symptoms,
    pest,
    labors,
    input,
    position,
    needsGps: georef,
    time,
    timestampMs: now + time.offsetDays * 86400000,
  };
}

export default classifyAndExtractLocal;
