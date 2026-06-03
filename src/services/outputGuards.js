/**
 * outputGuards — GUARDAS DETERMINISTAS sobre la SALIDA del LLM (post-proceso).
 *
 * Contexto (bench 10 prompts complejos, 2026-05-30): `granite3.1-dense:8b`
 * TIENE los hechos correctos en el grounding (resolvedEntities con
 * viabilidad / es_invasora / altitud_min/max / alternativas_viables por
 * especie) pero RAZONA mal sobre ellos: invierte viabilidad, INVENTA
 * agroquímicos sintéticos con códigos de catálogo falsos, y trata invasoras
 * como recurso. La solución NO es más grounding sino ENFORCEAR los hechos que
 * ya están en mano sobre el texto generado, ANTES de mostrarlo al usuario.
 *
 * Cada guard es una función PURA y SÍNCRONA con la firma:
 *     (responseText, resolvedEntities, fincaAltitud) => { text, modified, reason }
 * Se encadenan con `applyOutputGuards`. CERO latencia nueva (todo local).
 *
 * Diseño anti-falsos-positivos: los guards 1/2/3 actúan SOLO con evidencia
 * clara del grounding (o, para el agroquímico, una denylist cerrada de
 * ingredientes activos sintéticos inequívocos). El guard 4 SUAVIZA, no borra.
 *
 * Telemetría: cuenta cuántas veces dispara cada guard en localStorage bajo
 * `chagra:output_guard_triggers` (best-effort, no-op sin localStorage). Útil
 * para medir el impacto real en producción.
 *
 * @module outputGuards
 */

const TELEMETRY_STORAGE_KEY = 'chagra:output_guard_triggers';

/**
 * Incrementa el contador local de gatillos de un guard. No-op si localStorage
 * no está disponible (SSR, jsdom estricto, modo privado). Best-effort: jamás
 * bloquea el guard.
 *
 * @param {string} guardId
 */
function bumpGuardTelemetry(guardId) {
  try {
    if (typeof localStorage === 'undefined') return;
    const raw = localStorage.getItem(TELEMETRY_STORAGE_KEY);
    let counters;
    try {
      counters = raw ? JSON.parse(raw) : {};
      if (!counters || typeof counters !== 'object') counters = {};
    } catch (_) {
      counters = {};
    }
    counters[guardId] = (counters[guardId] || 0) + 1;
    counters.__total = (counters.__total || 0) + 1;
    localStorage.setItem(TELEMETRY_STORAGE_KEY, JSON.stringify(counters));
  } catch (_) {
    // QuotaExceededError u otros: silencioso por diseño.
  }
}

/**
 * Lee los contadores de telemetría persistidos.
 * @returns {Record<string, number>}
 */
export function getOutputGuardTelemetry() {
  try {
    if (typeof localStorage === 'undefined') return {};
    const raw = localStorage.getItem(TELEMETRY_STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return {};
    return parsed;
  } catch (_) {
    return {};
  }
}

/** Resetea la telemetría (tests / diagnóstico). */
export function resetOutputGuardTelemetry() {
  try {
    if (typeof localStorage === 'undefined') return;
    localStorage.removeItem(TELEMETRY_STORAGE_KEY);
  } catch (_) {
    /* noop */
  }
}

// ── helpers internos ────────────────────────────────────────────────────────

const _stripDiacritics = (s) =>
  (s || '')
    .toString()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .trim();

/** Normaliza el valor de viabilidad del grounding. */
function _normViabilidad(v) {
  if (v == null) return null;
  const s = String(v).toLowerCase().trim();
  if (s === 'viable' || s === 'marginal' || s === 'inviable') return s;
  return null;
}

/**
 * Lista hasta `max` nombres de un array del grounding (string u objeto).
 * @returns {string[]}
 */
function _altNames(arr, max = 3) {
  if (!Array.isArray(arr)) return [];
  const out = [];
  for (const a of arr) {
    let n = null;
    if (typeof a === 'string') n = a.trim();
    else if (a && typeof a === 'object') n = (a.nombre_comun || a.nombre || a.name || '').toString().trim();
    if (n && !out.includes(n)) out.push(n);
    if (out.length >= max) break;
  }
  return out;
}

/** Es una entidad de especie sembrable (no plaga, no biopreparado). */
function _isSpecies(e) {
  if (!e || typeof e !== 'object') return false;
  const kind = String(e.kind || '').toLowerCase();
  if (!kind) return true; // sin kind = asumimos especie (laxo)
  return kind === 'species' || kind === 'planta' || kind === 'especie' || kind === 'cultivo';
}

/** Nombre legible de una entidad. */
function _entityName(e) {
  return (e && (e.nombre_comun || e.mentioned)) || 'esa especie';
}

// ── A12: clasificación de INTENCIÓN del usuario (gating de guards) ───────────

/**
 * Keywords de PRECIO / MERCADO. Bug prod 2026-06-02: "¿a cómo está la papa?"
 * (consulta de precio) disparó una cascada de guards de SIEMBRA (4× "NO es
 * viable a 1923 msnm", una por variedad). La pregunta no era de siembra. Estas
 * keywords (sobre el texto normalizado sin tildes) detectan intención de
 * precio/mercado para NO correr los guards de siembra sobre ella.
 */
const PRICE_INTENT_PATTERNS = [
  /\ba\s+como\s+(esta|estan|va|van|vale|valen)\b/, // "a cómo está / a cómo van"
  /\bcuanto\s+(vale|valen|cuesta|cuestan|sale|salen|pagan|esta\s+pagando)\b/,
  /\bque\s+precio\b/,
  /\bprecio[s]?\b/,
  /\bmercado[s]?\b/,
  /\bplaza\s+de\s+mercado\b/,
  /\b(donde|a\s+quien)\s+(puedo\s+)?(vendo|vender|comprar|compro)\b/,
  /\b(vendo|vender|venta|comprar|compra|comprador|comercializ)\w*\b/,
  /\bcosecha\s+para\s+(vender|venta)\b/,
  // #347 (prod 2026-06-03): unidades de comercialización mayorista. "el bulto/
  // la arroba/la carga de papa" es una consulta de MERCADO, no de siembra. Sin
  // estas, "a cómo el bulto de papa" filtraba la altitud/municipio de la finca y
  // disparaba la cascada de viabilidad por variedad.
  /\bbulto[s]?\s+(de|a)\b/,
  /\barroba[s]?\s+(de|a)\b/,
  /\bcarga[s]?\s+(de|a)\b/,
  /\bcarga\s+de\b/,
  /\b(el|la|los|las|una?|cuantas?)\s+(arroba|bulto|carga)[s]?\b/,
];

/**
 * Verbos / fraseo de SIEMBRA. Si la consulta del usuario los trae, es de
 * siembra y los guards de siembra SÍ deben correr aunque también mencione
 * precio (conservador: ante mezcla, protegemos).
 */
const PLANTING_INTENT_PATTERNS = [
  /\bsiembr\w*\b/,
  /\bsembr\w*\b/,
  /\bplant\w*\b/,
  /\bcultiv\w*\b/,
  /\bpropag\w*\b/,
  /\bque\s+(cultivo|siembr|planto|cultivar)\b/,
  /\bque\s+(puedo|debo|deberia)\s+(sembrar|plantar|cultivar)\b/,
  /\bsemilla[s]?\b/,
  /\b(me\s+)?(conviene|sirve|recomienda[sn]?)\s+sembrar\b/,
  /\bviable[s]?\b/,
  /\bmsnm\b/,
  /\baltitud\b/,
  /\ben\s+mi\s+finca\b/,
];

/**
 * classifyQueryIntent — heurística simple de intención sobre la pregunta del
 * usuario (A12). Devuelve:
 *   - 'siembra'  → hay verbo/fraseo de siembra (los guards de siembra SÍ corren).
 *   - 'precio'   → precio/mercado SIN verbo de siembra (guards de siembra NO corren).
 *   - 'unknown'  → no clasificable (conservador: el caller corre los guards).
 *
 * Diseño conservador (anti-rotura de la protección anti-alucinación): solo
 * devuelve 'precio' cuando hay señal de precio/mercado Y NO hay verbo de
 * siembra. Ante cualquier duda → 'unknown' (los guards corren). La intención de
 * INFO general (sin verbo de siembra y sin precio) cae en 'unknown', y el caller
 * decide; el gating de A12 trata 'precio' e 'info' por igual (no-siembra), por lo
 * que `shouldRunPlantingGuards` colapsa la decisión.
 *
 * @param {string|null|undefined} userMessage
 * @returns {'siembra'|'precio'|'unknown'}
 */
export function classifyQueryIntent(userMessage) {
  if (typeof userMessage !== 'string') return 'unknown';
  const norm = _stripDiacritics(userMessage);
  if (!norm) return 'unknown';
  // La siembra manda: si la pregunta menciona sembrar/cultivar/viabilidad, es de
  // siembra aunque también hable de precio (conservador).
  if (PLANTING_INTENT_PATTERNS.some((re) => re.test(norm))) return 'siembra';
  if (PRICE_INTENT_PATTERNS.some((re) => re.test(norm))) return 'precio';
  return 'unknown';
}

/**
 * shouldRunPlantingGuards — ¿deben correr los guards de SIEMBRA para esta
 * pregunta? (A12). Conservador: corre SIEMPRE salvo que la intención sea
 * inequívocamente NO-siembra (precio/mercado o info general sin verbo de
 * siembra). Sin userMessage → corre (no rompe la protección existente).
 *
 * @param {string|null|undefined} userMessage
 * @returns {boolean}
 */
function shouldRunPlantingGuards(userMessage) {
  // Sin la pregunta no podemos juzgar la intención → corremos (conservador).
  if (typeof userMessage !== 'string' || !userMessage.trim()) return true;
  const intent = classifyQueryIntent(userMessage);
  // Solo NO corremos cuando es claramente de precio. 'unknown' y 'siembra' corren.
  return intent !== 'precio';
}

// ── R2: filtro de entidades-ruido (stopwords NLU) ───────────────────────────

/**
 * Palabras campesinas/coloquiales comunes que el resolver de entidades a veces
 * mapea por error a una especie (re-bench 2026-05-31: "aquí"→Pteridium,
 * "don"→Oenocarpus, "mano", "pasto"). NO son cultivos; si se cuelan en
 * resolvedEntities, los guards razonan sobre RUIDO y producen falsos positivos.
 * Se comparan sin diacríticos ni mayúsculas contra el `mentioned` (lo que el
 * usuario dijo), nunca contra el nombre del catálogo.
 */
const NLU_NOISE_MENTIONS = new Set([
  // deícticos / lugar
  'aqui', 'aca', 'alla', 'alli', 'ahi', 'ahy',
  // tratamientos / muletillas campesinas
  'don', 'dona', 'sumerce', 'su merced', 'vea', 'mano', 'mijo', 'mija', 'mka',
  'pues', 'bueno', 'oiga', 'oye', 'hombre', 'senor', 'senora',
  // genéricos vegetales sin especie concreta (solos)
  'pasto', 'monte', 'hierba', 'yerba', 'mata', 'planta', 'arbol', 'palo',
]);

/**
 * filterNoiseEntities — descarta entidades-ruido ANTES de que lleguen a los
 * guards. Una entidad se considera ruido si su `mentioned` (normalizado) está
 * en `NLU_NOISE_MENTIONS`. El cotejo es sobre lo que dijo el usuario, no sobre
 * el nombre del catálogo: "pasto guinea" (mentioned) NO es ruido, "pasto" solo
 * SÍ. Best-effort: entrada no-array → []. Idempotente y puro.
 *
 * @param {Array<object>|null} entities
 * @returns {Array<object>}
 */
export function filterNoiseEntities(entities) {
  if (!Array.isArray(entities)) return [];
  return entities.filter((e) => {
    if (!e || typeof e !== 'object') return false;
    const mentioned = _stripDiacritics(e.mentioned || '').replace(/\s+/g, ' ').trim();
    if (!mentioned) return true; // sin mentioned no podemos juzgarlo ruido → conservamos
    return !NLU_NOISE_MENTIONS.has(mentioned);
  });
}

// ── GUARD 1: agroquímico sintético ──────────────────────────────────────────

/**
 * Denylist de ingredientes activos / familias sintéticas + productos
 * inventados detectados en el bench. Coincidencia por palabra (con tolerancia
 * a tildes/case). NO incluye "cobre"/"caldo bordelés"/"Bt"/"Bacillus
 * thuringiensis"/"neem" (rutas orgánicas legítimas que el agente SÍ debe
 * recomendar).
 *
 * Cada entrada se compila a un regex con límites de palabra laxos sobre el
 * texto sin diacríticos.
 */
const SYNTHETIC_AGROCHEM_TERMS = [
  // fungicidas sintéticos
  'mancozeb',
  'metalaxil',
  'clorotalonil',
  'azoxystrobin',
  'azoxistrobina',
  'estrobilurina',
  'estrobilurinas',
  'triazol',
  'triazoles',
  'propiconazol',
  'tebuconazol',
  'difenoconazol',
  // insecticidas sintéticos
  'clorpirifos',
  'cipermetrina',
  'deltametrina',
  'lambda-cihalotrina',
  'lambdacihalotrina',
  'lambda cihalotrina',
  'piretroide',
  'piretroides',
  'carbofurano',
  'imidacloprid',
  'malation',
  'metomil',
  // herbicidas
  'glifosato',
  'paraquat',
  'glufosinato',
  // producto inventado por el modelo en el bench (CPX-007)
  'pirimex',
  // FERTILIZANTES de síntesis (#351, prod 2026-06-03 Choachí). El bug: el modelo
  // recomendó "plan de alimentación" con NPK 5-10-10 y, al preguntar cómo
  // hacerlo, una receta de mezclar urea + fosfato triple + sulfato de potasio.
  // Son fertilizantes minerales de síntesis (no biopreparados) → contra la
  // misión agroecológica. Sus nombres NO terminan en sufijo de familia química
  // (no los captura el detector de sufijos), por eso van en la denylist exacta.
  // La sigla 'npk' y las formulaciones N-P-K ("5-10-10") se chequean aparte
  // (`SYNTHETIC_FERTILIZER_PATTERNS`).
  'urea',
  'fosfato triple',
  'superfosfato triple',
  'fosfato diamonico',
  'fosfato diamónico',
  'fosfato monoamonico',
  'fosfato monoamónico',
  'sulfato de potasio',
  'sulfato de amonio',
  'nitrato de amonio',
  'nitrato de potasio',
  'cloruro de potasio',
  'muriato de potasio',
];

/**
 * #351 — la sigla NPK y las FORMULACIONES de fertilizante mineral ("NPK 5-10-10",
 * "10-10-10", "triple 15", "15-15-15") delatan un fertilizante de síntesis. Van
 * aparte de la denylist por palabra: "npk" es una sigla corta y las
 * formulaciones son tripletes numéricos (no nombres de i.a.). En agro un triplete
 * N-P-K siempre denota un mineral de síntesis. Sobre el texto normalizado.
 */
const SYNTHETIC_FERTILIZER_PATTERNS = [
  /(^|[^a-z])npk([^a-z]|$)/, // sigla NPK (con o sin formulación al lado)
  /(^|[^a-z])n-p-k([^a-z]|$)/,
  /\btriple\s+(quince|15|catorce|14|diecisiete|17)\b/, // "triple 15"
  /\b\d{1,2}\s*[-–]\s*\d{1,2}\s*[-–]\s*\d{1,2}\b/, // formulación "5-10-10", "15-15-15"
];

/**
 * HARDENING 1 (audit #21) — SUFIJOS de familias químicas sintéticas. La denylist
 * exacta de arriba es CERRADA: cualquier ingrediente activo no enumerado se
 * colaba. Estos sufijos capturan FAMILIAS enteras por la terminación del nombre
 * común del i.a. (convención de nomenclatura química), no por una lista cerrada:
 *
 *   -azol / -conazol  → triazoles fungicidas (ciproconazol, epoxiconazol…)
 *   -fos              → organofosforados (profenofos, clorpirifos…)
 *   -tion             → organofosforados -tión (paratión, malatión, fentión…)
 *   -trina / -metrina → piretroides (cipermetrina, bifentrina, deltametrina…)
 *   -cloprid          → neonicotinoides (imidacloprid, tiacloprid…)
 *   -clor / -cloro    → organoclorados (metoxicloro, heptacloro…)
 *   -carb             → carbamatos (aldicarb, metiocarb, carbofurano≈carb…)
 *
 * Anti-falsos-positivos (3 capas):
 *  1. word-boundary: la palabra debe TERMINAR en el sufijo (`\b…sufijo\b`),
 *     no contenerlo (así "control"/"controlar" no matchea -clor).
 *  2. longitud mínima del token (≥6 chars): descarta colisiones cortas como
 *     "fos", "carb", "trina" (nombre propio), "azol" sueltos.
 *  3. lista de EXCEPCIONES (`SUFFIX_EXCEPTIONS`): palabras legítimas que terminan
 *     igual. Incluye biopreparados PERMITIDOS (sulfocálcico/sulfocalcio) y, sobre
 *     todo, los sustantivos españoles en -stión (gestión, digestión, combustión)
 *     que colisionan con -tion. Además, el sufijo -tion exige que el carácter
 *     previo NO sea 's' (los químicos son -atión/-otión/-ntión; el ruido español
 *     es -stión), reforzando la capa de excepciones.
 */
const SYNTHETIC_AGROCHEM_SUFFIXES = [
  'conazol', // específico antes que 'azol' (no cambia el match, documental)
  'azol',
  'metrina', // específico antes que 'trina'
  'trina',
  'cloprid',
  'cloro',
  'clor',
  'fos',
  'tion',
  'carb',
];

/** Longitud mínima del token para que un sufijo cuente (anti-colisión corta). */
const SUFFIX_MIN_LEN = 6;

/**
 * Palabras legítimas (sin diacríticos) que terminan en alguno de los sufijos
 * pero NO son agroquímicos. Biopreparados permitidos + sustantivos españoles
 * comunes en -stión/-tión que no deben bloquearse.
 */
const SUFFIX_EXCEPTIONS = new Set([
  // biopreparados / caldos minerales PERMITIDOS
  'sulfocalcico',
  'sulfocalcio',
  // sustantivos españoles en -stion (colisionan con -tion)
  'gestion',
  'digestion',
  'indigestion',
  'autogestion',
  'combustion',
  'cuestion',
  'congestion',
  'sugestion',
  'autocombustion',
]);

/**
 * #17 — ALLOWLIST de biopreparados / caldos minerales AGROECOLOGICOS permitidos.
 *
 * Estos son los preparados que Chagra SI recomienda (caldo bordeles, caldo
 * sulfocalcico, ceniza, bocashi, supermagro, biol, etc.). Aunque no son
 * agroquimicos sinteticos, algunos de sus nombres (o de sus ingredientes
 * minerales) podrian colisionar con la denylist exacta o con el detector de
 * sufijos de familia quimica (p.ej. "sulfocalcico" termina parecido a un i.a.,
 * "biol" es corto). Esta lista cerrada GARANTIZA que un biopreparado legitimo
 * NUNCA se marque como sintetico: cualquier hit que caiga DENTRO de un termino
 * de esta allowlist se descarta antes de disparar el guard.
 *
 * Normalizada sin diacriticos/case. Cubre variantes ortograficas comunes del
 * campo (bordeles/bordeles, sulfocalcico, supermagro/super magro). Es ADITIVA al
 * guard, no sustituye su logica: glifosato, mancozeb y demas sinteticos siguen
 * bloqueandose igual.
 */
const ALLOWED_BIOPREPARADO_TERMS = [
  'caldo bordeles',
  'bordeles',
  'caldo sulfocalcico',
  'sulfocalcico',
  'sulfocalcio',
  'polisulfuro de calcio',
  'ceniza',
  'cenizas',
  'caldo de ceniza',
  'caldo ceniza',
  'bocashi',
  'supermagro',
  'super magro',
  'biol',
  'bioles',
  'biofermento',
  'biofertilizante',
  'caldo mineral',
  'lixiviado de lombriz',
  'purin',
  'purines',
].map(_stripDiacritics);

/**
 * #17 — el termino/token detectado como "sintetico" es en realidad un
 * biopreparado permitido (o parte de su nombre)? Compara el hit normalizado
 * contra la allowlist: coincide si el hit ES un termino permitido o si esta
 * contenido en uno (p.ej. el sufijo dispara sobre "sulfocalcico", que pertenece
 * a "caldo sulfocalcico"). Best-effort: hit vacio -> no es permitido.
 *
 * @param {string} hit  termino/token candidato a sintetico (puede traer tildes).
 * @returns {boolean}
 */
function _isAllowedBiopreparado(hit) {
  const h = _stripDiacritics(hit);
  if (!h) return false;
  return ALLOWED_BIOPREPARADO_TERMS.some((allowed) => allowed === h || allowed.includes(h));
}

/**
 * Regex que extrae tokens alfabéticos (con guion interno, p.ej. "lambda-
 * cihalotrina") del texto normalizado, para evaluar su terminación contra los
 * sufijos de familia química.
 */
const WORD_TOKEN_RE = /[a-z]+(?:-[a-z]+)*/g;

/**
 * ¿El token (normalizado, sin diacríticos) es un agroquímico sintético inferido
 * por el sufijo de su familia química? Aplica las 3 capas anti-falso-positivo.
 *
 * @param {string} token  palabra normalizada (minúsculas, sin tildes).
 * @returns {string|null} el sufijo que disparó, o null si no aplica.
 */
function _agrochemBySuffix(token) {
  if (!token || token.length < SUFFIX_MIN_LEN) return null;
  if (SUFFIX_EXCEPTIONS.has(token)) return null;
  for (const suf of SYNTHETIC_AGROCHEM_SUFFIXES) {
    if (!token.endsWith(suf)) continue;
    // El sufijo -tion solo cuenta si NO viene precedido de 's' (los químicos son
    // -atión/-otión/-ntión; el ruido español es -stión).
    if (suf === 'tion') {
      const prev = token.charAt(token.length - suf.length - 1);
      if (prev === 's') return null;
    }
    return suf;
  }
  return null;
}

/**
 * Códigos de catálogo INVENTADOS tipo "M-02", "I-05", "M-03" que el modelo
 * fabricó en CPX-005 para dar apariencia de receta oficial. Patrón: una letra
 * mayúscula (M/I/F/H), guion, 1-3 dígitos, como token suelto. Defensivo: solo
 * dispara si ADEMÁS hay un término sintético o la palabra "aplicar/aplicación
 * /dosis" cerca, para no marcar referencias legítimas (ej. una variedad
 * "ICA V-305").
 */
const FAKE_CHEM_CODE_RE = /\b[MIFH]-\d{1,3}\b/g;

/**
 * Texto de corrección honesta que reemplaza una recomendación de sintético.
 * Redirige a la ruta orgánica/biopreparado del catálogo según el tipo de
 * problema (hongo/enfermedad vs plaga/insecto), inferido del propio texto.
 */
function _organicRedirect(originalText) {
  const t = _stripDiacritics(originalText);
  const esHongo = /(hongo|tizon|gota|roya|mildeo|mildiu|antracnosis|fungic|enfermedad|mancha)/.test(t);
  const esPlaga = /(plaga|gusano|cogollero|oruga|larva|insecto|pulgon|acaro|trips|mosca|insectic)/.test(t);
  // #351 — ¿el contexto es FERTILIZACIÓN/nutrición (no plaga ni enfermedad)? Si
  // el texto habla de alimentar/abonar/nutrir o nombra un fertilizante mineral,
  // redirigimos a la ruta de abono orgánico (compost/bocashi/biol), no a un
  // fungicida/insecticida orgánico.
  const esFertilizante =
    /(npk|urea|fosfato|sulfato de potasio|nitrato de amonio|fertiliz|abon|nutricion|alimentacion|alimentar|nutrir|fertirrig|formula\s+\d)/.test(
      t,
    );

  const intro =
    'Una nota importante: Chagra es agroecológico, no recomendamos agroquímicos ni fertilizantes sintéticos. ' +
    'Lo que de verdad funciona y cuida tu suelo y tu salud es el manejo orgánico:';

  const lineas = [];
  if (esFertilizante) {
    lineas.push(
      '- Para nutrir y abonar el cultivo (en vez de NPK, urea o fosfatos de síntesis): compost bien maduro, ' +
        'bocashi, humus de lombriz, biol (biofertilizante líquido fermentado) y abonos verdes. Alimentan el suelo ' +
        'vivo y liberan los nutrientes poco a poco, sin acidificarlo ni salinizarlo.',
    );
  }
  if (esHongo || (!esHongo && !esPlaga && !esFertilizante)) {
    lineas.push(
      '- Para hongos y enfermedades (tizón, roya, gota): caldo bordelés (cal + sulfato de cobre) como preventivo, ' +
        'eliminar focos enfermos, mejorar aireación y drenaje, usar semilla sana y rotar el cultivo.',
    );
  }
  if (esPlaga) {
    lineas.push(
      '- Para orugas y plagas (cogollero, gusanos): Bacillus thuringiensis (Bt) real, control biológico ' +
        '(Trichogramma), extracto de neem y monitoreo temprano dirigido al foco.',
    );
  }
  lineas.push(
    'Si necesitas algo más fuerte, consúltalo con tu técnico agrícola local o el ICA; nunca apliques un producto ' +
      'por una dosis que no venga de su etiqueta o de una fuente confiable.',
  );

  return `${intro}\n${lineas.join('\n')}`;
}

/**
 * Guard 1 — agroquímico sintético (SAFETY + misión agroecológica).
 *
 * Si la respuesta del LLM nombra un ingrediente activo sintético de la
 * denylist (o un código de catálogo inventado en contexto de aplicación), se
 * ANEXA un bloque de corrección honesta que redirige a la ruta orgánica del
 * catálogo. NO se intenta cirugía de frase (frágil); se preserva la parte útil
 * de la respuesta y se le añade la corrección al final, dejando claro que
 * Chagra es agroecológico. NUNCA deja pasar una recomendación de sintético sin
 * contrapeso.
 *
 * @param {string} responseText
 * @param {Array<object>|null} _resolvedEntities  (no usado: denylist propia)
 * @param {number|string|null} _fincaAltitud      (no usado)
 * @returns {{text:string, modified:boolean, reason:string|null}}
 */
export function guardSyntheticAgrochemical(responseText, _resolvedEntities = null, _fincaAltitud = null) {
  if (typeof responseText !== 'string' || responseText.length === 0) {
    return { text: responseText ?? '', modified: false, reason: null };
  }

  const norm = _stripDiacritics(responseText);
  const hits = [];
  for (const term of SYNTHETIC_AGROCHEM_TERMS) {
    const t = _stripDiacritics(term);
    // #17: nunca tratamos un biopreparado permitido como sintético.
    if (_isAllowedBiopreparado(term)) continue;
    // límite de palabra a ambos lados sobre el texto normalizado.
    const re = new RegExp(`(^|[^a-z0-9])${t.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&')}([^a-z0-9]|$)`);
    if (re.test(norm)) hits.push(term);
  }

  // #351: fertilizantes minerales de síntesis por sigla/formulación (NPK,
  // "5-10-10", "triple 15"). No tienen sufijo de familia química ni palabra de
  // denylist clásica; este matcher capta la sigla y los tripletes N-P-K.
  for (const re of SYNTHETIC_FERTILIZER_PATTERNS) {
    const m = norm.match(re);
    if (m) hits.push(m[0].trim());
  }

  // HARDENING 1 (audit #21): además de la denylist exacta, detecta agroquímicos
  // por el SUFIJO de su familia química (token que TERMINA en -azol/-fos/-tion/
  // -trina/-cloprid/-clor/-carb), con longitud mínima + excepciones. Captura i.a.
  // sintéticos que no están enumerados arriba sin bloquear biopreparados ni
  // palabras comunes (ver `_agrochemBySuffix`).
  WORD_TOKEN_RE.lastIndex = 0;
  let tok;
  while ((tok = WORD_TOKEN_RE.exec(norm)) !== null) {
    const suf = _agrochemBySuffix(tok[0]);
    // #17: un biopreparado permitido (o parte de su nombre) nunca dispara por
    // sufijo, aunque su terminación colisione con una familia química.
    if (suf && !_isAllowedBiopreparado(tok[0])) hits.push(tok[0]);
  }

  // Códigos inventados SOLO cuentan si hay contexto de aplicación/dosis (para
  // no marcar variedades o referencias legítimas).
  const codes = responseText.match(FAKE_CHEM_CODE_RE) || [];
  const contextoAplicacion = /(aplic|dosis|fungicid|insecticid|pesticid|agroquim|product)/.test(norm);
  if (codes.length > 0 && contextoAplicacion) {
    for (const c of codes) hits.push(c);
  }

  if (hits.length === 0) {
    return { text: responseText, modified: false, reason: null };
  }

  bumpGuardTelemetry('synthetic_agrochemical');
  const correction = _organicRedirect(responseText);
  const text = `${responseText.trim()}\n\n${correction}`;
  return {
    text,
    modified: true,
    reason: `agroquímico_sintético: ${[...new Set(hits)].join(', ')}`,
  };
}

// ── GUARD 2: invasoras ──────────────────────────────────────────────────────

/**
 * ¿La respuesta RECOMIENDA sembrar/propagar la especie? Heurística laxa:
 * busca verbos de fomento (sembrar, plantar, propagar, cultivar, usar como
 * cerca viva, dejar que crezca) cerca del nombre, O un fraseo afirmativo
 * genérico. Conservador: si solo se MENCIONA para advertir, no dispara —
 * pero como el guard ya está condicionado a es_invasora del grounding, basta
 * con detectar que el texto la trata como recurso y no advierte.
 */
function _recomiendaSembrar(textNorm, nombreNorm) {
  // Si el texto ya dice claramente NO sembrar / es invasora / erradicar, el
  // modelo acertó: no re-disparamos.
  const yaAdvierte =
    /(no\s+la?\s+siembr|no\s+la?\s+propag|no\s+sembrar|es\s+invasor|especie\s+invasor|erradic|controlar|no\s+la?\s+fomentes|riesgo\s+de\s+incendio)/.test(
      textNorm,
    );
  if (yaAdvierte) return false;

  // Fomento explícito.
  const fomento =
    /(sembrar|sembra|planta|plante|propag|cultiv|cerca\s+viva|deja(rl|l)a?\s+crecer|si\s+finalmente\s+decides|adecuad[oa]\s+como|sirve\s+(de|como)|util\s+como)/.test(
      textNorm,
    );
  if (!fomento) return false;

  // Idealmente cerca del nombre; si el nombre no está en el texto, igual
  // contamos el fomento (el guard ya sabe que la entidad es invasora).
  if (nombreNorm && nombreNorm.length >= 3 && !textNorm.includes(nombreNorm)) {
    // el nombre puede venir como sinónimo ("retamo" vs "retamo espinoso");
    // probamos la primera palabra.
    const first = nombreNorm.split(/\s+/)[0];
    if (first.length >= 3 && !textNorm.includes(first)) {
      // nombre no aparece — aun así, si hay fomento genérico, advertimos
      // (caso raro). Mejor pecar de seguro en SAFETY.
      return true;
    }
  }
  return true;
}

/**
 * Guard 2 — invasoras. Si el grounding marca `es_invasora:true` para una
 * especie y la respuesta la trata como recurso (cerca viva, "siémbrala más")
 * sin advertir, ANEXA una advertencia honesta ("es invasora, no la siembres,
 * daña el ecosistema") + alternativa nativa del grounding si está.
 *
 * @returns {{text:string, modified:boolean, reason:string|null}}
 */
export function guardInvasiveSpecies(responseText, resolvedEntities = null, _fincaAltitud = null) {
  if (typeof responseText !== 'string' || responseText.length === 0) {
    return { text: responseText ?? '', modified: false, reason: null };
  }
  if (!Array.isArray(resolvedEntities) || resolvedEntities.length === 0) {
    return { text: responseText, modified: false, reason: null };
  }

  const norm = _stripDiacritics(responseText);
  const advertencias = [];
  const disparadas = [];

  for (const e of resolvedEntities) {
    if (!_isSpecies(e)) continue;
    if (e.es_invasora !== true) continue;
    const nombre = _entityName(e);
    const nombreNorm = _stripDiacritics(nombre);
    if (!_recomiendaSembrar(norm, nombreNorm)) continue;

    disparadas.push(nombre);
    const alt = _altNames(e.alternativas_viables, 2);
    const altTxt = alt.length
      ? ` Si quieres una cerca viva o un arbusto útil, mejor usa una especie nativa: ${alt.join(', ')}.`
      : '';
    advertencias.push(
      `⚠️ Ojo con ${nombre}: es una especie INVASORA. No la siembres ni la propagues — desplaza la vegetación ` +
        `nativa, es muy inflamable (riesgo de incendio) y está señalada como invasora en Colombia. Lo correcto es ` +
        `controlarla, no fomentarla.${altTxt}`,
    );
  }

  if (advertencias.length === 0) {
    return { text: responseText, modified: false, reason: null };
  }

  bumpGuardTelemetry('invasive_species');
  const text = `${responseText.trim()}\n\n${advertencias.join('\n\n')}`;
  return { text, modified: true, reason: `invasora_recomendada: ${disparadas.join(', ')}` };
}

// ── GUARD 3: viabilidad invertida ───────────────────────────────────────────

/**
 * ¿La respuesta presenta la especie como viable/buena para sembrar?
 * Heurística: afirmaciones positivas de viabilidad/recomendación SIN una
 * negación de inviabilidad cercana. Conservador para no disparar cuando el
 * modelo YA dijo que es inviable.
 */
function _presentaComoViable(textNorm, nombreNorm) {
  const yaDiceInviable =
    /(no\s+es\s+viable|inviable|no\s+(te\s+)?sirve|no\s+prosper|no\s+se\s+da\b|no\s+cuaja|no\s+(la?\s+)?siembres|no\s+es\s+recomendable\s+sembr|no\s+es\s+(adecuad|apropiad)|clima\s+(no|demasiado))/.test(
      textNorm,
    );

  const recomiendaViable =
    /(es\s+viable|es\s+recomendable|recomendable\s+(priorizar|sembrar|meter|para)|puede\s+prosper|prosper(a|ar)\s+sin\s+problem|se\s+cultiva\s+ampliamente|adecuad[oa]\s+para|apt[oa]\s+para|puede\s+tener\s+exito|si\s+sirve|si\s+te\s+sirve|si\s+aguanta|si\s+se\s+puede|priorizar\s+la?|recomiendo\s+sembr|podria\s+tener\s+exito)/.test(
      textNorm,
    );

  // Si el modelo YA declaró inviabilidad, asumimos que corrigió: no
  // re-disparamos (evita ruido y el falso positivo de "es viable" capturado
  // dentro de "no es viable"). Conservador por diseño en SAFETY/UX.
  if (yaDiceInviable) return false;
  if (!recomiendaViable) return false;

  if (nombreNorm && nombreNorm.length >= 3) {
    const first = nombreNorm.split(/\s+/)[0];
    if (!textNorm.includes(nombreNorm) && (first.length < 3 || !textNorm.includes(first))) {
      return false; // la recomendación no es sobre esta especie
    }
  }
  return true;
}

/**
 * R1 — detector DIRECTO de "fomento de siembra", independiente de frases de
 * viabilidad. El re-bench (2026-05-31) mostró que el detector anterior
 * (`_presentaComoViable`) se apoyaba en un léxico de viabilidad ("es viable",
 * "prospera", "recomendable") y se le escapaban respuestas que igual mandaban a
 * sembrar con otro fraseo (curuba CPX-010, chugua CPX-001). Acá basta con que
 * el texto INVITE a sembrar/cultivar la especie y NO advierta inviabilidad.
 *
 * Esto se usa SOLO cuando el grounding (campo viabilidad o banda de altitud) ya
 * dictaminó 'inviable' de forma determinística — el texto solo decide si el
 * modelo la está fomentando, no la viabilidad en sí.
 */
function _fomentaSiembra(textNorm, nombreNorm) {
  // Si el modelo ya advirtió inviabilidad, acertó: no re-disparamos.
  const yaDiceInviable =
    /(no\s+es\s+viable|inviable|no\s+(te\s+)?sirve|no\s+prosper|no\s+se\s+da\b|no\s+cuaja|no\s+(la?\s+)?siembres|no\s+es\s+recomendable\s+sembr|no\s+es\s+(adecuad|apropiad)|no\s+es\s+para\s+(tu|esa|esta)|clima\s+(no|demasiado)|altura\s+(no|demasiad)|demasiad[oa]\s+(alt|baj|fri|calient|calid))/.test(
      textNorm,
    );
  if (yaDiceInviable) return false;

  // Verbos / fraseo de fomento de siembra (laxo, coloquial incluido).
  const fomento =
    /(siembr|siembr[ae]l|sembrarl|plant[ae]l|plant[ae]\b|plantarl|cultiv|cultivarl|propag|conviene\s+sembr|puedes?\s+(sembr|cultiv|plantar|meter)|buena?\s+para\s+sembr|adecuad[oa]\s+para\s+(tu|esa|esta|el|la|las|los|zona|clima)|apt[oa]\s+para|sirve\s+para\s+tu|priorizar|recomiendo\s+sembr|deberias?\s+sembr|ideal\s+para\s+tu)/.test(
      textNorm,
    );
  if (!fomento) return false;

  // Debe referirse a ESTA especie (nombre o su primer token en el texto).
  if (nombreNorm && nombreNorm.length >= 3) {
    const first = nombreNorm.split(/\s+/)[0];
    if (!textNorm.includes(nombreNorm) && (first.length < 3 || !textNorm.includes(first))) {
      return false;
    }
  }
  return true;
}

/**
 * Divide un texto en oraciones preservando su puntuación final. Heurística
 * suficiente para español campesino: corta tras `.`, `!`, `?` o salto de línea.
 * Conserva los delimitadores en cada fragmento.
 *
 * @param {string} text
 * @returns {string[]} oraciones (cada una con su puntuación/espacio final).
 */
function _splitSentences(text) {
  if (typeof text !== 'string' || text.length === 0) return [];
  // Captura cada oración hasta su signo de cierre (o el fin del texto), con
  // el espacio/salto que la sigue. El flag `s` no hace falta: `[^.!?\n]`.
  const matches = text.match(/[^.!?\n]+[.!?\n]*\s*/g);
  return matches || [text];
}

/**
 * REEMPLAZO anti-autocontradicción (fuga viva 2026-05-31). Dado el texto
 * original del modelo y los nombres (normalizados) de las especies que el
 * grounding marcó INVIABLE pero el modelo promovió, ELIMINA del texto las
 * oraciones que presentan esa especie como viable o la fomentan como cultivo.
 *
 * Es quirúrgico por oración: solo borra las que (a) mencionan la especie (o su
 * primer token) Y (b) disparan `_presentaComoViable` o `_fomentaSiembra` para
 * esa especie. Las oraciones de contexto legítimo (botánica, manejo, frases que
 * NO la promueven) se conservan. Así la corrección determinística puede liderar
 * SIN dejar debajo la afirmación opuesta del modelo.
 *
 * @param {string} originalText
 * @param {string[]} nombresNorm — nombres de especies inviables, sin diacríticos.
 * @returns {string} texto con las oraciones contradictorias removidas (trim).
 */
// Fomento ANAFÓRICO: oraciones que mandan a sembrar/plantar/cultivar la
// especie usando un pronombre objeto ("siémbrala", "plántala", "cultívala",
// "sembrarla", "ponla") en lugar del nombre. Tras detectar una inviable
// promovida, estas oraciones de seguimiento también contradicen el veredicto
// aunque no repitan el nombre. Patrón conservador: verbo de siembra + pronombre
// femenino/neutro de objeto (-la/-las/-lo/-los) o "ponla/meterla".
const _ANAPHORIC_PLANTING_RE =
  /(siembr|sembrar|plant|plantar|cultiv|cultivar|propag|propagar|metel|meterl|pon)[aeiou]*(l[ao]s?)\b/;

/**
 * REEMPLAZO anti-autocontradicción (fuga viva 2026-05-31). Dado el texto
 * original del modelo y los nombres (normalizados) de las especies que el
 * grounding marcó INVIABLE pero el modelo promovió, ELIMINA del texto las
 * oraciones que presentan esa especie como viable o la fomentan como cultivo.
 *
 * Es quirúrgico por oración: borra (a) las que mencionan la especie (o su
 * primer token) Y disparan promoción para esa especie, y (b) las de fomento
 * ANAFÓRICO (siémbrala/plántala) que dan seguimiento a la inviable ya nombrada
 * antes en el texto. Las oraciones de contexto legítimo (botánica, manejo,
 * frases que NO la promueven) se conservan, para que la corrección
 * determinística lidere SIN dejar debajo la afirmación opuesta del modelo.
 *
 * @param {string} originalText
 * @param {string[]} nombresNorm — nombres de especies inviables, sin diacríticos.
 * @returns {string} texto con las oraciones contradictorias removidas (trim).
 */
function _stripViabilityPromotion(originalText, nombresNorm) {
  if (!Array.isArray(nombresNorm) || nombresNorm.length === 0) {
    return originalText.trim();
  }
  const sentences = _splitSentences(originalText);
  // Una vez que el texto nombró y promovió una inviable, las oraciones de
  // fomento anafórico que siguen ("siémbrala…") se atribuyen a esa especie.
  let inviableEnContexto = false;
  const kept = sentences.filter((sentence) => {
    const sNorm = _stripDiacritics(sentence);
    // ¿Alguna especie inviable está promovida EN esta oración (por nombre)?
    for (const nombreNorm of nombresNorm) {
      if (!nombreNorm) continue;
      const first = nombreNorm.split(/\s+/)[0];
      const mencionada =
        sNorm.includes(nombreNorm) || (first.length >= 3 && sNorm.includes(first));
      if (mencionada) {
        inviableEnContexto = true;
        if (_presentaComoViable(sNorm, nombreNorm) || _fomentaSiembra(sNorm, nombreNorm)) {
          return false; // oración contradictoria por nombre → fuera
        }
      }
    }
    // Fomento anafórico de seguimiento: solo si ya hubo una inviable en el
    // contexto previo y la oración NO advierte inviabilidad.
    if (inviableEnContexto && _ANAPHORIC_PLANTING_RE.test(sNorm)) {
      const advierte =
        /(no\s+es\s+viable|inviable|no\s+(la?\s+)?siembres|no\s+(te\s+)?sirve|no\s+prosper)/.test(sNorm);
      if (!advierte) return false;
    }
    return true;
  });
  return kept.join('').trim();
}

// ── A11: de-dup de viabilidad por especie base ──────────────────────────────

/**
 * Palabras genéricas que, solas, NO sirven como nombre base de especie para
 * agrupar variedades (evita agrupar por "variedad", "criolla", etc.). El primer
 * token útil del nombre común suele ser el sustantivo de la especie ("papa",
 * "cacao", "maiz"). Si el primer token es uno de estos, no agrupa por él.
 */
const GENERIC_VARIETY_WORDS = new Set([
  'variedad', 'variedades', 'tipo', 'tipos', 'clase', 'clases',
]);

/**
 * _baseCommonName — extrae el nombre base de una especie a partir de su nombre
 * común para agrupar variedades (A11). "Papa criolla", "Papa Sabanera", "Papa
 * Pastusa" → "papa". Toma el primer token significativo del nombre común
 * normalizado (sin tildes/case, antes de "/"). Devuelve '' si no hay token útil.
 *
 * @param {string} nombre
 * @returns {string}
 */
function _baseCommonName(nombre) {
  const norm = _stripDiacritics((nombre || '').split('/')[0]).replace(/\s+/g, ' ').trim();
  if (!norm) return '';
  const first = norm.split(' ')[0];
  if (!first || first.length < 3 || GENERIC_VARIETY_WORDS.has(first)) return '';
  return first;
}

/**
 * _groupViabilityHits — agrupa las especies inviables por especie BASE (A11) y
 * produce UN bloque de corrección por base. Detecta variedades de la misma base
 * por nombre común compartido ("papa") O por binomio base compartido (mismo
 * "Género epíteto"). Cuando una base agrupa ≥2 variedades, el bloque dice "Las
 * variedades de <base> no son viables…"; con una sola, mantiene el fraseo
 * individual ("<Nombre> NO es viable…"). Junta las alternativas de todas las
 * variedades de la base (dedup, máx 3).
 *
 * @param {Array<{nombre:string, nombreNorm:string, baseCommon:string, baseBinomial:string|null, alternativas:string[]}>} hits
 * @param {string} dondeTxt  " a N msnm" o '' (sin altitud).
 * @returns {string[]} bloques de corrección (uno por base).
 */
function _groupViabilityHits(hits, dondeTxt) {
  /** @type {Map<string, {key:string, items:typeof hits, names:string[], alts:string[]}>} */
  const groups = new Map();
  // Índice binomio→clave para fusionar variedades que comparten binomio base aun
  // si su primer token de nombre común difiere.
  const binToKey = new Map();

  for (const h of hits) {
    // Clave preferida: nombre base común; si no hay, el binomio base; si tampoco,
    // el nombre normalizado individual (no agrupa).
    let key = h.baseCommon || h.baseBinomial || h.nombreNorm;
    // Si su binomio base ya está asociado a un grupo, usar esa clave (fusiona por
    // binomio compartido aunque el nombre común base difiera).
    if (h.baseBinomial && binToKey.has(h.baseBinomial)) {
      key = binToKey.get(h.baseBinomial);
    }
    let g = groups.get(key);
    if (!g) {
      g = { key, items: [], names: [], alts: [] };
      groups.set(key, g);
    }
    g.items.push(h);
    if (!g.names.includes(h.nombre)) g.names.push(h.nombre);
    for (const a of h.alternativas) if (a && !g.alts.includes(a)) g.alts.push(a);
    if (h.baseBinomial && !binToKey.has(h.baseBinomial)) binToKey.set(h.baseBinomial, key);
  }

  const bloques = [];
  for (const g of groups.values()) {
    const altsTop = g.alts.slice(0, 3);
    const altTxt = altsTop.length
      ? ` Para tu altura te irían mejor estas del catálogo: ${altsTop.join(', ')}.`
      : '';
    if (g.items.length >= 2) {
      // Varias variedades de la misma base → un solo bloque.
      const base = g.key;
      bloques.push(
        `Corrección importante: las variedades de ${base} (${g.names.join(', ')}) NO son viables en tu finca` +
          `${dondeTxt} — su clima/altitud no les sirve, la probabilidad de éxito es muy baja y no vale la pena ` +
          `el esfuerzo.${altTxt}`,
      );
    } else {
      // Una sola especie → fraseo individual (no-regresión del mensaje previo).
      const nombre = g.names[0];
      bloques.push(
        `Corrección importante: ${nombre} NO es viable en tu finca${dondeTxt} — su clima/altitud no le sirve, ` +
          `la probabilidad de éxito es muy baja y no vale la pena el esfuerzo.${altTxt}`,
      );
    }
  }
  return bloques;
}

/**
 * Guard 3 — viabilidad invertida. Si el grounding marca `viabilidad:"inviable"`
 * para una especie a la altitud de la finca y la respuesta la recomienda como
 * viable/buena, CORRIGE ("a tu altura no se da") y lidera con
 * `alternativas_viables`. NO toca "marginal" (eso SÍ es posible con cuidados:
 * doctrina zona-gris).
 *
 * REEMPLAZO, no prepend (fix fuga viva 2026-05-31): la corrección lidera Y se
 * ELIMINAN del texto del modelo las oraciones que promovían la especie
 * inviable, para no dejar una respuesta autocontradictoria ("NO es viable" +
 * "sí, siémbrala") en la misma burbuja. El resto del texto (contexto legítimo)
 * se conserva intacto.
 *
 * @returns {{text:string, modified:boolean, reason:string|null}}
 */
export function guardInvertedViability(responseText, resolvedEntities = null, fincaAltitud = null) {
  if (typeof responseText !== 'string' || responseText.length === 0) {
    return { text: responseText ?? '', modified: false, reason: null };
  }
  if (!Array.isArray(resolvedEntities) || resolvedEntities.length === 0) {
    return { text: responseText, modified: false, reason: null };
  }

  const norm = _stripDiacritics(responseText);
  const alt = Number(fincaAltitud);
  // `Number(null) === 0` (NO NaN): sin esta guarda, una finca sin altitud
  // configurada se trataba como 0 msnm y la rama de fallback-por-rango marcaba
  // cultivos de montaña como "inviable a 0 msnm" en FALSO (fuga viva #1240). La
  // rama autoritativa (`_normViabilidad(e.viabilidad)`) NO depende de esto.
  const haveAlt = fincaAltitud != null && fincaAltitud !== '' && Number.isFinite(alt);

  // A11: acumulamos las inviables disparadas como datos crudos para luego
  // agruparlas por especie base (variedades de papa → un bloque).
  const inviables = [];
  const disparadas = [];
  const disparadasNorm = [];

  for (const e of resolvedEntities) {
    if (!_isSpecies(e)) continue;

    // Veredicto: 1) campo viabilidad autoritativo; 2) fallback por rango.
    let nivel = _normViabilidad(e.viabilidad);
    if (!nivel) {
      const hasMin = e.altitud_min != null && e.altitud_min !== '';
      const hasMax = e.altitud_max != null && e.altitud_max !== '';
      const min = hasMin ? Number(e.altitud_min) : NaN;
      const max = hasMax ? Number(e.altitud_max) : NaN;
      const rangoOk = Number.isFinite(min) && Number.isFinite(max);
      if (!haveAlt || !rangoOk) continue; // sin datos → neutral
      if (alt >= min && alt <= max) nivel = 'viable';
      else {
        const fuera = alt < min ? min - alt : alt - max;
        // mismo margen que buildViabilityContext (300m) → marginal vs inviable.
        nivel = fuera <= 300 ? 'marginal' : 'inviable';
      }
    }
    // Solo INVIABLE corrige. marginal/viable se respetan (zona gris).
    if (nivel !== 'inviable') continue;

    const nombre = _entityName(e);
    const nombreNorm = _stripDiacritics(nombre);
    // R1: dispara si el modelo la presenta como viable (léxico de viabilidad) O
    // si simplemente la fomenta como cultivo a sembrar (detección directa, sin
    // depender de frases-gatillo). El veredicto 'inviable' ya es determinístico
    // (campo o banda de altitud); el texto solo decide si la está promoviendo.
    if (!_presentaComoViable(norm, nombreNorm) && !_fomentaSiembra(norm, nombreNorm)) continue;

    disparadas.push(nombre);
    disparadasNorm.push(nombreNorm);
    // A11: en vez de emitir la corrección ya formateada, acumulamos los datos de
    // la especie disparada para luego AGRUPAR las variedades de la misma base (4
    // variedades de papa → un solo bloque, no cuatro). Ver `_groupViabilityHits`.
    inviables.push({
      nombre,
      nombreNorm,
      baseCommon: _baseCommonName(nombre),
      baseBinomial: _binomial(e.nombre_cientifico || e.nombre_científico),
      alternativas: _altNames(e.alternativas_viables, 3),
    });
  }

  if (inviables.length === 0) {
    return { text: responseText, modified: false, reason: null };
  }

  // A11: agrupa las inviables por especie base (nombre común compartido o
  // binomio base compartido) y produce UN bloque por base.
  const dondeTxt = haveAlt ? ` a ${alt} msnm` : '';
  const correcciones = _groupViabilityHits(inviables, dondeTxt);

  bumpGuardTelemetry('inverted_viability');
  // REEMPLAZO (no prepend): primero borramos del texto del modelo las oraciones
  // que promovían la especie inviable — así no queda una respuesta
  // autocontradictoria ("NO es viable" + "siémbrala") debajo de la corrección.
  const restoLimpio = _stripViabilityPromotion(responseText, disparadasNorm);
  // La corrección determinística LIDERA. El resto (contexto legítimo) va después
  // solo si sobrevivió algo tras quitar las oraciones contradictorias.
  const correccion = correcciones.join('\n\n');
  const text = restoLimpio ? `${correccion}\n\n${restoLimpio}` : correccion;
  return { text, modified: true, reason: `viabilidad_invertida: ${disparadas.join(', ')}` };
}

// ── GUARD 3b: viabilidad TÉRMICA (helada / golpe de calor) ──────────────────

/** Margen °C de seguridad para el cruce pronóstico × tolerancia de la especie. */
const THERMAL_MARGIN_C = 2;

/** Idempotencia: marca textual que deja este guard al anexar su advertencia. */
const THERMAL_NOTE_MARK = /ojo[^.]*riesgo de (helada|golpe de calor)/i;

/**
 * Guard 3b — viabilidad TÉRMICA (audit #23). Análogo a `guardInvertedViability`
 * pero para TEMPERATURA: cruza la tolerancia térmica de la especie
 * (`temp_min`/`temp_max` que ya vienen en el grounding / resolvedEntities) contra
 * la temperatura esperada del PRONÓSTICO (forecastTempMin / forecastTempMax,
 * derivadas de `climaSnapshot.openmeteo.forecast_7d` en la pantalla y pasadas por
 * ctx — el grounding NO trae la temp del pronóstico, solo la tolerancia de la
 * especie; ver gap documentado abajo).
 *
 * Lógica (solo para especies que el texto FOMENTA sembrar):
 *   - Si la mínima pronosticada ≤ (temp_min + margen) → riesgo de HELADA/frío que
 *     puede matar el cultivo.
 *   - Si la máxima pronosticada ≥ (temp_max - margen) → riesgo de GOLPE DE CALOR.
 *
 * Doctrina zona-gris (intelligence-first, tono HUMILDE): ADVIERTE, no bloquea ni
 * borra. Anexa una nota ("ojo, riesgo de helada, requiere protección") sin tocar
 * el texto del modelo. La experiencia del campesino manda; esto solo alerta.
 *
 * GRACEFUL: si no hay temp del pronóstico (forecastTempMin/Max ausentes o no
 * numéricas), o la especie no trae temp_min/temp_max, o el texto no fomenta
 * sembrarla, el guard es NO-OP.
 *
 * Firma extendida: recibe un 4º arg `ctx` con la temp del pronóstico, porque la
 * cadena estándar `(text, entities, altitud)` no la transporta. Se invoca aparte
 * en `applyOutputGuards` (como los guards de visión/nombre), no dentro de
 * GUARD_CHAIN.
 *
 * @param {string} responseText
 * @param {Array<object>|null} resolvedEntities  cada una puede traer temp_min/temp_max.
 * @param {number|string|null} _fincaAltitud      (no usado: la temp viene del pronóstico)
 * @param {object} [ctx]
 * @param {number|null} [ctx.forecastTempMin]  mínima esperada del pronóstico (°C).
 * @param {number|null} [ctx.forecastTempMax]  máxima esperada del pronóstico (°C).
 * @param {number} [ctx.marginC=2]              margen de seguridad °C.
 * @returns {{text:string, modified:boolean, reason:string|null}}
 */
export function guardThermalViability(
  responseText,
  resolvedEntities = null,
  _fincaAltitud = null,
  { forecastTempMin = null, forecastTempMax = null, marginC = THERMAL_MARGIN_C } = {},
) {
  if (typeof responseText !== 'string' || responseText.length === 0) {
    return { text: responseText ?? '', modified: false, reason: null };
  }
  if (!Array.isArray(resolvedEntities) || resolvedEntities.length === 0) {
    return { text: responseText, modified: false, reason: null };
  }

  const fMin = forecastTempMin != null && forecastTempMin !== '' ? Number(forecastTempMin) : NaN;
  const fMax = forecastTempMax != null && forecastTempMax !== '' ? Number(forecastTempMax) : NaN;
  const haveMin = Number.isFinite(fMin);
  const haveMax = Number.isFinite(fMax);
  // Sin NINGÚN dato de pronóstico → no-op graceful (gap documentado).
  if (!haveMin && !haveMax) {
    return { text: responseText, modified: false, reason: null };
  }

  // Idempotencia: si ya anexamos una advertencia térmica, no repetir.
  if (THERMAL_NOTE_MARK.test(responseText)) {
    return { text: responseText, modified: false, reason: null };
  }

  const norm = _stripDiacritics(responseText);
  const advertencias = [];
  const disparadas = [];

  for (const e of resolvedEntities) {
    if (!_isSpecies(e)) continue;
    const tMin = e.temp_min != null && e.temp_min !== '' ? Number(e.temp_min) : NaN;
    const tMax = e.temp_max != null && e.temp_max !== '' ? Number(e.temp_max) : NaN;
    if (!Number.isFinite(tMin) && !Number.isFinite(tMax)) continue; // grounding sin temp.

    const nombre = _entityName(e);
    const nombreNorm = _stripDiacritics(nombre);
    // Solo advierte si el texto está FOMENTANDO sembrar este cultivo (no si solo
    // lo menciona). Reusa el detector directo de fomento.
    if (!_fomentaSiembra(norm, nombreNorm)) continue;

    const partes = [];
    if (Number.isFinite(tMin) && haveMin && fMin <= tMin + marginC) {
      partes.push(
        `riesgo de helada: ${nombre} sufre por debajo de ~${tMin}°C y el pronóstico baja a ` +
          `${Math.round(fMin)}°C`,
      );
    }
    if (Number.isFinite(tMax) && haveMax && fMax >= tMax - marginC) {
      partes.push(
        `riesgo de golpe de calor: ${nombre} se estresa por encima de ~${tMax}°C y el pronóstico sube a ` +
          `${Math.round(fMax)}°C`,
      );
    }
    if (partes.length === 0) continue;

    disparadas.push(nombre);
    advertencias.push(
      `Ojo con ${nombre}: ${partes.join('; y ')}. No te digo que no lo siembres —hay quien lo logra con ` +
        `cuidados— pero requiere protección (cobertor/manta térmica en las noches frías, o sombra y mulch ` +
        `para el calor). Tenlo en cuenta antes de arriesgar la semilla.`,
    );
  }

  if (advertencias.length === 0) {
    return { text: responseText, modified: false, reason: null };
  }

  bumpGuardTelemetry('thermal_viability');
  const text = `${responseText.trim()}\n\n${advertencias.join('\n\n')}`;
  return { text, modified: true, reason: `viabilidad_térmica: ${disparadas.join(', ')}` };
}

// ── GUARD 4: dosis sin fuente (suaviza, no borra) ───────────────────────────

/**
 * Patrones de dosis numérica con unidad agronómica: "30 ml/L", "5 g por
 * planta", "2 cc", "10 gramos por litro", "3 kg/ha". Captura número + unidad.
 */
const DOSE_RE =
  /\b\d+(?:[.,]\d+)?\s*(?:ml|cc|g|gr|gramos?|kg|l|lt|litros?|cm3|cucharad(?:as|ita)s?)\b(?:\s*(?:\/|por|por\s+cada|x)\s*(?:l|lt|litro|litros|planta|plantas|mata|matas|ha|hect|hectarea|m2|arbol|arboles|bomba|caneca)\b)?/gi;

/**
 * Indicios de que la dosis SÍ trae respaldo (cita de fuente / etiqueta). Si
 * está presente cerca de la dosis, NO suavizamos.
 */
const SOURCE_HINT_RE =
  /(seg[uú]n|etiqueta|\bICA\b|Agrosavia|Cenicaf[eé]|Restrepo|\bfuente\b|cat[aá]logo Chagra|recomienda(?:ci[oó]n)? de la|de acuerdo (?:a|con))/i;

/**
 * Guard 4 — dosis sin fuente (PARCIAL: suaviza, no borra). Si el texto da una
 * dosis numérica concreta y NO hay cita de fuente cerca, ANEXA una nota de
 * cautela ("confirma la dosis con la etiqueta o tu técnico local"). NO inventa
 * ni elimina la dosis: solo evita que una cifra inventada se lea como verdad
 * oficial. Conservador: si la respuesta ya cita una fuente, no toca nada.
 *
 * @returns {{text:string, modified:boolean, reason:string|null}}
 */
export function guardDoseWithoutSource(responseText, _resolvedEntities = null, _fincaAltitud = null) {
  if (typeof responseText !== 'string' || responseText.length === 0) {
    return { text: responseText ?? '', modified: false, reason: null };
  }

  const doses = responseText.match(DOSE_RE) || [];
  if (doses.length === 0) {
    return { text: responseText, modified: false, reason: null };
  }
  // Si ya hay cita de fuente en el texto, asumimos respaldo → no suavizar.
  if (SOURCE_HINT_RE.test(responseText)) {
    return { text: responseText, modified: false, reason: null };
  }
  // Evitar duplicar la nota si ya está.
  if (/confirma la dosis con/i.test(responseText)) {
    return { text: responseText, modified: false, reason: null };
  }

  bumpGuardTelemetry('dose_without_source');
  const nota =
    'Nota sobre las dosis: confirma la dosis exacta con la etiqueta del producto o con tu técnico agrícola local ' +
    'antes de aplicar — las cantidades varían según el producto y no conviene guiarse por una cifra sin fuente.';
  const text = `${responseText.trim()}\n\n${nota}`;
  return { text, modified: true, reason: `dosis_sin_fuente: ${[...new Set(doses)].slice(0, 5).join(', ')}` };
}

// ── GUARD 5: sustitución de especie ─────────────────────────────────────────

/**
 * Extrae el binomio canónico "genero epibeto" (sin autoría ni rango infra-
 * específico) de un `nombre_cientifico`. Ej.:
 *   "Solanum quitoense Lam."                                  → "solanum quitoense"
 *   "Passiflora tripartita var. mollissima (Kunth) Holm-Niels."→ "passiflora tripartita"
 *   "Alnus acuminata Kunth"                                   → "alnus acuminata"
 * Devuelve null si no parece un binomio (una sola palabra, vacío).
 *
 * @param {string} sci
 * @returns {string|null}
 */
function _binomial(sci) {
  if (!sci || typeof sci !== 'string') return null;
  const cleaned = _stripDiacritics(sci)
    // quita paréntesis de autoría y rangos infra-específicos.
    .replace(/\(.*?\)/g, ' ')
    .replace(/\b(var|subsp|ssp|f|cv|forma|variedad)\.?\b/g, ' ')
    .replace(/[^a-z\s×x-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  const parts = cleaned.split(' ').filter(Boolean);
  if (parts.length < 2) return null;
  // género + epíteto (los dos primeros tokens alfabéticos).
  return `${parts[0]} ${parts[1]}`;
}

/**
 * Patrón de binomio científico en texto libre: "Genero epiteto" con género
 * capitalizado. Acepta un tercer token de rango (var./subsp.) que ignoramos al
 * normalizar. Captura el binomio crudo para luego normalizarlo con `_binomial`.
 *
 * Diseño anti-ruido: exige inicial mayúscula en el género y minúscula en el
 * epíteto (convención binomial), evitando capturar pares de palabras comunes.
 */
const SCI_BINOMIAL_RE = /\b([A-Z][a-zé]+)\s+([a-zé][a-zé-]+)\b/g;

/**
 * Stopwords del español que NO pueden ser epíteto específico válido. Evita que
 * "Lulo de Castilla", "Café del eje", "Maíz para grano" se lean como binomios
 * ("Lulo de", "Café del", "Maíz para"). Un epíteto botánico real nunca es una
 * preposición/artículo/conjunción.
 */
const EPITHET_STOPWORDS = new Set([
  'de', 'del', 'la', 'el', 'los', 'las', 'un', 'una', 'unos', 'unas',
  'y', 'o', 'u', 'que', 'con', 'sin', 'por', 'para', 'en', 'al', 'a',
  'su', 'sus', 'es', 'son', 'como', 'mas', 'pero', 'este', 'esta', 'ese', 'esa',
  // Palabras de prosa que aparecían como falso "epíteto" en producción
  // (2026-06-02, query de precio "¿a cómo está la papa?"): "Sin embargo",
  // "Estos cultivos", "Marzano debido". El epíteto botánico nunca es un
  // sustantivo/participio común del español.
  'embargo', 'cultivos', 'cultivo', 'planta', 'plantas', 'papa', 'papas',
  'debido', 'mismo', 'misma', 'cuenta', 'ejemplo', 'general', 'caso',
]);

/**
 * Stopwords del español que NO pueden ser GÉNERO de un binomio científico.
 * El género va capitalizado (inicio de oración, determinante, conector,
 * fragmento de nombre propio) y `SCI_BINOMIAL_RE` lo captura igual que un
 * género latino real. El filtro de epíteto solo miraba el SEGUNDO token, así
 * que "Sin embargo", "Estos cultivos", "La papa", "Marzano debido" pasaban y
 * los guards 5/5b emitían correcciones absurdas ("...es Alnus acuminata, no
 * Sin embargo"). Caso real prod 2026-06-02. Comparar en minúsculas sin tildes.
 */
const GENUS_STOPWORDS = new Set([
  // determinantes / artículos / demostrativos
  'la', 'el', 'los', 'las', 'un', 'una', 'unos', 'unas', 'lo', 'su', 'sus',
  'mi', 'mis', 'tu', 'tus', 'este', 'esta', 'esto', 'estos', 'estas', 'ese',
  'esa', 'eso', 'esos', 'esas', 'aquel', 'aquella', 'otro', 'otra', 'otros',
  'otras', 'cada', 'todo', 'toda', 'todos', 'todas', 'mucho', 'mucha',
  'muchos', 'muchas', 'algun', 'alguna', 'algunos', 'algunas', 'cualquier',
  'varios', 'varias',
  // conjunciones / preposiciones / conectores
  'sin', 'con', 'por', 'para', 'pero', 'aunque', 'sino', 'mas', 'como',
  'cuando', 'donde', 'mientras', 'porque', 'pues', 'entonces', 'ademas',
  'asimismo', 'finalmente', 'recuerda', 'ten', 'segun', 'si', 'no', 'ni',
  'que', 'quien', 'cual', 'cuales', 'en', 'de', 'del', 'al', 'hasta',
  'desde', 'sobre', 'entre', 'tras', 'ante', 'bajo',
  // verbos / adverbios frecuentes en inicio de oración
  'es', 'son', 'hay', 'esta', 'estan', 'sera', 'puede', 'pueden', 'debe',
  'deben', 'tiene', 'tienen', 'generalmente', 'normalmente', 'tambien',
  'solo', 'incluso', 'luego', 'despues', 'ahora', 'aqui', 'alli', 'asi',
  // fragmentos de nombre común/varietal que se capitalizan
  'san', 'santa', 'santo', 'marzano',
]);

/**
 * ¿El par (género, epíteto) parece un binomio científico latino real y NO
 * prosa española? Gate compartido por los guards 5 y 5b para no "corregir"
 * fragmentos de oración. Conservador: ante la duda, rechaza (evita falsos
 * positivos como "Sin embargo" → solo deja de corregir, nunca alucina).
 */
function _looksLikeLatinBinomial(genusRaw, epithetRaw) {
  const g = _stripDiacritics(genusRaw).toLowerCase();
  const ep = _stripDiacritics(epithetRaw).toLowerCase();
  if (GENUS_STOPWORDS.has(g)) return false;
  if (EPITHET_STOPWORDS.has(ep)) return false;
  // Los adverbios españoles en -mente jamás son epíteto botánico
  // ("necesariamente", "generalmente").
  if (ep.endsWith('mente')) return false;
  // Epíteto demasiado corto para ser específico latino.
  if (ep.length < 3) return false;
  return true;
}

/**
 * Recolecta TODOS los binomios canónicos que el grounding considera válidos:
 * el de cada entidad resuelta (cultivo, companions top-level, plagas,
 * alternativas) MÁS los anidados en sub-arrays comunes (companions,
 * antagonists, alternativas_viables, pest_controllers). Cualquier binomio del
 * texto que esté en este set es legítimo y NO debe disparar el guard.
 *
 * @param {Array<object>} entities
 * @returns {Set<string>}
 */
function _groundedBinomials(entities) {
  const set = new Set();
  const addSci = (sci) => {
    const b = _binomial(sci);
    if (b) set.add(b);
  };
  const addArr = (arr) => {
    if (!Array.isArray(arr)) return;
    for (const a of arr) {
      if (a && typeof a === 'object') addSci(a.nombre_cientifico || a.nombre_científico);
    }
  };
  for (const e of entities) {
    if (!e || typeof e !== 'object') continue;
    addSci(e.nombre_cientifico || e.nombre_científico);
    addArr(e.companions);
    addArr(e.antagonists);
    addArr(e.alternativas_viables);
    addArr(e.alternativas);
    addArr(e.pest_controllers);
  }
  return set;
}

/**
 * Guard 5 — sustitución de especie (TRUTH del catálogo sobre el cultivo
 * preguntado). Caso prod (2026-05-30): usuario pidió "sembrar lulo", el
 * grounding resolvió lulo=Solanum quitoense CORRECTO, pero el LLM respondió con
 * el binomio de la CURUBA (Passiflora tripartita). El grounding estaba bien; el
 * modelo razonó mal sobre hechos correctos.
 *
 * Doctrina: el agente NO puede atribuirle al cultivo PRINCIPAL preguntado un
 * binomio que el grounding NO le asignó. Por cada entidad-cultivo resuelta cuyo
 * `nombre_comun` aparece en el texto, si el texto contiene un binomio científico
 * que NO está en el conjunto de binomios autoritativos del grounding
 * (companions/antagonists/alternativas incluidos), y ese binomio errado aparece
 * CERCA del nombre del cultivo, se ANEXA una corrección honesta liderando con el
 * binomio correcto del catálogo.
 *
 * A10 (hardening 2026-06-02) — el culprit debe ser un binomio REAL del catálogo,
 * no un par latino-plausible cualquiera. El guard corrige confusiones entre
 * especies REALES (lulo→Passiflora tripartita, que existe en el catálogo), no
 * prosa. Por eso el culpable solo dispara si está en el UNIVERSO de binomios
 * conocidos del grounding (todas las entidades resueltas + sus
 * companions/antagonists/alternativas/pest_controllers). Un binomio del texto que
 * NO está en ese universo es sospechoso de ser prosa/alucinación sin referente
 * real y NO dispara (conservador). Antes, cualquier "Género epíteto" plausible
 * (ej. "Quercus inventus" inexistente) disparaba.
 *
 * Anti-falsos-positivos:
 *  - El culprit debe ser un binomio REAL del universo del grounding (A10), y
 *    distinto del binomio correcto del cultivo (companions y plagas legítimos del
 *    PROPIO cultivo no disparan porque coinciden con su grounding).
 *  - Requiere que el nombre común del cultivo aparezca en el texto (si no, no
 *    podemos atribuir la sustitución a ese cultivo → no dispara).
 *  - Si el binomio correcto del cultivo ya está en el texto, ese cultivo se
 *    considera bien atribuido y no dispara por él.
 *  - Idempotente: no re-corrige si la corrección ya está aplicada.
 *
 * @param {string} responseText
 * @param {Array<object>|null} resolvedEntities
 * @param {number|string|null} _fincaAltitud  (no usado)
 * @returns {{text:string, modified:boolean, reason:string|null}}
 */
export function guardSpeciesSubstitution(responseText, resolvedEntities = null, _fincaAltitud = null) {
  if (typeof responseText !== 'string' || responseText.length === 0) {
    return { text: responseText ?? '', modified: false, reason: null };
  }
  if (!Array.isArray(resolvedEntities) || resolvedEntities.length === 0) {
    return { text: responseText, modified: false, reason: null };
  }

  // Universo de binomios REALES conocidos (todas las entidades + sub-arrays).
  // Sirve de doble función: (1) un binomio del texto que ESTÁ aquí es legítimo
  // (companion/plaga propia del cultivo) → no es culprit; (2) A10: un culprit
  // candidato debe ESTAR aquí (binomio real del catálogo), o se descarta por
  // sospecha de prosa.
  const grounded = _groundedBinomials(resolvedEntities);
  if (grounded.size === 0) {
    return { text: responseText, modified: false, reason: null };
  }

  const norm = _stripDiacritics(responseText);

  // A10: binomios presentes en el texto que SÍ son reales (están en el universo
  // del grounding). Solo estos pueden ser culprit de una sustitución entre
  // especies reales. Un binomio del texto que no esté aquí es prosa/alucinación y
  // se ignora.
  const realInText = new Set();
  let m;
  SCI_BINOMIAL_RE.lastIndex = 0;
  while ((m = SCI_BINOMIAL_RE.exec(responseText)) !== null) {
    // Descarta "Género preposición" (ej. "Lulo de Castilla" → "Lulo de"): un
    // epíteto botánico nunca es una stopword del español.
    if (!_looksLikeLatinBinomial(m[1], m[2])) continue;
    const raw = `${m[1]} ${m[2]}`;
    const bin = _binomial(raw);
    if (bin && grounded.has(bin)) realInText.add(bin);
  }
  if (realInText.size === 0) {
    return { text: responseText, modified: false, reason: null };
  }

  const correcciones = [];
  const disparadas = [];

  for (const e of resolvedEntities) {
    if (!_isSpecies(e)) continue;
    const correctBin = _binomial(e.nombre_cientifico || e.nombre_científico);
    if (!correctBin) continue;

    const nombre = (e.nombre_comun || e.mentioned || '').toString();
    if (!nombre) continue;
    // El cultivo debe ser nombrado en el texto para atribuirle una sustitución.
    // Usamos el primer token del nombre común (ej. "Lulo" de "Lulo / Naranjilla").
    const nombreNorm = _stripDiacritics(nombre.split('/')[0]);
    const firstWord = nombreNorm.split(/\s+/)[0];
    if (!firstWord || firstWord.length < 3 || !norm.includes(firstWord)) continue;

    // Si el binomio correcto ya está en el texto, el cultivo está bien atribuido.
    if (norm.includes(correctBin)) continue;

    // ¿Hay un binomio REAL de OTRA especie CERCA del nombre del cultivo? A10: el
    // culprit debe ser un binomio real del catálogo (está en `realInText`) y
    // distinto del binomio correcto del cultivo. Si el cultivo no está cerca de
    // ninguno, no atribuimos (conservador).
    const idxNombre = norm.indexOf(firstWord);
    let culprit = null;
    for (const fb of realInText) {
      if (fb === correctBin) continue; // su propio binomio correcto no es culprit.
      const idxBin = norm.indexOf(fb);
      if (idxBin < 0) continue;
      // ventana laxa: el binomio errado y el nombre del cultivo en el mismo
      // tramo (≤ 160 chars) — típico de "El lulo (Passiflora tripartita)...".
      if (Math.abs(idxBin - idxNombre) <= 160) {
        culprit = fb;
        break;
      }
    }
    if (!culprit) continue;

    // Idempotencia: no re-corregir si ya pusimos la corrección de este cultivo.
    const yaCorregido = new RegExp(
      `seg[uú]n el cat[aá]logo[^.]*${firstWord}[^.]*${correctBin.replace(/ /g, '\\s+')}`,
      'i',
    ).test(norm);
    if (yaCorregido) continue;

    disparadas.push(`${nombre.split('/')[0].trim()}: ${culprit}→${correctBin}`);
    const nombreLegible = nombre.split('/')[0].trim();
    const sciCorrecto = (e.nombre_cientifico || e.nombre_científico || correctBin).toString().trim();
    correcciones.push(
      `Corrección importante: según el catálogo, el ${nombreLegible.toLowerCase()} es ${sciCorrecto}, ` +
        `no ${culprit.charAt(0).toUpperCase() + culprit.slice(1)}. ` +
        `Esa otra especie es una planta distinta; lo que sigue se refiere al ${nombreLegible.toLowerCase()} real.`,
    );
  }

  if (correcciones.length === 0) {
    return { text: responseText, modified: false, reason: null };
  }

  bumpGuardTelemetry('species_substitution');
  // La corrección lidera para no enterrar el binomio correcto bajo datos de
  // otra especie.
  const text = `${correcciones.join('\n\n')}\n\n${responseText.trim()}`;
  return { text, modified: true, reason: `sustitución_especie: ${disparadas.join('; ')}` };
}

// ── GUARD 5b: binomio de compañía/antagonista sustituido ────────────────────

/**
 * Sub-arrays de una entidad que listan OTRAS especies relacionadas, cada una con
 * su propio `nombre_comun` + `nombre_cientifico` autoritativo del grounding.
 * Estas son las que el guard de compañía valida (companions, antagonists,
 * alternativas, controladores de plaga).
 */
const COMPANION_SUBARRAY_KEYS = [
  'companions',
  'antagonists',
  'alternativas_viables',
  'alternativas',
  'pest_controllers',
];

/**
 * Construye el mapa `nombreComún(normalizado) → Set<binomio canónico>` a partir
 * de los sub-arrays de compañía/antagonista de TODAS las entidades resueltas.
 * Cada compañía aporta su binomio autoritativo (puede haber varias compañías
 * distintas con el mismo nombre común entre cultivos: se acumulan en el Set).
 * Solo se incluyen entradas con nombre común usable (≥3 chars en su 1er token) y
 * binomio parseable.
 *
 * @param {Array<object>} entities
 * @returns {Map<string, {display:string, sci:string, bins:Set<string>}>}
 */
function _companionBinomialMap(entities) {
  /** @type {Map<string, {display:string, sci:string, bins:Set<string>}>} */
  const map = new Map();
  for (const e of entities) {
    if (!e || typeof e !== 'object') continue;
    for (const key of COMPANION_SUBARRAY_KEYS) {
      const arr = e[key];
      if (!Array.isArray(arr)) continue;
      for (const c of arr) {
        if (!c || typeof c !== 'object') continue;
        const nombre = (c.nombre_comun || c.nombre || c.name || '').toString();
        const sci = (c.nombre_cientifico || c.nombre_científico || '').toString();
        const bin = _binomial(sci);
        if (!nombre || !bin) continue;
        const nombreNorm = _stripDiacritics(nombre.split('/')[0]).replace(/\s+/g, ' ').trim();
        if (!nombreNorm) continue;
        const firstWord = nombreNorm.split(/\s+/)[0];
        if (!firstWord || firstWord.length < 3) continue;
        let entry = map.get(nombreNorm);
        if (!entry) {
          entry = { display: nombre.split('/')[0].trim(), sci: sci.trim() || bin, bins: new Set() };
          map.set(nombreNorm, entry);
        }
        entry.bins.add(bin);
      }
    }
  }
  return map;
}

/**
 * Guard 5b — binomio de compañía/antagonista sustituido (TRUTH del catálogo
 * sobre las especies RELACIONADAS, no el cultivo principal).
 *
 * Caso prod (2026-05-31): hablando de antagonistas de la papa, el agente escribió
 * "Nogal andino (Quercus molinae)". El grounding de la papa trae el antagonist
 * Nogal andino = Juglans neotropica (CORRECTO). El modelo sustituyó el binomio de
 * un ANTAGONISTA, no del cultivo principal — por eso `guardSpeciesSubstitution`
 * (que solo valida el cultivo preguntado) no lo cubre.
 *
 * Doctrina: cada companion/antagonist/alternativa del grounding trae su binomio
 * autoritativo. Si el texto menciona el nombre común de una de esas especies Y le
 * atribuye un binomio que NO coincide con ninguno de los binomios que el grounding
 * tiene para ese nombre, se ANEXA una corrección honesta ("el Nogal andino es
 * Juglans neotropica, no Quercus molinae").
 *
 * Anti-falsos-positivos:
 *  - Solo dispara si el nombre común aparece en el texto CERCA (≤160 chars) de un
 *    binomio que contradice TODO su grounding (si coincide con cualquiera de sus
 *    binomios autoritativos, no toca).
 *  - Tolera autoría/variedad (compara solo "Género epíteto" vía `_binomial`).
 *  - Ignora binomios "Género preposición" (stopword como epíteto).
 *  - Idempotente: no re-corrige si la corrección ya está aplicada.
 *
 * @param {string} responseText
 * @param {Array<object>|null} resolvedEntities
 * @param {number|string|null} _fincaAltitud  (no usado)
 * @returns {{text:string, modified:boolean, reason:string|null}}
 */
export function guardCompanionBinomial(responseText, resolvedEntities = null, _fincaAltitud = null) {
  if (typeof responseText !== 'string' || responseText.length === 0) {
    return { text: responseText ?? '', modified: false, reason: null };
  }
  if (!Array.isArray(resolvedEntities) || resolvedEntities.length === 0) {
    return { text: responseText, modified: false, reason: null };
  }

  const compMap = _companionBinomialMap(resolvedEntities);
  if (compMap.size === 0) {
    return { text: responseText, modified: false, reason: null };
  }

  // A10: universo de binomios REALES conocidos del grounding (todas las
  // entidades + sub-arrays). El culprit de una sustitución de companion debe ser
  // un binomio real del catálogo, no prosa/alucinación latino-plausible. Un
  // binomio del texto que NO esté aquí no dispara (conservador).
  const knownRealBinomials = _groundedBinomials(resolvedEntities);

  const norm = _stripDiacritics(responseText);

  // Conjunto de nombres comunes conocidos (normalizados): un nombre común
  // capitalizado ("Nogal andino", "Aliso andino") matchea SCI_BINOMIAL_RE pero
  // NO es un binomio científico — hay que excluirlo de los candidatos para no
  // tomarlo como "binomio foráneo" de sí mismo.
  const knownCommonNames = new Set(compMap.keys());

  // Índices de TODOS los binomios candidatos del texto (crudo→canónico), con su
  // posición sobre el texto normalizado para medir cercanía al nombre común.
  /** @type {Array<{bin:string, idx:number}>} */
  const textBinomials = [];
  let m;
  SCI_BINOMIAL_RE.lastIndex = 0;
  while ((m = SCI_BINOMIAL_RE.exec(responseText)) !== null) {
    if (!_looksLikeLatinBinomial(m[1], m[2])) continue;
    const bin = _binomial(`${m[1]} ${m[2]}`);
    if (!bin) continue;
    // Si el "binomio" es en realidad un nombre común conocido (capitalizado), no
    // es un binomio científico → no es candidato a sustitución.
    if (knownCommonNames.has(bin)) continue;
    // posición sobre el texto normalizado (mismo offset porque _stripDiacritics
    // preserva longitud salvo diacríticos NFD; usamos indexOf como aproximación).
    const idxNorm = norm.indexOf(bin);
    textBinomials.push({ bin, idx: idxNorm >= 0 ? idxNorm : m.index });
  }
  if (textBinomials.length === 0) {
    return { text: responseText, modified: false, reason: null };
  }

  const correcciones = [];
  const disparadas = [];

  for (const [nombreNorm, entry] of compMap) {
    const firstWord = nombreNorm.split(/\s+/)[0];
    const idxNombre = norm.indexOf(nombreNorm) >= 0 ? norm.indexOf(nombreNorm) : norm.indexOf(firstWord);
    if (idxNombre < 0) continue; // el nombre común no se menciona en el texto.

    // Si ALGÚN binomio autoritativo de este nombre ya está en el texto cerca, el
    // companion está bien atribuido → no disparamos por él.
    const algunoCorrecto = textBinomials.some(
      (tb) => entry.bins.has(tb.bin) && Math.abs(tb.idx - idxNombre) <= 160,
    );
    if (algunoCorrecto) continue;

    // ¿Hay un binomio REAL de otra especie CERCA del nombre que NO esté en su
    // grounding? Ese es el culpable (sustitución). A10: el culprit debe estar en
    // el universo de binomios reales del catálogo (`knownRealBinomials`); un par
    // latino que no exista en el catálogo es prosa/alucinación y se descarta.
    // Tomamos el más cercano dentro de la ventana.
    let culprit = null;
    let bestDist = Infinity;
    for (const tb of textBinomials) {
      if (entry.bins.has(tb.bin)) continue; // ese binomio es legítimo (otra especie).
      if (!knownRealBinomials.has(tb.bin)) continue; // A10: no es del catálogo → prosa.
      const dist = Math.abs(tb.idx - idxNombre);
      if (dist <= 160 && dist < bestDist) {
        bestDist = dist;
        culprit = tb.bin;
      }
    }
    if (!culprit) continue;

    const correctoBin = [...entry.bins][0];
    // Idempotencia: si ya pusimos la corrección de este companion, no repetir.
    const yaCorregido = new RegExp(
      `${firstWord}[^.]*${correctoBin.replace(/ /g, '\\s+')}[^.]*no\\s+${culprit.replace(/ /g, '\\s+')}`,
      'i',
    ).test(norm);
    if (yaCorregido) continue;

    const culpritDisplay = culprit.charAt(0).toUpperCase() + culprit.slice(1);
    disparadas.push(`${entry.display}: ${culprit}→${correctoBin}`);
    correcciones.push(
      `Corrección importante: según el catálogo, el ${entry.display.toLowerCase()} es ${entry.sci}, ` +
        `no ${culpritDisplay}. Ese binomio corresponde a otra planta distinta.`,
    );
  }

  if (correcciones.length === 0) {
    return { text: responseText, modified: false, reason: null };
  }

  bumpGuardTelemetry('companion_binomial');
  const text = `${correcciones.join('\n\n')}\n\n${responseText.trim()}`;
  return { text, modified: true, reason: `binomio_compañía: ${disparadas.join('; ')}` };
}

// ── GUARD 6: diagnóstico visual fabricado SIN foto real ─────────────────────

/**
 * Frases con las que el modelo AFIRMA haber analizado/observado una imagen.
 * Capturadas del caso real de producción (2026-05-31): el agente respondía
 * "Analicé una foto ... estado 95/100" e inventaba hallazgos de Mapacho /
 * Nicotiana attenuata que en realidad venían del RAG textual de un biopreparado
 * de tabaco, NO de un análisis de visión. Normalizado sin tildes/case.
 */
const VISION_CLAIM_PATTERNS = [
  /analic[eé]\s+(?:una?\s+|la\s+|tu\s+|esta\s+)?(?:foto|imagen|fotografia)/,
  /(?:se\s+observa|se\s+aprecia|se\s+ve|se\s+nota|observo|aprecio|veo|noto)\s+(?:en\s+|que\s+en\s+)?(?:la|tu|esta)\s+(?:foto|imagen|fotografia)/,
  /en\s+(?:la|tu|esta)\s+(?:foto|imagen|fotografia)\s+se\s+(?:observa|aprecia|ve|nota)/,
  /seg[uú]n\s+(?:la|tu|esta)\s+(?:foto|imagen|fotografia)/,
  /(?:en|de)\s+(?:la|tu|esta)\s+(?:foto|imagen|fotografia)\s+(?:que\s+(?:me\s+)?(?:enviaste|mandaste|subiste|compartiste|adjuntaste))/,
  /hallazgos?\s+visuales?/,
  /diagn[oó]stico\s+visual/,
  /an[aá]lisis\s+(?:de\s+)?(?:la\s+)?(?:foto|imagen)/,
  /estado\s+\d{1,3}\s*\/\s*100/,
];

/** ¿El texto afirma un análisis visual? (sobre texto normalizado). */
function _afirmaVision(textNorm) {
  return VISION_CLAIM_PATTERNS.some((re) => re.test(textNorm));
}

/**
 * Mensaje honesto que reemplaza una afirmación de diagnóstico visual fabricado:
 * deja claro que NO llegó ninguna foto y guía al usuario a usar la cámara.
 */
const NO_PHOTO_MESSAGE =
  'No recibí ninguna foto en este mensaje, así que no puedo darte un diagnóstico visual de tu planta. ' +
  'Si quieres que la revise por imagen, toca el botón de cámara y envíame la foto; mientras tanto, ' +
  'cuéntame con palabras qué le ves (color de las hojas, manchas, plagas) y te ayudo igual.';

/**
 * Nota de cautela cuando SÍ hubo foto pero la visión no fue concluyente y el
 * modelo igual afirma hallazgos detallados. SUAVIZA, no borra.
 */
const LOW_CONFIDENCE_VISION_NOTE =
  'Nota: el análisis visual de la foto no fue concluyente (la cámara/el modelo no logró una lectura ' +
  'clara), así que toma estos hallazgos como una primera impresión y no como un diagnóstico cerrado. ' +
  'Si puedes, mándame una foto más nítida y con buena luz, o descríbeme lo que ves.';

/**
 * Guard 6 — diagnóstico visual fabricado SIN foto real (P0, prod 2026-05-31).
 *
 * El agente NUNCA debe afirmar que analizó/observó una imagen ("Analicé una
 * foto", "se observa en la imagen", "estado X/100", "hallazgos visuales") si en
 * el turno NO hubo una imagen real (no fue un item de foto, no corrió
 * `analyzeFoliage`). El bug se produce porque el RAG textual de un biopreparado
 * (p.ej. tabaco → Mapacho / Nicotiana attenuata) se cuela y el modelo lo
 * presenta como "lo que vio".
 *
 * Comportamiento (determinista):
 *   - hadVision === false  Y  el texto afirma visión  → REEMPLAZA el texto por
 *     un mensaje honesto que pide la foto (botón de cámara). No se intenta
 *     cirugía de frase (frágil); se sustituye porque una respuesta que afirma
 *     ver algo inexistente no tiene parte rescatable.
 *   - hadVision === true   Y  visionConfidence muy baja/nula  Y  el texto
 *     afirma hallazgos visuales → SUAVIZA (anexa nota de cautela). No borra.
 *   - hadVision === true con confianza razonable → NO toca (diagnóstico
 *     legítimo: NO bloquear cuando SÍ hubo foto real).
 *
 * PURA y SÍNCRONA. Firma propia (recibe el contexto de visión, no
 * resolvedEntities/altitud), por eso se invoca directamente desde
 * applyOutputGuards y no desde GUARD_CHAIN.
 *
 * @param {string} responseText
 * @param {object} [ctx]
 * @param {boolean} [ctx.hadVision=false]  ¿hubo una imagen real en el turno?
 * @param {number|null} [ctx.visionConfidence=null]  confianza de analyzeFoliage.
 * @returns {{text:string, modified:boolean, reason:string|null}}
 */
export function guardVisionWithoutPhoto(responseText, { hadVision = false, visionConfidence = null } = {}) {
  if (typeof responseText !== 'string' || responseText.length === 0) {
    return { text: responseText ?? '', modified: false, reason: null };
  }

  const norm = _stripDiacritics(responseText);
  if (!_afirmaVision(norm)) {
    return { text: responseText, modified: false, reason: null };
  }

  // No hubo foto en el turno pero el modelo afirma haber analizado una → la
  // afirmación es 100% fabricada: la reemplazamos por el mensaje honesto.
  if (!hadVision) {
    // Idempotencia: si ya es nuestro mensaje, no re-disparar.
    if (/No recib[ií] ninguna foto en este mensaje/i.test(responseText)) {
      return { text: responseText, modified: false, reason: null };
    }
    bumpGuardTelemetry('vision_without_photo');
    return { text: NO_PHOTO_MESSAGE, modified: true, reason: 'visión_sin_foto' };
  }

  // Sí hubo foto, pero la visión no fue concluyente (confianza nula/baja) y el
  // modelo igual afirma hallazgos: SUAVIZAMOS (no borramos un posible acierto).
  const conf = Number(visionConfidence);
  const lowConfidence = Number.isFinite(conf) && conf <= 0.2;
  if (lowConfidence) {
    if (/an[aá]lisis visual de la foto no fue concluyente/i.test(responseText)) {
      return { text: responseText, modified: false, reason: null };
    }
    bumpGuardTelemetry('vision_low_confidence');
    const text = `${responseText.trim()}\n\n${LOW_CONFIDENCE_VISION_NOTE}`;
    return { text, modified: true, reason: 'visión_confianza_baja' };
  }

  // hadVision con confianza razonable (o desconocida) → diagnóstico legítimo.
  return { text: responseText, modified: false, reason: null };
}

// ── orquestador ─────────────────────────────────────────────────────────────

/**
 * guardInventedName — remueve un saludo con NOMBRE PROPIO inventado al inicio de
 * la respuesta cuando ese nombre NO coincide con el del perfil del usuario.
 *
 * Bug prod (2026-05-31): el agente saludo al usuario como "Dante" — un nombre
 * INVENTADO (el usuario es Miguel y su perfil no trae nombre). El modelo alucino
 * un nombre propio y abrio con el. Este guard detecta el patron de apertura
 * "Hola <Nombre>," / "Buenas <Nombre>:" / "Hola <Nombre>!" y, si <Nombre> no es
 * el del perfil, lo elimina dejando el resto de la respuesta intacto.
 *
 * Conservador (anti-falso-positivo): solo actua si lo que sigue al saludo es UNA
 * palabra capitalizada que parece nombre propio (no una palabra comun en
 * minuscula como "claro"). Si el perfil tiene nombre y coincide, NO toca nada.
 *
 * Firma distinta al resto de la cadena (necesita el nombre del perfil): se
 * invoca aparte en applyOutputGuards, no dentro de GUARD_CHAIN.
 *
 * @param {string} responseText
 * @param {{profileName?: string|null}} [ctx]
 * @returns {{text:string, modified:boolean, reason:string|null}}
 */
const GREETING_NAME_RE =
  /^[\s¡!]*(?:hola|buenas|buenos d[ií]as|buenas tardes|buenas noches|qu[eé] m[aá]s|saludos)\s+([A-ZÁÉÍÓÚÑ][a-záéíóúñ]+)\s*(?:[,:!.]|$)/i;

export function guardInventedName(responseText, { profileName = null } = {}) {
  if (typeof responseText !== 'string' || responseText.length === 0) {
    return { text: responseText ?? '', modified: false, reason: null };
  }
  const m = responseText.match(GREETING_NAME_RE);
  if (!m) return { text: responseText, modified: false, reason: null };

  const saludoNombre = m[1];
  // Solo nombres PROPIOS: la palabra tras el saludo debe ir capitalizada. Una
  // palabra comun en minuscula ("Hola, claro que si") no es un nombre inventado.
  const firstChar = saludoNombre.charAt(0);
  if (firstChar !== firstChar.toUpperCase() || firstChar === firstChar.toLowerCase()) {
    return { text: responseText, modified: false, reason: null };
  }
  // Si coincide con el nombre del perfil (sin tildes/caso), es legitimo.
  const profNorm = _stripDiacritics(profileName || '');
  const nameNorm = _stripDiacritics(saludoNombre);
  if (profNorm && nameNorm && (profNorm === nameNorm || profNorm.split(/\s+/).includes(nameNorm))) {
    return { text: responseText, modified: false, reason: null };
  }

  // Nombre no-grounded: remover SOLO el saludo+nombre+puntuacion inicial y
  // recapitalizar la primera letra del resto.
  let rest = responseText.replace(GREETING_NAME_RE, '').replace(/^[\s,:!.¡¿-]+/, '');
  if (!rest) return { text: responseText, modified: false, reason: null };
  rest = rest.charAt(0).toUpperCase() + rest.slice(1);
  bumpGuardTelemetry('inventedName');
  return {
    text: rest,
    modified: true,
    reason: `nombre propio no-grounded removido del saludo: "${saludoNombre}"`,
  };
}

// ── GUARD: claims de salud sobre FERMENTOS (DR-FOOD-3, SAFETY-CRITICAL) ───────

/**
 * Gatillos de INTENCIÓN-FERMENTO (espejo del pre-filtro del sidecar,
 * fermento-prefilter.ts). El guard SOLO corre si la query/respuesta toca un
 * fermento — anti-falso-positivo. Lista cerrada, normalizada (minúsculas, sin
 * tildes). NO incluye términos agroecológicos generales (siembra, plaga,
 * precio) para no disparar en queries no-fermento. Fuente de verdad:
 * Chagra-strategy/deepresearch/DR-FOOD-3-CONSOLIDADO-2026-06-02.md §2.
 */
const FERMENTO_TERMS = [
  'fermento',
  'fermentado',
  'fermentacion',
  'masato',
  'chicha',
  'guarapo',
  'champus',
  'kombucha',
  'scoby',
  'kefir',
  'chapo',
  'suero costeno',
  'cuajada',
  'yogur',
  'yogurt',
  'chucrut',
  'sauerkraut',
  'hidromiel',
  'encurtido',
];

/**
 * Verbos/sustantivos de CLAIM DE SALUD prohibidos (§3.3 veto de claims). Si la
 * respuesta atribuye a un fermento una propiedad diagnóstica/curativa/
 * preventiva/desintoxicante, el guard la redirige a la frase segura del
 * catálogo. Normalizado (minúsculas, sin tildes).
 */
const HEALTH_CLAIM_TERMS = [
  'cura',
  'curar',
  'cura el',
  'cura la',
  'sana',
  'sanar',
  'previene',
  'prevenir',
  'combate',
  'combatir',
  'desintoxica',
  'desintoxicar',
  'detoxifica',
  'depura',
  'depurar',
  'limpia el higado',
  'limpia los rinones',
  'elimina toxinas',
  'baja el azucar',
  'baja la presion',
  'controla la diabetes',
  'trata el',
  'trata la',
  'remedio para',
  'medicina para',
  'medicinal',
  'propiedades medicinales',
  'fortalece el sistema inmune',
  'sube las defensas',
  'antibiotico natural',
];

/**
 * ¿La respuesta toca un fermento? (gate de intención). Mira tanto el texto del
 * LLM como, si se pasó, la pregunta del usuario — basta con que UNO mencione un
 * fermento. Conservador hacia NO disparar: sin término de fermento → false.
 *
 * @param {string} textNorm  respuesta del LLM normalizada.
 * @param {string} userNorm  pregunta del usuario normalizada (o '').
 * @returns {boolean}
 */
function _touchesFermento(textNorm, userNorm) {
  for (const t of FERMENTO_TERMS) {
    if (textNorm.includes(t) || userNorm.includes(t)) return true;
  }
  return false;
}

/**
 * Frase segura de redirección (§3.3, catálogo canónico del consolidado). El
 * fermento es un ALIMENTO, no un medicamento; ante síntomas, deriva al puesto
 * de salud. NO cita un nombre propio: la autoridad es la pauta institucional
 * (un fermento no es medicamento — marco INVIMA/Res. 810/2021).
 */
const FERMENTO_HEALTH_REDIRECT =
  'Una aclaración importante: un fermento es un alimento, no un medicamento. ' +
  'No cura, no previene ni desintoxica ninguna enfermedad. Si tiene un malestar ' +
  'o una enfermedad, visite el puesto de salud de la vereda para diagnóstico y ' +
  'tratamiento; ningún alimento reemplaza la atención médica.';

/**
 * guardFermentoHealthClaim — DR-FOOD-3, capa 2 de defensa-en-profundidad
 * (guard de salida del PWA). SAFETY-CRITICAL · FAIL-SAFE.
 *
 * Si la respuesta del LLM atribuye a un FERMENTO un claim de salud
 * (diagnóstico/curativo/preventivo/desintoxicante), ANEXA la frase segura del
 * catálogo. NO intenta cirugía de frase (frágil): preserva la parte útil y
 * añade la corrección al final, dejando claro que el fermento es alimento, no
 * medicamento. Idempotente: si la corrección ya está, no re-dispara.
 *
 * GATING POR INTENCIÓN (anti-falso-positivo): solo corre si la respuesta o la
 * pregunta tocan un fermento. En una query no-fermento ("la papa baja el
 * azúcar" sobre precio de mercado) NO se ve afectada — el verbo de salud por sí
 * solo no dispara.
 *
 * Firma propia (necesita userMessage para el gate) → se invoca aparte en
 * applyOutputGuards, no dentro de GUARD_CHAIN.
 *
 * @param {string} responseText
 * @param {{userMessage?: string|null}} [ctx]
 * @returns {{text:string, modified:boolean, reason:string|null}}
 */
export function guardFermentoHealthClaim(responseText, { userMessage = null } = {}) {
  if (typeof responseText !== 'string' || responseText.length === 0) {
    return { text: responseText ?? '', modified: false, reason: null };
  }
  const textNorm = _stripDiacritics(responseText);
  const userNorm = _stripDiacritics(userMessage || '');

  // Gate de intención: sin fermento en juego, no corremos (anti-falso-positivo).
  if (!_touchesFermento(textNorm, userNorm)) {
    return { text: responseText, modified: false, reason: null };
  }

  // Idempotencia: si la frase segura ya está anexada, no re-dispara.
  if (textNorm.includes(_stripDiacritics('un fermento es un alimento, no un medicamento'))) {
    return { text: responseText, modified: false, reason: null };
  }

  // ¿Hay un claim de salud en el texto? Buscamos los términos prohibidos.
  const hits = [];
  for (const claim of HEALTH_CLAIM_TERMS) {
    if (textNorm.includes(claim)) hits.push(claim);
  }
  if (hits.length === 0) {
    return { text: responseText, modified: false, reason: null };
  }

  bumpGuardTelemetry('fermentoHealthClaim');
  const text = `${responseText.trim()}\n\n${FERMENTO_HEALTH_REDIRECT}`;
  return {
    text,
    modified: true,
    reason: `claim_salud_fermento: ${[...new Set(hits)].slice(0, 4).join(', ')}`,
  };
}

// ── GUARD: reforestación con especie invasora/combustible ───────────────────

/**
 * Keywords de intención de REFORESTACIÓN / RESTAURACIÓN ecológica (sobre el
 * texto normalizado sin tildes). Si la pregunta del usuario las trae, está
 * pensando en recuperar bosque/ecosistema y NO se le debe recomendar una
 * especie invasora-combustible sin advertencia. Conservador: cubre el vocablo
 * campesino ("recuperar el bosque", "sembrar árboles", "volver a tener monte")
 * además del técnico ("restauración ecológica", "reforestar").
 */
const REFORESTACION_INTENT_PATTERNS = [
  /\breforest\w*\b/, // reforestar, reforestación
  /\brestaur\w*\b/, // restauración, restaurar (ecológica)
  /\bregenera\w*\b/, // regeneración natural / regenerar
  /\brevegeta\w*\b/, // revegetación
  /\brecuperar\s+(el\s+)?(bosque|monte|suelo|ecosistema|nacimiento|ronda|microcuenca|paramo)\b/,
  /\bbosque\s+nativo\b/,
  /\b(arboles|arbol)\s+nativos?\b/,
  /\bsembrar\s+(arboles|arbol|nativas?|nativos?)\b/,
  /\b(proteger|cuidar|conservar)\s+(el\s+)?(nacimiento|agua|ronda|microcuenca|fuente)\b/,
  /\bcorredor\s+biologic\w*\b/,
  /\bespecies?\s+nativas?\b/,
];

/**
 * ¿La pregunta del usuario es de reforestación / restauración? Heurística sobre
 * el texto normalizado. Sin userMessage → false (gate fail-closed para este
 * guard: sin saber la intención de restauración no advertimos, para no
 * contaminar consultas de siembra agrícola normal donde estas especies — p. ej.
 * leucaena en silvopastoreo — son legítimas).
 *
 * @param {string|null|undefined} userMessage
 * @returns {boolean}
 */
function _isReforestacionIntent(userMessage) {
  if (typeof userMessage !== 'string' || !userMessage.trim()) return false;
  const norm = _stripDiacritics(userMessage);
  return REFORESTACION_INTENT_PATTERNS.some((re) => re.test(norm));
}

/**
 * Especies marcadas `invasora_combustible=true` en el grafo (consolidado
 * DR-RESTAURACION-INCENDIOS-2026-06-02 §"Flag invasora_combustible"). Lista
 * HARDCODEADA a propósito: este es un guard determinístico (como la denylist de
 * agroquímicos sintéticos), no depende del grounding del turno — debe advertir
 * incluso si el resolver de entidades falla. Cada entrada trae:
 *   - `key`: binomio canónico (clave de telemetría/reason).
 *   - `aliases`: nombres (científico + comunes) a buscar en el texto, sin tildes.
 *   - `nativas`: alternativas NATIVAS para restauración (del consolidado, S2/S3).
 *
 * Cobertura: Leucaena leucocephala, Ulex europaeus (retamo espinoso), Genista
 * monspessulana (retamo liso), Melinis minutiflora (pasto gordura), Pinus patula
 * (pino pátula, crítico en páramo), Eucalyptus globulus.
 */
const INVASORA_COMBUSTIBLE_SPECIES = [
  {
    key: 'Leucaena leucocephala',
    aliases: ['leucaena leucocephala', 'leucaena'],
    nativas: ['Alnus acuminata (aliso)', 'Inga spp. (guamo)', 'Trichanthera gigantea (nacedero)'],
  },
  {
    key: 'Ulex europaeus',
    aliases: ['ulex europaeus', 'ulex', 'retamo espinoso', 'retamo'],
    nativas: ['Weinmannia tomentosa (encenillo)', 'Clusia multiflora (gaque)', 'Chusquea spp.'],
  },
  {
    key: 'Genista monspessulana',
    aliases: ['genista monspessulana', 'genista', 'retamo liso'],
    nativas: ['Weinmannia tomentosa (encenillo)', 'Clusia multiflora (gaque)', 'Chusquea spp.'],
  },
  {
    key: 'Melinis minutiflora',
    aliases: ['melinis minutiflora', 'melinis', 'pasto gordura'],
    nativas: [
      'Alnus acuminata (aliso)',
      'Inga spp. (guamo)',
      'gramíneas nativas (Andropogon, Paspalum)',
    ],
  },
  {
    key: 'Pinus patula',
    aliases: ['pinus patula', 'pino patula', 'pino'],
    nativas: [
      'Quercus humboldtii (roble)',
      'Polylepis quadrijuga (colorado de páramo)',
      'Weinmannia tomentosa (encenillo)',
    ],
  },
  {
    key: 'Eucalyptus globulus',
    aliases: ['eucalyptus globulus', 'eucalipto'],
    nativas: [
      'Quercus humboldtii (roble)',
      'Alnus acuminata (aliso)',
      'Weinmannia tomentosa (encenillo)',
    ],
  },
];

/** Marca textual idempotente que deja este guard al anexar su advertencia. */
const REFORESTACION_NOTE_MARK = 'no se recomienda para restauracion';

/**
 * ¿El texto menciona la especie invasora por alguno de sus alias, como palabra?
 * Compara sobre el texto normalizado con límites de palabra laxos para evitar
 * sub-cadenas accidentales ("pino" dentro de "pinos"/"opino" → el límite lo
 * resuelve; aun así "pino" es alias deliberadamente conservador para Pinus).
 *
 * @param {string} textNorm  respuesta del LLM normalizada (sin tildes).
 * @param {string[]} aliases  nombres a buscar (ya normalizados).
 * @returns {string|null} el alias que matcheó, o null.
 */
function _mentionsInvasora(textNorm, aliases) {
  for (const a of aliases) {
    if (!a) continue;
    const re = new RegExp(`(^|[^a-z0-9])${a.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&')}([^a-z0-9]|$)`);
    if (re.test(textNorm)) return a;
  }
  return null;
}

/**
 * guardReforestacionInvasora — GUARD fail-safe de RESTAURACIÓN (consolidado
 * DR-RESTAURACION-INCENDIOS-2026-06-02). SAFETY ecológica.
 *
 * Cuando la pregunta del usuario es de REFORESTACIÓN / RESTAURACIÓN ecológica y
 * la respuesta del LLM menciona una especie marcada `invasora_combustible=true`
 * (Leucaena, retamo espinoso/Ulex, retamo liso/Genista, pasto gordura/Melinis,
 * pino pátula/Pinus patula, eucalipto/Eucalyptus globulus), ANEXA una nota de
 * advertencia: esa especie NO se recomienda para restauración por su riesgo
 * invasor/combustible, y sugiere nativas del catálogo. NO la borra del texto —
 * ADVIERTE (el modelo puede haberla nombrado en contexto legítimo: explicar por
 * qué erradicarla, silvopastoreo controlado, etc.).
 *
 * GATING POR INTENCIÓN (anti-falso-positivo): solo corre si `userMessage` es de
 * reforestación/restauración. En una consulta agrícola normal ("¿siembro
 * leucaena para sombra del ganado?") NO advierte — leucaena en silvopastoreo
 * controlado es legítima (consolidado D3). Sin userMessage → no-op (fail-closed
 * por diseño: no contamina siembra agrícola).
 *
 * Lista HARDCODEADA (determinístico, como la denylist de agroquímicos): no
 * depende del grounding del turno; advierte aunque el resolver falle.
 *
 * Idempotente: si la nota ya está, no re-dispara. Firma propia (necesita
 * userMessage para el gate) → se invoca aparte en applyOutputGuards, fuera de
 * GUARD_CHAIN.
 *
 * @param {string} responseText
 * @param {{userMessage?: string|null}} [ctx]
 * @returns {{text:string, modified:boolean, reason:string|null}}
 */
export function guardReforestacionInvasora(responseText, { userMessage = null } = {}) {
  if (typeof responseText !== 'string' || responseText.length === 0) {
    return { text: responseText ?? '', modified: false, reason: null };
  }
  // Gate de intención: solo en consultas de reforestación/restauración.
  if (!_isReforestacionIntent(userMessage)) {
    return { text: responseText, modified: false, reason: null };
  }

  const textNorm = _stripDiacritics(responseText);

  // Idempotencia: si la nota de advertencia ya está, no re-dispara.
  if (textNorm.includes(REFORESTACION_NOTE_MARK)) {
    return { text: responseText, modified: false, reason: null };
  }

  const disparadas = [];
  const nativasSugeridas = [];
  for (const sp of INVASORA_COMBUSTIBLE_SPECIES) {
    if (_mentionsInvasora(textNorm, sp.aliases)) {
      disparadas.push(sp.key);
      for (const n of sp.nativas) {
        if (!nativasSugeridas.includes(n)) nativasSugeridas.push(n);
      }
    }
  }

  if (disparadas.length === 0) {
    return { text: responseText, modified: false, reason: null };
  }

  bumpGuardTelemetry('reforestacion_invasora');
  const nombres = disparadas.join(', ');
  const altTxt = nativasSugeridas.length
    ? ` Para restaurar de verdad, mejor usa especies NATIVAS del catálogo: ${nativasSugeridas
        .slice(0, 4)
        .join(', ')}.`
    : '';
  const advertencia =
    `⚠️ Aclaración importante de restauración: ${nombres} es una especie INVASORA y ` +
    `combustible — NO se recomienda para restauración ni reforestación de bosque nativo. ` +
    `Desplaza la vegetación nativa, acumula necromasa muy inflamable y retroalimenta el ciclo ` +
    `del fuego (en retamo el incendio incluso activa su banco de semillas). Para restaurar lo ` +
    `correcto es controlarla, no sembrarla.${altTxt}`;
  const text = `${responseText.trim()}\n\n${advertencia}`;
  return { text, modified: true, reason: `reforestacion_invasora: ${nombres}` };
}

// ── GUARD: reforestación POSITIVA — sugiere nativas con rol ──────────────────

/**
 * Catálogo HARDCODEADO de nativas de restauración con su ROL ecológico
 * (consolidado DR-RESTAURACION-INCENDIOS-2026-06-02 §3 y §6). Lado POSITIVO del
 * guard de restauración: mientras `guardReforestacionInvasora` ADVIERTE sobre
 * invasoras-combustibles, este SUGIERE qué sembrar.
 *
 * Determinístico a propósito (como la denylist de agroquímicos y la lista de
 * invasoras): NO depende del grounding del turno — la sugerencia es buena aunque
 * el resolver de entidades falle. Cada entrada:
 *   - `rol`: etiqueta del rol funcional en restauración (cómo lo lee el campesino).
 *   - `especies`: nativas del consolidado para ese rol, con su nombre común.
 *   - `nota`: dato clave del DR que justifica el rol (cuantitativo si lo hay).
 *
 * Roles cubiertos (los 4 pedidos + ancla por rebrote):
 *   - Pioneras de rápido establecimiento: Alnus acuminata (aliso),
 *     Trichanthera gigantea (nacedero), Chusquea spp. (chusque).
 *   - Fijadoras de nitrógeno: Alnus acuminata (~280 kg N/ha/año, Carlson 1985),
 *     Inga spp. (guamo), Gliricidia sepium (matarratón).
 *   - Cortafuego / barrera de baja inflamabilidad: Clusia multiflora (gaque),
 *     Weinmannia tomentosa (encenillo).
 *   - Ancla por rebrote post-incendio: Quercus humboldtii (roble),
 *     Polylepis quadrijuga (colorado de páramo).
 */
const NATIVAS_RESTAURACION_POR_ROL = [
  {
    rol: 'Pioneras de rápido establecimiento (cubren el suelo y rompen el ciclo del fuego)',
    especies: ['Alnus acuminata (aliso)', 'Trichanthera gigantea (nacedero)', 'Chusquea spp. (chusque)'],
    nota: 'crecen rápido, estabilizan taludes y dan sombra para que entren las demás',
  },
  {
    rol: 'Fijadoras de nitrógeno (recuperan el suelo quemado o cansado)',
    especies: ['Alnus acuminata (aliso)', 'Inga spp. (guamo)', 'Gliricidia sepium (matarratón)'],
    nota: 'el aliso fija ~280 kg de nitrógeno por hectárea al año (Carlson 1985)',
  },
  {
    rol: 'Cortafuego natural (follaje grueso y baja inflamabilidad para frenar el fuego)',
    especies: ['Clusia multiflora (gaque)', 'Weinmannia tomentosa (encenillo)'],
    nota: 'el gaque funciona como barrera viva por su hoja gruesa y húmeda',
  },
  {
    rol: 'Ancla por rebrote (aguantan el incendio y rebrotan de raíz/tronco)',
    especies: ['Quercus humboldtii (roble)', 'Polylepis quadrijuga (colorado de páramo)'],
    nota: 'el roble rebrota tras el fuego y ancla la recuperación del bosque',
  },
];

/** Marca textual idempotente que deja el guard POSITIVO al anexar su nota. */
const REFORESTACION_NATIVAS_NOTE_MARK = 'nativas con su papel en la restauracion';

/**
 * Patrones que indican que la respuesta YA está dando recomendaciones concretas
 * de nativas CON ROL (binomios + vocabulario de rol). Si el modelo ya entregó
 * una lista útil de nativas con su función, el guard NO necesita anexar su nota
 * (evita redundancia). Conservador: exige señal CLARA de rol funcional, no la
 * mera mención de un nombre suelto.
 *
 * Se evalúa sobre el texto de respuesta normalizado (sin tildes).
 */
const NATIVAS_CON_ROL_PRESENTES_RE =
  /(alnus\s+acuminata|trichanthera|clusia\s+multiflora|quercus\s+humboldtii|weinmannia|polylepis|gliricidia|inga\s+)/;

/** Vocabulario de ROL funcional ya presente en la respuesta. */
const ROL_FUNCIONAL_RE =
  /(pioner|fijador|fija(r|n)?\s+nitrogeno|cortafuego|corta\s+fuego|rebrot|barrera\s+viva|baja\s+inflamab)/;

/**
 * guardReforestacionNativasRol — GUARD POSITIVO de RESTAURACIÓN (consolidado
 * DR-RESTAURACION-INCENDIOS-2026-06-02). Complemento del lado negativo
 * (`guardReforestacionInvasora`, que ADVIERTE sobre invasoras).
 *
 * Cuando la pregunta del usuario es de REFORESTACIÓN / RESTAURACIÓN ecológica y
 * la respuesta del LLM NO está dando ya una recomendación concreta de nativas
 * con rol, ANEXA una nota determinística que sugiere especies NATIVAS agrupadas
 * por su ROL ecológico (pioneras, fijadoras de N, cortafuego, ancla por
 * rebrote), tomadas del consolidado. Lado POSITIVO: dice QUÉ sembrar, no solo
 * qué evitar.
 *
 * GATING POR INTENCIÓN (anti-falso-positivo): solo corre si `userMessage` es de
 * reforestación/restauración (`_isReforestacionIntent`, compartido con el guard
 * de invasoras). En una consulta agrícola normal NO actúa. Sin userMessage →
 * no-op (fail-closed por diseño).
 *
 * ANTI-REDUNDANCIA: si la respuesta YA nombra nativas de restauración con
 * vocabulario de rol funcional (el modelo acertó), el guard NO anexa la nota.
 * También es idempotente: si su propia marca ya está, no re-dispara, y no pisa
 * la advertencia del guard de invasoras (se anexan en orden, ambos caben).
 *
 * Lista HARDCODEADA (determinístico): no depende del grounding del turno; sugiere
 * aunque el resolver de entidades falle. Firma propia (necesita userMessage para
 * el gate) → se invoca aparte en applyOutputGuards, fuera de GUARD_CHAIN.
 *
 * @param {string} responseText
 * @param {{userMessage?: string|null}} [ctx]
 * @returns {{text:string, modified:boolean, reason:string|null}}
 */
export function guardReforestacionNativasRol(responseText, { userMessage = null } = {}) {
  if (typeof responseText !== 'string' || responseText.length === 0) {
    return { text: responseText ?? '', modified: false, reason: null };
  }
  // Gate de intención: solo en consultas de reforestación/restauración.
  if (!_isReforestacionIntent(userMessage)) {
    return { text: responseText, modified: false, reason: null };
  }

  const textNorm = _stripDiacritics(responseText);

  // Idempotencia: si la nota de nativas-con-rol ya está, no re-dispara.
  if (textNorm.includes(REFORESTACION_NATIVAS_NOTE_MARK)) {
    return { text: responseText, modified: false, reason: null };
  }

  // Anti-redundancia: si la respuesta YA da nativas concretas CON rol funcional,
  // el modelo ya cubrió lo positivo — no anexamos para no repetir.
  if (NATIVAS_CON_ROL_PRESENTES_RE.test(textNorm) && ROL_FUNCIONAL_RE.test(textNorm)) {
    return { text: responseText, modified: false, reason: null };
  }

  bumpGuardTelemetry('reforestacion_nativas_rol');
  const bloques = NATIVAS_RESTAURACION_POR_ROL.map(
    (g) => `- ${g.rol}: ${g.especies.join(', ')} — ${g.nota}.`,
  );
  const nota =
    '🌱 Para restaurar con nativas con su papel en la restauración, una guía rápida por rol:\n' +
    `${bloques.join('\n')}\n` +
    'Lo ideal: empezar con pioneras y fijadoras para recuperar el suelo, y de ancla el roble por su ' +
    'rebrote. Siembra antes del pico seco y dale riego de establecimiento el primer verano.';
  const text = `${responseText.trim()}\n\n${nota}`;
  return { text, modified: true, reason: 'reforestacion_nativas_rol' };
}

// ── GUARD: dominio (off-domain física/química/matemáticas) ──────────────────

/**
 * #352 (prod 2026-06-03 Choachí): el agente respondió completo a "teoría de la
 * relatividad", "teoría de cuerdas", "química orgánica vs inorgánica" — y peor,
 * con un badge falso "Catálogo verificado · get_normativa_ica" (grounding
 * irrelevante) y un typo ("toria de cuerdas") lo buscó como PLANTA. Chagra es un
 * asistente AGROECOLÓGICO: ante una pregunta fuera de dominio (física, química
 * teórica, matemáticas, historia, etc.) debe DECLINAR amable y redirigir, SIN
 * tool ni grounding.
 *
 * Estos patrones (sobre el texto normalizado) marcan temas inequívocamente
 * académicos/no-agro. Son CONSERVADORES: cada uno apunta a un concepto que no
 * tiene lectura agrícola legítima ("teoria de cuerdas", "relatividad",
 * "ecuacion de segundo grado"). NO incluye términos que también son agro
 * ("suelo", "agua", "nitrogeno", "ph", "fotosintesis"): esos pueden ser de
 * cultivo y NO deben declinarse.
 */
const OFF_DOMAIN_TOPIC_PATTERNS = [
  // física teórica
  /\bteoria\s+de\s+(la\s+)?relatividad\b/,
  /\brelatividad\s+(general|especial)\b/,
  /\bteoria\s+de\s+(las?\s+)?cuerdas\b/,
  /\bmecanica\s+cuantica\b/,
  /\bfisica\s+cuantica\b/,
  /\bagujero[s]?\s+negro[s]?\b/,
  /\bbig\s+bang\b/,
  /\bley(es)?\s+de\s+newton\b/,
  /\btermodinamica\b/,
  // química teórica (no agro: distinguir de "química del suelo")
  /\bquimica\s+(organica|inorganica)\b/,
  /\btabla\s+periodica\b/,
  /\benlace[s]?\s+(covalente|ionico|metalico)\b/,
  /\bnumero\s+atomico\b/,
  // matemáticas puras
  /\bteorema\s+de\s+pitagoras\b/,
  /\becuacion\s+(de\s+segundo\s+grado|cuadratica|diferencial)\b/,
  /\bderivada[s]?\s+(de\s+una\s+funcion|e\s+integrales)\b/,
  /\bintegral(es)?\s+(definida|indefinida)\b/,
  /\bcalculo\s+(diferencial|integral)\b/,
  /\blogaritmo[s]?\b/,
  /\btrigonometr/,
  // otros dominios académicos claros
  /\bteoria\s+de\s+la\s+evolucion\b/,
  /\bguerra\s+(mundial|fria|de\s+los\s+mil\s+dias)\b/,
];

/**
 * ¿La pregunta del usuario es de un dominio claramente NO-agroecológico? Sobre
 * el texto normalizado del userMessage. Sin userMessage → false (no podemos
 * juzgar el dominio; conservador: dejamos pasar).
 *
 * @param {string|null|undefined} userMessage
 * @returns {boolean}
 */
function _isOffDomainQuery(userMessage) {
  if (typeof userMessage !== 'string' || !userMessage.trim()) return false;
  const norm = _stripDiacritics(userMessage);
  return OFF_DOMAIN_TOPIC_PATTERNS.some((re) => re.test(norm));
}

/**
 * Mensaje de declinación amable + redirección al dominio agro. NO cita tool ni
 * grounding (el bug original mostraba un badge "get_normativa_ica" falso). Es un
 * reemplazo COMPLETO: una respuesta off-domain no tiene parte rescatable.
 */
const OFF_DOMAIN_DECLINE_MESSAGE =
  'Soy tu asistente de cultivos y agroecología, así que de ese tema no soy quien te puede ayudar bien ' +
  '(hay mejores fuentes para física, química o matemáticas). Lo que sí manejo es tu finca: qué sembrar ' +
  'según tu altura y clima, plagas y enfermedades, biopreparados y abonos orgánicos, asociaciones de ' +
  'cultivos y manejo del suelo. ¿Te ayudo con algo de tu cultivo?';

/**
 * guardOffDomain — #352. Si la PREGUNTA del usuario es de un dominio claramente
 * no-agro (física/química teórica/matemáticas) y la respuesta del modelo entró a
 * contestarla, REEMPLAZA la respuesta por una declinación amable que redirige al
 * dominio agro. No corre tool ni grounding.
 *
 * GATING POR INTENCIÓN: solo actúa si el userMessage matchea un tema off-domain.
 * Una pregunta agro normal ("¿qué siembro a 1923 msnm?") NO se ve afectada. Sin
 * userMessage → no-op (conservador: no juzgamos el dominio sin la pregunta).
 *
 * Idempotente: si la respuesta ya es nuestro mensaje de declinación, no
 * re-dispara. Firma propia (necesita userMessage) → se invoca aparte en
 * applyOutputGuards, no dentro de GUARD_CHAIN.
 *
 * @param {string} responseText
 * @param {{userMessage?: string|null}} [ctx]
 * @returns {{text:string, modified:boolean, reason:string|null}}
 */
export function guardOffDomain(responseText, { userMessage = null } = {}) {
  if (typeof responseText !== 'string' || responseText.length === 0) {
    return { text: responseText ?? '', modified: false, reason: null };
  }
  if (!_isOffDomainQuery(userMessage)) {
    return { text: responseText, modified: false, reason: null };
  }
  // Idempotencia: ya declinamos.
  if (/asistente de cultivos y agroecolog[ií]a/i.test(responseText)) {
    return { text: responseText, modified: false, reason: null };
  }
  bumpGuardTelemetry('off_domain');
  return { text: OFF_DOMAIN_DECLINE_MESSAGE, modified: true, reason: 'off_domain' };
}

// ── GUARD: diagnóstico sin foto ni datos (anti-dx-a-ciegas) ─────────────────

/**
 * #348 (prod 2026-06-03 Choachí): "manchas en el tomate" SIN foto → el agente
 * enumeró una lista de patógenos posibles (tizón tardío, alternaria, etc.) como
 * si hubiera diagnosticado. Sin la foto ni datos del síntoma, eso es adivinar y
 * puede mandar al campesino a tratar la enfermedad equivocada. El guard de
 * visión-sin-foto (`guardVisionWithoutPhoto`) NO lo cubre: ahí el modelo NO
 * afirma haber visto una foto, simplemente lista diagnósticos sin base.
 *
 * Este guard, complementario, detecta: (a) intención de DIAGNÓSTICO de
 * síntomas en la pregunta ("manchas/hojas amarillas/se está secando/qué tiene
 * mi…"), (b) ausencia de foto en el turno (hadVision=false), y (c) que la
 * respuesta ENUMERA candidatos de enfermedad/plaga (≥2 nombres de patógeno o
 * fraseo "puede ser X o Y"). En ese caso ANTEPONE una nota pidiendo foto/datos
 * antes de la lista — no borra la lista (puede ser útil como referencia), pero
 * deja claro que sin foto/datos no es un diagnóstico.
 */
const SYMPTOM_DIAG_INTENT_PATTERNS = [
  /\bmanch(a|as)\b/,
  /\bhojas?\s+(amarill|seca|negra|cafe|marchit|enroll|con\s+hueco)/,
  /\bse\s+(esta\s+)?(secando|marchitando|muriendo|pudriendo|amarillando)\b/,
  /\bqu[eé]\s+(tiene|le\s+pasa|enfermedad)\b/,
  /\b(plaga|enfermedad|hongo|bicho|gusano)\b/,
  /\bpudric(ion|iones)\b/,
  /\bpuntos?\s+(negro|cafe|amarillo)/,
];

/** ¿La pregunta del usuario pide un diagnóstico de síntomas? */
function _isSymptomDiagnosisQuery(userMessage) {
  if (typeof userMessage !== 'string' || !userMessage.trim()) return false;
  const norm = _stripDiacritics(userMessage);
  return SYMPTOM_DIAG_INTENT_PATTERNS.some((re) => re.test(norm));
}

/**
 * Nombres de patógenos/plagas frecuentes (normalizados) — si la respuesta
 * enumera ≥2, está dando un diagnóstico diferencial a ciegas. Lista corta de
 * los más nombrados en tomate/papa/hortalizas. No pretende ser exhaustiva: es
 * un detector de "lista de candidatos de enfermedad".
 */
const PATHOGEN_NAME_TERMS = [
  'tizon tardio', 'tizon temprano', 'tizon', 'gota', 'alternaria', 'phytophthora',
  'fusarium', 'verticillium', 'botrytis', 'antracnosis', 'mildeo', 'mildiu', 'oidio',
  'cercospora', 'septoria', 'roya', 'virus del mosaico', 'mosca blanca', 'minador',
  'acaro', 'trips', 'pulgon', 'nematodo', 'bacteriosis', 'cancro', 'moho',
];

/** Fraseo de enumeración de candidatos ("puede ser X o Y", "podría tratarse de"). */
const DIFFERENTIAL_PHRASING_RE =
  /(puede\s+ser|podria\s+(ser|tratarse)|posibles?\s+(causa|enfermedad|patogeno|plaga)|entre\s+las?\s+(causa|enfermedad|posibilidad)|podria\s+deberse|se\s+trata\s+(probablemente\s+)?de)/;

/**
 * guardDiagnosisWithoutPhoto — #348. Cuando la pregunta es de diagnóstico de
 * síntomas, NO hubo foto en el turno, y la respuesta enumera candidatos de
 * enfermedad/plaga (≥2 patógenos nombrados o fraseo diferencial), ANTEPONE una
 * nota pidiendo foto/datos. Así el campesino no trata a ciegas la enfermedad
 * equivocada. NO borra la respuesta del modelo (la lista puede orientar); la
 * encabeza con la petición de evidencia.
 *
 * GATING: requiere intención de diagnóstico en userMessage Y hadVision=false. Si
 * hubo foto, el diagnóstico es legítimo (no toca). Si la respuesta no enumera
 * candidatos (p. ej. ya pide foto, o solo da manejo cultural genérico), no-op.
 * Idempotente.
 *
 * Firma propia (necesita userMessage + hadVision) → se invoca aparte en
 * applyOutputGuards, no dentro de GUARD_CHAIN.
 *
 * @param {string} responseText
 * @param {{userMessage?: string|null, hadVision?: boolean}} [ctx]
 * @returns {{text:string, modified:boolean, reason:string|null}}
 */
const DIAGNOSIS_NEEDS_EVIDENCE_NOTE =
  'Antes de ponerle nombre a lo que tiene tu cultivo necesito verlo: con solo "manchas" puedo equivocarme y ' +
  'mandarte a tratar la enfermedad que no es. Mándame una foto (toca el botón de cámara) de la hoja o el fruto ' +
  'afectado, y cuéntame: ¿de qué color son las manchas, son secas o con humedad, empezaron por las hojas de ' +
  'abajo o de arriba, hace cuánto y con qué clima? Con eso sí te doy un diagnóstico confiable.';

export function guardDiagnosisWithoutPhoto(
  responseText,
  { userMessage = null, hadVision = false } = {},
) {
  if (typeof responseText !== 'string' || responseText.length === 0) {
    return { text: responseText ?? '', modified: false, reason: null };
  }
  // Solo aplica a consultas de diagnóstico de síntomas SIN foto en el turno.
  if (hadVision || !_isSymptomDiagnosisQuery(userMessage)) {
    return { text: responseText, modified: false, reason: null };
  }
  // Idempotencia: la nota ya está.
  if (/Antes de ponerle nombre a lo que tiene tu cultivo/i.test(responseText)) {
    return { text: responseText, modified: false, reason: null };
  }
  const norm = _stripDiacritics(responseText);
  // ¿La respuesta enumera candidatos de enfermedad/plaga? (≥2 patógenos nombrados
  // o fraseo diferencial). Solo así anteponemos la petición de evidencia: una
  // respuesta que ya pide la foto o solo da manejo cultural no se toca.
  const patho = new Set();
  for (const term of PATHOGEN_NAME_TERMS) {
    if (norm.includes(term)) patho.add(term);
  }
  const enumeraCandidatos = patho.size >= 2 || DIFFERENTIAL_PHRASING_RE.test(norm);
  if (!enumeraCandidatos) {
    return { text: responseText, modified: false, reason: null };
  }
  bumpGuardTelemetry('diagnosis_without_photo');
  const text = `${DIAGNOSIS_NEEDS_EVIDENCE_NOTE}\n\n${responseText.trim()}`;
  return { text, modified: true, reason: 'diagnostico_sin_foto' };
}

// ── GUARD: viabilidad FALSO-NEGATIVO (cultivo viable marcado inviable) ──────

/**
 * #350 (CRÍTICO, prod 2026-06-03 Choachí): el modelo afirmó que papa y fresa
 * "NO son viables a 1923 msnm" y desvió al campesino a Daikon/ajo + variedades
 * extranjeras absurdas ('Kennebec', 'Yukon Gold' a -2°C). FALSO: Choachí (1923 m,
 * templado) es zona PAPERA clásica; papa y fresa SON viables ahí. Causa probable:
 * sin grounding (NLU abortó), el LLM comparó contra la banda equivocada (ej.
 * "fresa silvestre andina") y declaró inviabilidad que NO es autoritativa.
 *
 * `guardInvertedViability` solo AÑADE correcciones de inviabilidad autoritativa
 * (campo `viabilidad:inviable` o banda de altitud del grounding); NO cubre el
 * caso opuesto — el modelo INVENTANDO inviabilidad de un cultivo que sí se da.
 *
 * Este guard usa una tabla AUTORITATIVA de bandas de altitud para los cultivos
 * andinos de base (papa, fresa, etc., con rangos agronómicos bien establecidos).
 * Si la respuesta declara INVIABLE un cultivo de esa tabla a una altitud que SÍ
 * cae en su banda viable, CORRIGE: afirma que sí es viable a esa altura y elimina
 * la afirmación falsa de inviabilidad. Es deliberadamente CONSERVADOR: solo actúa
 * sobre cultivos de banda conocida y solo cuando la altitud de la finca está
 * DENTRO de la banda viable — nunca inventa viabilidad fuera de rango (papa a
 * 3500 m sí es inviable y se respeta).
 *
 * Bandas (msnm) de fuentes agronómicas estándar para Colombia (Agrosavia/ICA;
 * rangos comerciales conservadores):
 *   - papa (Solanum tuberosum): 1800–3200 m (zona andina fría/templada-alta).
 *     A 1923 m está en el borde inferior templado donde sí se cultiva → viable.
 *     El techo se fija en 3200 m (ceiling comercial conservador): por encima la
 *     papa entra en zona marginal/fría real, así que a 3500 m NO afirmamos
 *     viabilidad (una advertencia de inviabilidad ahí puede ser legítima).
 *   - fresa (Fragaria × ananassa): 1300–2800 m (clima templado a frío).
 *   - arveja, haba, cebolla, zanahoria, repollo, lechuga: bandas templadas
 *     amplias que cubren 1900 m.
 * La banda de papa se fija con borde inferior 1800 m para reconocer las zonas
 * paperas templadas (Cundinamarca/Boyacá/Nariño) — Choachí entra de lleno.
 */
const KNOWN_VIABLE_BANDS = [
  { base: 'papa', binomial: 'solanum tuberosum', min: 1800, max: 3200 },
  { base: 'fresa', binomial: 'fragaria', min: 1300, max: 2800 },
  { base: 'frutilla', binomial: 'fragaria', min: 1300, max: 2800 },
  { base: 'arveja', binomial: 'pisum sativum', min: 1800, max: 3000 },
  { base: 'haba', binomial: 'vicia faba', min: 2000, max: 3200 },
  { base: 'cebolla', binomial: 'allium cepa', min: 1500, max: 2800 },
  { base: 'zanahoria', binomial: 'daucus carota', min: 1700, max: 3000 },
  { base: 'repollo', binomial: 'brassica oleracea', min: 1800, max: 3000 },
  { base: 'lechuga', binomial: 'lactuca sativa', min: 1500, max: 2800 },
  { base: 'maiz', binomial: 'zea mays', min: 0, max: 2800 },
];

/**
 * Busca la banda viable conocida para un nombre de cultivo (común o binomio),
 * normalizado. Devuelve la entrada o null.
 *
 * @param {string} nombreNorm  nombre normalizado (común).
 * @param {string|null} binomialNorm  binomio normalizado, si lo hay.
 * @returns {{base:string, binomial:string, min:number, max:number}|null}
 */
function _knownViableBand(nombreNorm, binomialNorm) {
  const firstToken = (nombreNorm || '').split(/\s+/)[0];
  for (const band of KNOWN_VIABLE_BANDS) {
    if (firstToken === band.base || (nombreNorm && nombreNorm.includes(band.base))) return band;
    if (binomialNorm && binomialNorm.includes(band.binomial)) return band;
  }
  return null;
}

/**
 * ¿La respuesta declara INVIABLE el cultivo `bandBase` (a la altitud de la
 * finca)? Busca, en alguna oración que mencione el cultivo, fraseo de
 * inviabilidad ("no es viable", "no se da", "no prospera", "no vale la pena",
 * "no es recomendable sembrar", "el clima/la altura no le sirve"). Sobre el
 * texto normalizado.
 *
 * @param {string} textNorm
 * @param {string} bandBase  nombre base del cultivo (p. ej. "papa", "fresa").
 * @returns {boolean}
 */
const FALSE_INVIABILITY_RE =
  /(no\s+es\s+viable|no\s+(es\s+)?(viable|recomendable)\s+(sembrar|cultivar)|inviable|no\s+se\s+da\b|no\s+prosper|no\s+vale\s+la\s+pena|no\s+es\s+(adecuad|apropiad)|clima\s+no\s+(le\s+)?sirve|altura\s+no\s+(le\s+)?sirve|no\s+(te\s+)?sirve\s+(a\s+)?(esa|tu)\s+altura)/;

function _declaraInviable(textNorm, bandBase) {
  const sentences = _splitSentences(textNorm);
  for (const s of sentences) {
    if (!s.includes(bandBase)) continue;
    if (FALSE_INVIABILITY_RE.test(s)) return true;
  }
  // También: el cultivo y la negación de viabilidad en el texto, aunque en
  // oraciones contiguas (el split puede separar "La papa..." de "...no es viable").
  if (textNorm.includes(bandBase) && FALSE_INVIABILITY_RE.test(textNorm)) return true;
  return false;
}

/**
 * Elimina las oraciones que declaran falsamente inviable el cultivo `bandBase`,
 * para que la corrección no quede sobre una autocontradicción. Quirúrgico por
 * oración: borra las que mencionan el cultivo Y disparan la negación de
 * viabilidad. Conserva el resto.
 */
function _stripFalseInviability(originalText, bandBases) {
  const sentences = _splitSentences(originalText);
  const kept = sentences.filter((sentence) => {
    const sNorm = _stripDiacritics(sentence);
    for (const base of bandBases) {
      if (sNorm.includes(base) && FALSE_INVIABILITY_RE.test(sNorm)) return false;
    }
    return true;
  });
  return kept.join('').trim();
}

/**
 * _bandBasesGroundedInviable — devuelve el Set de bases de cultivo (de
 * `KNOWN_VIABLE_BANDS`) que el GROUNDING marca autoritativamente inviables a la
 * altitud de la finca. Veredicto idéntico al de `guardInvertedViability`: 1)
 * campo `viabilidad:'inviable'`; 2) banda de altitud que excluye la altura (con
 * el margen de 300 m de zona-gris → fuera de ese margen es inviable). Solo así
 * `guardFalseInviability` cede al grafo y no afirma viabilidad contra una
 * inviabilidad REAL resuelta por la AGE.
 *
 * @param {Array<object>|null} entities
 * @param {number} alt  altitud de la finca (msnm), ya validada como finita.
 * @returns {Set<string>}  bases ("papa", "fresa", …) groundeadas inviables.
 */
function _bandBasesGroundedInviable(entities, alt) {
  const out = new Set();
  if (!Array.isArray(entities) || entities.length === 0) return out;
  for (const e of entities) {
    if (!_isSpecies(e)) continue;
    const nombreNorm = _stripDiacritics(_entityName(e));
    const binomialNorm = _binomial(e.nombre_cientifico || e.nombre_científico);
    const band = _knownViableBand(nombreNorm, binomialNorm);
    if (!band) continue;
    // Veredicto autoritativo (mismo que guardInvertedViability).
    let nivel = _normViabilidad(e.viabilidad);
    if (!nivel) {
      const hasMin = e.altitud_min != null && e.altitud_min !== '';
      const hasMax = e.altitud_max != null && e.altitud_max !== '';
      const min = hasMin ? Number(e.altitud_min) : NaN;
      const max = hasMax ? Number(e.altitud_max) : NaN;
      if (!Number.isFinite(min) || !Number.isFinite(max)) continue;
      if (alt >= min && alt <= max) nivel = 'viable';
      else {
        const fuera = alt < min ? min - alt : alt - max;
        nivel = fuera <= 300 ? 'marginal' : 'inviable';
      }
    }
    if (nivel === 'inviable') out.add(band.base);
  }
  return out;
}

/**
 * guardFalseInviability — #350. Detector de FALSO-NEGATIVO de viabilidad. Si la
 * respuesta declara INVIABLE un cultivo de banda conocida (papa, fresa, …) a una
 * altitud de finca que SÍ cae en su banda viable, ANTEPONE una corrección
 * afirmando que el cultivo sí es viable a esa altura y ELIMINA la afirmación
 * falsa de inviabilidad. Conservador: solo cultivos de `KNOWN_VIABLE_BANDS` y
 * solo cuando la altitud está dentro de la banda (papa a 3500 m → no corrige;
 * fuera de banda la inviabilidad puede ser legítima).
 *
 * Necesita la altitud de la finca para saber si está dentro de la banda. Sin
 * altitud → no-op (no podemos afirmar viabilidad sin saber la altura). Encaja en
 * la firma estándar `(text, entities, altitud)` → puede ir en GUARD_CHAIN, pero
 * solo debe correr en consultas de SIEMBRA (es un guard de siembra), por eso se
 * agrega a PLANTING_GUARDS.
 *
 * PRECEDENCIA — RED DE SEGURIDAD, NO autoridad sobre el grounding (clave #350):
 * el bug ocurre cuando NLU abortó y NO hubo grounding (el LLM inventó la
 * inviabilidad). Si el grounding SÍ trae un veredicto AUTORITATIVO de inviable
 * para ese mismo cultivo (campo `viabilidad:'inviable'` o banda de altitud que
 * EXCLUYE la altura de la finca), la AGE manda: NO sobreescribimos su veredicto
 * con la tabla hardcodeada. La tabla solo afirma viabilidad cuando el grounding
 * NO contradice — así jamás pisa una inviabilidad real resuelta por el grafo.
 *
 * @param {string} responseText
 * @param {Array<object>|null} resolvedEntities  grounding del turno (para deferir
 *   a un veredicto autoritativo de inviable si lo hay).
 * @param {number|string|null} fincaAltitud
 * @returns {{text:string, modified:boolean, reason:string|null}}
 */
export function guardFalseInviability(responseText, resolvedEntities = null, fincaAltitud = null) {
  if (typeof responseText !== 'string' || responseText.length === 0) {
    return { text: responseText ?? '', modified: false, reason: null };
  }
  const alt = Number(fincaAltitud);
  const haveAlt = fincaAltitud != null && fincaAltitud !== '' && Number.isFinite(alt);
  if (!haveAlt) return { text: responseText, modified: false, reason: null };

  const norm = _stripDiacritics(responseText);
  const corregidos = [];
  const basesDisparadas = [];
  // Bases de cultivo que el grounding marcó AUTORITATIVAMENTE inviables: la AGE
  // manda sobre la tabla hardcodeada (no afirmamos viabilidad contra el grafo).
  const groundedInviable = _bandBasesGroundedInviable(resolvedEntities, alt);

  for (const band of KNOWN_VIABLE_BANDS) {
    // Solo nos importa cuando la altitud de la finca está DENTRO de la banda
    // viable: ahí una afirmación de inviabilidad es FALSA. Fuera de banda
    // (papa a 3500 m) la inviabilidad puede ser legítima → no tocamos.
    if (alt < band.min || alt > band.max) continue;
    // Si el grounding tiene un veredicto autoritativo de inviable para este
    // cultivo, la AGE manda: NO lo corregimos a viable (no es el bug #350, que es
    // el caso SIN grounding / inviabilidad inventada por el LLM).
    if (groundedInviable.has(band.base)) continue;
    if (!norm.includes(band.base)) continue;
    if (!_declaraInviable(norm, band.base)) continue;
    if (basesDisparadas.includes(band.base)) continue;
    basesDisparadas.push(band.base);
    corregidos.push(band.base);
  }

  if (corregidos.length === 0) {
    return { text: responseText, modified: false, reason: null };
  }

  bumpGuardTelemetry('false_inviability');
  const lista = corregidos.join(' y ');
  const correccion =
    `Corrección importante: ${lista} SÍ es viable en tu finca a ${alt} msnm — es una altura templada donde ` +
    `este cultivo se da bien (de hecho es zona de cultivo tradicional). No te desanimes ni cambies de cultivo ` +
    `por una altura que sí le sirve; si quieres te doy variedades adaptadas a tu zona y el manejo para que ` +
    `rinda.`;
  const restoLimpio = _stripFalseInviability(responseText, corregidos);
  const text = restoLimpio ? `${correccion}\n\n${restoLimpio}` : correccion;
  return { text, modified: true, reason: `viabilidad_falso_negativo: ${corregidos.join(', ')}` };
}

/**
 * Set de guards que SOLO tienen sentido cuando la consulta es de SIEMBRA
 * (A12). Si la pregunta del usuario es de PRECIO/MERCADO (o info general sin
 * verbo de siembra), estos NO corren: razonan sobre viabilidad/identidad de
 * cultivo, irrelevante para "¿a cómo está la papa?". Causa raíz del bug prod
 * 2026-06-02 (cascada de "NO es viable a 1923 msnm" sobre una query de precio).
 *
 * Los guards de SAFETY/inofensivos (dosis, agroquímico, visión-sin-foto,
 * nombre-inventado) corren SIEMPRE: nunca dependen de que sea una consulta de
 * siembra.
 */
const PLANTING_GUARDS = new Set([
  guardSpeciesSubstitution,
  guardCompanionBinomial,
  guardInvasiveSpecies,
  guardInvertedViability,
  guardFalseInviability,
]);

/**
 * Cadena ordenada de guards. El agroquímico va primero (lo más urgente:
 * SAFETY), luego invasoras, viabilidad y por último la suavización de dosis.
 */
const GUARD_CHAIN = [
  // Sustitución de especie va PRIMERO: si el modelo confundió el cultivo
  // (lulo→curuba), corregir la identidad ANTES que cualquier otro guard, para
  // que la corrección lidere y los demás guards no razonen sobre la especie
  // equivocada. Solo añade una corrección al frente; no altera el resto.
  guardSpeciesSubstitution,
  // Tras corregir el cultivo principal, validar también los binomios de las
  // especies RELACIONADAS (companions/antagonists/alternativas) contra su propio
  // grounding. Caso prod: "Nogal andino (Quercus molinae)" siendo el antagonist
  // Nogal andino = Juglans neotropica. Solo añade correcciones al frente.
  guardCompanionBinomial,
  // El de dosis va antes que el agroquímico en detección: el guard agroquímico
  // anexa un bloque que menciona "etiqueta" (cita de fuente), lo que apagaría
  // la suavización de dosis si corriera después. Correr dosis primero evita ese
  // enmascaramiento. El orden de detección no cambia la urgencia: el bloque
  // agroquímico igual se anexa al final del texto.
  guardDoseWithoutSource,
  guardSyntheticAgrochemical,
  guardInvasiveSpecies,
  guardInvertedViability,
  // #350 — FALSO-NEGATIVO de viabilidad: el modelo declaró inviable un cultivo de
  // banda conocida (papa/fresa) a una altitud que SÍ le sirve. Va DESPUÉS de
  // invertedViability (que corrige el caso opuesto, inviable autoritativo
  // promovido como viable). Solo corre en consultas de siembra (PLANTING_GUARDS).
  guardFalseInviability,
];

/**
 * applyOutputGuards — encadena todas las guardas deterministas sobre la salida
 * del LLM. PURA y SÍNCRONA, idempotente en la práctica (cada guard chequea que
 * su corrección no esté ya aplicada). Va en AgentScreen tras stripRoleLeak +
 * applyVoseoFilter, ANTES de mostrar/persistir/hablar el texto.
 *
 * @param {string} responseText  texto del LLM (ya pos-voseo / pos-roleLeak).
 * @param {object} [ctx]
 * @param {Array<object>|null} [ctx.resolvedEntities] — grounding AGE del turno.
 * @param {number|string|null} [ctx.fincaAltitud] — msnm de la finca activa.
 * @param {boolean} [ctx.hadVision=false] — ¿hubo una imagen real (item foto /
 *   analyzeFoliage corrido) en ESTE turno? Sin esto el guard de visión asume
 *   que NO hubo foto y corrige cualquier diagnóstico visual fabricado.
 * @param {number|null} [ctx.visionConfidence=null] — confianza de analyzeFoliage
 *   (para suavizar hallazgos detallados cuando la visión no fue concluyente).
 * @param {string|null} [ctx.profileName] — nombre del usuario (getProfile().nombre)
 *   para el guard de nombre inventado. Si falta, cualquier saludo con nombre se remueve.
 * @param {number|null} [ctx.forecastTempMin] — mínima esperada del pronóstico (°C),
 *   derivada de climaSnapshot.openmeteo.forecast_7d. Habilita el guard térmico
 *   (riesgo de helada). Sin esto, el guard térmico es no-op.
 * @param {number|null} [ctx.forecastTempMax] — máxima esperada del pronóstico (°C)
 *   para el riesgo de golpe de calor. Mismo origen.
 * @param {string|null} [ctx.userMessage] — pregunta cruda del usuario (A12). Si
 *   es claramente de PRECIO/MERCADO (no de siembra), los guards de SIEMBRA
 *   (viabilidad/térmico/sustitución/companion/invasora/falso-negativo) NO corren
 *   —razonan sobre cultivo y son irrelevantes a "¿a cómo está la papa?". Los de
 *   SAFETY (dosis, agroquímico, visión-sin-foto, nombre-inventado) corren igual.
 *   Además habilita el guard de DOMINIO (#352, declina off-domain física/química/
 *   matemáticas) y el anti-diagnóstico-a-ciegas (#348, pide foto/datos ante
 *   "manchas en el tomate" sin imagen). Sin esto, o ante intención ambigua, los
 *   guards de siembra corren (conservador, no rompe la protección).
 * @returns {{text:string, modified:boolean, reasons:string[]}}
 */
export function applyOutputGuards(
  responseText,
  {
    resolvedEntities = null,
    fincaAltitud = null,
    hadVision = false,
    visionConfidence = null,
    profileName = null,
    forecastTempMin = null,
    forecastTempMax = null,
    userMessage = null,
  } = {},
) {
  if (typeof responseText !== 'string' || responseText.length === 0) {
    return { text: responseText ?? '', modified: false, reasons: [] };
  }
  // R2: descarta entidades-ruido NLU ("aquí", "don", "pasto") ANTES de los
  // guards para no razonar sobre palabras campesinas mal resueltas a especie.
  const entities = filterNoiseEntities(resolvedEntities);
  // A12: ¿es una consulta de SIEMBRA? Si es de PRECIO/MERCADO no corremos los
  // guards de siembra (viabilidad/térmico/sustitución/companion/invasora) — solo
  // los de SAFETY. Conservador: sin userMessage o ante duda, corren todos.
  const runPlantingGuards = shouldRunPlantingGuards(userMessage);
  let text = responseText;
  let modified = false;
  const reasons = [];

  // GUARD de DOMINIO el más PRIMERO (#352): si la pregunta es off-domain
  // (física/química/matemáticas) y el modelo entró a contestarla, REEMPLAZAMOS la
  // respuesta entera por una declinación amable. No tiene sentido correr ningún
  // otro guard sobre un texto que se va a reemplazar. Firma propia (necesita
  // userMessage), por eso va fuera de GUARD_CHAIN. No-op si la query es agro.
  const offDom = guardOffDomain(text, { userMessage });
  if (offDom && offDom.modified) {
    // Respuesta off-domain reemplazada: no corremos más guards sobre la
    // declinación (no hay cultivo/entidad que razonar).
    return { text: offDom.text, modified: true, reasons: offDom.reason ? [offDom.reason] : [] };
  }

  // GUARD de visión PRIMERO: si la respuesta afirma un diagnóstico visual sin
  // foto real en el turno, no tiene sentido correr los demás guards sobre un
  // texto que vamos a reemplazar entero. Firma propia (contexto de visión), por
  // eso va fuera de GUARD_CHAIN.
  const vis = guardVisionWithoutPhoto(text, { hadVision, visionConfidence });
  if (vis && vis.modified) {
    text = vis.text;
    modified = true;
    if (vis.reason) reasons.push(vis.reason);
  }

  // GUARD anti-diagnóstico-a-ciegas (#348): si la pregunta pide diagnóstico de
  // síntomas ("manchas en el tomate") SIN foto y la respuesta enumera candidatos
  // de patógeno, ANTEPONE la petición de foto/datos. Va tras el guard de visión
  // (que cubre el caso distinto de afirmar haber VISTO una foto). Firma propia
  // (userMessage + hadVision). Solo actúa si el de visión no reemplazó ya el texto.
  if (!(vis && vis.modified)) {
    const dx = guardDiagnosisWithoutPhoto(text, { userMessage, hadVision });
    if (dx && dx.modified) {
      text = dx.text;
      modified = true;
      if (dx.reason) reasons.push(dx.reason);
    }
  }

  for (const guard of GUARD_CHAIN) {
    // A12: salta los guards de SIEMBRA cuando la consulta no es de siembra
    // (precio/mercado). Los de SAFETY/inofensivos NO están en PLANTING_GUARDS y
    // corren siempre.
    if (!runPlantingGuards && PLANTING_GUARDS.has(guard)) continue;
    const res = guard(text, entities, fincaAltitud);
    if (res && res.modified) {
      text = res.text;
      modified = true;
      if (res.reason) reasons.push(res.reason);
    }
  }
  // Guard TÉRMICO (audit #23): tras viabilidad por altitud, advierte riesgo de
  // helada / golpe de calor cruzando temp_min/temp_max de la especie (grounding)
  // contra la temp del PRONÓSTICO (ctx). Va después de la cadena (después de
  // viabilidad) y antes de inventedName. Firma propia porque la cadena estándar
  // no transporta la temp del pronóstico. No-op si no hay forecastTemp.
  // A12: es un guard de SIEMBRA → no corre en consultas de precio/mercado.
  if (runPlantingGuards) {
    const thermalRes = guardThermalViability(text, entities, fincaAltitud, {
      forecastTempMin,
      forecastTempMax,
    });
    if (thermalRes && thermalRes.modified) {
      text = thermalRes.text;
      modified = true;
      if (thermalRes.reason) reasons.push(thermalRes.reason);
    }
  }
  // Guard de nombre inventado: firma propia (necesita el nombre del perfil).
  const nameRes = guardInventedName(text, { profileName });
  if (nameRes && nameRes.modified) {
    text = nameRes.text;
    modified = true;
    if (nameRes.reason) reasons.push(nameRes.reason);
  }
  // Guard de claims de salud sobre fermentos (DR-FOOD-3, SAFETY): firma propia
  // (necesita userMessage para el gate de intención-fermento). Corre SIEMPRE
  // (no es guard de siembra) pero solo actúa si la respuesta/pregunta tocan un
  // fermento. Fail-safe: ante un claim de salud, redirige a la frase segura.
  const fermRes = guardFermentoHealthClaim(text, { userMessage });
  if (fermRes && fermRes.modified) {
    text = fermRes.text;
    modified = true;
    if (fermRes.reason) reasons.push(fermRes.reason);
  }
  // Guard de reforestación con invasora-combustible (DR-RESTAURACION-INCENDIOS,
  // SAFETY ecológica): firma propia (necesita userMessage para el gate de
  // intención-restauración). Corre SIEMPRE pero solo actúa si la pregunta es de
  // reforestación/restauración Y la respuesta nombra una especie invasora-
  // combustible. Fail-safe: ADVIERTE que no se recomienda para restauración (no
  // la borra). Determinístico (lista hardcodeada), no depende del grounding.
  const reforestRes = guardReforestacionInvasora(text, { userMessage });
  if (reforestRes && reforestRes.modified) {
    text = reforestRes.text;
    modified = true;
    if (reforestRes.reason) reasons.push(reforestRes.reason);
  }
  // Guard POSITIVO de reforestación (DR-RESTAURACION-INCENDIOS): firma propia
  // (necesita userMessage para el gate de intención-restauración). Complementa al
  // de invasoras: cuando la pregunta es de reforestación/restauración y la
  // respuesta no da ya nativas con rol, SUGIERE nativas agrupadas por su papel
  // (pioneras, fijadoras de N, cortafuego, ancla por rebrote). Va al final para
  // que su nota quede después de cualquier advertencia de invasora. Determinístico
  // (lista hardcodeada), no depende del grounding.
  const reforestNativasRes = guardReforestacionNativasRol(text, { userMessage });
  if (reforestNativasRes && reforestNativasRes.modified) {
    text = reforestNativasRes.text;
    modified = true;
    if (reforestNativasRes.reason) reasons.push(reforestNativasRes.reason);
  }
  return { text, modified, reasons };
}

// ── GUARD ASYNC: auto-validación taxonómica (A24) ───────────────────────────

/**
 * _groundedBinomialsFromAll — universo COMPLETO de binomios canónicos ya
 * conocidos del grounding: el de cada entidad resuelta, MÁS los anidados en
 * companions / antagonists / alternativas / pest_controllers. Cualquier
 * binomio presente en este set NO necesita validación externa (ya fue resuelto
 * por la capa 1 / guards 5 y 5b).
 *
 * Reutiliza `_binomial` y `_groundedBinomials` que ya existen en el módulo.
 * Se define aquí para el guard A24 (separado para legibilidad).
 *
 * @param {Array<object>|null} entities
 * @returns {Set<string>}
 */
function _groundedBinomialsForTaxonomy(entities) {
  if (!Array.isArray(entities) || entities.length === 0) return new Set();
  return _groundedBinomials(entities);
}

/**
 * _extractUngroundedBinomials — extrae los binomios Linneanos del texto que
 * NO están ya en el conjunto de binomios grounded del turno. Estos son los
 * candidatos a validar con `validate_taxonomy`.
 *
 * Aplica el mismo filtro anti-prosa que los guards 5/5b: usa
 * `_looksLikeLatinBinomial` para descartar pares del español ("Sin embargo",
 * "Estos cultivos"). Devuelve un array de binomios canónicos únicos
 * (normalizado en minúsculas, "genus epiteto").
 *
 * @param {string} text
 * @param {Set<string>} groundedSet
 * @returns {Array<{raw:string, canonical:string}>}
 */
function _extractUngroundedBinomials(text, groundedSet) {
  const seen = new Set();
  const out = [];
  let m;
  SCI_BINOMIAL_RE.lastIndex = 0;
  while ((m = SCI_BINOMIAL_RE.exec(text)) !== null) {
    if (!_looksLikeLatinBinomial(m[1], m[2])) continue;
    const raw = `${m[1]} ${m[2]}`;
    const canonical = _binomial(raw);
    if (!canonical) continue;
    if (groundedSet.has(canonical)) continue; // ya grounded → saltar
    if (seen.has(canonical)) continue; // dedup
    seen.add(canonical);
    out.push({ raw, canonical });
  }
  return out;
}

/**
 * applyTaxonomyGuard — capa post-proceso ASYNC anti-alucinación taxonómica
 * (A24). Extrae los binomios Linneanos que el LLM incluyó en su respuesta y
 * que NO están cubiertos por el grounding del turno (resolvedEntities ya
 * resueltos por la capa 1 / guards 5/5b). Para cada uno llama al tool
 * `validate_taxonomy` del sidecar (vía la función `callTool` inyectada) y, si
 * el tool confirma que el binomio NO existe en el catálogo Chagra, ANEXA una
 * nota honesta al final de la respuesta.
 *
 * Diseño conservador (anti-falsos-positivos):
 *  - Solo corrige binomios que el tool confirme EXPLÍCITAMENTE como inválidos
 *    (`valid: false`). Si el tool devuelve null (caído/timeout/offline) → no-op.
 *  - Los binomios ya en el grounding (resolvedEntities + companions/alternativas)
 *    no se validan (ya cubiertos por guards 5/5b — sin duplicar correcciones).
 *  - Idempotente: si la corrección ya está en el texto, no re-dispara.
 *  - Pares de prosa española capitalizada ("Sin embargo", "Estos cultivos") se
 *    descartan con el mismo filtro de los guards 5/5b.
 *
 * Firma:
 * @param {string} responseText  respuesta post-`applyOutputGuards` del LLM.
 * @param {object} [opts]
 * @param {Function|null} [opts.callTool]  función `callTool` del sidecarClient
 *   inyectada por el caller (AgentScreen). Si falta → no-op graceful.
 * @param {Array<object>|null} [opts.resolvedEntities]  grounding del turno.
 * @returns {Promise<{text:string, modified:boolean, reason:string|null}>}
 */
export async function applyTaxonomyGuard(
  responseText,
  { callTool: _callTool = null, resolvedEntities = null } = {},
) {
  // Entrada inválida → no-op graceful.
  if (typeof responseText !== 'string' || responseText.length === 0) {
    return { text: responseText ?? '', modified: false, reason: null };
  }
  // Sin callTool inyectado (flag off, no wired, etc.) → no-op.
  if (typeof _callTool !== 'function') {
    return { text: responseText, modified: false, reason: null };
  }

  // Universo de binomios ya grounded → no los re-validamos.
  const grounded = _groundedBinomialsForTaxonomy(resolvedEntities);

  // Extrae binomios no-grounded del texto.
  const candidates = _extractUngroundedBinomials(responseText, grounded);
  if (candidates.length === 0) {
    return { text: responseText, modified: false, reason: null };
  }

  // Para cada candidato, llama validate_taxonomy. Ejecuta en paralelo para
  // minimizar latencia (cada llamada tiene timeout de 5s en sidecarClient).
  const results = await Promise.all(
    candidates.map(async ({ raw, canonical }) => {
      try {
        const res = await _callTool('validate_taxonomy', {
          species_scientific: raw,
        });
        return { raw, canonical, res };
      } catch (_) {
        return { raw, canonical, res: null };
      }
    }),
  );

  // Filtra los que el tool confirmó como INVÁLIDOS (valid: false).
  const invalid = results.filter(
    ({ res }) => res && typeof res === 'object' && res.valid === false,
  );

  if (invalid.length === 0) {
    return { text: responseText, modified: false, reason: null };
  }

  // Idempotencia: construye la nota de corrección solo para los inválidos que
  // aún no tienen una nota en el texto. Marca textual: "no se encontró en el
  // catálogo Chagra" + el binomio.
  const nuevas = invalid.filter(
    ({ raw }) =>
      !responseText.includes(
        `"${raw}" no se encontró en el catálogo Chagra`,
      ),
  );

  if (nuevas.length === 0) {
    return { text: responseText, modified: false, reason: null };
  }

  bumpGuardTelemetry('auto_taxonomy');

  const notas = nuevas.map(
    ({ raw }) =>
      `Nota taxonómica: el binomio "${raw}" no se encontró en el catálogo Chagra — puede ser un nombre ` +
      `incorrecto o una especie no catalogada. Verifica el nombre científico con una fuente confiable ` +
      `(ICA, Agrosavia, Tropicos) antes de usarlo como referencia.`,
  );

  const text = `${responseText.trim()}\n\n${notas.join('\n\n')}`;
  return {
    text,
    modified: true,
    reason: `taxonomía_no_catálogo: ${nuevas.map(({ raw }) => raw).join(', ')}`,
  };
}
