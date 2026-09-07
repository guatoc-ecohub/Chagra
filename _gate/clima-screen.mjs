import { chromium } from 'playwright';

const url = process.argv[2];
const shot = process.argv[3] || '_gate/capturas-clima/screen.png';
const waitMs = Number(process.env.WAIT_MS || 14000);
const headed = process.env.HEADED !== '0';

const browser = await chromium.launch({
  headless: !headed,
  executablePath: process.env.CHROME_BIN || undefined,
  args: ['--no-sandbox', '--disable-dev-shm-usage'],
});
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

const consoleLogs = [];
const pageErrors = [];
const failedRequests = [];
const climaRequests = [];
page.on('console', (msg) => consoleLogs.push(`[${msg.type()}] ${msg.text()}`));
page.on('pageerror', (err) => pageErrors.push(String(err)));
page.on('requestfailed', (req) => failedRequests.push(`${req.method()} ${req.url()} :: ${req.failure()?.errorText}`));
page.on('response', (res) => {
  const u = res.url();
  if (/clima|open.?meteo|snapshot|enso|atmosphere|weather/i.test(u)) {
    climaRequests.push(`${res.status()} ${res.request().method()} ${u}`);
  }
});
page.on('request', (req) => {
  const u = req.url();
  if (/clima|open.?meteo|snapshot|enso|atmosphere|weather/i.test(u)) {
    climaRequests.push(`REQ ${req.method()} ${u}`);
  }
});

const resp = await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });
await page.waitForTimeout(waitMs);
await page.screenshot({ path: shot, fullPage: true });

const result = await page.evaluate(() => {
  const txt = (sel) => Array.from(document.querySelectorAll(sel)).map((e) => e.innerText.trim());
  const cards = txt('[data-testid^="clima-sugerencia-"]');
  const metrics = Array.from(document.querySelectorAll('[data-testid^="clima-metrica-"]')).map((e) => {
    const label = e.querySelector('span')?.innerText || e.getAttribute('data-testid');
    const strong = e.querySelector('strong')?.innerText || '';
    return `${label}=${strong}`;
  });
  const body = document.body ? document.body.innerText : '';
  const selText = (sel) => {
    const el = document.querySelector(sel);
    return el ? el.innerText.slice(0, 2000) : null;
  };
  return {
    hash: location.hash,
    cards,
    metrics,
    conSenalText: txt('.m3dc__crop-count'),
    radarTitle: txt('#m3dc-crop-radar-title, #m3dc-crop-n-title'),
    radarSection: !!document.querySelector('[data-testid="clima-sugerencias"]'),
    bodyText: body.slice(0, 6000),
    hud: selText('.m3dc__hud'),
    radarIntro: selText('.m3dc__crop-radar-intro'),
  };
});

console.log(JSON.stringify({
  url: resp?.url(), status: resp?.status(),
  headed,
  consoleLogs: consoleLogs.slice(0, 60),
  pageErrors: pageErrors.slice(0, 20),
  failedRequests: failedRequests.slice(0, 30),
  climaRequests: [...new Set(climaRequests)].slice(0, 60),
  dom: result,
}, null, 2));

await browser.close();
