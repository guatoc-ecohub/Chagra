import * as THREE from 'three';
import { CompositorSala } from './transicion.js';

// Las estaciones viven bajo /juegos/<juego>/ y este módulo se embebe desde el
// domo (/domo/). Las rutas relativas (./la-milpa/) resolverían contra la base
// del documento que embebe (el domo → /domo/la-milpa/, 404). Se normalizan
// contra GAME_BASE en un solo punto, al construir STATIONS.
const GAME_BASE = '/juegos/';
function rutaDeEstacion(ruta) {
  return ruta ? ruta.replace(/^\.\//, GAME_BASE) : ruta;
}

// Para agregar un juego: añade un objeto a esta lista con { titulo, ruta, activo }.
// Si activo es false, la sala lo muestra como "Próximamente" y no deja entrar.
const STATIONS = [
  { titulo: 'Súper Angelita Bros', ruta: './angelita-bros/?embedded=1&autostart=1', activo: true },
  { titulo: 'La Milpa', ruta: './la-milpa/?embedded=1&autostart=1', activo: true },
  { titulo: 'Bioguerra', ruta: './bioguerra/?embedded=1&autostart=1', activo: true },
  { titulo: 'Micelio', ruta: './micelio/?embedded=1&autostart=1', activo: true },
  { titulo: 'Páramo Vivo', ruta: './paramo-vivo/?embedded=1&autostart=1', activo: true },
  { titulo: 'Chagra Kart', ruta: './chagra-kart/?embedded=1&autoStart=1', activo: true },
  { titulo: 'Bestiario Vivo', ruta: './bestiario/?embedded=1', activo: true },
  { titulo: 'Ahorcado Contaminado', ruta: '/?juego=ahorcado&onb=0', activo: true },
  { titulo: 'DoomFinca', ruta: null, activo: false },
  { titulo: 'Metal Slug del Campo', ruta: null, activo: false },
  { titulo: 'Polinizador', ruta: null, activo: false },
  { titulo: 'Angelita La Sembradora', ruta: null, activo: false },
  { titulo: 'Suelo Vivo', ruta: null, activo: false },
  { titulo: 'Fermentos', ruta: null, activo: false },
  { titulo: 'Cuenca', ruta: null, activo: false },
  { titulo: 'Smash Chagra', ruta: null, activo: false },
].map((s) => ({ ...s, ruta: rutaDeEstacion(s.ruta) }));

const ui = {
  canvas: document.getElementById('salaCanvas'),
  frame: document.getElementById('gameFrame'),
  title: document.getElementById('title'),
  meta: document.getElementById('meta'),
  card: document.getElementById('card'),
  stationCard: document.getElementById('stationCard'),
  stationName: document.getElementById('stationName'),
  stationState: document.getElementById('stationState'),
  stationHint: document.getElementById('stationHint'),
  controls: document.getElementById('controls'),
  toast: document.getElementById('toast'),
  backBtn: document.getElementById('backBtn'),
  leftBtn: document.getElementById('leftBtn'),
  rightBtn: document.getElementById('rightBtn'),
  enterBtn: document.getElementById('enterBtn'),
};

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const lerp = (a, b, t) => a + (b - a) * t;
const smoothstep = (a, b, x) => {
  const t = clamp((x - a) / (b - a || 1e-6), 0, 1);
  return t * t * (3 - 2 * t);
};
const now = () => performance.now() / 1000;
const rand = (seed) => {
  let s = seed >>> 0;
  return () => {
    s |= 0;
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};

function makeCanvas(w = 512, h = 512) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d');
  return { c, ctx };
}

function makeTexture(canvas, { srgb = true, repeat = 1, clamp = false, anisotropy = 4 } = {}) {
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace;
  tex.wrapS = tex.wrapT = clamp ? THREE.ClampToEdgeWrapping : THREE.RepeatWrapping;
  if (tex.repeat) tex.repeat.set(repeat, repeat);
  tex.anisotropy = anisotropy;
  tex.generateMipmaps = true;
  tex.minFilter = THREE.LinearMipmapLinearFilter;
  tex.magFilter = THREE.LinearFilter;
  tex.needsUpdate = true;
  return tex;
}

function makeRoundRectPath(ctx, x, y, w, h, r) {
  const rr = Math.min(r, w * 0.5, h * 0.5);
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.arcTo(x + w, y, x + w, y + h, rr);
  ctx.arcTo(x + w, y + h, x, y + h, rr);
  ctx.arcTo(x, y + h, x, y, rr);
  ctx.arcTo(x, y, x + w, y, rr);
  ctx.closePath();
}

// ---------- Texturas procedurales del domo (OSB, vigas, espiga, noche) ----------

function buildOSBTexture(seed = 41, base = '#a5713c') {
  // Aglomerado OSB: cientos de hojuelas de madera prensadas, como los paneles reales.
  const { c, ctx } = makeCanvas(512, 512);
  const rnd = rand(seed);
  ctx.fillStyle = base;
  ctx.fillRect(0, 0, 512, 512);
  for (let i = 0; i < 950; i++) {
    const x = rnd() * 512;
    const y = rnd() * 512;
    const w = 16 + rnd() * 48;
    const h = 5 + rnd() * 13;
    const a = rnd() * Math.PI;
    const t = 0.45 + rnd() * 0.55;
    const r = Math.floor(116 + t * 100 + rnd() * 20);
    const g = Math.floor(70 + t * 66);
    const b = Math.floor(30 + t * 38);
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(a);
    ctx.globalAlpha = 0.30 + rnd() * 0.5;
    ctx.fillStyle = `rgb(${r},${g},${b})`;
    ctx.fillRect(-w / 2, -h / 2, w, h);
    if (rnd() > 0.55) {
      ctx.globalAlpha = 0.16;
      ctx.fillStyle = '#3c220e';
      ctx.fillRect(-w / 2, -0.8, w, 1.5);
    }
    ctx.restore();
  }
  ctx.globalAlpha = 1;
  const varn = ctx.createRadialGradient(256, 230, 70, 256, 280, 380);
  varn.addColorStop(0, 'rgba(255,212,148,.10)');
  varn.addColorStop(1, 'rgba(44,22,9,.18)');
  ctx.fillStyle = varn;
  ctx.fillRect(0, 0, 512, 512);
  return makeTexture(c, { repeat: 1, anisotropy: 8 });
}

function buildBeamWoodTexture(seed = 7, dark = false) {
  // Veta longitudinal para vigas: pino tratado, café medio con nudos.
  const { c, ctx } = makeCanvas(512, 128);
  const rnd = rand(seed);
  const g = ctx.createLinearGradient(0, 0, 0, 128);
  if (dark) {
    g.addColorStop(0, '#452813');
    g.addColorStop(0.5, '#573419');
    g.addColorStop(1, '#3d2310');
  } else {
    g.addColorStop(0, '#7c4e26');
    g.addColorStop(0.5, '#93602f');
    g.addColorStop(1, '#6f4522');
  }
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 512, 128);
  for (let i = 0; i < 30; i++) {
    const y0 = rnd() * 128;
    ctx.strokeStyle = `rgba(${24 + rnd() * 34},${13 + rnd() * 18},6,${0.18 + rnd() * 0.32})`;
    ctx.lineWidth = 0.7 + rnd() * 1.7;
    ctx.beginPath();
    ctx.moveTo(0, y0);
    for (let x = 0; x <= 512; x += 28) {
      ctx.lineTo(x, y0 + Math.sin(x * 0.021 + i * 1.7) * 3 + (rnd() - 0.5) * 3.5);
    }
    ctx.stroke();
  }
  for (let i = 0; i < 5; i++) {
    const x = rnd() * 512;
    const y = rnd() * 128;
    const kg = ctx.createRadialGradient(x, y, 1, x, y, 8 + rnd() * 7);
    kg.addColorStop(0, 'rgba(28,15,6,.8)');
    kg.addColorStop(0.55, 'rgba(70,42,19,.4)');
    kg.addColorStop(1, 'rgba(70,42,19,0)');
    ctx.fillStyle = kg;
    ctx.beginPath();
    ctx.arc(x, y, 16, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.fillStyle = 'rgba(255,206,138,.06)';
  ctx.fillRect(0, 6, 512, 3);
  ctx.fillStyle = 'rgba(20,10,4,.28)';
  ctx.fillRect(0, 124, 512, 4);
  return makeTexture(c, { repeat: 1, anisotropy: 8 });
}

function buildHerringboneTexture() {
  // Piso en espiga: tablones miel a 45 grados formando el chevron clasico.
  const { c, ctx } = makeCanvas(1024, 1024);
  const rnd = rand(19);
  ctx.fillStyle = '#331d0d';
  ctx.fillRect(0, 0, 1024, 1024);
  const W = 46;
  const L = 230;
  const u = L * Math.SQRT1_2;          // avance horizontal por columna
  const v = W * Math.SQRT2;            // paso vertical dentro de la columna
  const drawPlank = (cx, cy, ang) => {
    const t = rnd();
    const R = Math.floor(146 + t * 66);
    const G = Math.floor(84 + t * 42);
    const B = Math.floor(34 + t * 24);
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(ang);
    const g = ctx.createLinearGradient(-L / 2, 0, L / 2, 0);
    g.addColorStop(0, `rgb(${R - 16},${G - 11},${B - 6})`);
    g.addColorStop(0.5, `rgb(${R},${G},${B})`);
    g.addColorStop(1, `rgb(${R - 20},${G - 13},${B - 8})`);
    ctx.fillStyle = g;
    ctx.fillRect(-L / 2, -W / 2, L, W);
    for (let k = 0; k < 5; k++) {
      const yy = -W / 2 + (k + 0.5) * (W / 5) + (rnd() - 0.5) * 4;
      ctx.strokeStyle = `rgba(72,38,14,${0.14 + rnd() * 0.2})`;
      ctx.lineWidth = 0.7 + rnd() * 1.1;
      ctx.beginPath();
      ctx.moveTo(-L / 2, yy);
      for (let xx = -L / 2; xx <= L / 2; xx += 26) {
        ctx.lineTo(xx, yy + Math.sin(xx * 0.045 + k * 2.1) * 1.7);
      }
      ctx.stroke();
    }
    ctx.strokeStyle = 'rgba(26,13,5,.9)';
    ctx.lineWidth = 2.6;
    ctx.strokeRect(-L / 2, -W / 2, L, W);
    ctx.fillStyle = 'rgba(255,216,150,.07)';
    ctx.fillRect(-L / 2, -W / 2, L, 4.5);
    ctx.restore();
  };
  for (let col = -1; col < 1024 / u + 2; col++) {
    const ang = (col % 2 === 0) ? Math.PI / 4 : -Math.PI / 4;
    for (let row = -3; row < 1024 / v + 4; row++) {
      drawPlank(col * u + u / 2, row * v + ((col % 2) ? v / 2 : 0), ang);
    }
  }
  // patina de uso: motas y brillo suave
  ctx.fillStyle = 'rgba(20,10,4,.10)';
  for (let i = 0; i < 700; i++) {
    ctx.fillRect(rnd() * 1024, rnd() * 1024, 1.6, 1.6);
  }
  return makeTexture(c, { repeat: 1, anisotropy: 8 });
}

function buildNightTexture() {
  // Noche por los triangulos vidriados: azul profundo casi negro, estrellas.
  const { c, ctx } = makeCanvas(256, 256);
  const rnd = rand(101);
  const g = ctx.createLinearGradient(0, 0, 0, 256);
  g.addColorStop(0, '#04060d');
  g.addColorStop(0.6, '#081020');
  g.addColorStop(1, '#0d1626');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 54; i++) {
    const x = rnd() * 256;
    const y = rnd() * 256;
    const a = 0.14 + rnd() * 0.42;
    ctx.fillStyle = `rgba(206,220,250,${a})`;
    ctx.fillRect(x, y, 1, 1);
  }
  for (let i = 0; i < 2; i++) {
    const x = rnd() * 256;
    const y = rnd() * 200;
    const sg = ctx.createRadialGradient(x, y, 0, x, y, 2.2);
    sg.addColorStop(0, 'rgba(228,236,255,.85)');
    sg.addColorStop(1, 'rgba(228,236,255,0)');
    ctx.fillStyle = sg;
    ctx.beginPath();
    ctx.arc(x, y, 2.2, 0, Math.PI * 2);
    ctx.fill();
  }
  return makeTexture(c, { repeat: 1, anisotropy: 2 });
}

function buildRugTexture() {
  // Tapete de lana crema, limpio, con trama sutil.
  const { c, ctx } = makeCanvas(512, 512);
  const rnd = rand(63);
  ctx.fillStyle = '#8d8071';
  ctx.fillRect(0, 0, 512, 512);
  for (let i = 0; i < 5200; i++) {
    const x = rnd() * 512;
    const y = rnd() * 512;
    const t = rnd();
    ctx.fillStyle = t > 0.5
      ? `rgba(168,156,136,${0.12 + t * 0.22})`
      : `rgba(104,92,76,${0.10 + t * 0.2})`;
    ctx.fillRect(x, y, 2.2, 2.2);
  }
  ctx.strokeStyle = 'rgba(96,84,66,.5)';
  ctx.lineWidth = 10;
  makeRoundRectPath(ctx, 14, 14, 484, 484, 40);
  ctx.stroke();
  ctx.strokeStyle = 'rgba(178,120,74,.35)';
  ctx.lineWidth = 4;
  makeRoundRectPath(ctx, 34, 34, 444, 444, 30);
  ctx.stroke();
  return makeTexture(c, { repeat: 1, anisotropy: 8 });
}

function buildFabricTexture(baseCol = '#e6dbc4', seed = 88) {
  // Tela de futon: crema tejida con costuras.
  const { c, ctx } = makeCanvas(512, 512);
  const rnd = rand(seed);
  ctx.fillStyle = baseCol;
  ctx.fillRect(0, 0, 512, 512);
  ctx.globalAlpha = 0.10;
  for (let y = 0; y < 512; y += 3) {
    ctx.fillStyle = (y / 3) % 2 ? '#b7a98d' : '#f4ecda';
    ctx.fillRect(0, y, 512, 1.4);
  }
  for (let x = 0; x < 512; x += 3) {
    ctx.fillStyle = (x / 3) % 2 ? '#c0b296' : '#efe6d2';
    ctx.fillRect(x, 0, 1.4, 512);
  }
  ctx.globalAlpha = 1;
  // costuras horizontales del colchon
  ctx.strokeStyle = 'rgba(120,104,80,.45)';
  ctx.lineWidth = 2.2;
  for (let i = 1; i < 4; i++) {
    ctx.beginPath();
    ctx.moveTo(0, i * 128);
    for (let x = 0; x <= 512; x += 32) {
      ctx.lineTo(x, i * 128 + Math.sin(x * 0.05 + i) * 2.5);
    }
    ctx.stroke();
  }
  // sombras suaves de acolchado
  for (let i = 0; i < 4; i++) {
    const sg = ctx.createLinearGradient(0, i * 128, 0, i * 128 + 40);
    sg.addColorStop(0, 'rgba(90,76,56,.20)');
    sg.addColorStop(1, 'rgba(90,76,56,0)');
    ctx.fillStyle = sg;
    ctx.fillRect(0, i * 128, 512, 40);
  }
  return makeTexture(c, { repeat: 1, anisotropy: 4 });
}

function buildStaticTexture() {
  const { c, ctx } = makeCanvas(256, 256);
  const data = ctx.createImageData(c.width, c.height);
  for (let y = 0; y < c.height; y++) {
    for (let x = 0; x < c.width; x++) {
      const i = (y * c.width + x) * 4;
      const n = Math.random();
      const v = 90 + n * 140;
      data.data[i] = v;
      data.data[i + 1] = v * 0.95;
      data.data[i + 2] = v * 0.72;
      data.data[i + 3] = 255;
    }
  }
  ctx.putImageData(data, 0, 0);
  return { c, ctx, tex: makeTexture(c, { srgb: true, clamp: true, anisotropy: 1 }) };
}

function buildGlowTexture(colorA = '#7ff0d2', colorB = '#143a31') {
  const { c, ctx } = makeCanvas(256, 256);
  const g = ctx.createRadialGradient(128, 128, 8, 128, 128, 120);
  g.addColorStop(0, colorA);
  g.addColorStop(0.35, colorA);
  g.addColorStop(1, colorB);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 256, 256);
  return makeTexture(c, { srgb: true, clamp: true, anisotropy: 1 });
}

function makeScreenPack() {
  const { c, ctx } = makeCanvas(512, 320);
  const staticInfo = buildStaticTexture();
  return {
    c,
    ctx,
    tex: makeTexture(c, { srgb: true, clamp: true, anisotropy: 4 }),
    staticInfo,
  };
}

function makeSignTexture(text, palette) {
  const { c, ctx } = makeCanvas(512, 144);
  const g = ctx.createLinearGradient(0, 0, 0, c.height);
  g.addColorStop(0, palette.top);
  g.addColorStop(1, palette.bottom);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, c.width, c.height);
  ctx.strokeStyle = palette.stroke;
  ctx.lineWidth = 6;
  makeRoundRectPath(ctx, 10, 10, c.width - 20, c.height - 20, 26);
  ctx.stroke();
  ctx.fillStyle = palette.glow;
  ctx.textAlign = 'center';
  ctx.font = `800 ${text.length > 18 ? 28 : 36}px Arial, sans-serif`;
  ctx.fillText(text.toUpperCase(), c.width * 0.5, 86);
  ctx.strokeStyle = palette.stroke;
  ctx.lineWidth = 2;
  ctx.strokeText(text.toUpperCase(), c.width * 0.5, 86);
  return makeTexture(c, { srgb: true, clamp: true, anisotropy: 2 });
}

function buildPreviewUrl(route) {
  const url = new URL(route, window.location.href);
  url.searchParams.set('embedded', '1');
  if (!url.searchParams.has('autostart')) url.searchParams.set('autostart', '1');
  if (!url.searchParams.has('autoStart')) url.searchParams.set('autoStart', '1');
  return url.toString();
}

function createPreviewHost() {
  const host = document.createElement('div');
  host.setAttribute('aria-hidden', 'true');
  host.style.cssText = 'position:fixed;left:-99999px;top:0;width:1px;height:1px;overflow:hidden;pointer-events:none;opacity:0';
  document.body.appendChild(host);
  return host;
}

class GameFeed {
  constructor(station, pack, host) {
    this.station = station;
    this.pack = pack;
    this.host = host;
    this.ready = false;
    this.sourceCanvas = null;
    this.sourceWindow = null;
    this.liveTex = null;
    this.lastDraw = 0;
    this.error = false;
    this.primed = false;
    this.focused = false;
    this.warm = false;
    this.url = buildPreviewUrl(station.data.ruta);

    this.iframe = document.createElement('iframe');
    this.iframe.title = `Vista previa de ${station.data.titulo}`;
    this.iframe.loading = 'eager';
    this.iframe.referrerPolicy = 'no-referrer';
    this.iframe.allow = 'autoplay; fullscreen; gamepad; xr-spatial-tracking';
    this.iframe.style.cssText = 'width:240px;height:135px;border:0;display:block;background:#000';
    this.iframe.addEventListener('load', () => this.onLoad());
    this.iframe.addEventListener('error', () => {
      this.error = true;
      this.ready = false;
    });
    this.iframe.src = this.url;
    host.appendChild(this.iframe);
  }

  onLoad() {
    let doc = null;
    try {
      doc = this.iframe.contentDocument;
    } catch {
      doc = null;
    }
    if (!doc) return;
    this.sourceWindow = this.iframe.contentWindow || null;
    this.sourceCanvas = doc.querySelector('canvas') || doc.getElementById('game') || doc.getElementById('c') || doc.getElementById('escena');
    this.ready = !!this.sourceCanvas;
    this.error = !this.ready;
    this.installPauseBridge();
    this.setPaused(!this.focused);

    const buttons = [
      '#startBtn',
      '#intro button',
      '#intro [role="button"]',
      '#hostStartBtn',
      '#readyBtn',
      '#joinRoomBtn',
      '#createRoomBtn',
    ];
    for (const sel of buttons) {
      const btn = doc.querySelector(sel);
      if (btn && btn.offsetParent !== null) {
        btn.click();
        break;
      }
    }
  }

  setFocus(active) {
    this.focused = active;
    if (active && !this.warm) {
      this.warm = true;
      this.ready = false;
      this.error = false;
      this.onLoad();
    }
    this.installPauseBridge();
    this.setPaused(!active);

    const visible = active || !this.primed;
    this.iframe.style.display = visible ? 'block' : 'none';
    this.iframe.style.visibility = visible ? 'visible' : 'hidden';
  }

  installPauseBridge() {
    const win = this.sourceWindow;
    if (!win || win.__salaPauseBridge) return;
    const bridge = {
      paused: false,
      queued: null,
      raf: win.requestAnimationFrame ? win.requestAnimationFrame.bind(win) : null,
      caf: win.cancelAnimationFrame ? win.cancelAnimationFrame.bind(win) : null,
    };
    win.__salaPauseBridge = bridge;
    const parent = this;
    win.requestAnimationFrame = (cb) => {
      if (!bridge.raf) return 0;
      if (bridge.paused) {
        bridge.queued = cb;
        return 0;
      }
      return bridge.raf(cb);
    };
    if (bridge.caf) {
      win.cancelAnimationFrame = (id) => bridge.caf(id);
    }
    parent.pauseBridge = bridge;
  }

  setPaused(paused) {
    const bridge = this.pauseBridge || this.sourceWindow?.__salaPauseBridge;
    if (!bridge) return;
    if (bridge.paused === paused) return;
    bridge.paused = paused;
    if (!paused && bridge.queued && bridge.raf) {
      const cb = bridge.queued;
      bridge.queued = null;
      bridge.raf(cb);
    }
  }

  getLiveTexture() {
    if (!this.sourceCanvas) return null;
    if (!this.liveTex || this.liveTex.image !== this.sourceCanvas) {
      const tex = new THREE.CanvasTexture(this.sourceCanvas);
      tex.colorSpace = THREE.SRGBColorSpace;
      tex.wrapS = tex.wrapT = THREE.ClampToEdgeWrapping;
      tex.anisotropy = 4;
      tex.generateMipmaps = true;
      tex.minFilter = THREE.LinearMipmapLinearFilter;
      tex.magFilter = THREE.LinearFilter;
      tex.needsUpdate = true;
      this.liveTex = tex;
    }
    return this.liveTex;
  }

  drawFallback(t, status = 'Cargando') {
    const { c, ctx, staticInfo } = this.pack;
    ctx.clearRect(0, 0, c.width, c.height);
    ctx.drawImage(staticInfo.c, 0, 0, c.width, c.height);
    ctx.fillStyle = 'rgba(7, 10, 12, 0.56)';
    ctx.fillRect(0, 0, c.width, c.height);

    const grad = ctx.createLinearGradient(0, 0, 0, c.height);
    grad.addColorStop(0, 'rgba(35, 64, 45, 0.36)');
    grad.addColorStop(1, 'rgba(9, 12, 10, 0.72)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, c.width, c.height);

    ctx.strokeStyle = 'rgba(255,255,255,0.12)';
    ctx.lineWidth = 4;
    makeRoundRectPath(ctx, 16, 16, c.width - 32, c.height - 32, 22);
    ctx.stroke();

    ctx.save();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#fff4d4';
    ctx.font = '800 30px Georgia, serif';
    ctx.fillText(this.station.data.titulo, c.width * 0.5, c.height * 0.40);
    ctx.font = '700 16px Georgia, serif';
    ctx.fillStyle = 'rgba(243,233,207,0.92)';
    ctx.fillText(status, c.width * 0.5, c.height * 0.56);
    ctx.font = '600 12px Arial, sans-serif';
    ctx.fillStyle = 'rgba(231,221,199,0.72)';
    ctx.fillText(this.error ? 'pantalla sin señal' : 'cargando demo', c.width * 0.5, c.height * 0.68);
    ctx.restore();

    const pulse = 0.35 + 0.25 * Math.sin(t * 4 + this.station.index * 1.7);
    ctx.fillStyle = `rgba(121, 240, 210, ${0.15 + pulse * 0.24})`;
    ctx.beginPath();
    ctx.arc(c.width * 0.78, c.height * 0.28, 32 + pulse * 10, 0, Math.PI * 2);
    ctx.fill();

    this.pack.tex.needsUpdate = true;
  }

  drawLive(t) {
    if (!this.sourceCanvas) {
      this.drawFallback(t, this.error ? 'PRÓXIMAMENTE' : 'Cargando');
      return;
    }

    const { c, ctx } = this.pack;
    ctx.clearRect(0, 0, c.width, c.height);
    ctx.drawImage(this.sourceCanvas, 0, 0, c.width, c.height);
    ctx.fillStyle = 'rgba(0,0,0,0.12)';
    ctx.fillRect(0, 0, c.width, 7);
    this.pack.tex.needsUpdate = true;
    this.lastDraw = t;
    this.primed = true;
  }

  update(t, isFocused) {
    this.setFocus(isFocused);
    if (!isFocused && this.primed) return;
    this.drawLive(t);
  }
}

class SalaApp {
  constructor() {
    this.selected = 0;
    this.mode = 'room'; // room | opening | game | closing
    this.progress = 0;
    this.targetProgress = 0;
    this.transitionSpeed = 0.58;
    this.activeRoute = '';
    this.dragging = false;
    this.dragStartX = 0;
    this.dragStartY = 0;
    this.dragLastX = 0;
    this.pointerMoved = false;
    this.pointerId = null;
    this.toastTimer = 0;
    this.lastTick = now();
    this.pendingOpen = null;
    this.loadedFrameRoute = '';

    this.renderer = new THREE.WebGLRenderer({ canvas: ui.canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.05;
    this.renderer.setClearColor(0x140b06, 1);

    // Las sombras dinámicas eran el otro pozo de GPU. La escena ya tiene
    // suficiente forma por iluminación y materiales, así que se dejan apagadas.
    this.renderer.shadowMap.enabled = false;

    this.compositor = new CompositorSala(this.renderer, ui.canvas);
    this.scene = new THREE.Scene();
    this.scene.fog = new THREE.FogExp2(0x160d07, 0.028);
    this.camera = new THREE.PerspectiveCamera(54, 1, 0.1, 60);
    this.camera.position.set(0, 1.62, 4.05);
    this.camYaw = 0;
    this.lampPos = new THREE.Vector3(0.45, 3.55, -0.7);

    this.osbTex = buildOSBTexture(41, '#b3743a');
    this.beamTex = buildBeamWoodTexture(7, true);
    this.honeyTex = buildBeamWoodTexture(23, false);
    this.floorTex = buildHerringboneTexture();
    this.nightTex = buildNightTexture();
    this.rugTex = buildRugTexture();
    this.fabricTex = buildFabricTexture('#d3c5a8', 88);
    this.glowTex = buildGlowTexture();
    this.staticPack = buildStaticTexture();

    this.screenDefs = new Map();
    this.previewHost = createPreviewHost();
    this.stations = STATIONS.map((data, i) => this.createStation(data, i));
    const bestiarioIndex = this.stations.findIndex((s) => s.data.titulo === 'Bestiario Vivo');
    if (bestiarioIndex >= 0) this.selected = bestiarioIndex;
    this.stationMap = new Map(this.stations.map((s) => [s.data.titulo, s]));

    this.buildRoom();
    this.setupLights();
    this.setupUI();
    this.resize();
    window.addEventListener('resize', () => this.resize(), { passive: true });
    window.addEventListener('keydown', (e) => this.onKeyDown(e));
    window.addEventListener('pointermove', (e) => this.onPointerMove(e), { passive: true });
    window.addEventListener('pointerup', (e) => this.onPointerUp(e), { passive: true });
    window.addEventListener('pointercancel', () => this.endDrag(), { passive: true });
    ui.canvas.addEventListener('pointerdown', (e) => this.onPointerDown(e));
    ui.leftBtn.addEventListener('click', () => this.moveSelection(-1));
    ui.rightBtn.addEventListener('click', () => this.moveSelection(1));
    ui.enterBtn.addEventListener('click', () => this.enterSelected());
    ui.backBtn.addEventListener('click', () => this.closeGame());
    ui.frame.addEventListener('load', () => {
      this.loadedFrameRoute = this.activeRoute;
      if (this.mode === 'opening' && this.pendingOpen) {
        this.beginOpeningTransition(this.pendingOpen);
      }
    });
    this.updateStationCard();
    this.syncChrome();
    requestAnimationFrame((t) => this.tick(t * 0.001));
  }

  buildRoom() {
    const room = new THREE.Group();
    this.scene.add(room);

    this.domeR = 5.2;   // radio de la esfera geodesica
    this.domeY = 1.25;  // centro de la esfera, sobre el piso (domo 5/8: la base baja casi vertical)

    this.buildDome(room);
    this.buildFloor(room);
    this.buildAltillo(room);
    this.addFurniture(room);
    this.addDecor(room);
    this.addStations(room);
    this.roomGroup = room;
  }

  buildDome(room) {
    const R = this.domeR;
    const CY = this.domeY;
    const ico = new THREE.IcosahedronGeometry(R, 4);
    // Alinear un vertice del icosaedro con +Y para que el apice quede arriba.
    const tGold = (1 + Math.sqrt(5)) / 2;
    const q = new THREE.Quaternion().setFromUnitVectors(
      new THREE.Vector3(1, tGold, 0).normalize(),
      new THREE.Vector3(0, 1, 0)
    );
    const src = ico.getAttribute('position');
    const nFaces = src.count / 3;
    const va = new THREE.Vector3();
    const vb = new THREE.Vector3();
    const vc = new THREE.Vector3();

    // Racimos de triangulos vidriados: la noche se ve por ahi.
    const windowDirs = [
      new THREE.Vector3(0.42, 0.62, -0.66).normalize(),
      new THREE.Vector3(-0.58, 0.44, -0.69).normalize(),
      new THREE.Vector3(0.88, 0.3, -0.38).normalize(),
    ];
    const windowCos = 0.9795;

    const panelPos = [];
    const panelUV = [];
    const panelCol = [];
    const nightPos = [];
    const nightUV = [];
    const edgeMap = new Map();
    const nodeMap = new Map();
    const keyOf = (v) => `${Math.round(v.x * 500)},${Math.round(v.y * 500)},${Math.round(v.z * 500)}`;
    const addEdge = (p1, p2) => {
      const k1 = keyOf(p1);
      const k2 = keyOf(p2);
      const key = k1 < k2 ? `${k1}|${k2}` : `${k2}|${k1}`;
      if (!edgeMap.has(key)) edgeMap.set(key, [p1.clone(), p2.clone()]);
      if (!nodeMap.has(k1)) nodeMap.set(k1, p1.clone());
      if (!nodeMap.has(k2)) nodeMap.set(k2, p2.clone());
    };
    const e1 = new THREE.Vector3();
    const e2 = new THREE.Vector3();
    const nrm = new THREE.Vector3();
    const cen = new THREE.Vector3();
    const rnd = rand(77);

    for (let f = 0; f < nFaces; f++) {
      va.fromBufferAttribute(src, f * 3).applyQuaternion(q);
      vb.fromBufferAttribute(src, f * 3 + 1).applyQuaternion(q);
      vc.fromBufferAttribute(src, f * 3 + 2).applyQuaternion(q);
      cen.copy(va).add(vb).add(vc).multiplyScalar(1 / 3);
      if (cen.y + CY < 0.34) continue; // bajo el nivel del piso

      addEdge(va, vb);
      addEdge(vb, vc);
      addEdge(vc, va);

      const dir = cen.clone().normalize();
      let isWindow = false;
      for (const w of windowDirs) {
        if (dir.dot(w) > windowCos) { isWindow = true; break; }
      }

      // base ortonormal del plano de la cara para proyectar UVs
      e1.copy(vb).sub(va).normalize();
      nrm.copy(vb).sub(va).cross(vc.clone().sub(va)).normalize();
      e2.copy(nrm).cross(e1);
      const su = 0.42;
      const ox = rnd();
      const oy = rnd();
      const uvOf = (p) => {
        const d = p.clone().sub(va);
        return [d.dot(e1) * su + ox, d.dot(e2) * su + oy];
      };
      // winding invertido: la cara mira hacia ADENTRO del domo
      const tri = [va, vc, vb];
      if (isWindow) {
        for (const p of tri) {
          nightPos.push(p.x, p.y, p.z);
          const [uu, vv] = uvOf(p);
          nightUV.push(uu, vv);
        }
      } else {
        const tone = 0.86 + rnd() * 0.22;
        for (const p of tri) {
          panelPos.push(p.x, p.y, p.z);
          const [uu, vv] = uvOf(p);
          panelUV.push(uu, vv);
          panelCol.push(tone, tone * (0.97 + rnd() * 0.03), tone * 0.94);
        }
      }
    }

    const dome = new THREE.Group();
    dome.position.y = CY;
    room.add(dome);

    const panelGeo = new THREE.BufferGeometry();
    panelGeo.setAttribute('position', new THREE.Float32BufferAttribute(panelPos, 3));
    panelGeo.setAttribute('uv', new THREE.Float32BufferAttribute(panelUV, 2));
    panelGeo.setAttribute('color', new THREE.Float32BufferAttribute(panelCol, 3));
    panelGeo.computeVertexNormals();
    const panelMesh = new THREE.Mesh(panelGeo, new THREE.MeshStandardMaterial({
      map: this.osbTex,
      vertexColors: true,
      roughness: 0.88,
      metalness: 0.0,
    }));
    panelMesh.receiveShadow = true;
    dome.add(panelMesh);

    const nightGeo = new THREE.BufferGeometry();
    nightGeo.setAttribute('position', new THREE.Float32BufferAttribute(nightPos, 3));
    nightGeo.setAttribute('uv', new THREE.Float32BufferAttribute(nightUV, 2));
    nightGeo.computeVertexNormals();
    const nightMesh = new THREE.Mesh(nightGeo, new THREE.MeshStandardMaterial({
      map: this.nightTex,
      emissiveMap: this.nightTex,
      emissive: 0x93aede,
      emissiveIntensity: 0.4,
      color: 0x141c2c,
      roughness: 0.12,
      metalness: 0.4,
    }));
    dome.add(nightMesh);

    // Vigas: una instancia por arista, seccion rectangular sobresaliendo hacia adentro.
    const edges = [...edgeMap.values()];
    const beamGeo = new THREE.BoxGeometry(1, 0.16, 0.058);
    const beamMat = new THREE.MeshStandardMaterial({ map: this.beamTex, roughness: 0.8, metalness: 0.0 });
    const beams = new THREE.InstancedMesh(beamGeo, beamMat, edges.length);
    const m4 = new THREE.Matrix4();
    const xA = new THREE.Vector3();
    const yA = new THREE.Vector3();
    const zA = new THREE.Vector3();
    const mid = new THREE.Vector3();
    edges.forEach(([p1, p2], i) => {
      mid.copy(p1).add(p2).multiplyScalar(0.5);
      const len = p1.distanceTo(p2) + 0.03;
      xA.copy(p2).sub(p1).normalize();
      yA.copy(mid).normalize();
      zA.copy(xA).cross(yA).normalize();
      yA.copy(zA).cross(xA).normalize();
      const pos = mid.clone().normalize().multiplyScalar(mid.length() - 0.075);
      m4.makeBasis(xA.clone().multiplyScalar(len), yA.clone(), zA.clone());
      m4.setPosition(pos);
      beams.setMatrixAt(i, m4);
    });
    beams.instanceMatrix.needsUpdate = true;
    dome.add(beams);

    // Conectores en los nodos.
    const nodes = [...nodeMap.values()];
    const hubGeo = new THREE.CylinderGeometry(0.075, 0.075, 0.05, 10);
    const hubMat = new THREE.MeshStandardMaterial({ color: 0x3a2412, roughness: 0.7, metalness: 0.08 });
    const hubs = new THREE.InstancedMesh(hubGeo, hubMat, nodes.length);
    const up = new THREE.Vector3(0, 1, 0);
    const qh = new THREE.Quaternion();
    nodes.forEach((v, i) => {
      const dir = v.clone().normalize();
      qh.setFromUnitVectors(up, dir);
      m4.makeRotationFromQuaternion(qh);
      m4.setPosition(dir.clone().multiplyScalar(v.length() - 0.145));
      hubs.setMatrixAt(i, m4);
    });
    hubs.instanceMatrix.needsUpdate = true;
    dome.add(hubs);

    // Zocalo perimetral: banda de madera que asienta el domo en el piso.
    const rB = Math.sqrt(R * R - CY * CY);
    const skirt = new THREE.Mesh(
      new THREE.CylinderGeometry(Math.sqrt(R * R - (0.95 - CY) * (0.95 - CY)) + 0.06, rB + 0.05, 0.95, 56, 1, true),
      new THREE.MeshStandardMaterial({ map: this.honeyTex, roughness: 0.85, side: THREE.BackSide })
    );
    this.honeyTex.wrapS = this.honeyTex.wrapT = THREE.RepeatWrapping;
    skirt.position.y = 0.475;
    skirt.receiveShadow = true;
    room.add(skirt);
  }

  buildFloor(room) {
    const R = this.domeR;
    const rB = Math.sqrt(R * R - this.domeY * this.domeY);
    this.floorTex.repeat.set(3.1, 3.1);
    const floor = new THREE.Mesh(
      new THREE.CircleGeometry(rB + 0.4, 64),
      new THREE.MeshStandardMaterial({
        map: this.floorTex,
        roughness: 0.66,
        metalness: 0.03,
      })
    );
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    room.add(floor);

    const rw = 1.32;
    const rh = 0.98;
    const rr = 0.5;
    const rugShape = new THREE.Shape();
    rugShape.moveTo(-rw + rr, -rh);
    rugShape.lineTo(rw - rr, -rh);
    rugShape.quadraticCurveTo(rw, -rh, rw, -rh + rr);
    rugShape.lineTo(rw, rh - rr);
    rugShape.quadraticCurveTo(rw, rh, rw - rr, rh);
    rugShape.lineTo(-rw + rr, rh);
    rugShape.quadraticCurveTo(-rw, rh, -rw, rh - rr);
    rugShape.lineTo(-rw, -rh + rr);
    rugShape.quadraticCurveTo(-rw, -rh, -rw + rr, -rh);
    const rugGeo = new THREE.ShapeGeometry(rugShape, 12);
    rugGeo.computeBoundingBox();
    const bb = rugGeo.boundingBox;
    const uvA = rugGeo.getAttribute('uv');
    const posA = rugGeo.getAttribute('position');
    for (let i = 0; i < uvA.count; i++) {
      uvA.setXY(
        i,
        (posA.getX(i) - bb.min.x) / (bb.max.x - bb.min.x),
        (posA.getY(i) - bb.min.y) / (bb.max.y - bb.min.y)
      );
    }
    const rug = new THREE.Mesh(
      rugGeo,
      new THREE.MeshStandardMaterial({ map: this.rugTex, roughness: 1, metalness: 0 })
    );
    rug.rotation.x = -Math.PI / 2;
    rug.position.set(-0.4, 0.014, -0.55);
    rug.receiveShadow = true;
    room.add(rug);
  }

  buildAltillo(room) {
    // Mezanine insinuado al lado izquierdo: viga gruesa, tablones, barandal rustico.
    const g = new THREE.Group();
    room.add(g);
    const platY = 2.72;
    const chordX = -2.75;
    const rPlat = 4.9;
    const z0 = Math.sqrt(rPlat * rPlat - chordX * chordX);

    const honeyMat = new THREE.MeshStandardMaterial({ map: this.honeyTex, roughness: 0.72, metalness: 0.0 });
    const darkMat = new THREE.MeshStandardMaterial({ map: this.beamTex, roughness: 0.85 });

    const beam = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.3, z0 * 2 + 0.4), honeyMat);
    beam.position.set(chordX, platY - 0.15, 0);
    beam.castShadow = true;
    g.add(beam);

    const a0 = Math.atan2(z0, chordX);
    const a1 = Math.atan2(-z0, chordX);
    const shape = new THREE.Shape();
    shape.moveTo(chordX, -z0);
    shape.lineTo(chordX, z0);
    shape.absarc(0, 0, rPlat, a0, a1, false);
    const plat = new THREE.Mesh(
      new THREE.ExtrudeGeometry(shape, { depth: 0.07, bevelEnabled: false }),
      honeyMat
    );
    plat.rotation.x = Math.PI / 2;
    plat.position.y = platY + 0.07;
    plat.castShadow = true;
    g.add(plat);

    for (const zz of [-1.9, 1.6]) {
      const post = new THREE.Mesh(new THREE.CylinderGeometry(0.085, 0.1, platY - 0.3, 12), darkMat);
      post.position.set(chordX, (platY - 0.3) / 2, zz);
      post.castShadow = true;
      g.add(post);
    }

    // barandal de palos rustica sobre la viga
    const railR = rand(5);
    const hand = new THREE.Mesh(new THREE.CylinderGeometry(0.042, 0.048, 4.6, 10), darkMat);
    hand.rotation.x = Math.PI / 2;
    hand.position.set(chordX + 0.02, platY + 0.82, -0.4);
    g.add(hand);
    for (let i = 0; i < 6; i++) {
      const zz = -2.5 + i * 0.85;
      const bal = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.038, 0.85, 8), darkMat);
      bal.position.set(chordX + (railR() - 0.5) * 0.05, platY + 0.42, zz);
      bal.rotation.z = (railR() - 0.5) * 0.12;
      bal.rotation.x = (railR() - 0.5) * 0.1;
      g.add(bal);
    }

    // arriba, ordenado y en penumbra: colchoneta con cobija estirada y un cojin
    const bed = new THREE.Mesh(new THREE.BoxGeometry(1.7, 0.16, 1.05), new THREE.MeshStandardMaterial({ map: this.fabricTex, roughness: 1 }));
    bed.position.set(-3.9, platY + 0.16, -0.7);
    g.add(bed);
    const blanket = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.06, 0.85), new THREE.MeshStandardMaterial({ color: 0x4e7a72, roughness: 1 }));
    blanket.position.set(-3.95, platY + 0.26, -0.72);
    g.add(blanket);
    const cushion = new THREE.Mesh(new THREE.CapsuleGeometry(0.13, 0.3, 4, 10), new THREE.MeshStandardMaterial({ color: 0xd9c9a8, roughness: 1 }));
    cushion.rotation.z = Math.PI / 2;
    cushion.position.set(-4.15, platY + 0.3, -0.15);
    g.add(cushion);

    // escalera de mano apoyada a la viga
    const lad = new THREE.Group();
    for (const dx of [-0.22, 0.22]) {
      const rail = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 3.1, 8), honeyMat);
      rail.position.set(dx, 1.55, 0);
      lad.add(rail);
    }
    for (let i = 0; i < 6; i++) {
      const step = new THREE.Mesh(new THREE.CylinderGeometry(0.026, 0.026, 0.44, 8), darkMat);
      step.rotation.z = Math.PI / 2;
      step.position.set(0, 0.38 + i * 0.47, 0);
      lad.add(step);
    }
    lad.position.set(chordX + 0.48, 0, 2.45);
    lad.rotation.z = 0.32;
    lad.rotation.y = Math.PI * 0.06;
    lad.traverse((o) => { o.castShadow = true; });
    g.add(lad);
  }

  setupLights() {
    // Base tenue y calida: los bordes del domo quedan en penumbra.
    this.scene.add(new THREE.HemisphereLight(0x9a6a3e, 0x140b05, 0.34));

    // LA fuente: un foco potente colgando cerca del apice.
    const lampPos = this.lampPos;

    const spot = new THREE.SpotLight(0xffdca0, 85, 18, 0.86, 0.85, 1.5);
    spot.position.copy(lampPos);
    spot.target.position.set(0.1, 0, -0.5);
    spot.castShadow = true;
    spot.shadow.mapSize.set(1024, 1024);
    spot.shadow.bias = -0.0025;
    spot.shadow.camera.near = 0.5;
    spot.shadow.camera.far = 12;
    this.scene.add(spot);
    this.scene.add(spot.target);
    this.apexSpot = spot;

    // Rebote calido que bana la madera de la cupula alrededor del foco.
    const apexFill = new THREE.PointLight(0xffc180, 15, 0, 1.9);
    apexFill.position.copy(lampPos).add(new THREE.Vector3(0, 0.22, 0));
    this.scene.add(apexFill);

    // Brasa de la estufa.
    const stove = new THREE.PointLight(0xff6f28, 9, 5.5, 2);
    stove.position.set(3.35, 0.62, 2.3);
    this.scene.add(stove);
    this.stoveLight = stove;

    // Luz que acompana a la estacion seleccionada (el resplandor frio de los
    // CRT no seleccionados lo dan sus glow sprites: menos luces = mas FPS).
    const sel = new THREE.PointLight(0x8df0d8, 9, 5.0, 2);
    sel.position.set(0, 1.6, -3.0);
    this.scene.add(sel);
    this.selLight = sel;
  }

  setupUI() {
    this.updateMeta();
  }

  addFurniture(room) {
    const honeyMat = new THREE.MeshStandardMaterial({ map: this.honeyTex, roughness: 0.72 });
    const fabricMat = new THREE.MeshStandardMaterial({ map: this.fabricTex, roughness: 0.98 });

    // Futon crema mirando a las pantallas, bajo, sin tapar nada.
    const fut = new THREE.Group();
    const base = new THREE.Mesh(new THREE.BoxGeometry(1.95, 0.13, 0.92), honeyMat);
    base.position.y = 0.22;
    fut.add(base);
    for (const [dx, dz] of [[-0.88, -0.38], [0.88, -0.38], [-0.88, 0.38], [0.88, 0.38]]) {
      const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.045, 0.17, 10), honeyMat);
      leg.position.set(dx, 0.085, dz);
      fut.add(leg);
    }
    const seat = new THREE.Mesh(new THREE.BoxGeometry(1.88, 0.24, 0.85), fabricMat);
    seat.position.set(0, 0.41, 0.04);
    fut.add(seat);
    const back = new THREE.Mesh(new THREE.BoxGeometry(1.88, 0.68, 0.22), fabricMat);
    back.position.set(0, 0.78, -0.38);
    back.rotation.x = 0.24;
    fut.add(back);
    for (const dx of [-0.55, 0.45]) {
      const cush = new THREE.Mesh(new THREE.CapsuleGeometry(0.14, 0.3, 4, 12), new THREE.MeshStandardMaterial({ color: dx < 0 ? 0xcdb890 : 0x7a8a68, roughness: 1 }));
      cush.rotation.z = Math.PI / 2;
      cush.rotation.y = (dx < 0 ? -1 : 1) * 0.2;
      cush.position.set(dx, 0.62, -0.24);
      fut.add(cush);
    }
    fut.position.set(3.15, 0, 1.1);
    fut.lookAt(-1.4, 0, -1.3);
    fut.traverse((o) => { o.castShadow = true; });
    room.add(fut);

    // Puff verde musgo sobre el tapete.
    const puff = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.44, 0.4, 20), new THREE.MeshStandardMaterial({ color: 0x44523a, roughness: 1 }));
    puff.position.set(-1.95, 0.2, 0.1);
    puff.castShadow = true;
    room.add(puff);
    const puffTop = new THREE.Mesh(new THREE.SphereGeometry(0.4, 20, 10, 0, Math.PI * 2, 0, Math.PI * 0.4), new THREE.MeshStandardMaterial({ color: 0x4c5a40, roughness: 1 }));
    puffTop.scale.y = 0.35;
    puffTop.position.set(-1.95, 0.4, 0.1);
    room.add(puffTop);

    // Estufa de lena con su tubo subiendo hasta el casco.
    const stove = new THREE.Group();
    const metal = new THREE.MeshStandardMaterial({ color: 0x1c1a18, roughness: 0.55, metalness: 0.55 });
    const plate = new THREE.Mesh(new THREE.CylinderGeometry(0.44, 0.48, 0.05, 22), new THREE.MeshStandardMaterial({ color: 0x565048, roughness: 0.9 }));
    plate.position.y = 0.025;
    stove.add(plate);
    for (let i = 0; i < 3; i++) {
      const legA = (i / 3) * Math.PI * 2 + 0.4;
      const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.03, 0.22, 8), metal);
      leg.position.set(Math.cos(legA) * 0.18, 0.16, Math.sin(legA) * 0.18);
      stove.add(leg);
    }
    const body = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.26, 0.6, 20), metal);
    body.position.y = 0.57;
    stove.add(body);
    const lid = new THREE.Mesh(new THREE.CylinderGeometry(0.255, 0.24, 0.07, 20), metal);
    lid.position.y = 0.9;
    stove.add(lid);
    this.stoveGlow = new THREE.Mesh(
      new THREE.CircleGeometry(0.085, 18),
      new THREE.MeshStandardMaterial({ color: 0x2a0d02, emissive: 0xff7a24, emissiveIntensity: 2.4, roughness: 0.6 })
    );
    stove.add(this.stoveGlow);
    const pipe = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.075, 3.5, 14), metal);
    pipe.position.y = 2.65;
    stove.add(pipe);
    const collar = new THREE.Mesh(new THREE.TorusGeometry(0.1, 0.03, 8, 16), metal);
    collar.rotation.x = Math.PI / 2;
    collar.position.y = 4.35;
    stove.add(collar);
    stove.position.set(3.35, 0, 2.3);
    // la puerta con brasa mira al centro de la sala
    const doorDir = new THREE.Vector3(-3.35, 0, -2.3).normalize();
    this.stoveGlow.position.set(doorDir.x * 0.245, 0.55, doorDir.z * 0.245);
    this.stoveGlow.lookAt(stove.position.clone().add(doorDir.clone().multiplyScalar(3)).setY(0.55));
    body.castShadow = true;
    pipe.castShadow = true;
    room.add(stove);

    // Mesita lateral con libros bien puestos y una taza.
    const bench = new THREE.Mesh(new THREE.BoxGeometry(0.58, 0.07, 0.38), honeyMat);
    bench.position.set(-2.5, 0.34, 1.15);
    bench.castShadow = true;
    room.add(bench);
    for (const dx of [-0.2, 0.2]) {
      const bLeg = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.31, 0.3), honeyMat);
      bLeg.position.set(-2.5 + dx, 0.155, 1.15);
      room.add(bLeg);
    }
    for (let i = 0; i < 3; i++) {
      const bw = 0.26 - i * 0.03;
      const book = new THREE.Mesh(
        new THREE.BoxGeometry(bw, 0.045, 0.19),
        new THREE.MeshStandardMaterial({ color: [0x7a4a2a, 0x4e5e46, 0xa08858][i], roughness: 1 })
      );
      book.position.set(-2.6, 0.4 + i * 0.047, 1.12);
      book.rotation.y = (i - 1) * 0.09;
      room.add(book);
    }
    const mug = new THREE.Mesh(new THREE.CylinderGeometry(0.042, 0.038, 0.08, 14), new THREE.MeshStandardMaterial({ color: 0xd8cbb4, roughness: 0.7 }));
    mug.position.set(-2.35, 0.415, 1.24);
    room.add(mug);
  }

  addDecor(room) {
    // --- Lampara colgando cerca del apice: cable, campana, bombillo y destello ---
    const apex = new THREE.Vector3(0, this.domeY + this.domeR - 0.1, 0);
    const lamp = this.lampPos.clone();
    const cableCurve = new THREE.LineCurve3(apex, lamp.clone().add(new THREE.Vector3(0, 0.16, 0)));
    const cable = new THREE.Mesh(
      new THREE.TubeGeometry(cableCurve, 4, 0.013, 6, false),
      new THREE.MeshStandardMaterial({ color: 0x17110c, roughness: 0.9 })
    );
    room.add(cable);
    const shadePts = [
      new THREE.Vector2(0.015, 0.16),
      new THREE.Vector2(0.05, 0.14),
      new THREE.Vector2(0.1, 0.1),
      new THREE.Vector2(0.17, 0.02),
      new THREE.Vector2(0.19, -0.02),
    ];
    const shade = new THREE.Mesh(
      new THREE.LatheGeometry(shadePts, 20),
      new THREE.MeshStandardMaterial({ color: 0x2a2620, roughness: 0.4, metalness: 0.6, side: THREE.DoubleSide })
    );
    shade.position.copy(lamp);
    room.add(shade);
    const bulb = new THREE.Mesh(
      new THREE.SphereGeometry(0.055, 14, 10),
      new THREE.MeshBasicMaterial({ color: 0xfff6dc })
    );
    bulb.position.copy(lamp).add(new THREE.Vector3(0, -0.04, 0));
    room.add(bulb);

    const mkRadial = (inner, mid) => {
      const { c, ctx } = makeCanvas(128, 128);
      const g = ctx.createRadialGradient(64, 64, 2, 64, 64, 62);
      g.addColorStop(0, inner);
      g.addColorStop(0.35, mid);
      g.addColorStop(1, 'rgba(255,190,110,0)');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, 128, 128);
      return makeTexture(c, { clamp: true, anisotropy: 1 });
    };
    const mkStreak = () => {
      const { c, ctx } = makeCanvas(256, 24);
      const g = ctx.createLinearGradient(0, 0, 256, 0);
      g.addColorStop(0, 'rgba(255,220,160,0)');
      g.addColorStop(0.5, 'rgba(255,238,205,.9)');
      g.addColorStop(1, 'rgba(255,220,160,0)');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, 256, 24);
      return makeTexture(c, { clamp: true, anisotropy: 1 });
    };
    const flare = new THREE.Sprite(new THREE.SpriteMaterial({
      map: mkRadial('rgba(255,250,235,.95)', 'rgba(255,205,130,.5)'),
      transparent: true,
      opacity: 0.85,
      depthWrite: false,
      depthTest: false,
      blending: THREE.AdditiveBlending,
    }));
    flare.scale.set(2.1, 2.1, 1);
    flare.position.copy(bulb.position);
    flare.renderOrder = 30;
    room.add(flare);
    this.flare = flare;
    const streakTex = mkStreak();
    for (const [sx, sy, rot, op] of [[4.6, 0.3, 0.55, 0.4], [2.9, 0.2, -0.9, 0.32]]) {
      const st = new THREE.Sprite(new THREE.SpriteMaterial({
        map: streakTex,
        transparent: true,
        opacity: op,
        rotation: rot,
        depthWrite: false,
        depthTest: false,
        blending: THREE.AdditiveBlending,
      }));
      st.scale.set(sx, sy, 1);
      st.position.copy(bulb.position);
      st.renderOrder = 31;
      room.add(st);
    }

    // --- Helecho en matera de barro, bajo el borde del altillo ---
    const pot = new THREE.Mesh(
      new THREE.CylinderGeometry(0.22, 0.16, 0.32, 16),
      new THREE.MeshStandardMaterial({ color: 0x8a4f30, roughness: 0.95 })
    );
    pot.position.set(-3.15, 0.16, 3.05);
    pot.castShadow = true;
    room.add(pot);
    const frondTex = this.buildFrondTexture();
    const frondMat = new THREE.MeshStandardMaterial({
      map: frondTex,
      alphaTest: 0.4,
      side: THREE.DoubleSide,
      roughness: 1,
      color: 0xcfe0b8,
    });
    const rndF = rand(313);
    for (let i = 0; i < 14; i++) {
      const geo = new THREE.PlaneGeometry(0.26, 1.0, 1, 6);
      const pp = geo.getAttribute('position');
      for (let vi = 0; vi < pp.count; vi++) {
        const yy = pp.getY(vi) + 0.5;
        pp.setZ(vi, yy * yy * 0.42);
      }
      geo.computeVertexNormals();
      const frond = new THREE.Mesh(geo, frondMat);
      frond.position.set(-3.15, 0.34, 3.05);
      frond.rotation.y = (i / 14) * Math.PI * 2 + rndF() * 0.5;
      frond.rotation.x = -0.5 - rndF() * 0.55;
      frond.rotateOnAxis(new THREE.Vector3(1, 0, 0), -0.35);
      const s = 0.75 + rndF() * 0.5;
      frond.scale.setScalar(s);
      frond.translateY(0.42 * s);
      room.add(frond);
    }

    // --- Polvo calido flotando en la luz ---
    const N = 46;
    const dustPos = new Float32Array(N * 3);
    const rndD = rand(99);
    for (let i = 0; i < N; i++) {
      dustPos[i * 3] = 0.35 + (rndD() - 0.5) * 3.4;
      dustPos[i * 3 + 1] = 0.4 + rndD() * 4.2;
      dustPos[i * 3 + 2] = -0.6 + (rndD() - 0.5) * 3.4;
    }
    const dustGeo = new THREE.BufferGeometry();
    dustGeo.setAttribute('position', new THREE.BufferAttribute(dustPos, 3));
    this.dust = new THREE.Points(dustGeo, new THREE.PointsMaterial({
      map: mkRadial('rgba(255,240,210,1)', 'rgba(255,214,150,.6)'),
      color: 0xffdca8,
      size: 0.045,
      sizeAttenuation: true,
      transparent: true,
      opacity: 0.5,
      alphaTest: 0.01,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    }));
    room.add(this.dust);
  }

  buildFrondTexture() {
    // Fronda de helecho pinnada dibujada con alpha, para dar masa vegetal.
    const { c, ctx } = makeCanvas(128, 256);
    ctx.clearRect(0, 0, 128, 256);
    const rnd = rand(51);
    ctx.strokeStyle = '#3e5a2c';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(64, 250);
    ctx.quadraticCurveTo(60, 130, 64, 14);
    ctx.stroke();
    for (let i = 0; i < 22; i++) {
      const t = i / 22;
      const y = 244 - t * 224;
      const len = 44 * Math.sin(Math.PI * (0.15 + 0.85 * (1 - t))) + 6;
      for (const sgn of [-1, 1]) {
        ctx.save();
        ctx.translate(63 + sgn * 2, y);
        ctx.rotate(sgn * (0.9 + rnd() * 0.25) - Math.PI / 2 * (1 - sgn) * 0);
        const gg = ctx.createLinearGradient(0, 0, sgn * len, 0);
        gg.addColorStop(0, `rgba(${52 + t * 40},${92 + t * 52},${40 + t * 22},.98)`);
        gg.addColorStop(1, `rgba(${64 + t * 40},${110 + t * 50},${48 + t * 26},.9)`);
        ctx.fillStyle = gg;
        ctx.beginPath();
        ctx.ellipse(sgn * len * 0.5, 0, len * 0.52, 4.6 + (1 - t) * 2.4, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
    }
    return makeTexture(c, { clamp: true, anisotropy: 4 });
  }

  addStations(room) {
    // Anillo de maquinas abrazando el interior del domo. Las encendidas quedan
    // al centro del arco; arcades un paso mas atras que los CRT para dar fondo.
    const n = this.stations.length;
    const arc = Math.PI * (160 / 180);
    const step = arc / (n - 1);
    const pedMat = new THREE.MeshStandardMaterial({ map: this.honeyTex, roughness: 0.82 });
    for (let i = 0; i < n; i++) {
      const station = this.stations[i];
      const slot = (i % 2) ? ((i + 1) >> 1) : -(i >> 1); // 0, +1, -1, +2, -2...
      const theta = slot * step;
      station.kind = i % 3 === 0 ? 'arcade' : 'crt';
      const backRow = (((slot % 2) + 2) % 2) === 1; // fila trasera elevada en tarima
      const r = backRow ? 4.95 : 4.12;
      const y = backRow ? 0.34 : 0;
      const x = Math.sin(theta) * r;
      const z = -Math.cos(theta) * r;
      station.group.position.set(x, y, z);
      station.group.lookAt(0, y, 0);
      station.theta = theta;
      station.lookAt = new THREE.Vector3(0, 1.2, 0);
      station.focusOffset = new THREE.Vector3(0, 0, 0);
      room.add(station.group);
      station.basePos = station.group.position.clone();
      station.baseRotY = station.group.rotation.y;
      if (backRow) {
        const ped = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.34, 1.2), pedMat);
        ped.position.set(x, 0.17, z);
        ped.rotation.y = station.group.rotation.y;
        ped.castShadow = true;
        ped.receiveShadow = true;
        room.add(ped);
      }
    }
  }

  createStation(data, index) {
    const group = new THREE.Group();
    const station = {
      data,
      index,
      kind: 'crt',
      group,
      screen: null,
      screenTex: null,
      screenCtx: null,
      marqueeTex: null,
      marqueeCtx: null,
      shell: null,
      glow: null,
      bezel: null,
      light: null,
      basePos: new THREE.Vector3(),
      lookAt: new THREE.Vector3(0, 1.2, 0),
      cables: [],
      feed: null,
    };
    if (index % 3 === 0) this.buildArcadeStation(station);
    else this.buildCRTStation(station);
    return station;
  }

  buildCRTStation(station) {
    const bodyMat = new THREE.MeshStandardMaterial({ color: 0x241d1a, roughness: 0.72, metalness: 0.05, emissive: 0x080503, emissiveIntensity: 0.2 });
    const trimMat = new THREE.MeshStandardMaterial({ color: 0x1d1714, roughness: 0.92, metalness: 0.04 });
    const glassMat = new THREE.MeshStandardMaterial({ color: 0x0c0e10, roughness: 0.14, metalness: 0.3, transparent: true, opacity: 0.5 });
    const pack = this.buildScreenTexture(station.data, station.index);

    // Televisor panzon con carcasa de madera, apoyado en su mueble.
    const woodShellMat = new THREE.MeshStandardMaterial({
      map: this.honeyTex,
      roughness: 0.6,
      metalness: 0.02,
      emissive: 0x120a04,
      emissiveIntensity: 0.2,
    });
    const shell = new THREE.Mesh(new THREE.BoxGeometry(1.18, 0.86, 0.56), woodShellMat);
    shell.position.set(0, 0.97, -0.02);
    shell.castShadow = true;
    station.group.add(shell);
    station.shell = shell;
    const tail = new THREE.Mesh(new THREE.BoxGeometry(0.88, 0.64, 0.3), woodShellMat);
    tail.position.set(0, 0.97, -0.36);
    station.group.add(tail);
    const topTrim = new THREE.Mesh(new THREE.BoxGeometry(1.22, 0.05, 0.6), bodyMat);
    topTrim.position.set(0, 1.42, -0.02);
    station.group.add(topTrim);

    // Mueble bajo de madera: el CRT panzon apoya encima, como en la sala de la casa.
    const cabMat = new THREE.MeshStandardMaterial({ map: this.honeyTex, roughness: 0.75 });
    const cab = new THREE.Mesh(new THREE.BoxGeometry(1.06, 0.4, 0.68), cabMat);
    cab.position.set(0, 0.31, 0.05);
    cab.castShadow = true;
    station.group.add(cab);
    for (const [dx, dz] of [[-0.46, -0.26], [0.46, -0.26], [-0.46, 0.3], [0.46, 0.3]]) {
      const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.04, 0.12, 8), trimMat);
      leg.position.set(dx, 0.06, dz);
      station.group.add(leg);
    }
    for (const dx of [-0.25, 0.25]) {
      const door = new THREE.Mesh(new THREE.BoxGeometry(0.44, 0.3, 0.02), new THREE.MeshStandardMaterial({ map: this.beamTex, roughness: 0.8 }));
      door.position.set(dx, 0.3, 0.395);
      station.group.add(door);
      const knob = new THREE.Mesh(new THREE.SphereGeometry(0.018, 8, 6), trimMat);
      knob.position.set(dx + (dx < 0 ? 0.16 : -0.16), 0.3, 0.415);
      station.group.add(knob);
    }

    // Frente: marco oscuro, pantalla curva y columna de perillas.
    const face = new THREE.Mesh(new THREE.BoxGeometry(1.08, 0.76, 0.05), trimMat);
    face.position.set(0, 0.97, 0.27);
    station.group.add(face);

    const screenGeo = new THREE.PlaneGeometry(0.86, 0.56, 8, 6);
    const sp = screenGeo.getAttribute('position');
    for (let vi = 0; vi < sp.count; vi++) {
      const nx = sp.getX(vi) / 0.43;
      const ny = sp.getY(vi) / 0.28;
      sp.setZ(vi, 0.05 * (1 - nx * nx * 0.5 - ny * ny * 0.5));
    }
    screenGeo.computeVertexNormals();
    const screen = new THREE.Mesh(screenGeo, new THREE.MeshStandardMaterial({
      map: pack.tex,
      emissiveMap: pack.tex,
      emissive: 0xffffff,
      emissiveIntensity: 1.15,
      roughness: 0.55,
      metalness: 0.0,
      color: 0xffffff,
    }));
    screen.position.set(-0.08, 0.97, 0.28);
    station.group.add(screen);
    station.screen = screen;

    const glass = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 0.6), glassMat);
    glass.position.set(-0.08, 0.97, 0.345);
    station.group.add(glass);

    const glow = new THREE.Sprite(new THREE.SpriteMaterial({
      map: this.glowTex,
      color: station.data.activo ? 0x7ff0d2 : 0x98a0a8,
      transparent: true,
      opacity: 0.35,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    }));
    glow.scale.set(1.7, 1.2, 1);
    glow.position.set(-0.06, 0.97, 0.62);
    station.group.add(glow);
    station.glow = glow;

    for (let ki = 0; ki < 2; ki++) {
      const knob = new THREE.Mesh(new THREE.CylinderGeometry(0.042, 0.046, 0.05, 12), bodyMat);
      knob.rotation.x = Math.PI / 2;
      knob.position.set(0.45, 1.16 - ki * 0.16, 0.31);
      station.group.add(knob);
    }
    // rejilla del parlante bajo las perillas
    for (let gi = 0; gi < 4; gi++) {
      const slat = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.014, 0.02), bodyMat);
      slat.position.set(0.45, 0.86 - gi * 0.045, 0.3);
      station.group.add(slat);
    }

    station.screenTex = pack;
    station.feed = pack.feed;
    station.screen.material.map = station.screenTex.tex;
    station.screen.material.emissiveMap = station.screenTex.tex;
    station.screen.material.needsUpdate = true;
    station.screenCtx = station.screenTex.ctx;
  }

  buildArcadeStation(station) {
    const bodyMat = new THREE.MeshStandardMaterial({ color: 0x2b1d16, roughness: 0.84, metalness: 0.04, emissive: 0x0a0603, emissiveIntensity: 0.2 });
    const bezelMat = new THREE.MeshStandardMaterial({ color: 0x12100f, roughness: 0.45, metalness: 0.08 });
    const glassMat = new THREE.MeshStandardMaterial({ color: 0x101214, roughness: 0.12, metalness: 0.25, transparent: true, opacity: 0.5 });
    const sideMat = new THREE.MeshStandardMaterial({ map: this.beamTex, roughness: 0.78 });
    const screenPack = this.buildScreenTexture(station.data, station.index);

    // Gabinete arcade de verdad: cuerpo, torso inclinado, cabezal y laterales de madera.
    const body = new THREE.Mesh(new THREE.BoxGeometry(0.92, 1.02, 0.72), bodyMat);
    body.position.set(0, 0.51, -0.02);
    body.castShadow = true;
    station.group.add(body);
    station.shell = body;
    const torso = new THREE.Mesh(new THREE.BoxGeometry(0.92, 0.72, 0.5), bodyMat);
    torso.position.set(0, 1.4, -0.12);
    torso.rotation.x = 0.14;
    station.group.add(torso);
    const head = new THREE.Mesh(new THREE.BoxGeometry(0.96, 0.44, 0.56), bodyMat);
    head.position.set(0, 2.0, -0.1);
    head.castShadow = true;
    station.group.add(head);
    for (const sx of [-0.485, 0.485]) {
      const side = new THREE.Mesh(new THREE.BoxGeometry(0.05, 2.24, 0.76), sideMat);
      side.position.set(sx, 1.12, -0.04);
      side.castShadow = true;
      station.group.add(side);
    }

    const marqueeTex = makeSignTexture(station.data.titulo, {
      top: station.data.activo ? '#6e3812' : '#4a443c',
      bottom: station.data.activo ? '#3a1a06' : '#2a2622',
      glow: station.data.activo ? '#ffd98a' : '#8f887c',
      stroke: station.data.activo ? '#2a1204' : '#1c1814',
    });
    station.marqueeTex = marqueeTex;
    const marquee = new THREE.Mesh(new THREE.PlaneGeometry(1.25, 0.36), new THREE.MeshStandardMaterial({
      map: marqueeTex,
      emissiveMap: marqueeTex,
      emissive: station.data.activo ? 0xffbf6a : 0x414141,
      emissiveIntensity: 1.3,
      color: 0xffffff,
      roughness: 0.5,
      metalness: 0,
    }));
    marquee.position.set(0, 2.04, 0.19);
    marquee.rotation.x = -0.08;
    station.group.add(marquee);
    station.bezel = marquee;

    station.screenTex = screenPack;
    station.feed = screenPack.feed;
    const screen = new THREE.Mesh(new THREE.PlaneGeometry(0.84, 0.6), new THREE.MeshStandardMaterial({
      map: screenPack.tex,
      emissiveMap: screenPack.tex,
      emissive: 0xffffff,
      emissiveIntensity: 1.12,
      color: 0xffffff,
      roughness: 0.35,
      metalness: 0.0,
    }));
    screen.position.set(0, 1.42, 0.15);
    screen.rotation.x = 0.14;
    station.group.add(screen);
    station.screen = screen;

    const glass = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 0.66), glassMat);
    glass.position.set(0, 1.41, 0.185);
    glass.rotation.x = 0.14;
    station.group.add(glass);

    const glow = new THREE.Sprite(new THREE.SpriteMaterial({
      map: this.glowTex,
      color: station.data.activo ? 0xffd07c : 0x8f8f8f,
      transparent: true,
      opacity: 0.28,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    }));
    glow.scale.set(1.8, 1.1, 1);
    glow.position.set(0, 1.42, 0.5);
    station.group.add(glow);
    station.glow = glow;

    // Panel de control con palanca y botones.
    const panel = new THREE.Mesh(new THREE.BoxGeometry(0.92, 0.09, 0.46), bezelMat);
    panel.position.set(0, 1.02, 0.42);
    panel.rotation.x = -0.3;
    station.group.add(panel);
    const stickBase = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.06, 0.03, 10), bodyMat);
    stickBase.position.set(-0.22, 1.08, 0.42);
    stickBase.rotation.x = -0.3;
    station.group.add(stickBase);
    const stick = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.014, 0.16, 8), bezelMat);
    stick.position.set(-0.22, 1.15, 0.4);
    stick.rotation.x = -0.2;
    station.group.add(stick);
    const ball = new THREE.Mesh(
      new THREE.SphereGeometry(0.035, 12, 8),
      new THREE.MeshStandardMaterial({ color: 0xb03830, roughness: 0.35 })
    );
    ball.position.set(-0.22, 1.23, 0.385);
    station.group.add(ball);
    const btnCols = [0xd8b23a, 0x3f8a5c, 0x3a6ea8];
    for (let bi = 0; bi < 3; bi++) {
      const btn = new THREE.Mesh(
        new THREE.CylinderGeometry(0.032, 0.036, 0.025, 10),
        new THREE.MeshStandardMaterial({ color: btnCols[bi], roughness: 0.4 })
      );
      btn.position.set(0.06 + bi * 0.14, 1.06 - bi * 0.014, 0.44 - bi * 0.008);
      btn.rotation.x = -0.3;
      station.group.add(btn);
    }
  }

  buildScreenTexture(data, index) {
    const key = `${data.titulo}::${index}`;
    if (this.screenDefs.has(key)) return this.screenDefs.get(key);
    const pack = makeScreenPack();
    const obj = {
      key,
      data,
      index,
      c: pack.c,
      ctx: pack.ctx,
      tex: pack.tex,
      staticInfo: pack.staticInfo,
      phase: Math.random() * Math.PI * 2,
      feed: data.activo && data.ruta ? new GameFeed({ data, index }, pack, this.previewHost) : null,
      focused: false,
    };
    this.screenDefs.set(key, obj);
    return obj;
  }

  updateScreenTextures(t) {
    if (this.staticCursor === undefined) {
      this.staticCursor = 0;
      this.staticClock = 0;
      this.screenInit = new Set();
    }
    this.staticClock += 1;
    const inactive = this.stations.filter((s) => !s.feed);
    const rotating = inactive.length ? inactive[this.staticCursor % inactive.length] : null;
    if (this.staticClock % 6 === 0) this.staticCursor += 1;
    for (const station of this.stations) {
      const active = !!station.feed;
      const firstDraw = !this.screenInit.has(station.index);
      if (!active && !firstDraw && station !== rotating) continue;
      this.screenInit.add(station.index);
      const pack = station.screenTex;
      const ctx = pack.ctx;
      const selected = station.index === this.selected;
      station.focused = selected;
      let dirty = false;

      if (active) {
        if (selected) {
          const liveTex = pack.feed?.getLiveTexture?.();
          if (liveTex) {
            if (station.screen.material.map !== liveTex) {
              station.screen.material.map = liveTex;
              station.screen.material.emissiveMap = liveTex;
              station.screen.material.needsUpdate = true;
            }
            liveTex.needsUpdate = true;
            if (pack.feed) {
              pack.feed.lastDraw = t;
              pack.feed.primed = true;
            }
          } else {
            const before = pack.feed?.lastDraw ?? 0;
            pack.feed?.update(t, selected);
            dirty = (pack.feed?.lastDraw ?? 0) !== before;
          }
        } else {
          if (station.screen.material.map !== pack.tex) {
            station.screen.material.map = pack.tex;
            station.screen.material.emissiveMap = pack.tex;
            station.screen.material.needsUpdate = true;
          }
          dirty = false;
        }
      } else {
        if (station.screen.material.map !== pack.tex) {
          station.screen.material.map = pack.tex;
          station.screen.material.emissiveMap = pack.tex;
          station.screen.material.needsUpdate = true;
        }
        ctx.clearRect(0, 0, pack.c.width, pack.c.height);
        ctx.drawImage(pack.staticInfo.c, 0, 0);
        ctx.fillStyle = 'rgba(8,6,10,.72)';
        ctx.fillRect(0, 0, pack.c.width, pack.c.height);
        ctx.fillStyle = 'rgba(205,196,180,.72)';
        ctx.font = '800 30px Arial, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('PRÓXIMAMENTE', pack.c.width * 0.5, 144);
        ctx.font = '600 14px Arial, sans-serif';
        ctx.fillStyle = 'rgba(180,172,158,.55)';
        ctx.fillText('Pantalla apagada', pack.c.width * 0.5, 174);
        dirty = true;
      }

      if (dirty) {
        ctx.fillStyle = 'rgba(0,0,0,.22)';
        ctx.fillRect(0, 0, pack.c.width, 10);
        pack.tex.needsUpdate = true;
      }
      station.screen.material.emissiveIntensity = active ? (selected ? 1.45 : 1.08) : 0.25;
      station.glow.visible = active;
      station.glow.material.opacity = selected ? 0.42 : 0.22;
      const gk = selected ? 1.25 : 1.0;
      station.glow.scale.set(1.7 * gk, 1.2 * gk, 1);
      if (station.bezel?.material?.emissiveIntensity !== undefined) {
        station.bezel.material.emissiveIntensity = selected ? 0.92 : active ? 0.62 : 0.22;
      }
      if (station.shell?.material?.emissiveIntensity !== undefined) {
        station.shell.material.emissiveIntensity = selected ? 0.45 : 0.18;
      }
    }
  }

  updateMeta() {
    const station = this.stations[this.selected];
    const status = station.data.activo ? 'Encendida' : 'Próximamente';
    ui.stationName.textContent = station.data.titulo;
    ui.stationState.textContent = station.data.activo ? 'Estación lista' : 'Estación apagada';
    ui.stationHint.textContent = station.data.activo
      ? `Pulsa Entrar para cruzar al juego.`
      : `No se puede entrar todavía.`
    ;
    ui.title.textContent = 'Domo del valle';
    ui.meta.innerHTML = `Sala nocturna de la casa. <strong>${station.data.titulo}</strong> está ${status.toLowerCase()}. Usa flechas o arrastre para moverte entre las máquinas.`;
  }

  updateStationCard() {
    this.updateMeta();
  }

  syncChrome() {
    const gameOpen = this.mode === 'game';
    const alpha = gameOpen ? '0' : '1';
    ui.card.style.opacity = alpha;
    ui.card.style.pointerEvents = gameOpen ? 'none' : 'auto';
    ui.stationCard.style.opacity = alpha;
    ui.stationCard.style.pointerEvents = gameOpen ? 'none' : 'auto';
    ui.controls.style.opacity = alpha;
    ui.controls.style.pointerEvents = gameOpen ? 'none' : 'auto';
    ui.controls.style.transform = gameOpen ? 'translateY(12px)' : 'translateY(0)';
    if (gameOpen) ui.backBtn.classList.add('show');
  }

  resize() {
    const w = window.innerWidth;
    const h = window.innerHeight;
    const dpr = Math.min(window.devicePixelRatio || 1, 1.0);
    this.renderer.setPixelRatio(dpr);
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.compositor.resize(w, h, dpr);
  }

  moveSelection(dir) {
    if (this.mode !== 'room') return;
    const n = this.stations.length;
    const prev = this.selected;
    this.selected = (this.selected + dir + n) % n;
    // redibujar de inmediato la que entra y la que sale de seleccion
    this.screenInit?.delete(prev);
    this.screenInit?.delete(this.selected);
    this.renderer.shadowMap.needsUpdate = true;
    this.updateStationCard();
    this.pulseToast(`Estación: ${this.stations[this.selected].data.titulo}`);
  }

  pulseToast(text) {
    ui.toast.textContent = text;
    ui.toast.classList.add('show');
    clearTimeout(this.toastTimer);
    this.toastTimer = window.setTimeout(() => ui.toast.classList.remove('show'), 1100);
  }

  onKeyDown(e) {
    if (this.mode === 'game') {
      if (e.key === 'Escape') {
        e.preventDefault();
        this.closeGame();
      }
      return;
    }
    if (e.key === 'ArrowLeft') { e.preventDefault(); this.moveSelection(-1); }
    else if (e.key === 'ArrowRight') { e.preventDefault(); this.moveSelection(1); }
    else if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); this.enterSelected(); }
    else if (e.key === 'Escape' && this.mode === 'game') { e.preventDefault(); this.closeGame(); }
  }

  onPointerDown(e) {
    if (this.mode !== 'room') return;
    this.dragging = true;
    this.pointerId = e.pointerId;
    this.dragStartX = e.clientX;
    this.dragStartY = e.clientY;
    this.dragLastX = e.clientX;
    this.pointerMoved = false;
    ui.canvas.setPointerCapture?.(e.pointerId);
  }

  onPointerMove(e) {
    if (!this.dragging || e.pointerId !== this.pointerId) return;
    const dx = e.clientX - this.dragStartX;
    const dy = e.clientY - this.dragStartY;
    this.dragLastX = e.clientX;
    if (Math.abs(dx) > 10 || Math.abs(dy) > 10) this.pointerMoved = true;
    if (Math.abs(dx) > 42 && Math.abs(dx) > Math.abs(dy) * 1.2) {
      this.dragStartX = e.clientX;
      this.moveSelection(dx < 0 ? 1 : -1);
    }
  }

  onPointerUp(e) {
    if (!this.dragging || e.pointerId !== this.pointerId) return;
    const dx = e.clientX - this.dragStartX;
    const dy = e.clientY - this.dragStartY;
    const tap = Math.hypot(dx, dy) < 12 && !this.pointerMoved;
    this.endDrag();
    if (tap) this.enterSelected();
  }

  endDrag() {
    this.dragging = false;
    this.pointerId = null;
  }

  enterSelected() {
    if (this.mode !== 'room') return;
    const station = this.stations[this.selected];
    if (!station.data.activo) {
      this.pulseToast('Esa estación dice "próximamente".');
      return;
    }
    if (!station.data.ruta) {
      this.pulseToast('No hay ruta para esta estación.');
      return;
    }
    if (this.mode === 'opening' || this.mode === 'closing') return;
    this.pendingOpen = station.data;
    this.mode = 'opening';
    this.activeRoute = station.data.ruta;
    this.updateBackButton();
    if (this.loadedFrameRoute === station.data.ruta) {
      this.beginOpeningTransition(station.data);
      return;
    }
    ui.frame.style.opacity = '1';
    ui.frame.style.pointerEvents = 'none';
    ui.frame.src = station.data.ruta;
    this.pulseToast(`Entrando a ${station.data.titulo}...`);
  }

  beginOpeningTransition(data) {
    this.pendingOpen = null;
    ui.frame.style.opacity = '1';
    ui.frame.style.pointerEvents = 'none';
    this.targetProgress = 1;
    this.mode = 'opening';
    this.openTarget = data;
    this.pulseToast(`Cruzando a ${data.titulo}...`);
    ui.backBtn.classList.add('show');
  }

  closeGame() {
    if (this.mode !== 'game') return;
    this.mode = 'closing';
    ui.canvas.classList.remove('hidden');
    ui.canvas.style.opacity = '1';
    ui.frame.style.pointerEvents = 'none';
    ui.backBtn.classList.remove('show');
    this.targetProgress = 0;
    this.pulseToast('Volviendo a la sala...');
  }

  updateBackButton() {
    if (this.mode === 'game') ui.backBtn.classList.add('show');
    else if (this.mode !== 'opening') ui.backBtn.classList.remove('show');
  }

  tick() {
    requestAnimationFrame((t) => this.tick(t * 0.001));
    const t = now();
    const dt = Math.min(t - this.lastTick, 0.033);
    this.lastTick = t;

    if (this.mode === 'opening' || this.mode === 'closing') {
      const dir = this.mode === 'opening' ? 1 : -1;
      this.progress = clamp(this.progress + dt * this.transitionSpeed * dir, 0, 1);
      if (this.mode === 'opening' && this.progress >= 0.999) {
        this.mode = 'game';
        ui.canvas.classList.add('hidden');
        ui.canvas.style.opacity = '0';
        ui.frame.style.pointerEvents = 'auto';
        ui.frame.focus?.();
        ui.backBtn.classList.add('show');
        this.syncChrome();
      } else if (this.mode === 'closing' && this.progress <= 0.001) {
        this.mode = 'room';
        ui.canvas.style.opacity = '1';
        ui.frame.style.pointerEvents = 'none';
        ui.frame.style.opacity = '0';
        this.syncChrome();
      }
    } else {
      this.progress = 0;
    }

    if (this.mode !== 'game') {
      this.animateRoom(t, dt);
      if (this.progress <= 0.002) {
        // sin transicion activa: render directo, sin pasar por el RT del compositor
        this.renderer.setRenderTarget(null);
        this.renderer.render(this.scene, this.camera);
      } else {
        this.compositor.render(this.scene, this.camera, this.progress, dt, t);
      }
      ui.canvas.style.opacity = this.progress > 0.97 ? String(1 - smoothstep(0.97, 1, this.progress)) : '1';
    }
  }

  animateRoom(t, dt) {
    this.updateScreenTextures(t);

    const station = this.stations[this.selected];
    const focus = this.mode === 'opening' ? smoothstep(0, 1, this.progress) : 0;

    // La camara vive dentro del domo: gira suave hacia la estacion elegida
    // dejando siempre aire arriba para que la cupula se lea entera.
    const targetYaw = Math.atan2(station.basePos.x, -station.basePos.z);
    let dYaw = targetYaw - this.camYaw;
    dYaw = Math.atan2(Math.sin(dYaw), Math.cos(dYaw));
    this.camYaw += dYaw * Math.min(1, dt * 2.6);
    const yaw = this.camYaw;

    const camBase = new THREE.Vector3(
      -Math.sin(yaw) * 1.05,
      1.78,
      3.55 + Math.cos(yaw) * 0.55
    );
    const camFocus = station.basePos.clone().multiplyScalar(0.42).setY(1.5);
    this.camera.position.lerpVectors(camBase, camFocus, focus * 0.85);
    this.camera.position.x += Math.sin(t * 0.32) * 0.045;
    this.camera.position.y += Math.sin(t * 0.62) * 0.025;

    const lookAmt = 0.5 + focus * 0.5;
    const look = new THREE.Vector3(
      station.basePos.x * lookAmt,
      2.12 - focus * 0.82,
      station.basePos.z * lookAmt
    );
    this.camera.lookAt(look);

    for (const s of this.stations) {
      const isSel = s.index === this.selected;
      const selMix = isSel ? 1 : 0;
      const breath = 1 + (isSel ? 0.05 : 0.0) * Math.sin(t * 2.4 + s.index);
      s.group.scale.setScalar(breath * (1 + selMix * 0.03));
      s.group.position.copy(s.basePos);
      s.group.position.y += isSel ? Math.sin(t * 2.2) * 0.015 : 0;
      if (isSel) {
        // la elegida da un pasito hacia el centro de la sala
        const toCenter = s.basePos.clone().multiplyScalar(-1).setY(0).normalize();
        s.group.position.addScaledVector(toCenter, 0.16);
      }
      s.screen.material.opacity = 1;
      s.screen.material.transparent = false;
      s.glow.material.opacity = isSel ? 0.4 : s.data.activo ? 0.22 : 0;
      if (s.light) {
        s.light.intensity = isSel ? 9 : 6;
      }
      if (s.shell?.material) {
        const base = s.data.activo ? 0.18 : 0.08;
        s.shell.material.emissiveIntensity = base + (isSel ? 0.18 : 0);
      }
    }

    // luz acompanante de la seleccion
    if (this.selLight) {
      const toCenter = station.basePos.clone().multiplyScalar(-1).setY(0).normalize();
      const want = station.basePos.clone().addScaledVector(toCenter, 1.0).setY(1.6);
      this.selLight.position.lerp(want, Math.min(1, dt * 4));
      this.selLight.intensity = station.data.activo ? 7 + Math.sin(t * 3.1) * 0.9 : 2.5;
    }

    // brasa de la estufa: respira
    if (this.stoveLight) {
      const flick = 0.72 + 0.28 * Math.sin(t * 7.3) * Math.sin(t * 3.1 + 1.7);
      this.stoveLight.intensity = 7 + flick * 5;
      if (this.stoveGlow) this.stoveGlow.material.emissiveIntensity = 1.7 + flick * 1.4;
    }

    // el foco del apice tiene un halo vivo
    if (this.flare) {
      this.flare.material.opacity = 0.78 + Math.sin(t * 1.7) * 0.06;
    }

    // polvo suspendido en la luz
    if (this.dust) {
      const arr = this.dust.geometry.attributes.position.array;
      for (let i = 0; i < arr.length; i += 3) {
        arr[i] += Math.sin(t * 0.4 + i) * 0.0006;
        arr[i + 1] -= dt * 0.055;
        if (arr[i + 1] < 0.25) arr[i + 1] = 4.55;
      }
      this.dust.geometry.attributes.position.needsUpdate = true;
    }

    if (this.mode === 'opening') {
      if (this.progress >= 0.999) {
        ui.frame.style.pointerEvents = 'auto';
        ui.backBtn.classList.add('show');
      }
    }
    if (this.mode === 'closing') {
      if (this.progress <= 0.001) {
        ui.backBtn.classList.remove('show');
      }
    }
  }
}

new SalaApp();
