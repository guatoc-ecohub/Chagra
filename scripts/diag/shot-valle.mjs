import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import { setTimeout as sleep } from 'node:timers/promises';
import { mkdirSync } from 'node:fs';
import path from 'node:path';
const REPO = process.env.CHAGRA_REPO || process.cwd();
const PORT = 5201;
const BASE = `http://127.0.0.1:${PORT}`;
const srv = spawn('npx', ['vite', '--port', String(PORT), '--host', '127.0.0.1', '--strictPort'], { cwd: REPO, stdio: 'ignore' });
let up = false;
for (let i = 0; i < 60; i++) { try { await fetch(BASE + '/'); up = true; break; } catch {} await sleep(1000); }
if (!up) { console.log('SERVER_FAIL'); srv.kill('SIGKILL'); process.exit(1); }
const browser = await chromium.launch({ executablePath: '/run/current-system/sw/bin/chromium',
  args: ['--no-sandbox', '--disable-dev-shm-usage', '--enable-unsafe-swiftshader', '--use-gl=angle', '--use-angle=swiftshader'] });
const page = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
page.on('pageerror', (e) => console.log('PAGE_ERR:', String(e).slice(0, 300)));
await page.goto(BASE + '/#/mockups/entrada-3d', { waitUntil: 'load', timeout: 40000 });
await sleep(9000);
const SHOT = process.env.SHOT_OUT || path.join(process.cwd(), '.artifacts', 'valle-integracion.png');
mkdirSync(path.dirname(SHOT), { recursive: true });
await page.screenshot({ path: SHOT });
console.log('OK');
await browser.close();
srv.kill('SIGKILL');
