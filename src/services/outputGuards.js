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
 * Guard 3 — viabilidad invertida. Si el grounding marca `viabilidad:"inviable"`
 * para una especie a la altitud de la finca y la respuesta la recomienda como
 * viable/buena, CORRIGE ("a tu altura no se da") y lidera con
 * `alternativas_viables`. NO toca "marginal" (eso SÍ es posible con cuidados:
 * doctrina zona-gris).
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
  const haveAlt = Number.isFinite(alt);

  const correcciones = [];
  const disparadas = [];

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
    if (!_presentaComoViable(norm, nombreNorm)) continue;

    disparadas.push(nombre);
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
  // La corrección va PRIMERO (lidera) para no enterrar el veredicto correcto.
  const text = `${correcciones.join('\n\n')}\n\n${responseText.trim()}`;
  return { text, modified: true, reason: `viabilidad_invertida: ${disparadas.join(', ')}` };
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

// ── orquestador ─────────────────────────────────────────────────────────────

/**
 * Cadena ordenada de guards. El agroquímico va primero (lo más urgente:
 * SAFETY), luego invasoras, viabilidad y por último la suavización de dosis.
 */
const GUARD_CHAIN = [
  // El de dosis va PRIMERO en detección: el guard agroquímico anexa un bloque
  // que menciona "etiqueta" (cita de fuente), lo que apagaría la suavización
  // de dosis si corriera después. Correr dosis primero evita ese
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
 * @returns {{text:string, modified:boolean, reasons:string[]}}
 */
export function applyOutputGuards(responseText, { resolvedEntities = null, fincaAltitud = null } = {}) {
  if (typeof responseText !== 'string' || responseText.length === 0) {
    return { text: responseText ?? '', modified: false, reasons: [] };
  }
  let text = responseText;
  let modified = false;
  const reasons = [];
  for (const guard of GUARD_CHAIN) {
    const res = guard(text, resolvedEntities, fincaAltitud);
    if (res && res.modified) {
      text = res.text;
      modified = true;
      if (res.reason) reasons.push(res.reason);
    }
  }
  return { text, modified, reasons };
}
