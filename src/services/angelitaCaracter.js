/*
 * angelitaCaracter — CÓMO SUENA Angelita (la abeja compañera de Chagra).
 *
 * Este módulo es el CARÁCTER de la voz, no el motor: decide con qué voz, a
 * qué ritmo y con qué forma de texto habla Angelita, para que suene como
 * ELLA en cualquier pantalla de la app. El motor (síntesis kokoro + cola)
 * vive en ttsService.js / angelitaVoz.js.
 *
 * Fuente: DR "diseño de la voz de un personaje companion (abeja Angelita)
 * para niños y campesinos" (deepresearch/DR-FANOUT, 2026-06-19). Lo que el
 * DR pide y aquí se aterriza:
 *
 *   · RITMO PAUSADO Y MEDIDO — la audiencia es una niña de 11 años y
 *     campesinos con baja alfabetización digital: necesitan tiempo para
 *     procesar. Rate por defecto 0.95 (un pelito más lento que neutro),
 *     salvo que el usuario ya haya elegido su velocidad en Ajustes — la
 *     preferencia explícita del usuario SIEMPRE gana.
 *   · CLARIDAD > ADORNO — frases cortas, pronunciación limpia. El texto se
 *     "aterciopela" antes de sintetizar: fuera emojis (kokoro los deletrea
 *     o los ignora feo), fuera signos gritados (!!!), guiones largos se
 *     vuelven pausas (coma), y toda frase cierra con puntuación para que
 *     la entonación caiga natural y no quede colgada.
 *   · ESPAÑOL DE COLOMBIA, USTED — el léxico ya lo garantizan el guion
 *     (angelitaInteligencia, saludoPantalla: usted cálido, nunca voseo) y
 *     la guarda filterVoseo dentro de ttsService. Aquí NO se re-filtra:
 *     una sola autoridad por regla.
 *   · UNA SOLA VOZ CONSISTENTE — Angelita usa la voz kokoro preferida del
 *     usuario (o la default del sistema). Hay una llave de override propia
 *     (VOZ_ANGELITA_KEY) para el día que el operador consiga/apruebe una
 *     voz femenina colombiana real (XTTS con sample colombiano, o una voz
 *     kokoro nueva); mientras tanto NO forzamos ninguna voz vetada.
 *   · EL SILENCIO ES PARTE DE LA VOZ — la cadencia anti-molestia (cuándo
 *     NO hablar) no vive aquí sino en la cola (angelitaVoz: los comentarios
 *     de ambiente se descartan si ella ya está hablando) y en el motor de
 *     comportamiento (angelitaInteligencia: cooldowns).
 *
 * SOLO funciones puras + lectura de preferencias. Cero red, cero audio.
 */

import {
  KOKORO_VOICES,
  getPreferredVoice,
  getPreferredRate,
  KOKORO_RATE_MIN,
  KOKORO_RATE_MAX,
} from './ttsService.js';

/**
 * Override opcional de la voz kokoro de Angelita (localStorage). Vacío o
 * inválido → se usa la voz preferida global del usuario. Existe para poder
 * darle a Angelita una voz PROPIA (distinta de la del lector de pantalla
 * general) el día que haya una voz femenina colombiana aprobada.
 */
export const VOZ_ANGELITA_KEY = 'chagra:angelita:voz';

/**
 * Ritmo por defecto de Angelita: 0.95 — pausado y medido (DR de voz §2:
 * niños y baja alfabetización necesitan tiempo de proceso), sin sonar
 * arrastrado. Solo aplica si el usuario NO fijó su propia velocidad.
 */
export const RATE_ANGELITA = 0.95;

/* Misma llave que usa ttsService para la velocidad preferida (privada allá;
 * aquí solo se consulta EXISTENCIA para saber si el usuario eligió algo). */
const RATE_USUARIO_KEY = 'chagra:tts:rate';

const IDS_VALIDOS = new Set(KOKORO_VOICES.map((v) => v.id));

/**
 * La voz kokoro con la que habla Angelita.
 * Prioridad: override propio válido → voz preferida global del usuario.
 * @returns {string} id de voz kokoro servible.
 */
export function vozDeAngelita() {
  try {
    if (typeof localStorage !== 'undefined') {
      const propia = localStorage.getItem(VOZ_ANGELITA_KEY);
      if (propia && IDS_VALIDOS.has(propia)) return propia;
    }
  } catch (_) { /* storage inaccesible: cae a la preferida global */ }
  return getPreferredVoice();
}

/**
 * Fija (o limpia con '' / null) la voz propia de Angelita.
 * @param {string|null} voiceId - id kokoro válido, o vacío para limpiar.
 * @returns {boolean} true si persistió el cambio.
 */
export function setVozDeAngelita(voiceId) {
  try {
    if (typeof localStorage === 'undefined') return false;
    if (!voiceId) {
      localStorage.removeItem(VOZ_ANGELITA_KEY);
      return true;
    }
    if (!IDS_VALIDOS.has(voiceId)) return false;
    localStorage.setItem(VOZ_ANGELITA_KEY, voiceId);
    return true;
  } catch (_) {
    return false;
  }
}

/**
 * El ritmo al que habla Angelita. La preferencia explícita del usuario
 * (Ajustes → velocidad) SIEMPRE gana; sin preferencia, el pausado propio
 * del personaje (RATE_ANGELITA), clampeado al rango servible.
 * @returns {number}
 */
export function rateDeAngelita() {
  try {
    if (typeof localStorage !== 'undefined' && localStorage.getItem(RATE_USUARIO_KEY) !== null) {
      return getPreferredRate();
    }
  } catch (_) { /* storage inaccesible: ritmo propio */ }
  return Math.min(KOKORO_RATE_MAX, Math.max(KOKORO_RATE_MIN, RATE_ANGELITA));
}

/**
 * "Aterciopela" un texto para la GARGANTA de Angelita: mismo contenido,
 * mejor prosodia. Pensado para correr ANTES de sanitizeForTTS (que quita
 * markdown) — ambos son idempotentes y componen en cualquier orden.
 *
 *   · Emojis fuera — kokoro los deletrea o los traga con glitch.
 *   · «Comillas angulares» y "tipográficas" fuera (el contenido queda).
 *   · ¡Gritos!!! → un solo signo (calidez, no alarma — DR §1: sonrisa
 *     audible, no locutor eufórico).
 *   · Guion largo con aire ( — ) → coma: pausa natural en la síntesis.
 *   · Cierre con puntuación SIEMPRE: sin punto final la entonación kokoro
 *     queda suspendida (suena a robot que se apagó).
 *
 * Idempotente: darCaracter(darCaracter(x)) === darCaracter(x).
 *
 * @param {string} texto
 * @returns {string}
 */
export function darCaracter(texto) {
  if (typeof texto !== 'string' || texto.length === 0) return texto;
  let t = texto
    // Emojis y pictogramas → espacio (no pegar palabras vecinas).
    .replace(/\p{Extended_Pictographic}/gu, ' ')
    // Selectores de variante y zero-width joiners residuales.
    .replace(/[️‍]/g, '')
    // Comillas angulares y tipográficas: el contenido se dice, ellas no.
    .replace(/[«»“”„]/g, '')
    // Signos repetidos → uno (habla cálida, no gritada).
    .replace(/!{2,}/g, '!')
    .replace(/\?{2,}/g, '?')
    // Guion largo/corto con aire → coma (pausa de respiración).
    .replace(/\s+[—–]\s+/g, ', ')
    // Espacios múltiples que dejaron los reemplazos.
    .replace(/[ \t]{2,}/g, ' ')
    // Espacio huérfano antes de puntuación ("hola !", "sí .").
    .replace(/ ([.,;:!?])/g, '$1')
    .trim();
  if (t.length > 0 && !/[.!?…:]$/.test(t)) t = `${t}.`;
  return t;
}

/**
 * Las opciones de síntesis con las que Angelita habla, listas para pasarle
 * al motor (ttsService.speakSentences): su voz, su ritmo, español.
 * @returns {{ voice: string, rate: number, lang: string }}
 */
export function opcionesDeVozAngelita() {
  return {
    voice: vozDeAngelita(),
    rate: rateDeAngelita(),
    lang: 'es',
  };
}

export default {
  VOZ_ANGELITA_KEY,
  RATE_ANGELITA,
  vozDeAngelita,
  setVozDeAngelita,
  rateDeAngelita,
  darCaracter,
  opcionesDeVozAngelita,
};
