import { chromium } from 'playwright';

const url = process.argv[2] || 'https://chagra-dev.guatoc.co/';
const shot = process.argv[3] || '_gate/capturas-clima/base.png';
const headed = process.env.HEADED !== '0';
const waitMs = Number(process.env.WAIT_MS || 8000);

const browser = await chromium.launch({
  headless: !headed,
  executablePath: process.env.CHROME_BIN || undefined,
  args: ['--no-sandbox', '--disable-dev-shm-usage'],
});
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

const consoleLogs = [];
const pageErrors = [];
const failedRequests = [];
page.on('console', (msg) => consoleLogs.push(`[${msg.type()}] ${msg.text()}`));
page.on('pageerror', (err) => pageErrors.push(String(err)));
page.on('requestfailed', (req) => failedRequests.push(`${req.method()} ${req.url()} :: ${req.failure()?.errorText}`));

const resp = await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 45000 });
await page.waitForTimeout(waitMs);

const title = await page.title();
const bodyText = (await page.evaluate(() => document.body ? document.body.innerText : '')).slice(0, 3000);
const hash = await page.evaluate(() => location.hash);
const hasIndexedDB = await page.evaluate(async () => {
  try {
    const dbs = await indexedDB.databases();
    return dbs.map((d) => d.name);
  } catch (e) {
    return `err:${e}`;
  }
});

await page.screenshot({ path: shot, fullPage: true });

console.log(JSON.stringify({
  url: resp?.url(),
  status: resp?.status(),
  title,
  hash,
  headed: !headed,
  consoleLogs: consoleLogs.slice(0, 40),
  pageErrors: pageErrors.slice(0, 20),
  failedRequests: failedRequests.slice(0, 30),
  indexedDB: hasIndexedDB,
  bodyText,
}, null, 2));

await browser.close();
