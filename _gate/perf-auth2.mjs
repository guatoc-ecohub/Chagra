import { chromium } from 'playwright-core';
import { writeFileSync, readFileSync } from 'node:fs';

const URL = process.env.PROBE_URL || 'https://chagra-dev.guatoc.co/';
const TAG = process.env.PROBE_TAG || 'auth';
const OUT = process.env.PROBE_OUT || `_gate/perf-${TAG}.json`;
const EXE = process.env.PROBE_EXE || null;
const ENV_FILE = process.env.PROBE_ENV_FILE || '/tmp/opencode/ol.env';
const AUTH_TARGET = process.env.PROBE_AUTH_TARGET || 'tile-registrar-unificado';

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

// Observers: miden relativos a "load de la navegación", por eso reiniciamos la
// ventana de observación con un marcador por-fase (PhaseObserver).
const initScript = `
{
  const win = window;
  win.__perf = { phases: [] };
  win.__startPhase = (name) => {
    const p = { name, t: performance.now(), paints: [], lcp: [], longtasks: [], shifts: [] };
    win.__perf.phases.push(p);
    const rec = (arr) => (e) => arr.push({ t: Math.round(e.startTime - p.t), d: Math.round(e.duration || 0) });
    try { const po = new PerformanceObserver((l) => l.getEntries().forEach((e) => { if (e.entryType === 'paint') p.paints.push({ name: e.name, t: Math.round(e.startTime - p.t) }); })); po.observe({ type: 'paint', buffered: true }); p._poP = po; } catch (e) {}
    try { const po = new PerformanceObserver((l) => l.getEntries().forEach((e) => { if (e.entryType === 'largest-contentful-paint') p.lcp.push({ t: Math.round(e.startTime - p.t), size: e.size || 0 }); })); po.observe({ type: 'largest-contentful-paint' }); p._poL = po; } catch (e) {}
    try { const po = new PerformanceObserver((l) => l.getEntries().forEach((e) => { if (e.entryType === 'longtask') p.longtasks.push({ t: Math.round(e.startTime - p.t), d: Math.round(e.duration), blocking: Math.round(Math.max(0, e.duration - 50)) }); })); po.observe({ type: 'longtask' }); p._poLT = po; } catch (e) {}
    return p;
  };
  win.__endPhase = (name) => {
    const p = win.__perf.phases.find((x) => x.name === name);
    if (p) { p.end = Math.round(performance.now() - p.t); for (const k of ['_poP', '_poL', '_poLT']) { try { p[k] && p[k].disconnect(); } catch (e) {} } }
  };
}
`;
await context.addInitScript({ content: initScript });

const page = await context.newPage();
const cdp = await context.newCDPSession(page);
await cdp.send('Network.enable');
const reqs = [];
const cdpT0 = Date.now();
cdp.on('Network.requestWillBeSent', (e) => {
  const u = e.request.url;
  if (u.startsWith('data:') || u.startsWith('blob:')) return;
  reqs.push({ t: Math.round(Date.now() - cdpT0), url: u.slice(0, 200), method: e.request.method, type: (e.initiator || {}).type || '?', reqId: e.requestId });
});
cdp.on('Network.responseReceived', (e) => {
  const r = reqs.find((x) => x.reqId === e.requestId);
  if (r) { r.status = e.response.status; r.mime = (e.response.mimeType || '').split(';')[0]; }
  r.size = e.response.encodedDataLength || 0;
});
const consoleMsgs = [];
const pageErrors = [];
const badHttp = [];
page.on('console', (m) => { const t = m.text(); if (consoleMsgs.length < 200) consoleMsgs.push(`[${m.type()}] ${t.slice(0, 200)}`); });
page.on('pageerror', (e) => pageErrors.push(String(e).slice(0, 300)));
page.on('response', (res) => { if (res.status() >= 400) badHttp.push({ url: res.url().slice(0, 150), status: res.status() }); });

const t0 = Date.now();
const mark = () => Date.now() - t0;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const stage = {};

// ── Fase 1: login (pantalla anónima) — igual al probe anónimo ──────────────
stage.navLogin = mark();
await page.goto(URL, { waitUntil: 'domcontentloaded', timeout: 60000 });
await page.evaluate(() => window.__startPhase && window.__startPhase('login'));
await page.waitForSelector('#login-username', { timeout: 30000 }).catch(() => {});
stage.loginForm = mark();

await page.fill('#login-username', USER);
await page.fill('#login-password', PASS);
stage.submitClick = mark();
await page.click('button[type="submit"]');
await page.evaluate(() => window.__endPhase && window.__endPhase('login'));

// ── Fase 2: post-login — onboarding o dashboard directo ────────────────────
// esperar a que aparezca el onboarding (onb2-saltar-todo) o ya el dashboard
const postLoginStart = mark();
const hasOnb = await (async () => {
  const dl = Date.now() + 30000;
  while (Date.now() < dl) {
    const onb = await page.evaluate(() => !!document.querySelector('[data-testid="onb2-saltar-todo"]')).catch(() => false);
    if (onb) return true;
    const loginGone = await page.evaluate(() => !document.querySelector('#login-username')).catch(() => true);
    if (loginGone) {
      // puede que ya esté en dashboard; revisar tiles
      const tile = await page.evaluate(() => !!document.querySelector('[data-testid="tile-registrar-unificado"]')).catch(() => false);
      if (tile) return false;
    }
    await sleep(250);
  }
  return null;
})();
stage.onbDetected = mark();

if (hasOnb) {
  await page.evaluate(() => window.__startPhase && window.__startPhase('onboarding'));
  const btn = page.locator('[data-testid="onb2-saltar-todo"]').first();
  await btn.click({ timeout: 8000 }).catch(() => {});
  await sleep(1200);
  // puede requerir confirmación o avanzar solo; si hay botón "Sí, saltar"/continuar, reintentar
  await page.evaluate(() => window.__endPhase && window.__endPhase('onboarding'));
}
stage.onbSkipped = mark();

// ── Fase 3: esperar dashboard real ─────────────────────────────────────────
await page.evaluate(() => window.__startPhase && window.__startPhase('dashboard'));
const dashT = Date.now();
const dashSeen = await (async () => {
  const dl = Date.now() + 45000;
  while (Date.now() < dl) {
    const has = await page.evaluate(() => {
      const txt = document.body ? document.body.innerText : '';
      return {
        tile: !!document.querySelector('[data-testid="tile-registrar-unificado"]'),
        login: !!document.querySelector('#login-username'),
        onb: !!document.querySelector('[data-testid="onb2-saltar-todo"]'),
        bodyLen: txt.length,
      };
    }).catch(() => ({ tile: false, login: true, onb: false, bodyLen: 0 }));
    // dashboard real: login y onboarding ausentes
    if (has.tile || (!has.login && !has.onb && has.bodyLen > 200)) return has;
    await sleep(400);
  }
  return null;
})();
stage.dashSeen = mark();
// dejar asentar el home (clima/catálogo/sync)
await sleep(6000);
stage.dashSettled = mark();
await page.evaluate(() => window.__endPhase && window.__endPhase('dashboard'));

const dashSnapshot = await page.evaluate(() => ({
  title: document.title,
  url: location.href,
  hash: location.hash,
  buildSha: window.__CHAGRA_BUILD_SHA__ || null,
  bodyText: (document.body ? document.body.innerText : '').slice(0, 700),
  hasTile: !!document.querySelector('[data-testid="tile-registrar-unificado"]'),
  hasClima: !!document.querySelector('[data-testid="clima-strip"]') || (document.body ? document.body.innerText.includes('Clima') : false),
}));

// ── Fase 4: transición a pantalla AUTH_TARGET ──────────────────────────────
let transition = null;
const targetSel = AUTH_TARGET;
const targetVisible = await page.evaluate((s) => !!document.querySelector(s), targetSel).catch(() => false);
if (targetVisible && !dashSnapshot.hasTile) {
  transition = { error: `target ${targetSel} visible pero dashboard no asentado` };
} else if (targetVisible) {
  await page.evaluate(() => window.__startPhase && window.__startPhase('transition'));
  const transT = Date.now();
  const beforeUrl = await page.evaluate(() => location.hash || '/').catch(() => '/');
  await page.click(targetSel, { timeout: 10000 }).catch((e) => { transition = { error: 'click fail: ' + e.message }; });
  if (!transition) {
    // esperar a que cambie la vista: algún elemento de la pantalla destino
    const destT = Date.now();
    const destSeen = await (async () => {
      const dl = Date.now() + 25000;
      while (Date.now() < dl) {
        const now = await page.evaluate(() => location.hash || '/').catch(() => '/');
        const hasDestText = await page.evaluate((sel) => {
          const el = document.querySelector(sel);
          if (!el) return false;
          return true;
        }, targetSel).catch(() => false);
        if (now !== beforeUrl || !hasDestText) return now;
        await sleep(300);
      }
      return null;
    })();
    await sleep(2500);
    await page.evaluate(() => window.__endPhase && window.__endPhase('transition'));
    transition = {
      targetSel,
      transitionMs: Date.now() - transT,
      hashBefore: beforeUrl,
      hashAfter: await page.evaluate(() => location.hash || '/').catch(() => '/'),
      destSeen,
      destSnapshot: (await page.evaluate(() => (document.body ? document.body.innerText : '').slice(0, 400)).catch(() => '')),
    };
  }
}

const phases = await page.evaluate(() => {
  return (window.__perf?.phases || []).map((p) => {
    const fcp = p.paints.find((x) => x.name === 'first-contentful-paint');
    return {
      name: p.name,
      start: p.t,
      end: p.end,
      fcp: fcp ? fcp.t : null,
      lcp: p.lcp.length ? p.lcp[p.lcp.length - 1].t : null,
      lcpSize: p.lcp.length ? p.lcp[p.lcp.length - 1].size : null,
      longTasks: p.longtasks.length,
      longTasksList: p.longtasks.slice(0, 20),
      blockingMs: p.longtasks.reduce((a, b) => a + (b.blocking || 0), 0),
      shifts: p.shifts.length,
    };
  });
}).catch(() => []);

const shotPath = `_gate/perf-${TAG}.png`;
try { await page.screenshot({ path: shotPath, fullPage: false }); } catch (e) {}

const authReqs = reqs.filter((r) => r.t >= stage.submitClick);
const bucket = (r) => { const k = r.url.replace(URL, '').split('?')[0]; return k.slice(-80); };

const out = {
  tag: TAG,
  url: URL,
  user: USER,
  authTarget: AUTH_TARGET,
  stages: stage,
  dashboard: dashSnapshot,
  phases,
  transition,
  shotPath,
  requestsTotal: reqs.length,
  requestsPostSubmit: authReqs.length,
  statusCountsPostSubmit: authReqs.reduce((a, r) => { const k = r.status == null ? 'none' : String(r.status); a[k] = (a[k] || 0) + 1; return a; }, {}),
  topPostSubmitByUrl: Object.entries(authReqs.reduce((a, r) => { const k = bucket(r); a[k] = (a[k] || 0) + 1; return a; }, {})).sort((a, b) => b[1] - a[1]).slice(0, 30),
  consoleMsgs: consoleMsgs.filter((x) => x.startsWith('[error]') || x.startsWith('[warning]')).slice(0, 50),
  jsErrors: pageErrors.slice(0, 10),
  badHttp: badHttp.slice(0, 30),
};

writeFileSync(OUT, JSON.stringify(out, null, 1));
console.log('WROTE ' + OUT);
console.log('loginForm@' + stage.loginForm + ' submit@' + stage.submitClick + ' onb@' + stage.onbDetected + ' dashSeen@' + stage.dashSeen + ' dashSettled@' + stage.dashSettled);
for (const p of phases) console.log(`phase[${p.name}] fcp=${p.fcp} lcp=${p.lcp} longTasks=${p.longTasks} blocking=${p.blockingMs} end=${p.end}ms`);
console.log('transition: ' + JSON.stringify(transition));
console.log('requests post-submit=' + authReqs.length + ' statuses=' + JSON.stringify(out.statusCountsPostSubmit));
console.log('jsErrors=' + pageErrors.length + ' badHttp=' + badHttp.length);
console.log('dashHasTile=' + dashSnapshot.hasTile);

await browser.close();
