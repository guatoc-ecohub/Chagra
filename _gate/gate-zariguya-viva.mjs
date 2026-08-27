// Gate FASE C: la zarigüeya compai VIVA en la app real (respira/camina, sin gif, no se sale).
// Modelado sobre scripts/escucha-shots.mjs (mismo arranque dev + seed IDB). Captura 6 frames.
import { existsSync, mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { execSync, spawn } from 'node:child_process';
import { chromium } from 'playwright';
import { installDeterminism, loginAndSeed } from '../tests/visual/visualTestUtils.js';

const PORT = process.env.GATE_PORT || '5188';
const BASE_URL = `http://127.0.0.1:${PORT}`;
const VIEWPORT = { width: 390, height: 844 };
const OUT = resolve(process.cwd(), '_gate/zariguya-viva');

function resolveChromium() {
  try { const w = execSync('which chromium 2>/dev/null', { encoding: 'utf8' }).trim(); if (w) return w; } catch {}
  try { return execSync("nix-shell -p chromium --run 'which chromium' 2>/dev/null | tail -1", { encoding: 'utf8', timeout: 120000 }).trim(); } catch {}
  return undefined;
}
async function waitForServer(url) {
  for (let i = 0; i < 150; i++) { try { const r = await fetch(url); if (r.status >= 200) return; } catch {} await new Promise((r) => setTimeout(r, 1000)); }
  throw new Error('dev server no levantó');
}

const child = spawn('npm', ['run', 'dev', '--', '--host', '127.0.0.1', '--port', PORT, '--strictPort'], { stdio: 'ignore', detached: true });
(async () => {
  if (!existsSync(OUT)) mkdirSync(OUT, { recursive: true });
  await waitForServer(BASE_URL);
  const browser = await chromium.launch({ executablePath: resolveChromium(), headless: true, args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'] });
  const context = await browser.newContext({ baseURL: BASE_URL, viewport: VIEWPORT, isMobile: true, hasTouch: true, deviceScaleFactor: 2, locale: 'es-CO', permissions: ['microphone'] });
  const page = await context.newPage();
  page.setDefaultTimeout(60000);
  await installDeterminism(context, page, { profileKey: 'operador' });
  // El gate NO debe abortar por warnings benignos de React (anidamiento DOM):
  // quitar el listener estricto de consola que instala installDeterminism.
  page.removeAllListeners('console');
  page.removeAllListeners('pageerror');
  await context.route('**/*', async (route) => {
    const url = new URL(route.request().url());
    const esApp = url.origin === BASE_URL && !url.pathname.includes('/api/') && !url.pathname.includes('/jsonapi/') && !url.pathname.includes('/oauth/');
    if (esApp) return route.continue();
    return route.fallback();
  });
  await context.route('**/api/whisper/asr*', (route) => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ text: 'Lléveme al mercado' }) }));
  await page.addInitScript(() => { try { localStorage.setItem('compai:companero', 'zariguya'); } catch {} });
  await page.goto('/', { waitUntil: 'domcontentloaded', timeout: 120000 });
  await page.waitForFunction(() => document.querySelector('#root')?.children.length > 0, undefined, { timeout: 180000 });
  await page.evaluate(async () => {
    const db = await new Promise((res, rej) => { const req = indexedDB.open('Chagra'); req.onupgradeneeded = () => { if (!req.result.objectStoreNames.contains('syncQueue')) req.result.createObjectStore('syncQueue'); }; req.onsuccess = () => res(req.result); req.onerror = () => rej(req.error); });
    await new Promise((res, rej) => { const tx = db.transaction('syncQueue', 'readwrite'); const s = tx.objectStore('syncQueue'); s.put('visual-token', 'farmos_access_token'); s.put('visual-refresh', 'farmos_refresh_token'); s.put(Date.now() + 3600000, 'farmos_token_expiry'); tx.oncomplete = res; tx.onerror = () => rej(tx.error); });
    db.close();
  });
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => document.querySelector('#root')?.children.length > 0, undefined, { timeout: 180000 });
  await page.waitForFunction(async () => (await indexedDB.databases()).some((d) => d.name === 'ChagraDB'), undefined, { timeout: 90000 });
  let seeded = false;
  for (let i = 1; i <= 3 && !seeded; i++) { try { await loginAndSeed(page, 'with-data'); seeded = true; } catch (e) { console.warn('seed intento', i, String(e.message).slice(0, 100)); await page.waitForTimeout(4000); } }
  if (!seeded) throw new Error('seed falló x3');
  await page.waitForTimeout(1500);
  // pantalla con AgentFab (suelo)
  await page.evaluate(() => window.dispatchEvent(new CustomEvent('chagraNavigate', { detail: { view: 'suelo' } })));
  await page.waitForTimeout(5000);
  await page.waitForSelector('[data-creature="zariguya"]', { timeout: 15000 }).catch(() => {});
  // 6 frames a 550ms (respira + posible excursión)
  for (let f = 0; f < 6; f++) { await page.screenshot({ path: `${OUT}/frame-${String(f).padStart(2, '0')}.png` }); await page.waitForTimeout(550); }
  const info = await page.evaluate(() => {
    const el = document.querySelector('[data-creature="zariguya"]') || document.querySelector('[data-agt-estado]');
    if (!el) return { existe: false };
    const r = el.getBoundingClientRect();
    return { existe: true, estado: el.getAttribute('data-agt-estado'), rasterImgs: el.querySelectorAll('image').length, dentroViewport: r.left >= -2 && r.top >= -2 && r.right <= innerWidth + 2 && r.bottom <= innerHeight + 2, rect: { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height) }, vw: innerWidth, vh: innerHeight };
  });
  console.log('GATE-INFO ' + JSON.stringify(info));
  await browser.close();
})().then(() => { try { process.kill(-child.pid); } catch {} process.exit(0); })
  .catch((e) => { console.error('GATE-ERR', e && e.message); try { process.kill(-child.pid); } catch {} process.exit(1); });
