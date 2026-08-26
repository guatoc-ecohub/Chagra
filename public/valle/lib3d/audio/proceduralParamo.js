// Audio procedural del páramo — WebAudio puro, sin .wav ni Math.random().
// La cadena queda dormida hasta un gesto del usuario: el gate visual y las
// visitas que no habilitan audio no pagan contexto, buffers ni nodos.

const TAU = Math.PI * 2;
const SAMPLE_RATE_HINT = 44100;
const SPEED_OF_SOUND = 343;
const REFLECTOR_DIRECTIONS = 8;
const REFLECTOR_STEP = 45;
const REFLECTOR_MAX_DISTANCE = 760;

function rngSembrado(seed) {
  let state = seed >>> 0;
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 4294967296;
  };
}

function ruidoBuffer(ctx, seconds, seed, color = 'pink') {
  const length = Math.max(1, Math.floor(ctx.sampleRate * seconds));
  const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
  const out = buffer.getChannelData(0);
  const rand = rngSembrado(seed);
  let pinkB0 = 0, pinkB1 = 0, pinkB2 = 0, brown = 0;
  for (let i = 0; i < length; i++) {
    const white = rand() * 2 - 1;
    if (color === 'brown') {
      brown = brown * 0.996 + white * 0.055;
      out[i] = brown * 2.8;
    } else if (color === 'pink') {
      // Filtro de Paul Kellet: pendiente suave 1/f, barato y estable.
      pinkB0 = 0.99765 * pinkB0 + white * 0.0990460;
      pinkB1 = 0.96300 * pinkB1 + white * 0.2965164;
      pinkB2 = 0.57000 * pinkB2 + white * 1.0526913;
      out[i] = (pinkB0 + pinkB1 + pinkB2 + white * 0.1848) * 0.22;
    } else {
      out[i] = white;
    }
  }
  return buffer;
}

function impulsoReverb(ctx, seconds = 1.8, seed = 20260811) {
  const length = Math.floor(ctx.sampleRate * seconds);
  const buffer = ctx.createBuffer(2, length, ctx.sampleRate);
  const rand = rngSembrado(seed);
  const left = buffer.getChannelData(0);
  const right = buffer.getChannelData(1);
  const early = [0.031, 0.067, 0.113, 0.181];
  let energy = 0;
  for (let i = 0; i < length; i++) {
    const t = i / ctx.sampleRate;
    const diffuse = (rand() * 2 - 1) * Math.exp(-t * 2.55);
    const hfLoss = 1 - 0.68 * Math.min(1, t / seconds);
    let reflection = 0;
    for (let j = 0; j < early.length; j++) {
      const at = Math.floor(early[j] * ctx.sampleRate);
      const distance = Math.abs(i - at);
      if (distance < 5) reflection += (1 - distance / 5) * (0.42 - j * 0.07);
    }
    left[i] = (diffuse + reflection) * hfLoss;
    right[i] = (diffuse * 0.91 + reflection * 0.83) * hfLoss;
    energy += left[i] * left[i] + right[i] * right[i];
  }
  // Normalización por energía, no por pico: evita una cola caliente al cambiar
  // la semilla o la duración.
  const normal = 0.42 / Math.sqrt(Math.max(energy / (length * 2), 1e-8));
  for (let i = 0; i < length; i++) {
    left[i] *= normal;
    right[i] *= normal;
  }
  return buffer;
}

function posicionDe(valor) {
  if (!valor) return { x: 0, y: 0, z: 0 };
  if (typeof valor === 'function') return posicionDe(valor());
  return { x: Number(valor.x) || 0, y: Number(valor.y) || 0, z: Number(valor.z) || 0 };
}

function buscarReflectores(pos, alturaEn) {
  if (typeof alturaEn !== 'function') return [];
  const reflectores = [];
  for (let i = 0; i < REFLECTOR_DIRECTIONS; i++) {
    const angle = (i / REFLECTOR_DIRECTIONS) * TAU;
    const dx = Math.cos(angle), dz = Math.sin(angle);
    for (let d = REFLECTOR_STEP; d <= REFLECTOR_MAX_DISTANCE; d += REFLECTOR_STEP) {
      const x = pos.x + dx * d;
      const z = pos.z + dz * d;
      const suelo = Number(alturaEn(x, z));
      if (!Number.isFinite(suelo)) break;
      if (suelo > pos.y + 8 + d * 0.018) {
        reflectores.push({ distancia: d, direccion: i });
        break;
      }
    }
  }
  return reflectores.sort((a, b) => a.distancia - b.distancia).slice(0, 3);
}

function crearRafaga(ctx, seed) {
  const length = Math.floor(ctx.sampleRate * 0.12);
  const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
  const out = buffer.getChannelData(0);
  const rand = rngSembrado(seed);
  for (let i = 0; i < length; i++) {
    const t = i / length;
    const env = Math.pow(1 - t, 2.4);
    out[i] = (rand() * 2 - 1) * env;
  }
  return buffer;
}

export function crearAudioParamo({ alturaEn, posicion = () => ({ x: 0, y: 0, z: 0 }), seed = 20260811 } = {}) {
  let audio = null;
  let viento = null;
  let activo = true;
  let ultimaBusqueda = [];

  function asegurar() {
    if (audio) return audio;
    const AC = globalThis.AudioContext || globalThis.webkitAudioContext;
    if (!AC) return null;
    let ctx;
    try {
      ctx = new AC({ latencyHint: 'interactive' });
    } catch {
      return null;
    }
    const master = ctx.createGain();
    master.gain.value = 0.62;
    master.connect(ctx.destination);

    const conv = ctx.createConvolver();
    conv.buffer = impulsoReverb(ctx);
    const wet = ctx.createGain();
    wet.gain.value = 0.055;
    conv.connect(wet).connect(master);

    const source = ctx.createBufferSource();
    source.buffer = ruidoBuffer(ctx, 3.0, seed, 'brown');
    source.loop = true;
    const high = ctx.createBiquadFilter();
    high.type = 'highpass';
    high.frequency.value = 72;
    const low = ctx.createBiquadFilter();
    low.type = 'lowpass';
    low.frequency.value = 1500;
    const windGain = ctx.createGain();
    windGain.gain.value = 0.035;
    source.connect(high).connect(low).connect(windGain);
    windGain.connect(master);
    windGain.connect(conv);
    source.start();
    viento = { source, windGain, high, low };
    audio = { ctx, master, conv };
    return audio;
  }

  async function despertar() {
    const state = asegurar();
    if (!state) return false;
    if (state.ctx.state !== 'running') await state.ctx.resume();
    return state.ctx.state === 'running';
  }

  function emitirEco({ nivel = 0.2 } = {}) {
    const state = asegurar();
    if (!state || !activo || state.ctx.state !== 'running') return { emitido: false, motivo: 'audio-dormido' };
    const ctx = state.ctx;
    const pos = posicionDe(posicion);
    ultimaBusqueda = buscarReflectores(pos, alturaEn);
    const burst = ctx.createBufferSource();
    burst.buffer = crearRafaga(ctx, seed + 17);
    const band = ctx.createBiquadFilter();
    band.type = 'bandpass';
    band.frequency.value = 780;
    band.Q.value = 0.65;
    const envelope = ctx.createGain();
    const now = ctx.currentTime;
    envelope.gain.setValueAtTime(0.0001, now);
    envelope.gain.exponentialRampToValueAtTime(Math.max(0.0001, nivel), now + 0.006);
    envelope.gain.exponentialRampToValueAtTime(0.0001, now + 0.12);
    burst.connect(band).connect(envelope).connect(state.master);
    envelope.connect(state.conv);
    burst.start(now);
    burst.stop(now + 0.13);

    const eco = [];
    for (const reflector of ultimaBusqueda) {
      const delay = Math.min(4.8, (2 * reflector.distancia) / SPEED_OF_SOUND);
      const tap = ctx.createDelay(5);
      const tapGain = ctx.createGain();
      const absorption = 1 / (1 + reflector.distancia / 150);
      tap.delayTime.value = delay;
      tapGain.gain.value = nivel * absorption * 0.52;
      band.connect(tap).connect(tapGain).connect(state.master);
      eco.push({ distancia: reflector.distancia, delay });
    }
    return { emitido: true, reflectores: eco };
  }

  function estado() {
    return {
      disponible: !!(globalThis.AudioContext || globalThis.webkitAudioContext),
      estado: audio?.ctx.state || 'dormido',
      reflectores: ultimaBusqueda.map((x) => x.distancia),
      viento: !!viento,
      activo,
    };
  }

  function suspender() {
    return audio?.ctx.suspend();
  }

  return {
    despertar,
    emitirEco,
    suspender,
    estado,
    setActivo(valor) { activo = !!valor; if (viento) viento.windGain.gain.value = activo ? 0.035 : 0; },
  };
}

export const AUDIO_PARAMO_CONSTANTES = Object.freeze({
  sampleRateHint: SAMPLE_RATE_HINT,
  speedOfSound: SPEED_OF_SOUND,
  reflectorDirections: REFLECTOR_DIRECTIONS,
  reflectorStep: REFLECTOR_STEP,
  reflectorMaxDistance: REFLECTOR_MAX_DISTANCE,
});
