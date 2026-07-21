/**
 * angelitaVariedad — que Angelita NUNCA diga lo mismo dos veces igual.
 *
 * El motor (angelitaInteligencia) decide QUÉ decir; esta capa decide CÓMO
 * suena hoy: misma idea, otras palabras. El pedido del operador: "tenemos un
 * LLM — que sea semánticamente diferente cada vez, que la gente siempre
 * escuche distinto".
 *
 * ARQUITECTURA (offline-first, NO NEGOCIABLE):
 *
 *   variarMensaje(base, tipo) es SIEMPRE síncrona y devuelve al instante.
 *   Nunca espera red, nunca espera al LLM, nunca lanza.
 *
 *   1. CAPA DETERMINISTA (siempre disponible, cero red): combina aperturas
 *      colombianas en usted ("Mire:", "Sumercé,") con cierres sinónimos del
 *      copy del motor ("¿Los repasamos?" → "¿Les echamos un vistazo?"). Las
 *      cifras y el núcleo factual del mensaje NO se tocan jamás — solo el
 *      ropaje. Un seed diario ordena el pool distinto cada día.
 *
 *   2. CAPA LLM (enriquece, nunca bloquea): tras entregar la variante, se
 *      dispara EN SEGUNDO PLANO una paráfrasis al LLM local de la app
 *      (llmRouter → Ollama, el mismo cliente de Angelita). Lo que vuelva —
 *      validado por guardrails — se guarda en el pool persistido y sonará
 *      en una PRÓXIMA ocasión. Sin red / sin LLM / con error: silencio
 *      total y la capa determinista sostiene la variedad sola.
 *
 *   3. ANTI-REPETICIÓN: ring-buffer persistido de los últimos mostrados por
 *      mensaje base — no se repite una variante hasta agotar el pool; al
 *      agotarse, el buffer se vacía y el ciclo arranca de nuevo (con otro
 *      orden, porque el seed del día cambió).
 *
 * GUARDRAILS de la paráfrasis LLM (regla #1 del motor: cero invención):
 *   - Debe conservar EXACTAMENTE las cifras del mensaje base (ni inventar
 *     números ni botarlos).
 *   - Veto a voseo/tuteo/argentinismos (la casa habla de usted, colombiano).
 *   - Longitud acotada, una sola frase corta, sin comillas ni markdown.
 *   - Si algo no pasa, la variante se descarta en silencio.
 *
 * Este módulo NO toca cadencia ni cooldowns (eso es de angelitaInteligencia
 * y del store): recibe un mensaje ya aprobado para sonar y solo lo viste.
 */

import { buildLLMRequest } from './llmRouter';
import { fetchWithAuthRetry } from './apiService';

/* ─────────────────────────────────────────────────────────────────────────────
 * Persistencia liviana (localStorage con fallback en memoria).
 * ────────────────────────────────────────────────────────────────────────── */

const STORAGE_KEY = 'chagra:angelita:variedad:v1';
/** Máximo de mensajes base recordados (LRU por timestamp). */
const MAX_BASES = 40;
/** Ring buffer: últimos N mostrados por mensaje base. */
const MAX_VISTOS = 10;
/** Máximo de variantes LLM guardadas por mensaje base. */
const LLM_MAX_VARIANTES = 6;
/** No volver a pedirle paráfrasis al LLM del mismo base antes de esto. */
const LLM_COOLDOWN_MS = 6 * 60 * 60 * 1000;
/** Timeout duro de la petición LLM en segundo plano. */
const LLM_TIMEOUT_MS = 9000;

/** Fallback en memoria cuando localStorage no existe o está lleno. */
let memoria = null;

function leerEstado() {
  if (memoria) return memoria;
  try {
    const crudo = globalThis.localStorage?.getItem(STORAGE_KEY);
    if (crudo) {
      const parsed = JSON.parse(crudo);
      if (parsed && typeof parsed === 'object' && parsed.bases) {
        memoria = parsed;
        return memoria;
      }
    }
  } catch {
    /* storage roto/lleno: seguimos en memoria */
  }
  memoria = { bases: {} };
  return memoria;
}

function guardarEstado() {
  if (!memoria) return;
  // Poda LRU: si hay demasiados bases, botamos los más viejos.
  const llaves = Object.keys(memoria.bases);
  if (llaves.length > MAX_BASES) {
    llaves
      .sort((a, b) => (memoria.bases[a].ts || 0) - (memoria.bases[b].ts || 0))
      .slice(0, llaves.length - MAX_BASES)
      .forEach((k) => delete memoria.bases[k]);
  }
  try {
    globalThis.localStorage?.setItem(STORAGE_KEY, JSON.stringify(memoria));
  } catch {
    /* quota/privado: la memoria en RAM sigue sirviendo esta sesión */
  }
}

function entradaDe(hashBase) {
  const estado = leerEstado();
  if (!estado.bases[hashBase]) {
    estado.bases[hashBase] = { vistos: [], llm: [], llmMs: 0, ts: Date.now() };
  }
  const e = estado.bases[hashBase];
  if (!Array.isArray(e.vistos)) e.vistos = [];
  if (!Array.isArray(e.llm)) e.llm = [];
  return e;
}

/* ─────────────────────────────────────────────────────────────────────────────
 * Utilidades deterministas: hash + seed diario.
 * ────────────────────────────────────────────────────────────────────────── */

/** Hash FNV-1a de 32 bits — estable, suficiente para llaves y seeds. */
export function hashStr(s) {
  let h = 0x811c9dc5;
  const str = String(s ?? '');
  for (let i = 0; i < str.length; i += 1) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0).toString(36);
}

/** La fecha del seed diario (YYYY-MM-DD local del dispositivo). */
function fechaSeed(ahoraMs) {
  const d = new Date(ahoraMs ?? Date.now());
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${mm}-${dd}`;
}

/* ─────────────────────────────────────────────────────────────────────────────
 * CAPA 1 — variantes deterministas (plantillas + sinónimos, cero red).
 * ────────────────────────────────────────────────────────────────────────── */

/* Aperturas cortas en usted colombiano. La vacía mantiene el base puro en el
   pool. "Sumercé" es de la casa (Cundinamarca/Boyacá — la finca es Choachí). */
const APERTURAS_POR_TIPO = {
  bienvenida: ['', '¡Qué gusto verle! ', 'Bienvenido de nuevo. ', 'Sumercé, ¡qué bueno tenerle por acá! '],
  informativa: ['', 'Mire: ', 'Le cuento: ', 'Sumercé, '],
  sugerencia: ['', 'Mire: ', 'Una idea: ', 'Sumercé, '],
  atencion: ['', 'Ojo con esto: ', 'No se le olvide: ', 'Pendiente: '],
  alerta: ['', 'Atención: ', 'Importante: '],
  celebracion: ['', '¡Qué alegría! ', '¡Muy bien! ', '¡Eso es! '],
  planta: ['', 'Mire: ', 'Le cuento: ', 'Sumercé, '],
  nino: ['', '¡Hola! ', '¿Sabía una cosa? '],
};

/* Cierres del copy del motor con sus sinónimos. SOLO se cambia el remate del
   mensaje (la pregunta-invitación); las cifras y los hechos quedan intactos. */
/** @type {Array<[string, string[]]>} */
const CIERRES_SINONIMOS = [
  ['¿Le hacemos seguimiento?', ['¿Le seguimos la pista?', '¿La vamos mirando juntos?']],
  ['¿Le echamos un ojo a cómo va?', ['¿Le damos una miradita?', '¿Vemos cómo va?']],
  ['¿Revisamos cómo van?', ['¿Les damos una miradita?', '¿Vemos cómo siguen?']],
  ['¿Los repasamos?', ['¿Les echamos un vistazo?', '¿Los miramos juntos?']],
  ['¿Se los muestro?', ['¿Quiere verlos?', '¿Se los enseño?']],
  ['¿Le ayudo a leerlo?', ['¿Lo leemos juntos?', '¿Le ayudo a entenderlo?']],
  ['¿Empezamos por ahí?', ['¿Arrancamos por ahí?', '¿Le parece si empezamos por ahí?']],
  [
    '¿Le cuento cómo se cuida ese nacimiento?',
    ['¿Quiere saber cómo se cuida ese nacimiento?', '¿Le muestro cómo cuidar ese nacimiento?'],
  ],
  [
    '¿Le muestro cómo un rastrojo vuelve a ser monte?',
    ['¿Quiere ver cómo un rastrojo vuelve a ser monte?', '¿Le enseño cómo el monte se recupera solito?'],
  ],
];

/** Baja la primera letra del base cuando va tras una apertura ("Mire: de…"). */
function acoplarTrasApertura(base) {
  const s = String(base);
  if (!s) return s;
  const c0 = s.charAt(0);
  const c1 = s.charAt(1);
  // Solo si arranca con mayúscula seguida de minúscula (no siglas, no ¿¡).
  if (/[A-ZÁÉÍÓÚÑ]/.test(c0) && /[a-záéíóúñü]/.test(c1)) {
    return c0.toLocaleLowerCase('es') + s.slice(1);
  }
  return s;
}

/** Los remates alternativos del base (incluye el original). */
function rematesDe(base) {
  for (const [original, sinonimos] of CIERRES_SINONIMOS) {
    if (base.endsWith(original)) {
      const tronco = base.slice(0, base.length - original.length);
      return [base, ...sinonimos.map((s) => tronco + s)];
    }
  }
  return [base];
}

/**
 * Variantes deterministas de un mensaje: aperturas × remates. Nunca tocan
 * cifras ni el núcleo factual — solo visten la frase. Puro, sin estado.
 * @param {string} base
 * @param {string} [tipo] - uno de TIPOS_AVISO (default informativa).
 * @returns {string[]} pool con el base de primero, sin duplicados.
 */
export function variantesDeterministas(base, tipo = 'informativa') {
  const b = String(base ?? '').trim();
  if (!b) return [];
  const aperturas = APERTURAS_POR_TIPO[tipo] || APERTURAS_POR_TIPO.informativa;
  const cuerpos = rematesDe(b);
  const pool = [];
  for (const apertura of aperturas) {
    for (const cuerpo of cuerpos) {
      const v = apertura ? apertura + acoplarTrasApertura(cuerpo) : cuerpo;
      if (!pool.includes(v)) pool.push(v);
    }
  }
  return pool;
}

/* ─────────────────────────────────────────────────────────────────────────────
 * CAPA 2 — guardrails de la paráfrasis LLM.
 * ────────────────────────────────────────────────────────────────────────── */

/* Voseo, tuteo y muletillas ajenas: la casa habla de usted, colombiano.
   Nota: NO usamos \b porque en JS no corta tras vocal acentuada ("mirá",
   "tú") — bordes explícitos con espacios/puntuación. */
const BORDE_I = /(^|[\s.,;:!?¡¿"'(—])/u;
const VETO_PALABRAS =
  '(vos|che|sos|ten[eé]s|pod[eé]s|quer[eé]s|sab[eé]s|mir[aá]|fijate|fij[aá]te|dale|t[uú]|tienes|puedes|quieres|sabes|debes|tus)';
const BORDE_F = /(?=$|[\s.,;:!?¡¿"')—])/u;
const VETO_TRATO = new RegExp(BORDE_I.source + VETO_PALABRAS + BORDE_F.source, 'iu');
/* Fugas de idioma o de rol del LLM. */
const VETO_FUGA = new RegExp(
  `${BORDE_I.source}(the|your|you|assistant|usuario:|asistente:)${BORDE_F.source}`,
  'iu',
);

/** Las cifras de un texto (runs de dígitos), como multiconjunto ordenado. */
function cifrasDe(texto) {
  return (String(texto).match(/\d+(?:[.,]\d+)?/g) || []).sort().join('|');
}

/**
 * Valida y limpia una paráfrasis del LLM contra su mensaje base. Devuelve la
 * variante limpia, o null si no pasa los guardrails (se descarta en silencio).
 * @param {string} candidato - lo que devolvió el LLM.
 * @param {string} base - el mensaje original del motor.
 * @returns {string|null}
 */
export function validarParafrasis(candidato, base) {
  if (typeof candidato !== 'string') return null;
  let v = candidato
    .replace(/\r?\n+/g, ' ') // una sola línea
    .replace(/^["'“”‘’\s*-]+|["'“”‘’\s*]+$/g, '') // comillas/bullets/espacios
    .replace(/\s{2,}/g, ' ')
    .trim();
  // Prefijos de obediencia del LLM ("Variante:", "Frase reescrita:"…).
  v = v.replace(/^(variante|par[aá]frasis|frase( reescrita)?|respuesta)\s*:\s*/iu, '').trim();
  if (!v || v.length < 8 || v.length > 220) return null;
  const baseStr = String(base ?? '');
  if (v.toLocaleLowerCase('es') === baseStr.toLocaleLowerCase('es')) return null;
  // Cero invención: exactamente las mismas cifras que el base.
  if (cifrasDe(v) !== cifrasDe(baseStr)) return null;
  if (VETO_TRATO.test(v) || VETO_FUGA.test(v)) return null;
  return v;
}

/* ─────────────────────────────────────────────────────────────────────────────
 * CAPA 2 — el pedido al LLM, SIEMPRE en segundo plano.
 * ────────────────────────────────────────────────────────────────────────── */

const TONO_POR_TIPO = {
  bienvenida: 'saludo cálido de bienvenida',
  informativa: 'información tranquila',
  sugerencia: 'sugerencia agroecológica amable',
  atencion: 'recordatorio amable de una tarea pendiente',
  alerta: 'aviso serio pero sereno, sin alarmar',
  celebracion: 'celebración alegre de un logro',
  planta: 'comentario cariñoso sobre una planta',
  nino: 'frase sencilla y dulce, apta para un niño',
};

const SYSTEM_PARAFRASIS =
  'Usted es Angelita, la abeja compañera de una app campesina colombiana. ' +
  'Reescriba el aviso que le den con OTRAS palabras, manteniendo exactamente ' +
  'la misma intención y los mismos datos y cifras. Reglas duras: trato de ' +
  'usted (jamás tuteo ni voseo), español de Colombia, máximo 25 palabras, ' +
  'tono cálido y tranquilo, sin alarmar, sin inventar cifras ni datos nuevos, ' +
  'sin emojis, sin comillas, sin saludos de asistente. Responda SOLO con la ' +
  'frase reescrita.';

/**
 * Pide UNA paráfrasis fresca al LLM local y, si pasa los guardrails, la suma
 * al pool persistido del mensaje base — para una PRÓXIMA vez. Fire-and-forget:
 * jamás lanza, jamás bloquea a quien la disparó, y con cooldown por base para
 * no gastar el LLM en lo mismo.
 * @param {string} base
 * @param {string} tipo
 * @returns {Promise<void>} siempre resuelta (los errores mueren aquí).
 */
export async function refrescarPoolLLM(base, tipo = 'informativa') {
  try {
    if (typeof globalThis.fetch !== 'function') return;
    if (typeof navigator !== 'undefined' && navigator.onLine === false) return;
    const b = String(base ?? '').trim();
    if (!b) return;
    const llave = hashStr(b);
    const entrada = entradaDe(llave);
    const ahora = Date.now();
    if (entrada.llm.length >= LLM_MAX_VARIANTES) return;
    if (ahora - (entrada.llmMs || 0) < LLM_COOLDOWN_MS) return;
    // Marca ANTES de pedir: si dos avisos disparan a la vez, va uno solo.
    entrada.llmMs = ahora;
    guardarEstado();

    const { url, body } = buildLLMRequest(
      'chat',
      [
        { role: 'system', content: SYSTEM_PARAFRASIS },
        {
          role: 'user',
          content: `Tipo de aviso: ${TONO_POR_TIPO[tipo] || TONO_POR_TIPO.informativa}.\nAviso original: ${b}`,
        },
      ],
      { temperature: 0.9, max_tokens: 90 },
    );
    body.stream = false;

    const ctrl = typeof AbortController !== 'undefined' ? new AbortController() : null;
    const timer = ctrl ? setTimeout(() => ctrl.abort(), LLM_TIMEOUT_MS) : null;
    try {
      const res = await fetchWithAuthRetry(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        signal: ctrl?.signal,
      });
      if (!res?.ok) return;
      const json = await res.json();
      const crudo = json?.choices?.[0]?.message?.content;
      const limpia = validarParafrasis(crudo, b);
      if (limpia && !entrada.llm.includes(limpia)) {
        entrada.llm = [...entrada.llm, limpia].slice(-LLM_MAX_VARIANTES);
        guardarEstado();
      }
    } finally {
      if (timer) clearTimeout(timer);
    }
  } catch {
    /* offline / LLM caído / abort: silencio — la capa determinista sostiene */
  }
}

/* ─────────────────────────────────────────────────────────────────────────────
 * LA API — variarMensaje: síncrona, instantánea, nunca falla.
 * ────────────────────────────────────────────────────────────────────────── */

/**
 * Viste un mensaje base con una variante fresca. SIEMPRE devuelve al instante
 * (cero red en el camino caliente); el LLM solo enriquece el pool en segundo
 * plano para próximas veces.
 *
 * Anti-repetición: ring buffer persistido de los últimos MAX_VISTOS por base;
 * no repite variante hasta agotar el pool (y al agotar, reinicia el ciclo).
 * Orden barajado con seed diario: cada día suena en otro orden.
 *
 * @param {string} base - el mensaje del motor (ya aprobado para sonar).
 * @param {string} [tipo] - uno de TIPOS_AVISO (afecta las aperturas y el tono
 *   de la paráfrasis LLM). Default 'informativa'.
 * @param {{ ahoraMs?: number, sinLLM?: boolean }} [opts] - reloj inyectable
 *   (tests) y apagado explícito de la capa LLM.
 * @returns {string} la variante elegida (en el peor caso, el base intacto).
 */
export function variarMensaje(base, tipo = 'informativa', opts = {}) {
  const b = typeof base === 'string' ? base.trim() : '';
  if (!b) return base;
  try {
    const llave = hashStr(b);
    const entrada = entradaDe(llave);
    entrada.ts = opts.ahoraMs ?? Date.now();

    // El pool: base + deterministas + lo que el LLM haya dejado listo.
    const pool = variantesDeterministas(b, tipo);
    for (const v of entrada.llm) {
      if (!pool.includes(v)) pool.push(v);
    }
    if (pool.length === 0) return b;

    // Anti-repetición: fuera lo ya mostrado; pool agotado → ciclo nuevo.
    let candidatas = pool.filter((v) => !entrada.vistos.includes(hashStr(v)));
    if (candidatas.length === 0) {
      entrada.vistos = [];
      candidatas = pool;
    }

    // Elección determinista: seed diario + punto del ciclo. Distinto orden
    // cada día, estable dentro del mismo día y punto (testeable).
    const seed = parseInt(hashStr(`${fechaSeed(opts.ahoraMs)}|${llave}|${entrada.vistos.length}`), 36);
    const elegida = candidatas[seed % candidatas.length];

    entrada.vistos = [...entrada.vistos, hashStr(elegida)].slice(-MAX_VISTOS);
    guardarEstado();

    // La capa LLM trabaja para la PRÓXIMA vez — jamás para esta.
    if (!opts.sinLLM) {
      refrescarPoolLLM(b, tipo).catch(() => {});
    }
    return elegida;
  } catch {
    // Pase lo que pase, Angelita habla: el base intacto.
    return b;
  }
}

/** Solo para tests: borra la memoria de variedad (RAM + storage). */
export function _resetVariedad() {
  memoria = null;
  try {
    globalThis.localStorage?.removeItem(STORAGE_KEY);
  } catch {
    /* sin storage */
  }
}

export default variarMensaje;
