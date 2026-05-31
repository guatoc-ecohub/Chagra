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

  const intro =
    'Una nota importante: Chagra es agroecológico, no recomendamos agroquímicos sintéticos. ' +
    'Lo que de verdad funciona y cuida tu suelo y tu salud es el manejo orgánico:';

  const lineas = [];
  if (esHongo || (!esHongo && !esPlaga)) {
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
    // límite de palabra a ambos lados sobre el texto normalizado.
    const re = new RegExp(`(^|[^a-z0-9])${t.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&')}([^a-z0-9]|$)`);
    if (re.test(norm)) hits.push(term);
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
    if (suf) hits.push(tok[0]);
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

  const correcciones = [];
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
    const alternativas = _altNames(e.alternativas_viables, 3);
    const altTxt = alternativas.length
      ? ` Para tu altura te irían mejor estas del catálogo: ${alternativas.join(', ')}.`
      : '';
    const dondeTxt = haveAlt ? ` a ${alt} msnm` : '';
    correcciones.push(
      `Corrección importante: ${nombre} NO es viable en tu finca${dondeTxt} — su clima/altitud no le sirve, ` +
        `la probabilidad de éxito es muy baja y no vale la pena el esfuerzo.${altTxt}`,
    );
  }

  if (correcciones.length === 0) {
    return { text: responseText, modified: false, reason: null };
  }

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
]);

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
 * Anti-falsos-positivos:
 *  - Solo binomios que NO pertenecen al grounding disparan (companions y plagas
 *    legítimos quedan exentos).
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

  const grounded = _groundedBinomials(resolvedEntities);
  if (grounded.size === 0) {
    return { text: responseText, modified: false, reason: null };
  }

  const norm = _stripDiacritics(responseText);

  // Binomios presentes en el texto pero NO autoritativos del grounding.
  const foreign = new Set();
  let m;
  SCI_BINOMIAL_RE.lastIndex = 0;
  while ((m = SCI_BINOMIAL_RE.exec(responseText)) !== null) {
    // Descarta "Género preposición" (ej. "Lulo de Castilla" → "Lulo de"): un
    // epíteto botánico nunca es una stopword del español.
    if (EPITHET_STOPWORDS.has(_stripDiacritics(m[2]))) continue;
    const raw = `${m[1]} ${m[2]}`;
    const bin = _binomial(raw);
    if (bin && !grounded.has(bin)) foreign.add(bin);
  }
  if (foreign.size === 0) {
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

    // ¿Hay un binomio foráneo CERCA del nombre del cultivo? Tomamos el primer
    // foráneo que aparezca dentro de una ventana del nombre. Si el cultivo no
    // está cerca de ningún binomio foráneo, no atribuimos (conservador).
    const idxNombre = norm.indexOf(firstWord);
    let culprit = null;
    for (const fb of foreign) {
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
    if (EPITHET_STOPWORDS.has(_stripDiacritics(m[2]))) continue;
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

    // ¿Hay un binomio CERCA del nombre que NO esté en su grounding? Ese es el
    // culpable (sustitución). Tomamos el más cercano dentro de la ventana.
    let culprit = null;
    let bestDist = Infinity;
    for (const tb of textBinomials) {
      if (entry.bins.has(tb.bin)) continue; // ese binomio es legítimo (otra especie).
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
  } = {},
) {
  if (typeof responseText !== 'string' || responseText.length === 0) {
    return { text: responseText ?? '', modified: false, reasons: [] };
  }
  // R2: descarta entidades-ruido NLU ("aquí", "don", "pasto") ANTES de los
  // guards para no razonar sobre palabras campesinas mal resueltas a especie.
  const entities = filterNoiseEntities(resolvedEntities);
  let text = responseText;
  let modified = false;
  const reasons = [];

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

  for (const guard of GUARD_CHAIN) {
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
  const thermalRes = guardThermalViability(text, entities, fincaAltitud, {
    forecastTempMin,
    forecastTempMax,
  });
  if (thermalRes && thermalRes.modified) {
    text = thermalRes.text;
    modified = true;
    if (thermalRes.reason) reasons.push(thermalRes.reason);
  }
  // Guard de nombre inventado: firma propia (necesita el nombre del perfil).
  const nameRes = guardInventedName(text, { profileName });
  if (nameRes && nameRes.modified) {
    text = nameRes.text;
    modified = true;
    if (nameRes.reason) reasons.push(nameRes.reason);
  }
  return { text, modified, reasons };
}
