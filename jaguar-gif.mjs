import { chromium } from 'playwright-core';
import { execSync } from 'node:child_process';

const D = process.argv[2];
const URL = process.argv[3] || 'http://127.0.0.1:5199/jaguar-lv-gate.html?estado=caminando';
let exe = '';
try { exe = execSync("ls -d /nix/store/*chromium*/bin/chromium 2>/dev/null | head -1").toString().trim(); } catch {}

const browser = await chromium.launch({
  executablePath: exe || undefined,
  headless: true,
  args: ['--no-sandbox', '--disable-gpu', '--hide-scrollbars'],
});
const page = await browser.newPage({ viewport: { width: 520, height: 520 }, deviceScaleFactor: 1 });
await page.goto(URL, { waitUntil: 'networkidle' });
await page.waitForTimeout(1200);
const N = 18;
for (let i = 0; i < N; i++) {
  await page.screenshot({ path: `${D}/f${String(i).padStart(2, '0')}.png` });
  await page.waitForTimeout(100);
}
await browser.close();
console.log(`frames ${N} listos`);
