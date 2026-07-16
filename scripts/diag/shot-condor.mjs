// Capturas del arnés diag del cóndor (scripts/diag/condor.html) con chromium
// del sistema + swiftshader, sirviendo ESTE worktree con `vite dev`.
// Uso: node scripts/diag/shot-condor.mjs <etiqueta>
//   → /tmp/condor-<etiqueta>-grid.png        (las variantes de cerca)
//   → /tmp/condor-<etiqueta>-cielo-N.png     (móvil 412×892, 3 frames del vuelo)
//   → /tmp/condor-<etiqueta>-cielo-ancho.png (1280×800, la térmica y el cruce)
import { chromium } from 'playwright';
import { execSync, spawn } from 'node:child_process';
import { setTimeout as sleep } from 'node:timers/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const PORT = 5199;
const BASE = `http://127.0.0.1:${PORT}`;
const [etiqueta = 'x'] = process.argv.slice(2);

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

const chromiumPath = process.env.PLAYWRIGHT_CHROMIUM_PATH
  || execSync('which chromium', { encoding: 'utf8' }).trim();
const browser = await chromium.launch({
  executablePath: chromiumPath,
  args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage',
    '--enable-unsafe-swiftshader', '--use-gl=angle', '--use-angle=swiftshader', '--ignore-gpu-blocklist'],
});

// 1) EL CÓNDOR DE CERCA: la grilla de variantes
const g = await browser.newPage({ viewport: { width: 920, height: 1300 }, deviceScaleFactor: 2 });
g.on('pageerror', (e) => console.log('PAGEERR-grid', String(e).slice(0, 160)));
await g.goto(`${BASE}/scripts/diag/condor.html?vista=grid`, { waitUntil: 'load', timeout: 40000 });
await sleep(3600);
await g.screenshot({ path: `/tmp/condor-${etiqueta}-grid.png` });
console.log('OK grid');

// 2) PLANEANDO: el mockup 3D — tres frames móviles (la órbita viaja) + ancho
const p = await browser.newPage({ viewport: { width: 412, height: 892 }, deviceScaleFactor: 2 });
p.on('pageerror', (e) => console.log('PAGEERR-cielo', String(e).slice(0, 160)));
await p.goto(`${BASE}/scripts/diag/condor.html?vista=cielo`, { waitUntil: 'load', timeout: 40000 });
await sleep(6000);
for (const n of [1, 2, 3]) {
  await p.screenshot({ path: `/tmp/condor-${etiqueta}-cielo-${n}.png` });
  console.log('OK cielo', n);
  await sleep(7000);
}
await p.setViewportSize({ width: 1280, height: 800 });
await sleep(5000);
await p.screenshot({ path: `/tmp/condor-${etiqueta}-cielo-ancho.png` });
console.log('OK cielo ancho');

await browser.close();
srv.kill('SIGKILL');
