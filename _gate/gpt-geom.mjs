import { chromium } from 'playwright';
const BASE = 'http://127.0.0.1:5249';
const NIX = '/nix/store/91whh0q5kgqi804ckhqmb4z1a1wx8x3j-chromium-151.0.7922.71/bin/chromium';
const browser = await chromium.launch({ headless: true, executablePath: NIX, args: ['--no-sandbox'] });
for (const tipo of ['zariguya','luciernaga','chivito-punk','oso-baston']) {
  const page = await browser.newPage({ viewport: { width: 1000, height: 1200 } });
  await page.goto(`${BASE}/tests/visual/portal-tinta-gate-harness.html?tipo=${tipo}&grande=300`, { waitUntil: 'networkidle' });
  await page.waitForSelector('[data-creature]');
  await page.waitForTimeout(2000);
  const g = await page.evaluate(() => {
    const sec = document.querySelector('section[data-compai]');
    const s = sec.getBoundingClientRect();
    const rot = document.querySelector('[data-rotulo]').getBoundingClientRect();
    return { sec: { x: Math.round(s.x), y: Math.round(s.y), w: Math.round(s.width), h: Math.round(s.height) }, rotTop: Math.round(rot.top), rotH: Math.round(rot.height) };
  });
  console.log(tipo, JSON.stringify(g));
  await page.close();
}
await browser.close();
