// ===========================================================================
// La Milpa — efectos de sonido sintetizados con WebAudio (sin assets externos).
// ===========================================================================

let ctx = null;
let master = null;
let muted = false;

export function initAudio() {
  if (!ctx) {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    ctx = new AC();
    master = ctx.createGain();
    master.gain.value = 0.45;
    master.connect(ctx.destination);
  }
  if (ctx.state === 'suspended') ctx.resume();
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

const CHIME = [523.25, 659.25, 783.99, 1046.5]; // C E G C
const FANFARE = [392, 523.25, 659.25, 783.99, 1046.5];

export function sfx(name) {
  if (!ctx || muted) return;
  const t = ctx.currentTime;
  switch (name) {
    case 'move':
      tone('triangle', 340, t, 0.05, 0.12, 300);
      break;
    case 'rotate':
      tone('triangle', 420, t, 0.06, 0.12, 520);
      break;
    case 'softdrop':
      tone('sine', 220, t, 0.04, 0.06, 180);
      break;
    case 'drop':
      noise(t, 0.12, 0.4, 220, 1.2);
      tone('sine', 160, t, 0.1, 0.2, 90);
      break;
    case 'settle':
      noise(t, 0.09, 0.28, 180, 1.4);
      tone('sine', 140, t, 0.12, 0.16, 100);
      break;
    case 'compat': {
      const n = 1 + (Math.floor(Math.random() * 3));
      tone('triangle', CHIME[0], t, 0.14, 0.14);
      tone('triangle', CHIME[1], t + 0.07, 0.16, 0.13);
      if (n > 1) tone('triangle', CHIME[2], t + 0.14, 0.2, 0.12);
      break;
    }
    case 'revive':
      tone('sine', 660, t, 0.12, 0.12);
      tone('sine', 880, t + 0.08, 0.16, 0.12);
      tone('sine', 1320, t + 0.16, 0.2, 0.1);
      break;
    case 'antag':
      tone('sawtooth', 130, t, 0.22, 0.16, 90);
      tone('sawtooth', 98, t + 0.05, 0.26, 0.14, 70);
      noise(t, 0.16, 0.18, 300, 1.5);
      break;
    case 'milpa':
      FANFARE.forEach((f, i) => tone('triangle', f, t + i * 0.09, 0.22, 0.18));
      tone('triangle', 1568, t + 0.5, 0.4, 0.16);
      noise(t, 0.5, 0.08, 4000, 0.6);
      break;
    case 'row':
      tone('sine', 500, t, 0.18, 0.14, 900);
      tone('sine', 700, t + 0.08, 0.22, 0.12, 1200);
      noise(t, 0.18, 0.14, 1800, 1.1);
      break;
    case 'level':
      tone('triangle', 523, t, 0.1, 0.14);
      tone('triangle', 659, t + 0.09, 0.1, 0.14);
      tone('triangle', 784, t + 0.18, 0.16, 0.15);
      break;
    case 'over':
      [392, 330, 262, 196].forEach((f, i) => tone('triangle', f, t + i * 0.18, 0.3, 0.14));
      break;
    case 'start':
      [262, 392, 523].forEach((f, i) => tone('triangle', f, t + i * 0.07, 0.14, 0.14));
      break;
    case 'ui':
      tone('triangle', 520, t, 0.05, 0.1, 560);
      break;
    case 'error':
      tone('square', 160, t, 0.14, 0.12, 130);
      break;
  }
}
