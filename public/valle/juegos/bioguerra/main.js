const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const graphCanvas = document.getElementById('graph');
const gctx = graphCanvas.getContext('2d');
const hudEl = document.getElementById('hud');
const threatCardEl = document.getElementById('threatCard');
const dockEl = document.getElementById('dock');
const deckEl = document.getElementById('deck');
const toastEl = document.getElementById('toast');
const introEl = document.getElementById('intro');
const endEl = document.getElementById('end');
const threatNameEl = document.getElementById('threatName');
const threatSciEl = document.getElementById('threatSci');
const threatNoteEl = document.getElementById('threatNote');
const waveTextEl = document.getElementById('waveText');
const healthTextEl = document.getElementById('healthText');
const moneyTextEl = document.getElementById('moneyText');
const phaseTextEl = document.getElementById('phaseText');
const fpsTextEl = document.getElementById('fpsText');
const titleEl = document.getElementById('title');
const subtitleEl = document.getElementById('subtitle');
const cursorEl = document.getElementById('cursor');
const startBtn = document.getElementById('startBtn');
const playAgainBtn = document.getElementById('playAgainBtn');
const closeEndBtn = document.getElementById('closeEndBtn');
const monitorBtn = document.getElementById('monitorBtn');
const nextBtn = document.getElementById('nextBtn');
const restartBtn = document.getElementById('restartBtn');
const AUTO_DEMO = new URLSearchParams(location.search).get('autostart') === '1';

const GRID = { rows: 5, cols: 8 };
const PESTS = {
  broca: { common: 'Broca del café', sci: 'Hypothenemus hampei', tint: '#6a4522', accent: '#e1c48a', size: 0.95, speed: 48, hp: 16, reward: 4, damage: 2, kind: 'beetle' },
  blanca: { common: 'Mosca blanca', sci: 'Bemisia tabaci', tint: '#f5fbfa', accent: '#c8dde1', size: 0.82, speed: 56, hp: 12, reward: 4, damage: 1, kind: 'fly' },
  trips: { common: 'Trips de la cebolla', sci: 'Thrips tabaci', tint: '#82572c', accent: '#ecd8a5', size: 0.78, speed: 62, hp: 10, reward: 4, damage: 1, kind: 'sliver' },
  minador: { common: 'Minador de la hoja', sci: 'Liriomyza spp.', tint: '#4f6f47', accent: '#d1e6bd', size: 0.98, speed: 44, hp: 18, reward: 5, damage: 2, kind: 'leafmine' },
  roya: { common: 'Roya del café', sci: 'Hemileia vastatrix', tint: '#ce7c32', accent: '#f1c85f', size: 1.0, speed: 38, hp: 20, reward: 5, damage: 2, kind: 'rust' },
};
const DEFENDERS = [
  { id: 'beauveria', common: 'Beauveria bassiana', sci: 'Beauveria bassiana', role: 'hongo entomopatógeno', cost: 12, range: 2.4, fire: 1.1, damage: 7, speed: 430, tint: '#7dbf63', accent: '#f4f2cf', targets: ['broca'], kind: 'fungus' },
  { id: 'cephalonomia', common: 'Cephalonomia stephanoderis', sci: 'Cephalonomia stephanoderis', role: 'avispa parasitoide', cost: 10, range: 2.0, fire: 0.9, damage: 5, speed: 460, tint: '#87a86a', accent: '#f4e3aa', targets: ['broca'], kind: 'parasitoid' },
  { id: 'encarsia', common: 'Encarsia formosa', sci: 'Encarsia formosa', role: 'avispa parasitoide', cost: 9, range: 2.3, fire: 0.95, damage: 4, speed: 470, tint: '#c9dfcb', accent: '#f8f3d7', targets: ['blanca'], kind: 'parasitoid' },
  { id: 'swirskii', common: 'Amblyseius swirskii', sci: 'Amblyseius swirskii', role: 'ácaro depredador', cost: 8, range: 1.8, fire: 0.7, damage: 3, speed: 500, tint: '#93bf66', accent: '#eff5d4', targets: ['blanca'], kind: 'predator' },
  { id: 'lecanicillium', common: 'Lecanicillium lecanii', sci: 'Lecanicillium lecanii', role: 'hongo entomopatógeno', cost: 11, range: 2.2, fire: 1.25, damage: 6, speed: 420, tint: '#6ec98a', accent: '#f3f6dd', targets: ['blanca'], kind: 'fungus' },
  { id: 'orius', common: 'Orius insidiosus', sci: 'Orius insidiosus', role: 'chinche benéfica', cost: 9, range: 2.0, fire: 0.55, damage: 3, speed: 520, tint: '#8e5b31', accent: '#f5d79b', targets: ['trips'], kind: 'dart' },
  { id: 'cucumeris', common: 'Amblyseius cucumeris', sci: 'Amblyseius cucumeris', role: 'ácaro depredador', cost: 8, range: 1.7, fire: 0.8, damage: 3, speed: 510, tint: '#a4c97b', accent: '#edf4d0', targets: ['trips'], kind: 'predator' },
  { id: 'metarhizium', common: 'Metarhizium anisopliae', sci: 'Metarhizium anisopliae', role: 'hongo entomopatógeno', cost: 12, range: 2.1, fire: 1.05, damage: 6, speed: 430, tint: '#7ad27d', accent: '#f4f8dc', targets: ['trips'], kind: 'fungus' },
  { id: 'diglyphus', common: 'Diglyphus isaea', sci: 'Diglyphus isaea', role: 'avispa parasitoide', cost: 10, range: 2.3, fire: 0.95, damage: 7, speed: 470, tint: '#97b76e', accent: '#f2efc1', targets: ['minador'], kind: 'parasitoid' },
  { id: 'trichoderma', common: 'Trichoderma harzianum', sci: 'Trichoderma harzianum', role: 'hongo benéfico', cost: 11, range: 2.5, fire: 1.15, damage: 7, speed: 400, tint: '#68b965', accent: '#f1f4d5', targets: ['roya'], kind: 'fungus' },
];
const WAVES = [
  { pest: 'broca', count: 7, interval: 1.7, gap: 0.9, rows: [0, 1, 2, 3, 4], label: 'Broca del café' },
  { pest: 'blanca', count: 9, interval: 1.45, gap: 0.6, rows: [0, 1, 2, 3, 4], label: 'Mosca blanca' },
  { pest: 'trips', count: 11, interval: 1.28, gap: 0.5, rows: [1, 2, 3], label: 'Trips de la cebolla' },
  { pest: 'minador', count: 8, interval: 1.58, gap: 0.7, rows: [0, 1, 2, 3, 4], label: 'Minador de la hoja' },
  { pest: 'roya', count: 10, interval: 1.42, gap: 0.5, rows: [0, 1, 2, 3, 4], label: 'Roya del café' },
];
const EDGE_PAIRS = [
  ['broca', 'beauveria'],
  ['broca', 'cephalonomia'],
  ['blanca', 'encarsia'],
  ['blanca', 'swirskii'],
  ['blanca', 'lecanicillium'],
  ['trips', 'orius'],
  ['trips', 'cucumeris'],
  ['trips', 'metarhizium'],
  ['minador', 'diglyphus'],
  ['roya', 'trichoderma'],
];

const state = {
  started: false,
  finished: false,
  phase: 'intro',
  waveIndex: 0,
  monitorTime: 0,
  monitorMax: 9,
  detected: false,
  detectedAt: null,
  currentThreat: null,
  currentWave: null,
  spawnTimer: 0,
  spawned: 0,
  waveClock: 0,
  waveCleared: false,
  money: 42,
  health: 20,
  score: 0,
  selectedDef: 0,
  cursor: { row: 2, col: 4 },
  units: [],
  pests: [],
  bolts: [],
  bursts: [],
  particles: [],
  solved: new Set(),
  lockedSolves: new Set(),
  toastUntil: 0,
  board: { x: 0, y: 0, w: 0, h: 0, cell: 0, gap: 0 },
  graph: { x1: 0, y1: 0, x2: 0, y2: 0 },
  chrome: { top: 0, bottom: 0 },
};

const rnd = mulberry32(0xB10E2026);
const bg = document.createElement('canvas');
const bctx = bg.getContext('2d');
let W = 0;
let H = 0;
let dpr = 1;
let last = 0;
let deckRefreshAcc = 0;
let fpsAcc = 0;
let fpsFrames = 0;
let fpsValue = 60;

function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
function lerp(a, b, t) { return a + (b - a) * t; }
function smoothstep(a, b, x) {
  const t = clamp((x - a) / (b - a), 0, 1);
  return t * t * (3 - 2 * t);
}
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
function setToast(msg, ms = 1600) {
  toastEl.textContent = msg;
  toastEl.classList.add('show');
  window.clearTimeout(setToast._t);
  setToast._t = window.setTimeout(() => toastEl.classList.remove('show'), ms);
}
function fmt(n) { return String(Math.max(0, Math.floor(n))); }

function currentWaveDef() {
  return WAVES[state.waveIndex] || null;
}

function edgeKey(pest, def) {
  return `${pest}|${def}`;
}

function defenderById(id) {
  return DEFENDERS.find((d) => d.id === id);
}

function pestById(id) {
  return PESTS[id];
}

function matchingEdges(pestId) {
  return DEFENDERS.filter((d) => d.targets.includes(pestId));
}

function solvedCount() {
  return state.solved.size;
}

function isSolvedAll() {
  return EDGE_PAIRS.every(([p, d]) => state.solved.has(edgeKey(p, d)));
}

function resize() {
  dpr = Math.min(window.devicePixelRatio || 1, 2);
  W = window.innerWidth;
  H = window.innerHeight;
  canvas.width = Math.round(W * dpr);
  canvas.height = Math.round(H * dpr);
  canvas.style.width = `${W}px`;
  canvas.style.height = `${H}px`;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  graphCanvas.width = Math.round(graphCanvas.clientWidth * dpr);
  graphCanvas.height = Math.round(graphCanvas.clientHeight * dpr);
  gctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  buildBackground();
  measureChrome();
  layoutBoard();
}
addEventListener('resize', resize);

function measureChrome() {
  const hudBox = hudEl.getBoundingClientRect();
  const threatBox = threatCardEl.getBoundingClientRect();
  const dockBox = dockEl.getBoundingClientRect();
  const introBox = introEl.classList.contains('hidden') ? null : introEl.getBoundingClientRect();
  document.documentElement.style.setProperty('--hud-bottom', `${hudBox.bottom}px`);
  state.chrome.top = Math.max(hudBox.bottom, threatBox.bottom, introBox ? introBox.bottom : 0) + 12;
  state.chrome.bottom = dockBox.height + 12;
}

function layoutBoard() {
  measureChrome();
  const graphBox = graphCanvas.getBoundingClientRect();
  const top = Math.max(96, Math.min(H * 0.34, state.chrome.top));
  const bottom = Math.max(124, state.chrome.bottom);
  const left = 14;
  const right = 14;
  const width = W - left - right - (W > 900 ? Math.min(380, graphBox.width + 18) : 0);
  const height = Math.max(120, H - top - bottom);
  const cell = Math.min(width / GRID.cols, height / GRID.rows);
  const boardW = cell * GRID.cols;
  const boardH = cell * GRID.rows;
  const x = left + 8;
  const y = top + Math.max(10, (height - boardH) * 0.5);
  state.board = { x, y, w: boardW, h: boardH, cell, gap: 0 };
  const cx = x + boardW + 24;
  state.graph = { x1: graphBox.left, y1: graphBox.top, x2: graphBox.right, y2: graphBox.bottom, cx };
  updateCursor();
}

function buildBackground() {
  bg.width = Math.round(W * dpr);
  bg.height = Math.round(H * dpr);
  bctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  const grad = bctx.createLinearGradient(0, 0, 0, H);
  grad.addColorStop(0, '#0c1b10');
  grad.addColorStop(0.35, '#16301b');
  grad.addColorStop(0.67, '#2d5227');
  grad.addColorStop(1, '#759347');
  bctx.fillStyle = grad;
  bctx.fillRect(0, 0, W, H);

  const glow = bctx.createRadialGradient(W * 0.5, H * 0.18, 60, W * 0.5, H * 0.18, Math.max(W, H) * 0.58);
  glow.addColorStop(0, 'rgba(255,245,192,.22)');
  glow.addColorStop(0.4, 'rgba(133,182,88,.08)');
  glow.addColorStop(1, 'rgba(10,18,10,0)');
  bctx.fillStyle = glow;
  bctx.fillRect(0, 0, W, H);

  drawFoliageMasses();
  drawRowsTexture();
}

function leafBlob(x, y, r, tint, alpha = 1) {
  const g = bctx;
  g.save();
  g.globalAlpha = alpha;
  const grad = g.createRadialGradient(x - r * 0.2, y - r * 0.2, r * 0.1, x, y, r);
  grad.addColorStop(0, tint[1]);
  grad.addColorStop(0.45, tint[0]);
  grad.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = grad;
  g.beginPath();
  g.arc(x, y, r, 0, Math.PI * 2);
  g.fill();
  g.restore();
}

function drawFoliageMasses() {
  const g = bctx;
  const tints = [
    ['rgba(31,87,42,.9)', 'rgba(82,146,67,.82)'],
    ['rgba(34,97,45,.84)', 'rgba(109,172,85,.76)'],
    ['rgba(19,63,31,.82)', 'rgba(75,122,58,.72)'],
  ];
  for (let i = 0; i < 180; i++) {
    const x = rnd() * W;
    const y = H * 0.04 + rnd() * H * 0.66;
    const r = 14 + rnd() * 52;
    const tint = tints[i % tints.length];
    leafBlob(x, y, r, tint, 0.28 + rnd() * 0.42);
  }
  for (let i = 0; i < 220; i++) {
    const x = rnd() * W;
    const y = rnd() * H;
    const rx = 5 + rnd() * 10;
    const ry = 1 + rnd() * 3;
    g.save();
    g.translate(x, y);
    g.rotate(rnd() * Math.PI * 2);
    g.fillStyle = i % 3 === 0 ? 'rgba(210,236,172,.14)' : 'rgba(20,32,18,.12)';
    g.beginPath();
    g.ellipse(0, 0, rx, ry, 0, 0, Math.PI * 2);
    g.fill();
    g.restore();
  }
}

function drawRowsTexture() {
  const g = bctx;
  const board = { x: 0, y: H * 0.24, w: W, h: H * 0.56 };
  const rowH = board.h / GRID.rows;
  for (let r = 0; r < GRID.rows; r++) {
    const y = board.y + r * rowH;
    const rowGrad = g.createLinearGradient(0, y, 0, y + rowH);
    rowGrad.addColorStop(0, 'rgba(14,24,14,.02)');
    rowGrad.addColorStop(0.55, 'rgba(42,75,33,.16)');
    rowGrad.addColorStop(1, 'rgba(84,58,26,.12)');
    g.fillStyle = rowGrad;
    g.fillRect(0, y, W, rowH);
    for (let i = 0; i < 12; i++) {
      const x = i * (W / 12) + (r % 2) * 18;
      g.strokeStyle = 'rgba(101,148,70,.16)';
      g.lineWidth = 8 + (i % 3) * 2;
      g.lineCap = 'round';
      g.beginPath();
      g.moveTo(x, y + 8);
      g.quadraticCurveTo(x + 18, y + rowH * 0.48, x + 8, y + rowH - 12);
      g.stroke();
    }
  }
}

function drawCoffeeBeds() {
  const board = state.board;
  const g = ctx;
  g.save();
  g.translate(board.x, board.y);
  for (let r = 0; r < GRID.rows; r++) {
    for (let c = 0; c < GRID.cols; c++) {
      const x = c * board.cell;
      const y = r * board.cell;
      const isCrop = c < 2;
      const bedGrad = g.createLinearGradient(x, y, x + board.cell, y + board.cell);
      if (isCrop) {
        bedGrad.addColorStop(0, '#244b25');
        bedGrad.addColorStop(1, '#486f2f');
      } else {
        bedGrad.addColorStop(0, '#2c5f2e');
        bedGrad.addColorStop(1, '#3b7234');
      }
      g.fillStyle = bedGrad;
      rr(g, x + 3, y + 3, board.cell - 6, board.cell - 6, 14);
      g.fill();
      g.strokeStyle = isCrop ? 'rgba(255,255,255,.04)' : 'rgba(255,255,255,.08)';
      g.lineWidth = 1;
      g.stroke();
      drawLeafMound(x + board.cell * 0.5, y + board.cell * 0.62, isCrop ? 1.05 : 1, c, r);
    }
  }
  g.restore();
}

function drawLeafMound(cx, cy, scale, c, r) {
  const g = ctx;
  const tint = c < 2 ? ['#204522', '#3d6e32', '#6da34a'] : ['#244d27', '#457538', '#78b35a'];
  const masses = c < 2 ? 6 : 5;
  for (let i = 0; i < masses; i++) {
    const ang = (i / masses) * Math.PI * 2 + r * 0.42;
    const dx = Math.cos(ang) * 11 * scale;
    const dy = Math.sin(ang) * 8 * scale;
    const rr0 = 10 + (i % 2) * 6 + (c < 2 ? 4 : 0);
    const grad = g.createRadialGradient(cx + dx * 0.35, cy + dy * 0.2, 2, cx + dx, cy + dy, rr0 * 1.2);
    grad.addColorStop(0, tint[2]);
    grad.addColorStop(0.55, tint[1]);
    grad.addColorStop(1, tint[0]);
    g.fillStyle = grad;
    g.beginPath();
    g.arc(cx + dx, cy + dy, rr0 * 0.95, 0, Math.PI * 2);
    g.fill();
  }
  g.fillStyle = c < 2 ? '#8ea34f' : '#6f9d48';
  g.beginPath();
  g.ellipse(cx, cy + 3, 18 * scale, 9 * scale, 0, 0, Math.PI * 2);
  g.fill();
}

function drawCursor() {
  const board = state.board;
  const { row, col } = state.cursor;
  const x = board.x + col * board.cell + 3;
  const y = board.y + row * board.cell + 3;
  cursorEl.style.left = `${x}px`;
  cursorEl.style.top = `${y}px`;
  cursorEl.style.width = `${board.cell - 6}px`;
  cursorEl.style.height = `${board.cell - 6}px`;
}

function updateCursor() {
  drawCursor();
}

function renderDeck() {
  deckEl.innerHTML = '';
  DEFENDERS.forEach((def, i) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'card' + (i === state.selectedDef ? ' selected' : '');
    btn.dataset.id = def.id;
    const cost = Math.round(def.cost * getCostMultiplier(def));
    btn.innerHTML = `
      <span class="tag">${def.role}</span>
      <div class="name">${def.common}</div>
      <div class="sci">${def.sci}</div>
      <div class="meta"><span>Costo <b>${cost}</b></span><span>${def.targets.map((t) => pestById(t).common).join(' · ')}</span></div>
    `;
    if (cost > state.money) btn.classList.add('locked');
    btn.addEventListener('click', () => {
      state.selectedDef = i;
      renderDeck();
      setToast(`${def.common} seleccionado`, 900);
    });
    deckEl.appendChild(btn);
  });
  measureChrome();
  layoutBoard();
}

function startGame() {
  state.started = true;
  state.finished = false;
  state.phase = 'monitor';
  state.waveIndex = 0;
  state.monitorTime = 9;
  state.monitorMax = 9;
  state.detected = false;
  state.detectedAt = null;
  state.currentWave = currentWaveDef();
  state.currentThreat = state.currentWave ? PESTS[state.currentWave.pest] : null;
  state.spawnTimer = 0;
  state.spawned = 0;
  state.waveClock = 0;
  state.waveCleared = false;
  state.money = 42;
  state.health = 20;
  state.score = 0;
  state.selectedDef = 0;
  state.cursor = { row: 2, col: 4 };
  state.units = [];
  state.pests = [];
  state.bolts = [];
  state.bursts = [];
  state.particles = [];
  state.solved = new Set();
  state.lockedSolves = new Set();
  setPhase('monitor');
  introEl.classList.add('hidden');
  endEl.classList.add('hidden');
  setToast('Monitorea la plaga antes de actuar', 1500);
  syncUI();
  renderDeck();
  updateThreatCard();
  updateCursor();
  if (AUTO_DEMO) {
    window.clearTimeout(startGame._t);
    startGame._t = window.setTimeout(() => {
      monitorNow();
      state.cursor = { row: 2, col: 3 };
      state.selectedDef = 0;
      renderDeck();
      placeUnit();
    }, 1200);
  }
}

function restartGame() {
  startGame();
}

function updateThreatCard() {
  const wave = state.currentWave || currentWaveDef();
  if (!wave) return;
  if (state.detected && state.currentThreat) {
    threatNameEl.textContent = state.currentThreat.common;
    threatSciEl.innerHTML = `Identificada: <strong>${state.currentThreat.sci}</strong>. Ya se puede elegir la defensa adecuada con costo reducido si se actuó a tiempo.`;
    threatNoteEl.innerHTML = `La oleada actual es <strong>${wave.label}</strong>. El grafo te muestra qué control corta esa plaga.`;
  } else {
    threatNameEl.textContent = 'Plaga en observación';
    threatSciEl.textContent = 'Aún no identificada. Inspecciona antes de que la oleada entre al cultivo.';
    threatNoteEl.innerHTML = 'Presiona <strong>M</strong> o el botón <strong>Monitorear</strong> para revelar el nombre y abaratar la defensa correcta.';
  }
}

function setPhase(phase) {
  state.phase = phase;
  phaseTextEl.textContent = phase === 'monitor' ? 'Monitoreo' : phase === 'wave' ? 'Oleada' : phase;
}

function syncUI() {
  waveTextEl.textContent = `${Math.min(state.waveIndex + 1, WAVES.length)}/${WAVES.length}`;
  healthTextEl.textContent = fmt(state.health);
  moneyTextEl.textContent = fmt(state.money);
  phaseTextEl.textContent = state.phase === 'monitor' ? 'Monitoreo' : state.phase === 'wave' ? 'Oleada' : state.phase;
  titleEl.textContent = state.phase === 'monitor' ? 'Monitorear antes de tratar' : state.phase === 'wave' ? 'La plaga ya está entrando' : 'Defensa agroecológica';
  subtitleEl.textContent = state.phase === 'monitor'
    ? 'Detectar temprano baja el costo de la respuesta correcta. Si esperás, la defensa se vuelve más cara.'
    : 'Coloca fauna benéfica y biocontrol real para cortar la oleada sin romper el agroecosistema.';
  updateThreatCard();
  measureChrome();
  layoutBoard();
}

function getCostMultiplier(def) {
  if (!state.started || !state.currentThreat) return 1;
  const match = def.targets.includes(state.currentWave?.pest);
  if (!match) return 1;
  const progress = state.phase === 'monitor'
    ? 1 - (state.monitorTime / state.monitorMax)
    : 1 + clamp(state.waveClock / 12, 0, 1);
  let mult;
  if (state.phase === 'monitor') {
    mult = lerp(0.62, 1.05, progress);
    if (!state.detected) mult *= 1.25;
    else if (state.detectedAt !== null && state.detectedAt <= state.monitorMax * 0.35) mult *= 0.78;
    else mult *= 0.92;
  } else {
    mult = lerp(1.12, 1.82, clamp(progress - 1, 0, 1));
    if (!state.detected) mult *= 1.35;
    else if (state.detectedAt !== null && state.detectedAt <= state.monitorMax * 0.35) mult *= 0.88;
    else mult *= 0.98;
  }
  return mult;
}

function getUnitCost(def) {
  return Math.max(1, Math.round(def.cost * getCostMultiplier(def)));
}

function monitorNow() {
  if (!state.started || state.finished) return;
  if (!state.detected) {
    state.detected = true;
    state.detectedAt = state.monitorMax - state.monitorTime;
    const wave = state.currentWave;
    if (wave) {
      const pest = state.currentThreat;
      threatNameEl.textContent = pest.common;
      threatSciEl.innerHTML = `Detectada a tiempo: <strong>${pest.sci}</strong>. La defensa correcta ahora entra con descuento.`;
      threatNoteEl.innerHTML = `Oleada actual: <strong>${wave.label}</strong>. Las conexiones correctas del grafo empiezan a cerrarse al colocar cada par real.`;
      setToast(`${pest.common} · ${pest.sci}`, 1700);
    }
    renderDeck();
  }
}

function nextPhase() {
  if (!state.started || state.finished) return;
  if (state.phase === 'monitor') {
    state.phase = 'wave';
    setPhase('wave');
    state.waveClock = 0;
    state.spawnTimer = 0;
    state.spawned = 0;
    if (!state.detected) {
      // si no fue detectada a tiempo, el costo se dispara en emergencia.
      setToast('Llegaste tarde: la intervención sale más cara', 1600);
    }
    syncUI();
    return;
  }
  if (state.phase === 'wave' && state.pests.length === 0 && state.spawned >= (state.currentWave?.count || 0)) {
    advanceWave();
  }
}

function advanceWave() {
  if (state.waveIndex < WAVES.length - 1) {
    state.waveIndex += 1;
    state.currentWave = currentWaveDef();
    state.currentThreat = state.currentWave ? PESTS[state.currentWave.pest] : null;
    state.phase = 'monitor';
    setPhase('monitor');
    state.monitorTime = state.monitorMax = Math.max(7, 9 - state.waveIndex * 0.4);
    state.detected = false;
    state.detectedAt = null;
    state.spawnTimer = 0;
    state.spawned = 0;
    state.waveClock = 0;
    state.waveCleared = false;
    state.pests.length = 0;
    updateThreatCard();
    syncUI();
    setToast(`Nueva oleada: ${state.currentWave.label}`, 1400);
    return;
  }
  finishGame(true);
}

function finishGame(win) {
  state.finished = true;
  state.started = false;
  setPhase(win ? 'victory' : 'gameover');
  endEl.classList.remove('hidden');
  document.getElementById('endTitle').textContent = win ? 'Cosecha protegida' : 'La chagra cayó';
  document.getElementById('endEyebrow').textContent = win ? 'Manejo integrado completado' : 'Se perdió la chagra';
  document.getElementById('endBody').textContent = win
    ? 'Las plagas se reconocieron y las respuestas reales salieron del grafo una por una. Monitoreo temprano, costo bajo y defensa correcta.'
    : 'Faltó salud de cultivo para resistir la presión de las oleadas. Vuelve a intentarlo con detección más temprana y mejores decisiones.';
  document.getElementById('endStats').textContent = `Edges resueltos: ${solvedCount()}/${EDGE_PAIRS.length} · Salud final: ${fmt(state.health)} · Crédito: ${fmt(state.money)}`;
}

function placeUnit() {
  if (!state.started || state.finished) return;
  const def = DEFENDERS[state.selectedDef];
  const { row, col } = state.cursor;
  if (col < 2) {
    setToast('Planta en la franja de defensa, no sobre la cepa', 900);
    return;
  }
  if (state.units.some((u) => u.row === row && u.col === col)) {
    setToast('Esa celda ya está ocupada', 900);
    return;
  }
  const cost = getUnitCost(def);
  if (state.money < cost) {
    setToast(`Crédito insuficiente para ${def.common}`, 1100);
    return;
  }
  state.money -= cost;
  state.units.push({
    id: `${def.id}-${performance.now().toString(36)}`,
    def,
    row,
    col,
    x: 0,
    y: 0,
    cooldown: rnd() * 0.25,
  });
  const targetId = state.currentThreat ? state.currentWave.pest : null;
  if (targetId && def.targets.includes(targetId)) {
    const pairKey = edgeKey(targetId, def.id);
    if (!state.solved.has(pairKey)) {
      state.solved.add(pairKey);
      setToast(`${state.currentThreat.common} · ${state.currentThreat.sci}`, 1700);
      state.score += 120;
      state.money += 3;
    }
  } else {
    setToast(`${def.common} queda en reserva`, 900);
  }
  renderDeck();
  syncUI();
}

function spawnPest() {
  const wave = state.currentWave;
  if (!wave) return;
  const pest = PESTS[wave.pest];
  const row = wave.rows[(state.spawned + Math.floor(rnd() * wave.rows.length)) % wave.rows.length];
  const board = state.board;
  const y = board.y + row * board.cell + board.cell * 0.5;
  const x = board.x + board.w + 46 + rnd() * 20;
  state.pests.push({
    id: `${wave.pest}-${state.spawned}-${Math.floor(performance.now())}`,
    type: wave.pest,
    spec: pest,
    row,
    x,
    y,
    hp: pest.hp + Math.round(state.waveIndex * 1.8),
    hpMax: pest.hp + Math.round(state.waveIndex * 1.8),
    speed: pest.speed + state.waveIndex * 4,
    slow: 0,
    poison: 0,
    wobble: rnd() * Math.PI * 2,
    damage: pest.damage,
  });
  state.spawned += 1;
}

function applyHit(pest, damage, effect, unit) {
  pest.hp -= damage;
  state.bursts.push({ x: pest.x, y: pest.y, timer: 0.12, kind: effect || unit.def.kind });
  if (effect === 'slow') pest.slow = Math.max(pest.slow, 1.8);
  if (effect === 'poison') pest.poison = Math.max(pest.poison, 3.5);
}

function maybeFire(unit, dt) {
  const board = state.board;
  const def = unit.def;
  unit.cooldown -= dt;
  if (unit.cooldown > 0) return;
  const target = state.pests
    .filter((p) => def.targets.includes(p.type))
    .filter((p) => p.row === unit.row || def.kind === 'fungus')
    .map((p) => {
      const dx = p.x - (board.x + unit.col * board.cell + board.cell * 0.5);
      const dy = p.y - (board.y + unit.row * board.cell + board.cell * 0.5);
      const d = Math.hypot(dx, dy);
      return { p, d };
    })
    .filter(({ d }) => d < def.range * board.cell)
    .sort((a, b) => a.d - b.d)[0];
  if (!target) return;
  unit.cooldown = def.fire + rnd() * 0.18;
  state.bolts.push({
    fromX: board.x + unit.col * board.cell + board.cell * 0.5,
    fromY: board.y + unit.row * board.cell + board.cell * 0.5,
    x: board.x + unit.col * board.cell + board.cell * 0.5,
    y: board.y + unit.row * board.cell + board.cell * 0.5,
    targetId: target.p.id,
    speed: def.speed,
    damage: def.damage,
    tint: def.tint,
    accent: def.accent,
    kind: def.kind,
    def,
  });
}

function updateBolts(dt) {
  for (let i = state.bolts.length - 1; i >= 0; i -= 1) {
    const b = state.bolts[i];
    const target = state.pests.find((p) => p.id === b.targetId);
    if (!target) {
      state.bolts.splice(i, 1);
      continue;
    }
    const dx = target.x - b.x;
    const dy = target.y - b.y;
    const dist = Math.hypot(dx, dy);
    const step = b.speed * dt;
    if (dist <= step) {
      applyHit(target, b.damage, b.kind, b);
      const pairKey = edgeKey(target.type, b.def.id);
      if (b.def.targets.includes(target.type) && !state.solved.has(pairKey)) {
        state.solved.add(pairKey);
        setToast(`${target.spec.common} · ${target.spec.sci}`, 1500);
        state.score += 120;
      }
      if (target.hp <= 0) {
        state.money += target.spec.reward;
        state.score += 40;
        state.pests.splice(state.pests.indexOf(target), 1);
        state.particles.push(...makeBurst(target.x, target.y, target.spec.tint));
      }
      state.bolts.splice(i, 1);
      continue;
    }
    const inv = 1 / dist;
    b.x += dx * inv * step;
    b.y += dy * inv * step;
  }
}

function makeBurst(x, y, tint) {
  const out = [];
  for (let i = 0; i < 16; i++) {
    const a = rnd() * Math.PI * 2;
    const s = 18 + rnd() * 88;
    out.push({
      x, y,
      vx: Math.cos(a) * s,
      vy: Math.sin(a) * s - 18,
      life: 0.6 + rnd() * 0.5,
      tint,
      size: 1.5 + rnd() * 2.6,
    });
  }
  return out;
}

function updateParticles(dt) {
  for (let i = state.particles.length - 1; i >= 0; i -= 1) {
    const p = state.particles[i];
    p.life -= dt;
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.vy += 28 * dt;
    if (p.life <= 0) state.particles.splice(i, 1);
  }
}

function updateBursts(dt) {
  for (let i = state.bursts.length - 1; i >= 0; i -= 1) {
    const b = state.bursts[i];
    b.timer -= dt;
    if (b.timer <= 0) state.bursts.splice(i, 1);
  }
}

function updatePests(dt) {
  const board = state.board;
  for (let i = state.pests.length - 1; i >= 0; i -= 1) {
    const p = state.pests[i];
    const slow = p.slow > 0 ? 0.54 : 1;
    p.slow = Math.max(0, p.slow - dt);
    p.poison = Math.max(0, p.poison - dt);
    if (p.poison > 0 && Math.random() < dt * 2.4) {
      p.hp -= 0.35;
    }
    p.x -= p.speed * slow * dt;
    p.wobble += dt * 6;
    if (p.x < board.x + 3) {
      state.health -= p.damage;
      state.score -= 30;
      state.pests.splice(i, 1);
      setToast(`${p.spec.common} dañó la cepa`, 750);
      if (state.health <= 0) {
        finishGame(false);
        return;
      }
    } else if (p.hp <= 0) {
      state.pests.splice(i, 1);
    }
  }
}

function updateUnits(dt) {
  for (const unit of state.units) maybeFire(unit, dt);
}

function updateMonitor(dt) {
  state.monitorTime = Math.max(0, state.monitorTime - dt);
  if (state.monitorTime <= 0) nextPhase();
}

function updateWave(dt) {
  state.waveClock += dt;
  const wave = state.currentWave;
  if (!wave) return;
  state.spawnTimer -= dt;
  while (state.spawned < wave.count && state.spawnTimer <= 0) {
    spawnPest();
    state.spawnTimer += wave.interval + rnd() * wave.gap;
  }
  if (state.spawned >= wave.count && state.pests.length === 0) {
    if (!state.waveCleared && state.waveClock > 1.2) {
      state.waveCleared = true;
      state.money += 8 + state.waveIndex * 2;
      setToast(`Oleada contenida: ${wave.label}`, 1100);
      nextBtn.textContent = state.waveIndex < WAVES.length - 1 ? 'Siguiente' : 'Terminar';
      if (state.waveIndex < WAVES.length - 1) {
        advanceWave();
      } else {
        finishGame(true);
      }
    }
  }
}

function drawBoard() {
  const board = state.board;
  const g = ctx;
  g.save();
  g.shadowColor = 'rgba(0,0,0,.18)';
  g.shadowBlur = 18;
  g.fillStyle = 'rgba(8,18,10,.24)';
  rr(g, board.x - 8, board.y - 8, board.w + 16, board.h + 16, 22);
  g.fill();
  g.shadowBlur = 0;
  g.translate(board.x, board.y);
  for (let r = 0; r < GRID.rows; r++) {
    for (let c = 0; c < GRID.cols; c++) {
      const x = c * board.cell;
      const y = r * board.cell;
      g.fillStyle = c < 2 ? 'rgba(36,83,37,.78)' : 'rgba(28,72,31,.78)';
      rr(g, x + 2, y + 2, board.cell - 4, board.cell - 4, 16);
      g.fill();
      g.strokeStyle = 'rgba(255,255,255,.04)';
      g.stroke();
    }
  }
  g.restore();
}

function drawUnit(unit) {
  const board = state.board;
  const cx = board.x + unit.col * board.cell + board.cell * 0.5;
  const cy = board.y + unit.row * board.cell + board.cell * 0.5;
  const g = ctx;
  g.save();
  g.translate(cx, cy);
  const pulse = 1 + Math.sin(performance.now() * 0.004 + unit.row + unit.col) * 0.02;
  g.scale(pulse, pulse);
  if (unit.def.kind === 'fungus') {
    g.fillStyle = 'rgba(132,184,91,.18)';
    g.beginPath();
    g.arc(0, 0, board.cell * 0.38, 0, Math.PI * 2);
    g.fill();
  }
  const leafGrad = g.createRadialGradient(-8, -10, 4, 0, 0, board.cell * 0.34);
  leafGrad.addColorStop(0, unit.def.accent);
  leafGrad.addColorStop(0.4, unit.def.tint);
  leafGrad.addColorStop(1, '#224124');
  g.fillStyle = leafGrad;
  g.beginPath();
  g.arc(0, 0, board.cell * 0.23, 0, Math.PI * 2);
  g.fill();
  g.strokeStyle = 'rgba(18,32,16,.34)';
  g.lineWidth = 2;
  g.stroke();
  g.fillStyle = '#f5efcf';
  g.beginPath();
  g.arc(-5, -4, 4, 0, Math.PI * 2);
  g.arc(6, -3, 3.4, 0, Math.PI * 2);
  g.fill();
  g.fillStyle = '#2b1b10';
  g.beginPath();
  g.arc(-5, -4, 1.5, 0, Math.PI * 2);
  g.arc(6, -3, 1.3, 0, Math.PI * 2);
  g.fill();
  g.fillStyle = 'rgba(245,230,180,.74)';
  g.fillRect(-2, 7, 4, 10);
  g.restore();
}

function drawPest(p) {
  const g = ctx;
  g.save();
  g.translate(p.x, p.y);
  const wob = Math.sin(p.wobble) * 1.2;
  g.rotate(wob * 0.03);
  g.scale(p.spec.size, p.spec.size);
  if (p.type === 'broca') drawBroca(g, p.spec.tint, p.spec.accent);
  else if (p.type === 'blanca') drawBlanca(g, p.spec.tint, p.spec.accent);
  else if (p.type === 'trips') drawTrips(g, p.spec.tint, p.spec.accent);
  else if (p.type === 'minador') drawMinador(g, p.spec.tint, p.spec.accent);
  else drawRoya(g, p.spec.tint, p.spec.accent);
  g.restore();
}

function drawBroca(g, tint, accent) {
  g.fillStyle = tint;
  g.strokeStyle = 'rgba(35,22,12,.48)';
  g.lineWidth = 1.3;
  g.beginPath();
  g.ellipse(0, 0, 10, 7, 0, 0, Math.PI * 2);
  g.fill();
  g.stroke();
  g.fillStyle = accent;
  g.beginPath();
  g.ellipse(-1, -1, 6.2, 4.2, 0, 0, Math.PI * 2);
  g.fill();
  g.fillStyle = '#30180f';
  g.beginPath();
  g.arc(2, -1, 1.4, 0, Math.PI * 2);
  g.fill();
  g.strokeStyle = tint;
  g.lineWidth = 1.2;
  g.beginPath();
  g.moveTo(-10, -1);
  g.lineTo(-14, -5);
  g.moveTo(-10, 1);
  g.lineTo(-14, 5);
  g.moveTo(10, -1);
  g.lineTo(14, -5);
  g.moveTo(10, 1);
  g.lineTo(14, 5);
  g.stroke();
}

function drawBlanca(g, tint, accent) {
  g.strokeStyle = 'rgba(186,204,210,.8)';
  g.fillStyle = tint;
  g.lineWidth = 1;
  g.beginPath();
  g.ellipse(0, 0, 7.2, 4.8, 0, 0, Math.PI * 2);
  g.fill();
  g.stroke();
  g.fillStyle = accent;
  g.beginPath();
  g.moveTo(-7, -1);
  g.quadraticCurveTo(-2, -7, 0, -1);
  g.quadraticCurveTo(-3, 5, -7, -1);
  g.moveTo(7, -1);
  g.quadraticCurveTo(2, -7, 0, -1);
  g.quadraticCurveTo(3, 5, 7, -1);
  g.fill();
  g.strokeStyle = 'rgba(70,88,95,.2)';
  g.beginPath();
  g.moveTo(-1, 1);
  g.lineTo(0, 7);
  g.moveTo(2, 0);
  g.lineTo(4, 7);
  g.stroke();
}

function drawTrips(g, tint, accent) {
  g.strokeStyle = tint;
  g.lineWidth = 2;
  g.lineCap = 'round';
  g.beginPath();
  g.moveTo(-8, 0);
  g.lineTo(8, 0);
  g.stroke();
  g.fillStyle = accent;
  g.beginPath();
  g.arc(0, 0, 4.4, 0, Math.PI * 2);
  g.fill();
  g.strokeStyle = 'rgba(100,70,34,.42)';
  g.lineWidth = 1;
  g.beginPath();
  g.moveTo(-6, -4);
  g.lineTo(-10, -7);
  g.moveTo(-4, 4);
  g.lineTo(-7, 9);
  g.moveTo(4, -4);
  g.lineTo(7, -9);
  g.moveTo(6, 4);
  g.lineTo(10, 7);
  g.stroke();
}

function drawMinador(g, tint, accent) {
  g.fillStyle = '#4f7a43';
  g.beginPath();
  g.ellipse(0, 0, 10, 5.8, 0.25, 0, Math.PI * 2);
  g.fill();
  g.strokeStyle = 'rgba(27,39,20,.34)';
  g.stroke();
  g.strokeStyle = accent;
  g.lineWidth = 1.5;
  g.beginPath();
  g.moveTo(-4, -1);
  g.quadraticCurveTo(0, -5, 4, -1);
  g.quadraticCurveTo(1, 1, -4, -1);
  g.stroke();
  g.fillStyle = tint;
  g.beginPath();
  g.arc(0, 0, 2.4, 0, Math.PI * 2);
  g.fill();
}

function drawRoya(g, tint, accent) {
  g.fillStyle = tint;
  for (let i = 0; i < 7; i++) {
    const a = (i / 7) * Math.PI * 2;
    g.beginPath();
    g.arc(Math.cos(a) * 5, Math.sin(a) * 4, 2.3 + (i % 2) * 0.4, 0, Math.PI * 2);
    g.fill();
  }
  g.strokeStyle = 'rgba(90,42,12,.26)';
  g.lineWidth = 1;
  g.beginPath();
  g.arc(0, 0, 8.5, 0, Math.PI * 2);
  g.stroke();
  g.fillStyle = accent;
  g.beginPath();
  g.arc(0, 0, 3.3, 0, Math.PI * 2);
  g.fill();
}

function drawBolts() {
  const g = ctx;
  for (const b of state.bolts) {
    g.save();
    g.translate(b.x, b.y);
    g.fillStyle = b.accent;
    g.beginPath();
    g.arc(0, 0, b.kind === 'fungus' ? 4.5 : 3.5, 0, Math.PI * 2);
    g.fill();
    g.fillStyle = b.tint;
    g.beginPath();
    g.arc(0, 0, 2.1, 0, Math.PI * 2);
    g.fill();
    g.restore();
  }
}

function drawBursts() {
  const g = ctx;
  for (const b of state.bursts) {
    const alpha = clamp(b.timer / 0.45, 0, 1);
    g.save();
    g.translate(b.x, b.y);
    g.globalAlpha = alpha;
    g.strokeStyle = 'rgba(250,241,194,.78)';
    g.lineWidth = 2;
    g.beginPath();
    g.arc(0, 0, 16 * (1 - alpha * 0.28), 0, Math.PI * 2);
    g.stroke();
    g.restore();
  }
}

function drawParticles() {
  const g = ctx;
  for (const p of state.particles) {
    g.save();
    g.globalAlpha = clamp(p.life, 0, 1);
    g.fillStyle = p.tint;
    g.beginPath();
    g.arc(p.x, p.y, p.size, 0, Math.PI * 2);
    g.fill();
    g.restore();
  }
}

function drawGraph() {
  const w = graphCanvas.clientWidth;
  const h = graphCanvas.clientHeight;
  gctx.clearRect(0, 0, w, h);
  const bgGrad = gctx.createLinearGradient(0, 0, 0, h);
  bgGrad.addColorStop(0, 'rgba(12,20,13,.98)');
  bgGrad.addColorStop(1, 'rgba(15,28,16,.92)');
  gctx.fillStyle = bgGrad;
  gctx.fillRect(0, 0, w, h);
  gctx.strokeStyle = 'rgba(255,255,255,.06)';
  gctx.lineWidth = 1;
  for (let i = 1; i < 5; i++) {
    gctx.beginPath();
    gctx.moveTo(0, (h / 5) * i);
    gctx.lineTo(w, (h / 5) * i);
    gctx.stroke();
  }
  const pestX = 78;
  const defX = w - 78;
  const nodesY = {
    broca: h * 0.2,
    blanca: h * 0.38,
    trips: h * 0.56,
    minador: h * 0.74,
    roya: h * 0.86,
  };
  const defMap = {
    beauveria: [w - 82, h * 0.12],
    cephalonomia: [w - 82, h * 0.24],
    encarsia: [w - 82, h * 0.34],
    swirskii: [w - 82, h * 0.42],
    lecanicillium: [w - 82, h * 0.5],
    orius: [w - 82, h * 0.6],
    cucumeris: [w - 82, h * 0.68],
    metarhizium: [w - 82, h * 0.77],
    diglyphus: [w - 82, h * 0.87],
    trichoderma: [w - 82, h * 0.95],
  };
  const pestLabels = {
    broca: 'Broca',
    blanca: 'Mosca blanca',
    trips: 'Trips',
    minador: 'Minador',
    roya: 'Roya',
  };
  const defLabels = {
    beauveria: 'Beauveria',
    cephalonomia: 'Cephalonomia',
    encarsia: 'Encarsia',
    swirskii: 'Swirskii',
    lecanicillium: 'Lecanicillium',
    orius: 'Orius',
    cucumeris: 'Cucumeris',
    metarhizium: 'Metarhizium',
    diglyphus: 'Diglyphus',
    trichoderma: 'Trichoderma',
  };
  const pairList = EDGE_PAIRS.map(([p, d]) => ({ p, d, solved: state.solved.has(edgeKey(p, d)) }));
  for (const pair of pairList) {
    const py = nodesY[pair.p];
    const dy = defMap[pair.d][1];
    const alive = !pair.solved;
    gctx.strokeStyle = alive ? 'rgba(241,201,89,.8)' : 'rgba(146,168,122,.22)';
    gctx.lineWidth = alive ? 2.4 : 1.2;
    gctx.beginPath();
    gctx.moveTo(pestX + 36, py);
    gctx.quadraticCurveTo(w * 0.52, (py + dy) / 2, defX - 34, dy);
    gctx.stroke();
  }
  const currentPest = state.currentThreat ? state.currentWave.pest : null;
  const pestNodeSet = new Set(matchingEdges(currentPest || '').map((d) => d.id));
  for (const id of ['broca', 'blanca', 'trips', 'minador', 'roya']) {
    const y = nodesY[id];
    const active = currentPest === id;
    const solved = Array.from(state.solved).some((s) => s.startsWith(`${id}|`));
    gctx.fillStyle = solved ? 'rgba(143,174,121,.88)' : active ? 'rgba(241,201,89,.95)' : 'rgba(24,39,26,.9)';
    gctx.strokeStyle = 'rgba(255,255,255,.12)';
    gctx.lineWidth = 1;
    rr(gctx, 20, y - 18, 118, 36, 18);
    gctx.fill();
    gctx.stroke();
    gctx.fillStyle = solved ? '#1b2817' : '#f8efd0';
    gctx.font = '700 11px Georgia,serif';
    gctx.fillText(pestLabels[id], 34, y + 4);
    gctx.font = '11px Georgia,serif';
    gctx.fillStyle = solved ? 'rgba(26,36,23,.88)' : 'rgba(244,228,189,.72)';
    gctx.fillText(PESTS[id].sci, 34, y + 16);
  }
  let yCursor = 26;
  for (const def of DEFENDERS) {
    const idx = DEFENDERS.indexOf(def);
    const y = 28 + idx * 31;
    const solved = Array.from(state.solved).some((s) => s.endsWith(`|${def.id}`));
    gctx.fillStyle = solved ? 'rgba(143,174,121,.9)' : 'rgba(24,39,26,.9)';
    gctx.strokeStyle = 'rgba(255,255,255,.12)';
    rr(gctx, w - 136, y - 12, 118, 24, 12);
    gctx.fill();
    gctx.stroke();
    gctx.fillStyle = solved ? '#1b2817' : '#f8efd0';
    gctx.font = '700 10px Georgia,serif';
    gctx.fillText(defLabels[def.id], w - 126, y + 4);
  }
  if (state.currentThreat) {
    const py = nodesY[state.currentWave.pest];
    gctx.fillStyle = 'rgba(241,201,89,.12)';
    gctx.beginPath();
    gctx.arc(68, py, 28, 0, Math.PI * 2);
    gctx.fill();
  }
  gctx.fillStyle = '#f4ecd7';
  gctx.font = '700 12px Georgia,serif';
  gctx.fillText('Grafo agroecológico', 14, 18);
  gctx.font = '11px Georgia,serif';
  gctx.fillStyle = 'rgba(244,236,215,.78)';
  gctx.fillText('Cada vínculo correcto sale del grafo.', 14, h - 12);
}

function drawScene(t) {
  ctx.clearRect(0, 0, W, H);
  ctx.drawImage(bg, 0, 0, W, H);
  drawBoard();
  drawCoffeeBeds();

  // caminos y luces suaves
  const board = state.board;
  const g = ctx;
  g.save();
  g.globalAlpha = 0.15;
  for (let r = 0; r < GRID.rows; r++) {
    const y = board.y + r * board.cell + board.cell * 0.52;
    g.strokeStyle = r % 2 ? 'rgba(176,210,126,.32)' : 'rgba(95,148,68,.24)';
    g.lineWidth = 2;
    g.beginPath();
    g.moveTo(board.x, y);
    g.lineTo(board.x + board.w, y);
    g.stroke();
  }
  g.restore();

  for (const unit of state.units) drawUnit(unit);
  drawBolts();
  for (const pest of state.pests) drawPest(pest);
  drawBursts();
  drawParticles();

  // selector highlight
  const { row, col } = state.cursor;
  g.save();
  g.translate(board.x + col * board.cell, board.y + row * board.cell);
  g.fillStyle = 'rgba(241,201,89,.08)';
  rr(g, 4, 4, board.cell - 8, board.cell - 8, 14);
  g.fill();
  g.strokeStyle = 'rgba(241,201,89,.7)';
  g.lineWidth = 2;
  g.stroke();
  g.restore();

  // ambient pollen motes
  g.save();
  g.globalAlpha = 0.35;
  for (let i = 0; i < 24; i++) {
    const x = (i * 131 + (t * 14)) % (W + 60) - 30;
    const y = 70 + (i * 53 % Math.max(240, H - 140));
    g.fillStyle = i % 3 === 0 ? 'rgba(251,236,181,.8)' : 'rgba(190,227,141,.65)';
    g.beginPath();
    g.arc(x, y + Math.sin(t * 0.8 + i) * 4, 1.2 + (i % 2) * 0.8, 0, Math.PI * 2);
    g.fill();
  }
  g.restore();
}

function updateThreatVisuals() {
  if (state.currentThreat) {
    if (state.detected) {
      threatNameEl.textContent = state.currentThreat.common;
      threatSciEl.innerHTML = `Identificada: <strong>${state.currentThreat.sci}</strong>.`;
    }
  }
  waveTextEl.textContent = `${Math.min(state.waveIndex + 1, WAVES.length)}/${WAVES.length}`;
  healthTextEl.textContent = fmt(state.health);
  moneyTextEl.textContent = fmt(state.money);
  fpsTextEl.textContent = fmt(fpsValue);
  phaseTextEl.textContent = state.phase === 'monitor' ? 'Monitoreo' : state.phase === 'wave' ? 'Oleada' : state.phase;
}

function dismissIntroFromInput(e) {
  if (introEl.classList.contains('hidden') || state.started) return false;
  startGame();
  if (e && typeof e.preventDefault === 'function') e.preventDefault();
  if (e && typeof e.stopImmediatePropagation === 'function') e.stopImmediatePropagation();
  return true;
}

function onBoardTap(clientX, clientY) {
  if (!state.started || state.finished) return;
  const board = state.board;
  const x = clientX - board.x;
  const y = clientY - board.y;
  if (x < 0 || y < 0 || x >= board.w || y >= board.h) return;
  const col = Math.floor(x / board.cell);
  const row = Math.floor(y / board.cell);
  state.cursor = { row, col };
  updateCursor();
  placeUnit();
}

function selectByKey(k) {
  const idx = Number(k) - 1;
  if (!Number.isNaN(idx) && idx >= 0 && idx < DEFENDERS.length) {
    state.selectedDef = idx;
    renderDeck();
    const def = DEFENDERS[idx];
    setToast(def.common, 900);
  }
}

addEventListener('keydown', (e) => {
  if (dismissIntroFromInput(e)) return;
  const keys = ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space', 'Enter', 'KeyM'];
  if (keys.includes(e.code) || /^[1-9]$/.test(e.key)) e.preventDefault();
  if (!state.started && e.code === 'Enter') startGame();
  if (e.code === 'Space') placeUnit();
  if (e.code === 'KeyM') monitorNow();
  if (e.code === 'Enter') nextPhase();
  if (e.code === 'ArrowLeft') {
    state.cursor.col = clamp(state.cursor.col - 1, 0, GRID.cols - 1);
    updateCursor();
  }
  if (e.code === 'ArrowRight') {
    state.cursor.col = clamp(state.cursor.col + 1, 0, GRID.cols - 1);
    updateCursor();
  }
  if (e.code === 'ArrowUp') {
    state.cursor.row = clamp(state.cursor.row - 1, 0, GRID.rows - 1);
    updateCursor();
  }
  if (e.code === 'ArrowDown') {
    state.cursor.row = clamp(state.cursor.row + 1, 0, GRID.rows - 1);
    updateCursor();
  }
  if (/^[1-9]$/.test(e.key)) selectByKey(e.key);
});

document.addEventListener('pointerdown', (e) => {
  if (dismissIntroFromInput(e)) return;
}, true);

canvas.addEventListener('pointerdown', (e) => {
  if (!state.started || state.finished) return;
  onBoardTap(e.clientX, e.clientY);
});

function bindBtn(btn, fn) {
  btn.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    btn.classList.add('down');
  });
  btn.addEventListener('pointerup', (e) => {
    e.preventDefault();
    btn.classList.remove('down');
    fn();
  });
  btn.addEventListener('pointercancel', () => btn.classList.remove('down'));
  btn.addEventListener('pointerleave', () => btn.classList.remove('down'));
}
bindBtn(monitorBtn, monitorNow);
bindBtn(nextBtn, nextPhase);
bindBtn(restartBtn, restartGame);
startBtn.addEventListener('click', startGame);
playAgainBtn.addEventListener('click', restartGame);
closeEndBtn.addEventListener('click', () => endEl.classList.add('hidden'));

function tick(dt, t) {
  fpsAcc += dt;
  fpsFrames += 1;
  if (fpsAcc >= 0.5) {
    fpsValue = fpsFrames / fpsAcc;
    fpsAcc = 0;
    fpsFrames = 0;
  }
  if (!state.started || state.finished) {
    drawScene(t);
    drawGraph();
    updateThreatVisuals();
    return;
  }
  if (state.phase === 'monitor') updateMonitor(dt);
  if (state.phase === 'wave') updateWave(dt);
  updateUnits(dt);
  updateBolts(dt);
  updatePests(dt);
  updateBursts(dt);
  updateParticles(dt);
  updateThreatVisuals();
  deckRefreshAcc += dt;
  if (deckRefreshAcc > 0.18) {
    renderDeck();
    deckRefreshAcc = 0;
  }
  drawScene(t);
  drawGraph();
}

function loop(t) {
  const now = t / 1000;
  const dt = Math.min(0.033, now - (last || now));
  last = now;
  tick(dt, now);
  requestAnimationFrame(loop);
}

resize();
renderDeck();
syncUI();
updateCursor();
drawGraph();
if (AUTO_DEMO) startGame();
else window.setTimeout(() => {
  if (!state.started) startGame();
}, 900);
requestAnimationFrame(loop);
