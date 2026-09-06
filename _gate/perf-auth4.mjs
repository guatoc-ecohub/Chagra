import { chromium } from 'playwright-core';
import { writeFileSync, readFileSync } from 'node:fs';

const URL = process.env.PROBE_URL || 'https://chagra-dev.guatoc.co/';
const TAG = process.env.PROBE_TAG || 'auth4';
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

// Seed de flags para que el post-login caiga DIRECTAMENTE al dashboard
// (resolveDestinoPostLogin lee done/skipped del perfil, por tenant).
await context.addInitScript((u) => {
  try {
    localStorage.setItem('chagra:active_tenant_id', u);
    localStorage.setItem('chagra:profile:skipped:v1', '1');
    localStorage.setItem(`chagra:profile:skipped:v1:${u}`, '1');
    localStorage.setItem(`chagra:profile:done:v1:${u}`, '1');
  } catch (e) {}
}, USER);

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
  if (r) { r.status = e.response.status; r.size = e.response.encodedDataLength || 0; }
});
const consoleMsgs = [];
const pageErrors = [];
page.on('console', (m) => { if (consoleMsgs.length < 400) consoleMsgs.push({ t: Date.now() - cdpT0, type: m.type(), text: m.text().slice(0, 200) }); });
page.on('pageerror', (e) => pageErrors.push(String(e).slice(0, 300)));

const t0 = Date.now();
const mark = () => Date.now() - t0;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const withTimeout = (p, ms, label) => Promise.race([
  p,
  new Promise((_, rej) => setTimeout(() => rej(new Error('timeout:' + label + ':' + ms + 'ms')), ms)),
]);

const stage = {};
const domLog = [];
async function snap(tag) {
  try {
    const s = await withTimeout(page.evaluate(() => {
      const q = (sel) => !!document.querySelector(sel);
      const txt = document.body ? document.body.innerText : '';
      return { login: q('#login-username'), onb: q('[data-testid="onb2-saltar-todo"]'), tile: q('[data-testid="tile-registrar-unificado"]'), loader: q('#pre-loader'), head: txt.slice(0, 100).replace(/\n/g, ' | '), hash: location.hash || '/' };
    }), 6000, 'snap-eval');
    domLog.push({ tag, at: mark(), ...s });
    return s;
  } catch (e) {
    domLog.push({ tag, at: mark(), error: e.message });
    return null;
  }
}

stage.start = mark();
await withTimeout(page.goto(URL, { waitUntil: 'domcontentloaded', timeout: 60000 }), 70000, 'goto');
await snap('goto');
try { await withTimeout(page.waitForSelector('#login-username', { timeout: 30000 }), 35000, 'login-sel'); } catch (e) {}
stage.loginForm = mark();
await snap('login');
await withTimeout(page.fill('#login-username', USER), 10000, 'fill-u');
await withTimeout(page.fill('#login-password', PASS), 10000, 'fill-p');
stage.submit = mark();
await withTimeout(page.click('button[type="submit"]'), 10000, 'submit-click');
await snap('after-submit');

// Esperar hasta dashboard (tile) o fin de ventana (60 s)
let dash = null;
const dlDash = Date.now() + 60000;
while (Date.now() < dlDash) {
  await sleep(1500);
  const s = await snap('wait-dash+' + Math.round((mark() - stage.submit) / 1000) + 's');
  if (s && s.tile) { dash = s; stage.dashFirst = mark(); break; }
  if (s && s.onb) {
    // saltar onboarding
    try {
      await withTimeout(page.locator('[data-testid="onb2-saltar-todo"]').first().click({ timeout: 5000 }), 7000, 'skip-click');
    } catch (e) {}
  }
}
stage.dashWaitEnd = mark();

if (dash) {
  // dejar que la home asiente (clima, catálogo, sync)
  await sleep(8000);
  stage.settled = mark();
  await snap('settled');
}

const finalState = await snap('final');
const phases = await withTimeout(page.evaluate(() => {
  const paint = performance.getEntriesByType('paint').map((e) => ({ name: e.name, t: Math.round(e.startTime) }));
  const lcp = performance.getEntriesByType('largest-contentful-paint').map((e) => ({ t: Math.round(e.startTime), size: e.size || 0 }));
  const lt = performance.getEntriesByType('longtask').map((e) => ({ t: Math.round(e.startTime), d: Math.round(e.duration) }));
  return { fcp: paint.find((p) => p.name === 'first-contentful-paint')?.t || null, lcp: lcp.length ? lcp[lcp.length - 1] : null, longtasks: lt, blocking: lt.reduce((a, b) => a + Math.max(0, b.d - 50), 0) };
}).catch(() => ({ fcp: null, lcp: null, longtasks: [], blocking: 0 })), 6000, 'final-eval');

// Transición si hay dashboard: click en tile registrar → medir a pantalla nueva
let transition = null;
if (dash) {
  const sel = '[data-testid="tile-registrar-unificado"]';
  const beforeHash = await withTimeout(page.evaluate(() => location.hash || '/'), 5000, 'hash-before').catch(() => '/');
  const tt = mark();
  const ok = await withTimeout(page.click(sel, { timeout: 8000 }).then(() => true).catch(() => false), 10000, 'tile-click');
  if (ok) {
    let changed = false;
    const dl2 = Date.now() + 20000;
    while (Date.now() < dl2) {
      await sleep(400);
      const h = await withTimeout(page.evaluate(() => location.hash || '/'), 4000, 'hash-poll').catch(() => '/');
      if (h !== beforeHash) { changed = true; break; }
    }
    await sleep(4000);
    const after = await snap('trans-dest');
    transition = { ms: mark() - tt, hashBefore: beforeHash, hashAfter: changed ? after?.hash : null, changed, destHead: after?.head };
  }
}

const shotPath = `_gate/perf-${TAG}.png`;
try { await withTimeout(page.screenshot({ path: shotPath, fullPage: false }), 10000, 'shot'); } catch (e) {}

const post = reqs.filter((r) => r.t >= stage.submit);
const out = {
  tag: TAG, url: URL, user: USER,
  stages: stage,
  domLog,
  phases,
  transition,
  shotPath,
  requestsTotal: reqs.length,
  postSubmitReqs: post.length,
  statusCounts: post.reduce((a, r) => { const k = r.status == null ? 'none' : String(r.status); a[k] = (a[k] || 0) + 1; return a; }, {}),
  byUrlPost: Object.entries(post.reduce((a, r) => { const k = r.url.replace(URL, '').split('?')[0].slice(-90); a[k] = (a[k] || 0) + 1; return a; }, {})).sort((a, b) => b[1] - a[1]).slice(0, 30),
  consoleMsgs,
  jsErrors: pageErrors.slice(0, 10),
};
writeFileSync(OUT, JSON.stringify(out, null, 1));
console.log('WROTE', OUT);
console.log('loginForm@' + stage.loginForm + ' submit@' + stage.submit + ' dashFirst@' + stage.dashFirst + ' settled@' + stage.settled + ' end@' + stage.dashWaitEnd);
console.log('fcp=' + phases.fcp + ' lcp=' + (phases.lcp ? phases.lcp.t : null) + ' blocking=' + phases.blocking);
console.log('transition=' + JSON.stringify(transition));
console.log('postReqs=' + post.length + ' statuses=' + JSON.stringify(out.statusCounts));
await browser.close();
