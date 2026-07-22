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
 * Español colombiano (usted, SIN voseo argentino).
 *
 * @module userProfileService
 */

import { findMunicipio } from '../utils/colombiaLocations.js';
import { getActiveTenantId } from './tenantContext.js';

const PROFILE_PREFIX = 'chagra:profile:';
const PROFILE_KEY = `${PROFILE_PREFIX}v1`;
const PROFILE_DONE_KEY = `${PROFILE_PREFIX}done:v1`;
const PROFILE_SKIPPED_KEY = `${PROFILE_PREFIX}skipped:v1`;

const hasStorage = () => typeof window !== 'undefined' && !!window.localStorage;

/**
 * Deriva un userKey estable del usuario logueado (farmOS username).
 * @returns {string|null} username del tenant activo, o null si no hay sesión.
 */
function getUserKey() {
  try {
    const id = getActiveTenantId();
    return id && typeof id === 'string' && id.trim().length > 0 ? id.trim() : null;
  } catch { return null; }
}

function getProfileKey() {
  const uk = getUserKey();
  return uk ? `${PROFILE_KEY}:${uk}` : PROFILE_KEY;
}

function getProfileDoneKey() {
  const uk = getUserKey();
  return uk ? `${PROFILE_DONE_KEY}:${uk}` : PROFILE_DONE_KEY;
}

function getProfileSkippedKey() {
  const uk = getUserKey();
  return uk ? `${PROFILE_SKIPPED_KEY}:${uk}` : PROFILE_SKIPPED_KEY;
}

/** @type {boolean} flag module-level para ejecutar la migración una sola vez. */
let _migrated = false;

function _getOperatorUsernames() {
  try {
    return (import.meta.env.VITE_OPERATOR_USERNAME || '')
      .split(',')
      .map(s => s.trim().toLowerCase())
      .filter(Boolean);
  } catch { return []; }
}

function _cleanupLegacyKeys() {
  try {
    window.localStorage.removeItem(PROFILE_KEY);
    window.localStorage.removeItem(PROFILE_DONE_KEY);
    window.localStorage.removeItem(PROFILE_SKIPPED_KEY);
  } catch (_) { /* noop */ }
}

/**
 * Migración suave: si existe la clave GLOBAL vieja y NO existe la del
 * usuario actual, NO la hereda para usuarios nuevos (que vean onboarding).
 * Solo migra si el usuario actual es identificable como operador via
 * VITE_OPERATOR_USERNAME. Si no hay usuario logueado (pre-login), mantiene
 * el comportamiento actual con claves globales.
 */
function migrateLegacyProfile() {
  if (!hasStorage() || _migrated) return;
  _migrated = true;

  const uk = getUserKey();
  if (!uk) return;

  const oldDone = window.localStorage.getItem(PROFILE_DONE_KEY);
  const oldSkipped = window.localStorage.getItem(PROFILE_SKIPPED_KEY);
  const oldProfile = window.localStorage.getItem(PROFILE_KEY);

  if (!oldDone && !oldSkipped && !oldProfile) return;

  // Si el usuario ya tiene datos per-user, solo limpiar legado
  const hasUserDone = window.localStorage.getItem(getProfileDoneKey());
  const hasUserSkipped = window.localStorage.getItem(getProfileSkippedKey());
  if (hasUserDone || hasUserSkipped) {
    _cleanupLegacyKeys();
    return;
  }

  // Solo migrar si el usuario actual es el operador
  const opNames = _getOperatorUsernames();
  if (opNames.length > 0 && opNames.includes(uk.toLowerCase())) {
    if (oldDone) window.localStorage.setItem(getProfileDoneKey(), oldDone);
    if (oldSkipped) window.localStorage.setItem(getProfileSkippedKey(), oldSkipped);
    if (oldProfile) window.localStorage.setItem(getProfileKey(), oldProfile);
    _cleanupLegacyKeys();
  }
  // Usuarios nuevos (no operador): NO heredan — ven onboarding.
}

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
 * El array es la fuente de verdad del flujo. Son 25 preguntas; las
 * condicionales reducen el número efectivo según el perfil.
 *
 * REESCRITURA DEL ONBOARDING (spec 2026-07-08): el flujo de arranque es
 * OnboardingCondensado (3 pantallas). Las preguntas con `deferred: true` YA NO
 * se hacen al inicio — se difieren a la voz / progressive profiling /
 * ProfileScreen (ninguna bloquea una feature: 0-1 lecturas c/u, ver §1.5 del
 * spec). En particular:
 *   - `region` y `finca_altitud` las resuelve el botón "Ubicar mi finca"
 *     (GPS → municipio DANE + altitud Open-Meteo + vereda point-in-polygon).
 *   - vocacion/rol/finca_tipo se capturan FUSIONADAS en una tarjeta de
 *     identidad (mismos valores del catálogo — sin migración).
 * El flujo clásico (OnboardingProfile, ruta 'onboarding-perfil-clasico')
 * sigue usando el array completo vía getApplicableQuestions.
 */
export const PROFILE_QUESTIONS = [
  // ── Identidad ────────────────────────────────────────────────────────
  {
    id: 'nombre',
    category: 'identidad',
    title: '¿Cómo se llama?',
    help: 'Para que el agente lo salude por su nombre. Puede dejarlo en blanco.',
    type: 'text',
    placeholder: 'Su nombre',
  },
  {
    id: 'region',
    deferred: true,
    category: 'identidad',
    title: '¿En qué municipio o región cultiva?',
    help: 'Ej: Choachí, Cauca, Antioquia. Ayuda a dar consejos según su clima y costumbres.',
    type: 'text',
    placeholder: 'Municipio o departamento',
  },
  {
    id: 'vocacion',
    category: 'identidad',
    title: '¿Cómo se describe mejor?',
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
    title: '¿Cuál es su labor en el campo?',
    help: 'Define qué herramientas le mostramos primero. Puede saltarlo.',
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
    title: '¿Dónde cultiva?',
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
    deferred: true,
    category: 'finca',
    title: '¿Qué tamaño tiene su finca?',
    help: 'Aproximado, en hectáreas. Si no lo sabe, sáltelo.',
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
    deferred: true,
    category: 'finca',
    title: '¿A qué altura está su finca?',
    help: 'En metros sobre el nivel del mar (msnm). Define su piso térmico. Si no la sabe, la detectamos por ubicación.',
    type: 'number',
    placeholder: '1730',
    unit: 'msnm',
    // Condicional: solo para cultivo rural / invernadero (no aplica a balcón urbano).
    when: (a) => a.vocacion !== 'urbano' && !['balcon', 'terraza'].includes(a.finca_tipo),
  },
  {
    // INVERNADERO — ¿tiene? (#34 escena de finca rica, fase 1: estructura).
    // Captura el ESQUELETO de la finca para que la escena F2 lo dibuje. No es
    // fenología ni inventario de plantas (eso lo llena la voz #23 después).
    // No aplica al cultivo urbano de balcón/terraza (sin espacio para invernadero).
    id: 'invernadero_tiene',
    deferred: true,
    category: 'finca',
    title: '¿Tiene invernadero?',
    help: 'Para dibujar bien su finca. Si no tiene, dígalo y seguimos.',
    type: 'single',
    options: [
      { value: 'si', label: '🏠 Sí, tengo invernadero' },
      { value: 'no', label: 'No, todo a campo abierto' },
    ],
    when: (a) => a.vocacion !== 'urbano' && !['balcon', 'terraza'].includes(a.finca_tipo),
  },
  {
    // INVERNADERO — forma (#34). Ejemplos reales del piloto: cuadrado grande
    // vs. túnel pequeño. Solo si declaró que tiene uno (o si su finca ES un
    // invernadero). La forma define cómo se dibuja la estructura en la escena.
    id: 'invernadero_forma',
    deferred: true,
    category: 'finca',
    title: '¿Cómo es su invernadero?',
    help: 'Escoja la forma que más se parezca al suyo.',
    type: 'single',
    options: [
      { value: 'cuadrado', label: '⬜ Cuadrado grande — techo a dos aguas' },
      { value: 'tunel', label: '🌙 Túnel pequeño — media luna, plástico curvo' },
      { value: 'otro', label: '🔧 Otra forma' },
    ],
    when: (a) => a.invernadero_tiene === 'si' || a.finca_tipo === 'invernadero',
  },
  {
    // INVERNADERO — tamaño aproximado (#34). Texto libre y skippable: el
    // campesino describe a su manera ("como 6 por 10", "una nave grande"). La
    // escena F2 usa esto solo para escalar el dibujo, no para cálculos.
    id: 'invernadero_tamano',
    deferred: true,
    category: 'finca',
    title: '¿De qué tamaño es, más o menos?',
    help: 'Como lo sienta: "6 por 10 metros", "pequeño", "media hectárea". Puede saltarlo.',
    type: 'text',
    placeholder: 'Ej: 6 x 10 metros, o "uno pequeño"',
    when: (a) => a.invernadero_tiene === 'si' || a.finca_tipo === 'invernadero',
  },
  {
    // COMPOSICIÓN de la finca (#34 escena de finca rica, fase 1). El ESQUELETO:
    // qué grandes grupos tiene la finca (huerta, frutales, aromáticas, animales).
    // NO pide cada planta — eso lo registra la voz #23 después. Multi + skippable.
    // La escena F2 lo lee para sembrar las "zonas" del dibujo aunque todavía no
    // haya procesos reales cargados.
    id: 'composicion',
    category: 'finca',
    title: '¿Qué tiene en su finca?',
    help: 'Marque lo que tenga. No hace falta el detalle: eso lo vamos llenando con la voz.',
    type: 'multi',
    options: [
      { value: 'huerta', label: '🥬 Huerta — hortalizas y verduras' },
      { value: 'frutales', label: '🍊 Frutales — árboles de fruta' },
      { value: 'aromaticas', label: '🌿 Aromáticas y medicinales' },
      { value: 'animales', label: '🐔 Animales' },
    ],
  },
  {
    id: 'cultivos_actuales',
    category: 'finca',
    title: '¿Qué cultiva ahora mismo?',
    help: 'Escriba los cultivos que tiene. Ej: café, mora, tomate, plátano.',
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
    title: '¿Qué animales tiene?',
    help: 'Marque todos los que apliquen, o sáltela si no tiene.',
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
    deferred: true,
    category: 'finca',
    title: '¿Cómo tiene las gallinas?',
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
    deferred: true,
    category: 'finca',
    title: '¿Qué le gustaría recuperar?',
    help: 'Marque lo que quiere restaurar con nativas. Opcional.',
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
    deferred: true,
    category: 'experiencia',
    title: '¿Hace cuánto cultiva?',
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
    deferred: true,
    category: 'experiencia',
    title: '¿Cómo maneja sus cultivos?',
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
    deferred: true,
    category: 'experiencia',
    title: '¿Qué problemas tiene con frecuencia?',
    help: 'Marque todos los que apliquen.',
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
    deferred: true,
    category: 'objetivos',
    title: '¿Qué quiere lograr con Chagra?',
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
    deferred: true,
    category: 'objetivos',
    title: '¿Qué cultivos le gustaría sembrar o mejorar?',
    help: 'Cultivos nuevos que le interesan. Opcional.',
    type: 'text',
    placeholder: 'Aguacate, cacao, hortalizas...',
  },

  // ── Preferencias ─────────────────────────────────────────────────────
  {
    id: 'nivel_respuestas',
    deferred: true,
    category: 'preferencias',
    title: '¿Cómo prefiere que el agente le responda?',
    type: 'single',
    options: [
      { value: 'simple', label: 'Simple y al grano' },
      { value: 'detallado', label: 'Detallado, con explicación técnica' },
      { value: 'maestro', label: 'Maestro — me enseña el porqué' },
    ],
  },
  {
    id: 'notif_clima',
    deferred: true,
    category: 'preferencias',
    title: '¿Quiere alertas de clima para su zona?',
    help: 'Avisos de lluvia, heladas o sequía relevantes para sus cultivos.',
    type: 'single',
    options: [
      { value: 'si', label: 'Sí, avísame' },
      { value: 'no', label: 'No, gracias' },
    ],
  },
  {
    id: 'estrato',
    deferred: true,
    category: 'finca',
    title: '¿En qué estrato vive?',
    help: 'Solo para cultivo urbano — ayuda a sugerir soluciones según su espacio. Opcional.',
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
    deferred: true,
    category: 'finca',
    title: '¿Cuánto espacio tiene para cultivar?',
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
    deferred: true,
    category: 'finca',
    title: '¿Cómo riega sus cultivos?',
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
 * Preguntas DIFERIDAS que aplican al perfil y aún no tienen respuesta.
 *
 * Gancho para el progressive profiling (spec reescritura §3.2): el agente /
 * ProfileScreen pueden pedir MÁXIMO una por sesión cuando sea relevante, en
 * vez de preguntarlo todo en el arranque. Pura y sin efectos.
 *
 * @param {Object} [answers] - perfil actual; si se omite, se lee de localStorage
 * @returns {Array} subconjunto de PROFILE_QUESTIONS deferred, aplicable y sin responder
 */
export function getDeferredQuestions(answers) {
  const a = answers || getProfile();
  return PROFILE_QUESTIONS.filter((q) => {
    if (!q.deferred) return false;
    if (typeof q.when === 'function' && !q.when(a)) return false;
    const v = a[q.id];
    if (v == null || v === '') return true;
    return Array.isArray(v) && v.length === 0;
  });
}

/**
 * Lee el perfil guardado desde localStorage.
 *
 * @returns {Object} perfil { ...respuestas } o {} si no existe
 */
export function getProfile() {
  if (!hasStorage()) return {};
  migrateLegacyProfile();
  const key = getProfileKey();
  try {
    const raw = window.localStorage.getItem(key);
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

// ─── Estructura de la finca (#34 — esqueleto para la escena F2) ──────────────

/**
 * Formas de estructura de cubierta válidas. La escena F2 las dibuja distinto:
 *   - cuadrado:     nave a dos aguas (cuadrado grande, ej. David).
 *   - tunel:        media luna de plástico curvo (túnel pequeño, ej. Miguel).
 *   - casa_sombra:  casa-sombra — estructura de malla anti-insectos con techo.
 *   - malla_sombra: malla-sombra (polisombra) plana sobre postes, sin paredes.
 *   - umbraculo:    umbráculo — techo de listones de madera sobre postes.
 *   - otro:         forma genérica (no encaja en las anteriores).
 *
 * NOTA ONBOARDING: la pregunta `invernadero_forma` (PROFILE_QUESTIONS) hoy solo
 * ofrece cuadrado/tunel/otro. Las formas casa_sombra/malla_sombra/umbraculo ya
 * son válidas aquí y la escena F2 ya sabe dibujarlas (FincaVivaHero →
 * EstructuraCubierta); para que un usuario las declare falta AGREGAR sus
 * opciones a esa pregunta del onboarding (o poblarlas por la voz #23).
 */
export const INVERNADERO_FORMAS = Object.freeze([
  'cuadrado',
  'tunel',
  'casa_sombra',
  'malla_sombra',
  'umbraculo',
  'otro',
]);

/**
 * Grupos de composición de la finca (el "esqueleto"). Son los grandes bloques
 * que la escena F2 dibuja como ZONAS aunque todavía no haya procesos reales:
 * huerta, frutales, aromáticas/medicinales, animales. NO es el inventario de
 * plantas (eso lo llena la voz #23 después).
 */
export const COMPOSICION_GRUPOS = Object.freeze(['huerta', 'frutales', 'aromaticas', 'animales']);

/**
 * @typedef {Object} InvernaderoEstructura
 * @property {boolean} tiene  ¿la finca tiene invernadero?
 * @property {'cuadrado'|'tunel'|'otro'|null} forma  forma del invernadero (null si no tiene)
 * @property {string|null} tamano  tamaño aproximado en texto libre (null si no aplica)
 */

/**
 * Deriva la estructura TIPADA del invernadero desde las respuestas planas del
 * onboarding (`invernadero_tiene` / `invernadero_forma` / `invernadero_tamano`).
 *
 * MIGRACIÓN SUAVE: un perfil VIEJO (sin estos campos) cae a defaults sanos
 * `{ tiene: false, forma: null, tamano: null }` — la escena F2 nunca rompe. Si
 * la finca ES un invernadero (`finca_tipo === 'invernadero'`) pero no se
 * declaró explícitamente, se asume `tiene: true` (coherencia con #338).
 *
 * @param {Object} [profile]  perfil; si se omite, se lee de localStorage
 * @returns {InvernaderoEstructura}
 */
export function getInvernaderoEstructura(profile) {
  const p = profile || getProfile();
  if (!p || typeof p !== 'object') return { tiene: false, forma: null, tamano: null };

  const tiene = p.invernadero_tiene === 'si' || p.finca_tipo === 'invernadero';
  if (!tiene) return { tiene: false, forma: null, tamano: null };

  const forma = INVERNADERO_FORMAS.includes(p.invernadero_forma) ? p.invernadero_forma : null;
  const tamano =
    typeof p.invernadero_tamano === 'string' && p.invernadero_tamano.trim() !== ''
      ? p.invernadero_tamano.trim()
      : null;

  return { tiene: true, forma, tamano };
}

/**
 * Deriva la composición TIPADA de la finca (array saneado de grupos conocidos).
 *
 * MIGRACIÓN SUAVE: perfil viejo o respuesta saltada → `[]`. Descarta valores
 * desconocidos y duplicados para que la escena nunca reciba basura.
 *
 * @param {Object} [profile]  perfil; si se omite, se lee de localStorage
 * @returns {string[]}  subconjunto ordenado de COMPOSICION_GRUPOS
 */
export function getComposicionFinca(profile) {
  const p = profile || getProfile();
  const raw = p && Array.isArray(p.composicion) ? p.composicion : [];
  const seen = new Set();
  const out = [];
  for (const g of COMPOSICION_GRUPOS) {
    if (raw.includes(g) && !seen.has(g)) {
      seen.add(g);
      out.push(g);
    }
  }
  return out;
}

/**
 * @typedef {Object} FincaEstructura
 * @property {InvernaderoEstructura} invernadero  estructura tipada del invernadero
 * @property {string[]} composicion  grupos presentes en la finca (esqueleto)
 */

/**
 * GANCHO PARA LA ESCENA F2 (#34): devuelve el ESQUELETO tipado de la finca
 * (invernadero + composición) con defaults sanos. La escena F2 lee SOLO esto
 * para decidir qué estructura y zonas dibujar; no necesita conocer las claves
 * planas del onboarding. 100% client-side, sin red.
 *
 * Migración garantizada: un usuario existente sin estos campos recibe
 * `{ invernadero: { tiene: false, ... }, composicion: [] }` y la escena no rompe.
 *
 * @param {Object} [profile]  perfil; si se omite, se lee de localStorage
 * @returns {FincaEstructura}
 */
export function getFincaEstructura(profile) {
  const p = profile || getProfile();
  return {
    invernadero: getInvernaderoEstructura(p),
    composicion: getComposicionFinca(p),
  };
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
  migrateLegacyProfile();
  const current = getProfile();
  const next = { ...current, ...partial, updatedAt: new Date().toISOString() };
  try {
    window.localStorage.setItem(getProfileKey(), JSON.stringify(next));
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

// ─── Guardián / espíritu de la finca (selector del home vivo) ───────────────

/**
 * IDs válidos del GUARDIÁN (espíritu de la finca). Cada uno corresponde a una
 * especie nativa colombiana REAL y verificable — nombre científico grounded en
 * el catálogo/grafo de Chagra (fauna emblemática, NUNCA inventada). La lista
 * canónica con nombre común/científico/fuente vive en el componente
 * `GuardianEspiritu.jsx` (fuente de verdad visual); acá solo validamos el id
 * persistido para no corromper el perfil.
 *
 *   - abeja:   Tetragonisca angustula (abeja angelita) — grounded animal-diagnostics.json
 *   - oso:     Tremarctos ornatus (oso andino/de anteojos) — grounded cycle-content, psa.json
 *   - chivito: Oxypogon guerinii (chivito/barbudito de páramo) — grounded puya_clava_herculis.json
 *   - danta:   Tapirus pinchaque (danta de montaña) — grounded vaccinium_floribundum.json
 *   - rana:    Phyllobates terribilis (rana dorada) — endémica del Chocó, real y verificable
 */
export const GUARDIAN_ESPECIE_IDS = Object.freeze(['abeja', 'oso', 'chivito', 'danta', 'rana']);
/** Guardián por defecto: la abeja angelita (protagonista del mockup aprobado). */
export const DEFAULT_GUARDIAN_ESPECIE = 'abeja';

/**
 * Lee el guardián (espíritu de la finca) elegido por el usuario. Devuelve el id
 * persistido si es válido; `null` si el usuario aún no ha elegido (para que el
 * home pueda distinguir "sin elegir" de "eligió el default").
 *
 * @returns {'abeja'|'oso'|'chivito'|'danta'|'rana'|null}
 */
export function getGuardianEspecie() {
  const v = getProfile()?.guardian_especie;
  return GUARDIAN_ESPECIE_IDS.includes(v) ? v : null;
}

/**
 * Persiste el guardián elegido en el perfil (`guardian_especie`). Ignora ids
 * desconocidos para no corromper el perfil. Emite `chagra:guardian-changed` y
 * `chagra:profile-changed` para que el home/saludo re-lean el espíritu en vivo.
 *
 * @param {'abeja'|'oso'|'chivito'|'danta'|'rana'} id
 * @returns {Object|null} perfil resultante, o null si el id era inválido
 */
export function setGuardianEspecie(id) {
  if (!GUARDIAN_ESPECIE_IDS.includes(id)) return null;
  const profile = saveProfile({ guardian_especie: id });
  try {
    window.dispatchEvent(new CustomEvent('chagra:guardian-changed', { detail: { id } }));
    window.dispatchEvent(new CustomEvent('chagra:profile-changed', { detail: { guardian_especie: id } }));
  } catch (_) { /* SSR/tests sin window — la elección ya quedó persistida */ }
  return profile;
}

/** Marca el onboarding de perfil como completado. */
export function markProfileDone() {
  if (!hasStorage()) return;
  migrateLegacyProfile();
  try {
    window.localStorage.setItem(getProfileDoneKey(), '1');
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
  migrateLegacyProfile();
  try {
    window.localStorage.setItem(getProfileSkippedKey(), '1');
  } catch (e) {
    console.warn('[userProfile] markProfileSkipped:', e);
  }
}

/** @returns {boolean} si el usuario ya completó o saltó el onboarding. */
export function hasSeenProfileOnboarding() {
  if (!hasStorage()) return false;
  migrateLegacyProfile();
  return (
    window.localStorage.getItem(getProfileDoneKey()) === '1' ||
    window.localStorage.getItem(getProfileSkippedKey()) === '1'
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
  const inv = getInvernaderoEstructura(p);
  if (inv.tiene) {
    const formaTxt = humanizeAnswer(byId('invernadero_forma') || {}, inv.forma);
    const detalle = [formaTxt, inv.tamano].filter(Boolean).join(', ');
    push('Invernadero', detalle ? `sí (${detalle})` : 'sí');
  }
  push('Composición de la finca', humanizeAnswer(byId('composicion') || {}, getComposicionFinca(p)));
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
  } else if (p.nivel_respuestas === 'maestro') {
    tono =
      '\nIMPORTANTE: este usuario prefiere que le enseñes el porqué. Explica la lógica detrás de cada recomendación y deja criterio para que decida por su cuenta la próxima vez.';
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
    description: 'Pronóstico del clima para su zona (7 días)',
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
// hoyfinca/clima/analisis NO van aquí: desde el rediseño del BLOQUE 1
// (EstadoDelDiaCard, 2026-07-04) esos tres se muestran FUNDIDOS en la cabecera
// del día — incluirlos como secciones arrastrables los pintaba DOS veces
// (redundancia clima+análisis "encimados", #2054). Se filtran también en el
// render (FUSED_EN_ESTADO_DEL_DIA en DashboardLive) para no duplicarlos ni en
// los perfiles existentes que ya los tenían guardados en su orden.
export const HOME_MODULE_DEFAULT_ORDER = Object.freeze([
  // Los de categoría 'principal' van primero: son lo que el campesino mira al
  // abrir la app. hoyfinca, clima y analisis FALTABAN en esta lista aunque sí
  // estaban en HOME_MODULES, así que no se dibujaban para nadie sin un orden
  // guardado — y clima es justo lo que se consulta antes de sembrar o fumigar.
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

/** Resetea el flag de migración para tests. */
export function _resetProfileMigration() {
  _migrated = false;
}
