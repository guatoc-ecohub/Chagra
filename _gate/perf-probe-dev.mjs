import { chromium } from 'playwright-core';
import { writeFileSync } from 'node:fs';

const URL = process.env.PROBE_URL || 'https://chagra-dev.guatoc.co/';
const TAG = process.env.PROBE_TAG || 'run';
const INJECT_SESSION = process.env.PROBE_SESSION === '1';
const OUT = process.env.PROBE_OUT || `_gate/perf-${TAG}.json`;
const BLOCK_SW = process.env.PROBE_BLOCK_SW === '1';
const PREWARM = process.env.PROBE_PREWARM === '1';

const EXE = process.env.PROBE_EXE || null;
const browser = await chromium.launch({
  headless: true,
  ...(EXE ? { executablePath: EXE } : {}),
  args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu', '--disable-dev-shm-usage', '--single-process'],
});

const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });

const initScript = `
{
  const win = window;
  win.__perf = { paints: [], lcp: [], longtasks: [], layoutShifts: [], inputs: [] };
  const push = (arr) => (e) => arr.push({ t: Math.round(e.startTime), d: Math.round(e.duration || 0) });
  try {
    new PerformanceObserver((l) => l.getEntries().forEach((e) => {
      if (e.entryType === 'paint') win.__perf.paints.push({ name: e.name, t: Math.round(e.startTime) });
    })).observe({ type: 'paint', buffered: true });
  } catch (e) {}
  try {
    new PerformanceObserver((l) => l.getEntries().forEach((e) => {
      win.__perf.lcp.push({ t: Math.round(e.startTime), size: e.size || 0, id: e.id || '' });
    })).observe({ type: 'largest-contentful-paint', buffered: true });
  } catch (e) {}
  try {
    new PerformanceObserver((l) => l.getEntries().forEach((e) => {
      win.__perf.longtasks.push({ t: Math.round(e.startTime), d: Math.round(e.duration), blocking: Math.round(Math.max(0, e.duration - 50)) });
    })).observe({ type: 'longtask', buffered: true });
  } catch (e) {}
  try {
    new PerformanceObserver((l) => l.getEntries().forEach((e) => {
      win.__perf.layoutShifts.push({ t: Math.round(e.startTime), value: e.value || 0 });
    })).observe({ type: 'layout-shift', buffered: true });
  } catch (e) {}
}
`;

await context.addInitScript({ content: initScript });

if (INJECT_SESSION) {
  await context.addInitScript({ content: `
    {
      const start = indexedDB;
      const open = () => new Promise((res) => {
        const req = indexedDB.open('chagra', 1);
        req.onupgradeneeded = () => { try { req.result.createObjectStore('keyvaluepairs'); } catch (e) {} };
        req.onsuccess = () => res(req.result);
        req.onerror = () => res(null);
      });
      const seed = async () => {
        const db = await open();
        if (!db) return;
        const tx = db.transaction('keyvaluepairs', 'readwrite');
        const st = tx.objectStore('keyvaluepairs');
        const fake = 'faketoken-perfprobe-' + Date.now();
        st.put('Bearer ' + fake, 'farmos_access_token');
        st.put(Date.now() + 2 * 60 * 60 * 1000, 'farmos_token_expiry');
        st.put('fakerefresh', 'farmos_refresh_token');
      };
      window.addEventListener('DOMContentLoaded', () => { seed().catch(() => {}); });
    }
  `});
}

const page = await context.newPage();
if (BLOCK_SW) {
  await page.route('**/sw.js', (route) => route.abort('blockedbyclient'));
}
if (PREWARM) {
  await page.goto(URL, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForTimeout(9000);
  await page.reload({ waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForTimeout(3000);
}
const consoleLogs = [];
const failures = [];
const badResponses = [];
const jsErrors = [];

page.on('console', (msg) => {
  const text = msg.text();
  if (consoleLogs.length < 200) consoleLogs.push(`[${msg.type()}] ${text.slice(0, 300)}`);
});
page.on('pageerror', (err) => {
  jsErrors.push(String(err).slice(0, 400));
});
page.on('requestfailed', (req) => {
  failures.push({ url: req.url().slice(0, 160), err: req.failure()?.errorText || 'unknown' });
});
page.on('response', (res) => {
  if (res.status() >= 400) {
    badResponses.push({ url: res.url().slice(0, 160), status: res.status() });
  }
});

const t0 = Date.now();
consoleLogs.length = 0;
failures.length = 0;
badResponses.length = 0;
jsErrors.length = 0;
await page.goto(URL, { waitUntil: 'domcontentloaded', timeout: 60000 });

const loaderGone = async () => {
  try {
    const val = await page.evaluate(() => {
      const loader = document.getElementById('pre-loader');
      const rootKids = (document.getElementById('root')?.children?.length || 0);
      return { loaderGone: !loader, rootKids };
    });
    return val;
  } catch (e) {
    return { loaderGone: true, rootKids: -1 };
  }
};

let pollRes = null;
const pollDeadline = Date.now() + 30000;
while (Date.now() < pollDeadline) {
  const v = await loaderGone();
  if (v.loaderGone && v.rootKids > 0) { pollRes = v; break; }
  await new Promise((r) => setTimeout(r, 250));
}

const waitUntil = Date.now() + 6000;
while (Date.now() < waitUntil) {
  await new Promise((r) => setTimeout(r, 500));
}

const metrics = await page.evaluate(() => {
  const nav = performance.getEntriesByType('navigation')[0];
  const toMs = (n) => (n == null ? null : Math.round(n));
  const navTimes = nav ? {
    ttfb: toMs(nav.responseStart),
    domInteractive: toMs(nav.domInteractive),
    domContentLoaded: toMs(nav.domContentLoadedEventEnd),
    loadEventEnd: toMs(nav.loadEventEnd),
    transferSize: nav.transferSize,
  } : null;

  const resources = performance.getEntriesByType('resource').map((r) => ({
    url: r.name.slice(0, 200),
    initiator: r.initiatorType,
    dur: toMs(r.duration),
    encoded: r.encodedBodySize || 0,
    decoded: r.decodedBodySize || 0,
    transfer: r.transferSize || 0,
  }));

  const perf = window.__perf || {};
  const lcp = perf.lcp.length ? perf.lcp[perf.lcp.length - 1] : null;
  const fcp = (perf.paints.find((p) => p.name === 'first-contentful-paint')) || null;
  const longTasks = perf.longtasks;
  const blocking = longTasks.reduce((a, b) => a + (b.blocking || 0), 0);
  const cls = perf.layoutShifts.reduce((a, b) => a + (b.value || 0), 0);

  const byType = {};
  for (const r of resources) {
    const cat = r.initiator === 'script' ? 'script' : r.initiator === 'link' ? 'link/css' : r.initiator === 'img' ? 'img' : r.initiator === 'fetch' || r.initiator === 'xmlhttprequest' ? 'xhr/fetch' : r.initiator;
    byType[cat] = byType[cat] || { count: 0, bytes: 0 };
    byType[cat].count += 1;
    byType[cat].bytes += r.encoded || r.transfer;
  }

  return {
    url: location.href,
    title: document.title,
    buildSha: window.__CHAGRA_BUILD_SHA__ || null,
    hasRoot: !!document.getElementById('root'),
    rootKids: document.getElementById('root')?.children?.length || 0,
    navTimes,
    fcp: fcp ? fcp.t : null,
    lcp: lcp ? { t: lcp.t, size: lcp.size } : null,
    longTasks: longTasks.slice(0, 40),
    longTaskCount: longTasks.length,
    totalBlockingMs: blocking,
    cls,
    totalResources: resources.length,
    totalBytesEncoded: resources.reduce((a, r) => a + (r.encoded || 0), 0),
    byType,
    topResources: [...resources].sort((a, b) => (b.encoded || 0) - (a.encoded || 0)).slice(0, 20),
    slowResources: [...resources].sort((a, b) => b.dur - a.dur).slice(0, 20),
  };
});

const shotPath = `_gate/perf-${TAG}.png`;
try {
  await page.screenshot({ path: shotPath, fullPage: false });
} catch (e) {
  console.log('screenshot-failed:' + e.message);
}

const swState = await page.evaluate(async () => {
  if (!('serviceWorker' in navigator)) return { supported: false };
  const regs = await navigator.serviceWorker.getRegistrations().catch(() => []);
  return {
    supported: true,
    count: regs.length,
    controller: !!navigator.serviceWorker.controller,
    active: regs.map((r) => r.active?.state || null),
  };
}).catch(() => ({ supported: false }));

const result = {
  tag: TAG,
  url: URL,
  injectedSession: INJECT_SESSION,
  wallclockMs: Date.now() - t0,
  pollRes,
  metrics,
  swState,
  consoleLogs: consoleLogs.slice(0, 60),
  jsErrors: jsErrors.slice(0, 20),
  requestFailures: failures.slice(0, 30),
  badResponses: badResponses.slice(0, 40),
  shotPath,
};

writeFileSync(OUT, JSON.stringify(result, null, 2));
console.log('WROTE ' + OUT);
console.log('fcp=' + metrics.fcp + ' lcp=' + (metrics.lcp ? metrics.lcp.t : null) +
  ' ttfb=' + (metrics.navTimes && metrics.navTimes.ttfb) +
  ' longTasks=' + metrics.longTaskCount + ' blockingMs=' + metrics.totalBlockingMs +
  ' resources=' + metrics.totalResources + ' bytes=' + metrics.totalBytesEncoded +
  ' console=' + consoleLogs.length + ' jsErrors=' + jsErrors.length +
  ' reqFail=' + failures.length + ' badHttp=' + badResponses.length +
  ' url=' + metrics.url);

await browser.close();
