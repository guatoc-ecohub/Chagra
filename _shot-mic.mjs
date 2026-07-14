import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import { setTimeout as sleep } from 'node:timers/promises';
const REPO = '/home/kortux/Workspace/chagra';
const PORT = 5180;
const BASE = `http://127.0.0.1:${PORT}`;
const SHOTS = [
  { name: 'micorrizas', route: '/#/mockups/micorrizas-3d', wait: 10000 },
  { name: 'valle', route: '/#/mockups/entrada-3d', wait: 8000 },
];
const srv = spawn('npm', ['run', 'dev', '--', '--port', String(PORT), '--host', '127.0.0.1'], { cwd: REPO, stdio: 'ignore', env: { ...process.env, BROWSER: 'none' } });
let up = false;
for (let i = 0; i < 120; i++) { try { const r = await fetch(BASE + '/'); if (r.ok) { up = true; break; } } catch {} await sleep(1000); }
if (!up) { console.log('SERVER_FAIL'); srv.kill('SIGKILL'); process.exit(1); }
await sleep(3000);
const browser = await chromium.launch({ executablePath: '/run/current-system/sw/bin/chromium', args: ['--no-sandbox','--disable-setuid-sandbox','--disable-dev-shm-usage','--enable-unsafe-swiftshader','--use-gl=angle','--use-angle=swiftshader','--ignore-gpu-blocklist'] });
const page = await browser.newPage({ viewport: { width: 412, height: 892 }, deviceScaleFactor: 2 });
page.on('console', (m) => { if (m.type() === 'error') console.log('CONSOLE_ERR:', m.text().slice(0,240)); });
page.on('pageerror', (e) => console.log('PAGE_ERR:', String(e).slice(0,240)));
const results = [];
for (const s of SHOTS) {
  try {
    await page.goto(BASE + s.route, { waitUntil: 'load', timeout: 60000 });
    await sleep(s.wait);
    const f = `/tmp/shot-${s.name}.png`;
    await page.screenshot({ path: f, timeout: 60000 });
    results.push({ name: s.name, f }); console.log('OK', s.name, '->', f);
  } catch (e) { results.push({ name: s.name, err: String(e).slice(0,160) }); console.log('FAIL', s.name, String(e).slice(0,160)); }
}
await browser.close(); srv.kill('SIGKILL');
console.log('DONE ' + JSON.stringify(results));
