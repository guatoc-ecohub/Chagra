import { chromium } from 'playwright-core';
import { existsSync } from 'node:fs';

const out = process.argv[2] || '_zar-work/harness-shot.png';
const scale = Number(process.argv[3] || 3);

let executablePath;
for (const p of [
  '/home/kortux/.local/bin/chromium',
]) { if (existsSync(p)) { executablePath = p; break; } }

const browser = await chromium.launch({ executablePath, headless: true });
const page = await browser.newPage({ viewport: { width: 700, height: 1050 }, deviceScaleFactor: scale });
await page.goto('file://' + process.cwd() + '/_zar-work/harness.html');
await page.waitForTimeout(150);
await page.screenshot({ path: out });
await browser.close();
console.log('wrote', out);
