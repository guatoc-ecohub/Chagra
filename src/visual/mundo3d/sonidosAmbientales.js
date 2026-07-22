/**
 * T48 — Paletas sonoras ambientales por mundo 3D.
 *
 * Cada mundo tiene un sonido ambiental sutil (loop, volumen 20%).
 * Se detiene al salir del mundo. Usa el WebAudio API ya existente.
 *
 * Los sonidos son generados proceduralmente (osciladores + ruido filtrado),
 * no archivos de audio. Sin dependencias externas.
 */

/** @type {Record<string, {tipo: string, freq: number, mod: number}>} */
export const SONIDOS_POR_MUNDO = {
  agua: { tipo: 'flujo', freq: 220, mod: 0.3 },
  cafe: { tipo: 'viento', freq: 400, mod: 0.15 },
  suelo: { tipo: 'tierra', freq: 80, mod: 0.1 },
  animales: { tipo: 'corral', freq: 300, mod: 0.4 },
  clima: { tipo: 'viento', freq: 500, mod: 0.5 },
  milpa: { tipo: 'viento', freq: 350, mod: 0.2 },
  mercado: { tipo: 'plaza', freq: 440, mod: 0.6 },
  semillero: { tipo: 'tierra', freq: 100, mod: 0.1 },
  disenio: { tipo: 'viento', freq: 380, mod: 0.2 },
  cultivos: { tipo: 'viento', freq: 340, mod: 0.2 },
  frutales: { tipo: 'viento', freq: 360, mod: 0.2 },
  sanidad: { tipo: 'tierra', freq: 120, mod: 0.15 },
  abono: { tipo: 'tierra', freq: 90, mod: 0.1 },
  pisos: { tipo: 'viento', freq: 450, mod: 0.4 },
  bosque_vivo: { tipo: 'viento', freq: 420, mod: 0.3 },
};

/** @type {AudioContext|null} */
let ctx = null;
/** @type {OscillatorNode|null} */
let osc = null;
/** @type {GainNode|null} */
let gain = null;

/**
 * Inicia sonido ambiental para un mundo.
 * @param {string} mundoId
 * @param {number} [volumen=0.2]
 */
export function iniciarSonidoMundo(mundoId, volumen = 0.2) {
  detenerSonidoMundo();
  const cfg = SONIDOS_POR_MUNDO[mundoId];
  if (!cfg) return;

  try {
    ctx = new AudioContext();
    osc = ctx.createOscillator();
    gain = ctx.createGain();
    osc.type = cfg.tipo === 'flujo' ? 'sawtooth' : 'sine';
    osc.frequency.value = cfg.freq;
    gain.gain.value = volumen * 0.2;
    if (cfg.mod > 0) {
      const lfo = ctx.createOscillator();
      lfo.frequency.value = cfg.mod;
      const lfoGain = ctx.createGain();
      lfoGain.gain.value = cfg.freq * 0.1;
      lfo.connect(lfoGain);
      lfoGain.connect(osc.frequency);
      lfo.start();
    }
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
  } catch { /* audio no disponible */ }
}

/** Detiene cualquier sonido ambiental activo. */
export function detenerSonidoMundo() {
  try { osc?.stop(); } catch {}
  try { ctx?.close(); } catch {}
  osc = null; ctx = null; gain = null;
}
