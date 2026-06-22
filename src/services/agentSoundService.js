/**
 * agentSoundService — sound design sutil para Chagra IA.
 *
 * Operator decisión 2026-05-18: sound cues mejoran sensación de agente vivo.
 * Configurable on/off, default ON con preferencia respetada (localStorage).
 * Web Audio API tonos sintetizados breves, no agresivos.
 *
 * Cues:
 * - `chime` — agente terminó de responder (woop ascendente cyan)
 * - `listen` — agente está escuchando (pop suave)
 * - `start` — agente arranca a pensar (clic+breath)
 * - `error` — falla LLM o cancel (tono neutro descendente)
 * - `cancel` — usuario canceló inferencia
 */

const PREF_KEY = 'chagra:agent:sound';
let audioCtx = null;

function isEnabled() {
  try {
    return localStorage.getItem(PREF_KEY) !== '0';
  } catch {
    return true;
  }
}

export function setSoundEnabled(enabled) {
  try {
    localStorage.setItem(PREF_KEY, enabled ? '1' : '0');
  } catch { /* noop */ }
}

export function isSoundEnabled() {
  return isEnabled();
}

function getCtx() {
  if (!audioCtx) {
    try {
      const Ctx = window.AudioContext || window.webkitAudioContext;
      if (!Ctx) return null;
      audioCtx = new Ctx();
    } catch {
      return null;
    }
  }
  if (audioCtx.state === 'suspended') {
    audioCtx.resume().catch(() => {});
  }
  return audioCtx;
}

function tone({ freq = 440, duration = 0.12, type = 'sine', volume = 0.06, attack = 0.005, release = 0.05, freqEnd = null }) {
  if (!isEnabled()) return;
  const ctx = getCtx();
  if (!ctx) return;
  const now = ctx.currentTime;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, now);
  if (freqEnd != null) {
    osc.frequency.linearRampToValueAtTime(freqEnd, now + duration);
  }
  gain.gain.setValueAtTime(0, now);
  gain.gain.linearRampToValueAtTime(volume, now + attack);
  gain.gain.linearRampToValueAtTime(0, now + duration - release > 0 ? duration - release : duration);
  osc.connect(gain).connect(ctx.destination);
  osc.start(now);
  osc.stop(now + duration + 0.02);
}

export const agentSounds = {
  chime() {
    tone({ freq: 660, freqEnd: 880, duration: 0.22, type: 'sine', volume: 0.07 });
    setTimeout(() => tone({ freq: 880, duration: 0.16, type: 'sine', volume: 0.05 }), 70);
  },
  listen() {
    tone({ freq: 440, duration: 0.08, type: 'triangle', volume: 0.05 });
  },
  start() {
    tone({ freq: 540, duration: 0.12, type: 'sine', volume: 0.05, freqEnd: 660 });
  },
  error() {
    tone({ freq: 380, freqEnd: 280, duration: 0.25, type: 'sine', volume: 0.06 });
  },
  cancel() {
    tone({ freq: 360, duration: 0.15, type: 'triangle', volume: 0.05 });
  },
  // ── Cues del minijuego Doom de la finca ──
  /** Plaga controlada con el benefico correcto (arpegio ascendente). */
  acierto() {
    tone({ freq: 523, duration: 0.10, type: 'triangle', volume: 0.06 });
    setTimeout(() => tone({ freq: 659, duration: 0.10, type: 'triangle', volume: 0.06 }), 60);
    setTimeout(() => tone({ freq: 784, duration: 0.14, type: 'triangle', volume: 0.06 }), 120);
  },
  /** Benefico equivocado (buzz corto descendente, no agresivo). */
  fallo() {
    tone({ freq: 220, freqEnd: 160, duration: 0.18, type: 'square', volume: 0.04 });
  },
  /** Cambio de benefico / selector (pop suave). */
  seleccion() {
    tone({ freq: 600, duration: 0.06, type: 'triangle', volume: 0.04 });
  },
  /** Fanfarria de victoria. */
  victoria() {
    [523, 659, 784, 1046].forEach((f, i) => {
      setTimeout(() => tone({ freq: f, duration: 0.18, type: 'triangle', volume: 0.06 }), i * 110);
    });
  },
  /** Derrota (tono grave descendente). */
  derrota() {
    tone({ freq: 330, freqEnd: 160, duration: 0.5, type: 'sine', volume: 0.06 });
  },
};
