#!/usr/bin/env node
/**
 * gate-clima-2d.mjs — GATE visual y de datos de la página del tiempo canónica
 * (spec Chagra-strategy/ops/specs/2026-09-06-unificar-2d-clima, CA-1..CA-11).
 *
 * Captura con GPU REAL: headed sobre la sesión X viva (DISPLAY/XAUTHORITY
 * leídos del entorno de plasmashell, como hace shot3d) o, si no hay X, EGL
 * headless sobre la NVIDIA. Nunca swiftshader sin decirlo.
 *
 * Uso:
 *   node _gate/clima-2d-canonica/gate-clima-2d.mjs --base http://localhost:5210 --out _gate/clima-2d-canonica/despues [--modo estados|boton|hoy|iframe|todo]
 *
 * Todo lo que mide lo vuelca CRUDO a <out>/gate-resultados.json y a stdout.
 * No certifica nada: el operador juzga sobre las capturas.
 */
import { chromium } from 'playwright-core';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { execSync, spawnSync } from 'node:child_process';
import sharp from 'sharp';

const args = process.argv.slice(2);
const opt = (name, def) => { const i = args.indexOf(name); return i >= 0 ? args[i + 1] : def; };
const BASE = opt('--base', 'http://localhost:5210');
const OUT = path.resolve(opt('--out', '_gate/clima-2d-canonica/despues'));
const MODO = opt('--modo', 'todo');
const CHROMIUM = path.join(os.homedir(), '.local', 'bin', 'chromium');
fs.mkdirSync(OUT, { recursive: true });

const resultados = { base: BASE, fecha: new Date().toISOString(), gpu: null, capturas: [], ca1: null, ca2: [], ca3: [], ca4: null, ca6: null, ca7: null, ca9: [], ca11: null, defectosVistos: [] };
const log = (...a) => console.log('[gate-clima-2d]', ...a);

/* ── sesión X (copia del criterio de shot3d: cookie que EXISTE y es legible) ── */
function detectarX() {
  if (process.env.XAUTHORITY && fs.existsSync(process.env.XAUTHORITY)) return { DISPLAY: process.env.DISPLAY || ':0', XAUTHORITY: process.env.XAUTHORITY };
  let pids = [];
  for (const patron of ['plasmashell', 'kwin_x11']) {
    const r = spawnSync('pgrep', ['-f', patron], { encoding: 'utf8' });
    if (r.stdout) pids.push(...r.stdout.split('\n').filter(Boolean));
  }
  for (const pid of pids) {
    let env = '';
    try { env = fs.readFileSync(`/proc/${pid}/environ`, 'utf8'); } catch (_) {
      try { env = execSync(`sudo -n cat /proc/${pid}/environ`, { encoding: 'latin1' }); } catch (__) { continue; }
    }
    const vars = Object.fromEntries(env.split('\0').filter((l) => l.includes('=')).map((l) => { const i = l.indexOf('='); return [l.slice(0, i), l.slice(i + 1)]; }));
    if (vars.XAUTHORITY && fs.existsSync(vars.XAUTHORITY)) return { DISPLAY: vars.DISPLAY || ':0', XAUTHORITY: vars.XAUTHORITY, pid };
  }
  return null;
}

const GPU_ARGS = ['--no-sandbox', '--disable-dev-shm-usage', '--ignore-gpu-blocklist', '--enable-webgl',
  '--disable-backgrounding-occluded-windows', '--disable-renderer-backgrounding', '--disable-background-timer-throttling',
  '--disable-features=CalculateNativeWinOcclusion', '--window-position=0,0'];
const EGL_ARGS = ['--use-gl=angle', '--use-angle=gl-egl', ...GPU_ARGS];

async function lanzar() {
  const x = detectarX();
  let headed = false;
  if (x) { process.env.DISPLAY = x.DISPLAY; process.env.XAUTHORITY = x.XAUTHORITY; headed = true; log(`X viva: DISPLAY=${x.DISPLAY} (pid ${x.pid || 'env'}) → HEADED GPU real`); }
  else log('sin sesión X → EGL headless (GPU real NVIDIA, sin X)');
  const browser = await chromium.launch({ executablePath: CHROMIUM, headless: !headed, args: headed ? GPU_ARGS : EGL_ARGS });
  resultados.gpu = { modo: headed ? 'headed-X' : 'egl-headless' };
  return browser;
}

/* ── sesión de la app: mismo patrón que tests/visual/finca-viva-temas.spec.js ── */
const USER = 'gate-clima-2d';
const PERFIL_GUATAVITA = {
  rol: 'campesino', vocacion: 'mixta', finca_tipo: 'integral', nivel_respuestas: 'simple',
  nombre: 'Rosa', vereda: 'El Volador', municipio: 'Guatavita', departamento: 'Cundinamarca',
  ubicacion_lat: 4.9345, ubicacion_lng: -73.8331, finca_altitud: 2680, piso_termico: 'frio',
  cultivos_actuales: 'papa, mora',
};

async function mocks(context) {
  await context.route('**/oauth/token', (r) => r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ access_token: 'gate-token', refresh_token: 'gate-refresh', token_type: 'Bearer', expires_in: 3600 }) }));
  const vacio = JSON.stringify({ data: [], jsonapi: { version: '1.0' } });
  for (const p of ['**/api/asset/**', '**/api/log/**', '**/api/taxonomy_term/**', '**/api/user/**', '**/api/quantity/**', '**/api/plan/**']) {
    await context.route(p, (r) => r.fulfill({ status: 200, contentType: 'application/vnd.api+json', body: vacio }));
  }
  await context.route('**/fincas-publicas.json', (r) => r.fulfill({ status: 200, contentType: 'application/json', body: '[]' }));
  await context.route('**/api/ollama/**', (r) => r.fulfill({ status: 200, contentType: 'application/json', body: '{"models":[]}' }));
  await context.route('**/api/kokoro/**', (r) => r.fulfill({ status: 503, body: '' }));
}

async function sembrar(context, { conUbicacion = true } = {}) {
  const perfil = conUbicacion ? PERFIL_GUATAVITA : { rol: 'campesino', vocacion: 'mixta', finca_tipo: 'integral', nivel_respuestas: 'simple' };
  await context.addInitScript(({ username, perfil }) => {
    try {
      localStorage.setItem('chagra:active_tenant_id', username);
      localStorage.setItem('chagra:theme', 'nature');
      localStorage.setItem('chagra:bienvenida-vista:v1', '1');
      localStorage.setItem('chagra:profile:v1', JSON.stringify(perfil));
      localStorage.setItem(`chagra:profile:v1:${username}`, JSON.stringify(perfil));
    } catch (_) { /* noop */ }
  }, { username: USER, perfil });
}

async function login(page) {
  await page.evaluate(async (username) => {
    const authMod = await import('/src/services/authService.js');
    const r = await authMod.authenticateUser(username, 'gate-pwd');
    if (!r.success) throw new Error(`login mock falló: ${r.error || 'sin detalle'}`);
    const tenantMod = await import('/src/services/tenantContext.js');
    tenantMod.setActiveTenantId(username);
  }, USER);
}

function trackErrores(page) {
  const errores = { pageErrors: [], consoleErrors: [], requestFailures: [] };
  page.on('pageerror', (e) => errores.pageErrors.push(e.message));
  page.on('console', (m) => { if (m.type() === 'error') errores.consoleErrors.push(m.text().slice(0, 300)); });
  page.on('requestfailed', (r) => { const t = r.failure()?.errorText; if (t && t !== 'net::ERR_ABORTED') errores.requestFailures.push(`${r.url().slice(0, 120)} ${t}`); });
  return errores;
}

const CONTAR = `(() => { const q = (s) => document.querySelectorAll(s).length; return {
  cielos: q('.ca-cielo'), estrellas: q('.ca-estrella'), gotas: q('.ca-gota'), bancos: q('.ca-banco'), jirones: q('.ca-jiron'),
  motas: q('.ca-mota'), luciernagas: q('.ca-luci'), rayos: q('.ca-rayos path'), montes: q('.ca-monte'), frailejones: q('.ca-frailejon'),
  hojas: q('.ca-hoja'), grades: q('.ca-grade'), scrims: q('.ca-scrim'), vineta: q('.ca-vineta'), jironUI: q('.ca-jiron-ui'),
  astro: q('.ca-astro'), laderaLuz: q('.ca-ladera-luz'), bruma: q('.ca-bruma'), suelo: q('.ca-suelo'), pasto: q('.ca-pasto'),
  nubes: q('.ca-nube'), rotura: q('.ca-nube-rotura') }; })()`;

const OPACIDADES = `(() => { const o = (s) => { const el = document.querySelector(s); return el ? Number(getComputedStyle(el).opacity) : null; };
  return { root: (() => { const r = document.querySelector('.ca-root'); return r ? { clima: r.getAttribute('data-clima'), luz: r.getAttribute('data-luz'), enso: r.getAttribute('data-enso'), forzado: r.getAttribute('data-forzado') } : null; })(),
    html: { clima: document.documentElement.getAttribute('data-clima'), luz: document.documentElement.getAttribute('data-luz'), enso: document.documentElement.getAttribute('data-enso') },
    'ca-capa--nubes': o('.ca-capa--nubes'), 'ca-cielo--nublado': o('.ca-cielo--nublado'), 'ca-capa--lluvia': o('.ca-capa--lluvia'), 'ca-capa--luci': o('.ca-capa--luci'),
    'ca-capa--niebla': o('.ca-capa--niebla'), 'ca-capa--estrellas': o('.ca-capa--estrellas'), 'ca-capa--polvo': o('.ca-capa--polvo'), 'ca-rayos': o('.ca-rayos'), 'ca-jiron-ui': o('.ca-jiron-ui') }; })()`;

/* luminancia relativa WCAG de un rgb */
const lum = ([r, g, b]) => { const f = (c) => { const s = c / 255; return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4; }; return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b); };
const ratio = (l1, l2) => { const [hi, lo] = l1 > l2 ? [l1, l2] : [l2, l1]; return (hi + 0.05) / (lo + 0.05); };
function parseColor(css) { const m = css && css.match(/rgba?\(([^)]+)\)/); if (!m) return null; const p = m[1].split(',').map((x) => parseFloat(x)); return [p[0], p[1], p[2]]; }

/** Contraste medido: color computado del texto vs. luminancia del fondo REAL
 *  detrás de su caja (captura con el texto oculto). Reporta media y el decil
 *  más adverso (el fondo más parecido al texto) — sin contar el halo. */
async function medirContraste(page, dpr, etiqueta) {
  const objetivos = ['clima-migaja', 'clima-saludo', 'clima-temp', 'clima-condicion', 'clima-se-siente'];
  const cajas = await page.evaluate((ids) => ids.map((id) => { const el = document.querySelector(`[data-testid="${id}"]`); if (!el) return null; const r = el.getBoundingClientRect(); return { id, x: r.x, y: r.y, w: r.width, h: r.height, color: getComputedStyle(el).color }; }).filter(Boolean), objetivos);
  await page.evaluate(() => { document.querySelectorAll('.ca-cabecera, .ca-cifra-grande').forEach((el) => { el.style.visibility = 'hidden'; }); });
  await page.waitForTimeout(80);
  const png = await page.screenshot({ type: 'png' });
  await page.evaluate(() => { document.querySelectorAll('.ca-cabecera, .ca-cifra-grande').forEach((el) => { el.style.visibility = ''; }); });
  const img = sharp(png);
  const meta = await img.metadata();
  const raw = await img.raw().toBuffer();
  const ch = meta.channels;
  const filas = [];
  for (const c of cajas) {
    const col = parseColor(c.color); if (!col) continue;
    const x0 = Math.max(0, Math.floor(c.x * dpr)), y0 = Math.max(0, Math.floor(c.y * dpr));
    const x1 = Math.min(meta.width, Math.ceil((c.x + c.w) * dpr)), y1 = Math.min(meta.height, Math.ceil((c.y + c.h) * dpr));
    const ls = [];
    for (let y = y0; y < y1; y += 2) for (let x = x0; x < x1; x += 2) { const i = (y * meta.width + x) * ch; ls.push(lum([raw[i], raw[i + 1], raw[i + 2]])); }
    if (!ls.length) continue;
    ls.sort((a, b) => a - b);
    const media = ls.reduce((a, b) => a + b, 0) / ls.length;
    const lt = lum(col);
    const textoOscuro = lt < 0.18;
    const adverso = textoOscuro ? ls[Math.floor(ls.length * 0.1)] : ls[Math.floor(ls.length * 0.9)];
    filas.push({ estado: etiqueta, elemento: c.id, color: c.color, ratioMedia: +ratio(lt, media).toFixed(2), ratioDecilAdverso: +ratio(lt, adverso).toFixed(2), muestras: ls.length });
  }
  return filas;
}

async function abrirTiempo(context, { search = '', ruta = '#/tiempo', publico = false, viewport, dpr = 1, reduced = false } = {}) {
  const page = await context.newPage();
  const errores = trackErrores(page);
  if (reduced) await page.emulateMedia({ reducedMotion: 'reduce' });
  if (publico) {
    await page.goto(`${BASE}/${search}${ruta}`, { waitUntil: 'domcontentloaded' });
  } else {
    await page.goto(`${BASE}/`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(800);
    await login(page);
    // navegación COMPLETA tras el login (mismo patrón que finca-viva-temas.spec):
    // con `?` vacío la URL cambia y el boot vuelve a correr con el token puesto.
    await page.goto(`${BASE}/${search || '?'}${ruta}`, { waitUntil: 'domcontentloaded' });
  }
  await page.waitForSelector('[data-testid="escena-atmosfera-root"]', { timeout: 60_000 });
  // dato real: espera la cifra o el estado honesto (sin ubicación)
  await page.waitForSelector('[data-testid="clima-cifra-grande"], [data-testid="clima-sin-dato"]', { timeout: 60_000 });
  await page.waitForTimeout(2600); // transición de piel (--ca-lento 1.8 s) + fuentes
  return { page, errores };
}

async function capturar(page, nombre, extra = {}) {
  const ruta = path.join(OUT, `${nombre}.png`);
  await page.screenshot({ path: ruta, fullPage: false });
  resultados.capturas.push({ nombre, ruta, ...extra });
  log('captura', ruta);
  return ruta;
}

/* ── MODO estados: 16 combos + sin dato, móvil y escritorio ── */
async function modoEstados(browser) {
  const CLIMAS = ['despejado', 'nublado', 'lluvia', 'niebla'];
  const LUCES = ['dia', 'amanecer', 'atardecer', 'noche'];
  // --estados nublado-dia,despejado-noche → subconjunto (iteración rápida); sin él, los 16 + extras
  const SOLO = opt('--estados', '') ? new Set(opt('--estados', '').split(',')) : null;
  const soloMovil = SOLO && opt('--solo-movil', '1') === '1';
  for (const [vp, dpr, tag] of [[{ width: 390, height: 844 }, 2, 'movil'], [{ width: 1280, height: 800 }, 1, 'escritorio']]) {
    for (const clima of CLIMAS) {
      for (const luz of LUCES) {
        if (SOLO && !SOLO.has(`${clima}-${luz}`)) continue;
        if (SOLO && soloMovil && tag === 'escritorio') continue;
        if (tag === 'escritorio' && !(luz === 'dia' || (clima === 'despejado' && luz === 'noche') || (clima === 'nublado' && luz === 'atardecer'))) continue; // escritorio: muestra representativa
        const context = await browser.newContext({ viewport: vp, deviceScaleFactor: dpr, locale: 'es-CO', timezoneId: 'America/Bogota', isMobile: tag === 'movil', hasTouch: tag === 'movil' });
        await mocks(context); await sembrar(context);
        const { page, errores } = await abrirTiempo(context, { search: `?clima=${clima}&luz=${luz}`, ruta: '#/mockups/clima-atmosfera', publico: true, viewport: vp, dpr });
        const etiqueta = `${clima}-${luz}`;
        const conteo = await page.evaluate(CONTAR);
        const op = await page.evaluate(OPACIDADES);
        resultados.ca3.push({ estado: etiqueta, vista: tag, conteo });
        resultados.ca2.push({ estado: etiqueta, vista: tag, ...op });
        if (tag === 'movil') resultados.ca9.push(...await medirContraste(page, dpr, etiqueta));
        await capturar(page, `${tag}-${etiqueta}`, { estado: etiqueta, vista: tag, errores });
        await context.close();
      }
    }
  }
  if (SOLO) return; // iteración rápida: sin los extras
  // sin dato (CA-6): sin ubicación en el perfil, sin override
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, locale: 'es-CO', timezoneId: 'America/Bogota', isMobile: true, hasTouch: true });
  await mocks(context); await sembrar(context, { conUbicacion: false });
  const { page, errores } = await abrirTiempo(context, { ruta: '#/mockups/clima-atmosfera', publico: true, dpr: 2 });
  resultados.ca6 = { html: await page.evaluate(() => ({ clima: document.documentElement.getAttribute('data-clima'), luz: document.documentElement.getAttribute('data-luz'), enso: document.documentElement.getAttribute('data-enso') })), root: (await page.evaluate(OPACIDADES)).root, sinDato: await page.$eval('[data-testid="clima-sin-dato"]', (el) => el.innerText).catch(() => null), errores };
  await capturar(page, 'movil-sin-ubicacion', { errores });
  await context.close();
  // reduced motion (CA-8b): lluvia con prefers-reduced-motion
  const c2 = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, locale: 'es-CO', timezoneId: 'America/Bogota', isMobile: true, hasTouch: true });
  await mocks(c2); await sembrar(c2);
  const r2 = await abrirTiempo(c2, { search: '?clima=lluvia&luz=dia', ruta: '#/mockups/clima-atmosfera', publico: true, dpr: 2, reduced: true });
  const anim = await r2.page.evaluate(() => Array.from(document.querySelectorAll('.ca-gota, .ca-nube, .ca-banco')).slice(0, 5).map((el) => getComputedStyle(el).animationName));
  resultados.reducedMotion = { animationName: anim, errores: r2.errores };
  await capturar(r2.page, 'movil-lluvia-dia-reduced-motion', { errores: r2.errores });
  await c2.close();
}

/* ── MODO botón (CA-1): home con la flag → toca «El tiempo» → primera pantalla ── */
async function modoBoton(browser) {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, locale: 'es-CO', timezoneId: 'America/Bogota', isMobile: true, hasTouch: true });
  await mocks(context); await sembrar(context);
  const page = await context.newPage();
  const errores = trackErrores(page);
  await page.goto(`${BASE}/`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(800);
  await login(page);
  await page.goto(`${BASE}/?`, { waitUntil: 'domcontentloaded' });
  await page.waitForLoadState('networkidle').catch(() => {});
  await page.waitForSelector('[data-testid="finca-viva-puertas"]', { timeout: 60_000 });
  await page.waitForTimeout(1500);
  await capturar(page, 'home-antes-de-tocar', { errores });
  const puertas = await page.$$eval('[data-testid="finca-viva-puertas"] button', (bs) => bs.map((b) => b.getAttribute('aria-label')));
  const btn = await page.$('[data-testid="finca-viva-puertas"] button[aria-label^="El tiempo"]');
  if (!btn) throw new Error(`no hay puerta «El tiempo»: ${JSON.stringify(puertas)}`);
  await btn.click();
  await page.waitForSelector('[data-testid="clima-boletin-screen"]', { timeout: 60_000 });
  await page.waitForSelector('[data-testid="clima-cifra-grande"], [data-testid="clima-sin-dato"]', { timeout: 60_000 });
  await page.waitForTimeout(2600);
  const primera = await page.evaluate(() => {
    const vh = window.innerHeight;
    const ver = (id) => { const el = document.querySelector(`[data-testid="${id}"]`); if (!el) return null; const r = el.getBoundingClientRect(); return { texto: el.innerText.slice(0, 80), top: Math.round(r.top), bottom: Math.round(r.bottom), visibleSinScroll: r.top >= 0 && r.bottom <= vh }; };
    return { vh, hash: location.hash, migaja: ver('clima-migaja'), condicion: ver('clima-condicion'), temp: ver('clima-temp'), seSiente: ver('clima-se-siente'), lectura: ver('clima-lectura-cielo'), tabs: ver('horizonte-tab-hoy') };
  });
  resultados.ca1 = { puertas, primera, errores };
  await capturar(page, 'movil-tras-tocar-el-tiempo-CA1', { errores });
  await context.close();
}

/* ── MODO hoy (CA-4, CA-5, CA-7): texto crudo de las tres pestañas con dato real ── */
async function modoHoy(browser) {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, locale: 'es-CO', timezoneId: 'America/Bogota', isMobile: true, hasTouch: true });
  await mocks(context); await sembrar(context);
  const { page, errores } = await abrirTiempo(context, { ruta: '#/tiempo', publico: false, dpr: 2 });
  const texto = {};
  const leer = () => page.$eval('[data-testid="clima-boletin-screen"]', (el) => el.innerText);
  texto.hoy = await leer();
  await capturar(page, 'movil-dato-real-hoy', { errores });
  // scroll completo de HOY en tramos
  const alto = await page.evaluate(() => { const m = document.querySelector('.screen-shell-f2-main, main'); return { sh: m.scrollHeight, ch: m.clientHeight }; });
  for (let i = 1, y = alto.ch; y < alto.sh && i < 6; i += 1, y += alto.ch) {
    await page.evaluate((yy) => { const m = document.querySelector('.screen-shell-f2-main, main'); m.scrollTo(0, yy); }, y);
    await page.waitForTimeout(400);
    await capturar(page, `movil-dato-real-hoy-scroll-0${i}`, { errores });
  }
  await page.evaluate(() => { const m = document.querySelector('.screen-shell-f2-main, main'); m.scrollTo(0, 0); });
  await page.click('[data-testid="horizonte-tab-semana"]'); await page.waitForTimeout(1200);
  texto.semana = await leer(); await capturar(page, 'movil-dato-real-semana', { errores });
  await page.click('[data-testid="horizonte-tab-estacional"]'); await page.waitForTimeout(1200);
  texto.estacional = await leer(); await capturar(page, 'movil-dato-real-elnino', { errores });
  await page.click('[data-testid="horizonte-tab-hoy"]'); await page.waitForTimeout(600);
  // desktop con dato real
  const LECTURAS = [
    ['Condición + emoji', /Despejado|Casi despejado|Parcialmente nublado|Nublado|Neblina|Llovizna|Lluvia|Aguaceros|Tormenta/],
    ['Fase ENSO', /Fase (Neutral|El Niño|La Niña)/i], ['Temperatura', /\d+°C/], ['Se siente como', /Se siente como \d+ °C/],
    ['Anomalía térmica', /sobre lo normal|bajo lo normal|más (frío|cálido)|°C (más|menos)|normales en camino/i], ['Anomalía de humedad', /más (húmedo|seco)|normales en camino/i],
    ['Humedad', /Humedad\s*\d+\s*%/i], ['Punto de rocío', /Rocío a -?\d+°C/i], ['UV máximo', /Rayos UV\s*\d+/i], ['Lluvia hoy', /Lluvia hoy\s*[\d.,]+\s*mm/i],
    ['Probabilidad de lluvia', /\d+% de probabilidad/i], ['ETo', /ETo \(referencia\)\s*[\d.,]+\s*mm/i], ['VPD', /Sed del aire \(VPD\)\s*[\d.,]+\s*kPa/i],
    ['Amplitud térmica', /Amplitud térmica\s*[\d.,]+\s*°C/i], ['Horas-frío', /Horas-frío\s*\d+\s*h/i], ['SPI', /SPI de lluvia\s*-?[\d.,]+/i], ['SPEI', /SPEI de balance\s*-?[\d.,]+/i],
  ];
  const lecturas = LECTURAS.map(([n, re]) => ({ lectura: n, presente: re.test(texto.hoy) }));
  const MUESTRA = ['doña Rosa', 'Finca La Esperanza', 'DATOS DE MUESTRA', 'Datos de muestra', '10:40 a. m.', '3:15 p. m.', '6:50 a. m.', '5:48 p. m.', '9:30 p. m.'];
  const todo = `${texto.hoy}\n${texto.semana}\n${texto.estacional}`;
  const ca5 = MUESTRA.filter((m) => todo.includes(m));
  const tuteos = [];
  const re = /\b(tu|tú|tus|te|ti|imagina|mira|cuéntame|tenés|podés|querés|vos)\b/gi;
  let m; while ((m = re.exec(todo))) tuteos.push(`…${todo.slice(Math.max(0, m.index - 40), m.index + 40).replace(/\n/g, ' ')}…`);
  resultados.ca4 = { lecturas, faltan: lecturas.filter((l) => !l.presente).map((l) => l.lectura), textoHoy: texto.hoy, textoSemana: texto.semana, textoEstacional: texto.estacional, errores };
  resultados.ca5 = { cadenasEnDom: ca5 };
  resultados.ca7 = { coincidencias: tuteos };
  await context.close();
  const c2 = await browser.newContext({ viewport: { width: 1280, height: 800 }, deviceScaleFactor: 1, locale: 'es-CO', timezoneId: 'America/Bogota' });
  await mocks(c2); await sembrar(c2);
  const r2 = await abrirTiempo(c2, { ruta: '#/tiempo', publico: false });
  await capturar(r2.page, 'escritorio-dato-real-hoy', { errores: r2.errores });
  await c2.close();
}

/* ── MODO iframe (CA-11): el marco de producción (copia leída de ~/demos/3d) con la escena nueva ── */
async function modoIframe(browser) {
  const marcoBase = opt('--marco', 'http://localhost:5211');
  const context = await browser.newContext({ viewport: { width: 1280, height: 800 }, deviceScaleFactor: 1, locale: 'es-CO', timezoneId: 'America/Bogota' });
  await mocks(context); await sembrar(context);
  const page = await context.newPage();
  const errores = trackErrores(page);
  await page.goto(`${marcoBase}/el-tiempo/`, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('iframe.mkEscena', { timeout: 30_000 });
  const frame = page.frames().find((f) => f.url().includes('clima-atmosfera'));
  let dentro = null;
  if (frame) {
    await frame.waitForSelector('[data-testid="clima-boletin-screen"]', { timeout: 60_000 });
    await frame.waitForSelector('[data-testid="clima-cifra-grande"], [data-testid="clima-sin-dato"]', { timeout: 60_000 });
    await page.waitForTimeout(2600);
    dentro = await frame.evaluate(() => ({ hash: location.hash, root: (() => { const r = document.querySelector('.ca-root'); return r ? { clima: r.getAttribute('data-clima'), luz: r.getAttribute('data-luz') } : null; })(), temp: document.querySelector('[data-testid="clima-temp"]')?.innerText || null, sinDato: document.querySelector('[data-testid="clima-sin-dato"]')?.innerText || null }));
  }
  resultados.ca11 = { frameUrl: frame?.url() || null, dentro, errores };
  await capturar(page, 'escritorio-mundo-el-tiempo-iframe-CA11', { errores });
  await context.close();
}

const browser = await lanzar();
const MODOS = { estados: modoEstados, boton: modoBoton, hoy: modoHoy, iframe: modoIframe };
const pedidos = MODO === 'todo' ? ['estados', 'boton', 'hoy'] : MODO.split(',');
resultados.errores = {};
try {
  for (const m of pedidos) {
    try {
      await MODOS[m](browser);
    } catch (e) {
      resultados.errores[m] = String(e && e.stack || e);
      console.error(`[gate-clima-2d] ERROR en modo ${m}`, e);
      try {
        for (const ctx of browser.contexts()) {
          for (const pg of ctx.pages()) {
            const ruta = path.join(OUT, `debug-fallo-${m}-${Date.now()}.png`);
            await pg.screenshot({ path: ruta }); console.error('[gate-clima-2d] captura de depuración', ruta, pg.url());
          }
          await ctx.close().catch(() => {});
        }
      } catch (_) { /* nada */ }
    }
  }
} finally {
  await browser.close();
  const previo = fs.existsSync(path.join(OUT, 'gate-resultados.json')) ? JSON.parse(fs.readFileSync(path.join(OUT, 'gate-resultados.json'), 'utf8')) : {};
  const fusion = { ...previo, ...Object.fromEntries(Object.entries(resultados).filter(([k, v]) => !(Array.isArray(v) && v.length === 0) && v != null)) };
  fs.writeFileSync(path.join(OUT, 'gate-resultados.json'), JSON.stringify(fusion, null, 2));
  log('resultados →', path.join(OUT, 'gate-resultados.json'));
}
