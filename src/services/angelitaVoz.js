/*
 * angelitaVoz — LA GARGANTA ÚNICA de Angelita (autoridad de reproducción).
 *
 * PROBLEMA QUE RESUELVE (bug "los audios se pisan", 2026-07-19): hasta hoy
 * cada superficie (AgentScreen, el shell del valle, el hero, onboarding…)
 * llamaba a ttsService por su cuenta. Dos llamadas cercanas = dos <audio>
 * sonando encima, o un stop() bruto a mitad de frase. Angelita tenía cuerpo
 * en toda la app pero garganta repartida.
 *
 * ARQUITECTURA (DR "arquitectura de audio para un agente de voz en una PWA
 * offline-first", deepresearch/DR-FANOUT 2026-06-19): UNA sola autoridad de
 * reproducción con cola serializada y política EXPLÍCITA de llegada. Nadie
 * más de la app debe llamar speakKokoro/speakSentences directo para el
 * habla del personaje — todo pasa por decir().
 *
 * POLÍTICA DE LLEGADA (explícita, testeada — no emergente):
 *   · Nada sonando                  → suena ya.
 *   · Llega prioridad MAYOR         → INTERRUMPE: corta lo actual (se
 *     descarta, no se reanuda — retomar a media frase suena a radio dañado),
 *     purga lo AMBIENTE encolado y suena ya.
 *   · Llega prioridad IGUAL         → se ENCOLA (FIFO dentro de su nivel).
 *   · Llega prioridad MENOR         → se encola, SALVO AMBIENTE que se
 *     DESCARTA: un comentario de ambiente es del momento; decirlo tarde es
 *     peor que callarlo (anti-molestia, DR de voz §5 "cuándo no hablar").
 *   · reemplaza:true (opción caller) → vacía todo y suena ya. Es el modo del
 *     chat: una respuesta nueva del agente deja obsoleta la anterior.
 *
 * PRIORIDADES:
 *   AMBIENTE  (1) — narración espontánea al entrar a un mundo, husmeo.
 *   NORMAL    (2) — avisos del comportamiento (aviso/celebra del store).
 *   RESPUESTA (3) — lo que el usuario PIDIÓ oír (respuesta del agente,
 *                   botón "Escuchar", tocar una puerta).
 *   ALERTA    (4) — urgencias reales (helada, alerta activa severa).
 *
 * LATENCIA kokoro (CPU, lineal con los caracteres: 7KB→3s, 75KB→11s): NO se
 * recorta la respuesta (política: inteligencia primero). El motor delega en
 * ttsService.speakSentences, que parte en frases y encadena con prefetch —
 * el primer audio llega en <2s y el resto fluye. La cola solo gobierna
 * MENSAJES completos; el encadenado interno de frases ya es serial.
 *
 * DEGRADACIÓN DIGNA (offline-first):
 *   · El TEXTO del mensaje se emite SIEMPRE (onTexto) al activarse, antes
 *     de intentar audio — sin kokoro, sin red o sin gesto, el mensaje llega
 *     escrito y la UI nunca queda muda ni colgada.
 *   · Un fallo del motor NUNCA rechaza hacia el caller: decir() resuelve
 *     { hablado:false, motivo } y la cola avanza sola.
 *   · WATCHDOG: si una síntesis/reproducción se queda pegada (backend
 *     colgado sin timeout), un plazo proporcional al largo del texto corta
 *     y la cola sigue. La interfaz jamás espera para siempre.
 *
 * AUTOPLAY Y CALMA:
 *   · El audio NUNCA arranca sin un gesto previo del usuario en la sesión
 *     (pointerdown/keydown global desbloquea — patrón unlock del DR). Antes
 *     del gesto: solo texto, motivo 'sin-gesto'.
 *   · prefers-reduced-motion: el habla ESPONTÁNEA (AMBIENTE) se calla y
 *     queda en texto; lo que el usuario pidió (RESPUESTA) y las urgencias
 *     (ALERTA/NORMAL) sí suenan — reducir estímulo no es esconder avisos.
 *
 * VOZ DEL PERSONAJE: el carácter (voz kokoro, ritmo pausado, texto
 * aterciopelado) viene de angelitaCaracter.js y se aplica aquí para que
 * TODAS las superficies suenen a la misma Angelita.
 */

import { speakSentences, speak, stop as pararMotorTts, isKokoroAvailable } from './ttsService.js';
import { darCaracter, opcionesDeVozAngelita } from './angelitaCaracter.js';

/** Niveles de prioridad del habla (mayor = más importante). */
export const PRIORIDAD = Object.freeze({
  AMBIENTE: 1,
  NORMAL: 2,
  RESPUESTA: 3,
  ALERTA: 4,
});

/** Motivos con los que resuelve decir() — vocabulario cerrado y testeable. */
export const MOTIVO = Object.freeze({
  OK: 'ok',                    // sonó completo
  VACIO: 'vacio',              // texto vacío/no-string
  DUPLICADO: 'duplicado',      // mismo texto ya sonando o en cola
  OCUPADA: 'ocupada',          // AMBIENTE descartado porque ella ya habla
  COLA_LLENA: 'cola-llena',    // se cayó del tope de la cola
  INTERRUMPIDO: 'interrumpido',// lo cortó una prioridad mayor
  CALLADA: 'callada',          // callar() del usuario/caller
  SIN_GESTO: 'sin-gesto',      // autoplay bloqueado: aún no hubo gesto
  AUDIO_OFF: 'audio-off',      // audio deshabilitado (toggle voz)
  CALMA: 'calma',              // prefers-reduced-motion vetó habla espontánea
  AUDIO_FALLO: 'audio-fallo',  // kokoro y respaldo fallaron (texto ya llegó)
  WATCHDOG: 'watchdog',        // el motor se colgó; se cortó y se siguió
});

/** Tope de mensajes esperando turno (además del que suena). */
export const MAX_COLA = 3;

/* WATCHDOG: plazo = base + porChar·len. kokoro CPU sintetiza ~lineal
 * (75KB→11s) y la REPRODUCCIÓN dura aprox len/14 chars por segundo; 90ms
 * por char cubre síntesis+reproducción con holgura amplia sin dejar la UI
 * rehén de un backend colgado. */
export const WATCHDOG_BASE_MS = 20000;
export const WATCHDOG_POR_CHAR_MS = 90;

/* ────────────────────────────────────────────────────────────────────────
 * Motor por defecto: kokoro streaming frase-a-frase; si kokoro NO está
 * (health check), la voz del navegador como arranque digno (mismo trato
 * que ya daba AgentScreen). Envuelto en promesa que resuelve al TERMINAR
 * de sonar — la cola necesita saber cuándo se soltó la garganta.
 * ──────────────────────────────────────────────────────────────────────── */
const motorTts = {
  /**
   * @param {string} texto - ya aterciopelado (darCaracter).
   * @param {{voice?: string, rate?: number, lang?: string}} opciones
   * @returns {Promise<boolean>} true si algo llegó a sonar.
   */
  async decir(texto, opciones) {
    let kokoro = false;
    try { kokoro = await isKokoroAvailable(); } catch (_) { kokoro = false; }
    if (kokoro) {
      // speakSentences resuelve cuando TODA la cadena de frases terminó (o
      // false si nada sonó). Reintentos y política anti-cambio-de-voz viven
      // adentro (ttsService).
      return !!(await speakSentences(texto, opciones));
    }
    // Sin kokoro (offline / backend caído de raíz): Web Speech si existe.
    // pitch apenas arriba de neutro — registro medio-agudo de abeja (DR de
    // voz §1) sin caer en caricatura.
    return await new Promise((resolver) => {
      let utterance = null;
      try {
        utterance = speak(texto, { rate: opciones?.rate ?? 0.95, pitch: 1.1 });
      } catch (_) { utterance = null; }
      if (!utterance) { resolver(false); return; }
      // addEventListener y NO .onend: ttsService ya usa .onend para su
      // estado observable (notifySpeaking) — no se lo pisamos.
      utterance.addEventListener('end', () => resolver(true));
      utterance.addEventListener('error', () => resolver(false));
    });
  },
  parar() {
    try { pararMotorTts(); } catch (_) { /* nunca romper por parar */ }
  },
};

/* ── Estado de la autoridad (módulo singleton) ─────────────────────────── */
let motor = motorTts;
let actual = null;             // mensaje activo (sonando o entregándose)
let cola = [];                 // mensajes esperando turno (orden de salida)
let contadorId = 0;
let desbloqueada = false;      // ¿ya hubo gesto del usuario en la sesión?
let audioHabilitado = true;    // toggle global de la garganta (texto sigue)
const oyentesTexto = new Set();

/* ── Desbloqueo por gesto (autoplay policy) ────────────────────────────── */
function instalarDesbloqueoPorGesto() {
  if (typeof document === 'undefined') return;
  const desbloquear = () => {
    desbloqueada = true;
    document.removeEventListener('pointerdown', desbloquear);
    document.removeEventListener('keydown', desbloquear);
  };
  try {
    document.addEventListener('pointerdown', desbloquear, { passive: true });
    document.addEventListener('keydown', desbloquear);
  } catch (_) { /* entorno sin DOM events: quedará bloqueada (solo texto) */ }
}
instalarDesbloqueoPorGesto();

/** Marca explícitamente que hubo gesto (para callers que ya lo saben). */
export function marcarGesto() { desbloqueada = true; }

/** ¿Ya hubo un gesto que desbloquee audio en esta sesión? */
export function hayGesto() { return desbloqueada; }

/** Prende/apaga la garganta globalmente (el texto SIEMPRE sigue llegando). */
export function setAudioHabilitado(v) { audioHabilitado = !!v; }

/** ¿prefers-reduced-motion? Guardado — jsdom y browsers viejos no lo traen. */
function prefiereCalma() {
  try {
    return typeof window !== 'undefined'
      && typeof window.matchMedia === 'function'
      && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  } catch (_) {
    return false;
  }
}

/* ── La política de llegada, PURA y exportada (testeable sin audio) ────── */
/**
 * Decide qué pasa cuando llega un mensaje nuevo estando (o no) otra cosa
 * sonando. Ver tabla en el encabezado del módulo.
 * @param {{prioridad: number}} nuevo
 * @param {{prioridad: number}|null} enCurso
 * @returns {'reproducir'|'interrumpir'|'encolar'|'descartar'}
 */
export function politicaLlegada(nuevo, enCurso) {
  if (!enCurso) return 'reproducir';
  if (nuevo.prioridad > enCurso.prioridad) return 'interrumpir';
  if (nuevo.prioridad === enCurso.prioridad) return 'encolar';
  return nuevo.prioridad <= PRIORIDAD.AMBIENTE ? 'descartar' : 'encolar';
}

/* ── Suscripción al texto (la burbuja/UI que quiera oír a Angelita) ────── */
/**
 * Cada mensaje ACEPTADO emite su texto al activarse — ANTES de intentar
 * audio. Es la garantía "el texto siempre llega aunque el audio no".
 * @param {(msg: {id: string, texto: string, prioridad: number, origen: string}) => void} cb
 * @returns {() => void} unsubscribe
 */
export function onTexto(cb) {
  if (typeof cb !== 'function') return () => {};
  oyentesTexto.add(cb);
  return () => oyentesTexto.delete(cb);
}

function emitirTexto(msg) {
  for (const cb of oyentesTexto) {
    try { cb({ id: msg.id, texto: msg.texto, prioridad: msg.prioridad, origen: msg.origen }); }
    catch (_) { /* un oyente roto no calla a Angelita */ }
  }
}

/* ── El corazón: activar, sonar con guardia, avanzar ───────────────────── */

function resolverMsg(msg, resultado) {
  if (msg.resuelto) return;
  msg.resuelto = true;
  try { msg.resolver(resultado); } catch (_) { /* noop */ }
}

function terminar(msg, resultado) {
  resolverMsg(msg, resultado);
  if (actual === msg) {
    actual = null;
    const siguiente = cola.shift();
    if (siguiente) activar(siguiente);
  }
}

function puedeSonar(msg) {
  if (!audioHabilitado) return { ok: false, motivo: MOTIVO.AUDIO_OFF };
  if (!desbloqueada) return { ok: false, motivo: MOTIVO.SIN_GESTO };
  if (msg.prioridad <= PRIORIDAD.AMBIENTE && prefiereCalma()) {
    return { ok: false, motivo: MOTIVO.CALMA };
  }
  return { ok: true };
}

function activar(msg) {
  actual = msg;
  emitirTexto(msg); // el texto llega SIEMPRE, pase lo que pase con el audio
  const paso = puedeSonar(msg);
  if (!paso.ok) {
    terminar(msg, { hablado: false, motivo: paso.motivo });
    return;
  }
  sonarConGuardia(msg);
}

function sonarConGuardia(msg) {
  const plazoMs = WATCHDOG_BASE_MS + msg.texto.length * WATCHDOG_POR_CHAR_MS;
  let cerrado = false;
  const timer = setTimeout(() => {
    // El motor se colgó (síntesis o reproducción sin fin): cortar y seguir.
    motor.parar();
    cerrar({ hablado: false, motivo: MOTIVO.WATCHDOG });
  }, plazoMs);
  const cerrar = (resultado) => {
    if (cerrado) return;
    cerrado = true;
    clearTimeout(timer);
    if (!msg.vivo) return; // interrumpido/callado: otro camino ya resolvió
    terminar(msg, resultado);
  };
  // Si interrumpen/callan este mensaje, la guardia se desarma (que el timer
  // viejo no le corte el audio al mensaje NUEVO).
  msg.desarmarGuardia = () => {
    cerrado = true;
    clearTimeout(timer);
  };
  Promise.resolve()
    .then(() => motor.decir(msg.textoVoz, msg.opcionesVoz))
    .then((sono) => cerrar({ hablado: !!sono, motivo: sono ? MOTIVO.OK : MOTIVO.AUDIO_FALLO }))
    .catch(() => cerrar({ hablado: false, motivo: MOTIVO.AUDIO_FALLO }));
}

function cortarActual(motivo) {
  const cortado = actual;
  if (!cortado) return;
  cortado.vivo = false;
  if (cortado.desarmarGuardia) cortado.desarmarGuardia();
  actual = null;
  motor.parar();
  resolverMsg(cortado, { hablado: false, motivo });
}

function encolar(msg) {
  // Inserta manteniendo prioridad (desc); FIFO dentro del mismo nivel.
  let idx = cola.length;
  for (let i = 0; i < cola.length; i++) {
    if (msg.prioridad > cola[i].prioridad) { idx = i; break; }
  }
  cola.splice(idx, 0, msg);
  // Tope: se cae el de MENOR prioridad más al fondo (puede ser el recién
  // llegado). Resuelve 'cola-llena' — nunca cuelga al caller.
  if (cola.length > MAX_COLA) {
    let peor = cola.length - 1;
    for (let i = cola.length - 1; i >= 0; i--) {
      if (cola[i].prioridad < cola[peor].prioridad) peor = i;
    }
    const [caido] = cola.splice(peor, 1);
    resolverMsg(caido, { hablado: false, motivo: MOTIVO.COLA_LLENA });
  }
}

/* ── API pública ───────────────────────────────────────────────────────── */

/**
 * Angelita DICE algo — la única puerta de entrada del habla del personaje.
 *
 * Nunca rechaza: siempre resuelve { hablado, motivo } (MOTIVO.*). El texto
 * del mensaje aceptado se emite a onTexto() aunque el audio no pueda.
 *
 * @param {string} texto - lo que dice (el carácter lo aterciopela).
 * @param {Object} [opciones]
 * @param {number}  [opciones.prioridad=PRIORIDAD.NORMAL] - ver PRIORIDAD.
 * @param {boolean} [opciones.reemplaza=false] - vaciar todo y sonar ya
 *   (modo chat: la respuesta nueva deja obsoleta la anterior).
 * @param {string}  [opciones.origen='app'] - etiqueta de la superficie
 *   (diagnóstico/telemetría, no afecta la política).
 * @param {Object}  [opciones.voz] - override puntual de {voice, rate, lang}.
 * @returns {Promise<{hablado: boolean, motivo: string, id?: string}>}
 */
export function decir(texto, opciones = {}) {
  if (typeof texto !== 'string' || texto.trim().length === 0) {
    return Promise.resolve({ hablado: false, motivo: MOTIVO.VACIO });
  }
  const limpio = texto.trim();

  // Dedup: el mismo texto sonando o esperando no se apila (doble tap,
  // efecto que re-dispara). Con reemplaza:true sí pasa — reemplazar lo
  // mismo es legítimo (re-escuchar).
  if (!opciones.reemplaza
    && ((actual && actual.texto === limpio) || cola.some((m) => m.texto === limpio))) {
    return Promise.resolve({ hablado: false, motivo: MOTIVO.DUPLICADO });
  }

  const msg = {
    id: `voz-${++contadorId}`,
    texto: limpio,
    textoVoz: darCaracter(limpio),
    prioridad: opciones.prioridad ?? PRIORIDAD.NORMAL,
    origen: opciones.origen || 'app',
    opcionesVoz: { ...opcionesDeVozAngelita(), ...(opciones.voz || {}) },
    vivo: true,
    resuelto: false,
    resolver: null,
    desarmarGuardia: null,
  };
  const promesa = new Promise((res) => { msg.resolver = res; });

  if (opciones.reemplaza) {
    callar();
    activar(msg);
    return promesa;
  }

  const veredicto = politicaLlegada(msg, actual);
  if (veredicto === 'reproducir') {
    activar(msg);
  } else if (veredicto === 'interrumpir') {
    // Lo AMBIENTE encolado pierde su momento con la interrupción: se purga.
    cola = cola.filter((m) => {
      if (m.prioridad <= PRIORIDAD.AMBIENTE) {
        resolverMsg(m, { hablado: false, motivo: MOTIVO.OCUPADA });
        return false;
      }
      return true;
    });
    cortarActual(MOTIVO.INTERRUMPIDO);
    activar(msg);
  } else if (veredicto === 'encolar') {
    encolar(msg);
  } else {
    resolverMsg(msg, { hablado: false, motivo: MOTIVO.OCUPADA });
  }
  return promesa;
}

/**
 * Calla a Angelita del todo: corta lo que suena y vacía la cola. Cada
 * mensaje pendiente resuelve { hablado:false, motivo:'callada' }.
 * Idempotente.
 */
export function callar() {
  cortarActual(MOTIVO.CALLADA);
  const pendientes = cola;
  cola = [];
  for (const m of pendientes) resolverMsg(m, { hablado: false, motivo: MOTIVO.CALLADA });
}

/** ¿Está Angelita con un mensaje activo (sonando o entregándose)? */
export function estaHablando() { return actual !== null; }

/** Foto del estado para diagnóstico/tests: qué suena y cuánto espera. */
export function estadoCola() {
  return {
    actual: actual ? { id: actual.id, texto: actual.texto, prioridad: actual.prioridad } : null,
    pendientes: cola.map((m) => ({ id: m.id, texto: m.texto, prioridad: m.prioridad })),
  };
}

/**
 * SOLO PARA TESTS: resetea el estado del singleton e inyecta un motor
 * falso. gesto/audio arrancan permitidos para no ensuciar cada test.
 * @param {{motor?: {decir: Function, parar: Function}, gesto?: boolean, audio?: boolean}} [cfg]
 */
export function __resetParaTests(cfg = {}) {
  callar();
  motor = cfg.motor || motorTts;
  desbloqueada = cfg.gesto !== undefined ? !!cfg.gesto : true;
  audioHabilitado = cfg.audio !== undefined ? !!cfg.audio : true;
  actual = null;
  cola = [];
  oyentesTexto.clear();
}

export default {
  PRIORIDAD,
  MOTIVO,
  MAX_COLA,
  decir,
  callar,
  estaHablando,
  estadoCola,
  onTexto,
  politicaLlegada,
  marcarGesto,
  hayGesto,
  setAudioHabilitado,
};
