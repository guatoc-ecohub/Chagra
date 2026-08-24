/* shots.mjs — capturas del gate 2.5D DOM con esperas REALES (playwright);
   virtual-time no mueve rAF ni fases CSS (memoria de la casa). NO versionado. */
import { chromium } from 'playwright';
import { execSync } from 'node:child_process';

const BASE = 'http://127.0.0.1:5187/_gate/chivito-punk-lamina/solo.html';
const OUT = '_gate/chivito-punk-lamina/';
const CH = execSync('command -v chromium').toString().trim();

const SHOTS = [
  ['shot-quieto-vs-ref', '?animated=0&ref=1&size=420', 1200],
  ['shot-parpado-cerrado', '?fase=parpado&size=420', 1200],
  ['shot-habla-jaw', '?fase=jaw&size=420', 1200],
  ['shot-habla-viva', '?estado=speaking&visema=V3&size=420', 1450],
  ['shot-escucha', '?estado=listening&size=420', 1600],
  ['shot-piensa', '?estado=thinking&size=420', 2600],
  ['shot-vida-rockea', '?vida=rockea&size=420', 1520],
  ['shot-vida-apunta', '?vida=apunta&size=420', 1450],
  ['shot-caminando', '?estado=caminando&size=420', 1300],
  ['shot-control-roto', '?romper=cabeza&size=420', 1200],
  ['shot-control-roto-mano', '?romper=mano&size=420', 1200],
];

const browser = await chromium.launch({ executablePath: CH, headless: true });
const page = await browser.newPage({ viewport: { width: 900, height: 760 } });
const errores = [];
page.on('pageerror', (e) => errores.push(`pageerror: ${e.message}`));
page.on('console', (m) => { if (m.type() === 'error') errores.push(`console: ${m.text()}`); });
page.on('requestfailed', (r) => errores.push(`reqfail: ${r.url()}`));

for (const [nombre, query, esperaMs] of SHOTS) {
  await page.goto(BASE + query, { waitUntil: 'networkidle' });
  // espera REAL: deja hornear las capas (img.onload + canvas) y entrar la fase
  await page.waitForTimeout(esperaMs);
  await page.screenshot({ path: `${OUT}${nombre}.png` });
  console.log(`${nombre}.png`);
}
await browser.close();
if (errores.length) {
  console.log('ERRORES DE PÁGINA:');
  for (const e of errores) console.log('  ' + e);
} else {
  console.log('0 page errors / 0 console errors / 0 request failures');
}
