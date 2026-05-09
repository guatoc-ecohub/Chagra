import { create } from 'zustand';

const STORAGE_KEY_VOICE_REGION = 'chagra:prefs:voice-region';
const STORAGE_KEY_VOICE_INTENSITY = 'chagra:prefs:voice-intensity';

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

  setVoiceRegion: (region) => {
    save(STORAGE_KEY_VOICE_REGION, region);
    set({ voiceRegion: region });
  },

  setVoiceRegionIntensity: (intensity) => {
    save(STORAGE_KEY_VOICE_INTENSITY, intensity);
    set({ voiceRegionIntensity: intensity });
  },
}));

export default usePrefsStore;