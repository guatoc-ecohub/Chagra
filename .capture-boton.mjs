// Captura la página #/mockups/boton-anarquia con reduced-motion (estado final = A armada)
// y también sin reduced-motion en mitad del hold, para verificar por visión.
import { chromium } from 'playwright';

const OUT = process.env.OUT_DIR || '/tmp/claude-1000/-home-kortux-Workspace-chagra/93695a3d-dc16-45f5-8c0e-608e6e767ffd/scratchpad';
const URL = process.env.TARGET_URL || 'http://localhost:5317/#/mockups/boton-anarquia';

const browser = await chromium.launch({
  executablePath: '/run/current-system/sw/bin/chromium',
  args: ['--no-sandbox', '--disable-dev-shm-usage'],
});

// 1) reduced-motion: fotograma final (A ensamblada, quieta)
const ctx = await browser.newContext({
  viewport: { width: 1280, height: 2400 },
  reducedMotion: 'reduce',
  deviceScaleFactor: 2,
});
const page = await ctx.newPage();
await page.goto(URL, { waitUntil: 'networkidle' });
await page.waitForSelector('.ba-grid .ba-card', { timeout: 15000 });
await page.waitForTimeout(1200);

// página completa
await page.screenshot({ path: `${OUT}/ba-page-full.png`, fullPage: true });

// cada tarjeta (demo grande + tamaños reales)
const cards = await page.$$('.ba-card');
for (let i = 0; i < cards.length; i++) {
  await cards[i].screenshot({ path: `${OUT}/ba-card-${i + 1}.png` });
}

// fila de tamaño real de cada tarjeta (64/44px) ampliada por dsf=2
const reals = await page.$$('.ba-real');
for (let i = 0; i < reals.length; i++) {
  await reals[i].screenshot({ path: `${OUT}/ba-real-${i + 1}.png` });
}

// sección de comparación antes(X)/ahora(A)
const cmp = await page.$('.ba-compare');
if (cmp) await cmp.screenshot({ path: `${OUT}/ba-compare.png` });
await ctx.close();

// 2) sin reduced-motion: capturar en mitad del HOLD de cada variante
const ctx2 = await browser.newContext({ viewport: { width: 1280, height: 2400 }, deviceScaleFactor: 2 });
const page2 = await ctx2.newPage();
await page2.goto(URL, { waitUntil: 'networkidle' });
await page2.waitForSelector('.ba-grid .ba-card', { timeout: 15000 });
// holds: b1 4.0-6.8s de 7.2 | b2 5.6-7.6 de 8 | b3 3.35-5.64 de 6
// capturamos a t=5.2s tras el load: b1 en hold, b2 casi, b3 en hold (2do ciclo variará)
await page2.waitForTimeout(5200);
const cards2 = await page2.$$('.ba-card');
for (let i = 0; i < cards2.length; i++) {
  await cards2[i].screenshot({ path: `${OUT}/ba-anim-hold-${i + 1}.png` });
}
await ctx2.close();
await browser.close();
console.log('OK capturas listas');
