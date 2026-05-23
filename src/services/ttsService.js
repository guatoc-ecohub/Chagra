/**
 * ttsService.js — Text-to-Speech con Kokoro TTS neuronal + fallback Web Speech API.
 *
 * SpeakKokoro llama a /api/kokoro/tts (Kokoro-82M ONNX TTS local).
 * Si Kokoro no está disponible, fallback transparente a window.speechSynthesis.
 */

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
  const { voice = 'ef_dora', format = 'opus', lang = 'es' } = options;

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
};