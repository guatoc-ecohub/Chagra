import { chromium } from 'playwright-core';
import { writeFileSync, readFileSync } from 'node:fs';

const URL = process.env.PROBE_URL || 'https://chagra-dev.guatoc.co/';
const TAG = process.env.PROBE_TAG || 'auth5';
const OUT = process.env.PROBE_OUT || `_gate/perf-${TAG}.json`;
const EXE = process.env.PROBE_EXE || null;
const ENV_FILE = process.env.PROBE_ENV_FILE || '/tmp/opencode/ol.env';

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

const page = await context.newPage();
const cdp = await context.newCDPSession(page);
await cdp.send('Network.enable');
const reqs = [];
const cdpT0 = Date.now();
cdp.on('Network.requestWillBeSent', (e) => {
  const u = e.request.url;
  if (u.startsWith('data:') || u.startsWith('blob:')) return;
  reqs.push({ t: Math.round(Date.now() - cdpT0), url: u.slice(0, 200), reqId: e.requestId });
});
cdp.on('Network.responseReceived', (e) => {
  const r = reqs.find((x) => x.reqId === e.requestId);
  if (r) { r.status = e.response.status; r.size = e.response.encodedDataLength || 0; }
});
const consoleMsgs = [];
const pageErrors = [];
page.on('console', (m) => { if (consoleMsgs.length < 300) consoleMsgs.push({ t: Date.now() - cdpT0, type: m.type(), text: m.text().slice(0, 160) }); });
page.on('pageerror', (e) => pageErrors.push(String(e).slice(0, 200)));

const t0 = Date.now();
const mark = () => Date.now() - t0;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const withTimeout = (p, ms, label) => Promise.race([p, new Promise((_, rej) => setTimeout(() => rej(new Error('to:' + label)), ms))]);
const stage = {};

async function state() {
  try {
    return await withTimeout(page.evaluate(() => {
      const q = (s) => !!document.querySelector(s);
      const txt = document.body ? document.body.innerText : '';
      return { login: q('#login-username'), onb: q('[data-testid="onb2-saltar-todo"]'), tile: q('[data-testid="tile-registrar-unificado"]'), loader: !!q('#pre-loader'), head: txt.slice(0, 90).replace(/\n/g, ' '), hash: location.hash || '/' };
    }), 5000, 'state');
  } catch (e) { return { err: e.message }; }
}

// ── 1) login real ─────────────────────────────────────────────
stage.start = mark();
await withTimeout(page.goto(URL, { waitUntil: 'domcontentloaded', timeout: 60000 }), 65000, 'goto');
await page.waitForSelector('#login-username', { timeout: 45000 }).catch(() => {});
stage.loginForm = mark();
await withTimeout(page.fill('#login-username', USER), 8000, 'fu');
await withTimeout(page.fill('#login-password', PASS), 8000, 'fp');
await withTimeout(page.click('button[type="submit"]'), 8000, 'sc');
stage.submit = mark();

// esperar a que termine la pesada inicial: onboarding O dashboard (hasta 150 s)
let dest = null;
const dl1 = Date.now() + 150000;
while (Date.now() < dl1) {
  await sleep(2000);
  const s = await state();
  if (s.onb || s.tile) { dest = s; stage.firstDest = mark(); break; }
}
stage.firstDestWaitEnd = mark();

// ── 2) salir del onboarding si está ────────────────────────────
if (dest && dest.onb) {
  // fuerza el skip (persiste skipped → en el reload cae directo al dashboard)
  const clicked = await withTimeout(page.locator('[data-testid="onb2-saltar-todo"]').first().click({ timeout: 8000 }).then(() => true).catch(() => false), 10000, 'skip');
  await sleep(4000);
  // si sigue en onboarding, probar de nuevo un par de veces
  for (let i = 0; i < 3; i++) {
    const s = await state();
    if (!s.onb || s.tile) break;
    await withTimeout(page.locator('[data-testid="onb2-saltar-todo"]').first().click({ timeout: 5000 }).then(() => true).catch(() => false), 7000, 'skip' + i);
    await sleep(4000);
  }
}
stage.afterSkip = mark();

// dump localStorage para diagnosticar tenant/keys
const lsDump = await withTimeout(page.evaluate(() => {
  const out = {};
  for (let i = 0; i < localStorage.length; i++) { const k = localStorage.key(i); if (k.startsWith('chagra:profile') || k.includes('tenant') || k.includes('onboarding')) out[k] = localStorage.getItem(k).slice(0, 60); }
  return out;
}), 5000, 'ls').catch(() => ({}));
stage.lsDump = mark();

// ── 3) reload WARM: ahora el perfil quedó marcado → debe caer al dashboard ──
// reiniciar contadores de la fase dashboard
const dashReqs0 = reqs.length;
await page.evaluate(() => {
  try { performance.mark('dash-nav-start'); } catch (e) {}
});
stage.reloadStart = mark();
await withTimeout(page.reload({ waitUntil: 'domcontentloaded', timeout: 60000 }), 65000, 'reload');
// fase dashboard: fcp/lcp desde navigationStart del reload
let dashTile = null;
const dl2 = Date.now() + 90000;
while (Date.now() < dl2) {
  await sleep(1500);
  const s = await state();
  if (s.tile) { dashTile = s; stage.dashFirst = mark(); break; }
  if (s.login) { stage.reLogin = mark(); break; }
}
if (dashTile) {
  await sleep(9000); // dejar asentar clima/sync/catálogo
  stage.settled = mark();
}

const dashMetrics = await withTimeout(page.evaluate(() => {
  const paint = performance.getEntriesByType('paint').map((e) => ({ name: e.name, t: Math.round(e.startTime) }));
  const lcp = performance.getEntriesByType('largest-contentful-paint').map((e) => ({ t: Math.round(e.startTime), size: e.size || 0 }));
  const lt = performance.getEntriesByType('longtask').map((e) => ({ t: Math.round(e.startTime), d: Math.round(e.duration) }));
  const nav = performance.getEntriesByType('navigation')[0];
  return {
    fcp: paint.find((p) => p.name === 'first-contentful-paint')?.t || null,
    lcp: lcp.length ? lcp[lcp.length - 1] : null,
    navTtfb: nav ? Math.round(nav.responseStart) : null,
    longtasks: lt.slice(0, 25),
    longTaskCount: lt.length,
    blocking: lt.reduce((a, b) => a + Math.max(0, b.d - 50), 0),
  };
}).catch(() => ({ fcp: null, lcp: null, longtasks: [], blocking: 0 })), 6000, 'dm');

const dashReqs = reqs.slice(dashReqs0);

// ── 4) transición: dashboard → pantalla destino (tile registrar) ──────────
let transition = null;
if (dashTile) {
  const sel = '[data-testid="tile-registrar-unificado"]';
  const beforeHash = await withTimeout(page.evaluate(() => location.hash || '/'), 4000, 'hb').catch(() => '/');
  const tt = mark();
  const ok = await withTimeout(page.click(sel, { timeout: 8000 }).then(() => true).catch(() => false), 10000, 'tc');
  if (ok) {
    let changed = false;
    const dl3 = Date.now() + 20000;
    while (Date.now() < dl3) {
      await sleep(400);
      const h = await withTimeout(page.evaluate(() => location.hash || '/'), 4000, 'hp').catch(() => '/');
      if (h !== beforeHash) { changed = true; break; }
    }
    await sleep(3500);
    const afterState = await state();
    transition = { ms: mark() - tt, hashBefore: beforeHash, hashAfter: afterState.hash, changed, destHead: afterState.head };
  }
}

const shotPath = `_gate/perf-${TAG}.png`;
try { await withTimeout(page.screenshot({ path: shotPath, fullPage: false }), 10000, 'shot'); } catch (e) {}

const post = reqs.filter((r) => r.t >= stage.submit);
const out = {
  tag: TAG, url: URL, user: USER,
  stages: stage,
  lsDump,
  firstDest: dest ? { onb: dest.onb, tile: dest.tile, head: dest.head } : null,
  dashMetrics,
  transition,
  shotPath,
  requestsTotal: reqs.length,
  postSubmitReqs: post.length,
  statusCounts: post.reduce((a, r) => { const k = r.status == null ? 'none' : String(r.status); a[k] = (a[k] || 0) + 1; return a; }, {}),
  consoleMsgs,
  jsErrors: pageErrors.slice(0, 10),
  byUrlPost: Object.entries(post.reduce((a, r) => { const k = r.url.replace(URL, '').split('?')[0].slice(-80); a[k] = (a[k] || 0) + 1; return a; }, {})).sort((a, b) => b[1] - a[1]).slice(0, 25),
};
writeFileSync(OUT, JSON.stringify(out, null, 1));
console.log('WROTE', OUT);
console.log('loginForm@' + stage.loginForm + ' submit@' + stage.submit + ' firstDest@' + stage.firstDest + ' (' + (dest ? (dest.onb ? 'onboarding' : 'dashboard') : 'none') + ') reload@' + stage.reloadStart + ' dashFirst@' + stage.dashFirst);
console.log('dashFCP=' + dashMetrics.fcp + ' dashLCP=' + (dashMetrics.lcp ? dashMetrics.lcp.t : null) + ' blocking=' + dashMetrics.blocking + ' ltCount=' + dashMetrics.longTaskCount);
console.log('transition=' + JSON.stringify(transition));
console.log('postReqs=' + post.length + ' statuses=' + JSON.stringify(out.statusCounts));
console.log('lsDump=' + JSON.stringify(lsDump));
await browser.close();
