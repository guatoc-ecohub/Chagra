/**
 * ttsService.js — Text-to-Speech con Kokoro TTS neuronal + fallback Web Speech API.
 *
 * SpeakKokoro llama a /api/kokoro/tts (Kokoro-82M ONNX TTS local).
 * Si Kokoro no está disponible, fallback transparente a window.speechSynthesis.
 */

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
    };

    await audio.play();
    return audio;
  } catch (e) {
    console.warn('[TTS] Kokoro failed, fallback to Web Speech:', e.message);
    speak(text, options);
    return null;
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
  stop,
  pause,
  resume,
  isSpeaking,
  isPaused,
  isSupported,
  isKokoroAvailable,
  getVoices,
  getSpanishVoice,
  replayLast,
  getLastSpoken,
  init,
  // Task #124: preferencias persistidas de voz Kokoro.
  getPreferredVoice,
  setPreferredVoice,
  getPreferredRate,
  setPreferredRate,
  KOKORO_VOICES,
  DEFAULT_KOKORO_VOICE,
};