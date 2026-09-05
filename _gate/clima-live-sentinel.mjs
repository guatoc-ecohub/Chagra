import { chromium } from 'playwright';

const SENTINELS = ['agrosavia_fresa', 'agrosavia_invernadero', 'gulupa-invernadero', 'Demanda agroecol', 'fichaAgroclimatica'];

const browser = await chromium.launch({
  headless: false,
  executablePath: process.env.CHROME_BIN || undefined,
  args: ['--no-sandbox', '--disable-dev-shm-usage'],
});
const page = await browser.newPage();
await page.goto('https://chagra-dev.guatoc.co/#/mockups/mundo3d-clima', { waitUntil: 'domcontentloaded', timeout: 60000 });
await page.waitForTimeout(10000);
const scripts = await page.evaluate(() => {
  const fromPerf = performance.getEntriesByType('resource').map((e) => e.name).filter((u) => /\.js(\?|$)/.test(u));
  const fromDom = Array.from(document.scripts).map((s) => s.src).filter(Boolean);
  return [...new Set([...fromDom, ...fromPerf])];
});
const base = 'https://chagra-dev.guatoc.co/';
const hits = [];
for (const src of scripts) {
  try {
    const res = await fetch(src);
    const txt = await res.text();
    const found = SENTINELS.filter((s) => txt.includes(s));
    if (found.length) hits.push({ src: src.replace(base, ''), size: txt.length, found });
  } catch (e) {
    hits.push({ src: src.replace(base, ''), err: String(e).slice(0, 80) });
  }
}
console.log(JSON.stringify({ totalScripts: scripts.length, hits }, null, 2));
await browser.close();
