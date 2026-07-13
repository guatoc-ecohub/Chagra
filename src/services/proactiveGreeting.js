/**
 * proactiveGreeting.js — SALUDO PROACTIVO de entrada del agente Chagra.
 *
 * Operador 2026-06-03: "que el agente, de entrada, salude de forma proactiva:
 * SI ve algo pendiente (helada esta noche, riego pendiente, tarea de campo
 * vencida) → lo DICE (lo más importante, 1-2 cosas, no todo). Si NO hay nada
 * urgente → NO inventa alarmas, sino que da una IDEA contextual basada en lo
 * que ya se sabe (cultivos / clima / temporada de la finca)."
 *
 * Diseño objetivo: `chagra-pro/.../demo-agente-biopunk.html` (toggle
 * "Con pendientes | Sin urgencias").
 *
 * Esta es la LÓGICA PURA (testeable sin montar el componente). Reutiliza:
 *   - alertEngine / useAlertStore (#162): alertas clima/sensor activas.
 *   - useLogStore.getPendingTasks (#298): tareas log--task status=pending.
 *   - AnalisisProactivoIA (#331): MISMA filosofía (plantillas contextuales
 *     local-only, cero red, cero quema de GPU por refresh). Aquí extraemos el
 *     núcleo para que el AgentScreen lo consuma de entrada sin duplicar reglas.
 *   - agentService.temporadaColombiana / pisoTermicoFromAltitud: idea contextual.
 *   - ensoContext.getEnsoOutlook: lectura regional ENSO cuando NO hay pendientes.
 *
 * Español colombiano (tú/usted, SIN voseo argentino).
 *
 * El builder es PURO y SÍNCRONO: recibe datos ya resueltos y devuelve un objeto
 * de saludo. El wrapper `resolveProactiveGreeting` (async) hidrata desde stores.
 */

import { temporadaColombiana, pisoTermicoFromAltitud } from './agentService';

/**
 * @typedef {Object} GreetingItem
 * @property {string} kind   — 'alert' | 'task'
 * @property {string} icon   — emoji para el item
 * @property {string} title  — título corto y humano del pendiente
 * @property {string} [due]  - vencimiento legible (ej. "Hoy", "Vencida hace 2 días")
 *
 * @typedef {Object} Greeting
 * @property {string} hi      — saludo según hora ("Buenos días" / etc).
 * @property {('pending'|'idea')} state — con pendientes vs idea contextual.
 * @property {string} lead    — el texto que LIDERA (lo clave en 1-2 cosas, o la idea).
 * @property {GreetingItem[]} items — los 1-2 pendientes destacados (vacío si state==='idea').
 * @property {number} restCount — cuántos pendientes MÁS quedan en la campana/panel.
 * @property {string|null} prompt — prompt sugerido para sembrar al agente.
 */

const HORAS = {
  morning: 'Buenos días',
  afternoon: 'Buenas tardes',
  evening: 'Buenas noches',
  night: 'Buenas noches',
};

function saludoPorHora(date = new Date()) {
  const h = date.getHours();
  if (h >= 5 && h < 12) return HORAS.morning;
  if (h >= 12 && h < 18) return HORAS.afternoon;
  return HORAS.evening; // tarde-noche: una sola fórmula natural en Colombia
}

// Prioridad de severidad para ordenar lo MÁS importante primero.
const SEVERITY_RANK = { danger: 0, warning: 1, info: 2 };

// Iconos por tipo de alerta del alertEngine (#162). Fallback genérico.
const ALERT_ICONS = {
  helada: '❄️',
  frost: '❄️',
  calor: '🔥',
  heat: '🔥',
  lluvia: '🌧️',
  rain: '🌧️',
  sequia: '🌵',
  drought: '🌵',
  viento: '💨',
  wind: '💨',
  riego: '💧',
  irrigation: '💧',
  humedad: '💧',
  temp: '🌡️',
};

function alertIcon(type = '') {
  const t = String(type).toLowerCase();
  const key = Object.keys(ALERT_ICONS).find((k) => t.includes(k));
  return key ? ALERT_ICONS[key] : '⚠️';
}

/**
 * Normaliza una alerta del alertEngine a GreetingItem. Tolerante a forma:
 * acepta tanto el objeto del engine ({type,severity,title,message}) como un
 * shape mínimo. Severidad desconocida cuenta como 'info' (no la subimos sola).
 */
function alertToItem(alert) {
  if (!alert || typeof alert !== 'object') return null;
  const title = alert.title || alert.message || alert.type || 'Alerta activa';
  return {
    kind: 'alert',
    icon: alertIcon(alert.type),
    title: String(title).trim(),
    due: alert.due || null,
    _severity: SEVERITY_RANK[alert.severity] != null ? SEVERITY_RANK[alert.severity] : SEVERITY_RANK.info,
  };
}

/**
 * Días de atraso de una tarea respecto de hoy. La tarea log--task trae
 * `timestamp` (Unix en segundos, convención FarmOS) o `due`/`date` ISO. Sin
 * fecha → null (no la consideramos vencida, solo pendiente).
 */
function taskOverdueDays(task, now = Date.now()) {
  if (!task || typeof task !== 'object') return null;
  let dueMs = null;
  if (Number.isFinite(task.timestamp)) {
    // FarmOS: segundos. Si parece milisegundos (muy grande) lo dejamos igual.
    dueMs = task.timestamp > 1e12 ? task.timestamp : task.timestamp * 1000;
  } else if (task.due || task.date || task.due_date) {
    const parsed = Date.parse(task.due || task.date || task.due_date);
    if (Number.isFinite(parsed)) dueMs = parsed;
  }
  if (dueMs == null) return null;
  const days = Math.floor((now - dueMs) / (24 * 60 * 60 * 1000));
  return days; // >0 vencida, 0 hoy, <0 futura
}

function dueLabel(days) {
  if (days == null) return null;
  if (days <= 0 && days > -1) return 'Hoy';
  if (days < 0) return null; // futura: no la destacamos como urgente
  if (days === 1) return 'Vencida ayer';
  return `Vencida hace ${days} días`;
}

function taskTitle(task) {
  return (
    task?.name ||
    task?.title ||
    task?.attributes?.name ||
    task?.label ||
    'Tarea de campo pendiente'
  );
}

/**
 * Convierte la lista de tareas pendientes en items destacables, ordenados por
 * atraso (más vencidas primero). Solo las VENCIDAS o de HOY se vuelven items
 * destacados; las futuras quedan como conteo "resto".
 */
function pendingTasksToItems(tasks, now = Date.now()) {
  if (!Array.isArray(tasks)) return [];
  return tasks
    .map((t) => {
      const days = taskOverdueDays(t, now);
      return { task: t, days };
    })
    .filter((x) => x.days != null && x.days >= 0) // hoy o vencida
    .sort((a, b) => b.days - a.days) // más vencida primero
    .map((x) => ({
      kind: 'task',
      icon: '🧪',
      title: String(taskTitle(x.task)).trim(),
      due: dueLabel(x.days),
      _severity: x.days > 0 ? SEVERITY_RANK.warning : SEVERITY_RANK.info,
    }));
}

/**
 * Compone la frase que LIDERA con los pendientes destacados (máx 2). NO los
 * lista todos: el resto vive en la campana/panel. Tono campesino-claro.
 */
function buildPendingLead(items) {
  if (items.length === 1) {
    const a = items[0];
    const due = a.due ? ` (${a.due.toLowerCase()})` : '';
    return `Ojo: ${a.title}${due}. Te lo dejo de primero para que no se pase.`;
  }
  const [a, b] = items;
  const aDue = a.due ? ` (${a.due.toLowerCase()})` : '';
  const bDue = b.due ? ` (${b.due.toLowerCase()})` : '';
  return `Lo primero hoy: ${a.title}${aDue}. Y también ${b.title.toLowerCase()}${bDue}.`;
}

/**
 * Idea contextual cuando NO hay pendientes — NUNCA inventa una alarma. Teje, en
 * orden de disponibilidad: cultivo de temporada → piso térmico → temporada
 * andina → ENSO regional. Si no hay NADA de contexto, fallback amable.
 *
 * @param {Object} ctx
 * @param {Array<{name:string,count:number}>} ctx.cultivos
 * @param {number|null} ctx.altitud
 * @param {Object|null} ctx.ensoOutlook — { titulo, detalle, fuente } de getEnsoOutlook.
 * @param {Date} ctx.date
 */
/**
 * Enmarca la temporada bimodal como TENDENCIA de calendario — NUNCA como
 * afirmación del clima de HOY. `temporadaColombiana` es pura aritmética del mes;
 * el ENSO y la variabilidad del año la modulan, y el clima real de la finca
 * manda. (Fix 2026-06-03: el saludo afirmaba "estamos en temporada seca" en
 * plena época de lluvias — falso. Ahora es una referencia calendárica, no un
 * parte meteorológico, y siempre cede ante lo que el campesino ve en su finca.)
 */
function marcoCalendario(temporada) {
  return `el calendario marca ${temporada.nombre}, pero el clima real de tu finca manda`;
}

function buildIdeaLead({ cultivos = [], altitud = null, ensoOutlook = null, date = new Date() }) {
  const temporada = temporadaColombiana(date.getMonth() + 1);
  const piso = pisoTermicoFromAltitud(altitud);
  const topCultivo = Array.isArray(cultivos) && cultivos.length > 0
    ? [...cultivos].sort((a, b) => (b.count || 0) - (a.count || 0))[0]
    : null;

  if (topCultivo && topCultivo.name) {
    const nombre = String(topCultivo.name).replace(/\s*#\d+\s*$/, '').trim();
    return `Todo tranquilo por ahora. Buena semana para echarle un ojo a tu ${nombre.toLowerCase()} — ${marcoCalendario(temporada)}. ¿Cómo viene el tiempo por allá? ¿Te armo un plan?`;
  }

  if (piso) {
    return `Todo tranquilo por ahora. Tu finca está en piso térmico ${piso} — ${marcoCalendario(temporada)}. Buen momento para planear qué sembrar; ¿te muestro especies que van bien en tu zona?`;
  }

  if (ensoOutlook && ensoOutlook.titulo) {
    return `Todo tranquilo por ahora. ${ensoOutlook.titulo}: ${ensoOutlook.detalle} (${ensoOutlook.fuente}). ¿Quieres que ajustemos el calendario a eso?`;
  }

  return `Todo tranquilo por ahora — no hay nada urgente en tu finca. El calendario marca ${temporada.nombre}, pero el clima real manda; cuéntame qué tienes sembrado y cómo viene el tiempo, y te doy una mano con el plan.`;
}

/**
 * BUILDER PURO del saludo proactivo. Decide entre estado 'pending' (lidera con
 * lo clave) e 'idea' (idea contextual, sin inventar alarma).
 *
 * @param {Object} input
 * @param {Array} [input.activeAlerts] - alertas del alertEngine (#162).
 * @param {Array} [input.pendingTasks] - tareas log--task pending (#298).
 * @param {Array<{name:string,count:number}>} [input.cultivos] - inventario agrupado.
 * @param {number|null} [input.altitud] - altitud de la finca activa (msnm).
 * @param {Object|null} [input.ensoOutlook] - getEnsoOutlook (ensoContext).
 * @param {Date} [input.date] - inyectable para test.
 * @param {number} [input.maxItems=2] - cuántos pendientes destacar como máximo.
 * @returns {Greeting}
 */
export function buildProactiveGreeting({
  activeAlerts = [],
  pendingTasks = [],
  cultivos = [],
  altitud = null,
  ensoOutlook = null,
  date = new Date(),
  maxItems = 2,
} = {}) {
  const hi = saludoPorHora(date);

  // useAlertStore.activeAlerts es array; el engine internamente usa Map. Soporta
  // ambas formas por robustez (no regresar a 0 silencioso si cambia el store).
  const alertsArr = Array.isArray(activeAlerts)
    ? activeAlerts
    : (/** @type {any} */ (activeAlerts) instanceof Map ? Array.from(/** @type {any} */ (activeAlerts).values()) : []);

  const alertItems = alertsArr.map(alertToItem).filter(Boolean);
  const taskItems = pendingTasksToItems(pendingTasks, date.getTime());

  // Combinamos y ordenamos por severidad (danger > warning > info). Empates:
  // las alertas (ambiente) pesan un pelín más que las tareas a igual severidad.
  const ranked = [...alertItems, ...taskItems].sort((a, b) => {
    if (a._severity !== b._severity) return a._severity - b._severity;
    return (a.kind === 'alert' ? 0 : 1) - (b.kind === 'alert' ? 0 : 1);
  });

  if (ranked.length > 0) {
    const top = ranked.slice(0, maxItems).map(({ _severity, ...item }) => item);
    const restCount = ranked.length - top.length;
    return {
      hi,
      state: 'pending',
      lead: buildPendingLead(top),
      items: top,
      restCount,
      prompt: top[0].kind === 'alert'
        ? '¿Qué hago con la alerta de mi finca?'
        : '¿Por dónde empiezo con las tareas pendientes de hoy?',
    };
  }

  // Sin pendientes urgentes → idea contextual (NO inventa alarma).
  return {
    hi,
    state: 'idea',
    lead: buildIdeaLead({ cultivos, altitud, ensoOutlook, date }),
    items: [],
    restCount: 0,
    prompt: Array.isArray(cultivos) && cultivos.length > 0
      ? 'Dame un resumen del estado de mi finca hoy.'
      : 'Quiero planear qué sembrar. ¿Por dónde empiezo?',
  };
}

/**
 * Wrapper que HIDRATA el saludo desde los stores en vivo. async porque
 * getPendingTasks lee IndexedDB. No falla nunca: degrada a idea/fallback si
 * algún store no responde. Pensado para llamarse al montar el AgentScreen.
 *
 * Las dependencias se inyectan para no acoplar a imports de Zustand en el
 * builder puro (y para test). El AgentScreen pasa los selectores reales.
 *
 * @param {Object} deps
 * @param {Array} deps.activeAlerts
 * @param {Function} deps.getPendingTasks — () => Promise<Array>
 * @param {Array<{name:string,count:number}>} deps.cultivos
 * @param {number|null} deps.altitud
 * @param {Object|null} deps.ensoOutlook
 * @param {Date} [deps.date]
 * @returns {Promise<Greeting>}
 */
export async function resolveProactiveGreeting(opts = /** @type {any} */ ({})) {
  const {
    activeAlerts = [],
    getPendingTasks = null,
    cultivos = [],
    altitud = null,
    ensoOutlook = null,
    date = new Date(),
  } = opts;
  let pendingTasks = [];
  if (typeof getPendingTasks === 'function') {
    try {
      const ts = await getPendingTasks();
      pendingTasks = Array.isArray(ts) ? ts : [];
    } catch (_) {
      pendingTasks = [];
    }
  }
  return buildProactiveGreeting({ activeAlerts, pendingTasks, cultivos, altitud, ensoOutlook, date });
}
