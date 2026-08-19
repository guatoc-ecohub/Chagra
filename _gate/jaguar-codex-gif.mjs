import { chromium } from 'playwright-core';
import { execFileSync } from 'node:child_process';
import { exigirPantallaViva, esperarMaquinaSola } from './herramientas/gate-pantalla.mjs';

await exigirPantallaViva({ medirFps: false });
const sola = await esperarMaquinaSola({ maxEspera: 5000 });
if (!sola) console.warn('[jaguar-gif] NO SÉ si la máquina quedó sola');

const chromiumPath = process.env.SHOT3D_CHROMIUM || execFileSync('sh', ['-c', 'command -v chromium || true'], { encoding: 'utf8' }).trim();
const browser = await chromium.launch({
  executablePath: chromiumPath || undefined,
  headless: false,
  args: ['--no-sandbox', '--ignore-gpu-blocklist', '--enable-webgl', '--hide-scrollbars'],
});
const page = await browser.newPage({ viewport: { width: 560, height: 560 }, deviceScaleFactor: 1 });
await page.goto('http://127.0.0.1:5380/_gate/jaguar-codex-gate.html?estado=caminando&size=420', { waitUntil: 'networkidle' });
await page.waitForTimeout(1200);
for (let i = 0; i < 3; i++) {
  await page.screenshot({ path: `_gate/jaguar-codex-warmup-${i}.png` });
  await page.waitForTimeout(100);
}
for (let i = 0; i < 24; i++) {
  await page.screenshot({ path: `_gate/jaguar-codex-f${String(i).padStart(2, '0')}.png` });
  await page.waitForTimeout(100);
}
await browser.close();
