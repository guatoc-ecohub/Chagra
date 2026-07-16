// Capturas del arnés diag del hato (scripts/diag/hato.html) con chromium del
// sistema + swiftshader, sirviendo ESTE worktree con `vite dev`.
// Uso: node scripts/diag/shot-hato.mjs <etiqueta> [vista...]
import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import { setTimeout as sleep } from 'node:timers/promises';
import { fileURLToPath } from 'node:url';
import { tmpdir } from 'node:os';
import path from 'node:path';

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const OUTDIR = process.env.SHOT_OUTDIR || tmpdir();
const PORT = 5199;
const BASE = `http://127.0.0.1:${PORT}`;
const [etiqueta = 'x', ...vistasArg] = process.argv.slice(2);
const VISTAS = vistasArg.length ? vistasArg : ['general', 'vaca', 'cerdos', 'ovejas', 'gallinas', 'perro'];

const srv = spawn('npx', ['vite', '--port', String(PORT), '--host', '127.0.0.1', '--strictPort'], {
  cwd: REPO, stdio: 'ignore', env: { ...process.env, BROWSER: 'none' },
});
let up = false;
for (let i = 0; i < 60; i++) {
  try { await fetch(BASE + '/'); up = true; break; } catch { /* aún no */ }
  await sleep(1000);
}
if (!up) { console.log('SERVER_FAIL'); srv.kill('SIGKILL'); process.exit(1); }
await sleep(1500);

const browser = await chromium.launch({
  executablePath: '/run/current-system/sw/bin/chromium',
  args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage',
    '--enable-unsafe-swiftshader', '--use-gl=angle', '--use-angle=swiftshader', '--ignore-gpu-blocklist'],
});
const page = await browser.newPage({ viewport: { width: 640, height: 640 }, deviceScaleFactor: 2 });
page.on('console', (m) => { if (m.type() === 'error') console.log('CONSOLE_ERR:', m.text().slice(0, 300)); });
page.on('pageerror', (e) => console.log('PAGE_ERR:', String(e).slice(0, 300)));
for (const vista of VISTAS) {
  try {
    await page.goto(`${BASE}/scripts/diag/hato.html?vista=${vista}`, { waitUntil: 'load', timeout: 40000 });
    await sleep(5000);
    const f = path.join(OUTDIR, `hato-${etiqueta}-${vista}.png`);
    await page.screenshot({ path: f, timeout: 60000 });
    console.log('OK', vista, f);
  } catch (e) { console.log('FAIL', vista, String(e).slice(0, 120)); }
}
await browser.close();
srv.kill('SIGKILL');
console.log('DONE');
