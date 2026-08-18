import * as THREE from 'three';
import { CSS2DObject, CSS2DRenderer } from '../../lib3d/render/CSS2DRenderer.js';
import { texturaFollaje } from '../../lib3d/flora/FollajeMasa.js';

const GAME_QUERY = new URLSearchParams(location.search);
const AUTO_DEMO = GAME_QUERY.get('autostart') === '1' || GAME_QUERY.get('embedded') === '1';

// ?cara=lamina — la cara de Angelita sale RECORTADA de la lámina de referencia en
// vez de dibujarse con canvas. Va detrás de un parámetro porque son dos técnicas con
// fuertes distintos: la dibujada está calibrada para leerse a 40px (pupila chica,
// blanco dominante) y la lámina trae el detalle del dibujo original. Sin el
// parámetro no se pide siquiera la imagen, así que el juego por defecto no cambia.
//
// El png sale de la lámina de referencia por matting (entrada 'angelita-cara' de la
// herramienta de recorte): 96x114 px, la cabeza mide 94x104 y su centro geométrico
// cae en (47,57). Esos tres números son los que permiten montarla sobre la cabeza.
const CARA_PNG_W = 96, CARA_PNG_H = 114;
const CARA_CABEZA_ANCHO = 94;            // ancho de la cabeza DENTRO del png
const CARA_CENTRO = [47, 57];            // centro de la cabeza DENTRO del png
// La lámina sigue siendo OPT-IN (?cara=lamina) hasta que exista una base de
// verdad. La pasada del 2026-08-09 la puso por defecto apuntando a
// assets/angelita-cara-base.png, pero ese archivo nunca se escribió: el
// pipeline de inpaint dejó 4 candidatos y ninguno sirve (inpaint = no borró
// nada · transparente = agujeros crudos donde iban los ojos · rellena =
// parches marrones que no son piel · preview = composición de prueba). Con el
// default en lámina el juego pedía un 404 en cada carga y caía al modo
// dibujado igual, así que se publicaba el error sin ganar la lámina.
const CARA_LAMINA = GAME_QUERY.get('cara') === 'lamina';
const CARA_DIBUJADA = !CARA_LAMINA;
// escala relativa al círculo de cabeza del juego; ?caraEsc= para tantear sin editar
const CARA_ESC = Number(GAME_QUERY.get('caraEsc') || 1);
const caraImg = (() => {
  if (CARA_DIBUJADA) return null;
  const img = new Image();
  img.src = 'assets/angelita-cara-base.png';
  return img;
})();
const caraLista = () => !!caraImg && caraImg.complete && caraImg.naturalWidth > 0;

const TILE = 64;
const WORLD = {
  cols: 64,
  rows: 14,
  width: 64 * TILE,
  height: 14 * TILE,
};

const LEVEL = {
  nombre: 'Mundo 1 · Cálido · cafetal',
  piso: 'Cálido (cafetal)',
  meta: 'Salida al siguiente tramo',
  tileTypes: {
    EMPTY: 0,
    SOIL: 1,
    TOP: 2,
    PLATFORM: 3,
    ROOT: 4,
  },
  enemyName: 'Hypothenemus hampei',
  enemyCommon: 'Broca del café',
  powerUpName: 'Beauveria bassiana',
  seedTypes: ['maiz', 'frijol', 'calabaza', 'quinua', 'papa'],
};

const SEED_META = {
  maiz: { label: 'Maíz', color: '#f0c15d' },
  frijol: { label: 'Fríjol', color: '#c85a42' },
  calabaza: { label: 'Calabaza', color: '#d8a33c' },
  quinua: { label: 'Quinua', color: '#dcd7a4' },
  papa: { label: 'Papa nativa', color: '#b9b089' },
};

const ENEMY_DEFS = {
  broca: {
    label: 'Broca del café',
    short: 'la broca',
    scientific: 'Hypothenemus hampei',
    color: '#3b2b18',
    accent: '#d8c295',
    shape: 'beetle',
    movement: 'ground',
    stompSfx: 'broca',
  },
  cochinilla: {
    label: 'Cochinilla harinosa',
    short: 'la cochinilla',
    scientific: 'Planococcus citri',
    color: '#f0ecdc',
    accent: '#d8d3bd',
    shape: 'cotton',
    movement: 'slow',
    stompSfx: 'cochinilla',
  },
  minador: {
    label: 'Minador de la hoja',
    short: 'el minador',
    scientific: 'Leucoptera coffeella',
    color: '#cdd9d3',
    accent: '#f0f6ee',
    shape: 'moth',
    movement: 'zigzag',
    stompSfx: 'minador',
  },
  chinche: {
    label: 'Chinche patón',
    short: 'la chinche',
    scientific: 'Leptoglossus zonatus',
    color: '#7d5b3a',
    accent: '#e0c078',
    shape: 'stinkbug',
    movement: 'hopper',
    stompSfx: 'chinche',
  },
  cogollero: {
    label: 'Gusano cogollero',
    short: 'el cogollero',
    scientific: 'Spodoptera frugiperda',
    color: '#a9b05c',
    accent: '#e0d273',
    shape: 'caterpillar',
    movement: 'emerge',
    stompSfx: 'cogollero',
  },
};

// ── Dirección de arte (una sola mano) ───────────────────────────────────────
// Mundo = lámina naturalista ilustrada: masas de follaje densas (si se
// pueden contar las hojas está MAL), luz arriba / sombra abajo, tinta cálida,
// perspectiva aérea. Personajes = rubber-hose (mangueras, guantes, ojos de
// pastel, squash & stretch, línea que respira). El paisaje NUNCA es rubber-hose.
// Paleta AB: verde-dominante de cafetal cálido; cereza y amarillo solo acento.
const AB = {
  ink: '#2a1c10',
  inkSoft: 'rgba(42,28,16,.5)',
  paper: '#f6eccd',
  skyHi: '#a3d2dc',
  skyMid: '#cfe4c2',
  skyLo: '#efe9bd',
  sun: '#fdf3bd',
  ridgeFar: '#9cba90',
  ridgeMid: '#79a566',
  ridgeNear: '#548549',
  rowDark: 'rgba(34,72,38,.4)',
  rowNear: 'rgba(28,62,32,.5)',
  mist: 'rgba(244,246,228,.5)',
  leafDeep: '#1d4527',
  leafDark: '#28592f',
  leafMid: '#3a7239',
  leafLite: '#5f9c46',
  leafGlow: '#8cba57',
  leafSage: '#a9c48b',
  shadeDeep: '#203f22',
  shadeMid: '#38652f',
  shadeLite: '#7ea653',
  soilLite: '#7d5a36',
  soil: '#5f4227',
  soilDark: '#46301b',
  soilDeep: '#33220f',
  wood: '#8a6136',
  woodDark: '#5e3f22',
  woodLite: '#b08752',
  grassTop: '#7fb14e',
  grassEdge: '#4c7f38',
  cherry: '#c8402f',
  cherryDeep: '#93251c',
  ripe: '#e2a83c',
  bee: '#f0c25c',
  beeDark: '#c98f2f',
  beeStripe: '#4a3216',
  glove: '#fdf8ea',
  wing: 'rgba(230,245,247,.78)',
  // sistema de luz único: sol arriba-derecha → brillo cálido arriba-derecha,
  // sombra fría abajo-izquierda, en TODO (copas, nubes, tiles, personajes)
  hose: '#241a10',
  hoseFar: '#3d2c1a',
  ridgeHaze: '#b6cbab',
  valley: '#5c8f47',
  valleyDark: '#41703a',
  terracotta: '#b05a3c',
  wallCream: '#f4ead2',
};

// hash determinista para variación de arte (NO consume el prng del juego)
const hashArt = (a, b = 0) => {
  const h = Math.sin(a * 127.1 + b * 311.7) * 43758.5453;
  return h - Math.floor(h);
};
// line-boil sutil: la línea "respira" escalonada a ~8fps, como en los 30s
const boil = (t, i = 0) => (hashArt((Math.floor(t * 8) % 3) * 2.7 + i * 7.3, i) - 0.5) * 1.5;

// estampa un sprite pre-renderizado (ancla abajo-centro)
function blit(ctx, spr, x, y, s = 1, rot = 0, alpha = 1) {
  ctx.save();
  ctx.translate(x, y);
  if (rot) ctx.rotate(rot);
  if (alpha < 1) ctx.globalAlpha *= alpha;
  ctx.drawImage(spr.c, -spr.ax * s, -spr.ay * s, spr.w * s, spr.h * s);
  ctx.restore();
}

// extremidad rubber-hose: curva de manguera con tinta más gruesa por debajo
function hoseLimb(ctx, x0, y0, x1, y1, bx, by, lw, color) {
  ctx.lineCap = 'round';
  ctx.strokeStyle = AB.ink;
  ctx.lineWidth = lw + 2.6;
  ctx.beginPath();
  ctx.moveTo(x0, y0 + 0.5);
  ctx.quadraticCurveTo(bx, by + 0.7, x1, y1 + 0.5);
  ctx.stroke();
  ctx.strokeStyle = color;
  ctx.lineWidth = lw;
  ctx.beginPath();
  ctx.moveTo(x0, y0);
  ctx.quadraticCurveTo(bx, by, x1, y1);
  ctx.stroke();
}

// guante blanco de CUATRO dedos (el signo definitivo del rubber-hose —
// referencia NORTE-angelita-rubberhose.jpg, 2026-08-07).
// REGLA DE LEGIBILIDAD: la silueta sigue siendo la bola blanca de siempre —
// a 40px el guante ES ese blob de alto contraste. Los cuatro dedos viven en
// TRES costuras en abanico, y pulgar + puño de muñeca solo se leen de cerca.
// flipX espeja el pulgar para la mano lejana (el pulgar mira a la muñeca).
function drawGlove(ctx, x, y, r, rot = 0, flipX = 1) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rot);
  ctx.scale(flipX, 1);
  ctx.fillStyle = AB.glove;
  ctx.strokeStyle = AB.ink;
  ctx.lineWidth = 2.2;
  // pulgar: bulto que asoma del lado de la muñeca, bajo la palma
  ctx.beginPath();
  ctx.arc(-r * 0.62, r * 0.36, r * 0.4, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  // palma redonda: lo único que sobrevive (y debe sobrevivir) a 40px
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  // tres costuras en abanico = cuatro dedos (Fleischer puro)
  ctx.lineWidth = 1.1;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(-r * 0.42, -r * 0.14);
  ctx.quadraticCurveTo(-r * 0.52, -r * 0.45, -r * 0.42, -r * 0.74);
  ctx.moveTo(-r * 0.02, -r * 0.08);
  ctx.quadraticCurveTo(-r * 0.02, -r * 0.5, 0, -r * 0.88);
  ctx.moveTo(r * 0.36, -r * 0.14);
  ctx.quadraticCurveTo(r * 0.46, -r * 0.45, r * 0.4, -r * 0.72);
  ctx.stroke();
  // puño de muñeca: arco corto abajo, cierra el guante como prenda
  ctx.lineWidth = 1.3;
  ctx.beginPath();
  ctx.moveTo(-r * 0.64, r * 0.64);
  ctx.quadraticCurveTo(0, r * 0.98, r * 0.64, r * 0.64);
  ctx.stroke();
  ctx.restore();
}

// ojo de pastel (pie-cut): pupila negra con muesca, clásico de los años 30.
// REGLA DE LEGIBILIDAD (la cara tiene que leerse a 40px): el blanco manda.
// La pupila se sujeta para dejar SIEMPRE ≥1.2 de blanco alrededor — si
// pupila+tinta se comen el blanco, a tamaño de juego el ojo es un borrón.
function drawBlinkEye(ctx, x, y, w, h = 1.1) {
  ctx.strokeStyle = AB.ink;
  ctx.lineWidth = 1.6;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(x - w * 0.5, y);
  ctx.quadraticCurveTo(x, y + h * 0.9, x + w * 0.5, y);
  ctx.stroke();
}

function drawPieEye(ctx, x, y, rw, rh, px, py, pr, notchA = -0.7) {
  const mx = Math.max(0, rw - pr - 1.2);
  const my = Math.max(0, rh - pr - 1.4);
  px = clamp(px, -mx, mx);
  py = clamp(py, -my, my);
  ctx.save();
  ctx.fillStyle = '#fffdf2';
  ctx.strokeStyle = AB.ink;
  ctx.lineWidth = 1.7;
  ctx.beginPath();
  ctx.ellipse(x, y, rw, rh, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = '#19110a';
  ctx.beginPath();
  ctx.moveTo(x + px, y + py);
  ctx.arc(x + px, y + py, pr, notchA + 0.85, notchA + Math.PI * 2 - 0.85);
  ctx.closePath();
  ctx.fill();
  // glint minúsculo: vivo en primer plano, invisible (inofensivo) a 40px
  ctx.fillStyle = 'rgba(255,253,242,.85)';
  ctx.beginPath();
  ctx.arc(x + px - pr * 0.35, y + py - pr * 0.4, pr * 0.28, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const lerp = (a, b, t) => a + (b - a) * t;
const smooth = (a, b, x) => {
  const t = clamp((x - a) / (b - a), 0, 1);
  return t * t * (3 - 2 * t);
};
const rand = (seed) => {
  let s = seed >>> 0;
  return () => {
    s |= 0; s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};
const prng = rand(0xA51E7A13);
const now = () => performance.now() / 1000;

function createAudioSystem(state) {
  const sys = {
    ac: null,
    master: null,
    muted: false,
    ready: false,
    unlock() {
      if (typeof window === 'undefined') return;
      if (!this.ac) {
        const AC = window.AudioContext || window.webkitAudioContext;
        if (!AC) return;
        try {
          this.ac = new AC({ latencyHint: 'interactive' });
          this.master = this.ac.createGain();
          this.master.gain.value = 0.82;
          this.master.connect(this.ac.destination);
          this.ready = true;
        } catch {
          this.ac = null;
          this.master = null;
          return;
        }
      }
      if (this.ac?.state === 'suspended') this.ac.resume().catch(() => {});
      this._applyMute();
    },
    _applyMute() {
      if (!this.master || !this.ac) return;
      const v = this.muted ? 0 : 0.82;
      this.master.gain.setTargetAtTime(v, this.ac.currentTime, 0.015);
    },
    setMuted(next) {
      this.muted = !!next;
      this._applyMute();
      return this.muted;
    },
    toggleMuted() {
      return this.setMuted(!this.muted);
    },
    _now() {
      return this.ac ? this.ac.currentTime : 0;
    },
    _gain(level, attack = 0.008, release = 0.12) {
      if (!this.ac) return null;
      const g = this.ac.createGain();
      const t = this._now() + 0.005;
      g.gain.cancelScheduledValues(t);
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(Math.max(0.0001, level), t + attack);
      g.gain.exponentialRampToValueAtTime(0.0001, t + attack + release);
      return g;
    },
    _osc(type, freq, dur, level, opts = {}) {
      if (!this.ac || this.muted) return;
      const o = this.ac.createOscillator();
      const g = this._gain(level, opts.attack ?? 0.006, opts.release ?? Math.max(0.03, dur * 0.7));
      if (!g) return;
      const f0 = opts.startFreq ?? freq;
      const f1 = opts.endFreq ?? freq;
      o.type = type;
      o.frequency.setValueAtTime(f0, this._now() + 0.005);
      if (f1 !== f0) o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), this._now() + 0.005 + dur);
      o.connect(opts.filter || g);
      if (opts.filter) opts.filter.connect(g);
      g.connect(this.master);
      o.start(this._now() + 0.005);
      o.stop(this._now() + 0.005 + dur + 0.05);
    },
    _noise(dur, level, opts = {}) {
      if (!this.ac || this.muted) return;
      const sr = this.ac.sampleRate;
      const buf = this.ac.createBuffer(1, Math.max(1, Math.floor(sr * dur)), sr);
      const data = buf.getChannelData(0);
      let s = (state?.level?.seeds?.length || 17) * 0.1234 + 0.11;
      for (let i = 0; i < data.length; i++) {
        s = (s * 1664525 + 1013904223) % 4294967296;
        const n = ((s >>> 0) / 4294967296) * 2 - 1;
        data[i] = n * (opts.decay ? Math.exp(-i / (data.length * opts.decay)) : 1);
      }
      const src = this.ac.createBufferSource();
      const g = this._gain(level, opts.attack ?? 0.002, opts.release ?? Math.max(0.04, dur * 0.7));
      if (!g) return;
      src.buffer = buf;
      src.connect(opts.filter || g);
      if (opts.filter) opts.filter.connect(g);
      g.connect(this.master);
      src.start(this._now() + 0.005);
      src.stop(this._now() + 0.005 + dur + 0.03);
    },
    jump() {
      if (!this.ac || this.muted) return;
      const t = this._now() + 0.005;
      const filter = this.ac.createBiquadFilter();
      filter.type = 'highpass';
      filter.frequency.setValueAtTime(320, t);
      filter.frequency.exponentialRampToValueAtTime(120, t + 0.18);
      this._osc('triangle', 420, 0.09, 0.08, { startFreq: 260, endFreq: 520, attack: 0.004, release: 0.08, filter });
      this._osc('sine', 180, 0.06, 0.035, { startFreq: 180, endFreq: 90, attack: 0.003, release: 0.06, filter });
    },
    land(strength = 1) {
      if (!this.ac || this.muted) return;
      const t = this._now() + 0.004;
      const filter = this.ac.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(260, t);
      filter.frequency.exponentialRampToValueAtTime(110, t + 0.14);
      this._noise(0.11 + strength * 0.02, 0.08 + strength * 0.03, { attack: 0.002, release: 0.08, filter, decay: 0.8 });
      this._osc('sine', 110, 0.08, 0.04 + strength * 0.02, { startFreq: 92, endFreq: 58, attack: 0.003, release: 0.08, filter });
    },
    seed(kind = 'maiz') {
      if (!this.ac || this.muted) return;
      const t = this._now() + 0.005;
      const tone = { maiz: 620, frijol: 520, calabaza: 740, quinua: 860, papa: 430 }[kind] || 640;
      this._osc('triangle', tone, 0.07, 0.08, { startFreq: tone * 0.85, endFreq: tone * 1.18, attack: 0.004, release: 0.11 });
      this._osc('sine', tone * 1.5, 0.05, 0.03, { startFreq: tone * 1.2, endFreq: tone * 1.8, attack: 0.002, release: 0.07 });
    },
    powerUp() {
      if (!this.ac || this.muted) return;
      const t = this._now() + 0.005;
      for (const [f, a] of [[392, 0.04], [523.25, 0.05], [784, 0.035]]) {
        this._osc('sine', f, 0.12, a, { startFreq: f * 0.94, endFreq: f * 1.25, attack: 0.01, release: 0.2 });
      }
      const filter = this.ac.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(1200, t);
      filter.Q.value = 8;
      this._noise(0.18, 0.03, { attack: 0.003, release: 0.12, filter, decay: 0.5 });
    },
    damage() {
      if (!this.ac || this.muted) return;
      const filter = this.ac.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(520, this._now() + 0.005);
      filter.frequency.exponentialRampToValueAtTime(120, this._now() + 0.16);
      this._osc('sawtooth', 220, 0.16, 0.08, { startFreq: 260, endFreq: 72, attack: 0.003, release: 0.11, filter });
      this._noise(0.12, 0.045, { attack: 0.001, release: 0.1 });
    },
    goal() {
      if (!this.ac || this.muted) return;
      for (const [f, dur, gain] of [[523.25, 0.1, 0.06], [659.25, 0.12, 0.07], [783.99, 0.14, 0.08], [1046.5, 0.18, 0.07]]) {
        this._osc('triangle', f, dur, gain, { startFreq: f * 0.9, endFreq: f * 1.12, attack: 0.008, release: 0.16 });
      }
    },
    stomp(type = 'broca') {
      if (!this.ac || this.muted) return;
      const t = this._now() + 0.005;
      // Cada plaga tiene SU sonido: crujido tostado, poof de pelusa, chispita
      // plateada, PLAAÑ apestoso húmedo o pop del cogollo.
      if (type === 'cochinilla') {
        const filter = this.ac.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(900, t);
        filter.frequency.exponentialRampToValueAtTime(220, t + 0.22);
        this._noise(0.2, 0.075, { attack: 0.004, release: 0.16, filter, decay: 0.7 });
        this._osc('sine', 300, 0.14, 0.04, { startFreq: 340, endFreq: 130, attack: 0.006, release: 0.14, filter });
        return;
      }
      if (type === 'minador') {
        const filter = this.ac.createBiquadFilter();
        filter.type = 'bandpass';
        filter.frequency.setValueAtTime(3400, t);
        filter.Q.value = 9;
        this._noise(0.1, 0.035, { attack: 0.001, release: 0.09, filter, decay: 0.3 });
        this._osc('sine', 2100, 0.05, 0.028, { startFreq: 1800, endFreq: 3200, attack: 0.001, release: 0.05, filter });
        this._osc('sine', 3200, 0.04, 0.02, { startFreq: 2800, endFreq: 4000, attack: 0.001, release: 0.04, filter });
        return;
      }
      if (type === 'chinche') {
        const filter = this.ac.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(700, t);
        filter.frequency.exponentialRampToValueAtTime(90, t + 0.26);
        this._osc('sawtooth', 220, 0.24, 0.085, { startFreq: 260, endFreq: 58, attack: 0.004, release: 0.2, filter });
        this._noise(0.22, 0.06, { attack: 0.003, release: 0.18, filter, decay: 0.5 });
        this._osc('square', 150, 0.1, 0.03, { startFreq: 200, endFreq: 70, attack: 0.003, release: 0.09, filter });
        return;
      }
      if (type === 'cogollero') {
        const filter = this.ac.createBiquadFilter();
        filter.type = 'bandpass';
        filter.frequency.setValueAtTime(900, t);
        filter.frequency.exponentialRampToValueAtTime(260, t + 0.16);
        filter.Q.value = 5;
        this._osc('triangle', 420, 0.13, 0.07, { startFreq: 520, endFreq: 200, attack: 0.003, release: 0.12, filter });
        this._noise(0.12, 0.05, { attack: 0.002, release: 0.1, filter, decay: 0.4 });
        return;
      }
      const d = { tone: 180, end: 62, noise: 0.06, mix: 0.08, shape: 'square' };
      const filter = this.ac.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(700, this._now() + 0.005);
      filter.Q.value = 4;
      this._osc(d.shape, d.tone, 0.08, d.mix, { startFreq: d.tone * 1.2, endFreq: d.end, attack: 0.003, release: 0.1, filter });
      this._noise(0.07, 0.035, { attack: 0.002, release: 0.08, decay: 0.3 });
    },
    poof() {
      if (!this.ac || this.muted) return;
      const t = this._now() + 0.004;
      const filter = this.ac.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(1400, t);
      filter.frequency.exponentialRampToValueAtTime(280, t + 0.18);
      this._noise(0.16, 0.06, { attack: 0.004, release: 0.14, filter, decay: 0.6 });
      this._osc('sine', 340, 0.1, 0.025, { startFreq: 420, endFreq: 150, attack: 0.005, release: 0.09, filter });
    },
    emerge() {
      if (!this.ac || this.muted) return;
      const t = this._now() + 0.004;
      const filter = this.ac.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(500, t);
      filter.frequency.exponentialRampToValueAtTime(1600, t + 0.12);
      filter.Q.value = 6;
      this._noise(0.12, 0.045, { attack: 0.002, release: 0.1, filter, decay: 0.5 });
      this._osc('triangle', 700, 0.09, 0.03, { startFreq: 480, endFreq: 980, attack: 0.003, release: 0.08, filter });
    },
  };
  return sys;
}

function rectsOverlap(a, b) {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

function circleRectOverlap(cx, cy, r, rect) {
  const x = clamp(cx, rect.x, rect.x + rect.w);
  const y = clamp(cy, rect.y, rect.y + rect.h);
  const dx = cx - x;
  const dy = cy - y;
  return dx * dx + dy * dy <= r * r;
}

function makeCanvas(w, h) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  return c;
}

function makeLabel(text, className = '') {
  const el = document.createElement('div');
  el.textContent = text;
  el.className = className;
  el.style.cssText = [
    'font-family:Georgia,serif',
    'font-size:14px',
    'font-style:italic',
    'color:#fff7dc',
    'padding:5px 8px',
    'border-radius:999px',
    'border:1px solid rgba(255,248,226,.7)',
    'background:rgba(39,24,12,.82)',
    'box-shadow:0 6px 14px rgba(0,0,0,.2)',
    'white-space:nowrap',
  ].join(';');
  return el;
}

function makePopup(text, color = '#fff2c9') {
  const el = document.createElement('div');
  el.textContent = text;
  el.style.cssText = [
    'font-family:Georgia,serif',
    'font-size:13px',
    'font-style:italic',
    `color:${color}`,
    'padding:4px 7px',
    'border-radius:999px',
    'background:rgba(17,22,15,.72)',
    'border:1px solid rgba(255,255,255,.12)',
    'text-shadow:0 1px 0 rgba(0,0,0,.35)',
    'box-shadow:0 6px 12px rgba(0,0,0,.16)',
    'white-space:nowrap',
    'opacity:0',
    'transform:translateY(6px)',
    'transition:opacity .15s ease, transform .15s ease',
  ].join(';');
  return el;
}

function buildLevel() {
  const tiles = Array.from({ length: WORLD.rows }, () => Array(WORLD.cols).fill(0));
  const groundRow = 10;
  const thinRow = 9;
  for (let x = 0; x < WORLD.cols; x++) {
    const wave = Math.sin(x * 0.35) * 0.35 + Math.sin(x * 0.12 + 0.6) * 0.18;
    const top = clamp(Math.round(groundRow + wave), 9, 11);
    for (let y = top; y < WORLD.rows; y++) {
      tiles[y][x] = y === top ? LEVEL.tileTypes.TOP : LEVEL.tileTypes.SOIL;
    }
  }

  // Escalera ascendente: cada tramo sube UN tile (el salto máximo rinde ~1.7
  // tiles), con huecos de a lo más 2 tiles para que SIEMPRE se alcance. El
  // último tramo (L7 -> L8) baja planeando: ahí hay corriente de aire con
  // hojitas subiendo para que se entienda que hay que planear.
  const platformRuns = [
    [9, 9, 5, LEVEL.tileTypes.ROOT],       // L1 · escalón desde el suelo
    [15, 8, 5, LEVEL.tileTypes.PLATFORM],  // L2
    [21, 7, 5, LEVEL.tileTypes.ROOT],      // L3
    [27, 6, 7, LEVEL.tileTypes.PLATFORM],  // L4 · terraza de la milpa
    [35, 5, 5, LEVEL.tileTypes.ROOT],      // L5
    [41, 4, 5, LEVEL.tileTypes.PLATFORM],  // L6
    [47, 3, 4, LEVEL.tileTypes.ROOT],      // L7 · cima (de aquí se planea)
    [53, 5, 5, LEVEL.tileTypes.PLATFORM],  // L8 · tras planear a la derecha
    [58, 5, 6, LEVEL.tileTypes.ROOT],      // L9 · hasta la meta (fin de mundo)
  ];
  for (const [x0, y, len, type] of platformRuns) {
    for (let x = x0; x < x0 + len; x++) {
      if (x >= 0 && x < WORLD.cols) tiles[y][x] = type;
    }
  }

  const spawn = { x: 180, y: 10 * TILE - 52 };
  const goal = { x: WORLD.width - 190, y: 6 * TILE - 90, w: 90, h: 200 };

  // Cinco plagas reales del cafetal y la milpa, cada una con su modo:
  // broca (camina terco), cochinilla (lenta, pegada a la rama), minador
  // (polilla en zigzag), chinche (salta al acercarse), cogollero (escondido
  // en el cogollo de la milpa hasta que se le acerca Angelita).
  const enemyRuns = [
    ['broca', 6.5, 10, 2.2],
    ['cochinilla', 11.5, 9, 1.4],
    ['minador', 17.5, 7.2, 2.6],
    ['cogollero', 30, 6, 1.6],
    ['chinche', 37.5, 5, 1.8],
    ['broca', 43.5, 4, 1.8],
    ['minador', 55.5, 4.4, 2.4],
    ['cochinilla', 59.5, 5, 1.4],
  ];
  const enemies = enemyRuns.map(([type, tx, ty, range], i) => {
    const def = ENEMY_DEFS[type] || ENEMY_DEFS.broca;
    const size = {
      broca: [38, 30],
      cochinilla: [34, 26],
      minador: [26, 18],
      chinche: [42, 30],
      cogollero: [36, 26],
    }[type] || [38, 30];
    const x = tx * TILE + 8;
    const y = ty * TILE - (type === 'minador' ? 34 : 42);
    return {
      id: i + 1,
      type,
      label: def.label,
      scientific: def.scientific,
      x, y, w: size[0], h: size[1],
      vx: 62 + (i % 3) * 12,
      dir: i % 2 ? -1 : 1,
      patrolMin: x - range * TILE * 0.5,
      patrolMax: x + range * TILE * 0.5,
      alive: true,
      squash: 0,
      breathe: prng() * Math.PI * 2,
      phase: prng() * Math.PI * 2,
      baseY: y,
      emerged: type === 'cogollero' ? false : true,
      hopCooldown: 0,
      trail: [],
      trailFade: 0,
      label: null,
      labelTimer: 0,
    };
  });

  // Semillas a lo largo del camino; el trío milpa (maíz, fríjol, calabaza)
  // queda en la terraza de la milpa para que el combo tenga sentido ahí.
  const seeds = [
    ['papa', 7, 8.3], ['quinua', 11, 8.8], ['papa', 17, 7.8],
    ['maiz', 27, 5.9], ['frijol', 29, 5.9], ['calabaza', 31, 5.9],
    ['quinua', 37, 4.8], ['papa', 43, 3.8], ['quinua', 48, 2.8],
    ['maiz', 55, 4.8], ['calabaza', 60, 4.8],
  ].map(([kind, tx, ty], i) => ({
    id: `seed-${i + 1}`,
    kind,
    x: tx * TILE + 22 + (i % 2) * 8,
    y: ty * TILE,
    r: 12,
    collected: false,
    spin: prng() * Math.PI * 2,
  }));

  const powerUp = {
    id: 'beauveria-1',
    kind: 'beauveria',
    x: 43.5 * TILE,
    y: 3.5 * TILE,
    r: 18,
    collected: false,
    pulse: 0,
  };

  const decorations = [];
  for (let i = 0; i < 34; i++) {
    const x = i * 180 + 70 + (prng() - 0.5) * 56;
    const layer = prng();
    decorations.push({
      x,
      y: 6 * TILE + (prng() - 0.5) * 80,
      s: 0.52 + layer * 0.95,
      layer,
      sway: prng() * Math.PI * 2,
      kind: layer > 0.7 ? 'shade' : 'coffee',
      hue: prng() * 0.35 + 0.65,
    });
  }

  return { tiles, spawn, goal, meta: LEVEL.meta, enemies, seeds, powerUp, decorations };
}

function tileAt(tiles, x, y) {
  const tx = Math.floor(x / TILE);
  const ty = Math.floor(y / TILE);
  if (ty < 0 || ty >= tiles.length || tx < 0 || tx >= tiles[0].length) return 0;
  return tiles[ty][tx];
}

function solidAt(tiles, x, y) {
  return tileAt(tiles, x, y) !== 0;
}

function collectSolidTiles(tiles, rect) {
  const minX = clamp(Math.floor(rect.x / TILE) - 1, 0, WORLD.cols - 1);
  const maxX = clamp(Math.floor((rect.x + rect.w) / TILE) + 1, 0, WORLD.cols - 1);
  const minY = clamp(Math.floor(rect.y / TILE) - 1, 0, WORLD.rows - 1);
  const maxY = clamp(Math.floor((rect.y + rect.h) / TILE) + 1, 0, WORLD.rows - 1);
  const solids = [];
  for (let y = minY; y <= maxY; y++) {
    for (let x = minX; x <= maxX; x++) {
      const t = tiles[y][x];
      if (!t) continue;
      solids.push({ x: x * TILE, y: y * TILE, w: TILE, h: TILE, t });
    }
  }
  return solids;
}

function moveAndCollide(tiles, body, dx, dy) {
  body.x += dx;
  let solids = collectSolidTiles(tiles, body);
  for (const tile of solids) {
    if (!rectsOverlap(body, tile)) continue;
    if (dx > 0) body.x = tile.x - body.w;
    else if (dx < 0) body.x = tile.x + tile.w;
  }
  body.y += dy;
  solids = collectSolidTiles(tiles, body);
  let hitGround = false;
  let hitCeil = false;
  for (const tile of solids) {
    if (!rectsOverlap(body, tile)) continue;
    if (dy > 0) {
      body.y = tile.y - body.h;
      hitGround = true;
    } else if (dy < 0) {
      body.y = tile.y + tile.h;
      hitCeil = true;
    }
  }
  return { hitGround, hitCeil };
}

let ART = null; // recursos de arte pre-renderizados (drawTile los lee sin cambiar firma)
const GROUND_ROWS = new WeakMap(); // fila TOP por columna, cacheada por instancia de tiles
const SURFACE_ROWS = new WeakMap(); // fila del tile sólido más alto por columna (incluye ROOT/PLATFORM)

function groundRowsFor(tiles) {
  let rows = GROUND_ROWS.get(tiles);
  if (!rows) {
    rows = [];
    for (let x = 0; x < WORLD.cols; x++) {
      rows[x] = -1;
      for (let y = 0; y < WORLD.rows; y++) {
        if (tiles[y][x] === LEVEL.tileTypes.TOP) { rows[x] = y; break; }
      }
    }
    GROUND_ROWS.set(tiles, rows);
  }
  return rows;
}

// Superficie real por columna: la fila del sólido más alto (cualquier tipo).
// Las plataformas elevadas ROOT/PLATFORM no son TOP, así que groundRowsFor no
// las ve; esta es la que rige el dibujo de los taludes y los bancos.
function surfaceRowsFor(tiles) {
  let surf = SURFACE_ROWS.get(tiles);
  if (!surf) {
    surf = [];
    for (let x = 0; x < WORLD.cols; x++) {
      surf[x] = -1;
      for (let y = 0; y < WORLD.rows; y++) {
        if (tiles[y][x]) { surf[x] = y; break; }
      }
    }
    SURFACE_ROWS.set(tiles, surf);
  }
  return surf;
}

function simulateFlatJumpReach() {
  const dt = 1 / 240;
  const p = {
    x: 0,
    y: 0,
    w: 38,
    h: 54,
    vx: 220,
    vy: -620,
    jumpHeld: true,
    jumpBuffer: 0,
    coyote: 0.12,
    glideFuel: 0.95,
    riseCut: false,
    onGround: false,
  };
  let maxX = 0;
  for (let t = 0; t < 4.2; t += dt) {
    const prevJumpHeld = p.jumpHeld;
    const jumpReleased = !p.jumpHeld && prevJumpHeld;
    if (jumpReleased && p.vy < 0 && !p.riseCut) {
      p.vy *= 0.48;
      p.riseCut = true;
    }
    if (p.jumpHeld) p.riseCut = false;

    let gravity = 2200;
    if (p.vy > 0) gravity = 3000;
    if (p.jumpHeld && p.vy > 0 && p.glideFuel > 0 && !p.onGround) {
      gravity = 700;
      p.glideFuel = Math.max(0, p.glideFuel - dt * 0.55);
      p.vy = Math.min(p.vy, 120);
    }
    if (p.vy < 0 && p.jumpHeld) gravity = 1700;
    p.vy += gravity * dt;
    p.vy = Math.min(p.vy, 1040);
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    maxX = Math.max(maxX, p.x);
    if (p.y >= 0 && t > 0.05) break;
  }
  return maxX;
}

function verifyJumpBudget(level) {
  const maxReachPx = simulateFlatJumpReach();
  const safeBudgetPx = maxReachPx * 0.85;
  const routes = [
    { from: 'Ledge 1', to: 'Ledge 2', fromX: 6, fromW: 5, toX: 13, toW: 6, fromY: 3, toY: 5 },
    { from: 'Ledge 2', to: 'Ledge 3', fromX: 13, fromW: 6, toX: 22, toW: 6, fromY: 5, toY: 4 },
    { from: 'Ledge 3', to: 'Ledge 4', fromX: 22, fromW: 6, toX: 31, toW: 5, fromY: 4, toY: 6 },
    { from: 'Ledge 4', to: 'Bridge', fromX: 31, fromW: 5, toX: 36, toW: 4, fromY: 6, toY: 5 },
    { from: 'Bridge', to: 'Ledge 5', fromX: 36, fromW: 4, toX: 41, toW: 6, fromY: 5, toY: 4 },
    { from: 'Ledge 5', to: 'Ledge 6', fromX: 41, fromW: 6, toX: 50, toW: 5, fromY: 4, toY: 5 },
    { from: 'Ledge 6', to: 'Ledge 7', fromX: 50, fromW: 5, toX: 56, toW: 4, fromY: 5, toY: 3 },
    { from: 'Ledge 7', to: 'Meta', fromX: 56, fromW: 4, toX: level.goal.x / TILE, toW: level.goal.w / TILE, fromY: 3, toY: level.goal.y / TILE },
  ].map((r) => {
    const fromRight = (r.fromX + r.fromW) * TILE;
    const toLeft = r.to === 'Meta' ? level.goal.x : r.toX * TILE;
    const dx = Math.max(0, toLeft - fromRight);
    const dy = Math.abs((r.toY - r.fromY) * TILE);
    const requirementPx = Math.hypot(dx, dy * 0.58);
    return {
      ...r,
      gapPx: dx,
      risePx: dy,
      requirementPx,
      budgetRatio: requirementPx / maxReachPx,
      pass: requirementPx <= safeBudgetPx,
    };
  });
  return {
    maxReachPx,
    safeBudgetPx,
    passes: routes.every((r) => r.pass),
    routes,
  };
}

function makeDrawResources() {
  // texturas de follaje-MASA (lib compartida): cientos de hojitas incontables
  const texCafeto = texturaFollaje(THREE, { seed: 31, tam: 256, oscuro: AB.leafDeep, medio: AB.leafDark, claro: AB.leafGlow, hojas: 430 }).image;
  const texSombrio = texturaFollaje(THREE, { seed: 87, tam: 256, oscuro: AB.shadeDeep, medio: AB.shadeMid, claro: AB.shadeLite, hojas: 380 }).image;

  // sprite a 2x (nitidez en dpr 2), coordenadas lógicas, ancla abajo-centro
  const spr = (w, h, fn) => {
    const c = makeCanvas(w * 2, h * 2);
    const g = c.getContext('2d');
    g.scale(2, 2);
    fn(g);
    return { c, w, h, ax: w / 2, ay: h };
  };

  // copa como MASA: núcleo opaco + estampas densas de textura + sombra abajo,
  // luz arriba. La silueta + la densidad hacen el árbol, no hojas sueltas.
  const masa = (g, lobes, tex, rn, yTop, yBot) => {
    g.save();
    g.fillStyle = AB.leafDeep;
    for (const [x, y, r] of lobes) {
      g.beginPath();
      g.arc(x, y, r * 0.9, 0, Math.PI * 2);
      g.fill();
    }
    for (const [x, y, r] of lobes) {
      for (let i = 0; i < 3; i++) {
        const a = rn() * Math.PI * 2;
        const d = rn() * r * 0.4;
        const s = r * (2.1 + rn() * 0.5);
        g.save();
        g.translate(x + Math.cos(a) * d, y + Math.sin(a) * d);
        g.rotate(rn() * Math.PI * 2);
        g.globalAlpha = 0.92;
        g.drawImage(tex, -s / 2, -s / 2, s, s);
        g.restore();
      }
    }
    // volumen con UNA sola luz (sol arriba-derecha): brillo diagonal, panza en sombra
    g.beginPath();
    for (const [x, y, r] of lobes) {
      g.moveTo(x + r * 1.12, y);
      g.arc(x, y, r * 1.12, 0, Math.PI * 2);
    }
    g.clip();
    let mnX = 1e9, mxX = -1e9;
    for (const [x] of lobes) { mnX = Math.min(mnX, x); mxX = Math.max(mxX, x); }
    const grad = g.createLinearGradient(mxX + 30, yTop - 24, mnX - 40, yBot + 10);
    grad.addColorStop(0, 'rgba(255,244,178,.3)');
    grad.addColorStop(0.42, 'rgba(0,0,0,0)');
    grad.addColorStop(1, 'rgba(12,30,16,.5)');
    g.fillStyle = grad;
    g.fillRect(-60, yTop - 30, 460, yBot - yTop + 80);
    // racimos que agarran sol: festón claro arriba-derecha, festón hondo abajo-izquierda
    // (la copa deja de ser mancha y se lee como masa densa CON volumen)
    g.lineCap = 'round';
    for (const [x, y, r] of lobes) {
      g.strokeStyle = 'rgba(226,244,150,.32)';
      g.lineWidth = r * 0.3;
      g.beginPath();
      g.arc(x + r * 0.08, y - r * 0.08, r * 0.82, -1.75, -0.15);
      g.stroke();
      g.strokeStyle = 'rgba(8,24,12,.26)';
      g.lineWidth = r * 0.34;
      g.beginPath();
      g.arc(x, y, r * 0.86, 1.35, 2.95);
      g.stroke();
    }
    g.restore();
  };

  // racimo de cerezas de café (acento minoritario, maduración mixta)
  const cerezas = (g, cx, cy, rn, n = 5) => {
    for (let i = 0; i < n; i++) {
      const a = rn() * Math.PI * 2;
      const d = 2 + rn() * 5;
      const x = cx + Math.cos(a) * d;
      const y = cy + Math.sin(a) * d;
      const k = rn();
      g.fillStyle = k < 0.5 ? AB.cherry : (k < 0.72 ? AB.ripe : AB.leafGlow);
      g.strokeStyle = 'rgba(42,28,16,.55)';
      g.lineWidth = 0.9;
      g.beginPath();
      g.arc(x, y, 2.5, 0, Math.PI * 2);
      g.fill();
      g.stroke();
      g.fillStyle = 'rgba(255,250,235,.7)';
      g.beginPath();
      g.arc(x - 0.8, y - 0.9, 0.7, 0, Math.PI * 2);
      g.fill();
    }
  };

  // cafeto de fondo: copa cónica en pisos, tronco corto
  const cafeto = [0, 1, 2].map((v) => spr(120, 150, (g) => {
    const rn = rand(0xCAFE0 + v * 101);
    g.strokeStyle = AB.ink;
    g.lineCap = 'round';
    g.lineWidth = 7;
    g.beginPath(); g.moveTo(60, 148); g.lineTo(60, 104); g.stroke();
    g.strokeStyle = '#6b4a2a';
    g.lineWidth = 4.2;
    g.beginPath(); g.moveTo(60, 148); g.lineTo(60, 104); g.stroke();
    const lob = [
      [34, 106, 24], [60, 110, 27], [86, 106, 24],
      [42, 78, 22], [78, 78, 22], [60, 84, 24],
      [50, 54, 19], [70, 54, 19], [60, 34, 17],
    ].map(([x, y, r]) => [x + (rn() - 0.5) * 6, y + (rn() - 0.5) * 5, r * (0.92 + rn() * 0.16)]);
    masa(g, lob, texCafeto, rn, 14, 138);
    for (const [cx, cy] of [[46, 96], [74, 100], [56, 68], [76, 62]]) {
      if (rn() < 0.3) continue;
      cerezas(g, cx, cy, rn, 4 + (rn() * 3 | 0));
    }
  }));

  // guamo de sombrío: tronco alto bifurcado, copa parasol ancha
  const sombrio = [0, 1].map((v) => spr(300, 250, (g) => {
    const rn = rand(0x50B10 + v * 77);
    const trunk = (lw, col) => {
      g.strokeStyle = col;
      g.lineCap = 'round';
      g.lineWidth = lw;
      g.beginPath();
      g.moveTo(150, 248);
      g.bezierCurveTo(145, 205, 151, 178, 143, 148);
      g.stroke();
      g.beginPath(); g.moveTo(143, 150); g.quadraticCurveTo(112, 122, 92, 108); g.stroke();
      g.lineWidth = lw * 0.8;
      g.beginPath(); g.moveTo(143, 150); g.quadraticCurveTo(176, 118, 196, 104); g.stroke();
      g.beginPath(); g.moveTo(144, 158); g.quadraticCurveTo(150, 118, 152, 98); g.stroke();
    };
    trunk(10.5, AB.ink);
    trunk(6.5, '#5e4226');
    g.strokeStyle = 'rgba(190,150,100,.4)';
    g.lineWidth = 2;
    g.beginPath(); g.moveTo(147, 240); g.bezierCurveTo(142.5, 205, 148.5, 180, 141, 155); g.stroke();
    const lob = [
      [70, 92, 30], [110, 72, 34], [150, 62, 38], [195, 70, 34], [232, 90, 29],
      [118, 100, 30], [182, 98, 30], [150, 92, 34],
    ].map(([x, y, r]) => [x + (rn() - 0.5) * 10, y + (rn() - 0.5) * 8, r * (0.92 + rn() * 0.16)]);
    masa(g, lob, texSombrio, rn, 28, 136);
  }));

  // plátano: pseudotallo + hojas grandes arqueadas con muescas de viento
  const hojaPlatano = (g, ang, flip, len, wid, col, colLite) => {
    g.save();
    g.translate(75, 124);
    g.scale(flip, 1);
    g.rotate(ang);
    // lámina ancha con punta caída (hoja de plátano, no palma)
    g.beginPath();
    g.moveTo(0, 0);
    g.quadraticCurveTo(len * 0.42, -len * 0.26, len, len * 0.1);
    g.quadraticCurveTo(len * 0.5, wid * 0.9, 3, wid * 0.34);
    g.closePath();
    g.fillStyle = col;
    g.fill();
    g.strokeStyle = AB.ink;
    g.lineWidth = 2;
    g.stroke();
    g.strokeStyle = colLite;
    g.lineWidth = 2.2;
    g.beginPath();
    g.moveTo(2, wid * 0.16);
    g.quadraticCurveTo(len * 0.5, -len * 0.06, len * 0.94, len * 0.09);
    g.stroke();
    // una sola muesca de viento, corta (rasgada, no espinosa)
    g.globalCompositeOperation = 'destination-out';
    g.beginPath();
    g.moveTo(len * 0.56, wid * 0.62);
    g.lineTo(len * 0.58, wid * 0.1);
    g.lineTo(len * 0.63, wid * 0.6);
    g.closePath();
    g.fill();
    g.restore();
  };
  const platano = [0, 1].map((v) => spr(150, 210, (g) => {
    const rn = rand(0x9147A + v * 31);
    g.beginPath();
    g.moveTo(68, 208);
    g.quadraticCurveTo(70, 160, 72, 126);
    g.lineTo(79, 126);
    g.quadraticCurveTo(82, 160, 85, 208);
    g.closePath();
    g.fillStyle = AB.leafSage;
    g.fill();
    g.strokeStyle = AB.ink;
    g.lineWidth = 2.2;
    g.stroke();
    g.strokeStyle = 'rgba(74,108,62,.5)';
    g.lineWidth = 1.4;
    g.beginPath(); g.moveTo(74, 200); g.quadraticCurveTo(75, 160, 75.5, 130); g.stroke();
    const cols = [[AB.leafDark, AB.leafLite], [AB.leafMid, AB.leafGlow]];
    hojaPlatano(g, 0.5 + rn() * 0.1, -1, 62, 34, cols[0][0], cols[0][1]);
    hojaPlatano(g, 0.52 + rn() * 0.1, 1, 66, 35, cols[1][0], cols[1][1]);
    hojaPlatano(g, 0.06, -1, 58, 31, cols[1][0], cols[1][1]);
    hojaPlatano(g, 0.04, 1, 60, 32, cols[0][0], cols[0][1]);
    hojaPlatano(g, -0.5, 1, 50, 28, AB.leafMid, AB.leafGlow);
    // hoja emergente enrollada
    g.save();
    g.translate(75, 124);
    g.rotate(-0.1);
    g.fillStyle = AB.leafGlow;
    g.strokeStyle = AB.ink;
    g.lineWidth = 1.8;
    g.beginPath();
    g.ellipse(0, -22, 4.2, 21, 0, 0, Math.PI * 2);
    g.fill();
    g.stroke();
    g.restore();
  }));

  // nube ilustrada: panza plana con sombra salvia, sin tinta
  const nube = [0, 1, 2].map((v) => spr(200, 80, (g) => {
    const rn = rand(0xC10D + v * 13);
    const puffs = [[36, 58, 18], [68, 46, 24], [102, 40, 27], [136, 48, 22], [164, 58, 15]]
      .map(([x, y, r]) => [x + (rn() - 0.5) * 10, y + (rn() - 0.5) * 6, r * (0.9 + rn() * 0.25)]);
    // panza en sombra salvia hacia abajo-izquierda (el sol está arriba-derecha)
    g.fillStyle = 'rgba(168,193,178,.55)';
    for (const [x, y, r] of puffs) {
      g.beginPath(); g.arc(x - 3.4, y + 5.6, r, 0, Math.PI * 2); g.fill();
    }
    g.fillStyle = 'rgba(252,250,241,.96)';
    for (const [x, y, r] of puffs) {
      g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.fill();
    }
    // cresta que agarra sol
    g.fillStyle = 'rgba(255,249,222,.9)';
    for (const [x, y, r] of puffs) {
      g.beginPath(); g.arc(x + r * 0.3, y - r * 0.34, r * 0.55, 0, Math.PI * 2); g.fill();
    }
  }));

  // mata de café chica para la fila jugable (misma mano que el cafeto de fondo)
  const mata = [0, 1, 2].map((v) => spr(70, 62, (g) => {
    const rn = rand(0x3A7A + v * 57);
    g.strokeStyle = AB.ink;
    g.lineCap = 'round';
    g.lineWidth = 4.6;
    g.beginPath(); g.moveTo(35, 60); g.lineTo(35, 42); g.stroke();
    g.strokeStyle = '#6b4a2a';
    g.lineWidth = 2.6;
    g.beginPath(); g.moveTo(35, 60); g.lineTo(35, 42); g.stroke();
    const lob = [
      [21, 40, 14], [49, 40, 14], [35, 32, 16], [35, 16, 11],
    ].map(([x, y, r]) => [x + (rn() - 0.5) * 4, y + (rn() - 0.5) * 3, r * (0.92 + rn() * 0.16)]);
    masa(g, lob, texCafeto, rn, 4, 56);
    if (rn() > 0.35) cerezas(g, 26 + rn() * 18, 36 + rn() * 6, rn, 3 + (rn() * 3 | 0));
  }));

  // ── tiles con materialidad (pre-render 2x) ────────────────────────────────
  const tile = (fn) => {
    const c = makeCanvas(TILE * 2, TILE * 2);
    const g = c.getContext('2d');
    g.scale(2, 2);
    fn(g);
    return c;
  };
  const piedras = (g, rn, n, y0, y1) => {
    for (let i = 0; i < n; i++) {
      const x = rn() * 60 + 2;
      const y = y0 + rn() * (y1 - y0);
      const r = 1.4 + rn() * 2;
      g.fillStyle = 'rgba(51,34,15,.55)';
      g.beginPath(); g.ellipse(x, y, r * 1.3, r, rn() * 0.8, 0, Math.PI * 2); g.fill();
      g.fillStyle = 'rgba(200,170,130,.3)';
      g.beginPath(); g.arc(x - r * 0.4, y - r * 0.4, r * 0.4, 0, Math.PI * 2); g.fill();
    }
  };
  const estratos = (g, rn, ys) => {
    g.strokeStyle = 'rgba(48,30,14,.28)';
    g.lineWidth = 1.4;
    for (const y of ys) {
      g.beginPath();
      g.moveTo(0, y);
      for (let x = 0; x <= TILE; x += 16) g.lineTo(x, y + Math.sin((x + y) * 0.3 + rn() * 4) * 1.6);
      g.stroke();
    }
  };
  const tTop = [0, 1, 2].map((v) => tile((g) => {
    const rn = rand(0x709 + v * 29);
    const grad = g.createLinearGradient(0, 12, 0, TILE);
    grad.addColorStop(0, AB.soilLite);
    grad.addColorStop(1, AB.soil);
    g.fillStyle = grad;
    g.fillRect(0, 8, TILE, TILE - 8);
    piedras(g, rn, 4, 28, 58);
    estratos(g, rn, [36, 52]);
    // borde de pasto con volumen: sombra, cuerpo, luz — masa festoneada
    const xs = [3, 14, 25, 36, 47, 58, 64];
    g.fillStyle = 'rgba(28,52,24,.95)';
    for (const x of xs) {
      g.beginPath(); g.ellipse(x + (rn() - 0.5) * 3, 17, 10.5, 9.5, 0, 0, Math.PI * 2); g.fill();
    }
    g.fillStyle = AB.leafMid;
    for (const x of xs) {
      g.beginPath(); g.ellipse(x + (rn() - 0.5) * 3, 12, 10, 8.5, 0, 0, Math.PI * 2); g.fill();
    }
    g.fillStyle = AB.grassTop;
    for (const x of xs) {
      g.beginPath(); g.ellipse(x + (rn() - 0.5) * 3, 7.5, 8, 6, 0, 0, Math.PI * 2); g.fill();
    }
    // briznas
    g.strokeStyle = AB.grassEdge;
    g.lineWidth = 1.6;
    g.lineCap = 'round';
    for (let i = 0; i < 4; i++) {
      const x = 6 + rn() * 52;
      g.beginPath();
      g.moveTo(x, 9);
      g.quadraticCurveTo(x + (rn() - 0.5) * 5, 4.5, x + (rn() - 0.5) * 7, 1.5);
      g.stroke();
    }
    // beso de sol en el flanco derecho de cada mata (la luz viene de arriba-derecha)
    g.strokeStyle = 'rgba(255,242,168,.45)';
    g.lineWidth = 2.2;
    g.lineCap = 'round';
    for (const x of xs) {
      g.beginPath(); g.arc(x + 1, 8, 6.2, -1.45, -0.25); g.stroke();
    }
    // tinta bajo el pasto (lectura de lámina)
    g.strokeStyle = AB.inkSoft;
    g.lineWidth = 1.8;
    g.beginPath();
    g.moveTo(0, 25);
    for (let x = 0; x <= TILE; x += 8) g.lineTo(x, 25 + Math.sin(x * 0.5 + v) * 1.8);
    g.stroke();
    if (v === 2) {
      g.fillStyle = AB.cherry;
      g.strokeStyle = AB.inkSoft;
      g.lineWidth = 0.9;
      g.beginPath(); g.arc(18, 31, 2.2, 0, Math.PI * 2); g.fill(); g.stroke();
    }
  }));
  const tSoil = [0, 1, 2].map((v) => tile((g) => {
    const rn = rand(0x5011 + v * 41);
    const grad = g.createLinearGradient(0, 0, 0, TILE);
    grad.addColorStop(0, AB.soil);
    grad.addColorStop(1, AB.soilDark);
    g.fillStyle = grad;
    g.fillRect(0, 0, TILE, TILE);
    g.fillStyle = 'rgba(18,11,5,.16)';
    g.fillRect(0, 0, TILE, 3);
    piedras(g, rn, 5, 6, 58);
    estratos(g, rn, [18, 40, 56]);
    if (v === 1) {
      g.strokeStyle = 'rgba(150,110,70,.3)';
      g.lineWidth = 1.6;
      g.beginPath();
      g.moveTo(40, 0);
      g.quadraticCurveTo(34, 22, 42, 40);
      g.quadraticCurveTo(46, 52, 40, 64);
      g.stroke();
    }
  }));
  const tPlat = tile((g) => {
    // tarima de madera de secado, musgo en el borde superior
    const boards = [[4, 22, '#a5763f'], [22, 44, '#96693c'], [44, 64, '#875a30']];
    g.fillStyle = AB.woodDark;
    g.fillRect(0, 0, TILE, TILE);
    for (const [y0, y1, col] of boards) {
      g.fillStyle = col;
      g.fillRect(0, y0, TILE, y1 - y0);
      // veta recta y sutil (madera cepillada, no cuerda)
      g.strokeStyle = 'rgba(214,178,128,.22)';
      g.lineWidth = 1;
      for (let i = 0; i < 2; i++) {
        const y = y0 + 5 + i * ((y1 - y0) / 2.6);
        g.beginPath();
        g.moveTo(0, y);
        for (let x = 0; x <= TILE; x += 16) g.lineTo(x, y + Math.sin((x + y * 7) * 0.1) * 0.5);
        g.stroke();
      }
      g.strokeStyle = 'rgba(60,38,18,.22)';
      g.lineWidth = 0.8;
      g.beginPath();
      g.moveTo(0, y1 - 3); g.lineTo(TILE, y1 - 3);
      g.stroke();
    }
    g.strokeStyle = 'rgba(42,28,16,.62)';
    g.lineWidth = 2.4;
    g.beginPath();
    g.moveTo(0, 22); g.lineTo(TILE, 22);
    g.moveTo(0, 44); g.lineTo(TILE, 44);
    g.stroke();
    g.fillStyle = AB.woodLite;
    g.fillRect(0, 0, TILE, 5);
    g.strokeStyle = AB.inkSoft;
    g.lineWidth = 1.8;
    g.beginPath(); g.moveTo(0, 6); g.lineTo(TILE, 6); g.stroke();
    g.fillStyle = 'rgba(42,28,16,.5)';
    g.fillRect(0, TILE - 2.4, TILE, 2.4);
    for (const [nx, ny] of [[9, 30], [55, 30], [9, 54], [55, 54]]) {
      g.fillStyle = AB.soilDeep;
      g.beginPath(); g.arc(nx, ny, 1.4, 0, Math.PI * 2); g.fill();
      g.fillStyle = 'rgba(230,200,160,.6)';
      g.beginPath(); g.arc(nx - 0.5, ny - 0.5, 0.5, 0, Math.PI * 2); g.fill();
    }
    // musgo/pasto en el labio
    for (const [mx, mr] of [[10, 7], [33, 9], [55, 7]]) {
      g.fillStyle = 'rgba(40,89,47,.8)';
      g.beginPath(); g.ellipse(mx, 3.8, mr, 2.4, 0, 0, Math.PI * 2); g.fill();
      g.fillStyle = 'rgba(127,177,78,.85)';
      g.beginPath(); g.ellipse(mx + 1.6, 2.6, mr * 0.6, 1.5, 0, 0, Math.PI * 2); g.fill();
    }
  });
  const tRoot = tile((g) => {
    const rn = rand(0xB007);
    const grad = g.createLinearGradient(0, 0, 0, TILE);
    grad.addColorStop(0, AB.soil);
    grad.addColorStop(1, AB.soilDark);
    g.fillStyle = grad;
    g.fillRect(0, 0, TILE, TILE);
    piedras(g, rn, 3, 44, 60);
    // raíz gruesa periódica (entra y sale a y=32: los tiles empatan solos)
    const raiz = (lw, col, dy = 0) => {
      g.strokeStyle = col;
      g.lineCap = 'round';
      g.lineWidth = lw;
      g.beginPath();
      g.moveTo(-2, 32 + dy);
      g.bezierCurveTo(14, 8 + dy, 20, 52 + dy, 32, 32 + dy);
      g.bezierCurveTo(44, 12 + dy, 50, 54 + dy, 66, 32 + dy);
      g.stroke();
    };
    raiz(11, AB.ink);
    raiz(7, '#6e4d2c');
    raiz(2.2, 'rgba(190,150,100,.55)', -2);
    g.strokeStyle = 'rgba(42,28,16,.7)';
    g.lineWidth = 2;
    g.beginPath();
    g.moveTo(20, 42);
    g.quadraticCurveTo(15, 52, 13, 60);
    g.stroke();
    g.fillStyle = '#5a3d22';
    g.strokeStyle = AB.inkSoft;
    g.lineWidth = 1.4;
    g.beginPath(); g.ellipse(32, 32, 4, 3.2, 0.3, 0, Math.PI * 2); g.fill(); g.stroke();
  });

  const res = {
    cafeto, sombrio, platano, nube, mata,
    tiles: { top: tTop, soil: tSoil, plat: tPlat, root: tRoot },
  };
  ART = res;
  return res;
}

function setupControls(state) {
  const armAudio = () => state.audio?.unlock();
  const bind = (id, key) => {
    const el = document.getElementById(id);
    const down = (e) => { e.preventDefault(); armAudio(); state.input[key] = true; if (key === 'jump') state.input.jumpPress = true; el.classList.add('down'); };
    const up = (e) => { e.preventDefault(); state.input[key] = false; el.classList.remove('down'); };
    el.addEventListener('pointerdown', down);
    el.addEventListener('pointerup', up);
    el.addEventListener('pointercancel', up);
    el.addEventListener('pointerleave', up);
  };
  bind('leftBtn', 'left');
  bind('rightBtn', 'right');
  bind('jumpBtn', 'jump');
  state.canvas.addEventListener('pointerdown', () => {
    if (state.mode === 'dead') restartGame(state);
  });

  addEventListener('keydown', (e) => {
    armAudio();
    if (['ArrowLeft', 'ArrowRight', 'ArrowUp', ' ', 'a', 'd', 'A', 'D'].includes(e.key)) e.preventDefault();
    if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') state.input.left = true;
    if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') state.input.right = true;
    if (e.key === 'ArrowUp' || e.key === ' ' || e.key === 'w' || e.key === 'W') {
      if (!state.input.jump) state.input.jumpPress = true;
      state.input.jump = true;
    }
    if (e.key === 'Enter' && state.mode !== 'playing') startGame(state);
    if (e.key === 'r' || e.key === 'R') restartGame(state);
  });
  addEventListener('keyup', (e) => {
    if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') state.input.left = false;
    if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') state.input.right = false;
    if (e.key === 'ArrowUp' || e.key === ' ' || e.key === 'w' || e.key === 'W') state.input.jump = false;
  });
}

function createState(canvas) {
  const level = buildLevel();
  const draw = makeDrawResources();
  const ctx = canvas.getContext('2d');
  const css2d = new CSS2DRenderer({ element: document.getElementById('labels') });
  const scene = new THREE.Scene();
  const camera = new THREE.OrthographicCamera(0, 1, 1, 0, -1000, 1000);
  camera.position.z = 10;
  scene.add(camera);
  const prefersReducedMotion = typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;

  const state = {
    canvas,
    ctx,
    css2d,
    scene,
    camera,
    level,
    draw,
    mode: 'intro',
    last: now(),
    acc: 0,
    dpr: Math.min(2, window.devicePixelRatio || 1),
    viewW: 1,
    viewH: 1,
    camX: 0,
    camY: 0,
    shake: 0,
    shakeX: 0,
    shakeY: 0,
    reducedMotion: prefersReducedMotion,
    fade: 1,
    message: '',
    messageUntil: 0,
    input: { left: false, right: false, jump: false, jumpPress: false },
    audio: null,
    player: {
      x: level.spawn.x,
      y: level.spawn.y,
      w: 38,
      h: 54,
      vx: 0,
      vy: 0,
      facing: 1,
      onGround: false,
      coyote: 0,
      jumpBuffer: 0,
      jumpHeld: false,
      glideFuel: 0.9,
      glideActive: false,
      invuln: 0,
      hurtFlash: 0,
      lives: 3,
      seeds: 0,
      comboMilpa: new Set(),
      milpaBonusGiven: false,
      beauveria: 0,
      respawn: { x: level.spawn.x, y: level.spawn.y },
      safeTimer: 0,
      dead: false,
      win: false,
      landedPrev: false,
      riseCut: false,
    },
    popups: [],
    labels: [],
    particles: [],
    goalUnlocked: false,
  };

  state.audio = createAudioSystem(state);
  state.jumpReport = verifyJumpBudget(level);
  if (typeof console !== 'undefined' && console.info) {
    console.info('[angelita-bros] jump check', {
      maxReachPx: Math.round(state.jumpReport.maxReachPx),
      safeBudgetPx: Math.round(state.jumpReport.safeBudgetPx),
      passes: state.jumpReport.passes,
      routes: state.jumpReport.routes.map((r) => ({
        from: r.from,
        to: r.to,
        gapPx: Math.round(r.gapPx),
        risePx: Math.round(r.risePx),
        requirementPx: Math.round(r.requirementPx),
        budgetRatio: Number(r.budgetRatio.toFixed(3)),
        pass: r.pass,
      })),
    });
  }
  setupControls(state);
  document.getElementById('hud').addEventListener('click', (e) => {
    const target = e.target?.closest?.('#muteBtn');
    if (!target) return;
    state.audio?.unlock();
    state.audio?.toggleMuted();
    updateHud(state);
  });
  const rmQuery = typeof matchMedia === 'function' ? matchMedia('(prefers-reduced-motion: reduce)') : null;
  if (rmQuery?.addEventListener) {
    rmQuery.addEventListener('change', () => {
      state.reducedMotion = rmQuery.matches;
    });
  }

  const intro = document.getElementById('intro');
  document.getElementById('startBtn').addEventListener('click', () => startGame(state));
  intro.addEventListener('pointerdown', () => startGame(state));
  if (AUTO_DEMO) queueMicrotask(() => startGame(state));

  const labelLayer = document.getElementById('labels');
  labelLayer.style.position = 'absolute';
  labelLayer.style.inset = '0';

  resize(state);
  return state;
}

function resize(state) {
  const { canvas, css2d, camera } = state;
  const w = Math.max(1, window.innerWidth);
  const h = Math.max(1, window.innerHeight);
  state.viewW = w;
  state.viewH = h;
  state.dpr = Math.min(2, window.devicePixelRatio || 1);
  canvas.width = Math.round(w * state.dpr);
  canvas.height = Math.round(h * state.dpr);
  canvas.style.width = `${w}px`;
  canvas.style.height = `${h}px`;
  css2d.setSize(w, h);
  camera.left = 0;
  camera.right = w;
  camera.top = h;
  camera.bottom = 0;
  camera.updateProjectionMatrix();
}

function startGame(state) {
  if (state.mode === 'playing') return;
  state.audio?.unlock();
  document.getElementById('intro').classList.add('hidden');
  state.mode = 'playing';
  state.fade = 0;
  state.message = 'Salta entre las terrazas y controla las 5 plagas';
  state.messageUntil = now() + 2.4;
}

function restartGame(state) {
  const fresh = buildLevel();
  state.level = fresh;
  Object.assign(state.player, {
    x: fresh.spawn.x,
    y: fresh.spawn.y,
    vx: 0,
    vy: 0,
    facing: 1,
    onGround: false,
    coyote: 0,
    jumpBuffer: 0,
    jumpHeld: false,
    glideFuel: 0.9,
    glideActive: false,
    invuln: 0,
    hurtFlash: 0,
    lives: 3,
    seeds: 0,
    comboMilpa: new Set(),
    milpaBonusGiven: false,
    beauveria: 0,
    respawn: { x: fresh.spawn.x, y: fresh.spawn.y },
    safeTimer: 0,
    dead: false,
    win: false,
  });
  state.popups.length = 0;
  state.labels.forEach((obj) => state.scene.remove(obj));
  state.labels.length = 0;
  state.particles.length = 0;
  state.goalUnlocked = false;
  document.getElementById('intro').classList.remove('hidden');
  state.message = 'Reiniciando';
  state.messageUntil = now() + 1.0;
  startGame(state);
}

function emitMessage(state, text, secs = 1.4) {
  state.message = text;
  state.messageUntil = now() + secs;
}

function spawnPopup(state, x, y, text, color = '#fff2c9') {
  const el = makePopup(text, color);
  const obj = new CSS2DObject(el);
  obj.position.set(x, y, 0);
  state.scene.add(obj);
  state.popups.push({ obj, el, born: now(), ttl: 1.5, vy: -22, drift: (prng() - 0.5) * 18 });
}

function spawnLabel(state, x, y, text) {
  const el = makeLabel(text);
  const obj = new CSS2DObject(el);
  obj.position.set(x, y, 0);
  state.scene.add(obj);
  state.labels.push({ obj, el, born: now(), ttl: 1.5, vy: -10, drift: 0 });
}

function spawnParticles(state, x, y, color, count = 8, power = 1) {
  if (state.reducedMotion) {
    count = Math.max(2, Math.round(count * 0.45));
    power *= 0.7;
  }
  for (let i = 0; i < count; i++) {
    const a = (i / count) * Math.PI * 2 + prng() * 0.3;
    state.particles.push({
      x, y,
      vx: Math.cos(a) * (35 + prng() * 45) * power,
      vy: Math.sin(a) * (35 + prng() * 45) * power - 20,
      life: 0.7 + prng() * 0.5,
      r: 2 + prng() * 2.6,
      color,
    });
  }
}

function respawnAtSafe(state, reason = 'último punto seguro') {
  const p = state.player;
  p.x = clamp(p.respawn.x, 0, WORLD.width - p.w);
  p.y = clamp(p.respawn.y, 0, WORLD.height - p.h);
  p.vx = 0;
  p.vy = 0;
  p.onGround = false;
  p.coyote = 0;
  p.jumpBuffer = 0;
  p.glideFuel = 0.8;
  p.glideActive = false;
  p.riseCut = false;
  p.safeTimer = 0;
  state.shake = state.reducedMotion ? 0 : 0.08;
  emitMessage(state, `Reaparece en ${reason}`, 1.1);
}

function applyDamage(state, fromX, pest = 'broca') {
  const p = state.player;
  if (p.invuln > 0 || p.dead || p.win) return;
  p.lives -= 1;
  p.invuln = 1.2;
  p.hurtFlash = 0.42;
  p.vx = (p.x < fromX ? -1 : 1) * 220;
  p.vy = -360;
  p.glideFuel = 0.25;
  state.shake = state.reducedMotion ? 0 : 0.35;
  spawnParticles(state, p.x + p.w / 2, p.y + p.h / 2, '#ffe6a3', 18, 1.1);
  state.audio?.damage();
  const short = ENEMY_DEFS[pest]?.short || 'la plaga';
  emitMessage(state, p.lives > 0 ? `¡Cuidado con ${short}!` : 'Angelita quedó agotada');
  if (p.lives <= 0) {
    p.dead = true;
    state.mode = 'dead';
    spawnParticles(state, p.x + p.w / 2, p.y + p.h / 2, '#ffe6a3', 26, 1.4);
    spawnParticles(state, p.x + p.w / 2, p.y + p.h / 2, '#d8ffce', 12, 1.6);
    state.shake = state.reducedMotion ? 0 : 0.5;
    emitMessage(state, 'Sin vidas. Presione R o toque reiniciar', 3);
  } else {
    p.x = p.respawn.x;
    p.y = p.respawn.y;
    p.vx = 0;
    p.vy = 0;
  }
}

function neutralizeEnemy(state, enemy, reason = 'neutralizada') {
  if (!enemy.alive) return;
  enemy.alive = false;
  enemy.labelTimer = 1.5;
  enemy.squash = 1;
  const def = ENEMY_DEFS[enemy.type] || ENEMY_DEFS.broca;
  const cx = enemy.x + enemy.w / 2;
  const cy = enemy.y + enemy.h / 2;
  const colors = {
    broca: '#d9b98c',
    cochinilla: '#f6f2e4',
    minador: '#e6f1f2',
    chinche: '#e8d3a0',
    cogollero: '#f0e6a8',
  };
  const powers = {
    broca: 1.05,
    cochinilla: 0.7,
    minador: 1.0,
    chinche: 1.0,
    cogollero: 1.0,
  };
  spawnParticles(state, cx, cy, colors[enemy.type] || colors.broca, enemy.type === 'cochinilla' ? 10 : 14, powers[enemy.type] || 1);
  if (enemy.type === 'minador') {
    enemy.trailFade = 1.5;
  }
  spawnLabel(state, cx - 42, enemy.y - 26, def.scientific);
  spawnPopup(state, cx - 42, enemy.y - 48, `${def.label} ${reason}`, '#d4f1ba');
  state.audio?.stomp(enemy.type);
  emitMessage(state, `${def.label} controlada`);
}

function collectSeed(state, seed) {
  if (seed.collected) return;
  seed.collected = true;
  state.player.seeds += 1;
  state.player.comboMilpa.add(seed.kind);
  spawnParticles(state, seed.x, seed.y, SEED_META[seed.kind].color, 8, 0.8);
  state.audio?.seed(seed.kind);
  emitMessage(state, `Semilla: ${SEED_META[seed.kind].label}`, 1.0);
  const combo = ['maiz', 'frijol', 'calabaza'].every((k) => state.player.comboMilpa.has(k));
  if (combo && !state.player.milpaBonusGiven) {
    state.player.milpaBonusGiven = true;
    state.player.seeds += 12;
    spawnPopup(state, seed.x, seed.y - 12, 'Combo milpa +12', '#fff1c2');
    state.shake = state.reducedMotion ? 0 : 0.16;
  }
}

function collectPowerUp(state) {
  const p = state.player;
  p.beauveria = Math.max(p.beauveria, 60);
  p.lives = Math.min(5, p.lives + 1);
  spawnParticles(state, state.level.powerUp.x, state.level.powerUp.y, '#d8ffce', 20, 1.1);
  spawnPopup(state, state.level.powerUp.x - 8, state.level.powerUp.y - 12, 'Beauveria activada', '#d8ffce');
  state.audio?.powerUp();
  emitMessage(state, 'Biocontrol listo: contacto neutraliza plagas');
}

function updatePlayer(state, dt) {
  const p = state.player;
  const level = state.level;
  const prevJumpHeld = p.jumpHeld;
  const wasOnGround = p.onGround;

  p.coyote = p.onGround ? 0.12 : Math.max(0, p.coyote - dt);
  p.jumpBuffer = state.input.jumpPress ? 0.12 : Math.max(0, p.jumpBuffer - dt);
  p.jumpHeld = state.input.jump;
  p.invuln = Math.max(0, p.invuln - dt);
  p.hurtFlash = Math.max(0, p.hurtFlash - dt);
  p.beauveria = Math.max(0, p.beauveria - dt);
  p.glideActive = false;

  const accel = p.onGround ? 2200 : 1450;
  const maxSpeed = p.onGround ? 220 : 210;
  const target = (state.input.right ? 1 : 0) - (state.input.left ? 1 : 0);
  if (target !== 0) p.facing = target;
  const friction = p.onGround ? 0.84 : 0.96;
  const desired = target * maxSpeed;
  p.vx = lerp(p.vx, desired, 1 - Math.exp(-accel * dt / 1800));
  if (target === 0) p.vx *= friction;
  p.vx = clamp(p.vx, -maxSpeed, maxSpeed);

  const wantJump = p.jumpBuffer > 0 && p.coyote > 0 && !p.dead && !p.win;
  if (wantJump) {
    p.vy = -620;
    p.onGround = false;
    p.coyote = 0;
    p.jumpBuffer = 0;
    p.glideFuel = 0.95;
    p.riseCut = false;
    state.audio?.jump();
  }

  const jumpedUp = p.vy < 0;
  const jumpReleased = !state.input.jump && prevJumpHeld;
  if (jumpReleased && jumpedUp && !p.riseCut) {
    p.vy *= 0.48;
    p.riseCut = true;
  }
  if (state.input.jump) p.riseCut = false;

  let gravity = 2200;
  if (p.vy > 0) gravity = 3000;
  if (state.input.jump && p.vy > 0 && p.glideFuel > 0 && !p.onGround) {
    gravity = 700;
    p.glideFuel = Math.max(0, p.glideFuel - dt * 0.55);
    p.glideActive = true;
    p.vy = Math.min(p.vy, 120);
  }
  if (p.vy < 0 && state.input.jump) gravity = 1700;

  p.vy += gravity * dt;
  p.vy = Math.min(p.vy, 1040);

  const prev = { x: p.x, y: p.y, w: p.w, h: p.h };
  p.onGround = false;
  const stepX = p.vx * dt;
  const stepY = p.vy * dt;
  const hit = moveAndCollide(level.tiles, p, stepX, stepY);
  if (hit.hitGround) {
    p.onGround = true;
    if (p.vy > 0) p.vy = 0;
    p.glideFuel = 0.95;
    if (!wasOnGround) {
      state.audio?.land(clamp(Math.abs(stepY) / 80, 0.4, 1.2));
    }
  }
  if (hit.hitCeil && p.vy < 0) p.vy = 0;

  if (p.x < 0) p.x = 0;
  if (p.y < 0) { p.y = 0; p.vy = 0; }
  if (p.x > WORLD.width - p.w) p.x = WORLD.width - p.w;
  if (p.y > WORLD.height - p.h) {
    p.y = WORLD.height - p.h;
    p.vy = 0;
    p.onGround = true;
  }

  if (p.onGround && Math.abs(p.vy) < 1) {
    p.respawn = { x: clamp(p.x, 0, WORLD.width - p.w), y: p.y };
    p.safeTimer = 0;
  } else {
    p.safeTimer += dt;
  }

  if (p.y > WORLD.height + 200 || (p.y > p.respawn.y + 360 && p.vy > 180) || (p.safeTimer > 2.6 && !p.onGround)) {
    respawnAtSafe(state, 'el último punto seguro');
  }

  for (const seed of level.seeds) {
    if (seed.collected) continue;
    if (circleRectOverlap(seed.x, seed.y, seed.r, p)) collectSeed(state, seed);
  }
  if (!level.powerUp.collected && circleRectOverlap(level.powerUp.x, level.powerUp.y, level.powerUp.r, p)) {
    level.powerUp.collected = true;
    collectPowerUp(state);
  }

  for (const enemy of level.enemies) {
    if (!enemy.alive || !enemy.emerged || enemy.cochinillaPoof > 0) continue;
    const enemyRect = { x: enemy.x, y: enemy.y, w: enemy.w, h: enemy.h };
    if (!rectsOverlap(p, enemyRect)) continue;
    const prevBottom = prev.y + prev.h;
    const descending = p.vy > 0;
    const cleanStomp = prevBottom <= enemy.y + 10 && descending;
    const graceStomp = prevBottom <= enemy.y + enemy.h * 0.4 && descending;
    if (p.beauveria > 0) {
      neutralizeEnemy(state, enemy, 'bajo Beauveria');
      p.vy = -420;
      p.glideFuel = Math.min(1, p.glideFuel + 0.15);
      state.shake = state.reducedMotion ? 0 : 0.18;
    } else if (enemy.type === 'cochinilla') {
      // Tan blanda que solo se espolvorea: no daña y no muere del todo.
      enemy.cochinillaPoof = 0.7;
      spawnParticles(state, enemy.x + enemy.w / 2, enemy.y + enemy.h / 2, '#f6f2e4', 10, 0.55);
      p.vy = -300;
      p.glideFuel = Math.min(1, p.glideFuel + 0.1);
      state.shake = state.reducedMotion ? 0 : 0.08;
      state.audio?.poof();
    } else if (cleanStomp) {
      neutralizeEnemy(state, enemy, 'derrotada');
      p.vy = -420;
      p.glideFuel = Math.min(1, p.glideFuel + 0.15);
      state.shake = state.reducedMotion ? 0 : 0.18;
    } else if (graceStomp) {
      // Descenso de refilón: igual ganas, con un bote suave.
      neutralizeEnemy(state, enemy, 'de paso');
      p.vy = -300;
      state.shake = state.reducedMotion ? 0 : 0.1;
    } else {
      // Cabezazo o choque en el aire: la plaga gana y la tierra espera abajo.
      applyDamage(state, enemy.x + enemy.w / 2, enemy.type);
    }
  }

  if (p.invuln > 0) p.hurtFlash = Math.max(p.hurtFlash, 0.16);

  const allDead = level.enemies.every((e) => !e.alive);
  state.goalUnlocked = allDead;
  const inGoal = rectsOverlap(p, level.goal);
  if (inGoal && allDead) {
    p.win = true;
    state.mode = 'win';
    state.audio?.goal();
    emitMessage(state, 'Nivel superado: cafetal limpio', 3);
    spawnPopup(state, level.goal.x + 12, level.goal.y - 20, 'Meta', '#fff1c2');
  } else if (inGoal && !allDead) {
    emitMessage(state, 'Falta neutralizar las brocas', 1.1);
  }

  state.input.jumpPress = false;
}

function updateEnemies(state, dt) {
  const { tiles, enemies } = state.level;
  const p = state.player;
  for (const enemy of enemies) {
    if (!enemy.alive) {
      enemy.labelTimer = Math.max(0, enemy.labelTimer - dt);
      if (enemy.type === 'minador') enemy.trailFade = Math.max(0, (enemy.trailFade || 0) - dt * 0.72);
      continue;
    }
    enemy.breathe += dt * 4;
    enemy.phase += dt * (1.6 + enemy.id * 0.08);
    enemy.cochinillaPoof = Math.max(0, (enemy.cochinillaPoof || 0) - dt);
    enemy.hopCooldown = Math.max(0, (enemy.hopCooldown || 0) - dt);

    // Minador: polilla plateada que vuelve en zigzag sobre el lomo de la milpa.
    if (enemy.type === 'minador') {
      const speed = 56 + (enemy.id % 2) * 10;
      enemy.x += speed * enemy.dir * dt;
      enemy.y = enemy.baseY + Math.sin(enemy.phase * 2.4) * 20 + Math.sin(enemy.phase * 0.82 + enemy.id) * 9;
      if (enemy.x < enemy.patrolMin || enemy.x > enemy.patrolMax) {
        enemy.dir *= -1;
        enemy.x = clamp(enemy.x, enemy.patrolMin, enemy.patrolMax);
      }
      enemy.trail.push({ x: enemy.x + enemy.w / 2, y: enemy.y + enemy.h / 2 });
      if (enemy.trail.length > 16) enemy.trail.shift();
      enemy.trailFade = 1;
      continue;
    }

    // Cogollero: escondido en el cogollo de la milpa hasta que se le acerca
    // Angelita; entonces emerge y camina por el lomo.
    if (enemy.type === 'cogollero') {
      if (!enemy.emerged) {
        const dist = Math.abs(p.x + p.w / 2 - (enemy.x + enemy.w / 2));
        if (dist < 230) {
          enemy.emerged = true;
          enemy.vy = 0;
          spawnPopup(state, enemy.x + enemy.w / 2 - 46, enemy.y - 26, '¡Gusano en el cogollo!', '#fff1c2');
          state.audio?.emerge();
        }
      } else {
        const speed = 58 + (enemy.id % 3) * 8;
        enemy.vy = (enemy.vy || 0) + 220 * dt;
        const res = moveAndCollide(tiles, enemy, speed * enemy.dir * dt, enemy.vy * dt);
        if (res.hitGround) enemy.vy = 0;
        if (enemy.x < enemy.patrolMin || enemy.x > enemy.patrolMax) {
          enemy.dir *= -1;
          enemy.x = clamp(enemy.x, enemy.patrolMin, enemy.patrolMax);
        }
        const aheadX = enemy.x + enemy.w / 2 + enemy.dir * (enemy.w * 0.6);
        const footY = enemy.y + enemy.h + 6;
        if (!solidAt(tiles, aheadX, footY)) enemy.dir *= -1;
        if (enemy.y > WORLD.height + 100) { enemy.y = enemy.baseY; enemy.vy = 0; }
      }
      continue;
    }

    // Cochinilla: lenta, pegada a la rama, blanda al pisarla.
    if (enemy.type === 'cochinilla') {
      const speed = 26 + (enemy.id % 3) * 4;
      enemy.vy = (enemy.vy || 0) + 220 * dt;
      const res = moveAndCollide(tiles, enemy, speed * enemy.dir * dt, enemy.vy * dt);
      if (res.hitGround) enemy.vy = 0;
      if (enemy.x < enemy.patrolMin || enemy.x > enemy.patrolMax) {
        enemy.dir *= -1;
        enemy.x = clamp(enemy.x, enemy.patrolMin, enemy.patrolMax);
      }
      if (enemy.y > WORLD.height + 100) { enemy.y = enemy.baseY; enemy.vy = 0; }
      continue;
    }

    // Chinche patón: se queda quieta (parece rama muerta) y salta al acercarse.
    if (enemy.type === 'chinche') {
      enemy.vy = (enemy.vy || 0) + 220 * dt;
      const dx = p.x + p.w / 2 - (enemy.x + enemy.w / 2);
      if (Math.abs(dx) < 300 && enemy.hopCooldown <= 0) {
        enemy.hopCooldown = 1.9;
        enemy.vy = -310 - (enemy.id % 3) * 40;
        enemy.vx = 90 + (enemy.id % 2) * 30;
      }
      const res = moveAndCollide(tiles, enemy, enemy.vx * enemy.dir * dt, enemy.vy * dt);
      if (res.hitGround) enemy.vy = 0;
      enemy.vx *= 0.95;
      if (enemy.x < enemy.patrolMin || enemy.x > enemy.patrolMax) {
        enemy.dir *= -1;
        enemy.x = clamp(enemy.x, enemy.patrolMin, enemy.patrolMax);
      }
      if (enemy.y > enemy.baseY + 200) { enemy.y = enemy.baseY; enemy.vy = 0; }
      continue;
    }

    // Broca: la clásica, camina terco y no mira huecos (para enseñar a saltar).
    const speed = enemy.vx * enemy.dir;
    enemy.vy = (enemy.vy || 0) + 220 * dt;
    const res = moveAndCollide(tiles, enemy, speed * dt, enemy.vy * dt);
    if (res.hitGround) enemy.vy = 0;
    if (enemy.x < enemy.patrolMin || enemy.x > enemy.patrolMax) {
      enemy.dir *= -1;
      enemy.x = clamp(enemy.x, enemy.patrolMin, enemy.patrolMax);
    }
    const aheadX = enemy.x + enemy.w / 2 + enemy.dir * (enemy.w * 0.6);
    const footY = enemy.y + enemy.h + 6;
    if (!solidAt(tiles, aheadX, footY)) enemy.dir *= -1;
    if (enemy.y > WORLD.height + 100) {
      enemy.y = 8 * TILE - enemy.h;
      enemy.vy = 0;
    }
  }
}

function updatePopups(state, dt) {
  const t = now();
  for (let i = state.popups.length - 1; i >= 0; i--) {
    const p = state.popups[i];
    p.obj.position.y += p.vy * dt * 0.02;
    p.obj.position.x += p.drift * dt * 0.02;
    const k = (t - p.born) / p.ttl;
    p.el.style.opacity = String(1 - clamp(k, 0, 1));
    p.el.style.transform = `translateY(${6 - 7 * k}px)`;
    if (k >= 1) {
      state.scene.remove(p.obj);
      state.popups.splice(i, 1);
    }
  }
  for (let i = state.labels.length - 1; i >= 0; i--) {
    const l = state.labels[i];
    l.obj.position.y += l.vy * dt * 0.02;
    const k = (t - l.born) / l.ttl;
    l.el.style.opacity = String(1 - clamp(k, 0, 1));
    l.el.style.transform = `translateY(${2 - 6 * k}px)`;
    if (k >= 1) {
      state.scene.remove(l.obj);
      state.labels.splice(i, 1);
    }
  }
}

function updateParticles(state, dt) {
  for (let i = state.particles.length - 1; i >= 0; i--) {
    const p = state.particles[i];
    p.life -= dt;
    p.vy += 920 * dt;
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.vx *= 0.98;
    p.vy *= 0.99;
    if (p.life <= 0) state.particles.splice(i, 1);
  }
}

function updateCamera(state, dt) {
  const p = state.player;
  const targetX = clamp(p.x + p.w * 0.5 - state.viewW * 0.42, 0, Math.max(0, WORLD.width - state.viewW));
  const targetY = clamp(p.y + p.h * 0.5 - state.viewH * 0.58, 0, Math.max(0, WORLD.height - state.viewH));
  state.camX = lerp(state.camX, targetX, 1 - Math.exp(-dt * 4.8));
  state.camY = lerp(state.camY, targetY, 1 - Math.exp(-dt * 4.0));
  if (state.shake > 0) {
    state.shake -= dt;
    const amp = state.shake * 8;
    state.shakeX = (prng() - 0.5) * amp;
    state.shakeY = (prng() - 0.5) * amp;
  } else {
    state.shakeX = 0;
    state.shakeY = 0;
  }
}

function updateHud(state) {
  const hud = document.getElementById('hud');
  const p = state.player;
  const remaining = state.level.enemies.filter((e) => e.alive).length;
  const muted = state.audio?.muted ? 'Sonido: OFF' : 'Sonido: ON';
  const power = p.beauveria > 0 ? `Beauveria ${Math.ceil(p.beauveria)}s` : 'sin biocontrol';
  const combo = p.milpaBonusGiven ? 'Combo milpa +12' : `${p.comboMilpa.size}/3 milpa`;
  hud.innerHTML = `
    <div class="row">
      <button class="chip" id="muteBtn" type="button" aria-label="Silenciar o activar sonido">${muted}</button>
      <span class="chip"><strong>Angelita</strong> · ${LEVEL.nombre}</span>
      <span class="chip">Semillas: <strong>${p.seeds}</strong></span>
      <span class="chip">Vidas: <strong>${p.lives}</strong></span>
    </div>
    <div class="row tiny" style="margin-top:6px">
      <span class="chip">Piso térmico: <strong>${LEVEL.piso}</strong></span>
      <span class="chip">Brocas: <strong>${remaining}</strong></span>
      <span class="chip">${power}</span>
      <span class="chip">${combo}</span>
    </div>
  `;
}

// casita campesina de paredes encaladas y teja de barro, con humito del fogón
// (vida en la lejanía; misma tinta y misma luz que el resto de la lámina)
function drawCasita(ctx, x, y, t) {
  ctx.save();
  ctx.translate(x, y);
  ctx.fillStyle = 'rgba(20,40,22,.3)';
  ctx.beginPath(); ctx.ellipse(-3, 2, 34, 6, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = AB.wallCream;
  ctx.strokeStyle = 'rgba(60,42,26,.8)';
  ctx.lineWidth = 1.6;
  ctx.beginPath(); ctx.rect(-24, -26, 48, 28); ctx.fill(); ctx.stroke();
  ctx.fillStyle = 'rgba(176,90,60,.8)';
  ctx.fillRect(-24, -7, 48, 9);
  // flanco izquierdo en sombra (el sol pega por la derecha)
  ctx.fillStyle = 'rgba(70,50,30,.2)';
  ctx.fillRect(-24, -26, 15, 28);
  ctx.fillStyle = '#4a3018';
  ctx.fillRect(6, -18, 10, 20);
  ctx.fillStyle = '#3c2a14';
  ctx.fillRect(-14, -20, 9, 9);
  ctx.strokeStyle = 'rgba(246,236,205,.8)';
  ctx.lineWidth = 1.1;
  ctx.strokeRect(-14, -20, 9, 9);
  // chimenea + techo de teja a dos aguas
  ctx.fillStyle = '#8d4a32';
  ctx.fillRect(-16, -41, 7, 12);
  ctx.fillStyle = AB.terracotta;
  ctx.strokeStyle = 'rgba(60,30,18,.85)';
  ctx.lineWidth = 1.8;
  ctx.beginPath();
  ctx.moveTo(-30, -26); ctx.lineTo(0, -42); ctx.lineTo(30, -26); ctx.closePath();
  ctx.fill(); ctx.stroke();
  ctx.strokeStyle = 'rgba(255,222,180,.55)';
  ctx.lineWidth = 1.3;
  ctx.beginPath(); ctx.moveTo(4, -40); ctx.lineTo(26, -27); ctx.stroke();
  ctx.fillStyle = 'rgba(244,244,238,.6)';
  for (let i = 0; i < 3; i++) {
    const ph = (t * 0.35 + i * 0.33) % 1;
    ctx.globalAlpha = (1 - ph) * 0.55;
    ctx.beginPath();
    ctx.arc(-12.5 + Math.sin(t * 1.3 + i * 2) * 3 - ph * 7, -46 - ph * 24, 2.5 + ph * 4.5, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

// gradación de luz final: UNA atmósfera para todo el cuadro — calor radiando
// desde el sol, frío en la contraluz, viñeta suave. Es lo que hace que fondo,
// tiles y personajes parezcan pintados bajo la misma lámpara.
let FX = { key: '', warm: null, cool: null, vign: null };
function drawLightGrade(state) {
  const { ctx, viewW: w, viewH: h } = state;
  const key = w + 'x' + h;
  if (FX.key !== key) {
    const sunX = w * 0.72, sunY = h * 0.16;
    const warm = ctx.createRadialGradient(sunX, sunY, 40, sunX, sunY, Math.max(w, h) * 0.95);
    warm.addColorStop(0, 'rgba(255,214,140,.14)');
    warm.addColorStop(0.5, 'rgba(255,214,140,.05)');
    warm.addColorStop(1, 'rgba(255,214,140,0)');
    const cool = ctx.createLinearGradient(0, h, w * 0.6, h * 0.2);
    cool.addColorStop(0, 'rgba(38,66,74,.12)');
    cool.addColorStop(1, 'rgba(38,66,74,0)');
    const vign = ctx.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.42, w / 2, h / 2, Math.max(w, h) * 0.78);
    vign.addColorStop(0, 'rgba(26,20,10,0)');
    vign.addColorStop(1, 'rgba(26,20,10,.17)');
    FX = { key, warm, cool, vign };
  }
  ctx.fillStyle = FX.warm; ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = FX.cool; ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = FX.vign; ctx.fillRect(0, 0, w, h);
}

function drawBackground(state, t) {
  const { ctx, viewW: w, viewH: h, camX, camY, draw } = state;
  const sx = -state.shakeX;
  const sy = -state.shakeY;

  // cielo de lámina: azul suave arriba → crema cálida al horizonte
  const sky = ctx.createLinearGradient(0, 0, 0, h);
  sky.addColorStop(0, AB.skyHi);
  sky.addColorStop(0.42, AB.skyMid);
  sky.addColorStop(0.72, AB.skyLo);
  sky.addColorStop(1, '#dfd7a2');
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, w, h);

  // esquina opuesta al sol un pelo más fría: el cielo deja de ser un gradiente muerto
  const coolSky = ctx.createLinearGradient(0, 0, w * 0.5, h * 0.4);
  coolSky.addColorStop(0, 'rgba(110,150,180,.16)');
  coolSky.addColorStop(1, 'rgba(110,150,180,0)');
  ctx.fillStyle = coolSky;
  ctx.fillRect(0, 0, w, h * 0.5);

  // sol: la fuente de luz ÚNICA de la lámina — bloom ancho, disco pintado en
  // gouache (centro claro, borde más hondo), halo doble delicado
  const sunX = w * 0.72, sunY = h * 0.16;
  const gSun = ctx.createRadialGradient(sunX, sunY, 0, sunX, sunY, 330);
  gSun.addColorStop(0, 'rgba(255,244,196,.85)');
  gSun.addColorStop(0.28, 'rgba(255,232,158,.34)');
  gSun.addColorStop(1, 'rgba(255,232,158,0)');
  ctx.fillStyle = gSun;
  ctx.fillRect(0, 0, w, h);
  ctx.strokeStyle = 'rgba(255,250,220,.38)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(sunX, sunY, 64, 0, Math.PI * 2);
  ctx.stroke();
  ctx.strokeStyle = 'rgba(255,250,220,.16)';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(sunX, sunY, 86, 0, Math.PI * 2);
  ctx.stroke();
  const gCore = ctx.createRadialGradient(sunX - 7, sunY - 7, 2, sunX, sunY, 46);
  gCore.addColorStop(0, '#fffdf0');
  gCore.addColorStop(0.55, '#ffefb4');
  gCore.addColorStop(0.9, '#f7d488');
  gCore.addColorStop(1, 'rgba(247,212,136,0)');
  ctx.fillStyle = gCore;
  ctx.beginPath();
  ctx.arc(sunX, sunY, 46, 0, Math.PI * 2);
  ctx.fill();

  // nubes lentas que respiran (deriva + morph sutil, ya no son estampas quietas)
  for (let i = 0; i < 5; i++) {
    const span = w + 460;
    let px = (i * 430 + hashArt(i) * 260 - camX * 0.06 - t * 4.5) % span;
    if (px < 0) px += span;
    px -= 230;
    const py = h * (0.1 + hashArt(i, 3) * 0.13) + Math.sin(t * 0.17 + i * 2.6) * 4;
    const cs = (0.65 + hashArt(i, 7) * 0.75) * (1 + Math.sin(t * 0.13 + i * 2.2) * 0.02);
    blit(ctx, draw.nube[i % 3], px, py, cs, Math.sin(t * 0.11 + i) * 0.015, 0.9);
  }

  // estratos finitos pegados al horizonte (capa extra de cielo)
  for (let i = 0; i < 3; i++) {
    const sw2 = 180 + hashArt(i, 31) * 240;
    let sxp = (i * 520 + hashArt(i, 33) * 300 - camX * 0.04 - t * 2.5) % (w + sw2 * 2);
    if (sxp < 0) sxp += w + sw2 * 2;
    sxp -= sw2;
    const syp = h * (0.3 + hashArt(i, 35) * 0.08);
    ctx.fillStyle = 'rgba(250,248,236,.38)';
    ctx.beginPath();
    ctx.roundRect(sxp, syp, sw2, 7 + hashArt(i, 37) * 5, 6);
    ctx.fill();
  }

  // golondrinas lejanas cruzando el valle
  ctx.strokeStyle = 'rgba(40,44,38,.5)';
  ctx.lineWidth = 1.4;
  ctx.lineCap = 'round';
  for (let i = 0; i < 7; i++) {
    const fx = ((i * 210 + hashArt(i, 11) * 160 + t * (6 + i)) % (w + 200)) - 100;
    const fy = h * (0.1 + hashArt(i, 5) * 0.2) + Math.sin(t * 0.9 + i * 2.1) * 6;
    const fl = Math.sin(t * 7 + i * 1.7) * 2.2;
    const bs = 3.5 + hashArt(i, 9) * 2.5;
    ctx.beginPath();
    ctx.moveTo(fx - bs, fy);
    ctx.quadraticCurveTo(fx - bs * 0.4, fy - 2.6 - fl, fx, fy);
    ctx.quadraticCurveTo(fx + bs * 0.4, fy - 2.6 - fl, fx + bs, fy);
    ctx.stroke();
  }

  // corriente de aire en el tramo donde se planea (L7 -> L8): hojitas que
  // suben marcan la senda; si ves las hojas, vas por el carril correcto
  for (let i = 0; i < 7; i++) {
    const minY = 180;
    const maxY = 360;
    const x0 = 3250;
    const span = 120;
    let ly = maxY - ((t * (26 + hashArt(i, 41) * 18) + i * 47) % (maxY - minY));
    const lx = x0 + hashArt(i, 43) * span + Math.sin(t * 1.4 + i * 1.9) * 14;
    const sy = ly - camY;
    const sx = lx - camX;
    if (sx < -40 || sx > w + 40 || sy < -40 || sy > h + 40) continue;
    ctx.save();
    ctx.translate(sx, sy);
    ctx.rotate(Math.sin(t * 3 + i * 2.3) * 0.6 + Math.PI * 0.25);
    ctx.fillStyle = 'rgba(122,150,86,.6)';
    ctx.strokeStyle = 'rgba(60,80,40,.35)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.ellipse(0, 0, 3.6, 1.9, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  }

  // cordillera con perspectiva aérea + surcos de cafetal en las laderas
  const ridgePath = (par, base, a1, a2, f1, f2) => {
    const path = new Path2D();
    path.moveTo(-90, h + 40);
    for (let i = 0; i <= 24; i++) {
      const x = (i / 24) * (w + 180) - 90;
      const wx = x + camX * par;
      path.lineTo(x, base + Math.sin(wx * f1) * a1 + Math.cos(wx * f2) * a2);
    }
    path.lineTo(w + 90, h + 40);
    path.closePath();
    return path;
  };
  const surcos = (par, base, a1, a2, f1, f2, rows, gap, col, lw) => {
    ctx.strokeStyle = col;
    ctx.lineWidth = lw;
    ctx.lineCap = 'round';
    for (let j = 0; j < rows; j++) {
      const off = 22 + j * gap;
      ctx.beginPath();
      let started = false;
      for (let x = -20; x <= w + 20; x += 24) {
        const wx = x + camX * par;
        const y = base + off + Math.sin(wx * f1) * a1 * 0.82 + Math.cos(wx * f2) * a2 * 0.82;
        if (!started) { ctx.moveTo(x, y); started = true; }
        else ctx.quadraticCurveTo(x - 12, y - 7, x, y);
      }
      ctx.stroke();
    }
  };

  // cordillera lejanísima, casi disuelta en cielo (perspectiva aérea real)
  ctx.save();
  ctx.translate(sx * 0.1, sy * 0.06);
  const farther = ridgePath(0.025, h * 0.385, 18, 9, 0.0026, 0.0015);
  ctx.fillStyle = AB.ridgeHaze;
  ctx.fill(farther);
  ctx.restore();
  const haze0 = ctx.createLinearGradient(0, h * 0.36, 0, h * 0.46);
  haze0.addColorStop(0, 'rgba(244,246,232,0)');
  haze0.addColorStop(1, 'rgba(244,246,232,.4)');
  ctx.fillStyle = haze0;
  ctx.fillRect(0, h * 0.36, w, h * 0.1);

  ctx.save();
  ctx.translate(sx * 0.16, sy * 0.1);
  const far = ridgePath(0.05, h * 0.44, 24, 13, 0.0034, 0.0019);
  ctx.fillStyle = AB.ridgeFar;
  ctx.fill(far);
  ctx.restore();

  // banda de niebla entre cordilleras
  const mist = ctx.createLinearGradient(0, h * 0.42, 0, h * 0.58);
  mist.addColorStop(0, 'rgba(244,246,228,0)');
  mist.addColorStop(0.55, AB.mist);
  mist.addColorStop(1, 'rgba(244,246,228,0)');
  ctx.fillStyle = mist;
  ctx.fillRect(0, h * 0.4, w, h * 0.2);

  ctx.save();
  ctx.translate(sx * 0.24, sy * 0.14);
  const mid = ridgePath(0.14, h * 0.53, 30, 14, 0.005, 0.0031);
  ctx.fillStyle = AB.ridgeMid;
  ctx.fill(mid);
  ctx.save();
  ctx.clip(mid);
  surcos(0.14, h * 0.53, 30, 14, 0.005, 0.0031, 3, 30, AB.rowDark, 5);
  ctx.restore();
  ctx.restore();

  ctx.save();
  ctx.translate(sx * 0.34, sy * 0.2);
  const near = ridgePath(0.26, h * 0.63, 34, 13, 0.0058, 0.0036);
  ctx.fillStyle = AB.ridgeNear;
  ctx.fill(near);
  ctx.save();
  ctx.clip(near);
  surcos(0.26, h * 0.63, 34, 13, 0.0058, 0.0036, 4, 34, AB.rowNear, 6.5);
  ctx.restore();
  ctx.restore();

  // valle intermedio: lomo de cafetal sembrado en hileras, entre la cordillera
  // y la fila jugable (la capa que faltaba para que el fondo tuviera cuerpo)
  ctx.save();
  ctx.translate(sx * 0.42, sy * 0.26);
  const vp = ridgePath(0.4, h * 0.66, 24, 9, 0.0082, 0.005);
  const vg = ctx.createLinearGradient(0, h * 0.6, 0, h);
  vg.addColorStop(0, AB.valley);
  vg.addColorStop(1, AB.valleyDark);
  ctx.fillStyle = vg;
  ctx.fill(vp);
  ctx.save();
  ctx.clip(vp);
  // el sol le pega al lomo por la derecha
  const vlg = ctx.createLinearGradient(w, h * 0.6, 0, h * 0.92);
  vlg.addColorStop(0, 'rgba(255,242,170,.16)');
  vlg.addColorStop(1, 'rgba(16,40,20,.24)');
  ctx.fillStyle = vlg;
  ctx.fillRect(0, h * 0.55, w, h * 0.45);
  // matas de café en hileras: puntos con brillito, se leen como cultivo de verdad
  for (let j = 0; j < 4; j++) {
    const off = 16 + j * 21;
    for (let x = -20; x <= w + 20; x += 26) {
      const wx = x + camX * 0.4;
      const yv = h * 0.66 + off + Math.sin(wx * 0.0082) * 20.4 + Math.cos(wx * 0.005) * 7.6;
      const rr = 4 + j * 1.1;
      const xo = x + (j % 2) * 13;
      ctx.fillStyle = j % 2 ? 'rgba(26,58,28,.55)' : 'rgba(20,48,24,.5)';
      ctx.beginPath(); ctx.ellipse(xo, yv, rr, rr * 0.78, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = 'rgba(150,196,96,.38)';
      ctx.beginPath(); ctx.ellipse(xo + rr * 0.3, yv - rr * 0.36, rr * 0.5, rr * 0.34, 0, 0, Math.PI * 2); ctx.fill();
    }
  }
  ctx.restore();
  // casitas en el lomo, ancladas al mundo (misma fórmula del lomo → bien sentadas)
  for (const hx of [640, 2620]) {
    const pxc = hx - camX * 0.4;
    if (pxc < -90 || pxc > w + 90) continue;
    const gyc = h * 0.66 + Math.sin(hx * 0.0082) * 24 + Math.cos(hx * 0.005) * 9 + 5;
    drawCasita(ctx, pxc, gyc, t);
  }
  ctx.restore();

  // franja de sombrío: guamos, plátanos y cafetos ilustrados en parallax
  ctx.save();
  for (const deco of state.level.decorations) {
    const px = deco.x - camX * (0.35 + deco.layer * 0.35) + sx * (0.4 + deco.layer * 0.3);
    if (px < -260 || px > w + 260) continue;
    const baseY = h * 0.62 + deco.layer * 76 - camY * (0.05 + deco.layer * 0.1);
    const sway = Math.sin(deco.sway + t * 0.4) * (deco.kind === 'shade' ? 0.04 : 0.05);
    let spr, s;
    if (deco.kind === 'shade') {
      spr = draw.sombrio[deco.sway > 3 ? 1 : 0];
      s = deco.s * 0.72;
    } else if (deco.hue > 0.84) {
      spr = draw.platano[deco.sway > 3 ? 1 : 0];
      s = deco.s * 0.7;
    } else {
      spr = draw.cafeto[(deco.hue * 13 | 0) % 3];
      s = deco.s * 0.78;
    }
    blit(ctx, spr, px, baseY, s, sway, 0.68 + deco.layer * 0.32);
  }
  ctx.restore();

  // bruma aérea sobre la franja de sombrío (separa el fondo de la fila jugable)
  const haze2 = ctx.createLinearGradient(0, h * 0.56, 0, h * 0.78);
  haze2.addColorStop(0, 'rgba(238,244,222,0)');
  haze2.addColorStop(0.5, 'rgba(238,244,222,.2)');
  haze2.addColorStop(1, 'rgba(238,244,222,0)');
  ctx.fillStyle = haze2;
  ctx.fillRect(0, h * 0.54, w, h * 0.26);

  // seto de cafetos jóvenes justo detrás de la fila jugable: asienta el terreno
  // y tapa los pies de los árboles del fondo (anclado al mundo en Y)
  const parH = 0.86;
  const hedgeY = 9.42 * TILE - camY;
  const j0 = Math.floor((camX * parH - 80) / 66);
  const j1 = Math.ceil((camX * parH + w + 80) / 66);
  for (let j = j0; j <= j1; j++) {
    const px2 = j * 66 - camX * parH;
    const bw2 = 40 + hashArt(j * 3.7, 41) * 22;
    const bh2 = 26 + hashArt(j * 5.1, 43) * 12;
    const by2 = hedgeY + hashArt(j * 7.7, 45) * 10;
    ctx.fillStyle = '#274f28';
    ctx.beginPath(); ctx.ellipse(px2, by2, bw2 * 0.62, bh2 * 0.7, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#356632';
    ctx.beginPath(); ctx.ellipse(px2 + 3, by2 - 6, bw2 * 0.52, bh2 * 0.52, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = 'rgba(140,186,87,.5)';
    ctx.beginPath(); ctx.ellipse(px2 + bw2 * 0.16, by2 - bh2 * 0.42, bw2 * 0.3, bh2 * 0.22, -0.2, 0, Math.PI * 2); ctx.fill();
  }

  // haces de luz colándose desde el sol en diagonal (la MISMA fuente de luz)
  ctx.save();
  ctx.translate(sunX, sunY);
  ctx.rotate(2.28);
  for (let i = 0; i < 3; i++) {
    const bw3 = 60 + i * 46;
    const off3 = -150 + i * 190;
    const ba = 0.05 + 0.024 * Math.sin(t * 0.5 + i * 1.8);
    const bg = ctx.createLinearGradient(0, 0, h * 1.15, 0);
    bg.addColorStop(0, `rgba(255,240,190,${(ba * 1.5).toFixed(3)})`);
    bg.addColorStop(1, 'rgba(255,240,190,0)');
    ctx.fillStyle = bg;
    ctx.fillRect(60, off3, h * 1.15, bw3);
  }
  ctx.restore();

  // niebla del piso, muy leve
  const fog = ctx.createLinearGradient(0, h * 0.5, 0, h);
  fog.addColorStop(0, 'rgba(240,246,226,0)');
  fog.addColorStop(1, 'rgba(240,246,226,.16)');
  ctx.fillStyle = fog;
  ctx.fillRect(0, h * 0.5, w, h * 0.5);

  // polvo de luz flotando en el aire cálido (mood)
  for (let i = 0; i < 16; i++) {
    const mo = w + 80;
    const mx = ((hashArt(i, 21) * mo - t * (5 + hashArt(i, 23) * 9)) % mo + mo) % mo - 40;
    const my = h * (0.3 + hashArt(i, 25) * 0.52) + Math.sin(t * 0.6 + i * 1.9) * 14;
    const ma = 0.1 + 0.15 * (0.5 + 0.5 * Math.sin(t * 0.8 + i * 2.4));
    ctx.fillStyle = `rgba(255,241,196,${ma.toFixed(3)})`;
    ctx.beginPath();
    ctx.arc(mx, my, 1.1 + hashArt(i, 27) * 1.6, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawTile(ctx, tile, x, y) {
  if (!ART) return;
  const tt = LEVEL.tileTypes;
  let img = null;
  if (tile === tt.TOP) img = ART.tiles.top[(hashArt(x * 0.013, y * 0.017) * 3) | 0];
  else if (tile === tt.SOIL) img = ART.tiles.soil[(hashArt(x * 0.011, y * 0.019) * 3) | 0];
  else if (tile === tt.PLATFORM) img = ART.tiles.plat;
  else if (tile === tt.ROOT) img = ART.tiles.root;
  if (img) ctx.drawImage(img, x, y, TILE, TILE);
}

// Cresta vegetal de talud: masa festoneada en tres capas (sombra, cuerpo, luz)
// siguiendo una curva cuadrática — el mismo idioma que el borde de pasto de los
// tiles de superficie. Determinista por posición de mundo (hashArt), sin hojas
// contables: la vegetación de borde se lee como masa, nunca como línea.
function taludBand(ctx, x0, y0, cx, cy, x1, y1, seed, scale = 1) {
  const q = (tt) => {
    const u = 1 - tt;
    return [u * u * x0 + 2 * u * tt * cx + tt * tt * x1, u * u * y0 + 2 * u * tt * cy + tt * tt * y1];
  };
  let len = 0;
  let px = x0;
  let py = y0;
  for (let i = 1; i <= 8; i++) {
    const [sx, sy] = q(i / 8);
    len += Math.hypot(sx - px, sy - py);
    px = sx;
    py = sy;
  }
  const n = Math.max(3, Math.round(len / (11 * scale)));
  const capas = [
    ['rgba(28,52,24,.95)', 3.4, 1.14],
    [AB.leafMid, 0, 1],
    [AB.grassTop, -2.8, 0.78],
  ];
  for (const [color, dy, rs] of capas) {
    ctx.fillStyle = color;
    for (let i = 0; i <= n; i++) {
      const tt = i / n;
      const [sx, sy] = q(tt);
      const j = hashArt(seed + i * 7.13, i);
      const r = (5.8 + j * 4.6) * scale * rs;
      ctx.beginPath();
      ctx.ellipse(
        sx + (j - 0.5) * 4,
        sy + dy * scale + (hashArt(seed + i * 3.7, 5) - 0.5) * 2.5,
        r, r * 0.82, 0, 0, Math.PI * 2
      );
      ctx.fill();
    }
  }
  // beso de sol en el flanco derecho de algunas matas (la luz viene de arriba-derecha)
  ctx.strokeStyle = 'rgba(255,242,168,.4)';
  ctx.lineWidth = 2 * scale;
  ctx.lineCap = 'round';
  for (let i = 0; i <= n; i += 3) {
    const [sx, sy] = q(i / n);
    ctx.beginPath();
    ctx.arc(sx + 1.5, sy - 2.5 * scale, 5.4 * scale, -1.45, -0.3);
    ctx.stroke();
  }
  // cereza caída muy de vez en cuando: acento cálido minoritario sobre el verde
  for (let i = 0; i <= n; i++) {
    if (hashArt(seed + i * 11.7, 9) < 0.92) continue;
    const [sx, sy] = q(i / n);
    ctx.fillStyle = AB.cherry;
    ctx.strokeStyle = AB.inkSoft;
    ctx.lineWidth = 0.9;
    ctx.beginPath();
    ctx.arc(sx + 3, sy + 4.5 * scale, 2.1 * scale, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  }
}

function drawPlatformerWorld(state, t) {
  const { ctx, viewW: w, viewH: h, camX, camY } = state;
  const level = state.level;
  const startCol = clamp(Math.floor(camX / TILE) - 1, 0, WORLD.cols - 1);
  const endCol = clamp(Math.ceil((camX + w) / TILE) + 1, 0, WORLD.cols - 1);
  const startRow = clamp(Math.floor(camY / TILE) - 1, 0, WORLD.rows - 1);
  const endRow = clamp(Math.ceil((camY + h) / TILE) + 1, 0, WORLD.rows - 1);

  ctx.save();
  ctx.translate(-camX, -camY);
  const rows = groundRowsFor(level.tiles);
  const surf = surfaceRowsFor(level.tiles);
  const tt = LEVEL.tileTypes;
  for (let y = startRow; y <= endRow; y++) {
    for (let x = startCol; x <= endCol; x++) {
      const tile = level.tiles[y][x];
      if (!tile) {
        // La depresión conserva su colisión; esta capa solo pinta la cara del
        // banco para que el fondo no aparezca DENTRO de la tierra. Se pinta si
        // hay techo sólido en la MISMA columna (pozo cubierto bajo un banco) o
        // si hay tierra firme (no banco elevado) flanqueando a esta altura.
        // El aire abierto entre dos bancos NO se pinta: pintarlo levantaba
        // pilares rectangulares de tierra flotando junto a cada banco.
        let below = false;
        for (let z = y + 1; z < WORLD.rows; z++) {
          if (level.tiles[z][x]) { below = true; break; }
        }
        if (!below) continue;
        let rimY = -1;
        if (surf[x] >= 0 && surf[x] < y) {
          rimY = surf[x] + 1;
        } else {
          for (let d = 1; d <= 2 && rimY < 0; d++) {
            for (const s of [-1, 1]) {
              const nx = x + s * d;
              if (
                nx >= 0 && nx < WORLD.cols && level.tiles[y][nx] &&
                rows[nx] >= 0 && rows[nx] <= y
              ) {
                rimY = rows[nx];
                break;
              }
            }
          }
        }
        if (rimY >= 0) {
          drawTile(ctx, tt.SOIL, x * TILE, y * TILE);
          // penumbra del interior: se hunde con la hondura desde el borde,
          // para que la cara del pozo no quede plana y brillante como bloque
          const d = Math.min(0.42, 0.14 + (y - rimY) * 0.11);
          ctx.fillStyle = `rgba(18,11,5,${d.toFixed(3)})`;
          ctx.fillRect(x * TILE, y * TILE, TILE, TILE);
        }
        continue;
      }
      drawTile(ctx, tile, x * TILE, y * TILE);
      // el subsuelo se hunde en penumbra con la hondura (lámina de corte de suelo,
      // y de paso el ojo se queda en la fila jugable, no en la tierra)
      if (tile === tt.SOIL && rows[x] >= 0 && y > rows[x]) {
        const d = Math.min(0.4, (y - rows[x]) * 0.09);
        ctx.fillStyle = `rgba(18,11,5,${d.toFixed(3)})`;
        ctx.fillRect(x * TILE, y * TILE, TILE, TILE);
      }
    }
  }

  // Taludes: superposición de arte; el mapa de tiles y sus colisiones NO se
  // modifican. Se usa la SUPERFICIE real (incluye plataformas ROOT/PLATFORM).
  //
  // 1) Cada pozo abierto bajo un voladizo (plataforma flotando sobre el suelo
  //    base) recibe un talud DIAGONAL de toda su cara: de la esquina alta del
  //    voladizo baja en curva hasta el piso. Con esto la hondonada deja de
  //    leerse como rectángulo recortado, sin importar la hondura.
  // 2) Los desniveles de un tile (ondulaciones del suelo base) conservan el
  //    banquito curvo de siempre.
  const inPit = [];
  for (let x = 0; x < WORLD.cols; x++) {
    inPit[x] = rows[x] >= 0 && surf[x] >= 0 && rows[x] - surf[x] >= 2;
  }
  for (let c0 = Math.max(0, startCol - 1); c0 <= endCol; c0++) {
    if (!inPit[c0]) continue;
    let c1 = c0;
    while (c1 + 1 < WORLD.cols && inPit[c1 + 1]) c1++;
    const p = surf[c0];
    const f = rows[c0];
    if (f > p) {
      const x0 = c0 * TILE;
      const x1 = (c1 + 1) * TILE;
      const yA = (p + 1) * TILE + 2;
      const yB = f * TILE + 4;
      const yC = f * TILE + 10;
      const midX = (x0 + x1) / 2;
      const spanY = yB - yA;
      const cY = yA + spanY * 0.45;
      ctx.save();
      // Cara del talud ILUMINADA contra el interior en penumbra: sin este
      // contraste la cuña se fundía con la tierra pintada detrás y del talud
      // solo quedaba la línea de cresta, que se leía como alambre tensado.
      const grad = ctx.createLinearGradient(0, yA, 0, yC);
      grad.addColorStop(0, 'rgba(125,90,54,.96)');
      grad.addColorStop(1, 'rgba(70,48,26,.94)');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.moveTo(x0, yA);
      ctx.quadraticCurveTo(midX, cY, x1, yB);
      ctx.lineTo(x1, yC);
      ctx.lineTo(x0, yC);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = 'rgba(170,132,76,.45)';
      ctx.lineWidth = 1.4;
      for (let yy = yA + 14; yy < yC - 4; yy += 14) {
        const t = (yy - yA) / (yC - yA);
        const xL = x0 + (x1 - x0) * t * 0.55;
        const xR = x0 + (x1 - x0) * Math.min(1, t * 1.6);
        ctx.beginPath();
        ctx.moveTo(xL, yy);
        ctx.quadraticCurveTo((xL + xR) / 2, yy + 2, xR, yy + 5);
        ctx.stroke();
      }
      // Pies del banco: la cara no muere en vertical contra el aire abierto,
      // se derrama en talud corto hasta el suelo de al lado, por ambos lados.
      const footFill = ctx.createLinearGradient(0, yA, 0, yC);
      footFill.addColorStop(0, 'rgba(112,80,47,.94)');
      footFill.addColorStop(1, 'rgba(64,44,24,.9)');
      const feet = [];
      if (c0 > 0 && surf[c0 - 1] > p + 1 && rows[c0 - 1] >= 0) {
        feet.push([x0 + 1, -1, rows[c0 - 1] * TILE + 8]);
      }
      if (c1 + 1 < WORLD.cols && surf[c1 + 1] > p + 1 && rows[c1 + 1] >= 0) {
        feet.push([x1 - 1, 1, rows[c1 + 1] * TILE + 8]);
      }
      for (const [fx, dir, fy] of feet) {
        ctx.fillStyle = footFill;
        ctx.beginPath();
        ctx.moveTo(fx, yA - 4);
        ctx.quadraticCurveTo(fx + dir * 9, fy - (fy - yA) * 0.42, fx + dir * 34, fy);
        ctx.lineTo(fx, fy);
        ctx.closePath();
        ctx.fill();
        taludBand(ctx, fx, yA - 2, fx + dir * 11, fy - (fy - yA) * 0.4, fx + dir * 32, fy - 2, c0 * 3.1 + dir, 0.72);
      }
      // Cresta: masa vegetal festoneada, no línea — el borde del talud es
      // pasto plegándose sobre la caída, con acento cálido muy minoritario.
      taludBand(ctx, x0, yA + 2, midX, cY + 2, x1, yB + 2, c0 * 1.7, 1);
      ctx.restore();
    }
    c0 = c1;
  }

  // 2) desniveles simples de un tile (sin voladizo): banquito curvo de pasto.
  for (let x = Math.max(1, startCol); x <= endCol; x++) {
    if (inPit[x - 1] || inPit[x]) continue;
    const left = surf[x - 1];
    const right = surf[x];
    if (left < 0 || right < 0 || left === right) continue;
    const high = Math.min(left, right);
    const low = Math.max(left, right);
    const depth = low - high;
    const edge = x * TILE;
    const side = right > left ? 1 : -1;
    const y0 = high * TILE + 10;
    const y1 = low * TILE + 8;
    const span = depth * TILE;
    const spread = Math.min(56, 22 + depth * 9);
    ctx.save();
    // Un talud ancho rompe la esquina de 90° que dejan dos niveles contiguos.
    // La curva termina sobre el pasto inferior en vez de formar un rectángulo.
    const bank = ctx.createLinearGradient(edge, y0, edge + side * spread, y1);
    bank.addColorStop(0, 'rgba(118,85,50,.92)');
    bank.addColorStop(1, 'rgba(66,45,24,.85)');
    ctx.fillStyle = bank;
    ctx.beginPath();
    ctx.moveTo(edge - side * 8, y0);
    ctx.quadraticCurveTo(edge + side * spread, y0 + span * 0.55, edge + side * (spread + 13), y1 - 14);
    ctx.quadraticCurveTo(edge + side * (spread - 3), y1 + 7, edge + side * 3, y1 + 9);
    ctx.lineTo(edge + side * 2, y0 + 18);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = 'rgba(160,124,70,.42)';
    ctx.lineWidth = 1.4;
    for (let py = y0 + 17; py < y1 - 4; py += 14) {
      ctx.beginPath();
      const ss = 8 + (py - y0) * 0.28;
      ctx.moveTo(edge + side * 4, py);
      ctx.quadraticCurveTo(edge + side * ss, py + 2, edge + side * (ss + 5), py + 6);
      ctx.stroke();
    }
    // Mejilla del corte (v5): en una MUESCA (la superficie vuelve a subir en
    // pocas columnas: un pozo, no una ladera) el banquito no alcanza — las
    // paredes son costuras de tile rectas: arriba el relleno oscuro del
    // vacío contra el pasto vecino, abajo el tile de piso a plena luz contra
    // el subsuelo sombreado del vecino (medido: saltos de luma 18-26 en el
    // pozo izquierdo, vivos hasta (low+1)*TILE). Tierra desmoronada sobre
    // la pared: arranca del lado ALTO de la juntura para taparla, cae
    // cóncava con codos irregulares y derrama la base sobre el rincón del
    // piso. Solo en muescas y cortes hondos: los escalones de ladera (el
    // talud derecho que ya cerró) no se tocan. Sin verde nuevo en el pozo.
    let esPozo = false;
    for (let k = 1; k <= 4 && !esPozo; k++) {
      const cx2 = side > 0 ? x + k : x - 1 - k;
      if (cx2 < 0 || cx2 >= WORLD.cols || surf[cx2] < 0) break;
      if (surf[cx2] <= high) esPozo = true;
    }
    if (depth >= 2 || esPozo) {
      const yTop = y0 + 8;
      const yBase = (low + 1) * TILE + 6;
      const hh = yBase - yTop;
      const reach = Math.min(40, 16 + depth * 8);
      const cheek = ctx.createLinearGradient(0, yTop, 0, yBase);
      cheek.addColorStop(0, 'rgba(122,88,52,.94)');
      cheek.addColorStop(1, 'rgba(62,43,23,.9)');
      ctx.fillStyle = cheek;
      ctx.beginPath();
      ctx.moveTo(edge - side * 6, yTop);
      let cpx = edge - side * 6;
      let cpy = yTop;
      for (let s = 1; s <= 3; s++) {
        const st = s / 3;
        const bow = 0.3 + st * st * 0.7;
        const nx = edge + side * reach * bow * (0.82 + hashArt(x * 5.3 + s, 2) * 0.34);
        const ny = yTop + hh * st;
        ctx.quadraticCurveTo(
          (cpx + nx) / 2 + side * (hashArt(x * 3.7 + s, 4) - 0.5) * 13,
          (cpy + ny) / 2 + 4,
          nx, ny
        );
        cpx = nx;
        cpy = ny;
      }
      ctx.lineTo(edge - side * 6, yBase);
      ctx.closePath();
      ctx.fill();
      // estratos cortos interiores; NO tocan la silueta (una línea fina al
      // borde ya se leyó como alambre en pasadas anteriores)
      ctx.strokeStyle = 'rgba(170,132,76,.4)';
      ctx.lineWidth = 1.4;
      for (let yy = yTop + 11; yy < yBase - 8; yy += 13) {
        const st = (yy - yTop) / hh;
        const wSeg = reach * (0.26 + st * 0.5);
        ctx.beginPath();
        ctx.moveTo(edge - side * 2, yy);
        ctx.quadraticCurveTo(edge + side * wSeg * 0.6, yy + 2, edge + side * wSeg, yy + 4);
        ctx.stroke();
      }
      // terrones sobre el contorno: el borde se quiebra como masa
      ctx.fillStyle = 'rgba(94,67,39,.9)';
      for (let s = 0; s <= 5; s++) {
        const st = s / 5;
        const bow = 0.3 + st * st * 0.7;
        const bx = edge + side * reach * bow * (0.76 + hashArt(x * 7.1 + s, 3) * 0.36);
        const by = yTop + 6 + (hh - 12) * st;
        const br = 3 + hashArt(x * 9.7 + s, 6) * 4;
        ctx.beginPath();
        ctx.ellipse(bx, by, br, br * 0.8, 0, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    // Borde del banquito: masa vegetal festoneada, no línea (una línea fina
    // sobre tierra parda se leía como alambre colgando dentro del pozo).
    taludBand(
      ctx,
      edge - side * 10, y0 + 10,
      edge + side * (spread - 4), y0 + 20,
      edge + side * (spread + 12), y1 + 2,
      x * 2.9, 0.8
    );
    ctx.restore();
  }

  // matas de café sobre la fila de suelo: el cafetal jugable, misma mano.
  // Van DESPUÉS de los taludes para que la base del banco no las tape.
  const drawR = state.draw;
  for (let x = startCol; x <= endCol; x++) {
    const gy = rows[x];
    if (gy < 0) continue;
    const k = hashArt(x * 1.7);
    if (k > 0.82) continue;
    const isBankFloor =
      (x > 0 && surf[x - 1] >= 0 && surf[x - 1] < gy) ||
      (x < WORLD.cols - 1 && surf[x + 1] >= 0 && surf[x + 1] < gy);
    // Las matas del fondo del valle van más chicas para no tapar la cara del
    // banco, pero PLANTADAS sobre su pasto: hundir el ancla las enterraba.
    const s = (0.8 + hashArt(x * 2.3) * 0.4) * (isBankFloor ? 0.58 : 1);
    const sway = Math.sin(t * 0.6 + x * 1.3) * 0.02;
    blit(ctx, drawR.mata[(k * 11 | 0) % 3], x * TILE + 32, gy * TILE + (isBankFloor ? 7 : 4), s, sway);
  }
  ctx.restore();

  // meta: portal de madera del cafetal con guirnalda de café
  const goal = level.goal;
  const gx = goal.x - camX;
  const gy = goal.y - camY;
  ctx.save();
  ctx.translate(gx, gy);
  ctx.globalAlpha = state.goalUnlocked ? 1 : 0.78;
  const gcx = goal.w * 0.48;
  ctx.fillStyle = 'rgba(42,28,16,.16)';
  ctx.beginPath();
  ctx.ellipse(gcx, goal.h - 8, 54, 13, 0, 0, Math.PI * 2);
  ctx.fill();
  if (state.goalUnlocked) {
    const glow = ctx.createRadialGradient(gcx, goal.h * 0.4, 10, gcx, goal.h * 0.4, 90);
    glow.addColorStop(0, 'rgba(255,244,190,.34)');
    glow.addColorStop(1, 'rgba(255,244,190,0)');
    ctx.fillStyle = glow;
    ctx.fillRect(gcx - 95, goal.h * 0.4 - 95, 190, 190);
  }
  // postes de madera con tinta
  const poste = (px) => {
    ctx.strokeStyle = AB.ink;
    ctx.lineCap = 'round';
    ctx.lineWidth = 12;
    ctx.beginPath(); ctx.moveTo(px, goal.h - 10); ctx.lineTo(px + 2, 16); ctx.stroke();
    ctx.strokeStyle = AB.wood;
    ctx.lineWidth = 8;
    ctx.beginPath(); ctx.moveTo(px, goal.h - 10); ctx.lineTo(px + 2, 16); ctx.stroke();
    ctx.strokeStyle = 'rgba(190,150,100,.5)';
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(px - 2, goal.h - 14); ctx.lineTo(px, 20); ctx.stroke();
  };
  poste(13);
  poste(goal.w - 17);
  // travesaño con comba
  ctx.strokeStyle = AB.ink;
  ctx.lineWidth = 11;
  ctx.beginPath(); ctx.moveTo(4, 18); ctx.quadraticCurveTo(gcx, 26, goal.w - 6, 18); ctx.stroke();
  ctx.strokeStyle = AB.woodDark;
  ctx.lineWidth = 7;
  ctx.beginPath(); ctx.moveTo(4, 18); ctx.quadraticCurveTo(gcx, 26, goal.w - 6, 18); ctx.stroke();
  // guirnalda de hojas y cerezas colgando del travesaño (acento)
  for (let i = 0; i < 6; i++) {
    const lx = 12 + (i / 5) * (goal.w - 24);
    const ly = 24 + Math.sin(i * 2.1) * 2 + Math.sin(t * 1.4 + i) * 1.2;
    ctx.fillStyle = i % 2 ? AB.leafMid : AB.leafDark;
    ctx.strokeStyle = AB.inkSoft;
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.ellipse(lx, ly + 6, 4, 7.5, Math.sin(i) * 0.3, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    if (i % 3 === 1) {
      ctx.fillStyle = AB.cherry;
      ctx.beginPath(); ctx.arc(lx + 4, ly + 12, 2.6, 0, Math.PI * 2); ctx.fill();
      ctx.stroke();
    }
  }
  // letrero colgante
  const swayS = Math.sin(t * 1.1) * 0.03;
  ctx.save();
  ctx.translate(gcx, 26);
  ctx.rotate(swayS);
  ctx.strokeStyle = AB.ink;
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  ctx.moveTo(-16, 0); ctx.lineTo(-13, 14);
  ctx.moveTo(16, 0); ctx.lineTo(13, 14);
  ctx.stroke();
  ctx.fillStyle = AB.paper;
  ctx.strokeStyle = AB.ink;
  ctx.lineWidth = 2.4;
  ctx.beginPath();
  const bw = 46, bh = 24;
  ctx.roundRect(-bw / 2, 14, bw, bh, 5);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = AB.ink;
  ctx.font = 'italic 13px Georgia,serif';
  ctx.textAlign = 'center';
  ctx.fillText('Salida', 0, 30);
  ctx.restore();
  // banderín cuando la meta está abierta
  if (state.goalUnlocked) {
    ctx.save();
    ctx.translate(goal.w - 15, 16);
    ctx.fillStyle = AB.cherry;
    ctx.strokeStyle = AB.ink;
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.quadraticCurveTo(14 + Math.sin(t * 5) * 2, 4 + Math.sin(t * 5 + 1) * 2, 24, 8);
    ctx.quadraticCurveTo(14 + Math.sin(t * 5) * 2, 10, 0, 12);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  }
  ctx.fillStyle = AB.ink;
  ctx.font = 'italic 14px Georgia,serif';
  ctx.textAlign = 'center';
  ctx.fillText(level.meta, gcx, goal.h + 18);
  ctx.restore();
}

function drawSeeds(state, t) {
  const { ctx, camX, camY } = state;
  for (const seed of state.level.seeds) {
    if (seed.collected) continue;
    const meta = SEED_META[seed.kind];
    const x = seed.x - camX;
    const y = seed.y - camY;
    const bob = Math.sin(t * 3 + seed.spin) * 4;
    ctx.save();
    ctx.translate(x, y + bob);
    // halo suave para que se lea como recolectable
    const halo = ctx.createRadialGradient(0, 0, 2, 0, 0, 20);
    halo.addColorStop(0, 'rgba(255,250,220,.4)');
    halo.addColorStop(1, 'rgba(255,250,220,0)');
    ctx.fillStyle = halo;
    ctx.beginPath();
    ctx.arc(0, 0, 20, 0, Math.PI * 2);
    ctx.fill();
    ctx.rotate(Math.sin(t * 2 + seed.spin) * 0.28);
    // semilla entintada con surco y brote
    ctx.fillStyle = meta.color;
    ctx.strokeStyle = AB.ink;
    ctx.lineWidth = 2.4;
    ctx.beginPath();
    ctx.ellipse(0, 1, 8, 10.5, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.strokeStyle = 'rgba(42,28,16,.4)';
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.moveTo(0, -7.5);
    ctx.quadraticCurveTo(-2.5, 1, 0, 9);
    ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,240,.5)';
    ctx.beginPath();
    ctx.ellipse(-2.6, -3.5, 2.2, 3.2, -0.4, 0, Math.PI * 2);
    ctx.fill();
    // brote: dos hojitas
    ctx.strokeStyle = AB.ink;
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.moveTo(0, -9);
    ctx.quadraticCurveTo(0.5, -13, 0, -15);
    ctx.stroke();
    ctx.fillStyle = AB.leafLite;
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.ellipse(-3.4, -15, 3.4, 1.9, -0.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = AB.leafMid;
    ctx.beginPath();
    ctx.ellipse(3.2, -15.6, 3.2, 1.8, 0.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  }
  const p = state.level.powerUp;
  if (!p.collected) {
    const x = p.x - camX;
    const y = p.y - camY;
    const pulse = 0.95 + Math.sin(t * 4) * 0.07;
    ctx.save();
    ctx.translate(x, y);
    const g = ctx.createRadialGradient(0, 0, 0, 0, 0, 46);
    g.addColorStop(0, 'rgba(216,255,206,.9)');
    g.addColorStop(0.45, 'rgba(170,244,168,.35)');
    g.addColorStop(1, 'rgba(170,244,168,0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(0, 0, 46, 0, Math.PI * 2);
    ctx.fill();
    // esporas que suben
    for (let i = 0; i < 5; i++) {
      const ph = (t * 0.5 + i * 0.2) % 1;
      const sxp = Math.sin(i * 2.4 + t) * 12;
      ctx.globalAlpha = (1 - ph) * 0.7;
      ctx.fillStyle = '#eafbe2';
      ctx.beginPath();
      ctx.arc(sxp, 6 - ph * 34, 1.6 + (1 - ph), 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
    ctx.scale(pulse, pulse);
    // hongo blanco de Beauveria: tres bonetes suaves entintados
    const bonete = (bx, by, br) => {
      ctx.fillStyle = '#f2fbe9';
      ctx.strokeStyle = AB.ink;
      ctx.lineWidth = 2.2;
      ctx.beginPath();
      ctx.moveTo(bx - br, by + 4);
      ctx.quadraticCurveTo(bx, by - br * 1.5, bx + br, by + 4);
      ctx.quadraticCurveTo(bx, by + 1, bx - br, by + 4);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = 'rgba(169,196,139,.5)';
      ctx.beginPath();
      ctx.ellipse(bx, by + 3.4, br * 0.8, 2, 0, 0, Math.PI * 2);
      ctx.fill();
    };
    bonete(-9, 6, 8);
    bonete(9, 7, 7);
    bonete(0, -2, 10);
    ctx.restore();
  }
}

function drawEnemy(ctx, enemy, camX, camY, t) {
  if (!enemy.alive) {
    if (enemy.type === 'minador' && enemy.trailFade > 0) {
      drawMinador(ctx, enemy, camX, camY, t);
    }
    return;
  }
  if (enemy.cochinillaPoof > 0) return drawCochinillaPuff(ctx, enemy, camX, camY, t);
  if (enemy.type === 'minador') return drawMinador(ctx, enemy, camX, camY, t);
  if (enemy.type === 'cochinilla') return drawCochinilla(ctx, enemy, camX, camY, t);
  if (enemy.type === 'chinche') return drawChinche(ctx, enemy, camX, camY, t);
  if (enemy.type === 'cogollero') return drawCogollero(ctx, enemy, camX, camY, t);
  const x = enemy.x - camX;
  const y = enemy.y - camY;
  const ph = t * 9 + enemy.breathe;
  const step = Math.sin(ph);
  const hop = Math.abs(step) * 2.4;
  const squishY = (1 - Math.abs(step) * 0.07) * (1 + enemy.squash * 0.08);
  const squishX = 1 / squishY;
  const bo = boil(t, enemy.id);

  ctx.save();
  ctx.translate(x + enemy.w / 2, y + enemy.h / 2);

  // sombra en el piso, corrida a la izquierda (opuesta al sol; no sube con el brinquito)
  ctx.fillStyle = 'rgba(30,20,10,.24)';
  ctx.beginPath();
  ctx.ellipse(-2, enemy.h * 0.5 + 1, 15 + hop, 4.6, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.scale(enemy.dir, 1);
  ctx.translate(0, -hop);
  ctx.rotate(step * 0.09);
  ctx.scale(squishX, squishY);

  // patas de manguera negra con zapatones y polaina blanca (uniforme de villano
  // de los 30s), bien abiertas para que el arco se lea quieto
  const zapato = (px, py, r) => {
    ctx.fillStyle = '#241608';
    ctx.strokeStyle = AB.ink;
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    ctx.ellipse(px + 0.6, py, r * 1.25, r * 0.78, 0.05, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = AB.glove;
    ctx.beginPath();
    ctx.ellipse(px - r * 0.25, py - r * 0.42, r * 0.72, r * 0.5, -0.1, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = AB.ink;
    ctx.beginPath();
    ctx.arc(px - r * 0.3, py - r * 0.4, 0.55, 0, Math.PI * 2);
    ctx.fill();
  };
  const lift1 = Math.max(0, step) * 5;
  const lift2 = Math.max(0, -step) * 5;
  hoseLimb(ctx, -5, 8, -12 + step * 5, 15 - lift1, -13, 14 + bo, 3.2, AB.hose);
  zapato(-12 + step * 5, 15 - lift1, 4.6);
  hoseLimb(ctx, 3, 9, 9 - step * 5, 15 - lift2, 10, 14 - bo, 3.2, AB.hose);
  zapato(9 - step * 5, 15 - lift2, 4.6);

  // cuerpo: frijol oscuro con élitros y brillo
  const body = ctx.createLinearGradient(0, -11, 0, 12);
  body.addColorStop(0, '#241708');
  body.addColorStop(0.55, '#3a2a17');
  body.addColorStop(1, '#503a22');
  ctx.fillStyle = body;
  ctx.strokeStyle = AB.ink;
  ctx.lineWidth = 2.8;
  ctx.beginPath();
  ctx.ellipse(-2 + bo * 0.3, 0, 14.5, 10.5, -0.1, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  // línea de élitros + puntitos estriados (broca real los tiene)
  ctx.strokeStyle = 'rgba(20,12,5,.6)';
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  ctx.moveTo(-13, -2);
  ctx.quadraticCurveTo(-4, -4, -13, 6);
  ctx.stroke();
  ctx.fillStyle = 'rgba(255,244,214,.12)';
  for (let i = 0; i < 5; i++) {
    ctx.beginPath();
    ctx.arc(-11 + (i % 3) * 3.4, -4 + (i / 2 | 0) * 3.6, 0.8, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.fillStyle = 'rgba(255,250,230,.2)';
  ctx.beginPath();
  ctx.ellipse(-6, -5, 5.5, 3, -0.3, 0, Math.PI * 2);
  ctx.fill();
  // luz de borde cálida en el lomo (misma luz del mundo)
  ctx.strokeStyle = 'rgba(255,238,180,.4)';
  ctx.lineWidth = 1.8;
  ctx.beginPath();
  ctx.ellipse(-2 + bo * 0.3, 0, 13.2, 9.4, -0.1, -1.5, -0.35);
  ctx.stroke();

  // bracitos de manguera negra con guantotes: el delantero adelante-abajo, el
  // trasero ALZADO de villana — las dos mangueras se leen quietas
  hoseLimb(ctx, 2, -2, 13.5 + step * 3.4, 6.5 + Math.abs(step) * 1.2, 11, 12 - bo, 2.9, AB.hose);
  drawGlove(ctx, 13.5 + step * 3.4, 6.5 + Math.abs(step) * 1.2, 4.3);
  hoseLimb(ctx, -3, -3, -14 - step * 3, -9 + step * 1.5, -15, -1 + bo, 2.9, AB.hose);
  drawGlove(ctx, -14 - step * 3, -9 + step * 1.5, 4.1, 0, -1);

  // cabeza con trompa-taladro (la broca perfora la cereza)
  ctx.fillStyle = '#4d3a24';
  ctx.strokeStyle = AB.ink;
  ctx.lineWidth = 2.4;
  ctx.beginPath();
  ctx.ellipse(9, -4, 7.6, 6.8, 0.08, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.save();
  ctx.translate(15.5, -2.5);
  ctx.rotate(0.16 + step * 0.05);
  ctx.fillStyle = '#c9b48a';
  ctx.strokeStyle = AB.ink;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(0, -3.4);
  ctx.lineTo(10.5, -0.6);
  ctx.lineTo(10.5, 0.8);
  ctx.lineTo(0, 3.4);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.strokeStyle = 'rgba(42,28,16,.6)';
  ctx.lineWidth = 1.1;
  ctx.beginPath();
  ctx.moveTo(1.6, -2.4); ctx.lineTo(3.4, 2.6);
  ctx.moveTo(4.8, -1.8); ctx.lineTo(6.4, 2);
  ctx.moveTo(7.8, -1.2); ctx.lineTo(9, 1.4);
  ctx.stroke();
  ctx.restore();

  // ojos de pastel GRANDES pegados + ceño pesado de villana
  drawPieEye(ctx, 6.2, -7.4, 3.2, 4, 0.8, 0.5, 1.9, 2.4);
  drawPieEye(ctx, 12.2, -6.8, 3.6, 4.4, 0.9, 0.6, 2.1, 2.4);
  ctx.strokeStyle = AB.ink;
  ctx.lineWidth = 2.7;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(2.6, -12.4);
  ctx.quadraticCurveTo(9, -15 + bo * 0.4, 15.8, -11);
  ctx.stroke();

  // antenas acodadas con perilla (follow-through)
  ctx.lineWidth = 1.7;
  ctx.beginPath();
  ctx.moveTo(11, -11);
  ctx.quadraticCurveTo(13.5, -17, 17.5 - step * 1.4, -16.5);
  ctx.moveTo(6.5, -11.4);
  ctx.quadraticCurveTo(3.5, -17.5, 0.2 - step * 1.4, -16);
  ctx.stroke();
  ctx.fillStyle = AB.ink;
  ctx.beginPath();
  ctx.arc(17.5 - step * 1.4, -16.5, 1.5, 0, Math.PI * 2);
  ctx.arc(0.2 - step * 1.4, -16, 1.4, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}

let angLand = 0;      // memoria visual del aterrizaje (squash) — solo arte
let angPrevAir = false;
let angBlink = { next: 0, until: 0 }; // parpadeo: next=próximo inicio, until=cierra hasta

function drawPlayer(ctx, player, camX, camY, t) {
  const x = player.x - camX;
  const y = player.y - camY;
  const run = clamp(Math.abs(player.vx) / 220, 0, 1);
  const air = !player.onGround;
  const glide = player.glideActive;
  const rising = air && player.vy < -60;
  const ph = t * (4 + 9 * run) * 2.2;
  const stepA = Math.sin(ph);
  const stepB = Math.sin(ph + Math.PI);
  const bo = boil(t, 3);

  if (angPrevAir && !air) angLand = 1;
  angPrevAir = air;
  angLand *= 0.86;

  // squash & stretch conservando volumen, anclado a los pies
  let sy;
  if (air) sy = 1 + clamp(Math.abs(player.vy) / 1300, 0, 0.14);
  else sy = 1 + Math.abs(stepA) * 0.045 * run - angLand * 0.16;
  const sxx = 1 / sy;
  const lean = (player.vx / 220) * (air ? 0.09 : 0.12);
  const bob = air ? 0 : Math.abs(stepA) * 2.2 * run + Math.sin(t * 2.4) * 0.8 * (1 - run);

  ctx.save();
  ctx.translate(x + player.w / 2, y + player.h / 2);

  // sombra corrida a la izquierda (el sol está arriba-derecha, como en todo)
  ctx.fillStyle = `rgba(30,20,10,${air ? 0.1 : 0.2})`;
  ctx.beginPath();
  ctx.ellipse(-2.5, player.h * 0.5 + 1, 15, 4.6, 0, 0, Math.PI * 2);
  ctx.fill();

  if (player.invuln > 0 && Math.floor(t * 20) % 2 === 0) ctx.globalAlpha = 0.55;

  ctx.scale(player.facing, 1);
  ctx.rotate(lean);
  ctx.translate(0, 27 - bob);
  ctx.scale(sxx, sy);
  ctx.translate(0, -27);

  // aura Beauveria con esporas orbitando
  if (player.beauveria > 0) {
    const g = ctx.createRadialGradient(0, 0, 0, 0, 0, 48);
    g.addColorStop(0, 'rgba(190,255,170,.26)');
    g.addColorStop(1, 'rgba(190,255,170,0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(0, 0, 48, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = 'rgba(226,255,214,.85)';
    for (let i = 0; i < 3; i++) {
      const a = t * 3 + i * 2.1;
      ctx.beginPath();
      ctx.arc(Math.cos(a) * 26, Math.sin(a) * 20, 1.8, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // alas: aleteo lento en piso, zumbido al planear
  const flapSpeed = glide ? 42 : air ? 26 : 10;
  const flap = Math.sin(t * flapSpeed);
  const wingAlpha = glide ? 0.5 : 0.75;
  const ala = (wx, wy, rot, len, sc) => {
    ctx.save();
    ctx.translate(wx, wy);
    ctx.rotate(rot);
    ctx.scale(1, 0.45 + Math.abs(flap) * 0.65 * sc);
    ctx.fillStyle = AB.wing;
    ctx.strokeStyle = 'rgba(54,35,16,.3)';
    ctx.lineWidth = 1.3;
    ctx.globalAlpha *= wingAlpha;
    ctx.beginPath();
    ctx.ellipse(-len * 0.55, 0, len, len * 0.42, -0.28, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(-3, 0);
    ctx.quadraticCurveTo(-len * 0.6, -len * 0.2, -len, 0);
    ctx.stroke();
    // nervadura dibujada (la referencia lleva las alas a pluma): dos venas
    // más en abanico — de cerca son dibujo, a 40px el ala sigue siendo velo
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(-3, -0.5);
    ctx.quadraticCurveTo(-len * 0.55, -len * 0.34, -len * 0.9, -len * 0.18);
    ctx.moveTo(-3, 0.5);
    ctx.quadraticCurveTo(-len * 0.5, len * 0.12, -len * 0.86, len * 0.17);
    ctx.stroke();
    ctx.restore();
  };
  ala(-6, -6, -0.6 - flap * 0.25, 17, 1);
  ala(-5, -4, -0.15 - flap * 0.2, 14, 0.8);

  // poses de brazos y piernas según estado (arcos, nada rígido)
  let nearHand, farHand, nearFoot, farFoot, nearKnee, farKnee;
  if (glide) {
    // manos abiertas de planeo pero POR DEBAJO de la cara: el guante blanco
    // a la altura de los ojos se confundía con los propios ojos a 40px
    nearHand = [19, -3 + flap * 1.2];
    farHand = [-18, -4 - flap * 1.2];
    nearFoot = [-7, 24 + Math.sin(t * 8) * 1.4];
    farFoot = [-11, 21 + Math.sin(t * 8 + 1.2) * 1.4];
    nearKnee = [-2, 20]; farKnee = [-6, 17];
  } else if (rising) {
    nearHand = [12, -24];
    farHand = [-8, -22];
    nearFoot = [1, 19];
    farFoot = [-5, 21];
    nearKnee = [7, 14]; farKnee = [-9, 15];
  } else if (air) {
    nearHand = [16, 1 + Math.sin(t * 16) * 1.6];
    farHand = [-14, -1 + Math.sin(t * 16 + 1) * 1.6];
    nearFoot = [-3, 25];
    farFoot = [-8, 22];
    nearKnee = [3, 20]; farKnee = [-9, 17];
  } else if (run < 0.15) {
    // idle ESCAPARATE: la pose tiene que gritar rubber-hose en un fotograma
    // quieto — brazos en paréntesis con aire entre brazo y cuerpo, piernas
    // arqueadas, pies hacia afuera; solo respira, no cambia de silueta
    const brz = Math.sin(t * 2.4);
    // paréntesis SIMÉTRICO a la altura del cuerpo: la mano cercana estaba en
    // [17.5, -12] (altura de los ojos) y el guante + la manguera negra
    // tapaban media cara — era LA razón principal de "la cara se ve rara"
    nearHand = [17 + brz * 1.2, 0.5 + brz * 1.6];
    farHand = [-16.5 - brz, 0.5 + brz * 1.4];
    nearFoot = [9.5, 26];
    farFoot = [-10.5, 26];
    nearKnee = [14, 17 - brz * 0.7];
    farKnee = [-15, 17 + brz * 0.7];
  } else {
    // braceo amplio pero con tope: la mano no sube a taparle la boca
    nearHand = [12 + stepB * 10, 2 - stepB * 5];
    farHand = [-8 + stepA * 9, 2 - stepA * 5];
    nearFoot = [2 + stepA * 7.5 * run, 26 - Math.max(0, stepA) * 7 * run];
    farFoot = [2 + stepB * 7.5 * run, 26 - Math.max(0, stepB) * 7 * run];
    nearKnee = [7 + stepA * 6 * run, 18 - Math.max(0, stepA) * 5 * run];
    farKnee = [7 + stepB * 6 * run, 18 - Math.max(0, stepB) * 5 * run];
  }

  const bota = (bx, by, shade) => {
    // botica bulbosa clásica con brillo en la puntera
    ctx.fillStyle = shade ? '#7c5220' : '#8f5e22';
    ctx.strokeStyle = AB.ink;
    ctx.lineWidth = 2.2;
    ctx.beginPath();
    ctx.ellipse(bx + 2.2, by - 0.6, 6.2, 4.6, 0.12, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    if (!shade) {
      ctx.fillStyle = 'rgba(255,238,190,.5)';
      ctx.beginPath();
      ctx.ellipse(bx + 4.4, by - 2.4, 2.2, 1.3, 0.3, 0, Math.PI * 2);
      ctx.fill();
    }
  };

  // extremidades lejanas: manguera negra clásica (leve marrón = profundidad),
  // curvas MUY combadas para que se lean como tubo de goma aun quietas
  hoseLimb(ctx, -4, -1, farHand[0], farHand[1], (farHand[0] - 4) / 2 - 7, (farHand[1] - 1) / 2 + 7 + bo, 3.6, AB.hoseFar);
  drawGlove(ctx, farHand[0], farHand[1], 4.6, 0, -1);
  hoseLimb(ctx, -3, 10, farFoot[0], farFoot[1], farKnee[0], farKnee[1] + bo, 3.8, AB.hoseFar);
  bota(farFoot[0], farFoot[1], true);

  // abdomen de abejita con rayas (Angelita es abeja angelita, sin aguijón)
  ctx.save();
  ctx.rotate(-0.12);
  const abd = ctx.createLinearGradient(-18, -6, -2, 12);
  abd.addColorStop(0, '#ffd97f');
  abd.addColorStop(1, '#e2a53c');
  ctx.fillStyle = abd;
  ctx.strokeStyle = AB.ink;
  ctx.lineWidth = 2.8;
  ctx.beginPath();
  ctx.ellipse(-9, 5, 12.5, 9.6, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.save();
  ctx.beginPath();
  ctx.ellipse(-9, 5, 12.5, 9.6, 0, 0, Math.PI * 2);
  ctx.clip();
  ctx.fillStyle = AB.beeStripe;
  ctx.fillRect(-11.5, -6, 4.4, 22);
  ctx.fillRect(-19.5, -6, 4.4, 22);
  ctx.restore();
  ctx.fillStyle = 'rgba(255,255,240,.4)';
  ctx.beginPath();
  ctx.ellipse(-11, -0.5, 5, 2.8, -0.4, 0, Math.PI * 2);
  ctx.fill();
  // luz de borde cálida en el lomo del abdomen (misma luz del mundo)
  ctx.strokeStyle = 'rgba(255,240,185,.5)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.ellipse(-9, 5, 11.2, 8.4, 0, -1.35, -0.2);
  ctx.stroke();
  ctx.restore();

  // torso pequeño (peto de peluche de abeja)
  ctx.fillStyle = '#6b4a24';
  ctx.strokeStyle = AB.ink;
  ctx.lineWidth = 2.6;
  ctx.beginPath();
  ctx.ellipse(2, 3, 8, 9, 0.06, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.strokeStyle = 'rgba(255,236,190,.35)';
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  ctx.moveTo(-3, -2);
  ctx.quadraticCurveTo(2, -4.5, 7, -2.4);
  ctx.stroke();

  // pierna cercana: manguera negra, rodilla bien afuera (arco de goma)
  hoseLimb(ctx, 2, 10, nearFoot[0], nearFoot[1], nearKnee[0], nearKnee[1] - bo, 4.2, AB.hose);
  bota(nearFoot[0], nearFoot[1], false);

  // brazo cercano: delante del torso pero DETRÁS de la cabeza — el guante
  // blanco cruzaba por delante del mentón en cada zancada y a 40px se
  // fundía con el hocico crema en una sola masa clara ("cara rara").
  // Excepción: en el salto (puño arriba) sí va delante, es el gesto.
  const nearArm = () => {
    hoseLimb(ctx, 5, -1, nearHand[0], nearHand[1], (nearHand[0] + 5) / 2 + 8, (nearHand[1] - 1) / 2 + 8 - bo, 4.2, AB.hose);
    drawGlove(ctx, nearHand[0], nearHand[1], 5.4, stepB * 0.2);
  };
  if (!rising) nearArm();

  // cabeza grande y expresiva
  const hatLift = clamp(-player.vy / 650, 0, 5) + (glide ? 1.5 : 0);
  ctx.save();
  ctx.translate(0, air ? 0.6 : 0);
  // se resuelve UNA vez por cuadro: si la imagen terminara de cargar a mitad del
  // dibujo saldría media cabeza de cada técnica
  const conLamina = caraLista();
  if (conLamina) {
    // Base de lámina: la cabeza, color y contorno entintado vienen del png;
    // ojos y boca se dibujan después con el mismo código del modo dibujado,
    // así pueden mirar, parpadear y cambiar de expresión. La base fue
    // procesada para borrar ojos y boca e inpintar la piel.
    const esc = ((11.5 * 2) / CARA_CABEZA_ANCHO) * CARA_ESC;
    ctx.save();
    ctx.translate(7, -12 + bo * 0.3);
    ctx.scale(-1, 1);
    ctx.drawImage(caraImg, -CARA_CENTRO[0] * esc, -CARA_CENTRO[1] * esc,
      CARA_PNG_W * esc, CARA_PNG_H * esc);
    ctx.restore();
  } else {
    const headG = ctx.createRadialGradient(4, -16, 2, 7, -12, 15);
    headG.addColorStop(0, '#fae2a0');
    headG.addColorStop(1, '#eec96e');
    ctx.fillStyle = headG;
    ctx.strokeStyle = AB.ink;
    ctx.lineWidth = 2.8;
    ctx.beginPath();
    ctx.arc(7, -12 + bo * 0.3, 11.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    // hocico crema (mancha facial de los 30s) — SOLO alrededor de la boca,
    // debajo de los ojos; antes subía hasta cruzarlos y a 40px todo era papilla
    ctx.fillStyle = '#fdf3cd';
    ctx.beginPath();
    ctx.ellipse(11.6, -4.8, 5.6, 4.1, 0.12, 0, Math.PI * 2);
    ctx.fill();
    // luz de borde del lado del sol, en la CORONILLA: antes el arco cruzaba
    // justo por donde van los ojos y les metía ruido
    ctx.strokeStyle = 'rgba(255,246,200,.7)';
    ctx.lineWidth = 2.4;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.arc(7, -12 + bo * 0.3, 10.2, player.facing === 1 ? -1.45 : Math.PI + 0.45, player.facing === 1 ? -0.45 : Math.PI + 1.45);
    ctx.stroke();
  }

  // antenas con perillas, colgadas detrás con follow-through
  const aTrail = -lean * 10 + Math.sin(t * 3.2) * 1.2 + (air ? clamp(player.vy * 0.006, -2.5, 2.5) : 0);
  ctx.strokeStyle = AB.ink;
  ctx.lineWidth = 1.8;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(1.5, -20.5);
  ctx.quadraticCurveTo(-3.5, -27, -8 + aTrail, -29.5 - hatLift * 0.4);
  ctx.moveTo(5, -21.5);
  ctx.quadraticCurveTo(1, -29.5, -4.5 + aTrail, -32 - hatLift * 0.4);
  ctx.stroke();
  ctx.fillStyle = AB.ink;
  ctx.beginPath();
  ctx.arc(-8 + aTrail, -29.5 - hatLift * 0.4, 1.7, 0, Math.PI * 2);
  ctx.arc(-4.5 + aTrail, -32 - hatLift * 0.4, 1.6, 0, Math.PI * 2);
  ctx.fill();

  // cara: ojos de pastel mirando a donde va, parpadeando y cambiando de expresión
  // Parpadeo: cada 3-6 s, ~120 ms; con 25 % de probabilidad dos seguidos.
  if (t >= angBlink.next) {
    angBlink.until = t + 0.12;
    const doble = Math.random() < 0.25;
    angBlink.next = t + (doble ? 0.18 : 3 + Math.random() * 3);
  }
  const blinking = t < angBlink.until;

  const lookBaseX = 0.5 + run * 0.4;
  const lookBaseY = clamp(player.vy * 0.003, -1.2, 1.2);
  // En reposo la mirada no se congela: pequeños vaivenes que la abeja "piensa".
  const lookIdleX = air ? 0 : Math.sin(t * 1.3) * 0.15 + Math.sin(t * 0.55) * 0.12;
  const lookIdleY = air ? 0 : Math.cos(t * 1.1) * 0.10;
  const lookX = lookBaseX + lookIdleX;
  const lookY = lookBaseY + lookIdleY;

  // Las coordenadas de la lámina calibran los ojos/boca sobre la base recortada;
  // el modo dibujado conserva los valores originales probados a 40 px.
  const eyeL = conLamina
    ? { x: 4.4, y: -13.7, rw: 3.4, rh: 5.0, pr: 1.55 }
    : { x: 7.8, y: -13.2, rw: 3.6, rh: 5.4, pr: 1.65 };
  const eyeR = conLamina
    ? { x: 10.4, y: -13.7, rw: 3.7, rh: 5.2, pr: 1.70 }
    : { x: 13.6, y: -12.6, rw: 3.9, rh: 5.8, pr: 1.80 };
  const mouthOff = conLamina ? { x: -4.8, y: -2.9 } : { x: 0, y: 0 };

  if (player.hurtFlash > 0) {
    ctx.strokeStyle = AB.ink;
    ctx.lineWidth = 2.4;
    for (const e of [eyeL, eyeR]) {
      ctx.beginPath();
      ctx.moveTo(e.x - 2.6, e.y - 2.6); ctx.lineTo(e.x + 2.6, e.y + 2.6);
      ctx.moveTo(e.x + 2.6, e.y - 2.6); ctx.lineTo(e.x - 2.6, e.y + 2.6);
      ctx.stroke();
    }
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    ctx.moveTo(9.2 + mouthOff.x, -3.6 + mouthOff.y);
    ctx.quadraticCurveTo(11.2 + mouthOff.x, -5.1 + mouthOff.y, 13.2 + mouthOff.x, -3.6 + mouthOff.y);
    ctx.quadraticCurveTo(15.2 + mouthOff.x, -2.1 + mouthOff.y, 16.6 + mouthOff.x, -3.9 + mouthOff.y);
    ctx.stroke();
  } else {
    // ojos: abiertos o cerrados según parpadeo
    if (blinking) {
      drawBlinkEye(ctx, eyeL.x, eyeL.y, eyeL.rw * 1.45);
      drawBlinkEye(ctx, eyeR.x, eyeR.y, eyeR.rw * 1.45);
    } else {
      drawPieEye(ctx, eyeL.x, eyeL.y, eyeL.rw, eyeL.rh, lookX + 0.4, lookY + 0.8, eyeL.pr, -0.7);
      drawPieEye(ctx, eyeR.x, eyeR.y, eyeR.rw, eyeR.rh, lookX + 0.4, lookY + 0.8, eyeR.pr, -0.7);
    }

    // boca según estado: sorpresa al saltar, sonrisa al correr/planear, reposo neutro
    if (rising) {
      // boca en 'O' de sorpresa
      ctx.fillStyle = '#402412';
      ctx.strokeStyle = AB.ink;
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.ellipse(11.9 + mouthOff.x, -3.8 + mouthOff.y, 2.0, 2.5, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    } else if (run > 0.35 || glide) {
      // sonrisa AMPLIA con DIENTES (la firma de la referencia rubber-hose):
      // fila superior de UNA sola pieza blanca — dientes individuales a 40px
      // serían pixel-noise; una banda clara dentro de la boca oscura LEE.
      const mouth = () => {
        ctx.beginPath();
        ctx.moveTo(8.8 + mouthOff.x, -4.8 + mouthOff.y);
        ctx.quadraticCurveTo(11.9 + mouthOff.x, -0.9 - run * 1.2 + mouthOff.y, 15.2 + mouthOff.x, -4.6 + mouthOff.y);
        ctx.quadraticCurveTo(12.0 + mouthOff.x, -5.9 + mouthOff.y, 8.8 + mouthOff.x, -4.8 + mouthOff.y);
      };
      ctx.fillStyle = '#402412';
      ctx.strokeStyle = AB.ink;
      ctx.lineWidth = 1.5;
      mouth();
      ctx.fill();
      ctx.stroke();
      ctx.save();
      mouth();
      ctx.clip();
      // lengua: piso de la boca, recortada por el labio
      ctx.fillStyle = '#d96a55';
      ctx.beginPath();
      ctx.ellipse(11.9 + mouthOff.x, -2.7 + mouthOff.y, 2.0, 1.2, 0, 0, Math.PI * 2);
      ctx.fill();
      // dientes: banda superior con dos tics de separación (solo de cerca)
      ctx.fillStyle = '#fffdf2';
      ctx.fillRect(8.4 + mouthOff.x, -6.4 + mouthOff.y, 7.4, 2.0);
      ctx.strokeStyle = 'rgba(40,26,13,.5)';
      ctx.lineWidth = 0.6;
      ctx.beginPath();
      ctx.moveTo(10.9 + mouthOff.x, -6.0 + mouthOff.y); ctx.lineTo(10.9 + mouthOff.x, -4.4 + mouthOff.y);
      ctx.moveTo(13.2 + mouthOff.x, -6.0 + mouthOff.y); ctx.lineTo(13.2 + mouthOff.x, -4.4 + mouthOff.y);
      ctx.stroke();
      ctx.restore();
    } else {
      // reposo neutro: sonrisa cerrada MUY suave, no la sonrisa abierta congelada
      // de antes; a 40 px lee como cara tranquila, no como calcomanía sonriente.
      ctx.strokeStyle = AB.ink;
      ctx.lineWidth = 1.7;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(8.6 + mouthOff.x, -5.0 + mouthOff.y);
      ctx.quadraticCurveTo(11.8 + mouthOff.x, -3.0 + mouthOff.y, 15.0 + mouthOff.x, -5.0 + mouthOff.y);
      ctx.stroke();
      ctx.lineWidth = 1.3;
      ctx.beginPath();
      ctx.moveTo(15.0 + mouthOff.x, -5.0 + mouthOff.y);
      ctx.quadraticCurveTo(15.8 + mouthOff.x, -5.4 + mouthOff.y, 16.0 + mouthOff.x, -6.1 + mouthOff.y);
      ctx.moveTo(8.6 + mouthOff.x, -5.0 + mouthOff.y);
      ctx.quadraticCurveTo(7.8 + mouthOff.x, -5.4 + mouthOff.y, 7.6 + mouthOff.x, -6.1 + mouthOff.y);
      ctx.stroke();
    }

    // cachete: solo en el modo dibujado, donde no viene de la lámina
    if (!conLamina) {
      ctx.fillStyle = 'rgba(202,92,62,.3)';
      ctx.beginPath();
      ctx.ellipse(4.6, -7, 2.4, 1.6, -0.2, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // sombrero aguadeño con cinta, bien arriba para NO tapar los ojos:
  // el ala rozaba el tope de los ojos y sin frente visible la cara se
  // apelmazaba — ahora queda una franja de frente entre ala y ojos
  ctx.save();
  ctx.translate(3.5, -25.4 - hatLift);
  ctx.rotate(-0.08 + lean * 0.4);
  ctx.fillStyle = AB.paper;
  ctx.strokeStyle = AB.ink;
  ctx.lineWidth = 2.2;
  ctx.beginPath();
  ctx.ellipse(0, 0, 12.6, 3.5, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.beginPath();
  ctx.ellipse(0.5, -4.5, 7.8, 6, 0, Math.PI * 0.98, Math.PI * 2.02);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = AB.cherry;
  ctx.strokeStyle = AB.ink;
  ctx.lineWidth = 1.3;
  ctx.beginPath();
  ctx.ellipse(0.5, -2.9, 7.9, 2, 0, Math.PI * 1.02, Math.PI * 1.98);
  ctx.fill();
  ctx.stroke();
  ctx.restore();
  ctx.restore();

  // puño arriba del salto: único caso en que el brazo va delante de la cabeza
  if (rising) nearArm();

  ctx.restore();
}

function drawCochinilla(ctx, enemy, camX, camY, t) {
  const x = enemy.x - camX;
  const y = enemy.y - camY;
  const ph = t * 5 + enemy.phase;
  const wob = Math.sin(ph * 1.2) * 0.03;
  const step = Math.abs(Math.sin(ph * 0.5)) * 1.8;
  const breathe = 1 + Math.sin(enemy.breathe * 0.7) * 0.03;
  ctx.save();
  ctx.translate(x + enemy.w / 2, y + enemy.h / 2 + step * 0.4);
  ctx.scale(enemy.dir, 1);
  ctx.rotate(wob);
  ctx.fillStyle = 'rgba(24,18,10,.18)';
  ctx.beginPath();
  ctx.ellipse(-1, enemy.h * 0.5 + 2, 12, 3.6, 0, 0, Math.PI * 2);
  ctx.fill();
  // bolitas de pelusa: la harinosa parece algodón con patitas
  ctx.fillStyle = ENEMY_DEFS.cochinilla.color;
  ctx.strokeStyle = AB.ink;
  ctx.lineWidth = 1.8;
  const balls = [[-6, -2, 8], [1, -4, 9], [8, -1, 6.5], [-1, 4, 6]];
  for (const [bx, by, br] of balls) {
    ctx.beginPath();
    ctx.ellipse(bx, by + Math.sin(ph * 1.4 + bx) * 0.5, br * 0.8 + breathe * 0.7, br * 0.7, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  }
  // pelusitas que sobresalen
  ctx.strokeStyle = 'rgba(216,211,189,.9)';
  ctx.lineWidth = 1;
  for (let i = 0; i < 6; i++) {
    const a = i * 1.05 + Math.sin(ph * 1.6 + i) * 0.15;
    const rr = 11 + Math.sin(ph * 2 + i * 3) * 1.2;
    ctx.beginPath();
    ctx.moveTo(Math.cos(a) * rr * 0.7, Math.sin(a) * rr * 0.5);
    ctx.quadraticCurveTo(Math.cos(a + 0.3) * rr, Math.sin(a + 0.3) * rr, Math.cos(a + 0.5) * rr * 1.15, Math.sin(a + 0.5) * rr * 0.6);
    ctx.stroke();
  }
  // patitas cortas debajo
  ctx.strokeStyle = AB.ink;
  ctx.lineWidth = 1.6;
  const lift = Math.sin(ph * 0.5 + 1);
  for (const [lx, ly, lx2, ly2] of [[-5, 5, -7, 9], [1, 6, -1, 11], [7, 5, 6, 9]]) {
    ctx.beginPath();
    ctx.moveTo(lx, ly);
    ctx.lineTo(lx2 + lift * 1.5, ly2 + lift * 1.5);
    ctx.stroke();
  }
  // ojitos chiquitos y antenitas
  ctx.fillStyle = '#19110a';
  ctx.beginPath();
  ctx.arc(10, -5, 1.3, 0, Math.PI * 2);
  ctx.arc(12.5, -3.5, 1.1, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = AB.ink;
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.moveTo(12, -6);
  ctx.quadraticCurveTo(15, -11, 17 + Math.sin(ph * 1.8) * 1, -11);
  ctx.stroke();
  ctx.restore();
}

function drawCochinillaPuff(ctx, enemy, camX, camY, t) {
  const k = clamp(enemy.cochinillaPoof / 0.7, 0, 1);
  const cx = enemy.x + enemy.w / 2 - camX;
  const cy = enemy.y + enemy.h / 2 - camY;
  ctx.save();
  ctx.fillStyle = `rgba(246,242,228,${0.85 * k})`;
  ctx.strokeStyle = `rgba(90,80,60,${0.4 * k})`;
  ctx.lineWidth = 1.4;
  for (let i = 0; i < 5; i++) {
    const a = i * 1.26 + t * 2;
    const rr = (6 + i * 2.4) * (1.6 - k * 0.6) + Math.sin(t * 8 + i) * 2;
    ctx.beginPath();
    ctx.ellipse(cx + Math.cos(a) * 4, cy + Math.sin(a) * 3, rr * 0.6, rr * 0.45, a, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  }
  ctx.restore();
}

function drawChinche(ctx, enemy, camX, camY, t) {
  const x = enemy.x - camX;
  const y = enemy.y - camY;
  const ph = t * 3 + enemy.phase;
  const hopping = (enemy.vy || 0) < -60;
  ctx.save();
  ctx.translate(x + enemy.w / 2, y + enemy.h / 2);
  ctx.scale(enemy.dir, 1);
  ctx.rotate(hopping ? 0.14 : Math.sin(ph * 0.6) * 0.02);
  ctx.scale(hopping ? 0.92 : 1, hopping ? 1.1 : 1);
  ctx.fillStyle = 'rgba(24,18,10,.18)';
  ctx.beginPath();
  ctx.ellipse(-1, enemy.h * 0.5 + 2, 13, 3.6, 0, 0, Math.PI * 2);
  ctx.fill();
  // patas traseras LARGAS y bandeadas (el patón), bien abiertas
  const backLeg = (bx, by, dir) => {
    ctx.strokeStyle = AB.ink;
    ctx.lineWidth = 2.4;
    ctx.beginPath();
    ctx.moveTo(bx, by);
    ctx.quadraticCurveTo(bx - dir * 10, by + 5, bx - dir * 16, by + 9);
    ctx.stroke();
    ctx.strokeStyle = 'rgba(224,192,120,.95)';
    ctx.lineWidth = 1.3;
    for (let i = 0; i < 3; i++) {
      const t0 = i / 3 + 0.12;
      const t1 = (i + 0.4) / 3 + 0.12;
      const px = (bx - dir * 16) * t0 + bx * (1 - t0) + Math.sin(i) * 0.5;
      const py = (by + 9) * t0 + by * (1 - t0);
      const qx = (bx - dir * 16) * t1 + bx * (1 - t1);
      const qy = (by + 9) * t1 + by * (1 - t1);
      ctx.beginPath();
      ctx.moveTo(px, py);
      ctx.lineTo(qx, qy);
      ctx.stroke();
    }
  };
  backLeg(-3, 3, 1);
  backLeg(4, 4, -1);
  // cuerpo en forma de escudo marrón con alas medianas
  ctx.fillStyle = ENEMY_DEFS.chinche.color;
  ctx.strokeStyle = AB.ink;
  ctx.lineWidth = 1.8;
  ctx.beginPath();
  ctx.ellipse(0, 0, 12, 7.5, -0.08, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = ENEMY_DEFS.chinche.accent;
  ctx.beginPath();
  ctx.moveTo(-4, -5);
  ctx.lineTo(8, -2.5);
  ctx.lineTo(6, 4);
  ctx.lineTo(-6, 1.5);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.strokeStyle = 'rgba(60,40,20,.5)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(3, -4.5);
  ctx.lineTo(4.5, 3.5);
  ctx.stroke();
  // cabecita y ojos rojizos, antenas finas
  ctx.fillStyle = '#6d4e30';
  ctx.beginPath();
  ctx.ellipse(10, -2, 3.4, 2.8, 0.2, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = '#c2452e';
  ctx.beginPath();
  ctx.arc(11, -3.5, 1, 0, Math.PI * 2);
  ctx.arc(12.8, -2.6, 0.9, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = AB.ink;
  ctx.lineWidth = 1.1;
  ctx.beginPath();
  ctx.moveTo(12, -4.5);
  ctx.quadraticCurveTo(15, -10, 17 - Math.sin(ph * 1.5) * 0.8, -11);
  ctx.moveTo(10, -5);
  ctx.quadraticCurveTo(9, -11, 6.5 - Math.sin(ph * 1.7) * 0.8, -11.5);
  ctx.stroke();
  // patas delanteras cortas
  ctx.lineWidth = 1.8;
  ctx.beginPath();
  ctx.moveTo(-6, 4);
  ctx.lineTo(-10, 8);
  ctx.moveTo(-2, 6);
  ctx.lineTo(-3, 10);
  ctx.stroke();
  ctx.restore();
}

function drawCogollero(ctx, enemy, camX, camY, t) {
  const x = enemy.x - camX;
  const y = enemy.y - camY;
  const cx = x + enemy.w / 2;
  const cy = y + enemy.h / 2;
  if (!enemy.emerged) {
    // cogollo: las hojas del corazón del maíz con el gusano escondido adentro
    ctx.save();
    ctx.translate(cx, cy);
    ctx.scale(enemy.dir, 1);
    ctx.fillStyle = 'rgba(24,18,10,.18)';
    ctx.beginPath();
    ctx.ellipse(-1, enemy.h * 0.5 + 2, 14, 4, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.rotate(Math.sin(t * 1.6) * 0.05);
    const leaf = (lx, ly, w, h, rot, col) => {
      ctx.save();
      ctx.translate(lx, ly);
      ctx.rotate(rot);
      ctx.fillStyle = col;
      ctx.strokeStyle = AB.ink;
      ctx.lineWidth = 1.8;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.quadraticCurveTo(w * 0.5, -h * 0.8, w, -h);
      ctx.quadraticCurveTo(w * 0.4, -h * 0.4, w * 0.1, 0);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.restore();
    };
    leaf(-4, 4, 16, 20, -0.5, '#4e7a2e');
    leaf(6, 4, 16, 24, 0.5, '#5c8f38');
    leaf(1, 2, 15, 26, 0, '#6fa044');
    // el gusano asoma la cabecita
    ctx.fillStyle = '#a9b05c';
    ctx.strokeStyle = AB.ink;
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.ellipse(4, 0, 5, 4, 0.3, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#19110a';
    ctx.beginPath();
    ctx.arc(6, -2, 1.1, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = AB.ink;
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(1, -4);
    ctx.quadraticCurveTo(-2, -9, -5, -10);
    ctx.stroke();
    ctx.restore();
    return;
  }
  // gusano caminando: cuerpo arqueado y ondulante
  ctx.save();
  ctx.translate(cx, cy);
  ctx.scale(enemy.dir, 1);
  ctx.fillStyle = 'rgba(24,18,10,.18)';
  ctx.beginPath();
  ctx.ellipse(-1, enemy.h * 0.5 + 2, 13, 3.6, 0, 0, Math.PI * 2);
  ctx.fill();
  const seg = (sx, sy, r, hue) => {
    ctx.fillStyle = hue;
    ctx.strokeStyle = AB.ink;
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.arc(sx, sy, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  };
  const lift = Math.sin(t * 9) * 1.2;
  seg(-9, 3 - lift * 0.6, 5, '#9aa04f');
  seg(-3, 4 - lift, 5.5, '#a9b05c');
  seg(3, 3 - lift * 0.4, 5.5, '#b6bd68');
  seg(9, 0, 5.5, '#c2c975');
  // patitas
  ctx.strokeStyle = AB.ink;
  ctx.lineWidth = 1.5;
  for (let i = -1; i <= 1; i++) {
    const px = i * 6;
    ctx.beginPath();
    ctx.moveTo(px, 7);
    ctx.lineTo(px + 2, 11 + Math.abs(Math.sin(t * 9 + i)) * 2);
    ctx.stroke();
  }
  // cabeza con mandíbulas
  seg(14, -2, 5, '#c8cf7c');
  ctx.fillStyle = '#19110a';
  ctx.beginPath();
  ctx.arc(16, -4, 1.2, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = AB.ink;
  ctx.lineWidth = 1.3;
  ctx.beginPath();
  ctx.moveTo(18, 0);
  ctx.lineTo(21, 2);
  ctx.moveTo(18, 1.5);
  ctx.lineTo(21, 3.5);
  ctx.stroke();
  // puntos oscuros del lomo
  ctx.fillStyle = 'rgba(40,42,18,.55)';
  for (let i = -1; i <= 1; i++) {
    ctx.beginPath();
    ctx.arc(i * 6, -2, 1, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

function drawMinador(ctx, enemy, camX, camY, t) {
  const x = enemy.x - camX;
  const y = enemy.y - camY;
  const ph = t * 5 + enemy.phase;
  const pts = enemy.trail || [];
  ctx.save();
  ctx.lineCap = 'round';
  if (pts.length > 1) {
    ctx.strokeStyle = `rgba(210,232,234,${clamp(enemy.trailFade || 0.9, 0, 1)})`;
    ctx.lineWidth = 2.2;
    ctx.beginPath();
    ctx.moveTo(pts[0].x - camX, pts[0].y - camY);
    for (let i = 1; i < pts.length; i++) {
      const p = pts[i];
      const prev = pts[i - 1];
      ctx.quadraticCurveTo(prev.x - camX, prev.y - camY, p.x - camX, p.y - camY);
    }
    ctx.stroke();
  }
  if (!enemy.alive) {
    ctx.restore();
    return;
  }
  ctx.translate(x + enemy.w / 2, y + enemy.h / 2);
  ctx.scale(enemy.dir, 1);
  const flap = Math.sin(ph * 3);
  ctx.fillStyle = 'rgba(24,18,10,.16)';
  ctx.beginPath();
  ctx.ellipse(-1, enemy.h * 0.5 + 2, 11, 3.6, 0, 0, Math.PI * 2);
  ctx.fill();
  // alas plateadas anchas, un poco deshilachadas
  const ala = (wx, wy, rot, len, flip) => {
    ctx.save();
    ctx.translate(wx, wy);
    ctx.rotate(rot + flap * 0.16);
    ctx.scale(1, 0.5 + Math.abs(flap) * 0.5);
    ctx.fillStyle = ENEMY_DEFS.minador.color;
    ctx.strokeStyle = AB.ink;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.quadraticCurveTo(-len * 0.4, -len * 0.55 * flip, -len, -len * 0.18 * flip);
    ctx.quadraticCurveTo(-len * 0.7, len * 0.1 * flip, -len * 0.25, len * 0.28 * flip);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.strokeStyle = 'rgba(150,190,192,.6)';
    ctx.lineWidth = 0.8;
    ctx.beginPath();
    ctx.moveTo(-len * 0.1, 0);
    ctx.lineTo(-len * 0.8, -len * 0.15 * flip);
    ctx.stroke();
    ctx.restore();
  };
  ala(-4, -3, 0.5, 16, -1);
  ala(-4, -1, -0.5, 14, 1);
  // cuerpecito plateado y cabecita con antenas plumosas
  ctx.fillStyle = ENEMY_DEFS.minador.accent;
  ctx.strokeStyle = AB.ink;
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  ctx.ellipse(0, 0, 5, 3.2, -0.1, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = ENEMY_DEFS.minador.color;
  ctx.beginPath();
  ctx.ellipse(6.5, -0.5, 3, 2.4, 0.1, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = '#19110a';
  ctx.beginPath();
  ctx.arc(7.8, -1.6, 0.9, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = AB.ink;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(7, -2.4);
  ctx.quadraticCurveTo(10, -7, 12 - Math.sin(ph * 2) * 1, -6.5);
  ctx.moveTo(6, -2.6);
  ctx.quadraticCurveTo(5, -8, 3 - Math.sin(ph * 2 + 1) * 1, -7);
  ctx.stroke();
  ctx.restore();
}

function drawParticles(state) {
  const { ctx, camX, camY } = state;
  for (const p of state.particles) {
    const a = clamp(p.life / 1.2, 0, 1);
    ctx.save();
    ctx.globalAlpha = a;
    ctx.fillStyle = p.color;
    ctx.beginPath();
    ctx.arc(p.x - camX, p.y - camY, p.r * (0.6 + a * 0.8), 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}

function drawOverlay(state, t) {
  const { ctx, viewW: w, viewH: h } = state;
  if (state.fade > 0) {
    ctx.save();
    ctx.fillStyle = `rgba(10,14,10,${state.fade * 0.45})`;
    ctx.fillRect(0, 0, w, h);
    ctx.restore();
  }
  const msg = document.getElementById('message');
  if (state.message && now() < state.messageUntil) {
    msg.textContent = state.message;
    msg.classList.add('show');
  } else {
    msg.classList.remove('show');
  }
}

function render(state, t) {
  const { ctx } = state;
  ctx.setTransform(state.dpr, 0, 0, state.dpr, 0, 0);
  ctx.clearRect(0, 0, state.viewW, state.viewH);
  // En la pantalla de arranque el mundo de atrás es el anuncio: con movimiento
  // reducido se queda en su pose de vitrina (sin nubes derivando ni golondrinas).
  const tDraw = (state.reducedMotion && state.mode === 'intro') ? 0 : t;
  drawBackground(state, tDraw);
  drawPlatformerWorld(state, tDraw);
  drawSeeds(state, tDraw);
  drawParticles(state);

  // player and enemies
  drawPlayer(ctx, state.player, state.camX, state.camY, tDraw);
  for (const enemy of state.level.enemies) {
    drawEnemy(ctx, enemy, state.camX, state.camY, tDraw);
  }

  // gradación de luz sobre TODO el cuadro (fondo + tiles + personajes bajo la
  // misma atmósfera); va antes de los overlays de estado y del HUD
  drawLightGrade(state);

  // small hint on the goal status
  if (state.mode === 'win') {
    ctx.save();
    ctx.fillStyle = 'rgba(18,28,16,.42)';
    ctx.fillRect(0, 0, state.viewW, state.viewH);
    ctx.fillStyle = '#f7edcf';
    ctx.strokeStyle = '#2a1a0d';
    ctx.lineWidth = 2.5;
    ctx.font = 'italic 32px Georgia,serif';
    ctx.textAlign = 'center';
    ctx.fillText('Cafetal limpio', state.viewW / 2, state.viewH / 2 - 12);
    ctx.strokeText('Cafetal limpio', state.viewW / 2, state.viewH / 2 - 12);
    ctx.font = '16px Georgia,serif';
    ctx.fillText('Presione R para repetir', state.viewW / 2, state.viewH / 2 + 22);
    ctx.restore();
  } else if (state.mode === 'dead') {
    ctx.save();
    ctx.fillStyle = 'rgba(18,12,8,.36)';
    ctx.fillRect(0, 0, state.viewW, state.viewH);
    ctx.fillStyle = '#fff3d6';
    ctx.strokeStyle = '#2a1a0d';
    ctx.lineWidth = 2.5;
    ctx.font = 'italic 30px Georgia,serif';
    ctx.textAlign = 'center';
    ctx.fillText('Angelita cayó', state.viewW / 2, state.viewH / 2 - 12);
    ctx.strokeText('Angelita cayó', state.viewW / 2, state.viewH / 2 - 12);
    ctx.font = '16px Georgia,serif';
    ctx.fillText('Toque reiniciar o presione R', state.viewW / 2, state.viewH / 2 + 22);
    ctx.restore();
  }

  drawOverlay(state, t);
  updateHud(state);
}

function tick(state, t, dt) {
  if (state.mode === 'playing') {
    updatePlayer(state, dt);
    updateEnemies(state, dt);
  }
  updatePopups(state, dt);
  updateParticles(state, dt);
  updateCamera(state, dt);
  state.css2d.render(state.scene, state.camera);
  render(state, t);
}

function loop(state) {
  const t0 = now();
  const frame = () => {
    const t = now();
    const dt = clamp(t - state.last, 0, 1 / 20);
    state.last = t;
    state.acc += dt;
    while (state.acc >= 1 / 120) {
      tick(state, t, 1 / 120);
      state.acc -= 1 / 120;
    }
    if (state.acc > 0) tick(state, t, state.acc), (state.acc = 0);
    requestAnimationFrame(frame);
  };
  state.last = t0;
  requestAnimationFrame(frame);
}

function main() {
  const canvas = document.getElementById('game');
  const state = createState(canvas);
  addEventListener('resize', () => resize(state), { passive: true });
  resize(state);
  loop(state);
  document.getElementById('loading').remove();
  if (GAME_QUERY.get('debug') === '1') {
    window.__angelitaState = state;
    window.__angelitaBlink = angBlink;
  }
}

main();
