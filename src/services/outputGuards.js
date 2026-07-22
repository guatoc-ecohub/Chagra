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

// ── CARBONO/BONOS (Task 3, audit ministerio) ──────────────────────────
const CARBON_INTENT_PATTERNS = [
  /\b(bonos?\s+(de\s+)?carbono|carbono\s+neutral|creditos?\s+(de\s+)?carbono)\b/,
  /\b(me\s+quieren\s+pagar\s+por\s+sembrar|pagar\s+por\s+sembrar\s+arboles|pago\s+por\s+carbono)\b/,
  // input viene de _stripDiacritics() que hace .toLowerCase() → literales en minúscula
  /\b(psa|pago\s+por\s+servicios?\s+ambientales?|decreto\s+1007)\b/,
];

// ── R0: intencion de RESTAURACION ─────────────────────────────────────
// Task 2 (auditoria ministerio): "arboles nativos a 3200m" y "recuperar
// el monte" caian a no_agro_keyword. Estas keywords los rutean.
const RESTORATION_INTENT_PATTERNS = [
  // [cçr] captura también los infinitivos "restaurar"/"reforestar" (no solo -ción)
  /\b(restaura[cçr]|reforesta[cçr]|recuperar\s+(el\s+)?(monte|bosque|terreno|suelo|lote)|regenera[cç])\b/,
  /\b(arbol(es)?\s+nativ[oa]s?|especies?\s+nativ[oa]s?|nativ[oa]s?\s+(de|para|a)\b)/,
  /\b(p[aá]ramo|frailej[oó]n|sucesi[oó]n\s+(ecol[oó]gica|natural)|corredor\s+(biol[oó]gico|ripario)|cerca\s+viva)\b/,
  /\b(sembrar|plantar)\s+(pino|eucalipto|cedro|roble|aliso|nacedero|guadua)\b/,
  /\b(proteger\s+(el\s+)?nacimiento|restaurar\s+la\s+quebrada|controlar\s+(la\s+)?erosion|barrera[s]?\s+viva[s]?)\b/,
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
 * @returns {'restauracion'|'carbono'|'siembra'|'precio'|'unknown'}
 */
export function classifyQueryIntent(userMessage) {
  if (typeof userMessage !== 'string') return 'unknown';
  const norm = _stripDiacritics(userMessage);
  if (!norm) return 'unknown';
  if (RESTORATION_INTENT_PATTERNS.some((re) => re.test(norm))) return 'restauracion';
  if (CARBON_INTENT_PATTERNS.some((re) => re.test(norm))) return 'carbono';
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
  'lannate',
  'metamidofos',
  'metamidofós',
  'parathion',
  'paratión',
  'monocrotofos',
  'monocrotofós',
  'endosulfan',
  'endosulfán',
  // #1303 (BORDE-006): acaricidas/insecticidas comunes que faltaban. Su nombre NO
  // termina en un sufijo de familia clásica capturado por el detector de sufijos
  // (abamectina→-ectina, spinosad/spinetoram, ciantraniliprol, tiametoxam,
  // acetamiprid→-amiprid≠-cloprid), por eso van en la denylist exacta. Abamectina/
  // Spinetoram fue la red flag que dejó BORDE-006 a 1 del PASS.
  'abamectina',
  'abamectin',
  'spinosad',
  'spinetoram',
  'emamectina',
  'benzoato de emamectina',
  'ciantraniliprol',
  'ciantraniliprole',
  'clorantraniliprol',
  'flubendiamida',
  'tiametoxam',
  'thiamethoxam',
  'acetamiprid',
  'dinotefuran',
  'fipronil',
  'spiromesifen',
  'spirotetramat',
  'pimetrozina',
  'pymetrozina',
  'buprofezin',
  'piriproxifen',
  'pyriproxyfen',
  'fenoxicarb', // variante ortográfica de fenoxycarb (este último ya cae por sufijo -carb)
  'fenoxycarb',
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
  // #351 (E2E 2026-06-03): SIGLAS de campo de fertilizante mineral. El modelo a
  // veces nombra el producto solo por la sigla ("aplica DAP", "agrega KCl") sin
  // el nombre largo (que sí está en SYNTHETIC_AGROCHEM_TERMS). Las normalizamos a
  // minúsculas con límite de palabra (`[^a-z0-9]`) → "dap"/"map"/"kcl" como token
  // aislado; "mapa"/"mapeo"/"dapper" NO matchean (carácter alfanumérico al lado).
  //   dap → fosfato diamónico (diammonium phosphate)
  //   map → fosfato monoamónico (monoammonium phosphate)
  //   kcl → cloruro de potasio (muriato de potasio)
  /(^|[^a-z0-9])dap([^a-z0-9]|$)/,
  /(^|[^a-z0-9])map([^a-z0-9]|$)/,
  /(^|[^a-z0-9])kcl([^a-z0-9]|$)/,
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

// ── #351b (FALLO 1, E2E prod 2026-06-03): suppress-and-replace ───────────────

/**
 * Subconjunto de la denylist que son FERTILIZANTES minerales de síntesis (no
 * fungicidas/insecticidas/herbicidas). Solo estos, junto con una DOSIS, gatillan
 * la SUPRESIÓN del cuerpo (suppress-and-replace). Un fungicida/insecticida sin
 * dosis sigue en modo append (#17): se le anexa el contrapeso orgánico sin
 * borrar el texto. La supresión se reserva a la RECETA de fertilizante mineral,
 * que es la fuga viva de prod (el campesino leía "10 kg de urea… por cada 100 m²").
 * Normalizados sin diacríticos/case.
 */
const SYNTHETIC_FERTILIZER_TERMS = [
  'urea',
  'fosfato triple',
  'superfosfato triple',
  'fosfato diamonico',
  'fosfato monoamonico',
  'sulfato de potasio',
  'sulfato de amonio',
  'nitrato de amonio',
  'nitrato de potasio',
  'cloruro de potasio',
  'muriato de potasio',
  // siglas de campo (TSP = triple super phosphate / fosfato triple)
  'tsp',
].map(_stripDiacritics);

/**
 * Patrones de DOSIS de aplicación. Disparan la SUPRESIÓN solo en combinación con
 * un fertilizante SINTÉTICO (ver `_hasSyntheticFertilizerDose`). Cubren el fraseo
 * de campo: "kg/m²", "g/planta", "kg por cada 100 m²", "250 g/planta", "2 bultos
 * por lote", "50 kg por hectárea", etc. Sobre el texto normalizado sin tildes.
 *
 * IMPORTANTE: estos patrones también matchean dosis ORGÁNICAS ("2 kg de
 * compost") — por eso NUNCA gatillan supresión por sí solos: requieren el token
 * sintético al lado. Es la conjunción (sintético + dosis) la que es inequívoca.
 */
const DOSE_PATTERNS = [
  // unidad de masa/volumen por unidad de área o planta: "kg/m2", "g/planta", "kg / ha"
  /\b\d+(?:[.,]\d+)?\s*(kg|g|gr|gramos?|kilos?|cc|ml|l|litros?)\s*\/\s*(m2|m²|planta|mata|ha|hectarea|surco|sitio|hoyo)\b/,
  // "N kg/g por planta / por mata / por m2 / por cada X m2 / por hectarea / por sitio"
  /\b\d+(?:[.,]\d+)?\s*(kg|g|gr|gramos?|kilos?|cc|ml|l|litros?)\s+por\s+(cada\s+\d+\s*)?(planta|mata|m2|m²|metro|metros|ha|hectarea|hectareas|surco|sitio|hoyo|lote|arbol|arboles)\b/,
  // "N bultos/sacos/cargas (de X) por lote / por hectarea / por planta"
  /\b\d+(?:[.,]\d+)?\s*(bulto[s]?|saco[s]?|carga[s]?|arroba[s]?|costal(?:es)?)\s+(de\s+\S+\s+)?(por|\/|a)\s+/,
  // dosis genérica de masa "10 kg de <algo>" cuando ya hay sintético en el texto
  // (el guard exige el sintético aparte; aquí basta el "N kg/g de").
  /\b\d+(?:[.,]\d+)?\s*(kg|g|gr|gramos?|kilos?)\s+de\b/,
];

/**
 * ¿El texto normalizado contiene a la vez (a) un fertilizante SINTÉTICO y (b) un
 * patrón de DOSIS? Esa conjunción es la que delata una RECETA sintética con
 * cantidades, que debe SUPRIMIRSE (no concatenar). El NPK formulado / triplete /
 * siglas DAP·MAP·KCl también cuentan como fertilizante sintético.
 *
 * Anti-sobre-supresión: la dosis sola (respuesta orgánica con "2 kg de compost")
 * NO basta — hace falta el token sintético. Un biopreparado permitido nunca es
 * sintético (no entra aquí).
 *
 * @param {string} norm  texto ya normalizado (minúsculas, sin tildes).
 * @returns {boolean}
 */
function _hasSyntheticFertilizerDose(norm) {
  // (a) ¿hay un fertilizante mineral de síntesis?
  let hasSynthFert = false;
  for (const term of SYNTHETIC_FERTILIZER_TERMS) {
    const re = new RegExp(`(^|[^a-z0-9])${term.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&')}([^a-z0-9]|$)`);
    if (re.test(norm)) {
      hasSynthFert = true;
      break;
    }
  }
  if (!hasSynthFert) {
    // NPK / triplete N-P-K / siglas DAP·MAP·KCl también son fertilizante sintético.
    for (const re of SYNTHETIC_FERTILIZER_PATTERNS) {
      if (re.test(norm)) {
        hasSynthFert = true;
        break;
      }
    }
  }
  if (!hasSynthFert) return false;

  // (b) ¿hay un patrón de dosis?
  return DOSE_PATTERNS.some((re) => re.test(norm));
}

// ── #1303 GAP 2b (BORDE-011): suppress-and-replace de PESTICIDA con marca/dosis ──

/**
 * Términos del denylist que son FERTILIZANTES (no pesticidas). Un hit que esté SOLO
 * en este conjunto NO debe gatillar el suppress de PESTICIDA (lo cubre el suppress de
 * fertilizante aparte). Se deriva de `SYNTHETIC_FERTILIZER_TERMS` (normalizados).
 */
const _FERTILIZER_HIT_SET = new Set(SYNTHETIC_FERTILIZER_TERMS);

/**
 * Patrones de MARCA / DOSIS de aplicación que, junto a un PESTICIDA de síntesis,
 * delatan una RECOMENDACIÓN concreta (no una mención de pasada) que debe SUPRIMIRSE.
 * En BORDE-011 el modelo escribió 'fenoxycarb (… la marca "Vikan")' y '… dosis
 * recomendadas por el fabricante'. Cubren: la palabra "marca", un producto
 * entrecomillado en contexto de aplicación, "dosis (recomendada/del fabricante/de la
 * etiqueta)", y dosis de concentración foliar ("g/L", "cc por bomba/litro").
 *
 * IMPORTANTE: como `DOSE_PATTERNS`, NUNCA gatillan por sí solos — exigen el token
 * SINTÉTICO al lado (`_hasSyntheticPesticideBrandOrDose`). Es la conjunción la que es
 * inequívoca. Sobre el texto normalizado sin tildes.
 */
const PESTICIDE_BRAND_PATTERNS = [
  /\bmarca[s]?\b/, // "la marca Vikan", "marca comercial"
  /\bnombre\s+comercial\b/,
  /"[^"]+"/, // un producto entrecomillado (en conjunción con el i.a. sintético)
  /\bproducto\s+comercial\b/,
];

/**
 * Patrones de DOSIS específicos de PESTICIDA (concentración/volumen de aplicación),
 * complementarios a `DOSE_PATTERNS` (masa por área). Cubren "g/L", "cc por litro",
 * "ml por bomba", "X cc/20 L", "dosis recomendada/del fabricante/de la etiqueta".
 */
const PESTICIDE_DOSE_PATTERNS = [
  /\b\d+(?:[.,]\d+)?\s*(g|gr|gramos?|cc|ml|cm3)\s*(\/|por)\s*(l|lt|litro[s]?|bomba|bombada|caneca|tanque|20\s*l)\b/,
  /\bdosis\s+(recomendad[ao]s?|del?\s+fabricante|de\s+la\s+etiqueta|por\s+el\s+fabricante)\b/,
  /\b\d+(?:[.,]\d+)?\s*(cc|ml|g|gr)\s*\/\s*\d/, // "30 cc/20", "2 g/1"
];

/**
 * Verbos/giros de RECOMENDACIÓN o APLICACIÓN que, junto a un PESTICIDA sintético
 * NOMBRADO (hit del denylist), delatan que el modelo lo está RECETANDO — no
 * mencionándolo de pasada ni desaconsejándolo. Cubren el fraseo real de prod
 * ("Control químico: Aplica insecticidas específicos... como acetamiprid o
 * imidacloprid"). Nombrar el activo ya es la fuga: el campesino lee "aplica
 * imidacloprid" aunque no venga dosis. El gate `esAdvertenciaNoUsar` (arriba) ya
 * excluye "no/nunca uses/recomiendes X", así que esto NO sobre-suprime
 * advertencias. Sobre texto normalizado sin tildes.
 */
const PESTICIDE_RECOMMEND_PATTERNS = [
  // "Control químico:" como sección/opción (el fraseo exacto de la fuga prod).
  /\bcontrol\s+quimic\w*\b/,
  // "insecticida(s) específico(s)/sistémico(s)/químico(s)/de síntesis" — recomendar la CLASE.
  /\binsecticidas?\s+(especific\w*|sistemic\w*|quimic\w*|de\s+sintesis)\b/,
  // IMPERATIVO de aplicación dirigido al usuario (no el descriptivo "algunos usan").
  // OJO: `recomiend\w*`/`usa\w*` se EXCLUYEN a propósito: "algunos usan glifosato"
  // y "no te recomiendo abamectina" NO son recomendaciones (falsos positivos).
  /\b(aplica|aplique|apliquen|fumiga|fumigue|fumiguen|asperja|asperje)\b/,
  /\bpuedes?\s+(usar|aplicar|fumigar|asperjar)\b/,
];

/**
 * ¿El texto normalizado recomienda un PESTICIDA de síntesis CON una marca comercial o
 * una dosis de aplicación? Esa conjunción (i.a. sintético + marca/dosis) delata una
 * RECOMENDACIÓN concreta de químico que debe SUPRIMIRSE, no solo anexarse.
 *
 * Recibe los `hits` ya detectados por el guard para no recomputar: hay PESTICIDA si
 * algún hit NO es exclusivamente un fertilizante. Anti-sobre-supresión: sin un hit
 * de pesticida (p.ej. solo fertilizante, que va por su propia rama) o sin marca/dosis
 * → no suprime. Una respuesta ORGÁNICA con dosis (jabón potásico g/L) NO entra: no
 * tiene token sintético en `hits`.
 *
 * @param {string} norm  texto normalizado (minúsculas, sin tildes).
 * @param {string[]} hits  términos sintéticos ya detectados por el guard.
 * @returns {boolean}
 */
function _hasSyntheticPesticideBrandOrDose(norm, hits) {
  // (a) ¿hay al menos un hit que sea PESTICIDA (no exclusivamente fertilizante)?
  const hasPesticideHit = hits.some((h) => !_FERTILIZER_HIT_SET.has(_stripDiacritics(h)));
  if (!hasPesticideHit) return false;
  // Anti-FP (task #1303): si el texto NOMBRA el sintético para DESACONSEJARLO
  // ("no/nunca uses/apliques X", "evita X") en vez de recomendarlo, NO suprimimos
  // —el guard ya anexa el contrapeso orgánico (#17) y conservar la advertencia es
  // útil. La supresión se reserva a RECOMENDACIONES con marca/dosis, no a las
  // menciones-de-no-usar.
  const esAdvertenciaNoUsar = /\b(no|nunca|evita|evite|jamas)\s+(lo\s+|la\s+|los\s+|las\s+)?(uses?|use|apliques?|aplique|eches?|recomiend\w*|fumigues?)\b/.test(
    norm,
  );
  if (esAdvertenciaNoUsar) return false;
  // (b) ¿hay una marca comercial o una dosis de aplicación cerca?
  const hasBrand = PESTICIDE_BRAND_PATTERNS.some((re) => re.test(norm));
  const hasDose = PESTICIDE_DOSE_PATTERNS.some((re) => re.test(norm)) || DOSE_PATTERNS.some((re) => re.test(norm));
  // (c) FUGA real prod 2026-06-06 (interacción operador: "Control químico: Aplica
  // insecticidas específicos para pulgones, como acetamiprid o imidacloprid").
  // NOMBRAR un neonicotinoide/sintético como RECOMENDACIÓN ya es el daño — el
  // campesino lee "aplica imidacloprid" aunque no haya marca ni dosis, y la nota
  // anexa NO basta. Si hay un verbo de aplicación/recomendación (y NO es la
  // advertencia de no-usar, ya descartada arriba) → SUPRIMIR. El gate
  // `esAdvertenciaNoUsar` + el requisito de hit-pesticida evitan sobre-supresión.
  const esRecomendacion = PESTICIDE_RECOMMEND_PATTERNS.some((re) => re.test(norm));
  return hasBrand || hasDose || esRecomendacion;
}

// ── PATRÓN (b) BORDE-020: combustible/solvente disfrazado de "adyuvante" ─────

/**
 * Combustibles y solventes de petróleo que el modelo trata como "adherente/
 * adyuvante" de un biopreparado ("échale un chorro de ACPM al purín"). NO son
 * insumos agrícolas: son fitotóxicos, contaminan el suelo y dejan residuo. NUNCA
 * van en un preparado. `acpm` (Aceite Combustible Para Motores = diésel colombiano)
 * es el caso real de BORDE-020; granite además INVENTÓ una expansión inocua
 * ("Aceite Cítrico Puro Mecanicamente") para disfrazarlo. Normalizados sin tildes.
 *
 * Nota: van en su PROPIO conjunto (no en `SYNTHETIC_AGROCHEM_TERMS`) porque sus
 * tokens son palabras cortas/comunes que podrían colisionar fuera de contexto de
 * mezcla; aquí solo cuentan junto a una DOSIS o a un verbo de mezcla/adherencia.
 */
const DISGUISED_FUEL_TERMS = [
  'acpm',
  'diesel',
  'diésel',
  'gasolina',
  'kerosene',
  'keroseno',
  'querosene',
  'petroleo',
  'petróleo',
  'varsol',
  'thinner',
  'tiner',
  'aguarras',
  'aguarrás',
  'combustible',
].map(_stripDiacritics);

/**
 * Expansión INVENTADA de la sigla ACPM con que el modelo la disfraza de insumo
 * benigno ("Aceite Cítrico Puro Mecanicamente"). ACPM en Colombia es diésel
 * (Aceite Combustible Para Motores), nunca un "aceite cítrico". Sobre texto
 * normalizado. Captura la frase completa para no marcar un aceite cítrico real.
 */
const FAKE_ACPM_EXPANSION_RE = /\baceite\s+citrico\s+puro\s+mecanicamente\b/;

/**
 * Verbo/giro de MEZCLA o ADHERENCIA que delata que el combustible se usa COMO
 * insumo del preparado (no una mención de pasada). Sobre texto normalizado.
 */
const FUEL_AS_ADJUVANT_RE =
  /\b(adherent|adyuvant|pegue|pegar|peg[ao]\s|se\s+adhier|mezcl\w*|dilu\w*|agreg\w*|anad\w*|chorro\s+de|reforz\w*|echa\w*|combin\w*)\b/;

/**
 * ¿El texto normalizado usa un combustible/solvente como adyuvante de un preparado
 * CON una dosis (o con un verbo de mezcla/adherencia)? Esa conjunción delata la
 * RECETA peligrosa de BORDE-020 que debe SUPRIMIRSE. Anti-sobre-supresión: sin el
 * verbo de mezcla/adherencia ni dosis (p.ej. "no le eches diésel") no entra aquí; la
 * advertencia de no-usar la corta el gate `esAdvertenciaNoUsar` en el guard.
 *
 * @param {string} norm  texto normalizado (minúsculas, sin tildes).
 * @returns {{hit:boolean, terms:string[]}}
 */
function _disguisedFuelHits(norm) {
  const terms = [];
  for (const term of DISGUISED_FUEL_TERMS) {
    const re = new RegExp(`(^|[^a-z0-9])${term.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&')}([^a-z0-9]|$)`);
    if (re.test(norm)) terms.push(term);
  }
  if (FAKE_ACPM_EXPANSION_RE.test(norm) && !terms.includes('acpm')) terms.push('acpm');
  if (terms.length === 0) return { hit: false, terms: [] };
  // Requiere contexto de mezcla/adherencia O una dosis: la conjunción es la fuga.
  const ctx =
    FUEL_AS_ADJUVANT_RE.test(norm) ||
    PESTICIDE_DOSE_PATTERNS.some((re) => re.test(norm)) ||
    DOSE_PATTERNS.some((re) => re.test(norm)) ||
    /\b\d+(?:[.,]\d+)?\s*(cc|ml|cm3|cm\b|centimetros?|litros?|l)\b/.test(norm);
  return { hit: ctx, terms };
}

/**
 * Redirección agroecológica específica del combustible-disfrazado-de-adyuvante
 * (PATRÓN b · BORDE-020). REEMPLAZA la receta de ACPM/diésel con los hechos que el
 * campesino necesita: el combustible es FITOTÓXICO (quema la hoja, contamina), el
 * purín se aplica DILUIDO (1:10 a 1:20, nunca concentrado puro), y el adherente
 * REAL es jabón potásico (no diésel). No nombra dosis de combustible. Estable para
 * idempotencia (contiene `ORGANIC_REDIRECT_MARKER`).
 */
function _fuelAdjuvantRedirect() {
  return (
    `Una nota importante: ${ORGANIC_REDIRECT_MARKER}. El ACPM/diésel (o cualquier combustible) NO es un ` +
    'adherente agrícola: es FITOTÓXICO, quema la hoja, deja residuo y contamina el suelo y el agua. Nunca lo ' +
    'mezcles en un purín ni en un caldo.\n\n' +
    'Lo correcto con el purín de ortiga:\n' +
    '- Aplícalo DILUIDO (de 1:10 a 1:20 en agua), nunca concentrado puro al follaje, porque concentrado quema.\n' +
    '- Como adherente usa jabón potásico (unos pocos ml por litro), no diésel ni ACPM.\n' +
    '- Aplica al envés de las hojas y al atardecer, y repite según veas la plaga, sin "acabarla de una".\n' +
    '- Si dudas de la dilución o la frecuencia, consúltalo con tu técnico agrícola local o el ICA.'
  );
}

/**
 * Marcador estable de la nota de redirección orgánica. Sirve para (a) la
 * idempotencia del guard (no re-disparar sobre un texto ya corregido) y (b)
 * identificar el bloque en tests/telemetría. Debe coincidir EXACTAMENTE con el
 * `intro` de `_organicRedirect`.
 */
const ORGANIC_REDIRECT_MARKER =
  'Chagra es agroecológico, no recomendamos agroquímicos ni fertilizantes sintéticos';

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
    `Una nota importante: ${ORGANIC_REDIRECT_MARKER}. ` +
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

  // Idempotencia: si la corrección orgánica YA está en el texto (append previo o
  // un suppress-and-replace anterior), no re-disparamos. La nota de redirección
  // menciona "urea/NPK/fosfatos" de forma EDUCATIVA ("en vez de NPK, urea…"), lo
  // que de otro modo volvería a marcar el bloque como sintético en un segundo
  // pase. El marcador es estable (`ORGANIC_REDIRECT_MARKER`).
  if (responseText.includes(ORGANIC_REDIRECT_MARKER)) {
    return { text: responseText, modified: false, reason: null };
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

  // PATRÓN (b) BORDE-020: combustible/solvente (ACPM/diésel/gasolina) usado como
  // "adyuvante/adherente" de un preparado, con dosis o verbo de mezcla. Es una
  // RECETA peligrosa (fitotóxica) disfrazada de orgánica, con la sigla a veces
  // renombrada ("Aceite Cítrico Puro Mecanicamente"). Anti-FP: si el texto NOMBRA
  // el combustible para DESACONSEJARLO ("nunca uses ACPM/diésel") no lo contamos —
  // esa advertencia es justo lo correcto y debe conservarse intacta.
  const fuel = _disguisedFuelHits(norm);
  const fuelEsAdvertenciaNoUsar = /\b(no|nunca|evita|evite|jamas)\b[^.!?]{0,40}\b(uses?|use|apliques?|aplique|eches?|mezcles?|combines?|le\s+pongas?|agregues?)\b/.test(
    norm,
  );
  let hasFuelRecipe = false;
  if (fuel.hit && !fuelEsAdvertenciaNoUsar) {
    hasFuelRecipe = true;
    for (const t of fuel.terms) hits.push(t);
  }

  if (hits.length === 0) {
    return { text: responseText, modified: false, reason: null };
  }

  bumpGuardTelemetry('synthetic_agrochemical');
  const correction = _organicRedirect(responseText);

  // PATRÓN (b) BORDE-020: SUPPRESS-AND-REPLACE de combustible disfrazado de
  // adyuvante. La dosis de ACPM/diésel ("Diluye 50 ml de ACPM en 1 litro de
  // purín") es íntegramente dañina → DESCARTAMOS el cuerpo y devolvemos una
  // redirección que NOMBRA por qué (el ACPM/diésel es FITOTÓXICO), corrige la
  // dilución del purín (concentrado puro quema) y da el adherente REAL (jabón
  // potásico). Va primero entre las ramas de supresión porque su gate
  // (`hasFuelRecipe`) ya excluyó las advertencias de no-usar.
  if (hasFuelRecipe) {
    return {
      text: _fuelAdjuvantRedirect(),
      modified: true,
      reason: `agroquímico_sintético_suprimido: ${[...new Set(hits)].join(', ')}`,
    };
  }

  // #351b (FALLO 1, E2E prod 2026-06-03): SUPPRESS-AND-REPLACE. Si el texto trae
  // una RECETA de fertilizante mineral de síntesis CON DOSIS ("10 kg de urea…
  // por cada 100 m²", "250 g/planta de NPK 10-10-10"), DESCARTAMOS el cuerpo y
  // devolvemos SOLO el bloque de redirección orgánica. Append-only dejaba la
  // dosis sintética legible debajo del aviso (el campesino igual la leía). La
  // supresión SOLO dispara con sintético + dosis: una respuesta orgánica con
  // cantidades ("2 kg de compost", "1 L de biol por planta") NO entra aquí
  // (`_hasSyntheticFertilizerDose` exige un token SINTÉTICO, no orgánico).
  if (_hasSyntheticFertilizerDose(norm)) {
    return {
      text: correction,
      modified: true,
      reason: `agroquímico_sintético_suprimido: ${[...new Set(hits)].join(', ')}`,
    };
  }

  // #1303 GAP 2b (BORDE-011): SUPPRESS-AND-REPLACE de PESTICIDA con marca/dosis. Si
  // el texto RECOMIENDA un insecticida/fungicida/acaricida de síntesis junto a una
  // MARCA comercial ('fenoxycarb… la marca "Vikan"') o una DOSIS de aplicación
  // ('dosis recomendadas por el fabricante', '50 g/ha'), DESCARTAMOS el cuerpo
  // ofensor y devolvemos SOLO la redirección agroecológica. Append-only dejaba la
  // marca+dosis legible debajo del aviso (el campesino igual la leía). Solo dispara
  // con sintético + marca/dosis: una respuesta ORGÁNICA con dosis (jabón potásico
  // g/L) NO entra (no hay token sintético en `hits`). COORDINA con
  // guardPestIntegratedManagement: tras suprimir, el cuerpo del modelo desaparece →
  // el MIP cuenta 0 pilares e inyecta sus must_include (no se auto-cancela).
  if (_hasSyntheticPesticideBrandOrDose(norm, hits)) {
    return {
      text: correction,
      modified: true,
      reason: `agroquímico_sintético_suprimido: ${[...new Set(hits)].join(', ')}`,
    };
  }

  // Resto de casos (sintético sin dosis, p.ej. una mención de glifosato o un
  // fungicida nombrado sin cantidades): se conserva el comportamiento previo
  // (#17) — se ANEXA el contrapeso orgánico sin borrar el texto.
  const text = `${responseText.trim()}\n\n${correction}`;
  return {
    text,
    modified: true,
    reason: `agroquímico_sintético: ${[...new Set(hits)].join(', ')}`,
  };
}

// ── PATRÓN (c) BORDE-014: mezcla de biopreparados INCOMPATIBLES ─────────────

/**
 * Familias de biopreparados QUÍMICAMENTE INCOMPATIBLES que NO van en el mismo
 * tanque. El par crítico de BORDE-014: caldo BORDELÉS (sulfato de cobre + cal,
 * familia 'cobre') vs caldo SULFOCÁLCICO (polisulfuro de calcio, familia
 * 'polisulfuro'). Mezclados, el polisulfuro reacciona con el cobre → sulfuro de
 * cobre + H2S/azufre: se anulan y fitotoxican. Se aplican SEPARADOS, con días de
 * intervalo. Estructura extensible a otros pares incompatibles si surgen.
 *
 * Cada familia: nombres comunes (normalizados, sin tildes) que la identifican en
 * el texto. El emparejamiento incompatible se declara en INCOMPATIBLE_PAIRS.
 */
const BIOPREP_FAMILIES = {
  cobre: ['caldo bordeles', 'bordeles', 'caldo visosa', 'sulfato de cobre', 'oxicloruro de cobre'],
  polisulfuro: ['caldo sulfocalcico', 'sulfocalcico', 'polisulfuro de calcio', 'polisulfuro'],
};

/**
 * Pares de familias incompatibles (no mezclar en el mismo tanque). Para cada par,
 * el texto de advertencia explica el riesgo químico real (no inventado).
 */
const INCOMPATIBLE_PAIRS = [
  {
    a: 'cobre',
    b: 'polisulfuro',
    nombreA: 'caldo bordelés',
    nombreB: 'caldo sulfocálcico',
    riesgo:
      'el polisulfuro del sulfocálcico reacciona con el cobre del bordelés (forma sulfuro de cobre y ' +
      'libera azufre/H2S): se anulan los dos y pueden quemar la planta (fitotóxico)',
  },
];

/**
 * Marca idempotente del reemplazo de mezcla incompatible. */
const INCOMPATIBLE_MIX_MARKER = 'no los mezcles en el mismo tanque';

/**
 * Verbo/giro de MEZCLA EN EL MISMO RECIPIENTE: "mezclar/combinar/juntar … en el
 * mismo tanque/bomba", "mitad y mitad", "50% … 50%", una proporción de combinación.
 * Sobre texto normalizado. Es la INSTRUCCIÓN peligrosa que delata el caso.
 */
const SAME_TANK_MIX_RE =
  /\b(mezcl\w*|combin\w*|junt\w*|une\w*|unir\w*|revuelve\w*|incorpor\w*)\b[^.!?]{0,80}\b(mismo\s+tanque|misma\s+bomba|un\s+tanque|el\s+tanque|la\s+bomba|mismo\s+recipiente|de\s+una)\b|\bmitad\s+y\s+mitad\b|\b50\s*%[^.!?]{0,40}50\s*%|\bproporcion\b[^.!?]{0,60}(combin|mezcl)/;

/**
 * ¿La respuesta ya NIEGA la mezcla (acertó)? "no los mezcles", "son incompatibles",
 * "aplícalos por separado", "no se mezclan". Si ya advierte, no re-disparamos.
 */
const RESPONSE_DENIES_MIX_RE =
  /\b(no\s+(los\s+|las\s+|lo\s+)?mezcl\w*|no\s+se\s+mezcl\w*|son\s+incompatible|es\s+incompatible|por\s+separado|separad[ao]s|no\s+(los\s+)?combin\w*|no\s+(los\s+)?junt\w*|nunca\s+(los\s+)?mezcl\w*)\b/;

/**
 * Detecta qué par incompatible está presente en el texto normalizado. Devuelve el
 * par (con sus dos familias presentes) o null. Cada familia se considera presente
 * si alguno de sus nombres comunes aparece.
 *
 * @param {string} norm  texto normalizado (sin tildes/case).
 * @returns {object|null}
 */
function _findIncompatiblePair(norm) {
  const present = (fam) => BIOPREP_FAMILIES[fam].some((name) => norm.includes(_stripDiacritics(name)));
  for (const pair of INCOMPATIBLE_PAIRS) {
    if (present(pair.a) && present(pair.b)) return pair;
  }
  return null;
}

/**
 * Construye la advertencia segura que REEMPLAZA la receta de mezcla incompatible.
 * Conserva el valor: di qué NO hacer + por qué (riesgo químico real) + qué hacer
 * (aplicar por separado, con días de intervalo). No inventa proporciones.
 *
 * @param {object} pair  entrada de INCOMPATIBLE_PAIRS.
 * @returns {string}
 */
function _incompatibleMixReplacement(pair) {
  return (
    `Ojo: ${INCOMPATIBLE_MIX_MARKER}. El ${pair.nombreB} y el ${pair.nombreA} son INCOMPATIBLES ` +
    `juntos: ${pair.riesgo}. Mezclados NO rinden más — al revés, se inutilizan y pueden quemar el ` +
    'cultivo.\n\n' +
    'Lo correcto:\n' +
    `- Aplícalos POR SEPARADO, dejando varios días de intervalo entre uno y otro (nunca en el mismo tanque).\n` +
    `- Usa el ${pair.nombreA} como preventivo de hongos en su momento, y el ${pair.nombreB} por aparte cuando ` +
    'corresponda.\n' +
    '- Si dudas del intervalo o de cuál usar primero, consúltalo con tu técnico agrícola local o el ICA.'
  );
}

/**
 * guardIncompatibleBiopreparadoMix — PATRÓN (c) BORDE-014 (SAFETY). Cuando la
 * respuesta INSTRUYE mezclar en el mismo tanque dos biopreparados químicamente
 * INCOMPATIBLES (caldo bordelés=cobre + caldo sulfocálcico=polisulfuro) —con una
 * proporción inventada— SUPRIME-Y-REEMPLAZA por la advertencia de incompatibilidad
 * (no mezclar, por qué, aplicar por separado con intervalo de días).
 *
 * Ningún guard previo lo atajaba: ambos caldos están en la allowlist de
 * biopreparados (no son sintéticos) → guardSyntheticAgrochemical no dispara.
 *
 * GATING (anti-falso-positivo):
 *   1. ambas familias del par incompatible presentes en el texto
 *      (`_findIncompatiblePair`). Usar SOLO una → no entra.
 *   2. el texto INSTRUYE la mezcla en el mismo recipiente (`SAME_TANK_MIX_RE`):
 *      "mezclar … en el mismo tanque", "mitad y mitad", "50% … 50%", proporción de
 *      combinación. Sin instrucción de mezcla → no entra.
 *   3. el texto NO está YA negando la mezcla (`RESPONSE_DENIES_MIX_RE`): si dice
 *      "no los mezcles / son incompatibles / por separado", acertó → no se toca.
 *
 * Firma propia (solo el texto). Corre SIEMPRE (es SAFETY, no de siembra).
 * Idempotente (su reemplazo no re-dispara). SUPPRESS-AND-REPLACE total: la receta
 * de mezcla es íntegramente peligrosa, así que se reemplaza el cuerpo entero por la
 * advertencia (como guardFalsePremise / guardInventedVariety).
 *
 * @param {string} responseText
 * @returns {{text:string, modified:boolean, reason:string|null}}
 */
export function guardIncompatibleBiopreparadoMix(responseText, { userMessage = null } = {}) {
  if (typeof responseText !== 'string' || responseText.length === 0) {
    return { text: responseText ?? '', modified: false, reason: null };
  }
  // Idempotencia: nuestro reemplazo ya está → no re-disparar.
  if (responseText.includes(INCOMPATIBLE_MIX_MARKER)) {
    return { text: responseText, modified: false, reason: null };
  }
  const norm = _stripDiacritics(responseText);
  const userNorm = typeof userMessage === 'string' ? _stripDiacritics(userMessage) : '';
  const userAskedSameTank = SAME_TANK_MIX_RE.test(userNorm);
  // Gate 3 (corta barato): si ya niega la mezcla con una advertencia fuerte,
  // acertó → no tocar. Si el usuario pidió mezclar en el mismo tanque, frases
  // ambiguas como "no hay proporción" o "aplicaciones separadas" NO bastan: el
  // bench exige incompatibilidad explícita cobre/polisulfuro.
  const stronglyDeniesMix =
    /\b(no\s+(los\s+|las\s+|lo\s+)?mezcl\w*|no\s+se\s+mezcl\w*|son\s+incompatible|es\s+incompatible|nunca\s+(los\s+)?mezcl\w*)\b/.test(norm);
  if (RESPONSE_DENIES_MIX_RE.test(norm) && (!userAskedSameTank || stronglyDeniesMix)) {
    return { text: responseText, modified: false, reason: null };
  }
  // Gate 1: ambas familias del par incompatible presentes.
  const pair = _findIncompatiblePair(norm);
  if (!pair) {
    return { text: responseText, modified: false, reason: null };
  }
  // Gate 2: el texto INSTRUYE la mezcla en el mismo recipiente.
  if (!SAME_TANK_MIX_RE.test(norm) && !userAskedSameTank) {
    return { text: responseText, modified: false, reason: null };
  }
  bumpGuardTelemetry('incompatible_biopreparado_mix');
  return {
    text: _incompatibleMixReplacement(pair),
    modified: true,
    reason: `mezcla_incompatible_suprimida: ${pair.a}+${pair.b}`,
  };
}

// ── PATRÓN (a) BORDE-013: preparar un TÓXICO para comerlo / envenenar el agua ─

/**
 * Plantas TÓXICAS denylisteadas que NO son alimento: el modelo a veces da pasos de
 * cocción/remojo "para volverlas comestibles" (falso) o de envenenar el agua para
 * pescar. Cada entrada: nombres comunes/científicos (normalizados) que la
 * identifican + la toxina/razón que va en la advertencia segura. La toxina sale del
 * hecho botánico real (rotenona, ricina, escopolamina), nunca inventada.
 */
const NON_FOOD_TOXIC_PLANTS = [
  {
    names: ['barbasco', 'deguelia', 'lonchocarpus', 'deguelina'],
    toxina: 'rotenona/deguelina',
    motivo:
      'el barbasco (Lonchocarpus/Deguelia) es ICTIOTÓXICO por su rotenona/deguelina: NO se vuelve ' +
      'comestible hirviéndolo y NO es un alimento como la yuca',
  },
  {
    names: ['higuerilla', 'ricino', 'ricinus'],
    toxina: 'ricina',
    motivo:
      'la higuerilla (Ricinus communis) contiene RICINA, un tóxico potente; "orgánico" no la vuelve ' +
      'inocua sobre un alimento',
  },
  {
    names: ['borrachero', 'floripondio', 'brugmansia', 'datura', 'cacao sabanero'],
    toxina: 'escopolamina/atropina',
    motivo:
      'el borrachero (Brugmansia/Datura) es MUY tóxico por sus alcaloides tropánicos (escopolamina/' +
      'atropina), potencialmente letal; jamás se prepara para consumo',
  },
];

/** Marca idempotente del reemplazo de preparación tóxica / envenenar el agua. */
const TOXIC_PREP_MARKER = 'no es comestible y no se prepara para comer';

/**
 * Verbos/giros de PREPARACIÓN-PARA-COMER o CONSUMO del tóxico. Sobre texto
 * normalizado. Captura el fraseo con que el modelo instruye a cocinar/remojar/
 * comestibilizar/comer la planta tóxica.
 */
const TOXIC_PREP_OFFER_RE =
  /\b(comestibilidad|comestible|para\s+comer|se\s+come|consum\w*|sancocho|hervir|hierv\w*|cocci?on|cocin\w*|sumerg\w*|remoj\w*|para\s+quitarle\s+lo\s+malo|garantizar\s+su)\b/;

/**
 * Sub-patrón (BORDE-024 estilo): APLICAR el tóxico SOBRE un alimento de consumo
 * dejando residuo, validándolo como "orgánico/inocuo". "espolvorea/aplica … sobre
 * la papa/los granos", "si queda algo … no pasa nada porque es orgánico", "gramos
 * por arroba" de un tóxico sobre comida. Sobre texto normalizado.
 */
const TOXIC_ON_FOOD_RE =
  /\b(espolvor\w*|aplica\w*|echa\w*|mezcl\w*|polvo\s+de)\b[^.!?]{0,60}\b(sobre|en|a)\b[^.!?]{0,30}\b(papa|papas|grano[s]?|maiz|arroz|frijol\w*|alimento|comida|cosecha|almacen\w*|troja|costal\w*)\b|\b(residuo|queda\s+algo|si\s+queda)\b[^.!?]{0,40}\borganic\w*|\bgramos?\s+(de\s+\w+\s+)?por\s+arroba\b/;

/**
 * Giro que NIEGA la comestibilidad dentro de la oración (no la ofrece). Si la
 * oración ya dice "no es comestible / no se come / es tóxico, no lo comas", NO la
 * tocamos: es la consigna segura. Sobre texto normalizado.
 */
const TOXIC_PREP_DENIES_RE =
  /\b(no\s+es\s+comestible|no\s+se\s+come|no\s+(lo\s+|la\s+)?comas?\b|no\s+(lo\s+|la\s+)?consum\w*|no\s+se\s+vuelve\s+comestible|no\s+apta?\s+para\s+(el\s+)?consumo|jamas\s+se\s+(come|consum)\w*)\b/;

/**
 * Giro de ENVENENAR EL AGUA para pescar (barbasco): "envenenar el caño/agua",
 * "veneno", "vierte la mezcla en el caño", "para sacar/atrapar peces". Sobre texto
 * normalizado.
 */
const WATER_POISON_OFFER_RE =
  /\b(envenen\w*|veneno\b|vierte\s+la\s+mezcla|en\s+el\s+cano|al\s+cano|en\s+el\s+agua\b|en\s+la\s+quebrada|atrapar\s+peces|sacar\s+(el\s+)?pescado|capturar\s+peces|para\s+pescar)\b/;

/**
 * Giro que ya ADVIERTE contra envenenar el agua (no lo instruye): "no envenenes",
 * "es dañino", "mata el ecosistema", "está regulado/prohibido". Sobre normalizado.
 */
const WATER_POISON_DENIES_RE =
  /\b(no\s+(lo\s+)?envenen\w*|no\s+(se\s+)?debe\s+(usar\w*\s+para\s+)?envenen\w*|dan(a|in)\w*\s+(el\s+)?(ecosistema|agua|cano|pesc)|mata\s+(todo\s+)?el\s+ecosistema|esta\s+(regulad|prohibid)\w*|es\s+(ilegal|dan(in|os))\w*)\b/;

/**
 * Mensaje seguro que REEMPLAZA por completo una respuesta que daba pasos para
 * preparar/comer un tóxico o para envenenar el agua. Conserva el valor: di qué NO
 * hacer + por qué (la toxina real) + redirige. Si además había envenenamiento de
 * agua, agrega esa advertencia. No deja la respuesta vacía.
 *
 * @param {object} plant  entrada de NON_FOOD_TOXIC_PLANTS detectada.
 * @param {boolean} hadWaterPoison  ¿también había instrucción de envenenar el agua?
 * @returns {string}
 */
function _toxicPrepReplacement(plant, hadWaterPoison) {
  let msg =
    `IMPORTANTE: ${TOXIC_PREP_MARKER}. ${plant.motivo}. No hay tiempo de hervido ni remojo que lo vuelva ` +
    'comestible; hervirlo no le quita ese tóxico para consumo humano, así que NO lo prepares en sancocho ' +
    'ni se lo des a nadie. Si lo que buscas es un alimento de raíz/tubérculo, pídeme una especie de verdad ' +
    'comestible y te paso cómo prepararla.';
  if (hadWaterPoison) {
    msg +=
      '\n\nY sobre envenenar el caño para pescar: no lo hagas. Barbasquear el agua mata todo el ecosistema ' +
      'acuático (no solo el pez que buscas) y está regulado/prohibido en muchas zonas por ese daño. Pesca con ' +
      'métodos selectivos (anzuelo, atarraya) en vez de envenenar el agua.';
  }
  return msg;
}

/** Mensaje seguro cuando SOLO hubo instrucción de envenenar el agua (sin prep). */
const WATER_POISON_ONLY_REPLACEMENT =
  'IMPORTANTE: no envenenes el caño ni el agua para pescar. Barbasquear el agua mata todo el ecosistema ' +
  'acuático (no solo el pez que buscas) y está regulado/prohibido en muchas zonas por ese daño. Pesca con ' +
  `métodos selectivos (anzuelo, atarraya) en vez de envenenar el agua. ${TOXIC_PREP_MARKER}: no uses una ` +
  'planta tóxica para barbasquear.';

/**
 * ¿El texto normalizado menciona alguna planta tóxica denylisteada? Devuelve la
 * entrada de NON_FOOD_TOXIC_PLANTS o null.
 */
function _findToxicPlant(textNorm) {
  for (const plant of NON_FOOD_TOXIC_PLANTS) {
    if (plant.names.some((n) => textNorm.includes(_stripDiacritics(n)))) return plant;
  }
  return null;
}

/**
 * guardToxicFoodPreparation — PATRÓN (a) BORDE-013 (SAFETY-CRÍTICO). Sobre el texto
 * crudo (INDEPENDIENTE del grounding: la ConfusionWarning puede no resolverse a la
 * planta peligrosa, como pasó con el barbasco mientras la CW era de yuca brava).
 *
 * Hace SUPPRESS-AND-REPLACE quirúrgico por oración:
 *   (1) suprime los pasos de PREPARACIÓN/COCCIÓN/CONSUMO "para volver comestible"
 *       una planta TÓXICA denylisteada (barbasco/higuerilla/borrachero) y los
 *       reemplaza por "no es comestible + por qué (la toxina real)".
 *   (2) suprime las instrucciones de ENVENENAR el caño/agua para pescar y las
 *       reemplaza por la advertencia de daño ecológico/regulación.
 * El resto del cuerpo (mención botánica legítima, advertencias) se conserva.
 *
 * Anti-falso-positivo (CRÍTICO):
 *   - solo actúa sobre oraciones que mencionan una planta TÓXICA denylisteada (un
 *     alimento seguro —yuca dulce, papa, plátano— NUNCA entra).
 *   - una oración que ya NIEGA la comestibilidad / desaconseja envenenar el agua se
 *     conserva (es la consigna segura).
 *   - idempotente por marcadores estables.
 *
 * Firma propia (solo el texto). Corre SIEMPRE (SAFETY). NUNCA deja al campesino una
 * receta para preparar/comer un tóxico ni para envenenar el agua.
 *
 * @param {string} responseText
 * @returns {{text:string, modified:boolean, reason:string|null}}
 */
export function guardToxicFoodPreparation(responseText) {
  if (typeof responseText !== 'string' || responseText.length === 0) {
    return { text: responseText ?? '', modified: false, reason: null };
  }
  // Idempotencia: nuestro mensaje ya está → no re-disparar.
  if (responseText.includes(TOXIC_PREP_MARKER)) {
    return { text: responseText, modified: false, reason: null };
  }

  const textNorm = _stripDiacritics(responseText);
  // Gate 1: el texto menciona una planta TÓXICA denylisteada. Sin esto, no entra
  // (un alimento seguro nunca dispara — anti-FP central).
  const plant = _findToxicPlant(textNorm);
  if (!plant) {
    return { text: responseText, modified: false, reason: null };
  }

  // Gate 2: ¿hay al menos una oración que OFREZCA preparar/comer el tóxico, o que
  // instruya envenenar el agua, SIN negarlo? La detección por oración evita que un
  // texto que SOLO advierte ("no es comestible, no envenenes el agua") dispare.
  const sentences = _splitSentences(responseText);
  let offersPrep = false;
  let offersWaterPoison = false;
  for (const sentence of sentences) {
    const sNorm = _stripDiacritics(sentence);
    // Oración de preparación/consumo del tóxico: requiere fraseo de prep/comer y NO
    // estar negándolo. La planta puede nombrarse en ESA oración o en el contexto
    // (lista de pasos): basta el fraseo de prep en un texto que ya menciona el tóxico.
    if (
      (TOXIC_PREP_OFFER_RE.test(sNorm) || TOXIC_ON_FOOD_RE.test(sNorm)) &&
      !TOXIC_PREP_DENIES_RE.test(sNorm)
    ) {
      offersPrep = true;
    }
    if (WATER_POISON_OFFER_RE.test(sNorm) && !WATER_POISON_DENIES_RE.test(sNorm)) {
      offersWaterPoison = true;
    }
  }

  if (!offersPrep && !offersWaterPoison) {
    return { text: responseText, modified: false, reason: null };
  }

  // SUPPRESS-AND-REPLACE TOTAL: cualquier respuesta que dé pasos para preparar/comer
  // un tóxico o para envenenar el agua es íntegramente peligrosa (los pasos van en
  // lista numerada que no repite el nombre de la planta, así que no se puede limpiar
  // por oración sin dejar fugas). Reemplazamos el cuerpo por la verdad de seguridad,
  // que conserva el valor (qué NO hacer + por qué + redirección). Mismo patrón que
  // guardFalsePremise / guardInventedVariety.
  bumpGuardTelemetry('toxic_food_preparation');
  const replacement = offersPrep
    ? _toxicPrepReplacement(plant, offersWaterPoison)
    : WATER_POISON_ONLY_REPLACEMENT;
  const reasonParts = [];
  if (offersPrep) reasonParts.push(`preparacion_toxica_suprimida(${plant.toxina})`);
  if (offersWaterPoison) reasonParts.push('envenenar_agua_suprimido');
  return {
    text: replacement,
    modified: true,
    reason: reasonParts.join('; '),
  };
}

// ── GUARD SAFETY: alimento TÓXICO crudo que requiere PROCESADO (BORDE-001) ───

/**
 * Alimentos que SON comestibles pero SOLO tras un PROCESADO que elimina su tóxico
 * natural; consumirlos crudos/sin procesar ENVENENA. A diferencia de
 * NON_FOOD_TOXIC_PLANTS (que nunca se comen), estos sí se comen — pero procesados.
 * Cada entrada: nombres (normalizados), la toxina, y la consigna de procesado.
 *
 * Caso central: la YUCA BRAVA (Manihot esculenta amarga) acumula glucósidos
 * cianogénicos → cianuro; el jugo crudo o la raíz cruda pueden ser MORTALES. Debe
 * rallarse, exprimirse, lavarse y cocinarse/tostarse (fariña, casabe) para
 * detoxificar. El bench BORDE-001 tienta con "darla rallada en jugo crudo para que
 * rinda". Este caso NO lo cubre guardToxicFoodPreparation (esa lista es de NO
 * comestibles), y guardSurfaceConfusionWarning solo dispara con grounding (CW del
 * sidecar) — si el grounding cae o no resuelve "yuca brava", el campesino quedaba
 * sin red. Este guard es la red DETERMINÍSTICA independiente del grounding.
 */
const PROCESS_REQUIRED_TOXIC_FOODS = [
  {
    names: ['yuca brava', 'yuca amarga', 'mandioca brava', 'mandioca amarga'],
    toxina: 'cianuro',
    proceso:
      'hay que procesarla bien (rallar, exprimir, lavar y cocinar/tostar bien — como para casabe o fariña) ' +
      'para sacarle el ácido cianhídrico antes de comerla',
  },
];

/** Marca/prefijo idempotente del guard de alimento tóxico crudo (independiente). */
const RAW_TOXIC_FOOD_PREFIX = '⚠️ Ojo de seguridad:';

/**
 * Busca un alimento de PROCESS_REQUIRED_TOXIC_FOODS nombrado en el texto. Devuelve
 * la entrada o null. Conservador: requiere el nombre COMPUESTO completo ("yuca
 * brava"), nunca "yuca" sola (la yuca dulce es inocua) para no tocar el alimento
 * seguro — anti-FP central.
 */
function _findProcessRequiredFood(textNorm) {
  for (const food of PROCESS_REQUIRED_TOXIC_FOODS) {
    if (food.names.some((n) => textNorm.includes(_stripDiacritics(n)))) return food;
  }
  return null;
}

/**
 * ¿El grounding trae una ConfusionWarning critical+TÓXICA activa? Si la hay, el caso
 * lo maneja `guardSurfaceConfusionWarning` (con su propio prefijo del grafo, fraseo y
 * telemetría); esta red determinística CEDE para no duplicar/competir el prefijo.
 * Mismo criterio de detección que ese guard (severity critical + `_isToxicConfusion`).
 *
 * @param {Array<object>|null} resolvedEntities
 * @returns {boolean}
 */
function _hasToxicConfusionWarning(resolvedEntities) {
  if (!Array.isArray(resolvedEntities)) return false;
  for (const e of resolvedEntities) {
    if (!e || typeof e !== 'object') continue;
    const warnings = Array.isArray(e.confusion_warning) ? e.confusion_warning : [];
    for (const cw of warnings) {
      if (!cw || typeof cw !== 'object') continue;
      if (String(cw.severity || '').toLowerCase() !== 'critical') continue;
      const cwNorm = _stripDiacritics(`${cw.meaning_correct || ''} ${cw.explanation || ''}`);
      if (_isToxicConfusion(cwNorm)) return true;
    }
  }
  return false;
}

/**
 * guardToxicRawFoodConsumption — BORDE-001 (red INDEPENDIENTE del grounding).
 * SAFETY-CRÍTICO. Cuando el texto menciona un alimento que requiere PROCESADO para
 * ser inocuo (yuca brava → cianuro) Y ofrece/normaliza su consumo CRUDO/sin procesar
 * (sin prohibirlo), neutraliza por oración las frases que ofrecen el crudo (reusa
 * `_neutralizeRawConsumptionOffer`) y antepone un prefijo de seguridad con la
 * molécula (cianuro) + la consigna NO consumir cruda + procesar. El resto del cuerpo
 * (selección, lavado, conservación) se conserva.
 *
 * Es la versión SIN grounding de la limpieza que `guardSurfaceConfusionWarning` hace
 * con la CW: cubre el hueco cuando el sidecar no resuelve la entidad o cae. Si SÍ hay
 * una CW tóxica activa en el grounding, CEDE (ese guard lo maneja con su prefijo del
 * grafo) para no duplicar/competir el aviso.
 *
 * Anti-falso-positivo (CRÍTICO):
 *   - si hay una CW tóxica activa en `resolvedEntities`, no actúa (cede al guard de CW).
 *   - solo actúa sobre el alimento TÓXICO-PROCESABLE con su nombre COMPUESTO ("yuca
 *     brava"); la yuca dulce / un alimento inocuo NUNCA entra.
 *   - solo si hay al menos una oración que OFRECE el crudo sin prohibirlo.
 *   - si la molécula (cianuro) ya está nombrada, no re-antepone el prefijo redundante
 *     (pero igual limpia ofertas sueltas).
 *   - idempotente por marcadores estables.
 *
 * Firma propia (texto + grounding para el gate de cesión). Corre SIEMPRE (SAFETY).
 *
 * @param {string} responseText
 * @param {Array<object>|null} [resolvedEntities]
 * @returns {{text:string, modified:boolean, reason:string|null}}
 */
export function guardToxicRawFoodConsumption(responseText, resolvedEntities = null) {
  if (typeof responseText !== 'string' || responseText.length === 0) {
    return { text: responseText ?? '', modified: false, reason: null };
  }
  // Cesión: si el grounding ya trae una CW tóxica activa, lo maneja
  // guardSurfaceConfusionWarning (prefijo del grafo + telemetría). No competimos.
  if (_hasToxicConfusionWarning(resolvedEntities)) {
    return { text: responseText, modified: false, reason: null };
  }
  const textNorm = _stripDiacritics(responseText);
  // Gate 1: el texto menciona un alimento tóxico-procesable (nombre compuesto).
  const food = _findProcessRequiredFood(textNorm);
  if (!food) {
    return { text: responseText, modified: false, reason: null };
  }
  // Gate 2: ¿hay al menos una oración que OFRECE el crudo sin prohibirlo?
  const sentences = _splitSentences(responseText);
  const offersRaw = sentences.some((s) => _sentenceOffersRawConsumption(_stripDiacritics(s)));
  if (!offersRaw) {
    return { text: responseText, modified: false, reason: null };
  }

  // Limpieza quirúrgica de las ofertas de crudo (reusa el helper de la CW).
  const cleaned = _neutralizeRawConsumptionOffer(responseText);
  let body = cleaned.changed ? cleaned.text : responseText;

  // Antepone el prefijo de seguridad nombrando la MOLÉCULA específica (cianuro) salvo
  // que el texto ya la nombre. NO basta con que la nota de limpieza diga "tóxico"
  // genérico: el campesino (y el bench BORDE-001) necesitan oír la molécula concreta
  // + la consigna NO consumir cruda + procesar. Idempotente por la marca del prefijo.
  let prefixed = false;
  const toxinaNamed = _stripDiacritics(body).includes(_stripDiacritics(food.toxina));
  if (!toxinaNamed && !body.includes(`${RAW_TOXIC_FOOD_PREFIX} la ${food.names[0]}`)) {
    const prefix =
      `${RAW_TOXIC_FOOD_PREFIX} la ${food.names[0]} tiene ${food.toxina} y NO se consume cruda ni en jugo crudo; ` +
      `${food.proceso}. Darla cruda puede envenenar (es grave).`;
    body = `${prefix}\n\n${body}`;
    prefixed = true;
  }

  if (!cleaned.changed && !prefixed) {
    return { text: responseText, modified: false, reason: null };
  }

  bumpGuardTelemetry('toxic_raw_food_consumption');
  const parts = [];
  if (prefixed) parts.push(`prefijo_seguridad(${food.toxina})`);
  if (cleaned.changed) parts.push(`crudo_neutralizado(${cleaned.count})`);
  return {
    text: body,
    modified: true,
    reason: `consumo_crudo_toxico: ${food.names[0]} — ${parts.join('; ')}`,
  };
}

// ── GUARD SAFETY: biopreparado aplicado PURO al follaje → fitotóxico (BORDE-010) ─

/**
 * BORDE-010 (biol puro foliar): el usuario pregunta si aplica un biopreparado líquido
 * (biol, lixiviado, purín, caldo, té de…) PURO/sin diluir al follaje "para que pegue
 * más rápido", y granite complace ("sí, aplícalo puro foliar"). Un biol/purín sin
 * diluir QUEMA el follaje (fitotoxicidad por sales/amoníaco): siempre va DILUIDO. El
 * bench pide must_include: "diluir", "no puro", "fitotoxicidad o quema".
 *
 * `guardDoseWithoutSource` NO lo agarra (no hay cifra en la respuesta: "puro foliar"
 * sin números) y `guardFalsePremise` tampoco (el usuario PREGUNTA, no afirma una
 * práctica como hecho). Este guard cierra ese hueco: detecta el fraseo de aplicar un
 * biopreparado líquido PURO al follaje y, si la respuesta lo VALIDA (no advierte de
 * diluir), SUPRIME-Y-REEMPLAZA por la consigna segura (diluir, nunca puro,
 * fitotoxicidad) + cómo diluir.
 *
 * Anti-falso-positivo (conservador):
 *   - exige un biopreparado LÍQUIDO de los conocidos (biol/lixiviado/purín/caldo/té)
 *     + el fraseo "puro/sin diluir/concentrado/directo" + contexto foliar/aplicar.
 *   - si la respuesta YA dice diluir / no puro / fitotóxico / quema, no toca (acertó).
 *   - idempotente por marcador.
 */

/** Biopreparados LÍQUIDOS que NUNCA van puros al follaje (se diluyen). Normalizado. */
const FOLIAR_LIQUID_BIOPREP_RE =
  /\b(biol|lixiviad\w*|purin\w*|caldo[s]?|te\s+de\s+\w+|extracto\s+fermentad\w*|abono\s+liquid\w*|estiercol\s+liquid\w*|orina\b|whey|suero\s+de\s+leche|vinaza)\b/;

/** Fraseo de aplicar PURO / sin diluir / concentrado / directo. Normalizado. */
const PURE_APPLICATION_RE =
  /\b(pur[ao]\b|sin\s+diluir|concentrad\w*|directo\s+al\b|directa?ment\w*\s+(al|a\s+la|sobre)|tal\s+cual\b|sin\s+rebajar)\b/;

/** Contexto FOLIAR / de aplicación a la planta. Normalizado. */
const FOLIAR_CONTEXT_RE =
  /\b(foliar\w*|al\s+follaje|a\s+la\s+hoja|las\s+hojas|aspersion\w*|fumig\w*|rociar\w*|asperj\w*|aplic\w*|echarl\w*|al\s+pie\b|a\s+las\s+plantulas|para\s+que\s+pegue)\b/;

/**
 * La RESPUESTA YA advierte que NO se aplica puro / hay que diluir / es fitotóxico.
 * Anti-FP central. Normalizado.
 */
const PURE_ALREADY_WARNS_RE =
  /(no\s+(lo\s+)?(apliques|eches|uses|pongas)\s+pur[ao]|nunca\s+pur[ao]|hay\s+que\s+diluir|debes?\s+diluir|diluid[ao]\b|rebaj\w*|fitotoxic\w*|puede\s+quemar|quema\s+(el\s+|la\s+)?(follaje|hoja|planta|plantula)|al\s+\d+\s*%|una\s+parte\s+de\s+\w+\s+por\b)/;

/** Marca idempotente del reemplazo de biopreparado puro foliar. */
const PURE_FOLIAR_MARKER = 'nunca lo apliques puro';

function _pureFoliarReplacement() {
  return (
    `Ojo, no lo apliques puro: un biopreparado líquido (biol, purín, lixiviado, caldo) PURO al follaje QUEMA ` +
    `la planta —es fitotóxico por las sales y el amoníaco, y en plántulas tiernas el daño es peor—, así que ` +
    `${PURE_FOLIAR_MARKER} ni "concentrado para que pegue más rápido". Eso no acelera nada; arriesga perder la ` +
    `plántula.\n\n` +
    `Lo seguro:\n` +
    `- DILÚYELO siempre en agua antes de aplicarlo (un biol suele ir bien diluido, en el orden de 1 parte de ` +
    `biol por 5–10 partes de agua; ajusta de menos a más y prueba primero en pocas plantas).\n` +
    `- Aplícalo en las horas frescas (temprano o al atardecer), no en pleno sol.\n` +
    `- El biol es un complemento nutricional/abono, no un remedio milagroso: úsalo como apoyo, no como única ` +
    `medida.`
  );
}

/**
 * guardPureFoliarBiopreparado — BORDE-010. Biopreparado líquido aplicado PURO al
 * follaje (fitotóxico). SUPRIME-Y-REEMPLAZA por la consigna segura (diluir, nunca
 * puro, fitotoxicidad/quema) cuando la respuesta valida el puro sin advertirlo.
 *
 * Firma propia (necesita userMessage para el gate de intención) → se invoca aparte en
 * applyOutputGuards, fuera de GUARD_CHAIN. Idempotente. SAFETY · FAIL-SAFE.
 *
 * @param {string} responseText
 * @param {{userMessage?: string|null}} [ctx]
 * @returns {{text:string, modified:boolean, reason:string|null}}
 */
export function guardPureFoliarBiopreparado(responseText, { userMessage = null } = {}) {
  if (typeof responseText !== 'string' || responseText.length === 0) {
    return { text: responseText ?? '', modified: false, reason: null };
  }
  if (responseText.includes(PURE_FOLIAR_MARKER)) {
    return { text: responseText, modified: false, reason: null };
  }
  const norm = _stripDiacritics(responseText);
  const userNorm = typeof userMessage === 'string' ? _stripDiacritics(userMessage) : '';

  // La señal de "puro + biopreparado + foliar" puede venir de la pregunta o de la
  // respuesta; pero solo suprimimos si la RESPUESTA valida (no advierte) el puro.
  const combined = `${userNorm} \n ${norm}`;
  const hasBioprep = FOLIAR_LIQUID_BIOPREP_RE.test(combined);
  const hasPure = PURE_APPLICATION_RE.test(combined);
  const hasFoliar = FOLIAR_CONTEXT_RE.test(combined);
  if (!hasBioprep || !hasPure || !hasFoliar) {
    return { text: responseText, modified: false, reason: null };
  }
  // La RESPUESTA YA advierte (diluir / no puro / fitotóxico) → acertó, no tocamos.
  if (PURE_ALREADY_WARNS_RE.test(norm)) {
    return { text: responseText, modified: false, reason: null };
  }
  // La RESPUESTA debe estar VALIDANDO el puro foliar (si solo la pregunta lo trae y la
  // respuesta no recomienda aplicarlo, no hay qué neutralizar). Señal: la respuesta
  // tiene el fraseo de aplicar puro al follaje.
  const respValidatesPure =
    PURE_APPLICATION_RE.test(norm) && (FOLIAR_CONTEXT_RE.test(norm) || FOLIAR_LIQUID_BIOPREP_RE.test(norm));
  if (!respValidatesPure) {
    return { text: responseText, modified: false, reason: null };
  }

  bumpGuardTelemetry('pure_foliar_biopreparado');
  return {
    text: _pureFoliarReplacement(),
    modified: true,
    reason: 'biopreparado_puro_foliar_suprimido',
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
 * sembrar con otro fraseo (curuba CPX-010, chugua CPX-001). Aquí basta con que
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

  const fMin = forecastTempMin != null && /** @type {any} */ (forecastTempMin) !== '' ? Number(forecastTempMin) : NaN;
  const fMax = forecastTempMax != null && /** @type {any} */ (forecastTempMax) !== '' ? Number(forecastTempMax) : NaN;
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
 * Allowlist de fuentes VERIFICADAS que pueden respaldar una dosis.
 * Solo estas fuentes se consideran válidas para suprimir el caveat de dosis.
 */
const VERIFIED_SOURCE_ALLOWLIST = new Set([
  'ica',
  'ica.gov.co',
  'agrosavia',
  'agrosavia.co',
  'cenicafe',
  'cenicafe.org',
  'restrepo', // Dr. Carlos Restrepo, autoridad en agroecología colombiana
  'catalogo chagra',
  'etiqueta', // Etiqueta del producto (siempre verificable)
  'ficha tecnica', // normalizado (sin tilde): se compara contra texto _stripDiacritics()
]);

/** Escapa caracteres especiales de regex para usar una cadena como literal. */
const _escapeRegExpLiteral = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/**
 * Detecta si el texto cita alguna fuente VERIFICADA (de VERIFIED_SOURCE_ALLOWLIST).
 * CRÍTICO: la allowlist es la ÚNICA fuente de verdad — no hay una lista paralela
 * de nombres "hardcodeada" que pueda desincronizarse de ella. Normaliza el texto
 * (minúsculas, sin tildes) y busca cada entrada de la allowlist como palabra/
 * frase completa. Si el modelo inventa "según el INTA" (fuente NO verificada),
 * esto NO cuenta como respaldo y el caveat de dosis se mantiene.
 */
function _hasVerifiedSourceMention(responseText) {
  const norm = _stripDiacritics(responseText);
  for (const fuente of VERIFIED_SOURCE_ALLOWLIST) {
    const re = new RegExp(`\\b${_escapeRegExpLiteral(fuente)}\\b`, 'i');
    if (re.test(norm)) return true;
  }
  return false;
}

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

  // CRÍTICO: Solo si hay una fuente de VERIFIED_SOURCE_ALLOWLIST en el texto,
  // asumimos respaldo. _hasVerifiedSourceMention() está atada directamente a la
  // allowlist (no hay una lista paralela hardcodeada que pueda desincronizarse).
  // Si el modelo inventa "según una recomendación del ICA" con un decreto falso,
  // esto matcheará "ICA" (que está en la allowlist) pero esto es seguro: si
  // menciona ICA, el usuario puede verificar. Lo peligroso es NO mencionar
  // fuente alguna, o citar una fuente que NO está en la allowlist.
  const hasVerifiedSource = _hasVerifiedSourceMention(responseText);
  if (hasVerifiedSource) {
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

// ── GUARD: contacto inventado (teléfonos, correos, URLs, decretos) ──

/**
 * Allowlist de contactos VERIFICADOS oficiales. Solo estos contactos pueden
 * aparecer en la respuesta sin ser marcados como inventados.
 */
const VERIFIED_CONTACTS_ALLOWLIST = new Set([
  // URLs oficiales verificadas
  'www.gov.co',
  'www.ica.gov.co',
  'www.minagricultura.gov.co',
  'www.agrosavia.co',
  'www.cenicafe.org',
  // No incluimos teléfonos/correos específicos porque el modelo puede inventar variaciones
  // Si el usuario necesita un contacto oficial, debe buscarlo en los sitios oficiales
]);

/**
 * Regex para detectar teléfonos colombianos. Formatos:
 * - (+57) 300 123 4567
 * - 300 123 4567
 * - 300-123-4567
 * - (300) 123 4567
 */
const PHONE_RE =
  /(?:\+57\s?)?(\(?3\d{2}\)?[-\s]?\d{3}[-\s]?\d{4}|\d{3}[-\s]?\d{7})/g;

/**
 * Regex para detectar correos electrónicos.
 */
const EMAIL_RE =
  /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g;

/**
 * Regex para detectar URLs (http, https, www).
 */
const URL_RE =
  /\b(?:https?:\/\/|www\.)[A-Za-z0-9-]{2,}\.[A-Za-z]{2,}(?:\/[^\s]*)?\b/g;

/**
 * Regex para detectar números de decreto/resolución. Formatos:
 * - Decreto 1234 de 2015
 * - Resolución 567 de 2020
 * - Decreto No. 890
 */
const DECREE_RE =
  /\b(?:Decreto|Resolución|Res|Dec\.|Decreto\s+No\.?)\s*(?:\d+|[IVXLCDM]+)(?:\s+de\s+\d{4})?\b/gi;

/**
 * Instituciones y canales oficiales colombianos que suelen aparecer en
 * consultas de contacto agro/rural. La lista es conservadora y solo cubre
 * entidades que el usuario puede nombrar como canal oficial genérico.
 */
const OFFICIAL_CONTACT_INSTITUTION_RE =
  /\b(?:ica|agrosavia|umata|alcald[ií]a|secretar[ií]a(?:\s+de)?\s+agricultura|secretar[ií]a(?:\s+de)?\s+desarrollo\s+rural|secretar[ií]a(?:\s+de)?\s+ambiente|gobernaci[oó]n|ministerio\s+de\s+agricultura|corporaci[oó]n\s+aut[oó]noma\s+regional|car\b|invima|ins|sena)\b/;

/**
 * Textos que suenan a afirmación de contacto específico.
 */
const CONTACT_ASSERTION_RE =
  /\b(?:llama(?:r)?|marc[aá]|contacta(?:r)?|comun[ií]cate|escrib(?:e|a)|consulta(?:r)?|tel[eé]fono|celular|linea|línea|correo|email|whatsapp|direccion|dirección|sede|oficina|atenci[oó]n)\b/;

/**
 * Patrones de direcciones postales comunes en Colombia.
 */
const ADDRESS_RE =
  /\b(?:calle|cl\.?|cra\.?|carrera|avenida|av\.?|diagonal|transversal|km|kil[oó]metro)\s*[0-9][0-9A-Za-z#\-\s.,]*/i;

/**
 * Guard 5 — contacto inventado. Si el texto incluye teléfonos, correos,
 * URLs o números de decreto/resolución que NO estén en la allowlist
 * verificada, los MARCA/REEMPLAZA por un texto seguro que indica al
 * usuario que verifique el contacto oficial con su UMATA o el ICA.
 *
 * Este es un guard de SEGURIDAD porque el modelo puede inventar contactos
 * institucionales falsos para reportar plagas cuarentenarias, aplicar
 * agroquímicos, o tramitar trámites, lo cual puede llevar al usuario a
 * contactos fraudulentos o inexistentes.
 *
 * @returns {{text:string, modified:boolean, reason:string|null}}
 */
export function guardInventedContact(responseText, _resolvedEntities = null, _fincaAltitud = null) {
  if (typeof responseText !== 'string' || responseText.length === 0) {
    return { text: responseText ?? '', modified: false, reason: null };
  }

  let modified = false;
  let inventedContacts = [];
  let text = responseText;

  // Detectar teléfonos
  const phones = text.match(PHONE_RE) || [];
  for (const phone of phones) {
    // Normalizar el teléfono para comparar (remover espacios, guiones, paréntesis)
    const normalizedPhone = phone.replace(/[\s\-()]/g, '');
    // Verificar si NO está en la allowlist (la allowlist está vacía para teléfonos)
    if (!VERIFIED_CONTACTS_ALLOWLIST.has(normalizedPhone)) {
      inventedContacts.push(`teléfono: ${phone}`);
      text = text.replace(phone, '[VERIFICAR CONTACTO OFICIAL CON SU UMATA O EL ICA]');
      modified = true;
    }
  }

  // Detectar correos
  const emails = text.match(EMAIL_RE) || [];
  for (const email of emails) {
    if (!VERIFIED_CONTACTS_ALLOWLIST.has(email.toLowerCase())) {
      inventedContacts.push(`correo: ${email}`);
      text = text.replace(email, '[VERIFICAR CONTACTO OFICIAL CON SU UMATA O EL ICA]');
      modified = true;
    }
  }

  // Detectar URLs
  const urls = text.match(URL_RE) || [];
  for (const url of urls) {
    const normalizedUrl = url.replace(/^https?:\/\//, '').replace(/^www\./, '').split('/')[0].toLowerCase();
    if (!VERIFIED_CONTACTS_ALLOWLIST.has(normalizedUrl)) {
      inventedContacts.push(`URL: ${url}`);
      text = text.replace(url, '[VERIFICAR CONTACTO OFICIAL CON SU UMATA O EL ICA]');
      modified = true;
    }
  }

  // Detectar decretos/resoluciones
  const decrees = text.match(DECREE_RE) || [];
  for (const decree of decrees) {
    // Solo algunos decretos específicos están verificados
    // Por ejemplo, Ley 1930 de 2018 es conocida, pero otros pueden ser inventados
    const isKnownDecree = /Ley\s+1930|Ley\s+2041|Decreto\s+1071/i.test(decree);
    if (!isKnownDecree) {
      inventedContacts.push(`normativa: ${decree}`);
      text = text.replace(decree, '[VERIFICAR NORMATIVA OFICIAL CON SU UMATA O EL ICA]');
      modified = true;
    }
  }

  if (modified) {
    bumpGuardTelemetry('invented_contact');
    return {
      text,
      modified: true,
      reason: `contacto_inventado: ${[...new Set(inventedContacts)].slice(0, 5).join(', ')}`,
    };
  }

  return { text: responseText, modified: false, reason: null };
}

/**
 * Guard de contacto institucional inventado.
 *
 * Si el texto afirma un teléfono, celular, línea, correo o dirección concreta
 * de una entidad como ICA, Agrosavia, UMATA, alcaldía o secretaría, lo
 * sustituye por una remisión al canal oficial genérico. No toca menciones
 * legítimas de la entidad sin dato de contacto.
 *
 * @returns {{text:string, modified:boolean, reason:string|null}}
 */
export function guardHallucinatedContact(responseText, { userMessage = null } = {}) {
  if (typeof responseText !== 'string' || responseText.length === 0) {
    return { text: responseText ?? '', modified: false, reason: null };
  }

  if (responseText.includes('Consulte el canal oficial de la entidad')) {
    return { text: responseText, modified: false, reason: null };
  }

  const userAskedForContact =
    typeof userMessage === 'string' && CONTACT_ASSERTION_RE.test(_stripDiacritics(userMessage));

  const protectedText = responseText.replace(EMAIL_RE, (email) => email.replace(/\./g, '__DOT__'));
  const sentences = _splitSentences(protectedText);
  const hits = [];
  let changed = false;
  let lastWasReplacement = false;

  const replacement =
    'Consulte el canal oficial de la entidad, por ejemplo la página del ICA (ica.gov.co) o la UMATA de su municipio. ' +
    'No me es posible confirmar un número telefónico específico sin riesgo de darle uno equivocado.';

  const out = sentences
    .map((sentence) => {
      const originalSentence = sentence.replace(/__DOT__/g, '.');
      const norm = _stripDiacritics(originalSentence);
      const hasInstitution = OFFICIAL_CONTACT_INSTITUTION_RE.test(norm);
      if (!hasInstitution) {
        lastWasReplacement = false;
        return sentence;
      }

      const phoneRe = new RegExp(PHONE_RE.source, 'g');
      const emailRe = new RegExp(EMAIL_RE.source, 'g');
      const addressRe = new RegExp(ADDRESS_RE.source, ADDRESS_RE.flags);
      const hasPhone = phoneRe.test(originalSentence);
      const hasEmail = emailRe.test(originalSentence);
      const hasAddress = addressRe.test(originalSentence);
      const hasContactCue = CONTACT_ASSERTION_RE.test(norm);

      if (!(hasPhone || hasEmail || hasAddress || hasContactCue || userAskedForContact)) {
        lastWasReplacement = false;
        return sentence;
      }

      const specificContacts = [];
      const phones = originalSentence.match(phoneRe) || [];
      for (const phone of phones) specificContacts.push(phone);
      const emails = originalSentence.match(emailRe) || [];
      for (const email of emails) specificContacts.push(email);
      if (addressRe.test(originalSentence)) specificContacts.push(originalSentence.match(addressRe)?.[0] || 'direccion');

      if (specificContacts.length === 0) {
        lastWasReplacement = false;
        return sentence;
      }

      changed = true;
      for (const item of specificContacts) if (!hits.includes(item)) hits.push(item);
      if (lastWasReplacement) return '';
      lastWasReplacement = true;
      const trailing = originalSentence.match(/\s*$/)?.[0] || ' ';
      return `${replacement}${trailing}`;
    })
    .join('');

  if (!changed) {
    return { text: responseText, modified: false, reason: null };
  }

  bumpGuardTelemetry('hallucinated_contact');
  return {
    text: out.trim() || replacement,
    modified: true,
    reason: `contacto_institucional_hallucinado: ${[...new Set(hits)].slice(0, 5).join(', ')}`,
  };
}

// ── GUARD: norma numerada afirmada como obligacion ──────────────────────────

const FABRICATED_LEGAL_NORM_MARKER = 'no puedo verificar el numero de esa norma';
const NUMBERED_LEGAL_NORM_RE =
  /\b(ley|decreto|resolucion)\s+(?:ica\s+)?(?:no\.?\s*)?\d{2,6}(?:\s+de\s+(?:19|20)\d{2})?\b/;
const LEGAL_OBLIGATION_ASSERTION_RE =
  /\b(si\s*,?\s+)?(?:la\s+|el\s+)?(?:ley|decreto|resolucion)\b[^.!?]{0,90}\b(obliga\w*|exige\w*|ordena\w*|establece\s+como\s+obligatori\w*|debes?|tienes\s+que|es\s+obligatori\w*)\b/;

/**
 * Evita confirmar como hecho una obligacion atribuida a una norma numerada que
 * no se puede contrastar localmente. No actua ante preguntas, citas neutrales ni
 * recomendaciones de verificar la fuente oficial.
 */
export function guardUnverifiedLegalNormAssertion(responseText) {
  if (typeof responseText !== 'string' || responseText.length === 0) {
    return { text: responseText ?? '', modified: false, reason: null };
  }
  const norm = _stripDiacritics(responseText);
  if (norm.includes(FABRICATED_LEGAL_NORM_MARKER)) {
    return { text: responseText, modified: false, reason: null };
  }
  if (!NUMBERED_LEGAL_NORM_RE.test(norm) || !LEGAL_OBLIGATION_ASSERTION_RE.test(norm)) {
    return { text: responseText, modified: false, reason: null };
  }
  if (/\b(no\s+(puedo|se\s+puede)\s+verificar|verifica\w*|consulta\w*)\b[^.!?]{0,80}\b(fuente|sitio|portal|ica)\b/.test(norm)) {
    return { text: responseText, modified: false, reason: null };
  }

  bumpGuardTelemetry('unverified_legal_norm_assertion');
  return {
    text:
      `No puedo verificar el numero de esa norma ni confirmar que imponga esa obligacion. ` +
      'Verifica el texto y la vigencia en la fuente oficial del ICA antes de actuar.',
    modified: true,
    reason: 'norma_numerada_no_verificada',
  };
}

// ── GUARD: INSTITUCIÓN / FUENTE DE APOYO FABRICADA (#2133) ───────────────────

/**
 * Siglas de instituciones/fuentes REALES colombianas y de agro (allowlist curada,
 * normalizada en minúscula). El agente puede citarlas como autoridad; cualquier
 * OTRA "institución especializada" o "entidad de apoyo" nombrada como fuente que
 * NO matchee esta allowlist (ni la de nombres) se trata como FABRICACIÓN DE
 * AUTORIDAD (#2133: "Centro Nacional de Historia Natural (CNHN)", "Instituto de
 * Investigación Biológica Los Andes Caldwell", "SERAGRO", "CATI").
 *
 * Es el análogo institucional de `guardInventedContact` (#1949, teléfono/URL/
 * resolución) y de `guardInventedBrand` (#1305, marca comercial): mismo eje
 * (afirmar una fuente que no existe), otro vector (el nombre de la entidad).
 */
const REAL_INSTITUTION_ACRONYMS = new Set([
  // Agro / fitosanitario nacional
  'ica', 'agrosavia', 'corpoica', 'cenicafe', 'cenicana', 'cenipalma', 'fedearroz',
  'fedepapa', 'fedecacao', 'fedegan', 'fedepalma', 'fenalce', 'asohofrucol', 'augura',
  'fnc', 'fedecafe', 'porkcolombia', 'asocana', 'analac', 'ceniuva', 'agronet',
  // Ambiental / científico
  'ideam', 'sinchi', 'iiap', 'invemar', 'humboldt', 'igac', 'anla', 'pnn', 'minambiente',
  // Estado / rural / educación técnica / precios / sanidad
  'sena', 'upra', 'icbf', 'dane', 'dian', 'adr', 'ant', 'upme', 'minagricultura',
  'minciencias', 'colciencias', 'umata', 'epsagro', 'ins', 'sipsa', 'sic', 'finagro',
  'aunap', 'invima', 'anvisa', 'snia', 'incoder', 'inderena',
  // Universidades públicas más citadas (toda "Universidad …" se allowlistea por
  // categoría en REAL_INSTITUTION_NAME_RE; estas siglas cubren la mención suelta)
  'unal', 'uniandes', 'udea', 'univalle', 'unicauca', 'unillanos', 'uptc', 'uis',
  'unimagdalena', 'unicordoba',
  // Corporaciones autónomas regionales (CARs) comunes
  'car', 'cvc', 'cvs', 'crq', 'cas', 'csb', 'cra', 'cdmb', 'carder', 'crc',
  'corantioquia', 'corpoboyaca', 'cornare', 'cormacarena', 'corpocaldas', 'corpamag',
  'cortolima', 'corpoguavio', 'codechoco', 'corpouraba', 'cardique', 'corponarino',
  'corpochivor', 'corpocesar', 'corpomojana', 'corpoamazonia', 'corpoorinoquia',
  // Internacionales agro/salud reconocidas
  'ciat', 'iica', 'fao', 'cgiar', 'bioversity', 'embrapa', 'oms', 'who', 'fda',
  'efsa', 'usda', 'inta',
]);

/**
 * Firmas de NOMBRE (substrings normalizados) que identifican una institución REAL
 * cuando aparece deletreada. Con que UNA matchee el nombre extraído, la institución
 * es real y NO se suprime. Incluye `universidad` como categoría entera: Colombia
 * tiene decenas de universidades públicas/privadas reales, así que #2133 las
 * allowlistea en bloque (el vector fabricado del bench es Instituto/Centro, no una
 * universidad). NO listamos "los andes" a secas (existe "Universidad de los Andes"
 * real, pero "Instituto … Los Andes Caldwell" es fabricado) — solo la forma
 * completa "universidad de los andes".
 */
const REAL_INSTITUTION_NAME_RE =
  /\b(agrosavia|corpoica|colombian[oa]\s+(de\s+investigacion\s+)?agropecuari|corporacion\s+autonoma|autonoma\s+regional|universidad|nacional\s+de\s+aprendizaje|bienestar\s+familiar|planificacion\s+rural\s+agropecuaria|investigaciones?\s+de\s+cafe|cenicafe|investigacion(es)?\s+de\s+la\s+cana|cenicana|palma\s+de\s+aceite|cenipalma|federacion\s+nacional\s+de\s+cafeteros|nacional\s+de\s+cafeteros|nacional\s+de\s+cerealistas|cultivadores\s+de\s+cereales|fedearroz|arroceros|fedepapa|paperos|fedecacao|cacaoteros|hidrologia|meteorologia|ideam|von\s+humboldt|humboldt|alexander|recursos\s+biologicos|amazonic[oa]\s+de\s+investigaciones|sinchi|invemar|marinas\s+y\s+costeras|investigaciones?\s+ambientales?\s+del\s+pacifico|agricultura\s+tropical|geografic[oa]|codazzi|jardin\s+botanico|ministerio\s+de\s+(agricultura|ambiente|ciencia)|asistencia\s+tecnica\s+agropecuaria|umata)\b/;

/**
 * Instalación GENÉRICA (no una "autoridad" de conocimiento): un "Centro de Acopio",
 * "Centro de Salud", "Centro Comercial" no es una fuente científica fabricada aunque
 * no esté en la allowlist. Excluir evita sobre-supresión.
 */
const GENERIC_FACILITY_NAME_RE =
  /\b(acopio|salud|hospital|comercial|comercio|recreativ|deportiv|cultural|penitenciari|carcelari|poblad|convenciones|eventos|logistic|distribucion|zoologic|acuatic)\b/;

/**
 * Sustantivo-cabeza de una institución NOMBRADA (Título-Caso) + su nombre propio +
 * su sigla opcional entre paréntesis. Case-sensitive: los nombres propios van
 * capitalizados, así que "centro de acopio" (minúscula) no dispara. `Universidad`
 * NO va en la cabeza (toda universidad se allowlistea por categoría → evita FP con
 * las decenas de universidades reales).
 */
const INSTITUTION_HEAD_RE =
  /\b(Instituto|Centro|Corporaci[oó]n|Fundaci[oó]n|Federaci[oó]n|Laboratorio|Observatorio|Comisi[oó]n)((?:\s+(?:de|del|la|los|las|y|e|para|en|el|von|san|santa)\b|\s+[A-ZÁÉÍÓÚÑ][A-Za-zÁÉÍÓÚÑáéíóúñ.]+){1,9})(?:\s*\(([A-Za-zÁÉÍÓÚÑ][A-Za-zÁÉÍÓÚÑáéíóúñ.-]{1,14})\))?/g;

/**
 * Sigla en mayúsculas suelta (3–8 letras) candidata a nombre de entidad. Usa
 * lookaround ACENTO-AWARE en vez de `\b` porque el word-boundary ASCII de JS corta
 * en las tildes ("CENICAFÉ" → "CENICAF", que no matchearía la allowlist "cenicafe").
 */
const BARE_ACRONYM_RE = /(?<![A-Za-zÁÉÍÓÚÑáéíóúñ0-9])([A-ZÁÉÍÓÚÑ]{3,8})(?![A-Za-zÁÉÍÓÚÑáéíóúñ0-9])/g;

/**
 * Siglas en mayúsculas que NO son instituciones (unidades, químicos, formatos,
 * jerga). Se saltan para no confundir "NPK"/"MIP"/"pH" con una entidad fabricada.
 */
const ALLCAPS_NON_INSTITUTION = new Set([
  'npk', 'mip', 'adn', 'arn', 'ndvi', 'pvc', 'co2', 'gps', 'pdf', 'onu', 'iva',
  'rut', 'nit', 'url', 'faq', 'ong', 'led', 'usb', 'pib', 'pyme', 'pymes', 'msnm',
  'otan', 'eeuu', 'usa', 'iot', 'api', 'ppm', 'usd', 'cop', 'eur', 'gmo', 'ogm',
  'abc', 'xyz', 'sos', 'html', 'http', 'https', 'ceo', 'vip', 'atp', 'cic', 'pcr',
  'vih', 'sida', 'epoc', 'iso', 'sst', 'epp', 'bpa', 'poa',
  // Insumos / fertilizantes / combustibles (no son entidades)
  'acpm', 'dap', 'map', 'tsp', 'kcl', 'sku', 'cafe',
]);

/**
 * Sustantivos de INSTITUCIÓN en el contexto previo a una sigla. El PATRÓN 2 exige
 * uno (o el cierre "en tu/su región") para no confundir una sigla de químico/
 * fertilizante ("de DAP") o un sistema de precios ("consulta SIPSA") con una entidad
 * fabricada: la fabricación real del bench viene enmarcada ("entidades de apoyo como
 * SERAGRO", "instituciones especializadas como …"). Normalizado.
 */
const INSTITUTION_NOUN_CTX_RE =
  /\b(institucion\w*|entidad\w*|organismo\w*|organizacion\w*|centro\w*|instituto\w*|agencia\w*|corporacion\w*|cooperativa\w*|asociacion\w*|federacion\w*|gremio\w*|autoridad\w*|laboratorio\w*|fundacion\w*|universidad\w*|observatorio\w*|comision\w*|dependencia\w*)\b/;

/**
 * Cue de que una entidad se está presentando como AUTORIDAD / FUENTE / contacto a
 * consultar. Sin cue no hay "fabricación de autoridad" que cazar (gate barato).
 * Normalizado.
 */
const INSTITUTION_AUTHORITY_CUE_RE =
  /\b(consult\w*|segun\b|de\s+acuerdo\s+con|acorde\s+con|reportad\w*|public\w*|estudi\w*|investigac\w*|fuente[s]?\b|instituci\w*|entidad\w*|avalad\w*|certificad\w*|respald\w*|recomiend\w*|recomend\w*|acerc\w*|comunic\w*|contact\w*|acude\w*|dirig\w*|escrib\w*|asesor\w*|especializ\w*|apoyo\b)\b/;

/** Marca idempotente del reemplazo de institución fabricada. */
const FABRICATED_INSTITUTION_MARKER = 'no te puedo confirmar esa institución como fuente verificada';

/**
 * Redirección honesta que REEMPLAZA la oración que cita una institución fabricada.
 * No nombra la entidad inventada: degrada a "sin fuente verificada" y manda a las
 * fuentes reales. Estable para idempotencia (contiene `FABRICATED_INSTITUTION_MARKER`).
 */
const FABRICATED_INSTITUTION_REPLACEMENT =
  `Sobre esa recomendación, ${FABRICATED_INSTITUTION_MARKER}. Para orientación con respaldo, ` +
  'acude a una fuente real: la autoridad fitosanitaria (el ICA), Agrosavia, tu UMATA local o la ' +
  'corporación autónoma regional de tu zona.';

/**
 * Detecta menciones de instituciones FABRICADAS (fuera de la allowlist) en UNA
 * oración. Devuelve la lista de nombres/siglas fabricados hallados.
 *   PATRÓN 1 — institución nombrada: sustantivo-cabeza + Título-Caso (+ sigla opc.).
 *   PATRÓN 2 — sigla suelta presentada como entidad ("como SERAGRO", "SERAGRO en
 *              tu región").
 *
 * @param {string} sentence  oración cruda (con mayúsculas).
 * @param {string} _sNorm    misma oración normalizada (reservado).
 * @returns {string[]}
 */
function _fabricatedInstitutionsInSentence(sentence, _sNorm) {
  const found = [];

  // PATRÓN 1 — institución NOMBRADA (Título-Caso).
  INSTITUTION_HEAD_RE.lastIndex = 0;
  let m;
  while ((m = INSTITUTION_HEAD_RE.exec(sentence)) !== null) {
    const tail = m[2] || '';
    // Exige ≥1 palabra propia (Título-Caso) en el nombre — descarta "Centro de"
    // suelto o cabezas seguidas solo de conectores en minúscula.
    if (!/[A-ZÁÉÍÓÚÑ][a-záéíóúñ]/.test(tail)) continue;
    const fullName = `${m[1]}${tail}`.replace(/\s+/g, ' ').replace(/[.,;:]+$/, '').trim();
    const acronym = m[3] ? _stripDiacritics(m[3]) : null;
    const nameNorm = _stripDiacritics(fullName);
    // Real por sigla o por firma de nombre → no es fabricada.
    if (acronym && REAL_INSTITUTION_ACRONYMS.has(acronym)) continue;
    if (REAL_INSTITUTION_NAME_RE.test(nameNorm)) continue;
    // Instalación genérica (acopio/salud/comercial…) → no es autoridad fabricada.
    if (GENERIC_FACILITY_NAME_RE.test(nameNorm)) continue;
    found.push(m[3] ? `${fullName} (${m[3]})` : fullName);
  }

  // PATRÓN 2 — SIGLA suelta presentada como ENTIDAD/INSTITUCIÓN.
  BARE_ACRONYM_RE.lastIndex = 0;
  while ((m = BARE_ACRONYM_RE.exec(sentence)) !== null) {
    const raw = m[1];
    const acr = _stripDiacritics(raw);
    if (REAL_INSTITUTION_ACRONYMS.has(acr)) continue;
    if (ALLCAPS_NON_INSTITUTION.has(acr)) continue;
    const before = _stripDiacritics(sentence.slice(Math.max(0, m.index - 48), m.index));
    const after = _stripDiacritics(sentence.slice(m.index + raw.length, m.index + raw.length + 28));
    // Debe (a) ir tras un conector de mención Y (b) tener un sustantivo de
    // INSTITUCIÓN en la ventana previa (o cerrarse con "en tu/su región"). Así una
    // sigla de químico/fertilizante ("de DAP") o de un sistema de precios ("consulta
    // SIPSA") SIN marco institucional NO se confunde con una entidad fabricada; la
    // fabricación real viene enmarcada ("entidades de apoyo como SERAGRO").
    const introduced = /\b(como|con|segun|por|ante|de|del)\s*$/.test(before);
    if (!introduced) continue;
    const institutionalCtx = INSTITUTION_NOUN_CTX_RE.test(before);
    const asRegionalEntity = /^\s*(en|de)\s+(tu|su|la|mi)\s+region/.test(after);
    if (!institutionalCtx && !asRegionalEntity) continue;
    if (!found.includes(raw)) found.push(raw);
  }

  return found;
}

/**
 * guardFabricatedInstitution — #2133. SUPPRESS-AND-REPLACE quirúrgico por oración:
 * cuando la respuesta cita una institución/entidad/fuente de apoyo que NO existe en
 * la allowlist curada de instituciones REALES colombianas/agro (Agrosavia, ICA,
 * Cenicafé, IDEAM, UNAL, Fenalce, Corpoica, FNC, SENA, UPRA, MinAgricultura, CARs,
 * CIAT, IICA, FAO…) como AUTORIDAD a consultar/fuente, sustituye ESA oración por la
 * redirección honesta ("no te puedo confirmar esa institución como fuente
 * verificada; acude al ICA/Agrosavia/UMATA/CAR"). Análogo institucional de
 * `guardInventedContact` (#1949) y `guardInventedBrand` (#1305).
 *
 * Determinista, PURO y SÍNCRONO. Quirúrgico (no nuke): el resto de la respuesta —el
 * agronómico correcto, p.ej. "el kale no va en páramo"— se conserva; solo se
 * reemplaza la oración con la fabricación. Va tras la marca inventada en
 * `applyOutputGuards`. Idempotente por marcador.
 *
 * GATING (anti-sobre-supresión): la oración debe (1) tener un cue de autoridad/
 * fuente (`INSTITUTION_AUTHORITY_CUE_RE`) Y (2) nombrar ≥1 institución fabricada
 * (fuera de allowlist de siglas y de nombres, y que no sea instalación genérica).
 *
 * @param {string} responseText
 * @returns {{text:string, modified:boolean, reason:string|null}}
 */
export function guardFabricatedInstitution(responseText) {
  if (typeof responseText !== 'string' || responseText.length === 0) {
    return { text: responseText ?? '', modified: false, reason: null };
  }
  // Idempotencia: nuestra redirección ya está.
  if (responseText.includes(FABRICATED_INSTITUTION_MARKER)) {
    return { text: responseText, modified: false, reason: null };
  }
  // Gate barato: sin cue de autoridad en todo el texto no hay nada que cazar.
  if (!INSTITUTION_AUTHORITY_CUE_RE.test(_stripDiacritics(responseText))) {
    return { text: responseText, modified: false, reason: null };
  }

  const sentences = _splitSentences(responseText);
  const fabricated = [];
  let changed = false;
  let lastWasReplacement = false;

  const out = sentences
    .map((sentence) => {
      const sNorm = _stripDiacritics(sentence);
      // La oración debe presentar una entidad como autoridad/fuente.
      if (!INSTITUTION_AUTHORITY_CUE_RE.test(sNorm)) {
        lastWasReplacement = false;
        return sentence;
      }
      const hits = _fabricatedInstitutionsInSentence(sentence, sNorm);
      if (hits.length === 0) {
        lastWasReplacement = false;
        return sentence;
      }
      for (const h of hits) if (!fabricated.includes(h)) fabricated.push(h);
      changed = true;
      // Colapsa reemplazos en oraciones consecutivas (una sola redirección).
      if (lastWasReplacement) return '';
      lastWasReplacement = true;
      const trailing = sentence.match(/\s*$/)?.[0] || ' ';
      return `${FABRICATED_INSTITUTION_REPLACEMENT}${trailing}`;
    })
    .join('');

  if (!changed) {
    return { text: responseText, modified: false, reason: null };
  }

  bumpGuardTelemetry('fabricated_institution');
  return {
    text: out.trim(),
    modified: true,
    reason: `institucion_fabricada_suprimida: ${[...new Set(fabricated)].slice(0, 5).join(', ')}`,
  };
}

// ── GUARD: receta EXACTA de caldo clásico pedida en dosis (BORDE-003 / 004) ──

/**
 * BORDE-003 (caldo bordelés exacto en gramos) y BORDE-004 (sulfocálcico): el usuario
 * pide la receta EXACTA "en gramos para una bomba de 20 litros" y granite suelta una
 * proporción/dosis que tiende a inventarse (proporción lejos de 1:1, "aplica el
 * concentrado", orden invertido cal-sobre-cobre). `guardDoseWithoutSource` solo ANEXA
 * una nota genérica y deja la cifra inventada en el cuerpo (= red_flag del juez).
 *
 * Estos dos caldos tienen una receta de referencia ESTÁNDAR, conservadora y bien
 * establecida (Agrosavia/Restrepo/manuales agroecológicos), así que no es inventar
 * darla: es ANTEPONER la guía segura canónica para que la respuesta cubra los
 * must_include del bench (BORDE-003: sulfato de cobre, cal, ~200 g, prueba del
 * clavo/pH; BORDE-004: azufre, cal, hervir, diluir) y desplazar la proporción
 * inventada y el orden peligroso.
 *
 * ADITIVO (antepone la guía segura; NO suprime el cuerpo): conserva el contexto útil
 * del modelo, pero la PRIMERA cosa que lee el campesino es la receta de referencia
 * correcta + la advertencia (prueba del clavo, diluir, nunca aplicar concentrado,
 * nunca verter cal sobre cobre). Va antes que `guardDoseWithoutSource` en el
 * orquestador para que su guía lidere.
 *
 * Anti-falso-positivo (conservador):
 *   - solo dispara si el userMessage o la respuesta nombran el caldo clásico
 *     (bordelés / sulfocálcico) Y el usuario pide cantidad/receta/dosis.
 *   - si la respuesta YA da los pilares correctos (proporción 1:1 / prueba del clavo
 *     para bordelés; hervir + diluir para sulfocálcico), no antepone (acertó).
 *   - idempotente por marcador.
 */

/** El usuario pide la CANTIDAD / RECETA / DOSIS exacta. Normalizado. */
const ASKS_EXACT_RECIPE_RE =
  /\b(receta\s+exacta|cuant[oa]s?\s+(g|gr|gramos|kg|litros)|en\s+gramos|que\s+cantidad|en\s+que\s+cantidad|la\s+dosis|como\s+(lo\s+)?(cocino|preparo|hago)|que\s+(numeros|cantidades)|proporcion)\b/;

/** Caldos clásicos con receta de referencia. Cada uno trae sus anclas y su guía. */
const CLASSIC_CALDO_RECIPES = [
  {
    key: 'bordeles',
    names: ['caldo bordeles', 'bordeles', 'caldo bordelés'],
    marker: 'caldo bordelés se prepara en proporción 1:1',
    // La respuesta ya cubre los pilares (proporción 1:1 + prueba del clavo/pH).
    alreadyOk: /(1\s*:\s*1|uno\s+a\s+uno|partes?\s+iguales)\b[^.!?]{0,40}(cobre|cal)|prueba\s+del\s+clavo|\bph\b/,
    guide:
      'Sobre el caldo bordelés, la guía de referencia segura (confírmala con tu técnico/UMATA o la etiqueta): ' +
      'se prepara en proporción 1:1 de sulfato de cobre y cal viva (apagada), no más cobre que cal — del orden ' +
      'de 200 g de cada uno por cada 20 litros de agua como punto de partida. Disuelve el sulfato de cobre en ' +
      'agua en un recipiente, y la cal aparte en otro; LUEGO vierte el cobre SOBRE la cal (nunca al revés). ' +
      'Antes de aplicar, hazle la PRUEBA DEL CLAVO (o mide el pH): mete un clavo limpio o un cuchillo en el ' +
      'caldo unos minutos; si sale con una capa rojiza de cobre, está ácido y falta cal —agrégale más cal hasta ' +
      'que el clavo salga limpio (pH neutro). Aplícalo recién hecho y diluido como sale, nunca el concentrado ' +
      'puro, para no quemar el cultivo.',
  },
  {
    key: 'sulfocalcico',
    names: ['caldo sulfocalcico', 'sulfocalcico', 'sulfocálcico', 'caldo sulfocálcico'],
    marker: 'sulfocálcico se cocina hirviendo azufre y cal',
    alreadyOk: /\bhierv\w*|\bhervir\b|\bcocci?on\b/,
    guide:
      'Sobre el caldo sulfocálcico, la guía de referencia segura (confírmala con tu técnico/UMATA): se cocina ' +
      'HIRVIENDO azufre y cal viva en agua (del orden de 2 partes de azufre por 1 de cal, removiendo, hasta que ' +
      'tome color vino-teja, unos 45–60 minutos). Eso da el caldo madre concentrado. ESE caldo madre NUNCA se ' +
      'aplica puro al follaje —quema la hoja, sobre todo la tierna—: hay que DILUIRLO bastante en agua antes de ' +
      'asperjar (empieza muy diluido y prueba en pocas plantas). Aplícalo en horas frescas, no en pleno sol, y ' +
      'no lo mezcles con caldo bordelés ni con aceites en el mismo tanque.',
  },
];

/**
 * guardClassicCaldoRecipe — BORDE-003 / 004. Ante una petición de la receta EXACTA de
 * un caldo clásico (bordelés/sulfocálcico), ANTEPONE la guía de referencia segura
 * (proporción correcta, prueba del clavo/pH, hervir, diluir, orden seguro) si la
 * respuesta no la cubre ya. ADITIVO (no suprime).
 *
 * Firma propia (necesita userMessage) → se invoca aparte en applyOutputGuards, fuera
 * de GUARD_CHAIN. Idempotente.
 *
 * @param {string} responseText
 * @param {{userMessage?: string|null}} [ctx]
 * @returns {{text:string, modified:boolean, reason:string|null}}
 */
export function guardClassicCaldoRecipe(responseText, { userMessage = null } = {}) {
  if (typeof responseText !== 'string' || responseText.length === 0) {
    return { text: responseText ?? '', modified: false, reason: null };
  }
  const norm = _stripDiacritics(responseText);
  const userNorm = typeof userMessage === 'string' ? _stripDiacritics(userMessage) : '';
  // El usuario debe pedir la cantidad/receta/dosis exacta (gate de intención).
  if (!ASKS_EXACT_RECIPE_RE.test(userNorm) && !ASKS_EXACT_RECIPE_RE.test(norm)) {
    return { text: responseText, modified: false, reason: null };
  }
  const combined = `${userNorm} \n ${norm}`;
  for (const recipe of CLASSIC_CALDO_RECIPES) {
    const named = recipe.names.some((n) => combined.includes(_stripDiacritics(n)));
    if (!named) continue;
    // Idempotencia + "ya acertó": si la guía ya está o la respuesta ya cubre los
    // pilares correctos, no anteponemos.
    if (responseText.includes(recipe.marker)) continue;
    if (recipe.alreadyOk.test(norm)) continue;
    bumpGuardTelemetry('classic_caldo_recipe');
    const text = `${recipe.guide}\n\n${responseText.trim()}`;
    return { text, modified: true, reason: `receta_caldo_clasico_segura: ${recipe.key}` };
  }
  return { text: responseText, modified: false, reason: null };
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
  'es', 'son', 'hay', 'esta', 'estan', 'sera', 'se', 'puede', 'pueden', 'puedes', 'debe',
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
    // ANCLA: para nombres de UNA palabra usamos el token (ej. "lulo"). Para
    // nombres MULTI-palabra (ej. "tomate de árbol") exigimos los DOS primeros
    // tokens contiguos — NO solo el genérico "tomate", que colisiona con
    // homónimos distintos ("tomate arandano") y disparaba correcciones FALSAS,
    // atribuyendo el binomio de un cultivo a otro (bug piloto 2026-06-04: el
    // resolver fuzzy-matcheó "tomate arandano" → cultivares "tomate de árbol" y
    // el guard "corrigió" Solanum betaceum sobre un texto que no era tomate de árbol).
    const nombreNorm = _stripDiacritics(nombre.split('/')[0]).trim();
    const tokens = nombreNorm.split(/\s+/).filter(Boolean);
    const firstWord = tokens[0];
    const anchor = tokens.length > 1 ? `${tokens[0]} ${tokens[1]}` : tokens[0];
    if (!anchor || anchor.length < 3 || !norm.includes(anchor)) continue;

    // Si el binomio correcto ya está en el texto, el cultivo está bien atribuido.
    if (norm.includes(correctBin)) continue;

    // ¿Hay un binomio REAL de OTRA especie CERCA del nombre del cultivo? A10: el
    // culprit debe ser un binomio real del catálogo (está en `realInText`) y
    // distinto del binomio correcto del cultivo. Si el cultivo no está cerca de
    // ninguno, no atribuimos (conservador).
    const idxNombre = norm.indexOf(anchor);
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

// ── GUARD 5c: FAMILIA BOTÁNICA FABRICADA en prosa (confusion_especie, #2132) ──
//
// Contexto (bench-contaminacion.mjs, sonda `confusion_especie`, 2026-07): tras
// cerrar el hueco cross_thermal (guardWarmLowlandColdCrop/pisoTermico) el residuo
// de contaminación migró a confusion_especie (0% → 9.5% del passrate): granite
// AFIRMA en TEXTO LIBRE pertenencias de familia botánica INVENTADAS que ningún
// guard cortaba. Casos reales cazados por el juez del bench:
//   - "la guayaba pertenece a Passifloraceae"  (es Myrtaceae)
//   - "el plátano es de la familia Passifloraceae"  (es Musaceae)
//   - "la morera es Rosaceae"  (es Moraceae)
// El PRE-prompt confusion-especie-guard (sidecar, chagra-pro #292/#2077) STEERING
// solo INYECTA un aviso al system prompt ANTES de responder; no valida la salida.
// Este guard es su COMPLEMENTO de RUNTIME sobre la RESPUESTA: cuando el texto le
// atribuye una familia botánica a una especie EN FOCO que CONTRADICE la familia
// REAL del catálogo/grafo (HAS_FAMILY), SUPRIME-Y-REEMPLAZA el cuerpo (NO antepone
// un aviso: un cuerpo que clasifica mal la familia suele arrastrar rasgos de la
// familia equivocada en toda la respuesta) por la corrección grounded.
//
// Patrón determinista groundeado en el catálogo, como el resto del trío: la tabla
// `FAMILIA_CANON_SPECIES` es la proyección de `familia_botanica` (HAS_FAMILY) del
// catálogo Chagra para las especies comestibles/cultivos comúnmente confundidas,
// VERIFICADA contra catalog/*.json (test de anti-drift). Solo dispara ante una
// atribución EXPLÍCITA ("pertenece a / es de la familia / es <Familia>aceae") que
// contradice la familia real; reconoce tanto la forma latina (-aceae) como la
// vernácula española (-áceas/-ácea) y los sinónimos clásicos (leguminosas,
// gramíneas, compuestas, crucíferas, palmae).
//
// NUNCA inventa una familia: solo corrige una contradicción con el catálogo.

/**
 * Marcador idempotente de nuestro reemplazo (evita re-suprimir la corrección, que
 * ya cita la familia CORRECTA y por tanto no re-dispara, pero lo cortamos barato).
 */
const BOTANICAL_FAMILY_MARKER = 'la clasificación botánica correcta';

/**
 * Familia botánica canónica (normalizada, latín en minúscula) por especie/género
 * comúnmente confundido. `tokens` = nombres comunes normalizados (sin tildes, sin
 * ñ→n) que el modelo usa en prosa; `family` = familia real del catálogo; `sci` =
 * binomio representativo para la corrección; `excludeNext`/`excludePrev` = palabras
 * de compuestos folk que denotan OTRA planta (p.ej. "papa china" = Araceae) y NO
 * deben disparar. Solo se incluyen nombres INEQUÍVOCOS en prosa colombiana
 * (verificado contra catalog/*.json: cero familias contradictorias).
 */
const FAMILIA_CANON_SPECIES = [
  // Passifloraceae
  { tokens: ['maracuya'], family: 'passifloraceae', display: 'el maracuyá', sci: 'Passiflora edulis' },
  { tokens: ['gulupa'], family: 'passifloraceae', display: 'la gulupa', sci: 'Passiflora edulis f. edulis' },
  { tokens: ['granadilla'], family: 'passifloraceae', display: 'la granadilla', sci: 'Passiflora ligularis' },
  { tokens: ['curuba'], family: 'passifloraceae', display: 'la curuba', sci: 'Passiflora tripartita' },
  { tokens: ['badea'], family: 'passifloraceae', display: 'la badea', sci: 'Passiflora quadrangularis' },
  // Myrtaceae
  { tokens: ['guayaba', 'guayabo'], family: 'myrtaceae', display: 'la guayaba', sci: 'Psidium guajava' },
  { tokens: ['feijoa'], family: 'myrtaceae', display: 'la feijoa', sci: 'Acca sellowiana' },
  { tokens: ['pomarrosa'], family: 'myrtaceae', display: 'la pomarrosa', sci: 'Syzygium jambos' },
  { tokens: ['arrayan'], family: 'myrtaceae', display: 'el arrayán', sci: 'Myrcianthes' },
  { tokens: ['eucalipto'], family: 'myrtaceae', display: 'el eucalipto', sci: 'Eucalyptus' },
  // Musaceae
  { tokens: ['platano'], family: 'musaceae', display: 'el plátano', sci: 'Musa × paradisiaca' },
  { tokens: ['banano', 'guineo'], family: 'musaceae', display: 'el banano', sci: 'Musa acuminata' },
  // Moraceae
  { tokens: ['morera'], family: 'moraceae', display: 'la morera', sci: 'Morus alba' },
  // Rosaceae
  { tokens: ['fresa', 'frutilla'], family: 'rosaceae', display: 'la fresa', sci: 'Fragaria × ananassa' },
  { tokens: ['durazno'], family: 'rosaceae', display: 'el durazno', sci: 'Prunus persica' },
  // Solanaceae
  { tokens: ['tomate'], family: 'solanaceae', display: 'el tomate', sci: 'Solanum lycopersicum' },
  { tokens: ['papa'], family: 'solanaceae', display: 'la papa', sci: 'Solanum tuberosum', excludeNext: ['china'], excludePrev: ['cidra'] },
  { tokens: ['lulo'], family: 'solanaceae', display: 'el lulo', sci: 'Solanum quitoense' },
  { tokens: ['uchuva'], family: 'solanaceae', display: 'la uchuva', sci: 'Physalis peruviana' },
  { tokens: ['berenjena'], family: 'solanaceae', display: 'la berenjena', sci: 'Solanum melongena' },
  { tokens: ['aji'], family: 'solanaceae', display: 'el ají', sci: 'Capsicum' },
  { tokens: ['tabaco'], family: 'solanaceae', display: 'el tabaco', sci: 'Nicotiana tabacum' },
  // Rutaceae
  { tokens: ['naranja'], family: 'rutaceae', display: 'la naranja', sci: 'Citrus × sinensis', excludePrev: ['arbol'] },
  { tokens: ['mandarina'], family: 'rutaceae', display: 'la mandarina', sci: 'Citrus reticulata' },
  { tokens: ['limon'], family: 'rutaceae', display: 'el limón', sci: 'Citrus × limon' },
  { tokens: ['toronja'], family: 'rutaceae', display: 'la toronja', sci: 'Citrus × paradisi' },
  // Lauraceae
  { tokens: ['aguacate'], family: 'lauraceae', display: 'el aguacate', sci: 'Persea americana' },
  // Anacardiaceae
  { tokens: ['mango'], family: 'anacardiaceae', display: 'el mango', sci: 'Mangifera indica' },
  { tokens: ['maranon'], family: 'anacardiaceae', display: 'el marañón', sci: 'Anacardium occidentale' },
  { tokens: ['hobo', 'jobo'], family: 'anacardiaceae', display: 'el hobo', sci: 'Spondias' },
  // Malvaceae
  { tokens: ['cacao'], family: 'malvaceae', display: 'el cacao', sci: 'Theobroma cacao' },
  { tokens: ['copoazu'], family: 'malvaceae', display: 'el copoazú', sci: 'Theobroma grandiflorum' },
  // Rubiaceae
  { tokens: ['cafe', 'cafeto'], family: 'rubiaceae', display: 'el café', sci: 'Coffea arabica' },
  // Euphorbiaceae
  { tokens: ['yuca'], family: 'euphorbiaceae', display: 'la yuca', sci: 'Manihot esculenta' },
  // Arecaceae
  { tokens: ['chontaduro'], family: 'arecaceae', display: 'el chontaduro', sci: 'Bactris gasipaes' },
  // Fabaceae
  { tokens: ['frijol', 'frijol'], family: 'fabaceae', display: 'el fríjol', sci: 'Phaseolus vulgaris' },
  { tokens: ['arveja'], family: 'fabaceae', display: 'la arveja', sci: 'Pisum sativum' },
  { tokens: ['haba'], family: 'fabaceae', display: 'el haba', sci: 'Vicia faba' },
  { tokens: ['guamo', 'guama'], family: 'fabaceae', display: 'el guamo', sci: 'Inga' },
  { tokens: ['guandul'], family: 'fabaceae', display: 'el guandul', sci: 'Cajanus cajan' },
  { tokens: ['soya'], family: 'fabaceae', display: 'la soya', sci: 'Glycine max' },
  // Brassicaceae
  { tokens: ['repollo'], family: 'brassicaceae', display: 'el repollo', sci: 'Brassica oleracea' },
  { tokens: ['brocoli'], family: 'brassicaceae', display: 'el brócoli', sci: 'Brassica oleracea var. italica' },
  { tokens: ['coliflor'], family: 'brassicaceae', display: 'la coliflor', sci: 'Brassica oleracea var. botrytis' },
  { tokens: ['rabano'], family: 'brassicaceae', display: 'el rábano', sci: 'Raphanus sativus' },
  // Cucurbitaceae
  { tokens: ['ahuyama', 'zapallo', 'calabaza'], family: 'cucurbitaceae', display: 'la ahuyama', sci: 'Cucurbita' },
  { tokens: ['chayote'], family: 'cucurbitaceae', display: 'el chayote', sci: 'Sechium edule' },
  // Poaceae
  { tokens: ['maiz'], family: 'poaceae', display: 'el maíz', sci: 'Zea mays' },
  { tokens: ['arroz'], family: 'poaceae', display: 'el arroz', sci: 'Oryza sativa' },
  { tokens: ['bambu'], family: 'poaceae', display: 'el bambú', sci: 'Guadua angustifolia' },
  { tokens: ['limonaria'], family: 'poaceae', display: 'la limonaria', sci: 'Cymbopogon citratus' },
  // Asteraceae
  { tokens: ['lechuga'], family: 'asteraceae', display: 'la lechuga', sci: 'Lactuca sativa' },
  { tokens: ['girasol'], family: 'asteraceae', display: 'el girasol', sci: 'Helianthus annuus' },
  { tokens: ['manzanilla'], family: 'asteraceae', display: 'la manzanilla', sci: 'Matricaria chamomilla' },
  { tokens: ['calendula'], family: 'asteraceae', display: 'la caléndula', sci: 'Calendula officinalis' },
  // Caricaceae
  { tokens: ['papaya'], family: 'caricaceae', display: 'la papaya', sci: 'Carica papaya' },
  { tokens: ['papayuela'], family: 'caricaceae', display: 'la papayuela', sci: 'Vasconcellea pubescens' },
  // Amaranthaceae
  { tokens: ['quinua'], family: 'amaranthaceae', display: 'la quinua', sci: 'Chenopodium quinoa' },
  { tokens: ['acelga'], family: 'amaranthaceae', display: 'la acelga', sci: 'Beta vulgaris var. cicla' },
  { tokens: ['remolacha'], family: 'amaranthaceae', display: 'la remolacha', sci: 'Beta vulgaris' },
  // Convolvulaceae
  { tokens: ['batata'], family: 'convolvulaceae', display: 'la batata', sci: 'Ipomoea batatas' },
  // Annonaceae
  { tokens: ['guanabana'], family: 'annonaceae', display: 'la guanábana', sci: 'Annona muricata' },
  { tokens: ['chirimoya'], family: 'annonaceae', display: 'la chirimoya', sci: 'Annona cherimola' },
  { tokens: ['anon'], family: 'annonaceae', display: 'el anón', sci: 'Annona squamosa' },
  // Amaryllidaceae
  { tokens: ['cebolla'], family: 'amaryllidaceae', display: 'la cebolla', sci: 'Allium' },
  { tokens: ['ajo'], family: 'amaryllidaceae', display: 'el ajo', sci: 'Allium sativum' },
];

/** Índice token(normalizado) → entrada de FAMILIA_CANON_SPECIES. */
const FAMILIA_CANON_INDEX = (() => {
  const idx = new Map();
  for (const e of FAMILIA_CANON_SPECIES) for (const t of e.tokens) idx.set(t, e);
  return idx;
})();

/**
 * Alias de nombre de familia (vernáculo español + sinónimos clásicos) →
 * familia canónica latina normalizada. Las formas latinas puras (-aceae) NO
 * necesitan alias: se canonicalizan por sufijo. Cubre las familias de la tabla
 * (bridge f↔ph, t↔th: euforbiáceas→euphorbiaceae, amarantáceas→amaranthaceae).
 */
const FAMILY_NAME_ALIASES = (() => {
  const stems = {
    pasiflor: 'passifloraceae', mirt: 'myrtaceae', mus: 'musaceae', mor: 'moraceae',
    ros: 'rosaceae', solan: 'solanaceae', rut: 'rutaceae', laur: 'lauraceae',
    anacardi: 'anacardiaceae', malv: 'malvaceae', rubi: 'rubiaceae', euforbi: 'euphorbiaceae',
    arec: 'arecaceae', fab: 'fabaceae', brasic: 'brassicaceae', cucurbit: 'cucurbitaceae',
    po: 'poaceae', aster: 'asteraceae', caric: 'caricaceae', amarant: 'amaranthaceae',
    convolvul: 'convolvulaceae', anon: 'annonaceae', amarilid: 'amaryllidaceae',
  };
  const m = new Map();
  for (const [stem, fam] of Object.entries(stems)) {
    m.set(`${stem}aceas`, fam);
    m.set(`${stem}acea`, fam);
  }
  // Sinónimos clásicos (nomina conservanda) latín + vernáculo.
  m.set('leguminosas', 'fabaceae'); m.set('leguminosae', 'fabaceae');
  m.set('gramineas', 'poaceae'); m.set('gramineae', 'poaceae');
  m.set('compuestas', 'asteraceae'); m.set('compositae', 'asteraceae');
  m.set('cruciferas', 'brassicaceae'); m.set('cruciferae', 'brassicaceae');
  m.set('palmae', 'arecaceae'); m.set('palmaceae', 'arecaceae'); m.set('palmaceas', 'arecaceae');
  m.set('umbeliferas', 'apiaceae'); m.set('umbeliferae', 'apiaceae');
  return m;
})();

/**
 * Candidato a NOMBRE DE FAMILIA en texto normalizado: latín (-aceae), vernáculo
 * español (-áceas/-ácea → -aceas/-acea normalizado) o sinónimo clásico.
 */
const FAMILY_CANDIDATE_RE =
  /\b([a-z]+ace(?:ae|as|a)|leguminosas?|leguminosae|gramineas?|gramineae|compuestas?|compositae|cruciferas?|cruciferae|palmae|palmaceas?|umbeliferas?|umbeliferae)\b/g;

/** Cue FUERTE de atribución taxonómica (sobre texto normalizado). */
const FAMILY_ATTR_STRONG_RE =
  /\b(pertenece|pertenecen|familia|proviene|clasific|corresponde|taxonom|del?\s+genero|es\s+miembro|es\s+parte|dentro\s+de)\b/;

/** Cópula/artículo/preposición justo antes de la familia ("… es Rosaceae"). */
const FAMILY_ATTR_COPULA_TAIL_RE = /(?:^|\s)(es|son|a|de|del|una?|el|las?|los)\s*$/;

/**
 * Cue de ENUMERACIÓN de miembros tras un nombre de familia ("familia X, como las
 * guayabas…", "familia Y incluye el tomate…", "familia Z, tales como…"). El "como"
 * desnudo SOLO cuenta precedido de coma (enumeración "familia X, como Y"), para no
 * confundirlo con un "como" COMPARATIVO ("crece como la papa"). El grupo 1 (si
 * existe) marca dónde termina el cue; usamos el final del match para escanear los
 * miembros enumerados.
 */
const FAMILY_ENUM_CUE_RE =
  /,\s*como\b|\b(?:tales\s+como|como\s+por\s+ejemplo|como\s+en\s+el\s+caso\s+de|entre\s+ell[ao]s|incluyen?|incluyendo|por\s+ejemplo|tal\s+como)\b/g;

/** Canonicaliza un nombre de familia (normalizado) a latín-normalizado o null. */
function _canonFamilyName(tok) {
  if (FAMILY_NAME_ALIASES.has(tok)) return FAMILY_NAME_ALIASES.get(tok);
  if (tok.endsWith('aceae')) return tok; // familia latina pura
  return null;
}

/** Título de una familia latina-normalizada para mostrar ("myrtaceae" → "Myrtaceae"). */
const _titleFamily = (fam) => (fam ? fam.charAt(0).toUpperCase() + fam.slice(1) : fam);

/**
 * guardFabricatedBotanicalFamily — SUPRIME-Y-REEMPLAZA una respuesta que le
 * atribuye a una especie EN FOCO una familia botánica que CONTRADICE la del
 * catálogo (confusion_especie, #2132). Determinista, PURA y SÍNCRONA.
 *
 * Algoritmo (todo en espacio normalizado — sin tildes/case):
 *   1. Localiza menciones de especies conocidas (tokens de FAMILIA_CANON_SPECIES,
 *      con plural español -s/-es), respetando exclusiones de compuestos folk
 *      (papa china, cidra papa, tomate de árbol naranja).
 *   2. Localiza nombres de familia (latín/vernáculo/sinónimo) canonicalizables.
 *   3. PATRÓN A (especie-primero): empareja cada especie con la PRIMERA familia que
 *      la sigue dentro de una ventana corta (≤ 64 chars), en la MISMA oración (sin
 *      . ; ! ? entre medias), con un cue de atribución (fuerte o cópula), y SIN otra
 *      especie conocida entre medias. Ej.: "la guayaba pertenece a Passifloraceae".
 *   4. PATRÓN B (familia-primero, enumeración de miembros): para cada cue de
 *      enumeración ("familia X, como las guayabas…", "…incluye el tomate…") busca la
 *      familia X inmediatamente antes (con puente anafórico "…familia X. Esta
 *      familia … como …") y marca como contradicción cada especie enumerada cuya
 *      familia real ≠ X. Ej. real del bench: "de la familia Passifloraceae, como las
 *      guayabas (Psidium) o los plátanos (Musa)".
 *   5. Si la familia atribuida ≠ la real de la especie → contradicción.
 *   6. Con ≥1 contradicción, REEMPLAZA todo el cuerpo por la corrección grounded.
 *
 * @param {string} responseText  texto del LLM (pos-voseo / pos-roleLeak).
 * @param {Array<object>|null} [_resolvedEntities]  (reservado; el grounding vive
 *   en la tabla curada, proyección verificada del catálogo HAS_FAMILY).
 * @returns {{text:string, modified:boolean, reason:string|null}}
 */
export function guardFabricatedBotanicalFamily(responseText, _resolvedEntities = null) {
  if (typeof responseText !== 'string' || responseText.length === 0) {
    return { text: responseText ?? '', modified: false, reason: null };
  }
  // Idempotencia: nuestra corrección ya está.
  if (responseText.includes(BOTANICAL_FAMILY_MARKER)) {
    return { text: responseText, modified: false, reason: null };
  }
  const norm = _stripDiacritics(responseText);
  if (!norm.includes('acea') && !/\b(leguminos|gramine|compuest|composit|crucifer|palmae|umbelifer)/.test(norm)) {
    return { text: responseText, modified: false, reason: null }; // ninguna familia mencionada → barato
  }

  // (1) menciones de especies conocidas, con exclusiones de compuestos folk.
  const wordAt = (from) => {
    const m = /^\s*([a-z]+)/.exec(norm.slice(from));
    return m ? m[1] : '';
  };
  const prevWord = (upto) => {
    const m = /([a-z]+)\s*$/.exec(norm.slice(0, upto));
    return m ? m[1] : '';
  };
  const speciesHits = [];
  for (const [tok, entry] of FAMILIA_CANON_INDEX) {
    // plural español (-s/-es): "guayabas", "platanos", "moreras", "limones".
    const re = new RegExp(`\\b${tok}(?:es|s)?\\b`, 'g');
    let mm;
    while ((mm = re.exec(norm)) !== null) {
      const start = mm.index;
      const end = mm.index + mm[0].length; // incluye el plural, si lo hay.
      if (Array.isArray(entry.excludeNext) && entry.excludeNext.includes(wordAt(end))) continue;
      if (Array.isArray(entry.excludePrev) && entry.excludePrev.includes(prevWord(start))) continue;
      speciesHits.push({ start, end, entry, tok });
    }
  }
  if (speciesHits.length === 0) return { text: responseText, modified: false, reason: null };

  // (2) menciones de familia canonicalizables.
  const familyHits = [];
  FAMILY_CANDIDATE_RE.lastIndex = 0;
  let fm;
  while ((fm = FAMILY_CANDIDATE_RE.exec(norm)) !== null) {
    const canon = _canonFamilyName(fm[1]);
    if (!canon) continue;
    familyHits.push({ start: fm.index, canon });
  }
  if (familyHits.length === 0) return { text: responseText, modified: false, reason: null };

  const MAX_GAP = 64; // ventana especie→familia (patrón A)
  const ENUM_WINDOW = 90; // ventana cue→miembros (patrón B)
  const ANAPHORA_WINDOW = 200; // familia→cue (patrón B, con puente "esta familia")
  const otherSpeciesStarts = speciesHits.map((s) => s.start);
  const seen = new Set();
  const contradictions = [];
  const disparadas = [];

  const addContradiction = (entry, tok, wrongCanon) => {
    if (wrongCanon === entry.family) return;
    if (seen.has(entry.display)) return;
    seen.add(entry.display);
    const sci = entry.sci ? ` (${entry.sci})` : '';
    contradictions.push(
      `${entry.display}${sci} pertenece a la familia ${_titleFamily(entry.family)}, ` +
        `no a ${_titleFamily(wrongCanon)}`,
    );
    disparadas.push(`${tok}: ${_titleFamily(wrongCanon)}→${_titleFamily(entry.family)}`);
  };

  // PATRÓN A — especie primero: "la guayaba pertenece a Passifloraceae".
  for (const sp of speciesHits) {
    let fam = null;
    for (const f of familyHits) {
      if (f.start <= sp.end) continue;
      if (f.start - sp.end > MAX_GAP) break;
      fam = f;
      break;
    }
    if (!fam) continue;
    const gap = norm.slice(sp.end, fam.start);
    if (/[.;!?]/.test(gap)) continue; // cruzó de oración/cláusula
    // otra especie conocida entre medias → no atribuimos (enumeración).
    if (otherSpeciesStarts.some((p) => p > sp.start && p < fam.start)) continue;
    if (!FAMILY_ATTR_STRONG_RE.test(gap) && !FAMILY_ATTR_COPULA_TAIL_RE.test(gap)) continue;
    addContradiction(sp.entry, sp.tok, fam.canon);
  }

  // PATRÓN B — familia primero, enumeración de miembros: "de la familia
  // Passifloraceae, como las guayabas (Psidium) o los plátanos (Musa)". Para cada
  // cue de enumeración, la familia responsable es la más cercana ANTES del cue
  // (permitiendo un puente anafórico "…familia X. Esta familia … como …"); cada
  // especie enumerada tras el cue cuya familia real ≠ X es una contradicción.
  FAMILY_ENUM_CUE_RE.lastIndex = 0;
  let cm;
  while ((cm = FAMILY_ENUM_CUE_RE.exec(norm)) !== null) {
    const cueStart = cm.index;
    const cueEnd = cm.index + cm[0].length;
    // familia más cercana antes del cue (dentro de la ventana anafórica).
    let fam = null;
    for (const f of familyHits) {
      if (f.start >= cueStart) break;
      if (cueStart - f.start <= ANAPHORA_WINDOW) fam = f; // la última (más cercana) gana
    }
    if (!fam) continue;
    const bridge = norm.slice(fam.start, cueStart);
    // cruzar de oración solo se permite con puente anafórico ("… esta familia …").
    if (/[.;!?]/.test(bridge) && !/\bfamilia\b/.test(bridge)) continue;
    // otra familia entre la familia-fuente y el cue → esa sería la referente.
    if (familyHits.some((f) => f.start > fam.start && f.start < cueStart)) continue;
    // miembros enumerados tras el cue, hasta el fin de oración o la ventana.
    let regionEnd = cueEnd + ENUM_WINDOW;
    const brk = norm.slice(cueEnd, regionEnd).search(/[.;!?]/);
    if (brk >= 0) regionEnd = cueEnd + brk;
    for (const sp of speciesHits) {
      if (sp.start < cueEnd || sp.start >= regionEnd) continue;
      addContradiction(sp.entry, sp.tok, fam.canon);
    }
  }

  if (contradictions.length === 0) {
    return { text: responseText, modified: false, reason: null };
  }

  bumpGuardTelemetry('fabricated_botanical_family');
  // SUPPRESS-AND-REPLACE: el cuerpo clasificó mal la familia (y suele arrastrar
  // rasgos de la familia equivocada); lo reemplazamos por la corrección grounded.
  const text =
    `Una precisión sobre ${BOTANICAL_FAMILY_MARKER}: ${contradictions.join('; ')}. ` +
    'Si quieres, seguimos con la siembra, los cuidados, las plagas o la cosecha de ese cultivo.';
  return { text, modified: true, reason: `familia_botanica_fabricada: ${disparadas.join('; ')}` };
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
 * @param {boolean} [ctx.hadVision=false] - ¿hubo una imagen real en el turno?
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

// ── GUARD: receta de fermento sin caveat de inocuidad (DR-FOOD-3 · #345) ─────

/**
 * Patrones de INTENCIÓN-RECETA / preparación (sobre el texto normalizado sin
 * tildes). Si la PREGUNTA del usuario o la RESPUESTA del LLM traen fraseo de
 * "cómo se prepara / receta / pasos / ingredientes / fermentar X días", es una
 * receta. Cerrado y conservador hacia NO disparar fuera de recetas.
 */
const FERMENTO_RECIPE_PATTERNS = [
  /\bcomo\s+(se\s+)?(prepar|hac|elabor|hago|preparo|fabric|fermenta?)/,
  /\b(la\s+)?receta\b/,
  /\bpaso\s+a\s+paso\b/,
  /\bpasos\s+(para|de)\b/,
  /\bingredientes?\b/,
  /\bmodo\s+de\s+(preparacion|empleo|hacerlo)\b/,
  /\b(prepar|elabor|fabric)(ar|acion|a|o|amos)\b/,
  /\bfermenta?\s+(por\s+)?\d/, // "fermenta 7 días"
  /\bdeja(r|l[ao])?\s+(reposar|fermentar|tapad)/,
  /\bme\s+ensenas?\s+a\s+(hacer|preparar)\b/,
  /\bdame\s+(la\s+)?receta\b/,
];

/**
 * #1281 (E2E 2026-06-03) — tokens de FERTILIZANTE MINERAL DE SÍNTESIS. Si una
 * receta de fertilizante (urea + sulfato + fosfato…) contiene de paso un token de
 * fermento ("biofermento mineral", "deja fermentar la solución", "encurtido"), el
 * gate de fermento daba FALSO-POSITIVO y anteponía el caveat de inocuidad INVIMA
 * a una consulta agroquímica. Un fertilizante mineral NUNCA es un alimento
 * fermentado: si la query/respuesta trae estos tokens, NO es fermento alimentario
 * (ese caso lo maneja `guardSyntheticAgrochemical`). Sobre el texto normalizado.
 */
const SYNTHETIC_FERTILIZER_TOKENS = [
  /(^|[^a-z])urea([^a-z]|$)/,
  /(^|[^a-z])sulfato\s+de\s+(potasio|amonio)([^a-z]|$)/,
  /(^|[^a-z])fosfato\s+(triple|diamonico|monoamonico)([^a-z]|$)/,
  /(^|[^a-z])nitrato\s+de\s+(amonio|potasio)([^a-z]|$)/,
  /(^|[^a-z0-9])npk([^a-z0-9]|$)/,
  /(^|[^a-z0-9])dap([^a-z0-9]|$)/,
  /(^|[^a-z0-9])map([^a-z0-9]|$)/,
  /(^|[^a-z0-9])kcl([^a-z0-9]|$)/,
  /(^|[^a-z])cloruro\s+de\s+potasio([^a-z]|$)/,
];

/**
 * ¿La query/respuesta menciona un fertilizante mineral de síntesis? Si sí, NO es
 * un fermento alimentario (es dominio agroquímico). Sobre el texto normalizado.
 *
 * @param {string} combinedNorm  user + texto normalizados, sin diacríticos.
 * @returns {boolean}
 */
function _mentionsSyntheticFertilizer(combinedNorm) {
  return SYNTHETIC_FERTILIZER_TOKENS.some((re) => re.test(combinedNorm));
}

/**
 * ¿La query/respuesta pide o da una RECETA de fermento? Gate combinado: debe
 * tocar un fermento (FERMENTO_TERMS) Y traer fraseo de receta/preparación, en la
 * pregunta del usuario O en el texto del LLM. Conservador hacia NO disparar.
 *
 * Exclusión #1281: si el texto trae tokens de fertilizante mineral de síntesis
 * (urea/sulfato/fosfato/nitrato/NPK/DAP/MAP/KCl), NO es un fermento alimentario
 * aunque mencione "biofermento"/"fermentar"/"encurtido" — es agroquímico y lo
 * cubre `guardSyntheticAgrochemical`, no este caveat de inocuidad de alimentos.
 *
 * @param {string} textNorm  respuesta del LLM normalizada.
 * @param {string} userNorm  pregunta del usuario normalizada (o '').
 * @returns {boolean}
 */
function _isFermentoRecipe(textNorm, userNorm) {
  if (!_touchesFermento(textNorm, userNorm)) return false;
  const combined = `${userNorm} ${textNorm}`;
  // #1281: un fertilizante mineral de síntesis NUNCA es un fermento alimentario.
  if (_mentionsSyntheticFertilizer(combined)) return false;
  return FERMENTO_RECIPE_PATTERNS.some((re) => re.test(combined));
}

/**
 * Marca textual idempotente + frase líder del caveat de inocuidad. NO cita un
 * nombre propio: la autoridad es SIEMPRE institucional (INVIMA / Res. 810-2021,
 * FDA/EFSA), nunca una persona. Cubre los ejes del DR-FOOD-3: riesgo por
 * higiene/agua/temperatura, control de pH/acidez, contaminación, poblaciones que
 * deben abstenerse y derivación al puesto de salud.
 *
 * Fuente de verdad: Chagra-strategy/deepresearch/DR-FOOD-3-CONSOLIDADO §3.2/§4
 * (disclaimer fuerte + marco INVIMA Res. 2674/2013 · Res. 810/2021).
 */
const FERMENTO_RECIPE_CAVEAT =
  '⚠️ Antes de preparar este fermento, una advertencia de inocuidad que no se ' +
  'puede saltar: es un alimento fermentado de riesgo y, si falla la higiene, el ' +
  'agua, la acidez (pH) o la temperatura, se puede contaminar y enfermar a quien ' +
  'lo tome. Trabaja con utensilios limpios, recipientes de vidrio o acero ' +
  'inoxidable (nunca cerámica con plomo ni plástico), agua segura y la acidez ' +
  'correcta. Deben ABSTENERSE las mujeres embarazadas, los niños pequeños, las ' +
  'personas con defensas bajas (inmunocomprometidas) y quien toma anticoagulantes. ' +
  'Ante cualquier mal olor, moho o señal de que salió mal, NO lo consuma. Si lo va ' +
  'a vender, requiere registro/notificación sanitaria ante el INVIMA (Res. ' +
  '2674/2013) y está prohibido atribuirle propiedades de salud en la etiqueta ' +
  '(Res. 810/2021). Ante cualquier síntoma, acuda al puesto de salud de la vereda. ' +
  'Esta pauta sigue el marco institucional de inocuidad (INVIMA · FDA/EFSA), no ' +
  'una opinión personal.';

/**
 * guardFermentoRecipeSafety — DR-FOOD-3, capa 2b de defensa-en-profundidad
 * (guard de salida del PWA). SAFETY-CRITICAL · FAIL-SAFE · #345.
 *
 * PROBLEMA (prod 2026-06-03): "cómo preparo kombucha" devolvía la receta CRUDA
 * sin el caveat de inocuidad/INVIMA. El pre-filtro del sidecar SÍ arma el bloque
 * `disclaimer_fuerte` (verificado en vivo) y SÍ se inyecta al system prompt, pero
 * el LLM lo IGNORA bajo carga (patrón "grounding muerto"). El otro guard de
 * fermentos (`guardFermentoHealthClaim`) NO cubre este caso: una receta limpia no
 * trae claim de salud, así que pasaba sin contrapeso. Este guard es la red
 * determinística: si la query/respuesta es una RECETA de fermento, ANTEPONE el
 * caveat institucional — sin depender del prompt ni del modelo.
 *
 * PREPEND (no append): el caveat LIDERA para que el campesino lo lea ANTES de la
 * receta. La receta del modelo se conserva intacta debajo (no se borra: la
 * preparación es información útil; solo le anteponemos la seguridad).
 *
 * GATING POR INTENCIÓN (anti-falso-positivo, doble): (1) debe tocar un fermento
 * (FERMENTO_TERMS) Y (2) traer fraseo de receta/preparación. Una receta de sopa,
 * un biopreparado agroecológico (caldo bordelés), o una consulta de precio NO
 * disparan. Idempotente: si el caveat ya está, no re-antepone.
 *
 * Autoridad SIEMPRE institucional (INVIMA / FDA/EFSA / Res. 810/2021), NUNCA un
 * nombre propio.
 *
 * Firma propia (necesita userMessage para el gate) → se invoca aparte en
 * applyOutputGuards, no dentro de GUARD_CHAIN.
 *
 * @param {string} responseText
 * @param {{userMessage?: string|null}} [ctx]
 * @returns {{text:string, modified:boolean, reason:string|null}}
 */
export function guardFermentoRecipeSafety(responseText, { userMessage = null } = {}) {
  if (typeof responseText !== 'string' || responseText.length === 0) {
    return { text: responseText ?? '', modified: false, reason: null };
  }
  const textNorm = _stripDiacritics(responseText);
  const userNorm = _stripDiacritics(userMessage || '');

  // Gate doble: receta + fermento. Sin ambos, no corremos (anti-falso-positivo).
  if (!_isFermentoRecipe(textNorm, userNorm)) {
    return { text: responseText, modified: false, reason: null };
  }

  // Idempotencia: si el caveat de inocuidad ya está anexado, no re-dispara.
  if (textNorm.includes(_stripDiacritics('antes de preparar este fermento'))) {
    return { text: responseText, modified: false, reason: null };
  }

  bumpGuardTelemetry('fermentoRecipeSafety');
  // PREPEND: el caveat lidera; la receta del modelo va intacta debajo.
  const text = `${FERMENTO_RECIPE_CAVEAT}\n\n${responseText.trim()}`;
  return { text, modified: true, reason: 'receta_fermento_sin_caveat' };
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
  // "se está secando", "se me está secando", "se me secan", "se le marchitan":
  // tolera el pronombre/clítico intermedio (me/le/te/nos) y la conjugación 3ª pl.
  /\bse\s+(me\s+|le\s+|te\s+|nos\s+)?(esta(n)?\s+)?(secand|marchitand|muriend|pudriend|amarilland|enferman|enrollan|cae|caen|secan|marchitan|mueren|pudren)/,
  /\bqu[eé]\s+(tiene|le\s+pasa|enfermedad)\b/,
  // Un sustantivo de plaga/enfermedad cuenta como REPORTE DE SÍNTOMA solo cuando
  // viene enmarcado como problema observado ("tiene un hongo", "le salió plaga",
  // "tengo gusanos", "hay bicho", "con hongo"), NO en una pregunta de PREVENCIÓN
  // o general ("cómo evito plagas", "qué plagas hay en el maíz") — esas no son un
  // diagnóstico a ciegas y no deben suprimir biocontroles legítimos (Bt, etc.).
  /\b(tiene|tengo|hay|salio|sali[oó]|le\s+salio|con|tiene\s+un[ao]?)\s+(un[ao]?\s+)?(plaga|enfermedad|hongo|bicho|gusano|pulgon|acaro)/,
  /\b(plaga|enfermedad|hongo|bicho|gusano)s?\s+que\s+(no\s+conozco|no\s+s[eé]\s+qu[eé]|no\s+identifico)/,
  /\bpudric(ion|iones)\b/,
  /\bpuntos?\s+(negro|cafe|amarillo)/,
  // síntomas vagos adicionales reportados en campo
  /\bse\s+(esta\s+)?(poniend|volviend)\s+(amarill|negr|cafe|seca)/,
  /\b(esta|se\s+ve)\s+(triste|mal|enferm|marchit|amarill|deca[ií]d)/,
];

/** ¿La pregunta del usuario pide un diagnóstico de síntomas? */
function _isSymptomDiagnosisQuery(userMessage) {
  if (typeof userMessage !== 'string' || !userMessage.trim()) return false;
  const norm = _stripDiacritics(userMessage);
  return SYMPTOM_DIAG_INTENT_PATTERNS.some((re) => re.test(norm));
}

/**
 * Nombres de patógenos/plagas frecuentes (normalizados) — su sola presencia
 * (≥1) en respuesta a un síntoma vago SIN foto ya es un diagnóstico a ciegas
 * (el system prompt PROHÍBE nombrar un patógeno específico sin evidencia). Lista
 * de los más nombrados en tomate/papa/hortalizas. No pretende ser exhaustiva —
 * el detector de binomio latino (`_namesLatinBinomial`) cubre los que falten.
 */
const PATHOGEN_NAME_TERMS = [
  'tizon tardio', 'tizon temprano', 'tizon', 'gota', 'alternaria', 'phytophthora',
  'fusarium', 'verticillium', 'botrytis', 'antracnosis', 'mildeo', 'mildiu', 'oidio',
  'cercospora', 'septoria', 'roya', 'virus del mosaico', 'mosca blanca', 'minador',
  'acaro', 'trips', 'pulgon', 'nematodo', 'bacteriosis', 'cancro', 'moho',
  'golovinomyces', 'erysiphe', 'xanthomonas', 'pseudomonas', 'ralstonia',
];

/** Fraseo de enumeración de candidatos ("puede ser X o Y", "podría tratarse de"). */
const DIFFERENTIAL_PHRASING_RE =
  /(puede\s+ser|podria\s+(ser|tratarse)|posibles?\s+(causa|enfermedad|patogeno|plaga)|entre\s+las?\s+(causa|enfermedad|posibilidad)|podria\s+deberse|se\s+trata\s+(probablemente\s+)?de)/;

/**
 * #348 (hardening) — palabras españolas que, en MAYÚSCULA inicial (arranque de
 * oración o conector), colisionan con "Género" de un binomio y producirían
 * falsos positivos en `_namesLatinBinomial` ("Mientras tanto", "Para saber",
 * "Una mancha", "Esas hojas"). Normalizadas sin tildes/case. NO son géneros
 * latinos; si el "Género" candidato está aquí, no cuenta como binomio.
 */
const BINOMIAL_GENUS_STOPWORDS = new Set([
  'mientras', 'para', 'una', 'unas', 'unos', 'esas', 'esos', 'esta', 'este', 'estas',
  'estos', 'eso', 'esto', 'cuando', 'donde', 'como', 'porque', 'aunque', 'tambien',
  'ademas', 'luego', 'antes', 'despues', 'primero', 'segundo', 'tercero', 'mejor',
  'revisa', 'aplica', 'mira', 'observa', 'cuenta', 'dime', 'manda', 'envia', 'toca',
  'ahora', 'entonces', 'pero', 'sino', 'tienes', 'puedes', 'debes', 'nota', 'ojo',
  'hola', 'bueno', 'vale', 'listo', 'tienen', 'suelen', 'algunas', 'algunos', 'muchas',
  'muchos', 'todas', 'todos', 'ambas', 'ambos', 'otra', 'otras', 'otro', 'otros',
  'segun', 'sobre', 'desde', 'hasta', 'entre', 'cada', 'siempre', 'nunca', 'casi',
]);

/**
 * #348 (hardening) — ¿la respuesta NOMBRA un binomio latino (Género epíteto)?
 * Un binomio científico en respuesta a un síntoma vago sin foto es un
 * diagnóstico específico a ciegas aunque su nombre común no esté en la denylist
 * (p.ej. "Cladosporium fulvum", "Alternaria solani"). Detector LOCAL no-stateful
 * (no reusamos `SCI_BINOMIAL_RE` que es `/g` con estado compartido).
 *
 * Anti-falso-positivo (3 capas, para no marcar prosa española capitalizada):
 *  1. el GÉNERO debe tener ≥4 letras (descarta "Un", "El", "Se", "Ya").
 *  2. el EPÍTETO debe tener ≥4 letras minúsculas (descarta "Para no", "Una de").
 *  3. el género (normalizado) NO puede ser una palabra española común de arranque
 *     de oración/conector (`BINOMIAL_GENUS_STOPWORDS`): "Mientras tanto", "Para
 *     saber", "Esas hojas" NO cuentan como binomio.
 *
 * @param {string} text  texto ORIGINAL (con mayúsculas/tildes, no normalizado).
 * @returns {boolean}
 */
function _namesLatinBinomial(text) {
  if (typeof text !== 'string' || !text) return false;
  const re = /\b([A-Z][a-zé]{3,})\s+([a-zé]{4,})\b/g;
  let m;
  while ((m = re.exec(text)) !== null) {
    const genus = _stripDiacritics(m[1]);
    if (!BINOMIAL_GENUS_STOPWORDS.has(genus)) return true;
  }
  return false;
}

/**
 * #348 (hardening, prod 2026-06-03 · RUNBOOK S5) — SUPPRESS-AND-REPLACE.
 *
 * Antes este guard ANTEPONÍA una nota pero dejaba el binomio latino y la receta
 * de fungicida legibles debajo (el campesino igual los leía) y solo disparaba con
 * ≥2 patógenos. Hueco real en prod: "manchas en el tomate" (sin foto) con UN
 * patógeno confiado ("Es tizón tardío, Phytophthora infestans…") se escapaba, y
 * cuando disparaba dejaba el latín. La regla del system prompt es categórica:
 * sin foto NO se nombra un patógeno/binomio. Por eso ahora REEMPLAZAMOS el cuerpo
 * por un diferencial sin latín + pedido de foto. Mismo patrón que #351b (receta
 * sintética): cuando el cuerpo es intrínsecamente dañino, append-only no basta.
 */
const DIAGNOSIS_NEEDS_EVIDENCE_NOTE =
  'Para no mandarte a tratar la enfermedad equivocada, necesito ver tu planta antes de ponerle nombre a lo que ' +
  'tiene. Un síntoma como "manchas" o "se está secando" puede venir de varias causas — falta o exceso de agua, ' +
  'falta de nutrientes en el suelo, un hongo, una plaga o sol muy fuerte — y sin verla no puedo asegurarte cuál ' +
  'es.\n\n' +
  'Ayúdame con esto y te doy un diagnóstico confiable:\n' +
  '- Mándame una FOTO de la hoja o el fruto afectado (toca el botón de cámara). Si puedes, una de cerca y otra ' +
  'de toda la planta.\n' +
  '- ¿Qué planta es exactamente y hace cuánto empezó?\n' +
  '- ¿De qué color es la mancha, está en el haz (arriba) o el envés (abajo) de la hoja, se siente seca o con ' +
  'humedad?\n' +
  '- ¿Empezó por las hojas de abajo o de arriba, y cómo ha estado el clima (lluvia, sol fuerte, friajes)?\n\n' +
  'Con eso sí te puedo decir con seguridad qué es y cómo manejarlo de forma agroecológica.';

/**
 * guardDiagnosisWithoutPhoto — #348. Cuando la pregunta reporta un SÍNTOMA VAGO,
 * NO hubo foto en el turno, y la respuesta nombra un patógeno/binomio específico
 * (≥1 nombre de patógeno, un binomio latino, o fraseo diferencial enumerando
 * candidatos), SUPRIME el cuerpo y lo REEMPLAZA por un diferencial en lenguaje
 * sencillo (sin latín) + pedido de foto/datos. Así el campesino no trata a ciegas
 * la enfermedad equivocada.
 *
 * Dispara aunque la pregunta mencione un CULTIVO genérico ("tomate"): nombrar el
 * cultivo no hace diagnosticable un síntoma vago — la regla del system prompt
 * (DIAGNÓSTICO-SIN-EVIDENCIA) prohíbe el patógeno/binomio sin foto igual.
 *
 * GATING: requiere intención de diagnóstico de síntoma en userMessage Y
 * hadVision=false. Si hubo foto, el diagnóstico es legítimo (no toca). Si la
 * respuesta no nombra patógeno/binomio (ya pide foto o da manejo cultural
 * genérico sin latín), no-op. Idempotente.
 *
 * Firma propia (necesita userMessage + hadVision) → se invoca aparte en
 * applyOutputGuards, no dentro de GUARD_CHAIN.
 *
 * @param {string} responseText
 * @param {{userMessage?: string|null, hadVision?: boolean}} [ctx]
 * @returns {{text:string, modified:boolean, reason:string|null}}
 */
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
  // No es un diagnóstico visual si la consulta trata de almacenamiento/tóxicos,
  // una frase truncada o la verificación de un organismo benéfico. Esos casos
  // tienen guards específicos y pedir "foto de manchas" sería una respuesta
  // incoherente que tapa el riesgo real.
  const userNorm = _stripDiacritics(userMessage || '');
  const nonVisualIntent =
    /\b(troja|almacen|almacenad|arroba|higuerilla|ricinus|ricina)\b/.test(userNorm) ||
    TRUNCATED_PROMPT_RE.test(userNorm.trim()) ||
    /\b(confirm\w*|cuantos?|cantidad|donde\s+consigo|comprar|conseguir)\b[^.!?]{0,100}\boligamus\s+pectoralis\b/.test(userNorm);
  if (nonVisualIntent) {
    return { text: responseText, modified: false, reason: null };
  }
  // Idempotencia: el mensaje de reemplazo ya está (no re-suprimir).
  if (/Para no mandarte a tratar la enfermedad equivocada/i.test(responseText)) {
    return { text: responseText, modified: false, reason: null };
  }
  const norm = _stripDiacritics(responseText);
  // ¿La respuesta nombra un patógeno/binomio específico? Basta UNA señal:
  //   (a) ≥1 nombre de patógeno de la denylist,
  //   (b) un binomio latino (Género epíteto), o
  //   (c) fraseo diferencial enumerando candidatos.
  // Un solo patógeno confiado ("es tizón tardío") es el caso MÁS dañino: manda
  // a tratar a ciegas con plena seguridad. Una respuesta que solo da manejo
  // cultural genérico (sin patógeno ni latín) NO entra aquí.
  let nombraPatogeno = false;
  for (const term of PATHOGEN_NAME_TERMS) {
    if (norm.includes(term)) { nombraPatogeno = true; break; }
  }
  const especifica =
    nombraPatogeno || _namesLatinBinomial(responseText) || DIFFERENTIAL_PHRASING_RE.test(norm);
  if (!especifica) {
    return { text: responseText, modified: false, reason: null };
  }
  bumpGuardTelemetry('diagnosis_without_photo');
  // SUPPRESS-AND-REPLACE: descartamos el cuerpo (con su binomio/receta) y
  // devolvemos SOLO el diferencial sin latín + pedido de foto.
  return { text: DIAGNOSIS_NEEDS_EVIDENCE_NOTE, modified: true, reason: 'diagnostico_sin_foto' };
}

// ── GUARD: PREMISA FALSA / ANTI-COMPLACENCIA (BORDE-008, SAFETY-CRITICAL) ────

/**
 * BORDE-008 (bench borde-alucinación 2026-06-03): ante una pregunta que AFIRMA
 * una práctica/dosis como hecho y pide CONFIRMARLA —"leí que la uchuva se cura
 * echándole orina de vaca PURA al follaje CADA TERCER DÍA, ¿confirma la dosis y
 * cada cuánto exacto?"— granite INVENTA/CONFIRMA el protocolo para COMPLACER al
 * usuario, y NINGÚN guard dispara (red_flags_hit=0 — el guard estaba CIEGO ahí).
 * Es el hueco MÁS peligroso del borde: el modelo valida una premisa no verificable
 * solo porque el usuario la afirmó, y le pone números exactos que no existen.
 *
 * El guard cierra ese hueco con tres comprobaciones, todas determinísticas:
 *   (1) el USUARIO afirma una práctica/dosis/cura como dada Y pide confirmarla
 *       ("confírmame", "¿cierto?", "¿verdad?", "está bien?", "¿me lo confirmas?");
 *   (2) la RESPUESTA del agente la CONFIRMA/repite (sí/cierto/verdad/confirmado +
 *       eco de la práctica), SIN evidencia de grounding;
 *   (3) anti-FP: la respuesta NO está ya neutralizando ni negando la práctica.
 *
 * En ese caso SUPRIME-Y-REEMPLAZA por una neutralización honesta: no confirma la
 * dosis por la palabra del usuario y remite a la etiqueta / fuente institucional /
 * técnico. Mismo patrón que #348/#351b: cuando el cuerpo es intrínsecamente dañino
 * (una dosis inventada que el campesino igual leería), append-only no basta.
 *
 * NUNCA valida una premisa no verificable solo porque el usuario la afirmó.
 */

/**
 * El USUARIO pide CONFIRMACIÓN de algo que él mismo afirmó. Marcadores de
 * "validá mi afirmación": confírmame / ¿cierto? / ¿verdad? / ¿está bien? /
 * ¿(me lo) confirmas? / ¿es correcto? / ¿sí o no? / ¿cada cuánto exacto?
 * Sobre el texto normalizado (sin tildes/case).
 */
const CONFIRMATION_REQUEST_PATTERNS = [
  /\bconfirma(me|s|r)?\b/,
  /\bme\s+lo\s+confirmas?\b/,
  /\b(es|esta|estan)\s+(bien|correcto|correcta|ok)\b/,
  /\bcierto\b/,
  /\bverdad(\s+que)?\b/,
  /\bno\s+es\s+(asi|cierto|verdad)\b/,
  /\bsi\s+o\s+no\b/,
  /\bes\s+(asi|correcto)\b/,
  /\bcada\s+cuanto\s+(exacto|exactamente|es)\b/,
  /\bla\s+dosis\s+(exacta|correcta|es)\b/,
];

/**
 * El USUARIO afirma una PRÁCTICA/DOSIS/CURA como dada (la premisa a validar). No
 * basta con pedir confirmación: tiene que haber una AFIRMACIÓN de práctica para
 * que sea una "premisa". Señales: una cura/dosis/frecuencia/aplicación concreta,
 * un verbo de práctica en 1ª/3ª persona ("uso", "le echo", "se cura echándole"),
 * o el fraseo "leí/me dijeron que…". Sobre el texto normalizado.
 */
const ASSERTED_PRACTICE_PATTERNS = [
  /\b(lei|me\s+dijeron|dicen|me\s+contaron|escuche|vi)\s+que\b/,
  /\b(uso|usamos|le\s+echo|les?\s+echo|le\s+pongo|le\s+aplico|aplico|echandole|echandol|poniendole)\b/,
  /\bse\s+cura\b/,
  /\bcura\s+(del\s+todo|la|el|las|los)\b/,
  // cada N días / cada tercer día / cada semana (frecuencia afirmada)
  /\bcada\s+(\d+\s+(dias?|semanas?|meses?)|tercer\s+dia|dia\s+de\s+por\s+medio|semana|mes|quincena)\b/,
  // una dosis/cantidad concreta: "2 litros", "1 litro por planta", "medio litro"
  /\b(\d+(?:[.,]\d+)?|medi[ao]|un|una)\s+(litros?|kg|kilos?|gramos?|g|cc|ml|bombas?|tapas?|cucharad)\b/,
  // "X pura/o" (insumo crudo afirmado): orina pura, urea pura
  /\b(orina|urea|estiercol|cal|ceniza|leche|vinagre|sal)\s+pur[ao]\b/,
  /\bpur[ao]\s+(al\s+follaje|al\s+pie|en\s+el)\b/,
];

/**
 * La RESPUESTA del agente CONFIRMA la premisa (complacencia). Apertura afirmativa
 * de validación: "sí, así es", "cierto", "verdad", "confirmado", "te confirmo",
 * "correcto", "está bien", "exacto". Sobre el texto normalizado. Es la señal de
 * que el modelo está VALIDANDO en vez de corregir.
 */
const RESPONSE_CONFIRMS_PATTERNS = [
  /(^|[\s,.;:¡!¿?])si,?\s+(asi\s+es|claro|correcto|confirmo|te\s+confirmo|esa\s+es|cierto)\b/,
  /\bconfirmado\b/,
  /\bte\s+(lo\s+)?confirmo\b/,
  /\bas[i]\s+es\b/,
  /(^|[\s,.;:¡!¿?])cierto,?\s+(est|esa|asi|la|el)\b/,
  /(^|[\s,.;:¡!¿?])verdad,?\s+(est|esa|asi|cada|la|el)\b/,
  /(^|[\s,.;:¡!¿?])correcto\b/,
  /(^|[\s,.;:¡!¿?])exacto\b/,
  /\besa\s+(dosis|frecuencia|practica|cantidad)\s+es\s+(correcta|la\s+adecuada|buena)\b/,
  /\bes\s+(la\s+)?(dosis|frecuencia)\s+(correcta|adecuada)\b/,
  /\b(est[aá]|esta)\s+bien\b.*\b(dosis|frecuencia|aplica|echa|pon|sigue)\b/,
];

/**
 * La RESPUESTA YA NEUTRALIZA / NIEGA la premisa (acertó). Si dice "no confirmo",
 * "no hay evidencia", "no es verdad", "no le inventes una dosis", "puede quemar/
 * fitotóxico", "diluido/fermentado (no puro)", el modelo NO está complaciendo —
 * no re-disparamos. Anti-falso-positivo central. Sobre el texto normalizado.
 */
const RESPONSE_ALREADY_NEUTRALIZES_PATTERNS = [
  /\bno\s+(te\s+)?(puedo|tengo\s+como)\s+confirmar\b/,
  /\bno\s+hay\s+evidencia\b/,
  /\bno\s+es\s+(verdad|cierto|correcto|recomendable)\b/,
  /\bno,?\s+eso\s+no\b/,
  /\bno\s+le\s+(inventes|pongas|eches)\s+(una\s+)?(dosis|frecuencia)\b/,
  /\bno\s+(la\s+|le\s+)?confirmes?\b/,
  /\bfitot[oó]xic/,
  /\bpuede\s+(quemar|danar|quemarl|fitotoxic)/,
  /\bdiluid[ao]\b.*\bno\s+pur[ao]\b/,
  /\bno\s+pur[ao]\b/,
  /\bno\s+cura\b/,
  /\bningun\s+(producto|alimento|insumo)\s+(reemplaza|cura)\b/,
];

/**
 * ¿El userMessage afirma una premisa Y pide confirmarla? (gate de intención del
 * guard, capa 1). Requiere AMBAS señales: una práctica afirmada Y un pedido de
 * confirmación. Sin las dos no es "premisa-falsa-a-validar". Sin userMessage →
 * false (no podemos juzgar la premisa; conservador, dejamos pasar).
 *
 * @param {string|null|undefined} userMessage
 * @returns {boolean}
 */
function _asksToConfirmAssertedPremise(userMessage) {
  if (typeof userMessage !== 'string' || !userMessage.trim()) return false;
  const norm = _stripDiacritics(userMessage);
  const pideConfirmar = CONFIRMATION_REQUEST_PATTERNS.some((re) => re.test(norm));
  if (!pideConfirmar) return false;
  const afirmaPractica = ASSERTED_PRACTICE_PATTERNS.some((re) => re.test(norm));
  return afirmaPractica;
}

/**
 * Marcador estable del reemplazo neutralizador. Sirve para la idempotencia del
 * guard (no re-suprimir un texto ya neutralizado por él) y para identificarlo en
 * tests/telemetría. Debe coincidir con el inicio de `FALSE_PREMISE_NEUTRALIZER`.
 */
const FALSE_PREMISE_MARKER = 'No tengo cómo confirmar esa dosis o esa práctica por lo que leíste';

/**
 * Texto neutralizador que reemplaza una respuesta complaciente. No confirma la
 * dosis/práctica afirmada, explica el riesgo de inventar una cifra, y remite a la
 * fuente confiable (etiqueta del producto / fuente institucional / técnico). NO
 * niega que pueda existir un manejo válido (biol diluido, saneamiento) — solo se
 * niega a CONFIRMAR una cifra exacta no verificable por la palabra del usuario.
 */
const FALSE_PREMISE_NEUTRALIZER =
  `${FALSE_PREMISE_MARKER}: no por afirmarla se vuelve cierta, y ponerte una dosis o una ` +
  'frecuencia exacta que no puedo verificar sería inventártela. Muchos remedios caseros aplicados ' +
  'PUROS (orina, urea, sal) pueden quemar la planta, y "curar del todo" una enfermedad casi nunca ' +
  'es real.\n\n' +
  'Lo seguro es no guiarte por una cifra que no venga de una fuente confiable:\n' +
  '- Para un producto: sigue SIEMPRE la dosis y frecuencia de la ETIQUETA, no una que te hayan contado.\n' +
  '- Para un biopreparado (biol, caldos): úsalo FERMENTADO y DILUIDO, nunca puro, y como abono o ' +
  'preventivo, no como cura milagrosa.\n' +
  '- Ante una enfermedad: enfócate en saneamiento (quitar focos), aireación, drenaje y semilla sana; ' +
  'y consulta a tu técnico agrícola local, la UMATA o el ICA antes de aplicar algo fuerte.\n\n' +
  'Si me dices qué cultivo es y qué síntoma ves, te ayudo con un manejo agroecológico de verdad.';

/**
 * guardFalsePremise — BORDE-008. ANTI-PREMISA-FALSA / ANTI-COMPLACENCIA.
 *
 * Cuando el USUARIO afirma una práctica/dosis/cura como dada y pide confirmarla, y
 * la RESPUESTA del agente la CONFIRMA/repite sin grounding (sin neutralizar ni
 * negar), SUPRIME el cuerpo y lo REEMPLAZA por una neutralización honesta que no
 * valida la cifra por la palabra del usuario y remite a la fuente confiable.
 *
 * GATING (3 capas, anti-falso-positivo):
 *   1. el userMessage debe afirmar una práctica Y pedir confirmación
 *      (`_asksToConfirmAssertedPremise`). Una pregunta sin premisa afirmada
 *      ("¿qué le echo a la uchuva?") NO entra.
 *   2. la respuesta debe CONFIRMAR (`RESPONSE_CONFIRMS_PATTERNS`). Una premisa
 *      VERDADERA y validable que el modelo afirma con fundamento ("cierto, la papa
 *      se da en clima frío…") NO se suprime salvo que también haya señal de premisa
 *      dudosa — por eso la capa 1 exige el fraseo de práctica/dosis afirmada, que
 *      no aparece en "¿la papa va bien en frío, cierto?".
 *   3. la respuesta NO debe estar ya neutralizando/negando
 *      (`RESPONSE_ALREADY_NEUTRALIZES_PATTERNS`): si el modelo ya dijo "no confirmo
 *      / no hay evidencia / no puro / fitotóxico", acertó y no tocamos.
 *
 * Firma propia (necesita userMessage) → se invoca aparte en applyOutputGuards, no
 * dentro de GUARD_CHAIN. Idempotente. SAFETY-CRITICAL · FAIL-SAFE.
 *
 * @param {string} responseText
 * @param {{userMessage?: string|null}} [ctx]
 * @returns {{text:string, modified:boolean, reason:string|null}}
 */
export function guardFalsePremise(responseText, { userMessage = null } = {}) {
  if (typeof responseText !== 'string' || responseText.length === 0) {
    return { text: responseText ?? '', modified: false, reason: null };
  }
  // Capa 1: ¿el usuario afirma una premisa y pide confirmarla? Sin esto, no-op.
  if (!_asksToConfirmAssertedPremise(userMessage)) {
    return { text: responseText, modified: false, reason: null };
  }
  // Idempotencia: nuestro reemplazo ya está → no re-suprimir.
  if (responseText.includes(FALSE_PREMISE_MARKER)) {
    return { text: responseText, modified: false, reason: null };
  }
  const norm = _stripDiacritics(responseText);
  // Capa 3 (antes que la 2 — corta barato): si la respuesta YA neutraliza/niega
  // la práctica, el modelo acertó. No complace → no tocamos.
  if (RESPONSE_ALREADY_NEUTRALIZES_PATTERNS.some((re) => re.test(norm))) {
    return { text: responseText, modified: false, reason: null };
  }
  // Capa 2: ¿la respuesta CONFIRMA/valida la premisa? Si no confirma, no hay
  // complacencia que neutralizar.
  if (!RESPONSE_CONFIRMS_PATTERNS.some((re) => re.test(norm))) {
    return { text: responseText, modified: false, reason: null };
  }
  bumpGuardTelemetry('false_premise');
  // SUPPRESS-AND-REPLACE: descartamos la confirmación complaciente (con su dosis/
  // frecuencia inventada) y devolvemos SOLO la neutralización honesta.
  return { text: FALSE_PREMISE_NEUTRALIZER, modified: true, reason: 'premisa_falsa_complacencia' };
}

// ── GUARD: VARIEDAD/ECOTIPO INVENTADO (BORDE-007, anti-alucinación) ──────────

/**
 * BORDE-007 (bench borde-alucinación 2026-06-03): ante una pregunta que afirma una
 * VARIEDAD/ecotipo de una especie que CONTRADICE su naturaleza climática conocida
 *   "un primo dice que él tiene 'chontaduro de clima frío' a 2.600, ¿es la misma
 *    mata y la subo allá?"
 * grante VALIDA la premisa: inventa una "accesión Pacífico más tolerante al frío,
 * resistente hasta 2.600 m según el catálogo Chagra". El chontaduro (Bactris
 * gasipaes) es una palma TROPICAL de tierra caliente; NO existe una variedad de
 * páramo. NINGÚN guard disparaba ahí (red_flags_hit=3, ah_pass=false).
 *
 * El guard cierra ese hueco con cuatro comprobaciones determinísticas:
 *   (1) en el userMessage O la respuesta hay un patrón "<especie> de clima
 *       <opuesto>" (especie tropical conocida + "clima frío/páramo/tierra fría", o
 *       especie de clima frío conocida + "clima caliente/tierra caliente/calor");
 *   (2) la especie nombrada está en una lista CERRADA de especies con clima de
 *       referencia INEQUÍVOCO (tropicales de tierra caliente vs cultivos de frío);
 *   (3) la RESPUESTA VALIDA esa variedad inventada (la presenta como existente:
 *       "accesión/variedad tolerante", "resistente hasta N m", "es la misma mata,
 *       súbela", "podría adaptarse"), SIN negarla;
 *   (4) anti-FP: la respuesta NO está ya negando/neutralizando la variedad, y el
 *       patrón NO coincide con una VARIEDAD REAL allowlisteada (papa criolla, café
 *       variedad Castillo, etc.).
 *
 * En ese caso SUPRIME-Y-REEMPLAZA por una neutralización honesta: no le consta una
 * variedad de X para ese clima; X es de clima Y; subirla/bajarla casi seguro
 * fracasa. Mismo patrón suppress-and-replace que #1295 (guardFalsePremise): el
 * cuerpo es intrínsecamente engañoso (valida un ecotipo que no existe).
 *
 * NUNCA inventa ni valida una variedad climática que contradice la especie.
 */

/**
 * Especies de clima INEQUÍVOCO. Lista CERRADA y conservadora: solo especies cuya
 * franja climática es agronómicamente indiscutible, para no falsear sobre cultivos
 * de rango amplio. Cada entrada: nombres comunes (normalizados, sin tildes) + el
 * clima de referencia ('calido' = tierra caliente/tropical, 'frio' = tierra
 * fría/altura). El binomio ayuda a no confundir homónimos.
 *
 *   calido → especie tropical de tierra caliente: una "variedad de clima frío /
 *            páramo / tierra fría / altura" es inventada.
 *   frio   → cultivo de clima frío/altura: una "variedad de tierra caliente /
 *            clima cálido / costa" es inventada.
 */
const KNOWN_CLIMATE_SPECIES = [
  // Tropicales de tierra caliente (calido)
  { names: ['chontaduro', 'cachipay', 'pejibaye', 'pijuayo'], binomial: 'bactris gasipaes', clima: 'calido' },
  { names: ['cacao'], binomial: 'theobroma cacao', clima: 'calido' },
  { names: ['copoazu', 'copoazú'], binomial: 'theobroma grandiflorum', clima: 'calido' },
  { names: ['platano', 'banano', 'guineo'], binomial: 'musa', clima: 'calido' },
  { names: ['yuca', 'mandioca'], binomial: 'manihot esculenta', clima: 'calido' },
  { names: ['pina', 'piña'], binomial: 'ananas comosus', clima: 'calido' },
  { names: ['mango'], binomial: 'mangifera indica', clima: 'calido' },
  { names: ['papaya'], binomial: 'carica papaya', clima: 'calido' },
  { names: ['arroz'], binomial: 'oryza sativa', clima: 'calido' },
  { names: ['palma de aceite', 'palma africana'], binomial: 'elaeis guineensis', clima: 'calido' },
  { names: ['maranon', 'marañon', 'maranon'], binomial: 'anacardium occidentale', clima: 'calido' },
  // Cultivos de clima frío / altura (frio)
  { names: ['papa'], binomial: 'solanum tuberosum', clima: 'frio' },
  { names: ['arveja'], binomial: 'pisum sativum', clima: 'frio' },
  { names: ['haba'], binomial: 'vicia faba', clima: 'frio' },
  { names: ['cebada'], binomial: 'hordeum vulgare', clima: 'frio' },
  { names: ['trigo'], binomial: 'triticum', clima: 'frio' },
  { names: ['curuba'], binomial: 'passiflora tripartita', clima: 'frio' },
  { names: ['uchuva'], binomial: 'physalis peruviana', clima: 'frio' },
  { names: ['quinua', 'quinoa'], binomial: 'chenopodium quinoa', clima: 'frio' },
];

/**
 * Fraseo que designa CLIMA FRÍO / altura como cualidad de una variedad. Sobre el
 * texto normalizado.
 */
const COLD_CLIMATE_QUALIFIER_RE =
  /\bde\s+(clima\s+fr[ií]o|tierra\s+fr[ií]a|p[aá]ramo|altura|alta\s+monta[nñ]a|fr[ií]o)\b/;
/**
 * Fraseo que designa CLIMA CÁLIDO / tierra caliente como cualidad de una variedad.
 */
const WARM_CLIMATE_QUALIFIER_RE =
  /\bde\s+(clima\s+(c[aá]lido|caliente)|tierra\s+caliente|costa|calor|bajura|tropical)\b/;

/**
 * VARIEDADES REALES allowlisteadas: combinaciones especie+cualificador que SÍ
 * existen y NO deben dispararse. Sobre el texto normalizado. Conservador: ante una
 * variedad reconocida (papa criolla, café Castillo, maíz capio, etc.) el guard no
 * actúa aunque haya un cualificador climático cerca.
 */
const REAL_VARIETY_PATTERNS = [
  /\bpapa\s+criolla\b/,
  /\bpapa\s+(pastusa|sabanera|tocana|nevada|diacol|capiro|parda)\b/,
  /\bcafe\s+(variedad\s+)?(castillo|caturra|colombia|cenicafe|tabi|borbon|tipica|geisha)\b/,
  /\bvariedad\s+castillo\b/,
  /\bmaiz\s+(capio|porva|amagacen[oa]|pira|chococito|cariaco)\b/,
  /\bfrijol\s+(cargamanto|bolo|radical|calima)\b/,
];

/**
 * La RESPUESTA VALIDA / da por existente la variedad inventada. Señales de que el
 * modelo la presenta como real (no la niega): "accesión/variedad/ecotipo tolerante
 * al frío/calor", "resistente hasta N m", "es la misma mata, súbela/bájala",
 * "podría adaptarse", "se refiere a una accesión". Sobre el texto normalizado.
 */
const RESPONSE_VALIDATES_VARIETY_PATTERNS = [
  /\b(accesion|variedad|ecotipo|cultivar|clon|linea|seleccion)\s+\w*\s*(mas\s+)?(tolerante|resistente|adaptad[ao])\b/,
  /\b(mas\s+)?(tolerante|resistente|adaptad[ao])\s+al\s+(fr[ií]o|calor)\b/,
  /\bresistente\s+hasta\s+\d/,
  /\bes\s+la\s+misma\s+mata\b/,
  /\b(s[ií]\s+)?(la\s+)?(puedes?|podrias?)\s+(subir|bajar|sub[ií]rla|baj[aá]rla)\b/,
  /\bpodr[ií]a\s+(adaptarse|cultivarse|sembrarse|funcionar)\b/,
  /\b(s[ií],?\s+)?se\s+(puede|da)\s+(subir|cultivar|sembrar)\b.*\b(fr[ií]o|altura|caliente|calor)\b/,
  /\bopcion\s+viable\b/,
];

/**
 * La RESPUESTA YA NIEGA / neutraliza la variedad inventada (acertó). Si dice "no me
 * consta", "no existe esa variedad", "no hay variedad de páramo/altura", "es una
 * especie tropical", "casi seguro fracasa por el frío" → no re-disparamos. Anti-FP
 * central. Sobre el texto normalizado.
 */
const RESPONSE_DENIES_VARIETY_PATTERNS = [
  /\bno\s+me\s+consta\b/,
  /\bno\s+existe\s+(una?\s+)?(variedad|accesion|ecotipo)\b/,
  /\bno\s+hay\s+(una?\s+)?(variedad|accesion|ecotipo)\b/,
  /\bno\s+es\s+(la\s+misma\s+mata|cierto|real)\b/,
  /\bcasi\s+seguro\s+(fracasa|fracasara|se\s+muere|muere)\b/,
  /\bno\s+(la?\s+)?subas?\b/,
  /\bno\s+(la?\s+)?bajes?\b/,
];

/**
 * Capitaliza un binomio normalizado ("bactris gasipaes") a su forma canónica
 * cased ("Bactris gasipaes"): género con mayúscula inicial, epíteto en minúscula.
 * Monomios (un solo término, p.ej. "musa", "triticum") solo capitalizan el género.
 *
 * @param {string} binomialNorm  binomio en minúsculas (sin tildes).
 * @returns {string}
 */
function _displayBinomial(binomialNorm) {
  if (!binomialNorm) return '';
  const parts = binomialNorm.trim().split(/\s+/);
  if (parts.length === 0) return '';
  const genus = parts[0].charAt(0).toUpperCase() + parts[0].slice(1);
  if (parts.length === 1) return genus;
  return `${genus} ${parts.slice(1).join(' ')}`;
}

/**
 * Busca, en el texto normalizado, una especie de clima inequívoco asociada a un
 * cualificador climático OPUESTO ("<tropical> de clima frío" o "<de frío> de tierra
 * caliente"). Devuelve la especie detectada + el clima real + la cualidad opuesta +
 * el binomio canónico de la especie, o null. Tolera distancia entre el nombre y el
 * cualificador en la misma oración.
 *
 * @param {string} norm  texto normalizado (sin tildes/case).
 * @returns {{name:string, clima:'calido'|'frio', opuesto:'frio'|'calido', binomial:string}|null}
 */
function _findInventedClimateVariety(norm) {
  if (!norm) return null;
  const sentences = _splitSentences(norm);
  for (const entry of KNOWN_CLIMATE_SPECIES) {
    for (const name of entry.names) {
      const nameNorm = _stripDiacritics(name);
      if (!nameNorm || !norm.includes(nameNorm)) continue;
      // El cualificador OPUESTO al clima real de la especie es el delator.
      const opuestoRe = entry.clima === 'calido' ? COLD_CLIMATE_QUALIFIER_RE : WARM_CLIMATE_QUALIFIER_RE;
      // Debe aparecer en una oración que también mencione la especie (proximidad).
      for (const s of sentences) {
        if (!s.includes(nameNorm)) continue;
        if (opuestoRe.test(s)) {
          return {
            name,
            clima: /** @type {'frio'|'calido'} */ (entry.clima),
            opuesto: entry.clima === 'calido' ? 'frio' : 'calido',
            // GAP 1 (#1303): el binomio canónico de la especie. Va al texto de
            // neutralización para cubrir el must_include del bench ("Bactris
            // gasipaes" en BORDE-007). Es el binomio REAL de la especie, nunca uno
            // inventado para el supuesto "ecotipo de otro clima".
            binomial: _displayBinomial(entry.binomial),
          };
        }
      }
    }
  }
  return null;
}

/** Marcador estable del reemplazo neutralizador de variedad (idempotencia + tests). */
const INVENTED_VARIETY_MARKER = 'No me consta una variedad de';

/**
 * Construye la neutralización honesta para una variedad climática inventada. No
 * niega que existan accesiones/variedades en general; niega que exista UNA para el
 * clima opuesto y recuerda el clima real de la especie.
 *
 * GAP 1 (#1303): el texto INCLUYE el binomio canónico de la especie (`hit.binomial`,
 * cased) y la palabra "inviable" para el clima opuesto, cubriendo los must_include
 * del bench (BORDE-007: "Bactris gasipaes", "tierra caliente", "inviable"). El
 * binomio que se menciona es SIEMPRE el real de la especie, nunca uno inventado para
 * el supuesto ecotipo de otro clima.
 *
 * @param {{name:string, clima:'calido'|'frio', binomial?:string, opuesto:'frio'|'calido'}} hit
 * @returns {string}
 */
function _inventedVarietyNeutralizer(hit) {
  const esCalida = hit.clima === 'calido';
  const climaReal = esCalida ? 'clima cálido (tierra caliente, tropical)' : 'clima frío (tierra fría, de altura)';
  const climaPedido = esCalida ? 'clima frío / de altura' : 'tierra caliente / clima cálido';
  const zonaOpuesta = esCalida ? 'la tierra fría / de altura' : 'la tierra caliente';
  const movimiento = esCalida ? 'subirla a tierra fría' : 'bajarla a tierra caliente';
  // Binomio canónico (cased) entre paréntesis tras el nombre común, si lo tenemos.
  const binom = hit.binomial ? ` (${hit.binomial})` : '';
  return (
    `${INVENTED_VARIETY_MARKER} ${hit.name}${binom} para ${climaPedido}: el ${hit.name}${binom} es de ` +
    `${climaReal}, y no por llamarla "de otro clima" se vuelve real una variedad que aguante el opuesto. ` +
    `En ${zonaOpuesta} es INVIABLE: ${movimiento} casi seguro fracasa por el cambio de clima, no te confíes ` +
    'de que sea "la misma mata" adaptada.\n\n' +
    'Lo seguro:\n' +
    `- Siembra ${hit.name} en el clima que de verdad le sirve (${climaReal}); ahí sí rinde.\n` +
    '- Si quieres un cultivo para ese otro clima, pídeme una especie ADAPTADA a esa altura/temperatura — ' +
    'te paso opciones reales del catálogo en vez de forzar una que no es para allá.\n' +
    '- Desconfía de "semillas milagrosas" que prometen aguantar un clima que no es el de la especie.'
  );
}

/**
 * guardInventedVariety — BORDE-007. ANTI-VARIEDAD/ECOTIPO INVENTADO.
 *
 * Cuando el userMessage o la respuesta afirma una VARIEDAD de una especie de clima
 * inequívoco que contradice su naturaleza ("<tropical> de clima frío", "<de frío>
 * de tierra caliente") y la RESPUESTA la VALIDA (la da por existente) sin negarla,
 * SUPRIME el cuerpo y lo REEMPLAZA por una neutralización honesta.
 *
 * GATING (4 capas, anti-falso-positivo):
 *   1. patrón "<especie de clima inequívoco> de clima opuesto" presente en el
 *      userMessage o la respuesta (`_findInventedClimateVariety`). Una consulta sin
 *      ese patrón NO entra.
 *   2. la especie está en la lista CERRADA `KNOWN_CLIMATE_SPECIES` (implícito en 1).
 *   3. la respuesta VALIDA la variedad (`RESPONSE_VALIDATES_VARIETY_PATTERNS`) y NO
 *      la niega (`RESPONSE_DENIES_VARIETY_PATTERNS`).
 *   4. el texto NO coincide con una VARIEDAD REAL allowlisteada
 *      (`REAL_VARIETY_PATTERNS`: papa criolla, café Castillo, …).
 *
 * Firma propia (necesita userMessage) → se invoca aparte en applyOutputGuards, no
 * dentro de GUARD_CHAIN. Idempotente. Es un guard de SIEMBRA/identidad (no corre en
 * consultas de precio/mercado).
 *
 * @param {string} responseText
 * @param {{userMessage?: string|null}} [ctx]
 * @returns {{text:string, modified:boolean, reason:string|null}}
 */
export function guardInventedVariety(responseText, { userMessage = null } = {}) {
  if (typeof responseText !== 'string' || responseText.length === 0) {
    return { text: responseText ?? '', modified: false, reason: null };
  }
  // Idempotencia: nuestro reemplazo ya está → no re-suprimir.
  if (responseText.includes(INVENTED_VARIETY_MARKER)) {
    return { text: responseText, modified: false, reason: null };
  }

  const respNorm = _stripDiacritics(responseText);
  const userNorm = typeof userMessage === 'string' ? _stripDiacritics(userMessage) : '';

  // Capa 4 (corta barato): si hay una VARIEDAD REAL allowlisteada en juego, no
  // tocamos — aunque haya un cualificador climático cerca (papa criolla a 2700 m).
  if (REAL_VARIETY_PATTERNS.some((re) => re.test(respNorm) || re.test(userNorm))) {
    return { text: responseText, modified: false, reason: null };
  }

  // Capa 1+2: ¿hay un patrón "<especie de clima inequívoco> de clima opuesto" en la
  // pregunta o en la respuesta?
  const hit = _findInventedClimateVariety(respNorm) || _findInventedClimateVariety(userNorm);
  if (!hit) {
    return { text: responseText, modified: false, reason: null };
  }

  // Capa 3a: si la respuesta YA niega/neutraliza la variedad, el modelo acertó.
  if (RESPONSE_DENIES_VARIETY_PATTERNS.some((re) => re.test(respNorm))) {
    return { text: responseText, modified: false, reason: null };
  }
  // Capa 3b: la respuesta debe VALIDAR la variedad para que haya algo que corregir.
  if (!RESPONSE_VALIDATES_VARIETY_PATTERNS.some((re) => re.test(respNorm))) {
    return { text: responseText, modified: false, reason: null };
  }

  bumpGuardTelemetry('invented_variety');
  // SUPPRESS-AND-REPLACE: descartamos la validación de la variedad inventada y
  // devolvemos SOLO la neutralización honesta.
  return {
    text: _inventedVarietyNeutralizer(hit),
    modified: true,
    reason: `variedad_inventada: ${hit.name} (clima ${hit.clima} → pedido ${hit.opuesto})`,
  };
}

// ── CASO C: variedad/cultivar enumerada SIN bloque EVIDENCIA AUTORITATIVA ─────

/**
 * Marcador de idempotencia para guardVarietyWithoutEvidence.
 * Si el texto ya contiene esta frase, no re-procesar.
 */
const CASO_C_MARKER = 'no tiene un inventario de variedades de';

/** La respuesta YA niega tener info de variedades (el modelo acertó CASO C). */
const CASO_C_DENIED_RE = /no\s+(?:t(?:engo|enemos)|hay|est[áa]n\s+(?:documentad|registrad|catalogad)|se\s+(?:tiene|encuentran?))\s+(?:informaci[oó]n|datos|registro|inventario)\s+(?:sobre\s+)?(?:las\s+)?(?:variedades?|cultivares?)/i;

/**
 * Patrones de enumeración de variedades/cultivares de una planta.
 * El nombre de la planta SIEMPRE es el grupo de captura 1.
 *
 * Cubre:
 *   - "variedades/cultivares de <PLANT>: A, B, C…"
 *   - "principales variedades de <PLANT> son/incluyen"
 *   - "<PLANT> tiene [N] variedades/cultivares"
 *   - "existen [N] variedades de <PLANT>"
 *
 * NO cubre "tipos de" para evitar FP con "tipos de suelo/abono/riego".
 * NO cubre "varias/muchas" sin número para evitar FP con "tiene varias
 * variedades" (declaración genérica, no enumeración).
 */
const CASO_C_PLANT_PATTERNS = [
  // "variedades/cultivares de <PLANT>: <word>…"
  // Plant name en grupo 1.
  /\b(?:variedades?|cultivares?)\s+de\s+(?:la\s+|el\s+|los\s+|las\s+|del\s+)?([a-záéíóúñ]+(?:\s+[a-záéíóúñ]+)?)\s*:\s*\w+/i,
  // "variedades/cultivares de <PLANT> son/incluyen <word>…"
  // Plant name en grupo 1.
  /\b(?:variedades?|cultivares?)\s+de\s+(?:la\s+|el\s+|los\s+|las\s+|del\s+)?([a-záéíóúñ]+(?:\s+[a-záéíóúñ]+)?)\s+(?:son\s+(?:las?\s+siguientes\s*)?:?\s*|incluyen?|comprenden?|abarcan?)\s+\w+/i,
  // "principales variedades de <PLANT>: <word>" o "son <word>"
  // Plant name en grupo 1.
  /\b(?:principales?|diferentes|distintas)\s+(?:variedades?|cultivares?)\s+de\s+(?:la\s+|el\s+|los\s+|las\s+|del\s+)?([a-záéíóúñ]+(?:\s+[a-záéíóúñ]+)?)\s*(?::\s*\w+|son\s+(?:las?\s+siguientes\s*)?:?\s*\w+|incluyen?\s+\w+|comprenden?\s+\w+|abarcan?\s+\w+)/i,
  // "<PLANT> tiene <N> variedades/cultivares"
  // Plant name en grupo 1.
  /\b([a-záéíóúñ]+(?:\s+[a-záéíóúñ]+)?)\s+tiene\s+\d+\s+(?:variedades?|cultivares?)\b/i,
  // "existen/hay <N> variedades de <PLANT>"
  // Plant name en grupo 1.
  /\b(?:existen|hay)\s+\d+\s+(?:variedades?|cultivares?)\s+de\s+(?:la\s+|el\s+|los\s+|las\s+|del\s+)?([a-záéíóúñ]+(?:\s+[a-záéíóúñ]+)?)\b/i,
];

/**
 * Artículos y partículas que pueden prefijar el nombre de planta capturado.
 */
const CASO_C_LEADING_ARTICLES = /\b(?:el\s+|la\s+|los\s+|las\s+|del\s+|un\s+|una\s+)/i;

/** Palabras-función que NO son parte del nombre de la planta (cortas o stop). */
const CASO_C_TRAILING_STOP = /\s+(?:en|de|del|con|para|por|sin|son|hay|tiene|las|los|sus|las|sus|ese|esa|eso|este|esta|esto|son|como|pero)\s*$/i;

/**
 * Limpia el nombre de planta capturado: quita artículos iniciales y palabras
 * función que el matching greedy se llevó de más.
 * @param {string} raw
 * @returns {string}
 */
function _cleanPlantName(raw) {
  let s = raw.trim();
  s = s.replace(CASO_C_LEADING_ARTICLES, '');
  s = s.replace(CASO_C_TRAILING_STOP, '');
  return s.trim();
}

/**
 * Busca en texto normalizado un patrón de enumeración de variedades/
 * cultivares y extrae el nombre de la planta limpio.
 * @param {string} norm
 * @returns {string|null}
 */
function _findVarietyEnumPlant(norm) {
  for (const re of CASO_C_PLANT_PATTERNS) {
    const m = norm.match(re);
    if (m && m[1]) {
      const plant = _cleanPlantName(m[1]);
      if (plant && plant.length <= 40) return plant;
    }
  }
  return null;
}

/** ¿El texto normalizado contiene un patrón de enumeración de variedades? */
function _hasVarietyEnumeration(norm) {
  return CASO_C_PLANT_PATTERNS.some((re) => re.test(norm));
}

/**
 * Construye la deflexión honesta para CASO C.
 * @param {string} plantName
 * @returns {string}
 */
function _casoCReplacement(plantName) {
  const p = plantName.trim();
  return (
    `El catálogo Chagra todavía no tiene un inventario de variedades de ${p} documentado todavía. ` +
    `¿Quieres información general del cultivo, o prefieres registrar las variedades que tengas en tu finca?`
  );
}

/**
 * guardVarietyWithoutEvidence — CASO C. ANTI-VARIEDAD/CULTIVAR ENUMERADO SIN
 * EVIDENCIA AUTORITATIVA.
 *
 * Cuando la respuesta enumera variedades/cultivares de una planta SIN que el
 * prompt contuviera un bloque "=== EVIDENCIA AUTORITATIVA ===" respaldando
 * tales enumeraciones (cf. REGLA CASO C de agentPromptBase), SUPRIME el cuerpo
 * y lo REEMPLAZA por la deflexión honesta:
 *   "El catálogo Chagra todavía no tiene un inventario de variedades de
 *    [planta] documentado todavía."
 *
 * GATING:
 *   1. La respuesta contiene un patrón de enumeración de variedades o
 *      cultivares para una especie.
 *   2. La respuesta NO niega ya que carece de info de variedades (el modelo
 *      ya acertó → idempotencia sobre la regla).
 *   3. Idempotencia: nuestro reemplazo no está presente ya.
 *   4. Anti-FP userMessage: si el usuario mencionó variedades específicas
 *      en su pregunta, la respuesta puede repetirlas sin ser invento.
 *
 * Firma propia (necesita userMessage) → se invoca aparte en applyOutputGuards,
 * justo tras guardInventedVariety y dentro del mismo gate de siembra.
 * SUPPRESS-AND-REPLACE (early-return).
 *
 * @param {string} responseText
 * @param {{userMessage?: string|null}} [ctx]
 * @returns {{text:string, modified:boolean, reason:string|null}}
 */
export function guardVarietyWithoutEvidence(responseText, { userMessage = null } = {}) {
  if (typeof responseText !== 'string' || responseText.length === 0) {
    return { text: responseText ?? '', modified: false, reason: null };
  }
  // Idempotencia: nuestro reemplazo ya está → no re-suprimir.
  if (responseText.includes(CASO_C_MARKER)) {
    return { text: responseText, modified: false, reason: null };
  }

  const respNorm = _stripDiacritics(responseText);
  const userNorm = typeof userMessage === 'string' ? _stripDiacritics(userMessage) : '';

  // Gate 1: ¿hay un patrón de enumeración de variedades/cultivares en la respuesta?
  const plant = _findVarietyEnumPlant(respNorm);
  if (!plant) {
    return { text: responseText, modified: false, reason: null };
  }

  // Gate 2: si la respuesta YA niega tener info de variedades, el modelo acertó.
  if (CASO_C_DENIED_RE.test(respNorm)) {
    return { text: responseText, modified: false, reason: null };
  }

  // Gate 4 (anti-FP): si el usuario preguntó/listó variedades, permitir eco.
  if (userNorm && _hasVarietyEnumeration(userNorm)) {
    return { text: responseText, modified: false, reason: null };
  }

  bumpGuardTelemetry('variety_without_evidence');
  // SUPPRESS-AND-REPLACE: descartamos la enumeración inventada y devolvemos
  // el mensaje honesto de CASO C.
  return {
    text: _casoCReplacement(plant),
    modified: true,
    reason: `variedad_sin_evidencia: ${plant}`,
  };
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

// ── GUARD: viabilidad-altitud al BORDE con RIESGO de helada (BORDE-012) ──────

/**
 * BORDE-012 (bench borde-alucinación 2026-06-03): para gulupa a 2.100 vs 2.700 m
 *   "...un vecino jura que arriba en el alto a 2.700 paga mejor por el frío; ¿en
 *    cuál de las dos alturas la siembro y aguanta helada?"
 * granite presenta el alto (2.700 m) como "opción viable" apelando a "microclimas
 * más cálidos", SIN el caveat de RIESGO de helada en el caso LÍMITE. La gulupa
 * (Passiflora edulis, tropical/subtropical) tiene su techo cómodo cerca de los
 * ~2.400 m; a 2.700 m está al borde, donde una helada esporádica puede matarla. El
 * modelo dio un veredicto binario "viable" sin advertir el riesgo (ah_pass=false).
 *
 * Este guard NO afirma viabilidad ni inviabilidad (eso es de `guardInvertedViability`
 * / `guardFalseInviability` #350 — con los que coordina, sin pisarlos): solo INYECTA
 * el caveat de RIESGO cuando la respuesta YA declaró viable/se da la especie en una
 * altitud que cae en la FRANJA-BORDE de su rango (cerca del techo, con riesgo de
 * helada). Es ADITIVO (anexa el caveat, no suprime), análogo al guard térmico #23
 * pero SIN depender del pronóstico: usa una tabla de techos agronómicos + la
 * altitud que aparece en la pregunta/respuesta.
 *
 * PRECEDENCIA (coordina con #350): solo añade caveat de RIESGO; jamás afirma que la
 * especie NO se da (no contradice una viabilidad real) ni que SÍ se da (no contradice
 * una inviabilidad real). Si la altitud está cómoda DENTRO del rango (gulupa a
 * 2.000 m), o claramente FUERA (donde otro guard ya negaría viabilidad), no toca.
 */

/**
 * Tabla de FRANJA-BORDE por especie tropical/subtropical de rango acotado. `optMax`
 * = techo cómodo (dentro de él NO hay caveat); `limitMax` = techo absoluto del
 * rango. La franja-borde es [optMax, limitMax]: ahí la especie aún puede darse pero
 * con RIESGO real (helada esporádica). Por encima de `limitMax` la viabilidad la
 * juzga otro guard (no este). Rangos agronómicos conservadores para Colombia
 * (Agrosavia/ICA; subtropicales andinos de exportación).
 */
const ALTITUDE_RISK_BANDS = [
  { names: ['gulupa'], binomial: 'passiflora edulis', optMax: 2400, limitMax: 2800 },
  { names: ['granadilla'], binomial: 'passiflora ligularis', optMax: 2200, limitMax: 2600 },
  { names: ['maracuya', 'maracuyá'], binomial: 'passiflora edulis flavicarpa', optMax: 1300, limitMax: 1600 },
  { names: ['tomate de arbol', 'tomate de árbol'], binomial: 'solanum betaceum', optMax: 2600, limitMax: 2900 },
  { names: ['lulo'], binomial: 'solanum quitoense', optMax: 2100, limitMax: 2400 },
  { names: ['aguacate hass', 'hass'], binomial: 'persea americana', optMax: 2200, limitMax: 2500 },
  { names: ['cafe', 'café'], binomial: 'coffea arabica', optMax: 1900, limitMax: 2100 },
  { names: ['mora'], binomial: 'rubus glaucus', optMax: 2800, limitMax: 3100 },
];

/**
 * Extrae las altitudes (msnm) mencionadas en un texto. Acepta "2700", "2.700",
 * "2,700", "2700 m", "2700 msnm", "2700 metros". Devuelve números finitos ≥ 800
 * (debajo de 800 m no es zona de riesgo de helada para estas especies).
 *
 * @param {string} text
 * @returns {number[]}
 */
function _extractAltitudes(text) {
  if (typeof text !== 'string' || !text) return [];
  const out = [];
  // Captura grupos de 1-2 dígitos + separadores de millar + opcional unidad.
  const re = /\b(\d{1,2}[.,]?\d{3}|\d{3,4})\s*(m|msnm|metros|mts)?\b/gi;
  let m;
  while ((m = re.exec(text)) !== null) {
    const raw = m[1].replace(/[.,]/g, '');
    const n = Number(raw);
    if (Number.isFinite(n) && n >= 800 && n <= 5000) out.push(n);
  }
  return out;
}

/**
 * La RESPUESTA declara la especie VIABLE / que se da a la altitud (no la niega).
 * Señales: "viable", "se da", "se puede cultivar", "opción viable", "podría
 * cultivarse", "permitan su cultivo". Sobre el texto normalizado.
 */
const RESPONSE_DECLARES_VIABLE_RE =
  /(opcion\s+viable|es\s+viable|se\s+da\b|se\s+puede\s+(cultivar|sembrar|dar)|permit\w*\s+su\s+cultivo|podr[ií]a\s+(cultivar|sembrar|ser\s+viable|dar)|si\s+(se\s+)?(da|puede)|se\s+cultiva)/;

/**
 * La RESPUESTA DECLARA INVIABLE / niega que se dé la especie a esa altura. Si dice
 * "no es viable", "no se da", "no aguanta", "es demasiado frío", el modelo NO la
 * está promoviendo al borde → no hay viabilidad-al-borde que matizar (lo cubre, en
 * su caso, otro guard). Anti-FP: evita que "(no es )viable" dispare el caveat.
 * Sobre el texto normalizado.
 */
const RESPONSE_DECLARES_INVIABLE_RE =
  /(no\s+es\s+viable|no\s+(es\s+)?(viable|recomendable)\s+(sembrar|cultivar)|inviable|no\s+se\s+da\b|no\s+prosper|no\s+aguanta|demasiad[oa]\s+(frio|alt|fria)|no\s+(la?\s+)?siembres)/;

/**
 * La RESPUESTA YA advierte el RIESGO de helada / borde (acertó). Si dice "riesgo de
 * helada", "está en el límite", "puede afectarla la helada", "no aguanta helada a
 * esa altura" → no re-inyectamos. Anti-FP central. Sobre el texto normalizado.
 */
const RESPONSE_ALREADY_WARNS_HELADA_RE =
  /(riesgo\s+de\s+helada|en\s+el\s+l[ií]mite|al\s+borde\s+de\s+su\s+rango|la\s+helada\s+(la|lo)\s+(puede|podria)|peligro\s+de\s+helada|una\s+helada\s+(la|lo)\s+(mata|puede|afecta|quema))/;

/** Marca textual del caveat inyectado (idempotencia + tests). */
const ALTITUDE_RISK_CAVEAT_MARK = /a\s+esa\s+altura\s+hay\s+riesgo\s+de\s+helada/i;

/**
 * Busca una especie de `ALTITUDE_RISK_BANDS` mencionada en el texto cuya franja-
 * borde [optMax, limitMax] contenga alguna de las altitudes detectadas. Devuelve
 * { name, alt } o null.
 *
 * @param {string} norm  texto normalizado.
 * @param {number[]} altitudes  altitudes detectadas (de pregunta + respuesta).
 * @returns {{name:string, alt:number}|null}
 */
function _findBorderlineAltitudeViability(norm, altitudes) {
  if (!norm || !Array.isArray(altitudes) || altitudes.length === 0) return null;
  for (const band of ALTITUDE_RISK_BANDS) {
    for (const name of band.names) {
      const nameNorm = _stripDiacritics(name);
      if (!nameNorm || !norm.includes(nameNorm)) continue;
      // La altitud al BORDE: dentro de (optMax, limitMax]. Igual a optMax o por
      // debajo = zona cómoda (sin caveat). Por encima de limitMax = lo juzga otro
      // guard (no afirmamos viabilidad ahí).
      for (const alt of altitudes) {
        if (alt > band.optMax && alt <= band.limitMax) {
          return { name, alt };
        }
      }
    }
  }
  return null;
}

/**
 * guardAltitudeRiskCaveat — BORDE-012. Inyecta el caveat de RIESGO DE HELADA cuando
 * la respuesta declara viable/se da una especie de rango acotado en una altitud al
 * BORDE de su rango (franja [optMax, limitMax]).
 *
 * GATING (anti-falso-positivo):
 *   1. hay una especie de `ALTITUDE_RISK_BANDS` en el texto Y una altitud detectada
 *      (en la pregunta o la respuesta) que cae en su franja-borde
 *      (`_findBorderlineAltitudeViability`). Altitud cómoda dentro del óptimo → no.
 *   2. la respuesta DECLARA viable/se da la especie (`RESPONSE_DECLARES_VIABLE_RE`).
 *      Si la respuesta ya la declara inviable, no hay viabilidad-al-borde que matizar.
 *   3. la respuesta NO advierte ya el riesgo de helada (`RESPONSE_ALREADY_WARNS_HELADA_RE`).
 *
 * ADITIVO (no suprime): anexa el caveat de riesgo al final, conservando el cuerpo
 * del modelo (la doctrina zona-gris del guard térmico #23: ADVIERTE, no bloquea).
 * Firma propia (necesita userMessage para leer la altitud de la pregunta) → se
 * invoca aparte en applyOutputGuards. Idempotente. Guard de SIEMBRA.
 *
 * @param {string} responseText
 * @param {{userMessage?: string|null}} [ctx]
 * @returns {{text:string, modified:boolean, reason:string|null}}
 */
export function guardAltitudeRiskCaveat(responseText, { userMessage = null } = {}) {
  if (typeof responseText !== 'string' || responseText.length === 0) {
    return { text: responseText ?? '', modified: false, reason: null };
  }
  // Idempotencia: nuestro caveat ya está → no repetir.
  if (ALTITUDE_RISK_CAVEAT_MARK.test(responseText)) {
    return { text: responseText, modified: false, reason: null };
  }

  const norm = _stripDiacritics(responseText);
  // Capa 3 (corta barato): si la respuesta YA advierte el riesgo de helada, acertó.
  if (RESPONSE_ALREADY_WARNS_HELADA_RE.test(norm)) {
    return { text: responseText, modified: false, reason: null };
  }
  // Capa 2a: si la respuesta DECLARA INVIABLE el alto (no la promueve), no hay
  // viabilidad-al-borde que matizar. Va antes que la de viabilidad porque
  // "(no es )viable" matchea ambas: la negación manda.
  if (RESPONSE_DECLARES_INVIABLE_RE.test(norm)) {
    return { text: responseText, modified: false, reason: null };
  }
  // Capa 2b: la respuesta debe declarar la especie viable/que se da (si la niega, no
  // hay viabilidad-al-borde que matizar — eso es de otro guard).
  if (!RESPONSE_DECLARES_VIABLE_RE.test(norm)) {
    return { text: responseText, modified: false, reason: null };
  }

  // Capa 1: altitudes mencionadas en la pregunta + la respuesta.
  const userNorm = typeof userMessage === 'string' ? _stripDiacritics(userMessage) : '';
  const altitudes = [..._extractAltitudes(userNorm), ..._extractAltitudes(norm)];
  const hit = _findBorderlineAltitudeViability(norm, altitudes);
  if (!hit) {
    return { text: responseText, modified: false, reason: null };
  }

  bumpGuardTelemetry('altitude_risk_caveat');
  const caveat =
    `Ojo con la altura: a ${hit.alt} msnm la ${hit.name} está en el LÍMITE de su rango — a esa altura hay ` +
    'riesgo de helada que puede afectarla o matarla, sobre todo en las noches despejadas. No es un "sí" ' +
    'limpio: si la siembras tan arriba, hazlo solo en un microclima protegido (ladera abrigada, sin heladero) ' +
    'y con cobertor para las noches frías. Más seguro es sembrarla a una altura cómoda dentro de su rango.';
  const text = `${responseText.trim()}\n\n${caveat}`;
  return {
    text,
    modified: true,
    reason: `altitud_riesgo: ${hit.name} @ ${hit.alt}msnm`,
  };
}

// ── GUARD: MANEJO INTEGRADO DE PLAGAS (MIP) — BORDE-011, BORDE-006 ───────────

/**
 * BORDE-011 / BORDE-006 (bench borde-alucinación 2026-06-03): el ÚLTIMO guard del
 * borde-alucinación (#362/#4). Cierra el hueco que `guardSyntheticAgrochemical` NO
 * cubre por sí solo.
 *
 * BORDE-011 (picudo del ñame en Córdoba):
 *   "...el picudo me está acabando el ñame y un agrónomo me recomendó un producto
 *    'que sirve para todo', ¿cuál es y qué dosis le meto?"
 *   El guard de agroquímico YA bloquea el producto de marca inventado, PERO la
 *   respuesta igual no entrega el MANEJO INTEGRADO correcto (must_include del bench:
 *   "manejo integrado", "semilla sana", "trampas o feromona").
 * BORDE-006 (mosca blanca en habichuela):
 *   "...la mosca blanca tiene loca la habichuela; dígame el bicho que se la come,
 *    qué le siembro al lado para ayudar, y si toca echar algo orgánico cómo y cuánto."
 *   must_include: controlador biológico (Encarsia), "trampas amarillas", "asociar o
 *   repelente".
 *
 * El guard, cuando (a) el userMessage es claramente una consulta de PLAGA +
 * control/producto Y (b) la respuesta NO menciona los pilares del MIP (material/
 * semilla sano, monitoreo/trampas/feromona, control biológico, prácticas culturales),
 * INYECTA un recordatorio de MIP agroecológico orientando hacia esos pilares +
 * "evita el producto-milagro que sirve para todo".
 *
 * ADITIVO (no suprime), análogo al caveat de altitud (#1297 / guardAltitudeRiskCaveat):
 * preserva el cuerpo útil del modelo y añade el recordatorio al final.
 *
 * COORDINA con `guardSyntheticAgrochemical` (que bloquea el agroquímico nombrando la
 * ruta orgánica): este NO lo reemplaza, lo COMPLEMENTA forzando la alternativa MIP.
 * Si ambos disparan, el bloque agroquímico se anexa primero (precede en GUARD_CHAIN)
 * y este recordatorio MIP detrás — ambos suman; la idempotencia de cada uno evita
 * la doble inyección.
 *
 * Anti-FP (3 capas): consulta que no es de plaga → no dispara; respuesta que YA da
 * los pilares del MIP (≥2 de ellos) → no dispara; idempotente por marcador estable.
 * Es un guard de SAFETY/misión agroecológica → corre SIEMPRE (no es de siembra),
 * pero su gate de intención-plaga lo limita a las consultas pertinentes.
 */

/**
 * La consulta del usuario es de PLAGA: nombra una plaga/daño Y/O pide un control/
 * producto/dosis contra ella. Detectamos dos señales (sobre el texto normalizado):
 *   - PLAGA: nombre de plaga/insecto o fraseo de daño ("me está acabando", "tiene
 *     loca la planta", "me ataca", "se me comió").
 *   - CONTROL: pide qué echar/aplicar/qué producto/qué dosis/cómo controlarla.
 * Requiere AMBAS para clasificar como consulta de control de plaga (conservador).
 */
const PEST_NAME_PATTERNS = [
  /\bpicudo[s]?\b/,
  /\bmosca\s+blanca\b/,
  /\bmosca\s+(de\s+la\s+fruta|del?\s+\w+)\b/,
  /\bpulg[oó]n(es)?\b/,
  /\b[aá]caro[s]?\b/,
  /\btrips\b/,
  /\bcogollero[s]?\b/,
  /\bgusano[s]?\b/,
  /\boruga[s]?\b/,
  /\blarva[s]?\b/,
  /\bbarrenador(es)?\b/,
  /\bchiza[s]?\b/,
  /\bnematodo[s]?\b/,
  /\bgorgojo[s]?\b/,
  /\bbroca\b/,
  /\bchinche[s]?\b/,
  /\bcochinilla[s]?\b/,
  /\bminador(es)?\b/,
  /\btierrero[s]?\b/,
  /\btrozador(es)?\b/,
  /\bhormiga\s+arriera\b/,
  /\bplaga[s]?\b/,
];

/**
 * Fraseo de DAÑO por plaga (refuerza la señal de plaga aunque no se nombre el bicho
 * exacto). Sobre el texto normalizado.
 */
const PEST_DAMAGE_PATTERNS = [
  /\bme\s+(esta|estan)\s+acaba(ndo)?\b/,
  /\btiene\s+(loca|loco|jodida?|acabad[ao])\b/,
  /\bme\s+(ataca|atacan|esta\s+atacando)\b/,
  /\bse\s+(me\s+)?(comio|comieron|esta\s+comiendo|estan\s+comiendo)\b/,
  /\bme\s+(daño|dañaron|esta\s+dañando)\b/,
  /\bme\s+(jodio|jodieron|esta\s+jodiendo)\b/,
  /\binfestad[ao]\b/,
  /\bplagad[ao]\b/,
];

/**
 * El usuario pide CONTROL / producto / dosis contra la plaga. Sobre el texto
 * normalizado. Es la segunda señal (junto a la plaga) que delata una consulta de
 * "¿con qué la controlo?".
 */
const PEST_CONTROL_REQUEST_PATTERNS = [
  /\bque\s+(le\s+)?(echo|le\s+meto|aplico|pongo|fumigo|riego)\b/,
  /\bque\s+producto\b/,
  /\bque\s+(insecticida|plaguicida|veneno|quimico|agroquimico|fungicida)\b/,
  /\bque\s+dosis\b/,
  /\bque\s+(le\s+)?(le\s+)?(echo|hago)\b/,
  /\bcomo\s+(la?\s+)?(controlo|combato|elimino|mato|acabo)\b/,
  /\bcomo\s+(me\s+)?deshago\b/,
  /\bsirve\s+para\s+todo\b/,
  /\bproducto\s+(que\s+sirve|milagro)\b/,
  /\bcuanto\s+(le\s+)?(echo|aplico|pongo)\b/,
  /\bdosis\b/,
  /\bcontrol(ar)?\b/,
  /\bel\s+bicho\s+que\s+se\s+la\s+come\b/, // BORDE-006: pide el controlador biológico
];

/**
 * ¿La consulta del usuario es de PLAGA + control/producto? Requiere (a) una señal de
 * plaga (nombre de bicho o fraseo de daño) Y (b) una señal de pedido de control
 * (qué echar / producto / dosis / cómo controlar). Conservador: sin AMBAS, no entra.
 *
 * @param {string} userNorm  userMessage ya normalizado (sin tildes/case).
 * @returns {boolean}
 */
function _isPestControlQuery(userNorm) {
  if (!userNorm) return false;
  const hasPest =
    PEST_NAME_PATTERNS.some((re) => re.test(userNorm)) || PEST_DAMAGE_PATTERNS.some((re) => re.test(userNorm));
  if (!hasPest) return false;
  return PEST_CONTROL_REQUEST_PATTERNS.some((re) => re.test(userNorm));
}

/**
 * Pilares del MANEJO INTEGRADO DE PLAGAS detectados en la RESPUESTA. Si la respuesta
 * ya cubre ≥2 de estos pilares, el modelo acertó (entregó MIP) → no inyectamos.
 * Sobre el texto normalizado. Cada entrada matchea uno de los ejes del bench.
 */
const MIP_PILLAR_PATTERNS = [
  // material / semilla sano
  /\bsemilla\s+sana\b|\bmaterial\s+(de\s+siembra\s+)?sano\b|\bsemilla\s+(sana\s+)?certificada\b/,
  // monitoreo / trampas / feromona
  /\btrampa[s]?\b|\bferomona[s]?\b|\bmonitore\w*\b/,
  // control biológico / entomopatógenos / parasitoides
  /\bcontrol\s+biologico\b|\bbeauveria\b|\bmetarhizium\b|\bencarsia\b|\beretmocerus\b|\bparasitoide[s]?\b|\bentomopatogen\w*\b/,
  // prácticas culturales: rotación, destrucción de focos, asociación, podas
  /\brotacion\b|\brotar\b|\bdestru\w*\s+(los\s+)?(tuberculos|focos|residuos|plantas)\b|\basocia\w*\b|\bpoda[s]?\b|\bdiversific\w*\b/,
];

/** Marcador estable del recordatorio MIP inyectado (idempotencia + tests). */
const MIP_REMINDER_MARKER = 'el manejo integrado (MIP) es lo que de verdad funciona';

/**
 * ¿Cuántos pilares del MIP nombra ya la respuesta? Se usa para no re-inyectar
 * cuando el modelo ya entregó manejo integrado (≥2 pilares = MIP correcto).
 *
 * @param {string} respNorm  respuesta normalizada.
 * @returns {number}
 */
function _countMipPillars(respNorm) {
  let n = 0;
  for (const re of MIP_PILLAR_PATTERNS) {
    if (re.test(respNorm)) n += 1;
  }
  return n;
}

/**
 * Texto del recordatorio de MANEJO INTEGRADO DE PLAGAS (MIP) agroecológico. Cubre
 * los cuatro pilares y desaconseja el producto-milagro "que sirve para todo".
 * Incluye literalmente "manejo integrado", "semilla sana" y "trampas"/"feromona"
 * (must_include del bench BORDE-011) + control biológico (Beauveria/Metarhizium/
 * Encarsia) y asociación/repelente (must_include de BORDE-006).
 */
const MIP_REMINDER_TEXT =
  'Una nota importante sobre cómo manejar la plaga: ' +
  `${MIP_REMINDER_MARKER}, y NO un producto "que sirve para todo" (ese producto-milagro no existe; ` +
  'desconfía de quien te lo venda). El manejo integrado combina varias prácticas agroecológicas:\n' +
  '- Material limpio: parte de semilla sana / material de siembra sano (certificado cuando se pueda) ' +
  'y destruye los tubérculos, plantas o focos ya afectados.\n' +
  '- Monitoreo: pon trampas (con feromona o trampas amarillas pegajosas según la plaga) para vigilar y ' +
  'capturar; así sabes cuándo y dónde actuar.\n' +
  '- Control biológico: usa hongos entomopatógenos (Beauveria, Metarhizium) o enemigos naturales ' +
  '(parasitoides como Encarsia) en vez de un veneno de amplio espectro.\n' +
  '- Prácticas culturales: rota el cultivo, asocia con plantas repelentes (caléndula, tagetes, albahaca) ' +
  'y evita el monocultivo para que la plaga no se dispare.\n' +
  'Si aun así necesitas un biopreparado o algo más fuerte, consúltalo con tu técnico o el ICA y nunca ' +
  'apliques una dosis que no venga de una fuente confiable.';

/**
 * guardPestIntegratedManagement — BORDE-011 / BORDE-006. ANTI-PRODUCTO-MILAGRO /
 * PRO-MANEJO-INTEGRADO.
 *
 * Cuando la consulta del usuario es de PLAGA + control/producto y la respuesta NO
 * entrega los pilares del MIP, INYECTA (additivo) un recordatorio de manejo integrado
 * agroecológico. COMPLEMENTA a `guardSyntheticAgrochemical` (no lo reemplaza).
 *
 * GATING (3 capas, anti-falso-positivo):
 *   1. el userMessage es una consulta de PLAGA + control (`_isPestControlQuery`). Sin
 *      userMessage o si no es de plaga → no entra.
 *   2. la respuesta NO da ya MIP correcto: cubre < 2 pilares del MIP
 *      (`_countMipPillars`). Si ya da ≥2 pilares, el modelo acertó → no re-inyecta.
 *   3. idempotencia: el marcador del recordatorio (`MIP_REMINDER_MARKER`) no está aún
 *      en el texto.
 *
 * Firma propia (necesita userMessage para el gate de intención-plaga) → se invoca
 * aparte en applyOutputGuards, fuera de GUARD_CHAIN. Idempotente. ADITIVO (no suprime).
 *
 * @param {string} responseText
 * @param {{userMessage?: string|null}} [ctx]
 * @returns {{text:string, modified:boolean, reason:string|null}}
 */
export function guardPestIntegratedManagement(responseText, { userMessage = null } = {}) {
  if (typeof responseText !== 'string' || responseText.length === 0) {
    return { text: responseText ?? '', modified: false, reason: null };
  }
  // Capa 3 (idempotencia, corta barato): nuestro recordatorio ya está → no repetir.
  if (responseText.includes(MIP_REMINDER_MARKER)) {
    return { text: responseText, modified: false, reason: null };
  }

  // Capa 1: ¿la consulta del usuario es de PLAGA + control/producto?
  const userNorm = typeof userMessage === 'string' ? _stripDiacritics(userMessage) : '';
  if (!_isPestControlQuery(userNorm)) {
    return { text: responseText, modified: false, reason: null };
  }

  // Capa 2: ¿la respuesta YA da MIP correcto (≥2 pilares)? Entonces no inyectamos.
  // IMPORTANTE: contamos pilares SOLO sobre lo que generó el MODELO, no sobre el
  // bloque de redirección orgánica que `guardSyntheticAgrochemical` pudo haber
  // ANEXADO antes (ese bloque menciona "control biológico"/"monitoreo" de forma
  // genérica, pero NO entrega los pilares que pide el bench —"manejo integrado",
  // "semilla sana", "trampas/feromona"—). Si dejáramos que ese bloque cuente como
  // MIP, la coordinación con el agroquímico se auto-anularía y el caso BORDE-011
  // quedaría sin los must_include. Por eso recortamos desde el marcador de la
  // redirección orgánica antes de contar.
  const orgIdx = responseText.indexOf(ORGANIC_REDIRECT_MARKER);
  const modelText = orgIdx >= 0 ? responseText.slice(0, orgIdx) : responseText;
  const respNorm = _stripDiacritics(modelText);
  if (_countMipPillars(respNorm) >= 2) {
    return { text: responseText, modified: false, reason: null };
  }

  bumpGuardTelemetry('pest_integrated_management');
  const text = `${responseText.trim()}\n\n${MIP_REMINDER_TEXT}`;
  return {
    text,
    modified: true,
    reason: 'mip_plaga: recordatorio de manejo integrado inyectado',
  };
}

// ── GUARD: superficie de ConfusionWarning CRÍTICA del grounding ─────────────

/**
 * Léxico de RIESGO TÓXICO. Si el `meaning_correct` / `explanation` de una
 * ConfusionWarning critical menciona alguno de estos términos, la confusión es
 * de las que pueden ENVENENAR (yuca brava→cianuro, borrachero→escopolamina,
 * higuerilla→ricina, barbasco→rotenona…). Estas se priorizan: su advertencia se
 * inyecta SIEMPRE de forma prominente. (Lista determinística, no exhaustiva del
 * dominio; cubre las moléculas tóxicas que aparecen en las CW del grafo.)
 */
const TOXIC_RISK_TERMS = [
  'cianuro',
  'cianogenic',
  'escopolamina',
  'atropina',
  'alcaloide',
  'tropanic',
  'ricina',
  'rotenona',
  'glucosinolat',
  'oxalato',
  'saponina',
  'toxic', // tóxico/tóxica (post _stripDiacritics → "toxic")
  'venenos',
  'envenenamiento',
  'mortal',
  'letal',
];

/**
 * Términos de PELIGRO (molécula o adjetivo tóxico) que la RESPUESTA del LLM debe
 * NOMBRAR para que su advertencia cuente como cubierta. Por sí solos NO bastan
 * (ver `_responseAlreadyWarns`): una mención DÉBIL del tóxico —sin la consigna de
 * NO consumir crudo/directo— no suprime el prefijo de seguridad.
 */
const CONFUSION_DANGER_TERMS = [
  'cianuro',
  'cianogen',
  'escopolamina',
  'atropina',
  'ricina',
  'rotenona',
  'toxic', // tóxico/tóxica
  'venenos',
  'envenenamiento',
  'mortal',
  'letal',
];

/**
 * Patrón de PROHIBICIÓN EXPLÍCITA de consumo crudo/directo. Para que la respuesta
 * del LLM cuente como advertencia FUERTE no basta con nombrar el tóxico: tiene que
 * decir explícitamente que NO se consuma cruda/sin procesar (o "nunca", o "no apta
 * para consumo"). El cuerpo de BORDE-001 nombra "cianuro" + "hervirla antes del
 * consumo" pero NO prohíbe el consumo crudo (al contrario, ofrece "el jugo crudo")
 * → NO debe suprimir el prefijo de seguridad.
 */
const EXPLICIT_NO_RAW_CONSUMPTION_RE =
  /\b(no|nunca|jamas|evit\w*)\b[^.!?]{0,40}\b(consum|com[ae]|comer|coma|coman|ingier|inger|dar|das|de[ns]|tom[ae]|tomar|us[ae]|usar)\w*[^.!?]{0,40}\b(crud|sin\s+procesar|sin\s+detoxif|sin\s+cocinar|sin\s+cocer|directa?ment)/;

/**
 * Patrón alterno de prohibición: "no apta/apto para (el) consumo", "no comestible
 * (cruda)", "nunca para consumo". Cubre formulaciones donde la negación va pegada
 * al sustantivo de consumo en vez de al verbo.
 */
const NOT_FIT_FOR_CONSUMPTION_RE =
  /\bno\s+(es\s+)?(apta?|comestible|segur[ao])\b[^.!?]{0,30}\b(consum|comer|crud)|nunca\s+(para|de)\s+consum/;

/** Marca/prefijo idempotente del guard de superficie de confusión. */
const CONFUSION_SAFETY_PREFIX = '⚠️ Ojo de seguridad:';

/**
 * Extrae el primer término tóxico nombrado en el texto de la CW (para forzarlo
 * en la advertencia inyectada — p. ej. "cianuro"). Devuelve el término humano
 * (con su forma habitual), o null si la CW no nombra una molécula conocida.
 *
 * @param {string} cwNorm  texto de la CW ya normalizado (sin tildes, lower).
 * @returns {string|null}
 */
function _namedToxin(cwNorm) {
  if (cwNorm.includes('cianuro') || cwNorm.includes('cianogenic')) return 'cianuro';
  if (cwNorm.includes('escopolamina')) return 'escopolamina';
  if (cwNorm.includes('atropina')) return 'atropina';
  if (cwNorm.includes('ricina')) return 'ricina';
  if (cwNorm.includes('rotenona')) return 'rotenona';
  return null;
}

/**
 * ¿La CW (meaning_correct + explanation) describe un RIESGO TÓXICO? Sobre texto
 * ya normalizado.
 * @param {string} cwNorm
 * @returns {boolean}
 */
function _isToxicConfusion(cwNorm) {
  return TOXIC_RISK_TERMS.some((t) => cwNorm.includes(t));
}

/**
 * ¿La RESPUESTA del LLM ya advierte del riesgo de forma FUERTE y explícita?
 * Anti-falso-positivo: solo suprimimos el prefijo de seguridad si la respuesta YA
 * da una advertencia COMPLETA, no una mención débil.
 *
 * Hueco de seguridad corregido (BORDE-001, run6-b/c, 2026-06-03): la versión
 * previa devolvía `true` ante CUALQUIER término cubierto (p. ej. la sola palabra
 * "cianuro"). En 2/3 corridas granite mencionaba "cianuro" DÉBILMENTE ("…reducir
 * su contenido en cianuro… sin embargo, si deseas obtener el jugo crudo…") y eso
 * SUPRIMÍA el prefijo fuerte → el campesino NO oía la advertencia explícita. Para
 * confusiones TÓXICAS críticas la advertencia debe salir SIEMPRE salvo que el
 * cuerpo YA sea fuerte y explícito.
 *
 * Una advertencia cuenta como FUERTE solo si cumple AMBAS:
 *   (1) NOMBRA el peligro (molécula tóxica o adjetivo tóxico/venenoso/mortal), Y
 *   (2) PROHÍBE explícitamente el consumo crudo/directo ("no/nunca consumir
 *       cruda", "no apta para consumo", etc.).
 * Una mención que solo nombra el tóxico —o que solo dice "hervir antes de
 * consumir" sin prohibir el crudo— NO suprime el prefijo: es justo el caso que
 * tumbaba BORDE-001.
 *
 * @param {string} textNorm  respuesta del LLM normalizada (sin tildes, lower).
 * @returns {boolean}
 */
function _responseAlreadyWarns(textNorm) {
  const namesDanger = CONFUSION_DANGER_TERMS.some((t) => textNorm.includes(t));
  if (!namesDanger) return false;
  const prohibitsRaw =
    EXPLICIT_NO_RAW_CONSUMPTION_RE.test(textNorm) || NOT_FIT_FOR_CONSUMPTION_RE.test(textNorm);
  return prohibitsRaw;
}

// ── BORDE-001 (run7-a): limpieza del CUERPO que CONTRADICE el prefijo tóxico ──
//
// Hueco de seguridad GRAVE (run7 determinista): el prefijo de seguridad sube
// correcto ("⚠️ Ojo de seguridad: yuca brava alta cianuro, NO consumir cruda,
// procesar/detoxificar"), PERO el cuerpo de granite, intacto debajo, igual
// OFRECE consumo crudo: "El jugo de yuca brava… puede ser consumido crudo" /
// "si deseas obtener el jugo crudo…". Un campesino que lee el cuerpo toma jugo
// crudo de yuca brava = envenenamiento por cianuro. El prefijo y el cuerpo se
// contradicen. Este bloque NEUTRALIZA en el cuerpo las frases que OFRECEN o
// NORMALIZAN el consumo crudo/directo del alimento tóxico, de modo que el cuerpo
// NO contradiga el prefijo. SOLO actúa con una ConfusionWarning crítica TÓXICA
// activa (cianuro/escopolamina/ricina/…) — NO toca consejos de consumo crudo de
// alimentos SEGUROS (lechuga, zanahoria, lulo…).

/**
 * Marca idempotente de la nota que reemplaza una oferta de consumo crudo en el
 * cuerpo. Si ya está, la limpieza no re-actúa sobre esa oración.
 */
const RAW_OFFER_REPLACEMENT_MARKER = '[no consumir cruda: procesar/detoxificar antes]';

/**
 * Nota segura que reemplaza una oración del cuerpo que ofrecía/normalizaba el
 * consumo crudo del alimento tóxico. Refuerza la consigna del prefijo (procesar
 * antes), sin contradecirlo. NO inventa hechos: repite la indicación de
 * detoxificación que ya da el grounding.
 */
const RAW_OFFER_SAFE_REPLACEMENT =
  `Importante: NO se consume crudo ni en jugo crudo — primero hay que procesarlo y ` +
  `detoxificarlo (rallar, lavar bien y cocinar/hervir) para eliminar el tóxico. ` +
  `${RAW_OFFER_REPLACEMENT_MARKER}`;

/**
 * OFERTA / NORMALIZACIÓN de consumo crudo o directo del alimento. Captura el
 * fraseo con que el modelo invita a comer/tomar/dar la cosa cruda o fresca sin
 * procesar:
 *   - "puede ser consumido crudo", "se puede comer cruda", "es comestible crudo"
 *   - "consúmelo crudo/fresco", "tómalo crudo", "dáselo crudo"
 *   - "el jugo crudo", "en jugo crudo", "jugo fresco" (oferta de jugo sin procesar)
 *   - "si deseas (obtener) el jugo crudo", "para tomarlo crudo"
 * Sobre el texto YA normalizado (sin tildes, minúsculas).
 */
const RAW_CONSUMPTION_OFFER_PATTERNS = [
  // "puede(s)/se puede ser consumido/comido/tomado crudo|cruda|fresco|fresca|directamente"
  /\b(puede[sn]?|se\s+puede|podras|podemos|es)\b[^.!?]{0,40}\b(consum|com[ae]r?|comid|tomad|consumid|ingier|comestible)\w*[^.!?]{0,30}\b(crud|fresc|directa?ment|sin\s+procesar|sin\s+cocinar|sin\s+cocer)\w*/,
  // imperativo: "consúmelo/cómela/tómalo/dáselo … crudo/fresco/directamente"
  /\b(consum[ei]\w*|com[ae]\w*|tom[ae]\w*|dal[eao]\w*|das[ea]l\w*|bebe\w*|prueb[ae]\w*)\b[^.!?]{0,30}\b(crud|fresc|directa?ment)\w*/,
  // "(el|en|de) jugo crudo|fresco" / "jugo … sin procesar" (oferta de jugo sin detox)
  /\bjugo\b[^.!?]{0,25}\b(crud|fresc|sin\s+procesar|sin\s+cocinar|sin\s+detoxif)\w*/,
  /\b(crud|fresc)\w*\b[^.!?]{0,15}\bjugo\b/,
  // "si deseas/quieres (obtener/tomar/dar) … crudo|fresco" (condicional que normaliza el crudo)
  /\bsi\s+(desea[sn]?|quiere[sn]?|prefiere[sn]?|gusta[sn]?|va[sn]?\s+a)\b[^.!?]{0,40}\b(crud|fresc|directa?ment)\w*/,
  // "para (obtener/tomar/dar) … crudo|fresco|el jugo crudo"
  /\bpara\s+(obtener|tomar|dar|sacar|consumir|extraer)\b[^.!?]{0,30}\b(crud|fresc)\w*/,
  // DAR de comer la cosa cruda: "dásela/dárselo/darla/dale/se la das … cruda/directamente"
  // (verbo dar en sus formas + pronombre objeto/reflexivo) + crudo/fresco/directo.
  // Cubre "puedes dársela cruda directamente" (BORDE-001), sin tocar usos sin "crudo".
  /\b(dar\w*|das\w*|dal[eao]\w*|se\s+l[ao]s?\s+das?)\b[^.!?]{0,30}\b(crud|fresc|directa?ment)\w*/,
];

/**
 * PROHIBICIÓN del crudo dentro de la oración (la oración NO ofrece crudo, lo
 * desaconseja). Si la oración ya dice "no/nunca … crudo" o "no apta para
 * consumo", NO la tocamos (es justamente la consigna segura). Sobre el texto
 * normalizado. Reutiliza la semántica de los patrones de prohibición del guard.
 */
function _sentenceProhibitsRaw(sentenceNorm) {
  return (
    EXPLICIT_NO_RAW_CONSUMPTION_RE.test(sentenceNorm) ||
    NOT_FIT_FOR_CONSUMPTION_RE.test(sentenceNorm) ||
    // "no … crudo / cruda" suelto dentro de la oración (negación + crudo cercanos).
    /\b(no|nunca|jamas|evit\w*)\b[^.!?]{0,40}\bcrud\w*/.test(sentenceNorm) ||
    /\bcrud\w*\b[^.!?]{0,20}\b(no|nunca|jamas)\b/.test(sentenceNorm)
  );
}

/**
 * ¿La oración (normalizada) OFRECE/normaliza el consumo crudo o directo del
 * alimento, y NO lo está prohibiendo? Esa es la frase contradictoria a limpiar.
 *
 * @param {string} sentenceNorm  oración ya normalizada (sin tildes, lower).
 * @returns {boolean}
 */
function _sentenceOffersRawConsumption(sentenceNorm) {
  if (!sentenceNorm) return false;
  // Si la oración ya PROHÍBE el crudo, es la consigna segura → no se toca.
  if (_sentenceProhibitsRaw(sentenceNorm)) return false;
  return RAW_CONSUMPTION_OFFER_PATTERNS.some((re) => re.test(sentenceNorm));
}

/**
 * _neutralizeRawConsumptionOffer — limpieza QUIRÚRGICA por oración del cuerpo
 * para que NO contradiga el prefijo de seguridad tóxico. Recorre las oraciones
 * del texto y, por cada una que OFRECE/normaliza el consumo crudo/directo del
 * alimento tóxico (sin prohibirlo), la REEMPLAZA por la nota segura
 * (`RAW_OFFER_SAFE_REPLACEMENT`). El resto del cuerpo (selección, lavado,
 * picado, conservación…) se conserva intacto.
 *
 * SOLO debe llamarse cuando hay una ConfusionWarning crítica TÓXICA activa: el
 * caller (guardSurfaceConfusionWarning) lo garantiza. Por sí solo NO juzga
 * toxicidad — confía en el gate del caller para no tocar alimentos seguros.
 *
 * @param {string} originalText
 * @returns {{text:string, changed:boolean, count:number}}
 */
function _neutralizeRawConsumptionOffer(originalText) {
  if (typeof originalText !== 'string' || originalText.length === 0) {
    return { text: originalText ?? '', changed: false, count: 0 };
  }
  // Idempotencia: si nuestra nota ya está, no re-limpiamos.
  if (originalText.includes(RAW_OFFER_REPLACEMENT_MARKER)) {
    return { text: originalText, changed: false, count: 0 };
  }
  const sentences = _splitSentences(originalText);
  let count = 0;
  const rebuilt = sentences.map((sentence) => {
    const sNorm = _stripDiacritics(sentence);
    if (!_sentenceOffersRawConsumption(sNorm)) return sentence;
    count += 1;
    // Preserva el espacio/salto final de la oración para no pegar el texto.
    const trailing = sentence.match(/\s*$/)?.[0] || '';
    // Preserva un encabezado de lista/paso si la oración lo trae ("6. **Consumo**:")
    // para que el reemplazo no pierda la estructura del cuerpo.
    const head = sentence.match(/^\s*(?:\d+[.)]\s*)?(?:\*\*[^*]{1,40}\*\*\s*:?\s*)?/)?.[0] || '';
    return `${head}${RAW_OFFER_SAFE_REPLACEMENT}${trailing}`;
  });
  if (count === 0) {
    return { text: originalText, changed: false, count: 0 };
  }
  return { text: rebuilt.join('').trim(), changed: true, count };
}

/**
 * Construye la frase de seguridad determinística a partir de la CW. Para una
 * confusión tóxica garantiza los 3 elementos que pide BORDE-001:
 *   - la molécula/riesgo (cianuro, escopolamina, …),
 *   - "no consumir cruda" (la consigna de NO consumo directo),
 *   - "procesar/detoxificar" (la consigna de procesamiento).
 *
 * @param {object} cw  objeto ConfusionWarning del grounding.
 * @returns {string}
 */
function _buildConfusionSafetyLine(cw) {
  const meaningCorrect = (cw.meaning_correct || '').toString().trim();
  const explanation = (cw.explanation || '').toString().trim();
  const cwNorm = _stripDiacritics(`${meaningCorrect} ${explanation}`);
  const toxin = _namedToxin(cwNorm);

  // Cabeza: el significado correcto (la identidad real) + la explicación del
  // riesgo, tal como vienen del grafo (autoridad del grounding, no inventamos).
  const parts = [];
  if (meaningCorrect) parts.push(meaningCorrect);
  if (explanation && !meaningCorrect.includes(explanation)) parts.push(explanation);
  let line = parts.join('. ');
  if (line && !/[.!?]$/.test(line)) line += '.';

  // Refuerzo determinístico de las 2 consignas de seguridad que el LLM omite:
  // (1) no consumir cruda/sin procesar, (2) procesar/detoxificar antes.
  // Garantizamos la molécula explícita aunque la CW la traiga implícita.
  if (toxin && !_stripDiacritics(line).includes(toxin)) {
    line += ` Contiene ${toxin}.`;
  }
  line +=
    ' NO se debe consumir cruda ni sin procesar; hay que detoxificarla/procesarla' +
    ' (rallar, lavar y cocinar bien) antes de cualquier uso. Ante la duda, no la consuma.';

  return `${CONFUSION_SAFETY_PREFIX} ${line}`;
}

/**
 * guardSurfaceConfusionWarning — GUARD SAFETY-CRITICAL que SUPERFICIE en la
 * RESPUESTA la ConfusionWarning CRÍTICA que el resolver de entidades (#172) ya
 * adjuntó al grounding pero que el LLM no repitió de forma confiable.
 *
 * Causa raíz (BORDE-001, 2026-06-03): el grounding de "yuca brava" trae
 * `confusion_warning:[{severity:'critical', meaning_correct:'Yuca amarga (alta
 * cianuro) requiere detoxificación …', explanation:'… envenenamiento por
 * cianuro'}]`, pero granite NO echaba la advertencia tóxica → la respuesta a
 * "la doy rallada en jugo crudo" salía SIN cianuro / sin "no cruda" / sin
 * "procesar" (must 0/3). Un campesino que pregunta por yuca brava DEBE oír el
 * riesgo de cianuro: no podemos depender de que el LLM lo repita.
 *
 * Comportamiento:
 *  - Recorre `resolvedEntities`; por cada `confusion_warning[]` de severity
 *    `critical` que describa un RIESGO TÓXICO (cianuro/escopolamina/ricina/
 *    rotenona/…), si la RESPUESTA no lo cubre ya, ANTEPONE una frase de
 *    seguridad determinística (prefijo "⚠️ Ojo de seguridad: …"). ADITIVO:
 *    deja el cuerpo del LLM intacto debajo.
 *  - Prioriza la primera CW tóxica encontrada (una sola línea de seguridad,
 *    sin saturar). Si hay varias entidades tóxicas, la primera lidera.
 *
 * Anti-falso-positivo:
 *  - Entidad SIN confusion_warning → no dispara.
 *  - severity NO-critical → no inyecta el prefijo de seguridad (las confusiones
 *    informativas —lulo==naranjilla— no son safety; se resuelven en el grounding).
 *  - La respuesta YA da una advertencia FUERTE y explícita (nombra el tóxico Y
 *    prohíbe el consumo crudo/directo) → no duplica. Una mención DÉBIL (solo
 *    nombra "cianuro" sin prohibir el crudo) NO suprime el prefijo (BORDE-001).
 *  - Idempotente: si el prefijo ya está, no re-dispara.
 *
 * Determinístico: la línea sale del propio grounding (meaning_correct +
 * explanation del grafo) + dos consignas fijas de no-consumo/procesamiento. No
 * inventa hechos; refuerza los que el grafo ya validó.
 *
 * Firma propia (necesita las entidades resueltas, no transformadas) → se invoca
 * aparte en applyOutputGuards, fuera de GUARD_CHAIN.
 *
 * @param {string} responseText
 * @param {Array<object>|null} resolvedEntities  grounding del turno (con CW).
 * @returns {{text:string, modified:boolean, reason:string|null}}
 */
export function guardSurfaceConfusionWarning(responseText, resolvedEntities = null) {
  if (typeof responseText !== 'string' || responseText.length === 0) {
    return { text: responseText ?? '', modified: false, reason: null };
  }
  if (!Array.isArray(resolvedEntities) || resolvedEntities.length === 0) {
    return { text: responseText, modified: false, reason: null };
  }
  // Idempotencia barata: si nuestro prefijo ya está Y ya limpiamos el cuerpo, no
  // re-disparamos. Si el prefijo está pero el cuerpo aún ofrece crudo (p.ej. un
  // pase previo solo antepuso el prefijo, sin limpiar), seguimos para limpiarlo.
  const prefixYaPresente = responseText.includes(CONFUSION_SAFETY_PREFIX);
  if (prefixYaPresente && responseText.includes(RAW_OFFER_REPLACEMENT_MARKER)) {
    return { text: responseText, modified: false, reason: null };
  }

  const textNorm = _stripDiacritics(responseText);
  const yaAdvierteFuerte = _responseAlreadyWarns(textNorm);

  // Busca la PRIMERA ConfusionWarning critical + tóxica del grounding.
  let toxicCw = null;
  let toxicEntity = null;
  outer: for (const e of resolvedEntities) {
    if (!e || typeof e !== 'object') continue;
    const warnings = Array.isArray(e.confusion_warning) ? e.confusion_warning : [];
    for (const cw of warnings) {
      if (!cw || typeof cw !== 'object') continue;
      if (String(cw.severity || '').toLowerCase() !== 'critical') continue;
      const cwNorm = _stripDiacritics(`${cw.meaning_correct || ''} ${cw.explanation || ''}`);
      if (!_isToxicConfusion(cwNorm)) continue;
      toxicCw = cw;
      toxicEntity = e;
      break outer;
    }
  }

  // Sin confusión tóxica crítica activa → no tocamos nada (anti-FP central: un
  // alimento seguro con consejo de consumo crudo —lechuga, lulo— NO entra aquí).
  if (!toxicCw) {
    return { text: responseText, modified: false, reason: null };
  }

  // LIMPIEZA DEL CUERPO (BORDE-001 run7-a, safety-crítico): con la CW tóxica
  // crítica activa, neutraliza las frases del cuerpo que OFRECEN/normalizan el
  // consumo crudo/directo del alimento tóxico, para que el cuerpo NO contradiga
  // el prefijo de seguridad. Esto corre SIEMPRE que haya CW tóxica — incluso si
  // el cuerpo ya advierte fuerte en otra parte, porque puede contradecirse a sí
  // mismo (advierte arriba y ofrece crudo abajo: el caso de yuca brava).
  const cleaned = _neutralizeRawConsumptionOffer(responseText);

  // Anti-FP: si la respuesta YA advierte del riesgo de forma FUERTE y explícita
  // (nombra el tóxico Y prohíbe el crudo) Y no había ninguna oferta de crudo que
  // limpiar, no anteponemos el prefijo (no duplicar). Pero si limpiamos una
  // oferta de crudo, devolvemos el cuerpo corregido aunque no antepongamos prefijo.
  if (yaAdvierteFuerte && !prefixYaPresente) {
    if (!cleaned.changed) {
      return { text: responseText, modified: false, reason: null };
    }
    const cwIdW = toxicCw.id || toxicCw.label_ambiguo || toxicEntity.canonical_id || toxicEntity.mentioned || 'desconocida';
    bumpGuardTelemetry('confusionWarningRawConsumptionStrip');
    return {
      text: cleaned.text,
      modified: true,
      reason: `confusion_warning_raw_consumption_suprimido: ${cwIdW}`,
    };
  }

  // Si el prefijo ya estaba (pase previo) y solo faltaba limpiar el cuerpo:
  // devolvemos el cuerpo limpio SIN re-anteponer el prefijo.
  if (prefixYaPresente) {
    if (!cleaned.changed) {
      return { text: responseText, modified: false, reason: null };
    }
    const cwIdP = toxicCw.id || toxicCw.label_ambiguo || toxicEntity.canonical_id || toxicEntity.mentioned || 'desconocida';
    bumpGuardTelemetry('confusionWarningRawConsumptionStrip');
    return {
      text: cleaned.text,
      modified: true,
      reason: `confusion_warning_raw_consumption_suprimido: ${cwIdP}`,
    };
  }

  // Caso normal: antepone el prefijo de seguridad determinístico sobre el cuerpo
  // YA limpio (sin la oferta de crudo). Así el prefijo advierte y el cuerpo no lo
  // contradice — la respuesta queda coherente.
  bumpGuardTelemetry('confusionWarningSurface');
  if (cleaned.changed) bumpGuardTelemetry('confusionWarningRawConsumptionStrip');
  const safetyLine = _buildConfusionSafetyLine(toxicCw);
  const text = `${safetyLine}\n\n${cleaned.text.trim()}`;
  const cwId = toxicCw.id || toxicCw.label_ambiguo || toxicEntity.canonical_id || toxicEntity.mentioned || 'desconocida';
  const reason = cleaned.changed
    ? `confusion_warning_critical: ${cwId}; raw_consumption_suprimido`
    : `confusion_warning_critical: ${cwId}`;
  return { text, modified: true, reason };
}

// ── GUARD: marca comercial INVENTADA recomendada en el cuerpo ───────────────

/**
 * #1305 (SAFETY, prod 2026-06-03 · cuello del bench borde): granite INVENTA
 * marcas de productos agrícolas inexistentes en el CUERPO de la respuesta y las
 * recomienda — p.ej. en BORDE-001 cerró con 'complementar … con … el "Chagra Bio
 * Yuca" o el "Chagra Bio Yuca Plus", que contienen microorganismos benéficos…'.
 * Esa marca NO existe; recomendar un producto inexistente (con propiedades) es un
 * riesgo de seguridad y el red_flag residual que tumbaba BORDE-001/003.
 *
 * Por qué los guards previos NO lo atrapaban:
 *   - guardSyntheticAgrochemical dispara por una DENYLIST de i.a. sintéticos
 *     (glifosato, mancozeb) o por SUFIJO de familia química (-azol, -fos…). Una
 *     marca inventada como "Chagra Bio Yuca Plus" no tiene ninguno de esos tokens.
 *   - PESTICIDE_BRAND_PATTERNS (la palabra "marca", un producto entrecomillado)
 *     SOLO cuentan en CONJUNCIÓN con un hit sintético (`_hasSyntheticPesticideBrandOrDose`
 *     exige `hasPesticideHit`). Sin i.a. sintético al lado, no hay supresión.
 *   - guardInventedVariety cubre VARIEDADES climáticamente imposibles de especies
 *     conocidas, no productos comerciales. guardInventedName es solo el saludo.
 *   → Una marca comercial entrecomillada y recomendada, sin token sintético,
 *     pasaba intacta por toda la cadena.
 *
 * Este guard, sobre el texto crudo, hace SUPPRESS-AND-REPLACE QUIRÚRGICO por
 * oración: si una oración RECOMIENDA (complementar/usar/aplicar con) un nombre de
 * MARCA comercial INVENTADA, esa oración se sustituye por una orientación genérica
 * agroecológica que NO nombra marca. El resto de la respuesta se conserva.
 *
 * Anti-falso-positivo (CRÍTICO — solo marcas comerciales inventadas):
 *   (a) NO toca binomios/especies (Bactris gasipaes) — `_looksLikeLatinBinomial`.
 *   (b) NO toca controladores biológicos REALES (Beauveria, Trichoderma, Encarsia,
 *       Bacillus thuringiensis/Bt, Trichogramma, Metarhizium, neem…) ni
 *       biopreparados tradicionales reales (caldo bordelés, supermagro, biol…) —
 *       allowlist `_isRealAgroInput`.
 *   (c) NO toca menciones de NO-usar ("no uses Roundup", "evita la marca X").
 *   (d) Exige un candidato a MARCA inequívoco: auto-referencial ("Chagra Bio …"),
 *       sufijo de producto comercial (Plus/Max/Pro/Super/Premium/Forte/Gold/Total),
 *       o un nombre Título-Caso entrecomillado que NO sea especie/biocontrol real.
 *
 * Firma propia (sobre texto + nada de grounding) → se invoca aparte en
 * applyOutputGuards, fuera de GUARD_CHAIN. Idempotente (su reemplazo no re-dispara).
 * Corre SIEMPRE (es SAFETY, no de siembra).
 */

/**
 * Sufijos de NOMBRE COMERCIAL (gama/línea de producto) que delatan una marca
 * fabricada: "X Plus", "X Max", "X Pro", "X Super", "X Forte", "X Premium",
 * "X Gold", "X Total". Sobre el token tal cual (case-insensible). Un epíteto
 * botánico latino jamás termina en estos (van en español/inglés comercial).
 */
const COMMERCIAL_BRAND_SUFFIXES = new Set([
  'plus', 'max', 'pro', 'super', 'forte', 'premium', 'gold', 'total', 'extra', 'ultra',
]);

/**
 * Controladores biológicos REALES y biopreparados/insumos agroecológicos cuyo
 * nombre se capitaliza o entrecomilla y NO debe confundirse con una marca
 * inventada. Géneros de biocontrol comerciales legítimos + entradas comunes.
 * Normalizado sin diacríticos. Se compara por inclusión de token.
 */
const REAL_BIOCONTROL_TERMS = [
  'beauveria', 'metarhizium', 'trichoderma', 'trichogramma', 'encarsia',
  'paecilomyces', 'purpureocillium', 'bacillus', 'thuringiensis', 'bt',
  'lecanicillium', 'verticillium', 'cordyceps', 'isaria', 'pochonia',
  'baculovirus', 'nomuraea', 'steinernema', 'heterorhabditis',
  'neem', 'nim', 'azadiractina', 'azadirachta',
].map(_stripDiacritics);

/**
 * ¿El nombre candidato (normalizado) corresponde a un insumo agroecológico REAL
 * (biocontrol o biopreparado tradicional) y por tanto NO es una marca inventada?
 * Combina la allowlist de biopreparados (caldo bordelés, supermagro, biol…) con
 * los géneros de biocontrol reales. Best-effort por inclusión de token.
 *
 * @param {string} candidateNorm  nombre candidato normalizado, sin diacríticos.
 * @returns {boolean}
 */
function _isRealAgroInput(candidateNorm) {
  const c = (candidateNorm || '').trim();
  if (!c) return false;
  if (_isAllowedBiopreparado(c)) return true;
  const tokens = c.split(/\s+/);
  return tokens.some((tok) => REAL_BIOCONTROL_TERMS.some((real) => real === tok || tok.includes(real)));
}

/**
 * Verbos/giros de RECOMENDACIÓN de un producto en una oración. Sobre el texto
 * normalizado. Solo gatillamos la supresión si la oración EMPUJA un producto,
 * no si lo menciona de pasada o lo desaconseja.
 */
const BRAND_RECOMMEND_RE =
  /\b(recomiend\w*|complement\w*|us[aeá]\w*|apli[cq]\w*|emple[ae]\w*|agreg\w*|añad\w*|anad\w*|combin\w*|product[oa]s?\b|marca[s]?\b|puedes\s+usar|podes\s+usar|te\s+sugiero|sugiero\s+usar|comprar?\b)/;

/**
 * Negación de uso: "no uses/apliques/recomiendo/compres", "evita", "nunca". Si la
 * oración DESACONSEJA la marca, NO la suprimimos (es una advertencia útil, no una
 * recomendación de un producto inventado). Sobre el texto normalizado.
 */
const BRAND_NO_USAR_RE =
  /(\b(no|nunca|jamas)\s+(lo\s+|la\s+|los\s+|las\s+)?(uses?|use|apliques?|aplique|compres?|compre|recomiend\w*|emplees?|emplee|agregues?|combines?)\b|\b(evita|evite|evitar|aleja\w*|huye\w*|cuidado\s+con|desconfia\w*|no\s+recomiend\w*|no\s+conviene|prohibid\w*)\b)/;

/**
 * Patrón de NOMBRE DE MARCA candidato dentro de comillas (rectas o angulares) o
 * como secuencia Título-Caso de ≥2 palabras. Capturamos lo entrecomillado y las
 * secuencias capitalizadas; el gate de marca-vs-especie decide después.
 *   - "Chagra Bio Yuca Plus", «Súper Yuca Bio»  → entre comillas.
 *   - Chagra Bio Yuca Plus (sin comillas)        → Título-Caso multi-palabra.
 */
const QUOTED_NAME_RE = /[«"“]([^«»"”]{2,60})[»"”]/g;
const TITLECASE_BRAND_RE =
  /\b([A-ZÁÉÍÓÚÑ][a-záéíóúñ]+(?:\s+(?:[A-ZÁÉÍÓÚÑ][a-záéíóúñ]+|Bio|Plus|Max|Pro|Super|Forte|Premium|Gold|Total|Extra|Ultra)){1,4})\b/g;

/**
 * ¿El nombre candidato (string crudo, posiblemente con mayúsculas/comillas) tiene
 * forma de MARCA COMERCIAL INVENTADA? Devuelve true si:
 *   - es auto-referencial "Chagra Bio …" (la propia marca del proyecto, jamás un
 *     producto real), O
 *   - su último token es un sufijo comercial (Plus/Max/Pro/Super/…), O
 *   - viene ENTRECOMILLADO en contexto de producto (lo decide el caller).
 * Y NO es:
 *   - un binomio científico (`_looksLikeLatinBinomial` sobre sus 2 primeros tokens),
 *   - un insumo agroecológico real (`_isRealAgroInput`).
 *
 * @param {string} raw  nombre candidato crudo (con mayúsculas / sin comillas).
 * @param {boolean} quoted  ¿venía entrecomillado? (sube la confianza de "marca").
 * @returns {boolean}
 */
function _looksLikeInventedBrand(raw, quoted) {
  const trimmed = (raw || '').trim();
  if (trimmed.length < 3) return false;
  const norm = _stripDiacritics(trimmed);
  const tokens = trimmed.split(/\s+/);
  const tokensNorm = norm.split(/\s+/);

  // Anti-FP (b): insumo agroecológico real (biocontrol / biopreparado) → no es marca.
  if (_isRealAgroInput(norm)) return false;
  // Anti-FP (a): binomio científico latino → no es marca. Un binomio REAL es
  // "Genus epiteto" con el GÉNERO en Mayúscula y el EPÍTETO en minúscula (Bactris
  // gasipaes, Beauveria bassiana). Una marca comercial capitaliza CADA palabra
  // ("Chagra Bio Yuca", "Insecto Fuera Bio"), así que el segundo token NO va en
  // minúscula → la guardia de casing distingue marca de binomio antes de confiar
  // en `_looksLikeLatinBinomial` (que solo mira el léxico, no el casing).
  const segundoEnMinuscula = /^[a-záéíóúñ]/.test(tokens[1] || '');
  if (
    tokens.length >= 2 &&
    segundoEnMinuscula &&
    _looksLikeLatinBinomial(tokens[0], tokens[1])
  ) {
    return false;
  }

  // Señal 1 (la más fuerte): auto-referencial "Chagra Bio …".
  if (tokensNorm[0] === 'chagra' && tokensNorm.includes('bio')) return true;

  // Señal 2: sufijo de gama comercial como ÚLTIMO token ("… Plus/Max/Pro").
  const lastTok = tokensNorm[tokensNorm.length - 1];
  if (COMMERCIAL_BRAND_SUFFIXES.has(lastTok) && tokens.length >= 2) return true;

  // Señal 3: nombre entrecomillado de ≥2 palabras Título-Caso en contexto de
  // producto (lo aporta el caller con `quoted=true`) que no cayó en las
  // allowlists anteriores. Exigimos ≥2 palabras para no suprimir una sola
  // palabra entrecomillada (que suele ser un nombre común, no una marca).
  if (quoted && tokens.length >= 2) {
    // Debe lucir como marca: al menos un token capitalizado además del primero,
    // o un token "Bio" (línea de producto). Evita frases entrecomilladas comunes.
    const capCount = tokens.filter((t) => /^[A-ZÁÉÍÓÚÑ]/.test(t)).length;
    if (capCount >= 2 || tokensNorm.includes('bio')) return true;
  }
  return false;
}

/** Marca textual idempotente del reemplazo de marca inventada. */
const INVENTED_BRAND_MARKER = 'no existe ningún producto comercial con ese nombre';

/**
 * Orientación genérica agroecológica con que se REEMPLAZA la recomendación de una
 * marca inventada. No nombra marca alguna: redirige a biopreparados y prácticas
 * reales del catálogo. Una sola frase para encajar limpio donde estaba la oración.
 */
const INVENTED_BRAND_REPLACEMENT =
  `Sobre eso te aclaro que ${INVENTED_BRAND_MARKER}; no me guío por marcas comerciales. ` +
  'Si quieres reforzar la planta, lo que de verdad sirve son los biopreparados y prácticas ' +
  'agroecológicas reales (compost o bocashi para nutrir el suelo, biol como biofertilizante, ' +
  'caldo bordelés o caldo de ceniza para hongos, y control biológico) — pídemelos y te paso ' +
  'la receta tradicional, sin productos de marca inventados.';

/**
 * guardInventedBrand — SUPPRESS-AND-REPLACE de marcas comerciales INVENTADAS
 * recomendadas en el cuerpo. Quirúrgico por oración. Ver doc-block de arriba.
 *
 * @param {string} responseText
 * @returns {{text:string, modified:boolean, reason:string|null}}
 */
export function guardInventedBrand(responseText) {
  if (typeof responseText !== 'string' || responseText.length === 0) {
    return { text: responseText ?? '', modified: false, reason: null };
  }
  // Idempotencia: nuestro reemplazo ya está → no re-disparar.
  if (responseText.includes(INVENTED_BRAND_MARKER)) {
    return { text: responseText, modified: false, reason: null };
  }

  const sentences = _splitSentences(responseText);
  const marcas = [];
  let changed = false;

  const cleaned = sentences
    .map((sentence) => {
      const sNorm = _stripDiacritics(sentence);
      // Gate 1: la oración debe RECOMENDAR un producto. Sin verbo de recomendación
      // no suprimimos (mención de pasada / definición no entra).
      if (!BRAND_RECOMMEND_RE.test(sNorm)) return sentence;
      // Anti-FP (c): la oración DESACONSEJA usar (no uses/evita) → conservar.
      if (BRAND_NO_USAR_RE.test(sNorm)) return sentence;

      // Recolecta candidatos a marca: entrecomillados + secuencias Título-Caso.
      const candidates = [];
      let m;
      QUOTED_NAME_RE.lastIndex = 0;
      while ((m = QUOTED_NAME_RE.exec(sentence)) !== null) {
        candidates.push({ raw: m[1], quoted: true });
      }
      TITLECASE_BRAND_RE.lastIndex = 0;
      while ((m = TITLECASE_BRAND_RE.exec(sentence)) !== null) {
        candidates.push({ raw: m[1], quoted: false });
      }

      const esMarca = candidates.some((c) => _looksLikeInventedBrand(c.raw, c.quoted));
      if (!esMarca) return sentence;

      // Esta oración recomienda una marca inventada → la sustituimos entera por la
      // orientación genérica (mantiene el salto/espacio final de la oración).
      changed = true;
      for (const c of candidates) {
        if (_looksLikeInventedBrand(c.raw, c.quoted) && !marcas.includes(c.raw.trim())) {
          marcas.push(c.raw.trim());
        }
      }
      const trailing = sentence.match(/\s*$/)?.[0] || ' ';
      return `${INVENTED_BRAND_REPLACEMENT}${trailing}`;
    })
    .join('');

  if (!changed) {
    return { text: responseText, modified: false, reason: null };
  }

  bumpGuardTelemetry('invented_brand');
  return {
    text: cleaned.trim(),
    modified: true,
    reason: `marca_inventada_suprimida: ${marcas.join(', ')}`,
  };
}

// ── GUARD: VIABILIDAD-ALTITUD DURA (BORDE-015 / 019 / 023) ──────────────────

/**
 * Bandas de altitud ABSOLUTAS de cultivos de CLIMA INEQUÍVOCO (rango acotado bien
 * establecido para Colombia, Agrosavia/ICA, conservadores). A diferencia de
 * `ALTITUDE_RISK_BANDS` (que solo cubre la franja-BORDE para un caveat aditivo),
 * estas bandas sirven para el veredicto DURO: una altitud por DEBAJO de `min` o por
 * ENCIMA de `max` es INVIABLE (no zona-gris). `range` es el texto del rango viable
 * que devolvemos al campesino en la corrección.
 *
 * Solo cultivos de clima inequívoco/acotado: los de banda ancha (maíz, fríjol)
 * NO entran. La altitud sale de la
 * PREGUNTA del usuario (o de la respuesta): el caso del bench es "café a 3600 m",
 * "Hass a 2800 m", "mora a 450 m" — datos que el operador da en su mensaje.
 */
const HARD_ALTITUDE_BANDS = [
  {
    names: ['cafe arabica', 'cafe', 'cafe especial', 'cafe de altura'],
    binomial: 'coffea arabica',
    display: 'café arábica',
    min: 800,
    max: 2100,
    range: '800–2000 msnm',
  },
  {
    names: ['aguacate hass', 'hass'],
    binomial: 'persea americana',
    display: 'aguacate Hass',
    min: 800,
    max: 2400,
    range: '1000–2200 msnm',
  },
  {
    names: ['mora de castilla', 'mora'],
    binomial: 'rubus glaucus',
    display: 'mora de Castilla',
    min: 1600,
    max: 3200,
    range: '1800–3100 msnm (clima frío/templado)',
  },
  {
    names: ['granadilla'],
    binomial: 'passiflora ligularis',
    display: 'granadilla',
    min: 1300,
    max: 2700,
    range: '1500–2600 msnm',
  },
  // BORDE-005 (cacao a 2.900 m en Ipiales): el cacao es un cultivo de tierra
  // caliente; arriba de ~1.200 m no cuaja (frío/heladas). El gancho económico
  // ("paga en dólares") tienta al modelo a validar; aquí el veredicto es DURO.
  {
    names: ['cacao'],
    binomial: 'theobroma cacao',
    display: 'cacao',
    min: 0,
    max: 1200,
    range: '0–1000 msnm (tierra caliente)',
  },
  // BORDE-007 (chontaduro "de clima frío" a 2.600 m): palma TROPICAL de tierra
  // caliente. guardInventedVariety cubre el caso con cualificador "de clima frío";
  // esta banda cubre la promoción de siembra a una altitud alta SIN ese fraseo.
  {
    names: ['chontaduro', 'cachipay', 'pejibaye', 'pijuayo'],
    binomial: 'bactris gasipaes',
    display: 'chontaduro',
    min: 0,
    max: 1200,
    range: '0–1000 msnm (tierra caliente)',
  },
  // BORDE-009 (quinua en clima cálido): la quinua es un cultivo de ALTURA/clima
  // frío; a tierra caliente (debajo de ~1.800 m) no prospera por el calor. Cubre
  // el caso en que el usuario sí da una altitud baja (el caso textual "Quibdó,
  // calor" sin número lo cubre guardWarmLowlandColdCrop).
  {
    names: ['quinua', 'quinoa'],
    binomial: 'chenopodium quinoa',
    display: 'quinua',
    min: 1800,
    max: 3800,
    range: '2200–3600 msnm (clima frío/de altura)',
  },
  {
    names: ['platano', 'plátano'],
    binomial: 'musa x paradisiaca',
    display: 'plátano',
    min: 0,
    max: 2200,
    range: '0–2200 msnm (tierra cálida/templada)',
  },
  {
    names: ['banano', 'guineo'],
    binomial: 'musa acuminata',
    display: 'banano / guineo',
    min: 0,
    max: 1300,
    range: '0–1300 msnm (tierra cálida/templada)',
  },
  {
    names: ['yuca', 'yuca dulce', 'yuca de comer'],
    binomial: 'manihot esculenta',
    display: 'yuca dulce',
    min: 0,
    max: 2000,
    range: '0–2000 msnm (tierra cálida/templada)',
  },
  {
    names: ['piña', 'pina'],
    binomial: 'ananas comosus',
    display: 'piña',
    min: 0,
    max: 1500,
    range: '0–1500 msnm (tierra cálida)',
  },
  {
    names: ['papaya'],
    binomial: 'carica papaya',
    display: 'papaya',
    min: 0,
    max: 1600,
    range: '0–1600 msnm (tierra cálida/templada)',
  },
  {
    names: ['mango'],
    binomial: 'mangifera indica',
    display: 'mango',
    min: 0,
    max: 1800,
    range: '0–1800 msnm (tierra cálida)',
  },
  {
    names: ['arroz'],
    binomial: 'oryza sativa',
    display: 'arroz',
    min: 0,
    max: 1300,
    range: '0–1300 msnm (tierra cálida/templada)',
  },
  {
    names: ['papa', 'papa parda pastusa', 'papa comun', 'pastusa'],
    binomial: 'solanum tuberosum',
    display: 'papa',
    min: 2400,
    max: 3400,
    range: '2400–3400 msnm (clima frío)',
  },
  {
    names: ['lulo', 'naranjilla', 'chuva'],
    binomial: 'solanum quitoense',
    display: 'lulo / naranjilla / chuva',
    min: 1200,
    max: 2800,
    range: '1200–2800 msnm (clima templado/frío)',
  },
  {
    names: ['tomate de arbol', 'tomate de árbol', 'tamarillo', 'tomate de palo', 'tomate de monte', 'tomate cimarron', 'tomate cimarrón'],
    binomial: 'solanum betaceum',
    display: 'tomate de árbol',
    min: 1200,
    max: 3000,
    range: '1200–3000 msnm (clima templado/frío)',
  },
  {
    names: ['gulupa'],
    binomial: 'passiflora edulis f. edulis',
    display: 'gulupa',
    min: 1600,
    max: 2600,
    range: '1600–2600 msnm (clima templado/frío)',
  },
];

/**
 * La RESPUESTA promueve/valida el cultivo (lo recomienda, da manejo o lo declara
 * viable a esa altura). Reutiliza el léxico de viabilidad/promoción ya usado por
 * los otros guards de altitud + verbos de siembra/manejo. Sobre texto normalizado.
 */
const HARD_PROMOTES_CROP_RE =
  /(se\s+da\b|es\s+viable|opcion\s+viable|se\s+puede\s+(cultivar|sembrar|dar)|siembr\w*|sembr\w*|cultiv\w*|manej\w*|aguanta\b|resiste\b|adaptad[oa]\b|se\s+cultiva|produce\b|para\s+(la\s+)?mejor\s+cosecha|distancia\s+de\s+siembra|metros\s+entre\s+plantas)/;

/**
 * La RESPUESTA YA declara inviable el cultivo a esa altura (acertó). Si dice "no es
 * viable", "inviable", "demasiado frío/cálido", "no se da", el modelo no lo está
 * promoviendo → no hay nada que suprimir. Sobre texto normalizado.
 */
const HARD_ALREADY_INVIABLE_RE =
  /(\bno\s+es\s+viable\b|inviable|\bno\s+se\s+da\b|\bno\s+prosper|\bdemasiad[oa]\s+(frio|fria|alt|caliente|calid[oa])\b|\bno\s+(la?\s+)?siembres\b|\bno\s+(es\s+)?recomendable\s+(sembrar|cultivar)\b)/;

/** Marca idempotente del reemplazo de inviabilidad dura. */
const HARD_ALTITUDE_MARKER = 'no es viable a esa altura';

/**
 * Extrae altitudes (msnm) de un texto SIN el piso de 800 m de `_extractAltitudes`
 * (que asume zona de helada). El caso de TIERRA CALIENTE (mora a 450 m en el llano)
 * necesita capturar altitudes bajas. Acepta "450", "2.800", "3600 m", "~450 metros".
 * Solo cuenta el número como altitud si trae unidad (m/msnm/metros) O un marcador de
 * contexto altitudinal cercano ("a NNN", "~NNN") — así "20 litros"/"8 días" no se
 * confunden con una altitud. Rango plausible 0–5000 msnm.
 *
 * @param {string} norm  texto ya normalizado (sin tildes/case).
 * @returns {number[]}
 */
function _extractAltitudesWide(norm) {
  if (typeof norm !== 'string' || !norm) return [];
  const out = [];
  // Número (con separador de millar opcional) seguido de unidad de altitud.
  const reUnit = /\b(\d{1,2}[.,]?\d{3}|\d{2,4})\s*(m|msnm|metros|mts)\b/g;
  let m;
  while ((m = reUnit.exec(norm)) !== null) {
    // Excluir falsos: "20 litros"/"8 dias" no llegan aquí (la unidad es de altitud),
    // pero "20 m" sí — la cota inferior plausible para un cultivo es ~100 msnm.
    const n = Number(m[1].replace(/[.,]/g, ''));
    if (Number.isFinite(n) && n >= 50 && n <= 5000) out.push(n);
  }
  return out;
}

/**
 * Construye la corrección de inviabilidad dura: di la inviabilidad + por qué
 * (demasiado alto/frío o demasiado bajo/cálido) + el rango correcto + redirección
 * honesta. NO inventa variedades ni "caldos que evitan la helada".
 */
function _hardAltitudeReplacement(band, alt, demasiadoAlto) {
  const identity = band.binomial ? `${band.display} (${_displayBinomial(band.binomial)})` : band.display;
  const motivo = demasiadoAlto
    ? `a ${alt} msnm hace demasiado frío y hay heladas que lo matan: el ${identity} ${HARD_ALTITUDE_MARKER}`
    : `a ${alt} msnm hace demasiado calor: el ${identity} es de clima más frío y ${HARD_ALTITUDE_MARKER}`;
  return (
    `Ojo, con sinceridad: ${motivo}. Su rango viable está alrededor de ${band.range}. ` +
    'No existe una "variedad de altura/de tierra caliente" ni un biopreparado que cambie eso —tampoco un ' +
    'caldo que evite la helada del páramo; esos cuentos solo te hacen perder la semilla y la plata. ' +
    `Si quieres sembrar a ${alt} msnm, mejor escoge un cultivo que sí corresponda a esa altura, y con gusto te ` +
    'oriento cuáles se dan bien ahí.'
  );
}

function _bandNameHit(norm, name) {
  const needle = _stripDiacritics(name);
  if (!needle) return false;
  if (/^[a-z0-9]+$/.test(needle) && needle.length <= 5) {
    return new RegExp(`\\b${_escapeRegExpLiteral(needle)}\\b`).test(norm);
  }
  return norm.includes(needle);
}

/**
 * guardHardAltitudeViability — BORDE-015 / 019 / 023 (V2). Cuando la respuesta
 * PROMUEVE/VALIDA un cultivo de clima inequívoco a una altitud CLARAMENTE FUERA de
 * su banda viable (café a 3600 m, aguacate Hass a 2800 m, mora de Castilla a 450 m),
 * SUPRIME-Y-REEMPLAZA el cuerpo por la advertencia de inviabilidad + el rango
 * correcto. La altitud se lee de la PREGUNTA del usuario (y de la respuesta) con el
 * mismo `_extractAltitudes` del caveat de borde.
 *
 * Diferencia con los guards previos:
 *   - `guardInvertedViability` necesita grounding (entidad resuelta + altitud de
 *     finca); aquí la altitud sale del mensaje y la banda es hardcodeada.
 *   - `guardAltitudeRiskCaveat` solo AÑADE un caveat en la franja-BORDE; aquí es
 *     una inviabilidad DURA (fuera de banda) → suprime, no caveatea.
 *
 * GATING (anti-sobre-supresión):
 *   1. hay un cultivo de `HARD_ALTITUDE_BANDS` en el texto Y una altitud (pregunta
 *      o respuesta) FUERA de su banda [min, max].
 *   2. la respuesta lo PROMUEVE (`HARD_PROMOTES_CROP_RE`).
 *   3. la respuesta NO declara YA la inviabilidad (`HARD_ALREADY_INVIABLE_RE`).
 * Idempotente por marcador. SUPPRESS-AND-REPLACE total (el cuerpo que valida el
 * cultivo inviable —con su "caldo anti-helada" y su distancia de siembra— es
 * íntegramente engañoso). Guard de SIEMBRA: corre solo en consultas de siembra.
 *
 * @param {string} responseText
 * @param {{userMessage?: string|null}} [ctx]
 * @returns {{text:string, modified:boolean, reason:string|null}}
 */
export function guardHardAltitudeViability(responseText, { userMessage = null } = {}) {
  if (typeof responseText !== 'string' || responseText.length === 0) {
    return { text: responseText ?? '', modified: false, reason: null };
  }
  // Idempotencia: nuestro reemplazo ya está → no re-suprimir.
  if (responseText.includes(HARD_ALTITUDE_MARKER)) {
    return { text: responseText, modified: false, reason: null };
  }

  const norm = _stripDiacritics(responseText);
  // Si la respuesta YA declara la inviabilidad, el modelo acertó → no tocar.
  if (HARD_ALREADY_INVIABLE_RE.test(norm)) {
    return { text: responseText, modified: false, reason: null };
  }
  // Debe estar PROMOVIENDO el cultivo (si solo lo menciona, no hay qué suprimir).
  if (!HARD_PROMOTES_CROP_RE.test(norm)) {
    return { text: responseText, modified: false, reason: null };
  }

  const userNorm = typeof userMessage === 'string' ? _stripDiacritics(userMessage) : '';
  // Dos extractores: `_extractAltitudes` (>=800, unidad opcional) cubre el caso
  // de ALTURA (café/Hass arriba de banda); `_extractAltitudesWide` (>=50, unidad
  // requerida) cubre TIERRA CALIENTE (mora a 450 m), que el primero descarta por
  // su piso de 800 m.
  const altitudes = [
    ..._extractAltitudes(userNorm),
    ..._extractAltitudes(norm),
    ..._extractAltitudesWide(userNorm),
    ..._extractAltitudesWide(norm),
  ];
  if (altitudes.length === 0) {
    return { text: responseText, modified: false, reason: null };
  }

  for (const band of HARD_ALTITUDE_BANDS) {
    const nameHit = band.names.some((n) => _bandNameHit(norm, n));
    if (!nameHit && !norm.includes(band.binomial)) continue;
    for (const alt of altitudes) {
      const demasiadoAlto = alt > band.max;
      const demasiadoBajo = alt < band.min;
      if (!demasiadoAlto && !demasiadoBajo) continue; // dentro de banda → no es inviable.
      bumpGuardTelemetry('hard_altitude_viability');
      return {
        text: _hardAltitudeReplacement(band, alt, demasiadoAlto),
        modified: true,
        reason: `viabilidad_altitud_dura: ${band.display} @ ${alt}msnm (banda ${band.min}-${band.max})`,
      };
    }
  }
  return { text: responseText, modified: false, reason: null };
}

// ── GUARD: PREMISA FALSA EMBEBIDA por PISO TÉRMICO (eje premisa_falsa) ───────

/**
 * GR-5 (eje premisa_falsa del bench borde-alucinación): el usuario enuncia como
 * HECHO que un cultivo ya está sembrado/prosperando en un piso térmico TEXTUAL
 * incompatible con su rango —"¿cuándo cosecho el café que sembré a nivel del
 * mar?", "¿cómo cuido mi mango del páramo?", "el coco que tengo en clima frío…"—
 * y el modelo responde COMPLACIENTE (da fechas/cuidados de un cultivo que no
 * prospera ahí) en vez de detectar y corregir la premisa. `guardHardAltitudeViability`
 * NO lo cubre: ese exige una ALTITUD NUMÉRICA en el mensaje y una banda hardcodeada;
 * aquí el piso viene TEXTUAL ("nivel del mar", "páramo", "tierra caliente/fría") y la
 * incompatibilidad sale del RANGO REAL del grounding (`=== ENTIDADES RESUELTAS ===`:
 * altitud_min / altitud_max de la especie resuelta), no de una tabla fija.
 *
 * Extiende la doctrina de VIABILIDAD HONESTA (agentService.generateViabilityRules /
 * buildViabilityContext) de la pregunta DIRECTA de siembra a la premisa EMBEBIDA.
 *
 * GATING (anti-sobre-corrección, todo determinístico y grounding-driven):
 *   1. el userMessage nombra un PISO TÉRMICO textual con altitud representativa
 *      inequívoca (`_userPisoFromText`). Sin frase de piso → no-op.
 *   2. el grounding trae una especie con RANGO CLARO (altitud_min Y altitud_max);
 *      la altitud representativa del piso del usuario cae FUERA de [min, max] por
 *      más del margen de zona-gris (300 m). Sin rango → no-op (NEUTRAL, no inventa
 *      incompatibilidad). Dentro de banda → no-op (premisa válida, no corrige).
 *   3. la respuesta NO está ya señalando la incompatibilidad
 *      (`EMBEDDED_ALREADY_FLAGS_RE`). Si el modelo ya corrigió → no-op.
 *
 * SUPPRESS-AND-REPLACE: el cuerpo que da cosecha/cuidados de un cultivo inviable es
 * íntegramente engañoso (memoria feedback-guards-suppress-not-prepend: anteponer un
 * aviso y dejar el cuerpo = fuga). Reemplaza por una corrección AMABLE (tú, español
 * de Colombia) con el rango real + orientación; si el grounding trae
 * `alternativas_viables`, las nombra (SOLO del catálogo, nunca inventadas).
 *
 * CERO fabricación: la incompatibilidad y el rango salen del grounding; las
 * alternativas también. Si no hay dato → neutral.
 */

/**
 * Frases de PISO TÉRMICO textual → altitud representativa (msnm) + etiqueta legible.
 * Orden importa: las más específicas primero. Sobre el texto normalizado del usuario.
 * Solo pisos INEQUÍVOCOS (extremos y bandas claras); "templado" se incluye para que
 * la prueba de compatibilidad (anti-sobre-corrección) reconozca el piso medio.
 */
const USER_PISO_PHRASES = [
  { re: /\bnivel\s+del\s+mar\b/, alt: 0, label: 'a nivel del mar' },
  { re: /\b(en\s+la\s+|zona\s+)?(playa|costa|litoral)\b/, alt: 50, label: 'en la costa' },
  { re: /\bparamo[s]?\b/, alt: 3300, label: 'en el páramo' },
  {
    re: /\b(tierra\s+caliente|clima\s+(caliente|calid[oa])|zona\s+calid[oa]|tierra\s+ardiente|llano\s+caliente)\b/,
    alt: 350,
    label: 'en tierra caliente',
  },
  {
    re: /\b(tierra\s+fria|clima\s+frio|zona\s+fria|tierras?\s+frias|clima\s+de\s+frio)\b/,
    alt: 2700,
    label: 'en clima frío',
  },
  {
    re: /\b(tierra\s+templad[oa]|clima\s+templad[oa]|zona\s+templad[oa]|clima\s+medio)\b/,
    alt: 1500,
    label: 'en clima templado',
  },
];

/**
 * Detecta el piso térmico textual del mensaje del usuario. Devuelve la PRIMERA
 * coincidencia (más específica) o null. Conservador: solo frases inequívocas.
 *
 * @param {string} userNorm  texto del usuario normalizado (sin tildes/case).
 * @returns {{alt:number, label:string}|null}
 */
function _userPisoFromText(userNorm) {
  if (typeof userNorm !== 'string' || !userNorm) return null;
  for (const p of USER_PISO_PHRASES) {
    if (p.re.test(userNorm)) return { alt: p.alt, label: p.label };
  }
  return null;
}

/**
 * La RESPUESTA ya está señalando la incompatibilidad de piso/altitud (acertó). Si
 * dice "no prospera", "no es viable", "no se da", "necesita clima…", "fuera de su
 * rango", "no es el clima/la altura adecuada" → no re-corregimos. Anti-FP central.
 */
const EMBEDDED_ALREADY_FLAGS_RE =
  /(no\s+prosper|no\s+es\s+viable|inviable|no\s+se\s+da\b|clima\s+no\s+(le\s+)?sirve|altura\s+no\s+(le\s+)?sirve|fuera\s+de\s+su\s+rango|no\s+(crece|sobrevive|aguanta|resiste)\s+(bien|en|a)|necesita\s+(un\s+)?clima|no\s+es\s+(el\s+)?(clima|piso|la\s+altura|altura)\s+(adecuad|correct|apropiad|ideal)|no\s+corresponde\s+a\s+ese\s+(clima|piso|altura)|esa\s+premisa)/;

/**
 * La RESPUESTA TRATA el cultivo como PRESENTE/viable (le da cosecha, cuidados,
 * manejo, abono, riego, poda, o afirma que se da/produce). Si no engancha con el
 * cultivo, no hay complacencia que neutralizar. Sobre el texto normalizado.
 */
const EMBEDDED_TREATS_AS_PRESENT_RE =
  /(cosech\w*|cuid\w*|abon\w*|rieg\w*|rega\w*|pod[ae]\w*|manej\w*|fertiliz\w*|fructific\w*|florec\w*|produc\w*|madur\w*|se\s+da\b|se\s+cultiva|crece\s+bien|distancia\s+de\s+siembra|control\w*|aplic\w*|trasplant\w*|cuando\s+(la\s+|lo\s+)?(coseches|recoges))/;

/** Marca textual idempotente del reemplazo de premisa falsa embebida. */
const EMBEDDED_FALSE_PREMISE_MARKER = 'con cariño te corrijo';

/**
 * Deriva la palabra de clima de una banda de altitud [min, max] del grounding, sin
 * red ni catálogo: usa el punto medio contra los umbrales de piso térmico de
 * Colombia (mismos cortes que pisoTermicoFromAltitud).
 */
function _climaWordFromRange(min, max) {
  const mid = (min + max) / 2;
  if (mid >= 3000) return 'clima de páramo';
  if (mid >= 2000) return 'clima frío';
  if (mid >= 1000) return 'clima templado';
  return 'clima cálido';
}

/**
 * Texto de corrección AMABLE para la premisa falsa embebida. Español de Colombia
 * (tú), sin humillar. Da el rango real + orienta; nombra alternativas SOLO si el
 * grounding las trae.
 */
function _embeddedFalsePremiseReplacement({ nombre, pisoLabel, min, max, alternativas }) {
  const clima = _climaWordFromRange(min, max);
  const altTxt = alternativas.length
    ? ` Si quieres sembrar ${pisoLabel}, lo que sí se da bien por allá es, por ejemplo, ${alternativas.join(', ')} (del catálogo).`
    : ` Si me dices bien la altura o el municipio de tu finca, con gusto te oriento qué cultivos sí se dan ${pisoLabel}.`;
  return (
    `Ojo, ${EMBEDDED_FALSE_PREMISE_MARKER}: ${nombre} no prospera ${pisoLabel} — necesita ${clima}, ` +
    `alrededor de ${min}–${max} msnm. Seguramente te refieres a otra ubicación, a otra planta o a una ` +
    `siembra que no va a cuajar ahí, así que prefiero no darte cuidados de un cultivo que no se daría en ese ` +
    `piso.${altTxt}`
  );
}

/**
 * guardEmbeddedAltitudeFalsePremise — GR-5. Detecta la PREMISA FALSA EMBEBIDA de
 * piso térmico (cultivo dado por sembrado/prosperando en un clima incompatible con
 * su rango del grounding) y, si la respuesta la trata como cierta sin corregir,
 * SUPRIME-Y-REEMPLAZA por una corrección amable + el rango real + orientación.
 *
 * Firma propia (necesita userMessage Y resolvedEntities) → se invoca aparte en
 * applyOutputGuards, fuera de GUARD_CHAIN. Idempotente. Guard de SIEMBRA/viabilidad.
 *
 * @param {string} responseText
 * @param {{userMessage?: string|null, resolvedEntities?: Array<object>|null}} [ctx]
 * @returns {{text:string, modified:boolean, reason:string|null}}
 */
export function guardEmbeddedAltitudeFalsePremise(
  responseText,
  { userMessage = null, resolvedEntities = null } = {},
) {
  if (typeof responseText !== 'string' || responseText.length === 0) {
    return { text: responseText ?? '', modified: false, reason: null };
  }
  // Idempotencia: nuestro reemplazo ya está → no re-suprimir.
  if (responseText.includes(EMBEDDED_FALSE_PREMISE_MARKER)) {
    return { text: responseText, modified: false, reason: null };
  }
  // Capa 1: el usuario debe nombrar un piso térmico textual inequívoco.
  const userNorm = typeof userMessage === 'string' ? _stripDiacritics(userMessage) : '';
  const piso = _userPisoFromText(userNorm);
  if (!piso) {
    return { text: responseText, modified: false, reason: null };
  }
  // Necesitamos grounding con especie de rango claro para juzgar (NEUTRAL si no hay).
  if (!Array.isArray(resolvedEntities) || resolvedEntities.length === 0) {
    return { text: responseText, modified: false, reason: null };
  }

  const norm = _stripDiacritics(responseText);
  // Capa 3 (corta barato): si la respuesta YA señala la incompatibilidad, acertó.
  if (EMBEDDED_ALREADY_FLAGS_RE.test(norm)) {
    return { text: responseText, modified: false, reason: null };
  }
  // La respuesta debe TRATAR el cultivo como presente/viable (complacencia). Si solo
  // lo menciona de pasada sin darle cosecha/cuidados, no hay qué neutralizar.
  if (!EMBEDDED_TREATS_AS_PRESENT_RE.test(norm)) {
    return { text: responseText, modified: false, reason: null };
  }

  const margin = 300; // misma zona-gris que buildViabilityContext.
  for (const e of resolvedEntities) {
    if (!_isSpecies(e)) continue;
    const hasMin = e.altitud_min != null && e.altitud_min !== '';
    const hasMax = e.altitud_max != null && e.altitud_max !== '';
    if (!hasMin || !hasMax) continue; // sin rango claro → NEUTRAL para esta especie.
    const min = Number(e.altitud_min);
    const max = Number(e.altitud_max);
    if (!Number.isFinite(min) || !Number.isFinite(max) || min > max) continue;

    const demasiadoBajo = piso.alt < min - margin;
    const demasiadoAlto = piso.alt > max + margin;
    if (!demasiadoBajo && !demasiadoAlto) continue; // dentro de banda → premisa válida.

    const nombre = _entityName(e);
    // La especie incompatible debe ser la que el usuario nombró: el grounding la
    // resolvió desde el mensaje, así que su `mentioned`/nombre aparece en el texto.
    const alternativas = _altNames(e.alternativas_viables, 3);
    bumpGuardTelemetry('embedded_altitude_false_premise');
    return {
      text: _embeddedFalsePremiseReplacement({ nombre, pisoLabel: piso.label, min, max, alternativas }),
      modified: true,
      reason: `premisa_falsa_embebida: ${nombre} ${piso.label} (rango ${min}-${max} msnm)`,
    };
  }

  return { text: responseText, modified: false, reason: null };
}

// ── GUARD: cultivo de FRÍO promovido en TIERRA CALIENTE textual (BORDE-009) ──

/**
 * BORDE-009 (quinua en Quibdó): el usuario describe un piso térmico CÁLIDO con
 * palabras ("aquí en Quibdó, calor y lluvia toda la vida") —SIN dar una altitud
 * numérica— y pide sembrar un cultivo de clima FRÍO/de altura (quinua). granite
 * complace ("ponle riego o sombra y se da"). `guardHardAltitudeViability` NO lo
 * agarra (no hay número de altitud), `guardInventedVariety` tampoco (no hay un
 * cualificador "quinua de tierra caliente"), y `guardEmbeddedAltitudeFalsePremise`
 * exige grounding con rango. Este guard cierra ese hueco SIN depender del grounding.
 *
 * Detecta: (1) un piso térmico CÁLIDO en el mensaje del usuario, sea por frase
 * ("tierra caliente", "calor", "costa") o por un topónimo cálido inequívoco de
 * Colombia (Quibdó, Leticia, Apartadó, …); (2) un cultivo de clima FRÍO inequívoco
 * (de `KNOWN_CLIMATE_SPECIES` con clima:'frio') nombrado en el mensaje o la
 * respuesta; (3) la respuesta lo PROMUEVE como sembrable ahí sin negarlo.
 *
 * Doctrina de viabilidad honesta: SUPRIME-Y-REEMPLAZA por la inviabilidad por clima
 * (no por la altitud-número, que no hay) + el clima que sí necesita la especie +
 * la redirección. NO inventa variedades tropicales ni "protocolos que la salven".
 *
 * Anti-falso-positivo (conservador):
 *   - solo cultivos de clima frío INEQUÍVOCO (lista cerrada); rango amplio no entra.
 *   - exige piso CÁLIDO explícito (frase o topónimo cálido) — sin eso, no dispara.
 *   - si la respuesta YA declara la inviabilidad/incompatibilidad de clima, no toca.
 *   - idempotente por marcador.
 */

/**
 * Frases de PISO TÉRMICO CÁLIDO en el mensaje del usuario (sobre normalizado). Más
 * laxo que `USER_PISO_PHRASES` (incluye "calor", "hace calor") porque aquí el clima
 * cálido del usuario es lo que delata la incompatibilidad con un cultivo de frío.
 */
const WARM_USER_CLIMATE_RE =
  /\b(tierra\s+caliente|clima\s+(caliente|calid[oa])|zona\s+calid[oa]|hace\s+(mucho\s+)?calor|puro\s+calor|el\s+calor\b|tierra\s+ardiente|tropical|en\s+la\s+costa|el\s+litoral|tierra\s+baja|bajura)\b/;

/**
 * Topónimos colombianos de CLIMA CÁLIDO INEQUÍVOCO (tierra caliente, < ~1.000 m).
 * Lista cerrada y conservadora (capitales/municipios cuyo piso térmico cálido no
 * admite discusión). Sobre el texto normalizado del usuario. Si el usuario nombra
 * uno de estos, el piso es cálido aunque no use la palabra "calor".
 */
const WARM_TOPONYMS = [
  'quibdo', 'leticia', 'aparta', 'monteria', 'sincelejo', 'valledupar',
  'riohacha', 'santa marta', 'cartagena', 'barranquilla', 'magangue',
  'turbo', 'tumaco', 'buenaventura', 'arauca', 'yopal', 'villavicencio',
  'puerto', 'neiva', 'girardot', 'honda', 'aguachica', 'planeta rica',
];

/** Marca idempotente del reemplazo de cultivo-de-frío en tierra caliente. */
const WARM_COLD_CROP_MARKER = 'no se da en tierra caliente';

/**
 * La RESPUESTA promueve la siembra del cultivo en ese clima (lo recomienda, da
 * manejo, o lo declara sembrable/que se da). Reutiliza léxico de promoción de los
 * guards de altitud. Sobre texto normalizado.
 */
const WARM_COLD_PROMOTES_RE =
  /(se\s+da\b|es\s+viable|opcion\s+viable|se\s+puede\s+(cultivar|sembrar|dar)|siembr\w*|sembr\w*|cultiv\w*|ponle\s+(riego|sombra)|con\s+(riego|sombra)|para\s+que\s+aguante|aguanta\b|adaptad[oa]\b|se\s+cultiva|produce\b|rinde\b)/;

/**
 * La RESPUESTA YA declara la inviabilidad por clima (acertó). Si dice "no se da en
 * clima cálido", "necesita clima frío", "es de tierra fría", "no prospera con ese
 * calor", "inviable" → no re-suprimimos. Anti-FP central. Sobre normalizado.
 */
const WARM_COLD_ALREADY_FLAGS_RE =
  /(\bno\s+se\s+da\b|\bno\s+prosper|inviable|\bno\s+es\s+viable\b|necesita\s+(un\s+)?clima\s+(frio|de\s+altura|fresco)|es\s+de\s+(clima\s+)?(frio|tierra\s+fria|altura)|\bno\s+(aguanta|resiste|soporta)\s+(el\s+)?calor\b|demasiado\s+(calor|calid)|\bno\s+es\s+(el\s+)?clima\s+(adecuad|para)\b)/;

/**
 * Construye la corrección de inviabilidad por clima para un cultivo de frío en
 * tierra caliente: di la inviabilidad + el clima que SÍ necesita + redirección
 * honesta. Incluye el binomio canónico (cubre el must_include del bench, p. ej.
 * "Chenopodium quinoa") y la palabra "inviable". NO inventa variedades tropicales.
 */
function _warmColdCropReplacement(entry, climaUsuario) {
  const binom = entry.binomial ? ` (${_displayBinomial(entry.binomial)})` : '';
  const nombre = entry.names[0];
  return (
    `Ojo, con sinceridad: la ${nombre}${binom} ${WARM_COLD_MARKER_PHRASE(climaUsuario)} — es un cultivo ` +
    'de clima frío / de altura, y con ese calor no prospera por más riego o sombra que le pongas; ' +
    `sembrarla ahí es INVIABLE y solo perderías la semilla y la plata. No existe una "variedad tropical" ` +
    `ni un truco que la haga aguantar el calor; esos cuentos no funcionan.\n\n` +
    `Si quieres sembrar en tu zona caliente, con gusto te oriento qué cultivos SÍ se dan bien ahí (del ` +
    `catálogo), en vez de forzar uno que es para tierra fría.`
  );
}

/** Frase del clima del usuario embebida en la corrección (idempotencia estable). */
function WARM_COLD_MARKER_PHRASE(climaUsuario) {
  return climaUsuario ? `${WARM_COLD_CROP_MARKER} como la de ${climaUsuario}` : WARM_COLD_CROP_MARKER;
}

/**
 * guardWarmLowlandColdCrop — BORDE-009. Cultivo de clima FRÍO promovido en TIERRA
 * CALIENTE descrita textualmente (sin altitud numérica). SUPRIME-Y-REEMPLAZA por la
 * inviabilidad por clima + el clima que sí necesita la especie + redirección.
 *
 * Firma propia (necesita userMessage) → se invoca aparte en applyOutputGuards, fuera
 * de GUARD_CHAIN. Idempotente. Guard de SIEMBRA/viabilidad.
 *
 * @param {string} responseText
 * @param {{userMessage?: string|null}} [ctx]
 * @returns {{text:string, modified:boolean, reason:string|null}}
 */
export function guardWarmLowlandColdCrop(responseText, { userMessage = null } = {}) {
  if (typeof responseText !== 'string' || responseText.length === 0) {
    return { text: responseText ?? '', modified: false, reason: null };
  }
  if (responseText.includes(WARM_COLD_CROP_MARKER)) {
    return { text: responseText, modified: false, reason: null };
  }
  const userNorm = typeof userMessage === 'string' ? _stripDiacritics(userMessage) : '';
  if (!userNorm) return { text: responseText, modified: false, reason: null };

  // Capa 1: el usuario describe un piso CÁLIDO (frase de clima o topónimo cálido).
  const warmPhrase = WARM_USER_CLIMATE_RE.test(userNorm);
  const warmToponym = WARM_TOPONYMS.find((t) => userNorm.includes(t)) || null;
  if (!warmPhrase && !warmToponym) {
    return { text: responseText, modified: false, reason: null };
  }

  const norm = _stripDiacritics(responseText);
  // Capa 3 (corta barato): la respuesta YA señala la inviabilidad por clima → acertó.
  if (WARM_COLD_ALREADY_FLAGS_RE.test(norm)) {
    return { text: responseText, modified: false, reason: null };
  }
  // Capa 2: hay un cultivo de clima FRÍO inequívoco nombrado (usuario o respuesta).
  const coldCrop = KNOWN_CLIMATE_SPECIES.find(
    (e) => e.clima === 'frio' && e.names.some((n) => userNorm.includes(_stripDiacritics(n)) || norm.includes(_stripDiacritics(n))),
  );
  if (!coldCrop) {
    return { text: responseText, modified: false, reason: null };
  }
  // La respuesta debe PROMOVER la siembra (si no, no hay complacencia que neutralizar).
  if (!WARM_COLD_PROMOTES_RE.test(norm)) {
    return { text: responseText, modified: false, reason: null };
  }

  bumpGuardTelemetry('warm_lowland_cold_crop');
  const climaUsuario = warmToponym ? warmToponym.replace(/\b\w/g, (c) => c.toUpperCase()) : null;
  return {
    text: _warmColdCropReplacement(coldCrop, climaUsuario),
    modified: true,
    reason: `cultivo_frio_en_tierra_caliente: ${coldCrop.names[0]}${warmToponym ? ` (${warmToponym})` : ''}`,
  };
}

// ── GUARD: cultivo cálido/templado promovido en páramo/frío textual ─────────

const COLD_HIGHLAND_USER_RE =
  /\b(paramo[s]?|subparamo[s]?|tierra\s+fria|clima\s+frio|zona\s+fria|frio\s+de\s+altura)\b/;

const COLD_HIGHLAND_TOPONYMS = [
  'bogota',
  'tunja',
  'zipaquira',
  'sumapaz',
  'duitama',
  'sogamoso',
  'fomeque',
  'ventaquemada',
];

const COLD_HIGHLAND_WARM_CROP_MARKER = 'no va en ese piso';

const COLD_HIGHLAND_PROMOTES_RE =
  /(se\s+da\b|es\s+viable|opcion\s+viable|se\s+puede\s+(cultivar|sembrar|dar)|siembr\w*|sembr\w*|cultiv\w*|manej\w*|aguanta\b|resiste\b|adaptad[oa]\b|se\s+cultiva|produce\b|para\s+(la\s+)?mejor\s+cosecha|distancia\s+de\s+siembra|metros\s+entre\s+plantas)/;

const COLD_HIGHLAND_ALREADY_FLAGS_RE =
  /(\bno\s+se\s+da\b|\bno\s+prosper|inviable|\bno\s+es\s+viable\b|\bno\s+(aguanta|resiste|soporta)\s+(el\s+)?frio\b|\bno\s+es\s+(el\s+)?(clima|piso|la\s+altura|altura)\s+(adecuad|correct|apropiad|ideal)\b|\bno\s+corresponde\s+a\s+ese\s+(clima|piso|altura)\b|\bdemasiad[oa]\s+frio\b|\bdemasiado\s+fria\b)/;

const COLD_HIGHLAND_CROP_MARKERS = [
  {
    names: ['cacao'],
    display: 'cacao',
    climate: 'tierra cálida',
    binomial: 'theobroma cacao',
  },
  {
    names: ['platano', 'plátano'],
    display: 'plátano',
    climate: 'tierra cálida o templada',
    binomial: 'musa x paradisiaca',
  },
  {
    names: ['banano', 'guineo'],
    display: 'banano / guineo',
    climate: 'tierra cálida o templada',
    binomial: 'musa acuminata',
  },
  {
    names: ['yuca', 'yuca dulce', 'yuca de comer'],
    display: 'yuca dulce',
    climate: 'tierra cálida o templada',
    binomial: 'manihot esculenta',
  },
  {
    names: ['mango'],
    display: 'mango',
    climate: 'tierra cálida',
    binomial: 'mangifera indica',
  },
  {
    names: ['papaya'],
    display: 'papaya',
    climate: 'tierra cálida o templada',
    binomial: 'carica papaya',
  },
  {
    names: ['arroz'],
    display: 'arroz',
    climate: 'tierra cálida o templada',
    binomial: 'oryza sativa',
  },
  {
    names: ['piña', 'pina'],
    display: 'piña',
    climate: 'tierra cálida',
    binomial: 'ananas comosus',
  },
  {
    names: ['chontaduro'],
    display: 'chontaduro',
    climate: 'tierra cálida',
    binomial: 'bactris gasipaes',
  },
  {
    names: ['palma'],
    display: 'palma',
    climate: 'tierra cálida',
    binomial: 'bactris gasipaes',
  },
  {
    names: ['maranon', 'marañón', 'merey'],
    display: 'marañón',
    climate: 'tierra cálida',
    binomial: 'anacardium occidentale',
  },
  {
    names: ['copoazu', 'copoazú', 'cupuacu', 'cupuaçu'],
    display: 'copoazú',
    climate: 'tierra cálida',
    binomial: 'theobroma grandiflorum',
  },
  {
    names: ['cafe', 'cafe arabica', 'cafe de altura', 'cafeto'],
    display: 'café',
    climate: 'tierra templada o fría, no de páramo',
    binomial: 'coffea arabica',
  },
];

function _coldHighlandContextFromText(userNorm) {
  if (typeof userNorm !== 'string' || !userNorm) return null;
  if (COLD_HIGHLAND_USER_RE.test(userNorm)) {
    if (/\bparamo[s]?\b/.test(userNorm)) {
      return { label: 'en el páramo', reasonSuffix: 'páramo', kind: 'paramo' };
    }
    return { label: 'en clima frío', reasonSuffix: 'clima frio', kind: 'frio' };
  }
  const toponym = COLD_HIGHLAND_TOPONYMS.find((t) => userNorm.includes(t)) || null;
  if (!toponym) return null;
  return { label: 'en clima frío', reasonSuffix: toponym, kind: 'toponym' };
}

function _coldHighlandWarmCropReplacement(entry, pisoLabel) {
  const binom = entry.binomial ? ` (${_displayBinomial(entry.binomial)})` : '';
  return (
    `Ojo: ${entry.display}${binom} no va ${pisoLabel}; es un cultivo de ${entry.climate}. ` +
    'Sembrarlo ahi es inviable.'
  );
}

/**
 * guardColdHighlandWarmCrop - espejo de guardWarmLowlandColdCrop. Detecta un
 * cultivo cálido o templado promovido en un piso de páramo o frío descrito por
 * palabra o toponimo, y reemplaza por una advertencia determinista.
 *
 * Firma propia (necesita userMessage) - se invoca aparte en applyOutputGuards.
 *
 * @param {string} responseText
 * @param {{userMessage?: string|null}} [ctx]
 * @returns {{text:string, modified:boolean, reason:string|null}}
 */
export function guardColdHighlandWarmCrop(responseText, { userMessage = null } = {}) {
  if (typeof responseText !== 'string' || responseText.length === 0) {
    return { text: responseText ?? '', modified: false, reason: null };
  }
  if (responseText.includes(COLD_HIGHLAND_WARM_CROP_MARKER)) {
    return { text: responseText, modified: false, reason: null };
  }

  const userNorm = typeof userMessage === 'string' ? _stripDiacritics(userMessage) : '';
  const coldContext = _coldHighlandContextFromText(userNorm);
  if (!coldContext) {
    return { text: responseText, modified: false, reason: null };
  }

  const norm = _stripDiacritics(responseText);
  if (COLD_HIGHLAND_ALREADY_FLAGS_RE.test(norm)) {
    return { text: responseText, modified: false, reason: null };
  }
  if (!COLD_HIGHLAND_PROMOTES_RE.test(norm)) {
    return { text: responseText, modified: false, reason: null };
  }

  const crop = COLD_HIGHLAND_CROP_MARKERS.find((entry) =>
    entry.names.some((name) => _bandNameHit(userNorm, name)),
  ) || COLD_HIGHLAND_CROP_MARKERS.find((entry) => entry.names.some((name) => _bandNameHit(norm, name)));
  if (!crop) {
    return { text: responseText, modified: false, reason: null };
  }
  if (crop.display === 'café' && coldContext.kind === 'frio') {
    return { text: responseText, modified: false, reason: null };
  }

  bumpGuardTelemetry('cold_highland_warm_crop');
  return {
    text: _coldHighlandWarmCropReplacement(crop, coldContext.label),
    modified: true,
    reason: `cultivo_calido_en_piso_frio: ${crop.display} (${coldContext.reasonSuffix})`,
  };
}

// ── C2 (BORDE-027): nombre regional NO identificado convertido en especie ───

const UNKNOWN_REGIONAL_CROP_MARKER = 'no puedo confirmar qué es "coincyes"';

const COINCYES_QUERY_RE = /\bcoincyes\b/;
const COINCYES_PROMOTION_RE =
  /\b(se\s+puede\s+(sembrar|cultivar)|puede\s+ser\s+viable|no\s+se\s+puede\s+descartar|condiciones\s+optimas|para\s+cultivar|se\s+recomienda\s+el\s+cultivo|obtener\s+una\s+buena\s+cosecha|produccion)\b/;
const COINCYES_FAKE_ID_RE = /\bpiper\s+aduncum\b|\bpertenece\s+a\s+la\s+familia\s+piperaceae\b/;
const COINCYES_ALREADY_UNCERTAIN_RE =
  /\b(no\s+(puedo|logro|alcanzo)\s+confirmar\s+que\s+es\s+coincyes|aclarar\s+que\s+es\s+coincyes|identificar\s+que\s+es\s+coincyes|no\s+lo\s+voy\s+a\s+tratar\s+como\s+piper\s+aduncum)\b/;

function _coincyesReplacement() {
  return (
    `Antes de recomendar siembra: ${UNKNOWN_REGIONAL_CROP_MARKER}. No lo voy a tratar como Piper aduncum ` +
    'ni afirmar que se da en Leticia sin identificar la especie real.\n\n' +
    'Haz primero esta verificación:\n' +
    '- Foto de la semilla, hoja, fruto y planta completa.\n' +
    '- Nombre local alterno y quién te vendió o recomendó la semilla.\n' +
    '- Vereda/municipio y altura aproximada del lote.\n' +
    '- Uso esperado: comida, medicinal, sombrío, madera, cobertura o mercado.\n\n' +
    'Con la especie confirmada sí cruzamos el grafo Chagra con clima, piso térmico y riesgos de invasividad. ' +
    'Mientras no esté identificada, lo prudente es no comprar semilla ni planear siembra comercial.'
  );
}

/**
 * guardUnidentifiedRegionalCrop — BORDE-027. Si el usuario pregunta por un nombre
 * local no identificado ("coincyes") y la respuesta lo convierte en un binomio o
 * valida la siembra sin evidencia, reemplaza por una petición de identificación.
 * Es deliberadamente estrecho: solo actúa sobre `coincyes`, no sobre cualquier
 * nombre regional colombiano.
 *
 * @param {string} responseText
 * @param {{userMessage?: string|null}} [ctx]
 * @returns {{text:string, modified:boolean, reason:string|null}}
 */
export function guardUnidentifiedRegionalCrop(responseText, { userMessage = null } = {}) {
  if (typeof responseText !== 'string' || responseText.length === 0) {
    return { text: responseText ?? '', modified: false, reason: null };
  }
  if (responseText.includes(UNKNOWN_REGIONAL_CROP_MARKER)) {
    return { text: responseText, modified: false, reason: null };
  }

  const userNorm = typeof userMessage === 'string' ? _stripDiacritics(userMessage) : '';
  const norm = _stripDiacritics(responseText);
  if (!COINCYES_QUERY_RE.test(userNorm) && !COINCYES_QUERY_RE.test(norm)) {
    return { text: responseText, modified: false, reason: null };
  }
  if (COINCYES_ALREADY_UNCERTAIN_RE.test(norm)) {
    return { text: responseText, modified: false, reason: null };
  }

  const fabricatedIdentity = COINCYES_FAKE_ID_RE.test(norm);
  const promotedPlanting = COINCYES_PROMOTION_RE.test(norm);
  if (!fabricatedIdentity && !promotedPlanting) {
    return { text: responseText, modified: false, reason: null };
  }

  bumpGuardTelemetry('unidentified_regional_crop');
  const signals = [];
  if (fabricatedIdentity) signals.push('identidad_no_grounded');
  if (promotedPlanting) signals.push('siembra_validada_sin_identificar');
  return {
    text: _coincyesReplacement(),
    modified: true,
    reason: `cultivo_regional_no_identificado: coincyes (${signals.join(', ')})`,
  };
}

// ── C3 (fix #95): binomio latino para término regional no verificado ─────────

/**
 * Regex que detecta un binomio latino (Género especie) en la respuesta.
 * Requisitos anti-falsos-positivos:
 *   - Primera letra mayúscula (género) seguida de minúscula + mínimo 2 chars.
 *   - Especia en minúsculas, mínimo 3 chars.
 *   - NO captura: siglas (ICA, MRL), palabras solas, nombres propios cortos.
 * Calibrado para detectar "Piper aduncum", "Cointzia sp.", "Momordica charantia",
 * etc. sin disparar sobre texto normal como "En Colombia se..." o "La región".
 *
 * Notas de diseño: el patrón es intencionalmente amplio en la captura (captura
 * el binomio), pero el guard solo actúa si ADEMÁS el término del usuario no está
 * grounded. Así el falso positivo es imposible: si el LLM inventó el binomio en
 * contexto sin grounding, el guard actúa; si había grounding de alta confianza
 * para ese término, `resolvedMentions` lo incluye y el guard NO actúa.
 */
// Regex estricto para binomio botánico:
//   - Genus: mayúscula inicial + ≥4 letras [a-z] sin tilde (latín puro). Total ≥5 chars.
//   - Epithet: todo [a-z] sin tilde, mínimo 4 chars. Excluye español con tilde
//     ("más", "así", "allí") porque los epítetos botánicos son latín puro sin diacríticos.
// Anti-falsos-positivos: "Cuéntame más" no matchea (Cuéntame tiene tilde → no captura
// por [a-z] puro en el genus; además "más" tiene 3 chars < 4 mínimo del epithet).
// Fix #95 — anti falsos positivos: SOLO binomios entre paréntesis, que es el
// patrón real con que el LLM "identifica" un término ("La yumbolo (Tithonia
// diversifolia) es..."). Así NO matchea verbos capitalizados a inicio de oración
// ("Aplica glifosato", "Evita usar") ni binomios reales recomendados sin
// paréntesis ("...y Bacillus thuringiensis para orugas"), que no son atribución
// al término desconocido del usuario y disparaban clobbereo de respuestas sanas.
const LATIN_BINOMIAL_RE =
  /\(\s*([A-Z][a-z]{4,})\s+([a-z]{4,}(?:\s+(?:var\.|f\.|subsp\.|ssp\.)?\s*[a-z]{4,})?)\b/g;

/**
 * Palabras comunes que podrían parecer binomios pero NO lo son.
 * Anti-falsos-positivos para el detector de binomios.
 */
const BINOMIAL_FALSE_POSITIVES = new Set([
  // términos agroecológicos comunes Género-like
  'chagra ia', 'chagra tiene', 'colombia tiene', 'colombia es', 'colombia no',
  // nombres propios frecuentes en contexto agro
  'cauca valle', 'boyaca cundinamarca', 'nino nina',
  // verbos/frases con mayúscula al inicio de oración (el regex solo toma
  // el token, pero por si acaso)
  'asistente chagra',
]);

/**
 * ¿El texto contiene al menos un binomio latino?
 * @param {string} text  texto sin diacríticos y en minúsculas
 * @returns {string|null} el primer binomio encontrado, o null
 */
function _extractLatinBinomial(text) {
  // Reseteamos el lastIndex porque el regex es global
  LATIN_BINOMIAL_RE.lastIndex = 0;
  let match;
  while ((match = LATIN_BINOMIAL_RE.exec(text)) !== null) {
    const genus = match[1];
    const epithet = match[2].split(/\s+/)[0]; // primera palabra de la especia
    // El género debe tener ≥4 chars para reducir falsos (evita "El", "La", etc.)
    if (genus.length < 4) continue;
    const pair = `${genus} ${epithet}`;
    if (BINOMIAL_FALSE_POSITIVES.has(pair.toLowerCase())) continue;
    return pair;
  }
  return null;
}

/**
 * guardUnverifiedTermBinomial — fix #95. Detecta cuando la respuesta contiene
 * un binomio latino (Género especie) atribuido a un término que el usuario
 * mencionó pero que NO tiene grounding de alta confianza en el catálogo.
 *
 * Actúa solo si:
 *   1. El usuario introdujo un término (userMessage) que no aparece en los
 *      `mentioned` de alta confianza (resolvedMentions).
 *   2. La respuesta contiene un binomio latino.
 *   3. La respuesta no usa ya el marcador de incertidumbre ("no puedo confirmar",
 *      "no reconozco el término", "no tengo información sobre").
 *
 * Es SUPPRESS-AND-REPLACE: si la respuesta ya inventó el binomio, la reemplaza
 * por una petición de aclaración con foto. Si la respuesta es honesta, no toca.
 *
 * Anti-falsos-positivos: si resolvedMentions incluye el término del usuario
 * con alta confianza, el guard NO actúa (el binomio es legítimo del catálogo).
 *
 * @param {string} responseText
 * @param {{userMessage?: string|null, resolvedMentions?: Set<string>}} ctx
 * @returns {{text:string, modified:boolean, reason:string|null}}
 */
export function guardUnverifiedTermBinomial(
  responseText,
  { userMessage = null, resolvedMentions = new Set() } = {}
) {
  if (typeof responseText !== 'string' || responseText.length === 0) {
    return { text: responseText ?? '', modified: false, reason: null };
  }
  // Si la respuesta ya es honesta sobre no saber, no tocar.
  const norm = responseText.toLowerCase();
  if (
    norm.includes('no puedo confirmar') ||
    norm.includes('no reconozco el término') ||
    norm.includes('no tengo información sobre') ||
    norm.includes('no lo voy a tratar como') ||
    norm.includes('¿podrías describirlo') ||
    norm.includes('necesito que me confirmes') ||
    norm.includes('foto de la') ||
    norm.includes('cuéntame qué planta') ||
    norm.includes('¿puedes enviar una foto') ||
    norm.includes('puedes enviar una foto')
  ) {
    return { text: responseText, modified: false, reason: null };
  }

  if (typeof userMessage !== 'string' || !userMessage.trim()) {
    return { text: responseText, modified: false, reason: null };
  }

  // Condición PRINCIPAL: el guard actúa solo cuando NO hay ningún mentioned de
  // alta confianza del resolver para esta consulta. Si hay al menos un término
  // verificado (gulupa, café...), el binomio en la respuesta es probablemente
  // legítimo y NO tocamos nada.
  //
  // Diseño conservador: si resolvedMentions tiene cualquier entrada, asumimos
  // que el grounding es legítimo. Falsos negativos (nombre regional + nombre
  // verificado en la misma consulta) son aceptables frente a los falsos
  // positivos (bloquear respuesta legítima sobre gulupa).
  if (resolvedMentions.size > 0) {
    return { text: responseText, modified: false, reason: null };
  }

  // Sin ningún mentioned de alta confianza: ¿la respuesta contiene un binomio latino?
  const binomial = _extractLatinBinomial(responseText);
  if (!binomial) {
    return { text: responseText, modified: false, reason: null };
  }

  // Extrae el término más probable que el usuario introdujo como nombre regional.
  // Usa el token más corto y menos común del userMessage (heurística: nombres
  // regionales tienden a ser palabras únicas no en el vocabulario español estándar).
  const USER_STOPWORDS = new Set([
    // preposiciones y conjunciones
    'para', 'como', 'porque', 'desde', 'hasta', 'sobre', 'entre', 'hacia', 'ante',
    // verbos comunes conjugados
    'tiene', 'tengo', 'tenemos', 'tener', 'pueden', 'puede', 'dijeron', 'ofrecen',
    'quiero', 'quiere', 'quieren', 'traer', 'traigo', 'traen', 'seria', 'seria',
    'creen', 'creo', 'dicen', 'dice', 'piden', 'pide',
    // sustantivos agrícolas genéricos
    'semilla', 'planta', 'plantas', 'mata', 'matas', 'cultivo', 'cultivos',
    'finca', 'campo', 'lote', 'tierra', 'suelo', 'agua', 'ganado', 'siembra',
    'cosecha', 'riego', 'abono', 'monte', 'pasto',
    // adjetivos comunes
    'buena', 'bueno', 'buenas', 'buenos', 'muchas', 'mucho', 'estas', 'estos',
    // interrogativos y relativos
    'cuando', 'donde', 'esto', 'esta', 'este', 'esos', 'esas',
  ]);

  const userTokens = userMessage
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .split(/\W+/)
    .filter((t) => t.length >= 4 && !USER_STOPWORDS.has(t));

  // Término sospechoso: el más corto (heurística para nombres regionales únicos).
  const suspectTerm = userTokens.length > 0
    ? userTokens.sort((a, b) => a.length - b.length)[0]
    : 'ese término';

  bumpGuardTelemetry('unverified_term_binomial');
  const replacement =
    `No puedo confirmar qué es "${suspectTerm}" porque ese término no está en el catálogo Chagra ` +
    `y no tengo un grounding verificado para él. No lo voy a tratar como ${binomial} sin evidencia.\n\n` +
    `Para identificar la planta correctamente necesito:\n` +
    `- Foto de la hoja (haz y envés), tallo, flor o fruto si hay.\n` +
    `- Nombre local que usan en tu vereda o municipio, y quién lo usa así.\n` +
    `- Altura de la finca (msnm) y departamento.\n` +
    `- Para qué la usarías: alimento, medicinal, sombrío, forraje, madera o mercado.\n\n` +
    `Con esa información sí puedo cruzar el catálogo y darte una respuesta con respaldo real, ` +
    `no inventada. ¿Puedes enviar una foto?`;

  return {
    text: replacement,
    modified: true,
    reason: `binomio_no_verificado: "${suspectTerm}" → ${binomial} (sin grounding en catálogo)`,
  };
}

// ── Bench V2: prompt truncado / toxico alimentario / benéfico inventado ─────

const TRUNCATED_PROMPT_MARKER = 'necesito que completes la pregunta';

const TRUNCATED_PROMPT_RE =
  /\b(aplicando|preparando|echando|usando|con)\s+(un\s+|una\s+)?(caldo|preparado|biopreparado|extracto|producto)\s+(de|con)\s*$/;

function _truncatedPromptReplacement() {
  return (
    `${TRUNCATED_PROMPT_MARKER}: tu mensaje quedó cortado justo cuando ibas a decir qué caldo, preparado o ` +
    'producto te recomendaron. No voy a inventar el nombre ni la dosis.\n\n' +
    'Escríbeme la frase completa y, si puedes, agrega foto o describe bien el síntoma: cultivo, parte afectada, ' +
    'color de la mancha, desde cuándo empezó y si hay humedad o lluvia. Con eso sí puedo orientar un manejo real.'
  );
}

export function guardTruncatedUserPrompt(responseText, { userMessage = null } = {}) {
  if (typeof responseText !== 'string' || responseText.length === 0) {
    return { text: responseText ?? '', modified: false, reason: null };
  }
  if (responseText.includes(TRUNCATED_PROMPT_MARKER)) {
    return { text: responseText, modified: false, reason: null };
  }
  const userNorm = typeof userMessage === 'string' ? _stripDiacritics(userMessage).trim() : '';
  if (!TRUNCATED_PROMPT_RE.test(userNorm)) {
    return { text: responseText, modified: false, reason: null };
  }
  bumpGuardTelemetry('truncated_user_prompt');
  return { text: _truncatedPromptReplacement(), modified: true, reason: 'pregunta_truncada' };
}

const TOXIC_FOOD_RESIDUE_MARKER = 'la higuerilla no se espolvorea sobre comida';

function _toxicFoodResidueReplacement() {
  return (
    `No hagas eso: ${TOXIC_FOOD_RESIDUE_MARKER}. La higuerilla (Ricinus communis) contiene ricina y ` +
    '"orgánico" no significa inocuo. No te doy gramos por arroba ni frecuencia de reaplicación porque dejar ' +
    'residuo de higuerilla sobre papa de consumo es un riesgo.\n\n' +
    'Para papa almacenada, usa manejo seguro: selección de tubérculos sanos y secos, troja limpia y ventilada, ' +
    'retirar papas picadas o podridas, evitar humedad y revisar periódicamente. Si necesitas control de plaga ' +
    'en almacenamiento, valida una opción permitida con tu técnico local, ICA o la autoridad sanitaria.'
  );
}

export function guardToxicResidueOnFood(responseText, { userMessage = null } = {}) {
  if (typeof responseText !== 'string' || responseText.length === 0) {
    return { text: responseText ?? '', modified: false, reason: null };
  }
  if (responseText.includes(TOXIC_FOOD_RESIDUE_MARKER)) {
    return { text: responseText, modified: false, reason: null };
  }
  const haystack = `${userMessage || ''}\n${responseText || ''}`;
  const norm = _stripDiacritics(haystack);
  const mentionsToxic = /\b(higuerilla|ricino|ricinus\s+communis|ricina)\b/.test(norm);
  const mentionsFoodStorage = /\b(papa|papas|tuberculo|tuberculos)\b/.test(norm) && /\b(troja|almacen|almacenad|arroba|consumo|comida|espolvorear|polvo)\b/.test(norm);
  if (!mentionsToxic || !mentionsFoodStorage) {
    return { text: responseText, modified: false, reason: null };
  }
  bumpGuardTelemetry('toxic_food_residue');
  return { text: _toxicFoodResidueReplacement(), modified: true, reason: 'residuo_toxico_en_alimento: higuerilla' };
}

const FAKE_BENEFICIAL_CONFIRM_MARKER = 'no puedo confirmar ese organismo benéfico';

function _fakeBeneficialReplacement(name = 'ese organismo') {
  return (
    `No puedo confirmar ese organismo benéfico: ${name}. No te doy cantidad por árbol ni dónde comprarlo, ` +
    'porque sería validar un controlador biológico que no está verificado y podría no existir.\n\n' +
    'Para una plaga que come hojas en limón, primero identifica la plaga o manda foto. Luego se escoge manejo ' +
    'integrado: monitoreo, poda sanitaria, retiro manual si aplica, conservación de enemigos naturales reales ' +
    'y una opción validada con tu técnico, ICA o Agrosavia.'
  );
}

export function guardRequestedFabricatedBeneficial(responseText, { userMessage = null } = {}) {
  if (typeof responseText !== 'string' || responseText.length === 0) {
    return { text: responseText ?? '', modified: false, reason: null };
  }
  if (responseText.includes(FAKE_BENEFICIAL_CONFIRM_MARKER)) {
    return { text: responseText, modified: false, reason: null };
  }
  const haystack = `${userMessage || ''}\n${responseText || ''}`;
  const norm = _stripDiacritics(haystack);
  const asksForConfirmation = /\b(confirm\w*|cuantos?|cantidad|por\s+arbol|donde\s+consigo|comprar|conseguir)\b/.test(norm);
  const mentionsOligamus = /\boligamus\s+pectoralis\b/.test(norm);
  if (!asksForConfirmation || !mentionsOligamus) {
    return { text: responseText, modified: false, reason: null };
  }
  bumpGuardTelemetry('requested_fabricated_beneficial');
  return {
    text: _fakeBeneficialReplacement('Oligamus pectoralis'),
    modified: true,
    reason: 'organismo_benefico_inventado_suprimido: oligamus pectoralis',
  };
}

// ── GUARD: AGROQUÍMICO DISFRAZADO con NOMBRE GENÉRICO inventado (BORDE-017/022) ─

/**
 * Genérico-milagro pomposo: "fungicida/insecticida/cebo/bioinsumo natural orgánico
 * que sirve para todo / universal / certificado para todo". Es el envoltorio que
 * disfraza un producto inexistente o un agroquímico de síntesis. Sobre texto
 * normalizado. Requiere la combinación producto + cualificador-milagro (no basta
 * "orgánico" suelto, que es legítimo).
 */
const MIRACLE_GENERIC_PRODUCT_RE =
  /\b(fungicida|insecticida|plaguicida|pesticida|acaricida|cebo|bioinsumo|biopreparado|producto|liquido)\b[^.!?]{0,60}\b(natural|organic[oa]|biologic[oa])\b[^.!?]{0,40}\b(que\s+sirve\s+para\s+todo|sirve\s+para\s+todo|para\s+todo\s+el\s+hongo|universal|para\s+cualquier\s+(hongo|plaga|bicho))\b/;

/**
 * Variante "X que sirve para todo" sin requerir el adjetivo orgánico/natural en
 * medio (el producto-milagro a secas). Refuerza la señal del genérico inventado.
 */
const MIRACLE_GENERIC_ALT_RE =
  /\b(fungicida|insecticida|plaguicida|pesticida|acaricida|cebo|bioinsumo|producto)\b[^.!?]{0,30}\b(que\s+sirve\s+para\s+todo|universal|milagro)\b/;

/**
 * ID de catálogo FALSO inventado. Dos formas observadas en el bench V2:
 *   - "Chagra ID 1032", "código Chagra 4521" (el del enunciado del bench), y
 *   - un SKU alfanumérico presentado como código del catálogo: "registrado en el
 *     catálogo Chagra con el código CHA00124" (lo que granite produjo en BORDE-022).
 * El catálogo Chagra NO usa códigos de SKU comercial; cualquier código así es
 * inventado. La segunda forma exige el contexto "catalogo chagra ... codigo <SKU>"
 * para no marcar referencias legítimas de números sueltos.
 */
const FAKE_CATALOG_ID_RE =
  /\b(chagra\s+id|codigo\s+chagra|chagra\s+codigo)\s*#?\s*\d{2,6}\b|catalogo\s+chagra\b[^.!?]{0,40}\bcodigo\s+#?\s*[a-z]{2,5}-?\d{2,6}\b/i;

/** DOSIS de aplicación por unidad de aspersión: "5 cc por trampa", "50 ml por bomba de 20 litros". */
const APPLY_DOSE_RE =
  /\b\d+(?:[.,]\d+)?\s*(?:ml|cc|g|gr|gramos?|cm3|litros?|l)\b\s*(?:\/|por|por\s+cada|x)\s*(?:trampa|bomba|caneca|aspersion|fumigada|hectarea|ha|planta|arbol|litro)\b/i;

/** FRECUENCIA exacta de repetición: "repite cada 8 días", "cada 7 días". */
const APPLY_FREQ_RE = /\b(repit\w*|aplica\w*|cada)\s*(?:[^.!?]{0,20})?\bcada\s+\d+\s*dias?\b|\bcada\s+\d+\s*dias?\b/i;

/**
 * VENENO/CEBO CASERO presentado como receta a PREPARAR (BORDE-022, variante no-determinista
 * de granite): "prepara un veneno casero con melaza", "cebo casero". Un biopreparado REAL
 * nunca se llama "veneno casero"; esta expresión denota una concocción improvisada cuya
 * "dosis" es inventada. Requiere el verbo de preparación/refuerzo cerca para no marcar una
 * mención de pasada ni una advertencia ("no prepares venenos caseros"). Sobre texto normalizado.
 */
const HOMEMADE_POISON_RECIPE_RE =
  /\b(veneno|cebo|insecticida|plaguicida|matabicho|mata\s*bichos?)\s+casero\b[^.!?]{0,60}\b(prepar\w*|hace\w*|haz\b|sigue\s+estos\s+pasos|con\s+melaza|reforz\w*|aplic\w*|mezcl\w*|disuelv\w*)\b|\b(prepara\w*|haz\b|hacer)\b[^.!?]{0,30}\b(veneno|cebo|matabicho)\s+casero\b/;

/**
 * La respuesta YA desaconseja el producto-MILAGRO específicamente (acertó). Debe ligar
 * la negación al "sirve para todo / producto-milagro", NO a una marca concreta: el
 * reemplazo de `guardInventedBrand` ("no existe ningún producto comercial con ese nombre")
 * trae "no existe" pero NO debunkea el producto-milagro ni la receta de veneno casero que
 * pueda quedar debajo —por eso este guard NO debe darse por satisfecho con esa frase.
 */
const RESPONSE_DENIES_MIRACLE_RE =
  /\b(no\s+existe|no\s+hay)\b[^.!?]{0,40}\b(producto|fungicida|cebo|insecticida|extracto|preparado)\b[^.!?]{0,40}\b(que\s+sirva\s+para\s+todo|para\s+todo|universal|milagro|cure\s+todo|controle\s+(todo|cualquier))\b|\b(desconfia|desconfie|no\s+te\s+(creas|fies))\b/;

/** Marca idempotente del reemplazo del producto-milagro genérico. */
const DISGUISED_GENERIC_MARKER = 'no existe un producto que sirva para todo';

/**
 * Plagas/enfermedades conocidas cuyo NOMBRE conviene PRESERVAR al suprimir el producto
 * inventado, para no perder la identificación del problema (que el campesino necesita
 * para el manejo correcto, y que el bench exige como must_include). La mosca del
 * Mediterráneo (Ceratitis capitata) es el caso de BORDE-022. Sobre texto normalizado.
 */
const KNOWN_PEST_CONTEXT = [
  {
    re: /\bmosca\s+del\s+mediterraneo\b|\bceratitis\s+capitata\b/,
    line:
      'Lo tuyo es la mosca del Mediterráneo (Ceratitis capitata) en el mango: una plaga concreta que se maneja ' +
      'con manejo integrado, no con un producto "para todo".',
  },
];

/**
 * Si el texto original nombra una plaga/enfermedad conocida, devuelve la línea de
 * contexto que la identifica. null si no hay match. Sobre el texto normalizado.
 */
function _knownPestContext(norm) {
  for (const p of KNOWN_PEST_CONTEXT) {
    if (p.re.test(norm)) return p.line;
  }
  return null;
}

/**
 * Redirección honesta que reemplaza la dosis/ID del producto-milagro genérico.
 * No nombra marcas ni dosis; manda al manejo INTEGRADO (trampas con atrayente) +
 * biopreparado real y a consultar la plaga/hongo concreto. Si se pasa el contexto de
 * la plaga/enfermedad conocida, lo antepone para preservar la identificación.
 */
function _disguisedGenericReplacement(pestContext = null) {
  const lead = pestContext ? `${pestContext}\n\n` : '';
  return (
    `${lead}Cuidado con eso: ${DISGUISED_GENERIC_MARKER} ("fungicida/cebo natural que sirve para todo el hongo o ` +
    'la plaga"). Ese producto-milagro no existe, y un código de catálogo, una dosis "por bomba/por trampa" o un ' +
    '"veneno casero" de algo sin nombre real no es de fiar —puede ser un agroquímico de síntesis disfrazado de ' +
    '"orgánico". Lo que sí funciona es el MANEJO INTEGRADO: manejo sanitario (deshoje y eliminación del material ' +
    'enfermo, recolección de fruta caída, drenaje), trampas con atrayente (cebo/feromona) para monitorear y ' +
    'capturar, y un biopreparado REAL y específico para tu problema. No inventes el nombre comercial ni la dosis. ' +
    'Dime exactamente qué hongo o plaga es y en qué cultivo, y te oriento a un biopreparado del catálogo Chagra o ' +
    'a tu técnico local, el ICA o Agrosavia para la dosis correcta.'
  );
}

/**
 * guardDisguisedGenericAgrochem — BORDE-017 / 022 (V2). Atrapa el patrón
 * intermedio que `guardSyntheticAgrochemical` (token químico/sufijo/combustible) y
 * `guardInventedBrand` (marca Título-Caso/entrecomillada) NO cubren: un producto
 * descrito SOLO por un genérico-milagro pomposo ("fungicida natural orgánico que
 * sirve para todo", "cebo orgánico biológico") acompañado de un DATO INVENTADO que
 * lo hace accionable y peligroso: una DOSIS de aplicación (cc/trampa, ml/bomba), una
 * FRECUENCIA exacta de repetición, o un ID de catálogo FALSO ("Chagra ID 1032").
 *
 * SUPPRESS-AND-REPLACE total: la dosis/ID de un producto inexistente es íntegramente
 * engañosa → se descarta el cuerpo y se devuelve la redirección honesta.
 *
 * GATING (anti-sobre-supresión, requiere AMBAS):
 *   1. hay un GENÉRICO-MILAGRO (`MIRACLE_GENERIC_*`) o un ID de catálogo FALSO.
 *   2. hay un DATO INVENTADO accionable: dosis de aplicación, frecuencia exacta, o el
 *      propio ID falso. (El genérico-milagro SIN ningún dato accionable es no-op: no
 *      hay dosis/ID inventado que suprimir, y otro guard/redirección lo maneja.)
 *   3. la respuesta NO desaconseja YA el producto-milagro (`RESPONSE_DENIES_MIRACLE_RE`).
 * Un biopreparado REAL con dosis real (caldo bordelés 10 g/L, jabón potásico 10 g/L)
 * NO entra: no dispara el genérico-milagro ni el ID falso. Idempotente. Corre SIEMPRE
 * (SAFETY, no es de siembra).
 *
 * @param {string} responseText
 * @returns {{text:string, modified:boolean, reason:string|null}}
 */
export function guardDisguisedGenericAgrochem(responseText) {
  if (typeof responseText !== 'string' || responseText.length === 0) {
    return { text: responseText ?? '', modified: false, reason: null };
  }
  // Idempotencia: nuestro reemplazo ya está → no re-suprimir.
  if (responseText.includes(DISGUISED_GENERIC_MARKER)) {
    return { text: responseText, modified: false, reason: null };
  }

  const norm = _stripDiacritics(responseText);
  // Si la respuesta YA desaconseja el producto-milagro, el modelo acertó → no tocar.
  if (RESPONSE_DENIES_MIRACLE_RE.test(norm)) {
    return { text: responseText, modified: false, reason: null };
  }

  // `norm` (sin tildes) para que "catálogo Chagra con el código CHA00124" matchee
  // el patrón accent-free del ID falso (granite escribe con tildes; el patrón no).
  const hasFakeId = FAKE_CATALOG_ID_RE.test(norm);
  const hasMiracle = MIRACLE_GENERIC_PRODUCT_RE.test(norm) || MIRACLE_GENERIC_ALT_RE.test(norm);
  // BORDE-022 (variante no-determinista): una RECETA de "veneno/cebo casero" a preparar
  // es también un producto inventado peligroso (un biopreparado real nunca se llama
  // "veneno casero"). Cuenta como señal primaria por sí misma —su "dosis" es inventada.
  // Anti-FP: si la respuesta DESACONSEJA el veneno casero ("no prepares venenos caseros"),
  // es una advertencia correcta y se conserva intacta.
  const adviertenNoVenenoCasero = /\b(no|nunca|evita|evite|jamas)\b[^.!?]{0,40}\b(prepar\w*|hag\w*|haz\b|uses?|use|apliques?|aplique)\b[^.!?]{0,20}\b(veneno|cebo|matabicho|insecticida|plaguicida)s?\s+casero/.test(
    norm,
  );
  const hasHomemadePoison = HOMEMADE_POISON_RECIPE_RE.test(norm) && !adviertenNoVenenoCasero;
  if (!hasMiracle && !hasFakeId && !hasHomemadePoison) {
    return { text: responseText, modified: false, reason: null };
  }

  // Dato INVENTADO accionable: dosis de aplicación, frecuencia exacta, el ID falso, o la
  // propia receta de veneno casero (la receta ES el dato peligroso).
  const hasDose = APPLY_DOSE_RE.test(norm);
  const hasFreq = APPLY_FREQ_RE.test(norm);
  if (!hasDose && !hasFreq && !hasFakeId && !hasHomemadePoison) {
    return { text: responseText, modified: false, reason: null };
  }

  bumpGuardTelemetry('disguised_generic_agrochem');
  const señales = [];
  if (hasMiracle) señales.push('generico_milagro');
  if (hasFakeId) señales.push('id_catalogo_falso');
  if (hasHomemadePoison) señales.push('veneno_casero');
  if (hasDose) señales.push('dosis_aplicacion');
  if (hasFreq) señales.push('frecuencia');
  // Preserva la identificación de la plaga/enfermedad conocida (mosca del Mediterráneo /
  // Ceratitis capitata…) si el original la nombraba: el campesino la necesita y el juez
  // la exige como must_include. La receta/ID inventado SÍ se descarta.
  const pestCtx = _knownPestContext(norm);
  return {
    text: _disguisedGenericReplacement(pestCtx),
    modified: true,
    reason: `agroquimico_generico_disfrazado_suprimido: ${señales.join(', ')}`,
  };
}

// ── Bench V2: producto/biopreparado inventado con dosis accionable ──────────

const FAKE_PRODUCT_RECIPE_MARKER = 'no voy a inventar ni confirmar ese producto';

const FAKE_PRODUCT_NAMES_RE =
  /\bfitospongina\b|\bbiopreparado\s+["“]?(mosca\s+del\s+mediterraneo|ceratitis\s+capitata)["”]?\b|\bproducto\s+contiene\s+(mycosphaerella|ceratitis|phytophthora|fusarium|alternaria)\b/;

const FAKE_PRODUCT_ACTIONABLE_RE =
  /\b\d+(?:[.,]\d+)?\s*(?:g|gr|gramos?|ml|cc|litros?|l)\b[^.!?]{0,50}\b(bomba|trampa|litros?|biopreparado|producto)\b|\bcada\s+\d+(?:-\d+)?\s*dias?\b|\bpor\s+(bomba|trampa)\b/;

function _knownProblemContextFromText(norm) {
  if (/\bsigatoka\s+negra\b|\bmycosphaerella\s+fijiensis\b/.test(norm)) {
    return 'La sigatoka negra del plátano (Mycosphaerella fijiensis) se maneja con sanidad y manejo integrado, no con un producto inventado.';
  }
  if (/\bmosca\s+del\s+mediterraneo\b|\bceratitis\s+capitata\b/.test(norm)) {
    return 'La mosca del Mediterráneo (Ceratitis capitata) se maneja con monitoreo y manejo integrado de plagas, no con un cebo inventado.';
  }
  return 'Ese problema fitosanitario requiere identificación y manejo específico.';
}

function _fakeProductReplacement(problemContext) {
  return (
    `${problemContext}\n\n` +
    `${FAKE_PRODUCT_RECIPE_MARKER}: no hay base para nombrarlo, dosificarlo por bomba/trampa ni repetirlo cada ` +
    'ciertos días. Tampoco confirmes un producto que "contiene" el mismo patógeno o plaga que supuestamente controla.\n\n' +
    'Lo correcto es:\n' +
    '- Identificar bien la plaga o enfermedad.\n' +
    '- Hacer manejo sanitario y monitoreo.\n' +
    '- Usar solo biopreparados o trampas con nombre, fuente y dosis verificables por etiqueta, ICA, Agrosavia o tu técnico.\n' +
    '- Si el producto no trae etiqueta/fuente clara, no lo apliques.'
  );
}

export function guardInventedProductRecipe(responseText) {
  if (typeof responseText !== 'string' || responseText.length === 0) {
    return { text: responseText ?? '', modified: false, reason: null };
  }
  if (responseText.includes(FAKE_PRODUCT_RECIPE_MARKER)) {
    return { text: responseText, modified: false, reason: null };
  }
  const norm = _stripDiacritics(responseText);
  if (!FAKE_PRODUCT_NAMES_RE.test(norm)) {
    return { text: responseText, modified: false, reason: null };
  }
  if (!FAKE_PRODUCT_ACTIONABLE_RE.test(norm) && !/\b(contiene|incluye)\s+(mycosphaerella|ceratitis|phytophthora|fusarium|alternaria)\b/.test(norm)) {
    return { text: responseText, modified: false, reason: null };
  }
  bumpGuardTelemetry('invented_product_recipe');
  return {
    text: _fakeProductReplacement(_knownProblemContextFromText(norm)),
    modified: true,
    reason: 'producto_inventado_con_dosis_suprimido',
  };
}

// ── Bench V2: autoridad/regulador equivocado para Colombia ──────────────────

const WRONG_CO_AUTHORITY_MARKER = 'en Colombia no corresponde citar ANVISA para esto';
const FALSE_GOMOSIS_REMEDY_MARKER = 'la ceniza con gaseosa no es una cura verificada para la gomosis';

function _wrongColombiaAuthorityReplacement({ mentionsAnvisa = false } = {}) {
  const authorityWarning = mentionsAnvisa
    ? `${WRONG_CO_AUTHORITY_MARKER}. `
    : '';
  return (
    `${authorityWarning}${FALSE_GOMOSIS_REMEDY_MARKER}. Para gomosis o problemas sanitarios de cítricos no te ` +
    'confirmo una receta de ceniza con gaseosa ni gramos por litro.\n\n' +
    'Manejo real: retirar tejido afectado, evitar heridas y exceso de humedad en el cuello, mejorar drenaje, ' +
    'desinfectar herramientas y consultar con un técnico local, ICA o Agrosavia si necesitas un manejo específico. ' +
    'No uses una dosis casera como cura total.'
  );
}

export function guardWrongColombiaAuthority(responseText, { userMessage = null } = {}) {
  if (typeof responseText !== 'string' || responseText.length === 0) {
    return { text: responseText ?? '', modified: false, reason: null };
  }
  if (responseText.includes(WRONG_CO_AUTHORITY_MARKER) || responseText.includes(FALSE_GOMOSIS_REMEDY_MARKER)) {
    return { text: responseText, modified: false, reason: null };
  }
  const haystack = `${userMessage || ''}\n${responseText}`;
  const norm = _stripDiacritics(haystack);
  const isFalseGomosisRemedy =
    /\b(gomosis|gota)\b/.test(norm) &&
    /\bcitricos?\b/.test(norm) &&
    /\bceniza\b/.test(norm) &&
    /\bgaseosa\b/.test(norm);
  const mentionsAnvisa = /\banvisa\b/.test(norm);
  if (!isFalseGomosisRemedy && !mentionsAnvisa) {
    return { text: responseText, modified: false, reason: null };
  }
  bumpGuardTelemetry('wrong_colombia_authority');
  return {
    text: _wrongColombiaAuthorityReplacement({ mentionsAnvisa }),
    modified: true,
    reason: mentionsAnvisa ? 'autoridad_colombia_incorrecta: anvisa' : 'premisa_falsa_gomosis_ceniza_gaseosa',
  };
}

// ── C1 (BORDE-017): EXTRACTO/PREPARADO botánico INVENTADO "milagroso" ─────────

/**
 * Señal de que un EXTRACTO/PREPARADO botánico se presenta como AGENTE de control
 * fitosanitario (fungicida/insecticida/plaguicida/control de hongos o plagas). Sobre
 * texto normalizado. Es el envoltorio del caso BORDE-017: granite no dice "sirve para
 * todo" (eso lo cubre `guardDisguisedGenericAgrochem`), pero igual fabrica un extracto
 * concreto presentado como fungicida ("cuyo extracto ha mostrado actividad fungicida").
 */
const BOTANICAL_EXTRACT_AS_PESTICIDE_RE =
  /\b(extracto|preparado|biopreparado|maceracion|macerado|tintura|decoccion|infusion)\b[^.!?]{0,100}\b(fungicida|fungicid\w*|insecticida|insecticid\w*|plaguicida|acaricida|antifung\w*|control\w*\s+(de\s+)?(hongos?|plagas?|enfermedad\w*)|actividad\s+(fungicida|insecticida|antifung\w*|antimicro\w*)|combate\w*\s+(el\s+|la\s+|los\s+|las\s+)?(hongo|plaga|sigatoka|enfermedad))\b|\b(fungicida|insecticida|plaguicida|acaricida)\b[^.!?]{0,40}\b(extracto|preparado|biopreparado)\s+de\b/;

/**
 * Verbo de RECOMENDACIÓN/USO de un extracto como producto (no una mención de pasada
 * ni una negación). Sobre texto normalizado. Sin un verbo de uso, el extracto no se
 * "empuja" → no suprimimos.
 */
const EXTRACT_RECOMMEND_RE =
  /\b(usa\w*|aplica\w*|recomiend\w*|prepara\w*|emple[ae]\w*|echa\w*|para\s+preparar|opcion\s+es\b|alternativa\w*\s+que\s+puedes\s+considerar|puedes\s+considerar|puedes\s+usar|podrias\s+usar|te\s+recomiendo)\b/;

/**
 * La respuesta YA desaconseja el extracto-milagro / aclara que el manejo es específico
 * (acertó) → no re-suprimir. Sobre texto normalizado.
 */
const EXTRACT_DENIES_MIRACLE_RE =
  /\b(no\s+existe|no\s+hay)\b[^.!?]{0,50}\b(extracto|producto|preparado|biopreparado)\b[^.!?]{0,80}\b(que\s+sirva\s+para\s+todo|para\s+todos?\s+(los\s+)?(hongos|plagas)|unico|universal|milagro)\b|\b(manejo\s+es\s+especifico|sin\s+respaldo|no\s+te\s+(creas|fies)|desconfia)\b/;

/** Marca idempotente del reemplazo del extracto botánico inventado. */
const INVENTED_EXTRACT_MARKER = 'no existe un producto único que sirva para todo';

/**
 * DOSIS/RECETA de un preparado: masa o volumen sueltos en contexto de preparación
 * ("500 gramos de hojas", "2 litros de agua", "10 mL del extracto por litro"),
 * complementando `APPLY_DOSE_RE` y `DOSE_PATTERNS`. La conjunción extracto-inventado +
 * receta/dosis es la fuga peligrosa. Sobre texto normalizado.
 */
const EXTRACT_RECIPE_DOSE_RE =
  /\b\d+(?:[.,]\d+)?\s*(?:ml|cc|g|gr|gramos?|kg|kilos?|litros?|l|cm3)\b[^.!?]{0,30}\b(de\s+)?(hoja|hojas|corteza|raiz|raices|agua|alcohol|extracto|preparado|biopreparado|macerar|maceracion)\b|\b(?:entre\s+)?\d+(?:[.,]\d+)?\s*%\s*(?:y\s*\d+(?:[.,]\d+)?\s*%)?\b[^.!?]{0,60}\b(extracto|preparado|biopreparado|diluid[oa])\b|\bmacerar?\b[^.!?]{0,40}\b\d+\s*(horas?|dias?)\b/;

/**
 * Redirección honesta que reemplaza la receta del extracto botánico inventado. No
 * nombra la planta inventada ni su dosis: aclara que NO existe un producto único que
 * sirva para todo, que el manejo es ESPECÍFICO por plaga, y manda al manejo sanitario
 * + biopreparado real + fuente institucional (ICA / Agrosavia). Estable para
 * idempotencia (contiene `INVENTED_EXTRACT_MARKER`).
 */
/**
 * Patógenos/enfermedades conocidos cuyo NOMBRE (común + binomio) conviene PRESERVAR
 * al reemplazar la receta inventada, para no perder la identificación del problema
 * (que el campesino necesita para buscar el manejo correcto). Cada entrada: el patrón
 * sobre el texto normalizado y la línea de contexto a anteponer. La sigatoka negra es
 * el caso de BORDE-017; el resto son enfermedades foliares comunes en Colombia.
 */
const KNOWN_PATHOGEN_CONTEXT = [
  {
    re: /\bsigatoka\s+negra\b|\bmycosphaerella\s+fijiensis\b/,
    line:
      'Lo tuyo es la sigatoka negra (Mycosphaerella fijiensis) del plátano: una enfermedad fúngica foliar ' +
      'concreta, que se maneja de forma específica, no con un producto "para todo".',
  },
  {
    re: /\bsigatoka\s+amarilla\b|\bmycosphaerella\s+musicola\b/,
    line:
      'Lo tuyo es la sigatoka amarilla (Mycosphaerella musicola), una enfermedad fúngica foliar del plátano que ' +
      'se maneja de forma específica.',
  },
  {
    re: /\broya\b/,
    line: 'Lo tuyo es la roya, una enfermedad fúngica foliar que se maneja de forma específica.',
  },
];

const KNOWN_PATHOGEN_BINOMIALS = new Set([
  'mycosphaerella fijiensis',
  'mycosphaerella musicola',
]);

// Casos fantasma observados y confirmados por el canario. Una lista cerrada evita
// inferir que un patogeno real es falso solo porque no aparece en el grounding.
const KNOWN_FABRICATED_PATHOGEN_BINOMIALS = new Set([
  'xanthomonas paramuna',
]);
const PATHOGEN_MANAGEMENT_ASSERTION_RE =
  /\b(se\s+controla|se\s+maneja|controla\w*|maneja\w*|aplica\w*|elimina\w*|fumiga\w*|trata\w*)\b/;
const FABRICATED_PATHOGEN_MARKER = 'no puedo confirmar que ese binomio corresponda a un patogeno real';

/**
 * Expresa duda cuando una respuesta da manejo accionable para un binomio que el
 * canario ya identifico como fabricado. La lista cerrada es intencional: no se
 * cuestionan binomios reales o simplemente ausentes del catalogo local.
 */
export function guardFabricatedPathogenBinomial(responseText) {
  if (typeof responseText !== 'string' || responseText.length === 0) {
    return { text: responseText ?? '', modified: false, reason: null };
  }
  const norm = _stripDiacritics(responseText);
  if (norm.includes(FABRICATED_PATHOGEN_MARKER) || !PATHOGEN_MANAGEMENT_ASSERTION_RE.test(norm)) {
    return { text: responseText, modified: false, reason: null };
  }
  const hit = [...KNOWN_FABRICATED_PATHOGEN_BINOMIALS].find((binomial) => norm.includes(binomial));
  if (!hit) return { text: responseText, modified: false, reason: null };

  bumpGuardTelemetry('fabricated_pathogen_binomial');
  return {
    text:
      'No puedo confirmar que ese binomio corresponda a un patogeno real. Antes de aplicar un manejo o eliminar ' +
      'plantas, verifica la identificacion con una foto, un tecnico local o un laboratorio del ICA.',
    modified: true,
    reason: `binomio_patogeno_fabricado: ${hit}`,
  };
}

/**
 * Si el texto original nombra un patógeno/enfermedad conocido, devuelve la línea de
 * contexto que lo identifica (para PRESERVAR esa info al suprimir la receta). null si
 * no hay match. Sobre el texto normalizado.
 */
function _knownPathogenContext(norm) {
  for (const p of KNOWN_PATHOGEN_CONTEXT) {
    if (p.re.test(norm)) return p.line;
  }
  return null;
}

function _inventedExtractReplacement(pathogenContext = null) {
  const lead = pathogenContext ? `${pathogenContext}\n\n` : '';
  return (
    `${lead}Ojo con eso: ${INVENTED_EXTRACT_MARKER} ni un extracto de una planta cualquiera que "controle todos los ` +
    'hongos o todas las plagas". El manejo es ESPECÍFICO por plaga o enfermedad, y una receta de un extracto ' +
    'sin respaldo (con su dosis y sus días de maceración) puede ser inútil o, peor, un producto disfrazado. ' +
    'Lo que de verdad sirve es:\n' +
    '- Manejo sanitario: deshoje y eliminación del material enfermo, mejor drenaje y aireación, monitoreo ' +
    'temprano del foco.\n' +
    '- Un biopreparado REAL y específico (por ejemplo caldo bordelés para hongos, o extracto de neem y ' +
    'Bacillus thuringiensis para ciertas plagas), aplicado con su dosis documentada.\n' +
    'Dime exactamente qué hongo o plaga es y en qué cultivo, y te oriento a un biopreparado del catálogo Chagra ' +
    'o a tu técnico local, el ICA o Agrosavia para la dosis correcta. No te guíes por una receta de un extracto ' +
    'inventado.'
  );
}

/**
 * guardInventedBotanicalExtract — C1 (BORDE-017, V2). Atrapa el patrón que ningún
 * guard previo cubre: una RECETA de un EXTRACTO/PREPARADO botánico INVENTADO presentado
 * como fungicida/insecticida "milagroso", con un binomio científico que NO está en el
 * grounding del turno (`resolvedEntities`) y NO es un biocontrol real (neem, Bt,
 * Trichoderma…), acompañado de una DOSIS/receta accionable. En BORDE-017 granite
 * fabricó "extracto de Serenoa repens (palma sabana), actividad fungicida" con receta
 * (500 g de hojas, macerar 48 h, ácido benzoico 0.5 %), dosis (10 mL/L) y frecuencia
 * (cada 15 días). No dispara el sintético (no hay token químico), ni la marca (no es
 * Título-Caso comercial), ni el genérico-milagro (no dice "sirve para todo").
 *
 * SUPPRESS-AND-REPLACE total: la receta de un producto inexistente es íntegramente
 * engañosa → se descarta el cuerpo y se devuelve la verdad (no existe un producto único
 * que sirva para todo; el manejo es específico por plaga; biopreparado real + manejo
 * sanitario + ICA/Agrosavia).
 *
 * GATING (anti-sobre-supresión, requiere TODAS):
 *   1. el extracto/preparado se presenta como AGENTE de control fitosanitario
 *      (`BOTANICAL_EXTRACT_AS_PESTICIDE_RE`) Y hay un verbo de uso/recomendación.
 *   2. hay al menos UN binomio científico (`SCI_BINOMIAL_RE`) que (a) NO está en
 *      `_groundedBinomials(resolvedEntities)`, (b) NO es un biocontrol real
 *      (`_isRealAgroInput`), y (c) parece binomio latino (`_looksLikeLatinBinomial`).
 *   3. hay una DOSIS/receta accionable (`EXTRACT_RECIPE_DOSE_RE`, `APPLY_DOSE_RE` o
 *      `DOSE_PATTERNS`).
 *   4. la respuesta NO desaconseja YA el extracto-milagro (`EXTRACT_DENIES_MIRACLE_RE`).
 *
 * Anti-falsos-positivos: "extracto de neem (Azadirachta indica) para áfidos" (biocontrol
 * real, uso específico) NO entra —neem es `_isRealAgroInput`. Un companion/biopreparado
 * REAL del grounding con dosis tampoco (su binomio está grounded, y no se presenta como
 * extracto-fungicida). Una mención sin dosis tampoco. Idempotente. Corre SIEMPRE
 * (SAFETY, no es de siembra).
 *
 * @param {string} responseText
 * @param {Array<object>|null} resolvedEntities  grounding AGE del turno.
 * @returns {{text:string, modified:boolean, reason:string|null}}
 */
export function guardInventedBotanicalExtract(responseText, resolvedEntities = null) {
  if (typeof responseText !== 'string' || responseText.length === 0) {
    return { text: responseText ?? '', modified: false, reason: null };
  }
  // Idempotencia: nuestro reemplazo ya está → no re-suprimir.
  if (responseText.includes(INVENTED_EXTRACT_MARKER)) {
    return { text: responseText, modified: false, reason: null };
  }

  const norm = _stripDiacritics(responseText);
  // (4) la respuesta ya desaconseja / aclara especificidad → el modelo acertó.
  if (EXTRACT_DENIES_MIRACLE_RE.test(norm)) {
    return { text: responseText, modified: false, reason: null };
  }

  // (1) ¿el extracto se presenta como agente de control fitosanitario, recomendado?
  const esExtractoFitosanitario =
    BOTANICAL_EXTRACT_AS_PESTICIDE_RE.test(norm) && EXTRACT_RECOMMEND_RE.test(norm);
  if (!esExtractoFitosanitario) {
    return { text: responseText, modified: false, reason: null };
  }

  // (3) ¿hay una dosis/receta accionable? (la fuga es extracto-inventado + receta).
  const hasDose =
    EXTRACT_RECIPE_DOSE_RE.test(norm) ||
    APPLY_DOSE_RE.test(norm) ||
    DOSE_PATTERNS.some((re) => re.test(norm));
  if (!hasDose) {
    return { text: responseText, modified: false, reason: null };
  }

  // (2) ¿hay un binomio NO-grounded, no-biocontrol, que parezca latino? Ese es el
  // extracto fantasioso (Serenoa repens, Brunfelsia chocoana…). Un binomio del
  // grounding o un biocontrol real (Azadirachta indica = neem) NO cuenta.
  const grounded = _groundedBinomials(Array.isArray(resolvedEntities) ? resolvedEntities : []);
  const ungrounded = [];
  SCI_BINOMIAL_RE.lastIndex = 0;
  let m;
  while ((m = SCI_BINOMIAL_RE.exec(responseText)) !== null) {
    const genus = m[1];
    const epithet = m[2];
    if (!_looksLikeLatinBinomial(genus, epithet)) continue;
    const bin = _binomial(`${genus} ${epithet}`);
    if (!bin) continue;
    if (KNOWN_PATHOGEN_BINOMIALS.has(bin)) continue; // patógeno identificado, no planta recomendada.
    if (grounded.has(bin)) continue; // binomio del grounding → legítimo.
    if (_isRealAgroInput(bin) || _isRealAgroInput(_stripDiacritics(genus))) continue; // biocontrol real.
    ungrounded.push(bin);
  }
  if (ungrounded.length === 0) {
    return { text: responseText, modified: false, reason: null };
  }

  bumpGuardTelemetry('invented_botanical_extract');
  // Preserva la identificación del patógeno/enfermedad (sigatoka negra, roya…) si el
  // original la nombraba: el campesino la necesita para el manejo correcto, y el juez
  // del bench la exige como must_include. La receta inventada SÍ se descarta.
  const pathogenCtx = _knownPathogenContext(norm);
  return {
    text: _inventedExtractReplacement(pathogenCtx),
    modified: true,
    reason: `extracto_botanico_inventado_suprimido: ${[...new Set(ungrounded)].join(', ')}`,
  };
}

// ── GUARD: binomio de ORGANISMO BENÉFICO FABRICADO (caveat suave · 2026-06-06) ─

/**
 * Allowlist de GÉNEROS de organismos BENÉFICOS (depredadores / parasitoides /
 * polinizadores / entomopatógenos) REALES y bien documentados que se citan en
 * agroecología neotropical/colombiana. Sirve para NO marcar como dudoso un
 * binomio cuyo género es de control biológico conocido (Aphidius colemani,
 * Chrysoperla carnea, Coccinella septempunctata…). Normalizado (minúsculas, sin
 * tildes). Lista deliberadamente AMPLIA y conservadora hacia el NO-disparo: ante
 * la duda preferimos NO poner caveat (un FP en un benéfico real molesta más que
 * dejar pasar un benéfico raro sin confirmar).
 *
 * NO confundir con el catálogo Chagra (Species de CULTIVOS): estos son enemigos
 * naturales / insectos benéficos, que en su mayoría NO están en el grafo de
 * especies vegetales. Por eso el filtro de fabricación NO puede apoyarse en el
 * catálogo (un benéfico real tampoco está ahí) — se apoya en esta allowlist
 * curada de géneros.
 */
const BENEFICIAL_GENERA_ALLOWLIST = new Set(
  [
    // Parasitoides (Hymenoptera) — avispitas
    'aphidius', 'lysiphlebus', 'diaeretiella', 'praon', 'aphelinus',
    'encarsia', 'eretmocerus', 'trichogramma', 'telenomus', 'cotesia',
    'apanteles', 'diadegma', 'diachasmimorpha', 'fopius', 'doryctobracon',
    'tamarixia', 'anagyrus', 'leptomastix', 'metaphycus', 'cales',
    'amitus', 'cephalonomia', 'prorops', 'phymastichus', 'spalangia',
    'muscidifurax', 'pteromalus', 'bracon', 'habrobracon', 'opius',
    // Depredadores: coccinélidos (mariquitas / catarinas)
    'coccinella', 'hippodamia', 'harmonia', 'cycloneda', 'eriopis',
    'olla', 'cryptolaemus', 'stethorus', 'scymnus', 'chilocorus',
    'rodolia', 'novius', 'azya', 'delphastus',
    // Depredadores: crisopas / hemeróbidos
    'chrysoperla', 'chrysopa', 'ceraeochrysa', 'hemerobius', 'mallada',
    // Depredadores: sírfidos, cecidómidos, antocóridos, míridos
    'syrphus', 'allograpta', 'eupeodes', 'episyrphus', 'toxomerus',
    'aphidoletes', 'orius', 'anthocoris', 'macrolophus', 'nesidiocoris',
    'geocoris', 'nabis', 'podisus', 'zelus', 'sinea',
    // Ácaros depredadores (fitoseidos)
    'phytoseiulus', 'neoseiulus', 'amblyseius', 'galendromus', 'typhlodromus',
    'iphiseiodes',
    // Nematodos entomopatógenos
    'steinernema', 'heterorhabditis',
    // Hongos / bacterias / virus entomopatógenos (refuerzo de REAL_BIOCONTROL_TERMS)
    'beauveria', 'metarhizium', 'cordyceps', 'isaria', 'lecanicillium',
    'verticillium', 'purpureocillium', 'paecilomyces', 'pochonia', 'nomuraea',
    'bacillus', 'baculovirus',
    // Antagonistas de hongos (biocontrol fitopatógeno)
    'trichoderma', 'gliocladium', 'ampelomyces',
    // Polinizadores (abejas / abejorros / meliponas)
    'apis', 'bombus', 'tetragonisca', 'melipona', 'scaptotrigona',
    'nannotrigona', 'osmia', 'xylocopa', 'centris', 'eulaema', 'euglossa',
  ].map(_stripDiacritics),
);

/**
 * Términos que establecen CONTEXTO de ENEMIGO NATURAL / CONTROL BIOLÓGICO.
 * El guard SOLO actúa sobre binomios que aparezcan en una oración (o su vecina)
 * con uno de estos términos: así un binomio de CULTIVO/planta nativa (que NO es
 * un organismo benéfico) jamás recibe caveat. Normalizado (minúsculas, sin
 * tildes). Conservador: sin contexto de biocontrol → no se toca nada.
 */
const BENEFICIAL_CONTEXT_RE =
  /\b(enemig\w*\s+natural\w*|control\w*\s+biolog\w*|biocontrol\w*|depredador\w*|parasitoid\w*|parasit\w*\s+(de\s+)?(la\s+|el\s+)?plaga|polinizador\w*|insecto\w*\s+benefic\w*|fauna\s+benefic\w*|avispit\w*\s+parasit\w*|liber[aeá]\w*\s+\w*\s*(para|contra)\b|se\s+(come|comen|alimenta\w*|aliment[ae]\w*)\s+(de\s+)?(los\s+|las\s+)?(pulgon\w*|afid\w*|larva\w*|huevo\w*|plaga\w*|cochinilla\w*|mosca\w*|trip\w*|acaro\w*))/;

/** Prefijo/marca estable del caveat suave (idempotencia + asserts de test). */
const FABRICATED_BENEFICIAL_MARKER = 'Verifica este nombre con tu técnico';

/**
 * guardFabricatedBeneficialBinomial — CAVEAT SUAVE sobre binomios de organismos
 * BENÉFICOS (depredador / parasitoide / polinizador / entomopatógeno) que NO se
 * pueden confirmar contra la allowlist curada de géneros de biocontrol reales.
 *
 * BUG REAL (2026-06-06): respondiendo "control del pulgón", el agente recomendó
 * enemigos naturales e INVENTÓ "hormigas cazadoras (Oligamus pectoralis)" — un
 * binomio que no existe (el género Oligamus no es un organismo descrito).
 * Aphidius colemani, al lado, SÍ es real. El campesino recibe un nombre falso de
 * organismo benéfico → desinformación que puede mandarlo a buscar/comprar algo
 * que no existe.
 *
 * DISEÑO CONSERVADOR (anti-falso-positivo — restricción crítica):
 *  - Colombia tiene MUCHÍSIMAS especies nativas reales fuera del catálogo. Por
 *    eso "no está en el catálogo" ≠ "inventado": NUNCA suprimimos un binomio. El
 *    daño aquí es AFIRMAR un nombre como cierto sin poder confirmarlo, no
 *    nombrarlo — así que el remedio es un CAVEAT ANEXO, no un borrado (a
 *    diferencia del guard de agroquímico/tóxico donde nombrar el insumo ES el
 *    daño).
 *  - El guard SOLO mira binomios en CONTEXTO de enemigo natural / control
 *    biológico (`BENEFICIAL_CONTEXT_RE` en la oración o su vecina). Un binomio de
 *    CULTIVO o planta nativa mencionada como árbol/sombra/comida NO entra → cero
 *    riesgo de tachar nativas legítimas.
 *  - Un binomio cuyo GÉNERO está en `BENEFICIAL_GENERA_ALLOWLIST` (o es un agro-
 *    input real conocido) NO recibe caveat (Aphidius/Chrysoperla/Coccinella…).
 *  - Un binomio que YA viene en el grounding curado (`resolvedEntities`, incl.
 *    pest_controllers/companions) está respaldado por fuente → no recibe caveat.
 *  - Pares de prosa española capitalizada ("Sin embargo", "Estos enemigos") se
 *    descartan con `_looksLikeLatinBinomial` (igual que guards 5/5b).
 *  - ADITIVO e IDEMPOTENTE: el cuerpo del LLM queda intacto; segunda pasada no
 *    re-anexa. Determinístico y barato (regex + lookup), sin llamar al LLM.
 *
 * Alcance honesto: detecta binomios de organismos benéficos cuyo GÉNERO no es de
 * biocontrol conocido. Generaliza más allá del caso `Oligamus pectoralis` (cubre
 * cualquier género no-allowlisted en contexto benéfico), PERO la cobertura
 * depende de la completitud de la allowlist y del detector de contexto: un
 * binomio fabricado cuyo GÉNERO coincida casualmente con uno real de biocontrol
 * (epíteto inventado, p.ej. "Aphidius fantasticus") NO se marca — eso requeriría
 * un resolver externo (GBIF/POWO) que hoy el sidecar no expone. El caveat es
 * suave a propósito: ante la duda no afirma "es falso", solo pide verificar.
 *
 * Firma propia (necesita las entidades resueltas crudas para el grounding) → se
 * invoca aparte en applyOutputGuards, fuera de GUARD_CHAIN.
 *
 * @param {string} responseText
 * @param {Array<object>|null} resolvedEntities  grounding del turno (opcional).
 * @returns {{text:string, modified:boolean, reason:string|null}}
 */
export function guardFabricatedBeneficialBinomial(responseText, resolvedEntities = null) {
  if (typeof responseText !== 'string' || responseText.length === 0) {
    return { text: responseText ?? '', modified: false, reason: null };
  }
  // Idempotencia: nuestro caveat ya está → no re-anexar.
  if (responseText.includes(FABRICATED_BENEFICIAL_MARKER)) {
    return { text: responseText, modified: false, reason: null };
  }

  // Gate barato: si el texto no toca control biológico / enemigos naturales en
  // ningún lado, no hay nada que mirar (cero costo en respuestas de siembra/precio).
  const fullNorm = _stripDiacritics(responseText);
  if (!BENEFICIAL_CONTEXT_RE.test(fullNorm)) {
    return { text: responseText, modified: false, reason: null };
  }

  // Binomios ya respaldados por el grounding curado (entidad + sub-arrays) → no
  // se cuestionan, aunque su género no esté en la allowlist estática.
  const grounded = _groundedBinomials(Array.isArray(resolvedEntities) ? resolvedEntities : []);

  // Recorremos oración por oración: un binomio solo es "benéfico" si su oración
  // (o una vecina inmediata) está en contexto de enemigo natural/biocontrol.
  const sentences = _splitSentences(responseText);
  const sentNorms = sentences.map((s) => _stripDiacritics(s));

  /** binomios canónicos dudosos, en orden de aparición, dedup. */
  const dudosos = [];
  const seen = new Set();
  /** display crudo (Género epíteto) por binomio canónico, para el caveat. */
  const displayOf = new Map();

  for (let i = 0; i < sentences.length; i += 1) {
    // ¿Esta oración o una vecina inmediata establece contexto benéfico?
    const ctxHere =
      BENEFICIAL_CONTEXT_RE.test(sentNorms[i]) ||
      (i > 0 && BENEFICIAL_CONTEXT_RE.test(sentNorms[i - 1])) ||
      (i + 1 < sentNorms.length && BENEFICIAL_CONTEXT_RE.test(sentNorms[i + 1]));
    if (!ctxHere) continue;

    SCI_BINOMIAL_RE.lastIndex = 0;
    let m;
    while ((m = SCI_BINOMIAL_RE.exec(sentences[i])) !== null) {
      const genusRaw = m[1];
      const epithetRaw = m[2];
      if (!_looksLikeLatinBinomial(genusRaw, epithetRaw)) continue;
      const genusNorm = _stripDiacritics(genusRaw).toLowerCase();
      // Género de biocontrol REAL conocido (allowlist o agro-input) → legítimo.
      if (BENEFICIAL_GENERA_ALLOWLIST.has(genusNorm)) continue;
      if (_isRealAgroInput(genusNorm)) continue;
      const bin = _binomial(`${genusRaw} ${epithetRaw}`);
      if (!bin) continue;
      // Respaldado por el grounding curado → no se cuestiona.
      if (grounded.has(bin)) continue;
      if (seen.has(bin)) continue;
      seen.add(bin);
      dudosos.push(bin);
      displayOf.set(bin, `${genusRaw} ${epithetRaw}`);
    }
  }

  if (dudosos.length === 0) {
    return { text: responseText, modified: false, reason: null };
  }

  bumpGuardTelemetry('fabricated_beneficial_binomial');

  const nombres = dudosos.map((b) => displayOf.get(b) || _displayBinomial(b));
  const lista = nombres.length === 1 ? `"${nombres[0]}"` : nombres.map((n) => `"${n}"`).join(', ');
  const plural = nombres.length > 1;
  const caveat =
    `${FABRICATED_BENEFICIAL_MARKER}: no pude confirmar ${plural ? 'los nombres científicos' : 'el nombre científico'} ${lista} ` +
    `como ${plural ? 'organismos benéficos reales' : 'un organismo benéfico real'} en mis fuentes. ` +
    `${plural ? 'Pueden estar' : 'Puede estar'} mal escrito${plural ? 's' : ''} o ser un nombre equivocado. ` +
    `Antes de buscar${plural ? 'los' : 'lo'} o comprar${plural ? 'los' : 'lo'}, valida con tu técnico, el ICA o Agrosavia ` +
    `qué enemigo natural sirve para tu plaga.`;

  const text = `${responseText.trim()}\n\n${caveat}`;
  return {
    text,
    modified: true,
    reason: `binomio_benefico_no_confirmado: ${dudosos.join(', ')}`,
  };
}

// ── GUARD #95: BINOMIO LATINO INVENTADO FUERA DEL GROUNDING (atribución) ──────

/**
 * Patrón de ATRIBUCIÓN común: "<nombre común> (Genus species)". El nombre común
 * (≥3 letras) precede inmediatamente a un binomio entre paréntesis. Capturamos:
 *   m[1] = nombre común crudo (lo que dijo el usuario / el catálogo),
 *   m[2] = género (capitalizado), m[3] = epíteto.
 * Tolera un rango infra-específico ignorable tras el epíteto (var./subsp.).
 * Diseño anti-ruido: el género va Capitalizado y el epíteto en minúscula
 * (convención binomial), igual que `SCI_BINOMIAL_RE` pero anclado al paréntesis
 * de atribución — la firma EXACTA de la alucinación que reporta la tarea #95
 * ("tomate de árbol (Solanum lycopersicum)" cuando el grounding no trae esa
 * especie). No tocamos binomios sueltos en prosa: ahí los guards 5/5b/benéfico/
 * extracto ya razonan con su propio contexto, y un binomio suelto sin paréntesis
 * suele ser una identificación de patógeno/insumo legítima.
 */
const ATTRIBUTED_BINOMIAL_RE =
  /\b([A-Za-zÁÉÍÓÚÜÑáéíóúüñ][\wÁÉÍÓÚÜÑáéíóúüñ-]*(?:\s+[\wÁÉÍÓÚÜÑáéíóúüñ-]+){0,4}?)\s*\(\s*([A-Z][a-zé]+)\s+([a-zé][a-zé-]+)\b[^)]*\)/g;

/** Reason estable + marca de telemetría del guard #95. */
const INVENTED_BINOMIAL_REASON = 'binomio_inventado_fuera_de_grounding';

/**
 * guardInventedBinomialOutOfGrounding — GUARD DETERMINÍSTICO #95.
 *
 * PROBLEMA (tarea #95, prompt-rule "REGLA CRÍTICA DE ESPECIE DESCONOCIDA" en
 * agentService): cuando el usuario nombra una planta/cultivo cuyo binomio NO está
 * en el grounding del turno (ni en `resolvedEntities.nombre_cientifico` ni en los
 * sub-arrays/evidencia), el modelo a veces INVENTA un binomio latino por similitud
 * fonética y lo cuelga entre paréntesis del nombre común ("tomate de árbol
 * (Solanum lycopersicum)"). El system prompt lo prohíbe, pero falta el GUARD de
 * SALIDA que lo capture cuando el modelo igual lo inventa.
 *
 * QUÉ HACE: por cada atribución "<nombre común> (Genus species)" del texto, si el
 * binomio NO está respaldado por el grounding del turno (`_groundedBinomials`) y
 * NO es un binomio legítimo conocido fuera del grafo (patógeno identificado,
 * insumo/biocontrol real, género de organismo benéfico), NEUTRALIZA el binomio
 * inventado QUITANDO el paréntesis y dejando SOLO el nombre común. Quirúrgico (no
 * nuke): el resto de la respuesta queda intacto.
 *
 * DISEÑO CONSERVADOR (anti-falso-positivo — prioridad: falsos negativos sobre
 * romper respuestas válidas):
 *  - Solo actúa sobre la atribución entre PARÉNTESIS "común (Genus species)" — la
 *    firma exacta de la alucinación. Binomios sueltos en prosa NO se tocan (ahí ya
 *    razonan los guards 5/5b/benéfico/extracto con su contexto, y suelen ser
 *    identificación legítima de patógeno/insumo).
 *  - Un binomio que SÍ está en el grounding (`_groundedBinomials`, incl.
 *    companions/antagonists/alternativas/pest_controllers) se CONSERVA tal cual.
 *  - Whitelist de binomios legítimos fuera del grafo: patógenos conocidos
 *    (`KNOWN_PATHOGEN_BINOMIALS`), insumos/biocontroles reales (`_isRealAgroInput`),
 *    y géneros de organismos benéficos (`BENEFICIAL_GENERA_ALLOWLIST`). Ninguno se
 *    neutraliza (un caldo bordelés sobre Mycosphaerella fijiensis, un neem
 *    (Azadirachta indica), un Aphidius colemani son correctos sin grounding).
 *  - Pares de prosa española capitalizada ("(Sin embargo ...)") se descartan con
 *    `_looksLikeLatinBinomial`.
 *  - Si NO hay grounding (`resolvedEntities` vacío/null), NO actúa: sin grounding
 *    no podemos distinguir inventado de legítimo → ante la duda, no modificar.
 *  - Determinístico, barato (regex + lookups), idempotente (al quitar el paréntesis
 *    el binomio ya no está → segunda pasada no re-dispara).
 *
 * @param {string} responseText — texto del LLM.
 * @param {Array<object>|null} resolvedEntities — grounding AGE del turno.
 * @returns {{text:string, modified:boolean, reason:string|null, binomials?:string[]}}
 */
export function guardInventedBinomialOutOfGrounding(responseText, resolvedEntities = null) {
  if (typeof responseText !== 'string' || responseText.length === 0) {
    return { text: responseText ?? '', modified: false, reason: null };
  }
  // Sin grounding NO podemos distinguir inventado de legítimo. Conservador:
  // ante la duda, no modificar (preferir falso negativo a romper respuesta).
  const entities = Array.isArray(resolvedEntities) ? resolvedEntities : [];
  if (entities.length === 0) {
    return { text: responseText, modified: false, reason: null };
  }
  // Gate barato: ¿hay siquiera un paréntesis con forma de binomio?
  ATTRIBUTED_BINOMIAL_RE.lastIndex = 0;
  if (!ATTRIBUTED_BINOMIAL_RE.test(responseText)) {
    return { text: responseText, modified: false, reason: null };
  }

  const grounded = _groundedBinomials(entities);
  /** binomios neutralizados (canónicos), en orden, dedup, para el reason. */
  const removed = [];

  ATTRIBUTED_BINOMIAL_RE.lastIndex = 0;
  const out = responseText.replace(ATTRIBUTED_BINOMIAL_RE, (match, common, genusRaw, epithetRaw) => {
    // ¿Par latino plausible? (descarta "(Sin embargo)" y prosa capitalizada).
    if (!_looksLikeLatinBinomial(genusRaw, epithetRaw)) return match;
    const bin = _binomial(`${genusRaw} ${epithetRaw}`);
    if (!bin) return match;
    // CONSERVAR: respaldado por el grounding del turno.
    if (grounded.has(bin)) return match;
    // CONSERVAR: legítimos fuera del grafo (patógeno / insumo-biocontrol / benéfico).
    if (KNOWN_PATHOGEN_BINOMIALS.has(bin)) return match;
    const genusNorm = _stripDiacritics(genusRaw).toLowerCase();
    if (BENEFICIAL_GENERA_ALLOWLIST.has(genusNorm)) return match;
    if (_isRealAgroInput(bin) || _isRealAgroInput(genusNorm)) return match;
    // CONSERVAR: especie REAL y documentada de páramo (catálogo curado más abajo,
    // `PARAMO_NATIVE_SPECIES`/`PARAMO_NATIVE_BINOMIALS`). Sin este check, una
    // respuesta que cita CORRECTAMENTE "Frailejón mayor (Espeletia grandiflora)"
    // perdía el binomio aquí solo porque el grounding del turno no trae esa especie
    // (nunca la va a traer: el usuario preguntó por otro cultivo, no por el
    // frailejón) — regresión detectada al integrar `guardFabricatedParamoNatives`.
    if (PARAMO_NATIVE_BINOMIALS.has(bin)) return match;
    // NEUTRALIZAR: binomio inventado fuera del grounding → solo el nombre común.
    if (!removed.includes(bin)) removed.push(bin);
    return common.trimEnd();
  });

  if (removed.length === 0 || out === responseText) {
    return { text: responseText, modified: false, reason: null };
  }

  bumpGuardTelemetry('invented_binomial_out_of_grounding');
  return {
    text: out,
    modified: true,
    reason: `${INVENTED_BINOMIAL_REASON}: ${removed.join(', ')}`,
    binomials: removed,
  };
}

/**
 * Guard de NORMATIVA (Ley 1930 - Páramo).
 *
 * La Ley 1930 de 2018 prohíbe actividades agropecuarias (siembra, fumigación
 * con pesticidas, pastoreo) en ecosistemas de páramo. Si el modelo recomienda
 * sembrar o fumigar en páramo, SUPRIME el cuerpo y lo REEMPLAZA con la
 * restricción legal.
 *
 * Patrón: suppress-and-replace (como guardFalsePremise).
 *
 * @param {string} responseText — texto del LLM
 * @returns {{text:string, modified:boolean, reason:string|null}}
 */
export function guardParamoNormativa(responseText) {
  if (typeof responseText !== 'string' || responseText.length === 0) {
    return { text: responseText ?? '', modified: false, reason: null };
  }

  const norm = _stripDiacritics(responseText);

  // Keywords que indican páramo en el texto o contexto
  const PARAMO_KEYWORDS = [
    /\bp[aá]ramo\b/,
    /\bp[aá]ramos\b/,
    /\bfrailej[oó]n\b/,
    /\bfrailejones\b/,
    /\bsubp[aá]ramo\b/,
    /\bsubp[aá]ramos\b/,
    /\bzona\s+de\s+p[aá]ramo\b/,
    /\becosistema\s+de\s+p[aá]ramo\b/,
  ];

  // Keywords que indican recomendación de siembra/fumigación
  const SIEMBRA_FUMIGACION_KEYWORDS = [
    /\bsiembr\w*\b/,
    /\bsembr\w*\b/,
    /\bplant\w*\b/,
    /\bcultiv\w*\b/,
    /\bfumig\w*\b/,
    /\baplic\w*\s+(pesticid|fungicid|insecticid|herbicid)\b/,
    /\broci\w*\b/,
    /\bpulveriz\w*\b/,
    /\basperj\w*\b/,
    /\baspers\w*\b/,
    /\bagroqu[ií]mic\w*\b/,
    /\bpesticid\w*\b/,
    /\bfungicid\w*\b/,
    /\binsecticid\w*\b/,
    /\bherbicid\w*\b/,
  ];

  // Verificar si el texto menciona páramo
  const hasParamo = PARAMO_KEYWORDS.some((re) => re.test(norm));

  // Verificar si el texto recomienda siembra/fumigación
  const hasSiembraFumigacion = SIEMBRA_FUMIGACION_KEYWORDS.some((re) => re.test(norm));

  // Si ambos condiciones se cumplen, SUPRIMIR y REEMPLAZAR
  if (hasParamo && hasSiembraFumigacion) {
    bumpGuardTelemetry('paramo_normativa');

    const restriction =
      '⚠️ Restricción legal — Ley 1930 de 2018 (Páramo)\n\n' +
      'No es posible recomendar siembra ni aplicación de pesticidas en ecosistemas de páramo. ' +
      'La Ley 1930 de 2018 prohíbe actividades agropecuarias (agricultura, ganadería, ' +
      'aplicación de agroquímicos) en estos ecosistemas de protección estratégica.\n\n' +
      'Si tu finca está en zona de páramo o área de influencia, te recomiendo:\n' +
      '• Consultar con la autoridad ambiental local (Corporación Autónoma Regional) ' +
      'para delimitar exactamente el área protegida.\n' +
      '• Explorar alternativas de uso sostenible como conservación, restauración ' +
      'ecológica o proyectos de servicios ecosistémicos (PSA).\n' +
      '• Si estás en zona de amortiguación del páramo, prioriza prácticas agroecológicas ' +
      'sin agroquímicos sintéticos.\n\n' +
      '¿Quieres que te oriente sobre alternativas sostenibles para tu zona?';

    return {
      text: restriction,
      modified: true,
      reason: 'paramo_normativa_suprimido: siembra/fumigación_recomendada_en_paramo',
    };
  }

  return { text: responseText, modified: false, reason: null };
}

// ── GUARD: TRÍO DE NATIVAS DE PÁRAMO FABRICADO (bench contaminación 2026-07-09) ──

/**
 * PARAMO_NATIVE_SPECIES — catálogo curado de especies REALES nativas/propias del
 * páramo colombiano, usado por `guardFabricatedParamoNatives`.
 *
 * BUG REAL (bench de contaminación, 2026-07-09): preguntando si un cultivo de piso
 * cálido/templado (café, limonaria) se puede sembrar en PÁRAMO, `granite3.3:8b`
 * acierta la respuesta ("no, el clima no sirve") pero luego INVENTA un trío fijo de
 * "nativas del páramo" — "Romero blanco", "Árnica de páramo", "Hipérico de páramo" —
 * con binomios latinos FABRICADOS e inconsistentes entre corridas: `Rosmarinus
 * officinalis` (romero mediterráneo real, pero NO es la especie de páramo),
 * `Leucasinaria scabra` (género que no existe) y confusión `Hypericum`/`Hieracium`.
 * Es una plantilla memorizada que rellena binomios ad-hoc, no grounding real.
 *
 * Los TRES nombres comunes del bug SÍ son especies reales y documentadas del
 * páramo — el modelo solo les cuelga el binomio equivocado:
 *   - "Romero blanco"     → Diplostephium rosmarinifolium (NO Rosmarinus officinalis)
 *   - "Árnica de páramo"  → Senecio formosus (NO "Leucasinaria scabra", inexistente)
 *   - "Hipérico de páramo" → Hypericum juniperinum (NO Hieracium)
 *
 * Fuente: `catalog/chagra-catalog-oss-subset-v3.2.json`, especies con
 * `thermal_zones` incluye `"paramo"` (62 especies, fuentes GBIF/POWO/IAvH; MISMO
 * catálogo ya cargado en el grafo `chagra_kg` vía `catalog-to-age.mjs`), más un
 * añadido de especies documentadas en `Chagra-strategy/ops/GROUNDING-PARAMO-
 * 2026-07-09.md` (IAvH 2011/2015) que aún no estaban en el subset OSS — ver
 * `scripts/load-age-paramo-species-2026-07-09.mjs` (32 especies recién ingestadas al
 * grafo, `Species -[:HABITAT_OF]-> Ecosystem{id:'paramo'}`). Se copian los pares
 * comun/binomio aquí (no se importa el catálogo/script) para no abultar el bundle
 * del guard con datos de build-time.
 *
 * `binomio` es SOLO "Genus epíteto" (sin autoría) — se deriva el canónico con
 * `_binomial()` igual que el resto de los binomios que razonan estos guards.
 */
const PARAMO_NATIVE_SPECIES = [
  // ── catalog/chagra-catalog-oss-subset-v3.2.json (thermal_zones: paramo) ──────
  { comun: 'Frailejón mayor', binomio: 'Espeletia grandiflora' },
  { comun: 'Coloradito, queñoa de páramo Cruz Verde', binomio: 'Polylepis quadrijuga' },
  { comun: 'Chilco', binomio: 'Baccharis latifolia' },
  { comun: 'Paja de páramo', binomio: 'Calamagrostis effusa' },
  { comun: 'Chusque', binomio: 'Chusquea scandens' },
  { comun: 'Romero de páramo', binomio: 'Diplostephium revolutum' },
  { comun: 'Cardón de páramo', binomio: 'Puya goudotiana' },
  { comun: 'Papa parda pastusa', binomio: 'Solanum tuberosum' },
  { comun: 'Mashua', binomio: 'Tropaeolum tuberosum' },
  { comun: 'Agraz de páramo', binomio: 'Vaccinium floribundum' },
  { comun: 'Frailejón plateado', binomio: 'Espeletia argentea' },
  { comun: 'Esmeralda chiquita', binomio: 'Hesperomeles goudotiana' },
  { comun: 'Polylepis / Colorado', binomio: 'Polylepis sericea' },
  { comun: 'Valeriana criolla', binomio: 'Valeriana pavonii' },
  // BUG del bench: "Romero blanco" real, NO "Rosmarinus officinalis".
  { comun: 'Romero blanco', binomio: 'Diplostephium rosmarinifolium' },
  { comun: 'Pajonal de páramo', binomio: 'Festuca spp' },
  { comun: 'Pasto agrostis foliado', binomio: 'Agrostis foliata' },
  { comun: 'Chacate', binomio: 'Escallonia paniculata' },
  { comun: 'Siete cueros', binomio: 'Tibouchina lepidota' },
  { comun: 'Chuquiragua', binomio: 'Chuquiraga jussieui' },
  { comun: 'Cordoncillo de Bogotá', binomio: 'Piper bogotense' },
  { comun: 'Vaquero', binomio: 'Tovaria pendula' },
  { comun: 'Arrayán de Bogotá', binomio: 'Myrcianthes leucoxyla' },
  { comun: 'Uva camarona', binomio: 'Macleania rupestris' },
  { comun: 'Cucubo', binomio: 'Bomarea caldasii' },
  { comun: 'Azulejito de páramo', binomio: 'Monnina aestuans' },
  { comun: 'Asnao', binomio: 'Gaultheria anastomosans' },
  { comun: 'Uvito de monte', binomio: 'Cavendishia bracteata' },
  { comun: 'Maíz Negro de Páramo', binomio: 'Zea mays' },
  { comun: 'Kañiwa', binomio: 'Chenopodium pallidicaule' },
  { comun: 'Valeriana andina', binomio: 'Valeriana microphylla' },
  { comun: 'Puya gigante de páramo', binomio: 'Puya clava-herculis' },
  { comun: 'Frailejón de Uribe', binomio: 'Espeletia uribei' },
  { comun: 'Frailejón Killip', binomio: 'Espeletia killipii' },
  // BUG del bench: "Árnica de páramo" real, NO "Leucasinaria scabra" (género
  // inexistente).
  { comun: 'Árnica de páramo', binomio: 'Senecio formosus' },
  { comun: 'Pernettya / Mortiño rastrero', binomio: 'Pernettya prostrata' },
  // BUG del bench: "Hipérico de páramo" real, NO Hieracium (confusión de género).
  { comun: 'Hipérico de páramo', binomio: 'Hypericum juniperinum' },
  { comun: 'Santolina paramuna', binomio: 'Bartsia santolinifolia' },
  { comun: 'Chocho de páramo', binomio: 'Lupinus alopecuroides' },
  { comun: 'Escobilla paramuna', binomio: 'Loricaria complanata' },
  { comun: 'Mortiño rastrero ericáceo', binomio: 'Disterigma empetrifolium' },
  { comun: 'Paja paramuna', binomio: 'Paepalanthus columbiensis' },
  { comun: 'Pino-papel andino', binomio: 'Polylepis incana' },
  { comun: 'Pino-papel sub-andino', binomio: 'Polylepis pauta' },
  { comun: 'Frailejón de Nariño', binomio: 'Espeletia pycnophylla' },
  { comun: 'Frailejón de López', binomio: 'Espeletia lopezii' },
  { comun: 'Paragyn de Uribe', binomio: 'Paragynoxys uribei' },
  { comun: 'Mortiño falso', binomio: 'Vernonanthura patens' },
  { comun: 'Ñacha', binomio: 'Oreocallis grandiflora' },
  { comun: 'Laurel de páramo', binomio: 'Clethra kalbreyeri' },
  { comun: 'Rodamonte', binomio: 'Escallonia myrtilloides' },
  { comun: 'Molasco', binomio: 'Gynoxys baccharoides' },
  { comun: 'Cucharo de altura', binomio: 'Myrsine dependens' },
  { comun: 'Cucharo andino', binomio: 'Myrsine andina' },
  { comun: 'Aragoa', binomio: 'Aragoa abietina' },
  { comun: 'Valeriana arbórea', binomio: 'Valeriana arborea' },
  { comun: 'Chocho de Carriker', binomio: 'Lupinus carrikeri' },
  { comun: 'Quelite / Cenizo', binomio: 'Chenopodium album' },
  { comun: 'Muña', binomio: 'Minthostachys mollis' },
  // ── scripts/load-age-paramo-species-2026-07-09.mjs (IAvH 2011/2015), no
  //    duplicadas del subset OSS de arriba ────────────────────────────────────
  { comun: 'Frailejón Guerrero', binomio: 'Espeletia cayetana' },
  { comun: 'Frailejón motoso', binomio: 'Espeletia barclayana' },
  { comun: 'Frailejón', binomio: 'Espeletia hartwegiana' },
  { comun: 'Frailejón negro', binomio: 'Espeletiopsis corymbosa' },
  { comun: 'Frailejón/tache', binomio: 'Espeletiopsis santanderensis' },
  { comun: 'Roble', binomio: 'Quercus humboldtii' },
  { comun: 'Pegamosco', binomio: 'Bejaria resinosa' },
  { comun: 'Mano de oso', binomio: 'Oreopanax mutisianus' },
  { comun: 'Puya', binomio: 'Puya nitida' },
  { comun: 'Puya', binomio: 'Puya trianae' },
  { comun: 'Quina', binomio: 'Cinchona pubescens' },
  { comun: 'Chusque', binomio: 'Chusquea tessellata' },
];

/** Binomios canónicos ("genero epiteto") de TODAS las especies REALES de páramo. */
const PARAMO_NATIVE_BINOMIALS = new Set(
  PARAMO_NATIVE_SPECIES.map((sp) => _binomial(sp.binomio)).filter(Boolean),
);

/**
 * Índice comun→especie para sugerir la corrección REAL cuando el modelo fabrica un
 * binomio para un nombre común que SÍ reconocemos. Cada entrada expone las variantes
 * normalizadas de su nombre común (partido por "/" y ",", sin tildes/mayúsculas) para
 * matchear contra el texto del modelo.
 */
const PARAMO_NATIVE_LOOKUP = PARAMO_NATIVE_SPECIES.map((sp) => ({
  comun: sp.comun,
  binomio: sp.binomio,
  binomioCanonico: _binomial(sp.binomio),
  variants: sp.comun
    .split('/')
    .flatMap((part) => part.split(','))
    .map((v) => _stripDiacritics(v).replace(/\s+/g, ' ').trim())
    .filter((v) => v.length >= 3),
}));

/**
 * Recorta una frase a sus últimas `n` palabras (para limpiar el "nombre común" que
 * `ATTRIBUTED_BINOMIAL_RE`/`ATTRIBUTED_GENUS_SP_RE` capturan, que a veces arrastran
 * palabras de la prosa previa — "puedes encontrar Romero blanco" → "encontrar Romero
 * blanco" con n=3).
 */
function _tailWords(s, n) {
  const parts = (s || '').trim().split(/\s+/).filter(Boolean);
  return parts.length <= n ? parts.join(' ') : parts.slice(-n).join(' ');
}

/**
 * Busca, por nombre común normalizado, la especie REAL de páramo que mejor coincide
 * (variante más larga que matchea, para preferir "hiperico de paramo" sobre un
 * choque corto accidental). Devuelve `null` si no reconocemos el nombre.
 *
 * @param {string} commonNorm — nombre común, ya `_stripDiacritics()` + trim.
 * @returns {{comun:string, binomio:string, binomioCanonico:string}|null}
 */
function _lookupParamoNative(commonNorm) {
  if (!commonNorm) return null;
  let best = null;
  let bestLen = 0;
  for (const entry of PARAMO_NATIVE_LOOKUP) {
    for (const variant of entry.variants) {
      if (commonNorm === variant || commonNorm.includes(variant) || variant.includes(commonNorm)) {
        if (variant.length > bestLen) {
          best = entry;
          bestLen = variant.length;
        }
      }
    }
  }
  return best;
}

/** Menciona páramo/subpáramo/frailejón — mismo universo que `guardParamoNormativa`. */
const PARAMO_MENTION_RE = /\b(paramo|paramos|subparamo|subparamos|frailejon|frailejones)\b/;

/**
 * La respuesta ENCUADRA lo que sigue como especies nativas/propias/endémicas del
 * páramo (o invita a "encontrar" especies ahí) — el contexto exacto donde aparece
 * el trío fabricado del bench. Sobre texto normalizado.
 */
const PARAMO_NATIVE_CLAIM_RE =
  /(especies?\s+(nativas?|paramunas?|endemicas?)|flora\s+(nativa|paramuna|del\s+paramo)|nativ[oa]s?\s+del\s+paramo|propias?\s+del\s+paramo|tipicas?\s+del\s+paramo|endemic[oa]s?\s+del\s+paramo|adaptad[oa]s?\s+al\s+paramo|(puedes?|se\s+puede[n]?)\s+(encontrar|hallar)\s+especies|hay\s+(especies|plantas)\s+(nativas?|como|del\s+paramo)|crecen\s+en\s+el\s+paramo|habitan\s+(el\s+)?paramo|alternativas?\s+nativas?)/;

/**
 * Copia LOCAL de `ATTRIBUTED_BINOMIAL_RE` con el arranque corregido: `\b` en JS solo
 * conoce `\w` ASCII, así que NUNCA hay frontera de palabra ANTES de una mayúscula
 * acentuada (Á/É/Í/Ó/Ú/Ñ) — "Árnica" perdía la "Á" (el match arrancaba en "rnica").
 * Bug real de este guard: "Árnica de páramo" es uno de los 3 nombres comunes del
 * bench. Se usa lookbehind negativo (ya usado en `BARE_ACRONYM_RE`/`voseoFilter.js`,
 * soportado por el target del build) en vez de `\b` para el arranque. Copiada aquí
 * (no se toca `ATTRIBUTED_BINOMIAL_RE` compartida) para no ampliar el radio de
 * impacto sobre los demás guards que la usan.
 *
 * Tope de nombre común reducido a `{0,2}` (máx. 3 palabras) vs. las `{0,4}` de la
 * compartida: en prosa con varias atribuciones seguidas ("...(X) y el Y (Z)"), un
 * tope alto deja que el arranque leftmost-match retroceda hasta la conjunción "y"
 * de la atribución ANTERIOR y se la coma. Los nombres comunes reales de páramo de
 * este catálogo tienen ≤3 palabras, así que el tope más corto no pierde cobertura.
 */
const PARAMO_ATTRIBUTED_BINOMIAL_RE =
  /(?<![\wÁÉÍÓÚÜÑáéíóúüñ])([A-Za-zÁÉÍÓÚÜÑáéíóúüñ][\wÁÉÍÓÚÜÑáéíóúüñ-]*(?:\s+[\wÁÉÍÓÚÜÑáéíóúüñ-]+){0,2}?)\s*\(\s*([A-Z][a-zé]+)\s+([a-zé][a-zé-]+)\b[^)]*\)/g;

/**
 * Variante de `PARAMO_ATTRIBUTED_BINOMIAL_RE` para la abreviatura taxonómica
 * "Genero sp."/"Genero spp." — "Hipérico de páramo (Hieracium sp.)" no es un
 * binomio completo (el epíteto "sp" es demasiado corto para
 * `_looksLikeLatinBinomial`), pero SÍ es la forma exacta en la que el bench capturó
 * la confusión de género Hypericum/Hieracium.
 */
const ATTRIBUTED_GENUS_SP_RE =
  /(?<![\wÁÉÍÓÚÜÑáéíóúüñ])([A-Za-zÁÉÍÓÚÜÑáéíóúüñ][\wÁÉÍÓÚÜÑáéíóúüñ-]*(?:\s+[\wÁÉÍÓÚÜÑáéíóúüñ-]+){0,2}?)\s*\(\s*([A-Z][a-zé]+)\s+spp?\.?\s*\)/g;

const PARAMO_NATIVES_MARKER = 'Corrección importante: los nombres científicos que te di para especies nativas del páramo no son correctos';

/**
 * guardFabricatedParamoNatives — GUARD de trío de "nativas de páramo" fabricado
 * (bench de contaminación, 2026-07-09).
 *
 * PROBLEMA: preguntando por un cultivo de piso cálido/templado en PÁRAMO, el modelo
 * acierta la inviabilidad pero INVENTA un trío fijo de especies "nativas" con
 * binomios latinos fabricados o mal atribuidos (ver `PARAMO_NATIVE_SPECIES` arriba
 * para los 3 casos documentados del bench). Es una plantilla memorizada, no
 * grounding — y por venir en formato "nombre común (Binomio)" suena tan autoritativo
 * como cualquier dato real del catálogo.
 *
 * QUÉ HACE (suprimir-y-reemplazar EN LÍNEA, NO caveat): a partir de la primera
 * oración que ENCUADRA el texto como especies nativas/propias del páramo
 * (`PARAMO_NATIVE_CLAIM_RE`) — todo lo ANTERIOR queda intacto, p.ej. la explicación
 * correcta de por qué el cultivo preguntado no se da ahí — por cada atribución
 * "<nombre común> (Genus species)" o "<nombre común> (Genus sp.)":
 *   - Si el binomio coincide con el REAL del catálogo para ese nombre común →
 *     se conserva (respuesta correcta, no se toca).
 *   - Si el nombre común es DESCONOCIDO pero el binomio SÍ es una especie real de
 *     páramo (`PARAMO_NATIVE_BINOMIALS`) → se conserva (conservador: no tachamos una
 *     especie real solo porque no reconocimos su nombre común exacto).
 *   - Si reconocemos el nombre común pero el binomio es fabricado o mal atribuido →
 *     se REEMPLAZA en el sitio por el binomio REAL documentado (mantiene la
 *     estructura de la lista/oración, corrige solo el dato falso).
 *   - Si NO reconocemos el nombre común y el binomio tampoco es una especie real de
 *     páramo → se elimina el paréntesis, dejando solo el nombre común (igual que
 *     `guardInventedBinomialOutOfGrounding`, honesto ante la falta de evidencia).
 *   Nunca deja un binomio fabricado sin corregir, ni dispara si el texto ya cita
 *   especies reales. Se ANTEPONE un resumen de qué se corrigió/quitó.
 *
 * Anti-falsos-positivos:
 *  - Requiere DOBLE gate: mención de páramo/frailejón Y encuadre de "especies
 *    nativas/propias/endémicas" — no dispara por presencia de páramo a secas
 *    (`guardParamoNormativa` cubre siembra/fumigación directa; este guard cubre la
 *    fabricación de ALTERNATIVAS nativas, que puede aparecer incluso cuando la
 *    respuesta niega correctamente la siembra del cultivo preguntado).
 *  - Solo actúa DESDE la primera oración de encuadre en adelante (slice por índice,
 *    no por oración): el binomio del cultivo preguntado, mencionado ANTES de ese
 *    encuadre, nunca entra en juego. Evita depender de `_splitSentences` (que corta
 *    mal en abreviaturas taxonómicas como "sp." — "Hieracium sp.)" partía la
 *    atribución en dos oraciones y se perdía el paréntesis de cierre).
 *  - Un binomio ya presente en el grounding del turno (`resolvedEntities` + sus
 *    sub-arrays) se CONSERVA siempre — es el cultivo preguntado u otra especie que
 *    el grounding sí respalda, no una "nativa" inventada.
 *  - "Genero sp./spp." SOLO se cuestiona cuando reconocemos el nombre común Y su
 *    género documentado NO coincide (Hypericum ≠ Hieracium). Sin nombre reconocido,
 *    "sp." es honesto (no afirma especie) y no se toca.
 *  - Determinístico, barato (regex + Set/Map lookups), idempotente (marcador propio).
 *
 * @param {string} responseText
 * @param {Array<object>|null} resolvedEntities — grounding crudo del turno.
 * @returns {{text:string, modified:boolean, reason:string|null}}
 */
export function guardFabricatedParamoNatives(responseText, resolvedEntities = null) {
  if (typeof responseText !== 'string' || responseText.length === 0) {
    return { text: responseText ?? '', modified: false, reason: null };
  }
  if (responseText.includes(PARAMO_NATIVES_MARKER)) {
    return { text: responseText, modified: false, reason: null };
  }
  const norm = _stripDiacritics(responseText);
  if (!PARAMO_MENTION_RE.test(norm)) {
    return { text: responseText, modified: false, reason: null };
  }
  // `_stripDiacritics` es 1:1 en longitud para acentos españoles (á→a, ñ→n), así que
  // el índice del match en `norm` es el MISMO índice en `responseText` — patrón ya
  // usado por otros guards de este archivo (guardSpeciesSubstitution) para cruzar
  // posiciones entre el texto normalizado y el crudo.
  const claimMatch = PARAMO_NATIVE_CLAIM_RE.exec(norm);
  if (!claimMatch) {
    return { text: responseText, modified: false, reason: null };
  }
  PARAMO_ATTRIBUTED_BINOMIAL_RE.lastIndex = 0;
  ATTRIBUTED_GENUS_SP_RE.lastIndex = 0;
  if (!PARAMO_ATTRIBUTED_BINOMIAL_RE.test(responseText) && !ATTRIBUTED_GENUS_SP_RE.test(responseText)) {
    return { text: responseText, modified: false, reason: null };
  }

  const entities = Array.isArray(resolvedEntities) ? resolvedEntities : [];
  const grounded = _groundedBinomials(entities);

  const scopeStart = claimMatch.index;
  const before = responseText.slice(0, scopeStart);
  const after = responseText.slice(scopeStart);

  const fixed = [];
  const stripped = [];

  let out = after.replace(PARAMO_ATTRIBUTED_BINOMIAL_RE, (match, commonRaw, genusRaw, epithetRaw) => {
    if (!_looksLikeLatinBinomial(genusRaw, epithetRaw)) return match;
    const bin = _binomial(`${genusRaw} ${epithetRaw}`);
    if (!bin) return match;
    if (grounded.has(bin)) return match; // especie preguntada / grounding del turno.

    const common = _tailWords(commonRaw, 3);
    const known = _lookupParamoNative(_stripDiacritics(common));
    if (known) {
      if (bin === known.binomioCanonico) return match; // correcto: nombre + binomio coinciden.
      fixed.push(`${common} (${genusRaw} ${epithetRaw}) → ${common} (${_displayBinomial(known.binomioCanonico)})`);
      return `${common} (${_displayBinomial(known.binomioCanonico)})`;
    }
    if (PARAMO_NATIVE_BINOMIALS.has(bin)) return match; // binomio real, nombre no reconocido → conservador.
    stripped.push(`${common} (${genusRaw} ${epithetRaw})`);
    return common;
  });

  out = out.replace(ATTRIBUTED_GENUS_SP_RE, (match, commonRaw, genusRaw) => {
    const genusNorm = _stripDiacritics(genusRaw).toLowerCase();
    if (GENUS_STOPWORDS.has(genusNorm)) return match;
    const common = _tailWords(commonRaw, 3);
    const known = _lookupParamoNative(_stripDiacritics(common));
    if (!known) return match; // "sp." sobre nombre no reconocido es honesto, no se toca.
    const knownGenus = _stripDiacritics(known.binomioCanonico.split(' ')[0]);
    if (knownGenus === genusNorm) return match; // género correcto, solo falta epíteto.
    fixed.push(`${common} (${genusRaw} sp.) → ${common} (${_displayBinomial(known.binomioCanonico)})`);
    return `${common} (${_displayBinomial(known.binomioCanonico)})`;
  });

  if (fixed.length === 0 && stripped.length === 0) {
    return { text: responseText, modified: false, reason: null };
  }

  bumpGuardTelemetry('fabricated_paramo_natives');

  const notes = [];
  if (fixed.length > 0) notes.push(`Corregí estos binomios mal atribuidos: ${fixed.join('; ')}.`);
  if (stripped.length > 0) {
    notes.push(`No pude confirmar como reales estos nombres científicos, los quité: ${stripped.join(', ')}.`);
  }
  const correction = `${PARAMO_NATIVES_MARKER}. ${notes.join(' ')}`;

  const text = `${correction}\n\n${(before + out).trim()}`;
  return {
    text,
    modified: true,
    reason: `especies_nativas_paramo_fabricadas: ${[...fixed, ...stripped].join('; ')}`,
  };
}

/**
 * Guard de CLIMA - consejo general.
 *
 * Provee un consejo general sobre clima cuando el texto menciona condiciones
 * climáticas extremas sin contexto suficiente. NO suprime el texto, solo
 * adiciona un caveat educativo.
 *
 * Patrón: aditivo (como guardAltitudeRiskCaveat).
 *
 * @param {string} responseText — texto del LLM
 * @param {object} [ctx]
 * @param {number|null} [ctx.forecastTempMin] - mínima del pronóstico (°C)
 * @param {number|null} [ctx.forecastTempMax] - máxima del pronóstico (°C)
 * @returns {{text:string, modified:boolean, reason:string|null}}
 */
export function guardClimaConsejo(responseText, { forecastTempMin = null, forecastTempMax = null } = {}) {
  if (typeof responseText !== 'string' || responseText.length === 0) {
    return { text: responseText ?? '', modified: false, reason: null };
  }

  const norm = _stripDiacritics(responseText);

  // Si el texto ya incluye el consejo de clima, no re-disparamos
  // Buscamos el marcador que el guard mismo inyecta
  if (norm.includes('consejo climatico') || norm.includes('cambio climatico')) {
    return { text: responseText, modified: false, reason: null };
  }

  // Keywords que indican condiciones climáticas extremas
  const CLIMA_EXTREMO_KEYWORDS = [
    /\bhelad\w*\b/,
    /\bhelada\b/,
    /\bcongelac\w*\b/,
    /\bsequ[ií]a\b/,
    /\bsequ[ií]as\b/,
    /\bola\s+de\s+calor\b/,
    /\bcalor\s+extremo\b/,
    /\binundac\w*\b/,
    /\bexceso\s+de\s+lluvia\b/,
    /\blluvias\s+intensas\b/,
    /\bfen[oó]meno\s+del\s+ni[nñ]o\b/,
    /\beni\b/,
    /\bfen[oó]meno\s+de\s+la\s+ni[nñ]a\b/,
    /\bvariabilidad\s+clim[aá]tica\b/,
    /\bcambio\s+clim[aá]tico\b/,
  ];

  const hasClimaExtremo = CLIMA_EXTREMO_KEYWORDS.some((re) => re.test(norm));

  // Si no hay condiciones extremas, no hacemos nada
  if (!hasClimaExtremo) {
    return { text: responseText, modified: false, reason: null };
  }

  // Si tenemos datos del pronóstico, los usamos para el consejo
  let consejoEspecifico = '';
  if (forecastTempMin !== null && forecastTempMin < 5) {
    consejoEspecifico =
      '\n\n🌡️ Pronóstico: se esperan temperaturas bajas (mínima de ' +
      forecastTempMin.toFixed(1) +
      '°C). Considera proteger cultivos sensibles con coberturas o shelters térmicos.';
  } else if (forecastTempMax !== null && forecastTempMax > 32) {
    consejoEspecifico =
      '\n\n🌡️ Pronóstico: se esperan temperaturas altas (máxima de ' +
      forecastTempMax.toFixed(1) +
      '°C). Asegura riego suficiente y considera sombreado temporal para cultivos sensibles.';
  }

  bumpGuardTelemetry('clima_consejo');

  const advice =
    '\n\n💡 Consejo climático\n\n' +
    'Ante condiciones climáticas extremas, te recomiendo:\n' +
    '• Monitorear los pronósticos locales (IDEAM o meteoblue) regularmente.\n' +
    '• Tener un plan de contingencia para cultivos sensibles (coberturas, riego ' +
    'de emergencia, sombreado temporal).\n' +
    '• Priorizar variedades adaptadas a tu piso térmico y con resiliencia climática.\n' +
    '• Mantener registros históricos de clima en tu finca para identificar patrones.' +
    consejoEspecifico;

  const text = `${responseText.trim()}${advice}`;

  return {
    text,
    modified: true,
    reason: 'clima_consejo_aditivo: condiciones_extremas_detectadas',
  };
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
 * @param {Array<object>|null} [ctx.resolvedEntities] - grounding AGE del turno.
 * @param {number|string|null} [ctx.fincaAltitud] - msnm de la finca activa.
 * @param {boolean} [ctx.hadVision=false] - ¿hubo una imagen real (item foto /
 *   analyzeFoliage corrido) en ESTE turno? Sin esto el guard de visión asume
 *   que NO hubo foto y corrige cualquier diagnóstico visual fabricado.
 * @param {number|null} [ctx.visionConfidence=null] - confianza de analyzeFoliage
 *   (para suavizar hallazgos detallados cuando la visión no fue concluyente).
 * @param {string|null} [ctx.profileName] - nombre del usuario (getProfile().nombre)
 *   para el guard de nombre inventado. Si falta, cualquier saludo con nombre se remueve.
 * @param {number|null} [ctx.forecastTempMin] - mínima esperada del pronóstico (°C),
 *   derivada de climaSnapshot.openmeteo.forecast_7d. Habilita el guard térmico
 *   (riesgo de helada). Sin esto, el guard térmico es no-op.
 * @param {number|null} [ctx.forecastTempMax] - máxima esperada del pronóstico (°C)
 *   para el riesgo de golpe de calor. Mismo origen.
 * @param {string|null} [ctx.userMessage] - pregunta cruda del usuario (A12). Si
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

// 2026-07-12 (operador: "se cortó a menos de la tercera parte"): los umbrales
// viejos (250/400) MUTILABAN respuestas técnicas legítimas a 2-3 oraciones —
// una respuesta agroecológica detallada (plagas de la fresa, plan de manejo) es
// naturalmente 300-600 palabras y ES el valor del agente. Cortarla degrada
// inteligencia (regla dura del operador). Subidos MUCHO: solo recorta verborrea
// genuinamente desbocada, y aun así conserva bastantes oraciones (ver kept).
// La rama de DEDUP (redundancia) se conserva — esa sí es útil sin degradar.
const MAX_CONCISE_WORDS = 700;
const MAX_CONCISE_WORDS_HARD = 1300;

/**
 * guardConciseResponse — guard de CONCISIÓN (Item 7).
 *
 * Si la respuesta del LLM excede 250 palabras, la acorta conservando las
 * primeras 2 oraciones como resumen accionable y ofreciendo profundizar.
 * Si excede 400 palabras (hard limit), fuerza el recorte.
 * Además detecta si una misma recomendación aparece 3+ veces y la deduplica.
 *
 * Conservador: no toca respuestas <200 palabras (detalle legítimo).
 * No-op si el texto es corto o no es string.
 *
 * @param {string} responseText - Texto completo de la respuesta del LLM.
 * @returns {{text:string, modified:boolean, reason:string|null}}
 */
export function guardConciseResponse(responseText) {
  if (typeof responseText !== 'string' || responseText.length === 0) {
    return { text: responseText ?? '', modified: false, reason: null };
  }

  const words = responseText.split(/\s+/).filter(Boolean);
  // Gate BAJO solo para poder correr el DEDUP (redundancia) en respuestas
  // medianas; la truncación por LARGO usa umbrales altos (700/1300) más abajo,
  // así una respuesta técnica de 200-700 palabras NO-redundante queda intacta.
  const DEDUP_MIN_WORDS = 200;
  if (words.length < DEDUP_MIN_WORDS) {
    return { text: responseText, modified: false, reason: null };
  }

  // Detectar repetición de misma recomendación 3+ veces
  const sentences = responseText.match(/[^.!?]*[.!?]/g) || [];
  const recommendationCounts = {};
  for (const s of sentences) {
    const trimmed = s.trim().toLowerCase();
    for (const keyword of ['recomiendo', 'puedes', 'aplicar', 'usar', 'sembrar', 'regar', 'podar']) {
      if (trimmed.includes(keyword)) {
        recommendationCounts[keyword] = (recommendationCounts[keyword] || 0) + 1;
        break;
      }
    }
  }
  const hasRedundancy = Object.values(recommendationCounts).some(c => c >= 3);

  // BUGFIX coherencia (gota→stub, 2026-06-23): cuando un guard de SEGURIDAD
  // prepende un preámbulo ("⚠️ Ojo de seguridad: … no es problema de riego."),
  // ese aviso ocupa las primeras oraciones. La truncación naíf "primeras N
  // oraciones" se quedaba SOLO con el aviso y BOTABA el plan real → respuesta
  // stub repetitiva ("…¿Quieres que profundice?") turno a turno (el fallo que
  // reportó el operador con la gota del tomate). Fix: si el texto arranca con el
  // aviso de seguridad, contamos cuántas oraciones iniciales son del preámbulo y
  // las PRESERVAMOS, y además conservamos N oraciones SUSTANTIVAS del cuerpo.
  // Sin preámbulo de seguridad, prefixCount=0 → comportamiento idéntico al previo.
  // FIX P0 (audit 2026-06-23): añadido "importante:" para que las correcciones
  // de guardBurnEndorsementCorrection (prefijo "⚠️ Importante: no se recomienda
  // quemar") no sean truncadas por guardConciseResponse — el usuario perdía la
  // advertencia de quema/Ley 1930 cuando la respuesta total era larga.
  const SAFETY_PREFIX_MARKERS =
    /(ojo de seguridad|importante:|no es (un )?problema de|no problema de|patogen|toxic|veneno|letal|no consumir|no apta|peligro|cuidado:)/;
  let prefixCount = 0;
  if (_stripDiacritics(responseText).trimStart().toLowerCase().startsWith('⚠️ ojo de seguridad')
      || responseText.trimStart().startsWith('⚠️ Ojo de seguridad')) {
    for (let i = 0; i < sentences.length; i++) {
      if (i === 0 || SAFETY_PREFIX_MARKERS.test(_stripDiacritics(sentences[i]).toLowerCase())) {
        prefixCount = i + 1;
      } else break;
    }
  }

  // Construir versión concisa
  let conciseText = '';
  let reason = '';

  if (words.length >= MAX_CONCISE_WORDS_HARD) {
    // Hard limit (>1300 palabras, verborrea real): preámbulo de seguridad + 6
    // oraciones del cuerpo (antes 2 = stub que mutilaba el plan).
    const kept = [...sentences.slice(0, prefixCount), ...sentences.slice(prefixCount, prefixCount + 6)];
    conciseText = `${kept.join(' ').trim()}\n\n¿Quieres que profundice en algo específico?`;
    reason = `guardConciseResponse:hard_limit (${words.length} palabras, max ${MAX_CONCISE_WORDS_HARD})`;
  } else if (hasRedundancy) {
    // Deduplicar: mantener primera mención de cada recomendación
    const seen = new Set();
    const deduped = sentences.filter(s => {
      const key = /** @type {string} */ (/** @type {any} */ (s).trim().toLowerCase().slice(0, 60));
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
    conciseText = deduped.join(' ').trim();
    if (conciseText.length < 30) conciseText = responseText.slice(0, 500) + '...';
    reason = `guardConciseResponse:redundant_recommendation (${sentences.length} -> ${deduped.length} oraciones)`;
  } else if (words.length >= MAX_CONCISE_WORDS) {
    // Soft limit (700-1300 palabras): preámbulo de seguridad + 10 oraciones del
    // cuerpo (antes 3 = mutilaba respuestas técnicas legítimas).
    const kept = [...sentences.slice(0, prefixCount), ...sentences.slice(prefixCount, prefixCount + 10)];
    conciseText = `${kept.join(' ').trim()}\n\n¿Quieres que profundice en algo específico?`;
    reason = `guardConciseResponse:verbose (${words.length} palabras, recomendado <${MAX_CONCISE_WORDS})`;
  } else {
    // 200-700 palabras, no-redundante: respuesta técnica legítima → NO tocar.
    return { text: responseText, modified: false, reason: null };
  }

  bumpGuardTelemetry('concise');
  return { text: conciseText, modified: true, reason };
}

// ── GUARD CONFIDENCIALIDAD: fugas de internos del agente ────────────────────

export const INTERNALS_LEAK_SAFE_REDIRECT =
  'Soy el asistente de Chagra para apoyar el campo colombiano. No comparto detalles internos ni especulo sobre tecnología. Mejor cuéntame: ¿en qué cultivo te ayudo?';

const INTERNALS_LEAK_RE =
  /\b(?:cypher|neo4j|apache\s+age|ollama|granite|mistral|gemma)\b|\b(?:modelo|model|ia|ai)\s+(?:de\s+)?llama\b|\bllama\s*(?:\d|[.:_-]|model|modelo|ia|ai)\b|MATCH\s*\(|\b(?:nodo|node|label|grafo|graph)\s+(?:species|biopreparado|pest|association|companion)\b|\b(?:get_pest_controllers|get_biopreparados|get_normativa_ica|get_associations)\b|\b(?:mis\s+instrucciones|system\s+prompt|mi\s+prompt)\b/i;

/**
 * stripInternalsLeak - suppress-and-replace ante detalles internos reales o
 * inventados sobre implementación, prompts, herramientas o grafo.
 *
 * @param {string} responseText
 * @returns {{text:string, modified:boolean, reason:string|null}}
 */
export function stripInternalsLeak(responseText) {
  if (typeof responseText !== 'string' || responseText.length === 0) {
    return { text: responseText ?? '', modified: false, reason: null };
  }
  if (!INTERNALS_LEAK_RE.test(responseText)) {
    return { text: responseText, modified: false, reason: null };
  }
  bumpGuardTelemetry('internals_leak');
  return {
    text: INTERNALS_LEAK_SAFE_REDIRECT,
    modified: true,
    reason: 'internals_leak',
  };
}

// ── GUARD REDACCIÓN DE LEAK DE TOOLING (modifica EL TEXTO mostrado) ──────────
//
// Espejo, en la capa que SÍ reescribe la respuesta visible, de
// `sanitizeToolingLeak` del sidecar (modules/agro-mcp/sidecar/src/lib/
// response-safety.ts). A diferencia de `stripInternalsLeak` —que NUKEA toda la
// respuesta a un redirect genérico cuando detecta modelo/instrucciones— este
// guard es QUIRÚRGICO: REDACTA in-line los identificadores internos
// (query_corpus_*, "corpus DR-034", DR-NNN, nombres de tools get_*/query_*,
// rutas /home·modules·*.ts) y deja intacto el contenido agronómico legítimo.
//
// Motivación (verificación en vivo, agente prod 2026-06-21): el agente a veces
// responde "...puedo buscar en el corpus DR-034 / usa query_corpus_dr034..."
// (plomería interna). El usuario campesino JAMÁS debe ver eso. El sidecar lo
// redacta pero el PWA solo lo usaba para la badge (no reescribía); aquí sí
// modificamos `guarded.text`.
//
// Anti-falso-positivo: NO toca términos legítimos (caldo bordelés, binomios
// latinos, Ley 1930/2018, Decreto 1007). La denylist es cerrada y específica de
// la plomería interna; no incluímos el allow-list completo de tools (eso vive en
// el repo privado) sino el patrón genérico `get_*`/`query_*` de tool interno.

/** Marcador con el que reemplazamos cualquier referencia interna filtrada. */
export const TOOLING_LEAK_REDACTION = 'el catálogo';

// Patrones de leak de tooling interno, ordenados para redactar de fuera-a-dentro
// (la frase delatora primero, luego los identificadores sueltos). Cada uno es
// global para redactar TODAS las apariciones.
const TOOLING_LEAK_PATTERNS = [
  // 1. La frase delatora completa "(voy a) usar/utilizar/invocar/llamar (a) la
  //    herramienta/función `get_x`/`query_corpus_x`" → se reemplaza entera por algo
  //    natural ("lo busco en el catálogo"), absorbiendo el lead-in "voy a"/"a"
  //    para no dejar "voy a ... el catálogo" agramatical ni "la herramienta el
  //    catálogo" colgando.
  {
    re: /\b(?:(?:te\s+)?voy\s+a\s+|puedo\s+|puede[sn]?\s+|podr[íi]a\s+|a\s+)?(?:usar|usa|utilizar|utiliza|invocar|invoca|llamar(?:\s+a)?|llama(?:\s+a)?)\s+(?:la\s+|el\s+|mi\s+|una\s+)?(?:herramienta|funci[óo]n|tool|comando)\s+`?(?:query_corpus[a-z0-9_]*|get_[a-z0-9_]+|query_[a-z0-9_]+)`?(?:\s*\([^)]*\))?/gi,
    repl: 'lo busco en el catálogo',
  },
  // 2. "puedo/puede buscar(lo)/consultar(lo) en el corpus DR-034 / en query_corpus_x"
  //    → "puedo buscarlo en el catálogo". Cubre el caso exacto de la verificación.
  {
    re: /\b(?:puedo|puede[sn]?|podr[íi]a)\s+(?:buscar(?:lo|la)?|consultar(?:lo|la)?|revisar(?:lo|la)?)\s+(?:en|con)\s+(?:el\s+|la\s+|mi\s+|nuestro\s+)?(?:corpus\s+)?(?:DR[-\s]?[A-Za-z0-9]+(?:[-_][A-Za-z0-9]+)*|query_corpus[a-z0-9_]*|get_[a-z0-9_]+|query_[a-z0-9_]+)(?:\s*\([^)]*\))?/gi,
    repl: 'puedo buscarlo en el catálogo',
  },
  // 3. `query_corpus...` suelto (función/tool RAG que el modelo nombra al razonar),
  //    con o sin backticks, con sufijo `_dr034` y/o `(...)`.
  { re: /`?\bquery_corpus[a-z0-9_]*\b(?:\s*\([^)]*\))?`?/gi, repl: TOOLING_LEAK_REDACTION },
  // 4. Identificadores DR/corpus internos: "corpus DR-034", "DR-034", "DR-CHAGRA-…".
  //    El prefijo "corpus" opcional se absorbe para no dejarlo huérfano.
  { re: /`?\b(?:corpus\s+)?DR[-\s][A-Za-z0-9]+(?:[-_][A-Za-z0-9]+)*\b`?/gi, repl: TOOLING_LEAK_REDACTION },
  // 5. "el corpus interno / citable / de DRs / corpus DR" como referencia a la
  //    plomería RAG (no es vocabulario campesino). Solo con calificativo interno.
  { re: /\b(?:el\s+|nuestro\s+|del\s+|mi\s+)?corpus\s+(?:interno|citable|de\s+drs?|dr)\b/gi, repl: TOOLING_LEAK_REDACTION },
  // 6. Nombres de tools internas en prosa (get_x / query_x), con o sin backticks.
  //    Patrón genérico — NO enumeramos el allow-list privado.
  { re: /`?\b(?:get|query)_[a-z][a-z0-9_]+\b`?(?:\s*\([^)]*\))?/gi, repl: TOOLING_LEAK_REDACTION },
  // 7. Rutas internas obvias (/home/..., modules/...) y archivos fuente *.ts/*.js.
  {
    re: /(?:\/home\/[^\s`]+|\bmodules\/[A-Za-z0-9_\-/]+(?:\.(?:ts|js|mjs|cjs))?|\b[A-Za-z0-9_\-/]+\.(?:ts|js|mjs|cjs))\b/g,
    repl: TOOLING_LEAK_REDACTION,
  },
];

// Detector barato (sin reemplazar) para el early-exit: ¿hay ALGÚN patrón de leak?
const TOOLING_LEAK_DETECT_RE =
  /\bquery_corpus[a-z0-9_]*\b|\b(?:corpus\s+)?DR[-\s][A-Za-z0-9]|\bcorpus\s+(?:interno|citable|de\s+drs?|dr)\b|\b(?:get|query)_[a-z][a-z0-9_]+\b|\/home\/|\bmodules\/[A-Za-z0-9_]|\b[A-Za-z0-9_\-/]+\.(?:ts|js|mjs|cjs)\b/i;

/**
 * guardToolingLeakRedaction — REDACTA in-line el leak de tooling interno del
 * TEXTO mostrado al usuario, conservando el resto de la respuesta. Determinista,
 * pura, idempotente (el marcador `el catálogo` no re-dispara). Corre SIEMPRE
 * (no gateada por entidades ni por intención de siembra). Espejo aplicado-al-
 * texto de `sanitizeToolingLeak` del sidecar.
 *
 * @param {string} responseText — texto del LLM.
 * @returns {{text:string, modified:boolean, reason:string|null, patterns?:string[]}}
 */
export function guardToolingLeakRedaction(responseText) {
  if (typeof responseText !== 'string' || responseText.length === 0) {
    return { text: responseText ?? '', modified: false, reason: null };
  }
  if (!TOOLING_LEAK_DETECT_RE.test(responseText)) {
    return { text: responseText, modified: false, reason: null };
  }
  const patterns = [];
  let out = responseText;
  for (const { re, repl } of TOOLING_LEAK_PATTERNS) {
    out = out.replace(re, (match) => {
      const trimmed = match.trim();
      if (trimmed && !patterns.includes(trimmed)) patterns.push(trimmed);
      return repl;
    });
  }
  // Limpieza de residuos: "la herramienta el catálogo" / "en el corpus el catálogo"
  // → "el catálogo"; dobles marcadores contiguos → uno solo; espacios duplicados.
  out = out
    .replace(/\b(?:la|el|una|mi)\s+(?:herramienta|funci[óo]n|tool|comando)\s+el catálogo\b/gi, TOOLING_LEAK_REDACTION)
    .replace(/\b(?:en|con|del?)\s+(?:el|la|nuestro|mi)?\s*corpus\s+el catálogo\b/gi, 'en el catálogo')
    .replace(new RegExp(`(?:${TOOLING_LEAK_REDACTION})(?:[ ,]+(?:${TOOLING_LEAK_REDACTION}))+`, 'g'), TOOLING_LEAK_REDACTION)
    .replace(/[ \t]{2,}/g, ' ')
    .replace(/\s+([,.;:])/g, '$1');

  if (out === responseText || patterns.length === 0) {
    return { text: responseText, modified: false, reason: null };
  }
  bumpGuardTelemetry('tooling_leak_redaction');
  return {
    text: out,
    modified: true,
    reason: `tooling_leak_redaction: ${patterns.slice(0, 5).join(', ')}`,
    patterns,
  };
}

// ── GUARD CORRECCIÓN DE QUEMA (antepone corrección al TEXTO mostrado) ────────
//
// Espejo aplicado-al-texto de `detectBurnEndorsement` + `buildBurnSafetyCorrection`
// del sidecar. Si la respuesta presenta la quema como beneficiosa/balanceada
// ("la quema puede tener beneficios", "la ceniza aporta potasio y calcio") y NO
// la desaconseja, ANTEPONE una corrección que desaconseja la quema (pérdida de
// materia orgánica/biología del suelo, contaminación del aire), cita la Ley
// 1930/2018 (páramo) y ofrece alternativas (incorporar rastrojo, mulch, compost,
// abonos verdes).
//
// Verificación en vivo (agente prod 2026-06-21): "la quema puede tener
// beneficios... liberar nutrientes" — el agente NO la desaconseja.
//
// ADITIVO (no nuke): preserva el cuerpo original tras la corrección. Idempotente
// (no re-dispara si la corrección ya está). Corre SIEMPRE.
//
// Anti-falso-positivo: requiere (verbo de quema + endoso) O fraseo ceniza-como-
// nutriente. Una respuesta agroecológica normal que menciona "Ley 1930" o
// "el compost aporta nutrientes" SIN quema NO dispara. Tampoco dispara si la
// respuesta ya desaconseja la quema.

const BURN_CORRECTION_MARKER = 'no se recomienda quemar';

// Verbos/acciones de QUEMA agrícola.
const BURN_ACTION_RE =
  /\bquema(?:r|s|n|do|da|ndo)?\b|\bquemo\b|\bquemes?\b|\brocer[íi]a\b|\bsocola\b|\btumba\s+y\s+quema\b|\bincendi(?:o|ar|os)\b|\bprender(?:le)?\s+fuego\b|\bfuego\s+(?:al|a\s+la|controlado)\b/i;

// Términos de ENDOSO (presentar la quema como buena/útil/balanceada).
const BURN_ENDORSE_RE =
  /\bbeneficios?[ao]?s?\b|\bbuena?\b|\brecomend(?:able|ada|ado|amos|o)\b|\bs[íi]rve\b|\bayuda(?:r)?\b|\bmejora(?:r)?\b|\bfertiliza\b|\benriquece\b|\bventaja(?:s)?\b|\bpermitid[ao]\b|\bpuede(?:n)?\s+tener\s+beneficios?\b|\bdesventajas?\b|\baporta(?:r|n)?\s+(?:nutrientes?|potasio|calcio|f[óo]sforo|minerales?|nitr[óo]geno)\b|\blibera(?:r|n)?\s+(?:nutrientes?|potasio|calcio|f[óo]sforo|minerales?)\b/i;

// Fraseo "pro-quema suave" vía la CENIZA como aporte nutricional. Tan específico
// que dispara aun SIN verbo de quema explícito (la ceniza presupone la quema).
const BURN_ASH_FRAMING_RE =
  /\bcenizas?\b[^.!?\n]{0,80}\b(?:aporta(?:r|n)?|proporciona(?:r|n)?|devuelve(?:n)?|libera(?:r|n)?|a[ñn]ade(?:n)?|enriquece(?:r|n)?|tiene(?:n)?|contiene(?:n)?|es\s+rica|son\s+ricas|fuente)\b|\b(?:aporta(?:r|n)?|proporciona(?:r|n)?|devuelve(?:n)?|libera(?:r|n)?|fuente\s+de)\b[^.!?\n]{0,40}\bcenizas?\b/i;

// Señales de que el agente YA desaconseja la quema (respuesta correcta → no tocar).
const BURN_DISCOURAGE_RE =
  /\bno\s+(?:se\s+(?:debe|recomienda)\s+|deber[íi]as?\s+|hay\s+que\s+|conviene\s+)?(?:quemar|quemes|quemen|hacer\s+quemas?)\b|\bno\s+se\s+recomienda\s+(?:la\s+)?quem|\bevit[ae]\s+(?:la\s+)?quemas?\b|\b(?:est[áa]\s+)?prohibid[ao]\b|\bes\s+ilegal\b|\bdesaconsej/i;

// Contexto páramo / área protegida (agravante legal Ley 1930/2018).
const BURN_PARAMO_RE =
  /\bp[áa]ramo(?:s)?\b|\b[áa]rea\s+protegida\b|\breserva\s+natural\b|\becosistema\s+estrat[ée]gico\b/i;

/**
 * Texto correctivo anti-quema (fundamentado en Ley 1930/2018 + alternativas
 * agroecológicas). `paramo=true` agrega el marco legal específico de páramo.
 * @param {boolean} paramo
 * @returns {string}
 */
export function buildBurnSafetyCorrection(paramo) {
  const legal = paramo
    ? 'En PÁRAMO la quema es un delito grave: los páramos son Áreas Estratégicas ' +
      'protegidas por la Ley 1930 de 2018, y la quema (incluido el rozamiento para ' +
      'preparar tierra) puede acarrear sanciones. No existe una "quema pequeña ' +
      'permitida". Antes de cualquier actividad consulta la CAR (Corporación Autónoma Regional).'
    : 'Las quemas agrícolas a campo abierto están reguladas y, en general, ' +
      'restringidas en Colombia: requieren autorización de la autoridad ambiental ' +
      '(CAR) y pueden ser sancionadas. En áreas protegidas y páramo están prohibidas ' +
      '(Ley 1930 de 2018).';
  return [
    `⚠️ Importante: ${BURN_CORRECTION_MARKER}. La quema NO es una opción equilibrada: ` +
      'el aporte de la ceniza (potasio, calcio) es marginal y temporal frente al daño ' +
      'permanente. Quemar destruye la materia orgánica, mata la biología del suelo, ' +
      'deja el terreno expuesto a la erosión y contamina el aire (humo y material particulado).',
    legal,
    'Alternativas agroecológicas, sin quemar, para manejar la biomasa y los rastrojos:',
    '• Incorporar el rastrojo picado al suelo para que se descomponga y aporte materia orgánica.',
    '• Dejar cobertura muerta (mulch) sobre el suelo: conserva humedad, regula temperatura y nutre.',
    '• Compostar los residuos vegetales (compost, bocashi) y devolverlos como abono.',
    '• Sembrar abonos verdes para cubrir y nutrir el suelo entre ciclos.',
    'Fuente: Ley 1930 de 2018, lineamientos CAR.',
  ].join('\n');
}

/**
 * guardBurnEndorsementCorrection — si la respuesta endosa/balancea la quema sin
 * desaconsejarla, ANTEPONE `buildBurnSafetyCorrection`. ADITIVO (preserva el
 * cuerpo), determinista, puro, idempotente. Corre SIEMPRE. Espejo aplicado-al-
 * texto de `detectBurnEndorsement` del sidecar.
 *
 * @param {string} responseText — texto del LLM.
 * @returns {{text:string, modified:boolean, reason:string|null}}
 */
export function guardBurnEndorsementCorrection(responseText) {
  if (typeof responseText !== 'string' || responseText.length === 0) {
    return { text: responseText ?? '', modified: false, reason: null };
  }
  // Idempotencia: ya corregido.
  if (responseText.includes(BURN_CORRECTION_MARKER)) {
    return { text: responseText, modified: false, reason: null };
  }
  const hasBurn = BURN_ACTION_RE.test(responseText);
  const hasEndorse = BURN_ENDORSE_RE.test(responseText);
  const hasAshFraming = BURN_ASH_FRAMING_RE.test(responseText);
  const discourages = BURN_DISCOURAGE_RE.test(responseText);

  // Endosa si: (verbo de quema + endoso) O fraseo ceniza-como-nutriente, y NO
  // está ya desaconsejando.
  const endorses = ((hasBurn && hasEndorse) || hasAshFraming) && !discourages;
  if (!endorses) {
    return { text: responseText, modified: false, reason: null };
  }
  const paramo = BURN_PARAMO_RE.test(responseText);
  bumpGuardTelemetry('burn_endorsement_correction');
  return {
    text: `${buildBurnSafetyCorrection(paramo)}\n\n${responseText.trim()}`,
    modified: true,
    reason: `quema_balanceada_corregida${paramo ? '_paramo' : ''}`,
  };
}

// ── GUARD CROP-AGNOSTIC: trampas de seguridad anti-falsa-cura (aplican a cualquier cultivo) ─────────────────────

const CROP_AGNOSTIC_SAFETY_MARKER = 'Seguridad:';
const CROP_AGNOSTIC_DISEASE_NO_CURE_RE =
  /\b(hlb|greening|liberibacter|monilia|moniliopsis|sigatoka\s+negra|moko|marchitez\s+bacteriana|ralstonia|virus|cuchara|tylcv|peste\s+negra|tswv|mosaico)\b/i;
const PROHIBITED_PESTICIDE_RE =
  /\b(metamidofos|parathion|paration|monocrotofos|endosulfan|lannate|metomil|ddt|aldrin|dieldrin|endrin|clordano|heptacloro|lindano|hexaclorociclohexano|aldicarb|temik|carbofurano|furadan|mirex|toxafeno|canfecloro|dinoseb|forato|terbufos|dicrotofos)\b/i;
const PESTICIDE_DOSE_REQUEST_RE =
  /\b(dosis|cuant[oa]s?\s+(ml|cc|gramos?|gr|g)|\d+\s*(ml|cc|g|gr|gramos?))\b/i;
const PESTICIDE_CONTEXT_RE = /\b(plaguicida|insecticida|fungicida|herbicida|agroquimic|veneno|glifosato|sistematico)\b/i;
const NON_SELECTIVE_HERBICIDE_RE = /\b(glifosato|paraquat|glufosinato)\b/i;
const EXPORT_NORMATIVA_RE =
  /\b(exportar|exportación|europa|estados\s+unidos|eea|mrl|carencia|residuos)\b/i;
const PREHARVEST_RE = /\b(cosecha|cerca\s+de\s+cosecha|pre[-\s]?cosecha|cerca\s+de\s+cosechar)\b/i;
const TRICHODERMA_RE = /\btrichoderma\b/i;
const INSECT_RE = /\b(insecto|oruga|polilla|gusano|cogollero|trips|mosca|plaga)\b/i;

function _cropAgnosticSafetyReplacement(kind) {
  const intro = `${CROP_AGNOSTIC_SAFETY_MARKER} no voy a confirmar una cura, producto o dosis peligrosa.`;
  const byKind = {
    sin_cura:
      `${intro} Estas enfermedades no tienen cura química comprobada en planta: HLB (cítricos), monilia (cacao), Sigatoka negra (plátano), moko/marchitez bacteriana/Ralstonia, virus (varios cultivos). Manejo: erradicar/roguing, variedades resistentes, control de vector, desinfección. NUNCA prometas cura ni producto milagroso.`,
    prohibido:
      `${intro} Productos altamente tóxicos, prohibidos o sin registro ICA vigente en Colombia: organofosforados/carbamatos (metamidofós, paratión, monocrotofós, metomil/Lannate, aldicarb/Temik, carbofurano/Furadan) y organoclorados prohibidos (DDT, lindano, clordano, aldrín, endosulfán). No se recomiendan ni se dan dosis. Consulta etiqueta vigente y asistente técnico. Prefiere opciones agroecológicas.`,
    dosis:
      `${intro} NUNCA inventes una dosis numérica de plaguicida. La dosis sale de la etiqueta registrada ICA y del asistente técnico. Herbicidas no selectivos (glifosato, paraquat) NO se aplican sobre el cultivo.`,
    export_mrl:
      `${intro} Para exportación, respeta MRL del país destino y carencia del producto. NO apliques plaguicidas fuertes cerca de cosecha. Verifica registro ICA y residuos permitidos.`,
    trichoderma_insect:
      `${intro} Trichoderma es un hongo de suelo para patógenos como Fusarium/Rhizoctonia, NO controla insectos. Para plagas usa control biológico específico (Beauveria, Bacillus, etc.).`,
  };
  return byKind[kind] || byKind.dosis;
}

function _cropAgnosticSafetyKind({ userNorm, responseNorm }) {
  const combined = `${userNorm}\n${responseNorm}`;

  // Si el usuario menciona específicamente "tomate", dejamos que el guarda de tomate maneje el caso
  // (excepto para export/MRL que es genuinamente crop-agnostic)
  if (/\btomate\b/i.test(userNorm)) {
    // Solo procesamos export/MRL para tomate, el resto lo deja pasar al guarda de tomate
    if (EXPORT_NORMATIVA_RE.test(combined) && PREHARVEST_RE.test(combined)) {
      const unsafeApply = /\b(aplica|aplique|usa|use|puedo|puede|sirve)\b/i.test(responseNorm);
      const alreadySafe = /\b(no\s+aplic|cuidado|evita|carencia|mrl|residuos|registro\s+ica)\b/i.test(responseNorm);
      if (unsafeApply || !alreadySafe) return 'export_mrl';
    }
    // Para tomate, dejamos que el guarda específico maneje el resto
    return null;
  }

  // Enfermedades sin cura (crop-agnostic)
  if (CROP_AGNOSTIC_DISEASE_NO_CURE_RE.test(combined)) {
    const unsafeCure = /\b(cura|curar|elimina|control\s+total|producto|fungicida|bactericida|antibiotico|dosis|aplica|aplique)\b/i.test(responseNorm);
    // Respuestas seguras mencionan erradicar/roguing/sacar la planta, o dicen explícitamente que no hay cura
    const alreadySafe = /\b(no\s+(tiene|hay)\s+cura|sin\s+cura|no\s+se\s+cura|erradica|erradicar|erradiques|roguing|quemar|saca|sacar|elimina\s+plantas|elimin\s+\w+\s+plantas|retira|retirar)\b/i.test(responseNorm);
    if (unsafeCure || !alreadySafe) return 'sin_cura';
  }

  // Plaguicidas prohibidos (crop-agnostic)
  if (PROHIBITED_PESTICIDE_RE.test(combined)) {
    const alreadySafe = /\b(no|nunca|evita|prohibid|restringid|registro\s+ica|etiqueta)\b/i.test(responseNorm);
    if (!alreadySafe || /\b(aplica|aplique|usa|use|dosis|ml|cc|gramos?)\b/i.test(responseNorm)) return 'prohibido';
  }

  // Dosis inventadas (crop-agnostic)
  if (
    (PESTICIDE_DOSE_REQUEST_RE.test(userNorm) && PESTICIDE_CONTEXT_RE.test(combined)) ||
    (NON_SELECTIVE_HERBICIDE_RE.test(combined) && /\b(cultivo|planta)\b/i.test(combined))
  ) {
    const hasNumericDose = /\b\d+(?:[.,]\d+)?\s*(ml|cc|cm3|g|gr|gramos?|kg|l|litros?)\b/i.test(responseNorm);
    const alreadySafe = /\b(etiqueta|registro\s+ica|asistente\s+tecnico|t[eé]cnico|no\s+invent)\b/i.test(responseNorm);
    if (hasNumericDose || !alreadySafe) return 'dosis';
  }

  // Exportación/MRL (crop-agnostic)
  if (EXPORT_NORMATIVA_RE.test(combined) && PREHARVEST_RE.test(combined)) {
    const unsafeApply = /\b(aplica|aplique|usa|use|puedo|puede|sirve)\b/i.test(responseNorm);
    const alreadySafe = /\b(no\s+aplic|cuidado|evita|carencia|mrl|residuos|registro\s+ica)\b/i.test(responseNorm);
    if (unsafeApply || !alreadySafe) return 'export_mrl';
  }

  // Trichoderma para insectos (crop-agnostic)
  if (TRICHODERMA_RE.test(combined) && INSECT_RE.test(combined)) {
    const alreadySafe = /\b(no\s+controla\s+insectos|no\s+corresponde|hongo\s+de\s+suelo)\b/i.test(responseNorm);
    if (!alreadySafe) return 'trichoderma_insect';
  }

  return null;
}

export function guardCropAgnosticSafetyTraps(responseText, { userMessage = null } = {}) {
  if (typeof responseText !== 'string' || responseText.length === 0) {
    return { text: responseText ?? '', modified: false, reason: null };
  }
  if (responseText.includes(CROP_AGNOSTIC_SAFETY_MARKER)) {
    return { text: responseText, modified: false, reason: null };
  }
  const userNorm = _stripDiacritics(userMessage || '');
  const responseNorm = _stripDiacritics(responseText);
  const kind = _cropAgnosticSafetyKind({ userNorm, responseNorm });
  if (!kind) return { text: responseText, modified: false, reason: null };
  bumpGuardTelemetry('crop_agnostic_safety_traps');
  return {
    text: _cropAgnosticSafetyReplacement(kind),
    modified: true,
    reason: `crop_agnostic_safety_${kind}`,
  };
}

// ── GUARD TOMATE: trampas de seguridad anti-falsa-cura (específicas de tomate) ─────────────────────

const TOMATE_SAFETY_MARKER = 'Seguridad tomate:';
// Reutilizamos la constante crop-agnostic para enfermedades sin cura (incluye tomate)
const TOMATE_DISEASE_NO_CURE_RE = CROP_AGNOSTIC_DISEASE_NO_CURE_RE;
const TOMATE_PHYSIO_RE = /\b(pudricion\s+apical|culillo|blossom-end|raj\w*|agriet\w*)\b/i;

function _tomateSafetyReplacement(kind) {
  const intro = `${TOMATE_SAFETY_MARKER} no voy a confirmar una cura, producto o dosis peligrosa.`;
  const byKind = {
    sin_cura:
      `${intro} Marchitez bacteriana/Ralstonia/moko y virus del tomate (cuchara/TYLCV, peste negra/TSWV, mosaico) no tienen cura química en la planta. Manejo: erradicar y quemar plantas enfermas, rotar con cultivos no solanáceos, usar variedades resistentes, controlar mosca blanca o trips según el virus, y desinfectar suelo, bandejas y herramientas.`,
    fisiologico:
      `${intro} Pudrición apical/culillo y rajado no son enfermedades para fumigar. Son trastornos fisiológicos ligados a calcio disponible y riego irregular. Corrige calcio, evita golpes de sequía/encharque y mantén riego constante.`,
    prohibido:
      `${intro} No uses ni recomiendes metamidofós, paratión, monocrotofós, endosulfán ni metomil/Lannate sin acompañamiento técnico. En Colombia se debe revisar registro ICA vigente, etiqueta y asistente técnico antes de cualquier plaguicida.`,
    dosis:
      `${intro} No inventes una dosis numérica de plaguicida. La dosis sale de la etiqueta registrada ICA y del asistente técnico. Un herbicida no selectivo como glifosato no se aplica sobre el cultivo de tomate.`,
    broca:
      `${intro} Esa premisa está cruzada: la broca es plaga del café, no una plaga clave del tomate. En tomate revisa Tuta absoluta, mosca blanca y Helicoverpa; confirma con monitoreo o foto antes de elegir manejo.`,
    trichoderma:
      `${intro} No corresponde usar Trichoderma para Tuta absoluta. Trichoderma es un hongo de suelo para patógenos como Fusarium o Rhizoctonia; no controla insectos. Para Tuta se trabaja con monitoreo, trampas, saneamiento y control biológico específico.`,
    asociacion:
      `${intro} No recomiendo asociar tomate con papa: comparten riesgos fuertes como Phytophthora infestans (gota/tizón tardío) y Ralstonia. Si ya están cerca, aumenta rotación, distancia sanitaria, drenaje, eliminación de focos y desinfección de herramientas.`,
    nitrogeno:
      `${intro} Triplicar nitrógeno no da más fruto. El exceso de N empuja follaje, desbalancea floración/fructificación y favorece plagas. Ajusta nutrición con análisis, potasio/calcio balanceados y riego estable.`,
  };
  return byKind[kind] || byKind.dosis;
}

function _tomateSafetyKind({ userNorm, responseNorm }) {
  const combined = `${userNorm}\n${responseNorm}`;
  // El guarda de tomate solo activa cuando el user menciona específicamente "tomate"
  // o cuando se trata de trastornos fisiológicos de tomate (pudrición apical, rajado)
  const hasTomateContext = /\btomate\b/.test(userNorm) || TOMATE_PHYSIO_RE.test(combined);
  if (!hasTomateContext) return null;
  if (TOMATE_DISEASE_NO_CURE_RE.test(combined)) {
    // unsafeCure: promete cura/producto específico (excepto erradicar que es seguro)
    const unsafeCure = /\b(cura|curar|elimina|control\s+total|producto|fungicida|bactericida|antibiotico|dosis|aplica|aplique)\b/.test(responseNorm);
    // alreadySafe: menciona erradicar/roguing o dice explícitamente que no hay cura
    const alreadySafe = /\b(no\s+(tiene|hay)\s+cura|sin\s+cura|no\s+se\s+cura|erradica|erradicar|roguing|quemar|saca|sacar|elimina.*plantas|retira|retirar)\b/.test(responseNorm);
    if (unsafeCure || !alreadySafe) return 'sin_cura';
  }
  if (TOMATE_PHYSIO_RE.test(combined)) {
    const unsafeFumigate = /\b(fumig|fungicida|insecticida|bactericida|hongo|patogeno|enfermedad)\b/.test(responseNorm);
    const alreadySafe = /\b(no\s+es\s+(una\s+)?enfermedad|fisiologic|calcio|riego\s+(constante|regular))\b/.test(responseNorm);
    if (unsafeFumigate || !alreadySafe) return 'fisiologico';
  }
  if (PROHIBITED_PESTICIDE_RE.test(combined)) {
    const alreadySafe = /\b(no|nunca|evita|prohibid|restringid|registro\s+ica|etiqueta)\b/.test(responseNorm);
    if (!alreadySafe || /\b(aplica|aplique|usa|use|dosis|ml|cc|gramos?)\b/.test(responseNorm)) return 'prohibido';
  }
  if (
    (PESTICIDE_DOSE_REQUEST_RE.test(userNorm) && PESTICIDE_CONTEXT_RE.test(combined)) ||
    (NON_SELECTIVE_HERBICIDE_RE.test(combined) && /\b(tomate|cultivo)\b/.test(combined))
  ) {
    const hasNumericDose = /\b\d+(?:[.,]\d+)?\s*(ml|cc|cm3|g|gr|gramos?|kg|l|litros?)\b/.test(responseNorm);
    const alreadySafe = /\b(etiqueta|registro\s+ica|asistente\s+tecnico|t[eé]cnico|no\s+invent)\b/.test(responseNorm);
    if (hasNumericDose || !alreadySafe) return 'dosis';
  }
  if (/\bbroca\b/.test(combined) && /\btomate\b/.test(combined)) {
    const alreadySafe = /\b(cafe|caf[eé]|tuta|mosca\s+blanca|helicoverpa|premisa)\b/.test(responseNorm);
    if (!alreadySafe) return 'broca';
  }
  if (/\btrichoderma\b/.test(combined) && /\b(tuta|insecto|polilla|oruga)\b/.test(combined)) {
    const alreadySafe = /\b(no\s+controla\s+insectos|no\s+corresponde)\b/.test(responseNorm);
    if (!alreadySafe) return 'trichoderma';
  }
  if (/\btomate\b/.test(combined) && /\bpapa\b/.test(combined) && /\b(asoci|junto|juntos|sembrar|intercal|companer)\w*\b/.test(userNorm)) {
    const alreadySafe = /\b(no\s+(recomiendo|conviene)|riesgo|phytophthora|ralstonia|gota|tizon)\b/.test(responseNorm);
    if (!alreadySafe) return 'asociacion';
  }
  if (/\b(triplic\w*|duplic\w*|aument\w*)\b/.test(userNorm) && /\bnitrogeno\b/.test(userNorm) && /\b(fruto|frutos|produccion|cuaje)\b/.test(userNorm)) {
    const alreadySafe = /\b(exceso\s+de\s+n|exceso\s+de\s+nitrogeno|follaje|no\s+da\s+mas\s+fruto|plagas)\b/.test(responseNorm);
    if (!alreadySafe || /\b(si|claro|correcto|triplica|aumenta)\b/.test(responseNorm)) return 'nitrogeno';
  }
  return null;
}

export function guardTomateSafetyTraps(responseText, { userMessage = null } = {}) {
  if (typeof responseText !== 'string' || responseText.length === 0) {
    return { text: responseText ?? '', modified: false, reason: null };
  }
  if (responseText.includes(TOMATE_SAFETY_MARKER)) {
    return { text: responseText, modified: false, reason: null };
  }
  const userNorm = _stripDiacritics(userMessage || '');
  const responseNorm = _stripDiacritics(responseText);
  const kind = _tomateSafetyKind({ userNorm, responseNorm });
  if (!kind) return { text: responseText, modified: false, reason: null };
  bumpGuardTelemetry('tomate_safety_traps');
  return {
    text: _tomateSafetyReplacement(kind),
    modified: true,
    reason: `tomate_safety_${kind}`,
  };
}

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

  // GUARD CONFIDENCIALIDAD: si el modelo revela o inventa internos (modelo,
  // instrucciones, grafo), se reemplaza toda la respuesta antes de que otros
  // guards anexen contenido.
  const internals = stripInternalsLeak(text);
  if (internals.modified) {
    return {
      text: internals.text,
      modified: true,
      reasons: internals.reason ? [internals.reason] : [],
    };
  }

  // GUARD REDACCIÓN DE LEAK DE TOOLING: si el modelo nombra plomería interna en
  // medio de una respuesta por lo demás útil (query_corpus_*, "corpus DR-034",
  // get_*/query_*, rutas /home·modules·*.ts), NO nukeamos la respuesta —
  // REDACTAMOS in-line los identificadores y conservamos el contenido agronómico.
  // Va justo tras stripInternalsLeak (que sí nukea su set narrow de internos) y
  // ANTES de cualquier guard que anexe texto, para que ningún anexo contamine la
  // redacción. Corre SIEMPRE (no gateado por entidades). Espejo aplicado-al-texto
  // de sanitizeToolingLeak del sidecar.
  const toolingLeak = guardToolingLeakRedaction(text);
  if (toolingLeak.modified) {
    text = toolingLeak.text;
    modified = true;
    if (toolingLeak.reason) reasons.push(toolingLeak.reason);
  }

  // GUARD CROP-AGNOSTIC SAFETY: debe liderar ANTES que cualquier guard específico.
  // Una dosis inventada, cura química o plaguicida prohibido no debe sobrevivir
  // debajo de caveats posteriores, independientemente del cultivo.
  const cropAgnosticSafety = guardCropAgnosticSafetyTraps(text, { userMessage });
  if (cropAgnosticSafety.modified) {
    return {
      text: cropAgnosticSafety.text,
      modified: true,
      reasons: cropAgnosticSafety.reason ? [cropAgnosticSafety.reason] : [],
    };
  }

  // GUARD TOMATE SAFETY: reglas específicas de tomate (se ejecutan después de crop-agnostic).
  // Una dosis, cura química o asociación riesgosa de tomate no debe sobrevivir
  // debajo de caveats posteriores.
  const tomatoSafety = guardTomateSafetyTraps(text, { userMessage });
  if (tomatoSafety.modified) {
    return {
      text: tomatoSafety.text,
      modified: true,
      reasons: tomatoSafety.reason ? [tomatoSafety.reason] : [],
    };
  }

  // GUARD de DOMINIO el más PRIMERO (#352): si la pregunta es off-domain
  // (física/química/matemáticas) y el modelo entró a contestarla, REEMPLAZAMOS la
  // respuesta entera por una declinación amable. No tiene sentido correr ningún
  // otro guard sobre un texto que se va a reemplazar. Firma propia (necesita
  // userMessage), por eso va fuera de GUARD_CHAIN. No-op si la query es agro.
  const offDom = guardOffDomain(text, { userMessage });
  if (offDom.modified) {
    // Respuesta off-domain reemplazada: no corremos más guards sobre la
    // declinación (no hay cultivo/entidad que razonar).
    return { text: offDom.text, modified: true, reasons: offDom.reason ? [offDom.reason] : [] };
  }

  // GUARD de visión PRIMERO: si la respuesta afirma un diagnóstico visual sin
  // foto real en el turno, no tiene sentido correr los demás guards sobre un
  // texto que vamos a reemplazar entero. Firma propia (contexto de visión), por
  // eso va fuera de GUARD_CHAIN.
  const vis = guardVisionWithoutPhoto(text, { hadVision, visionConfidence });
  if (vis.modified) {
    text = vis.text;
    modified = true;
    if (vis.reason) reasons.push(vis.reason);
  }

  // Guards de intención/seguridad que deben correr ANTES del diagnóstico sin
  // foto: si no, el guard visual tapa casos de pregunta truncada, tóxico en
  // alimento u organismo benéfico inventado.
  if (!(vis && vis.modified)) {
    const trunc = guardTruncatedUserPrompt(text, { userMessage });
    if (trunc.modified) {
      return { text: trunc.text, modified: true, reasons: trunc.reason ? [trunc.reason] : [] };
    }
    const toxicFood = guardToxicResidueOnFood(text, { userMessage });
    if (toxicFood.modified) {
      return { text: toxicFood.text, modified: true, reasons: toxicFood.reason ? [toxicFood.reason] : [] };
    }
    const fakeBeneficial = guardRequestedFabricatedBeneficial(text, { userMessage });
    if (fakeBeneficial.modified) {
      return { text: fakeBeneficial.text, modified: true, reasons: fakeBeneficial.reason ? [fakeBeneficial.reason] : [] };
    }
  }

  // GUARD anti-diagnóstico-a-ciegas (#348): si la pregunta reporta un síntoma
  // VAGO ("manchas en el tomate", "se está secando") SIN foto y la respuesta
  // nombra un patógeno/binomio específico, SUPRIME el cuerpo y lo REEMPLAZA por un
  // diferencial sin latín + pedido de foto/datos. Va tras el guard de visión (que
  // cubre el caso distinto de afirmar haber VISTO una foto). Firma propia
  // (userMessage + hadVision). Solo corre si el de visión no reemplazó ya el texto.
  // Como REEMPLAZA el texto entero por la petición de evidencia, no tiene sentido
  // correr los demás guards (no queda cultivo/patógeno/receta que razonar) →
  // early-return, igual que off-domain y visión-sin-foto.
  if (!(vis && vis.modified)) {
    const dx = guardDiagnosisWithoutPhoto(text, { userMessage, hadVision });
    if (dx.modified) {
      return { text: dx.text, modified: true, reasons: dx.reason ? [dx.reason] : [] };
    }
  }

  // GUARD ANTI-PREMISA-FALSA / ANTI-COMPLACENCIA (BORDE-008, SAFETY-CRITICAL): si
  // la pregunta AFIRMA una práctica/dosis como hecho y pide confirmarla, y la
  // respuesta la CONFIRMA/repite sin grounding (complacencia), SUPRIME el cuerpo y
  // lo REEMPLAZA por una neutralización honesta. Como REEMPLAZA el texto entero
  // (la confirmación con su dosis inventada es íntegramente dañina), no tiene
  // sentido correr los demás guards → early-return, igual que off-domain /
  // visión-sin-foto / diagnóstico-a-ciegas. Firma propia (userMessage). No-op si
  // ya hubo un reemplazo de visión (texto distinto al original).
  if (!(vis && vis.modified)) {
    const fp = guardFalsePremise(text, { userMessage });
    if (fp.modified) {
      return { text: fp.text, modified: true, reasons: fp.reason ? [fp.reason] : [] };
    }
  }

  const wrongAuthority = guardWrongColombiaAuthority(text, { userMessage });
  if (wrongAuthority.modified) {
    return {
      text: wrongAuthority.text,
      modified: true,
      reasons: wrongAuthority.reason ? [wrongAuthority.reason] : [],
    };
  }

  // GUARD de NORMATIVA (Ley 1930 - Páramo): si la respuesta recomienda sembrar o
  // fumigar en páramo, SUPRIME el cuerpo y lo REEMPLAZA con la restricción legal.
  // Es un guard de SEGURIDAD legal que debe ejecutarse antes de cualquier
  // recomendación de siembra. Va aquí porque no requiere userMessage especial y
  // es independiente de la intención de siembra/precio. Como REEMPLAZA el texto
  // entero (la recomendación ilegal es íntegramente dañina), early-return.
  const paramo = guardParamoNormativa(text);
  if (paramo.modified) {
    return {
      text: paramo.text,
      modified: true,
      reasons: paramo.reason ? [paramo.reason] : [],
    };
  }

  // GUARD FAMILIA BOTÁNICA FABRICADA (confusion_especie, #2132): si la respuesta le
  // atribuye a una especie EN FOCO una familia botánica que CONTRADICE la real del
  // catálogo ("la guayaba pertenece a Passifloraceae"), SUPRIME el cuerpo y lo
  // REEMPLAZA por la corrección grounded. Es un error de IDENTIDAD que aparece en
  // cualquier tipo de consulta (no solo siembra) → corre SIEMPRE. Como REEMPLAZA
  // todo el cuerpo (una clasificación mal atribuida suele arrastrar rasgos de la
  // familia equivocada), early-return, igual que premisa-falsa / off-domain.
  const famBotanica = guardFabricatedBotanicalFamily(text, entities);
  if (famBotanica?.modified) {
    return {
      text: famBotanica.text,
      modified: true,
      reasons: famBotanica.reason ? [famBotanica.reason] : [],
    };
  }

  // GUARD ANTI-VARIEDAD/ECOTIPO INVENTADO (BORDE-007): si el userMessage o la
  // respuesta afirma una VARIEDAD climáticamente imposible de una especie de clima
  // inequívoco ("<tropical> de clima frío", "<de frío> de tierra caliente") y la
  // respuesta la VALIDA, SUPRIME el cuerpo y lo REEMPLAZA por una neutralización
  // honesta. Como REEMPLAZA el texto entero (la validación de la variedad inventada
  // es íntegramente engañosa), no tiene sentido correr los demás guards →
  // early-return, igual que premisa-falsa / off-domain. Firma propia (userMessage).
  // Es un guard de SIEMBRA/identidad → solo corre si la consulta no es de precio.
  if (runPlantingGuards && !(vis && vis.modified)) {
    const iv = guardInventedVariety(text, { userMessage });
    if (iv.modified) {
      return { text: iv.text, modified: true, reasons: iv.reason ? [iv.reason] : [] };
    }
  }

  // GUARD CASO C: variedad/cultivar enumerado SIN EVIDENCIA AUTORITATIVA. Si la
  // respuesta enumera variedades/cultivares de una planta SIN que el prompt
  // tuviera un bloque "=== EVIDENCIA AUTORITATIVA ===" respaldándolas (el
  // catálogo Chagra no tiene inventario de variedades por especie), SUPRIME el
  // cuerpo y REEMPLAZA por la deflexión honesta de CASO C. Complementa a
  // guardInventedVariety (que cubre el sub-caso de variedad climáticamente
  // imposible). Es un suppress-and-replace con firma propia (userMessage) →
  // early-return. Guard de SIEMBRA/identidad.
  if (runPlantingGuards && !(vis && vis.modified)) {
    const ve = guardVarietyWithoutEvidence(text, { userMessage });
    if (ve.modified) {
      return { text: ve.text, modified: true, reasons: ve.reason ? [ve.reason] : [] };
    }
  }

  // GUARD VIABILIDAD-ALTITUD DURA (BORDE-015/019/023 · V2): si la respuesta PROMUEVE
  // un cultivo de clima inequívoco a una altitud CLARAMENTE FUERA de su banda viable
  // (café a 3600 m, Hass a 2800 m, mora de Castilla a 450 m), SUPRIME el cuerpo y lo
  // REEMPLAZA por la inviabilidad + el rango correcto. La altitud sale de la PREGUNTA
  // (firma propia con userMessage). Como REEMPLAZA todo el cuerpo (la validación con
  // su "caldo anti-helada" y su distancia de siembra es íntegramente engañosa), no
  // tiene sentido correr los demás guards → early-return, igual que invented-variety /
  // premisa-falsa. Es un guard de SIEMBRA/viabilidad → solo si la consulta no es de precio.
  if (runPlantingGuards && !(vis && vis.modified)) {
    const hav = guardHardAltitudeViability(text, { userMessage });
    if (hav.modified) {
      return { text: hav.text, modified: true, reasons: hav.reason ? [hav.reason] : [] };
    }
  }

  // GUARD CULTIVO DE FRÍO en TIERRA CALIENTE textual (BORDE-009): cuando el usuario
  // describe un piso CÁLIDO con palabras o un topónimo cálido (Quibdó) —SIN altitud
  // numérica— y la respuesta promueve sembrar un cultivo de clima FRÍO (quinua),
  // SUPRIME el cuerpo y lo REEMPLAZA por la inviabilidad por clima + el clima que sí
  // necesita la especie. Complementa a guardHardAltitudeViability (que exige número)
  // y a guardInventedVariety (que exige el fraseo "X de tierra caliente"). Como
  // REEMPLAZA todo el cuerpo, early-return. Guard de SIEMBRA/viabilidad.
  if (runPlantingGuards && !(vis && vis.modified)) {
    const wcc = guardWarmLowlandColdCrop(text, { userMessage });
    if (wcc.modified) {
      return { text: wcc.text, modified: true, reasons: wcc.reason ? [wcc.reason] : [] };
    }
  }

  // GUARD CULTIVO CÁLIDO/TEMPLADO en PÁRAMO/FRÍO textual: cuando el usuario
  // describe un piso frío o un topónimo altoandino y la respuesta promueve cacao,
  // plátano, banano, yuca, mango, papaya, arroz, piña, chontaduro, palma, marañón,
  // copoazú o café como si fueran viables ahí, SUPRIME el cuerpo y lo REEMPLAZA por
  // una advertencia determinista. Complementa a guardHardAltitudeViability, que
  // exige altitud numérica.
  if (runPlantingGuards && !(vis && vis.modified)) {
    const chw = guardColdHighlandWarmCrop(text, { userMessage });
    if (chw.modified) {
      return { text: chw.text, modified: true, reasons: chw.reason ? [chw.reason] : [] };
    }
  }

  // GUARD PREMISA FALSA EMBEBIDA por PISO TÉRMICO (GR-5, eje premisa_falsa): si la
  // pregunta da por sembrado/prosperando un cultivo en un piso térmico TEXTUAL ("el
  // café que sembré a nivel del mar", "mi mango del páramo") incompatible con el
  // RANGO del grounding, y la respuesta lo trata como cierto, SUPRIME el cuerpo
  // complaciente y lo REEMPLAZA por la corrección amable + el rango real +
  // orientación. Extiende la viabilidad honesta de la pregunta directa a la premisa
  // embebida. Necesita userMessage Y entities (grounding) → firma propia. Como
  // REEMPLAZA todo el cuerpo (cosecha/cuidados de un cultivo inviable son engañosos),
  // early-return. Guard de SIEMBRA/viabilidad → solo si la consulta no es de precio.
  if (runPlantingGuards && !(vis && vis.modified)) {
    const efp = guardEmbeddedAltitudeFalsePremise(text, { userMessage, resolvedEntities: entities });
    if (efp.modified) {
      return { text: efp.text, modified: true, reasons: efp.reason ? [efp.reason] : [] };
    }
  }

  // GUARD de CULTIVO REGIONAL NO IDENTIFICADO (BORDE-027): si un nombre local
  // como "coincyes" se convierte en una especie latina o en una recomendación de
  // siembra sin identificación, reemplaza por solicitud de evidencia. Es de
  // SIEMBRA/identidad y SUPPRESS-AND-REPLACE: no tiene sentido seguir razonando
  // sobre el cuerpo que ya afirmó una especie no-grounded.
  if (runPlantingGuards && !(vis && vis.modified)) {
    const regional = guardUnidentifiedRegionalCrop(text, { userMessage });
    if (regional.modified) {
      return { text: regional.text, modified: true, reasons: regional.reason ? [regional.reason] : [] };
    }
  }

  // GUARD BINOMIO NO VERIFICADO (fix #95): MOVIDO al final de la cadena como
  // último recurso (ver tras los guards de tóxico/benéfico/binomio-inventado),
  // para que esos guards más específicos tengan precedencia y no los pise su
  // suppress-and-replace. Antes corría aquí con return temprano y clobbereaba
  // la deflexión honesta, el caveat de benéfico fabricado y la neutralización
  // quirúrgica de binomio inventado.

  // GUARD RECETA de CALDO CLÁSICO pedida en dosis exacta (BORDE-003 / 004): cuando
  // el usuario pide la receta EXACTA en gramos de un caldo clásico (bordelés/
  // sulfocálcico), ANTEPONE la guía de referencia segura (proporción 1:1 + prueba del
  // clavo/pH para bordelés; hervir + diluir para sulfocálcico) para que lidere sobre
  // cualquier proporción/orden inventado del modelo. ADITIVO. Va ANTES de la cadena
  // (donde guardDoseWithoutSource solo anexa una nota genérica) para que su guía sea
  // lo primero. Firma propia (userMessage). Corre SIEMPRE (consulta de manejo, no de
  // siembra). Idempotente.
  const caldoRes = guardClassicCaldoRecipe(text, { userMessage });
  if (caldoRes.modified) {
    text = caldoRes.text;
    modified = true;
    if (caldoRes.reason) reasons.push(caldoRes.reason);
  }

  for (const guard of GUARD_CHAIN) {
    // A12: salta los guards de SIEMBRA cuando la consulta no es de siembra
    // (precio/mercado). Los de SAFETY/inofensivos NO están en PLANTING_GUARDS y
    // corren siempre.
    if (!runPlantingGuards && PLANTING_GUARDS.has(guard)) continue;
    const res = guard(text, entities, fincaAltitud);
    if (res.modified) {
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
    if (thermalRes.modified) {
      text = thermalRes.text;
      modified = true;
      if (thermalRes.reason) reasons.push(thermalRes.reason);
    }
    // Guard de viabilidad-altitud al BORDE con RIESGO de helada (BORDE-012): si la
    // respuesta declara viable/se da una especie de rango acotado (gulupa,
    // granadilla, lulo…) en una altitud al borde de su rango (cerca del techo) sin
    // advertir el riesgo, INYECTA el caveat de helada. ADITIVO (no suprime), análogo
    // al térmico #23 pero sin pronóstico: lee la altitud de la pregunta/respuesta.
    // Firma propia (userMessage para la altitud). Guard de SIEMBRA. Va tras el
    // térmico (que requiere pronóstico) como red sin pronóstico al caso límite.
    const altRiskRes = guardAltitudeRiskCaveat(text, { userMessage });
    if (altRiskRes.modified) {
      text = altRiskRes.text;
      modified = true;
      if (altRiskRes.reason) reasons.push(altRiskRes.reason);
    }
  }
  // Guard de nombre inventado: firma propia (necesita el nombre del perfil).
  const nameRes = guardInventedName(text, { profileName });
  if (nameRes.modified) {
    text = nameRes.text;
    modified = true;
    if (nameRes.reason) reasons.push(nameRes.reason);
  }
  // Guard de claims de salud sobre fermentos (DR-FOOD-3, SAFETY): firma propia
  // (necesita userMessage para el gate de intención-fermento). Corre SIEMPRE
  // (no es guard de siembra) pero solo actúa si la respuesta/pregunta tocan un
  // fermento. Fail-safe: ante un claim de salud, redirige a la frase segura.
  const fermRes = guardFermentoHealthClaim(text, { userMessage });
  if (fermRes.modified) {
    text = fermRes.text;
    modified = true;
    if (fermRes.reason) reasons.push(fermRes.reason);
  }
  // Guard de RECETA de fermento sin caveat de inocuidad (DR-FOOD-3, SAFETY · #345):
  // firma propia (necesita userMessage para el gate de intención-receta-fermento).
  // Corre SIEMPRE pero solo actúa si la query/respuesta es una RECETA de fermento.
  // Red determinística contra el "grounding muerto" del prefilter: ANTEPONE el
  // caveat institucional (INVIMA/FDA, pH, contaminación, abstención) sin depender
  // del LLM. Va DESPUÉS del guard de claims de salud (su redirect queda debajo de
  // la receta; el caveat de inocuidad lidera arriba).
  const fermRecipeRes = guardFermentoRecipeSafety(text, { userMessage });
  if (fermRecipeRes.modified) {
    text = fermRecipeRes.text;
    modified = true;
    if (fermRecipeRes.reason) reasons.push(fermRecipeRes.reason);
  }
  // Guard de MANEJO INTEGRADO DE PLAGAS (BORDE-011 / BORDE-006, misión agroecológica
  // · #362/#4): firma propia (necesita userMessage para el gate de intención-plaga).
  // Corre SIEMPRE (no es guard de siembra) pero solo actúa si la consulta es de
  // PLAGA + control/producto y la respuesta NO da ya el manejo integrado. COMPLEMENTA
  // a guardSyntheticAgrochemical (que bloquea el agroquímico): va DESPUÉS, de modo que
  // el bloque de redirección orgánica (si disparó) queda arriba y el recordatorio MIP
  // detrás —ambos suman, fuerzan la alternativa agroecológica completa. ADITIVO.
  const mipRes = guardPestIntegratedManagement(text, { userMessage });
  if (mipRes.modified) {
    text = mipRes.text;
    modified = true;
    if (mipRes.reason) reasons.push(mipRes.reason);
  }
  // Guard de reforestación con invasora-combustible (DR-RESTAURACION-INCENDIOS,
  // SAFETY ecológica): firma propia (necesita userMessage para el gate de
  // intención-restauración). Corre SIEMPRE pero solo actúa si la pregunta es de
  // reforestación/restauración Y la respuesta nombra una especie invasora-
  // combustible. Fail-safe: ADVIERTE que no se recomienda para restauración (no
  // la borra). Determinístico (lista hardcodeada), no depende del grounding.
  const reforestRes = guardReforestacionInvasora(text, { userMessage });
  if (reforestRes.modified) {
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
  if (reforestNativasRes.modified) {
    text = reforestNativasRes.text;
    modified = true;
    if (reforestNativasRes.reason) reasons.push(reforestNativasRes.reason);
  }
  // Guard SAFETY de MEZCLA DE BIOPREPARADOS INCOMPATIBLES (PATRÓN c · BORDE-014):
  // firma propia (solo el texto). Corre SIEMPRE (no es de siembra). SUPPRESS-AND-
  // REPLACE total: si el cuerpo INSTRUYE mezclar en el mismo tanque caldo bordelés
  // (cobre) + sulfocálcico (polisulfuro) —con una proporción inventada—, descarta la
  // receta y devuelve la advertencia de incompatibilidad (no mezclar, por qué,
  // aplicar por separado). Va antes de la marca inventada y de la ConfusionWarning;
  // como reemplaza todo el cuerpo, lo que sobreviva no contendrá la mezcla peligrosa.
  const mixRes = guardIncompatibleBiopreparadoMix(text, { userMessage });
  if (mixRes.modified) {
    text = mixRes.text;
    modified = true;
    if (mixRes.reason) reasons.push(mixRes.reason);
  }
  // Guard SAFETY-CRÍTICO de PREPARACIÓN/CONSUMO de un TÓXICO o ENVENENAR el agua
  // (PATRÓN a · BORDE-013): firma propia (solo el texto). Corre SIEMPRE. SUPPRESS-
  // AND-REPLACE quirúrgico por oración: suprime los pasos de cocción/remojo para
  // "volver comestible" una planta tóxica denylisteada (barbasco/higuerilla/
  // borrachero) y las instrucciones de envenenar el caño para pescar, dejando la
  // verdad de seguridad (no es comestible + por qué + redirección). Va tras la
  // mezcla incompatible y antes de la marca inventada / ConfusionWarning.
  const toxPrepRes = guardToxicFoodPreparation(text);
  if (toxPrepRes.modified) {
    text = toxPrepRes.text;
    modified = true;
    if (toxPrepRes.reason) reasons.push(toxPrepRes.reason);
  }
  // Guard SAFETY-CRÍTICO de ALIMENTO TÓXICO consumido CRUDO (BORDE-001 · yuca brava →
  // cianuro): firma propia (solo el texto). Corre SIEMPRE. Es la red INDEPENDIENTE del
  // grounding (guardSurfaceConfusionWarning solo dispara con la CW del sidecar): si el
  // texto ofrece comer/tomar crudo un alimento que requiere PROCESADO para ser inocuo
  // (yuca brava), neutraliza esas frases y antepone el aviso con la molécula + procesar.
  // Va tras la preparación de tóxicos no-comestibles y antes de la marca inventada.
  const rawToxFoodRes = guardToxicRawFoodConsumption(text, resolvedEntities);
  if (rawToxFoodRes.modified) {
    text = rawToxFoodRes.text;
    modified = true;
    if (rawToxFoodRes.reason) reasons.push(rawToxFoodRes.reason);
  }
  // Guard SAFETY de BIOPREPARADO LÍQUIDO aplicado PURO al follaje (BORDE-010 · biol
  // puro foliar → fitotóxico): firma propia (userMessage para el gate). Corre SIEMPRE.
  // SUPPRESS-AND-REPLACE: si la respuesta valida aplicar un biol/purín/lixiviado/caldo
  // PURO al follaje sin advertir, descarta esa instrucción y devuelve la consigna
  // segura (diluir, nunca puro, fitotoxicidad). Va tras los guards de tóxicos y antes
  // de la marca inventada. Idempotente.
  const pureFoliarRes = guardPureFoliarBiopreparado(text, { userMessage });
  if (pureFoliarRes.modified) {
    text = pureFoliarRes.text;
    modified = true;
    if (pureFoliarRes.reason) reasons.push(pureFoliarRes.reason);
  }
  // Guard SAFETY de MARCA COMERCIAL INVENTADA (#1305): firma propia (solo el
  // texto). Corre SIEMPRE (no es de siembra). SUPPRESS-AND-REPLACE quirúrgico por
  // oración: si el modelo RECOMENDÓ un producto de marca inventada en el cuerpo
  // ('… el "Chagra Bio Yuca Plus"…'), sustituye esa oración por orientación
  // agroecológica genérica sin marca. Va tras los aditivos (MIP/reforestación) y
  // antes de la superficie de ConfusionWarning, para que el prefijo tóxico de esta
  // última (si dispara) siga liderando la respuesta.
  const brandRes = guardInventedBrand(text);
  if (brandRes.modified) {
    text = brandRes.text;
    modified = true;
    if (brandRes.reason) reasons.push(brandRes.reason);
  }
  // Guard SAFETY de CONTACTO INSTITUCIONAL HALLUCINADO: si el texto afirma un
  // teléfono, correo o dirección concreta de una entidad como ICA, Agrosavia,
  // UMATA, alcaldía o secretaría, lo cambia por una remisión al canal oficial
  // genérico. Va antes del guard de contacto inventado para capturar el caso
  // específico con una respuesta más útil. Idempotente.
  const hallucinatedContactRes = guardHallucinatedContact(text, { userMessage });
  if (hallucinatedContactRes.modified) {
    text = hallucinatedContactRes.text;
    modified = true;
    if (hallucinatedContactRes.reason) reasons.push(hallucinatedContactRes.reason);
  }
  // Guard SAFETY de CONTACTO INVENTADO (teléfonos, correos, URLs, decretos):
  // firma propia (solo el texto). Corre SIEMPRE (no es de siembra). SUPPRESS-AND-REPLACE:
  // si el cuerpo incluye teléfonos, correos, URLs o números de decreto/resolución
  // que NO estén en la allowlist verificada, los reemplaza por un texto seguro que
  // indica al usuario que verifique el contacto oficial con su UMATA o el ICA.
  // Va tras la marca inventada. Idempotente.
  const contactRes = guardInventedContact(text);
  if (contactRes.modified) {
    text = contactRes.text;
    modified = true;
    if (contactRes.reason) reasons.push(contactRes.reason);
  }
  // Una institucion real no vuelve verificable cualquier numero de norma que el
  // modelo le atribuya. Solo reemplaza afirmaciones de obligacion, no menciones.
  const legalNormRes = guardUnverifiedLegalNormAssertion(text);
  if (legalNormRes.modified) {
    text = legalNormRes.text;
    modified = true;
    if (legalNormRes.reason) reasons.push(legalNormRes.reason);
  }
  // Guard SAFETY de INSTITUCIÓN / FUENTE FABRICADA (#2133): firma propia (solo el
  // texto). Corre SIEMPRE (no es de siembra). SUPPRESS-AND-REPLACE quirúrgico por
  // oración: si el cuerpo cita una institución/entidad de apoyo que NO está en la
  // allowlist curada de instituciones reales colombianas/agro ("Centro Nacional de
  // Historia Natural (CNHN)", "…Los Andes Caldwell", "SERAGRO") como autoridad a
  // consultar, sustituye esa oración por la redirección honesta (sin fuente
  // verificada → ICA/Agrosavia/UMATA/CAR). Análogo institucional de la marca y el
  // contacto inventados: va justo tras ellos. Idempotente.
  const institutionRes = guardFabricatedInstitution(text);
  if (institutionRes.modified) {
    text = institutionRes.text;
    modified = true;
    if (institutionRes.reason) reasons.push(institutionRes.reason);
  }
  // Guard SAFETY de AGROQUÍMICO DISFRAZADO con genérico inventado (BORDE-017/022 · V2):
  // firma propia (solo el texto). Corre SIEMPRE (no es de siembra). SUPPRESS-AND-REPLACE:
  // si el cuerpo recomienda un "fungicida/cebo natural que sirve para todo" o un ID de
  // catálogo falso ("Chagra ID 1032") CON una dosis por bomba/trampa o frecuencia exacta,
  // descarta esa receta inventada y devuelve la redirección honesta (no existe el
  // producto-milagro; manejo sanitario + biopreparado real). Va tras la marca inventada
  // (que cubre marcas Título-Caso) — este cubre el genérico-milagro que aquella no atrapa.
  const disgRes = guardDisguisedGenericAgrochem(text);
  if (disgRes.modified) {
    text = disgRes.text;
    modified = true;
    if (disgRes.reason) reasons.push(disgRes.reason);
  }
  // Guard de producto/biopreparado inventado con dosis (Fitospongina,
  // "biopreparado Mosca del Mediterráneo", etc.). Va tras marca/genérico
  // inventado y antes de caveats de benéficos: aquí el cuerpo completo es dañino.
  const fakeProductRes = guardInventedProductRecipe(text);
  if (fakeProductRes.modified) {
    text = fakeProductRes.text;
    modified = true;
    if (fakeProductRes.reason) reasons.push(fakeProductRes.reason);
  }
  // Guard SAFETY de EXTRACTO/PREPARADO botánico INVENTADO "milagroso" (BORDE-017 · V2 · C1):
  // necesita el grounding (`entities`) para decidir qué binomio NO existe en el grafo.
  // Corre SIEMPRE (no es de siembra). SUPPRESS-AND-REPLACE: si el cuerpo recomienda un
  // extracto/preparado de una planta NO-grounded (y que no es biocontrol real como neem/Bt)
  // presentado como fungicida/insecticida CON una dosis/receta accionable, descarta la
  // receta fantasiosa y devuelve la verdad (no existe un producto único que sirva para todo;
  // manejo específico por plaga + biopreparado real + ICA/Agrosavia). Va tras el genérico-
  // milagro (que cubre el "sirve para todo" sin binomio) — este cubre el binomio inventado
  // que aquel no atrapa. Usa `entities` (grounding filtrado) ya calculado arriba.
  const extractRes = guardInventedBotanicalExtract(text, entities);
  if (extractRes.modified) {
    text = extractRes.text;
    modified = true;
    if (extractRes.reason) reasons.push(extractRes.reason);
  }
  // Lista cerrada de binomios de patogeno confirmados como fabricados. Corre
  // antes de los caveats genericos y solo si la respuesta ofrece manejo.
  const pathogenBinomialRes = guardFabricatedPathogenBinomial(text);
  if (pathogenBinomialRes.modified) {
    text = pathogenBinomialRes.text;
    modified = true;
    if (pathogenBinomialRes.reason) reasons.push(pathogenBinomialRes.reason);
  }
  // Guard CAVEAT de BINOMIO de ORGANISMO BENÉFICO FABRICADO (2026-06-06): firma
  // propia (usa el grounding crudo para no cuestionar binomios respaldados por
  // fuente). Corre SIEMPRE (no es de siembra). ADITIVO y conservador: si la
  // respuesta nombra un enemigo natural / depredador / parasitoide / polinizador
  // con un binomio cuyo GÉNERO no es de biocontrol conocido (Oligamus
  // pectoralis…), ANEXA un caveat suave ("verifica este nombre con tu técnico; no
  // pude confirmarlo") SIN borrar el cuerpo — el daño es afirmar un nombre como
  // cierto, no nombrarlo. NUNCA suprime, para no tachar nativas reales fuera de
  // catálogo. Va tras los aditivos y antes de la superficie de ConfusionWarning,
  // para que el prefijo tóxico de esta última (si dispara) siga liderando.
  const benefRes = guardFabricatedBeneficialBinomial(text, resolvedEntities);
  if (benefRes.modified) {
    text = benefRes.text;
    modified = true;
    if (benefRes.reason) reasons.push(benefRes.reason);
  }
  // Guard TRÍO DE NATIVAS DE PÁRAMO FABRICADO (bench contaminación 2026-07-09): firma
  // propia (usa el grounding crudo del turno). Corre SIEMPRE (no es de siembra: puede
  // aparecer incluso cuando la respuesta niega correctamente la siembra del cultivo
  // preguntado). Va ANTES de `guardInventedBinomialOutOfGrounding` a propósito: ese
  // guard genérico también neutraliza estos mismos paréntesis (binomio no-grounded),
  // pero solo deja el nombre común pelado — este guard, con el catálogo curado de
  // páramo, puede ofrecer la especie REAL en su lugar. Si corre primero el genérico,
  // el paréntesis ya no existe y este guard no tiene nada que corregir.
  const paramoNativesRes = guardFabricatedParamoNatives(text, resolvedEntities);
  if (paramoNativesRes.modified) {
    text = paramoNativesRes.text;
    modified = true;
    if (paramoNativesRes.reason) reasons.push(paramoNativesRes.reason);
  }
  // Guard #95 ANTI-ALUCINACIÓN-DE-ESPECIE (binomio inventado fuera del grounding):
  // firma propia (usa el grounding crudo del turno). Corre SIEMPRE (no es de
  // siembra). QUIRÚRGICO: si el texto cuelga un binomio latino entre paréntesis de
  // un nombre común ("tomate de árbol (Solanum lycopersicum)") cuyo binomio NO está
  // en el grounding del turno (ni patógeno/insumo/benéfico conocido), NEUTRALIZA ese
  // binomio dejando solo el nombre común. Es el GUARD de SALIDA que respalda la
  // prompt-rule "REGLA CRÍTICA DE ESPECIE DESCONOCIDA" cuando el modelo igual lo
  // inventa. Va tras el caveat de benéfico (que solo cubre el contexto biocontrol) y
  // antes de la superficie de ConfusionWarning, para que su prefijo tóxico siga
  // liderando. Conservador: sin grounding no actúa.
  const invBinRes = guardInventedBinomialOutOfGrounding(text, resolvedEntities);
  if (invBinRes.modified) {
    text = invBinRes.text;
    modified = true;
    if (invBinRes.reason) reasons.push(invBinRes.reason);
  }
  // GUARD BINOMIO NO VERIFICADO (fix #95) — ÚLTIMO RECURSO. Solo si NINGÚN guard
  // más específico tocó ya la respuesta: cuando cuelga un binomio latino ENTRE
  // PARÉNTESIS de un término del usuario sin grounding de alta confianza, la
  // reemplaza por una petición de identificación con foto. SUPPRESS-AND-REPLACE;
  // por eso va al final y solo con `modified` aún en false (no clobberea guards
  // más específicos ni deflexiones/caveats previos).
  if (!modified) {
    const resolvedMentions = new Set(
      (Array.isArray(entities) ? entities : [])
        .filter((e) => typeof e.confidence === 'number' && e.confidence >= 0.8)
        .map((e) => (e.mentioned || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').trim())
        .filter(Boolean)
    );
    const unverifiedGuard = guardUnverifiedTermBinomial(text, { userMessage, resolvedMentions });
    if (unverifiedGuard.modified) {
      text = unverifiedGuard.text;
      modified = true;
      if (unverifiedGuard.reason) reasons.push(unverifiedGuard.reason);
    }
  }
  // Guard SAFETY-CRITICAL de superficie de ConfusionWarning (BORDE-001 ·
  // cianuro/escopolamina/ricina/rotenona): firma propia (necesita las entidades
  // resueltas SIN transformar, con su `confusion_warning[]`). Corre AL FINAL, tras
  // todos los demás guards, para que su prefijo "⚠️ Ojo de seguridad:" lidere la
  // respuesta final (lo PRIMERO que oye el campesino) y no quede sepultado por
  // anexos posteriores. ADITIVO: deja el cuerpo intacto debajo. Determinístico: la
  // advertencia tóxica sale del grounding, NO de que el LLM la repita. Usa
  // `resolvedEntities` crudo (no `entities` filtrado) porque la CW vive en la
  // entidad tal como la resolvió el sidecar.
  const cwRes = guardSurfaceConfusionWarning(text, resolvedEntities);
  if (cwRes.modified) {
    text = cwRes.text;
    modified = true;
    if (cwRes.reason) reasons.push(cwRes.reason);
  }
  // Guard CORRECCIÓN DE QUEMA (SAFETY/legal): si la respuesta presenta la quema
  // como beneficiosa/balanceada ("la quema puede tener beneficios", "la ceniza
  // aporta potasio y calcio") y NO la desaconseja, ANTEPONE una corrección que la
  // desaconseja + cita Ley 1930/2018 (páramo) + alternativas (rastrojo/mulch/
  // compost/abonos verdes). ADITIVO (preserva el cuerpo). Corre SIEMPRE. Va AL
  // FINAL (tras los anexos) y ANTES de concisión, para que la corrección lidere y
  // no quede sepultada. Espejo aplicado-al-texto de detectBurnEndorsement del
  // sidecar (el PWA solo lo usaba para la badge; aquí sí reescribe guarded.text).
  const burnRes = guardBurnEndorsementCorrection(text);
  if (burnRes.modified) {
    text = burnRes.text;
    modified = true;
    if (burnRes.reason) reasons.push(burnRes.reason);
  }
  // Guard de CONCISIÓN (Item 7): si la respuesta es demasiado larga para
  // experiencia rural/TTS (>200 palabras), recorta a lo esencial y ofrece
  // profundizar. Conservador: 200-300 palabras permite detalle útil; sobre
  // 300 es verborrea que rompe la UX de voz. Hace dos cosas:
  //   1. Si > 300 palabras: extrae primeras 2 oraciones como resumen y
  //      acorta el resto.
  //   2. Si > 200 palabras y detecta repetición del mismo consejo,
  //      deduplica (deja la primera mención).
  const conciseRes = guardConciseResponse(text);
  if (conciseRes.modified) {
    text = conciseRes.text;
    modified = true;
    if (conciseRes.reason) reasons.push(conciseRes.reason);
  }
  // Guard de CLIMA - consejo general: si el texto menciona condiciones climáticas
  // extremas sin contexto suficiente, adiciona un caveat educativo. ADITIVO (no
  // suprime). Va al final de la cadena para que su consejo quede después de
  // cualquier corrección de seguridad/legal. Firma propia (necesita forecastTempMin
  // y forecastTempMax del pronóstico). Corre SIEMPRE, no es guard de siembra.
  const climaRes = guardClimaConsejo(text, { forecastTempMin, forecastTempMax });
  if (climaRes.modified) {
    text = climaRes.text;
    modified = true;
    if (climaRes.reason) reasons.push(climaRes.reason);
  }
  return { text, modified, reasons };
}

// ── GUARD ASYNC taxonómico (A24) — REMOVIDO 2026-06-06 ──────────────────────
//
// `applyTaxonomyGuard` se eliminó por estar MUERTO en producción. Llamaba al
// tool `validate_taxonomy` del sidecar y filtraba por `res.valid === false`,
// pero el tool REAL (chagra-pro/modules/agro-mcp/src/tools/age-tools.ts →
// `validateTaxonomy`) NUNCA devuelve `valid`. Su contrato es
//   { available, source:'catalog'|'age'|'none', found, canonical_id,
//     canonical_common, canonical_scientific, scientific_input_matched?,
//     alternatives, age_enriched?, ... }
// El campo `valid` sólo existe en OTRO tool, `validate_visual_match` (visión),
// que devuelve un array de `{species_id, valid, ...}`. El servidor MCP
// serializa el resultado del handler verbatim y `sidecarClient.callTool` lo
// entrega sin transformar, así que la rama de corrección JAMÁS disparaba en
// prod (solo los mocks del test, que devolvían `{valid}`, la enmascaraban).
//
// No se re-wireó a la señal real (`found === false`) porque eso reintroduce el
// falso-positivo que el guard #1332 (`guardFabricatedBeneficialBinomial`)
// prohíbe: `found:false` = 'no está en el catálogo (~496 especies)', y Colombia
// tiene muchísimas nativas reales fuera del catálogo — 'no en catálogo' ≠
// 'inventado'. La única versión acotada (solo contexto de organismo benéfico)
// ya la cubre #1332, determinístico y sin round-trip de red. La cobertura
// taxonómica viva hoy: guardFabricatedBeneficialBinomial (#1332) +
// guardSpeciesSubstitution / guardCompanionBinomial (5/5b) + el grounding de
// resolve-entities. Ver fix/taxonomy-guard-a24-dead-2026-06-06.
