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

/** Los cuatro estados canónicos del comportamiento de Angelita. */
export const ESTADOS_COMPORTAMIENTO = /** @type {const} */ ([
  'calma',
  'aviso',
  'celebra',
  'husmea',
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
 */
const VISUAL_CALMA = 'acompana';
const VISUAL_AVISO_URGENTE = 'preocupada';
const VISUAL_AVISO_TRANQUILO = 'invita';
const VISUAL_CELEBRA = 'contenta';
const VISUAL_HUSMEA = 'senala';

/** Narración para lectores de pantalla — usted, cercano, sin tecnicismos. */
const ARIA_COMPORTAMIENTO = {
  calma: 'Angelita la acompaña, tranquila',
  aviso: 'Angelita tiene algo importante que contarle',
  celebra: 'Angelita está contenta por usted',
  husmea: 'Angelita curiosea y le comenta algo de este mundo',
};

/**
 * Traduce un estado de comportamiento al estado VISUAL que consume la cara.
 * @param {string} estado - uno de ESTADOS_COMPORTAMIENTO.
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
 * @param {unknown} pantalla
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

/** Un dato "real" de inventario: array no vacío de { name, count>0 }. */
function inventarioReal(lista) {
  return Array.isArray(lista) && lista.some((x) => x && x.name && Number(x.count) > 0);
}

/** El ítem de inventario más numeroso (para aterrizar el comentario). */
function masNumeroso(lista) {
  if (!inventarioReal(lista)) return null;
  return [...lista]
    .filter((x) => x && x.name && Number(x.count) > 0)
    .sort((a, b) => Number(b.count) - Number(a.count))[0];
}

/** Limpia el "#03" del nombre y lo deja en minúscula amable. */
function nombreLimpio(name) {
  return String(name || '').replace(/\s*#\d+\s*$/, '').trim().toLowerCase();
}

/* Cada mundo sabe comentar CON los datos que tenga, y sabe callar honesto
   cuando no los tiene. `datos` es lo que el shell alcanzó a reunir localmente;
   ningún builder inventa cifras — sólo lee lo que le pasan. */
const COMENTARISTA_MUNDO = {
  mis_matas(datos = {}) {
    const top = masNumeroso(datos.cultivos);
    if (top) {
      const n = Number(top.count);
      const nombre = nombreLimpio(top.name);
      return n > 1
        ? `De sus matas, la que más tiene es ${nombre} — ${n} registradas. ¿Le hacemos seguimiento?`
        : `Tiene ${nombre} registrado en su finca. ¿Le echamos un ojo a cómo va?`;
    }
    return 'Todavía no me ha contado qué tiene sembrado. Cuando registre sus matas, le sigo el rastro a cada una.';
  },

  mis_animales(datos = {}) {
    const top = masNumeroso(datos.especies);
    const total = Number(datos.total);
    if (top) {
      const nombre = nombreLimpio(top.name);
      return `De sus animales, lo que más tiene es ${nombre}. ¿Revisamos cómo van?`;
    }
    if (Number.isFinite(total) && total > 0) {
      return `Tiene ${total} ${total === 1 ? 'animal anotado' : 'animales anotados'}. ¿Los repasamos?`;
    }
    return 'Aquí llevamos sus animales. Cuando anote los suyos, le ayudo con la cría, el alimento y la sanidad.';
  },

  clima(datos = {}) {
    const snap = datos.snapshot;
    const alertas = Array.isArray(snap?.alertas_locales) ? snap.alertas_locales.length : 0;
    if (alertas > 0) {
      return `El parte del clima trae ${alertas} ${alertas === 1 ? 'aviso' : 'avisos'} para su zona. ¿Se los muestro?`;
    }
    const fase = snap?.enso_status?.phase;
    if (fase && typeof datos.describirFase === 'function') {
      const desc = datos.describirFase(fase);
      if (desc && desc !== 'Estado del clima desconocido') {
        return `Por temporada, ${String(desc).toLowerCase()}. El clima del día en su finca manda; ¿le ayudo a leerlo?`;
      }
    }
    return 'No tengo el parte del clima a la mano ahora. Cuando haya señal se lo traigo — y el cielo de su finca siempre manda.';
  },

  vender(datos = {}) {
    // NUNCA inventamos precios. Sólo ofrecemos acompañar la venta.
    const top = masNumeroso(datos.cultivos);
    if (top) {
      const nombre = nombreLimpio(top.name);
      return `Cuando quiera vender, le ayudo a sacar cuentas y a presentar bien su ${nombre}. ¿Empezamos por ahí?`;
    }
    return 'Cuando tenga algo para vender, le ayudo a sacar cuentas y a presentarlo bien. Sin afán.';
  },

  aprender() {
    return '¿Qué quiere aprender hoy? Aquí estoy sin afán — pregúnteme sin pena.';
  },

  bosque() {
    // Verdad general, en pregunta (no es un dato de SU finca).
    return 'El bosque se recupera con paciencia. ¿Le muestro cómo un rastrojo vuelve a ser monte?';
  },

  paramo() {
    // Verdad geográfica segura: del páramo baja el agua de la finca andina.
    return 'Del páramo baja el agua de su finca. ¿Le cuento cómo se cuida ese nacimiento?';
  },

  finca(datos = {}) {
    const top = masNumeroso(datos.cultivos);
    if (top) {
      return 'Aquí está su finca. Toque el mundo que quiera revisar y yo le acompaño.';
    }
    return 'Aquí está su finca. Empecemos por registrar lo que tiene sembrado, y yo le sigo el rastro.';
  },
};

/**
 * Comentario de Angelita al entrar/pasar por un mundo. GROUNDED: usa sólo los
 * datos reales que le pasen; si faltan, cae a un acompañamiento honesto (nunca
 * inventa una cifra ni un dato agronómico).
 *
 * @param {string} mundo - uno de MUNDOS.
 * @param {Object} [datos] - datos reales locales del mundo:
 *   - mis_matas / vender / finca: { cultivos: Array<{name,count}> }
 *   - mis_animales: { especies: Array<{name,count}>, total?: number }
 *   - clima: { snapshot, describirFase?: (phase)=>string }
 * @returns {string|null} el comentario en usted, o null si el mundo no existe.
 */
export function comentarioDeMundo(mundo, datos = {}) {
  const fn = COMENTARISTA_MUNDO[mundo];
  if (!fn) return null;
  return fn(datos);
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
 * @param {Object} input - ver buildProactiveGreeting (activeAlerts, pendingTasks,
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
 * @param {string} [p.estado] - comportamiento candidato ('aviso'|'celebra'|'husmea'|'calma').
 * @param {('alta'|'media'|'baja'|null)} [p.severidad]
 * @param {number} [p.ahoraMs]
 * @param {number|null} [p.ultimaMs] - cuándo surgió por última vez ESE tipo.
 * @param {boolean} [p.ocupado] - el campesino está a mitad de algo (escribiendo, grabando…).
 * @param {boolean} [p.silenciado] - el usuario pidió silencio a Angelita.
 * @returns {boolean}
 */
export function debeHablar({
  estado,
  severidad = null,
  ahoraMs = Date.now(),
  ultimaMs = null,
  ocupado = false,
  silenciado = false,
} = {}) {
  if (silenciado) return false;
  if (estado === 'calma' || !estado) return false;
  const urgente = estado === 'aviso' && severidad === 'alta';
  // Nunca interrumpe a mitad de una tarea, salvo urgencia real.
  if (ocupado && !urgente) return false;
  const requerido = COOLDOWN_MS[llaveCooldown(estado, severidad)] ?? 0;
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
 * @property {('calma'|'aviso'|'celebra'|'husmea')} estado - comportamiento elegido.
 * @property {string} visualEstado - estado visual canónico para la cara.
 * @property {string|null} mensaje - lo que dice (null si se queda en calma).
 * @property {string} aria - narración para lector de pantalla.
 * @property {('alta'|'media'|'baja'|null)} severidad
 * @property {number} prioridad
 * @property {boolean} interrumpe - si de verdad debe surgir el mensaje ahora.
 * @property {string|null} prompt - prompt sugerido para sembrar al agente.
 * @property {string|null} logroId - id del logro celebrado (para no repetir).
 */

/** La decisión de reposo: Angelita tranquila, sin mensaje. */
/** @returns {DecisionAngelita} */
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
 * @param {{ id:string, texto:string }|null} [ctx.logro] - logro REAL a celebrar.
 * @param {string|null} [ctx.ultimoLogroId] - último logro ya celebrado (dedup).
 * @param {string|null} [ctx.mundo] - mundo actual (para husmear).
 * @param {Object} [ctx.datosMundo] - datos reales del mundo (ver comentarioDeMundo).
 * @param {number} [ctx.ahoraMs]
 * @param {Object} [ctx.ultimaHablaPorLlave] - { [llaveCooldown]: ms } de la última vez.
 * @param {boolean} [ctx.ocupado]
 * @param {boolean} [ctx.silenciado]
 * @returns {DecisionAngelita}
 */
export function resolverComportamiento(ctx = {}) {
  const {
    notificaciones = null,
    logro = null,
    ultimoLogroId = null,
    mundo = null,
    datosMundo = {},
    ahoraMs = Date.now(),
    ultimaHablaPorLlave = {},
    ocupado = false,
    silenciado = false,
  } = ctx;

  /** @type {Array<{estado:'aviso'|'celebra'|'husmea', prioridad:number, severidad:'alta'|'media'|'baja'|null, mensaje:string, prompt:string|null, logroId:string|null}>} */
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

  // Husmea — comentario grounded del mundo donde entró.
  if (mundo) {
    const comentario = comentarioDeMundo(mundo, datosMundo);
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
  });

  if (!surge) return decisionCalma();

  return {
    estado: ganador.estado,
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

export default resolverComportamiento;
