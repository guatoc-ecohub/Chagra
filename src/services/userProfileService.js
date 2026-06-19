/**
 * userProfileService.js — perfil enriquecido del usuario (#200).
 *
 * Recoge las respuestas del onboarding extendido (hasta 18 preguntas
 * condicionales) y las persiste en `localStorage` bajo el namespace
 * `chagra:profile:*`. El perfil alimenta `buildProfileContext()` del
 * agentService para que el agente conversacional adapte sus respuestas
 * (tono, nivel técnico, cultivos, objetivos) a cada usuario.
 *
 * SEGURIDAD / PRIVACIDAD:
 *   - 100% client-side. NADA se envía a ningún backend. El perfil vive
 *     solo en el dispositivo del usuario (soberanía agroecológica ADR-007).
 *   - Sin hostnames/IPs/tokens internos (repo público — SOP §2).
 *
 * UX:
 *   - Todas las preguntas son SKIPPABLE (respeta #283 — usuarios sin
 *     tiempo). Una respuesta vacía/saltada NO bloquea el flujo.
 *   - Preguntas condicionales: no se muestran las 18 siempre. La
 *     condición `when(answers)` decide si la pregunta aplica según
 *     respuestas previas (ej: si vocación = "urbano" no se pregunta
 *     hectáreas ni altitud rural).
 *
 * Español colombiano (tú/usted, SIN voseo argentino).
 *
 * @module userProfileService
 */

import { findMunicipio } from '../utils/colombiaLocations.js';

const PROFILE_PREFIX = 'chagra:profile:';
const PROFILE_KEY = `${PROFILE_PREFIX}v1`;
const PROFILE_DONE_KEY = `${PROFILE_PREFIX}done:v1`;
const PROFILE_SKIPPED_KEY = `${PROFILE_PREFIX}skipped:v1`;

const hasStorage = () => typeof window !== 'undefined' && !!window.localStorage;

/**
 * Catálogo de preguntas del onboarding extendido.
 *
 * Cada pregunta:
 *   - id:        clave única (se guarda en el perfil)
 *   - category:  agrupador (identidad | finca | experiencia | objetivos | preferencias)
 *   - title:     enunciado mostrado al usuario
 *   - help:      texto auxiliar opcional
 *   - type:      'text' | 'single' | 'multi' | 'number'
 *   - options:   [{ value, label }] para single/multi
 *   - placeholder/unit: para text/number
 *   - when:      (answers) => boolean — condición de visibilidad. Si se
 *                omite, la pregunta siempre aplica.
 *
 * El array es la fuente de verdad del flujo. Son 18 preguntas; las
 * condicionales reducen el número efectivo según el perfil.
 */
export const PROFILE_QUESTIONS = [
  // ── Identidad ────────────────────────────────────────────────────────
  {
    id: 'nombre',
    category: 'identidad',
    title: '¿Cómo te llamas?',
    help: 'Para que el agente te salude por tu nombre. Puedes dejarlo en blanco.',
    type: 'text',
    placeholder: 'Tu nombre',
  },
  {
    id: 'region',
    category: 'identidad',
    title: '¿En qué municipio o región cultivas?',
    help: 'Ej: Choachí, Cauca, Antioquia. Ayuda a dar consejos según tu clima y costumbres.',
    type: 'text',
    placeholder: 'Municipio o departamento',
  },
  {
    id: 'vocacion',
    category: 'identidad',
    title: '¿Cómo te describes mejor?',
    type: 'single',
    options: [
      { value: 'campesino', label: 'Campesino/a — vivo del campo' },
      { value: 'urbano', label: 'Cultivo urbano — balcón, terraza o patio' },
      { value: 'tecnico', label: 'Técnico/a o agrónomo/a' },
      { value: 'curioso', label: 'Curioso/a — apenas estoy aprendiendo' },
    ],
  },
  {
    // ROL de producto (onboarding por perfil). Afina qué herramientas
    // (chips de modo) se despliegan primero. NO es rol de seguridad — es un
    // perfil de USO. Los valores coinciden con PROFILE_ROLES de
    // profileChipSelector.js (fuente de la selección de chips). Skippable:
    // si lo saltan, el rol se infiere de vocación/objetivo/animales.
    id: 'rol',
    category: 'identidad',
    title: '¿Qué es lo tuyo en el campo?',
    help: 'Define qué herramientas te mostramos primero. Puedes saltarlo.',
    type: 'single',
    options: [
      { value: 'campesino', label: '🌱 Cultivo comida — siembro y cosecho' },
      { value: 'ganadero', label: '🐄 Tengo animales — gallinas, cerdos o ganado' },
      { value: 'restaurador', label: '🌳 Restauro la tierra — nativas, bosque, páramo' },
      { value: 'guia_glaciar', label: '⛰️ Guío en la montaña — páramo y glaciar' },
      { value: 'tecnico', label: '🔬 Acompaño técnicamente — agrónomo/a o asesor/a' },
      { value: 'socio', label: '🤝 Soy aliado/a o apenas miro' },
    ],
  },

  // ── Finca ────────────────────────────────────────────────────────────
  {
    id: 'finca_tipo',
    category: 'finca',
    title: '¿Dónde cultivas?',
    type: 'single',
    options: [
      { value: 'rural', label: 'Finca o parcela rural' },
      { value: 'balcon', label: 'Balcón o ventana' },
      { value: 'terraza', label: 'Terraza o patio' },
      { value: 'invernadero', label: 'Invernadero' },
    ],
  },
  {
    id: 'finca_hectareas',
    category: 'finca',
    title: '¿Qué tamaño tiene tu finca?',
    help: 'Aproximado, en hectáreas. Si no lo sabes, sáltalo.',
    type: 'single',
    options: [
      { value: 'menos_1', label: 'Menos de 1 hectárea' },
      { value: '1_5', label: 'Entre 1 y 5 hectáreas' },
      { value: '5_20', label: 'Entre 5 y 20 hectáreas' },
      { value: 'mas_20', label: 'Más de 20 hectáreas' },
    ],
    // Condicional: solo si NO es urbano (balcón/terraza no tienen hectáreas).
    when: (a) => a.vocacion !== 'urbano' && !['balcon', 'terraza'].includes(a.finca_tipo),
  },
  {
    id: 'finca_altitud',
    category: 'finca',
    title: '¿A qué altura está tu finca?',
    help: 'En metros sobre el nivel del mar (msnm). Define tu piso térmico. Si no la sabes, la detectamos por ubicación.',
    type: 'number',
    placeholder: '1730',
    unit: 'msnm',
    // Condicional: solo para cultivo rural / invernadero (no aplica a balcón urbano).
    when: (a) => a.vocacion !== 'urbano' && !['balcon', 'terraza'].includes(a.finca_tipo),
  },
  {
    id: 'cultivos_actuales',
    category: 'finca',
    title: '¿Qué cultivas ahora mismo?',
    help: 'Escribe los cultivos que tienes. Ej: café, mora, tomate, plátano.',
    type: 'text',
    placeholder: 'Café, mora, tomate...',
  },
  {
    // ANIMALES (onboarding por perfil). Pregunta pertinente para campesinos y
    // ganaderos. Alimenta la selección de chips: si tiene animales, se le
    // despliega el chip de silvopastoreo (forraje/ganado — el chip REAL que
    // cubre el ángulo pecuario; no existe chip "gallinas" ni "cerdos" en el
    // manifiesto, no se inventan). Multi + skippable. No aplica a cultivo
    // urbano de balcón (sin espacio para animales).
    id: 'animales',
    category: 'finca',
    title: '¿Qué animales tienes?',
    help: 'Marca todos los que apliquen, o sáltala si no tienes.',
    type: 'multi',
    options: [
      { value: 'gallinas', label: '🐔 Gallinas o pollos' },
      { value: 'cerdos', label: '🐖 Cerdos' },
      { value: 'ganado', label: '🐄 Ganado (vacas)' },
      { value: 'ovejas_cabras', label: '🐑 Ovejas o cabras' },
      { value: 'otros', label: '🐝 Otros (abejas, peces, conejos...)' },
      { value: 'ninguno', label: 'Ninguno por ahora' },
    ],
    // No aplica al cultivo urbano de balcón/terraza (sin espacio pecuario).
    when: (a) => a.vocacion !== 'urbano' && !['balcon', 'terraza'].includes(a.finca_tipo),
  },
  {
    // Para gallinas: aclara el manejo (libres / galpón / corral). Ejemplo
    // explícito del brief (carlos.rivera). Solo si marcó gallinas. Refina el
    // contexto del agente; no cambia la selección de chips por sí sola.
    id: 'gallinas_manejo',
    category: 'finca',
    title: '¿Cómo tienes las gallinas?',
    help: 'Ayuda a dar mejor consejo de sanidad y postura.',
    type: 'single',
    options: [
      { value: 'libres', label: 'Sueltas / libres (pastoreo)' },
      { value: 'galpon', label: 'En galpón' },
      { value: 'corral', label: 'En corral cercado' },
      { value: 'mixto', label: 'Mixto — entran y salen' },
    ],
    when: (a) => Array.isArray(a.animales) && a.animales.includes('gallinas'),
  },
  {
    // OBJETIVO de restauración (onboarding por perfil). Pertinente para
    // restauradores y guías de páramo/glaciar. Refina el contexto y refuerza
    // la selección de chips de restauración. Skippable.
    id: 'restauracion_objetivo',
    category: 'finca',
    title: '¿Qué te gustaría recuperar?',
    help: 'Marca lo que quieres restaurar con nativas. Opcional.',
    type: 'multi',
    options: [
      { value: 'bosque', label: '🌳 Bosque nativo' },
      { value: 'ribera', label: '💧 Orilla de quebrada o nacimiento' },
      { value: 'paramo', label: '⛰️ Páramo (sobre 3000 m)' },
      { value: 'cortafuegos', label: '🔥 Barrera contra incendios' },
      { value: 'silvopastoreo', label: '🐄 Árboles + forraje para ganado' },
    ],
    // Solo si el rol es restaurador / guía de glaciar (perfiles ecológicos).
    when: (a) => ['restaurador', 'guia_glaciar'].includes(a.rol),
  },

  // ── Experiencia ──────────────────────────────────────────────────────
  {
    id: 'anios_cultivando',
    category: 'experiencia',
    title: '¿Hace cuánto cultivas?',
    type: 'single',
    options: [
      { value: 'apenas', label: 'Apenas estoy empezando' },
      { value: 'menos_5', label: 'Menos de 5 años' },
      { value: '5_15', label: 'Entre 5 y 15 años' },
      { value: 'toda_vida', label: 'Toda la vida' },
    ],
  },
  {
    id: 'manejo',
    category: 'experiencia',
    title: '¿Cómo manejas tus cultivos?',
    type: 'single',
    options: [
      { value: 'organico', label: 'Orgánico / agroecológico' },
      { value: 'convencional', label: 'Convencional (agroquímicos)' },
      { value: 'mixto', label: 'Mixto — combino los dos' },
      { value: 'transicion', label: 'En transición a orgánico' },
    ],
  },
  {
    id: 'problemas',
    category: 'experiencia',
    title: '¿Qué problemas tienes con frecuencia?',
    help: 'Marca todos los que apliquen.',
    type: 'multi',
    options: [
      { value: 'plagas', label: 'Plagas e insectos' },
      { value: 'enfermedades', label: 'Enfermedades de plantas' },
      { value: 'clima', label: 'Clima (sequía, heladas, lluvia)' },
      { value: 'suelo', label: 'Suelo pobre o erosionado' },
      { value: 'malezas', label: 'Malezas' },
      { value: 'mercado', label: 'Vender la cosecha' },
    ],
  },

  // ── Objetivos ────────────────────────────────────────────────────────
  {
    id: 'objetivo',
    category: 'objetivos',
    title: '¿Qué quieres lograr con Chagra?',
    type: 'multi',
    options: [
      { value: 'producir_mas', label: 'Producir más y mejor' },
      { value: 'reducir_quimicos', label: 'Reducir o eliminar químicos' },
      { value: 'aprender', label: 'Aprender y entender mi cultivo' },
      { value: 'registrar', label: 'Llevar registro de mi finca' },
      { value: 'biodiversidad', label: 'Cuidar la biodiversidad' },
      { value: 'vender', label: 'Vender mejor mis productos' },
    ],
  },
  {
    id: 'cultivos_interes',
    category: 'objetivos',
    title: '¿Qué cultivos te gustaría sembrar o mejorar?',
    help: 'Cultivos nuevos que te interesan. Opcional.',
    type: 'text',
    placeholder: 'Aguacate, cacao, hortalizas...',
  },

  // ── Preferencias ─────────────────────────────────────────────────────
  {
    id: 'nivel_respuestas',
    category: 'preferencias',
    title: '¿Cómo prefieres que el agente te responda?',
    type: 'single',
    options: [
      { value: 'simple', label: 'Simple y al grano' },
      { value: 'detallado', label: 'Detallado, con explicación técnica' },
    ],
  },
  {
    id: 'notif_clima',
    category: 'preferencias',
    title: '¿Quieres alertas de clima para tu zona?',
    help: 'Avisos de lluvia, heladas o sequía relevantes para tus cultivos.',
    type: 'single',
    options: [
      { value: 'si', label: 'Sí, avísame' },
      { value: 'no', label: 'No, gracias' },
    ],
  },
  {
    id: 'estrato',
    category: 'finca',
    title: '¿En qué estrato vives?',
    help: 'Solo para cultivo urbano — ayuda a sugerir soluciones según tu espacio. Opcional.',
    type: 'single',
    options: [
      { value: '1_2', label: 'Estrato 1 o 2' },
      { value: '3_4', label: 'Estrato 3 o 4' },
      { value: '5_6', label: 'Estrato 5 o 6' },
    ],
    // Condicional: solo para usuarios urbanos.
    when: (a) => a.vocacion === 'urbano' || ['balcon', 'terraza'].includes(a.finca_tipo),
  },
  {
    id: 'espacio_urbano',
    category: 'finca',
    title: '¿Cuánto espacio tienes para cultivar?',
    help: 'Aproximado. Solo para cultivo urbano.',
    type: 'single',
    options: [
      { value: 'materas', label: 'Unas pocas materas' },
      { value: 'balcon_lleno', label: 'Un balcón completo' },
      { value: 'terraza_grande', label: 'Una terraza o patio grande' },
    ],
    when: (a) => a.vocacion === 'urbano' || ['balcon', 'terraza'].includes(a.finca_tipo),
  },
  {
    id: 'riego',
    category: 'finca',
    title: '¿Cómo riegas tus cultivos?',
    type: 'single',
    options: [
      { value: 'lluvia', label: 'Solo lluvia (secano)' },
      { value: 'manguera', label: 'Manguera o regadera' },
      { value: 'goteo', label: 'Riego por goteo o aspersión' },
      { value: 'acequia', label: 'Acequia o gravedad' },
    ],
    // Condicional: no aplica a balcón con pocas materas (se asume riego manual).
    when: (a) => a.vocacion !== 'urbano' && a.finca_tipo !== 'balcon',
  },
];

/**
 * Devuelve la lista de preguntas que aplican dado el set de respuestas
 * acumuladas. Evalúa `when(answers)` para las condicionales.
 *
 * @param {Object} answers - respuestas acumuladas { id: valor }
 * @returns {Array} subconjunto de PROFILE_QUESTIONS visible
 */
export function getApplicableQuestions(answers = {}) {
  return PROFILE_QUESTIONS.filter((q) => (typeof q.when === 'function' ? q.when(answers) : true));
}

/**
 * Lee el perfil guardado desde localStorage.
 *
 * @returns {Object} perfil { ...respuestas } o {} si no existe
 */
export function getProfile() {
  if (!hasStorage()) return {};
  try {
    const raw = window.localStorage.getItem(PROFILE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch (e) {
    console.warn('[userProfile] No se pudo leer el perfil:', e);
    return {};
  }
}

/**
 * Municipio "limpio" del usuario para el clima / contexto del agente.
 *
 * #338 (consistencia onboarding ↔ finca): los perfiles NUEVOS guardan
 * `municipio` aparte (lo escribe LocationDetectedScreen al confirmar). Pero los
 * perfiles VIEJOS — creados antes de ese campo — solo tienen `region` en texto
 * libre (p. ej. "Choachí, Cundinamarca"). Este helper retrocompatibiliza:
 * prefiere `municipio`; si falta, intenta resolver `region` contra el dataset
 * DANE embebido (offline, sin red). Devuelve null si no hay nada resoluble.
 *
 * @returns {string|null}
 */
export function getProfileMunicipio() {
  const p = getProfile();
  if (p.municipio) return p.municipio;
  if (p.region) {
    const hit = findMunicipio(p.region);
    if (hit) return hit.name;
  }
  return null;
}

/**
 * Determina qué altitud y fuente guardar en el perfil de forma no destructiva.
 *
 * Regla de coalesce (regresion #1213):
 *   - Si el usuario escribió la altitud a mano ('manual') → siempre prevalece.
 *   - Si la altitud resuelta viene de GPS real o Open-Elevation ('dado' /
 *     'elevation_api') → persiste, incluso sobre una previa 'cabecera'.
 *   - Si la altitud resuelta es SOLO de cabecera DANE ('cabecera') y el perfil
 *     existente ya tiene una altitud buena (source != 'cabecera') → NO pisar.
 *     Se devuelve undefined para finca_altitud para que saveProfile no la toque.
 *
 * Esta función es pura (sin efectos): facilita pruebas unitarias y evita
 * duplicar la lógica en LocationDetectedScreen.
 *
 * @param {{
 *   altitudSource: 'manual'|'derived',
 *   resolvedAltitudFuente: 'dado'|'elevation_api'|'cabecera'|null,
 *   effectiveAltitud: number|null,
 *   existingFincaAltitud: string|number|null|undefined,
 *   existingAltitudSource: string|null|undefined,
 * }} opts
 * @returns {{ finca_altitud: string|undefined, altitud_source: string|undefined }}
 */
export function resolveAltitudToSave({
  altitudSource,
  resolvedAltitudFuente,
  effectiveAltitud,
  existingFincaAltitud,
  existingAltitudSource,
}) {
  // ¿Solo tenemos cabecera y no hubo ajuste manual en este flujo?
  const isCabeceraOnly = altitudSource !== 'manual' && resolvedAltitudFuente === 'cabecera';
  // ¿El perfil ya tiene una altitud buena (no de cabecera)?
  const profileHasGoodAltitud =
    existingFincaAltitud != null &&
    existingAltitudSource != null &&
    existingAltitudSource !== 'cabecera';

  if (isCabeceraOnly && profileHasGoodAltitud) {
    // Conservar la altitud existente; no actualizar.
    return { finca_altitud: undefined, altitud_source: undefined };
  }

  const finca_altitud =
    effectiveAltitud != null ? String(effectiveAltitud) : undefined;
  const altitud_source =
    finca_altitud === undefined
      ? undefined
      : altitudSource === 'manual'
        ? 'manual'
        : resolvedAltitudFuente ?? 'derived';

  return { finca_altitud, altitud_source };
}

/**
 * Persiste (merge) respuestas parciales o completas del perfil.
 *
 * @param {Object} partial - respuestas a guardar { id: valor }
 * @returns {Object} perfil resultante tras el merge
 */
export function saveProfile(partial = {}) {
  if (!hasStorage()) return { ...partial };
  const current = getProfile();
  const next = { ...current, ...partial, updatedAt: new Date().toISOString() };
  try {
    window.localStorage.setItem(PROFILE_KEY, JSON.stringify(next));
  } catch (e) {
    console.warn('[userProfile] No se pudo guardar el perfil:', e);
  }
  return next;
}

/**
 * Estilo de notificación de alertas en la portada del agente (operador
 * 2026-06-06). Define CÓMO se muestra una alerta clima/helada activa:
 *   - 'demo':   chip llamativo en la escena (⚠ borde de acento). POR DEFECTO.
 *   - 'actual': comportamiento clásico (campanita / NotificationsBell).
 * Se guarda en el perfil (`estilo_notificacion`) como cualquier otra pref.
 */
export const NOTIFICATION_STYLES = Object.freeze(['demo', 'actual']);
export const DEFAULT_NOTIFICATION_STYLE = 'demo';

/**
 * Lee el estilo de notificación preferido. Si el perfil no lo trae o trae un
 * valor inválido, devuelve el default ('demo' — chip estilo demo).
 *
 * @returns {'demo'|'actual'}
 */
export function getNotificationStyle() {
  const v = getProfile()?.estilo_notificacion;
  return NOTIFICATION_STYLES.includes(v) ? v : DEFAULT_NOTIFICATION_STYLE;
}

/**
 * Persiste el estilo de notificación en el perfil. Ignora valores inválidos
 * (cae al default) para no corromper el perfil.
 *
 * Emite `chagra:notif-style-changed` para que los consumidores montados
 * (TopBar, AgentHero) re-lean la preferencia en vivo — desde 2026-06-11 el
 * estilo decide CUÁL campana se renderiza (una sola, bug "dos campanas").
 *
 * @param {'demo'|'actual'} style
 * @returns {Object} perfil resultante
 */
export function setNotificationStyle(style) {
  const next = NOTIFICATION_STYLES.includes(style) ? style : DEFAULT_NOTIFICATION_STYLE;
  const profile = saveProfile({ estilo_notificacion: next });
  try {
    window.dispatchEvent(new CustomEvent('chagra:notif-style-changed', { detail: { style: next } }));
  } catch (_) { /* SSR/tests sin window — la pref ya quedó persistida */ }
  return profile;
}

/** Marca el onboarding de perfil como completado. */
export function markProfileDone() {
  if (!hasStorage()) return;
  try {
    window.localStorage.setItem(PROFILE_DONE_KEY, '1');
  } catch (e) {
    console.warn('[userProfile] markProfileDone:', e);
  }
  try {
    const p = getProfile();
    import('./pilotTelemetryService.js').then(({ recordPilotEvent }) => {
      recordPilotEvent({
        event_type: 'onboarding_completado',
        metadata: {
          vocacion: p.vocacion,
          finca_tipo: p.finca_tipo,
          tiene_animales: Array.isArray(p.animales) && p.animales.length > 0 && !p.animales.includes('ninguno'),
          tiempo_segundos: p.onboarding_tiempo_segundos,
        },
      }).catch(() => {});
    }).catch(() => {});
  } catch (_) { /* telemetría nunca rompe el flujo */ }
}

/** Marca que el usuario saltó el onboarding (respeta #283). */
export function markProfileSkipped() {
  if (!hasStorage()) return;
  try {
    window.localStorage.setItem(PROFILE_SKIPPED_KEY, '1');
  } catch (e) {
    console.warn('[userProfile] markProfileSkipped:', e);
  }
}

/** @returns {boolean} si el usuario ya completó o saltó el onboarding. */
export function hasSeenProfileOnboarding() {
  if (!hasStorage()) return false;
  return (
    window.localStorage.getItem(PROFILE_DONE_KEY) === '1' ||
    window.localStorage.getItem(PROFILE_SKIPPED_KEY) === '1'
  );
}

const LABEL_LOOKUP = (() => {
  const map = {};
  for (const q of PROFILE_QUESTIONS) {
    if (Array.isArray(q.options)) {
      map[q.id] = Object.fromEntries(q.options.map((o) => [o.value, o.label]));
    }
  }
  return map;
})();

function humanizeAnswer(question, value) {
  if (value == null || value === '') return null;
  const opts = LABEL_LOOKUP[question.id];
  if (Array.isArray(value)) {
    const labels = value.map((v) => (opts && opts[v]) || v).filter(Boolean);
    return labels.length ? labels.join(', ') : null;
  }
  if (opts && opts[value]) return opts[value];
  return String(value);
}

/**
 * Construye un bloque de texto en español listo para inyectarse en el
 * system prompt del agente. Resume el perfil del usuario para que el
 * modelo adapte tono, nivel técnico, cultivos y objetivos.
 *
 * Devuelve string vacío si no hay perfil — el agente sigue funcionando
 * exactamente como antes (sin breaking change).
 *
 * @param {Object} [profile] - perfil; si se omite, se lee de localStorage
 * @returns {string}
 */
export function buildUserProfileBlock(profile) {
  const p = profile || getProfile();
  if (!p || typeof p !== 'object') return '';

  const lines = [];
  const push = (label, val) => {
    if (val != null && val !== '') lines.push(`- ${label}: ${val}`);
  };

  if (p.nombre) push('Nombre', p.nombre);
  if (p.region) push('Región', p.region);
  if (p.vereda) push('Vereda', p.vereda);
  if (p.municipio) push('Municipio', p.municipio);
  if (p.departamento) push('Departamento', p.departamento);

  const vocacionLabels = {
    campesino: 'campesino/a (vive del campo)',
    urbano: 'cultivo urbano (balcón/terraza)',
    tecnico: 'técnico/a o agrónomo/a',
    curioso: 'principiante curioso/a',
  };
  if (p.vocacion) push('Perfil', vocacionLabels[p.vocacion] || p.vocacion);

  const rolLabels = {
    campesino: 'productor agrícola (cultiva comida)',
    ganadero: 'productor pecuario (tiene animales)',
    restaurador: 'restaurador ecológico (nativas, bosque, páramo)',
    guia_glaciar: 'guía de alta montaña (páramo y glaciar)',
    tecnico: 'técnico/a o asesor/a de extensión',
    socio: 'aliado/a u observador/a',
  };
  if (p.rol) push('Rol', rolLabels[p.rol] || p.rol);

  const byId = (id) => PROFILE_QUESTIONS.find((q) => q.id === id);
  push('Tipo de cultivo', humanizeAnswer(byId('finca_tipo') || {}, p.finca_tipo));
  push('Tamaño', humanizeAnswer(byId('finca_hectareas') || {}, p.finca_hectareas));
  if (p.finca_altitud) push('Altitud', `${p.finca_altitud} msnm`);
  if (p.piso_termico) push('Piso térmico', p.piso_termico);
  push('Cultivos actuales', p.cultivos_actuales);
  push('Animales', humanizeAnswer(byId('animales') || {}, p.animales));
  push('Manejo de gallinas', humanizeAnswer(byId('gallinas_manejo') || {}, p.gallinas_manejo));
  push('Quiere restaurar', humanizeAnswer(byId('restauracion_objetivo') || {}, p.restauracion_objetivo));
  push('Experiencia', humanizeAnswer(byId('anios_cultivando') || {}, p.anios_cultivando));
  push('Manejo', humanizeAnswer(byId('manejo') || {}, p.manejo));
  push('Problemas frecuentes', humanizeAnswer(byId('problemas') || {}, p.problemas));
  push('Objetivos', humanizeAnswer(byId('objetivo') || {}, p.objetivo));
  push('Cultivos de interés', p.cultivos_interes);
  push('Riego', humanizeAnswer(byId('riego') || {}, p.riego));

  if (lines.length === 0) return '';

  // Directiva de nivel técnico según preferencia del usuario.
  let tono = '';
  if (p.nivel_respuestas === 'simple') {
    tono =
      '\nIMPORTANTE: este usuario prefiere respuestas SIMPLES y al grano. Evita tecnicismos innecesarios, usa lenguaje cercano y campesino. Da pasos concretos, no teoría larga.';
  } else if (p.nivel_respuestas === 'detallado') {
    tono =
      '\nIMPORTANTE: este usuario prefiere respuestas DETALLADAS y técnicas. Puedes profundizar con nombres científicos, dosis, mecanismos y citar fuentes.';
  }

  return `=== PERFIL DEL USUARIO (personaliza tus respuestas a este contexto) ===
${lines.join('\n')}${tono}
Adapta cultivos, clima y recomendaciones a este perfil. Si un dato del perfil
contradice lo que el usuario dice ahora, dale prioridad a lo que dice ahora.
=== FIN PERFIL DEL USUARIO ===`;
}

/**
 * Consentimiento de telemetría de uso del agente (#6230).
 *
 * Si el usuario habilita esta opción, los metadatos anónimos de las
 * consultas al agente (route, model, latencias, tokens, etc.) se envían
 * al backend de telemetría para mejorar el producto. El prompt COMPLETO
 * nunca se envía (privacidad-first). Default: OFF.
 *
 * Se guarda en localStorage independiente del perfil para separar
 * identidad (nombre, región) de métricas agregadas (latencias, modelos).
 */
const TELEMETRY_CONSENT_KEY = `${PROFILE_PREFIX}telemetry_consent:v1`;

/**
 * Lee el consentimiento de telemetría. Default: false (OFF).
 * @returns {boolean}
 */
export function getTelemetryConsent() {
  if (!hasStorage()) return false;
  try {
    const value = window.localStorage.getItem(TELEMETRY_CONSENT_KEY);
    return value === 'true';
  } catch (e) {
    console.warn('[userProfile] No se pudo leer consentimiento telemetría:', e);
    return false;
  }
}

/**
 * Persiste el consentimiento de telemetría.
 * @param {boolean} enabled
 * @returns {boolean} valor guardado
 */
export function setTelemetryConsent(enabled) {
  if (!hasStorage()) return false;
  try {
    window.localStorage.setItem(TELEMETRY_CONSENT_KEY, enabled ? 'true' : 'false');
    return enabled;
  } catch (e) {
    console.warn('[userProfile] No se pudo guardar consentimiento telemetría:', e);
    return false;
  }
}

/**
 * Visibilidad de módulos del Home (#7003).
 *
 * El usuario puede elegir qué módulos del Home se muestran. Por defecto
 * todos los módulos están visibles. La configuración se guarda en el perfil
 * bajo el campo 'modulos_visibles' como un objeto { moduleId: boolean }.
 */

/**
 * Catálogo de módulos disponibles en el Home.
 *
 * Cada módulo tiene:
 *   - id: identificador único (coincide con SECTION_COMPONENTS en DashboardLive)
 *   - label: nombre legible para el usuario
 *   - description: descripción corta
 *   - category: categoría agrupadora (para organización en ProfileScreen)
 */
export const HOME_MODULES = Object.freeze([
  {
    id: 'hoyfinca',
    label: 'Hoy en la finca',
    description: 'Resumen del día con clima honesto, alertas y tareas pendientes',
    category: 'principal',
  },
  {
    id: 'clima',
    label: 'Clima',
    description: 'Pronóstico del clima para tu zona (7 días)',
    category: 'principal',
  },
  {
    id: 'analisis',
    label: 'Análisis IA',
    description: 'Análisis proactivo de IA sobre sensores, clima y cultivos',
    category: 'ia',
  },
  {
    id: 'asociaciones',
    label: 'Asociaciones',
    description: 'Policultivos y compañía de plantas por rol',
    category: 'ecosistema',
  },
  {
    id: 'plantas',
    label: 'Plantas',
    description: 'Inventario de plantas registradas',
    category: 'inventario',
  },
  {
    id: 'zonas',
    label: 'Zonas',
    description: 'Mapa de zonas y cuadros de la finca',
    category: 'inventario',
  },
  {
    id: 'insumos',
    label: 'Insumos',
    description: 'Registro de insumos y materiales',
    category: 'inventario',
  },
  {
    id: 'bitacora',
    label: 'Bitácora',
    description: 'Registro de actividades y observaciones',
    category: 'registro',
  },
  {
    id: 'hoy',
    label: 'Historial hoy',
    description: 'Actividades registradas en el día de hoy',
    category: 'registro',
  },
  {
    id: 'plagas',
    label: 'Plagas',
    description: 'Registro de plagas y problemas detectados',
    category: 'sanidad',
  },
  {
    id: 'biodiversidad',
    label: 'Biodiversidad',
    description: 'Diversidad de especies y polinizadores',
    category: 'ecosistema',
  },
  {
    id: 'informes',
    label: 'Informes',
    description: 'Reportes y análisis de la finca',
    category: 'reportes',
  },
]);

/**
 * Lee la configuración de visibilidad de módulos.
 *
 * @returns {Object} { moduleId: boolean } con true para visibles, false para ocultos.
 *                   Si no hay configuración, devuelve un objeto con todos los módulos en true.
 */
export function getModuleVisibility() {
  const profile = getProfile();
  if (!profile || typeof profile !== 'object') {
    // Sin perfil → todos visibles
    return Object.fromEntries(HOME_MODULES.map(m => [m.id, true]));
  }

  const saved = profile.modulos_visibles;
  if (!saved || typeof saved !== 'object') {
    // Sin configuración guardada → todos visibles
    return Object.fromEntries(HOME_MODULES.map(m => [m.id, true]));
  }

  // Merge: módulos nuevos (no guardados) → true por defecto
  const result = {};
  for (const module of HOME_MODULES) {
    const value = saved[module.id];
    // Solo true explícito o undefined (new modules). false explícito se respeta.
    result[module.id] = value !== false;
  }
  return result;
}

/**
 * ¿El usuario guardó una preferencia MANUAL de visibilidad de módulos?
 *
 * Devuelve true solo si existe el campo `modulos_visibles` en el perfil (lo
 * escribe `setModuleVisibility` desde ProfileScreen, #1560). Cuando es false,
 * el Home puede derivar la visibilidad por DEFECTO desde el perfil
 * (homeModuleSelector) sin pisar ninguna elección del usuario.
 *
 * Nota: un objeto vacío `{}` (caso de "todo visible" que setModuleVisibility
 * guarda cuando el usuario no ocultó nada) TAMBIÉN cuenta como preferencia
 * manual — el usuario pasó por la pantalla y dejó todo visible a propósito.
 *
 * @returns {boolean}
 */
export function hasManualModuleVisibility() {
  const profile = getProfile();
  return !!(
    profile &&
    typeof profile === 'object' &&
    profile.modulos_visibles &&
    typeof profile.modulos_visibles === 'object'
  );
}

/**
 * Persiste la configuración de visibilidad de módulos.
 *
 * @param {Object} visibility - { moduleId: boolean }
 * @returns {Object} perfil resultante
 */
export function setModuleVisibility(visibility) {
  if (!visibility || typeof visibility !== 'object') {
    console.warn('[userProfile] setModuleVisibility: argumento inválido', visibility);
    return getProfile();
  }

  // Solo guardar módulos conocidos (evitar contaminación con keys extra)
  const clean = {};
  for (const module of HOME_MODULES) {
    if (visibility[module.id] === false) {
      clean[module.id] = false;
    }
    // true es implícito (no guardamos para ahorrar espacio)
  }

  return saveProfile({ modulos_visibles: clean });
}

/**
 * Devuelve true si un módulo está visible según la configuración del usuario.
 *
 * @param {string} moduleId - ID del módulo (ej: 'clima', 'plantas')
 * @returns {boolean}
 */
export function isModuleVisible(moduleId) {
  const visibility = getModuleVisibility();
  // Módulo desconocido → visible (fail-open para evitar romper con módulos nuevos)
  if (visibility[moduleId] === undefined) return true;
  return visibility[moduleId] !== false;
}

/**
 * Orden de los módulos del Home (reordenable por drag, 2026-06-15).
 *
 * El usuario puede MOVER a su antojo las tarjetas de módulo del home
 * (DashboardLive), excepto la portada del agente (AgentHero), que queda fija
 * arriba. El orden elegido se persiste en el perfil bajo `modulos_orden`
 * (junto a `modulos_visibles`) — client-side, soberanía ADR-007.
 *
 * El orden por DEFECTO replica el layout histórico del home. El AgentHero NO
 * aparece en esta lista a propósito: vive fijo fuera del grid draggable.
 *
 * v3 (2026-06-11): 'hoyfinca' (HoyEnFincaStrip) como primera sección.
 */
export const HOME_MODULE_DEFAULT_ORDER = Object.freeze([
  'hoyfinca',
  'clima',
  'analisis',
  'asociaciones',
  'plantas',
  'hoy',
  'zonas',
  'insumos',
  'plagas',
  'bitacora',
  'biodiversidad',
  'informes',
]);

// Clave localStorage LEGADO donde DashboardLive guardaba el orden antes de
// migrarlo al perfil (2026-06-15). La conservamos solo para MIGRAR el orden de
// usuarios existentes a `modulos_orden` la primera vez; luego el perfil manda.
const LEGACY_MODULE_ORDER_KEY = 'chagra:dashboard-order:v3';

/** IDs de módulo conocidos (las claves de orden válidas). */
const KNOWN_MODULE_IDS = new Set(HOME_MODULES.map((m) => m.id));

/**
 * Normaliza una lista de orden: descarta ids desconocidos y duplicados, y
 * agrega al final los módulos faltantes (nuevos módulos post-deploy) en el
 * orden por defecto. Garantiza que SIEMPRE se devuelven todos los módulos
 * conocidos exactamente una vez.
 *
 * @param {string[]} raw
 * @returns {string[]}
 */
function normalizeModuleOrder(raw) {
  const seen = new Set();
  const valid = [];
  if (Array.isArray(raw)) {
    for (const id of raw) {
      if (KNOWN_MODULE_IDS.has(id) && !seen.has(id)) {
        seen.add(id);
        valid.push(id);
      }
    }
  }
  for (const id of HOME_MODULE_DEFAULT_ORDER) {
    if (!seen.has(id)) {
      seen.add(id);
      valid.push(id);
    }
  }
  return valid;
}

/**
 * ¿El usuario guardó un orden MANUAL de módulos en el perfil?
 *
 * Devuelve true solo si existe el array `modulos_orden` en el perfil. Sirve
 * para decidir si hay que migrar el orden legado de localStorage.
 *
 * @returns {boolean}
 */
export function hasManualModuleOrder() {
  const profile = getProfile();
  return !!(
    profile &&
    typeof profile === 'object' &&
    Array.isArray(profile.modulos_orden)
  );
}

/**
 * Lee el orden de módulos del Home.
 *
 * Precedencia:
 *   1. `modulos_orden` del perfil (elección manual del usuario).
 *   2. Orden LEGADO en localStorage (`chagra:dashboard-order:v3`) — se MIGRA
 *      al perfil en el primer acceso para no perder la preferencia previa.
 *   3. Orden por defecto.
 *
 * Siempre devuelve la lista completa de módulos conocidos (normalizada).
 *
 * @returns {string[]}
 */
export function getModuleOrder() {
  const profile = getProfile();
  if (profile && typeof profile === 'object' && Array.isArray(profile.modulos_orden)) {
    return normalizeModuleOrder(profile.modulos_orden);
  }

  // Migración del orden legado de localStorage → perfil (una sola vez).
  if (hasStorage()) {
    try {
      const raw = window.localStorage.getItem(LEGACY_MODULE_ORDER_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          const normalized = normalizeModuleOrder(parsed);
          // Persistir en el perfil y limpiar la clave legada.
          saveProfile({ modulos_orden: normalized });
          try { window.localStorage.removeItem(LEGACY_MODULE_ORDER_KEY); } catch (_) { /* noop */ }
          return normalized;
        }
      }
    } catch (e) {
      console.warn('[userProfile] No se pudo migrar el orden de módulos legado:', e);
    }
  }

  return [...HOME_MODULE_DEFAULT_ORDER];
}

/**
 * Persiste el orden de módulos del Home en el perfil.
 *
 * Normaliza antes de guardar (descarta ids desconocidos, completa faltantes)
 * para que el perfil nunca quede con un orden corrupto.
 *
 * @param {string[]} order - lista de ids de módulo en el orden deseado
 * @returns {Object} perfil resultante
 */
export function setModuleOrder(order) {
  if (!Array.isArray(order)) {
    console.warn('[userProfile] setModuleOrder: argumento inválido', order);
    return getProfile();
  }
  return saveProfile({ modulos_orden: normalizeModuleOrder(order) });
}

export const __PROFILE_KEYS__ = {
  PROFILE_KEY,
  PROFILE_DONE_KEY,
  PROFILE_SKIPPED_KEY,
  TELEMETRY_CONSENT_KEY,
};
