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
// Spec S3 (2026-07-11): sonido ambiental 0-KB de los mundos (WebAudio
// sintetizado, sin assets). Tri-estado: 'off' (default — el sonido es
// opt-in) | 'suave' (ambiente muy tenue) | 'on' (ambiente presente).
const STORAGE_KEY_SONIDO = 'chagra:prefs:sonido';
const SONIDO_MODES = ['off', 'suave', 'on'];
// FASE 0 del plan game-dev 3D (2026-07-11): la entrada al VALLE 3D desde el
// home real. Default false (conservador): el home 2D queda idéntico; quien
// prende el flag en Perfil ve la banda de entrada en "Los mundos de su finca"
// — y solo si su equipo aguanta 3D (device-tier alto/medio, deviceTier.js).
const STORAGE_KEY_VALLE3D = 'chagra:prefs:valle3d';
// Migración de salida: versiones anteriores podían dejar este flag apagado en
// localStorage. Para destrabar la experiencia 3D en el build actual, la primera
// carga posterior a esta migración lo vuelve a encender una sola vez y después
// respeta el valor elegido por el usuario.
const STORAGE_KEY_VALLE3D_MIGRATED = 'chagra:prefs:valle3d:migrated-v1';
// Avatar del USUARIO (2026-07-13): el animal de la chagra que la persona
// elige como su avatar (slug del registro CREATURES de src/visual/creatures).
// Default: la abeja angelita. El store solo persiste el slug como string —
// la resolución slug→componente vive en useAvatarCreature (hooks), para no
// arrastrar los SVG de fauna a todo consumidor del store.
const STORAGE_KEY_AVATAR_CREATURE = 'chagra:prefs:avatar-creature';
export const AVATAR_CREATURE_DEFAULT = 'abeja-angelita';

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

function loadValle3d() {
  try {
    const migrated = localStorage.getItem(STORAGE_KEY_VALLE3D_MIGRATED) === '1';
    if (!migrated) {
      localStorage.setItem(STORAGE_KEY_VALLE3D_MIGRATED, '1');
      localStorage.setItem(STORAGE_KEY_VALLE3D, JSON.stringify(true));
      return true;
    }
  } catch (_) {
    return true;
  }
  return load(STORAGE_KEY_VALLE3D, true);
}

const usePrefsStore = create((set, _get) => ({
  voiceRegion: load(STORAGE_KEY_VOICE_REGION, 'auto'),
  voiceRegionIntensity: load(STORAGE_KEY_VOICE_INTENSITY, 1),
  ttsEnabled: load(STORAGE_KEY_TTS_ENABLED, true),
  showSourceBadges: load(STORAGE_KEY_SOURCE_BADGES, true),
  haptics: load(STORAGE_KEY_HAPTICS, 'auto'),
  sonido: load(STORAGE_KEY_SONIDO, 'off'),
  valle3d: loadValle3d(),
  avatarCreatureId: load(STORAGE_KEY_AVATAR_CREATURE, AVATAR_CREATURE_DEFAULT),

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

  setSonido: (mode) => {
    const valid = SONIDO_MODES.includes(mode) ? mode : 'off';
    save(STORAGE_KEY_SONIDO, valid);
    set({ sonido: valid });
  },

  setAvatarCreatureId: (id) => {
    const slug = typeof id === 'string' && id.trim() ? id.trim() : AVATAR_CREATURE_DEFAULT;
    save(STORAGE_KEY_AVATAR_CREATURE, slug);
    set({ avatarCreatureId: slug });
  },

  setValle3d: (flag) => {
    const bool = Boolean(flag);
    save(STORAGE_KEY_VALLE3D, bool);
    set({ valle3d: bool });
  },
}));

export default usePrefsStore;
