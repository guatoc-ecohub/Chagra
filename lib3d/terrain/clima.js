/**
 * Low-cost weather state machine distilled from red-sands Weather.js.
 * It produces a shared environment contract for fog, rain, audio and flora.
 * Volumetric raymarching is intentionally outside this integration budget.
 */

const TRANSITIONS = Object.freeze({
  clear: ['fair', 'fog'],
  fair: ['clear', 'overcast', 'fog'],
  overcast: ['fair', 'rain'],
  rain: ['overcast', 'storm', 'fog'],
  storm: ['rain', 'overcast'],
  fog: ['fair', 'rain'],
});

function hash(seed) {
  let value = seed >>> 0;
  return () => {
    value = Math.imul(value ^ (value >>> 16), 0x45d9f3b);
    value = Math.imul(value ^ (value >>> 16), 0x45d9f3b);
    return ((value ^ (value >>> 16)) >>> 0) / 4294967296;
  };
}

function envFor(state, phase, severity) {
  const rain = state === 'rain' ? severity : state === 'storm' ? Math.min(1, severity * 1.2) : 0;
  const fog = state === 'fog' ? severity * 0.86 : state === 'storm' ? 0.18 : Math.max(0, severity - 0.7) * 0.25;
  return {
    state,
    rainIntensity: rain,
    fogDensity: fog,
    wetness: Math.min(1, rain * 0.75),
    puddles: Math.min(1, rain * 0.55),
    sunAttenuation: state === 'storm' ? 0.42 : state === 'overcast' ? 0.72 : 1 - fog * 0.18,
    windVector: { x: Math.cos(phase) * 0.7, z: Math.sin(phase) * 0.7 },
    windGust: 0.35 + severity * 0.65,
    windPhase: phase,
  };
}

export function crearClimaVolumetrico({ estadoInicial = 'fair', seed = 1, duracionMin = 60 } = {}) {
  let state = TRANSITIONS[estadoInicial] ? estadoInicial : 'fair';
  let elapsed = 0;
  let severity = 0.45;
  let phase = 0;
  const random = hash(seed);
  const env = envFor(state, phase, severity);

  const apply = (next) => {
    state = TRANSITIONS[state].includes(next) ? next : state;
    elapsed = 0;
    severity = 0.25 + random() * 0.7;
  };

  return {
    get env() { return env; },
    get state() { return state; },
    setWeather(next) { apply(next); return this.tick(0); },
    tick(dt = 0) {
      const delta = Math.max(0, Number(dt) || 0);
      elapsed += delta;
      phase += delta * (0.035 + severity * 0.025);
      if (elapsed >= duracionMin && random() > 0.35) {
        const choices = TRANSITIONS[state];
        apply(choices[Math.floor(random() * choices.length)]);
      }
      Object.assign(env, envFor(state, phase, severity));
      return env;
    },
  };
}

export { TRANSITIONS as CLIMA_TRANSICIONES };
