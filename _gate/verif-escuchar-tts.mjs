import { chromium } from 'playwright';
const TARGET_URL = 'http://localhost:5190/#directorio';
async function main() {
  const browser = await chromium.launch({
    executablePath: '/home/kortux/.local/bin/chromium',
    headless: true,
    args: ['--no-sandbox', '--disable-dev-shm-usage', '--disable-gpu', '--disable-software-rasterizer'],
  });
  const ctx = await browser.newContext({ viewport: { width: 430, height: 900 }, locale: 'es-CO' });
  const page = await ctx.newPage();
  const errs = [];
  page.on('console', (m) => { if (m.type() === 'error') errs.push(m.text()); });
  page.on('pageerror', (e) => errs.push('pageerror: ' + e.message));
  const origin = new URL(TARGET_URL).origin;
  await page.goto(`${origin}/`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1200);
  const authSrc = await (await fetch(`${origin}/src/services/authService.js`)).text();
  const vMatch = authSrc.match(/localforage\.js\?v=([a-f0-9]+)/);
  await page.evaluate(async (v) => {
    const mod = await import(`/node_modules/.vite/deps/localforage.js?v=${v}`);
    await mod.default.setItem('farmos_access_token', 'verif-escuchar-fake');
    await mod.default.setItem('farmos_token_expiry', Date.now() + 86400000);
  }, vMatch[1]);
  await page.evaluate((hash) => { location.hash = hash; window.dispatchEvent(new HashChangeEvent('hashchange')); }, '#directorio');
  await page.waitForTimeout(2500);
  const fab = page.locator('button[aria-label*="Chagra IA" i]');
  await fab.click();
  await page.waitForTimeout(200);
  await page.getByRole('menuitem', { name: /Escuchar/i }).click();
  await page.waitForTimeout(1500);
  console.log('CONSOLE/PAGE ERRORS tras "Escuchar":', JSON.stringify(errs));
  await browser.close();
}
main().catch((e) => { console.error('FATAL', e); process.exit(1); });
