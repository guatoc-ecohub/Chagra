// captura-nublado.mjs — gate headed (GPU real) de la piel del boletín 2D de clima.
//
// Uso (siempre a través de con-x.sh para heredar la sesión X):
//   ./con-x.sh node captura-nublado.mjs --port 5390 --out ./antes --clima nublado --luz dia [--fps] [--dpr 2]
//
// Qué hace: login E2E con OAuth falso (misma receta que tests/offline.spec.js), siembra un
// perfil con ubicación de páramo, abre `/?clima=X&luz=Y#/clima-boletin`, captura el cuadro
// completo a 390×844, vuelca opacidades de las capas de la escena, mide fps (rAF, 4 s, con la
// ventana al frente) y calcula el contraste REAL del texto de cabecera y de la cifra grande
// contra los píxeles que tienen detrás (se oculta el texto y se muestrea la captura).
import { chromium } from '/home/kortux/Workspace/chagra/node_modules/playwright/index.mjs';
import { createRequire } from 'node:module';
const sharp = createRequire(import.meta.url)('/home/kortux/Workspace/chagra/node_modules/sharp/dist/index.cjs');
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

const args = process.argv.slice(2);
const opt = (k, d) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : d; };
const PORT = opt('--port', '5390');
const OUT = path.resolve(opt('--out', './capturas'));
const CLIMA = opt('--clima', 'nublado');
const LUZ = opt('--luz', 'dia');
const DPR = Number(opt('--dpr', '2'));
const WAIT = Number(opt('--wait-ms', '7000'));
const MEDIR_FPS = args.includes('--fps');
const HEADED = !args.includes('--headless');
fs.mkdirSync(OUT, { recursive: true });

const CHROMIUM = path.join(os.homedir(), '.local', 'bin', 'chromium');
const gpuArgs = [
  '--no-sandbox', '--disable-dev-shm-usage', '--ignore-gpu-blocklist', '--enable-webgl',
  '--disable-backgrounding-occluded-windows', '--disable-renderer-backgrounding',
  '--disable-background-timer-throttling', '--disable-features=CalculateNativeWinOcclusion',
  '--window-position=0,0',
];

const PERFIL = {
  nombre: 'Finca de prueba',
  municipio: 'Guatavita, Cundinamarca',
  departamento: 'Cundinamarca',
  vereda: 'Páramo alto',
  ubicacion_lat: 4.935,
  ubicacion_lng: -73.833,
  finca_altitud: 2900,
  piso_termico: 'páramo',
  cultivos_actuales: 'papa, mora',
};

const tag = `${CLIMA}-${LUZ}${args.includes('--reducido') ? '-reducido' : ''}`;
const log = (...m) => console.log(`[captura ${tag}]`, ...m);

const browser = await chromium.launch({ executablePath: CHROMIUM, headless: !HEADED, args: gpuArgs });
const VIDEO = args.includes('--video');
const REDUCIDO = args.includes('--reducido');
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: DPR,
  ...(REDUCIDO ? { reducedMotion: 'reduce' } : {}),
  ...(VIDEO ? { recordVideo: { dir: path.join(OUT, 'video-raw'), size: { width: 390, height: 844 } } } : {}) });
await ctx.route('**/oauth/token', (route) => route.fulfill({
  status: 200, contentType: 'application/json',
  headers: { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' },
  body: JSON.stringify({ access_token: 'e2e-fake-access', refresh_token: 'e2e-fake-refresh', expires_in: 3600, token_type: 'Bearer' }),
}));
// farmOS vivo en :8081 devuelve 401 al token falso y la app cierra sesión: se mockea
// la API JSON:API a vacío (misma receta del spec). El sidecar MCP y Open-Meteo pasan.
await ctx.route('**/api/**', (route) => {
  const u = route.request().url();
  if (/\/api\/(mcp|whisper|kokoro|ollama|ha)\//.test(u)) return route.continue();
  return route.fulfill({ status: 200, contentType: 'application/vnd.api+json', body: JSON.stringify({ data: [] }) });
});
await ctx.addInitScript((perfil) => {
  const ls = window.localStorage;
  ls.setItem('chagra:profile:done:v1:e2e-operator', '1');
  ls.setItem('chagra:profile:done:v1', '1');
  ls.setItem('chagra:profile:v1:e2e-operator', JSON.stringify(perfil));
  ls.setItem('chagra:profile:v1', JSON.stringify(perfil));
}, PERFIL);

const page = await ctx.newPage();
const pageErrors = []; const consoleErrors = [];
page.on('pageerror', (e) => pageErrors.push(String(e.message).slice(0, 200)));
page.on('console', (m) => { if (m.type() === 'error') consoleErrors.push(m.text().slice(0, 200)); });

const BASE = `http://localhost:${PORT}`;
await page.goto(`${BASE}/#login`, { waitUntil: 'domcontentloaded', timeout: 60000 });
await page.getByLabel(/usuario/i).waitFor({ state: 'visible', timeout: 90000 });
await page.getByLabel(/usuario/i).fill('e2e-operator');
await page.getByRole('textbox', { name: /contraseña/i }).fill('e2e-pass');
const redMeteo = [];
page.on('response', (r) => { if (/open-meteo/.test(r.url())) redMeteo.push(`${r.status()} ${r.url().slice(0, 90)}`); });
page.on('requestfailed', (r) => { if (/open-meteo/.test(r.url())) redMeteo.push(`FALLO ${r.failure()?.errorText} ${r.url().slice(0, 90)}`); });
await page.getByRole('button', { name: /ingresar/i }).click();
try {
  await page.getByText(/Saltar al contenido|Tareas pendientes|HOY EN SU FINCA/i).first().waitFor({ state: 'visible', timeout: 30000 });
  log('login OK (home visible)');
} catch {
  const txt = await page.evaluate(() => document.body.innerText.slice(0, 300));
  console.error('[captura] login NO llegó al home. Texto:', JSON.stringify(txt));
}
await page.waitForTimeout(1000);

await page.goto(`${BASE}/?clima=${CLIMA}&luz=${LUZ}#/clima-boletin`, { waitUntil: 'domcontentloaded', timeout: 60000 });
try {
  await page.locator('[data-testid="clima-boletin-screen"]').waitFor({ state: 'visible', timeout: 60000 });
} catch (e) {
  const dbg = path.join(OUT, `debug-${tag}.png`);
  await page.screenshot({ path: dbg });
  const info = await page.evaluate(() => ({ href: location.href, texto: document.body.innerText.slice(0, 400) }));
  console.error('[captura] la pantalla no apareció', JSON.stringify(info), 'debug:', dbg, 'pageErrors:', pageErrors, 'consoleErrors:', consoleErrors.slice(0, 5));
  await browser.close();
  process.exit(4);
}
await page.waitForTimeout(WAIT);
try { await page.bringToFront(); } catch { /* headless */ }

const shot = path.join(OUT, `${tag}.png`);
await page.screenshot({ path: shot });
log('captura', shot);

// ── Estado de la escena (opacidades computadas de las capas que decide el spec) ──
const estado = await page.evaluate(() => {
  const root = document.querySelector('.ca-atmosfera');
  const op = (sel) => { const el = document.querySelector(sel); return el ? getComputedStyle(el).opacity : 'ausente'; };
  const sels = ['.ca-cielo--nublado', '.ca-cielo--soleado', '.ca-cielo--noche', '.ca-capa--lluvia', '.ca-capa--luci',
    '.ca-capa--niebla', '.ca-capa--polvo', '.ca-rayos', '.ca-astro', '.ca-bruma', '.ca-grade--nublado',
    '.ca-capa--nubes', '.ca-techo', '.ca-claro', '.ca-nube'];
  const out = { 'data-clima': root?.dataset.clima, 'data-luz': root?.dataset.luz, opacidades: {} };
  for (const s of sels) out.opacidades[s] = op(s);
  out.nodosEscena = document.querySelectorAll('.ca-escena *').length;
  const claro = document.querySelector('.ca-claro'); const astro = document.querySelector('.ca-astro');
  out.claroBg = claro ? getComputedStyle(claro).backgroundImage.slice(0, 70) : 'ausente';
  out.astroTransform = astro ? getComputedStyle(astro).transform : 'ausente';
  out.capaZ = (() => { const c = document.querySelector('.ca-capa--nubes'); return c ? getComputedStyle(c).zIndex : 'ausente'; })();
  out.nubesCount = document.querySelectorAll('.ca-nube').length;
  out.animacionesCorriendo = document.getAnimations().filter((a) => a.playState === 'running').length;
  out.reducido = matchMedia('(prefers-reduced-motion: reduce)').matches;
  return out;
});
log('estado', JSON.stringify(estado));

// ── FPS (rAF 4 s, ventana al frente) ──
let fps = null; let renderer = null;
if (MEDIR_FPS) {
  await page.waitForTimeout(1200);
  fps = await page.evaluate(() => new Promise((res) => {
    let n = 0; const t0 = performance.now();
    const tick = () => { n++; if (performance.now() - t0 < 4000) requestAnimationFrame(tick); else res(+(n / ((performance.now() - t0) / 1000)).toFixed(1)); };
    requestAnimationFrame(tick);
  }));
  renderer = await page.evaluate(() => {
    try { const c = document.createElement('canvas'); const gl = c.getContext('webgl2') || c.getContext('webgl'); const d = gl && gl.getExtension('WEBGL_debug_renderer_info'); return d ? gl.getParameter(d.UNMASKED_RENDERER_WEBGL) : 'desconocido'; } catch { return 'desconocido'; }
  });
  log(`fps=${fps} renderer=${renderer}`);
}

// ── Contraste real: texto vs píxeles detrás (se oculta el texto y se muestrea) ──
const OBJETIVOS = [
  ['cabecera-lugar', '[data-testid="clima-cabecera"] > p:nth-of-type(1)'],
  ['cabecera-altura', '[data-testid="clima-cabecera"] > p:nth-of-type(2)'],
  ['cabecera-saludo', '[data-testid="clima-cabecera"] h2'],
  ['cabecera-condicion', '[data-testid="clima-cabecera"] > p:last-of-type'],
  ['cifra-grande', '[data-testid="clima-ahora"] p.text-4xl'],
  ['cifra-label', '[data-testid="clima-ahora"] p.uppercase'],
  ['cifra-siente', '[data-testid="clima-ahora"] p.text-xs'],
  ['anomalia-titulo', '[data-testid="clima-anomalia"] p'],
  ['tab-hoy', '[data-testid="horizonte-tab-hoy"] span'],
  ['tab-semana', '[data-testid="horizonte-tab-semana"] span'],
  ['tab-estacional', '[data-testid="horizonte-tab-estacional"] span'],
];
const cajas = await page.evaluate((objetivos) => objetivos.map(([id, sel]) => {
  const el = document.querySelector(sel);
  if (!el) return { id, sel, ausente: true };
  const r = el.getBoundingClientRect();
  const cs = getComputedStyle(el);
  const rango = document.createRange(); rango.selectNodeContents(el);
  const rr = rango.getBoundingClientRect();
  const box = rr.width > 0 ? rr : r;
  return { id, sel, x: box.left, y: box.top, w: box.width, h: box.height, color: cs.color, texto: (el.textContent || '').trim().slice(0, 60) };
}), OBJETIVOS);
// ocultar los textos (y sus hermanos que también son texto) para ver el fondo puro debajo
const ocultador = await page.addStyleTag({ content: '.clima-atmosfera-contenido, .clima-atmosfera-contenido * { visibility: hidden !important; }' });
await page.waitForTimeout(300);
const fondoPng = await page.screenshot();
await ocultador.evaluate((el) => el.remove());
fs.writeFileSync(path.join(OUT, `fondo-${tag}.png`), fondoPng);
const fondo = sharp(fondoPng);
const meta = await fondo.metadata();
const { data, info } = await fondo.raw().toBuffer({ resolveWithObject: true });
const lum = (r, g, b) => {
  const f = (c) => { c /= 255; return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; };
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
};
const parseColor = (s) => { const m = s.match(/[\d.]+/g) || []; return { r: +m[0], g: +m[1], b: +m[2], a: m[3] != null ? +m[3] : 1 }; };
const contraste = (l1, l2) => (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
const resultadosContraste = [];
for (const c of cajas) {
  if (c.ausente || !c.w || !c.h) { resultadosContraste.push({ id: c.id, ausente: true }); continue; }
  const tc = parseColor(c.color); const lt = lum(tc.r, tc.g, tc.b);
  const x0 = Math.max(0, Math.floor(c.x * DPR)), y0 = Math.max(0, Math.floor(c.y * DPR));
  const x1 = Math.min(info.width, Math.ceil((c.x + c.w) * DPR)), y1 = Math.min(info.height, Math.ceil((c.y + c.h) * DPR));
  let min = Infinity, sum = 0, n = 0; const vals = [];
  for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) {
    const i = (y * info.width + x) * info.channels;
    const lb = lum(data[i], data[i + 1], data[i + 2]);
    const cr = contraste(lt, lb); vals.push(cr); if (cr < min) min = cr; sum += cr; n++;
  }
  vals.sort((a, b) => a - b);
  resultadosContraste.push({ id: c.id, texto: c.texto, color: c.color, min: +min.toFixed(2), p05: +vals[Math.floor(vals.length * 0.05)].toFixed(2), media: +(sum / n).toFixed(2), px: n });
}
log('contraste', JSON.stringify(resultadosContraste));

const informe = { tag, clima: CLIMA, luz: LUZ, captura: shot, viewport: '390x844', dpr: DPR, headed: HEADED, fps, renderer, estado, contraste: resultadosContraste, pageErrors, consoleErrors, fecha: new Date().toISOString() };
fs.writeFileSync(path.join(OUT, `${tag}.json`), JSON.stringify(informe, null, 2));
log('open-meteo', JSON.stringify(redMeteo));
informe.openMeteo = redMeteo;
fs.writeFileSync(path.join(OUT, `${tag}.json`), JSON.stringify(informe, null, 2));
log(`pageErrors=${pageErrors.length} consoleErrors=${consoleErrors.length}`);
let videoPath = null;
if (VIDEO) {
  // 16 s de vida de la escena (con el boletín encima), luego 6 s de la escena sola
  await page.waitForTimeout(16000);
  const oc2 = await page.addStyleTag({ content: '.clima-atmosfera-contenido, .clima-atmosfera-contenido * { visibility: hidden !important; }' });
  await page.waitForTimeout(6000);
  await oc2.evaluate((el) => el.remove());
  const v = page.video();
  await ctx.close();
  const raw = await v.path();
  videoPath = path.join(OUT, `${tag}.webm`);
  fs.renameSync(raw, videoPath);
  log('video', videoPath);
}
await browser.close();
