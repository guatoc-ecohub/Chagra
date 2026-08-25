/* eslint-disable no-undef -- arnés de gate (node + playwright), no código de la app */
/* Captura la vitrina de 5 estados (chromium nix, dsf=2) + lupas con sharp. */
import { chromium } from 'playwright';
import { execSync } from 'node:child_process';
import fs from 'node:fs';
import sharp from 'sharp';

const OUT = process.argv[2] || '/home/kortux/Workspace/Chagra-strategy/ops/revision-compai-2026-08-24/shots/zariguya-tinta';
const KNOWN = [
  '/nix/store/r7ifk1v95jfl02775kgbrd61dyr1rfsx-chromium-148.0.7778.178/bin/chromium',
  '/nix/store/9fjg59mab9j8c5r61dx2k5gcbd2f5mpm-chromium-148.0.7778.96/bin/chromium',
];
function resolveChromium() {
  if (process.env.CHROMIUM_PATH) return process.env.CHROMIUM_PATH;
  for (const p of KNOWN) { try { if (fs.existsSync(p)) return p; } catch { /* sigue */ } }
  return execSync('nix-shell -p chromium --run "which chromium"', { encoding: 'utf8', timeout: 120000 }).trim().split('\n').pop().trim();
}
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const browser = await chromium.launch({ executablePath: resolveChromium(), headless: true, args: ['--no-sandbox', '--disable-dev-shm-usage'] });
const ctx = await browser.newContext({ viewport: { width: 2260, height: 520 }, deviceScaleFactor: 2 });
const page = await ctx.newPage();
const consola = [];
page.on('console', (m) => consola.push(`${m.type()}: ${m.text()}`));
page.on('pageerror', (e) => consola.push(`pageerror: ${e.message}`));
await page.goto(`file://${process.cwd()}/_gate/zariguya-tinta/vitrina.html`, { waitUntil: 'networkidle' });
await sleep(2500);
await page.screenshot({ path: `${OUT}-5-estados.png`, fullPage: true });
await sleep(700);
await page.screenshot({ path: `${OUT}-5-estados-t1.png`, fullPage: true });
console.log('consola:', JSON.stringify(consola.slice(0, 10)));
await browser.close();

// Lupas sobre la celda idle (celda 1: x 10..440 css → *2 dsf) del t0.
// El SVG viewBox -30 -25 545 500 dentro de 430x430 (aspecto meet → escala 430/545).
const esc = 430 / 545; // px css por unidad viewBox
const off = (i) => 10 + i * (430 + 6); // x css de la celda i
// vertical: el svg se centra: alto útil = 500*esc = 394.5 → margen (430-394.5)/2 = 17.7
const offY = 10 + (430 - 500 * esc) / 2;
const lupa = async (name, i, vx, vy, vw, vh, zoom) => {
  const x = Math.round((off(i) + (vx + 30) * esc) * 2);
  const y = Math.round((offY + (vy + 25) * esc) * 2);
  const w = Math.round(vw * esc * 2), h = Math.round(vh * esc * 2);
  await sharp(`${OUT}-5-estados.png`).extract({ left: x, top: y, width: w, height: h })
    .resize(Math.round(w * zoom)).png().toFile(`${OUT}-${name}.png`);
  console.log('lupa', name);
};
await lupa('lupa-bigotes', 0, 60, 60, 320, 90, 2.2);
await lupa('lupa-cabeza-singorro', 0, 85, -12, 220, 165, 1.8);
await lupa('lupa-contorno-lomo', 0, 240, 80, 180, 200, 1.8);
await lupa('lupa-cola-manos', 0, 60, 210, 300, 180, 1.6);
console.log('OK');
