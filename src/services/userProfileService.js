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
    title: '¿Qué tamaño tiene tu predio?',
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

/** Marca el onboarding de perfil como completado. */
export function markProfileDone() {
  if (!hasStorage()) return;
  try {
    window.localStorage.setItem(PROFILE_DONE_KEY, '1');
  } catch (e) {
    console.warn('[userProfile] markProfileDone:', e);
  }
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

  const vocacionLabels = {
    campesino: 'campesino/a (vive del campo)',
    urbano: 'cultivo urbano (balcón/terraza)',
    tecnico: 'técnico/a o agrónomo/a',
    curioso: 'principiante curioso/a',
  };
  if (p.vocacion) push('Perfil', vocacionLabels[p.vocacion] || p.vocacion);

  const byId = (id) => PROFILE_QUESTIONS.find((q) => q.id === id);
  push('Tipo de cultivo', humanizeAnswer(byId('finca_tipo') || {}, p.finca_tipo));
  push('Tamaño', humanizeAnswer(byId('finca_hectareas') || {}, p.finca_hectareas));
  if (p.finca_altitud) push('Altitud', `${p.finca_altitud} msnm`);
  push('Cultivos actuales', p.cultivos_actuales);
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

export const __PROFILE_KEYS__ = {
  PROFILE_KEY,
  PROFILE_DONE_KEY,
  PROFILE_SKIPPED_KEY,
};
