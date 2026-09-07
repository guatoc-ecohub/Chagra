import { chromium } from 'playwright-core';
import { writeFileSync } from 'node:fs';
import { readFileSync } from 'node:fs';

const URL = process.env.PROBE_URL || 'https://chagra-dev.guatoc.co/';
const TAG = process.env.PROBE_TAG || 'auth';
const OUT = process.env.PROBE_OUT || `_gate/perf-${TAG}.json`;
const EXE = process.env.PROBE_EXE || null;
const ENV_FILE = process.env.PROBE_ENV_FILE || '/tmp/opencode/ol.env';
const AUTH_TARGET = process.env.PROBE_AUTH_TARGET || 'catalog'; // destino de transición

const env = {};
for (const line of readFileSync(ENV_FILE, 'utf8').split('\n')) {
  const m = line.match(/^([A-Z_]+)=(.*)$/);
  if (m) env[m[1]] = m[2].replace(/^"(.*)"$/, '$1');
}
const USER = env.FARMOS_USERNAME;
const PASS = env.FARMOS_PASSWORD;

const browser = await chromium.launch({
  headless: true,
  ...(EXE ? { executablePath: EXE } : {}),
  args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu', '--disable-dev-shm-usage', '--single-process'],
});

const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });

const initScript = `
{
  const win = window;
  win.__perf = { paints: [], lcp: [], longtasks: [], layoutShifts: [] };
  try { new PerformanceObserver((l) => l.getEntries().forEach((e) => { if (e.entryType === 'paint') win.__perf.paints.push({ name: e.name, t: Math.round(e.startTime) }); })).observe({ type: 'paint', buffered: true }); } catch (e) {}
  try { new PerformanceObserver((l) => l.getEntries().forEach((e) => { if (e.entryType === 'largest-contentful-paint') win.__perf.lcp.push({ t: Math.round(e.startTime), size: e.size || 0 }); })).observe({ type: 'largest-contentful-paint', buffered: true }); } catch (e) {}
  try { new PerformanceObserver((l) => l.getEntries().forEach((e) => { if (e.entryType === 'longtask') win.__perf.longtasks.push({ t: Math.round(e.startTime), d: Math.round(e.duration), blocking: Math.round(Math.max(0, e.duration - 50)) }); })).observe({ type: 'longtask', buffered: true }); } catch (e) {}
}
`;
await context.addInitScript({ content: initScript });

const page = await context.newPage();
const cdp = await context.newCDPSession(page);
await cdp.send('Network.enable');
const reqs = [];
const events = [];
const cdpT0 = Date.now();
cdp.on('Network.requestWillBeSent', (e) => {
  const u = e.request.url;
  if (u.startsWith('data:') || u.startsWith('blob:')) return;
  reqs.push({ t: Math.round(Date.now() - cdpT0), url: u.slice(0, 220), method: e.request.method, type: (e.initiator || {}).type || '?', reqId: e.requestId });
});
cdp.on('Network.responseReceived', (e) => {
  const r = reqs.find((x) => x.reqId === e.requestId);
  if (r) { r.status = e.response.status; r.mime = (e.response.mimeType || '').split(';')[0]; }
});
const consoleMsgs = [];
const pageErrors = [];
const badHttp = [];
page.on('console', (m) => { const t = m.text(); if (consoleMsgs.length < 150) consoleMsgs.push(`[${m.type()}] ${t.slice(0, 220)}`); });
page.on('pageerror', (e) => pageErrors.push(String(e).slice(0, 300)));
page.on('response', (res) => { if (res.status() >= 400) badHttp.push({ url: res.url().slice(0, 160), status: res.status() }); });

const t0 = Date.now();
const mark = () => Date.now() - t0;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function waitText(sel, text, timeout = 30000) {
  const dl = Date.now() + timeout;
  while (Date.now() < dl) {
    const ok = await page.evaluate(([s, t]) => {
      const el = document.querySelector(s);
      return !!(el && el.textContent.includes(t));
    }, [sel, text]).catch(() => false);
    if (ok) return true;
    await sleep(300);
  }
  return false;
}

let stage = {};
stage.navLogin = mark();
await page.goto(URL, { waitUntil: 'domcontentloaded', timeout: 60000 });
await waitText('#login-username', '', 20000).catch(() => {});
await page.waitForSelector('#login-username', { timeout: 30000 }).catch(() => {});
stage.loginForm = mark();

// Autenticar por la UI real
await page.fill('#login-username', USER);
await page.fill('#login-password', PASS);
stage.submitClick = mark();
await page.click('button[type="submit"]');
// no imprimir PASS nunca

// Esperar a que desaparezca el login / aparezca onboarding o dashboard
const landed = await (async () => {
  const dl = Date.now() + 45000;
  while (Date.now() < dl) {
    const st = await page.evaluate(() => ({
      loginVisible: !!document.querySelector('#login-username'),
      onb2: !!document.querySelector('[data-testid="onb2-saltar-todo"]'),
      body: (document.body ? document.body.innerText : '').slice(0, 300),
    })).catch(() => ({ loginVisible: true, onb2: false, body: '' }));
    if (!st.loginVisible || st.onb2) return st;
    await sleep(400);
  }
  return null;
})();
stage.postAuthVisible = mark();

// Si cae en onboarding, saltarlo
if (landed && landed.onb2) {
  const btn = page.locator('[data-testid="onb2-saltar-todo"]').first();
  await btn.click({ timeout: 5000 }).catch(() => {});
  await sleep(1500);
}
stage.onboardingHandled = mark();

// Esperar a que aparezca el shell post-login (dashboard): buscamos texto representativo
const dashOk = await (async () => {
  const dl = Date.now() + 45000;
  while (Date.now() < dl) {
    const txt = await page.evaluate(() => (document.body ? document.body.innerText : '')).catch(() => '');
    // el dashboard tiene FAB de agente o texto del home; login ya no está
    const loginGone = !(await page.evaluate(() => !!document.querySelector('#login-username')).catch(() => true));
    if (loginGone && txt.length > 80) return txt;
    await sleep(500);
  }
  return null;
})();
stage.dashboardText = mark();
await sleep(4000);
stage.dashboardSettle = mark();

// Transición: navegar a la pantalla AUTH_TARGET vía UI si hay tile/icono con ese texto,
// o vía el FAB del agente como target alternativo
let transStartedAt = null;
let transResult = null;
const targetLabels = AUTH_TARGET === 'agente' ? ['Agente', 'Preguntar', 'Chagra'] : ['Catálogo', 'Catalogo', 'Especies', 'Biodiversidad'];
const clickedLabel = await (async () => {
  for (const lbl of targetLabels) {
    const el = page.getByText(lbl, { exact: false }).first();
    const vis = await el.isVisible().catch(() => false);
    if (vis) {
      // solo elementos clicables (button/a/div con cursor) y que no estén dentro del login
      transStartedAt = mark();
      await el.click({ timeout: 5000 }).catch(() => {});
      return lbl;
    }
  }
  return null;
})();
stage.transitionClick = transStartedAt ? mark() : null;

if (transStartedAt) {
  // esperar cambio de pantalla: algo nuevo pintado
  const dl = Date.now() + 25000;
  let urlChanged = null;
  while (Date.now() < dl) {
    const h = await page.evaluate(() => location.hash || location.pathname).catch(() => '');
    if (h && h !== '/') { urlChanged = h; break; }
    await sleep(300);
  }
  await sleep(3000);
  transResult = {
    clickedLabel,
    transitionMs: transStartedAt != null ? mark() - transStartedAt : null,
    urlAfter: await page.evaluate(() => location.hash || location.pathname).catch(() => ''),
    urlChanged,
  };
}

const metrics = await page.evaluate(() => {
  const nav = performance.getEntriesByType('navigation')[0];
  const toMs = (n) => (n == null ? null : Math.round(n));
  const navTimes = nav ? { ttfb: toMs(nav.responseStart), domContentLoaded: toMs(nav.domContentLoadedEventEnd), loadEventEnd: toMs(nav.loadEventEnd) } : null;
  const perf = window.__perf || {};
  const lcp = perf.lcp.length ? perf.lcp[perf.lcp.length - 1] : null;
  const fcp = perf.paints.find((p) => p.name === 'first-contentful-paint') || null;
  const blocking = (perf.longtasks || []).reduce((a, b) => a + (b.blocking || 0), 0);
  return {
    url: location.href,
    title: document.title,
    buildSha: window.__CHAGRA_BUILD_SHA__ || null,
    bodyText: (document.body ? document.body.innerText : '').slice(0, 600),
    navTimes,
    fcp: fcp ? fcp.t : null,
    lcp: lcp ? { t: lcp.t, size: lcp.size } : null,
    longTaskCount: (perf.longtasks || []).length,
    longTasks: (perf.longtasks || []).slice(0, 30),
    totalBlockingMs: blocking,
    cls: (perf.layoutShifts || []).reduce((a, b) => a + (b.value || 0), 0),
  };
});

const shotPath = `_gate/perf-${TAG}.png`;
try { await page.screenshot({ path: shotPath, fullPage: false }); } catch (e) {}

const out = {
  tag: TAG,
  url: URL,
  user: USER,
  authTarget: AUTH_TARGET,
  stages: stage,
  transition: transResult,
  metrics,
  shotPath,
  requests: reqs.filter((r) => r.status != null).length,
  statusCounts: reqs.reduce((a, r) => { const k = r.status == null ? 'none' : String(r.status); a[k] = (a[k] || 0) + 1; return a; }, {}),
  topByBytes: reqs.slice(0, 0), // sin bytes en requestWillBeSent
  consoleMsgs: consoleMsgs.filter((x) => x.startsWith('[error]') || x.startsWith('[warning]')).slice(0, 40),
  jsErrors: pageErrors.slice(0, 10),
  badHttp: badHttp.slice(0, 30),
  requestList: reqs.map((r) => ({ t: r.t, url: r.url, type: r.type, status: r.status })).slice(0, 400),
};

writeFileSync(OUT, JSON.stringify(out, null, 1));
console.log('WROTE ' + OUT);
console.log('loginForm@' + stage.loginForm + 'ms submit@' + stage.submitClick + ' postAuth@' + stage.postAuthVisible + ' dashText@' + stage.dashboardText + ' dashSettle@' + stage.dashboardSettle + 'ms');
console.log('fcp=' + (metrics.fcp) + ' lcp=' + (metrics.lcp ? metrics.lcp.t : null) + ' longTasks=' + metrics.longTaskCount + ' blocking=' + metrics.totalBlockingMs);
console.log('transition: ' + JSON.stringify(transResult));
console.log('status=' + JSON.stringify(out.statusCounts));
console.log('jsErrors=' + pageErrors.length + ' badHttp=' + badHttp.length);

await browser.close();
