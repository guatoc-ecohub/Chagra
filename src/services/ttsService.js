/**
 * ttsService.js — Text-to-Speech con Kokoro TTS neuronal + fallback Web Speech API.
 *
 * SpeakKokoro llama a /api/kokoro/tts (Kokoro-82M ONNX TTS local).
 * Si Kokoro no está disponible, fallback transparente a window.speechSynthesis.
 */

import { filterVoseo } from './voseoFilter.js';
import { resolveUserRegion } from './agentService.js';

/**
 * DR-LANG-1: guarda defensiva anti-voseo aplicada a la entrada de los
 * speakers. AgentScreen ya filtra antes de pasar el texto, pero el TTS
 * también es invocado desde ChatBubble (re-speak), AgentFab (replayLast)
 * y posibles surfaces futuras. filterVoseo es idempotente — un doble
 * pase es no-op y mantiene la garantía de que el campesino NUNCA escuche
 * el léxico rioplatense (che, laburar) en voz alta.
 *
 * C1/C2 (2026-06-02): region-aware. La voz también debe respetar el
 * dialecto del usuario: en regiones voseantes (paisa/pacífico/pastuso) el
 * voseo es el registro AUTÉNTICO y se PRESERVA en el audio; en el resto se
 * aplana (tú en caribe, usted por defecto). La región se resuelve del
 * perfil; sin región conocida → default seguro (comportamiento histórico).
 * resolveUserRegion es defensivo (no lanza); aun así envolvemos en try.
 *
 * @param {string} text
 * @returns {string}
 */
function applyVoseoGuard(text) {
  if (typeof text !== 'string' || text.length === 0) return text;
  try {
    let region = null;
    try { region = resolveUserRegion(); } catch (_) { region = null; }
    return filterVoseo(text, { formality: 'usted', telemetry: false, region });
  } catch (_) {
    return text;
  }
}

/**
 * Task #124 (2026-05-24): voces Kokoro curadas para español.
 *
 * Kokoro-82M expone 53 voces. Las que llevan prefix `ef_` (English Female)
 * o `em_` (English Male) sintetizan español tomando el modelo fonético
 * inglés como base, por lo que tienden a sonar con "acento gringo" al
 * hablar castellano. El operador reportó que el default `ef_dora` no
 * suena naturalmente colombiana en finca.
 *
 * NO podemos verificar acento real desde el cliente (eso es operator-
 * action: probar samples y elegir). Curamos un set acotado de candidatas
 * que la comunidad upstream (kokoro/VOICES.md) reporta como las más
 * neutras / menos marcadamente anglo al sintetizar lenguas romances:
 *
 *   - `ef_dora`   : default histórico, voz femenina suave. Operador la
 *                   reporta como "gringa". La dejamos como opción porque
 *                   algunos usuarios ya se acostumbraron a su tono.
 *   - `ef_aoede`  : reportada como una de las voces femeninas más
 *                   neutras/musicales (Aoede = musa griega). Buen
 *                   candidato para "acento más neutro hispano".
 *   - `ef_kore`   : voz femenina firme, articulación clara. Buena para
 *                   instrucciones de campo donde se necesita claridad
 *                   por ruido ambiente (motosierra, viento).
 *   - `em_alex`   : voz masculina cálida, articulación clara. Alternativa
 *                   para operadores que prefieren voz masculina.
 *
 * Esta lista NO es exhaustiva; el operador puede experimentar con las
 * otras voces ef_ / em_ en futuras iteraciones. Si descubrimos una voz
 * específicamente colombiana en upstream, la agregamos acá.
 */
/*
 * FIX 2026-07-10 (voz "robótica") — CAUSA RAÍZ: en Kokoro el PRIMER prefijo es el
 * IDIOMA, no el "género inglés". `pm_` = Portugués, `if_` = Italiano, `e[mf]_` =
 * ESPAÑOL. El bloque de arriba (2026-05) creyó por error que `ef_`/`em_` eran
 * "English" → se descartaron las voces españolas reales y el default quedó en
 * `pm_santa` (portugués brasileño) + `if_sara` (italiano). Se le metía texto en
 * español a modelos de OTRO idioma → prosodia ajena = suena "robótica".
 * Se corrige a voces `e*_` reales en español. Ref: ops/DR-VOZ-TTS-2026-07-10.md.
 *
 * GOTCHA: ante una voz no servible el server cae SILENCIOSO a la DEFAULT_VOICE.
 * `em_santa` (Santa) es la voz elegida por el operador — es la Santa ESPAÑOLA
 * de Kokoro (voz baked-in del modelo, prefijo `em_` = español masculino), NO la
 * portuguesa `pm_santa` que sonaba robótica. `em_alex`/`ef_dora` quedan como
 * alternativas, también en español.
 */
export const KOKORO_VOICES = Object.freeze([
  {
    id: 'em_santa',
    label: 'Santa',
    description: 'Voz de hombre, cálida y tranquila.',
    gender: 'masculina',
  },
  {
    id: 'em_alex',
    label: 'Álex',
    description: 'Voz de hombre, natural y clara.',
    gender: 'masculina',
  },
  {
    id: 'ef_dora',
    label: 'Dora',
    description: 'Voz de mujer, suave y clara.',
    gender: 'femenina',
  },
]);

export const DEFAULT_KOKORO_VOICE = 'em_santa';
export const DEFAULT_KOKORO_RATE = 1.0;
export const KOKORO_RATE_MIN = 0.85;
export const KOKORO_RATE_MAX = 1.1;

/**
 * Task #124: configuración XTTS-v2 para voz colombiana.
 *
 * XTTS-v2 requiere una URL de audio sample (10s) para voice cloning.
 * Por defecto apuntamos a un asset local que el operador debe proporcionar
 * (voz colombiana neutra, grabada en condiciones controladas).
 */
export const DEFAULT_COLOMBIAN_VOICE = '/voices/colombiana-neutra-10s.wav';
export const XTTS_TIMEOUT_MS = 30000; // 30s timeout antes de fallback a Kokoro
export const XTTS_ENABLED_KEY = 'chagra:tts:xtts_enabled';

const STORAGE_KEY_VOICE = 'chagra:tts:voice';
const STORAGE_KEY_RATE = 'chagra:tts:rate';

// Consistencia de voz (2026-07-09): por defecto NO caemos a la voz del
// navegador (window.speechSynthesis, robótica y con acento). El operador
// reportó "a veces habla una voz y luego otra": era este fallback saltando a
// media sesión cuando kokoro fallaba/timeouteaba. Preferimos UNA sola voz
// natural: si kokoro falla, reintentamos y, si no, silencio consistente.
// Este flag deja al operador reactivar el respaldo del navegador a propósito.
const STORAGE_KEY_BROWSER_FALLBACK = 'chagra:tts:browser_fallback';

const VALID_VOICE_IDS = new Set(KOKORO_VOICES.map((v) => v.id));

/**
 * Coerciona una voz a una que EXISTE de verdad en el servidor kokoro.
 *
 * Orden del operador (2026-07-09): dora NUNCA debe sonar, ni siquiera en el
 * fallback del servidor. El servidor kokoro, ante una voz DESCONOCIDA, cae
 * SILENCIOSAMENTE a su DEFAULT_VOICE (ef_dora) — por eso "a veces sonaba dora"
 * aunque se quitó del selector: una preferencia vieja como 'ef_aoede'/'ef_kore'
 * (voces inglesas inexistentes) o la propia 'ef_dora' viajaba al server y este
 * la resolvía a dora.
 *
 * Garantía dura: si la voz pedida NO está en KOKORO_VOICES (las que sabemos que
 * existen de verdad), la sustituimos por DEFAULT_KOKORO_VOICE (santa). Así el
 * servidor jamás recibe una voz que resuelva a dora.
 */
function toServableVoice(voice) {
  return VALID_VOICE_IDS.has(voice) ? voice : DEFAULT_KOKORO_VOICE;
}

/**
 * Task #124: lee la voz Kokoro preferida persistida en localStorage.
 * Fallback al default si:
 *   - localStorage no disponible (SSR, jsdom estricto, etc.)
 *   - clave vacía / null
 *   - valor no está en KOKORO_VOICES (defensivo contra valores corruptos
 *     o de futuras versiones que removamos una voz)
 */
export function getPreferredVoice() {
  try {
    if (typeof localStorage === 'undefined') return DEFAULT_KOKORO_VOICE;
    const stored = localStorage.getItem(STORAGE_KEY_VOICE);
    if (stored && VALID_VOICE_IDS.has(stored)) return stored;
    return DEFAULT_KOKORO_VOICE;
  } catch (_) {
    return DEFAULT_KOKORO_VOICE;
  }
}

/**
 * Task #124: persiste la voz Kokoro preferida en localStorage.
 * Valida contra KOKORO_VOICES antes de guardar — silenciosamente
 * descarta ids desconocidos para evitar persistir basura.
 *
 * @returns {boolean} true si guardó, false si voz inválida o storage falló.
 */
export function setPreferredVoice(voiceId) {
  if (!VALID_VOICE_IDS.has(voiceId)) return false;
  try {
    if (typeof localStorage === 'undefined') return false;
    localStorage.setItem(STORAGE_KEY_VOICE, voiceId);
    return true;
  } catch (_) {
    return false;
  }
}

/**
 * Task #124: lee la velocidad TTS preferida (rate) persistida.
 * Clamp a [KOKORO_RATE_MIN, KOKORO_RATE_MAX] para defensa contra valores
 * corruptos. Fallback a DEFAULT_KOKORO_RATE.
 */
export function getPreferredRate() {
  try {
    if (typeof localStorage === 'undefined') return DEFAULT_KOKORO_RATE;
    const stored = localStorage.getItem(STORAGE_KEY_RATE);
    if (stored === null) return DEFAULT_KOKORO_RATE;
    const parsed = Number.parseFloat(stored);
    if (!Number.isFinite(parsed)) return DEFAULT_KOKORO_RATE;
    if (parsed < KOKORO_RATE_MIN) return KOKORO_RATE_MIN;
    if (parsed > KOKORO_RATE_MAX) return KOKORO_RATE_MAX;
    return parsed;
  } catch (_) {
    return DEFAULT_KOKORO_RATE;
  }
}

/**
 * Task #124: persiste la velocidad TTS preferida.
 * Clamp + valida finito antes de guardar.
 *
 * @returns {boolean} true si guardó, false si valor inválido o storage falló.
 */
export function setPreferredRate(rate) {
  if (!Number.isFinite(rate)) return false;
  const clamped = Math.min(KOKORO_RATE_MAX, Math.max(KOKORO_RATE_MIN, rate));
  try {
    if (typeof localStorage === 'undefined') return false;
    localStorage.setItem(STORAGE_KEY_RATE, String(clamped));
    return true;
  } catch (_) {
    return false;
  }
}

/**
 * Task #124: lee si XTTS-v2 (voz colombiana) está habilitado.
 * Fallback a false (desactivado por defecto) si storage no disponible.
 */
export function getXTTSEnabled() {
  try {
    if (typeof localStorage === 'undefined') return false;
    const stored = localStorage.getItem(XTTS_ENABLED_KEY);
    return stored === 'true';
  } catch (_) {
    return false;
  }
}

/**
 * Task #124: persiste la preferencia de XTTS-v2.
 *
 * @returns {boolean} true si guardó, false si storage falló.
 */
export function setXTTSEnabled(enabled) {
  try {
    if (typeof localStorage === 'undefined') return false;
    localStorage.setItem(XTTS_ENABLED_KEY, String(enabled));
    return true;
  } catch (_) {
    return false;
  }
}

/**
 * Consistencia de voz (2026-07-09): ¿permitir el respaldo a la voz del
 * navegador (window.speechSynthesis) cuando kokoro falla?
 *
 * Default FALSE: preferimos una sola voz natural. Si kokoro no responde,
 * reintentamos y, si aun así falla, guardamos silencio en vez de cambiar
 * abruptamente a la voz robótica del navegador (era la causa del "a veces
 * habla una voz y luego otra"). El operador puede reactivarlo a propósito.
 */
export function getBrowserVoiceFallback() {
  try {
    if (typeof localStorage === 'undefined') return false;
    return localStorage.getItem(STORAGE_KEY_BROWSER_FALLBACK) === 'true';
  } catch (_) {
    return false;
  }
}

/**
 * Persiste la preferencia de respaldo a la voz del navegador.
 *
 * @returns {boolean} true si guardó, false si storage falló.
 */
export function setBrowserVoiceFallback(enabled) {
  try {
    if (typeof localStorage === 'undefined') return false;
    localStorage.setItem(STORAGE_KEY_BROWSER_FALLBACK, String(!!enabled));
    return true;
  } catch (_) {
    return false;
  }
}

/**
 * Limpia markdown del texto antes de mandarlo al TTS. Sin esto, kokoro y
 * SpeechSynthesis leen literal los caracteres de formato:
 *   "asterisco asterisco bold asterisco asterisco" en lugar de "bold",
 *   "guion espacio item" en lugar de "item".
 *
 * Bug reportado por operador 2026-05-23 (task #125): el agente Chagra
 * emite respuestas en markdown con listas (`*`), negrita (`**`),
 * encabezados (`#`), inline code (`` ` ``), y links `[txt](url)`. El TTS
 * los leía literal, generando UX muy fea ("peye" según operador).
 *
 * Mantenemos las transformaciones simples + idempotentes. Si el texto NO
 * tiene markdown, devuelve el texto sin cambios.
 */
export function sanitizeForTTS(text) {
  if (typeof text !== 'string' || text.length === 0) return text;
  return text
    // Negrita ** o __ (procesar antes que cursiva para evitar romper la pareja)
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/__([^_]+)__/g, '$1')
    // Cursiva * o _
    .replace(/\*([^*\n]+)\*/g, '$1')
    .replace(/(?<![A-Za-z0-9])_([^_\n]+)_(?![A-Za-z0-9])/g, '$1')
    // Inline code `texto`
    .replace(/`([^`\n]+)`/g, '$1')
    // Code fences ```lang\n...\n```
    .replace(/```[a-z]*\n?([\s\S]*?)```/gi, '$1')
    // Encabezados markdown # ## ### al inicio de línea
    .replace(/^#{1,6}\s+/gm, '')
    // Viñetas - * + al inicio de línea
    .replace(/^[\s]*[-*+]\s+/gm, '')
    // Numeración 1. 2. etc al inicio de línea
    .replace(/^[\s]*\d+[.)]\s+/gm, '')
    // Links [texto](url) → solo el texto visible
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    // Citas blockquote > al inicio de línea
    .replace(/^[\s]*>\s+/gm, '')
    // Separadores horizontales ---, ===, ***
    .replace(/^[\s]*[-=*]{3,}[\s]*$/gm, '')
    // Tablas (filas con |) — borrar carácter pipe
    .replace(/\|/g, ' ')
    // Caracteres residuales * y ` (NO _ — esos forman parte de snake_case ids
    // como coffea_arabica que el agente cita literalmente). Si el LLM emite
    // __ o * sueltos, los limpio; pero un _ entre dos letras de un id NO.
    .replace(/[*`]/g, '')
    // Espacios múltiples consecutivos → 1
    .replace(/[ \t]+/g, ' ')
    // Líneas en blanco múltiples → 1
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

let voices = [];
let voicesLoaded = false;
let kokoroAvailable = null;
let currentKokoroAudio = null;
let currentKokoroUrl = null;
// Task #122 (2026-05-23): cache del último texto que se mandó a hablar
// (Kokoro o Web Speech). Permite el "double-click avatar global → re-
// reproducir último mensaje del agente" cuando TTS está habilitado.
// El cache se llena cada vez que speakKokoro/speak corre con texto
// no vacío. Se preserva entre stop()s para que el operador silencie y
// luego pueda re-escuchar lo mismo.
let lastSpoken = null;
let lastSpokenOptions = null;

// ──────────────────────────────────────────────────────────────────────────
// Estado observable de reproducción (TIER 2 #5 — voz punta-a-punta)
// ──────────────────────────────────────────────────────────────────────────
// El campesino que casi no lee necesita VER cuándo Chagra está hablando
// (estado "hablando" con ícono+animación en AgentScreen). El problema:
// la reproducción Kokoro vive en elementos Audio internos de este módulo
// y Web Speech en utterances — nada de eso es observable desde React.
//
// Solución mínima: pub/sub de un booleano. notifySpeaking(bool) se llama
// en los puntos de arranque/fin de audio (Kokoro single, cadena de
// speakSentences, Web Speech onstart/onend, stop()). Solo notifica en
// CAMBIOS de estado — sin flicker entre frases de la cadena (la cadena
// notifica true al primer audio y false al terminar TODA la cadena).
let audioPlaying = false;
const speakingListeners = new Set();

function notifySpeaking(value) {
  if (audioPlaying === value) return;
  audioPlaying = value;
  for (const cb of speakingListeners) {
    try { cb(value); } catch (_) { /* listener roto no tumba el TTS */ }
  }
}

/**
 * Suscripción a cambios del estado "está sonando audio del agente".
 *
 * @param {(speaking: boolean) => void} cb
 * @returns {() => void} unsubscribe
 */
export function onSpeakingChange(cb) {
  if (typeof cb !== 'function') return () => {};
  speakingListeners.add(cb);
  return () => speakingListeners.delete(cb);
}

/**
 * Estado actual de reproducción (Kokoro Audio o Web Speech). A diferencia
 * de isSpeaking() (que solo mira window.speechSynthesis), esto también
 * cubre los Audio elements de Kokoro/XTTS y la cadena de speakSentences.
 *
 * @returns {boolean}
 */
export function isAudioPlaying() {
  return audioPlaying;
}

// ──────────────────────────────────────────────────────────────────────────
// Streaming sentence-by-sentence (Free 7→10 fix-pack)
// ──────────────────────────────────────────────────────────────────────────
// Bug observado: Kokoro TTS CPU es lineal con el largo del texto. Una
// respuesta de 7KB tarda ~3s; una de 145KB tarda ~23s. El usuario espera
// en silencio todo el tiempo porque speakKokoro(text) hace UNA llamada al
// backend con el texto entero y solo después arranca audio.
//
// Solución: cortar el texto en frases, sintetizar la primera AHORA, y
// encadenar las siguientes a medida que terminan. La latencia perceptual
// pasa de "esperar la respuesta entera" a "esperar la PRIMERA frase",
// que típicamente es 30-80 chars (subsegundo a 2s).
//
// Esto es backward-compatible: speakKokoro / speak siguen existiendo y
// haciéndose con texto entero. AgentScreen opta in pasando por
// speakSentences (Free 7→10 fix-pack #4).

// Estado del playback en cadena para poder cancelarlo con stop().
let sentenceQueueCancelled = false;
let sentenceQueueController = null;

const MIN_SENTENCE_CHARS = 40;  // bufferamos chunks <40 chars hasta cerrar
const SENTENCE_END_RE = /([.!?…])([\s\n]+|$)/;

/**
 * Corta un texto en frases para streaming TTS.
 *
 * Heurística simple — busca boundaries [.!?…] seguidos de whitespace o EOL.
 * Frases muy cortas (<MIN_SENTENCE_CHARS) se concatenan con la siguiente
 * para evitar audios pico-cortos que cortan la entonación natural.
 *
 * No es un parser perfecto (no maneja "Sr. González" perfectamente), pero
 * para respuestas del LLM en español funciona suficiente. El fallback en
 * caso de texto sin boundaries es tratar todo como UNA frase.
 *
 * Idempotente: splitIntoSentences("a. b.") = ["a.", "b."], y juntando
 * vuelve a quedar equivalente con el separador whitespace original.
 *
 * @param {string} text
 * @returns {string[]} array de frases (sin separadores extra), nunca vacío
 *   si text es non-empty.
 */
export function splitIntoSentences(text) {
  if (typeof text !== 'string' || text.length === 0) return [];
  const sentences = [];
  let buffer = '';
  let remaining = text;
  while (remaining.length > 0) {
    const match = SENTENCE_END_RE.exec(remaining);
    if (!match) {
      // No más boundaries — el resto va como una frase final.
      // Acumulamos y dejamos el push final fuera del loop.
      buffer += remaining;
      break;
    }
    const idx = match.index + match[1].length;  // incluye el puntuador
    buffer += remaining.slice(0, idx);
    remaining = remaining.slice(idx + (match[2] === '' ? 0 : match[2].length));
    // Si el buffer es muy corto (ej. "Sí." 3 chars), acumular con la
    // siguiente frase para evitar audios picados.
    if (buffer.trim().length >= MIN_SENTENCE_CHARS) {
      sentences.push(buffer.trim());
      buffer = '';
    } else {
      buffer += ' ';
    }
  }
  if (buffer.trim().length > 0) sentences.push(buffer.trim());
  return sentences.filter((s) => s.length > 0);
}

// ──────────────────────────────────────────────────────────────────────────
// Reintentos + política de fallback (consistencia de voz, 2026-07-09)
// ──────────────────────────────────────────────────────────────────────────
// Un blip transitorio de kokoro (503 por saturación de GPU/CPU, timeout, un
// corte de red momentáneo) NO debe cambiar de voz a media respuesta. Antes de
// rendirnos reintentamos con un backoff corto. AbortError (el operador apretó
// stop()) NUNCA se reintenta.
export const KOKORO_MAX_RETRIES = 2;
const KOKORO_RETRY_BASE_MS = 250;

function clampRate(rate) {
  const r = Number.isFinite(rate) ? rate : DEFAULT_KOKORO_RATE;
  return Math.min(KOKORO_RATE_MAX, Math.max(KOKORO_RATE_MIN, r));
}

/**
 * POST a /api/kokoro/tts con reintentos + backoff. Devuelve el blob de audio.
 * Lanza el último error si agota los reintentos, o AbortError si el signal
 * se abortó (no se reintenta en ese caso).
 */
async function fetchKokoroBlob(cleanText, voice, format, lang, signal) {
  let lastErr = null;
  for (let attempt = 0; attempt <= KOKORO_MAX_RETRIES; attempt++) {
    if (signal?.aborted) throw new DOMException('Aborted', 'AbortError');
    try {
      const res = await fetch('/api/kokoro/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: cleanText, voice, format, lang }),
        signal,
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.blob();
    } catch (e) {
      if (e?.name === 'AbortError') throw e;
      lastErr = e;
      if (attempt < KOKORO_MAX_RETRIES) {
        await new Promise((r) => setTimeout(r, KOKORO_RETRY_BASE_MS * (attempt + 1)));
      }
    }
  }
  throw lastErr || new Error('kokoro TTS falló');
}

/**
 * Fallback CONSISTENTE cuando kokoro falla definitivamente.
 *
 * Por defecto: SILENCIO (return null) — no cambiamos a la voz robótica del
 * navegador. Solo si el operador activó `setBrowserVoiceFallback(true)` a
 * propósito usamos speak() (Web Speech). Esto garantiza "una sola voz": el
 * campesino nunca oye a Chagra saltar de la voz neuronal a la del navegador
 * a media sesión.
 */
function browserFallback(text, options) {
  if (getBrowserVoiceFallback()) {
    return speak(text, options);
  }
  return null;
}

/**
 * Sintetiza una sola frase con Kokoro y devuelve un blob URL listo para Audio.
 * Internamente reusa fetchKokoroBlob (con reintentos).
 *
 * Lanza si agota reintentos; devuelve null si la frase está vacía. El caller
 * (speakSentences) captura el error y decide (por defecto, silencio).
 *
 * @returns {Promise<string|null>} blob URL o null si frase vacía.
 */
async function synthesizeSentence(sentence, voice, format, lang, signal) {
  const clean = sanitizeForTTS(sentence);
  if (!clean || clean.length === 0) return null;
  const blob = await fetchKokoroBlob(clean, voice, format, lang, signal);
  return URL.createObjectURL(blob);
}

/**
 * Reproduce un blob URL como Audio, retorna Promise que resuelve al onended.
 * Setea currentKokoroAudio/currentKokoroUrl para que stop() pueda matarlo.
 */
function playSentenceBlob(url, rate) {
  return new Promise((resolve, reject) => {
    // Garantía de UNA sola voz: cortar cualquier audio Kokoro previo que siga
    // sonando antes de arrancar el nuevo. Sin esto, dos llamadas (bienvenida +
    // mundo, o un efecto que re-dispara) apilan voces "papá noel" que se pisan
    // y se quedan en loop. speak()/speakSentences() ya cortan; este path no lo
    // hacía y era la raíz del solape/loop de la voz em_santa.
    if (currentKokoroAudio && currentKokoroAudio !== null) {
      try {
        currentKokoroAudio.pause();
        currentKokoroAudio.onended = null;
        currentKokoroAudio.onerror = null;
      } catch { /* noop */ }
    }
    if (currentKokoroUrl && currentKokoroUrl !== url) {
      try { URL.revokeObjectURL(currentKokoroUrl); } catch { /* noop */ }
    }
    const audio = new Audio(url);
    audio.playbackRate = clampRate(rate);
    currentKokoroAudio = audio;
    currentKokoroUrl = url;
    const cleanup = () => {
      if (currentKokoroUrl === url) {
        URL.revokeObjectURL(url);
        currentKokoroAudio = null;
        currentKokoroUrl = null;
      }
    };
    audio.onended = () => { cleanup(); resolve(); };
    audio.onerror = (e) => { cleanup(); reject(e); };
    // Estado "hablando": true al arrancar la frase. El false lo emite el
    // FIN DE LA CADENA en speakSentences (no acá) — así no hay flicker
    // true→false→true entre frase y frase.
    notifySpeaking(true);
    audio.play().catch((e) => { cleanup(); reject(e); });
  });
}

/**
 * Free 7→10 fix-pack #4: TTS streaming frase-por-frase.
 *
 * En vez de mandar un único request /api/kokoro/tts con el texto entero
 * (latencia lineal con chars), parte el texto en frases y las sintetiza
 * en pipeline: mientras suena la frase N, prefetchea la frase N+1.
 *
 * Eso reduce la latencia hasta-primer-audio de "esperar toda la respuesta"
 * a "esperar la primera frase" (típicamente <2s).
 *
 * Fallbacks:
 *   - Si Kokoro falla en alguna frase, fallback a speak() Web Speech
 *     para esa frase específica (no aborta toda la cadena).
 *   - Si Kokoro falla en LA PRIMERA frase, fallback completo a
 *     speakKokoro/speak con texto entero (preserva behavior viejo).
 *   - stop() cancela toda la cadena vía AbortController.
 *
 * @param {string} text - texto completo a sintetizar.
 * @param {Object} options
 *   - voice (string): id Kokoro voice, default getPreferredVoice().
 *   - format (string): default 'opus'.
 *   - lang (string): default 'es'.
 * @returns {Promise<boolean>} true si al menos una frase se reprodujo
 *   con éxito (Kokoro o Web Speech fallback), false si todo falló.
 */
export async function speakSentences(text, options = {}) {
  // DR-LANG-1: guarda defensiva anti-voseo. Idempotente; no afecta texto
  // ya filtrado por agentService.applyVoseoFilter.
  text = applyVoseoGuard(text);

  const {
    voice = getPreferredVoice(),
    format = 'opus',
    lang = 'es',
    rate = getPreferredRate(),
  } = options;

  // toServableVoice: la voz que viaja al server SIEMPRE existe → dora nunca
  // suena por el fallback silencioso del servidor (orden operador 2026-07-09).
  const servableVoice = toServableVoice(voice);

  stop();
  sentenceQueueCancelled = false;
  sentenceQueueController = new AbortController();

  // Cache para replayLast: texto original + opts.
  if (typeof text === 'string' && text.trim().length > 0) {
    lastSpoken = text;
    lastSpokenOptions = { ...options };
  }

  const sentences = splitIntoSentences(text);
  if (sentences.length === 0) return false;

  // Si solo hay 1 frase corta, no vale la pena el pipeline — usar
  // speakKokoro directo (que también hace fallback Web Speech internamente).
  if (sentences.length === 1 && sentences[0].length < MIN_SENTENCE_CHARS * 2) {
    const r = await speakKokoro(text, options);
    return r !== null;
  }

  let prefetched = null;
  let firstFrameSucceeded = false;

  // Prefetch async de la siguiente frase mientras la actual suena.
  const prefetch = (idx) => {
    if (idx >= sentences.length || sentenceQueueCancelled) return null;
    return synthesizeSentence(
      sentences[idx], servableVoice, format, lang, sentenceQueueController.signal
    ).catch((e) => {
      if (e?.name !== 'AbortError') {
        console.warn('[TTS streaming] sentence prefetch failed:', e.message);
      }
      return null;
    });
  };

  try {
    prefetched = await prefetch(0);
  } catch (_) {
    prefetched = null;
  }

  // Si la primera frase falla en Kokoro, fallback total al texto entero
  // por speakKokoro (que internamente cae a Web Speech). Preserva UX vieja.
  if (!prefetched && !sentenceQueueCancelled) {
    const r = await speakKokoro(text, options);
    return r !== null;
  }

  // Capturamos NUESTRO controller: si otro speakSentences/stop() arranca
  // mientras esta cadena sigue viva, el notifySpeaking(false) del final solo
  // debe emitirse si seguimos siendo la cadena activa (evita clobber del
  // estado "hablando" de la cadena nueva).
  const myController = sentenceQueueController;

  try {
    for (let i = 0; i < sentences.length; i++) {
      if (sentenceQueueCancelled) break;
      // Disparar prefetch de la siguiente mientras suena la actual
      const next = i + 1 < sentences.length ? prefetch(i + 1) : null;
      if (prefetched) {
        try {
          await playSentenceBlob(prefetched, rate);
          firstFrameSucceeded = true;
        } catch (e) {
          console.warn('[TTS streaming] playback error frase', i, ':', e?.message || e);
          // Consistencia de voz: NO saltamos a la voz del navegador a media
          // respuesta. browserFallback = silencio salvo que el operador haya
          // activado el respaldo del navegador a propósito.
          if (i > 0 && !sentenceQueueCancelled) {
            try { browserFallback(sentences[i], options); } catch (_) { /* ignore */ }
          }
        }
      }
      prefetched = next ? await next : null;
    }
  } finally {
    if (sentenceQueueController === myController) {
      sentenceQueueController = null;
      notifySpeaking(false);
    }
  }
  return firstFrameSucceeded;
}

/**
 * Cancela la cadena de speakSentences en curso. Idempotente.
 * Llamada desde stop() para mantener un único punto de cancelación.
 */
function cancelSentenceQueue() {
  sentenceQueueCancelled = true;
  if (sentenceQueueController) {
    try { sentenceQueueController.abort(); } catch (_) { /* ignore */ }
    sentenceQueueController = null;
  }
}

function loadVoices() {
  return new Promise((resolve) => {
    if (voicesLoaded) {
      resolve(voices);
      return;
    }

    const setVoices = () => {
      voices = window.speechSynthesis?.getVoices() || [];
      voicesLoaded = voices.length > 0;
      resolve(voices);
    };

    if (window.speechSynthesis) {
      setVoices();
      window.speechSynthesis.onvoiceschanged = () => {
        setVoices();
      };
    } else {
      resolve([]);
    }
  });
}

/**
 * @returns {Promise<SpeechSynthesisVoice[]>} array de voces disponibles.
 *   loadVoices() resuelve con [] si SpeechSynthesis no está disponible,
 *   por lo que esta función nunca throw — siempre retorna un array.
 */
export async function getVoices() {
  if (!voicesLoaded) {
    await loadVoices();
  }
  return voices;
}

export function getSpanishVoice() {
  const spanish = voices.find(
    (v) => v.lang.startsWith('es') && v.name.toLowerCase().includes('female')
  );
  if (spanish) return spanish;

  const anySpanish = voices.find((v) => v.lang.startsWith('es'));
  if (anySpanish) return anySpanish;

  const defaultVoice = voices.find(
    (v) => v.name.toLowerCase().includes('google') && v.lang.startsWith('es')
  );
  if (defaultVoice) return defaultVoice;

  return voices[0] || null;
}

export function speak(text, options = {}) {
  if (!window.speechSynthesis) {
    console.warn('[TTS] speechSynthesis not supported');
    return null;
  }

  stop();

  // DR-LANG-1: guarda defensiva anti-voseo. Idempotente.
  text = applyVoseoGuard(text);

  // Strip markdown antes de sintetizar. Sin esto, SpeechSynthesis lee
  // literal "asterisco asterisco" cuando el texto trae **negrita**.
  const cleanText = sanitizeForTTS(text);
  const utterance = new SpeechSynthesisUtterance(cleanText);

  const {
    rate = 0.9,
    pitch = 1.0,
    volume = 0.8,
    voice = null,
  } = options;

  utterance.rate = rate;
  utterance.pitch = pitch;
  utterance.volume = volume;

  if (voice) {
    utterance.voice = voice;
  } else {
    const spanishVoice = getSpanishVoice();
    if (spanishVoice) {
      utterance.voice = spanishVoice;
    }
  }

  utterance.lang = 'es-CO';

  // Estado "hablando" observable (TIER 2 #5): Web Speech expone onstart/
  // onend/onerror en el utterance — los usamos para notificar a la UI.
  utterance.onstart = () => notifySpeaking(true);
  utterance.onend = () => notifySpeaking(false);
  utterance.onerror = () => notifySpeaking(false);

  // Task #122: guardar para replayLast(). Texto vacío no se cachea para
  // evitar replayLast() repitiendo nada cuando el operador hizo speak('').
  if (typeof text === 'string' && text.trim().length > 0) {
    lastSpoken = text;
    lastSpokenOptions = { ...options };
  }

  window.speechSynthesis.speak(utterance);

  return utterance;
}

export function stop() {
  // Cancel cualquier cadena de speakSentences activa (Free 7→10 fix-pack #4)
  cancelSentenceQueue();
  if (window.speechSynthesis) {
    window.speechSynthesis.cancel();
  }
  if (currentKokoroAudio) {
    currentKokoroAudio.pause();
    currentKokoroAudio = null;
  }
  if (currentKokoroUrl) {
    URL.revokeObjectURL(currentKokoroUrl);
    currentKokoroUrl = null;
  }
  notifySpeaking(false);
}

export function pause() {
  if (window.speechSynthesis) {
    window.speechSynthesis.pause();
  }
  if (currentKokoroAudio && !currentKokoroAudio.paused) {
    currentKokoroAudio.pause();
  }
}

export function resume() {
  if (window.speechSynthesis) {
    window.speechSynthesis.resume();
  }
  if (currentKokoroAudio && currentKokoroAudio.paused) {
    currentKokoroAudio.play().catch(() => {});
  }
}

export function isSupported() {
  return !!window.speechSynthesis;
}

export async function isKokoroAvailable() {
  if (kokoroAvailable !== null) return kokoroAvailable;
  try {
    const res = await fetch('/api/kokoro/health', { method: 'GET', signal: AbortSignal.timeout(3000) });
    kokoroAvailable = res.ok;
  } catch {
    kokoroAvailable = false;
  }
  return kokoroAvailable;
}

export async function speakKokoro(text, options = {}) {
  // Task #124: si el caller NO pasa `voice` explícito, usar la voz
  // preferida del operador desde localStorage (fallback a DEFAULT_KOKORO_VOICE
  // = santa si no hay preferencia o storage inaccesible). Callers que pasan
  // voice explícito (tests, casos avanzados) conservan ese override.
  const {
    voice = getPreferredVoice(),
    format = 'opus',
    lang = 'es',
    rate = getPreferredRate(),
  } = options;

  stop();

  // DR-LANG-1: guarda defensiva anti-voseo. Idempotente; texto ya
  // filtrado por agentService.applyVoseoFilter pasa por aquí sin cambios.
  text = applyVoseoGuard(text);

  // Strip markdown antes de mandar al server Kokoro. Sin esto, el TTS
  // neuronal lee literal "asterisco asterisco" cuando el texto trae
  // **negrita**, "guion item" para viñetas, etc. (operador 2026-05-23,
  // task #125: "como peye no?").
  const cleanText = sanitizeForTTS(text);

  // Task #122: guardar el texto original (no sanitizado) para replayLast()
  // — replayLast vuelve a llamar speakKokoro que re-sanitiza idempotente.
  if (typeof text === 'string' && text.trim().length > 0) {
    lastSpoken = text;
    lastSpokenOptions = { ...options };
  }

  try {
    // fetchKokoroBlob reintenta con backoff ante blips transitorios antes de
    // rendirse — así un 503/timeout momentáneo no cambia de voz.
    // toServableVoice: dora nunca suena, ni por fallback del server.
    const blob = await fetchKokoroBlob(cleanText, toServableVoice(voice), format, lang);
    const url = URL.createObjectURL(blob);
    const audio = new Audio(url);
    audio.playbackRate = clampRate(rate);

    currentKokoroUrl = url;
    currentKokoroAudio = audio;

    audio.onended = () => {
      if (currentKokoroUrl === url) {
        URL.revokeObjectURL(currentKokoroUrl);
        currentKokoroAudio = null;
        currentKokoroUrl = null;
      }
      notifySpeaking(false);
    };
    audio.onerror = () => notifySpeaking(false);

    await audio.play();
    notifySpeaking(true);
    return audio;
  } catch (e) {
    if (e?.name === 'AbortError') {
      // stop() del operador: no es un fallo, no hacer fallback.
      notifySpeaking(false);
      return null;
    }
    // Kokoro falló tras reintentos. Por defecto NO cambiamos a la voz robótica
    // del navegador (evita el "a veces habla una voz y luego otra"): silencio
    // consistente salvo que el operador haya activado el respaldo del navegador.
    console.warn('[TTS] Kokoro falló tras reintentos:', e?.message || e);
    notifySpeaking(false);
    return browserFallback(text, options);
  }
}

/**
 * Task #124: TTS con voz colombiana vía XTTS-v2 (voice cloning).
 *
 * XTTS-v2 (Coqui TTS) soporta voice cloning con un sample de 10s.
 * A diferencia de Kokoro (que usa voces pre-entrenadas con acento anglo),
 * XTTS-v2 preserva el acento del speaker en el sample de audio.
 *
 * Esta función implementa un fallback robusto:
 *   1. Intenta XTTS-v2 con timeout XTTS_TIMEOUT_MS (30s default)
 *   2. Si timeout, error HTTP, o XTTS no disponible → fallback a speakKokoro
 *   3. Si Kokoro también falla → fallback a speak() Web Speech API
 *
 * @param {string} text - Texto a sintetizar (puede tener markdown)
 * @param {Object} options - Opciones adicionales
 * @param {string} options.voiceUrl - URL del audio sample colombiano (10s)
 * @param {string} options.format - Formato de audio output (mp3, wav)
 * @param {string} options.lang - Idioma (default 'es')
 * @returns {Promise<Audio|null>} - Audio element o null si todos fallan
 */
export async function speakXTTS(text, options = {}) {
  const {
    voiceUrl = DEFAULT_COLOMBIAN_VOICE,
    format = 'mp3',
    lang = 'es',
  } = options;

  stop();
  // DR-LANG-1: guarda defensiva anti-voseo. Idempotente.
  text = applyVoseoGuard(text);
  const cleanText = sanitizeForTTS(text);

  // Task #122: guardar el texto original (no sanitizado) para replayLast()
  if (typeof text === 'string' && text.trim().length > 0) {
    lastSpoken = text;
    lastSpokenOptions = { ...options };
  }

  try {
    // Implementar timeout manual para XTTS (AbortSignal.timeout no está
    // disponible en todos los browsers)
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), XTTS_TIMEOUT_MS);

    const res = await fetch('/api/xtts/tts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: cleanText, voice_url: voiceUrl, format, lang }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!res.ok) throw new Error(`HTTP ${res.status}`);

    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const audio = new Audio(url);

    currentKokoroUrl = url;
    currentKokoroAudio = audio;

    audio.onended = () => {
      if (currentKokoroUrl === url) {
        URL.revokeObjectURL(currentKokoroUrl);
        currentKokoroAudio = null;
        currentKokoroUrl = null;
      }
      notifySpeaking(false);
    };
    audio.onerror = () => notifySpeaking(false);

    await audio.play();
    notifySpeaking(true);
    return audio;
  } catch (e) {
    // Fallback a Kokoro si XTTS falla (timeout, error HTTP, XTTS not available)
    console.warn('[TTS] XTTS failed, fallback to Kokoro:', e.message);
    notifySpeaking(false);
    return await speakKokoro(text, options);
  }
}

export function isSpeaking() {
  return window.speechSynthesis?.speaking || false;
}

export function isPaused() {
  return window.speechSynthesis?.paused || false;
}

/**
 * Task #122 (2026-05-23): re-reproduce el último texto sintetizado.
 *
 * Usado por el doble-click del avatar global colibrí cuando TTS está
 * silenciado y el operador quiere volver a escuchar el último mensaje
 * del agente. Si nunca se habló, no-op silencioso (no throw, devuelve
 * false para que el caller decida feedback).
 *
 * Estrategia: si Kokoro estaba ready (sabemos porque lastSpokenOptions
 * existe), re-feed por Kokoro. Sino, Web Speech. Acepta override de
 * `useKokoro` para casos donde el caller ya sabe el estado del backend.
 */
export async function replayLast({ useKokoro = null } = {}) {
  if (!lastSpoken) return false;
  const opts = lastSpokenOptions || {};
  // Preferimos SIEMPRE kokoro (voz consistente). El heurístico viejo miraba
  // opts.voice.startsWith('ef_') y fallaba con las voces masculinas (em_*),
  // mandándolas a la voz del navegador. El caller puede forzar con useKokoro.
  const shouldUseKokoro = useKokoro !== null ? useKokoro : true;
  try {
    if (shouldUseKokoro) {
      await speakKokoro(lastSpoken, opts);
    } else {
      speak(lastSpoken, opts);
    }
    return true;
  } catch (_) {
    // speakKokoro ya hace fallback interno a speak() en error, así que si
    // tira hasta acá es algo raro. No bloquear el caller.
    return false;
  }
}

export function getLastSpoken() {
  return lastSpoken;
}

export function init() {
  loadVoices();
}

// Hook E2E (solo con ?e2e en la URL): expone el servicio de voz para que
// Playwright verifique la CONSISTENCIA — que un fallo de kokoro NO salte a la
// voz robótica del navegador. En prod nadie navega con ?e2e y solo expone
// funciones de voz (sin datos ni secretos). Mismo patrón que window.__doomPlayer.
if (typeof window !== 'undefined') {
  try {
    const hasE2EParam =
      typeof location !== 'undefined' && new URLSearchParams(location.search).has('e2e');
    if (hasE2EParam) {
      // window no tiene tipada la prop de test → cast puntual (irreducible).
      /** @type {any} */ (window).__ttsE2E = {
        speakKokoro,
        speakSentences,
        getBrowserVoiceFallback,
        setBrowserVoiceFallback,
      };
    }
  } catch (_) {
    /* noop — el hook E2E nunca debe romper el arranque */
  }
}

export default {
  speak,
  speakKokoro,
  speakXTTS,
  speakSentences,
  splitIntoSentences,
  stop,
  pause,
  resume,
  isSpeaking,
  isPaused,
  isSupported,
  isKokoroAvailable,
  // TIER 2 #5: estado observable de reproducción para la UI "hablando".
  onSpeakingChange,
  isAudioPlaying,
  getVoices,
  getSpanishVoice,
  replayLast,
  getLastSpoken,
  init,
  // Task #124: preferencias persistidas de voz Kokoro + XTTS.
  getPreferredVoice,
  setPreferredVoice,
  getPreferredRate,
  setPreferredRate,
  getXTTSEnabled,
  setXTTSEnabled,
  // Consistencia de voz (2026-07-09): política de respaldo a la voz del
  // navegador (default OFF → una sola voz natural).
  getBrowserVoiceFallback,
  setBrowserVoiceFallback,
  KOKORO_VOICES,
  DEFAULT_KOKORO_VOICE,
  DEFAULT_KOKORO_RATE,
  DEFAULT_COLOMBIAN_VOICE,
  XTTS_TIMEOUT_MS,
};