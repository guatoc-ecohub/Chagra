/*
 * angelitaInteligencia — EL MOTOR DE COMPORTAMIENTO DE ANGELITA.
 *
 * Angelita (Tetragonisca angustula, la abeja sin aguijón) es la compañera IA de
 * Chagra. Este módulo es su CABEZA, no su cara: decide QUÉ hacer y QUÉ decir a
 * partir de lo que de verdad pasa en la finca — sin dibujar nada, sin React, sin
 * red. La cara (Angelita.jsx / angelitaEstados.js) consume esta decisión; el
 * shell (AgentScreen / AgentFab / el store useAngelitaStore) le pasa los datos.
 *
 * La meta, en una línea: que Angelita se sienta una vecina VIVA que sabe dónde
 * está usted y qué le conviene, NUNCA un Clippy que interrumpe a lo bruto.
 *
 * CUATRO ESTADOS DE COMPORTAMIENTO (la API que consume la cara):
 *   - calma   → default, en reposo, acompaña e invita a tocar. No habla sola.
 *   - aviso   → hay algo que atender (helada, riego, tarea vencida, alerta). Lo
 *               DICE, priorizado, 1–2 cosas, sin gritar.
 *   - celebra → un logro REAL del campesino (cosecha registrada, racha, meta).
 *   - husmea  → curiosea el mundo donde entró y comenta algo con valor,
 *               GROUNDED en los datos reales de ese mundo.
 *
 * REGLAS DE LA CASA (inviolables):
 *   1. CERO invención de datos agronómicos. Si no hay dato real, se usa un
 *      mensaje de acompañamiento honesto y genérico (una pregunta, una
 *      invitación) — nunca una cifra, dosis, precio o pronóstico inventado.
 *   2. Español de Colombia, USTED cálido. Nunca voseo (ni "vos", ni "tenés").
 *   3. Anti-molestia (lección Clippy): frecuencia y timing con criterio; nunca
 *      interrumpe a mitad de una tarea salvo urgencia real; local-first, todo
 *      funciona offline (este módulo NO hace red).
 *
 * DEUDA CONOCIDA (2º pase): al arrancar no había salida del DR de UX de
 * asistentes-IA y notificaciones contextuales en deepresearch/DR-FANOUT. Los
 * cooldowns y las plantillas se fijaron con criterio; cuando llegue el DR,
 * revisar cadencias y copy aquí.
 *
 * SOLO datos + funciones puras (testeables sin montar nada). El estado en vivo
 * (qué está diciendo ahora, cuándo habló por última vez) vive en el store
 * useAngelitaStore, que llama a estas funciones.
 */

import { buildProactiveGreeting, saludoPorHora } from './proactiveGreeting';

/* ─────────────────────────────────────────────────────────────────────────────
 * 1. LOS ESTADOS DE COMPORTAMIENTO — el vocabulario de la API.
 * ────────────────────────────────────────────────────────────────────────── */

/** Los estados canónicos del comportamiento de Angelita. */
export const ESTADOS_COMPORTAMIENTO = /** @type {const} */ ([
  'calma',
  'aviso',
  'celebra',
  'husmea',
  // #109 "luto y fiesta": luto breve, digno, NUNCA culposo, al registrar una
  // planta muerta. Comparte prioridad de arbitraje con celebra (un momento
  // que el motor SÍ debe interrumpir para acompañar), pero su cara y su tono
  // son opuestos — ver VISUAL_LUTO / ARIA_COMPORTAMIENTO.luto abajo.
  'luto',
]);

/**
 * Contrato con la CARA (src/visual/agente/angelitaEstados.js): cada estado de
 * comportamiento se traduce a un estado VISUAL canónico que el dibujo entiende.
 * Se deja HARDCODEADO a propósito (no importamos del paquete visual) para que
 * este motor quede desacoplado de la cara — el test `mapea a vocabulario visual
 * conocido` cuida que estos destinos sigan siendo válidos.
 *
 *   calma   → 'acompana'   (idle vivo: flota, respira, presente sin hablar)
 *   aviso   → 'preocupada' si es urgente; 'invita' si es un aviso tranquilo
 *   celebra → 'contenta'   (brinquito de celebración)
 *   husmea  → 'senala'     (se inclina y apunta a lo que mira del mundo)
 *   luto    → 'preocupada' (la cara más cercana al recogimiento que YA existe
 *             — sin fabricar un dibujo nuevo; #109 diferencia el TONO del
 *             texto y el `tipo` de aviso — visual/burbuja gris — no la pose)
 */
const VISUAL_CALMA = 'acompana';
const VISUAL_AVISO_URGENTE = 'preocupada';
const VISUAL_AVISO_TRANQUILO = 'invita';
const VISUAL_CELEBRA = 'contenta';
const VISUAL_HUSMEA = 'senala';
const VISUAL_LUTO = 'preocupada';

/** Narración para lectores de pantalla — usted, cercano, sin tecnicismos. */
const ARIA_COMPORTAMIENTO = {
  calma: 'Angelita la acompaña, tranquila',
  aviso: 'Angelita tiene algo importante que contarle',
  celebra: 'Angelita está contenta por usted',
  husmea: 'Angelita curiosea y le comenta algo de este mundo',
  luto: 'Angelita lo acompaña en silencio, con cariño',
};

/**
 * Traduce un estado de comportamiento al estado VISUAL que consume la cara.
 * @param {string} estado — uno de ESTADOS_COMPORTAMIENTO.
 * @param {{ severidad?: ('alta'|'media'|'baja'|null) }} [opts]
 * @returns {string} estado visual canónico (angelitaEstados.js).
 */
export function estadoVisualDeComportamiento(estado, opts = {}) {
  switch (estado) {
    case 'aviso':
      return opts.severidad === 'alta' ? VISUAL_AVISO_URGENTE : VISUAL_AVISO_TRANQUILO;
    case 'celebra':
      return VISUAL_CELEBRA;
    case 'husmea':
      return VISUAL_HUSMEA;
    case 'luto':
      return VISUAL_LUTO;
    case 'calma':
    default:
      return VISUAL_CALMA;
  }
}

/** Narración ARIA de un estado de comportamiento (usted). */
export function ariaDeComportamiento(estado) {
  return ARIA_COMPORTAMIENTO[estado] || ARIA_COMPORTAMIENTO.calma;
}

/* Prioridad de arbitraje entre comportamientos que compiten en un mismo
   momento. Mayor = manda. La severidad del aviso ajusta su prioridad. */
const PRIORIDAD = {
  aviso_alta: 100,
  aviso_media: 70,
  celebra: 60,
  // #109: el luto pesa como un aviso medio — de verdad interrumpe (no es un
  // dato que espera su turno), pero nunca por encima de una alerta real.
  luto: 65,
  aviso_baja: 45,
  husmea: 20,
  calma: 0,
};

/* ─────────────────────────────────────────────────────────────────────────────
 * 2. LOS MUNDOS — taxonomía y ruteo pantalla → mundo.
 * ────────────────────────────────────────────────────────────────────────── */

/** Los mundos reales de la app, como los nombra el operador. */
export const MUNDOS = /** @type {const} */ ([
  'mis_matas',
  'mis_animales',
  'clima',
  'vender',
  'aprender',
  'bosque',
  'paramo',
  'finca',
]);

/* Pantallas (rutas #sin-barra de rutasProdChagraApp) que caen en cada mundo.
   No es exhaustivo: lo que no cuadre → null, y el shell puede pasar el mundo
   explícito. Los cultivos concretos (café, papa…) caen en mis_matas. */
const PANTALLA_A_MUNDO = {
  // ── mis matas ──
  activos: 'mis_matas', mundo_cultivos: 'mis_matas', mundo: 'mis_matas',
  semilla: 'mis_matas', germinacion: 'mis_matas', sembrar: 'mis_matas',
  ciclo: 'mis_matas', ciclo_vivo: 'mis_matas', cosechar: 'mis_matas',
  mi_cosecha: 'mis_matas', poscosecha: 'mis_matas', nutricion: 'mis_matas',
  sanidad_sintoma: 'mis_matas', seguimiento: 'mis_matas',
  // ── mis animales ──
  animales: 'mis_animales', animales_gallinas: 'mis_animales',
  animales_abejas: 'mis_animales', animales_vacas: 'mis_animales',
  animales_conejos: 'mis_animales', animales_caprinos: 'mis_animales',
  diorama_gallinero: 'mis_animales', diorama_abejas: 'mis_animales',
  // ── el tiempo / clima ──
  clima_boletin: 'clima', agua: 'clima', valle3d_lluvia: 'clima',
  diorama_agua: 'clima',
  // ── vender ──
  mercado: 'vender', mercados: 'vender', momento_venta: 'vender',
  // ── aprender ──
  aprende: 'aprender', curso: 'aprender', faq: 'aprender',
  extensionista: 'aprender', casos: 'aprender',
  // ── bosque ──
  bosque_vivo: 'bosque', bosque: 'bosque', restauracion: 'bosque',
  biodiversidad: 'bosque', aliados_finca: 'bosque',
  // ── páramo ──
  glaciar: 'paramo', glaciar_historial: 'paramo', diorama_paramo: 'paramo',
  // ── la finca (home / valle) ──
  valle3d: 'finca', valle3d_noche: 'finca', ventana_valle: 'finca',
  dashboard: 'finca', hoy_finca: 'finca', montana_mundos: 'finca',
};

/* Cultivos con mundo propio (rutasProdChagraApp): todos caen en mis_matas. */
const CULTIVOS_MUNDO = new Set([
  'cafe', 'cacao', 'papa', 'platano', 'aguacate', 'citricos', 'cana', 'mango',
  'uchuva', 'frutales', 'hortalizas', 'tuberculos', 'aromaticas', 'botica',
  'fique', 'quinua', 'milpa_cultivo', 'maiz', 'frijol',
]);

/**
 * Resuelve el mundo al que pertenece una pantalla (currentView del shell).
 * @param {string|null|undefined} pantalla
 * @returns {string|null} uno de MUNDOS, o null si la pantalla no mapea.
 */
export function mundoDePantalla(pantalla) {
  if (!pantalla || typeof pantalla !== 'string') return null;
  const p = pantalla.trim().toLowerCase();
  if (!p) return null;
  if (PANTALLA_A_MUNDO[p]) return PANTALLA_A_MUNDO[p];
  if (CULTIVOS_MUNDO.has(p)) return 'mis_matas';
  if (p.startsWith('animales')) return 'mis_animales';
  if (p.startsWith('seguimiento')) return 'mis_matas';
  if (p.startsWith('glaciar')) return 'paramo';
  if (p.startsWith('valle3d')) return 'finca';
  return null;
}

/* ─────────────────────────────────────────────────────────────────────────────
 * 3. COMENTARIO POR MUNDO — grounded en datos reales, con fallback honesto.
 * ────────────────────────────────────────────────────────────────────────── */

/* Los 8 comentaristas de mundo se MUDARON al núcleo portable del compAI
   (`src/compai/nucleo/comentarista.js`, 2026-07-26): son la fuente única que
   ahora comparten la PWA y el valle de `3d.guatoc.co`. Aquí se re-exportan
   para no romper a nadie — el texto y la regla de callar honesto son los
   mismos, y viven en UN solo archivo. Ver `src/compai/nucleo/MANIFIESTO.md`. */
/* OJO: hace falta el `import` ADEMÁS del `export … from`. Un re-export NO crea
   binding local, y `resolverComportamiento` (más abajo) llama a
   `comentarioDeMundo` desde este mismo módulo: sin esta línea el husmeo
   revienta con `ReferenceError` en tiempo de ejecución — y el build de Vite
   NO lo ve (lo cazaron los tests del store). */
import { comentarioDeMundo, COMENTARISTA_MUNDO } from '../compai/nucleo/comentarista.js';
import { preguntaDeAprendiz } from '../compai/nucleo/modoAprendiz.js';

export { comentarioDeMundo, COMENTARISTA_MUNDO };
export { preguntaDeAprendiz };

/* ─────────────────────────────────────────────────────────────────────────────
 * 4b. CLIMA VIVO (#111) — traduce una ReaccionClima del núcleo
 *    (compai/nucleo/climaVivo.js) al mismo contrato `notificaciones` que
 *    consume `evaluar()`/`resolverComportamiento`, para que pase por la
 *    MISMA anti-molestia y el MISMO cooldown de aviso que cualquier otra
 *    alerta — cero camino paralelo, cero timer propio.
 * ────────────────────────────────────────────────────────────────────────── */

/**
 * @param {import('../compai/nucleo/climaVivo').ReaccionClima|null} reaccion
 * @returns {{ hay:boolean, estado:string, severidad:(string|null), lead:(string|null),
 *   prompt:(string|null), prioridad:number }}
 */
export function notificacionDeClima(reaccion) {
  if (!reaccion) {
    return { hay: false, estado: 'calma', severidad: null, lead: null, prompt: null, prioridad: PRIORIDAD.calma };
  }
  const prioridad = reaccion.severidad === 'alta'
    ? PRIORIDAD.aviso_alta
    : reaccion.severidad === 'media'
      ? PRIORIDAD.aviso_media
      : PRIORIDAD.aviso_baja;
  return {
    hay: true,
    estado: 'aviso',
    severidad: reaccion.severidad,
    lead: reaccion.mensaje,
    prompt: null,
    prioridad,
  };
}

/* ─────────────────────────────────────────────────────────────────────────────
 * 4. NOTIFICACIONES INTELIGENTES — qué atender hoy, priorizado y sin ruido.
 * ────────────────────────────────────────────────────────────────────────── */

const SEVERITY_RANK = { danger: 0, warning: 1, info: 2 };

/**
 * Severidad máxima del momento a partir de las entradas crudas. Local, sin red.
 * 'alta' = alguna alerta danger; 'media' = warning o tarea vencida; 'baja' =
 * hay algo pero leve; null = nada que atender.
 */
function severidadDelMomento(activeAlerts, pendingTasks, date) {
  const alertsArr = Array.isArray(activeAlerts)
    ? activeAlerts
    : (activeAlerts instanceof Map ? Array.from(activeAlerts.values()) : []);
  let peor = null; // menor rank = peor
  for (const a of alertsArr) {
    const r = SEVERITY_RANK[a?.severity];
    if (r != null && (peor == null || r < peor)) peor = r;
  }
  let tareaVencida = false;
  if (Array.isArray(pendingTasks)) {
    const now = date instanceof Date ? date.getTime() : Date.now();
    for (const t of pendingTasks) {
      let dueMs = null;
      if (Number.isFinite(t?.timestamp)) dueMs = t.timestamp > 1e12 ? t.timestamp : t.timestamp * 1000;
      else if (t?.due || t?.date || t?.due_date) {
        const parsed = Date.parse(t.due || t.date || t.due_date);
        if (Number.isFinite(parsed)) dueMs = parsed;
      }
      if (dueMs != null && Math.floor((now - dueMs) / 86400000) > 0) tareaVencida = true;
    }
  }
  const hayAlerta = peor != null;
  const hayTarea = Array.isArray(pendingTasks) && pendingTasks.length > 0;
  if (!hayAlerta && !hayTarea) return null;
  if (peor === SEVERITY_RANK.danger) return 'alta';
  if (peor === SEVERITY_RANK.warning || tareaVencida) return 'media';
  return 'baja';
}

/**
 * Decide QUÉ atender hoy, priorizado. Reutiliza buildProactiveGreeting (misma
 * lógica de ranking del saludo proactivo) y le añade la severidad y el estado
 * de comportamiento que la cara necesita.
 *
 * @param {Object} input — ver buildProactiveGreeting (activeAlerts, pendingTasks,
 *   cultivos, altitud, ensoOutlook, date, maxItems).
 * @returns {{ hay: boolean, estado: ('aviso'|'calma'), severidad: ('alta'|'media'|'baja'|null),
 *   hi: string, lead: string, items: Array, restCount: number, prompt: (string|null),
 *   prioridad: number }}
 */
export function notificacionesInteligentes(input = {}) {
  const { activeAlerts = [], pendingTasks = [], date = new Date() } = input;
  const greeting = buildProactiveGreeting(input);
  const severidad = severidadDelMomento(activeAlerts, pendingTasks, date);
  const hay = greeting.state === 'pending' && severidad != null;
  return {
    hay,
    estado: hay ? 'aviso' : 'calma',
    severidad: hay ? severidad : null,
    hi: greeting.hi || saludoPorHora(date instanceof Date ? date : new Date()),
    lead: greeting.lead,
    items: greeting.items,
    restCount: greeting.restCount,
    prompt: greeting.prompt,
    prioridad: hay
      ? (severidad === 'alta' ? PRIORIDAD.aviso_alta
        : severidad === 'media' ? PRIORIDAD.aviso_media
          : PRIORIDAD.aviso_baja)
      : PRIORIDAD.calma,
  };
}

/* ─────────────────────────────────────────────────────────────────────────────
 * 5. ANTI-MOLESTIA — la lección Clippy hecha código.
 * ────────────────────────────────────────────────────────────────────────── */

const MINUTO = 60 * 1000;

/**
 * Cuánto debe callar Angelita entre mensajes del mismo tipo, para no volverse
 * un Clippy. La urgencia alta puede hablar siempre; lo demás respira.
 */
export const COOLDOWN_MS = {
  aviso_alta: 0,            // urgente: puede surgir siempre (pero ver `ocupado`)
  aviso_media: 20 * MINUTO,
  aviso_baja: 45 * MINUTO,
  celebra: 0,              // se dedup por logro.id, no por reloj
  luto: 0,                 // se dedup por evento.id (#109, misma idea de celebra)
  husmea: 20 * MINUTO,     // no comenta el mismo mundo cada vez que pasa
  calma: 0,
};

/** La llave de cooldown de un comportamiento (aviso se afina por severidad). */
function llaveCooldown(estado, severidad) {
  if (estado === 'aviso') {
    if (severidad === 'alta') return 'aviso_alta';
    if (severidad === 'media') return 'aviso_media';
    return 'aviso_baja';
  }
  return estado;
}

/**
 * ¿Debe Angelita SURGIR con un mensaje ahora, o quedarse tranquila? Pura y con
 * reloj inyectable. La regla de oro: nunca interrumpe a mitad de una tarea
 * (`ocupado`) salvo un aviso URGENTE; respeta el silencio; y respeta el cooldown
 * de su tipo de mensaje.
 *
 * @param {Object} p
 * @param {string} p.estado — comportamiento candidato ('aviso'|'celebra'|'husmea'|'calma').
 * @param {('alta'|'media'|'baja'|null)} [p.severidad]
 * @param {number} [p.ahoraMs]
 * @param {number|null} [p.ultimaMs] — cuándo surgió por última vez ESE tipo.
 * @param {boolean} [p.ocupado] — el campesino está a mitad de algo (escribiendo, grabando…).
 * @param {boolean} [p.silenciado] — el usuario pidió silencio a Angelita.
 * @param {number} [p.molestia] contador adaptativo (#102/#106, sección 7):
 *   estira/encoge el cooldown base. 0 = cadencia normal. NO afecta aviso_alta
 *   (urgencia real habla siempre, contador o no).
 * @returns {boolean}
 */
export function debeHablar({
  estado,
  severidad = null,
  ahoraMs = Date.now(),
  ultimaMs = null,
  ocupado = false,
  silenciado = false,
  molestia = 0,
} = {}) {
  if (silenciado) return false;
  if (estado === 'calma' || !estado) return false;
  const urgente = estado === 'aviso' && severidad === 'alta';
  // Nunca interrumpe a mitad de una tarea, salvo urgencia real.
  if (ocupado && !urgente) return false;
  const base = COOLDOWN_MS[llaveCooldown(estado, severidad)] ?? 0;
  const requerido = urgente ? 0 : cadenciaEfectivaMs(base, molestia);
  if (requerido > 0) {
    if (ultimaMs != null && ahoraMs - ultimaMs < requerido) return false;
  }
  return true;
}

/* ─────────────────────────────────────────────────────────────────────────────
 * 6. EL RESOLVEDOR — arbitra los cuatro comportamientos y arma la decisión.
 * ────────────────────────────────────────────────────────────────────────── */

/**
 * @typedef {Object} DecisionAngelita
 * @property {('calma'|'aviso'|'celebra'|'husmea')} estado — comportamiento elegido.
 * @property {string} visualEstado — estado visual canónico para la cara.
 * @property {string|null} mensaje — lo que dice (null si se queda en calma).
 * @property {string} aria — narración para lector de pantalla.
 * @property {('alta'|'media'|'baja'|null)} severidad
 * @property {number} prioridad
 * @property {boolean} interrumpe — si de verdad debe surgir el mensaje ahora.
 * @property {string|null} prompt — prompt sugerido para sembrar al agente.
 * @property {string|null} logroId — id del logro celebrado (para no repetir).
 */

/** La decisión de reposo: Angelita tranquila, sin mensaje. */
function decisionCalma() {
  return {
    estado: 'calma',
    visualEstado: VISUAL_CALMA,
    mensaje: null,
    aria: ARIA_COMPORTAMIENTO.calma,
    severidad: null,
    prioridad: PRIORIDAD.calma,
    interrumpe: false,
    prompt: null,
    logroId: null,
  };
}

/**
 * Decide el comportamiento de Angelita en este momento, dado TODO el contexto.
 * Arbitra por prioridad (aviso urgente > celebra > aviso normal > husmea) y
 * luego deja que la anti-molestia decida si de verdad surge el mensaje. Si la
 * anti-molestia veta al ganador, Angelita se queda en CALMA (conservador:
 * mejor callar que molestar).
 *
 * @param {Object} ctx
 * @param {ReturnType<typeof notificacionesInteligentes>|null} [ctx.notificaciones]
 * @param {{ id:string, texto:string }|null} [ctx.logro] — logro REAL a celebrar.
 * @param {string|null} [ctx.ultimoLogroId] — último logro ya celebrado (dedup).
 * @param {string|null} [ctx.mundo] — mundo actual (para husmear).
 * @param {Object} [ctx.datosMundo] — datos reales del mundo (ver comentarioDeMundo).
 * @param {number} [ctx.ahoraMs]
 * @param {Object} [ctx.ultimaHablaPorLlave] — { [llaveCooldown]: ms } de la última vez.
 * @param {boolean} [ctx.ocupado]
 * @param {boolean} [ctx.silenciado]
 * @param {number} [ctx.molestia] contador adaptativo (#102/#106, sección 7).
 * @param {() => number} [ctx.rand] fuente de azar 0..1 para el modo aprendiz
 *   (#110, inyectable → testeable); default Math.random.
 * @returns {DecisionAngelita}
 */
export function resolverComportamiento(ctx = {}) {
  const {
    notificaciones = null,
    logro = null,
    ultimoLogroId = null,
    luto = null,
    ultimoLutoId = null,
    mundo = null,
    datosMundo = {},
    ahoraMs = Date.now(),
    ultimaHablaPorLlave = {},
    ocupado = false,
    silenciado = false,
    molestia = 0,
    rand = Math.random,
  } = ctx;

  /** @type {Array<{estado:string, prioridad:number, severidad:any, mensaje:string, prompt:string|null, logroId:string|null}>} */
  const candidatos = [];

  // Aviso — algo que atender.
  if (notificaciones && notificaciones.hay && notificaciones.lead) {
    candidatos.push({
      estado: 'aviso',
      prioridad: notificaciones.prioridad,
      severidad: notificaciones.severidad,
      mensaje: notificaciones.lead,
      prompt: notificaciones.prompt || null,
      logroId: null,
    });
  }

  // Celebra — un logro real que aún no hemos celebrado.
  if (logro && logro.id && logro.texto && logro.id !== ultimoLogroId) {
    candidatos.push({
      estado: 'celebra',
      prioridad: PRIORIDAD.celebra,
      severidad: null,
      mensaje: logro.texto,
      prompt: null,
      logroId: logro.id,
    });
  }

  // Luto (#109) — una pérdida real registrada, aún no acompañada. Mismo
  // patrón de dedup por id que celebra (nunca dos veces la misma planta).
  if (luto && luto.id && luto.texto && luto.id !== ultimoLutoId) {
    candidatos.push({
      estado: 'luto',
      prioridad: PRIORIDAD.luto,
      severidad: null,
      mensaje: luto.texto,
      prompt: null,
      logroId: luto.id,
    });
  }

  // Husmea — comentario grounded del mundo donde entró. #110 "modo
  // aprendiz": a veces, en contexto apto y con probabilidad baja, en vez
  // del comentario declarativo el compañero PREGUNTA para provocar
  // observación (dimensión educativa — Julieta 11 años). No tiene cooldown
  // propio: sigue siendo un 'husmea' normal, así que respeta el MISMO
  // cooldown por mundo y la MISMA cadencia adaptativa de siempre.
  if (mundo) {
    const pregunta = preguntaDeAprendiz({ mundo, datosMundo, rand });
    const comentario = pregunta || comentarioDeMundo(mundo, datosMundo);
    if (comentario) {
      candidatos.push({
        estado: 'husmea',
        prioridad: PRIORIDAD.husmea,
        severidad: null,
        mensaje: comentario,
        prompt: null,
        logroId: null,
      });
    }
  }

  if (candidatos.length === 0) return decisionCalma();

  // Gana la prioridad más alta.
  const ganador = candidatos.sort((a, b) => b.prioridad - a.prioridad)[0];

  // Para husmea el cooldown es POR MUNDO (no comentar el mismo mundo seguido);
  // para el resto, por tipo/severidad.
  const llave = ganador.estado === 'husmea'
    ? `husmea:${mundo}`
    : llaveCooldown(ganador.estado, ganador.severidad);
  const cooldownEstado = ganador.estado === 'husmea' ? 'husmea' : ganador.estado;

  const surge = debeHablar({
    estado: cooldownEstado,
    severidad: ganador.severidad,
    ahoraMs,
    ultimaMs: ultimaHablaPorLlave[llave] ?? null,
    ocupado,
    silenciado,
    molestia,
  });

  if (!surge) return decisionCalma();

  return {
    estado: /** @type {any} */ (ganador.estado),
    visualEstado: estadoVisualDeComportamiento(ganador.estado, { severidad: ganador.severidad }),
    mensaje: ganador.mensaje,
    aria: ariaDeComportamiento(ganador.estado),
    severidad: ganador.severidad,
    prioridad: ganador.prioridad,
    interrumpe: true,
    prompt: ganador.prompt,
    logroId: ganador.logroId,
  };
}

/** La llave de cooldown que corresponde a una decisión (para registrar la hora). */
export function llaveDeDecision(decision, mundo = null) {
  if (!decision || decision.estado === 'calma') return null;
  if (decision.estado === 'husmea') return `husmea:${mundo}`;
  return llaveCooldown(decision.estado, decision.severidad);
}

/* ─────────────────────────────────────────────────────────────────────────────
 * 7. CADENCIA ADAPTATIVA (#102/#106) — el compañero habla menos si lo
 *    ignoran/silencian/cierran seguido, y más si le prestan atención.
 *
 * Un solo contador entero de "molestia" (persistido en useAngelitaStore, NO
 * aquí — este módulo sigue siendo puro/sin storage). Sube con señales de
 * rechazo, baja con señales de atención real. El contador se traduce en un
 * MULTIPLICADOR sobre los cooldowns base de la sección 5 — nunca los
 * reemplaza: la cadencia sigue respetando aviso_alta=siempre-puede-hablar,
 * solo estira/encoge lo demás.
 *
 * Rango del contador: [-MOLESTIA_MAX_BUENA, MOLESTIA_MAX] — clamped, nunca
 * corre libre. Positivo = molesta, negativo = le presta atención.
 * ────────────────────────────────────────────────────────────────────────── */

const SEGUNDO = 1000;

/** Piso y techo de la cadencia adaptativa (nunca más rápido que el piso, y
 *  el techo evita un silencio eterno del que ya no se recupera). */
export const CADENCIA_MIN_MS = 13 * SEGUNDO;
export const CADENCIA_BASE_MS = 46 * SEGUNDO;
export const CADENCIA_MAX_MS = 6 * 60 * SEGUNDO;

/** Cuánto sube/baja el contador por cada señal (enteros, para que sea legible
 *  en devtools/telemetría — nada de floats acumulando error). */
export const MOLESTIA_DELTA = {
  silenciar: 3,
  abortarPaseo: 2,
  cerrarTipSinLeer: 1,
  abrirTip: -2,
  hablarle: -3,
};

/** El contador de molestia nunca corre libre: clamped a un rango razonable. */
export const MOLESTIA_MIN = -10;
export const MOLESTIA_MAX = 15;

/**
 * Aplica una señal al contador de molestia, clamped. Pura — el store es quien
 * persiste el resultado. `senal` es `string` (no `keyof typeof MOLESTIA_DELTA`)
 * a propósito: en runtime puede llegar cualquier string (evento externo,
 * telemetría futura) y una señal desconocida debe degradar sin mutar el
 * contador, no romper el tipado en el caller.
 * @param {number} contadorActual
 * @param {string} senal una de MOLESTIA_DELTA; desconocida = no-op.
 * @returns {number} nuevo contador, clamped a [MOLESTIA_MIN, MOLESTIA_MAX].
 */
export function aplicarSenalMolestia(contadorActual, senal) {
  const delta = MOLESTIA_DELTA[senal];
  if (!Number.isFinite(delta)) return contadorActual;
  const base = Number.isFinite(contadorActual) ? contadorActual : 0;
  return Math.min(MOLESTIA_MAX, Math.max(MOLESTIA_MIN, base + delta));
}

/**
 * Traduce el contador de molestia a un multiplicador de cadencia: más
 * molestia → cooldowns más largos (habla menos); más atención (contador
 * negativo) → cooldowns más cortos (habla más), sin pasar nunca el piso.
 * Lineal y simple a propósito — es un modulador, no un modelo.
 * @param {number} contador
 * @returns {number} multiplicador, ej. 0.6 (más seguido) .. 3 (mucho más raro).
 */
export function multiplicadorDeCadencia(contador) {
  const c = Number.isFinite(contador) ? contador : 0;
  if (c >= 0) {
    // 0 → 1x (cadencia base); MOLESTIA_MAX → 3x (mucho más espaciado).
    return 1 + (c / MOLESTIA_MAX) * 2;
  }
  // 0 → 1x; MOLESTIA_MIN → 0.4x (más seguido, nunca por debajo del piso).
  return 1 + (c / MOLESTIA_MIN) * -0.6;
}

/**
 * Cadencia efectiva (ms) para un cooldown base, dado el contador de molestia
 * — clamped SIEMPRE entre CADENCIA_MIN_MS y CADENCIA_MAX_MS. Úsese para
 * modular cooldowns de tips/husmeo (no toca aviso_alta, que sigue en 0 =
 * siempre puede hablar: una helada no espera a que el contador baje).
 * @param {number} cooldownBaseMs
 * @param {number} contadorMolestia
 * @returns {number}
 */
export function cadenciaEfectivaMs(cooldownBaseMs, contadorMolestia) {
  if (!(cooldownBaseMs > 0)) return 0; // 0 = "siempre puede" no se modula
  const mult = multiplicadorDeCadencia(contadorMolestia);
  return Math.min(CADENCIA_MAX_MS, Math.max(CADENCIA_MIN_MS, Math.round(cooldownBaseMs * mult)));
}

export default resolverComportamiento;
