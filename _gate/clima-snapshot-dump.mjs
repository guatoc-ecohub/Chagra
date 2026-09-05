import { chromium } from 'playwright';

const browser = await chromium.launch({
  headless: false,
  executablePath: process.env.CHROME_BIN || undefined,
  args: ['--no-sandbox', '--disable-dev-shm-usage'],
});
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
const payloads = [];
page.on('response', async (res) => {
  const u = res.url();
  if (/clima\/snapshot/.test(u)) {
    try {
      const body = await res.json();
      payloads.push({ url: u, status: res.status(), body });
    } catch (e) {
      payloads.push({ url: u, status: res.status(), err: String(e) });
    }
  }
});
await page.goto('https://chagra-dev.guatoc.co/#/mockups/mundo3d-clima', { waitUntil: 'domcontentloaded', timeout: 60000 });
await page.waitForTimeout(12000);

const cached = await page.evaluate(() => {
  try {
    const raw = localStorage.getItem('chagra:clima:snapshot') || sessionStorage.getItem('chagra:clima:snapshot') || 'NONE';
    return raw.slice(0, 500);
  } catch (e) { return 'err ' + e; }
});

console.log(JSON.stringify({ payloads, cachedProbe: cached }, null, 2).slice(0, 30000));
await browser.close();
