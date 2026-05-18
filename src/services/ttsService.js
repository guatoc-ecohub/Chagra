/**
 * ttsService.js — Text-to-Speech con Kokoro TTS neuronal + fallback Web Speech API.
 *
 * SpeakKokoro llama a /api/kokoro/tts (Kokoro-82M ONNX TTS local).
 * Si Kokoro no está disponible, fallback transparente a window.speechSynthesis.
 */

let voices = [];
let voicesLoaded = false;
let kokoroAvailable = null;
let currentKokoroAudio = null;
let currentKokoroUrl = null;

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

  const utterance = new SpeechSynthesisUtterance(text);

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

  try {
    const res = await fetch('/api/kokoro/tts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, voice, format, lang }),
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
  init,
};