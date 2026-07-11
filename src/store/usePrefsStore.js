import { create } from 'zustand';

const STORAGE_KEY_VOICE_REGION = 'chagra:prefs:voice-region';
const STORAGE_KEY_VOICE_INTENSITY = 'chagra:prefs:voice-intensity';
// Task #122 (2026-05-23): toggle global TTS persistido. Default ON porque
// el avatar colibrí es voz primaria del agente; el operador puede
// silenciarlo via doble-click en el avatar header o en Perfil/Settings.
const STORAGE_KEY_TTS_ENABLED = 'chagra:prefs:tts-enabled';
// 2026-05-23: badge de "fuente" en cada respuesta del agente (verificado
// catálogo vs generativo). Default ON cumple la promesa visual del Manual
// (HelpAgentSection): "respuestas con fondo verde son del catálogo
// verificado". Operadores en modo "expert" pueden ocultarlos para reducir
// ruido visual sin perder la información (queda en metadata del turn).
const STORAGE_KEY_SOURCE_BADGES = 'chagra:prefs:show-source-badges';
// DR-3D-HAPTICA (2026-07-11): vibración táctil del framework de mundos 3D.
// Tri-estado: 'auto' (default — vibra si hay soporte y no hay
// prefers-reduced-motion) | 'on' (siempre que haya soporte) | 'off' (nunca).
const STORAGE_KEY_HAPTICS = 'chagra:prefs:haptics';
const HAPTICS_MODES = ['auto', 'on', 'off'];

function load(key, fallback) {
  try {
    const v = localStorage.getItem(key);
    return v !== null ? JSON.parse(v) : fallback;
  } catch (_) {
    return fallback;
  }
}

function save(key, val) {
  try { localStorage.setItem(key, JSON.stringify(val)); } catch (_) { /* noop */ }
}

const usePrefsStore = create((set, _get) => ({
  voiceRegion: load(STORAGE_KEY_VOICE_REGION, 'auto'),
  voiceRegionIntensity: load(STORAGE_KEY_VOICE_INTENSITY, 1),
  ttsEnabled: load(STORAGE_KEY_TTS_ENABLED, true),
  showSourceBadges: load(STORAGE_KEY_SOURCE_BADGES, true),
  haptics: load(STORAGE_KEY_HAPTICS, 'auto'),

  setVoiceRegion: (region) => {
    save(STORAGE_KEY_VOICE_REGION, region);
    set({ voiceRegion: region });
  },

  setVoiceRegionIntensity: (intensity) => {
    save(STORAGE_KEY_VOICE_INTENSITY, intensity);
    set({ voiceRegionIntensity: intensity });
  },

  setTtsEnabled: (flag) => {
    const bool = Boolean(flag);
    save(STORAGE_KEY_TTS_ENABLED, bool);
    set({ ttsEnabled: bool });
  },

  setShowSourceBadges: (flag) => {
    const bool = Boolean(flag);
    save(STORAGE_KEY_SOURCE_BADGES, bool);
    set({ showSourceBadges: bool });
  },

  setHaptics: (mode) => {
    const valid = HAPTICS_MODES.includes(mode) ? mode : 'auto';
    save(STORAGE_KEY_HAPTICS, valid);
    set({ haptics: valid });
  },
}));

export default usePrefsStore;