import { chromium } from 'playwright';
const NIX = '/nix/store/91whh0q5kgqi804ckhqmb4z1a1wx8x3j-chromium-151.0.7922.71/bin/chromium';
const browser = await chromium.launch({ headless: true, executablePath: NIX, args: ['--no-sandbox'] });
const page = await browser.newPage({ viewport: { width: 1180, height: 660 } });
const errs = [];
page.on('pageerror', (e) => errs.push(String(e)));
page.on('requestfailed', (r) => errs.push(`${r.url()} ${r.failure()?.errorText}`));
await page.goto('http://127.0.0.1:5249/tests/visual/portal-tinta-gate-harness.html?grande=145', { waitUntil: 'networkidle' });
await page.waitForSelector('[data-creature]');
await page.waitForTimeout(2500);
const g = await page.evaluate(() => {
  const secciones = [...document.querySelectorAll('section[data-compai]')].map((s) => {
    const r = s.getBoundingClientRect();
    return { compai: s.getAttribute('data-compai'), x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height) };
  });
  const bodyScroll = { w: document.body.scrollWidth, h: document.body.scrollHeight };
  return { totalCriaturas: document.querySelectorAll('[data-creature]').length, secciones, bodyScroll };
});
console.log(JSON.stringify(g, null, 1));
await browser.close();
