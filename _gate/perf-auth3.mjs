import { chromium } from 'playwright-core';
import { writeFileSync, readFileSync } from 'node:fs';

const URL = process.env.PROBE_URL || 'https://chagra-dev.guatoc.co/';
const TAG = process.env.PROBE_TAG || 'auth3';
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

const initScript = `
{
  const win = window;
  win.__m = [];
  win.__log = (ev) => win.__m.push({ ev, t: Math.round(performance.now()) });
  win.__startPhase = (name) => { win.__log('phase:' + name + ':start'); };
  win.__endPhase = (name) => { win.__log('phase:' + name + ':end'); };
  try {
    new PerformanceObserver((l) => l.getEntries().forEach((e) => {
      if (e.entryType === 'paint') win.__log('paint:' + e.name + ':' + Math.round(e.startTime));
      if (e.entryType === 'largest-contentful-paint') win.__log('lcp:' + Math.round(e.startTime) + ':' + (e.size || 0));
    })).observe({ type: 'paint', buffered: true });
  } catch (e) {}
  try {
    new PerformanceObserver((l) => l.getEntries().forEach((e) => {
      if (e.entryType === 'largest-contentful-paint') win.__log('lcp:' + Math.round(e.startTime) + ':' + (e.size || 0));
    })).observe({ type: 'largest-contentful-paint', buffered: true });
  } catch (e) {}
  try {
    new PerformanceObserver((l) => l.getEntries().forEach((e) => {
      if (e.entryType === 'longtask') win.__log('longtask:' + Math.round(e.startTime) + ':' + Math.round(e.duration));
    })).observe({ type: 'longtask', buffered: true });
  } catch (e) {}
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
  reqs.push({ t: Math.round(Date.now() - cdpT0), url: u.slice(0, 220), reqId: e.requestId });
});
cdp.on('Network.responseReceived', (e) => {
  const r = reqs.find((x) => x.reqId === e.requestId);
  if (r) { r.status = e.response.status; r.mime = (e.response.mimeType || '').split(';')[0]; r.size = e.response.encodedDataLength || 0; }
});
const consoleMsgs = [];
const pageErrors = [];
page.on('console', (m) => { if (consoleMsgs.length < 400) consoleMsgs.push({ t: Date.now() - cdpT0, type: m.type(), text: m.text().slice(0, 220) }); });
page.on('pageerror', (e) => pageErrors.push(String(e).slice(0, 300)));

const t0 = Date.now();
const mark = () => Date.now() - t0;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const stage = {};
const domLog = [];

async function snapshot(tag) {
  const s = await page.evaluate(() => {
    const q = (s) => !!document.querySelector(s);
    const txt = document.body ? document.body.innerText : '';
    return {
      login: q('#login-username'),
      onb: q('[data-testid="onb2-saltar-todo"]'),
      tile: q('[data-testid="tile-registrar-unificado"]'),
      fab: q('[data-testid="compai-fab-panel"]'),
      loader: q('#pre-loader'),
      txtHead: txt.slice(0, 120).replace(/\n/g, ' | '),
      hash: location.hash || '/',
    };
  }).catch(() => ({}));
  domLog.push({ tag, at: mark(), ...s });
  return s;
}

stage.start = mark();
await page.goto(URL, { waitUntil: 'domcontentloaded', timeout: 60000 });
await snapshot('after-goto');
await page.waitForSelector('#login-username', { timeout: 45000 }).catch(() => {});
stage.loginForm = mark();
await snapshot('login-form');

await page.fill('#login-username', USER);
await page.fill('#login-password', PASS);
stage.submitClick = mark();
await page.click('button[type="submit"]');
await snapshot('after-submit');

// timeline: muestrear cada 2 s hasta dashboard o 120 s
let reachedDashboard = false;
for (let i = 0; i < 60; i++) {
  await sleep(2000);
  const s = await snapshot('t+' + Math.round((mark() - stage.submitClick) / 1000) + 's');
  if (s.tile) { reachedDashboard = true; stage.dashFirst = mark(); break; }
}
if (reachedDashboard) {
  await sleep(8000);
  stage.dashSettled = mark();
  await snapshot('dashboard-settled');
} else {
  // intentar saltar onboarding si está presente
  const cur = await page.evaluate(() => !!document.querySelector('[data-testid="onb2-saltar-todo"]')).catch(() => false);
  if (cur) {
    stage.trySkipAt = mark();
    const btn = page.locator('[data-testid="onb2-saltar-todo"]').first();
    await btn.click({ timeout: 8000 }).catch((e) => console.log('skip-click-fail', e.message.slice(0, 120)));
    await sleep(3000);
    for (let i = 0; i < 40; i++) {
      await sleep(2000);
      const s = await snapshot('after-skip-t+' + i + '0');
      if (s.tile) { reachedDashboard = true; stage.dashFirst = mark(); break; }
      if (s.onb) { /* sigue en onboarding, reintentar */ }
    }
  }
}
stage.end = mark();
const endSnap = await snapshot('end');

// fase de transición si hay dashboard
let transition = null;
if (reachedDashboard) {
  const beforeUrl = await page.evaluate(() => location.hash || '/').catch(() => '/');
  const sel = '[data-testid="tile-registrar-unificado"]';
  const tt = mark();
  const clickOk = await page.click(sel, { timeout: 10000 }).then(() => true).catch((e) => { transition = { error: e.message.slice(0, 150) }; return false; });
  if (clickOk) {
    let destUrl = null;
    for (let i = 0; i < 30; i++) {
      await sleep(500);
      destUrl = await page.evaluate(() => location.hash || '/').catch(() => '/');
      if (destUrl !== beforeUrl) break;
    }
    await sleep(3000);
    const destSnap = await snapshot('transition-dest');
    transition = { target: sel, transitionMs: mark() - tt, hashBefore: beforeUrl, hashAfter: destUrl, destHead: destSnap.txtHead };
  }
}

const finalMetrics = await page.evaluate(() => {
  const entries = window.__m || [];
  const paints = entries.filter((e) => e.ev.startsWith('paint:'));
  const lcps = entries.filter((e) => e.ev.startsWith('lcp:'));
  const lts = entries.filter((e) => e.ev.startsWith('longtask:')).map((e) => ({ ev: e.ev, t: e.t }));
  const fcp = paints.find((e) => e.ev.includes('first-contentful-paint'));
  return {
    fcpRaw: fcp ? fcp.t : null,
    lcpLast: lcps.length ? lcps[lcps.length - 1] : null,
    longTaskEvents: lts.slice(0, 40),
    totalBlockingMs: lts.reduce((a, e) => a + Math.max(0, parseInt(e.ev.split(':')[2]) - 50), 0),
  };
}).catch(() => ({}));

const shotPath = `_gate/perf-${TAG}.png`;
try { await page.screenshot({ path: shotPath, fullPage: false }); } catch (e) {}

const out = {
  tag: TAG, url: URL, user: USER,
  stages: stage,
  domLog,
  reachedDashboard,
  transition,
  finalMetrics,
  shotPath,
  requestsTotal: reqs.length,
  reqs: reqs.map((r) => ({ t: r.t, url: r.url, status: r.status, size: r.size || 0 })).slice(0, 500),
  consoleMsgs,
  jsErrors: pageErrors.slice(0, 10),
};
writeFileSync(OUT, JSON.stringify(out, null, 1));
console.log('WROTE ' + OUT);
console.log('loginForm@' + stage.loginForm + ' submit@' + stage.submitClick + ' dashFirst@' + stage.dashFirst + ' settled@' + stage.dashSettled + ' end@' + stage.end);
console.log('reachedDashboard=' + reachedDashboard);
console.log('fcpRaw=' + finalMetrics.fcpRaw + ' blocking=' + finalMetrics.totalBlockingMs);
console.log('transition=' + JSON.stringify(transition));
await browser.close();
