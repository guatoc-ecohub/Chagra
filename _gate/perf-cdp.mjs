import { chromium } from 'playwright-core';
import { writeFileSync } from 'node:fs';

const URL = process.env.PROBE_URL || 'https://chagra-dev.guatoc.co/';
const TAG = process.env.PROBE_TAG || 'cdp';
const OUT = process.env.PROBE_OUT || `_gate/perf-${TAG}.json`;
const EXE = process.env.PROBE_EXE || null;

const browser = await chromium.launch({
  headless: true,
  ...(EXE ? { executablePath: EXE } : {}),
  args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu', '--disable-dev-shm-usage', '--single-process'],
});

const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
const page = await context.newPage();

const cdp = await context.newCDPSession(page);
await cdp.send('Network.enable');
await cdp.send('Page.enable');
await cdp.send('Performance.enable');

const reqs = new Map();
const events = [];

cdp.on('Network.requestWillBeSent', (e) => {
  const init = e.initiator || {};
  reqs.set(e.requestId, {
    url: e.request.url,
    method: e.request.method,
    initiatorType: init.type || '?',
    initiatorUrl: (init.url || '').slice(0, 180),
    stackTop: init.stack && init.stack.callFrames && init.stack.callFrames.length ? init.stack.callFrames.slice(0, 3).map((f) => `${f.functionName || '<anon>'}`).join('>') : '',
    requestTime: e.wallTime,
    ts: Date.now(),
  });
});
cdp.on('Network.responseReceived', (e) => {
  const r = reqs.get(e.requestId);
  if (!r) return;
  r.status = e.response.status;
  r.mime = (e.response.mimeType || '').split(';')[0];
  r.timing = e.response.timing || null;
});
cdp.on('Network.loadingFinished', (e) => {
  const r = reqs.get(e.requestId);
  if (!r) return;
  r.encodedDataLength = e.encodedDataLength;
  r.finishedTs = Date.now();
});

const pageErrors = [];
page.on('pageerror', (err) => pageErrors.push(String(err).slice(0, 300)));
const consoleWarn = [];
page.on('console', (m) => {
  if (m.type() === 'error' || m.type() === 'warning') consoleWarn.push(`[${m.type()}] ${m.text().slice(0, 200)}`);
});

const t0 = Date.now();
if (process.env.PROBE_PREWARM === '1') {
  await page.goto(URL, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForTimeout(9000);
  await page.goto(URL, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForTimeout(3000);
}
await page.goto(URL, { waitUntil: 'domcontentloaded', timeout: 60000 });
const tLoad = Date.now();
const loginTextT = await (async () => {
  const deadline = Date.now() + 20000;
  while (Date.now() < deadline) {
    const has = await page.evaluate(() => (document.body ? document.body.innerText.includes('Ingrese con el usuario') : false)).catch(() => false);
    if (has) return Date.now() - t0;
    await new Promise((r) => setTimeout(r, 100));
  }
  return null;
})();
await page.waitForTimeout(20000);
const tEnd = Date.now();

const domInfo = await page.evaluate(() => ({
  url: location.href,
  title: document.title,
  bodyText: (document.body ? document.body.innerText : '').slice(0, 500),
  rootKids: document.getElementById('root')?.children?.length || 0,
  buildSha: window.__CHAGRA_BUILD_SHA__ || null,
  fcp: (performance.getEntriesByType('paint').find((p) => p.name === 'first-contentful-paint') || {}).startTime || null,
  lcpEntries: performance.getEntriesByType('largest-contentful-paint').map((e) => Math.round(e.startTime)),
  nav: performance.getEntriesByType('navigation')[0] ? {
    ttfb: Math.round(performance.getEntriesByType('navigation')[0].responseStart),
    dcl: Math.round(performance.getEntriesByType('navigation')[0].domContentLoadedEventEnd),
  } : null,
}));

const byInitiator = {};
const list = [];
for (const [id, r] of reqs) {
  const ttfb = r.timing ? Math.round((r.timing.receiveHeadersEnd - r.timing.requestTime) * 1000) : null;
  const rec = {
    deltaMs: Math.round(r.ts - t0),
    url: r.url.replace(URL, '').slice(0, 160),
    initiator: r.initiatorType,
    initiatorUrl: r.initiatorUrl.replace(URL, '').slice(0, 100),
    stack: r.stackTop,
    status: r.status,
    ttfbMs: ttfb,
    bytes: r.encodedDataLength || 0,
  };
  list.push(rec);
  const key = r.initiatorUrl || r.initiatorType;
  byInitiator[key] = byInitiator[key] || { count: 0, bytes: 0 };
  byInitiator[key].count += 1;
  byInitiator[key].bytes += rec.bytes || 0;
}
list.sort((a, b) => a.deltaMs - b.deltaMs);

const result = {
  tag: TAG,
  url: URL,
  domInfo,
  t0: t0,
  tLoad: tLoad - t0,
  loginTextMs: loginTextT,
  tEnd: tEnd - t0,
  totalRequests: list.length,
  byInitiator: Object.entries(byInitiator).sort((a, b) => b[1].count - a[1].count).slice(0, 40),
  requestList: list,
  pageErrors,
  consoleWarn: consoleWarn.slice(0, 30),
};

writeFileSync(OUT, JSON.stringify(result, null, 1));
console.log('WROTE', OUT);
console.log('totalReq=', list.length, 'dom=', JSON.stringify(domInfo));
const grouped = {};
for (const l of list) {
  const k = l.status === 304 || l.status === 200 ? 'ok' : String(l.status);
  grouped[k] = (grouped[k] || 0) + 1;
}
console.log('status=', JSON.stringify(grouped));
console.log('ttfbMedianByBigger=', null);

await browser.close();
