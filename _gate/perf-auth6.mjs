import { chromium } from 'playwright-core';
import { writeFileSync, readFileSync } from 'node:fs';

const URL = process.env.PROBE_URL || 'https://chagra-dev.guatoc.co/';
const TAG = process.env.PROBE_TAG || 'auth6';
const OUT = process.env.PROBE_OUT || `_gate/perf-${TAG}.json`;
const EXE = process.env.PROBE_EXE || null;
const ENV_FILE = process.env.PROBE_ENV_FILE || '/tmp/opencode/ol.env';
const SKIP_ONB = process.env.PROBE_SKIP_ONB === '1';

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

// Observers por fase (robustos a reload: no dependen del doc anterior)
const initScript = `
{
  const win = window;
  win.__events = [];
  try {
    new PerformanceObserver((l) => l.getEntries().forEach((e) => { if (e.entryType === 'paint' || e.entryType === 'largest-contentful-paint') win.__events.push({ k: e.entryType === 'paint' ? 'paint:' + e.name : 'lcp', t: Math.round(e.startTime), s: e.size || 0 }); })).observe({ entryTypes: ['paint', 'largest-contentful-paint'], buffered: true });
  } catch (e) {}
  try {
    new PerformanceObserver((l) => l.getEntries().forEach((e) => { if (e.entryType === 'longtask') win.__events.push({ k: 'lt', t: Math.round(e.startTime), d: Math.round(e.duration) }); })).observe({ entryTypes: ['longtask'] });
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
  reqs.push({ t: Math.round(Date.now() - cdpT0), url: u.slice(0, 200), reqId: e.requestId });
});
cdp.on('Network.responseReceived', (e) => {
  const r = reqs.find((x) => x.reqId === e.requestId);
  if (r) { r.status = e.response.status; r.size = e.response.encodedDataLength || 0; }
});
const consoleMsgs = [];
const pageErrors = [];
page.on('console', (m) => { if (consoleMsgs.length < 300) consoleMsgs.push({ t: Date.now() - cdpT0, type: m.type(), text: m.text().slice(0, 140) }); });
page.on('pageerror', (e) => pageErrors.push(String(e).slice(0, 200)));

const t0 = Date.now();
const mark = () => Date.now() - t0;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const withTimeout = (p, ms, label) => Promise.race([p, new Promise((_, rej) => setTimeout(() => rej(new Error('to:' + label)), ms))]);
const stage = {};

async function st() {
  try {
    return await withTimeout(page.evaluate(() => {
      const q = (s) => !!document.querySelector(s);
      const txt = document.body ? document.body.innerText : '';
      return { login: q('#login-username'), onb: q('[data-testid="onb2-saltar-todo"]'), tile: q('[data-testid="tile-registrar-unificado"]'), reg: q('[data-testid="registro-unificado-manual"]'), regVoz: q('[data-testid="registro-unificado-done"]'), head: txt.slice(0, 80).replace(/\n/g, ' ') };
    }), 5000, 'st');
  } catch (e) { return { err: 1 }; }
}

// 1) login
stage.start = mark();
await withTimeout(page.goto(URL, { waitUntil: 'domcontentloaded', timeout: 60000 }), 65000, 'goto');
await page.waitForSelector('#login-username', { timeout: 45000 }).catch(() => {});
stage.loginForm = mark();
await withTimeout(page.fill('#login-username', USER), 8000, 'fu');
await withTimeout(page.fill('#login-password', PASS), 8000, 'fp');
await withTimeout(page.click('button[type="submit"]'), 8000, 'sc');
stage.submit = mark();

// 2) esperar onboarding o dashboard
let dest = null;
const dl1 = Date.now() + 150000;
while (Date.now() < dl1) {
  await sleep(2000);
  const s = await st();
  if (s.onb || s.tile) { dest = s; stage.firstDest = mark(); break; }
}

// 3) saltar onboarding si aparece
if (dest && dest.onb) {
  for (let i = 0; i < 4; i++) {
    const s = await st();
    if (!s.onb || s.tile) break;
    await withTimeout(page.locator('[data-testid="onb2-saltar-todo"]').first().click({ timeout: 6000 }).then(() => true).catch(() => false), 8000, 'skip');
    await sleep(3500);
  }
}
stage.afterSkip = mark();

// 4) reload para caer directo al dashboard (perfil ya marcado como skipped)
await withTimeout(page.reload({ waitUntil: 'domcontentloaded', timeout: 60000 }), 65000, 'reload');
const tReload = mark();
// detectar el dashboard real (tile registrar) — hasta 90 s
let dash = null;
const dl2 = Date.now() + 90000;
while (Date.now() < dl2) {
  await sleep(1500);
  const s = await st();
  if (s.tile && !s.onb && !s.login) { dash = s; stage.dashAt = mark(); break; }
  if (s.login) { stage.relogin = mark(); break; }
}
// asentar
await sleep(8000);
stage.settle = mark();

// 5) transición → Registrar (click en el tile del dashboard)
let trans = null;
if (dash) {
  const tt = mark();
  const ok = await withTimeout(page.locator('[data-testid="tile-registrar-unificado"]').first().click({ timeout: 8000, force: true }).then(() => true).catch(() => false), 10000, 'tileclick');
  if (ok) {
    let got = null;
    const dl3 = Date.now() + 25000;
    while (Date.now() < dl3) {
      await sleep(400);
      const s = await st();
      if (s.reg || s.regVoz) { got = s; break; }
    }
    await sleep(2500);
    const fin = await st();
    trans = { msToMarker: got ? mark() - tt : null, reached: !!got, regVoz: fin.regVoz, regManual: fin.reg, head: fin.head };
  } else {
    trans = { clickFailed: true };
  }
}
stage.transDone = mark();

const perf = await withTimeout(page.evaluate(() => (window.__events || []).map((e) => ({ ...e }))), 6000, 'perf').catch(() => []);

const shotPath = `_gate/perf-${TAG}.png`;
try { await withTimeout(page.screenshot({ path: shotPath, fullPage: false }), 10000, 'shot'); } catch (e) {}

const out = {
  tag: TAG, url: URL, user: USER,
  stages: stage,
  dest: dest ? { onb: dest.onb, tile: dest.tile, head: dest.head } : null,
  transition: trans,
  events: perf,
  shotPath,
  requestsTotal: reqs.length,
  consoleMsgs: consoleMsgs.filter((m) => m.type === 'error' || m.type === 'warning').slice(0, 30),
  jsErrors: pageErrors.slice(0, 10),
};
writeFileSync(OUT, JSON.stringify(out, null, 1));
console.log('WROTE', OUT);
console.log('loginForm@' + stage.loginForm + ' submit@' + stage.submit + ' firstDest@' + stage.firstDest + ' reload@ +' + tReload + ' dashAt@' + stage.dashAt + ' settle@' + stage.settle + ' transDone@' + stage.transDone);
console.log('transition=', JSON.stringify(trans));
const lt = perf.filter((e) => e.k === 'lt');
const fcp = perf.find((e) => e.k === 'paint:first-contentful-paint');
const lcp = perf.filter((e) => e.k === 'lcp').pop();
console.log('ltCount=' + lt.length + ' blocking=' + lt.reduce((a, e) => a + Math.max(0, e.d - 50), 0) + ' fcp=' + (fcp ? fcp.t : null) + ' lcp=' + (lcp ? lcp.t : null));
await browser.close();
