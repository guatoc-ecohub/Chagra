/**
 * fincaGameService — capa LÚDICA kid-friendly sobre el motor de evolución.
 *
 * "Mi Finca Viva": traduce los indicadores REALES de la finca
 * (fincaEvolutionService: nivel Gliessman 0-4 + MESMIS + TAPE) en un mundo de
 * juego para una niña: etapas del mundo, criaturas que aparecen, misiones
 * ligadas a acciones reales + fichas GUATOC, e insignias.
 *
 * PRINCIPIO INNEGOCIABLE — CERO FABRICACIÓN:
 *   Este módulo NO inventa progreso. Toda criatura desbloqueada, insignia
 *   ganada o etapa del mundo se DERIVA de evaluarEvolucionFinca() sobre datos
 *   reales. Sin datos → el mundo arranca vacío y el juego INVITA a sembrar.
 *   No hay puntos ni XP arbitrarios: el "puntaje" es la suma de indicadores
 *   reales que la familia movió con su trabajo.
 *
 * Funciones PURAS: sin fetch, sin IDB, sin DOM. La pantalla
 * (MiFincaVivaScreen) inyecta processes/observations y el estado de misiones
 * cumplidas (journeyStateService). Lenguaje llano de Colombia, sin voseo.
 *
 * @module services/fincaGameService
 */

import {
  evaluarEvolucionFinca,
  getGliessmanLabel,
} from './fincaEvolutionService';
import { JOURNEY_STAGES } from './agroecologyJourney';

// ─── Etapas del MUNDO (mapeo 1:1 con nivel Gliessman 0-4) ──────────────────

/**
 * Los 5 mundos de "Mi Finca Viva", uno por nivel de Gliessman (0-4).
 *
 * Cada mundo describe cómo SE VE la finca a ese nivel para que el render la
 * dibuje: cuánta vegetación, qué colores, cuántos elementos. El `nombreNino`
 * es la versión alegre y corta para una niña; `nombreReal` conserva el término
 * agroecológico (el juego enseña con cariño, no diluye la verdad).
 *
 * `cielo`/`tierra` son pares de color (gradiente) que el escenario usa.
 * `arboles`/`vida` son CONTEOS de elementos visuales que crecen con el nivel.
 */
export const WORLD_STAGES = Object.freeze([
  Object.freeze({
    level: 0,
    nombreNino: 'La tierra que despierta',
    nombreReal: 'Convencional',
    emoji: '🌱',
    mensaje: 'Tu finca está empezando. ¡Siembra tu primera planta para darle vida!',
    cielo: ['#bcd9e8', '#e8f3ee'],
    tierra: ['#c9a878', '#a98a5e'],
    arboles: 1,
    vida: 0,
  }),
  Object.freeze({
    level: 1,
    nombreNino: 'El primer verde',
    nombreReal: 'Reducción de insumos',
    emoji: '🌿',
    mensaje: '¡Ya brotan las primeras plantas! La finca está respirando mejor.',
    cielo: ['#a8d5e2', '#dff0e3'],
    tierra: ['#b89b6a', '#94a06a'],
    arboles: 2,
    vida: 1,
  }),
  Object.freeze({
    level: 2,
    nombreNino: 'La tierra viva',
    nombreReal: 'Sustitución orgánica',
    emoji: '🪱',
    mensaje: '¡El suelo está lleno de vida! Las lombrices trabajan para vos.',
    cielo: ['#90cce0', '#d4ecd6'],
    tierra: ['#9a8456', '#7a9655'],
    arboles: 4,
    vida: 3,
  }),
  Object.freeze({
    level: 3,
    nombreNino: 'El bosque de comida',
    nombreReal: 'Rediseño del sistema',
    emoji: '🌳',
    mensaje: '¡Tu finca es un bosque que da de comer! Muchas plantas viven juntas.',
    cielo: ['#7ac3da', '#c8e8cb'],
    tierra: ['#85733f', '#5f8a47'],
    arboles: 7,
    vida: 6,
  }),
  Object.freeze({
    level: 4,
    nombreNino: 'La finca que comparte',
    nombreReal: 'Conexión social y económica',
    emoji: '🌻',
    mensaje: '¡Tu finca es un ejemplo! Da vida, comida y se conecta con el mundo.',
    cielo: ['#62b8d4', '#bce4c2'],
    tierra: ['#6f6234', '#4d7d3c'],
    arboles: 10,
    vida: 10,
  }),
]);

const MAX_LEVEL = WORLD_STAGES.length - 1;

/** Devuelve la definición del mundo para un nivel (clamp 0..MAX_LEVEL). */
export function getWorldStage(level) {
  const lvl = Math.max(0, Math.min(MAX_LEVEL, Number(level) || 0));
  return WORLD_STAGES[lvl];
}

// ─── Criaturas (biodiversidad coleccionable) ───────────────────────────────

/**
 * Las criaturas que pueden aparecer en la finca. Cada una se desbloquea cuando
 * un indicador REAL cruza un umbral — son la biodiversidad que de verdad llega
 * cuando una finca mejora. `check(ev)` recibe el resultado de
 * evaluarEvolucionFinca y devuelve true si la criatura ya vive en la finca.
 *
 * Orden = orden de aparición (de lo más fácil/temprano a lo más logrado). El
 * quetzal es la criatura cumbre: solo aparece en una finca-bosque madura.
 */
export const CREATURES = Object.freeze([
  Object.freeze({
    id: 'lombriz',
    nombre: 'Lombriz',
    emoji: '🪱',
    pista: 'Aparece cuando empiezas a cuidar el suelo sin venenos.',
    logro: '¡Las lombrices llegaron! El suelo está vivo.',
    check: (ev) => num(ev.mesmis.autodependencia) >= 1,
  }),
  Object.freeze({
    id: 'mariposa',
    nombre: 'Mariposa',
    emoji: '🦋',
    pista: 'Aparece cuando hay varias plantas distintas.',
    logro: '¡Una mariposa visita tu finca! Le gustan tus plantas.',
    check: (ev) => num(ev.tape.diversidad) >= 1,
  }),
  Object.freeze({
    id: 'abeja',
    nombre: 'Abeja',
    emoji: '🐝',
    pista: 'Aparece cuando tus plantas se ayudan entre ellas.',
    logro: '¡Llegaron las abejas! Polinizan y hacen miel.',
    check: (ev) => num(ev.tape.sinergias) >= 1 || num(ev.tape.diversidad) >= 3,
  }),
  Object.freeze({
    id: 'rana',
    nombre: 'Rana',
    emoji: '🐸',
    pista: 'Aparece cuando tu finca es fuerte y variada.',
    logro: '¡Una rana canta en tu finca! El agua y el aire están sanos.',
    check: (ev) => num(ev.tape.resiliencia) >= 2,
  }),
  Object.freeze({
    id: 'colibri',
    nombre: 'Colibrí',
    emoji: '🐦',
    pista: 'Aparece cuando hay muchas flores y plantas.',
    logro: '¡Un colibrí baila entre tus flores!',
    check: (ev) => num(ev.tape.diversidad) >= 3,
  }),
  Object.freeze({
    id: 'mariquita',
    nombre: 'Mariquita',
    emoji: '🐞',
    pista: 'Aparece cuando cuidas la finca sin químicos.',
    logro: '¡Las mariquitas te ayudan! Se comen las plagas.',
    check: (ev) => num(ev.mesmis.autodependencia) >= 2,
  }),
  Object.freeze({
    id: 'quetzal',
    nombre: 'Quetzal',
    emoji: '🦜',
    pista: 'La criatura más especial. Solo vive en fincas-bosque muy sanas.',
    logro: '¡EL QUETZAL llegó! Tu finca es un bosque mágico de verdad.',
    check: (ev) => ev.nivelGliessman >= 3 && num(ev.tape.diversidad) >= 3,
  }),
]);

/** Cuántas criaturas existen en total (para "3 de 7"). */
export const TOTAL_CREATURES = CREATURES.length;

// ─── Insignias (logros suaves, todos derivados de datos reales) ────────────

/**
 * Insignias por hitos REALES de la finca. Como las criaturas, cada una tiene un
 * `check(ev)` puro. No son XP: son reconocimiento de trabajo verdadero.
 */
export const BADGES = Object.freeze([
  Object.freeze({
    id: 'primera_semilla',
    nombre: 'Primera semilla',
    emoji: '🌱',
    descripcion: 'Sembraste tu primera planta.',
    check: (ev) => ev.metadata.processes_count >= 1,
  }),
  Object.freeze({
    id: 'jardin_diverso',
    nombre: 'Jardín diverso',
    emoji: '🌼',
    descripcion: 'Tienes varias plantas distintas.',
    check: (ev) => num(ev.tape.diversidad) >= 2,
  }),
  Object.freeze({
    id: 'amiga_del_suelo',
    nombre: 'Amiga del suelo',
    emoji: '🪱',
    descripcion: 'Cuidas la tierra con cariño, sin venenos.',
    check: (ev) => num(ev.mesmis.autodependencia) >= 2,
  }),
  Object.freeze({
    id: 'primera_cosecha',
    nombre: 'Primera cosecha',
    emoji: '🧺',
    descripcion: 'Recogiste comida de tu finca.',
    check: (ev) => num(ev.mesmis.productividad) >= 1,
  }),
  Object.freeze({
    id: 'guardiana_bosque',
    nombre: 'Guardiana del bosque',
    emoji: '🌳',
    descripcion: 'Tu finca es un bosque que da de comer.',
    check: (ev) => ev.nivelGliessman >= 3,
  }),
]);

// ─── Misiones (acciones reales + aprender con GUATOC) ───────────────────────

/**
 * Misiones del juego. Cada misión empuja a una ACCIÓN REAL de la finca o a
 * aprender una ficha GUATOC. `nav` es la vista a la que rutea el botón (la
 * misma navegación de la app), y `done(ev, hechas)` decide si ya está cumplida.
 *
 * `done` mira datos reales (ev) o el set de misiones marcadas a mano por la
 * niña/familia (hechas, persistido aparte). Las misiones de "aprender" se
 * marcan a mano porque leer una ficha no deja rastro en los indicadores.
 *
 * El orden es pedagógico: primero sembrar, luego aprender, biopreparar, cosechar.
 */
export const MISSIONS = Object.freeze([
  Object.freeze({
    id: 'sembrar_planta',
    titulo: 'Siembra una planta',
    emoji: '🌱',
    descripcion: 'Pon una planta nueva en tu finca y regístrala.',
    cta: 'Ir a sembrar',
    nav: 'sembrar',
    tipo: 'accion',
    done: (ev) => ev.metadata.processes_count >= 1,
  }),
  Object.freeze({
    id: 'aprender_ficha',
    titulo: 'Aprende sobre una planta',
    emoji: '📖',
    descripcion: 'Descubre una planta nueva en la biblioteca de Chagra.',
    cta: 'Ir a aprender',
    nav: 'ciclo',
    tipo: 'aprender',
    done: (_ev, hechas) => hechas.has('aprender_ficha'),
  }),
  Object.freeze({
    id: 'plantar_variado',
    titulo: 'Siembra plantas amigas',
    emoji: '🌻',
    descripcion: 'Tené al menos 3 plantas distintas: así llegan las mariposas.',
    cta: 'Sembrar otra',
    nav: 'sembrar',
    tipo: 'accion',
    done: (ev) => num(ev.tape.diversidad) >= 1,
  }),
  Object.freeze({
    id: 'hacer_biopreparado',
    titulo: 'Prepárale comida natural',
    emoji: '🧪',
    descripcion: 'Haz un biopreparado para cuidar tu finca sin venenos.',
    cta: 'Ver biopreparados',
    nav: 'biopreparados',
    tipo: 'accion',
    done: (ev) => num(ev.mesmis.autodependencia) >= 1,
  }),
  Object.freeze({
    id: 'registrar_cosecha',
    titulo: 'Recoge tu cosecha',
    emoji: '🧺',
    descripcion: 'Cuando tu planta dé frutos, registra la cosecha.',
    cta: 'Ir a cosechar',
    nav: 'cosechar',
    tipo: 'accion',
    done: (ev) => num(ev.mesmis.productividad) >= 1,
  }),
  Object.freeze({
    id: 'observar_finca',
    titulo: 'Mira tu finca',
    emoji: '🔎',
    descripcion: 'Anota algo que viste hoy: un bicho, una flor, una hoja.',
    cta: 'Anotar observación',
    nav: 'observacion',
    tipo: 'accion',
    done: (ev) => num(ev.tape.cocreacion_conocimiento) >= 1,
  }),
]);

// ─── Helper interno ────────────────────────────────────────────────────────

/** Convierte un score 0-4|null en número (null → 0) para comparaciones. */
function num(score) {
  return score === null || score === undefined ? 0 : score;
}

/**
 * Normaliza un FarmProcess al shape PLANO que espera fincaEvolutionService.
 *
 * El almacenamiento real (farmProcessCache/dbCore) guarda los datos del proceso
 * bajo `process.attributes` (status, subject_slug, current_stage, …) y los
 * eventos en un store aparte. El motor de evolución, en cambio, lee campos
 * planos (`p.status`, `p.subject_slug`, …) e `p.events` inline. Esta función
 * tiende el puente SIN tocar el motor: si llega un proceso con `attributes`, lo
 * aplana; si ya viene plano (tests/llamadas directas), lo deja igual. Cero
 * fabricación: no inventa campos, solo reubica los que existen.
 *
 * @param {Object} p  FarmProcess (anidado o plano)
 * @returns {Object} proceso con campos planos para el motor
 */
function flattenProcess(p) {
  if (!p || typeof p !== 'object') return p;
  if (!p.attributes || typeof p.attributes !== 'object') return p;
  // Anidado → plano. Preserva events si el llamador los adjuntó (la pantalla
  // puede hidratar p.events desde getFarmEvents antes de pasar la lista).
  return {
    process_id: p.process_id,
    process_type: p.attributes.process_type,
    subject_slug: p.attributes.subject_slug,
    subject_label: p.attributes.subject_label,
    current_stage: p.attributes.current_stage,
    status: p.attributes.status,
    companions: p.attributes.companions || p.companions,
    events: Array.isArray(p.events) ? p.events.map(flattenEvent) : [],
  };
}

/**
 * Normaliza un FarmProcessEvent al shape plano del motor (event_type, payload).
 * Igual criterio que flattenProcess: anidado → plano; plano → tal cual.
 * @param {Object} e
 * @returns {Object}
 */
function flattenEvent(e) {
  if (!e || typeof e !== 'object') return e;
  if (!e.attributes || typeof e.attributes !== 'object') return e;
  return {
    event_type: e.attributes.event_type,
    payload: e.attributes.payload,
    occurred_at: e.attributes.occurred_at,
  };
}

// ─── Estado de juego (la función principal) ────────────────────────────────

/**
 * @typedef {Object} GameMission
 * @property {string} id
 * @property {string} titulo
 * @property {string} emoji
 * @property {string} descripcion
 * @property {string} cta
 * @property {string} nav
 * @property {'accion'|'aprender'} tipo
 * @property {boolean} cumplida
 */

/**
 * @typedef {Object} GameCreature
 * @property {string} id
 * @property {string} nombre
 * @property {string} emoji
 * @property {string} pista
 * @property {string} logro
 * @property {boolean} desbloqueada
 */

/**
 * @typedef {Object} FincaGameState
 * @property {number} nivel              Nivel Gliessman 0-4 (= mundo)
 * @property {Object} mundo             Definición WORLD_STAGES del nivel actual
 * @property {Object|null} mundoSiguiente  El próximo mundo, o null si ya es el máximo
 * @property {string} nivelLabel        Etiqueta agroecológica real del nivel
 * @property {boolean} vacia            true si la finca no tiene datos (invitar)
 * @property {GameCreature[]} criaturas Todas, con desbloqueada=true/false
 * @property {number} criaturasVivas    Conteo de desbloqueadas
 * @property {Object[]} insignias       Todas, con ganada=true/false
 * @property {number} insigniasGanadas  Conteo de ganadas
 * @property {GameMission[]} misiones    Todas, con cumplida=true/false
 * @property {GameMission|null} proximaMision  La primera misión sin cumplir
 * @property {number} progreso          0-100, % real de avance del mundo
 * @property {Object} evolution         El resultado crudo de evaluarEvolucionFinca
 */

/**
 * Construye TODO el estado de juego desde datos reales de la finca.
 *
 * @param {Object} input
 * @param {Array} [input.processes=[]]      FarmProcess[] reales de la finca
 * @param {Array} [input.observations=[]]   Observaciones reales
 * @param {Set<string>|string[]} [input.misionesHechas]  ids de misiones de
 *        "aprender" marcadas a mano (de journeyStateService / localStorage).
 * @returns {FincaGameState}
 */
export function buildFincaGameState({
  processes = [],
  observations = [],
  misionesHechas = [],
} = {}) {
  const hechas = misionesHechas instanceof Set
    ? misionesHechas
    : new Set(Array.isArray(misionesHechas) ? misionesHechas : []);

  // Acepta procesos en shape real (anidado en .attributes) o plano (tests).
  const flatProcesses = Array.isArray(processes) ? processes.map(flattenProcess) : [];

  // Motor real: cero fabricación vive acá adentro.
  const evolution = evaluarEvolucionFinca({ processes: flatProcesses, observations });
  const nivel = Math.max(0, Math.min(MAX_LEVEL, evolution.nivelGliessman));
  const mundo = WORLD_STAGES[nivel];
  const mundoSiguiente = nivel < MAX_LEVEL ? WORLD_STAGES[nivel + 1] : null;

  // Una finca "vacía" = sin procesos registrados. El juego invita en vez de
  // mostrar un mundo muerto. NO se infla nada.
  const vacia = evolution.metadata.processes_count === 0;

  const criaturas = CREATURES.map((c) => ({
    id: c.id,
    nombre: c.nombre,
    emoji: c.emoji,
    pista: c.pista,
    logro: c.logro,
    desbloqueada: safeCheck(c.check, evolution),
  }));
  const criaturasVivas = criaturas.filter((c) => c.desbloqueada).length;

  const insignias = BADGES.map((b) => ({
    id: b.id,
    nombre: b.nombre,
    emoji: b.emoji,
    descripcion: b.descripcion,
    ganada: safeCheck(b.check, evolution),
  }));
  const insigniasGanadas = insignias.filter((b) => b.ganada).length;

  const misiones = MISSIONS.map((m) => ({
    id: m.id,
    titulo: m.titulo,
    emoji: m.emoji,
    descripcion: m.descripcion,
    cta: m.cta,
    nav: m.nav,
    tipo: m.tipo,
    cumplida: safeMission(m.done, evolution, hechas),
  }));
  const proximaMision = misiones.find((m) => !m.cumplida) || null;

  // Progreso real del mundo: % del camino de niveles recorrido. Es honesto:
  // mueve solo cuando el nivel Gliessman (derivado de indicadores reales) sube.
  const progreso = Math.round((nivel / MAX_LEVEL) * 100);

  return {
    nivel,
    mundo,
    mundoSiguiente,
    nivelLabel: getGliessmanLabel(nivel),
    vacia,
    criaturas,
    criaturasVivas,
    insignias,
    insigniasGanadas,
    misiones,
    proximaMision,
    progreso,
    evolution,
  };
}

/** Ejecuta un check de criatura/insignia sin que una excepción tumbe el juego. */
function safeCheck(fn, ev) {
  try {
    return !!fn(ev);
  } catch {
    return false;
  }
}

/** Igual que safeCheck pero para misiones (reciben también el set hechas). */
function safeMission(fn, ev, hechas) {
  try {
    return !!fn(ev, hechas);
  } catch {
    return false;
  }
}

// ─── Detección de subida de nivel (para la celebración) ────────────────────

/**
 * ¿Subió de nivel? Compara el nivel actual contra el último visto (que la
 * pantalla persiste en localStorage por finca). PURA: la pantalla decide qué
 * hacer (animación + sonido + TTS). Devuelve el delta para el render.
 *
 * @param {number} nivelActual   nivel derivado ahora
 * @param {number|null} nivelPrevio  último nivel visto (o null la 1ª vez)
 * @returns {{subio: boolean, desde: number, hasta: number}}
 */
export function detectLevelUp(nivelActual, nivelPrevio) {
  const hasta = Math.max(0, Math.min(MAX_LEVEL, Number(nivelActual) || 0));
  if (nivelPrevio === null || nivelPrevio === undefined) {
    return { subio: false, desde: hasta, hasta };
  }
  const desde = Math.max(0, Math.min(MAX_LEVEL, Number(nivelPrevio) || 0));
  return { subio: hasta > desde, desde, hasta };
}

/**
 * Texto alegre y CORTO para narrar (TTS kokoro) cuando una niña entra al juego
 * o sube de nivel. Pensado para que una niña que lee poco entienda por audio.
 *
 * @param {FincaGameState} state
 * @param {{levelUp?: boolean}} [opts]
 * @returns {string}
 */
export function narrarFinca(state, { levelUp = false } = {}) {
  if (!state) return '';
  if (levelUp && state.mundo) {
    return `¡Tu finca subió de nivel! Ahora es ${state.mundo.nombreNino}. ${state.mundo.mensaje}`;
  }
  if (state.vacia) {
    return 'Tu finca está esperando. ¡Siembra tu primera planta para que cobre vida!';
  }
  const mundo = state.mundo;
  const criaturas = state.criaturasVivas === 1
    ? 'Tienes una criatura viviendo en tu finca.'
    : state.criaturasVivas > 1
      ? `Tienes ${state.criaturasVivas} criaturas viviendo en tu finca.`
      : 'Todavía no llegan criaturas. ¡Siembra más para invitarlas!';
  return `Tu finca es ${mundo.nombreNino}. ${mundo.mensaje} ${criaturas}`;
}

/**
 * Cross-check: que el modelo de mundos y el viaje agroecológico no se
 * desincronicen en niveles. Útil en tests. No se usa en runtime.
 * @returns {boolean}
 */
export function worldStagesCoverGliessman() {
  const gliessmanLevels = new Set(JOURNEY_STAGES.map((s) => s.gliessman));
  // Todo nivel Gliessman del viaje debe tener un mundo que lo represente.
  for (const lvl of gliessmanLevels) {
    if (lvl < 0 || lvl > MAX_LEVEL) return false;
  }
  return WORLD_STAGES.length === MAX_LEVEL + 1;
}
