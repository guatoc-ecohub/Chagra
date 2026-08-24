/*
 * shot.mjs — capturador GPU-headed del gate jaguar-humboldt.
 *   node _gate/jh/shot.mjs <url> <salida.png> [congelaS] [clip=x,y,w,h]
 * Congela con Web Animations API (pause + currentTime absoluto): preserva los
 * delays entre patas (el animation-delay global !important los aplastaría).
 * El parpadeo se clava aparte con ojos ABIERTOS (memoria del párpado).
 * Falla con exit!=0 ante page errors o request failures (fail-closed).
 */
import { chromium } from 'playwright';

const [url, salida, congelaS, clipArg] = process.argv.slice(2);
if (!url || !salida) {
  console.error('uso: node shot.mjs <url> <salida.png> [congelaS] [clip=x,y,w,h]');
  process.exit(2);
}

const browser = await chromium.launch({ headless: false, executablePath: '/home/kortux/.local/bin/chromium' });
const page = await browser.newPage({ viewport: { width: 900, height: 900 }, deviceScaleFactor: 1 });
const errores = [];
page.on('pageerror', (e) => errores.push(`pageerror: ${e}`));
page.on('requestfailed', (r) => errores.push(`requestfailed: ${r.url()}`));
await page.goto(url, { waitUntil: 'networkidle' });
await page.waitForSelector('body[data-listo="1"]', { timeout: 10000 });
await page.waitForTimeout(300);

if (congelaS && Number(congelaS) >= 0) {
  await page.evaluate((t) => {
    for (const a of document.getAnimations({ subtree: true })) {
      a.pause();
      a.currentTime = /blink|parpad|guin|ojo/i.test(a.animationName || '') ? 10 : t * 1000;
    }
  }, Number(congelaS));
  await page.waitForTimeout(150);
}

const opts = { path: salida };
if (clipArg && clipArg.startsWith('clip=')) {
  const [x, y, w, h] = clipArg.slice(5).split(',').map(Number);
  opts.clip = { x, y, width: w, height: h };
  await page.screenshot(opts);
} else {
  /* clip de PAGINA inflado a la derecha: los bigotes/trufa desbordan el
     viewBox (overflow visible) y el screenshot del elemento los mocha. */
  const svg = await page.$('svg[data-creature="jaguar"]');
  if (svg) {
    const b = await svg.boundingBox();
    opts.clip = { x: b.x - 10, y: b.y - 10, width: b.width + 95, height: b.height + 20 };
  }
  await page.screenshot(opts);
}
await browser.close();

if (errores.length) {
  console.error(JSON.stringify({ ok: false, errores }, null, 2));
  process.exit(1);
}
console.log(JSON.stringify({ ok: true, salida }));
