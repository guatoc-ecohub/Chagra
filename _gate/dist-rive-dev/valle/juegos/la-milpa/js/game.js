import {
  COLS, ROWS, MILPA, MILPA_INFO, MILPA_TEXT,
  relation, compatReason, antagReason,
  pickShape, makeBag, SHAPE_ROTS,
} from './assoc.js';
import { initAudio, setMuted, toggleMute, isMuted, sfx } from './audio.js';

const GAME_QUERY = new URLSearchParams(location.search);
const AUTO_DEMO = GAME_QUERY.get('autostart') === '1' || GAME_QUERY.get('embedded') === '1';

const COMPAT_PTS = 15;
const ANTAG_PTS = 25;
const REVIVE_PTS = 30;
const MILPA_BASE = 150;
const GRAV0 = 1000;
const GRAV_F = 0.9;
const GRAV_MIN = 220;
const LEVEL_EVERY = 20;

const $ = id => document.getElementById(id);

const canvas = $('game');
const ctx = canvas.getContext('2d');
const startBtn = $('startBtn');
const againBtn = $('againBtn');
const milpaOkBtn = $('milpaOk');
const muteBtn = $('muteBtn');
const leftBtn = $('leftBtn');
const rightBtn = $('rightBtn');
const rotBtn = $('rotBtn');
const dropBtn = $('dropBtn');

let W = 0, H = 0, dpr = 1;
let cell = 40, gx = 0, gy = 0, bx = 0, by = 0, boardW = 0, boardH = 0, prevY = 0;
let bgLayer = null, boardLayer = null, vigLayer = null;
const SPRITES = {};
const WILTS = {};
const TINY = {};
const SOILS = [];

let rng = mulberry32((Date.now() ^ Math.floor(Math.random() * 0x7fffffff)) >>> 0);
let state = 'intro';
let paused = false;
// Inicializadas CON DIMENSIONES desde el arranque, no como `[]`.
// El bucle de render arranca antes de que `reset()` llene la grilla, así que
// con `[]` el draw hacía `grid[y][x]` sobre una fila inexistente y reventaba
// con "Cannot read properties of undefined (reading '0')" en cada frame de la
// pantalla de intro (game.js:1584). Verificado con captura GPU: page errors 1.
let grid = Array.from({ length: ROWS }, () => Array(COLS).fill(null));
let withered = Array.from({ length: ROWS }, () => Array(COLS).fill(false));
let piece = null;
let queue = [];
let cropBag = [];
let score = 0, displayScore = 0, level = 1, combo = 0;
let planted = 0, milpas = 0, best = 0;
let gravityMs = GRAV0, dropAcc = 0, softDropHeld = false;
let shake = 0, time = 0, last = 0;
let lastAntagToast = 0, lastCompatToast = 0, firstMilpaShown = false;
const fx = { floats: [], parts: [], pulses: [] };

function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const cellPhase = (x, y) => {
  const n = Math.sin(x * 127.1 + y * 311.7) * 43758.5453;
  return n - Math.floor(n);
};

function rr(g, x, y, w, h, r) {
  r = Math.min(r, w / 2, h / 2);
  g.beginPath();
  g.moveTo(x + r, y);
  g.arcTo(x + w, y, x + w, y + h, r);
  g.arcTo(x + w, y + h, x, y + h, r);
  g.arcTo(x, y + h, x, y, r);
  g.arcTo(x, y, x + w, y, r);
  g.closePath();
}

function lp(g, x0, y0, x1, y1, w, c1, c2) {
  const dx = x1 - x0, dy = y1 - y0, L = Math.hypot(dx, dy) || 1;
  const nx = -dy / L, ny = dx / L;
  const mx = (x0 + x1) / 2, my = (y0 + y1) / 2;
  g.beginPath();
  g.moveTo(x0, y0);
  g.quadraticCurveTo(mx + nx * w, my + ny * w, x1, y1);
  g.quadraticCurveTo(mx - nx * w, my - ny * w, x0, y0);
  g.closePath();
  g.fillStyle = c1;
  g.fill();
  g.strokeStyle = 'rgba(20,30,10,.18)';
  g.lineWidth = 1;
  g.stroke();
  if (c2) {
    g.strokeStyle = c2;
    g.lineWidth = Math.max(1, w * 0.08);
    g.beginPath();
    g.moveTo(x0, y0);
    g.lineTo(x1, y1);
    g.stroke();
  }
}

function tri(g, cx, cy, ang, s, c1, c2) {
  g.save();
  g.translate(cx, cy);
  g.rotate(ang);
  lp(g, 0, 0, -s, 0, s * 0.5, c1, c2);
  lp(g, 0, 0, s * 0.32, -s * 0.5, s * 0.5, c1, c2);
  lp(g, 0, 0, s * 0.32, s * 0.5, s * 0.5, c1, c2);
  g.restore();
}

function pod(g, cx, cy, ang, s, c1, c2) {
  g.save();
  g.translate(cx, cy);
  g.rotate(ang);
  g.beginPath();
  g.moveTo(-s * 0.16, 0);
  g.quadraticCurveTo(s * 0.1, -s * 0.34, s * 0.04, -s);
  g.quadraticCurveTo(-s * 0.14, -s * 0.34, -s * 0.16, 0);
  g.closePath();
  g.fillStyle = c1;
  g.fill();
  g.strokeStyle = 'rgba(20,30,10,.2)';
  g.lineWidth = 1;
  g.stroke();
  g.strokeStyle = c2;
  g.lineWidth = 1;
  g.beginPath();
  g.moveTo(0, -s * 0.05);
  g.quadraticCurveTo(s * 0.02, -s * 0.3, -s * 0.02, -s * 0.9);
  g.stroke();
  g.restore();
}

function fan(g, ang, s, c1, c2) {
  g.save();
  g.rotate(ang);
  g.beginPath();
  g.moveTo(0, 0);
  g.quadraticCurveTo(s * 0.18, -s * 0.55, 0, -s);
  g.quadraticCurveTo(-s * 0.14, -s * 0.6, -s * 0.55, -s * 0.62);
  g.quadraticCurveTo(-s * 0.7, -s * 0.34, -s * 0.62, -s * 0.12);
  g.quadraticCurveTo(-s * 0.36, -s * 0.2, -s * 0.2, -s * 0.1);
  g.quadraticCurveTo(-s * 0.1, -s * 0.05, 0, 0);
  g.quadraticCurveTo(s * 0.1, -s * 0.05, s * 0.2, -s * 0.1);
  g.quadraticCurveTo(s * 0.36, -s * 0.2, s * 0.62, -s * 0.12);
  g.quadraticCurveTo(s * 0.7, -s * 0.34, s * 0.55, -s * 0.62);
  g.quadraticCurveTo(s * 0.14, -s * 0.6, 0, -s);
  g.closePath();
  g.fillStyle = c1;
  g.fill();
  g.strokeStyle = 'rgba(15,30,10,.2)';
  g.lineWidth = 1;
  g.stroke();
  g.strokeStyle = c2;
  g.lineWidth = 1;
  g.beginPath();
  g.moveTo(0, 0);
  g.lineTo(0, -s * 0.95);
  g.stroke();
  g.beginPath();
  g.moveTo(0, 0);
  g.lineTo(-s * 0.62, -s * 0.1);
  g.stroke();
  g.beginPath();
  g.moveTo(0, 0);
  g.lineTo(s * 0.62, -s * 0.1);
  g.stroke();
  g.restore();
}

function flower(g, cx, cy, s, c1, c2) {
  g.save();
  g.translate(cx, cy);
  g.fillStyle = c1;
  for (let i = 0; i < 5; i++) {
    const a = i / 5 * 6.283;
    g.beginPath();
    g.ellipse(Math.cos(a) * s * 0.5, Math.sin(a) * s * 0.5, s * 0.42, s * 0.5, a, 0, 6.283);
    g.fill();
  }
  g.beginPath();
  g.arc(0, 0, s * 0.3, 0, 6.283);
  g.fillStyle = c2;
  g.fill();
  g.restore();
}

const PAL = {
  maiz:     { leaf: '#3f7a33', leaf2: '#5f9c46', stalk: '#4c8a3a', husk: '#a8823a', ear: '#e0b64c', kernel: '#ffd873', silk: '#e8c267' },
  frijol:   { leaf: '#4c8a3a', leaf2: '#6aa84f', stem: '#8a6136', vine: '#7fb14e', pod: '#7fb14e', pod2: '#5a8a3a' },
  calabaza: { leaf: '#44833b', leaf2: '#5f9c46', fruit: '#e08a3c', stem: '#7a5230', vine: '#7fb14e' },
  tomate:   { fruit: '#d8452f', hi: '#f07a58', calyx: '#3f7a33', stem: '#3f7a33' },
  albahaca: { leaf: '#4f9440', leaf2: '#67a84f', tip: '#8a6bb8' },
  zanahoria:{ root: '#e06a28', frond: '#5f9c46', frond2: '#7fb14e' },
  cebolla:  { bulb: '#e9ddbc', bulb2: '#d8cba0', stalk: '#5f9c46', flower: '#e8dcae' },
  lechuga:  { leaf: '#6aaa4a', leaf2: '#8fc65d', edge: '#a9d47a' },
  rabano:   { bulb: '#d04840', leaf: '#5f9c46' },
  papa:     { leaf: '#4c7a38', flower: '#b7a0d8', flowerC: '#7a5aa0', tuber: '#c2a878' },
  habas:    { leaf: '#3f7a33', leaf2: '#5f9c46', pod: '#8aa050', pod2: '#6f8438', flower: '#5a4a80' },
  ajo:      { bulb: '#e9e0c8', bulb2: '#d8cfae', scape: '#5f9c46' },
};

function paintMaiz(g, u) {
  const P = PAL.maiz;
  g.strokeStyle = P.stalk;
  g.lineWidth = u * 0.09;
  g.lineCap = 'round';
  g.beginPath();
  g.moveTo(u * 0.02, u * 0.42);
  g.quadraticCurveTo(u * 0.08, -u * 0.02, 0, -u * 0.8);
  g.stroke();
  lp(g, 0, -u * 0.5, -u * 0.78, u * 0.12, u * 0.3, P.leaf, P.leaf2);
  lp(g, 0, -u * 0.5, u * 0.78, u * 0.12, u * 0.3, P.leaf, P.leaf2);
  lp(g, 0, -u * 0.62, -u * 0.48, u * 0.34, u * 0.2, P.leaf2, P.leaf2);
  lp(g, 0, -u * 0.62, u * 0.48, u * 0.34, u * 0.2, P.leaf2, P.leaf2);
  g.save();
  g.translate(-u * 0.3, u * 0.18);
  g.rotate(-0.85);
  g.fillStyle = P.husk;
  g.beginPath();
  g.ellipse(0, 0, u * 0.18, u * 0.42, 0, 0, 6.283);
  g.fill();
  g.fillStyle = P.ear;
  g.beginPath();
  g.ellipse(0, u * 0.03, u * 0.15, u * 0.4, 0, 0, 6.283);
  g.fill();
  g.fillStyle = P.kernel;
  for (let i = 0; i < 3; i++) {
    for (let k = -3; k <= 3; k++) {
      g.beginPath();
      g.arc((i - 1) * u * 0.09, k * u * 0.11, u * 0.028, 0, 6.283);
      g.fill();
    }
  }
  g.strokeStyle = P.silk;
  g.lineWidth = u * 0.02;
  for (let i = 0; i < 3; i++) {
    g.beginPath();
    g.moveTo(0, -u * 0.42);
    g.quadraticCurveTo(-u * 0.06, -u * 0.5, -u * 0.12, -u * 0.5 + i * u * 0.03);
    g.stroke();
  }
  g.restore();
}

function paintFrijol(g, u) {
  const P = PAL.frijol;
  g.strokeStyle = P.stem;
  g.lineWidth = u * 0.06;
  g.lineCap = 'round';
  g.beginPath();
  g.moveTo(u * 0.18, u * 0.42);
  g.lineTo(u * 0.06, -u * 0.62);
  g.stroke();
  tri(g, -u * 0.22, -u * 0.05, -0.4, u * 0.42, P.leaf, P.leaf2);
  tri(g, u * 0.22, -u * 0.28, 0.5, u * 0.36, P.leaf, P.leaf2);
  tri(g, -u * 0.05, -u * 0.5, -0.1, u * 0.3, P.leaf2, P.leaf2);
  pod(g, u * 0.14, u * 0.12, -0.35, u * 0.5, P.pod, P.pod2);
  pod(g, -u * 0.18, -u * 0.3, 0.3, u * 0.42, P.pod, P.pod2);
  g.strokeStyle = P.vine;
  g.lineWidth = u * 0.03;
  g.beginPath();
  g.arc(u * 0.3, -u * 0.15, u * 0.08, -1.2, 2.2);
  g.stroke();
}

function paintCalabaza(g, u) {
  const P = PAL.calabaza;
  fan(g, -0.6, u * 0.9, P.leaf, P.leaf2);
  fan(g, 0.7, u * 0.85, P.leaf, P.leaf2);
  fan(g, 2.9, u * 0.7, P.leaf2, P.leaf2);
  g.save();
  g.translate(u * 0.12, u * 0.3);
  g.beginPath();
  g.ellipse(0, 0, u * 0.42, u * 0.34, -0.2, 0, 6.283);
  g.fillStyle = P.fruit;
  g.fill();
  g.strokeStyle = 'rgba(120,60,10,.35)';
  g.lineWidth = 1;
  for (let i = -1; i <= 1; i++) {
    g.beginPath();
    g.ellipse(i * u * 0.13, 0, u * 0.11, u * 0.3, 0, 0, 6.283);
    g.stroke();
  }
  g.beginPath();
  g.ellipse(-u * 0.12, -u * 0.1, u * 0.09, u * 0.12, -0.5, 0, 6.283);
  g.fillStyle = 'rgba(255,235,190,.55)';
  g.fill();
  g.strokeStyle = P.stem;
  g.lineWidth = u * 0.05;
  g.beginPath();
  g.moveTo(0, -u * 0.32);
  g.quadraticCurveTo(u * 0.1, -u * 0.5, u * 0.22, -u * 0.55);
  g.stroke();
  g.strokeStyle = P.vine;
  g.lineWidth = u * 0.03;
  g.beginPath();
  g.arc(u * 0.28, -u * 0.6, u * 0.1, 0, 5.2);
  g.stroke();
  g.restore();
}

function paintTomate(g, u) {
  const P = PAL.tomate;
  g.beginPath();
  g.ellipse(0, u * 0.1, u * 0.52, u * 0.48, 0, 0, 6.283);
  const grad = g.createRadialGradient(-u * 0.15, -u * 0.02, u * 0.05, u * 0.05, u * 0.08, u * 0.55);
  grad.addColorStop(0, P.hi);
  grad.addColorStop(1, P.fruit);
  g.fillStyle = grad;
  g.fill();
  g.strokeStyle = 'rgba(120,20,10,.3)';
  g.lineWidth = 1;
  g.stroke();
  g.strokeStyle = 'rgba(120,20,10,.28)';
  g.lineWidth = 1;
  for (let i = 0; i < 5; i++) {
    const a = Math.PI * (0.5 + i * 0.45);
    g.beginPath();
    g.moveTo(Math.cos(a) * u * 0.34, u * 0.1 + Math.sin(a) * u * 0.3);
    g.lineTo(Math.cos(a) * u * 0.5, u * 0.1 + Math.sin(a) * u * 0.46);
    g.stroke();
  }
  const cx = 0, cy = -u * 0.16;
  g.strokeStyle = 'rgba(20,40,15,.5)';
  g.lineWidth = 2;
  g.beginPath();
  for (let i = 0; i < 6; i++) {
    const a = Math.PI * 2 * i / 6;
    g.moveTo(cx, cy);
    g.lineTo(cx + Math.cos(a) * u * 0.16, cy + Math.sin(a) * u * 0.12);
  }
  g.stroke();
  g.strokeStyle = P.stem;
  g.lineWidth = u * 0.05;
  g.beginPath();
  g.moveTo(cx, cy - u * 0.04);
  g.quadraticCurveTo(u * 0.02, -u * 0.42, u * 0.16, -u * 0.5);
  g.stroke();
}

function paintAlbahaca(g, u) {
  const P = PAL.albahaca;
  const spots = [[-0.35, -0.1, 0.5], [0.3, -0.15, 0.5], [-0.1, -0.3, 0.52], [0.1, 0.15, 0.44], [-0.25, 0.25, 0.42], [0.32, 0.2, 0.4], [0.05, -0.05, 0.5], [-0.05, 0.32, 0.36]];
  for (const [sx, sy, r] of spots) {
    g.beginPath();
    g.arc(sx * u, sy * u, r * u, 0, 6.283);
    g.fillStyle = P.leaf;
    g.fill();
  }
  const tips = [[0.15, -0.18, 0.22], [-0.15, 0.05, 0.2], [0.3, 0.02, 0.2], [-0.3, -0.28, 0.2]];
  for (const [sx, sy, r] of tips) {
    g.beginPath();
    g.arc(sx * u, sy * u, r * u, 0, 6.283);
    g.fillStyle = P.leaf2;
    g.fill();
  }
  g.strokeStyle = P.tip;
  g.lineWidth = u * 0.03;
  g.beginPath();
  g.moveTo(0, -u * 0.1);
  g.lineTo(0, -u * 0.55);
  g.stroke();
  g.beginPath();
  g.moveTo(-u * 0.05, -u * 0.1);
  g.lineTo(-u * 0.1, -u * 0.48);
  g.stroke();
  for (let i = 0; i < 4; i++) {
    g.beginPath();
    g.arc(0, -u * 0.55 + i * u * 0.06, u * 0.04, 0, 6.283);
    g.fillStyle = P.tip;
    g.fill();
    g.beginPath();
    g.arc(-u * 0.1, -u * 0.48 + i * u * 0.06, u * 0.03, 0, 6.283);
    g.fillStyle = P.tip;
    g.fill();
  }
}

function paintZanahoria(g, u) {
  const P = PAL.zanahoria;
  for (let i = 0; i < 6; i++) {
    const a = -Math.PI / 2 + i * Math.PI / 5 - 0.6;
    const len = u * 0.95;
    const ex = Math.cos(a) * len, ey = Math.sin(a) * len;
    g.strokeStyle = P.frond;
    g.lineWidth = u * 0.028;
    g.lineCap = 'round';
    g.beginPath();
    g.moveTo(0, -u * 0.05);
    g.quadraticCurveTo(ex * 0.4, ey * 0.4 - u * 0.1, ex, ey);
    g.stroke();
    g.strokeStyle = P.frond2;
    g.lineWidth = u * 0.018;
    for (let s = 0.3; s < 0.95; s += 0.2) {
      const bx = ex * s, by = ey * s - u * 0.05;
      g.beginPath();
      g.moveTo(bx, by);
      g.lineTo(bx - u * 0.12, by - u * 0.06);
      g.moveTo(bx, by);
      g.lineTo(bx + u * 0.12, by - u * 0.06);
      g.stroke();
    }
  }
  g.beginPath();
  g.ellipse(0, u * 0.28, u * 0.3, u * 0.16, 0, Math.PI, 0);
  g.fillStyle = P.root;
  g.fill();
  g.beginPath();
  g.ellipse(0, u * 0.28, u * 0.3, u * 0.16, 0, 0, Math.PI);
  g.fillStyle = 'rgba(200,90,20,.7)';
  g.fill();
  g.beginPath();
  g.ellipse(0, u * 0.46, u * 0.42, u * 0.1, 0, 0, 6.283);
  g.fillStyle = 'rgba(90,60,30,.5)';
  g.fill();
}

function paintCebolla(g, u) {
  const P = PAL.cebolla;
  const grad = g.createLinearGradient(-u * 0.4, 0, u * 0.4, 0);
  grad.addColorStop(0, P.bulb2);
  grad.addColorStop(0.5, P.bulb);
  grad.addColorStop(1, P.bulb2);
  g.beginPath();
  g.ellipse(0, u * 0.3, u * 0.4, u * 0.26, 0, 0, 6.283);
  g.fillStyle = grad;
  g.fill();
  g.strokeStyle = 'rgba(120,100,60,.3)';
  g.lineWidth = 1;
  g.stroke();
  g.strokeStyle = 'rgba(120,100,60,.5)';
  g.lineWidth = 1;
  for (let i = -2; i <= 2; i++) {
    g.beginPath();
    g.moveTo(i * u * 0.1, u * 0.5);
    g.lineTo(i * u * 0.12, u * 0.62);
    g.stroke();
  }
  g.strokeStyle = P.stalk;
  g.lineWidth = u * 0.1;
  g.lineCap = 'round';
  g.beginPath();
  g.moveTo(-u * 0.12, u * 0.05);
  g.quadraticCurveTo(-u * 0.28, -u * 0.3, -u * 0.2, -u * 0.62);
  g.stroke();
  g.strokeStyle = 'rgba(30,60,20,.25)';
  g.lineWidth = u * 0.035;
  g.beginPath();
  g.moveTo(-u * 0.1, u * 0.03);
  g.quadraticCurveTo(-u * 0.26, -u * 0.28, -u * 0.19, -u * 0.58);
  g.stroke();
  g.strokeStyle = P.stalk;
  g.lineWidth = u * 0.09;
  g.beginPath();
  g.moveTo(u * 0.1, u * 0.05);
  g.quadraticCurveTo(u * 0.24, -u * 0.34, u * 0.34, -u * 0.55);
  g.stroke();
  g.strokeStyle = P.stalk;
  g.lineWidth = u * 0.08;
  g.beginPath();
  g.moveTo(0, u * 0.05);
  g.quadraticCurveTo(u * 0.05, -u * 0.4, u * 0.06, -u * 0.68);
  g.stroke();
  g.beginPath();
  g.arc(u * 0.06, -u * 0.72, u * 0.1, 0, 6.283);
  g.fillStyle = P.flower;
  g.fill();
  g.strokeStyle = 'rgba(120,100,60,.4)';
  g.stroke();
  for (let i = 0; i < 6; i++) {
    const a = i / 6 * 6.283;
    g.beginPath();
    g.arc(u * 0.06 + Math.cos(a) * u * 0.1, -u * 0.72 + Math.sin(a) * u * 0.1, u * 0.025, 0, 6.283);
    g.fillStyle = 'rgba(150,130,80,.7)';
    g.fill();
  }
}

function paintLechuga(g, u) {
  const P = PAL.lechuga;
  const N = 8;
  for (let ring = 0; ring < 2; ring++) {
    const r = ring === 0 ? u * 0.32 : u * 0.55;
    for (let i = 0; i < N; i++) {
      const a = Math.PI * 2 * i / N + (ring ? 0.22 : 0);
      const cx = Math.cos(a) * r * 0.7, cy = Math.sin(a) * r * 0.7;
      g.save();
      g.translate(cx, cy);
      g.rotate(a + Math.PI / 2);
      const L = ring === 0 ? u * 0.34 : u * 0.42;
      g.beginPath();
      g.moveTo(-L * 0.22, 0);
      g.quadraticCurveTo(-L * 0.3, -L * 0.45, 0, -L);
      g.quadraticCurveTo(L * 0.3, -L * 0.45, L * 0.22, 0);
      g.closePath();
      g.fillStyle = ring === 0 ? P.leaf : P.leaf2;
      g.fill();
      g.strokeStyle = 'rgba(30,60,20,.2)';
      g.lineWidth = 1;
      g.stroke();
      g.restore();
    }
  }
  g.beginPath();
  g.arc(0, -u * 0.05, u * 0.18, 0, 6.283);
  g.fillStyle = P.edge;
  g.fill();
}

function paintRabano(g, u) {
  const P = PAL.rabano;
  g.beginPath();
  g.ellipse(0, u * 0.2, u * 0.34, u * 0.28, 0, 0, 6.283);
  g.fillStyle = P.bulb;
  g.fill();
  g.strokeStyle = 'rgba(150,30,25,.4)';
  g.lineWidth = 1;
  g.stroke();
  g.beginPath();
  g.ellipse(-u * 0.1, u * 0.12, u * 0.09, u * 0.08, 0, 0, 6.283);
  g.fillStyle = 'rgba(255,220,210,.6)';
  g.fill();
  g.strokeStyle = 'rgba(220,220,220,.9)';
  g.lineWidth = u * 0.04;
  g.lineCap = 'round';
  g.beginPath();
  g.moveTo(0, u * 0.4);
  g.lineTo(0, u * 0.62);
  g.stroke();
  lp(g, 0, -u * 0.1, -u * 0.42, -u * 0.5, u * 0.18, P.leaf, P.leaf);
  lp(g, 0, -u * 0.1, u * 0.42, -u * 0.5, u * 0.18, P.leaf, P.leaf);
}

function paintPapa(g, u) {
  const P = PAL.papa;
  for (let i = 0; i < 5; i++) {
    const a = Math.PI * 2 * i / 5 - 0.6;
    const cx = Math.cos(a) * u * 0.42, cy = Math.sin(a) * u * 0.42;
    lp(g, cx * 0.2, cy * 0.2, cx, cy, u * 0.26, P.leaf, P.leaf);
    lp(g, cx * 0.35, cy * 0.35, cx + (cx * 0.6), cy, u * 0.16, P.leaf, P.leaf);
  }
  g.beginPath();
  g.ellipse(u * 0.28, u * 0.42, u * 0.18, u * 0.12, 0.4, 0, 6.283);
  g.fillStyle = P.tuber;
  g.fill();
  g.strokeStyle = 'rgba(120,90,50,.4)';
  g.lineWidth = 1;
  g.stroke();
  flower(g, -u * 0.12, -u * 0.45, u * 0.1, P.flower, P.flowerC);
  flower(g, u * 0.22, -u * 0.4, u * 0.08, P.flower, P.flowerC);
}

function paintHabas(g, u) {
  const P = PAL.habas;
  g.strokeStyle = P.leaf;
  g.lineWidth = u * 0.05;
  g.lineCap = 'round';
  g.beginPath();
  g.moveTo(0, u * 0.45);
  g.lineTo(0, -u * 0.6);
  g.stroke();
  g.beginPath();
  g.moveTo(-u * 0.15, u * 0.45);
  g.lineTo(-u * 0.3, -u * 0.45);
  g.stroke();
  lp(g, 0, -u * 0.05, 0, -u * 0.35, u * 0.26, P.leaf, P.leaf2);
  lp(g, 0, -u * 0.05, 0, -u * 0.1, u * 0.26, P.leaf, P.leaf2);
  lp(g, 0, -u * 0.05, -u * 0.3, -u * 0.2, u * 0.26, P.leaf, P.leaf2);
  lp(g, 0, -u * 0.05, -u * 0.3, -u * 0.05, u * 0.26, P.leaf, P.leaf2);
  pod(g, u * 0.22, u * 0.1, -0.5, u * 0.75, P.pod, P.pod2);
  pod(g, -u * 0.05, u * 0.2, 0.45, u * 0.68, P.pod, P.pod2);
  flower(g, u * 0.1, -u * 0.55, u * 0.09, P.flower, '#3a2c60');
}

function paintAjo(g, u) {
  const P = PAL.ajo;
  g.beginPath();
  g.ellipse(0, u * 0.28, u * 0.3, u * 0.24, 0, 0, 6.283);
  g.fillStyle = P.bulb;
  g.fill();
  g.strokeStyle = 'rgba(120,110,80,.35)';
  g.lineWidth = 1;
  g.stroke();
  for (let i = -1; i <= 1; i++) {
    g.beginPath();
    g.arc(i * u * 0.12, u * 0.3, u * 0.1, 0, 6.283);
    g.fillStyle = P.bulb2;
    g.fill();
  }
  g.strokeStyle = P.scape;
  g.lineWidth = u * 0.06;
  g.lineCap = 'round';
  g.beginPath();
  g.moveTo(0, u * 0.05);
  g.quadraticCurveTo(u * 0.05, -u * 0.4, u * 0.05, -u * 0.6);
  g.stroke();
  g.beginPath();
  g.arc(u * 0.05, -u * 0.72, u * 0.12, Math.PI, 0);
  g.stroke();
  lp(g, u * 0.16, u * 0.05, u * 0.5, -u * 0.35, u * 0.14, P.scape, P.scape);
}

const PAINTERS = {
  maiz: paintMaiz, frijol: paintFrijol, calabaza: paintCalabaza, tomate: paintTomate,
  albahaca: paintAlbahaca, zanahoria: paintZanahoria, cebolla: paintCebolla, lechuga: paintLechuga,
  rabano: paintRabano, papa: paintPapa, habas: paintHabas, ajo: paintAjo,
};

function paintCropTo(g, crop, cx, cy, u) {
  g.save();
  g.translate(cx, cy);
  PAINTERS[crop](g, u);
  g.restore();
}

function wiltedFrom(src) {
  const c = document.createElement('canvas');
  c.width = src.width;
  c.height = src.height;
  const g = c.getContext('2d');
  g.drawImage(src, 0, 0);
  try {
    const img = g.getImageData(0, 0, c.width, c.height);
    const d = img.data;
    const R = 112, G = 90, B = 54, F = 0.62, DIM = 0.8;
    for (let i = 0; i < d.length; i += 4) {
      if (d[i + 3] === 0) continue;
      const lum = (d[i] + d[i + 1] + d[i + 2]) / 3;
      d[i] = (lum + (R - lum) * F) * DIM;
      d[i + 1] = (lum + (G - lum) * F) * DIM;
      d[i + 2] = (lum + (B - lum) * F) * DIM;
    }
    g.putImageData(img, 0, 0);
  } catch (e) { /* canvas sin soporte */ }
  return c;
}

function bakeSprites() {
  const S = Math.max(28, Math.round(cell * 0.94));
  for (const id of Object.keys(PAINTERS)) {
    const cv = document.createElement('canvas');
    cv.width = S; cv.height = S;
    const g = cv.getContext('2d');
    paintCropTo(g, id, S / 2, S / 2, S / 2 * 0.92);
    SPRITES[id] = cv;
    WILTS[id] = wiltedFrom(cv);
  }
}

function bakeTiny() {
  const T = 64;
  for (const id of Object.keys(PAINTERS)) {
    const cv = document.createElement('canvas');
    cv.width = T; cv.height = T;
    const g = cv.getContext('2d');
    paintCropTo(g, id, T / 2, T / 2, T / 2 * 0.95);
    TINY[id] = cv;
  }
}

function bakeSoil() {
  SOILS.length = 0;
  for (let v = 0; v < 4; v++) {
    const cv = document.createElement('canvas');
    cv.width = cell; cv.height = cell;
    const g = cv.getContext('2d');
    const sr = mulberry32(1000 + v * 777);
    g.fillStyle = '#6a4a2c';
    g.fillRect(0, 0, cell, cell);
    const inset = cell * (0.12 + sr() * 0.06);
    const jx = sr() * cell * 0.1, jy = sr() * cell * 0.08;
    rr(g, inset + jx, inset + jy, cell - 2 * inset, cell - 2 * inset, cell * 0.28);
    g.fillStyle = '#74522e';
    g.fill();
    rr(g, inset * 1.5 + jx, inset * 1.5 + jy, cell - 3 * inset, cell - 3 * inset, cell * 0.24);
    g.fillStyle = '#7d5733';
    g.fill();
    g.strokeStyle = 'rgba(70,45,20,.5)';
    g.lineWidth = 1;
    g.stroke();
    for (let i = 0; i < 14; i++) {
      const px = sr() * cell, py = sr() * cell;
      g.fillStyle = sr() < 0.5 ? 'rgba(58,38,18,.5)' : 'rgba(140,110,70,.35)';
      g.fillRect(px, py, 1 + sr() * 2, 1 + sr() * 2);
    }
    for (let i = 0; i < 4; i++) {
      const px = sr() * cell, py = sr() * cell, r = cell * (0.03 + sr() * 0.03);
      g.fillStyle = 'rgba(150,120,80,.6)';
      g.beginPath();
      g.ellipse(px, py, r, r * 0.8, sr() * 3, 0, 6.283);
      g.fill();
    }
    g.strokeStyle = 'rgba(60,40,20,.28)';
    g.lineWidth = 1;
    const fy = cell * (0.55 + sr() * 0.2);
    g.beginPath();
    g.moveTo(cell * 0.12, fy);
    g.quadraticCurveTo(cell * 0.5, fy + cell * 0.06, cell * 0.88, fy);
    g.stroke();
    SOILS.push(cv);
  }
}

function drawBoard() {
  const frameT = Math.max(8, Math.round(cell * 0.36));
  boardW = COLS * cell + frameT * 2;
  boardH = ROWS * cell + frameT * 2;
  const layer = document.createElement('canvas');
  layer.width = Math.round(boardW * dpr);
  layer.height = Math.round(boardH * dpr);
  const g = layer.getContext('2d');
  g.scale(dpr, dpr);
  const wg = g.createLinearGradient(0, 0, 0, boardH);
  wg.addColorStop(0, '#8a6136');
  wg.addColorStop(1, '#543720');
  rr(g, 0, 0, boardW, boardH, cell * 0.45);
  g.fillStyle = wg;
  g.fill();
  g.strokeStyle = '#3c2813';
  g.lineWidth = 2;
  g.stroke();
  for (let y = 0; y < 4; y++) {
    const yy = frameT + (boardH - 2 * frameT) * (y + 1) / 4;
    g.strokeStyle = 'rgba(60,38,18,.55)';
    g.lineWidth = 1;
    g.beginPath();
    g.moveTo(4, yy);
    g.lineTo(boardW - 4, yy);
    g.stroke();
  }
  for (let i = 0; i < 10; i++) {
    g.fillStyle = 'rgba(40,26,12,.6)';
    g.beginPath();
    g.arc(8 + i * (boardW - 16) / 9, 8, 2, 0, 6.283);
    g.fill();
    g.beginPath();
    g.arc(8 + i * (boardW - 16) / 9, boardH - 8, 2, 0, 6.283);
    g.fill();
  }
  rr(g, frameT, frameT, COLS * cell, ROWS * cell, cell * 0.16);
  g.fillStyle = '#5f4227';
  g.fill();
  for (let y = 0; y < ROWS; y++) {
    for (let x = 0; x < COLS; x++) {
      const v = Math.floor(cellPhase(x, y) * SOILS.length);
      g.drawImage(SOILS[v], frameT + x * cell, frameT + y * cell, cell, cell);
    }
  }
  boardLayer = layer;
  gx = bx + frameT;
  gy = by + frameT;
}

function drawBg() {
  bgLayer = document.createElement('canvas');
  bgLayer.width = Math.round(W * dpr);
  bgLayer.height = Math.round(H * dpr);
  const g = bgLayer.getContext('2d');
  g.scale(dpr, dpr);
  const sky = g.createLinearGradient(0, 0, 0, H);
  sky.addColorStop(0, '#cfe0a8');
  sky.addColorStop(0.55, '#e6eab8');
  sky.addColorStop(1, '#e9d9a2');
  g.fillStyle = sky;
  g.fillRect(0, 0, W, H);
  const sunX = W * 0.84, sunY = H * 0.14;
  const rg = g.createRadialGradient(sunX, sunY, 4, sunX, sunY, H * 0.5);
  rg.addColorStop(0, 'rgba(246,214,122,.5)');
  rg.addColorStop(1, 'rgba(246,214,122,0)');
  g.fillStyle = rg;
  g.beginPath();
  g.arc(sunX, sunY, H * 0.5, 0, 6.283);
  g.fill();
  g.fillStyle = 'rgba(246,222,140,.9)';
  g.beginPath();
  g.arc(sunX, sunY, H * 0.045, 0, 6.283);
  g.fill();

  function cloud(cx, cy, s) {
    g.fillStyle = 'rgba(255,252,230,.7)';
    g.beginPath();
    g.arc(cx, cy, s, 0, 6.283);
    g.arc(cx + s, cy - s * 0.5, s * 0.8, 0, 6.283);
    g.arc(cx + s * 1.6, cy, s * 0.9, 0, 6.283);
    g.fill();
  }
  cloud(W * 0.16, H * 0.18, H * 0.045);
  cloud(W * 0.56, H * 0.1, H * 0.035);

  function hill(x0, y0, w, h, color) {
    g.fillStyle = color;
    g.beginPath();
    g.moveTo(x0, y0);
    g.quadraticCurveTo(x0 + w / 2, y0 - h, x0 + w, y0);
    g.lineTo(x0 + w, y0 + h);
    g.lineTo(x0, y0 + h);
    g.closePath();
    g.fill();
  }
  hill(0, H * 0.52, W, H * 0.5, '#b3cd93');
  hill(-W * 0.2, H * 0.57, W * 0.9, H * 0.42, '#a2c184');
  hill(W * 0.35, H * 0.6, W, H * 0.45, '#8fb274');
  hill(-W * 0.3, H * 0.66, W * 1.1, H * 0.5, '#7da25f');

  g.strokeStyle = 'rgba(50,60,40,.5)';
  g.lineWidth = 1.5;
  for (const [bx, byy, s] of [[W * 0.3, H * 0.15, 5], [W * 0.36, H * 0.12, 4], [W * 0.62, H * 0.19, 5]]) {
    g.beginPath();
    g.moveTo(bx - s, byy);
    g.quadraticCurveTo(bx - s * 0.4, byy - s * 0.6, bx, byy);
    g.quadraticCurveTo(bx + s * 0.4, byy - s * 0.6, bx + s, byy);
    g.stroke();
  }

  g.fillStyle = '#f0e3c0';
  const hx = W * 0.12, hy = H * 0.5, hs = Math.max(16, H * 0.07);
  g.fillRect(hx, hy - hs * 0.5, hs, hs * 0.5);
  g.fillStyle = '#c8432f';
  g.beginPath();
  g.moveTo(hx - hs * 0.1, hy - hs * 0.5);
  g.lineTo(hx + hs * 0.5, hy - hs * 0.5);
  g.lineTo(hx + hs * 0.2, hy - hs * 0.85);
  g.closePath();
  g.fill();
  g.fillStyle = '#7a5230';
  g.fillRect(hx + hs * 0.18, hy - hs * 0.25, hs * 0.16, hs * 0.25);

  function tree(tx, ty, s) {
    g.fillStyle = '#8a6136';
    g.fillRect(tx - 2 * s * 0.06, ty - 2 * s * 0.35, 2 * s * 0.12, 2 * s * 0.35);
    g.fillStyle = '#5f9c46';
    g.beginPath();
    g.arc(tx - 2 * s * 0.18, ty - 2 * s * 0.42, s * 0.35, 0, 6.283);
    g.fill();
    g.beginPath();
    g.arc(tx + 2 * s * 0.15, ty - 2 * s * 0.5, s * 0.4, 0, 6.283);
    g.fill();
    g.fillStyle = '#4c8a3a';
    g.beginPath();
    g.arc(tx, ty - 2 * s * 0.58, s * 0.42, 0, 6.283);
    g.fill();
  }
  tree(W * 0.09, H * 0.68, H * 0.045);
  tree(W * 0.88, H * 0.64, H * 0.055);

  g.fillStyle = '#6d9450';
  g.beginPath();
  g.moveTo(0, H);
  g.lineTo(0, H * 0.74);
  g.quadraticCurveTo(W * 0.3, H * 0.7, W * 0.5, H * 0.75);
  g.quadraticCurveTo(W * 0.7, H * 0.8, W, H * 0.76);
  g.lineTo(W, H);
  g.closePath();
  g.fill();
  g.strokeStyle = 'rgba(60,90,40,.25)';
  g.lineWidth = 1;
  for (let i = 0; i < 6; i++) {
    const yy = H * (0.78 + i * 0.035);
    g.beginPath();
    g.moveTo(0, yy);
    g.quadraticCurveTo(W * 0.25, yy - 8, W * 0.5, yy);
    g.quadraticCurveTo(W * 0.75, yy + 8, W, yy);
    g.stroke();
  }

  g.strokeStyle = 'rgba(90,64,38,.8)';
  g.lineWidth = 2;
  const fy = H * 0.7;
  for (let i = 0; i < 2; i++) {
    g.beginPath();
    g.moveTo(0, fy + i * 10);
    g.lineTo(W, fy + i * 10);
    g.stroke();
  }
  g.strokeStyle = '#6b4a2c';
  g.lineWidth = 4;
  for (let x = 12; x < W; x += 34) {
    g.beginPath();
    g.moveTo(x, fy + 14);
    g.lineTo(x, fy - 4);
    g.stroke();
  }
}

function bakeVignette() {
  vigLayer = document.createElement('canvas');
  vigLayer.width = Math.round(W * dpr);
  vigLayer.height = Math.round(H * dpr);
  const g = vigLayer.getContext('2d');
  g.scale(dpr, dpr);
  const rg = g.createRadialGradient(W / 2, H * 0.42, Math.min(W, H) * 0.4, W / 2, H * 0.5, Math.max(W, H) * 0.75);
  rg.addColorStop(0, 'rgba(18,26,12,0)');
  rg.addColorStop(1, 'rgba(18,26,12,.3)');
  g.fillStyle = rg;
  g.fillRect(0, 0, W, H);
}

function layout() {
  const hudH = 58, ctrlH = 100, margin = 10;
  const top = hudH + 2, bottom = H - ctrlH;
  cell = Math.floor(Math.min((W - 2 * margin) / COLS, (bottom - top - 8) / ROWS));
  cell = Math.max(16, Math.min(64, cell));
  const frameT = Math.max(8, Math.round(cell * 0.36));
  const previewH = cell * 1.05;
  boardW = COLS * cell + frameT * 2;
  boardH = ROWS * cell + frameT * 2;
  bx = Math.round((W - boardW) / 2);
  prevY = top + 2;
  by = prevY + previewH + 6;
  if (by + boardH > bottom) by = Math.max(top + 2, bottom - boardH);
  if (by < top + 2) { by = top + 2; prevY = Math.max(2, by - previewH - 6); }
  bakeSprites();
  bakeSoil();
  drawBoard();
}

function resize() {
  dpr = Math.min(2, window.devicePixelRatio || 1);
  W = window.innerWidth;
  H = window.innerHeight;
  canvas.width = Math.round(W * dpr);
  canvas.height = Math.round(H * dpr);
  canvas.style.width = W + 'px';
  canvas.style.height = H + 'px';
  layout();
  drawBg();
  bakeVignette();
}

function gridPx(x, y) {
  return { x: gx + x * cell + cell / 2, y: gy + y * cell + cell / 2 };
}

function ensureQueue() {
  while (queue.length < 4) {
    if (cropBag.length < 4) cropBag = makeBag(rng);
    const shapeId = pickShape(rng);
    const base = SHAPE_ROTS.get(shapeId)[0];
    const cells = base.map(([sx, sy]) => ({ x: sx, y: sy, crop: cropBag.pop() }));
    queue.push({ shapeId, cells });
  }
}

function cellAt(cells, px, py) {
  for (const c of cells) {
    const x = px + c.x, y = py + c.y;
    if (x < 0 || x >= COLS || y < 0 || y >= ROWS) return true;
    if (grid[y][x]) return true;
  }
  return false;
}

function rotateCells(cells) {
  const my = Math.max(...cells.map(c => c.y));
  const rot = cells.map(c => ({ crop: c.crop, x: my - c.y, y: c.x }));
  const mx = Math.min(...rot.map(c => c.x));
  const mY = Math.min(...rot.map(c => c.y));
  return rot.map(c => ({ crop: c.crop, x: c.x - mx, y: c.y - mY }));
}

function spawn() {
  const p = queue.shift();
  ensureQueue();
  const maxX = Math.max(...p.cells.map(c => c.x));
  p.px = Math.floor((COLS - 1 - maxX) / 2);
  p.py = 0;
  if (cellAt(p.cells, p.px, p.py)) { endGame(); return; }
  piece = p;
  dropAcc = 0;
}

function tryMove(dx) {
  if (!cellAt(piece.cells, piece.px + dx, piece.py)) {
    piece.px += dx;
    sfx('move');
    return true;
  }
  return false;
}

function tryRotate() {
  const rotated = rotateCells(piece.cells);
  const kicks = [0, -1, 1, -2, 2];
  for (const k of kicks) {
    if (!cellAt(rotated, piece.px + k, piece.py)) {
      piece.cells = rotated;
      piece.px += k;
      sfx('rotate');
      return;
    }
  }
  sfx('error');
}

function stepGravity() {
  if (!cellAt(piece.cells, piece.px, piece.py + 1)) {
    piece.py++;
    return true;
  }
  settle();
  return false;
}

function hardDrop() {
  while (!cellAt(piece.cells, piece.px, piece.py + 1)) piece.py++;
  sfx('drop');
  settle();
}

function ghostY() {
  let y = piece.py;
  while (!cellAt(piece.cells, piece.px, y + 1)) y++;
  return y;
}

function findMilpa(placed) {
  for (const c of placed) {
    if (withered[c.y][c.x]) continue;
    const has = { maiz: false, frijol: false, calabaza: false };
    has[c.crop] = true;
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        if (!dx && !dy) continue;
        const nx = c.x + dx, ny = c.y + dy;
        if (nx < 0 || nx >= COLS || ny < 0 || ny >= ROWS) continue;
        const nc = grid[ny][nx];
        if (!nc || withered[ny][nx]) continue;
        if (nc === 'maiz' || nc === 'frijol' || nc === 'calabaza') has[nc] = true;
      }
    }
    if (has.maiz && has.frijol && has.calabaza) return { hub: c };
  }
  return null;
}

function evaluate(placed) {
  const res = { score: 0, compat: [], antag: [], revives: [], wither: [], milpa: null };
  const placedSet = new Set(placed.map(c => c.y * COLS + c.x));
  const seen = new Set();
  for (const c of placed) {
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        if (!dx && !dy) continue;
        const nx = c.x + dx, ny = c.y + dy;
        if (nx < 0 || nx >= COLS || ny < 0 || ny >= ROWS) continue;
        const id = ny * COLS + nx;
        if (placedSet.has(id)) continue;
        const nc = grid[ny][nx];
        if (!nc) continue;
        const cid = c.y * COLS + c.x;
        const key = cid < id ? cid + '-' + id : id + '-' + cid;
        if (seen.has(key)) continue;
        seen.add(key);
        const r = relation(c.crop, nc);
        const other = { x: nx, y: ny, crop: nc };
        if (withered[ny][nx]) {
          if (r === 1) {
            res.revives.push(other);
            res.score += REVIVE_PTS;
          }
          continue;
        }
        if (r === 1) {
          res.compat.push({ a: c, b: other });
          res.score += COMPAT_PTS;
        } else if (r === -1) {
          res.antag.push({ a: c, b: other });
          res.score -= ANTAG_PTS;
        }
      }
    }
  }
  const ws = new Set();
  for (const p of res.antag) ws.add(p.a.y * COLS + p.a.x);
  for (const k of ws) {
    const x = k % COLS, y = (k / COLS) | 0;
    withered[y][x] = true;
    res.wither.push({ x, y });
  }
  for (const rv of res.revives) withered[rv.y][rv.x] = false;
  res.milpa = findMilpa(placed);
  if (res.milpa) {
    combo++;
    milpas++;
    res.score += MILPA_BASE * combo;
  } else {
    combo = 0;
  }
  return res;
}

function floatText(x, y, text, color, size) {
  fx.floats.push({ x, y, text, color, size, t0: time, life: 1150 });
}

function pulse(x, y, color) {
  fx.pulses.push({ x, y, color, t0: time });
}

function addPart(p) {
  if (fx.parts.length < 420) fx.parts.push(p);
}

function burstLeaf(cx, cy, n) {
  for (let i = 0; i < n; i++) {
    addPart({
      x: cx, y: cy, vx: (Math.random() - 0.5) * 0.06, vy: -Math.random() * 0.05,
      age: 0, life: 900 + Math.random() * 700, type: 'leaf',
      color: Math.random() < 0.5 ? '#8fc65d' : '#6f9c4a',
      rot: Math.random() * 6.283, vr: (Math.random() - 0.5) * 0.012,
      size: cell * (0.1 + Math.random() * 0.1), grav: 0.00003,
    });
  }
}

function burstSparkle(cx, cy, n) {
  for (let i = 0; i < n; i++) {
    const a = Math.random() * 6.283, sp = 0.02 + Math.random() * 0.09;
    addPart({
      x: cx, y: cy, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 0.03,
      age: 0, life: 700 + Math.random() * 500, type: 'sparkle',
      color: Math.random() < 0.5 ? '#f6d67a' : '#ffe9a8',
      rot: 0, vr: 0, size: cell * (0.1 + Math.random() * 0.08), grav: 0.00001,
    });
  }
}

function burstPuff(cx, cy, n) {
  for (let i = 0; i < n; i++) {
    addPart({
      x: cx + (Math.random() - 0.5) * cell * 0.5, y: cy + (Math.random() - 0.5) * cell * 0.2,
      vx: (Math.random() - 0.5) * 0.02, vy: -Math.random() * 0.02,
      age: 0, life: 420 + Math.random() * 300, type: 'puff',
      color: 'rgba(168,136,92,.5)', rot: 0, vr: 0, size: cell * (0.12 + Math.random() * 0.1), grav: 0,
    });
  }
}

function burstHeart(cx, cy) {
  addPart({
    x: cx, y: cy, vx: (Math.random() - 0.5) * 0.03, vy: -0.09,
    age: 0, life: 900, type: 'heart', color: '#f2b0c0', rot: 0, vr: 0,
    size: cell * 0.22, grav: 0.00002,
  });
}

function applySettleFx(res, placed) {
  if (res.milpa) sfx('milpa');
  else if (res.antag.length) sfx('antag');
  else if (res.compat.length) sfx('compat');
  else if (res.revives.length) sfx('revive');
  else sfx('settle');

  const maxY = Math.max(...placed.map(c => c.y));
  for (const c of placed) {
    const p = gridPx(c.x, c.y);
    pulse(p.x, p.y, '#bcd9a0');
    if (c.y === maxY) burstPuff(p.x, p.y + cell * 0.3, 2);
  }

  for (const p of res.compat) {
    const p1 = gridPx(p.a.x, p.a.y), p2 = gridPx(p.b.x, p.b.y);
    const mx = (p1.x + p2.x) / 2, my = (p1.y + p2.y) / 2;
    pulse(mx, my, '#8fc65d');
    floatText(mx, my - cell * 0.15, '+' + COMPAT_PTS, '#6aa84f', cell * 0.42);
    burstLeaf(mx, my, 3);
    const why = compatReason(p.a.crop, p.b.crop);
    if (why && time - lastCompatToast > 6000) {
      lastCompatToast = time;
      toast(why);
    }
  }

  for (const p of res.antag) {
    const p1 = gridPx(p.a.x, p.a.y), p2 = gridPx(p.b.x, p.b.y);
    const mx = (p1.x + p2.x) / 2, my = (p1.y + p2.y) / 2;
    pulse(mx, my, '#d34b3a');
    floatText(mx, my - cell * 0.15, '-' + ANTAG_PTS, '#c8432f', cell * 0.42);
    const why = antagReason(p.a.crop, p.b.crop);
    if (why && time - lastAntagToast > 2600) {
      lastAntagToast = time;
      toast(why);
    }
  }

  for (const rv of res.revives) {
    const p = gridPx(rv.x, rv.y);
    pulse(p.x, p.y, '#5fc9a0');
    floatText(p.x, p.y - cell * 0.2, '+' + REVIVE_PTS + ' revive', '#6fd6a0', cell * 0.4);
    burstLeaf(p.x, p.y, 4);
    burstHeart(p.x, p.y);
  }

  if (res.milpa) {
    const h = res.milpa.hub;
    const hp = gridPx(h.x, h.y);
    const bonus = MILPA_BASE * combo;
    pulse(hp.x, hp.y, '#f6d67a');
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        if (!dx && !dy) continue;
        const nx = h.x + dx, ny = h.y + dy;
        if (nx < 0 || nx >= COLS || ny < 0 || ny >= ROWS) continue;
        const nc = grid[ny][nx];
        if (nc && MILPA.includes(nc) && !withered[ny][nx]) {
          const p = gridPx(nx, ny);
          pulse(p.x, p.y, '#f6d67a');
          burstSparkle(p.x, p.y, 4);
        }
      }
    }
    burstSparkle(hp.x, hp.y, 12);
    floatText(W / 2, gy - cell * 0.6, '¡MILPA! +' + bonus, '#f6d67a', Math.round(cell * 0.62));
    if (combo >= 2) toast('¡Milpa en cadena x' + combo + '!');
    if (!firstMilpaShown) {
      firstMilpaShown = true;
      showMilpaModal();
    }
  }

  if (res.antag.length) shake = Math.max(shake, 7);
  score = Math.max(0, score);
}

function toast(msg) {
  const el = $('message');
  el.textContent = msg;
  el.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('show'), 2300);
}
let toastTimer = null;

function settle() {
  planted++;
  const placed = piece.cells.map(c => ({ x: piece.px + c.x, y: piece.py + c.y, crop: c.crop }));
  for (const c of placed) grid[c.y][c.x] = c.crop;
  const res = evaluate(placed);
  applySettleFx(res, placed);
  const nl = 1 + Math.floor((planted - 1) / LEVEL_EVERY);
  if (nl > level) {
    level = nl;
    gravityMs = Math.max(GRAV_MIN, GRAV0 * Math.pow(GRAV_F, level - 1));
    toast('¡Nivel ' + level + '! Las semillas se apuran.');
    sfx('level');
  }
  ensureQueue();
  spawn();
}

function updateHud() {
  const el = (id, v) => {
    const n = $(id);
    if (n.textContent !== String(v)) n.textContent = v;
  };
  el('score', Math.round(displayScore));
  el('level', level);
  el('best', best);
  const cc = $('comboChip');
  if (combo >= 2) {
    cc.classList.add('show');
    el('combo', 'x' + combo);
  } else {
    cc.classList.remove('show');
  }
}

function resetGame() {
  grid = Array.from({ length: ROWS }, () => Array(COLS).fill(null));
  withered = Array.from({ length: ROWS }, () => Array(COLS).fill(false));
  fx.floats = [];
  fx.parts = [];
  fx.pulses = [];
  queue = [];
  cropBag = [];
  piece = null;
  score = 0;
  displayScore = 0;
  level = 1;
  combo = 0;
  planted = 0;
  milpas = 0;
  gravityMs = GRAV0;
  dropAcc = 0;
  softDropHeld = false;
  shake = 0;
  lastAntagToast = 0;
  lastCompatToast = 0;
  ensureQueue();
  spawn();
  paused = false;
  state = 'playing';
  setControlsDisabled(false);
  updateHud();
}

function endGame() {
  state = 'over';
  piece = null;
  sfx('over');
  const isNew = score > best;
  if (isNew) {
    best = score;
    try { localStorage.setItem('lamilpa_best', String(best)); } catch (e) { /* sin storage */ }
  }
  $('finalScore').textContent = score;
  $('finalPlanted').textContent = planted;
  $('finalMilpas').textContent = milpas;
  $('newRecord').style.display = isNew ? 'block' : 'none';
  $('gameover').classList.remove('hidden');
  setControlsDisabled(true);
  updateHud();
}

function setControlsDisabled(v) {
  [leftBtn, rightBtn, rotBtn, dropBtn].forEach(b => { b.disabled = v; });
}

function drawTinyIn(cv, crop) {
  const g = cv.getContext('2d');
  const S = cv.width;
  g.fillStyle = '#5f4227';
  g.fillRect(0, 0, S, S);
  paintCropTo(g, crop, S / 2, S / 2, S / 2 * 0.85);
}

function buildMilpaModal() {
  const list = $('milpaRoles');
  list.innerHTML = '';
  for (const m of MILPA_INFO) {
    const row = document.createElement('div');
    row.className = 'sister';
    const cv = document.createElement('canvas');
    cv.className = 'sisterIcon';
    cv.width = 56;
    cv.height = 56;
    drawTinyIn(cv, m.id);
    const label = document.createElement('div');
    const b = document.createElement('strong');
    b.textContent = m.role;
    const sp = document.createElement('span');
    sp.textContent = m.text;
    label.appendChild(b);
    label.appendChild(sp);
    row.appendChild(cv);
    row.appendChild(label);
    list.appendChild(row);
  }
}

function showMilpaModal() {
  paused = true;
  setControlsDisabled(true);
  $('milpaModal').classList.remove('hidden');
}

function hideMilpaModal() {
  paused = false;
  setControlsDisabled(false);
  $('milpaModal').classList.add('hidden');
}

function loadBest() {
  try { best = parseInt(localStorage.getItem('lamilpa_best') || '0', 10) || 0; } catch (e) { best = 0; }
  $('best').textContent = best;
  if (best > 0) $('bestIntro').textContent = 'Récord de la chagra: ' + best;
}

function drawCropSprite(crop, px, py, bobAmp, alpha) {
  ctx.globalAlpha = alpha;
  const off = bobAmp ? -Math.sin(time * 0.004 + cellPhase(px, py) * 6.283) * cell * bobAmp : 0;
  ctx.drawImage(SPRITES[crop], px, py + off, cell, cell);
  ctx.globalAlpha = 1;
}

function drawCropCell(crop, x, y, px, py) {
  const sway = Math.sin(time * 0.0015 + cellPhase(x, y) * 6.283) * 0.035;
  ctx.save();
  ctx.translate(px + cell / 2, py + cell / 2);
  ctx.rotate(sway);
  ctx.drawImage(SPRITES[crop], -cell / 2, -cell / 2, cell, cell);
  ctx.restore();
}

function drawWiltOverlay(px, py) {
  ctx.fillStyle = 'rgba(60,40,15,.2)';
  ctx.fillRect(px, py, cell, cell);
  ctx.save();
  ctx.translate(px + cell * 0.26, py + cell * 0.82);
  ctx.rotate(-0.6);
  ctx.beginPath();
  ctx.ellipse(0, 0, cell * 0.14, cell * 0.07, 0, 0, 6.283);
  ctx.fillStyle = '#8a7444';
  ctx.fill();
  ctx.restore();
  ctx.save();
  ctx.translate(px + cell * 0.74, py + cell * 0.8);
  ctx.rotate(0.5);
  ctx.beginPath();
  ctx.ellipse(0, 0, cell * 0.12, cell * 0.06, 0, 0, 6.283);
  ctx.fillStyle = '#7a6a3a';
  ctx.fill();
  ctx.restore();
}

function drawPieceCells(cells, px, py, alpha, bobAmp) {
  for (const c of cells) {
    const x = px + c.x, y = py + c.y;
    if (y < 0) continue;
    const cx = gx + x * cell, cy = gy + y * cell;
    drawCropSprite(c.crop, cx, cy, bobAmp || 0, alpha);
    if (alpha < 0.5) {
      ctx.strokeStyle = 'rgba(255,248,220,.5)';
      ctx.setLineDash([4, 4]);
      ctx.lineWidth = 1;
      ctx.strokeRect(cx + 1, cy + 1, cell - 2, cell - 2);
      ctx.setLineDash([]);
    }
  }
}

function drawPulses() {
  for (const p of fx.pulses) {
    const t = (time - p.t0) / 700;
    if (t > 1) continue;
    const a = 1 - t;
    const r = cell * (0.25 + t * 0.5);
    ctx.globalAlpha = a * 0.5;
    ctx.fillStyle = p.color;
    ctx.beginPath();
    ctx.arc(p.x, p.y, r, 0, 6.283);
    ctx.fill();
    ctx.globalAlpha = a;
    ctx.lineWidth = 2;
    ctx.strokeStyle = p.color;
    ctx.beginPath();
    ctx.arc(p.x, p.y, r * 1.12, 0, 6.283);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
}

function drawFloats() {
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  for (const f of fx.floats) {
    const t = (time - f.t0) / f.life;
    if (t > 1) continue;
    const a = 1 - t;
    const pop = t < 0.18 ? 1 + 0.6 * Math.sin(t / 0.18 * Math.PI) : 1;
    const yy = f.y - t * cell * 1.25;
    ctx.font = 'italic bold ' + Math.round(f.size * pop) + 'px Georgia';
    ctx.globalAlpha = a;
    ctx.lineWidth = 3;
    ctx.strokeStyle = 'rgba(30,20,10,.55)';
    ctx.strokeText(f.text, f.x, yy);
    ctx.fillStyle = f.color;
    ctx.fillText(f.text, f.x, yy);
  }
  ctx.globalAlpha = 1;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
}

function starPath(g, x, y, r) {
  g.beginPath();
  for (let i = 0; i < 8; i++) {
    const rr2 = i % 2 === 0 ? r : r * 0.45;
    const a = i / 8 * 6.283;
    const px = x + Math.cos(a) * rr2, py = y + Math.sin(a) * rr2;
    if (i === 0) g.moveTo(px, py);
    else g.lineTo(px, py);
  }
  g.closePath();
}

function heartPath(g, x, y, s) {
  g.beginPath();
  g.moveTo(x, y + s * 0.4);
  g.bezierCurveTo(x + s * 0.9, y - s * 0.1, x + s * 0.5, y - s * 0.9, x, y - s * 0.3);
  g.bezierCurveTo(x - s * 0.5, y - s * 0.9, x - s * 0.9, y - s * 0.1, x, y + s * 0.4);
  g.closePath();
}

function drawParts() {
  for (const p of fx.parts) {
    const a = 1 - p.age / p.life;
    ctx.globalAlpha = Math.max(0, a);
    if (p.type === 'leaf') {
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rot);
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.ellipse(0, 0, p.size, p.size * 0.55, 0, 0, 6.283);
      ctx.fill();
      ctx.restore();
    } else if (p.type === 'sparkle') {
      ctx.fillStyle = p.color;
      starPath(ctx, p.x, p.y, p.size * (0.6 + 0.4 * a));
      ctx.fill();
    } else if (p.type === 'puff') {
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size * (1.5 - a * 0.5), 0, 6.283);
      ctx.fill();
    } else if (p.type === 'heart') {
      ctx.fillStyle = p.color;
      heartPath(ctx, p.x, p.y, p.size);
      ctx.fill();
    }
  }
  ctx.globalAlpha = 1;
}

function updateFx(dt) {
  const s = dt / 16.7;
  for (const p of fx.parts) {
    p.age += dt;
    p.x += p.vx * s;
    p.y += p.vy * s;
    if (p.grav) p.vy += p.grav * s;
    p.rot += p.vr * s;
  }
  fx.parts = fx.parts.filter(p => p.age < p.life);
  fx.floats = fx.floats.filter(f => (time - f.t0) < f.life);
  fx.pulses = fx.pulses.filter(p => (time - p.t0) < 700);
  if (displayScore !== score) {
    displayScore += (score - displayScore) * 0.15;
    if (Math.abs(score - displayScore) < 1) displayScore = score;
  }
}

function drawPreviews() {
  if (state !== 'playing') return;
  const m = Math.max(6, Math.round(cell * 0.28));
  const n = Math.min(3, queue.length);
  if (!n) return;
  const gap = m * 3.6;
  const total = n * gap;
  let x0 = Math.round(W / 2 - total / 2);
  const y0 = prevY;
  ctx.font = 'italic ' + Math.max(10, cell * 0.22) + 'px Georgia';
  ctx.fillStyle = 'rgba(247,239,210,.85)';
  ctx.textAlign = 'center';
  ctx.fillText('Próximas', W / 2, y0 + cell * 0.28);
  for (let i = 0; i < n; i++) {
    const p = queue[i];
    const px = x0 + i * gap;
    for (let yy = 0; yy < 3; yy++) {
      for (let xx = 0; xx < 3; xx++) {
        ctx.fillStyle = '#6a4a2c';
        ctx.fillRect(px + xx * m, y0 + m * 1.2 + yy * m, m, m);
        ctx.strokeStyle = 'rgba(60,40,20,.5)';
        ctx.lineWidth = 1;
        ctx.strokeRect(px + xx * m + 0.5, y0 + m * 1.2 + yy * m + 0.5, m - 1, m - 1);
      }
    }
    for (const c of p.cells) {
      ctx.drawImage(TINY[c.crop], px + c.x * m, y0 + m * 1.2 + c.y * m, m, m);
    }
  }
}

function draw() {
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, W, H);
  ctx.drawImage(bgLayer, 0, 0, W, H);
  let ox = 0, oy = 0;
  if (shake > 0) {
    ox = (Math.random() - 0.5) * shake;
    oy = (Math.random() - 0.5) * shake;
    shake *= 0.85;
    if (shake < 0.3) shake = 0;
  }
  ctx.save();
  ctx.translate(ox, oy);
  ctx.drawImage(boardLayer, bx, by, boardW, boardH);
  for (let y = 0; y < ROWS; y++) {
    for (let x = 0; x < COLS; x++) {
      const c = grid[y][x];
      if (!c) continue;
      const px = gx + x * cell, py = gy + y * cell;
      if (withered[y][x]) {
        ctx.drawImage(WILTS[c], px, py, cell, cell);
        drawWiltOverlay(px, py);
      } else {
        drawCropCell(c, x, y, px, py);
      }
    }
  }
  drawPulses();
  if (piece) {
    const gy2 = ghostY();
    drawPieceCells(piece.cells, piece.px, gy2, 0.34, 0);
    drawPieceCells(piece.cells, piece.px, piece.py, 1, 0.09);
  }
  drawFloats();
  drawParts();
  ctx.restore();
  ctx.drawImage(vigLayer, 0, 0, W, H);
  drawPreviews();
  updateHud();
}

function frame(t) {
  const dt = Math.min(100, t - last);
  last = t;
  time += dt;
  if (state === 'playing' && piece && !paused) {
    const iv = softDropHeld ? Math.max(45, gravityMs / 8) : gravityMs;
    dropAcc += dt;
    let guard = 0;
    while (dropAcc >= iv && state === 'playing' && piece && guard++ < 16) {
      dropAcc -= iv;
      if (!stepGravity()) { dropAcc = 0; break; }
    }
  }
  updateFx(dt);
  draw();
  requestAnimationFrame(frame);
}

function bindHold(el, fn) {
  let iv = null;
  el.addEventListener('pointerdown', e => {
    e.preventDefault();
    initAudio();
    if (state !== 'playing' || paused) return;
    fn();
    if (state === 'playing' && !paused) {
      iv = setInterval(() => {
        if (state === 'playing' && !paused) fn();
        else clearInterval(iv);
      }, 85);
    }
  });
  ['pointerup', 'pointercancel', 'pointerleave', 'pointerout'].forEach(ev => {
    el.addEventListener(ev, () => { clearInterval(iv); iv = null; });
  });
}

muteBtn.addEventListener('click', () => {
  initAudio();
  const m = toggleMute();
  muteBtn.textContent = m ? '✕' : '♪';
});

startBtn.addEventListener('click', () => {
  initAudio();
  sfx('start');
  $('intro').classList.add('hidden');
  resetGame();
});

againBtn.addEventListener('click', () => {
  initAudio();
  sfx('start');
  $('gameover').classList.add('hidden');
  resetGame();
});

milpaOkBtn.addEventListener('click', () => {
  sfx('ui');
  hideMilpaModal();
});
if (AUTO_DEMO) queueMicrotask(() => startBtn.click());

window.addEventListener('keydown', e => {
  if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Space'].includes(e.code)) e.preventDefault();
  initAudio();
  if (state !== 'playing' || paused) return;
  if (!piece) return;
  switch (e.code) {
    case 'ArrowLeft': tryMove(-1); break;
    case 'ArrowRight': tryMove(1); break;
    case 'ArrowUp': tryRotate(); break;
    case 'ArrowDown':
      if (!e.repeat && stepGravity()) sfx('softdrop');
      softDropHeld = true;
      break;
    case 'Space':
      if (!e.repeat) hardDrop();
      break;
  }
});

window.addEventListener('keyup', e => {
  if (e.code === 'ArrowDown') softDropHeld = false;
});

let resizeTimer = null;
window.addEventListener('resize', () => {
  clearTimeout(resizeTimer);
  resizeTimer = setTimeout(resize, 120);
});

setControlsDisabled(true);
loadBest();
bakeTiny();
buildMilpaModal();
resize();
requestAnimationFrame(t => { last = t; frame(t); });
