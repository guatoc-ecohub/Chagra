// ── audio.js — sonido sintetizado con WebAudio (sin assets) ─────────────────
// Motor continuo (dos osciladores a través de lowpass, pitch por velocidad),
// chirrido de derrape (ruido bandpass) y SFX one-shot. Mismo patrón que el de
// La Milpa: `initAudio()` desde un gesto del usuario, `sfx(nombre)` para
// eventos, `actualizarMotor(s, dt)` llamado cada frame.

let ctx = null;
let master = null;
let muted = false;

let motor = null;      // osciladores del motor
let skid = null;       // ruido de derrape

export function initAudio() {
  if (!ctx) {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    ctx = new AC();
    master = ctx.createGain();
    master.gain.value = 0.45;
    master.connect(ctx.destination);
    construirMotor();
  }
  if (ctx.state === 'suspended') ctx.resume();
}

function construirMotor() {
  const o1 = ctx.createOscillator();
  o1.type = 'sawtooth';
  o1.frequency.value = 60;
  const o2 = ctx.createOscillator();
  o2.type = 'triangle';
  o2.frequency.value = 120;
  const lp = ctx.createBiquadFilter();
  lp.type = 'lowpass';
  lp.frequency.value = 500;
  lp.Q.value = 1.2;
  const g = ctx.createGain();
  g.gain.value = 0;
  o1.connect(lp); o2.connect(lp); lp.connect(g); g.connect(master);
  o1.start(); o2.start();
  motor = { o1, o2, lp, g, freq: 60 };

  // chirrido de derrape
  const buf = ctx.createBuffer(1, ctx.sampleRate * 0.5, ctx.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  const src = ctx.createBufferSource();
  src.buffer = buf;
  src.loop = true;
  const bp = ctx.createBiquadFilter();
  bp.type = 'bandpass';
  bp.frequency.value = 2100;
  bp.Q.value = 0.9;
  const sg = ctx.createGain();
  sg.gain.value = 0;
  src.connect(bp); bp.connect(sg); sg.connect(master);
  src.start();
  skid = { bp, g: sg, on: 0 };
}

export function setMuted(m) {
  muted = m;
  if (master) master.gain.value = m ? 0 : 0.45;
}
export function isMuted() { return muted; }
export function toggleMute() { setMuted(!muted); return muted; }

function tone(type, f0, t0, dur, peak, slideTo) {
  if (!ctx || muted) return;
  const o = ctx.createOscillator();
  const g = ctx.createGain();
  o.type = type;
  o.frequency.setValueAtTime(Math.max(20, f0), t0);
  if (slideTo) o.frequency.exponentialRampToValueAtTime(Math.max(20, slideTo), t0 + dur);
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.linearRampToValueAtTime(peak, t0 + 0.008);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  o.connect(g); g.connect(master);
  o.start(t0); o.stop(t0 + dur + 0.05);
}

function noise(t0, dur, peak, freq, q) {
  if (!ctx || muted) return;
  const len = Math.max(1, Math.floor(ctx.sampleRate * dur));
  const buf = ctx.createBuffer(1, len, ctx.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
  const src = ctx.createBufferSource();
  src.buffer = buf;
  const filt = ctx.createBiquadFilter();
  filt.type = 'bandpass';
  filt.frequency.value = freq;
  filt.Q.value = q || 0.8;
  const g = ctx.createGain();
  g.gain.setValueAtTime(peak, t0);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  src.connect(filt); filt.connect(g); g.connect(master);
  src.start(t0); src.stop(t0 + dur + 0.05);
}

export function actualizarMotor(s, dt, e) {
  if (!ctx || muted || !motor) return;
  const t = ctx.currentTime;
  const vel = Math.abs(s.vel);
  const id = s.vehId || '';
  let baseFreq = 50;
  let freqMul = 3.4;
  let lpBase = 280;
  let gainBase = 0.028;
  let gainVel = 0.10;
  let gainGas = 0.025;
  let turboBoost = 0.05;
  let o1Type = 'sawtooth';
  let o2Type = 'triangle';
  if (id === 'suv') {
    baseFreq = 92;
    freqMul = 5.0;
    lpBase = 900;
    gainBase = 0.015;
    gainVel = 0.055;
    gainGas = 0.012;
    turboBoost = 0.02;
    o1Type = 'triangle';
    o2Type = 'sine';
  } else if (id === 'carretilla') {
    baseFreq = 28;
    freqMul = 1.9;
    lpBase = 170;
    gainBase = 0.012;
    gainVel = 0.03;
    gainGas = 0.0;
    turboBoost = 0.0;
    o1Type = 'square';
    o2Type = 'triangle';
  } else if (id === 'coupe') {
    baseFreq = 58;
    freqMul = 4.1;
    lpBase = 320;
    gainBase = 0.03;
    gainVel = 0.11;
    gainGas = 0.03;
    turboBoost = 0.07;
    o1Type = 'sawtooth';
    o2Type = 'sawtooth';
  }
  const turboPitch = s.turbo ? (1 + s.turbo.nivel * 0.14) : 1;
  const freq = Math.max(26, (baseFreq + vel * freqMul) * turboPitch);
  const tc = 0.09;
  motor.o1.type = o1Type;
  motor.o2.type = o2Type;
  motor.o1.frequency.setTargetAtTime(freq, t, tc);
  motor.o2.frequency.setTargetAtTime(freq * 2, t, tc);
  motor.lp.frequency.setTargetAtTime(lpBase + vel * 22 + (s.turbo ? 900 : 0), t, tc);
  const gas = e.gas ? 1 : 0;
  const target = gainBase + (vel / 32) * gainVel + gas * gainGas + (s.turbo ? turboBoost : 0);
  motor.g.gain.setTargetAtTime(target, t, 0.12);

  // chirrido de derrape
  if (skid) {
    const on = s.drift.act ? 1 : 0;
    skid.g.gain.setTargetAtTime(on * 0.16, t, on ? 0.02 : 0.06);
    skid.bp.frequency.setTargetAtTime(1900 + (s.drift.carga ?? 0) * 900, t, 0.05);
  }
}

export function sfx(name, arg = 1) {
  if (!ctx || muted) return;
  const t = ctx.currentTime;
  switch (name) {
    // ── choque: golpe seco + "boing" de dibujo animado ──────────────────────
    // El ruido y el thud son el fierro; el glissando descendente de onda
    // cuadrada es el chiste. Sin el boing el impacto suena a simulador; con él
    // suena a caricatura, que es de lo que se trata.
    case 'choque': {
      const m = Math.max(0.15, Math.min(1.35, arg));
      noise(t, 0.09 + m * 0.1, 0.22 + m * 0.3, 180 + m * 260, 1.1);
      tone('sine', 120 - m * 30, t, 0.14 + m * 0.1, 0.16 + m * 0.16, 48);
      if (m > 0.45) {
        tone('square', 620 + m * 240, t + 0.02, 0.2 + m * 0.14, 0.05 + m * 0.05, 130);
        tone('triangle', 330, t + 0.03, 0.16, 0.05, 110);
      }
      break;
    }
    case 'roce':
      noise(t, 0.1, 0.1 + Math.min(0.12, arg * 0.14), 2600, 2.2);
      break;
    case 'driftCharge': // sube de nivel el turbo
      tone('square', 440, t, 0.07, 0.1, 660);
      break;
    case 'turbo':
      noise(t, 0.5, 0.3, 1600, 0.8);
      tone('sine', 180, t, 0.45, 0.22, 620);
      break;
    case 'power': {
      const m = Math.max(0.7, Math.min(1.4, arg));
      tone('triangle', 260 * m, t, 0.16, 0.12, 520 * m);
      tone('square', 760 * m, t + 0.045, 0.12, 0.055, 340 * m);
      noise(t, 0.16, 0.07, 1200 + m * 500, 1.1);
      break;
    }
    case 'land':
      noise(t, 0.12, 0.3, 220, 1.2);
      tone('sine', 130, t, 0.1, 0.18, 70);
      break;
    case 'lapa': // vuelta completa
      tone('triangle', 523, t, 0.12, 0.14);
      tone('triangle', 659, t + 0.09, 0.14, 0.14);
      tone('triangle', 784, t + 0.18, 0.2, 0.16);
      break;
    case 'respawn':
      tone('sine', 660, t, 0.1, 0.12);
      tone('sine', 880, t + 0.08, 0.14, 0.12);
      tone('sine', 1100, t + 0.16, 0.2, 0.1);
      break;
    case 'rescate':
      tone('square', 180, t, 0.16, 0.08, 95);
      tone('triangle', 392, t + 0.08, 0.16, 0.12, 784);
      tone('triangle', 1046, t + 0.18, 0.2, 0.1, 660);
      break;
    case 'count':
      tone('triangle', 392, t, 0.12, 0.16);
      break;
    case 'go':
      [523, 784].forEach((f, i) => tone('triangle', f, t + i * 0.08, 0.18, 0.16));
      noise(t, 0.25, 0.12, 2000, 0.8);
      break;
    case 'fin': {
      const fan = [392, 523, 659, 784, 1046];
      fan.forEach((f, i) => tone('triangle', f, t + i * 0.1, 0.24, 0.18));
      noise(t, 0.8, 0.1, 3000, 0.6);
      break;
    }
    case 'ui':
      tone('triangle', 520, t, 0.05, 0.1, 560);
      break;
  }
}
