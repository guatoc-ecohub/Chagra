/**
 * ttsService.js — Text-to-Speech usando Web Speech API.
 *
 * Proporciona síntesis de voz para las respuestas del agente IA.
 * Usa la API nativa del navegador (speechSynthesis).
 */

let voices = [];
let voicesLoaded = false;

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
}

export function pause() {
  if (window.speechSynthesis) {
    window.speechSynthesis.pause();
  }
}

export function resume() {
  if (window.speechSynthesis) {
    window.speechSynthesis.resume();
  }
}

export function isSupported() {
  return !!window.speechSynthesis;
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
  stop,
  pause,
  resume,
  isSpeaking,
  isPaused,
  getVoices,
  getSpanishVoice,
  init,
};