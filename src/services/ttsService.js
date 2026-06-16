/**
 * ttsService.js — Text-to-Speech con Kokoro TTS neuronal + fallback Web Speech API.
 *
 * SpeakKokoro llama a /api/kokoro/tts (Kokoro-82M ONNX TTS local).
 * Si Kokoro no está disponible, fallback transparente a window.speechSynthesis.
 */

import { applyVoseoGuard, sanitizeForTTS, splitIntoSentences } from './ttsHelpers.js';
export { applyVoseoGuard, sanitizeForTTS, splitIntoSentences };


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
export const KOKORO_VOICES = Object.freeze([
  {
    id: 'ef_dora',
    label: 'Dora (femenina, default)',
    description: 'Voz por defecto. Tono suave. Puede sentirse con acento anglo.',
    gender: 'femenina',
  },
  {
    id: 'ef_aoede',
    label: 'Aoede (femenina, más neutra)',
    description: 'Voz femenina musical. Acento hispano más neutro según comunidad.',
    gender: 'femenina',
  },
  {
    id: 'ef_kore',
    label: 'Kore (femenina, articulación firme)',
    description: 'Voz femenina con articulación clara. Buena para campo con ruido.',
    gender: 'femenina',
  },
  {
    id: 'em_alex',
    label: 'Alex (masculina, cálida)',
    description: 'Voz masculina cálida. Alternativa al perfil femenino.',
    gender: 'masculina',
  },
]);

export const DEFAULT_KOKORO_VOICE = 'ef_dora';
export const DEFAULT_KOKORO_RATE = 0.9;
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

const VALID_VOICE_IDS = new Set(KOKORO_VOICES.map((v) => v.id));

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

const MIN_SENTENCE_CHARS = 40;

/**
 * Sintetiza una sola frase con Kokoro y devuelve un blob URL listo para Audio.
 * Internamente reusa el endpoint /api/kokoro/tts.
 *
 * Lanza si HTTP no-OK o si la frase está vacía. El caller (speakSentences)
 * captura el error y decide si fallback a speak() Web Speech.
 *
 * @returns {Promise<string|null>} blob URL o null si frase vacía.
 */
async function synthesizeSentence(sentence, voice, format, lang, signal) {
  const clean = sanitizeForTTS(sentence);
  if (!clean || clean.length === 0) return null;
  const res = await fetch('/api/kokoro/tts', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text: clean, voice, format, lang }),
    signal,
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const blob = await res.blob();
  return URL.createObjectURL(blob);
}

/**
 * Reproduce un blob URL como Audio, retorna Promise que resuelve al onended.
 * Setea currentKokoroAudio/currentKokoroUrl para que stop() pueda matarlo.
 */
function playSentenceBlob(url) {
  return new Promise((resolve, reject) => {
    const audio = new Audio(url);
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
  } = options;

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
      sentences[idx], voice, format, lang, sentenceQueueController.signal
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
          await playSentenceBlob(prefetched);
          firstFrameSucceeded = true;
        } catch (e) {
          console.warn('[TTS streaming] playback error frase', i, ':', e?.message || e);
          // Para frases tardías que fallan, fallback Web Speech por frase.
          if (i > 0 && !sentenceQueueCancelled) {
            try { speak(sentences[i], options); } catch (_) { /* ignore */ }
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
  // preferida del operador desde localStorage (fallback ef_dora si
  // no hay preferencia o storage inaccesible). Callers que pasan voice
  // explícito (tests, casos avanzados) conservan ese override.
  const {
    voice = getPreferredVoice(),
    format = 'opus',
    lang = 'es',
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
    const res = await fetch('/api/kokoro/tts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: cleanText, voice, format, lang }),
    });

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
    console.warn('[TTS] Kokoro failed, fallback to Web Speech:', e.message);
    // Si el play() falló después de notificar, limpiar antes del fallback —
    // speak() gestionará su propio onstart/onend.
    notifySpeaking(false);
    speak(text, options);
    return null;
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
  // Decisión por defecto: probar Kokoro si la última vez fue Kokoro
  // (heurística: opts trae `voice` ef_*). Sino Web Speech.
  const shouldUseKokoro =
    useKokoro !== null
      ? useKokoro
      : typeof opts.voice === 'string' && opts.voice.startsWith('ef_');
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
  KOKORO_VOICES,
  DEFAULT_KOKORO_VOICE,
  DEFAULT_COLOMBIAN_VOICE,
  XTTS_TIMEOUT_MS,
};